import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import type { Request, Response, NextFunction } from 'express';

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  outcome: 'success' | 'failure' | 'denied';
  statusCode: number;
}

export class AuditLogger {
  private static logDir = path.join(process.cwd(), 'logs');
  private static logFile = path.join(this.logDir, 'audit.log');

  static {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err: any) {
      logger.error('Failed to initialize audit log directory:', err);
    }
  }

  /**
   * Appends an audit log entry to the secure local audit log file.
   */
  public static log(entry: AuditLogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    try {
      fs.appendFileSync(this.logFile, logLine, 'utf8');
      logger.info(`[AUDIT] ${entry.userId} - ${entry.action} - ${entry.outcome.toUpperCase()} (${entry.statusCode})`);
    } catch (err: any) {
      logger.error('Failed to write audit log entry:', err);
    }
  }

  /**
   * Express middleware to automatically audit state-changing mutations (POST, PUT, DELETE, PATCH).
   */
  public static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only log mutating HTTP requests
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (!isMutation) {
        next();
        return;
      }

      const originalJson = res.json;
      const originalSend = res.send;

      let responseCaptured = false;
      let statusCode = 200;

      const captureLog = (code: number) => {
        if (responseCaptured) return;
        responseCaptured = true;
        statusCode = code;

        const userId = (req as any).user?.id || 'anonymous';
        const action = `${req.method} ${req.baseUrl}${req.path}`;
        const resource = req.params.id || req.body?.id || 'bulk';
        
        let clientIp = req.ip || 'unknown';
        if (req.headers['x-forwarded-for']) {
          const forwarded = req.headers['x-forwarded-for'];
          clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
        }

        const userAgent = req.headers['user-agent'] || 'unknown';
        
        let outcome: 'success' | 'failure' | 'denied' = 'success';
        if (code === 401 || code === 403) {
          outcome = 'denied';
        } else if (code >= 400) {
          outcome = 'failure';
        }

        const entry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          userId,
          action,
          resource,
          ip: clientIp,
          userAgent,
          outcome,
          statusCode
        };

        AuditLogger.log(entry);
      };

      // Intercept response finish
      res.on('finish', () => {
        captureLog(res.statusCode);
      });

      // Override response methods to catch failures early
      res.json = function (body: any) {
        statusCode = res.statusCode;
        originalJson.call(this, body);
        captureLog(statusCode);
        return this;
      };

      res.send = function (body: any) {
        statusCode = res.statusCode;
        originalSend.call(this, body);
        captureLog(statusCode);
        return this;
      };

      next();
    };
  }
}
