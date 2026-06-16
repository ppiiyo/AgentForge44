import { sqlite } from '../db/index.js';

// --- SLIDING WINDOW MEMORY DECK ---
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per window by default

const slidingWindowLogs = new Map<string, number[]>();

/**
 * Checks sliding window rate limit for an identifier (IP, userId, or apiKey).
 * Returns true if allowed, false if rate limited.
 */
export function checkSlidingWindow(key: string, limit: number = MAX_REQUESTS, durationMs: number = WINDOW_MS): boolean {
  const now = Date.now();
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

// --- SQLITE USER BUDGETS & TOKENS ENGINE ---
export function ensureBudgetSchema() {
  try {
    sqlite.prepare("ALTER TABLE users ADD COLUMN budget INTEGER NOT NULL DEFAULT 1000000").run();
  } catch (err) {}
  try {
    sqlite.prepare("ALTER TABLE users ADD COLUMN used_tokens INTEGER NOT NULL DEFAULT 0").run();
  } catch (err) {}
}

export interface UserBudgetInfo {
  budget: number;
  usedTokens: number;
}

/**
 * Fetches user budget information from sqlite securely
 */
export function getUserBudget(userId: string): UserBudgetInfo {
  ensureBudgetSchema();
  try {
    const row = sqlite.prepare("SELECT budget, used_tokens FROM users WHERE id = ?").get(userId) as any;
    if (row) {
      return {
        budget: row.budget,
        usedTokens: row.used_tokens
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
export function checkUserBudget(userId: string, estimatedTokensRequired: number): boolean {
  const { budget, usedTokens } = getUserBudget(userId);
  return (usedTokens + estimatedTokensRequired) <= budget;
}

/**
 * Deducts and increments used tokens of a user
 */
export function recordUserUsage(userId: string, actualTokensUsed: number): void {
  ensureBudgetSchema();
  try {
    sqlite.prepare("UPDATE users SET used_tokens = used_tokens + ? WHERE id = ?").run(actualTokensUsed, userId);
  } catch (err) {
    console.error(`[Usage Tracker] Failed to increment token usage for user ${userId}:`, err);
  }
}
