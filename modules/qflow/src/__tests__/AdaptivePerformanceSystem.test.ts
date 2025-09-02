/**
 * Tests for Adaptive Performance System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import AutoScalingEngine from '../core/AutoScalingEngine.js';
import ProactiveOptimizer from '../core/ProactiveOptimizer.js';
import AdaptiveResponseCoordinator from '../core/AdaptiveResponseCoordinator.js';
import { PerformanceIntegrationService } from '../services/PerformanceIntegrationService.js';

// Mock performance service
class MockPerformanceService extends EventEmitter {
  getPerformanceStatus() {
    return {
      overall: 'healthy',
      metrics: {
        executionLatency: 1000,
        validationLatency: 200,
        stepLatency: 500,
        throughput: 25,
        errorRate: 0.02,
        resourceUtilization: {
          cpu: 0.6,
          memory: 0.4,
          network: 0.3
        }
      },
      gates: [],
      slo: { overall: 'healthy' },
      recommendations: []
    };
  }

  startMonitoring() {
    this.emit('monitoring_started');
  }

  stopMonitoring() {
    this.emit('monitoring_stopped');
  }

  async triggerAdaptiveResponse(trigger: string, context: any) {
    this.emit('adaptive_response_triggered', { trigger, context });
  }

  getEcosystemCorrelation() {
    return {
      qflowHealth: 'healthy',
      ecosystemHealth: 'healthy',
      correlations: []
    };
  }
}

describe('AutoScalingEngine', () => {
  let scalingEngine: AutoScalingEngine;

  beforeEach(() => {
    scalingEngine = new AutoScalingEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default scaling triggers', () => {
    const status = scalingEngine.getScalingStatus();
    
    expect(status.triggers.length).toBeGreaterThan(0);
    expect(status.triggers.some(t => t.name.includes('CPU'))).toBe(true);
    expect(status.triggers.some(t => t.name.includes('Latency'))).toBe(true);
  });

  it('should add custom scaling trigger', () => {
    const customTrigger = {
      id: 'custom_trigger',
      name: 'Custom Trigger',
      metric: 'custom_metric',
      threshold: 100,
      operator: 'gt' as const,
      action: 'scale_up' as const,
      cooldownPeriod: 60000,
      minNodes: 1,
      maxNodes: 10,
      scalingFactor: 1.5,
      enabled: true
    };

    scalingEngine.addScalingTrigger(customTrigger);
    
    const status = scalingEngine.getScalingStatus();
    expect(status.triggers.some(t => t.id === 'custom_trigger')).toBe(true);
  });

  it('should trigger scaling when metrics exceed thresholds', async () => {
    const scalingPromise = new Promise((resolve) => {
      scalingEngine.on('scaling_action_triggered', resolve);
    });

    // Update metrics to trigger scaling
    scalingEngine.updateMetrics({
      resourceUtilization: { cpu: 0.9 }, // Above 0.8 threshold
      executionLatency: 4000, // Above 3000ms threshold
      errorRate: 0.1 // Above 0.05 threshold
    });

    // Trigger evaluation
    await scalingEngine.triggerScalingEvaluation();

    // Should trigger at least one scaling action
    const result = await Promise.race([
      scalingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should respect cooldown periods', async () => {
    const events: any[] = [];
    scalingEngine.on('scaling_action_triggered', (event) => events.push(event));

    // Trigger scaling twice quickly
    scalingEngine.updateMetrics({ resourceUtilization: { cpu: 0.9 } });
    await scalingEngine.triggerScalingEvaluation();
    await scalingEngine.triggerScalingEvaluation();

    // Should only trigger once due to cooldown
    expect(events.length).toBeLessThanOrEqual(1);
  });

  it('should handle load redirection policies', () => {
    const redirectionRule = {
      id: 'test_redirect',
      name: 'Test Redirection',
      condition: 'error_rate > 0.05',
      targetNodePool: 'backup_nodes',
      redirectionPercentage: 50,
      priority: 100,
      enabled: true,
      maxDuration: 300000
    };

    scalingEngine.addRedirectionRule(redirectionRule);
    
    const status = scalingEngine.getScalingStatus();
    expect(status.redirections).toBeDefined();
  });
});

describe('ProactiveOptimizer', () => {
  let optimizer: ProactiveOptimizer;

  beforeEach(() => {
    optimizer = new ProactiveOptimizer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default optimization rules', () => {
    const status = optimizer.getOptimizationStatus();
    
    expect(status.rules.length).toBeGreaterThan(0);
    expect(status.rules.some(r => r.type === 'cache')).toBe(true);
    expect(status.rules.some(r => r.type === 'validation')).toBe(true);
    expect(status.rules.some(r => r.type === 'connection_pool')).toBe(true);
  });

  it('should add custom optimization rule', () => {
    const customRule = {
      id: 'custom_optimization',
      name: 'Custom Optimization',
      type: 'cache' as const,
      trigger: 'custom_metric < 0.5',
      action: 'custom_action',
      parameters: { factor: 2.0 },
      priority: 100,
      enabled: true,
      cooldownPeriod: 60000
    };

    optimizer.addOptimizationRule(customRule);
    
    const status = optimizer.getOptimizationStatus();
    expect(status.rules.some(r => r.id === 'custom_optimization')).toBe(true);
  });

  it('should trigger optimizations based on metrics', async () => {
    const optimizationPromise = new Promise((resolve) => {
      optimizer.on('optimization_started', resolve);
    });

    // Update metrics to trigger optimization
    optimizer.updateMetrics({
      validationLatency: 1500, // Above 1000ms threshold
      resourceUtilization: { cpu: 0.8, memory: 0.4 }
    });

    // Trigger evaluation
    await optimizer.triggerOptimizationEvaluation();

    const result = await Promise.race([
      optimizationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should execute specific optimization by ID', async () => {
    const optimizationPromise = new Promise((resolve) => {
      optimizer.on('optimization_completed', resolve);
    });

    await optimizer.executeOptimization('validation_cache_expansion', true);

    const result = await Promise.race([
      optimizationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should track optimization effectiveness', () => {
    const status = optimizer.getOptimizationStatus();
    
    expect(status.cacheStates).toBeDefined();
    expect(status.connectionPools).toBeDefined();
    expect(typeof status.recentEffectiveness).toBe('number');
  });
});

describe('AdaptiveResponseCoordinator', () => {
  let coordinator: AdaptiveResponseCoordinator;
  let mockPerformanceService: MockPerformanceService;

  beforeEach(() => {
    mockPerformanceService = new MockPerformanceService();
    coordinator = new AdaptiveResponseCoordinator(
      mockPerformanceService as any,
      {
        scalingEnabled: true,
        optimizationEnabled: true,
        maxConcurrentActions: 3,
        coordinationInterval: 1000
      }
    );
  });

  afterEach(() => {
    coordinator.stop();
    vi.clearAllMocks();
  });

  it('should start and stop coordination', () => {
    const startPromise = new Promise((resolve) => {
      coordinator.on('adaptive_response_coordinator_started', resolve);
    });

    const stopPromise = new Promise((resolve) => {
      coordinator.on('adaptive_response_coordinator_stopped', resolve);
    });

    coordinator.start();
    expect(startPromise).resolves.toBeDefined();

    coordinator.stop();
    expect(stopPromise).resolves.toBeDefined();
  });

  it('should update system metrics', () => {
    const metricsPromise = new Promise((resolve) => {
      coordinator.on('system_metrics_updated', resolve);
    });

    const testMetrics = {
      executionLatency: 2000,
      errorRate: 0.03,
      resourceUtilization: { cpu: 0.7, memory: 0.5 }
    };

    coordinator.updateMetrics(testMetrics);

    expect(metricsPromise).resolves.toBeDefined();
  });

  it('should detect emergency conditions', async () => {
    const emergencyPromise = new Promise((resolve) => {
      coordinator.on('emergency_response_triggered', resolve);
    });

    // Update with critical metrics
    coordinator.updateMetrics({
      executionLatency: 15000, // Above 10s emergency threshold
      errorRate: 0.25, // Above 20% emergency threshold
      resourceUtilization: { cpu: 0.98, memory: 0.95 }
    });

    const result = await Promise.race([
      emergencyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should provide comprehensive system status', () => {
    const status = coordinator.getSystemStatus();
    
    expect(status.overall).toBeDefined();
    expect(status.performance).toBeDefined();
    expect(status.scaling).toBeDefined();
    expect(status.optimization).toBeDefined();
    expect(Array.isArray(status.activeActions)).toBe(true);
    expect(typeof status.emergencyMode).toBe('boolean');
    expect(Array.isArray(status.recommendations)).toBe(true);
  });

  it('should force adaptive actions', async () => {
    const actionPromise = new Promise((resolve) => {
      coordinator.on('forced_adaptive_action_completed', resolve);
    });

    await coordinator.forceAdaptiveAction('optimization', { force: true });

    const result = await Promise.race([
      actionPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should limit concurrent actions', async () => {
    // Force multiple actions to test concurrency limit
    const actions = [
      coordinator.forceAdaptiveAction('scaling', {}),
      coordinator.forceAdaptiveAction('optimization', {}),
      coordinator.forceAdaptiveAction('scaling', {}),
      coordinator.forceAdaptiveAction('optimization', {})
    ];

    await Promise.allSettled(actions);

    const status = coordinator.getSystemStatus();
    expect(status.activeActions.length).toBeLessThanOrEqual(3); // maxConcurrentActions
  });

  it('should generate appropriate recommendations', () => {
    // Set up a scenario that should generate recommendations
    coordinator.updateMetrics({
      executionLatency: 8000, // High but not emergency
      errorRate: 0.08, // Elevated error rate
      resourceUtilization: { cpu: 0.85, memory: 0.8 }
    });

    const status = coordinator.getSystemStatus();
    expect(status.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  let performanceService: MockPerformanceService;
  let coordinator: AdaptiveResponseCoordinator;

  beforeEach(() => {
    performanceService = new MockPerformanceService();
    coordinator = new AdaptiveResponseCoordinator(performanceService as any);
  });

  afterEach(() => {
    coordinator.stop();
  });

  it('should handle performance gate failures', async () => {
    const responsePromise = new Promise((resolve) => {
      coordinator.on('performance_gate_failure_handled', resolve);
    });

    // Simulate performance gate failure
    performanceService.emit('performance_gates_failed', {
      failedGates: [{ name: 'latency_gate', threshold: 1000, value: 2000 }]
    });

    const result = await Promise.race([
      responsePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should handle SLO violations', async () => {
    const responsePromise = new Promise((resolve) => {
      coordinator.on('slo_violation_handled', resolve);
    });

    // Simulate SLO violation
    performanceService.emit('slo_violation', {
      type: 'latency',
      value: 3000,
      threshold: 2000
    });

    const result = await Promise.race([
      responsePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ]);

    expect(result).toBeDefined();
  });

  it('should coordinate responses during performance degradation', async () => {
    coordinator.start();

    const coordinationPromise = new Promise((resolve) => {
      coordinator.on('adaptive_responses_coordinated', resolve);
    });

    // Simulate performance degradation
    coordinator.updateMetrics({
      executionLatency: 4000, // Warning level
      errorRate: 0.08,
      resourceUtilization: { cpu: 0.85, memory: 0.7 }
    });

    const result = await Promise.race([
      coordinationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);

    expect(result).toBeDefined();
  });

  it('should maintain system stability during high load', async () => {
    coordinator.start();

    // Simulate sustained high load
    for (let i = 0; i < 5; i++) {
      coordinator.updateMetrics({
        executionLatency: 3000 + (i * 200),
        errorRate: 0.05 + (i * 0.01),
        resourceUtilization: { cpu: 0.7 + (i * 0.05), memory: 0.6 + (i * 0.04) }
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalStatus = coordinator.getSystemStatus();
    
    // System should still be responsive
    expect(finalStatus.overall).not.toBe('emergency');
    expect(finalStatus.activeActions.length).toBeLessThanOrEqual(3);
  });
});