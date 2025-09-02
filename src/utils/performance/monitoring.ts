/**
 * Performance Monitoring Utilities
 * 
 * Provides comprehensive performance monitoring including component render tracking,
 * API response time monitoring, and performance metrics collection.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// Performance metrics interfaces
export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface RenderMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: Record<string, any>;
}

export interface PerformanceAlert {
  type: 'api_slow' | 'render_slow' | 'memory_high' | 'error_rate_high';
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  data?: any;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  API_SLOW: 2000, // 2 seconds
  RENDER_SLOW: 100, // 100ms
  ERROR_RATE_HIGH: 0.1, // 10%
  MEMORY_HIGH: 100 * 1024 * 1024, // 100MB
};

// Global performance store
class PerformanceStore {
  private apiMetrics: ApiMetric[] = [];
  private renderMetrics: RenderMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  addApiMetric(metric: ApiMetric) {
    this.apiMetrics.push(metric);
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics.shift();
    }
    this.checkApiPerformance(metric);
  }

  addRenderMetric(metric: RenderMetric) {
    this.renderMetrics.push(metric);
    if (this.renderMetrics.length > this.maxMetrics) {
      this.renderMetrics.shift();
    }
    this.checkRenderPerformance(metric);
  }

  private checkApiPerformance(metric: ApiMetric) {
    if (metric.duration > PERFORMANCE_THRESHOLDS.API_SLOW) {
      this.addAlert({
        type: 'api_slow',
        message: `Slow API call: ${metric.endpoint} took ${metric.duration}ms`,
        timestamp: Date.now(),
        severity: metric.duration > PERFORMANCE_THRESHOLDS.API_SLOW * 2 ? 'high' : 'medium',
        data: metric
      });
    }

    // Check error rate for this endpoint
    const recentMetrics = this.apiMetrics
      .filter(m => m.endpoint === metric.endpoint && Date.now() - m.timestamp < 300000) // Last 5 minutes
      .slice(-20); // Last 20 calls

    if (recentMetrics.length >= 10) {
      const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
      if (errorRate > PERFORMANCE_THRESHOLDS.ERROR_RATE_HIGH) {
        this.addAlert({
          type: 'error_rate_high',
          message: `High error rate for ${metric.endpoint}: ${(errorRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          severity: errorRate > 0.25 ? 'high' : 'medium',
          data: { endpoint: metric.endpoint, errorRate, recentMetrics }
        });
      }
    }
  }

  private checkRenderPerformance(metric: RenderMetric) {
    if (metric.renderTime > PERFORMANCE_THRESHOLDS.RENDER_SLOW) {
      this.addAlert({
        type: 'render_slow',
        message: `Slow render: ${metric.componentName} took ${metric.renderTime}ms`,
        timestamp: Date.now(),
        severity: metric.renderTime > PERFORMANCE_THRESHOLDS.RENDER_SLOW * 2 ? 'high' : 'medium',
        data: metric
      });
    }
  }

  private addAlert(alert: PerformanceAlert) {
    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log high severity alerts
    if (alert.severity === 'high') {
      console.warn('Performance Alert:', alert);
    }
  }

  getApiMetrics(endpoint?: string): ApiMetric[] {
    return endpoint 
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;
  }

  getRenderMetrics(componentName?: string): RenderMetric[] {
    return componentName
      ? this.renderMetrics.filter(m => m.componentName === componentName)
      : this.renderMetrics;
  }

  getAlerts(type?: PerformanceAlert['type']): PerformanceAlert[] {
    return type
      ? this.alerts.filter(a => a.type === type)
      : this.alerts;
  }

  getPerformanceSummary() {
    const now = Date.now();
    const last5Minutes = now - 300000;

    const recentApiMetrics = this.apiMetrics.filter(m => m.timestamp > last5Minutes);
    const recentRenderMetrics = this.renderMetrics.filter(m => m.timestamp > last5Minutes);
    const recentAlerts = this.alerts.filter(a => a.timestamp > last5Minutes);

    return {
      api: {
        totalCalls: recentApiMetrics.length,
        averageResponseTime: recentApiMetrics.length > 0 
          ? recentApiMetrics.reduce((sum, m) => sum + m.duration, 0) / recentApiMetrics.length 
          : 0,
        errorRate: recentApiMetrics.length > 0
          ? recentApiMetrics.filter(m => !m.success).length / recentApiMetrics.length
          : 0,
        slowCalls: recentApiMetrics.filter(m => m.duration > PERFORMANCE_THRESHOLDS.API_SLOW).length
      },
      render: {
        totalRenders: recentRenderMetrics.length,
        averageRenderTime: recentRenderMetrics.length > 0
          ? recentRenderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentRenderMetrics.length
          : 0,
        slowRenders: recentRenderMetrics.filter(m => m.renderTime > PERFORMANCE_THRESHOLDS.RENDER_SLOW).length
      },
      alerts: {
        total: recentAlerts.length,
        high: recentAlerts.filter(a => a.severity === 'high').length,
        medium: recentAlerts.filter(a => a.severity === 'medium').length,
        low: recentAlerts.filter(a => a.severity === 'low').length
      }
    };
  }

  clearMetrics() {
    this.apiMetrics = [];
    this.renderMetrics = [];
    this.alerts = [];
  }
}

// Global performance store instance
const performanceStore = new PerformanceStore();

/**
 * Hook for API performance monitoring
 */
