/**
 * Integration Tests for QModuleMetadataGenerator Service
 * Demonstrates real-world usage scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QModuleMetadataGenerator } from '../QModuleMetadataGenerator';
import { ModuleInfo, ModuleStatus } from '../../types/qwallet-module-registration';
import { IdentityType } from '../../types/identity';

describe('QModuleMetadataGenerator Integration', () => {
  let generator: QModuleMetadataGenerator;

  beforeEach(() => {
    generator = new QModuleMetadataGenerator();
  });

  describe('Real-world Qwallet module registration', () => {
    it('should generate complete metadata for Qwallet production module', async () => {
      const qwalletModuleInfo: ModuleInfo = {
        name: 'Qwallet',
        version: '1.0.0',
        description: 'Digital wallet for the AnarQ ecosystem with multi-chain support and identity management',
        identitiesSupported: [
          IdentityType.ROOT,
          IdentityType.DAO,
          IdentityType.ENTERPRISE,
          IdentityType.CONSENTIDA
        ],
        integrations: [
          'Qindex',
          'Qlock',
          'Qerberos',
          'Qonsent'
        ],
        repositoryUrl: 'https://github.com/anarq/qwallet',
        documentationCid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
        auditHash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: true,
          gdpr_compliant: true
        }
      };

      const generationOptions = {
        activatedBy: 'did:example:root12345',
        publicKeyId: 'qwallet-signing-key-2024',
        signatureAlgorithm: 'RSA-SHA256' as const,
        customTimestamp: Date.now()
      };

      const metadata = await generator.generateMetadata(qwalletModuleInfo, generationOptions);

      // Verify core metadata
      expect(metadata.module).toBe('Qwallet');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.status).toBe(ModuleStatus.PRODUCTION_READY);
      
      // Verify ecosystem integration
      expect(metadata.identities_supported).toContain(IdentityType.ROOT);
      expect(metadata.identities_supported).toContain(IdentityType.DAO);
      expect(metadata.integrations).toContain('Qindex');
      expect(metadata.integrations).toContain('Qlock');
      
      // Verify dependencies were resolved
      expect(metadata.dependencies).toBeDefined();
      expect(metadata.dependencies).toContain('Qindex'); // Required by Qerberos
      expect(metadata.dependencies).toContain('Qlock'); // Required by Qonsent
      
      // Verify compliance
      expect(metadata.compliance.audit).toBe(true);
      expect(metadata.compliance.kyc_support).toBe(true);
      expect(metadata.compliance.gdpr_compliant).toBe(true);
      expect(metadata.compliance.data_retention_policy).toBe('kyc_retention_7_years');
      
      // Verify security fields
      expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.audit_hash).toBe(qwalletModuleInfo.auditHash);
      expect(metadata.signature_algorithm).toBe('RSA-SHA256');
      
      // Verify registration metadata
      expect(metadata.activated_by).toBe('did:example:root12345');
      expect(metadata.public_key_id).toBe('qwallet-signing-key-2024');
      expect(metadata.timestamp).toBe(generationOptions.customTimestamp);
    });

    it('should generate metadata for development module without audit', async () => {
      const devModuleInfo: ModuleInfo = {
        name: 'QwalletDev',
        version: '0.1.0-alpha',
        description: 'Development version of Qwallet with experimental features',
        identitiesSupported: [IdentityType.ROOT],
        integrations: ['Qindex'],
        repositoryUrl: 'https://github.com/anarq/qwalletdev',
        compliance: {
          audit: false,
          risk_scoring: false,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true
        }
      };

      const generationOptions = {
        activatedBy: 'did:example:rootdev123',
        publicKeyId: 'dev-key-123'
      };

      const metadata = await generator.generateMetadata(devModuleInfo, generationOptions);

      expect(metadata.status).toBe(ModuleStatus.DEVELOPMENT);
      expect(metadata.compliance.audit).toBe(false);
      expect(metadata.compliance.data_retention_policy).toBe('gdpr_compliant_retention');
      expect(metadata.dependencies).toBeUndefined(); // No dependencies for Qindex only
      expect(metadata.documentation).toMatch(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/); // Generated placeholder
    });

    it('should handle complex module with multiple integrations', async () => {
      const complexModuleInfo: ModuleInfo = {
        name: 'QwalletEnterprise',
        version: '2.0.0',
        description: 'Enterprise version of Qwallet with advanced features for organizations',
        identitiesSupported: [
          IdentityType.ROOT,
          IdentityType.DAO,
          IdentityType.ENTERPRISE
        ],
        integrations: [
          'Qindex',
          'Qlock',
          'Qerberos',
          'Qonsent',
          'Qsocial',
          'Qdrive',
          'Qmarket'
        ],
        repositoryUrl: 'https://github.com/anarq/qwalletenterprise',
        documentationCid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh52',
        auditHash: 'b2c3d4e5f67890123456789012345678901234567890123456789012345678ab',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: true,
          gdpr_compliant: true
        }
      };

      const generationOptions = {
        activatedBy: 'did:example:enterprisemain',
        publicKeyId: 'enterprise-key-2024',
        signatureAlgorithm: 'ECDSA-SHA256' as const
      };

      const metadata = await generator.generateMetadata(complexModuleInfo, generationOptions);

      // Should have many dependencies due to complex integrations
      expect(metadata.dependencies).toBeDefined();
      expect(metadata.dependencies!.length).toBeGreaterThan(3);
      expect(metadata.dependencies).toContain('Qindex');
      expect(metadata.dependencies).toContain('Qlock');
      expect(metadata.dependencies).toContain('Qerberos');
      expect(metadata.dependencies).toContain('Qwallet'); // Required by Qmarket

      // Should be production ready due to audit
      expect(metadata.status).toBe(ModuleStatus.PRODUCTION_READY);
      
      // Should use ECDSA signature algorithm
      expect(metadata.signature_algorithm).toBe('ECDSA-SHA256');
    });
  });

  describe('Validation scenarios', () => {
    it('should validate complete production-ready metadata', async () => {
      const productionMetadata = {
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Production-ready digital wallet for the AnarQ ecosystem',
        identities_supported: [IdentityType.ROOT, IdentityType.DAO],
        integrations: ['Qindex', 'Qlock', 'Qerberos'],
        dependencies: ['Qindex', 'Qlock'],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        compliance: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: true,
          gdpr_compliant: true,
          data_retention_policy: 'kyc_retention_7_years'
        },
        repository: 'https://github.com/anarq/qwallet',
        documentation: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
        activated_by: 'did:example:root12345',
        timestamp: Date.now(),
        checksum: 'b2c3d4e5f67890123456789012345678901234567890123456789012345678ab',
        signature_algorithm: 'RSA-SHA256',
        public_key_id: 'production-key-2024'
      };

      const result = await generator.validateMetadata(productionMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect and report validation errors', async () => {
      const invalidMetadata = {
        module: '', // Invalid empty name
        version: 'not-semantic', // Invalid version
        description: 'Short', // Too short description
        identities_supported: [], // Empty array
        integrations: ['InvalidService'], // Unknown service
        status: 'INVALID_STATUS' as any, // Invalid status
        audit_hash: 'invalid-hash', // Invalid hash format
        compliance: {
          audit: 'not-boolean' as any, // Invalid type
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: true,
          gdpr_compliant: true,
          data_retention_policy: ''
        },
        repository: 'not-a-url', // Invalid URL
        documentation: 'invalid-cid', // Invalid IPFS CID
        activated_by: 'not-a-did', // Invalid DID
        timestamp: -1, // Invalid timestamp
        checksum: 'invalid-checksum', // Invalid checksum
        signature_algorithm: 'INVALID_ALG', // Invalid algorithm
        public_key_id: '' // Empty key ID
      };

      const result = await generator.validateMetadata(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(10);
      
      // Check for specific error messages
      expect(result.errors).toContain('Module name is required and must be a string');
      expect(result.errors).toContain('Version must be a valid semantic version (e.g., 1.0.0)');
      expect(result.errors).toContain('Description must be between 10 and 1000 characters');
      expect(result.errors).toContain('At least one supported identity type is required');
      expect(result.errors).toContain('Repository must be a valid HTTPS URL');
      expect(result.errors).toContain('Documentation must be a valid IPFS CID');
      expect(result.errors).toContain('Activated_by must be a valid DID');
      expect(result.errors).toContain('Timestamp must be a positive number');
      
      // Check for warnings about unknown services
      expect(result.warnings.some(w => w.includes('Unknown ecosystem services'))).toBe(true);
    });
  });

  describe('Compliance scenarios', () => {
    it('should build appropriate compliance for KYC module', async () => {
      const kycCompliance = await generator.buildComplianceInfo({
        kyc_support: true
      });

      expect(kycCompliance.kyc_support).toBe(true);
      expect(kycCompliance.privacy_enforced).toBe(true); // Auto-enabled for KYC
      expect(kycCompliance.gdpr_compliant).toBe(true); // Auto-enabled for KYC
      expect(kycCompliance.data_retention_policy).toBe('kyc_retention_7_years');
    });

    it('should build appropriate compliance for audited module', async () => {
      const auditCompliance = await generator.buildComplianceInfo({
        audit: true
      });

      expect(auditCompliance.audit).toBe(true);
      expect(auditCompliance.risk_scoring).toBe(true); // Auto-enabled for audited modules
      expect(auditCompliance.data_retention_policy).toBe('audit_retention_5_years');
    });

    it('should use standard retention for basic modules', async () => {
      const basicCompliance = await generator.buildComplianceInfo({});

      expect(basicCompliance.data_retention_policy).toBe('standard_retention_2_years');
    });
  });

  describe('Dependency resolution scenarios', () => {
    it('should resolve no dependencies for core services only', async () => {
      const coreModuleInfo: ModuleInfo = {
        name: 'CoreModule',
        version: '1.0.0',
        description: 'Module using only core services',
        identitiesSupported: [IdentityType.ROOT],
        integrations: ['Qindex', 'Qlock'],
        repositoryUrl: 'https://github.com/example/core'
      };

      const dependencies = await generator.resolveDependencies(coreModuleInfo);
      expect(dependencies).toEqual([]);
    });

    it('should resolve complex dependencies for advanced services', async () => {
      const advancedModuleInfo: ModuleInfo = {
        name: 'AdvancedModule',
        version: '1.0.0',
        description: 'Module using advanced services',
        identitiesSupported: [IdentityType.ROOT],
        integrations: ['Qsocial', 'Qmarket', 'Qpic'],
        repositoryUrl: 'https://github.com/example/advanced'
      };

      const dependencies = await generator.resolveDependencies(advancedModuleInfo);
      
      expect(dependencies).toContain('Qindex'); // Required by all
      expect(dependencies).toContain('Qlock'); // Required by all
      expect(dependencies).toContain('Qerberos'); // Required by Qsocial
      expect(dependencies).toContain('Qwallet'); // Required by Qmarket
      expect(dependencies).toContain('Qdrive'); // Required by Qpic
      
      // Should be sorted and deduplicated
      expect(dependencies).toEqual([...new Set(dependencies)].sort());
    });
  });
});