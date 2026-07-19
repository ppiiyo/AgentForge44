import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../api/authRoutes.js';
import { logger } from '../utils/logger.js';

// Explicit public endpoints allowlist
const PUBLIC_PATHS_ALLOWLIST = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
  '/api/health',
  '/api/diagnostics',
  '/api/marketplace',
  '/api/marketplace/featured',
  '/api/test-payload',
  '/api/config/status',
  '/api/config/env-status',
  '/api/config/update-keys',
  '/api/resilience/chaos-config',
  '/api/resilience/chaos-reset',
  '/api/resilience/circuit-breakers'
];

export function unifiedGuardMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.baseUrl + req.path;

  // 1. Skip non-API paths (UI, assets, Swagger UI)
  if (!path.startsWith('/api')) {
    next();
    return;
  }

  // 2. Allow Swagger UI assets & raw json schema endpoints
  if (path.startsWith('/api-docs') || path === '/swagger.json') {
    next();
    return;
  }

  // 3. Allow public GET marketplace requests
  if (req.method === 'GET') {
    const isPublicGet =
      PUBLIC_PATHS_ALLOWLIST.includes(path) ||
      path.startsWith('/api/marketplace/') ||
      path === '/api/marketplace';
    if (isPublicGet) {
      next();
      return;
    }
  }

  // 4. Match exact allowlist paths
  if (PUBLIC_PATHS_ALLOWLIST.includes(path)) {
    next();
    return;
  }

  // 5. Enforce authMiddleware for all other routes
  logger.info(`Guarding endpoint: ${req.method} ${path} - enforcing authentication.`);
  authMiddleware(req, res, next);
}
