/**
 * Cost-Based Degradation Service
 * Implements auto-pause for low-priority flows when burn-rate increases,
 * cost monitoring, and threshold-based flow control with serverless cost control integration
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import ObservabilityService from './ObservabilityService.mjs';
import { EventBusService } from './EventBusService.mjs';
import ServerlessCostControlService from './ServerlessCostControlService.mjs';

export class CostBasedDegradationService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Cost thresholds
      burnRateThreshold: 0.10, // 10% burn rate triggers degradation
      criticalBurnRateThreshold: 0.20, // 20% burn rate triggers emergency measures
      costBudgetDaily: 1000, // $1000 daily budget
      costBudgetHourly: 50, // $50 hourly budget
      
      // Flow priorities
      flowPriorities: {
        'critical': 1,
        'high': 2,
        'medium': 3,
        'low': 4,
        'background': 5
      },
      
      // Degradation levels
      degradationLevels: {
        'none': 0,
        'throttle_low': 1,
        'pause_low': 2,
        'throttle_medium': 3,
        'pause_medium': 4,
        'emergency': 5
      },
      
      // Monitoring intervals
      costMonitoringInterval: 60000, // 1 minute
      burnRateCalculationWindow: 300000, // 5 minutes
      
      // Recovery settings
      recoveryThreshold: 0.05, // 5% burn rate for recovery
      recoveryDelay: 120000, // 2 minutes delay before recovery
      
      ...options
    };

    // Initialize services
    this.observability = new ObservabilityService();
    this.eventBus = new EventBusService();
    this.serverlessCostControl = new ServerlessCostControlService();

    // State tracking
    this.currentDegradationLevel = 'none';
    this.pausedFlows = new Map();
    this.throttledFlows = new Map();
    this.costHistory = [];
    this.burnRateHistory = [];
    this.flowMetrics = new Map();
    
    // Active monitoring
    this.costMonitoringTimer = null;
    this.recoveryTimer = null;
    
    // Flow control
    this.activeFlows = new Map();
    this.flowQueue = new Map(); // Queued flows during degradation

    this.startCostMonitoring();
    console.log(`[CostBasedDegradation] Service initialized with burn rate threshold: ${this.config.burnRateThreshold * 100}%`);
  }

  /**
   * Start cost monitoring
   */
  startCostMonitoring() {
    if (this.costMonitoringTimer) {
      clearInterval(this.costMonitoringTimer);
    }

    this.costMonitoringTimer = setInterval(async () => {
      try {
        await this.performCostMonitoring();
      } catch (error) {
        console.error(`[CostBasedDegradation] Cost monitoring error:`, error);
      }
    }, this.config.costMonitoringInterval);

    console.log(`[CostBasedDegradation] Cost monitoring started`);
  }

  /**
   * Stop cost monitoring
   */
  stopCostMonitoring() {
    if (this.costMonitoringTimer) {
      clearInterval(this.costMonitoringTimer);
      this.costMonitoringTimer = null;
    }

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    console.log(`[CostBasedDegradation] Cost monitoring stopped`);
  }

  /**
   * Register flow for cost monitoring
   */
  async registerFlow(flowId, flowConfig) {
    const flow = {
      flowId,
      priority: flowConfig.priority || 'medium',
      estimatedCost: flowConfig.estimatedCost || 0,
      maxCost: flowConfig.maxCost || Infinity,
      startTime: new Date().toISOString(),
      status: 'active',
      actualCost: 0,
      ...flowConfig
    };

    this.activeFlows.set(flowId, flow);

    // Check if flow should be immediately degraded
    const shouldDegrade = await this.shouldDegradeFlow(flow);
    if (shouldDegrade.degrade) {
      await this.applyFlowDegradation(flowId, shouldDegrade.action);
    }

    // Emit flow registration event
    await this.eventBus.publish({
      topic: 'q.cost.flow.registered.v1',
      payload: {
        flowId,
        priority: flow.priority,
        estimatedCost: flow.estimatedCost,
        degradationLevel: this.currentDegradationLevel
      },
      actor: { squidId: 'cost-based-degradation', type: 'system' }
    });

    console.log(`[CostBasedDegradation] Flow registered: ${flowId} (priority: ${flow.priority})`);
    return flow;
  }

  /**
   * Update flow cost
   */
  async updateFlowCost(flowId, actualCost) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const previousCost = flow.actualCost;
    flow.actualCost = actualCost;
    flow.lastUpdated = new Date().toISOString();

    // Check if flow exceeds cost limits
    if (actualCost > flow.maxCost) {
      await this.pauseFlow(flowId, 'cost_limit_exceeded');
    }

    // Update cost metrics
    await this.updateCostMetrics(flowId, actualCost - previousCost);

    return flow;
  }

  /**
   * Complete flow
   */
  async completeFlow(flowId, finalCost = null) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      return null;
    }

    if (finalCost !== null) {
      flow.actualCost = finalCost;
    }

    flow.endTime = new Date().toISOString();
    flow.status = 'completed';
    flow.duration = new Date(flow.endTime) - new Date(flow.startTime);

    // Remove from active flows
    this.activeFlows.delete(flowId);
    this.pausedFlows.delete(flowId);
    this.throttledFlows.delete(flowId);

    // Store metrics
    this.flowMetrics.set(flowId, {
      ...flow,
      costEfficiency: flow.estimatedCost > 0 ? flow.actualCost / flow.estimatedCost : 1,
      completedAt: new Date().toISOString()
    });

    // Emit flow completion event
    await this.eventBus.publish({
      topic: 'q.cost.flow.completed.v1',
      payload: {
        flowId,
        actualCost: flow.actualCost,
        estimatedCost: flow.estimatedCost,
        duration: flow.duration,
        costEfficiency: this.flowMetrics.get(flowId).costEfficiency
      },
      actor: { squidId: 'cost-based-degradation', type: 'system' }
    });

    console.log(`[CostBasedDegradation] Flow completed: ${flowId} (cost: $${flow.actualCost.toFixed(2)})`);
    return flow;
  }

  /**
   * Perform cost monitoring and degradation decisions
   */
  async performCostMonitoring() {
    const monitoringId = this.generateMonitoringId();
    const startTime = performance.now();

    try {
      console.log(`[CostBasedDegradation] Performing cost monitoring: ${monitoringId}`);

      // Get current cost metrics
      const costMetrics = await this.getCurrentCostMetrics();
      
      // Calculate burn rate
      const burnRate = await this.calculateBurnRate(costMetrics);
      
      // Update history
      this.costHistory.push({
        timestamp: new Date().toISOString(),
        ...costMetrics
      });
      
      this.burnRateHistory.push({
        timestamp: new Date().toISOString(),
        burnRate
      });

      // Trim history to keep only recent data
      this.trimHistory();

      // Determine degradation level
      const newDegradationLevel = this.determineDegradationLevel(burnRate, costMetrics);
      
      // Apply degradation if needed
      if (newDegradationLevel !== this.currentDegradationLevel) {
        await this.applyDegradation(newDegradationLevel, burnRate, costMetrics);
      }

      // Check for recovery conditions
      if (this.shouldAttemptRecovery(burnRate)) {
        await this.scheduleRecovery();
      }

      // Emit monitoring event
      await this.eventBus.publish({
        topic: 'q.cost.monitoring.completed.v1',
        payload: {
          monitoringId,
          burnRate,
          degradationLevel: this.currentDegradationLevel,
          costMetrics,
          activeFlows: this.activeFlows.size,
          pausedFlows: this.pausedFlows.size
        },
        actor: { squidId: 'cost-based-degradation', type: 'system' }
      });

      console.log(`[CostBasedDegradation] ✅ Cost monitoring completed: burn rate ${(burnRate * 100).toFixed(2)}%, degradation: ${this.currentDegradationLevel}`);

    } catch (error) {
      console.error(`[CostBasedDegradation] ❌ Cost monitoring failed: ${monitoringId}`, error);
      
      await this.eventBus.publish({
        topic: 'q.cost.monitoring.failed.v1',
        payload: {
          monitoringId,
          error: error.message,
          duration: performance.now() - startTime
        },
        actor: { squidId: 'cost-based-degradation', type: 'system' }
      });
    }
  }

  /**
   * Get current cost metrics
   */
  async getCurrentCostMetrics() {
    try {
      // Get metrics from serverless cost control service
      const serverlessMetrics = await this.serverlessCostControl.getCurrentCosts();
      
      // Calculate total costs from active flows
      const activeFlowCosts = Array.from(this.activeFlows.values())
        .reduce((sum, flow) => sum + flow.actualCost, 0);

      // Get time-based costs
      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const hourlyCosts = this.calculateCostsInTimeWindow(hourStart, now);
      const dailyCosts = this.calculateCostsInTimeWindow(dayStart, now);

      return {
        totalCost: serverlessMetrics.totalCost + activeFlowCosts,
        hourlyCost: hourlyCosts,
        dailyCost: dailyCosts,
        serverlessCost: serverlessMetrics.totalCost,
        flowCost: activeFlowCosts,
        budgetUtilization: {
          hourly: hourlyCosts / this.config.costBudgetHourly,
          daily: dailyCosts / this.config.costBudgetDaily
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[CostBasedDegradation] Error getting cost metrics:`, error);
      return {
        totalCost: 0,
        hourlyCost: 0,
        dailyCost: 0,
        serverlessCost: 0,
        flowCost: 0,
        budgetUtilization: { hourly: 0, daily: 0 },
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Calculate burn rate
   */
  async calculateBurnRate(costMetrics) {
    if (this.costHistory.length < 2) {
      return 0;
    }

    // Calculate burn rate based on recent cost increase
    const windowStart = new Date(Date.now() - this.config.burnRateCalculationWindow);
    const recentHistory = this.costHistory.filter(h => new Date(h.timestamp) >= windowStart);

    if (recentHistory.length < 2) {
      return 0;
    }

    const oldestCost = recentHistory[0].totalCost;
    const newestCost = costMetrics.totalCost;
    const timeWindow = (Date.now() - new Date(recentHistory[0].timestamp)) / 1000 / 60; // minutes

    if (timeWindow === 0) {
      return 0;
    }

    // Burn rate as cost increase per minute relative to budget
    const costIncrease = newestCost - oldestCost;
    const burnRatePerMinute = costIncrease / timeWindow;
    const hourlyBurnRate = burnRatePerMinute * 60;
    
    // Normalize to budget percentage
    return hourlyBurnRate / this.config.costBudgetHourly;
  }

  /**
   * Determine degradation level based on burn rate and cost metrics
   */
  determineDegradationLevel(burnRate, costMetrics) {
    // Emergency degradation for critical burn rate
    if (burnRate >= this.config.criticalBurnRateThreshold) {
      return 'emergency';
    }

    // Budget-based degradation
    if (costMetrics.budgetUtilization.hourly >= 0.9) { // 90% of hourly budget
      return 'pause_medium';
    }

    if (costMetrics.budgetUtilization.daily >= 0.8) { // 80% of daily budget
      return 'throttle_medium';
    }

    // Burn rate based degradation
    if (burnRate >= this.config.burnRateThreshold) {
      if (burnRate >= this.config.burnRateThreshold * 1.5) {
        return 'pause_low';
      } else {
        return 'throttle_low';
      }
    }

    return 'none';
  }

  /**
   * Apply degradation measures
   */
  async applyDegradation(newLevel, burnRate, costMetrics) {
    const previousLevel = this.currentDegradationLevel;
    this.currentDegradationLevel = newLevel;

    console.log(`[CostBasedDegradation] Applying degradation: ${previousLevel} → ${newLevel} (burn rate: ${(burnRate * 100).toFixed(2)}%)`);

    const degradationActions = [];

    switch (newLevel) {
      case 'throttle_low':
        degradationActions.push(...await this.throttleFlowsByPriority(['low', 'background']));
        break;
        
      case 'pause_low':
        degradationActions.push(...await this.pauseFlowsByPriority(['low', 'background']));
        break;
        
      case 'throttle_medium':
        degradationActions.push(...await this.throttleFlowsByPriority(['medium', 'low', 'background']));
        break;
        
      case 'pause_medium':
        degradationActions.push(...await this.pauseFlowsByPriority(['medium', 'low', 'background']));
        break;
        
      case 'emergency':
        degradationActions.push(...await this.pauseFlowsByPriority(['high', 'medium', 'low', 'background']));
        // Also trigger serverless cost control emergency measures
        await this.serverlessCostControl.triggerEmergencyMeasures();
        break;
        
      case 'none':
        // Recovery - resume flows
        degradationActions.push(...await this.resumeAllFlows());
        break;
    }

    // Emit degradation event
    await this.eventBus.publish({
      topic: 'q.cost.degradation.applied.v1',
      payload: {
        previousLevel,
        newLevel,
        burnRate,
        costMetrics,
        actions: degradationActions.length,
        affectedFlows: degradationActions.map(a => a.flowId)
      },
      actor: { squidId: 'cost-based-degradation', type: 'system' }
    });
  }

  /**
   * Throttle flows by priority
   */
  async throttleFlowsByPriority(priorities) {
    const actions = [];

    for (const [flowId, flow] of this.activeFlows) {
      if (priorities.includes(flow.priority) && !this.throttledFlows.has(flowId)) {
        await this.throttleFlow(flowId, 'cost_degradation');
        actions.push({ action: 'throttle', flowId, priority: flow.priority });
      }
    }

    return actions;
  }

  /**
   * Pause flows by priority
   */
  async pauseFlowsByPriority(priorities) {
    const actions = [];

    for (const [flowId, flow] of this.activeFlows) {
      if (priorities.includes(flow.priority) && !this.pausedFlows.has(flowId)) {
        await this.pauseFlow(flowId, 'cost_degradation');
        actions.push({ action: 'pause', flowId, priority: flow.priority });
      }
    }

    return actions;
  }

  /**
   * Throttle individual flow
   */
  async throttleFlow(flowId, reason) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      return false;
    }

    this.throttledFlows.set(flowId, {
      flowId,
      throttledAt: new Date().toISOString(),
      reason,
      originalPriority: flow.priority
    });

    flow.status = 'throttled';

    console.log(`[CostBasedDegradation] Flow throttled: ${flowId} (reason: ${reason})`);
    return true;
  }

  /**
   * Pause individual flow
   */
  async pauseFlow(flowId, reason) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      return false;
    }

    this.pausedFlows.set(flowId, {
      flowId,
      pausedAt: new Date().toISOString(),
      reason,
      originalPriority: flow.priority
    });

    flow.status = 'paused';

    console.log(`[CostBasedDegradation] Flow paused: ${flowId} (reason: ${reason})`);
    return true;
  }

  /**
   * Resume all flows
   */
  async resumeAllFlows() {
    const actions = [];

    // Resume paused flows
    for (const [flowId, pauseInfo] of this.pausedFlows) {
      await this.resumeFlow(flowId);
      actions.push({ action: 'resume', flowId, wasPaused: true });
    }

    // Resume throttled flows
    for (const [flowId, throttleInfo] of this.throttledFlows) {
      await this.resumeFlow(flowId);
      actions.push({ action: 'resume', flowId, wasThrottled: true });
    }

    return actions;
  }

  /**
   * Resume individual flow
   */
  async resumeFlow(flowId) {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      return false;
    }

    this.pausedFlows.delete(flowId);
    this.throttledFlows.delete(flowId);
    flow.status = 'active';

    console.log(`[CostBasedDegradation] Flow resumed: ${flowId}`);
    return true;
  }

  /**
   * Check if should degrade flow
   */
  async shouldDegradeFlow(flow) {
    const currentLevel = this.config.degradationLevels[this.currentDegradationLevel];
    const flowPriority = this.config.flowPriorities[flow.priority];

    // Determine if flow should be degraded based on current degradation level
    switch (this.currentDegradationLevel) {
      case 'throttle_low':
        if (['low', 'background'].includes(flow.priority)) {
          return { degrade: true, action: 'throttle' };
        }
        break;
        
      case 'pause_low':
        if (['low', 'background'].includes(flow.priority)) {
          return { degrade: true, action: 'pause' };
        }
        break;
        
      case 'throttle_medium':
        if (['medium', 'low', 'background'].includes(flow.priority)) {
          return { degrade: true, action: 'throttle' };
        }
        break;
        
      case 'pause_medium':
        if (['medium', 'low', 'background'].includes(flow.priority)) {
          return { degrade: true, action: 'pause' };
        }
        break;
        
      case 'emergency':
        if (['high', 'medium', 'low', 'background'].includes(flow.priority)) {
          return { degrade: true, action: 'pause' };
        }
        break;
    }

    return { degrade: false };
  }

  /**
   * Apply flow degradation
   */
  async applyFlowDegradation(flowId, action) {
    switch (action) {
      case 'throttle':
        return await this.throttleFlow(flowId, 'immediate_degradation');
      case 'pause':
        return await this.pauseFlow(flowId, 'immediate_degradation');
      default:
        return false;
    }
  }

  /**
   * Check if should attempt recovery
   */
  shouldAttemptRecovery(burnRate) {
    return this.currentDegradationLevel !== 'none' && 
           burnRate <= this.config.recoveryThreshold &&
           !this.recoveryTimer;
  }

  /**
   * Schedule recovery
   */
  async scheduleRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(async () => {
      try {
        // Re-check conditions before recovery
        const costMetrics = await this.getCurrentCostMetrics();
        const burnRate = await this.calculateBurnRate(costMetrics);

        if (burnRate <= this.config.recoveryThreshold) {
          await this.applyDegradation('none', burnRate, costMetrics);
          console.log(`[CostBasedDegradation] Recovery completed: burn rate ${(burnRate * 100).toFixed(2)}%`);
        }
      } catch (error) {
        console.error(`[CostBasedDegradation] Recovery failed:`, error);
      } finally {
        this.recoveryTimer = null;
      }
    }, this.config.recoveryDelay);

    console.log(`[CostBasedDegradation] Recovery scheduled in ${this.config.recoveryDelay / 1000} seconds`);
  }

  /**
   * Calculate costs in time window
   */
  calculateCostsInTimeWindow(startTime, endTime) {
    return this.costHistory
      .filter(h => {
        const timestamp = new Date(h.timestamp);
        return timestamp >= startTime && timestamp <= endTime;
      })
      .reduce((sum, h) => Math.max(sum, h.totalCost), 0);
  }

  /**
   * Update cost metrics
   */
  async updateCostMetrics(flowId, costDelta) {
    // Update internal tracking
    // This would integrate with actual cost tracking systems
    console.log(`[CostBasedDegradation] Cost update: ${flowId} +$${costDelta.toFixed(4)}`);
  }

  /**
   * Trim history to keep only recent data
   */
  trimHistory() {
    const maxHistoryAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - maxHistoryAge);

    this.costHistory = this.costHistory.filter(h => new Date(h.timestamp) >= cutoff);
    this.burnRateHistory = this.burnRateHistory.filter(h => new Date(h.timestamp) >= cutoff);
  }

  /**
   * Get degradation status
   */
  getDegradationStatus() {
    return {
      currentLevel: this.currentDegradationLevel,
      activeFlows: this.activeFlows.size,
      pausedFlows: this.pausedFlows.size,
      throttledFlows: this.throttledFlows.size,
      recentBurnRate: this.burnRateHistory.length > 0 ? 
        this.burnRateHistory[this.burnRateHistory.length - 1].burnRate : 0,
      recoveryScheduled: !!this.recoveryTimer
    };
  }

  /**
   * Get cost summary
   */
  getCostSummary() {
    const recentCosts = this.costHistory.length > 0 ? 
      this.costHistory[this.costHistory.length - 1] : null;

    return {
      currentCosts: recentCosts,
      totalFlows: this.activeFlows.size + this.flowMetrics.size,
      completedFlows: this.flowMetrics.size,
      costHistory: this.costHistory.slice(-10), // Last 10 entries
      burnRateHistory: this.burnRateHistory.slice(-10)
    };
  }

  // Utility methods
  generateMonitoringId() {
    return `cost_mon_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      degradationLevel: this.currentDegradationLevel,
      activeFlows: this.activeFlows.size,
      pausedFlows: this.pausedFlows.size,
      throttledFlows: this.throttledFlows.size,
      monitoringActive: !!this.costMonitoringTimer,
      config: {
        burnRateThreshold: this.config.burnRateThreshold,
        costBudgetDaily: this.config.costBudgetDaily,
        costBudgetHourly: this.config.costBudgetHourly
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.stopCostMonitoring();
    this.removeAllListeners();
    console.log(`[CostBasedDegradation] Service cleaned up`);
  }
}

export default CostBasedDegradationService;