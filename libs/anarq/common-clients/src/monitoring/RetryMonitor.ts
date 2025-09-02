import { RetryPolicy, CircuitBreakerState, ErrorCodes } from '../types/client.js';

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  error?: string;
  errorCode?: ErrorCodes;
  delay: number;
  success: boolean;
}

/**
 * Retry operation metrics
 */
export interface RetryMetrics {
  operationId: string;
  operation: string;
  module?: string;
  startTime: string;
  endTime?: string;
  totalAttempts: number;
  success: boolean;
  finalError?: string;
  finalErrorCode?: ErrorCodes;
  attempts: RetryAttempt[];
  policy: RetryPolicy;
  totalDelay: number;
  circuitBreakerTripped?: boolean;
}

/**
 * Aggregated retry statistics
 */
export interface RetryStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageAttempts: number;
  averageDelay: number;
  mostCommonErrors: { code: string; count: number }[];
  circuitBreakerTrips: number;
  byModule: Record<string, {
    operations: number;
    successRate: number;
    averageAttempts: number;
  }>;
  byErrorCode: Record<string, {
    count: number;
    retrySuccessRate: number;
  }>;
}

/**
 * Idempotency operation metrics
 */
export interface IdempotencyMetrics {
  operationId: string;
  idempotencyKey: string;
  operation: string;
  module?: string;
  timestamp: string;
  isDuplicate: boolean;
  cacheHit: boolean;
  processingTime?: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

/**
 * Monitor for retry operations and idempotency
 */
export class RetryMonitor {
  private retryMetrics = new Map<string, RetryMetrics>();
  private idempotencyMetrics = new Map<string, IdempotencyMetrics>();
  private readonly maxMetricsAge: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(maxMetricsAge = 24 * 60 * 60 * 1000) { // 24 hours
    this.maxMetricsAge = maxMetricsAge;
    this.startCleanupTimer();
  }

  /**
   * Start tracking a retry operation
   */
  startRetryOperation(
    operationId: string,
    operation: string,
    policy: RetryPolicy,
    module?: string
  ): void {
    const metrics: RetryMetrics = {
      operationId,
      operation,
      module,
      startTime: new Date().toISOString(),
      totalAttempts: 0,
      success: false,
      attempts: [],
      policy,
      totalDelay: 0
    };

    this.retryMetrics.set(operationId, metrics);
  }

  /**
   * Record a retry attempt
   */
  recordRetryAttempt(
    operationId: string,
    attemptNumber: number,
    error?: Error,
    delay = 0,
    success = false
  ): void {
    const metrics = this.retryMetrics.get(operationId);
    if (!metrics) {
      return;
    }

    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: new Date().toISOString(),
      error: error?.message,
      errorCode: (error as any)?.code,
      delay,
      success
    };

    metrics.attempts.push(attempt);
    metrics.totalAttempts = attemptNumber;
    metrics.totalDelay += delay;

    if (success) {
      metrics.success = true;
      metrics.endTime = new Date().toISOString();
    } else if (error) {
      metrics.finalError = error.message;
      metrics.finalErrorCode = (error as any)?.code;
    }
  }

  /**
   * Record circuit breaker trip
   */
  recordCircuitBreakerTrip(operationId: string): void {
    const metrics = this.retryMetrics.get(operationId);
    if (metrics) {
      metrics.circuitBreakerTripped = true;
    }
  }

  /**
   * Complete retry operation
   */
  completeRetryOperation(operationId: string, success: boolean, finalError?: Error): void {
    const metrics = this.retryMetrics.get(operationId);
    if (!metrics) {
      return;
    }

    metrics.success = success;
    metrics.endTime = new Date().toISOString();
    
    if (finalError) {
      metrics.finalError = finalError.message;
      metrics.finalErrorCode = (finalError as any)?.code;
    }
  }

  /**
   * Record idempotency operation
   */
  recordIdempotencyOperation(
    operationId: string,
    idempotencyKey: string,
    operation: string,
    isDuplicate: boolean,
    cacheHit: boolean,
    module?: string,
    processingTime?: number
  ): void {
    const metrics: IdempotencyMetrics = {
      operationId,
      idempotencyKey,
      operation,
      module,
      timestamp: new Date().toISOString(),
      isDuplicate,
      cacheHit,
      processingTime,
      status: 'PROCESSING'
    };

    this.idempotencyMetrics.set(operationId, metrics);
  }

  /**
   * Update idempotency operation status
   */
  updateIdempotencyStatus(
    operationId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    processingTime?: number
  ): void {
    const metrics = this.idempotencyMetrics.get(operationId);
    if (metrics) {
      metrics.status = status;
      if (processingTime !== undefined) {
        metrics.processingTime = processingTime;
      }
    }
  }

