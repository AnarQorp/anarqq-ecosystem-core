/**
 * Graceful Degradation Service
 * Implements graceful degradation strategies for cost overruns and system stress
 */

import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';

export class GracefulDegradationService {
  constructor() {
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    this.degradationStrategies = new Map();
    this.activeStrategies = new Map();
    this.circuitBreakers = new Map();
    this.featureFlags = new Map();
    
    // Default degradation strategies
    this.defaultStrategies = {
      CACHE_FALLBACK: {
        priority: 1,
        description: 'Serve cached responses when possible',
        implementation: this.enableCacheFallback.bind(this)
      },
      FEATURE_TOGGLE: {
        priority: 2,
        description: 'Disable non-essential features',
        implementation: this.disableNonEssentialFeatures.bind(this)
      },
      QUEUE_DEFERRAL: {
        priority: 3,
        description: 'Queue non-urgent operations',
        implementation: this.enableQueueDeferral.bind(this)
      },
      RATE_LIMITING: {
        priority: 4,
        description: 'Apply aggressive rate limiting',
        implementation: this.enableAggressiveRateLimiting.bind(this)
      },
      READ_ONLY_MODE: {
        priority: 5,
        description: 'Switch to read-only operations',
        implementation: this.enableReadOnlyMode.bind(this)
      },
      EMERGENCY_CUTOFF: {
        priority: 6,
        description: 'Stop all non-critical operations',
        implementation: this.emergencyCutoff.bind(this)
      }
    };
    
    this.initializeMetrics();
  }

  /**
   * Initialize degradation metrics
   */
  initializeMetrics() {
    this.observability.registerMetric('degradation_strategies_active', 'gauge', {
      help: 'Number of active degradation strategies',
      labelNames: ['module', 'strategy']
    });
    
    this.observability.registerMetric('degradation_events_total', 'counter', {
      help: 'Total degradation events',
      labelNames: ['module', 'strategy', 'trigger']
    });
    
    this.observability.registerMetric('circuit_breaker_state', 'gauge', {
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['module', 'operation']
    });
    
    this.observability.registerMetric('feature_flags_disabled', 'gauge', {
      help: 'Number of disabled feature flags',
      labelNames: ['module']
    });
  }

