/**
 * Comprehensive Wallet Error Handler Service
 * Implements error classification, recovery strategies, and user-friendly messaging
 * Requirements: 6.6, Error handling design
 */

import {
  WalletError,
  WalletErrorType,
  WalletErrorSeverity,
  RecoveryStrategy,
  ErrorRecoveryResult,
  ErrorRecoveryStrategy,
  CriticalFailurePolicy,
  ErrorContext,
  ErrorMessage,
  ErrorAnalytics,
  WalletErrorHandler as IWalletErrorHandler,
  WalletPermissionError,
  WalletTransactionError,
  WalletServiceError
} from '../../types/wallet-errors';

import { IdentityType } from '../../types/identity';

export class WalletErrorHandler implements IWalletErrorHandler {
  private recoveryStrategies: Map<WalletErrorType, ErrorRecoveryStrategy> = new Map();
  private criticalFailurePolicies: Map<WalletErrorType, CriticalFailurePolicy> = new Map();
  private errorAnalytics: Map<string, ErrorAnalytics> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  constructor() {
    this.initializeRecoveryStrategies();
    this.initializeCriticalFailurePolicies();
  }

  /**
   * Main error handling entry point
   */
  async handleError(error: Error | WalletError, context?: ErrorContext): Promise<ErrorRecoveryResult> {
    try {
      // Classify the error if it's a generic Error
      const walletError = this.isWalletError(error) ? error : this.classifyError(error, context);
      
      // Log the error
      await this.logError(walletError, context);
      
      // Update analytics
      this.updateErrorAnalytics(walletError);
      
      // Check if this is a critical failure
      if (this.isCriticalFailure(walletError)) {
        return await this.handleCriticalFailure(walletError, context);
      }
      
      // Attempt recovery
      return await this.attemptRecovery(walletError, context);
      
    } catch (handlingError) {
      console.error('[WalletErrorHandler] Error in error handling:', handlingError);
      
      // Return a fallback recovery result
      return {
        success: false,
        action: RecoveryStrategy.ESCALATE,
        recovered: false,
        retryCount: 0,
        escalated: true,
        userActionRequired: 'Contact support - error handling system failure'
      };
    }
  }

