import { pg, sqlite } from '../../db/index.js';
import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { VectorStoreAdapter, PineconeAdapter, WeaviateAdapter, QdrantAdapter, VectorStoreConfig } from './VectorStoreAdapters.js';

// Setup Xenova transformers cache paths
env.cacheDir = path.join(process.cwd(), '.models');

export interface ChunkRecord {
  id: string;
  source: string;
  text: string;
  embedding: number[];
  createdAt: number;
}

export class VectorStore {
  private static embedder: any = null;
  private static initPromise: Promise<void> | null = null;
  private isPgActive: boolean = false;
  private adapter: VectorStoreAdapter | null = null;

  constructor() {
    this.isPgActive = process.env.DB_TYPE === 'postgres';
  }

  /**
   * Safe initializer for the embedding pipeline model
   */
  public async ensureInitialized(): Promise<void> {
    if (VectorStore.embedder) return;
    if (VectorStore.initPromise) return VectorStore.initPromise;

    VectorStore.initPromise = (async () => {
      try {
        logger.info('[PGVectorStore] Loading embedding model Xenova/all-MiniLM-L6-v2...');
        VectorStore.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );
        logger.info('[PGVectorStore] Model loaded successfully.');

        // Initialize active adapter if VECTOR_STORE_PROVIDER is configured
        const provider = (process.env.VECTOR_STORE_PROVIDER || 'local').toLowerCase();
        if (provider !== 'local') {
          const config: VectorStoreConfig = {
            provider: provider as any,
            apiKey: process.env.VECTOR_STORE_API_KEY,
            environment: process.env.VECTOR_STORE_ENV,
            indexName: process.env.VECTOR_STORE_INDEX,
            endpoint: process.env.VECTOR_STORE_ENDPOINT
          };

          if (provider === 'pinecone') {
            this.adapter = new PineconeAdapter();
          } else if (provider === 'weaviate') {
            this.adapter = new WeaviateAdapter();
          } else if (provider === 'qdrant') {
            this.adapter = new QdrantAdapter();
          }

          if (this.adapter) {
            await this.adapter.connect(config);
          }
        }

        // Initialize PGVector/SQLite database table schema
        await this.setupDatabaseTable();
        // Seed default documents for real retrieval fallback
        await this.seedDefaultDocuments();
      } catch (err: any) {
        logger.error('[PGVectorStore] Failed loading embedding engine', err);
        throw err;
      }
    })();

