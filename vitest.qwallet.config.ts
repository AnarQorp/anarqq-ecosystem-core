import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: [
      // Component tests
      'src/components/qwallet/__tests__/**/*.test.{ts,tsx}',
      // Hook tests
      'src/hooks/__tests__/useIdentityQwallet.test.ts',
      'src/hooks/__tests__/useQwalletPlugins.test.ts',
      'src/hooks/__tests__/useQwalletState.test.ts',
      'src/hooks/__tests__/useWalletAudit.test.ts',
      'src/hooks/__tests__/useWalletErrorHandler.test.ts',
      'src/hooks/__tests__/useEmergencyControls.test.ts',
      'src/hooks/__tests__/usePiWallet.test.ts',
      'src/hooks/__tests__/useSandboxWallet.test.ts',
      'src/hooks/__tests__/useQonsentWallet.test.ts',
      'src/hooks/__tests__/useQlockWallet.test.ts',
      // Integration tests
      'src/__tests__/integration/qwallet-identity-switching.test.ts',
      'src/__tests__/integration/identity-ecosystem-integration.test.ts',
      // E2E tests
      'src/__tests__/e2e/qwallet-end-to-end.test.tsx',
      // Performance tests
      'src/__tests__/performance/qwallet-performance.test.ts',
      'src/__tests__/performance/identity-load-testing.test.ts',
      // Security tests
      'src/__tests__/security/qwallet-security-permissions.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage/qwallet',
      include: [
        'src/components/qwallet/**/*.{ts,tsx}',
        'src/hooks/useIdentityQwallet.ts',
        'src/hooks/useQwalletPlugins.ts',
        'src/hooks/useQwalletState.ts',
        'src/hooks/useWalletAudit.ts',
        'src/hooks/useWalletErrorHandler.ts',
        'src/hooks/useEmergencyControls.ts',
        'src/hooks/usePiWallet.ts',
        'src/hooks/useSandboxWallet.ts',
        'src/hooks/useQonsentWallet.ts',
        'src/hooks/useQlockWallet.ts',
        'src/services/QwalletPluginManager.ts',
        'src/services/IdentityManager.ts',
        'src/services/QonsentWalletService.ts',
        'src/api/qwallet.ts'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test-setup.ts',
        'src/**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Higher thresholds for critical components
        'src/components/qwallet/TokenTransferForm.tsx': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/hooks/useIdentityQwallet.ts': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/api/qwallet.ts': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    // Performance testing configuration
    benchmark: {
      include: ['src/__tests__/performance/**/*.bench.{ts,tsx}'],
      exclude: ['node_modules/**']
    },
    // Retry configuration for flaky tests
    retry: 2,
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    outputFile: {
      json: './test-results/qwallet-results.json',
      html: './test-results/qwallet-report.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Mock configuration
  define: {
    'import.meta.vitest': undefined,
  },
});