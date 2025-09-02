/**
 * Wallet Error Handler Tests
 * Tests for comprehensive error handling, classification, and recovery
 * Requirements: 6.6, Error handling design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WalletErrorHandler } from '../WalletErrorHandler';
import {
  WalletError,
  WalletErrorType,
  WalletErrorSeverity,
  RecoveryStrategy,
  WalletPermissionError,
  WalletTransactionError,
  WalletServiceError
} from '../../../types/wallet-errors';

// Mock external dependencies
vi.mock('../IdentityQerberosService', () => ({
  identityQerberosService: {
    logSecurityEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('WalletErrorHandler', () => {
  let errorHandler: WalletErrorHandler;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    errorHandler = new WalletErrorHandler();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify permission errors correctly', () => {
      const error = new Error('Permission denied for wallet operation');
      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const walletError = errorHandler.classifyError(error, context);

      expect(walletError.type).toBe(WalletErrorType.PERMISSION_DENIED);
      expect(walletError.severity).toBe(WalletErrorSeverity.MEDIUM);
      expect(walletError.recoverable).toBe(false);
      expect(walletError.retryable).toBe(false);
      expect(walletError.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION);
    });

    it('should classify balance errors correctly', () => {
      const error = new Error('Insufficient balance for transaction');
      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const walletError = errorHandler.classifyError(error, context);

      expect(walletError.type).toBe(WalletErrorType.INSUFFICIENT_BALANCE);
      expect(walletError.severity).toBe(WalletErrorSeverity.LOW);
      expect(walletError.recoverable).toBe(true);
      expect(walletError.retryable).toBe(false);
    });

    it('should classify network errors correctly', () => {
      const error = new Error('Network connection timeout');
      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const walletError = errorHandler.classifyError(error, context);

      expect(walletError.type).toBe(WalletErrorType.NETWORK_ERROR);
      expect(walletError.severity).toBe(WalletErrorSeverity.MEDIUM);
      expect(walletError.recoverable).toBe(true);
      expect(walletError.retryable).toBe(true);
      expect(walletError.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
    });

    it('should classify service-specific errors correctly', () => {
      const qlockError = new Error('Qlock signing failed');
      const qonsentError = new Error('Qonsent permission blocked');
      const qerberosError = new Error('Qerberos logging failed');
      const piWalletError = new Error('Pi Wallet connection failed');

      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const qlockWalletError = errorHandler.classifyError(qlockError, context);
      const qonsentWalletError = errorHandler.classifyError(qonsentError, context);
      const qerberosWalletError = errorHandler.classifyError(qerberosError, context);
      const piWalletWalletError = errorHandler.classifyError(piWalletError, context);

      expect(qlockWalletError.type).toBe(WalletErrorType.QLOCK_FAILED);
      expect(qonsentWalletError.type).toBe(WalletErrorType.QONSENT_BLOCKED);
      expect(qerberosWalletError.type).toBe(WalletErrorType.QERBEROS_LOG_FAILED);
      expect(piWalletWalletError.type).toBe(WalletErrorType.PI_WALLET_CONNECTION_FAILED);
    });

    it('should handle unknown errors with default classification', () => {
      const error = new Error('Some unknown error occurred');
      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'unknown',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const walletError = errorHandler.classifyError(error, context);

      expect(walletError.type).toBe(WalletErrorType.UNKNOWN_ERROR);
      expect(walletError.severity).toBe(WalletErrorSeverity.MEDIUM);
      expect(walletError.recoverable).toBe(false);
      expect(walletError.retryable).toBe(true);
      expect(walletError.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
    });
  });

  describe('Error Handling', () => {
    it('should handle wallet errors with logging', async () => {
      const walletError: WalletError = {
        type: WalletErrorType.INSUFFICIENT_BALANCE,
        code: 'WALLET_INSUFFICIENT_BALANCE',
        message: 'Insufficient balance',
        userMessage: 'You do not have enough funds',
        severity: WalletErrorSeverity.LOW,
        recoverable: true,
        retryable: false,
        suggestedActions: ['Add funds', 'Try smaller amount'],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const result = await errorHandler.handleError(walletError, context);

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryStrategy.USER_ACTION);
      expect(result.recovered).toBe(false);
      expect(result.userActionRequired).toBeDefined();
    });

    it('should handle generic errors with classification', async () => {
      const error = new Error('Network timeout');
      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      const result = await errorHandler.handleError(error, context);

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryStrategy.RETRY);
      expect(result.retryCount).toBe(0);
      expect(result.nextRetryAt).toBeDefined();
    });

    it('should handle critical errors with escalation', async () => {
      const criticalError: WalletError = {
        type: WalletErrorType.DATA_CORRUPTION,
        code: 'WALLET_DATA_CORRUPTION',
        message: 'Data corruption detected',
        userMessage: 'Critical system error detected',
        severity: WalletErrorSeverity.CRITICAL,
        recoverable: false,
        retryable: false,
        suggestedActions: ['Contact support immediately'],
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleError(criticalError);

      expect(result.success).toBe(false);
      expect(result.action).toBe(RecoveryStrategy.ESCALATE);
      expect(result.escalated).toBe(true);
      expect(result.userActionRequired).toContain('Critical system error');
    });
  });

  describe('Recovery Strategies', () => {
    it('should handle retry strategy with exponential backoff', async () => {
      const retryableError: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error',
        userMessage: 'Network connection failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: ['Try again'],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.attemptRecovery(retryableError);

      expect(result.action).toBe(RecoveryStrategy.RETRY);
      expect(result.retryCount).toBe(1);
      expect(result.nextRetryAt).toBeDefined();
    });

    it('should handle user action strategy', async () => {
      const userActionError: WalletError = {
        type: WalletErrorType.INSUFFICIENT_BALANCE,
        code: 'WALLET_INSUFFICIENT_BALANCE',
        message: 'Insufficient balance',
        userMessage: 'Not enough funds',
        severity: WalletErrorSeverity.LOW,
        recoverable: true,
        retryable: false,
        suggestedActions: ['Add funds'],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.attemptRecovery(userActionError);

      expect(result.action).toBe(RecoveryStrategy.USER_ACTION);
      expect(result.userActionRequired).toBeDefined();
    });

    it('should handle fallback strategy', async () => {
      const fallbackError: WalletError = {
        type: WalletErrorType.QERBEROS_LOG_FAILED,
        code: 'WALLET_QERBEROS_LOG_FAILED',
        message: 'Qerberos logging failed',
        userMessage: 'Audit logging temporarily unavailable',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: ['Continue operation'],
        recoveryStrategy: RecoveryStrategy.FALLBACK,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.attemptRecovery(fallbackError);

      expect(result.action).toBe(RecoveryStrategy.FALLBACK);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should escalate after max retries exceeded', async () => {
      const retryableError: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error',
        userMessage: 'Network connection failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: ['Try again'],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString()
      };

      // Simulate multiple retry attempts
      for (let i = 0; i < 4; i++) {
        await errorHandler.attemptRecovery(retryableError);
      }

      const result = await errorHandler.attemptRecovery(retryableError);

      expect(result.action).toBe(RecoveryStrategy.ESCALATE);
      expect(result.escalated).toBe(true);
      expect(result.userActionRequired).toContain('Maximum retry attempts exceeded');
    });
  });

  describe('User Messages', () => {
    it('should generate appropriate user messages for different error types', () => {
      const permissionError = new WalletPermissionError(
        'Permission denied',
        'test-identity',
        'transfer'
      );

      const transactionError = new WalletTransactionError(
        'Insufficient balance',
        WalletErrorType.INSUFFICIENT_BALANCE,
        'test-identity',
        100,
        'ETH'
      );

      const serviceError = new WalletServiceError(
        'Qlock failed',
        'QLOCK',
        'test-identity',
        'sign'
      );

      const permissionMessage = errorHandler.getUserMessage(permissionError);
      const transactionMessage = errorHandler.getUserMessage(transactionError);
      const serviceMessage = errorHandler.getUserMessage(serviceError);

      expect(permissionMessage.title).toBe('Permission Denied');
      expect(permissionMessage.description).toContain('permission');
      expect(permissionMessage.color).toBe('warning');

      expect(transactionMessage.title).toBe('Insufficient Balance');
      expect(transactionMessage.description).toContain('100 ETH');
      expect(transactionMessage.color).toBe('info');

      expect(serviceMessage.title).toBe('Error');
      expect(serviceMessage.description).toContain('signing service');
      expect(serviceMessage.color).toBe('error');
    });

    it('should provide appropriate suggested actions', () => {
      const balanceError = new WalletTransactionError(
        'Insufficient balance',
        WalletErrorType.INSUFFICIENT_BALANCE,
        'test-identity'
      );

      const limitError = new WalletTransactionError(
        'Limit exceeded',
        WalletErrorType.LIMIT_EXCEEDED,
        'test-identity'
      );

      const balanceActions = errorHandler.getSuggestedActions(balanceError);
      const limitActions = errorHandler.getSuggestedActions(limitError);

      expect(balanceActions).toContain('Add funds to your wallet');
      expect(balanceActions).toContain('Try a smaller amount');

      expect(limitActions).toContain('Try a smaller amount');
      expect(limitActions).toContain('Wait for your limits to reset');
    });
  });

  describe('Error Analytics', () => {
    it('should track error analytics', async () => {
      const error1: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error 1',
        userMessage: 'Network failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString(),
        identityId: 'identity-1'
      };

      const error2: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error 2',
        userMessage: 'Network failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString(),
        identityId: 'identity-1'
      };

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);

      const analytics = await errorHandler.getErrorAnalytics();
      const trends = await errorHandler.getErrorTrends();

      expect(analytics.length).toBeGreaterThan(0);
      expect(trends[WalletErrorType.NETWORK_ERROR]).toBe(2);
    });

    it('should filter analytics by time range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const error: WalletError = {
        type: WalletErrorType.VALIDATION_ERROR,
        code: 'WALLET_VALIDATION_ERROR',
        message: 'Validation error',
        userMessage: 'Invalid input',
        severity: WalletErrorSeverity.LOW,
        recoverable: true,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: now.toISOString(),
        identityId: 'identity-1'
      };

      await errorHandler.handleError(error);

      const allAnalytics = await errorHandler.getErrorAnalytics();
      const filteredAnalytics = await errorHandler.getErrorAnalytics({
        start: yesterday.toISOString(),
        end: tomorrow.toISOString()
      });

      expect(allAnalytics.length).toBeGreaterThan(0);
      expect(filteredAnalytics.length).toBeGreaterThan(0);
    });
  });

  describe('Error Logging', () => {
    it('should log errors to localStorage', async () => {
      const error: WalletError = {
        type: WalletErrorType.PERMISSION_DENIED,
        code: 'WALLET_PERMISSION_DENIED',
        message: 'Permission denied',
        userMessage: 'Access denied',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: false,
        retryable: false,
        suggestedActions: [],
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        timestamp: new Date().toISOString()
      };

      const context = {
        requestId: 'test-request',
        sessionId: 'test-session',
        identityId: 'test-identity',
        operation: 'transfer',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test' as any
      };

      await errorHandler.logError(error, context);

      const storedLogs = JSON.parse(localStorage.getItem('wallet_error_logs') || '[]');
      expect(storedLogs.length).toBe(1);
      expect(storedLogs[0].type).toBe(WalletErrorType.PERMISSION_DENIED);
    });

    it('should limit stored error logs to 100 entries', async () => {
      // Add 105 errors to test the limit
      for (let i = 0; i < 105; i++) {
        const error: WalletError = {
          type: WalletErrorType.UNKNOWN_ERROR,
          code: 'WALLET_UNKNOWN_ERROR',
          message: `Error ${i}`,
          userMessage: `Error ${i}`,
          severity: WalletErrorSeverity.LOW,
          recoverable: true,
          retryable: true,
          suggestedActions: [],
          recoveryStrategy: RecoveryStrategy.RETRY,
          timestamp: new Date().toISOString()
        };

        await errorHandler.logError(error);
      }

      const storedLogs = JSON.parse(localStorage.getItem('wallet_error_logs') || '[]');
      expect(storedLogs.length).toBe(100);
    });
  });

  describe('Error Recovery Strategies Configuration', () => {
    it('should have proper recovery strategies for all error types', () => {
      const permissionStrategy = errorHandler.getRecoveryStrategy(WalletErrorType.PERMISSION_DENIED);
      const networkStrategy = errorHandler.getRecoveryStrategy(WalletErrorType.NETWORK_ERROR);
      const qlockStrategy = errorHandler.getRecoveryStrategy(WalletErrorType.QLOCK_FAILED);

      expect(permissionStrategy.strategy).toBe(RecoveryStrategy.USER_ACTION);
      expect(permissionStrategy.maxRetries).toBe(0);

      expect(networkStrategy.strategy).toBe(RecoveryStrategy.RETRY);
      expect(networkStrategy.maxRetries).toBe(3);

      expect(qlockStrategy.strategy).toBe(RecoveryStrategy.RECONNECT_SERVICE);
      expect(qlockStrategy.fallbackMethod).toBe('manual_signing');
    });

    it('should provide default strategy for unknown error types', () => {
      const unknownStrategy = errorHandler.getRecoveryStrategy('UNKNOWN_TYPE' as WalletErrorType);

      expect(unknownStrategy.strategy).toBe(RecoveryStrategy.ESCALATE);
      expect(unknownStrategy.escalationLevel).toBe('SUPPORT');
    });
  });
});