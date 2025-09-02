/**
 * Performance Regression Detector
 * 
 * Advanced regression detection system that uses statistical analysis
 * and machine learning to identify performance degradations in Qflow executions.
 */

import { EventEmitter } from 'events';
import { ExecutionTrace, PerformanceBaseline } from './PerformanceProfiler';

export interface RegressionConfig {
  enableDetection: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  minSampleSize: number;
  confidenceThreshold: number;
  alertThreshold: number;
  windowSize: number;
}

export interface RegressionAlert {
  flowId: string;
  metric: 'duration' | 'memory' | 'cpu' | 'throughput';
  severity: 'warning' | 'critical';
  currentValue: number;
  baselineValue: number;
  regressionPercent: number;
  confidence: number;
  detectedAt: number;
  affectedExecutions: string[];
  possibleCauses: string[];
  recommendations: string[];
}

export interface StatisticalAnalysis {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  outliers: number[];
  trend: 'improving' | 'stable' | 'degrading';
  changePoint?: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  expectedRange: [number, number];
  actualValue: number;
  confidence: number;
}

export class AdvancedRegressionDetector extends EventEmitter {
  private config: RegressionConfig;
  private performanceHistory: Map<string, number[]>;
  private regressionAlerts: Map<string, RegressionAlert[]>;
  private statisticalModels: Map<string, StatisticalModel>;

  constructor(config: RegressionConfig) {
    super();
    this.config = config;
    this.performanceHistory = new Map();
    this.regressionAlerts = new Map();
    this.statisticalModels = new Map();
  }

  /**
   * Analyze execution for performance regressions
   */
  public analyzeExecution(trace: ExecutionTrace, baseline?: PerformanceBaseline): RegressionAlert[] {
    if (!this.config.enableDetection) {
      return [];
    }

    const alerts: RegressionAlert[] = [];
    const flowId = trace.flowId;

    // Update performance history
    this.updatePerformanceHistory(flowId, trace);

    // Get historical data
    const history = this.performanceHistory.get(flowId) || [];
    
    if (history.length < this.config.minSampleSize) {
      return alerts;
    }

    // Perform statistical analysis
    const analysis = this.performStatisticalAnalysis(history);
    
    // Detect anomalies
    const durationAnomaly = this.detectAnomaly(
      trace.totalDuration || 0,
      history,
      'duration'
    );

    const memoryAnomaly = this.detectAnomaly(
      trace.memoryPeak,
      this.getMemoryHistory(flowId),
      'memory'
    );

    // Check for regressions
    if (durationAnomaly.isAnomaly && durationAnomaly.actualValue > durationAnomaly.expectedRange[1]) {
      alerts.push(this.createRegressionAlert(
        flowId,
        'duration',
        durationAnomaly,
        analysis,
        trace,
        baseline
      ));
    }

    if (memoryAnomaly.isAnomaly && memoryAnomaly.actualValue > memoryAnomaly.expectedRange[1]) {
      alerts.push(this.createRegressionAlert(
        flowId,
        'memory',
        memoryAnomaly,
        analysis,
        trace,
        baseline
      ));
    }

    // Detect change points
    const changePoint = this.detectChangePoint(history);
    if (changePoint && changePoint > history.length * 0.8) {
      alerts.push(this.createChangePointAlert(flowId, changePoint, history, trace));
    }

    // Store alerts
    if (alerts.length > 0) {
      const existingAlerts = this.regressionAlerts.get(flowId) || [];
      this.regressionAlerts.set(flowId, [...existingAlerts, ...alerts]);
      
      // Emit alerts
      alerts.forEach(alert => {
        this.emit('regression_detected', alert);
      });
    }

    return alerts;
  }

  /**
   * Perform comprehensive statistical analysis
   */
  private performStatisticalAnalysis(data: number[]): StatisticalAnalysis {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    // Calculate basic statistics
    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const median = n % 2 === 0 
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
      : sorted[Math.floor(n / 2)];
    
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const percentiles = {
      p50: this.calculatePercentile(sorted, 0.5),
      p75: this.calculatePercentile(sorted, 0.75),
      p90: this.calculatePercentile(sorted, 0.9),
      p95: this.calculatePercentile(sorted, 0.95),
      p99: this.calculatePercentile(sorted, 0.99)
    };

    // Detect outliers using IQR method
    const q1 = this.calculatePercentile(sorted, 0.25);
    const q3 = this.calculatePercentile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers = data.filter(val => val < lowerBound || val > upperBound);

    // Detect trend using linear regression
    const trend = this.calculateTrend(data);

    return {
      mean,
      median,
      standardDeviation,
      variance,
      percentiles,
      outliers,
      trend
    };
  }

