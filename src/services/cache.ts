import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Fallback in-memory store
const memoryCache = new Map<string, { val: string; expiresAt: number }>();

// Periodic pruning of expired fallback cache items to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now >= entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }, 60000);
  if (interval && typeof interval === 'object' && 'unref' in interval) {
    (interval as any).unref();
  }
}

export class CacheService {
  private redis: Redis | null = null;
  private isRedisConnected = false;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          showFriendlyErrorStack: true,
          retryStrategy(times) {
            // Cap retry attempts to preserve memory and event loops
            if (times > 3) return null; // Halt retrying and degrade gracefully
            return Math.min(times * 100, 2000);
          }
        });

        this.redis.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('[Redis] High-speed prompt cache connected successfully.');
        });

        this.redis.on('error', (err) => {
          this.isRedisConnected = false;
          logger.warn(`[Redis] Connection error (${err.message}). Degrading to capped memory cache.`);
        });
      } catch (err: any) {
        this.isRedisConnected = false;
        logger.warn(`[Redis] Master configuration exception: ${err.message}. Defaulting to memory cache.`);
      }
    } else {
      logger.info('[Redis] REDIS_URL not configured. Initialized memory-only caching strategy.');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.redis && this.isRedisConnected) {
      try {
        return await this.redis.get(key);
      } catch (err: any) {
        logger.warn(`[Redis] 'get' failed: ${err.message}. Reading from memory fallback.`);
      }
    }
    
    // Process local fallback memory queue
    const entry = memoryCache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.val;
      }
      memoryCache.delete(key);
    }
    return null;
  }

  async set(key: string, val: string, ttlSeconds: number = 3600): Promise<void> {
    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.set(key, val, 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        logger.warn(`[Redis] 'set' failed: ${err.message}. Storing inside memory fallback.`);
      }
    }

    // Process memory fallback write
    memoryCache.set(key, {
      val,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    // Guard Map size ceiling from growing infinitely (cap at 1000 active keys)
    if (memoryCache.size > 1000) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
  }

  async invalidate(key: string): Promise<void> {
    if (this.redis && this.isRedisConnected) {
      try {
        await this.redis.del(key);
        return;
      } catch (err: any) {
        logger.warn(`[Redis] 'invalidate' failed: ${err.message}. Evicting from memory fallback.`);
      }
    }
    memoryCache.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.redis && this.isRedisConnected) {
      try {
        const val = await this.redis.incr(key);
        if (ttlSeconds !== undefined && val === 1) {
          await this.redis.expire(key, ttlSeconds);
        }
        return val;
      } catch (err: any) {
        logger.warn(`[Redis] 'incr' failed: ${err.message}. Fallback to memory.`);
      }
    }

    const entry = memoryCache.get(key);
    const now = Date.now();
    let val = 1;
    let expiresAt = now + (ttlSeconds ? ttlSeconds * 1000 : 3600 * 1000);
    if (entry && now < entry.expiresAt) {
      val = parseInt(entry.val, 10) + 1;
      expiresAt = entry.expiresAt;
    }
    memoryCache.set(key, {
      val: String(val),
      expiresAt
    });
    return val;
  }

  async incrBy(key: string, amount: number, ttlSeconds?: number): Promise<number> {
    if (this.redis && this.isRedisConnected) {
      try {
        const val = await this.redis.incrby(key, amount);
        if (ttlSeconds !== undefined && val === amount) {
          await this.redis.expire(key, ttlSeconds);
        }
        return val;
      } catch (err: any) {
        logger.warn(`[Redis] 'incrby' failed: ${err.message}. Fallback to memory.`);
      }
    }

    const entry = memoryCache.get(key);
    const now = Date.now();
    let val = amount;
    let expiresAt = now + (ttlSeconds ? ttlSeconds * 1000 : 3600 * 1000);
    if (entry && now < entry.expiresAt) {
      val = parseInt(entry.val, 10) + amount;
      expiresAt = entry.expiresAt;
    }
    memoryCache.set(key, {
      val: String(val),
      expiresAt
    });
    return val;
  }

  clearLocalCache() {
    memoryCache.clear();
  }

  getRedisClient(): Redis | null {
    return this.redis;
  }

  getIsRedisConnected(): boolean {
    return this.isRedisConnected;
  }
}

export const cache = new CacheService();

export function computeHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
