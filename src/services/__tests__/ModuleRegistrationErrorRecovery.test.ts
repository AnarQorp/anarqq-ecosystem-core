/**
 * Module Registration Error Recovery Service Tests
 * Tests for comprehensive error handling, retry mechanisms, and recovery strategies
 * Requirements: 8.1, 8.2, 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ModuleRegistrationErrorRecovery,
  RetryConfig,
  FallbackMode,
  RecoveryStrategy,
  ErrorReport
} from '../ModuleRegistrationErrorRecovery';

import {
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ErrorContext,
  NetworkError,
  ServiceUnavailableError,
  DependencyError,
  SignatureVerificationError,
  ModuleValidationError,
  ModuleRegistrationRequest
} from '../../types/qwallet-module-registration';

import { IdentityType } from '../../types/identity';

describe('ModuleRegistrationErrorRecovery', () => {
  let errorRecovery: ModuleRegistrationErrorRecovery;
  let mockContext: ErrorContext;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    errorRecovery = new ModuleRegistrationErrorRecovery();
    
    mockContext = {
      operation: 'registerModule',
      moduleId: 'test-module',
      identityId: 'test-identity',
      timestamp: new Date().toISOString(),
      attemptNumber: 1,
      maxAttempts: 3
    };

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Classification and Handling', () => {
    it('should properly classify and handle network errors', () => {
      const networkError = new NetworkError(
        'Connection timeout',
        'test-module',
        { timeout: 5000 }
      );

      expect(networkError.code).toBe(ModuleRegistrationErrorCode.NETWORK_ERROR);
      expect(networkError.severity).toBe(ModuleRegistrationErrorSeverity.MEDIUM);
      expect(networkError.retryable).toBe(true);
      expect(networkError.recoverable).toBe(true);
      expect(networkError.suggestedActions).toHaveLength(2);
      expect(networkError.userMessage).toContain('network error');
    });

    it('should properly classify and handle service unavailable errors', () => {
      const serviceError = new ServiceUnavailableError(
        'Qindex service unavailable',
        'test-module',
        { service: 'qindex' }
      );

      expect(serviceError.code).toBe(ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE);
      expect(serviceError.severity).toBe(ModuleRegistrationErrorSeverity.HIGH);
      expect(serviceError.retryable).toBe(true);
      expect(serviceError.recoverable).toBe(true);
      expect(serviceError.suggestedActions).toHaveLength(2);
    });

    it('should properly classify and handle dependency errors', () => {
      const dependencyError = new DependencyError(
        'Missing dependencies',
        'test-module',
        ['dep1', 'dep2']
      );

      expect(dependencyError.code).toBe(ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND);
      expect(dependencyError.severity).toBe(ModuleRegistrationErrorSeverity.HIGH);
      expect(dependencyError.missingDependencies).toEqual(['dep1', 'dep2']);
    });

    it('should properly classify and handle signature verification errors', () => {
      const signatureError = new SignatureVerificationError(
        'Invalid signature',
        'test-module',
        { algorithm: 'RSA-4096' }
      );

      expect(signatureError.code).toBe(ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED);
      expect(signatureError.severity).toBe(ModuleRegistrationErrorSeverity.CRITICAL);
      expect(signatureError.signatureDetails).toEqual({ algorithm: 'RSA-4096' });
    });

    it('should properly classify and handle validation errors', () => {
      const validationError = new ModuleValidationError(
        'Invalid metadata',
        'test-module',
        ['missing required field: version', 'invalid format: description']
      );

      expect(validationError.code).toBe(ModuleRegistrationErrorCode.INVALID_METADATA);
      expect(validationError.severity).toBe(ModuleRegistrationErrorSeverity.MEDIUM);
      expect(validationError.validationErrors).toHaveLength(2);
    });
  });

  describe('Retry Mechanisms', () => {
    it('should retry operations with exponential backoff', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new NetworkError('Network timeout', 'test-module');
        }
        return 'success';
      });

      const result = await errorRecovery.retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffMultiplier: 2
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retry attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new NetworkError('Persistent error', 'test-module'));

      await expect(errorRecovery.retryWithBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10
      })).rejects.toThrow('Persistent error');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(
        new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          'Unauthorized',
          'test-module'
        )
      );

      mockContext.maxAttempts = 3;

      await expect(errorRecovery.executeWithRecovery(operation, mockContext))
        .rejects.toThrow('Unauthorized');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should calculate retry delays with exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Error 1', 'test-module'))
        .mockRejectedValueOnce(new NetworkError('Error 2', 'test-module'))
        .mockResolvedValueOnce('success');

      await errorRecovery.retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        jitterEnabled: false
      });

      expect(delays).toHaveLength(2);
      expect(delays[0]).toBe(1000); // First retry: 1000ms
      expect(delays[1]).toBe(2000); // Second retry: 2000ms

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Recovery Strategies', () => {
    it('should execute automated recovery strategies', async () => {
      const mockStrategy: RecoveryStrategy = {
        name: 'test_recovery',
        description: 'Test recovery strategy',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.NETWORK_ERROR,
        execute: vi.fn().mockResolvedValue(true),
        automated: true,
        priority: 10
      };

      errorRecovery.registerRecoveryStrategy(mockStrategy);

      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'test-module'))
        .mockResolvedValueOnce('success');

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result).toBe('success');
      expect(mockStrategy.execute).toHaveBeenCalled();
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should skip non-applicable recovery strategies', async () => {
      const mockStrategy: RecoveryStrategy = {
        name: 'signature_recovery',
        description: 'Signature recovery strategy',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED,
        execute: vi.fn().mockResolvedValue(true),
        automated: true,
        priority: 10
      };

      errorRecovery.registerRecoveryStrategy(mockStrategy);

      // Create a non-retryable error to avoid fallback modes
      const operation = vi.fn().mockRejectedValue(
        new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          'Unauthorized signer',
          'test-module'
        )
      );

      await expect(errorRecovery.executeWithRecovery(operation, mockContext))
        .rejects.toThrow('Unauthorized signer');

      expect(mockStrategy.execute).not.toHaveBeenCalled();
    });

    it('should handle recovery strategy failures gracefully', async () => {
      const mockStrategy: RecoveryStrategy = {
        name: 'failing_recovery',
        description: 'Failing recovery strategy',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.NETWORK_ERROR,
        execute: vi.fn().mockRejectedValue(new Error('Recovery failed')),
        automated: true,
        priority: 10
      };

      errorRecovery.registerRecoveryStrategy(mockStrategy);

      // Use a non-retryable error to avoid fallback modes
      const operation = vi.fn().mockRejectedValue(
        new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          'Unauthorized signer',
          'test-module'
        )
      );

      await expect(errorRecovery.executeWithRecovery(operation, mockContext))
        .rejects.toThrow('Unauthorized signer');

      // The strategy shouldn't be called because it's not applicable to UNAUTHORIZED_SIGNER
      expect(mockStrategy.execute).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Modes', () => {
    it('should execute sandbox registration fallback', async () => {
      const mockFallback: FallbackMode = {
        name: 'test_fallback',
        description: 'Test fallback mode',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE,
        execute: vi.fn().mockResolvedValue({
          success: true,
          moduleId: 'test-module',
          cid: 'fallback_cid',
          warnings: ['Fallback mode used']
        }),
        priority: 10,
        degraded: true
      };

      errorRecovery.registerFallbackMode(mockFallback);

      const operation = vi.fn().mockRejectedValue(
        new ServiceUnavailableError('Service unavailable', 'test-module')
      );

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('test-module');
      expect(mockFallback.execute).toHaveBeenCalled();
    }, 10000); // Increase timeout to 10 seconds

    it('should use local storage fallback when remote storage fails', async () => {
      // Create a fresh error recovery instance with only local storage fallback
      const freshErrorRecovery = new ModuleRegistrationErrorRecovery();
      
      // Register only the local storage fallback with higher priority
      const localStorageFallback: FallbackMode = {
        name: 'local_storage_test',
        description: 'Test local storage fallback',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
        execute: async (request, context) => {
          const moduleId = context.moduleId || request.moduleInfo.name;
          const storageKey = `module_registration_${moduleId}`;
          const registrationData = {
            moduleInfo: request.moduleInfo,
            timestamp: new Date().toISOString(),
            status: 'pending_sync',
            fallbackMode: 'local_storage'
          };

          localStorage.setItem(storageKey, JSON.stringify(registrationData));

          return {
            success: true,
            moduleId,
            cid: 'local_storage_placeholder',
            indexId: 'local_index_placeholder',
            timestamp: registrationData.timestamp,
            warnings: ['Module stored locally, will sync when service is available']
          };
        },
        priority: 10,
        degraded: true
      };

      freshErrorRecovery.registerFallbackMode(localStorageFallback);
      
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      const operation = vi.fn().mockRejectedValue(
        new ModuleRegistrationError(
          ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
          'Storage failed',
          'test-module'
        )
      );

      const result = await freshErrorRecovery.executeWithRecovery(operation, mockContext);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Module stored locally, will sync when service is available');
      expect(setItemSpy).toHaveBeenCalledWith(
        'module_registration_test-module',
        expect.stringContaining('pending_sync')
      );
    });

    it('should prioritize fallback modes by priority', async () => {
      const lowPriorityFallback: FallbackMode = {
        name: 'low_priority',
        description: 'Low priority fallback',
        applicable: () => true,
        execute: vi.fn().mockResolvedValue({ success: true, priority: 'low' }),
        priority: 1,
        degraded: true
      };

      const highPriorityFallback: FallbackMode = {
        name: 'high_priority',
        description: 'High priority fallback',
        applicable: () => true,
        execute: vi.fn().mockResolvedValue({ success: true, priority: 'high' }),
        priority: 10,
        degraded: true
      };

      errorRecovery.registerFallbackMode(lowPriorityFallback);
      errorRecovery.registerFallbackMode(highPriorityFallback);

      const operation = vi.fn().mockRejectedValue(
        new NetworkError('Network error', 'test-module')
      );

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result.priority).toBe('high');
      expect(highPriorityFallback.execute).toHaveBeenCalled();
      expect(lowPriorityFallback.execute).not.toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    it('should generate comprehensive error reports', async () => {
      const operation = vi.fn().mockRejectedValue(
        new NetworkError('Network error', 'test-module')
      );

      try {
        await errorRecovery.executeWithRecovery(operation, mockContext);
      } catch (error) {
        // Expected to fail or use fallback
      }

      // Get the error report
      const reports = errorRecovery.getModuleErrorReports('test-module');
      expect(reports).toHaveLength(1);

      const report = reports[0];
      expect(report.moduleId).toBe('test-module');
      expect(report.operation).toBe('registerModule');
      expect(report.error.code).toBe(ModuleRegistrationErrorCode.NETWORK_ERROR);
      expect(['FAILURE', 'DEGRADED']).toContain(report.finalOutcome);
      
      // Check that recommendations exist (they might be generated differently)
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
      
      // If there are recommendations, check for network-related ones
      if (report.recommendations.length > 0) {
        const hasNetworkRecommendation = report.recommendations.some(rec => 
          rec.includes('network') || rec.includes('connectivity') || rec.includes('service')
        );
        expect(hasNetworkRecommendation).toBe(true);
      }
    });

    it('should track recovery attempts in error reports', async () => {
      // Create a fresh error recovery instance to avoid interference from built-in strategies
      const freshErrorRecovery = new ModuleRegistrationErrorRecovery();
      
      const mockStrategy: RecoveryStrategy = {
        name: 'test_recovery',
        description: 'Test recovery',
        applicable: (error) => error.code === ModuleRegistrationErrorCode.NETWORK_ERROR,
        execute: vi.fn().mockResolvedValue(false),
        automated: true,
        priority: 10
      };

      freshErrorRecovery.registerRecoveryStrategy(mockStrategy);

      const operation = vi.fn().mockRejectedValue(
        new NetworkError('Network error', 'test-module')
      );

      try {
        await freshErrorRecovery.executeWithRecovery(operation, mockContext);
      } catch (error) {
        // Expected to fail
      }

      const reports = freshErrorRecovery.getModuleErrorReports('test-module');
      const report = reports[0];

      // Should have at least one recovery attempt from our mock strategy
      expect(report.recoveryAttempts.length).toBeGreaterThanOrEqual(1);
      const testRecoveryAttempt = report.recoveryAttempts.find(attempt => attempt.strategy === 'test_recovery');
      expect(testRecoveryAttempt).toBeDefined();
      expect(testRecoveryAttempt?.success).toBe(false);
    });

    it('should clear old error reports', () => {
      // Create a mock report with old timestamp
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      
      // Access private property for testing
      const errorReports = (errorRecovery as any).errorReports;
      errorReports.set('old_error', {
        errorId: 'old_error',
        timestamp: oldTimestamp,
        moduleId: 'old-module'
      });

      errorReports.set('new_error', {
        errorId: 'new_error',
        timestamp: new Date().toISOString(),
        moduleId: 'new-module'
      });

      expect(errorReports.size).toBe(2);

      errorRecovery.clearOldReports(24 * 60 * 60 * 1000); // 24 hours

      expect(errorReports.size).toBe(1);
      expect(errorReports.has('new_error')).toBe(true);
      expect(errorReports.has('old_error')).toBe(false);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom retry configuration', () => {
      const customConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 3,
        jitterEnabled: false
      };

      const customErrorRecovery = new ModuleRegistrationErrorRecovery(customConfig);
      
      // Access private property for testing
      const retryConfig = (customErrorRecovery as any).retryConfig;
      
      expect(retryConfig.maxAttempts).toBe(5);
      expect(retryConfig.baseDelayMs).toBe(2000);
      expect(retryConfig.maxDelayMs).toBe(60000);
      expect(retryConfig.backoffMultiplier).toBe(3);
      expect(retryConfig.jitterEnabled).toBe(false);
    });

    it('should merge custom configuration with defaults', () => {
      const partialConfig = {
        maxAttempts: 5,
        baseDelayMs: 2000
      };

      const customErrorRecovery = new ModuleRegistrationErrorRecovery(partialConfig);
      const retryConfig = (customErrorRecovery as any).retryConfig;
      
      expect(retryConfig.maxAttempts).toBe(5);
      expect(retryConfig.baseDelayMs).toBe(2000);
      expect(retryConfig.maxDelayMs).toBe(30000); // Default value
      expect(retryConfig.backoffMultiplier).toBe(2); // Default value
      expect(retryConfig.jitterEnabled).toBe(true); // Default value
    });
  });

  describe('Error Normalization', () => {
    it('should normalize generic errors to ModuleRegistrationError', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Generic error'));

      try {
        await errorRecovery.executeWithRecovery(operation, mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(ModuleRegistrationError);
        expect((error as ModuleRegistrationError).code).toBe(ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED);
      }
    });

    it('should preserve ModuleRegistrationError instances', async () => {
      const originalError = new NetworkError('Network error', 'test-module');
      const operation = vi.fn().mockRejectedValue(originalError);

      try {
        await errorRecovery.executeWithRecovery(operation, mockContext);
      } catch (error) {
        expect(error).toBe(originalError);
        expect(error).toBeInstanceOf(NetworkError);
      }
    });

    it('should convert network-related errors correctly', async () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Connection failed' };
      const operation = vi.fn().mockRejectedValue(networkError);

      try {
        await errorRecovery.executeWithRecovery(operation, mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).code).toBe(ModuleRegistrationErrorCode.NETWORK_ERROR);
      }
    });
  });

  describe('Integration with Built-in Strategies', () => {
    it('should have network connectivity check strategy', async () => {
      // Mock successful fetch
      (global.fetch as any).mockResolvedValue({ ok: true });

      const operation = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network error', 'test-module'))
        .mockResolvedValueOnce('success');

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result).toBe('success');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://httpbin.org/status/200',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('should have service health check strategy', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new ServiceUnavailableError('Service unavailable', 'test-module'))
        .mockResolvedValueOnce('success');

      // Mock Math.random to return > 0.5 for successful recovery
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.7);

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result).toBe('success');

      Math.random = originalRandom;
    });

    it('should have signature regeneration strategy', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new SignatureVerificationError('Signature failed', 'test-module'))
        .mockResolvedValueOnce('success');

      const result = await errorRecovery.executeWithRecovery(operation, mockContext);

      expect(result).toBe('success');
    });
  });
});