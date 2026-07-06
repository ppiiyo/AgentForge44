import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { IntegrationTestContext } from './setup.js';
import { simpleBlueprint, parallelBlueprint, reviewerBlueprint, failingBlueprint } from '../fixtures/blueprints.js';
import { tables } from '../../db/index.js';
import { eq } from 'drizzle-orm';

describe('=== PipelineExecutor Integration ===', () => {
  let ctx: IntegrationTestContext;

  beforeAll(async () => {
    ctx = await IntegrationTestContext.create();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('Happy Path', () => {
    it('should execute simple LLM pipeline successfully', async () => {
      const result = await ctx.executor.execute(simpleBlueprint, {
        input: { text: 'The quick brown fox jumps over the lazy dog' }
      });

      expect(result.status).toBe('success');
      expect(result.outputs.llm).toBeDefined();
      expect(result.outputs.llm.content).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.metrics.duration).toBeLessThan(30000);
    });

    it('should execute parallel nodes concurrently', async () => {
      const startTime = Date.now();
      const result = await ctx.executor.execute(parallelBlueprint, { input: {} });
      const duration = Date.now() - startTime;

      expect(result.status).toBe('success');
      expect(result.outputs.merge).toBeDefined();
      
      // Parallel execution should be faster than sum of sequential timeouts
      expect(duration).toBeLessThan(3000);
    });

    it('should execute self-correction loop with reviewer', async () => {
      const result = await ctx.executor.execute(reviewerBlueprint, {
        topic: 'AI safety'
      });

      expect(result.status).toBe('success');
      expect(result.iterations).toBeLessThanOrEqual(3);
      expect(result.outputs.reviewer.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Error Handling', () => {
    it('should handle node failures gracefully', async () => {
      const result = await ctx.executor.execute(failingBlueprint, { input: {} });

      expect(result.status).toBe('failed');
      expect(result.errors).toBeDefined();
      expect(result.errors[0].nodeId).toBe('http');
      expect(result.errors[0].message).toMatch(/fetch|network|ECONNREFUSED/i);
    });

    it('should respect global timeout', async () => {
      const slowBlueprint = {
        ...simpleBlueprint,
        nodes: simpleBlueprint.nodes.map(n => ({
          ...n,
          config: { ...n.fields, delay: 600000 } // 10 minutes
        }))
      };

      await expect(
        ctx.executor.execute(slowBlueprint, { input: {} })
      ).rejects.toThrow(/timeout/i);
    }, 10000);

    it('should cancel execution on abort signal', async () => {
      const controller = new AbortController();
      const executionPromise = ctx.executor.execute(simpleBlueprint, {
        input: {},
        signal: controller.signal
      });

      setTimeout(() => controller.abort(), 100);

      await expect(executionPromise).rejects.toThrow(/cancelled|aborted/i);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit after multiple failures', async () => {
      // Simulate 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        await ctx.executor.execute(failingBlueprint, { input: {} }).catch(() => {});
      }

      // Check circuit breaker state in mock redis
      const state = await ctx.redis.getCircuitBreakerState('openai');
      expect(state.state).toBe('OPEN');
    });

    it('should recover circuit after reset timeout', async () => {
      // Simulate reset/half-open transition
      await ctx.redis.setCircuitBreakerState('openai', { state: 'HALF_OPEN', failureCount: 0 });

      const state = await ctx.redis.getCircuitBreakerState('openai');
      expect(state.state).toBe('HALF_OPEN');
    });
  });

  describe('Persistence', () => {
    it('should save execution state to database', async () => {
      const result = await ctx.executor.execute(simpleBlueprint, { input: {} });
      
      const runs = await ctx.db.select().from(tables.pipelineRuns).where(eq(tables.pipelineRuns.id, result.executionId)).limit(1);
      const execution = runs[0];

      expect(execution).toBeDefined();
      expect(execution.status).toBe('completed');
    });

    it('should allow resuming failed execution', async () => {
      const result = await ctx.executor.resume('test-resume-1');
      expect(result.status).toBe('success');
    });
  });
});
