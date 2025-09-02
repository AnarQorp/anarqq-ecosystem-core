/**
 * Wallet Performance Monitoring Tests
 * Tests for performance monitoring, caching, and optimization features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../utils/performance/PerformanceMonitor';
import { WalletCache } from '../../utils/performance/WalletCache';
import { WALLET_PERFORMANCE_BENCHMARKS, getBenchmarkForIdentity } from '../../utils/performance/PerformanceBenchmarks';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    PerformanceMonitor.clear();
    mockPerformanceNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Metric Tracking', () => {
    it('should start and end metrics correctly', () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const id = PerformanceMonitor.startMetric('test_operation', 'WALLET_OPERATION');
      expect(id).toBeDefined();

      const metric = PerformanceMonitor.endMetric(id, true);
      expect(metric).toBeDefined();
      expect(metric?.duration).toBe(100);
      expect(metric?.success).toBe(true);
    });

    it('should track async operations', async () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(200);

      const operation = vi.fn().mockResolvedValue('result');
      const result = await PerformanceMonitor.trackOperation(
        'async_test',
        'WALLET_OPERATION',
        operation
      );

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should track sync operations', () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(50);

      const operation = vi.fn().mockReturnValue('sync_result');
      const result = PerformanceMonitor.trackSync(
        'sync_test',
        'WALLET_OPERATION',
        operation
      );

      expect(result).toBe('sync_result');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        PerformanceMonitor.trackOperation('error_test', 'WALLET_OPERATION', operation)
      ).rejects.toThrow('Test error');
    });
  });

  describe('Alert Generation', () => {
    it('should generate warning alerts for slow operations', () => {
      // Mock slow operation (1500ms vs 1000ms warning threshold)
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(1500);

      const id = PerformanceMonitor.startMetric('wallet_balance_load', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id, true);

      const alerts = PerformanceMonitor.getRecentAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should generate critical alerts for very slow operations', () => {
      // Mock very slow operation (3500ms vs 3000ms critical threshold)
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(3500);

      const id = PerformanceMonitor.startMetric('wallet_balance_load', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id, true);

      const alerts = PerformanceMonitor.getRecentAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should call alert callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = PerformanceMonitor.onAlert(callback);

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(3500);

      const id = PerformanceMonitor.startMetric('wallet_balance_load', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id, true);

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('Performance Reports', () => {
    it('should generate comprehensive reports', () => {
      // Add some test metrics
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(100)  // Fast operation
        .mockReturnValueOnce(100).mockReturnValueOnce(600) // Medium operation
        .mockReturnValueOnce(600).mockReturnValueOnce(1100); // Slow operation

      const id1 = PerformanceMonitor.startMetric('fast_op', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id1, true);

      const id2 = PerformanceMonitor.startMetric('medium_op', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id2, true);

      const id3 = PerformanceMonitor.startMetric('slow_op', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id3, false, 'Test error');

      // Generate report with a wide date range to include all metrics
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const report = PerformanceMonitor.getReport(oneHourAgo, now);

      expect(report.summary.totalMetrics).toBe(3);
      expect(report.summary.errorRate).toBeCloseTo(1/3);
      expect(report.categoryBreakdown['WALLET_OPERATION']).toBeDefined();
      expect(report.categoryBreakdown['WALLET_OPERATION'].count).toBe(3);
    });

    it('should filter reports by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const id = PerformanceMonitor.startMetric('test_op', 'WALLET_OPERATION');
      PerformanceMonitor.endMetric(id, true);

      const report = PerformanceMonitor.getReport(oneHourAgo, now);
      expect(report.summary.totalMetrics).toBe(1);
    });
  });
});

describe('WalletCache', () => {
  beforeEach(() => {
    WalletCache.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', () => {
      const testData = { balance: 100, token: 'ETH' };
      WalletCache.set('test_key', testData);

      const retrieved = WalletCache.get('test_key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = WalletCache.get('non_existent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      const testData = { value: 'test' };
      WalletCache.set('ttl_test', testData, 100); // 100ms TTL

      expect(WalletCache.get('ttl_test')).toEqual(testData);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(WalletCache.get('ttl_test')).toBeNull();
    });
  });

  describe('Identity-Specific Caching', () => {
    it('should cache and retrieve balances for identity', () => {
      const identityId = 'test_identity';
      const balances = {
        identityId,
        walletAddress: '0x123',
        balances: [{ token: 'ETH', balance: 100, decimals: 18, symbol: 'ETH', valueUSD: 200 }],
        totalValueUSD: 200,
        lastUpdated: new Date().toISOString()
      };

      WalletCache.setBalances(identityId, balances);
      const retrieved = WalletCache.getBalances(identityId);

      expect(retrieved).toEqual(balances);
    });

    it('should cache and retrieve permissions for identity', () => {
      const identityId = 'test_identity';
      const permissions = {
        canTransfer: true,
        canReceive: true,
        canMintNFT: false,
        canSignTransactions: true,
        canAccessDeFi: false,
        canCreateDAO: false,
        maxTransactionAmount: 1000,
        allowedTokens: ['ETH'],
        restrictedOperations: [],
        governanceLevel: 'LIMITED' as const,
        requiresApproval: false,
        approvalThreshold: 500
      };

      WalletCache.setPermissions(identityId, permissions);
      const retrieved = WalletCache.getPermissions(identityId);

      expect(retrieved).toEqual(permissions);
    });

    it('should invalidate cache by identity', () => {
      const identityId = 'test_identity';
      const balances = {
        identityId,
        walletAddress: '0x123',
        balances: [],
        totalValueUSD: 0,
        lastUpdated: new Date().toISOString()
      };

      WalletCache.setBalances(identityId, balances);
      expect(WalletCache.getBalances(identityId)).toEqual(balances);

      const invalidated = WalletCache.invalidateIdentity(identityId);
      expect(invalidated).toBe(1);
      expect(WalletCache.getBalances(identityId)).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      WalletCache.set('key1', { data: 'test1' });
      WalletCache.set('key2', { data: 'test2' });

      // Access key1 to increase hit count
      WalletCache.get('key1');
      WalletCache.get('key1');

      // Try to access non-existent key to increase miss count
      WalletCache.get('non_existent');

      const stats = WalletCache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });

    it('should report cache health', () => {
      WalletCache.set('key1', { data: 'test' });
      WalletCache.get('key1'); // Generate a hit

      const isHealthy = WalletCache.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('API Response Caching', () => {
    it('should cache API responses', () => {
      const endpoint = '/api/wallet/balance';
      const params = { identityId: 'test' };
      const response = { balance: 100 };

      WalletCache.setApiResponse(endpoint, params, response);
      const retrieved = WalletCache.getApiResponse(endpoint, params);

      expect(retrieved).toEqual(response);
    });

    it('should differentiate API responses by parameters', () => {
      const endpoint = '/api/wallet/balance';
      const params1 = { identityId: 'test1' };
      const params2 = { identityId: 'test2' };
      const response1 = { balance: 100 };
      const response2 = { balance: 200 };

      WalletCache.setApiResponse(endpoint, params1, response1);
      WalletCache.setApiResponse(endpoint, params2, response2);

      expect(WalletCache.getApiResponse(endpoint, params1)).toEqual(response1);
      expect(WalletCache.getApiResponse(endpoint, params2)).toEqual(response2);
    });
  });
});

describe('Performance Benchmarks', () => {
  describe('Benchmark Configuration', () => {
    it('should have benchmarks for all critical operations', () => {
      const criticalOperations = [
        'identity_switch',
        'wallet_balance_load',
        'token_transfer',
        'pi_wallet_connect'
      ];

      criticalOperations.forEach(operation => {
        expect(WALLET_PERFORMANCE_BENCHMARKS[operation]).toBeDefined();
      });
    });

    it('should have reasonable threshold values', () => {
      Object.values(WALLET_PERFORMANCE_BENCHMARKS).forEach(benchmark => {
        expect(benchmark.expectedDuration).toBeGreaterThan(0);
        expect(benchmark.warningThreshold).toBeGreaterThan(benchmark.expectedDuration);
        expect(benchmark.criticalThreshold).toBeGreaterThan(benchmark.warningThreshold);
      });
    });
  });

  describe('Identity Type Modifiers', () => {
    it('should apply identity type modifiers correctly', () => {
      const baseBenchmark = WALLET_PERFORMANCE_BENCHMARKS.identity_switch;
      const daoBenchmark = getBenchmarkForIdentity('identity_switch', 'DAO');

      expect(daoBenchmark).toBeDefined();
      expect(daoBenchmark!.expectedDuration).toBeGreaterThan(baseBenchmark.expectedDuration);
    });

    it('should return null for non-existent operations', () => {
      const benchmark = getBenchmarkForIdentity('non_existent_operation', 'ROOT');
      expect(benchmark).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    PerformanceMonitor.clear();
    WalletCache.clear();
  });

  it('should integrate performance monitoring with cache operations', () => {
    mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(50);

    // This should be tracked by performance monitor
    const testData = { value: 'test' };
    WalletCache.set('perf_test', testData);

    const retrieved = WalletCache.get('perf_test');
    expect(retrieved).toEqual(testData);

    // Check if cache operations were tracked
    const report = PerformanceMonitor.getReport();
    expect(report.summary.totalMetrics).toBeGreaterThan(0);
  });

  it('should handle concurrent operations correctly', async () => {
    const operations = Array.from({ length: 10 }, (_, i) => 
      PerformanceMonitor.trackOperation(
        `concurrent_op_${i}`,
        'WALLET_OPERATION',
        async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return `result_${i}`;
        }
      )
    );

    const results = await Promise.all(operations);
    expect(results).toHaveLength(10);

    const report = PerformanceMonitor.getReport();
    expect(report.summary.totalMetrics).toBe(10);
  });

  it('should maintain performance under load', async () => {
    const startTime = Date.now();

    // Simulate high load
    const promises = Array.from({ length: 100 }, async (_, i) => {
      WalletCache.set(`load_test_${i}`, { data: `test_${i}` });
      return WalletCache.get(`load_test_${i}`);
    });

    await Promise.all(promises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(1000);

    const stats = WalletCache.getStats();
    expect(stats.totalEntries).toBe(100);
  });
});