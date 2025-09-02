/**
 * Performance Dashboard Component
 * Displays real-time performance metrics, alerts, and optimization recommendations
 * for wallet operations and identity switching
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PerformanceMonitor, PerformanceReport, PerformanceAlert } from '../../utils/performance/PerformanceMonitor';
import { WalletCache } from '../../utils/performance/WalletCache';

interface PerformanceDashboardProps {
  className?: string;
  showAlerts?: boolean;
  showRecommendations?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  showAlerts = true,
  showRecommendations = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  // Load performance data
  const loadPerformanceData = useCallback(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedTimeRange) {
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
    }

    const performanceReport = PerformanceMonitor.getReport(startDate, now);
    const recentAlerts = PerformanceMonitor.getRecentAlerts(20);
    const walletCacheStats = WalletCache.getStats();

    setReport(performanceReport);
    setAlerts(recentAlerts);
    setCacheStats(walletCacheStats);
    setLoading(false);
  }, [selectedTimeRange]);

  // Auto-refresh effect
  useEffect(() => {
    loadPerformanceData();

    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadPerformanceData, autoRefresh, refreshInterval]);

  // Subscribe to new alerts
  useEffect(() => {
    const unsubscribe = PerformanceMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 19)]);
    });

    return unsubscribe;
  }, []);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getSeverityColor = (severity: 'WARNING' | 'CRITICAL'): string => {
    return severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600';
  };

  const getSeverityBg = (severity: 'WARNING' | 'CRITICAL'): string => {
    return severity === 'CRITICAL' ? 'bg-red-100' : 'bg-yellow-100';
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Dashboard</h3>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={loadPerformanceData}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-600">Total Operations</div>
            <div className="text-2xl font-bold text-blue-900">{report.summary.totalMetrics}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-600">Avg Duration</div>
            <div className="text-2xl font-bold text-green-900">
              {formatDuration(report.summary.averageDuration)}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-yellow-600">Error Rate</div>
            <div className="text-2xl font-bold text-yellow-900">
              {formatPercentage(report.summary.errorRate)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-red-600">Alerts</div>
            <div className="text-2xl font-bold text-red-900">{report.summary.alertsGenerated}</div>
          </div>
        </div>
      )}

      {/* Cache Performance */}
      {cacheStats && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Cache Performance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Hit Rate</div>
              <div className="text-xl font-bold text-gray-900">
                {formatPercentage(cacheStats.hitRate)}
              </div>
              <div className="text-xs text-gray-500">
                {cacheStats.totalEntries} entries
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Cache Size</div>
              <div className="text-xl font-bold text-gray-900">
                {(cacheStats.totalSize / 1024 / 1024).toFixed(1)}MB
              </div>
              <div className="text-xs text-gray-500">
                {cacheStats.evictionCount} evictions
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Avg Access</div>
              <div className="text-xl font-bold text-gray-900">
                {cacheStats.averageAccessCount.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">per entry</div>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {report && Object.keys(report.categoryBreakdown).length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Performance by Category</h4>
          <div className="space-y-2">
            {Object.entries(report.categoryBreakdown).map(([category, stats]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{category.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-600">
                    {stats.count} operations • {formatPercentage(stats.errorRate)} error rate
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {formatDuration(stats.averageDuration)}
                  </div>
                  <div className="text-sm text-gray-600">avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {showAlerts && alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Alerts</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity} - {alert.metric.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {formatDuration(alert.metric.duration || 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && report && report.recommendations.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">Optimization Recommendations</h4>
          <div className="space-y-2">
            {report.recommendations.map((recommendation, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="text-sm text-blue-800">{recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Extremes */}
      {report && (report.summary.slowestOperation || report.summary.fastestOperation) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.summary.slowestOperation && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h5 className="font-medium text-red-800 mb-2">Slowest Operation</h5>
              <div className="text-sm text-red-700">
                <div className="font-medium">{report.summary.slowestOperation.name}</div>
                <div>{formatDuration(report.summary.slowestOperation.duration || 0)}</div>
                <div className="text-xs mt-1">
                  {new Date(report.summary.slowestOperation.startTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
          {report.summary.fastestOperation && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h5 className="font-medium text-green-800 mb-2">Fastest Operation</h5>
              <div className="text-sm text-green-700">
                <div className="font-medium">{report.summary.fastestOperation.name}</div>
                <div>{formatDuration(report.summary.fastestOperation.duration || 0)}</div>
                <div className="text-xs mt-1">
                  {new Date(report.summary.fastestOperation.startTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;