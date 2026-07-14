import { logger } from '../utils/logger.js';
import { z } from 'zod';

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production']).default('development'),
  JWT_SECRET: z.string().min(32).optional(),
  ENCRYPTION_MASTER_KEY: z.string().min(32).optional(),
  GEMINI_API_KEY: z.string().optional(),
  DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

/**
 * Validates the presence and integrity of all required and optional environment variables
 * from .env to prevent runtime failures.
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

  // 1. Zod Schema parse
  try {
    envSchema.parse(process.env);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      err.errors.forEach(zodErr => {
        const path = zodErr.path.join('.');
        const msg = `${path || 'Environment'}: ${zodErr.message}`;
        if (isProd) {
          errors.push(`[Zod Schema] ${msg}`);
        } else {
          warnings.push(`[Zod Schema] ${msg}`);
        }
      });
    } else {
      if (isProd) {
        errors.push(`[Zod Schema] Parsing failed: ${err.message}`);
      } else {
        warnings.push(`[Zod Schema] Parsing failed: ${err.message}`);
      }
    }
  }

  // 2. Port Options

  if (process.env.PORT) {
    const portNum = parseInt(process.env.PORT, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      errors.push(`PORT environment variable is invalid: "${process.env.PORT}". It must be a valid port number (1-65535).`);
    }
  }

  // 3. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProd) {
      errors.push('JWT_SECRET is missing. A secure 32+ character high-entropy key is required for production authorization.');
    } else {
      warnings.push('JWT_SECRET is missing. A development fallback secret will be dynamically used, but this is unsafe for production.');
    }
  } else if (jwtSecret.length < 32) {
    if (isProd) {
      errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). It must be at least 32 characters for proper cryptographic security.`);
    } else {
      warnings.push(`JWT_SECRET is weak (${jwtSecret.length} chars). Ensure it is at least 32 characters long in production.`);
    }
  }

  // 4. Encryption Master Key Validation
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!encryptionKey) {
    if (isProd) {
      errors.push('ENCRYPTION_MASTER_KEY is missing. A secure 32+ character key is required to encrypt database credentials.');
    } else {
      warnings.push('ENCRYPTION_MASTER_KEY is missing. A development fallback secret will be dynamically used, but database API keys cannot be safely stored.');
    }
  } else if (encryptionKey.length < 32) {
    if (isProd) {
      errors.push(`ENCRYPTION_MASTER_KEY is too short (${encryptionKey.length} chars). It must be at least 32 characters long.`);
    } else {
      warnings.push(`ENCRYPTION_MASTER_KEY is weak (${encryptionKey.length} chars). Ensure it is at least 32 characters long in production.`);
    }
  }

  // 5. Gemini API Key (Default agent runtime driving key)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    if (isProd) {
      errors.push('GEMINI_API_KEY is missing. The system requires a Google AI Studio API key to run active LLM orchestrator pipelines.');
    } else {
      warnings.push('GEMINI_API_KEY is missing. Active agents and pipelines will fail unless "sandbox_free_test_gemini" or a mock simulation key is provided.');
    }
  } else if (geminiKey !== 'sandbox_free_test_gemini' && geminiKey.trim().length < 10) {
    warnings.push('GEMINI_API_KEY looks unusually short. Verify that it is copy-pasted correctly from Google AI Studio.');
  }

  // 6. Database Configuration checks
  const dbType = process.env.DB_TYPE || 'sqlite';
  const dbUrl = process.env.DATABASE_URL;
  if (dbType === 'postgres') {
    if (!dbUrl) {
      errors.push('DATABASE_URL is missing but DB_TYPE is set to "postgres". A valid postgres:// connection string is required.');
    } else if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
      errors.push('DATABASE_URL is malformed. It must start with "postgres://" or "postgresql://".');
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings
  };
}

/**
 * Executes a pre-flight startup check and logs outcomes.
 * Exits the process if critical validation errors are found in production.
 */
export function runStartupEnvCheck(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    result.warnings.forEach(warn => {
      logger.warn(`[STARTUP CHECK WARNING] ${warn}`);
    });
  }

  if (!result.isValid) {
    result.errors.forEach(err => {
      logger.error(`[STARTUP CHECK CRITICAL ERROR] ${err}`);
    });
    
    // In production, force-exit to prevent runtime crashes/vulnerabilities
    if (process.env.NODE_ENV === 'production') {
      logger.error('Startup halted due to critical environment variable errors.');
      process.exit(1);
    } else {
      logger.warn('Startup permitted in non-production mode, but system components may degrade.');
    }
  } else {
    logger.info('Environment verification succeeded. All required variables are configured.');
  }
}
