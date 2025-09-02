/**
 * Qflow Deterministic Execution Ledger
 * 
 * Implements append-only log format with signed entries and vector clocks
 * for deterministic replay and Byzantine fault tolerance.
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface VectorClock {
  [nodeId: string]: number;
}

export interface ExecutionRecord {
  execId: string;
  stepId: string;
  prevHash: string;
  payloadCID: string;
  actor: string; // sQuid identity
  nodeId: string;
  timestamp: string;
  vectorClock: VectorClock;
  signature: string;
  recordHash?: string; // Computed hash of the record
}

export interface LedgerEntry {
  record: ExecutionRecord;
  index: number;
  verified: boolean;
  timestamp: string;
}

export interface ReplayState {
  execId: string;
  currentStepIndex: number;
  vectorClock: VectorClock;
  stateHash: string;
  isReplaying: boolean;
  replayStartTime: string;
}

export interface LedgerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  chainIntegrity: boolean;
  signatureValidity: boolean;
  causalConsistency: boolean;
}

/**
 * Deterministic Execution Ledger
 * Provides append-only log with cryptographic integrity and deterministic replay
 */
export class ExecutionLedger extends EventEmitter {
  private ledger: Map<string, LedgerEntry[]> = new Map(); // execId -> entries
  private vectorClocks: Map<string, VectorClock> = new Map(); // nodeId -> vector clock
  private replayStates: Map<string, ReplayState> = new Map(); // execId -> replay state
  private isInitialized = false;

  constructor() {
    super();
  }

  /**
   * Initialize the execution ledger
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[ExecutionLedger] 📚 Initializing Execution Ledger...');

    try {
      // Initialize vector clocks for known nodes
      const nodeId = process.env.NODE_ID || 'local-node';
      this.vectorClocks.set(nodeId, {});

      this.isInitialized = true;
      console.log('[ExecutionLedger] ✅ Execution Ledger initialized');

      // Emit initialization event
      qflowEventEmitter.emit('q.qflow.ledger.initialized.v1', {
        ledgerId: 'execution-ledger',
        nodeId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[ExecutionLedger] ❌ Failed to initialize:', error);
      throw new Error(`Execution Ledger initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }  
/**
   * Append a new execution record to the ledger
   */
  async appendRecord(record: Omit<ExecutionRecord, 'prevHash' | 'signature' | 'vectorClock'>): Promise<ExecutionRecord> {
    if (!this.isInitialized) {
      throw new Error('Execution Ledger not initialized');
    }

    const { execId, stepId, payloadCID, actor, nodeId, timestamp } = record;

    // Get or create ledger for this execution
    if (!this.ledger.has(execId)) {
      this.ledger.set(execId, []);
    }
    const executionLedger = this.ledger.get(execId)!;

    // Calculate previous hash
    const prevHash = executionLedger.length > 0 
      ? executionLedger[executionLedger.length - 1].record.recordHash || ''
      : '0000000000000000000000000000000000000000000000000000000000000000';

    // Update vector clock
    const vectorClock = this.updateVectorClock(nodeId);

    // Create the complete record
    const completeRecord: ExecutionRecord = {
      execId,
      stepId,
      prevHash,
      payloadCID,
      actor,
      nodeId,
      timestamp,
      vectorClock: { ...vectorClock },
      signature: '' // Will be set after hash calculation
    };

    // Calculate record hash
    const recordHash = this.calculateRecordHash(completeRecord);
    completeRecord.recordHash = recordHash;

    // Sign the record (mock signature for now)
    completeRecord.signature = this.signRecord(completeRecord);

    // Create ledger entry
    const entry: LedgerEntry = {
      record: completeRecord,
      index: executionLedger.length,
      verified: true, // In real implementation, this would be verified
      timestamp: new Date().toISOString()
    };

    // Append to ledger
    executionLedger.push(entry);

    console.log(`[ExecutionLedger] 📝 Appended record: ${execId}/${stepId} (index: ${entry.index})`);

    // Emit ledger append event
    qflowEventEmitter.emit('q.qflow.ledger.record.appended.v1', {
      execId,
      stepId,
      recordHash,
      index: entry.index,
      nodeId,
      timestamp: entry.timestamp
    });

    return completeRecord;
  }

  /**
   * Get execution records for a specific execution ID
   */
  getExecutionRecords(execId: string): LedgerEntry[] {
    return this.ledger.get(execId) || [];
  }

