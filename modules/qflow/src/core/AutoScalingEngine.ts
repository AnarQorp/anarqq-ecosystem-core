/**
 * Auto Scaling Engine for Qflow
 * Implements automatic scaling triggers based on performance metrics
 */

import { EventEmitter } from 'events';

export interface ScalingTrigger {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  action: 'scale_up' | 'scale_down';
  cooldownPeriod: number;
  minNodes: number;
  maxNodes: number;
  scalingFactor: number;
  enabled: boolean;
  lastTriggered?: number;
}

export interface LoadRedirectionPolicy {
  id: string;
  name: string;
  condition: string;
  targetNodePool: string;
  redirectionPercentage: number;
  priority: number;
  enabled: boolean;
  maxDuration: number;
}

export interface FlowPausingPolicy {
  id: string;
  name: string;
  condition: string;
  targetPriority: 'low' | 'medium' | 'high';
  pauseDuration: number;
  maxFlowsTosPause: number;
  enabled: boolean;
}

export class AutoScalingEngine extends EventEmitter {
  private scalingTriggers: Map<string, ScalingTrigger>;
  private redirectionPolicies: Map<string, LoadRedirectionPolicy>;
  private pausingPolicies: Map<string, FlowPausingPolicy>;
  private activeScalingActions: Map<string, { timestamp: number; action: string; nodeCount: number }>;
  private activeRedirections: Map<string, { timestamp: number; policy: LoadRedirectionPolicy }>;
  private pausedFlows: Map<string, { timestamp: number; resumeAt: number; policy: FlowPausingPolicy }>;
  private currentMetrics: any = {};
  private nodePool: Map<string, any>;

  constructor(options: any = {}) {
    super();
    
    this.scalingTriggers = new Map();
    this.redirectionPolicies = new Map();
    this.pausingPolicies = new Map();
    this.activeScalingActions = new Map();
    this.activeRedirections = new Map();
    this.pausedFlows = new Map();
    this.nodePool = new Map();

    this.setupDefaultTriggers();
    this.setupDefaultPolicies();
    
    // Start monitoring loop
    setInterval(() => this.evaluateScalingTriggers(), 30000); // Every 30 seconds
    setInterval(() => this.evaluateRedirectionPolicies(), 15000); // Every 15 seconds
    setInterval(() => this.evaluateFlowPausing(), 10000); // Every 10 seconds
  }

  /**
   * Add scaling trigger
   */
  addScalingTrigger(trigger: ScalingTrigger): void {
    this.scalingTriggers.set(trigger.id, trigger);
    this.emit('scaling_trigger_added', trigger);
  }

  /**
   * Add load redirection policy
   */
  addRedirectionPolicy(policy: LoadRedirectionPolicy): void {
    this.redirectionPolicies.set(policy.id, policy);
    this.emit('redirection_policy_added', policy);
  }

  /**
   * Add flow pausing policy
   */
  addFlowPausingPolicy(policy: FlowPausingPolicy): void {
    this.pausingPolicies.set(policy.id, policy);
    this.emit('flow_pausing_policy_added', policy);
  }

  /**
   * Update current metrics for evaluation
   */
  updateMetrics(metrics: any): void {
    this.currentMetrics = { ...this.currentMetrics, ...metrics };
    this.emit('metrics_updated', this.currentMetrics);
  }

  /**
   * Update node pool information
   */
  updateNodePool(nodes: Map<string, any>): void {
    this.nodePool = new Map(nodes);
    this.emit('node_pool_updated', { nodeCount: this.nodePool.size });
  }

  /**
   * Trigger immediate scaling evaluation
   */
  async triggerScalingEvaluation(): Promise<void> {
    await this.evaluateScalingTriggers();
  }

  /**
   * Get scaling status
   */
  getScalingStatus(): {
    triggers: Array<{
      id: string;
      name: string;
      status: 'active' | 'cooldown' | 'disabled';
      lastTriggered?: number;
      nextEvaluation?: number;
    }>;
    activeActions: Array<{
      triggerId: string;
      action: string;
      timestamp: number;
      nodeCount: number;
    }>;
    nodeCount: number;
    redirections: Array<{
      policyId: string;
      timestamp: number;
      targetPool: string;
    }>;
    pausedFlows: number;
  } {
    const triggers = Array.from(this.scalingTriggers.values()).map(trigger => {
      const lastAction = this.activeScalingActions.get(trigger.id);
      let status: 'active' | 'cooldown' | 'disabled' = trigger.enabled ? 'active' : 'disabled';
      
      if (lastAction && trigger.enabled) {
        const timeSinceAction = Date.now() - lastAction.timestamp;
        if (timeSinceAction < trigger.cooldownPeriod) {
          status = 'cooldown';
        }
      }

      return {
        id: trigger.id,
        name: trigger.name,
        status,
        lastTriggered: trigger.lastTriggered,
        nextEvaluation: status === 'cooldown' && lastAction 
          ? lastAction.timestamp + trigger.cooldownPeriod 
          : undefined
      };
    });

    const activeActions = Array.from(this.activeScalingActions.entries()).map(([triggerId, action]) => ({
      triggerId,
      action: action.action,
      timestamp: action.timestamp,
      nodeCount: action.nodeCount
    }));

    const redirections = Array.from(this.activeRedirections.entries()).map(([policyId, redirection]) => ({
      policyId,
      timestamp: redirection.timestamp,
      targetPool: redirection.policy.targetNodePool
    }));

    return {
      triggers,
      activeActions,
      nodeCount: this.nodePool.size,
      redirections,
      pausedFlows: this.pausedFlows.size
    };
  }

