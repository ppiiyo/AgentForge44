import axios from 'axios';
import { logger } from '../../utils/logger.js';

export interface SearchResult {
  text: string;
  source: string;
  score: number;
}

export interface VectorStoreConfig {
  provider: 'pinecone' | 'weaviate' | 'qdrant' | 'local';
  apiKey?: string;
  environment?: string;
  indexName?: string;
  endpoint?: string;
}

export interface VectorStoreAdapter {
  connect(config: VectorStoreConfig): Promise<void>;
  upsert(id: string, vector: number[], text: string, source: string): Promise<void>;
  query(vector: number[], limit: number): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
}

export class PineconeAdapter implements VectorStoreAdapter {
  private config?: VectorStoreConfig;
  private clientHeaders: Record<string, string> = {};

  async connect(config: VectorStoreConfig): Promise<void> {
    this.config = config;
    this.clientHeaders = {
      'Api-Key': config.apiKey || '',
      'Content-Type': 'application/json'
    };
    logger.info(`[PineconeAdapter] Connected/Configured for index: ${config.indexName || 'default-index'}`);
  }

  private getEndpoint(): string {
    if (!this.config) throw new Error('Pinecone adapter not initialized');
    if (this.config.endpoint) return this.config.endpoint;
    return `https://${this.config.indexName || 'default-index'}.svc.${this.config.environment || 'us-west1-gcp'}.pinecone.io`;
  }

