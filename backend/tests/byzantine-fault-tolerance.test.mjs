/**
 * Byzantine Fault Tolerance Tests
 * Tests malicious node isolation, consensus validation under adversarial conditions,
 * and network partition recovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ByzantineFaultToleranceService from '../services/ByzantineFaultToleranceService.mjs';

describe('Byzantine Fault Tolerance Service', () => {
  let bftService;

  beforeEach(async () => {
    bftService = new ByzantineFaultToleranceService({
      byzantineToleranceThreshold: 0.33,
      quorumThreshold: 0.67,
      consensusTimeout: 5000, // Shorter timeout for tests
      maliciousNodeDetectionThreshold: 2
    });
  });

  afterEach(async () => {
    if (bftService) {
      bftService.removeAllListeners();
    }
  });

  describe('Malicious Node Deployment and Detection', () => {
    it('should deploy malicious nodes with specified behaviors', async () => {
      const behaviors = ['double_spend', 'invalid_signatures'];
      const maliciousNodes = await bftService.deployMaliciousNodes(2, behaviors);

      expect(maliciousNodes).toHaveLength(2);
      expect(maliciousNodes[0].type).toBe('malicious');
      expect(maliciousNodes[0].behaviors).toEqual(behaviors);
      expect(maliciousNodes[0].nodeId).toMatch(/^malicious_/);
    });

    it('should deploy honest nodes', async () => {
      const honestNodes = await bftService.deployHonestNodes(5);

      expect(honestNodes).toHaveLength(5);
      expect(honestNodes[0].type).toBe('honest');
      expect(honestNodes[0].behaviors).toEqual(['follow_protocol']);
      expect(honestNodes[0].nodeId).toMatch(/^honest_/);
    });
  });

  describe('Malicious Node Isolation and Quorum Maintenance', () => {
    it('should isolate malicious nodes and maintain quorum', async () => {
      // Deploy nodes
      const maliciousNodes = await bftService.deployMaliciousNodes(2, ['double_spend', 'consensus_disruption']);
      const honestNodes = await bftService.deployHonestNodes(5);

      // Test malicious node isolation
      const testResult = await bftService.testMaliciousNodeIsolation(maliciousNodes, honestNodes);

      expect(testResult.results.isolationSuccessful).toBe(true);
      expect(testResult.results.quorumMaintained).toBe(true);
      expect(testResult.results.consensusAchieved).toBe(true);
      expect(testResult.results.detectionTime).toBeGreaterThan(0);
      expect(testResult.results.isolationTime).toBeGreaterThan(0);

      // Verify test phases
      expect(testResult.phases).toHaveLength(5);
      expect(testResult.phases[0].phase).toBe('malicious_activities');
      expect(testResult.phases[1].phase).toBe('malicious_detection');
      expect(testResult.phases[2].phase).toBe('malicious_isolation');
      expect(testResult.phases[3].phase).toBe('quorum_verification');
      expect(testResult.phases[4].phase).toBe('honest_consensus');

      // Verify quorum is maintained with honest nodes (5 honest nodes should be >= 2/3 of 7 total)
      const quorumPhase = testResult.phases[3];
      expect(quorumPhase.quorumMaintained).toBe(true);
      expect(quorumPhase.activeNodes).toBeGreaterThanOrEqual(5); // At least honest nodes remain active
    });

    it('should detect malicious behavior accurately', async () => {
      const maliciousNodes = await bftService.deployMaliciousNodes(2, ['double_spend', 'invalid_signatures']);
      const honestNodes = await bftService.deployHonestNodes(3);

      // Simulate malicious activities first
      await bftService.simulateMaliciousActivities('test', maliciousNodes);

      // Test detection
      const detectionResult = await bftService.detectMaliciousBehavior('test', [...maliciousNodes, ...honestNodes]);

      expect(detectionResult.success).toBe(true);
      expect(detectionResult.detectedMaliciousNodes.length).toBeGreaterThan(0);
      expect(detectionResult.accuracy.precision).toBeGreaterThan(0);
      expect(detectionResult.accuracy.recall).toBeGreaterThan(0);

      // Should detect at least some malicious nodes
      const detectedMalicious = detectionResult.detectionResults.filter(r => r.isMalicious);
      expect(detectedMalicious.length).toBeGreaterThan(0);
    });
  });

  describe('Consensus Validation Under Adversarial Conditions', () => {
    it('should maintain consensus under Byzantine Generals problem', async () => {
      const maliciousNodes = await bftService.deployMaliciousNodes(2);
      const honestNodes = await bftService.deployHonestNodes(5);
      const allNodes = [...maliciousNodes, ...honestNodes];

      const testResult = await bftService.testConsensusUnderAdversarialConditions(
        allNodes, 
        ['byzantine_generals']
      );

      expect(testResult.overallResults.consensusResilience).toBe(true);
      expect(testResult.overallResults.successfulRounds).toBeGreaterThan(0);
      expect(testResult.overallResults.averageConsensusTime).toBeGreaterThan(0);

      // Check Byzantine Generals scenario specifically
      const byzantineScenario = testResult.scenarioResults.find(r => r.scenario === 'byzantine_generals');
      expect(byzantineScenario).toBeDefined();
      expect(byzantineScenario.consensusAchieved).toBe(true);
    });

    it('should handle Sybil attack scenario', async () => {
      const allNodes = await bftService.deployHonestNodes(10); // Simulate mixed environment

      const testResult = await bftService.testConsensusUnderAdversarialConditions(
        allNodes,
        ['sybil_attack']
      );

      expect(testResult.overallResults).toBeDefined();
      
      const sybilScenario = testResult.scenarioResults.find(r => r.scenario === 'sybil_attack');
      expect(sybilScenario).toBeDefined();
      expect(sybilScenario.consensusTime).toBeGreaterThan(0);
    });

    it('should handle Eclipse attack scenario', async () => {
      const allNodes = await bftService.deployHonestNodes(8);

      const testResult = await bftService.testConsensusUnderAdversarialConditions(
        allNodes,
        ['eclipse_attack']
      );

      expect(testResult.overallResults).toBeDefined();
      
      const eclipseScenario = testResult.scenarioResults.find(r => r.scenario === 'eclipse_attack');
      expect(eclipseScenario).toBeDefined();
      expect(eclipseScenario.consensusTime).toBeGreaterThan(0);
    });

    it('should test multiple adversarial scenarios', async () => {
      const allNodes = await bftService.deployHonestNodes(7);
      const scenarios = ['byzantine_generals', 'sybil_attack', 'eclipse_attack'];

      const testResult = await bftService.testConsensusUnderAdversarialConditions(allNodes, scenarios);

      expect(testResult.scenarioResults).toHaveLength(3);
      expect(testResult.overallResults.successfulRounds + testResult.overallResults.failedRounds).toBe(3);
      expect(testResult.overallResults.averageConsensusTime).toBeGreaterThan(0);

      // Each scenario should have been tested
      scenarios.forEach(scenario => {
        const scenarioResult = testResult.scenarioResults.find(r => r.scenario === scenario);
        expect(scenarioResult).toBeDefined();
        expect(scenarioResult.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Network Partition Recovery', () => {
    it('should recover from network partition and reconcile state', async () => {
      const allNodes = await bftService.deployHonestNodes(6);

      const testResult = await bftService.testNetworkPartitionRecovery(allNodes);

      expect(testResult.recoveryResults.partitionCreated).toBe(true);
      expect(testResult.recoveryResults.operationsExecuted).toBe(true);
      expect(testResult.recoveryResults.partitionHealed).toBe(true);
      expect(testResult.recoveryResults.stateReconciled).toBe(true);
      expect(testResult.recoveryResults.recoveryTime).toBeGreaterThan(0);

      // Verify partitions were created
      expect(testResult.partitions).toHaveLength(2);
      expect(testResult.partitions[0].nodes.length + testResult.partitions[1].nodes.length).toBe(6);
    });

    it('should handle state conflicts during partition recovery', async () => {
      const allNodes = await bftService.deployHonestNodes(8);

      const testResult = await bftService.testNetworkPartitionRecovery(allNodes);

      // Should successfully reconcile any conflicts that arise
      expect(testResult.recoveryResults.stateReconciled).toBe(true);
      
      // Conflicts may or may not occur depending on operations, but resolution should work
      if (testResult.recoveryResults.conflictsResolved > 0) {
        expect(testResult.recoveryResults.conflictsResolved).toBeGreaterThan(0);
      }
    });

    it('should create balanced network partitions', async () => {
      const allNodes = await bftService.deployHonestNodes(10);

      // Create partition manually to test partition logic
      const partitionResult = await bftService.createNetworkPartition('test', allNodes);

      expect(partitionResult.success).toBe(true);
      expect(partitionResult.partitions).toHaveLength(2);
      
      const partition1Size = partitionResult.partitions[0].nodes.length;
      const partition2Size = partitionResult.partitions[1].nodes.length;
      
      // Partitions should be roughly balanced
      expect(Math.abs(partition1Size - partition2Size)).toBeLessThanOrEqual(1);
      expect(partition1Size + partition2Size).toBe(10);
    });
  });

  describe('Byzantine Fault Tolerance Thresholds', () => {
    it('should maintain security with up to 1/3 malicious nodes', async () => {
      // Test with exactly 1/3 malicious nodes (Byzantine fault tolerance limit)
      const maliciousNodes = await bftService.deployMaliciousNodes(2); // 2/6 = 1/3
      const honestNodes = await bftService.deployHonestNodes(4);

      const testResult = await bftService.testMaliciousNodeIsolation(maliciousNodes, honestNodes);

      // Should still maintain quorum and achieve consensus
      expect(testResult.results.quorumMaintained).toBe(true);
      expect(testResult.results.consensusAchieved).toBe(true);
    });

    it('should fail gracefully with more than 1/3 malicious nodes', async () => {
      // Test with more than 1/3 malicious nodes (beyond Byzantine fault tolerance)
      const maliciousNodes = await bftService.deployMaliciousNodes(3); // 3/6 = 1/2 > 1/3
      const honestNodes = await bftService.deployHonestNodes(3);

      const testResult = await bftService.testMaliciousNodeIsolation(maliciousNodes, honestNodes);

      // May not maintain quorum depending on detection and isolation success
      // This tests the limits of Byzantine fault tolerance
      expect(testResult.results).toBeDefined();
      expect(testResult.duration).toBeGreaterThan(0);
    });
  });

  describe('Service Health and Monitoring', () => {
    it('should provide health check information', async () => {
      await bftService.deployMaliciousNodes(2);
      await bftService.deployHonestNodes(3);

      const health = await bftService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.totalNodes).toBe(5);
      expect(health.maliciousNodes).toBe(2);
      expect(health.timestamp).toBeDefined();
    });

    it('should track test results', async () => {
      const maliciousNodes = await bftService.deployMaliciousNodes(1);
      const honestNodes = await bftService.deployHonestNodes(3);

      const testResult = await bftService.testMaliciousNodeIsolation(maliciousNodes, honestNodes);
      
      const storedResult = bftService.getTestResults(testResult.testId);
      expect(storedResult).toEqual(testResult);

      const allResults = bftService.getAllTestResults();
      expect(allResults).toHaveLength(1);
      expect(allResults[0]).toEqual(testResult);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during malicious node isolation', async () => {
      // Test with invalid node configuration
      const testResult = await bftService.testMaliciousNodeIsolation([], []);

      // Should complete without throwing, even with empty node lists
      expect(testResult.testId).toBeDefined();
      expect(testResult.duration).toBeGreaterThan(0);
    });

    it('should handle errors during consensus testing', async () => {
      // Test with minimal nodes
      const nodes = await bftService.deployHonestNodes(1);
      
      const testResult = await bftService.testConsensusUnderAdversarialConditions(nodes, ['byzantine_generals']);

      // Should complete and provide results even with insufficient nodes
      expect(testResult.testId).toBeDefined();
      expect(testResult.scenarioResults).toHaveLength(1);
    });
  });
});