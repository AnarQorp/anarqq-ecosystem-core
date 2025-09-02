/**
 * Performance Integration Service for Qflow
 * Integrates with Task 36 performance monitoring system
 */

import { EventEmitter } from 'events';
import { AdvancedMetricsService } from '../../../../backend/services/AdvancedMetricsService.mjs';
import { PerformanceRegressionService } from '../../../../backend/services/PerformanceRegressionService.mjs';

export interface PerformanceMetrics {
  executionLatency: number;
  validationLatency: number;
  stepLatency: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface PerformanceGate {
  name: string;
  threshold: number;
  metric: string;
  operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  enabled: boolean;
}

export interface AdaptiveResponse {
  trigger: string;
  action: 'scale_up' | 'scale_down' | 'pause_flows' | 'redirect_load' | 'optimize_resources';
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class PerformanceIntegrationService extends EventEmitter {
  private metricsService: AdvancedMetricsService;
  private regressionService: PerformanceRegressionService;
  private performanceGates: Map<string, PerformanceGate>;
  private adaptiveResponses: Map<string, AdaptiveResponse>;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private config: {
    monitoringInterval: number;
    performanceThresholds: Record<string, number>;
    adaptiveResponseEnabled: boolean;
    regressionDetectionEnabled: boolean;
  };

  constructor(options: any = {}) {
    super();
    
    this.config = {
      monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
      performanceThresholds: {
        executionLatencyP99: 5000, // 5 seconds
        validationLatencyP95: 1000, // 1 second
        stepLatencyP95: 2000, // 2 seconds
        throughputMin: 10, // 10 flows per minute
        errorRateMax: 0.05, // 5% error rate
        cpuUtilizationMax: 0.8, // 80% CPU
        memoryUtilizationMax: 0.85, // 85% memory
        ...options.performanceThresholds
      },
      adaptiveResponseEnabled: options.adaptiveResponseEnabled !== false,
      regressionDetectionEnabled: options.regressionDetectionEnabled !== false,
      ...options
    };

    this.metricsService = new AdvancedMetricsService({
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      aggregationInterval: 60000, // 1 minute
      anomalyThreshold: 2.5 // 2.5 standard deviations
    });

    this.regressionService = new PerformanceRegressionService({
      regressionThreshold: 0.15, // 15% degradation
      improvementThreshold: 0.10, // 10% improvement
      minSampleSize: 50
    });

    this.performanceGates = new Map();
    this.adaptiveResponses = new Map();

    this.setupDefaultGates();
    this.setupDefaultResponses();
    this.setupEventHandlers();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkPerformanceGates();
      this.detectRegressions();
    }, this.config.monitoringInterval);

