/**
 * Stress Testing Tests
 * Tests for stress testing capabilities with parallel events
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFlowTester } from '../services/DataFlowTester.mjs';

describe('Stress Testing Capabilities', () => {
  let dataFlowTester;

  beforeEach(() => {
    dataFlowTester = new DataFlowTester();
  });

  it('should run stress test with ≥1000 parallel events and ≤5% error rate', async () => {
    const eventCount = 1000;
    const stressResult = await dataFlowTester.runStressTests(eventCount);

    expect(stressResult.eventCount).toBe(eventCount);
    expect(stressResult.results.errorRate).toBeLessThanOrEqual(0.05); // ≤5%
    expect(stressResult.passed).toBe(true);
    expect(stressResult.results.throughput).toBeGreaterThan(0);
    expect(stressResult.results.completedEvents + stressResult.results.failedEvents).toBe(eventCount);
  });

  it('should generate stress test benchmark artifact', async () => {
    const eventCount = 100; // Smaller count for faster test
    const stressResult = await dataFlowTester.runStressTests(eventCount);
    const artifact = await dataFlowTester.generateArtifacts('stress_benchmark', stressResult);

    expect(artifact.path).toContain('artifacts/stress/benchmark-');
    expect(artifact.data.testConfiguration.eventCount).toBe(eventCount);
    expect(artifact.data.testResult).toBe('PASSED');
    expect(parseFloat(artifact.data.performance.errorRatePercent)).toBeLessThanOrEqual(5.0);
    expect(artifact.data.results).toBeDefined();
    expect(artifact.data.benchmarks).toBeDefined();
  });

  it('should calculate latency benchmarks correctly', async () => {
    const eventCount = 200;
    const stressResult = await dataFlowTester.runStressTests(eventCount);

    expect(stressResult.benchmarks.p50Latency).toBeDefined();
    expect(stressResult.benchmarks.p95Latency).toBeDefined();
    expect(stressResult.benchmarks.p99Latency).toBeDefined();
    expect(stressResult.benchmarks.maxLatency).toBeDefined();
    expect(stressResult.benchmarks.minLatency).toBeDefined();

    // Latency ordering should be correct
    expect(stressResult.benchmarks.p50Latency).toBeLessThanOrEqual(stressResult.benchmarks.p95Latency);
    expect(stressResult.benchmarks.p95Latency).toBeLessThanOrEqual(stressResult.benchmarks.p99Latency);
    expect(stressResult.benchmarks.p99Latency).toBeLessThanOrEqual(stressResult.benchmarks.maxLatency);
    expect(stressResult.benchmarks.minLatency).toBeLessThanOrEqual(stressResult.benchmarks.p50Latency);
  });

  it('should handle different parallelism levels', async () => {
    const eventCount = 300;
    const parallelism = 50;
    
    const stressResult = await dataFlowTester.runStressTests(eventCount, parallelism);

    expect(stressResult.eventCount).toBe(eventCount);
    expect(stressResult.parallelism).toBe(parallelism);
    expect(stressResult.results.errorRate).toBeLessThanOrEqual(0.05);
  });

  it('should track throughput and performance metrics', async () => {
    const eventCount = 150;
    const stressResult = await dataFlowTester.runStressTests(eventCount);

    expect(stressResult.results.throughput).toBeGreaterThan(0);
    expect(stressResult.duration).toBeGreaterThan(0);
    expect(stressResult.results.latencies.length).toBeGreaterThan(0);
    
    // Throughput should be events per second
    const expectedThroughput = eventCount / (stressResult.duration / 1000);
    expect(Math.abs(stressResult.results.throughput - expectedThroughput)).toBeLessThan(1);
  });

  it('should store stress test results for analysis', async () => {
    const eventCount = 100;
    const stressResult = await dataFlowTester.runStressTests(eventCount);

    // Check that stress test result is stored
    const storedResult = dataFlowTester.stressTestResults.get(stressResult.stressTestId);
    expect(storedResult).toBeDefined();
    expect(storedResult.stressTestId).toBe(stressResult.stressTestId);
    expect(storedResult.eventCount).toBe(eventCount);
  });

  it('should handle error scenarios gracefully', async () => {
    const eventCount = 50;
    const stressResult = await dataFlowTester.runStressTests(eventCount);

    // Even with some errors, test should complete
    expect(stressResult.results.completedEvents + stressResult.results.failedEvents).toBe(eventCount);
    expect(stressResult.results.errors).toBeDefined();
    
    // Error rate should be reasonable (simulated 2% failure rate)
    expect(stressResult.results.errorRate).toBeLessThan(0.1); // Less than 10%
  });

  it('should provide comprehensive stress test statistics', () => {
    const stats = dataFlowTester.getFlowStatistics();
    
    expect(stats.stress).toBeDefined();
    expect(stats.stress.totalTests).toBeDefined();
    expect(stats.stress.passedTests).toBeDefined();
    expect(stats.stress.averageErrorRate).toBeDefined();
    expect(stats.stress.averageThroughput).toBeDefined();
  });

  it('should generate flow validation artifacts during stress test', async () => {
    // This test verifies that individual flow artifacts can be generated
    const testData = Buffer.from('Test flow artifact data');
    const flowResult = await dataFlowTester.testInputFlow(testData);
    const artifact = await dataFlowTester.generateArtifacts('flow_validation', flowResult);

    expect(artifact.path).toContain('artifacts/flows/input-');
    expect(artifact.data.flowType).toBe('input');
    expect(artifact.data.stepDetails).toHaveLength(5);
    expect(artifact.data.validation).toBeDefined();
    expect(artifact.data.flowMetadata.totalSteps).toBe(5);
  });
});