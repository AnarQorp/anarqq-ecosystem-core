/**
 * QindexService Module Registration Tests
 * Tests the module registration, discovery, and verification functionality
 */

import { QindexService } from '../ecosystem/QindexService.mjs';
import { strict as assert } from 'assert';

// Simple test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.beforeEachFn = null;
  }

  describe(name, fn) {
    this.currentSuite = name;
    fn();
  }

  it(name, fn) {
    this.tests.push({
      suite: this.currentSuite,
      name,
      fn
    });
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  async run() {
    let passed = 0;
    let failed = 0;

    console.log('Running QindexService Module Registration Tests...\n');

    for (const test of this.tests) {
      try {
        if (this.beforeEachFn) {
          await this.beforeEachFn();
        }
        await test.fn();
        console.log(`✓ ${test.suite}: ${test.name}`);
        passed++;
      } catch (error) {
        console.log(`✗ ${test.suite}: ${test.name}`);
        console.log(`  Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }
}

const testRunner = new TestRunner();
const describe = testRunner.describe.bind(testRunner);
const it = testRunner.it.bind(testRunner);
const beforeEach = testRunner.beforeEach.bind(testRunner);

let qindexService;

describe('QindexService Module Registration', () => {
  
  // Sample module metadata for testing
  const sampleModuleMetadata = {
    module: 'Qwallet',
    version: '1.0.0',
    description: 'Decentralized wallet module for the AnarQ ecosystem',
    identities_supported: ['ROOT', 'DAO', 'ENTERPRISE'],
    integrations: ['Qlock', 'Qerberos', 'Qonsent'],
    dependencies: [],
    status: 'PRODUCTION_READY',
    audit_hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
    compliance: {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    },
    repository: 'https://github.com/anarq/qwallet',
    documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    activated_by: 'did:root:12345',
    timestamp: Date.now(),
    checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
    signature_algorithm: 'RSA-SHA256',
    public_key_id: 'root-key-001'
  };

  const sampleSignedMetadata = {
    metadata: sampleModuleMetadata,
    signature: 'sample-signature-12345',
    publicKey: 'sample-public-key-67890',
    signature_type: 'RSA-SHA256',
    signed_at: Date.now(),
    signer_identity: 'did:root:12345'
  };

  beforeEach(() => {
    qindexService = new QindexService();
  });

  describe('Module Registration', () => {
    it('should register a module successfully', async () => {
      const result = await qindexService.registerModule('qwallet', sampleSignedMetadata);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.moduleId, 'qwallet');
      assert.ok(result.cid);
      assert.ok(result.indexId);
      assert.ok(result.timestamp);
    });

    it('should prevent duplicate module registration', async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
      
      try {
        await qindexService.registerModule('qwallet', sampleSignedMetadata);
        assert.fail('Should have thrown error for duplicate registration');
      } catch (error) {
        assert.ok(error.message.includes('Module already registered'));
      }
    });

    it('should register module in sandbox mode', async () => {
      const result = await qindexService.registerSandboxModule('qwallet-test', sampleSignedMetadata);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.moduleId, 'qwallet-test');
      
      // Verify it's in sandbox registry
      const sandboxModules = await qindexService.listSandboxModules();
      assert.strictEqual(sandboxModules.length, 1);
      assert.strictEqual(sandboxModules[0].moduleId, 'qwallet-test');
      assert.strictEqual(sandboxModules[0].registrationInfo.testMode, true);
    });

    it('should validate required metadata fields', async () => {
      const invalidMetadata = {
        metadata: {
          module: 'TestModule'
          // Missing required fields
        },
        signature: 'test-signature',
        publicKey: 'test-key',
        signature_type: 'RSA-SHA256',
        signed_at: Date.now(),
        signer_identity: 'did:test:123'
      };

      try {
        await qindexService.registerModule('invalid-module', invalidMetadata);
        assert.fail('Should have thrown validation error');
      } catch (error) {
        assert.ok(error.message.includes('Required metadata field missing'));
      }
    });
  });

  describe('Module Discovery', () => {
    beforeEach(async () => {
      // Register test modules
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
      
      const qsocialMetadata = {
        ...sampleSignedMetadata,
        metadata: {
          ...sampleModuleMetadata,
          module: 'Qsocial',
          version: '2.0.0',
          description: 'Social networking module',
          status: 'TESTING',
          integrations: ['Qindex', 'Qonsent']
        }
      };
      await qindexService.registerModule('qsocial', qsocialMetadata);
    });

    it('should get module by ID', async () => {
      const module = await qindexService.getModule('qwallet');
      
      assert.ok(module);
      assert.strictEqual(module.moduleId, 'qwallet');
      assert.strictEqual(module.metadata.module, 'Qwallet');
      assert.strictEqual(module.metadata.version, '1.0.0');
    });

    it('should return null for non-existent module', async () => {
      const module = await qindexService.getModule('non-existent');
      assert.strictEqual(module, null);
    });

    it('should search modules by name', async () => {
      const results = await qindexService.searchModules({ name: 'Qwallet' });
      
      assert.strictEqual(results.modules.length, 1);
      assert.strictEqual(results.modules[0].metadata.module, 'Qwallet');
      assert.strictEqual(results.totalCount, 1);
    });

    it('should search modules by status', async () => {
      const results = await qindexService.searchModules({ status: 'PRODUCTION_READY' });
      
      assert.strictEqual(results.modules.length, 1);
      assert.strictEqual(results.modules[0].metadata.status, 'PRODUCTION_READY');
    });

    it('should search modules by integration', async () => {
      const results = await qindexService.searchModules({ integration: 'Qlock' });
      
      assert.strictEqual(results.modules.length, 1);
      assert.strictEqual(results.modules[0].metadata.module, 'Qwallet');
    });

    it('should filter modules by compliance', async () => {
      const results = await qindexService.searchModules({ hasCompliance: true });
      
      assert.strictEqual(results.modules.length, 2); // Both modules have some compliance
    });

    it('should support pagination', async () => {
      const results = await qindexService.searchModules({ limit: 1, offset: 0 });
      
      assert.strictEqual(results.modules.length, 1);
      assert.strictEqual(results.totalCount, 2);
      assert.strictEqual(results.hasMore, true);
    });
  });

  describe('Module Verification', () => {
    beforeEach(async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
    });

    it('should verify valid module', async () => {
      const verification = await qindexService.verifyModule('qwallet');
      
      assert.strictEqual(verification.moduleId, 'qwallet');
      assert.strictEqual(verification.status, 'production_ready');
      assert.strictEqual(verification.verificationChecks.metadataValid, true);
      assert.strictEqual(verification.verificationChecks.signatureValid, true);
      assert.strictEqual(verification.verificationChecks.dependenciesResolved, true);
      assert.ok(verification.lastVerified);
    });

    it('should detect invalid module', async () => {
      const verification = await qindexService.verifyModule('non-existent');
      
      assert.strictEqual(verification.moduleId, 'non-existent');
      assert.strictEqual(verification.status, 'invalid');
      assert.strictEqual(verification.verificationChecks.metadataValid, false);
      assert.ok(verification.issues.length > 0);
      assert.strictEqual(verification.issues[0].code, 'MODULE_NOT_FOUND');
    });
  });

  describe('Module Updates', () => {
    beforeEach(async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
    });

    it('should update module metadata', async () => {
      const updates = {
        version: '1.1.0',
        description: 'Updated wallet module',
        status: 'TESTING'
      };

      const result = await qindexService.updateModuleMetadata('qwallet', updates);
      assert.strictEqual(result, true);

      const module = await qindexService.getModule('qwallet');
      assert.strictEqual(module.metadata.version, '1.1.0');
      assert.strictEqual(module.metadata.description, 'Updated wallet module');
      assert.strictEqual(module.metadata.status, 'TESTING');
      assert.strictEqual(module.registrationInfo.verificationStatus, 'UNVERIFIED');
    });

    it('should reject invalid update fields', async () => {
      const invalidUpdates = {
        module: 'NewName', // Not allowed to change
        invalidField: 'value'
      };

      try {
        await qindexService.updateModuleMetadata('qwallet', invalidUpdates);
        assert.fail('Should have thrown error for invalid fields');
      } catch (error) {
        assert.ok(error.message.includes('Invalid update fields'));
      }
    });
  });

  describe('Module Deregistration', () => {
    beforeEach(async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
    });

    it('should deregister module', async () => {
      const result = await qindexService.deregisterModule('qwallet');
      assert.strictEqual(result, true);

      const module = await qindexService.getModule('qwallet');
      assert.strictEqual(module, null);
    });

    it('should handle deregistration of non-existent module', async () => {
      try {
        await qindexService.deregisterModule('non-existent');
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Module not found'));
      }
    });
  });

  describe('Dependency Management', () => {
    it('should check dependency compatibility', async () => {
      // Register a dependency module first
      const dependencyMetadata = {
        ...sampleSignedMetadata,
        metadata: {
          ...sampleModuleMetadata,
          module: 'QlockModule',
          version: '1.0.0'
        }
      };
      await qindexService.registerModule('qlock-module', dependencyMetadata);

      // Test compatibility check
      const result = await qindexService.checkDependencyCompatibility('test-module', ['qlock-module']);
      
      assert.strictEqual(result.compatible, true);
      assert.strictEqual(result.conflicts.length, 0);
      assert.strictEqual(result.missingDependencies.length, 0);
    });

    it('should detect missing dependencies', async () => {
      const result = await qindexService.checkDependencyCompatibility('test-module', ['non-existent-dep']);
      
      assert.strictEqual(result.compatible, false);
      assert.strictEqual(result.missingDependencies.length, 1);
      assert.strictEqual(result.missingDependencies[0], 'non-existent-dep');
    });

    it('should detect circular dependencies', async () => {
      // Register modules with circular dependencies
      const moduleA = {
        ...sampleSignedMetadata,
        metadata: {
          ...sampleModuleMetadata,
          module: 'ModuleA',
          dependencies: ['module-b']
        }
      };
      const moduleB = {
        ...sampleSignedMetadata,
        metadata: {
          ...sampleModuleMetadata,
          module: 'ModuleB',
          dependencies: ['module-a']
        }
      };

      await qindexService.registerModule('module-a', moduleA, { skipDependencyCheck: true });
      await qindexService.registerModule('module-b', moduleB, { skipDependencyCheck: true });

      const result = await qindexService.checkDependencyCompatibility('module-a', ['module-b']);
      
      assert.strictEqual(result.compatible, false);
      assert.ok(result.conflicts.some(c => c.conflictType === 'CIRCULAR'));
    });
  });

  describe('Sandbox Operations', () => {
    beforeEach(async () => {
      await qindexService.registerSandboxModule('qwallet-test', sampleSignedMetadata);
    });

    it('should list sandbox modules', async () => {
      const sandboxModules = await qindexService.listSandboxModules();
      
      assert.strictEqual(sandboxModules.length, 1);
      assert.strictEqual(sandboxModules[0].moduleId, 'qwallet-test');
      assert.strictEqual(sandboxModules[0].registrationInfo.testMode, true);
    });

    it('should promote sandbox module to production', async () => {
      const result = await qindexService.promoteSandboxModule('qwallet-test');
      assert.strictEqual(result, true);

      // Verify it's now in production registry
      const productionModule = await qindexService.getModule('qwallet-test');
      assert.ok(productionModule);
      assert.strictEqual(productionModule.registrationInfo.testMode, false);

      // Verify it's no longer in sandbox
      const sandboxModules = await qindexService.listSandboxModules();
      assert.strictEqual(sandboxModules.length, 0);
    });

    it('should prevent promotion of non-existent sandbox module', async () => {
      try {
        await qindexService.promoteSandboxModule('non-existent');
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.ok(error.message.includes('Sandbox module not found'));
      }
    });
  });

  describe('Module Statistics and Audit', () => {
    beforeEach(async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
      await qindexService.registerSandboxModule('qwallet-test', sampleSignedMetadata);
    });

    it('should get module statistics', async () => {
      const stats = await qindexService.getModuleStats();
      
      assert.strictEqual(stats.totalModules, 2);
      assert.strictEqual(stats.productionModules, 1);
      assert.strictEqual(stats.sandboxModules, 1);
      assert.ok(stats.byStatus);
      assert.ok(stats.byIdentityType);
    });

    it('should get module audit log', async () => {
      // Perform some operations to generate audit events
      await qindexService.getModule('qwallet');
      await qindexService.verifyModule('qwallet');

      const auditLog = await qindexService.getModuleAuditLog();
      
      assert.ok(auditLog.events.length >= 3); // REGISTERED, ACCESSED, VERIFIED
      assert.ok(auditLog.events.some(e => e.action === 'REGISTERED'));
      assert.ok(auditLog.events.some(e => e.action === 'ACCESSED'));
      assert.ok(auditLog.events.some(e => e.action === 'VERIFIED'));
    });

    it('should get module-specific audit log', async () => {
      await qindexService.getModule('qwallet');
      
      const auditLog = await qindexService.getModuleAuditLog('qwallet');
      
      assert.ok(auditLog.events.length >= 2); // REGISTERED, ACCESSED
      assert.ok(auditLog.events.every(e => e.moduleId === 'qwallet'));
    });
  });

  describe('Health Check Integration', () => {
    beforeEach(async () => {
      await qindexService.registerModule('qwallet', sampleSignedMetadata);
    });

    it('should include module statistics in health check', async () => {
      const health = await qindexService.healthCheck();
      
      assert.strictEqual(health.status, 'healthy');
      assert.ok(health.modules);
      assert.strictEqual(health.modules.totalModules, 1);
      assert.strictEqual(health.modules.productionModules, 1);
      assert.strictEqual(health.modules.sandboxModules, 0);
      assert.ok(health.auditLog.moduleEvents >= 1);
    });
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRunner.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { testRunner };