    return VectorStore.initPromise;
  }

  /**
   * Dynamically bootstraps the document chunks table on launch
   */
  private async setupDatabaseTable() {
    try {
      if (this.isPgActive && pg) {
        // Create pgvector extension first if permission exists
        try {
          await pg`CREATE EXTENSION IF NOT EXISTS vector`;
        } catch (e: any) {
          logger.warn('[PGVectorStore] COULD NOT create extension vector. Proceeding if already enabled...', e.message);
        }

        // Create pg table with vector columns
        await pg`
          CREATE TABLE IF NOT EXISTS rag_document_chunks (
            id VARCHAR(100) PRIMARY KEY,
            source TEXT NOT NULL,
            text TEXT NOT NULL,
            embedding vector(384) NOT NULL,
            created_at BIGINT NOT NULL
          )
        `;
        logger.info('[PGVectorStore] PostgreSQL active document chunks table initialized.');
      } else if (sqlite) {
        // SQLite tables init
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS rag_document_chunks (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            text TEXT NOT NULL,
            embedding TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )
        `);
        logger.info('[PGVectorStore] SQLite document chunks table initialized.');
      }
    } catch (err: any) {
      logger.error('[PGVectorStore] Failed initializing schema table structures', err);
    }
  }

  /**
   * Generates a 384-dimensional dense vector representing the text semantic fingerprint
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    await this.ensureInitialized();
    if (!VectorStore.embedder) {
      throw new Error('Embedder model pipeline is not functional.');
    }
    const output = await VectorStore.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Page text chunker
   */
  public chunkText(text: string, chunkSize = 400, overlap = 40): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) chunks.push(chunk);
      if (i + chunkSize >= words.length) break;
    }
    return chunks;
  }

  /**
   * Indexes a full raw text document by chunking, generating embeddings, and storing them in the active DB
   */
  public async indexDocument(text: string, sourceName: string): Promise<string[]> {
    await this.ensureInitialized();
    const chunks = this.chunkText(text);
    const insertedIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = await this.generateEmbedding(chunkText);
      const chunkId = `chk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = Date.now();

      if (this.isPgActive && pg) {
        const embeddingString = `[${embedding.join(',')}]`;
        await pg`
          INSERT INTO rag_document_chunks (id, source, text, embedding, created_at)
          VALUES (${chunkId}, ${sourceName}, ${chunkText}, ${embeddingString}, ${createdAt})
          ON CONFLICT (id) DO UPDATE SET 
            source = EXCLUDED.source, 
            text = EXCLUDED.text, 
            embedding = EXCLUDED.embedding
        `;
      } else if (sqlite) {
        const stmt = sqlite.prepare(`
          INSERT INTO rag_document_chunks (id, source, text, embedding, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(chunkId, sourceName, chunkText, JSON.stringify(embedding), createdAt);
      }

      if (this.adapter) {
        try {
          await this.adapter.upsert(chunkId, embedding, chunkText, sourceName);
        } catch (err: any) {
          logger.warn(`[VectorStore] Adapter upsert failed: ${err.message}. Saving locally.`);
        }
      }

      insertedIds.push(chunkId);
    }

    logger.info(`[PGVectorStore] Indexed document "${sourceName}" into ${chunks.length} chunks.`);
    return insertedIds;
  }

  /**
   * Queries the database for semantic matching chunks using Cosine Similarity
   */
  public async query(queryText: string, limit = 5): Promise<Array<{ text: string; source: string; score: number }>> {
    await this.ensureInitialized();
    const queryEmbedding = await this.generateEmbedding(queryText);

    if (this.adapter) {
      try {
        const adapterResults = await this.adapter.query(queryEmbedding, limit);
        if (adapterResults && adapterResults.length > 0) {
          return adapterResults;
        }
      } catch (err: any) {
        logger.warn(`[VectorStore] Adapter query failed: ${err.message}. Falling back to local store.`);
      }
    }

    if (this.isPgActive && pg) {
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      // Cosine distance calculation in pgvector is <=> operator. 
      // Distance is (1 - CosineSimilarity), so CosineSimilarity = 1 - (embedding <=> queryEmbedding)
      interface DbResult {
        text: string;
        source: string;
        distance: number;
      }
      const results = await pg`
        SELECT text, source, (embedding <=> ${embeddingString}::vector) as distance
        FROM rag_document_chunks
        ORDER BY embedding <=> ${embeddingString}::vector ASC
        LIMIT ${limit}
      ` as unknown as DbResult[];

      return results.map(row => ({
        text: row.text,
        source: row.source,
        score: row.distance !== null && row.distance !== undefined ? (1 - Number(row.distance)) : 0.5
      }));
    } else if (sqlite) {
      // Fetch all to execute JS memory similarity computation since SQLite lacks native vector extension
      interface SqliteRow {
        id: string;
        text: string;
        source: string;
        embedding: string;
      }
      const stmt = sqlite.prepare('SELECT id, text, source, embedding FROM rag_document_chunks');
      const rows = stmt.all() as SqliteRow[];

      const matches = rows.map(row => {
        const vector = JSON.parse(row.embedding) as number[];
        const score = this.cosineSimilarity(queryEmbedding, vector);
        return {
          text: row.text,
          source: row.source,
          score
        };
      });

      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    return [];
  }

  /**
   * Cosine Similarity Helper Algorithm
   */
  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Seeds default knowledge base documents to ensure real semantic retrieval works immediately
   */
  public async seedDefaultDocuments(): Promise<void> {
    try {
      let count = 0;
      if (this.isPgActive && pg) {
        const result = await pg`SELECT COUNT(*)::int as count FROM rag_document_chunks`;
        count = result[0]?.count || 0;
      } else if (sqlite) {
        const row = sqlite.prepare('SELECT COUNT(*) as count FROM rag_document_chunks').get() as { count: number };
        count = row?.count || 0;
      }

      if (count === 0) {
        logger.info('[PGVectorStore] Seeding default knowledge base documents into VectorStore...');
        await this.indexDocument(
          "Our advanced pipeline handles secure REST APIs by validating URLs starting with localhost to block SSRF and keeping secret API keys hidden and executed strictly in worker sandbox threads. Development instances run exclusively on port 3000 behind reverse proxy endpoints.",
          "Corporate Standard Operating Guidelines"
        );
        await this.indexDocument(
          "Multi-agent architecture enables parallel node execution with proper isolation, RBAC tenant separation, and checkpoint/resume state machine transitions using standard relational backends.",
          "AgentForge Architecture Manual"
        );
        logger.info('[PGVectorStore] Default seeding complete.');
      }
    } catch (err: any) {
      logger.warn(`[PGVectorStore] Default document seeding skipped or failed: ${err.message}`);
    }
  }
}

export const vectorStore = new VectorStore();
