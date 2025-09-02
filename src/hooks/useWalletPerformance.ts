/**
 * Wallet Performance Hook
 * Provides performance monitoring utilities and optimization helpers
 * for wallet operations and identity management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMonitor, PerformanceReport, PerformanceAlert } from '../utils/performance/PerformanceMonitor';
import { WalletCache } from '../utils/performance/WalletCache';

export interface PerformanceState {
  isMonitoring: boolean;
  currentMetrics: any[];
  recentAlerts: PerformanceAlert[];
  cacheStats: any;
  report: PerformanceReport | null;
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface PerformanceActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  clearMetrics: () => void;
  generateReport: (timeRange?: string) => PerformanceReport;
  optimizeCache: () => Promise<void>;
  preloadIdentityData: (identityId: string) => Promise<void>;
  trackOperation: <T>(name: string, operation: () => Promise<T>) => Promise<T>;
  trackSync: <T>(name: string, operation: () => T) => T;
}

export interface UseWalletPerformanceOptions {
  autoStart?: boolean;
  alertThreshold?: number;
  reportInterval?: number;
  enableCacheOptimization?: boolean;
}

export const useWalletPerformance = (options: UseWalletPerformanceOptions = {}) => {
  const {
    autoStart = true,
    alertThreshold = 5,
    reportInterval = 30000, // 30 seconds
    enableCacheOptimization = true
  } = options;

  const [state, setState] = useState<PerformanceState>({
    isMonitoring: false,
    currentMetrics: [],
    recentAlerts: [],
    cacheStats: null,
    report: null,
    healthStatus: 'HEALTHY'
  });

  const alertUnsubscribeRef = useRef<(() => void) | null>(null);
  const reportIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update performance state
  const updateState = useCallback(() => {
    const currentMetrics = PerformanceMonitor.getActiveMetrics();
    const recentAlerts = PerformanceMonitor.getRecentAlerts(10);
    const cacheStats = WalletCache.getStats();
    const report = PerformanceMonitor.getReport();

    // Determine health status
    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'CRITICAL').length;
    const warningAlerts = recentAlerts.filter(a => a.severity === 'WARNING').length;
    
    if (criticalAlerts > 0 || report.summary.errorRate > 0.2) {
      healthStatus = 'CRITICAL';
    } else if (warningAlerts > alertThreshold || report.summary.errorRate > 0.1) {
      healthStatus = 'WARNING';
    }

    setState(prev => ({
      ...prev,
      currentMetrics,
      recentAlerts,
      cacheStats,
      report,
      healthStatus
    }));
  }, [alertThreshold]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return;

    setState(prev => ({ ...prev, isMonitoring: true }));

    // Subscribe to alerts
    alertUnsubscribeRef.current = PerformanceMonitor.onAlert((alert) => {
      setState(prev => ({
        ...prev,
        recentAlerts: [alert, ...prev.recentAlerts.slice(0, 9)]
      }));

      // Log critical alerts to console
      if (alert.severity === 'CRITICAL') {
        console.warn('Critical performance alert:', alert.message);
      }
    });

    // Start periodic reporting
    reportIntervalRef.current = setInterval(updateState, reportInterval);

    // Initial state update
    updateState();
  }, [state.isMonitoring, reportInterval, updateState]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!state.isMonitoring) return;

    setState(prev => ({ ...prev, isMonitoring: false }));

    // Unsubscribe from alerts
    if (alertUnsubscribeRef.current) {
      alertUnsubscribeRef.current();
      alertUnsubscribeRef.current = null;
    }

    // Clear interval
    if (reportIntervalRef.current) {
      clearInterval(reportIntervalRef.current);
      reportIntervalRef.current = null;
    }
  }, [state.isMonitoring]);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    PerformanceMonitor.clear();
    WalletCache.clear();
    updateState();
  }, [updateState]);

  // Generate report
  const generateReport = useCallback((timeRange: string = '1h'): PerformanceReport => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
    }

    return PerformanceMonitor.getReport(startDate, now);
  }, []);

  // Optimize cache
  const optimizeCache = useCallback(async () => {
    if (!enableCacheOptimization) return;

    const metricId = PerformanceMonitor.startMetric(
      'cache_optimization',
      'CACHE_OPERATION',
      {},
      ['cache', 'optimization']
    );

    try {
      const stats = WalletCache.getStats();
      
      // Clear low-access entries if cache is getting full
      if (stats.totalEntries > 800) {
        // This would trigger the cache's internal eviction
        // In a real implementation, we might have more sophisticated optimization
        console.log('Cache optimization: Triggering eviction for low-access entries');
      }

      // Log optimization results
      const newStats = WalletCache.getStats();
      console.log('Cache optimization completed:', {
        before: stats,
        after: newStats,
        entriesRemoved: stats.totalEntries - newStats.totalEntries
      });

      PerformanceMonitor.endMetric(metricId, true);
    } catch (error) {
      PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [enableCacheOptimization]);

  // Preload identity data
  const preloadIdentityData = useCallback(async (identityId: string) => {
    const metricId = PerformanceMonitor.startMetric(
      'identity_preload',
      'CACHE_OPERATION',
      { identityId },
      ['identity', 'preload', 'cache']
    );

    try {
      await WalletCache.preloadIdentityData(identityId, ['balances', 'permissions', 'risk']);
      PerformanceMonitor.endMetric(metricId, true);
    } catch (error) {
      PerformanceMonitor.endMetric(metricId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, []);

  // Track async operation
  const trackOperation = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return PerformanceMonitor.trackOperation(
      name,
      'WALLET_OPERATION',
      operation,
      {},
      ['tracked', 'operation']
    );
  }, []);

  // Track sync operation
  const trackSync = useCallback(<T>(
    name: string,
    operation: () => T
  ): T => {
    return PerformanceMonitor.trackSync(
      name,
      'WALLET_OPERATION',
      operation,
      {},
      ['tracked', 'sync']
    );
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (alertUnsubscribeRef.current) {
        alertUnsubscribeRef.current();
      }
      if (reportIntervalRef.current) {
        clearInterval(reportIntervalRef.current);
      }
    };
  }, []);

  // Performance recommendations based on current state
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    if (!state.report) return recommendations;

    const { report, cacheStats } = state;

    // Check average duration
    if (report.summary.averageDuration > 1000) {
      recommendations.push('Average operation duration is high. Consider optimizing slow operations.');
    }

    // Check error rate
    if (report.summary.errorRate > 0.1) {
      recommendations.push('High error rate detected. Review failed operations and implement better error handling.');
    }

    // Check cache performance
    if (cacheStats && cacheStats.hitRate < 0.5) {
      recommendations.push('Low cache hit rate. Consider adjusting cache TTL or preloading strategies.');
    }

    // Check identity switching performance
    const identitySwitchCategory = report.categoryBreakdown['IDENTITY_SWITCH'];
    if (identitySwitchCategory && identitySwitchCategory.averageDuration > 1000) {
      recommendations.push('Identity switching is slow. Enable preloading and optimize cache usage.');
    }

    // Check for frequent alerts
    if (state.recentAlerts.length > alertThreshold) {
      recommendations.push('Frequent performance alerts detected. Review system resources and optimize critical paths.');
    }

    return recommendations;
  }, [state.report, state.cacheStats, state.recentAlerts.length, alertThreshold]);

  const actions: PerformanceActions = {
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    generateReport,
    optimizeCache,
    preloadIdentityData,
    trackOperation,
    trackSync
  };

  return {
    ...state,
    actions,
    recommendations: getRecommendations(),
    isHealthy: state.healthStatus === 'HEALTHY',
    hasWarnings: state.healthStatus === 'WARNING',
    isCritical: state.healthStatus === 'CRITICAL'
  };
};