import { describe, it, expect } from 'vitest';
import { CircuitBreaker, CircuitState } from './circuitBreaker.js';

describe('CircuitBreaker State Transitions', () => {
  it('should start in CLOSED state and execute tasks successfully', async () => {
    const cb = new CircuitBreaker({
      name: 'test-cb',
      failureThreshold: 3,
      resetTimeout: 50,
      monitoringPeriod: 60000
    });

    expect(cb.getState()).toBe(CircuitState.CLOSED);

    const result = await cb.execute(async () => 'success');
    expect(result).toBe('success');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition CLOSED -> OPEN when failure threshold is reached', async () => {
    const cb = new CircuitBreaker({
      name: 'test-cb',
      failureThreshold: 2,
      resetTimeout: 50,
      monitoringPeriod: 60000
    });

    let stateChanges: string[] = [];
    cb.on('stateChange', ({ state }) => {
      stateChanges.push(state);
    });

    // First failure
    await expect(cb.execute(async () => {
      throw new Error('failed-1');
    })).rejects.toThrow('failed-1');
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    // Second failure - reaches threshold (2)
    await expect(cb.execute(async () => {
      throw new Error('failed-2');
    })).rejects.toThrow('failed-2');
    
    expect(cb.getState()).toBe(CircuitState.OPEN);
    expect(stateChanges).toContain(CircuitState.OPEN);

    // Any execution during OPEN state should reject with OPEN error
    await expect(cb.execute(async () => 'should not run')).rejects.toThrow('Circuit breaker test-cb is OPEN');
  });

  it('should transition OPEN -> HALF_OPEN -> CLOSED on successful recovery', async () => {
    const cb = new CircuitBreaker({
      name: 'test-cb',
      failureThreshold: 2,
      resetTimeout: 50,
      monitoringPeriod: 60000
    });

    // Force OPEN state
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch (_err) {}
    }
    expect(cb.getState()).toBe(CircuitState.OPEN);

    // Wait for resetTimeout to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next request should transition to HALF_OPEN
    const result = await cb.execute(async () => 'recovered-1');
    expect(result).toBe('recovered-1');
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    // Need 2 more successes to close circuit (requires 3 consecutive successes in HALF_OPEN)
    await cb.execute(async () => 'recovered-2');
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    await cb.execute(async () => 'recovered-3');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition OPEN -> HALF_OPEN -> OPEN on failure in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({
      name: 'test-cb',
      failureThreshold: 2,
      resetTimeout: 50,
      monitoringPeriod: 60000
    });

    // Force OPEN State
    for (let i = 0; i < 2; i++) {
       try {
         await cb.execute(async () => {
           throw new Error('fail');
         });
       } catch (_err) {}
    }
    expect(cb.getState()).toBe(CircuitState.OPEN);

    // Wait for resetTimeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next request successfully triggers HALF_OPEN
    await cb.execute(async () => 'ok');
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    // Failure in HALF_OPEN should immediately reopen the circuit
    await expect(cb.execute(async () => {
      throw new Error('half-open-fail');
    })).rejects.toThrow('half-open-fail');

    expect(cb.getState()).toBe(CircuitState.OPEN);
  });
});
