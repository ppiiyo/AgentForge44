import helmet from 'helmet';
import type { Express } from 'express';

export function setupSecurity(app: Express) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://app.posthog.com",
          "https://*.sentry.io",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
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
        frameSrc: ["'self'"] // Allowed for preview iframes
      }
    },
    crossOriginEmbedderPolicy: false, // critical for socket.io inside iframes
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}
