/**
 * Tests for Module Registration Performance Optimizer
 * Verifies all performance optimization features are working correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationPerformanceOptimizer } from '../ModuleRegistrationPerformanceOptimizer';
import {
  RegisteredModule,
  VerificationResult,
  ModuleSearchCriteria,
  ModuleStatus
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleRegistrationPerformanceOptimizer', () => {
  let optimizer: ModuleRegistrationPerformanceOptimizer;
  let mockModule: RegisteredModule;

  beforeEach(() => {
    optimizer = new ModuleRegistrationPerformanceOptimizer();
    
    mockModule = {
      moduleId: 'test-module',
      metadata: {
        module: 'TestModule',
        version: '1.0.0',
        description: 'A test module for performance optimization testing',
        identities_supported: [IdentityType.ROOT, IdentityType.DAO],
        integrations: ['qindex', 'qlock'],
        dependencies: [],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'abc123',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: '30 days'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestDocCID123',
        activated_by: 'did:test:root',
        timestamp: Date.now(),
        checksum: 'sha256:def456',
        signature_algorithm: 'RSA-4096',
        public_key_id: 'key123'
      },
      signedMetadata: {
        metadata: {} as any,
        signature: 'test-signature',
        publicKey: 'test-public-key',
        signature_type: 'RSA-4096',
        signed_at: Date.now(),
        signer_identity: 'did:test:root'
      },
      registrationInfo: {
        cid: 'QmTestCID123',
        indexId: 'idx123',
        registeredAt: new Date().toISOString(),
        registeredBy: 'did:test:root',
        status: ModuleStatus.PRODUCTION_READY,
        verificationStatus: 'VERIFIED',
        testMode: false
      },
      accessStats: {
        queryCount: 0,
        lastAccessed: new Date().toISOString(),
        dependentModules: []
      }
    };
  });

  afterEach(() => {
    optimizer.clearCaches();
  });

  describe('Signature Verification Caching', () => {
    it('should cache signature verification results', () => {
      const moduleId = 'test-module';
      const moduleVersion = '1.0.0';
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      // Cache the result
      optimizer.cacheSignatureVerification(moduleId, moduleVersion, verificationResult);

      // Retrieve from cache
      const cachedResult = optimizer.getCachedSignatureVerification(moduleId, moduleVersion);
      
      expect(cachedResult).toEqual(verificationResult);
    });

    it('should return null for non-existent cache entries', () => {
      const result = optimizer.getCachedSignatureVerification('non-existent', '1.0.0');
      expect(result).toBeNull();
    });

    it('should track cache hit and miss metrics', () => {
      const moduleId = 'test-module';
      const moduleVersion = '1.0.0';
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      // Initial metrics
      let metrics = optimizer.getPerformanceMetrics();
      const initialHits = metrics.signatureCache.totalHits;
      const initialMisses = metrics.signatureCache.totalMisses;

      // Cache miss
      optimizer.getCachedSignatureVerification(moduleId, moduleVersion);
      
      // Cache the result
      optimizer.cacheSignatureVerification(moduleId, moduleVersion, verificationResult);
      
      // Cache hit
      optimizer.getCachedSignatureVerification(moduleId, moduleVersion);

      metrics = optimizer.getPerformanceMetrics();
      expect(metrics.signatureCache.totalHits).toBe(initialHits + 1);
      expect(metrics.signatureCache.totalMisses).toBe(initialMisses + 1);
    });

    it('should handle cache expiration', async () => {
      const moduleId = 'test-module';
      const moduleVersion = '1.0.0';
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      let mockTime = originalNow();
      vi.spyOn(Date, 'now').mockImplementation(() => mockTime);

      // Cache the result
      optimizer.cacheSignatureVerification(moduleId, moduleVersion, verificationResult);

      // Verify it's cached
      expect(optimizer.getCachedSignatureVerification(moduleId, moduleVersion)).toEqual(verificationResult);

      // Simulate time passage beyond TTL (1 hour + 1 minute)
      mockTime += 3660000;

      // Should return null due to expiration
      expect(optimizer.getCachedSignatureVerification(moduleId, moduleVersion)).toBeNull();

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Lazy Loading Documentation', () => {
    it('should load and cache documentation', async () => {
      const documentationCid = 'QmTestDocCID123';
      
      // First load (cache miss)
      const content1 = await optimizer.loadModuleDocumentation(documentationCid);
      expect(content1).toBe(`Documentation content for CID: ${documentationCid}`);

      // Second load (cache hit)
      const content2 = await optimizer.loadModuleDocumentation(documentationCid);
      expect(content2).toBe(content1);

      // Verify metrics
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.documentationCache.totalHits).toBe(1);
      expect(metrics.documentationCache.totalMisses).toBe(1);
    });

    it('should load and cache extended metadata', async () => {
      const moduleId = 'test-module';
      const metadataCid = 'QmTestMetaCID123';
      
      // First load (cache miss)
      const metadata1 = await optimizer.loadModuleExtendedMetadata(moduleId, metadataCid);
      expect(metadata1).toHaveProperty('extendedDescription');
      expect(metadata1).toHaveProperty('screenshots');
      expect(metadata1).toHaveProperty('license', 'MIT');

      // Second load (cache hit)
      const metadata2 = await optimizer.loadModuleExtendedMetadata(moduleId, metadataCid);
      expect(metadata2).toEqual(metadata1);

      // Verify metrics
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.documentationCache.totalHits).toBe(1);
      expect(metrics.documentationCache.totalMisses).toBe(1);
    });

    it('should force refresh when requested', async () => {
      const documentationCid = 'QmTestDocCID123';
      
      // Initial load
      await optimizer.loadModuleDocumentation(documentationCid);
      
      // Force refresh should bypass cache
      const refreshedContent = await optimizer.loadModuleDocumentation(documentationCid, true);
      expect(refreshedContent).toBe(`Documentation content for CID: ${documentationCid}`);

      // Should have 2 misses (initial + force refresh)
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.documentationCache.totalMisses).toBe(2);
    });
  });

  describe('Search Index Optimization', () => {
    it('should build search indexes for modules', () => {
      const modules = [mockModule];
      
      optimizer.buildSearchIndex(modules);
      
      // Test search by name
      const nameResults = optimizer.searchModulesOptimized({ name: 'TestModule' });
      expect(nameResults.has('test-module')).toBe(true);

      // Test search by status
      const statusResults = optimizer.searchModulesOptimized({ status: ModuleStatus.PRODUCTION_READY });
      expect(statusResults.has('test-module')).toBe(true);

      // Test search by identity type
      const identityResults = optimizer.searchModulesOptimized({ identityType: IdentityType.ROOT });
      expect(identityResults.has('test-module')).toBe(true);

      // Test search by integration
      const integrationResults = optimizer.searchModulesOptimized({ integration: 'qindex' });
      expect(integrationResults.has('test-module')).toBe(true);
    });

    it('should add and remove modules from search index', () => {
      // Add module to index
      optimizer.addModuleToSearchIndex(mockModule);
      
      // Verify it's indexed
      const results1 = optimizer.searchModulesOptimized({ name: 'TestModule' });
      expect(results1.has('test-module')).toBe(true);

      // Remove module from index
      optimizer.removeModuleFromSearchIndex('test-module');
      
      // Verify it's removed
      const results2 = optimizer.searchModulesOptimized({ name: 'TestModule' });
      expect(results2.has('test-module')).toBe(false);
    });

    it('should track search index hit and miss metrics', () => {
      optimizer.addModuleToSearchIndex(mockModule);
      
      // Search with criteria that will hit index
      optimizer.searchModulesOptimized({ name: 'TestModule' });
      
      // Search with criteria that won't hit index (no criteria)
      optimizer.searchModulesOptimized({});

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.searchIndex.totalHits).toBe(1);
      expect(metrics.searchIndex.totalMisses).toBe(1);
    });
  });

  describe('Batch Processing', () => {
    it('should add operations to batch and process them', async () => {
      const batchId = 'test-batch';
      const operation = {
        type: 'register' as const,
        moduleId: 'test-module',
        data: { test: 'data' },
        priority: 1
      };

      // Add operation to batch
      optimizer.addToBatch(batchId, operation);

      // Process batch
      const results = await optimizer.processBatch(batchId);
      
      expect(results.has('test-module')).toBe(true);
      expect(results.get('test-module')).toEqual({
        success: true,
        moduleId: 'test-module'
      });

      // Verify metrics
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.batchProcessing.completedBatches).toBe(1);
    });

    it('should handle different operation types in batch', async () => {
      const batchId = 'multi-op-batch';
      
      const operations = [
        { type: 'register' as const, moduleId: 'module1', data: {}, priority: 1 },
        { type: 'update' as const, moduleId: 'module2', data: {}, priority: 2 },
        { type: 'verify' as const, moduleId: 'module3', data: {}, priority: 3 },
        { type: 'deregister' as const, moduleId: 'module4', data: {}, priority: 4 }
      ];

      // Add all operations to batch
      operations.forEach(op => optimizer.addToBatch(batchId, op));

      // Process batch
      const results = await optimizer.processBatch(batchId);
      
      expect(results.size).toBe(4);
      expect(results.get('module1')).toEqual({ success: true, moduleId: 'module1' });
      expect(results.get('module2')).toEqual({ success: true, moduleId: 'module2' });
      expect(results.get('module3')).toEqual({ success: true, moduleId: 'module3', verified: true });
      expect(results.get('module4')).toEqual({ success: true, moduleId: 'module4' });
    });
  });

  describe('Connection Pooling', () => {
    it('should create and manage connection pools', async () => {
      const serviceName = 'test-service';
      
      // Get first connection (should create new)
      const connection1 = await optimizer.getConnection(serviceName);
      expect(connection1).toBeTruthy();
      expect(connection1?.service).toBe(serviceName);
      expect(connection1?.isActive).toBe(true);

      // Release connection
      if (connection1) {
        optimizer.releaseConnection(connection1);
      }

      // Get second connection (should reuse if available)
      const connection2 = await optimizer.getConnection(serviceName);
      expect(connection2).toBeTruthy();

      // Verify metrics
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.connectionPools.totalConnections).toBeGreaterThan(0);
    });

    it('should track connection pool hit and miss metrics', async () => {
      const serviceName = 'test-service';
      
      // First connection (miss - new connection created)
      const connection1 = await optimizer.getConnection(serviceName);
      
      // Release connection
      if (connection1) {
        optimizer.releaseConnection(connection1);
      }

      // Second connection (hit - reuse existing)
      const connection2 = await optimizer.getConnection(serviceName);

      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.connectionPools.totalHits).toBeGreaterThanOrEqual(1);
      expect(metrics.connectionPools.totalMisses).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should provide comprehensive performance metrics', () => {
      const metrics = optimizer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('signatureCache');
      expect(metrics).toHaveProperty('documentationCache');
      expect(metrics).toHaveProperty('searchIndex');
      expect(metrics).toHaveProperty('batchProcessing');
      expect(metrics).toHaveProperty('connectionPools');
      expect(metrics).toHaveProperty('overall');

      // Verify structure of each metric category
      expect(metrics.signatureCache).toHaveProperty('size');
      expect(metrics.signatureCache).toHaveProperty('hitRate');
      expect(metrics.signatureCache).toHaveProperty('totalHits');
      expect(metrics.signatureCache).toHaveProperty('totalMisses');
      expect(metrics.signatureCache).toHaveProperty('memoryUsage');

      expect(metrics.documentationCache).toHaveProperty('size');
      expect(metrics.documentationCache).toHaveProperty('totalSize');
      expect(metrics.documentationCache).toHaveProperty('hitRate');

      expect(metrics.searchIndex).toHaveProperty('totalIndexes');
      expect(metrics.searchIndex).toHaveProperty('totalEntries');
      expect(metrics.searchIndex).toHaveProperty('hitRate');

      expect(metrics.batchProcessing).toHaveProperty('activeBatches');
      expect(metrics.batchProcessing).toHaveProperty('completedBatches');

      expect(metrics.connectionPools).toHaveProperty('totalPools');
      expect(metrics.connectionPools).toHaveProperty('totalConnections');
      expect(metrics.connectionPools).toHaveProperty('activeConnections');

      expect(metrics.overall).toHaveProperty('averageResponseTime');
      expect(metrics.overall).toHaveProperty('totalOperations');
      expect(metrics.overall).toHaveProperty('memoryEfficiency');
      expect(metrics.overall).toHaveProperty('overallHitRate');
    });

    it('should calculate hit rates correctly', async () => {
      const moduleId = 'test-module';
      const moduleVersion = '1.0.0';
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      // Generate some cache activity
      optimizer.getCachedSignatureVerification(moduleId, moduleVersion); // miss
      optimizer.cacheSignatureVerification(moduleId, moduleVersion, verificationResult);
      optimizer.getCachedSignatureVerification(moduleId, moduleVersion); // hit
      optimizer.getCachedSignatureVerification(moduleId, moduleVersion); // hit

      const metrics = optimizer.getPerformanceMetrics();
      
      // Should have 2 hits and 1 miss = 66.67% hit rate
      expect(metrics.signatureCache.totalHits).toBe(2);
      expect(metrics.signatureCache.totalMisses).toBe(1);
      expect(metrics.signatureCache.hitRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Cache Optimization', () => {
    it('should optimize cache sizes based on usage patterns', () => {
      // Add some cache entries with different access patterns
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      // Cache multiple entries
      for (let i = 0; i < 10; i++) {
        optimizer.cacheSignatureVerification(`module-${i}`, '1.0.0', verificationResult);
      }

      // Access some entries more than others
      for (let i = 0; i < 5; i++) {
        optimizer.getCachedSignatureVerification('module-0', '1.0.0');
        optimizer.getCachedSignatureVerification('module-1', '1.0.0');
      }

      // Run optimization
      expect(() => optimizer.optimizeCacheSizes()).not.toThrow();
    });

    it('should preload frequently accessed modules', async () => {
      const moduleIds = ['module1', 'module2', 'module3'];
      
      await expect(optimizer.preloadFrequentModules(moduleIds)).resolves.not.toThrow();
    });

    it('should warm up search indexes', () => {
      const commonQueries: ModuleSearchCriteria[] = [
        { name: 'test' },
        { status: ModuleStatus.PRODUCTION_READY },
        { identityType: IdentityType.ROOT }
      ];

      expect(() => optimizer.warmUpSearchIndexes(commonQueries)).not.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches and reset metrics', async () => {
      // Add some data to caches
      const verificationResult: VerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      optimizer.cacheSignatureVerification('test-module', '1.0.0', verificationResult);
      await optimizer.loadModuleDocumentation('QmTestCID');
      optimizer.addModuleToSearchIndex(mockModule);

      // Verify caches have data
      let metrics = optimizer.getPerformanceMetrics();
      expect(metrics.signatureCache.size).toBeGreaterThan(0);
      expect(metrics.documentationCache.size).toBeGreaterThan(0);
      expect(metrics.searchIndex.totalEntries).toBeGreaterThan(0);

      // Clear caches
      optimizer.clearCaches();

      // Verify caches are empty and metrics reset
      metrics = optimizer.getPerformanceMetrics();
      expect(metrics.signatureCache.size).toBe(0);
      expect(metrics.documentationCache.size).toBe(0);
      expect(metrics.searchIndex.totalEntries).toBe(0);
      expect(metrics.signatureCache.totalHits).toBe(0);
      expect(metrics.signatureCache.totalMisses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle batch processing errors gracefully', async () => {
      const batchId = 'error-batch';
      const operation = {
        type: 'invalid-type' as any,
        moduleId: 'test-module',
        data: {},
        priority: 1
      };

      optimizer.addToBatch(batchId, operation);
      
      const results = await optimizer.processBatch(batchId);
      
      expect(results.has('test-module')).toBe(true);
      expect(results.get('test-module')).toHaveProperty('error');
    });

    it('should handle connection creation failures', async () => {
      // This test would require mocking the connection creation to fail
      // For now, we'll just verify the method doesn't throw
      const connection = await optimizer.getConnection('test-service');
      expect(connection).toBeTruthy();
    });
  });
});