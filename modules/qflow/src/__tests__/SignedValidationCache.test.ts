/**
 * Unit tests for SignedValidationCache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignedValidationCache } from '../validation/SignedValidationCache.js';
import { ValidationResult, ValidationContext } from '../validation/UniversalValidationPipeline.js';

describe('SignedValidationCache', () => {
  let cache: SignedValidationCache;
  let mockContext: ValidationContext;

  beforeEach(async () => {
    cache = new SignedValidationCache({
      maxEntries: 100,
      defaultTtl: 60000, // 1 minute for testing
      evictionStrategy: 'lru',
      cleanupInterval: 10000
    }, 'test-signing-key');

    await cache.initialize();

    mockContext = {
      requestId: 'test-request-123',
      timestamp: new Date().toISOString(),
      source: 'test',
      metadata: {}
    };
  });

  afterEach(async () => {
    await cache.shutdown();
  });

  describe('Basic Cache Operations', () => {
    it('should initialize successfully', async () => {
      const newCache = new SignedValidationCache();
      await newCache.initialize();
      expect(newCache.isReady()).toBe(true);
      await newCache.shutdown();
    });

    it('should store and retrieve validation results', async () => {
      const testData = { test: 'data' };
      const testResult: ValidationResult = {
        layerId: 'test-layer',
        status: 'passed',
        message: 'Test validation passed',
        duration: 100,
        timestamp: new Date().toISOString()
      };

      // Store result
      await cache.set('test-layer', testData, 'v1.0.0', testResult);

      // Retrieve result
      const cachedResult = await cache.get('test-layer', testData, 'v1.0.0');
      
      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.layerId).toBe('test-layer');
      expect(cachedResult?.status).toBe('passed');
      expect(cachedResult?.cached).toBe(true);
    });

    it('should return null for non-existent cache entries', async () => {
      const result = await cache.get('non-existent', { test: 'data' }, 'v1.0.0');
      expect(result).toBeNull();
    });
  });

  describe('TTL and Expiration', () => {
    it('should respect TTL and expire entries', async () => {
      const testData = { test: 'data' };
      const testResult: ValidationResult = {
        layerId: 'test-layer',
        status: 'passed',
        message: 'Test validation passed',
        duration: 100,
        timestamp: new Date().toISOString()
      };

      // Store with very short TTL
      await cache.set('test-layer', testData, 'v1.0.0', testResult, 100); // 100ms

      // Should be available immediately
      let cachedResult = await cache.get('test-layer', testData, 'v1.0.0');
      expect(cachedResult).toBeTruthy();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cachedResult = await cache.get('test-layer', testData, 'v1.0.0');
      expect(cachedResult).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics correctly', async () => {
      const testData = { test: 'stats-data' };
      const testResult: ValidationResult = {
        layerId: 'test-layer',
        status: 'passed',
        message: 'Test validation passed',
        duration: 100,
        timestamp: new Date().toISOString()
      };

      // Initial stats
      let stats = cache.getStatistics();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);

      // Cache miss
      await cache.get('test-layer', testData, 'v1.0.0');
      stats = cache.getStatistics();
      expect(stats.totalMisses).toBe(1);

      // Cache set
      await cache.set('test-layer', testData, 'v1.0.0', testResult);
      stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(1);

      // Cache hit
      await cache.get('test-layer', testData, 'v1.0.0');
      stats = cache.getStatistics();
      expect(stats.totalHits).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });
});