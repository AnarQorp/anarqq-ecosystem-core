/**
 * Automatic Scaling and Resource Optimization
 * 
 * Implements horizontal scaling with new node integration,
 * vertical scaling optimization per node, and capacity planning
 * with resource forecasting
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { intelligentLoadBalancer } from './IntelligentLoadBalancer.js';
import { QNETNode } from '../network/QNETNodeManager.js';

export interface ScalingPolicy {
  policyId: string;
  name: string;
  type: 'horizontal' | 'vertical' | 'hybrid';
  triggers: ScalingTrigger[];
  constraints: ScalingConstraints;
  cooldownPeriod: number; // milliseconds
  enabled: boolean;
}

export interface ScalingTrigger {
  triggerId: string;
  metric: 'cpu' | 'memory' | 'network' | 'disk' | 'response-time' | 'throughput' | 'error-rate' | 'queue-length';
  threshold: number;
  comparison: 'greater-than' | 'less-than' | 'equals';
  duration: number; // milliseconds - how long condition must persist
  action: 'scale-up' | 'scale-down' | 'optimize';
}

export interface ScalingConstraints {
  minNodes: number;
  maxNodes: number;
  minResourcesPerNode: {
    cpu: number;
    memory: number;
    disk: number;
  };
  maxResourcesPerNode: {
    cpu: number;
    memory: number;
    disk: number;
  };
  maxCostPerHour: number;
  allowedRegions: string[];
  requiredCapabilities: string[];
}

export interface ScalingAction {
  actionId: string;
  type: 'add-node' | 'remove-node' | 'upgrade-node' | 'downgrade-node' | 'redistribute-load';
  triggeredBy: string;
  targetNodes: string[];
  parameters: Record<string, any>;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  error?: string;
  impact: {
    expectedLoadChange: number;
    expectedCostChange: number;
    expectedPerformanceChange: number;
  };
}

export interface ResourceOptimization {
  optimizationId: string;
  nodeId: string;
  type: 'cpu-optimization' | 'memory-optimization' | 'disk-optimization' | 'network-optimization';
  currentConfig: NodeConfiguration;
  recommendedConfig: NodeConfiguration;
  expectedBenefit: {
    performanceImprovement: number;
    costReduction: number;
    resourceEfficiency: number;
  };
  confidence: number;
  validUntil: string;
}

export interface NodeConfiguration {
  cpu: {
    cores: number;
    frequency: number;
    architecture: string;
  };
  memory: {
    size: number; // GB
    type: string;
    speed: number;
  };
  disk: {
    size: number; // GB
    type: 'ssd' | 'hdd' | 'nvme';
    iops: number;
  };
  network: {
    bandwidth: number; // Mbps
    latency: number; // ms
  };
}

export interface CapacityForecast {
  forecastId: string;
  timeHorizon: string; // ISO duration (e.g., P30D for 30 days)
  predictions: Array<{
    timestamp: string;
    requiredNodes: number;
    requiredResources: {
      totalCpu: number;
      totalMemory: number;
      totalDisk: number;
      totalNetwork: number;
    };
    confidence: number;
    factors: string[];
  }>;
  recommendations: Array<{
    action: string;
    timing: string;
    rationale: string;
    impact: Record<string, number>;
  }>;
  generatedAt: string;
}

export interface NodePool {
  poolId: string;
  name: string;
  nodeType: string;
  minSize: number;
  maxSize: number;
  currentSize: number;
  targetSize: number;
  nodes: string[];
  autoScaling: boolean;
  configuration: NodeConfiguration;
  cost: {
    hourlyRate: number;
    currency: string;
  };
}

/**
 * Auto Scaling Manager
 */
export class AutoScalingManager extends EventEmitter {
  private scalingPolicies = new Map<string, ScalingPolicy>();
  private activeActions = new Map<string, ScalingAction>();
  private optimizations = new Map<string, ResourceOptimization>();
  private capacityForecasts = new Map<string, CapacityForecast>();
  private nodePools = new Map<string, NodePool>();
  private triggerStates = new Map<string, { triggered: boolean; since: number }>();
  
