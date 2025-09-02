/**
 * Integration Tests for Module Security Validation
 * Tests the complete security validation workflow integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleRegistrationService } from '../../ModuleRegistrationService';
import { moduleSecurityValidationService } from '../../ModuleSecurityValidationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleValidationError,
  SignatureVerificationError
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../../types/identity';

// Mock ecosystem services
vi.mock('../../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: () => ({
    registerModule: vi.fn().mockResolvedValue({
      success: true,
      cid: 'mock-cid',
      indexId: 'mock-index-id',
      timestamp: new Date().toISOString()
    }),
    getModule: vi.fn().mockResolvedValue(null),
    searchModules: vi.fn().mockResolvedValue({ modules: [], totalCount: 0, hasMore: false }),
    listSandboxModules: vi.fn().mockResolvedValue([]),
    promoteSandboxModule: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('../../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: () => ({
    logEvent: vi.fn().mockResolvedValue(true)
  })
}));

vi.mock('../../QModuleMetadataGenerator', () => ({
  qModuleMetadataGenerator: {
    generateMetadata: vi.fn().mockResolvedValue({
      module: 'TestModule',
      version: '1.0.0',
      description: 'Test module description',
      identities_supported: [IdentityType.ROOT],
      integrations: ['Qindex'],
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
      repository: 'https://github.com/test/test-module',
      documentation: 'QmTestDocumentationCID123456789',
      activated_by: 'did:root:test123',
      timestamp: Date.now(),
      checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'key-123'
    })
  }
}));

vi.mock('../../identity/IdentityQlockService', () => ({
  identityQlockService: {
    signMetadata: vi.fn().mockResolvedValue({
      metadata: {},
      signature: 'mock-signature-12345678901234567890123456789012345678901234567890',
      publicKey: 'mock-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:root:test123'
    }),
    verifyMetadataSignature: vi.fn().mockResolvedValue({
      valid: true,
      signatureValid: true,
      identityVerified: true,
      timestampValid: true
    }),
    hasModuleSigningAuthority: vi.fn().mockResolvedValue(true)
  }
}));

describe('Module Security Validation Integration', () => {
  let service: ModuleRegistrationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockValidRequest: ModuleRegistrationRequest;

  beforeEach(async () => {
    service = new ModuleRegistrationService();
    
    mockRootIdentity = {
      did: 'did:root:test123',
      type: IdentityType.ROOT,
      verified: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      publicKey: 'mock-public-key',
      address: 'mock-address'
    };

    mockDAOIdentity = {
      did: 'did:dao:test456',
      type: IdentityType.DAO,
      verified: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      publicKey: 'mock-dao-public-key',
      address: 'mock-dao-address'
    };

    mockValidRequest = {
      moduleInfo: {
        name: 'TestModule',
        version: '1.0.0',
        description: 'A valid test module for security validation integration testing',
        identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
        integrations: ['Qindex', 'Qlock'],
        repositoryUrl: 'https://github.com/test/test-module',
        documentationCid: 'QmTestDocumentationCID123456789',
        auditHash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        }
      },
      testMode: false,
      skipValidation: false
    };

    // Wait for service initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration Security Integration', () => {
    it('should successfully register module with valid security validation', async () => {
      const result = await service.registerModule(mockValidRequest, mockRootIdentity);
      
      expect(result.success).toBe(true);
      expect(result.moduleId).toBe('TestModule');
      expect(result.cid).toBeDefined();
      expect(result.indexId).toBeDefined();
    });

    it('should reject registration with invalid module name', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          name: 'Invalid Module Name!' // Contains invalid characters
        }
      };

      await expect(service.registerModule(invalidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration with blocked keywords', async () => {
      const maliciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This module contains malware and virus detection capabilities'
        }
      };

      await expect(service.registerModule(maliciousRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration from unauthorized identity type', async () => {
      await expect(service.registerModule(mockValidRequest, mockDAOIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration from unverified identity', async () => {
      const unverifiedIdentity = {
        ...mockRootIdentity,
        verified: false
      };

      await expect(service.registerModule(mockValidRequest, unverifiedIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration with non-HTTPS repository URL', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          repositoryUrl: 'http://github.com/test/test-module' // HTTP instead of HTTPS
        }
      };

      await expect(service.registerModule(invalidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration with invalid version format', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          version: 'invalid-version-format'
        }
      };

      await expect(service.registerModule(invalidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should reject registration with short description', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'Short' // Too short
        }
      };

      await expect(service.registerModule(invalidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should handle rate limiting during registration', async () => {
      // Make multiple rapid registration attempts
      const promises = Array(15).fill(null).map((_, index) => 
        service.registerModule({
          ...mockValidRequest,
          moduleInfo: {
            ...mockValidRequest.moduleInfo,
            name: `TestModule${index}`
          }
        }, mockRootIdentity).catch(error => error)
      );

      const results = await Promise.all(promises);
      
      // Some should succeed, some should be rate limited
      const errors = results.filter(result => result instanceof Error);
      const successes = results.filter(result => !(result instanceof Error));
      
      expect(errors.length).toBeGreaterThan(0);
      expect(successes.length).toBeGreaterThan(0);
    });

    it('should sanitize metadata during registration', async () => {
      const maliciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'Valid description <script>alert("xss")</script> with malicious content'
        }
      };

      // Should not throw due to sanitization
      const result = await service.registerModule(maliciousRequest, mockRootIdentity);
      expect(result.success).toBe(true);
    });
  });

  describe('Update Security Integration', () => {
    it('should reject update from unauthorized identity', async () => {
      await expect(service.updateModule('TestModule', { version: '1.1.0' }, mockDAOIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should allow update from authorized identity', async () => {
      // Mock existing module
      const mockExistingModule = {
        moduleId: 'TestModule',
        metadata: {
          module: 'TestModule',
          version: '1.0.0',
          description: 'Original description',
          identities_supported: [IdentityType.ROOT],
          integrations: ['Qindex'],
          dependencies: [],
          status: 'PRODUCTION_READY',
          audit_hash: 'original-hash',
          compliance: {
            audit: true,
            risk_scoring: true,
            privacy_enforced: true,
            kyc_support: false,
            gdpr_compliant: true,
            data_retention_policy: 'standard'
          },
          repository: 'https://github.com/test/test-module',
          documentation: 'QmOriginalDocCID',
          activated_by: 'did:root:test123',
          timestamp: Date.now() - 1000,
          checksum: 'original-checksum',
          signature_algorithm: 'RSA-SHA256',
          public_key_id: 'key-123'
        },
        signedMetadata: {},
        registrationInfo: {
          cid: 'original-cid',
          indexId: 'original-index',
          registeredAt: new Date().toISOString(),
          registeredBy: 'did:root:test123',
          status: 'PRODUCTION_READY',
          verificationStatus: 'VERIFIED',
          testMode: false
        },
        accessStats: {
          queryCount: 0,
          lastAccessed: new Date().toISOString(),
          dependentModules: []
        }
      };

      // Mock getModule to return existing module
      vi.mocked(await import('../../../backend/ecosystem/QindexService.mjs')).getQindexService().getModule
        .mockResolvedValueOnce(mockExistingModule);

      const result = await service.updateModule('TestModule', { version: '1.1.0' }, mockRootIdentity);
      expect(result.success).toBe(true);
    });
  });

  describe('Deregistration Security Integration', () => {
    it('should reject deregistration from unauthorized identity', async () => {
      await expect(service.deregisterModule('TestModule', mockDAOIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should allow deregistration from authorized identity', async () => {
      // Mock existing module
      const mockExistingModule = {
        moduleId: 'TestModule',
        metadata: {
          module: 'TestModule',
          version: '1.0.0'
        },
        registrationInfo: {
          status: 'PRODUCTION_READY'
        }
      };

      vi.mocked(await import('../../../backend/ecosystem/QindexService.mjs')).getQindexService().getModule
        .mockResolvedValueOnce(mockExistingModule);

      const result = await service.deregisterModule('TestModule', mockRootIdentity);
      expect(result).toBe(true);
    });
  });

  describe('Signature Security Integration', () => {
    it('should reject registration with tampered signature', async () => {
      // Mock signature verification to fail
      vi.mocked(await import('../../identity/IdentityQlockService')).identityQlockService.verifyMetadataSignature
        .mockResolvedValueOnce({
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Signature verification failed'
        });

      await expect(service.registerModule(mockValidRequest, mockRootIdentity))
        .rejects.toThrow(SignatureVerificationError);
    });

    it('should reject registration with replay attack', async () => {
      // First registration should succeed
      const result1 = await service.registerModule(mockValidRequest, mockRootIdentity);
      expect(result1.success).toBe(true);

      // Mock different module name to avoid "already exists" error
      const replayRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          name: 'ReplayModule'
        }
      };

      // Mock the security validation service to detect replay
      const originalValidateSignedMetadata = moduleSecurityValidationService.validateSignedMetadata;
      vi.spyOn(moduleSecurityValidationService, 'validateSignedMetadata')
        .mockResolvedValueOnce({
          valid: false,
          signatureValid: false,
          identityVerified: true,
          timestampValid: true,
          error: 'Signature replay attack detected - signature has already been used'
        });

      await expect(service.registerModule(replayRequest, mockRootIdentity))
        .rejects.toThrow(SignatureVerificationError);

      // Restore original method
      moduleSecurityValidationService.validateSignedMetadata = originalValidateSignedMetadata;
    });
  });

  describe('Identity Blocking Integration', () => {
    it('should reject operations from blocked identity', async () => {
      // Block the identity
      await moduleSecurityValidationService.blockIdentity(mockRootIdentity.did, 'Test blocking');

      // Should reject registration
      await expect(service.registerModule(mockValidRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);

      // Should reject update
      await expect(service.updateModule('TestModule', { version: '1.1.0' }, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);

      // Should reject deregistration
      await expect(service.deregisterModule('TestModule', mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);

      // Unblock for cleanup
      await moduleSecurityValidationService.unblockIdentity(mockRootIdentity.did);
    });

    it('should allow operations after unblocking identity', async () => {
      // Block and then unblock the identity
      await moduleSecurityValidationService.blockIdentity(mockRootIdentity.did, 'Test blocking');
      await moduleSecurityValidationService.unblockIdentity(mockRootIdentity.did);

      // Should allow registration after unblocking
      const result = await service.registerModule(mockValidRequest, mockRootIdentity);
      expect(result.success).toBe(true);
    });
  });

  describe('Malicious Content Detection Integration', () => {
    it('should detect and reject blocked domains', async () => {
      const maliciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          repositoryUrl: 'https://malware.com/evil-repo'
        }
      };

      await expect(service.registerModule(maliciousRequest, mockRootIdentity))
        .rejects.toThrow(ModuleRegistrationError);
    });

    it('should detect suspicious patterns and warn', async () => {
      const suspiciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This module uses eval() function for dynamic code execution'
        }
      };

      // Should succeed but with warnings
      const result = await service.registerModule(suspiciousRequest, mockRootIdentity);
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle network errors with retry', async () => {
      // Mock network error on first attempt, success on second
      let attemptCount = 0;
      vi.mocked(await import('../../../backend/ecosystem/QindexService.mjs')).getQindexService().registerModule
        .mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Network error');
          }
          return Promise.resolve({
            success: true,
            cid: 'mock-cid',
            indexId: 'mock-index-id',
            timestamp: new Date().toISOString()
          });
        });

      const result = await service.registerModule(mockValidRequest, mockRootIdentity);
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2); // Should have retried once
    });

    it('should fail after maximum retry attempts', async () => {
      // Mock persistent network error
      vi.mocked(await import('../../../backend/ecosystem/QindexService.mjs')).getQindexService().registerModule
        .mockRejectedValue(new Error('Persistent network error'));

      const result = await service.registerModule(mockValidRequest, mockRootIdentity);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent registrations with security validation', async () => {
      const concurrentRequests = Array(5).fill(null).map((_, index) => 
        service.registerModule({
          ...mockValidRequest,
          moduleInfo: {
            ...mockValidRequest.moduleInfo,
            name: `ConcurrentModule${index}`
          }
        }, mockRootIdentity)
      );

      const results = await Promise.allSettled(concurrentRequests);
      
      // Most should succeed (some might be rate limited)
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );
      
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should maintain performance with security validation enabled', async () => {
      const startTime = Date.now();
      
      await service.registerModule(mockValidRequest, mockRootIdentity);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });
});