/**
 * Integration Tests for IdentityQwalletService
 * Tests wallet context switching and identity-specific wallet operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityQwalletService } from '../IdentityQwalletService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus 
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

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('IdentityQwalletService', () => {
  let service: IdentityQwalletService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;
  let mockAIDIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    
    // Create fresh service instance
    service = new IdentityQwalletService();

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Wallet Creation', () => {
    it('should create wallet for ROOT identity with full permissions', async () => {
      const walletContext = await service.createWalletForIdentity(mockRootIdentity);

      expect(walletContext).toBeDefined();
      expect(walletContext.identityId).toBe(mockRootIdentity.did);
      expect(walletContext.walletAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(walletContext.permissions.canTransfer).toBe(true);
      expect(walletContext.permissions.canMintNFT).toBe(true);
      expect(walletContext.permissions.canCreateDAO).toBe(true);
      expect(walletContext.permissions.governanceLevel).toBe('FULL');
      expect(walletContext.permissions.maxTransactionAmount).toBe(1000000);
    });

    it('should create wallet for AID identity with limited permissions', async () => {
      const walletContext = await service.createWalletForIdentity(mockAIDIdentity);

      expect(walletContext).toBeDefined();
      expect(walletContext.identityId).toBe(mockAIDIdentity.did);
      expect(walletContext.permissions.canTransfer).toBe(true);
      expect(walletContext.permissions.canMintNFT).toBe(false);
      expect(walletContext.permissions.canCreateDAO).toBe(false);
      expect(walletContext.permissions.governanceLevel).toBe('LIMITED');
      expect(walletContext.permissions.maxTransactionAmount).toBe(1000);
      expect(walletContext.permissions.allowedTokens).toEqual(['ETH']);
    });

    it('should save wallet context to storage', async () => {
      await service.createWalletForIdentity(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qwallet_contexts',
        expect.stringContaining(mockRootIdentity.did)
      );
    });
  });

  describe('Wallet Context Switching', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
      await service.createWalletForIdentity(mockDAOIdentity);
    });

    it('should switch wallet context between identities', async () => {
      const success = await service.switchWalletContext(
        mockRootIdentity.did,
        mockDAOIdentity.did
      );

      expect(success).toBe(true);

      const activeContext = await service.getActiveWalletContext();
      expect(activeContext).toBe(mockDAOIdentity.did);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'active_wallet_context',
        mockDAOIdentity.did
      );
    });

    it('should fail to switch to identity without wallet', async () => {
      const success = await service.switchWalletContext(
        mockRootIdentity.did,
        'non-existent-id'
      );

      expect(success).toBe(false);
    });

    it('should set active wallet context', async () => {
      const success = await service.setActiveWalletContext(mockRootIdentity.did);

      expect(success).toBe(true);

      const activeContext = await service.getActiveWalletContext();
      expect(activeContext).toBe(mockRootIdentity.did);
    });

    it('should load active context from session storage', async () => {
      sessionStorageMock.getItem.mockReturnValue(mockDAOIdentity.did);

      const activeContext = await service.getActiveWalletContext();
      expect(activeContext).toBe(mockDAOIdentity.did);
    });
  });

  describe('Wallet Permissions', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
    });

    it('should get wallet permissions for identity', async () => {
      const permissions = await service.getWalletPermissions(mockRootIdentity.did);

      expect(permissions).toBeDefined();
      expect(permissions.canTransfer).toBe(true);
      expect(permissions.canMintNFT).toBe(true);
      expect(permissions.governanceLevel).toBe('FULL');
    });

    it('should update wallet permissions', async () => {
      const updates = {
        maxTransactionAmount: 50000,
        allowedTokens: ['ETH', 'QToken']
      };

      const success = await service.updateWalletPermissions(mockRootIdentity.did, updates);
      expect(success).toBe(true);

      const updatedPermissions = await service.getWalletPermissions(mockRootIdentity.did);
      expect(updatedPermissions.maxTransactionAmount).toBe(50000);
      expect(updatedPermissions.allowedTokens).toEqual(['ETH', 'QToken']);
    });

    it('should validate wallet operations', async () => {
      // Valid transfer operation
      const validTransfer = {
        type: 'TRANSFER' as const,
        amount: 1000,
        token: 'ETH'
      };

      const isValid = await service.validateWalletOperation(mockRootIdentity.did, validTransfer);
      expect(isValid).toBe(true);

      // Invalid transfer (exceeds limit)
      const invalidTransfer = {
        type: 'TRANSFER' as const,
        amount: 2000000, // Exceeds maxTransactionAmount
        token: 'ETH'
      };

      const isInvalid = await service.validateWalletOperation(mockRootIdentity.did, invalidTransfer);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Wallet Address Management', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
    });

    it('should get wallet address for identity', async () => {
      const address = await service.getWalletAddressForIdentity(mockRootIdentity.did);

      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('should return null for non-existent identity', async () => {
      const address = await service.getWalletAddressForIdentity('non-existent-id');

      expect(address).toBeNull();
    });

    it('should link external wallet to identity', async () => {
      const externalWallet = '0x1234567890123456789012345678901234567890';
      
      const success = await service.linkWalletToIdentity(mockDAOIdentity.did, externalWallet);
      expect(success).toBe(true);

      const address = await service.getWalletAddressForIdentity(mockDAOIdentity.did);
      expect(address).toBe(externalWallet);
    });

    it('should reject invalid wallet address format', async () => {
      const invalidWallet = 'invalid-address';
      
      const success = await service.linkWalletToIdentity(mockDAOIdentity.did, invalidWallet);
      expect(success).toBe(false);
    });

    it('should reject wallet already linked to another identity', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Link to first identity
      await service.linkWalletToIdentity(mockRootIdentity.did, walletAddress);
      
      // Try to link same wallet to second identity
      const success = await service.linkWalletToIdentity(mockDAOIdentity.did, walletAddress);
      expect(success).toBe(false);
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
    });

    it('should get transaction context for identity', async () => {
      const context = await service.getTransactionContext(mockRootIdentity.did);

      expect(context).toBeDefined();
      expect(context.identityId).toBe(mockRootIdentity.did);
      expect(context.walletAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(context.nonce).toBeGreaterThanOrEqual(0);
      expect(context.chainId).toBe(1);
      expect(context.permissions).toBeDefined();
    });

    it('should fail to get context for non-existent identity', async () => {
      await expect(service.getTransactionContext('non-existent-id')).rejects.toThrow(
        'No wallet context found for identity: non-existent-id'
      );
    });

    it('should sign transaction for identity', async () => {
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000', // 1 ETH
        data: '0x'
      };

      const result = await service.signTransactionForIdentity(mockRootIdentity.did, transaction);

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.transactionHash).toBeDefined();
      expect(result.identityId).toBe(mockRootIdentity.did);
    });

    it('should fail to sign for non-existent identity', async () => {
      const transaction = { to: '0x123', value: '1000' };

      const result = await service.signTransactionForIdentity('non-existent-id', transaction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No wallet context found');
    });
  });

  describe('Balance Management', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
    });

    it('should get balances for identity', async () => {
      const balances = await service.getBalancesForIdentity(mockRootIdentity.did);

      expect(balances).toBeDefined();
      expect(balances.identityId).toBe(mockRootIdentity.did);
      expect(balances.walletAddress).toMatch(/^0x[a-f0-9]{40}$/);
      expect(Array.isArray(balances.balances)).toBe(true);
      expect(balances.balances.length).toBeGreaterThan(0);
      expect(balances.totalValueUSD).toBeGreaterThanOrEqual(0);
    });

    it('should include expected tokens in balance', async () => {
      const balances = await service.getBalancesForIdentity(mockRootIdentity.did);

      const tokenSymbols = balances.balances.map(b => b.symbol);
      expect(tokenSymbols).toContain('ETH');
      expect(tokenSymbols).toContain('QTK');
      expect(tokenSymbols).toContain('PI');
    });

    it('should fail to get balances for non-existent identity', async () => {
      await expect(service.getBalancesForIdentity('non-existent-id')).rejects.toThrow(
        'No wallet context found for identity: non-existent-id'
      );
    });
  });

  describe('Inter-Identity Transfers', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
      await service.createWalletForIdentity(mockDAOIdentity);
    });

    it('should transfer tokens between identities', async () => {
      const success = await service.transferBetweenIdentities(
        mockRootIdentity.did,
        mockDAOIdentity.did,
        100,
        'QToken'
      );

      expect(success).toBe(true);
    });

    it('should fail transfer with missing wallet context', async () => {
      const success = await service.transferBetweenIdentities(
        'non-existent-from',
        mockDAOIdentity.did,
        100,
        'QToken'
      );

      expect(success).toBe(false);
    });

    it('should fail transfer when operation not permitted', async () => {
      // Create AID identity with limited permissions
      await service.createWalletForIdentity(mockAIDIdentity);
      
      // AID identity cannot transfer large amounts
      const success = await service.transferBetweenIdentities(
        mockAIDIdentity.did,
        mockDAOIdentity.did,
        5000, // Exceeds AID limit of 1000
        'ETH'
      );

      expect(success).toBe(false);
    });
  });

  describe('Integration Services', () => {
    beforeEach(async () => {
      await service.createWalletForIdentity(mockRootIdentity);
    });

    it('should sync with Qlock', async () => {
      const success = await service.syncWithQlock(mockRootIdentity.did);

      expect(success).toBe(true);
    });

    it('should sync with Qonsent', async () => {
      const success = await service.syncWithQonsent(mockRootIdentity.did);

      expect(success).toBe(true);
    });

    it('should update wallet context on switch', async () => {
      const success = await service.updateWalletContextOnSwitch(mockRootIdentity.did);

      expect(success).toBe(true);
    });

    it('should sync wallet state', async () => {
      const success = await service.syncWalletState(mockRootIdentity.did);

      expect(success).toBe(true);
    });
  });

  describe('Storage Integration', () => {
    it('should save and load wallet contexts from localStorage', async () => {
      await service.createWalletForIdentity(mockRootIdentity);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qwallet_contexts',
        expect.stringContaining(mockRootIdentity.did)
      );
    });

    it('should load existing contexts on initialization', () => {
      const mockContexts = {
        contexts: {
          'did:squid:test-123': {
            identityId: 'did:squid:test-123',
            walletAddress: '0x1234567890123456789012345678901234567890',
            privateKey: 'encrypted_private_key',
            publicKey: 'public_key',
            network: 'mainnet',
            permissions: {
              canTransfer: true,
              canReceive: true,
              canMintNFT: true,
              canSignTransactions: true,
              canAccessDeFi: true,
              canCreateDAO: true,
              maxTransactionAmount: 1000000,
              allowedTokens: ['ETH', 'QToken'],
              restrictedOperations: [],
              governanceLevel: 'FULL'
            },
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          }
        },
        permissions: {}
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockContexts));

      const newService = new IdentityQwalletService();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('identity_qwallet_contexts');
    });

    it('should handle storage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new IdentityQwalletService()).not.toThrow();
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQwalletService] Error loading data from storage:',
        expect.any(Error)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle wallet creation errors', async () => {
      // Mock a service method to throw an error
      const originalMethod = service.createWalletForIdentity;
      service.createWalletForIdentity = vi.fn().mockRejectedValue(new Error('Creation failed'));

      await expect(service.createWalletForIdentity(mockRootIdentity)).rejects.toThrow(
        'Failed to create wallet for identity: did:squid:root-123'
      );

      // Restore original method
      service.createWalletForIdentity = originalMethod;
    });

    it('should handle context switching errors', async () => {
      const success = await service.switchWalletContext('invalid-from', 'invalid-to');

      expect(success).toBe(false);
    });

    it('should handle permission validation errors', async () => {
      const operation = {
        type: 'TRANSFER' as const,
        amount: 1000,
        token: 'ETH'
      };

      const isValid = await service.validateWalletOperation('non-existent-id', operation);
      expect(isValid).toBe(false);
    });
  });

  describe('Permission Validation by Identity Type', () => {
    it('should validate CONSENTIDA identity has read-only permissions', async () => {
      const consentidaIdentity = {
        ...mockRootIdentity,
        did: 'did:squid:consentida-123',
        type: IdentityType.CONSENTIDA
      };

      await service.createWalletForIdentity(consentidaIdentity);
      const permissions = await service.getWalletPermissions(consentidaIdentity.did);

      expect(permissions.canTransfer).toBe(false);
      expect(permissions.canMintNFT).toBe(false);
      expect(permissions.canSignTransactions).toBe(false);
      expect(permissions.governanceLevel).toBe('READ_ONLY');
      expect(permissions.restrictedOperations).toContain('TRANSFER');
    });

    it('should validate ENTERPRISE identity has limited permissions', async () => {
      const enterpriseIdentity = {
        ...mockRootIdentity,
        did: 'did:squid:enterprise-123',
        type: IdentityType.ENTERPRISE
      };

      await service.createWalletForIdentity(enterpriseIdentity);
      const permissions = await service.getWalletPermissions(enterpriseIdentity.did);

      expect(permissions.canTransfer).toBe(true);
      expect(permissions.canAccessDeFi).toBe(false);
      expect(permissions.canCreateDAO).toBe(false);
      expect(permissions.maxTransactionAmount).toBe(50000);
      expect(permissions.restrictedOperations).toContain('DEFI');
    });
  });
});