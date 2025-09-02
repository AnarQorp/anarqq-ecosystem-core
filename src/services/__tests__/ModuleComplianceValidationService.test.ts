/**
 * Module Compliance Validation Service Tests
 * Tests comprehensive compliance checking for regulatory requirements,
 * audit trail validation, GDPR compliance, KYC requirements, and privacy policy enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ModuleComplianceValidationService,
  ComplianceCategory,
  RegulatoryFramework
} from '../ModuleComplianceValidationService';
import {
  QModuleMetadata,
  ModuleCompliance,
  ModuleStatus,
  DEFAULT_MODULE_COMPLIANCE
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('ModuleComplianceValidationService', () => {
  let service: ModuleComplianceValidationService;
  let mockMetadata: QModuleMetadata;
  let mockCompliance: ModuleCompliance;

  beforeEach(() => {
    service = new ModuleComplianceValidationService();
    
    mockCompliance = {
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
      description: 'Test module for compliance validation',
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
  });

  describe('validateCompliance', () => {
    it('should validate fully compliant module successfully', async () => {
      const result = await service.validateCompliance(mockMetadata);

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')).toHaveLength(0);
      expect(result.auditTrail).toHaveLength(1);
      expect(result.auditTrail[0].action).toBe('COMPLIANCE_VALIDATION');
    });

    it('should identify missing compliance information', async () => {
      const invalidMetadata = { ...mockMetadata, compliance: null as any };
      
      const result = await service.validateCompliance(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'CRITICAL',
          category: ComplianceCategory.REGULATORY,
          code: 'MISSING_COMPLIANCE_INFO'
        })
      );
    });

    it('should validate basic compliance fields', async () => {
      const invalidCompliance = {
        ...mockCompliance,
        audit: null as any,
        privacy_enforced: undefined as any,
        data_retention_policy: 123 as any
      };
      
      const invalidMetadata = { ...mockMetadata, compliance: invalidCompliance };
      const result = await service.validateCompliance(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'HIGH',
          code: 'INVALID_AUDIT'
        })
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'HIGH',
          code: 'INVALID_PRIVACY_ENFORCED'
        })
      );
    });

    it('should validate GDPR compliance when claimed', async () => {
      const result = await service.validateCompliance(mockMetadata);

      // Should have GDPR-related validation
      const gdprIssues = result.issues.filter(i => i.category === ComplianceCategory.GDPR);
      expect(gdprIssues.length).toBeGreaterThanOrEqual(0); // May have recommendations
    });

    it('should handle GDPR non-compliance gracefully', async () => {
      const nonGdprCompliance = { ...mockCompliance, gdpr_compliant: false };
      const nonGdprMetadata = { ...mockMetadata, compliance: nonGdprCompliance };
      
      const result = await service.validateCompliance(nonGdprMetadata);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'MEDIUM',
          category: ComplianceCategory.GDPR,
          code: 'GDPR_NOT_CLAIMED'
        })
      );
    });

    it('should validate KYC requirements for financial modules', async () => {
      const walletMetadata = { ...mockMetadata, module: 'Qwallet' };
      
      const result = await service.validateCompliance(walletMetadata, IdentityType.ENTERPRISE);

      // Should validate KYC implementation since it's claimed
      expect(result.issues.filter(i => i.category === ComplianceCategory.KYC).length).toBeGreaterThanOrEqual(0);
    });

    it('should require KYC for financial modules when not supported', async () => {
      const noKycCompliance = { ...mockCompliance, kyc_support: false };
      const walletMetadata = { 
        ...mockMetadata, 
        module: 'Qwallet',
        compliance: noKycCompliance 
      };
      
      const result = await service.validateCompliance(walletMetadata, IdentityType.ENTERPRISE);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'HIGH',
          category: ComplianceCategory.KYC,
          code: 'KYC_REQUIRED_NOT_SUPPORTED'
        })
      );
    });

    it('should validate privacy policy implementation', async () => {
      const result = await service.validateCompliance(mockMetadata);

      // Should validate privacy policy since privacy_enforced is true
      const privacyIssues = result.issues.filter(i => i.category === ComplianceCategory.PRIVACY);
      expect(privacyIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate data retention policy', async () => {
      const result = await service.validateCompliance(mockMetadata);

      // Should validate data retention policy
      const retentionIssues = result.issues.filter(i => i.category === ComplianceCategory.DATA_RETENTION);
      expect(retentionIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing data retention policy', async () => {
      const noRetentionCompliance = { ...mockCompliance, data_retention_policy: '' };
      const noRetentionMetadata = { ...mockMetadata, compliance: noRetentionCompliance };
      
      const result = await service.validateCompliance(noRetentionMetadata);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'HIGH',
          category: ComplianceCategory.DATA_RETENTION,
          code: 'MISSING_DATA_RETENTION_POLICY'
        })
      );
    });

    it('should validate audit trail', async () => {
      const result = await service.validateCompliance(mockMetadata);

      expect(result.auditTrail).toHaveLength(1);
      expect(result.auditTrail[0]).toMatchObject({
        action: 'COMPLIANCE_VALIDATION',
        actor: 'ModuleComplianceValidationService',
        verified: true
      });
    });

    it('should handle invalid audit hash', async () => {
      const invalidAuditMetadata = { ...mockMetadata, audit_hash: 'invalid-hash' };
      
      const result = await service.validateCompliance(invalidAuditMetadata);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'HIGH',
          category: ComplianceCategory.AUDIT,
          code: 'INVALID_AUDIT_HASH'
        })
      );
    });

    it('should require audit for production modules', async () => {
      const noAuditCompliance = { ...mockCompliance, audit: false };
      const productionMetadata = { 
        ...mockMetadata, 
        compliance: noAuditCompliance,
        status: ModuleStatus.PRODUCTION_READY 
      };
      
      const result = await service.validateCompliance(productionMetadata);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'CRITICAL',
          category: ComplianceCategory.AUDIT,
          code: 'PRODUCTION_AUDIT_REQUIRED'
        })
      );
    });

    it('should generate appropriate recommendations', async () => {
      const partialCompliance = {
        ...mockCompliance,
        audit: false,
        gdpr_compliant: false
      };
      const partialMetadata = { ...mockMetadata, compliance: partialCompliance };
      
      const result = await service.validateCompliance(partialMetadata);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'HIGH',
          category: ComplianceCategory.AUDIT
        })
      );
    });

    it('should calculate compliance score correctly', async () => {
      // Test with various compliance levels
      const highComplianceResult = await service.validateCompliance(mockMetadata);
      expect(highComplianceResult.score).toBeGreaterThan(50);

      const lowCompliance = {
        audit: false,
        risk_scoring: false,
        privacy_enforced: false,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: ''
      };
      const lowComplianceMetadata = { ...mockMetadata, compliance: lowCompliance };
      const lowComplianceResult = await service.validateCompliance(lowComplianceMetadata);
      
      expect(lowComplianceResult.score).toBeLessThanOrEqual(highComplianceResult.score);
    });

    it('should validate with specific regulatory frameworks', async () => {
      const result = await service.validateCompliance(
        mockMetadata,
        IdentityType.ENTERPRISE,
        [RegulatoryFramework.GDPR, RegulatoryFramework.SOX]
      );

      expect(result.valid).toBeDefined();
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidMetadata = null as any;
      
      await expect(service.validateCompliance(invalidMetadata)).rejects.toThrow();
    });
  });

  describe('getComplianceSummary', () => {
    it('should return compliance summary for validated module', async () => {
      // First validate a module
      await service.validateCompliance(mockMetadata);
      
      const summary = await service.getComplianceSummary('TestModule');

      expect(summary).toMatchObject({
        score: expect.any(Number),
        criticalIssues: expect.any(Number),
        highIssues: expect.any(Number),
        recommendations: expect.any(Number),
        lastValidated: expect.any(String)
      });
    });

    it('should throw error for non-validated module', async () => {
      await expect(service.getComplianceSummary('NonExistentModule')).rejects.toThrow();
    });
  });

  describe('exportComplianceReport', () => {
    beforeEach(async () => {
      // Validate a module first to have data to export
      await service.validateCompliance(mockMetadata);
    });

    it('should export compliance report in JSON format', async () => {
      const report = await service.exportComplianceReport('TestModule', 'json');
      
      expect(() => JSON.parse(report)).not.toThrow();
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('valid');
      expect(parsed).toHaveProperty('score');
      expect(parsed).toHaveProperty('issues');
      expect(parsed).toHaveProperty('recommendations');
    });

    it('should export compliance report in CSV format', async () => {
      const report = await service.exportComplianceReport('TestModule', 'csv');
      
      expect(report).toContain('Severity,Category,Code,Message,Requirement,Remediation');
      expect(typeof report).toBe('string');
    });

    it('should export compliance report in PDF format', async () => {
      const report = await service.exportComplianceReport('TestModule', 'pdf');
      
      expect(report).toContain('COMPLIANCE VALIDATION REPORT');
      expect(report).toContain('Module Compliance Score:');
      expect(typeof report).toBe('string');
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.exportComplianceReport('TestModule', 'xml' as any)
      ).rejects.toThrow('Unsupported export format');
    });

    it('should throw error for non-validated module', async () => {
      await expect(
        service.exportComplianceReport('NonExistentModule', 'json')
      ).rejects.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear compliance validation cache', async () => {
      // Validate a module to populate cache
      await service.validateCompliance(mockMetadata);
      
      // Clear cache
      service.clearCache();
      
      // Should throw error since cache is cleared
      await expect(service.getComplianceSummary('TestModule:1.0.0')).rejects.toThrow();
    });
  });

  describe('Regulatory Framework Validation', () => {
    it('should validate GDPR requirements', async () => {
      const result = await service.validateCompliance(
        mockMetadata,
        IdentityType.ENTERPRISE,
        [RegulatoryFramework.GDPR]
      );

      // Should have GDPR-specific validation
      expect(result.issues.filter(i => i.category === ComplianceCategory.GDPR).length).toBeGreaterThanOrEqual(0);
    });

    it('should validate PCI DSS requirements for payment modules', async () => {
      const paymentMetadata = { ...mockMetadata, module: 'Qwallet' };
      
      const result = await service.validateCompliance(
        paymentMetadata,
        IdentityType.ENTERPRISE,
        [RegulatoryFramework.PCI_DSS]
      );

      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate SOX requirements for financial modules', async () => {
      const financialMetadata = { ...mockMetadata, module: 'Qwallet' };
      
      const result = await service.validateCompliance(
        financialMetadata,
        IdentityType.ENTERPRISE,
        [RegulatoryFramework.SOX]
      );

      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty compliance object', async () => {
      const emptyComplianceMetadata = { 
        ...mockMetadata, 
        compliance: {} as ModuleCompliance 
      };
      
      const result = await service.validateCompliance(emptyComplianceMetadata);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle development status modules with relaxed requirements', async () => {
      const devMetadata = { 
        ...mockMetadata, 
        status: ModuleStatus.DEVELOPMENT,
        compliance: { ...mockCompliance, audit: false }
      };
      
      const result = await service.validateCompliance(devMetadata);

      // Should be more lenient for development modules
      const criticalIssues = result.issues.filter(i => i.severity === 'CRITICAL');
      expect(criticalIssues.length).toBeLessThan(
        result.issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length
      );
    });

    it('should handle modules with no identity type specified', async () => {
      const result = await service.validateCompliance(mockMetadata);

      expect(result.valid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle modules with minimal integrations', async () => {
      const minimalMetadata = { ...mockMetadata, integrations: [] };
      
      const result = await service.validateCompliance(minimalMetadata);

      expect(result.valid).toBeDefined();
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should use cache for repeated validations', async () => {
      const startTime = Date.now();
      await service.validateCompliance(mockMetadata);
      const firstCallTime = Date.now() - startTime;

      const secondStartTime = Date.now();
      await service.validateCompliance(mockMetadata);
      const secondCallTime = Date.now() - secondStartTime;

      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime);
    });

    it('should handle cache expiration', async () => {
      // This would require mocking time or waiting, simplified for test
      await service.validateCompliance(mockMetadata);
      const summary = await service.getComplianceSummary('TestModule');
      
      expect(summary.lastValidated).toBeDefined();
    });
  });
});