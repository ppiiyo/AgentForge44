import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('viewer'), // 'admin' | 'editor' | 'viewer' | 'api_user'
  createdAt: text('created_at').notNull(),
  budget: integer('budget').notNull().default(1000000),
  usedTokens: integer('used_tokens').notNull().default(0),
});

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const memberships = sqliteTable('memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('viewer'), // 'owner' | 'editor' | 'viewer'
  createdAt: text('created_at').notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('user_id').notNull().default('anonymous'),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const graphs = sqliteTable('graphs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nodes: text('nodes').notNull(), // JSON string
  connections: text('connections').notNull(), // JSON string (or edges)
  version: integer('version').notNull().default(1),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(), // execution UUID
  graphId: text('graph_id').notNull(),
  graphName: text('graph_name').notNull(),
  status: text('status').notNull(), // 'success' | 'failed'
  totalTokens: integer('total_tokens').notNull().default(0),
  totalCostUsd: real('total_cost_usd').notNull().default(0),
  totalLatencyMs: integer('total_latency_ms').notNull().default(0),
  errorMessage: text('error_message'),
  nodeExecutions: text('node_executions').notNull(), // JSON array of NodeExecution
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  createdAt: text('created_at').notNull(),
  author: text('author').notNull(),
  snapshot: text('snapshot').notNull(), // JSON string
  commitMessage: text('commit_message').notNull(),
  diffSummary: text('diff_summary').notNull(),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
});

export const marketplaceItems = sqliteTable('marketplace_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'template' | 'node' | 'pipeline'
  data: text('data').notNull(), // JSON string representing the graph snapshot
  author: text('author').notNull(),
  downloads: integer('downloads').notNull().default(0),
  rating: real('rating').notNull().default(0),
  reviews: text('reviews').notNull().default('[]'), // JSON array of reviews
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  graphName: text('graph_name').notNull().default('anonymous_graph'),
  platform: text('platform').notNull(), // 'vercel' | 'railway' | 'fly' | 'docker'
  status: text('status').notNull(), // 'pending' | 'deploying' | 'success' | 'failed'
  url: text('url'),
  logs: text('logs'), // JSON string array
  config: text('config').notNull().default('{}'), // JSON object
  deployedBy: text('deployed_by'),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  scopes: text('scopes').notNull(), // JSON array of scopes like ['read', 'write', 'execute']
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text('id').primaryKey(), // the executionId / runId
  graphId: text('graph_id').notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  nodeOutputs: text('node_outputs').notNull().default('{}'), // JSON string of nodeOutputs
  completedNodes: text('completed_nodes').notNull().default('[]'), // JSON string array of completed nodes
  activatedNodes: text('activated_nodes').notNull().default('[]'), // JSON string array of activated nodes
  stepCount: integer('step_count').notNull().default(0),
  executedCount: text('executed_count').notNull().default('{}'), // JSON string of executedCount map
  iterationsCount: text('iterations_count').notNull().default('{}'), // JSON string of iterationsCount map
  logs: text('logs').notNull().default('[]'), // JSON string step logs
  variables: text('variables').notNull().default('{}'), // JSON string of variables
  error: text('error'),
  tenantId: text('tenant_id').notNull().default('default-workspace').references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
