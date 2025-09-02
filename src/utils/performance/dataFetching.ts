/**
 * Data Fetching Performance Utilities
 * 
 * Provides optimized data fetching strategies including parallel fetching,
 * caching, debouncing, and request deduplication for DAO dashboard components.
 */

import { useCallback, useRef, useMemo } from 'react';

// Cache interface for storing API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration
interface CacheConfig {
  tokenInfo: number; // 5 minutes
  analytics: number; // 1 minute
  votingPower: number; // 2 minutes
  proposals: number; // 30 seconds
}

const CACHE_DURATIONS: CacheConfig = {
  tokenInfo: 5 * 60 * 1000, // 5 minutes
  analytics: 1 * 60 * 1000, // 1 minute
  votingPower: 2 * 60 * 1000, // 2 minutes
  proposals: 30 * 1000, // 30 seconds
};

// Global cache store
const cache = new Map<string, CacheEntry<any>>();

// Active request tracking for deduplication
const activeRequests = new Map<string, Promise<any>>();

/**
 * Cache utility functions
 */
export const cacheUtils = {
  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  },

  /**
   * Set cache entry with expiration
   */
  set<T>(key: string, data: T, duration: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    };
    cache.set(key, entry);
  },

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    cache.delete(key);
  },

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    cache.clear();
  },

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  }
};

/**
 * Request deduplication utility
 */
export const requestDeduplication = {
  /**
   * Execute request with deduplication
   */
  async execute<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already in progress
    if (activeRequests.has(key)) {
      return activeRequests.get(key) as Promise<T>;
    }

    // Start new request
    const promise = requestFn().finally(() => {
      activeRequests.delete(key);
    });

    activeRequests.set(key, promise);
    return promise;
  },

  /**
   * Clear active request
   */
  clear(key: string): void {
    activeRequests.delete(key);
  },

  /**
   * Clear all active requests
   */
  clearAll(): void {
    activeRequests.clear();
  }
};

/**
 * Debounced function utility
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    }) as T,
    [func, delay]
  );
};

/**
 * Parallel data fetching utility
 */
export interface ParallelFetchConfig {
  daoId: string;
  squidId?: string;
  includeWallet?: boolean;
  includeAnalytics?: boolean;
}

export interface ParallelFetchResult {
  dao: any;
  proposals: any[];
  membership: any;
  walletData?: {
    balances: any;
    nfts: any[];
    votingPower: number;
  };
  analytics?: {
    tokenInfo: any;
    proposalStats: any;
  };
  errors: Record<string, string>;
}

/**
 * Hook for optimized parallel data fetching
 */
