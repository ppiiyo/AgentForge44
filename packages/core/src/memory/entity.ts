import { LLMProvider } from "../providers/types.js";

export interface EntityRecord {
  name: string;
  type: string;
  description: string;
}

export class EntityMemoryExtractor {
  private store: Map<string, EntityRecord> = new Map();

  async extractEntities(text: string, provider: LLMProvider): Promise<EntityRecord[]> {
    const prompt = `Inspect the raw text below and extract a list of major named entities (Companies, libraries, APIs, products, users).
Return ONLY a valid JSON array matching the structure:
[
  { "name": "...", "type": "...", "description": "..." }
]

Content:
"${text}"`;

    try {
      const response = await provider.generate(prompt, {
        temperature: 0.1,
        systemInstruction: "You are an automated schema validator. Output valid JSON arrays only."
      });
      const clean = (response.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as EntityRecord[];
      
      parsed.forEach(rec => {
        if (rec.name) {
          this.store.set(rec.name.toLowerCase(), rec);
        }
      });
      return parsed;
    } catch {
      return [];
    }
  }

  getEntities(): EntityRecord[] {
    return Array.from(this.store.values());
  }
}
