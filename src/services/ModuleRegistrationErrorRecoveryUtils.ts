/**
 * Module Registration Error Recovery Utilities
 * Utility functions and helpers for error handling and recovery
 * Requirements: 8.1, 8.2, 8.3
 */

import {
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ErrorContext,
  ErrorRecoveryAction
} from '../types/qwallet-module-registration';

import { ModuleRegistrationErrorRecovery } from './ModuleRegistrationErrorRecovery';

export interface ErrorAnalysis {
  errorId: string;
  category: 'TRANSIENT' | 'PERSISTENT' | 'CONFIGURATION' | 'AUTHORIZATION' | 'VALIDATION';
  severity: ModuleRegistrationErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  estimatedRecoveryTime: number; // in milliseconds
  recommendedActions: ErrorRecoveryAction[];
  rootCause?: string;
  preventionSuggestions: string[];
}

export interface RecoveryPlan {
  errorId: string;
  moduleId?: string;
  steps: RecoveryStep[];
  estimatedDuration: number;
  successProbability: number;
  fallbackOptions: string[];
}

export interface RecoveryStep {
  stepId: string;
  description: string;
  action: string;
  automated: boolean;
  estimatedDuration: number;
  dependencies: string[];
  successCriteria: string[];
}

export class ModuleRegistrationErrorRecoveryUtils {
  private static errorRecovery = new ModuleRegistrationErrorRecovery();

