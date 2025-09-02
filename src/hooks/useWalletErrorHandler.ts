/**
 * Wallet Error Handler Hook
 * Provides error handling capabilities for wallet operations
 * Requirements: 6.6, Error handling design
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WalletError,
  WalletErrorType,
  ErrorRecoveryResult,
  ErrorContext,
  ErrorMessage
} from '../types/wallet-errors';

import { walletErrorHandler } from '../services/identity/WalletErrorHandler';
import { walletErrorRecoveryUtils, RecoveryContext } from '../utils/wallet-error-recovery';
import { useActiveIdentity } from './useActiveIdentity';

export interface WalletErrorState {
  currentError: WalletError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryResult: ErrorRecoveryResult | null;
  errorHistory: WalletError[];
}

export interface WalletErrorHandlerOptions {
  maxRetries?: number;
  enableAutoRecovery?: boolean;
  enableFallbacks?: boolean;
  onError?: (error: WalletError) => void;
  onRecovery?: (result: ErrorRecoveryResult) => void;
  onCriticalError?: (error: WalletError) => void;
}

export const useWalletErrorHandler = (options: WalletErrorHandlerOptions = {}) => {
  const {
    maxRetries = 3,
    enableAutoRecovery = true,
    enableFallbacks = true,
    onError,
    onRecovery,
    onCriticalError
  } = options;

  const { activeIdentity } = useActiveIdentity();
  const [errorState, setErrorState] = useState<WalletErrorState>({
    currentError: null,
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryResult: null,
    errorHistory: []
  });

  const recoveryContextRef = useRef<RecoveryContext | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle an error with automatic recovery attempts
   */
  const handleError = useCallback(async (
    error: Error | WalletError,
    context?: Partial<ErrorContext>
  ): Promise<ErrorRecoveryResult> => {
    try {
      // Create full error context
      const fullContext: ErrorContext = {
        requestId: context?.requestId || generateRequestId(),
        sessionId: context?.sessionId || generateSessionId(),
        identityId: context?.identityId || activeIdentity?.did || 'unknown',
        operation: context?.operation || 'unknown',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV as any || 'development',
        ...context
      };

      // Handle the error
      const result = await walletErrorHandler.handleError(error, fullContext);
      const walletError = walletErrorHandler.classifyError(error as Error, fullContext);

      // Update error state
      setErrorState(prev => ({
        ...prev,
        currentError: walletError,
        errorHistory: [...prev.errorHistory.slice(-9), walletError], // Keep last 10 errors
        lastRecoveryResult: result
      }));

      // Call error callback
      if (onError) {
        onError(walletError);
      }

      // Handle critical errors
      if (walletError.severity === 'CRITICAL') {
        if (onCriticalError) {
          onCriticalError(walletError);
        }
        return result;
      }

      // Attempt automatic recovery if enabled
      if (enableAutoRecovery && walletError.recoverable) {
        return await attemptRecovery(walletError, fullContext);
      }

      return result;
    } catch (handlingError) {
      console.error('[useWalletErrorHandler] Error in error handling:', handlingError);
      
      // Return fallback result
      const fallbackResult: ErrorRecoveryResult = {
        success: false,
        action: 'ESCALATE' as any,
        recovered: false,
        retryCount: 0,
        escalated: true,
        userActionRequired: 'Error handling system failure - contact support'
      };

      setErrorState(prev => ({
        ...prev,
        lastRecoveryResult: fallbackResult
      }));

      return fallbackResult;
    }
  }, [activeIdentity, onError, onCriticalError, enableAutoRecovery]);

  /**
   * Attempt to recover from the current error
   */
  const attemptRecovery = useCallback(async (
    walletError?: WalletError,
    context?: ErrorContext
  ): Promise<ErrorRecoveryResult> => {
    const targetError = walletError || errorState.currentError;
    if (!targetError) {
      throw new Error('No error to recover from');
    }

    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      const result = await walletErrorHandler.attemptRecovery(targetError, context);

      setErrorState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryResult: result
      }));

      // Call recovery callback
      if (onRecovery) {
        onRecovery(result);
      }

      // If recovery was successful, clear the current error
      if (result.success && result.recovered) {
        setErrorState(prev => ({
          ...prev,
          currentError: null,
          recoveryAttempts: 0
        }));
      }

      return result;
    } catch (recoveryError) {
      console.error('[useWalletErrorHandler] Recovery failed:', recoveryError);
      
      const failedResult: ErrorRecoveryResult = {
        success: false,
        action: 'ESCALATE' as any,
        recovered: false,
        retryCount: errorState.recoveryAttempts,
        escalated: true,
        userActionRequired: 'Recovery failed - contact support'
      };

      setErrorState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryResult: failedResult
      }));

      return failedResult;
    }
  }, [errorState.currentError, errorState.recoveryAttempts, onRecovery]);

  /**
   * Execute an operation with automatic error handling and recovery
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Partial<ErrorContext>
  ): Promise<T> => {
    // Create recovery context
    const recoveryContext: RecoveryContext = {
      identityId: activeIdentity?.did || 'unknown',
      identityType: activeIdentity?.type || 'UNKNOWN' as any,
      operation: operationName,
      originalParameters: context?.parameters || {},
      attemptCount: 0,
      maxAttempts: maxRetries
    };

    recoveryContextRef.current = recoveryContext;

    try {
      return await walletErrorRecoveryUtils.executeWithRecovery(
        operation,
        recoveryContext,
        async (error, ctx) => {
          // Handle error during operation
          await handleError(error, {
            operation: operationName,
            ...context
          });

          // Continue retrying if within limits and error is retryable
          return ctx.attemptCount < ctx.maxAttempts && error.retryable;
        }
      );
    } catch (error) {
      // Final error handling if all retries failed
      await handleError(error as Error, {
        operation: operationName,
        ...context
      });
      throw error;
    }
  }, [activeIdentity, maxRetries, handleError]);

  /**
   * Execute fallback mechanism for current error
   */
  const executeFallback = useCallback(async (): Promise<any> => {
    if (!errorState.currentError) {
      throw new Error('No error to execute fallback for');
    }

    if (!enableFallbacks) {
      throw new Error('Fallbacks are disabled');
    }

    try {
      const result = await walletErrorRecoveryUtils.executeFallback(
        errorState.currentError,
        recoveryContextRef.current || undefined
      );

      // Update state to reflect successful fallback
      setErrorState(prev => ({
        ...prev,
        currentError: null,
        recoveryAttempts: 0,
        lastRecoveryResult: {
          success: true,
          action: 'FALLBACK' as any,
          recovered: true,
          retryCount: prev.recoveryAttempts,
          fallbackUsed: true
        }
      }));

      return result;
    } catch (fallbackError) {
      console.error('[useWalletErrorHandler] Fallback execution failed:', fallbackError);
      throw fallbackError;
    }
  }, [errorState.currentError, enableFallbacks]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error?: WalletError): ErrorMessage | null => {
    const targetError = error || errorState.currentError;
    if (!targetError) {
      return null;
    }

    return walletErrorHandler.getUserMessage(targetError);
  }, [errorState.currentError]);

  /**
   * Get suggested actions for current error
   */
  const getSuggestedActions = useCallback((error?: WalletError): string[] => {
    const targetError = error || errorState.currentError;
    if (!targetError) {
      return [];
    }

    return walletErrorHandler.getSuggestedActions(targetError);
  }, [errorState.currentError]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      currentError: null,
      recoveryAttempts: 0,
      isRecovering: false
    }));

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Retry current operation with delay
   */
  const retryWithDelay = useCallback((delayMs: number = 2000) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      attemptRecovery();
    }, delayMs);
  }, [attemptRecovery]);

  /**
   * Check if error is recoverable
   */
  const isRecoverable = useCallback((error?: WalletError): boolean => {
    const targetError = error || errorState.currentError;
    return targetError?.recoverable || false;
  }, [errorState.currentError]);

  /**
   * Check if error is retryable
   */
  const isRetryable = useCallback((error?: WalletError): boolean => {
    const targetError = error || errorState.currentError;
    return targetError?.retryable || false;
  }, [errorState.currentError]);

  /**
   * Get available fallback mechanisms
   */
  const getAvailableFallbacks = useCallback((error?: WalletError) => {
    const targetError = error || errorState.currentError;
    if (!targetError) {
      return [];
    }

    return walletErrorRecoveryUtils.getAvailableFallbacks(targetError);
  }, [errorState.currentError]);

  return {
    // State
    errorState,
    currentError: errorState.currentError,
    isRecovering: errorState.isRecovering,
    recoveryAttempts: errorState.recoveryAttempts,
    lastRecoveryResult: errorState.lastRecoveryResult,
    errorHistory: errorState.errorHistory,

    // Actions
    handleError,
    attemptRecovery,
    executeWithErrorHandling,
    executeFallback,
    clearError,
    retryWithDelay,

    // Utilities
    getErrorMessage,
    getSuggestedActions,
    isRecoverable,
    isRetryable,
    getAvailableFallbacks
  };
};

// Helper functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default useWalletErrorHandler;