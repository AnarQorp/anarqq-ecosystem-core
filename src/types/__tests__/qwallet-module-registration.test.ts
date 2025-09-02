/**
 * Tests for Qwallet Module Registration Types and Validation
 */

import { describe, it, expect } from 'vitest';
import {
  QModuleMetadata,
  ModuleCompliance,
  ModuleInfo,
  ModuleRegistrationRequest,
  SignedModuleMetadata,
  ModuleStatus,
  DEFAULT_MODULE_COMPLIANCE,
  DEFAULT_REGISTRATION_OPTIONS,
  SEMANTIC_VERSION_PATTERN,
  SHA256_PATTERN,
  URL_PATTERN,
  IPFS_CID_PATTERN,
  DID_PATTERN,
  CHECKSUM_PATTERN,
  SUPPORTED_SIGNATURE_ALGORITHMS
} from '../qwallet-module-registration';
import { IdentityType } from '../identity';
import {
  validateModuleMetadata,
  validateModuleCompliance,
  validateModuleInfo,
  validateRegistrationRequest,
  validateSignedMetadata,
  ModuleMetadataValidator
} from '../../utils/qwallet-module-validation';

describe('Qwallet Module Registration Types', () => {
  describe('Pattern Validation', () => {
    it('should validate semantic version pattern', () => {
      expect(SEMANTIC_VERSION_PATTERN.test('1.0.0')).toBe(true);
      expect(SEMANTIC_VERSION_PATTERN.test('1.2.3-alpha.1')).toBe(true);
      expect(SEMANTIC_VERSION_PATTERN.test('2.0.0-beta+build.1')).toBe(true);
      expect(SEMANTIC_VERSION_PATTERN.test('invalid')).toBe(false);
      expect(SEMANTIC_VERSION_PATTERN.test('1.0')).toBe(false);
    });

    it('should validate SHA256 pattern', () => {
      expect(SHA256_PATTERN.test('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3')).toBe(true);
      expect(SHA256_PATTERN.test('invalid')).toBe(false);
      expect(SHA256_PATTERN.test('123')).toBe(false);
    });

    it('should validate URL pattern', () => {
      expect(URL_PATTERN.test('https://github.com/example/repo')).toBe(true);
      expect(URL_PATTERN.test('http://example.com')).toBe(true);
      expect(URL_PATTERN.test('invalid-url')).toBe(false);
      expect(URL_PATTERN.test('ftp://example.com')).toBe(false);
    });

    it('should validate IPFS CID pattern', () => {
      expect(IPFS_CID_PATTERN.test('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
      expect(IPFS_CID_PATTERN.test('invalid-cid')).toBe(false);
      expect(IPFS_CID_PATTERN.test('Qm123')).toBe(false);
    });

    it('should validate DID pattern', () => {
      expect(DID_PATTERN.test('did:example:123456789abcdefghi')).toBe(true);
      expect(DID_PATTERN.test('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')).toBe(true);
      expect(DID_PATTERN.test('invalid-did')).toBe(false);
      expect(DID_PATTERN.test('did:')).toBe(false);
    });

    it('should validate checksum pattern', () => {
      expect(CHECKSUM_PATTERN.test('a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3')).toBe(true);
      expect(CHECKSUM_PATTERN.test('invalid')).toBe(false);
      expect(CHECKSUM_PATTERN.test('123')).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should have correct default module compliance', () => {
      expect(DEFAULT_MODULE_COMPLIANCE).toEqual({
        audit: false,
        risk_scoring: false,
        privacy_enforced: false,
        kyc_support: false,
        gdpr_compliant: false,
        data_retention_policy: 'default'
      });
    });

    it('should have correct default registration options', () => {
      expect(DEFAULT_REGISTRATION_OPTIONS).toEqual({
        testMode: false,
        skipDependencyCheck: false,
        expirationTime: undefined
      });
    });

    it('should have supported signature algorithms', () => {
      expect(SUPPORTED_SIGNATURE_ALGORITHMS).toContain('RSA-SHA256');
      expect(SUPPORTED_SIGNATURE_ALGORITHMS).toContain('ECDSA-SHA256');
      expect(SUPPORTED_SIGNATURE_ALGORITHMS).toContain('Ed25519');
      expect(SUPPORTED_SIGNATURE_ALGORITHMS).toContain('RSA-PSS-SHA256');
    });
  });
});

describe('Module Metadata Validation', () => {
  const validMetadata: QModuleMetadata = {
    module: 'Qwallet',
    version: '1.0.0',
    description: 'A comprehensive wallet module for the AnarQ ecosystem',
    identities_supported: [IdentityType.ROOT, IdentityType.DAO],
    integrations: ['Qindex', 'Qlock', 'Qerberos'],
    status: ModuleStatus.PRODUCTION_READY,
    audit_hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    compliance: {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard-30-days'
    },
    repository: 'https://github.com/anarq/qwallet',
    documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    activated_by: 'did:example:123456789abcdefghi',
    timestamp: Date.now(),
    checksum: 'b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4',
    signature_algorithm: 'RSA-SHA256',
    public_key_id: 'key-123'
  };

  describe('validateModuleMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validateModuleMetadata(validMetadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject metadata with missing required fields', () => {
      const invalidMetadata = { ...validMetadata };
      delete (invalidMetadata as any).module;
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Required field 'module' is missing");
      expect(result.missingFields).toContain('module');
    });

    it('should reject metadata with invalid version', () => {
      const invalidMetadata = { ...validMetadata, version: 'invalid-version' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('version'))).toBe(true);
      expect(result.invalidFields).toContain('version');
    });

    it('should reject metadata with invalid status', () => {
      const invalidMetadata = { ...validMetadata, status: 'INVALID_STATUS' as ModuleStatus };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('status'))).toBe(true);
      expect(result.invalidFields).toContain('status');
    });

    it('should reject metadata with invalid audit hash', () => {
      const invalidMetadata = { ...validMetadata, audit_hash: 'invalid-hash' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('audit_hash'))).toBe(true);
      expect(result.invalidFields).toContain('audit_hash');
    });

    it('should reject metadata with invalid repository URL', () => {
      const invalidMetadata = { ...validMetadata, repository: 'invalid-url' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('repository'))).toBe(true);
      expect(result.invalidFields).toContain('repository');
    });

    it('should reject metadata with invalid documentation CID', () => {
      const invalidMetadata = { ...validMetadata, documentation: 'invalid-cid' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('documentation'))).toBe(true);
      expect(result.invalidFields).toContain('documentation');
    });

    it('should reject metadata with invalid DID', () => {
      const invalidMetadata = { ...validMetadata, activated_by: 'invalid-did' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('activated_by'))).toBe(true);
      expect(result.invalidFields).toContain('activated_by');
    });

    it('should reject metadata with invalid signature algorithm', () => {
      const invalidMetadata = { ...validMetadata, signature_algorithm: 'INVALID_ALGORITHM' };
      
      const result = validateModuleMetadata(invalidMetadata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid signature algorithm'))).toBe(true);
      expect(result.invalidFields).toContain('signature_algorithm');
    });
  });

  describe('validateModuleCompliance', () => {
    const validCompliance: ModuleCompliance = {
      audit: true,
      risk_scoring: true,
      privacy_enforced: true,
      kyc_support: false,
      gdpr_compliant: true,
      data_retention_policy: 'standard-30-days'
    };

    it('should validate correct compliance', () => {
      const result = validateModuleCompliance(validCompliance);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject compliance with missing required fields', () => {
      const invalidCompliance = { ...validCompliance };
      delete (invalidCompliance as any).audit;
      
      const result = validateModuleCompliance(invalidCompliance);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Required compliance field 'audit' is missing");
      expect(result.missingFields).toContain('audit');
    });

    it('should reject compliance with invalid boolean fields', () => {
      const invalidCompliance = { ...validCompliance, audit: 'true' as any };
      
      const result = validateModuleCompliance(invalidCompliance);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Compliance field 'audit' must be a boolean");
      expect(result.invalidFields).toContain('audit');
    });

    it('should warn about GDPR compliance without privacy enforcement', () => {
      const warningCompliance = { ...validCompliance, privacy_enforced: false };
      
      const result = validateModuleCompliance(warningCompliance);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('GDPR compliance is enabled but privacy enforcement is disabled');
    });

    it('should warn about KYC support without audit', () => {
      const warningCompliance = { ...validCompliance, kyc_support: true, audit: false };
      
      const result = validateModuleCompliance(warningCompliance);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('KYC support is enabled but audit is disabled - consider enabling audit for compliance');
    });
  });

  describe('validateModuleInfo', () => {
    const validModuleInfo: ModuleInfo = {
      name: 'Qwallet',
      version: '1.0.0',
      description: 'A comprehensive wallet module for the AnarQ ecosystem',
      identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
      integrations: ['Qindex', 'Qlock', 'Qerberos'],
      repositoryUrl: 'https://github.com/anarq/qwallet',
      documentationCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      auditHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
    };

    it('should validate correct module info', () => {
      const result = validateModuleInfo(validModuleInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject module info with missing name', () => {
      const invalidModuleInfo = { ...validModuleInfo, name: '' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module name is required and must be a non-empty string');
    });

    it('should reject module info with invalid version', () => {
      const invalidModuleInfo = { ...validModuleInfo, version: 'invalid' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module version is required and must follow semantic versioning (e.g., 1.0.0)');
    });

    it('should reject module info with short description', () => {
      const invalidModuleInfo = { ...validModuleInfo, description: 'short' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module description is required and must be at least 10 characters long');
    });

    it('should reject module info with no supported identities', () => {
      const invalidModuleInfo = { ...validModuleInfo, identitiesSupported: [] };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one supported identity type is required');
    });

    it('should reject module info with invalid identity types', () => {
      const invalidModuleInfo = { ...validModuleInfo, identitiesSupported: ['INVALID' as any] };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid identity types: INVALID');
    });

    it('should reject module info with invalid repository URL', () => {
      const invalidModuleInfo = { ...validModuleInfo, repositoryUrl: 'invalid-url' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository URL is required and must be a valid HTTP/HTTPS URL');
    });

    it('should reject module info with invalid documentation CID', () => {
      const invalidModuleInfo = { ...validModuleInfo, documentationCid: 'invalid-cid' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Documentation CID must be a valid IPFS CID');
    });

    it('should reject module info with invalid audit hash', () => {
      const invalidModuleInfo = { ...validModuleInfo, auditHash: 'invalid-hash' };
      
      const result = validateModuleInfo(invalidModuleInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Audit hash must be a valid SHA256 hash');
    });
  });

  describe('validateRegistrationRequest', () => {
    const validRequest: ModuleRegistrationRequest = {
      moduleInfo: {
        name: 'Qwallet',
        version: '1.0.0',
        description: 'A comprehensive wallet module for the AnarQ ecosystem',
        identitiesSupported: [IdentityType.ROOT, IdentityType.DAO],
        integrations: ['Qindex', 'Qlock', 'Qerberos'],
        repositoryUrl: 'https://github.com/anarq/qwallet'
      },
      testMode: false,
      skipValidation: false
    };

    it('should validate correct registration request', () => {
      const result = validateRegistrationRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject request without module info', () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).moduleInfo;
      
      const result = validateRegistrationRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ModuleInfo is required');
    });

    it('should reject request with invalid testMode', () => {
      const invalidRequest = { ...validRequest, testMode: 'true' as any };
      
      const result = validateRegistrationRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('testMode must be a boolean');
    });

    it('should warn about test mode', () => {
      const testRequest = { ...validRequest, testMode: true };
      
      const result = validateRegistrationRequest(testRequest);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Registration is in test mode - module will not be available in production');
    });

    it('should warn about skipped validation', () => {
      const skipRequest = { ...validRequest, skipValidation: true };
      
      const result = validateRegistrationRequest(skipRequest);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Validation is being skipped - ensure metadata is correct');
    });
  });

  describe('validateSignedMetadata', () => {
    const validSignedMetadata: SignedModuleMetadata = {
      metadata: validMetadata,
      signature: 'valid-signature-string',
      publicKey: 'valid-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:example:123456789abcdefghi'
    };

    it('should validate correct signed metadata', () => {
      const result = validateSignedMetadata(validSignedMetadata);
      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.identityVerified).toBe(true);
      expect(result.timestampValid).toBe(true);
    });

    it('should reject signed metadata without metadata', () => {
      const invalidSignedMetadata = { ...validSignedMetadata };
      delete (invalidSignedMetadata as any).metadata;
      
      const result = validateSignedMetadata(invalidSignedMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Metadata is required');
    });

    it('should reject signed metadata without signature', () => {
      const invalidSignedMetadata = { ...validSignedMetadata, signature: '' };
      
      const result = validateSignedMetadata(invalidSignedMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature is required and must be a string');
    });

    it('should reject signed metadata with invalid signature type', () => {
      const invalidSignedMetadata = { ...validSignedMetadata, signature_type: 'INVALID' };
      
      const result = validateSignedMetadata(invalidSignedMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature type');
    });

    it('should reject signed metadata with invalid signer identity', () => {
      const invalidSignedMetadata = { ...validSignedMetadata, signer_identity: 'invalid-did' };
      
      const result = validateSignedMetadata(invalidSignedMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signer identity must be a valid DID');
    });

    it('should reject signed metadata with invalid timestamp', () => {
      const invalidSignedMetadata = { ...validSignedMetadata, signed_at: Date.now() + 86400000 }; // Future timestamp
      
      const result = validateSignedMetadata(invalidSignedMetadata);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature timestamp');
    });
  });
});