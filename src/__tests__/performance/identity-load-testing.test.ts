/**
 * Identity System Load Testing
 * Performance testing with multiple identities and concurrent users
 * Tests system behavior under high load conditions
 * Requirements: Performance and scalability validation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { identityManager } from '@/services/IdentityManager';
import { 
  PerformanceTestUtils, 
  MockDataGenerator, 
  createMockIdentity,
  createMockSubidentityMetadata,
  TestEnvironmentSetup
} from '../utils/identity-test-utils';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel,
  SubidentityMetadata 
} from '@/types/identity';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  IDENTITY_CREATION: 1000,      // 1 second max
  IDENTITY_SWITCHING: 500,      // 500ms max
  IDENTITY_SEARCH: 300,         // 300ms max
  TREE_RETRIEVAL: 2000,         // 2 seconds max
  CONCURRENT_OPERATIONS: 5000   // 5 seconds max for batch operations
};

// Load testing configuration
const LOAD_TEST_CONFIG = {
  SMALL_LOAD: 10,
  MEDIUM_LOAD: 50,
  LARGE_LOAD: 100,
  CONCURRENT_USERS: 20,
  STRESS_TEST_IDENTITIES: 200
};

describe('Identity System Load Testing', () => {
  let testIdentities: ExtendedSquidIdentity[] = [];
  let rootIdentity: ExtendedSquidIdentity;

  beforeAll(async () => {
    console.log('[LoadTest] Setting up load testing environment...');
    await TestEnvironmentSetup.setupTestEnvironment();
    
    // Create root identity for testing
    rootIdentity = createMockIdentity({
      type: IdentityType.ROOT,
      name: 'Load Test Root Identity',
      permissions: {
        canCreateSubidentities: true,
        canDeleteSubidentities: true,
        canModifyProfile: true,
        canSwitchIdentities: true
      }
    });
    
    testIdentities.push(rootIdentity);
    console.log('[LoadTest] Load testing environment ready');
  });

  afterAll(async () => {
    console.log('[LoadTest] Cleaning up load test data...');
    
    // Clean up test identities
    for (const identity of testIdentities) {
      try {
        if (identity.type !== IdentityType.ROOT) {
          await identityManager.deleteSubidentity(identity.did);
        }
      } catch (error) {
        console.warn(`[LoadTest] Failed to cleanup identity ${identity.did}:`, error);
      }
    }
    
    await TestEnvironmentSetup.teardownTestEnvironment();
    
    // Generate final performance report
    const report = PerformanceTestUtils.generateReport();
    console.log('[LoadTest] Final Performance Report:', JSON.stringify(report, null, 2));
  });

  describe('Single Operation Performance', () => {
    it('should create identities within performance threshold', async () => {
      const endMeasurement = PerformanceTestUtils.startMeasurement('Single Identity Creation');
      
      const metadata = createMockSubidentityMetadata({
        name: 'Performance Test Identity',
        type: IdentityType.DAO
      });

      const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      const duration = endMeasurement();

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_CREATION);
      
      if (result.identity) {
        testIdentities.push(result.identity);
      }
    });

    it('should switch identities within performance threshold', async () => {
      // Create a test identity to switch to
      const metadata = createMockSubidentityMetadata({
        name: 'Switch Performance Test Identity',
        type: IdentityType.DAO
      });

      const createResult = await identityManager.createSubidentity(IdentityType.DAO, metadata);
      expect(createResult.success).toBe(true);
      
      const testIdentity = createResult.identity!;
      testIdentities.push(testIdentity);

      // Measure switching performance
      const endMeasurement = PerformanceTestUtils.startMeasurement('Single Identity Switch');
      
      const switchResult = await identityManager.switchActiveIdentity(testIdentity.did);
      const duration = endMeasurement();

      expect(switchResult.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_SWITCHING);
    });

    it('should retrieve identity tree within performance threshold', async () => {
      const endMeasurement = PerformanceTestUtils.startMeasurement('Identity Tree Retrieval');
      
      const result = await identityManager.getIdentityTree(rootIdentity.did);
      const duration = endMeasurement();

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.TREE_RETRIEVAL);
    });

    it('should search identities within performance threshold', async () => {
      const endMeasurement = PerformanceTestUtils.startMeasurement('Identity Search');
      
      const result = await identityManager.searchIdentities({
        query: 'Performance Test',
        limit: 10
      });
      const duration = endMeasurement();

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_SEARCH);
    });
  });

  describe('Batch Operations Performance', () => {
    it('should handle small batch identity creation efficiently', async () => {
      const batchSize = LOAD_TEST_CONFIG.SMALL_LOAD;
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Batch Creation (${batchSize})`);
      
      const metadataList = MockDataGenerator.generateSubidentityMetadata(batchSize, IdentityType.DAO);
      const createdIdentities: ExtendedSquidIdentity[] = [];

      for (const metadata of metadataList) {
        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        expect(result.success).toBe(true);
        
        if (result.identity) {
          createdIdentities.push(result.identity);
        }
      }

      const duration = endMeasurement();
      const averageTimePerIdentity = duration / batchSize;

      expect(createdIdentities).toHaveLength(batchSize);
      expect(averageTimePerIdentity).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_CREATION);
      
      testIdentities.push(...createdIdentities);
      console.log(`[LoadTest] Created ${batchSize} identities in ${duration.toFixed(2)}ms (avg: ${averageTimePerIdentity.toFixed(2)}ms per identity)`);
    });

    it('should handle medium batch identity creation efficiently', async () => {
      const batchSize = LOAD_TEST_CONFIG.MEDIUM_LOAD;
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Batch Creation (${batchSize})`);
      
      const metadataList = MockDataGenerator.generateSubidentityMetadata(batchSize, IdentityType.DAO);
      const createdIdentities: ExtendedSquidIdentity[] = [];

      for (const metadata of metadataList) {
        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        expect(result.success).toBe(true);
        
        if (result.identity) {
          createdIdentities.push(result.identity);
        }
      }

      const duration = endMeasurement();
      const averageTimePerIdentity = duration / batchSize;

      expect(createdIdentities).toHaveLength(batchSize);
      expect(averageTimePerIdentity).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_CREATION);
      
      testIdentities.push(...createdIdentities);
      console.log(`[LoadTest] Created ${batchSize} identities in ${duration.toFixed(2)}ms (avg: ${averageTimePerIdentity.toFixed(2)}ms per identity)`);
    });

    it('should handle batch identity switching efficiently', async () => {
      // Use existing test identities for switching
      const switchableIdentities = testIdentities.slice(0, LOAD_TEST_CONFIG.SMALL_LOAD);
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Batch Switching (${switchableIdentities.length})`);
      
      const switchTimes: number[] = [];

      for (const identity of switchableIdentities) {
        const switchStart = performance.now();
        const result = await identityManager.switchActiveIdentity(identity.did);
        const switchDuration = performance.now() - switchStart;
        
        expect(result.success).toBe(true);
        switchTimes.push(switchDuration);
      }

      const totalDuration = endMeasurement();
      const averageTimePerSwitch = totalDuration / switchableIdentities.length;
      const maxSwitchTime = Math.max(...switchTimes);

      expect(averageTimePerSwitch).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_SWITCHING);
      expect(maxSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.IDENTITY_SWITCHING * 2);
      
      console.log(`[LoadTest] Switched ${switchableIdentities.length} identities in ${totalDuration.toFixed(2)}ms (avg: ${averageTimePerSwitch.toFixed(2)}ms per switch, max: ${maxSwitchTime.toFixed(2)}ms)`);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent identity creation', async () => {
      const concurrentCount = LOAD_TEST_CONFIG.CONCURRENT_USERS;
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Concurrent Creation (${concurrentCount})`);
      
      const concurrentOperations: Promise<any>[] = [];

      for (let i = 0; i < concurrentCount; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `Concurrent Test Identity ${i}`,
          type: IdentityType.DAO
        });

        concurrentOperations.push(identityManager.createSubidentity(IdentityType.DAO, metadata));
      }

      const results = await Promise.allSettled(concurrentOperations);
      const duration = endMeasurement();

      // Count successful operations
      const successfulResults = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulResults.length).toBeGreaterThan(concurrentCount * 0.8); // At least 80% success rate
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS);

      // Add successful identities to cleanup list
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success && result.value.identity) {
          testIdentities.push(result.value.identity);
        }
      });

      console.log(`[LoadTest] Concurrent creation: ${successfulResults.length}/${concurrentCount} successful in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent identity switching', async () => {
      const switchableIdentities = testIdentities.slice(0, LOAD_TEST_CONFIG.CONCURRENT_USERS);
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Concurrent Switching (${switchableIdentities.length})`);
      
      const concurrentSwitches: Promise<any>[] = [];

      for (const identity of switchableIdentities) {
        concurrentSwitches.push(identityManager.switchActiveIdentity(identity.did));
      }

      const results = await Promise.allSettled(concurrentSwitches);
      const duration = endMeasurement();

      // Count successful switches
      const successfulSwitches = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulSwitches.length).toBeGreaterThan(switchableIdentities.length * 0.8); // At least 80% success rate
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS);

      console.log(`[LoadTest] Concurrent switching: ${successfulSwitches.length}/${switchableIdentities.length} successful in ${duration.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      const operationCount = LOAD_TEST_CONFIG.CONCURRENT_USERS;
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Mixed Concurrent Operations (${operationCount})`);
      
      const mixedOperations: Promise<any>[] = [];

      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          // Create identity
          const metadata = createMockSubidentityMetadata({
            name: `Mixed Op Create ${i}`,
            type: IdentityType.DAO
          });
          mixedOperations.push(identityManager.createSubidentity(IdentityType.DAO, metadata));
        } else if (i % 3 === 1 && testIdentities.length > 0) {
          // Switch identity
          const randomIdentity = testIdentities[Math.floor(Math.random() * testIdentities.length)];
          mixedOperations.push(identityManager.switchActiveIdentity(randomIdentity.did));
        } else {
          // Search identities
          mixedOperations.push(identityManager.searchIdentities({
            query: 'Mixed Op',
            limit: 5
          }));
        }
      }

      const results = await Promise.allSettled(mixedOperations);
      const duration = endMeasurement();

      // Count successful operations
      const successfulOperations = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulOperations.length).toBeGreaterThan(operationCount * 0.7); // At least 70% success rate
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS * 2);

      // Add successful identities to cleanup list
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.identity && index % 3 === 0) {
          testIdentities.push(result.value.identity);
        }
      });

      console.log(`[LoadTest] Mixed concurrent operations: ${successfulOperations.length}/${operationCount} successful in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should manage memory efficiently during large-scale operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const identityCount = LOAD_TEST_CONFIG.LARGE_LOAD;
      
      console.log(`[LoadTest] Starting memory test with ${identityCount} identities. Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Memory Test (${identityCount})`);
      const createdIdentities: ExtendedSquidIdentity[] = [];
      const memorySnapshots: number[] = [initialMemory];

      // Create identities and monitor memory usage
      for (let i = 0; i < identityCount; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `Memory Test Identity ${i}`,
          type: IdentityType.DAO
        });

        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        expect(result.success).toBe(true);
        
        if (result.identity) {
          createdIdentities.push(result.identity);
        }

        // Take memory snapshot every 10 operations
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      const duration = endMeasurement();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryPerIdentity = memoryIncrease / identityCount;

      console.log(`[LoadTest] Memory test completed:`);
      console.log(`  - Created: ${createdIdentities.length} identities`);
      console.log(`  - Duration: ${duration.toFixed(2)}ms`);
      console.log(`  - Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - Memory per identity: ${(memoryPerIdentity / 1024).toFixed(2)}KB`);

      // Verify reasonable memory usage
      expect(createdIdentities).toHaveLength(identityCount);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      expect(memoryPerIdentity).toBeLessThan(100 * 1024); // Less than 100KB per identity

      testIdentities.push(...createdIdentities);
    });

    it('should handle garbage collection efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and immediately delete identities to test GC
      const tempIdentities: ExtendedSquidIdentity[] = [];
      
      for (let i = 0; i < 20; i++) {
        const metadata = createMockSubidentityMetadata({
          name: `GC Test Identity ${i}`,
          type: IdentityType.DAO
        });

        const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
        if (result.success && result.identity) {
          tempIdentities.push(result.identity);
        }
      }

      // Delete all temporary identities
      for (const identity of tempIdentities) {
        await identityManager.deleteSubidentity(identity.did);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDifference = finalMemory - initialMemory;

      console.log(`[LoadTest] GC test - Memory difference: ${(memoryDifference / 1024 / 1024).toFixed(2)}MB`);

      // Memory should not have increased significantly
      expect(Math.abs(memoryDifference)).toBeLessThan(5 * 1024 * 1024); // Less than 5MB difference
    });
  });

  describe('Stress Testing', () => {
    it('should handle stress test with maximum identities', async () => {
      const stressTestCount = LOAD_TEST_CONFIG.STRESS_TEST_IDENTITIES;
      console.log(`[LoadTest] Starting stress test with ${stressTestCount} identities...`);
      
      const endMeasurement = PerformanceTestUtils.startMeasurement(`Stress Test (${stressTestCount})`);
      const createdIdentities: ExtendedSquidIdentity[] = [];
      const failedOperations: number[] = [];

      // Create identities in batches to avoid overwhelming the system
      const batchSize = 20;
      const batches = Math.ceil(stressTestCount / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, stressTestCount);
        const batchOperations: Promise<any>[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const metadata = createMockSubidentityMetadata({
            name: `Stress Test Identity ${i}`,
            type: IdentityType.DAO
          });

          batchOperations.push(identityManager.createSubidentity(IdentityType.DAO, metadata));
        }

        const batchResults = await Promise.allSettled(batchOperations);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success && result.value.identity) {
            createdIdentities.push(result.value.identity);
          } else {
            failedOperations.push(batchStart + index);
          }
        });

        // Small delay between batches to prevent overwhelming
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const duration = endMeasurement();
      const successRate = (createdIdentities.length / stressTestCount) * 100;

      console.log(`[LoadTest] Stress test completed:`);
      console.log(`  - Target: ${stressTestCount} identities`);
      console.log(`  - Created: ${createdIdentities.length} identities`);
      console.log(`  - Failed: ${failedOperations.length} operations`);
      console.log(`  - Success rate: ${successRate.toFixed(2)}%`);
      console.log(`  - Duration: ${duration.toFixed(2)}ms`);
      console.log(`  - Average time per identity: ${(duration / createdIdentities.length).toFixed(2)}ms`);

      // Verify acceptable performance under stress
      expect(successRate).toBeGreaterThan(80); // At least 80% success rate
      expect(createdIdentities.length).toBeGreaterThan(stressTestCount * 0.8);

      testIdentities.push(...createdIdentities);
    });

    it('should maintain system stability under continuous load', async () => {
      const loadDuration = 30000; // 30 seconds
      const operationInterval = 100; // 100ms between operations
      
      console.log(`[LoadTest] Starting continuous load test for ${loadDuration}ms...`);
      
      const endMeasurement = PerformanceTestUtils.startMeasurement('Continuous Load Test');
      const operationResults: boolean[] = [];
      const startTime = Date.now();

      while (Date.now() - startTime < loadDuration) {
        try {
          const metadata = createMockSubidentityMetadata({
            name: `Continuous Load Identity ${operationResults.length}`,
            type: IdentityType.DAO
          });

          const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
          operationResults.push(result.success);
          
          if (result.success && result.identity) {
            testIdentities.push(result.identity);
          }

          // Wait before next operation
          await new Promise(resolve => setTimeout(resolve, operationInterval));
        } catch (error) {
          operationResults.push(false);
          console.warn(`[LoadTest] Operation failed during continuous load:`, error);
        }
      }

      const duration = endMeasurement();
      const totalOperations = operationResults.length;
      const successfulOperations = operationResults.filter(success => success).length;
      const successRate = (successfulOperations / totalOperations) * 100;

      console.log(`[LoadTest] Continuous load test completed:`);
      console.log(`  - Duration: ${duration.toFixed(2)}ms`);
      console.log(`  - Total operations: ${totalOperations}`);
      console.log(`  - Successful operations: ${successfulOperations}`);
      console.log(`  - Success rate: ${successRate.toFixed(2)}%`);
      console.log(`  - Operations per second: ${(successfulOperations / (duration / 1000)).toFixed(2)}`);

      // Verify system stability
      expect(successRate).toBeGreaterThan(70); // At least 70% success rate under continuous load
      expect(totalOperations).toBeGreaterThan(100); // Should have performed significant number of operations
    });
  });

  describe('Performance Regression Testing', () => {
    it('should maintain consistent performance across multiple runs', async () => {
      const runs = 5;
      const operationsPerRun = 10;
      const runTimes: number[] = [];

      for (let run = 0; run < runs; run++) {
        const endMeasurement = PerformanceTestUtils.startMeasurement(`Regression Test Run ${run + 1}`);
        
        for (let i = 0; i < operationsPerRun; i++) {
          const metadata = createMockSubidentityMetadata({
            name: `Regression Test Identity ${run}-${i}`,
            type: IdentityType.DAO
          });

          const result = await identityManager.createSubidentity(IdentityType.DAO, metadata);
          expect(result.success).toBe(true);
          
          if (result.identity) {
            testIdentities.push(result.identity);
          }
        }

        const runTime = endMeasurement();
        runTimes.push(runTime);
      }

      // Calculate performance metrics
      const averageTime = runTimes.reduce((sum, time) => sum + time, 0) / runs;
      const minTime = Math.min(...runTimes);
      const maxTime = Math.max(...runTimes);
      const variance = runTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / runs;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = (standardDeviation / averageTime) * 100;

      console.log(`[LoadTest] Performance regression test results:`);
      console.log(`  - Runs: ${runs}`);
      console.log(`  - Operations per run: ${operationsPerRun}`);
      console.log(`  - Average time: ${averageTime.toFixed(2)}ms`);
      console.log(`  - Min time: ${minTime.toFixed(2)}ms`);
      console.log(`  - Max time: ${maxTime.toFixed(2)}ms`);
      console.log(`  - Standard deviation: ${standardDeviation.toFixed(2)}ms`);
      console.log(`  - Coefficient of variation: ${coefficientOfVariation.toFixed(2)}%`);

      // Verify performance consistency
      expect(coefficientOfVariation).toBeLessThan(30); // Less than 30% variation
      expect(maxTime).toBeLessThan(averageTime * 2); // Max time should not be more than 2x average
    });
  });
});