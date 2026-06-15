import { pipeline, env } from '@xenova/transformers';
import { LocalIndex } from 'vectra';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

// Setup Xenova transformers cache paths
env.cacheDir = path.join(process.cwd(), '.models');

export interface RAGDocument {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: number;
}

export interface RAGSearchResult {
  document: RAGDocument;
  score: number;
}

export class RAGService {
  private embedder: any = null;
  private index: LocalIndex | null = null;
  private storePath: string;
  private initPromise: Promise<void> | null = null;

  constructor(storePath: string = path.join(process.cwd(), '.rag-store')) {
    this.storePath = storePath;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.index && this.embedder) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (!fs.existsSync(this.storePath)) {
          fs.mkdirSync(this.storePath, { recursive: true });
        }

        // Initialize LocalIndex
        this.index = new LocalIndex(this.storePath);
        if (!await this.index.isIndexCreated()) {
          await this.index.createIndex();
        }

        logger.info('[RAG] Loading embedding model Xenova/all-MiniLM-L6-v2...');
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2'
        );
        logger.info('[RAG] Embedding model and Vectra index loaded successfully');
      } catch (err) {
        logger.error('[RAG] Failed to load embedding model or index', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  async embed(text: string): Promise<number[]> {
    await this.ensureInitialized();
    if (!this.embedder) throw new Error('Embedder is not initialized');

    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) chunks.push(chunk);
      if (i + chunkSize >= words.length) break;
    }

    return chunks;
  }

  async addDocument(text: string, metadata: Record<string, any> = {}): Promise<string[]> {
    await this.ensureInitialized();
    if (!this.index) throw new Error('Index is not initialized');

    const chunks = this.chunkText(text);
    const ids: string[] = [];

    await this.index.beginUpdate();
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embedding = await this.embed(chunkText);
        const id = `doc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;

        const docMetadata = {
          ...metadata,
          text: chunkText,
          chunkIndex: i,
          totalChunks: chunks.length,
          createdAt: Date.now()
        };

        await this.index.insertItem({
          id,
          metadata: docMetadata,
          vector: embedding
        });

        ids.push(id);
      }
      await this.index.endUpdate();
    } catch (err) {
      this.index.cancelUpdate();
      throw err;
    }

    logger.info(`[RAG] Added ${chunks.length} chunks for document`, { metadata });
    return ids;
  }

  async search(query: string, topK: number = 5): Promise<RAGSearchResult[]> {
    await this.ensureInitialized();
    if (!this.index) throw new Error('Index is not initialized');

    const queryEmbedding = await this.embed(query);
    const results = await this.index.queryItems(queryEmbedding, query, topK);

    return results.map((r: any) => ({
      document: {
        id: r.item.id,
        text: r.item.metadata.text || '',
        metadata: r.item.metadata,
        embedding: r.item.vector,
        createdAt: r.item.metadata.createdAt || Date.now(),
      },
      score: r.score,
    }));
  }

  async deleteDocument(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.index) throw new Error('Index is not initialized');
    await this.index.deleteItem(id);
  }

  async getStats(): Promise<{ totalDocuments: number; totalChunks: number }> {
    await this.ensureInitialized();
    if (!this.index) throw new Error('Index is not initialized');

    const items = await this.index.listItems();
    // Unique document ids from metadata if present, otherwise fall back to item ids
    const docIds = items.map((i: any) => i.metadata?.docId || i.metadata?.source || i.id);
    return {
      totalDocuments: new Set(docIds).size,
      totalChunks: items.length,
    };
  }
}

export const ragService = new RAGService();
