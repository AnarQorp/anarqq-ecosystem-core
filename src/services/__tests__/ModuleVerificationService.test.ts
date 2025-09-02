/**
 * Tests for ModuleVerificationService
 * Comprehensive testing of module verification functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ModuleVerificationService } from '../ModuleVerificationService';
import {
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleStatus,
  ModuleCompliance,
  VerificationResult,
  ModuleVerificationResult
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

// Mock IdentityQlockService
vi.mock('../identity/IdentityQlockService', () => ({
  identityQlockService: {
    verifyMetadataSignature: vi.fn()
  }
}));

describe('ModuleVerificationService', () => {
  let service: ModuleVerificationService;
  let mockMetadata: QModuleMetadata;
  let mockSignedMetadata: SignedModuleMetadata;
  let mockCompliance: ModuleCompliance;

  beforeEach(() => {
    service = new ModuleVerificationService();
    
    mockCompliance = {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard'
    };

    mockMetadata = {
      module: 'TestModule',
      version: '1.0.0',
      description: 'A test module for verification testing',
      identities_supported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['Qindex', 'Qlock'],
      dependencies: ['BaseModule'],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890'.substring(0, 64),
      compliance: mockCompliance,
      repository: 'https://github.com/test/test-module',
      documentation: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
      changelog: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh52',
      activated_by: 'did:example:123456789abcdefghi',
      timestamp: Date.now(),
      expires_at: Date.now() + (365 * 24 * 60 * 60 * 1000),
      checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890'.substring(0, 64),
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'key-123'
    };

    mockSignedMetadata = {
      metadata: mockMetadata,
      signature: 'mock-signature-data',
      publicKey: 'mock-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:example:123456789abcdefghi'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearCache();
  });

  describe('verifyModule', () => {
    it('should return valid verification result for valid module', async () => {
      // Mock successful signature verification
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.moduleId).toBe('TestModule');
      expect(result.status).toBe('production_ready');
      expect(result.verificationChecks.metadataValid).toBe(true);
      expect(result.verificationChecks.signatureValid).toBe(true);
      expect(result.verificationChecks.dependenciesResolved).toBe(true);
      expect(result.verificationChecks.complianceVerified).toBe(true);
      expect(result.verificationChecks.auditPassed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return invalid status for module with signature verification failure', async () => {
      // Mock failed signature verification
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: 'Invalid signature'
      });

      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.moduleId).toBe('TestModule');
      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.signatureValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'SIGNATURE_INVALID'
        })
      );
    });

    it('should return testing status for module with testing status', async () => {
      // Mock successful signature verification
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      // Set module status to testing
      mockSignedMetadata.metadata.status = ModuleStatus.TESTING;

      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.status).toBe('testing');
      expect(result.verificationChecks.metadataValid).toBe(true);
    });

    it('should cache verification results', async () => {
      // Mock successful signature verification
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue({
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      });

      // First call
      const result1 = await service.verifyModule('TestModule', mockSignedMetadata);
      
      // Second call should use cache
      const result2 = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result1).toEqual(result2);
      expect(identityQlockService.verifyMetadataSignature).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyMetadata', () => {
    it('should validate correct metadata structure', async () => {
      const result = await service.verifyMetadata(mockMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const invalidMetadata = { ...mockMetadata };
      delete (invalidMetadata as any).module;
      delete (invalidMetadata as any).version;

      const result = await service.verifyMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Required field is missing: module');
      expect(result.errors).toContain('Required field is missing: version');
    });

    it('should validate semantic version format', async () => {
      const invalidMetadata = { ...mockMetadata, version: 'invalid-version' };

      const result = await service.verifyMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Version must follow semantic versioning (e.g., 1.0.0)');
    });

    it('should validate repository URL format', async () => {
      const invalidMetadata = { ...mockMetadata, repository: 'not-a-url' };

      const result = await service.verifyMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository must be a valid URL');
    });

    it('should validate IPFS CID format for documentation', async () => {
      const invalidMetadata = { ...mockMetadata, documentation: 'invalid-cid' };

      const result = await service.verifyMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Documentation must be a valid IPFS CID');
    });
  });

  describe('verifySignature', () => {
    it('should delegate to IdentityQlockService', async () => {
      const mockVerificationResult = {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockResolvedValue(mockVerificationResult);

      const result = await service.verifySignature(mockSignedMetadata);

      expect(identityQlockService.verifyMetadataSignature).toHaveBeenCalledWith(mockSignedMetadata);
      expect(result).toEqual(mockVerificationResult);
    });

    it('should handle signature verification errors', async () => {
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockRejectedValue(new Error('Signature error'));

      const result = await service.verifySignature(mockSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });
  });

  describe('verifyDependencies', () => {
    it('should return valid for empty dependencies', async () => {
      const result = await service.verifyDependencies([]);

      expect(result.valid).toBe(true);
    });

    it('should return valid for null dependencies', async () => {
      const result = await service.verifyDependencies(null as any);

      expect(result.valid).toBe(true);
    });

    it('should validate dependency format', async () => {
      const result = await service.verifyDependencies(['ValidModule', 'invalid-module-name!']);

      expect(result.valid).toBe(true); // Basic validation passes
      expect(result.warnings).toContain('Dependency name may not follow conventions: invalid-module-name!');
    });

    it('should handle invalid dependency types', async () => {
      const result = await service.verifyDependencies([null, undefined, ''] as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid dependency format: null');
      expect(result.errors).toContain('Invalid dependency format: undefined');
      expect(result.errors).toContain('Invalid dependency format: ');
    });
  });

  describe('verifyCompliance', () => {
    it('should validate correct compliance object', async () => {
      const result = await service.verifyCompliance(mockCompliance);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing compliance object', async () => {
      const result = await service.verifyCompliance(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Compliance information is missing or invalid');
    });

    it('should detect missing compliance fields', async () => {
      const incompleteCompliance = { ...mockCompliance };
      delete (incompleteCompliance as any).audit;
      delete (incompleteCompliance as any).gdpr_compliant;

      const result = await service.verifyCompliance(incompleteCompliance);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing compliance field: audit');
      expect(result.errors).toContain('Missing compliance field: gdpr_compliant');
    });

    it('should provide warnings for recommended settings', async () => {
      const weakCompliance = {
        ...mockCompliance,
        privacy_enforced: false,
        audit: false
      };

      const result = await service.verifyCompliance(weakCompliance);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Privacy enforcement is not enabled - consider enabling for better security');
      expect(result.warnings).toContain('Module has not passed security audit - recommended for production modules');
    });
  });

  describe('verifyAuditHash', () => {
    it('should validate correct SHA256 hash', async () => {
      const validHash = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890'.substring(0, 64);
      
      const result = await service.verifyAuditHash(validHash, 'TestModule');

      expect(result.valid).toBe(true);
    });

    it('should reject missing audit hash', async () => {
      const result = await service.verifyAuditHash('', 'TestModule');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audit hash is missing');
    });

    it('should reject invalid hash format', async () => {
      const result = await service.verifyAuditHash('invalid-hash', 'TestModule');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audit hash format is invalid (must be SHA256)');
    });
  });

  describe('verifyDocumentationAvailability', () => {
    it('should validate correct IPFS CID', async () => {
      const validCid = 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51';
      
      const result = await service.verifyDocumentationAvailability(validCid);

      expect(result.valid).toBe(true);
    });

    it('should reject missing documentation CID', async () => {
      const result = await service.verifyDocumentationAvailability('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Documentation CID is missing');
    });

    it('should reject invalid CID format', async () => {
      const result = await service.verifyDocumentationAvailability('invalid-cid');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Documentation CID format is invalid');
    });
  });

  describe('validateMetadataStructure', () => {
    it('should return no issues for valid metadata', () => {
      const issues = service.validateMetadataStructure(mockMetadata);

      expect(issues).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidMetadata = { ...mockMetadata };
      delete (invalidMetadata as any).module;
      delete (invalidMetadata as any).version;

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'MISSING_FIELD',
          field: 'module'
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'MISSING_FIELD',
          field: 'version'
        })
      );
    });

    it('should validate field types', () => {
      const invalidMetadata = { ...mockMetadata, module: 123 as any };

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'INVALID_FIELD_TYPE',
          message: 'Module name must be a string'
        })
      );
    });

    it('should validate array fields', () => {
      const invalidMetadata = { 
        ...mockMetadata, 
        identities_supported: [] as any,
        integrations: 'not-an-array' as any
      };

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'EMPTY_IDENTITIES_SUPPORTED'
        })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'INVALID_INTEGRATIONS'
        })
      );
    });
  });

  describe('validateComplianceRequirements', () => {
    it('should return no issues for valid production compliance', () => {
      const issues = service.validateComplianceRequirements(mockCompliance, ModuleStatus.PRODUCTION_READY);

      expect(issues.filter(issue => issue.severity === 'ERROR')).toHaveLength(0);
    });

    it('should require audit for production modules', () => {
      const nonAuditedCompliance = { ...mockCompliance, audit: false };

      const issues = service.validateComplianceRequirements(nonAuditedCompliance, ModuleStatus.PRODUCTION_READY);

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'PRODUCTION_AUDIT_REQUIRED'
        })
      );
    });

    it('should warn about privacy enforcement for production modules', () => {
      const nonPrivateCompliance = { ...mockCompliance, privacy_enforced: false };

      const issues = service.validateComplianceRequirements(nonPrivateCompliance, ModuleStatus.PRODUCTION_READY);

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'WARNING',
          code: 'PRODUCTION_PRIVACY_RECOMMENDED'
        })
      );
    });

    it('should be more lenient for development modules', () => {
      const basicCompliance = { 
        ...mockCompliance, 
        audit: false, 
        privacy_enforced: false 
      };

      const issues = service.validateComplianceRequirements(basicCompliance, ModuleStatus.DEVELOPMENT);

      const errorIssues = issues.filter(issue => issue.severity === 'ERROR');
      expect(errorIssues).toHaveLength(0);
    });
  });

  describe('validateDependencyCompatibility', () => {
    it('should return no issues for empty dependencies', async () => {
      const issues = await service.validateDependencyCompatibility([], 'TestModule');

      expect(issues).toHaveLength(0);
    });

    it('should detect circular dependencies', async () => {
      const issues = await service.validateDependencyCompatibility(['TestModule'], 'TestModule');

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'CIRCULAR_DEPENDENCY'
        })
      );
    });

    it('should detect duplicate dependencies', async () => {
      const issues = await service.validateDependencyCompatibility(['ModuleA', 'ModuleB', 'ModuleA'], 'TestModule');

      expect(issues).toContainEqual(
        expect.objectContaining({
          severity: 'WARNING',
          code: 'DUPLICATE_DEPENDENCIES'
        })
      );
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle verification errors gracefully', async () => {
      // Mock signature verification to throw error
      const { identityQlockService } = await import('../identity/IdentityQlockService');
      vi.mocked(identityQlockService.verifyMetadataSignature).mockRejectedValue(new Error('Service unavailable'));

      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.status).toBe('invalid');
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'ERROR',
          code: 'SIGNATURE_INVALID'
        })
      );
    });

    it('should handle metadata validation errors', async () => {
      // Create metadata that will cause validation to throw
      const corruptMetadata = null as any;
      const corruptSignedMetadata = { ...mockSignedMetadata, metadata: corruptMetadata };

      const result = await service.verifyModule('TestModule', corruptSignedMetadata);

      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.metadataValid).toBe(false);
    });
  });
});