-- Migration: Add LLM Usage Cost Tracking Table
CREATE TABLE IF NOT EXISTS llm_usage (
  id VARCHAR(255) PRIMARY KEY,
  graph_id VARCHAR(255),
  run_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-workspace',
  created_at VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS llm_usage_graph_id_idx ON llm_usage(graph_id);
CREATE INDEX IF NOT EXISTS llm_usage_run_id_idx ON llm_usage(run_id);
CREATE INDEX IF NOT EXISTS llm_usage_created_at_idx ON llm_usage(created_at);
