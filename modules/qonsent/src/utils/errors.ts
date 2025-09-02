export enum ErrorCodes {
  // Authentication & Authorization
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  IDENTITY_NOT_FOUND = 'IDENTITY_NOT_FOUND',
  
  // Permission Management
  PERMISSION_CHECK_FAILED = 'PERMISSION_CHECK_FAILED',
  PERMISSION_GRANT_FAILED = 'PERMISSION_GRANT_FAILED',
  PERMISSION_REVOKE_FAILED = 'PERMISSION_REVOKE_FAILED',
  PERMISSION_LIST_FAILED = 'PERMISSION_LIST_FAILED',
  INVALID_PERMISSIONS = 'INVALID_PERMISSIONS',
  GRANT_NOT_FOUND = 'GRANT_NOT_FOUND',
  
  // Policy Management
  POLICY_CREATION_FAILED = 'POLICY_CREATION_FAILED',
  POLICY_UPDATE_FAILED = 'POLICY_UPDATE_FAILED',
  POLICY_DELETE_FAILED = 'POLICY_DELETE_FAILED',
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_EVALUATION_FAILED = 'POLICY_EVALUATION_FAILED',
  INVALID_POLICY_FORMAT = 'INVALID_POLICY_FORMAT',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_RESOURCE_FORMAT = 'INVALID_RESOURCE_FORMAT',
  INVALID_IDENTITY_FORMAT = 'INVALID_IDENTITY_FORMAT',
  INVALID_ACTION = 'INVALID_ACTION',
  
  // External Services
  SQUID_SERVICE_ERROR = 'SQUID_SERVICE_ERROR',
  QERBEROS_SERVICE_ERROR = 'QERBEROS_SERVICE_ERROR',
  QLOCK_SERVICE_ERROR = 'QLOCK_SERVICE_ERROR',
  QINDEX_SERVICE_ERROR = 'QINDEX_SERVICE_ERROR',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  
  // Cache
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CONNECTION_ERROR = 'CACHE_CONNECTION_ERROR',
  
  // Event Bus
  EVENT_PUBLISH_FAILED = 'EVENT_PUBLISH_FAILED',
  EVENT_BUS_CONNECTION_ERROR = 'EVENT_BUS_CONNECTION_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // General
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export class QonsentError extends Error {
  public readonly code: ErrorCodes;
  public readonly details?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly statusCode: number;

  constructor(
    code: ErrorCodes,
    message: string,
    details?: Record<string, any>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'QonsentError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.statusCode = this.getStatusCode(code);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QonsentError);
    }
  }

  private getStatusCode(code: ErrorCodes): number {
    switch (code) {
      case ErrorCodes.INVALID_TOKEN:
      case ErrorCodes.TOKEN_EXPIRED:
        return 401;
      
      case ErrorCodes.INSUFFICIENT_PERMISSIONS:
        return 403;
      
      case ErrorCodes.GRANT_NOT_FOUND:
      case ErrorCodes.POLICY_NOT_FOUND:
      case ErrorCodes.IDENTITY_NOT_FOUND:
        return 404;
      
      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.INVALID_PERMISSIONS:
      case ErrorCodes.INVALID_RESOURCE_FORMAT:
      case ErrorCodes.INVALID_IDENTITY_FORMAT:
      case ErrorCodes.INVALID_ACTION:
      case ErrorCodes.INVALID_POLICY_FORMAT:
        return 400;
      
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        return 429;
      
      case ErrorCodes.SERVICE_UNAVAILABLE:
      case ErrorCodes.DATABASE_CONNECTION_ERROR:
      case ErrorCodes.CACHE_CONNECTION_ERROR:
      case ErrorCodes.EVENT_BUS_CONNECTION_ERROR:
        return 503;
      
      case ErrorCodes.TIMEOUT_ERROR:
        return 504;
      
      default:
        return 500;
    }
  }

  toJSON() {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      timestamp: new Date().toISOString(),
    };
  }

  static fromError(error: Error, code: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR): QonsentError {
    if (error instanceof QonsentError) {
      return error;
    }

    return new QonsentError(
      code,
      error.message,
      { originalError: error.name, stack: error.stack }
    );
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof QonsentError) {
    return error.retryable;
  }

  // Consider network errors and timeouts as retryable
  const retryablePatterns = [
    /ECONNRESET/,
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /socket hang up/,
  ];

  return retryablePatterns.some(pattern => pattern.test(error.message));
}

export function getErrorSuggestedActions(code: ErrorCodes): string[] {
  switch (code) {
    case ErrorCodes.INVALID_TOKEN:
      return ['Obtain a new authentication token', 'Check token format'];
    
    case ErrorCodes.TOKEN_EXPIRED:
      return ['Refresh the authentication token', 'Re-authenticate'];
    
    case ErrorCodes.INSUFFICIENT_PERMISSIONS:
      return ['Request additional permissions', 'Contact resource owner'];
    
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return ['Wait before retrying', 'Reduce request frequency'];
    
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return ['Retry after a delay', 'Check service status'];
    
    case ErrorCodes.VALIDATION_ERROR:
      return ['Check request format', 'Validate input parameters'];
    
    default:
      return ['Contact support if the issue persists'];
  }
}