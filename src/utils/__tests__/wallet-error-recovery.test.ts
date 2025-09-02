/**
 * Wallet Error Recovery Utilities Tests
 * Tests for fallback mechanisms and recovery strategies
 * Requirements: 6.6, Error handling design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WalletErrorRecoveryUtils } from '../wallet-error-recovery';
import {
  WalletError,
  WalletErrorType,
  WalletErrorSeverity,
  RecoveryStrategy
} from '../../types/wallet-errors';
import { IdentityType } from '../../types/identity';

describe('WalletErrorRecoveryUtils', () => {
  let recoveryUtils: WalletErrorRecoveryUtils;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    recoveryUtils = new WalletErrorRecoveryUtils();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Fallback Mechanisms', () => {
    it('should identify applicable fallback mechanisms for Qlock errors', () => {
      const qlockError: WalletError = {
        type: WalletErrorType.QLOCK_FAILED,
        code: 'WALLET_QLOCK_FAILED',
        message: 'Qlock signing failed',
        userMessage: 'Signing service unavailable',
        severity: WalletErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RECONNECT_SERVICE,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(qlockError);

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks[0].name).toBe('Manual Signing Fallback');
      expect(fallbacks[0].applicable(qlockError)).toBe(true);
    });

    it('should identify applicable fallback mechanisms for Qonsent errors', () => {
      const qonsentError: WalletError = {
        type: WalletErrorType.QONSENT_TIMEOUT,
        code: 'WALLET_QONSENT_TIMEOUT',
        message: 'Qonsent timeout',
        userMessage: 'Permission service timeout',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(qonsentError);

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.name === 'Default Permission Fallback')).toBe(true);
    });

    it('should identify applicable fallback mechanisms for Qerberos errors', () => {
      const qerberosError: WalletError = {
        type: WalletErrorType.QERBEROS_LOG_FAILED,
        code: 'WALLET_QERBEROS_LOG_FAILED',
        message: 'Qerberos logging failed',
        userMessage: 'Audit logging unavailable',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(qerberosError);

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.name === 'Local Logging Fallback')).toBe(true);
    });

    it('should identify applicable fallback mechanisms for Pi Wallet errors', () => {
      const piWalletError: WalletError = {
        type: WalletErrorType.PI_WALLET_CONNECTION_FAILED,
        code: 'WALLET_PI_WALLET_CONNECTION_FAILED',
        message: 'Pi Wallet connection failed',
        userMessage: 'Cannot connect to Pi Wallet',
        severity: WalletErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RECONNECT_SERVICE,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(piWalletError);

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.name === 'Native Transfer Fallback')).toBe(true);
    });

    it('should identify applicable fallback mechanisms for limit exceeded errors', () => {
      const limitError: WalletError = {
        type: WalletErrorType.LIMIT_EXCEEDED,
        code: 'WALLET_LIMIT_EXCEEDED',
        message: 'Transaction limit exceeded',
        userMessage: 'Amount exceeds your limits',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(limitError);

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks.some(f => f.name === 'Split Transaction Fallback')).toBe(true);
    });

    it('should sort fallbacks by priority', () => {
      const networkError: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error',
        userMessage: 'Network connection failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString()
      };

      const fallbacks = recoveryUtils.getAvailableFallbacks(networkError);

      if (fallbacks.length > 1) {
        for (let i = 0; i < fallbacks.length - 1; i++) {
          expect(fallbacks[i].priority).toBeGreaterThanOrEqual(fallbacks[i + 1].priority);
        }
      }
    });
  });

  describe('Fallback Execution', () => {
    it('should execute manual signing fallback for Qlock errors', async () => {
      const qlockError: WalletError = {
        type: WalletErrorType.QLOCK_FAILED,
        code: 'WALLET_QLOCK_FAILED',
        message: 'Qlock signing failed',
        userMessage: 'Signing service unavailable',
        severity: WalletErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RECONNECT_SERVICE,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.executeFallback(qlockError);

      expect(result.success).toBe(true);
      expect(result.method).toBe('manual_signing');
      expect(result.signature).toBeDefined();
    });

    it('should execute default permissions fallback for Qonsent errors', async () => {
      const qonsentError: WalletError = {
        type: WalletErrorType.QONSENT_TIMEOUT,
        code: 'WALLET_QONSENT_TIMEOUT',
        message: 'Qonsent timeout',
        userMessage: 'Permission service timeout',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'transfer',
        { amount: 100 }
      );

      const result = await recoveryUtils.executeFallback(qonsentError, context);

      expect(result.success).toBe(true);
      expect(result.method).toBe('default_permissions');
      expect(result.permissions).toBeDefined();
      expect(result.permissions.canTransfer).toBe(true);
    });

    it('should execute local logging fallback for Qerberos errors', async () => {
      const qerberosError: WalletError = {
        type: WalletErrorType.QERBEROS_LOG_FAILED,
        code: 'WALLET_QERBEROS_LOG_FAILED',
        message: 'Qerberos logging failed',
        userMessage: 'Audit logging unavailable',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.executeFallback(qerberosError);

      expect(result.success).toBe(true);
      expect(result.method).toBe('local_logging');

      // Check that log was stored locally
      const storedLogs = JSON.parse(localStorage.getItem('wallet_fallback_logs') || '[]');
      expect(storedLogs.length).toBe(1);
      expect(storedLogs[0].fallbackUsed).toBe('local_logging');
    });

    it('should execute split transaction fallback for limit exceeded errors', async () => {
      const limitError: WalletError = {
        type: WalletErrorType.LIMIT_EXCEEDED,
        code: 'WALLET_LIMIT_EXCEEDED',
        message: 'Transaction limit exceeded',
        userMessage: 'Amount exceeds your limits',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'transfer',
        { amount: 200000 } // Amount exceeding ROOT limit
      );

      const result = await recoveryUtils.executeFallback(limitError, context);

      expect(result.success).toBe(true);
      expect(result.method).toBe('split_transaction');
      expect(result.numSplits).toBeGreaterThan(1);
      expect(result.splitAmount).toBeLessThan(200000);
    });

    it('should throw error when no applicable fallback is found', async () => {
      const unknownError: WalletError = {
        type: WalletErrorType.FRAUD_DETECTED,
        code: 'WALLET_FRAUD_DETECTED',
        message: 'Fraud detected',
        userMessage: 'Suspicious activity detected',
        severity: WalletErrorSeverity.CRITICAL,
        recoverable: false,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.BLOCK_OPERATION,
        timestamp: new Date().toISOString()
      };

      await expect(recoveryUtils.executeFallback(unknownError)).rejects.toThrow(
        'No successful fallback mechanism found'
      );
    });
  });

  describe('Recovery Context', () => {
    it('should create recovery context with proper defaults', () => {
      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.DAO,
        'transfer',
        { amount: 100, token: 'ETH' }
      );

      expect(context.identityId).toBe('test-identity');
      expect(context.identityType).toBe(IdentityType.DAO);
      expect(context.operation).toBe('transfer');
      expect(context.originalParameters.amount).toBe(100);
      expect(context.attemptCount).toBe(0);
      expect(context.maxAttempts).toBe(3);
    });

    it('should create recovery context with custom max attempts', () => {
      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ENTERPRISE,
        'sign',
        {},
        5
      );

      expect(context.maxAttempts).toBe(5);
    });
  });

  describe('Execute with Recovery', () => {
    it('should execute operation successfully on first attempt', async () => {
      const successfulOperation = vi.fn().mockResolvedValue('success');
      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'test-operation',
        {}
      );

      const result = await recoveryUtils.executeWithRecovery(
        successfulOperation,
        context
      );

      expect(result).toBe('success');
      expect(successfulOperation).toHaveBeenCalledTimes(1);
      expect(context.attemptCount).toBe(1);
    });

    it('should retry operation on retryable errors', async () => {
      let attemptCount = 0;
      const retryableOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Network timeout');
          throw error;
        }
        return 'success';
      });

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'test-operation',
        {}
      );

      const result = await recoveryUtils.executeWithRecovery(
        retryableOperation,
        context
      );

      expect(result).toBe('success');
      expect(retryableOperation).toHaveBeenCalledTimes(3);
      expect(context.attemptCount).toBe(3);
    });

    it('should stop retrying on non-retryable errors', async () => {
      const nonRetryableOperation = vi.fn().mockImplementation(() => {
        const error = new Error('Permission denied');
        throw error;
      });

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'test-operation',
        {}
      );

      await expect(
        recoveryUtils.executeWithRecovery(nonRetryableOperation, context)
      ).rejects.toThrow();

      expect(nonRetryableOperation).toHaveBeenCalledTimes(1);
      expect(context.attemptCount).toBe(1);
    });

    it('should respect max attempts limit', async () => {
      const failingOperation = vi.fn().mockImplementation(() => {
        const error = new Error('Network timeout');
        throw error;
      });

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'test-operation',
        {},
        2 // Max 2 attempts
      );

      await expect(
        recoveryUtils.executeWithRecovery(failingOperation, context)
      ).rejects.toThrow();

      expect(failingOperation).toHaveBeenCalledTimes(2);
      expect(context.attemptCount).toBe(2);
    });

    it('should call custom error handler', async () => {
      const failingOperation = vi.fn().mockImplementation(() => {
        const error = new Error('Network timeout');
        throw error;
      });

      const customErrorHandler = vi.fn().mockResolvedValue(false); // Stop retrying

      const context = recoveryUtils.createRecoveryContext(
        'test-identity',
        IdentityType.ROOT,
        'test-operation',
        {}
      );

      await expect(
        recoveryUtils.executeWithRecovery(
          failingOperation,
          context,
          customErrorHandler
        )
      ).rejects.toThrow();

      expect(customErrorHandler).toHaveBeenCalledTimes(1);
      expect(failingOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Graceful Degradation', () => {
    it('should degrade signing operations when Qlock fails', async () => {
      const qlockError: WalletError = {
        type: WalletErrorType.QLOCK_FAILED,
        code: 'WALLET_QLOCK_FAILED',
        message: 'Qlock signing failed',
        userMessage: 'Signing service unavailable',
        severity: WalletErrorSeverity.HIGH,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RECONNECT_SERVICE,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.degradeGracefully(qlockError);

      expect(result.success).toBe(true);
      expect(result.degraded).toBe(true);
      expect(result.method).toBe('manual_approval_required');
    });

    it('should degrade permission checks when Qonsent times out', async () => {
      const qonsentError: WalletError = {
        type: WalletErrorType.QONSENT_TIMEOUT,
        code: 'WALLET_QONSENT_TIMEOUT',
        message: 'Qonsent timeout',
        userMessage: 'Permission service timeout',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.degradeGracefully(qonsentError);

      expect(result.success).toBe(true);
      expect(result.degraded).toBe(true);
      expect(result.method).toBe('conservative_permissions');
    });

    it('should degrade audit logging when Qerberos fails', async () => {
      const qerberosError: WalletError = {
        type: WalletErrorType.QERBEROS_LOG_FAILED,
        code: 'WALLET_QERBEROS_LOG_FAILED',
        message: 'Qerberos logging failed',
        userMessage: 'Audit logging unavailable',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.degradeGracefully(qerberosError);

      expect(result.success).toBe(true);
      expect(result.degraded).toBe(true);
      expect(result.method).toBe('deferred_logging');
    });

    it('should throw error for non-degradable errors', async () => {
      const fraudError: WalletError = {
        type: WalletErrorType.FRAUD_DETECTED,
        code: 'WALLET_FRAUD_DETECTED',
        message: 'Fraud detected',
        userMessage: 'Suspicious activity detected',
        severity: WalletErrorSeverity.CRITICAL,
        recoverable: false,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.BLOCK_OPERATION,
        timestamp: new Date().toISOString()
      };

      await expect(recoveryUtils.degradeGracefully(fraudError)).rejects.toThrow(
        'No graceful degradation available'
      );
    });
  });

  describe('Custom Fallback Registration', () => {
    it('should register and use custom fallback mechanisms', async () => {
      const customFallback = {
        name: 'Custom Test Fallback',
        description: 'Test fallback mechanism',
        applicable: (error: WalletError) => error.type === WalletErrorType.VALIDATION_ERROR,
        execute: vi.fn().mockResolvedValue({
          success: true,
          method: 'custom_fallback',
          message: 'Custom fallback executed'
        }),
        priority: 10
      };

      recoveryUtils.registerFallback(customFallback);

      const validationError: WalletError = {
        type: WalletErrorType.VALIDATION_ERROR,
        code: 'WALLET_VALIDATION_ERROR',
        message: 'Validation failed',
        userMessage: 'Invalid input',
        severity: WalletErrorSeverity.LOW,
        recoverable: true,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const result = await recoveryUtils.executeFallback(validationError);

      expect(result.success).toBe(true);
      expect(result.method).toBe('custom_fallback');
      expect(customFallback.execute).toHaveBeenCalledWith(validationError, undefined);
    });
  });
});