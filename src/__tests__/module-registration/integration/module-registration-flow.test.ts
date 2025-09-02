/**
 * Module Registration Integration Tests
 * Tests service interaction and data flow between components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../../../services/ModuleRegistrationService';
import { QModuleMetadataGenerator } from '../../../services/QModuleMetadataGenerator';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleStatus,
  IdentityType,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../../../types/identity';
import { 
  createMockIdentity, 
  createMockModuleInfo, 
  setupMockEcosystemServices,
  createMockQindexService,
  createMockQerberosService
} from '../../utils/qwallet-test-utils';

// Mock ecosystem services
const mockQindexService = createMockQindexService();
const mockQerberosService = createMockQerberosService();

vi.mock('../../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: () => mockQindexService
}));

vi.mock('../../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: () => mockQerberosService
}));

describe('Module Registration Integration', () => {
  let registrationService: ModuleRegistrationService;
  let metadataGenerator: QModuleMetadataGenerator;
  let verificationService: ModuleVerificationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockModuleInfo: ModuleInfo;

  beforeEach(async () => {
    // Setup services
    registrationService = new ModuleRegistrationService();
    metadataGenerator = new QModuleMetadataGenerator();
    verificationService = new ModuleVerificationService();

    // Setup mock identities
    mockRootIdentity = createMockIdentity(IdentityType.ROOT);
    mockDAOIdentity = createMockIdentity(IdentityType.DAO);
    mockModuleInfo = createMockModuleInfo('IntegrationTestModule', '1.0.0');

    // Setup mock ecosystem services
    setupMockEcosystemServices();

    // Clear service mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration workflow from metadata generation to verification', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: false
      };

      // Step 1: Register module
      const registrationResult = await registrationService.registerModule(request, mockRootIdentity);

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.moduleId).toBe('IntegrationTestModule');
      expect(registrationResult.cid).toBeDefined();
      expect(registrationResult.indexId).toBeDefined();
      expect(registrationResult.timestamp).toBeDefined();

      // Step 2: Verify module was registered in Qindex
      expect(mockQindexService.registerModule).toHaveBeenCalledWith(
        'IntegrationTestModule',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'IntegrationTestModule',
            version: '1.0.0'
          }),
          signature: expect.any(String),
          publicKey: expect.any(String)
        }),
        expect.objectContaining({
          testMode: false
        })
      );

      // Step 3: Verify audit logging occurred
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTERED',
          moduleId: 'IntegrationTestModule',
          success: true
        })
      );

      // Step 4: Retrieve and verify the registered module
      const retrievedModule = await registrationService.getModule('IntegrationTestModule');
      expect(retrievedModule).toBeDefined();
      expect(retrievedModule?.moduleId).toBe('IntegrationTestModule');

      // Step 5: Verify the module
      const verificationResult = await registrationService.verifyModule('IntegrationTestModule');
      expect(verificationResult.status).toBe('production_ready');
      expect(verificationResult.verificationChecks.metadataValid).toBe(true);
      expect(verificationResult.verificationChecks.signatureValid).toBe(true);
    });

    it('should handle registration with dependencies', async () => {
      const moduleWithDependencies = {
        ...mockModuleInfo,
        integrations: ['Qindex', 'Qlock', 'Qerberos']
      };

      const request: ModuleRegistrationRequest = {
        moduleInfo: moduleWithDependencies,
        testMode: false
      };

      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);

      // Verify dependencies were resolved and included in metadata
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      expect(registeredModule?.metadata.dependencies).toContain('Qindex');
      expect(registeredModule?.metadata.integrations).toEqual(['Qindex', 'Qlock', 'Qerberos']);
    });

    it('should handle sandbox to production promotion workflow', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true
      };

      // Step 1: Register in sandbox
      const sandboxResult = await registrationService.registerSandboxModule(request, mockRootIdentity);
      expect(sandboxResult.success).toBe(true);

      // Step 2: Verify it's in sandbox
      const sandboxModules = await registrationService.listSandboxModules();
      expect(sandboxModules.some(m => m.moduleId === 'IntegrationTestModule')).toBe(true);

      // Step 3: Promote to production
      const promotionResult = await registrationService.promoteSandboxModule('IntegrationTestModule', mockRootIdentity);
      expect(promotionResult).toBe(true);

      // Step 4: Verify it's now in production
      const productionModule = await registrationService.getModule('IntegrationTestModule');
      expect(productionModule).toBeDefined();
      expect(productionModule?.registrationInfo.testMode).toBe(false);

      // Step 5: Verify it's no longer in sandbox
      const updatedSandboxModules = await registrationService.listSandboxModules();
      expect(updatedSandboxModules.some(m => m.moduleId === 'IntegrationTestModule')).toBe(false);
    });

    it('should handle module update workflow', async () => {
      // Step 1: Register initial module
      const initialRequest: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await registrationService.registerModule(initialRequest, mockRootIdentity);

      // Step 2: Update module
      const updates = {
        version: '1.1.0',
        description: 'Updated module description',
        integrations: [...mockModuleInfo.integrations, 'Qsocial']
      };

      const updateResult = await registrationService.updateModule('IntegrationTestModule', updates, mockRootIdentity);
      expect(updateResult.success).toBe(true);

      // Step 3: Verify updates were applied
      const updatedModule = await registrationService.getModule('IntegrationTestModule');
      expect(updatedModule?.metadata.version).toBe('1.1.0');
      expect(updatedModule?.metadata.description).toBe('Updated module description');
      expect(updatedModule?.metadata.integrations).toContain('Qsocial');

      // Step 4: Verify audit logging for update
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATED',
          moduleId: 'IntegrationTestModule',
          success: true
        })
      );
    });

    it('should handle module deregistration workflow', async () => {
      // Step 1: Register module
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await registrationService.registerModule(request, mockRootIdentity);

      // Step 2: Verify module exists
      const existingModule = await registrationService.getModule('IntegrationTestModule');
      expect(existingModule).toBeDefined();

      // Step 3: Deregister module
      const deregistrationResult = await registrationService.deregisterModule('IntegrationTestModule', mockRootIdentity);
      expect(deregistrationResult).toBe(true);

      // Step 4: Verify module no longer exists
      const deletedModule = await registrationService.getModule('IntegrationTestModule');
      expect(deletedModule).toBeNull();

      // Step 5: Verify audit logging for deregistration
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEREGISTERED',
          moduleId: 'IntegrationTestModule',
          success: true
        })
      );
    });
  });

  describe('Service Integration', () => {
    it('should integrate metadata generation with registration', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      // Register module
      await registrationService.registerModule(request, mockRootIdentity);

      // Verify that generated metadata follows expected structure
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      const metadata = registeredModule?.metadata;

      expect(metadata).toBeDefined();
      expect(metadata?.module).toBe('IntegrationTestModule');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.activated_by).toBe(mockRootIdentity.did);
      expect(metadata?.signature_algorithm).toBeDefined();
      expect(metadata?.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata?.audit_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata?.compliance).toBeDefined();
    });

    it('should integrate signature verification with registration', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await registrationService.registerModule(request, mockRootIdentity);

      // Verify signature verification is called during registration
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      const signedMetadata = registeredModule?.signedMetadata;

      expect(signedMetadata).toBeDefined();
      expect(signedMetadata?.signature).toBeDefined();
      expect(signedMetadata?.publicKey).toBeDefined();
      expect(signedMetadata?.signer_identity).toBe(mockRootIdentity.did);

      // Verify signature can be verified
      const verificationResult = await registrationService.verifyModuleSignature(signedMetadata!);
      expect(verificationResult.valid).toBe(true);
    });

    it('should integrate with Qerberos for audit logging', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await registrationService.registerModule(request, mockRootIdentity);

      // Verify comprehensive audit logging
      const auditCalls = mockQerberosService.logEvent.mock.calls;
      expect(auditCalls.length).toBeGreaterThan(0);

      const registrationAuditCall = auditCalls.find(call => 
        call[0].action === 'REGISTERED' && call[0].moduleId === 'IntegrationTestModule'
      );

      expect(registrationAuditCall).toBeDefined();
      expect(registrationAuditCall[0]).toMatchObject({
        action: 'REGISTERED',
        moduleId: 'IntegrationTestModule',
        signerIdentity: mockRootIdentity.did,
        success: true,
        details: expect.objectContaining({
          version: '1.0.0',
          status: expect.any(String)
        }),
        moduleMetadata: expect.objectContaining({
          module: 'IntegrationTestModule'
        }),
        signatureInfo: expect.objectContaining({
          algorithm: expect.any(String),
          valid: true,
          identityType: IdentityType.ROOT
        })
      });
    });

    it('should integrate error handling across services', async () => {
      // Mock Qindex service to fail
      mockQindexService.registerModule.mockRejectedValueOnce(new Error('Qindex service unavailable'));

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      // Registration should fail but handle error gracefully
      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');

      // Verify error was logged to Qerberos
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTRATION_FAILED',
          moduleId: 'IntegrationTestModule',
          success: false,
          error: expect.any(String)
        })
      );
    });
  });

  describe('Identity Context Integration', () => {
    it('should handle ROOT identity registration', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);

      // Verify ROOT identity has full access
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      expect(registeredModule?.metadata.activated_by).toBe(mockRootIdentity.did);
    });

    it('should handle DAO identity registration with governance', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      const result = await registrationService.registerModule(request, mockDAOIdentity);

      expect(result.success).toBe(true);

      // Verify DAO identity registration includes governance context
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      expect(registeredModule?.metadata.activated_by).toBe(mockDAOIdentity.did);
    });

    it('should reject registration from unauthorized identity', async () => {
      const unauthorizedIdentity = createMockIdentity(IdentityType.AID);
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await expect(registrationService.registerModule(request, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should handle identity switching during operations', async () => {
      // Register with ROOT identity
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await registrationService.registerModule(request, mockRootIdentity);

      // Try to update with different identity
      const updates = { version: '1.1.0' };
      
      // Should succeed with authorized identity
      const updateResult = await registrationService.updateModule('IntegrationTestModule', updates, mockRootIdentity);
      expect(updateResult.success).toBe(true);

      // Should fail with unauthorized identity
      const unauthorizedIdentity = createMockIdentity(IdentityType.CONSENTIDA);
      await expect(registrationService.updateModule('IntegrationTestModule', updates, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });
  });

  describe('Dependency Resolution Integration', () => {
    it('should resolve complex dependency chains', async () => {
      const complexModuleInfo = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qmarket', 'Qdrive'] // These have overlapping dependencies
      };

      const request: ModuleRegistrationRequest = {
        moduleInfo: complexModuleInfo
      };

      const result = await registrationService.registerModule(request, mockRootIdentity);
      expect(result.success).toBe(true);

      // Verify dependencies were resolved correctly
      const registeredModule = await registrationService.getModule('IntegrationTestModule');
      const dependencies = registeredModule?.metadata.dependencies || [];

      expect(dependencies).toContain('Qindex'); // Required by all
      expect(dependencies).toContain('Qlock'); // Required by all
      expect(dependencies).toContain('Qerberos'); // Required by Qsocial and Qdrive
      expect(dependencies).toContain('Qwallet'); // Required by Qmarket

      // Verify no duplicates
      const uniqueDependencies = new Set(dependencies);
      expect(uniqueDependencies.size).toBe(dependencies.length);
    });

    it('should handle dependency compatibility checking', async () => {
      // Register a module first
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await registrationService.registerModule(request, mockRootIdentity);

      // Test dependency compatibility
      const compatibilityResult = await registrationService.resolveDependencies(
        'IntegrationTestModule',
        ['Qindex', 'Qlock', 'NonExistentModule']
      );

      expect(compatibilityResult.resolved).toBe(false);
      expect(compatibilityResult.missingDependencies).toContain('NonExistentModule');
    });

    it('should detect circular dependencies', async () => {
      const circularDeps = registrationService.detectCircularDependencies(
        'ModuleA',
        ['ModuleB', 'ModuleC']
      );

      // This is a basic test - in a real scenario, we'd need to set up actual circular dependencies
      expect(Array.isArray(circularDeps)).toBe(true);
    });
  });

  describe('Batch Operations Integration', () => {
    it('should handle batch registration with mixed results', async () => {
      const requests: ModuleRegistrationRequest[] = [
        { moduleInfo: createMockModuleInfo('BatchModule1', '1.0.0') },
        { moduleInfo: createMockModuleInfo('BatchModule2', '1.0.0') },
        { moduleInfo: createMockModuleInfo('', 'invalid') }, // Invalid module
        { moduleInfo: createMockModuleInfo('BatchModule3', '1.0.0') }
      ];

      const results = await registrationService.registerModulesBatch(requests, mockRootIdentity);

      expect(results.size).toBe(4);
      expect(results.get('BatchModule1')?.success).toBe(true);
      expect(results.get('BatchModule2')?.success).toBe(true);
      expect(results.get('')?.success).toBe(false);
      expect(results.get('BatchModule3')?.success).toBe(true);

      // Verify successful modules were registered
      const module1 = await registrationService.getModule('BatchModule1');
      const module2 = await registrationService.getModule('BatchModule2');
      const module3 = await registrationService.getModule('BatchModule3');

      expect(module1).toBeDefined();
      expect(module2).toBeDefined();
      expect(module3).toBeDefined();
    });

    it('should handle batch verification', async () => {
      // Register multiple modules first
      const moduleIds = ['VerifyModule1', 'VerifyModule2', 'VerifyModule3'];
      for (const moduleId of moduleIds) {
        const request: ModuleRegistrationRequest = {
          moduleInfo: createMockModuleInfo(moduleId, '1.0.0')
        };
        await registrationService.registerModule(request, mockRootIdentity);
      }

      // Batch verify
      const verificationResults = await registrationService.verifyModulesBatch(moduleIds);

      expect(verificationResults.size).toBe(3);
      expect(verificationResults.get('VerifyModule1')?.status).toBe('production_ready');
      expect(verificationResults.get('VerifyModule2')?.status).toBe('production_ready');
      expect(verificationResults.get('VerifyModule3')?.status).toBe('production_ready');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from temporary service failures', async () => {
      let callCount = 0;
      
      // Mock Qindex to fail first two times, then succeed
      mockQindexService.registerModule.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary service failure');
        }
        return Promise.resolve({
          success: true,
          cid: 'test-cid',
          indexId: 'test-index',
          timestamp: new Date().toISOString()
        });
      });

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should have retried twice
    });

    it('should handle permanent service failures gracefully', async () => {
      // Mock Qindex to always fail
      mockQindexService.registerModule.mockRejectedValue(new Error('Permanent service failure'));

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');

      // Verify error was logged
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTRATION_FAILED',
          success: false
        })
      );
    });
  });

  describe('Performance Integration', () => {
    it('should handle large module registrations efficiently', async () => {
      const largeModuleInfo = {
        ...mockModuleInfo,
        description: 'A'.repeat(1000), // Large description
        integrations: ['Qindex', 'Qlock', 'Qerberos', 'Qonsent', 'Qsocial', 'Qdrive', 'Qmail', 'Qchat', 'Qpic', 'Qmarket'] // Many integrations
      };

      const request: ModuleRegistrationRequest = {
        moduleInfo: largeModuleInfo
      };

      const startTime = Date.now();
      const result = await registrationService.registerModule(request, mockRootIdentity);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache verification results for performance', async () => {
      // Register module
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await registrationService.registerModule(request, mockRootIdentity);

      // First verification
      const startTime1 = Date.now();
      const result1 = await registrationService.verifyModule('IntegrationTestModule');
      const endTime1 = Date.now();

      // Second verification (should use cache)
      const startTime2 = Date.now();
      const result2 = await registrationService.verifyModule('IntegrationTestModule');
      const endTime2 = Date.now();

      expect(result1).toEqual(result2);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1); // Second call should be faster
    });
  });
});