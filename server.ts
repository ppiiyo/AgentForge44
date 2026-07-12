import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { corsMiddleware } from './src/middleware/cors.js';
import { setupSecurity } from './src/middleware/security.js';
import { sanitizeRequestBody } from './src/middleware/sanitize.js';
import schedulerAndWebhooksRouter from './src/api/schedulerAndWebhooks.js';
import copilotRouter from './src/api/copilot.js';
import { tieredRateLimiter } from './src/middleware/rateLimit.js';
import { correlationIdMiddleware } from './src/middleware/correlationId.js';
import { createHealthRoutes } from './src/api/healthRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { GracefulShutdown } from './src/services/gracefulShutdown.js';
import { adapter } from './src/db/index.js';
import { validateDatabaseConfig } from './src/api/db.js';
import { validateSecrets } from './src/config/secrets.ts';
import { runSchemaMigrations } from './src/api/migrate.js';
import * as Sentry from '@sentry/node';
import { CollaborationServer } from './src/api/collaboration.js';
import { logger } from './src/utils/logger.js';
import { setupSwagger } from './src/api/swagger.js';
import { register } from './src/services/metrics.js';
import { initTracing } from './src/services/tracing.js';
import authRoutes, { authMiddleware } from './src/api/authRoutes.js';
import projectsRouter from './src/api/projectsRoutes.js';
import graphsRouter from './src/api/graphsRoutes.js';
import executeRouter from './src/api/executeRoutes.js';
import marketplaceRouter from './src/api/marketplaceRoutes.js';
import deploymentRouter from './src/api/deploymentRoutes.js';
import mcpRouter from './src/api/mcpRoutes.js';
import metricsRouter from './src/api/metricsRoutes.js';
import githubRouter from './src/api/githubRoutes.js';
import ragRouter from './src/api/ragRoutes.js';
import patternsRouter from './src/api/patternsRoutes.js';
import diagnosticsRouter from './src/api/diagnosticsRoutes.js';
import { enterpriseTenantContext } from './src/middleware/tenantIsolation.js';
import { unifiedGuardMiddleware } from './src/middleware/guard.js';

dotenv.config();

// Pre-flight database and secrets credential validation
const isProd = process.env.NODE_ENV === 'production';

try {
  validateSecrets();
} catch (error: any) {
  if (isProd) {
    logger.error(`CRITICAL CONFIGURATION ERROR ON STARTUP: ${error.message}`);
    process.exit(1);
  } else {
    logger.warn(`SECRETS CONFIGURATION WARNING: ${error.message}`);
  }
}

try {
  validateDatabaseConfig(process.env.DB_TYPE || 'sqlite', process.env.DATABASE_URL || '');
} catch (error: any) {
  if (isProd) {
    logger.error(`CRITICAL DATABASE CONFIGURATION ERROR: ${error.message}`);
    process.exit(1);
  } else {
    logger.warn(`DATABASE CONFIGURATION WARNING: ${error.message}. Defaulting DB_TYPE to "sqlite" and falling back gracefully.`);
    process.env.DB_TYPE = 'sqlite';
  }
}

initTracing();

if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn_here' && process.env.SENTRY_DSN.startsWith('http')) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const PROJECTS_DIR = path.join(process.cwd(), 'projects');
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

export const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

app.use(corsMiddleware);
app.use(correlationIdMiddleware);

setupSecurity(app);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

app.use('/api', tieredRateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequestBody);

app.use('/api', unifiedGuardMiddleware);
app.use('/api', enterpriseTenantContext);

// Endpoint for testing request payload limits
app.post('/api/test-payload', (req: express.Request, res: express.Response) => {
  res.json({ received: true, size: req.body ? JSON.stringify(req.body).length : 0 });
});

// Setup OpenAPI Documentation
setupSwagger(app);

// Mount Modular API Routers
app.use('/api', authRoutes);
app.use('/api', projectsRouter);
app.use('/api', graphsRouter);
app.use('/api', executeRouter);
app.use('/api', marketplaceRouter);
app.use('/api', deploymentRouter);
app.use('/api', mcpRouter);
app.use('/api', metricsRouter);
app.use('/api', githubRouter);
app.use('/api', diagnosticsRouter);
app.get('/metrics', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
  }
});
app.get('/traces', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const logPath = path.join(process.cwd(), 'logs/combined.log');
    let traces: any[] = [];
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.execution_id || parsed.correlationId || parsed.level === 'error' || parsed.message?.includes('Trace')) {
            traces.push(parsed);
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    res.json({
      success: true,
      service: 'kostromai44-core',
      provider: 'OpenTelemetry',
      totalSpans: traces.length,
      spans: traces.slice(-100).reverse() // Return last 100 traces
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.use('/api', ragRouter);
app.use('/api', patternsRouter);
app.use('/api', schedulerAndWebhooksRouter);
app.use('/api', copilotRouter);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Retrieve server health status
 *     description: Health check endpoint for verifying server status and connections.
 *     responses:
 *       200:
 *         description: Server is online and healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.use('/api', createHealthRoutes());

// Centralized Error Handling Middleware
app.use(errorHandler);

async function setupServer() {
  // Execute auto-run database table schema migrations on server start
  try {
    await runSchemaMigrations(adapter);
  } catch (migErr: any) {
    logger.error('CRITICAL ERROR: Database connection / schema auto-migrations failed. Execution halted.', { error: migErr.message });
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 24678 }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Express custom server running on http://localhost:${PORT}`);
  });

  // Start Socket.io Collaboration Server
  const collaborationServer = new CollaborationServer(httpServer);

  // Initialize production-grade Graceful Shutdown
  new GracefulShutdown(httpServer, collaborationServer.io, adapter);
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  setupServer().catch(err => {
    logger.error("Failed to start server:", { error: err.message || err });
  });
}
