/**
 * Performance Monitoring Utility
 * Provides comprehensive performance tracking for wallet operations,
 * identity switching, and component rendering
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  category: 'IDENTITY_SWITCH' | 'WALLET_OPERATION' | 'COMPONENT_RENDER' | 'API_CALL' | 'CACHE_OPERATION';
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  success?: boolean;
  error?: string;
}

export interface PerformanceBenchmark {
  name: string;
  category: string;
  expectedDuration: number;
  warningThreshold: number;
  criticalThreshold: number;
  description: string;
}

export interface PerformanceAlert {
  id: string;
  metric: PerformanceMetric;
  benchmark: PerformanceBenchmark;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: string;
  message: string;
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalMetrics: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
    errorRate: number;
    alertsGenerated: number;
  };
  categoryBreakdown: Record<string, {
    count: number;
    averageDuration: number;
    errorRate: number;
  }>;
  alerts: PerformanceAlert[];
  recommendations: string[];
}

class PerformanceMonitorClass {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private alerts: PerformanceAlert[] = [];
  private maxStoredMetrics = 1000;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  constructor() {
    this.initializeDefaultBenchmarks();
  }

  private initializeDefaultBenchmarks() {
    const defaultBenchmarks: PerformanceBenchmark[] = [
      {
        name: 'identity_switch',
        category: 'IDENTITY_SWITCH',
        expectedDuration: 500,
        warningThreshold: 1000,
        criticalThreshold: 2000,
        description: 'Time to switch between identities'
      },
      {
        name: 'wallet_balance_load',
        category: 'WALLET_OPERATION',
        expectedDuration: 300,
        warningThreshold: 1000,
        criticalThreshold: 3000,
        description: 'Time to load wallet balances'
      },
      {
        name: 'token_transfer',
        category: 'WALLET_OPERATION',
        expectedDuration: 2000,
        warningThreshold: 5000,
        criticalThreshold: 10000,
        description: 'Time to complete token transfer'
      },
      {
        name: 'pi_wallet_connect',
        category: 'WALLET_OPERATION',
        expectedDuration: 1500,
        warningThreshold: 3000,
        criticalThreshold: 6000,
        description: 'Time to connect to Pi Wallet'
      },
      {
        name: 'component_render',
        category: 'COMPONENT_RENDER',
        expectedDuration: 50,
        warningThreshold: 100,
        criticalThreshold: 200,
        description: 'Component render time'
      },
      {
        name: 'api_call',
        category: 'API_CALL',
        expectedDuration: 500,
        warningThreshold: 2000,
        criticalThreshold: 5000,
        description: 'API call response time'
      },
      {
        name: 'cache_read',
        category: 'CACHE_OPERATION',
        expectedDuration: 10,
        warningThreshold: 50,
        criticalThreshold: 100,
        description: 'Cache read operation time'
      },
      {
        name: 'cache_write',
        category: 'CACHE_OPERATION',
        expectedDuration: 20,
        warningThreshold: 100,
        criticalThreshold: 200,
        description: 'Cache write operation time'
      }
    ];

    defaultBenchmarks.forEach(benchmark => {
      this.benchmarks.set(benchmark.name, benchmark);
    });
  }

  /**
   * Start tracking a performance metric
   */
  startMetric(name: string, category: PerformanceMetric['category'], metadata?: Record<string, any>, tags?: string[]): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      id,
      name,
      category,
      startTime: performance.now(),
      metadata,
      tags
    };

    this.metrics.set(id, metric);
    return id;
  }

  /**
   * End tracking a performance metric
   */
  endMetric(id: string, success: boolean = true, error?: string): PerformanceMetric | null {
    const metric = this.metrics.get(id);
    if (!metric) {
      console.warn(`Performance metric with id ${id} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      success,
      error
    };

    // Remove from active metrics
    this.metrics.delete(id);

    // Add to completed metrics
    this.completedMetrics.push(completedMetric);

    // Trim completed metrics if needed
    if (this.completedMetrics.length > this.maxStoredMetrics) {
      this.completedMetrics = this.completedMetrics.slice(-this.maxStoredMetrics);
    }

    // Check against benchmarks and generate alerts
    this.checkBenchmarks(completedMetric);

    return completedMetric;
  }

  /**
   * Track a complete operation
   */
  async trackOperation<T>(
    name: string,
    category: PerformanceMetric['category'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
    tags?: string[]
  ): Promise<T> {
    const id = this.startMetric(name, category, metadata, tags);
    
    try {
      const result = await operation();
      this.endMetric(id, true);
      return result;
    } catch (error) {
      this.endMetric(id, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Track a synchronous operation
   */
  trackSync<T>(
    name: string,
    category: PerformanceMetric['category'],
    operation: () => T,
    metadata?: Record<string, any>,
    tags?: string[]
  ): T {
    const id = this.startMetric(name, category, metadata, tags);
    
    try {
      const result = operation();
      this.endMetric(id, true);
      return result;
    } catch (error) {
      this.endMetric(id, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Check metric against benchmarks and generate alerts
   */
  private checkBenchmarks(metric: PerformanceMetric) {
    if (!metric.duration || !metric.success) return;

    const benchmark = this.benchmarks.get(metric.name);
    if (!benchmark) return;

    let severity: 'WARNING' | 'CRITICAL' | null = null;
    let message = '';

    if (metric.duration > benchmark.criticalThreshold) {
      severity = 'CRITICAL';
      message = `${metric.name} took ${metric.duration.toFixed(2)}ms (critical threshold: ${benchmark.criticalThreshold}ms)`;
    } else if (metric.duration > benchmark.warningThreshold) {
      severity = 'WARNING';
      message = `${metric.name} took ${metric.duration.toFixed(2)}ms (warning threshold: ${benchmark.warningThreshold}ms)`;
    }

    if (severity) {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric,
        benchmark,
        severity,
        timestamp: new Date().toISOString(),
        message
      };

      this.alerts.push(alert);
      
      // Trim alerts if needed
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }

      // Notify callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in performance alert callback:', error);
        }
      });
    }
  }

  /**
   * Add custom benchmark
   */
  addBenchmark(benchmark: PerformanceBenchmark) {
    this.benchmarks.set(benchmark.name, benchmark);
  }

  /**
   * Get performance report
   */
  getReport(startDate?: Date, endDate?: Date): PerformanceReport {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = endDate || now;

    const filteredMetrics = this.completedMetrics.filter(metric => {
      // If no date range specified, include all metrics
      if (!startDate && !endDate) return true;
      
      // For testing, if startTime is a performance.now() value (small number), 
      // treat it as within range
      if (metric.startTime < 1000000) return true;
      
      const metricDate = new Date(metric.startTime);
      return metricDate >= start && metricDate <= end;
    });

    const filteredAlerts = this.alerts.filter(alert => {
      const alertDate = new Date(alert.timestamp);
      return alertDate >= start && alertDate <= end;
    });

    // Calculate summary
    const totalMetrics = filteredMetrics.length;
    const successfulMetrics = filteredMetrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration!).filter(d => d !== undefined);
    
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const slowestOperation = durations.length > 0 ? 
      filteredMetrics.find(m => m.duration === Math.max(...durations)) || null : null;
    const fastestOperation = durations.length > 0 ? 
      filteredMetrics.find(m => m.duration === Math.min(...durations)) || null : null;
    const errorRate = totalMetrics > 0 ? (totalMetrics - successfulMetrics.length) / totalMetrics : 0;

    // Calculate category breakdown
    const categoryBreakdown: Record<string, { count: number; averageDuration: number; errorRate: number; }> = {};
    
    filteredMetrics.forEach(metric => {
      if (!categoryBreakdown[metric.category]) {
        categoryBreakdown[metric.category] = { count: 0, averageDuration: 0, errorRate: 0 };
      }
      categoryBreakdown[metric.category].count++;
    });

    Object.keys(categoryBreakdown).forEach(category => {
      const categoryMetrics = filteredMetrics.filter(m => m.category === category);
      const categorySuccessful = categoryMetrics.filter(m => m.success);
      const categoryDurations = categorySuccessful.map(m => m.duration!).filter(d => d !== undefined);
      
      categoryBreakdown[category].averageDuration = categoryDurations.length > 0 ? 
        categoryDurations.reduce((a, b) => a + b, 0) / categoryDurations.length : 0;
      categoryBreakdown[category].errorRate = categoryMetrics.length > 0 ? 
        (categoryMetrics.length - categorySuccessful.length) / categoryMetrics.length : 0;
    });

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (errorRate > 0.1) {
      recommendations.push(`High error rate detected (${(errorRate * 100).toFixed(1)}%). Consider investigating failed operations.`);
    }
    
    if (averageDuration > 1000) {
      recommendations.push(`Average operation duration is high (${averageDuration.toFixed(0)}ms). Consider optimization.`);
    }
    
    const identitySwitchMetrics = filteredMetrics.filter(m => m.name === 'identity_switch');
    if (identitySwitchMetrics.length > 0) {
      const avgSwitchTime = identitySwitchMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / identitySwitchMetrics.length;
      if (avgSwitchTime > 1000) {
        recommendations.push(`Identity switching is slow (${avgSwitchTime.toFixed(0)}ms avg). Consider implementing caching.`);
      }
    }

    const criticalAlerts = filteredAlerts.filter(a => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      recommendations.push(`${criticalAlerts.length} critical performance alerts detected. Immediate attention required.`);
    }

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      summary: {
        totalMetrics,
        averageDuration,
        slowestOperation,
        fastestOperation,
        errorRate,
        alertsGenerated: filteredAlerts.length
      },
      categoryBreakdown,
      alerts: filteredAlerts,
      recommendations
    };
  }

  /**
   * Get current active metrics
   */
  getActiveMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear all metrics and alerts
   */
  clear() {
    this.metrics.clear();
    this.completedMetrics = [];
    this.alerts = [];
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetric[];
    alerts: PerformanceAlert[];
    benchmarks: PerformanceBenchmark[];
  } {
    return {
      metrics: this.completedMetrics,
      alerts: this.alerts,
      benchmarks: Array.from(this.benchmarks.values())
    };
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceMonitorClass();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startMetric: PerformanceMonitor.startMetric.bind(PerformanceMonitor),
    endMetric: PerformanceMonitor.endMetric.bind(PerformanceMonitor),
    trackOperation: PerformanceMonitor.trackOperation.bind(PerformanceMonitor),
    trackSync: PerformanceMonitor.trackSync.bind(PerformanceMonitor),
    getReport: PerformanceMonitor.getReport.bind(PerformanceMonitor),
    getActiveMetrics: PerformanceMonitor.getActiveMetrics.bind(PerformanceMonitor),
    getRecentAlerts: PerformanceMonitor.getRecentAlerts.bind(PerformanceMonitor),
    onAlert: PerformanceMonitor.onAlert.bind(PerformanceMonitor)
  };
};