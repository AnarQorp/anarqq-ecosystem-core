/**
 * Module Performance Monitor
 * Utility for monitoring and recording module registration performance
 */

import { ModuleAnalyticsService } from '../../services/ModuleAnalyticsService';

export interface PerformanceTimer {
  start: number;
  operation: string;
  moduleId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  operation: string;
  moduleId?: string;
  duration: number;
  success: boolean;
  error?: Error;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Performance monitoring utility class
 */
export class ModulePerformanceMonitor {
  private static instance: ModulePerformanceMonitor;
  private analyticsService?: ModuleAnalyticsService;
  private activeTimers = new Map<string, PerformanceTimer>();
  private performanceReports: PerformanceReport[] = [];
  private readonly MAX_REPORTS = 1000;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ModulePerformanceMonitor {
    if (!ModulePerformanceMonitor.instance) {
      ModulePerformanceMonitor.instance = new ModulePerformanceMonitor();
    }
    return ModulePerformanceMonitor.instance;
  }

  /**
   * Set analytics service for reporting
   */
  public setAnalyticsService(analyticsService: ModuleAnalyticsService): void {
    this.analyticsService = analyticsService;
  }

  /**
   * Start timing an operation
   */
  public startTimer(
    operation: string,
    moduleId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): string {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.activeTimers.set(timerId, {
      start: performance.now(),
      operation,
      moduleId,
      userId,
      metadata
    });
    
    return timerId;
  }

  /**
   * End timing and record performance
   */
  public endTimer(
    timerId: string,
    success: boolean = true,
    error?: Error
  ): PerformanceReport | null {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      console.warn(`[ModulePerformanceMonitor] Timer not found: ${timerId}`);
      return null;
    }
    
    const duration = performance.now() - timer.start;
    this.activeTimers.delete(timerId);
    
    const report: PerformanceReport = {
      operation: timer.operation,
      moduleId: timer.moduleId,
      duration,
      success,
      error,
      timestamp: new Date().toISOString(),
      metadata: timer.metadata
    };
    
    // Store report
    this.addPerformanceReport(report);
    
    // Report to analytics service
    if (this.analyticsService) {
      this.analyticsService.recordOperation(
        timer.operation as any,
        timer.moduleId || '',
        duration,
        success,
        timer.userId,
        error
      );
    }
    
    return report;
  }

