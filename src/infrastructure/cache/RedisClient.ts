import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';

export enum CircuitStateEnum {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerState {
  state: CircuitStateEnum;
  failureCount: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
}

export class RedisClient {
  private client: Redis | null = null;
  private static instance: RedisClient;
  private isConnected = false;

  private constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        showFriendlyErrorStack: true,
        retryStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnect failed after 10 attempts');
            return null; // Halt retrying
          }
          return Math.min(retries * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis error', { error: err.message });
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected');
      });
    } catch (err: any) {
      logger.error('Redis initialization failed', { error: err.message });
    }
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (this.client && !this.isConnected) {
      await this.client.connect().catch(() => {});
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async ping(): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.ping();
  }

  // Circuit Breaker State
  async getCircuitBreakerState(serviceName: string): Promise<CircuitBreakerState | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.hgetall(`circuit:${serviceName}`);
      if (Object.keys(data).length > 0) {
        return {
          state: (data.state as CircuitStateEnum) || CircuitStateEnum.CLOSED,
          failureCount: parseInt(data.failureCount || '0', 10),
          lastFailureTime: data.lastFailureTime ? parseInt(data.lastFailureTime, 10) : undefined,
          nextRetryTime: data.nextRetryTime ? parseInt(data.nextRetryTime, 10) : undefined
        };
      }
    } catch (err: any) {
      logger.warn(`Failed to get circuit state from Redis: ${err.message}`);
    }
    return null;
  }

  async setCircuitBreakerState(serviceName: string, state: CircuitBreakerState): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const key = `circuit:${serviceName}`;
      await this.client.hset(key, {
        state: state.state,
        failureCount: state.failureCount.toString(),
        lastFailureTime: state.lastFailureTime?.toString() || '',
        nextRetryTime: state.nextRetryTime?.toString() || ''
      });
      await this.client.expire(key, 3600); // 1 hour TTL
    } catch (err: any) {
      logger.warn(`Failed to set circuit state in Redis: ${err.message}`);
    }
  }

  // Pipeline Execution State
  async savePipelineState(executionId: string, state: any): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.set(
        `pipeline:${executionId}`,
        JSON.stringify(state),
        'EX',
        86400 // 24 hours TTL
      );
    } catch (err: any) {
      logger.warn(`Failed to save pipeline state to Redis: ${err.message}`);
    }
  }

  async getPipelineState(executionId: string): Promise<any | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(`pipeline:${executionId}`);
      return data ? JSON.parse(data) : null;
    } catch (err: any) {
      logger.warn(`Failed to get pipeline state from Redis: ${err.message}`);
      return null;
    }
  }
}
