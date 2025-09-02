/**
 * Integration Tests for Qwallet Context Management
 * Tests the integration between IdentityManager and IdentityQwalletService
 * for automatic wallet context updates on identity switch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { identityManager } from '../../IdentityManager';
import { identityQwalletService } from '../IdentityQwalletService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus,
  SubidentityMetadata
} from '../../../types/identity';

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

// Mock the identity store
vi.mock('../../../state/identity', () => ({
  useIdentityStore: {
    getState: () => ({
      activeIdentity: null,
      identities: new Map(),
      identityTree: null,
      getRootIdentity: () => null,
      getIdentityById: vi.fn(),
      createSubidentity: vi.fn(),
      setActiveIdentity: vi.fn(),
      deleteSubidentity: vi.fn(),
      buildIdentityTree: vi.fn(),
      getChildIdentities: vi.fn(),
      logIdentityAction: vi.fn(),
      addSecurityFlag: vi.fn()
    })
  }
}));

describe('Qwallet Context Integration', () => {
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockEnterpriseIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);

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
        approved: true // Set to approved for testing
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: false,
      usageStats: {
        switchCount: 0,
        lastSwitch: new Date().toISOString(),
        modulesAccessed: [],
        totalSessions: 0
      }
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

    mockEnterpriseIdentity = {
      ...baseIdentity,
      did: 'did:squid:enterprise-789',
      name: 'Enterprise Identity',
      type: IdentityType.ENTERPRISE,
      parentId: 'did:squid:root-123',
      depth: 1,
      path: ['did:squid:root-123'],
      privacyLevel: PrivacyLevel.PUBLIC,
      governanceLevel: GovernanceType.DAO,
      permissions: {
        ...baseIdentity.permissions,
        canCreateSubidentities: false
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Wallet Creation on Identity Creation', () => {
    it('should automatically create wallet when creating new identity', async () => {
      // Mock the identity store methods
      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => id === mockRootIdentity.did ? mockRootIdentity : null,
        createSubidentity: vi.fn().mockResolvedValue({ success: true, identity: mockDAOIdentity }),
        setActiveIdentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      // Mock the useIdentityStore
      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      const metadata: SubidentityMetadata = {
        name: 'Test DAO Identity',
        description: 'Test DAO for integration testing',
        privacyLevel: PrivacyLevel.PUBLIC,
        tags: ['test', 'dao'],
        type: IdentityType.DAO
      };

      // Create the subidentity
      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);

      expect(result.success).toBe(true);

      // Verify wallet was created for the new identity
      const walletAddress = await identityQwalletService.getWalletAddressForIdentity(mockDAOIdentity.did);
      expect(walletAddress).toBeDefined();
      expect(walletAddress).toMatch(/^0x[a-f0-9]{40}$/);

      // Verify wallet permissions are set correctly for DAO identity
      const permissions = await identityQwalletService.getWalletPermissions(mockDAOIdentity.did);
      expect(permissions.canTransfer).toBe(true);
      expect(permissions.canMintNFT).toBe(true);
      expect(permissions.canCreateDAO).toBe(false); // DAO identities cannot create other DAOs
      expect(permissions.governanceLevel).toBe('LIMITED');
    });

    it('should create wallet with appropriate permissions for Enterprise identity', async () => {
      // Mock the identity store methods
      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => id === mockRootIdentity.did ? mockRootIdentity : null,
        createSubidentity: vi.fn().mockResolvedValue({ success: true, identity: mockEnterpriseIdentity }),
        setActiveIdentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      const metadata: SubidentityMetadata = {
        name: 'Test Enterprise Identity',
        description: 'Test Enterprise for integration testing',
        privacyLevel: PrivacyLevel.PUBLIC,
        tags: ['test', 'enterprise'],
        type: IdentityType.ENTERPRISE
      };

      const result = await identityManager.createSubidentity(IdentityType.ENTERPRISE, metadata);

      expect(result.success).toBe(true);

      // Verify wallet permissions for Enterprise identity
      const permissions = await identityQwalletService.getWalletPermissions(mockEnterpriseIdentity.did);
      expect(permissions.canTransfer).toBe(true);
      expect(permissions.canAccessDeFi).toBe(false); // Enterprise identities cannot access DeFi
      expect(permissions.canCreateDAO).toBe(false);
      expect(permissions.maxTransactionAmount).toBe(50000); // Lower limit for Enterprise
      expect(permissions.restrictedOperations).toContain('DEFI');
    });
  });

  describe('Wallet Context Switching on Identity Switch', () => {
    beforeEach(async () => {
      // Create wallets for test identities
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
    });

    it('should automatically switch wallet context when switching identities', async () => {
      // Mock the identity store methods
      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => {
          if (id === mockRootIdentity.did) return mockRootIdentity;
          if (id === mockDAOIdentity.did) return mockDAOIdentity;
          return null;
        },
        setActiveIdentity: vi.fn().mockResolvedValue(undefined),
        createSubidentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      // Set initial wallet context to root identity
      await identityQwalletService.setActiveWalletContext(mockRootIdentity.did);

      // Switch to DAO identity
      const result = await identityManager.switchActiveIdentity(mockDAOIdentity.did);

      expect(result.success).toBe(true);
      expect(result.contextUpdates.qwallet).toBe(true);

      // Verify wallet context was switched
      const activeContext = await identityQwalletService.getActiveWalletContext();
      expect(activeContext).toBe(mockDAOIdentity.did);

      // Verify session storage was updated
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'active_wallet_context',
        mockDAOIdentity.did
      );
    });

    it('should handle wallet context switch failures gracefully', async () => {
      // Mock the identity store methods
      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => {
          if (id === mockRootIdentity.did) return mockRootIdentity;
          if (id === 'non-existent-id') return null;
          return null;
        },
        setActiveIdentity: vi.fn().mockResolvedValue(undefined),
        createSubidentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      // Try to switch to non-existent identity
      const result = await identityManager.switchActiveIdentity('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target identity not found');
    });

    it('should sync wallet state after context switch', async () => {
      // Mock the identity store methods
      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => {
          if (id === mockRootIdentity.did) return mockRootIdentity;
          if (id === mockDAOIdentity.did) return mockDAOIdentity;
          return null;
        },
        setActiveIdentity: vi.fn().mockResolvedValue(undefined),
        createSubidentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      // Spy on wallet service methods
      const syncStateSpy = vi.spyOn(identityQwalletService, 'syncWalletState');
      const updateContextSpy = vi.spyOn(identityQwalletService, 'updateWalletContextOnSwitch');

      await identityManager.switchActiveIdentity(mockDAOIdentity.did);

      // Verify sync methods were called
      expect(updateContextSpy).toHaveBeenCalledWith(mockDAOIdentity.did);
      expect(syncStateSpy).toHaveBeenCalledWith(mockDAOIdentity.did);
    });
  });

  describe('Wallet Permission Validation', () => {
    beforeEach(async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
      await identityQwalletService.createWalletForIdentity(mockEnterpriseIdentity);
    });

    it('should validate operations based on identity type permissions', async () => {
      // Test ROOT identity permissions (should allow most operations)
      const rootTransfer = {
        type: 'TRANSFER' as const,
        amount: 50000,
        token: 'ETH'
      };

      const rootValid = await identityQwalletService.validateWalletOperation(
        mockRootIdentity.did,
        rootTransfer
      );
      expect(rootValid).toBe(true);

      // Test Enterprise identity permissions (should restrict DeFi)
      const defiOperation = {
        type: 'DEFI' as const,
        metadata: { protocol: 'uniswap' }
      };

      const enterpriseDefiValid = await identityQwalletService.validateWalletOperation(
        mockEnterpriseIdentity.did,
        defiOperation
      );
      expect(enterpriseDefiValid).toBe(false);

      // Test DAO identity permissions (should allow transfers but not DAO creation)
      const daoCreateOperation = {
        type: 'DAO_CREATE' as const,
        metadata: { name: 'New DAO' }
      };

      const daoCreateValid = await identityQwalletService.validateWalletOperation(
        mockDAOIdentity.did,
        daoCreateOperation
      );
      expect(daoCreateValid).toBe(false);
    });

    it('should enforce transaction amount limits per identity type', async () => {
      // Test Enterprise identity transaction limit (50,000)
      const largeTransfer = {
        type: 'TRANSFER' as const,
        amount: 75000, // Exceeds Enterprise limit
        token: 'ETH'
      };

      const enterpriseValid = await identityQwalletService.validateWalletOperation(
        mockEnterpriseIdentity.did,
        largeTransfer
      );
      expect(enterpriseValid).toBe(false);

      // Same transfer should be valid for ROOT identity
      const rootValid = await identityQwalletService.validateWalletOperation(
        mockRootIdentity.did,
        largeTransfer
      );
      expect(rootValid).toBe(true);
    });

    it('should enforce token restrictions per identity type', async () => {
      // Enterprise identity should only allow ETH and QToken
      const piTransfer = {
        type: 'TRANSFER' as const,
        amount: 1000,
        token: 'PI' // Not allowed for Enterprise
      };

      const enterpriseValid = await identityQwalletService.validateWalletOperation(
        mockEnterpriseIdentity.did,
        piTransfer
      );
      expect(enterpriseValid).toBe(false);

      // Same transfer should be valid for ROOT identity
      const rootValid = await identityQwalletService.validateWalletOperation(
        mockRootIdentity.did,
        piTransfer
      );
      expect(rootValid).toBe(true);
    });
  });

  describe('Integration with Other Services', () => {
    beforeEach(async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
    });

    it('should sync with Qlock on wallet context switch', async () => {
      const syncQlockSpy = vi.spyOn(identityQwalletService, 'syncWithQlock');

      await identityQwalletService.switchWalletContext('none', mockRootIdentity.did);

      expect(syncQlockSpy).toHaveBeenCalledWith(mockRootIdentity.did);
    });

    it('should sync with Qonsent on wallet context switch', async () => {
      const syncQonsentSpy = vi.spyOn(identityQwalletService, 'syncWithQonsent');

      await identityQwalletService.switchWalletContext('none', mockRootIdentity.did);

      expect(syncQonsentSpy).toHaveBeenCalledWith(mockRootIdentity.did);
    });

    it('should handle integration service failures gracefully', async () => {
      // Mock Qlock sync to fail
      vi.spyOn(identityQwalletService, 'syncWithQlock').mockResolvedValue(false);

      // Switch should still succeed even if sync fails
      const success = await identityQwalletService.switchWalletContext('none', mockRootIdentity.did);
      expect(success).toBe(true);
    });
  });

  describe('Transaction Context Management', () => {
    beforeEach(async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
    });

    it('should provide correct transaction context for active identity', async () => {
      await identityQwalletService.setActiveWalletContext(mockDAOIdentity.did);

      const context = await identityQwalletService.getTransactionContext(mockDAOIdentity.did);

      expect(context.identityId).toBe(mockDAOIdentity.did);
      expect(context.permissions.governanceLevel).toBe('LIMITED');
      expect(context.chainId).toBe(1);
      expect(context.nonce).toBeGreaterThanOrEqual(0);
    });

    it('should sign transactions with identity-specific context', async () => {
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x'
      };

      const result = await identityQwalletService.signTransactionForIdentity(
        mockRootIdentity.did,
        transaction
      );

      expect(result.success).toBe(true);
      expect(result.identityId).toBe(mockRootIdentity.did);
      expect(result.signature).toBeDefined();
      expect(result.transactionHash).toBeDefined();
    });

    it('should reject transactions that violate identity permissions', async () => {
      // Create a Consentida identity with read-only permissions
      const consentidaIdentity = {
        ...mockRootIdentity,
        did: 'did:squid:consentida-123',
        type: IdentityType.CONSENTIDA
      };

      await identityQwalletService.createWalletForIdentity(consentidaIdentity);

      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x'
      };

      const result = await identityQwalletService.signTransactionForIdentity(
        consentidaIdentity.did,
        transaction
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation not permitted');
    });
  });

  describe('Balance Management Integration', () => {
    beforeEach(async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);
      await identityQwalletService.createWalletForIdentity(mockDAOIdentity);
    });

    it('should provide identity-specific balance information', async () => {
      const balances = await identityQwalletService.getBalancesForIdentity(mockRootIdentity.did);

      expect(balances.identityId).toBe(mockRootIdentity.did);
      expect(balances.walletAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(Array.isArray(balances.balances)).toBe(true);
      expect(balances.totalValueUSD).toBeGreaterThanOrEqual(0);
    });

    it('should support transfers between different identity wallets', async () => {
      const success = await identityQwalletService.transferBetweenIdentities(
        mockRootIdentity.did,
        mockDAOIdentity.did,
        1000,
        'QToken'
      );

      expect(success).toBe(true);
    });

    it('should validate transfer permissions between identities', async () => {
      // Create AID identity with limited permissions
      const aidIdentity = {
        ...mockRootIdentity,
        did: 'did:squid:aid-123',
        type: IdentityType.AID
      };

      await identityQwalletService.createWalletForIdentity(aidIdentity);

      // Try to transfer amount exceeding AID limit
      const success = await identityQwalletService.transferBetweenIdentities(
        aidIdentity.did,
        mockDAOIdentity.did,
        5000, // Exceeds AID limit of 1000
        'ETH'
      );

      expect(success).toBe(false);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle wallet creation failures during identity creation', async () => {
      // Mock wallet creation to fail
      const originalCreate = identityQwalletService.createWalletForIdentity;
      identityQwalletService.createWalletForIdentity = vi.fn().mockRejectedValue(
        new Error('Wallet creation failed')
      );

      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => id === mockRootIdentity.did ? mockRootIdentity : null,
        createSubidentity: vi.fn().mockResolvedValue({ success: true, identity: mockDAOIdentity }),
        setActiveIdentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      const metadata: SubidentityMetadata = {
        name: 'Test Identity',
        description: 'Test identity for error handling',
        privacyLevel: PrivacyLevel.PUBLIC,
        type: IdentityType.DAO
      };

      // Identity creation should still succeed even if wallet creation fails
      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      
      // The result should indicate partial success with wallet sync error
      expect(result.success).toBe(true);

      // Restore original method
      identityQwalletService.createWalletForIdentity = originalCreate;
    });

    it('should handle context switch failures gracefully', async () => {
      await identityQwalletService.createWalletForIdentity(mockRootIdentity);

      // Mock context switch to fail
      const originalSwitch = identityQwalletService.switchWalletContext;
      identityQwalletService.switchWalletContext = vi.fn().mockResolvedValue(false);

      const mockStore = {
        activeIdentity: mockRootIdentity,
        getRootIdentity: () => mockRootIdentity,
        getIdentityById: (id: string) => {
          if (id === mockRootIdentity.did) return mockRootIdentity;
          if (id === mockDAOIdentity.did) return mockDAOIdentity;
          return null;
        },
        setActiveIdentity: vi.fn().mockResolvedValue(undefined),
        createSubidentity: vi.fn(),
        deleteSubidentity: vi.fn(),
        buildIdentityTree: vi.fn(),
        getChildIdentities: vi.fn(),
        logIdentityAction: vi.fn(),
        addSecurityFlag: vi.fn()
      };

      const { useIdentityStore } = await import('../../../state/identity');
      vi.mocked(useIdentityStore.getState).mockReturnValue(mockStore);

      const result = await identityManager.switchActiveIdentity(mockDAOIdentity.did);

      // Identity switch should still succeed but indicate wallet context update failed
      expect(result.success).toBe(true);
      expect(result.contextUpdates.qwallet).toBe(false);

      // Restore original method
      identityQwalletService.switchWalletContext = originalSwitch;
    });
  });
});