/**
 * Comprehensive Error Handling Tests
 * Tests graceful degradation, retry mechanisms with exponential backoff,
 * detailed error logging and recovery procedures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ComprehensiveErrorHandlingService from '../services/ComprehensiveErrorHandlingService.mjs';
import fs from 'fs/promises';

describe('Comprehensive Error Handling Service', () => {
  let errorHandlingService;

  beforeEach(async () => {
    errorHandlingService = new ComprehensiveErrorHandlingService({
      maxRetries: 3,
      baseRetryDelay: 100, // Shorter delays for tests
      maxRetryDelay: 1000,
      circuitBreakerThreshold: 3,
      failureBudgetThreshold: 0.5, // 50% for easier testing
      artifactsPath: 'test-artifacts/chaos'
    });
  });

  afterEach(async () => {
    if (errorHandlingService) {
      await errorHandlingService.cleanup();
    }
  });

  describe('Retry Mechanisms with Exponential Backoff', () => {
    it('should retry retryable operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Temporary failure');
          error.code = 'TEMPORARY_FAILURE';
          throw error;
        }
        return 'success';
      };

      const result = await errorHandlingService.executeWithErrorHandling('test.operation', operation);

      expect(result.status).toBe('completed');
      expect(result.result).toBe('success');
      expect(result.attempts.length).toBe(3);
      expect(attempts).toBe(3);
    });

    it('should not retry fatal errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        const error = new Error('Authentication failed');
        error.code = 'AUTHENTICATION_FAILED';
        throw error;
      };

      await expect(errorHandlingService.executeWithErrorHandling('test.operation', operation))
        .rejects.toThrow('Authentication failed');

      expect(attempts).toBe(1);
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(errorHandlingService.calculateRetryDelay(i));
      }

      // Each delay should be larger than the previous (with some jitter tolerance)
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1] * 0.8); // Allow for jitter
      }

      // Should not exceed max delay
      expect(Math.max(...delays)).toBeLessThanOrEqual(errorHandlingService.config.maxRetryDelay);
    });

    it('should respect maximum retry attempts', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        const error = new Error('Always fails');
        error.code = 'TEMPORARY_FAILURE';
        throw error;
      };

      await expect(errorHandlingService.executeWithErrorHandling('test.operation', operation))
        .rejects.toThrow('Always fails');

      expect(attempts).toBe(4); // Initial attempt + 3 retries
    });

    it('should add jitter to retry delays', async () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(errorHandlingService.calculateRetryDelay(2)); // Same attempt number
      }

      // Delays should vary due to jitter
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const operation = async () => {
        throw new Error('Service unavailable');
      };

      // Fail enough times to open circuit breaker
      for (let i = 0; i < 3; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('failing.service', operation))
          .rejects.toThrow();
      }

      // Circuit should now be open
      const circuitState = await errorHandlingService.checkCircuitBreaker('failing.service');
      expect(circuitState.state).toBe('open');

      // Next call should fail immediately due to open circuit
      await expect(errorHandlingService.executeWithErrorHandling('failing.service', operation))
        .rejects.toThrow('Circuit breaker open');
    });

    it('should reset circuit breaker after timeout', async () => {
      // Mock shorter reset timeout for testing
      errorHandlingService.config.circuitBreakerResetTimeout = 100;

      const operation = async () => {
        throw new Error('Service unavailable');
      };

      // Open circuit breaker
      for (let i = 0; i < 3; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('failing.service', operation))
          .rejects.toThrow();
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Circuit should be half-open now
      const circuitState = await errorHandlingService.checkCircuitBreaker('failing.service');
      expect(circuitState.state).toBe('half-open');
    });

    it('should close circuit breaker on successful operation', async () => {
      // Open circuit breaker first
      const failingOperation = async () => {
        throw new Error('Service unavailable');
      };

      for (let i = 0; i < 3; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('test.service', failingOperation))
          .rejects.toThrow();
      }

      // Manually set to half-open for testing
      const circuitBreaker = errorHandlingService.circuitBreakers.get('test.service');
      circuitBreaker.state = 'half-open';

      // Successful operation should close circuit
      const successfulOperation = async () => 'success';
      await errorHandlingService.executeWithErrorHandling('test.service', successfulOperation);

      const finalState = await errorHandlingService.checkCircuitBreaker('test.service');
      expect(finalState.state).toBe('closed');
    });
  });

  describe('Graceful Degradation for Module Failures', () => {
    it('should apply degradation measures based on failure count', async () => {
      const operation = async () => {
        throw new Error('Module failure');
      };

      // Cause multiple failures to trigger degradation
      for (let i = 0; i < 3; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('qlock.encrypt', operation))
          .rejects.toThrow();
      }

      const moduleHealth = errorHandlingService.moduleHealth.get('qlock');
      expect(moduleHealth.failures).toBe(3);
      expect(moduleHealth.status).toBe('degraded');

      const degradationState = errorHandlingService.degradationStates.get('qlock');
      expect(degradationState).toBe('degraded');
    });

    it('should escalate degradation level with more failures', async () => {
      const operation = async () => {
        throw new Error('Critical failure');
      };

      // Cause enough failures for critical degradation
      for (let i = 0; i < 6; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('qindex.search', operation))
          .rejects.toThrow();
      }

      const degradationState = errorHandlingService.degradationStates.get('qindex');
      expect(degradationState).toBe('critical');
    });

    it('should trigger emergency measures for severe failures', async () => {
      const operation = async () => {
        throw new Error('Emergency failure');
      };

      // Register a recovery procedure
      const recoveryProcedure = vi.fn().mockResolvedValue(true);
      errorHandlingService.registerRecoveryProcedure('qerberos', recoveryProcedure);

      // Cause enough failures for emergency degradation
      for (let i = 0; i < 11; i++) {
        await expect(errorHandlingService.executeWithErrorHandling('qerberos.audit', operation))
          .rejects.toThrow();
      }

      const degradationState = errorHandlingService.degradationStates.get('qerberos');
      expect(degradationState).toBe('emergency');

      // Recovery procedure should have been called
      expect(recoveryProcedure).toHaveBeenCalled();
    });

    it('should register and execute recovery procedures', async () => {
      const recoveryProcedure = vi.fn().mockResolvedValue(true);
      
      errorHandlingService.registerRecoveryProcedure('test-module', recoveryProcedure);
      
      expect(errorHandlingService.recoveryProcedures.has('test-module')).toBe(true);

      // Trigger recovery
      await errorHandlingService.triggerRecoveryProcedures('test-module');
      
      expect(recoveryProcedure).toHaveBeenCalled();
    });
  });

  describe('Failure Budget Accounting', () => {
    it('should track failure budget and detect when exceeded', async () => {
      const operations = [
        async () => 'success',
        async () => { throw new Error('failure'); },
        async () => 'success',
        async () => { throw new Error('failure'); },
        async () => { throw new Error('failure'); }
      ];

      // Execute operations
      for (let i = 0; i < operations.length; i++) {
        try {
          await errorHandlingService.executeWithErrorHandling(`budget.test.${i}`, operations[i]);
        } catch (error) {
          // Expected for failing operations
        }
      }

      // Check failure budget for one of the operations
      const budget = errorHandlingService.failureBudgets.get('budget.test.1');
      expect(budget).toBeDefined();
      expect(budget.errorRate).toBeGreaterThan(0);
    });

    it('should clean old entries from failure budget window', async () => {
      // Mock shorter window for testing
      errorHandlingService.config.failureBudgetWindow = 100;

      const operation = async () => 'success';
      await errorHandlingService.executeWithErrorHandling('window.test', operation);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add another operation
      await errorHandlingService.executeWithErrorHandling('window.test', operation);

      const budget = errorHandlingService.failureBudgets.get('window.test');
      expect(budget.requests.length).toBe(1); // Only recent request should remain
    });
  });

  describe('PII Leak Detection', () => {
    it('should detect email addresses in data', async () => {
      const dataWithEmail = 'Contact us at support@example.com for help';
      
      const scanResult = await errorHandlingService.scanForPIILeaks(dataWithEmail, 'test-context');
      
      expect(scanResult.passed).toBe(false);
      expect(scanResult.violations.length).toBe(1);
      expect(scanResult.violations[0].piiType).toBe('email');
    });

    it('should detect phone numbers in data', async () => {
      const dataWithPhone = 'Call us at 555-123-4567 for support';
      
      const scanResult = await errorHandlingService.scanForPIILeaks(dataWithPhone, 'test-context');
      
      expect(scanResult.passed).toBe(false);
      expect(scanResult.violations.length).toBe(1);
      expect(scanResult.violations[0].piiType).toBe('phone');
    });

    it('should detect SSN in data', async () => {
      const dataWithSSN = 'SSN: 123-45-6789';
      
      const scanResult = await errorHandlingService.scanForPIILeaks(dataWithSSN, 'test-context');
      
      expect(scanResult.passed).toBe(false);
      expect(scanResult.violations.length).toBe(1);
      expect(scanResult.violations[0].piiType).toBe('ssn');
    });

    it('should detect credit card numbers in data', async () => {
      const dataWithCC = 'Card number: 4532 1234 5678 9012';
      
      const scanResult = await errorHandlingService.scanForPIILeaks(dataWithCC, 'test-context');
      
      expect(scanResult.passed).toBe(false);
      expect(scanResult.violations.length).toBe(1);
      expect(scanResult.violations[0].piiType).toBe('credit_card');
    });

    it('should pass scan for clean data', async () => {
      const cleanData = 'This is clean data without any PII';
      
      const scanResult = await errorHandlingService.scanForPIILeaks(cleanData, 'test-context');
      
      expect(scanResult.passed).toBe(true);
      expect(scanResult.violations.length).toBe(0);
    });

    it('should handle JSON data in PII scanning', async () => {
      const jsonData = {
        message: 'Contact support@example.com',
        phone: '555-123-4567'
      };
      
      const scanResult = await errorHandlingService.scanForPIILeaks(jsonData, 'json-context');
      
      expect(scanResult.passed).toBe(false);
      expect(scanResult.violations.length).toBe(2);
    });
  });

  describe('Chaos Testing Artifacts Generation', () => {
    it('should generate comprehensive chaos artifacts', async () => {
      // Create some test data
      const operation = async () => {
        throw new Error('Test failure');
      };

      // Generate some failures and retries
      for (let i = 0; i < 2; i++) {
        try {
          await errorHandlingService.executeWithErrorHandling(`chaos.test.${i}`, operation);
        } catch (error) {
          // Expected
        }
      }

      const testResults = {
        testId: 'chaos-test-1',
        duration: 5000,
        failures: 2,
        successes: 0
      };

      const artifacts = await errorHandlingService.generateChaosArtifacts(testResults);

      expect(artifacts.artifactId).toBeDefined();
      expect(artifacts.testResults).toEqual(testResults);
      expect(artifacts.errorSummary).toBeDefined();
      expect(artifacts.retryAnalysis).toBeDefined();
      expect(artifacts.failureBudgetAccounting).toBeDefined();
      expect(artifacts.circuitBreakerStates).toBeDefined();
    });

    it('should generate retry analysis with backoff curves', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Retry test');
          error.code = 'TEMPORARY_FAILURE';
          throw error;
        }
        return 'success';
      };

      await errorHandlingService.executeWithErrorHandling('retry.analysis', operation);

      const retryAnalysis = errorHandlingService.generateRetryAnalysis();
      
      expect(retryAnalysis.totalRetrySequences).toBe(1);
      expect(retryAnalysis.averageAttempts).toBe(3);
      expect(retryAnalysis.successRate).toBe(1);
      expect(retryAnalysis.retrySequences[0].retryDelays.length).toBe(2); // 2 retry delays for 3 attempts
    });

    it('should generate failure budget accounting', async () => {
      // Create some operations with mixed success/failure
      const successOp = async () => 'success';
      const failOp = async () => { throw new Error('fail'); };

      await errorHandlingService.executeWithErrorHandling('budget.success', successOp);
      try {
        await errorHandlingService.executeWithErrorHandling('budget.fail', failOp);
      } catch (error) {
        // Expected
      }

      const budgetAccounting = errorHandlingService.generateFailureBudgetAccounting();
      
      expect(budgetAccounting['budget.success']).toBeDefined();
      expect(budgetAccounting['budget.success'].errorRate).toBe(0);
      expect(budgetAccounting['budget.fail']).toBeDefined();
      expect(budgetAccounting['budget.fail'].errorRate).toBe(1);
    });
  });

  describe('Error Classification', () => {
    it('should correctly classify retryable errors', async () => {
      const retryableError = new Error('Connection reset');
      retryableError.code = 'ECONNRESET';
      
      expect(errorHandlingService.isRetryableError(retryableError)).toBe(true);
    });

    it('should correctly classify fatal errors', async () => {
      const fatalError = new Error('Authentication failed');
      fatalError.code = 'AUTHENTICATION_FAILED';
      
      expect(errorHandlingService.isRetryableError(fatalError)).toBe(false);
    });

    it('should default to retryable for unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      unknownError.code = 'UNKNOWN_ERROR';
      
      expect(errorHandlingService.isRetryableError(unknownError)).toBe(true);
    });
  });

  describe('Service Management', () => {
    it('should provide error handling status', async () => {
      const status = errorHandlingService.getErrorHandlingStatus();
      
      expect(status.activeOperations).toBe(0);
      expect(status.circuitBreakers).toBe(0);
      expect(status.moduleHealth).toBeDefined();
      expect(status.degradationStates).toBeDefined();
    });

    it('should provide health check information', async () => {
      const health = await errorHandlingService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.errorHandling).toBeDefined();
      expect(health.config.maxRetries).toBe(3);
      expect(health.timestamp).toBeDefined();
    });

    it('should handle cleanup gracefully', async () => {
      await expect(errorHandlingService.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Error Logging and History', () => {
    it('should record operation failures in history', async () => {
      const operation = async () => {
        const error = new Error('Test error');
        error.code = 'TEST_ERROR';
        throw error;
      };

      try {
        await errorHandlingService.executeWithErrorHandling('history.test', operation);
      } catch (error) {
        // Expected
      }

      expect(errorHandlingService.errorHistory.has('history.test')).toBe(true);
      const errors = errorHandlingService.errorHistory.get('history.test');
      expect(errors.length).toBe(1);
      expect(errors[0].error).toBe('Test error');
      expect(errors[0].errorCode).toBe('TEST_ERROR');
    });

    it('should record retry attempts', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Retry test');
          error.code = 'TEMPORARY_FAILURE';
          throw error;
        }
        return 'success';
      };

      const result = await errorHandlingService.executeWithErrorHandling('retry.history', operation);
      
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].status).toBe('failed');
      expect(result.attempts[1].status).toBe('success');
    });
  });

  describe('Module Extraction and Utilities', () => {
    it('should extract module name from operation ID', async () => {
      expect(errorHandlingService.extractModuleFromOperationId('qlock.encrypt')).toBe('qlock');
      expect(errorHandlingService.extractModuleFromOperationId('qindex.search.metadata')).toBe('qindex');
      expect(errorHandlingService.extractModuleFromOperationId('standalone')).toBe('standalone');
    });

    it('should determine correct PII severity levels', async () => {
      expect(errorHandlingService.getPIISeverity('ssn')).toBe('critical');
      expect(errorHandlingService.getPIISeverity('credit_card')).toBe('critical');
      expect(errorHandlingService.getPIISeverity('email')).toBe('medium');
      expect(errorHandlingService.getPIISeverity('unknown')).toBe('medium');
    });

    it('should determine degradation levels based on failure count', async () => {
      expect(errorHandlingService.determineDegradationLevel(1)).toBe('healthy');
      expect(errorHandlingService.determineDegradationLevel(3)).toBe('degraded');
      expect(errorHandlingService.determineDegradationLevel(7)).toBe('critical');
      expect(errorHandlingService.determineDegradationLevel(12)).toBe('emergency');
    });
  });
});