import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'qflow-chaos-tests',
    environment: 'node',
    testTimeout: 600000, // 10 minutes for chaos tests
    hookTimeout: 120000, // 2 minutes for setup/teardown
    teardownTimeout: 120000,
    globals: true,
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/ChaosTestSuite.ts'
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
        '**/run-chaos-tests.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    outputFile: {
      json: '../../reports/chaos/vitest-results.json',
      html: '../../reports/chaos/vitest-results.html'
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Chaos tests should run in isolation
      }
    },
    sequence: {
      concurrent: false // Chaos tests should not run concurrently
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
      '@chaos': resolve(__dirname, './')
    }
  },
  define: {
    __TEST_ENV__: '"chaos"',
    __CHAOS_TEST_MODE__: 'true'
  },
  esbuild: {
    target: 'node18'
  }
});