/**
 * Unit tests for Identity Storage Management
 * Tests storage functionality with proper mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtendedSquidIdentity, IdentityTree, IdentityType, IdentityStatus, GovernanceType, PrivacyLevel } from '@/types/identity';

// Mock the safeStorage module
vi.mock('../safeStorage', () => ({
  safeLocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  safeSessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
}));

// Import the functions after mocking
import { 
  storeIdentity,
  getIdentity,
  setActiveIdentity,
  getActiveIdentity,
  clearActiveIdentity,
  removeIdentity,
  performStorageCleanup,
  getStorageStats,
  clearAllIdentityStorage
} from '../identityStorage';

// Import the mocked storage instances
import { safeLocalStorage, safeSessionStorage } from '../safeStorage';

// Cast to mocked versions for testing
const mockSafeLocalStorage = safeLocalStorage as any;
const mockSafeSessionStorage = safeSessionStorage as any;

// Test data
const createMockIdentity = (overrides: Partial<ExtendedSquidIdentity> = {}): ExtendedSquidIdentity => ({
  did: 'did:squid:test-123',
  name: 'Test Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:test-123',
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
    allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
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
  qonsentProfileId: 'qonsent-test-123',
  qlockKeyPair: {
    publicKey: 'pub-test-123',
    privateKey: 'priv-test-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  tags: ['test'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastUsed: '2024-01-01T00:00:00.000Z',
  kyc: {
    required: false,
    submitted: false,
    approved: false
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: false,
  usageStats: {
    switchCount: 0,
    lastSwitch: '2024-01-01T00:00:00.000Z',
    modulesAccessed: [],
    totalSessions: 0
  },
  ...overrides
});

describe('Identity Storage Management', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock IndexedDB as not available to test localStorage fallback
    global.indexedDB = undefined as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Identity Storage (localStorage fallback)', () => {
    it('should store identity in localStorage when IndexedDB is not available', async () => {
      const identity = createMockIdentity();
      
      await storeIdentity(identity);
      
      expect(mockSafeLocalStorage.setItem).toHaveBeenCalledWith(
        `squid_identity_${identity.did}`,
        expect.any(String)
      );
    });

    it('should retrieve identity from localStorage', async () => {
      const identity = createMockIdentity();
      const did = identity.did;
      
      mockSafeLocalStorage.getItem.mockReturnValue(JSON.stringify(identity));
      
      const result = await getIdentity(did);
      
      expect(mockSafeLocalStorage.getItem).toHaveBeenCalledWith(`squid_identity_${did}`);
      expect(result).toMatchObject({
        did: identity.did,
        name: identity.name,
        type: identity.type
      });
    });

    it('should return null when identity is not found', async () => {
      const did = 'non-existent-did';
      
      mockSafeLocalStorage.getItem.mockReturnValue(null);
      
      const result = await getIdentity(did);
      
      expect(result).toBeNull();
    });

    it('should remove identity from localStorage', async () => {
      const did = 'did:squid:test-123';
      
      await removeIdentity(did);
      
      expect(mockSafeLocalStorage.removeItem).toHaveBeenCalledWith(`squid_identity_${did}`);
    });
  });

  describe('Active Identity Session Management', () => {
    it('should set active identity in SessionStorage', () => {
      const identity = createMockIdentity();
      
      setActiveIdentity(identity);
      
      expect(mockSafeSessionStorage.setItem).toHaveBeenCalledWith(
        'squid_active_identity',
        expect.stringContaining(identity.did)
      );
    });

    it('should get active identity from SessionStorage', () => {
      const identity = createMockIdentity();
      const activeIdentityData = {
        identity,
        setAt: '2024-01-01T00:00:00.000Z',
        sessionId: 'session_123'
      };
      
      mockSafeSessionStorage.getItem.mockReturnValue(JSON.stringify(activeIdentityData));
      
      const result = getActiveIdentity();
      
      expect(mockSafeSessionStorage.getItem).toHaveBeenCalledWith('squid_active_identity');
      expect(result).toMatchObject({
        did: identity.did,
        name: identity.name,
        type: identity.type
      });
    });

    it('should return null when no active identity exists', () => {
      mockSafeSessionStorage.getItem.mockReturnValue(null);
      
      const result = getActiveIdentity();
      
      expect(result).toBeNull();
    });

    it('should clear active identity from SessionStorage', () => {
      clearActiveIdentity();
      
      expect(mockSafeSessionStorage.removeItem).toHaveBeenCalledWith('squid_active_identity');
    });

    it('should handle JSON parsing errors gracefully', () => {
      mockSafeSessionStorage.getItem.mockReturnValue('invalid-json');
      
      const result = getActiveIdentity();
      
      expect(result).toBeNull();
    });
  });

  describe('Storage Statistics', () => {
    it('should return cache statistics', () => {
      const stats = getStorageStats();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('lastCleanup');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalMisses');
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
    });
  });

  describe('Storage Cleanup', () => {
    it('should perform cleanup without errors', async () => {
      // Mock localStorage with some entries
      const mockKeys = ['squid_identity_test1', 'squid_identity_test2', 'other_key'];
      Object.defineProperty(global, 'localStorage', {
        value: {
          length: mockKeys.length,
          key: vi.fn((index) => mockKeys[index]),
          getItem: vi.fn((key) => {
            if (key.startsWith('squid_identity_')) {
              return JSON.stringify({ expiresAt: '2024-01-01T00:00:00.000Z' }); // Expired
            }
            return null;
          }),
          removeItem: vi.fn()
        },
        writable: true
      });
      
      await expect(performStorageCleanup()).resolves.not.toThrow();
    });
  });

  describe('Clear All Storage', () => {
    it('should clear all identity storage', async () => {
      await clearAllIdentityStorage();
      
      expect(mockSafeSessionStorage.removeItem).toHaveBeenCalledWith('squid_active_identity');
    });

    it('should reset cache metadata after clearing', async () => {
      await clearAllIdentityStorage();
      
      const stats = getStorageStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', async () => {
      const identity = createMockIdentity();
      
      mockSafeLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Should not throw
      await expect(storeIdentity(identity)).resolves.not.toThrow();
    });

    it('should handle corrupted localStorage data', async () => {
      mockSafeLocalStorage.getItem.mockReturnValue('corrupted-json-data');
      
      const result = await getIdentity('test-did');
      
      expect(result).toBeNull();
    });

    it('should handle SessionStorage access errors', () => {
      mockSafeSessionStorage.setItem.mockImplementation(() => {
        throw new Error('SessionStorage not available');
      });
      
      const identity = createMockIdentity();
      
      // Should not throw
      expect(() => setActiveIdentity(identity)).not.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent storage operations', async () => {
      const identities = [
        createMockIdentity({ did: 'did:squid:concurrent-1' }),
        createMockIdentity({ did: 'did:squid:concurrent-2' }),
        createMockIdentity({ did: 'did:squid:concurrent-3' })
      ];
      
      // Execute concurrent operations
      const promises = identities.map(identity => storeIdentity(identity));
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
      // Each identity stores both the identity and cache metadata, so expect 2x calls
      expect(mockSafeLocalStorage.setItem).toHaveBeenCalledTimes(identities.length * 2);
    });

    it('should handle concurrent cleanup operations', async () => {
      const cleanupPromises = [
        performStorageCleanup(),
        performStorageCleanup(),
        performStorageCleanup()
      ];
      
      await expect(Promise.all(cleanupPromises)).resolves.not.toThrow();
    });
  });
});