  /**
   * Private methods
   */
  private setupDefaultTriggers(): void {
    const defaultTriggers: ScalingTrigger[] = [
      {
        id: 'cpu_scale_up',
        name: 'CPU-based Scale Up',
        metric: 'cpu_utilization',
        threshold: 0.8,
        operator: 'gt',
        action: 'scale_up',
        cooldownPeriod: 300000, // 5 minutes
        minNodes: 2,
        maxNodes: 20,
        scalingFactor: 1.5,
        enabled: true
      },
      {
        id: 'cpu_scale_down',
        name: 'CPU-based Scale Down',
        metric: 'cpu_utilization',
        threshold: 0.3,
        operator: 'lt',
        action: 'scale_down',
        cooldownPeriod: 600000, // 10 minutes
        minNodes: 2,
        maxNodes: 20,
        scalingFactor: 0.7,
        enabled: true
      },
      {
        id: 'latency_scale_up',
        name: 'Latency-based Scale Up',
        metric: 'execution_latency_p95',
        threshold: 3000, // 3 seconds
        operator: 'gt',
        action: 'scale_up',
        cooldownPeriod: 180000, // 3 minutes
        minNodes: 2,
        maxNodes: 15,
        scalingFactor: 1.3,
        enabled: true
      },
      {
        id: 'error_rate_scale_up',
        name: 'Error Rate Scale Up',
        metric: 'error_rate',
        threshold: 0.05, // 5%
        operator: 'gt',
        action: 'scale_up',
        cooldownPeriod: 120000, // 2 minutes
        minNodes: 2,
        maxNodes: 10,
        scalingFactor: 2.0,
        enabled: true
      },
      {
        id: 'throughput_scale_up',
        name: 'Low Throughput Scale Up',
        metric: 'throughput',
        threshold: 5, // flows per minute
        operator: 'lt',
        action: 'scale_up',
        cooldownPeriod: 240000, // 4 minutes
        minNodes: 1,
        maxNodes: 12,
        scalingFactor: 1.4,
        enabled: true
      }
    ];

    defaultTriggers.forEach(trigger => this.scalingTriggers.set(trigger.id, trigger));
  }

  private setupDefaultPolicies(): void {
    // Default redirection policies
    const defaultRedirectionPolicies: LoadRedirectionPolicy[] = [
      {
        id: 'high_latency_redirect',
        name: 'High Latency Redirection',
        condition: 'execution_latency_p99 > 5000',
        targetNodePool: 'cold_nodes',
        redirectionPercentage: 40,
        priority: 100,
        enabled: true,
        maxDuration: 900000 // 15 minutes
      },
      {
        id: 'error_spike_redirect',
        name: 'Error Spike Redirection',
        condition: 'error_rate > 0.1',
        targetNodePool: 'backup_nodes',
        redirectionPercentage: 60,
        priority: 200,
        enabled: true,
        maxDuration: 600000 // 10 minutes
      },
      {
        id: 'resource_exhaustion_redirect',
        name: 'Resource Exhaustion Redirection',
        condition: 'cpu_utilization > 0.95 OR memory_utilization > 0.9',
        targetNodePool: 'overflow_nodes',
        redirectionPercentage: 80,
        priority: 300,
        enabled: true,
        maxDuration: 1200000 // 20 minutes
      }
    ];

    defaultRedirectionPolicies.forEach(policy => 
      this.redirectionPolicies.set(policy.id, policy)
    );

    // Default flow pausing policies
    const defaultPausingPolicies: FlowPausingPolicy[] = [
      {
        id: 'performance_burn_pause',
        name: 'Performance Burn Rate Pause',
        condition: 'performance_burn_rate > 0.9',
        targetPriority: 'low',
        pauseDuration: 300000, // 5 minutes
        maxFlowsTosPause: 50,
        enabled: true
      },
      {
        id: 'critical_error_pause',
        name: 'Critical Error Rate Pause',
        condition: 'error_rate > 0.15',
        targetPriority: 'medium',
        pauseDuration: 180000, // 3 minutes
        maxFlowsTosPause: 30,
        enabled: true
      },
      {
        id: 'resource_critical_pause',
        name: 'Critical Resource Usage Pause',
        condition: 'cpu_utilization > 0.98 OR memory_utilization > 0.95',
        targetPriority: 'low',
        pauseDuration: 120000, // 2 minutes
        maxFlowsTosPause: 100,
        enabled: true
      }
    ];

    defaultPausingPolicies.forEach(policy => 
      this.pausingPolicies.set(policy.id, policy)
    );
  }

