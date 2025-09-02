import { logger } from '../utils/logger.js';

export class CacheService {
  constructor(config) {
    this.config = config;
    this.cache = new Map(); // In-memory cache for standalone mode
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing cache service...');
      
      // In production, this would connect to Redis
      // For now, use in-memory cache
      
      this.initialized = true;
      logger.info('Cache service initialized');
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  async get(key) {
    if (!this.initialized) {
      throw new Error('Cache service not initialized');
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      return null;
    }

    return entry.value;
  }

  async set(key, value, ttl = null) {
    if (!this.initialized) {
      throw new Error('Cache service not initialized');
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
    
    this.cache.set(fullKey, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    return true;
  }

  async delete(key) {
    if (!this.initialized) {
      throw new Error('Cache service not initialized');
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    return this.cache.delete(fullKey);
  }

  async exists(key) {
    if (!this.initialized) {
      throw new Error('Cache service not initialized');
    }

    const fullKey = `${this.config.keyPrefix}${key}`;
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  // File-specific cache methods
  async getFileMetadata(cid) {
    return await this.get(`file:metadata:${cid}`);
  }

  async setFileMetadata(cid, metadata, ttl = null) {
    return await this.set(`file:metadata:${cid}`, metadata, ttl || this.config.ttl);
  }

  async deleteFileMetadata(cid) {
    return await this.delete(`file:metadata:${cid}`);
  }

  async getMetadataMapping(cid) {
    return await this.get(`file:mapping:${cid}`);
  }

  async setMetadataMapping(cid, metadataCid) {
    return await this.set(`file:mapping:${cid}`, metadataCid);
  }

  async deleteMetadataMapping(cid) {
    return await this.delete(`file:mapping:${cid}`);
  }

  async getShareRecord(shareId) {
    return await this.get(`share:${shareId}`);
  }

  async setShareRecord(shareId, shareData) {
    return await this.set(`share:${shareId}`, shareData, 24 * 60 * 60); // 24 hours
  }

  async deleteShareRecord(shareId) {
    return await this.delete(`share:${shareId}`);
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  async healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      service: 'cache',
      entries: this.cache.size,
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    if (this.initialized) {
      logger.info('Shutting down cache service...');
      this.cache.clear();
      this.initialized = false;
    }
  }
}