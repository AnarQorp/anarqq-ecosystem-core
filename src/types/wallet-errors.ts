/**
 * Comprehensive Wallet Error Handling System
 * Defines error types, classification, recovery strategies, and user-friendly messaging
 * Requirements: 6.6, Error handling design
 */

import { IdentityType } from './identity';

// Core Error Classification
export enum WalletErrorType {
  // Permission and Access Errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IDENTITY_NOT_FOUND = 'IDENTITY_NOT_FOUND',
  WALLET_FROZEN = 'WALLET_FROZEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  DEVICE_NOT_VERIFIED = 'DEVICE_NOT_VERIFIED',
  
  // Transaction Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  TOKEN_NOT_SUPPORTED = 'TOKEN_NOT_SUPPORTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // Service Integration Errors
  QONSENT_BLOCKED = 'QONSENT_BLOCKED',
  QONSENT_TIMEOUT = 'QONSENT_TIMEOUT',
  QLOCK_FAILED = 'QLOCK_FAILED',
  QLOCK_UNAVAILABLE = 'QLOCK_UNAVAILABLE',
  QERBEROS_LOG_FAILED = 'QERBEROS_LOG_FAILED',
  
  // Pi Wallet Errors
  PI_WALLET_NOT_LINKED = 'PI_WALLET_NOT_LINKED',
  PI_WALLET_CONNECTION_FAILED = 'PI_WALLET_CONNECTION_FAILED',
  PI_WALLET_INSUFFICIENT_BALANCE = 'PI_WALLET_INSUFFICIENT_BALANCE',
  PI_WALLET_TRANSFER_FAILED = 'PI_WALLET_TRANSFER_FAILED',
  PI_WALLET_API_ERROR = 'PI_WALLET_API_ERROR',
  
  // Network and System Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  GOVERNANCE_REQUIRED = 'GOVERNANCE_REQUIRED',
  
  // Security Violations
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error Severity Levels
export enum WalletErrorSeverity {
  LOW = 'LOW',           // Minor issues, user can continue
  MEDIUM = 'MEDIUM',     // Significant issues, some functionality affected
  HIGH = 'HIGH',         // Major issues, wallet operations blocked
  CRITICAL = 'CRITICAL'  // System-wide issues, immediate attention required
}

// Recovery Strategy Types
export enum RecoveryStrategy {
  RETRY = 'RETRY',                           // Automatic retry with backoff
  FALLBACK = 'FALLBACK',                     // Use alternative method
  USER_ACTION = 'USER_ACTION',               // Requires user intervention
  ESCALATE = 'ESCALATE',                     // Escalate to support/admin
  BLOCK_OPERATION = 'BLOCK_OPERATION',       // Block the operation permanently
  REFRESH_SESSION = 'REFRESH_SESSION',       // Refresh user session
  RECONNECT_SERVICE = 'RECONNECT_SERVICE'    // Reconnect to external service
}

// Core Wallet Error Interface
export interface WalletError {
  // Error Identification
  type: WalletErrorType;
  code: string;
  message: string;
  userMessage: string;
  
  // Context Information
  identityId?: string;
  identityType?: IdentityType;
  operation?: string;
  operationType?: 'TRANSFER' | 'MINT' | 'SIGN' | 'DEFI' | 'DAO_CREATE' | 'CONFIG_CHANGE' | 'EMERGENCY';
  
  // Error Details
  severity: WalletErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  details?: Record<string, any>;
  originalError?: Error;
  
