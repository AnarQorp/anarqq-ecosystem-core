import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/docs-consolidation/**/*.test.mjs'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'scripts/ScriptGenerator.mjs',
        'scripts/ModuleDocumentationNormalizer.mjs',
        'scripts/ContentExtractionEngine.mjs',
        'scripts/docs-validator.mjs',
        'scripts/master-index-builder.mjs'
      ],
      exclude: [
        'tests/**',
        'node_modules/**'
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
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/docs-consolidation-test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scripts': path.resolve(__dirname, './scripts'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});