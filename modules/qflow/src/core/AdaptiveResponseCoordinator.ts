/**
 * Adaptive Response Coordinator for Qflow
 * Coordinates automatic scaling, load redirection, and proactive optimization
 */

import { EventEmitter } from 'events';
import AutoScalingEngine from './AutoScalingEngine.js';
import ProactiveOptimizer from './ProactiveOptimizer.js';
import { PerformanceIntegrationService } from '../services/PerformanceIntegrationService.js';

export interface AdaptiveResponseConfig {
  scalingEnabled: boolean;
  optimizationEnabled: boolean;
  maxConcurrentActions: number;
  coordinationInterval: number;
  emergencyThresholds: {
    criticalLatency: number;
    criticalErrorRate: number;
    criticalCpuUsage: number;
    criticalMemoryUsage: number;
  };
}

export interface SystemState {
  performance: any;
  scaling: any;
  optimization: any;
  emergencyMode: boolean;
  lastUpdate: number;
}

export class AdaptiveResponseCoordinator extends EventEmitter {
  private scalingEngine: AutoScalingEngine;
  private optimizer: ProactiveOptimizer;
  private performanceService: PerformanceIntegrationService;
  private config: AdaptiveResponseConfig;
  private systemState: SystemState;
  private coordinationInterval: NodeJS.Timeout | null = null;
  private activeActions: Map<string, { type: string; timestamp: number; priority: number }>;

  constructor(
    performanceService: PerformanceIntegrationService,
    options: Partial<AdaptiveResponseConfig> = {}
  ) {
    super();
    
    this.performanceService = performanceService;
    this.config = {
      scalingEnabled: true,
      optimizationEnabled: true,
      maxConcurrentActions: 5,
      coordinationInterval: 30000, // 30 seconds
      emergencyThresholds: {
        criticalLatency: 10000, // 10 seconds
        criticalErrorRate: 0.2, // 20%
        criticalCpuUsage: 0.95, // 95%
        criticalMemoryUsage: 0.9 // 90%
      },
      ...options
    };

    this.scalingEngine = new AutoScalingEngine();
    this.optimizer = new ProactiveOptimizer();
    this.activeActions = new Map();
    
    this.systemState = {
      performance: {},
      scaling: {},
      optimization: {},
      emergencyMode: false,
      lastUpdate: Date.now()
    };

    this.setupEventHandlers();
  }

  /**
   * Start adaptive response coordination
   */
  start(): void {
    this.coordinationInterval = setInterval(() => {
      this.coordinateAdaptiveResponses();
    }, this.config.coordinationInterval);

    this.emit('adaptive_response_coordinator_started', {
      scalingEnabled: this.config.scalingEnabled,
      optimizationEnabled: this.config.optimizationEnabled
    });
  }

  /**
   * Stop adaptive response coordination
   */
  stop(): void {
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }

