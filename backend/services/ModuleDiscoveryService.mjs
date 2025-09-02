/**
 * Module Discovery and Query API Service
 * 
 * Provides enhanced module search functionality with filtering, sorting,
 * dependency resolution, metadata caching, and access statistics tracking.
 * 
 * This service extends the existing QindexService with additional
 * discovery capabilities as specified in task 9.
 */

import crypto from 'crypto';
import { getQindexService } from '../ecosystem/QindexService.mjs';

export class ModuleDiscoveryService {
  constructor() {
    this.qindexService = getQindexService();
    
    // Enhanced caching layer
    this.searchCache = new Map();
    this.dependencyCache = new Map();
    this.metadataCache = new Map();
    
    // Performance optimization settings
    this.cacheConfig = {
      searchCacheTTL: 300000,      // 5 minutes
      dependencyCacheTTL: 600000,  // 10 minutes
      metadataCacheTTL: 900000,    // 15 minutes
      maxCacheSize: 1000           // Maximum cache entries
    };
    
    // Access statistics enhancement
    this.searchAnalytics = new Map();
    this.performanceMetrics = {
      totalSearches: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
      popularFilters: new Map(),
      searchPatterns: new Map()
    };
  }

  /**
   * Enhanced module search with advanced filtering and sorting
   * @param {Object} criteria - Enhanced search criteria
   * @returns {Promise<Object>} Enhanced search results with performance metrics
   */
  async searchModules(criteria) {
    const startTime = Date.now();
    const searchId = crypto.randomUUID();
    
    try {
      // Normalize and validate criteria
      const normalizedCriteria = this.normalizeCriteria(criteria);
      
      // Check cache first
      const cacheKey = this.generateSearchCacheKey(normalizedCriteria);
      const cachedResult = this.getFromCache('search', cacheKey);
      
      if (cachedResult) {
        this.updatePerformanceMetrics(startTime, true);
        return {
          ...cachedResult,
          searchId,
          cached: true,
          cacheAge: Date.now() - cachedResult.timestamp
        };
      }

      // Perform search using QindexService
      const searchResult = await this.qindexService.searchModulesAdvanced(normalizedCriteria);
      
      // Enhance results with additional metadata
      const enhancedResults = await this.enhanceSearchResults(searchResult, normalizedCriteria);
      
      // Apply additional filtering and sorting
      const finalResults = await this.applyAdvancedFiltering(enhancedResults, normalizedCriteria);
      
      // Cache the results
      this.setCache('search', cacheKey, finalResults);
      
      // Update analytics
      this.updateSearchAnalytics(normalizedCriteria, finalResults);
      this.updatePerformanceMetrics(startTime, false);
      
      return {
        ...finalResults,
        searchId,
        cached: false,
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Search error:', error);
      throw new Error(`Module search failed: ${error.message}`);
    }
  }

  /**
   * Get modules by type with enhanced filtering and performance optimization
   * @param {string} type - Module type or category
   * @param {Object} options - Enhanced filtering options
   * @returns {Promise<Object>} Filtered and optimized results
   */
  async getModulesByType(type, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        status,
        includeTestMode = false,
        sortBy = 'relevance',
        sortOrder = 'desc',
        limit = 50,
        offset = 0,
        includeMetrics = true,
        includeCompatibility = false,
        minCompliance = 0,
        maxAge = null // Maximum age in days
      } = options;

      // Check cache
      const cacheKey = `type:${type}:${JSON.stringify(options)}`;
      const cachedResult = this.getFromCache('search', cacheKey);
      
      if (cachedResult) {
        return {
          ...cachedResult,
          cached: true,
          searchTime: Date.now() - startTime
        };
      }

      // Get base results from QindexService
      const baseResults = await this.qindexService.getModulesByType(type, {
        status,
        includeTestMode,
        sortBy,
        sortOrder,
        limit: limit * 2, // Get more to allow for additional filtering
        offset
      });

      // Apply enhanced filtering
      let filteredModules = baseResults.modules;

      // Filter by compliance level
      if (minCompliance > 0) {
        filteredModules = filteredModules.filter(module => {
          const compliance = module.metadata.compliance;
          const complianceScore = Object.values(compliance).filter(Boolean).length;
          return complianceScore >= minCompliance;
        });
      }

      // Filter by age
      if (maxAge) {
        const maxAgeDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
        filteredModules = filteredModules.filter(module => 
          new Date(module.registrationInfo.registeredAt) >= maxAgeDate
        );
      }

      // Apply final limit
      filteredModules = filteredModules.slice(0, limit);

      // Enhance with additional metrics if requested
      if (includeMetrics) {
        filteredModules = await this.enhanceWithMetrics(filteredModules);
      }

      // Include compatibility information if requested
      if (includeCompatibility) {
        filteredModules = await this.enhanceWithCompatibility(filteredModules);
      }

      const result = {
        type,
        modules: filteredModules,
        totalCount: filteredModules.length,
        hasMore: baseResults.hasMore,
        nextOffset: baseResults.nextOffset,
        searchMetadata: {
          ...baseResults.searchMetadata,
          enhancedFilters: {
            minCompliance,
            maxAge,
            includeMetrics,
            includeCompatibility
          }
        },
        timestamp: Date.now()
      };

      // Cache results
      this.setCache('search', cacheKey, result);

      return {
        ...result,
        cached: false,
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Get modules by type error:', error);
      throw new Error(`Failed to get modules by type: ${error.message}`);
    }
  }