  // Recovery Information
  suggestedActions: string[];
  recoveryStrategy: RecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  
  // Metadata
  timestamp: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  
  // User Guidance
  helpUrl?: string;
  contactSupport?: boolean;
  escalationLevel?: 'SUPPORT' | 'ADMIN' | 'SECURITY';
}

// Error Recovery Result
export interface ErrorRecoveryResult {
  success: boolean;
  action: RecoveryStrategy;
  recovered: boolean;
  retryCount: number;
  nextRetryAt?: string;
  fallbackUsed?: boolean;
  userActionRequired?: string;
  escalated?: boolean;
  metadata?: Record<string, any>;
}

// Error Recovery Strategy Configuration
export interface ErrorRecoveryStrategy {
  errorType: WalletErrorType;
  strategy: RecoveryStrategy;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  fallbackMethod?: string;
  userActionRequired?: string;
  escalationLevel?: 'SUPPORT' | 'ADMIN' | 'SECURITY';
  autoEscalateAfter?: number; // minutes
  conditions?: {
    identityTypes?: IdentityType[];
    operations?: string[];
    severity?: WalletErrorSeverity[];
  };
}

// Critical Failure Response Policy
export interface CriticalFailurePolicy {
  failureType: WalletErrorType;
  systemBehavior: 'PAUSE_OPERATIONS' | 'DEGRADE_GRACEFULLY' | 'EMERGENCY_MODE' | 'SHUTDOWN';
  recoveryStrategy: RecoveryStrategy;
  notificationLevel: 'USER' | 'ADMIN' | 'SECURITY' | 'ALL';
  autoActions: Array<{
    action: 'LOG' | 'ALERT' | 'BLOCK_USER' | 'FREEZE_WALLET' | 'ESCALATE';
    delay?: number;
    conditions?: Record<string, any>;
  }>;
  rollbackRequired: boolean;
  dataIntegrityCheck: boolean;
}

// Error Context for Enhanced Debugging
export interface ErrorContext {
  // Request Context
  requestId: string;
  sessionId: string;
  userId?: string;
  identityId?: string;
  
  // Operation Context
  operation: string;
  operationType?: string;
  parameters?: Record<string, any>;
  
  // System Context
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  
  // Application Context
  version: string;
  environment: 'development' | 'staging' | 'production';
  feature?: string;
  component?: string;
  
  // Performance Context
  duration?: number;
  memoryUsage?: number;
  networkLatency?: number;
  
  // Chain of Events
  previousErrors?: WalletError[];
  relatedOperations?: string[];
  
  // Debug Information
  debugInfo?: Record<string, any>;
  breadcrumbs?: Array<{
    timestamp: string;
    category: string;
    message: string;
    data?: Record<string, any>;
  }>;
}

// User-Friendly Error Messages
export interface ErrorMessage {
  title: string;
  description: string;
  actionText?: string;
  actionUrl?: string;
  icon?: string;
  color?: 'error' | 'warning' | 'info';
  dismissible?: boolean;
  persistent?: boolean;
}

// Error Analytics and Reporting
export interface ErrorAnalytics {
  errorId: string;
  errorType: WalletErrorType;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  affectedUsers: number;
  affectedIdentities: string[];
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolution: string;
    preventionMeasures?: string[];
  };
  impact: {
    severity: WalletErrorSeverity;
    operationsBlocked: number;
    usersAffected: number;
    financialImpact?: number;
  };
}

// Error Handler Interface
export interface WalletErrorHandler {
  // Core Error Handling
  handleError(error: Error | WalletError, context?: ErrorContext): Promise<ErrorRecoveryResult>;
  classifyError(error: Error, context?: ErrorContext): WalletError;
  
  // Recovery Management
  attemptRecovery(walletError: WalletError, context?: ErrorContext): Promise<ErrorRecoveryResult>;
  getRecoveryStrategy(errorType: WalletErrorType): ErrorRecoveryStrategy;
  
  // User Communication
  getUserMessage(walletError: WalletError): ErrorMessage;
  getSuggestedActions(walletError: WalletError): string[];
  
  // Error Tracking
  logError(walletError: WalletError, context?: ErrorContext): Promise<void>;
  reportError(walletError: WalletError, context?: ErrorContext): Promise<void>;
  
  // Analytics
  getErrorAnalytics(timeRange?: { start: string; end: string }): Promise<ErrorAnalytics[]>;
  getErrorTrends(): Promise<Record<WalletErrorType, number>>;
}

// Specialized Error Types for Different Scenarios

export class WalletPermissionError extends Error implements WalletError {
  type = WalletErrorType.PERMISSION_DENIED;
  code = 'WALLET_PERMISSION_DENIED';
  userMessage: string;
  severity = WalletErrorSeverity.MEDIUM;
  recoverable = false;
  retryable = false;
  suggestedActions: string[];
  recoveryStrategy = RecoveryStrategy.USER_ACTION;
  timestamp: string;

  constructor(
    message: string,
    public identityId?: string,
    public operation?: string,
    public requiredPermission?: string
  ) {
    super(message);
    this.name = 'WalletPermissionError';
    this.userMessage = this.generateUserMessage();
    this.suggestedActions = this.generateSuggestedActions();
    this.timestamp = new Date().toISOString();
  }