    this.emit('adaptive_response_coordinator_stopped');
  }

  /**
   * Update system metrics for all components
   */
  updateMetrics(metrics: any): void {
    // Update all components with latest metrics
    this.scalingEngine.updateMetrics(metrics);
    this.optimizer.updateMetrics(metrics);
    
    // Update system state
    this.systemState.performance = this.performanceService.getPerformanceStatus();
    this.systemState.scaling = this.scalingEngine.getScalingStatus();
    this.systemState.optimization = this.optimizer.getOptimizationStatus();
    this.systemState.lastUpdate = Date.now();

    // Check for emergency conditions
    this.checkEmergencyConditions(metrics);

    this.emit('system_metrics_updated', {
      metrics,
      systemState: this.systemState
    });
  }

  /**
   * Trigger emergency response
   */
  async triggerEmergencyResponse(reason: string, context: any): Promise<void> {
    this.systemState.emergencyMode = true;
    
    this.emit('emergency_response_triggered', {
      reason,
      context,
      timestamp: Date.now()
    });

    // Execute emergency actions in priority order
    await this.executeEmergencyActions(reason, context);
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    overall: 'healthy' | 'warning' | 'critical' | 'emergency';
    performance: any;
    scaling: any;
    optimization: any;
    activeActions: Array<{
      id: string;
      type: string;
      timestamp: number;
      priority: number;
    }>;
    emergencyMode: boolean;
    recommendations: string[];
  } {
    const activeActionsArray = Array.from(this.activeActions.entries()).map(([id, action]) => ({
      id,
      type: action.type,
      timestamp: action.timestamp,
      priority: action.priority
    }));

    // Determine overall system status
    let overall: 'healthy' | 'warning' | 'critical' | 'emergency' = 'healthy';
    
    if (this.systemState.emergencyMode) {
      overall = 'emergency';
    } else if (this.systemState.performance.overall === 'critical') {
      overall = 'critical';
    } else if (this.systemState.performance.overall === 'warning') {
      overall = 'warning';
    }

    const recommendations = this.generateSystemRecommendations();

    return {
      overall,
      performance: this.systemState.performance,
      scaling: this.systemState.scaling,
      optimization: this.systemState.optimization,
      activeActions: activeActionsArray,
      emergencyMode: this.systemState.emergencyMode,
      recommendations
    };
  }

  /**
   * Force specific adaptive action
   */
  async forceAdaptiveAction(actionType: string, parameters: any): Promise<void> {
    const actionId = `forced_${actionType}_${Date.now()}`;
    
    this.activeActions.set(actionId, {
      type: actionType,
      timestamp: Date.now(),
      priority: 1000 // Highest priority for forced actions
    });

    this.emit('forced_adaptive_action', {
      actionId,
      actionType,
      parameters
    });

    try {
      switch (actionType) {
        case 'scaling':
          await this.scalingEngine.triggerScalingEvaluation();
          break;
        case 'optimization':
          await this.optimizer.triggerOptimizationEvaluation();
          break;
        case 'emergency':
          await this.triggerEmergencyResponse('forced_emergency', parameters);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      this.emit('forced_adaptive_action_completed', {
        actionId,
        actionType,
        success: true
      });
    } catch (error) {
      this.emit('forced_adaptive_action_failed', {
        actionId,
        actionType,
        error: error.message
      });
    } finally {
      this.activeActions.delete(actionId);
    }
  }

  /**
   * Private methods
   */
  private setupEventHandlers(): void {
    // Performance service events
    this.performanceService.on('performance_gates_failed', async (event) => {
      await this.handlePerformanceGateFailure(event);
    });

    this.performanceService.on('performance_anomaly', async (anomaly) => {
      if (anomaly.severity === 'critical') {
        await this.triggerEmergencyResponse('performance_anomaly', { anomaly });
      }
    });

    this.performanceService.on('slo_violation', async (violation) => {
      await this.handleSLOViolation(violation);
    });

    // Scaling engine events
    this.scalingEngine.on('scaling_action_triggered', (event) => {
      this.recordAction('scaling', event.trigger.id, 100);
    });

    this.scalingEngine.on('load_redirection_started', (event) => {
      this.recordAction('load_redirection', event.policy.id, 150);
    });

    this.scalingEngine.on('flows_paused', (event) => {
      this.recordAction('flow_pausing', event.policy.id, 200);
    });

    // Optimizer events
    this.optimizer.on('optimization_started', (event) => {
      this.recordAction('optimization', event.rule.id, event.rule.priority);
    });

    // Coordination events
    this.on('emergency_response_triggered', () => {
      this.recordAction('emergency_response', 'emergency', 1000);
    });
  }

  private async coordinateAdaptiveResponses(): Promise<void> {
    // Limit concurrent actions
    if (this.activeActions.size >= this.config.maxConcurrentActions) {
      this.emit('max_concurrent_actions_reached', {
        activeActions: this.activeActions.size,
        maxActions: this.config.maxConcurrentActions
      });
      return;
    }

    // Get current system status
    const systemStatus = this.getSystemStatus();
    
    // Coordinate responses based on system state
    if (systemStatus.emergencyMode) {
      // In emergency mode, prioritize critical actions only
      await this.coordinateEmergencyActions();
    } else if (systemStatus.overall === 'critical') {
      // Critical state - prioritize scaling and immediate optimizations
      await this.coordinateCriticalActions();
    } else if (systemStatus.overall === 'warning') {
      // Warning state - apply proactive optimizations
      await this.coordinateProactiveActions();
    } else {
      // Healthy state - perform maintenance optimizations
      await this.coordinateMaintenanceActions();
    }

    this.emit('adaptive_responses_coordinated', {
      systemStatus: systemStatus.overall,
      activeActions: this.activeActions.size,
      timestamp: Date.now()
    });
  }

  private async coordinateEmergencyActions(): Promise<void> {
    // Only allow critical scaling and emergency optimizations
    if (this.config.scalingEnabled) {
      await this.scalingEngine.triggerScalingEvaluation();
    }

    // Force critical optimizations
    const criticalOptimizations = ['validation_cache_expansion', 'connection_pool_expansion'];
    for (const optimizationId of criticalOptimizations) {
      try {
        await this.optimizer.executeOptimization(optimizationId, true);
      } catch (error) {
        // Continue with other optimizations even if one fails
      }
    }
  }

  private async coordinateCriticalActions(): Promise<void> {
    // Prioritize scaling actions
    if (this.config.scalingEnabled) {
      await this.scalingEngine.triggerScalingEvaluation();
    }

    // Apply high-priority optimizations
    if (this.config.optimizationEnabled) {
      await this.optimizer.triggerOptimizationEvaluation();
    }
  }

  private async coordinateProactiveActions(): Promise<void> {
    // Balance between scaling and optimization
    const shouldScale = Math.random() > 0.5; // Simple coordination logic
    
    if (shouldScale && this.config.scalingEnabled) {
      await this.scalingEngine.triggerScalingEvaluation();
    } else if (this.config.optimizationEnabled) {
      await this.optimizer.triggerOptimizationEvaluation();
    }
  }

  private async coordinateMaintenanceActions(): Promise<void> {
    // Focus on optimizations during healthy periods
    if (this.config.optimizationEnabled) {
      await this.optimizer.triggerOptimizationEvaluation();
    }
  }

  private checkEmergencyConditions(metrics: any): void {
    const { emergencyThresholds } = this.config;
    let emergencyDetected = false;
    let emergencyReason = '';

    if (metrics.executionLatency > emergencyThresholds.criticalLatency) {
      emergencyDetected = true;
      emergencyReason = 'critical_latency';
    } else if (metrics.errorRate > emergencyThresholds.criticalErrorRate) {
      emergencyDetected = true;
      emergencyReason = 'critical_error_rate';
    } else if (metrics.resourceUtilization?.cpu > emergencyThresholds.criticalCpuUsage) {
      emergencyDetected = true;
      emergencyReason = 'critical_cpu_usage';
    } else if (metrics.resourceUtilization?.memory > emergencyThresholds.criticalMemoryUsage) {
      emergencyDetected = true;
      emergencyReason = 'critical_memory_usage';
    }

    if (emergencyDetected && !this.systemState.emergencyMode) {
      this.triggerEmergencyResponse(emergencyReason, { metrics });
    } else if (!emergencyDetected && this.systemState.emergencyMode) {
      this.exitEmergencyMode();
    }
  }

  private async executeEmergencyActions(reason: string, context: any): Promise<void> {
    const emergencyActions = [
      { action: 'pause_low_priority_flows', priority: 1000 },
      { action: 'redirect_to_backup_nodes', priority: 900 },
      { action: 'emergency_scaling', priority: 800 },
      { action: 'critical_optimizations', priority: 700 }
    ];

    for (const { action, priority } of emergencyActions) {
      try {
        await this.executeEmergencyAction(action, context, priority);
      } catch (error) {
        this.emit('emergency_action_failed', {
          action,
          reason,
          error: error.message
        });
      }
    }
  }

  private async executeEmergencyAction(action: string, context: any, priority: number): Promise<void> {
    const actionId = `emergency_${action}_${Date.now()}`;
    
    this.activeActions.set(actionId, {
      type: action,
      timestamp: Date.now(),
      priority
    });

    this.emit('emergency_action_started', {
      actionId,
      action,
      context
    });

    // Simulate emergency action execution
    await new Promise(resolve => setTimeout(resolve, 100));

    this.emit('emergency_action_completed', {
      actionId,
      action,
      success: true
    });

    this.activeActions.delete(actionId);
  }

  private exitEmergencyMode(): void {
    this.systemState.emergencyMode = false;
    this.emit('emergency_mode_exited', {
      timestamp: Date.now(),
      duration: Date.now() - this.systemState.lastUpdate
    });
  }

  private async handlePerformanceGateFailure(event: any): Promise<void> {
    this.emit('performance_gate_failure_handled', event);
    
    // Trigger appropriate adaptive responses
    if (this.config.scalingEnabled) {
      await this.scalingEngine.triggerScalingEvaluation();
    }
  }

  private async handleSLOViolation(violation: any): Promise<void> {
    this.emit('slo_violation_handled', violation);
    
    // Trigger immediate optimization for SLO violations
    if (this.config.optimizationEnabled) {
      await this.optimizer.triggerOptimizationEvaluation();
    }
  }

  private recordAction(type: string, id: string, priority: number): void {
    const actionId = `${type}_${id}_${Date.now()}`;
    
    this.activeActions.set(actionId, {
      type,
      timestamp: Date.now(),
      priority
    });

    // Auto-remove after 5 minutes
    setTimeout(() => {
      this.activeActions.delete(actionId);
    }, 300000);
  }

  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const systemStatus = this.getSystemStatus();

    if (systemStatus.emergencyMode) {
      recommendations.push('System is in emergency mode - monitor critical metrics closely');
      recommendations.push('Consider manual intervention if automated responses are insufficient');
    }

    if (systemStatus.activeActions.length > 3) {
      recommendations.push('High number of active adaptive actions - monitor for conflicts');
    }

    if (systemStatus.performance.overall === 'critical') {
      recommendations.push('Critical performance issues detected - review recent changes');
      recommendations.push('Consider increasing resource allocation or scaling limits');
    }

    if (systemStatus.scaling.nodeCount < 2) {
      recommendations.push('Low node count detected - ensure minimum redundancy');
    }

    if (systemStatus.optimization.recentEffectiveness < 0.5) {
      recommendations.push('Low optimization effectiveness - review optimization rules');
    }

    return recommendations;
  }
}

export default AdaptiveResponseCoordinator;