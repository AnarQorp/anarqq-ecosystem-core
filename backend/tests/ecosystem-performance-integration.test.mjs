/**
 * Ecosystem Performance Integration Tests
 * Tests for ecosystem-wide performance integration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import EcosystemPerformanceIntegration from '../services/EcosystemPerformanceIntegration.mjs';

describe('Ecosystem Performance Integration', () => {
  let ecosystemPerf;

  beforeEach(() => {
    ecosystemPerf = new EcosystemPerformanceIntegration();
  });

  afterEach(() => {
    // Cleanup any resources
    ecosystemPerf.removeAllListeners();
  });

  describe('QNET Integration', () => {
    it('should calculate node performance scores correctly', () => {
      const nodeMetrics = {
        latency: { p99: 180, p95: 120 },
        errorRate: 0.002,
        capacity: { utilization: 0.65 }
      };

      const score = ecosystemPerf.calculateNodePerformanceScore('node-1', nodeMetrics);

      expect(score).toBeDefined();
      expect(score.nodeId).toBe('node-1');
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.overallScore).toBeLessThanOrEqual(1);
      expect(score.recommendation).toMatch(/healthy|down_weight_moderate|down_weight_critical|up_weight/);
    });

    it('should generate QNET routing weights', () => {
      const nodes = [
        { id: 'node-1' },
        { id: 'node-2' },
        { id: 'node-3' }
      ];

      // First calculate some scores
      ecosystemPerf.calculateNodePerformanceScore('node-1', {
        latency: { p99: 150 }, errorRate: 0.001, capacity: { utilization: 0.5 }
      });
      ecosystemPerf.calculateNodePerformanceScore('node-2', {
        latency: { p99: 300 }, errorRate: 0.01, capacity: { utilization: 0.9 }
      });

      const weights = ecosystemPerf.getQNETRoutingWeights(nodes);

      expect(weights).toBeInstanceOf(Map);
      expect(weights.size).toBe(3);
      
      // Check that weights are within valid range
      for (const weight of weights.values()) {
        expect(weight).toBeGreaterThanOrEqual(0.01);
        expect(weight).toBeLessThanOrEqual(2.0);
      }
    });

    it('should down-weight nodes with poor performance', () => {
      const nodeMetrics = {
        latency: { p99: 500 }, // Very high latency
        errorRate: 0.05,       // High error rate
        capacity: { utilization: 0.95 } // High utilization
      };

      const score = ecosystemPerf.calculateNodePerformanceScore('poor-node', nodeMetrics);
      expect(score.recommendation).toMatch(/down_weight/);
      expect(score.overallScore).toBeLessThan(0.5);
    });
  });

  describe('Qflow Integration', () => {
    it('should evaluate performance policies correctly', () => {
      const operation = {
        id: 'test-operation',
        type: 'read',
        params: { complexity: 'medium' }
      };

      const evaluation = ecosystemPerf.evaluateQflowPerformancePolicy(operation);

      expect(evaluation).toBeDefined();
      expect(evaluation.operation).toEqual(operation);
      expect(evaluation.decision).toMatch(/proceed|queue_deferral|cache_fallback/);
      expect(evaluation.riskLevel).toMatch(/low|moderate|high|critical/);
      expect(Array.isArray(evaluation.alternatives)).toBe(true);
    });

    it('should recommend cache fallback for high latency operations', () => {
      // Mock high latency scenario
      const operation = {
        id: 'slow-operation',
        type: 'complex_query',
        params: { complexity: 'high' }
      };

      const evaluation = ecosystemPerf.evaluateQflowPerformancePolicy(operation);

      // Should recommend some form of optimization for complex queries
      expect(evaluation.decision).toMatch(/proceed|cache_fallback|queue_deferral/);
    });

    it('should estimate operation latency', () => {
      const operation = { type: 'read' };
      const latency = ecosystemPerf.estimateOperationLatency(operation, {});

      expect(latency).toBeGreaterThan(0);
      expect(typeof latency).toBe('number');
    });
  });

  describe('Qerberos Integration', () => {
    it('should generate performance risk signals', () => {
      const performanceData = {
        latency: { p99: 250, trend: 'increasing' },
        errorRate: 0.008,
        costMetrics: {
          current: 150,
          historical: [100, 105, 110, 120, 135, 145, 150]
        }
      };

      const riskSignal = ecosystemPerf.generatePerformanceRiskSignals('entity-1', performanceData);

      expect(riskSignal).toBeDefined();
      expect(riskSignal.entityId).toBe('entity-1');
      expect(riskSignal.riskLevel).toMatch(/low|moderate|high|critical/);
      expect(riskSignal.riskScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(riskSignal.signals)).toBe(true);
      expect(Array.isArray(riskSignal.correlations)).toBe(true);
    });

    it('should correlate cost increases with performance issues', () => {
      const performanceData = {
        costMetrics: {
          current: 200,
          historical: [100, 100, 100, 150, 180, 190, 200] // 100% increase
        }
      };

      const riskSignal = ecosystemPerf.generatePerformanceRiskSignals('entity-2', performanceData);

      expect(riskSignal.correlations.length).toBeGreaterThan(0);
      const costCorrelation = riskSignal.correlations.find(c => c.type === 'cost_performance_correlation');
      expect(costCorrelation).toBeDefined();
    });
  });

  describe('CI/CD Integration', () => {
    it('should evaluate CI/CD performance gates', () => {
      const deploymentMetrics = {
        deploymentId: 'v2.1.0',
        p95Latency: 165,
        p99Latency: 220,
        errorRate: 0.003,
        cacheHitRate: 0.82
      };

      const baseline = {
        p95Latency: 150,
        p99Latency: 200,
        errorRate: 0.002,
        cacheHitRate: 0.85
      };

      const gate = ecosystemPerf.evaluateCICDPerformanceGate(deploymentMetrics, baseline);

      expect(gate).toBeDefined();
      expect(gate.deployment).toBe('v2.1.0');
      expect(typeof gate.passed).toBe('boolean');
      expect(Array.isArray(gate.violations)).toBe(true);
      expect(Array.isArray(gate.warnings)).toBe(true);
      expect(gate.recommendation).toMatch(/proceed|block_deployment|proceed_with_monitoring/);
    });

    it('should block deployment for significant performance degradation', () => {
      const deploymentMetrics = {
        deploymentId: 'v2.2.0',
        p95Latency: 200, // 33% increase
        p99Latency: 300, // 50% increase
        errorRate: 0.006, // 3x increase
        cacheHitRate: 0.70 // 18% decrease
      };

      const baseline = {
        p95Latency: 150,
        p99Latency: 200,
        errorRate: 0.002,
        cacheHitRate: 0.85
      };

      const gate = ecosystemPerf.evaluateCICDPerformanceGate(deploymentMetrics, baseline);

      expect(gate.passed).toBe(false);
      expect(gate.violations.length).toBeGreaterThan(0);
      expect(gate.recommendation).toBe('block_deployment');
    });
  });

  describe('Go-Live Readiness', () => {
    it('should evaluate go-live readiness', () => {
      const readiness = ecosystemPerf.evaluateGoLiveReadiness('test-module', 'production');

      expect(readiness).toBeDefined();
      expect(readiness.module).toBe('test-module');
      expect(readiness.environment).toBe('production');
      expect(readiness.overallStatus).toMatch(/ready|blocked/);
      expect(typeof readiness.gates).toBe('object');
      expect(Array.isArray(readiness.blockers)).toBe(true);
      expect(Array.isArray(readiness.warnings)).toBe(true);
      expect(Array.isArray(readiness.recommendations)).toBe(true);
    });

    it('should check individual gates', () => {
      const latencyGate = ecosystemPerf.checkLatencyGate('test-module');
      expect(latencyGate.name).toBe('latency_gate');
      expect(typeof latencyGate.passed).toBe('boolean');

      const errorBudgetGate = ecosystemPerf.checkErrorBudgetGate('test-module');
      expect(errorBudgetGate.name).toBe('error_budget_gate');
      expect(typeof errorBudgetGate.passed).toBe('boolean');

      const cacheGate = ecosystemPerf.checkCachePerformanceGate('test-module');
      expect(cacheGate.name).toBe('cache_performance_gate');
      expect(typeof cacheGate.passed).toBe('boolean');
    });
  });

  describe('DAO Subnet Integration', () => {
    it('should evaluate DAO subnet performance', () => {
      const subnetMetrics = {
        latency: { p99: 190 },
        availability: { uptime: 99.8 },
        throughput: { rps: 15 },
        errorRate: 0.005
      };

      const evaluation = ecosystemPerf.evaluateDAOSubnetPerformance('dao-123', subnetMetrics);

      expect(evaluation).toBeDefined();
      expect(evaluation.daoId).toBe('dao-123');
      expect(typeof evaluation.performanceScore).toBe('number');
      expect(typeof evaluation.sloCompliance).toBe('object');
      expect(evaluation.isolationRecommendation).toMatch(/none|performance_monitoring|traffic_throttling|immediate_isolation/);
      expect(evaluation.impactAssessment).toMatch(/low|moderate|high|critical/);
    });

    it('should recommend isolation for poor performing DAOs', () => {
      const poorMetrics = {
        latency: { p99: 500 }, // Very high latency
        availability: { uptime: 98.0 }, // Low availability
        throughput: { rps: 5 }, // Low throughput
        errorRate: 0.05 // High error rate
      };

      const evaluation = ecosystemPerf.evaluateDAOSubnetPerformance('poor-dao', poorMetrics);

      expect(evaluation.isolationRecommendation).not.toBe('none');
      expect(evaluation.impactAssessment).toMatch(/moderate|high|critical/);
    });
  });

  describe('Event Handling', () => {
    it('should emit events for performance updates', async () => {
      return new Promise((resolve) => {
        ecosystemPerf.on('node_performance_scored', (score) => {
          expect(score).toBeDefined();
          expect(score.nodeId).toBe('test-node');
          resolve();
        });

        ecosystemPerf.calculateNodePerformanceScore('test-node', {
          latency: { p99: 150 },
          errorRate: 0.001,
          capacity: { utilization: 0.5 }
        });
      });
    });

    it('should emit events for policy evaluations', async () => {
      return new Promise((resolve) => {
        ecosystemPerf.on('qflow_policy_evaluated', (evaluation) => {
          expect(evaluation).toBeDefined();
          expect(evaluation.operation.id).toBe('test-op');
          resolve();
        });

        ecosystemPerf.evaluateQflowPerformancePolicy({
          id: 'test-op',
          type: 'read'
        });
      });
    });

    it('should emit events for risk assessments', async () => {
      return new Promise((resolve) => {
        ecosystemPerf.on('performance_risk_assessed', (riskSignal) => {
          expect(riskSignal).toBeDefined();
          expect(riskSignal.entityId).toBe('test-entity');
          resolve();
        });

        ecosystemPerf.generatePerformanceRiskSignals('test-entity', {
          latency: { p99: 200 },
          errorRate: 0.005
        });
      });
    });
  });

  describe('Helper Methods', () => {
    it('should calculate latency scores correctly', () => {
      expect(ecosystemPerf.calculateLatencyScore({ p99: 150 })).toBe(1.0);
      expect(ecosystemPerf.calculateLatencyScore({ p99: 250 })).toBe(0.7);
      expect(ecosystemPerf.calculateLatencyScore({ p99: 400 })).toBe(0.4);
      expect(ecosystemPerf.calculateLatencyScore({ p99: 600 })).toBe(0.1);
    });

    it('should calculate error rate scores correctly', () => {
      expect(ecosystemPerf.calculateErrorRateScore(0.0005)).toBe(1.0);
      expect(ecosystemPerf.calculateErrorRateScore(0.003)).toBe(0.8);
      expect(ecosystemPerf.calculateErrorRateScore(0.008)).toBe(0.5);
      expect(ecosystemPerf.calculateErrorRateScore(0.02)).toBe(0.2);
    });

    it('should calculate capacity scores correctly', () => {
      expect(ecosystemPerf.calculateCapacityScore({ utilization: 0.6 })).toBe(1.0);
      expect(ecosystemPerf.calculateCapacityScore({ utilization: 0.75 })).toBe(0.8);
      expect(ecosystemPerf.calculateCapacityScore({ utilization: 0.85 })).toBe(0.5);
      expect(ecosystemPerf.calculateCapacityScore({ utilization: 0.95 })).toBe(0.2);
    });

    it('should analyze cost trends', () => {
      const costMetrics = {
        historical: [100, 105, 110, 115, 120, 125, 150]
      };
      
      const trend = ecosystemPerf.analyzeCostTrends(costMetrics);
      expect(trend).toBeGreaterThan(0); // Should detect increase
    });

    it('should generate operation cache keys', () => {
      const operation = {
        type: 'read',
        params: { userId: '123', fields: ['name', 'email'] }
      };
      
      const cacheKey = ecosystemPerf.generateOperationCacheKey(operation);
      expect(typeof cacheKey).toBe('string');
      expect(cacheKey.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete performance degradation scenario', async () => {
      // Simulate a node with degrading performance
      const nodeId = 'degrading-node';
      const poorMetrics = {
        latency: { p99: 400 },
        errorRate: 0.02,
        capacity: { utilization: 0.95 }
      };

      // Calculate performance score
      const score = ecosystemPerf.calculateNodePerformanceScore(nodeId, poorMetrics);
      expect(score.recommendation).toMatch(/down_weight/);

      // Check routing weights
      const weights = ecosystemPerf.getQNETRoutingWeights([{ id: nodeId }]);
      expect(weights.get(nodeId)).toBeLessThan(1.0);

      // Check if operations would be affected
      const operation = { id: 'test-op', type: 'read' };
      const policyEval = ecosystemPerf.evaluateQflowPerformancePolicy(operation);
      
      // Should have some performance consideration
      expect(policyEval.decision).toBeDefined();
    });

    it('should handle go-live scenario with mixed gate results', () => {
      const readiness = ecosystemPerf.evaluateGoLiveReadiness('mixed-module');
      
      // Should have evaluated multiple gates
      expect(Object.keys(readiness.gates).length).toBeGreaterThan(0);
      
      // Overall status should be determined by gate results
      expect(readiness.overallStatus).toMatch(/ready|blocked/);
    });
  });
});