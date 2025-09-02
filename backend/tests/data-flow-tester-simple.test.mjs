/**
 * Simple Data Flow Tester Tests
 * Basic tests for DataFlowTester functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('DataFlowTester Simple Tests', () => {
  let DataFlowTester;
  let dataFlowTester;

  beforeEach(async () => {
    // Dynamic import to avoid syntax issues
    const module = await import('../services/DataFlowTester.mjs');
    DataFlowTester = module.DataFlowTester;
    dataFlowTester = new DataFlowTester();
  });

  it('should create DataFlowTester instance', () => {
    expect(dataFlowTester).toBeDefined();
    expect(dataFlowTester.nodeId).toBeDefined();
    expect(dataFlowTester.config).toBeDefined();
  });

  it('should have proper configuration', () => {
    expect(dataFlowTester.config.flowTimeout).toBe(30000);
    expect(dataFlowTester.config.stressTestParallelism).toBe(1000);
    expect(dataFlowTester.config.maxErrorRate).toBe(0.05);
  });

  it('should generate unique IDs', () => {
    const flowId1 = dataFlowTester.generateFlowId();
    const flowId2 = dataFlowTester.generateFlowId();
    
    expect(flowId1).toBeDefined();
    expect(flowId2).toBeDefined();
    expect(flowId1).not.toBe(flowId2);
  });

  it('should hash data correctly', () => {
    const testData = 'test data';
    const hash1 = dataFlowTester.hashData(testData);
    const hash2 = dataFlowTester.hashData(testData);
    
    expect(hash1).toBeDefined();
    expect(hash1).toBe(hash2); // Same data should produce same hash
    expect(hash1).toHaveLength(64); // SHA256 hex length
  });

  it('should update vector clocks', () => {
    const eventId = 'test-event-123';
    const vectorClock = dataFlowTester.updateVectorClock(eventId);
    
    expect(vectorClock.nodeId).toBe(dataFlowTester.nodeId);
    expect(vectorClock.clock).toBe(1);
    expect(vectorClock.eventId).toBe(eventId);
  });

  it('should return health check', async () => {
    const health = await dataFlowTester.healthCheck();
    
    expect(health.status).toBe('healthy');
    expect(health.nodeId).toBe(dataFlowTester.nodeId);
    expect(health.activeFlows).toBe(0);
  });
});