/**
 * E2E Global Setup
 * 
 * Global setup that runs once before all E2E tests.
 * Initializes test infrastructure, services, and environment.
 */

import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

export default async function globalSetup() {
  const setupStartTime = performance.now();
  
  console.log('🌍 Starting E2E Global Setup...');
  
  try {
    // Create test results directory
    await createTestDirectories();
    
    // Initialize test environment
    await initializeTestEnvironment();
    
    // Setup test infrastructure
    await setupTestInfrastructure();
    
    // Validate test prerequisites
    await validateTestPrerequisites();
    
    // Initialize test data
    await initializeTestData();
    
    const setupDuration = performance.now() - setupStartTime;
    console.log(`✅ E2E Global Setup completed in ${setupDuration.toFixed(2)}ms`);
    
    // Store setup information for tests
    global.__E2E_SETUP_INFO__ = {
      setupTime: setupDuration,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    };
    
  } catch (error) {
    console.error('❌ E2E Global Setup failed:', error);
    throw error;
  }
}

async function createTestDirectories() {
  console.log('📁 Creating test directories...');
  
  const directories = [
    'test-results',
    'test-results/e2e',
    'test-results/coverage-e2e',
    'test-results/reports',
    'test-results/artifacts',
    'test-results/logs'
  ];
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`   ✅ Created: ${dir}`);
  }
}

async function initializeTestEnvironment() {
  console.log('🔧 Initializing test environment...');
  
  // Set environment variables
  const testEnvVars = {
    NODE_ENV: 'test',
    E2E_TEST_MODE: 'true',
    VITEST_ENVIRONMENT: 'e2e',
    TEST_TIMEOUT: '300000',
    LOG_LEVEL: process.env.E2E_LOG_LEVEL || 'info',
    SANDBOX_MODE: 'true',
    MOCK_EXTERNAL_SERVICES: 'true'
  };
  
  Object.entries(testEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
    console.log(`   ✅ Set ${key}=${value}`);
  });
  
  // Configure test timeouts
  if (typeof jest !== 'undefined') {
    jest.setTimeout(300000); // 5 minutes
  }
}

async function setupTestInfrastructure() {
  console.log('🏗️ Setting up test infrastructure...');
  
  // Initialize mock services
  await initializeMockServices();
  
  // Setup test databases/storage
  await setupTestStorage();
  
  // Initialize event bus for testing
  await initializeTestEventBus();
  
  // Setup observability for tests
  await setupTestObservability();
}

async function initializeMockServices() {
  console.log('🎭 Initializing mock services...');
  
  // Mock service registry
  global.__E2E_MOCK_SERVICES__ = {
    squid: {
      initialized: true,
      baseUrl: 'http://localhost:3001',
      status: 'ready'
    },
    qwallet: {
      initialized: true,
      baseUrl: 'http://localhost:3002',
      status: 'ready',
      sandboxMode: true
    },
    qlock: {
      initialized: true,
      baseUrl: 'http://localhost:3003',
      status: 'ready'
    },
    qonsent: {
      initialized: true,
      baseUrl: 'http://localhost:3004',
      status: 'ready'
    },
    qindex: {
      initialized: true,
      baseUrl: 'http://localhost:3005',
      status: 'ready'
    },
    qdrive: {
      initialized: true,
      baseUrl: 'http://localhost:3006',
      status: 'ready',
      storageMode: 'memory'
    },
    qmarket: {
      initialized: true,
      baseUrl: 'http://localhost:3007',
      status: 'ready'
    },
    qerberos: {
      initialized: true,
      baseUrl: 'http://localhost:3008',
      status: 'ready'
    },
    qmask: {
      initialized: true,
      baseUrl: 'http://localhost:3009',
      status: 'ready'
    }
  };
  
  console.log('   ✅ Mock services registry created');
}

