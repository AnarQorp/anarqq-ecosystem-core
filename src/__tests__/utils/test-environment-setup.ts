/**
 * Test Environment Setup
 * Global setup and configuration for comprehensive system testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';

// Mock ResizeObserver for JSDOM environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for JSDOM environment
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock
});

// Mock crypto for DID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    }
  }
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  }
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock WebSocket for real-time features
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}));

// Mock console methods for cleaner test output
const originalConsole = { ...console };

// Setup function to run before all tests
beforeAll(async () => {
  console.log('[TestSetup] Initializing comprehensive test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITEST_SYSTEM_TEST = 'true';
  
  // Initialize test database/storage
  await initializeTestStorage();
  
  // Setup mock services
  await setupMockServices();
  
  console.log('[TestSetup] Test environment initialized successfully');
});

// Cleanup function to run after all tests
afterAll(async () => {
  console.log('[TestSetup] Cleaning up test environment...');
  
  // Clear test data
  await clearTestStorage();
  
  // Reset mocks
  vi.clearAllMocks();
  
  // Restore console
  Object.assign(console, originalConsole);
  
  console.log('[TestSetup] Test environment cleaned up');
});

// Setup function to run before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();
  
  // Reset fetch mock
  (global.fetch as any).mockClear();
});

// Cleanup function to run after each test
afterEach(() => {
  // Clean up any test-specific data
  vi.restoreAllMocks();
});

// Initialize test storage
async function initializeTestStorage(): Promise<void> {
  // Mock IndexedDB initialization
  indexedDBMock.open.mockImplementation(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
        }))
      }))
    }
  }));
}

// Clear test storage
async function clearTestStorage(): Promise<void> {
  localStorageMock.clear();
  sessionStorageMock.clear();
}

// Setup mock services
async function setupMockServices(): Promise<void> {
  // Mock ecosystem services with default successful responses
  const mockResponses = {
    qonsent: {
      createProfile: { success: true, profileId: 'mock_profile' },
      updateProfile: { success: true },
      switchProfile: { success: true },
      getProfile: { success: true, profile: { identityId: 'mock_id' } }
    },
    qlock: {
      generateKeyPair: { 
        success: true, 
        publicKey: 'mock_public_key', 
        privateKey: 'mock_private_key' 
      },
      encryptData: { success: true, encryptedData: 'mock_encrypted' },
      decryptData: { success: true, decryptedData: 'mock_decrypted' },
      switchEncryptionContext: { success: true }
    },
    qerberos: {
      logAction: { success: true, logId: 'mock_log_id' },
      logSecurityEvent: { success: true, eventId: 'mock_event_id' },
      getAuditLogs: { success: true, logs: [] }
    },
    qindex: {
      registerIdentity: { success: true, indexId: 'mock_index_id' },
      updateIdentityMetadata: { success: true },
      searchIdentities: { success: true, results: [] },
      getIdentity: { success: true, identity: { did: 'mock_did' } }
    },
    qwallet: {
      createWalletContext: { success: true, contextId: 'mock_context_id' },
      switchWalletContext: { success: true },
      getWalletContext: { success: true, context: { identityId: 'mock_id' } }
    }
  };

  // Setup fetch mock to return appropriate responses
  (global.fetch as any).mockImplementation((url: string) => {
    // Determine which service is being called based on URL
    if (url.includes('qonsent')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.qonsent.createProfile)
      });
    } else if (url.includes('qlock')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.qlock.generateKeyPair)
      });
    } else if (url.includes('qerberos')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.qerberos.logAction)
      });
    } else if (url.includes('qindex')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.qindex.registerIdentity)
      });
    } else if (url.includes('qwallet')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.qwallet.createWalletContext)
      });
    }
    
    // Default response
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });
}

// Export test utilities
export const testUtils = {
  // Mock data generators
  generateMockDID: () => `did:key:mock_${Math.random().toString(36).substr(2, 9)}`,
  generateMockTimestamp: () => new Date().toISOString(),
  generateMockHash: () => `hash_${Math.random().toString(36).substr(2, 16)}`,
  
  // Test helpers
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock service responses
  mockServiceSuccess: (service: string, method: string, response: any) => {
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response)
      })
    );
  },
  
  mockServiceFailure: (service: string, method: string, error: string) => {
    (global.fetch as any).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error })
      })
    );
  },
  
  // Storage helpers
  clearAllStorage: () => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  },
  
  setStorageItem: (key: string, value: string, storage: 'local' | 'session' = 'local') => {
    if (storage === 'local') {
      localStorageMock.setItem(key, value);
    } else {
      sessionStorageMock.setItem(key, value);
    }
  },
  
  getStorageItem: (key: string, storage: 'local' | 'session' = 'local') => {
    if (storage === 'local') {
      return localStorageMock.getItem(key);
    } else {
      return sessionStorageMock.getItem(key);
    }
  }
};

// Performance monitoring utilities
export const performanceUtils = {
  startTimer: () => {
    const start = performance.now();
    return () => performance.now() - start;
  },
  
  measureMemory: () => {
    if (process.memoryUsage) {
      return process.memoryUsage();
    }
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
  },
  
  logPerformance: (operation: string, duration: number, memory?: any) => {
    console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms${memory ? `, Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB` : ''}`);
  }
};

// Export for use in tests
export { localStorageMock, sessionStorageMock, indexedDBMock };