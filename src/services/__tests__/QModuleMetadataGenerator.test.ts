/**
 * Tests for QModuleMetadataGenerator Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QModuleMetadataGenerator } from '../QModuleMetadataGenerator';
import {
  ModuleInfo,
  ModuleStatus,
  ModuleValidationError,
  DEFAULT_MODULE_COMPLIANCE
} from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('QModuleMetadataGenerator', () => {
  let generator: QModuleMetadataGenerator;
  let mockModuleInfo: ModuleInfo;
  let mockGenerationOptions: any;

  beforeEach(() => {
    generator = new QModuleMetadataGenerator();
    
    mockModuleInfo = {
      name: 'Qwallet',
      version: '1.0.0',
      description: 'Digital wallet for the AnarQ ecosystem with multi-chain support',
      identitiesSupported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
      integrations: ['Qindex', 'Qlock', 'Qerberos'],
      repositoryUrl: 'https://github.com/anarq/qwallet',
      documentationCid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
      auditHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
      compliance: { audit: true }
    };

    mockGenerationOptions = {
      activatedBy: 'did:example:root123456789',
      publicKeyId: 'key-123456789',
      signatureAlgorithm: 'RSA-SHA256' as const,
      customTimestamp: 1640995200000
    };

    // Mock crypto.subtle for consistent testing
    global.crypto = {
      subtle: {
        digest: vi.fn().mockImplementation(async (algorithm: string, data: ArrayBuffer) => {
          // Create a hash based on the input data for different results
          const inputArray = new Uint8Array(data);
          const mockHash = new Uint8Array(32);
          let seed = 0;
          
          // Generate seed from input data
          for (let i = 0; i < inputArray.length; i++) {
            seed += inputArray[i] * (i + 1);
          }
          
          // Generate hash based on seed
          for (let i = 0; i < 32; i++) {
            mockHash[i] = (seed + i * 8) % 256;
          }
          return mockHash.buffer;
        })
      }
    } as any;
  });

  describe('generateMetadata', () => {
    it('should generate complete metadata with all required fields', async () => {
      const metadata = await generator.generateMetadata(mockModuleInfo, mockGenerationOptions);

      expect(metadata).toMatchObject({
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Digital wallet for the AnarQ ecosystem with multi-chain support',
        status: ModuleStatus.PRODUCTION_READY,
        repository: 'https://github.com/anarq/qwallet',
        documentation: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
        activated_by: 'did:example:root123456789',
        timestamp: 1640995200000,
        signature_algorithm: 'RSA-SHA256',
        public_key_id: 'key-123456789'
      });

      // Check arrays separately since order might differ
      expect(metadata.identities_supported).toEqual(
        expect.arrayContaining([IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE])
      );
      expect(metadata.integrations).toEqual(
        expect.arrayContaining(['Qindex', 'Qlock', 'Qerberos'])
      );

      expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.audit_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.compliance).toBeDefined();
    });

    it('should generate dependencies based on integrations', async () => {
      const moduleInfoWithDependencies = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qdrive', 'Qmarket']
      };

      const metadata = await generator.generateMetadata(moduleInfoWithDependencies, mockGenerationOptions);

      expect(metadata.dependencies).toContain('Qindex');
      expect(metadata.dependencies).toContain('Qlock');
      expect(metadata.dependencies).toContain('Qerberos');
      expect(metadata.dependencies).toContain('Qwallet'); // For Qmarket
    });

    it('should determine correct module status based on audit and documentation', async () => {
      // Test PRODUCTION_READY status
      const productionModule = {
        ...mockModuleInfo,
        auditHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        compliance: { audit: true }
      };
      const productionMetadata = await generator.generateMetadata(productionModule, mockGenerationOptions);
      expect(productionMetadata.status).toBe(ModuleStatus.PRODUCTION_READY);

      // Test TESTING status
      const testingModule = {
        ...mockModuleInfo,
        auditHash: undefined,
        compliance: { audit: false },
        documentationCid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51'
      };
      const testingMetadata = await generator.generateMetadata(testingModule, mockGenerationOptions);
      expect(testingMetadata.status).toBe(ModuleStatus.TESTING);

      // Test DEVELOPMENT status - need to remove documentationCid from base module
      const developmentModule = {
        name: 'Qwallet',
        version: '1.0.0',
        description: 'Digital wallet for the AnarQ ecosystem with multi-chain support',
        identitiesSupported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
        integrations: ['Qindex', 'Qlock', 'Qerberos'],
        repositoryUrl: 'https://github.com/anarq/qwallet',
        compliance: { audit: false }
      };
      const developmentMetadata = await generator.generateMetadata(developmentModule, mockGenerationOptions);
      expect(developmentMetadata.status).toBe(ModuleStatus.DEVELOPMENT);
    });

    it('should handle optional expiration time', async () => {
      const optionsWithExpiration = {
        ...mockGenerationOptions,
        expirationTime: 1672531200000 // Future timestamp
      };

      const metadata = await generator.generateMetadata(mockModuleInfo, optionsWithExpiration);
      expect(metadata.expires_at).toBe(1672531200000);
    });

    it('should skip checksum generation when requested', async () => {
      const optionsWithSkipChecksum = {
        ...mockGenerationOptions,
        skipChecksumGeneration: true
      };

      const metadata = await generator.generateMetadata(mockModuleInfo, optionsWithSkipChecksum);
      expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // Should still have a placeholder checksum
    });

    it('should throw validation error for invalid module info', async () => {
      const invalidModuleInfo = {
        ...mockModuleInfo,
        name: '', // Invalid empty name
        version: 'invalid-version' // Invalid version format
      };

      await expect(
        generator.generateMetadata(invalidModuleInfo, mockGenerationOptions)
      ).rejects.toThrow(ModuleValidationError);
    });

    it('should throw validation error for invalid generation options', async () => {
      const invalidOptions = {
        ...mockGenerationOptions,
        activatedBy: 'invalid-did', // Invalid DID format
        publicKeyId: '' // Empty public key ID
      };

      await expect(
        generator.generateMetadata(mockModuleInfo, invalidOptions)
      ).rejects.toThrow(ModuleValidationError);
    });
  });

  describe('validateMetadata', () => {
    let validMetadata: any;

    beforeEach(async () => {
      validMetadata = await generator.generateMetadata(mockModuleInfo, mockGenerationOptions);
    });

    it('should validate correct metadata successfully', async () => {
      const result = await generator.validateMetadata(validMetadata);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const incompleteMetadata = { ...validMetadata };
      delete incompleteMetadata.module;
      delete incompleteMetadata.version;

      const result = await generator.validateMetadata(incompleteMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module name is required and must be a string');
      expect(result.errors).toContain('Version must be a valid semantic version (e.g., 1.0.0)');
    });

    it('should validate semantic version format', async () => {
      const invalidVersionMetadata = {
        ...validMetadata,
        version: 'invalid-version'
      };

      const result = await generator.validateMetadata(invalidVersionMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Version must be a valid semantic version (e.g., 1.0.0)');
    });

    it('should validate identity types', async () => {
      const invalidIdentityMetadata = {
        ...validMetadata,
        identities_supported: ['INVALID_TYPE', IdentityType.ROOT]
      };

      const result = await generator.validateMetadata(invalidIdentityMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid identity types'))).toBe(true);
    });

    it('should validate URL format for repository', async () => {
      const invalidRepoMetadata = {
        ...validMetadata,
        repository: 'not-a-valid-url'
      };

      const result = await generator.validateMetadata(invalidRepoMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository must be a valid HTTPS URL');
    });

    it('should validate IPFS CID format for documentation', async () => {
      const invalidDocMetadata = {
        ...validMetadata,
        documentation: 'invalid-cid'
      };

      const result = await generator.validateMetadata(invalidDocMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Documentation must be a valid IPFS CID');
    });

    it('should validate DID format for activated_by', async () => {
      const invalidDidMetadata = {
        ...validMetadata,
        activated_by: 'invalid-did'
      };

      const result = await generator.validateMetadata(invalidDidMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Activated_by must be a valid DID');
    });

    it('should validate SHA256 hash format for audit_hash and checksum', async () => {
      const invalidHashMetadata = {
        ...validMetadata,
        audit_hash: 'invalid-hash',
        checksum: 'invalid-checksum'
      };

      const result = await generator.validateMetadata(invalidHashMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Audit hash must be a valid SHA256 hash');
      expect(result.errors).toContain('Checksum must be a valid SHA256 hash');
    });

    it('should validate signature algorithm', async () => {
      const invalidSigMetadata = {
        ...validMetadata,
        signature_algorithm: 'INVALID_ALGORITHM'
      };

      const result = await generator.validateMetadata(invalidSigMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Signature algorithm must be one of'))).toBe(true);
    });

    it('should validate timestamp and expiration', async () => {
      const invalidTimeMetadata = {
        ...validMetadata,
        timestamp: -1,
        expires_at: -2 // Earlier than timestamp
      };

      const result = await generator.validateMetadata(invalidTimeMetadata);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timestamp must be a positive number');
      expect(result.errors).toContain('Expiration time must be a number greater than timestamp');
    });

    it('should provide warnings for unknown integrations', async () => {
      const unknownIntegrationMetadata = {
        ...validMetadata,
        integrations: ['Qindex', 'UnknownService']
      };

      const result = await generator.validateMetadata(unknownIntegrationMetadata);
      
      expect(result.warnings.some(warning => warning.includes('Unknown ecosystem services'))).toBe(true);
    });
  });

  describe('buildComplianceInfo', () => {
    it('should use default compliance when no partial compliance provided', async () => {
      const compliance = await generator.buildComplianceInfo();
      
      expect(compliance).toEqual({
        ...DEFAULT_MODULE_COMPLIANCE,
        data_retention_policy: 'standard_retention_2_years'
      });
    });

    it('should merge partial compliance with defaults', async () => {
      const partialCompliance = {
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

    it('should set appropriate data retention policy based on compliance', async () => {
      const kycCompliance = await generator.buildComplianceInfo({ kyc_support: true });
      expect(kycCompliance.data_retention_policy).toBe('kyc_retention_7_years');

      const gdprCompliance = await generator.buildComplianceInfo({ gdpr_compliant: true });
      expect(gdprCompliance.data_retention_policy).toBe('gdpr_compliant_retention');

      const auditCompliance = await generator.buildComplianceInfo({ audit: true });
      expect(auditCompliance.data_retention_policy).toBe('audit_retention_5_years');

      const defaultCompliance = await generator.buildComplianceInfo({});
      expect(defaultCompliance.data_retention_policy).toBe('standard_retention_2_years');
    });
  });

  describe('resolveDependencies', () => {
    it('should return empty array for modules with no integrations', async () => {
      const moduleWithNoIntegrations = {
        ...mockModuleInfo,
        integrations: []
      };

      const dependencies = await generator.resolveDependencies(moduleWithNoIntegrations);
      expect(dependencies).toEqual([]);
    });

    it('should resolve dependencies for core services', async () => {
      const moduleWithCoreServices = {
        ...mockModuleInfo,
        integrations: ['Qindex', 'Qlock']
      };

      const dependencies = await generator.resolveDependencies(moduleWithCoreServices);
      expect(dependencies).toEqual([]); // Core services have no dependencies
    });

    it('should resolve dependencies for complex services', async () => {
      const moduleWithComplexServices = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qmarket']
      };

      const dependencies = await generator.resolveDependencies(moduleWithComplexServices);
      expect(dependencies).toContain('Qindex');
      expect(dependencies).toContain('Qlock');
      expect(dependencies).toContain('Qerberos');
      expect(dependencies).toContain('Qwallet');
    });

    it('should deduplicate dependencies', async () => {
      const moduleWithOverlappingServices = {
        ...mockModuleInfo,
        integrations: ['Qsocial', 'Qdrive', 'Qmail'] // All require Qindex and Qlock
      };

      const dependencies = await generator.resolveDependencies(moduleWithOverlappingServices);
      const uniqueDependencies = [...new Set(dependencies)];
      expect(dependencies).toEqual(uniqueDependencies);
    });
  });

  describe('generateModuleChecksum', () => {
    it('should generate consistent checksum for same module info', async () => {
      const checksum1 = await generator.generateModuleChecksum(mockModuleInfo);
      const checksum2 = await generator.generateModuleChecksum(mockModuleInfo);
      
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different checksums for different module info', async () => {
      const moduleInfo2 = {
        ...mockModuleInfo,
        version: '2.0.0'
      };

      const checksum1 = await generator.generateModuleChecksum(mockModuleInfo);
      const checksum2 = await generator.generateModuleChecksum(moduleInfo2);
      
      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle crypto API failure gracefully', async () => {
      // Mock crypto.subtle to throw an error
      const originalCrypto = global.crypto;
      global.crypto = {
        subtle: {
          digest: vi.fn().mockRejectedValue(new Error('Crypto API not available'))
        }
      } as any;

      const checksum = await generator.generateModuleChecksum(mockModuleInfo);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);

      // Restore original crypto
      global.crypto = originalCrypto;
    });
  });

  describe('error handling', () => {
    it('should throw ModuleValidationError for invalid module name', async () => {
      const invalidModule = {
        ...mockModuleInfo,
        name: ''
      };

      await expect(
        generator.generateMetadata(invalidModule, mockGenerationOptions)
      ).rejects.toThrow(ModuleValidationError);
    });

    it('should throw ModuleValidationError for invalid version', async () => {
      const invalidModule = {
        ...mockModuleInfo,
        version: 'not-semantic'
      };

      await expect(
        generator.generateMetadata(invalidModule, mockGenerationOptions)
      ).rejects.toThrow(ModuleValidationError);
    });

    it('should throw ModuleValidationError for invalid repository URL', async () => {
      const invalidModule = {
        ...mockModuleInfo,
        repositoryUrl: 'not-a-url'
      };

      await expect(
        generator.generateMetadata(invalidModule, mockGenerationOptions)
      ).rejects.toThrow(ModuleValidationError);
    });

    it('should throw ModuleValidationError for invalid DID in options', async () => {
      const invalidOptions = {
        ...mockGenerationOptions,
        activatedBy: 'not-a-did'
      };

      await expect(
        generator.generateMetadata(mockModuleInfo, invalidOptions)
      ).rejects.toThrow(ModuleValidationError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty integrations array', async () => {
      const moduleWithNoIntegrations = {
        ...mockModuleInfo,
        integrations: []
      };

      const metadata = await generator.generateMetadata(moduleWithNoIntegrations, mockGenerationOptions);
      expect(metadata.integrations).toEqual([]);
      expect(metadata.dependencies).toBeUndefined();
    });

    it('should handle unknown integrations gracefully', async () => {
      const moduleWithUnknownIntegrations = {
        ...mockModuleInfo,
        integrations: ['Qindex', 'UnknownService', 'AnotherUnknown']
      };

      const metadata = await generator.generateMetadata(moduleWithUnknownIntegrations, mockGenerationOptions);
      expect(metadata.integrations).toEqual(['Qindex']); // Only known services
    });

    it('should handle very long descriptions', async () => {
      const moduleWithLongDescription = {
        ...mockModuleInfo,
        description: 'A'.repeat(1001) // Exceeds 1000 character limit
      };

      await expect(
        generator.generateMetadata(moduleWithLongDescription, mockGenerationOptions)
      ).rejects.toThrow(ModuleValidationError);
    });

    it('should handle minimum valid description', async () => {
      const moduleWithMinDescription = {
        ...mockModuleInfo,
        description: 'Valid desc' // Exactly 10 characters
      };

      const metadata = await generator.generateMetadata(moduleWithMinDescription, mockGenerationOptions);
      expect(metadata.description).toBe('Valid desc');
    });
  });
});