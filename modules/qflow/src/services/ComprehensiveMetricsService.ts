/**
 * Comprehensive Metrics Collection Service for Qflow
 * Implements p99 latency, error budget burn, cache hit ratio, and RPS tracking
 */

import { EventEmitter } from 'events';

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  metadata: {
    unit: string;
    type: 'counter' | 'gauge' | 'histogram' | 'summary';
    description: string;
  };
}

export interface PercentileMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

export interface ErrorBudgetMetrics {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  errorBudget: number;
  budgetRemaining: number;
  budgetBurnRate: number;
  timeToExhaustion: number; // minutes
  sloCompliance: boolean;
}

export interface CacheMetrics {
  cacheName: string;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  evictions: number;
  avgResponseTime: number;
}

export interface ThroughputMetrics {
  rps: number;
  rpm: number;
  rph: number;
  totalRequests: number;
  peakRps: number;
  avgRps: number;
}

export interface FlowExecutionMetrics {
  flowId: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  stepCount: number;
  completedSteps: number;
  failedSteps: number;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'aborted';
  nodeId: string;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface ValidationPipelineMetrics {
  operationId: string;
  totalDuration: number;
  layerMetrics: Record<string, {
    duration: number;
    success: boolean;
    cacheHit: boolean;
    errorType?: string;
  }>;
  overallSuccess: boolean;
  cacheHitRate: number;
}

export class ComprehensiveMetricsService extends EventEmitter {
  private metricSeries: Map<string, MetricSeries>;
  private histograms: Map<string, number[]>;
  private counters: Map<string, number>;
  private gauges: Map<string, number>;
  private cacheMetrics: Map<string, CacheMetrics>;
  private errorBudgets: Map<string, ErrorBudgetMetrics>;
  private flowMetrics: Map<string, FlowExecutionMetrics>;
  private validationMetrics: Map<string, ValidationPipelineMetrics>;
  private aggregationIntervals: Map<string, NodeJS.Timeout>;
  private config: {
    retentionPeriod: number;
    aggregationInterval: number;
    maxSeriesPoints: number;
    errorBudgetWindow: number;
    sloTargets: {
      availability: number;
      latencyP99: number;
      errorRate: number;
    };
  };

  constructor(options: any = {}) {
    super();
    
    this.metricSeries = new Map();
    this.histograms = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.cacheMetrics = new Map();
    this.errorBudgets = new Map();
    this.flowMetrics = new Map();
    this.validationMetrics = new Map();
    this.aggregationIntervals = new Map();

    this.config = {
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      aggregationInterval: 60000, // 1 minute
      maxSeriesPoints: 10000,
      errorBudgetWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
      sloTargets: {
        availability: 0.999, // 99.9%
        latencyP99: 2000, // 2 seconds
        errorRate: 0.001 // 0.1%
      },
      ...options
    };

    this.initializeDefaultMetrics();
    this.startAggregation();
  }

  /**
   * Record a metric point
   */
  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    const timestamp = Date.now();
    
    if (!this.metricSeries.has(name)) {
      this.createMetricSeries(name, 'gauge', 'Generic metric', '');
    }

    const series = this.metricSeries.get(name)!;
    series.points.push({ timestamp, value, labels });

    // Cleanup old points
    this.cleanupSeries(series);

    this.emit('metric_recorded', { name, value, labels, timestamp });
  }

  /**
   * Record latency metric and calculate percentiles
   */
  recordLatency(operation: string, latency: number, labels: Record<string, string> = {}): void {
    const histogramKey = `latency_${operation}`;
    
    if (!this.histograms.has(histogramKey)) {
      this.histograms.set(histogramKey, []);
    }

    this.histograms.get(histogramKey)!.push(latency);
    this.recordMetric(`${operation}_latency`, latency, labels);

    // Calculate and record percentiles
    const percentiles = this.calculatePercentiles(histogramKey);
    this.recordMetric(`${operation}_latency_p99`, percentiles.p99, labels);
    this.recordMetric(`${operation}_latency_p95`, percentiles.p95, labels);
    this.recordMetric(`${operation}_latency_p50`, percentiles.p50, labels);

    this.emit('latency_recorded', { operation, latency, percentiles, labels });
  }

