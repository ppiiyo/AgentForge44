import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider, OpenAIProvider, AnthropicProvider, OllamaProvider } from '../../api/providers.js';
import { cache } from '../../services/cache.js';

// Mock the GoogleGenAI SDK module
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: "Mocked Gemini Output Text",
        candidates: [
          {
            content: {
              parts: [{ text: "Mocked Gemini Output Text" }]
            }
          }
        ]
      })
    };
  }
  return { GoogleGenAI };
});

describe('LLM Providers Unit Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    cache.clearLocalCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should generate content via GeminiProvider with correct configuration', async () => {
    const provider = new GeminiProvider("mock-gemini-key", "gemini-3.5-flash");
    const result = await provider.generate("Self-correct code.", {
      temperature: 0.2,
      systemInstruction: "You are a code judge"
    });

    expect(provider.getName()).toContain("Gemini");
    expect(result.text).toBe("Mocked Gemini Output Text");
  });

  it('should generate content via OpenAIProvider (Sandbox simulation)', async () => {
    // Sandbox is triggered with empty key or sandbox key
    const provider = new OpenAIProvider("sandbox_free_test_openai", "gpt-4o-mini");
    const result = await provider.generate("Give me a greeting.", {
      temperature: 0.7
    });

    expect(provider.getName()).toContain("OpenAI");
    expect(result.text).toContain("[Simulated OpenAI Output - Sandbox Active]");
  });

  it('should generate content via OpenAIProvider (Live API Fetch success)', async () => {
    const mockResponseInJSON = {
      choices: [
        {
          message: {
            content: "Hello from Open AI!"
          }
        }
      ]
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponseInJSON
    });

    const provider = new OpenAIProvider("real_key_abc", "gpt-4o-mini");
    const result = await provider.generate("Give me a greeting.", {
      temperature: 0.5,
      systemInstruction: "Polite system"
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer real_key_abc"
      },
      body: expect.stringContaining('"model":"gpt-4o-mini"')
    }));
    expect(result.text).toBe("Hello from Open AI!");
  });

  it('should handle OpenAI Provider API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad request payload"
    });

    const provider = new OpenAIProvider("real_key_abc", "gpt-4o-mini");
    await expect(provider.generate("hello")).rejects.toThrow('OpenAI API returned error: 400 - Bad request payload');
  });

  it('should generate content via AnthropicProvider (Sandbox simulation)', async () => {
    const provider = new AnthropicProvider("sandbox_free_test_anthropic", "claude-3-5-sonnet-latest");
    const result = await provider.generate("Evaluate equation.", {
      temperature: 0.1
    });

    expect(provider.getName()).toContain("Anthropic");
    expect(result.text).toContain("[Simulated Anthropic Output - Sandbox Active]");
  });

  it('should generate content via AnthropicProvider (Live API Fetch success)', async () => {
    const mockAnsResponse = {
      content: [
        {
          type: "text",
          text: "Claude has answered."
        }
      ]
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockAnsResponse
    });

    const provider = new AnthropicProvider("real_anthropic_key_xyz", "claude-3-5-sonnet-latest");
    const result = await provider.generate("Draft email.");

    expect(global.fetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "real_anthropic_key_xyz",
        "anthropic-version": "2023-06-01"
      }
    }));
    expect(result.text).toBe("Claude has answered.");
  });

  it('should generate content via OllamaProvider successfully', async () => {
    const mockOllamaResponse = {
      response: "Llama is active locally."
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockOllamaResponse
    });

    const provider = new OllamaProvider("http://localhost:11434", "llama3");
    const result = await provider.generate("Tell me a story.");

    expect(provider.getName()).toContain("Ollama");
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: expect.stringContaining('"model":"llama3"')
    }));
    expect(result.text).toBe("Llama is active locally.");
  });
});
