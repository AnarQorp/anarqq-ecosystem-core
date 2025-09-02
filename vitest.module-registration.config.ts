/**
 * Vitest Configuration for Module Registration Tests
 * Specialized configuration for comprehensive module registration testing
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test files
    include: [
      'src/__tests__/module-registration/**/*.test.{ts,tsx}',
      'src/__tests__/utils/qwallet-test-utils.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts'
    ],
    
    // Global test configuration
    globals: true,
    
    // Test timeouts
    testTimeout: 30000, // 30 seconds for most tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Retry configuration
    retry: 2, // Retry failed tests up to 2 times
    
    // Concurrent execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // Output directories
    outputFile: {
      json: './test-results/module-registration/results.json',
      html: './test-results/module-registration/results.html'
    },
    
    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      
      // Coverage reporters
      reporter: [
        'text',
        'text-summary',
        'html',
        'lcov',
        'json',
        'json-summary'
      ],
      
      // Coverage directories
      reportsDirectory: './coverage/module-registration',
      
      // Coverage thresholds
      thresholds: {
        global: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85
        },
        // Specific thresholds for critical files
        'src/services/ModuleRegistrationService.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'src/services/QModuleMetadataGenerator.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        },
        'src/services/ModuleVerificationService.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        }
      },
      
      // Files to include in coverage
      include: [
        'src/services/ModuleRegistrationService.ts',
        'src/services/QModuleMetadataGenerator.ts',
        'src/services/ModuleVerificationService.ts',
        'src/services/ModuleRegistry.ts',
        'src/services/ModuleSecurityValidationService.ts',
        'src/services/ModuleDocumentationService.ts',
        'src/services/ModuleDependencyManager.ts',
        'src/services/ModuleRegistrationErrorRecovery.ts',
        'src/services/ModuleRegistrationPerformanceOptimizer.ts',
        'src/types/qwallet-module-registration.ts'
      ],
      
      // Files to exclude from coverage
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.d.ts',
        'dist/**',
        'coverage/**'
      ]
    },
    
    // Setup files
    setupFiles: [
      './src/__tests__/setup/module-registration-setup.ts'
    ],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Watch configuration
    watch: false, // Disabled for CI/CD
    
    // Pool options for performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/__tests__'),
      '@utils': path.resolve(__dirname, './src/__tests__/utils')
    }
  },
  
  // Define configuration
  define: {
    __TEST_ENV__: true,
    __MODULE_REGISTRATION_TESTS__: true
  },
  
  // ESBuild configuration
  esbuild: {
    target: 'node16'
  }
});