  /**
   * Validate ledger integrity for an execution
   */
  async validateLedger(execId: string): Promise<LedgerValidationResult> {
    const entries = this.ledger.get(execId) || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let chainIntegrity = true;
    let signatureValidity = true;
    let causalConsistency = true;

    if (entries.length === 0) {
      warnings.push('No entries found for execution');
      return {
        isValid: true,
        errors,
        warnings,
        chainIntegrity,
        signatureValidity,
        causalConsistency
      };
    }

    // Validate chain integrity
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const record = entry.record;

      // Verify record hash
      const { signature, ...recordWithoutSignature } = record;
      const expectedHash = this.calculateRecordHash(recordWithoutSignature);
      
      if (record.recordHash !== expectedHash) {
        errors.push(`Record hash mismatch at index ${i}: expected ${expectedHash}, got ${record.recordHash}`);
        chainIntegrity = false;
      }

      // Verify previous hash linkage
      if (i > 0) {
        const prevRecord = entries[i - 1].record;
        if (record.prevHash !== prevRecord.recordHash) {
          errors.push(`Previous hash mismatch at index ${i}: expected ${prevRecord.recordHash}, got ${record.prevHash}`);
          chainIntegrity = false;
        }
      } else {
        // First record should have genesis hash
        if (record.prevHash !== '0000000000000000000000000000000000000000000000000000000000000000') {
          errors.push(`Genesis record should have zero previous hash, got ${record.prevHash}`);
          chainIntegrity = false;
        }
      }

      // Verify signature (mock verification)
      const { signature: _, ...recordForSigning } = record;
      const expectedSignature = this.signRecord(recordForSigning);
      
      if (record.signature !== expectedSignature) {
        errors.push(`Signature verification failed at index ${i}`);
        signatureValidity = false;
      }
    }

    // Validate causal consistency using vector clocks
    const vectorClockHistory: VectorClock[] = [];
    for (const entry of entries) {
      const currentClock = entry.record.vectorClock;
      
      // Check if current clock is causally consistent with history
      for (const prevClock of vectorClockHistory) {
        if (!this.isCausallyConsistent(prevClock, currentClock)) {
          warnings.push(`Potential causal inconsistency detected at index ${entry.index}`);
          causalConsistency = false;
        }
      }
      
      vectorClockHistory.push(currentClock);
    }

    const isValid = errors.length === 0;

    console.log(`[ExecutionLedger] 🔍 Validation complete for ${execId}: ${isValid ? 'VALID' : 'INVALID'}`);
    if (errors.length > 0) {
      console.log(`  - ${errors.length} errors found`);
    }
    if (warnings.length > 0) {
      console.log(`  - ${warnings.length} warnings found`);
    }