export const useApiMonitoring = () => {
  const monitorApiCall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      performanceStore.addApiMetric({
        endpoint,
        method,
        duration,
        timestamp: Date.now(),
        success,
        error
      });
    }
  }, []);

  return { monitorApiCall };
};

/**
 * Hook for component render monitoring
 */
export const useRenderMonitoring = (componentName: string, props?: Record<string, any>) => {
  const renderStartRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    
    performanceStore.addRenderMetric({
      componentName,
      renderTime,
      timestamp: Date.now(),
      props: props ? { ...props } : undefined
    });
  });

  const getMountTime = useCallback(() => {
    return performance.now() - mountTimeRef.current;
  }, []);

  return { getMountTime };
};

/**
 * Hook for memory monitoring
 */
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      });

      // Check for high memory usage
      if (memory.usedJSHeapSize > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
        performanceStore.addAlert({
          type: 'memory_high',
          message: `High memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          timestamp: Date.now(),
          severity: memory.usedJSHeapSize > PERFORMANCE_THRESHOLDS.MEMORY_HIGH * 2 ? 'high' : 'medium',
          data: memory
        });
      }
    }
  }, []);

  useEffect(() => {
    checkMemory();
    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkMemory]);

  return { memoryInfo, checkMemory };
};

/**
 * Hook for performance dashboard data
 */
export const usePerformanceDashboard = () => {
  const [summary, setSummary] = useState(performanceStore.getPerformanceSummary());
  const [alerts, setAlerts] = useState(performanceStore.getAlerts());

  const refreshData = useCallback(() => {
    setSummary(performanceStore.getPerformanceSummary());
    setAlerts(performanceStore.getAlerts());
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [refreshData]);

  const getApiMetrics = useCallback((endpoint?: string) => {
    return performanceStore.getApiMetrics(endpoint);
  }, []);

  const getRenderMetrics = useCallback((componentName?: string) => {
    return performanceStore.getRenderMetrics(componentName);
  }, []);

  const clearMetrics = useCallback(() => {
    performanceStore.clearMetrics();
    refreshData();
  }, [refreshData]);

  return {
    summary,
    alerts,
    getApiMetrics,
    getRenderMetrics,
    clearMetrics,
    refreshData
  };
};

/**
 * Performance metrics component for debugging
 */
export const PerformanceMetrics: React.FC<{ 
  show?: boolean; 
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ 
  show = false, 
  position = 'bottom-right' 
}) => {
  const { summary, alerts } = usePerformanceDashboard();
  const { memoryInfo } = useMemoryMonitoring();

  if (!show) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono max-w-xs`}>
      <div className="mb-2 font-bold">Performance Metrics</div>
      
      <div className="mb-2">
        <div className="text-yellow-300">API Calls (5min)</div>
        <div>Total: {summary.api.totalCalls}</div>
        <div>Avg: {summary.api.averageResponseTime.toFixed(0)}ms</div>
        <div>Errors: {(summary.api.errorRate * 100).toFixed(1)}%</div>
        <div>Slow: {summary.api.slowCalls}</div>
      </div>

      <div className="mb-2">
        <div className="text-green-300">Renders (5min)</div>
        <div>Total: {summary.render.totalRenders}</div>
        <div>Avg: {summary.render.averageRenderTime.toFixed(1)}ms</div>
        <div>Slow: {summary.render.slowRenders}</div>
      </div>

      {memoryInfo && (
        <div className="mb-2">
          <div className="text-blue-300">Memory</div>
          <div>Used: {(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>Total: {(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}

      <div>
        <div className="text-red-300">Alerts (5min)</div>
        <div>High: {summary.alerts.high}</div>
        <div>Medium: {summary.alerts.medium}</div>
        <div>Low: {summary.alerts.low}</div>
      </div>
    </div>
  );
};

// Export the performance store for direct access if needed
export { performanceStore };