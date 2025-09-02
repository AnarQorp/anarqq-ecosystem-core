import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'qflow-security-tests',
    environment: 'node',
    testTimeout: 300000, // 5 minutes for security tests
    hookTimeout: 60000,  // 1 minute for setup/teardown
    teardownTimeout: 60000,
    globals: true,
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/SecurityTestSuite.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/reports/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'reports/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/run-security-tests.ts'
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
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    outputFile: {
      json: '../../reports/security/vitest-results.json',
      html: '../../reports/security/vitest-results.html'
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Security tests should run in isolation
      }
    },
    sequence: {
      concurrent: false // Security tests should not run concurrently
    },
    isolate: true,
    fileParallelism: false,
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../'),
      '@security': resolve(__dirname, './')
    }
  },
  define: {
    __TEST_ENV__: '"security"',
    __SECURITY_TEST_MODE__: 'true'
  },
  esbuild: {
    target: 'node18'
  }
});