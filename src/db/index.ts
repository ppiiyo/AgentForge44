import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'agentforge.db');

const sqlite = new Database(DB_PATH);

// Enable WAL-mode for sqlite for better concurrency performance and set busy_timeout
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');

// Automatically initialize schema if tables don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TEXT NOT NULL
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
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_unique ON api_keys (key_hash);
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };

