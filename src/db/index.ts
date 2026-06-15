import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'agentforge.db');

const sqlite = new Database(DB_PATH);

// Enable WAL-mode for sqlite for better concurrency performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
