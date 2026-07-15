import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { getCorrelationId } from '../middleware/correlationId.js';
import { z } from 'zod';
import axios from 'axios';
import Transport from 'winston-transport';

export const executionAsyncStore = new AsyncLocalStorage<string>();

/**
 * Enforceable, Zod-validated log entry schema
 */
export const LogSchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.string(),
  execution_id: z.string().optional(),
  correlationId: z.string().optional(),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    name: z.string().optional()
  }).optional()
}).catchall(z.any()); // Accept extra arbitrary metadata

export type LogEntry = z.infer<typeof LogSchema>;

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

// Custom Winston Formatters
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

const zodValidationFormat = winston.format((info) => {
  if (!info.timestamp) {
    info.timestamp = new Date().toISOString();
  }
  
  const parsed = LogSchema.safeParse(info);
  if (!parsed.success) {
    console.warn(`[Log Schema Validation Failed]: ${parsed.error.message}`, { info });
  }
  return info;
});

/**
 * Custom Winston Transport for sending structured logs to Grafana Loki
 */
export class LokiTransport extends Transport {
  private url: string;
  private labels: Record<string, string>;

  constructor(opts: { url: string; labels?: Record<string, string>; level?: string }) {
    super(opts);
    this.url = opts.url;
    this.labels = opts.labels || { app: 'kostromai44-core' };
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, message, timestamp, ...meta } = info;
    const logTimeNano = timestamp ? new Date(timestamp).getTime() * 1000000 : Date.now() * 1000000;

    const payload = {
      streams: [
        {
          stream: {
            ...this.labels,
            level,
          },
          values: [
            [String(logTimeNano), JSON.stringify({ message, ...meta })]
          ]
        }
      ]
    };

    axios.post(`${this.url}/loki/api/v1/push`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).catch((_err) => {
      // Fail silently to prevent logging failures from breaking server operations
    });

    callback();
  }
}

const transports: winston.transport[] = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.simple()
    )
  })
];

const lokiUrl = process.env.LOKI_URL;
if (lokiUrl) {
  transports.push(
    new LokiTransport({
      url: lokiUrl,
      labels: { app: 'kostromai44-core', env: process.env.NODE_ENV || 'development' }
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    executionIdFormat(),
    maskFormat(),
    zodValidationFormat(),
    winston.format.json()
  ),
  transports
});

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
