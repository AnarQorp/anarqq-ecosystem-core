/**
 * Module Verification Service - Compliance Integration Tests
 * Tests the integration between ModuleVerificationService and ModuleComplianceValidationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleVerificationService } from '../ModuleVerificationService';
import {
  QModuleMetadata,
  ModuleCompliance,
  ModuleStatus,
  SignedModuleMetadata
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleVerificationService - Compliance Integration', () => {
  let service: ModuleVerificationService;
  let mockMetadata: QModuleMetadata;
  let mockSignedMetadata: SignedModuleMetadata;

  beforeEach(() => {
    service = new ModuleVerificationService();
    
    const mockCompliance: ModuleCompliance = {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: true,
      gdpr_compliant: true,
      data_retention_policy: 'gdpr-compliant-policy'
    };

    mockMetadata = {
      module: 'TestModule',
      version: '1.0.0',
      description: 'Test module for compliance integration',
      identities_supported: [IdentityType.ROOT, IdentityType.ENTERPRISE],
      integrations: ['Qindex', 'Qlock'],
      status: ModuleStatus.PRODUCTION_READY,
      audit_hash: 'a'.repeat(64),
      compliance: mockCompliance,
      repository: 'https://github.com/test/module',
      documentation: 'QmTestDocumentationCID123456789',
      activated_by: 'did:example:123456789',
      timestamp: Date.now(),
      checksum: 'b'.repeat(64),
      signature_algorithm: 'RSA-SHA256',
      public_key_id: 'test-key-id'
    };

    mockSignedMetadata = {
      metadata: mockMetadata,
      signature: 'test-signature',
      publicKey: 'test-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:example:123456789'
    };
  });

  describe('Enhanced Compliance Verification', () => {
    it('should use comprehensive compliance validation when metadata is provided', async () => {
      const result = await service.verifyCompliance(mockMetadata.compliance, mockMetadata, IdentityType.ENTERPRISE);

      expect(result.valid).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details?.complianceScore).toBeGreaterThan(0);
      expect(result.details?.totalIssues).toBeGreaterThanOrEqual(0);
      expect(result.details?.recommendations).toBeGreaterThanOrEqual(0);
      expect(result.details?.auditTrailEntries).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to basic validation when comprehensive validation fails', async () => {
      // Test with invalid metadata that might cause comprehensive validation to fail
      const invalidMetadata = { ...mockMetadata, module: null as any };
      
      const result = await service.verifyCompliance(mockMetadata.compliance, invalidMetadata);

      // Should still return a result (fallback to basic validation)
      expect(result.valid).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should include compliance warnings in verification results', async () => {
      // Create metadata with some compliance issues
      const partialCompliance: ModuleCompliance = {
        audit: false,
        risk_scoring: false,
        privacy_enforced: true,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: 'basic-policy'
      };

      const partialMetadata = { ...mockMetadata, compliance: partialCompliance };

      const result = await service.verifyCompliance(partialCompliance, partialMetadata);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle null compliance gracefully', async () => {
      const result = await service.verifyCompliance(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Compliance information is missing or invalid');
    });

    it('should validate production modules with stricter requirements', async () => {
      const productionMetadata = { 
        ...mockMetadata, 
        status: ModuleStatus.PRODUCTION_READY,
        compliance: {
          ...mockMetadata.compliance,
          audit: false // This should cause issues for production modules
        }
      };

      const result = await service.verifyCompliance(productionMetadata.compliance, productionMetadata);

      // Should have compliance issues for production modules without audit
      expect(result.warnings?.some(w => w.includes('audit')) || 
             result.errors?.some(e => e.includes('audit'))).toBe(true);
    });

    it('should provide detailed compliance information in verification results', async () => {
      const result = await service.verifyCompliance(mockMetadata.compliance, mockMetadata);

      expect(result.details).toBeDefined();
      expect(result.details?.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.details?.complianceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration with Module Verification', () => {
    it('should integrate compliance validation into full module verification', async () => {
      // This would require mocking the other verification methods
      // For now, we'll test that the compliance verification is called
      const complianceResult = await service.verifyCompliance(mockMetadata.compliance, mockMetadata);
      
      expect(complianceResult).toBeDefined();
      expect(complianceResult.valid).toBeDefined();
    });

    it('should handle different identity types in compliance validation', async () => {
      const enterpriseResult = await service.verifyCompliance(
        mockMetadata.compliance, 
        mockMetadata, 
        IdentityType.ENTERPRISE
      );

      const rootResult = await service.verifyCompliance(
        mockMetadata.compliance, 
        mockMetadata, 
        IdentityType.ROOT
      );

      expect(enterpriseResult).toBeDefined();
      expect(rootResult).toBeDefined();
      // Both should be valid for a well-formed compliance object
      expect(enterpriseResult.valid).toBe(true);
      expect(rootResult.valid).toBe(true);
    });

    it('should validate KYC requirements for financial modules', async () => {
      const walletMetadata = { ...mockMetadata, module: 'Qwallet' };
      
      const result = await service.verifyCompliance(
        walletMetadata.compliance, 
        walletMetadata, 
        IdentityType.ENTERPRISE
      );

      expect(result).toBeDefined();
      // Should validate KYC requirements for Qwallet module
      expect(result.valid).toBe(true);
    });

    it('should handle modules without KYC support appropriately', async () => {
      const noKycCompliance: ModuleCompliance = {
        ...mockMetadata.compliance,
        kyc_support: false
      };

      const walletMetadata = { 
        ...mockMetadata, 
        module: 'Qwallet',
        compliance: noKycCompliance 
      };
      
      const result = await service.verifyCompliance(
        noKycCompliance, 
        walletMetadata, 
        IdentityType.ENTERPRISE
      );

      // Should have warnings or errors about missing KYC support for financial modules
      expect(result.warnings?.length || result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed compliance objects', async () => {
      const malformedCompliance = {
        audit: 'invalid', // Should be boolean
        risk_scoring: null,
        privacy_enforced: undefined,
        kyc_support: 'yes', // Should be boolean
        gdpr_compliant: 1, // Should be boolean
        data_retention_policy: 123 // Should be string
      } as any;

      const result = await service.verifyCompliance(malformedCompliance, mockMetadata);

      // Should handle malformed objects gracefully
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle empty compliance objects', async () => {
      const emptyCompliance = {} as ModuleCompliance;

      const result = await service.verifyCompliance(emptyCompliance, mockMetadata);

      // Should handle empty objects gracefully
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('should provide meaningful error messages', async () => {
      const result = await service.verifyCompliance(null as any);

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('Compliance information is missing or invalid');
    });
  });
});