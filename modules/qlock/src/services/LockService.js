/**
 * Lock Service
 * 
 * Provides distributed lock functionality with Redis backend.
 * Supports exclusive locks, lock extension, and automatic expiration.
 */

import crypto from 'crypto';

export class LockService {
  constructor(options = {}) {
    this.redis = options.redis;
    this.locks = new Map(); // In-memory storage for standalone mode
    this.lockPrefix = 'qlock:';
    this.defaultTTL = 30000; // 30 seconds
    this.maxTTL = 3600000; // 1 hour
    this.cleanupInterval = null;
  }

  async initialize() {
    console.log('[LockService] Initializing...');
    
    // Start cleanup interval for expired locks
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 10000); // Check every 10 seconds
    
    console.log('[LockService] Initialized with in-memory storage');
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(lockId, identityId, options = {}) {
    const {
      ttl = this.defaultTTL,
      waitTimeout = 0,
      metadata = {},
      exclusive = true
    } = options;

    if (ttl > this.maxTTL) {
      throw new Error(`TTL cannot exceed ${this.maxTTL}ms`);
    }

    const lockKey = this.getLockKey(lockId);
    const now = Date.now();
    const expiresAt = now + ttl;

    try {
      // Check if lock already exists and is not expired
      const existingLock = this.locks.get(lockKey);
      
      if (existingLock && existingLock.expiresAt > now) {
        if (existingLock.owner === identityId) {
          // Owner is trying to acquire again - extend the lock
          return await this.extendLock(lockId, identityId, { ttl });
        } else {
          // Lock is held by someone else
          if (waitTimeout > 0) {
            return await this.waitForLock(lockId, identityId, options);
          } else {
            throw new Error(`Lock ${lockId} is already held by ${existingLock.owner}`);
          }
        }
      }

      // Acquire the lock
      const lockData = {
        lockId,
        owner: identityId,
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        ttl,
        exclusive,
        metadata: {
          ...metadata,
          acquisitions: 1,
          extensions: 0
        },
        version: '1.0'
      };

      this.locks.set(lockKey, {
        ...lockData,
        expiresAt: expiresAt // Keep numeric for comparison
      });

      console.log(`[LockService] Lock acquired: ${lockId} by ${identityId}`);

      return {
        lockId,
        acquired: true,
        owner: identityId,
        expiresAt: lockData.expiresAt,
        ttl,
        metadata: lockData
      };

    } catch (error) {
      console.error('[LockService] Failed to acquire lock:', error);
      throw error;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockId, identityId) {
    const lockKey = this.getLockKey(lockId);
    const existingLock = this.locks.get(lockKey);

    if (!existingLock) {
      throw new Error(`Lock ${lockId} does not exist`);
    }

    if (existingLock.owner !== identityId) {
      throw new Error(`Lock ${lockId} is owned by ${existingLock.owner}, not ${identityId}`);
    }

    // Calculate duration
    const acquiredAt = new Date(existingLock.acquiredAt).getTime();
    const releasedAt = Date.now();
    const duration = releasedAt - acquiredAt;

    // Remove the lock
    this.locks.delete(lockKey);

    console.log(`[LockService] Lock released: ${lockId} by ${identityId} (held for ${duration}ms)`);

    return {
      lockId,
      released: true,
      owner: identityId,
      releasedAt: new Date(releasedAt).toISOString(),
      duration,
      reason: 'manual'
    };
  }

  /**
   * Extend a distributed lock
   */
  async extendLock(lockId, identityId, options = {}) {
    const { ttl = this.defaultTTL } = options;
    const lockKey = this.getLockKey(lockId);
    const existingLock = this.locks.get(lockKey);

    if (!existingLock) {
      throw new Error(`Lock ${lockId} does not exist`);
    }

    if (existingLock.owner !== identityId) {
      throw new Error(`Lock ${lockId} is owned by ${existingLock.owner}, not ${identityId}`);
    }

    const now = Date.now();
    const previousExpiry = existingLock.expiresAt;
    const newExpiry = now + ttl;

    // Update the lock
    existingLock.expiresAt = newExpiry;
    existingLock.ttl = ttl;
    existingLock.metadata.extensions = (existingLock.metadata.extensions || 0) + 1;

    console.log(`[LockService] Lock extended: ${lockId} by ${identityId}`);

    return {
      lockId,
      extended: true,
      owner: identityId,
      previousExpiry: new Date(previousExpiry).toISOString(),
      newExpiry: new Date(newExpiry).toISOString(),
      extension: ttl,
      extendedAt: new Date(now).toISOString()
    };
  }

  /**
   * Get lock status
   */
  async getLockStatus(lockId) {
    const lockKey = this.getLockKey(lockId);
    const existingLock = this.locks.get(lockKey);

    if (!existingLock) {
      return {
        lockId,
        exists: false,
        acquired: false
      };
    }

    const now = Date.now();
    const isExpired = existingLock.expiresAt <= now;

    if (isExpired) {
      // Clean up expired lock
      this.locks.delete(lockKey);
      return {
        lockId,
        exists: false,
        acquired: false,
        expired: true
      };
    }

    return {
      lockId,
      exists: true,
      acquired: true,
      owner: existingLock.owner,
      expiresAt: new Date(existingLock.expiresAt).toISOString(),
      ttl: existingLock.ttl,
      metadata: existingLock.metadata
    };
  }

  /**
   * Wait for lock to become available
   */
  async waitForLock(lockId, identityId, options = {}) {
    const { waitTimeout, ttl } = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkLock = async () => {
        try {
          const result = await this.acquireLock(lockId, identityId, { ttl, waitTimeout: 0 });
          resolve(result);
        } catch (error) {
          const elapsed = Date.now() - startTime;
          
          if (elapsed >= waitTimeout) {
            reject(new Error(`Lock acquisition timeout after ${waitTimeout}ms`));
          } else {
            // Wait a bit and try again
            setTimeout(checkLock, 100);
          }
        }
      };

      checkLock();
    });
  }

  /**
   * List all active locks (for debugging)
   */
  async listLocks(identityId = null) {
    const now = Date.now();
    const activeLocks = [];

    for (const [lockKey, lockData] of this.locks.entries()) {
      if (lockData.expiresAt > now) {
        if (!identityId || lockData.owner === identityId) {
          activeLocks.push({
            lockId: lockData.lockId,
            owner: lockData.owner,
            acquiredAt: lockData.acquiredAt,
            expiresAt: new Date(lockData.expiresAt).toISOString(),
            ttl: lockData.ttl,
            metadata: lockData.metadata
          });
        }
      }
    }

    return activeLocks;
  }

  /**
   * Force release a lock (admin operation)
   */
  async forceReleaseLock(lockId, reason = 'forced') {
    const lockKey = this.getLockKey(lockId);
    const existingLock = this.locks.get(lockKey);

    if (!existingLock) {
      throw new Error(`Lock ${lockId} does not exist`);
    }

    const owner = existingLock.owner;
    const acquiredAt = new Date(existingLock.acquiredAt).getTime();
    const releasedAt = Date.now();
    const duration = releasedAt - acquiredAt;

    // Remove the lock
    this.locks.delete(lockKey);

    console.log(`[LockService] Lock force released: ${lockId} owned by ${owner} (reason: ${reason})`);

    return {
      lockId,
      released: true,
      owner,
      releasedAt: new Date(releasedAt).toISOString(),
      duration,
      reason
    };
  }

  /**
   * Cleanup expired locks
   */
  cleanupExpiredLocks() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [lockKey, lockData] of this.locks.entries()) {
      if (lockData.expiresAt <= now) {
        this.locks.delete(lockKey);
        cleanedCount++;
        
        console.log(`[LockService] Expired lock cleaned: ${lockData.lockId} owned by ${lockData.owner}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[LockService] Cleaned up ${cleanedCount} expired locks`);
    }
  }

  /**
   * Get lock key for storage
   */
  getLockKey(lockId) {
    return `${this.lockPrefix}${lockId}`;
  }

  /**
   * Get lock statistics
   */
  async getStatistics() {
    const now = Date.now();
    let activeLocks = 0;
    let expiredLocks = 0;
    const ownerStats = {};

    for (const [lockKey, lockData] of this.locks.entries()) {
      if (lockData.expiresAt > now) {
        activeLocks++;
        ownerStats[lockData.owner] = (ownerStats[lockData.owner] || 0) + 1;
      } else {
        expiredLocks++;
      }
    }

    return {
      activeLocks,
      expiredLocks,
      totalLocks: activeLocks + expiredLocks,
      ownerStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = await this.getStatistics();
    
    return {
      status: 'healthy',
      storage: 'in-memory',
      statistics: stats
    };
  }

  /**
   * Shutdown cleanup
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    console.log('[LockService] Shutdown complete');
  }
}