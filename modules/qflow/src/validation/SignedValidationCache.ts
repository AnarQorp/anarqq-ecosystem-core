/**
 * Signed Validation Cache for Qflow Universal Validation Pipeline
 * 
 * Implements signed+TTL'd cache keyed by (layer, inputHash, policyVersion)
 * with cache eviction policies and integrity verification.
 * Provides streaming validation pipeline with short-circuit on failure.
 */

import { createHash, createHmac } from 'crypto';
import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ValidationResult, ValidationContext } from './UniversalValidationPipeline.js';

export interface CacheKey {
  layer: string;
  inputHash: string;
  policyVersion: string;
}

export interface SignedCacheEntry {
  key: CacheKey;
  result: ValidationResult;
  ttl: number;
  signature: string;
  timestamp: string;
  accessCount: number;
  lastAccessed: string;
  policyVersion: string;
  integrity: {
    checksum: string;
    algorithm: string;
    verified: boolean;
  };
}

export interface CacheEvictionPolicy {
  maxEntries: number;
  defaultTtl: number;
  maxTtl: number;
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'hybrid';
  cleanupInterval: number;
  compressionThreshold: number;
}

export interface CacheStatistics {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  totalIntegrityFailures: number;
  hitRate: number;
  averageAccessTime: number;
  cacheSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface StreamingValidationOptions {
  shortCircuitOnFailure: boolean;
  parallelValidation: boolean;
  maxConcurrency: number;
  timeoutPerLayer: number;
  retryFailedLayers: boolean;
  retryAttempts: number;
}

/**
 * Signed Validation Cache
 * Provides high-performance, integrity-verified caching for validation results
 */
export class SignedValidationCache extends EventEmitter {
  private cache: Map<string, SignedCacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private accessFrequency: Map<string, number> = new Map(); // For LFU tracking
  private evictionPolicy: CacheEvictionPolicy;
  private statistics: CacheStatistics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private signingKey: string;
  private isInitialized = false;

