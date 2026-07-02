import helmet from 'helmet';
import { randomBytes } from 'crypto';
import type { Express, Request, Response, NextFunction } from 'express';

export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

export function setupSecurity(app: Express) {
  // Middelware to insert a secure random nonce into res.locals for template views
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = generateNonce();
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const nonce = res.locals.nonce;
    const isProd = process.env.NODE_ENV === 'production';

    const scriptSrcDirectives = [
      "'self'",
      "'unsafe-inline'", // Kept for Vite client runtime hydration compatibility
      "'unsafe-eval'",   // Kept for isolated-vm or Vite local bundling
      "https://app.posthog.com",
      "https://*.sentry.io",
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ];

    if (isProd) {
      scriptSrcDirectives.push(`'nonce-${nonce}'`);
    }

    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: scriptSrcDirectives,
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: [
            "'self'",
            "ws:",
            "wss:",
            "https://app.posthog.com",
            "https://*.sentry.io",
            "https://api.openai.com",
            "https://generativelanguage.googleapis.com",
            "https://api.anthropic.com"
          ],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          frameSrc: ["'self'", "https://*.google.com", "https://*.googleusercontent.com"], // Allowed for preview iframes and maps
          frameAncestors: ["'self'", "https://*.google.com", "https://*.googleusercontent.com", "https://*.run.app"], // Allow AI Studio iframe integration
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false, // critical for socket.io inside iframes
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      frameguard: false // allow iframe framing for AI Studio
    })(req, res, next);
  });
}

