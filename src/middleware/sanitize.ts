import { Request, Response, NextFunction } from 'express';
import { maskSecrets } from '../utils/logger.js';

/**
 * Sanitizing body cleanser middleware.
 * Traverses request body and exposes a completely sanitized clone as req.sanitizedBody 
 * to shield database errors or system metrics logs from storing cleartext secrets.
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    (req as any).sanitizedBody = maskSecrets(req.body);
  }
  next();
}
