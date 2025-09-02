/**
 * Performance Dashboard - Performance metrics and monitoring for DAO components
 * 
 * Provides comprehensive performance monitoring including API response times,
 * component render tracking, and performance alerts for development and debugging.
 */

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import { 
  usePerformanceDashboard, 
  useMemoryMonitoring,
  PerformanceMetrics 
} from '../../utils/performance/monitoring';

interface PerformanceDashboardProps {
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  show = false,
  position = 'bottom-right',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'api' | 'render' | 'alerts'>('summary');
  
  const { 
    summary, 
    alerts, 
    getApiMetrics, 
    getRenderMetrics, 
    clearMetrics, 
    refreshData 
  } = usePerformanceDashboard();
  
  const { memoryInfo } = useMemoryMonitoring();

  if (!show) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  if (!isExpanded) {
    return (
      <div className={cn(`fixed ${positionClasses[position]} z-50`, className)}>
        <Button
          onClick={() => setIsExpanded(true)}
          size="sm"
          variant="outline"
          className="bg-black bg-opacity-80 text-white border-gray-600 hover:bg-opacity-90"
        >
          <ChartBarIcon className="h-4 w-4 mr-1" />
          Perf
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(`fixed ${positionClasses[position]} z-50 w-96 max-h-96 overflow-hidden`, className)}>
      <Card className="bg-black bg-opacity-90 text-white border-gray-600">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono">Performance Monitor</CardTitle>
            <div className="flex items-center space-x-1">
              <Button
                onClick={refreshData}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-300 hover:text-white"
              >
                <ArrowPathIcon className="h-3 w-3" />
              </Button>
              <Button
                onClick={clearMetrics}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-300 hover:text-white"
              >
                <XMarkIcon className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setIsExpanded(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-gray-300 hover:text-white"
              >
                <EyeSlashIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-2">
            {(['summary', 'api', 'render', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={cn(
                  "px-2 py-1 text-xs rounded capitalize",
                  selectedTab === tab 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                {tab}
                {tab === 'alerts' && alerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                    {alerts.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 text-xs font-mono max-h-64 overflow-y-auto">
          {selectedTab === 'summary' && (
            <div className="space-y-3">
              {/* API Summary */}
              <div>
                <div className="text-yellow-300 font-semibold mb-1">API Calls (5min)</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Total: {summary.api.totalCalls}</div>
                  <div>Avg: {formatDuration(summary.api.averageResponseTime)}</div>
                  <div>Errors: {(summary.api.errorRate * 100).toFixed(1)}%</div>
                  <div>Slow: {summary.api.slowCalls}</div>
                </div>
              </div>

              {/* Render Summary */}
              <div>
                <div className="text-green-300 font-semibold mb-1">Renders (5min)</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Total: {summary.render.totalRenders}</div>
                  <div>Avg: {formatDuration(summary.render.averageRenderTime)}</div>
                  <div>Slow: {summary.render.slowRenders}</div>
                  <div>-</div>
                </div>
              </div>

              {/* Memory Summary */}
              {memoryInfo && (
                <div>
                  <div className="text-blue-300 font-semibold mb-1">Memory</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Used: {formatBytes(memoryInfo.usedJSHeapSize)}</div>
                    <div>Total: {formatBytes(memoryInfo.totalJSHeapSize)}</div>
                    <div>Limit: {formatBytes(memoryInfo.jsHeapSizeLimit)}</div>
                    <div>
                      Usage: {((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Alerts Summary */}
              <div>
                <div className="text-red-300 font-semibold mb-1">Alerts (5min)</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>High: {summary.alerts.high}</div>
                  <div>Med: {summary.alerts.medium}</div>
                  <div>Low: {summary.alerts.low}</div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'api' && (
            <div className="space-y-2">
              <div className="text-yellow-300 font-semibold">Recent API Calls</div>
              {getApiMetrics().slice(-10).reverse().map((metric, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="truncate flex-1 mr-2">
                    {metric.endpoint.split('/').pop() || metric.endpoint}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={metric.success ? 'text-green-400' : 'text-red-400'}>
                      {formatDuration(metric.duration)}
                    </span>
                    {!metric.success && (
                      <ExclamationTriangleIcon className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'render' && (
            <div className="space-y-2">
              <div className="text-green-300 font-semibold">Recent Renders</div>
              {getRenderMetrics().slice(-10).reverse().map((metric, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="truncate flex-1 mr-2">
                    {metric.componentName}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={metric.renderTime > 100 ? 'text-red-400' : 'text-green-400'}>
                      {formatDuration(metric.renderTime)}
                    </span>
                    {metric.renderTime > 100 && (
                      <ExclamationTriangleIcon className="h-3 w-3 text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'alerts' && (
            <div className="space-y-2">
              <div className="text-red-300 font-semibold">Recent Alerts</div>
              {alerts.slice(-10).reverse().map((alert, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getSeverityColor(alert.severity))}
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-gray-300">
                      {alert.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 pl-2">
                    {alert.message}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-gray-400 text-xs">No alerts</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;