  /**
   * Classify a generic error into a WalletError
   */
  classifyError(error: Error, context?: ErrorContext): WalletError {
    const timestamp = new Date().toISOString();
    
    // Check error message patterns for classification
    const message = error.message.toLowerCase();
    
    // Permission-related errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return new WalletPermissionError(
        error.message,
        context?.identityId,
        context?.operation
      );
    }
    
    // Balance-related errors
    if (message.includes('insufficient') && message.includes('balance')) {
      return new WalletTransactionError(
        error.message,
        WalletErrorType.INSUFFICIENT_BALANCE,
        context?.identityId
      );
    }
    
    // Limit-related errors
    if (message.includes('limit') && (message.includes('exceed') || message.includes('over'))) {
      return new WalletTransactionError(
        error.message,
        WalletErrorType.LIMIT_EXCEEDED,
        context?.identityId
      );
    }
    
    // Network-related errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return this.createWalletError(
        WalletErrorType.NETWORK_ERROR,
        error.message,
        WalletErrorSeverity.MEDIUM,
        true,
        true,
        RecoveryStrategy.RETRY,
        context
      );
    }
    
    // Service-specific errors
    if (message.includes('qlock')) {
      return new WalletServiceError(error.message, 'QLOCK', context?.identityId, context?.operation);
    }
    
    if (message.includes('qonsent')) {
      return new WalletServiceError(error.message, 'QONSENT', context?.identityId, context?.operation);
    }
    
    if (message.includes('qerberos')) {
      return new WalletServiceError(error.message, 'QERBEROS', context?.identityId, context?.operation);
    }
    
    if (message.includes('pi wallet') || message.includes('pi-wallet')) {
      return new WalletServiceError(error.message, 'PI_WALLET', context?.identityId, context?.operation);
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return this.createWalletError(
        WalletErrorType.VALIDATION_ERROR,
        error.message,
        WalletErrorSeverity.LOW,
        true,
        false,
        RecoveryStrategy.USER_ACTION,
        context
      );
    }
    
    // Default to unknown error
    return this.createWalletError(
      WalletErrorType.UNKNOWN_ERROR,
      error.message,
      WalletErrorSeverity.MEDIUM,
      false,
      true,
      RecoveryStrategy.RETRY,
      context
    );
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(walletError: WalletError, context?: ErrorContext): Promise<ErrorRecoveryResult> {
    const strategy = this.getRecoveryStrategy(walletError.type);
    const retryKey = this.getRetryKey(walletError, context);
    const currentRetries = this.retryAttempts.get(retryKey) || 0;

    const result: ErrorRecoveryResult = {
      success: false,
      action: strategy.strategy,
      recovered: false,
      retryCount: currentRetries
    };

    switch (strategy.strategy) {
      case RecoveryStrategy.RETRY:
        return await this.handleRetryStrategy(walletError, strategy, context, result);
        
      case RecoveryStrategy.FALLBACK:
        return await this.handleFallbackStrategy(walletError, strategy, context, result);
        
      case RecoveryStrategy.USER_ACTION:
        return this.handleUserActionStrategy(walletError, strategy, result);
        
      case RecoveryStrategy.ESCALATE:
        return await this.handleEscalateStrategy(walletError, strategy, context, result);
        
      case RecoveryStrategy.REFRESH_SESSION:
        return await this.handleRefreshSessionStrategy(walletError, context, result);
        
      case RecoveryStrategy.RECONNECT_SERVICE:
        return await this.handleReconnectServiceStrategy(walletError, context, result);
        
      case RecoveryStrategy.BLOCK_OPERATION:
        return this.handleBlockOperationStrategy(walletError, result);
        
      default:
        result.action = RecoveryStrategy.ESCALATE;
        result.escalated = true;
        result.userActionRequired = 'Contact support for assistance';
        return result;
    }
  }

  /**
   * Get recovery strategy for error type
   */
  getRecoveryStrategy(errorType: WalletErrorType): ErrorRecoveryStrategy {
    return this.recoveryStrategies.get(errorType) || {
      errorType,
      strategy: RecoveryStrategy.ESCALATE,
      maxRetries: 0,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
      escalationLevel: 'SUPPORT'
    };
  }

  /**
   * Generate user-friendly error message
   */
  getUserMessage(walletError: WalletError): ErrorMessage {
    const baseMessage: ErrorMessage = {
      title: this.getErrorTitle(walletError.type),
      description: walletError.userMessage || walletError.message,
      icon: this.getErrorIcon(walletError.severity),
      color: this.getErrorColor(walletError.severity),
      dismissible: walletError.severity !== WalletErrorSeverity.CRITICAL,
      persistent: walletError.severity === WalletErrorSeverity.CRITICAL
    };

    // Add action button for recoverable errors
    if (walletError.recoverable && walletError.suggestedActions.length > 0) {
      baseMessage.actionText = walletError.suggestedActions[0];
    }

    // Add help URL for complex errors
    if (walletError.severity === WalletErrorSeverity.HIGH || walletError.severity === WalletErrorSeverity.CRITICAL) {
      baseMessage.helpUrl = this.getHelpUrl(walletError.type);
    }

    return baseMessage;
  }

  /**
   * Get suggested actions for error
   */
  getSuggestedActions(walletError: WalletError): string[] {
    return walletError.suggestedActions || this.getDefaultSuggestedActions(walletError.type);
  }

  /**
   * Log error to appropriate systems
   */
  async logError(walletError: WalletError, context?: ErrorContext): Promise<void> {
    try {
      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.error('[WalletErrorHandler] Error:', {
          type: walletError.type,
          message: walletError.message,
          severity: walletError.severity,
          context
        });
      }

      // Log to Qerberos if available and not a Qerberos error
      if (walletError.type !== WalletErrorType.QERBEROS_LOG_FAILED) {
        try {
          const { identityQerberosService } = await import('./IdentityQerberosService');
          await identityQerberosService.logSecurityEvent(
            context?.identityId || 'system',
            'WALLET_ERROR',
            {
              errorType: walletError.type,
              severity: walletError.severity,
              operation: context?.operation,
              message: walletError.message,
              recoverable: walletError.recoverable,
              context
            }
          );
        } catch (qerberosError) {
          console.warn('[WalletErrorHandler] Failed to log to Qerberos:', qerberosError);
        }
      }

      // Store in local error log
      this.storeErrorLog(walletError, context);

    } catch (loggingError) {
      console.error('[WalletErrorHandler] Failed to log error:', loggingError);
    }
  }

  /**
   * Report error to external systems
   */
  async reportError(walletError: WalletError, context?: ErrorContext): Promise<void> {
    // Only report high severity errors or critical failures
    if (walletError.severity === WalletErrorSeverity.HIGH || walletError.severity === WalletErrorSeverity.CRITICAL) {
      try {
        // Report to monitoring system (placeholder)
        console.log('[WalletErrorHandler] Reporting error to monitoring system:', {
          type: walletError.type,
          severity: walletError.severity,
          identityId: context?.identityId,
          timestamp: walletError.timestamp
        });
      } catch (reportingError) {
        console.error('[WalletErrorHandler] Failed to report error:', reportingError);
      }
    }
  }

  /**
   * Get error analytics
   */
  async getErrorAnalytics(timeRange?: { start: string; end: string }): Promise<ErrorAnalytics[]> {
    const analytics = Array.from(this.errorAnalytics.values());
    
    if (timeRange) {
      return analytics.filter(analytic => 
        analytic.firstOccurrence >= timeRange.start && 
        analytic.lastOccurrence <= timeRange.end
      );
    }
    
    return analytics;
  }

  /**
   * Get error trends
   */
  async getErrorTrends(): Promise<Record<WalletErrorType, number>> {
    const trends: Record<WalletErrorType, number> = {} as Record<WalletErrorType, number>;
    
    for (const analytic of this.errorAnalytics.values()) {
      trends[analytic.errorType] = (trends[analytic.errorType] || 0) + analytic.count;
    }
    
    return trends;
  }

  // Private helper methods

  private isWalletError(error: any): error is WalletError {
    return error && typeof error === 'object' && 'type' in error && 'code' in error;
  }

  private createWalletError(
    type: WalletErrorType,
    message: string,
    severity: WalletErrorSeverity,
    recoverable: boolean,
    retryable: boolean,
    recoveryStrategy: RecoveryStrategy,
    context?: ErrorContext
  ): WalletError {
    return {
      type,
      code: `WALLET_${type}`,
      message,
      userMessage: this.generateUserMessage(type, message),
      severity,
      recoverable,
      retryable,
      suggestedActions: this.getDefaultSuggestedActions(type),
      recoveryStrategy,
      timestamp: new Date().toISOString(),
      identityId: context?.identityId,
      operation: context?.operation,
      sessionId: context?.sessionId,
      requestId: context?.requestId
    };
  }

  private generateUserMessage(type: WalletErrorType, originalMessage: string): string {
    const userMessages: Record<WalletErrorType, string> = {
      [WalletErrorType.PERMISSION_DENIED]: 'You don\'t have permission to perform this operation.',
      [WalletErrorType.INSUFFICIENT_BALANCE]: 'Insufficient balance to complete the transaction.',
      [WalletErrorType.LIMIT_EXCEEDED]: 'Transaction amount exceeds your wallet limits.',
      [WalletErrorType.NETWORK_ERROR]: 'Network connection error. Please check your connection and try again.',
      [WalletErrorType.SERVICE_UNAVAILABLE]: 'A required service is temporarily unavailable. Please try again.',
      [WalletErrorType.VALIDATION_ERROR]: 'The provided information is invalid. Please check and try again.',
      [WalletErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again or contact support.'
    } as Record<WalletErrorType, string>;

    return userMessages[type] || 'An error occurred while processing your request.';
  }

  private getDefaultSuggestedActions(type: WalletErrorType): string[] {
    const actions: Record<WalletErrorType, string[]> = {
      [WalletErrorType.PERMISSION_DENIED]: ['Check your identity permissions', 'Contact your administrator'],
      [WalletErrorType.INSUFFICIENT_BALANCE]: ['Add funds to your wallet', 'Try a smaller amount'],
      [WalletErrorType.LIMIT_EXCEEDED]: ['Try a smaller amount', 'Wait for limits to reset'],
      [WalletErrorType.NETWORK_ERROR]: ['Check your internet connection', 'Try again in a few moments'],
      [WalletErrorType.SERVICE_UNAVAILABLE]: ['Try again later', 'Contact support if problem persists'],
      [WalletErrorType.VALIDATION_ERROR]: ['Check your input', 'Verify all fields are correct'],
      [WalletErrorType.UNKNOWN_ERROR]: ['Try again', 'Contact support if problem persists']
    } as Record<WalletErrorType, string[]>;

    return actions[type] || ['Try again', 'Contact support if problem persists'];
  }

  private getErrorTitle(type: WalletErrorType): string {
    const titles: Record<WalletErrorType, string> = {
      [WalletErrorType.PERMISSION_DENIED]: 'Permission Denied',
      [WalletErrorType.INSUFFICIENT_BALANCE]: 'Insufficient Balance',
      [WalletErrorType.LIMIT_EXCEEDED]: 'Limit Exceeded',
      [WalletErrorType.NETWORK_ERROR]: 'Network Error',
      [WalletErrorType.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [WalletErrorType.VALIDATION_ERROR]: 'Validation Error',
      [WalletErrorType.UNKNOWN_ERROR]: 'Unexpected Error'
    } as Record<WalletErrorType, string>;

    return titles[type] || 'Error';
  }

  private getErrorIcon(severity: WalletErrorSeverity): string {
    switch (severity) {
      case WalletErrorSeverity.LOW: return 'info';
      case WalletErrorSeverity.MEDIUM: return 'warning';
      case WalletErrorSeverity.HIGH: return 'error';
      case WalletErrorSeverity.CRITICAL: return 'critical';
      default: return 'error';
    }
  }

  private getErrorColor(severity: WalletErrorSeverity): 'error' | 'warning' | 'info' {
    switch (severity) {
      case WalletErrorSeverity.LOW: return 'info';
      case WalletErrorSeverity.MEDIUM: return 'warning';
      case WalletErrorSeverity.HIGH:
      case WalletErrorSeverity.CRITICAL: return 'error';
      default: return 'error';
    }
  }

  private getHelpUrl(type: WalletErrorType): string {
    return `/help/wallet-errors/${type.toLowerCase()}`;
  }

  private isCriticalFailure(walletError: WalletError): boolean {
    return walletError.severity === WalletErrorSeverity.CRITICAL ||
           this.criticalFailurePolicies.has(walletError.type);
  }

  private async handleCriticalFailure(walletError: WalletError, context?: ErrorContext): Promise<ErrorRecoveryResult> {
    const policy = this.criticalFailurePolicies.get(walletError.type);
    
    if (policy) {
      // Execute auto actions
      for (const autoAction of policy.autoActions) {
        try {
          await this.executeAutoAction(autoAction, walletError, context);
        } catch (actionError) {
          console.error('[WalletErrorHandler] Failed to execute auto action:', actionError);
        }
      }
    }

    return {
      success: false,
      action: RecoveryStrategy.ESCALATE,
      recovered: false,
      retryCount: 0,
      escalated: true,
      userActionRequired: 'Critical system error - contact support immediately'
    };
  }

  private async executeAutoAction(
    autoAction: { action: string; delay?: number; conditions?: Record<string, any> },
    walletError: WalletError,
    context?: ErrorContext
  ): Promise<void> {
    if (autoAction.delay) {
      await new Promise(resolve => setTimeout(resolve, autoAction.delay));
    }

    switch (autoAction.action) {
      case 'LOG':
        await this.logError(walletError, context);
        break;
      case 'ALERT':
        console.error('[CRITICAL WALLET ERROR]', walletError);
        break;
      case 'ESCALATE':
        await this.reportError(walletError, context);
        break;
      // Additional auto actions can be implemented here
    }
  }

  private getRetryKey(walletError: WalletError, context?: ErrorContext): string {
    return `${walletError.type}_${context?.identityId || 'unknown'}_${context?.operation || 'unknown'}`;
  }

  private async handleRetryStrategy(
    walletError: WalletError,
    strategy: ErrorRecoveryStrategy,
    context: ErrorContext | undefined,
    result: ErrorRecoveryResult
  ): Promise<ErrorRecoveryResult> {
    const retryKey = this.getRetryKey(walletError, context);
    const currentRetries = this.retryAttempts.get(retryKey) || 0;

    if (currentRetries >= strategy.maxRetries) {
      result.action = RecoveryStrategy.ESCALATE;
      result.escalated = true;
      result.userActionRequired = 'Maximum retry attempts exceeded - contact support';
      return result;
    }

    // Calculate next retry delay with exponential backoff
    const delay = Math.min(
      strategy.retryDelay * Math.pow(strategy.backoffMultiplier, currentRetries),
      strategy.maxRetryDelay
    );

    this.retryAttempts.set(retryKey, currentRetries + 1);
    result.retryCount = currentRetries + 1;
    result.nextRetryAt = new Date(Date.now() + delay).toISOString();

    return result;
  }

  private async handleFallbackStrategy(
    walletError: WalletError,
    strategy: ErrorRecoveryStrategy,
    context: ErrorContext | undefined,
    result: ErrorRecoveryResult
  ): Promise<ErrorRecoveryResult> {
    if (strategy.fallbackMethod) {
      result.fallbackUsed = true;
      result.recovered = true;
      result.success = true;
      result.metadata = { fallbackMethod: strategy.fallbackMethod };
    } else {
      result.action = RecoveryStrategy.USER_ACTION;
      result.userActionRequired = 'No fallback available - manual intervention required';
    }

    return result;
  }

  private handleUserActionStrategy(
    walletError: WalletError,
    strategy: ErrorRecoveryStrategy,
    result: ErrorRecoveryResult
  ): ErrorRecoveryResult {
    result.userActionRequired = strategy.userActionRequired || 
      walletError.suggestedActions[0] || 
      'Please review and correct the issue';
    
    return result;
  }

  private async handleEscalateStrategy(
    walletError: WalletError,
    strategy: ErrorRecoveryStrategy,
    context: ErrorContext | undefined,
    result: ErrorRecoveryResult
  ): Promise<ErrorRecoveryResult> {
    result.escalated = true;
    result.userActionRequired = 'This issue has been escalated to support';
    
    // Report the error
    await this.reportError(walletError, context);
    
    return result;
  }

  private async handleRefreshSessionStrategy(
    walletError: WalletError,
    context: ErrorContext | undefined,
    result: ErrorRecoveryResult
  ): Promise<ErrorRecoveryResult> {
    result.userActionRequired = 'Please refresh your session and try again';
    result.metadata = { requiresSessionRefresh: true };
    
    return result;
  }

  private async handleReconnectServiceStrategy(
    walletError: WalletError,
    context: ErrorContext | undefined,
    result: ErrorRecoveryResult
  ): Promise<ErrorRecoveryResult> {
    result.userActionRequired = 'Attempting to reconnect to service...';
    result.metadata = { requiresServiceReconnection: true };
    
    return result;
  }

  private handleBlockOperationStrategy(
    walletError: WalletError,
    result: ErrorRecoveryResult
  ): ErrorRecoveryResult {
    result.userActionRequired = 'This operation is blocked and cannot be completed';
    result.metadata = { operationBlocked: true };
    
    return result;
  }

  private updateErrorAnalytics(walletError: WalletError): void {
    const key = `${walletError.type}_${walletError.identityId || 'unknown'}`;
    const existing = this.errorAnalytics.get(key);

    if (existing) {
      existing.count++;
      existing.lastOccurrence = walletError.timestamp;
      if (!existing.affectedIdentities.includes(walletError.identityId || 'unknown')) {
        existing.affectedIdentities.push(walletError.identityId || 'unknown');
        existing.affectedUsers++;
      }
    } else {
      this.errorAnalytics.set(key, {
        errorId: key,
        errorType: walletError.type,
        count: 1,
        firstOccurrence: walletError.timestamp,
        lastOccurrence: walletError.timestamp,
        affectedUsers: 1,
        affectedIdentities: [walletError.identityId || 'unknown'],
        impact: {
          severity: walletError.severity,
          operationsBlocked: walletError.recoverable ? 0 : 1,
          usersAffected: 1
        }
      });
    }
  }

  private storeErrorLog(walletError: WalletError, context?: ErrorContext): void {
    try {
      const errorLog = {
        ...walletError,
        context,
        storedAt: new Date().toISOString()
      };

      // Store in localStorage for persistence
      const existingLogs = JSON.parse(localStorage.getItem('wallet_error_logs') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 100 errors
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('wallet_error_logs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.warn('[WalletErrorHandler] Failed to store error log:', storageError);
    }
  }

  private initializeRecoveryStrategies(): void {
    // Permission errors
    this.recoveryStrategies.set(WalletErrorType.PERMISSION_DENIED, {
      errorType: WalletErrorType.PERMISSION_DENIED,
      strategy: RecoveryStrategy.USER_ACTION,
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      userActionRequired: 'Check your permissions and try again',
      escalationLevel: 'SUPPORT'
    });

    // Transaction errors
    this.recoveryStrategies.set(WalletErrorType.INSUFFICIENT_BALANCE, {
      errorType: WalletErrorType.INSUFFICIENT_BALANCE,
      strategy: RecoveryStrategy.USER_ACTION,
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      userActionRequired: 'Add funds or reduce transaction amount'
    });

    this.recoveryStrategies.set(WalletErrorType.LIMIT_EXCEEDED, {
      errorType: WalletErrorType.LIMIT_EXCEEDED,
      strategy: RecoveryStrategy.USER_ACTION,
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      userActionRequired: 'Reduce transaction amount or wait for limits to reset'
    });

    // Network errors
    this.recoveryStrategies.set(WalletErrorType.NETWORK_ERROR, {
      errorType: WalletErrorType.NETWORK_ERROR,
      strategy: RecoveryStrategy.RETRY,
      maxRetries: 3,
      retryDelay: 2000,
      backoffMultiplier: 2,
      maxRetryDelay: 10000
    });

    // Service errors
    this.recoveryStrategies.set(WalletErrorType.QLOCK_FAILED, {
      errorType: WalletErrorType.QLOCK_FAILED,
      strategy: RecoveryStrategy.RECONNECT_SERVICE,
      maxRetries: 2,
      retryDelay: 3000,
      backoffMultiplier: 2,
      maxRetryDelay: 15000,
      fallbackMethod: 'manual_signing'
    });

    this.recoveryStrategies.set(WalletErrorType.QONSENT_BLOCKED, {
      errorType: WalletErrorType.QONSENT_BLOCKED,
      strategy: RecoveryStrategy.USER_ACTION,
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      userActionRequired: 'Check your privacy settings and permissions'
    });

    this.recoveryStrategies.set(WalletErrorType.QERBEROS_LOG_FAILED, {
      errorType: WalletErrorType.QERBEROS_LOG_FAILED,
      strategy: RecoveryStrategy.FALLBACK,
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 5000,
      fallbackMethod: 'local_logging'
    });

    // Pi Wallet errors
    this.recoveryStrategies.set(WalletErrorType.PI_WALLET_CONNECTION_FAILED, {
      errorType: WalletErrorType.PI_WALLET_CONNECTION_FAILED,
      strategy: RecoveryStrategy.RECONNECT_SERVICE,
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2,
      maxRetryDelay: 20000
    });

    // Security violations
    this.recoveryStrategies.set(WalletErrorType.SECURITY_VIOLATION, {
      errorType: WalletErrorType.SECURITY_VIOLATION,
      strategy: RecoveryStrategy.BLOCK_OPERATION,
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0,
      escalationLevel: 'SECURITY',
      autoEscalateAfter: 0
    });

    // Unknown errors
    this.recoveryStrategies.set(WalletErrorType.UNKNOWN_ERROR, {
      errorType: WalletErrorType.UNKNOWN_ERROR,
      strategy: RecoveryStrategy.RETRY,
      maxRetries: 1,
      retryDelay: 2000,
      backoffMultiplier: 2,
      maxRetryDelay: 5000,
      escalationLevel: 'SUPPORT',
      autoEscalateAfter: 5
    });
  }

  private initializeCriticalFailurePolicies(): void {
    // Data corruption
    this.criticalFailurePolicies.set(WalletErrorType.DATA_CORRUPTION, {
      failureType: WalletErrorType.DATA_CORRUPTION,
      systemBehavior: 'EMERGENCY_MODE',
      recoveryStrategy: RecoveryStrategy.ESCALATE,
      notificationLevel: 'ALL',
      autoActions: [
        { action: 'LOG', delay: 0 },
        { action: 'ALERT', delay: 0 },
        { action: 'ESCALATE', delay: 1000 }
      ],
      rollbackRequired: true,
      dataIntegrityCheck: true
    });

    // Security violations
    this.criticalFailurePolicies.set(WalletErrorType.FRAUD_DETECTED, {
      failureType: WalletErrorType.FRAUD_DETECTED,
      systemBehavior: 'PAUSE_OPERATIONS',
      recoveryStrategy: RecoveryStrategy.BLOCK_OPERATION,
      notificationLevel: 'SECURITY',
      autoActions: [
        { action: 'LOG', delay: 0 },
        { action: 'BLOCK_USER', delay: 0 },
        { action: 'ALERT', delay: 500 },
        { action: 'ESCALATE', delay: 1000 }
      ],
      rollbackRequired: false,
      dataIntegrityCheck: true
    });
  }
}

// Export singleton instance
export const walletErrorHandler = new WalletErrorHandler();