export const useParallelFetch = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchParallel = useCallback(async (
    config: ParallelFetchConfig,
    fetchFunctions: {
      getDAO: (daoId: string) => Promise<any>;
      getProposals: (daoId: string) => Promise<any[]>;
      getMembership: (daoId: string) => Promise<any>;
      getAllBalances?: (squidId: string) => Promise<any>;
      listUserNFTs?: (squidId: string) => Promise<any[]>;
      getTokenInfo?: (daoId: string) => Promise<any>;
      getProposalStats?: (daoId: string) => Promise<any>;
    }
  ): Promise<ParallelFetchResult> => {
    // Cancel previous request if still active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const result: ParallelFetchResult = {
      dao: null,
      proposals: [],
      membership: null,
      errors: {}
    };

    // Core DAO data promises
    const corePromises = [
      requestDeduplication.execute(`dao-${config.daoId}`, () => 
        fetchFunctions.getDAO(config.daoId)
      ).catch(err => {
        result.errors.dao = err.message;
        return null;
      }),
      
      requestDeduplication.execute(`proposals-${config.daoId}`, () =>
        fetchFunctions.getProposals(config.daoId)
      ).catch(err => {
        result.errors.proposals = err.message;
        return [];
      }),
      
      config.squidId ? requestDeduplication.execute(`membership-${config.daoId}-${config.squidId}`, () =>
        fetchFunctions.getMembership(config.daoId)
      ).catch(err => {
        result.errors.membership = err.message;
        return null;
      }) : Promise.resolve(null)
    ];

    // Wallet data promises (if requested and squidId available)
    const walletPromises: Promise<any>[] = [];
    if (config.includeWallet && config.squidId && fetchFunctions.getAllBalances && fetchFunctions.listUserNFTs) {
      walletPromises.push(
        requestDeduplication.execute(`balances-${config.squidId}`, () =>
          fetchFunctions.getAllBalances!(config.squidId!)
        ).catch(err => {
          result.errors.balances = err.message;
          return null;
        }),
        
        requestDeduplication.execute(`nfts-${config.squidId}`, () =>
          fetchFunctions.listUserNFTs!(config.squidId!)
        ).catch(err => {
          result.errors.nfts = err.message;
          return [];
        })
      );
    }

    // Analytics promises (if requested)
    const analyticsPromises: Promise<any>[] = [];
    if (config.includeAnalytics && fetchFunctions.getTokenInfo && fetchFunctions.getProposalStats) {
      analyticsPromises.push(
        requestDeduplication.execute(`token-info-${config.daoId}`, () =>
          fetchFunctions.getTokenInfo!(config.daoId)
        ).catch(err => {
          result.errors.tokenInfo = err.message;
          return null;
        }),
        
        requestDeduplication.execute(`proposal-stats-${config.daoId}`, () =>
          fetchFunctions.getProposalStats!(config.daoId)
        ).catch(err => {
          result.errors.proposalStats = err.message;
          return null;
        })
      );
    }

    try {
      // Execute all promises in parallel
      const allPromises = [...corePromises, ...walletPromises, ...analyticsPromises];
      const results = await Promise.allSettled(allPromises);

      // Process core results
      const [daoResult, proposalsResult, membershipResult] = results.slice(0, 3);
      
      result.dao = daoResult.status === 'fulfilled' ? daoResult.value : null;
      result.proposals = proposalsResult.status === 'fulfilled' ? proposalsResult.value : [];
      result.membership = membershipResult.status === 'fulfilled' ? membershipResult.value : null;

      // Process wallet results
      if (walletPromises.length > 0) {
        const [balancesResult, nftsResult] = results.slice(3, 5);
        const balances = balancesResult.status === 'fulfilled' ? balancesResult.value : null;
        const nfts = nftsResult.status === 'fulfilled' ? nftsResult.value : [];
        
        result.walletData = {
          balances,
          nfts,
          votingPower: calculateVotingPower(balances, nfts, result.dao)
        };
      }

      // Process analytics results
      if (analyticsPromises.length > 0) {
        const analyticsStartIndex = 3 + walletPromises.length;
        const [tokenInfoResult, proposalStatsResult] = results.slice(analyticsStartIndex, analyticsStartIndex + 2);
        
        result.analytics = {
          tokenInfo: tokenInfoResult.status === 'fulfilled' ? tokenInfoResult.value : null,
          proposalStats: proposalStatsResult.status === 'fulfilled' ? proposalStatsResult.value : null
        };
      }

      return result;
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Request was cancelled');
      }
      throw error;
    }
  }, []);

  const cancelFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { fetchParallel, cancelFetch };
};

/**
 * Calculate voting power based on token balance and NFTs
 */
function calculateVotingPower(balances: any, nfts: any[], dao: any): number {
  if (!dao?.governanceRules) return 0;

  const { votingMechanism } = dao.governanceRules;
  
  switch (votingMechanism) {
    case 'token-weighted':
      return balances?.QToken?.balance || 0;
    case 'nft-weighted':
      return nfts?.length || 0;
    case 'user-based':
    default:
      return 1;
  }
}

/**
 * Cached API call wrapper
 */
export const useCachedApiCall = () => {
  return useCallback(async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    cacheType: keyof CacheConfig = 'proposals'
  ): Promise<T> => {
    // Check cache first
    const cached = cacheUtils.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch with deduplication
    const data = await requestDeduplication.execute(key, fetchFn);
    
    // Cache the result
    cacheUtils.set(key, data, CACHE_DURATIONS[cacheType]);
    
    return data;
  }, []);
};

/**
 * Cleanup utility for component unmounting
 */
export const useCleanup = () => {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const addTimeout = useCallback((timeout: NodeJS.Timeout) => {
    timeoutsRef.current.add(timeout);
  }, []);

  const addInterval = useCallback((interval: NodeJS.Timeout) => {
    intervalsRef.current.add(interval);
  }, []);

  const cleanup = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();

    // Clear all intervals
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current.clear();

    // Clear active requests
    requestDeduplication.clearAll();

    // Clear expired cache entries
    cacheUtils.clearExpired();
  }, []);

  return { addTimeout, addInterval, cleanup };
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure API call performance
   */
  measureApiCall: async <T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<{ data: T; duration: number }> => {
    const startTime = performance.now();
    const data = await apiCall();
    const duration = performance.now() - startTime;
    
    // Log performance metrics
    console.log(`API Call [${name}]: ${duration.toFixed(2)}ms`);
    
    return { data, duration };
  },

  /**
   * Measure component render time
   */
  measureRender: (componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      console.log(`Component Render [${componentName}]: ${duration.toFixed(2)}ms`);
    };
  }
};