  private generateUserMessage(): string {
    if (this.operation) {
      return `You don't have permission to perform ${this.operation}. Please check your identity permissions or contact your administrator.`;
    }
    return 'You don\'t have permission to perform this wallet operation.';
  }

  private generateSuggestedActions(): string[] {
    const actions = ['Check your identity permissions'];
    if (this.requiredPermission) {
      actions.push(`Ensure you have the '${this.requiredPermission}' permission`);
    }
    actions.push('Contact your administrator if you believe this is an error');
    return actions;
  }
}

export class WalletTransactionError extends Error implements WalletError {
  type: WalletErrorType;
  code: string;
  userMessage: string;
  severity: WalletErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  suggestedActions: string[];
  recoveryStrategy: RecoveryStrategy;
  timestamp: string;

  constructor(
    message: string,
    errorType: WalletErrorType,
    public identityId?: string,
    public amount?: number,
    public token?: string,
    public recipient?: string
  ) {
    super(message);
    this.name = 'WalletTransactionError';
    this.type = errorType;
    this.code = `WALLET_${errorType}`;
    this.timestamp = new Date().toISOString();
    
    this.severity = this.determineSeverity();
    this.recoverable = this.determineRecoverable();
    this.retryable = this.determineRetryable();
    this.recoveryStrategy = this.determineRecoveryStrategy();
    this.userMessage = this.generateUserMessage();
    this.suggestedActions = this.generateSuggestedActions();
  }

  private determineSeverity(): WalletErrorSeverity {
    switch (this.type) {
      case WalletErrorType.INSUFFICIENT_BALANCE:
      case WalletErrorType.INVALID_AMOUNT:
      case WalletErrorType.INVALID_RECIPIENT:
        return WalletErrorSeverity.LOW;
      case WalletErrorType.LIMIT_EXCEEDED:
      case WalletErrorType.TOKEN_NOT_SUPPORTED:
        return WalletErrorSeverity.MEDIUM;
      case WalletErrorType.TRANSACTION_FAILED:
        return WalletErrorSeverity.HIGH;
      default:
        return WalletErrorSeverity.MEDIUM;
    }
  }

  private determineRecoverable(): boolean {
    return [
      WalletErrorType.INSUFFICIENT_BALANCE,
      WalletErrorType.INVALID_AMOUNT,
      WalletErrorType.INVALID_RECIPIENT,
      WalletErrorType.LIMIT_EXCEEDED
    ].includes(this.type);
  }

  private determineRetryable(): boolean {
    return [
      WalletErrorType.TRANSACTION_FAILED,
      WalletErrorType.NETWORK_ERROR
    ].includes(this.type);
  }

  private determineRecoveryStrategy(): RecoveryStrategy {
    switch (this.type) {
      case WalletErrorType.INSUFFICIENT_BALANCE:
      case WalletErrorType.INVALID_AMOUNT:
      case WalletErrorType.INVALID_RECIPIENT:
        return RecoveryStrategy.USER_ACTION;
      case WalletErrorType.LIMIT_EXCEEDED:
        return RecoveryStrategy.USER_ACTION;
      case WalletErrorType.TRANSACTION_FAILED:
        return RecoveryStrategy.RETRY;
      default:
        return RecoveryStrategy.USER_ACTION;
    }
  }

  private generateUserMessage(): string {
    switch (this.type) {
      case WalletErrorType.INSUFFICIENT_BALANCE:
        return `Insufficient balance to complete the transaction. You need ${this.amount} ${this.token || 'tokens'}.`;
      case WalletErrorType.LIMIT_EXCEEDED:
        return 'Transaction amount exceeds your wallet limits. Please try a smaller amount.';
      case WalletErrorType.INVALID_RECIPIENT:
        return 'The recipient address is invalid. Please check and try again.';
      case WalletErrorType.INVALID_AMOUNT:
        return 'The transaction amount is invalid. Please enter a valid amount.';
      case WalletErrorType.TOKEN_NOT_SUPPORTED:
        return `The token '${this.token}' is not supported for your identity type.`;
      case WalletErrorType.TRANSACTION_FAILED:
        return 'Transaction failed to process. Please try again.';
      default:
        return 'Transaction could not be completed. Please try again.';
    }
  }