    this.emit('monitoring_started', { interval: this.config.monitoringInterval });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring_stopped');
    }
  }

  /**
   * Record flow execution metrics
   */
  recordFlowExecution(flowId: string, metrics: {
    duration: number;
    stepCount: number;
    validationTime: number;
    nodeId: string;
    success: boolean;
    errorType?: string;
  }): void {
    const labels = {
      flowId,
      nodeId: metrics.nodeId,
      success: metrics.success.toString()
    };

    // Record core metrics
    this.metricsService.recordRequest(
      'qflow',
      'flow_execution',
      metrics.duration,
      metrics.success ? 200 : 500,
      labels
    );

    this.metricsService.record('qflow_execution_duration_ms', metrics.duration, labels);
    this.metricsService.record('qflow_validation_duration_ms', metrics.validationTime, labels);
    this.metricsService.record('qflow_step_count', metrics.stepCount, labels);

    if (!metrics.success && metrics.errorType) {
      this.metricsService.record('qflow_error_count', 1, { ...labels, errorType: metrics.errorType });
    }

    // Calculate throughput
    const throughput = 1000 / metrics.duration; // flows per second
    this.metricsService.record('qflow_throughput', throughput, labels);

    this.emit('flow_metrics_recorded', { flowId, metrics, labels });
  }

  /**
   * Record step execution metrics
   */
  recordStepExecution(stepId: string, metrics: {
    duration: number;
    nodeId: string;
    stepType: string;
    success: boolean;
    resourceUsage?: {
      cpu: number;
      memory: number;
    };
  }): void {
    const labels = {
      stepId,
      nodeId: metrics.nodeId,
      stepType: metrics.stepType,
      success: metrics.success.toString()
    };

    this.metricsService.record('qflow_step_duration_ms', metrics.duration, labels);
    
    if (metrics.resourceUsage) {
      this.metricsService.record('qflow_step_cpu_usage', metrics.resourceUsage.cpu, labels);
      this.metricsService.record('qflow_step_memory_usage', metrics.resourceUsage.memory, labels);
    }

    this.emit('step_metrics_recorded', { stepId, metrics, labels });
  }

  /**
   * Record validation pipeline metrics
   */
  recordValidationMetrics(operationId: string, metrics: {
    totalDuration: number;
    layerDurations: Record<string, number>;
    cacheHitRate: number;
    success: boolean;
  }): void {
    const labels = { operationId, success: metrics.success.toString() };

    this.metricsService.record('qflow_validation_total_duration_ms', metrics.totalDuration, labels);
    this.metricsService.record('qflow_validation_cache_hit_rate', metrics.cacheHitRate, labels);

    // Record individual layer metrics
    for (const [layer, duration] of Object.entries(metrics.layerDurations)) {
      this.metricsService.record('qflow_validation_layer_duration_ms', duration, {
        ...labels,
        layer
      });
    }

    this.emit('validation_metrics_recorded', { operationId, metrics, labels });
  }

  /**
   * Add performance gate
   */
  addPerformanceGate(gate: PerformanceGate): void {
    this.performanceGates.set(gate.name, gate);
    this.emit('performance_gate_added', gate);
  }

  /**
   * Remove performance gate
   */
  removePerformanceGate(name: string): void {
    this.performanceGates.delete(name);
    this.emit('performance_gate_removed', { name });
  }

  /**
   * Add adaptive response
   */
  addAdaptiveResponse(response: AdaptiveResponse): void {
    this.adaptiveResponses.set(response.trigger, response);
    this.emit('adaptive_response_added', response);
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    metrics: PerformanceMetrics;
    gates: Array<{ name: string; status: 'pass' | 'fail'; value: number; threshold: number }>;
    slo: any;
    recommendations: any[];
  } {
    const sloStatus = this.metricsService.getSLOStatus();
    const insights = this.metricsService.getInsights();
    
    // Calculate current metrics
    const currentMetrics = this.calculateCurrentMetrics();
    
    // Check gates
    const gateResults = this.checkAllGates(currentMetrics);
    
    // Determine overall status
    const failedGates = gateResults.filter(g => g.status === 'fail');
    const criticalFailed = failedGates.filter(g => 
      this.performanceGates.get(g.name)?.metric.includes('error') ||
      this.performanceGates.get(g.name)?.metric.includes('latency')
    );

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalFailed.length > 0 || sloStatus.overall === 'critical') {
      overall = 'critical';
    } else if (failedGates.length > 0 || sloStatus.overall === 'warning') {
      overall = 'warning';
    }

    return {
      overall,
      metrics: currentMetrics,
      gates: gateResults,
      slo: sloStatus,
      recommendations: insights.recommendations
    };
  }

  /**
   * Get ecosystem-wide performance correlation
   */
  getEcosystemCorrelation(): {
    qflowHealth: string;
    ecosystemHealth: string;
    correlations: Array<{
      module: string;
      correlation: number;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
  } {
    // This would integrate with other ecosystem modules
    // For now, return mock data structure
    return {
      qflowHealth: this.getPerformanceStatus().overall,
      ecosystemHealth: 'healthy',
      correlations: [
        { module: 'qindex', correlation: 0.85, impact: 'positive' },
        { module: 'qonsent', correlation: 0.72, impact: 'positive' },
        { module: 'qerberos', correlation: 0.68, impact: 'positive' },
        { module: 'qlock', correlation: 0.91, impact: 'positive' }
      ]
    };
  }

  /**
   * Trigger adaptive response
   */
  async triggerAdaptiveResponse(trigger: string, context: any = {}): Promise<void> {
    const response = this.adaptiveResponses.get(trigger);
    if (!response) {
      this.emit('adaptive_response_not_found', { trigger });
      return;
    }

    this.emit('adaptive_response_triggered', { response, context });

    try {
      switch (response.action) {
        case 'scale_up':
          await this.handleScaleUp(response.parameters, context);
          break;
        case 'scale_down':
          await this.handleScaleDown(response.parameters, context);
          break;
        case 'pause_flows':
          await this.handlePauseFlows(response.parameters, context);
          break;
        case 'redirect_load':
          await this.handleRedirectLoad(response.parameters, context);
          break;
        case 'optimize_resources':
          await this.handleOptimizeResources(response.parameters, context);
          break;
      }

      this.emit('adaptive_response_completed', { response, context });
    } catch (error) {
      this.emit('adaptive_response_failed', { response, context, error: error.message });
    }
  }

  /**
   * Private methods
   */
  private setupDefaultGates(): void {
    const defaultGates: PerformanceGate[] = [
      {
        name: 'execution_latency_p99',
        threshold: this.config.performanceThresholds.executionLatencyP99,
        metric: 'qflow_execution_duration_ms_p99',
        operator: 'lt',
        enabled: true
      },
      {
        name: 'validation_latency_p95',
        threshold: this.config.performanceThresholds.validationLatencyP95,
        metric: 'qflow_validation_duration_ms_p95',
        operator: 'lt',
        enabled: true
      },
      {
        name: 'error_rate',
        threshold: this.config.performanceThresholds.errorRateMax,
        metric: 'qflow_error_rate',
        operator: 'lt',
        enabled: true
      },
      {
        name: 'throughput_min',
        threshold: this.config.performanceThresholds.throughputMin,
        metric: 'qflow_throughput_avg',
        operator: 'gt',
        enabled: true
      }
    ];

    defaultGates.forEach(gate => this.performanceGates.set(gate.name, gate));
  }

  private setupDefaultResponses(): void {
    const defaultResponses: AdaptiveResponse[] = [
      {
        trigger: 'high_latency',
        action: 'optimize_resources',
        parameters: { target: 'validation_cache', action: 'increase_size' },
        priority: 'high'
      },
      {
        trigger: 'high_error_rate',
        action: 'pause_flows',
        parameters: { priority: 'low', duration: 300000 }, // 5 minutes
        priority: 'critical'
      },
      {
        trigger: 'low_throughput',
        action: 'scale_up',
        parameters: { target: 'execution_nodes', factor: 1.5 },
        priority: 'medium'
      },
      {
        trigger: 'resource_exhaustion',
        action: 'redirect_load',
        parameters: { target: 'alternative_nodes', percentage: 50 },
        priority: 'high'
      }
    ];

    defaultResponses.forEach(response => 
      this.adaptiveResponses.set(response.trigger, response)
    );
  }

  private setupEventHandlers(): void {
    this.metricsService.on('anomaly_detected', (anomaly) => {
      this.emit('performance_anomaly', anomaly);
      
      // Trigger adaptive response for critical anomalies
      if (anomaly.severity === 'critical') {
        this.triggerAdaptiveResponse('anomaly_critical', { anomaly });
      }
    });

    this.metricsService.on('slo_violation', (violation) => {
      this.emit('slo_violation', violation);
      
      // Trigger adaptive response based on violation type
      if (violation.type === 'latency') {
        this.triggerAdaptiveResponse('high_latency', { violation });
      } else if (violation.type === 'error_rate') {
        this.triggerAdaptiveResponse('high_error_rate', { violation });
      }
    });

    this.regressionService.on('regression_detected', (regression) => {
      this.emit('performance_regression', regression);
      
      if (regression.severity === 'critical') {
        this.triggerAdaptiveResponse('performance_regression', { regression });
      }
    });
  }

  private collectMetrics(): void {
    // Collect system metrics
    this.metricsService.recordSystem();
    
    // Emit metrics collection event
    this.emit('metrics_collected', { timestamp: Date.now() });
  }

  private checkPerformanceGates(): void {
    const currentMetrics = this.calculateCurrentMetrics();
    const results = this.checkAllGates(currentMetrics);
    
    const failedGates = results.filter(r => r.status === 'fail');
    if (failedGates.length > 0) {
      this.emit('performance_gates_failed', { failedGates, results });
      
      // Trigger adaptive responses for failed gates
      failedGates.forEach(gate => {
        const gateDef = this.performanceGates.get(gate.name);
        if (gateDef?.metric.includes('latency')) {
          this.triggerAdaptiveResponse('high_latency', { gate });
        } else if (gateDef?.metric.includes('error')) {
          this.triggerAdaptiveResponse('high_error_rate', { gate });
        } else if (gateDef?.metric.includes('throughput')) {
          this.triggerAdaptiveResponse('low_throughput', { gate });
        }
      });
    }
  }

  private detectRegressions(): void {
    if (!this.config.regressionDetectionEnabled) {
      return;
    }

    // Run regression detection for key metrics
    const keyMetrics = [
      'qflow_execution_duration_ms',
      'qflow_validation_duration_ms',
      'qflow_throughput'
    ];

    keyMetrics.forEach(async (metricName) => {
      try {
        const metric = this.metricsService.getMetric(metricName);
        if (metric && metric.values.length >= 50) {
          const values = metric.values.map(v => v.value);
          await this.regressionService.runRegressionTest(metricName, values);
        }
      } catch (error) {
        this.emit('regression_detection_error', { metricName, error: error.message });
      }
    });
  }

  private calculateCurrentMetrics(): PerformanceMetrics {
    const executionMetric = this.metricsService.getMetric('qflow_execution_duration_ms');
    const validationMetric = this.metricsService.getMetric('qflow_validation_duration_ms');
    const stepMetric = this.metricsService.getMetric('qflow_step_duration_ms');
    const throughputMetric = this.metricsService.getMetric('qflow_throughput');
    const errorMetric = this.metricsService.getMetric('qflow_error_count');
    const requestMetric = this.metricsService.getMetric('request_count');

    // Calculate error rate
    const totalErrors = errorMetric?.stats.sum || 0;
    const totalRequests = requestMetric?.stats.sum || 1;
    const errorRate = totalErrors / totalRequests;

    return {
      executionLatency: executionMetric?.stats.p99 || 0,
      validationLatency: validationMetric?.stats.p95 || 0,
      stepLatency: stepMetric?.stats.p95 || 0,
      throughput: throughputMetric?.stats.avg || 0,
      errorRate,
      resourceUtilization: {
        cpu: 0, // Would be populated from system metrics
        memory: 0,
        network: 0
      }
    };
  }

  private checkAllGates(metrics: PerformanceMetrics): Array<{
    name: string;
    status: 'pass' | 'fail';
    value: number;
    threshold: number;
  }> {
    const results: Array<{
      name: string;
      status: 'pass' | 'fail';
      value: number;
      threshold: number;
    }> = [];

    for (const [name, gate] of this.performanceGates) {
      if (!gate.enabled) continue;

      let value = 0;
      
      // Map gate metrics to actual values
      if (gate.metric.includes('execution_duration')) {
        value = metrics.executionLatency;
      } else if (gate.metric.includes('validation_duration')) {
        value = metrics.validationLatency;
      } else if (gate.metric.includes('error_rate')) {
        value = metrics.errorRate;
      } else if (gate.metric.includes('throughput')) {
        value = metrics.throughput;
      }

      let passed = false;
      switch (gate.operator) {
        case 'lt':
          passed = value < gate.threshold;
          break;
        case 'lte':
          passed = value <= gate.threshold;
          break;
        case 'gt':
          passed = value > gate.threshold;
          break;
        case 'gte':
          passed = value >= gate.threshold;
          break;
        case 'eq':
          passed = value === gate.threshold;
          break;
      }

      results.push({
        name,
        status: passed ? 'pass' : 'fail',
        value,
        threshold: gate.threshold
      });
    }

    return results;
  }

  private async handleScaleUp(parameters: any, context: any): Promise<void> {
    this.emit('scale_up_requested', { parameters, context });
    // Implementation would integrate with node management system
  }

  private async handleScaleDown(parameters: any, context: any): Promise<void> {
    this.emit('scale_down_requested', { parameters, context });
    // Implementation would integrate with node management system
  }

  private async handlePauseFlows(parameters: any, context: any): Promise<void> {
    this.emit('pause_flows_requested', { parameters, context });
    // Implementation would integrate with flow execution engine
  }

  private async handleRedirectLoad(parameters: any, context: any): Promise<void> {
    this.emit('redirect_load_requested', { parameters, context });
    // Implementation would integrate with load balancer
  }

  private async handleOptimizeResources(parameters: any, context: any): Promise<void> {
    this.emit('optimize_resources_requested', { parameters, context });
    // Implementation would optimize caches, connection pools, etc.
  }

  /**
   * Initialize the performance integration service
   */
  async initialize(): Promise<void> {
    console.log('[PerformanceIntegration] Initializing performance integration service...');
    // Initialize metrics collection
    this.emit('service_initialized');
  }

  /**
   * Shutdown the performance integration service
   */
  async shutdown(): Promise<void> {
    console.log('[PerformanceIntegration] Shutting down performance integration service...');
    // Cleanup resources
    this.emit('service_shutdown');
  }
}

export default PerformanceIntegrationService;