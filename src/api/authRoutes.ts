import express from 'express';
import crypto from 'crypto';
import { UserManager, signToken, verifyToken } from './userAuth.js';
import { logger } from '../utils/logger.js';
import { rolesPriority } from './rbac.js';
import { cache } from '../services/cache.js';

const router = express.Router();

// Middleware to authenticate requests via JWT or API Key
export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Unauthorized: Authorization header is missing' });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: Auth token is empty' });
    return;
  }

  // 1. Check if token is the API Master Key
  const API_KEY = process.env.AGENTFORGE_API_KEY;
  if (API_KEY) {
    const tokenBuffer = Buffer.from(token);
    const apiKeyBuffer = Buffer.from(API_KEY);
    if (tokenBuffer.length === apiKeyBuffer.length) {
      if (crypto.timingSafeEqual(tokenBuffer, apiKeyBuffer)) {
        (req as any).user = { id: 'admin', email: 'admin@agentforge.ai', role: 'admin' };
        next();
        return;
      }
    }
  }

  // 2. Validate JWT Token
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired credentials' });
    return;
  }

  (req as any).user = decoded;
  next();
}

// Role restriction middleware
export function requireRole(allowedRoles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Service-account bypass
    if ((req as any).user?.role === 'admin') {
      next();
      return;
    }

    const workspaceRole = (req as any).workspaceRole;

    if (!workspaceRole) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }

    const activePriority = rolesPriority[workspaceRole as any] || 0;
    const requiredPriority = Math.max(...allowedRoles.map(r => rolesPriority[r as any] || 0));

    const isDirectlyAllowed = allowedRoles.includes(workspaceRole);
    const isPriorityAllowed = activePriority >= requiredPriority;

    if (!isDirectlyAllowed && !isPriorityAllowed) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }

    next();
  };
}

const USER_LIMIT_WINDOW = 60 * 1000; // 1 minute
const USER_LIMIT_MAX = 100; // Max 100 requests per user per minute

export async function userRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const user = (req as any).user;
  let clientIp = req.ip;
  if (!clientIp && req.headers['x-forwarded-for']) {
    const forwardedFor = req.headers['x-forwarded-for'];
    clientIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
  }
  const key = `ratelimit:user:${user ? user.id : (clientIp || 'unknown')}`;
  
  try {
    const currentCount = await cache.incr(key, USER_LIMIT_WINDOW / 1000);
    if (currentCount > USER_LIMIT_MAX) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }
    next();
  } catch (err: any) {
    logger.error('Error in userRateLimiter:', err);
    next();
  }
}

/**
 * Auth Router Endpoints
 */
router.post('/auth/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const assignedRole = role && ['admin', 'editor', 'viewer', 'api_user'].includes(role) ? role : 'viewer';
    const user = await UserManager.register(email, password, assignedRole);
    const token = signToken(user);

    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({ success: true, user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/auth/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await UserManager.login(email, password);
    const token = signToken(user);

    logger.info(`User logged in: ${email}`);
    res.json({ success: true, user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

router.post('/auth/logout', (req: express.Request, res: express.Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/me', authMiddleware, (req: express.Request, res: express.Response) => {
  const user = (req as any).user;
  res.json({ success: true, user });
});

export default router;
