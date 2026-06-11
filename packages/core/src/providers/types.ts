export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tools?: any[];
}

export interface LLMResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    id?: string;
  }>;
  raw?: any;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse>;
  stream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
}
