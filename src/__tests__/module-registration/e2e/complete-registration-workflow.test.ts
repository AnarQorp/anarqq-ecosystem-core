/**
 * Complete Module Registration Workflow E2E Tests
 * Tests complete registration workflows from start to finish
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../../../services/ModuleRegistrationService';
import { QModuleMetadataGenerator } from '../../../services/QModuleMetadataGenerator';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import { ModuleRegistry } from '../../../services/ModuleRegistry';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleStatus,
  IdentityType,
  ModuleRegistrationError
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../../../types/identity';
import { 
  createMockIdentity, 
  createMockModuleInfo,
  setupCompleteTestEnvironment,
  createTestScenario,
  validateCompleteWorkflow
} from '../../utils/qwallet-test-utils';

describe('Complete Module Registration Workflow E2E', () => {
  let registrationService: ModuleRegistrationService;
  let metadataGenerator: QModuleMetadataGenerator;
  let verificationService: ModuleVerificationService;
  let moduleRegistry: ModuleRegistry;
  let testEnvironment: any;

  beforeEach(async () => {
    // Setup complete test environment
    testEnvironment = await setupCompleteTestEnvironment();
    
    registrationService = testEnvironment.registrationService;
    metadataGenerator = testEnvironment.metadataGenerator;
    verificationService = testEnvironment.verificationService;
    moduleRegistry = testEnvironment.moduleRegistry;
  });

  afterEach(async () => {
    await testEnvironment.cleanup();
  });

  describe('Qwallet Module Registration Workflow', () => {
    it('should complete full Qwallet module registration from start to finish', async () => {
      const scenario = createTestScenario('qwallet-registration', {
        moduleInfo: {
          name: 'Qwallet',
          version: '1.0.0',
          description: 'Decentralized wallet module for the AnarQ ecosystem',
          identitiesSupported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID],
          integrations: ['Qlock', 'Qerberos', 'Qonsent'],
          repositoryUrl: 'https://github.com/anarq/qwallet',
          documentationCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          auditHash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: false,
            gdpr_compliant: true,
            data_retention_policy: 'standard_retention_2_years'
          }
        },
        signerIdentity: createMockIdentity(IdentityType.ROOT),
        expectedOutcome: {
          success: true,
          status: ModuleStatus.PRODUCTION_READY,
          verificationPassed: true
        }
      });

      // Execute complete workflow
      const workflowResult = await validateCompleteWorkflow(scenario, {
        registrationService,
        verificationService,
        testEnvironment
      });

      // Validate all workflow steps
      expect(workflowResult.registration.success).toBe(true);
      expect(workflowResult.registration.moduleId).toBe('Qwallet');
      expect(workflowResult.registration.cid).toBeDefined();
      expect(workflowResult.registration.indexId).toBeDefined();

      expect(workflowResult.retrieval.module).toBeDefined();
      expect(workflowResult.retrieval.module?.moduleId).toBe('Qwallet');
      expect(workflowResult.retrieval.module?.metadata.version).toBe('1.0.0');

      expect(workflowResult.verification.status).toBe('production_ready');
      expect(workflowResult.verification.verificationChecks.metadataValid).toBe(true);
      expect(workflowResult.verification.verificationChecks.signatureValid).toBe(true);
      expect(workflowResult.verification.verificationChecks.dependenciesResolved).toBe(true);
      expect(workflowResult.verification.verificationChecks.complianceVerified).toBe(true);
      expect(workflowResult.verification.verificationChecks.auditPassed).toBe(true);

      expect(workflowResult.auditTrail.events.length).toBeGreaterThan(0);
      expect(workflowResult.auditTrail.events.some(e => e.action === 'REGISTERED')).toBe(true);
      expect(workflowResult.auditTrail.events.some(e => e.action === 'VERIFIED')).toBe(true);

      expect(workflowResult.searchability.found).toBe(true);
      expect(workflowResult.searchability.searchResults.modules.length).toBe(1);
      expect(workflowResult.searchability.searchResults.modules[0].metadata.module).toBe('Qwallet');
    });

    it('should handle Qwallet module update workflow', async () => {
      // Step 1: Register initial Qwallet module
      const initialModuleInfo = createMockModuleInfo('Qwallet', '1.0.0');
      const rootIdentity = createMockIdentity(IdentityType.ROOT);

      const initialRequest: ModuleRegistrationRequest = {
        moduleInfo: initialModuleInfo
      };

      const initialResult = await registrationService.registerModule(initialRequest, rootIdentity);
      expect(initialResult.success).toBe(true);

      // Step 2: Update to version 1.1.0 with new features
      const updates = {
        version: '1.1.0',
        description: 'Enhanced Qwallet with multi-chain support and improved security',
        integrations: [...initialModuleInfo.integrations, 'Qsocial', 'Qmarket'],
        compliance: {
          ...initialModuleInfo.compliance,
          audit: true,
          risk_scoring: true,
          privacy_enforced: true
        }
      };

      const updateResult = await registrationService.updateModule('Qwallet', updates, rootIdentity);
      expect(updateResult.success).toBe(true);

      // Step 3: Verify update was applied correctly
      const updatedModule = await registrationService.getModule('Qwallet');
      expect(updatedModule?.metadata.version).toBe('1.1.0');
      expect(updatedModule?.metadata.description).toContain('multi-chain support');
      expect(updatedModule?.metadata.integrations).toContain('Qsocial');
      expect(updatedModule?.metadata.integrations).toContain('Qmarket');

      // Step 4: Verify updated module still passes verification
      const verificationResult = await registrationService.verifyModule('Qwallet');
      expect(verificationResult.status).toBe('production_ready');
      expect(verificationResult.verificationChecks.metadataValid).toBe(true);

      // Step 5: Verify update history is maintained
      const history = await registrationService.getRegistrationHistory('Qwallet');
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some(h => h.action === 'REGISTERED')).toBe(true);
      expect(history.some(h => h.action === 'UPDATED')).toBe(true);

      // Step 6: Verify search returns updated module
      const searchResult = await registrationService.searchModules({ name: 'Qwallet' });
      expect(searchResult.modules[0].metadata.version).toBe('1.1.0');
    });

    it('should handle Qwallet sandbox testing workflow', async () => {
      const sandboxModuleInfo = createMockModuleInfo('Qwallet-Beta', '2.0.0-beta.1');
      sandboxModuleInfo.status = ModuleStatus.TESTING;
      
      const rootIdentity = createMockIdentity(IdentityType.ROOT);

      // Step 1: Register in sandbox mode
      const sandboxRequest: ModuleRegistrationRequest = {
        moduleInfo: sandboxModuleInfo,
        testMode: true
      };

      const sandboxResult = await registrationService.registerSandboxModule(sandboxRequest, rootIdentity);
      expect(sandboxResult.success).toBe(true);

      // Step 2: Verify it's in sandbox registry
      const sandboxModules = await registrationService.listSandboxModules();
      expect(sandboxModules.some(m => m.moduleId === 'Qwallet-Beta')).toBe(true);

      // Step 3: Verify it's not in production registry
      const productionModule = await registrationService.getModule('Qwallet-Beta');
      expect(productionModule).toBeNull();

      // Step 4: Test sandbox module functionality
      const sandboxModule = sandboxModules.find(m => m.moduleId === 'Qwallet-Beta');
      expect(sandboxModule?.registrationInfo.testMode).toBe(true);
      expect(sandboxModule?.metadata.status).toBe(ModuleStatus.TESTING);

      // Step 5: Verify sandbox module
      const sandboxVerification = await verificationService.verifyModule('Qwallet-Beta', sandboxModule!.signedMetadata);
      expect(sandboxVerification.status).toBe('testing');

      // Step 6: Promote to production after testing
      const promotionResult = await registrationService.promoteSandboxModule('Qwallet-Beta', rootIdentity);
      expect(promotionResult).toBe(true);

      // Step 7: Verify promotion worked
      const promotedModule = await registrationService.getModule('Qwallet-Beta');
      expect(promotedModule).toBeDefined();
      expect(promotedModule?.registrationInfo.testMode).toBe(false);

      // Step 8: Verify it's no longer in sandbox
      const updatedSandboxModules = await registrationService.listSandboxModules();
      expect(updatedSandboxModules.some(m => m.moduleId === 'Qwallet-Beta')).toBe(false);
    });

    it('should handle complex dependency resolution workflow', async () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);

      // Step 1: Register core dependencies first
      const coreModules = [
        createMockModuleInfo('Qindex', '1.0.0'),
        createMockModuleInfo('Qlock', '1.0.0'),
        createMockModuleInfo('Qerberos', '1.0.0')
      ];

      for (const moduleInfo of coreModules) {
        const request: ModuleRegistrationRequest = { moduleInfo };
        const result = await registrationService.registerModule(request, rootIdentity);
        expect(result.success).toBe(true);
      }

      // Step 2: Register Qwallet with complex dependencies
      const qwalletModuleInfo = createMockModuleInfo('Qwallet', '1.0.0');
      qwalletModuleInfo.integrations = ['Qindex', 'Qlock', 'Qerberos', 'Qonsent'];

      const qwalletRequest: ModuleRegistrationRequest = {
        moduleInfo: qwalletModuleInfo
      };

      const qwalletResult = await registrationService.registerModule(qwalletRequest, rootIdentity);
      expect(qwalletResult.success).toBe(true);

      // Step 3: Verify dependency resolution
      const qwalletModule = await registrationService.getModule('Qwallet');
      const dependencies = qwalletModule?.metadata.dependencies || [];

      expect(dependencies).toContain('Qindex');
      expect(dependencies).toContain('Qlock');

      // Step 4: Test dependency compatibility
      const compatibilityResult = await registrationService.resolveDependencies(
        'Qwallet',
        dependencies
      );

      expect(compatibilityResult.resolved).toBe(true);
      expect(compatibilityResult.missingDependencies.length).toBe(0);

      // Step 5: Register dependent module (Qmarket depends on Qwallet)
      const qmarketModuleInfo = createMockModuleInfo('Qmarket', '1.0.0');
      qmarketModuleInfo.integrations = ['Qwallet', 'Qindex', 'Qlock'];

      const qmarketRequest: ModuleRegistrationRequest = {
        moduleInfo: qmarketModuleInfo
      };

      const qmarketResult = await registrationService.registerModule(qmarketRequest, rootIdentity);
      expect(qmarketResult.success).toBe(true);

      // Step 6: Verify dependency chain
      const qmarketModule = await registrationService.getModule('Qmarket');
      expect(qmarketModule?.metadata.dependencies).toContain('Qwallet');

      // Step 7: Test that Qwallet cannot be deregistered while Qmarket depends on it
      await expect(registrationService.deregisterModule('Qwallet', rootIdentity))
        .rejects.toThrow('Cannot deregister module with dependencies');

      // Step 8: Deregister Qmarket first, then Qwallet
      const qmarketDeregResult = await registrationService.deregisterModule('Qmarket', rootIdentity);
      expect(qmarketDeregResult).toBe(true);

      const qwalletDeregResult = await registrationService.deregisterModule('Qwallet', rootIdentity);
      expect(qwalletDeregResult).toBe(true);
    });
  });

  describe('Multi-Identity Workflow', () => {
    it('should handle DAO governance workflow for module registration', async () => {
      const daoIdentity = createMockIdentity(IdentityType.DAO);
      const moduleInfo = createMockModuleInfo('DAOModule', '1.0.0');

      // Step 1: Register module with DAO identity
      const request: ModuleRegistrationRequest = {
        moduleInfo
      };

      const result = await registrationService.registerModule(request, daoIdentity);
      expect(result.success).toBe(true);

      // Step 2: Verify DAO-specific metadata
      const registeredModule = await registrationService.getModule('DAOModule');
      expect(registeredModule?.metadata.activated_by).toBe(daoIdentity.did);

      // Step 3: Verify governance requirements are met
      const verificationResult = await registrationService.verifyModule('DAOModule');
      expect(verificationResult.status).toBe('production_ready');

      // Step 4: Test DAO-specific operations
      const updates = { version: '1.1.0' };
      const updateResult = await registrationService.updateModule('DAOModule', updates, daoIdentity);
      expect(updateResult.success).toBe(true);
    });

    it('should handle Enterprise module registration workflow', async () => {
      const enterpriseIdentity = createMockIdentity(IdentityType.ENTERPRISE);
      const moduleInfo = createMockModuleInfo('EnterpriseModule', '1.0.0');
      moduleInfo.compliance = {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: true,
        gdpr_compliant: true,
        data_retention_policy: 'enterprise_retention_10_years'
      };

      // Step 1: Register enterprise module
      const request: ModuleRegistrationRequest = {
        moduleInfo
      };

      const result = await registrationService.registerModule(request, enterpriseIdentity);
      expect(result.success).toBe(true);

      // Step 2: Verify enterprise compliance requirements
      const registeredModule = await registrationService.getModule('EnterpriseModule');
      expect(registeredModule?.metadata.compliance.kyc_support).toBe(true);
      expect(registeredModule?.metadata.compliance.gdpr_compliant).toBe(true);

      // Step 3: Verify enhanced verification for enterprise modules
      const verificationResult = await registrationService.verifyModule('EnterpriseModule');
      expect(verificationResult.verificationChecks.complianceVerified).toBe(true);
      expect(verificationResult.status).toBe('production_ready');
    });

    it('should reject unauthorized identity operations', async () => {
      const unauthorizedIdentity = createMockIdentity(IdentityType.AID);
      const moduleInfo = createMockModuleInfo('UnauthorizedModule', '1.0.0');

      // Step 1: Attempt registration with unauthorized identity
      const request: ModuleRegistrationRequest = {
        moduleInfo
      };

      await expect(registrationService.registerModule(request, unauthorizedIdentity))
        .rejects.toThrow(ModuleRegistrationError);

      // Step 2: Verify no module was registered
      const module = await registrationService.getModule('UnauthorizedModule');
      expect(module).toBeNull();

      // Step 3: Verify audit log contains rejection
      const auditEvents = testEnvironment.getAuditEvents();
      expect(auditEvents.some(e => 
        e.action === 'REGISTRATION_ERROR' && 
        e.details?.errorCode === 'UNAUTHORIZED_SIGNER'
      )).toBe(true);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from transient failures during registration', async () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      const moduleInfo = createMockModuleInfo('RecoveryTestModule', '1.0.0');

      // Step 1: Simulate transient failures
      let failureCount = 0;
      testEnvironment.simulateTransientFailures(() => {
        failureCount++;
        return failureCount <= 2; // Fail first 2 attempts
      });

      // Step 2: Attempt registration (should succeed after retries)
      const request: ModuleRegistrationRequest = {
        moduleInfo
      };

      const result = await registrationService.registerModule(request, rootIdentity);
      expect(result.success).toBe(true);
      expect(failureCount).toBe(3); // Should have retried twice

      // Step 3: Verify module was registered successfully
      const registeredModule = await registrationService.getModule('RecoveryTestModule');
      expect(registeredModule).toBeDefined();

      // Step 4: Verify audit trail includes retry attempts
      const auditEvents = testEnvironment.getAuditEvents();
      expect(auditEvents.some(e => e.action === 'REGISTRATION_ERROR')).toBe(true);
      expect(auditEvents.some(e => e.action === 'REGISTERED')).toBe(true);
    });

    it('should handle permanent failures gracefully', async () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      const moduleInfo = createMockModuleInfo('PermanentFailureModule', '1.0.0');

      // Step 1: Simulate permanent failure
      testEnvironment.simulatePermanentFailure('Qindex service permanently unavailable');

      // Step 2: Attempt registration (should fail after all retries)
      const request: ModuleRegistrationRequest = {
        moduleInfo
      };

      const result = await registrationService.registerModule(request, rootIdentity);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');

      // Step 3: Verify no module was registered
      const module = await registrationService.getModule('PermanentFailureModule');
      expect(module).toBeNull();

      // Step 4: Verify comprehensive error logging
      const auditEvents = testEnvironment.getAuditEvents();
      expect(auditEvents.some(e => e.action === 'REGISTRATION_FAILED')).toBe(true);
    });
  });

  describe('Performance and Scale Workflow', () => {
    it('should handle large-scale module registration efficiently', async () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);
      const moduleCount = 50;
      const modules: ModuleInfo[] = [];

      // Step 1: Prepare large number of modules
      for (let i = 1; i <= moduleCount; i++) {
        modules.push(createMockModuleInfo(`ScaleTestModule${i}`, '1.0.0'));
      }

      // Step 2: Register modules in batch
      const requests = modules.map(moduleInfo => ({ moduleInfo }));
      
      const startTime = Date.now();
      const results = await registrationService.registerModulesBatch(requests, rootIdentity);
      const endTime = Date.now();

      // Step 3: Verify all registrations succeeded
      expect(results.size).toBe(moduleCount);
      for (let i = 1; i <= moduleCount; i++) {
        expect(results.get(`ScaleTestModule${i}`)?.success).toBe(true);
      }

      // Step 4: Verify performance is acceptable
      const totalTime = endTime - startTime;
      const averageTimePerModule = totalTime / moduleCount;
      expect(averageTimePerModule).toBeLessThan(1000); // Less than 1 second per module

      // Step 5: Verify all modules are searchable
      const searchResult = await registrationService.searchModules({ limit: moduleCount });
      expect(searchResult.modules.length).toBe(moduleCount);
      expect(searchResult.totalCount).toBe(moduleCount);

      // Step 6: Verify batch verification works
      const moduleIds = modules.map(m => m.name);
      const verificationResults = await registrationService.verifyModulesBatch(moduleIds);
      expect(verificationResults.size).toBe(moduleCount);
    });

    it('should maintain performance with complex dependency graphs', async () => {
      const rootIdentity = createMockIdentity(IdentityType.ROOT);

      // Step 1: Create complex dependency structure
      const coreModules = ['Core1', 'Core2', 'Core3'];
      const midTierModules = ['Mid1', 'Mid2', 'Mid3', 'Mid4'];
      const topTierModules = ['Top1', 'Top2'];

      // Step 2: Register core modules
      for (const moduleName of coreModules) {
        const moduleInfo = createMockModuleInfo(moduleName, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };
        const result = await registrationService.registerModule(request, rootIdentity);
        expect(result.success).toBe(true);
      }

      // Step 3: Register mid-tier modules (depend on core)
      for (const moduleName of midTierModules) {
        const moduleInfo = createMockModuleInfo(moduleName, '1.0.0');
        moduleInfo.integrations = coreModules;
        const request: ModuleRegistrationRequest = { moduleInfo };
        const result = await registrationService.registerModule(request, rootIdentity);
        expect(result.success).toBe(true);
      }

      // Step 4: Register top-tier modules (depend on mid-tier)
      for (const moduleName of topTierModules) {
        const moduleInfo = createMockModuleInfo(moduleName, '1.0.0');
        moduleInfo.integrations = midTierModules;
        const request: ModuleRegistrationRequest = { moduleInfo };
        const result = await registrationService.registerModule(request, rootIdentity);
        expect(result.success).toBe(true);
      }

      // Step 5: Verify dependency resolution performance
      const startTime = Date.now();
      const dependencyResult = await registrationService.resolveDependencies(
        'Top1',
        midTierModules
      );
      const endTime = Date.now();

      expect(dependencyResult.resolved).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should resolve quickly

      // Step 6: Verify circular dependency detection performance
      const circularCheckStart = Date.now();
      const circularDeps = registrationService.detectCircularDependencies('Top1', ['Top2']);
      const circularCheckEnd = Date.now();

      expect(circularCheckEnd - circularCheckStart).toBeLessThan(500);
    });
  });
});