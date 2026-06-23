import winston from 'winston';
import { IDatabaseAdapter } from '../db/adapters.js';

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
 * Ensures the target PostgreSQL database structure contains all required enterprise schemas and table spaces.
 */
async function initializePostgresSchema(adapter: IDatabaseAdapter): Promise<void> {
  const sql = adapter.pgInstance;
  if (!sql) {
    throw new Error('Postgres instance not found on selected adapter context.');
  }

  logger.info('Running Postgres schema checks and table initializations...');

  try {
    // 1. Create table users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at TEXT NOT NULL,
        budget INTEGER NOT NULL DEFAULT 1000000,
        used_tokens INTEGER NOT NULL DEFAULT 0
      );
    `;

    // 2. Create table projects
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    // 3. Create table graphs
    await sql`
      CREATE TABLE IF NOT EXISTS graphs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        nodes TEXT NOT NULL,
        connections TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
    `;

    // 4. Create table metrics
    await sql`
      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        graph_name TEXT NOT NULL,
        status TEXT NOT NULL,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
        total_latency_ms INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        node_executions TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    // 5. Create table versions
    await sql`
      CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        author TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        commit_message TEXT NOT NULL,
        diff_summary TEXT NOT NULL
      );
    `;

    // 6. Create table marketplace_items
    await sql`
      CREATE TABLE IF NOT EXISTS marketplace_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        author TEXT NOT NULL,
        downloads INTEGER NOT NULL DEFAULT 0,
        rating DOUBLE PRECISION NOT NULL DEFAULT 0,
        reviews TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
    `;

    // 7. Create table deployments
    await sql`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        graph_name TEXT NOT NULL DEFAULT 'anonymous_graph',
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        url TEXT,
        logs TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        deployed_by TEXT,
        created_at TEXT NOT NULL
      );
    `;

    // 8. Create table api_keys
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        scopes TEXT NOT NULL,
        last_used_at TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );
    `;

    logger.info('✅ Postgres schema validation and table deployment successfully finished!');
  } catch (error: any) {
    logger.error(`Failed to execute auto-migrations on PostgreSQL database instance: ${error.message}`);
    throw error;
  }
}

/**
 * Migration master utility runner.
 * Connects, tests health, and ensures the table schemas exist.
 */
export async function runSchemaMigrations(adapter: IDatabaseAdapter): Promise<void> {
  logger.info(`Starting dynamic schema migration audit for adapter type: "${adapter.type}"...`);

  // Verify connection health first
  const health = await adapter.healthCheck();
  if (!health.ok) {
    throw new Error(`Database connection health check failed. Migration aborted! Error: ${health.error}`);
  }

  logger.info('Database health check PASSED.');

  if (adapter.type === 'postgres') {
    await initializePostgresSchema(adapter);
  } else {
    logger.info('SQLite table layouts are automatically verified and managed inside its native SQLite adapter initialization. No further migration steps necessary.');
  }

  logger.info('🎉 Database table initialization fully sync and healthy.');
}
