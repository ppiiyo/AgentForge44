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
