/**
 * Tests for CacheService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CacheService, 
  MemoryCacheAdapter, 
  CacheKeys, 
  CacheTags, 
  CacheTTL,
  getCacheService,
  destroyCacheService
} from '../CacheService';

describe('MemoryCacheAdapter', () => {
  let cache: MemoryCacheAdapter;

  beforeEach(() => {
    cache = new MemoryCacheAdapter(100); // Small size for testing
  });

  afterEach(() => {
    cache.destroy();
  });

  it('should store and retrieve values', async () => {
    await cache.set('test-key', 'test-value');
    const value = await cache.get('test-key');
    expect(value).toBe('test-value');
  });

  it('should return null for non-existent keys', async () => {
    const value = await cache.get('non-existent');
    expect(value).toBeNull();
  });

  it('should respect TTL', async () => {
    await cache.set('ttl-key', 'ttl-value', { ttl: 100 }); // 100ms TTL
    
    let value = await cache.get('ttl-key');
    expect(value).toBe('ttl-value');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    value = await cache.get('ttl-key');
    expect(value).toBeNull();
  });

  it('should delete values', async () => {
    await cache.set('delete-key', 'delete-value');
    
    let exists = await cache.exists('delete-key');
    expect(exists).toBe(true);
    
    const deleted = await cache.delete('delete-key');
    expect(deleted).toBe(true);
    
    exists = await cache.exists('delete-key');
    expect(exists).toBe(false);
  });

  it('should clear all values', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    
    await cache.clear();
    
    const value1 = await cache.get('key1');
    const value2 = await cache.get('key2');
    
    expect(value1).toBeNull();
    expect(value2).toBeNull();
  });

  it('should invalidate by tag', async () => {
    await cache.set('tagged1', 'value1', { tags: ['tag1', 'tag2'] });
    await cache.set('tagged2', 'value2', { tags: ['tag1'] });
    await cache.set('tagged3', 'value3', { tags: ['tag2'] });
    await cache.set('untagged', 'value4');
    
    const invalidated = await cache.invalidateByTag('tag1');
    expect(invalidated).toBe(2);
    
    expect(await cache.get('tagged1')).toBeNull();
    expect(await cache.get('tagged2')).toBeNull();
    expect(await cache.get('tagged3')).toBe('value3');
    expect(await cache.get('untagged')).toBe('value4');
  });

  it('should return keys matching pattern', async () => {
    await cache.set('user:123', 'user123');
    await cache.set('user:456', 'user456');
    await cache.set('post:789', 'post789');
    
    const userKeys = await cache.keys('user:*');
    const allKeys = await cache.keys();
    
    expect(userKeys).toHaveLength(2);
    expect(userKeys).toContain('user:123');
    expect(userKeys).toContain('user:456');
    expect(allKeys).toHaveLength(3);
  });

  it('should provide cache statistics', async () => {
    await cache.set('stats-key', 'stats-value');
    await cache.get('stats-key'); // Hit
    await cache.get('non-existent'); // Miss
    
    const stats = await cache.getStats();
    
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.totalKeys).toBe(1);
    expect(stats.memoryUsage).toBeGreaterThan(0);
  });

  it('should evict oldest entries when full', async () => {
    const smallCache = new MemoryCacheAdapter(2);
    
    await smallCache.set('key1', 'value1');
    await smallCache.set('key2', 'value2');
    await smallCache.set('key3', 'value3'); // Should evict key1
    
    expect(await smallCache.get('key1')).toBeNull();
    expect(await smallCache.get('key2')).toBe('value2');
    expect(await smallCache.get('key3')).toBe('value3');
    
    smallCache.destroy();
  });
});

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(() => {
    cacheService.destroy();
  });

  it('should handle cache operations', async () => {
    await cacheService.set('service-key', { data: 'test' });
    const value = await cacheService.get('service-key');
    
    expect(value).toEqual({ data: 'test' });
  });

  it('should notify invalidation listeners', async () => {
    const listener = vi.fn();
    cacheService.onInvalidation(listener);
    
    await cacheService.set('notify-key', 'value');
    await cacheService.delete('notify-key');
    
    expect(listener).toHaveBeenCalledWith({
      type: 'key',
      target: 'notify-key',
      timestamp: expect.any(Number)
    });
  });

  it('should remove invalidation listeners', async () => {
    const listener = vi.fn();
    cacheService.onInvalidation(listener);
    cacheService.offInvalidation(listener);
    
    await cacheService.delete('test-key');
    
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Cache Key Generators', () => {
  it('should generate consistent cache keys', () => {
    const postKey1 = CacheKeys.post('123');
    const postKey2 = CacheKeys.post('123');
    
    expect(postKey1).toBe(postKey2);
    expect(postKey1).toBe('post:123');
  });

  it('should generate different keys for different content', () => {
    const postKey = CacheKeys.post('123');
    const commentKey = CacheKeys.comment('123');
    
    expect(postKey).not.toBe(commentKey);
    expect(postKey).toBe('post:123');
    expect(commentKey).toBe('comment:123');
  });

  it('should handle complex options in keys', () => {
    const feedKey1 = CacheKeys.feed('user123', { limit: 10, sortBy: 'hot' });
    const feedKey2 = CacheKeys.feed('user123', { limit: 10, sortBy: 'hot' });
    const feedKey3 = CacheKeys.feed('user123', { limit: 20, sortBy: 'hot' });
    
    expect(feedKey1).toBe(feedKey2);
    expect(feedKey1).not.toBe(feedKey3);
  });
});

describe('Cache Tags', () => {
  it('should generate consistent cache tags', () => {
    const userTag1 = CacheTags.user('123');
    const userTag2 = CacheTags.user('123');
    
    expect(userTag1).toBe(userTag2);
    expect(userTag1).toBe('user:123');
  });

  it('should have different tags for different content types', () => {
    expect(CacheTags.posts).toBe('posts');
    expect(CacheTags.comments).toBe('comments');
    expect(CacheTags.feeds).toBe('feeds');
  });
});

describe('Cache TTL Values', () => {
  it('should have reasonable TTL values', () => {
    expect(CacheTTL.short).toBe(5 * 60 * 1000); // 5 minutes
    expect(CacheTTL.medium).toBe(30 * 60 * 1000); // 30 minutes
    expect(CacheTTL.long).toBe(60 * 60 * 1000); // 1 hour
    expect(CacheTTL.veryLong).toBe(24 * 60 * 60 * 1000); // 24 hours
  });

  it('should have content-specific TTL values', () => {
    expect(CacheTTL.posts).toBeGreaterThan(0);
    expect(CacheTTL.comments).toBeGreaterThan(0);
    expect(CacheTTL.feeds).toBeGreaterThan(0);
    expect(CacheTTL.search).toBeGreaterThan(0);
  });
});

describe('Singleton Cache Service', () => {
  afterEach(() => {
    destroyCacheService();
  });

  it('should return the same instance', () => {
    const service1 = getCacheService();
    const service2 = getCacheService();
    
    expect(service1).toBe(service2);
  });

  it('should create new instance after destroy', () => {
    const service1 = getCacheService();
    destroyCacheService();
    const service2 = getCacheService();
    
    expect(service1).not.toBe(service2);
  });
});