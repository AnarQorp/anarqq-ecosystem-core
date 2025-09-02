/**
 * Module Migration Tools Test Suite
 * Tests for module migration, backup, restore, sync, and rollback functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleMigrationTools } from '../ModuleMigrationTools';
import { ModuleRegistry } from '../ModuleRegistry';
import { ModuleRegistrationService } from '../ModuleRegistrationService';
import {
  RegisteredModule,
  ModuleStatus,
  QModuleMetadata,
  SignedModuleMetadata
} from '../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';

// Mock dependencies
vi.mock('../ModuleRegistry');
vi.mock('../ModuleRegistrationService');

describe('ModuleMigrationTools', () => {
  let migrationTools: ModuleMigrationTools;
  let mockModuleRegistry: vi.Mocked<ModuleRegistry>;
  let mockRegistrationService: vi.Mocked<ModuleRegistrationService>;
  let mockIdentity: ExtendedSquidIdentity;
  let mockModule: RegisteredModule;

  beforeEach(() => {
    // Create mocks
    mockModuleRegistry = new ModuleRegistry() as vi.Mocked<ModuleRegistry>;
    mockRegistrationService = new ModuleRegistrationService() as vi.Mocked<ModuleRegistrationService>;
    
    // Initialize migration tools
    migrationTools = new ModuleMigrationTools(mockModuleRegistry, mockRegistrationService);

    // Mock identity
    mockIdentity = {
      did: 'did:example:test-user',
      type: IdentityType.ROOT,
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
      metadata: {
        name: 'Test User',
        created: new Date().toISOString()
      }
    };

    // Mock module
    const mockMetadata: QModuleMetadata = {
      module: 'test-module',
      version: '1.0.0',
      description: 'Test module for migration',
      identities_supported: [IdentityType.ROOT],
      integrations: ['qindex', 'qlock'],
      dependencies: [],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'test-audit-hash',
      compliance: {
        audit: true,
        risk_scoring: false,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'default'
      },
      repository: 'https://github.com/test/test-module',
      documentation: 'QmTestDocumentationCID',
      activated_by: mockIdentity.did,
      timestamp: Date.now(),
      checksum: 'test-checksum',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'test-key-id'
    };

    const mockSignedMetadata: SignedModuleMetadata = {
      metadata: mockMetadata,
      signature: 'test-signature',
      publicKey: mockIdentity.publicKey,
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: mockIdentity.did
    };

    mockModule = {
      moduleId: 'test-module',
      metadata: mockMetadata,
      signedMetadata: mockSignedMetadata,
      registrationInfo: {
        cid: 'test-cid',
        indexId: 'test-index-id',
        registeredAt: new Date().toISOString(),
        registeredBy: mockIdentity.did,
        status: ModuleStatus.PRODUCTION_READY,
        verificationStatus: 'VERIFIED'
      },
      accessStats: {
        queryCount: 0,
        lastAccessed: new Date().toISOString(),
        dependentModules: []
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Migration Plans', () => {
    it('should create a migration plan successfully', async () => {
      // Mock module exists in source environment
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);

      const plan = await migrationTools.createMigrationPlan(
        'Test Migration',
        'Test migration plan',
        'development',
        'production',
        ['test-module'],
        mockIdentity.did
      );

      expect(plan).toBeDefined();
      expect(plan.name).toBe('Test Migration');
      expect(plan.sourceEnvironment).toBe('development');
      expect(plan.targetEnvironment).toBe('production');
      expect(plan.modules).toEqual(['test-module']);
      expect(plan.status).toBe('DRAFT');
      expect(plan.errors).toHaveLength(0);
    });

    it('should create migration plan with validation errors for missing modules', async () => {
      // Mock module doesn't exist in source environment
      mockModuleRegistry.getModule.mockResolvedValue(null);

      const plan = await migrationTools.createMigrationPlan(
        'Test Migration',
        'Test migration plan',
        'development',
        'production',
        ['non-existent-module'],
        mockIdentity.did
      );

      expect(plan.status).toBe('FAILED');
      expect(plan.errors).toContain('Module not found in source environment: non-existent-module');
    });

    it('should execute migration plan successfully', async () => {
      // Create a migration plan first
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);
      
      const plan = await migrationTools.createMigrationPlan(
        'Test Migration',
        'Test migration plan',
        'development',
        'production',
        ['test-module'],
        mockIdentity.did
      );

      // Mock successful module registration
      mockModuleRegistry.registerProductionModule.mockReturnValue(true);

      const result = await migrationTools.executeMigrationPlan(plan.id, mockIdentity);

      expect(result.success).toBe(true);
      expect(result.migratedModules).toContain('test-module');
      expect(result.failedModules).toHaveLength(0);
    });

    it('should handle migration plan execution failures', async () => {
      // Create a migration plan
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);
      
      const plan = await migrationTools.createMigrationPlan(
        'Test Migration',
        'Test migration plan',
        'development',
        'production',
        ['test-module'],
        mockIdentity.did
      );

      // Mock module registration failure
      mockModuleRegistry.registerProductionModule.mockReturnValue(false);

      const result = await migrationTools.executeMigrationPlan(plan.id, mockIdentity);

      expect(result.success).toBe(false);
      expect(result.migratedModules).toHaveLength(0);
      expect(result.failedModules).toHaveLength(1);
      expect(result.failedModules[0].moduleId).toBe('test-module');
    });
  });

  describe('Backup and Restore', () => {
    it('should create a backup successfully', async () => {
      // Mock modules in environment
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.getRegistryStats.mockReturnValue({
        productionModules: 1,
        sandboxModules: 0,
        totalModules: 1,
        totalAccesses: 0,
        cacheHitRate: 0,
        auditLogSize: 0
      });
      mockModuleRegistry.getAuditLog.mockReturnValue([]);

      const backup = await migrationTools.createBackup(
        'Test Backup',
        'Test backup description',
        'production',
        mockIdentity.did
      );

      expect(backup).toBeDefined();
      expect(backup.name).toBe('Test Backup');
      expect(backup.environment).toBe('production');
      expect(backup.moduleCount).toBe(1);
      expect(backup.createdBy).toBe(mockIdentity.did);
    });

    it('should restore from backup successfully', async () => {
      // Create a backup first
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.getRegistryStats.mockReturnValue({
        productionModules: 1,
        sandboxModules: 0,
        totalModules: 1,
        totalAccesses: 0,
        cacheHitRate: 0,
        auditLogSize: 0
      });
      mockModuleRegistry.getAuditLog.mockReturnValue([]);

      const backup = await migrationTools.createBackup(
        'Test Backup',
        'Test backup description',
        'production',
        mockIdentity.did
      );

      // Mock successful module registration during restore
      mockModuleRegistry.getModule.mockResolvedValue(null); // No existing module
      mockModuleRegistry.registerProductionModule.mockReturnValue(true);

      const result = await migrationTools.restoreFromBackup(
        backup.id,
        mockIdentity,
        {
          overwriteExisting: false,
          validateSignatures: false,
          skipDependencyCheck: true
        }
      );

      expect(result.success).toBe(true);
      expect(result.failedModules).toHaveLength(0);
    });

    it('should handle restore conflicts when overwrite is disabled', async () => {
      // Create a backup
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.getRegistryStats.mockReturnValue({
        productionModules: 1,
        sandboxModules: 0,
        totalModules: 1,
        totalAccesses: 0,
        cacheHitRate: 0,
        auditLogSize: 0
      });
      mockModuleRegistry.getAuditLog.mockReturnValue([]);

      const backup = await migrationTools.createBackup(
        'Test Backup',
        'Test backup description',
        'production',
        mockIdentity.did
      );

      // Mock existing module (conflict scenario)
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);

      const result = await migrationTools.restoreFromBackup(
        backup.id,
        mockIdentity,
        {
          overwriteExisting: false,
          validateSignatures: false,
          skipDependencyCheck: true
        }
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('already exists, skipping');
    });
  });

  describe('Export and Import', () => {
    it('should export module data in JSON format', async () => {
      // Mock modules in environment
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.getAuditLog.mockReturnValue([]);

      const exportResult = await migrationTools.exportModuleData('production', {
        format: 'JSON',
        includeSignatures: true,
        includeAccessStats: true,
        includeAuditLog: false,
        compress: false
      });

      expect(exportResult).toBeDefined();
      expect(exportResult.format).toBe('JSON');
      expect(exportResult.moduleCount).toBe(1);
      expect(exportResult.data).toContain('test-module');
      expect(exportResult.checksum).toBeDefined();
    });

    it('should export module data in CSV format', async () => {
      // Mock modules in environment
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);

      const exportResult = await migrationTools.exportModuleData('production', {
        format: 'CSV',
        includeSignatures: false,
        includeAccessStats: false,
        includeAuditLog: false,
        compress: false
      });

      expect(exportResult.format).toBe('CSV');
      expect(exportResult.data).toContain('moduleId');
      expect(exportResult.moduleCount).toBe(1);
    });

    it('should import module data successfully', async () => {
      const importData = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          environment: 'production',
          moduleCount: 1
        },
        modules: [mockModule]
      });

      // Mock no existing module (clean import)
      mockModuleRegistry.getModule.mockResolvedValue(null);

      const result = await migrationTools.importModuleData(
        importData,
        'JSON',
        mockIdentity,
        {
          validateSignatures: false,
          overwriteExisting: false,
          skipInvalidModules: false,
          dryRun: false,
          batchSize: 10
        }
      );

      expect(result.success).toBe(true);
      expect(result.importedModules).toContain('test-module');
      expect(result.failedModules).toHaveLength(0);
    });

    it('should handle import conflicts when overwrite is disabled', async () => {
      const importData = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          environment: 'production',
          moduleCount: 1
        },
        modules: [mockModule]
      });

      // Mock existing module (conflict scenario)
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);

      const result = await migrationTools.importModuleData(
        importData,
        'JSON',
        mockIdentity,
        {
          validateSignatures: false,
          overwriteExisting: false,
          skipInvalidModules: false,
          dryRun: false,
          batchSize: 10
        }
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('already exists, skipping');
    });
  });

  describe('Synchronization', () => {
    it('should configure synchronization successfully', async () => {
      const syncConfig = {
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        syncMode: 'INCREMENTAL' as const,
        conflictResolution: 'SOURCE_WINS' as const,
        enabled: true
      };

      await expect(
        migrationTools.configureSynchronization(syncConfig)
      ).resolves.not.toThrow();
    });

    it('should reject synchronization configuration with same source and target', async () => {
      const syncConfig = {
        sourceEnvironment: 'production',
        targetEnvironment: 'production',
        syncMode: 'FULL' as const,
        conflictResolution: 'SOURCE_WINS' as const,
        enabled: true
      };

      await expect(
        migrationTools.configureSynchronization(syncConfig)
      ).rejects.toThrow('Source and target environments cannot be the same');
    });

    it('should execute synchronization successfully', async () => {
      // Configure sync first
      const syncConfig = {
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        syncMode: 'INCREMENTAL' as const,
        conflictResolution: 'SOURCE_WINS' as const,
        enabled: true
      };

      await migrationTools.configureSynchronization(syncConfig);

      // Mock modules in environments
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.registerProductionModule.mockReturnValue(true);

      const result = await migrationTools.executeSynchronization(
        'development',
        'production',
        mockIdentity
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Rollback Points', () => {
    it('should create a rollback point successfully', async () => {
      const rollbackPoint = await migrationTools.createRollbackPoint(
        'test-module',
        mockModule,
        mockIdentity.did,
        'Test rollback point'
      );

      expect(rollbackPoint).toBeDefined();
      expect(rollbackPoint.moduleId).toBe('test-module');
      expect(rollbackPoint.version).toBe('1.0.0');
      expect(rollbackPoint.createdBy).toBe(mockIdentity.did);
      expect(rollbackPoint.reason).toBe('Test rollback point');
    });

    it('should rollback module to previous state successfully', async () => {
      // Create a rollback point first
      const rollbackPoint = await migrationTools.createRollbackPoint(
        'test-module',
        mockModule,
        mockIdentity.did,
        'Test rollback point'
      );

      // Mock current module state
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);
      mockModuleRegistry.updateModule.mockReturnValue(true);

      const success = await migrationTools.rollbackModule(
        'test-module',
        rollbackPoint.id,
        mockIdentity
      );

      expect(success).toBe(true);
      expect(mockModuleRegistry.updateModule).toHaveBeenCalled();
    });

    it('should get rollback points for a module', async () => {
      // Create a rollback point
      await migrationTools.createRollbackPoint(
        'test-module',
        mockModule,
        mockIdentity.did,
        'Test rollback point'
      );

      const rollbackPoints = migrationTools.getRollbackPoints('test-module');

      expect(rollbackPoints).toHaveLength(1);
      expect(rollbackPoints[0].moduleId).toBe('test-module');
    });

    it('should handle rollback when no rollback points exist', async () => {
      await expect(
        migrationTools.rollbackModule('non-existent-module', 'invalid-id', mockIdentity)
      ).rejects.toThrow('No rollback points found for module: non-existent-module');
    });
  });

  describe('Status and Information', () => {
    it('should get migration plans', async () => {
      // Create a migration plan
      mockModuleRegistry.getModule.mockResolvedValue(mockModule);
      
      await migrationTools.createMigrationPlan(
        'Test Migration',
        'Test migration plan',
        'development',
        'production',
        ['test-module'],
        mockIdentity.did
      );

      const plans = migrationTools.getMigrationPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Test Migration');
    });

    it('should get migration history', async () => {
      const history = migrationTools.getMigrationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get backups', async () => {
      // Create a backup
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);
      mockModuleRegistry.getRegistryStats.mockReturnValue({
        productionModules: 1,
        sandboxModules: 0,
        totalModules: 1,
        totalAccesses: 0,
        cacheHitRate: 0,
        auditLogSize: 0
      });
      mockModuleRegistry.getAuditLog.mockReturnValue([]);

      await migrationTools.createBackup(
        'Test Backup',
        'Test backup description',
        'production',
        mockIdentity.did
      );

      const backups = migrationTools.getBackups();

      expect(backups).toHaveLength(1);
      expect(backups[0].name).toBe('Test Backup');
    });

    it('should get sync configurations', async () => {
      // Configure sync
      const syncConfig = {
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        syncMode: 'INCREMENTAL' as const,
        conflictResolution: 'SOURCE_WINS' as const,
        enabled: true
      };

      await migrationTools.configureSynchronization(syncConfig);

      const configs = migrationTools.getSyncConfigurations();

      expect(configs).toHaveLength(1);
      expect(configs[0].sourceEnvironment).toBe('development');
      expect(configs[0].targetEnvironment).toBe('production');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid migration plan execution', async () => {
      await expect(
        migrationTools.executeMigrationPlan('invalid-plan-id', mockIdentity)
      ).rejects.toThrow('Migration plan not found: invalid-plan-id');
    });

    it('should handle invalid backup restore', async () => {
      await expect(
        migrationTools.restoreFromBackup(
          'invalid-backup-id',
          mockIdentity,
          { overwriteExisting: false, validateSignatures: false, skipDependencyCheck: true }
        )
      ).rejects.toThrow('Backup not found: invalid-backup-id');
    });

    it('should handle invalid rollback point', async () => {
      await expect(
        migrationTools.rollbackModule('test-module', 'invalid-rollback-id', mockIdentity)
      ).rejects.toThrow('No rollback points found for module: test-module');
    });

    it('should handle unsupported export format', async () => {
      mockModuleRegistry.listModules.mockReturnValue([mockModule]);

      await expect(
        migrationTools.exportModuleData('production', {
          format: 'UNSUPPORTED' as any,
          includeSignatures: false,
          includeAccessStats: false,
          includeAuditLog: false,
          compress: false
        })
      ).rejects.toThrow('Unsupported export format: UNSUPPORTED');
    });

    it('should handle invalid import data', async () => {
      const invalidData = 'invalid json data';

      await expect(
        migrationTools.importModuleData(
          invalidData,
          'JSON',
          mockIdentity,
          {
            validateSignatures: false,
            overwriteExisting: false,
            skipInvalidModules: false,
            dryRun: false,
            batchSize: 10
          }
        )
      ).rejects.toThrow();
    });
  });
});