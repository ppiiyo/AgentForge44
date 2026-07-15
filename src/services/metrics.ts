import client from 'prom-client';

// Create a custom registry
export const register = new client.Registry();

// Enable standard default metrics collections (CPU, Memory, GC, EventLoop, etc.)
client.collectDefaultMetrics({ register });

// 1. HTTP Request Metrics
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

// 2. LLM Call Metrics
export const llmCallCounter = new client.Counter({
  name: 'llm_calls_total',
  help: 'Total number of LLM provider calls made',
  labelNames: ['provider', 'model', 'status']
});

export const llmCallDuration = new client.Histogram({
  name: 'llm_call_duration_seconds',
  help: 'Duration of LLM provider calls in seconds',
  labelNames: ['provider', 'model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60]
});

// Register custom metrics in the global registry
register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
register.registerMetric(llmCallCounter);
register.registerMetric(llmCallDuration);

// 3. Sandbox Memory Metrics
export const sandboxMemoryGauge = new client.Gauge({
  name: 'sandbox_memory_bytes',
  help: 'Memory used by code execution sandboxes in bytes',
  labelNames: ['isolation_level', 'status']
});
register.registerMetric(sandboxMemoryGauge);

// 4. Pipeline Execution Metrics
export const pipelineExecutionsCounter = new client.Counter({
  name: 'pipeline_executions_total',
  help: 'Total number of pipeline executions',
  labelNames: ['status']
});
register.registerMetric(pipelineExecutionsCounter);

export const pipelineExecutionDuration = new client.Histogram({
  name: 'pipeline_execution_duration_seconds',
  help: 'Duration of pipeline executions in seconds',
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300]
});
register.registerMetric(pipelineExecutionDuration);

// 5. Node Execution Metrics
export const pipelineNodeExecutionDuration = new client.Histogram({
  name: 'pipeline_node_execution_duration_seconds',
  help: 'Duration of individual pipeline node executions in seconds',
  labelNames: ['node_type', 'node_id', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});
register.registerMetric(pipelineNodeExecutionDuration);

// 6. Circuit Breaker State Gauge
export const circuitBreakerStateGauge = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=Closed, 1=Half-Open, 2=Open)',
  labelNames: ['breaker_name']
});
register.registerMetric(circuitBreakerStateGauge);

// 7. LLM Token & Cost Tracking Metrics
export const llmTokenCounter = new client.Counter({
  name: 'llm_tokens_total',
  help: 'Total number of LLM tokens processed',
  labelNames: ['provider', 'model', 'type'] // type can be 'prompt' or 'completion'
});
register.registerMetric(llmTokenCounter);

export const llmCostCounter = new client.Counter({
  name: 'llm_cost_usd_total',
  help: 'Estimated LLM consumption cost in USD',
  labelNames: ['provider', 'model']
});
register.registerMetric(llmCostCounter);

// 8. Database Performance Metrics
export const databaseQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database query execution in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2]
});
register.registerMetric(databaseQueryDuration);

// 9. BullMQ Queue Performance Metrics
export const queueJobsGauge = new client.Gauge({
  name: 'bullmq_queue_jobs_total',
  help: 'Total number of jobs in BullMQ queues by status',
  labelNames: ['queue_name', 'status'] // status: waiting, active, completed, failed
});
register.registerMetric(queueJobsGauge);

export const queueJobDuration = new client.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Processing duration of BullMQ jobs in seconds',
  labelNames: ['queue_name', 'job_name', 'status'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60]
});
register.registerMetric(queueJobDuration);

