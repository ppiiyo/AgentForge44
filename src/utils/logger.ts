import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export const executionAsyncStore = new AsyncLocalStorage<string>();

/**
 * Recursively scans and masks keys resembling api_key, password, secret, token, credentials
 */
export function maskSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskSecrets(item));
  }
  
  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key of Object.keys(obj)) {
      const isSensitive = /api[_-]?key|password|secret|token|authorization|credential/i.test(key);
      if (isSensitive) {
        cloned[key] = '***MASKED***';
      } else {
        cloned[key] = maskSecrets(obj[key]);
      }
    }
    return cloned;
  }
  
  if (typeof obj === 'string') {
    // Attempt parsing in case stringified JSON payloads are passed under fields
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(maskSecrets(parsed));
      }
    } catch {}
  }
  
  return obj;
}

// Custom Winston Formatter
const maskFormat = winston.format((info) => {
  return maskSecrets(info);
});

const executionIdFormat = winston.format((info) => {
  const executionId = executionAsyncStore.getStore();
  if (executionId) {
    info.execution_id = executionId;
  }
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    executionIdFormat(),
    maskFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple()
      )
    })
  ]
});

