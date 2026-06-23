import dotenv from 'dotenv';
dotenv.config();

import { SqliteDatabaseAdapter, PostgresDatabaseAdapter, IDatabaseAdapter } from '../db/adapters.js';
import winston from 'winston';

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

/**
 * Validates the database configuration parameters before initialization.
 * Throws a clear descriptive error on configuration mismatch or malformed credential strings.
 */
export function validateDatabaseConfig(dbType: string, databaseUrl: string): void {
  if (dbType === 'postgres') {
    if (!databaseUrl) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: DB_TYPE is set to "postgres" but DATABASE_URL is missing or empty. Please specify a valid connection string to prevent connection failures.'
      );
    }
    const isUrlWellFormed = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
    if (!isUrlWellFormed) {
      throw new Error(
        `CRITICAL CONFIGURATION ERROR: Malformed DATABASE_URL for Postgres backend. The connection string must begin with "postgres://" or "postgresql://". Received: "${databaseUrl.substring(0, Math.min(20, databaseUrl.length))}..."`
      );
    }
  }
}

/**
 * Robust polymorphic Database connection factory.
 * Resolves appropriate adapter according to DB_TYPE / DATABASE_URL environment parameters,
 * conducting strict config checks and returning high-resilience adapters.
 */
export function createDatabaseConnection(): IDatabaseAdapter {
  const envDbType = process.env.DB_TYPE || 'sqlite';
  const databaseUrl = process.env.DATABASE_URL || '';

  // Classify connection type cleanly
  const isPostgresScheme = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  const dbType = (isPostgresScheme || envDbType === 'postgres') ? 'postgres' : 'sqlite';

  logger.info(`Database connection factory resolving adapter type: "${dbType}" (requested env DB_TYPE: "${envDbType}").`);

  try {
    validateDatabaseConfig(dbType, databaseUrl);

    if (dbType === 'postgres') {
      logger.info('Initializing robust Postgres adapter context with connection pooling...');
      return new PostgresDatabaseAdapter(databaseUrl);
    } else {
      logger.info('Initializing SQLite adapter context with local database write streams...');
      return new SqliteDatabaseAdapter();
    }
  } catch (error: any) {
    logger.error(`DATABASE FACTORY INITIALIZATION CRITICAL BLOCKED: ${error.message}`);
    throw error;
  }
}
