/**
 * ModuleRegistrationService Unit Tests
 * Tests all service methods and utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../../../services/ModuleRegistrationService';
import { QModuleMetadataGenerator } from '../../../services/QModuleMetadataGenerator';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleStatus,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  IdentityType
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../../../types/identity';
import { createMockIdentity, createMockModuleInfo, createMockSignedMetadata } from '../../utils/qwallet-test-utils';

// Mock external services
vi.mock('../../../services/identity/IdentityQlockService');
vi.mock('../../../backend/ecosystem/QindexService.mjs');
vi.mock('../../../backend/ecosystem/QerberosService.mjs');

describe('ModuleRegistrationService', () => {
  let service: ModuleRegistrationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockModuleInfo: ModuleInfo;
  let mockSignedMetadata: SignedModuleMetadata;

  beforeEach(() => {
    service = new ModuleRegistrationService();
    mockRootIdentity = createMockIdentity(IdentityType.ROOT);
    mockDAOIdentity = createMockIdentity(IdentityType.DAO);
    mockModuleInfo = createMockModuleInfo('TestModule', '1.0.0');
    mockSignedMetadata = createMockSignedMetadata(mockModuleInfo, mockRootIdentity);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerModule', () => {
    it('should register a module successfully with ROOT identity', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: false
      };

      const result = await service.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('TestModule');
      expect(result.cid).toBeDefined();
      expect(result.indexId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should register a module in sandbox mode', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true
      };

      const result = await service.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('TestModule');
    });

    it('should reject registration from unauthorized identity', async () => {
      const unauthorizedIdentity = createMockIdentity(IdentityType.AID);
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await expect(service.registerModule(request, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should prevent duplicate module registration', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      // First registration should succeed
      await service.registerModule(request, mockRootIdentity);

      // Second registration should fail
      await expect(service.registerModule(request, mockRootIdentity))
        .rejects.toThrow('Module already registered');
    });

    it('should validate module info before registration', async () => {
      const invalidModuleInfo = {
        ...mockModuleInfo,
        name: '', // Invalid empty name
        version: 'invalid-version' // Invalid version format
      };

      const request: ModuleRegistrationRequest = {
        moduleInfo: invalidModuleInfo
      };

      await expect(service.registerModule(request, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should handle registration errors with retry mechanism', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      // Mock a temporary failure followed by success
      let callCount = 0;
      vi.spyOn(service as any, 'registerInQindex').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary network error');
        }
        return Promise.resolve({
          success: true,
          cid: 'test-cid',
          indexId: 'test-index',
          timestamp: new Date().toISOString()
        });
      });

      const result = await service.registerModule(request, mockRootIdentity);
      expect(result.success).toBe(true);
      expect(callCount).toBe(2); // Should have retried once
    });

    it('should generate proper warnings for incomplete module info', async () => {
      const incompleteModuleInfo = {
        ...mockModuleInfo,
        documentationCid: undefined,
        auditHash: undefined
      };

      const request: ModuleRegistrationRequest = {
        moduleInfo: incompleteModuleInfo
      };

      const result = await service.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('updateModule', () => {
    beforeEach(async () => {
      // Register a module first
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await service.registerModule(request, mockRootIdentity);
    });

    it('should update module successfully', async () => {
      const updates = {
        version: '1.1.0',
        description: 'Updated description'
      };

      const result = await service.updateModule('TestModule', updates, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('TestModule');
    });

    it('should reject updates from unauthorized identity', async () => {
      const unauthorizedIdentity = createMockIdentity(IdentityType.CONSENTIDA);
      const updates = { version: '1.1.0' };

      await expect(service.updateModule('TestModule', updates, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject updates to non-existent module', async () => {
      const updates = { version: '1.1.0' };

      await expect(service.updateModule('NonExistentModule', updates, mockRootIdentity))
        .rejects.toThrow('Module not found');
    });

    it('should validate update data', async () => {
      const invalidUpdates = {
        version: 'invalid-version-format'
      };

      await expect(service.updateModule('TestModule', invalidUpdates, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });
  });

  describe('deregisterModule', () => {
    beforeEach(async () => {
      // Register a module first
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await service.registerModule(request, mockRootIdentity);
    });

    it('should deregister module successfully', async () => {
      const result = await service.deregisterModule('TestModule', mockRootIdentity);

      expect(result).toBe(true);
    });

    it('should reject deregistration from unauthorized identity', async () => {
      const unauthorizedIdentity = createMockIdentity(IdentityType.ENTERPRISE);

      await expect(service.deregisterModule('TestModule', unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should handle deregistration of non-existent module', async () => {
      const result = await service.deregisterModule('NonExistentModule', mockRootIdentity);

      expect(result).toBe(false);
    });

    it('should prevent deregistration of modules with dependencies', async () => {
      // Register a dependent module
      const dependentModuleInfo = createMockModuleInfo('DependentModule', '1.0.0');
      dependentModuleInfo.integrations = ['TestModule'];

      const dependentRequest: ModuleRegistrationRequest = {
        moduleInfo: dependentModuleInfo
      };
      await service.registerModule(dependentRequest, mockRootIdentity);

      await expect(service.deregisterModule('TestModule', mockRootIdentity))
        .rejects.toThrow('Cannot deregister module with dependencies');
    });
  });

  describe('getModule', () => {
    beforeEach(async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await service.registerModule(request, mockRootIdentity);
    });

    it('should retrieve existing module', async () => {
      const module = await service.getModule('TestModule');

      expect(module).toBeDefined();
      expect(module?.moduleId).toBe('TestModule');
      expect(module?.metadata.module).toBe('TestModule');
      expect(module?.metadata.version).toBe('1.0.0');
    });

    it('should return null for non-existent module', async () => {
      const module = await service.getModule('NonExistentModule');

      expect(module).toBeNull();
    });

    it('should handle service errors gracefully', async () => {
      vi.spyOn(service as any, 'qindexService', 'get').mockReturnValue({
        getModule: vi.fn().mockRejectedValue(new Error('Service unavailable'))
      });

      const module = await service.getModule('TestModule');

      expect(module).toBeNull();
    });
  });

  describe('searchModules', () => {
    beforeEach(async () => {
      // Register multiple test modules
      const modules = [
        createMockModuleInfo('ModuleA', '1.0.0'),
        createMockModuleInfo('ModuleB', '2.0.0'),
        createMockModuleInfo('ModuleC', '1.5.0')
      ];

      for (const moduleInfo of modules) {
        const request: ModuleRegistrationRequest = { moduleInfo };
        await service.registerModule(request, mockRootIdentity);
      }
    });

    it('should search modules by name', async () => {
      const result = await service.searchModules({ name: 'ModuleA' });

      expect(result.modules.length).toBe(1);
      expect(result.modules[0].metadata.module).toBe('ModuleA');
      expect(result.totalCount).toBe(1);
    });

    it('should search modules by status', async () => {
      const result = await service.searchModules({ status: ModuleStatus.PRODUCTION_READY });

      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.modules.every(m => m.metadata.status === ModuleStatus.PRODUCTION_READY)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await service.searchModules({ limit: 2, offset: 0 });

      expect(result.modules.length).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.totalCount).toBeGreaterThan(2);
    });

    it('should handle empty search results', async () => {
      const result = await service.searchModules({ name: 'NonExistentModule' });

      expect(result.modules.length).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle search service errors', async () => {
      vi.spyOn(service as any, 'qindexService', 'get').mockReturnValue({
        searchModules: vi.fn().mockRejectedValue(new Error('Search service error'))
      });

      const result = await service.searchModules({ name: 'TestModule' });

      expect(result.modules.length).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('verifyModule', () => {
    beforeEach(async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await service.registerModule(request, mockRootIdentity);
    });

    it('should verify valid module successfully', async () => {
      const result = await service.verifyModule('TestModule');

      expect(result.moduleId).toBe('TestModule');
      expect(result.status).toBe('production_ready');
      expect(result.verificationChecks.metadataValid).toBe(true);
      expect(result.verificationChecks.signatureValid).toBe(true);
      expect(result.lastVerified).toBeDefined();
    });

    it('should detect invalid module', async () => {
      const result = await service.verifyModule('NonExistentModule');

      expect(result.moduleId).toBe('NonExistentModule');
      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.metadataValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should verify module signature', async () => {
      const result = await service.verifyModuleSignature(mockSignedMetadata);

      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.identityVerified).toBe(true);
    });

    it('should detect invalid signatures', async () => {
      const invalidSignedMetadata = {
        ...mockSignedMetadata,
        signature: 'invalid-signature'
      };

      const result = await service.verifyModuleSignature(invalidSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });
  });

  describe('getRegistrationStatus', () => {
    beforeEach(async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };
      await service.registerModule(request, mockRootIdentity);
    });

    it('should get status for registered module', async () => {
      const status = await service.getRegistrationStatus('TestModule');

      expect(status.moduleId).toBe('TestModule');
      expect(status.registered).toBe(true);
      expect(status.status).toBe(ModuleStatus.PRODUCTION_READY);
      expect(status.lastCheck).toBeDefined();
    });

    it('should get status for non-existent module', async () => {
      const status = await service.getRegistrationStatus('NonExistentModule');

      expect(status.moduleId).toBe('NonExistentModule');
      expect(status.registered).toBe(false);
      expect(status.status).toBe(ModuleStatus.DEVELOPMENT);
      expect(status.issues.length).toBeGreaterThan(0);
    });
  });

  describe('sandbox operations', () => {
    it('should register module in sandbox mode', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true
      };

      const result = await service.registerSandboxModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('TestModule');
    });

    it('should list sandbox modules', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true
      };
      await service.registerSandboxModule(request, mockRootIdentity);

      const sandboxModules = await service.listSandboxModules();

      expect(sandboxModules.length).toBe(1);
      expect(sandboxModules[0].moduleId).toBe('TestModule');
    });

    it('should promote sandbox module to production', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true
      };
      await service.registerSandboxModule(request, mockRootIdentity);

      const result = await service.promoteSandboxModule('TestModule', mockRootIdentity);

      expect(result).toBe(true);
    });

    it('should reject promotion of non-existent sandbox module', async () => {
      await expect(service.promoteSandboxModule('NonExistentModule', mockRootIdentity))
        .rejects.toThrow('Sandbox module not found');
    });
  });

  describe('batch operations', () => {
    it('should register multiple modules in batch', async () => {
      const requests: ModuleRegistrationRequest[] = [
        { moduleInfo: createMockModuleInfo('BatchModule1', '1.0.0') },
        { moduleInfo: createMockModuleInfo('BatchModule2', '1.0.0') },
        { moduleInfo: createMockModuleInfo('BatchModule3', '1.0.0') }
      ];

      const results = await service.registerModulesBatch(requests, mockRootIdentity);

      expect(results.size).toBe(3);
      expect(results.get('BatchModule1')?.success).toBe(true);
      expect(results.get('BatchModule2')?.success).toBe(true);
      expect(results.get('BatchModule3')?.success).toBe(true);
    });

    it('should handle partial batch failures', async () => {
      const requests: ModuleRegistrationRequest[] = [
        { moduleInfo: createMockModuleInfo('ValidModule', '1.0.0') },
        { moduleInfo: createMockModuleInfo('', 'invalid') }, // Invalid module
        { moduleInfo: createMockModuleInfo('AnotherValidModule', '1.0.0') }
      ];

      const results = await service.registerModulesBatch(requests, mockRootIdentity);

      expect(results.size).toBe(3);
      expect(results.get('ValidModule')?.success).toBe(true);
      expect(results.get('')?.success).toBe(false);
      expect(results.get('AnotherValidModule')?.success).toBe(true);
    });

    it('should verify multiple modules in batch', async () => {
      // Register test modules first
      const moduleIds = ['Module1', 'Module2', 'Module3'];
      for (const moduleId of moduleIds) {
        const request: ModuleRegistrationRequest = {
          moduleInfo: createMockModuleInfo(moduleId, '1.0.0')
        };
        await service.registerModule(request, mockRootIdentity);
      }

      const results = await service.verifyModulesBatch(moduleIds);

      expect(results.size).toBe(3);
      expect(results.get('Module1')?.status).toBe('production_ready');
      expect(results.get('Module2')?.status).toBe('production_ready');
      expect(results.get('Module3')?.status).toBe('production_ready');
    });
  });

  describe('dependency management', () => {
    it('should resolve module dependencies', async () => {
      const dependencies = ['Qindex', 'Qlock', 'Qerberos'];
      const result = await service.resolveDependencies('TestModule', dependencies);

      expect(result.resolved).toBe(true);
      expect(result.dependencies.length).toBe(3);
      expect(result.missingDependencies.length).toBe(0);
    });

    it('should detect missing dependencies', async () => {
      const dependencies = ['Qindex', 'NonExistentModule', 'Qlock'];
      const result = await service.resolveDependencies('TestModule', dependencies);

      expect(result.resolved).toBe(false);
      expect(result.missingDependencies).toContain('NonExistentModule');
    });

    it('should detect circular dependencies', async () => {
      const dependencies = ['ModuleA', 'ModuleB'];
      const circularDeps = service.detectCircularDependencies('ModuleA', dependencies);

      expect(circularDeps.length).toBeGreaterThan(0);
    });

    it('should create update notifications', async () => {
      const notification = await service.createUpdateNotification(
        'TestModule',
        '1.0.0',
        '1.1.0'
      );

      expect(notification.moduleId).toBe('TestModule');
      expect(notification.oldVersion).toBe('1.0.0');
      expect(notification.newVersion).toBe('1.1.0');
      expect(notification.timestamp).toBeDefined();
    });

    it('should create installation plans', async () => {
      const dependencies = ['Qindex', 'Qlock'];
      const plan = await service.createInstallationPlan('TestModule', dependencies);

      expect(plan.moduleId).toBe('TestModule');
      expect(plan.dependencies.length).toBe(2);
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors with retry', async () => {
      let callCount = 0;
      vi.spyOn(service as any, 'registerInQindex').mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Network timeout');
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

      const result = await service.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should have retried twice
    });

    it('should handle validation errors properly', async () => {
      const invalidRequest: ModuleRegistrationRequest = {
        moduleInfo: {
          ...mockModuleInfo,
          name: '', // Invalid empty name
          version: 'not-semver' // Invalid version
        }
      };

      await expect(service.registerModule(invalidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should handle service unavailability', async () => {
      vi.spyOn(service as any, 'initializeServices').mockRejectedValue(
        new Error('Services unavailable')
      );

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await expect(service.registerModule(request, mockRootIdentity))
        .rejects.toThrow('Services unavailable');
    });

    it('should provide detailed error information', async () => {
      const invalidRequest: ModuleRegistrationRequest = {
        moduleInfo: {
          ...mockModuleInfo,
          identitiesSupported: [] // Invalid empty array
        }
      };

      try {
        await service.registerModule(invalidRequest, mockRootIdentity);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ModuleRegistrationError);
        expect((error as ModuleRegistrationError).code).toBe(ModuleRegistrationErrorCode.INVALID_METADATA);
        expect((error as ModuleRegistrationError).moduleId).toBe('TestModule');
      }
    });
  });

  describe('audit and logging', () => {
    it('should log registration events', async () => {
      const logSpy = vi.spyOn(service as any, 'logRegistrationEvent');

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await service.registerModule(request, mockRootIdentity);

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTERED',
          moduleId: 'TestModule',
          success: true
        })
      );
    });

    it('should log error events', async () => {
      const logSpy = vi.spyOn(service as any, 'logRegistrationEvent');

      const invalidRequest: ModuleRegistrationRequest = {
        moduleInfo: {
          ...mockModuleInfo,
          name: '' // Invalid name
        }
      };

      try {
        await service.registerModule(invalidRequest, mockRootIdentity);
      } catch (error) {
        // Expected to fail
      }

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REGISTRATION_ERROR',
          moduleId: '',
          success: false
        })
      );
    });

    it('should maintain registration history', async () => {
      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo
      };

      await service.registerModule(request, mockRootIdentity);

      const history = await service.getRegistrationHistory('TestModule');

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('REGISTERED');
      expect(history[0].success).toBe(true);
    });
  });
});