import dotenv from 'dotenv';
dotenv.config();

import { createDatabaseConnection } from '../api/db.js';
import { SqliteDatabaseAdapter, PostgresDatabaseAdapter } from './adapters.js';
import * as sqliteSchema from './schema.js';
import * as pgSchema from './postgres-schema.js';
import { traceSpan } from '../services/tracing.js';
import { chaosEngine } from '../services/chaosEngine.js';
import { cache, computeHash } from '../services/cache.js';

// Resolve adapter cleanly using the centralized database factory
export const adapter = createDatabaseConnection();
const dbType = adapter.type;

const rawDb = adapter.db;

async function executeWithCaching(target: any, originalThen: any, onfulfilled: any, onrejected: any): Promise<any> {
  try {
    await chaosEngine.simulateDbAccess();

    let isSelect = false;
    let sqlObj: any = null;
    try {
      if (target && typeof target.toSQL === 'function') {
        sqlObj = target.toSQL();
        const sqlStr = (sqlObj.sql || '').trim().toUpperCase();
        isSelect = sqlStr.startsWith('SELECT');
      }
    } catch (e) {
      // Ignore errors from toSQL
    }

    if (isSelect && sqlObj) {
      const queryKey = `db_query:${computeHash(JSON.stringify(sqlObj))}`;
      const cached = await cache.get(queryKey);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (onfulfilled) return onfulfilled(parsed);
        return parsed;
      }

      // Run actual query
      const result = await originalThen.call(target);
      await cache.set(queryKey, JSON.stringify(result), 10); // Cache for 10 seconds

      if (onfulfilled) return onfulfilled(result);
      return result;
    }

    if (sqlObj) {
      const sqlStr = (sqlObj.sql || '').trim().toUpperCase();
      if (sqlStr.startsWith('INSERT') || sqlStr.startsWith('UPDATE') || sqlStr.startsWith('DELETE')) {
        cache.clearLocalCache();
      }
    }

    return originalThen.call(target, onfulfilled, onrejected);
  } catch (err) {
    if (onrejected) return onrejected(err);
    throw err;
  }
}

function wrapQueryBuilder(qb: any): any {
  if (!qb || typeof qb !== 'object') return qb;
  return new Proxy(qb, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (prop === 'then' && typeof val === 'function') {
        return function(onfulfilled: any, onrejected: any) {
          return executeWithCaching(target, val, onfulfilled, onrejected);
        };
      }
      if (typeof val === 'function') {
        return function(this: any, ...args: any[]) {
          const res = val.apply(this, args);
          if (res && typeof res === 'object') {
            return wrapQueryBuilder(res);
          }
          return res;
        };
      }
      return val;
    }
  });
}

// Create a wrapper for Drizzle database instance to support Chaos Engineering and query caching
export const db = new Proxy(rawDb, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function' && ['select', 'insert', 'update', 'delete', 'execute', 'selectDistinct'].includes(prop as string)) {
      return function(this: any, ...args: any[]) {
        if (chaosEngine.getConfig().dbFailureActive) {
          throw new Error('ChaosEngine: Simulated database connection outage.');
        }

        const queryBuilder = value.apply(this, args);

        if (queryBuilder && typeof queryBuilder.then === 'function') {
          const originalThen = queryBuilder.then;
          queryBuilder.then = function(onfulfilled: any, onrejected: any) {
            return executeWithCaching(queryBuilder, originalThen, onfulfilled, onrejected);
          };
          return queryBuilder;
        } else if (queryBuilder && typeof queryBuilder === 'object') {
          return wrapQueryBuilder(queryBuilder);
        }

        return queryBuilder;
      };
    }
    return value;
  }
});

// Hook rawDb.execute for automated SQL/Database query tracing
if (rawDb && typeof rawDb.execute === 'function') {
  const originalExecute = rawDb.execute;
  rawDb.execute = function(this: any, ...args: any[]) {
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
