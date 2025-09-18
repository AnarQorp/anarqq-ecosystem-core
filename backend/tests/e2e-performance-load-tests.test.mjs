/**
 * End-to-End Performance and Load Tests
 * 
 * Comprehensive performance testing for latency, throughput, resource usage,
 * and high-traffic conditions across all Q ecosystem modules.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EventBusService } from '../services/EventBusService.mjs';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { UnifiedStorageService } from '../services/UnifiedStorageService.mjs';
import { QmarketService } from '../services/QmarketService.mjs';
import ObservabilityService from '../services/ObservabilityService.mjs';
import { performance } from 'perf_hooks';
import os from 'os';

describe('E2E Performance and Load Tests', () => {
  let services;
  let performanceMetrics;
  let resourceMonitor;
  let testUsers;

  beforeAll(async () => {
    console.log('⚡ Initializing E2E Performance and Load Tests...');
    
    // Initialize services with performance monitoring
    const eventBus = new EventBusService();
    const observabilityService = new ObservabilityService({ 
      eventBus, 
      enableMetrics: true,
      enableTracing: true
    });
    
    services = {
      eventBus,
      observability: observabilityService,
      qwallet: new QwalletIntegrationService({ 
        sandboxMode: true, 
        eventBus,
        observability: observabilityService,
        enableMetrics: true
      }),
      storage: new UnifiedStorageService({ 
        sandboxMode: true, 
        eventBus,
        observability: observabilityService,
        enableMetrics: true
      }),
      qmarket: new QmarketService({ 
        sandboxMode: true, 
        eventBus,
        observability: observabilityService,
        enableMetrics: true
      })
    };

    // Initialize services
    await Promise.all([
      services.qwallet.initialize(),
      services.storage.initialize(),
      services.qmarket.initialize(),
      services.observability.initialize()
    ]);

    // Create test users for load testing
    testUsers = [];
    for (let i = 0; i < 50; i++) {
      const user = {
        squidId: `did:squid:perf_test_user_${i}`,
        subId: `perf_test_sub_${i}`
      };
      testUsers.push(user);
      await services.qwallet.getSandboxBalance(user.squidId, 100.0);
    }

    // Initialize performance monitoring
    performanceMetrics = {
      startTime: performance.now(),
      tests: [],
      systemMetrics: [],
      sloViolations: []
    };

    // Start resource monitoring
    resourceMonitor = new ResourceMonitor();
    await resourceMonitor.start();

    console.log('✅ E2E Performance Test Environment Ready');
  });

  afterAll(async () => {
    console.log('📊 Generating Performance Test Report...');
    
    // Stop resource monitoring
    await resourceMonitor.stop();
    
    // Generate comprehensive performance report
    const report = generatePerformanceReport(performanceMetrics, resourceMonitor.getMetrics());
    console.log('📈 Performance Test Report:', JSON.stringify(report, null, 2));
    
    // Validate SLO compliance
    validateSLOCompliance(performanceMetrics.sloViolations);

    // Cleanup services
    await Promise.all([
      services.qmarket?.shutdown(),
      services.storage?.shutdown(),
      services.qwallet?.shutdown(),
      services.observability?.shutdown()
    ]);
    
    console.log('✅ E2E Performance Tests Completed');
  });

  beforeEach(() => {
    // Reset metrics for each test
    performanceMetrics.currentTest = {
      name: '',
      startTime: performance.now(),
      operations: [],
      errors: [],
      resourceUsage: []
    };
  }); 
 describe('Latency Performance Tests', () => {
    it('should meet p50/p95/p99 latency SLOs for read operations', async () => {
      const testName = 'Read Operations Latency Test';
      performanceMetrics.currentTest.name = testName;
      
      console.log(`🚀 Running ${testName}...`);
      
      const iterations = 1000;
      const latencies = [];
      
      // Prepare test data
      const testCid = await setupTestContent();
      
      // Execute read operations
      for (let i = 0; i < iterations; i++) {
        const user = testUsers[i % testUsers.length];
        const startTime = performance.now();
        
        try {
          const result = await services.storage.retrieveFile({
            squidId: user.squidId,
            cid: testCid,
            skipDecryption: true // Faster for latency testing
          });
          
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          expect(result.success).toBe(true);
          
          performanceMetrics.currentTest.operations.push({
            operation: 'read',
            latency,
            success: true,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          performanceMetrics.currentTest.errors.push({
            operation: 'read',
            error: error.message,
            latency,
            timestamp: new Date().toISOString()
          });
        }
        
        // Small delay to prevent overwhelming the system
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Calculate percentiles
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(iterations * 0.5)];
      const p95 = sortedLatencies[Math.floor(iterations * 0.95)];
      const p99 = sortedLatencies[Math.floor(iterations * 0.99)];
      const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      
      console.log(`📊 Read Latency Results:`);
      console.log(`   Iterations: ${iterations}`);
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   P50: ${p50.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   P99: ${p99.toFixed(2)}ms`);
      
      // Validate SLOs
      const sloResults = {
        p50: { value: p50, threshold: 50, passed: p50 < 50 },
        p95: { value: p95, threshold: 150, passed: p95 < 150 },
        p99: { value: p99, threshold: 200, passed: p99 < 200 }
      };
      
      // Record SLO violations
      Object.entries(sloResults).forEach(([metric, result]) => {
        if (!result.passed) {
          performanceMetrics.sloViolations.push({
            test: testName,
            metric,
            value: result.value,
            threshold: result.threshold,
            violation: result.value - result.threshold
          });
        }
      });
      
      // Assert SLO compliance
      expect(p50).toBeLessThan(50);   // P50 < 50ms
      expect(p95).toBeLessThan(150);  // P95 < 150ms
      expect(p99).toBeLessThan(200);  // P99 < 200ms
      
      recordTestResult(testName, true, performance.now() - performanceMetrics.currentTest.startTime);
    });

    it('should meet p50/p95/p99 latency SLOs for write operations', async () => {
      const testName = 'Write Operations Latency Test';
      performanceMetrics.currentTest.name = testName;
      
      console.log(`🚀 Running ${testName}...`);
      
      const iterations = 500; // Fewer iterations for write operations
      const latencies = [];
      
      // Execute write operations
      for (let i = 0; i < iterations; i++) {
        const user = testUsers[i % testUsers.length];
        const startTime = performance.now();
        
        try {
          const testContent = Buffer.from(`Performance test content ${i}`);
          const result = await services.storage.uploadFile({
            squidId: user.squidId,
            fileName: `perf-test-${i}.txt`,
            fileSize: testContent.length,
            contentType: 'text/plain',
            content: testContent,
            skipEncryption: true // Faster for latency testing
          });
          
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          expect(result.success).toBe(true);
          
          performanceMetrics.currentTest.operations.push({
            operation: 'write',
            latency,
            success: true,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          const latency = performance.now() - startTime;
          latencies.push(latency);
          
          performanceMetrics.currentTest.errors.push({
            operation: 'write',
            error: error.message,
            latency,
            timestamp: new Date().toISOString()
          });
        }
        
        // Delay between writes to prevent overwhelming
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Calculate percentiles
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(iterations * 0.5)];
      const p95 = sortedLatencies[Math.floor(iterations * 0.95)];
      const p99 = sortedLatencies[Math.floor(iterations * 0.99)];
      const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      
      console.log(`📊 Write Latency Results:`);
      console.log(`   Iterations: ${iterations}`);
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   P50: ${p50.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   P99: ${p99.toFixed(2)}ms`);
      
      // Validate SLOs (more lenient for write operations)
      expect(p50).toBeLessThan(100);  // P50 < 100ms
      expect(p95).toBeLessThan(300);  // P95 < 300ms
      expect(p99).toBeLessThan(500);  // P99 < 500ms
      
      recordTestResult(testName, true, performance.now() - performanceMetrics.currentTest.startTime);
    });
  });

  describe('Throughput Performance Tests', () => {
    it('should achieve target requests per second for concurrent operations', async () => {
      const testName = 'Concurrent Operations Throughput Test';
      performanceMetrics.currentTest.name = testName;
      
      console.log(`🚀 Running ${testName}...`);
      
      const concurrentUsers = 20;
      const operationsPerUser = 25;
      const totalOperations = concurrentUsers * operationsPerUser;
      
      const startTime = performance.now();
      const promises = [];
      
      // Create concurrent operations
      for (let userId = 0; userId < concurrentUsers; userId++) {
        const userPromise = (async () => {
          const user = testUsers[userId];
          const userOperations = [];
          
          for (let opId = 0; opId < operationsPerUser; opId++) {
            const operation = async () => {
              const opStartTime = performance.now();
              
              try {
                // Mix of read and write operations
                let result;
                if (opId % 3 === 0) {
                  // Write operation
                  const content = Buffer.from(`Throughput test ${userId}-${opId}`);
                  result = await services.storage.uploadFile({
                    squidId: user.squidId,
                    fileName: `throughput-${userId}-${opId}.txt`,
                    fileSize: content.length,
                    contentType: 'text/plain',
                    content
                  });
                } else {
                  // Read operation (using pre-existing content)
                  const testCid = await getTestContentCid();
                  result = await services.storage.retrieveFile({
                    squidId: user.squidId,
                    cid: testCid
                  });
                }
                
                const latency = performance.now() - opStartTime;
                
                performanceMetrics.currentTest.operations.push({
                  userId,
                  opId,
                  operation: opId % 3 === 0 ? 'write' : 'read',
                  latency,
                  success: result.success,
                  timestamp: new Date().toISOString()
                });
                
                return result;
              } catch (error) {
                const latency = performance.now() - opStartTime;
                
                performanceMetrics.currentTest.errors.push({
                  userId,
                  opId,
                  error: error.message,
                  latency,
                  timestamp: new Date().toISOString()
                });
                
                throw error;
              }
            };
            
            userOperations.push(operation());
          }
          
          return Promise.all(userOperations);
        })();
        
        promises.push(userPromise);
      }
      
      // Execute all concurrent operations
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      // Calculate throughput metrics
      const successfulOperations = results.flat().filter(r => r.success).length;
      const throughput = (successfulOperations / (totalTime / 1000)); // Operations per second
      const successRate = (successfulOperations / totalOperations) * 100;
      
      console.log(`📊 Throughput Results:`);
      console.log(`   Total Operations: ${totalOperations}`);
      console.log(`   Successful Operations: ${successfulOperations}`);
      console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} ops/sec`);
      
      // Validate throughput targets
      expect(throughput).toBeGreaterThan(50);  // At least 50 ops/sec
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      
      recordTestResult(testName, true, totalTime);
    });
  }); 
 describe('Resource Usage Tests', () => {
    it('should maintain acceptable memory usage under load', async () => {
      const testName = 'Memory Usage Under Load Test';
      performanceMetrics.currentTest.name = testName;
      
      console.log(`🚀 Running ${testName}...`);
      
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [initialMemory];
      
      // Generate memory-intensive operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        const user = testUsers[i % testUsers.length];
        const largeContent = Buffer.alloc(1024 * 1024, 'x'); // 1MB content
        
        operations.push(
          services.storage.uploadFile({
            squidId: user.squidId,
            fileName: `memory-test-${i}.dat`,
            fileSize: largeContent.length,
            contentType: 'application/octet-stream',
            content: largeContent
          })
        );
        
        // Take memory snapshots
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage());
        }
      }
      
      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage();
      memorySnapshots.push(finalMemory);
      
      // Analyze memory usage
      const maxHeapUsed = Math.max(...memorySnapshots.map(m => m.heapUsed));
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      console.log(`📊 Memory Usage Results:`);
      console.log(`   Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Max Heap: ${(maxHeapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // Validate memory usage
      expect(maxHeapUsed).toBeLessThan(512 * 1024 * 1024); // Less than 512MB
      expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase
      
      recordTestResult(testName, true, performance.now() - performanceMetrics.currentTest.startTime);
    });

    it('should handle peak traffic conditions', async () => {
      const testName = 'Peak Traffic Load Test';
      performanceMetrics.currentTest.name = testName;
      
      console.log(`🚀 Running ${testName}...`);
      
      const peakUsers = 30;
      const burstOperations = 10;
      
      const startTime = performance.now();
      const promises = [];
      
      // Simulate peak traffic burst
      for (let userId = 0; userId < peakUsers; userId++) {
        const userPromise = (async () => {
          const user = testUsers[userId];
          const operations = [];
          
          // Create burst of operations
          for (let opId = 0; opId < burstOperations; opId++) {
            const operation = services.storage.uploadFile({
              squidId: user.squidId,
              fileName: `peak-traffic-${userId}-${opId}.txt`,
              fileSize: 1024,
              contentType: 'text/plain',
              content: Buffer.from(`Peak traffic test ${userId}-${opId}`)
            });
            
            operations.push(operation);
          }
          
          return Promise.all(operations);
        })();
        
        promises.push(userPromise);
      }
      
      // Execute peak traffic
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const totalOperations = peakUsers * burstOperations;
      const successfulOperations = results.flat().filter(r => r.success).length;
      const peakThroughput = (successfulOperations / (totalTime / 1000));
      const successRate = (successfulOperations / totalOperations) * 100;
      
      console.log(`📊 Peak Traffic Results:`);
      console.log(`   Peak Users: ${peakUsers}`);
      console.log(`   Total Operations: ${totalOperations}`);
      console.log(`   Successful Operations: ${successfulOperations}`);
      console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
      console.log(`   Peak Throughput: ${peakThroughput.toFixed(2)} ops/sec`);
      console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
      
      // Validate peak traffic handling
      expect(successRate).toBeGreaterThan(80); // At least 80% success under peak load
      expect(peakThroughput).toBeGreaterThan(20); // At least 20 ops/sec peak throughput
      
      recordTestResult(testName, true, totalTime);
    });
  });

  // Helper functions
  async function setupTestContent() {
    const testContent = Buffer.from('Performance test content for reading');
    const result = await services.storage.uploadFile({
      squidId: testUsers[0].squidId,
      fileName: 'perf-test-content.txt',
      fileSize: testContent.length,
      contentType: 'text/plain',
      content: testContent
    });
    return result.cid;
  }

  async function getTestContentCid() {
    // Return a pre-existing test content CID
    return 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  }

  function recordTestResult(testName, passed, duration) {
    performanceMetrics.tests.push({
      name: testName,
      passed,
      duration: duration.toFixed(2) + 'ms',
      operations: performanceMetrics.currentTest.operations.length,
      errors: performanceMetrics.currentTest.errors.length,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${duration.toFixed(2)}ms (${performanceMetrics.currentTest.operations.length} ops)`);
  }
});

// Resource Monitor Class
class ResourceMonitor {
  constructor() {
    this.metrics = [];
    this.monitoring = false;
    this.interval = null;
  }

  async start() {
    this.monitoring = true;
    this.interval = setInterval(() => {
      if (this.monitoring) {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.metrics.push({
          timestamp: new Date().toISOString(),
          memory: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          system: {
            loadAverage: os.loadavg(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem()
          }
        });
      }
    }, 1000); // Collect metrics every second
  }

  async stop() {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  getMetrics() {
    return this.metrics;
  }
}

// Performance Report Generator
function generatePerformanceReport(performanceMetrics, resourceMetrics) {
  const totalTests = performanceMetrics.tests.length;
  const passedTests = performanceMetrics.tests.filter(t => t.passed).length;
  const totalOperations = performanceMetrics.tests.reduce((sum, t) => sum + t.operations, 0);
  const totalErrors = performanceMetrics.tests.reduce((sum, t) => sum + t.errors, 0);
  
  const memoryMetrics = resourceMetrics.map(m => m.memory.heapUsed);
  const maxMemory = Math.max(...memoryMetrics);
  const avgMemory = memoryMetrics.reduce((sum, m) => sum + m, 0) / memoryMetrics.length;
  
  return {
    summary: {
      totalTests,
      passedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
      totalOperations,
      totalErrors,
      errorRate: ((totalErrors / totalOperations) * 100).toFixed(2) + '%'
    },
    performance: {
      sloViolations: performanceMetrics.sloViolations.length,
      criticalViolations: performanceMetrics.sloViolations.filter(v => v.violation > v.threshold * 0.5).length
    },
    resources: {
      maxMemoryUsage: (maxMemory / 1024 / 1024).toFixed(2) + ' MB',
      avgMemoryUsage: (avgMemory / 1024 / 1024).toFixed(2) + ' MB',
      memoryDataPoints: memoryMetrics.length
    }
  };
}

function validateSLOCompliance(sloViolations) {
  if (sloViolations.length > 0) {
    console.warn('⚠️ SLO Violations Detected:');
    sloViolations.forEach(violation => {
      console.warn(`   ${violation.test}: ${violation.metric} = ${violation.value.toFixed(2)}ms (threshold: ${violation.threshold}ms)`);
    });
  } else {
    console.log('✅ All SLOs met successfully');
  }
}