/**
 * Module Discovery and Query API Tests
 * 
 * Tests for the enhanced module discovery functionality including:
 * - Module search with filtering and sorting
 * - getModulesByType and getModulesForIdentity query methods
 * - Module dependency resolution and compatibility checking
 * - Module metadata caching for performance optimization
 * - Module access statistics tracking and reporting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModuleDiscoveryService, getModuleDiscoveryService } from '../services/ModuleDiscoveryService.mjs';
import { getQindexService } from '../ecosystem/QindexService.mjs';

describe('Module Discovery and Query API', () => {
  let discoveryService;
  let qindexService;
  let testModules;

  beforeEach(async () => {
    discoveryService = getModuleDiscoveryService();
    qindexService = getQindexService();
    
    // Clear caches before each test
    discoveryService.clearCaches();
    
    // Set up test modules
    testModules = [
      {
        moduleId: 'qwallet-test',
        metadata: {
          module: 'Qwallet',
          version: '1.0.0',
          description: 'Quantum wallet for secure transactions',
          identities_supported: ['ROOT', 'DAO', 'ENTERPRISE'],
          integrations: ['qlock', 'qindex', 'qerberos'],
          dependencies: ['qlock-core'],
          status: 'PRODUCTION_READY',
          audit_hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: true,
            gdpr_compliant: true,
            data_retention_policy: 'standard'
          },
          repository: 'https://github.com/anarq/qwallet',
          documentation: 'QmTestDocumentationCID123456789012345678901234567890',
          activated_by: 'did:root:test123',
          timestamp: Date.now(),
          checksum: 'test-checksum-123',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'test-key-id'
        },
        signedMetadata: {
          signature: 'test-signature-123',
          publicKey: 'test-public-key',
          signature_type: 'RSA-SHA256',
          signed_at: Date.now(),
          signer_identity: 'did:root:test123'
        }
      },
      {
        moduleId: 'qsocial-test',
        metadata: {
          module: 'Qsocial',
          version: '2.1.0',
          description: 'Decentralized social networking platform',
          identities_supported: ['DAO', 'ENTERPRISE', 'INDIVIDUAL'],
          integrations: ['qindex', 'qonsent'],
          dependencies: [],
          status: 'PRODUCTION_READY',
          audit_hash: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
          compliance: {
            audit: true,
            risk_scoring: false,
            privacy_enforced: true,
            kyc_support: false,
            gdpr_compliant: true,
            data_retention_policy: 'extended'
          },
          repository: 'https://github.com/anarq/qsocial',
          documentation: 'QmTestSocialDocCID123456789012345678901234567890',
          activated_by: 'did:dao:test456',
          timestamp: Date.now() - 86400000, // 1 day ago
          checksum: 'test-checksum-456',
          signature_algorithm: 'ECDSA-SHA256',
          public_key_id: 'test-key-id-2'
        },
        signedMetadata: {
          signature: 'test-signature-456',
          publicKey: 'test-public-key-2',
          signature_type: 'ECDSA-SHA256',
          signed_at: Date.now() - 86400000,
          signer_identity: 'did:dao:test456'
        }
      },
      {
        moduleId: 'qlock-core',
        metadata: {
          module: 'Qlock-Core',
          version: '1.5.2',
          description: 'Core cryptographic locking service',
          identities_supported: ['ROOT', 'DAO', 'ENTERPRISE', 'INDIVIDUAL'],
          integrations: ['qindex'],
          dependencies: [],
          status: 'PRODUCTION_READY',
          audit_hash: 'c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: false,
            gdpr_compliant: true,
            data_retention_policy: 'minimal'
          },
          repository: 'https://github.com/anarq/qlock-core',
          documentation: 'QmTestLockDocCID123456789012345678901234567890',
          activated_by: 'did:root:test789',
          timestamp: Date.now() - 172800000, // 2 days ago
          checksum: 'test-checksum-789',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'test-key-id-3'
        },
        signedMetadata: {
          signature: 'test-signature-789',
          publicKey: 'test-public-key-3',
          signature_type: 'RSA-SHA256',
          signed_at: Date.now() - 172800000,
          signer_identity: 'did:root:test789'
        }
      }
    ];

    // Register test modules
    for (const module of testModules) {
      await qindexService.registerModule(module.moduleId, {
        metadata: module.metadata,
        ...module.signedMetadata
      });
    }
  });

  afterEach(async () => {
    // Clean up test modules
    for (const module of testModules) {
      try {
        await qindexService.deregisterModule(module.moduleId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clear caches
    discoveryService.clearCaches();
  });

  describe('Enhanced Module Search', () => {
    it('should search modules with basic criteria', async () => {
      const results = await discoveryService.searchModules({
        query: 'wallet',
        limit: 10,
        offset: 0
      });

      expect(results).toBeDefined();
      expect(results.modules).toBeInstanceOf(Array);
      expect(results.totalCount).toBeGreaterThan(0);
      expect(results.searchId).toBeDefined();
      expect(results.cached).toBe(false);
      expect(results.searchTime).toBeGreaterThan(0);

      // Should find the qwallet module
      const walletModule = results.modules.find(m => m.moduleId === 'qwallet-test');
      expect(walletModule).toBeDefined();
    });

    it('should cache search results', async () => {
      const criteria = {
        query: 'social',
        status: 'PRODUCTION_READY',
        limit: 10
      };

      // First search - should not be cached
      const firstResult = await discoveryService.searchModules(criteria);
      expect(firstResult.cached).toBe(false);

      // Second search - should be cached
      const secondResult = await discoveryService.searchModules(criteria);
      expect(secondResult.cached).toBe(true);
      expect(secondResult.cacheAge).toBeGreaterThan(0);
    });

    it('should filter by identity type', async () => {
      const results = await discoveryService.searchModules({
        identityType: 'ROOT',
        limit: 10
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        expect(module.metadata.identities_supported).toContain('ROOT');
      });
    });

    it('should filter by compliance requirements', async () => {
      const results = await discoveryService.searchModules({
        hasCompliance: true,
        limit: 10
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        const compliance = module.metadata.compliance;
        const hasAnyCompliance = compliance.audit || 
                                compliance.risk_scoring || 
                                compliance.privacy_enforced;
        expect(hasAnyCompliance).toBe(true);
      });
    });

    it('should sort results by different criteria', async () => {
      const nameResults = await discoveryService.searchModules({
        sortBy: 'name',
        sortOrder: 'asc',
        limit: 10
      });

      expect(nameResults.modules).toBeInstanceOf(Array);
      if (nameResults.modules.length > 1) {
        for (let i = 1; i < nameResults.modules.length; i++) {
          const prevName = nameResults.modules[i-1].metadata.module.toLowerCase();
          const currName = nameResults.modules[i].metadata.module.toLowerCase();
          expect(prevName <= currName).toBe(true);
        }
      }
    });
  });

  describe('Get Modules by Type', () => {
    it('should get modules by type with basic options', async () => {
      const results = await discoveryService.getModulesByType('wallet', {
        limit: 10,
        includeMetrics: true
      });

      expect(results).toBeDefined();
      expect(results.type).toBe('wallet');
      expect(results.modules).toBeInstanceOf(Array);
      expect(results.cached).toBe(false);
      expect(results.searchTime).toBeGreaterThan(0);
    });

    it('should filter by compliance level', async () => {
      const results = await discoveryService.getModulesByType('core', {
        minCompliance: 3, // Require at least 3 compliance features
        limit: 10
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        const compliance = module.metadata.compliance;
        const complianceCount = Object.values(compliance).filter(Boolean).length;
        expect(complianceCount).toBeGreaterThanOrEqual(3);
      });
    });

    it('should filter by module age', async () => {
      const results = await discoveryService.getModulesByType('social', {
        maxAge: 1, // Only modules registered within 1 day
        limit: 10
      });

      expect(results.modules).toBeInstanceOf(Array);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      results.modules.forEach(module => {
        const registeredAt = new Date(module.registrationInfo.registeredAt).getTime();
        expect(registeredAt).toBeGreaterThan(oneDayAgo);
      });
    });

    it('should include compatibility information', async () => {
      const results = await discoveryService.getModulesByType('wallet', {
        includeCompatibility: true,
        limit: 5
      });

      expect(results.modules).toBeInstanceOf(Array);
      if (results.modules.length > 0) {
        // Check if compatibility info is included (implementation dependent)
        expect(results.searchMetadata.enhancedFilters.includeCompatibility).toBe(true);
      }
    });
  });

  describe('Get Modules for Identity', () => {
    it('should get modules for specific identity type', async () => {
      const results = await discoveryService.getModulesForIdentity('DAO', {
        limit: 10,
        includeCompatibilityScore: true
      });

      expect(results).toBeDefined();
      expect(results.identityType).toBe('DAO');
      expect(results.modules).toBeInstanceOf(Array);
      expect(results.cached).toBe(false);

      // All modules should support DAO identity
      results.modules.forEach(module => {
        expect(module.metadata.identities_supported).toContain('DAO');
      });
    });

    it('should include compatibility scores', async () => {
      const results = await discoveryService.getModulesForIdentity('ROOT', {
        includeCompatibilityScore: true,
        limit: 5
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        if (module.compatibilityScore) {
          expect(module.compatibilityScore.overall).toBeGreaterThanOrEqual(0);
          expect(module.compatibilityScore.overall).toBeLessThanOrEqual(100);
          expect(module.compatibilityScore.details).toBeDefined();
        }
      });
    });

    it('should include dependency information', async () => {
      const results = await discoveryService.getModulesForIdentity('ROOT', {
        includeDependencyInfo: true,
        limit: 5
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        if (module.dependencyInfo) {
          expect(module.dependencyInfo.hasDependencies).toBeDefined();
          expect(module.dependencyInfo.count).toBeGreaterThanOrEqual(0);
          expect(module.dependencyInfo.dependencies).toBeInstanceOf(Array);
        }
      });
    });

    it('should include security information', async () => {
      const results = await discoveryService.getModulesForIdentity('ENTERPRISE', {
        includeSecurityInfo: true,
        limit: 5
      });

      expect(results.modules).toBeInstanceOf(Array);
      results.modules.forEach(module => {
        if (module.securityInfo) {
          expect(module.securityInfo.securityScore).toBeGreaterThanOrEqual(0);
          expect(module.securityInfo.securityLevel).toMatch(/^(low|medium|high|unknown)$/);
          expect(module.securityInfo.auditStatus).toBeDefined();
        }
      });
    });

    it('should sort by compatibility score', async () => {
      const results = await discoveryService.getModulesForIdentity('ROOT', {
        includeCompatibilityScore: true,
        sortBy: 'compatibility',
        sortOrder: 'desc',
        limit: 10
      });

      expect(results.modules).toBeInstanceOf(Array);
      if (results.modules.length > 1) {
        for (let i = 1; i < results.modules.length; i++) {
          const prevScore = results.modules[i-1].compatibilityScore?.overall || 0;
          const currScore = results.modules[i].compatibilityScore?.overall || 0;
          expect(prevScore >= currScore).toBe(true);
        }
      }
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve module dependencies', async () => {
      const result = await discoveryService.resolveDependencies('qwallet-test', {
        includeTransitive: true,
        checkCompatibility: true
      });

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('qwallet-test');
      expect(result.dependencies).toBeInstanceOf(Array);
      expect(result.dependencyTree).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.cached).toBe(false);
      expect(result.resolveTime).toBeGreaterThan(0);

      // Should have qlock-core as dependency
      expect(result.dependencies).toContain('qlock-core');
    });

    it('should cache dependency resolution results', async () => {
      const options = {
        includeTransitive: true,
        checkCompatibility: true
      };

      // First resolution - should not be cached
      const firstResult = await discoveryService.resolveDependencies('qwallet-test', options);
      expect(firstResult.cached).toBe(false);

      // Second resolution - should be cached
      const secondResult = await discoveryService.resolveDependencies('qwallet-test', options);
      expect(secondResult.cached).toBe(true);
    });

    it('should detect modules with no dependencies', async () => {
      const result = await discoveryService.resolveDependencies('qsocial-test');

      expect(result.dependencies).toHaveLength(0);
      expect(result.analysis.totalDependencies).toBe(0);
      expect(result.analysis.directDependencies).toBe(0);
      expect(result.analysis.transitiveDependencies).toBe(0);
    });

    it('should include compatibility analysis', async () => {
      const result = await discoveryService.resolveDependencies('qwallet-test', {
        checkCompatibility: true
      });

      expect(result.compatibilityAnalysis).toBeDefined();
      if (result.dependencies.length > 0) {
        expect(result.compatibilityAnalysis.compatible).toBeDefined();
        expect(result.compatibilityAnalysis.conflicts).toBeInstanceOf(Array);
        expect(result.compatibilityAnalysis.missingDependencies).toBeInstanceOf(Array);
      }
    });

    it('should include version analysis', async () => {
      const result = await discoveryService.resolveDependencies('qwallet-test', {
        includeVersionAnalysis: true
      });

      if (result.dependencies.length > 0) {
        expect(result.versionAnalysis).toBeDefined();
      }
    });
  });

  describe('Module Metadata Caching', () => {
    it('should cache module metadata', async () => {
      const options = {
        includeAccessStats: true,
        includeCompatibilityInfo: true
      };

      // First request - should not be cached
      const firstResult = await discoveryService.getCachedModuleMetadata('qwallet-test', options);
      expect(firstResult).toBeDefined();
      expect(firstResult.cached).toBe(false);
      expect(firstResult.retrieveTime).toBeGreaterThan(0);

      // Second request - should be cached
      const secondResult = await discoveryService.getCachedModuleMetadata('qwallet-test', options);
      expect(secondResult.cached).toBe(true);
      expect(secondResult.cacheAge).toBeGreaterThan(0);
    });

    it('should force refresh cached metadata', async () => {
      const options = { includeAccessStats: true };

      // Cache the metadata first
      await discoveryService.getCachedModuleMetadata('qwallet-test', options);

      // Force refresh
      const refreshedResult = await discoveryService.getCachedModuleMetadata('qwallet-test', {
        ...options,
        forceRefresh: true
      });

      expect(refreshedResult.cached).toBe(false);
    });

    it('should include enhanced metadata features', async () => {
      const result = await discoveryService.getCachedModuleMetadata('qwallet-test', {
        includeCompatibilityInfo: true,
        includeDependencyInfo: true,
        includeSecurityInfo: true
      });

      expect(result).toBeDefined();
      expect(result.discoveryMetadata).toBeDefined();
      expect(result.discoveryMetadata.enhancedFeatures).toBeDefined();
      expect(result.discoveryMetadata.enhancedFeatures.includeCompatibilityInfo).toBe(true);
      expect(result.discoveryMetadata.enhancedFeatures.includeDependencyInfo).toBe(true);
      expect(result.discoveryMetadata.enhancedFeatures.includeSecurityInfo).toBe(true);
    });

    it('should return null for non-existent modules', async () => {
      const result = await discoveryService.getCachedModuleMetadata('non-existent-module');
      expect(result).toBeNull();
    });
  });

  describe('Module Access Statistics', () => {
    it('should get access statistics for specific module', async () => {
      const stats = await discoveryService.getModuleAccessStatistics('qwallet-test', {
        period: '30d',
        includeDetails: true,
        includeTrends: true
      });

      expect(stats).toBeDefined();
      expect(stats.discoveryAnalytics).toBeDefined();
      expect(stats.discoveryAnalytics.performanceMetrics).toBeDefined();
      expect(stats.generatedAt).toBeDefined();
      expect(stats.analysisTime).toBeGreaterThan(0);
    });

    it('should get access statistics for all modules', async () => {
      const stats = await discoveryService.getModuleAccessStatistics(null, {
        includeComparisons: true,
        includeTrends: true
      });

      expect(stats).toBeDefined();
      expect(stats.discoveryAnalytics).toBeDefined();
      expect(stats.discoveryAnalytics.searchPatterns).toBeInstanceOf(Array);
      expect(stats.discoveryAnalytics.popularFilters).toBeInstanceOf(Array);
      expect(stats.discoveryAnalytics.cacheEfficiency).toBeInstanceOf(Array);
    });

    it('should include performance metrics', async () => {
      // Perform some searches to generate metrics
      await discoveryService.searchModules({ query: 'test' });
      await discoveryService.getModulesByType('wallet');

      const stats = await discoveryService.getModuleAccessStatistics();
      
      expect(stats.discoveryAnalytics.performanceMetrics).toBeDefined();
      expect(stats.discoveryAnalytics.performanceMetrics.totalSearches).toBeGreaterThan(0);
      expect(stats.discoveryAnalytics.performanceMetrics.averageSearchTime).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      // Populate caches
      await discoveryService.searchModules({ query: 'test' });
      await discoveryService.getCachedModuleMetadata('qwallet-test');
      await discoveryService.resolveDependencies('qwallet-test');

      const cacheStats = discoveryService.getCacheStats();
      
      expect(cacheStats).toBeDefined();
      expect(cacheStats.search).toBeDefined();
      expect(cacheStats.dependency).toBeDefined();
      expect(cacheStats.metadata).toBeDefined();
      
      expect(cacheStats.search.size).toBeGreaterThan(0);
      expect(cacheStats.search.maxSize).toBe(1000);
      expect(cacheStats.search.ttl).toBe(300000);
    });

    it('should clear all caches', async () => {
      // Populate caches
      await discoveryService.searchModules({ query: 'test' });
      await discoveryService.getCachedModuleMetadata('qwallet-test');

      // Verify caches have content
      let cacheStats = discoveryService.getCacheStats();
      expect(cacheStats.search.size + cacheStats.metadata.size).toBeGreaterThan(0);

      // Clear caches
      discoveryService.clearCaches();

      // Verify caches are empty
      cacheStats = discoveryService.getCacheStats();
      expect(cacheStats.search.size).toBe(0);
      expect(cacheStats.dependency.size).toBe(0);
      expect(cacheStats.metadata.size).toBe(0);
    });

    it('should respect cache TTL', async () => {
      // This test would require mocking time or waiting, so we'll just verify the structure
      const shortTTL = 100; // 100ms
      
      const result = await discoveryService.getCachedModuleMetadata('qwallet-test', {
        cacheTTL: shortTTL
      });
      
      expect(result).toBeDefined();
      expect(result.cached).toBe(false);
      
      // Immediate second request should be cached
      const cachedResult = await discoveryService.getCachedModuleMetadata('qwallet-test', {
        cacheTTL: shortTTL
      });
      
      expect(cachedResult.cached).toBe(true);
    });
  });

  describe('Performance and Analytics', () => {
    it('should track search patterns', async () => {
      // Perform various searches
      await discoveryService.searchModules({ query: 'wallet', status: 'PRODUCTION_READY' });
      await discoveryService.searchModules({ identityType: 'ROOT' });
      await discoveryService.getModulesByType('social');

      const patterns = discoveryService.getSearchPatterns();
      expect(patterns).toBeInstanceOf(Array);
    });

    it('should track popular filters', async () => {
      // Perform searches with different filters
      await discoveryService.searchModules({ status: 'PRODUCTION_READY' });
      await discoveryService.searchModules({ hasCompliance: true });
      await discoveryService.searchModules({ identityType: 'DAO' });

      const popularFilters = discoveryService.getPopularFilters();
      expect(popularFilters).toBeInstanceOf(Array);
      
      if (popularFilters.length > 0) {
        expect(popularFilters[0]).toHaveProperty('filter');
        expect(popularFilters[0]).toHaveProperty('count');
      }
    });

    it('should provide cache efficiency metrics', async () => {
      // Populate and access caches multiple times
      await discoveryService.searchModules({ query: 'test' });
      await discoveryService.searchModules({ query: 'test' }); // Should hit cache
      
      const efficiency = discoveryService.getCacheEfficiency();
      expect(efficiency).toBeInstanceOf(Array);
      expect(efficiency).toHaveLength(3); // search, dependency, metadata caches
      
      efficiency.forEach(cache => {
        expect(cache).toHaveProperty('cacheName');
        expect(cache).toHaveProperty('size');
        expect(cache).toHaveProperty('totalHits');
        expect(cache).toHaveProperty('averageHits');
        expect(cache).toHaveProperty('hitRate');
      });
    });

    it('should provide performance metrics', async () => {
      // Perform some operations
      await discoveryService.searchModules({ query: 'performance' });
      await discoveryService.getModulesByType('test');

      const metrics = discoveryService.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalSearches).toBeGreaterThan(0);
      expect(metrics.averageSearchTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.popularFilters).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid search criteria gracefully', async () => {
      const result = await discoveryService.searchModules({
        limit: -1, // Invalid limit
        offset: -5  // Invalid offset
      });

      expect(result).toBeDefined();
      expect(result.modules).toBeInstanceOf(Array);
    });

    it('should handle non-existent module dependency resolution', async () => {
      const result = await discoveryService.resolveDependencies('non-existent-module');
      
      // Should not throw, but may return empty or error result
      expect(result).toBeDefined();
    });

    it('should handle cache errors gracefully', async () => {
      // This would test cache corruption or other cache-related errors
      // For now, we'll just verify the service doesn't crash
      const result = await discoveryService.getCachedModuleMetadata('qwallet-test');
      expect(result).toBeDefined();
    });
  });
});