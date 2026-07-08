import { db, tables } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { cache } from './cache.js';

// --- SLIDING WINDOW MEMORY DECK ---
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per window by default

const slidingWindowLogs = new Map<string, number[]>();

/**
 * Checks sliding window rate limit for an identifier (IP, userId, or apiKey).
 * Returns true if allowed, false if rate limited.
 */
export async function checkSlidingWindow(key: string, limit: number = MAX_REQUESTS, durationMs: number = WINDOW_MS): Promise<boolean> {
  const now = Date.now();
  const client = cache.getRedisClient();
  const isRedisConnected = cache.getIsRedisConnected();

  if (client && isRedisConnected) {
    try {
      const redisKey = `sliding:${key}`;
      const minScore = now - durationMs;
      const member = `${now}:${Math.random().toString(36).substring(2, 8)}`;
      
      const pipeline = client.pipeline();
      pipeline.zremrangebyscore(redisKey, '-inf', minScore);
      pipeline.zcard(redisKey);
      pipeline.zadd(redisKey, now, member);
      pipeline.expire(redisKey, Math.ceil(durationMs / 1000));
      
      const results = await pipeline.exec();
      if (!results) {
        return false;
      }
      
      // results[1][1] holds the zcard result before zadd runs or in pipeline sequence
      const cardResult = results[1][1] as number;
      if (cardResult >= limit) {
        await client.zrem(redisKey, member);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[Usage Tracker] Redis sliding window failed: ${err.message}. Falling back to memory.`);
    }
  }

  if (!slidingWindowLogs.has(key)) {
    slidingWindowLogs.set(key, [now]);
    return true;
  }

  const timestamps = slidingWindowLogs.get(key)!;
  // Keep only those within current slot
  const fresh = timestamps.filter(t => now - t < durationMs);
  
  if (fresh.length >= limit) {
    slidingWindowLogs.set(key, fresh);
    return false;
  }

  fresh.push(now);
  slidingWindowLogs.set(key, fresh);
  return true;
}

// --- SECURE DYNAMIC USER BUDGETS & TOKENS ENGINE ---
export interface UserBudgetInfo {
  budget: number;
  usedTokens: number;
}

/**
 * Fetches user budget information from the active database adapter
 */
export async function getUserBudget(userId: string): Promise<UserBudgetInfo> {
  try {
    const rows = await db.select({
      budget: tables.users.budget,
      usedTokens: tables.users.usedTokens
    })
    .from(tables.users)
    .where(eq(tables.users.id, userId));
    
    if (rows && rows.length > 0) {
      return {
        budget: rows[0].budget ?? 1000000,
        usedTokens: rows[0].usedTokens ?? 0
      };
    }
  } catch (err) {
    console.error(`[Usage Tracker] Failed to query budget for user ${userId}:`, err);
  }
  // Safe default background budget for fallbacks/anonymous/test environments
  return { budget: 1000000, usedTokens: 0 };
}

/**
 * Checks if user has enough remaining budget tokens
 */
export async function checkUserBudget(userId: string, estimatedTokensRequired: number): Promise<boolean> {
  const { budget, usedTokens } = await getUserBudget(userId);
  return (usedTokens + estimatedTokensRequired) <= budget;
}

/**
 * Deducts and increments used tokens of a user
 */
export async function recordUserUsage(userId: string, actualTokensUsed: number): Promise<void> {
  try {
    await db.update(tables.users)
      .set({
        usedTokens: sql`${tables.users.usedTokens} + ${actualTokensUsed}`
      })
      .where(eq(tables.users.id, userId));
  } catch (err) {
    console.error(`[Usage Tracker] Failed to increment token usage for user ${userId}:`, err);
  }
}
