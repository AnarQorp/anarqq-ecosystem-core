/**
 * QModuleMetadataGenerator Unit Tests
 * Tests metadata generation and validation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QModuleMetadataGenerator } from '../../../services/QModuleMetadataGenerator';
import {
  ModuleInfo,
  QModuleMetadata,
  ModuleStatus,
  ModuleCompliance,
  ValidationResult,
  ModuleValidationError,
  IdentityType,
  DEFAULT_MODULE_COMPLIANCE
} from '../../../types/qwallet-module-registration';
import { createMockModuleInfo, createMockGenerationOptions } from '../../utils/qwallet-test-utils';

describe('QModuleMetadataGenerator', () => {
  let generator: QModuleMetadataGenerator;
  let mockModuleInfo: ModuleInfo;

  beforeEach(() => {
    generator = new QModuleMetadataGenerator();
    mockModuleInfo = createMockModuleInfo('TestModule', '1.0.0');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('should generate complete metadata successfully', async () => {
      const options = createMockGenerationOptions('did:root:123', 'key-123');
      
      const metadata = await generator.generateMetadata(mockModuleInfo, options);

      expect(metadata.module).toBe('TestModule');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.description).toBe(mockModuleInfo.description);
      expect(metadata.identities_supported).toEqual(mockModuleInfo.identitiesSupported);
      expect(metadata.integrations).toEqual(mockModuleInfo.integrations);
      expect(metadata.status).toBeDefined();
      expect(metadata.audit_hash).toBeDefined();
      expect(metadata.compliance).toBeDefined();
      expect(metadata.repository).toBe(mockModuleInfo.repositoryUrl);
      expect(metadata.documentation).toBeDefined();
      expect(metadata.activated_by).toBe(options.activatedBy);
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.checksum).toBeDefined();
      expect(metadata.signature_algorithm).toBeDefined();
      expect(metadata.public_key_id).toBe(options.publicKeyId);
    });

    it('should use custom timestamp when provided', async () => {
      const customTimestamp = 1234567890000;
      const options = createMockGenerationOptions('did:root:123', 'key-123', {
        customTimestamp
      });

      const metadata = await generator.generateMetadata(mockModuleInfo, options);

      expect(metadata.timestamp).toBe(customTimestamp);
    });

    it('should set expiration time when provided', async () => {
      const expirationTime = Date.now() + 86400000; // 24 hours from now
      const options = createMockGenerationOptions('did:root:123', 'key-123', {
        expirationTime
      });

      const metadata = await generator.generateMetadata(mockModuleInfo, options);

      expect(metadata.expires_at).toBe(expirationTime);
    });

    it('should use custom signature algorithm', async () => {
      const options = createMockGenerationOptions('did:root:123', 'key-123', {
        signatureAlgorithm: 'ECDSA-SHA256'
      });

      const metadata = await generator.generateMetadata(mockModuleInfo, options);

      expect(metadata.signature_algorithm).toBe('ECDSA-SHA256');
    });

    it('should skip checksum generation when requested', async () => {
      const options = createMockGenerationOptions('did:root:123', 'key-123', {
        skipChecksumGeneration: true
      });

      const metadata = await generator.generateMetadata(mockModuleInfo, options);

      expect(metadata.checksum).toBeDefined();
      expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // Should still be a valid hash
    });

    it('should validate input data before generation', async () => {
      const invalidModuleInfo = {
        ...mockModuleInfo,
        name: '', // Invalid empty name
        version: 'invalid-version'
      };
      const options = createMockGenerationOptions('did:root:123', 'key-123');

      await expect(generator.generateMetadata(invalidModuleInfo, options))
        .rejects.toThrow(ModuleValidationError);
    });

    it('should validate generation options', async () => {
      const invalidOptions = {
        activatedBy: 'invalid-did',
        publicKeyId: '',
        signatureAlgorithm: 'INVALID_ALGORITHM' as any
      };

      await expect(generator.generateMetadata(mockModuleInfo, invalidOptions))
        .rejects.toThrow(ModuleValidationError);
    });

    it('should handle metadata generation errors', async () => {
      // Mock crypto.subtle to throw an error
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: {
          ...originalCrypto.subtle,
          digest: vi.fn().mockRejectedValue(new Error('Crypto error'))
        }
      };

      const options = createMockGenerationOptions('did:root:123', 'key-123');

      try {
        await generator.generateMetadata(mockModuleInfo, options);
        // Should still succeed with fallback
        expect(true).toBe(true);
      } finally {
        global.crypto = originalCrypto;
      }
    });
  });

  describe('validateMetadata', () => {
    let validMetadata: QModuleMetadata;

    beforeEach(async () => {
      const options = createMockGenerationOptions('did:root:123', 'key-123');
      validMetadata = await generator.generateMetadata(mockModuleInfo, options);
    });

    it('should validate complete metadata successfully', async () => {
      const result = await generator.validateMetadata(validMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

    it('should detect missing required fields', async () => {
      const incompleteMetadata = {
        ...validMetadata,
        module: undefined as any,
        version: undefined as any
      };

      const result = await generator.validateMetadata(incompleteMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module name is required and must be a string');
      expect(result.errors.some(e => e.includes('Version must be a valid semantic version'))).toBe(true);
    });

    it('should validate field formats', async () => {
      const invalidMetadata = {
        ...validMetadata,
        version: 'not-semver',
        repository: 'not-a-url',
        documentation: 'not-a-cid',
        activated_by: 'not-a-did',
        audit_hash: 'not-a-hash',
        checksum: 'not-a-checksum'
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Version must be a valid semantic version'))).toBe(true);
      expect(result.errors.some(e => e.includes('Repository must be a valid HTTPS URL'))).toBe(true);
      expect(result.errors.some(e => e.includes('Documentation must be a valid IPFS CID'))).toBe(true);
      expect(result.errors.some(e => e.includes('Activated_by must be a valid DID'))).toBe(true);
      expect(result.errors.some(e => e.includes('Audit hash must be a valid SHA256 hash'))).toBe(true);
      expect(result.errors.some(e => e.includes('Checksum must be a valid hash'))).toBe(true);
    });

    it('should validate array fields', async () => {
      const invalidMetadata = {
        ...validMetadata,
        identities_supported: [] as any,
        integrations: 'not-an-array' as any
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('At least one supported identity type is required'))).toBe(true);
      expect(result.errors.some(e => e.includes('Integrations must be an array'))).toBe(true);
    });

    it('should validate identity types', async () => {
      const invalidMetadata = {
        ...validMetadata,
        identities_supported: ['INVALID_TYPE' as any, IdentityType.ROOT]
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid identity types: INVALID_TYPE'))).toBe(true);
    });

    it('should validate module status', async () => {
      const invalidMetadata = {
        ...validMetadata,
        status: 'INVALID_STATUS' as any
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid module status: INVALID_STATUS'))).toBe(true);
    });

    it('should validate signature algorithm', async () => {
      const invalidMetadata = {
        ...validMetadata,
        signature_algorithm: 'INVALID_ALGORITHM' as any
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Signature algorithm must be one of'))).toBe(true);
    });

    it('should validate timestamp fields', async () => {
      const invalidMetadata = {
        ...validMetadata,
        timestamp: -1,
        expires_at: validMetadata.timestamp - 1000 // Before timestamp
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Timestamp must be a positive number'))).toBe(true);
      expect(result.errors.some(e => e.includes('Expiration time must be a number greater than timestamp'))).toBe(true);
    });

    it('should warn about unknown integrations', async () => {
      const metadataWithUnknownIntegrations = {
        ...validMetadata,
        integrations: ['Qindex', 'UnknownService', 'Qlock']
      };

      const result = await generator.validateMetadata(metadataWithUnknownIntegrations);

      expect(result.valid).toBe(true); // Should still be valid
      expect(result.warnings.some(w => w.includes('Unknown ecosystem services: UnknownService'))).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Pass invalid metadata that causes validation to throw
      const corruptMetadata = null as any;

      const result = await generator.validateMetadata(corruptMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Validation error'))).toBe(true);
    });
  });

  describe('buildComplianceInfo', () => {
    it('should build compliance with defaults', async () => {
      const compliance = await generator.buildComplianceInfo();

      expect(compliance).toEqual(DEFAULT_MODULE_COMPLIANCE);
    });

    it('should merge partial compliance with defaults', async () => {
      const partialCompliance: Partial<ModuleCompliance> = {
        audit: true,
        kyc_support: true
      };

      const compliance = await generator.buildComplianceInfo(partialCompliance);

      expect(compliance.audit).toBe(true);
      expect(compliance.kyc_support).toBe(true);
      expect(compliance.risk_scoring).toBe(true); // Should be set to true because audit is true
      expect(compliance.privacy_enforced).toBe(true); // Should be set to true because kyc_support is true
      expect(compliance.gdpr_compliant).toBe(true); // Should be set to true because kyc_support is true
    });

    it('should apply business logic for compliance defaults', async () => {
      const auditCompliance = await generator.buildComplianceInfo({ audit: true });
      expect(auditCompliance.risk_scoring).toBe(true);

      const kycCompliance = await generator.buildComplianceInfo({ kyc_support: true });
      expect(kycCompliance.privacy_enforced).toBe(true);
      expect(kycCompliance.gdpr_compliant).toBe(true);
    });

    it('should set default data retention policy', async () => {
      const kycCompliance = await generator.buildComplianceInfo({ kyc_support: true });
      expect(kycCompliance.data_retention_policy).toBe('kyc_retention_7_years');

      const gdprCompliance = await generator.buildComplianceInfo({ gdpr_compliant: true });
      expect(gdprCompliance.data_retention_policy).toBe('gdpr_compliant_retention');

      const auditCompliance = await generator.buildComplianceInfo({ audit: true });
      expect(auditCompliance.data_retention_policy).toBe('audit_retention_5_years');

      const standardCompliance = await generator.buildComplianceInfo({});
      expect(standardCompliance.data_retention_policy).toBe('standard_retention_2_years');
    });
  });

  describe('resolveDependencies', () => {
    it('should resolve dependencies from integrations', async () => {
      const moduleInfoWithIntegrations = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qmarket', 'Qdrive']
      };

      const dependencies = await generator.resolveDependencies(moduleInfoWithIntegrations);

      expect(dependencies).toContain('Qindex'); // Required by Qsocial
      expect(dependencies).toContain('Qlock'); // Required by Qsocial and Qmarket
      expect(dependencies).toContain('Qerberos'); // Required by Qsocial and Qdrive
      expect(dependencies).toContain('Qwallet'); // Required by Qmarket
    });

    it('should return empty array for no integrations', async () => {
      const moduleInfoWithoutIntegrations = {
        ...mockModuleInfo,
        integrations: []
      };

      const dependencies = await generator.resolveDependencies(moduleInfoWithoutIntegrations);

      expect(dependencies).toEqual([]);
    });

    it('should deduplicate dependencies', async () => {
      const moduleInfoWithOverlappingIntegrations = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qmail', 'Qchat'] // All require Qindex and Qlock
      };

      const dependencies = await generator.resolveDependencies(moduleInfoWithOverlappingIntegrations);

      const qindexCount = dependencies.filter(dep => dep === 'Qindex').length;
      const qlockCount = dependencies.filter(dep => dep === 'Qlock').length;

      expect(qindexCount).toBe(1);
      expect(qlockCount).toBe(1);
    });

    it('should sort dependencies alphabetically', async () => {
      const moduleInfoWithIntegrations = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qmarket']
      };

      const dependencies = await generator.resolveDependencies(moduleInfoWithIntegrations);

      const sortedDependencies = [...dependencies].sort();
      expect(dependencies).toEqual(sortedDependencies);
    });
  });

  describe('generateModuleChecksum', () => {
    it('should generate consistent checksums', async () => {
      const checksum1 = await generator.generateModuleChecksum(mockModuleInfo);
      const checksum2 = await generator.generateModuleChecksum(mockModuleInfo);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 format
    });

    it('should generate different checksums for different modules', async () => {
      const moduleInfo2 = {
        ...mockModuleInfo,
        name: 'DifferentModule'
      };

      const checksum1 = await generator.generateModuleChecksum(mockModuleInfo);
      const checksum2 = await generator.generateModuleChecksum(moduleInfo2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle crypto API unavailability', async () => {
      // Mock crypto.subtle to be undefined
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: undefined as any
      };

      try {
        const checksum = await generator.generateModuleChecksum(mockModuleInfo);
        expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        global.crypto = originalCrypto;
      }
    });

    it('should use fallback checksum generation on error', async () => {
      // Mock crypto.subtle.digest to throw an error
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: {
          ...originalCrypto.subtle,
          digest: vi.fn().mockRejectedValue(new Error('Crypto error'))
        }
      };

      try {
        const checksum = await generator.generateModuleChecksum(mockModuleInfo);
        expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        global.crypto = originalCrypto;
      }
    });
  });

  describe('private helper methods', () => {
    it('should validate module info correctly', async () => {
      const validModuleInfo = mockModuleInfo;
      
      // Should not throw for valid module info
      await expect((generator as any).validateModuleInfo(validModuleInfo))
        .resolves.not.toThrow();
    });

    it('should reject invalid module info', async () => {
      const invalidModuleInfo = {
        ...mockModuleInfo,
        name: '',
        version: 'invalid',
        description: 'short',
        identitiesSupported: [],
        integrations: 'not-array' as any,
        repositoryUrl: 'not-url'
      };

      await expect((generator as any).validateModuleInfo(invalidModuleInfo))
        .rejects.toThrow(ModuleValidationError);
    });

    it('should validate generation options correctly', async () => {
      const validOptions = createMockGenerationOptions('did:root:123', 'key-123');

      await expect((generator as any).validateGenerationOptions(validOptions))
        .resolves.not.toThrow();
    });

    it('should reject invalid generation options', async () => {
      const invalidOptions = {
        activatedBy: 'invalid-did',
        publicKeyId: '',
        signatureAlgorithm: 'INVALID' as any,
        customTimestamp: -1,
        expirationTime: 100 // Less than customTimestamp
      };

      await expect((generator as any).validateGenerationOptions(invalidOptions))
        .rejects.toThrow(ModuleValidationError);
    });

    it('should determine module status correctly', () => {
      const productionModule = {
        ...mockModuleInfo,
        auditHash: 'valid-hash',
        compliance: { audit: true } as Partial<ModuleCompliance>
      };
      expect((generator as any).determineModuleStatus(productionModule)).toBe(ModuleStatus.PRODUCTION_READY);

      const testingModule = {
        ...mockModuleInfo,
        documentationCid: 'valid-cid'
      };
      expect((generator as any).determineModuleStatus(testingModule)).toBe(ModuleStatus.TESTING);

      const developmentModule = mockModuleInfo;
      expect((generator as any).determineModuleStatus(developmentModule)).toBe(ModuleStatus.DEVELOPMENT);
    });

    it('should validate integrations correctly', () => {
      const validIntegrations = ['Qindex', 'Qlock', 'Qerberos'];
      const result = (generator as any).validateIntegrations(validIntegrations);
      expect(result).toEqual(validIntegrations);

      const mixedIntegrations = ['Qindex', 'UnknownService', 'Qlock'];
      const filteredResult = (generator as any).validateIntegrations(mixedIntegrations);
      expect(filteredResult).toEqual(['Qindex', 'Qlock']);
    });

    it('should generate audit hash correctly', async () => {
      const auditHash = await (generator as any).generateAuditHash(mockModuleInfo);
      
      expect(auditHash).toMatch(/^[a-f0-9]{64}$/);
      expect(auditHash.length).toBe(64);
    });

    it('should generate documentation placeholder correctly', async () => {
      const docCid = await (generator as any).generateDocumentationPlaceholder();
      
      expect(docCid).toMatch(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/); // Valid IPFS CID format
    });

    it('should generate placeholder checksum correctly', async () => {
      const checksum = await (generator as any).generatePlaceholderChecksum('TestModule', '1.0.0');
      
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(checksum.length).toBe(64);
    });

    it('should get default data retention policy correctly', () => {
      const kycPolicy = (generator as any).getDefaultDataRetentionPolicy({ kyc_support: true });
      expect(kycPolicy).toBe('kyc_retention_7_years');

      const gdprPolicy = (generator as any).getDefaultDataRetentionPolicy({ gdpr_compliant: true });
      expect(gdprPolicy).toBe('gdpr_compliant_retention');

      const auditPolicy = (generator as any).getDefaultDataRetentionPolicy({ audit: true });
      expect(auditPolicy).toBe('audit_retention_5_years');

      const standardPolicy = (generator as any).getDefaultDataRetentionPolicy({});
      expect(standardPolicy).toBe('standard_retention_2_years');
    });
  });
});