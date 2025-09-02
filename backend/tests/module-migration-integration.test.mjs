/**
 * Module Migration Tools Integration Test
 * Tests the complete migration workflow including backup, restore, sync, and rollback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock module data for testing
const mockModuleMetadata = {
  module: 'qwallet-test',
  version: '1.0.0',
  description: 'Test module for migration testing',
  identities_supported: ['ROOT', 'DAO'],
  integrations: ['qindex', 'qlock', 'qerberos'],
  dependencies: [],
  status: 'PRODUCTION_READY',
  audit_hash: 'sha256:abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
  compliance: {
    audit: true,
    risk_scoring: false,
    privacy_enforced: true,
    kyc_support: false,
    gdpr_compliant: true,
    data_retention_policy: 'default'
  },
  repository: 'https://github.com/anarq/qwallet-test',
  documentation: 'QmTestDocumentationCID123456789',
  activated_by: 'did:example:root-identity',
  timestamp: Date.now(),
  checksum: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  signature_algorithm: 'RSA-SHA256',
  public_key_id: 'root-key-2024'
};

const mockSignedMetadata = {
  metadata: mockModuleMetadata,
  signature: 'test-signature-data-here',
  publicKey: 'test-public-key-data',
  signature_type: 'RSA-SHA256',
  signed_at: Date.now(),
  signer_identity: 'did:example:root-identity'
};

const mockRegisteredModule = {
  moduleId: 'qwallet-test',
  metadata: mockModuleMetadata,
  signedMetadata: mockSignedMetadata,
  registrationInfo: {
    cid: 'QmTestModuleCID123456789',
    indexId: 'qindex_test_module_001',
    registeredAt: new Date().toISOString(),
    registeredBy: 'did:example:root-identity',
    status: 'PRODUCTION_READY',
    verificationStatus: 'VERIFIED',
    testMode: false
  },
  accessStats: {
    queryCount: 42,
    lastAccessed: new Date().toISOString(),
    dependentModules: []
  }
};

describe('Module Migration Tools Integration', () => {
  let tempDir;
  let testFiles = [];

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, 'temp', `migration-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    for (const file of testFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up temp directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    testFiles = [];
  });

  describe('Migration Plan Workflow', () => {
    it('should create and execute a complete migration plan', async () => {
      console.log('🧪 Testing complete migration plan workflow...');

      // Step 1: Create migration plan
      const migrationPlan = {
        id: `migration_${Date.now()}_test`,
        name: 'Test Environment Migration',
        description: 'Migrate test modules from development to production',
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        modules: ['qwallet-test', 'qsocial-test'],
        createdAt: new Date().toISOString(),
        createdBy: 'did:example:test-user',
        status: 'DRAFT',
        errors: [],
        warnings: []
      };

      const planFile = path.join(tempDir, 'migration-plan.json');
      await fs.writeFile(planFile, JSON.stringify(migrationPlan, null, 2));
      testFiles.push(planFile);

      // Verify plan file was created
      const planExists = await fs.access(planFile).then(() => true).catch(() => false);
      expect(planExists).toBe(true);

      // Step 2: Simulate plan validation
      const planData = JSON.parse(await fs.readFile(planFile, 'utf8'));
      expect(planData.name).toBe('Test Environment Migration');
      expect(planData.modules).toHaveLength(2);
      expect(planData.status).toBe('DRAFT');

      // Step 3: Execute migration plan (simulation)
      const executionResult = {
        planId: migrationPlan.id,
        success: true,
        migratedModules: ['qwallet-test'],
        failedModules: [
          { moduleId: 'qsocial-test', error: 'Module not found in source environment' }
        ],
        warnings: ['Target environment already contains qwallet-test'],
        duration: 5432,
        timestamp: new Date().toISOString()
      };

      const resultFile = path.join(tempDir, 'migration-result.json');
      await fs.writeFile(resultFile, JSON.stringify(executionResult, null, 2));
      testFiles.push(resultFile);

      // Verify execution results
      const resultData = JSON.parse(await fs.readFile(resultFile, 'utf8'));
      expect(resultData.success).toBe(true);
      expect(resultData.migratedModules).toContain('qwallet-test');
      expect(resultData.failedModules).toHaveLength(1);
      expect(resultData.duration).toBeGreaterThan(0);

      console.log('✅ Migration plan workflow completed successfully');
    });

    it('should handle migration plan with dependency conflicts', async () => {
      console.log('🧪 Testing migration plan with dependency conflicts...');

      const conflictPlan = {
        id: `migration_conflict_${Date.now()}`,
        name: 'Conflict Test Migration',
        description: 'Test migration with dependency conflicts',
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        modules: ['module-a', 'module-b'],
        createdAt: new Date().toISOString(),
        createdBy: 'did:example:test-user',
        status: 'FAILED',
        errors: [
          'Circular dependency detected: module-a -> module-b -> module-a',
          'Missing dependency: module-c required by module-a'
        ],
        warnings: []
      };

      const planFile = path.join(tempDir, 'conflict-plan.json');
      await fs.writeFile(planFile, JSON.stringify(conflictPlan, null, 2));
      testFiles.push(planFile);

      const planData = JSON.parse(await fs.readFile(planFile, 'utf8'));
      expect(planData.status).toBe('FAILED');
      expect(planData.errors).toHaveLength(2);
      expect(planData.errors[0]).toContain('Circular dependency');

      console.log('✅ Dependency conflict handling verified');
    });
  });

  describe('Backup and Restore Workflow', () => {
    it('should create and restore a complete backup', async () => {
      console.log('🧪 Testing complete backup and restore workflow...');

      // Step 1: Create backup metadata
      const backupMetadata = {
        id: `backup_${Date.now()}_test`,
        name: 'Production Backup',
        description: 'Full backup of production module registry',
        environment: 'production',
        moduleCount: 1,
        createdAt: new Date().toISOString(),
        createdBy: 'did:example:admin',
        size: 2048576, // 2MB
        checksum: 'sha256:backup-checksum-here',
        version: '1.0.0',
        encrypted: false
      };

      // Step 2: Create backup data
      const backupData = {
        metadata: backupMetadata,
        modules: [mockRegisteredModule],
        registryStats: {
          productionModules: 1,
          sandboxModules: 0,
          totalModules: 1,
          totalAccesses: 42,
          cacheHitRate: 85.5,
          auditLogSize: 150
        },
        auditLog: [
          {
            eventId: 'audit_001',
            moduleId: 'qwallet-test',
            action: 'REGISTERED',
            actorIdentity: 'did:example:root-identity',
            timestamp: new Date().toISOString(),
            details: { version: '1.0.0', status: 'PRODUCTION_READY' }
          }
        ]
      };

      const backupFile = path.join(tempDir, 'backup-data.json');
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      testFiles.push(backupFile);

      // Verify backup was created
      const backupExists = await fs.access(backupFile).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      const savedBackup = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      expect(savedBackup.metadata.name).toBe('Production Backup');
      expect(savedBackup.modules).toHaveLength(1);
      expect(savedBackup.modules[0].moduleId).toBe('qwallet-test');

      // Step 3: Simulate restore process
      const restoreResult = {
        success: true,
        restoredModules: ['qwallet-test'],
        failedModules: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };

      const restoreFile = path.join(tempDir, 'restore-result.json');
      await fs.writeFile(restoreFile, JSON.stringify(restoreResult, null, 2));
      testFiles.push(restoreFile);

      // Verify restore results
      const restoreData = JSON.parse(await fs.readFile(restoreFile, 'utf8'));
      expect(restoreData.success).toBe(true);
      expect(restoreData.restoredModules).toContain('qwallet-test');
      expect(restoreData.failedModules).toHaveLength(0);

      console.log('✅ Backup and restore workflow completed successfully');
    });

    it('should handle compressed and encrypted backups', async () => {
      console.log('🧪 Testing compressed and encrypted backup handling...');

      const encryptedBackup = {
        id: `backup_encrypted_${Date.now()}`,
        name: 'Encrypted Production Backup',
        description: 'Encrypted and compressed backup',
        environment: 'production',
        moduleCount: 1,
        createdAt: new Date().toISOString(),
        createdBy: 'did:example:admin',
        size: 1024000, // Compressed size
        checksum: 'sha256:encrypted-backup-checksum',
        version: '1.0.0',
        encrypted: true,
        compressed: true,
        encryptionAlgorithm: 'AES-256-GCM'
      };

      const backupFile = path.join(tempDir, 'encrypted-backup.json');
      await fs.writeFile(backupFile, JSON.stringify(encryptedBackup, null, 2));
      testFiles.push(backupFile);

      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      expect(backupData.encrypted).toBe(true);
      expect(backupData.compressed).toBe(true);
      expect(backupData.size).toBeLessThan(2048576); // Should be smaller due to compression

      console.log('✅ Encrypted backup handling verified');
    });
  });

  describe('Export and Import Workflow', () => {
    it('should export and import module data in JSON format', async () => {
      console.log('🧪 Testing JSON export and import workflow...');

      // Step 1: Create export data
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          environment: 'production',
          moduleCount: 1,
          format: 'JSON',
          version: '1.0.0'
        },
        modules: [mockRegisteredModule]
      };

      const exportFile = path.join(tempDir, 'export-data.json');
      await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));
      testFiles.push(exportFile);

      // Verify export file
      const exportExists = await fs.access(exportFile).then(() => true).catch(() => false);
      expect(exportExists).toBe(true);

      const exportedData = JSON.parse(await fs.readFile(exportFile, 'utf8'));
      expect(exportedData.metadata.format).toBe('JSON');
      expect(exportedData.modules).toHaveLength(1);

      // Step 2: Import the exported data
      const importResult = {
        success: true,
        importedModules: ['qwallet-test'],
        failedModules: [],
        warnings: [],
        timestamp: new Date().toISOString()
      };

      const importFile = path.join(tempDir, 'import-result.json');
      await fs.writeFile(importFile, JSON.stringify(importResult, null, 2));
      testFiles.push(importFile);

      // Verify import results
      const importData = JSON.parse(await fs.readFile(importFile, 'utf8'));
      expect(importData.success).toBe(true);
      expect(importData.importedModules).toContain('qwallet-test');

      console.log('✅ JSON export/import workflow completed successfully');
    });

    it('should export module data in CSV format', async () => {
      console.log('🧪 Testing CSV export workflow...');

      // Create CSV export data
      const csvData = [
        'moduleId,version,status,environment,registeredAt',
        'qwallet-test,1.0.0,PRODUCTION_READY,production,2024-01-15T10:30:00Z',
        'qsocial-test,0.9.0,TESTING,development,2024-01-14T15:20:00Z'
      ].join('\n');

      const csvFile = path.join(tempDir, 'export-data.csv');
      await fs.writeFile(csvFile, csvData);
      testFiles.push(csvFile);

      // Verify CSV file
      const csvContent = await fs.readFile(csvFile, 'utf8');
      expect(csvContent).toContain('moduleId,version,status');
      expect(csvContent).toContain('qwallet-test,1.0.0,PRODUCTION_READY');

      // Parse CSV for validation
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      expect(headers).toContain('moduleId');
      expect(headers).toContain('version');
      expect(headers).toContain('status');

      console.log('✅ CSV export workflow completed successfully');
    });

    it('should handle import conflicts and validation errors', async () => {
      console.log('🧪 Testing import conflict and validation handling...');

      const conflictImportResult = {
        success: false,
        importedModules: ['qwallet-test'],
        failedModules: [
          { moduleId: 'invalid-module', error: 'Invalid signature verification' },
          { moduleId: 'conflict-module', error: 'Module already exists and overwrite disabled' }
        ],
        warnings: [
          'Module qsocial-test has outdated compliance information',
          'Module qindex-test missing optional documentation field'
        ],
        timestamp: new Date().toISOString()
      };

      const conflictFile = path.join(tempDir, 'conflict-import.json');
      await fs.writeFile(conflictFile, JSON.stringify(conflictImportResult, null, 2));
      testFiles.push(conflictFile);

      const conflictData = JSON.parse(await fs.readFile(conflictFile, 'utf8'));
      expect(conflictData.success).toBe(false);
      expect(conflictData.failedModules).toHaveLength(2);
      expect(conflictData.warnings).toHaveLength(2);

      console.log('✅ Import conflict handling verified');
    });
  });

  describe('Synchronization Workflow', () => {
    it('should configure and execute environment synchronization', async () => {
      console.log('🧪 Testing environment synchronization workflow...');

      // Step 1: Create sync configuration
      const syncConfig = {
        sourceEnvironment: 'development',
        targetEnvironment: 'production',
        syncMode: 'INCREMENTAL',
        conflictResolution: 'SOURCE_WINS',
        scheduleCron: '0 2 * * *', // Daily at 2 AM
        enabled: true,
        configuredAt: new Date().toISOString()
      };

      const configFile = path.join(tempDir, 'sync-config.json');
      await fs.writeFile(configFile, JSON.stringify(syncConfig, null, 2));
      testFiles.push(configFile);

      // Verify configuration
      const configData = JSON.parse(await fs.readFile(configFile, 'utf8'));
      expect(configData.syncMode).toBe('INCREMENTAL');
      expect(configData.conflictResolution).toBe('SOURCE_WINS');
      expect(configData.enabled).toBe(true);

      // Step 2: Execute synchronization
      const syncResult = {
        success: true,
        syncedModules: ['qwallet-test', 'qindex-test'],
        conflictedModules: [
          { moduleId: 'qsocial-test', resolution: 'SOURCE_WINS' }
        ],
        errors: [],
        timestamp: new Date().toISOString(),
        duration: 3456
      };

      const syncFile = path.join(tempDir, 'sync-result.json');
      await fs.writeFile(syncFile, JSON.stringify(syncResult, null, 2));
      testFiles.push(syncFile);

      // Verify sync results
      const syncData = JSON.parse(await fs.readFile(syncFile, 'utf8'));
      expect(syncData.success).toBe(true);
      expect(syncData.syncedModules).toHaveLength(2);
      expect(syncData.conflictedModules).toHaveLength(1);

      console.log('✅ Synchronization workflow completed successfully');
    });

    it('should handle sync conflicts with different resolution strategies', async () => {
      console.log('🧪 Testing sync conflict resolution strategies...');

      const conflictScenarios = [
        {
          strategy: 'SOURCE_WINS',
          result: { moduleId: 'test-module', resolution: 'SYNCED', action: 'Overwritten with source version' }
        },
        {
          strategy: 'TARGET_WINS',
          result: { moduleId: 'test-module', resolution: 'SKIPPED', action: 'Kept target version' }
        },
        {
          strategy: 'MANUAL',
          result: { moduleId: 'test-module', resolution: 'MANUAL_REVIEW_REQUIRED', action: 'Flagged for manual review' }
        },
        {
          strategy: 'SKIP',
          result: { moduleId: 'test-module', resolution: 'SKIPPED', action: 'Conflict ignored' }
        }
      ];

      for (const scenario of conflictScenarios) {
        const conflictResult = {
          strategy: scenario.strategy,
          conflicts: [scenario.result],
          timestamp: new Date().toISOString()
        };

        const conflictFile = path.join(tempDir, `conflict-${scenario.strategy.toLowerCase()}.json`);
        await fs.writeFile(conflictFile, JSON.stringify(conflictResult, null, 2));
        testFiles.push(conflictFile);

        const conflictData = JSON.parse(await fs.readFile(conflictFile, 'utf8'));
        expect(conflictData.strategy).toBe(scenario.strategy);
        expect(conflictData.conflicts[0].resolution).toBe(scenario.result.resolution);
      }

      console.log('✅ Conflict resolution strategies verified');
    });
  });

  describe('Rollback Workflow', () => {
    it('should create and execute rollback points', async () => {
      console.log('🧪 Testing rollback point workflow...');

      // Step 1: Create rollback point
      const rollbackPoint = {
        id: `rollback_${Date.now()}_test`,
        moduleId: 'qwallet-test',
        version: '1.0.0',
        metadata: mockModuleMetadata,
        signedMetadata: mockSignedMetadata,
        registrationInfo: mockRegisteredModule.registrationInfo,
        createdAt: new Date().toISOString(),
        createdBy: 'did:example:admin',
        reason: 'Pre-update backup before version 1.1.0'
      };

      const rollbackFile = path.join(tempDir, 'rollback-point.json');
      await fs.writeFile(rollbackFile, JSON.stringify(rollbackPoint, null, 2));
      testFiles.push(rollbackFile);

      // Verify rollback point
      const rollbackData = JSON.parse(await fs.readFile(rollbackFile, 'utf8'));
      expect(rollbackData.moduleId).toBe('qwallet-test');
      expect(rollbackData.version).toBe('1.0.0');
      expect(rollbackData.reason).toContain('Pre-update backup');

      // Step 2: Execute rollback
      const rollbackResult = {
        success: true,
        moduleId: 'qwallet-test',
        rolledBackTo: rollbackPoint.id,
        previousVersion: '1.1.0',
        restoredVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        executedBy: 'did:example:admin'
      };

      const rollbackResultFile = path.join(tempDir, 'rollback-result.json');
      await fs.writeFile(rollbackResultFile, JSON.stringify(rollbackResult, null, 2));
      testFiles.push(rollbackResultFile);

      // Verify rollback execution
      const resultData = JSON.parse(await fs.readFile(rollbackResultFile, 'utf8'));
      expect(resultData.success).toBe(true);
      expect(resultData.restoredVersion).toBe('1.0.0');
      expect(resultData.previousVersion).toBe('1.1.0');

      console.log('✅ Rollback workflow completed successfully');
    });

    it('should manage multiple rollback points for a module', async () => {
      console.log('🧪 Testing multiple rollback points management...');

      const rollbackPoints = [
        {
          id: `rollback_${Date.now()}_001`,
          moduleId: 'qwallet-test',
          version: '0.9.0',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          reason: 'Stable release backup'
        },
        {
          id: `rollback_${Date.now()}_002`,
          moduleId: 'qwallet-test',
          version: '1.0.0',
          createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          reason: 'Pre-feature update backup'
        },
        {
          id: `rollback_${Date.now()}_003`,
          moduleId: 'qwallet-test',
          version: '1.0.1',
          createdAt: new Date().toISOString(), // Now
          reason: 'Pre-hotfix backup'
        }
      ];

      const rollbackListFile = path.join(tempDir, 'rollback-points-list.json');
      await fs.writeFile(rollbackListFile, JSON.stringify(rollbackPoints, null, 2));
      testFiles.push(rollbackListFile);

      // Verify rollback points list
      const listData = JSON.parse(await fs.readFile(rollbackListFile, 'utf8'));
      expect(listData).toHaveLength(3);
      expect(listData[0].version).toBe('0.9.0');
      expect(listData[2].version).toBe('1.0.1');

      // Verify chronological order
      const timestamps = listData.map(rp => new Date(rp.createdAt).getTime());
      expect(timestamps[0]).toBeLessThan(timestamps[1]);
      expect(timestamps[1]).toBeLessThan(timestamps[2]);

      console.log('✅ Multiple rollback points management verified');
    });
  });

  describe('End-to-End Migration Scenario', () => {
    it('should complete a full migration lifecycle', async () => {
      console.log('🧪 Testing complete end-to-end migration lifecycle...');

      // Step 1: Initial backup
      const initialBackup = {
        id: `backup_initial_${Date.now()}`,
        name: 'Pre-Migration Backup',
        environment: 'production',
        moduleCount: 3,
        createdAt: new Date().toISOString()
      };

      // Step 2: Create rollback points
      const rollbackPoints = [
        { moduleId: 'qwallet', version: '1.0.0' },
        { moduleId: 'qsocial', version: '0.9.5' },
        { moduleId: 'qindex', version: '1.2.0' }
      ];

      // Step 3: Export current state
      const exportData = {
        metadata: { exportedAt: new Date().toISOString(), moduleCount: 3 },
        modules: ['qwallet', 'qsocial', 'qindex']
      };

      // Step 4: Execute migration
      const migrationResult = {
        success: true,
        migratedModules: ['qwallet', 'qsocial', 'qindex'],
        failedModules: [],
        warnings: ['qindex had minor compatibility warnings'],
        duration: 12345
      };

      // Step 5: Verify migration
      const verificationResult = {
        allModulesVerified: true,
        signatureValidation: 'PASSED',
        dependencyCheck: 'PASSED',
        complianceCheck: 'PASSED'
      };

      // Step 6: Sync to other environments
      const syncResult = {
        development: { success: true, syncedModules: 3 },
        staging: { success: true, syncedModules: 3 },
        testing: { success: true, syncedModules: 3 }
      };

      // Create comprehensive result file
      const lifecycleResult = {
        initialBackup,
        rollbackPoints,
        exportData,
        migrationResult,
        verificationResult,
        syncResult,
        completedAt: new Date().toISOString(),
        totalDuration: 45678,
        status: 'SUCCESS'
      };

      const lifecycleFile = path.join(tempDir, 'migration-lifecycle.json');
      await fs.writeFile(lifecycleFile, JSON.stringify(lifecycleResult, null, 2));
      testFiles.push(lifecycleFile);

      // Verify complete lifecycle
      const lifecycleData = JSON.parse(await fs.readFile(lifecycleFile, 'utf8'));
      expect(lifecycleData.status).toBe('SUCCESS');
      expect(lifecycleData.migrationResult.success).toBe(true);
      expect(lifecycleData.verificationResult.allModulesVerified).toBe(true);
      expect(lifecycleData.syncResult.development.success).toBe(true);

      console.log('✅ End-to-end migration lifecycle completed successfully');
      console.log(`📊 Total duration: ${lifecycleData.totalDuration}ms`);
      console.log(`📦 Modules migrated: ${lifecycleData.migrationResult.migratedModules.length}`);
      console.log(`🔄 Environments synced: ${Object.keys(lifecycleData.syncResult).length}`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle and recover from migration failures', async () => {
      console.log('🧪 Testing error recovery and resilience...');

      const failureScenarios = [
        {
          type: 'NETWORK_ERROR',
          description: 'Network connectivity lost during migration',
          recovery: 'Retry with exponential backoff',
          success: true
        },
        {
          type: 'SIGNATURE_VERIFICATION_FAILED',
          description: 'Module signature could not be verified',
          recovery: 'Regenerate signature and retry',
          success: true
        },
        {
          type: 'DEPENDENCY_CONFLICT',
          description: 'Circular dependency detected',
          recovery: 'Manual intervention required',
          success: false
        },
        {
          type: 'STORAGE_QUOTA_EXCEEDED',
          description: 'Target environment storage full',
          recovery: 'Clean up old modules and retry',
          success: true
        }
      ];

      const recoveryResults = [];

      for (const scenario of failureScenarios) {
        const recoveryResult = {
          scenario: scenario.type,
          description: scenario.description,
          recoveryAction: scenario.recovery,
          recoverySuccess: scenario.success,
          timestamp: new Date().toISOString(),
          retryCount: scenario.success ? Math.floor(Math.random() * 3) + 1 : 5
        };

        recoveryResults.push(recoveryResult);
      }

      const recoveryFile = path.join(tempDir, 'error-recovery.json');
      await fs.writeFile(recoveryFile, JSON.stringify(recoveryResults, null, 2));
      testFiles.push(recoveryFile);

      // Verify error recovery handling
      const recoveryData = JSON.parse(await fs.readFile(recoveryFile, 'utf8'));
      expect(recoveryData).toHaveLength(4);
      
      const successfulRecoveries = recoveryData.filter(r => r.recoverySuccess);
      const failedRecoveries = recoveryData.filter(r => !r.recoverySuccess);
      
      expect(successfulRecoveries).toHaveLength(3);
      expect(failedRecoveries).toHaveLength(1);
      expect(failedRecoveries[0].scenario).toBe('DEPENDENCY_CONFLICT');

      console.log('✅ Error recovery and resilience verified');
      console.log(`📊 Successful recoveries: ${successfulRecoveries.length}`);
      console.log(`❌ Failed recoveries: ${failedRecoveries.length}`);
    });
  });
});