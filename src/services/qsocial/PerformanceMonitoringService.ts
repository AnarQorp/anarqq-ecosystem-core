/**
 * Qsocial Performance Monitoring Service
 * 
 * Provides performance monitoring and optimization tools for the Qsocial platform.
 * Tracks metrics, identifies bottlenecks, and provides insights for optimization.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimingMetric extends PerformanceMetric {
  duration: number;
  startTime: number;
  endTime: number;
}

export interface CounterMetric extends PerformanceMetric {
  count: number;
  rate?: number; // per second
}

export interface MemoryMetric extends PerformanceMetric {
  used: number;
  total: number;
  percentage: number;
}

export interface DatabaseMetric extends PerformanceMetric {
  queryTime: number;
  queryType: string;
  tableName?: string;
  recordCount?: number;
}

export interface CacheMetric extends PerformanceMetric {
  hitRate: number;
  hits: number;
  misses: number;
  evictions?: number;
}

export interface APIMetric extends PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize?: number;
  responseSize?: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: number;
  resolved?: boolean;
  resolvedAt?: number;
}

export interface PerformanceReport {
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  recommendations: string[];
}

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private tags: Record<string, string>;

  constructor(name: string, tags: Record<string, string> = {}) {
    this.name = name;
    this.tags = tags;
    this.startTime = performance.now();
  }

  end(): TimingMetric {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    return {
      name: this.name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      duration,
      startTime: this.startTime,
      endTime,
      tags: this.tags
    };
  }
}

/**
 * Main performance monitoring service
 */
