export const LLM_PRICING: Record<string, Record<string, number>> = {
  openai: {
    'gpt-4o': parseFloat(process.env.OPENAI_GPT4O_PRICE || '0.005'),
    'gpt-4o-mini': parseFloat(process.env.OPENAI_GPT4O_MINI_PRICE || '0.00015'),
    'gpt-4': parseFloat(process.env.OPENAI_GPT4_PRICE || '0.03'),
    'gpt-3.5-turbo': parseFloat(process.env.OPENAI_GPT35_PRICE || '0.0005'),
  },
  anthropic: {
    'claude-3-5-sonnet': parseFloat(process.env.ANTHROPIC_SONNET_35_PRICE || '0.003'),
    'claude-3-opus': parseFloat(process.env.ANTHROPIC_OPUS_PRICE || '0.015'),
    'claude-3-sonnet': parseFloat(process.env.ANTHROPIC_SONNET_PRICE || '0.003'),
    'claude-3-haiku': parseFloat(process.env.ANTHROPIC_HAIKU_PRICE || '0.00025'),
  },
  gemini: {
    'gemini-1.5-pro': parseFloat(process.env.GEMINI_PRO_15_PRICE || '0.00125'),
    'gemini-1.5-flash': parseFloat(process.env.GEMINI_FLASH_15_PRICE || '0.000075'),
    'gemini-pro': parseFloat(process.env.GEMINI_PRO_PRICE || '0.0005'),
    'gemini-flash': parseFloat(process.env.GEMINI_FLASH_PRICE || '0.0001'),
  },
};
