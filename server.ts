import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { setupSecurity } from './src/middleware/security.js';
import { sanitizeRequestBody } from './src/middleware/sanitize.js';
import schedulerAndWebhooksRouter from './src/api/schedulerAndWebhooks.js';
import copilotRouter from './src/api/copilot.js';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { CollaborationServer } from './src/api/collaboration.js';
import { logger } from './src/utils/logger.js';
import { setupSwagger } from './src/api/swagger.js';
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

dotenv.config();

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

app.use(cors({
  origin: true,
  credentials: true
}));

setupSecurity(app);
app.use(cookieParser());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
app.use('/api', apiRateLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequestBody);

const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: 'strict', secure: false } });

// Expose CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req: any, res: any) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protect all other POST/PUT/DELETE /api routes
app.use('/api', (req: any, res: any, next: any) => {
  if (req.path === '/csrf-token') {
    return next();
  }
  csrfProtection(req, res, next);
});

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
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

// Sentry Error Capture Middleware
app.use((err: any, req: express.Request, res: express.Response, next: any) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
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
  new CollaborationServer(httpServer);
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  setupServer().catch(err => {
    logger.error("Failed to start server:", { error: err.message || err });
  });
}