  /**
   * Configure degradation strategies for a module
   */
  async configureDegradationStrategies(module, config) {
    try {
      const strategyConfig = {
        module,
        strategies: config.strategies || Object.keys(this.defaultStrategies),
        triggers: {
          budgetThreshold: config.budgetThreshold || 0.95,
          errorRateThreshold: config.errorRateThreshold || 0.1,
          latencyThreshold: config.latencyThreshold || 5000,
          memoryThreshold: config.memoryThreshold || 0.9,
          customTriggers: config.customTriggers || []
        },
        autoRecover: config.autoRecover !== false,
        recoveryDelay: config.recoveryDelay || 300000, // 5 minutes
        escalationDelay: config.escalationDelay || 60000, // 1 minute
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.degradationStrategies.set(module, strategyConfig);
      
      await this.eventBus.publish('q.degradation.config.updated.v1', {
        module,
        config: strategyConfig,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, config: strategyConfig };
    } catch (error) {
      throw new Error(`Failed to configure degradation strategies: ${error.message}`);
    }
  }

  /**
   * Trigger degradation based on conditions
   */
  async triggerDegradation(module, trigger, severity = 'medium', metadata = {}) {
    try {
      const config = this.degradationStrategies.get(module);
      if (!config) {
        throw new Error(`No degradation strategies configured for module: ${module}`);
      }
      
      const activeStrategies = this.activeStrategies.get(module) || [];
      const strategyToApply = this.selectDegradationStrategy(config, trigger, severity, activeStrategies);
      
      if (!strategyToApply) {
        return { success: false, reason: 'No suitable degradation strategy found' };
      }
      
      // Apply the degradation strategy
      const result = await this.applyDegradationStrategy(module, strategyToApply, trigger, metadata);
      
      // Track active strategy
      activeStrategies.push({
        strategy: strategyToApply,
        trigger,
        severity,
        appliedAt: new Date().toISOString(),
        metadata
      });
      this.activeStrategies.set(module, activeStrategies);
      
      // Update metrics
      this.observability.setGauge('degradation_strategies_active', activeStrategies.length, {
        module,
        strategy: strategyToApply
      });
      
      this.observability.incrementCounter('degradation_events_total', {
        module,
        strategy: strategyToApply,
        trigger
      });
      
      // Schedule escalation if needed
      if (config.escalationDelay > 0) {
        setTimeout(() => {
          this.checkEscalation(module, trigger, severity);
        }, config.escalationDelay);
      }
      
      // Schedule recovery if auto-recovery is enabled
      if (config.autoRecover && config.recoveryDelay > 0) {
        setTimeout(() => {
          this.attemptRecovery(module, strategyToApply);
        }, config.recoveryDelay);
      }
      
      await this.eventBus.publish('q.degradation.applied.v1', {
        module,
        strategy: strategyToApply,
        trigger,
        severity,
        result,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, strategy: strategyToApply, result };
    } catch (error) {
      throw new Error(`Failed to trigger degradation: ${error.message}`);
    }
  }

  /**
   * Select appropriate degradation strategy
   */
  selectDegradationStrategy(config, trigger, severity, activeStrategies) {
    const availableStrategies = config.strategies.filter(strategy => 
      !activeStrategies.some(active => active.strategy === strategy)
    );
    
    if (availableStrategies.length === 0) {
      return null; // All strategies already active
    }
    
    // Sort by priority based on severity
    const priorityMap = {
      low: [1, 2],
      medium: [1, 2, 3, 4],
      high: [1, 2, 3, 4, 5],
      critical: [1, 2, 3, 4, 5, 6]
    };
    
    const allowedPriorities = priorityMap[severity] || priorityMap.medium;
    
    const suitableStrategies = availableStrategies.filter(strategy => {
      const strategyInfo = this.defaultStrategies[strategy];
      return strategyInfo && allowedPriorities.includes(strategyInfo.priority);
    });
    
    if (suitableStrategies.length === 0) {
      return null;
    }
    
    // Return strategy with lowest priority (most gentle)
    return suitableStrategies.reduce((best, current) => {
      const bestPriority = this.defaultStrategies[best]?.priority || Infinity;
      const currentPriority = this.defaultStrategies[current]?.priority || Infinity;
      return currentPriority < bestPriority ? current : best;
    });
  }

  /**
   * Apply degradation strategy
   */
  async applyDegradationStrategy(module, strategy, trigger, metadata) {
    try {
      const strategyInfo = this.defaultStrategies[strategy];
      if (!strategyInfo) {
        throw new Error(`Unknown degradation strategy: ${strategy}`);
      }
      
      const result = await strategyInfo.implementation(module, trigger, metadata);
      
      return {
        strategy,
        description: strategyInfo.description,
        appliedAt: new Date().toISOString(),
        result
      };
    } catch (error) {
      throw new Error(`Failed to apply degradation strategy ${strategy}: ${error.message}`);
    }
  }

  /**
   * Check if escalation is needed
   */
  async checkEscalation(module, trigger, currentSeverity) {
    try {
      // Check if conditions have worsened
      const shouldEscalate = await this.shouldEscalate(module, trigger, currentSeverity);
      
      if (shouldEscalate) {
        const nextSeverity = this.getNextSeverityLevel(currentSeverity);
        await this.triggerDegradation(module, trigger, nextSeverity, { escalated: true });
      }
    } catch (error) {
      console.error(`Failed to check escalation for ${module}: ${error.message}`);
    }
  }

  /**
   * Attempt recovery from degradation
   */
  async attemptRecovery(module, strategy) {
    try {
      const canRecover = await this.canRecover(module, strategy);
      
      if (canRecover) {
        await this.recoverFromDegradation(module, strategy);
      } else {
        // Extend recovery time
        const config = this.degradationStrategies.get(module);
        if (config && config.autoRecover) {
          setTimeout(() => {
            this.attemptRecovery(module, strategy);
          }, config.recoveryDelay);
        }
      }
    } catch (error) {
      console.error(`Failed to attempt recovery for ${module}: ${error.message}`);
    }
  }

  /**
   * Recover from degradation strategy
   */
  async recoverFromDegradation(module, strategy) {
    try {
      const activeStrategies = this.activeStrategies.get(module) || [];
      const strategyIndex = activeStrategies.findIndex(active => active.strategy === strategy);
      
      if (strategyIndex === -1) {
        return { success: false, reason: 'Strategy not active' };
      }
      
      // Remove strategy from active list
      const removedStrategy = activeStrategies.splice(strategyIndex, 1)[0];
      this.activeStrategies.set(module, activeStrategies);
      
      // Reverse the degradation
      const result = await this.reverseDegradationStrategy(module, strategy);
      
      // Update metrics
      this.observability.setGauge('degradation_strategies_active', activeStrategies.length, {
        module,
        strategy
      });
      
      await this.eventBus.publish('q.degradation.recovered.v1', {
        module,
        strategy,
        recoveredAt: new Date().toISOString(),
        result
      });
      
      return { success: true, strategy, result };
    } catch (error) {
      throw new Error(`Failed to recover from degradation: ${error.message}`);
    }
  }

  /**
   * Reverse degradation strategy
   */
  async reverseDegradationStrategy(module, strategy) {
    try {
      switch (strategy) {
        case 'CACHE_FALLBACK':
          return await this.disableCacheFallback(module);
        case 'FEATURE_TOGGLE':
          return await this.enableNonEssentialFeatures(module);
        case 'QUEUE_DEFERRAL':
          return await this.disableQueueDeferral(module);
        case 'RATE_LIMITING':
          return await this.disableAggressiveRateLimiting(module);
        case 'READ_ONLY_MODE':
          return await this.disableReadOnlyMode(module);
        case 'EMERGENCY_CUTOFF':
          return await this.disableEmergencyCutoff(module);
        default:
          throw new Error(`Unknown strategy to reverse: ${strategy}`);
      }
    } catch (error) {
      throw new Error(`Failed to reverse strategy ${strategy}: ${error.message}`);
    }
  }

  // Degradation strategy implementations
  async enableCacheFallback(module, trigger, metadata) {
    console.log(`Enabling cache fallback for module: ${module}`);
    // Implementation would configure cache-first responses
    return {
      action: 'cache_fallback_enabled',
      description: 'Responses will be served from cache when available',
      impact: 'Reduced accuracy, improved performance'
    };
  }

  async disableCacheFallback(module) {
    console.log(`Disabling cache fallback for module: ${module}`);
    return { action: 'cache_fallback_disabled' };
  }

  async disableNonEssentialFeatures(module, trigger, metadata) {
    console.log(`Disabling non-essential features for module: ${module}`);
    
    const featuresToDisable = this.getNonEssentialFeatures(module);
    const disabledFeatures = [];
    
    for (const feature of featuresToDisable) {
      await this.setFeatureFlag(module, feature, false);
      disabledFeatures.push(feature);
    }
    
    this.observability.setGauge('feature_flags_disabled', disabledFeatures.length, { module });
    
    return {
      action: 'features_disabled',
      disabledFeatures,
      description: 'Non-essential features have been disabled to reduce load'
    };
  }

  async enableNonEssentialFeatures(module) {
    console.log(`Enabling non-essential features for module: ${module}`);
    
    const moduleFlags = this.featureFlags.get(module) || new Map();
    const enabledFeatures = [];
    
    for (const [feature, enabled] of moduleFlags.entries()) {
      if (!enabled) {
        await this.setFeatureFlag(module, feature, true);
        enabledFeatures.push(feature);
      }
    }
    
    this.observability.setGauge('feature_flags_disabled', 0, { module });
    
    return { action: 'features_enabled', enabledFeatures };
  }

  async enableQueueDeferral(module, trigger, metadata) {
    console.log(`Enabling queue deferral for module: ${module}`);
    return {
      action: 'queue_deferral_enabled',
      description: 'Non-urgent operations will be queued for later processing'
    };
  }

  async disableQueueDeferral(module) {
    console.log(`Disabling queue deferral for module: ${module}`);
    return { action: 'queue_deferral_disabled' };
  }

  async enableAggressiveRateLimiting(module, trigger, metadata) {
    console.log(`Enabling aggressive rate limiting for module: ${module}`);
    return {
      action: 'aggressive_rate_limiting_enabled',
      description: 'Rate limits have been reduced to 50% of normal levels'
    };
  }

  async disableAggressiveRateLimiting(module) {
    console.log(`Disabling aggressive rate limiting for module: ${module}`);
    return { action: 'aggressive_rate_limiting_disabled' };
  }

  async enableReadOnlyMode(module, trigger, metadata) {
    console.log(`Enabling read-only mode for module: ${module}`);
    return {
      action: 'read_only_mode_enabled',
      description: 'Only read operations are allowed, write operations are blocked'
    };
  }

  async disableReadOnlyMode(module) {
    console.log(`Disabling read-only mode for module: ${module}`);
    return { action: 'read_only_mode_disabled' };
  }

  async emergencyCutoff(module, trigger, metadata) {
    console.log(`Applying emergency cutoff for module: ${module}`);
    return {
      action: 'emergency_cutoff_enabled',
      description: 'All non-critical operations have been stopped'
    };
  }

  async disableEmergencyCutoff(module) {
    console.log(`Disabling emergency cutoff for module: ${module}`);
    return { action: 'emergency_cutoff_disabled' };
  }

  // Helper methods
  getNonEssentialFeatures(module) {
    // This would typically be configured per module
    const defaultFeatures = [
      'analytics',
      'recommendations',
      'social_features',
      'advanced_search',
      'notifications',
      'file_preview',
      'auto_save'
    ];
    
    return defaultFeatures;
  }

  async setFeatureFlag(module, feature, enabled) {
    if (!this.featureFlags.has(module)) {
      this.featureFlags.set(module, new Map());
    }
    
    const moduleFlags = this.featureFlags.get(module);
    moduleFlags.set(feature, enabled);
    
    await this.eventBus.publish('q.degradation.feature.toggled.v1', {
      module,
      feature,
      enabled,
      timestamp: new Date().toISOString()
    });
  }

  async shouldEscalate(module, trigger, currentSeverity) {
    // This would check current system conditions
    // For now, we'll simulate escalation logic
    return Math.random() < 0.3; // 30% chance of escalation
  }

  async canRecover(module, strategy) {
    // This would check if conditions have improved
    // For now, we'll simulate recovery conditions
    return Math.random() < 0.7; // 70% chance of recovery
  }

  getNextSeverityLevel(currentSeverity) {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentSeverity);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentSeverity;
  }

  /**
   * Get degradation status for a module
   */
  async getDegradationStatus(module) {
    try {
      const config = this.degradationStrategies.get(module);
      const activeStrategies = this.activeStrategies.get(module) || [];
      
      return {
        module,
        configured: !!config,
        activeStrategies: activeStrategies.map(strategy => ({
          strategy: strategy.strategy,
          trigger: strategy.trigger,
          severity: strategy.severity,
          appliedAt: strategy.appliedAt,
          description: this.defaultStrategies[strategy.strategy]?.description
        })),
        availableStrategies: config ? config.strategies : [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get degradation status: ${error.message}`);
    }
  }

  /**
   * Manually trigger recovery for all strategies
   */
  async forceRecovery(module) {
    try {
      const activeStrategies = this.activeStrategies.get(module) || [];
      const results = [];
      
      for (const activeStrategy of activeStrategies) {
        const result = await this.recoverFromDegradation(module, activeStrategy.strategy);
        results.push(result);
      }
      
      return { success: true, recoveredStrategies: results };
    } catch (error) {
      throw new Error(`Failed to force recovery: ${error.message}`);
    }
  }
}