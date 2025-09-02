/**
 * Graceful Degradation Integration Service for Qflow
 * Integrates with Task 34 Graceful Degradation ladder
 */

import { EventEmitter } from 'events';
import { FlowBurnRateService } from './FlowBurnRateService.js';

export interface DegradationLadder {
  levels: DegradationLevel[];
  currentLevel: number;
  autoEscalation: boolean;
  manualOverride: boolean;
}

export interface DegradationLevel {
  level: number;
  name: string;
  description: string;
  triggers: {
    burnRate: number;
    errorRate: number;
    latency: number;
    resourceUtilization: number;
  };
  actions: {
    qflow: QflowDegradationActions;
    ecosystem: EcosystemDegradationActions;
  };
  slaImpact: {
    latencyIncrease: number;
    throughputReduction: number;
    featureDisabled: string[];
  };
}

export interface QflowDegradationActions {
  pauseFlows: {
    enabled: boolean;
    priorities: string[];
    maxCount: number;
  };
  deferSteps: {
    enabled: boolean;
    heavyStepsOnly: boolean;
    coldNodesRequired: boolean;
  };
  reduceParallelism: {
    enabled: boolean;
    reductionPercentage: number;
  };
  disableFeatures: {
    enabled: boolean;
    features: string[];
  };
}

export interface EcosystemDegradationActions {
  reduceModuleCalls: {
    enabled: boolean;
    modules: string[];
    reductionPercentage: number;
  };
  enableCaching: {
    enabled: boolean;
    aggressive: boolean;
    ttlMultiplier: number;
  };
  limitConnections: {
    enabled: boolean;
    maxConnections: number;
  };
}

export class GracefulDegradationIntegration extends EventEmitter {
  private burnRateService: FlowBurnRateService;
  private degradationLadder: DegradationLadder;
  private escalationHistory: Array<{
    timestamp: number;
    fromLevel: number;
    toLevel: number;
    trigger: string;
    automatic: boolean;
  }>;
  private config: {
    autoEscalationEnabled: boolean;
    escalationCooldown: number;
    deEscalationDelay: number;
    manualOverrideTimeout: number;
  };

  constructor(burnRateService: FlowBurnRateService, options: any = {}) {
    super();
    
    this.burnRateService = burnRateService;
    this.escalationHistory = [];
    
    this.config = {
      autoEscalationEnabled: true,
      escalationCooldown: 120000, // 2 minutes
      deEscalationDelay: 300000, // 5 minutes
      manualOverrideTimeout: 1800000, // 30 minutes
      ...options
    };

    this.initializeDegradationLadder();
    this.setupEventHandlers();
  }

  /**
   * Get current degradation status
   */
  getDegradationStatus(): {
    currentLevel: number;
    levelName: string;
    description: string;
    slaImpact: any;
    activeActions: string[];
    escalationHistory: any[];
    canEscalate: boolean;
    canDeEscalate: boolean;
  } {
    const currentLevelData = this.degradationLadder.levels[this.degradationLadder.currentLevel];
    const activeActions = this.getActiveActions(currentLevelData);
    
    return {
      currentLevel: this.degradationLadder.currentLevel,
      levelName: currentLevelData.name,
      description: currentLevelData.description,
      slaImpact: currentLevelData.slaImpact,
      activeActions,
      escalationHistory: this.escalationHistory.slice(-10), // Last 10 escalations
      canEscalate: this.canEscalate(),
      canDeEscalate: this.canDeEscalate()
    };
  }

  /**
   * Manually escalate degradation level
   */
  async manualEscalate(targetLevel: number, reason: string): Promise<void> {
    if (targetLevel <= this.degradationLadder.currentLevel) {
      throw new Error('Target level must be higher than current level');
    }

    if (targetLevel >= this.degradationLadder.levels.length) {
      throw new Error('Target level exceeds maximum degradation level');
    }

    await this.escalateToLevel(targetLevel, reason, false);
    
    // Set manual override
    this.degradationLadder.manualOverride = true;
    setTimeout(() => {
      this.degradationLadder.manualOverride = false;
      this.emit('manual_override_expired');
    }, this.config.manualOverrideTimeout);
  }