  /**
   * Analyze an error and provide detailed analysis
   */
  static analyzeError(error: ModuleRegistrationError, context?: ErrorContext): ErrorAnalysis {
    const errorId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      errorId,
      category: this.categorizeError(error),
      severity: error.severity,
      recoverable: error.recoverable,
      retryable: error.retryable,
      estimatedRecoveryTime: this.estimateRecoveryTime(error),
      recommendedActions: error.suggestedActions,
      rootCause: this.identifyRootCause(error, context),
      preventionSuggestions: this.generatePreventionSuggestions(error)
    };
  }

  /**
   * Create a recovery plan for an error
   */
  static createRecoveryPlan(error: ModuleRegistrationError, context?: ErrorContext): RecoveryPlan {
    const analysis = this.analyzeError(error, context);
    const steps = this.generateRecoverySteps(error, analysis);
    
    return {
      errorId: analysis.errorId,
      moduleId: context?.moduleId,
      steps,
      estimatedDuration: steps.reduce((total, step) => total + step.estimatedDuration, 0),
      successProbability: this.calculateSuccessProbability(error, steps),
      fallbackOptions: this.identifyFallbackOptions(error)
    };
  }

  /**
   * Execute a recovery plan
   */
  static async executeRecoveryPlan(
    plan: RecoveryPlan,
    operation: () => Promise<any>,
    context: ErrorContext
  ): Promise<any> {
    console.log(`[ErrorRecoveryUtils] Executing recovery plan for error: ${plan.errorId}`);
    
    for (const step of plan.steps) {
      if (step.automated) {
        console.log(`[ErrorRecoveryUtils] Executing automated step: ${step.description}`);
        
        try {
          await this.executeRecoveryStep(step, context);
        } catch (stepError) {
          console.warn(`[ErrorRecoveryUtils] Recovery step failed: ${step.stepId}`, stepError);
          
          // If this step is critical, abort the plan
          if (step.dependencies.length === 0) {
            throw new Error(`Critical recovery step failed: ${step.description}`);
          }
        }
      } else {
        console.log(`[ErrorRecoveryUtils] Manual step required: ${step.description}`);
        // In a real implementation, this would prompt the user or create a task
      }
    }

    // After executing all steps, try the original operation
    return await operation();
  }

  /**
   * Get error statistics and patterns
   */
  static getErrorStatistics(moduleId?: string): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    commonPatterns: string[];
    recommendations: string[];
  } {
    const reports = moduleId 
      ? this.errorRecovery.getModuleErrorReports(moduleId)
      : Array.from((this.errorRecovery as any).errorReports.values());

    const totalErrors = reports.length;
    const errorsByCode: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    let successfulRecoveries = 0;

    reports.forEach(report => {
      const code = report.error.code;
      const severity = report.error.severity;
      
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
      
      if (report.finalOutcome === 'SUCCESS' || report.finalOutcome === 'DEGRADED') {
        successfulRecoveries++;
      }
    });

    const recoverySuccessRate = totalErrors > 0 ? successfulRecoveries / totalErrors : 0;
    const commonPatterns = this.identifyCommonPatterns(reports);
    const recommendations = this.generateSystemRecommendations(reports);

    return {
      totalErrors,
      errorsByCode,
      errorsBySeverity,
      recoverySuccessRate,
      commonPatterns,
      recommendations
    };
  }

  /**
   * Create a detailed error report for debugging
   */
  static createDetailedErrorReport(error: ModuleRegistrationError, context?: ErrorContext): string {
    const analysis = this.analyzeError(error, context);
    const plan = this.createRecoveryPlan(error, context);
    
    return `
# Module Registration Error Report

## Error Details
- **Error ID**: ${analysis.errorId}
- **Code**: ${error.code}
- **Message**: ${error.message}
- **User Message**: ${error.userMessage}
- **Severity**: ${error.severity}
- **Timestamp**: ${error.timestamp}
- **Module ID**: ${context?.moduleId || 'N/A'}

## Error Analysis
- **Category**: ${analysis.category}
- **Recoverable**: ${analysis.recoverable ? 'Yes' : 'No'}
- **Retryable**: ${analysis.retryable ? 'Yes' : 'No'}
- **Estimated Recovery Time**: ${analysis.estimatedRecoveryTime}ms
- **Root Cause**: ${analysis.rootCause || 'Unknown'}

## Context Information
${context ? `
- **Operation**: ${context.operation}
- **Identity ID**: ${context.identityId}
- **Attempt Number**: ${context.attemptNumber}/${context.maxAttempts}
- **Previous Errors**: ${context.previousErrors?.length || 0}
` : 'No context available'}

## Recommended Actions
${analysis.recommendedActions.map((action, index) => 
  `${index + 1}. **${action.action}**: ${action.description} ${action.automated ? '(Automated)' : '(Manual)'}`
).join('\n')}

## Recovery Plan
- **Estimated Duration**: ${plan.estimatedDuration}ms
- **Success Probability**: ${(plan.successProbability * 100).toFixed(1)}%
- **Steps**: ${plan.steps.length}

### Recovery Steps
${plan.steps.map((step, index) => 
  `${index + 1}. **${step.description}** ${step.automated ? '(Auto)' : '(Manual)'}\n   - Duration: ${step.estimatedDuration}ms\n   - Dependencies: ${step.dependencies.join(', ') || 'None'}`
).join('\n')}

## Fallback Options
${plan.fallbackOptions.map(option => `- ${option}`).join('\n')}

## Prevention Suggestions
${analysis.preventionSuggestions.map(suggestion => `- ${suggestion}`).join('\n')}

---
Generated at: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Validate error recovery configuration
   */
  static validateRecoveryConfiguration(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if error recovery is properly initialized
    if (!this.errorRecovery) {
      issues.push('Error recovery system not initialized');
    }

    // Check fallback modes
    const fallbackModes = (this.errorRecovery as any).fallbackModes || [];
    if (fallbackModes.length === 0) {
      issues.push('No fallback modes configured');
      recommendations.push('Configure at least one fallback mode for degraded operation');
    }

    // Check recovery strategies
    const recoveryStrategies = (this.errorRecovery as any).recoveryStrategies || [];
    if (recoveryStrategies.length === 0) {
      issues.push('No recovery strategies configured');
      recommendations.push('Configure automated recovery strategies for common errors');
    }

    // Check retry configuration
    const retryConfig = (this.errorRecovery as any).retryConfig;
    if (retryConfig && retryConfig.maxAttempts < 2) {
      recommendations.push('Consider increasing maximum retry attempts for better resilience');
    }

    if (retryConfig && retryConfig.maxDelayMs < 10000) {
      recommendations.push('Consider increasing maximum retry delay for better backoff');
    }

    // Always add some general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Consider increasing maximum retry attempts for better resilience');
      recommendations.push('Review error handling patterns and recovery strategies');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private helper methods

  private static categorizeError(error: ModuleRegistrationError): ErrorAnalysis['category'] {
    switch (error.code) {
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
      case ModuleRegistrationErrorCode.TIMEOUT_ERROR:
        return 'TRANSIENT';
      
      case ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER:
      case ModuleRegistrationErrorCode.INSUFFICIENT_PERMISSIONS:
        return 'AUTHORIZATION';
      
      case ModuleRegistrationErrorCode.INVALID_METADATA:
      case ModuleRegistrationErrorCode.CHECKSUM_MISMATCH:
      case ModuleRegistrationErrorCode.MALFORMED_REQUEST:
        return 'VALIDATION';
      
      case ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED:
      case ModuleRegistrationErrorCode.QERBEROS_LOGGING_FAILED:
        return 'CONFIGURATION';
      
      default:
        return 'PERSISTENT';
    }
  }

  private static estimateRecoveryTime(error: ModuleRegistrationError): number {
    switch (error.code) {
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        return 5000; // 5 seconds
      
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
        return 30000; // 30 seconds
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        return 10000; // 10 seconds
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        return 60000; // 1 minute
      
      default:
        return 15000; // 15 seconds default
    }
  }

  private static identifyRootCause(error: ModuleRegistrationError, context?: ErrorContext): string {
    if (error.details?.originalError) {
      return `Original error: ${error.details.originalError.message}`;
    }

    switch (error.code) {
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        return 'Network connectivity issues or service endpoint unavailable';
      
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
        return 'Network connectivity issues or service endpoint unavailable';
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        return 'Invalid signing key or corrupted signature data';
      
      case ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER:
        return 'Identity lacks required permissions for module registration';
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        return 'Required module dependencies are not available in the registry';
      
      default:
        return 'Unknown root cause - requires manual investigation';
    }
  }

  private static generatePreventionSuggestions(error: ModuleRegistrationError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        suggestions.push('Implement network connectivity monitoring');
        suggestions.push('Use connection pooling and keep-alive connections');
        suggestions.push('Add circuit breaker pattern for external services');
        break;
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        suggestions.push('Validate signing keys before use');
        suggestions.push('Implement key rotation policies');
        suggestions.push('Add signature validation in development pipeline');
        break;
      
      case ModuleRegistrationErrorCode.INVALID_METADATA:
        suggestions.push('Add metadata validation in CI/CD pipeline');
        suggestions.push('Use schema validation tools');
        suggestions.push('Implement metadata linting rules');
        break;
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        suggestions.push('Validate dependencies before registration');
        suggestions.push('Implement dependency pre-flight checks');
        suggestions.push('Maintain dependency compatibility matrix');
        break;
    }

    suggestions.push('Implement comprehensive error monitoring and alerting');
    suggestions.push('Regular system health checks and maintenance');

    return suggestions;
  }

  private static generateRecoverySteps(error: ModuleRegistrationError, analysis: ErrorAnalysis): RecoveryStep[] {
    const steps: RecoveryStep[] = [];

    // Add common first step
    steps.push({
      stepId: 'validate_preconditions',
      description: 'Validate system preconditions and dependencies',
      action: 'check_system_health',
      automated: true,
      estimatedDuration: 2000,
      dependencies: [],
      successCriteria: ['System health check passes', 'All required services available']
    });

    // Add error-specific steps
    switch (error.code) {
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        steps.push({
          stepId: 'check_connectivity',
          description: 'Verify network connectivity',
          action: 'network_health_check',
          automated: true,
          estimatedDuration: 3000,
          dependencies: ['validate_preconditions'],
          successCriteria: ['Network connectivity restored', 'Service endpoints reachable']
        });
        break;
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        steps.push({
          stepId: 'regenerate_signature',
          description: 'Regenerate module signature',
          action: 'signature_regeneration',
          automated: true,
          estimatedDuration: 5000,
          dependencies: ['validate_preconditions'],
          successCriteria: ['New signature generated', 'Signature validation passes']
        });
        break;
      
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
        steps.push({
          stepId: 'wait_for_service',
          description: 'Wait for service recovery',
          action: 'service_health_monitoring',
          automated: true,
          estimatedDuration: 15000,
          dependencies: ['validate_preconditions'],
          successCriteria: ['Service health check passes', 'Service accepts requests']
        });
        break;
    }

    // Add final verification step
    steps.push({
      stepId: 'verify_recovery',
      description: 'Verify recovery was successful',
      action: 'recovery_verification',
      automated: true,
      estimatedDuration: 1000,
      dependencies: steps.slice(1).map(s => s.stepId),
      successCriteria: ['All recovery steps completed', 'System ready for retry']
    });

    return steps;
  }

  private static calculateSuccessProbability(error: ModuleRegistrationError, steps: RecoveryStep[]): number {
    let baseProbability = 0.5; // 50% base success rate

    // Adjust based on error type
    if (error.retryable) {
      baseProbability += 0.2;
    }

    if (error.recoverable) {
      baseProbability += 0.2;
    }

    // Adjust based on severity
    switch (error.severity) {
      case ModuleRegistrationErrorSeverity.LOW:
        baseProbability += 0.2;
        break;
      case ModuleRegistrationErrorSeverity.MEDIUM:
        baseProbability += 0.1;
        break;
      case ModuleRegistrationErrorSeverity.HIGH:
        baseProbability -= 0.1;
        break;
      case ModuleRegistrationErrorSeverity.CRITICAL:
        baseProbability -= 0.2;
        break;
    }

    // Adjust based on number of automated steps
    const automatedSteps = steps.filter(s => s.automated).length;
    baseProbability += (automatedSteps * 0.05);

    return Math.max(0.1, Math.min(0.95, baseProbability));
  }

  private static identifyFallbackOptions(error: ModuleRegistrationError): string[] {
    const options: string[] = [];

    switch (error.code) {
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
      case ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED:
        options.push('Register in sandbox mode');
        options.push('Store locally and sync later');
        options.push('Use backup service endpoint');
        break;
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        options.push('Use manual signature verification');
        options.push('Register with reduced security mode');
        break;
      
      case ModuleRegistrationErrorCode.INVALID_METADATA:
        options.push('Register with minimal metadata');
        options.push('Skip optional validation checks');
        break;
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        options.push('Register without dependency validation');
        options.push('Use alternative dependency versions');
        break;
    }

    options.push('Contact system administrator');
    options.push('Defer registration to maintenance window');

    return options;
  }

  private static async executeRecoveryStep(step: RecoveryStep, context: ErrorContext): Promise<void> {
    console.log(`[ErrorRecoveryUtils] Executing recovery step: ${step.stepId}`);
    
    switch (step.action) {
      case 'check_system_health':
        // Simulate system health check
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      
      case 'network_health_check':
        // Simulate network connectivity check
        try {
          await fetch('https://httpbin.org/status/200', { method: 'HEAD' });
        } catch (error) {
          throw new Error('Network connectivity check failed');
        }
        break;
      
      case 'signature_regeneration':
        // Simulate signature regeneration
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      
      case 'service_health_monitoring':
        // Simulate service health monitoring
        await new Promise(resolve => setTimeout(resolve, 5000));
        break;
      
      case 'recovery_verification':
        // Simulate recovery verification
        await new Promise(resolve => setTimeout(resolve, 500));
        break;
      
      default:
        console.warn(`[ErrorRecoveryUtils] Unknown recovery action: ${step.action}`);
    }
  }

  private static identifyCommonPatterns(reports: any[]): string[] {
    const patterns: string[] = [];
    
    if (reports.length === 0) return patterns;

    // Analyze error frequency
    const errorCounts: Record<string, number> = {};
    reports.forEach(report => {
      errorCounts[report.error.code] = (errorCounts[report.error.code] || 0) + 1;
    });

    const mostCommonError = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonError && mostCommonError[1] > reports.length * 0.3) {
      patterns.push(`High frequency of ${mostCommonError[0]} errors (${mostCommonError[1]} occurrences)`);
    }

    // Analyze time patterns
    const recentErrors = reports.filter(report => 
      new Date(report.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (recentErrors.length > reports.length * 0.5) {
      patterns.push('High error rate in the last 24 hours');
    }

    // Analyze recovery patterns
    const failedRecoveries = reports.filter(report => report.finalOutcome === 'FAILURE');
    if (failedRecoveries.length > reports.length * 0.3) {
      patterns.push('High recovery failure rate - review recovery strategies');
    }

    return patterns;
  }

  private static generateSystemRecommendations(reports: any[]): string[] {
    const recommendations: string[] = [];
    
    if (reports.length === 0) {
      recommendations.push('No errors recorded - system appears healthy');
      return recommendations;
    }

    const errorCounts: Record<string, number> = {};
    reports.forEach(report => {
      errorCounts[report.error.code] = (errorCounts[report.error.code] || 0) + 1;
    });

    // Network-related recommendations
    if (errorCounts[ModuleRegistrationErrorCode.NETWORK_ERROR] > 0) {
      recommendations.push('Implement network resilience patterns (circuit breaker, retry with backoff)');
    }

    // Service availability recommendations
    if (errorCounts[ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE] > 0) {
      recommendations.push('Consider implementing service health monitoring and alerting');
    }

    // Security recommendations
    if (errorCounts[ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED] > 0) {
      recommendations.push('Review signature generation and validation processes');
    }

    // General recommendations
    const totalErrors = reports.length;
    if (totalErrors > 10) {
      recommendations.push('High error volume detected - consider system optimization');
    }

    const successRate = reports.filter(r => r.finalOutcome === 'SUCCESS').length / totalErrors;
    if (successRate < 0.8) {
      recommendations.push('Low success rate - review error handling and recovery mechanisms');
    }

    return recommendations;
  }
}

// Export singleton utilities
export const errorRecoveryUtils = ModuleRegistrationErrorRecoveryUtils;