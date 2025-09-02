/**
 * Test Setup
 * Global test configuration and setup
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SQUID_MOCK_MODE = 'true';
process.env.SQUID_PORT = '0';

// Global test setup
beforeAll(() => {
  console.log('Setting up sQuid tests...');
});

// Global test cleanup
afterAll(() => {
  console.log('Cleaning up sQuid tests...');
});