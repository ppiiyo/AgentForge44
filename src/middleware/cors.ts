import cors from 'cors';
import type { RequestHandler } from 'express';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://agentforge44.com',
  'https://app.agentforge44.com'
];

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is within the allowed list or is a dynamic staging/development subdomain
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
      /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      origin.includes('run.app'); // Allow the Cloud Run preview domain dynamically
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
});
