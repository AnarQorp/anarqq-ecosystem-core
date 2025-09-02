/**
 * Simple integration test for performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { moduleRegistrationPerformanceOptimizer } from '../ModuleRegistrationPerformanceOptimizer';
import { ModuleVerificationService } from '../ModuleVerificationService';
import {
  VerificationResult,
  RegisteredModule,
  ModuleStatus
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('Performance Optimization Integration', () => {
  let verificationService: ModuleVerificationService;

  beforeEach(() => {
    verificationService = new ModuleVerificationService();
    moduleRegistrationPerformanceOptimizer.clearCaches();
  });

  afterEach(() => {
    moduleRegistrationPerformanceOptimizer.clearCaches();
  });

  it('should integrate signature verification caching with verification service', async () => {
    const moduleId = 'test-integration-module';
    const moduleVersion = '1.0.0';
    
    const mockSignedMetadata = {
      metadata: {
        module: moduleId,
        version: moduleVersion,
        description: 'Test integration module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['qindex'],
        dependencies: [],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'test-hash',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: '30 days'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestCID',
        activated_by: 'did:test:root',
        timestamp: Date.now(),
        checksum: 'test-checksum',
        signature_algorithm: 'RSA-4096',
        public_key_id: 'test-key-id'
      },
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-4096',
      signed_at: Date.now(),
      signer_identity: 'did:test:root'
    };

    // First verification (cache miss)
    const result1 = await verificationService.verifySignature(mockSignedMetadata);
    
    // Second verification (cache hit)
    const result2 = await verificationService.verifySignature(mockSignedMetadata);
    
    // Results should be identical
    expect(result1).toEqual(result2);
    
    // Verify cache was used
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    expect(metrics.signatureCache.totalHits).toBe(1);
    expect(metrics.signatureCache.totalMisses).toBe(1);
  });

  it('should provide comprehensive performance metrics', () => {
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    
    // Verify all metric categories exist
    expect(metrics).toHaveProperty('signatureCache');
    expect(metrics).toHaveProperty('documentationCache');
    expect(metrics).toHaveProperty('searchIndex');
    expect(metrics).toHaveProperty('batchProcessing');
    expect(metrics).toHaveProperty('connectionPools');
    expect(metrics).toHaveProperty('overall');
    
    // Verify metric structure
    expect(metrics.signatureCache).toHaveProperty('size');
    expect(metrics.signatureCache).toHaveProperty('hitRate');
    expect(metrics.overall).toHaveProperty('overallHitRate');
  });

  it('should handle search index optimization', () => {
    const mockModule: RegisteredModule = {
      moduleId: 'search-test-module',
      metadata: {
        module: 'SearchTestModule',
        version: '1.0.0',
        description: 'Search test module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['qindex'],
        dependencies: [],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'search-hash',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: '30 days'
        },
        repository: 'https://github.com/test/search-module',
        documentation: 'QmSearchDoc',
        activated_by: 'did:test:root',
        timestamp: Date.now(),
        checksum: 'search-checksum',
        signature_algorithm: 'RSA-4096',
        public_key_id: 'search-key'
      },
      signedMetadata: {} as any,
      registrationInfo: {
        cid: 'QmSearchCID',
        indexId: 'search-idx',
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

    // Add module to search index
    moduleRegistrationPerformanceOptimizer.addModuleToSearchIndex(mockModule);
    
    // Search for the module
    const results = moduleRegistrationPerformanceOptimizer.searchModulesOptimized({
      name: 'SearchTestModule'
    });
    
    expect(results.has('search-test-module')).toBe(true);
    
    // Verify search metrics
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    expect(metrics.searchIndex.totalEntries).toBeGreaterThan(0);
  });

  it('should handle lazy loading with caching', async () => {
    const documentationCid = 'QmTestLazyDoc';
    
    // First load (cache miss)
    const content1 = await moduleRegistrationPerformanceOptimizer.loadModuleDocumentation(documentationCid);
    
    // Second load (cache hit)
    const content2 = await moduleRegistrationPerformanceOptimizer.loadModuleDocumentation(documentationCid);
    
    expect(content1).toBe(content2);
    expect(content1).toBe(`Documentation content for CID: ${documentationCid}`);
    
    // Verify cache metrics
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    expect(metrics.documentationCache.totalHits).toBe(1);
    expect(metrics.documentationCache.totalMisses).toBe(1);
  });

  it('should handle batch processing', async () => {
    const batchId = 'integration-test-batch';
    
    // Add operations to batch
    moduleRegistrationPerformanceOptimizer.addToBatch(batchId, {
      type: 'register',
      moduleId: 'batch-module-1',
      data: {},
      priority: 1
    });
    
    moduleRegistrationPerformanceOptimizer.addToBatch(batchId, {
      type: 'verify',
      moduleId: 'batch-module-2',
      data: {},
      priority: 2
    });
    
    // Process batch
    const results = await moduleRegistrationPerformanceOptimizer.processBatch(batchId);
    
    expect(results.size).toBe(2);
    expect(results.get('batch-module-1')).toEqual({ success: true, moduleId: 'batch-module-1' });
    expect(results.get('batch-module-2')).toEqual({ success: true, moduleId: 'batch-module-2', verified: true });
    
    // Verify batch metrics
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    expect(metrics.batchProcessing.completedBatches).toBe(1);
  });

  it('should handle connection pooling', async () => {
    const serviceName = 'integration-test-service';
    
    // Get connection
    const connection = await moduleRegistrationPerformanceOptimizer.getConnection(serviceName);
    expect(connection).toBeTruthy();
    expect(connection?.service).toBe(serviceName);
    
    // Release connection
    if (connection) {
      moduleRegistrationPerformanceOptimizer.releaseConnection(connection);
    }
    
    // Verify connection metrics
    const metrics = moduleRegistrationPerformanceOptimizer.getPerformanceMetrics();
    expect(metrics.connectionPools.totalConnections).toBeGreaterThan(0);
  });
});