import winston from 'winston';
import { IDatabaseAdapter } from '../db/adapters.js';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import * as sqliteSchema from '../db/schema.js';
import * as pgSchema from '../db/postgres-schema.js';
import { eq } from 'drizzle-orm';
import path from 'path';

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
 * Programmatically runs database migrations using versioned files.
 * SQLite migrations are sourced from ./drizzle/sqlite
 * PostgreSQL migrations are sourced from ./drizzle/postgres
 */
export async function runSchemaMigrations(adapter: IDatabaseAdapter): Promise<void> {
  logger.info(`Starting programmatic schema migrations for adapter type: "${adapter.type}"...`);

  // Verify connection health first
  const health = await adapter.healthCheck();
  if (!health.ok) {
    throw new Error(`Database connection health check failed. Migration aborted! Error: ${health.error}`);
  }

  logger.info('Database connection health check PASSED.');

  const db = adapter.db;

  try {
    if (adapter.type === 'sqlite') {
      const migrationsFolder = path.join(process.cwd(), 'drizzle/sqlite');
      logger.info(`Running SQLite versioned migrations from: ${migrationsFolder}`);
      try {
        await migrateSqlite(db, { migrationsFolder });
        logger.info('✅ Programmatic migrations executed successfully.');
      } catch (migError: any) {
        const isAlreadyExists = migError.message?.toLowerCase().includes('already exists');
        if (isAlreadyExists) {
          logger.info('ℹ️ Database tables are already initialized (tables already exist). Programmatic bootstrap migration bypassed safely.');
        } else {
          logger.warn(`[Migrator] Programmatic SQLite migrations warning: ${migError.message}. Proceeding to seed default workspace in case tables are already present.`);
        }
      }
    } else if (adapter.type === 'postgres') {
      const migrationsFolder = path.join(process.cwd(), 'drizzle/postgres');
      logger.info(`Running Postgres versioned migrations from: ${migrationsFolder}`);
      try {
        await migratePostgres(db, { migrationsFolder });
        logger.info('✅ Programmatic migrations executed successfully.');
      } catch (migError: any) {
        const isAlreadyExists = migError.message?.toLowerCase().includes('already exists');
        if (isAlreadyExists) {
          logger.info('ℹ️ Database tables are already initialized (tables already exist). Programmatic bootstrap migration bypassed safely.');
        } else {
          logger.warn(`[Migrator] Programmatic Postgres migrations warning: ${migError.message}. Proceeding to seed default workspace in case tables are already present.`);
        }
      }
    } else {
      throw new Error(`Unsupported database adapter type for migration routing: ${adapter.type}`);
    }

    // Seed the "default-workspace" to bootstrap existing/default accounts
    await seedDefaultWorkspace(adapter);

  } catch (error: any) {
    logger.error(`Failed to execute migrations: ${error.message}`);
    throw error;
  }
}

/**
 * Ensures the "default-workspace" workspace exists in the database.
 */
async function seedDefaultWorkspace(adapter: IDatabaseAdapter): Promise<void> {
  const db = adapter.db;
  const isPostgres = adapter.type === 'postgres';
  const workspaceTable = isPostgres ? pgSchema.workspaces : sqliteSchema.workspaces;

  try {
    logger.info('Ensuring "default-workspace" bootstrapped...');
    const existing = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, 'default-workspace'))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(workspaceTable).values({
        id: 'default-workspace',
        name: 'Default Workspace',
        createdAt: new Date().toISOString()
      });
      logger.info('Successfully seeded "default-workspace" in database.');
    } else {
      logger.info('"default-workspace" already exists.');
    }
  } catch (error: any) {
    logger.warn(`Non-fatal: Seeding of "default-workspace" skipped or failed: ${error.message}`);
  }
}
