/**
 * Unit Tests for IdentityQlockService
 * Tests per-identity encryption key management and automatic key switching
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdentityQlockService } from '../identity/IdentityQlockService';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  KeyPair
} from '@/types/identity';

// Mock the Qlock API
vi.mock('@/api/qlock', () => ({
  generateKeys: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn()
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

describe('IdentityQlockService', () => {
  let qlockService: IdentityQlockService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockEnterpriseIdentity: ExtendedSquidIdentity;
  let mockConsentidaIdentity: ExtendedSquidIdentity;
  let mockAIDIdentity: ExtendedSquidIdentity;
  let mockQlockAPI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    
    // Import and setup mock Qlock API
    mockQlockAPI = await import('@/api/qlock');
    mockQlockAPI.generateKeys.mockResolvedValue({
      publicKey: 'mock-public-key',
      privateKey: 'mock-private-key'
    });
    mockQlockAPI.encrypt.mockResolvedValue({
      encryptedData: 'encrypted-data',
      metadata: {
        algorithm: 'QUANTUM',
        keySize: 512,
        quantumResistant: true,
        timestamp: Date.now()
      }
    });
    mockQlockAPI.decrypt.mockResolvedValue({
      success: true,
      data: 'decrypted-data'
    });
    mockQlockAPI.sign.mockResolvedValue({
      success: true,
      signature: 'mock-signature'
    });
    mockQlockAPI.verify.mockResolvedValue({
      success: true,
      valid: true
    });

    qlockService = new IdentityQlockService();

    // Create mock identities
    mockRootIdentity = {
      did: 'did:squid:root:123',
      name: 'Root Identity',
      type: IdentityType.ROOT,
      rootId: 'did:squid:root:123',
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
      qonsentProfileId: 'qonsent-123',
      qlockKeyPair: {
        publicKey: 'pub-123',
        privateKey: 'priv-123',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastUsed: '2024-01-01T00:00:00Z',
      kyc: {
        required: false,
        submitted: true,
        approved: true,
        level: 'ENHANCED'
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: true
    };

    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:456',
      name: 'Test DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.DAO
    };

    mockEnterpriseIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:enterprise:789',
      name: 'Enterprise Corp',
      type: IdentityType.ENTERPRISE,
      parentId: 'did:squid:dao:456',
      depth: 2,
      path: ['did:squid:root:123', 'did:squid:dao:456'],
      governanceLevel: GovernanceType.DAO
    };

    mockConsentidaIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:consentida:101',
      name: 'Child Identity',
      type: IdentityType.CONSENTIDA,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.PARENT,
      privacyLevel: PrivacyLevel.PRIVATE
    };

    mockAIDIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:aid:202',
      name: 'Anonymous123',
      type: IdentityType.AID,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.SELF,
      privacyLevel: PrivacyLevel.ANONYMOUS
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('generateKeysForIdentity', () => {
    it('should generate QUANTUM keys for ROOT identity', async () => {
      const keyPair = await qlockService.generateKeysForIdentity(mockRootIdentity);

      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(512);
      expect(keyPair.publicKey).toBe('mock-public-key');
      expect(keyPair.privateKey).toBe('mock-private-key');
      expect(keyPair.createdAt).toBeDefined();
      expect(keyPair.expiresAt).toBeDefined();
      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('QUANTUM');
    });

    it('should generate QUANTUM keys for DAO identity', async () => {
      const keyPair = await qlockService.generateKeysForIdentity(mockDAOIdentity);

      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(512);
      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('QUANTUM');
    });

    it('should generate ENHANCED keys for Enterprise identity', async () => {
      const keyPair = await qlockService.generateKeysForIdentity(mockEnterpriseIdentity);

      expect(keyPair.algorithm).toBe('RSA');
      expect(keyPair.keySize).toBe(384);
      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('ENHANCED');
    });

    it('should generate STANDARD keys for Consentida identity', async () => {
      const keyPair = await qlockService.generateKeysForIdentity(mockConsentidaIdentity);

      expect(keyPair.algorithm).toBe('RSA');
      expect(keyPair.keySize).toBe(256);
      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('STANDARD');
    });

    it('should generate ADVANCED_QUANTUM keys for AID identity', async () => {
      const keyPair = await qlockService.generateKeysForIdentity(mockAIDIdentity);

      expect(keyPair.algorithm).toBe('QUANTUM');
      expect(keyPair.keySize).toBe(1024);
      expect(mockQlockAPI.generateKeys).toHaveBeenCalledWith('ADVANCED_QUANTUM');
    });

    it('should set appropriate expiration dates based on identity type', async () => {
      const rootKeys = await qlockService.generateKeysForIdentity(mockRootIdentity);
      const consentidaKeys = await qlockService.generateKeysForIdentity(mockConsentidaIdentity);
      const aidKeys = await qlockService.generateKeysForIdentity(mockAIDIdentity);

      const rootExpiry = new Date(rootKeys.expiresAt!);
      const consentidaExpiry = new Date(consentidaKeys.expiresAt!);
      const aidExpiry = new Date(aidKeys.expiresAt!);

      // ROOT should have longest expiration (24 months)
      // Consentida should have 6 months
      // AID should have shortest (3 months)
      expect(rootExpiry.getTime()).toBeGreaterThan(consentidaExpiry.getTime());
      expect(consentidaExpiry.getTime()).toBeGreaterThan(aidExpiry.getTime());
    });

    it('should store keys in memory and localStorage', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);

      const storedKeys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(storedKeys).toBeDefined();
      expect(storedKeys!.publicKey).toBe('mock-public-key');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qlock_keys',
        expect.stringContaining(mockRootIdentity.did)
      );
    });

    it('should handle key generation errors', async () => {
      mockQlockAPI.generateKeys.mockRejectedValue(new Error('Key generation failed'));

      await expect(qlockService.generateKeysForIdentity(mockRootIdentity))
        .rejects.toThrow('Failed to generate keys for identity');
    });
  });

  describe('getKeysForIdentity', () => {
    it('should return existing keys', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      
      const keys = await qlockService.getKeysForIdentity(mockRootIdentity.did);

      expect(keys).toBeDefined();
      expect(keys!.publicKey).toBe('mock-public-key');
      expect(keys!.privateKey).toBe('mock-private-key');
    });

    it('should return null for non-existent keys', async () => {
      const keys = await qlockService.getKeysForIdentity('nonexistent-id');

      expect(keys).toBeNull();
    });
  });

  describe('updateKeysForIdentity', () => {
    it('should update existing keys successfully', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      
      const newKeyPair: KeyPair = {
        publicKey: 'new-public-key',
        privateKey: 'new-private-key',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-02-01T00:00:00Z'
      };

      const updated = await qlockService.updateKeysForIdentity(mockRootIdentity.did, newKeyPair);

      expect(updated).toBe(true);
      
      const keys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(keys!.publicKey).toBe('new-public-key');
      expect(keys!.privateKey).toBe('new-private-key');
    });

    it('should rollback on storage failure', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      const originalKeys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
      
      // Mock storage failure
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage failed');
      });

      const newKeyPair: KeyPair = {
        publicKey: 'new-public-key',
        privateKey: 'new-private-key',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-02-01T00:00:00Z'
      };

      const updated = await qlockService.updateKeysForIdentity(mockRootIdentity.did, newKeyPair);

      expect(updated).toBe(false);
      
      // Should rollback to original keys
      const keys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(keys).toEqual(originalKeys);
    });
  });

  describe('deleteKeysForIdentity', () => {
    it('should delete existing keys successfully', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      
      const deleted = await qlockService.deleteKeysForIdentity(mockRootIdentity.did);

      expect(deleted).toBe(true);
      
      const keys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
      expect(keys).toBeNull();
    });

    it('should return false for non-existent keys', async () => {
      const deleted = await qlockService.deleteKeysForIdentity('nonexistent-id');

      expect(deleted).toBe(false);
    });

    it('should clear active context if deleting active identity keys', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      await qlockService.setActiveEncryptionContext(mockRootIdentity.did);
      
      await qlockService.deleteKeysForIdentity(mockRootIdentity.did);
      
      const activeContext = await qlockService.getActiveEncryptionContext();
      expect(activeContext).toBeNull();
    });
  });

  describe('encryptForIdentity', () => {
    beforeEach(async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
    });

    it('should encrypt data using identity keys', async () => {
      const result = await qlockService.encryptForIdentity(
        mockRootIdentity.did,
        'test data'
      );

      expect(result).toBeDefined();
      expect(result!.encryptedData).toBe('encrypted-data');
      expect(result!.metadata.identityId).toBe(mockRootIdentity.did);
      expect(mockQlockAPI.encrypt).toHaveBeenCalledWith(
        'test data',
        'mock-public-key',
        'QUANTUM'
      );
    });

    it('should encrypt data for specific recipient', async () => {
      const recipientPublicKey = 'recipient-public-key';
      
      const result = await qlockService.encryptForIdentity(
        mockRootIdentity.did,
        'test data',
        recipientPublicKey
      );

      expect(result).toBeDefined();
      expect(mockQlockAPI.encrypt).toHaveBeenCalledWith(
        'test data',
        recipientPublicKey,
        'QUANTUM'
      );
    });

    it('should return null for non-existent identity', async () => {
      const result = await qlockService.encryptForIdentity(
        'nonexistent-id',
        'test data'
      );

      expect(result).toBeNull();
    });

    it('should handle encryption errors', async () => {
      mockQlockAPI.encrypt.mockRejectedValue(new Error('Encryption failed'));

      const result = await qlockService.encryptForIdentity(
        mockRootIdentity.did,
        'test data'
      );

      expect(result).toBeNull();
    });
  });

  describe('decryptForIdentity', () => {
    beforeEach(async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
    });

    it('should decrypt data using identity keys', async () => {
      const result = await qlockService.decryptForIdentity(
        mockRootIdentity.did,
        'encrypted-data'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('decrypted-data');
      expect(result.identityId).toBe(mockRootIdentity.did);
      expect(mockQlockAPI.decrypt).toHaveBeenCalledWith(
        'encrypted-data',
        'mock-private-key'
      );
    });

    it('should return error for non-existent identity', async () => {
      const result = await qlockService.decryptForIdentity(
        'nonexistent-id',
        'encrypted-data'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No keys found for identity');
      expect(result.identityId).toBe('nonexistent-id');
    });

    it('should handle decryption errors', async () => {
      mockQlockAPI.decrypt.mockRejectedValue(new Error('Decryption failed'));

      const result = await qlockService.decryptForIdentity(
        mockRootIdentity.did,
        'encrypted-data'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Decryption failed');
    });
  });

  describe('encryption context switching', () => {
    beforeEach(async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      await qlockService.generateKeysForIdentity(mockDAOIdentity);
    });

    describe('switchEncryptionContext', () => {
      it('should switch encryption context successfully', async () => {
        const switched = await qlockService.switchEncryptionContext(
          mockRootIdentity.did,
          mockDAOIdentity.did
        );

        expect(switched).toBe(true);
        
        const activeContext = await qlockService.getActiveEncryptionContext();
        expect(activeContext).toBe(mockDAOIdentity.did);
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'active_encryption_context',
          mockDAOIdentity.did
        );
      });

      it('should fail when target identity has no keys', async () => {
        const switched = await qlockService.switchEncryptionContext(
          mockRootIdentity.did,
          'nonexistent-id'
        );

        expect(switched).toBe(false);
      });
    });

    describe('setActiveEncryptionContext', () => {
      it('should set active context successfully', async () => {
        const set = await qlockService.setActiveEncryptionContext(mockRootIdentity.did);

        expect(set).toBe(true);
        
        const activeContext = await qlockService.getActiveEncryptionContext();
        expect(activeContext).toBe(mockRootIdentity.did);
      });

      it('should fail for identity without keys', async () => {
        const set = await qlockService.setActiveEncryptionContext('nonexistent-id');

        expect(set).toBe(false);
      });
    });

    describe('getActiveEncryptionContext', () => {
      it('should return active context from memory', async () => {
        await qlockService.setActiveEncryptionContext(mockRootIdentity.did);
        
        const activeContext = await qlockService.getActiveEncryptionContext();

        expect(activeContext).toBe(mockRootIdentity.did);
      });

      it('should load active context from session storage', async () => {
        sessionStorageMock.getItem.mockReturnValue(mockDAOIdentity.did);
        
        const activeContext = await qlockService.getActiveEncryptionContext();

        expect(activeContext).toBe(mockDAOIdentity.did);
      });

      it('should return null when no active context', async () => {
        const activeContext = await qlockService.getActiveEncryptionContext();

        expect(activeContext).toBeNull();
      });
    });
  });

  describe('key derivation', () => {
    describe('deriveKeyFromDID', () => {
      it('should derive key from DID deterministically', async () => {
        const key1 = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');
        const key2 = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');

        expect(key1).toBe(key2); // Should be deterministic
        expect(key1.length).toBe(64); // QUANTUM key length
      });

      it('should derive different keys for different algorithms', async () => {
        const quantumKey = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');
        const standardKey = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'STANDARD');

        expect(quantumKey).not.toBe(standardKey);
        expect(quantumKey.length).toBe(64); // QUANTUM
        expect(standardKey.length).toBe(32); // STANDARD
      });

      it('should cache derived keys', async () => {
        const key1 = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');
        const key2 = await qlockService.deriveKeyFromDID(mockRootIdentity.did, 'QUANTUM');

        expect(key1).toBe(key2);
        // Should use cached value on second call
      });
    });

    describe('deriveKeyPairFromIdentity', () => {
      it('should derive key pair from identity', async () => {
        const keyPair = await qlockService.deriveKeyPairFromIdentity(mockRootIdentity);

        expect(keyPair.publicKey).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
        expect(keyPair.algorithm).toBe('QUANTUM');
        expect(keyPair.keySize).toBe(512);
        expect(keyPair.createdAt).toBeDefined();
        expect(keyPair.expiresAt).toBeDefined();
      });

      it('should derive different key pairs for different identity types', async () => {
        const rootKeyPair = await qlockService.deriveKeyPairFromIdentity(mockRootIdentity);
        const enterpriseKeyPair = await qlockService.deriveKeyPairFromIdentity(mockEnterpriseIdentity);

        expect(rootKeyPair.algorithm).toBe('QUANTUM');
        expect(enterpriseKeyPair.algorithm).toBe('ENHANCED');
        expect(rootKeyPair.keySize).toBe(512);
        expect(enterpriseKeyPair.keySize).toBe(384);
      });
    });
  });

  describe('signing and verification', () => {
    beforeEach(async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
    });

    describe('signForIdentity', () => {
      it('should sign data using identity keys', async () => {
        const result = await qlockService.signForIdentity(
          mockRootIdentity.did,
          'test data'
        );

        expect(result.success).toBe(true);
        expect(result.signature).toBe('mock-signature');
        expect(result.identityId).toBe(mockRootIdentity.did);
        expect(mockQlockAPI.sign).toHaveBeenCalledWith(
          'test data',
          'mock-private-key',
          'QUANTUM'
        );
      });

      it('should return error for non-existent identity', async () => {
        const result = await qlockService.signForIdentity(
          'nonexistent-id',
          'test data'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No keys found for identity');
      });
    });

    describe('verifyForIdentity', () => {
      it('should verify signature', async () => {
        const result = await qlockService.verifyForIdentity(
          mockRootIdentity.did,
          'test data',
          'signature',
          'public-key'
        );

        expect(result.success).toBe(true);
        expect(result.valid).toBe(true);
        expect(result.identityId).toBe(mockRootIdentity.did);
        expect(mockQlockAPI.verify).toHaveBeenCalledWith(
          'test data',
          'signature',
          'public-key'
        );
      });
    });
  });

  describe('key isolation', () => {
    beforeEach(async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);
      await qlockService.generateKeysForIdentity(mockDAOIdentity);
    });

    describe('isolateKeys', () => {
      it('should validate key isolation successfully', async () => {
        const isolated = await qlockService.isolateKeys(mockRootIdentity.did);

        expect(isolated).toBe(true);
      });

      it('should fail for non-existent identity', async () => {
        const isolated = await qlockService.isolateKeys('nonexistent-id');

        expect(isolated).toBe(false);
      });
    });

    describe('validateKeyIsolation', () => {
      it('should validate unique keys', async () => {
        const valid = await qlockService.validateKeyIsolation(mockRootIdentity.did);

        expect(valid).toBe(true);
      });

      it('should detect duplicate keys', async () => {
        // Manually create duplicate keys
        const duplicateKeys: KeyPair = {
          publicKey: 'mock-public-key', // Same as root identity
          privateKey: 'mock-private-key',
          algorithm: 'QUANTUM',
          keySize: 512,
          createdAt: '2024-01-01T00:00:00Z'
        };
        
        await qlockService.updateKeysForIdentity(mockDAOIdentity.did, duplicateKeys);
        
        const valid = await qlockService.validateKeyIsolation(mockRootIdentity.did);

        expect(valid).toBe(false);
      });
    });
  });

  describe('bulk operations', () => {
    describe('generateKeysForAllIdentities', () => {
      it('should generate keys for all identities successfully', async () => {
        const identities = [mockRootIdentity, mockDAOIdentity, mockEnterpriseIdentity];
        
        const results = await qlockService.generateKeysForAllIdentities(identities);

        expect(results.success).toBe(3);
        expect(results.failed).toBe(0);
        expect(results.errors).toHaveLength(0);
      });

      it('should handle partial failures', async () => {
        const identities = [mockRootIdentity, mockDAOIdentity];
        
        // Mock one generation to fail
        mockQlockAPI.generateKeys
          .mockResolvedValueOnce({
            publicKey: 'mock-public-key-1',
            privateKey: 'mock-private-key-1'
          })
          .mockRejectedValueOnce(new Error('Generation failed'));
        
        const results = await qlockService.generateKeysForAllIdentities(identities);

        expect(results.success).toBe(1);
        expect(results.failed).toBe(1);
        expect(results.errors).toHaveLength(1);
        expect(results.errors[0]).toContain('Failed to generate keys for');
      });
    });

    describe('rotateKeysForIdentity', () => {
      it('should rotate keys successfully', async () => {
        await qlockService.generateKeysForIdentity(mockRootIdentity);
        const originalKeys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
        
        // Mock new keys for rotation
        mockQlockAPI.generateKeys.mockResolvedValue({
          publicKey: 'new-rotated-public-key',
          privateKey: 'new-rotated-private-key'
        });

        const rotated = await qlockService.rotateKeysForIdentity(mockRootIdentity.did);

        expect(rotated).toBe(true);
        
        const newKeys = await qlockService.getKeysForIdentity(mockRootIdentity.did);
        expect(newKeys!.publicKey).toBe('new-rotated-public-key');
        expect(newKeys!.privateKey).toBe('new-rotated-private-key');
        expect(newKeys!.createdAt).not.toBe(originalKeys!.createdAt);
      });

      it('should fail for non-existent identity', async () => {
        const rotated = await qlockService.rotateKeysForIdentity('nonexistent-id');

        expect(rotated).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(qlockService.generateKeysForIdentity(mockRootIdentity))
        .rejects.toThrow('Failed to generate keys for identity');
    });

    it('should handle API errors gracefully', async () => {
      mockQlockAPI.generateKeys.mockRejectedValue(new Error('API unavailable'));

      await expect(qlockService.generateKeysForIdentity(mockRootIdentity))
        .rejects.toThrow('Failed to generate keys for identity');
    });

    it('should handle key derivation errors', async () => {
      // Create an identity with problematic DID
      const problematicIdentity = {
        ...mockRootIdentity,
        did: '' // Empty DID should cause issues
      };

      await expect(qlockService.deriveKeyPairFromIdentity(problematicIdentity))
        .rejects.toThrow('Failed to derive key pair for identity');
    });
  });

  describe('storage management', () => {
    it('should load keys from localStorage on initialization', async () => {
      const mockStoredKeys = {
        [mockRootIdentity.did]: {
          publicKey: 'stored-public-key',
          privateKey: 'stored-private-key',
          algorithm: 'QUANTUM',
          keySize: 512,
          createdAt: '2024-01-01T00:00:00Z'
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredKeys));
      
      // Create new service instance to trigger loading
      const newService = new IdentityQlockService();
      
      const keys = await newService.getKeysForIdentity(mockRootIdentity.did);
      expect(keys).toBeDefined();
      expect(keys!.publicKey).toBe('stored-public-key');
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      // Should not throw error, but handle gracefully
      expect(() => new IdentityQlockService()).not.toThrow();
    });

    it('should save keys to localStorage after generation', async () => {
      await qlockService.generateKeysForIdentity(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qlock_keys',
        expect.stringContaining(mockRootIdentity.did)
      );
    });
  });
});