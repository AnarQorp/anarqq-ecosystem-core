/**
 * Wallet Error Handler Hook Tests
 * Tests for the useWalletErrorHandler hook functionality
 * Requirements: 6.6, Error handling design
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWalletErrorHandler } from '../useWalletErrorHandler';
import {
  WalletError,
  WalletErrorType,
  WalletErrorSeverity,
  RecoveryStrategy
} from '../../types/wallet-errors';
import { IdentityType } from '../../types/identity';

// Mock dependencies
vi.mock('../useActiveIdentity', () => ({
  useActiveIdentity: vi.fn(() => ({
    activeIdentity: {
      did: 'test-identity-123',
      type: IdentityType.ROOT
    }
  }))
}));

vi.mock('../../services/identity/WalletErrorHandler', () => ({
  walletErrorHandler: {
    handleError: vi.fn(),
    classifyError: vi.fn(),
    attemptRecovery: vi.fn(),
    getUserMessage: vi.fn(),
    getSuggestedActions: vi.fn()
  }
}));

vi.mock('../../utils/wallet-error-recovery', () => ({
  walletErrorRecoveryUtils: {
    executeWithRecovery: vi.fn(),
    executeFallback: vi.fn(),
    getAvailableFallbacks: vi.fn()
  }
}));

import { walletErrorHandler } from '../../services/identity/WalletErrorHandler';
import { walletErrorRecoveryUtils } from '../../utils/wallet-error-recovery';

describe('useWalletErrorHandler', () => {
  const mockOnError = vi.fn();
  const mockOnRecovery = vi.fn();
  const mockOnCriticalError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(walletErrorHandler.handleError).mockResolvedValue({
      success: false,
      action: RecoveryStrategy.USER_ACTION,
      recovered: false,
      retryCount: 0
    });

    vi.mocked(walletErrorHandler.classifyError).mockReturnValue({
      type: WalletErrorType.UNKNOWN_ERROR,
      code: 'WALLET_UNKNOWN_ERROR',
      message: 'Unknown error',
      userMessage: 'An error occurred',
      severity: WalletErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: false,
      suggestedActions: ['Try again'],
      recoveryStrategy: RecoveryStrategy.USER_ACTION,
      timestamp: new Date().toISOString()
    });

    vi.mocked(walletErrorHandler.attemptRecovery).mockResolvedValue({
      success: true,
      action: RecoveryStrategy.USER_ACTION,
      recovered: true,
      retryCount: 1
    });

    vi.mocked(walletErrorHandler.getUserMessage).mockReturnValue({
      title: 'Error',
      description: 'An error occurred',
      icon: 'error',
      color: 'error',
      dismissible: true,
      persistent: false
    });

    vi.mocked(walletErrorHandler.getSuggestedActions).mockReturnValue(['Try again']);

    vi.mocked(walletErrorRecoveryUtils.executeWithRecovery).mockImplementation(
      async (operation) => await operation()
    );

    vi.mocked(walletErrorRecoveryUtils.executeFallback).mockResolvedValue({
      success: true,
      method: 'fallback_method'
    });

    vi.mocked(walletErrorRecoveryUtils.getAvailableFallbacks).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty error state', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      expect(result.current.currentError).toBeNull();
      expect(result.current.isRecovering).toBe(false);
      expect(result.current.recoveryAttempts).toBe(0);
      expect(result.current.lastRecoveryResult).toBeNull();
      expect(result.current.errorHistory).toEqual([]);
    });

    it('should accept custom options', () => {
      const options = {
        maxRetries: 5,
        enableAutoRecovery: false,
        enableFallbacks: false,
        onError: mockOnError,
        onRecovery: mockOnRecovery,
        onCriticalError: mockOnCriticalError
      };

      const { result } = renderHook(() => useWalletErrorHandler(options));

      // Options are used internally, state should still be initialized properly
      expect(result.current.currentError).toBeNull();
      expect(result.current.isRecovering).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle generic errors', async () => {
      const { result } = renderHook(() => useWalletErrorHandler({
        onError: mockOnError
      }));

      const error = new Error('Test error');
      let recoveryResult;

      await act(async () => {
        recoveryResult = await result.current.handleError(error);
      });

      expect(walletErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          identityId: 'test-identity-123',
          operation: 'unknown'
        })
      );

      expect(mockOnError).toHaveBeenCalled();
      expect(result.current.currentError).toBeDefined();
      expect(recoveryResult).toBeDefined();
    });

    it('should handle wallet errors', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      const walletError: WalletError = {
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

      await act(async () => {
        await result.current.handleError(walletError);
      });

      expect(result.current.currentError).toEqual(
        expect.objectContaining({
          type: WalletErrorType.UNKNOWN_ERROR // From mock
        })
      );
    });

    it('should handle critical errors', async () => {
      const { result } = renderHook(() => useWalletErrorHandler({
        onCriticalError: mockOnCriticalError
      }));

      const criticalError: WalletError = {
        type: WalletErrorType.DATA_CORRUPTION,
        code: 'WALLET_DATA_CORRUPTION',
        message: 'Data corruption',
        userMessage: 'Critical error',
        severity: WalletErrorSeverity.CRITICAL,
        recoverable: false,
        retryable: false,
        suggestedActions: ['Contact support'],
        recoveryStrategy: RecoveryStrategy.ESCALATE,
        timestamp: new Date().toISOString()
      };

      // Mock critical error classification
      vi.mocked(walletErrorHandler.classifyError).mockReturnValue({
        ...criticalError,
        severity: WalletErrorSeverity.CRITICAL
      });

      await act(async () => {
        await result.current.handleError(criticalError);
      });

      expect(mockOnCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: WalletErrorSeverity.CRITICAL
        })
      );
    });

    it('should update error history', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await act(async () => {
        await result.current.handleError(error1);
      });

      await act(async () => {
        await result.current.handleError(error2);
      });

      expect(result.current.errorHistory).toHaveLength(2);
    });

    it('should limit error history to 10 entries', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Add 12 errors
      for (let i = 0; i < 12; i++) {
        await act(async () => {
          await result.current.handleError(new Error(`Error ${i}`));
        });
      }

      expect(result.current.errorHistory).toHaveLength(10);
    });
  });

  describe('Recovery Attempts', () => {
    it('should attempt recovery for recoverable errors', async () => {
      const { result } = renderHook(() => useWalletErrorHandler({
        onRecovery: mockOnRecovery
      }));

      const recoverableError: WalletError = {
        type: WalletErrorType.NETWORK_ERROR,
        code: 'WALLET_NETWORK_ERROR',
        message: 'Network error',
        userMessage: 'Connection failed',
        severity: WalletErrorSeverity.MEDIUM,
        recoverable: true,
        retryable: true,
        suggestedActions: ['Try again'],
        recoveryStrategy: RecoveryStrategy.RETRY,
        timestamp: new Date().toISOString()
      };

      vi.mocked(walletErrorHandler.classifyError).mockReturnValue(recoverableError);

      await act(async () => {
        await result.current.handleError(recoverableError);
      });

      expect(walletErrorHandler.attemptRecovery).toHaveBeenCalled();
      expect(mockOnRecovery).toHaveBeenCalled();
    });

    it('should manually attempt recovery', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // First set an error
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      // Then attempt recovery
      await act(async () => {
        await result.current.attemptRecovery();
      });

      expect(result.current.isRecovering).toBe(false);
      expect(result.current.recoveryAttempts).toBe(1);
    });

    it('should clear error on successful recovery', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Set an error
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      expect(result.current.currentError).toBeDefined();

      // Mock successful recovery
      vi.mocked(walletErrorHandler.attemptRecovery).mockResolvedValue({
        success: true,
        action: RecoveryStrategy.RETRY,
        recovered: true,
        retryCount: 1
      });

      // Attempt recovery
      await act(async () => {
        await result.current.attemptRecovery();
      });

      expect(result.current.currentError).toBeNull();
      expect(result.current.recoveryAttempts).toBe(0);
    });

    it('should handle recovery failures', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Set an error
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      // Mock recovery failure
      vi.mocked(walletErrorHandler.attemptRecovery).mockRejectedValue(
        new Error('Recovery failed')
      );

      // Attempt recovery
      await act(async () => {
        await result.current.attemptRecovery();
      });

      expect(result.current.isRecovering).toBe(false);
      expect(result.current.lastRecoveryResult?.success).toBe(false);
      expect(result.current.lastRecoveryResult?.escalated).toBe(true);
    });
  });

  describe('Execute with Error Handling', () => {
    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      const successfulOperation = vi.fn().mockResolvedValue('success');

      let operationResult;
      await act(async () => {
        operationResult = await result.current.executeWithErrorHandling(
          successfulOperation,
          'test-operation'
        );
      });

      expect(operationResult).toBe('success');
      expect(successfulOperation).toHaveBeenCalled();
    });

    it('should handle operation failures with recovery', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Mock recovery utils to handle the error
      vi.mocked(walletErrorRecoveryUtils.executeWithRecovery).mockRejectedValue(
        new Error('Operation failed')
      );

      await act(async () => {
        await expect(
          result.current.executeWithErrorHandling(failingOperation, 'test-operation')
        ).rejects.toThrow('Operation failed');
      });

      expect(result.current.currentError).toBeDefined();
    });
  });

  describe('Fallback Execution', () => {
    it('should execute fallback for current error', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Set an error first
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      // Execute fallback
      let fallbackResult;
      await act(async () => {
        fallbackResult = await result.current.executeFallback();
      });

      expect(walletErrorRecoveryUtils.executeFallback).toHaveBeenCalled();
      expect(fallbackResult).toEqual({
        success: true,
        method: 'fallback_method'
      });
      expect(result.current.currentError).toBeNull();
    });

    it('should throw error when no current error exists', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      await act(async () => {
        await expect(result.current.executeFallback()).rejects.toThrow(
          'No error to execute fallback for'
        );
      });
    });

    it('should throw error when fallbacks are disabled', async () => {
      const { result } = renderHook(() => useWalletErrorHandler({
        enableFallbacks: false
      }));

      // Set an error first
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      await act(async () => {
        await expect(result.current.executeFallback()).rejects.toThrow(
          'Fallbacks are disabled'
        );
      });
    });
  });

  describe('Utility Functions', () => {
    it('should get error message for current error', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Initially should return null
      expect(result.current.getErrorMessage()).toBeNull();
    });

    it('should get suggested actions for current error', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Initially should return empty array
      expect(result.current.getSuggestedActions()).toEqual([]);
    });

    it('should check if error is recoverable', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Initially should return false
      expect(result.current.isRecoverable()).toBe(false);
    });

    it('should check if error is retryable', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Initially should return false
      expect(result.current.isRetryable()).toBe(false);
    });

    it('should get available fallbacks', () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Initially should return empty array
      expect(result.current.getAvailableFallbacks()).toEqual([]);
    });
  });

  describe('Error Clearing', () => {
    it('should clear current error', async () => {
      const { result } = renderHook(() => useWalletErrorHandler());

      // Set an error
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      expect(result.current.currentError).toBeDefined();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();
      expect(result.current.recoveryAttempts).toBe(0);
      expect(result.current.isRecovering).toBe(false);
    });
  });

  describe('Retry with Delay', () => {
    it('should retry with delay', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useWalletErrorHandler());

      // Set an error
      await act(async () => {
        await result.current.handleError(new Error('Test error'));
      });

      // Start retry with delay
      act(() => {
        result.current.retryWithDelay(1000);
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(walletErrorHandler.attemptRecovery).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should cancel previous retry when new one is started', () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useWalletErrorHandler());

      // Start first retry
      act(() => {
        result.current.retryWithDelay(1000);
      });

      // Start second retry (should cancel first)
      act(() => {
        result.current.retryWithDelay(500);
      });

      // Fast-forward to first timeout
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not have been called yet
      expect(walletErrorHandler.attemptRecovery).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeouts on unmount', () => {
      vi.useFakeTimers();

      const { result, unmount } = renderHook(() => useWalletErrorHandler());

      // Start retry with delay
      act(() => {
        result.current.retryWithDelay(1000);
      });

      // Unmount component
      unmount();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not have been called after unmount
      expect(walletErrorHandler.attemptRecovery).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});