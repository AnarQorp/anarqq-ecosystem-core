/**
 * IntegrityValidator Test Suite
 * Tests for ecosystem integrity validation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import IntegrityValidator from '../services/IntegrityValidator.mjs';

describe('IntegrityValidator', () => {
  let integrityValidator;

  beforeEach(() => {
    integrityValidator = new IntegrityValidator({
      healthCheckTimeout: 1000, // Shorter timeout for tests
      consensusQuorum: 3,
      performanceThresholds: {
        p95Latency: 150,
        p99Latency: 200,
        errorBudget: 0.1,
        cacheHitRate: 0.85
      }
    });
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Ecosystem Health Validation', () => {
    it('should validate ecosystem health successfully', async () => {
      const healthResult = await integrityValidator.validateEcosystemHealth();

      expect(healthResult).toBeDefined();
      expect(healthResult.validationId).toBeDefined();
      expect(healthResult.overallStatus).toMatch(/healthy|degraded|critical/);
      expect(healthResult.modules).toBeDefined();
      expect(healthResult.summary).toBeDefined();
      expect(healthResult.summary.totalModules).toBeGreaterThan(0);
      expect(healthResult.executionTime).toBeGreaterThan(0);
    });

    it('should validate individual module endpoints', async () => {
      const moduleResult = await integrityValidator.validateModuleEndpoints('qlock');

      expect(moduleResult).toBeDefined();
      expect(moduleResult.moduleId).toBe('qlock');
      expect(moduleResult.status).toMatch(/healthy|degraded|failed/);
      expect(moduleResult.endpoints).toBeDefined();
      expect(moduleResult.integrations).toBeDefined();
      expect(moduleResult.performance).toBeDefined();
    });

    it('should validate Qflow coherence', async () => {
      const coherenceResult = await integrityValidator.validateQflowCoherence();

      expect(coherenceResult).toBeDefined();
      expect(coherenceResult.status).toMatch(/healthy|degraded|failed/);
      expect(coherenceResult.distributedExecution).toBeDefined();
      expect(coherenceResult.nodeCoordination).toBeDefined();
      expect(coherenceResult.workflowIntegrity).toBeDefined();
      expect(coherenceResult.serverlessValidation).toBeDefined();
    });
  });

  describe('Decentralization Attestation', () => {
    it('should verify decentralization attestation', async () => {
      const attestationResult = await integrityValidator.verifyDecentralizationAttestation();

      expect(attestationResult).toBeDefined();
      expect(attestationResult.attestationId).toBeDefined();
      expect(attestationResult.overallStatus).toMatch(/compliant|non_compliant/);
      expect(attestationResult.checks).toBeDefined();
      expect(attestationResult.killFirstLauncherTest).toBeDefined();
      
      // Check that all required checks are present
      const expectedChecks = [
        'no_central_database',
        'no_message_brokers',
        'ipfs_required',
        'libp2p_active',
        'kill_first_launcher_test'
      ];
      
      expectedChecks.forEach(checkName => {
        expect(attestationResult.checks[checkName]).toBeDefined();
        expect(attestationResult.checks[checkName].status).toMatch(/compliant|non_compliant|error/);
      });
    });

    it('should run kill-first-launcher test', async () => {
      const killTestResult = await integrityValidator.runKillFirstLauncherTest();

      expect(killTestResult).toBeDefined();
      expect(killTestResult.status).toMatch(/passed|failed/);
      expect(killTestResult.nominalDuration).toBeDefined();
      expect(killTestResult.actualDuration).toBeDefined();
      expect(killTestResult.continuityMaintained).toBeDefined();
      expect(killTestResult.nodeFailover).toBeDefined();
      expect(killTestResult.serviceRecovery).toBeDefined();
    });
  });

  describe('Critical Consensus Validation', () => {
    it('should validate critical consensus', async () => {
      const execId = 'test-exec-123';
      const stepId = 'test-step-456';
      const operation = { type: 'payment' };

      const consensusResult = await integrityValidator.validateCriticalConsensus(execId, stepId, operation);

      expect(consensusResult).toBeDefined();
      expect(consensusResult.consensusId).toBeDefined();
      expect(consensusResult.execId).toBe(execId);
      expect(consensusResult.stepId).toBe(stepId);
      expect(consensusResult.operation).toBe('payment');
      expect(consensusResult.quorum).toBeDefined();
      expect(consensusResult.votes).toBeDefined();
      expect(consensusResult.consensus).toBeDefined();
      expect(consensusResult.recovery).toBeDefined();
    });

    it('should collect consensus votes', async () => {
      const votes = await integrityValidator.collectConsensusVotes('exec-1', 'step-1', { type: 'governance' });

      expect(Array.isArray(votes)).toBe(true);
      
      votes.forEach(vote => {
        expect(vote.nodeId).toBeDefined();
        expect(vote.vote).toMatch(/approve|reject/);
        expect(vote.confidence).toBeGreaterThanOrEqual(0);
        expect(vote.confidence).toBeLessThanOrEqual(1);
        expect(vote.timestamp).toBeDefined();
        expect(vote.signature).toBeDefined();
      });
    });

    it('should analyze consensus votes correctly', () => {
      const mockVotes = [
        { nodeId: 'node1', vote: 'approve', confidence: 0.9 },
        { nodeId: 'node2', vote: 'approve', confidence: 0.8 },
        { nodeId: 'node3', vote: 'approve', confidence: 0.85 },
        { nodeId: 'node4', vote: 'reject', confidence: 0.7 },
        { nodeId: 'node5', vote: 'approve', confidence: 0.95 }
      ];

      const consensusResult = integrityValidator.analyzeConsensusVotes(mockVotes);

      expect(consensusResult.reached).toBe(true);
      expect(consensusResult.decision).toBe('approve');
      expect(consensusResult.confidence).toBeGreaterThan(0);
      expect(consensusResult.analysis).toBeDefined();
      expect(consensusResult.analysis.totalVotes).toBe(5);
      expect(consensusResult.analysis.approvals).toBe(4);
      expect(consensusResult.analysis.rejections).toBe(1);
    });
  });

  describe('Performance Gates Validation', () => {
    it('should validate performance gates', async () => {
      const performanceResult = await integrityValidator.validatePerformanceGates();

      expect(performanceResult).toBeDefined();
      expect(performanceResult.validationId).toBeDefined();
      expect(performanceResult.overallStatus).toMatch(/passed|failed|warning/);
      expect(performanceResult.gates).toBeDefined();
      expect(performanceResult.regressions).toBeDefined();
      expect(performanceResult.alerts).toBeDefined();

      // Check that all required gates are present
      const expectedGates = ['p95Latency', 'p99Latency', 'errorBurnRate', 'cacheHitRate'];
      expectedGates.forEach(gateName => {
        expect(performanceResult.gates[gateName]).toBeDefined();
        expect(performanceResult.gates[gateName].passed).toBeDefined();
        expect(performanceResult.gates[gateName].name).toBeDefined();
      });
    });

    it('should validate P95 latency gate', async () => {
      const p95Gate = await integrityValidator.validateP95LatencyGate();

      expect(p95Gate).toBeDefined();
      expect(p95Gate.name).toBe('P95 Latency Gate');
      expect(p95Gate.passed).toBeDefined();
      expect(p95Gate.current).toBeDefined();
      expect(p95Gate.threshold).toBe(150);
      expect(p95Gate.unit).toBe('ms');
    });

    it('should validate P99 latency gate', async () => {
      const p99Gate = await integrityValidator.validateP99LatencyGate();

      expect(p99Gate).toBeDefined();
      expect(p99Gate.name).toBe('P99 Latency Gate');
      expect(p99Gate.passed).toBeDefined();
      expect(p99Gate.current).toBeDefined();
      expect(p99Gate.threshold).toBe(200);
      expect(p99Gate.unit).toBe('ms');
    });

    it('should validate error burn-rate gate', async () => {
      const errorGate = await integrityValidator.validateErrorBurnRateGate();

      expect(errorGate).toBeDefined();
      expect(errorGate.name).toBe('Error Burn-Rate Gate');
      expect(errorGate.passed).toBeDefined();
      expect(errorGate.current).toBeDefined();
      expect(errorGate.threshold).toBe(0.1);
      expect(errorGate.unit).toBe('ratio');
    });

    it('should validate cache hit rate gate', async () => {
      const cacheGate = await integrityValidator.validateCacheHitRateGate();

      expect(cacheGate).toBeDefined();
      expect(cacheGate.name).toBe('Cache Hit Rate Gate');
      expect(cacheGate.passed).toBeDefined();
      expect(cacheGate.current).toBeDefined();
      expect(cacheGate.threshold).toBe(0.85);
      expect(cacheGate.unit).toBe('ratio');
    });

    it('should detect performance regressions', async () => {
      const regressions = await integrityValidator.detectPerformanceRegressions();

      expect(regressions).toBeDefined();
      expect(regressions.detected).toBeDefined();
      expect(regressions.critical).toBeDefined();
      expect(regressions.moderate).toBeDefined();
      expect(Array.isArray(regressions.detected)).toBe(true);
      expect(Array.isArray(regressions.critical)).toBe(true);
      expect(Array.isArray(regressions.moderate)).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique validation IDs', () => {
      const id1 = integrityValidator.generateValidationId();
      const id2 = integrityValidator.generateValidationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^val_\d+_[a-f0-9]{8}$/);
    });

    it('should generate unique attestation IDs', () => {
      const id1 = integrityValidator.generateAttestationId();
      const id2 = integrityValidator.generateAttestationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^att_\d+_[a-f0-9]{8}$/);
    });

    it('should generate unique consensus IDs', () => {
      const id1 = integrityValidator.generateConsensusId('exec1', 'step1');
      const id2 = integrityValidator.generateConsensusId('exec2', 'step2');

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cons_exec1_step1_[a-f0-9]{8}$/);
      expect(id2).toMatch(/^cons_exec2_step2_[a-f0-9]{8}$/);
    });

    it('should get validation metrics', () => {
      const metrics = integrityValidator.getValidationMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.moduleEndpoints).toBeDefined();
      expect(metrics.consensusVotes).toBeDefined();
      expect(metrics.attestationCache).toBeDefined();
      expect(metrics.config).toBeDefined();
    });

    it('should calculate consensus threshold correctly', () => {
      expect(integrityValidator.calculateConsensusThreshold('payment')).toBe(4);
      expect(integrityValidator.calculateConsensusThreshold('governance')).toBe(3);
      expect(integrityValidator.calculateConsensusThreshold('licensing')).toBe(3);
      expect(integrityValidator.calculateConsensusThreshold('unknown')).toBe(3);
    });
  });
});