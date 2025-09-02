/**
 * Performance Profiler
 * 
 * Provides comprehensive performance profiling and bottleneck identification
 * for Qflow execution, including execution tracing, performance regression
 * detection, and automated optimization recommendations.
 */

import { EventEmitter } from 'events';
import { FlowDefinition, FlowStep, ExecutionContext } from '../models/FlowDefinition';

export interface ProfilerConfig {
  enableTracing: boolean;
  enableBottleneckDetection: boolean;
  enableRegressionDetection: boolean;
  samplingRate: number;
  maxTraceHistory: number;
  performanceThresholds: PerformanceThresholds;
}

export interface PerformanceThresholds {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  minThroughput: number;
  maxLatency: number;
}

export interface ExecutionTrace {
  traceId: string;
  flowId: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  steps: StepTrace[];
  totalDuration?: number;
  memoryPeak: number;
  cpuUsage: number;
  bottlenecks: Bottleneck[];
}

export interface StepTrace {
  stepId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: number;
  cpuUsage: number;
  resourceWaitTime: number;
  validationTime: number;
  executionTime: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export interface Bottleneck {
  type: 'cpu' | 'memory' | 'io' | 'validation' | 'resource-wait';
  stepId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // 0-1 scale
  description: string;
  recommendation: string;
}

export interface PerformanceBaseline {
  flowId: string;
  averageDuration: number;
  averageMemoryUsage: number;
  averageCpuUsage: number;
  sampleCount: number;
  lastUpdated: number;
}

export interface FlowPerformanceAnalysis {
  flowId: string;
  executionCount: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  bottlenecks: Bottleneck[];
  recommendations: string[];
  trends: PerformanceTrend[];
}

export interface PerformanceTrend {
  metric: 'duration' | 'memory' | 'cpu' | 'throughput';
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  confidence: number;
}

export interface OptimizationRecommendation {
  type: 'caching' | 'parallelization' | 'resource-optimization' | 'step-reordering';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImprovement: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  steps: string[];
}

export class RegressionDetector {
  private readonly REGRESSION_THRESHOLD = 0.15; // 15% performance degradation
  private readonly MIN_SAMPLES = 5;

  public detectRegression(
    currentTrace: ExecutionTrace,
    baseline: PerformanceBaseline
  ): boolean {
    if (baseline.sampleCount < this.MIN_SAMPLES) {
      return false;
    }

    const durationRegression = (currentTrace.totalDuration! - baseline.averageDuration) / baseline.averageDuration;
    const memoryRegression = (currentTrace.memoryPeak - baseline.averageMemoryUsage) / baseline.averageMemoryUsage;

    return durationRegression > this.REGRESSION_THRESHOLD || memoryRegression > this.REGRESSION_THRESHOLD;
  }

  public calculateTrend(values: number[]): PerformanceTrend {
    if (values.length < 3) {
      return {
        metric: 'duration',
        direction: 'stable',
        changePercent: 0,
        confidence: 0
      };
    }

    // Simple linear regression to detect trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changePercent = (slope / (sumY / n)) * 100;

    return {
      metric: 'duration',
      direction: changePercent > 5 ? 'degrading' : changePercent < -5 ? 'improving' : 'stable',
      changePercent: Math.abs(changePercent),
      confidence: Math.min(n / 10, 1) // Confidence increases with sample size
    };
  }
}

export class PerformanceProfiler extends EventEmitter {
  private config: ProfilerConfig;
  private activeTraces: Map<string, ExecutionTrace>;
  private traceHistory: ExecutionTrace[];
  private performanceBaselines: Map<string, PerformanceBaseline>;
  private regressionDetector: RegressionDetector;

  constructor(config: ProfilerConfig) {
    super();
    this.config = config;
    this.activeTraces = new Map();
    this.traceHistory = [];
    this.performanceBaselines = new Map();
    this.regressionDetector = new RegressionDetector();
  }

  /**
   * Start profiling an execution
   */
  public startProfiling(
    flowId: string,
    executionId: string,
    context: ExecutionContext
  ): string {
    if (!this.config.enableTracing) {
      return '';
    }

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const trace: ExecutionTrace = {
      traceId,
      flowId,
      executionId,
      startTime: Date.now(),
      steps: [],
      memoryPeak: 0,
      cpuUsage: 0,
      bottlenecks: []
    };

    this.activeTraces.set(traceId, trace);

    this.emit('profiling_started', {
      traceId,
      flowId,
      executionId,
      timestamp: Date.now()
    });

    return traceId;
  }

