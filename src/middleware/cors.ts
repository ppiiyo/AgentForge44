import cors from 'cors';
import type { RequestHandler } from 'express';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://kostromai4444.com',
  'https://app.kostromai4444.com'
];

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      
      // Strict subdomain/domain checks to prevent bypass (e.g. run.app.attacker.com)
      const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname === 'run.app' ||
        hostname.endsWith('.run.app');
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } catch {
      callback(new Error('Invalid Origin header'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
});