  private isRunning: boolean = false;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private forecastingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeDefaultPolicies();
    this.initializeDefaultNodePools();
  }

  /**
   * Start auto scaling manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start policy evaluation
    this.evaluationInterval = setInterval(() => {
      this.evaluateScalingPolicies();
    }, 30000); // Every 30 seconds

    // Start capacity forecasting
    this.forecastingInterval = setInterval(() => {
      this.generateCapacityForecasts();
    }, 300000); // Every 5 minutes

    console.log('[AutoScalingManager] Started auto scaling management');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.autoscaling.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-autoscaling',
      actor: 'system',
      data: {
        activePolicies: this.scalingPolicies.size,
        nodePools: this.nodePools.size
      }
    });
  }

  /**
   * Stop auto scaling manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    if (this.forecastingInterval) {
      clearInterval(this.forecastingInterval);
      this.forecastingInterval = null;
    }

    console.log('[AutoScalingManager] Stopped auto scaling management');
  }

  /**
   * Add scaling policy
   */
  async addScalingPolicy(policy: ScalingPolicy): Promise<void> {
    this.scalingPolicies.set(policy.policyId, policy);

    console.log(`[AutoScalingManager] Added scaling policy: ${policy.name} (${policy.type})`);

    // Emit policy added event
    await qflowEventEmitter.emit('q.qflow.scaling.policy.added.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-autoscaling',
      actor: 'system',
      data: {
        policyId: policy.policyId,
        name: policy.name,
        type: policy.type,
        enabled: policy.enabled
      }
    });
  }

  /**
   * Execute scaling action
   */
  async executeScalingAction(
    type: ScalingAction['type'],
    triggeredBy: string,
    targetNodes: string[] = [],
    parameters: Record<string, any> = {}
  ): Promise<string> {
    const actionId = this.generateActionId();

    const action: ScalingAction = {
      actionId,
      type,
      triggeredBy,
      targetNodes,
      parameters,
      status: 'pending',
      startedAt: new Date().toISOString(),
      impact: {
        expectedLoadChange: 0,
        expectedCostChange: 0,
        expectedPerformanceChange: 0
      }
    };

    // Calculate expected impact
    action.impact = await this.calculateActionImpact(action);

    this.activeActions.set(actionId, action);

    console.log(`[AutoScalingManager] Executing scaling action: ${type} (${actionId})`);

    // Emit action started event
    await qflowEventEmitter.emit('q.qflow.scaling.action.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-autoscaling',
      actor: 'system',
      data: {
        actionId,
        type,
        triggeredBy,
        targetNodes,
        expectedImpact: action.impact
      }
    });

    // Execute the action
    try {
      action.status = 'in-progress';
      await this.performScalingAction(action);
      action.status = 'completed';
      action.completedAt = new Date().toISOString();

      console.log(`[AutoScalingManager] Scaling action completed: ${actionId}`);

      // Emit action completed event
      await qflowEventEmitter.emit('q.qflow.scaling.action.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-autoscaling',
        actor: 'system',
        data: {
          actionId,
          type,
          duration: Date.now() - new Date(action.startedAt).getTime()
        }
      });

    } catch (error) {
      action.status = 'failed';
      action.error = error instanceof Error ? error.message : String(error);
      action.completedAt = new Date().toISOString();

      console.error(`[AutoScalingManager] Scaling action failed: ${actionId} - ${error}`);

      // Emit action failed event
      await qflowEventEmitter.emit('q.qflow.scaling.action.failed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-autoscaling',
        actor: 'system',
        data: {
          actionId,
          type,
          error: action.error
        }
      });
    }

    return actionId;
  }

  /**
   * Generate resource optimization recommendations
   */
  async generateOptimizations(nodeId?: string): Promise<ResourceOptimization[]> {
    const optimizations: ResourceOptimization[] = [];
    const nodesToOptimize = nodeId ? [nodeId] : Array.from(this.nodePools.values()).flatMap(pool => pool.nodes);

    for (const targetNodeId of nodesToOptimize) {
      const currentConfig = await this.getCurrentNodeConfiguration(targetNodeId);
      if (!currentConfig) {
        continue;
      }

      // Analyze resource utilization patterns
      const utilizationAnalysis = await this.analyzeResourceUtilization(targetNodeId);

      // Generate optimization recommendations
      const cpuOptimization = await this.optimizeCPU(targetNodeId, currentConfig, utilizationAnalysis);
      if (cpuOptimization) {
        optimizations.push(cpuOptimization);
      }

      const memoryOptimization = await this.optimizeMemory(targetNodeId, currentConfig, utilizationAnalysis);
      if (memoryOptimization) {
        optimizations.push(memoryOptimization);
      }

      const diskOptimization = await this.optimizeDisk(targetNodeId, currentConfig, utilizationAnalysis);
      if (diskOptimization) {
        optimizations.push(diskOptimization);
      }
    }

    // Store optimizations
    for (const optimization of optimizations) {
      this.optimizations.set(optimization.optimizationId, optimization);
    }

    console.log(`[AutoScalingManager] Generated ${optimizations.length} optimization recommendations`);

    return optimizations;
  }

  /**
   * Get capacity forecast
   */
  async getCapacityForecast(timeHorizon: string = 'P30D'): Promise<CapacityForecast> {
    let forecast = this.capacityForecasts.get(timeHorizon);
    
    if (!forecast || this.isForecastStale(forecast)) {
      forecast = await this.generateCapacityForecast(timeHorizon);
      this.capacityForecasts.set(timeHorizon, forecast);
    }

    return forecast;
  }

  /**
   * Add node pool
   */
  async addNodePool(pool: NodePool): Promise<void> {
    this.nodePools.set(pool.poolId, pool);

    console.log(`[AutoScalingManager] Added node pool: ${pool.name} (${pool.nodeType})`);

    // Emit pool added event
    await qflowEventEmitter.emit('q.qflow.nodepool.added.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-autoscaling',
      actor: 'system',
      data: {
        poolId: pool.poolId,
        name: pool.name,
        nodeType: pool.nodeType,
        minSize: pool.minSize,
        maxSize: pool.maxSize
      }
    });
  }

  /**
   * Get scaling status
   */
  getScalingStatus(): {
    activePolicies: number;
    activeActions: number;
    totalNodes: number;
    pendingOptimizations: number;
    lastForecastUpdate: string;
  } {
    const activePolicies = Array.from(this.scalingPolicies.values()).filter(p => p.enabled).length;
    const activeActions = Array.from(this.activeActions.values()).filter(a => a.status === 'in-progress').length;
    const totalNodes = Array.from(this.nodePools.values()).reduce((sum, pool) => sum + pool.currentSize, 0);
    const pendingOptimizations = Array.from(this.optimizations.values()).filter(o => new Date(o.validUntil) > new Date()).length;
    
    const latestForecast = Array.from(this.capacityForecasts.values())
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];

    return {
      activePolicies,
      activeActions,
      totalNodes,
      pendingOptimizations,
      lastForecastUpdate: latestForecast?.generatedAt || 'Never'
    };
  }

  // Private methods

  private async evaluateScalingPolicies(): Promise<void> {
    for (const policy of this.scalingPolicies.values()) {
      if (!policy.enabled) {
        continue;
      }

      await this.evaluatePolicy(policy);
    }
  }

  private async evaluatePolicy(policy: ScalingPolicy): Promise<void> {
    for (const trigger of policy.triggers) {
      const shouldTrigger = await this.evaluateTrigger(trigger);
      const triggerState = this.triggerStates.get(trigger.triggerId) || { triggered: false, since: 0 };

      if (shouldTrigger && !triggerState.triggered) {
        // Trigger condition met for the first time
        triggerState.triggered = true;
        triggerState.since = Date.now();
        this.triggerStates.set(trigger.triggerId, triggerState);

      } else if (!shouldTrigger && triggerState.triggered) {
        // Trigger condition no longer met
        triggerState.triggered = false;
        triggerState.since = 0;
        this.triggerStates.set(trigger.triggerId, triggerState);

      } else if (shouldTrigger && triggerState.triggered) {
        // Check if duration threshold is met
        const duration = Date.now() - triggerState.since;
        if (duration >= trigger.duration) {
          // Execute scaling action
          await this.executeTriggeredAction(policy, trigger);
          
          // Reset trigger state to prevent immediate re-triggering
          triggerState.triggered = false;
          triggerState.since = 0;
          this.triggerStates.set(trigger.triggerId, triggerState);
        }
      }
    }
  }

  private async evaluateTrigger(trigger: ScalingTrigger): Promise<boolean> {
    // Get current metric value
    const currentValue = await this.getCurrentMetricValue(trigger.metric);
    
    switch (trigger.comparison) {
      case 'greater-than':
        return currentValue > trigger.threshold;
      case 'less-than':
        return currentValue < trigger.threshold;
      case 'equals':
        return Math.abs(currentValue - trigger.threshold) < 0.01;
      default:
        return false;
    }
  }

  private async getCurrentMetricValue(metric: ScalingTrigger['metric']): Promise<number> {
    // In real implementation, would get actual metrics from monitoring system
    // For now, simulate some values
    const distribution = intelligentLoadBalancer.getLoadDistribution();
    
    switch (metric) {
      case 'cpu':
        return distribution.averageLoad;
      case 'memory':
        return distribution.averageLoad * 0.8;
      case 'response-time':
        return 100 + (distribution.averageLoad * 2);
      case 'throughput':
        return Math.max(0, 100 - distribution.averageLoad);
      case 'error-rate':
        return distribution.averageLoad > 80 ? 5 : 1;
      case 'queue-length':
        return distribution.averageLoad / 10;
      default:
        return 50;
    }
  }

  private async executeTriggeredAction(policy: ScalingPolicy, trigger: ScalingTrigger): Promise<void> {
    console.log(`[AutoScalingManager] Trigger activated: ${trigger.triggerId} (${trigger.action})`);

    let actionType: ScalingAction['type'];
    switch (trigger.action) {
      case 'scale-up':
        actionType = policy.type === 'horizontal' ? 'add-node' : 'upgrade-node';
        break;
      case 'scale-down':
        actionType = policy.type === 'horizontal' ? 'remove-node' : 'downgrade-node';
        break;
      case 'optimize':
        actionType = 'redistribute-load';
        break;
      default:
        return;
    }

    await this.executeScalingAction(actionType, trigger.triggerId);
  }

  private async performScalingAction(action: ScalingAction): Promise<void> {
    switch (action.type) {
      case 'add-node':
        await this.addNode(action);
        break;
      case 'remove-node':
        await this.removeNode(action);
        break;
      case 'upgrade-node':
        await this.upgradeNode(action);
        break;
      case 'downgrade-node':
        await this.downgradeNode(action);
        break;
      case 'redistribute-load':
        await this.redistributeLoad(action);
        break;
    }
  }

  private async addNode(action: ScalingAction): Promise<void> {
    // Find appropriate node pool
    const pool = this.findBestNodePool();
    if (!pool) {
      throw new Error('No suitable node pool found for scaling up');
    }

    if (pool.currentSize >= pool.maxSize) {
      throw new Error(`Node pool ${pool.name} is at maximum capacity`);
    }

    // Simulate node provisioning
    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    pool.nodes.push(newNodeId);
    pool.currentSize++;

    console.log(`[AutoScalingManager] Added node ${newNodeId} to pool ${pool.name}`);

    // Update load balancer
    await intelligentLoadBalancer.updateNodeLoad(newNodeId, {
      nodeId: newNodeId,
      cpuUtilization: 10,
      memoryUtilization: 15,
      networkUtilization: 5,
      diskUtilization: 10,
      activeConnections: 0,
      queuedTasks: 0,
      averageResponseTime: 50,
      throughput: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    });
  }

  private async removeNode(action: ScalingAction): Promise<void> {
    // Find node to remove (least utilized)
    const distribution = intelligentLoadBalancer.getLoadDistribution();
    if (distribution.underutilizedNodes.length === 0) {
      throw new Error('No underutilized nodes available for removal');
    }

    const nodeToRemove = distribution.underutilizedNodes[0];
    
    // Find the pool containing this node
    const pool = Array.from(this.nodePools.values()).find(p => p.nodes.includes(nodeToRemove));
    if (!pool) {
      throw new Error(`Node ${nodeToRemove} not found in any pool`);
    }

    if (pool.currentSize <= pool.minSize) {
      throw new Error(`Node pool ${pool.name} is at minimum capacity`);
    }

    // Remove node
    pool.nodes = pool.nodes.filter(id => id !== nodeToRemove);
    pool.currentSize--;

    console.log(`[AutoScalingManager] Removed node ${nodeToRemove} from pool ${pool.name}`);
  }

  private async upgradeNode(action: ScalingAction): Promise<void> {
    // Simulate vertical scaling up
    console.log('[AutoScalingManager] Upgrading node resources (vertical scaling up)');
    
    // In real implementation, would increase CPU/memory/disk for existing nodes
    // For simulation, just log the action
  }

  private async downgradeNode(action: ScalingAction): Promise<void> {
    // Simulate vertical scaling down
    console.log('[AutoScalingManager] Downgrading node resources (vertical scaling down)');
    
    // In real implementation, would decrease CPU/memory/disk for existing nodes
    // For simulation, just log the action
  }

  private async redistributeLoad(action: ScalingAction): Promise<void> {
    // Trigger load rebalancing
    console.log('[AutoScalingManager] Redistributing load across nodes');
    
    // In real implementation, would trigger load balancer to redistribute tasks
    // For simulation, just log the action
  }

  private async calculateActionImpact(action: ScalingAction): Promise<ScalingAction['impact']> {
    // Calculate expected impact based on action type
    switch (action.type) {
      case 'add-node':
        return {
          expectedLoadChange: -20, // Reduce load by 20%
          expectedCostChange: 15,  // Increase cost by 15%
          expectedPerformanceChange: 25 // Improve performance by 25%
        };
      case 'remove-node':
        return {
          expectedLoadChange: 15,  // Increase load by 15%
          expectedCostChange: -12, // Reduce cost by 12%
          expectedPerformanceChange: -10 // Decrease performance by 10%
        };
      case 'upgrade-node':
        return {
          expectedLoadChange: -15, // Reduce load by 15%
          expectedCostChange: 8,   // Increase cost by 8%
          expectedPerformanceChange: 20 // Improve performance by 20%
        };
      case 'downgrade-node':
        return {
          expectedLoadChange: 10,  // Increase load by 10%
          expectedCostChange: -6,  // Reduce cost by 6%
          expectedPerformanceChange: -8 // Decrease performance by 8%
        };
      default:
        return {
          expectedLoadChange: 0,
          expectedCostChange: 0,
          expectedPerformanceChange: 0
        };
    }
  }

  private findBestNodePool(): NodePool | undefined {
    // Find pool with available capacity and lowest cost
    return Array.from(this.nodePools.values())
      .filter(pool => pool.currentSize < pool.maxSize && pool.autoScaling)
      .sort((a, b) => a.cost.hourlyRate - b.cost.hourlyRate)[0];
  }

  private async getCurrentNodeConfiguration(nodeId: string): Promise<NodeConfiguration | null> {
    // In real implementation, would query actual node configuration
    // For simulation, return mock configuration
    return {
      cpu: {
        cores: 4,
        frequency: 2400,
        architecture: 'x86_64'
      },
      memory: {
        size: 16,
        type: 'DDR4',
        speed: 3200
      },
      disk: {
        size: 500,
        type: 'ssd',
        iops: 3000
      },
      network: {
        bandwidth: 1000,
        latency: 10
      }
    };
  }

  private async analyzeResourceUtilization(nodeId: string): Promise<Record<string, number>> {
    // In real implementation, would analyze historical utilization data
    // For simulation, return mock analysis
    return {
      avgCpuUtilization: 45,
      maxCpuUtilization: 78,
      avgMemoryUtilization: 62,
      maxMemoryUtilization: 85,
      avgDiskUtilization: 35,
      maxDiskUtilization: 55,
      avgNetworkUtilization: 25,
      maxNetworkUtilization: 40
    };
  }

  private async optimizeCPU(
    nodeId: string,
    currentConfig: NodeConfiguration,
    utilization: Record<string, number>
  ): Promise<ResourceOptimization | null> {
    if (utilization.avgCpuUtilization < 30 && currentConfig.cpu.cores > 2) {
      // Recommend CPU downgrade
      const optimizationId = this.generateOptimizationId();
      return {
        optimizationId,
        nodeId,
        type: 'cpu-optimization',
        currentConfig,
        recommendedConfig: {
          ...currentConfig,
          cpu: {
            ...currentConfig.cpu,
            cores: Math.max(2, currentConfig.cpu.cores - 2)
          }
        },
        expectedBenefit: {
          performanceImprovement: -5,
          costReduction: 20,
          resourceEfficiency: 15
        },
        confidence: 0.8,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    if (utilization.maxCpuUtilization > 85) {
      // Recommend CPU upgrade
      const optimizationId = this.generateOptimizationId();
      return {
        optimizationId,
        nodeId,
        type: 'cpu-optimization',
        currentConfig,
        recommendedConfig: {
          ...currentConfig,
          cpu: {
            ...currentConfig.cpu,
            cores: currentConfig.cpu.cores + 2
          }
        },
        expectedBenefit: {
          performanceImprovement: 25,
          costReduction: -15,
          resourceEfficiency: 10
        },
        confidence: 0.9,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  private async optimizeMemory(
    nodeId: string,
    currentConfig: NodeConfiguration,
    utilization: Record<string, number>
  ): Promise<ResourceOptimization | null> {
    if (utilization.avgMemoryUtilization < 40 && currentConfig.memory.size > 8) {
      // Recommend memory reduction
      const optimizationId = this.generateOptimizationId();
      return {
        optimizationId,
        nodeId,
        type: 'memory-optimization',
        currentConfig,
        recommendedConfig: {
          ...currentConfig,
          memory: {
            ...currentConfig.memory,
            size: Math.max(8, currentConfig.memory.size - 8)
          }
        },
        expectedBenefit: {
          performanceImprovement: -2,
          costReduction: 15,
          resourceEfficiency: 12
        },
        confidence: 0.75,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  private async optimizeDisk(
    nodeId: string,
    currentConfig: NodeConfiguration,
    utilization: Record<string, number>
  ): Promise<ResourceOptimization | null> {
    if (utilization.avgDiskUtilization > 70 && currentConfig.disk.type === 'hdd') {
      // Recommend SSD upgrade
      const optimizationId = this.generateOptimizationId();
      return {
        optimizationId,
        nodeId,
        type: 'disk-optimization',
        currentConfig,
        recommendedConfig: {
          ...currentConfig,
          disk: {
            ...currentConfig.disk,
            type: 'ssd',
            iops: 5000
          }
        },
        expectedBenefit: {
          performanceImprovement: 40,
          costReduction: 0,
          resourceEfficiency: 20
        },
        confidence: 0.85,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    return null;
  }

  private async generateCapacityForecasts(): Promise<void> {
    const horizons = ['P7D', 'P30D', 'P90D']; // 7 days, 30 days, 90 days
    
    for (const horizon of horizons) {
      const forecast = await this.generateCapacityForecast(horizon);
      this.capacityForecasts.set(horizon, forecast);
    }
  }

  private async generateCapacityForecast(timeHorizon: string): Promise<CapacityForecast> {
    const forecastId = this.generateForecastId();
    const predictions: CapacityForecast['predictions'] = [];
    const recommendations: CapacityForecast['recommendations'] = [];

    // Parse time horizon (simplified)
    const days = parseInt(timeHorizon.replace('P', '').replace('D', ''));
    const now = Date.now();

    // Generate predictions for each day
    for (let i = 1; i <= days; i++) {
      const futureTime = new Date(now + (i * 24 * 60 * 60 * 1000));
      
      // Simple growth model (in real implementation, would use sophisticated forecasting)
      const baseLoad = 50;
      const growthRate = 0.02; // 2% daily growth
      const seasonality = Math.sin((i / 7) * 2 * Math.PI) * 10; // Weekly pattern
      const randomVariation = (Math.random() - 0.5) * 20;
      
      const predictedLoad = baseLoad + (baseLoad * growthRate * i) + seasonality + randomVariation;
      const requiredNodes = Math.ceil(predictedLoad / 70); // Assume 70% target utilization
      
      predictions.push({
        timestamp: futureTime.toISOString(),
        requiredNodes,
        requiredResources: {
          totalCpu: requiredNodes * 4,
          totalMemory: requiredNodes * 16,
          totalDisk: requiredNodes * 500,
          totalNetwork: requiredNodes * 1000
        },
        confidence: Math.max(0.5, 0.9 - (i / days) * 0.4), // Confidence decreases over time
        factors: ['historical-growth', 'seasonal-patterns', 'business-projections']
      });
    }

    // Generate recommendations based on predictions
    const currentNodes = Array.from(this.nodePools.values()).reduce((sum, pool) => sum + pool.currentSize, 0);
    const maxRequiredNodes = Math.max(...predictions.map(p => p.requiredNodes));
    
    if (maxRequiredNodes > currentNodes * 1.2) {
      recommendations.push({
        action: 'Prepare for capacity expansion',
        timing: predictions.find(p => p.requiredNodes > currentNodes * 1.2)?.timestamp || 'Unknown',
        rationale: `Predicted peak demand (${maxRequiredNodes} nodes) exceeds current capacity by 20%`,
        impact: {
          costIncrease: (maxRequiredNodes - currentNodes) * 100, // $100 per node per month
          performanceImprovement: 25,
          riskReduction: 40
        }
      });
    }

    return {
      forecastId,
      timeHorizon,
      predictions,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  private isForecastStale(forecast: CapacityForecast): boolean {
    const age = Date.now() - new Date(forecast.generatedAt).getTime();
    return age > (60 * 60 * 1000); // 1 hour
  }

  private initializeDefaultPolicies(): void {
    // CPU-based scaling policy
    const cpuPolicy: ScalingPolicy = {
      policyId: 'cpu-autoscaling',
      name: 'CPU-based Auto Scaling',
      type: 'horizontal',
      triggers: [
        {
          triggerId: 'cpu-scale-up',
          metric: 'cpu',
          threshold: 80,
          comparison: 'greater-than',
          duration: 300000, // 5 minutes
          action: 'scale-up'
        },
        {
          triggerId: 'cpu-scale-down',
          metric: 'cpu',
          threshold: 30,
          comparison: 'less-than',
          duration: 600000, // 10 minutes
          action: 'scale-down'
        }
      ],
      constraints: {
        minNodes: 2,
        maxNodes: 20,
        minResourcesPerNode: { cpu: 2, memory: 4, disk: 100 },
        maxResourcesPerNode: { cpu: 16, memory: 64, disk: 2000 },
        maxCostPerHour: 1000,
        allowedRegions: ['us-east-1', 'us-west-2', 'eu-west-1'],
        requiredCapabilities: ['qflow-execution']
      },
      cooldownPeriod: 300000, // 5 minutes
      enabled: true
    };

    this.scalingPolicies.set(cpuPolicy.policyId, cpuPolicy);
  }

  private initializeDefaultNodePools(): void {
    // Standard node pool
    const standardPool: NodePool = {
      poolId: 'standard-pool',
      name: 'Standard Execution Nodes',
      nodeType: 'standard',
      minSize: 2,
      maxSize: 10,
      currentSize: 3,
      targetSize: 3,
      nodes: ['node-1', 'node-2', 'node-3'],
      autoScaling: true,
      configuration: {
        cpu: { cores: 4, frequency: 2400, architecture: 'x86_64' },
        memory: { size: 16, type: 'DDR4', speed: 3200 },
        disk: { size: 500, type: 'ssd', iops: 3000 },
        network: { bandwidth: 1000, latency: 10 }
      },
      cost: {
        hourlyRate: 0.50,
        currency: 'USD'
      }
    };

    this.nodePools.set(standardPool.poolId, standardPool);
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.scalingPolicies.clear();
    this.activeActions.clear();
    this.optimizations.clear();
    this.capacityForecasts.clear();
    this.nodePools.clear();
    this.triggerStates.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const autoScalingManager = new AutoScalingManager();