  /**
   * Profile a step execution
   */
  public profileStep(
    traceId: string,
    step: FlowStep,
    startTime: number,
    endTime?: number
  ): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    const stepTrace: StepTrace = {
      stepId: step.id,
      startTime,
      endTime,
      duration: endTime ? endTime - startTime : undefined,
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCurrentCpuUsage(),
      resourceWaitTime: 0,
      validationTime: 0,
      executionTime: 0,
      status: endTime ? 'completed' : 'running'
    };

    // Update or add step trace
    const existingIndex = trace.steps.findIndex(s => s.stepId === step.id);
    if (existingIndex >= 0) {
      trace.steps[existingIndex] = stepTrace;
    } else {
      trace.steps.push(stepTrace);
    }

    // Update trace memory peak
    trace.memoryPeak = Math.max(trace.memoryPeak, stepTrace.memoryUsage);

    // Detect bottlenecks if step is completed
    if (endTime && this.config.enableBottleneckDetection) {
      const bottlenecks = this.detectStepBottlenecks(stepTrace, step);
      trace.bottlenecks.push(...bottlenecks);
    }

    this.emit('step_profiled', {
      traceId,
      stepId: step.id,
      duration: stepTrace.duration,
      memoryUsage: stepTrace.memoryUsage
    });
  }

  /**
   * Complete profiling for an execution
   */
  public completeProfiling(traceId: string): ExecutionTrace | null {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    trace.endTime = Date.now();
    trace.totalDuration = trace.endTime - trace.startTime;

    // Perform final analysis
    this.performFinalAnalysis(trace);

    // Move to history
    this.traceHistory.push(trace);
    if (this.traceHistory.length > this.config.maxTraceHistory) {
      this.traceHistory.shift();
    }

    this.activeTraces.delete(traceId);

    // Check for performance regressions
    if (this.config.enableRegressionDetection) {
      this.checkForRegressions(trace);
    }

    this.emit('profiling_completed', {
      traceId,
      flowId: trace.flowId,
      totalDuration: trace.totalDuration,
      bottleneckCount: trace.bottlenecks.length,
      memoryPeak: trace.memoryPeak
    });

    return trace;
  }

  /**
   * Get performance analysis for a flow
   */
  public getFlowAnalysis(flowId: string): FlowPerformanceAnalysis {
    const flowTraces = this.traceHistory.filter(t => t.flowId === flowId);
    
    if (flowTraces.length === 0) {
      return {
        flowId,
        executionCount: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        bottlenecks: [],
        recommendations: ['No execution history available for analysis'],
        trends: []
      };
    }

    const analysis = this.analyzeFlowPerformance(flowTraces);
    return analysis;
  }

  /**
   * Detect bottlenecks in step execution
   */
  private detectStepBottlenecks(stepTrace: StepTrace, step: FlowStep): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const duration = stepTrace.duration || 0;

    // CPU bottleneck detection
    if (stepTrace.cpuUsage > 90) {
      bottlenecks.push({
        type: 'cpu',
        stepId: step.id,
        severity: stepTrace.cpuUsage > 95 ? 'critical' : 'high',
        impact: stepTrace.cpuUsage / 100,
        description: `High CPU usage (${stepTrace.cpuUsage}%) in step ${step.id}`,
        recommendation: 'Consider optimizing step logic or using parallel execution'
      });
    }

    // Memory bottleneck detection
    if (stepTrace.memoryUsage > this.config.performanceThresholds.maxMemoryUsage * 0.8) {
      bottlenecks.push({
        type: 'memory',
        stepId: step.id,
        severity: stepTrace.memoryUsage > this.config.performanceThresholds.maxMemoryUsage ? 'critical' : 'high',
        impact: stepTrace.memoryUsage / this.config.performanceThresholds.maxMemoryUsage,
        description: `High memory usage (${Math.round(stepTrace.memoryUsage / 1024 / 1024)}MB) in step ${step.id}`,
        recommendation: 'Consider lazy loading or data streaming for large datasets'
      });
    }

