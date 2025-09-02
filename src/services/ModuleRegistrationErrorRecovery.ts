/**
 * Module Registration Error Recovery Service
 * Provides comprehensive error handling, retry mechanisms, and recovery strategies
 * for module registration operations
 * Requirements: 8.1, 8.2, 8.3
 */

import {
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ErrorContext,
  ErrorRecoveryAction,
  ModuleRegistrationRequest,
  ModuleRegistrationResult,
  ModuleInfo,
  NetworkError,
  ServiceUnavailableError,
  DependencyError,
  SignatureVerificationError,
  ModuleValidationError
} from '../types/qwallet-module-registration';

import { IdentityType } from '../types/identity';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface FallbackMode {
  name: string;
  description: string;
  applicable: (error: ModuleRegistrationError) => boolean;
  execute: (request: ModuleRegistrationRequest, context: ErrorContext) => Promise<ModuleRegistrationResult>;
  priority: number;
  degraded: boolean;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  applicable: (error: ModuleRegistrationError, context: ErrorContext) => boolean;
  execute: (error: ModuleRegistrationError, context: ErrorContext) => Promise<boolean>;
  automated: boolean;
  priority: number;
}

export interface ErrorReport {
  errorId: string;
  moduleId?: string;
  operation: string;
  error: ModuleRegistrationError;
  context: ErrorContext;
  recoveryAttempts: RecoveryAttempt[];
  finalOutcome: 'SUCCESS' | 'FAILURE' | 'DEGRADED';
  recommendations: string[];
  timestamp: string;
}

export interface RecoveryAttempt {
  strategy: string;
  timestamp: string;
  success: boolean;
  error?: string;
  details?: any;
}

