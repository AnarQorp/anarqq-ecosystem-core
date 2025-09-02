/**
 * Execution Ledger Tests
 * Tests for execution ledger verification and hash-chain validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataFlowTester } from '../services/DataFlowTester.mjs';

describe('Execution Ledger Verification', () => {
  let dataFlowTester;

  beforeEach(() => {
    dataFlowTester = new DataFlowTester();
  });

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
    expect(record.cid).toBeDefined(); // IPFS CID
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
    expect(verification1.lastRecordCID).toBeDefined();

    // Verify ledger for second flow
    const verification2 = await dataFlowTester.verifyExecutionLedger(flow2.flowId);
    expect(verification2.chainValid).toBe(true);
    expect(verification2.totalRecords).toBeGreaterThan(0);
    expect(verification2.orphanRecords).toHaveLength(0);
  });

  it('should maintain vector clocks for distributed execution tracking', async () => {
    const testData = Buffer.from('Test vector clock data');
    const initialClock = dataFlowTester.vectorClocks.get(dataFlowTester.nodeId) || 0;
    
    await dataFlowTester.testInputFlow(testData);

    const finalClock = dataFlowTester.vectorClocks.get(dataFlowTester.nodeId);
    expect(finalClock).toBeGreaterThan(initialClock);
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
    expect(artifact.data.totalRecords).toBeGreaterThan(0);
    expect(artifact.data.orphanRecords).toBe(0);
  });

  it('should generate chain artifact with execution records', async () => {
    const testData = Buffer.from('Test chain data');
    const flowResult = await dataFlowTester.testInputFlow(testData);
    
    const verification = await dataFlowTester.verifyExecutionLedger(flowResult.flowId);
    const artifact = await dataFlowTester.generateArtifacts('ledger_chain', verification);

    expect(artifact.path).toContain('artifacts/ledger/chain-');
    expect(artifact.data.executionId).toBe(verification.executionId);
    expect(artifact.data.chainRecords).toBeDefined();
    expect(artifact.data.chainRecords.length).toBeGreaterThan(0);
    expect(artifact.data.chainMetadata.chainValid).toBe(true);
    expect(artifact.data.chainMetadata.totalRecords).toBeGreaterThan(0);
  });

  it('should handle hash chain validation correctly', async () => {
    // Create multiple executions to build a chain
    const executions = [];
    for (let i = 0; i < 3; i++) {
      const testData = Buffer.from(`Test data ${i}`);
      const result = await dataFlowTester.testInputFlow(testData);
      executions.push(result);
    }

    // Verify each execution's ledger
    for (const execution of executions) {
      const verification = await dataFlowTester.verifyExecutionLedger(execution.flowId);
      expect(verification.chainValid).toBe(true);
      expect(verification.brokenAt).toBeNull();
    }

    // Verify overall ledger integrity
    const allRecords = Array.from(dataFlowTester.executionLedger.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Check hash chain continuity across all records
    let previousHash = null;
    for (const record of allRecords) {
      expect(record.previousHash).toBe(previousHash);
      previousHash = record.hash;
    }
  });

  it('should track vector clocks across multiple nodes', async () => {
    const testData = Buffer.from('Multi-node test data');
    
    // Simulate multiple node operations
    const nodeId1 = dataFlowTester.nodeId;
    const clock1Before = dataFlowTester.vectorClocks.get(nodeId1) || 0;
    
    await dataFlowTester.testInputFlow(testData);
    
    const clock1After = dataFlowTester.vectorClocks.get(nodeId1);
    expect(clock1After).toBeGreaterThan(clock1Before);
    
    // Verify vector clock structure in ledger records
    const ledgerRecords = Array.from(dataFlowTester.executionLedger.values());
    const latestRecord = ledgerRecords[ledgerRecords.length - 1];
    
    expect(latestRecord.vectorClock).toBeDefined();
    expect(latestRecord.vectorClock.nodeId).toBe(nodeId1);
    expect(latestRecord.vectorClock.clock).toBe(clock1After);
  });

  it('should provide comprehensive ledger statistics', () => {
    const stats = dataFlowTester.getFlowStatistics();
    
    expect(stats.ledger).toBeDefined();
    expect(stats.ledger.totalRecords).toBeDefined();
    expect(stats.ledger.uniqueExecutions).toBeDefined();
    expect(stats.ledger.nodeParticipation).toBeDefined();
    expect(stats.nodeId).toBe(dataFlowTester.nodeId);
  });
});