  private async evaluateScalingTriggers(): Promise<void> {
    for (const [id, trigger] of this.scalingTriggers) {
      if (!trigger.enabled) continue;

      // Check cooldown
      const lastAction = this.activeScalingActions.get(id);
      if (lastAction && Date.now() - lastAction.timestamp < trigger.cooldownPeriod) {
        continue;
      }

      const metricValue = this.getMetricValue(trigger.metric);
      if (this.evaluateCondition(metricValue, trigger.threshold, trigger.operator)) {
        await this.executeScalingAction(trigger, metricValue);
      }
    }
  }

  private async executeScalingAction(trigger: ScalingTrigger, metricValue: number): Promise<void> {
    const currentNodeCount = this.nodePool.size;
    let targetNodeCount: number;

    if (trigger.action === 'scale_up') {
      targetNodeCount = Math.min(
        Math.ceil(currentNodeCount * trigger.scalingFactor),
        trigger.maxNodes
      );
    } else {
      targetNodeCount = Math.max(
        Math.floor(currentNodeCount * trigger.scalingFactor),
        trigger.minNodes
      );
    }

    if (targetNodeCount === currentNodeCount) {
      return; // No scaling needed
    }

    // Record scaling action
    this.activeScalingActions.set(trigger.id, {
      timestamp: Date.now(),
      action: trigger.action,
      nodeCount: targetNodeCount
    });

    trigger.lastTriggered = Date.now();

    this.emit('scaling_action_triggered', {
      trigger,
      metricValue,
      currentNodeCount,
      targetNodeCount,
      action: trigger.action
    });

    // Execute the actual scaling
    try {
      await this.performScaling(trigger.action, currentNodeCount, targetNodeCount, trigger);
      
      this.emit('scaling_action_completed', {
        trigger,
        currentNodeCount,
        targetNodeCount,
        success: true
      });
    } catch (error) {
      this.emit('scaling_action_failed', {
        trigger,
        error: error.message,
        currentNodeCount,
        targetNodeCount
      });
    }
  }

  private async evaluateRedirectionPolicies(): Promise<void> {
    // Sort by priority (highest first)
    const sortedPolicies = Array.from(this.redirectionPolicies.values())
      .filter(policy => policy.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      // Check if already active and within duration
      const activeRedirection = this.activeRedirections.get(policy.id);
      if (activeRedirection) {
        const elapsed = Date.now() - activeRedirection.timestamp;
        if (elapsed < policy.maxDuration) {
          continue; // Still active
        } else {
          // Expired, remove
          this.activeRedirections.delete(policy.id);
          this.emit('redirection_expired', { policy });
        }
      }

      if (this.evaluateRedirectionCondition(policy.condition)) {
        await this.executeLoadRedirection(policy);
        break; // Only execute highest priority policy
      }
    }
  }

  private async executeLoadRedirection(policy: LoadRedirectionPolicy): Promise<void> {
    this.activeRedirections.set(policy.id, {
      timestamp: Date.now(),
      policy
    });

    this.emit('load_redirection_started', {
      policy,
      targetPool: policy.targetNodePool,
      percentage: policy.redirectionPercentage
    });

    try {
      await this.performLoadRedirection(policy);
      
      this.emit('load_redirection_completed', { policy });
    } catch (error) {
      this.emit('load_redirection_failed', {
        policy,
        error: error.message
      });
      
      // Remove from active redirections on failure
      this.activeRedirections.delete(policy.id);
    }
  }

  private async evaluateFlowPausing(): Promise<void> {
    // Clean up expired paused flows
    const now = Date.now();
    for (const [flowId, pauseInfo] of this.pausedFlows) {
      if (now >= pauseInfo.resumeAt) {
        this.pausedFlows.delete(flowId);
        this.emit('flow_resumed', { flowId, policy: pauseInfo.policy });
      }
    }

    // Evaluate pausing policies
    for (const [id, policy] of this.pausingPolicies) {
      if (!policy.enabled) continue;

      if (this.evaluateRedirectionCondition(policy.condition)) {
        await this.executeFlowPausing(policy);
      }
    }
  }

