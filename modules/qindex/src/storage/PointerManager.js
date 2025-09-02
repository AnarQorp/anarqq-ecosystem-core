/**
 * PointerManager - Manages mutable pointers with CRDT conflict resolution
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';

export class PointerManager {
  constructor(config, storage) {
    this.config = config;
    this.storage = storage;
    this.logger = createLogger('PointerManager');
    this.pointers = new Map();
    this.pointersPath = join(config.storagePath, 'pointers');
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing pointer manager...');

      // Ensure pointers directory exists
      await fs.mkdir(this.pointersPath, { recursive: true });

      // Load existing pointers
      await this._loadPointers();

      this.initialized = true;
      this.logger.info('Pointer manager initialized successfully', {
        loadedPointers: this.pointers.size
      });

    } catch (error) {
      this.logger.error('Failed to initialize pointer manager', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down pointer manager...');

      // Save all pointers
      await this._saveAllPointers();

      this.pointers.clear();
      this.initialized = false;
      this.logger.info('Pointer manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during pointer manager shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Update pointer to new CID with version management
   */
  async updatePointer(key, cid, metadata = {}) {
    if (!this.initialized) {
      throw new Error('Pointer manager not initialized');
    }

    try {
      const now = new Date().toISOString();
      const existingPointer = this.pointers.get(key);

      let version;
      let previousCid = null;

      if (existingPointer) {
        // Increment version
        const currentVersion = parseInt(existingPointer.version) || 0;
        version = (currentVersion + 1).toString();
        previousCid = existingPointer.currentCid;

        // Check for concurrent updates (CRDT conflict resolution)
        if (metadata.vectorClock && existingPointer.vectorClock) {
          const resolved = this._resolveConcurrentUpdate(
            existingPointer,
            { cid, metadata, timestamp: now }
          );
          
          if (!resolved.shouldUpdate) {
            this.logger.debug('Concurrent update resolved - keeping existing pointer', {
              key,
              existingCid: existingPointer.currentCid,
              newCid: cid
            });
            return existingPointer.version;
          }
        }
      } else {
        version = '1';
      }

      const pointer = {
        key,
        currentCid: cid,
        version,
        previousCid,
        metadata: {
          ...metadata,
          contentType: metadata.contentType || 'application/json'
        },
        timestamps: {
          created: existingPointer?.timestamps.created || now,
          updated: now
        },
        access: {
          count: existingPointer?.access.count || 0,
          lastAccessed: existingPointer?.access.lastAccessed || null
        },
        vectorClock: metadata.vectorClock || this._generateVectorClock(key, version)
      };

      // Store pointer in memory
      this.pointers.set(key, pointer);

      // Persist to disk
      await this._savePointer(key, pointer);

      this.logger.debug('Pointer updated successfully', {
        key,
        version,
        cid,
        previousCid
      });

      return version;

    } catch (error) {
      this.logger.error('Failed to update pointer', { key, cid, error: error.message });
      throw error;
    }
  }

  /**
   * Get pointer information
   */
  async getPointer(key) {
    if (!this.initialized) {
      throw new Error('Pointer manager not initialized');
    }

    try {
      const pointer = this.pointers.get(key);
      
      if (!pointer) {
        // Try loading from disk if not in memory
        const diskPointer = await this._loadPointer(key);
        if (diskPointer) {
          this.pointers.set(key, diskPointer);
          return diskPointer;
        }
        return null;
      }

      return pointer;

    } catch (error) {
      this.logger.error('Failed to get pointer', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Remove pointer
   */
  async removePointer(key) {
    if (!this.initialized) {
      throw new Error('Pointer manager not initialized');
    }

    try {
      // Remove from memory
      const existed = this.pointers.delete(key);

      // Remove from disk
      try {
        const pointerPath = join(this.pointersPath, `${key}.json`);
        await fs.unlink(pointerPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      this.logger.debug('Pointer removed successfully', { key, existed });
      return existed;

    } catch (error) {
      this.logger.error('Failed to remove pointer', { key, error: error.message });
      throw error;
    }
  }

  /**
   * List all pointers with filtering
   */
  async listPointers(filters = {}) {
    if (!this.initialized) {
      throw new Error('Pointer manager not initialized');
    }

    try {
      let pointers = Array.from(this.pointers.values());

      // Apply filters
      if (filters.prefix) {
        pointers = pointers.filter(p => p.key.startsWith(filters.prefix));
      }

      if (filters.contentType) {
        pointers = pointers.filter(p => 
          p.metadata.contentType === filters.contentType
        );
      }

      if (filters.since) {
        const sinceDate = new Date(filters.since);
        pointers = pointers.filter(p => 
          new Date(p.timestamps.updated) >= sinceDate
        );
      }

      // Sort
      const sortBy = filters.sort || 'updated_desc';
      pointers.sort((a, b) => {
        switch (sortBy) {
          case 'created_asc':
            return new Date(a.timestamps.created) - new Date(b.timestamps.created);
          case 'created_desc':
            return new Date(b.timestamps.created) - new Date(a.timestamps.created);
          case 'updated_asc':
            return new Date(a.timestamps.updated) - new Date(b.timestamps.updated);
          case 'updated_desc':
          default:
            return new Date(b.timestamps.updated) - new Date(a.timestamps.updated);
        }
      });

      // Apply pagination
      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;
      const paginatedPointers = pointers.slice(offset, offset + limit);

      return {
        pointers: paginatedPointers,
        total: pointers.length,
        hasMore: pointers.length > offset + limit,
        nextCursor: pointers.length > offset + limit ? offset + limit : null
      };

    } catch (error) {
      this.logger.error('Failed to list pointers', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Record access to a pointer
   */
  async recordAccess(key) {
    if (!this.initialized) {
      throw new Error('Pointer manager not initialized');
    }

    try {
      const pointer = this.pointers.get(key);
      if (!pointer) {
        return false;
      }

      pointer.access.count++;
      pointer.access.lastAccessed = new Date().toISOString();

      // Save updated pointer
      await this._savePointer(key, pointer);

      return true;

    } catch (error) {
      this.logger.error('Failed to record access', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get pointer statistics
   */
  async getStats() {
    try {
      const pointers = Array.from(this.pointers.values());
      
      const stats = {
        totalPointers: pointers.length,
        byContentType: {},
        totalAccesses: 0,
        averageVersion: 0,
        oldestPointer: null,
        newestPointer: null
      };

      if (pointers.length === 0) {
        return stats;
      }

      let totalVersions = 0;
      let oldestDate = new Date();
      let newestDate = new Date(0);

      pointers.forEach(pointer => {
        // Count by content type
        const contentType = pointer.metadata.contentType || 'unknown';
        stats.byContentType[contentType] = (stats.byContentType[contentType] || 0) + 1;

        // Sum accesses
        stats.totalAccesses += pointer.access.count;

        // Sum versions
        totalVersions += parseInt(pointer.version) || 0;

        // Track oldest and newest
        const createdDate = new Date(pointer.timestamps.created);
        if (createdDate < oldestDate) {
          oldestDate = createdDate;
          stats.oldestPointer = pointer.key;
        }
        if (createdDate > newestDate) {
          newestDate = createdDate;
          stats.newestPointer = pointer.key;
        }
      });

      stats.averageVersion = totalVersions / pointers.length;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get pointer stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      pointersLoaded: this.pointers.size,
      initialized: this.initialized
    };

    try {
      // Check if pointers directory is accessible
      await fs.access(this.pointersPath);
      
      // Check if we can write to pointers directory
      const testFile = join(this.pointersPath, '.health-check');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Load all pointers from disk
   */
  async _loadPointers() {
    try {
      const files = await fs.readdir(this.pointersPath);
      const pointerFiles = files.filter(f => f.endsWith('.json'));

      for (const file of pointerFiles) {
        try {
          const key = file.replace('.json', '');
          const pointer = await this._loadPointer(key);
          if (pointer) {
            this.pointers.set(key, pointer);
          }
        } catch (error) {
          this.logger.warn('Failed to load pointer file', { file, error: error.message });
        }
      }

      this.logger.debug('Loaded pointers from disk', { count: this.pointers.size });

    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist yet, that's okay
    }
  }

  /**
   * Load single pointer from disk
   */
  async _loadPointer(key) {
    try {
      const pointerPath = join(this.pointersPath, `${key}.json`);
      const content = await fs.readFile(pointerPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save pointer to disk
   */
  async _savePointer(key, pointer) {
    const pointerPath = join(this.pointersPath, `${key}.json`);
    const content = JSON.stringify(pointer, null, 2);
    await fs.writeFile(pointerPath, content, 'utf8');
  }

  /**
   * Save all pointers to disk
   */
  async _saveAllPointers() {
    const savePromises = Array.from(this.pointers.entries()).map(
      ([key, pointer]) => this._savePointer(key, pointer)
    );
    
    await Promise.all(savePromises);
    this.logger.debug('Saved all pointers to disk', { count: this.pointers.size });
  }

  /**
   * Resolve concurrent updates using CRDT logic
   */
  _resolveConcurrentUpdate(existingPointer, newUpdate) {
    // Simple last-writer-wins with timestamp comparison
    // In a more sophisticated implementation, this would use vector clocks
    const existingTime = new Date(existingPointer.timestamps.updated);
    const newTime = new Date(newUpdate.timestamp);

    return {
      shouldUpdate: newTime >= existingTime,
      reason: newTime >= existingTime ? 'newer_timestamp' : 'older_timestamp'
    };
  }

  /**
   * Generate vector clock for CRDT
   */
  _generateVectorClock(key, version) {
    // Simple vector clock implementation
    // In production, this would be more sophisticated
    return {
      node: process.env.NODE_ID || 'default',
      version: parseInt(version),
      timestamp: Date.now()
    };
  }
}