    // Validation time bottleneck
    if (stepTrace.validationTime > duration * 0.3) {
      bottlenecks.push({
        type: 'validation',
        stepId: step.id,
        severity: stepTrace.validationTime > duration * 0.5 ? 'high' : 'medium',
        impact: stepTrace.validationTime / duration,
        description: `High validation time (${stepTrace.validationTime}ms) in step ${step.id}`,
        recommendation: 'Consider caching validation results or optimizing validation pipeline'
      });
    }

    // Resource wait time bottleneck
    if (stepTrace.resourceWaitTime > duration * 0.2) {
      bottlenecks.push({
        type: 'resource-wait',
        stepId: step.id,
        severity: stepTrace.resourceWaitTime > duration * 0.4 ? 'high' : 'medium',
        impact: stepTrace.resourceWaitTime / duration,
        description: `High resource wait time (${stepTrace.resourceWaitTime}ms) in step ${step.id}`,
        recommendation: 'Consider resource pooling or pre-allocation strategies'
      });
    }

    return bottlenecks;
  }

  /**
   * Perform final analysis on completed trace
   */
  private performFinalAnalysis(trace: ExecutionTrace): void {
    // Calculate step execution percentages
    const totalDuration = trace.totalDuration || 0;
    trace.steps.forEach(step => {
      if (step.duration) {
        const percentage = (step.duration / totalDuration) * 100;
        if (percentage > 50) {
          trace.bottlenecks.push({
            type: 'cpu',
            stepId: step.stepId,
            severity: 'high',
            impact: percentage / 100,
            description: `Step ${step.stepId} consumes ${percentage.toFixed(1)}% of total execution time`,
            recommendation: 'Consider breaking down this step or optimizing its implementation'
          });
        }
      }
    });

    // Update performance baseline
    this.updatePerformanceBaseline(trace);
  }

  /**
   * Update performance baseline for a flow
   */
  private updatePerformanceBaseline(trace: ExecutionTrace): void {
    const existing = this.performanceBaselines.get(trace.flowId);
    
    if (!existing) {
      this.performanceBaselines.set(trace.flowId, {
        flowId: trace.flowId,
        averageDuration: trace.totalDuration || 0,
        averageMemoryUsage: trace.memoryPeak,
        averageCpuUsage: trace.cpuUsage,
        sampleCount: 1,
        lastUpdated: Date.now()
      });
    } else {
      // Exponential moving average
      const alpha = 0.1;
      existing.averageDuration = existing.averageDuration * (1 - alpha) + (trace.totalDuration || 0) * alpha;
      existing.averageMemoryUsage = existing.averageMemoryUsage * (1 - alpha) + trace.memoryPeak * alpha;
      existing.averageCpuUsage = existing.averageCpuUsage * (1 - alpha) + trace.cpuUsage * alpha;
      existing.sampleCount++;
      existing.lastUpdated = Date.now();
    }
  }

  /**
   * Check for performance regressions
   */
  private checkForRegressions(trace: ExecutionTrace): void {
    const baseline = this.performanceBaselines.get(trace.flowId);
    if (!baseline) return;

    const hasRegression = this.regressionDetector.detectRegression(trace, baseline);
    
    if (hasRegression) {
      this.emit('performance_regression', {
        flowId: trace.flowId,
        executionId: trace.executionId,
        currentDuration: trace.totalDuration,
        baselineDuration: baseline.averageDuration,
        regressionPercent: ((trace.totalDuration! - baseline.averageDuration) / baseline.averageDuration) * 100,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Analyze flow performance from historical traces
   */
  private analyzeFlowPerformance(traces: ExecutionTrace[]): FlowPerformanceAnalysis {
    const durations = traces.map(t => t.totalDuration || 0).filter(d => d > 0);
    
    if (durations.length === 0) {
      return {
        flowId: traces[0].flowId,
        executionCount: traces.length,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        bottlenecks: [],
        recommendations: ['No valid execution durations found'],
        trends: []
      };
    }

    durations.sort((a, b) => a - b);

    const analysis: FlowPerformanceAnalysis = {
      flowId: traces[0].flowId,
      executionCount: traces.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      bottlenecks: this.aggregateBottlenecks(traces),
      recommendations: [],
      trends: []
    };

    // Calculate trends
    const recentDurations = durations.slice(-10); // Last 10 executions
    analysis.trends.push(this.regressionDetector.calculateTrend(recentDurations));

    // Generate recommendations
    analysis.recommendations = this.generateOptimizationRecommendations(analysis);

    return analysis;
  }

  /**
   * Aggregate bottlenecks from multiple traces
   */
  private aggregateBottlenecks(traces: ExecutionTrace[]): Bottleneck[] {
    const bottleneckMap = new Map<string, Bottleneck>();

    traces.forEach(trace => {
      trace.bottlenecks.forEach(bottleneck => {
        const key = `${bottleneck.type}_${bottleneck.stepId}`;
        const existing = bottleneckMap.get(key);

        if (existing) {
          existing.impact = Math.max(existing.impact, bottleneck.impact);
          if (bottleneck.severity === 'critical' || 
              (bottleneck.severity === 'high' && existing.severity !== 'critical')) {
            existing.severity = bottleneck.severity;
          }
        } else {
          bottleneckMap.set(key, { ...bottleneck });
        }
      });
    });

    return Array.from(bottleneckMap.values())
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10); // Top 10 bottlenecks
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(analysis: FlowPerformanceAnalysis): string[] {
    const recommendations: string[] = [];

    // High duration recommendation
    if (analysis.p95Duration > this.config.performanceThresholds.maxExecutionTime) {
      recommendations.push(
        `Flow execution time (P95: ${analysis.p95Duration}ms) exceeds threshold. Consider parallel execution or step optimization.`
      );
    }

    // Bottleneck-based recommendations
    analysis.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        recommendations.push(bottleneck.recommendation);
      }
    });

    // Trend-based recommendations
    analysis.trends.forEach(trend => {
      if (trend.direction === 'degrading' && trend.confidence > 0.7) {
        recommendations.push(
          `Performance is degrading for ${trend.metric} (${trend.changePercent.toFixed(1)}% worse). Investigation recommended.`
        );
      }
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Get current memory usage (mock implementation)
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Get current CPU usage (mock implementation)
   */
  private getCurrentCpuUsage(): number {
    // In a real implementation, this would use system monitoring
    return Math.random() * 100;
  }

  /**
   * Get optimization recommendations for a specific flow
   */
  public getOptimizationRecommendations(flowId: string): OptimizationRecommendation[] {
    const analysis = this.getFlowAnalysis(flowId);
    const recommendations: OptimizationRecommendation[] = [];

    // Caching recommendations
    const validationBottlenecks = analysis.bottlenecks.filter(b => b.type === 'validation');
    if (validationBottlenecks.length > 0) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        description: 'Implement validation result caching to reduce validation overhead',
        expectedImprovement: 0.3,
        implementationComplexity: 'medium',
        steps: [
          'Implement validation cache with TTL',
          'Add cache invalidation on policy changes',
          'Monitor cache hit rates'
        ]
      });
    }

    // Parallelization recommendations
    if (analysis.averageDuration > this.config.performanceThresholds.maxExecutionTime) {
      recommendations.push({
        type: 'parallelization',
        priority: 'high',
        description: 'Parallelize independent steps to reduce execution time',
        expectedImprovement: 0.4,
        implementationComplexity: 'high',
        steps: [
          'Analyze step dependencies',
          'Identify parallelizable steps',
          'Implement parallel execution engine',
          'Add synchronization points'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Export performance data for external analysis
   */
  public exportPerformanceData(flowId?: string): any {
    const traces = flowId 
      ? this.traceHistory.filter(t => t.flowId === flowId)
      : this.traceHistory;

    return {
      traces,
      baselines: flowId 
        ? this.performanceBaselines.get(flowId)
        : Object.fromEntries(this.performanceBaselines),
      exportedAt: Date.now(),
      config: this.config
    };
  }

  /**
   * Clear performance history
   */
  public clearHistory(flowId?: string): void {
    if (flowId) {
      this.traceHistory = this.traceHistory.filter(t => t.flowId !== flowId);
      this.performanceBaselines.delete(flowId);
    } else {
      this.traceHistory = [];
      this.performanceBaselines.clear();
    }
  }
}