/**
 * HistoryManager - Manages append-only history tracking
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';

export class HistoryManager {
  constructor(config, storage) {
    this.config = config;
    this.storage = storage;
    this.logger = createLogger('HistoryManager');
    this.historyPath = join(config.storagePath, 'history');
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing history manager...');

      // Ensure history directory exists
      await fs.mkdir(this.historyPath, { recursive: true });

      this.initialized = true;
      this.logger.info('History manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize history manager', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down history manager...');
      this.initialized = false;
      this.logger.info('History manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during history manager shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Record an operation in the history
   */
  async recordOperation(key, operation, details = {}) {
    if (!this.initialized) {
      throw new Error('History manager not initialized');
    }

    try {
      const historyEntry = {
        key,
        operation, // 'put', 'delete'
        timestamp: new Date().toISOString(),
        ...details
      };

      // Append to history file
      await this._appendToHistory(key, historyEntry);

      this.logger.debug('Operation recorded in history', {
        key,
        operation,
        cid: details.cid,
        version: details.version
      });

    } catch (error) {
      this.logger.error('Failed to record operation in history', {
        key,
        operation,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get history for a key
   */
  async getHistory(key, options = {}) {
    if (!this.initialized) {
      throw new Error('History manager not initialized');
    }

    try {
      const limit = Math.min(options.limit || 50, this.config.maxHistoryEntries);
      const offset = options.offset || 0;

      const historyEntries = await this._loadHistory(key);
      
      // Sort by timestamp (most recent first)
      historyEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const paginatedEntries = historyEntries.slice(offset, offset + limit);

      return {
        key,
        history: paginatedEntries,
        total: historyEntries.length,
        hasMore: historyEntries.length > offset + limit
      };

    } catch (error) {
      this.logger.error('Failed to get history', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get CID for a specific version
   */
  async getCidForVersion(key, version) {
    if (!this.initialized) {
      throw new Error('History manager not initialized');
    }

    try {
      const historyEntries = await this._loadHistory(key);
      
      const entry = historyEntries.find(e => e.version === version);
      return entry ? entry.cid : null;

    } catch (error) {
      this.logger.error('Failed to get CID for version', {
        key,
        version,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Clean up old history entries
   */
  async cleanupHistory(key, maxEntries = null) {
    if (!this.initialized) {
      throw new Error('History manager not initialized');
    }

    try {
      const maxToKeep = maxEntries || this.config.maxHistoryEntries;
      const historyEntries = await this._loadHistory(key);

      if (historyEntries.length <= maxToKeep) {
        return 0; // Nothing to clean up
      }

      // Sort by timestamp (most recent first) and keep only the newest entries
      historyEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const entriesToKeep = historyEntries.slice(0, maxToKeep);
      const removedCount = historyEntries.length - entriesToKeep.length;

      // Rewrite history file with only the entries to keep
      await this._writeHistory(key, entriesToKeep);

      this.logger.debug('Cleaned up history entries', {
        key,
        removedCount,
        remainingCount: entriesToKeep.length
      });

      return removedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup history', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get history statistics
   */
  async getStats() {
    try {
      const stats = {
        totalHistoryFiles: 0,
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
        averageEntriesPerKey: 0
      };

      try {
        const files = await fs.readdir(this.historyPath);
        const historyFiles = files.filter(f => f.endsWith('.json'));
        stats.totalHistoryFiles = historyFiles.length;

        let totalEntries = 0;
        let oldestDate = new Date();
        let newestDate = new Date(0);

        for (const file of historyFiles.slice(0, 100)) { // Sample first 100 files
          try {
            const key = file.replace('.json', '');
            const entries = await this._loadHistory(key);
            totalEntries += entries.length;

            entries.forEach(entry => {
              const entryDate = new Date(entry.timestamp);
              if (entryDate < oldestDate) {
                oldestDate = entryDate;
                stats.oldestEntry = entry.timestamp;
              }
              if (entryDate > newestDate) {
                newestDate = entryDate;
                stats.newestEntry = entry.timestamp;
              }
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }

        stats.totalEntries = totalEntries;
        stats.averageEntriesPerKey = stats.totalHistoryFiles > 0 ? 
          totalEntries / Math.min(stats.totalHistoryFiles, 100) : 0;

      } catch (error) {
        this.logger.warn('Failed to get complete history stats', { error: error.message });
      }

      return stats;

    } catch (error) {
      this.logger.error('Failed to get history stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      initialized: this.initialized
    };

    try {
      // Check if history directory is accessible
      await fs.access(this.historyPath);
      
      // Check if we can write to history directory
      const testFile = join(this.historyPath, '.health-check');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Append entry to history file
   */
  async _appendToHistory(key, entry) {
    const historyFile = join(this.historyPath, `${key}.json`);
    
    try {
      // Try to read existing history
      const existingHistory = await this._loadHistory(key);
      existingHistory.push(entry);

      // Limit history size
      if (existingHistory.length > this.config.maxHistoryEntries) {
        existingHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        existingHistory.splice(this.config.maxHistoryEntries);
      }

      // Write back to file
      await this._writeHistory(key, existingHistory);

    } catch (error) {
      // If file doesn't exist, create new history
      if (error.code === 'ENOENT') {
        await this._writeHistory(key, [entry]);
      } else {
        throw error;
      }
    }
  }

  /**
   * Load history from file
   */
  async _loadHistory(key) {
    try {
      const historyFile = join(this.historyPath, `${key}.json`);
      const content = await fs.readFile(historyFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Write history to file
   */
  async _writeHistory(key, entries) {
    const historyFile = join(this.historyPath, `${key}.json`);
    const content = JSON.stringify(entries, null, 2);
    await fs.writeFile(historyFile, content, 'utf8');
  }
}