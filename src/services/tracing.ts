import { trace, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { BasicTracerProvider, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { logger } from '../utils/logger.js';

let tracer: Tracer | null = null;
let isInitialized = false;

export function initTracing() {
  if (isInitialized) return { tracer };

  try {
    const provider = new BasicTracerProvider({
      spanProcessors: [
        new SimpleSpanProcessor(new ConsoleSpanExporter())
      ]
    });
    
    trace.setGlobalTracerProvider(provider);
    
    // Fetch tracer from global trace context register
    tracer = trace.getTracer('kostromai4444-core');
    isInitialized = true;
    logger.info('OpenTelemetry Tracing service initialized successfully with ConsoleSpanExporter');
  } catch (err: any) {
    logger.warn(`OpenTelemetry SDK initialization failed: ${err.message}. Falling back to clean mocked logger traces.`);
    isInitialized = true; // Still marked initialized so we don't try loop triggering
  }

  return { tracer };
}

export function getTracer(): Tracer | null {
  if (!isInitialized) {
    initTracing();
  }
  return tracer;
}

/**
 * Custom robust wrapper to trace any synchronous or asynchronous action.
 * Gracefully transparent: if OpenTelemetry API fails, executes the action normally without blocking.
 */
export async function traceSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const currentTracer = getTracer();
  
  if (!currentTracer) {
    // If telemetry API isn't registered or failed to initialize, run mock traces cleanly
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const dur = Date.now() - start;
      logger.info(`[Telemetry Native Fallback Trace] "${name}" finished after ${dur}ms`, attributes);
    }
  }

  const span = currentTracer.startSpan(name);
  
  // Set initial tracer contextual attributes safely
  Object.entries(attributes).forEach(([key, val]) => {
    if (val !== undefined) {
      span.setAttribute(key, val);
    }
  });

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error: any) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message || String(error)
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
