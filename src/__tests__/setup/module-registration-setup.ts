/**
 * Module Registration Test Setup
 * Global setup and configuration for module registration tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Global test environment setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  process.env.MODULE_REGISTRATION_TEST = 'true';
  
  // Mock console methods to reduce noise in tests
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // Only show errors in test output
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = originalConsoleError;
  
  // Store original methods for restoration
  (global as any).__originalConsole = {
    log: originalConsoleLog,
    warn: originalConsoleWarn,
    error: originalConsoleError
  };
  
  // Setup global test utilities
  (global as any).__testUtils = {
    startTime: Date.now(),
    testCount: 0,
    failedTests: []
  };
  
  console.error('🧪 Module Registration Test Suite Initialized');
});

// Global test environment cleanup
afterAll(async () => {
  // Restore console methods
  if ((global as any).__originalConsole) {
    console.log = (global as any).__originalConsole.log;
    console.warn = (global as any).__originalConsole.warn;
    console.error = (global as any).__originalConsole.error;
  }
  
  // Print test summary
  const testUtils = (global as any).__testUtils;
  if (testUtils) {
    const duration = Date.now() - testUtils.startTime;
    console.error(`\n📊 Test Suite Summary:`);
    console.error(`   Duration: ${duration}ms`);
    console.error(`   Tests: ${testUtils.testCount}`);
    console.error(`   Failed: ${testUtils.failedTests.length}`);
    
    if (testUtils.failedTests.length > 0) {
      console.error(`   Failed Tests: ${testUtils.failedTests.join(', ')}`);
    }
  }
  
  console.error('🏁 Module Registration Test Suite Completed');
});

// Setup before each test
beforeEach(async () => {
  // Increment test counter
  if ((global as any).__testUtils) {
    (global as any).__testUtils.testCount++;
  }
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Reset modules to ensure clean state
  vi.resetModules();
  
  // Setup test-specific environment
  process.env.TEST_START_TIME = Date.now().toString();
  
  // Mock crypto if not available (for Node.js environments without Web Crypto API)
  if (!global.crypto) {
    const { webcrypto } = await import('crypto');
    global.crypto = webcrypto as any;
  }
  
  // Mock fetch if not available
  if (!global.fetch) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(''),
      status: 200,
      statusText: 'OK'
    } as any);
  }
});

// Cleanup after each test
afterEach(async () => {
  // Clear all timers
  vi.clearAllTimers();
  
  // Restore all mocks
  vi.restoreAllMocks();
  
  // Clean up test environment
  delete process.env.TEST_START_TIME;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Clear any test-specific globals
  const testGlobals = Object.keys(global).filter(key => key.startsWith('__test'));
  testGlobals.forEach(key => {
    if (key !== '__testUtils' && key !== '__originalConsole') {
      delete (global as any)[key];
    }
  });
});

// Mock external dependencies that are commonly used
vi.mock('../../backend/ecosystem/QindexService.mjs', () => ({
  getQindexService: vi.fn(() => ({
    registerModule: vi.fn().mockResolvedValue({
      success: true,
      cid: 'mock-cid',
      indexId: 'mock-index',
      timestamp: new Date().toISOString()
    }),
    getModule: vi.fn().mockResolvedValue(null),
    searchModules: vi.fn().mockResolvedValue({
      modules: [],
      totalCount: 0,
      hasMore: false
    }),
    updateModuleMetadata: vi.fn().mockResolvedValue(true),
    deregisterModule: vi.fn().mockResolvedValue(true),
    verifyModule: vi.fn().mockResolvedValue({
      moduleId: 'test',
      status: 'production_ready',
      verificationChecks: {
        metadataValid: true,
        signatureValid: true,
        dependenciesResolved: true,
        complianceVerified: true,
        auditPassed: true
      },
      issues: [],
      lastVerified: new Date().toISOString(),
      verifiedBy: 'system'
    })
  }))
}));

vi.mock('../../backend/ecosystem/QerberosService.mjs', () => ({
  getQerberosService: vi.fn(() => ({
    logEvent: vi.fn().mockResolvedValue({
      success: true,
      eventId: 'mock-event-id',
      timestamp: new Date().toISOString()
    }),
    getAuditLog: vi.fn().mockResolvedValue({
      events: [],
      totalCount: 0
    })
  }))
}));

// Mock identity services
vi.mock('../../services/identity/IdentityQlockService', () => ({
  identityQlockService: {
    signMetadata: vi.fn().mockResolvedValue({
      metadata: {},
      signature: 'mock-signature',
      publicKey: 'mock-public-key',
      signature_type: 'RSA-SHA256',
      signed_at: Date.now(),
      signer_identity: 'did:root:mock'
    }),
    verifyMetadataSignature: vi.fn().mockResolvedValue({
      valid: true,
      signatureValid: true,
      identityVerified: true,
      timestampValid: true
    })
  }
}));

// Mock performance optimizer
vi.mock('../../services/ModuleRegistrationPerformanceOptimizer', () => ({
  moduleRegistrationPerformanceOptimizer: {
    getCachedSignatureVerification: vi.fn().mockReturnValue(null),
    cacheSignatureVerification: vi.fn(),
    optimizeRegistrationBatch: vi.fn().mockImplementation((requests) => requests),
    getPerformanceMetrics: vi.fn().mockReturnValue({
      averageRegistrationTime: 100,
      cacheHitRate: 0.8,
      totalOperations: 10
    })
  }
}));

// Mock security validation service
vi.mock('../../services/ModuleSecurityValidationService', () => ({
  moduleSecurityValidationService: {
    validateRegistrationRequest: vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: []
    }),
    isIdentityAuthorized: vi.fn().mockResolvedValue(true),
    sanitizeMetadata: vi.fn().mockImplementation((metadata) => metadata),
    validateSignedMetadata: vi.fn().mockResolvedValue({
      valid: true,
      error: null
    })
  }
}));

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Track failed tests
  if ((global as any).__testUtils) {
    (global as any).__testUtils.failedTests.push(`Unhandled Rejection: ${reason}`);
  }
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Track failed tests
  if ((global as any).__testUtils) {
    (global as any).__testUtils.failedTests.push(`Uncaught Exception: ${error.message}`);
  }
});

// Export test utilities for use in tests
export const testUtils = {
  // Helper to create test timeout
  createTimeout: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to wait for condition
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },
  
  // Helper to measure execution time
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  
  // Helper to create mock promises
  createMockPromise: <T>(value: T, delay = 0) => {
    return new Promise<T>(resolve => setTimeout(() => resolve(value), delay));
  },
  
  // Helper to create failing mock promises
  createFailingMockPromise: (error: Error, delay = 0) => {
    return new Promise((_, reject) => setTimeout(() => reject(error), delay));
  }
};

// Make test utilities available globally
(global as any).testUtils = testUtils;