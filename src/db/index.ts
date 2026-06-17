import { SqliteDatabaseAdapter, PostgresDatabaseAdapter, IDatabaseAdapter } from './adapters.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './postgres-schema.js';

const dbType = process.env.DB_TYPE || 'sqlite';
const databaseUrl = process.env.DATABASE_URL || '';

export let adapter: IDatabaseAdapter;

if (dbType === 'postgres') {
  adapter = new PostgresDatabaseAdapter(databaseUrl);
} else {
  adapter = new SqliteDatabaseAdapter();
}

export const db = adapter.db;

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
