/**
 * Qsocial Cache Service
 * 
 * Provides caching functionality for frequently accessed content and metadata.
 * Supports both in-memory caching and Redis (when available).
 * Implements cache invalidation strategies for real-time updates.
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tags: string[]; // For tag-based invalidation
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Tags for invalidation
  compress?: boolean; // Whether to compress large data
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

export interface CacheInvalidationEvent {
  type: 'key' | 'tag' | 'pattern';
  target: string;
  timestamp: number;
}

/**
 * Abstract cache interface for different implementations
 */
export abstract class CacheAdapter {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract keys(pattern?: string): Promise<string[]>;
  abstract invalidateByTag(tag: string): Promise<number>;
  abstract getStats(): Promise<CacheStats>;
}

/**
 * In-memory cache implementation
 */
export class MemoryCacheAdapter extends CacheAdapter {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 10000) {
    super();
    this.maxSize = maxSize;
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 60 * 60 * 1000; // Default 1 hour
    const tags = options.tags || [];

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      tags
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) return allKeys;
    
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  async getStats(): Promise<CacheStats> {
    const totalKeys = this.cache.size;
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;

    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const [key, entry] of this.cache.entries()) {
      memoryUsage += key.length * 2; // String characters are 2 bytes
      memoryUsage += JSON.stringify(entry.data).length * 2;
      memoryUsage += 64; // Overhead for entry metadata
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalKeys,
      memoryUsage
    };
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    // Simple LRU: remove oldest entry
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

/**
 * Redis cache adapter (when Redis is available)
 */
export class RedisCacheAdapter extends CacheAdapter {
  private redis: any; // Redis client
  private stats = { hits: 0, misses: 0 };

  constructor(redisClient: any) {
    super();
    this.redis = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      
      if (!data) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || 60 * 60 * 1000; // Default 1 hour
      const ttlSeconds = Math.floor(ttl / 1000);
      
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds > 0) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      // Store tags for invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttlSeconds);
        }
      }
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.stats = { hits: 0, misses: 0 };
    } catch (error) {
      console.error('Redis clear error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern || '*');
    } catch (error) {
      console.error('Redis keys error:', error);
      return [];
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length === 0) return 0;
      
      // Delete all keys with this tag
      await this.redis.del(...keys);
      
      // Clean up the tag set
      await this.redis.del(`tag:${tag}`);
      
      return keys.length;
    } catch (error) {
      console.error('Redis invalidateByTag error:', error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse Redis info for memory usage and key count
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      const keysMatch = keyspace.match(/keys=(\d+)/);
      const totalKeys = keysMatch ? parseInt(keysMatch[1]) : 0;
      
      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        totalKeys,
        memoryUsage
      };
    } catch (error) {
      console.error('Redis getStats error:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0
      };
    }
  }
}

/**
 * Main cache service with automatic adapter selection
 */
export class CacheService {
  private adapter: CacheAdapter;
  private invalidationListeners: ((event: CacheInvalidationEvent) => void)[] = [];

  constructor(redisClient?: any) {
    // Use Redis if available, otherwise fall back to memory cache
    if (redisClient) {
      this.adapter = new RedisCacheAdapter(redisClient);
      console.log('CacheService: Using Redis adapter');
    } else {
      this.adapter = new MemoryCacheAdapter();
      console.log('CacheService: Using memory adapter');
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    return this.adapter.set(key, value, options);
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.adapter.delete(key);
    
    if (result) {
      this.notifyInvalidation({
        type: 'key',
        target: key,
        timestamp: Date.now()
      });
    }
    
    return result;
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
    
    this.notifyInvalidation({
      type: 'pattern',
      target: '*',
      timestamp: Date.now()
    });
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return this.adapter.exists(key);
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    return this.adapter.keys(pattern);
  }

  /**
   * Invalidate all entries with specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const count = await this.adapter.invalidateByTag(tag);
    
    if (count > 0) {
      this.notifyInvalidation({
        type: 'tag',
        target: tag,
        timestamp: Date.now()
      });
    }
    
    return count;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    return this.adapter.getStats();
  }

  /**
   * Add invalidation listener
   */
  onInvalidation(listener: (event: CacheInvalidationEvent) => void): void {
    this.invalidationListeners.push(listener);
  }

  /**
   * Remove invalidation listener
   */
  offInvalidation(listener: (event: CacheInvalidationEvent) => void): void {
    const index = this.invalidationListeners.indexOf(listener);
    if (index > -1) {
      this.invalidationListeners.splice(index, 1);
    }
  }

  private notifyInvalidation(event: CacheInvalidationEvent): void {
    this.invalidationListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache invalidation listener error:', error);
      }
    });
  }

  /**
   * Destroy cache service and cleanup resources
   */
  destroy(): void {
    if (this.adapter instanceof MemoryCacheAdapter) {
      this.adapter.destroy();
    }
    this.invalidationListeners = [];
  }
}

