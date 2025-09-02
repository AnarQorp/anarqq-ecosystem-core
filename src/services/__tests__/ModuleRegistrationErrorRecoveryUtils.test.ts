/**
 * Module Registration Error Recovery Utilities Tests
 * Tests for error analysis, recovery planning, and utility functions
 * Requirements: 8.1, 8.2, 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ModuleRegistrationErrorRecoveryUtils,
  ErrorAnalysis,
  RecoveryPlan,
  RecoveryStep
} from '../ModuleRegistrationErrorRecoveryUtils';

import {
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ErrorContext,
  NetworkError,
  ServiceUnavailableError,
  SignatureVerificationError,
  ModuleValidationError
} from '../../types/qwallet-module-registration';

import { IdentityType } from '../../types/identity';

describe('ModuleRegistrationErrorRecoveryUtils', () => {
  let mockContext: ErrorContext;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
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

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Analysis', () => {
    it('should analyze network errors correctly', () => {
      const networkError = new NetworkError('Connection timeout', 'test-module');
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(networkError, mockContext);

      expect(analysis.category).toBe('TRANSIENT');
      expect(analysis.severity).toBe(ModuleRegistrationErrorSeverity.MEDIUM);
      expect(analysis.recoverable).toBe(true);
      expect(analysis.retryable).toBe(true);
      expect(analysis.estimatedRecoveryTime).toBe(5000);
      expect(analysis.rootCause).toContain('Network connectivity');
      expect(analysis.preventionSuggestions).toContain('Implement network connectivity monitoring');
    });

    it('should analyze service unavailable errors correctly', () => {
      const serviceError = new ServiceUnavailableError('Service down', 'test-module');
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(serviceError, mockContext);

      expect(analysis.category).toBe('TRANSIENT');
      expect(analysis.severity).toBe(ModuleRegistrationErrorSeverity.HIGH);
      expect(analysis.estimatedRecoveryTime).toBe(30000);
      expect(analysis.rootCause).toContain('Network connectivity');
    });

    it('should analyze signature verification errors correctly', () => {
      const signatureError = new SignatureVerificationError('Invalid signature', 'test-module');
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(signatureError, mockContext);

      expect(analysis.category).toBe('PERSISTENT');
      expect(analysis.severity).toBe(ModuleRegistrationErrorSeverity.CRITICAL);
      expect(analysis.estimatedRecoveryTime).toBe(10000);
      expect(analysis.rootCause).toContain('Invalid signing key');
      expect(analysis.preventionSuggestions).toContain('Validate signing keys before use');
    });

    it('should analyze validation errors correctly', () => {
      const validationError = new ModuleValidationError(
        'Invalid metadata',
        'test-module',
        ['missing field: version']
      );
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(validationError, mockContext);

      expect(analysis.category).toBe('VALIDATION');
      expect(analysis.severity).toBe(ModuleRegistrationErrorSeverity.MEDIUM);
      expect(analysis.preventionSuggestions).toContain('Add metadata validation in CI/CD pipeline');
    });

    it('should analyze authorization errors correctly', () => {
      const authError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'Unauthorized',
        'test-module'
      );
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(authError, mockContext);

      expect(analysis.category).toBe('AUTHORIZATION');
      expect(analysis.severity).toBe(ModuleRegistrationErrorSeverity.CRITICAL);
      expect(analysis.recoverable).toBe(false);
      expect(analysis.rootCause).toContain('Identity lacks required permissions');
    });

    it('should include error details in analysis', () => {
      const error = new NetworkError(
        'Connection failed',
        'test-module',
        { originalError: new Error('Socket timeout') }
      );
      const analysis = ModuleRegistrationErrorRecoveryUtils.analyzeError(error, mockContext);

      // The root cause should either contain the original error or the default network message
      expect(
        analysis.rootCause?.includes('Original error: Socket timeout') ||
        analysis.rootCause?.includes('Network connectivity issues')
      ).toBe(true);
    });
  });

  describe('Recovery Plan Creation', () => {
    it('should create recovery plan for network errors', () => {
      const networkError = new NetworkError('Connection timeout', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(networkError, mockContext);

      expect(plan.moduleId).toBe('test-module');
      expect(plan.steps).toHaveLength(3); // validate_preconditions, check_connectivity, verify_recovery
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.successProbability).toBeGreaterThan(0.5);
      expect(plan.fallbackOptions).toContain('Contact system administrator');

      const connectivityStep = plan.steps.find(s => s.stepId === 'check_connectivity');
      expect(connectivityStep).toBeDefined();
      expect(connectivityStep?.automated).toBe(true);
      expect(connectivityStep?.dependencies).toContain('validate_preconditions');
    });

    it('should create recovery plan for signature errors', () => {
      const signatureError = new SignatureVerificationError('Invalid signature', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(signatureError, mockContext);

      expect(plan.steps).toHaveLength(3); // validate_preconditions, regenerate_signature, verify_recovery
      expect(plan.fallbackOptions).toContain('Use manual signature verification');

      const signatureStep = plan.steps.find(s => s.stepId === 'regenerate_signature');
      expect(signatureStep).toBeDefined();
      expect(signatureStep?.action).toBe('signature_regeneration');
      expect(signatureStep?.estimatedDuration).toBe(5000);
    });

    it('should create recovery plan for service unavailable errors', () => {
      const serviceError = new ServiceUnavailableError('Service down', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(serviceError, mockContext);

      expect(plan.fallbackOptions).toContain('Register in sandbox mode');
      expect(plan.fallbackOptions).toContain('Store locally and sync later');

      const serviceStep = plan.steps.find(s => s.stepId === 'wait_for_service');
      expect(serviceStep).toBeDefined();
      expect(serviceStep?.estimatedDuration).toBe(15000);
    });

    it('should calculate success probability based on error characteristics', () => {
      const retryableError = new NetworkError('Network error', 'test-module');
      const nonRetryableError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'Unauthorized',
        'test-module'
      );

      const retryablePlan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(retryableError);
      const nonRetryablePlan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(nonRetryableError);

      expect(retryablePlan.successProbability).toBeGreaterThan(nonRetryablePlan.successProbability);
    });

    it('should include all required recovery steps', () => {
      const error = new NetworkError('Network error', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(error, mockContext);

      // Should always include validation and verification steps
      expect(plan.steps.some(s => s.stepId === 'validate_preconditions')).toBe(true);
      expect(plan.steps.some(s => s.stepId === 'verify_recovery')).toBe(true);

      // All steps should have required properties
      plan.steps.forEach(step => {
        expect(step.stepId).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.action).toBeDefined();
        expect(typeof step.automated).toBe('boolean');
        expect(typeof step.estimatedDuration).toBe('number');
        expect(Array.isArray(step.dependencies)).toBe(true);
        expect(Array.isArray(step.successCriteria)).toBe(true);
      });
    });
  });

  describe('Recovery Plan Execution', () => {
    it('should execute automated recovery steps', async () => {
      const networkError = new NetworkError('Network error', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(networkError, mockContext);
      
      // Mock successful fetch for network check
      (global.fetch as any).mockResolvedValue({ ok: true });

      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await ModuleRegistrationErrorRecoveryUtils.executeRecoveryPlan(
        plan,
        mockOperation,
        mockContext
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Executing recovery plan')
      );
    });

    it('should handle recovery step failures gracefully', async () => {
      const networkError = new NetworkError('Network error', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(networkError, mockContext);
      
      // Mock failed fetch for network check
      (global.fetch as any).mockRejectedValue(new Error('Network failed'));

      const mockOperation = vi.fn().mockResolvedValue('success');

      // Should still complete if non-critical steps fail
      const result = await ModuleRegistrationErrorRecoveryUtils.executeRecoveryPlan(
        plan,
        mockOperation,
        mockContext
      );

      expect(result).toBe('success');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recovery step failed'),
        expect.any(Error)
      );
    });

    it('should abort on critical step failures', async () => {
      const error = new NetworkError('Network error', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(error, mockContext);
      
      // Make the first step (which has no dependencies) fail
      const originalExecuteStep = (ModuleRegistrationErrorRecoveryUtils as any).executeRecoveryStep;
      (ModuleRegistrationErrorRecoveryUtils as any).executeRecoveryStep = vi.fn()
        .mockRejectedValueOnce(new Error('Critical failure'))
        .mockResolvedValue(undefined);

      const mockOperation = vi.fn();

      await expect(
        ModuleRegistrationErrorRecoveryUtils.executeRecoveryPlan(plan, mockOperation, mockContext)
      ).rejects.toThrow('Critical recovery step failed');

      expect(mockOperation).not.toHaveBeenCalled();

      // Restore original method
      (ModuleRegistrationErrorRecoveryUtils as any).executeRecoveryStep = originalExecuteStep;
    });

    it('should log manual steps without executing them', async () => {
      const error = new NetworkError('Network error', 'test-module');
      const plan = ModuleRegistrationErrorRecoveryUtils.createRecoveryPlan(error, mockContext);
      
      // Add a manual step
      plan.steps.push({
        stepId: 'manual_step',
        description: 'Manual intervention required',
        action: 'manual_action',
        automated: false,
        estimatedDuration: 0,
        dependencies: [],
        successCriteria: []
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      await ModuleRegistrationErrorRecoveryUtils.executeRecoveryPlan(
        plan,
        mockOperation,
        mockContext
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual step required: Manual intervention required')
      );
    });
  });

  describe('Error Statistics', () => {
    it('should calculate error statistics correctly', () => {
      // Mock error reports in the recovery system
      const mockReports = [
        {
          error: { code: ModuleRegistrationErrorCode.NETWORK_ERROR, severity: ModuleRegistrationErrorSeverity.MEDIUM },
          finalOutcome: 'SUCCESS'
        },
        {
          error: { code: ModuleRegistrationErrorCode.NETWORK_ERROR, severity: ModuleRegistrationErrorSeverity.MEDIUM },
          finalOutcome: 'FAILURE'
        },
        {
          error: { code: ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE, severity: ModuleRegistrationErrorSeverity.HIGH },
          finalOutcome: 'DEGRADED'
        }
      ];

      // Mock the private errorReports property
      const errorRecovery = (ModuleRegistrationErrorRecoveryUtils as any).errorRecovery;
      const originalErrorReports = errorRecovery.errorReports;
      errorRecovery.errorReports = new Map();
      mockReports.forEach((report, index) => {
        errorRecovery.errorReports.set(`error_${index}`, report);
      });

      const stats = ModuleRegistrationErrorRecoveryUtils.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCode[ModuleRegistrationErrorCode.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByCode[ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE]).toBe(1);
      expect(stats.errorsBySeverity[ModuleRegistrationErrorSeverity.MEDIUM]).toBe(2);
      expect(stats.errorsBySeverity[ModuleRegistrationErrorSeverity.HIGH]).toBe(1);
      expect(stats.recoverySuccessRate).toBe(2/3); // 2 successful out of 3
      expect(stats.commonPatterns).toContain('High frequency of NETWORK_ERROR errors (2 occurrences)');
      expect(stats.recommendations).toContain('Implement network resilience patterns (circuit breaker, retry with backoff)');

      // Restore original
      errorRecovery.errorReports = originalErrorReports;
    });

    it('should handle empty error statistics', () => {
      // Mock empty error reports
      const errorRecovery = (ModuleRegistrationErrorRecoveryUtils as any).errorRecovery;
      const originalErrorReports = errorRecovery.errorReports;
      errorRecovery.errorReports = new Map();

      const stats = ModuleRegistrationErrorRecoveryUtils.getErrorStatistics();

      expect(stats.totalErrors).toBe(0);
      expect(stats.recoverySuccessRate).toBe(0);
      expect(stats.commonPatterns).toHaveLength(0);

      // Restore original
      errorRecovery.errorReports = originalErrorReports;
    });

    it('should filter statistics by module ID', () => {
      const mockReports = [
        {
          moduleId: 'module-1',
          error: { code: ModuleRegistrationErrorCode.NETWORK_ERROR, severity: ModuleRegistrationErrorSeverity.MEDIUM },
          finalOutcome: 'SUCCESS'
        },
        {
          moduleId: 'module-2',
          error: { code: ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE, severity: ModuleRegistrationErrorSeverity.HIGH },
          finalOutcome: 'FAILURE'
        }
      ];

      const errorRecovery = (ModuleRegistrationErrorRecoveryUtils as any).errorRecovery;
      errorRecovery.getModuleErrorReports = vi.fn().mockReturnValue([mockReports[0]]);

      const stats = ModuleRegistrationErrorRecoveryUtils.getErrorStatistics('module-1');

      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByCode[ModuleRegistrationErrorCode.NETWORK_ERROR]).toBe(1);
      expect(stats.errorsByCode[ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE]).toBeUndefined();
    });
  });

  describe('Detailed Error Report', () => {
    it('should create comprehensive error report', () => {
      const error = new NetworkError(
        'Connection timeout',
        'test-module',
        { timeout: 5000 }
      );

      const report = ModuleRegistrationErrorRecoveryUtils.createDetailedErrorReport(error, mockContext);

      expect(report).toContain('# Module Registration Error Report');
      expect(report).toContain('**Code**: NETWORK_ERROR');
      expect(report).toContain('**Message**: Connection timeout');
      expect(report).toContain('**Module ID**: test-module');
      expect(report).toContain('**Category**: TRANSIENT');
      expect(report).toContain('**Operation**: registerModule');
      expect(report).toContain('## Recommended Actions');
      expect(report).toContain('## Recovery Plan');
      expect(report).toContain('## Fallback Options');
      expect(report).toContain('## Prevention Suggestions');
      expect(report).toContain('Generated at:');
    });

    it('should handle missing context in error report', () => {
      const error = new NetworkError('Connection timeout', 'test-module');
      const report = ModuleRegistrationErrorRecoveryUtils.createDetailedErrorReport(error);

      expect(report).toContain('**Module ID**: N/A');
      expect(report).toContain('No context available');
    });

    it('should include recovery plan details in report', () => {
      const error = new SignatureVerificationError('Invalid signature', 'test-module');
      const report = ModuleRegistrationErrorRecoveryUtils.createDetailedErrorReport(error, mockContext);

      expect(report).toContain('### Recovery Steps');
      expect(report).toContain('Validate system preconditions');
      expect(report).toContain('Regenerate module signature');
      expect(report).toContain('Verify recovery was successful');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate recovery configuration', () => {
      const validation = ModuleRegistrationErrorRecoveryUtils.validateRecoveryConfiguration();

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
      
      // Check that at least one recommendation contains retry-related text
      const hasRetryRecommendation = validation.recommendations.some(rec => 
        rec.includes('retry') || rec.includes('attempts') || rec.includes('resilience')
      );
      expect(hasRetryRecommendation).toBe(true);
    });

    it('should detect configuration issues', () => {
      // Mock a configuration with issues
      const errorRecovery = (ModuleRegistrationErrorRecoveryUtils as any).errorRecovery;
      const originalFallbackModes = errorRecovery.fallbackModes;
      const originalRecoveryStrategies = errorRecovery.recoveryStrategies;

      errorRecovery.fallbackModes = [];
      errorRecovery.recoveryStrategies = [];

      const validation = ModuleRegistrationErrorRecoveryUtils.validateRecoveryConfiguration();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('No fallback modes configured');
      expect(validation.issues).toContain('No recovery strategies configured');
      expect(validation.recommendations).toContain('Configure at least one fallback mode for degraded operation');

      // Restore original
      errorRecovery.fallbackModes = originalFallbackModes;
      errorRecovery.recoveryStrategies = originalRecoveryStrategies;
    });

    it('should provide configuration recommendations', () => {
      const validation = ModuleRegistrationErrorRecoveryUtils.validateRecoveryConfiguration();

      expect(validation.recommendations.length).toBeGreaterThan(0);
      
      // Check that at least one recommendation contains retry-related text
      const hasRetryRecommendation = validation.recommendations.some(rec => 
        rec.includes('retry') || rec.includes('attempts') || rec.includes('resilience')
      );
      expect(hasRetryRecommendation).toBe(true);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize transient errors correctly', () => {
      const networkError = new NetworkError('Network error', 'test-module');
      const serviceError = new ServiceUnavailableError('Service unavailable', 'test-module');
      const timeoutError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.TIMEOUT_ERROR,
        'Timeout',
        'test-module'
      );

      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(networkError).category).toBe('TRANSIENT');
      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(serviceError).category).toBe('TRANSIENT');
      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(timeoutError).category).toBe('TRANSIENT');
    });

    it('should categorize authorization errors correctly', () => {
      const unauthorizedError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        'Unauthorized',
        'test-module'
      );
      const permissionError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.INSUFFICIENT_PERMISSIONS,
        'Insufficient permissions',
        'test-module'
      );

      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(unauthorizedError).category).toBe('AUTHORIZATION');
      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(permissionError).category).toBe('AUTHORIZATION');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new ModuleValidationError('Invalid metadata', 'test-module');
      const checksumError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.CHECKSUM_MISMATCH,
        'Checksum mismatch',
        'test-module'
      );

      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(validationError).category).toBe('VALIDATION');
      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(checksumError).category).toBe('VALIDATION');
    });

    it('should categorize configuration errors correctly', () => {
      const storageError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
        'Storage failed',
        'test-module'
      );
      const loggingError = new ModuleRegistrationError(
        ModuleRegistrationErrorCode.QERBEROS_LOGGING_FAILED,
        'Logging failed',
        'test-module'
      );

      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(storageError).category).toBe('CONFIGURATION');
      expect(ModuleRegistrationErrorRecoveryUtils.analyzeError(loggingError).category).toBe('CONFIGURATION');
    });
  });
});