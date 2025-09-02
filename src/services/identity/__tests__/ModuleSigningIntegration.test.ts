/**
 * Integration test for Module Signing functionality
 * Verifies all sub-tasks are implemented correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityQlockService } from '../IdentityQlockService';
import { 
  QModuleMetadata, 
  ModuleStatus 
} from '@/types/qwallet-module-registration';
import { IdentityType } from '@/types/identity';

// Mock Qlock API
vi.mock('@/api/qlock', () => ({
  generateKeys: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Module Signing Integration Tests', () => {
  let service: IdentityQlockService;
  let mockQlockAPI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    mockQlockAPI = await import('@/api/qlock');
    service = new IdentityQlockService();

    // Setup mock responses
    mockQlockAPI.generateKeys.mockResolvedValue({
      publicKey: 'mock-public-key',
      privateKey: 'mock-private-key'
    });

    mockQlockAPI.sign.mockResolvedValue({
      success: true,
      signature: 'mock-signature'
    });

    mockQlockAPI.verify.mockResolvedValue({
      success: true,
      valid: true
    });
  });

  describe('Task 3 Sub-tasks Verification', () => {
    it('should extend IdentityQlockService with signMetadata method for ROOT identity', async () => {
      const mockMetadata: QModuleMetadata = {
        module: 'TestModule',
        version: '1.0.0',
        description: 'Test module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['Qindex'],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'test-hash',
        compliance: {
          audit: true,
          risk_scoring: false,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestCID',
        activated_by: 'did:squid:root-123',
        timestamp: Date.now(),
        checksum: 'test-checksum',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'test-key-id'
      };

      // Verify signMetadata method exists and works
      expect(typeof service.signMetadata).toBe('function');
      
      const result = await service.signMetadata(mockMetadata, 'did:squid:root-123');
      
      expect(result).toBeDefined();
      expect(result.metadata).toEqual(mockMetadata);
      expect(result.signature).toBe('mock-signature');
      expect(result.signer_identity).toBe('did:squid:root-123');
    });

    it('should implement verifyMetadataSignature method for signature validation', async () => {
      const mockMetadata: QModuleMetadata = {
        module: 'TestModule',
        version: '1.0.0',
        description: 'Test module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['Qindex'],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'test-hash',
        compliance: {
          audit: true,
          risk_scoring: false,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestCID',
        activated_by: 'did:squid:root-123',
        timestamp: Date.now(),
        checksum: 'test-checksum',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'test-key-id'
      };

      // Verify verifyMetadataSignature method exists and works
      expect(typeof service.verifyMetadataSignature).toBe('function');
      
      const signedMetadata = await service.signMetadata(mockMetadata, 'did:squid:root-123');
      const result = await service.verifyMetadataSignature(signedMetadata);
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.signatureValid).toBe(true);
      expect(result.identityVerified).toBe(true);
    });

    it('should add generateModuleSigningKeys method for module-specific key management', async () => {
      // Verify generateModuleSigningKeys method exists and works
      expect(typeof service.generateModuleSigningKeys).toBe('function');
      
      const keys = await service.generateModuleSigningKeys('did:squid:root-123');
      
      expect(keys).toBeDefined();
      expect(keys.publicKey).toBe('mock-public-key');
      expect(keys.privateKey).toBe('mock-private-key');
      expect(keys.algorithm).toBe('RSA-PSS-SHA256');
      expect(keys.identityId).toBe('did:squid:root-123');
      expect(keys.keyId).toContain('module_');
    });

    it('should create signature verification chain validation', async () => {
      // Verify validateSignatureChain method exists and works
      expect(typeof service.validateSignatureChain).toBe('function');
      
      const result = await service.validateSignatureChain('TestModule');
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.chainLength).toBeGreaterThan(0);
      expect(result.signatures).toBeDefined();
      expect(result.rootVerified).toBe(true);
    });

    it('should implement key rotation functionality for module signing keys', async () => {
      // Verify rotateModuleSigningKeys method exists and works
      expect(typeof service.rotateModuleSigningKeys).toBe('function');
      
      // First generate keys
      await service.generateModuleSigningKeys('did:squid:root-123');
      
      // Mock new keys for rotation
      mockQlockAPI.generateKeys.mockResolvedValueOnce({
        publicKey: 'new-public-key',
        privateKey: 'new-private-key'
      });
      
      const success = await service.rotateModuleSigningKeys('did:squid:root-123');
      
      expect(success).toBe(true);
      
      // Verify new keys are different
      const newKeys = await service.getModuleSigningKeys('did:squid:root-123');
      expect(newKeys!.publicKey).toBe('new-public-key');
    });

    it('should verify signer authority for module registration', async () => {
      // Verify verifySignerAuthority method exists and works
      expect(typeof service.verifySignerAuthority).toBe('function');
      
      // Test ROOT identity authorization
      const rootAuthorized = await service.verifySignerAuthority('did:squid:root-123', 'TestModule');
      expect(rootAuthorized).toBe(true);
      
      // Test DAO identity authorization
      const daoAuthorized = await service.verifySignerAuthority('did:squid:dao-456', 'TestModule');
      expect(daoAuthorized).toBe(true);
      
      // Test ENTERPRISE identity authorization
      const enterpriseAuthorized = await service.verifySignerAuthority('did:squid:enterprise-789', 'TestModule');
      expect(enterpriseAuthorized).toBe(true);
      
      // Test unauthorized identity
      const unauthorized = await service.verifySignerAuthority('did:squid:consentida-999', 'TestModule');
      expect(unauthorized).toBe(false);
    });
  });

  describe('Requirements Verification', () => {
    it('should satisfy Requirement 2.1: ROOT identity metadata signing', async () => {
      const mockMetadata: QModuleMetadata = {
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Quantum-resistant wallet module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['Qindex', 'Qlock'],
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
        repository: 'https://github.com/anarq/qwallet',
        documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        activated_by: 'did:squid:root-123',
        timestamp: Date.now(),
        checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'module_key_123'
      };

      // Should use IdentityQlockService to sign metadata with ROOT identity credentials
      const signedMetadata = await service.signMetadata(mockMetadata, 'did:squid:root-123');
      
      expect(signedMetadata.signature).toBeDefined();
      expect(signedMetadata.publicKey).toBeDefined();
      expect(signedMetadata.signature_type).toBe('RSA-PSS-SHA256');
      expect(signedMetadata.signer_identity).toBe('did:squid:root-123');
    });

    it('should satisfy Requirement 2.2: Qlock-compliant signature attachment', async () => {
      const mockMetadata: QModuleMetadata = {
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Test module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['Qindex'],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'test-hash',
        compliance: {
          audit: true,
          risk_scoring: false,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestCID',
        activated_by: 'did:squid:root-123',
        timestamp: Date.now(),
        checksum: 'test-checksum',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'test-key-id'
      };

      const signedMetadata = await service.signMetadata(mockMetadata, 'did:squid:root-123');
      
      // Should attach Qlock-compliant signature, ROOT identity's public key, and signature type identifier
      expect(signedMetadata.signature).toBe('mock-signature');
      expect(signedMetadata.publicKey).toBe('mock-public-key');
      expect(signedMetadata.signature_type).toBe('RSA-PSS-SHA256');
      expect(signedMetadata.signed_at).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 2.3: Signature verification by other ecosystem services', async () => {
      const mockMetadata: QModuleMetadata = {
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Test module',
        identities_supported: [IdentityType.ROOT],
        integrations: ['Qindex'],
        status: ModuleStatus.PRODUCTION_READY,
        audit_hash: 'test-hash',
        compliance: {
          audit: true,
          risk_scoring: false,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        repository: 'https://github.com/test/module',
        documentation: 'QmTestCID',
        activated_by: 'did:squid:root-123',
        timestamp: Date.now(),
        checksum: 'test-checksum',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'test-key-id'
      };

      const signedMetadata = await service.signMetadata(mockMetadata, 'did:squid:root-123');
      
      // Should ensure the signed metadata can be verified by other ecosystem services
      const verificationResult = await service.verifyMetadataSignature(signedMetadata);
      
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.signatureValid).toBe(true);
      expect(verificationResult.identityVerified).toBe(true);
      expect(verificationResult.timestampValid).toBe(true);
    });
  });
});