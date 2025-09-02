/**
 * Identity Cache Manager
 * Implements intelligent caching strategies for frequently accessed identities
 * Requirements: 1.1, 1.2, 4.1
 */

import { ExtendedSquidIdentity, IdentityTree, IdentityType } from '@/types/identity';
import { identityStorage, getStorageStats } from '@/utils/storage/identityStorage';

// Cache Configuration
const CACHE_LEVELS = {
  HOT: { maxSize: 10, ttl: 5 * 60 * 1000 }, // 5 minutes - most frequently used
  WARM: { maxSize: 50, ttl: 30 * 60 * 1000 }, // 30 minutes - recently used
  COLD: { maxSize: 200, ttl: 2 * 60 * 60 * 1000 } // 2 hours - occasionally used
} as const;

const PRELOAD_THRESHOLD = 3; // Preload after 3 accesses
const CACHE_INVALIDATION_DELAY = 100; // ms delay for batch invalidation

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  lastAccessed: number;
  accessCount: number;
  level: keyof typeof CACHE_LEVELS;
  expiresAt: number;
  size: number; // Estimated memory size in bytes
}

export interface CacheStats {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  levelStats: {
    [K in keyof typeof CACHE_LEVELS]: {
      entries: number;
      size: number;
      hitRate: number;
    };
  };
  preloadStats: {
    triggered: number;
    successful: number;
    failed: number;
  };
}

export interface PredictiveLoadingConfig {
  enabled: boolean;
  maxPredictions: number;
  confidenceThreshold: number;
  learningRate: number;
}

class IdentityCacheManager {
  private hotCache = new Map<string, CacheEntry<ExtendedSquidIdentity>>();
  private warmCache = new Map<string, CacheEntry<ExtendedSquidIdentity>>();
  private coldCache = new Map<string, CacheEntry<ExtendedSquidIdentity>>();
  private treeCache = new Map<string, CacheEntry<IdentityTree>>();
  
  // Access pattern tracking for predictive loading
  private accessPatterns = new Map<string, number[]>(); // DID -> timestamps
  private switchPatterns = new Map<string, string[]>(); // from DID -> to DIDs
  private preloadQueue = new Set<string>();
  
  // Cache statistics
  private stats: CacheStats = {
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    levelStats: {
      HOT: { entries: 0, size: 0, hitRate: 0 },
      WARM: { entries: 0, size: 0, hitRate: 0 },
      COLD: { entries: 0, size: 0, hitRate: 0 }
    },
    preloadStats: {
      triggered: 0,
      successful: 0,
      failed: 0
    }
  };

  private predictiveConfig: PredictiveLoadingConfig = {
    enabled: true,
    maxPredictions: 5,
    confidenceThreshold: 0.7,
    learningRate: 0.1
  };

