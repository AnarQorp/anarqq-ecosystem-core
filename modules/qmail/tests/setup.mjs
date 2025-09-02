/**
 * Test Setup
 * Global test configuration and setup
 */

import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Global test utilities
global.testUtils = {
  createMockIdentity: (squidId = 'test_squid_123') => ({
    squidId,
    verified: true,
    reputation: 0.85,
    subidentities: [],
    daoMemberships: []
  }),

  createMockMessage: (overrides = {}) => ({
    messageId: 'msg_test_123',
    senderId: 'squid_alice_123',
    recipientId: 'squid_bob_456',
    subject: 'Test Message',
    content: 'Test message content',
    encryptionLevel: 'STANDARD',
    priority: 'NORMAL',
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.QMAIL_MODE = 'standalone';
process.env.QMAIL_ENCRYPTION_LEVEL = 'STANDARD';

console.log('[Test Setup] Test environment initialized');