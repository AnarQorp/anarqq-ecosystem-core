/**
 * Test Setup for Qchat Module
 * Configures test environment and mock services
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mockServices } from '../src/mocks/services.mjs';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.QCHAT_MODE = 'standalone';
process.env.QCHAT_PORT = '3001';
process.env.QCHAT_JWT_SECRET = 'test-jwt-secret';
process.env.QCHAT_ENCRYPTION_KEY = 'test-encryption-key';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up Qchat test environment...');
  
  // Initialize mock services
  await initializeMockServices();
  
  // Set up test database/storage
  await setupTestStorage();
  
  console.log('✅ Test environment ready');
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test data
  await cleanupTestData();
  
  console.log('✅ Test cleanup complete');
});

// Test case setup
beforeEach(async () => {
  // Reset mock services state
  await resetMockServices();
});

// Test case teardown
afterEach(async () => {
  // Clean up any test-specific data
  await cleanupTestCase();
});

/**
 * Initialize mock services for testing
 */
async function initializeMockServices() {
  // Mock services are already initialized in the import
  // Add any test-specific initialization here
  
  // Add test users
  await mockServices.squid.verifyIdentity('squid_test_user', 'test-token');
  
  // Set up test permissions
  await mockServices.qonsent.grantPermission('squid_test_user', 'qchat', 'room:create');
  await mockServices.qonsent.grantPermission('squid_test_user', 'qchat', 'message:send');
  
  console.log('Mock services initialized for testing');
}

/**
 * Set up test storage
 */
async function setupTestStorage() {
  // In a real implementation, this would set up test database
  // For now, we're using in-memory storage which is already set up
  console.log('Test storage configured');
}

/**
 * Reset mock services to clean state
 */
async function resetMockServices() {
  // Reset any stateful mock data that might affect tests
  // This ensures test isolation
  
  // Clear any test-specific data while keeping base mock data
  // Implementation depends on specific mock service needs
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Clean up any persistent test data
  // In memory storage will be garbage collected automatically
  console.log('Test data cleaned up');
}

/**
 * Clean up after each test case
 */
async function cleanupTestCase() {
  // Clean up any test case specific data
  // Reset timers, clear intervals, etc.
}

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Create a mock user for testing
   */
  createMockUser(overrides = {}) {
    return {
      squidId: 'squid_test_user',
      subId: 'sub_test',
      daoId: 'dao_test',
      identity: {
        squidId: 'squid_test_user',
        displayName: 'Test User',
        reputation: 0.75,
        daoMemberships: ['dao_test'],
        subIdentities: ['sub_test']
      },
      token: 'test-jwt-token',
      ...overrides
    };
  },

  /**
   * Create a mock room for testing
   */
  createMockRoom(overrides = {}) {
    return {
      roomId: 'qchat_room_test_123',
      name: 'Test Room',
      description: 'A test chat room',
      type: 'PUBLIC',
      createdAt: new Date().toISOString(),
      createdBy: 'squid_test_user',
      memberCount: 1,
      maxMembers: 100,
      encryptionLevel: 'STANDARD',
      moderationLevel: 'BASIC',
      tags: ['test'],
      ephemeral: false,
      messageRetention: 365,
      ...overrides
    };
  },

  /**
   * Create a mock message for testing
   */
  createMockMessage(overrides = {}) {
    return {
      messageId: 'qchat_msg_test_123',
      roomId: 'qchat_room_test_123',
      senderId: 'squid_test_user',
      content: 'Test message content',
      messageType: 'TEXT',
      timestamp: new Date().toISOString(),
      replyTo: null,
      mentions: [],
      attachments: [],
      reactions: {},
      deliveryStatus: 'SENT',
      encryptionLevel: 'STANDARD',
      ephemeral: false,
      deleted: false,
      ...overrides
    };
  },

  /**
   * Create a mock moderation action for testing
   */
  createMockModerationAction(overrides = {}) {
    return {
      actionId: 'qchat_mod_test_123',
      roomId: 'qchat_room_test_123',
      moderatorId: 'squid_admin_123',
      targetId: 'squid_test_user',
      targetType: 'USER',
      action: 'WARN',
      reason: 'Test moderation action',
      severity: 'MEDIUM',
      timestamp: new Date().toISOString(),
      automated: false,
      appealable: true,
      ...overrides
    };
  },

  /**
   * Wait for a specified amount of time
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Generate a random string for testing
   */
  randomString(length = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Generate a mock JWT token
   */
  generateMockJWT(payload = {}) {
    const defaultPayload = {
      squidId: 'squid_test_user',
      subId: 'sub_test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };
    
    // In a real implementation, this would be a proper JWT
    // For testing, we'll just return a mock token
    return `mock.jwt.token.${Buffer.from(JSON.stringify({ ...defaultPayload, ...payload })).toString('base64')}`;
  },

  /**
   * Mock HTTP request object
   */
  createMockRequest(overrides = {}) {
    return {
      id: 'test-request-id',
      method: 'GET',
      path: '/test',
      headers: {},
      body: {},
      query: {},
      params: {},
      user: this.createMockUser(),
      ip: '127.0.0.1',
      get: (header) => overrides.headers?.[header.toLowerCase()],
      ...overrides
    };
  },

  /**
   * Mock HTTP response object
   */
  createMockResponse() {
    const response = {
      statusCode: 200,
      headers: {},
      body: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      },
      setHeader: function(name, value) {
        this.headers[name] = value;
        return this;
      },
      send: function(data) {
        this.body = data;
        return this;
      }
    };
    
    return response;
  },

  /**
   * Mock WebSocket object
   */
  createMockSocket(overrides = {}) {
    const events = new Map();
    
    return {
      id: 'test-socket-id',
      user: this.createMockUser(),
      rooms: new Set(),
      presence: {
        status: 'online',
        lastActivity: Date.now(),
        currentRoom: null,
        typing: false
      },
      emit: function(event, data) {
        console.log(`Socket emit: ${event}`, data);
      },
      on: function(event, handler) {
        if (!events.has(event)) {
          events.set(event, []);
        }
        events.get(event).push(handler);
      },
      join: function(room) {
        this.rooms.add(room);
      },
      leave: function(room) {
        this.rooms.delete(room);
      },
      to: function(room) {
        return {
          emit: (event, data) => {
            console.log(`Socket broadcast to ${room}: ${event}`, data);
          }
        };
      },
      disconnect: function() {
        console.log('Socket disconnected');
      },
      // Trigger event for testing
      trigger: function(event, data) {
        const handlers = events.get(event) || [];
        handlers.forEach(handler => handler(data));
      },
      ...overrides
    };
  }
};

// Export mock services for use in tests
export { mockServices };

// Make test utilities available globally
global.testUtils = testUtils;
global.mockServices = mockServices;