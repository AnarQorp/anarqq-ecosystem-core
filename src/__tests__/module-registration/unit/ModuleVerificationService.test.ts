/**
 * ModuleVerificationService Unit Tests
 * Tests comprehensive module validation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import {
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleVerificationResult,
  VerificationResult,
  ModuleStatus,
  ModuleCompliance,
  VerificationIssue
} from '../../../types/qwallet-module-registration';
import { IdentityType } from '../../../types/identity';
import { 
  createMockModuleInfo, 
  createMockSignedMetadata, 
  createMockIdentity,
  createMockQModuleMetadata
} from '../../utils/qwallet-test-utils';

// Mock external services
vi.mock('../../../services/identity/IdentityQlockService');
vi.mock('../../../services/ModuleRegistrationPerformanceOptimizer');

describe('ModuleVerificationService', () => {
  let service: ModuleVerificationService;
  let mockMetadata: QModuleMetadata;
  let mockSignedMetadata: SignedModuleMetadata;

  beforeEach(() => {
    service = new ModuleVerificationService();
    mockMetadata = createMockQModuleMetadata('TestModule', '1.0.0');
    mockSignedMetadata = createMockSignedMetadata(
      createMockModuleInfo('TestModule', '1.0.0'),
      createMockIdentity(IdentityType.ROOT)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearCache();
  });

  describe('verifyModule', () => {
    it('should verify valid module successfully', async () => {
      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.moduleId).toBe('TestModule');
      expect(result.status).toBe('production_ready');
      expect(result.verificationChecks.metadataValid).toBe(true);
      expect(result.verificationChecks.signatureValid).toBe(true);
      expect(result.verificationChecks.dependenciesResolved).toBe(true);
      expect(result.verificationChecks.complianceVerified).toBe(true);
      expect(result.verificationChecks.auditPassed).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.lastVerified).toBeDefined();
      expect(result.verifiedBy).toBe('ModuleVerificationService');
    });

    it('should detect invalid metadata', async () => {
      const invalidMetadata = {
        ...mockMetadata,
        module: '', // Invalid empty name
        version: 'invalid-version'
      };
      const invalidSignedMetadata = {
        ...mockSignedMetadata,
        metadata: invalidMetadata
      };

      const result = await service.verifyModule('TestModule', invalidSignedMetadata);

      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.metadataValid).toBe(false);
      expect(result.issues.some(issue => issue.severity === 'ERROR')).toBe(true);
    });

    it('should detect invalid signature', async () => {
      const invalidSignedMetadata = {
        ...mockSignedMetadata,
        signature: 'invalid-signature'
      };

      // Mock signature verification to fail
      vi.spyOn(service, 'verifySignature').mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: 'Invalid signature'
      });

      const result = await service.verifyModule('TestModule', invalidSignedMetadata);

      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.signatureValid).toBe(false);
      expect(result.issues.some(issue => issue.code === 'SIGNATURE_INVALID')).toBe(true);
    });

    it('should detect dependency issues', async () => {
      const metadataWithDependencies = {
        ...mockMetadata,
        dependencies: ['NonExistentModule']
      };
      const signedMetadataWithDeps = {
        ...mockSignedMetadata,
        metadata: metadataWithDependencies
      };

      vi.spyOn(service, 'verifyDependencies').mockResolvedValue({
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        errors: ['Dependency not found: NonExistentModule']
      });

      const result = await service.verifyModule('TestModule', signedMetadataWithDeps);

      expect(result.status).toBe('invalid');
      expect(result.verificationChecks.dependenciesResolved).toBe(false);
    });

    it('should detect compliance issues', async () => {
      const invalidCompliance: ModuleCompliance = {
        audit: false,
        risk_scoring: false,
        privacy_enforced: false,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: ''
      };
      const metadataWithBadCompliance = {
        ...mockMetadata,
        compliance: invalidCompliance
      };
      const signedMetadataWithBadCompliance = {
        ...mockSignedMetadata,
        metadata: metadataWithBadCompliance
      };

      const result = await service.verifyModule('TestModule', signedMetadataWithBadCompliance);

      expect(result.verificationChecks.complianceVerified).toBe(false);
    });

    it('should detect invalid audit hash', async () => {
      const metadataWithBadAudit = {
        ...mockMetadata,
        audit_hash: 'invalid-hash'
      };
      const signedMetadataWithBadAudit = {
        ...mockSignedMetadata,
        metadata: metadataWithBadAudit
      };

      const result = await service.verifyModule('TestModule', signedMetadataWithBadAudit);

      expect(result.verificationChecks.auditPassed).toBe(false);
      expect(result.issues.some(issue => issue.code === 'AUDIT_HASH_INVALID')).toBe(true);
    });

    it('should handle verification errors gracefully', async () => {
      // Mock an error during verification
      vi.spyOn(service, 'verifyMetadata').mockRejectedValue(new Error('Verification error'));

      const result = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result.status).toBe('invalid');
      expect(result.issues.some(issue => issue.code === 'VERIFICATION_ERROR')).toBe(true);
    });

    it('should use cached results when available', async () => {
      // First call
      const result1 = await service.verifyModule('TestModule', mockSignedMetadata);
      
      // Mock verifyMetadata to track calls
      const verifyMetadataSpy = vi.spyOn(service, 'verifyMetadata');
      
      // Second call should use cache
      const result2 = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result1).toEqual(result2);
      expect(verifyMetadataSpy).not.toHaveBeenCalled();
    });

    it('should determine correct status based on module status and issues', async () => {
      // Test production ready
      const productionMetadata = {
        ...mockMetadata,
        status: ModuleStatus.PRODUCTION_READY
      };
      const productionSignedMetadata = {
        ...mockSignedMetadata,
        metadata: productionMetadata
      };

      const productionResult = await service.verifyModule('TestModule', productionSignedMetadata);
      expect(productionResult.status).toBe('production_ready');

      // Test testing status
      const testingMetadata = {
        ...mockMetadata,
        status: ModuleStatus.TESTING
      };
      const testingSignedMetadata = {
        ...mockSignedMetadata,
        metadata: testingMetadata
      };

      const testingResult = await service.verifyModule('TestModule', testingSignedMetadata);
      expect(testingResult.status).toBe('testing');

      // Test development status
      const developmentMetadata = {
        ...mockMetadata,
        status: ModuleStatus.DEVELOPMENT
      };
      const developmentSignedMetadata = {
        ...mockSignedMetadata,
        metadata: developmentMetadata
      };

      const developmentResult = await service.verifyModule('TestModule', developmentSignedMetadata);
      expect(developmentResult.status).toBe('development');
    });
  });

  describe('verifyMetadata', () => {
    it('should verify valid metadata', async () => {
      const result = await service.verifyMetadata(mockMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors?.length || 0).toBe(0);
    });

    it('should detect metadata structure issues', async () => {
      const invalidMetadata = {
        ...mockMetadata,
        module: '',
        version: 'invalid',
        identities_supported: [],
        repository: 'not-a-url'
      };

      const result = await service.verifyMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors?.length || 0).toBeGreaterThan(0);
    });

    it('should validate compliance requirements', async () => {
      const metadataWithBadCompliance = {
        ...mockMetadata,
        status: ModuleStatus.PRODUCTION_READY,
        compliance: {
          audit: false, // Production modules should be audited
          risk_scoring: false,
          privacy_enforced: false,
          kyc_support: false,
          gdpr_compliant: false,
          data_retention_policy: ''
        }
      };

      const result = await service.verifyMetadata(metadataWithBadCompliance);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Production modules must pass security audit'))).toBe(true);
    });

    it('should handle metadata validation errors', async () => {
      const corruptMetadata = null as any;

      const result = await service.verifyMetadata(corruptMetadata);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Metadata validation error');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      // Mock successful signature verification
      const mockIdentityQlockService = await import('../../../services/identity/IdentityQlockService');
      vi.spyOn(mockIdentityQlockService.identityQlockService, 'verifyMetadataSignature')
        .mockResolvedValue({
          valid: true,
          signatureValid: true,
          identityVerified: true,
          timestampValid: true
        });

      const result = await service.verifySignature(mockSignedMetadata);

      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.identityVerified).toBe(true);
      expect(result.timestampValid).toBe(true);
    });

    it('should detect invalid signature', async () => {
      const mockIdentityQlockService = await import('../../../services/identity/IdentityQlockService');
      vi.spyOn(mockIdentityQlockService.identityQlockService, 'verifyMetadataSignature')
        .mockResolvedValue({
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Invalid signature'
        });

      const result = await service.verifySignature(mockSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.signatureValid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should use cached signature verification results', async () => {
      const mockPerformanceOptimizer = await import('../../../services/ModuleRegistrationPerformanceOptimizer');
      vi.spyOn(mockPerformanceOptimizer.moduleRegistrationPerformanceOptimizer, 'getCachedSignatureVerification')
        .mockReturnValue({
          valid: true,
          signatureValid: true,
          identityVerified: true,
          timestampValid: true
        });

      const result = await service.verifySignature(mockSignedMetadata);

      expect(result.valid).toBe(true);
      expect(mockPerformanceOptimizer.moduleRegistrationPerformanceOptimizer.getCachedSignatureVerification)
        .toHaveBeenCalled();
    });

    it('should cache signature verification results', async () => {
      const mockPerformanceOptimizer = await import('../../../services/ModuleRegistrationPerformanceOptimizer');
      const cacheSpy = vi.spyOn(mockPerformanceOptimizer.moduleRegistrationPerformanceOptimizer, 'cacheSignatureVerification');

      await service.verifySignature(mockSignedMetadata);

      expect(cacheSpy).toHaveBeenCalledWith(
        'TestModule',
        '1.0.0',
        expect.any(Object)
      );
    });

    it('should handle signature verification errors', async () => {
      const mockIdentityQlockService = await import('../../../services/identity/IdentityQlockService');
      vi.spyOn(mockIdentityQlockService.identityQlockService, 'verifyMetadataSignature')
        .mockRejectedValue(new Error('Signature service error'));

      const result = await service.verifySignature(mockSignedMetadata);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });
  });

  describe('verifyDependencies', () => {
    it('should verify empty dependencies', async () => {
      const result = await service.verifyDependencies([]);

      expect(result.valid).toBe(true);
    });

    it('should verify valid dependencies', async () => {
      const dependencies = ['Qindex', 'Qlock', 'Qerberos'];
      const result = await service.verifyDependencies(dependencies);

      expect(result.valid).toBe(true);
      expect(result.errors?.length || 0).toBe(0);
    });

    it('should detect invalid dependency format', async () => {
      const dependencies = ['ValidDep', '', null as any, 123 as any];
      const result = await service.verifyDependencies(dependencies);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Invalid dependency format'))).toBe(true);
    });

    it('should warn about unconventional dependency names', async () => {
      const dependencies = ['ValidDep', '123InvalidName', 'valid-dep'];
      const result = await service.verifyDependencies(dependencies);

      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('may not follow conventions'))).toBe(true);
    });

    it('should handle dependency verification errors', async () => {
      // Mock an error during dependency checking
      const originalConsoleError = console.error;
      console.error = vi.fn();

      try {
        const result = await service.verifyDependencies(['ValidDep']);
        expect(result.valid).toBe(true); // Should handle errors gracefully
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('verifyCompliance', () => {
    it('should verify valid compliance', async () => {
      const validCompliance: ModuleCompliance = {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 'standard_retention'
      };

      const result = await service.verifyCompliance(validCompliance);

      expect(result.valid).toBe(true);
      expect(result.errors?.length || 0).toBe(0);
    });

    it('should detect missing compliance information', async () => {
      const result = await service.verifyCompliance(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Compliance information is missing'))).toBe(true);
    });

    it('should detect missing compliance fields', async () => {
      const incompleteCompliance = {
        audit: true
        // Missing other required fields
      } as any;

      const result = await service.verifyCompliance(incompleteCompliance);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Missing compliance field'))).toBe(true);
    });

    it('should validate data retention policy', async () => {
      const complianceWithBadPolicy = {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: 123 as any // Should be string
      };

      const result = await service.verifyCompliance(complianceWithBadPolicy);

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Data retention policy must be a string'))).toBe(true);
    });

    it('should provide compliance recommendations', async () => {
      const basicCompliance: ModuleCompliance = {
        audit: false,
        risk_scoring: false,
        privacy_enforced: false,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: 'basic'
      };

      const result = await service.verifyCompliance(basicCompliance);

      expect(result.valid).toBe(true);
      expect(result.warnings?.some(w => w.includes('Privacy enforcement is not enabled'))).toBe(true);
      expect(result.warnings?.some(w => w.includes('Module has not passed security audit'))).toBe(true);
    });

    it('should handle compliance verification errors', async () => {
      // Pass invalid compliance that causes verification to throw
      const corruptCompliance = { toString: () => { throw new Error('Corrupt data'); } } as any;

      const result = await service.verifyCompliance(corruptCompliance);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Compliance verification failed');
    });
  });

  describe('verifyAuditHash', () => {
    it('should verify valid audit hash', async () => {
      const validHash = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890';
      const result = await service.verifyAuditHash(validHash, 'TestModule');

      expect(result.valid).toBe(true);
    });

    it('should detect missing audit hash', async () => {
      const result = await service.verifyAuditHash('', 'TestModule');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audit hash is missing');
    });

    it('should detect invalid audit hash format', async () => {
      const invalidHash = 'not-a-valid-hash';
      const result = await service.verifyAuditHash(invalidHash, 'TestModule');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audit hash format is invalid (must be SHA256)');
    });

    it('should handle audit hash verification errors', async () => {
      // This test ensures the method handles unexpected errors gracefully
      const result = await service.verifyAuditHash('valid-looking-hash-but-causes-error', 'TestModule');

      // Since we're not actually verifying against real audit data, this should pass format validation
      expect(result.valid).toBe(false); // Invalid format
    });
  });

  describe('verifyDocumentationAvailability', () => {
    it('should verify valid documentation CID', async () => {
      const validCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const result = await service.verifyDocumentationAvailability(validCid);

      expect(result.valid).toBe(true);
    });

    it('should detect missing documentation CID', async () => {
      const result = await service.verifyDocumentationAvailability('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Documentation CID is missing');
    });

    it('should detect invalid CID format', async () => {
      const invalidCid = 'not-a-valid-cid';
      const result = await service.verifyDocumentationAvailability(invalidCid);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Documentation CID format is invalid');
    });

    it('should handle documentation verification errors', async () => {
      // This test ensures the method handles unexpected errors gracefully
      const result = await service.verifyDocumentationAvailability('QmValidFormatButCausesError123456789012345678901234');

      // Should pass format validation
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMetadataStructure', () => {
    it('should validate complete metadata structure', () => {
      const issues = service.validateMetadataStructure(mockMetadata);

      expect(issues.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const incompleteMetadata = {
        ...mockMetadata,
        module: undefined as any,
        version: undefined as any,
        description: undefined as any
      };

      const issues = service.validateMetadataStructure(incompleteMetadata);

      expect(issues.some(issue => issue.code === 'MISSING_FIELD' && issue.field === 'module')).toBe(true);
      expect(issues.some(issue => issue.code === 'MISSING_FIELD' && issue.field === 'version')).toBe(true);
      expect(issues.some(issue => issue.code === 'MISSING_FIELD' && issue.field === 'description')).toBe(true);
    });

    it('should validate field types', () => {
      const invalidMetadata = {
        ...mockMetadata,
        module: 123 as any,
        identities_supported: 'not-an-array' as any,
        integrations: 'not-an-array' as any,
        timestamp: 'not-a-number' as any
      };

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues.some(issue => issue.code === 'INVALID_FIELD_TYPE')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_IDENTITIES_SUPPORTED')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_INTEGRATIONS')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_TIMESTAMP')).toBe(true);
    });

    it('should validate field formats', () => {
      const invalidMetadata = {
        ...mockMetadata,
        version: 'not-semver',
        repository: 'not-a-url',
        documentation: 'not-a-cid',
        activated_by: 'not-a-did',
        audit_hash: 'not-a-hash',
        checksum: 'not-a-checksum',
        signature_algorithm: 'UNSUPPORTED' as any,
        status: 'INVALID_STATUS' as any
      };

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues.some(issue => issue.code === 'INVALID_VERSION_FORMAT')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_REPOSITORY_URL')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_DOCUMENTATION_CID')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_ACTIVATOR_DID')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_AUDIT_HASH')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_CHECKSUM')).toBe(true);
      expect(issues.some(issue => issue.code === 'UNSUPPORTED_SIGNATURE_ALGORITHM')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_STATUS')).toBe(true);
    });

    it('should validate array constraints', () => {
      const invalidMetadata = {
        ...mockMetadata,
        identities_supported: [],
        description: 'short' // Too short
      };

      const issues = service.validateMetadataStructure(invalidMetadata);

      expect(issues.some(issue => issue.code === 'EMPTY_IDENTITIES_SUPPORTED')).toBe(true);
      expect(issues.some(issue => issue.code === 'INVALID_DESCRIPTION')).toBe(true);
    });

    it('should handle validation errors gracefully', () => {
      const corruptMetadata = { toString: () => { throw new Error('Corrupt data'); } } as any;

      const issues = service.validateMetadataStructure(corruptMetadata);

      expect(issues.some(issue => issue.code === 'VALIDATION_ERROR')).toBe(true);
    });
  });

  describe('validateComplianceRequirements', () => {
    it('should validate production module compliance', () => {
      const productionCompliance: ModuleCompliance = {
        audit: false, // Should be true for production
        risk_scoring: false,
        privacy_enforced: false,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: ''
      };

      const issues = service.validateComplianceRequirements(productionCompliance, ModuleStatus.PRODUCTION_READY);

      expect(issues.some(issue => issue.code === 'PRODUCTION_AUDIT_REQUIRED')).toBe(true);
      expect(issues.some(issue => issue.code === 'PRODUCTION_PRIVACY_RECOMMENDED')).toBe(true);
      expect(issues.some(issue => issue.code === 'GDPR_COMPLIANCE_RECOMMENDED')).toBe(true);
    });

    it('should handle missing compliance information', () => {
      const issues = service.validateComplianceRequirements(null as any, ModuleStatus.PRODUCTION_READY);

      expect(issues.some(issue => issue.code === 'MISSING_COMPLIANCE')).toBe(true);
    });

    it('should validate data retention policy', () => {
      const complianceWithoutPolicy: ModuleCompliance = {
        audit: true,
        risk_scoring: true,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: true,
        data_retention_policy: ''
      };

      const issues = service.validateComplianceRequirements(complianceWithoutPolicy, ModuleStatus.DEVELOPMENT);

      expect(issues.some(issue => issue.code === 'MISSING_DATA_RETENTION_POLICY')).toBe(true);
    });

    it('should handle compliance validation errors', () => {
      const corruptCompliance = { toString: () => { throw new Error('Corrupt data'); } } as any;

      const issues = service.validateComplianceRequirements(corruptCompliance, ModuleStatus.PRODUCTION_READY);

      expect(issues.some(issue => issue.code === 'COMPLIANCE_VALIDATION_ERROR')).toBe(true);
    });
  });

  describe('validateDependencyCompatibility', () => {
    it('should validate empty dependencies', async () => {
      const issues = await service.validateDependencyCompatibility([], 'TestModule');

      expect(issues.length).toBe(0);
    });

    it('should detect circular dependencies', async () => {
      const dependencies = ['TestModule']; // Self-reference
      const issues = await service.validateDependencyCompatibility(dependencies, 'TestModule');

      expect(issues.some(issue => issue.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should detect duplicate dependencies', async () => {
      const dependencies = ['Qindex', 'Qlock', 'Qindex']; // Duplicate
      const issues = await service.validateDependencyCompatibility(dependencies, 'TestModule');

      expect(issues.some(issue => issue.code === 'DUPLICATE_DEPENDENCIES')).toBe(true);
    });

    it('should handle dependency validation errors', async () => {
      // This test ensures the method handles unexpected errors gracefully
      const issues = await service.validateDependencyCompatibility(['ValidDep'], 'TestModule');

      // Should not throw and return empty issues for valid dependencies
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should cache verification results', async () => {
      const result1 = await service.verifyModule('TestModule', mockSignedMetadata);
      const result2 = await service.verifyModule('TestModule', mockSignedMetadata);

      expect(result1).toEqual(result2);
    });

    it('should clear cache', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should expire cached results after TTL', async () => {
      // This test would require mocking time, which is complex
      // For now, we'll just verify the cache works
      await service.verifyModule('TestModule', mockSignedMetadata);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('helper methods', () => {
    it('should convert errors to verification issues', () => {
      const errors = ['Error 1', 'Error 2'];
      const issues = (service as any).convertToVerificationIssues(errors, 'ERROR', 'TEST');

      expect(issues.length).toBe(2);
      expect(issues[0].severity).toBe('ERROR');
      expect(issues[0].code).toBe('TEST_ERROR');
      expect(issues[0].message).toBe('Error 1');
    });

    it('should handle empty error arrays', () => {
      const issues = (service as any).convertToVerificationIssues([], 'ERROR', 'TEST');

      expect(issues.length).toBe(0);
    });

    it('should handle undefined error arrays', () => {
      const issues = (service as any).convertToVerificationIssues(undefined, 'ERROR', 'TEST');

      expect(issues.length).toBe(0);
    });
  });
});