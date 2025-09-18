/**
 * Serverless Cost Control Service
 * Manages invocation limits, budget alerts, and cost optimization for serverless deployments
 */

import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';

export class ServerlessCostControlService {
  constructor() {
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    this.invocationCounts = new Map();
    this.budgetAlerts = new Map();
    this.costMetrics = new Map();
    this.degradationStrategies = new Map();
    
    // Default invocation limits per module
    this.defaultLimits = {
      perMinute: 1000,
      perHour: 50000,
      perDay: 1000000,
      perMonth: 25000000
    };
    
    // Default budget thresholds
    this.defaultBudgetThresholds = {
      warning: 0.8,    // 80% of budget
      critical: 0.95,  // 95% of budget
      cutoff: 1.0      // 100% of budget
    };
    
    this.initializeMetrics();
  }

  /**
   * Initialize cost control metrics and monitoring
   */
  initializeMetrics() {
    this.observability.registerMetric('serverless_invocations_total', 'counter', {
      help: 'Total serverless function invocations',
      labelNames: ['module', 'function', 'status']
    });
    
    this.observability.registerMetric('serverless_cost_estimate', 'gauge', {
      help: 'Estimated serverless costs',
      labelNames: ['module', 'period']
    });
    
    this.observability.registerMetric('serverless_budget_utilization', 'gauge', {
      help: 'Budget utilization percentage',
      labelNames: ['module', 'period']
    });
    
    this.observability.registerMetric('serverless_cold_starts_total', 'counter', {
      help: 'Total cold start events',
      labelNames: ['module', 'function']
    });
  }

