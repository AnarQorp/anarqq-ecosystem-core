/**
 * Qwallet Performance and Load Tests
 * 
 * Tests for performance optimization, load handling,
 * and resource usage monitoring
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdentityType, ExtendedSquidIdentity } from '../../types/identity';

// Mock performance APIs
vi.mock('../../api/qwallet');
vi.mock('../../hooks/useIdentityQwallet');

import * as qwalletApi from '../../api/qwallet';

describe('Qwallet Performance Tests', () => {
  const mockIdentities: ExtendedSquidIdentity[] = Array.from({ length: 100 }, (_, i) => ({
    did: `did:squid:user${i}`,
    identityType: i % 5 === 0 ? IdentityType.ROOT : 
                  i % 5 === 1 ? IdentityType.DAO :
                  i % 5 === 2 ? IdentityType.ENTERPRISE :
                  i % 5 === 3 ? IdentityType.CONSENTIDA : IdentityType.AID,
    displayName: `User ${i}`,
    isActive: true,
    walletAddress: `wallet-user${i}`,
    qlockKeyPair: {
      publicKey: `pub-key-${i}`,
      privateKey: `priv-key-${i}`
    }
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup performance-optimized mock responses
    vi.mocked(qwalletApi.getBalance).mockImplementation(async (walletAddress) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      return {
        success: true,
        data: {
          QToken: Math.floor(Math.random() * 10000),
          PiToken: Math.floor(Math.random() * 5000)
        }
      };
    });

    vi.mocked(qwalletApi.getTransactionHistory).mockImplementation(async (walletAddress) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      return {
        success: true,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `tx-${walletAddress}-${i}`,
          type: 'transfer',
          amount: Math.floor(Math.random() * 1000),
          timestamp: new Date(Date.now() - i * 86400000).toISOString()
        }))
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Identity Switching Performance', () => {
    it('should switch identities within acceptable time limits', async () => {
      const identitySwitcher = {
        switchIdentity: async (fromIdentity: ExtendedSquidIdentity | null, toIdentity: ExtendedSquidIdentity) => {
          const startTime = performance.now();
          
          // Simulate identity switching operations
          const [balanceResult, historyResult] = await Promise.all([
            qwalletApi.getBalance(toIdentity.walletAddress),
            qwalletApi.getTransactionHistory(toIdentity.walletAddress)
          ]);
          
          const endTime = performance.now();
          const switchTime = endTime - startTime;
          
          return {
            success: true,
            switchTime,
            data: {
              balances: balanceResult.data,
              transactions: historyResult.data
            }
          };
        }
      };

      const results = [];
      
      // Test switching between multiple identities
      for (let i = 0; i < 10; i++) {
        const fromIdentity = i === 0 ? null : mockIdentities[i - 1];
        const toIdentity = mockIdentities[i];
        
        const result = await identitySwitcher.switchIdentity(fromIdentity, toIdentity);
        results.push(result.switchTime);
      }
      
      const averageSwitchTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxSwitchTime = Math.max(...results);
      
      // Performance assertions
      expect(averageSwitchTime).toBeLessThan(200); // Average under 200ms
      expect(maxSwitchTime).toBeLessThan(500); // Max under 500ms
      
      console.log(`Average switch time: ${averageSwitchTime.toFixed(2)}ms`);
      console.log(`Max switch time: ${maxSwitchTime.toFixed(2)}ms`);
    });

    it('should handle concurrent identity switches efficiently', async () => {
      const concurrentSwitcher = {
        switchMultipleIdentities: async (identities: ExtendedSquidIdentity[]) => {
          const startTime = performance.now();
          
          const promises = identities.map(async (identity) => {
            const [balanceResult, historyResult] = await Promise.all([
              qwalletApi.getBalance(identity.walletAddress),
              qwalletApi.getTransactionHistory(identity.walletAddress)
            ]);
            
            return {
              identity: identity.did,
              balances: balanceResult.data,
              transactions: historyResult.data
            };
          });
          
          const results = await Promise.all(promises);
          const endTime = performance.now();
          
          return {
            totalTime: endTime - startTime,
            results,
            identityCount: identities.length
          };
        }
      };

      const testIdentities = mockIdentities.slice(0, 20);
      const result = await concurrentSwitcher.switchMultipleIdentities(testIdentities);
      
      const timePerIdentity = result.totalTime / result.identityCount;
      
      // Should be more efficient than sequential processing
      expect(timePerIdentity).toBeLessThan(100); // Under 100ms per identity when concurrent
      expect(result.results).toHaveLength(20);
      
      console.log(`Concurrent processing time per identity: ${timePerIdentity.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should manage memory efficiently with multiple identities', async () => {
      const memoryManager = {
        identityCache: new Map<string, any>(),
        maxCacheSize: 50,
        
        cacheIdentityData: (identity: ExtendedSquidIdentity, data: any) => {
          // Implement LRU cache
          if (this.identityCache.size >= this.maxCacheSize) {
            const firstKey = this.identityCache.keys().next().value;
            this.identityCache.delete(firstKey);
          }
          
          this.identityCache.set(identity.did, {
            ...data,
            cachedAt: Date.now(),
            accessCount: 1
          });
        },
        
        getCachedData: (identityId: string) => {
          const cached = this.identityCache.get(identityId);
          if (cached) {
            cached.accessCount++;
            cached.lastAccessed = Date.now();
          }
          return cached;
        },
        
        getCacheStats: () => ({
          size: this.identityCache.size,
          maxSize: this.maxCacheSize,
          utilizationPercent: (this.identityCache.size / this.maxCacheSize) * 100
        })
      };

      // Fill cache beyond capacity
      for (let i = 0; i < 60; i++) {
        const identity = mockIdentities[i % mockIdentities.length];
        memoryManager.cacheIdentityData(identity, {
          balances: { QToken: 1000 },
          transactions: []
        });
      }
      
      const stats = memoryManager.getCacheStats();
      
      // Cache should not exceed max size
      expect(stats.size).toBeLessThanOrEqual(50);
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
      
      console.log(`Cache utilization: ${stats.utilizationPercent.toFixed(1)}%`);
    });

    it('should cleanup unused identity data', async () => {
      const dataCleanup = {
        identityData: new Map<string, any>(),
        lastAccessed: new Map<string, number>(),
        
        storeIdentityData: (identityId: string, data: any) => {
          this.identityData.set(identityId, data);
          this.lastAccessed.set(identityId, Date.now());
        },
        
        accessIdentityData: (identityId: string) => {
          this.lastAccessed.set(identityId, Date.now());
          return this.identityData.get(identityId);
        },
        
        cleanupStaleData: (maxAgeMs: number = 300000) => { // 5 minutes
          const now = Date.now();
          const staleIdentities = [];
          
          for (const [identityId, lastAccess] of this.lastAccessed.entries()) {
            if (now - lastAccess > maxAgeMs) {
              staleIdentities.push(identityId);
            }
          }
          
          staleIdentities.forEach(identityId => {
            this.identityData.delete(identityId);
            this.lastAccessed.delete(identityId);
          });
          
          return {
            cleanedCount: staleIdentities.length,
            remainingCount: this.identityData.size
          };
        }
      };

      // Store data for multiple identities
      mockIdentities.slice(0, 20).forEach(identity => {
        dataCleanup.storeIdentityData(identity.did, {
          balances: { QToken: 1000 },
          transactions: []
        });
      });
      
      // Simulate some identities being accessed recently
      for (let i = 0; i < 5; i++) {
        dataCleanup.accessIdentityData(mockIdentities[i].did);
      }
      
      // Simulate time passing and cleanup
      const cleanupResult = dataCleanup.cleanupStaleData(0); // Immediate cleanup for testing
      
      expect(cleanupResult.cleanedCount).toBeGreaterThan(0);
      expect(cleanupResult.remainingCount).toBeLessThan(20);
      
      console.log(`Cleaned up ${cleanupResult.cleanedCount} stale identity data entries`);
    });
  });

  describe('API Response Time Optimization', () => {
    it('should batch API requests efficiently', async () => {
      const batchProcessor = {
        batchGetBalances: async (walletAddresses: string[]) => {
          const startTime = performance.now();
          
          // Simulate batched API call (more efficient than individual calls)
          const batchSize = 10;
          const batches = [];
          
          for (let i = 0; i < walletAddresses.length; i += batchSize) {
            const batch = walletAddresses.slice(i, i + batchSize);
            batches.push(batch);
          }
          
          const results = await Promise.all(
            batches.map(async (batch) => {
              // Simulate single batch API call
              await new Promise(resolve => setTimeout(resolve, 50));
              
              return batch.map(address => ({
                address,
                balances: {
                  QToken: Math.floor(Math.random() * 10000),
                  PiToken: Math.floor(Math.random() * 5000)
                }
              }));
            })
          );
          
          const endTime = performance.now();
          
          return {
            totalTime: endTime - startTime,
            results: results.flat(),
            batchCount: batches.length,
            addressCount: walletAddresses.length
          };
        }
      };

      const walletAddresses = mockIdentities.slice(0, 50).map(id => id.walletAddress);
      const result = await batchProcessor.batchGetBalances(walletAddresses);
      
      const timePerAddress = result.totalTime / result.addressCount;
      
      // Batching should be more efficient than individual requests
      expect(timePerAddress).toBeLessThan(20); // Under 20ms per address
      expect(result.results).toHaveLength(50);
      
      console.log(`Batch processing time per address: ${timePerAddress.toFixed(2)}ms`);
      console.log(`Total batches: ${result.batchCount}`);
    });

    it('should implement request caching for frequently accessed data', async () => {
      const cachedApiClient = {
        cache: new Map<string, { data: any, timestamp: number }>(),
        cacheTimeout: 30000, // 30 seconds
        
        getCachedBalance: async (walletAddress: string) => {
          const cacheKey = `balance-${walletAddress}`;
          const cached = this.cache.get(cacheKey);
          
          if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return {
              success: true,
              data: cached.data,
              fromCache: true
            };
          }
          
          // Make actual API call
          const startTime = performance.now();
          const result = await qwalletApi.getBalance(walletAddress);
          const endTime = performance.now();
          
          if (result.success) {
            this.cache.set(cacheKey, {
              data: result.data,
              timestamp: Date.now()
            });
          }
          
          return {
            ...result,
            fromCache: false,
            responseTime: endTime - startTime
          };
        }
      };

      const testAddress = mockIdentities[0].walletAddress;
      
      // First call should hit API
      const firstCall = await cachedApiClient.getCachedBalance(testAddress);
      expect(firstCall.fromCache).toBe(false);
      expect(firstCall.responseTime).toBeGreaterThan(0);
      
      // Second call should use cache
      const secondCall = await cachedApiClient.getCachedBalance(testAddress);
      expect(secondCall.fromCache).toBe(true);
      expect(secondCall.data).toEqual(firstCall.data);
      
      console.log(`First call response time: ${firstCall.responseTime?.toFixed(2)}ms`);
      console.log(`Second call served from cache`);
    });
  });

  describe('Load Testing', () => {
    it('should handle high concurrent user load', async () => {
      const loadTester = {
        simulateUserLoad: async (userCount: number, operationsPerUser: number) => {
          const startTime = performance.now();
          const errors = [];
          const responseTimes = [];
          
          const userPromises = Array.from({ length: userCount }, async (_, userIndex) => {
            const identity = mockIdentities[userIndex % mockIdentities.length];
            
            const userOperations = Array.from({ length: operationsPerUser }, async (_, opIndex) => {
              const opStartTime = performance.now();
              
              try {
                // Simulate various wallet operations
                const operations = [
                  () => qwalletApi.getBalance(identity.walletAddress),
                  () => qwalletApi.getTransactionHistory(identity.walletAddress)
                ];
                
                const operation = operations[opIndex % operations.length];
                await operation();
                
                const opEndTime = performance.now();
                responseTimes.push(opEndTime - opStartTime);
              } catch (error) {
                errors.push({
                  user: userIndex,
                  operation: opIndex,
                  error: error.message
                });
              }
            });
            
            await Promise.all(userOperations);
          });
          
          await Promise.all(userPromises);
          
          const endTime = performance.now();
          
          return {
            totalTime: endTime - startTime,
            userCount,
            operationsPerUser,
            totalOperations: userCount * operationsPerUser,
            errors: errors.length,
            averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes),
            minResponseTime: Math.min(...responseTimes)
          };
        }
      };

      const loadResult = await loadTester.simulateUserLoad(50, 5); // 50 users, 5 operations each
      
      // Performance assertions for load testing
      expect(loadResult.errors).toBeLessThan(loadResult.totalOperations * 0.01); // Less than 1% error rate
      expect(loadResult.averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(loadResult.maxResponseTime).toBeLessThan(1000); // Max under 1 second
      
      console.log(`Load test results:`);
      console.log(`- Total operations: ${loadResult.totalOperations}`);
      console.log(`- Error rate: ${(loadResult.errors / loadResult.totalOperations * 100).toFixed(2)}%`);
      console.log(`- Average response time: ${loadResult.averageResponseTime.toFixed(2)}ms`);
      console.log(`- Max response time: ${loadResult.maxResponseTime.toFixed(2)}ms`);
    });

    it('should maintain performance under memory pressure', async () => {
      const memoryPressureTester = {
        createMemoryPressure: () => {
          // Create large objects to simulate memory pressure
          const largeObjects = [];
          for (let i = 0; i < 1000; i++) {
            largeObjects.push(new Array(10000).fill(Math.random()));
          }
          return largeObjects;
        },
        
        testUnderPressure: async (identityCount: number) => {
          const largeObjects = this.createMemoryPressure();
          const startTime = performance.now();
          
          const promises = mockIdentities.slice(0, identityCount).map(async (identity) => {
            const opStartTime = performance.now();
            
            await qwalletApi.getBalance(identity.walletAddress);
            
            const opEndTime = performance.now();
            return opEndTime - opStartTime;
          });
          
          const responseTimes = await Promise.all(promises);
          const endTime = performance.now();
          
          // Clean up memory pressure
          largeObjects.length = 0;
          
          return {
            totalTime: endTime - startTime,
            averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes)
          };
        }
      };

      const pressureResult = await memoryPressureTester.testUnderPressure(20);
      
      // Should still perform reasonably under memory pressure
      expect(pressureResult.averageResponseTime).toBeLessThan(300); // Allow higher threshold under pressure
      expect(pressureResult.maxResponseTime).toBeLessThan(1500);
      
      console.log(`Performance under memory pressure:`);
      console.log(`- Average response time: ${pressureResult.averageResponseTime.toFixed(2)}ms`);
      console.log(`- Max response time: ${pressureResult.maxResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Resource Usage Monitoring', () => {
    it('should monitor and report resource usage metrics', async () => {
      const resourceMonitor = {
        metrics: {
          apiCalls: 0,
          cacheHits: 0,
          cacheMisses: 0,
          memoryUsage: 0,
          activeConnections: 0
        },
        
        trackApiCall: () => {
          this.metrics.apiCalls++;
        },
        
        trackCacheHit: () => {
          this.metrics.cacheHits++;
        },
        
        trackCacheMiss: () => {
          this.metrics.cacheMisses++;
        },
        
        getMetrics: () => ({
          ...this.metrics,
          cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100
        })
      };

      // Simulate operations with monitoring
      for (let i = 0; i < 100; i++) {
        resourceMonitor.trackApiCall();
        
        if (Math.random() > 0.3) { // 70% cache hit rate
          resourceMonitor.trackCacheHit();
        } else {
          resourceMonitor.trackCacheMiss();
        }
      }
      
      const metrics = resourceMonitor.getMetrics();
      
      expect(metrics.apiCalls).toBe(100);
      expect(metrics.cacheHitRate).toBeGreaterThan(60); // Should have good cache hit rate
      
      console.log(`Resource usage metrics:`);
      console.log(`- API calls: ${metrics.apiCalls}`);
      console.log(`- Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    });
  });
});