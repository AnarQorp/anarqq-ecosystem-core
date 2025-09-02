/**
 * Module Update and Versioning Service Tests
 * Tests for semantic versioning, update validation, compatibility checking,
 * rollback functionality, update notifications, and changelog management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleUpdateVersioningService, VersionUpdateType, ChangelogEntry, ModuleUpdateRequest, RollbackPlan } from '../ModuleUpdateVersioningService';
import { ModuleRegistry } from '../ModuleRegistry';
import { ModuleDependencyManager } from '../ModuleDependencyManager';
import { ModuleStatus, ModuleRegistrationErrorCode } from '../../types/qwallet-module-registration';

describe('ModuleUpdateVersioningService', () => {
  let versioningService: ModuleUpdateVersioningService;
  let moduleRegistry: ModuleRegistry;
  let dependencyManager: ModuleDependencyManager;

  beforeEach(() => {
    moduleRegistry = new ModuleRegistry();
    dependencyManager = new ModuleDependencyManager(moduleRegistry);
    versioningService = new ModuleUpdateVersioningService(moduleRegistry, dependencyManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Semantic Version Parsing', () => {
    it('should parse valid semantic versions correctly', () => {
      const version = versioningService.parseSemanticVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
        raw: '1.2.3'
      });
    });

    it('should parse prerelease versions correctly', () => {
      const version = versioningService.parseSemanticVersion('1.2.3-beta.1');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.1',
        build: undefined,
        raw: '1.2.3-beta.1'
      });
    });

    it('should parse build versions correctly', () => {
      const version = versioningService.parseSemanticVersion('1.2.3+build.123');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: 'build.123',
        raw: '1.2.3+build.123'
      });
    });

    it('should parse full semantic versions correctly', () => {
      const version = versioningService.parseSemanticVersion('1.2.3-alpha.1+build.456');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        build: 'build.456',
        raw: '1.2.3-alpha.1+build.456'
      });
    });

    it('should throw error for invalid version format', () => {
      expect(() => {
        versioningService.parseSemanticVersion('invalid-version');
      }).toThrow();
    });
  });

  describe('Version Comparison', () => {
    it('should compare major versions correctly', () => {
      expect(versioningService.compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(versioningService.compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should compare minor versions correctly', () => {
      expect(versioningService.compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
      expect(versioningService.compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should compare patch versions correctly', () => {
      expect(versioningService.compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0);
      expect(versioningService.compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should handle equal versions', () => {
      expect(versioningService.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      expect(versioningService.compareVersions('1.0.0', '1.0.0-beta')).toBeGreaterThan(0);
      expect(versioningService.compareVersions('1.0.0-beta', '1.0.0')).toBeLessThan(0);
      expect(versioningService.compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBeGreaterThan(0);
    });
  });

  describe('Update Type Detection', () => {
    it('should detect major version updates', () => {
      const updateType = versioningService.getUpdateType('1.0.0', '2.0.0');
      expect(updateType).toBe(VersionUpdateType.MAJOR);
    });

    it('should detect minor version updates', () => {
      const updateType = versioningService.getUpdateType('1.0.0', '1.1.0');
      expect(updateType).toBe(VersionUpdateType.MINOR);
    });

    it('should detect patch version updates', () => {
      const updateType = versioningService.getUpdateType('1.0.0', '1.0.1');
      expect(updateType).toBe(VersionUpdateType.PATCH);
    });

    it('should detect prerelease updates', () => {
      const updateType = versioningService.getUpdateType('1.0.0', '1.0.0-beta');
      expect(updateType).toBe(VersionUpdateType.PRERELEASE);
    });

    it('should detect build updates', () => {
      const updateType = versioningService.getUpdateType('1.0.0', '1.0.0+build.1');
      expect(updateType).toBe(VersionUpdateType.BUILD);
    });

    it('should throw error for invalid version updates', () => {
      expect(() => {
        versioningService.getUpdateType('2.0.0', '1.0.0');
      }).toThrow();
    });
  });

  describe('Update Validation', () => {
    beforeEach(() => {
      // Mock module registry to return a test module
      vi.spyOn(moduleRegistry, 'getModule').mockReturnValue({
        moduleId: 'test-module',
        metadata: {
          module: 'test-module',
          version: '1.0.0',
          description: 'Test module',
          identities_supported: [],
          integrations: [],
          status: ModuleStatus.PRODUCTION_READY,
          audit_hash: 'test-hash',
          compliance: {
            audit: true,
            risk_scoring: false,
            privacy_enforced: true,
            kyc_support: false,
            gdpr_compliant: true,
            data_retention_policy: 'default'
          },
          repository: 'https://github.com/test/test-module',
          documentation: 'QmTestDoc',
          activated_by: 'did:test:123',
          timestamp: Date.now(),
          checksum: 'test-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'test-key'
        },
        signedMetadata: {} as any,
        registrationInfo: {
          cid: 'test-cid',
          indexId: 'test-index',
          registeredAt: new Date().toISOString(),
          registeredBy: 'did:test:123',
          status: ModuleStatus.PRODUCTION_READY,
          verificationStatus: 'VERIFIED'
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      });

      vi.spyOn(moduleRegistry, 'getModuleDependents').mockReturnValue([]);
    });

    it('should validate valid update request', async () => {
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '1.1.0',
        updates: {
          description: 'Updated test module'
        }
      };

      const result = await versioningService.validateUpdate(updateRequest);
      
      expect(result.valid).toBe(true);
      expect(result.updateType).toBe(VersionUpdateType.MINOR);
      expect(result.compatibilityImpact).toBe('MEDIUM');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject update with invalid version format', async () => {
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: 'invalid-version',
        updates: {}
      };

      const result = await versioningService.validateUpdate(updateRequest);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid version format: invalid-version');
    });

    it('should reject update with lower version', async () => {
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '0.9.0',
        updates: {}
      };

      const result = await versioningService.validateUpdate(updateRequest);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('must be higher than current version'))).toBe(true);
    });

    it('should handle breaking changes in update validation', async () => {
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '2.0.0',
        updates: {},
        breakingChanges: ['Removed deprecated API', 'Changed function signatures']
      };

      const result = await versioningService.validateUpdate(updateRequest);
      
      expect(result.valid).toBe(true);
      expect(result.updateType).toBe(VersionUpdateType.MAJOR);
      expect(result.compatibilityImpact).toBe('BREAKING');
      expect(result.breakingChanges).toEqual(['Removed deprecated API', 'Changed function signatures']);
    });

    it('should warn about breaking changes in non-major updates', async () => {
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '1.1.0',
        updates: {},
        breakingChanges: ['Minor breaking change']
      };

      const result = await versioningService.validateUpdate(updateRequest);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Breaking changes detected in non-major version update'))).toBe(true);
    });
  });

  describe('Version Compatibility Checking', () => {
    it('should check compatible versions', () => {
      const result = versioningService.checkVersionCompatibility('test-module', '1.0.0', '1.2.0');
      
      expect(result.compatible).toBe(true);
      expect(result.compatibilityScore).toBeGreaterThan(0.7);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect major version incompatibility', () => {
      const result = versioningService.checkVersionCompatibility('test-module', '2.0.0', '1.5.0');
      
      expect(result.compatible).toBe(false);
      expect(result.issues.some(issue => issue.type === 'VERSION_MISMATCH' && issue.severity === 'ERROR')).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('Upgrade'))).toBe(true);
    });

    it('should detect minor version issues', () => {
      const result = versioningService.checkVersionCompatibility('test-module', '1.5.0', '1.2.0');
      
      expect(result.compatible).toBe(false);
      expect(result.issues.some(issue => issue.type === 'VERSION_MISMATCH' && issue.severity === 'WARNING')).toBe(true);
    });

    it('should handle patch version differences', () => {
      const result = versioningService.checkVersionCompatibility('test-module', '1.0.5', '1.0.2');
      
      expect(result.compatible).toBe(true); // Patch differences are usually compatible
      expect(result.issues.some(issue => issue.severity === 'INFO')).toBe(true);
    });
  });

  describe('Rollback Plan Creation', () => {
    beforeEach(() => {
      vi.spyOn(moduleRegistry, 'getModuleDependents').mockReturnValue(['dependent-module-1', 'dependent-module-2']);
    });

    it('should create rollback plan for major version update', () => {
      const rollbackPlan = versioningService.createRollbackPlan('test-module', '1.0.0', '2.0.0', VersionUpdateType.MAJOR);
      
      expect(rollbackPlan.rollbackVersion).toBe('1.0.0');
      expect(rollbackPlan.rollbackSteps).toHaveLength(5); // backup, revert, update deps, notify, verify
      expect(rollbackPlan.dataBackupRequired).toBe(true);
      expect(rollbackPlan.risks.some(risk => risk.includes('Major version rollback'))).toBe(true);
      expect(rollbackPlan.prerequisites.some(prereq => prereq.includes('Review data migration'))).toBe(true);
    });

    it('should create rollback plan for minor version update', () => {
      const rollbackPlan = versioningService.createRollbackPlan('test-module', '1.0.0', '1.1.0', VersionUpdateType.MINOR);
      
      expect(rollbackPlan.rollbackVersion).toBe('1.0.0');
      expect(rollbackPlan.rollbackSteps).toHaveLength(5);
      expect(rollbackPlan.dataBackupRequired).toBe(false);
      expect(rollbackPlan.risks.some(risk => risk.includes('dependent modules may be affected'))).toBe(true);
    });

    it('should create rollback plan for patch version update', () => {
      vi.spyOn(moduleRegistry, 'getModuleDependents').mockReturnValue([]);
      
      const rollbackPlan = versioningService.createRollbackPlan('test-module', '1.0.0', '1.0.1', VersionUpdateType.PATCH);
      
      expect(rollbackPlan.rollbackVersion).toBe('1.0.0');
      expect(rollbackPlan.rollbackSteps).toHaveLength(3); // backup, revert, verify (no dependency update or notification)
      expect(rollbackPlan.dataBackupRequired).toBe(false);
    });
  });

  describe('Rollback Execution', () => {
    let rollbackPlan: RollbackPlan;

    beforeEach(() => {
      rollbackPlan = versioningService.createRollbackPlan('test-module', '1.0.0', '1.1.0', VersionUpdateType.MINOR);
    });

    it('should execute rollback plan successfully', async () => {
      const result = await versioningService.executeRollback('test-module', rollbackPlan);
      
      expect(result.success).toBe(true);
      expect(result.completedSteps).toHaveLength(rollbackPlan.rollbackSteps.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute rollback plan in dry run mode', async () => {
      const result = await versioningService.executeRollback('test-module', rollbackPlan, { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.completedSteps).toHaveLength(rollbackPlan.rollbackSteps.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip risky steps when requested', async () => {
      // Add a risky step to the plan
      rollbackPlan.rollbackSteps[0].risks = ['High risk operation'];
      
      const result = await versioningService.executeRollback('test-module', rollbackPlan, { skipRiskySteps: true });
      
      // When all steps are skipped due to risks, success should be false but no errors
      expect(result.success).toBe(false);
      expect(result.completedSteps.length).toBeLessThan(rollbackPlan.rollbackSteps.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should report progress during rollback execution', async () => {
      const progressCallback = vi.fn();
      
      await versioningService.executeRollback('test-module', rollbackPlan, { progressCallback });
      
      expect(progressCallback).toHaveBeenCalledTimes(rollbackPlan.rollbackSteps.length);
    });
  });

  describe('Update Notifications', () => {
    beforeEach(() => {
      vi.spyOn(moduleRegistry, 'getModuleDependents').mockReturnValue(['dependent-module-1', 'dependent-module-2']);
      vi.spyOn(dependencyManager, 'createUpdateNotification').mockResolvedValue({
        moduleId: 'test-module',
        dependentModules: ['dependent-module-1', 'dependent-module-2'],
        updateType: 'minor',
        oldVersion: '1.0.0',
        newVersion: '1.1.0',
        compatibilityImpact: 'medium',
        requiredActions: ['Review changes'],
        timestamp: new Date().toISOString()
      });
    });

    it('should create update notification', async () => {
      const changelog: ChangelogEntry[] = [
        {
          version: '1.1.0',
          date: '2024-01-01',
          type: 'added',
          description: 'Added new feature',
          breakingChange: false,
          migrationRequired: false,
          affectedComponents: ['api']
        }
      ];

      const notification = await versioningService.createUpdateNotification(
        'test-module',
        '1.0.0',
        '1.1.0',
        changelog,
        [],
        'Migration guide content'
      );

      expect(notification.moduleId).toBe('test-module');
      expect(notification.fromVersion).toBe('1.0.0');
      expect(notification.toVersion).toBe('1.1.0');
      expect(notification.updateType).toBe(VersionUpdateType.MINOR);
      expect(notification.affectedModules).toEqual(['dependent-module-1', 'dependent-module-2']);
      expect(notification.changelog).toEqual(changelog);
      expect(notification.migrationGuide).toBe('Migration guide content');
    });

    it('should handle breaking changes in notifications', async () => {
      const breakingChanges = ['Removed deprecated API', 'Changed function signatures'];
      
      const notification = await versioningService.createUpdateNotification(
        'test-module',
        '1.0.0',
        '2.0.0',
        [],
        breakingChanges
      );

      expect(notification.updateType).toBe(VersionUpdateType.MAJOR);
      expect(notification.compatibilityImpact).toBe('BREAKING');
      expect(notification.breakingChanges).toEqual(breakingChanges);
      expect(notification.requiredActions).toContain('Review breaking changes');
    });

    it('should get update notifications for module', async () => {
      // Create a notification first
      await versioningService.createUpdateNotification('test-module', '1.0.0', '1.1.0', []);
      
      const notifications = versioningService.getUpdateNotifications('test-module');
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].moduleId).toBe('test-module');
    });
  });

  describe('Changelog Management', () => {
    it('should generate changelog entries', () => {
      const changes = [
        {
          type: 'added' as const,
          description: 'Added new feature',
          breakingChange: false
        },
        {
          type: 'fixed' as const,
          description: 'Fixed critical bug',
          breakingChange: false
        },
        {
          type: 'changed' as const,
          description: 'Updated API',
          breakingChange: true,
          migrationRequired: true
        }
      ];

      const changelog = versioningService.generateChangelog('test-module', '1.1.0', changes);

      expect(changelog).toHaveLength(3);
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[0].type).toBe('added');
      expect(changelog[2].breakingChange).toBe(true);
      expect(changelog[2].migrationRequired).toBe(true);
    });

    it('should get changelog for specific version', () => {
      // Generate changelog first
      versioningService.generateChangelog('test-module', '1.1.0', [
        { type: 'added', description: 'New feature' }
      ]);
      versioningService.generateChangelog('test-module', '1.0.0', [
        { type: 'fixed', description: 'Bug fix' }
      ]);

      const changelog = versioningService.getChangelog('test-module', '1.1.0');

      expect(changelog).toHaveLength(1);
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[0].type).toBe('added');
    });

    it('should get all changelog entries for module', () => {
      // Generate multiple changelog entries
      versioningService.generateChangelog('test-module', '1.1.0', [
        { type: 'added', description: 'New feature' }
      ]);
      versioningService.generateChangelog('test-module', '1.0.0', [
        { type: 'fixed', description: 'Bug fix' }
      ]);

      const changelog = versioningService.getChangelog('test-module');

      expect(changelog).toHaveLength(2);
      // Should be sorted by version (newest first)
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[1].version).toBe('1.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle module not found in validation', async () => {
      vi.spyOn(moduleRegistry, 'getModule').mockReturnValue(null);

      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'non-existent-module',
        newVersion: '1.1.0',
        updates: {}
      };

      const result = await versioningService.validateUpdate(updateRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module not found: non-existent-module');
    });

    it('should handle version parsing errors in compatibility check', () => {
      const result = versioningService.checkVersionCompatibility('test-module', 'invalid', '1.0.0');

      expect(result.compatible).toBe(false);
      expect(result.compatibilityScore).toBe(0);
      expect(result.issues.some(issue => issue.severity === 'ERROR')).toBe(true);
    });
  });

  describe('Integration with Dependencies', () => {
    it('should integrate with dependency manager for notifications', async () => {
      const createNotificationSpy = vi.spyOn(dependencyManager, 'createUpdateNotification');

      await versioningService.createUpdateNotification('test-module', '1.0.0', '1.1.0', []);

      expect(createNotificationSpy).toHaveBeenCalledWith(
        'test-module',
        '1.0.0',
        '1.1.0',
        {
          notifyDependents: true,
          includeCompatibilityAnalysis: true
        }
      );
    });
  });
});