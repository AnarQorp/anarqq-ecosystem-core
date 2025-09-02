/**
 * Simple Performance Utilities Tests
 * 
 * Basic tests for performance utilities without external dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheUtils, requestDeduplication } from '../dataFetching';

// Mock timers
vi.useFakeTimers();

describe('Performance Utilities - Basic Tests', () => {
  beforeEach(() => {
    cacheUtils.clearAll();
    requestDeduplication.clearAll();
  });

  describe('cacheUtils', () => {
    it('should store and retrieve cached data', () => {
      const testData = { id: 1, name: 'test' };
      const key = 'test-key';
      const duration = 5000;

      cacheUtils.set(key, testData, duration);
      const retrieved = cacheUtils.get(key);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache entries', () => {
      const testData = { id: 1, name: 'test' };
      const key = 'test-key';
      const duration = 1000;

      cacheUtils.set(key, testData, duration);
      
      // Fast-forward time beyond expiration
      vi.advanceTimersByTime(1001);
      
      const retrieved = cacheUtils.get(key);
      expect(retrieved).toBeNull();
    });

    it('should clear specific cache entries', () => {
      cacheUtils.set('key1', 'data1', 5000);
      cacheUtils.set('key2', 'data2', 5000);

      cacheUtils.clear('key1');

      expect(cacheUtils.get('key1')).toBeNull();
      expect(cacheUtils.get('key2')).toBe('data2');
    });

    it('should clear all cache entries', () => {
      cacheUtils.set('key1', 'data1', 5000);
      cacheUtils.set('key2', 'data2', 5000);

      cacheUtils.clearAll();

      expect(cacheUtils.get('key1')).toBeNull();
      expect(cacheUtils.get('key2')).toBeNull();
    });

    it('should clear expired entries', () => {
      cacheUtils.set('key1', 'data1', 1000); // Short duration
      cacheUtils.set('key2', 'data2', 5000); // Long duration

      // Fast-forward time to expire first entry
      vi.advanceTimersByTime(1001);

      cacheUtils.clearExpired();

      expect(cacheUtils.get('key1')).toBeNull();
      expect(cacheUtils.get('key2')).toBe('data2');
    });
  });

  describe('requestDeduplication', () => {
    it('should deduplicate identical requests', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const key = 'test-request';

      // Start two identical requests
      const promise1 = requestDeduplication.execute(key, mockFn);
      const promise2 = requestDeduplication.execute(key, mockFn);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1); // Should only be called once
    });

    it('should handle request failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Request failed'));
      const key = 'test-request';

      await expect(requestDeduplication.execute(key, mockFn)).rejects.toThrow('Request failed');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should allow new requests after completion', async () => {
      const mockFn = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const key = 'test-request';

      // First request
      const result1 = await requestDeduplication.execute(key, mockFn);
      expect(result1).toBe('result1');

      // Second request (should not be deduplicated since first is complete)
      const result2 = await requestDeduplication.execute(key, mockFn);
      expect(result2).toBe('result2');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should clear active requests', () => {
      const mockFn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      const key = 'test-request';

      // Start a request
      requestDeduplication.execute(key, mockFn);

      // Clear it
      requestDeduplication.clear(key);

      // Start another request with same key - should not be deduplicated
      const mockFn2 = vi.fn().mockResolvedValue('result');
      requestDeduplication.execute(key, mockFn2);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance monitoring integration', () => {
    it('should work with basic performance monitoring', () => {
      // Test that performance utilities can be used together
      const key = 'integrated-test';
      const data = { test: 'data' };
      const duration = 5000;

      // Cache some data
      cacheUtils.set(key, data, duration);

      // Verify it's cached
      expect(cacheUtils.get(key)).toEqual(data);

      // Test request deduplication with cached data
      const mockFn = vi.fn().mockResolvedValue('fresh-data');
      
      // This should use the mock function since we're not using the cached API call wrapper
      return requestDeduplication.execute(key, mockFn).then(result => {
        expect(result).toBe('fresh-data');
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });
  });
});

describe('Performance thresholds and configuration', () => {
  it('should have reasonable default cache durations', () => {
    // Test that cache durations are reasonable
    const shortDuration = 30 * 1000; // 30 seconds
    const mediumDuration = 2 * 60 * 1000; // 2 minutes
    const longDuration = 5 * 60 * 1000; // 5 minutes

    cacheUtils.set('short', 'data', shortDuration);
    cacheUtils.set('medium', 'data', mediumDuration);
    cacheUtils.set('long', 'data', longDuration);

    // All should be available immediately
    expect(cacheUtils.get('short')).toBe('data');
    expect(cacheUtils.get('medium')).toBe('data');
    expect(cacheUtils.get('long')).toBe('data');

    // Fast-forward past short duration
    vi.advanceTimersByTime(shortDuration + 1);
    expect(cacheUtils.get('short')).toBeNull();
    expect(cacheUtils.get('medium')).toBe('data');
    expect(cacheUtils.get('long')).toBe('data');

    // Fast-forward past medium duration
    vi.advanceTimersByTime(mediumDuration);
    expect(cacheUtils.get('medium')).toBeNull();
    expect(cacheUtils.get('long')).toBe('data');

    // Fast-forward past long duration
    vi.advanceTimersByTime(longDuration);
    expect(cacheUtils.get('long')).toBeNull();
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});