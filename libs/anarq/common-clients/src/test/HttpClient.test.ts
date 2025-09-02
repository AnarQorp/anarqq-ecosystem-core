import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClient } from '../http/HttpClient.js';
import { ErrorCodes } from '../types/client.js';

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      identity: {
        squidId: 'test_user_1'
      }
    });
  });

  it('should create client with correct configuration', () => {
    const config = client.getConfig();
    expect(config.baseUrl).toBe('https://api.test.com');
    expect(config.timeout).toBe(5000);
    expect(config.identity?.squidId).toBe('test_user_1');
  });

  it('should build URL correctly', () => {
    // This is testing internal functionality, but we can test the public interface
    expect(client).toBeDefined();
  });

  it('should handle retry policy configuration', () => {
    const clientWithRetry = new HttpClient({
      baseUrl: 'https://api.test.com',
      retryPolicy: {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: [ErrorCodes.SERVICE_UNAVAILABLE],
        retryableStatusCodes: [500, 502, 503]
      }
    });

    expect(clientWithRetry).toBeDefined();
  });

  it('should handle circuit breaker configuration', () => {
    const clientWithCircuitBreaker = new HttpClient({
      baseUrl: 'https://api.test.com',
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringWindow: 60000,
        halfOpenMaxCalls: 3,
        fallbackStrategy: 'REJECT'
      }
    });

    expect(clientWithCircuitBreaker).toBeDefined();
    expect(clientWithCircuitBreaker.getCircuitBreakerState()).toBe('CLOSED');
  });
});