async function setupTestStorage() {
  console.log('💾 Setting up test storage...');
  
  // Initialize in-memory storage for tests
  global.__E2E_TEST_STORAGE__ = {
    files: new Map(),
    metadata: new Map(),
    indices: new Map(),
    transactions: new Map(),
    auditLogs: [],
    events: []
  };
  
  console.log('   ✅ Test storage initialized');
}

async function initializeTestEventBus() {
  console.log('📡 Initializing test event bus...');
  
  // Simple in-memory event bus for testing
  global.__E2E_EVENT_BUS__ = {
    subscribers: new Map(),
    events: [],
    
    subscribe: (topic, handler) => {
      if (!global.__E2E_EVENT_BUS__.subscribers.has(topic)) {
        global.__E2E_EVENT_BUS__.subscribers.set(topic, []);
      }
      global.__E2E_EVENT_BUS__.subscribers.get(topic).push(handler);
    },
    
    publish: async (topic, data) => {
      const event = {
        topic,
        data,
        timestamp: new Date().toISOString(),
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
      
      global.__E2E_EVENT_BUS__.events.push(event);
      
      const handlers = global.__E2E_EVENT_BUS__.subscribers.get(topic) || [];
      const wildcardHandlers = global.__E2E_EVENT_BUS__.subscribers.get('*') || [];
      
      for (const handler of [...handlers, ...wildcardHandlers]) {
        try {
          await handler(event);
        } catch (error) {
          console.warn(`Event handler error for ${topic}:`, error.message);
        }
      }
    },
    
    getEvents: (topic) => {
      if (topic) {
        return global.__E2E_EVENT_BUS__.events.filter(e => e.topic === topic);
      }
      return global.__E2E_EVENT_BUS__.events;
    },
    
    clear: () => {
      global.__E2E_EVENT_BUS__.events = [];
    }
  };
  
  console.log('   ✅ Test event bus initialized');
}

async function setupTestObservability() {
  console.log('📊 Setting up test observability...');
  
  // Initialize test metrics collection
  global.__E2E_METRICS__ = {
    counters: new Map(),
    gauges: new Map(),
    histograms: new Map(),
    timers: new Map(),
    
    increment: (name, value = 1, tags = {}) => {
      const key = `${name}:${JSON.stringify(tags)}`;
      const current = global.__E2E_METRICS__.counters.get(key) || 0;
      global.__E2E_METRICS__.counters.set(key, current + value);
    },
    
    gauge: (name, value, tags = {}) => {
      const key = `${name}:${JSON.stringify(tags)}`;
      global.__E2E_METRICS__.gauges.set(key, value);
    },
    
    timing: (name, duration, tags = {}) => {
      const key = `${name}:${JSON.stringify(tags)}`;
      if (!global.__E2E_METRICS__.histograms.has(key)) {
        global.__E2E_METRICS__.histograms.set(key, []);
      }
      global.__E2E_METRICS__.histograms.get(key).push(duration);
    },
    
    startTimer: (name, tags = {}) => {
      const key = `${name}:${JSON.stringify(tags)}`;
      global.__E2E_METRICS__.timers.set(key, performance.now());
      
      return () => {
        const startTime = global.__E2E_METRICS__.timers.get(key);
        if (startTime) {
          const duration = performance.now() - startTime;
          global.__E2E_METRICS__.timing(name, duration, tags);
          global.__E2E_METRICS__.timers.delete(key);
          return duration;
        }
        return 0;
      };
    },
    
    getMetrics: () => {
      return {
        counters: Object.fromEntries(global.__E2E_METRICS__.counters),
        gauges: Object.fromEntries(global.__E2E_METRICS__.gauges),
        histograms: Object.fromEntries(global.__E2E_METRICS__.histograms),
        activeTimers: global.__E2E_METRICS__.timers.size
      };
    },
    
    reset: () => {
      global.__E2E_METRICS__.counters.clear();
      global.__E2E_METRICS__.gauges.clear();
      global.__E2E_METRICS__.histograms.clear();
      global.__E2E_METRICS__.timers.clear();
    }
  };
  
  console.log('   ✅ Test observability initialized');
}

async function validateTestPrerequisites() {
  console.log('✅ Validating test prerequisites...');
  
  const prerequisites = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 18;
      },
      message: 'Node.js 18+ required'
    },
    {
      name: 'Memory availability',
      check: () => {
        const totalMemory = require('os').totalmem();
        const freeMemory = require('os').freemem();
        return freeMemory > 512 * 1024 * 1024; // 512MB free
      },
      message: 'At least 512MB free memory required'
    },
    {
      name: 'Test directories',
      check: async () => {
        try {
          await fs.access(path.join(process.cwd(), 'test-results'));
          return true;
        } catch {
          return false;
        }
      },
      message: 'Test directories must be accessible'
    }
  ];
  
  for (const prerequisite of prerequisites) {
    try {
      const passed = await prerequisite.check();
      if (passed) {
        console.log(`   ✅ ${prerequisite.name}: OK`);
      } else {
        throw new Error(prerequisite.message);
      }
    } catch (error) {
      console.error(`   ❌ ${prerequisite.name}: ${error.message}`);
      throw new Error(`Prerequisite check failed: ${prerequisite.name}`);
    }
  }
}

