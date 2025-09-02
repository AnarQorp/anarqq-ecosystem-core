/**
 * CRDT State Management with IPFS Blocks
 * 
 * Implements CRDT (Conflict-free Replicated Data Types) support for concurrent
 * state operations with IPFS block storage and vector clock causal ordering
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ipfsStateStorage } from './IPFSStateStorage.js';
import { ExecutionState } from '../models/FlowDefinition.js';

export interface VectorClock {
  [nodeId: string]: number;
}

export interface CRDTOperation {
  operationId: string;
  type: 'set' | 'delete' | 'increment' | 'decrement' | 'append' | 'merge';
  path: string; // JSONPath to the field being modified
  value: any;
  timestamp: string;
  nodeId: string;
  vectorClock: VectorClock;
  causality: string[]; // List of operation IDs this operation depends on
}

export interface CRDTState {
  executionId: string;
  baseState: ExecutionState;
  operations: CRDTOperation[];
  vectorClock: VectorClock;
  lastCompacted: string;
  conflictResolutions: ConflictResolution[];
}

export interface ConflictResolution {
  conflictId: string;
  operationIds: string[];
  resolutionStrategy: 'last-write-wins' | 'merge' | 'custom';
  resolvedValue: any;
  resolvedAt: string;
  resolvedBy: string;
}

export interface StateCompaction {
  compactionId: string;
  executionId: string;
  beforeOperationCount: number;
  afterOperationCount: number;
  compactedState: ExecutionState;
  compactedAt: string;
  ipfsCid: string;
}

export interface ConcurrentStateUpdate {
  executionId: string;
  nodeId: string;
  operations: CRDTOperation[];
  vectorClock: VectorClock;
  timestamp: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: {
    operationId1: string;
    operationId2: string;
    path: string;
    conflictType: 'concurrent-write' | 'causal-violation' | 'type-mismatch';
    description: string;
  }[];
}

/**
 * CRDT State Manager for distributed concurrent state operations
 */
export class CRDTStateManager extends EventEmitter {
  private crdtStates = new Map<string, CRDTState>();
  private nodeId: string;
  private vectorClocks = new Map<string, VectorClock>();
  private operationLog = new Map<string, CRDTOperation[]>();
  private compactionHistory = new Map<string, StateCompaction[]>();
  private conflictTelemetry: ConflictResolution[] = [];

