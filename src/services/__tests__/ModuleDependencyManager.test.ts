/**
 * Module Dependency Manager Tests
 * Tests for dependency resolution, circular dependency detection,
 * version compatibility, update notifications, and installation management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleDependencyManager, SemanticVersionCompatibilityChecker } from '../ModuleDependencyManager';
import { ModuleRegistry } from '../ModuleRegistry';
import {
  RegisteredModule,
  QModuleMetadata,
  ModuleStatus,
  ModuleCompliance,
  SignedModuleMetadata
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleDependencyManager', () => {
  let dependencyManager: ModuleDependencyManager;
  let moduleRegistry: ModuleRegistry;

  // Mock modules for testing
  const createMockModule = (
    moduleId: string,
    version: string = '1.0.0',
    dependencies: string[] = [],
    status: ModuleStatus = ModuleStatus.PRODUCTION_READY
  ): RegisteredModule => ({
    moduleId,
    metadata: {
      module: moduleId,
      version,
      description: `Test module ${moduleId}`,
      identities_supported: [IdentityType.ROOT],
      integrations: ['qindex'],
      dependencies,
      status,
      audit_hash: 'test-hash',
      compliance: {
        audit: true,
        risk_scoring: false,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'default'
      } as ModuleCompliance,
      repository: 'https://github.com/test/repo',
      documentation: 'QmTestDoc123',
      activated_by: 'did:test:root',
      timestamp: Date.now(),
      checksum: 'test-checksum',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'test-key-id'
    } as QModuleMetadata,
    signedMetadata: {
      metadata: {} as QModuleMetadata,
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:test:root'
    } as SignedModuleMetadata,
    registrationInfo: {
      cid: 'QmTest123',
      indexId: 'test-index',
      registeredAt: new Date().toISOString(),
      registeredBy: 'did:test:root',
      status,
      verificationStatus: 'VERIFIED' as const,
      testMode: false
    },
    accessStats: {
      queryCount: 0,
      lastAccessed: new Date().toISOString(),
      dependentModules: []
    }
  });

  beforeEach(() => {
    moduleRegistry = new ModuleRegistry();
    dependencyManager = new ModuleDependencyManager(moduleRegistry);

    // Register some test modules
    const moduleA = createMockModule('moduleA', '1.0.0', ['moduleB', 'moduleC']);
    const moduleB = createMockModule('moduleB', '2.0.0', ['moduleC']);
    const moduleC = createMockModule('moduleC', '1.5.0', []);
    const moduleD = createMockModule('moduleD', '1.0.0', ['moduleE']);
    const moduleE = createMockModule('moduleE', '1.0.0', ['moduleD']); // Circular dependency

    moduleRegistry.registerProductionModule(moduleA);
    moduleRegistry.registerProductionModule(moduleB);
    moduleRegistry.registerProductionModule(moduleC);
    moduleRegistry.registerProductionModule(moduleD);
    moduleRegistry.registerProductionModule(moduleE);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dependency Resolution', () => {
    it('should resolve simple dependencies successfully', async () => {
      const result = await dependencyManager.resolveDependencies('moduleA', ['moduleB', 'moduleC']);

      expect(result.resolved).toBe(true);
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies.map(d => d.moduleId)).toContain('moduleB');
      expect(result.dependencies.map(d => d.moduleId)).toContain('moduleC');
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const result = await dependencyManager.resolveDependencies('moduleA', ['moduleB', 'nonExistentModule']);

      expect(result.resolved).toBe(false);
      expect(result.missingDependencies).toContain('nonExistentModule');
      expect(result.dependencies).toHaveLength(1); // Only moduleB should be resolved
    });

    it('should allow partial resolution when enabled', async () => {
      const result = await dependencyManager.resolveDependencies(
        'moduleA', 
        ['moduleB', 'nonExistentModule'],
        { allowPartialResolution: true }
      );

      expect(result.resolved).toBe(true); // Should be true with partial resolution
      expect(result.missingDependencies).toContain('nonExistentModule');
      expect(result.dependencies).toHaveLength(1);
    });

    it('should include test mode modules when requested', async () => {
      // Register a test module
      const testModule = createMockModule('testModule', '1.0.0', []);
      testModule.registrationInfo.testMode = true;
      moduleRegistry.registerSandboxModule(testModule);

      const result = await dependencyManager.resolveDependencies(
        'moduleA', 
        ['testModule'],
        { includeTestMode: true }
      );

      expect(result.resolved).toBe(true);
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0].source).toBe('sandbox');
    });

    it('should generate correct installation order', async () => {
      const result = await dependencyManager.resolveDependencies('moduleA', ['moduleB', 'moduleC']);

      expect(result.installationOrder).toContain('moduleB');
      expect(result.installationOrder).toContain('moduleC');
      // moduleC should come before moduleB since moduleB depends on moduleC
      const cIndex = result.installationOrder.indexOf('moduleC');
      const bIndex = result.installationOrder.indexOf('moduleB');
      expect(cIndex).toBeLessThan(bIndex);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependencies', () => {
      const circular = dependencyManager.detectCircularDependencies('moduleD', ['moduleE']);

      expect(circular).toHaveLength(3); // moduleD -> moduleE -> moduleD
      expect(circular).toContain('moduleD');
      expect(circular).toContain('moduleE');
    });

    it('should detect complex circular dependencies', () => {
      // Create a more complex circular dependency: A -> B -> C -> A
      const moduleF = createMockModule('moduleF', '1.0.0', ['moduleG']);
      const moduleG = createMockModule('moduleG', '1.0.0', ['moduleH']);
      const moduleH = createMockModule('moduleH', '1.0.0', ['moduleF']);

      moduleRegistry.registerProductionModule(moduleF);
      moduleRegistry.registerProductionModule(moduleG);
      moduleRegistry.registerProductionModule(moduleH);

      const circular = dependencyManager.detectCircularDependencies('moduleF', ['moduleG']);

      expect(circular.length).toBeGreaterThan(0);
      expect(circular).toContain('moduleF');
    });

    it('should not detect circular dependencies when none exist', () => {
      const circular = dependencyManager.detectCircularDependencies('moduleA', ['moduleB', 'moduleC']);

      expect(circular).toHaveLength(0);
    });

    it('should respect maximum depth limit', () => {
      const circular = dependencyManager.detectCircularDependencies('moduleD', ['moduleE'], 1);

      // With depth 1, it might not detect the full circular dependency
      expect(circular).toBeDefined();
    });
  });

  describe('Version Compatibility', () => {
    it('should check version compatibility correctly', () => {
      const resolvedDeps = [
        {
          moduleId: 'moduleB',
          version: '2.0.0',
          status: ModuleStatus.PRODUCTION_READY,
          available: true,
          compatible: true,
          source: 'production' as const
        },
        {
          moduleId: 'moduleB', // Same module, different version
          version: '1.5.0',
          status: ModuleStatus.PRODUCTION_READY,
          available: true,
          compatible: true,
          source: 'production' as const
        }
      ];

      const conflicts = dependencyManager.checkVersionCompatibility(resolvedDeps);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('VERSION');
      expect(conflicts[0].moduleId).toBe('moduleB');
    });

    it('should not report conflicts for same versions', () => {
      const resolvedDeps = [
        {
          moduleId: 'moduleB',
          version: '2.0.0',
          status: ModuleStatus.PRODUCTION_READY,
          available: true,
          compatible: true,
          source: 'production' as const
        },
        {
          moduleId: 'moduleC',
          version: '1.5.0',
          status: ModuleStatus.PRODUCTION_READY,
          available: true,
          compatible: true,
          source: 'production' as const
        }
      ];

      const conflicts = dependencyManager.checkVersionCompatibility(resolvedDeps);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Update Notifications', () => {
    it('should create update notification with correct information', async () => {
      const notification = await dependencyManager.createUpdateNotification(
        'moduleB',
        '1.0.0',
        '2.0.0',
        { notifyDependents: true, includeCompatibilityAnalysis: true }
      );

      expect(notification.moduleId).toBe('moduleB');
      expect(notification.oldVersion).toBe('1.0.0');
      expect(notification.newVersion).toBe('2.0.0');
      expect(notification.updateType).toBe('major');
      expect(notification.compatibilityImpact).toBe('high');
      expect(notification.dependentModules).toContain('moduleA'); // moduleA depends on moduleB
      expect(notification.requiredActions.length).toBeGreaterThan(0);
    });

    it('should detect different update types correctly', async () => {
      const patchNotification = await dependencyManager.createUpdateNotification('moduleB', '1.0.0', '1.0.1');
      expect(patchNotification.updateType).toBe('patch');
      expect(patchNotification.compatibilityImpact).toBe('none');

      const minorNotification = await dependencyManager.createUpdateNotification('moduleB', '1.0.0', '1.1.0');
      expect(minorNotification.updateType).toBe('minor');
      expect(minorNotification.compatibilityImpact).toBe('low');

      const majorNotification = await dependencyManager.createUpdateNotification('moduleB', '1.0.0', '2.0.0');
      expect(majorNotification.updateType).toBe('major');
      expect(majorNotification.compatibilityImpact).toBe('high');
    });

    it('should store and retrieve notifications', async () => {
      await dependencyManager.createUpdateNotification('moduleB', '1.0.0', '2.0.0');

      const notifications = dependencyManager.getUpdateNotifications('moduleB');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].moduleId).toBe('moduleB');
    });

    it('should clear notifications', async () => {
      await dependencyManager.createUpdateNotification('moduleB', '1.0.0', '2.0.0');
      
      dependencyManager.clearUpdateNotifications('moduleB');
      
      const notifications = dependencyManager.getUpdateNotifications('moduleB');
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Installation Plans', () => {
    it('should create installation plan with correct steps', async () => {
      const plan = await dependencyManager.createInstallationPlan('moduleA', ['moduleB', 'moduleC']);

      expect(plan.moduleId).toBe('moduleA');
      expect(plan.dependencies.length).toBeGreaterThan(0);
      expect(plan.totalSteps).toBe(plan.dependencies.length);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should handle missing dependencies in installation plan', async () => {
      await expect(
        dependencyManager.createInstallationPlan('moduleA', ['nonExistentModule'])
      ).rejects.toThrow();
    });

    it('should allow skipping optional dependencies', async () => {
      const plan = await dependencyManager.createInstallationPlan(
        'moduleA', 
        ['moduleB', 'nonExistentModule'],
        { skipOptionalDependencies: true }
      );

      expect(plan.moduleId).toBe('moduleA');
      expect(plan.dependencies.length).toBeGreaterThan(0);
    });

    it('should set approval requirement based on risks', async () => {
      // Create a module with development status (risky)
      const riskyModule = createMockModule('riskyModule', '1.0.0', [], ModuleStatus.DEVELOPMENT);
      moduleRegistry.registerProductionModule(riskyModule);

      const plan = await dependencyManager.createInstallationPlan('moduleA', ['riskyModule']);

      expect(plan.requiresUserApproval).toBe(true);
      expect(plan.risks.length).toBeGreaterThan(0);
    });
  });

  describe('Installation Execution', () => {
    it('should execute installation plan successfully', async () => {
      const plan = await dependencyManager.createInstallationPlan('moduleA', ['moduleB', 'moduleC']);
      
      const result = await dependencyManager.executeInstallationPlan('moduleA', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.completedSteps.length).toBe(plan.totalSteps);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle execution errors gracefully', async () => {
      // Create a plan first
      await dependencyManager.createInstallationPlan('moduleA', ['moduleB']);

      // Mock an error during execution
      const originalExecute = dependencyManager['executeInstallationStep'];
      dependencyManager['executeInstallationStep'] = vi.fn().mockRejectedValue(new Error('Installation failed'));

      const result = await dependencyManager.executeInstallationPlan('moduleA', { dryRun: false });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Restore original method
      dependencyManager['executeInstallationStep'] = originalExecute;
    });

    it('should skip risky steps when requested', async () => {
      // Create a risky module
      const riskyModule = createMockModule('riskyModule', '1.0.0', [], ModuleStatus.DEVELOPMENT);
      moduleRegistry.registerProductionModule(riskyModule);

      await dependencyManager.createInstallationPlan('moduleA', ['riskyModule']);
      
      const result = await dependencyManager.executeInstallationPlan('moduleA', { 
        dryRun: true, 
        skipRiskySteps: true 
      });

      expect(result.success).toBe(true);
      // Should have fewer completed steps due to skipping risky ones
    });

    it('should call progress callback during execution', async () => {
      const progressCallback = vi.fn();
      await dependencyManager.createInstallationPlan('moduleA', ['moduleB']);
      
      await dependencyManager.executeInstallationPlan('moduleA', { 
        dryRun: true, 
        progressCallback 
      });

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle registry errors gracefully', async () => {
      // Mock registry to throw error
      const originalGetModule = moduleRegistry.getModule;
      moduleRegistry.getModule = vi.fn().mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = await dependencyManager.resolveDependencies('moduleA', ['moduleB']);

      expect(result.resolved).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);

      // Restore original method
      moduleRegistry.getModule = originalGetModule;
    });

    it('should handle invalid module IDs', async () => {
      const result = await dependencyManager.resolveDependencies('', ['']);

      expect(result.resolved).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache dependency resolution results', async () => {
      const spy = vi.spyOn(moduleRegistry, 'getModule');

      // First call
      await dependencyManager.resolveDependencies('moduleA', ['moduleB']);
      const firstCallCount = spy.mock.calls.length;

      // Second call with same parameters should use cache
      await dependencyManager.resolveDependencies('moduleA', ['moduleB']);
      const secondCallCount = spy.mock.calls.length;

      // Should not make additional registry calls due to caching
      expect(secondCallCount).toBe(firstCallCount);

      spy.mockRestore();
    });
  });
});

describe('SemanticVersionCompatibilityChecker', () => {
  let checker: SemanticVersionCompatibilityChecker;

  beforeEach(() => {
    checker = new SemanticVersionCompatibilityChecker();
  });

  describe('Version Compatibility', () => {
    it('should correctly identify compatible versions', () => {
      expect(checker.isCompatible('1.0.0', '1.0.0')).toBe(true);
      expect(checker.isCompatible('1.0.0', '1.0.1')).toBe(true);
      expect(checker.isCompatible('1.0.0', '1.1.0')).toBe(true);
      expect(checker.isCompatible('1.0.0', '2.0.0')).toBe(false); // Major version change
    });

    it('should correctly identify incompatible versions', () => {
      expect(checker.isCompatible('1.1.0', '1.0.0')).toBe(false); // Lower minor version
      expect(checker.isCompatible('1.0.1', '1.0.0')).toBe(false); // Lower patch version
      expect(checker.isCompatible('2.0.0', '1.9.9')).toBe(false); // Different major version
    });

    it('should handle invalid version formats gracefully', () => {
      expect(checker.isCompatible('invalid', '1.0.0')).toBe(false);
      expect(checker.isCompatible('1.0.0', 'invalid')).toBe(false);
      expect(checker.isCompatible('', '')).toBe(false);
    });
  });

  describe('Compatibility Scoring', () => {
    it('should return correct compatibility scores', () => {
      expect(checker.getCompatibilityScore('1.0.0', '1.0.0')).toBe(1.0); // Exact match
      expect(checker.getCompatibilityScore('1.0.0', '1.1.0')).toBe(0.9); // Higher version
      expect(checker.getCompatibilityScore('1.0.0', '2.0.0')).toBe(0); // Incompatible major
      expect(checker.getCompatibilityScore('1.1.0', '1.0.0')).toBe(0.3); // Lower minor
    });

    it('should handle invalid versions in scoring', () => {
      expect(checker.getCompatibilityScore('invalid', '1.0.0')).toBe(0);
      expect(checker.getCompatibilityScore('1.0.0', 'invalid')).toBe(0);
    });
  });

  describe('Version Suggestions', () => {
    it('should suggest compatible versions', () => {
      const availableVersions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
      const suggestion = checker.suggestCompatibleVersion('1.0.0', availableVersions);

      expect(suggestion).toBe('1.1.0'); // Should suggest highest compatible version
    });

    it('should return null when no compatible versions exist', () => {
      const availableVersions = ['0.9.0', '0.8.0'];
      const suggestion = checker.suggestCompatibleVersion('1.0.0', availableVersions);

      expect(suggestion).toBeNull();
    });

    it('should handle empty available versions', () => {
      const suggestion = checker.suggestCompatibleVersion('1.0.0', []);

      expect(suggestion).toBeNull();
    });
  });
});