import { Request, Response, NextFunction } from 'express';
import { checkSlidingWindow } from '../services/usage-tracker.js';
import { verifyToken } from '../api/userAuth.js';
import rateLimit, { Store } from 'express-rate-limit';
import { RedisStore as RedisStoreClass } from 'rate-limit-redis';
import DefaultRedisStore from 'rate-limit-redis';

// Bulletproof compatibility pattern for both ES module default export and CJS named/default exports
const RedisStore = RedisStoreClass || (DefaultRedisStore as any).RedisStore || DefaultRedisStore;

import { cache } from '../services/cache.js';
import { logger } from '../utils/logger.js';

class ResilientRedisStore implements Store {
  private redisStore: any;
  private localMap = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    this.redisStore = new RedisStore({
      sendCommand: async (...args: string[]) => {
        const client = cache.getRedisClient();
        if (client && cache.getIsRedisConnected()) {
          return (client as any).call(args[0], ...args.slice(1));
        }
        throw new Error('Redis client not available');
      }
    });
  }

  async increment(key: string): Promise<any> {
    const client = cache.getRedisClient();
    if (client && cache.getIsRedisConnected()) {
      try {
        return await this.redisStore.increment(key);
      } catch (err: any) {
        logger.warn(`[RedisStore] increment failed: ${err.message}. Degrading to memory rate limiter.`);
      }
    }
    return this.incrementLocal(key);
  }

  async decrement(key: string): Promise<void> {
    const client = cache.getRedisClient();
    if (client && cache.getIsRedisConnected()) {
      try {
        await this.redisStore.decrement(key);
        return;
      } catch (err: any) {
        logger.warn(`[RedisStore] decrement failed: ${err.message}`);
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    const client = cache.getRedisClient();
    if (client && cache.getIsRedisConnected()) {
      try {
        await this.redisStore.resetKey(key);
        return;
      } catch (err: any) {
        logger.warn(`[RedisStore] resetKey failed: ${err.message}`);
      }
    }
  }

  private incrementLocal(key: string) {
    const now = Date.now();
    let entry = this.localMap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 15 * 60 * 1000 };
    }
    entry.count++;
    this.localMap.set(key, entry);
    return {
      totalHits: entry.count,
      resetTime: new Date(entry.resetAt)
    };
  }
}

const resilientStore = new ResilientRedisStore();

/**
 * Enterprise Sliding Window Rate Limiter Middleware
 * Evaluates limits based on hierarchically:
 * 1. Authenticated User ID
 * 2. Client Authorization API Key (bearer token)
 * 3. Client Remote IP Address
 */
export async function slidingWindowRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clientIP = req.ip || "unknown-client";
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : "";

  let rateLimitKey = `ip-${clientIP}`;
  
  // 1. Check if authenticated user exists
  if ((req as any).user && (req as any).user.id) {
    rateLimitKey = `user-${(req as any).user.id}`;
  } 
  // 2. Identify by API bearer token
  else if (token) {
    rateLimitKey = `apikey-${token}`;
  }

  try {
    const isAllowed = await checkSlidingWindow(rateLimitKey, 30, 60 * 1000); // 30 requests per minute limit
    if (!isAllowed) {
      res.status(429).json({
        success: false,
        error: "Too Many Requests: Rate limit exceeded (Sliding Window 30 requests/minute limit active)."
      });
      return;
    }

    next();
  } catch (err: any) {
    logger.error('Error in slidingWindowRateLimiter:', err);
    next();
  }
}

// Anonymous rate limiter: 100 requests per 15 minutes
const anonymousRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: resilientStore,
  message: {
    success: false,
    error: 'Too many requests under anonymous block, please sign in or try again later.',
    retryAfter: '15 minutes'
  }
});

// Authenticated rate limiter: 1000 requests per 15 minutes
const authenticatedRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  store: resilientStore,
  message: {
    success: false,
    error: 'Rate limit exceeded for your account, please wait before sending more requests.',
    retryAfter: '15 minutes'
  }
});

/**
 * Tiered Rate Limiter middleware
 * Automatically parses token to detect auth status and routes to corresponding rate limit bracket:
 * - Anonymous: 100 req / 15 min
 * - Authenticated / Licensed key: 1000 req / 15 min
 */
export function tieredRateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Check if token exists to identify if authenticated
  let isAuthenticated = false;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token) {
      const MASTER_API_KEY = process.env.AGENTFORGE_API_KEY;
      if (MASTER_API_KEY && token === MASTER_API_KEY) {
        isAuthenticated = true;
      } else {
        const decoded = verifyToken(token);
        if (decoded) {
          (req as any).user = decoded;
          isAuthenticated = true;
        }
      }
    }
  }

  if (isAuthenticated) {
    authenticatedRateLimiter(req, res, next);
  } else {
    anonymousRateLimiter(req, res, next);
  }
}

