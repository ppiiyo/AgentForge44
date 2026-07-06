import { EventEmitter } from 'events';
import { RedisClient } from '../infrastructure/cache/RedisClient.js';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Failures before opening (default: 5)
  resetTimeout: number;          // Ms before half-open (default: 30000)
  monitoringPeriod: number;      // Ms to track failures (default: 60000)
  name: string;                  // Circuit name for logging
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttempt: number | null = null;

  constructor(private options: CircuitBreakerOptions) {
    super();
    this.options = {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
      ...options
    };
  }

  async syncFromRedis(): Promise<void> {
    try {
      const redis = RedisClient.getInstance();
      const cached = await redis.getCircuitBreakerState(this.options.name);
      if (cached) {
        this.state = cached.state as any;
        this.failureCount = cached.failureCount;
        this.lastFailureTime = cached.lastFailureTime ?? null;
        this.nextAttempt = cached.nextRetryTime ?? null;
      }
    } catch (err) {
      // Degrade gracefully
    }
  }

  async syncToRedis(): Promise<void> {
    try {
      const redis = RedisClient.getInstance();
      await redis.setCircuitBreakerState(this.options.name, {
        state: this.state as any,
        failureCount: this.failureCount,
        lastFailureTime: this.lastFailureTime ?? undefined,
        nextRetryTime: this.nextAttempt ?? undefined
      });
    } catch (err) {
      // Degrade gracefully
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.syncFromRedis().catch(() => {});

    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= (this.nextAttempt || 0)) {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { state: this.state, name: this.options.name });
        await this.syncToRedis().catch(() => {});
      } else {
        const error = new Error(`Circuit breaker ${this.options.name} is OPEN`);
        this.emit('failure', { error, name: this.options.name });
        throw error;
      }
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(error as Error);
      throw error;
    }
  }

  private async onSuccess(): Promise<void> {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        await this.close();
      }
    } else {
      await this.reset();
    }
    await this.syncToRedis().catch(() => {});
  }

  private async onFailure(error: Error): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      await this.open();
    } else if (this.failureCount >= this.options.failureThreshold) {
      await this.open();
    }

    this.emit('failure', { error, name: this.options.name, failureCount: this.failureCount });
    await this.syncToRedis().catch(() => {});
  }

  private async open(): Promise<void> {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    this.emit('stateChange', { state: this.state, name: this.options.name });
    console.warn(`Circuit breaker ${this.options.name} OPENED`);
  }

  private async close(): Promise<void> {
    this.state = CircuitState.CLOSED;
    await this.reset();
    this.emit('stateChange', { state: this.state, name: this.options.name });
    console.log(`Circuit breaker ${this.options.name} CLOSED`);
  }

  private async reset(): Promise<void> {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.options.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      resetTimeout: this.options.resetTimeout,
      failureThreshold: this.options.failureThreshold
    };
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    // Standardize naming (e.g. "Gemini" from "Gemini (gemini-3.5-flash)")
    const cleanName = name.split(' ')[0];
    if (!this.breakers.has(cleanName)) {
      this.breakers.set(cleanName, new CircuitBreaker({
        name: cleanName,
        failureThreshold: options?.failureThreshold ?? 3, // Highly sensitive for demonstration/testing
        resetTimeout: options?.resetTimeout ?? 10000,     // 10s timeout to retry
        monitoringPeriod: options?.monitoringPeriod ?? 30000,
      }));
    }
    return this.breakers.get(cleanName)!;
  }

  getAllBreakers(): CircuitBreaker[] {
    // Ensure standard breakers are initialized
    this.getBreaker('Gemini');
    this.getBreaker('OpenAI');
    this.getBreaker('Anthropic');
    this.getBreaker('Ollama');
    return Array.from(this.breakers.values());
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
