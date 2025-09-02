/**
 * Tests for ModuleSecurityValidationService
 * Comprehensive security validation layer testing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleSecurityValidationService } from '../ModuleSecurityValidationService';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleStatus,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleValidationError,
  SignatureVerificationError
} from '../../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';

describe('ModuleSecurityValidationService', () => {
  let service: ModuleSecurityValidationService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockValidRequest: ModuleRegistrationRequest;
  let mockValidMetadata: QModuleMetadata;
  let mockSignedMetadata: SignedModuleMetadata;

  beforeEach(() => {
    service = new ModuleSecurityValidationService();
    
    mockRootIdentity = {
      did: 'did:root:test123',
      type: IdentityType.ROOT,
      verified: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
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
        description: 'A valid test module for security validation testing',
        identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
        integrations: ['Qindex', 'Qlock'],
        repositoryUrl: 'https://github.com/test/test-module',
        documentationCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
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

    mockValidMetadata = {
      module: 'TestModule',
      version: '1.0.0',
      description: 'A valid test module for security validation testing',
      identities_supported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['Qindex', 'Qlock'],
      dependencies: [],
      status: ModuleStatus.PRODUCTION_READY,
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
      documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      activated_by: 'did:root:test123',
      timestamp: Date.now(),
      checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'key-123'
    };

    mockSignedMetadata = {
      metadata: mockValidMetadata,
      signature: 'mock-signature-12345678901234567890123456789012345678901234567890',
      publicKey: 'mock-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:root:test123'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRegistrationRequest', () => {
    it('should validate a valid registration request', async () => {
      const result = await service.validateRegistrationRequest(mockValidRequest, mockRootIdentity);
      
      // Log the result for debugging
      if (!result.valid) {
        console.log('Validation errors:', result.errors);
        console.log('Validation warnings:', result.warnings);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject request with invalid module name', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          name: 'Invalid Module Name!' // Contains invalid characters
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module name can only contain letters, numbers, hyphens, and underscores');
    });

    it('should reject request with invalid version format', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          version: 'invalid-version'
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module version must follow semantic versioning (e.g., 1.0.0)');
    });

    it('should reject request with short description', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'Short' // Too short
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module description must be at least 10 characters long');
    });

    it('should reject request with non-HTTPS repository URL', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          repositoryUrl: 'http://github.com/test/test-module' // HTTP instead of HTTPS
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository URL must use HTTPS protocol');
    });

    it('should reject request with blocked keywords', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This module contains malware and virus detection'
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('blocked keywords'))).toBe(true);
    });

    it('should reject request from unauthorized identity type', async () => {
      const result = await service.validateRegistrationRequest(mockValidRequest, mockDAOIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Only ROOT identities can perform module registration operations');
    });

    it('should reject request from unverified identity', async () => {
      const unverifiedIdentity = {
        ...mockRootIdentity,
        verified: false
      };

      const result = await service.validateRegistrationRequest(mockValidRequest, unverifiedIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Identity must be verified to perform module operations');
    });

    it('should enforce rate limiting', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(15).fill(null).map(() => 
        service.validateRegistrationRequest(mockValidRequest, mockRootIdentity)
      );

      const results = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResults = results.filter(result => 
        !result.valid && result.errors.some(error => error.includes('Rate limit'))
      );
      
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should detect suspicious patterns in description', async () => {
      const suspiciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This module uses eval() function and document.write for dynamic content'
        }
      };

      const result = await service.validateRegistrationRequest(suspiciousRequest, mockRootIdentity);
      
      // Should have warnings about suspicious patterns
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => warning.includes('Suspicious pattern'))).toBe(true);
    });
  });

  describe('validateSignedMetadata', () => {
    it('should validate valid signed metadata', async () => {
      const result = await service.validateSignedMetadata(mockSignedMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.identityVerified).toBe(true);
      expect(result.timestampValid).toBe(true);
    });

    it('should reject metadata with missing signature', async () => {
      const invalidMetadata = {
        ...mockSignedMetadata,
        signature: ''
      };

      const result = await service.validateSignedMetadata(invalidMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });

    it('should reject metadata with unsupported signature algorithm', async () => {
      const invalidMetadata = {
        ...mockSignedMetadata,
        signature_type: 'UNSUPPORTED-ALGORITHM'
      };

      const result = await service.validateSignedMetadata(invalidMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject metadata with future timestamp', async () => {
      const futureMetadata = {
        ...mockSignedMetadata,
        signed_at: Date.now() + (2 * 60 * 60 * 1000) // 2 hours in future
      };

      const result = await service.validateSignedMetadata(futureMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.timestampValid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject metadata with old timestamp', async () => {
      const oldMetadata = {
        ...mockSignedMetadata,
        signed_at: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago (older than 24h limit)
      };

      const result = await service.validateSignedMetadata(oldMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.timestampValid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should detect signature replay attacks', async () => {
      // First validation should succeed
      const result1 = await service.validateSignedMetadata(mockSignedMetadata, mockRootIdentity);
      expect(result1.valid).toBe(true);

      // Second validation with same signature should fail (replay attack)
      const result2 = await service.validateSignedMetadata(mockSignedMetadata, mockRootIdentity);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('replay attack');
    });

    it('should reject metadata with identity mismatch', async () => {
      const mismatchedMetadata = {
        ...mockSignedMetadata,
        signer_identity: 'did:different:identity'
      };

      const result = await service.validateSignedMetadata(mismatchedMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.identityVerified).toBe(false);
    });

    it('should detect potentially tampered signatures', async () => {
      const tamperedMetadata = {
        ...mockSignedMetadata,
        signature: 'short' // Too short to be valid
      };

      const result = await service.validateSignedMetadata(tamperedMetadata, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
    });
  });

  describe('sanitizeMetadata', () => {
    it('should sanitize metadata successfully', async () => {
      const result = await service.sanitizeMetadata(mockValidMetadata);
      
      expect(result).toBeDefined();
      expect(result.module).toBe(mockValidMetadata.module);
      expect(result.description).toBe(mockValidMetadata.description);
    });

    it('should remove script tags from description', async () => {
      const maliciousMetadata = {
        ...mockValidMetadata,
        description: 'Valid description <script>alert("xss")</script> with malicious content'
      };

      const result = await service.sanitizeMetadata(maliciousMetadata);
      
      expect(result.description).not.toContain('<script>');
      expect(result.description).not.toContain('alert');
    });

    it('should remove javascript URLs', async () => {
      const maliciousMetadata = {
        ...mockValidMetadata,
        description: 'Description with javascript:alert("xss") URL'
      };

      const result = await service.sanitizeMetadata(maliciousMetadata);
      
      expect(result.description).not.toContain('javascript:');
    });

    it('should validate IPFS CID format', async () => {
      const invalidMetadata = {
        ...mockValidMetadata,
        documentation: 'invalid-cid-format'
      };

      await expect(service.sanitizeMetadata(invalidMetadata)).rejects.toThrow(ModuleValidationError);
    });

    it('should sanitize integration names', async () => {
      const maliciousMetadata = {
        ...mockValidMetadata,
        integrations: ['ValidIntegration', '<script>alert("xss")</script>']
      };

      const result = await service.sanitizeMetadata(maliciousMetadata);
      
      expect(result.integrations[1]).not.toContain('<script>');
    });
  });

  describe('isIdentityAuthorized', () => {
    it('should authorize ROOT identity for registration', async () => {
      const result = await service.isIdentityAuthorized(mockRootIdentity, 'register');
      expect(result).toBe(true);
    });

    it('should not authorize DAO identity for registration', async () => {
      const result = await service.isIdentityAuthorized(mockDAOIdentity, 'register');
      expect(result).toBe(false);
    });

    it('should not authorize blocked identity', async () => {
      await service.blockIdentity(mockRootIdentity.did, 'Test block');
      
      const result = await service.isIdentityAuthorized(mockRootIdentity, 'register');
      expect(result).toBe(false);
      
      // Clean up
      await service.unblockIdentity(mockRootIdentity.did);
    });

    it('should authorize identity for update operations', async () => {
      const result = await service.isIdentityAuthorized(mockRootIdentity, 'update');
      expect(result).toBe(true);
    });

    it('should authorize identity for deregister operations', async () => {
      const result = await service.isIdentityAuthorized(mockRootIdentity, 'deregister');
      expect(result).toBe(true);
    });
  });

  describe('blockIdentity and unblockIdentity', () => {
    it('should block and unblock identity correctly', async () => {
      const identityDid = 'did:test:block123';
      
      // Initially should be authorized
      let result = await service.isIdentityAuthorized(mockRootIdentity, 'register');
      expect(result).toBe(true);
      
      // Block identity
      await service.blockIdentity(identityDid, 'Test blocking');
      
      // Should not be authorized after blocking
      const blockedIdentity = { ...mockRootIdentity, did: identityDid };
      result = await service.isIdentityAuthorized(blockedIdentity, 'register');
      expect(result).toBe(false);
      
      // Unblock identity
      await service.unblockIdentity(identityDid);
      
      // Should be authorized again after unblocking
      result = await service.isIdentityAuthorized(blockedIdentity, 'register');
      expect(result).toBe(true);
    });
  });

  describe('malicious content detection', () => {
    it('should detect blocked domains in repository URL', async () => {
      const maliciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          repositoryUrl: 'https://malware.com/evil-repo'
        }
      };

      await expect(service.validateRegistrationRequest(maliciousRequest, mockRootIdentity))
        .resolves.toMatchObject({
          valid: false,
          errors: expect.arrayContaining([expect.stringContaining('Blocked domain')])
        });
    });

    it('should detect suspicious patterns in metadata', async () => {
      const suspiciousRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This module contains eval() and innerHTML manipulation'
        }
      };

      const result = await service.validateRegistrationRequest(suspiciousRequest, mockRootIdentity);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => warning.includes('Suspicious pattern'))).toBe(true);
    });
  });

  describe('configuration and customization', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        rateLimiting: {
          enabled: false,
          maxRequestsPerMinute: 5,
          maxRequestsPerHour: 50,
          maxRequestsPerDay: 200,
          blockDuration: 10 * 60 * 1000
        }
      };

      const customService = new ModuleSecurityValidationService(customConfig);
      expect(customService).toBeDefined();
    });

    it('should merge custom configuration with defaults', async () => {
      const customConfig = {
        inputValidation: {
          maxDescriptionLength: 500,
          blockedKeywords: ['custom-blocked-word']
        }
      };

      const customService = new ModuleSecurityValidationService(customConfig);
      
      const requestWithCustomBlockedWord = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'This description contains custom-blocked-word which should be detected'
        }
      };

      const result = await customService.validateRegistrationRequest(requestWithCustomBlockedWord, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('custom-blocked-word'))).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty module name gracefully', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          name: ''
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module name is required');
    });

    it('should handle missing identity gracefully', async () => {
      const nullIdentity = null as any;

      await expect(service.validateRegistrationRequest(mockValidRequest, nullIdentity))
        .resolves.toMatchObject({
          valid: false,
          errors: expect.arrayContaining([expect.stringContaining('validation failed')])
        });
    });

    it('should handle malformed URLs gracefully', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          repositoryUrl: 'not-a-valid-url'
        }
      };

      const result = await service.validateRegistrationRequest(invalidRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository URL must use HTTPS protocol');
    });

    it('should handle very large metadata gracefully', async () => {
      const largeRequest = {
        ...mockValidRequest,
        moduleInfo: {
          ...mockValidRequest.moduleInfo,
          description: 'x'.repeat(10000) // Very long description
        }
      };

      const result = await service.validateRegistrationRequest(largeRequest, mockRootIdentity);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('characters or less'))).toBe(true);
    });
  });
});