  /**
   * Get modules for identity with enhanced compatibility checking
   * @param {string} identityType - Identity type
   * @param {Object} options - Enhanced options
   * @returns {Promise<Object>} Compatible modules with detailed information
   */
  async getModulesForIdentity(identityType, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        includeTestMode = false,
        status,
        integration,
        hasCompliance,
        includeCompatibilityScore = true,
        includeDependencyInfo = true,
        includeSecurityInfo = true,
        limit = 50,
        offset = 0,
        sortBy = 'compatibility',
        sortOrder = 'desc'
      } = options;

      // Check cache
      const cacheKey = `identity:${identityType}:${JSON.stringify(options)}`;
      const cachedResult = this.getFromCache('search', cacheKey);
      
      if (cachedResult) {
        return {
          ...cachedResult,
          cached: true,
          searchTime: Date.now() - startTime
        };
      }

      // Get base results from QindexService
      const baseResults = await this.qindexService.getModulesForIdentity(identityType, {
        includeTestMode,
        status,
        integration,
        hasCompliance,
        limit: limit * 2, // Get more for additional processing
        offset,
        sortBy: sortBy === 'compatibility' ? 'queryCount' : sortBy,
        sortOrder
      });

      let enhancedModules = baseResults.modules;

      // Calculate compatibility scores if requested
      if (includeCompatibilityScore) {
        enhancedModules = await Promise.all(
          enhancedModules.map(async (module) => {
            const compatibilityScore = await this.calculateCompatibilityScore(module, identityType);
            return {
              ...module,
              compatibilityScore,
              compatibilityDetails: compatibilityScore.details
            };
          })
        );
      }

      // Include dependency information if requested
      if (includeDependencyInfo) {
        enhancedModules = await Promise.all(
          enhancedModules.map(async (module) => {
            const dependencyInfo = await this.getDependencyInfo(module.moduleId);
            return {
              ...module,
              dependencyInfo
            };
          })
        );
      }

      // Include security information if requested
      if (includeSecurityInfo) {
        enhancedModules = await Promise.all(
          enhancedModules.map(async (module) => {
            const securityInfo = await this.getSecurityInfo(module);
            return {
              ...module,
              securityInfo
            };
          })
        );
      }

      // Sort by compatibility if requested
      if (sortBy === 'compatibility' && includeCompatibilityScore) {
        enhancedModules.sort((a, b) => {
          const aScore = a.compatibilityScore?.overall || 0;
          const bScore = b.compatibilityScore?.overall || 0;
          return sortOrder === 'desc' ? bScore - aScore : aScore - bScore;
        });
      }

      // Apply final limit
      enhancedModules = enhancedModules.slice(0, limit);

      const result = {
        identityType,
        modules: enhancedModules,
        totalCount: enhancedModules.length,
        hasMore: baseResults.hasMore,
        nextOffset: baseResults.nextOffset,
        searchMetadata: {
          ...baseResults.searchMetadata,
          enhancedFeatures: {
            includeCompatibilityScore,
            includeDependencyInfo,
            includeSecurityInfo
          }
        },
        timestamp: Date.now()
      };

