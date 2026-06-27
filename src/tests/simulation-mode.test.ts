import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from '../api/providers.js';

// Mock the GoogleGenAI SDK module to control generateContent returns
const generateContentMock = vi.fn();
vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = {
      generateContent: generateContentMock
    };
  }
  return { GoogleGenAI };
});

describe('Task 2.5 Honest Modes Simulation Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    generateContentMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should propagate a real 429 quota error in production without DEMO_MODE', async () => {
    process.env.GEMINI_API_KEY = "real-production-gemini-key";
    process.env.DEMO_MODE = "false";
    process.env.STRICT_LLM_ERRORS = "false";

    // Set up mock to throw a 429 error
    generateContentMock.mockRejectedValue(new Error("API Quota limits reached (429)"));

    const provider = new GeminiProvider("real-production-gemini-key", "gemini-3.5-flash");

    // Expect it to bubble the error up rather than return a fake simulated string
    await expect(provider.generate("test prompt")).rejects.toThrow(/429/);
  });

  it('should return simulated: true and simulated text when in DEMO_MODE upon 429 error', async () => {
    process.env.GEMINI_API_KEY = "real-production-gemini-key";
    process.env.DEMO_MODE = "true";

    generateContentMock.mockRejectedValue(new Error("API Quota limits reached (429)"));

    const provider = new GeminiProvider("real-production-gemini-key", "gemini-3.5-flash");

    const result = await provider.generate("test prompt");
    expect(result.simulated).toBe(true);
    expect(result.text).toContain("Simulated response");
  });

  it('should return simulated: true and simulated text when using sandbox key', async () => {
    process.env.GEMINI_API_KEY = "";
    process.env.DEMO_MODE = "false";

    const provider = new GeminiProvider("", "gemini-3.5-flash");

    const result = await provider.generate("test prompt");
    expect(result.simulated).toBe(true);
    expect(result.text).toContain("Simulated response");
  });
});
