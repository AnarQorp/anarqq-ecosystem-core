/**
 * Vitest Configuration for System Testing
 * Optimized configuration for comprehensive identity system testing
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    globals: true,
    
    // Setup files
    setupFiles: [
      './src/test-setup.ts',
      './src/__tests__/utils/test-environment-setup.ts'
    ],
    
    // Timeouts for different test types
    testTimeout: 30000,      // 30 seconds for regular tests
    hookTimeout: 10000,      // 10 seconds for hooks
    teardownTimeout: 5000,   // 5 seconds for teardown
    
    // Performance and memory settings
    maxConcurrency: 5,       // Limit concurrent tests to prevent memory issues
    minThreads: 1,
    maxThreads: 4,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-setup.ts',
        '**/__tests__/**',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '.vscode/**',
      'coverage/**'
    ],
    
    // Reporters
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/test-report.html'
    },
    
    // Retry configuration
    retry: 2,
    
    // Bail on first failure for CI
    bail: process.env.CI ? 1 : 0,
    
    // Watch mode settings
    watch: false,
    
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true
      }
    },
    
    // Environment variables
    env: {
      NODE_ENV: 'test',
      VITEST_SYSTEM_TEST: 'true'
    },
    
    // Sequence configuration
    sequence: {
      concurrent: true,
      shuffle: false,
      hooks: 'parallel'
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/__tests__')
    }
  },
  
  // Define configuration
  define: {
    __TEST_ENV__: true,
    __SYSTEM_TEST__: true
  },
  
  // Esbuild configuration for better performance
  esbuild: {
    target: 'node14',
    sourcemap: true
  }
});