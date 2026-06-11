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
