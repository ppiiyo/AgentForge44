import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import path from 'path';

import * as sqliteSchema from './schema.js';
import * as pgSchema from './postgres-schema.js';

export interface IDatabaseAdapter {
  type: 'sqlite' | 'postgres';
  db: any;
  sqliteInstance?: Database.Database;
  pgInstance?: postgres.Sql;
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
  close(): Promise<void>;
}

export class SqliteDatabaseAdapter implements IDatabaseAdapter {
  type = 'sqlite' as const;
  db: any;
  sqliteInstance: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'agentforge.db');
    this.sqliteInstance = new Database(dbPath, { timeout: 10000 });
    
    // WAL mode
    this.sqliteInstance.pragma('journal_mode = WAL');
    this.sqliteInstance.pragma('busy_timeout = 5000');
    this.sqliteInstance.pragma('foreign_keys = ON');

    // Automatically initialize schema if tables don't exist
    this.sqliteInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at TEXT NOT NULL,
        budget INTEGER NOT NULL DEFAULT 1000000,
        used_tokens INTEGER NOT NULL DEFAULT 0
      );

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS graphs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        nodes TEXT NOT NULL,
        connections TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        graph_name TEXT NOT NULL,
        status TEXT NOT NULL,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        total_cost_usd REAL NOT NULL DEFAULT 0,
        total_latency_ms INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        node_executions TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS marketplace_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        author TEXT NOT NULL,
        downloads INTEGER NOT NULL DEFAULT 0,
        rating REAL NOT NULL DEFAULT 0,
        reviews TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        scopes TEXT NOT NULL,
        last_used_at TEXT,
        expires_at TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_unique ON api_keys (key_hash);
    `);

    this.db = drizzleSqlite(this.sqliteInstance, { schema: sqliteSchema });
  }

  async healthCheck() {
    try {
      this.sqliteInstance.prepare('SELECT 1').get();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  async close() {
    this.sqliteInstance.close();
  }
}

export class PostgresDatabaseAdapter implements IDatabaseAdapter {
  type = 'postgres' as const;
  db: any;
  pgInstance: postgres.Sql;

  constructor(connectionString: string) {
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for DB_TYPE=postgres');
    }
    
    // Connection pooling setup: max 20, connection timeout 5s, idle timeout 30s
    this.pgInstance = postgres(connectionString, {
      max: 20,
      connect_timeout: 5,
      idle_timeout: 30,
    });

    this.db = drizzlePostgres(this.pgInstance, { schema: pgSchema });
  }

  async healthCheck() {
    try {
      await this.pgInstance`SELECT 1`;
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  async close() {
    await this.pgInstance.end();
  }
}
