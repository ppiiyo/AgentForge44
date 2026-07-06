import { Router, Request, Response } from 'express';
import { adapter } from '../db/index.js';
import { RedisClient } from '../infrastructure/cache/RedisClient.js';

export function createHealthRoutes(): Router {
  const router = Router();

  // Liveness probe - is the process alive?
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok'
    });
  });

  // Readiness probe - is the service ready to accept traffic?
  router.get('/ready', async (req: Request, res: Response) => {
    let dbStatus = 'ok';
    let dbLatency: number | undefined;

    const start = Date.now();
    try {
      // Polymorphic query check
      await adapter.db.execute(adapter.type === 'postgres' ? 'SELECT 1' : 'SELECT 1');
      dbLatency = Date.now() - start;
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