  /**
   * Time a function execution
   */
  public async timeFunction<T>(
    operation: string,
    fn: () => Promise<T>,
    moduleId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(operation, moduleId, userId, metadata);
    
    try {
      const result = await fn();
      this.endTimer(timerId, true);
      return result;
    } catch (error) {
      this.endTimer(timerId, false, error as Error);
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  public timeSync<T>(
    operation: string,
    fn: () => T,
    moduleId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): T {
    const timerId = this.startTimer(operation, moduleId, userId, metadata);
    
    try {
      const result = fn();
      this.endTimer(timerId, true);
      return result;
    } catch (error) {
      this.endTimer(timerId, false, error as Error);
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  public getOperationStats(operation: string): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    successRate: number;
    errorRate: number;
  } {
    const reports = this.performanceReports.filter(r => r.operation === operation);
    
    if (reports.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        errorRate: 0
      };
    }
    
    const durations = reports.map(r => r.duration).sort((a, b) => a - b);
    const successfulOperations = reports.filter(r => r.success).length;
    const failedOperations = reports.length - successfulOperations;
    
    return {
      totalOperations: reports.length,
      successfulOperations,
      failedOperations,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      successRate: successfulOperations / reports.length,
      errorRate: failedOperations / reports.length
    };
  }

  /**
   * Get all performance reports
   */
  public getPerformanceReports(
    operation?: string,
    moduleId?: string,
    limit?: number
  ): PerformanceReport[] {
    let reports = [...this.performanceReports];
    
    if (operation) {
      reports = reports.filter(r => r.operation === operation);
    }
    
    if (moduleId) {
      reports = reports.filter(r => r.moduleId === moduleId);
    }
    
    // Sort by timestamp (newest first)
    reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (limit) {
      reports = reports.slice(0, limit);
    }
    
    return reports;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    totalOperations: number;
    operationTypes: string[];
    overallSuccessRate: number;
    overallErrorRate: number;
    averageResponseTime: number;
    slowestOperations: Array<{ operation: string; averageDuration: number }>;
    recentErrors: PerformanceReport[];
  } {
    const operationTypes = [...new Set(this.performanceReports.map(r => r.operation))];
    const totalOperations = this.performanceReports.length;
    const successfulOperations = this.performanceReports.filter(r => r.success).length;
    
    // Calculate average response time
    const totalDuration = this.performanceReports.reduce((sum, r) => sum + r.duration, 0);
    const averageResponseTime = totalOperations > 0 ? totalDuration / totalOperations : 0;
    
    // Find slowest operations
    const operationStats = operationTypes.map(op => ({
      operation: op,
      averageDuration: this.getOperationStats(op).averageDuration
    })).sort((a, b) => b.averageDuration - a.averageDuration);
    
    // Get recent errors
    const recentErrors = this.performanceReports
      .filter(r => !r.success)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    return {
      totalOperations,
      operationTypes,
      overallSuccessRate: totalOperations > 0 ? successfulOperations / totalOperations : 0,
      overallErrorRate: totalOperations > 0 ? (totalOperations - successfulOperations) / totalOperations : 0,
      averageResponseTime,
      slowestOperations: operationStats.slice(0, 5),
      recentErrors
    };
  }

  /**
   * Clear old performance reports
   */
  public clearOldReports(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    this.performanceReports = this.performanceReports.filter(
      report => new Date(report.timestamp).getTime() > cutoffTime
    );
    
    console.log(`[ModulePerformanceMonitor] Cleared reports older than ${olderThanHours} hours`);
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      summary: this.getPerformanceSummary(),
      operationStats: this.performanceReports.reduce((acc, report) => {
        if (!acc[report.operation]) {
          acc[report.operation] = this.getOperationStats(report.operation);
        }
        return acc;
      }, {} as Record<string, any>),
      reports: this.performanceReports,
      exportedAt: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return this.convertToCSV(data.reports);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Reset all performance data
   */
  public reset(): void {
    this.activeTimers.clear();
    this.performanceReports = [];
    console.log('[ModulePerformanceMonitor] Performance data reset');
  }

  // Private methods

  private addPerformanceReport(report: PerformanceReport): void {
    this.performanceReports.push(report);
    
    // Keep only the most recent reports
    if (this.performanceReports.length > this.MAX_REPORTS) {
      this.performanceReports = this.performanceReports.slice(-this.MAX_REPORTS);
    }
  }

  private convertToCSV(reports: PerformanceReport[]): string {
    if (reports.length === 0) return '';
    
    const headers = ['timestamp', 'operation', 'moduleId', 'duration', 'success', 'error'];
    const csvRows = [headers.join(',')];
    
    reports.forEach(report => {
      const row = [
        report.timestamp,
        report.operation,
        report.moduleId || '',
        report.duration.toString(),
        report.success.toString(),
        report.error?.message || ''
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });
    
    return csvRows.join('\n');
  }
}

/**
 * Decorator for timing method execution
 */
export function timed(operation: string, moduleId?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const monitor = ModulePerformanceMonitor.getInstance();
      const timerId = monitor.startTimer(operation, moduleId);
      
      try {
        const result = await method.apply(this, args);
        monitor.endTimer(timerId, true);
        return result;
      } catch (error) {
        monitor.endTimer(timerId, false, error as Error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Higher-order function for timing function execution
 */
export function withTiming<T extends (...args: any[]) => any>(
  operation: string,
  fn: T,
  moduleId?: string
): T {
  return (async (...args: any[]) => {
    const monitor = ModulePerformanceMonitor.getInstance();
    return monitor.timeFunction(operation, () => fn(...args), moduleId);
  }) as T;
}

// Export singleton instance
export const modulePerformanceMonitor = ModulePerformanceMonitor.getInstance();

export default modulePerformanceMonitor;