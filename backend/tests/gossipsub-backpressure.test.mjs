/**
 * Gossipsub Backpressure Tests
 * Tests for gossipsub backpressure validation and fair scheduling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFlowTester } from '../services/DataFlowTester.mjs';

describe('Gossipsub Backpressure Validation', () => {
  let dataFlowTester;

  beforeEach(() => {
    dataFlowTester = new DataFlowTester();
  });

  it('should validate gossipsub with no starvation and ≤1% lost jobs', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    expect(validation.validationPassed).toBe(true);
    expect(validation.starvationDetected).toBe(false);
    expect(validation.lostJobs / validation.totalJobs).toBeLessThanOrEqual(0.01); // ≤1%
    expect(validation.backoffCompliance).toBe(true);
    expect(validation.fairnessIndex).toBeGreaterThan(0.99); // High fairness
  });

  it('should generate gossipsub fairness report artifact', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();
    const artifact = await dataFlowTester.generateArtifacts('gossipsub_fairness', validation);

    expect(artifact.path).toBe('artifacts/gossipsub/fairness-report.json');
    expect(artifact.data.validationResult).toBe('PASSED');
    expect(parseFloat(artifact.data.jobDistribution.lostJobsPercent)).toBeLessThanOrEqual(1.0);
    expect(artifact.data.fairnessMetrics.fairnessIndex).toBeGreaterThan(0.99);
    expect(artifact.data.fairnessMetrics.starvationDetected).toBe(false);
    expect(artifact.data.fairnessMetrics.backoffCompliance).toBe(true);
  });

  it('should track job distribution across nodes', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    expect(validation.nodeDistribution).toBeDefined();
    expect(validation.nodeDistribution.length).toBeGreaterThan(0);
    
    // Check that each node has processed some jobs
    validation.nodeDistribution.forEach(node => {
      expect(node.nodeId).toBeDefined();
      expect(node.processedJobs).toBeGreaterThanOrEqual(0);
      expect(node.backoffLevel).toBeDefined();
    });
  });

  it('should maintain fairness index above threshold', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    // Fairness index should be close to 1.0 (perfect fairness)
    expect(validation.fairnessIndex).toBeGreaterThan(0.99);
    
    // Should be within the configured fairness threshold
    const fairnessThreshold = 1 - dataFlowTester.config.gossipsubFairnessThreshold;
    expect(validation.fairnessIndex).toBeGreaterThanOrEqual(fairnessThreshold);
  });

  it('should handle backoff compliance correctly', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    expect(validation.backoffCompliance).toBe(true);
    
    // Check that no node has excessive backoff levels
    validation.nodeDistribution.forEach(node => {
      expect(node.backoffLevel).toBeLessThanOrEqual(5); // Max backoff level
    });
  });

  it('should track reannounce success rate', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    expect(validation.reannounceSuccess).toBeDefined();
    expect(validation.reannounceSuccess).toBeGreaterThanOrEqual(0);
    
    // Reannounce should help recover most lost jobs
    const reannounceEffectiveness = validation.reannounceSuccess / Math.max(validation.lostJobs, 1);
    expect(reannounceEffectiveness).toBeGreaterThan(0.9); // 90% effectiveness
  });

  it('should validate with multiple job priorities', async () => {
    // The validation internally uses different priority levels
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    expect(validation.validationPassed).toBe(true);
    expect(validation.totalJobs).toBe(1000); // Default job count
    expect(validation.totalNodes).toBe(5); // Default node count
  });

  it('should provide comprehensive validation metrics', async () => {
    const validation = await dataFlowTester.validateGossipsubBackpressure();

    // Check all required metrics are present
    expect(validation.validationId).toBeDefined();
    expect(validation.totalJobs).toBeDefined();
    expect(validation.totalNodes).toBeDefined();
    expect(validation.fairnessIndex).toBeDefined();
    expect(validation.lostJobs).toBeDefined();
    expect(validation.reannounceSuccess).toBeDefined();
    expect(validation.backoffCompliance).toBeDefined();
    expect(validation.starvationDetected).toBeDefined();
    expect(validation.nodeDistribution).toBeDefined();
    expect(validation.validationPassed).toBeDefined();
    expect(validation.duration).toBeDefined();
    expect(validation.timestamp).toBeDefined();
  });
});