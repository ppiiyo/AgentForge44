import helmet from 'helmet';
import { randomBytes } from 'crypto';
import type { Express, Request, Response, NextFunction } from 'express';

export function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

export function setupSecurity(app: Express) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = generateNonce();
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const nonce = res.locals.nonce as string;
    const isProd = process.env.NODE_ENV === 'production';

    // PROD: только nonce, без unsafe-inline/unsafe-eval
    // DEV: Vite HMR требует unsafe-inline/eval — оставляем ТОЛЬКО в dev
    const scriptSrc = isProd
      ? ["'self'", `'nonce-${nonce}'`, 'https://app.posthog.com', 'https://*.sentry.io']
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

    const styleSrc = isProd
      ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] // unsafe-inline для стилей допустим (CSS-XSS критично ниже)
      : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];

    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          styleSrc,
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: [
            "'self'", 'ws:', 'wss:',
            'https://app.posthog.com', 'https://*.sentry.io',
            'https://api.openai.com', 'https://generativelanguage.googleapis.com', 'https://api.anthropic.com'
          ],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          frameSrc: isProd ? ["'self'"] : ["'self'", 'https://*.google.com', 'https://*.googleusercontent.com'],
          frameAncestors: isProd
            ? ["'self'"]
            : ["'self'", 'https://*.google.com', 'https://*.googleusercontent.com', 'https://*.run.app'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'sameorigin' } // было: false → clickjacking
    })(req, res, next);
  });
}
