import { traceSpan } from '../../services/tracing.js';
import { logger } from '../../utils/logger.js';

export class TelemetryService {
  private startTime: number;
  private metrics: Record<string, any> = {};

  constructor() {
    this.startTime = Date.now();
  }

  startSpan(name: string, attributes: Record<string, any> = {}) {
    this.metrics[name] = {
      startTime: Date.now(),
      attributes,
    };
    return {
      getMetrics: () => this.getMetrics(),
      recordError: (error: any) => {
        logger.error(`[Telemetry] Error in span "${name}":`, error);
        this.metrics[name].error = error.message || String(error);
      },
      end: () => {
        this.metrics[name].durationMs = Date.now() - this.metrics[name].startTime;
      },
    };
  }

  async traceNode<T>(node: any, fn: () => Promise<T>): Promise<T> {
    const attributes = {
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title,
    };
    return traceSpan(`node.execute.${node.type}`, attributes, fn);
  }

  getMetrics() {
    return {
      totalDurationMs: Date.now() - this.startTime,
      spans: this.metrics,
    };
  }
}
