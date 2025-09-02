import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker/CircuitBreaker.js';
import { CircuitBreakerState, ErrorCodes } from '../types/client.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringWindow: 5000,
      halfOpenMaxCalls: 2,
      fallbackStrategy: 'REJECT'
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });

  it('should execute successful operations', async () => {
    const result = await circuitBreaker.execute(async () => {
      return 'success';
    });

    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should open circuit after failure threshold', async () => {
    const failingOperation = async () => {
      throw new Error('Operation failed');
    };

    // Execute failing operations to reach threshold
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    expect(circuitBreaker.getFailureCount()).toBe(3);
  });

  it('should throw circuit breaker error when open', async () => {
    // Force circuit to open
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Fail');
        });
      } catch (error) {
        // Expected
      }
    }

    // Now it should be open and reject immediately
    await expect(
      circuitBreaker.execute(async () => 'should not execute')
    ).rejects.toThrow('Circuit breaker is open');
  });

  it('should reset circuit breaker', () => {
    // Force some failures
    circuitBreaker['failureCount'] = 5;
    circuitBreaker['state'] = CircuitBreakerState.OPEN;

    circuitBreaker.reset();

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
});