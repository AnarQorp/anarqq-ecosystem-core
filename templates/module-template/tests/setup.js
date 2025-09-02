/**
 * Test Setup
 * 
 * Global test configuration and setup
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MOCK_SERVICES = 'all';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});

// Per-test setup
beforeEach(async () => {
  // Reset any global state if needed
});

afterEach(async () => {
  // Cleanup after each test
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, just log
});

// Increase timeout for integration tests
const originalTimeout = setTimeout;
global.setTimeout = (fn, delay) => {
  return originalTimeout(fn, Math.min(delay, 30000)); // Max 30 seconds
};