  private async executeFlowPausing(policy: FlowPausingPolicy): Promise<void> {
    // Get flows to pause (mock implementation)
    const flowsToPause = await this.getFlowsToPause(policy);
    
    const pausedCount = Math.min(flowsToPause.length, policy.maxFlowsTosPause);
    const resumeAt = Date.now() + policy.pauseDuration;

    for (let i = 0; i < pausedCount; i++) {
      const flowId = flowsToPause[i];
      this.pausedFlows.set(flowId, {
        timestamp: Date.now(),
        resumeAt,
        policy
      });
    }

    this.emit('flows_paused', {
      policy,
      flowIds: flowsToPause.slice(0, pausedCount),
      pausedCount,
      resumeAt
    });

    try {
      await this.performFlowPausing(flowsToPause.slice(0, pausedCount), policy);
      
      this.emit('flow_pausing_completed', { policy, pausedCount });
    } catch (error) {
      this.emit('flow_pausing_failed', {
        policy,
        error: error.message
      });
    }
  }

  private getMetricValue(metricName: string): number {
    switch (metricName) {
      case 'cpu_utilization':
        return this.currentMetrics.resourceUtilization?.cpu || 0;
      case 'memory_utilization':
        return this.currentMetrics.resourceUtilization?.memory || 0;
      case 'execution_latency_p95':
        return this.currentMetrics.executionLatency || 0;
      case 'execution_latency_p99':
        return this.currentMetrics.executionLatencyP99 || 0;
      case 'error_rate':
        return this.currentMetrics.errorRate || 0;
      case 'throughput':
        return this.currentMetrics.throughput || 0;
      case 'performance_burn_rate':
        return this.currentMetrics.performanceBurnRate || 0;
      default:
        return 0;
    }
  }

  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private evaluateRedirectionCondition(condition: string): boolean {
    // Simple condition evaluator - would use proper expression parser in production
    try {
      let evaluableCondition = condition
        .replace(/execution_latency_p99/g, this.getMetricValue('execution_latency_p99').toString())
        .replace(/execution_latency_p95/g, this.getMetricValue('execution_latency_p95').toString())
        .replace(/error_rate/g, this.getMetricValue('error_rate').toString())
        .replace(/cpu_utilization/g, this.getMetricValue('cpu_utilization').toString())
        .replace(/memory_utilization/g, this.getMetricValue('memory_utilization').toString())
        .replace(/performance_burn_rate/g, this.getMetricValue('performance_burn_rate').toString())
        .replace(/OR/g, '||')
        .replace(/AND/g, '&&');

      return eval(evaluableCondition);
    } catch (error) {
      this.emit('condition_evaluation_error', { condition, error: error.message });
      return false;
    }
  }

  private async performScaling(action: string, currentNodes: number, targetNodes: number, trigger: ScalingTrigger): Promise<void> {
    // Mock implementation - would integrate with actual node management system
    this.emit('scaling_execution', {
      action,
      currentNodes,
      targetNodes,
      trigger: trigger.name
    });

    // Simulate scaling delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update node pool (mock)
    if (action === 'scale_up') {
      for (let i = currentNodes; i < targetNodes; i++) {
        this.nodePool.set(`node-${i}`, { id: `node-${i}`, status: 'active' });
      }
    } else {
      const nodeIds = Array.from(this.nodePool.keys());
      for (let i = currentNodes - 1; i >= targetNodes; i--) {
        if (nodeIds[i]) {
          this.nodePool.delete(nodeIds[i]);
        }
      }
    }
  }

  private async performLoadRedirection(policy: LoadRedirectionPolicy): Promise<void> {
    // Mock implementation - would integrate with load balancer
    this.emit('load_redirection_execution', {
      policy: policy.name,
      targetPool: policy.targetNodePool,
      percentage: policy.redirectionPercentage
    });

    // Simulate redirection setup delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async performFlowPausing(flowIds: string[], policy: FlowPausingPolicy): Promise<void> {
    // Mock implementation - would integrate with flow execution engine
    this.emit('flow_pausing_execution', {
      policy: policy.name,
      flowIds,
      duration: policy.pauseDuration
    });

    // Simulate pausing delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  private async getFlowsToPause(policy: FlowPausingPolicy): Promise<string[]> {
    // Mock implementation - would query actual flow execution engine
    const mockFlows = [
      'flow-1', 'flow-2', 'flow-3', 'flow-4', 'flow-5',
      'flow-6', 'flow-7', 'flow-8', 'flow-9', 'flow-10'
    ];

    // Filter by priority (mock)
    return mockFlows.filter(flowId => {
      // Mock priority check
      return policy.targetPriority === 'low' ? flowId.includes('flow') : false;
    });
  }
}

export default AutoScalingEngine;