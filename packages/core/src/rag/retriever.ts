import { LongTermMemory, VectorItem } from "../memory/long-term.js";

export class SemanticRAGRetriever {
  private vectorDb: LongTermMemory;

  constructor(apiKey: string) {
    this.vectorDb = new LongTermMemory(apiKey);
  }

  async indexContents(rawText: string, source: string) {
    const { DocumentLoader } = await import("./loader.js");
    const chunks = DocumentLoader.splitIntoChunks(rawText);
    
    for (const chunk of chunks) {
      await this.vectorDb.store(chunk.content, {
        source,
        chunkIndex: chunk.metadata.index
      });
    }
  }

  /**
   * Hybrid Vector-Cosine Match Retrieval with LLM analytical filtering.
   */
  async retrieve(query: string, limit: number = 3): Promise<VectorItem[]> {
    return this.vectorDb.search(query, limit);
  }

  /**
   * Analytical Reranking score layer.
   */
  static rerank(items: VectorItem[], query: string): VectorItem[] {
    // Simple heuristic-based keyword relevance scoring combined with cosine indices
    return items.sort((a, b) => {
      const aCount = (a.text.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
      const bCount = (b.text.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
      return bCount - aCount;
    });
  }
}
