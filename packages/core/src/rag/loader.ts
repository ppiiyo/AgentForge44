export interface DocumentChunk {
  content: string;
  metadata: {
    source?: string;
    index: number;
  };
}

export class DocumentLoader {
  
  /**
   * Loads raw content from Markdown, HTML, or raw text and chunks it recursively.
   */
  static splitIntoChunks(rawText: string, chunkSize: number = 500, chunkOverlap: number = 50): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let position = 0;
    let index = 0;

    while (position < rawText.length) {
      const end = Math.min(position + chunkSize, rawText.length);
      let content = rawText.substring(position, end);

      // Simple word boundary alignment prevention
      if (end < rawText.length) {
        const lastSpace = content.lastIndexOf(" ");
        if (lastSpace > chunkSize * 0.7) {
          content = content.substring(0, lastSpace);
        }
      }

      chunks.push({
        content: content.trim(),
        metadata: {
          index
        }
      });

      position += content.length - chunkOverlap;
      index++;

      if (content.length <= chunkOverlap) {
        break;
      }
    }

    return chunks;
  }
}
