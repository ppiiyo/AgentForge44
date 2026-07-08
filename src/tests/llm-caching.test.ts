import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWithRetry } from '../api/services/RetryService.js';
import { cache } from '../services/cache.js';
import { GoogleGenAI } from '@google/genai';

describe('=== Task 3.2: LLM Request / Prompt Caching ===', () => {
  beforeEach(async () => {
    await cache.clearLocalCache();
  });

  it('should cache consecutive identical LLM calls transparently', async () => {
    // We instantiate GoogleGenAI (will be bypassed/simulated in test environment)
    const ai = new GoogleGenAI({ apiKey: 'sandbox_test_key' });

    const getSpy = vi.spyOn(cache, 'get');
    const setSpy = vi.spyOn(cache, 'set');

    const model = 'gemini-3.5-flash';
    const prompt = 'Explain quantum computing in one sentence.';
    const config = { temperature: 0.1 };

    // 1. First call (should miss cache, generate simulated response and write to cache)
    const res1 = await generateWithRetry(ai, model, prompt, config);
    expect(res1.response.text).toContain('Здравствуйте! Из-за временного превышения лимитов запросов');
    expect(getSpy).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalled();

    // Clear spy histories
    getSpy.mockClear();
    setSpy.mockClear();

    // 2. Second identical call (should hit cache instantly, returning cached response)
    const res2 = await generateWithRetry(ai, model, prompt, config);
    expect(res2.response.text).toContain('Здравствуйте! Из-за временного превышения лимитов запросов');
    expect(getSpy).toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled(); // No cache set called on hit!

    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
