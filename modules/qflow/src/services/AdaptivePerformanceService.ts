/**
 * Adaptive Performance Service for Qflow
 * Implements automatic scaling and performance optimization
 */

import { EventEmitter } from 'events';
import { PerformanceIntegrationService } from './PerformanceIntegrationService.js';

export interface ScalingPolicy {
  name: string;
  metric: string;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  minNodes: number;
  maxNodes: number;
  cooldownPeriod: number;
  enabled: boolean;
}

export interface LoadRedirectionRule {
  name: string;
  condition: string;
  targetNodes: string[];
  percentage: number;
  priority: number;
  enabled: boolean;
}

export interface PerformanceOptimization {
  name: string;
  type: 'cache' | 'connection_pool' | 'validation' | 'execution';
  trigger: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export class AdaptivePerformanceService extends EventEmitter {
  private performanceService: PerformanceIntegrationService;
  private scalingPolicies: Map<string, ScalingPolicy>;
  private redirectionRules: Map<string, LoadRedirectionRule>;
  private optimizations: Map<string, PerformanceOptimization>;
  private activeScalingActions: Map<string, { timestamp: number; action: string }>;
  private nodeMetrics: Map<string, any>;
  private config: {
    monitoringInterval: number;
    scalingCooldown: number;
    maxConcurrentActions: number;
    performanceBurnThreshold: number;
  };

  constructor(performanceService: PerformanceIntegrationService, options: any = {}) {
    super();
    
    this.performanceService = performanceService;
    this.scalingPolicies = new Map();
    this.redirectionRules = new Map();
    this.optimizations = new Map();
    this.activeScalingActions = new Map();
    this.nodeMetrics = new Map();

    this.config = {
      monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
      scalingCooldown: options.scalingCooldown || 300000, // 5 minutes
      maxConcurrentActions: options.maxConcurrentActions || 3,
      performanceBurnThreshold: options.performanceBurnThreshold || 0.8, // 80%
      ...options
    };

    this.setupDefaultPolicies();
    this.setupEventHandlers();
  }

  /**
   * Start adaptive performance monitoring
   */
  start(): void {
    this.performanceService.startMonitoring();
    this.emit('adaptive_performance_started');
  }

  /**
   * Stop adaptive performance monitoring
   */
  stop(): void {
    this.performanceService.stopMonitoring();
    this.emit('adaptive_performance_stopped');
  }

  /**
   * Add scaling policy
   */
  addScalingPolicy(policy: ScalingPolicy): void {
    this.scalingPolicies.set(policy.name, policy);
    this.emit('scaling_policy_added', policy);
  }

  /**
   * Add load redirection rule
   */
  addRedirectionRule(rule: LoadRedirectionRule): void {
    this.redirectionRules.set(rule.name, rule);
    this.emit('redirection_rule_added', rule);
  }

  /**
   * Add performance optimization
   */
  addOptimization(optimization: PerformanceOptimization): void {
    this.optimizations.set(optimization.name, optimization);
    this.emit('optimization_added', optimization);
  }

  /**
   * Handle automatic scaling based on metrics
   */
  async handleAutoScaling(metrics: any): Promise<void> {
    for (const [name, policy] of this.scalingPolicies) {
      if (!policy.enabled) continue;

      const metricValue = this.getMetricValue(metrics, policy.metric);
      const lastAction = this.activeScalingActions.get(name);
      
      // Check cooldown period
      if (lastAction && Date.now() - lastAction.timestamp < policy.cooldownPeriod) {
        continue;
      }

      if (metricValue > policy.scaleUpThreshold) {
        await this.scaleUp(policy, metricValue);
      } else if (metricValue < policy.scaleDownThreshold) {
        await this.scaleDown(policy, metricValue);
      }
    }
  }

  /**
   * Handle load redirection based on performance conditions
   */
  async handleLoadRedirection(performanceStatus: any): Promise<void> {
    const activeRules = Array.from(this.redirectionRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      if (this.evaluateCondition(rule.condition, performanceStatus)) {
        await this.redirectLoad(rule, performanceStatus);
        break; // Apply only the highest priority rule
      }
    }
  }

  /**
   * Handle proactive performance optimization
   */
  async handleProactiveOptimization(metrics: any): Promise<void> {
    for (const [name, optimization] of this.optimizations) {
      if (!optimization.enabled) continue;

      if (this.shouldTriggerOptimization(optimization, metrics)) {
        await this.applyOptimization(optimization, metrics);
      }
    }
  }

  /**
   * Implement flow-level burn-rate actions
   */
  async handleFlowBurnRateActions(burnRate: number): Promise<void> {
    if (burnRate < this.config.performanceBurnThreshold) {
      return;
    }

    this.emit('performance_burn_detected', { burnRate });

    // Auto-pause low-priority flows
    await this.pauseLowPriorityFlows(burnRate);

    // Defer heavy steps to cold nodes
    await this.deferHeavySteps(burnRate);

    // Integrate with graceful degradation ladder
    await this.triggerGracefulDegradation(burnRate);
  }

  /**
   * Get current scaling status
   */
  getScalingStatus(): {
    policies: Array<{
      name: string;
      status: 'active' | 'cooldown' | 'inactive';
      lastAction?: string;
      lastActionTime?: number;
    }>;
    activeActions: number;
    nodeCount: number;
    loadDistribution: Record<string, number>;
  } {
    const policies = Array.from(this.scalingPolicies.entries()).map(([name, policy]) => {
      const lastAction = this.activeScalingActions.get(name);
      let status: 'active' | 'cooldown' | 'inactive' = 'inactive';
      
      if (lastAction) {
        const timeSinceAction = Date.now() - lastAction.timestamp;
        status = timeSinceAction < policy.cooldownPeriod ? 'cooldown' : 'active';
      } else if (policy.enabled) {
        status = 'active';
      }

      return {
        name,
        status,
        lastAction: lastAction?.action,
        lastActionTime: lastAction?.timestamp
      };
    });

    return {
      policies,
      activeActions: this.activeScalingActions.size,
      nodeCount: this.nodeMetrics.size,
      loadDistribution: this.calculateLoadDistribution()
    };
  }

  /**
   * Get performance optimization status
   */
  getOptimizationStatus(): {
    optimizations: Array<{
      name: string;
      type: string;
      enabled: boolean;
      lastTriggered?: number;
      effectiveness?: number;
    }>;
    cacheHitRates: Record<string, number>;
    resourceUtilization: Record<string, number>;
  } {
    const optimizations = Array.from(this.optimizations.values()).map(opt => ({
      name: opt.name,
      type: opt.type,
      enabled: opt.enabled,
      lastTriggered: undefined, // Would track from optimization history
      effectiveness: undefined // Would calculate from metrics
    }));

    return {
      optimizations,
      cacheHitRates: {
        validation: 0.85, // Would get from actual cache metrics
        flow_definitions: 0.92,
        node_selection: 0.78
      },
      resourceUtilization: {
        cpu: 0.65,
        memory: 0.72,
        network: 0.45
      }
    };
  }

  /**
   * Private methods
   */
  private setupDefaultPolicies(): void {
    // Default scaling policies
    const defaultScalingPolicies: ScalingPolicy[] = [
      {
        name: 'cpu_based_scaling',
        metric: 'cpu_utilization',
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3,
        minNodes: 2,
        maxNodes: 10,
        cooldownPeriod: 300000, // 5 minutes
        enabled: true
      },
      {
        name: 'latency_based_scaling',
        metric: 'execution_latency_p95',
        scaleUpThreshold: 3000, // 3 seconds
        scaleDownThreshold: 1000, // 1 second
        minNodes: 2,
        maxNodes: 8,
        cooldownPeriod: 180000, // 3 minutes
        enabled: true
      },
      {
        name: 'throughput_based_scaling',
        metric: 'throughput',
        scaleUpThreshold: 50, // flows per minute
        scaleDownThreshold: 10,
        minNodes: 1,
        maxNodes: 15,
        cooldownPeriod: 240000, // 4 minutes
        enabled: true
      }
    ];

    defaultScalingPolicies.forEach(policy => 
      this.scalingPolicies.set(policy.name, policy)
    );

    // Default redirection rules
    const defaultRedirectionRules: LoadRedirectionRule[] = [
      {
        name: 'high_latency_redirect',
        condition: 'latency_p99 > 5000',
        targetNodes: ['cold_nodes'],
        percentage: 30,
        priority: 100,
        enabled: true
      },
      {
        name: 'error_rate_redirect',
        condition: 'error_rate > 0.05',
        targetNodes: ['backup_nodes'],
        percentage: 50,
        priority: 200,
        enabled: true
      },
      {
        name: 'resource_exhaustion_redirect',
        condition: 'cpu_utilization > 0.9 OR memory_utilization > 0.9',
        targetNodes: ['alternative_region'],
        percentage: 70,
        priority: 150,
        enabled: true
      }
    ];

    defaultRedirectionRules.forEach(rule => 
      this.redirectionRules.set(rule.name, rule)
    );

    // Default optimizations
    const defaultOptimizations: PerformanceOptimization[] = [
      {
        name: 'validation_cache_optimization',
        type: 'cache',
        trigger: 'cache_hit_rate < 0.8',
        parameters: { action: 'increase_size', factor: 1.5 },
        enabled: true
      },
      {
        name: 'connection_pool_optimization',
        type: 'connection_pool',
        trigger: 'connection_wait_time > 100',
        parameters: { action: 'increase_pool_size', increment: 5 },
        enabled: true
      },
      {
        name: 'validation_pipeline_optimization',
        type: 'validation',
        trigger: 'validation_latency_p95 > 1000',
        parameters: { action: 'enable_parallel_validation', layers: ['qonsent', 'qindex'] },
        enabled: true
      }
    ];

    defaultOptimizations.forEach(opt => 
      this.optimizations.set(opt.name, opt)
    );
  }

  private setupEventHandlers(): void {
    this.performanceService.on('performance_gates_failed', async (event) => {
      await this.handleAutoScaling(event);
      await this.handleLoadRedirection(event);
    });

    this.performanceService.on('performance_anomaly', async (anomaly) => {
      if (anomaly.severity === 'critical') {
        await this.handleEmergencyResponse(anomaly);
      }
    });

    this.performanceService.on('slo_violation', async (violation) => {
      await this.handleSLOViolation(violation);
    });

    this.performanceService.on('metrics_collected', async (event) => {
      const performanceStatus = this.performanceService.getPerformanceStatus();
      await this.handleProactiveOptimization(performanceStatus.metrics);
      
      // Calculate burn rate
      const burnRate = this.calculateBurnRate(performanceStatus);
      if (burnRate > this.config.performanceBurnThreshold) {
        await this.handleFlowBurnRateActions(burnRate);
      }
    });
  }

  private async scaleUp(policy: ScalingPolicy, metricValue: number): Promise<void> {
    const currentNodes = this.nodeMetrics.size;
    if (currentNodes >= policy.maxNodes) {
      this.emit('scaling_limit_reached', { policy: policy.name, currentNodes, maxNodes: policy.maxNodes });
      return;
    }

    const targetNodes = Math.min(
      Math.ceil(currentNodes * 1.5), // Scale up by 50%
      policy.maxNodes
    );

    this.emit('scale_up_initiated', {
      policy: policy.name,
      currentNodes,
      targetNodes,
      metricValue,
      threshold: policy.scaleUpThreshold
    });

    // Record scaling action
    this.activeScalingActions.set(policy.name, {
      timestamp: Date.now(),
      action: 'scale_up'
    });

    // Trigger actual scaling (would integrate with node management)
    await this.performanceService.triggerAdaptiveResponse('scale_up', {
      policy,
      currentNodes,
      targetNodes,
      metricValue
    });
  }

  private async scaleDown(policy: ScalingPolicy, metricValue: number): Promise<void> {
    const currentNodes = this.nodeMetrics.size;
    if (currentNodes <= policy.minNodes) {
      return;
    }

    const targetNodes = Math.max(
      Math.floor(currentNodes * 0.8), // Scale down by 20%
      policy.minNodes
    );

    this.emit('scale_down_initiated', {
      policy: policy.name,
      currentNodes,
      targetNodes,
      metricValue,
      threshold: policy.scaleDownThreshold
    });

    // Record scaling action
    this.activeScalingActions.set(policy.name, {
      timestamp: Date.now(),
      action: 'scale_down'
    });

    // Trigger actual scaling
    await this.performanceService.triggerAdaptiveResponse('scale_down', {
      policy,
      currentNodes,
      targetNodes,
      metricValue
    });
  }

  private async redirectLoad(rule: LoadRedirectionRule, performanceStatus: any): Promise<void> {
    this.emit('load_redirection_initiated', {
      rule: rule.name,
      targetNodes: rule.targetNodes,
      percentage: rule.percentage,
      performanceStatus
    });

    await this.performanceService.triggerAdaptiveResponse('redirect_load', {
      rule,
      performanceStatus
    });
  }

  private async applyOptimization(optimization: PerformanceOptimization, metrics: any): Promise<void> {
    this.emit('optimization_applied', {
      optimization: optimization.name,
      type: optimization.type,
      parameters: optimization.parameters,
      metrics
    });

    await this.performanceService.triggerAdaptiveResponse('optimize_resources', {
      optimization,
      metrics
    });
  }

  private async pauseLowPriorityFlows(burnRate: number): Promise<void> {
    const pausePercentage = Math.min((burnRate - this.config.performanceBurnThreshold) * 100, 50);
    
    this.emit('low_priority_flows_paused', {
      burnRate,
      pausePercentage,
      reason: 'performance_burn_rate_exceeded'
    });

    await this.performanceService.triggerAdaptiveResponse('pause_flows', {
      priority: 'low',
      percentage: pausePercentage,
      reason: 'burn_rate_control'
    });
  }

  private async deferHeavySteps(burnRate: number): Promise<void> {
    this.emit('heavy_steps_deferred', {
      burnRate,
      reason: 'performance_burn_rate_exceeded'
    });

    await this.performanceService.triggerAdaptiveResponse('defer_heavy_steps', {
      burnRate,
      targetNodes: 'cold_nodes'
    });
  }

  private async triggerGracefulDegradation(burnRate: number): Promise<void> {
    // This would integrate with Task 34 Graceful Degradation ladder
    this.emit('graceful_degradation_triggered', {
      burnRate,
      level: burnRate > 0.95 ? 'critical' : 'warning'
    });

    // Would call GracefulDegradationService here
  }

  private async handleEmergencyResponse(anomaly: any): Promise<void> {
    this.emit('emergency_response_initiated', { anomaly });

    // Immediate actions for critical anomalies
    await Promise.all([
      this.pauseLowPriorityFlows(1.0), // Pause all low priority flows
      this.redirectLoad({
        name: 'emergency_redirect',
        condition: 'critical_anomaly',
        targetNodes: ['backup_nodes'],
        percentage: 80,
        priority: 1000,
        enabled: true
      }, { anomaly })
    ]);
  }

  private async handleSLOViolation(violation: any): Promise<void> {
    this.emit('slo_violation_response', { violation });

    if (violation.type === 'latency') {
      await this.applyOptimization({
        name: 'emergency_latency_optimization',
        type: 'cache',
        trigger: 'slo_violation',
        parameters: { action: 'aggressive_caching', duration: 300000 },
        enabled: true
      }, violation);
    }
  }

  private getMetricValue(metrics: any, metricName: string): number {
    // Map metric names to actual values
    switch (metricName) {
      case 'cpu_utilization':
        return metrics.resourceUtilization?.cpu || 0;
      case 'memory_utilization':
        return metrics.resourceUtilization?.memory || 0;
      case 'execution_latency_p95':
        return metrics.executionLatency || 0;
      case 'throughput':
        return metrics.throughput || 0;
      case 'error_rate':
        return metrics.errorRate || 0;
      default:
        return 0;
    }
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluator - would be more sophisticated in production
    try {
      // Replace metric names with actual values
      let evaluableCondition = condition
        .replace(/latency_p99/g, context.metrics?.executionLatency || 0)
        .replace(/error_rate/g, context.metrics?.errorRate || 0)
        .replace(/cpu_utilization/g, context.metrics?.resourceUtilization?.cpu || 0)
        .replace(/memory_utilization/g, context.metrics?.resourceUtilization?.memory || 0);

      // Simple evaluation (would use a proper expression evaluator in production)
      return eval(evaluableCondition);
    } catch (error) {
      this.emit('condition_evaluation_error', { condition, error: error.message });
      return false;
    }
  }

  private shouldTriggerOptimization(optimization: PerformanceOptimization, metrics: any): boolean {
    return this.evaluateCondition(optimization.trigger, { metrics });
  }

  private calculateBurnRate(performanceStatus: any): number {
    const { metrics } = performanceStatus;
    
    // Calculate burn rate based on multiple factors
    const latencyBurn = Math.min(metrics.executionLatency / 5000, 1); // Normalize to 5s max
    const errorBurn = Math.min(metrics.errorRate / 0.1, 1); // Normalize to 10% max
    const cpuBurn = metrics.resourceUtilization?.cpu || 0;
    const memoryBurn = metrics.resourceUtilization?.memory || 0;

    // Weighted average
    return (latencyBurn * 0.3 + errorBurn * 0.3 + cpuBurn * 0.2 + memoryBurn * 0.2);
  }

  private calculateLoadDistribution(): Record<string, number> {
    // Would calculate actual load distribution across nodes
    return {
      'node-1': 0.35,
      'node-2': 0.28,
      'node-3': 0.22,
      'node-4': 0.15
    };
  }

  /**
   * Initialize the adaptive performance service
   */
  async initialize(): Promise<void> {
    console.log('[AdaptivePerformance] Initializing adaptive performance service...');
    // Initialize scaling policies and monitoring
    this.emit('service_initialized');
  }

  /**
   * Shutdown the adaptive performance service
   */
  async shutdown(): Promise<void> {
    console.log('[AdaptivePerformance] Shutting down adaptive performance service...');
    // Cleanup resources and stop monitoring
    this.emit('service_shutdown');
  }
}

export default AdaptivePerformanceService;