  /**
   * Get retry statistics
   */
  getRetryStats(module?: string): RetryStats {
    const metrics = Array.from(this.retryMetrics.values())
      .filter(m => !module || m.module === module);

    if (metrics.length === 0) {
      return this.createEmptyStats();
    }

    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;
    const averageAttempts = metrics.reduce((sum, m) => sum + m.totalAttempts, 0) / totalOperations;
    const averageDelay = metrics.reduce((sum, m) => sum + m.totalDelay, 0) / totalOperations;
    const circuitBreakerTrips = metrics.filter(m => m.circuitBreakerTripped).length;

    // Most common errors
    const errorCounts = new Map<string, number>();
    metrics.forEach(m => {
      if (m.finalErrorCode) {
        errorCounts.set(m.finalErrorCode, (errorCounts.get(m.finalErrorCode) || 0) + 1);
      }
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By module statistics
    const byModule: Record<string, any> = {};
    const moduleGroups = new Map<string, RetryMetrics[]>();
    
    metrics.forEach(m => {
      if (m.module) {
        if (!moduleGroups.has(m.module)) {
          moduleGroups.set(m.module, []);
        }
        moduleGroups.get(m.module)!.push(m);
      }
    });

    moduleGroups.forEach((moduleMetrics, moduleName) => {
      const moduleSuccessful = moduleMetrics.filter(m => m.success).length;
      byModule[moduleName] = {
        operations: moduleMetrics.length,
        successRate: moduleSuccessful / moduleMetrics.length,
        averageAttempts: moduleMetrics.reduce((sum, m) => sum + m.totalAttempts, 0) / moduleMetrics.length
      };
    });

    // By error code statistics
    const byErrorCode: Record<string, any> = {};
    const errorGroups = new Map<string, RetryMetrics[]>();
    
    metrics.forEach(m => {
      if (m.finalErrorCode) {
        if (!errorGroups.has(m.finalErrorCode)) {
          errorGroups.set(m.finalErrorCode, []);
        }
        errorGroups.get(m.finalErrorCode)!.push(m);
      }
    });

    errorGroups.forEach((errorMetrics, errorCode) => {
      const retrySuccessful = errorMetrics.filter(m => m.success).length;
      byErrorCode[errorCode] = {
        count: errorMetrics.length,
        retrySuccessRate: retrySuccessful / errorMetrics.length
      };
    });

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageAttempts,
      averageDelay,
      mostCommonErrors,
      circuitBreakerTrips,
      byModule,
      byErrorCode
    };
  }

  /**
   * Get idempotency statistics
   */
  getIdempotencyStats(module?: string) {
    const metrics = Array.from(this.idempotencyMetrics.values())
      .filter(m => !module || m.module === module);

    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        duplicateRequests: 0,
        cacheHits: 0,
        averageProcessingTime: 0,
        duplicateRate: 0,
        cacheHitRate: 0
      };
    }

    const totalOperations = metrics.length;
    const duplicateRequests = metrics.filter(m => m.isDuplicate).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const processingTimes = metrics
      .filter(m => m.processingTime !== undefined)
      .map(m => m.processingTime!);
    
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    return {
      totalOperations,
      duplicateRequests,
      cacheHits,
      averageProcessingTime,
      duplicateRate: duplicateRequests / totalOperations,
      cacheHitRate: cacheHits / totalOperations
    };
  }

  /**
   * Get recent retry failures for analysis
   */
  getRecentFailures(limit = 50, module?: string): RetryMetrics[] {
    return Array.from(this.retryMetrics.values())
      .filter(m => !m.success && (!module || m.module === module))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  /**
   * Get retry operation details
   */
  getRetryOperation(operationId: string): RetryMetrics | undefined {
    return this.retryMetrics.get(operationId);
  }

  /**
   * Get idempotency operation details
   */
  getIdempotencyOperation(operationId: string): IdempotencyMetrics | undefined {
    return this.idempotencyMetrics.get(operationId);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.retryMetrics.clear();
    this.idempotencyMetrics.clear();
  }

  /**
   * Shutdown monitor and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  private createEmptyStats(): RetryStats {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageAttempts: 0,
      averageDelay: 0,
      mostCommonErrors: [],
      circuitBreakerTrips: 0,
      byModule: {},
      byErrorCode: {}
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.maxMetricsAge;

    // Cleanup retry metrics
    for (const [operationId, metrics] of this.retryMetrics.entries()) {
      const startTime = new Date(metrics.startTime).getTime();
      if (startTime < cutoffTime) {
        this.retryMetrics.delete(operationId);
      }
    }

    // Cleanup idempotency metrics
    for (const [operationId, metrics] of this.idempotencyMetrics.entries()) {
      const timestamp = new Date(metrics.timestamp).getTime();
      if (timestamp < cutoffTime) {
        this.idempotencyMetrics.delete(operationId);
      }
    }
  }
}