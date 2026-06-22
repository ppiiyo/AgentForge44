import { logger } from '../utils/logger.js';
import { getCorrelationId } from '../middleware/correlationId.js';

// Logging helpers with automatic correlation ID inclusion
export const log = {
  info: (message: string, meta?: any) => {
    logger.info(message, { correlationId: getCorrelationId(), ...meta });
  },
  error: (message: string, error?: Error, meta?: any) => {
    logger.error(message, { 
      correlationId: getCorrelationId(),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...meta
    });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { correlationId: getCorrelationId(), ...meta });
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, { correlationId: getCorrelationId(), ...meta });
  }
};

export { logger };
