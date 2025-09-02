/**
 * Large-Scale Module Registration Performance Tests
 * Tests performance and scalability under various load conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRegistrationService } from '../../../services/ModuleRegistrationService';
import { ModuleVerificationService } from '../../../services/ModuleVerificationService';
import { ModuleRegistry } from '../../../services/ModuleRegistry';
import {
  ModuleRegistrationRequest,
  ModuleInfo,
  IdentityType
} from '../../../types/qwallet-module-registration';
import { ExtendedSquidIdentity } from '../../../types/identity';
import { 
  createMockIdentity, 
  createMockModuleInfo,
  setupPerformanceTestEnvironment,
  measurePerformance,
  createPerformanceMetrics,
  generateLargeDataset
} from '../../utils/qwallet-test-utils';

describe('Large-Scale Module Registration Performance Tests', () => {
  let registrationService: ModuleRegistrationService;
  let verificationService: ModuleVerificationService;
  let moduleRegistry: ModuleRegistry;
  let mockRootIdentity: ExtendedSquidIdentity;
  let performanceEnv: any;

  beforeEach(async () => {
    performanceEnv = await setupPerformanceTestEnvironment();
    
    registrationService = new ModuleRegistrationService();
    verificationService = new ModuleVerificationService();
    moduleRegistry = new ModuleRegistry();
    mockRootIdentity = createMockIdentity(IdentityType.ROOT);
  });

  afterEach(async () => {
    await performanceEnv.cleanup();
  });

  describe('Single Module Registration Performance', () => {
    it('should register a module within acceptable time limits', async () => {
      const moduleInfo = createMockModuleInfo('PerformanceTestModule', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };

      const { result, duration, memoryUsage } = await measurePerformance(async () => {
        return await registrationService.registerModule(request, mockRootIdentity);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it('should verify a module within acceptable time limits', async () => {
      // Register module first
      const moduleInfo = createMockModuleInfo('VerificationPerfTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };
      await registrationService.registerModule(request, mockRootIdentity);

      const { result, duration } = await measurePerformance(async () => {
        return await registrationService.verifyModule('VerificationPerfTest');
      });

      expect(result.status).toBe('production_ready');
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large module metadata efficiently', async () => {
      const largeModuleInfo = createMockModuleInfo('LargeModule', '1.0.0');
      largeModuleInfo.description = 'A'.repeat(5000); // Large description
      largeModuleInfo.integrations = [
        'Qindex', 'Qlock', 'Qerberos', 'Qonsent', 'Qsocial', 
        'Qdrive', 'Qmail', 'Qchat', 'Qpic', 'Qmarket'
      ]; // Many integrations

      const request: ModuleRegistrationRequest = { moduleInfo: largeModuleInfo };

      const { result, duration, memoryUsage } = await measurePerformance(async () => {
        return await registrationService.registerModule(request, mockRootIdentity);
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000); // Should handle large data within 3 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Batch Registration Performance', () => {
    it('should handle small batch registration efficiently', async () => {
      const batchSize = 10;
      const modules = generateLargeDataset(batchSize, 'BatchSmall');
      const requests = modules.map(moduleInfo => ({ moduleInfo }));

      const { result, duration, memoryUsage } = await measurePerformance(async () => {
        return await registrationService.registerModulesBatch(requests, mockRootIdentity);
      });

      expect(result.size).toBe(batchSize);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB

      // Verify all registrations succeeded
      for (let i = 0; i < batchSize; i++) {
        expect(result.get(`BatchSmall${i}`)?.success).toBe(true);
      }
    });

    it('should handle medium batch registration efficiently', async () => {
      const batchSize = 50;
      const modules = generateLargeDataset(batchSize, 'BatchMedium');
      const requests = modules.map(moduleInfo => ({ moduleInfo }));

      const { result, duration, memoryUsage } = await measurePerformance(async () => {
        return await registrationService.registerModulesBatch(requests, mockRootIdentity);
      });

      expect(result.size).toBe(batchSize);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB

      // Calculate average time per module
      const averageTimePerModule = duration / batchSize;
      expect(averageTimePerModule).toBeLessThan(600); // Less than 600ms per module
    });

    it('should handle large batch registration efficiently', async () => {
      const batchSize = 100;
      const modules = generateLargeDataset(batchSize, 'BatchLarge');
      const requests = modules.map(moduleInfo => ({ moduleInfo }));

      const { result, duration, memoryUsage } = await measurePerformance(async () => {
        return await registrationService.registerModulesBatch(requests, mockRootIdentity);
      });

      expect(result.size).toBe(batchSize);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(memoryUsage.heapUsed).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB

      // Verify performance metrics
      const averageTimePerModule = duration / batchSize;
      expect(averageTimePerModule).toBeLessThan(600); // Less than 600ms per module

      // Verify success rate
      const successCount = Array.from(result.values()).filter(r => r.success).length;
      const successRate = successCount / batchSize;
      expect(successRate).toBeGreaterThan(0.95); // At least 95% success rate
    });

    it('should scale linearly with batch size', async () => {
      const batchSizes = [10, 20, 40];
      const results = [];

      for (const batchSize of batchSizes) {
        const modules = generateLargeDataset(batchSize, `Scale${batchSize}`);
        const requests = modules.map(moduleInfo => ({ moduleInfo }));

        const { duration } = await measurePerformance(async () => {
          return await registrationService.registerModulesBatch(requests, mockRootIdentity);
        });

        results.push({ batchSize, duration, timePerModule: duration / batchSize });
      }

      // Verify linear scaling (time per module should be relatively consistent)
      const timePerModuleVariance = Math.max(...results.map(r => r.timePerModule)) - 
                                   Math.min(...results.map(r => r.timePerModule));
      
      expect(timePerModuleVariance).toBeLessThan(200); // Variance should be less than 200ms
    });
  });

  describe('Concurrent Registration Performance', () => {
    it('should handle concurrent registrations efficiently', async () => {
      const concurrentCount = 10;
      const promises = [];

      for (let i = 0; i < concurrentCount; i++) {
        const moduleInfo = createMockModuleInfo(`ConcurrentModule${i}`, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };
        promises.push(registrationService.registerModule(request, mockRootIdentity));
      }

      const { result: results, duration } = await measurePerformance(async () => {
        return await Promise.allSettled(promises);
      });

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Verify most registrations succeeded
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(concurrentCount * 0.8); // At least 80% success
    });

    it('should handle concurrent verification efficiently', async () => {
      // Register modules first
      const moduleCount = 20;
      for (let i = 0; i < moduleCount; i++) {
        const moduleInfo = createMockModuleInfo(`VerifyModule${i}`, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };
        await registrationService.registerModule(request, mockRootIdentity);
      }

      // Concurrent verification
      const verificationPromises = [];
      for (let i = 0; i < moduleCount; i++) {
        verificationPromises.push(registrationService.verifyModule(`VerifyModule${i}`));
      }

      const { result: results, duration } = await measurePerformance(async () => {
        return await Promise.allSettled(verificationPromises);
      });

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBe(moduleCount); // All verifications should succeed
    });

    it('should handle mixed concurrent operations', async () => {
      const operationCount = 30;
      const promises = [];

      // Mix of registration, verification, and search operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          // Registration
          const moduleInfo = createMockModuleInfo(`MixedOp${i}`, '1.0.0');
          const request: ModuleRegistrationRequest = { moduleInfo };
          promises.push(registrationService.registerModule(request, mockRootIdentity));
        } else if (i % 3 === 1) {
          // Search
          promises.push(registrationService.searchModules({ limit: 10 }));
        } else {
          // List modules
          promises.push(registrationService.listModules({ limit: 10 }));
        }
      }

      const { result: results, duration } = await measurePerformance(async () => {
        return await Promise.allSettled(promises);
      });

      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(operationCount * 0.9); // At least 90% success
    });
  });

  describe('Search and Discovery Performance', () => {
    beforeEach(async () => {
      // Register a large number of modules for search testing
      const moduleCount = 200;
      const modules = generateLargeDataset(moduleCount, 'SearchTest');
      const requests = modules.map(moduleInfo => ({ moduleInfo }));
      
      await registrationService.registerModulesBatch(requests, mockRootIdentity);
    });

    it('should search modules efficiently with large dataset', async () => {
      const { result, duration } = await measurePerformance(async () => {
        return await registrationService.searchModules({ 
          name: 'SearchTest',
          limit: 50 
        });
      });

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);
    });

    it('should handle complex search queries efficiently', async () => {
      const { result, duration } = await measurePerformance(async () => {
        return await registrationService.searchModules({
          status: 'PRODUCTION_READY',
          hasCompliance: true,
          integration: 'Qindex',
          limit: 100
        });
      });

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.modules.length).toBeGreaterThan(0);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 20;
      const totalPages = 5;
      const durations = [];

      for (let page = 0; page < totalPages; page++) {
        const { result, duration } = await measurePerformance(async () => {
          return await registrationService.searchModules({
            limit: pageSize,
            offset: page * pageSize
          });
        });

        durations.push(duration);
        expect(result.modules.length).toBeLessThanOrEqual(pageSize);
      }

      // All page loads should be fast
      const maxDuration = Math.max(...durations);
      expect(maxDuration).toBeLessThan(1500); // Each page should load within 1.5 seconds

      // Performance should be consistent across pages
      const minDuration = Math.min(...durations);
      const variance = maxDuration - minDuration;
      expect(variance).toBeLessThan(1000); // Variance should be less than 1 second
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform large batch operation
      const batchSize = 100;
      const modules = generateLargeDataset(batchSize, 'MemoryTest');
      const requests = modules.map(moduleInfo => ({ moduleInfo }));

      await registrationService.registerModulesBatch(requests, mockRootIdentity);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // Less than 500MB increase
    });

    it('should clean up memory after operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        const moduleInfo = createMockModuleInfo(`CleanupTest${i}`, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };
        await registrationService.registerModule(request, mockRootIdentity);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects = [];
      for (let i = 0; i < 10; i++) {
        largeObjects.push(new Array(1000000).fill('memory-pressure'));
      }

      try {
        const moduleInfo = createMockModuleInfo('MemoryPressureTest', '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };

        const { result, duration } = await measurePerformance(async () => {
          return await registrationService.registerModule(request, mockRootIdentity);
        });

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000); // Should still complete within 5 seconds
      } finally {
        // Clean up large objects
        largeObjects.length = 0;
      }
    });
  });

  describe('Caching Performance', () => {
    it('should improve performance with signature verification caching', async () => {
      const moduleInfo = createMockModuleInfo('CacheTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };
      
      await registrationService.registerModule(request, mockRootIdentity);

      // First verification (no cache)
      const { duration: firstDuration } = await measurePerformance(async () => {
        return await registrationService.verifyModule('CacheTest');
      });

      // Second verification (with cache)
      const { duration: secondDuration } = await measurePerformance(async () => {
        return await registrationService.verifyModule('CacheTest');
      });

      // Second verification should be faster due to caching
      expect(secondDuration).toBeLessThan(firstDuration);
      expect(secondDuration).toBeLessThan(100); // Should be very fast with cache
    });

    it('should handle cache invalidation correctly', async () => {
      const moduleInfo = createMockModuleInfo('CacheInvalidationTest', '1.0.0');
      const request: ModuleRegistrationRequest = { moduleInfo };
      
      await registrationService.registerModule(request, mockRootIdentity);

      // First verification (populate cache)
      await registrationService.verifyModule('CacheInvalidationTest');

      // Update module (should invalidate cache)
      const updates = { version: '1.1.0' };
      await registrationService.updateModule('CacheInvalidationTest', updates, mockRootIdentity);

      // Verification after update (cache should be invalidated)
      const { result, duration } = await measurePerformance(async () => {
        return await registrationService.verifyModule('CacheInvalidationTest');
      });

      expect(result.status).toBe('production_ready');
      expect(duration).toBeGreaterThan(50); // Should take time due to cache invalidation
    });

    it('should maintain cache efficiency under load', async () => {
      // Register multiple modules
      const moduleCount = 20;
      for (let i = 0; i < moduleCount; i++) {
        const moduleInfo = createMockModuleInfo(`CacheLoadTest${i}`, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };
        await registrationService.registerModule(request, mockRootIdentity);
      }

      // First round of verifications (populate cache)
      for (let i = 0; i < moduleCount; i++) {
        await registrationService.verifyModule(`CacheLoadTest${i}`);
      }

      // Second round of verifications (use cache)
      const { duration } = await measurePerformance(async () => {
        const promises = [];
        for (let i = 0; i < moduleCount; i++) {
          promises.push(registrationService.verifyModule(`CacheLoadTest${i}`));
        }
        return await Promise.all(promises);
      });

      // Should be very fast with cache
      const averageTimePerVerification = duration / moduleCount;
      expect(averageTimePerVerification).toBeLessThan(50); // Less than 50ms per verification
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across test runs', async () => {
      const testRuns = 5;
      const durations = [];

      for (let run = 0; run < testRuns; run++) {
        const moduleInfo = createMockModuleInfo(`RegressionTest${run}`, '1.0.0');
        const request: ModuleRegistrationRequest = { moduleInfo };

        const { duration } = await measurePerformance(async () => {
          return await registrationService.registerModule(request, mockRootIdentity);
        });

        durations.push(duration);
      }

      // Calculate performance metrics
      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / testRuns;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = maxDuration - minDuration;

      // Performance should be consistent
      expect(averageDuration).toBeLessThan(2000); // Average should be under 2 seconds
      expect(variance).toBeLessThan(1000); // Variance should be less than 1 second
      expect(maxDuration / minDuration).toBeLessThan(2); // Max should not be more than 2x min
    });

    it('should track performance metrics over time', async () => {
      const metrics = createPerformanceMetrics();
      
      // Perform various operations and track metrics
      const operations = [
        { name: 'registration', count: 10 },
        { name: 'verification', count: 10 },
        { name: 'search', count: 5 }
      ];

      for (const operation of operations) {
        for (let i = 0; i < operation.count; i++) {
          let duration;
          
          if (operation.name === 'registration') {
            const moduleInfo = createMockModuleInfo(`MetricsTest${i}`, '1.0.0');
            const request: ModuleRegistrationRequest = { moduleInfo };
            const result = await measurePerformance(async () => {
              return await registrationService.registerModule(request, mockRootIdentity);
            });
            duration = result.duration;
          } else if (operation.name === 'verification') {
            const result = await measurePerformance(async () => {
              return await registrationService.verifyModule(`MetricsTest${i % 10}`);
            });
            duration = result.duration;
          } else if (operation.name === 'search') {
            const result = await measurePerformance(async () => {
              return await registrationService.searchModules({ limit: 10 });
            });
            duration = result.duration;
          }

          metrics.recordOperation(operation.name, duration!);
        }
      }

      // Verify metrics are within acceptable ranges
      const registrationStats = metrics.getStats('registration');
      const verificationStats = metrics.getStats('verification');
      const searchStats = metrics.getStats('search');

      expect(registrationStats.average).toBeLessThan(2000);
      expect(verificationStats.average).toBeLessThan(1000);
      expect(searchStats.average).toBeLessThan(1500);

      // Verify performance trends
      expect(registrationStats.trend).toBeLessThanOrEqual(0.1); // Should not degrade more than 10%
    });
  });
});