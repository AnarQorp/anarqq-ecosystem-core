/**
 * CRDTResolver - Conflict-free Replicated Data Type conflict resolution
 */

import { createLogger } from '../utils/logger.js';

export class CRDTResolver {
  constructor(config) {
    this.config = config;
    this.logger = createLogger('CRDTResolver');
    this.nodeId = process.env.NODE_ID || 'default';
    this.vectorClocks = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing CRDT resolver...', { nodeId: this.nodeId });

      this.initialized = true;
      this.logger.info('CRDT resolver initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize CRDT resolver', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down CRDT resolver...');
      
      this.vectorClocks.clear();
      this.initialized = false;
      this.logger.info('CRDT resolver shutdown complete');

    } catch (error) {
      this.logger.error('Error during CRDT resolver shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Resolve conflict between two versions of a record
   */
  resolveConflict(key, localVersion, remoteVersion) {
    if (!this.initialized) {
      throw new Error('CRDT resolver not initialized');
    }

    try {
      this.logger.debug('Resolving conflict', {
        key,
        localTimestamp: localVersion.timestamp,
        remoteTimestamp: remoteVersion.timestamp
      });

      // Simple last-writer-wins with timestamp comparison
      // In a more sophisticated implementation, this would use vector clocks
      const localTime = new Date(localVersion.timestamp);
      const remoteTime = new Date(remoteVersion.timestamp);

      let winner;
      let reason;

      if (remoteTime > localTime) {
        winner = 'remote';
        reason = 'newer_timestamp';
      } else if (localTime > remoteTime) {
        winner = 'local';
        reason = 'newer_timestamp';
      } else {
        // Same timestamp, use node ID as tiebreaker
        const localNode = localVersion.nodeId || 'unknown';
        const remoteNode = remoteVersion.nodeId || 'unknown';
        
        if (remoteNode > localNode) {
          winner = 'remote';
          reason = 'node_id_tiebreaker';
        } else {
          winner = 'local';
          reason = 'node_id_tiebreaker';
        }
      }

      const resolution = {
        winner,
        reason,
        resolvedAt: new Date().toISOString(),
        resolvedBy: this.nodeId
      };

      this.logger.debug('Conflict resolved', {
        key,
        winner,
        reason
      });

      return resolution;

    } catch (error) {
      this.logger.error('Failed to resolve conflict', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Generate vector clock for a record
   */
  generateVectorClock(key, operation = 'update') {
    if (!this.initialized) {
      throw new Error('CRDT resolver not initialized');
    }

    try {
      // Get or create vector clock for this key
      let vectorClock = this.vectorClocks.get(key) || {};
      
      // Increment our node's counter
      vectorClock[this.nodeId] = (vectorClock[this.nodeId] || 0) + 1;
      
      // Store updated vector clock
      this.vectorClocks.set(key, vectorClock);

      const clock = {
        ...vectorClock,
        timestamp: Date.now(),
        operation,
        nodeId: this.nodeId
      };

      this.logger.debug('Generated vector clock', { key, clock });

      return clock;

    } catch (error) {
      this.logger.error('Failed to generate vector clock', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Update vector clock with remote clock
   */
  updateVectorClock(key, remoteClock) {
    if (!this.initialized) {
      throw new Error('CRDT resolver not initialized');
    }

    try {
      let localClock = this.vectorClocks.get(key) || {};
      
      // Merge clocks by taking maximum of each node's counter
      const mergedClock = { ...localClock };
      
      Object.keys(remoteClock).forEach(nodeId => {
        if (nodeId !== 'timestamp' && nodeId !== 'operation' && nodeId !== 'nodeId') {
          mergedClock[nodeId] = Math.max(
            mergedClock[nodeId] || 0,
            remoteClock[nodeId] || 0
          );
        }
      });

      this.vectorClocks.set(key, mergedClock);

      this.logger.debug('Updated vector clock', { key, mergedClock });

      return mergedClock;

    } catch (error) {
      this.logger.error('Failed to update vector clock', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Compare two vector clocks to determine causality
   */
  compareVectorClocks(clock1, clock2) {
    if (!this.initialized) {
      throw new Error('CRDT resolver not initialized');
    }

    try {
      // Get all node IDs from both clocks
      const allNodes = new Set([
        ...Object.keys(clock1).filter(k => k !== 'timestamp' && k !== 'operation' && k !== 'nodeId'),
        ...Object.keys(clock2).filter(k => k !== 'timestamp' && k !== 'operation' && k !== 'nodeId')
      ]);

      let clock1Greater = false;
      let clock2Greater = false;

      for (const nodeId of allNodes) {
        const count1 = clock1[nodeId] || 0;
        const count2 = clock2[nodeId] || 0;

        if (count1 > count2) {
          clock1Greater = true;
        } else if (count2 > count1) {
          clock2Greater = true;
        }
      }

      // Determine relationship
      if (clock1Greater && !clock2Greater) {
        return 'after'; // clock1 happened after clock2
      } else if (clock2Greater && !clock1Greater) {
        return 'before'; // clock1 happened before clock2
      } else if (!clock1Greater && !clock2Greater) {
        return 'equal'; // clocks are equal
      } else {
        return 'concurrent'; // clocks are concurrent (conflict)
      }

    } catch (error) {
      this.logger.error('Failed to compare vector clocks', { error: error.message });
      return 'unknown';
    }
  }

  /**
   * Merge two records using CRDT semantics
   */
  mergeRecords(key, record1, record2) {
    if (!this.initialized) {
      throw new Error('CRDT resolver not initialized');
    }

    try {
      this.logger.debug('Merging records', { key });

      // Compare vector clocks if available
      if (record1.vectorClock && record2.vectorClock) {
        const comparison = this.compareVectorClocks(record1.vectorClock, record2.vectorClock);
        
        switch (comparison) {
          case 'after':
            return { merged: record1, winner: 'record1', reason: 'vector_clock_after' };
          case 'before':
            return { merged: record2, winner: 'record2', reason: 'vector_clock_before' };
          case 'equal':
            return { merged: record1, winner: 'record1', reason: 'vector_clock_equal' };
          case 'concurrent':
            // Fall through to timestamp-based resolution
            break;
        }
      }

      // Fall back to timestamp-based resolution
      const resolution = this.resolveConflict(key, record1, record2);
      const merged = resolution.winner === 'local' ? record1 : record2;

      return {
        merged,
        winner: resolution.winner === 'local' ? 'record1' : 'record2',
        reason: resolution.reason
      };

    } catch (error) {
      this.logger.error('Failed to merge records', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get CRDT statistics
   */
  getStats() {
    return {
      nodeId: this.nodeId,
      trackedKeys: this.vectorClocks.size,
      initialized: this.initialized
    };
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      nodeId: this.nodeId,
      initialized: this.initialized,
      trackedKeys: this.vectorClocks.size
    };

    try {
      // Basic functionality test
      const testClock = this.generateVectorClock('health-check');
      if (!testClock || !testClock[this.nodeId]) {
        throw new Error('Vector clock generation failed');
      }

      // Clean up test clock
      this.vectorClocks.delete('health-check');

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}