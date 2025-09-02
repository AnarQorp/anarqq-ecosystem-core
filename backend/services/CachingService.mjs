/**
 * Caching Service
 * Implements intelligent caching strategies and database query optimization
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class CachingService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.caches = new Map();
    this.config = {
      defaultTTL: options.defaultTTL || 300000, // 5 minutes
      maxSize: options.maxSize || 1000,
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      compressionThreshold: options.compressionThreshold || 1024, // 1KB
      ...options
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressions: 0
    };

    this.queryCache = new Map();
    this.queryStats = new Map();
    
    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  /**
   * Create or get a named cache
   */
  getCache(name, options = {}) {
    if (!this.caches.has(name)) {
      this.caches.set(name, {
        name,
        data: new Map(),
        config: { ...this.config, ...options },
        stats: { hits: 0, misses: 0, sets: 0, deletes: 0 }
      });
    }
    return this.caches.get(name);
  }

  /**
   * Set cache value with intelligent TTL and compression
   */
  async set(cacheName, key, value, options = {}) {
    const cache = this.getCache(cacheName);
    const ttl = options.ttl || cache.config.defaultTTL;
    const compress = options.compress !== false && this.shouldCompress(value);
    
    let processedValue = value;
    let metadata = {
      compressed: false,
      originalSize: 0,
      compressedSize: 0
    };

    // Serialize and potentially compress
    if (typeof value === 'object') {
      processedValue = JSON.stringify(value);
      metadata.originalSize = Buffer.byteLength(processedValue, 'utf8');
      
      if (compress && metadata.originalSize > this.config.compressionThreshold) {
        processedValue = await this.compress(processedValue);
        metadata.compressed = true;
        metadata.compressedSize = Buffer.byteLength(processedValue, 'utf8');
        this.stats.compressions++;
      }
    }

    const entry = {
      value: processedValue,
      metadata,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: options.tags || []
    };

    // Evict if cache is full
    if (cache.data.size >= cache.config.maxSize) {
      this.evictLRU(cache);
    }

    cache.data.set(key, entry);
    cache.stats.sets++;
    this.stats.sets++;

    this.emit('cache_set', { cacheName, key, ttl, compressed: metadata.compressed });
    return true;
  }

  /**
   * Get cache value with decompression
   */
  async get(cacheName, key) {
    const cache = this.getCache(cacheName);
    const entry = cache.data.get(key);

    if (!entry) {
      cache.stats.misses++;
      this.stats.misses++;
      this.emit('cache_miss', { cacheName, key });
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      cache.data.delete(key);
      cache.stats.misses++;
      this.stats.misses++;
      this.emit('cache_expired', { cacheName, key });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    cache.stats.hits++;
    this.stats.hits++;

    let value = entry.value;

    // Decompress if needed
    if (entry.metadata.compressed) {
      value = await this.decompress(value);
    }

    // Parse JSON if it was an object
    if (typeof entry.value === 'string' && entry.value.startsWith('{')) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Not JSON, return as string
      }
    }

    this.emit('cache_hit', { cacheName, key, accessCount: entry.accessCount });
    return value;
  }

  /**
   * Cache with automatic key generation and query optimization
   */
  async cacheQuery(query, params, executor, options = {}) {
    const cacheKey = this.generateQueryKey(query, params);
    const cacheName = options.cacheName || 'queries';
    
    // Try to get from cache first
    const cached = await this.get(cacheName, cacheKey);
    if (cached !== null) {
      this.updateQueryStats(query, 'hit');
      return cached;
    }

    // Execute query and cache result
    const startTime = Date.now();
    const result = await executor();
    const duration = Date.now() - startTime;

    // Cache the result with intelligent TTL based on query type
    const ttl = this.calculateQueryTTL(query, duration, options.ttl);
    await this.set(cacheName, cacheKey, result, { ttl, ...options });

    this.updateQueryStats(query, 'miss', duration);
    return result;
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  invalidate(cacheName, pattern) {
    const cache = this.getCache(cacheName);
    let deletedCount = 0;

    if (typeof pattern === 'string') {
      // Pattern-based invalidation
      const regex = new RegExp(pattern);
      for (const [key, entry] of cache.data.entries()) {
        if (regex.test(key)) {
          cache.data.delete(key);
          deletedCount++;
        }
      }
    } else if (Array.isArray(pattern)) {
      // Tag-based invalidation
      for (const [key, entry] of cache.data.entries()) {
        if (entry.tags && entry.tags.some(tag => pattern.includes(tag))) {
          cache.data.delete(key);
          deletedCount++;
        }
      }
    }

    cache.stats.deletes += deletedCount;
    this.stats.deletes += deletedCount;

    this.emit('cache_invalidated', { cacheName, pattern, deletedCount });
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(cacheName) {
    if (cacheName) {
      const cache = this.caches.get(cacheName);
      return cache ? {
        ...cache.stats,
        size: cache.data.size,
        hitRate: cache.stats.hits / (cache.stats.hits + cache.stats.misses) || 0
      } : null;
    }

    return {
      global: {
        ...this.stats,
        hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
      },
      caches: Object.fromEntries(
        Array.from(this.caches.entries()).map(([name, cache]) => [
          name,
          {
            ...cache.stats,
            size: cache.data.size,
            hitRate: cache.stats.hits / (cache.stats.hits + cache.stats.misses) || 0
          }
        ])
      ),
      queries: Object.fromEntries(this.queryStats)
    };
  }

  /**
   * Get query optimization recommendations
   */
  getQueryOptimizations() {
    const recommendations = [];
    
    for (const [query, stats] of this.queryStats.entries()) {
      const hitRate = stats.hits / (stats.hits + stats.misses) || 0;
      const avgDuration = stats.totalDuration / stats.executions || 0;

      if (hitRate < 0.5 && stats.executions > 10) {
        recommendations.push({
          type: 'low_cache_hit_rate',
          query: this.sanitizeQuery(query),
          hitRate,
          executions: stats.executions,
          suggestion: 'Consider increasing cache TTL or optimizing cache key generation'
        });
      }

      if (avgDuration > 100 && stats.executions > 5) {
        recommendations.push({
          type: 'slow_query',
          query: this.sanitizeQuery(query),
          avgDuration,
          executions: stats.executions,
          suggestion: 'Consider adding database indexes or optimizing query structure'
        });
      }

      if (stats.executions > 100 && hitRate > 0.8) {
        recommendations.push({
          type: 'high_cache_efficiency',
          query: this.sanitizeQuery(query),
          hitRate,
          executions: stats.executions,
          suggestion: 'Well-cached query - consider increasing TTL for better performance'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priority = { slow_query: 3, low_cache_hit_rate: 2, high_cache_efficiency: 1 };
      return (priority[b.type] || 0) - (priority[a.type] || 0);
    });
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(cacheName, dataLoader, keys = []) {
    const cache = this.getCache(cacheName);
    const results = [];

    for (const key of keys) {
      try {
        const data = await dataLoader(key);
        await this.set(cacheName, key, data);
        results.push({ key, status: 'success' });
      } catch (error) {
        results.push({ key, status: 'error', error: error.message });
      }
    }

    this.emit('cache_warmed', { cacheName, results });
    return results;
  }

  /**
   * Helper methods
   */
  generateQueryKey(query, params) {
    const normalized = query.replace(/\s+/g, ' ').trim();
    const paramStr = JSON.stringify(params || {});
    return crypto.createHash('md5').update(normalized + paramStr).digest('hex');
  }

  calculateQueryTTL(query, duration, defaultTTL) {
    if (defaultTTL) return defaultTTL;

    // Longer TTL for slower queries (they're more expensive to re-execute)
    if (duration > 1000) return 600000; // 10 minutes
    if (duration > 500) return 300000;  // 5 minutes
    if (duration > 100) return 180000;  // 3 minutes
    return 60000; // 1 minute
  }

  updateQueryStats(query, type, duration = 0) {
    const key = this.sanitizeQuery(query);
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        hits: 0,
        misses: 0,
        executions: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastExecuted: null
      });
    }

    const stats = this.queryStats.get(key);
    if (type === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
      stats.executions++;
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / stats.executions;
      stats.lastExecuted = new Date().toISOString();
    }
  }

  sanitizeQuery(query) {
    return query.replace(/\$\d+|'[^']*'|\d+/g, '?').replace(/\s+/g, ' ').trim();
  }

  shouldCompress(value) {
    if (typeof value !== 'object') return false;
    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized, 'utf8') > this.config.compressionThreshold;
  }

  async compress(data) {
    // Simple compression simulation - in production, use zlib
    return Buffer.from(data).toString('base64');
  }

  async decompress(data) {
    // Simple decompression simulation - in production, use zlib
    return Buffer.from(data, 'base64').toString('utf8');
  }

  evictLRU(cache) {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache.data.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.data.delete(oldestKey);
      this.stats.evictions++;
      this.emit('cache_evicted', { cacheName: cache.name, key: oldestKey });
    }
  }

  cleanup() {
    const now = Date.now();
    let totalExpired = 0;

    for (const [cacheName, cache] of this.caches.entries()) {
      let expired = 0;
      for (const [key, entry] of cache.data.entries()) {
        if (entry.expiresAt < now) {
          cache.data.delete(key);
          expired++;
        }
      }
      totalExpired += expired;
    }

    if (totalExpired > 0) {
      this.emit('cache_cleanup', { expiredEntries: totalExpired });
    }
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.caches.clear();
    this.queryStats.clear();
  }
}

export default CachingService;