export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, { warning: number; critical: number }> = new Map();
  private listeners: ((metric: PerformanceMetric) => void)[] = [];
  private alertListeners: ((alert: PerformanceAlert) => void)[] = [];
  private maxMetricsHistory = 10000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Set default thresholds
    this.setThreshold('api_response_time', { warning: 1000, critical: 3000 }); // ms
    this.setThreshold('memory_usage', { warning: 80, critical: 95 }); // percentage
    this.setThreshold('cache_hit_rate', { warning: 70, critical: 50 }); // percentage
    this.setThreshold('error_rate', { warning: 5, critical: 10 }); // percentage
    this.setThreshold('database_query_time', { warning: 500, critical: 2000 }); // ms

    // Cleanup old metrics every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60 * 1000);
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, tags: Record<string, string> = {}): PerformanceTimer {
    return new PerformanceTimer(name, tags);
  }

  /**
   * Record a timing metric
   */
  recordTiming(name: string, duration: number, tags: Record<string, string> = {}): void {
    const metric: TimingMetric = {
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      tags
    };

    this.addMetric(metric);
  }

  /**
   * Record a counter metric
   */
  recordCounter(name: string, count: number = 1, tags: Record<string, string> = {}): void {
    const metric: CounterMetric = {
      name,
      value: count,
      unit: 'count',
      timestamp: Date.now(),
      count,
      tags
    };

    this.addMetric(metric);
  }

  /**
   * Record memory usage metric
   */
  recordMemoryUsage(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      const metric: MemoryMetric = {
        name: 'memory_usage',
        value: percentage,
        unit: 'percentage',
        timestamp: Date.now(),
        used,
        total,
        percentage
      };

      this.addMetric(metric);
    }
  }

  /**
   * Record database query metric
   */
  recordDatabaseQuery(
    queryType: string,
    queryTime: number,
    tableName?: string,
    recordCount?: number,
    tags: Record<string, string> = {}
  ): void {
    const metric: DatabaseMetric = {
      name: 'database_query_time',
      value: queryTime,
      unit: 'ms',
      timestamp: Date.now(),
      queryTime,
      queryType,
      tableName,
      recordCount,
      tags: { ...tags, queryType, tableName: tableName || 'unknown' }
    };

    this.addMetric(metric);
  }

  /**
   * Record cache performance metric
   */
  recordCachePerformance(
    hitRate: number,
    hits: number,
    misses: number,
    evictions?: number,
    tags: Record<string, string> = {}
  ): void {
    const metric: CacheMetric = {
      name: 'cache_hit_rate',
      value: hitRate,
      unit: 'percentage',
      timestamp: Date.now(),
      hitRate,
      hits,
      misses,
      evictions,
      tags
    };

    this.addMetric(metric);
  }

  /**
   * Record API request metric
   */
  recordAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    requestSize?: number,
    responseSize?: number,
    tags: Record<string, string> = {}
  ): void {
    const metric: APIMetric = {
      name: 'api_response_time',
      value: responseTime,
      unit: 'ms',
      timestamp: Date.now(),
      endpoint,
      method,
      statusCode,
      responseTime,
      requestSize,
      responseSize,
      tags: { ...tags, endpoint, method, statusCode: statusCode.toString() }
    };

    this.addMetric(metric);

    // Also record error rate if it's an error
    if (statusCode >= 400) {
      this.recordCounter('api_errors', 1, { endpoint, method, statusCode: statusCode.toString() });
    }
  }

  /**
   * Set performance threshold
   */
  setThreshold(metricName: string, threshold: { warning: number; critical: number }): void {
    this.thresholds.set(metricName, threshold);
  }

  /**
   * Get current performance statistics
   */
  getStats(timeRange?: { start: number; end: number }): PerformanceReport {
    const now = Date.now();
    const start = timeRange?.start || (now - 60 * 60 * 1000); // Default: last hour
    const end = timeRange?.end || now;

    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    const apiMetrics = filteredMetrics.filter(m => m.name === 'api_response_time') as APIMetric[];
    const errorMetrics = filteredMetrics.filter(m => m.name === 'api_errors') as CounterMetric[];
    const cacheMetrics = filteredMetrics.filter(m => m.name === 'cache_hit_rate') as CacheMetric[];
    const memoryMetrics = filteredMetrics.filter(m => m.name === 'memory_usage') as MemoryMetric[];

    const totalRequests = apiMetrics.length;
    const averageResponseTime = totalRequests > 0 
      ? apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;
    
    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.count, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    const latestCacheMetric = cacheMetrics[cacheMetrics.length - 1];
    const cacheHitRate = latestCacheMetric?.hitRate || 0;
    
    const latestMemoryMetric = memoryMetrics[memoryMetrics.length - 1];
    const memoryUsage = latestMemoryMetric?.percentage || 0;

    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const recommendations = this.generateRecommendations(filteredMetrics);

    return {
      timeRange: { start, end },
      summary: {
        totalRequests,
        averageResponseTime,
        errorRate,
        cacheHitRate,
        memoryUsage
      },
      metrics: filteredMetrics,
      alerts: activeAlerts,
      recommendations
    };
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    const now = Date.now();
    const start = timeRange?.start || (now - 60 * 60 * 1000);
    const end = timeRange?.end || now;

    return this.metrics.filter(
      m => m.name === name && m.timestamp >= start && m.timestamp <= end
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  /**
   * Add metric listener
   */
  onMetric(listener: (metric: PerformanceMetric) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Add alert listener
   */
  onAlert(listener: (alert: PerformanceAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove metric listener
   */
  offMetric(listener: (metric: PerformanceMetric) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Remove alert listener
   */
  offAlert(listener: (alert: PerformanceAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Check thresholds and create alerts
    this.checkThresholds(metric);
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Performance metric listener error:', error);
      }
    });

    // Cleanup if we have too many metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    let alertType: 'warning' | 'critical' | null = null;
    let thresholdValue = 0;

    if (metric.value >= threshold.critical) {
      alertType = 'critical';
      thresholdValue = threshold.critical;
    } else if (metric.value >= threshold.warning) {
      alertType = 'warning';
      thresholdValue = threshold.warning;
    }

    if (alertType) {
      const alertId = `${metric.name}_${alertType}_${Date.now()}`;
      const alert: PerformanceAlert = {
        id: alertId,
        type: alertType,
        metric: metric.name,
        threshold: thresholdValue,
        currentValue: metric.value,
        message: `${metric.name} exceeded ${alertType} threshold: ${metric.value}${metric.unit} >= ${thresholdValue}${metric.unit}`,
        timestamp: Date.now()
      };

      this.alerts.push(alert);
      
      // Notify alert listeners
      this.alertListeners.forEach(listener => {
        try {
          listener(alert);
        } catch (error) {
          console.error('Performance alert listener error:', error);
        }
      });
    }
  }

  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    // Analyze API response times
    const apiMetrics = metrics.filter(m => m.name === 'api_response_time') as APIMetric[];
    if (apiMetrics.length > 0) {
      const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;
      if (avgResponseTime > 1000) {
        recommendations.push('Consider implementing caching for frequently accessed endpoints');
        recommendations.push('Review database query performance and add indexes where needed');
      }
    }

    // Analyze cache performance
    const cacheMetrics = metrics.filter(m => m.name === 'cache_hit_rate') as CacheMetric[];
    const latestCacheMetric = cacheMetrics[cacheMetrics.length - 1];
    if (latestCacheMetric && latestCacheMetric.hitRate < 70) {
      recommendations.push('Cache hit rate is low - consider adjusting cache TTL values');
      recommendations.push('Review cache invalidation strategy to improve hit rates');
    }

    // Analyze memory usage
    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage') as MemoryMetric[];
    const latestMemoryMetric = memoryMetrics[memoryMetrics.length - 1];
    if (latestMemoryMetric && latestMemoryMetric.percentage > 80) {
      recommendations.push('Memory usage is high - consider implementing memory cleanup routines');
      recommendations.push('Review large object allocations and implement object pooling');
    }

    // Analyze error rates
    const errorMetrics = metrics.filter(m => m.name === 'api_errors') as CounterMetric[];
    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.count, 0);
    if (totalErrors > 0 && apiMetrics.length > 0) {
      const errorRate = (totalErrors / apiMetrics.length) * 100;
      if (errorRate > 5) {
        recommendations.push('Error rate is elevated - review error handling and validation');
        recommendations.push('Implement better input validation and error recovery mechanisms');
      }
    }

    return recommendations;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Also cleanup resolved alerts older than 7 days
    const alertCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => 
      !a.resolved || (a.resolvedAt && a.resolvedAt > alertCutoff)
    );
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.metrics = [];
    this.alerts = [];
    this.listeners = [];
    this.alertListeners = [];
  }
}