async function initializeTestData() {
  console.log('📋 Initializing test data...');
  
  // Create test users
  global.__E2E_TEST_USERS__ = [
    {
      squidId: 'did:squid:test_user_alice',
      subId: 'alice_main',
      daoId: 'dao:test_dao_alpha',
      profile: {
        name: 'Alice Test User',
        email: 'alice@test.example.com',
        reputation: 85,
        balance: 100.0
      }
    },
    {
      squidId: 'did:squid:test_user_bob',
      subId: 'bob_main',
      daoId: 'dao:test_dao_beta',
      profile: {
        name: 'Bob Test User',
        email: 'bob@test.example.com',
        reputation: 92,
        balance: 150.0
      }
    },
    {
      squidId: 'did:squid:test_user_charlie',
      subId: 'charlie_main',
      profile: {
        name: 'Charlie Test User',
        email: 'charlie@test.example.com',
        reputation: 67,
        balance: 25.0
      }
    }
  ];
  
  // Create test content
  global.__E2E_TEST_CONTENT__ = [
    {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      title: 'Test Content 1',
      description: 'Sample content for E2E testing',
      size: 1024,
      contentType: 'text/plain',
      owner: 'did:squid:test_user_alice'
    },
    {
      cid: 'bafybeihkoviema7g3gxyt6la7b7kbbv2dqfx3tqjbxcpgdtqgowtqjrh4m',
      title: 'Test Content 2',
      description: 'Another sample content for testing',
      size: 2048,
      contentType: 'image/jpeg',
      owner: 'did:squid:test_user_bob'
    }
  ];
  
  console.log(`   ✅ Created ${global.__E2E_TEST_USERS__.length} test users`);
  console.log(`   ✅ Created ${global.__E2E_TEST_CONTENT__.length} test content items`);
}

// Cleanup function (called by global teardown)
global.__E2E_GLOBAL_CLEANUP__ = async () => {
  console.log('🧹 Running global cleanup...');
  
  // Clear test storage
  if (global.__E2E_TEST_STORAGE__) {
    global.__E2E_TEST_STORAGE__.files.clear();
    global.__E2E_TEST_STORAGE__.metadata.clear();
    global.__E2E_TEST_STORAGE__.indices.clear();
    global.__E2E_TEST_STORAGE__.transactions.clear();
    global.__E2E_TEST_STORAGE__.auditLogs = [];
    global.__E2E_TEST_STORAGE__.events = [];
  }
  
  // Clear event bus
  if (global.__E2E_EVENT_BUS__) {
    global.__E2E_EVENT_BUS__.clear();
    global.__E2E_EVENT_BUS__.subscribers.clear();
  }
  
  // Reset metrics
  if (global.__E2E_METRICS__) {
    global.__E2E_METRICS__.reset();
  }
  
  console.log('✅ Global cleanup completed');
};