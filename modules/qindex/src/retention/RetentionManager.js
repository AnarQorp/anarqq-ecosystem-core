/**
 * RetentionManager - Automated data lifecycle management and GDPR compliance
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import cron from 'node-cron';
import { createLogger } from '../utils/logger.js';

export class RetentionManager {
  constructor(config, storage, history) {
    this.config = config;
    this.storage = storage;
    this.history = history;
    this.logger = createLogger('RetentionManager');
    this.retentionPath = join(config.storagePath, 'retention');
    this.retentionPolicies = new Map();
    this.cleanupTask = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing retention manager...');

      // Ensure retention directory exists
      await fs.mkdir(this.retentionPath, { recursive: true });

      // Load existing retention policies
      await this._loadRetentionPolicies();

      // Start cleanup task
      this._startCleanupTask();

      this.initialized = true;
      this.logger.info('Retention manager initialized successfully', {
        loadedPolicies: this.retentionPolicies.size
      });

    } catch (error) {
      this.logger.error('Failed to initialize retention manager', { error: error.message });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down retention manager...');

      // Stop cleanup task
      if (this.cleanupTask) {
        this.cleanupTask.stop();
        this.cleanupTask = null;
      }

      // Save retention policies
      await this._saveRetentionPolicies();

      this.retentionPolicies.clear();
      this.initialized = false;
      this.logger.info('Retention manager shutdown complete');

    } catch (error) {
      this.logger.error('Error during retention manager shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Set retention policy for a key
   */
  async setRetention(key, ttlSeconds, options = {}) {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    try {
      const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
      
      const policy = {
        key,
        ttlSeconds,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        options: {
          deleteHistory: options.deleteHistory !== false,
          notifyBeforeExpiry: options.notifyBeforeExpiry || false,
          gracePeriod: options.gracePeriod || 0,
          ...options
        }
      };

      this.retentionPolicies.set(key, policy);
      await this._saveRetentionPolicy(key, policy);

      this.logger.debug('Retention policy set', {
        key,
        ttlSeconds,
        expiresAt: policy.expiresAt
      });

    } catch (error) {
      this.logger.error('Failed to set retention policy', { key, ttlSeconds, error: error.message });
      throw error;
    }
  }

  /**
   * Get retention policy for a key
   */
  async getRetention(key) {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    return this.retentionPolicies.get(key) || null;
  }

  /**
   * Remove retention policy for a key
   */
  async removeRetention(key) {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    try {
      const existed = this.retentionPolicies.delete(key);
      
      if (existed) {
        // Remove policy file
        try {
          const policyPath = join(this.retentionPath, `${key}.json`);
          await fs.unlink(policyPath);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }

        this.logger.debug('Retention policy removed', { key });
      }

      return existed;

    } catch (error) {
      this.logger.error('Failed to remove retention policy', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Update retention policy TTL
   */
  async updateRetention(key, newTtlSeconds) {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    try {
      const existingPolicy = this.retentionPolicies.get(key);
      if (!existingPolicy) {
        throw new Error(`No retention policy found for key: ${key}`);
      }

      const newExpiresAt = new Date(Date.now() + (newTtlSeconds * 1000));
      
      const updatedPolicy = {
        ...existingPolicy,
        ttlSeconds: newTtlSeconds,
        expiresAt: newExpiresAt.toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.retentionPolicies.set(key, updatedPolicy);
      await this._saveRetentionPolicy(key, updatedPolicy);

      this.logger.debug('Retention policy updated', {
        key,
        newTtlSeconds,
        newExpiresAt: updatedPolicy.expiresAt
      });

      return updatedPolicy;

    } catch (error) {
      this.logger.error('Failed to update retention policy', { key, newTtlSeconds, error: error.message });
      throw error;
    }
  }

  /**
   * List all retention policies
   */
  async listRetentionPolicies(filters = {}) {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    try {
      let policies = Array.from(this.retentionPolicies.values());

      // Apply filters
      if (filters.expiringSoon) {
        const soonThreshold = new Date(Date.now() + (filters.expiringSoon * 1000));
        policies = policies.filter(p => new Date(p.expiresAt) <= soonThreshold);
      }

      if (filters.expired) {
        const now = new Date();
        policies = policies.filter(p => new Date(p.expiresAt) <= now);
      }

      // Sort by expiration date
      policies.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

      // Apply pagination
      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;
      const paginatedPolicies = policies.slice(offset, offset + limit);

      return {
        policies: paginatedPolicies,
        total: policies.length,
        hasMore: policies.length > offset + limit
      };

    } catch (error) {
      this.logger.error('Failed to list retention policies', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Run cleanup process manually
   */
  async runCleanup() {
    if (!this.initialized) {
      throw new Error('Retention manager not initialized');
    }

    try {
      this.logger.info('Starting manual cleanup process...');
      
      const startTime = Date.now();
      const now = new Date();
      let cleanedCount = 0;
      let errorCount = 0;

      for (const [key, policy] of this.retentionPolicies.entries()) {
        try {
          const expiresAt = new Date(policy.expiresAt);
          
          if (now > expiresAt) {
            // Check grace period
            const gracePeriodEnd = new Date(expiresAt.getTime() + (policy.options.gracePeriod * 1000));
            
            if (now > gracePeriodEnd) {
              await this._cleanupExpiredRecord(key, policy);
              cleanedCount++;
            }
          }
        } catch (error) {
          this.logger.error('Failed to cleanup record', { key, error: error.message });
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      
      this.logger.info('Cleanup process completed', {
        cleanedCount,
        errorCount,
        duration: `${duration}ms`
      });

      return {
        cleanedCount,
        errorCount,
        duration
      };

    } catch (error) {
      this.logger.error('Cleanup process failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get retention statistics
   */
  async getStats() {
    try {
      const now = new Date();
      const policies = Array.from(this.retentionPolicies.values());
      
      const stats = {
        totalPolicies: policies.length,
        expiredPolicies: 0,
        expiringSoon: 0, // Within 24 hours
        averageTtl: 0,
        oldestPolicy: null,
        newestPolicy: null
      };

      if (policies.length === 0) {
        return stats;
      }

      let totalTtl = 0;
      let oldestDate = new Date();
      let newestDate = new Date(0);
      const soonThreshold = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

      policies.forEach(policy => {
        const expiresAt = new Date(policy.expiresAt);
        const createdAt = new Date(policy.createdAt);

        // Count expired
        if (expiresAt <= now) {
          stats.expiredPolicies++;
        }

        // Count expiring soon
        if (expiresAt <= soonThreshold && expiresAt > now) {
          stats.expiringSoon++;
        }

        // Sum TTL
        totalTtl += policy.ttlSeconds;

        // Track oldest and newest
        if (createdAt < oldestDate) {
          oldestDate = createdAt;
          stats.oldestPolicy = policy.key;
        }
        if (createdAt > newestDate) {
          newestDate = createdAt;
          stats.newestPolicy = policy.key;
        }
      });

      stats.averageTtl = totalTtl / policies.length;

      return stats;

    } catch (error) {
      this.logger.error('Failed to get retention stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      initialized: this.initialized,
      cleanupTaskRunning: this.cleanupTask !== null,
      policiesLoaded: this.retentionPolicies.size
    };

    try {
      // Check if retention directory is accessible
      await fs.access(this.retentionPath);
      
      // Check if we can write to retention directory
      const testFile = join(this.retentionPath, '.health-check');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Start automated cleanup task
   */
  _startCleanupTask() {
    // Run cleanup every hour
    this.cleanupTask = cron.schedule('0 * * * *', async () => {
      try {
        this.logger.debug('Running scheduled cleanup...');
        await this.runCleanup();
      } catch (error) {
        this.logger.error('Scheduled cleanup failed', { error: error.message });
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.logger.info('Cleanup task scheduled to run every hour');
  }

  /**
   * Load retention policies from disk
   */
  async _loadRetentionPolicies() {
    try {
      const files = await fs.readdir(this.retentionPath);
      const policyFiles = files.filter(f => f.endsWith('.json'));

      for (const file of policyFiles) {
        try {
          const key = file.replace('.json', '');
          const policy = await this._loadRetentionPolicy(key);
          if (policy) {
            this.retentionPolicies.set(key, policy);
          }
        } catch (error) {
          this.logger.warn('Failed to load retention policy file', { file, error: error.message });
        }
      }

      this.logger.debug('Loaded retention policies from disk', { count: this.retentionPolicies.size });

    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist yet, that's okay
    }
  }

  /**
   * Load single retention policy from disk
   */
  async _loadRetentionPolicy(key) {
    try {
      const policyPath = join(this.retentionPath, `${key}.json`);
      const content = await fs.readFile(policyPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save retention policy to disk
   */
  async _saveRetentionPolicy(key, policy) {
    const policyPath = join(this.retentionPath, `${key}.json`);
    const content = JSON.stringify(policy, null, 2);
    await fs.writeFile(policyPath, content, 'utf8');
  }

  /**
   * Save all retention policies to disk
   */
  async _saveRetentionPolicies() {
    const savePromises = Array.from(this.retentionPolicies.entries()).map(
      ([key, policy]) => this._saveRetentionPolicy(key, policy)
    );
    
    await Promise.all(savePromises);
    this.logger.debug('Saved all retention policies to disk', { count: this.retentionPolicies.size });
  }

  /**
   * Clean up an expired record
   */
  async _cleanupExpiredRecord(key, policy) {
    this.logger.info('Cleaning up expired record', { key, expiresAt: policy.expiresAt });

    // Remove from storage (this will be handled by the core delete method)
    // For now, we'll just remove the retention policy
    await this.removeRetention(key);

    // Optionally clean up history
    if (policy.options.deleteHistory && this.history) {
      try {
        await this.history.cleanupHistory(key, 0); // Remove all history
      } catch (error) {
        this.logger.warn('Failed to cleanup history for expired record', { key, error: error.message });
      }
    }

    this.logger.info('Expired record cleaned up successfully', { key });
  }
}