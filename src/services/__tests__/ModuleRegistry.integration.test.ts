/**
 * Integration tests for ModuleRegistry Service
 * Demonstrates real-world usage scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ModuleRegistry from '../ModuleRegistry';
import {
  RegisteredModule,
  ModuleStatus,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleCompliance
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleRegistry Integration Tests', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  it('should handle complete module lifecycle', () => {
    // 1. Create a module in sandbox mode
    const sandboxModule = createTestModule('qwallet-test', '1.0.0', ModuleStatus.TESTING);
    sandboxModule.registrationInfo.testMode = true;
    
    expect(registry.registerSandboxModule(sandboxModule)).toBe(true);
    
    // 2. Verify it's only accessible with testMode flag
    expect(registry.getModule('qwallet-test', false)).toBeNull();
    expect(registry.getModule('qwallet-test', true)).toBeDefined();
    
    // 3. Update the module status to production ready
    const updatedModule = {
      ...sandboxModule,
      metadata: {
        ...sandboxModule.metadata,
        status: ModuleStatus.PRODUCTION_READY
      }
    };
    
    expect(registry.updateModule('qwallet-test', updatedModule)).toBe(true);
    
    // 4. Promote to production
    expect(registry.promoteSandboxToProduction('qwallet-test', 'did:test:admin')).toBe(true);
    
    // 5. Verify it's now in production
    const productionModule = registry.getModule('qwallet-test', false);
    expect(productionModule).toBeDefined();
    expect(productionModule?.registrationInfo.testMode).toBe(false);
    expect(productionModule?.registrationInfo.promotedFrom).toBe('sandbox');
    
    // 6. Check access statistics
    const stats = registry.getAccessStats('qwallet-test');
    expect(stats?.totalQueries).toBeGreaterThan(0);
    
    // 7. Verify audit log
    const auditLog = registry.getAuditLog('qwallet-test');
    expect(auditLog.length).toBeGreaterThan(0);
    expect(auditLog.some(event => event.action === 'REGISTERED')).toBe(true);
    expect(auditLog.some(event => event.action === 'UPDATED')).toBe(true);
  });

  it('should handle module dependencies correctly', () => {
    // Create base modules
    const qindexModule = createTestModule('qindex', '2.0.0', ModuleStatus.PRODUCTION_READY);
    qindexModule.metadata.dependencies = [];
    
    const qlockModule = createTestModule('qlock', '1.5.0', ModuleStatus.PRODUCTION_READY);
    qlockModule.metadata.dependencies = [];
    
    const qwalletModule = createTestModule('qwallet', '1.0.0', ModuleStatus.PRODUCTION_READY);
    qwalletModule.metadata.dependencies = ['qindex', 'qlock'];
    
    // Register dependencies first
    expect(registry.registerProductionModule(qindexModule)).toBe(true);
    expect(registry.registerProductionModule(qlockModule)).toBe(true);
    expect(registry.registerProductionModule(qwalletModule)).toBe(true);
    
    // Check dependencies
    const dependencies = registry.getModuleDependencies('qwallet');
    expect(dependencies).toEqual(['qindex', 'qlock']);
    
    // Check dependents
    const qindexDependents = registry.getModuleDependents('qindex');
    expect(qindexDependents).toContain('qwallet');
    
    // Check compatibility
    const compatibility = registry.checkDependencyCompatibility('qwallet', ['qindex', 'qlock']);
    expect(compatibility.compatible).toBe(true);
    expect(compatibility.missingDependencies).toHaveLength(0);
  });

  it('should handle signature verification caching', () => {
    const module = createTestModule('cached-module', '1.0.0', ModuleStatus.PRODUCTION_READY);
    registry.registerProductionModule(module);
    
    const verificationResult = {
      valid: true,
      signatureValid: true,
      identityVerified: true,
      timestampValid: true
    };
    
    // Cache the result
    registry.cacheSignatureVerification('cached-module', verificationResult, '1.0.0');
    
    // Retrieve from cache
    const cached = registry.getCachedSignatureVerification('cached-module', '1.0.0');
    expect(cached).toEqual(verificationResult);
    
    // Update module version and verify cache behavior
    const updatedModule = {
      ...module,
      metadata: {
        ...module.metadata,
        version: '1.1.0'
      }
    };
    
    registry.updateModule('cached-module', updatedModule);
    
    // Cache should be invalidated when module is updated
    expect(registry.getCachedSignatureVerification('cached-module', '1.0.0')).toBeNull();
    
    // New version should not have cache
    expect(registry.getCachedSignatureVerification('cached-module', '1.1.0')).toBeNull();
    
    // Cache new version
    registry.cacheSignatureVerification('cached-module', verificationResult, '1.1.0');
    expect(registry.getCachedSignatureVerification('cached-module', '1.1.0')).toEqual(verificationResult);
  });

  it('should provide comprehensive search functionality', () => {
    // Create diverse modules
    const modules = [
      createTestModule('qwallet', '1.0.0', ModuleStatus.PRODUCTION_READY, [IdentityType.ROOT, IdentityType.DAO], ['qindex', 'qlock']),
      createTestModule('qsocial', '2.1.0', ModuleStatus.PRODUCTION_READY, [IdentityType.ENTERPRISE], ['qindex']),
      createTestModule('qmarket', '1.5.0', ModuleStatus.TESTING, [IdentityType.DAO], ['qindex', 'qwallet']),
      createTestModule('qdrive', '0.9.0', ModuleStatus.DEVELOPMENT, [IdentityType.ROOT], ['qindex'])
    ];
    
    modules.forEach(module => {
      if (module.metadata.status === ModuleStatus.PRODUCTION_READY) {
        registry.registerProductionModule(module);
      } else {
        registry.registerSandboxModule(module);
      }
    });
    
    // Search by status
    const productionModules = registry.searchModules({ status: ModuleStatus.PRODUCTION_READY });
    expect(productionModules.modules).toHaveLength(2);
    
    // Search by identity type
    const rootModules = registry.searchModules({ identityType: IdentityType.ROOT });
    expect(rootModules.modules).toHaveLength(1);
    expect(rootModules.modules[0].moduleId).toBe('qwallet');
    
    // Search by integration
    const qlockIntegrations = registry.searchModules({ integration: 'qlock' });
    expect(qlockIntegrations.modules).toHaveLength(1);
    expect(qlockIntegrations.modules[0].moduleId).toBe('qwallet');
    
    // Search with test mode
    const allModules = registry.searchModules({ includeTestMode: true });
    expect(allModules.modules).toHaveLength(4);
    
    // Search with pagination
    const paginatedResults = registry.searchModules({ 
      includeTestMode: true, 
      limit: 2, 
      offset: 0 
    });
    expect(paginatedResults.modules).toHaveLength(2);
    expect(paginatedResults.hasMore).toBe(true);
    expect(paginatedResults.nextCursor).toBe('2');
  });

  it('should track access statistics accurately', () => {
    const module = createTestModule('stats-module', '1.0.0', ModuleStatus.PRODUCTION_READY);
    registry.registerProductionModule(module);
    
    // Access the module multiple times
    for (let i = 0; i < 5; i++) {
      registry.getModule('stats-module');
    }
    
    // Search for the module (also counts as access)
    registry.searchModules({ name: 'stats-module' });
    
    const stats = registry.getAccessStats('stats-module');
    expect(stats).toBeDefined();
    expect(stats!.totalQueries).toBeGreaterThan(5);
    expect(stats!.moduleId).toBe('stats-module');
  });

  it('should maintain audit trail correctly', () => {
    const module = createTestModule('audit-module', '1.0.0', ModuleStatus.TESTING);
    
    // Register in sandbox
    registry.registerSandboxModule(module);
    
    // Update module
    const updatedModule = {
      ...module,
      metadata: {
        ...module.metadata,
        status: ModuleStatus.PRODUCTION_READY
      }
    };
    registry.updateModule('audit-module', updatedModule);
    
    // Promote to production
    registry.promoteSandboxToProduction('audit-module', 'did:test:admin');
    
    // Deregister
    registry.deregisterModule('audit-module', 'did:test:admin');
    
    // Check audit log
    const auditLog = registry.getAuditLog('audit-module');
    
    const actions = auditLog.map(event => event.action);
    expect(actions).toContain('REGISTERED');
    expect(actions).toContain('UPDATED');
    expect(actions).toContain('DEREGISTERED');
    
    // Verify chronological order (newest first)
    expect(auditLog[0].action).toBe('DEREGISTERED');
    expect(auditLog[auditLog.length - 1].action).toBe('REGISTERED');
  });

  it('should provide accurate registry statistics', () => {
    // Create and register various modules
    const productionModule1 = createTestModule('prod1', '1.0.0', ModuleStatus.PRODUCTION_READY);
    const productionModule2 = createTestModule('prod2', '1.0.0', ModuleStatus.PRODUCTION_READY);
    const sandboxModule1 = createTestModule('sandbox1', '1.0.0', ModuleStatus.TESTING);
    const sandboxModule2 = createTestModule('sandbox2', '1.0.0', ModuleStatus.DEVELOPMENT);
    
    registry.registerProductionModule(productionModule1);
    registry.registerProductionModule(productionModule2);
    registry.registerSandboxModule(sandboxModule1);
    registry.registerSandboxModule(sandboxModule2);
    
    // Access some modules to generate statistics
    registry.getModule('prod1');
    registry.getModule('sandbox1', true);
    
    // Cache some verification results
    registry.cacheSignatureVerification('prod1', { valid: true, signatureValid: true, identityVerified: true, timestampValid: true }, '1.0.0');
    
    const stats = registry.getRegistryStats();
    
    expect(stats.productionModules).toBe(2);
    expect(stats.sandboxModules).toBe(2);
    expect(stats.totalModules).toBe(4);
    expect(stats.totalAccesses).toBeGreaterThan(0);
    expect(stats.auditLogSize).toBeGreaterThan(0);
  });

  // Helper function to create test modules
  function createTestModule(
    name: string, 
    version: string, 
    status: ModuleStatus,
    identityTypes: IdentityType[] = [IdentityType.ROOT],
    integrations: string[] = ['qindex']
  ): RegisteredModule {
    const compliance: ModuleCompliance = {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    };

    const metadata: QModuleMetadata = {
      module: name,
      version,
      description: `Test module ${name}`,
      identities_supported: identityTypes,
      integrations,
      dependencies: [],
      status,
      audit_hash: 'a'.repeat(64),
      compliance,
      repository: `https://github.com/test/${name}`,
      documentation: `QmTest${name}DocumentationCID`,
      activated_by: 'did:test:root123',
      timestamp: Date.now(),
      checksum: 'b'.repeat(64),
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'key123'
    };

    const signedMetadata: SignedModuleMetadata = {
      metadata,
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:test:root123'
    };

    return {
      moduleId: name,
      metadata,
      signedMetadata,
      registrationInfo: {
        cid: `QmTest${name}CID`,
        indexId: `idx${name}`,
        registeredAt: new Date().toISOString(),
        registeredBy: 'did:test:root123',
        status,
        verificationStatus: 'VERIFIED'
      },
      accessStats: {
        queryCount: 0,
        lastAccessed: new Date().toISOString(),
        dependentModules: []
      }
    };
  }
});