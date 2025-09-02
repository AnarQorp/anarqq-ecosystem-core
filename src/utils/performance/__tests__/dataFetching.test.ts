/**
 * Data Fetching Performance Utilities Tests
 * 
 * Tests for optimized data fetching strategies including parallel fetching,
 * caching, debouncing, and request deduplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  cacheUtils, 
  requestDeduplication, 
  useParallelFetch, 
  useCachedApiCall,
  useDebounce,
  useCleanup
} from '../dataFetching';

// Mock timers
vi.useFakeTimers();

describe('cacheUtils', () => {
  beforeEach(() => {
    cacheUtils.clearAll();
  });

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
});

describe('requestDeduplication', () => {
  beforeEach(() => {
    requestDeduplication.clearAll();
  });

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
});

describe('useDebounce', () => {
  it('should debounce function calls', () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebounce(mockFn, 300));

    // Call the debounced function multiple times
    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    // Function should not be called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Function should be called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });
});

describe('useParallelFetch', () => {
  it('should fetch data in parallel', async () => {
    const mockGetDAO = vi.fn().mockResolvedValue({ id: 'dao1', name: 'Test DAO' });
    const mockGetProposals = vi.fn().mockResolvedValue([{ id: 'prop1' }]);
    const mockGetMembership = vi.fn().mockResolvedValue({ isMember: true });

    const { result } = renderHook(() => useParallelFetch());

    const config = {
      daoId: 'dao1',
      squidId: 'user1',
      includeWallet: false,
      includeAnalytics: false
    };

    const fetchFunctions = {
      getDAO: mockGetDAO,
      getProposals: mockGetProposals,
      getMembership: mockGetMembership
    };

    const fetchResult = await act(async () => {
      return await result.current.fetchParallel(config, fetchFunctions);
    });

    expect(fetchResult.dao).toEqual({ id: 'dao1', name: 'Test DAO' });
    expect(fetchResult.proposals).toEqual([{ id: 'prop1' }]);
    expect(fetchResult.membership).toEqual({ isMember: true });
    expect(Object.keys(fetchResult.errors)).toHaveLength(0);

    // Verify all functions were called
    expect(mockGetDAO).toHaveBeenCalledWith('dao1');
    expect(mockGetProposals).toHaveBeenCalledWith('dao1');
    expect(mockGetMembership).toHaveBeenCalledWith('dao1');
  });

  it('should handle errors gracefully', async () => {
    const mockGetDAO = vi.fn().mockRejectedValue(new Error('DAO fetch failed'));
    const mockGetProposals = vi.fn().mockResolvedValue([]);
    const mockGetMembership = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useParallelFetch());

    const config = {
      daoId: 'dao1',
      squidId: 'user1',
      includeWallet: false,
      includeAnalytics: false
    };

    const fetchFunctions = {
      getDAO: mockGetDAO,
      getProposals: mockGetProposals,
      getMembership: mockGetMembership
    };

    const fetchResult = await act(async () => {
      return await result.current.fetchParallel(config, fetchFunctions);
    });

    expect(fetchResult.dao).toBeNull();
    expect(fetchResult.proposals).toEqual([]);
    expect(fetchResult.membership).toBeNull();
    expect(fetchResult.errors.dao).toBe('DAO fetch failed');
  });
});

describe('useCachedApiCall', () => {
  beforeEach(() => {
    cacheUtils.clearAll();
    requestDeduplication.clearAll();
  });

  it('should cache API call results', async () => {
    const mockApiCall = vi.fn().mockResolvedValue('api-result');
    const { result } = renderHook(() => useCachedApiCall());

    const key = 'test-api-call';
    
    // First call should execute the API call
    const result1 = await act(async () => {
      return await result.current(key, mockApiCall, 'proposals');
    });

    // Second call should return cached result
    const result2 = await act(async () => {
      return await result.current(key, mockApiCall, 'proposals');
    });

    expect(result1).toBe('api-result');
    expect(result2).toBe('api-result');
    expect(mockApiCall).toHaveBeenCalledTimes(1); // Should only be called once
  });
});

describe('useCleanup', () => {
  it('should track and cleanup timeouts and intervals', () => {
    const { result } = renderHook(() => useCleanup());

    const mockTimeout = setTimeout(() => {}, 1000) as any;
    const mockInterval = setInterval(() => {}, 1000) as any;

    act(() => {
      result.current.addTimeout(mockTimeout);
      result.current.addInterval(mockInterval);
    });

    // Spy on clearTimeout and clearInterval
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    act(() => {
      result.current.cleanup();
    });

    expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
    expect(clearIntervalSpy).toHaveBeenCalledWith(mockInterval);

    clearTimeoutSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});