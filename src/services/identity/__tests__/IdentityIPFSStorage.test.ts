/**
 * Integration Tests for Identity IPFS Storage Service
 * Tests encrypted storage and retrieval of identity metadata
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { identityIPFSStorage, IdentityIPFSStorage } from '../IdentityIPFSStorage';
import { ExtendedSquidIdentity, IdentityType, PrivacyLevel, GovernanceType, IdentityStatus } from '@/types/identity';
import * as ipfsUtils from '@/utils/ipfs';
import * as qlockApi from '@/api/qlock';
import * as squidLib from '@/lib/squid';

// Mock dependencies
vi.mock('@/utils/ipfs');
vi.mock('@/api/qlock');
vi.mock('@/lib/squid');

const mockUploadToIPFS = ipfsUtils.uploadToIPFS as Mock;
const mockGetFromIPFS = ipfsUtils.getFromIPFS as Mock;
const mockEncrypt = qlockApi.encrypt as Mock;
const mockDecrypt = qlockApi.decrypt as Mock;
const mockGetActiveIdentity = squidLib.getActiveIdentity as Mock;

describe('IdentityIPFSStorage', () => {
  let testIdentity: ExtendedSquidIdentity;
  let mockActiveIdentity: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create test identity
    testIdentity = {
      did: 'did:squid:test:123456789',
      name: 'Test Identity',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:987654321',
      rootId: 'did:squid:root:987654321',
      children: [],
      depth: 1,
      path: ['did:squid:root:987654321'],
      governanceLevel: GovernanceType.DAO,
      privacyLevel: PrivacyLevel.PUBLIC,
      avatar: 'https://example.com/avatar.jpg',
      description: 'Test DAO identity',
      tags: ['test', 'dao'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      lastUsed: '2024-01-01T00:00:00.000Z',
      qonsentProfileId: 'qonsent-123456789',
      qindexRegistered: true,
      qlockKeyPair: {
        publicKey: 'pub-123456789',
        privateKey: 'priv-123456789',
        algorithm: 'ECDSA' as const,
        keySize: 256,
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      auditLog: [
        {
          id: 'audit-1',
          identityId: 'did:squid:test:123456789',
          action: 'CREATED' as any,
          timestamp: '2024-01-01T00:00:00.000Z',
          metadata: {
            triggeredBy: 'did:squid:root:987654321',
            securityLevel: 'MEDIUM' as const
          }
        }
      ],
      securityFlags: [],
      kyc: {
        required: true,
        submitted: true,
        approved: true,
        level: 'BASIC' as const,
        submittedAt: '2024-01-01T00:00:00.000Z',
        approvedAt: '2024-01-01T00:00:00.000Z'
      },
      usageStats: {
        switchCount: 5,
        lastSwitch: '2024-01-01T00:00:00.000Z',
        modulesAccessed: ['qwallet', 'qonsent'],
        totalSessions: 10
      },
      creationRules: {
        type: IdentityType.DAO,
        requiresKYC: true,
        requiresDAOGovernance: true,
        requiresParentalConsent: false,
        maxDepth: 3,
        allowedChildTypes: [IdentityType.ENTERPRISE]
      },
      permissions: {
        canCreateSubidentities: true,
        canDeleteSubidentities: true,
        canModifyProfile: true,
        canAccessModule: () => true,
        canPerformAction: () => true,
        governanceLevel: GovernanceType.DAO
      },
      status: IdentityStatus.ACTIVE,
      qindexMetadata: {
        classification: ['DAO'],
        searchable: true,
        indexed: true,
        lastSync: '2024-01-01T00:00:00.000Z'
      }
    };

    // Mock active identity
    mockActiveIdentity = {
      id: 'did:squid:root:987654321',
      address: '0x1234567890abcdef'
    };

    // Setup default mocks
    mockGetActiveIdentity.mockReturnValue(mockActiveIdentity);
    mockEncrypt.mockResolvedValue({
      encryptedData: 'encrypted-sensitive-data',
      metadata: { algorithm: 'QUANTUM' }
    });
    mockDecrypt.mockResolvedValue({
      success: true,
      data: JSON.stringify({
        qlockKeyPair: testIdentity.qlockKeyPair,
        auditLog: testIdentity.auditLog,
        securityFlags: testIdentity.securityFlags,
        kyc: testIdentity.kyc,
        usageStats: testIdentity.usageStats
      })
    });
    mockUploadToIPFS.mockResolvedValue({
      cid: 'QmTestHash123456789'
    });

    // Clear cache before each test
    identityIPFSStorage.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('storeIdentityMetadata', () => {
    it('should successfully store identity metadata in IPFS', async () => {
      const ipfsHash = await identityIPFSStorage.storeIdentityMetadata(testIdentity);

      expect(ipfsHash).toBe('QmTestHash123456789');
      expect(mockEncrypt).toHaveBeenCalledWith(
        expect.stringContaining('"qlockKeyPair"'),
        mockActiveIdentity.id,
        'QUANTUM'
      );
      expect(mockUploadToIPFS).toHaveBeenCalledWith(
        expect.objectContaining({
          did: testIdentity.did,
          name: testIdentity.name,
          type: testIdentity.type,
          encryptedData: expect.objectContaining({
            qlockKeyPair: 'encrypted-sensitive-data'
          }),
          storageMetadata: expect.objectContaining({
            version: '1.0.0',
            encryptionAlgorithm: 'QUANTUM',
            encryptedBy: mockActiveIdentity.id
          })
        }),
        expect.objectContaining({
          filename: 'identity-123456789.json'
        })
      );
    });

    it('should throw error when no active identity is found', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(identityIPFSStorage.storeIdentityMetadata(testIdentity))
        .rejects.toThrow('No active identity found for encryption context');
    });

    it('should throw error when encryption fails', async () => {
      mockEncrypt.mockResolvedValue({ encryptedData: null });

      await expect(identityIPFSStorage.storeIdentityMetadata(testIdentity))
        .rejects.toThrow('Failed to encrypt identity sensitive data');
    });

    it('should throw error when IPFS upload fails', async () => {
      mockUploadToIPFS.mockRejectedValue(new Error('IPFS upload failed'));

      await expect(identityIPFSStorage.storeIdentityMetadata(testIdentity))
        .rejects.toThrow('Failed to store identity metadata: IPFS upload failed');
    });
  });

  describe('retrieveIdentityMetadata', () => {
    const testIPFSHash = 'QmTestHash123456789';
    let mockIPFSMetadata: any;

    beforeEach(() => {
      mockIPFSMetadata = {
        did: testIdentity.did,
        name: testIdentity.name,
        type: testIdentity.type,
        parentId: testIdentity.parentId,
        rootId: testIdentity.rootId,
        depth: testIdentity.depth,
        path: testIdentity.path,
        governanceLevel: testIdentity.governanceLevel,
        privacyLevel: testIdentity.privacyLevel,
        avatar: testIdentity.avatar,
        description: testIdentity.description,
        tags: testIdentity.tags,
        createdAt: testIdentity.createdAt,
        updatedAt: testIdentity.updatedAt,
        qonsentProfileId: testIdentity.qonsentProfileId,
        qindexRegistered: testIdentity.qindexRegistered,
        encryptedData: {
          qlockKeyPair: 'encrypted-sensitive-data',
          auditLog: 'encrypted-sensitive-data',
          securityFlags: 'encrypted-sensitive-data',
          kyc: 'encrypted-sensitive-data',
          usageStats: 'encrypted-sensitive-data'
        },
        storageMetadata: {
          version: '1.0.0',
          encryptionAlgorithm: 'QUANTUM',
          encryptedBy: mockActiveIdentity.id,
          storedAt: '2024-01-01T00:00:00.000Z',
          contentHash: 'abc123'
        }
      };
      
      mockGetFromIPFS.mockResolvedValue(mockIPFSMetadata);
    });

    it('should successfully retrieve and decrypt identity metadata', async () => {
      const retrievedIdentity = await identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash);

      expect(retrievedIdentity.did).toBe(testIdentity.did);
      expect(retrievedIdentity.name).toBe(testIdentity.name);
      expect(retrievedIdentity.type).toBe(testIdentity.type);
      expect(retrievedIdentity.qlockKeyPair).toEqual(testIdentity.qlockKeyPair);
      expect(retrievedIdentity.auditLog).toEqual(testIdentity.auditLog);
      expect(mockGetFromIPFS).toHaveBeenCalledWith(testIPFSHash);
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted-sensitive-data', mockActiveIdentity.id);
    });

    it('should return cached identity if cache is valid', async () => {
      // First call to populate cache
      await identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash);
      
      // Clear mock call history
      vi.clearAllMocks();
      mockGetActiveIdentity.mockReturnValue(mockActiveIdentity);

      // Second call should use cache
      const retrievedIdentity = await identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash);

      expect(retrievedIdentity.did).toBe(testIdentity.did);
      expect(mockGetFromIPFS).not.toHaveBeenCalled();
      expect(mockDecrypt).not.toHaveBeenCalled();
    });

    it('should handle decryption failure gracefully', async () => {
      mockDecrypt.mockResolvedValue({ success: false, data: null });

      const retrievedIdentity = await identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash);

      expect(retrievedIdentity.did).toBe(testIdentity.did);
      expect(retrievedIdentity.qlockKeyPair).toEqual({
        publicKey: 'pub-123456789',
        privateKey: 'priv-123456789',
        algorithm: 'ECDSA',
        keySize: 256,
        createdAt: expect.any(String)
      });
      expect(retrievedIdentity.auditLog).toEqual([]);
    });

    it('should throw error when no active identity is found', async () => {
      mockGetActiveIdentity.mockReturnValue(null);

      await expect(identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash))
        .rejects.toThrow('No active identity found for decryption context');
    });

    it('should throw error when IPFS retrieval fails', async () => {
      mockGetFromIPFS.mockRejectedValue(new Error('IPFS retrieval failed'));

      await expect(identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash))
        .rejects.toThrow('Failed to retrieve identity metadata: IPFS retrieval failed');
    });

    it('should throw error when retrieved data is invalid', async () => {
      mockGetFromIPFS.mockResolvedValue({ invalid: 'data' });

      await expect(identityIPFSStorage.retrieveIdentityMetadata(testIPFSHash))
        .rejects.toThrow('Invalid identity metadata retrieved from IPFS');
    });
  });

  describe('storeIdentityBatch', () => {
    it('should store multiple identities successfully', async () => {
      const identity2 = { ...testIdentity, did: 'did:squid:test:987654321' };
      const identities = [testIdentity, identity2];

      mockUploadToIPFS
        .mockResolvedValueOnce({ cid: 'QmHash1' })
        .mockResolvedValueOnce({ cid: 'QmHash2' });

      const results = await identityIPFSStorage.storeIdentityBatch(identities);

      expect(results).toEqual({
        [testIdentity.did]: 'QmHash1',
        [identity2.did]: 'QmHash2'
      });
      expect(mockUploadToIPFS).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch storage', async () => {
      const identity2 = { ...testIdentity, did: 'did:squid:test:987654321' };
      const identities = [testIdentity, identity2];

      mockUploadToIPFS
        .mockResolvedValueOnce({ cid: 'QmHash1' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const results = await identityIPFSStorage.storeIdentityBatch(identities);

      expect(results).toEqual({
        [testIdentity.did]: 'QmHash1'
      });
      expect(Object.keys(results)).toHaveLength(1);
    });
  });

  describe('retrieveIdentityBatch', () => {
    it('should retrieve multiple identities successfully', async () => {
      const hashes = ['QmHash1', 'QmHash2'];
      const mockMetadata1 = { ...mockGetFromIPFS.mockResolvedValue, did: 'did:squid:test:1' };
      const mockMetadata2 = { ...mockGetFromIPFS.mockResolvedValue, did: 'did:squid:test:2' };

      mockGetFromIPFS
        .mockResolvedValueOnce(mockMetadata1)
        .mockResolvedValueOnce(mockMetadata2);

      const results = await identityIPFSStorage.retrieveIdentityBatch(hashes);

      expect(results).toHaveLength(2);
      expect(results[0].did).toBe('did:squid:test:1');
      expect(results[1].did).toBe('did:squid:test:2');
    });

    it('should handle partial failures in batch retrieval', async () => {
      const hashes = ['QmHash1', 'QmHash2'];

      mockGetFromIPFS
        .mockResolvedValueOnce(mockIPFSMetadata)
        .mockRejectedValueOnce(new Error('Retrieval failed'));

      const results = await identityIPFSStorage.retrieveIdentityBatch(hashes);

      expect(results).toHaveLength(1);
    });
  });

  describe('identityExists', () => {
    it('should return true when identity exists in IPFS', async () => {
      mockGetFromIPFS.mockResolvedValue({ some: 'data' });

      const exists = await identityIPFSStorage.identityExists('QmTestHash');

      expect(exists).toBe(true);
      expect(mockGetFromIPFS).toHaveBeenCalledWith('QmTestHash');
    });

    it('should return false when identity does not exist in IPFS', async () => {
      mockGetFromIPFS.mockRejectedValue(new Error('Not found'));

      const exists = await identityIPFSStorage.identityExists('QmTestHash');

      expect(exists).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should cache stored identities', async () => {
      await identityIPFSStorage.storeIdentityMetadata(testIdentity);

      const cachedHash = identityIPFSStorage.getCachedIPFSHash(testIdentity.did);
      expect(cachedHash).toBe('QmTestHash123456789');
    });

    it('should clear cache for specific identity', async () => {
      await identityIPFSStorage.storeIdentityMetadata(testIdentity);
      
      identityIPFSStorage.clearCache(testIdentity.did);
      
      const cachedHash = identityIPFSStorage.getCachedIPFSHash(testIdentity.did);
      expect(cachedHash).toBeNull();
    });

    it('should clear all cache', async () => {
      await identityIPFSStorage.storeIdentityMetadata(testIdentity);
      
      identityIPFSStorage.clearCache();
      
      const cachedHash = identityIPFSStorage.getCachedIPFSHash(testIdentity.did);
      expect(cachedHash).toBeNull();
    });

    it('should provide cache statistics', async () => {
      await identityIPFSStorage.storeIdentityMetadata(testIdentity);

      const stats = identityIPFSStorage.getCacheStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.validEntries).toBe(1);
      expect(stats.expiredEntries).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle encryption service errors', async () => {
      mockEncrypt.mockRejectedValue(new Error('Encryption service unavailable'));

      await expect(identityIPFSStorage.storeIdentityMetadata(testIdentity))
        .rejects.toThrow('Failed to store identity metadata: Encryption service unavailable');
    });

    it('should handle IPFS service errors', async () => {
      mockUploadToIPFS.mockRejectedValue(new Error('IPFS service unavailable'));

      await expect(identityIPFSStorage.storeIdentityMetadata(testIdentity))
        .rejects.toThrow('Failed to store identity metadata: IPFS service unavailable');
    });

    it('should handle malformed encrypted data', async () => {
      mockDecrypt.mockResolvedValue({
        success: true,
        data: 'invalid-json'
      });

      const retrievedIdentity = await identityIPFSStorage.retrieveIdentityMetadata('QmTestHash');

      // Should use defaults when decryption data is malformed
      expect(retrievedIdentity.auditLog).toEqual([]);
      expect(retrievedIdentity.securityFlags).toEqual([]);
    });
  });
});