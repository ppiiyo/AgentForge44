import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for correlation ID
export const correlationAsyncStore = new AsyncLocalStorage<{ correlationId: string }>();

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  
  // Store in async local storage
  correlationAsyncStore.run({ correlationId }, () => {
    // Add to request object
    (req as any).correlationId = correlationId;
    
    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  });
}

/**
 * Helper function to retrieve the active correlation ID in the current execution context
 */
export function getCorrelationId(): string {
  const store = correlationAsyncStore.getStore();
  return store?.correlationId || 'no-correlation-id';
}
