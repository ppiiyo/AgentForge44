import { Request, Response, NextFunction } from 'express';
import { checkSlidingWindow } from '../services/usage-tracker.js';

/**
 * Enterprise Sliding Window Rate Limiter Middleware
 * Evaluates limits based on hierarchically:
 * 1. Authenticated User ID
 * 2. Client Authorization API Key (bearer token)
 * 3. Client Remote IP Address
 */
export function slidingWindowRateLimiter(req: Request, res: Response, next: NextFunction): void {
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

  const isAllowed = checkSlidingWindow(rateLimitKey, 30, 60 * 1000); // 30 requests per minute limit
  if (!isAllowed) {
    res.status(429).json({
      success: false,
      error: "Too Many Requests: Rate limit exceeded (Sliding Window 30 requests/minute limit active)."
    });
    return;
  }

  next();
}
