/**
 * Test suite for Qindex Sandbox Module Registration functionality
 * Tests the implementation of task 6: Implement Sandbox Module Registration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import QindexService from '../ecosystem/QindexService.mjs';

describe('Qindex Sandbox Module Registration', () => {
  let qindexService;
  let mockSignedMetadata;

  beforeEach(() => {
    qindexService = new QindexService();
    
    // Mock signed metadata for testing
    mockSignedMetadata = {
      metadata: {
        module: 'TestModule',
        version: '1.0.0',
        description: 'A test module for sandbox registration',
        identities_supported: ['ROOT', 'DAO'],
        integrations: ['qindex', 'qlock'],
        dependencies: [],
        status: 'TESTING',
        audit_hash: 'a'.repeat(64),
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        repository: 'https://github.com/test/testmodule',
        documentation: 'QmTestDocumentationCID123456789012345678901234',
        activated_by: 'did:test:root123',
        timestamp: Date.now(),
        checksum: 'b'.repeat(64),
        signature_algorithm: 'RSA-SHA256',
        public_key_id: 'test_key_123'
      },
      signature: 'mock_signature_' + 'c'.repeat(128),
      publicKey: 'mock_public_key_' + 'd'.repeat(64),
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:test:root123'
    };
  });

  describe('Sandbox Module Registration', () => {
    it('should register a module in sandbox mode with testMode parameter', async () => {
      const moduleId = 'TestModule';
      const options = { testMode: true };

      const result = await qindexService.registerModule(moduleId, mockSignedMetadata, options);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(moduleId);
      expect(result.cid).toBeDefined();
      expect(result.indexId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Verify module is in sandbox registry, not production
      expect(qindexService.isSandboxModule(moduleId)).toBe(true);
      expect(qindexService.isProductionModule(moduleId)).toBe(false);
    });

    it('should register a module using registerSandboxModule method', async () => {
      const moduleId = 'TestSandboxModule';
      
      const result = await qindexService.registerSandboxModule(moduleId, mockSignedMetadata);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(moduleId);
      expect(qindexService.isSandboxModule(moduleId)).toBe(true);
    });

    it('should separate sandbox modules from production modules', async () => {
      const sandboxModuleId = 'SandboxModule';
      const productionModuleId = 'ProductionModule';

      // Register one in sandbox
      await qindexService.registerSandboxModule(sandboxModuleId, {
        ...mockSignedMetadata,
        metadata: { ...mockSignedMetadata.metadata, module: sandboxModuleId }
      });

      // Register one in production
      await qindexService.registerModule(productionModuleId, {
        ...mockSignedMetadata,
        metadata: { ...mockSignedMetadata.metadata, module: productionModuleId }
      }, { testMode: false });

      // Verify separation
      expect(qindexService.isSandboxModule(sandboxModuleId)).toBe(true);
      expect(qindexService.isProductionModule(sandboxModuleId)).toBe(false);
      
      expect(qindexService.isProductionModule(productionModuleId)).toBe(true);
      expect(qindexService.isSandboxModule(productionModuleId)).toBe(false);
    });
  });

  describe('Sandbox Module Listing and Management', () => {
    beforeEach(async () => {
      // Register multiple sandbox modules for testing
      const modules = ['SandboxModule1', 'SandboxModule2', 'SandboxModule3'];
      
      for (const moduleId of modules) {
        await qindexService.registerSandboxModule(moduleId, {
          ...mockSignedMetadata,
          metadata: { ...mockSignedMetadata.metadata, module: moduleId }
        });
      }
    });

    it('should list all sandbox modules', async () => {
      const sandboxModules = await qindexService.listSandboxModules();

      expect(Array.isArray(sandboxModules)).toBe(true);
      expect(sandboxModules.length).toBe(3);
      
      const moduleIds = sandboxModules.map(m => m.moduleId);
      expect(moduleIds).toContain('SandboxModule1');
      expect(moduleIds).toContain('SandboxModule2');
      expect(moduleIds).toContain('SandboxModule3');

      // Verify all are marked as test mode
      sandboxModules.forEach(module => {
        expect(module.registrationInfo.testMode).toBe(true);
      });
    });

    it('should get individual sandbox module by ID', async () => {
      const moduleId = 'SandboxModule1';
      const module = await qindexService.getSandboxModule(moduleId);

      expect(module).toBeDefined();
      expect(module.moduleId).toBe(moduleId);
      expect(module.registrationInfo.testMode).toBe(true);
    });

    it('should remove sandbox module', async () => {
      const moduleId = 'SandboxModule1';
      const actorIdentity = 'did:test:admin123';

      // Verify module exists
      expect(qindexService.isSandboxModule(moduleId)).toBe(true);

      // Remove module
      const result = await qindexService.removeSandboxModule(moduleId, actorIdentity);
      expect(result).toBe(true);

      // Verify module is removed
      expect(qindexService.isSandboxModule(moduleId)).toBe(false);
      const module = await qindexService.getSandboxModule(moduleId);
      expect(module).toBeNull();
    });
  });

  describe('Sandbox to Production Promotion', () => {
    let sandboxModuleId;

    beforeEach(async () => {
      sandboxModuleId = 'PromotionTestModule';
      
      // Register a module in sandbox with production-ready status
      await qindexService.registerSandboxModule(sandboxModuleId, {
        ...mockSignedMetadata,
        metadata: {
          ...mockSignedMetadata.metadata,
          module: sandboxModuleId,
          status: 'PRODUCTION_READY',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: true,
            gdpr_compliant: true,
            data_retention_policy: 'standard'
          }
        }
      });
    });

    it('should promote sandbox module to production', async () => {
      // Verify module is in sandbox
      expect(qindexService.isSandboxModule(sandboxModuleId)).toBe(true);
      expect(qindexService.isProductionModule(sandboxModuleId)).toBe(false);

      // Promote to production
      const result = await qindexService.promoteSandboxToProduction(sandboxModuleId);
      expect(result).toBe(true);

      // Verify module is now in production and removed from sandbox
      expect(qindexService.isProductionModule(sandboxModuleId)).toBe(true);
      expect(qindexService.isSandboxModule(sandboxModuleId)).toBe(false);

      // Verify production module has correct metadata
      const productionModule = await qindexService.getModule(sandboxModuleId);
      expect(productionModule).toBeDefined();
      expect(productionModule.registrationInfo.testMode).toBe(false);
      expect(productionModule.registrationInfo.promotedFrom).toBe('sandbox');
      expect(productionModule.registrationInfo.promotedAt).toBeDefined();
    });

    it('should fail to promote non-existent sandbox module', async () => {
      const nonExistentModuleId = 'NonExistentModule';

      await expect(
        qindexService.promoteSandboxToProduction(nonExistentModuleId)
      ).rejects.toThrow('Sandbox module not found');
    });
  });

  describe('Module Search with Sandbox Support', () => {
    beforeEach(async () => {
      // Register modules in both sandbox and production
      await qindexService.registerSandboxModule('SandboxSearchModule', {
        ...mockSignedMetadata,
        metadata: { ...mockSignedMetadata.metadata, module: 'SandboxSearchModule' }
      });

      await qindexService.registerModule('ProductionSearchModule', {
        ...mockSignedMetadata,
        metadata: { ...mockSignedMetadata.metadata, module: 'ProductionSearchModule' }
      }, { testMode: false });
    });

    it('should search only production modules by default', async () => {
      const searchResult = await qindexService.searchModules({
        includeTestMode: false
      });

      expect(searchResult.modules.length).toBe(1);
      expect(searchResult.modules[0].moduleId).toBe('ProductionSearchModule');
    });

    it('should include sandbox modules when includeTestMode is true', async () => {
      const searchResult = await qindexService.searchModules({
        includeTestMode: true
      });

      expect(searchResult.modules.length).toBe(2);
      const moduleIds = searchResult.modules.map(m => m.moduleId);
      expect(moduleIds).toContain('SandboxSearchModule');
      expect(moduleIds).toContain('ProductionSearchModule');
    });
  });
});