import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { runSchemaMigrations } from '../api/migrate.js';
import { adapter } from './index.js';

/**
 * Runs schema migrations with a PostgreSQL advisory lock when running under Postgres.
 * Under SQLite, runs standard migrations sequentially.
 */
export async function runMigrationsWithLock(dbAdapter = adapter): Promise<void> {
  if (dbAdapter.type === 'postgres') {
    const lockId = 424242; // Unique advisory lock ID for KostromAi44
    logger.info(`🔒 Acquiring PostgreSQL advisory lock ${lockId}...`);
    try {
      await dbAdapter.db.execute(sql`SELECT pg_advisory_lock(${lockId})`);
      logger.info('✅ Advisory lock acquired, running schema migrations...');
      await runSchemaMigrations(dbAdapter);
      logger.info('✅ Schema migrations complete');
    } catch (error: any) {
      logger.error('❌ Migration with advisory lock failed:', { error: error.message || error });
      throw error;
    } finally {
      try {
        logger.info(`🔓 Releasing advisory lock ${lockId}...`);
        await dbAdapter.db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
      } catch (unlockErr: any) {
        logger.warn(`Failed to release advisory lock ${lockId}:`, unlockErr.message || unlockErr);
      }
    }
  } else {
    logger.info('📦 Running schema migrations for non-postgres database...');
    await runSchemaMigrations(dbAdapter);
  }
}
