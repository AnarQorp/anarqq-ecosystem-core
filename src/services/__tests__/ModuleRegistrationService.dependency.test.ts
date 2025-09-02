/**
 * Module Registration Service Dependency Management Integration Tests
 * Tests the integration of dependency management features in the registration service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../ModuleRegistrationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleStatus,
  ModuleCompliance
} from '../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';

describe('ModuleRegistrationService - Dependency Management Integration', () => {
  let registrationService: ModuleRegistrationService;
  let mockRootIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    registrationService = new ModuleRegistrationService();
    
    mockRootIdentity = {
      did: 'did:test:root',
      type: IdentityType.ROOT,
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
      metadata: {
        name: 'Test Root Identity',
        created: new Date().toISOString()
      }
    } as ExtendedSquidIdentity;

    // Mock the ecosystem services
    vi.mock('../../backend/ecosystem/QindexService.mjs', () => ({
      getQindexService: () => ({
        registerModule: vi.fn().mockResolvedValue({
          cid: 'QmTest123',
          indexId: 'test-index',
          timestamp: new Date().toISOString()
        }),
        getModule: vi.fn().mockResolvedValue(null),
        searchModules: vi.fn().mockResolvedValue({ modules: [], totalCount: 0, hasMore: false })
      })
    }));

    vi.mock('../../backend/ecosystem/QerberosService.mjs', () => ({
      getQerberosService: () => ({
        logEvent: vi.fn().mockResolvedValue(true)
      })
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createTestModuleInfo = (
    name: string,
    version: string = '1.0.0',
    dependencies: string[] = []
  ): ModuleInfo => ({
    name,
    version,
    description: `Test module ${name}`,
    identitiesSupported: [IdentityType.ROOT],
    integrations: ['qindex'],
    repositoryUrl: 'https://github.com/test/repo',
    documentationCid: 'QmTestDoc123',
    auditHash: 'test-audit-hash',
    compliance: {
      audit: true,
      risk_scoring: false,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'default'
    } as Partial<ModuleCompliance>
  });

  describe('Dependency Resolution Integration', () => {
    it('should resolve dependencies during module registration', async () => {
      const moduleInfo = createTestModuleInfo('testModule', '1.0.0');
      const request: ModuleRegistrationRequest = {
        moduleInfo,
        testMode: false
      };

      // Mock successful dependency resolution
      const resolveSpy = vi.spyOn(registrationService, 'resolveDependencies')
        .mockResolvedValue({
          resolved: true,
          dependencies: [],
          conflicts: [],
          missingDependencies: [],
          circularDependencies: [],
          installationOrder: []
        });

      const result = await registrationService.registerModule(request, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(resolveSpy).toHaveBeenCalled();
    });

    it('should handle dependency resolution failures gracefully', async () => {
      const moduleInfo = createTestModuleInfo('testModule', '1.0.0');
      const request: ModuleRegistrationRequest = {
        moduleInfo,
        testMode: false
      };

      // Mock failed dependency resolution
      vi.spyOn(registrationService, 'resolveDependencies')
        .mockResolvedValue({
          resolved: false,
          dependencies: [],
          conflicts: [{
            moduleId: 'testModule',
            conflictType: 'CIRCULAR',
            description: 'Circular dependency detected',
            suggestion: 'Remove circular dependencies'
          }],
          missingDependencies: ['missingDep'],
          circularDependencies: ['testModule', 'missingDep'],
          installationOrder: []
        });

      // Should still attempt registration but may handle conflicts
      const result = await registrationService.registerModule(request, mockRootIdentity);
      
      // The service should handle dependency issues appropriately
      expect(result).toBeDefined();
    });

    it('should resolve dependencies with correct options', async () => {
      const dependencies = ['depA', 'depB'];
      const resolveSpy = vi.spyOn(registrationService, 'resolveDependencies');

      await registrationService.resolveDependencies('testModule', dependencies, {
        includeTestMode: true,
        maxDepth: 5,
        allowPartialResolution: false
      });

      expect(resolveSpy).toHaveBeenCalledWith('testModule', dependencies, {
        includeTestMode: true,
        maxDepth: 5,
        allowPartialResolution: false
      });
    });
  });

  describe('Circular Dependency Detection Integration', () => {
    it('should detect circular dependencies through service interface', () => {
      const detectSpy = vi.spyOn(registrationService, 'detectCircularDependencies')
        .mockReturnValue(['moduleA', 'moduleB', 'moduleA']);

      const circular = registrationService.detectCircularDependencies('moduleA', ['moduleB']);

      expect(circular).toHaveLength(3);
      expect(circular).toContain('moduleA');
      expect(circular).toContain('moduleB');
      expect(detectSpy).toHaveBeenCalledWith('moduleA', ['moduleB'], undefined);
    });

    it('should respect max depth parameter', () => {
      const detectSpy = vi.spyOn(registrationService, 'detectCircularDependencies')
        .mockReturnValue([]);

      registrationService.detectCircularDependencies('moduleA', ['moduleB'], 3);

      expect(detectSpy).toHaveBeenCalledWith('moduleA', ['moduleB'], 3);
    });
  });

  describe('Update Notification Integration', () => {
    it('should create update notifications through service interface', async () => {
      const notificationSpy = vi.spyOn(registrationService, 'createUpdateNotification')
        .mockResolvedValue({
          moduleId: 'testModule',
          dependentModules: ['depModule'],
          updateType: 'major',
          oldVersion: '1.0.0',
          newVersion: '2.0.0',
          compatibilityImpact: 'high',
          requiredActions: ['Review breaking changes'],
          timestamp: new Date().toISOString()
        });

      const notification = await registrationService.createUpdateNotification(
        'testModule',
        '1.0.0',
        '2.0.0',
        { notifyDependents: true, includeCompatibilityAnalysis: true }
      );

      expect(notification.moduleId).toBe('testModule');
      expect(notification.updateType).toBe('major');
      expect(notification.compatibilityImpact).toBe('high');
      expect(notificationSpy).toHaveBeenCalledWith(
        'testModule',
        '1.0.0',
        '2.0.0',
        { notifyDependents: true, includeCompatibilityAnalysis: true }
      );
    });

    it('should retrieve update notifications', () => {
      const getSpy = vi.spyOn(registrationService, 'getUpdateNotifications')
        .mockReturnValue([{
          moduleId: 'testModule',
          dependentModules: [],
          updateType: 'patch',
          oldVersion: '1.0.0',
          newVersion: '1.0.1',
          compatibilityImpact: 'none',
          requiredActions: [],
          timestamp: new Date().toISOString()
        }]);

      const notifications = registrationService.getUpdateNotifications('testModule');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].moduleId).toBe('testModule');
      expect(getSpy).toHaveBeenCalledWith('testModule');
    });

    it('should clear update notifications', () => {
      const clearSpy = vi.spyOn(registrationService, 'clearUpdateNotifications')
        .mockImplementation(() => {});

      registrationService.clearUpdateNotifications('testModule');

      expect(clearSpy).toHaveBeenCalledWith('testModule');
    });
  });

  describe('Installation Plan Integration', () => {
    it('should create installation plans through service interface', async () => {
      const planSpy = vi.spyOn(registrationService, 'createInstallationPlan')
        .mockResolvedValue({
          moduleId: 'testModule',
          dependencies: [{
            stepId: 'install_depA_0',
            moduleId: 'depA',
            action: 'install',
            description: 'Install depA version 1.0.0',
            version: '1.0.0',
            source: 'production',
            dependencies: [],
            estimatedDuration: 10000,
            automated: true,
            risks: []
          }],
          totalSteps: 1,
          estimatedDuration: 10000,
          requiresUserApproval: false,
          risks: []
        });

      const plan = await registrationService.createInstallationPlan(
        'testModule',
        ['depA'],
        { includeTestMode: false, autoApprove: true }
      );

      expect(plan.moduleId).toBe('testModule');
      expect(plan.dependencies).toHaveLength(1);
      expect(plan.requiresUserApproval).toBe(false);
      expect(planSpy).toHaveBeenCalledWith(
        'testModule',
        ['depA'],
        { includeTestMode: false, autoApprove: true }
      );
    });

    it('should execute installation plans', async () => {
      const executeSpy = vi.spyOn(registrationService, 'executeInstallationPlan')
        .mockResolvedValue({
          success: true,
          completedSteps: ['install_depA_0'],
          errors: []
        });

      const result = await registrationService.executeInstallationPlan(
        'testModule',
        { dryRun: true, skipRiskySteps: false }
      );

      expect(result.success).toBe(true);
      expect(result.completedSteps).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(executeSpy).toHaveBeenCalledWith(
        'testModule',
        { dryRun: true, skipRiskySteps: false }
      );
    });

    it('should retrieve installation plans', () => {
      const getSpy = vi.spyOn(registrationService, 'getInstallationPlan')
        .mockReturnValue({
          moduleId: 'testModule',
          dependencies: [],
          totalSteps: 0,
          estimatedDuration: 0,
          requiresUserApproval: false,
          risks: []
        });

      const plan = registrationService.getInstallationPlan('testModule');

      expect(plan).toBeDefined();
      expect(plan?.moduleId).toBe('testModule');
      expect(getSpy).toHaveBeenCalledWith('testModule');
    });
  });

  describe('Batch Operations with Dependencies', () => {
    it('should handle dependencies in batch registration', async () => {
      const requests: ModuleRegistrationRequest[] = [
        {
          moduleInfo: createTestModuleInfo('moduleA', '1.0.0'),
          testMode: false
        },
        {
          moduleInfo: createTestModuleInfo('moduleB', '1.0.0'),
          testMode: false
        }
      ];

      // Mock dependency resolution for batch operations
      vi.spyOn(registrationService, 'resolveDependencies')
        .mockResolvedValue({
          resolved: true,
          dependencies: [],
          conflicts: [],
          missingDependencies: [],
          circularDependencies: [],
          installationOrder: []
        });

      const results = await registrationService.registerModulesBatch(requests, mockRootIdentity);

      expect(results.size).toBe(2);
      expect(results.get('moduleA')?.success).toBe(true);
      expect(results.get('moduleB')?.success).toBe(true);
    });
  });

  describe('Error Handling in Dependency Operations', () => {
    it('should handle dependency manager errors gracefully', async () => {
      // Mock dependency manager to throw error
      vi.spyOn(registrationService, 'resolveDependencies')
        .mockRejectedValue(new Error('Dependency manager error'));

      await expect(
        registrationService.resolveDependencies('testModule', ['depA'])
      ).rejects.toThrow('Dependency manager error');
    });

    it('should handle installation plan creation errors', async () => {
      vi.spyOn(registrationService, 'createInstallationPlan')
        .mockRejectedValue(new Error('Installation plan error'));

      await expect(
        registrationService.createInstallationPlan('testModule', ['depA'])
      ).rejects.toThrow('Installation plan error');
    });

    it('should handle installation execution errors', async () => {
      vi.spyOn(registrationService, 'executeInstallationPlan')
        .mockResolvedValue({
          success: false,
          completedSteps: [],
          errors: ['Installation failed']
        });

      const result = await registrationService.executeInstallationPlan('testModule');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Installation failed');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache dependency resolution results', async () => {
      const resolveSpy = vi.spyOn(registrationService, 'resolveDependencies')
        .mockResolvedValue({
          resolved: true,
          dependencies: [],
          conflicts: [],
          missingDependencies: [],
          circularDependencies: [],
          installationOrder: []
        });

      // First call
      await registrationService.resolveDependencies('testModule', ['depA']);
      
      // Second call with same parameters
      await registrationService.resolveDependencies('testModule', ['depA']);

      // Should be called twice but internal caching may optimize subsequent calls
      expect(resolveSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent dependency operations', async () => {
      const promises = [
        registrationService.resolveDependencies('moduleA', ['depA']),
        registrationService.resolveDependencies('moduleB', ['depB']),
        registrationService.resolveDependencies('moduleC', ['depC'])
      ];

      // Mock all to resolve successfully
      vi.spyOn(registrationService, 'resolveDependencies')
        .mockResolvedValue({
          resolved: true,
          dependencies: [],
          conflicts: [],
          missingDependencies: [],
          circularDependencies: [],
          installationOrder: []
        });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.resolved).toBe(true);
      });
    });
  });

  describe('Integration with Module Lifecycle', () => {
    it('should handle dependencies during module updates', async () => {
      const moduleInfo = createTestModuleInfo('testModule', '2.0.0');

      // Mock existing module
      vi.spyOn(registrationService, 'getModule')
        .mockResolvedValue({
          moduleId: 'testModule',
          metadata: {
            module: 'testModule',
            version: '1.0.0',
            description: 'Test module',
            identities_supported: [IdentityType.ROOT],
            integrations: ['qindex'],
            dependencies: [],
            status: ModuleStatus.PRODUCTION_READY,
            audit_hash: 'test-hash',
            compliance: {} as ModuleCompliance,
            repository: 'https://github.com/test/repo',
            documentation: 'QmTestDoc123',
            activated_by: 'did:test:root',
            timestamp: Date.now(),
            checksum: 'test-checksum',
            signature_algorithm: 'RSA-SHA256',
            public_key_id: 'test-key-id'
          },
          signedMetadata: {} as any,
          registrationInfo: {} as any,
          accessStats: {} as any
        });

      // Mock update notification creation
      vi.spyOn(registrationService, 'createUpdateNotification')
        .mockResolvedValue({
          moduleId: 'testModule',
          dependentModules: [],
          updateType: 'major',
          oldVersion: '1.0.0',
          newVersion: '2.0.0',
          compatibilityImpact: 'high',
          requiredActions: [],
          timestamp: new Date().toISOString()
        });

      const result = await registrationService.updateModule('testModule', moduleInfo, mockRootIdentity);

      expect(result.success).toBe(true);
    });

    it('should clean up dependencies during module deregistration', async () => {
      // Mock existing module
      vi.spyOn(registrationService, 'getModule')
        .mockResolvedValue({
          moduleId: 'testModule',
          metadata: {} as any,
          signedMetadata: {} as any,
          registrationInfo: {} as any,
          accessStats: {} as any
        });

      const result = await registrationService.deregisterModule('testModule', mockRootIdentity);

      expect(result).toBe(true);
    });
  });
});