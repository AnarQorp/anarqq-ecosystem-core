/**
 * Tests for ModuleRegistry Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import ModuleRegistry from '../ModuleRegistry';
import {
  RegisteredModule,
  ModuleStatus,
  ModuleSearchCriteria,
  ModuleFilter,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleCompliance
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;
  let mockModule: RegisteredModule;
  let mockSandboxModule: RegisteredModule;

  beforeEach(() => {
    registry = new ModuleRegistry();
    
    // Create mock module data
    const mockCompliance: ModuleCompliance = {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    };

    const mockMetadata: QModuleMetadata = {
      module: 'TestModule',
      version: '1.0.0',
      description: 'A test module for unit testing',
      identities_supported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['qindex', 'qlock'],
      dependencies: ['dependency1', 'dependency2'],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'a'.repeat(64),
      compliance: mockCompliance,
      repository: 'https://github.com/test/module',
      documentation: 'QmTestDocumentationCID',
      activated_by: 'did:test:root123',
      timestamp: Date.now(),
      checksum: 'b'.repeat(64),
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'key123'
    };

    const mockSignedMetadata: SignedModuleMetadata = {
      metadata: mockMetadata,
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:test:root123'
    };

    mockModule = {
      moduleId: 'test-module',
      metadata: mockMetadata,
      signedMetadata: mockSignedMetadata,
      registrationInfo: {
        cid: 'QmTestCID',
        indexId: 'idx123',
        registeredAt: new Date().toISOString(),
        registeredBy: 'did:test:root123',
        status: ModuleStatus.PRODUCTION_READY,
        verificationStatus: 'VERIFIED'
      },
      accessStats: {
        queryCount: 0,
        lastAccessed: new Date().toISOString(),
        dependentModules: []
      }
    };

    // Create sandbox module variant
    mockSandboxModule = {
      ...mockModule,
      moduleId: 'test-sandbox-module',
      metadata: {
        ...mockMetadata,
        module: 'TestSandboxModule',
        status: ModuleStatus.TESTING
      },
      registrationInfo: {
        ...mockModule.registrationInfo,
        status: ModuleStatus.TESTING,
        testMode: true
      }
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Module Registration', () => {
    it('should register a production module successfully', () => {
      const result = registry.registerProductionModule(mockModule);
      
      expect(result).toBe(true);
      
      const retrievedModule = registry.getModule('test-module');
      expect(retrievedModule).toEqual(mockModule);
    });

    it('should register a sandbox module successfully', () => {
      const result = registry.registerSandboxModule(mockSandboxModule);
      
      expect(result).toBe(true);
      
      const retrievedModule = registry.getModule('test-sandbox-module', true);
      expect(retrievedModule).toBeDefined();
      expect(retrievedModule?.registrationInfo.testMode).toBe(true);
    });

    it('should prevent duplicate production module registration', () => {
      registry.registerProductionModule(mockModule);
      
      const result = registry.registerProductionModule(mockModule);
      expect(result).toBe(false);
    });

    it('should not return sandbox modules when includeTestMode is false', () => {
      registry.registerSandboxModule(mockSandboxModule);
      
      const retrievedModule = registry.getModule('test-sandbox-module', false);
      expect(retrievedModule).toBeNull();
    });
  });

  describe('Module Retrieval and Search', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
      registry.registerSandboxModule(mockSandboxModule);
    });

    it('should retrieve a module by ID', () => {
      const module = registry.getModule('test-module');
      expect(module).toEqual(mockModule);
    });

    it('should return null for non-existent module', () => {
      const module = registry.getModule('non-existent');
      expect(module).toBeNull();
    });

    it('should search modules by name', () => {
      const criteria: ModuleSearchCriteria = {
        name: 'TestModule'
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].moduleId).toBe('test-module');
      expect(result.totalCount).toBe(1);
    });

    it('should search modules by status', () => {
      const criteria: ModuleSearchCriteria = {
        status: ModuleStatus.PRODUCTION_READY
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].metadata.status).toBe(ModuleStatus.PRODUCTION_READY);
    });

    it('should search modules by identity type', () => {
      const criteria: ModuleSearchCriteria = {
        identityType: IdentityType.ROOT
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].metadata.identities_supported).toContain(IdentityType.ROOT);
    });

    it('should search modules by integration', () => {
      const criteria: ModuleSearchCriteria = {
        integration: 'qindex'
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].metadata.integrations).toContain('qindex');
    });

    it('should include sandbox modules when requested', () => {
      const criteria: ModuleSearchCriteria = {
        includeTestMode: true
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(2);
    });

    it('should apply pagination to search results', () => {
      const criteria: ModuleSearchCriteria = {
        includeTestMode: true,
        limit: 1,
        offset: 0
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('1');
    });

    it('should list modules with filter', () => {
      const filter: ModuleFilter = {
        status: [ModuleStatus.PRODUCTION_READY]
      };
      
      const modules = registry.listModules(filter);
      
      expect(modules).toHaveLength(1);
      expect(modules[0].metadata.status).toBe(ModuleStatus.PRODUCTION_READY);
    });
  });

  describe('Module Updates and Deregistration', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
    });

    it('should update a module successfully', () => {
      const updatedModule = {
        ...mockModule,
        metadata: {
          ...mockModule.metadata,
          version: '1.1.0'
        }
      };
      
      const result = registry.updateModule('test-module', updatedModule);
      
      expect(result).toBe(true);
      
      const retrievedModule = registry.getModule('test-module');
      expect(retrievedModule?.metadata.version).toBe('1.1.0');
    });

    it('should fail to update non-existent module', () => {
      const result = registry.updateModule('non-existent', mockModule);
      expect(result).toBe(false);
    });

    it('should deregister a module successfully', () => {
      const result = registry.deregisterModule('test-module', 'did:test:admin');
      
      expect(result).toBe(true);
      
      const retrievedModule = registry.getModule('test-module');
      expect(retrievedModule).toBeNull();
    });

    it('should fail to deregister non-existent module', () => {
      const result = registry.deregisterModule('non-existent', 'did:test:admin');
      expect(result).toBe(false);
    });
  });

  describe('Sandbox to Production Promotion', () => {
    beforeEach(() => {
      registry.registerSandboxModule(mockSandboxModule);
    });

    it('should promote sandbox module to production', () => {
      const result = registry.promoteSandboxToProduction('test-sandbox-module', 'did:test:admin');
      
      expect(result).toBe(true);
      
      const productionModule = registry.getModule('test-sandbox-module');
      expect(productionModule).toBeDefined();
      expect(productionModule?.registrationInfo.testMode).toBe(false);
      expect(productionModule?.registrationInfo.promotedFrom).toBe('sandbox');
    });

    it('should fail to promote non-existent sandbox module', () => {
      const result = registry.promoteSandboxToProduction('non-existent', 'did:test:admin');
      expect(result).toBe(false);
    });

    it('should fail to promote when production version exists', () => {
      registry.registerProductionModule(mockModule);
      
      const sandboxWithSameId = {
        ...mockSandboxModule,
        moduleId: 'test-module'
      };
      registry.registerSandboxModule(sandboxWithSameId);
      
      const result = registry.promoteSandboxToProduction('test-module', 'did:test:admin');
      expect(result).toBe(false);
    });
  });

  describe('Dependency Management', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
    });

    it('should get module dependencies', () => {
      const dependencies = registry.getModuleDependencies('test-module');
      expect(dependencies).toEqual(['dependency1', 'dependency2']);
    });

    it('should return empty array for module with no dependencies', () => {
      const moduleWithoutDeps = {
        ...mockModule,
        moduleId: 'no-deps-module',
        metadata: {
          ...mockModule.metadata,
          dependencies: undefined
        }
      };
      
      registry.registerProductionModule(moduleWithoutDeps);
      
      const dependencies = registry.getModuleDependencies('no-deps-module');
      expect(dependencies).toEqual([]);
    });

    it('should check dependency compatibility', () => {
      const result = registry.checkDependencyCompatibility('test-module', ['dependency1']);
      
      expect(result.compatible).toBe(false); // Dependencies don't exist
      expect(result.missingDependencies).toContain('dependency1');
    });

    it('should detect circular dependencies', () => {
      // Create modules with circular dependencies
      const moduleA = {
        ...mockModule,
        moduleId: 'module-a',
        metadata: {
          ...mockModule.metadata,
          dependencies: ['module-b']
        }
      };
      
      const moduleB = {
        ...mockModule,
        moduleId: 'module-b',
        metadata: {
          ...mockModule.metadata,
          dependencies: ['module-c']
        }
      };
      
      registry.registerProductionModule(moduleA);
      registry.registerProductionModule(moduleB);
      
      // This would create a circular dependency: module-c -> module-a -> module-b -> module-c
      const result = registry.checkDependencyCompatibility('module-c', ['module-a']);
      
      // Should detect circular dependency
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].conflictType).toBe('CIRCULAR');
    });
  });

  describe('Signature Verification Caching', () => {
    it('should cache signature verification result', () => {
      const verificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };
      
      registry.cacheSignatureVerification('test-module', verificationResult, '1.0.0');
      
      const cached = registry.getCachedSignatureVerification('test-module', '1.0.0');
      expect(cached).toEqual(verificationResult);
    });

    it('should return null for non-existent cache entry', () => {
      const cached = registry.getCachedSignatureVerification('non-existent', '1.0.0');
      expect(cached).toBeNull();
    });

    it('should return null for version mismatch', () => {
      const verificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };
      
      registry.cacheSignatureVerification('test-module', verificationResult, '1.0.0');
      
      const cached = registry.getCachedSignatureVerification('test-module', '1.1.0');
      expect(cached).toBeNull();
    });

    it('should expire cache entries', () => {
      vi.useFakeTimers();
      
      const verificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };
      
      registry.cacheSignatureVerification('test-module', verificationResult, '1.0.0');
      
      // Fast forward time beyond cache TTL (1 hour)
      vi.advanceTimersByTime(3600001);
      
      const cached = registry.getCachedSignatureVerification('test-module', '1.0.0');
      expect(cached).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('Access Statistics', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
    });

    it('should track access statistics', () => {
      // Access the module to generate stats
      registry.getModule('test-module');
      
      const stats = registry.getAccessStats('test-module');
      
      expect(stats).toBeDefined();
      expect(stats?.moduleId).toBe('test-module');
      expect(stats?.totalQueries).toBeGreaterThan(0);
    });

    it('should return null for non-existent module stats', () => {
      const stats = registry.getAccessStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should get all access statistics', () => {
      registry.getModule('test-module');
      
      const allStats = registry.getAllAccessStats();
      
      expect(allStats.size).toBeGreaterThan(0);
      expect(allStats.has('test-module')).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
    });

    it('should log module registration events', () => {
      const auditLog = registry.getAuditLog('test-module');
      
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].action).toBe('REGISTERED');
      expect(auditLog[0].moduleId).toBe('test-module');
    });

    it('should get all audit log entries', () => {
      const allAuditLog = registry.getAuditLog();
      
      expect(allAuditLog.length).toBeGreaterThan(0);
    });

    it('should limit audit log entries', () => {
      const limitedLog = registry.getAuditLog(undefined, 1);
      
      expect(limitedLog).toHaveLength(1);
    });
  });

  describe('Registry Statistics', () => {
    beforeEach(() => {
      registry.registerProductionModule(mockModule);
      registry.registerSandboxModule(mockSandboxModule);
    });

    it('should provide registry statistics', () => {
      const stats = registry.getRegistryStats();
      
      expect(stats.productionModules).toBe(1);
      expect(stats.sandboxModules).toBe(1);
      expect(stats.totalModules).toBe(2);
      expect(stats.auditLogSize).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle registration errors gracefully', () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Try to register invalid module (this should be handled gracefully)
      const invalidModule = null as any;
      const result = registry.registerProductionModule(invalidModule);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle update errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Register a module first
      registry.registerProductionModule(mockModule);
      
      // Force an error by making updateSearchIndex throw
      const originalUpdateSearchIndex = registry['updateSearchIndex'];
      registry['updateSearchIndex'] = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = registry.updateModule('test-module', mockModule);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore original method
      registry['updateSearchIndex'] = originalUpdateSearchIndex;
      consoleSpy.mockRestore();
    });

    it('should handle deregistration errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Register a module first
      registry.registerProductionModule(mockModule);
      
      // Force an error by making removeFromSearchIndex throw
      const originalRemoveFromSearchIndex = registry['removeFromSearchIndex'];
      registry['removeFromSearchIndex'] = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = registry.deregisterModule('test-module', 'did:test:admin');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore original method
      registry['removeFromSearchIndex'] = originalRemoveFromSearchIndex;
      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Cleanup', () => {
    it('should clean up expired cache entries', () => {
      vi.useFakeTimers();
      
      const verificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };
      
      registry.cacheSignatureVerification('test-module', verificationResult, '1.0.0');
      
      // Verify cache entry exists
      expect(registry.getCachedSignatureVerification('test-module', '1.0.0')).toBeDefined();
      
      // Fast forward time beyond cache TTL (1 hour) and trigger cleanup
      vi.advanceTimersByTime(3600001); // 1 hour + 1ms
      
      // The cleanup should have been triggered by the timer
      // Verify cache entry is cleaned up
      expect(registry.getCachedSignatureVerification('test-module', '1.0.0')).toBeNull();
      
      vi.useRealTimers();
    });

    it('should handle version comparison correctly', () => {
      const moduleV1 = {
        ...mockModule,
        moduleId: 'version-test-1',
        metadata: {
          ...mockModule.metadata,
          version: '1.0.0'
        }
      };
      
      const moduleV2 = {
        ...mockModule,
        moduleId: 'version-test-2',
        metadata: {
          ...mockModule.metadata,
          version: '2.0.0'
        }
      };
      
      registry.registerProductionModule(moduleV1);
      registry.registerProductionModule(moduleV2);
      
      const criteria: ModuleSearchCriteria = {
        minVersion: '1.5.0'
      };
      
      const result = registry.searchModules(criteria);
      
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].metadata.version).toBe('2.0.0');
    });
  });
});