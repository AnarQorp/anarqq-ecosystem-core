/**
 * StorageManager - Handles data storage with IPFS integration
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { createLogger } from '../utils/logger.js';
import { IPFSClient } from './IPFSClient.js';

export class StorageManager {
  constructor(config) {
    this.config = config;
    this.logger = createLogger('StorageManager');
    this.ipfs = null;
    this.localStoragePath = config.storagePath;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing storage manager...');

      // Ensure local storage directory exists
      await fs.mkdir(this.localStoragePath, { recursive: true });

      // Initialize IPFS client
      this.ipfs = new IPFSClient(this.config.ipfs);
      await this.ipfs.initialize();

      this.initialized = true;
      this.logger.info('Storage manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize storage manager', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down storage manager...');

      if (this.ipfs) {
        await this.ipfs.shutdown();
      }

      this.initialized = false;
      this.logger.info('Storage manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during storage manager shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Store data and return content identifier (CID)
   */
  async store(key, value, metadata = {}) {
    if (!this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      const record = {
        key,
        value,
        metadata: {
          ...metadata,
          contentType: metadata.contentType || 'application/json',
          timestamp: new Date().toISOString(),
          size: JSON.stringify(value).length
        },
        timestamp: new Date().toISOString()
      };

      // Generate content hash
      const content = JSON.stringify(record);
      const hash = createHash('sha256').update(content).digest('hex');
      const cid = `qindex_${hash}`;

      // Store locally first
      await this._storeLocal(cid, record);

      // Store in IPFS if available
      let ipfsCid = null;
      if (this.ipfs.isAvailable()) {
        try {
          ipfsCid = await this.ipfs.add(content, {
            pin: metadata.pin !== false
          });
          
          // Update record with IPFS CID
          record.metadata.ipfsCid = ipfsCid;
          await this._storeLocal(cid, record);

          this.logger.debug('Stored in IPFS', { key, cid, ipfsCid });
        } catch (ipfsError) {
          this.logger.warn('Failed to store in IPFS, using local storage only', {
            key,
            cid,
            error: ipfsError.message
          });
        }
      }

      this.logger.debug('Record stored successfully', { key, cid, ipfsCid });
      return cid;

    } catch (error) {
      this.logger.error('Failed to store record', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Retrieve data by content identifier
   */
  async retrieve(cid) {
    if (!this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      // Try local storage first
      const localRecord = await this._retrieveLocal(cid);
      if (localRecord) {
        this.logger.debug('Retrieved from local storage', { cid });
        return localRecord;
      }

      // Try IPFS if available and we have an IPFS CID
      if (this.ipfs.isAvailable()) {
        try {
          // For IPFS retrieval, we need the IPFS CID, not our internal CID
          // This would typically be stored in metadata or derived from the CID
          const content = await this.ipfs.get(cid);
          if (content) {
            const record = JSON.parse(content);
            
            // Cache locally for future access
            await this._storeLocal(cid, record);
            
            this.logger.debug('Retrieved from IPFS and cached locally', { cid });
            return record;
          }
        } catch (ipfsError) {
          this.logger.warn('Failed to retrieve from IPFS', {
            cid,
            error: ipfsError.message
          });
        }
      }

      this.logger.debug('Record not found', { cid });
      return null;

    } catch (error) {
      this.logger.error('Failed to retrieve record', { cid, error: error.message });
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(cid) {
    if (!this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      // Check local storage
      const localPath = join(this.localStoragePath, `${cid}.json`);
      try {
        await fs.access(localPath);
        return true;
      } catch {
        // File doesn't exist locally
      }

      // Check IPFS if available
      if (this.ipfs.isAvailable()) {
        try {
          const exists = await this.ipfs.exists(cid);
          return exists;
        } catch {
          // IPFS check failed
        }
      }

      return false;

    } catch (error) {
      this.logger.error('Failed to check record existence', { cid, error: error.message });
      return false;
    }
  }

  /**
   * Remove record from storage
   */
  async remove(cid) {
    if (!this.initialized) {
      throw new Error('Storage manager not initialized');
    }

    try {
      let removed = false;

      // Remove from local storage
      try {
        await this._removeLocal(cid);
        removed = true;
        this.logger.debug('Removed from local storage', { cid });
      } catch (error) {
        this.logger.warn('Failed to remove from local storage', {
          cid,
          error: error.message
        });
      }

      // Remove from IPFS (unpin)
      if (this.ipfs.isAvailable()) {
        try {
          await this.ipfs.unpin(cid);
          this.logger.debug('Unpinned from IPFS', { cid });
        } catch (error) {
          this.logger.warn('Failed to unpin from IPFS', {
            cid,
            error: error.message
          });
        }
      }

      return removed;

    } catch (error) {
      this.logger.error('Failed to remove record', { cid, error: error.message });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    try {
      const stats = {
        local: {
          totalRecords: 0,
          totalSize: 0
        },
        ipfs: {
          available: this.ipfs.isAvailable(),
          pinnedRecords: 0
        }
      };

      // Get local storage stats
      try {
        const files = await fs.readdir(this.localStoragePath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        stats.local.totalRecords = jsonFiles.length;

        for (const file of jsonFiles) {
          const filePath = join(this.localStoragePath, file);
          const stat = await fs.stat(filePath);
          stats.local.totalSize += stat.size;
        }
      } catch (error) {
        this.logger.warn('Failed to get local storage stats', { error: error.message });
      }

      // Get IPFS stats
      if (this.ipfs.isAvailable()) {
        try {
          const ipfsStats = await this.ipfs.getStats();
          stats.ipfs = { ...stats.ipfs, ...ipfsStats };
        } catch (error) {
          this.logger.warn('Failed to get IPFS stats', { error: error.message });
        }
      }

      return stats;

    } catch (error) {
      this.logger.error('Failed to get storage stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      components: {
        local: { status: 'healthy' },
        ipfs: { status: 'unknown' }
      }
    };

    try {
      // Check local storage
      try {
        await fs.access(this.localStoragePath);
        const stats = await fs.stat(this.localStoragePath);
        health.components.local = {
          status: 'healthy',
          writable: true,
          path: this.localStoragePath
        };
      } catch (error) {
        health.components.local = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }

      // Check IPFS
      if (this.ipfs) {
        health.components.ipfs = await this.ipfs.getHealth();
        if (health.components.ipfs.status === 'unhealthy') {
          health.status = 'degraded';
        }
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Store record locally
   */
  async _storeLocal(cid, record) {
    const filePath = join(this.localStoragePath, `${cid}.json`);
    const content = JSON.stringify(record, null, 2);
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * Retrieve record from local storage
   */
  async _retrieveLocal(cid) {
    try {
      const filePath = join(this.localStoragePath, `${cid}.json`);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Remove record from local storage
   */
  async _removeLocal(cid) {
    const filePath = join(this.localStoragePath, `${cid}.json`);
    await fs.unlink(filePath);
  }
}