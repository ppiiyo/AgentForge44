import { logger } from './logger.js';

export interface RetryOptions {
  retries?: number;        // Max retry attempts (default: 3)
  delay?: number;          // Initial sleep time in ms (default: 1000)
  factor?: number;         // Multiplier factor (default: 2)
  maxDelay?: number;       // Maximum cap on backoff logic (default: 10000)
  shouldRetry?: (error: any) => boolean; // Optional predicate to selectively retry
}

/**
 * Executes a promise-returning function with exponential backoff retry.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    factor = 2,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;

  let attempt = 0;
  let currentDelay = delay;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const decideRetry = shouldRetry(error);
      
      if (attempt > retries || !decideRetry) {
        logger.error(`Retry failed after ${attempt} attempts. Propagating error:`, { error: error.message || String(error) });
        throw error;
      }

      // Calculate exponential sleep time with slight randomized jitter (+/- 10%)
      const jitter = (Math.random() - 0.5) * 0.2 * currentDelay;
      const sleepTime = Math.min(maxDelay, currentDelay + jitter);
      
      logger.warn(`Attempt ${attempt} failed: ${error.message || String(error)}. Retrying in ${Math.round(sleepTime)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, sleepTime));
      
      currentDelay *= factor;
    }
  }
}
