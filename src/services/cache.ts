import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Fallback in-memory store
const memoryCache = new Map<string, { val: string; expiresAt: number }>();

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

  clearLocalCache() {
    memoryCache.clear();
  }
}

export const cache = new CacheService();

export function computeHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
