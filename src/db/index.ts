import dotenv from 'dotenv';
dotenv.config();

import { createDatabaseConnection } from '../api/db.js';
import { SqliteDatabaseAdapter, PostgresDatabaseAdapter } from './adapters.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './postgres-schema.js';
import { traceSpan } from '../services/tracing.js';

// Resolve adapter cleanly using the centralized database factory
export const adapter = createDatabaseConnection();
const dbType = adapter.type;

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
  workspaces: dbType === 'postgres' ? pgSchema.workspaces : sqliteSchema.workspaces,
  memberships: dbType === 'postgres' ? pgSchema.memberships : sqliteSchema.memberships,
  projects: dbType === 'postgres' ? pgSchema.projects : sqliteSchema.projects,
  graphs: dbType === 'postgres' ? pgSchema.graphs : sqliteSchema.graphs,
  metrics: dbType === 'postgres' ? pgSchema.metrics : sqliteSchema.metrics,
  versions: dbType === 'postgres' ? pgSchema.versions : sqliteSchema.versions,
  marketplaceItems: dbType === 'postgres' ? pgSchema.marketplaceItems : sqliteSchema.marketplaceItems,
  deployments: dbType === 'postgres' ? pgSchema.deployments : sqliteSchema.deployments,
  apiKeys: dbType === 'postgres' ? pgSchema.apiKeys : sqliteSchema.apiKeys,
  pipelineRuns: dbType === 'postgres' ? pgSchema.pipelineRuns : sqliteSchema.pipelineRuns,
};

// Export raw driver instance for legacy components
export const sqlite = adapter.type === 'sqlite' ? (adapter as SqliteDatabaseAdapter).sqliteInstance : undefined;
export const pg = adapter.type === 'postgres' ? (adapter as PostgresDatabaseAdapter).pgInstance : undefined;
export { sqliteSchema, pgSchema };