  async upsert(id: string, vector: number[], text: string, source: string): Promise<void> {
    if (!this.config) throw new Error('Pinecone adapter not initialized');
    const url = `${this.getEndpoint()}/vectors/upsert`;
    try {
      await axios.post(
        url,
        {
          vectors: [
            {
              id,
              values: vector,
              metadata: { text, source }
            }
          ]
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );
      logger.debug(`[PineconeAdapter] Successfully upserted chunk: ${id}`);
    } catch (err: any) {
      logger.error(`[PineconeAdapter] Upsert failed for chunk ${id}: ${err.message}`);
      throw err;
    }
  }

  async query(vector: number[], limit: number): Promise<SearchResult[]> {
    if (!this.config) throw new Error('Pinecone adapter not initialized');
    const url = `${this.getEndpoint()}/query`;
    try {
      const response = await axios.post(
        url,
        {
          vector,
          topK: limit,
          includeMetadata: true
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );

      const matches = response.data?.matches || [];
      return matches.map((match: any) => ({
        text: match.metadata?.text || '',
        source: match.metadata?.source || '',
        score: match.score || 0
      }));
    } catch (err: any) {
      logger.error(`[PineconeAdapter] Query failed: ${err.message}`);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.config) throw new Error('Pinecone adapter not initialized');
    const url = `${this.getEndpoint()}/vectors/delete`;
    try {
      await axios.post(
        url,
        { ids: [id] },
        { headers: this.clientHeaders, timeout: 5000 }
      );
      logger.debug(`[PineconeAdapter] Successfully deleted chunk: ${id}`);
    } catch (err: any) {
      logger.error(`[PineconeAdapter] Delete failed for chunk ${id}: ${err.message}`);
      throw err;
    }
  }
}

export class WeaviateAdapter implements VectorStoreAdapter {
  private config?: VectorStoreConfig;
  private clientHeaders: Record<string, string> = {};

  async connect(config: VectorStoreConfig): Promise<void> {
    this.config = config;
    this.clientHeaders = {
      'Content-Type': 'application/json'
    };
    if (config.apiKey) {
      this.clientHeaders['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const endpoint = config.endpoint || 'http://localhost:8080';
    logger.info(`[WeaviateAdapter] Connected to endpoint: ${endpoint}`);

    try {
      const schemaUrl = `${endpoint}/v1/schema/DocumentChunk`;
      try {
        await axios.get(schemaUrl, { headers: this.clientHeaders, timeout: 2000 });
        logger.info('[WeaviateAdapter] Schema class DocumentChunk already exists.');
      } catch (err: any) {
        if (err.response?.status === 404) {
          logger.info('[WeaviateAdapter] Creating schema class DocumentChunk...');
          await axios.post(
            `${endpoint}/v1/schema`,
            {
              class: 'DocumentChunk',
              description: 'RAG Document Chunk',
              vectorizer: 'none',
              properties: [
                {
                  name: 'text',
                  dataType: ['text'],
                  description: 'Content of the chunk'
                },
                {
                  name: 'source',
                  dataType: ['text'],
                  description: 'Source document title'
                },
                {
                  name: 'chunkId',
                  dataType: ['text'],
                  description: 'Internal identifier'
                }
              ]
            },
            { headers: this.clientHeaders, timeout: 3000 }
          );
          logger.info('[WeaviateAdapter] Schema class DocumentChunk created successfully.');
        } else {
          logger.warn(`[WeaviateAdapter] Failed to verify/create class schema: ${err.message}`);
        }
      }
    } catch (outerErr: any) {
      logger.warn(`[WeaviateAdapter] Error during connect schema initialization: ${outerErr.message}`);
    }
  }

  private toUUID(str: string): string {
    const hex = str.replace(/[^a-f0-9]/g, '');
    const padded = (hex + '0'.repeat(32)).substring(0, 32);
    return `${padded.substring(0, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}-${padded.substring(16, 20)}-${padded.substring(20, 32)}`;
  }

  async upsert(id: string, vector: number[], text: string, source: string): Promise<void> {
    if (!this.config) throw new Error('Weaviate adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:8080';
    const uuid = this.toUUID(id);
    const url = `${endpoint}/v1/objects/DocumentChunk/${uuid}`;

    try {
      await axios.put(
        url,
        {
          class: 'DocumentChunk',
          id: uuid,
          vector: vector,
          properties: {
            text,
            source,
            chunkId: id
          }
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );
      logger.debug(`[WeaviateAdapter] Successfully upserted chunk: ${id} as UUID ${uuid}`);
    } catch (err: any) {
      try {
        await axios.post(
          `${endpoint}/v1/objects`,
          {
            class: 'DocumentChunk',
            id: uuid,
            vector: vector,
            properties: {
              text,
              source,
              chunkId: id
            }
          },
          { headers: this.clientHeaders, timeout: 5000 }
        );
        logger.debug(`[WeaviateAdapter] Successfully created chunk via POST: ${id}`);
      } catch (postErr: any) {
        logger.error(`[WeaviateAdapter] Upsert failed for chunk ${id}: ${postErr.message}`);
        throw postErr;
      }
    }
  }

  async query(vector: number[], limit: number): Promise<SearchResult[]> {
    if (!this.config) throw new Error('Weaviate adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:8080';
    const url = `${endpoint}/v1/graphql`;

    try {
      const gqlQuery = `
        {
          Get {
            DocumentChunk(
              nearVector: { vector: ${JSON.stringify(vector)} }
              limit: ${limit}
            ) {
              text
              source
              _additional {
                certainty
                distance
              }
            }
          }
        }
      `;

      const response = await axios.post(
        url,
        { query: gqlQuery },
        { headers: this.clientHeaders, timeout: 5000 }
      );

      const items = response.data?.data?.Get?.DocumentChunk || [];
      return items.map((item: any) => ({
        text: item.text || '',
        source: item.source || '',
        score: item._additional?.certainty ?? (1 - (item._additional?.distance ?? 0))
      }));
    } catch (err: any) {
      logger.error(`[WeaviateAdapter] Query failed: ${err.message}`);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.config) throw new Error('Weaviate adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:8080';
    const uuid = this.toUUID(id);
    const url = `${endpoint}/v1/objects/DocumentChunk/${uuid}`;

    try {
      await axios.delete(url, { headers: this.clientHeaders, timeout: 5000 });
      logger.debug(`[WeaviateAdapter] Successfully deleted chunk: ${id} (UUID: ${uuid})`);
    } catch (err: any) {
      logger.error(`[WeaviateAdapter] Delete failed for chunk ${id}: ${err.message}`);
      throw err;
    }
  }
}

export class QdrantAdapter implements VectorStoreAdapter {
  private config?: VectorStoreConfig;
  private clientHeaders: Record<string, string> = {};

  async connect(config: VectorStoreConfig): Promise<void> {
    this.config = config;
    this.clientHeaders = {
      'Content-Type': 'application/json'
    };
    if (config.apiKey) {
      this.clientHeaders['api-key'] = config.apiKey;
    }

    const endpoint = config.endpoint || 'http://localhost:6333';
    const collectionName = config.indexName || 'document_chunks';
    logger.info(`[QdrantAdapter] Connected to endpoint: ${endpoint}, collection: ${collectionName}`);

    try {
      const checkUrl = `${endpoint}/collections/${collectionName}`;
      try {
        await axios.get(checkUrl, { headers: this.clientHeaders, timeout: 2000 });
        logger.info(`[QdrantAdapter] Collection "${collectionName}" already exists.`);
      } catch (err: any) {
        if (err.response?.status === 404) {
          logger.info(`[QdrantAdapter] Creating Qdrant collection "${collectionName}"...`);
          await axios.put(
            checkUrl,
            {
              vectors: {
                size: 384,
                distance: 'Cosine'
              }
            },
            { headers: this.clientHeaders, timeout: 3000 }
          );
          logger.info(`[QdrantAdapter] Collection "${collectionName}" created successfully.`);
        } else {
          logger.warn(`[QdrantAdapter] Failed to verify/create collection: ${err.message}`);
        }
      }
    } catch (outerErr: any) {
      logger.warn(`[QdrantAdapter] Error during collection initialization check: ${outerErr.message}`);
    }
  }

  private toUUID(str: string): string {
    const hex = str.replace(/[^a-f0-9]/g, '');
    const padded = (hex + '0'.repeat(32)).substring(0, 32);
    return `${padded.substring(0, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}-${padded.substring(16, 20)}-${padded.substring(20, 32)}`;
  }

  async upsert(id: string, vector: number[], text: string, source: string): Promise<void> {
    if (!this.config) throw new Error('Qdrant adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:6333';
    const collectionName = this.config.indexName || 'document_chunks';
    const uuid = this.toUUID(id);
    const url = `${endpoint}/collections/${collectionName}/points`;

    try {
      await axios.put(
        url,
        {
          points: [
            {
              id: uuid,
              vector: vector,
              payload: {
                text,
                source,
                chunkId: id
              }
            }
          ]
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );
      logger.debug(`[QdrantAdapter] Successfully upserted chunk: ${id} as UUID ${uuid}`);
    } catch (err: any) {
      logger.error(`[QdrantAdapter] Upsert failed for chunk ${id}: ${err.message}`);
      throw err;
    }
  }

  async query(vector: number[], limit: number): Promise<SearchResult[]> {
    if (!this.config) throw new Error('Qdrant adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:6333';
    const collectionName = this.config.indexName || 'document_chunks';
    const url = `${endpoint}/collections/${collectionName}/points/search`;

    try {
      const response = await axios.post(
        url,
        {
          vector,
          limit,
          with_payload: true,
          with_vector: false
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );

      const results = response.data?.result || [];
      return results.map((res: any) => ({
        text: res.payload?.text || '',
        source: res.payload?.source || '',
        score: res.score || 0
      }));
    } catch (err: any) {
      logger.error(`[QdrantAdapter] Query failed: ${err.message}`);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    if (!this.config) throw new Error('Qdrant adapter not initialized');
    const endpoint = this.config.endpoint || 'http://localhost:6333';
    const collectionName = this.config.indexName || 'document_chunks';
    const uuid = this.toUUID(id);
    const url = `${endpoint}/collections/${collectionName}/points/delete`;

    try {
      await axios.post(
        url,
        {
          points: [uuid]
        },
        { headers: this.clientHeaders, timeout: 5000 }
      );
      logger.debug(`[QdrantAdapter] Successfully deleted chunk: ${id} (UUID: ${uuid})`);
    } catch (err: any) {
      logger.error(`[QdrantAdapter] Delete failed for chunk ${id}: ${err.message}`);
      throw err;
    }
  }
}
