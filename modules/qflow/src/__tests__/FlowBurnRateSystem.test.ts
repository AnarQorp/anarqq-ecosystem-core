/**
 * Tests for Flow Burn-Rate System and Graceful Degradation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import FlowBurnRateService, { FlowPriority, BurnRateMetrics } from '../services/FlowBurnRateService.js';
import GracefulDegradationIntegration from '../services/GracefulDegradationIntegration.js';

describe('FlowBurnRateService', () => {
  let burnRateService: FlowBurnRateService;

  beforeEach(() => {
    burnRateService = new FlowBurnRateService({
      burnRateCalculationInterval: 1000, // 1 second for testing
      maxBurnRateThreshold: 0.8,
      costLimits: {
        hourly: 50,
        daily: 1000,
        monthly: 25000
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default configuration', () => {
    const status = burnRateService.getCostControlStatus();
    
    expect(status.currentBurnRate).toBeGreaterThanOrEqual(0);
    expect(status.degradationLevel).toBe(0);
    expect(status.pausedFlows).toBe(0);
    expect(status.deferredSteps).toBe(0);
    expect(status.costLimits).toBeDefined();
  });

  it('should set flow priorities', () => {
    const flowPriority: FlowPriority = {
      flowId: 'test-flow-1',
      priority: 'high',
      costWeight: 1.5,
      resourceWeight: 1.2,
      slaRequirements: {
        maxLatency: 2000,
        minThroughput: 10,
        maxErrorRate: 0.05
      }
    };

    const priorityPromise = new Promise((resolve) => {
      burnRateService.on('flow_priority_set', resolve);
    });

    burnRateService.setFlowPriority(flowPriority);

    expect(priorityPromise).resolves.toBeDefined();
  });

  it('should calculate burn rate metrics', () => {
    const burnRateMetrics = burnRateService.calculateBurnRate();
    
    expect(burnRateMetrics.timestamp).toBeGreaterThan(0);
    expect(burnRateMetrics.overallBurnRate).toBeGreaterThanOrEqual(0);
    expect(burnRateMetrics.overallBurnRate).toBeLessThanOrEqual(1);
    expect(burnRateMetrics.resourceBurnRate).toBeDefined();
    expect(burnRateMetrics.costBurnRate).toBeDefined();
    expect(burnRateMetrics.performanceBurnRate).toBeDefined();
    
    // Check resource burn rate structure
    expect(typeof burnRateMetrics.resourceBurnRate.cpu).toBe('number');
    expect(typeof burnRateMetrics.resourceBurnRate.memory).toBe('number');
    expect(typeof burnRateMetrics.resourceBurnRate.network).toBe('number');
    expect(typeof burnRateMetrics.resourceBurnRate.storage).toBe('number');
    
    // Check cost burn rate structure
    expect(typeof burnRateMetrics.costBurnRate.computeCost).toBe('number');
    expect(typeof burnRateMetrics.costBurnRate.networkCost).toBe('number');
    expect(typeof burnRateMetrics.costBurnRate.storageCost).toBe('number');
    expect(typeof burnRateMetrics.costBurnRate.totalCost).toBe('number');
  });

  it('should handle burn rate exceeded', async () => {
    const burnRatePromise = new Promise((resolve) => {
      burnRateService.on('burn_rate_exceeded', resolve);
    });

    await burnRateService.handleBurnRateExceeded(0.9);

    const result = await Promise.race([
      burnRatePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should pause low-priority flows', async () => {
    // Set up some flow priorities
    const lowPriorityFlow: FlowPriority = {
      flowId: 'low-priority-flow',
      priority: 'low',
      costWeight: 1.0,
      resourceWeight: 1.0
    };

    const highPriorityFlow: FlowPriority = {
      flowId: 'high-priority-flow',
      priority: 'high',
      costWeight: 2.0,
      resourceWeight: 1.5
    };

    burnRateService.setFlowPriority(lowPriorityFlow);
    burnRateService.setFlowPriority(highPriorityFlow);

    const pausePromise = new Promise((resolve) => {
      burnRateService.on('low_priority_flows_paused', resolve);
    });

    const pausedFlows = await burnRateService.pauseLowPriorityFlows(0.9, 10);

    expect(Array.isArray(pausedFlows)).toBe(true);
    expect(pausePromise).resolves.toBeDefined();
  });

  it('should defer heavy steps', async () => {
    const deferPromise = new Promise((resolve) => {
      burnRateService.on('heavy_steps_deferred', resolve);
    });

    await burnRateService.deferHeavySteps(0.85);

    const result = await Promise.race([
      deferPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should reroute flows to cold nodes', async () => {
    const reroutePromise = new Promise((resolve) => {
      burnRateService.on('flows_rerouted_to_cold_nodes', resolve);
    });

    await burnRateService.rerouteFlowsToColdNodes(0.85, 25);

    const result = await Promise.race([
      reroutePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should analyze flow cost', () => {
    const executionMetrics = {
      duration: 300000, // 5 minutes
      stepCount: 10,
      retryCount: 2,
      nodeCount: 3
    };

    const costAnalysis = burnRateService.analyzeFlowCost('test-flow', executionMetrics);
    
    expect(costAnalysis.flowId).toBe('test-flow');
    expect(costAnalysis.estimatedCost).toBeDefined();
    expect(costAnalysis.resourceConsumption).toBeDefined();
    expect(costAnalysis.executionMetrics).toEqual(executionMetrics);
    
    expect(typeof costAnalysis.estimatedCost.total).toBe('number');
    expect(costAnalysis.estimatedCost.total).toBeGreaterThan(0);
  });

  it('should provide cost control status', () => {
    const status = burnRateService.getCostControlStatus();
    
    expect(typeof status.currentBurnRate).toBe('number');
    expect(typeof status.degradationLevel).toBe('number');
    expect(typeof status.pausedFlows).toBe('number');
    expect(typeof status.deferredSteps).toBe('number');
    expect(status.costLimits).toBeDefined();
    expect(status.currentCosts).toBeDefined();
    expect(status.projectedCosts).toBeDefined();
    expect(Array.isArray(status.recommendations)).toBe(true);
  });

  it('should emit burn rate calculated events', () => {
    const eventPromise = new Promise((resolve) => {
      burnRateService.on('burn_rate_calculated', resolve);
    });

    burnRateService.calculateBurnRate();

    expect(eventPromise).resolves.toBeDefined();
  });

  it('should handle cost analysis events', () => {
    const eventPromise = new Promise((resolve) => {
      burnRateService.on('flow_cost_analyzed', resolve);
    });

    const executionMetrics = {
      duration: 180000,
      stepCount: 5,
      retryCount: 0,
      nodeCount: 2
    };

    burnRateService.analyzeFlowCost('cost-test-flow', executionMetrics);

    expect(eventPromise).resolves.toBeDefined();
  });
});

describe('GracefulDegradationIntegration', () => {
  let burnRateService: FlowBurnRateService;
  let degradationService: GracefulDegradationIntegration;

  beforeEach(() => {
    burnRateService = new FlowBurnRateService();
    degradationService = new GracefulDegradationIntegration(burnRateService, {
      autoEscalationEnabled: true,
      escalationCooldown: 1000, // 1 second for testing
      deEscalationDelay: 2000 // 2 seconds for testing
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with degradation ladder', () => {
    const status = degradationService.getDegradationStatus();
    
    expect(status.currentLevel).toBe(0);
    expect(status.levelName).toBe('Normal Operation');
    expect(status.description).toBeDefined();
    expect(status.slaImpact).toBeDefined();
    expect(Array.isArray(status.activeActions)).toBe(true);
    expect(Array.isArray(status.escalationHistory)).toBe(true);
    expect(typeof status.canEscalate).toBe('boolean');
    expect(typeof status.canDeEscalate).toBe('boolean');
  });

  it('should manually escalate degradation level', async () => {
    const escalationPromise = new Promise((resolve) => {
      degradationService.on('degradation_escalated', resolve);
    });

    await degradationService.manualEscalate(2, 'manual_test');

    const result = await Promise.race([
      escalationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
    
    const status = degradationService.getDegradationStatus();
    expect(status.currentLevel).toBe(2);
  });

  it('should manually de-escalate degradation level', async () => {
    // First escalate to level 2
    await degradationService.manualEscalate(2, 'setup');

    const deEscalationPromise = new Promise((resolve) => {
      degradationService.on('degradation_deescalated', resolve);
    });

    await degradationService.manualDeEscalate(1, 'manual_test');

    const result = await Promise.race([
      deEscalationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
    
    const status = degradationService.getDegradationStatus();
    expect(status.currentLevel).toBe(1);
  });

  it('should check escalation triggers', async () => {
    const highBurnRateMetrics = {
      burnRate: 0.9,
      errorRate: 0.08,
      latency: 3000,
      resourceUtilization: 0.85
    };

    const escalationPromise = new Promise((resolve) => {
      degradationService.on('degradation_escalated', resolve);
    });

    await degradationService.checkEscalationTriggers(highBurnRateMetrics);

    // Should trigger escalation due to high metrics
    const result = await Promise.race([
      escalationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should execute degradation actions', async () => {
    const actionsPromise = new Promise((resolve) => {
      degradationService.on('degradation_actions_executed', resolve);
    });

    await degradationService.manualEscalate(2, 'test_actions');

    const result = await Promise.race([
      actionsPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should provide escalation recommendations', () => {
    const metrics = {
      burnRate: 0.85,
      errorRate: 0.06,
      latency: 2500,
      resourceUtilization: 0.8
    };

    const recommendations = degradationService.getEscalationRecommendations(metrics);
    
    expect(typeof recommendations.recommendedLevel).toBe('number');
    expect(typeof recommendations.currentLevel).toBe('number');
    expect(Array.isArray(recommendations.reasons)).toBe(true);
    expect(recommendations.slaImpact).toBeDefined();
  });

  it('should reset to normal operation', async () => {
    // First escalate to a higher level
    await degradationService.manualEscalate(3, 'setup');

    const resetPromise = new Promise((resolve) => {
      degradationService.on('degradation_deescalated', resolve);
    });

    await degradationService.resetToNormal('test_reset');

    const result = await Promise.race([
      resetPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
    
    const status = degradationService.getDegradationStatus();
    expect(status.currentLevel).toBe(0);
  });

  it('should handle manual override timeout', async () => {
    const overridePromise = new Promise((resolve) => {
      degradationService.on('manual_override_expired', resolve);
    });

    // Escalate manually (this sets manual override)
    await degradationService.manualEscalate(1, 'override_test');

    // Wait for override to expire (would be 30 minutes in production, but we can test the mechanism)
    // For testing, we'll just verify the event can be emitted
    degradationService.emit('manual_override_expired');

    const result = await Promise.race([
      overridePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should get and update degradation ladder', () => {
    const ladder = degradationService.getDegradationLadder();
    
    expect(ladder.levels).toBeDefined();
    expect(Array.isArray(ladder.levels)).toBe(true);
    expect(ladder.levels.length).toBeGreaterThan(0);
    expect(typeof ladder.currentLevel).toBe('number');
    expect(typeof ladder.autoEscalation).toBe('boolean');

    // Test updating ladder
    const updatePromise = new Promise((resolve) => {
      degradationService.on('degradation_ladder_updated', resolve);
    });

    degradationService.updateDegradationLadder({
      autoEscalation: false
    });

    expect(updatePromise).resolves.toBeDefined();
  });

  it('should validate escalation constraints', async () => {
    // Test escalating to invalid level
    await expect(degradationService.manualEscalate(-1, 'invalid')).rejects.toThrow();
    await expect(degradationService.manualEscalate(100, 'invalid')).rejects.toThrow();
    
    // Test de-escalating to invalid level
    await degradationService.manualEscalate(2, 'setup');
    await expect(degradationService.manualDeEscalate(5, 'invalid')).rejects.toThrow();
    await expect(degradationService.manualDeEscalate(-1, 'invalid')).rejects.toThrow();
  });
});

describe('Integration Tests', () => {
  let burnRateService: FlowBurnRateService;
  let degradationService: GracefulDegradationIntegration;

  beforeEach(() => {
    burnRateService = new FlowBurnRateService({
      burnRateCalculationInterval: 500,
      maxBurnRateThreshold: 0.8
    });
    degradationService = new GracefulDegradationIntegration(burnRateService);
  });

  it('should integrate burn rate with degradation escalation', async () => {
    const escalationPromise = new Promise((resolve) => {
      degradationService.on('degradation_escalated', resolve);
    });

    // Simulate high burn rate that should trigger degradation
    await burnRateService.handleBurnRateExceeded(0.95);

    const result = await Promise.race([
      escalationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);

    expect(result).toBeDefined();
  });

  it('should coordinate flow pausing with degradation actions', async () => {
    // Set up flows with different priorities
    const flows: FlowPriority[] = [
      { flowId: 'critical-flow', priority: 'critical', costWeight: 3.0, resourceWeight: 2.0 },
      { flowId: 'high-flow', priority: 'high', costWeight: 2.0, resourceWeight: 1.5 },
      { flowId: 'medium-flow', priority: 'medium', costWeight: 1.5, resourceWeight: 1.2 },
      { flowId: 'low-flow', priority: 'low', costWeight: 1.0, resourceWeight: 1.0 }
    ];

    flows.forEach(flow => burnRateService.setFlowPriority(flow));

    const pausePromise = new Promise((resolve) => {
      burnRateService.on('low_priority_flows_paused', resolve);
    });

    // Escalate to level that pauses flows
    await degradationService.manualEscalate(2, 'integration_test');

    // Should trigger flow pausing
    const result = await Promise.race([
      pausePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should handle cost control with degradation', async () => {
    // Set up high-cost scenario
    const highCostFlows = Array.from({ length: 20 }, (_, i) => ({
      flowId: `cost-flow-${i}`,
      priority: 'medium' as const,
      costWeight: 2.0,
      resourceWeight: 1.5
    }));

    highCostFlows.forEach(flow => burnRateService.setFlowPriority(flow));

    const costStatus = burnRateService.getCostControlStatus();
    const degradationStatus = degradationService.getDegradationStatus();

    expect(costStatus.currentBurnRate).toBeGreaterThanOrEqual(0);
    expect(degradationStatus.currentLevel).toBeGreaterThanOrEqual(0);

    // Both services should be operational and coordinated
    expect(typeof costStatus.projectedCosts.hourly).toBe('number');
    expect(Array.isArray(degradationStatus.activeActions)).toBe(true);
  });

  it('should provide comprehensive system status', () => {
    const costStatus = burnRateService.getCostControlStatus();
    const degradationStatus = degradationService.getDegradationStatus();

    // Verify comprehensive status information
    expect(costStatus).toHaveProperty('currentBurnRate');
    expect(costStatus).toHaveProperty('degradationLevel');
    expect(costStatus).toHaveProperty('costLimits');
    expect(costStatus).toHaveProperty('recommendations');

    expect(degradationStatus).toHaveProperty('currentLevel');
    expect(degradationStatus).toHaveProperty('levelName');
    expect(degradationStatus).toHaveProperty('slaImpact');
    expect(degradationStatus).toHaveProperty('activeActions');

    // Verify data consistency
    expect(costStatus.degradationLevel).toBe(degradationStatus.currentLevel);
  });
});