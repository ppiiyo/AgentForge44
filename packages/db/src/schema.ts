import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Workspaces or graph configurations
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  nodesJson: text('nodes_json').notNull(),
  connectionsJson: text('connections_json').notNull(),
  updatedAt: integer('updated_at').notNull()
});

// Conversational and execution metrics history logs
export const executionLogs = sqliteTable('execution_logs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  traceId: text('trace_id').notNull(),
  nodeId: text('node_id').notNull(),
  nodeTitle: text('node_title').notNull(),
  status: text('status').notNull(),
  inputData: text('input_data'),
  outputData: text('output_data'),
  latencyMs: integer('latency_ms'),
  timestamp: integer('timestamp').notNull()
});

// Step 3 - Metrics Analytics Execution Log Table
export const metricsExecutionLogs = sqliteTable('metrics_execution_logs', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  graphName: text('graph_name').notNull(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at').notNull(),
  status: text('status').notNull(), // success or failed
  totalTokens: integer('total_tokens').notNull(),
  totalCostUsd: real('total_cost_usd').notNull(),
  totalLatencyMs: integer('total_latency_ms').notNull(),
  errorMessage: text('error_message')
});

// Step 3 - Metrics Analytics Node Log Table
export const nodeExecutions = sqliteTable('node_executions', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull(),
  nodeId: text('node_id').notNull(),
  nodeType: text('node_type').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  costUsd: real('cost_usd').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  inputPreview: text('input_preview').notNull(),
  outputPreview: text('output_preview').notNull()
});

// Step 4 - Graph Versions Git-like Table
export const graphVersions = sqliteTable('graph_versions', {
  id: text('id').primaryKey(),
  graphId: text('graph_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  createdAt: text('created_at').notNull(),
  author: text('author').notNull(),
  snapshot: text('snapshot').notNull(), // Full state JSON
  commitMessage: text('commit_message').notNull(),
  diffSummary: text('diff_summary').notNull()
});

// Short term slider memories table
export const shortTermMessages = sqliteTable('short_term_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  timestamp: integer('timestamp').notNull()
});

// Long term Vector coordinates storage
export const longTermEmbeddings = sqliteTable('long_term_embeddings', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  embeddingArray: text('embedding_array').notNull(), // Comma-separated coordinates
  metadataJson: text('metadata_json'),
  timestamp: integer('timestamp').notNull()
});