  constructor(nodeId?: string) {
    super();
    this.nodeId = nodeId || `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.setupPeriodicCompaction();
  }

  /**
   * Apply CRDT operation to state
   */
  async applyOperation(
    executionId: string,
    operation: Omit<CRDTOperation, 'operationId' | 'nodeId' | 'vectorClock' | 'timestamp'>
  ): Promise<string> {
    try {
      // Generate operation ID and metadata
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const timestamp = new Date().toISOString();
      
      // Get or create vector clock for this execution
      let vectorClock = this.vectorClocks.get(executionId) || {};
      vectorClock[this.nodeId] = (vectorClock[this.nodeId] || 0) + 1;
      this.vectorClocks.set(executionId, vectorClock);

      // Create full operation
      const fullOperation: CRDTOperation = {
        ...operation,
        operationId,
        nodeId: this.nodeId,
        vectorClock: { ...vectorClock },
        timestamp
      };

      // Get or create CRDT state
      let crdtState = this.crdtStates.get(executionId);
      if (!crdtState) {
        // Load base state from IPFS if available
        let baseState: ExecutionState;
        try {
          baseState = await ipfsStateStorage.loadState(executionId);
        } catch (error) {
          // Create default state if not found
          baseState = {
            executionId,
            flowId: 'unknown',
            status: 'pending',
            currentStep: '',
            completedSteps: [],
            failedSteps: [],
            context: {
              triggeredBy: 'system',
              triggerType: 'manual',
              inputData: {},
              variables: {},
              permissions: []
            },
            startTime: timestamp,
            checkpoints: [],
            nodeAssignments: {}
          };
        }

        crdtState = {
          executionId,
          baseState,
          operations: [],
          vectorClock: { ...vectorClock },
          lastCompacted: timestamp,
          conflictResolutions: []
        };
      }

      // Add operation to log
      if (!this.operationLog.has(executionId)) {
        this.operationLog.set(executionId, []);
      }
      this.operationLog.get(executionId)!.push(fullOperation);

      // Add operation to CRDT state
      crdtState.operations.push(fullOperation);
      crdtState.vectorClock = { ...vectorClock };

      // Detect and resolve conflicts
      const conflictResult = await this.detectConflicts(executionId, fullOperation);
      if (conflictResult.hasConflicts) {
        await this.resolveConflicts(executionId, conflictResult.conflicts);
      }

      // Apply operation to current state
      const updatedState = await this.applyOperationToState(crdtState.baseState, fullOperation);
      crdtState.baseState = updatedState;

      this.crdtStates.set(executionId, crdtState);

      // Store updated state in IPFS
      await ipfsStateStorage.saveState(executionId, updatedState);

      // Emit operation applied event
      await qflowEventEmitter.emit('q.qflow.crdt.operation.applied.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-crdt-state',
        actor: this.nodeId,
        data: {
          operationId,
          executionId,
          operationType: operation.type,
          path: operation.path,
          nodeId: this.nodeId,
          vectorClock,
          hasConflicts: conflictResult.hasConflicts
        }
      });

      console.log(`[CRDTStateManager] Applied operation ${operationId} to execution ${executionId}`);
      return operationId;

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to apply operation: ${error}`);
      throw error;
    }
  }

  /**
   * Merge concurrent state updates from other nodes
   */
  async mergeConcurrentUpdates(updates: ConcurrentStateUpdate[]): Promise<void> {
    try {
      for (const update of updates) {
        await this.mergeRemoteOperations(update);
      }

      // Emit merge completed event
      await qflowEventEmitter.emit('q.qflow.crdt.merge.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-crdt-state',
        actor: this.nodeId,
        data: {
          updatesCount: updates.length,
          executionIds: updates.map(u => u.executionId)
        }
      });

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to merge concurrent updates: ${error}`);
      throw error;
    }
  }

  /**
   * Get current state with all operations applied
   */
  async getCurrentState(executionId: string): Promise<ExecutionState | null> {
    try {
      const crdtState = this.crdtStates.get(executionId);
      if (!crdtState) {
        // Try to load from IPFS
        try {
          return await ipfsStateStorage.loadState(executionId);
        } catch (error) {
          return null;
        }
      }

      // Apply all operations to base state
      let currentState = { ...crdtState.baseState };
      
      // Sort operations by causal order (vector clock)
      const sortedOperations = this.sortOperationsByCausalOrder(crdtState.operations);
      
      for (const operation of sortedOperations) {
        currentState = await this.applyOperationToState(currentState, operation);
      }

      return currentState;

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to get current state: ${error}`);
      return null;
    }
  }

  /**
   * Create state delta for synchronization
   */
  async createStateDelta(
    executionId: string,
    sinceVectorClock?: VectorClock
  ): Promise<ConcurrentStateUpdate | null> {
    try {
      const crdtState = this.crdtStates.get(executionId);
      if (!crdtState) {
        return null;
      }

      // Filter operations that are newer than the provided vector clock
      let operations = crdtState.operations;
      
      if (sinceVectorClock) {
        operations = operations.filter(op => 
          this.isOperationNewer(op.vectorClock, sinceVectorClock)
        );
      }

      return {
        executionId,
        nodeId: this.nodeId,
        operations,
        vectorClock: { ...crdtState.vectorClock },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to create state delta: ${error}`);
      return null;
    }
  }

  /**
   * Compact state by merging operations into base state
   */
  async compactState(executionId: string): Promise<StateCompaction | null> {
    try {
      const crdtState = this.crdtStates.get(executionId);
      if (!crdtState) {
        return null;
      }

      const beforeOperationCount = crdtState.operations.length;
      
      // Apply all operations to create new base state
      const compactedState = await this.getCurrentState(executionId);
      if (!compactedState) {
        return null;
      }

      // Store compacted state in IPFS
      const ipfsCid = await ipfsStateStorage.saveState(executionId, compactedState);

      // Keep only recent operations (last 100)
      const recentOperations = crdtState.operations.slice(-100);
      
      // Update CRDT state
      crdtState.baseState = compactedState;
      crdtState.operations = recentOperations;
      crdtState.lastCompacted = new Date().toISOString();

      this.crdtStates.set(executionId, crdtState);

      const compaction: StateCompaction = {
        compactionId: `compact_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        executionId,
        beforeOperationCount,
        afterOperationCount: recentOperations.length,
        compactedState,
        compactedAt: crdtState.lastCompacted,
        ipfsCid
      };

      // Store compaction history
      if (!this.compactionHistory.has(executionId)) {
        this.compactionHistory.set(executionId, []);
      }
      this.compactionHistory.get(executionId)!.push(compaction);

      // Emit compaction completed event
      await qflowEventEmitter.emit('q.qflow.crdt.compaction.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-crdt-state',
        actor: this.nodeId,
        data: {
          compactionId: compaction.compactionId,
          executionId,
          beforeOperationCount,
          afterOperationCount: recentOperations.length,
          ipfsCid
        }
      });

      console.log(`[CRDTStateManager] Compacted state for execution ${executionId}: ${beforeOperationCount} -> ${recentOperations.length} operations`);
      return compaction;

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to compact state: ${error}`);
      return null;
    }
  }

  /**
   * Get conflict telemetry
   */
  getConflictTelemetry(): ConflictResolution[] {
    return [...this.conflictTelemetry].sort((a, b) => 
      new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime()
    );
  }

  /**
   * Get operation log for execution
   */
  getOperationLog(executionId: string): CRDTOperation[] {
    return this.operationLog.get(executionId) || [];
  }

  /**
   * Get compaction history
   */
  getCompactionHistory(executionId: string): StateCompaction[] {
    return this.compactionHistory.get(executionId) || [];
  }

  // Private helper methods

  private async mergeRemoteOperations(update: ConcurrentStateUpdate): Promise<void> {
    try {
      const { executionId, operations, vectorClock: remoteVectorClock } = update;

      // Get or create local CRDT state
      let crdtState = this.crdtStates.get(executionId);
      if (!crdtState) {
        // Initialize with remote operations
        crdtState = {
          executionId,
          baseState: await this.loadOrCreateBaseState(executionId),
          operations: [],
          vectorClock: {},
          lastCompacted: new Date().toISOString(),
          conflictResolutions: []
        };
      }

      // Merge vector clocks
      const mergedVectorClock = this.mergeVectorClocks(crdtState.vectorClock, remoteVectorClock);
      
      // Filter operations that we don't already have
      const newOperations = operations.filter(op => 
        !crdtState!.operations.some(localOp => localOp.operationId === op.operationId)
      );

      // Add new operations
      crdtState.operations.push(...newOperations);
      crdtState.vectorClock = mergedVectorClock;

      // Sort operations by causal order
      crdtState.operations = this.sortOperationsByCausalOrder(crdtState.operations);

      // Detect conflicts with new operations
      for (const operation of newOperations) {
        const conflictResult = await this.detectConflicts(executionId, operation);
        if (conflictResult.hasConflicts) {
          await this.resolveConflicts(executionId, conflictResult.conflicts);
        }
      }

      // Recompute base state
      crdtState.baseState = await this.recomputeBaseState(crdtState);

      this.crdtStates.set(executionId, crdtState);

      // Update operation log
      if (!this.operationLog.has(executionId)) {
        this.operationLog.set(executionId, []);
      }
      this.operationLog.get(executionId)!.push(...newOperations);

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to merge remote operations: ${error}`);
      throw error;
    }
  }

  private async detectConflicts(
    executionId: string,
    newOperation: CRDTOperation
  ): Promise<ConflictDetectionResult> {
    try {
      const conflicts: ConflictDetectionResult['conflicts'] = [];
      const crdtState = this.crdtStates.get(executionId);
      
      if (!crdtState) {
        return { hasConflicts: false, conflicts: [] };
      }

      // Check for concurrent writes to the same path
      for (const existingOp of crdtState.operations) {
        if (existingOp.operationId === newOperation.operationId) {
          continue;
        }

        // Check if operations affect the same path
        if (existingOp.path === newOperation.path) {
          // Check if operations are concurrent (neither causally depends on the other)
          const isConcurrent = !this.isCausallyOrdered(existingOp.vectorClock, newOperation.vectorClock) &&
                              !this.isCausallyOrdered(newOperation.vectorClock, existingOp.vectorClock);

          if (isConcurrent) {
            conflicts.push({
              operationId1: existingOp.operationId,
              operationId2: newOperation.operationId,
              path: newOperation.path,
              conflictType: 'concurrent-write',
              description: `Concurrent writes to path ${newOperation.path}`
            });
          }
        }

        // Check for causal violations
        if (newOperation.causality.includes(existingOp.operationId)) {
          if (!this.isCausallyOrdered(existingOp.vectorClock, newOperation.vectorClock)) {
            conflicts.push({
              operationId1: existingOp.operationId,
              operationId2: newOperation.operationId,
              path: newOperation.path,
              conflictType: 'causal-violation',
              description: `Operation ${newOperation.operationId} claims to depend on ${existingOp.operationId} but vector clocks indicate otherwise`
            });
          }
        }
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to detect conflicts: ${error}`);
      return { hasConflicts: false, conflicts: [] };
    }
  }

  private async resolveConflicts(
    executionId: string,
    conflicts: ConflictDetectionResult['conflicts']
  ): Promise<void> {
    try {
      for (const conflict of conflicts) {
        const resolution = await this.resolveConflict(executionId, conflict);
        this.conflictTelemetry.push(resolution);

        // Emit conflict resolution event
        await qflowEventEmitter.emit('q.qflow.crdt.conflict.resolved.v1', {
          eventId: this.generateEventId(),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          source: 'qflow-crdt-state',
          actor: this.nodeId,
          data: {
            conflictId: resolution.conflictId,
            executionId,
            conflictType: conflict.conflictType,
            resolutionStrategy: resolution.resolutionStrategy,
            operationIds: resolution.operationIds
          }
        });
      }

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to resolve conflicts: ${error}`);
      throw error;
    }
  }

  private async resolveConflict(
    executionId: string,
    conflict: ConflictDetectionResult['conflicts'][0]
  ): Promise<ConflictResolution> {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const crdtState = this.crdtStates.get(executionId)!;

    const op1 = crdtState.operations.find(op => op.operationId === conflict.operationId1);
    const op2 = crdtState.operations.find(op => op.operationId === conflict.operationId2);

    if (!op1 || !op2) {
      throw new Error(`Operations not found for conflict resolution: ${conflict.operationId1}, ${conflict.operationId2}`);
    }

    let resolutionStrategy: ConflictResolution['resolutionStrategy'] = 'last-write-wins';
    let resolvedValue: any;

    switch (conflict.conflictType) {
      case 'concurrent-write':
        // Use last-write-wins based on timestamp
        if (new Date(op1.timestamp) > new Date(op2.timestamp)) {
          resolvedValue = op1.value;
        } else {
          resolvedValue = op2.value;
        }
        break;

      case 'causal-violation':
        // Use the operation with higher vector clock sum
        const sum1 = Object.values(op1.vectorClock).reduce((a, b) => a + b, 0);
        const sum2 = Object.values(op2.vectorClock).reduce((a, b) => a + b, 0);
        resolvedValue = sum1 > sum2 ? op1.value : op2.value;
        break;

      case 'type-mismatch':
        // Convert to string representation
        resolvedValue = String(op2.value); // Prefer the newer operation
        resolutionStrategy = 'custom';
        break;

      default:
        resolvedValue = op2.value;
    }

    const resolution: ConflictResolution = {
      conflictId,
      operationIds: [conflict.operationId1, conflict.operationId2],
      resolutionStrategy,
      resolvedValue,
      resolvedAt: new Date().toISOString(),
      resolvedBy: this.nodeId
    };

    // Add resolution to CRDT state
    crdtState.conflictResolutions.push(resolution);

    return resolution;
  }

  private async applyOperationToState(
    state: ExecutionState,
    operation: CRDTOperation
  ): Promise<ExecutionState> {
    const newState = { ...state };

    try {
      switch (operation.type) {
        case 'set':
          this.setValueAtPath(newState, operation.path, operation.value);
          break;

        case 'delete':
          this.deleteValueAtPath(newState, operation.path);
          break;

        case 'increment':
          const currentValue = this.getValueAtPath(newState, operation.path) || 0;
          this.setValueAtPath(newState, operation.path, currentValue + (operation.value || 1));
          break;

        case 'decrement':
          const currentValue2 = this.getValueAtPath(newState, operation.path) || 0;
          this.setValueAtPath(newState, operation.path, currentValue2 - (operation.value || 1));
          break;

        case 'append':
          const currentArray = this.getValueAtPath(newState, operation.path) || [];
          if (Array.isArray(currentArray)) {
            this.setValueAtPath(newState, operation.path, [...currentArray, operation.value]);
          }
          break;

        case 'merge':
          const currentObject = this.getValueAtPath(newState, operation.path) || {};
          if (typeof currentObject === 'object' && !Array.isArray(currentObject)) {
            this.setValueAtPath(newState, operation.path, { ...currentObject, ...operation.value });
          }
          break;
      }

    } catch (error) {
      console.error(`[CRDTStateManager] Failed to apply operation ${operation.operationId}: ${error}`);
    }

    return newState;
  }

  private sortOperationsByCausalOrder(operations: CRDTOperation[]): CRDTOperation[] {
    // Sort by vector clock sum first, then by timestamp
    return operations.sort((a, b) => {
      const sumA = Object.values(a.vectorClock).reduce((sum, val) => sum + val, 0);
      const sumB = Object.values(b.vectorClock).reduce((sum, val) => sum + val, 0);
      
      if (sumA !== sumB) {
        return sumA - sumB;
      }
      
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  private isCausallyOrdered(clock1: VectorClock, clock2: VectorClock): boolean {
    // clock1 <= clock2 if for all nodes, clock1[node] <= clock2[node]
    const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    
    for (const node of allNodes) {
      const val1 = clock1[node] || 0;
      const val2 = clock2[node] || 0;
      
      if (val1 > val2) {
        return false;
      }
    }
    
    return true;
  }

  private isOperationNewer(opClock: VectorClock, sinceClock: VectorClock): boolean {
    // Operation is newer if any component of its vector clock is greater
    const allNodes = new Set([...Object.keys(opClock), ...Object.keys(sinceClock)]);
    
    for (const node of allNodes) {
      const opVal = opClock[node] || 0;
      const sinceVal = sinceClock[node] || 0;
      
      if (opVal > sinceVal) {
        return true;
      }
    }
    
    return false;
  }

  private mergeVectorClocks(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 };
    
    for (const [node, value] of Object.entries(clock2)) {
      merged[node] = Math.max(merged[node] || 0, value);
    }
    
    return merged;
  }

  private async loadOrCreateBaseState(executionId: string): Promise<ExecutionState> {
    try {
      return await ipfsStateStorage.loadState(executionId);
    } catch (error) {
      // Create default state
      return {
        executionId,
        flowId: 'unknown',
        status: 'pending',
        currentStep: '',
        completedSteps: [],
        failedSteps: [],
        context: {
          triggeredBy: 'system',
          triggerType: 'manual',
          inputData: {},
          variables: {},
          permissions: []
        },
        startTime: new Date().toISOString(),
        checkpoints: [],
        nodeAssignments: {}
      };
    }
  }

  private async recomputeBaseState(crdtState: CRDTState): Promise<ExecutionState> {
    let state = { ...crdtState.baseState };
    
    const sortedOperations = this.sortOperationsByCausalOrder(crdtState.operations);
    
    for (const operation of sortedOperations) {
      state = await this.applyOperationToState(state, operation);
    }
    
    return state;
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private getValueAtPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current == null || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  private deleteValueAtPath(obj: any, path: string): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        return; // Path doesn't exist
      }
      current = current[key];
    }
    
    delete current[keys[keys.length - 1]];
  }

  private setupPeriodicCompaction(): void {
    // Run compaction every 5 minutes
    setInterval(async () => {
      try {
        for (const executionId of this.crdtStates.keys()) {
          const crdtState = this.crdtStates.get(executionId)!;
          
          // Compact if we have more than 1000 operations
          if (crdtState.operations.length > 1000) {
            await this.compactState(executionId);
          }
        }
      } catch (error) {
        console.error(`[CRDTStateManager] Periodic compaction failed: ${error}`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.crdtStates.clear();
    this.vectorClocks.clear();
    this.operationLog.clear();
    this.compactionHistory.clear();
    this.conflictTelemetry.length = 0;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const crdtStateManager = new CRDTStateManager();