      // Cache results
      this.setCache('search', cacheKey, result);

      return {
        ...result,
        cached: false,
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Get modules for identity error:', error);
      throw new Error(`Failed to get modules for identity: ${error.message}`);
    }
  }

  /**
   * Enhanced dependency resolution with caching and compatibility analysis
   * @param {string} moduleId - Module identifier
   * @param {Object} options - Resolution options
   * @returns {Promise<Object>} Comprehensive dependency analysis
   */
  async resolveDependencies(moduleId, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        includeTransitive = true,
        checkCompatibility = true,
        includeVersionAnalysis = true,
        includeSecurityAnalysis = false,
        maxDepth = 10
      } = options;

      // Check cache
      const cacheKey = `deps:${moduleId}:${JSON.stringify(options)}`;
      const cachedResult = this.getFromCache('dependency', cacheKey);
      
      if (cachedResult) {
        return {
          ...cachedResult,
          cached: true,
          resolveTime: Date.now() - startTime
        };
      }

      // Get module dependencies
      const dependencies = await this.qindexService.getModuleDependencies(moduleId);
      
      if (dependencies.length === 0) {
        const result = {
          moduleId,
          dependencies: [],
          dependencyTree: {},
          analysis: {
            totalDependencies: 0,
            directDependencies: 0,
            transitiveDependencies: 0,
            maxDepth: 0,
            hasCircularDependencies: false,
            compatibilityIssues: [],
            securityIssues: []
          },
          timestamp: Date.now()
        };
        
        this.setCache('dependency', cacheKey, result);
        return {
          ...result,
          cached: false,
          resolveTime: Date.now() - startTime
        };
      }

      // Build dependency tree
      const dependencyTree = await this.buildDependencyTree(moduleId, dependencies, {
        includeTransitive,
        maxDepth,
        visited: new Set()
      });

      // Perform compatibility analysis
      let compatibilityAnalysis = null;
      if (checkCompatibility) {
        compatibilityAnalysis = await this.qindexService.checkDependencyCompatibilityAdvanced(
          moduleId, 
          dependencies
        );
      }

      // Perform version analysis
      let versionAnalysis = null;
      if (includeVersionAnalysis) {
        versionAnalysis = await this.analyzeVersionCompatibility(dependencies);
      }

      // Perform security analysis
      let securityAnalysis = null;
      if (includeSecurityAnalysis) {
        securityAnalysis = await this.analyzeSecurityRisks(dependencies);
      }

      // Calculate analysis metrics
      const analysis = {
        totalDependencies: this.countTotalDependencies(dependencyTree),
        directDependencies: dependencies.length,
        transitiveDependencies: this.countTotalDependencies(dependencyTree) - dependencies.length,
        maxDepth: this.calculateMaxDepth(dependencyTree),
        hasCircularDependencies: compatibilityAnalysis?.circularDependencies?.length > 0 || false,
        compatibilityIssues: compatibilityAnalysis?.conflicts || [],
        versionIssues: versionAnalysis?.issues || [],
        securityIssues: securityAnalysis?.issues || []
      };

      const result = {
        moduleId,
        dependencies,
        dependencyTree,
        compatibilityAnalysis,
        versionAnalysis,
        securityAnalysis,
        analysis,
        timestamp: Date.now()
      };

      // Cache results
      this.setCache('dependency', cacheKey, result);

      return {
        ...result,
        cached: false,
        resolveTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Dependency resolution error:', error);
      throw new Error(`Dependency resolution failed: ${error.message}`);
    }
  }

  /**
   * Enhanced module metadata caching with intelligent cache management
   * @param {string} moduleId - Module identifier
   * @param {Object} options - Caching options
   * @returns {Promise<Object>} Cached or fresh module metadata
   */
  async getCachedModuleMetadata(moduleId, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        forceRefresh = false,
        includeAccessStats = true,
        includeCompatibilityInfo = false,
        includeDependencyInfo = false,
        includeSecurityInfo = false,
        cacheTTL = this.cacheConfig.metadataCacheTTL
      } = options;

      // Generate cache key based on options
      const cacheKey = this.generateMetadataCacheKey(moduleId, options);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedResult = this.getFromCache('metadata', cacheKey, cacheTTL);
        if (cachedResult) {
          return {
            ...cachedResult,
            cached: true,
            cacheAge: Date.now() - cachedResult.timestamp,
            retrieveTime: Date.now() - startTime
          };
        }
      }

      // Get base metadata from QindexService
      const baseMetadata = await this.qindexService.getCachedModuleMetadata(moduleId, {
        forceRefresh,
        includeAccessStats,
        cacheTTL
      });

      if (!baseMetadata) {
        return null;
      }

      let enhancedMetadata = { ...baseMetadata };

      // Add compatibility information if requested
      if (includeCompatibilityInfo) {
        enhancedMetadata.compatibilityInfo = await this.getCompatibilityInfo(moduleId);
      }

      // Add dependency information if requested
      if (includeDependencyInfo) {
        enhancedMetadata.dependencyInfo = await this.getDependencyInfo(moduleId);
      }

      // Add security information if requested
      if (includeSecurityInfo) {
        enhancedMetadata.securityInfo = await this.getSecurityInfo(enhancedMetadata);
      }

      // Add discovery-specific metadata
      enhancedMetadata.discoveryMetadata = {
        lastCached: new Date().toISOString(),
        cacheKey,
        enhancedFeatures: {
          includeCompatibilityInfo,
          includeDependencyInfo,
          includeSecurityInfo
        }
      };

      enhancedMetadata.timestamp = Date.now();

      // Cache the enhanced metadata
      this.setCache('metadata', cacheKey, enhancedMetadata, cacheTTL);

      return {
        ...enhancedMetadata,
        cached: false,
        retrieveTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Get cached metadata error:', error);
      throw new Error(`Failed to get cached module metadata: ${error.message}`);
    }
  }

  /**
   * Enhanced module access statistics with detailed analytics
   * @param {string} moduleId - Module identifier (optional)
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Comprehensive access statistics
   */
  async getModuleAccessStatistics(moduleId = null, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        period = '30d',
        groupBy = 'day',
        includeDetails = true,
        includeComparisons = true,
        includeTrends = true,
        includeRecommendations = false
      } = options;

      // Get base statistics from QindexService
      const baseStats = await this.qindexService.getModuleAccessStats(moduleId, {
        period,
        groupBy,
        includeDetails
      });

      if (!baseStats) {
        return null;
      }

      let enhancedStats = { ...baseStats };

      // Add comparison data if requested
      if (includeComparisons && !moduleId) {
        enhancedStats.comparisons = await this.generateComparisonData(baseStats);
      }

      // Add trend analysis if requested
      if (includeTrends) {
        enhancedStats.trends = await this.analyzeTrends(moduleId, period);
      }

      // Add recommendations if requested
      if (includeRecommendations) {
        enhancedStats.recommendations = await this.generateRecommendations(moduleId, baseStats);
      }

      // Add discovery-specific analytics
      enhancedStats.discoveryAnalytics = {
        searchPatterns: this.getSearchPatterns(moduleId),
        popularFilters: this.getPopularFilters(),
        cacheEfficiency: this.getCacheEfficiency(),
        performanceMetrics: this.getPerformanceMetrics()
      };

      enhancedStats.generatedAt = new Date().toISOString();
      enhancedStats.analysisTime = Date.now() - startTime;

      return enhancedStats;

    } catch (error) {
      console.error('[ModuleDiscovery] Get access statistics error:', error);
      throw new Error(`Failed to get module access statistics: ${error.message}`);
    }
  }

  // Helper methods for enhanced functionality

  /**
   * Normalize search criteria
   */
  normalizeCriteria(criteria) {
    const normalized = { ...criteria };
    
    // Normalize string fields
    if (normalized.query) {
      normalized.query = normalized.query.trim().toLowerCase();
    }
    
    // Set defaults
    normalized.limit = Math.min(normalized.limit || 50, 100);
    normalized.offset = Math.max(normalized.offset || 0, 0);
    normalized.sortBy = normalized.sortBy || 'relevance';
    normalized.sortOrder = normalized.sortOrder || 'desc';
    
    return normalized;
  }

  /**
   * Generate search cache key
   */
  generateSearchCacheKey(criteria) {
    const keyData = {
      query: criteria.query,
      filters: {
        name: criteria.name,
        type: criteria.type,
        status: criteria.status,
        identityType: criteria.identityType,
        integration: criteria.integration,
        hasCompliance: criteria.hasCompliance
      },
      sorting: {
        sortBy: criteria.sortBy,
        sortOrder: criteria.sortOrder
      },
      pagination: {
        limit: criteria.limit,
        offset: criteria.offset
      }
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate metadata cache key
   */
  generateMetadataCacheKey(moduleId, options) {
    const keyData = {
      moduleId,
      includeAccessStats: options.includeAccessStats,
      includeCompatibilityInfo: options.includeCompatibilityInfo,
      includeDependencyInfo: options.includeDependencyInfo,
      includeSecurityInfo: options.includeSecurityInfo
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generic cache operations
   */
  getFromCache(cacheType, key, ttl = null) {
    const cache = this.getCacheByType(cacheType);
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const effectiveTTL = ttl || this.getCacheTTL(cacheType);
    if (Date.now() - entry.timestamp > effectiveTTL) {
      cache.delete(key);
      return null;
    }
    
    entry.hitCount = (entry.hitCount || 0) + 1;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  setCache(cacheType, key, data, ttl = null) {
    const cache = this.getCacheByType(cacheType);
    
    // Implement cache size limit
    if (cache.size >= this.cacheConfig.maxCacheSize) {
      this.evictOldestEntries(cache, Math.floor(this.cacheConfig.maxCacheSize * 0.1));
    }
    
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.getCacheTTL(cacheType),
      hitCount: 0,
      lastAccessed: Date.now()
    });
  }

  getCacheByType(cacheType) {
    switch (cacheType) {
      case 'search': return this.searchCache;
      case 'dependency': return this.dependencyCache;
      case 'metadata': return this.metadataCache;
      default: throw new Error(`Unknown cache type: ${cacheType}`);
    }
  }

  getCacheTTL(cacheType) {
    switch (cacheType) {
      case 'search': return this.cacheConfig.searchCacheTTL;
      case 'dependency': return this.cacheConfig.dependencyCacheTTL;
      case 'metadata': return this.cacheConfig.metadataCacheTTL;
      default: return this.cacheConfig.searchCacheTTL;
    }
  }

  evictOldestEntries(cache, count) {
    const entries = Array.from(cache.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);
    
    entries.forEach(([key]) => cache.delete(key));
  }

  /**
   * Calculate compatibility score for a module and identity type
   */
  async calculateCompatibilityScore(module, identityType) {
    try {
      let score = 0;
      const details = {
        identitySupport: 0,
        compliance: 0,
        security: 0,
        performance: 0,
        maintenance: 0
      };

      // Identity support score (40% weight)
      if (module.metadata.identities_supported.includes(identityType)) {
        details.identitySupport = 100;
        score += 40;
      }

      // Compliance score (25% weight)
      const compliance = module.metadata.compliance;
      const complianceFeatures = Object.values(compliance).filter(Boolean).length;
      const totalComplianceFeatures = Object.keys(compliance).length;
      details.compliance = (complianceFeatures / totalComplianceFeatures) * 100;
      score += (details.compliance / 100) * 25;

      // Security score (20% weight)
      let securityScore = 0;
      if (compliance.audit) securityScore += 40;
      if (compliance.privacy_enforced) securityScore += 30;
      if (module.metadata.audit_hash && /^[a-f0-9]{64}$/i.test(module.metadata.audit_hash)) securityScore += 30;
      details.security = securityScore;
      score += (securityScore / 100) * 20;

      // Performance score (10% weight) - based on access stats
      const accessStats = module.accessStats || {};
      const queryCount = accessStats.queryCount || 0;
      const performanceScore = Math.min(queryCount / 100 * 100, 100); // Normalize to 100
      details.performance = performanceScore;
      score += (performanceScore / 100) * 10;

      // Maintenance score (5% weight) - based on recent activity
      const registeredAt = new Date(module.registrationInfo.registeredAt);
      const daysSinceRegistration = (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24);
      const maintenanceScore = Math.max(100 - (daysSinceRegistration / 365 * 50), 0); // Newer is better
      details.maintenance = maintenanceScore;
      score += (maintenanceScore / 100) * 5;

      return {
        overall: Math.round(score),
        details,
        breakdown: {
          identitySupport: { score: details.identitySupport, weight: 40 },
          compliance: { score: details.compliance, weight: 25 },
          security: { score: details.security, weight: 20 },
          performance: { score: details.performance, weight: 10 },
          maintenance: { score: details.maintenance, weight: 5 }
        }
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Calculate compatibility score error:', error);
      return {
        overall: 0,
        details: {},
        error: error.message
      };
    }
  }

  /**
   * Get dependency information for a module
   */
  async getDependencyInfo(moduleId) {
    try {
      const dependencies = await this.qindexService.getModuleDependencies(moduleId);
      
      if (dependencies.length === 0) {
        return {
          hasDependencies: false,
          count: 0,
          dependencies: []
        };
      }

      const dependencyDetails = await Promise.all(
        dependencies.map(async (depId) => {
          const depModule = await this.qindexService.getModule(depId);
          return {
            moduleId: depId,
            name: depModule?.metadata.module || depId,
            version: depModule?.metadata.version || 'unknown',
            status: depModule?.metadata.status || 'unknown',
            available: !!depModule
          };
        })
      );

      return {
        hasDependencies: true,
        count: dependencies.length,
        dependencies: dependencyDetails,
        allAvailable: dependencyDetails.every(dep => dep.available)
      };

    } catch (error) {
      console.error('[ModuleDiscovery] Get dependency info error:', error);
      return {
        hasDependencies: false,
        count: 0,
        dependencies: [],
        error: error.message
      };
    }
  }

  /**
   * Get security information for a module
   */
  async getSecurityInfo(module) {
    try {
      const compliance = module.metadata.compliance;
      const securityInfo = {
        auditStatus: compliance.audit ? 'passed' : 'not_audited',
        privacyEnforced: compliance.privacy_enforced,
        kycSupport: compliance.kyc_support,
        gdprCompliant: compliance.gdpr_compliant,
        riskScoring: compliance.risk_scoring,
        auditHashValid: /^[a-f0-9]{64}$/i.test(module.metadata.audit_hash),
        securityScore: 0
      };

      // Calculate security score
      let score = 0;
      if (securityInfo.auditStatus === 'passed') score += 30;
      if (securityInfo.privacyEnforced) score += 25;
      if (securityInfo.gdprCompliant) score += 20;
      if (securityInfo.auditHashValid) score += 15;
      if (securityInfo.riskScoring) score += 10;

      securityInfo.securityScore = score;
      securityInfo.securityLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

      return securityInfo;

    } catch (error) {
      console.error('[ModuleDiscovery] Get security info error:', error);
      return {
        securityScore: 0,
        securityLevel: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get compatibility information for a module
   */
  async getCompatibilityInfo(moduleId) {
    try {
      const module = await this.qindexService.getModule(moduleId);
      if (!module) {
        return {
          compatible: false,
          error: 'Module not found'
        };
      }

      const compatibilityInfo = {
        identitiesSupported: module.metadata.identities_supported,
        integrations: module.metadata.integrations,
        dependencies: module.metadata.dependencies || [],
        status: module.metadata.status,
        compliance: module.metadata.compliance,
        compatible: module.metadata.status === 'PRODUCTION_READY'
      };

      return compatibilityInfo;

    } catch (error) {
      console.error('[ModuleDiscovery] Get compatibility info error:', error);
      return {
        compatible: false,
        error: error.message
      };
    }
  }

  /**
   * Enhance search results with additional metadata
   */
  async enhanceSearchResults(searchResult, criteria) {
    try {
      // For now, just return the original results
      // In a full implementation, this would add additional metadata
      return searchResult;
    } catch (error) {
      console.error('[ModuleDiscovery] Enhance search results error:', error);
      return searchResult;
    }
  }

  /**
   * Apply advanced filtering to search results
   */
  async applyAdvancedFiltering(results, criteria) {
    try {
      // For now, just return the original results
      // In a full implementation, this would apply additional filters
      return results;
    } catch (error) {
      console.error('[ModuleDiscovery] Apply advanced filtering error:', error);
      return results;
    }
  }

  /**
   * Enhance modules with metrics
   */
  async enhanceWithMetrics(modules) {
    try {
      return modules.map(module => ({
        ...module,
        metrics: {
          queryCount: module.accessStats?.queryCount || 0,
          lastAccessed: module.accessStats?.lastAccessed || null
        }
      }));
    } catch (error) {
      console.error('[ModuleDiscovery] Enhance with metrics error:', error);
      return modules;
    }
  }

  /**
   * Enhance modules with compatibility information
   */
  async enhanceWithCompatibility(modules) {
    try {
      return Promise.all(
        modules.map(async (module) => {
          const compatibilityInfo = await this.getCompatibilityInfo(module.moduleId);
          return {
            ...module,
            compatibilityInfo
          };
        })
      );
    } catch (error) {
      console.error('[ModuleDiscovery] Enhance with compatibility error:', error);
      return modules;
    }
  }

  /**
   * Analyze version compatibility
   */
  async analyzeVersionCompatibility(dependencies) {
    try {
      const issues = [];
      
      for (const depId of dependencies) {
        const depModule = await this.qindexService.getModule(depId);
        if (depModule && depModule.metadata.status === 'DEPRECATED') {
          issues.push({
            moduleId: depId,
            issue: 'deprecated',
            message: `Dependency ${depId} is deprecated`
          });
        }
      }

      return {
        compatible: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('[ModuleDiscovery] Analyze version compatibility error:', error);
      return {
        compatible: false,
        issues: [{ error: error.message }]
      };
    }
  }

  /**
   * Analyze security risks
   */
  async analyzeSecurityRisks(dependencies) {
    try {
      const issues = [];
      
      for (const depId of dependencies) {
        const depModule = await this.qindexService.getModule(depId);
        if (depModule && !depModule.metadata.compliance.audit) {
          issues.push({
            moduleId: depId,
            risk: 'no_audit',
            message: `Dependency ${depId} has not passed security audit`
          });
        }
      }

      return {
        secure: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('[ModuleDiscovery] Analyze security risks error:', error);
      return {
        secure: false,
        issues: [{ error: error.message }]
      };
    }
  }

  /**
   * Generate comparison data
   */
  async generateComparisonData(baseStats) {
    try {
      // Simplified comparison data
      return {
        averageQueries: baseStats.totalQueries || 0,
        ranking: 'N/A'
      };
    } catch (error) {
      console.error('[ModuleDiscovery] Generate comparison data error:', error);
      return {};
    }
  }

  /**
   * Analyze trends
   */
  async analyzeTrends(moduleId, period) {
    try {
      // Simplified trend analysis
      return {
        trend: 'stable',
        change: 0,
        period
      };
    } catch (error) {
      console.error('[ModuleDiscovery] Analyze trends error:', error);
      return {
        trend: 'unknown',
        change: 0,
        period
      };
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(moduleId, stats) {
    try {
      const recommendations = [];
      
      if (stats.totalQueries < 10) {
        recommendations.push({
          type: 'usage',
          message: 'Consider promoting this module to increase usage'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('[ModuleDiscovery] Generate recommendations error:', error);
      return [];
    }
  }

  /**
   * Build dependency tree recursively
   */
  async buildDependencyTree(moduleId, dependencies, options) {
    const { includeTransitive, maxDepth, visited } = options;
    
    if (visited.has(moduleId) || visited.size >= maxDepth) {
      return { circular: visited.has(moduleId), maxDepthReached: visited.size >= maxDepth };
    }

    visited.add(moduleId);
    const tree = { moduleId, dependencies: {} };

    if (includeTransitive) {
      for (const depId of dependencies) {
        const depDependencies = await this.qindexService.getModuleDependencies(depId);
        tree.dependencies[depId] = await this.buildDependencyTree(depId, depDependencies, {
          ...options,
          visited: new Set(visited)
        });
      }
    } else {
      dependencies.forEach(depId => {
        tree.dependencies[depId] = { moduleId: depId, dependencies: {} };
      });
    }

    visited.delete(moduleId);
    return tree;
  }

  /**
   * Count total dependencies in tree
   */
  countTotalDependencies(tree) {
    if (!tree.dependencies) return 0;
    
    let count = Object.keys(tree.dependencies).length;
    Object.values(tree.dependencies).forEach(subtree => {
      count += this.countTotalDependencies(subtree);
    });
    
    return count;
  }

  /**
   * Calculate maximum depth of dependency tree
   */
  calculateMaxDepth(tree, currentDepth = 0) {
    if (!tree.dependencies || Object.keys(tree.dependencies).length === 0) {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    Object.values(tree.dependencies).forEach(subtree => {
      const depth = this.calculateMaxDepth(subtree, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return maxDepth;
  }

  /**
   * Update search analytics
   */
  updateSearchAnalytics(criteria, results) {
    const searchPattern = {
      query: criteria.query || null,
      filters: Object.keys(criteria).filter(key => 
        criteria[key] !== undefined && 
        !['limit', 'offset', 'sortBy', 'sortOrder'].includes(key)
      ),
      resultCount: results.totalCount
    };

    const patternKey = JSON.stringify(searchPattern);
    const currentCount = this.searchAnalytics.get(patternKey) || 0;
    this.searchAnalytics.set(patternKey, currentCount + 1);

    // Track popular filters
    searchPattern.filters.forEach(filter => {
      const filterCount = this.performanceMetrics.popularFilters.get(filter) || 0;
      this.performanceMetrics.popularFilters.set(filter, filterCount + 1);
    });
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(startTime, cacheHit) {
    const searchTime = Date.now() - startTime;
    
    this.performanceMetrics.totalSearches++;
    
    // Update average search time
    const totalTime = this.performanceMetrics.averageSearchTime * (this.performanceMetrics.totalSearches - 1) + searchTime;
    this.performanceMetrics.averageSearchTime = totalTime / this.performanceMetrics.totalSearches;
    
    // Update cache hit rate
    const totalHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalSearches - 1) + (cacheHit ? 1 : 0);
    this.performanceMetrics.cacheHitRate = totalHits / this.performanceMetrics.totalSearches;
  }

  /**
   * Get search patterns for analytics
   */
  getSearchPatterns(moduleId = null) {
    const patterns = Array.from(this.searchAnalytics.entries())
      .map(([pattern, count]) => ({ pattern: JSON.parse(pattern), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return patterns;
  }

  /**
   * Get popular filters
   */
  getPopularFilters() {
    return Array.from(this.performanceMetrics.popularFilters.entries())
      .map(([filter, count]) => ({ filter, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency() {
    const caches = [
      { name: 'search', cache: this.searchCache },
      { name: 'dependency', cache: this.dependencyCache },
      { name: 'metadata', cache: this.metadataCache }
    ];

    return caches.map(({ name, cache }) => {
      const entries = Array.from(cache.values());
      const totalHits = entries.reduce((sum, entry) => sum + (entry.hitCount || 0), 0);
      const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

      return {
        cacheName: name,
        size: cache.size,
        totalHits,
        averageHits: Math.round(avgHits * 100) / 100,
        hitRate: entries.length > 0 ? (totalHits / entries.length) * 100 : 0
      };
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      totalSearches: this.performanceMetrics.totalSearches,
      averageSearchTime: Math.round(this.performanceMetrics.averageSearchTime * 100) / 100,
      cacheHitRate: Math.round(this.performanceMetrics.cacheHitRate * 10000) / 100, // Percentage
      popularFilters: this.getPopularFilters().slice(0, 5)
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.searchCache.clear();
    this.dependencyCache.clear();
    this.metadataCache.clear();
    console.log('[ModuleDiscovery] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      search: {
        size: this.searchCache.size,
        maxSize: this.cacheConfig.maxCacheSize,
        ttl: this.cacheConfig.searchCacheTTL
      },
      dependency: {
        size: this.dependencyCache.size,
        maxSize: this.cacheConfig.maxCacheSize,
        ttl: this.cacheConfig.dependencyCacheTTL
      },
      metadata: {
        size: this.metadataCache.size,
        maxSize: this.cacheConfig.maxCacheSize,
        ttl: this.cacheConfig.metadataCacheTTL
      }
    };
  }
}

// Singleton instance
let moduleDiscoveryServiceInstance = null;

export function getModuleDiscoveryService() {
  if (!moduleDiscoveryServiceInstance) {
    moduleDiscoveryServiceInstance = new ModuleDiscoveryService();
  }
  return moduleDiscoveryServiceInstance;
}

export default ModuleDiscoveryService;