// Singleton instance
let performanceServiceInstance: PerformanceMonitoringService | null = null;

export function getPerformanceService(): PerformanceMonitoringService {
  if (!performanceServiceInstance) {
    performanceServiceInstance = new PerformanceMonitoringService();
  }
  return performanceServiceInstance;
}

export function destroyPerformanceService(): void {
  if (performanceServiceInstance) {
    performanceServiceInstance.destroy();
    performanceServiceInstance = null;
  }
}

// Utility functions for common performance measurements
export const PerformanceUtils = {
  /**
   * Measure function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const service = getPerformanceService();
    const timer = service.startTimer(name, tags);
    
    try {
      const result = await fn();
      const metric = timer.end();
      service.recordTiming(metric.name, metric.duration, metric.tags);
      return result;
    } catch (error) {
      const metric = timer.end();
      service.recordTiming(metric.name, metric.duration, { ...metric.tags, error: 'true' });
      throw error;
    }
  },

  /**
   * Measure synchronous function execution time
   */
  measure<T>(
    name: string,
    fn: () => T,
    tags: Record<string, string> = {}
  ): T {
    const service = getPerformanceService();
    const timer = service.startTimer(name, tags);
    
    try {
      const result = fn();
      const metric = timer.end();
      service.recordTiming(metric.name, metric.duration, metric.tags);
      return result;
    } catch (error) {
      const metric = timer.end();
      service.recordTiming(metric.name, metric.duration, { ...metric.tags, error: 'true' });
      throw error;
    }
  },

  /**
   * Create a performance decorator for methods
   */
  performanceDecorator(name?: string, tags: Record<string, string> = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const metricName = name || `${target.constructor.name}.${propertyKey}`;

      descriptor.value = async function (...args: any[]) {
        return PerformanceUtils.measureAsync(
          metricName,
          () => originalMethod.apply(this, args),
          tags
        );
      };

      return descriptor;
    };
  }
};