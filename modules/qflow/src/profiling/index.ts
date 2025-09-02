/**
 * Performance Profiling Module
 * 
 * Comprehensive performance profiling and optimization tools for Qflow,
 * including execution profiling, bottleneck identification, performance
 * regression detection, and automated optimization recommendations.
 */

import { PerformanceProfiler, type ProfilerConfig } from './PerformanceProfiler';
import { OptimizationEngine, type OptimizationConfig } from './OptimizationEngine';
import { AdvancedRegressionDetector, type RegressionConfig } from './RegressionDetector';
import { PerformanceDashboard, type DashboardConfig } from './PerformanceDashboard';

export {
  PerformanceProfiler,
  type ProfilerConfig,
  type PerformanceThresholds,
  type ExecutionTrace,
  type StepTrace,
  type Bottleneck,
  type PerformanceBaseline,
  type FlowPerformanceAnalysis,
  type PerformanceTrend,
  type OptimizationRecommendation,
  RegressionDetector
} from './PerformanceProfiler';

export {
  OptimizationEngine,
  type OptimizationConfig,
  type OptimizationResult,
  type PerformanceMetrics,
  type OptimizationStrategy
} from './OptimizationEngine';

export {
  AdvancedRegressionDetector,
  type RegressionConfig,
  type RegressionAlert,
  type StatisticalAnalysis,
  type AnomalyDetectionResult
} from './RegressionDetector';

export {
  PerformanceDashboard,
  type DashboardConfig,
  type AlertThresholds,
  type DashboardMetrics,
  type SystemMetrics,
  type FlowMetrics,
  type DashboardAlert,
  type PerformanceTrends,
  type TrendData,
  type DataPoint
} from './PerformanceDashboard';

/**
 * Factory function to create a complete profiling system
 */
export function createProfilingSystem(config: {
  profiler: ProfilerConfig;
  optimization: OptimizationConfig;
  regression: RegressionConfig;
  dashboard: DashboardConfig;
}) {
  const profiler = new PerformanceProfiler(config.profiler);
  const regressionDetector = new AdvancedRegressionDetector(config.regression);
  const optimizationEngine = new OptimizationEngine(config.optimization, profiler);
  const dashboard = new PerformanceDashboard(
    config.dashboard,
    profiler,
    regressionDetector,
    optimizationEngine
  );

  return {
    profiler,
    regressionDetector,
    optimizationEngine,
    dashboard
  };
}

/**
 * Default configuration for profiling system
 */
export const defaultProfilingConfig = {
  profiler: {
    enableTracing: true,
    enableBottleneckDetection: true,
    enableRegressionDetection: true,
    samplingRate: 1.0,
    maxTraceHistory: 1000,
    performanceThresholds: {
      maxExecutionTime: 30000,
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      maxCpuUsage: 90,
      minThroughput: 10,
      maxLatency: 5000
    }
  },
  optimization: {
    enableAutoOptimization: false,
    optimizationThreshold: 10000, // 10 seconds
    maxOptimizationAttempts: 3,
    learningRate: 0.1,
    confidenceThreshold: 0.8
  },
  regression: {
    enableDetection: true,
    sensitivityLevel: 'medium' as const,
    minSampleSize: 10,
    confidenceThreshold: 0.8,
    alertThreshold: 0.2, // 20% degradation
    windowSize: 20
  },
  dashboard: {
    enableRealTimeUpdates: true,
    updateInterval: 5000, // 5 seconds
    maxDataPoints: 1000,
    enableAlerts: true,
    alertThresholds: {
      criticalLatency: 10000,
      warningLatency: 5000,
      criticalMemory: 90,
      warningMemory: 75,
      criticalErrorRate: 10,
      warningErrorRate: 5
    }
  }
};