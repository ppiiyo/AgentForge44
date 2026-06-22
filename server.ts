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
import { GracefulShutdown } from './src/services/gracefulShutdown.js';
import { adapter } from './src/db/index.js';
import * as Sentry from '@sentry/node';
import { CollaborationServer } from './src/api/collaboration.js';
import { logger } from './src/utils/logger.js';
import { setupSwagger } from './src/api/swagger.js';
import { register } from './src/services/metrics.js';
import { initTracing } from './src/services/tracing.js';
import authRoutes from './src/api/authRoutes.js';
import projectsRouter from './src/api/projectsRoutes.js';
import graphsRouter from './src/api/graphsRoutes.js';
import executeRouter from './src/api/executeRoutes.js';
import marketplaceRouter from './src/api/marketplaceRoutes.js';
import deploymentRouter from './src/api/deploymentRoutes.js';
import mcpRouter from './src/api/mcpRoutes.js';
import metricsRouter from './src/api/metricsRoutes.js';
import ragRouter from './src/api/ragRoutes.js';
import patternsRouter from './src/api/patternsRoutes.js';
import { enterpriseTenantContext } from './src/middleware/tenantIsolation.js';

dotenv.config();
initTracing();

if (process.env.SENTRY_DSN) {
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
const PORT = Number(process.env.PORT) || 3000;

app.use(corsMiddleware);
app.use(correlationIdMiddleware);

setupSecurity(app);
app.use('/api', enterpriseTenantContext);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

app.use('/api', tieredRateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequestBody);

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
app.get('/metrics', async (req: express.Request, res: express.Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
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

// Sentry Error Capture Middleware
app.use((err: any, req: express.Request, res: express.Response, next: any) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  logger.error("Unhandled Server Exception captured:", { error: err.message || err });
  if (!res.headersSent) {
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || "Internal Server Error Connection Interrupt"
    });
  } else {
    next(err);
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
