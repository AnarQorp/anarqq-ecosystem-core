/**
 * Module Registration Performance Optimizer
 * Implements performance optimizations for module registration operations
 */

import {
  RegisteredModule,
  SignedModuleMetadata,
  VerificationResult,
  ModuleSearchCriteria,
  ModuleSearchResult,
  QModuleMetadata
} from '../types/qwallet-module-registration';

/**
 * Signature verification cache entry
 */
interface SignatureCacheEntry {
  result: VerificationResult;
  moduleVersion: string;
  cachedAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Lazy loading cache for module documentation
 */
interface DocumentationCacheEntry {
  content: string;
  cid: string;
  cachedAt: number;
  expiresAt: number;
  size: number;
}

/**
 * Search index for efficient module lookup
 */
interface ModuleSearchIndex {
  byName: Map<string, Set<string>>;
  byStatus: Map<string, Set<string>>;
  byIdentityType: Map<string, Set<string>>;
  byIntegration: Map<string, Set<string>>;
  byKeyword: Map<string, Set<string>>;
  fullTextIndex: Map<string, { moduleId: string; score: number }[]>;
}

/**
 * Batch operation context
 */
interface BatchOperationContext {
  operationId: string;
  operations: BatchOperation[];
  startTime: number;
  completedCount: number;
  failedCount: number;
  results: Map<string, any>;
}

interface BatchOperation {
  type: 'register' | 'update' | 'verify' | 'deregister';
  moduleId: string;
  data: any;
  priority: number;
}

/**
 * Connection pool for external services
 */
interface ServiceConnection {
  id: string;
  service: string;
  connection: any;
  isActive: boolean;
  lastUsed: number;
  requestCount: number;
}

/**
 * Performance optimizer for module registration operations
 */
export class ModuleRegistrationPerformanceOptimizer {
  // Signature verification caching
  private signatureCache = new Map<string, SignatureCacheEntry>();
  private readonly SIGNATURE_CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_SIGNATURE_CACHE_SIZE = 1000;

  // Documentation lazy loading
  private documentationCache = new Map<string, DocumentationCacheEntry>();
  private readonly DOCUMENTATION_CACHE_TTL = 1800000; // 30 minutes
  private readonly MAX_DOCUMENTATION_CACHE_SIZE = 100;

  // Search indexing
  private searchIndex: ModuleSearchIndex = {
    byName: new Map(),
    byStatus: new Map(),
    byIdentityType: new Map(),
    byIntegration: new Map(),
    byKeyword: new Map(),
    fullTextIndex: new Map()
  };

  // Batch processing
  private batchOperations = new Map<string, BatchOperationContext>();
  private readonly MAX_BATCH_SIZE = 50;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds

  // Connection pooling
  private connectionPools = new Map<string, ServiceConnection[]>();
  private readonly MAX_CONNECTIONS_PER_SERVICE = 10;
  private readonly CONNECTION_IDLE_TIMEOUT = 300000; // 5 minutes

  // Performance metrics
  private performanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    batchOperationsCompleted: 0,
    averageResponseTime: 0,
    totalOperations: 0,
    searchIndexHits: 0,
    searchIndexMisses: 0,
    connectionPoolHits: 0,
    connectionPoolMisses: 0,
    lazyLoadingHits: 0,
    lazyLoadingMisses: 0
  };

  constructor() {
    this.initializeOptimizer();
  }

  /**
   * Initialize the performance optimizer
   */
  private initializeOptimizer(): void {
    // Set up periodic cleanup tasks
    setInterval(() => this.cleanupExpiredCaches(), 300000); // 5 minutes
    setInterval(() => this.cleanupIdleConnections(), 600000); // 10 minutes
    setInterval(() => this.processBatchOperations(), 5000); // 5 seconds

    console.log('[ModuleRegistrationPerformanceOptimizer] Initialized performance optimizer');
  }

  /**
   * Cache signature verification result to reduce cryptographic overhead
   */
  public cacheSignatureVerification(
    moduleId: string,
    moduleVersion: string,
    result: VerificationResult
  ): void {
    const now = Date.now();
    const cacheKey = `${moduleId}:${moduleVersion}`;

    // Check cache size and evict oldest entries if needed
    if (this.signatureCache.size >= this.MAX_SIGNATURE_CACHE_SIZE) {
      this.evictOldestSignatureCacheEntries();
    }

    this.signatureCache.set(cacheKey, {
      result,
      moduleVersion,
      cachedAt: now,
      expiresAt: now + this.SIGNATURE_CACHE_TTL,
      accessCount: 0,
      lastAccessed: now
    });

    console.log(`[PerformanceOptimizer] Cached signature verification for ${moduleId}:${moduleVersion}`);
  }

