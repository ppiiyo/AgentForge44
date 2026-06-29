export interface ModelConfig {
  default: string;
  allowed: string[];
  maxTokens: number;
}

export const PROVIDER_MODELS: Record<string, ModelConfig> = {
  gemini: {
    default: "gemini-3.5-flash",
    allowed: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    maxTokens: 8192,
  },
  openai: {
    default: "gpt-4o-mini",
    allowed: ["gpt-4o-mini", "gpt-4o", "o1-mini"],
    maxTokens: 4096,
  },
  anthropic: {
    default: "claude-3-5-sonnet-latest",
    allowed: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229"],
    maxTokens: 4096,
  },
  ollama: {
    default: "llama3",
    allowed: ["llama3", "mistral", "gemma2"],
    maxTokens: 2048,
  }
};

export const DEFAULT_MODELS = {
  gemini: PROVIDER_MODELS.gemini.default,
  openai: PROVIDER_MODELS.openai.default,
  anthropic: PROVIDER_MODELS.anthropic.default,
  ollama: PROVIDER_MODELS.ollama.default,
};
