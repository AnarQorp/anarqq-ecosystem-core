/**
 * Deterministic Replay Tests
 * Tests for deterministic replay system with divergence detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFlowTester } from '../services/DataFlowTester.mjs';

describe('Deterministic Replay System', () => {
  let dataFlowTester;

  beforeEach(() => {
    dataFlowTester = new DataFlowTester();
  });

  it('should perform deterministic replay with <1% divergence', async () => {
    const testData = Buffer.from('Test replay data');
    const originalFlow = await dataFlowTester.testInputFlow(testData);

    const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);

    expect(replayResult.deterministic).toBe(true);
    expect(replayResult.divergenceAt).toBeNull();
    expect(replayResult.stepComparisons.divergencePercent).toBeLessThan(0.01); // <1%
    expect(replayResult.timingAnalysis.timingToleranceMet).toBe(true);
    expect(replayResult.replayId).toBeDefined();
    expect(replayResult.originalExecutionId).toBe(originalFlow.flowId);
  });

  it('should track timing differences within ±10% tolerance', async () => {
    const testData = Buffer.from('Test timing data');
    const originalFlow = await dataFlowTester.testInputFlow(testData);

    const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);

    const originalDuration = replayResult.timingAnalysis.originalDuration;
    const replayDuration = replayResult.timingAnalysis.replayDuration;
    const timingDifference = Math.abs(replayDuration - originalDuration);
    const timingTolerancePercent = timingDifference / originalDuration;

    expect(timingTolerancePercent).toBeLessThanOrEqual(0.10); // ±10%
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
    expect(artifact.data.timingAnalysis).toBeDefined();
    expect(artifact.data.replayMetrics).toBeDefined();
  });

  it('should compare execution results accurately', async () => {
    const testData = Buffer.from('Test comparison data');
    const originalFlow = await dataFlowTester.testInputFlow(testData);

    const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);

    expect(replayResult.stepComparisons).toBeDefined();
    expect(replayResult.stepComparisons.originalSteps).toBeDefined();
    expect(replayResult.stepComparisons.replaySteps).toBeDefined();
    expect(replayResult.stepComparisons.divergencePercent).toBeDefined();
    
    // Should have same number of steps
    expect(replayResult.stepComparisons.originalSteps).toBe(replayResult.stepComparisons.replaySteps);
  });

  it('should handle multiple replays of the same execution', async () => {
    const testData = Buffer.from('Test multiple replays');
    const originalFlow = await dataFlowTester.testInputFlow(testData);

    // Perform multiple replays
    const replay1 = await dataFlowTester.deterministicReplay(originalFlow.flowId);
    const replay2 = await dataFlowTester.deterministicReplay(originalFlow.flowId);

    // Both replays should be deterministic
    expect(replay1.deterministic).toBe(true);
    expect(replay2.deterministic).toBe(true);

    // Replay IDs should be different
    expect(replay1.replayId).not.toBe(replay2.replayId);

    // Both should reference the same original execution
    expect(replay1.originalExecutionId).toBe(originalFlow.flowId);
    expect(replay2.originalExecutionId).toBe(originalFlow.flowId);
  });

  it('should store replay results for analysis', async () => {
    const testData = Buffer.from('Test replay storage');
    const originalFlow = await dataFlowTester.testInputFlow(testData);

    const replayResult = await dataFlowTester.deterministicReplay(originalFlow.flowId);

    // Check that replay result is stored
    const storedReplay = dataFlowTester.replayResults.get(replayResult.replayId);
    expect(storedReplay).toBeDefined();
    expect(storedReplay.replayId).toBe(replayResult.replayId);
    expect(storedReplay.originalExecutionId).toBe(originalFlow.flowId);
  });

  it('should provide replay statistics', () => {
    const stats = dataFlowTester.getFlowStatistics();
    
    expect(stats.replay).toBeDefined();
    expect(stats.replay.totalReplays).toBeDefined();
    expect(stats.replay.deterministicReplays).toBeDefined();
    expect(stats.replay.averageDivergence).toBeDefined();
  });

  it('should handle replay of non-existent execution', async () => {
    const nonExistentId = 'flow_nonexistent_123456';

    await expect(dataFlowTester.deterministicReplay(nonExistentId))
      .rejects.toThrow('Execution not found in ledger');
  });
});