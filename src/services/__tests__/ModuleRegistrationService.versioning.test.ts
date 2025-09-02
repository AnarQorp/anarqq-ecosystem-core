/**
 * Module Registration Service Versioning Integration Tests
 * Tests the integration between ModuleRegistrationService and ModuleUpdateVersioningService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleRegistrationService } from '../ModuleRegistrationService';
import { ModuleUpdateRequest, VersionUpdateType, ChangelogEntry } from '../ModuleUpdateVersioningService';
import { ModuleStatus, ModuleInfo } from '../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';

describe('ModuleRegistrationService - Versioning Integration', () => {
  let registrationService: ModuleRegistrationService;
  let mockIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    registrationService = new ModuleRegistrationService();
    
    mockIdentity = {
      did: 'did:test:root-identity',
      type: IdentityType.ROOT,
      publicKey: 'test-public-key',
      metadata: {
        name: 'Test Root Identity',
        description: 'Test identity for module registration'
      }
    };

    // Mock the ecosystem services initialization
    vi.spyOn(registrationService as any, 'initializeServices').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Update Validation', () => {
    it('should validate module update request', async () => {
      // Mock existing module
      vi.spyOn(registrationService['moduleRegistry'], 'getModule').mockReturnValue({
        moduleId: 'test-module',
        metadata: {
          module: 'test-module',
          version: '1.0.0',
          description: 'Test module',
          identities_supported: [IdentityType.ROOT],
          integrations: ['qindex'],
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

      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '1.1.0',
        updates: {
          description: 'Updated test module with new features'
        },
        changelog: [
          {
            version: '1.1.0',
            date: '2024-01-01',
            type: 'added',
            description: 'Added new API endpoints',
            breakingChange: false,
            migrationRequired: false,
            affectedComponents: ['api']
          }
        ]
      };

      const validation = await registrationService.validateModuleUpdate(updateRequest);

      expect(validation.valid).toBe(true);
      expect(validation.updateType).toBe(VersionUpdateType.MINOR);
      expect(validation.compatibilityImpact).toBe('MEDIUM');
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid version updates', async () => {
      vi.spyOn(registrationService['moduleRegistry'], 'getModule').mockReturnValue({
        moduleId: 'test-module',
        metadata: {
          module: 'test-module',
          version: '2.0.0',
          description: 'Test module',
          identities_supported: [IdentityType.ROOT],
          integrations: ['qindex'],
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

      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'test-module',
        newVersion: '1.5.0', // Lower than current version 2.0.0
        updates: {}
      };

      const validation = await registrationService.validateModuleUpdate(updateRequest);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes('must be higher than current version'))).toBe(true);
    });
  });

  describe('Version Compatibility Checking', () => {
    it('should check version compatibility correctly', () => {
      const compatibility = registrationService.checkVersionCompatibility(
        'test-module',
        '1.0.0',
        '1.2.0'
      );

      expect(compatibility.compatible).toBe(true);
      expect(compatibility.compatibilityScore).toBeGreaterThan(0.7);
      expect(compatibility.issues).toHaveLength(0);
    });

    it('should detect version incompatibilities', () => {
      const compatibility = registrationService.checkVersionCompatibility(
        'test-module',
        '2.0.0',
        '1.5.0'
      );

      expect(compatibility.compatible).toBe(false);
      expect(compatibility.issues.some(issue => issue.type === 'VERSION_MISMATCH')).toBe(true);
      expect(compatibility.recommendations.some(rec => rec.includes('Upgrade'))).toBe(true);
    });
  });

  describe('Rollback Plan Management', () => {
    it('should create rollback plan for major version update', () => {
      vi.spyOn(registrationService['moduleRegistry'], 'getModuleDependents').mockReturnValue(['dependent-module']);

      const rollbackPlan = registrationService.createRollbackPlan(
        'test-module',
        '1.0.0',
        '2.0.0'
      );

      expect(rollbackPlan.rollbackVersion).toBe('1.0.0');
      expect(rollbackPlan.rollbackSteps.length).toBeGreaterThan(0);
      expect(rollbackPlan.dataBackupRequired).toBe(true);
      expect(rollbackPlan.risks.some(risk => risk.includes('Major version rollback'))).toBe(true);
    });

    it('should execute rollback plan successfully', async () => {
      const rollbackPlan = registrationService.createRollbackPlan(
        'test-module',
        '1.0.0',
        '1.1.0'
      );

      const result = await registrationService.executeRollback('test-module', rollbackPlan);

      expect(result.success).toBe(true);
      expect(result.completedSteps.length).toBe(rollbackPlan.rollbackSteps.length);
      expect(result.errors).toHaveLength(0);
    });

    it('should get rollback history for module', () => {
      // Create a rollback plan first
      registrationService.createRollbackPlan('test-module', '1.0.0', '1.1.0');

      const history = registrationService.getRollbackHistory('test-module');

      expect(history).toHaveLength(1);
      expect(history[0].rollbackVersion).toBe('1.0.0');
    });
  });

  describe('Update Notifications', () => {
    beforeEach(() => {
      vi.spyOn(registrationService['moduleRegistry'], 'getModuleDependents').mockReturnValue(['dependent-module-1', 'dependent-module-2']);
    });

    it('should create update notification for module', async () => {
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

      const notification = await registrationService.createModuleUpdateNotification(
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
      expect(notification.migrationGuide).toBe('Migration guide content');
    });

    it('should handle breaking changes in notifications', async () => {
      const breakingChanges = ['Removed deprecated API', 'Changed function signatures'];

      const notification = await registrationService.createModuleUpdateNotification(
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
      await registrationService.createModuleUpdateNotification('test-module', '1.0.0', '1.1.0', []);

      const notifications = registrationService.getModuleUpdateNotifications('test-module');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].moduleId).toBe('test-module');
    });
  });

  describe('Changelog Management', () => {
    it('should generate changelog for module version', () => {
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
        }
      ];

      const changelog = registrationService.generateChangelog('test-module', '1.1.0', changes);

      expect(changelog).toHaveLength(2);
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[0].type).toBe('added');
      expect(changelog[1].type).toBe('fixed');
    });

    it('should get changelog for specific version', () => {
      // Generate changelog first
      registrationService.generateChangelog('test-module', '1.1.0', [
        { type: 'added', description: 'New feature' }
      ]);

      const changelog = registrationService.getChangelog('test-module', '1.1.0');

      expect(changelog).toHaveLength(1);
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[0].description).toBe('New feature');
    });

    it('should get all changelog entries for module', () => {
      // Generate multiple changelog entries
      registrationService.generateChangelog('test-module', '1.1.0', [
        { type: 'added', description: 'New feature' }
      ]);
      registrationService.generateChangelog('test-module', '1.0.0', [
        { type: 'fixed', description: 'Bug fix' }
      ]);

      const changelog = registrationService.getChangelog('test-module');

      expect(changelog).toHaveLength(2);
      // Should be sorted by version (newest first)
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[1].version).toBe('1.0.0');
    });
  });

  describe('End-to-End Versioning Workflow', () => {
    it('should handle complete module update workflow', async () => {
      // Mock existing module
      vi.spyOn(registrationService['moduleRegistry'], 'getModule').mockReturnValue({
        moduleId: 'qwallet',
        metadata: {
          module: 'qwallet',
          version: '1.0.0',
          description: 'Qwallet module',
          identities_supported: [IdentityType.ROOT, IdentityType.DAO],
          integrations: ['qindex', 'qlock', 'qerberos'],
          status: ModuleStatus.PRODUCTION_READY,
          audit_hash: 'qwallet-audit-hash',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: true,
            gdpr_compliant: true,
            data_retention_policy: 'qwallet-policy'
          },
          repository: 'https://github.com/anarq/qwallet',
          documentation: 'QmQwalletDoc',
          activated_by: mockIdentity.did,
          timestamp: Date.now(),
          checksum: 'qwallet-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'qwallet-key'
        },
        signedMetadata: {} as any,
        registrationInfo: {
          cid: 'qwallet-cid',
          indexId: 'qwallet-index',
          registeredAt: new Date().toISOString(),
          registeredBy: mockIdentity.did,
          status: ModuleStatus.PRODUCTION_READY,
          verificationStatus: 'VERIFIED'
        },
        accessStats: {
          queryCount: 100,
          lastAccessed: new Date().toISOString(),
          dependentModules: ['qmarket', 'qsocial']
        }
      });

      vi.spyOn(registrationService['moduleRegistry'], 'getModuleDependents').mockReturnValue(['qmarket', 'qsocial']);

      // 1. Validate update request
      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'qwallet',
        newVersion: '1.1.0',
        updates: {
          description: 'Qwallet module with enhanced features',
          integrations: ['qindex', 'qlock', 'qerberos', 'qonsent']
        },
        changelog: [
          {
            version: '1.1.0',
            date: '2024-01-01',
            type: 'added',
            description: 'Added Qonsent integration',
            breakingChange: false,
            migrationRequired: false,
            affectedComponents: ['integrations']
          },
          {
            version: '1.1.0',
            date: '2024-01-01',
            type: 'improved',
            description: 'Enhanced security features',
            breakingChange: false,
            migrationRequired: false,
            affectedComponents: ['security']
          }
        ],
        notifyDependents: true
      };

      const validation = await registrationService.validateModuleUpdate(updateRequest);
      expect(validation.valid).toBe(true);
      expect(validation.updateType).toBe(VersionUpdateType.MINOR);

      // 2. Check version compatibility
      const compatibility = registrationService.checkVersionCompatibility('qwallet', '1.0.0', '1.1.0');
      expect(compatibility.compatible).toBe(true);

      // 3. Create rollback plan
      const rollbackPlan = registrationService.createRollbackPlan('qwallet', '1.0.0', '1.1.0');
      expect(rollbackPlan.rollbackVersion).toBe('1.0.0');
      expect(rollbackPlan.rollbackSteps.length).toBeGreaterThan(0);

      // 4. Create update notification
      const notification = await registrationService.createModuleUpdateNotification(
        'qwallet',
        '1.0.0',
        '1.1.0',
        updateRequest.changelog!,
        [],
        'No migration required for this minor update'
      );
      expect(notification.affectedModules).toEqual(['qmarket', 'qsocial']);

      // 5. Generate changelog
      const changelog = registrationService.generateChangelog('qwallet', '1.1.0', updateRequest.changelog!);
      expect(changelog).toHaveLength(2);

      // 6. Verify all data is accessible
      const notifications = registrationService.getModuleUpdateNotifications('qwallet');
      expect(notifications).toHaveLength(1);

      const allChangelog = registrationService.getChangelog('qwallet');
      expect(allChangelog).toHaveLength(2);

      const history = registrationService.getRollbackHistory('qwallet');
      expect(history).toHaveLength(1);
    });

    it('should handle major version update with breaking changes', async () => {
      // Mock existing module
      vi.spyOn(registrationService['moduleRegistry'], 'getModule').mockReturnValue({
        moduleId: 'qwallet',
        metadata: {
          module: 'qwallet',
          version: '1.5.0',
          description: 'Qwallet module',
          identities_supported: [IdentityType.ROOT, IdentityType.DAO],
          integrations: ['qindex', 'qlock', 'qerberos'],
          status: ModuleStatus.PRODUCTION_READY,
          audit_hash: 'qwallet-audit-hash',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: true,
            gdpr_compliant: true,
            data_retention_policy: 'qwallet-policy'
          },
          repository: 'https://github.com/anarq/qwallet',
          documentation: 'QmQwalletDoc',
          activated_by: mockIdentity.did,
          timestamp: Date.now(),
          checksum: 'qwallet-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'qwallet-key'
        },
        signedMetadata: {} as any,
        registrationInfo: {
          cid: 'qwallet-cid',
          indexId: 'qwallet-index',
          registeredAt: new Date().toISOString(),
          registeredBy: mockIdentity.did,
          status: ModuleStatus.PRODUCTION_READY,
          verificationStatus: 'VERIFIED'
        },
        accessStats: {
          queryCount: 100,
          lastAccessed: new Date().toISOString(),
          dependentModules: ['qmarket', 'qsocial']
        }
      });

      const updateRequest: ModuleUpdateRequest = {
        moduleId: 'qwallet',
        newVersion: '2.0.0',
        updates: {
          description: 'Qwallet module v2 with major architectural changes'
        },
        breakingChanges: [
          'Removed legacy API endpoints',
          'Changed authentication mechanism',
          'Updated data structures'
        ],
        migrationGuide: 'Please follow the migration guide at https://docs.qwallet.com/migration-v2',
        rollbackPlan: {
          rollbackVersion: '1.5.0',
          rollbackSteps: [],
          dataBackupRequired: true,
          estimatedDuration: 300000,
          risks: ['Data migration may be required'],
          prerequisites: ['Backup all data before proceeding']
        }
      };

      const validation = await registrationService.validateModuleUpdate(updateRequest);
      expect(validation.valid).toBe(true);
      expect(validation.updateType).toBe(VersionUpdateType.MAJOR);
      expect(validation.compatibilityImpact).toBe('BREAKING');
      expect(validation.breakingChanges).toEqual(updateRequest.breakingChanges);

      const notification = await registrationService.createModuleUpdateNotification(
        'qwallet',
        '1.5.0',
        '2.0.0',
        [],
        updateRequest.breakingChanges!,
        updateRequest.migrationGuide
      );

      expect(notification.updateType).toBe(VersionUpdateType.MAJOR);
      expect(notification.compatibilityImpact).toBe('BREAKING');
      expect(notification.requiredActions).toContain('Review breaking changes');
      expect(notification.migrationGuide).toBe(updateRequest.migrationGuide);
    });
  });
});