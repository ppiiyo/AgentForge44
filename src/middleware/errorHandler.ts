import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger.js';
import { AgentForgeError } from '../api/errors/AgentErrors.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err instanceof AgentForgeError ? err.code : 'INTERNAL_SERVER_ERROR';
  
  logger.error("Unhandled Server Exception captured:", { 
    error: err.message || err, 
    code: errorCode, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      code: errorCode,
      error: err.message || "Internal Server Error Connection Interrupt"
    });
  } else {
    next(err);
  }
}
