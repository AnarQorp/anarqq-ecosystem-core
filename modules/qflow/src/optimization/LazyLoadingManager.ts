/**
 * Lazy Loading Manager
 * 
 * Manages lazy loading of flow components, templates, and modules
 * to optimize memory usage and startup time.
 */

import { EventEmitter } from 'events';

export interface LazyLoadConfig {
  maxCacheSize: number;
  preloadThreshold: number;
  compressionEnabled: boolean;
  persistentCache: boolean;
  loadTimeout: number;
}

export interface ComponentMetadata {
  id: string;
  type: 'step' | 'template' | 'module' | 'validator';
  size: number;
  dependencies: string[];
  priority: number;
  lastAccessed: number;
  accessCount: number;
  loadTime: number;
}

export interface LoadingStrategy {
  name: string;
  shouldPreload: (metadata: ComponentMetadata) => boolean;
  loadPriority: (metadata: ComponentMetadata) => number;
}

export interface CacheEntry<T> {
  data: T;
  metadata: ComponentMetadata;
  compressed: boolean;
  timestamp: number;
  accessCount: number;
}

export class LazyLoadingManager extends EventEmitter {
  private config: LazyLoadConfig;
  private cache: Map<string, CacheEntry<any>>;
  private loaders: Map<string, () => Promise<any>>;
  private loadingPromises: Map<string, Promise<any>>;
  private metadata: Map<string, ComponentMetadata>;
  private strategies: LoadingStrategy[];
  private currentCacheSize: number;

  constructor(config: LazyLoadConfig) {
    super();
    this.config = config;
    this.cache = new Map();
    this.loaders = new Map();
    this.loadingPromises = new Map();
    this.metadata = new Map();
    this.strategies = [];
    this.currentCacheSize = 0;

    this.initializeDefaultStrategies();
    this.startCacheCleanup();
  }

  /**
   * Register a component for lazy loading
   */
  public registerComponent<T>(
    id: string,
    loader: () => Promise<T>,
    metadata: Partial<ComponentMetadata>
  ): void {
    const fullMetadata: ComponentMetadata = {
      id,
      type: metadata.type || 'module',
      size: metadata.size || 0,
      dependencies: metadata.dependencies || [],
      priority: metadata.priority || 5,
      lastAccessed: 0,
      accessCount: 0,
      loadTime: 0
    };

    this.loaders.set(id, loader);
    this.metadata.set(id, fullMetadata);

    this.emit('component_registered', { id, metadata: fullMetadata });
  }

