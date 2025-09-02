/**
 * Tests for ModuleRegistrationService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleRegistrationService } from '../ModuleRegistrationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleStatus,
  ModuleRegistrationErrorCode
} from '../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';

// Mock the ecosystem services
vi.mock('../../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: () => ({
    registerModule: vi.fn(),
    getModule: vi.fn(),
    searchModules: vi.fn(),
    promoteSandboxModule: vi.fn(),
    listSandboxModules: vi.fn()
  })
}));

vi.mock('../../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: () => ({
    logEvent: vi.fn()
  })
}));

// Mock the identity services
vi.mock('../identity/IdentityQlockService', () => ({
  identityQlockService: {
    verifySignerAuthority: vi.fn(),
    signMetadata: vi.fn(),
    verifyMetadataSignature: vi.fn()
  }
}));

// Mock the metadata generator
vi.mock('../QModuleMetadataGenerator', () => ({
  qModuleMetadataGenerator: {
    generateMetadata: vi.fn()
  }
}));

describe('ModuleRegistrationService', () => {
  let service: ModuleRegistrationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockModuleInfo: ModuleInfo;
  let mockRegistrationRequest: ModuleRegistrationRequest;

  beforeEach(() => {
    service = new ModuleRegistrationService();
    
    mockRootIdentity = {
      did: 'did:squid:root:test123',
      type: IdentityType.ROOT,
      displayName: 'Test Root Identity',
      publicKey: 'test-public-key',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      permissions: ['module_registration'],
      metadata: {}
    };

    mockDAOIdentity = {
      did: 'did:squid:dao:test456',
      type: IdentityType.DAO,
      displayName: 'Test DAO Identity',
      publicKey: 'test-dao-public-key',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      permissions: [],
      metadata: {}
    };

    mockModuleInfo = {
      name: 'TestModule',
      version: '1.0.0',
      description: 'A test module for unit testing',
      identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['Qindex', 'Qlock'],
      repositoryUrl: 'https://github.com/test/test-module',
      documentationCid: 'QmTestDocumentation123',
      auditHash: 'a'.repeat(64),
      compliance: {
        audit: true,
        risk_scoring: false,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'standard_retention_2_years'
      }
    };

    mockRegistrationRequest = {
      moduleInfo: mockModuleInfo,
      testMode: false,
      skipValidation: false
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerModule', () => {
    it('should successfully register a new module with ROOT identity', async () => {
      // Mock successful registration flow
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      const { qModuleMetadataGenerator } = await import('../QModuleMetadataGenerator');
      
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);
      vi.mocked(qModuleMetadataGenerator.generateMetadata).mockResolvedValue({
        module: mockModuleInfo.name,
        version: mockModuleInfo.version,
        description: mockModuleInfo.description,
        identities_supported: mockModuleInfo.identitiesSupported,
        integrations: mockModuleInfo.integrations,
        dependencies: [],
        status: ModuleStatus.TESTING,
        audit_hash: mockModuleInfo.auditHash!,
        compliance: mockModuleInfo.compliance!,
        repository: mockModuleInfo.repositoryUrl,
        documentation: mockModuleInfo.documentationCid!,
        activated_by: mockRootIdentity.did,
        timestamp: Date.now(),
        checksum: 'b'.repeat(64),
        signature_algorithm: 'RSA-SHA256',
        public_key_id: 'test-key-id'
      });

      vi.mocked(identityQlockService.signMetadata).mockResolvedValue({
        metadata: {} as any,
        signature: 'test-signature',
        publicKey: 'test-public-key',
        signature_type: 'RSA-SHA256',
        signed_at: Date.now(),
        signer_identity: mockRootIdentity.did
      });

      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      // Mock Qindex service
      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null), // Module doesn't exist yet
        registerModule: vi.fn().mockResolvedValue({
          success: true,
          cid: 'QmTestCID123',
          indexId: 'test-index-id',
          timestamp: new Date().toISOString()
        })
      };

      // Mock the service initialization
      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const result = await service.registerModule(mockRegistrationRequest, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.cid).toBe('QmTestCID123');
      expect(result.indexId).toBe('test-index-id');
      expect(mockQindexService.registerModule).toHaveBeenCalledWith(
        mockModuleInfo.name,
        expect.any(Object),
        expect.objectContaining({
          testMode: false,
          skipDependencyCheck: false
        })
      );
    });

    it('should reject registration with non-ROOT identity', async () => {
      const result = await service.registerModule(mockRegistrationRequest, mockDAOIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only ROOT identities can register modules');
    });

    it('should reject registration if module already exists', async () => {
      // Mock existing module
      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue({
          moduleId: mockModuleInfo.name,
          metadata: {},
          signedMetadata: {},
          registrationInfo: {}
        })
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);

      const result = await service.registerModule(mockRegistrationRequest, mockRootIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Module already registered');
    });

    it('should handle signature verification failure', async () => {
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      const { qModuleMetadataGenerator } = await import('../QModuleMetadataGenerator');
      
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);
      vi.mocked(qModuleMetadataGenerator.generateMetadata).mockResolvedValue({} as any);
      vi.mocked(identityQlockService.signMetadata).mockResolvedValue({} as any);
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: 'Invalid signature'
      });

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const result = await service.registerModule(mockRegistrationRequest, mockRootIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });

    it('should register module in test mode', async () => {
      const testRequest = {
        ...mockRegistrationRequest,
        testMode: true
      };

      const { identityQlockService } = await import('../identity/IdentityQlockService');
      const { qModuleMetadataGenerator } = await import('../QModuleMetadataGenerator');
      
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);
      vi.mocked(qModuleMetadataGenerator.generateMetadata).mockResolvedValue({} as any);
      vi.mocked(identityQlockService.signMetadata).mockResolvedValue({} as any);
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null),
        registerModule: vi.fn().mockResolvedValue({
          success: true,
          cid: 'QmTestCID123',
          indexId: 'test-index-id',
          timestamp: new Date().toISOString()
        })
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const result = await service.registerModule(testRequest, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(mockQindexService.registerModule).toHaveBeenCalledWith(
        mockModuleInfo.name,
        expect.any(Object),
        expect.objectContaining({
          testMode: true,
          skipDependencyCheck: false
        })
      );
    });
  });

  describe('updateModule', () => {
    it('should successfully update an existing module', async () => {
      const updates = {
        version: '1.1.0',
        description: 'Updated test module description'
      };

      const existingModule = {
        moduleId: mockModuleInfo.name,
        metadata: {
          module: mockModuleInfo.name,
          version: '1.0.0',
          description: mockModuleInfo.description,
          identities_supported: mockModuleInfo.identitiesSupported,
          integrations: mockModuleInfo.integrations,
          repository: mockModuleInfo.repositoryUrl,
          documentation: mockModuleInfo.documentationCid,
          audit_hash: mockModuleInfo.auditHash,
          compliance: mockModuleInfo.compliance
        },
        registrationInfo: {
          testMode: false
        }
      };

      const { identityQlockService } = await import('../identity/IdentityQlockService');
      const { qModuleMetadataGenerator } = await import('../QModuleMetadataGenerator');
      
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);
      vi.mocked(qModuleMetadataGenerator.generateMetadata).mockResolvedValue({} as any);
      vi.mocked(identityQlockService.signMetadata).mockResolvedValue({} as any);

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(existingModule),
        registerModule: vi.fn().mockResolvedValue({
          success: true,
          cid: 'QmUpdatedCID123',
          indexId: 'updated-index-id',
          timestamp: new Date().toISOString()
        })
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const result = await service.updateModule(mockModuleInfo.name, updates, mockRootIdentity);

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(mockQindexService.registerModule).toHaveBeenCalled();
    });

    it('should reject update for non-existent module', async () => {
      const updates = { version: '1.1.0' };

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      const result = await service.updateModule(mockModuleInfo.name, updates, mockRootIdentity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Module not found');
    });
  });

  describe('getModule', () => {
    it('should return module if it exists', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: {},
        signedMetadata: {},
        registrationInfo: {}
      };

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(mockModule)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.getModule(mockModuleInfo.name);

      expect(result).toEqual(mockModule);
      expect(mockQindexService.getModule).toHaveBeenCalledWith(mockModuleInfo.name);
    });

    it('should return null if module does not exist', async () => {
      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.getModule('NonExistentModule');

      expect(result).toBeNull();
    });
  });

  describe('searchModules', () => {
    it('should return search results', async () => {
      const searchCriteria = {
        name: 'Test',
        status: ModuleStatus.TESTING
      };

      const mockSearchResult = {
        modules: [
          {
            moduleId: mockModuleInfo.name,
            metadata: {},
            signedMetadata: {},
            registrationInfo: {}
          }
        ],
        totalCount: 1,
        hasMore: false
      };

      const mockQindexService = {
        searchModules: vi.fn().mockResolvedValue(mockSearchResult)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.searchModules(searchCriteria);

      expect(result).toEqual(mockSearchResult);
      expect(mockQindexService.searchModules).toHaveBeenCalledWith(searchCriteria);
    });

    it('should handle search errors gracefully', async () => {
      const mockQindexService = {
        searchModules: vi.fn().mockRejectedValue(new Error('Search failed'))
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.searchModules({});

      expect(result).toEqual({
        modules: [],
        totalCount: 0,
        hasMore: false
      });
    });
  });

  describe('verifyModule', () => {
    it('should return verification result for valid module', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: {
          dependencies: [],
          compliance: mockModuleInfo.compliance,
          audit_hash: mockModuleInfo.auditHash
        },
        signedMetadata: {}
      };

      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(mockModule)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.verifyModule(mockModuleInfo.name);

      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.status).toBe('production_ready');
      expect(result.verificationChecks.signatureValid).toBe(true);
    });

    it('should return invalid status for non-existent module', async () => {
      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.verifyModule('NonExistentModule');

      expect(result.moduleId).toBe('NonExistentModule');
      expect(result.status).toBe('invalid');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('promoteSandboxModule', () => {
    it('should successfully promote a valid sandbox module', async () => {
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);

      const mockQindexService = {
        promoteSandboxModule: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;
      (service as any).qerberosService = { logEvent: vi.fn() };

      // Mock verifyModule to return valid status
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

      const result = await service.promoteSandboxModule(mockModuleInfo.name, mockRootIdentity);

      expect(result).toBe(true);
      expect(mockQindexService.promoteSandboxModule).toHaveBeenCalledWith(mockModuleInfo.name);
    });

    it('should reject promotion of invalid module', async () => {
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifySignerAuthority).mockResolvedValue(true);

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qerberosService = { logEvent: vi.fn() };

      // Mock verifyModule to return invalid status
      vi.spyOn(service, 'verifyModule').mockResolvedValue({
        moduleId: mockModuleInfo.name,
        status: 'invalid',
        verificationChecks: {
          metadataValid: false,
          signatureValid: false,
          dependenciesResolved: false,
          complianceVerified: false,
          auditPassed: false
        },
        issues: [{ severity: 'ERROR', code: 'INVALID_SIGNATURE', message: 'Invalid signature' }],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      });

      const result = await service.promoteSandboxModule(mockModuleInfo.name, mockRootIdentity);

      expect(result).toBe(false);
    });
  });

  describe('getRegistrationStatus', () => {
    it('should return status for existing module', async () => {
      const mockModule = {
        moduleId: mockModuleInfo.name,
        metadata: {
          status: ModuleStatus.TESTING
        }
      };

      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(mockModule)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      // Mock verifyModule
      vi.spyOn(service, 'verifyModule').mockResolvedValue({
        moduleId: mockModuleInfo.name,
        status: 'testing',
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

      const result = await service.getRegistrationStatus(mockModuleInfo.name);

      expect(result.moduleId).toBe(mockModuleInfo.name);
      expect(result.status).toBe(ModuleStatus.TESTING);
      expect(result.registered).toBe(true);
      expect(result.verified).toBe(false); // testing status is not production_ready
    });

    it('should return unregistered status for non-existent module', async () => {
      const mockQindexService = {
        getModule: vi.fn().mockResolvedValue(null)
      };

      vi.spyOn(service as any, 'initializeServices').mockResolvedValue(undefined);
      (service as any).qindexService = mockQindexService;

      const result = await service.getRegistrationStatus('NonExistentModule');

      expect(result.moduleId).toBe('NonExistentModule');
      expect(result.registered).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.issues).toContain('Module not found in registry');
    });
  });
});