  /**
   * Record request and calculate throughput
   */
  recordRequest(operation: string, success: boolean, labels: Record<string, string> = {}): void {
    const counterKey = `requests_${operation}`;
    const errorKey = `errors_${operation}`;

    this.incrementCounter(counterKey);
    if (!success) {
      this.incrementCounter(errorKey);
    }

    // Calculate RPS
    const rps = this.calculateRPS(counterKey);
    this.recordMetric(`${operation}_rps`, rps, labels);

    // Update error budget
    this.updateErrorBudget(operation, success);

    this.emit('request_recorded', { operation, success, rps, labels });
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(cacheName: string, hit: boolean, responseTime: number): void {
    if (!this.cacheMetrics.has(cacheName)) {
      this.cacheMetrics.set(cacheName, {
        cacheName,
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        maxSize: 1000,
        evictions: 0,
        avgResponseTime: 0
      });
    }

    const cache = this.cacheMetrics.get(cacheName)!;
    
    if (hit) {
      cache.hits++;
    } else {
      cache.misses++;
    }

    // Update hit rate
    const totalOps = cache.hits + cache.misses;
    cache.hitRate = cache.hits / totalOps;

    // Update average response time
    cache.avgResponseTime = (cache.avgResponseTime + responseTime) / 2;

    // Record metrics
    this.recordMetric(`cache_hit_rate_${cacheName}`, cache.hitRate);
    this.recordMetric(`cache_response_time_${cacheName}`, responseTime);

    this.emit('cache_operation_recorded', { cacheName, hit, responseTime, hitRate: cache.hitRate });
  }

  /**
   * Record flow execution metrics
   */
  recordFlowExecution(metrics: FlowExecutionMetrics): void {
    this.flowMetrics.set(metrics.executionId, metrics);

    // Record individual metrics
    if (metrics.duration) {
      this.recordLatency('flow_execution', metrics.duration, {
        flowId: metrics.flowId,
        nodeId: metrics.nodeId,
        status: metrics.status
      });
    }

    this.recordMetric('flow_step_count', metrics.stepCount, { flowId: metrics.flowId });
    this.recordMetric('flow_cpu_usage', metrics.resourceUsage.cpu, { flowId: metrics.flowId });
    this.recordMetric('flow_memory_usage', metrics.resourceUsage.memory, { flowId: metrics.flowId });

    // Record success/failure
    this.recordRequest('flow_execution', metrics.status === 'completed', {
      flowId: metrics.flowId,
      nodeId: metrics.nodeId
    });

    this.emit('flow_execution_recorded', metrics);
  }

  /**
   * Record validation pipeline metrics
   */
  recordValidationPipeline(metrics: ValidationPipelineMetrics): void {
    this.validationMetrics.set(metrics.operationId, metrics);

    // Record overall validation latency
    this.recordLatency('validation_pipeline', metrics.totalDuration, {
      operationId: metrics.operationId,
      success: metrics.overallSuccess.toString()
    });

    // Record individual layer metrics
    for (const [layer, layerMetrics] of Object.entries(metrics.layerMetrics)) {
      this.recordLatency(`validation_${layer}`, layerMetrics.duration, {
        operationId: metrics.operationId,
        success: layerMetrics.success.toString()
      });

      this.recordCacheOperation(`validation_${layer}`, layerMetrics.cacheHit, layerMetrics.duration);
    }

    // Record overall cache hit rate
    this.recordMetric('validation_cache_hit_rate', metrics.cacheHitRate, {
      operationId: metrics.operationId
    });

    // Record validation success/failure
    this.recordRequest('validation_pipeline', metrics.overallSuccess, {
      operationId: metrics.operationId
    });

    this.emit('validation_pipeline_recorded', metrics);
  }

  /**
   * Get percentile metrics for an operation
   */
  getPercentileMetrics(operation: string): PercentileMetrics | null {
    const histogramKey = `latency_${operation}`;
    if (!this.histograms.has(histogramKey)) {
      return null;
    }

    return this.calculatePercentiles(histogramKey);
  }

  /**
   * Get error budget status
   */
  getErrorBudgetStatus(operation: string): ErrorBudgetMetrics | null {
    return this.errorBudgets.get(operation) || null;
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(cacheName?: string): CacheMetrics[] {
    if (cacheName) {
      const cache = this.cacheMetrics.get(cacheName);
      return cache ? [cache] : [];
    }
    return Array.from(this.cacheMetrics.values());
  }

  /**
   * Get throughput metrics
   */
  getThroughputMetrics(operation: string): ThroughputMetrics {
    const counterKey = `requests_${operation}`;
    const counter = this.counters.get(counterKey) || 0;
    
    const rps = this.calculateRPS(counterKey);
    const rpm = rps * 60;
    const rph = rpm * 60;

    // Calculate peak and average RPS from historical data
    const rpsHistory = this.getMetricHistory(`${operation}_rps`, 3600000); // Last hour
    const peakRps = Math.max(...rpsHistory.map(p => p.value), rps);
    const avgRps = rpsHistory.length > 0 
      ? rpsHistory.reduce((sum, p) => sum + p.value, 0) / rpsHistory.length 
      : rps;

    return {
      rps,
      rpm,
      rph,
      totalRequests: counter,
      peakRps,
      avgRps
    };
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): {
    latency: Record<string, PercentileMetrics>;
    throughput: Record<string, ThroughputMetrics>;
    errorBudgets: Record<string, ErrorBudgetMetrics>;
    caches: Record<string, CacheMetrics>;
    flows: {
      active: number;
      completed: number;
      failed: number;
      avgDuration: number;
    };
    validation: {
      totalOperations: number;
      avgDuration: number;
      cacheHitRate: number;
      successRate: number;
    };
  } {
    // Collect latency metrics
    const latency: Record<string, PercentileMetrics> = {};
    for (const [key] of this.histograms) {
      if (key.startsWith('latency_')) {
        const operation = key.replace('latency_', '');
        const percentiles = this.calculatePercentiles(key);
        latency[operation] = percentiles;
      }
    }

    // Collect throughput metrics
    const throughput: Record<string, ThroughputMetrics> = {};
    for (const [key] of this.counters) {
      if (key.startsWith('requests_')) {
        const operation = key.replace('requests_', '');
        throughput[operation] = this.getThroughputMetrics(operation);
      }
    }

    // Collect error budgets
    const errorBudgets: Record<string, ErrorBudgetMetrics> = {};
    for (const [operation, budget] of this.errorBudgets) {
      errorBudgets[operation] = budget;
    }

    // Collect cache metrics
    const caches: Record<string, CacheMetrics> = {};
    for (const [name, cache] of this.cacheMetrics) {
      caches[name] = cache;
    }

    // Calculate flow metrics
    const flowMetricsArray = Array.from(this.flowMetrics.values());
    const activeFlows = flowMetricsArray.filter(f => f.status === 'running').length;
    const completedFlows = flowMetricsArray.filter(f => f.status === 'completed').length;
    const failedFlows = flowMetricsArray.filter(f => f.status === 'failed').length;
    const completedWithDuration = flowMetricsArray.filter(f => f.duration && f.status === 'completed');
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, f) => sum + (f.duration || 0), 0) / completedWithDuration.length
      : 0;

    // Calculate validation metrics
    const validationMetricsArray = Array.from(this.validationMetrics.values());
    const totalValidations = validationMetricsArray.length;
    const avgValidationDuration = totalValidations > 0
      ? validationMetricsArray.reduce((sum, v) => sum + v.totalDuration, 0) / totalValidations
      : 0;
    const avgCacheHitRate = totalValidations > 0
      ? validationMetricsArray.reduce((sum, v) => sum + v.cacheHitRate, 0) / totalValidations
      : 0;
    const successfulValidations = validationMetricsArray.filter(v => v.overallSuccess).length;
    const validationSuccessRate = totalValidations > 0 ? successfulValidations / totalValidations : 0;

    return {
      latency,
      throughput,
      errorBudgets,
      caches,
      flows: {
        active: activeFlows,
        completed: completedFlows,
        failed: failedFlows,
        avgDuration
      },
      validation: {
        totalOperations: totalValidations,
        avgDuration: avgValidationDuration,
        cacheHitRate: avgCacheHitRate,
        successRate: validationSuccessRate
      }
    };
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string, timeRange: number = 3600000): MetricPoint[] {
    const series = this.metricSeries.get(name);
    if (!series) return [];

    const cutoff = Date.now() - timeRange;
    return series.points.filter(p => p.timestamp > cutoff);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [name, value] of this.counters) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }

    // Export gauges
    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }

    // Export histograms (as summaries)
    for (const [key] of this.histograms) {
      if (key.startsWith('latency_')) {
        const operation = key.replace('latency_', '');
        const percentiles = this.calculatePercentiles(key);
        
        lines.push(`# TYPE ${operation}_latency_seconds summary`);
        lines.push(`${operation}_latency_seconds{quantile="0.5"} ${percentiles.p50 / 1000}`);
        lines.push(`${operation}_latency_seconds{quantile="0.95"} ${percentiles.p95 / 1000}`);
        lines.push(`${operation}_latency_seconds{quantile="0.99"} ${percentiles.p99 / 1000}`);
        lines.push(`${operation}_latency_seconds_count ${percentiles.count}`);
        lines.push(`${operation}_latency_seconds_sum ${(percentiles.mean * percentiles.count) / 1000}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Private methods
   */
  private initializeDefaultMetrics(): void {
    // Initialize default metric series
    this.createMetricSeries('flow_execution_latency', 'histogram', 'Flow execution latency', 'ms');
    this.createMetricSeries('validation_pipeline_latency', 'histogram', 'Validation pipeline latency', 'ms');
    this.createMetricSeries('flow_execution_rps', 'gauge', 'Flow execution requests per second', 'rps');
    this.createMetricSeries('validation_cache_hit_rate', 'gauge', 'Validation cache hit rate', 'ratio');
    this.createMetricSeries('error_budget_burn_rate', 'gauge', 'Error budget burn rate', 'ratio');
  }

  private createMetricSeries(name: string, type: 'counter' | 'gauge' | 'histogram' | 'summary', description: string, unit: string): void {
    this.metricSeries.set(name, {
      name,
      points: [],
      metadata: { unit, type, description }
    });
  }

  private incrementCounter(name: string): void {
    this.counters.set(name, (this.counters.get(name) || 0) + 1);
  }

  private calculatePercentiles(histogramKey: string): PercentileMetrics {
    const values = this.histograms.get(histogramKey) || [];
    if (values.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, p999: 0, min: 0, max: 0, mean: 0, count: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    return {
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      p999: this.percentile(sorted, 0.999),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      count
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private calculateRPS(counterKey: string): number {
    const counter = this.counters.get(counterKey) || 0;
    const history = this.getMetricHistory(`${counterKey}_rps`, 60000); // Last minute
    
    if (history.length < 2) return 0;
    
    const timeSpan = (history[history.length - 1].timestamp - history[0].timestamp) / 1000;
    const requestSpan = counter - (history[0].value || 0);
    
    return timeSpan > 0 ? requestSpan / timeSpan : 0;
  }

  private updateErrorBudget(operation: string, success: boolean): void {
    if (!this.errorBudgets.has(operation)) {
      this.errorBudgets.set(operation, {
        totalRequests: 0,
        errorRequests: 0,
        errorRate: 0,
        errorBudget: 1 - this.config.sloTargets.availability,
        budgetRemaining: 1 - this.config.sloTargets.availability,
        budgetBurnRate: 0,
        timeToExhaustion: Infinity,
        sloCompliance: true
      });
    }

    const budget = this.errorBudgets.get(operation)!;
    budget.totalRequests++;
    
    if (!success) {
      budget.errorRequests++;
    }

    budget.errorRate = budget.errorRequests / budget.totalRequests;
    budget.budgetRemaining = budget.errorBudget - budget.errorRate;
    budget.sloCompliance = budget.errorRate <= budget.errorBudget;

    // Calculate burn rate (simplified)
    const recentErrors = this.getRecentErrorRate(operation, 3600000); // Last hour
    budget.budgetBurnRate = recentErrors / budget.errorBudget;

    // Calculate time to exhaustion
    if (budget.budgetBurnRate > 0) {
      budget.timeToExhaustion = (budget.budgetRemaining / budget.budgetBurnRate) * 60; // minutes
    } else {
      budget.timeToExhaustion = Infinity;
    }

    this.recordMetric(`error_budget_remaining_${operation}`, budget.budgetRemaining);
    this.recordMetric(`error_budget_burn_rate_${operation}`, budget.budgetBurnRate);
  }

  private getRecentErrorRate(operation: string, timeRange: number): number {
    const errorKey = `errors_${operation}`;
    const requestKey = `requests_${operation}`;
    
    const recentErrors = this.counters.get(errorKey) || 0;
    const recentRequests = this.counters.get(requestKey) || 0;
    
    return recentRequests > 0 ? recentErrors / recentRequests : 0;
  }

  private cleanupSeries(series: MetricSeries): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    series.points = series.points.filter(p => p.timestamp > cutoff);
    
    // Limit series size
    if (series.points.length > this.config.maxSeriesPoints) {
      series.points = series.points.slice(-this.config.maxSeriesPoints);
    }
  }

  private startAggregation(): void {
    const aggregationInterval = setInterval(() => {
      this.performAggregation();
    }, this.config.aggregationInterval);

    this.aggregationIntervals.set('main', aggregationInterval);
  }

  private performAggregation(): void {
    // Cleanup old histogram data
    for (const [key, values] of this.histograms) {
      if (values.length > 1000) {
        this.histograms.set(key, values.slice(-1000));
      }
    }

    // Cleanup old flow metrics
    const cutoff = Date.now() - this.config.retentionPeriod;
    for (const [executionId, metrics] of this.flowMetrics) {
      if (metrics.startTime < cutoff) {
        this.flowMetrics.delete(executionId);
      }
    }

    // Cleanup old validation metrics
    for (const [operationId, metrics] of this.validationMetrics) {
      // Assuming we have a timestamp in the operationId or we track it separately
      // For now, we'll keep a reasonable number of recent metrics
      if (this.validationMetrics.size > 10000) {
        const entries = Array.from(this.validationMetrics.entries());
        const toKeep = entries.slice(-5000);
        this.validationMetrics.clear();
        toKeep.forEach(([id, metrics]) => this.validationMetrics.set(id, metrics));
      }
    }

    this.emit('aggregation_completed', { timestamp: Date.now() });
  }
}

export default ComprehensiveMetricsService;