  /**
   * Get cached signature verification result
   */
  public getCachedSignatureVerification(
    moduleId: string,
    moduleVersion: string
  ): VerificationResult | null {
    const cacheKey = `${moduleId}:${moduleVersion}`;
    const cached = this.signatureCache.get(cacheKey);

    if (!cached) {
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() > cached.expiresAt) {
      this.signatureCache.delete(cacheKey);
      this.performanceMetrics.cacheMisses++;
      return null;
    }

    // Update access statistics
    cached.accessCount++;
    cached.lastAccessed = Date.now();
    this.performanceMetrics.cacheHits++;

    console.log(`[PerformanceOptimizer] Cache hit for signature verification ${moduleId}:${moduleVersion}`);
    return cached.result;
  }

  /**
   * Lazy load module documentation with caching
   */
  public async loadModuleDocumentation(
    documentationCid: string,
    forceRefresh: boolean = false
  ): Promise<string | null> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = this.documentationCache.get(documentationCid);
      if (cached && Date.now() < cached.expiresAt) {
        this.performanceMetrics.lazyLoadingHits++;
        console.log(`[PerformanceOptimizer] Documentation cache hit for CID: ${documentationCid}`);
        return cached.content;
      }
    }

    // Cache miss - need to load from IPFS
    this.performanceMetrics.lazyLoadingMisses++;

    try {
      // Simulate IPFS documentation loading
      // In a real implementation, this would fetch from IPFS
      const content = await this.fetchDocumentationFromIPFS(documentationCid);
      
      if (content) {
        // Cache the documentation
        this.cacheDocumentation(documentationCid, content);
        console.log(`[PerformanceOptimizer] Loaded and cached documentation for CID: ${documentationCid}`);
      }

      return content;
    } catch (error) {
      console.error(`[PerformanceOptimizer] Failed to load documentation for CID ${documentationCid}:`, error);
      return null;
    }
  }

  /**
   * Lazy load module extended metadata with caching
   */
  public async loadModuleExtendedMetadata(
    moduleId: string,
    metadataCid: string,
    forceRefresh: boolean = false
  ): Promise<any | null> {
    const cacheKey = `metadata:${moduleId}:${metadataCid}`;
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = this.documentationCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        this.performanceMetrics.lazyLoadingHits++;
        console.log(`[PerformanceOptimizer] Extended metadata cache hit for ${moduleId}`);
        try {
          return JSON.parse(cached.content);
        } catch (error) {
          console.error(`[PerformanceOptimizer] Failed to parse cached metadata for ${moduleId}:`, error);
        }
      }
    }

    // Cache miss - need to load from IPFS
    this.performanceMetrics.lazyLoadingMisses++;

    try {
      // Simulate IPFS metadata loading
      const content = await this.fetchExtendedMetadataFromIPFS(metadataCid);
      
      if (content) {
        // Cache the metadata
        this.cacheDocumentation(cacheKey, JSON.stringify(content));
        console.log(`[PerformanceOptimizer] Loaded and cached extended metadata for ${moduleId}`);
        return content;
      }

      return null;
    } catch (error) {
      console.error(`[PerformanceOptimizer] Failed to load extended metadata for ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Build and maintain efficient search indexes
   */
  public buildSearchIndex(modules: RegisteredModule[]): void {
    console.log(`[PerformanceOptimizer] Building search index for ${modules.length} modules`);

    // Clear existing indexes
    this.clearSearchIndexes();

    // Build indexes for each module
    for (const module of modules) {
      this.addModuleToSearchIndex(module);
    }

    console.log('[PerformanceOptimizer] Search index build completed');
  }

  /**
   * Add a module to search indexes
   */
  public addModuleToSearchIndex(module: RegisteredModule): void {
    const moduleId = module.moduleId;

    // Index by name
    const nameTokens = this.tokenizeText(module.metadata.module);
    for (const token of nameTokens) {
      this.addToIndex(this.searchIndex.byName, token, moduleId);
    }

    // Index by status
    this.addToIndex(this.searchIndex.byStatus, module.metadata.status, moduleId);

    // Index by identity types
    for (const identityType of module.metadata.identities_supported) {
      this.addToIndex(this.searchIndex.byIdentityType, identityType, moduleId);
    }

    // Index by integrations
    for (const integration of module.metadata.integrations) {
      this.addToIndex(this.searchIndex.byIntegration, integration, moduleId);
    }

    // Index by keywords from description
    const descriptionTokens = this.tokenizeText(module.metadata.description);
    for (const token of descriptionTokens) {
      this.addToIndex(this.searchIndex.byKeyword, token, moduleId);
    }

    // Build full-text search index
    this.buildFullTextIndex(module);
  }

  /**
   * Remove a module from search indexes
   */
  public removeModuleFromSearchIndex(moduleId: string): void {
    // Remove from all indexes
    this.removeFromAllIndexes(this.searchIndex.byName, moduleId);
    this.removeFromAllIndexes(this.searchIndex.byStatus, moduleId);
    this.removeFromAllIndexes(this.searchIndex.byIdentityType, moduleId);
    this.removeFromAllIndexes(this.searchIndex.byIntegration, moduleId);
    this.removeFromAllIndexes(this.searchIndex.byKeyword, moduleId);
    this.searchIndex.fullTextIndex.delete(moduleId);
  }

  /**
   * Perform optimized module search using indexes
   */
  public searchModulesOptimized(criteria: ModuleSearchCriteria): Set<string> {
    const candidateSets: Set<string>[] = [];
    let indexUsed = false;

    // Use indexes to find candidate modules
    if (criteria.name) {
      const nameTokens = this.tokenizeText(criteria.name);
      for (const token of nameTokens) {
        const matches = this.searchIndex.byName.get(token.toLowerCase());
        if (matches) {
          candidateSets.push(new Set(matches));
          indexUsed = true;
        }
      }
    }

    if (criteria.status) {
      const statusKey = criteria.status.toString().toLowerCase();
      const matches = this.searchIndex.byStatus.get(statusKey);
      if (matches) {
        candidateSets.push(new Set(matches));
        indexUsed = true;
      }
    }

    if (criteria.identityType) {
      const identityKey = criteria.identityType.toString().toLowerCase();
      const matches = this.searchIndex.byIdentityType.get(identityKey);
      if (matches) {
        candidateSets.push(new Set(matches));
        indexUsed = true;
      }
    }

    if (criteria.integration) {
      const integrationKey = criteria.integration.toLowerCase();
      const matches = this.searchIndex.byIntegration.get(integrationKey);
      if (matches) {
        candidateSets.push(new Set(matches));
        indexUsed = true;
      }
    }

    // Update metrics
    if (indexUsed) {
      this.performanceMetrics.searchIndexHits++;
    } else {
      this.performanceMetrics.searchIndexMisses++;
    }

    // If no specific criteria, return empty set (will fall back to full scan)
    if (candidateSets.length === 0) {
      return new Set();
    }

    // Find intersection of all candidate sets
    let result = candidateSets[0];
    for (let i = 1; i < candidateSets.length; i++) {
      result = new Set([...result].filter(x => candidateSets[i].has(x)));
    }

    return result;
  }

  /**
   * Add operation to batch processing queue
   */
  public addToBatch(
    batchId: string,
    operation: BatchOperation
  ): void {
    let batch = this.batchOperations.get(batchId);
    
    if (!batch) {
      batch = {
        operationId: batchId,
        operations: [],
        startTime: Date.now(),
        completedCount: 0,
        failedCount: 0,
        results: new Map()
      };
      this.batchOperations.set(batchId, batch);
    }

    batch.operations.push(operation);

    // Auto-process if batch is full
    if (batch.operations.length >= this.MAX_BATCH_SIZE) {
      this.processBatch(batchId);
    }
  }

  /**
   * Process a specific batch
   */
  public async processBatch(batchId: string): Promise<Map<string, any>> {
    const batch = this.batchOperations.get(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    console.log(`[PerformanceOptimizer] Processing batch ${batchId} with ${batch.operations.length} operations`);

    // Sort operations by priority
    batch.operations.sort((a, b) => b.priority - a.priority);

    // Process operations in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(batch.operations, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(operation => this.processOperation(operation, batch));
      await Promise.allSettled(promises);
    }

    // Clean up completed batch
    this.batchOperations.delete(batchId);
    this.performanceMetrics.batchOperationsCompleted++;

    console.log(`[PerformanceOptimizer] Batch ${batchId} completed: ${batch.completedCount} successful, ${batch.failedCount} failed`);

    return batch.results;
  }

  /**
   * Get or create a connection from the pool
   */
  public async getConnection(serviceName: string): Promise<ServiceConnection | null> {
    let pool = this.connectionPools.get(serviceName);
    
    if (!pool) {
      pool = [];
      this.connectionPools.set(serviceName, pool);
    }

    // Find an available connection
    let connection = pool.find(conn => conn.isActive && !this.isConnectionBusy(conn));
    
    if (connection) {
      // Connection pool hit
      this.performanceMetrics.connectionPoolHits++;
      connection.lastUsed = Date.now();
      connection.requestCount++;
      return connection;
    }

    // Connection pool miss - need to create new connection
    this.performanceMetrics.connectionPoolMisses++;
    
    if (pool.length < this.MAX_CONNECTIONS_PER_SERVICE) {
      // Create new connection
      connection = await this.createConnection(serviceName);
      if (connection) {
        pool.push(connection);
        connection.lastUsed = Date.now();
        connection.requestCount++;
      }
    }

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  public releaseConnection(connection: ServiceConnection): void {
    connection.lastUsed = Date.now();
    // Connection is automatically available for reuse
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    signatureCache: {
      size: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
      memoryUsage: number;
    };
    documentationCache: {
      size: number;
      totalSize: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
    };
    searchIndex: {
      totalIndexes: number;
      totalEntries: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
    };
    batchProcessing: {
      activeBatches: number;
      completedBatches: number;
      averageBatchSize: number;
      averageProcessingTime: number;
    };
    connectionPools: {
      totalPools: number;
      totalConnections: number;
      activeConnections: number;
      hitRate: number;
      totalHits: number;
      totalMisses: number;
    };
    overall: {
      averageResponseTime: number;
      totalOperations: number;
      memoryEfficiency: number;
      overallHitRate: number;
    };
  } {
    const totalCacheRequests = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const signatureCacheHitRate = totalCacheRequests > 0 ? (this.performanceMetrics.cacheHits / totalCacheRequests) * 100 : 0;

    const totalDocSize = Array.from(this.documentationCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    const totalLazyLoadingRequests = this.performanceMetrics.lazyLoadingHits + this.performanceMetrics.lazyLoadingMisses;
    const lazyLoadingHitRate = totalLazyLoadingRequests > 0 ? (this.performanceMetrics.lazyLoadingHits / totalLazyLoadingRequests) * 100 : 0;

    const totalSearchRequests = this.performanceMetrics.searchIndexHits + this.performanceMetrics.searchIndexMisses;
    const searchIndexHitRate = totalSearchRequests > 0 ? (this.performanceMetrics.searchIndexHits / totalSearchRequests) * 100 : 0;

    const totalConnectionRequests = this.performanceMetrics.connectionPoolHits + this.performanceMetrics.connectionPoolMisses;
    const connectionPoolHitRate = totalConnectionRequests > 0 ? (this.performanceMetrics.connectionPoolHits / totalConnectionRequests) * 100 : 0;

    const totalIndexEntries = Array.from(this.searchIndex.byName.values())
      .reduce((sum, set) => sum + set.size, 0);

    const allConnections = Array.from(this.connectionPools.values()).flat();
    const activeConnections = allConnections.filter(conn => conn.isActive).length;

    // Calculate memory usage estimate
    const signatureCacheMemory = this.signatureCache.size * 1024; // Rough estimate
    const documentationCacheMemory = totalDocSize;
    const totalMemoryUsage = signatureCacheMemory + documentationCacheMemory;

    // Calculate overall hit rate across all caching systems
    const totalHits = this.performanceMetrics.cacheHits + this.performanceMetrics.lazyLoadingHits + 
                     this.performanceMetrics.searchIndexHits + this.performanceMetrics.connectionPoolHits;
    const totalMisses = this.performanceMetrics.cacheMisses + this.performanceMetrics.lazyLoadingMisses + 
                       this.performanceMetrics.searchIndexMisses + this.performanceMetrics.connectionPoolMisses;
    const overallHitRate = (totalHits + totalMisses) > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    return {
      signatureCache: {
        size: this.signatureCache.size,
        hitRate: signatureCacheHitRate,
        totalHits: this.performanceMetrics.cacheHits,
        totalMisses: this.performanceMetrics.cacheMisses,
        memoryUsage: signatureCacheMemory
      },
      documentationCache: {
        size: this.documentationCache.size,
        totalSize: totalDocSize,
        hitRate: lazyLoadingHitRate,
        totalHits: this.performanceMetrics.lazyLoadingHits,
        totalMisses: this.performanceMetrics.lazyLoadingMisses
      },
      searchIndex: {
        totalIndexes: Object.keys(this.searchIndex).length,
        totalEntries: totalIndexEntries,
        hitRate: searchIndexHitRate,
        totalHits: this.performanceMetrics.searchIndexHits,
        totalMisses: this.performanceMetrics.searchIndexMisses
      },
      batchProcessing: {
        activeBatches: this.batchOperations.size,
        completedBatches: this.performanceMetrics.batchOperationsCompleted,
        averageBatchSize: this.calculateAverageBatchSize(),
        averageProcessingTime: this.calculateAverageProcessingTime()
      },
      connectionPools: {
        totalPools: this.connectionPools.size,
        totalConnections: allConnections.length,
        activeConnections,
        hitRate: connectionPoolHitRate,
        totalHits: this.performanceMetrics.connectionPoolHits,
        totalMisses: this.performanceMetrics.connectionPoolMisses
      },
      overall: {
        averageResponseTime: this.performanceMetrics.averageResponseTime,
        totalOperations: this.performanceMetrics.totalOperations,
        memoryEfficiency: totalMemoryUsage > 0 ? (totalHits / totalMemoryUsage) * 1000 : 0, // Hits per KB
        overallHitRate
      }
    };
  }

  /**
   * Optimize cache sizes based on usage patterns
   */
  public optimizeCacheSizes(): void {
    // Analyze signature cache usage
    const signatureCacheEntries = Array.from(this.signatureCache.values());
    const averageAccessCount = signatureCacheEntries.reduce((sum, entry) => sum + entry.accessCount, 0) / signatureCacheEntries.length;
    
    // Adjust cache sizes based on hit rates and usage patterns
    if (this.performanceMetrics.cacheHits > 0) {
      const hitRate = this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses);
      
      if (hitRate > 0.8 && this.signatureCache.size < this.MAX_SIGNATURE_CACHE_SIZE * 0.8) {
        console.log('[PerformanceOptimizer] High hit rate detected, signature cache is performing well');
      } else if (hitRate < 0.5) {
        console.log('[PerformanceOptimizer] Low hit rate detected, consider cache eviction strategy adjustment');
        this.evictLowUsageCacheEntries();
      }
    }

    console.log('[PerformanceOptimizer] Cache optimization completed');
  }

  /**
   * Preload frequently accessed modules
   */
  public async preloadFrequentModules(moduleIds: string[]): Promise<void> {
    console.log(`[PerformanceOptimizer] Preloading ${moduleIds.length} frequently accessed modules`);
    
    const preloadPromises = moduleIds.map(async (moduleId) => {
      try {
        // This would typically load module data into cache
        // For now, we'll simulate preloading
        await new Promise(resolve => setTimeout(resolve, 10));
        console.log(`[PerformanceOptimizer] Preloaded module: ${moduleId}`);
      } catch (error) {
        console.error(`[PerformanceOptimizer] Failed to preload module ${moduleId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('[PerformanceOptimizer] Module preloading completed');
  }

  /**
   * Warm up search indexes with common queries
   */
  public warmUpSearchIndexes(commonQueries: ModuleSearchCriteria[]): void {
    console.log(`[PerformanceOptimizer] Warming up search indexes with ${commonQueries.length} common queries`);
    
    for (const query of commonQueries) {
      // Execute search to warm up indexes
      this.searchModulesOptimized(query);
    }

    console.log('[PerformanceOptimizer] Search index warm-up completed');
  }

  /**
   * Clear all caches and reset optimizer
   */
  public clearCaches(): void {
    this.signatureCache.clear();
    this.documentationCache.clear();
    this.clearSearchIndexes();
    
    // Reset metrics
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      batchOperationsCompleted: 0,
      averageResponseTime: 0,
      totalOperations: 0,
      searchIndexHits: 0,
      searchIndexMisses: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0,
      lazyLoadingHits: 0,
      lazyLoadingMisses: 0
    };

    console.log('[PerformanceOptimizer] All caches cleared and metrics reset');
  }

  // Private helper methods

  private evictOldestSignatureCacheEntries(): void {
    const entries = Array.from(this.signatureCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toEvict = Math.floor(this.MAX_SIGNATURE_CACHE_SIZE * 0.2); // Evict 20%
    for (let i = 0; i < toEvict; i++) {
      this.signatureCache.delete(entries[i][0]);
    }
  }

  private async fetchDocumentationFromIPFS(cid: string): Promise<string | null> {
    // Simulate IPFS fetch with delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would use IPFS client
    return `Documentation content for CID: ${cid}`;
  }

  private async fetchExtendedMetadataFromIPFS(cid: string): Promise<any | null> {
    // Simulate IPFS fetch with delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // In a real implementation, this would use IPFS client to fetch JSON metadata
    return {
      extendedDescription: `Extended description for CID: ${cid}`,
      screenshots: [`screenshot1_${cid}`, `screenshot2_${cid}`],
      tutorials: [`tutorial1_${cid}`, `tutorial2_${cid}`],
      examples: [`example1_${cid}`, `example2_${cid}`],
      changelog: `changelog_${cid}`,
      license: 'MIT',
      contributors: ['contributor1', 'contributor2'],
      tags: ['tag1', 'tag2', 'tag3']
    };
  }

  private cacheDocumentation(cid: string, content: string): void {
    const now = Date.now();
    
    // Check cache size and evict if needed
    if (this.documentationCache.size >= this.MAX_DOCUMENTATION_CACHE_SIZE) {
      this.evictOldestDocumentationEntries();
    }

    this.documentationCache.set(cid, {
      content,
      cid,
      cachedAt: now,
      expiresAt: now + this.DOCUMENTATION_CACHE_TTL,
      size: content.length
    });
  }

  private evictOldestDocumentationEntries(): void {
    const entries = Array.from(this.documentationCache.entries());
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    
    const toEvict = Math.floor(this.MAX_DOCUMENTATION_CACHE_SIZE * 0.2);
    for (let i = 0; i < toEvict; i++) {
      this.documentationCache.delete(entries[i][0]);
    }
  }

  private clearSearchIndexes(): void {
    this.searchIndex.byName.clear();
    this.searchIndex.byStatus.clear();
    this.searchIndex.byIdentityType.clear();
    this.searchIndex.byIntegration.clear();
    this.searchIndex.byKeyword.clear();
    this.searchIndex.fullTextIndex.clear();
  }

  private tokenizeText(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private addToIndex(index: Map<string, Set<string>>, key: string | any, moduleId: string): void {
    // Convert enum values to strings and normalize
    const normalizedKey = key.toString().toLowerCase();
    if (!index.has(normalizedKey)) {
      index.set(normalizedKey, new Set());
    }
    index.get(normalizedKey)!.add(moduleId);
  }

  private removeFromAllIndexes(index: Map<string, Set<string>>, moduleId: string): void {
    for (const [key, moduleSet] of index.entries()) {
      moduleSet.delete(moduleId);
      if (moduleSet.size === 0) {
        index.delete(key);
      }
    }
  }

  private buildFullTextIndex(module: RegisteredModule): void {
    const text = `${module.metadata.module} ${module.metadata.description}`.toLowerCase();
    const tokens = this.tokenizeText(text);
    
    const scores: { moduleId: string; score: number }[] = [];
    
    // Calculate relevance score based on token frequency and position
    for (const token of tokens) {
      const frequency = tokens.filter(t => t === token).length;
      const score = frequency * (token.length > 4 ? 2 : 1);
      scores.push({ moduleId: module.moduleId, score });
    }
    
    this.searchIndex.fullTextIndex.set(module.moduleId, scores);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async processOperation(
    operation: BatchOperation,
    batch: BatchOperationContext
  ): Promise<void> {
    try {
      let result: any;
      
      switch (operation.type) {
        case 'register':
          result = await this.processBatchRegister(operation);
          break;
        case 'update':
          result = await this.processBatchUpdate(operation);
          break;
        case 'verify':
          result = await this.processBatchVerify(operation);
          break;
        case 'deregister':
          result = await this.processBatchDeregister(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
      
      batch.results.set(operation.moduleId, result);
      batch.completedCount++;
      
    } catch (error) {
      batch.results.set(operation.moduleId, { error: error.message });
      batch.failedCount++;
    }
  }

  private async processBatchRegister(operation: BatchOperation): Promise<any> {
    // Simulate batch registration processing
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true, moduleId: operation.moduleId };
  }

  private async processBatchUpdate(operation: BatchOperation): Promise<any> {
    // Simulate batch update processing
    await new Promise(resolve => setTimeout(resolve, 30));
    return { success: true, moduleId: operation.moduleId };
  }

  private async processBatchVerify(operation: BatchOperation): Promise<any> {
    // Simulate batch verification processing
    await new Promise(resolve => setTimeout(resolve, 20));
    return { success: true, moduleId: operation.moduleId, verified: true };
  }

  private async processBatchDeregister(operation: BatchOperation): Promise<any> {
    // Simulate batch deregistration processing
    await new Promise(resolve => setTimeout(resolve, 40));
    return { success: true, moduleId: operation.moduleId };
  }

  private async createConnection(serviceName: string): Promise<ServiceConnection | null> {
    try {
      // Simulate connection creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        service: serviceName,
        connection: {}, // Placeholder for actual connection object
        isActive: true,
        lastUsed: Date.now(),
        requestCount: 0
      };
    } catch (error) {
      console.error(`Failed to create connection for ${serviceName}:`, error);
      return null;
    }
  }

  private isConnectionBusy(connection: ServiceConnection): boolean {
    // Simple implementation - in reality, this would check if connection is handling requests
    return false;
  }

  private calculateAverageBatchSize(): number {
    if (this.performanceMetrics.batchOperationsCompleted === 0) {
      return 0;
    }
    
    // This is a simplified calculation - in a real implementation, 
    // we would track actual batch sizes over time
    return this.MAX_BATCH_SIZE * 0.7; // Assume average 70% of max batch size
  }

  private calculateAverageProcessingTime(): number {
    if (this.performanceMetrics.batchOperationsCompleted === 0) {
      return 0;
    }
    
    // This is a simplified calculation - in a real implementation,
    // we would track actual processing times
    return 2500; // Assume average 2.5 seconds per batch
  }

  private evictLowUsageCacheEntries(): void {
    const entries = Array.from(this.signatureCache.entries());
    
    // Sort by access count (ascending) to evict least used entries first
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    
    const toEvict = Math.floor(this.signatureCache.size * 0.3); // Evict 30% of low usage entries
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      this.signatureCache.delete(entries[i][0]);
    }
    
    console.log(`[PerformanceOptimizer] Evicted ${toEvict} low usage cache entries`);
  }

  private processBatchOperations(): void {
    const now = Date.now();
    
    for (const [batchId, batch] of this.batchOperations.entries()) {
      // Process batches that have timed out or have operations waiting
      if (now - batch.startTime > this.BATCH_TIMEOUT || batch.operations.length > 0) {
        this.processBatch(batchId).catch(error => {
          console.error(`Error processing batch ${batchId}:`, error);
        });
      }
    }
  }

  private cleanupExpiredCaches(): void {
    const now = Date.now();
    
    // Clean up signature cache
    for (const [key, entry] of this.signatureCache.entries()) {
      if (now > entry.expiresAt) {
        this.signatureCache.delete(key);
      }
    }
    
    // Clean up documentation cache
    for (const [cid, entry] of this.documentationCache.entries()) {
      if (now > entry.expiresAt) {
        this.documentationCache.delete(cid);
      }
    }
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    
    for (const [serviceName, pool] of this.connectionPools.entries()) {
      const activeConnections = pool.filter(conn => {
        if (now - conn.lastUsed > this.CONNECTION_IDLE_TIMEOUT) {
          conn.isActive = false;
          return false;
        }
        return true;
      });
      
      this.connectionPools.set(serviceName, activeConnections);
    }
  }
}

// Export singleton instance
export const moduleRegistrationPerformanceOptimizer = new ModuleRegistrationPerformanceOptimizer();