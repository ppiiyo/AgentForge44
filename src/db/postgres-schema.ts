import { pgTable, text, integer, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('viewer'),
  createdAt: text('created_at').notNull(),
  budget: integer('budget').notNull().default(1000000),
  usedTokens: integer('used_tokens').notNull().default(0),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('user_id').notNull().default('anonymous'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const graphs = pgTable('graphs', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  name: text('name').notNull(),
  nodes: text('nodes').notNull(), // JSON string
  connections: text('connections').notNull(), // JSON string
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const metrics = pgTable('metrics', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  graphName: text('graph_name').notNull(),
  status: text('status').notNull(),
  totalTokens: integer('total_tokens').notNull().default(0),
  totalCostUsd: doublePrecision('total_cost_usd').notNull().default(0),
  totalLatencyMs: integer('total_latency_ms').notNull().default(0),
  errorMessage: text('error_message'),
  nodeExecutions: text('node_executions').notNull(), // JSON array
  createdAt: text('created_at').notNull(),
});

export const versions = pgTable('versions', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  createdAt: text('created_at').notNull(),
  author: text('author').notNull(),
  snapshot: text('snapshot').notNull(), // JSON string
  commitMessage: text('commit_message').notNull(),
  diffSummary: text('diff_summary').notNull(),
});

export const marketplaceItems = pgTable('marketplace_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  data: text('data').notNull(),
  author: text('author').notNull(),
  downloads: integer('downloads').notNull().default(0),
  rating: doublePrecision('rating').notNull().default(0),
  reviews: text('reviews').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
});

export const deployments = pgTable('deployments', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  graphName: text('graph_name').notNull().default('anonymous_graph'),
  platform: text('platform').notNull(),
  status: text('status').notNull(),
  url: text('url'),
  logs: text('logs'),
  config: text('config').notNull().default('{}'),
  deployedBy: text('deployed_by'),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  scopes: text('scopes').notNull(), // JSON stringified array of scopes
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});
