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

    this.db = drizzleSqlite(this.sqliteInstance, { schema: sqliteSchema });

    // Auto-bootstrap "default-workspace" workspace if table exists
    try {
      this.sqliteInstance.exec(`
        INSERT OR IGNORE INTO workspaces (id, name, created_at)
        VALUES ('default-workspace', 'Default Workspace', '${new Date().toISOString()}')
      `);
    } catch (e) {
      // Table workspaces might not exist yet during initial schema push/creation
    }
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
