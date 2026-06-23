import dotenv from 'dotenv';
dotenv.config();

import { SqliteDatabaseAdapter, PostgresDatabaseAdapter, IDatabaseAdapter } from './adapters.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './postgres-schema.js';
import { traceSpan } from '../services/tracing.js';

const databaseUrl = process.env.DATABASE_URL || '';
const dbType = (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))
  ? 'postgres'
  : (process.env.DB_TYPE || 'sqlite');

// Validate the presence of PostgreSQL credentials when DB_TYPE is set to 'postgres'
if (process.env.DB_TYPE === 'postgres' || dbType === 'postgres') {
  if (!databaseUrl) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: DATABASE_URL environment variable is required when DB_TYPE is set to "postgres" or a PostgreSQL connection is requested. Please define DATABASE_URL inside your environment configuration or .env file to prevent connection initialization failures.'
    );
  }
}

export let adapter: IDatabaseAdapter;

if (dbType === 'postgres') {
  adapter = new PostgresDatabaseAdapter(databaseUrl);
} else {
  adapter = new SqliteDatabaseAdapter();
}

export const db = adapter.db;

// Hook db.execute for automated SQL/Database query tracing
if (db && typeof db.execute === 'function') {
  const originalExecute = db.execute;
  db.execute = function(this: any, ...args: any[]) {
    const rawSql = args[0] && typeof args[0] === 'string' ? args[0] : (args[0]?.sql || 'db-query');
    return traceSpan('db_query', {
      dialect: dbType,
      query: rawSql.substring(0, 100) // Keep query attributes clean and bounded
    }, () => originalExecute.apply(this, args));
  };
}

// Polymorphic table mapping that transparently points to the active dialect structure
export const tables = {
  users: dbType === 'postgres' ? pgSchema.users : sqliteSchema.users,
  projects: dbType === 'postgres' ? pgSchema.projects : sqliteSchema.projects,
  graphs: dbType === 'postgres' ? pgSchema.graphs : sqliteSchema.graphs,
  metrics: dbType === 'postgres' ? pgSchema.metrics : sqliteSchema.metrics,
  versions: dbType === 'postgres' ? pgSchema.versions : sqliteSchema.versions,
  marketplaceItems: dbType === 'postgres' ? pgSchema.marketplaceItems : sqliteSchema.marketplaceItems,
  deployments: dbType === 'postgres' ? pgSchema.deployments : sqliteSchema.deployments,
  apiKeys: dbType === 'postgres' ? pgSchema.apiKeys : sqliteSchema.apiKeys,
};

// Export raw driver instance for legacy components
export const sqlite = adapter.type === 'sqlite' ? (adapter as SqliteDatabaseAdapter).sqliteInstance : undefined;
export const pg = adapter.type === 'postgres' ? (adapter as PostgresDatabaseAdapter).pgInstance : undefined;
export { sqliteSchema, pgSchema };
