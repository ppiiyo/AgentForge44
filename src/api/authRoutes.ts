import express from 'express';
import { UserManager, signToken, verifyToken } from './userAuth.js';
import { logger } from '../utils/logger.js';

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
  if (API_KEY && token === API_KEY) {
    (req as any).user = { id: 'admin', email: 'admin@agentforge.ai', role: 'admin' };
    next();
    return;
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
    const workspaceRole = (req as any).workspaceRole;
    const globalRole = (req as any).user?.role;
    
    const activeRole = workspaceRole || globalRole;

    if (!activeRole) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }

    const rolesPriority: Record<string, number> = {
      'owner': 3,
      'admin': 3,
      'editor': 2,
      'viewer': 1
    };

    const activePriority = rolesPriority[activeRole] || 0;
    const minRequiredPriority = Math.min(...allowedRoles.map(r => rolesPriority[r] || 999));

    const isDirectlyAllowed = allowedRoles.includes(activeRole);
    const isPriorityAllowed = activePriority >= minRequiredPriority;

    if (!isDirectlyAllowed && !isPriorityAllowed) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }

    next();
  };
}

// User Rate limiting map
const userRateLimits: Record<string, { count: number; resetAt: number }> = {};
const USER_LIMIT_WINDOW = 60 * 1000; // 1 minute
const USER_LIMIT_MAX = 100; // Max 100 requests per user per minute

export function userRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const user = (req as any).user;
  const key = user ? user.id : (req.ip || 'unknown');
  
  const now = Date.now();
  const limit = userRateLimits[key];

  if (!limit || now > limit.resetAt) {
    userRateLimits[key] = {
      count: 1,
      resetAt: now + USER_LIMIT_WINDOW
    };
    next();
    return;
  }

  limit.count++;
  if (limit.count > USER_LIMIT_MAX) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  next();
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
