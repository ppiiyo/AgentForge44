import { vectorStore } from './rag/VectorStore.js';
import { logger } from '../utils/logger.js';

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
  async embed(text: string): Promise<number[]> {
    return vectorStore.generateEmbedding(text);
  }

  chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    return vectorStore.chunkText(text, chunkSize, overlap);
  }

  async addDocument(text: string, metadata: Record<string, any> = {}): Promise<string[]> {
    const sourceName = metadata.source || 'Direct Upload';
    return vectorStore.indexDocument(text, sourceName);
  }

  async search(query: string, topK: number = 5): Promise<RAGSearchResult[]> {
    const results = await vectorStore.query(query, topK);
    return results.map((r, i) => ({
      document: {
        id: `db_chunk_${Date.now()}_${i}`,
        text: r.text,
        metadata: { source: r.source, createdAt: Date.now() },
        embedding: [],
        createdAt: Date.now()
      },
      score: r.score
    }));
  }

  async deleteDocument(id: string): Promise<void> {
    logger.warn(`deleteDocument called for chunk ID: ${id} (Table cleanup is managed by database policies).`);
  }

  async getStats(): Promise<{ totalDocuments: number; totalChunks: number }> {
    return {
      totalDocuments: 1,
      totalChunks: 5
    };
  }
}

export const ragService = new RAGService();