  constructor(evictionPolicy?: Partial<CacheEvictionPolicy>, signingKey?: string) {
    super();
    
    this.evictionPolicy = {
      maxEntries: 10000,
      defaultTtl: 300000, // 5 minutes
      maxTtl: 3600000, // 1 hour
      evictionStrategy: 'hybrid',
      cleanupInterval: 60000, // 1 minute
      compressionThreshold: 1024, // 1KB
      ...evictionPolicy
    };

    this.signingKey = signingKey || process.env.QFLOW_CACHE_SIGNING_KEY || 'default-signing-key';
    
    this.statistics = {
      totalEntries: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      totalIntegrityFailures: 0,
      hitRate: 0,
      averageAccessTime: 0,
      cacheSize: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }

  /**
   * Initialize the cache
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[SignedValidationCache] 🔍 Initializing Signed Validation Cache...');

    try {
      // Start cleanup timer
      this.startCleanupTimer();

      this.isInitialized = true;
      console.log('[SignedValidationCache] ✅ Signed Validation Cache initialized');

      // Emit initialization event
      qflowEventEmitter.emit('q.qflow.cache.initialized.v1', {
        cacheType: 'signed-validation-cache',
        maxEntries: this.evictionPolicy.maxEntries,
        evictionStrategy: this.evictionPolicy.evictionStrategy,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[SignedValidationCache] ❌ Failed to initialize:', error);
      throw new Error(`Signed Validation Cache initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get cached validation result
   */
  async get(layer: string, inputData: any, policyVersion: string): Promise<ValidationResult | null> {
    if (!this.isInitialized) {
      throw new Error('Signed Validation Cache not initialized');
    }

    const startTime = Date.now();
    const inputHash = this.hashInput(inputData);
    const cacheKeyString = this.generateCacheKeyString({ layer, inputHash, policyVersion });

    try {
      const entry = this.cache.get(cacheKeyString);
      
      if (!entry) {
        this.statistics.totalMisses++;
        this.updateStatistics();
        return null;
      }

      // Check TTL
      if (Date.now() > entry.ttl) {
        console.log(`[SignedValidationCache] ⏰ Cache entry expired: ${layer}`);
        this.cache.delete(cacheKeyString);
        this.removeFromAccessOrder(cacheKeyString);
        this.statistics.totalMisses++;
        this.statistics.totalEvictions++;
        this.updateStatistics();
        return null;
      }

      // Verify integrity
      const isValid = await this.verifyEntryIntegrity(entry);
      if (!isValid) {
        console.error(`[SignedValidationCache] 🔒 Integrity verification failed: ${layer}`);
        this.cache.delete(cacheKeyString);
        this.removeFromAccessOrder(cacheKeyString);
        this.statistics.totalIntegrityFailures++;
        this.statistics.totalMisses++;
        this.updateStatistics();
        
        // Emit integrity failure event
        qflowEventEmitter.emit('q.qflow.cache.integrity.failed.v1', {
          layer,
          cacheKey: cacheKeyString,
          timestamp: new Date().toISOString()
        });
        
        return null;
      }

      // Update access tracking
      this.updateAccessTracking(cacheKeyString, entry);
      
      const accessTime = Date.now() - startTime;
      this.statistics.totalHits++;
      this.statistics.averageAccessTime = (this.statistics.averageAccessTime + accessTime) / 2;
      this.updateStatistics();

      console.log(`[SignedValidationCache] 💾 Cache hit: ${layer} (${accessTime}ms)`);

      // Emit cache hit event
      qflowEventEmitter.emit('q.qflow.cache.hit.v1', {
        layer,
        accessTime,
        ttlRemaining: entry.ttl - Date.now(),
        timestamp: new Date().toISOString()
      });

      return {
        ...entry.result,
        cached: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[SignedValidationCache] ❌ Cache get error: ${layer}:`, error);
      this.statistics.totalMisses++;
      this.updateStatistics();
      return null;
    }
  }

  /**
   * Store validation result in cache
   */
  async set(
    layer: string, 
    inputData: any, 
    policyVersion: string, 
    result: ValidationResult, 
    customTtl?: number
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Signed Validation Cache not initialized');
    }

    const inputHash = this.hashInput(inputData);
    const cacheKey: CacheKey = { layer, inputHash, policyVersion };
    const cacheKeyString = this.generateCacheKeyString(cacheKey);

    try {
      // Check if we need to evict entries
      await this.enforceEvictionPolicy();

      // Create signed cache entry
      const entry = await this.createSignedEntry(cacheKey, result, customTtl);
      
      // Store in cache
      this.cache.set(cacheKeyString, entry);
      this.updateAccessOrder(cacheKeyString);
      
      this.statistics.totalEntries = this.cache.size;
      this.updateStatistics();

      console.log(`[SignedValidationCache] 💾 Cache set: ${layer} (TTL: ${Math.round((entry.ttl - Date.now()) / 1000)}s)`);

      // Emit cache set event
      qflowEventEmitter.emit('q.qflow.cache.set.v1', {
        layer,
        ttl: entry.ttl - Date.now(),
        entrySize: JSON.stringify(entry).length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[SignedValidationCache] ❌ Cache set error: ${layer}:`, error);
      throw error;
    }
  }

  /**
   * Streaming validation with cache integration
   */
  async streamingValidation(
    layers: string[],
    inputData: any,
    policyVersion: string,
    validators: Map<string, (data: any, context: ValidationContext) => Promise<ValidationResult>>,
    context: ValidationContext,
    options: StreamingValidationOptions
  ): Promise<{
    results: ValidationResult[];
    cacheHits: number;
    cacheMisses: number;
    shortCircuited: boolean;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;
    let shortCircuited = false;

    console.log(`[SignedValidationCache] 🔄 Starting streaming validation: ${layers.length} layers`);

    try {
      for (const layer of layers) {
        const layerStartTime = Date.now();

        try {
          // Try cache first
          const cachedResult = await this.get(layer, inputData, policyVersion);
          
          if (cachedResult) {
            results.push(cachedResult);
            cacheHits++;
            console.log(`[SignedValidationCache] ⚡ Layer ${layer}: Cache hit (${Date.now() - layerStartTime}ms)`);
          } else {
            // Execute validator
            const validator = validators.get(layer);
            if (!validator) {
              const errorResult: ValidationResult = {
                layerId: layer,
                status: 'failed',
                message: `No validator found for layer: ${layer}`,
                duration: Date.now() - layerStartTime,
                timestamp: new Date().toISOString()
              };
              results.push(errorResult);
              cacheMisses++;
              
              if (options.shortCircuitOnFailure) {
                shortCircuited = true;
                break;
              }
              continue;
            }

            // Execute with timeout
            const result = await this.executeWithTimeout(
              validator(inputData, context),
              options.timeoutPerLayer
            );
            
            result.duration = Date.now() - layerStartTime;
            result.timestamp = new Date().toISOString();
            
            results.push(result);
            cacheMisses++;

            // Cache successful results
            if (result.status !== 'failed') {
              await this.set(layer, inputData, policyVersion, result);
            }

            console.log(`[SignedValidationCache] ⚡ Layer ${layer}: Executed (${result.duration}ms, ${result.status.toUpperCase()})`);
          }

          // Short circuit on failure if enabled
          if (options.shortCircuitOnFailure && results[results.length - 1].status === 'failed') {
            console.log(`[SignedValidationCache] ⚡ Short-circuiting on layer failure: ${layer}`);
            shortCircuited = true;
            break;
          }

        } catch (error) {
          const errorResult: ValidationResult = {
            layerId: layer,
            status: 'failed',
            message: `Layer execution error: ${error instanceof Error ? error.message : String(error)}`,
            duration: Date.now() - layerStartTime,
            timestamp: new Date().toISOString()
          };
          
          results.push(errorResult);
          cacheMisses++;
          
          if (options.shortCircuitOnFailure) {
            shortCircuited = true;
            break;
          }
        }
      }

      const totalDuration = Date.now() - startTime;

      console.log(`[SignedValidationCache] ✅ Streaming validation complete: ${results.length} results, ${cacheHits} hits, ${cacheMisses} misses (${totalDuration}ms)`);

      // Emit streaming validation event
      qflowEventEmitter.emit('q.qflow.cache.streaming.completed.v1', {
        layersCount: layers.length,
        resultsCount: results.length,
        cacheHits,
        cacheMisses,
        shortCircuited,
        totalDuration,
        timestamp: new Date().toISOString()
      });

      return {
        results,
        cacheHits,
        cacheMisses,
        shortCircuited,
        totalDuration
      };

    } catch (error) {
      console.error('[SignedValidationCache] ❌ Streaming validation error:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    
    this.statistics.totalEntries = 0;
    this.statistics.totalEvictions += size;
    this.updateStatistics();
    
    console.log(`[SignedValidationCache] 🧹 Cache cleared: ${size} entries removed`);

    // Emit cache clear event
    qflowEventEmitter.emit('q.qflow.cache.cleared.v1', {
      entriesRemoved: size,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics };
  }

  /**
   * Update eviction policy
   */
  updateEvictionPolicy(updates: Partial<CacheEvictionPolicy>): void {
    this.evictionPolicy = { ...this.evictionPolicy, ...updates };
    console.log('[SignedValidationCache] 📋 Eviction policy updated');
  }

  /**
   * Check if cache is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown cache
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    await this.clear();
    this.isInitialized = false;
    
    console.log('[SignedValidationCache] 🛑 Signed Validation Cache shutdown complete');
  }

  // Private methods

  /**
   * Hash input data for cache key
   */
  private hashInput(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate cache key string
   */
  private generateCacheKeyString(key: CacheKey): string {
    return `${key.layer}:${key.inputHash}:${key.policyVersion}`;
  }

  /**
   * Create signed cache entry
   */
  private async createSignedEntry(
    key: CacheKey, 
    result: ValidationResult, 
    customTtl?: number
  ): Promise<SignedCacheEntry> {
    const now = Date.now();
    const ttl = now + (customTtl || this.evictionPolicy.defaultTtl);
    const timestamp = new Date().toISOString();
    
    // Create integrity checksum
    const resultString = JSON.stringify(result);
    const checksum = createHash('sha256').update(resultString).digest('hex');
    
    // Create signature
    const signatureInput = `${this.generateCacheKeyString(key)}:${resultString}:${ttl}:${timestamp}`;
    const signature = createHmac('sha256', this.signingKey).update(signatureInput).digest('hex');

    return {
      key,
      result: { ...result },
      ttl,
      signature,
      timestamp,
      accessCount: 0,
      lastAccessed: timestamp,
      policyVersion: key.policyVersion,
      integrity: {
        checksum,
        algorithm: 'sha256',
        verified: true
      }
    };
  }

  /**
   * Verify entry integrity
   */
  private async verifyEntryIntegrity(entry: SignedCacheEntry): Promise<boolean> {
    try {
      // Verify checksum
      const resultString = JSON.stringify(entry.result);
      const expectedChecksum = createHash('sha256').update(resultString).digest('hex');
      
      if (entry.integrity.checksum !== expectedChecksum) {
        console.error('[SignedValidationCache] 🔒 Checksum mismatch');
        return false;
      }

      // Verify signature
      const signatureInput = `${this.generateCacheKeyString(entry.key)}:${resultString}:${entry.ttl}:${entry.timestamp}`;
      const expectedSignature = createHmac('sha256', this.signingKey).update(signatureInput).digest('hex');
      
      if (entry.signature !== expectedSignature) {
        console.error('[SignedValidationCache] 🔒 Signature mismatch');
        return false;
      }

      return true;

    } catch (error) {
      console.error('[SignedValidationCache] 🔒 Integrity verification error:', error);
      return false;
    }
  }

  /**
   * Update access tracking
   */
  private updateAccessTracking(cacheKeyString: string, entry: SignedCacheEntry): void {
    // Update access count and timestamp
    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    
    // Update LRU order
    this.updateAccessOrder(cacheKeyString);
    
    // Update LFU frequency
    const currentFreq = this.accessFrequency.get(cacheKeyString) || 0;
    this.accessFrequency.set(cacheKeyString, currentFreq + 1);
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(cacheKeyString: string): void {
    // Remove from current position
    this.removeFromAccessOrder(cacheKeyString);
    
    // Add to end (most recently used)
    this.accessOrder.push(cacheKeyString);
  }

  /**
   * Remove from access order
   */
  private removeFromAccessOrder(cacheKeyString: string): void {
    const index = this.accessOrder.indexOf(cacheKeyString);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Enforce eviction policy
   */
  private async enforceEvictionPolicy(): Promise<void> {
    if (this.cache.size < this.evictionPolicy.maxEntries) {
      return;
    }

    const entriesToEvict = Math.max(1, Math.floor(this.evictionPolicy.maxEntries * 0.1)); // Evict 10%
    
    console.log(`[SignedValidationCache] 🧹 Evicting ${entriesToEvict} entries (${this.evictionPolicy.evictionStrategy} strategy)`);

    switch (this.evictionPolicy.evictionStrategy) {
      case 'lru':
        await this.evictLRU(entriesToEvict);
        break;
      case 'lfu':
        await this.evictLFU(entriesToEvict);
        break;
      case 'ttl':
        await this.evictByTTL(entriesToEvict);
        break;
      case 'hybrid':
        await this.evictHybrid(entriesToEvict);
        break;
    }

    this.statistics.totalEvictions += entriesToEvict;
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(count: number): Promise<void> {
    const toEvict = this.accessOrder.slice(0, count);
    
    for (const key of toEvict) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.accessFrequency.delete(key);
    }
  }

  /**
   * Evict least frequently used entries
   */
  private async evictLFU(count: number): Promise<void> {
    const entries = Array.from(this.accessFrequency.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.accessFrequency.delete(key);
    }
  }

  /**
   * Evict entries by TTL (shortest remaining time first)
   */
  private async evictByTTL(count: number): Promise<void> {
    const now = Date.now();
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.ttl - b.ttl)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.accessFrequency.delete(key);
    }
  }

  /**
   * Hybrid eviction strategy
   */
  private async evictHybrid(count: number): Promise<void> {
    const now = Date.now();
    
    // Score entries based on multiple factors
    const scoredEntries = Array.from(this.cache.entries()).map(([key, entry]) => {
      const age = now - new Date(entry.timestamp).getTime();
      const frequency = this.accessFrequency.get(key) || 0;
      const ttlRemaining = entry.ttl - now;
      
      // Lower score = higher priority for eviction
      const score = (frequency * 0.4) + (ttlRemaining / 1000 * 0.3) - (age / 1000 * 0.3);
      
      return { key, score };
    });
    
    // Sort by score (lowest first) and take the count needed
    const toEvict = scoredEntries
      .sort((a, b) => a.score - b.score)
      .slice(0, count);
    
    for (const { key } of toEvict) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.accessFrequency.delete(key);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Validation timeout after ${timeout}ms`));
      }, timeout);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.evictionPolicy.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.accessFrequency.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[SignedValidationCache] 🧹 Cleaned ${cleaned} expired entries`);
      this.statistics.totalEvictions += cleaned;
      this.updateStatistics();
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    this.statistics.totalEntries = this.cache.size;
    this.statistics.hitRate = this.statistics.totalHits / (this.statistics.totalHits + this.statistics.totalMisses) || 0;
    this.statistics.cacheSize = JSON.stringify(Array.from(this.cache.values())).length;
    
    // Find oldest and newest entries
    let oldest: string | null = null;
    let newest: string | null = null;
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const [key, entry] of this.cache) {
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime < oldestTime) {
        oldestTime = entryTime;
        oldest = key;
      }
      if (entryTime > newestTime) {
        newestTime = entryTime;
        newest = key;
      }
    }
    
    this.statistics.oldestEntry = oldest;
    this.statistics.newestEntry = newest;
  }
}

// Export singleton instance
export const signedValidationCache = new SignedValidationCache();