  private generateSuggestedActions(): string[] {
    switch (this.type) {
      case WalletErrorType.INSUFFICIENT_BALANCE:
        return [
          'Add funds to your wallet',
          'Try a smaller amount',
          'Check your available balance'
        ];
      case WalletErrorType.LIMIT_EXCEEDED:
        return [
          'Try a smaller amount',
          'Wait for your limits to reset',
          'Contact support to increase limits'
        ];
      case WalletErrorType.INVALID_RECIPIENT:
        return [
          'Double-check the recipient address',
          'Copy the address from a trusted source',
          'Verify the address format'
        ];
      case WalletErrorType.INVALID_AMOUNT:
        return [
          'Enter a positive amount',
          'Check for decimal places',
          'Ensure amount is within valid range'
        ];
      case WalletErrorType.TOKEN_NOT_SUPPORTED:
        return [
          'Choose a supported token',
          'Check your identity permissions',
          'Contact support for token approval'
        ];
      case WalletErrorType.TRANSACTION_FAILED:
        return [
          'Try again in a few moments',
          'Check your network connection',
          'Contact support if problem persists'
        ];
      default:
        return ['Try again', 'Contact support if problem persists'];
    }
  }
}

export class WalletServiceError extends Error implements WalletError {
  type: WalletErrorType;
  code: string;
  userMessage: string;
  severity = WalletErrorSeverity.HIGH;
  recoverable = true;
  retryable = true;
  suggestedActions: string[];
  recoveryStrategy: RecoveryStrategy;
  timestamp: string;

  constructor(
    message: string,
    public service: 'QLOCK' | 'QONSENT' | 'QERBEROS' | 'PI_WALLET',
    public identityId?: string,
    public operation?: string
  ) {
    super(message);
    this.name = 'WalletServiceError';
    this.type = this.determineErrorType();
    this.code = `WALLET_${this.type}`;
    this.timestamp = new Date().toISOString();
    this.recoveryStrategy = this.determineRecoveryStrategy();
    this.userMessage = this.generateUserMessage();
    this.suggestedActions = this.generateSuggestedActions();
  }

  private determineErrorType(): WalletErrorType {
    switch (this.service) {
      case 'QLOCK':
        return WalletErrorType.QLOCK_FAILED;
      case 'QONSENT':
        return WalletErrorType.QONSENT_BLOCKED;
      case 'QERBEROS':
        return WalletErrorType.QERBEROS_LOG_FAILED;
      case 'PI_WALLET':
        return WalletErrorType.PI_WALLET_CONNECTION_FAILED;
      default:
        return WalletErrorType.SERVICE_UNAVAILABLE;
    }
  }

  private determineRecoveryStrategy(): RecoveryStrategy {
    switch (this.service) {
      case 'QLOCK':
      case 'PI_WALLET':
        return RecoveryStrategy.RECONNECT_SERVICE;
      case 'QONSENT':
        return RecoveryStrategy.USER_ACTION;
      case 'QERBEROS':
        return RecoveryStrategy.FALLBACK;
      default:
        return RecoveryStrategy.RETRY;
    }
  }

  private generateUserMessage(): string {
    switch (this.service) {
      case 'QLOCK':
        return 'Unable to sign the transaction. The signing service is temporarily unavailable.';
      case 'QONSENT':
        return 'This operation is blocked by your privacy settings. Please check your permissions.';
      case 'QERBEROS':
        return 'Unable to log the operation. The audit service is temporarily unavailable.';
      case 'PI_WALLET':
        return 'Unable to connect to Pi Wallet. Please check your connection and try again.';
      default:
        return 'A required service is temporarily unavailable. Please try again.';
    }
  }

  private generateSuggestedActions(): string[] {
    switch (this.service) {
      case 'QLOCK':
        return [
          'Try again in a few moments',
          'Check your network connection',
          'Ensure your signing keys are available'
        ];
      case 'QONSENT':
        return [
          'Check your privacy settings',
          'Review your permissions',
          'Contact support if settings are correct'
        ];
      case 'QERBEROS':
        return [
          'Operation will be logged when service recovers',
          'Continue with your transaction',
          'Contact support if logging is critical'
        ];
      case 'PI_WALLET':
        return [
          'Check your Pi Wallet connection',
          'Verify your Pi Wallet credentials',
          'Try reconnecting to Pi Wallet'
        ];
      default:
        return ['Try again', 'Contact support if problem persists'];
    }
  }
}