// Cache key generators for different content types
export const CacheKeys = {
  post: (id: string) => `post:${id}`,
  posts: (options: any) => `posts:${JSON.stringify(options)}`,
  comment: (id: string) => `comment:${id}`,
  comments: (postId: string, options: any) => `comments:${postId}:${JSON.stringify(options)}`,
  subcommunity: (id: string) => `subcommunity:${id}`,
  subcommunities: (options: any) => `subcommunities:${JSON.stringify(options)}`,
  userReputation: (userId: string) => `reputation:${userId}`,
  feed: (userId: string, options: any) => `feed:${userId}:${JSON.stringify(options)}`,
  search: (query: string, filters: any) => `search:${query}:${JSON.stringify(filters)}`,
  trending: (timeRange: string, limit: number) => `trending:${timeRange}:${limit}`,
  recommendations: (userId: string, type: string) => `recommendations:${userId}:${type}`,
  userPosts: (userId: string, options: any) => `user_posts:${userId}:${JSON.stringify(options)}`,
  subcommunityFeed: (subcommunityId: string, options: any) => `subcommunity_feed:${subcommunityId}:${JSON.stringify(options)}`,
  crossPost: (sourceModule: string, sourceId: string) => `cross_post:${sourceModule}:${sourceId}`,
  voteResult: (contentId: string, userId: string) => `vote:${contentId}:${userId}`,
  moderationQueue: (subcommunityId?: string) => subcommunityId ? `moderation:${subcommunityId}` : 'moderation:global',
  analytics: (type: string, timeRange: string) => `analytics:${type}:${timeRange}`
};

// Cache tags for invalidation
export const CacheTags = {
  posts: 'posts',
  comments: 'comments',
  subcommunities: 'subcommunities',
  reputation: 'reputation',
  feeds: 'feeds',
  search: 'search',
  recommendations: 'recommendations',
  votes: 'votes',
  moderation: 'moderation',
  analytics: 'analytics',
  user: (userId: string) => `user:${userId}`,
  subcommunity: (subcommunityId: string) => `subcommunity:${subcommunityId}`,
  post: (postId: string) => `post:${postId}`,
  comment: (commentId: string) => `comment:${commentId}`
};

// Default cache TTL values (in milliseconds)
export const CacheTTL = {
  short: 5 * 60 * 1000,      // 5 minutes
  medium: 30 * 60 * 1000,    // 30 minutes
  long: 60 * 60 * 1000,      // 1 hour
  veryLong: 24 * 60 * 60 * 1000, // 24 hours
  
  // Specific content types
  posts: 30 * 60 * 1000,     // 30 minutes
  comments: 15 * 60 * 1000,  // 15 minutes
  feeds: 5 * 60 * 1000,      // 5 minutes
  search: 10 * 60 * 1000,    // 10 minutes
  reputation: 60 * 60 * 1000, // 1 hour
  subcommunities: 60 * 60 * 1000, // 1 hour
  trending: 15 * 60 * 1000,  // 15 minutes
  recommendations: 30 * 60 * 1000, // 30 minutes
  analytics: 60 * 60 * 1000  // 1 hour
};

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(redisClient?: any): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(redisClient);
  }
  return cacheServiceInstance;
}

export function destroyCacheService(): void {
  if (cacheServiceInstance) {
    cacheServiceInstance.destroy();
    cacheServiceInstance = null;
  }
}