  /**
   * Manually de-escalate degradation level
   */
  async manualDeEscalate(targetLevel: number, reason: string): Promise<void> {
    if (targetLevel >= this.degradationLadder.currentLevel) {
      throw new Error('Target level must be lower than current level');
    }

    if (targetLevel < 0) {
      throw new Error('Target level cannot be negative');
    }

    await this.deEscalateToLevel(targetLevel, reason, false);
  }

  /**
   * Check if escalation should occur based on current metrics
   */
  async checkEscalationTriggers(metrics: {
    burnRate: number;
    errorRate: number;
    latency: number;
    resourceUtilization: number;
  }): Promise<void> {
    if (!this.config.autoEscalationEnabled || this.degradationLadder.manualOverride) {
      return;
    }

    // Check if we should escalate
    for (let level = this.degradationLadder.currentLevel + 1; level < this.degradationLadder.levels.length; level++) {
      const levelData = this.degradationLadder.levels[level];
      
      if (this.shouldEscalateToLevel(metrics, levelData)) {
        if (this.canEscalate()) {
          await this.escalateToLevel(level, 'automatic_trigger', true);
          return;
        }
      }
    }

    // Check if we should de-escalate
    if (this.degradationLadder.currentLevel > 0) {
      const currentLevelData = this.degradationLadder.levels[this.degradationLadder.currentLevel];
      
      if (!this.shouldEscalateToLevel(metrics, currentLevelData)) {
        // Check if we can de-escalate after delay
        const lastEscalation = this.escalationHistory[this.escalationHistory.length - 1];
        if (lastEscalation && Date.now() - lastEscalation.timestamp > this.config.deEscalationDelay) {
          await this.deEscalateToLevel(this.degradationLadder.currentLevel - 1, 'automatic_recovery', true);
        }
      }
    }
  }

