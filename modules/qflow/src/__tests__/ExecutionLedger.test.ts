/**
 * Execution Ledger Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executionLedger, ExecutionLedger, ExecutionRecord, VectorClock } from '../core/ExecutionLedger.js';

describe('ExecutionLedger', () => {
  let ledger: ExecutionLedger;

  beforeEach(async () => {
    // Create a new instance for each test to avoid state pollution
    ledger = new ExecutionLedger();
    
    // Mock environment variables for testing
    process.env.NODE_ID = 'test-node-1';
    
    await ledger.initialize();
  });

  afterEach(async () => {
    await ledger.shutdown();
    delete process.env.NODE_ID;
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newLedger = new ExecutionLedger();
      await expect(newLedger.initialize()).resolves.not.toThrow();
      expect(newLedger.isReady()).toBe(true);
      await newLedger.shutdown();
    });

    it('should not initialize twice', async () => {
      await ledger.initialize(); // Second call should not throw
      expect(ledger.isReady()).toBe(true);
    });

    it('should handle missing NODE_ID environment variable', async () => {
      delete process.env.NODE_ID;
      const newLedger = new ExecutionLedger();
      await expect(newLedger.initialize()).resolves.not.toThrow();
      await newLedger.shutdown();
    });
  });

  describe('record appending', () => {
    it('should append first record with genesis hash', async () => {
      const recordData = {
        execId: 'exec-001',
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      };

      const record = await ledger.appendRecord(recordData);

      expect(record).toBeDefined();
      expect(record.execId).toBe(recordData.execId);
      expect(record.stepId).toBe(recordData.stepId);
      expect(record.prevHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
      expect(record.signature).toBeDefined();
      expect(record.vectorClock).toBeDefined();
      expect(record.recordHash).toBeDefined();
    });

    it('should append subsequent records with proper hash chain', async () => {
      const execId = 'exec-002';
      
      // First record
      const record1 = await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      // Second record
      const record2 = await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      expect(record2.prevHash).toBe(record1.recordHash);
      expect(record2.vectorClock['test-node-1']).toBe(2);
    });

    it('should handle multiple executions independently', async () => {
      const record1 = await ledger.appendRecord({
        execId: 'exec-003',
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const record2 = await ledger.appendRecord({
        execId: 'exec-004',
        stepId: 'step-001',
        payloadCID: 'QmTest456',
        actor: 'user-456',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      // Both should have genesis hash as they're different executions
      expect(record1.prevHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
      expect(record2.prevHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('should fail when not initialized', async () => {
      const uninitializedLedger = new ExecutionLedger();
      
      await expect(uninitializedLedger.appendRecord({
        execId: 'exec-005',
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      })).rejects.toThrow('Execution Ledger not initialized');
    });
  });

  describe('record retrieval', () => {
    it('should retrieve execution records', async () => {
      const execId = 'exec-006';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const records = ledger.getExecutionRecords(execId);
      
      expect(records).toHaveLength(2);
      expect(records[0].record.stepId).toBe('step-001');
      expect(records[1].record.stepId).toBe('step-002');
      expect(records[0].index).toBe(0);
      expect(records[1].index).toBe(1);
    });

    it('should return empty array for non-existent execution', () => {
      const records = ledger.getExecutionRecords('non-existent');
      expect(records).toEqual([]);
    });
  });

  describe('ledger validation', () => {
    it('should validate empty ledger', async () => {
      const validation = await ledger.validateLedger('empty-exec');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain('No entries found');
    });

    it('should validate single record ledger', async () => {
      const execId = 'exec-007';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const validation = await ledger.validateLedger(execId);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.chainIntegrity).toBe(true);
      expect(validation.signatureValidity).toBe(true);
    });

    it('should validate multi-record ledger', async () => {
      const execId = 'exec-008';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const validation = await ledger.validateLedger(execId);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.chainIntegrity).toBe(true);
      expect(validation.signatureValidity).toBe(true);
      expect(validation.causalConsistency).toBe(true);
    });

    it('should detect hash chain corruption', async () => {
      const execId = 'exec-009';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      // Manually corrupt the ledger
      const records = ledger.getExecutionRecords(execId);
      if (records.length > 0) {
        records[0].record.recordHash = 'corrupted-hash';
      }

      const validation = await ledger.validateLedger(execId);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.chainIntegrity).toBe(false);
    });
  });

  describe('deterministic replay', () => {
    it('should start replay for valid ledger', async () => {
      const execId = 'exec-010';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const replayState = await ledger.startReplay(execId);
      
      expect(replayState).toBeDefined();
      expect(replayState.execId).toBe(execId);
      expect(replayState.currentStepIndex).toBe(0);
      expect(replayState.isReplaying).toBe(true);
      expect(replayState.replayStartTime).toBeDefined();
    });

    it('should fail to start replay for empty ledger', async () => {
      await expect(ledger.startReplay('empty-exec')).rejects.toThrow('No ledger entries found');
    });

    it('should get next replay record in sequence', async () => {
      const execId = 'exec-011';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.startReplay(execId);
      
      const record1 = ledger.getNextReplayRecord(execId);
      expect(record1).toBeDefined();
      expect(record1?.stepId).toBe('step-001');
      
      const record2 = ledger.getNextReplayRecord(execId);
      expect(record2).toBeDefined();
      expect(record2?.stepId).toBe('step-002');
      
      const record3 = ledger.getNextReplayRecord(execId);
      expect(record3).toBeNull();
    });

    it('should complete replay correctly', async () => {
      const execId = 'exec-012';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.startReplay(execId);
      ledger.getNextReplayRecord(execId);
      ledger.completeReplay(execId);
      
      const replayState = ledger.getReplayState(execId);
      expect(replayState?.isReplaying).toBe(false);
    });

    it('should handle replay state correctly', async () => {
      const execId = 'exec-013';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      // No replay state initially
      expect(ledger.getReplayState(execId)).toBeNull();
      
      // Start replay
      await ledger.startReplay(execId);
      const replayState = ledger.getReplayState(execId);
      expect(replayState).toBeDefined();
      expect(replayState?.isReplaying).toBe(true);
      
      // Complete replay
      ledger.completeReplay(execId);
      const finalState = ledger.getReplayState(execId);
      expect(finalState?.isReplaying).toBe(false);
    });
  });

  describe('vector clocks', () => {
    it('should increment vector clock for each record', async () => {
      const execId = 'exec-014';
      const nodeId = 'test-node-1';
      
      const record1 = await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId,
        timestamp: new Date().toISOString()
      });

      const record2 = await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-123',
        nodeId,
        timestamp: new Date().toISOString()
      });

      expect(record1.vectorClock[nodeId]).toBe(1);
      expect(record2.vectorClock[nodeId]).toBe(2);
    });

    it('should handle multiple nodes in vector clock', async () => {
      const execId = 'exec-015';
      
      const record1 = await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'node-1',
        timestamp: new Date().toISOString()
      });

      const record2 = await ledger.appendRecord({
        execId,
        stepId: 'step-002',
        payloadCID: 'QmTest456',
        actor: 'user-456',
        nodeId: 'node-2',
        timestamp: new Date().toISOString()
      });

      expect(record1.vectorClock['node-1']).toBe(1);
      expect(record2.vectorClock['node-2']).toBe(1);
    });
  });

  describe('statistics and export/import', () => {
    it('should provide accurate statistics', async () => {
      const execId1 = 'exec-016';
      const execId2 = 'exec-017';
      
      await ledger.appendRecord({
        execId: execId1,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.appendRecord({
        execId: execId2,
        stepId: 'step-001',
        payloadCID: 'QmTest456',
        actor: 'user-456',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const stats = ledger.getStatistics();
      
      expect(stats.totalExecutions).toBe(2);
      expect(stats.totalRecords).toBe(2);
      expect(stats.activeReplays).toBe(0);
      expect(stats.nodeCount).toBeGreaterThan(0);
    });

    it('should export and import ledger data', async () => {
      const execId = 'exec-018';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      // Export data
      const exportData = ledger.exportLedger();
      expect(exportData).toBeDefined();
      expect(exportData.ledgers).toBeDefined();
      expect(exportData.vectorClocks).toBeDefined();
      expect(exportData.timestamp).toBeDefined();

      // Create new ledger and import
      const newLedger = new ExecutionLedger();
      await newLedger.initialize();
      newLedger.importLedger(exportData);
      
      const importedRecords = newLedger.getExecutionRecords(execId);
      expect(importedRecords).toHaveLength(1);
      expect(importedRecords[0].record.stepId).toBe('step-001');
      
      await newLedger.shutdown();
    });

    it('should export specific execution', async () => {
      const execId = 'exec-019';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      const exportData = ledger.exportLedger(execId);
      
      expect(exportData.execId).toBe(execId);
      expect(exportData.entries).toHaveLength(1);
      expect(exportData.entries[0].record.stepId).toBe('step-001');
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      const execId = 'exec-020';
      
      await ledger.appendRecord({
        execId,
        stepId: 'step-001',
        payloadCID: 'QmTest123',
        actor: 'user-123',
        nodeId: 'test-node-1',
        timestamp: new Date().toISOString()
      });

      await ledger.startReplay(execId);
      
      expect(ledger.isReady()).toBe(true);
      
      await ledger.shutdown();
      expect(ledger.isReady()).toBe(false);
      
      // Replay should be completed
      const replayState = ledger.getReplayState(execId);
      expect(replayState?.isReplaying).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      const uninitializedLedger = new ExecutionLedger();
      await expect(uninitializedLedger.shutdown()).resolves.not.toThrow();
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton instance', () => {
      expect(executionLedger).toBeInstanceOf(ExecutionLedger);
    });
  });
});