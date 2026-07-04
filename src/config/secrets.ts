import winston from 'winston';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Setup dummy defaults ONLY for testing and non-production environments to prevent startup and test failures
const isDevelopmentOrTest = process.env.NODE_ENV !== 'production' || !!process.env.VITEST;

if (isDevelopmentOrTest) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is missing or too short. Using non-production fallback key.');
    process.env.JWT_SECRET = 'development_fallback_jwt_secret_with_more_than_32_characters_for_security_kostromai44_2026';
  }
  if (!process.env.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_MASTER_KEY.length < 32) {
    logger.warn('ENCRYPTION_MASTER_KEY is missing or too short. Using non-production fallback key.');
    process.env.ENCRYPTION_MASTER_KEY = 'development_fallback_encryption_master_key_with_32_chars_or_more_kostromai44_2026';
  }
}

/**
 * Validates the cryptographic secrets configuration parameters on start.
 * Throws a descriptive error if keys are missing or lack sufficient entropy in production.
 */
export function validateSecrets(): void {
  const jwtSecret = process.env.JWT_SECRET;
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!jwtSecret) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing. A secure 32+ character key is required to secure JWT tokens.'
    );
  }
  if (jwtSecret.length < 32) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: JWT_SECRET is too short (current length: ${jwtSecret.length}). It must be at least 32 characters long to provide sufficient entropy.`
    );
  }

  if (!encryptionKey) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: ENCRYPTION_MASTER_KEY environment variable is missing. A secure 32+ character key is required for credential encryption.'
    );
  }
  if (encryptionKey.length < 32) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: ENCRYPTION_MASTER_KEY is too short (current length: ${encryptionKey.length}). It must be at least 32 characters long to provide sufficient entropy.`
    );
  }
}

export const SECRETS = {
  get JWT_SECRET(): string {
    validateSecrets();
    return process.env.JWT_SECRET!;
  },
  get ENCRYPTION_MASTER_KEY(): string {
    validateSecrets();
    return process.env.ENCRYPTION_MASTER_KEY!;
  }
};
