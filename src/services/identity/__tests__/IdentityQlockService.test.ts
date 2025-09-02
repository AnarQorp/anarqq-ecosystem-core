/**
 * Unit Tests for IdentityQlockService
 * Tests per-identity encryption key management and isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityQlockService } from '../IdentityQlockService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus 
} from '@/types/identity';
import { 
  QModuleMetadata, 
  ModuleStatus, 
  ModuleCompliance 
} from '@/types/qwallet-module-registration';

// Mock Qlock API
vi.mock('@/api/qlock', () => ({
  generateKeys: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
}));

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('IdentityQlockService', () => {
  let service: IdentityQlockService;
  let mockQlockAPI: any;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockAIDIdentity: ExtendedSquidIdentity;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    
    // Get mocked Qlock API
    mockQlockAPI = await import('@/api/qlock');
    
    // Create fresh service instance
    service = new IdentityQlockService();

    // Create mock identities
    const baseIdentity = {
      rootId: 'root-123',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: GovernanceType.SELF,
      creationRules: {
        type: IdentityType.ROOT,
        requiresKYC: false,
        requiresDAOGovernance: false,
        requiresParentalConsent: false,
        maxDepth: 3,
        allowedChildTypes: [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
      },
      permissions: {
        canCreateSubidentities: true,
        canDeleteSubidentities: true,
        canModifyProfile: true,
        canAccessModule: () => true,
        canPerformAction: () => true,
        governanceLevel: GovernanceType.SELF
      },
      status: IdentityStatus.ACTIVE,
      qonsentProfileId: '',
      qlockKeyPair: {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
        algorithm: 'RSA' as const,
        keySize: 2048,
        createdAt: new Date().toISOString()
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      kyc: {
        required: false,
        submitted: false,
        approved: false
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: false
    };

    mockRootIdentity = {
      ...baseIdentity,
      did: 'did:squid:root-123',
      name: 'Root Identity',
      type: IdentityType.ROOT,
      privacyLevel: PrivacyLevel.PUBLIC
    };

    mockDAOIdentity = {
      ...baseIdentity,
      did: 'did:squid:dao-456',
      name: 'DAO Identity',
      type: IdentityType.DAO,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.PUBLIC,
      governanceLevel: GovernanceType.DAO
    };

    mockAIDIdentity = {
      ...baseIdentity,
      did: 'did:squid:aid-789',
      name: 'Anonymous Identity',
      type: IdentityType.AID,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.ANONYMOUS,
      permissions: {
        ...baseIdentity.permissions,
        canCreateSubidentities: false
      }
    };

    // Setup default mock responses with unique keys per call
    let keyCounter = 0;
    mockQlockAPI.generateKeys.mockImplementation(() => {
      keyCounter++;
      return Promise.resolve({
        publicKey: `mock-public-key-${keyCounter}`,
        privateKey: `mock-private-key-${keyCounter}`
      });
    });

    mockQlockAPI.encrypt.mockResolvedValue({
      encryptedData: 'encrypted-data-123',
      metadata: {
        algorithm: 'QUANTUM',
        keySize: 512,
        quantumResistant: true,
        timestamp: Date.now()
      }
    });

    mockQlockAPI.decrypt.mockResolvedValue({
      success: true,
      data: 'decrypted-data-123'
    });

    mockQlockAPI.sign.mockResolvedValue({
      success: true,
      signature: 'signature-123'
    });

    mockQlockAPI.verify.mockResolvedValue({
      success: true,
      valid: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Key Generation', () => {
    it('should generate keys for ROOT identity with QUANTUM encryption', async () => {
      const keyPair = await service.generateKeysForIdentity(mockRootIdentity);

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBe('mock-public-key-1');
      expect(keyPair.privateKey).toBe('mock-private-key-1');
      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(512);
      expect(keyPair.createdAt).toBeDefined();
      expect(keyPair.expiresAt).toBeDefined();

      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('QUANTUM');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qlock_keys',
        expect.stringContaining(mockRootIdentity.did)
      );
    });

    it('should generate keys for AID identity with ADVANCED_QUANTUM encryption', async () => {
      const keyPair = await service.generateKeysForIdentity(mockAIDIdentity);

      expect(keyPair).toBeDefined();
      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(1024);

      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('ADVANCED_QUANTUM');
    });

    it('should handle key generation errors', async () => {
      mockQlockAPI.generateKeys.mockRejectedValue(new Error('Key generation failed'));

      await expect(service.generateKeysForIdentity(mockRootIdentity)).rejects.toThrow(
        'Failed to generate keys for identity: did:squid:root-123'
      );
    });
  });

  describe('Key Retrieval and Management', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
    });

    it('should retrieve existing keys for identity', async () => {
      const keyPair = await service.getKeysForIdentity(mockRootIdentity.did);

      expect(keyPair).toBeDefined();
      expect(keyPair!.publicKey).toMatch(/mock-public-key-\d+/);
      expect(keyPair!.privateKey).toMatch(/mock-private-key-\d+/);
    });

    it('should return null for non-existent identity keys', async () => {
      const keyPair = await service.getKeysForIdentity('non-existent-id');

      expect(keyPair).toBeNull();
    });

    it('should update existing keys', async () => {
      const updatedKeyPair = {
        publicKey: 'updated-public-key',
        privateKey: 'updated-private-key',
        algorithm: 'QUANTUM' as const,
        keySize: 512,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString()
      };

      const success = await service.updateKeysForIdentity(mockRootIdentity.did, updatedKeyPair);
      expect(success).toBe(true);

      const retrievedKeys = await service.getKeysForIdentity(mockRootIdentity.did);
      expect(retrievedKeys!.publicKey).toBe('updated-public-key');
      expect(retrievedKeys!.privateKey).toBe('updated-private-key');
    });

    it('should delete keys for identity', async () => {
      const success = await service.deleteKeysForIdentity(mockRootIdentity.did);
      expect(success).toBe(true);

      const keyPair = await service.getKeysForIdentity(mockRootIdentity.did);
      expect(keyPair).toBeNull();
    });
  });

  describe('Encryption and Decryption', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
    });

    it('should encrypt data for identity', async () => {
      const result = await service.encryptForIdentity(mockRootIdentity.did, 'test-data');

      expect(result).toBeDefined();
      expect(result!.encryptedData).toBe('encrypted-data-123');
      expect(result!.metadata.identityId).toBe(mockRootIdentity.did);
      expect(result!.metadata.algorithm).toBe('QUANTUM');

      expect(mockQlockAPI.encrypt).toHaveBeenCalledWith(
        'test-data',
        expect.stringMatching(/mock-public-key-\d+/),
        'QUANTUM'
      );
    });

    it('should encrypt data with recipient public key', async () => {
      const recipientKey = 'recipient-public-key';
      const result = await service.encryptForIdentity(mockRootIdentity.did, 'test-data', recipientKey);

      expect(result).toBeDefined();
      expect(mockQlockAPI.encrypt).toHaveBeenCalledWith(
        'test-data',
        recipientKey,
        'QUANTUM'
      );
    });

    it('should fail to encrypt for non-existent identity', async () => {
      const result = await service.encryptForIdentity('non-existent-id', 'test-data');

      expect(result).toBeNull();
    });

    it('should decrypt data for identity', async () => {
      const result = await service.decryptForIdentity(mockRootIdentity.did, 'encrypted-data');

      expect(result.success).toBe(true);
      expect(result.data).toBe('decrypted-data-123');
      expect(result.identityId).toBe(mockRootIdentity.did);

      expect(mockQlockAPI.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        expect.stringMatching(/mock-private-key-\d+/)
      );
    });

    it('should fail to decrypt for non-existent identity', async () => {
      const result = await service.decryptForIdentity('non-existent-id', 'encrypted-data');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No keys found for identity');
      expect(result.identityId).toBe('non-existent-id');
    });
  });

  describe('Encryption Context Switching', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
      await service.generateKeysForIdentity(mockDAOIdentity);
    });

    it('should switch encryption context between identities', async () => {
      const success = await service.switchEncryptionContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(success).toBe(true);

      const activeContext = await service.getActiveEncryptionContext();
      expect(activeContext).toBe(mockDAOIdentity.did);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'active_encryption_context',
        mockDAOIdentity.did
      );
    });

    it('should fail to switch to identity without keys', async () => {
      const success = await service.switchEncryptionContext(
        mockRootIdentity.did,
        'non-existent-id'
      );

      expect(success).toBe(false);
    });

    it('should set active encryption context', async () => {
      const success = await service.setActiveEncryptionContext(mockRootIdentity.did);

      expect(success).toBe(true);

      const activeContext = await service.getActiveEncryptionContext();
      expect(activeContext).toBe(mockRootIdentity.did);
    });

    it('should load active context from session storage', async () => {
      sessionStorageMock.getItem.mockReturnValue(mockDAOIdentity.did);

      const activeContext = await service.getActiveEncryptionContext();
      expect(activeContext).toBe(mockDAOIdentity.did);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from DID', async () => {
      const derivedKey = await service.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');

      expect(derivedKey).toBeDefined();
      expect(typeof derivedKey).toBe('string');
      expect(derivedKey.length).toBe(64); // 512 bits for QUANTUM
    });

    it('should cache derived keys', async () => {
      const key1 = await service.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');
      const key2 = await service.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');

      expect(key1).toBe(key2);
    });

    it('should derive different keys for different algorithms', async () => {
      const quantumKey = await service.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');
      const standardKey = await service.deriveKeyFromDID(mockRootIdentity.did, 'STANDARD');

      expect(quantumKey).not.toBe(standardKey);
      expect(quantumKey.length).toBe(64); // 512 bits
      expect(standardKey.length).toBe(32); // 256 bits
    });

    it('should derive key pair from identity', async () => {
      const keyPair = await service.deriveKeyPairFromIdentity(mockRootIdentity);

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(512);
    });
  });

  describe('Signing and Verification', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
    });

    it('should sign data for identity', async () => {
      const result = await service.signForIdentity(mockRootIdentity.did, 'test-data');

      expect(result.success).toBe(true);
      expect(result.signature).toBe('signature-123');
      expect(result.identityId).toBe(mockRootIdentity.did);

      expect(mockQlockAPI.sign).toHaveBeenCalledWith(
        'test-data',
        expect.stringMatching(/mock-private-key-\d+/),
        'QUANTUM'
      );
    });

    it('should fail to sign for non-existent identity', async () => {
      const result = await service.signForIdentity('non-existent-id', 'test-data');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No keys found for identity');
      expect(result.identityId).toBe('non-existent-id');
    });

    it('should verify signature for identity', async () => {
      const result = await service.verifyForIdentity(
        mockRootIdentity.did,
        'test-data',
        'signature-123',
        'mock-public-key-123'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.identityId).toBe(mockRootIdentity.did);

      expect(mockQlockAPI.verify).toHaveBeenCalledWith(
        'test-data',
        'signature-123',
        'mock-public-key-123'
      );
    });
  });

  describe('Key Isolation', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
      await service.generateKeysForIdentity(mockDAOIdentity);
    });

    it('should validate key isolation', async () => {
      const isIsolated = await service.validateKeyIsolation(mockRootIdentity.did);

      expect(isIsolated).toBe(true);
    });

    it('should isolate keys for identity', async () => {
      const success = await service.isolateKeys(mockRootIdentity.did);

      expect(success).toBe(true);
    });

    it('should fail isolation for non-existent identity', async () => {
      const success = await service.isolateKeys('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('Key Rotation', () => {
    beforeEach(async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
    });

    it('should rotate keys for identity', async () => {
      const originalKeys = await service.getKeysForIdentity(mockRootIdentity.did);
      
      // Mock new keys for rotation
      mockQlockAPI.generateKeys.mockResolvedValueOnce({
        publicKey: 'new-public-key-123',
        privateKey: 'new-private-key-123'
      });

      const success = await service.rotateKeysForIdentity(mockRootIdentity.did);
      expect(success).toBe(true);

      const newKeys = await service.getKeysForIdentity(mockRootIdentity.did);
      expect(newKeys!.publicKey).toBe('new-public-key-123');
      expect(newKeys!.privateKey).toBe('new-private-key-123');
      expect(newKeys!.publicKey).not.toBe(originalKeys!.publicKey);
    });

    it('should fail to rotate keys for non-existent identity', async () => {
      const success = await service.rotateKeysForIdentity('non-existent-id');

      expect(success).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should generate keys for all identities', async () => {
      const identities = [mockRootIdentity, mockDAOIdentity, mockAIDIdentity];
      
      const result = await service.generateKeysForAllIdentities(identities);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify all identities have keys
      for (const identity of identities) {
        const keys = await service.getKeysForIdentity(identity.did);
        expect(keys).toBeDefined();
      }
    });

    it('should handle partial failures in bulk operations', async () => {
      const identities = [mockRootIdentity, mockDAOIdentity];
      
      // Make the second call fail
      mockQlockAPI.generateKeys
        .mockResolvedValueOnce({
          publicKey: 'key1-public',
          privateKey: 'key1-private'
        })
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result = await service.generateKeysForAllIdentities(identities);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to generate keys for did:squid:dao-456');
    });
  });

  describe('Storage Integration', () => {
    it('should load keys from localStorage on initialization', () => {
      const mockKeys = {
        'did:squid:test-123': {
          publicKey: 'stored-public-key',
          privateKey: 'stored-private-key',
          algorithm: 'QUANTUM',
          keySize: 512,
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString()
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockKeys));

      const newService = new IdentityQlockService();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('identity_qlock_keys');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new IdentityQlockService()).not.toThrow();
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQlockService] Error loading keys from storage:',
        expect.any(Error)
      );
    });

    it('should save keys to localStorage', async () => {
      await service.generateKeysForIdentity(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qlock_keys',
        expect.stringContaining(mockRootIdentity.did)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
      
      mockQlockAPI.encrypt.mockRejectedValue(new Error('Encryption failed'));

      const result = await service.encryptForIdentity(mockRootIdentity.did, 'test-data');

      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
      
      mockQlockAPI.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const result = await service.decryptForIdentity(mockRootIdentity.did, 'encrypted-data');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Decryption failed for identity');
    });

    it('should handle storage errors during key updates', async () => {
      await service.generateKeysForIdentity(mockRootIdentity);
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const newKeyPair = {
        publicKey: 'new-public',
        privateKey: 'new-private',
        algorithm: 'QUANTUM' as const,
        keySize: 512,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString()
      };

      const success = await service.updateKeysForIdentity(mockRootIdentity.did, newKeyPair);

      expect(success).toBe(false);
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQlockService] Error updating keys:',
        expect.any(Error)
      );
    });
  });

  // ===== MODULE SIGNING TESTS =====

  describe('Module Signing Functionality', () => {
    let mockModuleMetadata: QModuleMetadata;

    beforeEach(() => {
      mockModuleMetadata = {
        module: 'Qwallet',
        version: '1.0.0',
        description: 'Quantum-resistant wallet module for the AnarQ ecosystem',
        identities_supported: [IdentityType.ROOT, IdentityType.DAO, IdentityType.ENTERPRISE],
        integrations: ['Qindex', 'Qlock', 'Qerberos'],
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
        repository: 'https://github.com/anarq/qwallet',
        documentation: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        activated_by: mockRootIdentity.did,
        timestamp: Date.now(),
        checksum: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
        signature_algorithm: 'RSA-PSS-SHA256',
        public_key_id: 'module_key_123'
      };
    });

    describe('Module Signing Keys Management', () => {
      it('should generate module signing keys for ROOT identity', async () => {
        const moduleKeys = await service.generateModuleSigningKeys(mockRootIdentity.did);

        expect(moduleKeys).toBeDefined();
        expect(moduleKeys.publicKey).toMatch(/mock-public-key-\d+/);
        expect(moduleKeys.privateKey).toMatch(/mock-private-key-\d+/);
        expect(moduleKeys.algorithm).toBe('RSA-PSS-SHA256');
        expect(moduleKeys.identityId).toBe(mockRootIdentity.did);
        expect(moduleKeys.keyId).toContain('module_');
        expect(moduleKeys.createdAt).toBeDefined();
        expect(moduleKeys.expiresAt).toBeDefined();

        expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('QUANTUM');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'identity_module_signing_keys',
          expect.stringContaining(mockRootIdentity.did)
        );
      });

      it('should generate different algorithms for different identity types', async () => {
        const rootKeys = await service.generateModuleSigningKeys(mockRootIdentity.did);
        const daoKeys = await service.generateModuleSigningKeys(mockDAOIdentity.did);

        expect(rootKeys.algorithm).toBe('RSA-PSS-SHA256');
        expect(daoKeys.algorithm).toBe('RSA-SHA256');
      });

      it('should retrieve existing module signing keys', async () => {
        const originalKeys = await service.generateModuleSigningKeys(mockRootIdentity.did);
        const retrievedKeys = await service.getModuleSigningKeys(mockRootIdentity.did);

        expect(retrievedKeys).toEqual(originalKeys);
      });

      it('should return null for non-existent module signing keys', async () => {
        const keys = await service.getModuleSigningKeys('non-existent-id');

        expect(keys).toBeNull();
      });

      it('should handle expired module signing keys', async () => {
        // Generate keys and manually set expiration to past
        const keys = await service.generateModuleSigningKeys(mockRootIdentity.did);
        keys.expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
        
        // Manually update the stored keys to simulate expiration
        const service2 = new IdentityQlockService();
        (service2 as any).moduleSigningKeys.set(mockRootIdentity.did, keys);

        const retrievedKeys = await service2.getModuleSigningKeys(mockRootIdentity.did);

        expect(retrievedKeys).toBeNull();
        expect(consoleMock.warn).toHaveBeenCalledWith(
          expect.stringContaining('Module signing keys expired')
        );
      });

      it('should rotate module signing keys', async () => {
        const originalKeys = await service.generateModuleSigningKeys(mockRootIdentity.did);
        
        // Mock new keys for rotation
        mockQlockAPI.generateKeys.mockResolvedValueOnce({
          publicKey: 'new-module-public-key',
          privateKey: 'new-module-private-key'
        });

        const success = await service.rotateModuleSigningKeys(mockRootIdentity.did);
        expect(success).toBe(true);

        const newKeys = await service.getModuleSigningKeys(mockRootIdentity.did);
        expect(newKeys!.publicKey).toBe('new-module-public-key');
        expect(newKeys!.privateKey).toBe('new-module-private-key');
        expect(newKeys!.publicKey).not.toBe(originalKeys.publicKey);
      });
    });

    describe('Module Metadata Signing', () => {
      it('should sign module metadata with ROOT identity', async () => {
        const signedMetadata = await service.signMetadata(mockModuleMetadata, mockRootIdentity.did);

        expect(signedMetadata).toBeDefined();
        expect(signedMetadata.metadata).toEqual(mockModuleMetadata);
        expect(signedMetadata.signature).toBe('signature-123');
        expect(signedMetadata.publicKey).toMatch(/mock-public-key-\d+/);
        expect(signedMetadata.signature_type).toBe('RSA-PSS-SHA256');
        expect(signedMetadata.signer_identity).toBe(mockRootIdentity.did);
        expect(signedMetadata.signed_at).toBeGreaterThan(0);

        expect(mockQlockAPI.sign).toHaveBeenCalledWith(
          expect.stringContaining('"module":"Qwallet"'),
          expect.stringMatching(/mock-private-key-\d+/),
          'QUANTUM'
        );
      });

      it('should fail to sign with unauthorized identity', async () => {
        const unauthorizedIdentity = 'did:squid:unauthorized-123';

        await expect(service.signMetadata(mockModuleMetadata, unauthorizedIdentity))
          .rejects.toThrow('Identity did:squid:unauthorized-123 is not authorized to sign module metadata');
      });

      it('should handle signing errors', async () => {
        // First generate keys successfully, then make signing fail
        await service.generateModuleSigningKeys(mockRootIdentity.did);
        
        mockQlockAPI.sign.mockResolvedValueOnce({
          success: false,
          error: 'Signing failed'
        });

        await expect(service.signMetadata(mockModuleMetadata, mockRootIdentity.did))
          .rejects.toThrow('Failed to sign metadata: Signing failed');
      });
    });

    describe('Module Metadata Signature Verification', () => {
      let signedMetadata: any;

      beforeEach(async () => {
        signedMetadata = await service.signMetadata(mockModuleMetadata, mockRootIdentity.did);
      });

      it('should verify valid module metadata signature', async () => {
        const result = await service.verifyMetadataSignature(signedMetadata);

        expect(result.valid).toBe(true);
        expect(result.signatureValid).toBe(true);
        expect(result.identityVerified).toBe(true);
        expect(result.timestampValid).toBe(true);
        expect(result.details).toBeDefined();
        expect(result.details!.moduleId).toBe('Qwallet');

        expect(mockQlockAPI.verify).toHaveBeenCalledWith(
          expect.stringContaining('"module":"Qwallet"'),
          'signature-123',
          expect.stringMatching(/mock-public-key-\d+/)
        );
      });

      it('should reject signature with missing fields', async () => {
        const invalidSignedMetadata = {
          ...signedMetadata,
          signature: undefined
        };

        const result = await service.verifyMetadataSignature(invalidSignedMetadata);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Missing required signature fields');
      });

      it('should reject signature from unauthorized signer', async () => {
        const unauthorizedSignedMetadata = {
          ...signedMetadata,
          signer_identity: 'did:squid:unauthorized-123'
        };

        const result = await service.verifyMetadataSignature(unauthorizedSignedMetadata);

        expect(result.valid).toBe(false);
        expect(result.identityVerified).toBe(false);
        expect(result.error).toBe('Signer is not authorized for this module');
      });

      it('should reject signature with invalid timestamp', async () => {
        const futureSignedMetadata = {
          ...signedMetadata,
          signed_at: Date.now() + 60000 // 1 minute in the future
        };

        const result = await service.verifyMetadataSignature(futureSignedMetadata);

        expect(result.valid).toBe(false);
        expect(result.timestampValid).toBe(false);
      });

      it('should reject signature that fails cryptographic verification', async () => {
        mockQlockAPI.verify.mockResolvedValueOnce({
          success: true,
          valid: false
        });

        const result = await service.verifyMetadataSignature(signedMetadata);

        expect(result.valid).toBe(false);
        expect(result.signatureValid).toBe(false);
      });

      it('should handle verification errors gracefully', async () => {
        mockQlockAPI.verify.mockRejectedValueOnce(new Error('Verification failed'));

        const result = await service.verifyMetadataSignature(signedMetadata);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Verification error');
      });
    });

    describe('Signer Authority Verification', () => {
      it('should authorize ROOT identity for module signing', async () => {
        const authorized = await service.verifySignerAuthority(mockRootIdentity.did, 'Qwallet');

        expect(authorized).toBe(true);
      });

      it('should authorize DAO identity for module signing', async () => {
        const authorized = await service.verifySignerAuthority(mockDAOIdentity.did, 'Qwallet');

        expect(authorized).toBe(true);
      });

      it('should authorize ENTERPRISE identity for module signing', async () => {
        const enterpriseIdentity = 'did:squid:enterprise-123';
        const authorized = await service.verifySignerAuthority(enterpriseIdentity, 'Qwallet');

        expect(authorized).toBe(true);
      });

      it('should reject unauthorized identity types', async () => {
        const unauthorizedIdentity = 'did:squid:consentida-123';
        const authorized = await service.verifySignerAuthority(unauthorizedIdentity, 'Qwallet');

        expect(authorized).toBe(false);
      });

      it('should handle authority verification errors', async () => {
        // Mock an error by providing an invalid identity that will cause an error
        const invalidIdentity = null as any;
        
        const authorized = await service.verifySignerAuthority(invalidIdentity, 'Qwallet');

        expect(authorized).toBe(false);
      });
    });

    describe('Signature Chain Validation', () => {
      it('should validate signature chain for module', async () => {
        const result = await service.validateSignatureChain('Qwallet');

        expect(result.valid).toBe(true);
        expect(result.chainLength).toBeGreaterThan(0);
        expect(result.signatures).toBeDefined();
        expect(result.rootVerified).toBe(true);
        expect(result.signatures[0]).toMatchObject({
          signature: expect.stringContaining('mock_signature_'),
          publicKey: 'mock_public_key',
          algorithm: 'RSA-SHA256',
          signerIdentity: 'did:example:root',
          valid: true
        });
      });

      it('should cache signature chain results', async () => {
        const result1 = await service.validateSignatureChain('Qwallet');
        const result2 = await service.validateSignatureChain('Qwallet');

        expect(result1).toEqual(result2);
        expect(consoleMock.log).toHaveBeenCalledWith(
          expect.stringContaining('Using cached signature chain')
        );
      });

      it('should handle signature chain validation errors', async () => {
        // Force an error by mocking console.log to throw
        const originalConsoleLog = console.log;
        console.log = vi.fn().mockImplementationOnce(() => {
          throw new Error('Chain validation failed');
        });

        const result = await service.validateSignatureChain('TestModule');

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Chain validation error');
        
        console.log = originalConsoleLog;
      });
    });

    describe('Module Signing Storage Integration', () => {
      it('should load module signing keys from localStorage on initialization', () => {
        const mockModuleKeys = {
          'did:squid:test-123': {
            publicKey: 'stored-module-public-key',
            privateKey: 'stored-module-private-key',
            keyId: 'module_test_123',
            algorithm: 'RSA-SHA256',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            identityId: 'did:squid:test-123'
          }
        };

        localStorageMock.getItem.mockImplementation((key) => {
          if (key === 'identity_module_signing_keys') {
            return JSON.stringify(mockModuleKeys);
          }
          return null;
        });

        const newService = new IdentityQlockService();
        
        expect(localStorageMock.getItem).toHaveBeenCalledWith('identity_module_signing_keys');
      });

      it('should handle module signing keys storage errors gracefully', () => {
        localStorageMock.getItem.mockImplementation((key) => {
          if (key === 'identity_module_signing_keys') {
            throw new Error('Module storage error');
          }
          return null;
        });

        expect(() => new IdentityQlockService()).not.toThrow();
        expect(consoleMock.error).toHaveBeenCalledWith(
          '[IdentityQlockService] Error loading module keys from storage:',
          expect.any(Error)
        );
      });

      it('should save module signing keys to localStorage', async () => {
        await service.generateModuleSigningKeys(mockRootIdentity.did);

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'identity_module_signing_keys',
          expect.stringContaining(mockRootIdentity.did)
        );
      });
    });
  });
});