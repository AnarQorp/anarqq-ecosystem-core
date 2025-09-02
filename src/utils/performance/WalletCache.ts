/**
 * Wallet Performance Cache
 * Implements intelligent caching strategies for wallet data,
 * identity states, and frequently accessed information
 */

import { PerformanceMonitor } from './PerformanceMonitor';
import { IdentityBalances, WalletPermissions, RiskAssessment, PiWalletStatus } from '../../types/wallet-config';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
  topAccessedKeys: string[];
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxEntries: number;
  enableCompression: boolean;
  enableMetrics: boolean;
  evictionStrategy: 'LRU' | 'LFU' | 'TTL';
}

class WalletCacheClass {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    writes: 0
  };
  
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxEntries: 1000,
    enableCompression: false,
    enableMetrics: true,
    evictionStrategy: 'LRU'
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate cache key for identity-specific data
   */
  private generateKey(identityId: string, dataType: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${identityId}:${dataType}:${btoa(paramString)}`;
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Evict entries based on strategy
   */
  private evict() {
    if (this.cache.size <= this.config.maxEntries) return;

    const entries = Array.from(this.cache.entries());
    let toEvict: string[] = [];

    switch (this.config.evictionStrategy) {
      case 'LRU':
        // Evict least recently used
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        toEvict = entries.slice(0, Math.ceil(entries.length * 0.1)).map(([key]) => key);
        break;
        
      case 'LFU':
        // Evict least frequently used
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        toEvict = entries.slice(0, Math.ceil(entries.length * 0.1)).map(([key]) => key);
        break;
        
      case 'TTL':
        // Evict expired entries first, then oldest
        const expired = entries.filter(([, entry]) => !this.isValid(entry));
        if (expired.length > 0) {
          toEvict = expired.map(([key]) => key);
        } else {
          entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
          toEvict = entries.slice(0, Math.ceil(entries.length * 0.1)).map(([key]) => key);
        }
        break;
    }

    toEvict.forEach(key => {
      this.cache.delete(key);
      this.stats.evictions++;
    });
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (!this.isValid(entry)) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    const metricId = this.config.enableMetrics ? 
      PerformanceMonitor.startMetric('cache_write', 'CACHE_OPERATION', { key, tags }) : null;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      size: this.calculateSize(data)
    };

    this.cache.set(key, entry);
    this.stats.writes++;

    // Evict if necessary
    this.evict();

    if (metricId) {
      PerformanceMonitor.endMetric(metricId, true);
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const metricId = this.config.enableMetrics ? 
      PerformanceMonitor.startMetric('cache_read', 'CACHE_OPERATION', { key }) : null;

    const entry = this.cache.get(key);
    
    if (!entry || !this.isValid(entry)) {
      this.stats.misses++;
      if (metricId) PerformanceMonitor.endMetric(metricId, false, 'Cache miss');
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    if (metricId) PerformanceMonitor.endMetric(metricId, true);
    
    return entry.data as T;
  }

  /**
   * Cache wallet balances for identity
   */
  setBalances(identityId: string, balances: IdentityBalances, ttl?: number): void {
    const key = this.generateKey(identityId, 'balances');
    this.set(key, balances, ttl, ['balances', 'identity', identityId]);
  }

  /**
   * Get cached wallet balances
   */
  getBalances(identityId: string): IdentityBalances | null {
    const key = this.generateKey(identityId, 'balances');
    return this.get<IdentityBalances>(key);
  }

  /**
   * Cache wallet permissions for identity
   */
  setPermissions(identityId: string, permissions: WalletPermissions, ttl?: number): void {
    const key = this.generateKey(identityId, 'permissions');
    this.set(key, permissions, ttl, ['permissions', 'identity', identityId]);
  }

  /**
   * Get cached wallet permissions
   */
  getPermissions(identityId: string): WalletPermissions | null {
    const key = this.generateKey(identityId, 'permissions');
    return this.get<WalletPermissions>(key);
  }

  /**
   * Cache risk assessment for identity
   */
  setRiskAssessment(identityId: string, assessment: RiskAssessment, ttl?: number): void {
    const key = this.generateKey(identityId, 'risk_assessment');
    this.set(key, assessment, ttl || 2 * 60 * 1000, ['risk', 'identity', identityId]); // 2 minutes for risk data
  }

  /**
   * Get cached risk assessment
   */
  getRiskAssessment(identityId: string): RiskAssessment | null {
    const key = this.generateKey(identityId, 'risk_assessment');
    return this.get<RiskAssessment>(key);
  }

  /**
   * Cache Pi Wallet status for identity
   */
  setPiWalletStatus(identityId: string, status: PiWalletStatus, ttl?: number): void {
    const key = this.generateKey(identityId, 'pi_wallet_status');
    this.set(key, status, ttl, ['pi_wallet', 'identity', identityId]);
  }

  /**
   * Get cached Pi Wallet status
   */
  getPiWalletStatus(identityId: string): PiWalletStatus | null {
    const key = this.generateKey(identityId, 'pi_wallet_status');
    return this.get<PiWalletStatus>(key);
  }

  /**
   * Cache transaction history for identity
   */
  setTransactionHistory(identityId: string, transactions: any[], ttl?: number): void {
    const key = this.generateKey(identityId, 'transaction_history');
    this.set(key, transactions, ttl, ['transactions', 'identity', identityId]);
  }

  /**
   * Get cached transaction history
   */
  getTransactionHistory(identityId: string): any[] | null {
    const key = this.generateKey(identityId, 'transaction_history');
    return this.get<any[]>(key);
  }

  /**
   * Cache API response
   */
  setApiResponse(endpoint: string, params: Record<string, any>, response: any, ttl?: number): void {
    const key = this.generateKey('api', endpoint, params);
    this.set(key, response, ttl, ['api', endpoint]);
  }

  /**
   * Get cached API response
   */
  getApiResponse<T>(endpoint: string, params: Record<string, any>): T | null {
    const key = this.generateKey('api', endpoint, params);
    return this.get<T>(key);
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    
    this.cache.forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        invalidated++;
      }
    });
    
    return invalidated;
  }

  /**
   * Invalidate all cache entries for an identity
   */
  invalidateIdentity(identityId: string): number {
    return this.invalidateByTag(identityId);
  }

  /**
   * Preload data for identity switching
   */
  async preloadIdentityData(identityId: string, dataTypes: string[] = ['balances', 'permissions']): Promise<void> {
    const promises: Promise<void>[] = [];

    if (dataTypes.includes('balances') && !this.getBalances(identityId)) {
      promises.push(this.loadAndCacheBalances(identityId));
    }

    if (dataTypes.includes('permissions') && !this.getPermissions(identityId)) {
      promises.push(this.loadAndCachePermissions(identityId));
    }

    if (dataTypes.includes('risk') && !this.getRiskAssessment(identityId)) {
      promises.push(this.loadAndCacheRiskAssessment(identityId));
    }

    await Promise.all(promises);
  }

  /**
   * Load and cache balances (mock implementation)
   */
  private async loadAndCacheBalances(identityId: string): Promise<void> {
    try {
      // Mock API call - in real implementation, this would call the actual service
      const response = await fetch(`/api/qwallet/balances/${identityId}`);
      const balances = await response.json();
      this.setBalances(identityId, balances);
    } catch (error) {
      console.warn(`Failed to preload balances for ${identityId}:`, error);
    }
  }

  /**
   * Load and cache permissions (mock implementation)
   */
  private async loadAndCachePermissions(identityId: string): Promise<void> {
    try {
      // Mock API call
      const response = await fetch(`/api/qwallet/permissions/${identityId}`);
      const permissions = await response.json();
      this.setPermissions(identityId, permissions);
    } catch (error) {
      console.warn(`Failed to preload permissions for ${identityId}:`, error);
    }
  }

  /**
   * Load and cache risk assessment (mock implementation)
   */
  private async loadAndCacheRiskAssessment(identityId: string): Promise<void> {
    try {
      // Mock API call
      const response = await fetch(`/api/qwallet/risk/${identityId}`);
      const assessment = await response.json();
      this.setRiskAssessment(identityId, assessment);
    } catch (error) {
      console.warn(`Failed to preload risk assessment for ${identityId}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const totalSize = entries.reduce((sum, [, entry]) => sum + (entry.size || 0), 0);
    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;
    const missRate = totalAccesses > 0 ? this.stats.misses / totalAccesses : 0;
    
    const accessCounts = entries.map(([, entry]) => entry.accessCount);
    const averageAccessCount = accessCounts.length > 0 ? 
      accessCounts.reduce((a, b) => a + b, 0) / accessCounts.length : 0;
    
    const timestamps = entries.map(([, entry]) => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    // Get top accessed keys
    const sortedByAccess = entries.sort(([, a], [, b]) => b.accessCount - a.accessCount);
    const topAccessedKeys = sortedByAccess.slice(0, 10).map(([key]) => key);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      missRate,
      evictionCount: this.stats.evictions,
      oldestEntry,
      newestEntry,
      averageAccessCount,
      topAccessedKeys
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0
    };
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + (entry.size || 0), 0);
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    const stats = this.getStats();
    return stats.hitRate > 0.5 && stats.totalSize < this.config.maxSize;
  }
}

// Singleton instance
export const WalletCache = new WalletCacheClass();

// React hook for cache operations
export const useWalletCache = () => {
  return {
    setBalances: WalletCache.setBalances.bind(WalletCache),
    getBalances: WalletCache.getBalances.bind(WalletCache),
    setPermissions: WalletCache.setPermissions.bind(WalletCache),
    getPermissions: WalletCache.getPermissions.bind(WalletCache),
    setRiskAssessment: WalletCache.setRiskAssessment.bind(WalletCache),
    getRiskAssessment: WalletCache.getRiskAssessment.bind(WalletCache),
    setPiWalletStatus: WalletCache.setPiWalletStatus.bind(WalletCache),
    getPiWalletStatus: WalletCache.getPiWalletStatus.bind(WalletCache),
    setTransactionHistory: WalletCache.setTransactionHistory.bind(WalletCache),
    getTransactionHistory: WalletCache.getTransactionHistory.bind(WalletCache),
    invalidateIdentity: WalletCache.invalidateIdentity.bind(WalletCache),
    preloadIdentityData: WalletCache.preloadIdentityData.bind(WalletCache),
    getStats: WalletCache.getStats.bind(WalletCache),
    isHealthy: WalletCache.isHealthy.bind(WalletCache)
  };
};