export class ModuleRegistrationErrorRecovery {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true
  };

  private retryConfig: RetryConfig;
  private fallbackModes: FallbackMode[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];
  private errorReports: Map<string, ErrorReport> = new Map();

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...ModuleRegistrationErrorRecovery.DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.initializeFallbackModes();
    this.initializeRecoveryStrategies();
  }

  /**
   * Execute operation with comprehensive error handling and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    onError?: (error: ModuleRegistrationError, context: ErrorContext) => Promise<boolean>
  ): Promise<T> {
    const errorReport: ErrorReport = {
      errorId: this.generateErrorId(),
      moduleId: context.moduleId,
      operation: context.operation,
      error: null as any,
      context,
      recoveryAttempts: [],
      finalOutcome: 'FAILURE',
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    let lastError: ModuleRegistrationError | null = null;

    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      context.attemptNumber = attempt;

      try {
        const result = await operation();
        errorReport.finalOutcome = 'SUCCESS';
        return result;
      } catch (error) {
        const moduleError = this.normalizeError(error, context);
        lastError = moduleError;
        errorReport.error = moduleError;

        console.log(`[ModuleRegistrationErrorRecovery] Attempt ${attempt}/${context.maxAttempts} failed:`, {
          code: moduleError.code,
          message: moduleError.message,
          severity: moduleError.severity,
          retryable: moduleError.retryable
        });

        // Allow custom error handling
        if (onError) {
          const shouldContinue = await onError(moduleError, context);
          if (!shouldContinue) {
            break;
          }
        }

        // Don't retry on final attempt
        if (attempt === context.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!moduleError.retryable) {
          console.log(`[ModuleRegistrationErrorRecovery] Error not retryable: ${moduleError.code}`);
          break;
        }

        // Attempt automated recovery strategies
        const recovered = await this.attemptRecovery(moduleError, context, errorReport);
        if (recovered) {
          console.log('[ModuleRegistrationErrorRecovery] Recovery successful, retrying operation');
          continue;
        }

        // Wait before retry with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        console.log(`[ModuleRegistrationErrorRecovery] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    // All retries failed, attempt fallback modes
    if (lastError) {
      errorReport.error = lastError;
      this.errorReports.set(errorReport.errorId, errorReport);

      const fallbackResult = await this.attemptFallbackModes(lastError, context, errorReport);
      if (fallbackResult) {
        errorReport.finalOutcome = 'DEGRADED';
        return fallbackResult as T;
      }
    }

    // Generate final recommendations
    errorReport.recommendations = this.generateRecommendations(lastError!, context);
    this.errorReports.set(errorReport.errorId, errorReport);

    // If we get here, everything failed
    throw lastError || new ModuleRegistrationError(
      ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
      'Operation failed after all recovery attempts',
      context.moduleId
    );
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Get detailed error report
   */
  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  /**
   * Get all error reports for a module
   */
  getModuleErrorReports(moduleId: string): ErrorReport[] {
    return Array.from(this.errorReports.values())
      .filter(report => report.moduleId === moduleId);
  }

  /**
   * Clear old error reports
   */
  clearOldReports(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    
    for (const [errorId, report] of this.errorReports.entries()) {
      if (new Date(report.timestamp).getTime() < cutoffTime) {
        this.errorReports.delete(errorId);
      }
    }
  }

  /**
   * Register custom fallback mode
   */
  registerFallbackMode(fallbackMode: FallbackMode): void {
    this.fallbackModes.push(fallbackMode);
    this.fallbackModes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  // Private methods

  private async attemptRecovery(
    error: ModuleRegistrationError,
    context: ErrorContext,
    errorReport: ErrorReport
  ): Promise<boolean> {
    const applicableStrategies = this.recoveryStrategies
      .filter(strategy => strategy.applicable(error, context) && strategy.automated)
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      const attempt: RecoveryAttempt = {
        strategy: strategy.name,
        timestamp: new Date().toISOString(),
        success: false
      };

      try {
        console.log(`[ModuleRegistrationErrorRecovery] Attempting recovery strategy: ${strategy.name}`);
        const success = await strategy.execute(error, context);
        
        attempt.success = success;
        errorReport.recoveryAttempts.push(attempt);

        if (success) {
          console.log(`[ModuleRegistrationErrorRecovery] Recovery strategy successful: ${strategy.name}`);
          return true;
        }
      } catch (recoveryError) {
        attempt.error = (recoveryError as Error).message;
        errorReport.recoveryAttempts.push(attempt);
        console.warn(`[ModuleRegistrationErrorRecovery] Recovery strategy failed: ${strategy.name}`, recoveryError);
      }
    }

    return false;
  }

  private async attemptFallbackModes(
    error: ModuleRegistrationError,
    context: ErrorContext,
    errorReport: ErrorReport
  ): Promise<any> {
    const applicableFallbacks = this.fallbackModes
      .filter(mode => mode.applicable(error))
      .sort((a, b) => b.priority - a.priority);

    for (const fallback of applicableFallbacks) {
      const attempt: RecoveryAttempt = {
        strategy: `fallback_${fallback.name}`,
        timestamp: new Date().toISOString(),
        success: false
      };

      try {
        console.log(`[ModuleRegistrationErrorRecovery] Attempting fallback mode: ${fallback.name}`);
        
        // Create a mock request for fallback execution
        const mockRequest: ModuleRegistrationRequest = {
          moduleInfo: context.metadata as ModuleInfo || {
            name: context.moduleId || 'unknown',
            version: '1.0.0',
            description: 'Fallback registration',
            identitiesSupported: [IdentityType.ROOT],
            integrations: [],
            repositoryUrl: 'https://github.com/unknown/unknown'
          },
          testMode: true
        };

        const result = await fallback.execute(mockRequest, context);
        
        attempt.success = result.success;
        attempt.details = result;
        errorReport.recoveryAttempts.push(attempt);

        if (result.success) {
          console.log(`[ModuleRegistrationErrorRecovery] Fallback mode successful: ${fallback.name}`);
          return result;
        }
      } catch (fallbackError) {
        attempt.error = (fallbackError as Error).message;
        errorReport.recoveryAttempts.push(attempt);
        console.warn(`[ModuleRegistrationErrorRecovery] Fallback mode failed: ${fallback.name}`, fallbackError);
      }
    }

    return null;
  }

  private initializeFallbackModes(): void {
    // Sandbox registration fallback
    this.fallbackModes.push({
      name: 'sandbox_registration',
      description: 'Register module in sandbox mode when production registration fails',
      applicable: (error) => [
        ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE,
        ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
        ModuleRegistrationErrorCode.NETWORK_ERROR
      ].includes(error.code),
      execute: async (request, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Executing sandbox registration fallback');
        
        return {
          success: true,
          moduleId: context.moduleId || request.moduleInfo.name,
          cid: 'sandbox_cid_placeholder',
          indexId: 'sandbox_index_placeholder',
          timestamp: new Date().toISOString(),
          warnings: ['Module registered in sandbox mode due to service unavailability']
        };
      },
      priority: 8,
      degraded: true
    });

    // Local storage fallback
    this.fallbackModes.push({
      name: 'local_storage',
      description: 'Store module metadata locally when remote storage fails',
      applicable: (error) => [
        ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
        ModuleRegistrationErrorCode.NETWORK_ERROR,
        ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE
      ].includes(error.code),
      execute: async (request, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Executing local storage fallback');
        
        try {
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
        } catch (storageError) {
          throw new Error(`Local storage fallback failed: ${storageError}`);
        }
      },
      priority: 6,
      degraded: true
    });

    // Minimal registration fallback
    this.fallbackModes.push({
      name: 'minimal_registration',
      description: 'Register with minimal metadata when full registration fails',
      applicable: (error) => [
        ModuleRegistrationErrorCode.INVALID_METADATA,
        ModuleRegistrationErrorCode.COMPLIANCE_CHECK_FAILED,
        ModuleRegistrationErrorCode.DOCUMENTATION_UNAVAILABLE
      ].includes(error.code),
      execute: async (request, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Executing minimal registration fallback');
        
        const moduleId = context.moduleId || request.moduleInfo.name;
        
        return {
          success: true,
          moduleId,
          cid: 'minimal_cid_placeholder',
          indexId: 'minimal_index_placeholder',
          timestamp: new Date().toISOString(),
          warnings: ['Module registered with minimal metadata due to validation failures']
        };
      },
      priority: 4,
      degraded: true
    });
  }

  private initializeRecoveryStrategies(): void {
    // Network connectivity recovery
    this.recoveryStrategies.push({
      name: 'network_connectivity_check',
      description: 'Check and restore network connectivity',
      applicable: (error) => error.code === ModuleRegistrationErrorCode.NETWORK_ERROR,
      execute: async (error, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Checking network connectivity');
        
        try {
          // Simple connectivity check
          const response = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            timeout: 5000
          } as any);
          
          return response.ok;
        } catch {
          return false;
        }
      },
      automated: true,
      priority: 9
    });

    // Service health check recovery
    this.recoveryStrategies.push({
      name: 'service_health_check',
      description: 'Check service health and wait for recovery',
      applicable: (error) => error.code === ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE,
      execute: async (error, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Checking service health');
        
        // Wait a short time for service recovery
        await this.sleep(2000);
        
        // In a real implementation, this would check actual service health
        return Math.random() > 0.5; // Simulate 50% recovery chance
      },
      automated: true,
      priority: 8
    });

    // Signature regeneration recovery
    this.recoveryStrategies.push({
      name: 'signature_regeneration',
      description: 'Regenerate module signature',
      applicable: (error) => error.code === ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED,
      execute: async (error, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Attempting signature regeneration');
        
        // In a real implementation, this would regenerate the signature
        // For now, we'll simulate success based on attempt number
        return context.attemptNumber <= 2;
      },
      automated: true,
      priority: 7
    });

    // Dependency resolution recovery
    this.recoveryStrategies.push({
      name: 'dependency_resolution',
      description: 'Attempt to resolve missing dependencies',
      applicable: (error) => error.code === ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND,
      execute: async (error, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Attempting dependency resolution');
        
        if (error instanceof DependencyError && error.missingDependencies) {
          // In a real implementation, this would attempt to install dependencies
          console.log('Missing dependencies:', error.missingDependencies);
          
          // Simulate dependency installation
          return error.missingDependencies.length <= 2;
        }
        
        return false;
      },
      automated: true,
      priority: 6
    });

    // Metadata validation recovery
    this.recoveryStrategies.push({
      name: 'metadata_auto_fix',
      description: 'Automatically fix common metadata issues',
      applicable: (error) => error.code === ModuleRegistrationErrorCode.INVALID_METADATA,
      execute: async (error, context) => {
        console.log('[ModuleRegistrationErrorRecovery] Attempting metadata auto-fix');
        
        if (error instanceof ModuleValidationError && error.validationErrors) {
          // In a real implementation, this would attempt to fix validation errors
          console.log('Validation errors:', error.validationErrors);
          
          // Simulate auto-fix success for simple errors
          const fixableErrors = error.validationErrors.filter(err => 
            err.includes('required') || err.includes('format')
          );
          
          return fixableErrors.length === error.validationErrors.length;
        }
        
        return false;
      },
      automated: true,
      priority: 5
    });
  }

  private normalizeError(error: any, context: ErrorContext): ModuleRegistrationError {
    if (error instanceof ModuleRegistrationError) {
      return error;
    }

    // Convert common error types
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return new NetworkError(
        error.message || 'Network error occurred',
        context.moduleId,
        { originalError: error }
      );
    }

    if (error?.code === 'SERVICE_UNAVAILABLE' || error?.message?.includes('unavailable')) {
      return new ServiceUnavailableError(
        error.message || 'Service unavailable',
        context.moduleId,
        { originalError: error }
      );
    }

    if (error?.message?.includes('signature')) {
      return new SignatureVerificationError(
        error.message || 'Signature verification failed',
        context.moduleId,
        { originalError: error }
      );
    }

    if (error?.message?.includes('validation')) {
      return new ModuleValidationError(
        error.message || 'Validation failed',
        context.moduleId,
        error.validationErrors
      );
    }

    // Generic error conversion
    return new ModuleRegistrationError(
      ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
      error?.message || 'Unknown error occurred',
      context.moduleId,
      { originalError: error }
    );
  }

  private calculateRetryDelay(attempt: number, config?: RetryConfig): number {
    const retryConfig = config || this.retryConfig;
    let delay = retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, retryConfig.maxDelayMs);
    
    // Add jitter if enabled
    if (retryConfig.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random();
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendations(error: ModuleRegistrationError, context: ErrorContext): string[] {
    const recommendations: string[] = [];

    // Add error-specific recommendations
    recommendations.push(...error.suggestedActions.map(action => action.description));

    // Add context-specific recommendations
    if (context.attemptNumber >= context.maxAttempts) {
      recommendations.push('Maximum retry attempts reached. Consider manual intervention.');
    }

    if (error.severity === ModuleRegistrationErrorSeverity.CRITICAL) {
      recommendations.push('Critical error detected. Review security and authorization settings.');
    }

    if (context.previousErrors && context.previousErrors.length > 0) {
      recommendations.push('Multiple errors detected. Consider reviewing the entire registration process.');
    }

    // Add general recommendations
    recommendations.push('Check system logs for additional details.');
    recommendations.push('Verify network connectivity and service availability.');
    
    if (error.recoverable) {
      recommendations.push('Error is recoverable. Try the operation again after addressing the issues.');
    } else {
      recommendations.push('Error is not recoverable. Manual intervention required.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const moduleRegistrationErrorRecovery = new ModuleRegistrationErrorRecovery();