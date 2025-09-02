/**
 * Integration Tests for Ecosystem Services
 * Tests end-to-end identity lifecycle workflows and service integration
 * Requirements: 3.5, 4.3, 4.4, 4.5, 4.6, 5.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdentityManager } from '../../IdentityManager';
import { identityQonsentService } from '../../identity/IdentityQonsentService';
import { identityQlockService } from '../../identity/IdentityQlockService';
import { identityQwalletService } from '../../identity/IdentityQwalletService';
import { identityContextSwitcher } from '../../identity/IdentityContextSwitcher';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  SubidentityMetadata
} from '@/types/identity';

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

// Mock the useIdentityStore
vi.mock('@/state/identity', () => {
  const mockStore = {
    activeIdentity: null as ExtendedSquidIdentity | null,
    identities: new Map<string, ExtendedSquidIdentity>(),
    identityTree: null,
    createSubidentity: vi.fn(),
    setActiveIdentity: vi.fn(),
    deleteSubidentity: vi.fn(),
    buildIdentityTree: vi.fn(),
    getIdentityById: vi.fn(),
    getChildIdentities: vi.fn(),
    getRootIdentity: vi.fn(),
    logIdentityAction: vi.fn(),
    addSecurityFlag: vi.fn()
  };
  
  return {
    useIdentityStore: {
      getState: () => mockStore
    }
  };
});

describe('Ecosystem Integration Tests', () => {
  let identityManager: IdentityManager;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockIdentityStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);

    // Get the mock store
    const { useIdentityStore } = await import('@/state/identity');
    mockIdentityStore = useIdentityStore.getState();
    
    identityManager = IdentityManager.getInstance();

    // Create comprehensive mock root identity
    mockRootIdentity = {
      did: 'did:squid:root:integration-test',
      name: 'Integration Test Root',
      type: IdentityType.ROOT,
      rootId: 'did:squid:root:integration-test',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: GovernanceType.SELF,
      creationRules: {
        type: IdentityType.ROOT,
        parentType: undefined,
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
      qonsentProfileId: 'qonsent-integration-root',
      qlockKeyPair: {
        publicKey: 'pub-integration-root',
        privateKey: 'priv-integration-root',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      avatar: undefined,
      description: 'Integration test root identity',
      tags: ['integration', 'test'],
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
      qindexRegistered: true,
      usageStats: {
        switchCount: 0,
        lastSwitch: '2024-01-01T00:00:00Z',
        modulesAccessed: [],
        totalSessions: 0
      }
    };

    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:integration-test',
      name: 'Integration Test DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:integration-test',
      depth: 1,
      path: ['did:squid:root:integration-test'],
      governanceLevel: GovernanceType.DAO,
      qonsentProfileId: 'qonsent-integration-dao',
      qlockKeyPair: {
        publicKey: 'pub-integration-dao',
        privateKey: 'priv-integration-dao',
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: '2024-01-01T00:00:00Z'
      }
    };

    // Setup mock store state
    mockIdentityStore.activeIdentity = mockRootIdentity;
    mockIdentityStore.identities.set(mockRootIdentity.did, mockRootIdentity);
    mockIdentityStore.identities.set(mockDAOIdentity.did, mockDAOIdentity);
    
    mockIdentityStore.getRootIdentity.mockReturnValue(mockRootIdentity);
    mockIdentityStore.getIdentityById.mockImplementation((id: string) => 
      mockIdentityStore.identities.get(id) || null
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete Identity Lifecycle Integration', () => {
    it('should create identity with full ecosystem integration', async () => {
      const metadata: SubidentityMetadata = {
        name: 'Integration DAO',
        description: 'DAO created for integration testing',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.PUBLIC,
        tags: ['integration', 'dao'],
        governanceConfig: {
          governanceRules: {
            votingThreshold: 0.6,
            proposalDelay: 86400
          }
        }
      };

      // Mock successful creation
      mockIdentityStore.createSubidentity.mockResolvedValue({
        success: true,
        identity: mockDAOIdentity
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);

      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();

      // Verify ecosystem integration calls were made
      expect(mockIdentityStore.logIdentityAction).toHaveBeenCalled();

      // Verify Qonsent profile creation
      const qonsentProfile = await identityQonsentService.getQonsentProfile(mockDAOIdentity.did);
      expect(qonsentProfile).toBeDefined();
      expect(qonsentProfile!.privacyLevel).toBe(PrivacyLevel.PUBLIC);

      // Verify Qlock key generation
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockDAOIdentity.did);
      expect(qlockKeys).toBeDefined();
      expect(qlockKeys!.algorithm).toBe('QUANTUM');

      // Verify Qwallet context creation
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockDAOIdentity.did);
      expect(walletAddress).toBeDefined();
    });

    it('should handle identity switching with full context updates', async () => {
      // Setup both identities in services
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQonsentService.createQonsentProfile(mockDAOIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockDAOIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);

      // Mock successful switch
      mockIdentityStore.setActiveIdentity.mockResolvedValue(undefined);

      const result = await identityManager.switchActiveIdentity(mockDAOIdentity.did);

      expect(result.success).toBe(true);
      expect(result.newIdentity).toEqual(mockDAOIdentity);
      expect(result.contextUpdates).toBeDefined();

      // Verify context switching occurred
      expect(result.contextUpdates.qonsent).toBe(true);
      expect(result.contextUpdates.qlock).toBe(true);
      expect(result.contextUpdates.qwallet).toBe(true);
      expect(result.contextUpdates.qerberos).toBe(true);
      expect(result.contextUpdates.qindex).toBe(true);

      // Verify active contexts were updated
      const activeQlockContext = await identityQlockService.getActiveEncryptionContext();
      const activeWalletContext = await identityQwalletService.getActiveWalletContext();
      
      // These should be updated to the new identity
      expect(activeQlockContext).toBe(mockDAOIdentity.did);
      expect(activeWalletContext).toBe(mockDAOIdentity.did);
    });

    it('should delete identity with proper cleanup across services', async () => {
      // Setup identity in all services
      await identityQonsentService.createQonsentProfile(mockDAOIdentity);
      await identityQlockService.generateKeysForIdentity(mockDAOIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);

      // Mock successful deletion
      mockIdentityStore.deleteSubidentity.mockResolvedValue({
        success: true,
        deletedIdentity: mockDAOIdentity,
        affectedChildren: []
      });

      const result = await identityManager.deleteSubidentity(mockDAOIdentity.did);

      expect(result.success).toBe(true);
      expect(result.deletedIdentity).toEqual(mockDAOIdentity);

      // Verify cleanup occurred in services
      const qonsentProfile = await identityQonsentService.getQonsentProfile(mockDAOIdentity.did);
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockDAOIdentity.did);
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockDAOIdentity.did);

      // After deletion, these should be cleaned up
      expect(qonsentProfile).toBeNull();
      expect(qlockKeys).toBeNull();
      expect(walletAddress).toBeNull();
    });
  });

  describe('Qonsent Integration', () => {
    beforeEach(async () => {
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQonsentService.createQonsentProfile(mockDAOIdentity);
    });

    it('should sync privacy policies across identity switches', async () => {
      // Update privacy level for DAO identity
      await identityQonsentService.setPrivacyLevel(mockDAOIdentity.did, PrivacyLevel.DAO_ONLY);

      // Switch to DAO identity
      const switched = await identityQonsentService.switchPrivacyContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(switched).toBe(true);

      // Verify privacy policy was applied
      const effectiveLevel = await identityQonsentService.getEffectivePrivacyLevel(mockDAOIdentity.did);
      expect(effectiveLevel).toBe(PrivacyLevel.DAO_ONLY);
    });

    it('should handle consent management per identity', async () => {
      // Grant consent for root identity
      const rootConsent = await identityQonsentService.grantConsent(
        mockRootIdentity.did,
        'qsocial',
        'post_content'
      );
      expect(rootConsent).toBe(true);

      // Check consent for root identity
      const rootHasConsent = await identityQonsentService.checkConsent(
        mockRootIdentity.did,
        'qsocial',
        'post_content'
      );
      expect(rootHasConsent).toBe(true);

      // Check consent for DAO identity (should be separate)
      const daoHasConsent = await identityQonsentService.checkConsent(
        mockDAOIdentity.did,
        'qsocial',
        'post_content'
      );
      expect(daoHasConsent).toBe(true); // DAO has default permissions

      // Revoke consent for DAO identity
      const daoRevoked = await identityQonsentService.revokeConsent(
        mockDAOIdentity.did,
        'qsocial',
        'post_content'
      );
      expect(daoRevoked).toBe(true);

      // Verify consent is revoked for DAO but not root
      const daoHasConsentAfter = await identityQonsentService.checkConsent(
        mockDAOIdentity.did,
        'qsocial',
        'post_content'
      );
      const rootHasConsentAfter = await identityQonsentService.checkConsent(
        mockRootIdentity.did,
        'qsocial',
        'post_content'
      );

      expect(daoHasConsentAfter).toBe(false);
      expect(rootHasConsentAfter).toBe(true);
    });

    it('should sync all profiles with external service', async () => {
      const syncResults = await identityQonsentService.syncAllProfiles();

      expect(syncResults.success).toBeGreaterThan(0);
      expect(syncResults.failed).toBe(0);
      expect(syncResults.errors).toHaveLength(0);
    });
  });

  describe('Qlock Integration', () => {
    beforeEach(async () => {
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockDAOIdentity);
    });

    it('should maintain key isolation between identities', async () => {
      const rootKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const daoKeys = await identityQlockService.getKeysForIdentity(mockDAOIdentity.did);

      expect(rootKeys).toBeDefined();
      expect(daoKeys).toBeDefined();
      expect(rootKeys!.publicKey).not.toBe(daoKeys!.publicKey);
      expect(rootKeys!.privateKey).not.toBe(daoKeys!.privateKey);

      // Verify key isolation
      const rootIsolated = await identityQlockService.validateKeyIsolation(mockRootIdentity.did);
      const daoIsolated = await identityQlockService.validateKeyIsolation(mockDAOIdentity.did);

      expect(rootIsolated).toBe(true);
      expect(daoIsolated).toBe(true);
    });

    it('should handle encryption/decryption per identity', async () => {
      const testData = 'Integration test data';

      // Encrypt with root identity
      const rootEncrypted = await identityQlockService.encryptForIdentity(
        mockRootIdentity.did,
        testData
      );
      expect(rootEncrypted).toBeDefined();
      expect(rootEncrypted!.metadata.identityId).toBe(mockRootIdentity.did);

      // Decrypt with root identity
      const rootDecrypted = await identityQlockService.decryptForIdentity(
        mockRootIdentity.did,
        rootEncrypted!.encryptedData
      );
      expect(rootDecrypted.success).toBe(true);
      expect(rootDecrypted.data).toBe(testData);

      // Try to decrypt with wrong identity (should fail)
      const wrongDecrypted = await identityQlockService.decryptForIdentity(
        mockDAOIdentity.did,
        rootEncrypted!.encryptedData
      );
      expect(wrongDecrypted.success).toBe(false);
    });

    it('should switch encryption contexts properly', async () => {
      const switched = await identityQlockService.switchEncryptionContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(switched).toBe(true);

      const activeContext = await identityQlockService.getActiveEncryptionContext();
      expect(activeContext).toBe(mockDAOIdentity.did);
    });
  });

  describe('Qwallet Integration', () => {
    beforeEach(async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
    });

    it('should manage wallet contexts per identity', async () => {
      const rootWallet = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);
      const daoWallet = await identityQwalletService.getWalletAddressForIdentity(mockDAOIdentity.did);

      expect(rootWallet).toBeDefined();
      expect(daoWallet).toBeDefined();
      expect(rootWallet).not.toBe(daoWallet);

      // Switch wallet context
      const switched = await identityQwalletService.switchWalletContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(switched).toBe(true);

      const activeContext = await identityQwalletService.getActiveWalletContext();
      expect(activeContext).toBe(mockDAOIdentity.did);
    });

    it('should validate wallet operations per identity permissions', async () => {
      // Test transfer operation for root identity (should be allowed)
      const rootTransferValid = await identityQwalletService.validateWalletOperation(
        mockRootIdentity.did,
        {
          type: 'TRANSFER',
          amount: 100,
          token: 'ETH',
          recipient: '0x1234567890123456789012345678901234567890'
        }
      );
      expect(rootTransferValid).toBe(true);

      // Test DAO creation for DAO identity (should be restricted)
      const daoCreateValid = await identityQwalletService.validateWalletOperation(
        mockDAOIdentity.did,
        {
          type: 'DAO_CREATE',
          metadata: { name: 'Test DAO' }
        }
      );
      expect(daoCreateValid).toBe(false); // DAO identities can't create other DAOs
    });

    it('should get balances per identity', async () => {
      const rootBalances = await identityQwalletService.getBalancesForIdentity(mockRootIdentity.did);
      const daoBalances = await identityQwalletService.getBalancesForIdentity(mockDAOIdentity.did);

      expect(rootBalances.identityId).toBe(mockRootIdentity.did);
      expect(daoBalances.identityId).toBe(mockDAOIdentity.did);
      expect(rootBalances.walletAddress).not.toBe(daoBalances.walletAddress);
      expect(rootBalances.balances).toBeDefined();
      expect(daoBalances.balances).toBeDefined();
    });

    it('should sync with Qlock and Qonsent services', async () => {
      const qlockSynced = await identityQwalletService.syncWithQlock(mockRootIdentity.did);
      const qonsentSynced = await identityQwalletService.syncWithQonsent(mockRootIdentity.did);

      expect(qlockSynced).toBe(true);
      expect(qonsentSynced).toBe(true);
    });
  });

  describe('Context Switching Integration', () => {
    beforeEach(async () => {
      // Setup all services for both identities
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQonsentService.createQonsentProfile(mockDAOIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockDAOIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
    });

    it('should validate context switch across all services', async () => {
      const validation = await identityContextSwitcher.validateContextSwitch(
        mockRootIdentity,
        mockDAOIdentity
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.checkedModules).toContain('qonsent');
      expect(validation.checkedModules).toContain('qlock');
      expect(validation.checkedModules).toContain('qwallet');
      expect(validation.checkedModules).toContain('qerberos');
      expect(validation.checkedModules).toContain('qindex');
    });

    it('should create and restore context snapshots', async () => {
      const snapshot = await identityContextSwitcher.createContextSnapshot(mockRootIdentity);

      expect(snapshot.previousIdentity).toEqual(mockRootIdentity);
      expect(snapshot.contexts.qonsent).toBeDefined();
      expect(snapshot.contexts.qlock).toBeDefined();
      expect(snapshot.contexts.qwallet).toBeDefined();
      expect(snapshot.contexts.qerberos).toBeDefined();
      expect(snapshot.contexts.qindex).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent identity operations safely', async () => {
      // Setup identities
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Perform concurrent operations
      const operations = [
        identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE),
        identityQlockService.rotateKeysForIdentity(mockRootIdentity.did),
        identityQwalletService.updateWalletPermissions(mockRootIdentity.did, { maxTransactionAmount: 5000 }),
        identityQonsentService.grantConsent(mockRootIdentity.did, 'qsocial', 'post_content'),
        identityQlockService.encryptForIdentity(mockRootIdentity.did, 'test data')
      ];

      const results = await Promise.allSettled(operations);

      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeTruthy();
        }
      });
    });

    it('should maintain data consistency across concurrent switches', async () => {
      // Setup multiple identities
      const identities = [mockRootIdentity, mockDAOIdentity];
      
      for (const identity of identities) {
        await identityQonsentService.createQonsentProfile(identity);
        await identityQlockService.generateKeysForIdentity(identity);
        await identityQwalletService.createWalletForIdentity(identity);
      }

      // Perform concurrent context switches (should be serialized)
      const switches = [
        identityQonsentService.switchPrivacyContext(mockRootIdentity.did, mockDAOIdentity.did),
        identityQlockService.switchEncryptionContext(mockRootIdentity.did, mockDAOIdentity.did),
        identityQwalletService.switchWalletContext(mockRootIdentity.did, mockDAOIdentity.did)
      ];

      const results = await Promise.allSettled(switches);

      // All switches should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBe(true);
        }
      });

      // Verify final state consistency
      const activeQlockContext = await identityQlockService.getActiveEncryptionContext();
      const activeWalletContext = await identityQwalletService.getActiveWalletContext();

      expect(activeQlockContext).toBe(mockDAOIdentity.did);
      expect(activeWalletContext).toBe(mockDAOIdentity.did);
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain consistent identity data across all services', async () => {
      // Create identity in all services
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Verify data consistency
      const qonsentProfile = await identityQonsentService.getQonsentProfile(mockRootIdentity.did);
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(qonsentProfile).toBeDefined();
      expect(qonsentProfile!.identityId).toBe(mockRootIdentity.did);
      expect(qlockKeys).toBeDefined();
      expect(walletAddress).toBeDefined();

      // Verify identity type consistency
      expect(qonsentProfile!.privacyLevel).toBe(PrivacyLevel.PUBLIC); // ROOT default
      expect(qlockKeys!.algorithm).toBe('QUANTUM'); // ROOT default
    });

    it('should handle service failures gracefully', async () => {
      // Mock one service to fail
      const originalCreateProfile = identityQonsentService.createQonsentProfile;
      identityQonsentService.createQonsentProfile = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // Create identity (should handle Qonsent failure)
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Verify other services still work
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(qlockKeys).toBeDefined();
      expect(walletAddress).toBeDefined();

      // Restore original function
      identityQonsentService.createQonsentProfile = originalCreateProfile;
    });

    it('should validate cross-service data integrity', async () => {
      // Setup identity in all services
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Modify data in one service
      await identityQonsentService.setPrivacyLevel(mockRootIdentity.did, PrivacyLevel.PRIVATE);

      // Verify other services can still access the identity
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletPermissions = await identityQwalletService.getWalletPermissions(mockRootIdentity.did);

      expect(qlockKeys).toBeDefined();
      expect(walletPermissions).toBeDefined();
      expect(walletPermissions.governanceLevel).toBe('FULL'); // ROOT permissions
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should rollback failed identity creation across services', async () => {
      // Mock Qwallet service to fail
      const originalCreateWallet = identityQwalletService.createWalletForIdentity;
      identityQwalletService.createWalletForIdentity = vi.fn().mockRejectedValue(new Error('Wallet creation failed'));

      const metadata: SubidentityMetadata = {
        name: 'Failed Creation Test',
        type: IdentityType.DAO,
        privacyLevel: PrivacyLevel.PUBLIC
      };

      // Mock store to fail
      mockIdentityStore.createSubidentity.mockResolvedValue({
        success: false,
        error: 'Creation failed'
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);

      expect(result.success).toBe(false);

      // Verify no partial data was left in services
      const qonsentProfile = await identityQonsentService.getQonsentProfile('did:squid:dao:failed');
      const qlockKeys = await identityQlockService.getKeysForIdentity('did:squid:dao:failed');

      expect(qonsentProfile).toBeNull();
      expect(qlockKeys).toBeNull();

      // Restore original function
      identityQwalletService.createWalletForIdentity = originalCreateWallet;
    });

    it('should handle partial service recovery', async () => {
      // Setup identity with some services failing
      await identityQonsentService.createQonsentProfile(mockRootIdentity);
      await identityQlockService.generateKeysForIdentity(mockRootIdentity);

      // Mock wallet service to fail initially
      const originalCreateWallet = identityQwalletService.createWalletForIdentity;
      identityQwalletService.createWalletForIdentity = vi.fn().mockRejectedValue(new Error('Temporary failure'));

      // Try to create wallet (should fail)
      await expect(identityQwalletService.createWalletForIdentity(mockRootIdentity))
        .rejects.toThrow('Temporary failure');

      // Restore service and retry
      identityQwalletService.createWalletForIdentity = originalCreateWallet;
      const walletContext = await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      expect(walletContext).toBeDefined();
      expect(walletContext.identityId).toBe(mockRootIdentity.did);

      // Verify all services are now working
      const qonsentProfile = await identityQonsentService.getQonsentProfile(mockRootIdentity.did);
      const qlockKeys = await identityQlockService.getKeysForIdentity(mockRootIdentity.did);
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(qonsentProfile).toBeDefined();
      expect(qlockKeys).toBeDefined();
      expect(walletAddress).toBeDefined();
    });
  });
});