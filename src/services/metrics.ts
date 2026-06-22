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