  /**
   * Set invocation limits for a module
   */
  async setInvocationLimits(module, limits) {
    try {
      const moduleConfig = {
        module,
        limits: {
          ...this.defaultLimits,
          ...limits
        },
        budgetAlerts: {
          ...this.defaultBudgetThresholds,
          ...limits.budgetAlerts
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.invocationCounts.set(module, {
        ...moduleConfig,
        currentCounts: {
          perMinute: 0,
          perHour: 0,
          perDay: 0,
          perMonth: 0
        },
        lastReset: {
          minute: Date.now(),
          hour: Date.now(),
          day: Date.now(),
          month: Date.now()
        }
      });
      
      await this.eventBus.publish('q.cost.limits.updated.v1', {
        module,
        limits: moduleConfig.limits,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, config: moduleConfig };
    } catch (error) {
      throw new Error(`Failed to set invocation limits: ${error.message}`);
    }
  }

  /**
   * Check if invocation is within limits
   */
  async checkInvocationLimits(module, functionName) {
    try {
      const moduleConfig = this.invocationCounts.get(module);
      if (!moduleConfig) {
        // Initialize with defaults if not configured
        await this.setInvocationLimits(module, {});
        return this.checkInvocationLimits(module, functionName);
      }
      
      // Reset counters if time periods have elapsed
      this.resetCountersIfNeeded(module);
      
      const { limits, currentCounts } = moduleConfig;
      
      // Check all time period limits
      const checks = [
        { period: 'perMinute', current: currentCounts.perMinute, limit: limits.perMinute },
        { period: 'perHour', current: currentCounts.perHour, limit: limits.perHour },
        { period: 'perDay', current: currentCounts.perDay, limit: limits.perDay },
        { period: 'perMonth', current: currentCounts.perMonth, limit: limits.perMonth }
      ];
      
      for (const check of checks) {
        if (check.current >= check.limit) {
          await this.handleLimitExceeded(module, functionName, check.period, check.current, check.limit);
          return {
            allowed: false,
            reason: `${check.period} limit exceeded`,
            current: check.current,
            limit: check.limit,
            resetTime: this.getNextResetTime(check.period)
          };
        }
      }
      
      return { allowed: true };
    } catch (error) {
      throw new Error(`Failed to check invocation limits: ${error.message}`);
    }
  }

  /**
   * Record an invocation
   */
  async recordInvocation(module, functionName, duration, memoryUsed, cost = 0) {
    try {
      const moduleConfig = this.invocationCounts.get(module);
      if (!moduleConfig) {
        await this.setInvocationLimits(module, {});
        return this.recordInvocation(module, functionName, duration, memoryUsed, cost);
      }
      
      // Increment counters
      moduleConfig.currentCounts.perMinute++;
      moduleConfig.currentCounts.perHour++;
      moduleConfig.currentCounts.perDay++;
      moduleConfig.currentCounts.perMonth++;
      
      // Record metrics
      this.observability.incrementCounter('serverless_invocations_total', {
        module,
        function: functionName,
        status: 'success'
      });
      
      // Update cost estimates
      await this.updateCostEstimates(module, cost, duration, memoryUsed);
      
      // Check budget utilization
      await this.checkBudgetUtilization(module);
      
      await this.eventBus.publish('q.cost.invocation.recorded.v1', {
        module,
        function: functionName,
        duration,
        memoryUsed,
        cost,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to record invocation: ${error.message}`);
    }
  }

  /**
   * Update cost estimates for a module
   */
  async updateCostEstimates(module, invocationCost, duration, memoryUsed) {
    try {
      const currentMetrics = this.costMetrics.get(module) || {
        totalCost: 0,
        invocationCount: 0,
        totalDuration: 0,
        totalMemoryUsed: 0,
        averageCost: 0,
        lastUpdated: new Date().toISOString()
      };
      
      currentMetrics.totalCost += invocationCost;
      currentMetrics.invocationCount++;
      currentMetrics.totalDuration += duration;
      currentMetrics.totalMemoryUsed += memoryUsed;
      currentMetrics.averageCost = currentMetrics.totalCost / currentMetrics.invocationCount;
      currentMetrics.lastUpdated = new Date().toISOString();
      
      this.costMetrics.set(module, currentMetrics);
      
      // Update Prometheus metrics
      this.observability.setGauge('serverless_cost_estimate', currentMetrics.totalCost, {
        module,
        period: 'total'
      });
      
      return currentMetrics;
    } catch (error) {
      throw new Error(`Failed to update cost estimates: ${error.message}`);
    }
  }

  /**
   * Check budget utilization and trigger alerts
   */
  async checkBudgetUtilization(module) {
    try {
      const moduleConfig = this.invocationCounts.get(module);
      const costMetrics = this.costMetrics.get(module);
      
      if (!moduleConfig || !costMetrics) return;
      
      const monthlyBudget = moduleConfig.monthlyBudget || 1000; // Default $1000
      const utilization = costMetrics.totalCost / monthlyBudget;
      
      this.observability.setGauge('serverless_budget_utilization', utilization, {
        module,
        period: 'monthly'
      });
      
      const { budgetAlerts } = moduleConfig;
      
      if (utilization >= budgetAlerts.cutoff) {
        await this.triggerBudgetCutoff(module, utilization, costMetrics.totalCost, monthlyBudget);
      } else if (utilization >= budgetAlerts.critical) {
        await this.triggerBudgetAlert(module, 'critical', utilization, costMetrics.totalCost, monthlyBudget);
      } else if (utilization >= budgetAlerts.warning) {
        await this.triggerBudgetAlert(module, 'warning', utilization, costMetrics.totalCost, monthlyBudget);
      }
      
      return { utilization, totalCost: costMetrics.totalCost, budget: monthlyBudget };
    } catch (error) {
      throw new Error(`Failed to check budget utilization: ${error.message}`);
    }
  }

  /**
   * Handle invocation limit exceeded
   */
  async handleLimitExceeded(module, functionName, period, current, limit) {
    try {
      await this.eventBus.publish('q.cost.limit.exceeded.v1', {
        module,
        function: functionName,
        period,
        current,
        limit,
        timestamp: new Date().toISOString()
      });
      
      // Trigger graceful degradation if configured
      const degradationStrategy = this.degradationStrategies.get(module);
      if (degradationStrategy) {
        await this.applyGracefulDegradation(module, degradationStrategy);
      }
    } catch (error) {
      console.error(`Failed to handle limit exceeded: ${error.message}`);
    }
  }

  /**
   * Trigger budget alert
   */
  async triggerBudgetAlert(module, severity, utilization, totalCost, budget) {
    try {
      await this.eventBus.publish('q.cost.budget.alert.v1', {
        module,
        severity,
        utilization,
        totalCost,
        budget,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Failed to trigger budget alert: ${error.message}`);
    }
  }

  /**
   * Trigger budget cutoff
   */
  async triggerBudgetCutoff(module, utilization, totalCost, budget) {
    try {
      await this.eventBus.publish('q.cost.budget.cutoff.v1', {
        module,
        utilization,
        totalCost,
        budget,
        timestamp: new Date().toISOString()
      });
      
      // Apply emergency degradation
      await this.applyGracefulDegradation(module, { strategy: 'EMERGENCY_CUTOFF' });
    } catch (error) {
      console.error(`Failed to trigger budget cutoff: ${error.message}`);
    }
  }

  /**
   * Apply graceful degradation strategies
   */
  async applyGracefulDegradation(module, strategy) {
    try {
      const degradationActions = {
        CACHE_FALLBACK: () => this.enableCacheFallback(module),
        FEATURE_TOGGLE: () => this.disableNonEssentialFeatures(module),
        QUEUE_DEFERRAL: () => this.enableQueueDeferral(module),
        EMERGENCY_CUTOFF: () => this.emergencyCutoff(module)
      };
      
      const action = degradationActions[strategy.strategy];
      if (action) {
        await action();
        
        await this.eventBus.publish('q.cost.degradation.applied.v1', {
          module,
          strategy: strategy.strategy,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Failed to apply graceful degradation: ${error.message}`);
    }
  }

  /**
   * Reset counters if time periods have elapsed
   */
  resetCountersIfNeeded(module) {
    const moduleConfig = this.invocationCounts.get(module);
    if (!moduleConfig) return;
    
    const now = Date.now();
    const { lastReset, currentCounts } = moduleConfig;
    
    // Reset minute counter
    if (now - lastReset.minute >= 60000) {
      currentCounts.perMinute = 0;
      lastReset.minute = now;
    }
    
    // Reset hour counter
    if (now - lastReset.hour >= 3600000) {
      currentCounts.perHour = 0;
      lastReset.hour = now;
    }
    
    // Reset day counter
    if (now - lastReset.day >= 86400000) {
      currentCounts.perDay = 0;
      lastReset.day = now;
    }
    
    // Reset month counter (30 days)
    if (now - lastReset.month >= 2592000000) {
      currentCounts.perMonth = 0;
      lastReset.month = now;
    }
  }

  /**
   * Get next reset time for a period
   */
  getNextResetTime(period) {
    const now = Date.now();
    const periods = {
      perMinute: 60000,
      perHour: 3600000,
      perDay: 86400000,
      perMonth: 2592000000
    };
    
    return new Date(now + periods[period]).toISOString();
  }

  /**
   * Get cost optimization recommendations
   */
  async getCostOptimizationRecommendations(module) {
    try {
      const costMetrics = this.costMetrics.get(module);
      const moduleConfig = this.invocationCounts.get(module);
      
      if (!costMetrics || !moduleConfig) {
        return { recommendations: [] };
      }
      
      const recommendations = [];
      
      // High invocation count recommendation
      if (costMetrics.invocationCount > 1000000) {
        recommendations.push({
          type: 'BATCH_PROCESSING',
          priority: 'HIGH',
          description: 'Consider implementing batch processing to reduce invocation costs',
          estimatedSavings: costMetrics.totalCost * 0.3,
          implementation: 'Aggregate multiple operations into single invocations'
        });
      }
      
      // High memory usage recommendation
      if (costMetrics.totalMemoryUsed / costMetrics.invocationCount > 512) {
        recommendations.push({
          type: 'MEMORY_OPTIMIZATION',
          priority: 'MEDIUM',
          description: 'Consider optimizing memory usage to reduce costs',
          estimatedSavings: costMetrics.totalCost * 0.15,
          implementation: 'Profile and optimize memory allocation patterns'
        });
      }
      
      // Long duration recommendation
      if (costMetrics.totalDuration / costMetrics.invocationCount > 5000) {
        recommendations.push({
          type: 'PERFORMANCE_OPTIMIZATION',
          priority: 'HIGH',
          description: 'Consider optimizing function performance to reduce execution time',
          estimatedSavings: costMetrics.totalCost * 0.25,
          implementation: 'Profile and optimize slow code paths'
        });
      }
      
      return { recommendations };
    } catch (error) {
      throw new Error(`Failed to get cost optimization recommendations: ${error.message}`);
    }
  }

  /**
   * Get cost monitoring dashboard data
   */
  async getCostDashboardData(module) {
    try {
      const costMetrics = this.costMetrics.get(module);
      const moduleConfig = this.invocationCounts.get(module);
      
      if (!costMetrics || !moduleConfig) {
        return { error: 'Module not found or not configured' };
      }
      
      const budgetUtilization = await this.checkBudgetUtilization(module);
      const recommendations = await this.getCostOptimizationRecommendations(module);
      
      return {
        module,
        costMetrics: {
          totalCost: costMetrics.totalCost,
          averageCost: costMetrics.averageCost,
          invocationCount: costMetrics.invocationCount,
          averageDuration: costMetrics.totalDuration / costMetrics.invocationCount,
          averageMemory: costMetrics.totalMemoryUsed / costMetrics.invocationCount
        },
        budgetUtilization,
        currentLimits: moduleConfig.limits,
        currentCounts: moduleConfig.currentCounts,
        recommendations: recommendations.recommendations,
        lastUpdated: costMetrics.lastUpdated
      };
    } catch (error) {
      throw new Error(`Failed to get cost dashboard data: ${error.message}`);
    }
  }

  // Graceful degradation strategy implementations
  async enableCacheFallback(module) {
    // Implementation would enable cache-based responses
    console.log(`Enabling cache fallback for module: ${module}`);
  }

  async disableNonEssentialFeatures(module) {
    // Implementation would disable non-critical features
    console.log(`Disabling non-essential features for module: ${module}`);
  }

  async enableQueueDeferral(module) {
    // Implementation would queue non-urgent operations
    console.log(`Enabling queue deferral for module: ${module}`);
  }

  async emergencyCutoff(module) {
    // Implementation would stop non-critical operations
    console.log(`Applying emergency cutoff for module: ${module}`);
  }
}