  /**
   * Private methods
   */
  private initializeDegradationLadder(): void {
    this.degradationLadder = {
      levels: [
        {
          level: 0,
          name: 'Normal Operation',
          description: 'All systems operating normally',
          triggers: {
            burnRate: 0.7,
            errorRate: 0.02,
            latency: 1000,
            resourceUtilization: 0.7
          },
          actions: {
            qflow: {
              pauseFlows: { enabled: false, priorities: [], maxCount: 0 },
              deferSteps: { enabled: false, heavyStepsOnly: false, coldNodesRequired: false },
              reduceParallelism: { enabled: false, reductionPercentage: 0 },
              disableFeatures: { enabled: false, features: [] }
            },
            ecosystem: {
              reduceModuleCalls: { enabled: false, modules: [], reductionPercentage: 0 },
              enableCaching: { enabled: false, aggressive: false, ttlMultiplier: 1 },
              limitConnections: { enabled: false, maxConnections: 1000 }
            }
          },
          slaImpact: {
            latencyIncrease: 0,
            throughputReduction: 0,
            featureDisabled: []
          }
        },
        {
          level: 1,
          name: 'Performance Optimization',
          description: 'Optimize performance to maintain SLAs',
          triggers: {
            burnRate: 0.8,
            errorRate: 0.05,
            latency: 2000,
            resourceUtilization: 0.8
          },
          actions: {
            qflow: {
              pauseFlows: { enabled: false, priorities: [], maxCount: 0 },
              deferSteps: { enabled: true, heavyStepsOnly: true, coldNodesRequired: true },
              reduceParallelism: { enabled: true, reductionPercentage: 10 },
              disableFeatures: { enabled: false, features: [] }
            },
            ecosystem: {
              reduceModuleCalls: { enabled: false, modules: [], reductionPercentage: 0 },
              enableCaching: { enabled: true, aggressive: false, ttlMultiplier: 1.5 },
              limitConnections: { enabled: false, maxConnections: 1000 }
            }
          },
          slaImpact: {
            latencyIncrease: 5,
            throughputReduction: 2,
            featureDisabled: []
          }
        }
      ],
      currentLevel: 0,
      autoEscalation: true,
      manualOverride: false
    };
  }
} 
       // Add more degradation levels
        this.degradationLadder.levels.push(
          {
            level: 2,
            name: 'Cost Control',
            description: 'Reduce costs while maintaining critical functionality',
            triggers: {
              burnRate: 0.9,
              errorRate: 0.08,
              latency: 3000,
              resourceUtilization: 0.85
            },
            actions: {
              qflow: {
                pauseFlows: { enabled: true, priorities: ['low'], maxCount: 50 },
                deferSteps: { enabled: true, heavyStepsOnly: false, coldNodesRequired: true },
                reduceParallelism: { enabled: true, reductionPercentage: 25 },
                disableFeatures: { enabled: true, features: ['advanced_analytics', 'detailed_logging'] }
              },
              ecosystem: {
                reduceModuleCalls: { enabled: true, modules: ['qpic', 'qchat'], reductionPercentage: 20 },
                enableCaching: { enabled: true, aggressive: true, ttlMultiplier: 2 },
                limitConnections: { enabled: true, maxConnections: 800 }
              }
            },
            slaImpact: {
              latencyIncrease: 15,
              throughputReduction: 10,
              featureDisabled: ['advanced_analytics', 'detailed_logging']
            }
          },
          {
            level: 3,
            name: 'Emergency Throttling',
            description: 'Emergency measures to prevent system failure',
            triggers: {
              burnRate: 0.95,
              errorRate: 0.12,
              latency: 5000,
              resourceUtilization: 0.9
            },
            actions: {
              qflow: {
                pauseFlows: { enabled: true, priorities: ['low', 'medium'], maxCount: 100 },
                deferSteps: { enabled: true, heavyStepsOnly: false, coldNodesRequired: true },
                reduceParallelism: { enabled: true, reductionPercentage: 50 },
                disableFeatures: { enabled: true, features: ['advanced_analytics', 'detailed_logging', 'real_time_dashboard', 'webhook_processing'] }
              },
              ecosystem: {
                reduceModuleCalls: { enabled: true, modules: ['qpic', 'qchat', 'qmarket'], reductionPercentage: 50 },
                enableCaching: { enabled: true, aggressive: true, ttlMultiplier: 3 },
                limitConnections: { enabled: true, maxConnections: 500 }
              }
            },
            slaImpact: {
              latencyIncrease: 40,
              throughputReduction: 30,
              featureDisabled: ['advanced_analytics', 'detailed_logging', 'real_time_dashboard', 'webhook_processing']
            }
          },
          {
            level: 4,
            name: 'Critical Survival Mode',
            description: 'Minimal functionality to keep core system alive',
            triggers: {
              burnRate: 0.98,
              errorRate: 0.2,
              latency: 10000,
              resourceUtilization: 0.95
            },
            actions: {
              qflow: {
                pauseFlows: { enabled: true, priorities: ['low', 'medium', 'high'], maxCount: 200 },
                deferSteps: { enabled: true, heavyStepsOnly: false, coldNodesRequired: true },
                reduceParallelism: { enabled: true, reductionPercentage: 80 },
                disableFeatures: { enabled: true, features: ['advanced_analytics', 'detailed_logging', 'real_time_dashboard', 'webhook_processing', 'external_integrations'] }
              },
              ecosystem: {
                reduceModuleCalls: { enabled: true, modules: ['qpic', 'qchat', 'qmarket', 'qdrive'], reductionPercentage: 80 },
                enableCaching: { enabled: true, aggressive: true, ttlMultiplier: 5 },
                limitConnections: { enabled: true, maxConnections: 200 }
              }
            },
            slaImpact: {
              latencyIncrease: 100,
              throughputReduction: 70,
              featureDisabled: ['advanced_analytics', 'detailed_logging', 'real_time_dashboard', 'webhook_processing', 'external_integrations']
            }
          }
        );
      }

  private setupEventHandlers(): void {
    // Listen to burn rate service events
    this.burnRateService.on('burn_rate_calculated', (burnRateMetrics) => {
      const metrics = {
        burnRate: burnRateMetrics.overallBurnRate,
        errorRate: burnRateMetrics.performanceBurnRate.errorRateBurn,
        latency: burnRateMetrics.performanceBurnRate.latencyBurn * 1000, // Convert to ms
        resourceUtilization: Math.max(
          burnRateMetrics.resourceBurnRate.cpu,
          burnRateMetrics.resourceBurnRate.memory
        )
      };
      
      this.checkEscalationTriggers(metrics);
    });

    this.burnRateService.on('burn_rate_exceeded', (event) => {
      // Force escalation if burn rate is critically high
      if (event.burnRate > 0.95 && this.degradationLadder.currentLevel < 3) {
        this.manualEscalate(3, 'critical_burn_rate');
      }
    });
  }

  private shouldEscalateToLevel(metrics: any, levelData: DegradationLevel): boolean {
    const triggers = levelData.triggers;
    
    return (
      metrics.burnRate >= triggers.burnRate ||
      metrics.errorRate >= triggers.errorRate ||
      metrics.latency >= triggers.latency ||
      metrics.resourceUtilization >= triggers.resourceUtilization
    );
  }

  private canEscalate(): boolean {
    if (this.degradationLadder.currentLevel >= this.degradationLadder.levels.length - 1) {
      return false; // Already at maximum level
    }

    // Check cooldown
    const lastEscalation = this.escalationHistory[this.escalationHistory.length - 1];
    if (lastEscalation && Date.now() - lastEscalation.timestamp < this.config.escalationCooldown) {
      return false;
    }

    return true;
  }

  private canDeEscalate(): boolean {
    if (this.degradationLadder.currentLevel <= 0) {
      return false; // Already at minimum level
    }

    // Check if enough time has passed since last escalation
    const lastEscalation = this.escalationHistory[this.escalationHistory.length - 1];
    if (lastEscalation && Date.now() - lastEscalation.timestamp < this.config.deEscalationDelay) {
      return false;
    }

    return true;
  }

  private async escalateToLevel(targetLevel: number, reason: string, automatic: boolean): Promise<void> {
    const previousLevel = this.degradationLadder.currentLevel;
    const levelData = this.degradationLadder.levels[targetLevel];

    this.degradationLadder.currentLevel = targetLevel;

    // Record escalation
    this.escalationHistory.push({
      timestamp: Date.now(),
      fromLevel: previousLevel,
      toLevel: targetLevel,
      trigger: reason,
      automatic
    });

    this.emit('degradation_escalated', {
      previousLevel,
      newLevel: targetLevel,
      levelName: levelData.name,
      reason,
      automatic
    });

    // Execute degradation actions
    await this.executeDegradationActions(levelData);
  }

  private async deEscalateToLevel(targetLevel: number, reason: string, automatic: boolean): Promise<void> {
    const previousLevel = this.degradationLadder.currentLevel;
    const levelData = this.degradationLadder.levels[targetLevel];

    this.degradationLadder.currentLevel = targetLevel;

    // Record de-escalation
    this.escalationHistory.push({
      timestamp: Date.now(),
      fromLevel: previousLevel,
      toLevel: targetLevel,
      trigger: reason,
      automatic
    });

    this.emit('degradation_deescalated', {
      previousLevel,
      newLevel: targetLevel,
      levelName: levelData.name,
      reason,
      automatic
    });

    // Execute degradation actions for new level
    await this.executeDegradationActions(levelData);
  }

  private async executeDegradationActions(levelData: DegradationLevel): Promise<void> {
    const qflowActions = levelData.actions.qflow;
    const ecosystemActions = levelData.actions.ecosystem;

    // Execute Qflow-specific actions
    if (qflowActions.pauseFlows.enabled) {
      // Integrate with burn rate service to pause flows
      this.emit('execute_pause_flows', {
        priorities: qflowActions.pauseFlows.priorities,
        maxCount: qflowActions.pauseFlows.maxCount
      });
    }

    if (qflowActions.deferSteps.enabled) {
      this.emit('execute_defer_steps', {
        heavyStepsOnly: qflowActions.deferSteps.heavyStepsOnly,
        coldNodesRequired: qflowActions.deferSteps.coldNodesRequired
      });
    }

    if (qflowActions.reduceParallelism.enabled) {
      this.emit('execute_reduce_parallelism', {
        reductionPercentage: qflowActions.reduceParallelism.reductionPercentage
      });
    }

    if (qflowActions.disableFeatures.enabled) {
      this.emit('execute_disable_features', {
        features: qflowActions.disableFeatures.features
      });
    }

    // Execute ecosystem-wide actions
    if (ecosystemActions.reduceModuleCalls.enabled) {
      this.emit('execute_reduce_module_calls', {
        modules: ecosystemActions.reduceModuleCalls.modules,
        reductionPercentage: ecosystemActions.reduceModuleCalls.reductionPercentage
      });
    }

    if (ecosystemActions.enableCaching.enabled) {
      this.emit('execute_enable_caching', {
        aggressive: ecosystemActions.enableCaching.aggressive,
        ttlMultiplier: ecosystemActions.enableCaching.ttlMultiplier
      });
    }

    if (ecosystemActions.limitConnections.enabled) {
      this.emit('execute_limit_connections', {
        maxConnections: ecosystemActions.limitConnections.maxConnections
      });
    }

    this.emit('degradation_actions_executed', {
      level: levelData.level,
      levelName: levelData.name,
      actionsExecuted: this.getActiveActions(levelData)
    });
  }

  private getActiveActions(levelData: DegradationLevel): string[] {
    const actions: string[] = [];
    const qflowActions = levelData.actions.qflow;
    const ecosystemActions = levelData.actions.ecosystem;

    if (qflowActions.pauseFlows.enabled) actions.push('pause_flows');
    if (qflowActions.deferSteps.enabled) actions.push('defer_steps');
    if (qflowActions.reduceParallelism.enabled) actions.push('reduce_parallelism');
    if (qflowActions.disableFeatures.enabled) actions.push('disable_features');
    if (ecosystemActions.reduceModuleCalls.enabled) actions.push('reduce_module_calls');
    if (ecosystemActions.enableCaching.enabled) actions.push('enable_caching');
    if (ecosystemActions.limitConnections.enabled) actions.push('limit_connections');

    return actions;
  }

  /**
   * Get degradation ladder configuration
   */
  getDegradationLadder(): DegradationLadder {
    return { ...this.degradationLadder };
  }

  /**
   * Update degradation ladder configuration
   */
  updateDegradationLadder(ladder: Partial<DegradationLadder>): void {
    this.degradationLadder = { ...this.degradationLadder, ...ladder };
    this.emit('degradation_ladder_updated', this.degradationLadder);
  }

  /**
   * Reset to normal operation
   */
  async resetToNormal(reason: string = 'manual_reset'): Promise<void> {
    if (this.degradationLadder.currentLevel > 0) {
      await this.deEscalateToLevel(0, reason, false);
    }
  }

  /**
   * Get escalation recommendations
   */
  getEscalationRecommendations(metrics: any): {
    recommendedLevel: number;
    currentLevel: number;
    reasons: string[];
    slaImpact: any;
  } {
    let recommendedLevel = this.degradationLadder.currentLevel;
    const reasons: string[] = [];

    // Check each level to find the appropriate one
    for (let level = 0; level < this.degradationLadder.levels.length; level++) {
      const levelData = this.degradationLadder.levels[level];
      
      if (this.shouldEscalateToLevel(metrics, levelData)) {
        recommendedLevel = Math.max(recommendedLevel, level);
        
        if (metrics.burnRate >= levelData.triggers.burnRate) {
          reasons.push(`Burn rate (${(metrics.burnRate * 100).toFixed(1)}%) exceeds threshold (${(levelData.triggers.burnRate * 100).toFixed(1)}%)`);
        }
        if (metrics.errorRate >= levelData.triggers.errorRate) {
          reasons.push(`Error rate (${(metrics.errorRate * 100).toFixed(1)}%) exceeds threshold (${(levelData.triggers.errorRate * 100).toFixed(1)}%)`);
        }
        if (metrics.latency >= levelData.triggers.latency) {
          reasons.push(`Latency (${metrics.latency}ms) exceeds threshold (${levelData.triggers.latency}ms)`);
        }
        if (metrics.resourceUtilization >= levelData.triggers.resourceUtilization) {
          reasons.push(`Resource utilization (${(metrics.resourceUtilization * 100).toFixed(1)}%) exceeds threshold (${(levelData.triggers.resourceUtilization * 100).toFixed(1)}%)`);
        }
      }
    }

    const recommendedLevelData = this.degradationLadder.levels[recommendedLevel];

    return {
      recommendedLevel,
      currentLevel: this.degradationLadder.currentLevel,
      reasons,
      slaImpact: recommendedLevelData.slaImpact
    };
  }
}

export default GracefulDegradationIntegration;