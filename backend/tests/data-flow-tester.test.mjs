/**
 * Data Flow Tester Tests
 * Tests for execution ledger verification, deterministic replay, and flow validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataFlowTester } from '../services/DataFlowTester.mjs';

describe('DataFlowTester', () => {
  let dataFlowTester;

  beforeEach(() => {
    dataFlowTester = new DataFlowTester();
  });

  afterEach(() => {
    // Clean up any active flows
    dataFlowTester.activeFlows.clear();
    dataFlowTester.executionLedger.clear();
    dataFlowTester.replayResults.clear();
  });

  describe('Basic Flow Validation', () => {
    it('should execute input flow successfully', async () => {
      const testData = Buffer.from('Test data for input flow');
      const options = {
        encryptionLevel: 'standard',
        squidId: 'test-squid-123',
        metadata: { type: 'test-document' }
      };

      const result = await dataFlowTester.testInputFlow(testData, options);

      expect(result).toBeDefined();
      expect(result.flowType).toBe('input');
      expect(result.steps).toHaveLength(5); // Qompress, Qlock, Qindex, Qerberos, IPFS
      expect(result.validation.hashVerification).toBe(true);
      expect(result.validation.performanceMetrics.totalDuration).toBeGreaterThan(0);
    });

    it('should execute output flow successfully', async () => {
      const testHash = 'QmTestHash123456789';
      const options = {
        encryptionMetadata: {
          level: 'standard',
          algorithm: 'aes-256-gcm',
          keyId: 'test-key-123'
        }
      };

      const result = await dataFlowTester.testOutputFlow(testHash, options);

      expect(result).toBeDefined();
      expect(result.flowType).toBe('output');
      expect(result.steps).toHaveLength(5); // IPFS, Qindex, Qerberos, Qlock, Qompress
      expect(result.validation.hashVerification).toBe(true);
      expect(result.validation.performanceMetrics.totalDuration).toBeGreaterThan(0);
    });

    it('should validate Qflow execution', async () => {
      const workflow = {
        name: 'test-workflow',
        steps: ['step1', 'step2', 'step3']
      };
      const nodes = ['node1', 'node2', 'node3'];

      const result = await dataFlowTester.validateQflowExecution(workflow, nodes);

      expect(result).toBeDefined();
      expect(result.workflow).toEqual(workflow);
      expect(result.nodes).toEqual(nodes);
      expect(result.validation.distributedExecution).toBeDefined();
      expect(result.validation.nodeCoordination).toBeDefined();
      expect(result.validation.workflowIntegrity).toBeDefined();
      expect(result.validation.serverlessValidation).toBeDefined();
    });
  });

  describe('Execution Ledger Verification', () => {
    it('should record execution in ledger with hash chain', async () => {
      const testData = Buffer.from('Test ledger data');
      const flowResult = await dataFlowTester.testInputFlow(testData);

      // Verify ledger record was created
      const ledgerRecords = Array.from(dataFlowTester.executionLedger.values());
      expect(ledgerRecords.length).toBeGreaterThan(0);

      const record = ledgerRecords.find(r => r.executionId === flowResult.flowId);
      expect(record).toBeDefined();
      expect(record.hash).toBeDefined();
      expect(record.vectorClock).toBeDefined();
      expect(record.nodeId).toBe(dataFlowTester.nodeId);
    });

    it('should verify execution ledger with 100% chain continuity', async () => {
      // Execute multiple flows to create a chain
      const testData1 = Buffer.from('Test data 1');
      const testData2 = Buffer.from('Test data 2');
      
      const flow1 = await dataFlowTester.testInputFlow(testData1);
      const flow2 = await dataFlowTester.testInputFlow(testData2);

      // Verify ledger for first flow
      const verification1 = await dataFlowTester.verifyExecutionLedger(flow1.flowId);
      expect(verification1.chainValid).toBe(true);
      expect(verification1.totalRecords).toBeGreaterThan(0);
      expect(verification1.orphanRecords).toHaveLength(0);

      // Verify ledger for second flow
      const verification2 = await dataFlowTester.verifyExecutionLedger(flow2.flowId);
      expect(verification2.chainValid).toBe(true);
      expect(verification2.totalRecords).toBeGreaterThan(0);
      expect(verification2.orphanRecords).toHaveLength(0);
    });

    it('should generate ledger attestation artifact', async () => {
      const testData = Buffer.from('Test attestation data');
      const flowResult = await dataFlowTester.testInputFlow(testData);
      
      const verification = await dataFlowTester.verifyExecutionLedger(flowResult.flowId);
      const artifact = await dataFlowTester.generateArtifacts('ledger_attestation', verification);

      expect(artifact.path).toBe('artifacts/ledger/attestation.json');
      expect(artifact.data.attestationType).toBe('execution_ledger');
      expect(artifact.data.chainContinuity).toBe('100%');
      expect(artifact.data.verificationStatus).toBe('VALID');
    });

    it('should generate chain artifact', async () => {
      const testData = Buffer.from('Test chain data');
      const flowResult = await dataFlowTester.testInputFlow(testData);
      
      const verification = await dataFlowTester.verifyExecutionLedger(flowResult.flowId);
      const artifact = await dataFlowTester.generateArtifacts('ledger_chain', verification);

      expect(artifact.path).toContain('artifacts/ledger/chain-');
      expect(artifact.data.executionId).toBe(verification.executionId);
      expect(artifact.data.chainRecords).toBeDefined();
      expect(artifact.data.chainMetadata.chainValid).toBe(true);
    });
  });

  describe('Deterministic Replay System', () => {
    it('should perform deterministic replay with <1% divergence', async () => {
      const testData = Buffer.from('Test replay data');
      const originalFlow = await dataFlowTester.testInputFlow(testData);

      const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);

      expect(replayResult.deterministic).toBe(true);
      expect(replayResult.divergenceAt).toBeNull();
      expect(replayResult.stepComparisons.divergencePercent).toBeLessThan(0.01); // <1%
      expect(replayResult.timingAnalysis.timingToleranceMet).toBe(true);
    });

    it('should generate replay comparison artifact', async () => {
      const testData = Buffer.from('Test replay artifact data');
      const originalFlow = await dataFlowTester.testInputFlow(testData);
      
      const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);
      const artifact = await dataFlowTester.generateArtifacts('replay_comparison', replayResult);

      expect(artifact.path).toContain('artifacts/replay/comparison-');
      expect(artifact.data.replayId).toBe(replayResult.replayId);
      expect(artifact.data.deterministic).toBe(true);
      expect(artifact.data.divergenceAnalysis.divergencePercent).toBeLessThan(1); // <1%
    });
  });

  describe('Gossipsub Backpressure Validation', () => {
    it('should validate gossipsub with no starvation and ≤1% lost jobs', async () => {
      const validation = await dataFlowTester.validateGossipsubBackpressure();

      expect(validation.validationPassed).toBe(true);
      expect(validation.starvationDetected).toBe(false);
      expect(validation.lostJobs / validation.totalJobs).toBeLessThanOrEqual(0.01); // ≤1%
      expect(validation.backoffCompliance).toBe(true);
    });

    it('should generate gossipsub fairness report artifact', async () => {
      const validation = await dataFlowTester.validateGossipsubBackpressure();
      const artifact = await dataFlowTester.generateArtifacts('gossipsub_fairness', validation);

      expect(artifact.path).toBe('artifacts/gossipsub/fairness-report.json');
      expect(artifact.data.validationResult).toBe('PASSED');
      expect(parseFloat(artifact.data.jobDistribution.lostJobsPercent)).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Stress Testing Capabilities', () => {
    it('should run stress test with ≥1000 parallel events and ≤5% error rate', async () => {
      const eventCount = 1000;
      const stressResult = await dataFlowTester.runStressTests(eventCount);

      expect(stressResult.eventCount).toBe(eventCount);
      expect(stressResult.results.errorRate).toBeLessThanOrEqual(0.05); // ≤5%
      expect(stressResult.passed).toBe(true);
      expect(stressResult.results.throughput).toBeGreaterThan(0);
    });

    it('should generate stress test benchmark artifact', async () => {
      const eventCount = 100; // Smaller count for faster test
      const stressResult = await dataFlowTester.runStressTests(eventCount);
      const artifact = await dataFlowTester.generateArtifacts('stress_benchmark', stressResult);

      expect(artifact.path).toContain('artifacts/stress/benchmark-');
      expect(artifact.data.testConfiguration.eventCount).toBe(eventCount);
      expect(artifact.data.testResult).toBe('PASSED');
      expect(parseFloat(artifact.data.performance.errorRatePercent)).toBeLessThanOrEqual(5.0);
    });

    it('should generate flow validation artifact', async () => {
      const testData = Buffer.from('Test flow artifact data');
      const flowResult = await dataFlowTester.testInputFlow(testData);
      const artifact = await dataFlowTester.generateArtifacts('flow_validation', flowResult);

      expect(artifact.path).toContain('artifacts/flows/input-');
      expect(artifact.data.flowType).toBe('input');
      expect(artifact.data.stepDetails).toHaveLength(5);
      expect(artifact.data.validation).toBeDefined();
    });
  });

  describe('Vector Clocks and Distributed Tracking', () => {
    it('should maintain vector clocks for distributed execution tracking', async () => {
      const testData = Buffer.from('Test vector clock data');
      await dataFlowTester.testInputFlow(testData);

      const vectorClocks = dataFlowTester.vectorClocks;
      expect(vectorClocks.has(dataFlowTester.nodeId)).toBe(true);
      expect(vectorClocks.get(dataFlowTester.nodeId)).toBeGreaterThan(0);
    });

    it('should provide comprehensive flow statistics', () => {
      const stats = dataFlowTester.getFlowStatistics();

      expect(stats.ledger).toBeDefined();
      expect(stats.replay).toBeDefined();
      expect(stats.stress).toBeDefined();
      expect(stats.nodeId).toBe(dataFlowTester.nodeId);
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await dataFlowTester.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.nodeId).toBe(dataFlowTester.nodeId);
      expect(health.activeFlows).toBe(0);
      expect(health.executionLedgerSize).toBe(0);
    });
  });
});