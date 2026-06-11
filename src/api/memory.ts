import { GoogleGenAI } from "@google/genai";

export interface DBMessage {
  id: string;
  workflowId: string;
  role: 'user' | 'model' | 'system' | 'tool';
  content: string;
  timestamp: string;
}

export interface DBVectorMemory {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

/**
 * Sliding Window Memory Utility holding conversational steps
 */
export class SlidingWindowMemory {
  private windowSize: number;
  private messageQueue: DBMessage[] = [];

  constructor(windowSize: number = 8) {
    this.windowSize = windowSize;
  }

  addMessage(msg: Omit<DBMessage, 'id' | 'timestamp'>): DBMessage {
    const fullMessage: DBMessage = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    this.messageQueue.push(fullMessage);
    
    // Slid window size constraints
    if (this.messageQueue.length > this.windowSize) {
      this.messageQueue.shift();
    }
    return fullMessage;
  }

  getMessages(): DBMessage[] {
    return this.messageQueue;
  }

  clear() {
    this.messageQueue = [];
  }
}

/**
 * Long-Term Vector Memory & Database Storage engine supporting semantic queries
 */
export class LongTermMemoryManager {
  private vectorStore: DBVectorMemory[] = [];
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  /**
   * Generates embeddings vector utilizing standard modern text-embedding targets
   */
  async computeEmbedding(text: string): Promise<number[]> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
      }
      const response = await this.ai.models.embedContent({
        model: "text-embedding-004",
        contents: text
      }) as any;
      return response.embedding?.values || new Array(768).fill(0);
    } catch (err: any) {
      console.warn("Embedding compute failed, falling back to mock coordinate vector:", err.message);
      // Fallback deterministic high-density vector for isolated tests
      const dummyVec = new Array(768).fill(0).map((_, idx) => Math.sin(idx + text.length));
      return dummyVec;
    }
  }

  async storeMemory(text: string, metadata: Record<string, any> = {}): Promise<void> {
    const embedding = await this.computeEmbedding(text);
    this.vectorStore.push({
      id: Math.random().toString(36).substr(2, 9),
      text,
      embedding,
      metadata
    });
  }

  /**
   * Simple Vector Cosine Similarity Search
   */
  async searchMemory(query: string, limit: number = 2): Promise<DBVectorMemory[]> {
    const queryEmbedding = await this.computeEmbedding(query);
    
    const scored = this.vectorStore.map(mem => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        dotProduct += queryEmbedding[i] * mem.embedding[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += mem.embedding[i] * mem.embedding[i];
      }
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
      return { mem, similarity };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(entry => entry.mem);
  }
}

/**
 * Drizzle ORM Schema representations of workflow and log structures
 * Shown here programmatically for continuous database sync & mapping
 */
export const drizzleSchemaDefinitionText = `
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  connectionsJson: text('connections_json').notNull(),
  nodesJson: text('nodes_json').notNull(),
  updatedAt: integer('updated_at').notNull()
});

export const shortTermMemory = sqliteTable('short_term_memory', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').references(() => workflows.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull()
});

export const longTermEmbeddings = sqliteTable('long_term_embeddings', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  embeddingVector: text('embedding_vector').notNull(), // Comma-separated stringified coordinate array
  metadataJson: text('metadata_json')
});
`;
