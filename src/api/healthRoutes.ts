import { Router, Request, Response } from 'express';
import { adapter } from '../db/index.js';
import { RedisClient } from '../infrastructure/cache/RedisClient.js';

export function createHealthRoutes(): Router {
  const router = Router();

  // Complete, production-ready health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    let dbStatus = 'ok';
    let dbLatency: number | undefined;

    const dbStart = Date.now();
    try {
      const dbCheck = await adapter.healthCheck();
      if (dbCheck.ok) {
        dbLatency = Date.now() - dbStart;
      } else {
        dbStatus = 'error';
      }
    } catch (err: any) {
      dbStatus = 'error';
    }

    let redisStatus = 'disabled';
    let redisLatency: number | undefined;
    if (process.env.REDIS_URL) {
      const redisStart = Date.now();
      try {
        const redis = RedisClient.getInstance();
        await redis.ping();
        redisStatus = 'up';
        redisLatency = Date.now() - redisStart;
      } catch (err: any) {
        redisStatus = 'down';
      }
    }

    // Evaluate LLM Provider Connectivity
    const providers: Record<string, { status: string; latency?: number }> = {};

    // Helper to execute fetches with strict short timeouts
    const fetchWithTimeout = async (url: string, options: any, timeoutMs = 1500) => {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timerId);
        return response;
      } catch (e) {
        clearTimeout(timerId);
        throw e;
      }
    };

    // 1. Google Gemini API Check
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      providers.gemini = { status: 'missing' };
    } else if (geminiKey.startsWith('sandbox_') || geminiKey === 'your_gemini_api_key_here') {
      providers.gemini = { status: 'sandbox' };
    } else {
      const gStart = Date.now();
      try {
        // Query models endpoint - lightweight authenticated check that uses 0 generation tokens
        const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {}, 2000);
        const lat = Date.now() - gStart;
        if (response.ok) {
          providers.gemini = { status: 'ok', latency: lat };
        } else {
          providers.gemini = { status: 'invalid_key', latency: lat };
        }
      } catch (err: any) {
        providers.gemini = { status: 'offline' };
      }
    }

    // 2. OpenAI API Check
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      providers.openai = { status: 'missing' };
    } else if (openaiKey.startsWith('sandbox_') || openaiKey === 'your_openai_api_key_here') {
      providers.openai = { status: 'sandbox' };
    } else {
      const oStart = Date.now();
      try {
        // Check standard models route
        const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey}` }
        }, 2000);
        const lat = Date.now() - oStart;
        if (response.ok) {
          providers.openai = { status: 'ok', latency: lat };
        } else {
          providers.openai = { status: 'invalid_key', latency: lat };
        }
      } catch (err: any) {
        providers.openai = { status: 'offline' };
      }
    }

    // 3. Anthropic Claude Key Configuration Check
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      providers.anthropic = { status: 'missing' };
    } else if (anthropicKey.startsWith('sandbox_') || anthropicKey === 'your_anthropic_api_key_here') {
      providers.anthropic = { status: 'sandbox' };
    } else {
      providers.anthropic = { status: 'ok' };
    }

    // 4. Offline Local Ollama API Check
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const isOllamaConfigured = !!process.env.OLLAMA_HOST;
    try {
      const olStart = Date.now();
      const response = await fetchWithTimeout(`${ollamaHost}/api/tags`, {}, 1500);
      const lat = Date.now() - olStart;
      if (response.ok) {
        providers.ollama = { status: 'ok', latency: lat };
      } else {
        providers.ollama = { status: 'offline', latency: lat };
      }
    } catch (err) {
      providers.ollama = { status: isOllamaConfigured ? 'offline' : 'missing' };
    }

    const memUsage = process.memoryUsage();
    const checks = {
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      redis: {
        status: redisStatus,
        latency: redisLatency
      },
      providers,
      memory: {
        status: 'ok',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      }
    };

    const allHealthy = dbStatus === 'ok' && (redisStatus === 'up' || redisStatus === 'disabled');
    const statusCode = dbStatus === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks
    });
  });

  // Readiness probe - is the service ready to accept traffic?
  router.get('/ready', async (req: Request, res: Response) => {
    let dbStatus = 'ok';
    let dbLatency: number | undefined;

    const start = Date.now();
    try {
      const dbCheck = await adapter.healthCheck();
      if (dbCheck.ok) {
        dbLatency = Date.now() - start;
      } else {
        dbStatus = 'error';
      }
    } catch (err: any) {
      dbStatus = 'error';
    }

    let redisStatus = 'disabled';
    let redisLatency: number | undefined;
    if (process.env.REDIS_URL) {
      const redisStart = Date.now();
      try {
        const redis = RedisClient.getInstance();
        await redis.ping();
        redisStatus = 'up';
        redisLatency = Date.now() - redisStart;
      } catch (err: any) {
        redisStatus = 'down';
      }
    }

    const memUsage = process.memoryUsage();
    const checks = {
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      redis: {
        status: redisStatus,
        latency: redisLatency
      },
      memory: {
        status: 'ok',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      }
    };

    const allHealthy = dbStatus === 'ok' && (redisStatus === 'up' || redisStatus === 'disabled');
    const statusCode = dbStatus === 'ok' ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks
    });
  });

  return router;
}

export default createHealthRoutes();
