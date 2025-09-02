/**
 * Unit Tests for Identity Local Storage Service
 * Tests IndexedDB caching and SessionStorage management
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { identityLocalStorage, IdentityLocalStorage } from '../IdentityLocalStorage';
import { ExtendedSquidIdentity, IdentityType, PrivacyLevel, GovernanceType, IdentityStatus } from '@/types/identity';

// Mock IndexedDB
class MockIDBDatabase {
  objectStoreNames = {
    contains: vi.fn(() => false)
  };
  
  transaction = vi.fn(() => ({
    objectStore: vi.fn(() => ({
      put: vi.fn(() => ({ onsuccess: null, onerror: null })),
      get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
      getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
      delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
      clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
      count: vi.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
      createIndex: vi.fn(),
      index: vi.fn(() => ({
        getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] }))
      }))
    }))
  }));
  
  createObjectStore = vi.fn(() => ({
    createIndex: vi.fn()
  }));
}

class MockIDBRequest {
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onupgradeneeded: ((event: any) => void) | null = null;
  result: any = null;
  error: any = null;
}

// Mock global IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => {
    const request = new MockIDBRequest();
    request.result = new MockIDBDatabase();
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  })
};

// Mock SessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock LocalStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Setup global mocks
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock document and canvas for device fingerprinting
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      getContext: vi.fn(() => ({
        fillText: vi.fn()
      })),
      toDataURL: vi.fn(() => 'mock-canvas-data')
    }))
  },
  writable: true
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    language: 'en-US'
  },
  writable: true
});

// Mock screen
Object.defineProperty(global, 'screen', {
  value: {
    width: 1920,
    height: 1080
  },
  writable: true
});

describe('IdentityLocalStorage', () => {
  let testIdentity: ExtendedSquidIdentity;
  let storage: IdentityLocalStorage;

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
      auditLog: [],
      securityFlags: [],
      kyc: {
        required: true,
        submitted: true,
        approved: true
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
        allowedChildTypes: []
      },
      permissions: {
        canCreateSubidentities: true,
        canDeleteSubidentities: true,
        canModifyProfile: true,
        canAccessModule: () => true,
        canPerformAction: () => true,
        governanceLevel: GovernanceType.DAO
      },
      status: IdentityStatus.ACTIVE
    };

    // Get fresh instance
    storage = IdentityLocalStorage.getInstance();

    // Setup default session storage mock
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('IndexedDB Operations', () => {
    describe('cacheIdentity', () => {
      it('should cache identity successfully', async () => {
        const mockStore = {
          put: vi.fn(() => {
            const request = { onsuccess: null, onerror: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        await storage.cacheIdentity(testIdentity, 'QmTestHash');

        expect(mockDB.transaction).toHaveBeenCalledWith(['identities'], 'readwrite');
        expect(mockTransaction.objectStore).toHaveBeenCalledWith('identities');
        expect(mockStore.put).toHaveBeenCalledWith(
          expect.objectContaining({
            did: testIdentity.did,
            identity: testIdentity,
            ipfsHash: 'QmTestHash',
            syncStatus: 'synced',
            version: 1
          })
        );
      });

      it('should handle caching errors gracefully', async () => {
        const mockStore = {
          put: vi.fn(() => {
            const request = { onsuccess: null, onerror: null, error: new Error('Put failed') };
            setTimeout(() => request.onerror?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        await expect(storage.cacheIdentity(testIdentity))
          .rejects.toThrow('Failed to cache identity');
      });
    });

    describe('getCachedIdentity', () => {
      it('should retrieve cached identity successfully', async () => {
        const cachedEntry = {
          did: testIdentity.did,
          identity: testIdentity,
          ipfsHash: 'QmTestHash',
          cachedAt: '2024-01-01T00:00:00.000Z',
          lastAccessed: '2024-01-01T00:00:00.000Z',
          syncStatus: 'synced',
          version: 1
        };

        const mockStore = {
          get: vi.fn(() => {
            const request = { onsuccess: null, onerror: null, result: cachedEntry };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          }),
          put: vi.fn(() => {
            const request = { onsuccess: null, onerror: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        const result = await storage.getCachedIdentity(testIdentity.did);

        expect(result).toEqual(testIdentity);
        expect(mockStore.get).toHaveBeenCalledWith(testIdentity.did);
        expect(mockStore.put).toHaveBeenCalled(); // Updates lastAccessed
      });

      it('should return null when identity not found', async () => {
        const mockStore = {
          get: vi.fn(() => {
            const request = { onsuccess: null, onerror: null, result: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        const result = await storage.getCachedIdentity('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('clearCache', () => {
      it('should clear specific identity cache', async () => {
        const mockStore = {
          delete: vi.fn(() => {
            const request = { onsuccess: null, onerror: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        await storage.clearCache(testIdentity.did);

        expect(mockStore.delete).toHaveBeenCalledWith(testIdentity.did);
      });

      it('should clear all cache when no identity specified', async () => {
        const mockStore = {
          clear: vi.fn(() => {
            const request = { onsuccess: null, onerror: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        // Mock successful DB initialization
        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        await storage.clearCache();

        expect(mockStore.clear).toHaveBeenCalled();
      });
    });
  });

  describe('SessionStorage Operations', () => {
    describe('setActiveIdentity', () => {
      it('should set active identity in session storage', async () => {
        await storage.setActiveIdentity(testIdentity);

        expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
          'squid-identity-session',
          expect.stringContaining(testIdentity.did)
        );

        // Verify the stored data structure
        const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
        expect(storedData.activeIdentityId).toBe(testIdentity.did);
        expect(storedData.switchHistory).toHaveLength(1);
        expect(storedData.switchHistory[0].identityId).toBe(testIdentity.did);
        expect(storedData.sessionMetadata.sessionId).toMatch(/^session-/);
      });

      it('should maintain switch history', async () => {
        const existingSessionData = {
          activeIdentityId: 'old-identity',
          switchHistory: [
            {
              identityId: 'old-identity',
              timestamp: '2024-01-01T00:00:00.000Z',
              switchId: 'switch-old'
            }
          ],
          contextState: {},
          sessionMetadata: {
            sessionId: 'existing-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSessionData));

        await storage.setActiveIdentity(testIdentity);

        const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
        expect(storedData.switchHistory).toHaveLength(2);
        expect(storedData.switchHistory[0].identityId).toBe(testIdentity.did);
        expect(storedData.switchHistory[1].identityId).toBe('old-identity');
      });
    });

    describe('getActiveIdentity', () => {
      it('should return null when no active identity set', async () => {
        mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
          activeIdentityId: null,
          switchHistory: [],
          contextState: {},
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        }));

        const result = await storage.getActiveIdentity();

        expect(result).toBeNull();
      });

      it('should return cached identity when available', async () => {
        mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
          activeIdentityId: testIdentity.did,
          switchHistory: [],
          contextState: {},
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        }));

        // Mock getCachedIdentity to return the test identity
        const mockStore = {
          get: vi.fn(() => {
            const request = { 
              onsuccess: null, 
              onerror: null, 
              result: {
                did: testIdentity.did,
                identity: testIdentity,
                lastAccessed: '2024-01-01T00:00:00.000Z'
              }
            };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          }),
          put: vi.fn(() => {
            const request = { onsuccess: null, onerror: null };
            setTimeout(() => request.onsuccess?.(), 0);
            return request;
          })
        };

        const mockTransaction = {
          objectStore: vi.fn(() => mockStore)
        };

        const mockDB = new MockIDBDatabase();
        mockDB.transaction = vi.fn(() => mockTransaction);

        mockIndexedDB.open.mockReturnValueOnce({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDB
        });

        const result = await storage.getActiveIdentity();

        expect(result).toEqual(testIdentity);
      });
    });

    describe('clearActiveIdentity', () => {
      it('should clear active identity from session storage', async () => {
        const existingSessionData = {
          activeIdentityId: testIdentity.did,
          switchHistory: [],
          contextState: { qwallet: { some: 'data' } },
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSessionData));

        await storage.clearActiveIdentity();

        const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
        expect(storedData.activeIdentityId).toBeNull();
        expect(storedData.contextState).toEqual({});
      });
    });

    describe('module context management', () => {
      it('should set module context', () => {
        const contextData = { walletAddress: '0x123', balance: 100 };

        storage.setModuleContext('qwallet', contextData);

        expect(mockSessionStorage.setItem).toHaveBeenCalled();
        const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
        expect(storedData.contextState.qwallet).toEqual(contextData);
      });

      it('should get module context', () => {
        const sessionData = {
          activeIdentityId: null,
          switchHistory: [],
          contextState: {
            qwallet: { walletAddress: '0x123', balance: 100 }
          },
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

        const result = storage.getModuleContext('qwallet');

        expect(result).toEqual({ walletAddress: '0x123', balance: 100 });
      });

      it('should return null for non-existent module context', () => {
        const sessionData = {
          activeIdentityId: null,
          switchHistory: [],
          contextState: {},
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

        const result = storage.getModuleContext('nonexistent');

        expect(result).toBeNull();
      });

      it('should clear module context', () => {
        const sessionData = {
          activeIdentityId: null,
          switchHistory: [],
          contextState: {
            qwallet: { walletAddress: '0x123' },
            qonsent: { privacy: 'high' }
          },
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

        storage.clearModuleContext('qwallet');

        const storedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1]);
        expect(storedData.contextState.qwallet).toBeUndefined();
        expect(storedData.contextState.qonsent).toEqual({ privacy: 'high' });
      });
    });
  });

  describe('utility methods', () => {
    describe('getSwitchHistory', () => {
      it('should return switch history', () => {
        const switchHistory = [
          {
            identityId: testIdentity.did,
            timestamp: '2024-01-01T00:00:00.000Z',
            switchId: 'switch-123'
          }
        ];

        const sessionData = {
          activeIdentityId: testIdentity.did,
          switchHistory,
          contextState: {},
          sessionMetadata: {
            sessionId: 'test-session',
            startedAt: '2024-01-01T00:00:00.000Z',
            lastActivity: '2024-01-01T00:00:00.000Z'
          }
        };

        mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

        const result = storage.getSwitchHistory();

        expect(result).toEqual(switchHistory);
      });
    });

    describe('error handling', () => {
      it('should handle corrupted session data gracefully', () => {
        mockSessionStorage.getItem.mockReturnValue('invalid-json');

        // Should not throw and should create new session data
        const result = storage.getModuleContext('qwallet');

        expect(result).toBeNull();
        expect(mockSessionStorage.setItem).toHaveBeenCalled();
      });

      it('should handle session storage errors gracefully', () => {
        mockSessionStorage.setItem.mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });

        // Should not throw
        expect(() => storage.setModuleContext('qwallet', { test: 'data' })).not.toThrow();
      });
    });
  });
});