    return {
      isValid,
      errors,
      warnings,
      chainIntegrity,
      signatureValidity,
      causalConsistency
    };
  }  /**

   * Start deterministic replay for an execution
   */
  async startReplay(execId: string): Promise<ReplayState> {
    const entries = this.ledger.get(execId) || [];
    
    if (entries.length === 0) {
      throw new Error(`No ledger entries found for execution ${execId}`);
    }

    // Validate ledger before replay
    const validation = await this.validateLedger(execId);
    if (!validation.isValid) {
      throw new Error(`Cannot replay invalid ledger: ${validation.errors.join(', ')}`);
    }

    const replayState: ReplayState = {
      execId,
      currentStepIndex: 0,
      vectorClock: {},
      stateHash: this.calculateStateHash(execId, 0),
      isReplaying: true,
      replayStartTime: new Date().toISOString()
    };

    this.replayStates.set(execId, replayState);

    console.log(`[ExecutionLedger] 🔄 Started replay for ${execId} (${entries.length} records)`);

    // Emit replay start event
    qflowEventEmitter.emit('q.qflow.ledger.replay.started.v1', {
      execId,
      recordCount: entries.length,
      timestamp: replayState.replayStartTime
    });

    return replayState;
  }

  /**
   * Get next record in replay sequence
   */
  getNextReplayRecord(execId: string): ExecutionRecord | null {
    const replayState = this.replayStates.get(execId);
    if (!replayState || !replayState.isReplaying) {
      return null;
    }

    const entries = this.ledger.get(execId) || [];
    if (replayState.currentStepIndex >= entries.length) {
      return null;
    }

    const record = entries[replayState.currentStepIndex].record;
    replayState.currentStepIndex++;
    replayState.vectorClock = { ...record.vectorClock };
    replayState.stateHash = this.calculateStateHash(execId, replayState.currentStepIndex);

    console.log(`[ExecutionLedger] ⏭️ Replay step ${replayState.currentStepIndex}/${entries.length}: ${record.stepId}`);

    return record;
  }

  /**
   * Complete replay for an execution
   */
  completeReplay(execId: string): void {
    const replayState = this.replayStates.get(execId);
    if (!replayState) {
      return;
    }

    replayState.isReplaying = false;
    
    console.log(`[ExecutionLedger] ✅ Completed replay for ${execId}`);

    // Emit replay complete event
    qflowEventEmitter.emit('q.qflow.ledger.replay.completed.v1', {
      execId,
      finalStepIndex: replayState.currentStepIndex,
      finalStateHash: replayState.stateHash,
      replayDuration: Date.now() - new Date(replayState.replayStartTime).getTime(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current replay state
   */
  getReplayState(execId: string): ReplayState | null {
    return this.replayStates.get(execId) || null;
  }

  /**
   * Calculate record hash
   */
  private calculateRecordHash(record: Omit<ExecutionRecord, 'signature'>): string {
    const hashInput = [
      record.execId,
      record.stepId,
      record.prevHash,
      record.payloadCID,
      record.actor,
      record.nodeId,
      record.timestamp,
      JSON.stringify(record.vectorClock)
    ].join('||');

    return createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Sign a record (mock implementation)
   */
  private signRecord(record: Omit<ExecutionRecord, 'signature'>): string {
    // In a real implementation, this would use proper cryptographic signing
    // For now, we'll create a mock signature based on the record hash
    const recordHash = record.recordHash || this.calculateRecordHash(record);
    const signatureInput = `${recordHash}:${record.actor}:${record.nodeId}`;
    return createHash('sha256').update(signatureInput).digest('hex').substring(0, 32);
  }

  /**
   * Update vector clock for a node
   */
  private updateVectorClock(nodeId: string): VectorClock {
    let vectorClock = this.vectorClocks.get(nodeId) || {};
    
    // Increment this node's clock
    vectorClock[nodeId] = (vectorClock[nodeId] || 0) + 1;
    
    // Update stored vector clock
    this.vectorClocks.set(nodeId, vectorClock);
    
    return vectorClock;
  }

  /**
   * Check if two vector clocks are causally consistent
   */
  private isCausallyConsistent(clock1: VectorClock, clock2: VectorClock): boolean {
    // Simple causal consistency check
    // In a real implementation, this would be more sophisticated
    for (const nodeId in clock1) {
      if (clock2[nodeId] && clock2[nodeId] < clock1[nodeId]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate state hash at a specific point in execution
   */
  private calculateStateHash(execId: string, stepIndex: number): string {
    const entries = this.ledger.get(execId) || [];
    const relevantEntries = entries.slice(0, stepIndex);
    
    const stateInput = relevantEntries
      .map(entry => entry.record.recordHash)
      .join('||');
    
    return createHash('sha256').update(stateInput).digest('hex');
  }

  /**
   * Get ledger statistics
   */
  getStatistics(): {
    totalExecutions: number;
    totalRecords: number;
    activeReplays: number;
    nodeCount: number;
  } {
    let totalRecords = 0;
    for (const entries of this.ledger.values()) {
      totalRecords += entries.length;
    }

    const activeReplays = Array.from(this.replayStates.values())
      .filter(state => state.isReplaying).length;

    return {
      totalExecutions: this.ledger.size,
      totalRecords,
      activeReplays,
      nodeCount: this.vectorClocks.size
    };
  }

  /**
   * Export ledger data for persistence
   */
  exportLedger(execId?: string): any {
    if (execId) {
      return {
        execId,
        entries: this.ledger.get(execId) || [],
        vectorClock: this.vectorClocks.get(execId)
      };
    }

    const exportData: any = {
      ledgers: {},
      vectorClocks: Object.fromEntries(this.vectorClocks),
      timestamp: new Date().toISOString()
    };

    for (const [execId, entries] of this.ledger) {
      exportData.ledgers[execId] = entries;
    }

    return exportData;
  }

  /**
   * Import ledger data from persistence
   */
  importLedger(data: any): void {
    if (data.ledgers) {
      for (const [execId, entries] of Object.entries(data.ledgers)) {
        this.ledger.set(execId, entries as LedgerEntry[]);
      }
    }

    if (data.vectorClocks) {
      for (const [nodeId, clock] of Object.entries(data.vectorClocks)) {
        this.vectorClocks.set(nodeId, clock as VectorClock);
      }
    }

    console.log(`[ExecutionLedger] 📥 Imported ledger data: ${Object.keys(data.ledgers || {}).length} executions`);
  }

  /**
   * Shutdown the execution ledger
   */
  async shutdown(): Promise<void> {
    // Stop any active replays
    for (const [execId, replayState] of this.replayStates) {
      if (replayState.isReplaying) {
        this.completeReplay(execId);
      }
    }

    this.isInitialized = false;
    console.log('[ExecutionLedger] 🛑 Execution Ledger shutdown complete');
  }

  /**
   * Check if ledger is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const executionLedger = new ExecutionLedger();