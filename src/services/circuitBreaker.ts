import { EventEmitter } from 'events';

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

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= (this.nextAttempt || 0)) {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { state: this.state, name: this.options.name });
      } else {
        const error = new Error(`Circuit breaker ${this.options.name} is OPEN`);
        this.emit('failure', { error, name: this.options.name });
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        this.close();
      }
    } else {
      this.reset();
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.open();
    }

    this.emit('failure', { error, name: this.options.name, failureCount: this.failureCount });
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    this.emit('stateChange', { state: this.state, name: this.options.name });
    console.warn(`Circuit breaker ${this.options.name} OPENED`);
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.reset();
    this.emit('stateChange', { state: this.state, name: this.options.name });
    console.log(`Circuit breaker ${this.options.name} CLOSED`);
  }

  private reset(): void {
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
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
