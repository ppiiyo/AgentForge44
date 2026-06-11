import { LLMProvider } from "../providers/types.js";

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
}

export class SlidingWindowMemory {
  private messages: Message[] = [];
  private limit: number;

  constructor(limit: number = 10) {
    this.limit = limit;
  }

  addMessage(role: 'user' | 'model' | 'system', content: string) {
    this.messages.push({ role, content });
    if (this.messages.length > this.limit) {
      this.messages.shift();
    }
  }

  getMessages(): Message[] {
    return this.messages;
  }

  /**
   * Compacts older conversation traces to prevent prompt limits overflows
   */
  async summarizeConversation(provider: LLMProvider): Promise<string> {
    const textHistory = this.messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const prompt = `Compress the following conversation thread into a brief bullet layout. Keep all entities and key conclusions intact:\n\n${textHistory}`;
    const response = await provider.generate(prompt, {
      temperature: 0.1,
      systemInstruction: "You are a senior workflow summarizer."
    });

    return response.text || "";
  }
}
