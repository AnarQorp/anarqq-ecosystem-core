/**
 * Test Setup for Contract Testing Library
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';

beforeAll(() => {
  console.log('🧪 Setting up contract testing environment...');
});

afterAll(() => {
  console.log('🧹 Cleaning up contract testing environment...');
});

// Global test utilities
(global as any).testTimeout = 30000;