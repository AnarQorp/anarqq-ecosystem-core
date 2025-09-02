/**
 * E2E Test Setup
 * 
 * Setup configuration that runs before each E2E test file.
 * Configures the test environment, mocks, and utilities.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Global test configuration
global.E2E_TEST_CONFIG = {
  timeout: {
    default: 30000,
    long: 120000,
    extended: 300000
  },
  retries: {
    default: 2,
    flaky: 3
  },
  delays: {
    short: 100,
    medium: 500,
    long: 1000
  }
};

// Global test utilities
global.E2E_UTILS = {
  // Wait utility with timeout
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry utility for flaky operations
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          console.log(`Retry attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
          await global.E2E_UTILS.wait(delay * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  },
  
  // Generate unique test identifiers
  generateTestId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  
  // Performance measurement utility
  measurePerformance: (name, fn) => {
    return async (...args) => {
      const startTime = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - startTime;
        console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        console.log(`❌ ${name}: ${duration.toFixed(2)}ms (failed)`);
        throw error;
      }
    };
  },
  
  // Memory usage tracking
  trackMemoryUsage: (label) => {
    const usage = process.memoryUsage();
    console.log(`🧠 Memory Usage (${label}):`, {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
    });
    return usage;
  }
};

// Global test state management
global.E2E_STATE = {
  testStartTime: null,
  currentTest: null,
  testMetrics: [],
  cleanupTasks: []
};

// Setup hooks that run for each test file
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');
  
  global.E2E_STATE.testStartTime = performance.now();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.E2E_TEST_MODE = 'true';
  
  // Initialize test metrics collection
  global.E2E_STATE.testMetrics = [];
  
  // Track initial memory usage
  global.E2E_UTILS.trackMemoryUsage('Test Start');
  
  console.log('✅ E2E test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Execute cleanup tasks
  for (const cleanup of global.E2E_STATE.cleanupTasks) {
    try {
      await cleanup();
    } catch (error) {
      console.warn('⚠️ Cleanup task failed:', error.message);
    }
  }
  
  // Track final memory usage
  global.E2E_UTILS.trackMemoryUsage('Test End');
  
  // Calculate total test duration
  const totalDuration = performance.now() - global.E2E_STATE.testStartTime;
  console.log(`⏱️ Total test duration: ${totalDuration.toFixed(2)}ms`);
  
  // Log test metrics summary
  if (global.E2E_STATE.testMetrics.length > 0) {
    console.log('📊 Test Metrics Summary:');
    global.E2E_STATE.testMetrics.forEach(metric => {
      console.log(`   ${metric.name}: ${metric.value} (${metric.unit})`);
    });
  }
  
  console.log('✅ E2E test environment cleaned up');
});

beforeEach(async () => {
  // Reset test state for each test
  global.E2E_STATE.currentTest = {
    startTime: performance.now(),
    name: expect.getState().currentTestName || 'unknown',
    metrics: []
  };
  
  // Log test start
  console.log(`🧪 Starting test: ${global.E2E_STATE.currentTest.name}`);
});

afterEach(async () => {
  if (global.E2E_STATE.currentTest) {
    const duration = performance.now() - global.E2E_STATE.currentTest.startTime;
    
    // Log test completion
    console.log(`✅ Completed test: ${global.E2E_STATE.currentTest.name} (${duration.toFixed(2)}ms)`);
    
    // Store test metrics
    global.E2E_STATE.testMetrics.push({
      name: global.E2E_STATE.currentTest.name,
      value: duration.toFixed(2),
      unit: 'ms',
      timestamp: new Date().toISOString()
    });
    
    // Reset current test
    global.E2E_STATE.currentTest = null;
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection in E2E test:', reason);
  console.error('Promise:', promise);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception in E2E test:', error);
});

// Export utilities for use in tests
export {
  E2E_TEST_CONFIG,
  E2E_UTILS,
  E2E_STATE
};