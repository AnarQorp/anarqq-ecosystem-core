import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // E2E test specific configuration
    name: 'e2e',
    environment: 'node',
    globals: true,
    
    // Timeouts for E2E tests (longer than unit tests)
    testTimeout: 300000, // 5 minutes default
    hookTimeout: 60000,  // 1 minute for setup/teardown
    
    // Test file patterns
    include: [
      'backend/tests/e2e-*.test.mjs',
      'backend/tests/**/e2e-*.test.mjs'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts'
    ],
    
    // Sequential execution for E2E tests to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Run tests sequentially
      }
    },
    
    // Retry configuration for flaky E2E tests
    retry: 2,
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // Output configuration
    outputFile: {
      json: './test-results/e2e-results.json',
      html: './test-results/e2e-results.html'
    },
    
    // Coverage configuration (optional for E2E)
    coverage: {
      enabled: false, // E2E tests typically don't need coverage
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-results/coverage-e2e'
    },
    
    // Setup files
    setupFiles: [
      './backend/tests/setup/e2e-setup.mjs'
    ],
    
    // Global setup and teardown
    globalSetup: './backend/tests/setup/e2e-global-setup.mjs',
    globalTeardown: './backend/tests/setup/e2e-global-teardown.mjs',
    
    // Environment variables
    env: {
      NODE_ENV: 'test',
      E2E_TEST_MODE: 'true',
      VITEST_POOL_ID: '1'
    },
    
    // Test isolation
    isolate: true,
    
    // Disable file watching for E2E tests
    watch: false,
    
    // Bail on first failure for CI environments
    bail: process.env.CI ? 1 : 0,
    
    // Logging configuration
    logHeapUsage: true,
    
    // Custom test name pattern
    testNamePattern: process.env.E2E_TEST_PATTERN,
    
    // Benchmark configuration (if needed)
    benchmark: {
      include: ['**/*.bench.mjs'],
      exclude: ['node_modules/**']
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, './backend'),
      '@tests': path.resolve(__dirname, './backend/tests')
    }
  },
  
  // Define configuration for different environments
  define: {
    __E2E_TEST__: true,
    __TEST_TIMEOUT__: 300000
  }
});