  /**
   * Detect anomalies using statistical methods
   */
  private detectAnomaly(
    value: number, 
    history: number[], 
    metric: string
  ): AnomalyDetectionResult {
    if (history.length < this.config.minSampleSize) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        expectedRange: [0, 0],
        actualValue: value,
        confidence: 0
      };
    }

    const analysis = this.performStatisticalAnalysis(history);
    
    // Use different detection methods based on sensitivity
    let threshold: number;
    switch (this.config.sensitivityLevel) {
      case 'high':
        threshold = 2; // 2 standard deviations
        break;
      case 'medium':
        threshold = 2.5;
        break;
      case 'low':
        threshold = 3;
        break;
    }

    const expectedRange: [number, number] = [
      analysis.mean - threshold * analysis.standardDeviation,
      analysis.mean + threshold * analysis.standardDeviation
    ];

    const isAnomaly = value < expectedRange[0] || value > expectedRange[1];
    
    // Calculate anomaly score (z-score)
    const anomalyScore = Math.abs(value - analysis.mean) / analysis.standardDeviation;
    
    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(history.length / 50, 1) * 
                      (1 - analysis.standardDeviation / analysis.mean);

    return {
      isAnomaly,
      anomalyScore,
      expectedRange,
      actualValue: value,
      confidence
    };
  }

  /**
   * Detect change points in time series data
   */
  private detectChangePoint(data: number[]): number | null {
    if (data.length < 10) return null;

    const windowSize = Math.min(this.config.windowSize, Math.floor(data.length / 3));
    let maxScore = 0;
    let changePoint: number | null = null;

    // Sliding window approach to detect change points
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const before = data.slice(i - windowSize, i);
      const after = data.slice(i, i + windowSize);
      
      const beforeMean = before.reduce((sum, val) => sum + val, 0) / before.length;
      const afterMean = after.reduce((sum, val) => sum + val, 0) / after.length;
      
      const score = Math.abs(afterMean - beforeMean) / beforeMean;
      
      if (score > maxScore && score > this.config.alertThreshold) {
        maxScore = score;
        changePoint = i;
      }
    }

    return changePoint;
  }

  /**
   * Create regression alert
   */
  private createRegressionAlert(
    flowId: string,
    metric: 'duration' | 'memory' | 'cpu' | 'throughput',
    anomaly: AnomalyDetectionResult,
    analysis: StatisticalAnalysis,
    trace: ExecutionTrace,
    baseline?: PerformanceBaseline
  ): RegressionAlert {
    const regressionPercent = baseline 
      ? ((anomaly.actualValue - baseline.averageDuration) / baseline.averageDuration) * 100
      : ((anomaly.actualValue - analysis.mean) / analysis.mean) * 100;

    const severity: 'warning' | 'critical' = 
      regressionPercent > 50 || anomaly.anomalyScore > 4 ? 'critical' : 'warning';

    return {
      flowId,
      metric,
      severity,
      currentValue: anomaly.actualValue,
      baselineValue: baseline?.averageDuration || analysis.mean,
      regressionPercent: Math.abs(regressionPercent),
      confidence: anomaly.confidence,
      detectedAt: Date.now(),
      affectedExecutions: [trace.executionId],
      possibleCauses: this.identifyPossibleCauses(trace, anomaly, metric),
      recommendations: this.generateRecommendations(metric, regressionPercent, trace)
    };
  }

  /**
   * Create change point alert
   */
  private createChangePointAlert(
    flowId: string,
    changePoint: number,
    history: number[],
    trace: ExecutionTrace
  ): RegressionAlert {
    const beforeMean = history.slice(0, changePoint).reduce((sum, val) => sum + val, 0) / changePoint;
    const afterMean = history.slice(changePoint).reduce((sum, val) => sum + val, 0) / (history.length - changePoint);
    const regressionPercent = ((afterMean - beforeMean) / beforeMean) * 100;

    return {
      flowId,
      metric: 'duration',
      severity: Math.abs(regressionPercent) > 30 ? 'critical' : 'warning',
      currentValue: afterMean,
      baselineValue: beforeMean,
      regressionPercent: Math.abs(regressionPercent),
      confidence: 0.8,
      detectedAt: Date.now(),
      affectedExecutions: [trace.executionId],
      possibleCauses: [
        'System configuration change',
        'Code deployment',
        'Infrastructure change',
        'Data volume increase'
      ],
      recommendations: [
        'Review recent system changes',
        'Check infrastructure metrics',
        'Analyze execution logs',
        'Consider rollback if critical'
      ]
    };
  }

  /**
   * Identify possible causes of regression
   */
  private identifyPossibleCauses(
    trace: ExecutionTrace,
    anomaly: AnomalyDetectionResult,
    metric: string
  ): string[] {
    const causes: string[] = [];

    // Analyze bottlenecks
    if (trace.bottlenecks.length > 0) {
      const criticalBottlenecks = trace.bottlenecks.filter(b => b.severity === 'critical');
      if (criticalBottlenecks.length > 0) {
        causes.push(`Critical bottlenecks detected: ${criticalBottlenecks.map(b => b.type).join(', ')}`);
      }
    }

    // Metric-specific causes
    switch (metric) {
      case 'duration':
        if (anomaly.anomalyScore > 3) {
          causes.push('Significant execution time increase');
        }
        causes.push('Possible network latency increase', 'Resource contention', 'Algorithm inefficiency');
        break;
      
      case 'memory':
        causes.push('Memory leak', 'Large data processing', 'Inefficient data structures');
        break;
      
      case 'cpu':
        causes.push('CPU-intensive operations', 'Inefficient algorithms', 'Resource competition');
        break;
    }

    return causes;
  }

  /**
   * Generate recommendations for addressing regression
   */
  private generateRecommendations(
    metric: string,
    regressionPercent: number,
    trace: ExecutionTrace
  ): string[] {
    const recommendations: string[] = [];

    // Severity-based recommendations
    if (regressionPercent > 50) {
      recommendations.push('Immediate investigation required - critical performance degradation');
      recommendations.push('Consider rolling back recent changes');
    } else if (regressionPercent > 25) {
      recommendations.push('Schedule performance investigation');
      recommendations.push('Monitor closely for further degradation');
    }

    // Metric-specific recommendations
    switch (metric) {
      case 'duration':
        recommendations.push('Profile execution to identify slow steps');
        recommendations.push('Consider parallel execution optimization');
        recommendations.push('Review validation pipeline performance');
        break;
      
      case 'memory':
        recommendations.push('Analyze memory usage patterns');
        recommendations.push('Implement memory optimization strategies');
        recommendations.push('Consider data streaming for large datasets');
        break;
      
      case 'cpu':
        recommendations.push('Optimize CPU-intensive operations');
        recommendations.push('Consider load balancing across nodes');
        recommendations.push('Review algorithm efficiency');
        break;
    }

    // Bottleneck-specific recommendations
    trace.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        recommendations.push(bottleneck.recommendation);
      }
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(flowId: string, trace: ExecutionTrace): void {
    const history = this.performanceHistory.get(flowId) || [];
    
    if (trace.totalDuration) {
      history.push(trace.totalDuration);
    }

    // Keep only recent history
    const maxHistory = this.config.windowSize * 2;
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }

    this.performanceHistory.set(flowId, history);
  }

  /**
   * Get memory usage history
   */
  private getMemoryHistory(flowId: string): number[] {
    // In a real implementation, this would maintain separate memory history
    // For now, return empty array
    return [];
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedData: number[], percentile: number): number {
    const index = percentile * (sortedData.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedData.length) return sortedData[sortedData.length - 1];
    if (lower < 0) return sortedData[0];

    return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(data: number[]): 'improving' | 'stable' | 'degrading' {
    if (data.length < 3) return 'stable';

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const threshold = (sumY / n) * 0.05; // 5% threshold

    if (slope > threshold) return 'degrading';
    if (slope < -threshold) return 'improving';
    return 'stable';
  }

  /**
   * Get regression alerts for a flow
   */
  public getRegressionAlerts(flowId: string): RegressionAlert[] {
    return this.regressionAlerts.get(flowId) || [];
  }

  /**
   * Clear regression alerts
   */
  public clearRegressionAlerts(flowId?: string): void {
    if (flowId) {
      this.regressionAlerts.delete(flowId);
    } else {
      this.regressionAlerts.clear();
    }
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(flowId: string): any {
    const history = this.performanceHistory.get(flowId) || [];
    const alerts = this.getRegressionAlerts(flowId);
    
    if (history.length === 0) {
      return {
        flowId,
        status: 'insufficient_data',
        executionCount: 0
      };
    }

    const analysis = this.performStatisticalAnalysis(history);
    const recentAlerts = alerts.filter(a => Date.now() - a.detectedAt < 86400000); // 24 hours

    return {
      flowId,
      status: recentAlerts.length > 0 ? 'degraded' : 'healthy',
      executionCount: history.length,
      analysis,
      recentAlerts: recentAlerts.length,
      lastAnalyzed: Date.now()
    };
  }
}

/**
 * Statistical Model for advanced analysis
 */
class StatisticalModel {
  private data: number[] = [];
  private model: any = null;

  public addDataPoint(value: number): void {
    this.data.push(value);
    
    // Keep only recent data
    if (this.data.length > 1000) {
      this.data.shift();
    }
  }

  public predict(steps: number = 1): number[] {
    // Simple moving average prediction
    if (this.data.length < 3) {
      return Array(steps).fill(this.data[this.data.length - 1] || 0);
    }

    const windowSize = Math.min(10, this.data.length);
    const recent = this.data.slice(-windowSize);
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;

    return Array(steps).fill(average);
  }

  public getConfidenceInterval(confidence: number = 0.95): [number, number] {
    if (this.data.length < 2) {
      return [0, 0];
    }

    const mean = this.data.reduce((sum, val) => sum + val, 0) / this.data.length;
    const variance = this.data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (this.data.length - 1);
    const stdDev = Math.sqrt(variance);
    
    // Approximate confidence interval
    const margin = 1.96 * stdDev / Math.sqrt(this.data.length); // 95% confidence
    
    return [mean - margin, mean + margin];
  }
}