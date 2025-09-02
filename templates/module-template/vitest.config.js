import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/mocks/',
        '**/*.test.js',
        '**/*.spec.js',
        'coverage/',
        'dist/',
        '.eslintrc.js',
        'vitest.config.js'
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
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    setupFiles: ['./tests/setup.js'],
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.git/'
    ]
  }
});