  private invalidationQueue = new Set<string>();
  private invalidationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
    this.loadAccessPatterns();
  }

  /**
   * Get identity with intelligent caching
   */
  async getIdentity(did: string): Promise<ExtendedSquidIdentity | null> {
    const startTime = performance.now();
    
    // Check hot cache first
    let cached = this.hotCache.get(did);
    if (cached && this.isValidCacheEntry(cached)) {
      this.updateAccessStats(cached, 'HOT');
      this.recordAccess(did);
      this.stats.totalHits++;
      console.log(`[Identity Cache] HOT cache hit for ${did} (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cached.data;
    }

    // Check warm cache
    cached = this.warmCache.get(did);
    if (cached && this.isValidCacheEntry(cached)) {
      this.updateAccessStats(cached, 'WARM');
      this.promoteToHot(did, cached.data);
      this.recordAccess(did);
      this.stats.totalHits++;
      console.log(`[Identity Cache] WARM cache hit for ${did} (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cached.data;
    }

    // Check cold cache
    cached = this.coldCache.get(did);
    if (cached && this.isValidCacheEntry(cached)) {
      this.updateAccessStats(cached, 'COLD');
      this.promoteToWarm(did, cached.data);
      this.recordAccess(did);
      this.stats.totalHits++;
      console.log(`[Identity Cache] COLD cache hit for ${did} (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cached.data;
    }

    // Cache miss - load from storage
    this.stats.totalMisses++;
    const identity = await identityStorage.getIdentity(did);
    
    if (identity) {
      this.cacheIdentity(identity);
      this.recordAccess(did);
      this.triggerPredictiveLoading(did);
      console.log(`[Identity Cache] Storage hit for ${did} (${(performance.now() - startTime).toFixed(2)}ms)`);
    } else {
      console.log(`[Identity Cache] Miss for ${did} (${(performance.now() - startTime).toFixed(2)}ms)`);
    }

    this.updateHitRate();
    return identity;
  }

  /**
   * Cache identity with intelligent level assignment
   */
  cacheIdentity(identity: ExtendedSquidIdentity): void {
    const size = this.estimateSize(identity);
    const accessCount = this.getAccessCount(identity.did);
    
    // Determine cache level based on access patterns
    let level: keyof typeof CACHE_LEVELS;
    if (accessCount >= 10) {
      level = 'HOT';
    } else if (accessCount >= 3) {
      level = 'WARM';
    } else {
      level = 'COLD';
    }

    const entry: CacheEntry<ExtendedSquidIdentity> = {
      data: identity,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      level,
      expiresAt: Date.now() + CACHE_LEVELS[level].ttl,
      size
    };

    this.setCacheEntry(identity.did, entry, level);
    this.enforceCapacityLimits();
    this.updateStats();
  }

  /**
   * Get identity tree with caching
   */
  async getIdentityTree(rootId: string): Promise<IdentityTree | null> {
    const cached = this.treeCache.get(rootId);
    if (cached && this.isValidCacheEntry(cached)) {
      this.updateAccessStats(cached, 'WARM');
      console.log(`[Identity Cache] Tree cache hit for ${rootId}`);
      return cached.data;
    }

    const tree = await identityStorage.getIdentityTree(rootId);
    if (tree) {
      this.cacheTree(rootId, tree);
    }

    return tree;
  }

  /**
   * Cache identity tree
   */
  cacheTree(rootId: string, tree: IdentityTree): void {
    const entry: CacheEntry<IdentityTree> = {
      data: tree,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      level: 'WARM',
      expiresAt: Date.now() + CACHE_LEVELS.WARM.ttl,
      size: this.estimateTreeSize(tree)
    };

    this.treeCache.set(rootId, entry);
    this.updateStats();
  }

  /**
   * Invalidate cache entries for updated identities
   */
  invalidateIdentity(did: string): void {
    this.invalidationQueue.add(did);
    
    if (this.invalidationTimer) {
      clearTimeout(this.invalidationTimer);
    }

    this.invalidationTimer = setTimeout(() => {
      this.processBatchInvalidation();
    }, CACHE_INVALIDATION_DELAY);
  }

  /**
   * Invalidate tree cache when identity structure changes
   */
  invalidateTree(rootId: string): void {
    this.treeCache.delete(rootId);
    console.log(`[Identity Cache] Tree cache invalidated for ${rootId}`);
  }

  /**
   * Preload likely-to-be-accessed identities
   */
  async preloadIdentities(dids: string[]): Promise<void> {
    const preloadPromises = dids
      .filter(did => !this.isInAnyCache(did) && !this.preloadQueue.has(did))
      .slice(0, this.predictiveConfig.maxPredictions)
      .map(async (did) => {
        this.preloadQueue.add(did);
        this.stats.preloadStats.triggered++;
        
        try {
          const identity = await identityStorage.getIdentity(did);
          if (identity) {
            this.cacheIdentity(identity);
            this.stats.preloadStats.successful++;
            console.log(`[Identity Cache] Preloaded identity: ${did}`);
          }
        } catch (error) {
          this.stats.preloadStats.failed++;
          console.error(`[Identity Cache] Preload failed for ${did}:`, error);
        } finally {
          this.preloadQueue.delete(did);
        }
      });

    await Promise.all(preloadPromises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.hotCache.clear();
    this.warmCache.clear();
    this.coldCache.clear();
    this.treeCache.clear();
    this.accessPatterns.clear();
    this.switchPatterns.clear();
    this.preloadQueue.clear();
    
    this.stats = {
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSize: 0,
      levelStats: {
        HOT: { entries: 0, size: 0, hitRate: 0 },
        WARM: { entries: 0, size: 0, hitRate: 0 },
        COLD: { entries: 0, size: 0, hitRate: 0 }
      },
      preloadStats: {
        triggered: 0,
        successful: 0,
        failed: 0
      }
    };

    console.log('[Identity Cache] All caches cleared');
  }

  /**
   * Configure predictive loading
   */
  configurePredictiveLoading(config: Partial<PredictiveLoadingConfig>): void {
    this.predictiveConfig = { ...this.predictiveConfig, ...config };
    console.log('[Identity Cache] Predictive loading configured:', this.predictiveConfig);
  }

  // Private methods

  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  private updateAccessStats<T>(entry: CacheEntry<T>, level: keyof typeof CACHE_LEVELS): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.levelStats[level].hitRate = 
      (this.stats.levelStats[level].hitRate * 0.9) + (1 * 0.1); // Exponential moving average
  }

  private promoteToHot(did: string, identity: ExtendedSquidIdentity): void {
    this.warmCache.delete(did);
    this.coldCache.delete(did);
    
    const entry: CacheEntry<ExtendedSquidIdentity> = {
      data: identity,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: this.getAccessCount(did),
      level: 'HOT',
      expiresAt: Date.now() + CACHE_LEVELS.HOT.ttl,
      size: this.estimateSize(identity)
    };

    this.setCacheEntry(did, entry, 'HOT');
    this.enforceCapacityLimits();
  }

  private promoteToWarm(did: string, identity: ExtendedSquidIdentity): void {
    this.coldCache.delete(did);
    
    const entry: CacheEntry<ExtendedSquidIdentity> = {
      data: identity,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: this.getAccessCount(did),
      level: 'WARM',
      expiresAt: Date.now() + CACHE_LEVELS.WARM.ttl,
      size: this.estimateSize(identity)
    };

    this.setCacheEntry(did, entry, 'WARM');
    this.enforceCapacityLimits();
  }

  private setCacheEntry(did: string, entry: CacheEntry<ExtendedSquidIdentity>, level: keyof typeof CACHE_LEVELS): void {
    switch (level) {
      case 'HOT':
        this.hotCache.set(did, entry);
        break;
      case 'WARM':
        this.warmCache.set(did, entry);
        break;
      case 'COLD':
        this.coldCache.set(did, entry);
        break;
    }
  }

  private enforceCapacityLimits(): void {
    this.enforceCapacityForLevel('HOT', this.hotCache);
    this.enforceCapacityForLevel('WARM', this.warmCache);
    this.enforceCapacityForLevel('COLD', this.coldCache);
  }

  private enforceCapacityForLevel(
    level: keyof typeof CACHE_LEVELS,
    cache: Map<string, CacheEntry<ExtendedSquidIdentity>>
  ): void {
    const maxSize = CACHE_LEVELS[level].maxSize;
    
    if (cache.size > maxSize) {
      // Remove least recently used entries
      const entries = Array.from(cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = entries.slice(0, cache.size - maxSize);
      toRemove.forEach(([did]) => {
        cache.delete(did);
        console.log(`[Identity Cache] Evicted ${did} from ${level} cache`);
      });
    }
  }

  private recordAccess(did: string): void {
    const now = Date.now();
    const pattern = this.accessPatterns.get(did) || [];
    pattern.push(now);
    
    // Keep only recent accesses (last hour)
    const recentAccesses = pattern.filter(time => now - time < 60 * 60 * 1000);
    this.accessPatterns.set(did, recentAccesses);
  }

  private getAccessCount(did: string): number {
    return this.accessPatterns.get(did)?.length || 0;
  }

  private triggerPredictiveLoading(did: string): void {
    if (!this.predictiveConfig.enabled) return;

    const predictions = this.predictNextAccesses(did);
    if (predictions.length > 0) {
      this.preloadIdentities(predictions).catch(error => {
        console.error('[Identity Cache] Predictive loading failed:', error);
      });
    }
  }

  private predictNextAccesses(currentDid: string): string[] {
    const switchPattern = this.switchPatterns.get(currentDid) || [];
    const predictions: { did: string; confidence: number }[] = [];

    // Analyze switch patterns
    const switchCounts = new Map<string, number>();
    switchPattern.forEach(did => {
      switchCounts.set(did, (switchCounts.get(did) || 0) + 1);
    });

    // Calculate confidence scores
    switchCounts.forEach((count, did) => {
      const confidence = count / switchPattern.length;
      if (confidence >= this.predictiveConfig.confidenceThreshold) {
        predictions.push({ did, confidence });
      }
    });

    // Sort by confidence and return top predictions
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.predictiveConfig.maxPredictions)
      .map(p => p.did);
  }

  private recordIdentitySwitch(fromDid: string, toDid: string): void {
    const pattern = this.switchPatterns.get(fromDid) || [];
    pattern.push(toDid);
    
    // Keep only recent switches (last 100)
    if (pattern.length > 100) {
      pattern.splice(0, pattern.length - 100);
    }
    
    this.switchPatterns.set(fromDid, pattern);
  }

  private isInAnyCache(did: string): boolean {
    return this.hotCache.has(did) || this.warmCache.has(did) || this.coldCache.has(did);
  }

  private processBatchInvalidation(): void {
    const didsToInvalidate = Array.from(this.invalidationQueue);
    this.invalidationQueue.clear();

    didsToInvalidate.forEach(did => {
      this.hotCache.delete(did);
      this.warmCache.delete(did);
      this.coldCache.delete(did);
      console.log(`[Identity Cache] Invalidated cache for ${did}`);
    });

    this.updateStats();
    this.invalidationTimer = null;
  }

  private estimateSize(identity: ExtendedSquidIdentity): number {
    // Rough estimation of memory usage in bytes
    const jsonString = JSON.stringify(identity);
    return jsonString.length * 2; // UTF-16 encoding
  }

  private estimateTreeSize(tree: IdentityTree): number {
    const jsonString = JSON.stringify(tree);
    return jsonString.length * 2;
  }

  private updateStats(): void {
    let totalSize = 0;
    
    // Update level stats
    Object.keys(CACHE_LEVELS).forEach(level => {
      const cache = level === 'HOT' ? this.hotCache : 
                   level === 'WARM' ? this.warmCache : this.coldCache;
      
      let levelSize = 0;
      cache.forEach(entry => {
        levelSize += entry.size;
      });
      
      this.stats.levelStats[level as keyof typeof CACHE_LEVELS] = {
        ...this.stats.levelStats[level as keyof typeof CACHE_LEVELS],
        entries: cache.size,
        size: levelSize
      };
      
      totalSize += levelSize;
    });

    // Add tree cache size
    this.treeCache.forEach(entry => {
      totalSize += entry.size;
    });

    this.stats.totalSize = totalSize;
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
      const expiredKeys: string[] = [];
      cache.forEach((entry, key) => {
        if (now >= entry.expiresAt) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => {
        cache.delete(key);
        cleanedCount++;
      });
    });

    // Clean tree cache
    const expiredTreeKeys: string[] = [];
    this.treeCache.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        expiredTreeKeys.push(key);
      }
    });
    
    expiredTreeKeys.forEach(key => {
      this.treeCache.delete(key);
      cleanedCount++;
    });

    if (cleanedCount > 0) {
      this.updateStats();
      console.log(`[Identity Cache] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  private loadAccessPatterns(): void {
    try {
      const stored = localStorage.getItem('squid_access_patterns');
      if (stored) {
        const data = JSON.parse(stored);
        this.accessPatterns = new Map(data.accessPatterns || []);
        this.switchPatterns = new Map(data.switchPatterns || []);
      }
    } catch (error) {
      console.error('[Identity Cache] Failed to load access patterns:', error);
    }
  }

  private saveAccessPatterns(): void {
    try {
      const data = {
        accessPatterns: Array.from(this.accessPatterns.entries()),
        switchPatterns: Array.from(this.switchPatterns.entries())
      };
      localStorage.setItem('squid_access_patterns', JSON.stringify(data));
    } catch (error) {
      console.error('[Identity Cache] Failed to save access patterns:', error);
    }
  }
}

// Export singleton instance
export const identityCacheManager = new IdentityCacheManager();

// Export utility functions
export async function getCachedIdentity(did: string): Promise<ExtendedSquidIdentity | null> {
  return identityCacheManager.getIdentity(did);
}

export async function getCachedIdentityTree(rootId: string): Promise<IdentityTree | null> {
  return identityCacheManager.getIdentityTree(rootId);
}

export function invalidateIdentityCache(did: string): void {
  identityCacheManager.invalidateIdentity(did);
}

export function invalidateTreeCache(rootId: string): void {
  identityCacheManager.invalidateTree(rootId);
}

export function getCacheStats(): CacheStats {
  return identityCacheManager.getStats();
}

export function clearAllCaches(): void {
  identityCacheManager.clearAll();
}

export async function preloadIdentities(dids: string[]): Promise<void> {
  return identityCacheManager.preloadIdentities(dids);
}

export function configurePredictiveLoading(config: Partial<PredictiveLoadingConfig>): void {
  identityCacheManager.configurePredictiveLoading(config);
}