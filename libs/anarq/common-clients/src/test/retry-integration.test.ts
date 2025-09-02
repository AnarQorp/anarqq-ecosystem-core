import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdempotentHttpClient } from '../http/IdempotentHttpClient.js';
import { IdempotencyManager } from '../idempotency/IdempotencyManager.js';
import { RetryMonitor } from '../monitoring/RetryMonitor.js';
import { RetryPolicyManager } from '../retry/RetryPolicyManager.js';
import { ClientFactory } from '../ClientFactory.js';
import { HttpClientConfig, QResponse, QError, ErrorCodes } from '../types/client.js';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Retry and Idempotency Integration', () => {
  let client: IdempotentHttpClient;
  let idempotencyManager: IdempotencyManager;
  let monitor: RetryMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    idempotencyManager = new IdempotencyManager({
      defaultTtl: 10000,
      maxRecords: 1000,
      cleanupInterval: 60000
    });

    monitor = new RetryMonitor();

    const config: HttpClientConfig = {
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      retryPolicy: RetryPolicyManager.STANDARD,
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringWindow: 5000,
        halfOpenMaxCalls: 2,
        fallbackStrategy: 'REJECT'
      }
    };

    client = new IdempotentHttpClient(config, idempotencyManager);
  });

  afterEach(() => {
    client.shutdown();
    monitor.shutdown();
  });

  describe('Successful Request Flow', () => {
    it('should handle successful request without retry', async () => {
      const mockResponse: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Request successful',
        data: { result: 'test' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(mockResponse))
      });

      const result = await client.post('/test', { data: 'test' });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache idempotent requests', async () => {
      const mockResponse: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Request successful',
        data: { result: 'test' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(mockResponse))
      });

      const idempotencyKey = 'test-key-123';
      
      // First request
      const result1 = await client.post('/test', { data: 'test' }, {
        'Idempotency-Key': idempotencyKey
      });

      // Second request with same key should return cached response
      const result2 = await client.post('/test', { data: 'test' }, {
        'Idempotency-Key': idempotencyKey
      });

      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const mockError = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve(JSON.stringify({
          status: 'error',
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        }))
      };

      const mockSuccess: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Request successful',
        data: { result: 'test' }
      };

      const mockSuccessResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(mockSuccess))
      };

      // First two calls fail, third succeeds
      (global.fetch as any)
        .mockResolvedValueOnce(mockError)
        .mockResolvedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await client.post('/test', { data: 'test' });

      expect(result).toEqual(mockSuccess);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockError = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(JSON.stringify({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data'
        }))
      };

      (global.fetch as any).mockResolvedValue(mockError);

      await expect(client.post('/test', { data: 'invalid' }))
        .rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should respect maximum retry attempts', async () => {
      const mockError = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve(JSON.stringify({
          status: 'error',
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable'
        }))
      };

      (global.fetch as any).mockResolvedValue(mockError);

      await expect(client.post('/test', { data: 'test' }))
        .rejects.toThrow();

      // Should be called maxAttempts times (3 for STANDARD policy)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should trip circuit breaker after threshold failures', async () => {
      const mockError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(JSON.stringify({
          status: 'error',
          code: 'SERVICE_UNAVAILABLE',
          message: 'Internal server error'
        }))
      };

      (global.fetch as any).mockResolvedValue(mockError);

      // Make enough requests to trip the circuit breaker
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          client.post('/test', { data: `test${i}` })
            .catch(error => error)
        );
      }

      const results = await Promise.all(requests);

      // Some requests should fail with circuit breaker error
      const circuitBreakerErrors = results.filter(
        result => result instanceof Error && 
        (result as QError).code === ErrorCodes.CIRCUIT_BREAKER_OPEN
      );

      expect(circuitBreakerErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency Key Conflicts', () => {
    it('should detect idempotency key conflicts', async () => {
      const idempotencyKey = 'conflict-test-key';

      const mockResponse: QResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Request successful',
        data: { result: 'test1' }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(mockResponse))
      });

      // First request
      await client.post('/test', { data: 'test1' }, {
        'Idempotency-Key': idempotencyKey
      });

      // Second request with same key but different body should fail
      await expect(
        client.post('/test', { data: 'test2' }, {
          'Idempotency-Key': idempotencyKey
        })
      ).rejects.toThrow('Idempotency key conflict');
    });
  });

  describe('ClientFactory Integration', () => {
    it('should create properly configured client', () => {
      const factoryClient = ClientFactory.createHttpClient({
        baseUrl: 'https://api.test.com',
        module: 'qwallet',
        criticality: 'HIGH',
        timeout: 10000
      });

      expect(factoryClient).toBeInstanceOf(IdempotentHttpClient);
      
      const retryConfig = factoryClient.getRetryConfig();
      expect(retryConfig).toBeDefined();
      
      const circuitBreakerState = factoryClient.getCircuitBreakerState();
      expect(circuitBreakerState).not.toBeUndefined();

      factoryClient.shutdown();
    });

    it('should create module-specific clients', () => {
      const qwalletClient = ClientFactory.createModuleClient(
        'qwallet',
        'https://qwallet.api.com'
      );

      const qindexClient = ClientFactory.createModuleClient(
        'qindex',
        'https://qindex.api.com'
      );

      // Different modules should have different retry policies
      const qwalletRetry = qwalletClient.getRetryConfig();
      const qindexRetry = qindexClient.getRetryConfig();

      expect(qwalletRetry).not.toEqual(qindexRetry);

      qwalletClient.shutdown();
      qindexClient.shutdown();
    });

    it('should provide global statistics', async () => {
      const client1 = ClientFactory.createHttpClient({
        baseUrl: 'https://api1.test.com',
        module: 'test1'
      });

      const client2 = ClientFactory.createHttpClient({
        baseUrl: 'https://api2.test.com',
        module: 'test2'
      });

      // Make some requests to generate stats
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify({
          status: 'ok',
          code: 'SUCCESS',
          message: 'OK'
        }))
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await client1.get('/test1');
      await client2.get('/test2');

      const retryStats = ClientFactory.getGlobalRetryStats();
      const idempotencyStats = ClientFactory.getGlobalIdempotencyStats();

      expect(retryStats).toBeDefined();
      expect(idempotencyStats).toBeDefined();

      client1.shutdown();
      client2.shutdown();
      ClientFactory.shutdown();
    });
  });

  describe('Timeout Handling', () => {
    it('should handle request timeouts', async () => {
      // Mock a timeout scenario
      (global.fetch as any).mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Request timeout');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        })
      );

      const shortTimeoutClient = new IdempotentHttpClient({
        baseUrl: 'https://api.test.com',
        timeout: 50, // Very short timeout
        retryPolicy: RetryPolicyManager.FAST
      });

      try {
        await expect(shortTimeoutClient.post('/test', { data: 'test' }))
          .rejects.toThrow();
      } finally {
        shortTimeoutClient.shutdown();
      }
    });
  });

  describe('Error Response Handling', () => {
    it('should handle non-JSON error responses', async () => {
      const mockError = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Internal Server Error')
      };

      (global.fetch as any).mockResolvedValue(mockError);

      await expect(client.post('/test', { data: 'test' }))
        .rejects.toThrow();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(client.post('/test', { data: 'test' }))
        .rejects.toThrow('Network error');
    });
  });
});