  /**
   * Load a component with lazy loading
   */
  public async loadComponent<T>(id: string): Promise<T> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      this.updateAccessMetrics(id);
      this.emit('cache_hit', { id, type: cached.metadata.type });
      return cached.data;
    }

    // Check if already loading
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id);
    }

    // Start loading
    const loadingPromise = this.performLoad<T>(id);
    this.loadingPromises.set(id, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(id);
    }
  }

  /**
   * Preload components based on strategies
   */
  public async preloadComponents(context?: any): Promise<void> {
    const candidates = Array.from(this.metadata.values())
      .filter(meta => !this.cache.has(meta.id))
      .filter(meta => this.shouldPreload(meta, context))
      .sort((a, b) => this.getLoadPriority(b) - this.getLoadPriority(a))
      .slice(0, 10); // Limit preloading

    const preloadPromises = candidates.map(async (meta) => {
      try {
        await this.loadComponent(meta.id);
        this.emit('component_preloaded', { id: meta.id });
      } catch (error) {
        this.emit('preload_failed', { id: meta.id, error: error.message });
      }
    });

    await Promise.allSettled(preloadPromises);

    this.emit('preload_completed', {
      attempted: candidates.length,
      successful: candidates.length - preloadPromises.length
    });
  }

  /**
   * Load dependencies for a component
   */
  public async loadDependencies(id: string): Promise<void> {
    const metadata = this.metadata.get(id);
    if (!metadata || metadata.dependencies.length === 0) {
      return;
    }

    const depPromises = metadata.dependencies.map(depId => 
      this.loadComponent(depId)
    );

    await Promise.all(depPromises);

    this.emit('dependencies_loaded', {
      componentId: id,
      dependencyCount: metadata.dependencies.length
    });
  }

  /**
   * Register a loading strategy
   */
  public registerStrategy(strategy: LoadingStrategy): void {
    this.strategies.push(strategy);
    this.emit('strategy_registered', { name: strategy.name });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): any {
    const totalEntries = this.cache.size;
    const totalSize = this.currentCacheSize;
    const hitRate = this.calculateHitRate();
    const memoryUsage = totalSize / this.config.maxCacheSize;

    return {
      totalEntries,
      totalSize,
      maxSize: this.config.maxCacheSize,
      hitRate,
      memoryUsage,
      loadingCount: this.loadingPromises.size,
      registeredComponents: this.loaders.size
    };
  }

  /**
   * Clear cache entries
   */
  public clearCache(filter?: (entry: CacheEntry<any>) => boolean): void {
    if (!filter) {
      this.cache.clear();
      this.currentCacheSize = 0;
    } else {
      for (const [id, entry] of this.cache.entries()) {
        if (filter(entry)) {
          this.cache.delete(id);
          this.currentCacheSize -= entry.metadata.size;
        }
      }
    }

    this.emit('cache_cleared', { remainingEntries: this.cache.size });
  }

  /**
   * Get component metadata
   */
  public getComponentMetadata(id: string): ComponentMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * Update component priority
   */
  public updateComponentPriority(id: string, priority: number): void {
    const metadata = this.metadata.get(id);
    if (metadata) {
      metadata.priority = priority;
      this.emit('priority_updated', { id, priority });
    }
  }

  /**
   * Get loading recommendations
   */
  public getLoadingRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getCacheStats();

    if (stats.hitRate < 0.7) {
      recommendations.push('Consider increasing cache size or adjusting preload strategies');
    }

    if (stats.memoryUsage > 0.9) {
      recommendations.push('Cache is near capacity, consider cleanup or size increase');
    }

    const heavyComponents = Array.from(this.metadata.values())
      .filter(m => m.size > 10 * 1024 * 1024) // > 10MB
      .length;

    if (heavyComponents > 0) {
      recommendations.push(`${heavyComponents} heavy components detected, enable compression`);
    }

    return recommendations;
  }

  // Private methods

  private async performLoad<T>(id: string): Promise<T> {
    const loader = this.loaders.get(id);
    const metadata = this.metadata.get(id);

    if (!loader || !metadata) {
      throw new Error(`Component ${id} not registered`);
    }

    const startTime = Date.now();

    try {
      // Load dependencies first
      await this.loadDependencies(id);

      // Load the component
      this.emit('loading_started', { id, type: metadata.type });
      
      const data = await Promise.race([
        loader(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Load timeout')), this.config.loadTimeout)
        )
      ]);

      const loadTime = Date.now() - startTime;

      // Update metadata
      metadata.loadTime = loadTime;
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;

      // Cache the result
      await this.cacheComponent(id, data, metadata);

      this.emit('loading_completed', {
        id,
        type: metadata.type,
        loadTime,
        size: metadata.size
      });

      return data;
    } catch (error) {
      this.emit('loading_failed', {
        id,
        error: error.message,
        loadTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private async cacheComponent<T>(
    id: string,
    data: T,
    metadata: ComponentMetadata
  ): Promise<void> {
    // Check if we need to make space
    if (this.currentCacheSize + metadata.size > this.config.maxCacheSize) {
      await this.evictLeastUsed(metadata.size);
    }

    // Compress if enabled and beneficial
    let compressed = false;
    let finalData = data;

    if (this.config.compressionEnabled && metadata.size > 1024 * 1024) {
      try {
        // Simulate compression (would use actual compression library)
        finalData = data; // In real implementation, compress here
        compressed = true;
        metadata.size = Math.floor(metadata.size * 0.7); // Assume 30% compression
      } catch (error) {
        // Compression failed, use original data
      }
    }

    const entry: CacheEntry<T> = {
      data: finalData,
      metadata: { ...metadata },
      compressed,
      timestamp: Date.now(),
      accessCount: 1
    };

    this.cache.set(id, entry);
    this.currentCacheSize += metadata.size;

    this.emit('component_cached', {
      id,
      size: metadata.size,
      compressed,
      cacheSize: this.currentCacheSize
    });
  }

  private async evictLeastUsed(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([id, entry]) => ({ id, entry }))
      .sort((a, b) => {
        // Sort by access count and recency
        const aScore = a.entry.accessCount * (Date.now() - a.entry.timestamp);
        const bScore = b.entry.accessCount * (Date.now() - b.entry.timestamp);
        return aScore - bScore;
      });

    let freedSpace = 0;
    const evicted: string[] = [];

    for (const { id, entry } of entries) {
      if (freedSpace >= requiredSpace) break;

      this.cache.delete(id);
      freedSpace += entry.metadata.size;
      this.currentCacheSize -= entry.metadata.size;
      evicted.push(id);
    }

    this.emit('cache_evicted', {
      evictedCount: evicted.length,
      freedSpace,
      remainingEntries: this.cache.size
    });
  }

  private updateAccessMetrics(id: string): void {
    const cached = this.cache.get(id);
    const metadata = this.metadata.get(id);

    if (cached && metadata) {
      cached.accessCount++;
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;
    }
  }

  private shouldPreload(metadata: ComponentMetadata, context?: any): boolean {
    // Check all strategies
    for (const strategy of this.strategies) {
      if (strategy.shouldPreload(metadata)) {
        return true;
      }
    }

    // Default preload logic
    return metadata.priority >= 8 || metadata.accessCount > this.config.preloadThreshold;
  }

  private getLoadPriority(metadata: ComponentMetadata): number {
    let priority = metadata.priority;

    // Apply strategy priorities
    for (const strategy of this.strategies) {
      priority += strategy.loadPriority(metadata);
    }

    // Boost priority for frequently accessed components
    if (metadata.accessCount > 10) {
      priority += 2;
    }

    // Boost priority for recently accessed components
    const hoursSinceAccess = (Date.now() - metadata.lastAccessed) / (1000 * 60 * 60);
    if (hoursSinceAccess < 1) {
      priority += 3;
    }

    return priority;
  }

  private calculateHitRate(): number {
    const totalAccesses = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.accessCount, 0);
    
    const cacheHits = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);

    return totalAccesses > 0 ? cacheHits / totalAccesses : 0;
  }

  private initializeDefaultStrategies(): void {
    // High-frequency strategy
    this.registerStrategy({
      name: 'high-frequency',
      shouldPreload: (meta) => meta.accessCount > 5,
      loadPriority: (meta) => Math.min(meta.accessCount, 10)
    });

    // Recent access strategy
    this.registerStrategy({
      name: 'recent-access',
      shouldPreload: (meta) => {
        const hoursSinceAccess = (Date.now() - meta.lastAccessed) / (1000 * 60 * 60);
        return hoursSinceAccess < 2;
      },
      loadPriority: (meta) => {
        const hoursSinceAccess = (Date.now() - meta.lastAccessed) / (1000 * 60 * 60);
        return Math.max(0, 5 - hoursSinceAccess);
      }
    });

    // Dependency strategy
    this.registerStrategy({
      name: 'dependency-based',
      shouldPreload: (meta) => meta.dependencies.length > 0,
      loadPriority: (meta) => meta.dependencies.length
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      // Remove expired entries (if TTL is implemented)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [id, entry] of this.cache.entries()) {
        if (now - entry.timestamp > maxAge && entry.accessCount < 2) {
          this.cache.delete(id);
          this.currentCacheSize -= entry.metadata.size;
        }
      }

      // Emit cleanup stats
      this.emit('cleanup_completed', {
        cacheSize: this.cache.size,
        memoryUsage: this.currentCacheSize
      });
    }, 60000); // Run every minute
  }
}