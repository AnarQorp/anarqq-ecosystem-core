/**
 * Integration Tests for ModuleRegistrationService
 * Tests the complete module registration workflow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleRegistrationService } from '../../ModuleRegistrationService';
import { qModuleMetadataGenerator } from '../../QModuleMetadataGenerator';
import { identityQlockService } from '../../identity/IdentityQlockService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleStatus,
  QModuleMetadata,
  SignedModuleMetadata
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../../types/identity';

// Mock ecosystem services
const mockQindexService = {
  registerModule: vi.fn(),
  getModule: vi.fn(),
  searchModules: vi.fn(),
  promoteSandboxModule: vi.fn(),
  listSandboxModules: vi.fn()
};

const mockQerberosService = {
  logEvent: vi.fn()
};

vi.mock('../../../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: () => mockQindexService
}));

vi.mock('../../../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: () => mockQerberosService
}));

describe('ModuleRegistrationService Integration', () => {
  let service: ModuleRegistrationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockModuleInfo: ModuleInfo;
  let mockMetadata: QModuleMetadata;
  let mockSignedMetadata: SignedModuleMetadata;

  beforeEach(async () => {
    service = new ModuleRegistrationService();
    
    mockRootIdentity = {
      did: 'did:squid:root:integration-test',
      type: IdentityType.ROOT,
      displayName: 'Integration Test Root',
      publicKey: 'integration-test-public-key',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      permissions: ['module_registration'],
      metadata: {}
    };

    mockModuleInfo = {
      name: 'IntegrationTestModule',
      version: '1.0.0',
      description: 'A module for integration testing the registration service',
      identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['Qindex', 'Qlock', 'Qerberos'],
      repositoryUrl: 'https://github.com/test/integration-test-module',
      documentationCid: 'QmIntegrationTestDocs123',
      auditHash: 'c'.repeat(64),
      compliance: {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'audit_retention_5_years'
      }
    };

    mockMetadata = {
      module: mockModuleInfo.name,
      version: mockModuleInfo.version,
      description: mockModuleInfo.description,
      identities_supported: mockModuleInfo.identitiesSupported,
      integrations: mockModuleInfo.integrations,
      dependencies: ['Qindex', 'Qlock'],
      status: ModuleStatus.TESTING,
      audit_hash: mockModuleInfo.auditHash!,
      compliance: mockModuleInfo.compliance!,
      repository: mockModuleInfo.repositoryUrl,
      documentation: mockModuleInfo.documentationCid!,
      activated_by: mockRootIdentity.did,
      timestamp: Date.now(),
      checksum: 'd'.repeat(64),
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'integration-test-key-id'
    };

    mockSignedMetadata = {
      metadata: mockMetadata,
      signature: 'integration-test-signature',
      publicKey: mockRootIdentity.publicKey,
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: mockRootIdentity.did
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Registration Workflow', () => {
    it('should complete full module registration workflow', async () => {
      // Setup mocks for successful registration
      vi.spyOn(identityQlockService, 'verifySignerAuthority').mockResolvedValue(true);
      vi.spyOn(qModuleMetadataGenerator, 'generateMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(identityQlockService, 'signMetadata').mockResolvedValue(mockSignedMetadata);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      mockQindexService.getModule.mockResolvedValue(null); // Module doesn't exist
      mockQindexService.registerModule.mockResolvedValue({
        success: true,
        moduleId: mockModuleInfo.name,
        cid: 'QmIntegrationTestCID123',
        indexId: 'integration-test-index-id',
        timestamp: new Date().toISOString()
      });

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: false,
        skipValidation: false
      };

      // Execute registration
      const result = await service.registerModule(request, mockRootIdentity);

      // Verify successful registration
      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.cid).toBe('QmIntegrationTestCID123');
      expect(result.indexId).toBe('integration-test-index-id');

      // Verify all services were called correctly
      expect(identityQlockService.verifySignerAuthority).toHaveBeenCalledWith(
        mockRootIdentity.did,
        mockModuleInfo.name
      );
      expect(qModuleMetadataGenerator.generateMetadata).toHaveBeenCalledWith(
        mockModuleInfo,
        expect.objectContaining({
          activatedBy: mockRootIdentity.did,
          publicKeyId: `${mockRootIdentity.did}_module_key`,
          signatureAlgorithm: 'RSA-SHA256'
        })
      );
      expect(identityQlockService.signMetadata).toHaveBeenCalledWith(
        mockMetadata,
        mockRootIdentity.did
      );
      expect(identityQlockService.verifyMetadataSignature).toHaveBeenCalledWith(mockSignedMetadata);
      expect(mockQindexService.registerModule).toHaveBeenCalledWith(
        mockModuleInfo.name,
        mockSignedMetadata,
        expect.objectContaining({
          testMode: false,
          skipDependencyCheck: false
        })
      );
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MODULE_REGISTRATION',
          action: 'REGISTERED',
          squidId: mockRootIdentity.did,
          moduleId: mockModuleInfo.name,
          success: true
        })
      );
    });

    it('should handle registration failure and log appropriately', async () => {
      // Setup mocks for failed registration
      vi.spyOn(identityQlockService, 'verifySignerAuthority').mockResolvedValue(true);
      vi.spyOn(qModuleMetadataGenerator, 'generateMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(identityQlockService, 'signMetadata').mockResolvedValue(mockSignedMetadata);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: true,
        timestampValid: true,
        error: 'Signature verification failed'
      });

      mockQindexService.getModule.mockResolvedValue(null);

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: false,
        skipValidation: false
      };

      // Execute registration
      const result = await service.registerModule(request, mockRootIdentity);

      // Verify failed registration
      expect(result.success).toBe(false);
      expect(result.error).toContain('Signature verification failed');

      // Verify failure was logged
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'MODULE_REGISTRATION',
          action: 'REGISTRATION_FAILED',
          squidId: mockRootIdentity.did,
          moduleId: mockModuleInfo.name,
          success: false,
          error: expect.stringContaining('Signature verification failed')
        })
      );
    });
  });

  describe('Module Update Workflow', () => {
    it('should complete full module update workflow', async () => {
      const existingModule = {
        moduleId: mockModuleInfo.name,
        metadata: mockMetadata,
        signedMetadata: mockSignedMetadata,
        registrationInfo: {
          cid: 'QmOldCID123',
          indexId: 'old-index-id',
          registeredAt: new Date().toISOString(),
          registeredBy: mockRootIdentity.did,
          status: ModuleStatus.TESTING,
          verificationStatus: 'VERIFIED' as const,
          testMode: false
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      };

      const updates = {
        version: '1.1.0',
        description: 'Updated integration test module'
      };

      const updatedMetadata = {
        ...mockMetadata,
        version: updates.version,
        description: updates.description,
        timestamp: Date.now()
      };

      const updatedSignedMetadata = {
        ...mockSignedMetadata,
        metadata: updatedMetadata,
        signed_at: Date.now()
      };

      // Setup mocks
      vi.spyOn(identityQlockService, 'verifySignerAuthority').mockResolvedValue(true);
      vi.spyOn(qModuleMetadataGenerator, 'generateMetadata').mockResolvedValue(updatedMetadata);
      vi.spyOn(identityQlockService, 'signMetadata').mockResolvedValue(updatedSignedMetadata);

      mockQindexService.getModule.mockResolvedValue(existingModule);
      mockQindexService.registerModule.mockResolvedValue({
        success: true,
        moduleId: mockModuleInfo.name,
        cid: 'QmUpdatedCID123',
        indexId: 'updated-index-id',
        timestamp: new Date().toISOString()
      });

      // Execute update
      const result = await service.updateModule(mockModuleInfo.name, updates, mockRootIdentity);

      // Verify successful update
      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.cid).toBe('QmUpdatedCID123');

      // Verify services were called correctly
      expect(qModuleMetadataGenerator.generateMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          version: updates.version,
          description: updates.description
        }),
        expect.any(Object)
      );
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATED',
          success: true,
          metadata: expect.objectContaining({
            previousVersion: mockMetadata.version,
            newVersion: updates.version
          })
        })
      );
    });
  });

  describe('Module Search and Discovery', () => {
    it('should search modules with various criteria', async () => {
      const mockSearchResults = {
        modules: [
          {
            moduleId: mockModuleInfo.name,
            metadata: mockMetadata,
            signedMetadata: mockSignedMetadata,
            registrationInfo: {
              cid: 'QmSearchTestCID123',
              indexId: 'search-test-index-id',
              registeredAt: new Date().toISOString(),
              registeredBy: mockRootIdentity.did,
              status: ModuleStatus.TESTING,
              verificationStatus: 'VERIFIED' as const,
              testMode: false
            },
            accessStats: {
              queryCount: 5,
              lastAccessed: new Date().toISOString(),
              dependentModules: []
            }
          }
        ],
        totalCount: 1,
        hasMore: false
      };

      mockQindexService.searchModules.mockResolvedValue(mockSearchResults);

      const searchCriteria = {
        name: 'Integration',
        status: ModuleStatus.TESTING,
        identityType: IdentityType.ROOT,
        integration: 'Qindex'
      };

      // Execute search
      const result = await service.searchModules(searchCriteria);

      // Verify search results
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].moduleId).toBe(mockModuleInfo.name);
      expect(result.totalCount).toBe(1);
      expect(result.hasMore).toBe(false);

      // Verify search was called with correct criteria
      expect(mockQindexService.searchModules).toHaveBeenCalledWith(searchCriteria);
    });

    it('should list all modules with pagination', async () => {
      const mockListResults = {
        modules: [
          {
            moduleId: 'Module1',
            metadata: { ...mockMetadata, module: 'Module1' },
            signedMetadata: mockSignedMetadata,
            registrationInfo: {},
            accessStats: {}
          },
          {
            moduleId: 'Module2',
            metadata: { ...mockMetadata, module: 'Module2' },
            signedMetadata: mockSignedMetadata,
            registrationInfo: {},
            accessStats: {}
          }
        ],
        totalCount: 2,
        hasMore: false
      };

      mockQindexService.searchModules.mockResolvedValue(mockListResults);

      // Execute list
      const result = await service.listModules({ limit: 10, offset: 0 });

      // Verify list results
      expect(result.modules).toHaveLength(2);
      expect(result.totalCount).toBe(2);

      // Verify search was called with list parameters
      expect(mockQindexService.searchModules).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          includeTestMode: false
        })
      );
    });
  });

  describe('Module Verification Workflow', () => {
    it('should verify module with all checks passing', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: mockMetadata,
        signedMetadata: mockSignedMetadata,
        registrationInfo: {},
        accessStats: {}
      };

      mockQindexService.getModule.mockResolvedValue(mockModule);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      // Mock dependency verification (all dependencies exist)
      vi.spyOn(service as any, 'verifyDependencies').mockResolvedValue(true);
      vi.spyOn(service as any, 'verifyCompliance').mockResolvedValue(true);
      vi.spyOn(service as any, 'verifyAudit').mockResolvedValue(true);

      // Execute verification
      const result = await service.verifyModule(mockModuleInfo.name);

      // Verify verification results
      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.status).toBe('production_ready');
      expect(result.verificationChecks.metadataValid).toBe(true);
      expect(result.verificationChecks.signatureValid).toBe(true);
      expect(result.verificationChecks.dependenciesResolved).toBe(true);
      expect(result.verificationChecks.complianceVerified).toBe(true);
      expect(result.verificationChecks.auditPassed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify verification issues', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: mockMetadata,
        signedMetadata: mockSignedMetadata,
        registrationInfo: {},
        accessStats: {}
      };

      mockQindexService.getModule.mockResolvedValue(mockModule);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: true,
        timestampValid: true,
        error: 'Invalid signature'
      });

      // Mock some checks failing
      vi.spyOn(service as any, 'verifyDependencies').mockResolvedValue(false);
      vi.spyOn(service as any, 'verifyCompliance').mockResolvedValue(true);
      vi.spyOn(service as any, 'verifyAudit').mockResolvedValue(false);

      // Execute verification
      const result = await service.verifyModule(mockModuleInfo.name);

      // Verify verification results show issues
      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.signatureValid).toBe(false);
      expect(result.verificationChecks.dependenciesResolved).toBe(false);
      expect(result.verificationChecks.auditPassed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.code === 'INVALID_SIGNATURE')).toBe(true);
      expect(result.issues.some(issue => issue.code === 'UNRESOLVED_DEPENDENCIES')).toBe(true);
      expect(result.issues.some(issue => issue.code === 'AUDIT_UNVERIFIED')).toBe(true);
    });
  });

  describe('Sandbox Module Workflow', () => {
    it('should register and promote sandbox module', async () => {
      // Setup mocks for sandbox registration
      vi.spyOn(identityQlockService, 'verifySignerAuthority').mockResolvedValue(true);
      vi.spyOn(qModuleMetadataGenerator, 'generateMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(identityQlockService, 'signMetadata').mockResolvedValue(mockSignedMetadata);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      mockQindexService.getModule.mockResolvedValue(null);
      mockQindexService.registerModule.mockResolvedValue({
        success: true,
        moduleId: mockModuleInfo.name,
        cid: 'QmSandboxCID123',
        indexId: 'sandbox-index-id',
        timestamp: new Date().toISOString()
      });

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: true,
        skipValidation: false
      };

      // Register in sandbox
      const registrationResult = await service.registerSandboxModule(request, mockRootIdentity);

      expect(registrationResult.success).toBe(true);
      expect(mockQindexService.registerModule).toHaveBeenCalledWith(
        mockModuleInfo.name,
        mockSignedMetadata,
        expect.objectContaining({ testMode: true })
      );

      // Setup mocks for promotion
      mockQindexService.promoteSandboxModule.mockResolvedValue(true);
      vi.spyOn(service, 'verifyModule').mockResolvedValue({
        moduleId: mockModuleInfo.name,
        status: 'production_ready',
        verificationChecks: {
          metadataValid: true,
          signatureValid: true,
          dependenciesResolved: true,
          complianceVerified: true,
          auditPassed: true
        },
        issues: [],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      });

      // Promote to production
      const promotionResult = await service.promoteSandboxModule(mockModuleInfo.name, mockRootIdentity);

      expect(promotionResult).toBe(true);
      expect(mockQindexService.promoteSandboxModule).toHaveBeenCalledWith(mockModuleInfo.name);
      expect(mockQerberosService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROMOTED',
          success: true
        })
      );
    });
  });

  describe('Registration Status and History', () => {
    it('should track registration history', async () => {
      // Setup successful registration
      vi.spyOn(identityQlockService, 'verifySignerAuthority').mockResolvedValue(true);
      vi.spyOn(qModuleMetadataGenerator, 'generateMetadata').mockResolvedValue(mockMetadata);
      vi.spyOn(identityQlockService, 'signMetadata').mockResolvedValue(mockSignedMetadata);
      vi.spyOn(identityQlockService, 'verifyMetadataSignature').mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      mockQindexService.getModule.mockResolvedValue(null);
      mockQindexService.registerModule.mockResolvedValue({
        success: true,
        moduleId: mockModuleInfo.name,
        cid: 'QmHistoryCID123',
        indexId: 'history-index-id',
        timestamp: new Date().toISOString()
      });

      const request: ModuleRegistrationRequest = {
        moduleInfo: mockModuleInfo,
        testMode: false,
        skipValidation: false
      };

      // Execute registration
      await service.registerModule(request, mockRootIdentity);

      // Check registration history
      const history = await service.getRegistrationHistory(mockModuleInfo.name);

      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('REGISTERED');
      expect(history[0].performedBy).toBe(mockRootIdentity.did);
      expect(history[0].success).toBe(true);
      expect(history[0].details).toEqual(
        expect.objectContaining({
          version: mockMetadata.version,
          status: mockMetadata.status,
          testMode: false
        })
      );
    });

    it('should provide complete registration info', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: mockMetadata,
        signedMetadata: mockSignedMetadata,
        registrationInfo: {
          cid: 'QmInfoCID123',
          indexId: 'info-index-id',
          registeredAt: new Date().toISOString(),
          registeredBy: mockRootIdentity.did,
          status: ModuleStatus.TESTING,
          verificationStatus: 'VERIFIED' as const,
          testMode: false
        },
        accessStats: {
          queryCount: 10,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      };

      mockQindexService.getModule.mockResolvedValue(mockModule);
      
      // Mock other service calls
      vi.spyOn(service, 'verifyModule').mockResolvedValue({
        moduleId: mockModuleInfo.name,
        status: 'production_ready',
        verificationChecks: {
          metadataValid: true,
          signatureValid: true,
          dependenciesResolved: true,
          complianceVerified: true,
          auditPassed: true
        },
        issues: [],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      });

      // Get registration info
      const info = await service.getRegistrationInfo(mockModuleInfo.name);

      expect(info).toBeDefined();
      expect(info!.moduleId).toBe(mockModuleInfo.name);
      expect(info!.registrationResult.success).toBe(true);
      expect(info!.verificationResult.status).toBe('production_ready');
      expect(info!.currentStatus.registered).toBe(true);
    });
  });
});