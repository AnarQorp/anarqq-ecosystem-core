/**
 * Intelligent Caching Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntelligentCachingService } from '../services/IntelligentCachingService.js';
import { FlowDefinition } from '../models/FlowDefinition.js';

describe('IntelligentCachingService', () => {
  let cachingService: IntelligentCachingService;

  beforeEach(() => {
    cachingService = new IntelligentCachingService({
      maxSize: 1024 * 1024, // 1MB for testing
      maxEntries: 100,
      defaultTTL: 60000, // 1 minute
      cleanupInterval: 10000, // 10 seconds
      enablePredictive: true,
      enableCompression: false
    });
  });

  afterEach(async () => {
    await cachingService.shutdown();
  });

  describe('Flow Caching', () => {
    it('should cache and retrieve flow definitions', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'squid:user:test',
        description: 'Test flow for caching',
        steps: [],
        metadata: {
          tags: ['test'],
          category: 'testing',
          visibility: 'public',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Cache the flow
      await cachingService.cacheFlow('test-flow', flow);

      // Retrieve the flow
      const cachedFlow = await cachingService.getFlow('test-flow');

      expect(cachedFlow).toEqual(flow);
    });

    it('should return null for non-existent flows', async () => {
      const cachedFlow = await cachingService.getFlow('non-existent');
      expect(cachedFlow).toBeNull();
    });

    it('should handle flow cache expiration', async () => {
      const flow: FlowDefinition = {
        id: 'expiring-flow',
        name: 'Expiring Flow',
        version: '1.0.0',
        owner: 'squid:user:test',
        description: 'Flow that expires quickly',
        steps: [],
        metadata: {
          tags: ['test'],
          category: 'testing',
          visibility: 'public',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Cache with short TTL
      await cachingService.cacheFlow('expiring-flow', flow, 100); // 100ms

      // Should be available immediately
      let cachedFlow = await cachingService.getFlow('expiring-flow');
      expect(cachedFlow).toEqual(flow);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cachedFlow = await cachingService.getFlow('expiring-flow');
      expect(cachedFlow).toBeNull();
    });
  });

  describe('Validation Result Caching', () => {
    it('should cache and retrieve validation results', async () => {
      const validationResult = {
        layerId: 'qlock',
        status: 'passed' as const,
        message: 'Validation passed',
        duration: 100,
        timestamp: new Date().toISOString()
      };

      const operationHash = 'test-operation-hash';

      // Cache the validation result
      await cachingService.cacheValidationResult(operationHash, validationResult);

      // Retrieve the validation result
      const cachedResult = await cachingService.getValidationResult(operationHash);

      expect(cachedResult).toEqual(validationResult);
    });

    it('should handle validation result expiration', async () => {
      const validationResult = {
        layerId: 'qonsent',
        status: 'failed' as const,
        message: 'Validation failed',
        duration: 200,
        timestamp: new Date().toISOString()
      };

      const operationHash = 'expiring-validation';

      // Cache with short TTL
      await cachingService.cacheValidationResult(operationHash, validationResult, 100);

      // Should be available immediately
      let cachedResult = await cachingService.getValidationResult(operationHash);
      expect(cachedResult).toEqual(validationResult);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cachedResult = await cachingService.getValidationResult(operationHash);
      expect(cachedResult).toBeNull();
    });
  });

  describe('Generic Caching', () => {
    it('should cache and retrieve generic data', async () => {
      const testData = { message: 'Hello, World!', timestamp: Date.now() };
      const key = 'test-data';

      // Cache the data
      await cachingService.cache(key, testData, undefined, ['test', 'generic']);

      // Retrieve the data
      const cachedData = await cachingService.get<typeof testData>(key);

      expect(cachedData).toEqual(testData);
    });

    it('should handle generic cache expiration', async () => {
      const testData = { value: 42 };
      const key = 'expiring-data';

      // Cache with short TTL
      await cachingService.cache(key, testData, 100);

      // Should be available immediately
      let cachedData = await cachingService.get(key);
      expect(cachedData).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cachedData = await cachingService.get(key);
      expect(cachedData).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache entries by tags', async () => {
      const flow1: FlowDefinition = {
        id: 'flow1',
        name: 'Flow 1',
        version: '1.0.0',
        owner: 'squid:user:test1',
        description: 'First test flow',
        steps: [],
        metadata: {
          tags: ['test', 'category1'],
          category: 'testing',
          visibility: 'public',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const flow2: FlowDefinition = {
        id: 'flow2',
        name: 'Flow 2',
        version: '1.0.0',
        owner: 'squid:user:test2',
        description: 'Second test flow',
        steps: [],
        metadata: {
          tags: ['test', 'category2'],
          category: 'production',
          visibility: 'public',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Cache both flows
      await cachingService.cacheFlow('flow1', flow1);
      await cachingService.cacheFlow('flow2', flow2);

      // Verify both are cached
      expect(await cachingService.getFlow('flow1')).toEqual(flow1);
      expect(await cachingService.getFlow('flow2')).toEqual(flow2);

      // Invalidate by category tag
      const invalidated = await cachingService.invalidateByTags(['testing']);
      expect(invalidated).toBe(1);

      // flow1 should be invalidated, flow2 should remain
      expect(await cachingService.getFlow('flow1')).toBeNull();
      expect(await cachingService.getFlow('flow2')).toEqual(flow2);
    });

    it('should invalidate specific cache entries', async () => {
      const testData = { value: 'test' };
      await cachingService.cache('test-key', testData);

      // Verify cached
      expect(await cachingService.get('test-key')).toEqual(testData);

      // Invalidate
      const invalidated = await cachingService.invalidate('test-key');
      expect(invalidated).toBe(true);

      // Should be gone
      expect(await cachingService.get('test-key')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', async () => {
      const initialStats = cachingService.getStats();
      expect(initialStats.totalEntries).toBe(0);
      expect(initialStats.hitRate).toBe(0);

      // Cache some data
      await cachingService.cache('key1', { value: 1 });
      await cachingService.cache('key2', { value: 2 });

      // Access cached data (hits)
      await cachingService.get('key1');
      await cachingService.get('key1');

      // Access non-existent data (misses)
      await cachingService.get('non-existent');

      const stats = cachingService.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });
  });

  describe('Usage Patterns', () => {
    it('should track usage patterns', async () => {
      const testData = { value: 'pattern-test' };
      const key = 'pattern-key';

      // Cache and access multiple times
      await cachingService.cache(key, testData);
      await cachingService.get(key);
      await cachingService.get(key);
      await cachingService.get(key);

      const patterns = cachingService.getUsagePatterns();
      const pattern = patterns.find(p => p.key === key);

      expect(pattern).toBeDefined();
      expect(pattern?.frequency).toBeGreaterThan(1);
      expect(pattern?.accessTimes.length).toBeGreaterThan(1);
    });
  });

  describe('Cache Limits and Eviction', () => {
    it('should respect cache size limits', async () => {
      // Create a service with very small limits
      const smallCacheService = new IntelligentCachingService({
        maxSize: 1000, // 1KB
        maxEntries: 2,
        defaultTTL: 60000,
        cleanupInterval: 10000,
        enablePredictive: false,
        enableCompression: false
      });

      try {
        // Add entries that exceed limits
        await smallCacheService.cache('key1', { data: 'x'.repeat(400) });
        await smallCacheService.cache('key2', { data: 'y'.repeat(400) });
        await smallCacheService.cache('key3', { data: 'z'.repeat(400) }); // Should trigger eviction

        const stats = smallCacheService.getStats();
        expect(stats.totalEntries).toBeLessThanOrEqual(2);
        expect(stats.evictionCount).toBeGreaterThan(0);

      } finally {
        await smallCacheService.shutdown();
      }
    });
  });

  describe('Predictive Caching', () => {
    it('should emit predictive cache events', (done) => {
      const predictiveService = new IntelligentCachingService({
        maxSize: 1024 * 1024,
        maxEntries: 100,
        defaultTTL: 60000,
        cleanupInterval: 1000,
        enablePredictive: true,
        enableCompression: false
      });

      predictiveService.on('predictive_cache_triggered', (event) => {
        expect(event.predictions).toBeDefined();
        expect(Array.isArray(event.predictions)).toBe(true);
        predictiveService.shutdown().then(() => done());
      });

      // Simulate usage pattern that would trigger prediction
      predictiveService.performPredictiveCaching();
    });
  });

  describe('Error Handling', () => {
    it('should handle caching errors gracefully', async () => {
      // This test would simulate various error conditions
      // For now, we'll test basic error resilience
      
      const result = await cachingService.get('non-existent-key');
      expect(result).toBeNull();

      const invalidated = await cachingService.invalidate('non-existent-key');
      expect(invalidated).toBe(false);
    });
  });

  describe('Service Lifecycle', () => {
    it('should clear all caches', async () => {
      // Add some data
      await cachingService.cache('key1', { value: 1 });
      await cachingService.cache('key2', { value: 2 });

      let stats = cachingService.getStats();
      expect(stats.totalEntries).toBe(2);

      // Clear all
      await cachingService.clearAll();

      stats = cachingService.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should shutdown gracefully', async () => {
      await cachingService.cache('test', { value: 'test' });
      
      // Should not throw
      await expect(cachingService.shutdown()).resolves.not.toThrow();
      
      // Should be cleared after shutdown
      const stats = cachingService.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
});