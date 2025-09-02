/**
 * Performance benchmarks for Identity Switch Optimizer
 * Tests switching performance optimizations and benchmarks
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  identitySwitchOptimizer, 
  getSwitchMetrics, 
  getSwitchPredictions,
  resetSwitchOptimizer,
  configureSwitchOptimization
} from '../IdentitySwitchOptimizer';
import { ExtendedSquidIdentity, IdentityType, IdentityStatus, GovernanceType, PrivacyLevel } from '@/types/identity';

// Mock the cache manager and identity store
vi.mock('../IdentityCacheManager', () => ({
  identityCacheManager: {
    getIdentity: vi.fn()
  }
}));

vi.mock('@/state/identity', () => ({
  useIdentityStore: {
    getState: vi.fn(() => ({
      activeIdentity: null,
      setActiveIdentity: vi.fn()
    }))
  }
}));

describe('Identity Switch Optimizer Performance Tests', () => {
  const createMockIdentity = (id: string): ExtendedSquidIdentity => ({
    did: id,
    name: `Identity ${id}`,
    type: IdentityType.ROOT,
    rootId: id,
    children: [],
    depth: 0,
    path: [],
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      type: IdentityType.ROOT,
      requiresKYC: false,
      requiresDAOGovernance: false,
      requiresParentalConsent: false,
      maxDepth: 3,
      allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
    },
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: () => true,
      canPerformAction: () => true,
      governanceLevel: GovernanceType.SELF
    },
    status: IdentityStatus.ACTIVE,
    qonsentProfileId: `qonsent-${id}`,
    qlockKeyPair: {
      publicKey: `pub-${id}`,
      privateKey: `priv-${id}`,
      algorithm: 'ECDSA',
      keySize: 256,
      createdAt: '2024-01-01T00:00:00Z'
    },
    privacyLevel: PrivacyLevel.PUBLIC,
    tags: ['test'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-01T00:00:00Z',
    kyc: {
      required: false,
      submitted: false,
      approved: false
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: false
  });

  beforeEach(() => {
    resetSwitchOptimizer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetSwitchOptimizer();
  });

  describe('Switch Performance Optimization', () => {
    it('should demonstrate significant performance improvement with context preparation', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: createMockIdentity('current-identity'),
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      const targetIdentity = createMockIdentity('target-identity');
      
      // Mock slow context preparation
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate slow load
        return did === targetIdentity.did ? targetIdentity : null;
      });

      mockSetActiveIdentity.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20)); // Simulate state update
      });

      // First switch - no preparation (should be slow)
      const startTime1 = performance.now();
      await identitySwitchOptimizer.optimizedSwitch(targetIdentity.did);
      const time1 = performance.now() - startTime1;

      // Prepare context for next switch
      await identitySwitchOptimizer.prepareContext(targetIdentity.did);

      // Second switch - with preparation (should be faster)
      const startTime2 = performance.now();
      await identitySwitchOptimizer.optimizedSwitch(targetIdentity.did);
      const time2 = performance.now() - startTime2;

      expect(time2).toBeLessThan(time1 * 0.7); // At least 30% faster
      expect(time2).toBeLessThan(50); // Should be under 50ms with preparation

      const metrics = getSwitchMetrics();
      expect(metrics.totalSwitches).toBe(2);
      expect(metrics.contextPrepHitRate).toBeGreaterThan(0); // Should have some hits
    });

    it('should handle concurrent switches efficiently', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: createMockIdentity('current-identity'),
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      const identities = Array.from({ length: 5 }, (_, i) => createMockIdentity(`identity-${i}`));
      
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return identities.find(id => id.did === did) || null;
      });

      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Simulate concurrent switch attempts
      const concurrentSwitches = identities.map(identity => 
        identitySwitchOptimizer.optimizedSwitch(identity.did)
      );

      const startTime = performance.now();
      await Promise.all(concurrentSwitches);
      const totalTime = performance.now() - startTime;

      // Should handle concurrency efficiently
      expect(totalTime).toBeLessThan(200); // Should be much faster than sequential
      
      const metrics = getSwitchMetrics();
      expect(metrics.totalSwitches).toBe(5);
      expect(metrics.averageSwitchTime).toBeLessThan(100);
    });
  });

  describe('Predictive Preloading Performance', () => {
    it('should improve performance through predictive preloading', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      const identities = Array.from({ length: 3 }, (_, i) => createMockIdentity(`pattern-${i}`));
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: identities[0],
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 30)); // Simulate load time
        return identities.find(id => id.did === did) || null;
      });

      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Establish a pattern: 0 -> 1 -> 2 -> 0 -> 1 -> 2
      const pattern = [1, 2, 0, 1, 2, 0, 1, 2];
      
      for (const index of pattern) {
        await identitySwitchOptimizer.optimizedSwitch(identities[index].did);
      }

      // Now switches should be faster due to predictive loading
      const startTime = performance.now();
      await identitySwitchOptimizer.optimizedSwitch(identities[1].did); // Should be predicted
      const switchTime = performance.now() - startTime;

      expect(switchTime).toBeLessThan(20); // Should be very fast due to prediction
      
      const metrics = getSwitchMetrics();
      expect(metrics.totalSwitches).toBe(9);
      expect(metrics.contextPrepHitRate).toBeGreaterThan(0.3); // Should have good hit rate
    });

    it('should generate accurate predictions based on usage patterns', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      const identities = Array.from({ length: 5 }, (_, i) => createMockIdentity(`predict-${i}`));
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: identities[0],
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      mockGetIdentity.mockResolvedValue(identities[0]);
      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Create strong pattern: identity-0 frequently switches to identity-1 and identity-2
      const switches = [
        [0, 1], [1, 0], [0, 2], [2, 0], [0, 1], [1, 0], 
        [0, 2], [2, 0], [0, 1], [1, 0], [0, 3], [3, 0]
      ];

      for (const [from, to] of switches) {
        vi.mocked(useIdentityStore.getState).mockReturnValue({
          activeIdentity: identities[from],
          setActiveIdentity: mockSetActiveIdentity
        } as any);
        
        await identitySwitchOptimizer.optimizedSwitch(identities[to].did);
      }

      // Get predictions for identity-0
      const predictions = getSwitchPredictions(identities[0].did);
      
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0].identityId).toMatch(/predict-[12]/); // Should predict 1 or 2
      expect(predictions[0].confidence).toBeGreaterThan(0.6);
      expect(predictions[0].reason).toBe('pattern');
    });
  });

  describe('State Update Batching Performance', () => {
    it('should batch state updates for better performance', async () => {
      configureSwitchOptimization({
        enableStateBatching: true,
        batchUpdateDelay: 10
      });

      const updateSpy = vi.fn();
      
      // Mock the internal state update method
      (identitySwitchOptimizer as any).applyStateUpdate = updateSpy;

      // Trigger multiple rapid updates
      const updates = Array.from({ length: 10 }, (_, i) => [`key-${i}`, `value-${i}`]);
      
      const startTime = performance.now();
      updates.forEach(([key, value]) => {
        identitySwitchOptimizer.batchStateUpdate(key, value);
      });
      
      // Wait for batch to flush
      await new Promise(resolve => setTimeout(resolve, 20));
      const batchTime = performance.now() - startTime;

      expect(batchTime).toBeLessThan(50); // Should be fast
      expect(updateSpy).toHaveBeenCalledTimes(10); // All updates should be applied
    });

    it('should handle high-frequency updates efficiently', async () => {
      configureSwitchOptimization({
        enableStateBatching: true,
        batchUpdateDelay: 5
      });

      const updateCount = 100;
      const updates = Array.from({ length: updateCount }, (_, i) => [`batch-key-${i}`, `batch-value-${i}`]);
      
      const startTime = performance.now();
      
      // Rapid-fire updates
      updates.forEach(([key, value]) => {
        identitySwitchOptimizer.batchStateUpdate(key, value);
      });
      
      // Wait for all batches to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(100); // Should handle high frequency efficiently
    });
  });

  describe('Memory and Resource Management', () => {
    it('should manage memory efficiently with many prepared contexts', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      
      // Create many identities
      const identities = Array.from({ length: 50 }, (_, i) => createMockIdentity(`memory-test-${i}`));
      
      mockGetIdentity.mockImplementation(async (did) => {
        return identities.find(id => id.did === did) || null;
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Prepare contexts for many identities
      const preparePromises = identities.slice(0, 20).map(identity => 
        identitySwitchOptimizer.prepareContext(identity.did)
      );
      
      await Promise.all(preparePromises);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
      
      // Should have prepared contexts
      const metrics = getSwitchMetrics();
      expect(metrics.totalSwitches).toBe(0); // No switches yet, just preparations
    });

    it('should cleanup expired preparations automatically', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      
      const identity = createMockIdentity('cleanup-test');
      mockGetIdentity.mockResolvedValue(identity);

      // Configure short expiry for testing
      configureSwitchOptimization({
        contextCacheExpiry: 100 // 100ms
      });

      // Prepare context
      await identitySwitchOptimizer.prepareContext(identity.did);
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup by accessing internal state
      const preparedContexts = (identitySwitchOptimizer as any).preparedContexts;
      expect(preparedContexts.size).toBe(1); // Still there before cleanup
      
      // Trigger cleanup interval
      (identitySwitchOptimizer as any).cleanupExpiredPreparations();
      
      expect(preparedContexts.size).toBe(0); // Should be cleaned up
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for switch operations', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      const identity = createMockIdentity('benchmark-test');
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: createMockIdentity('current'),
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      mockGetIdentity.mockResolvedValue(identity);
      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Benchmark: Context preparation should be < 100ms
      const prepareStartTime = performance.now();
      await identitySwitchOptimizer.prepareContext(identity.did);
      const prepareTime = performance.now() - prepareStartTime;
      
      expect(prepareTime).toBeLessThan(100);

      // Benchmark: Optimized switch with prepared context should be < 50ms
      const switchStartTime = performance.now();
      await identitySwitchOptimizer.optimizedSwitch(identity.did);
      const switchTime = performance.now() - switchStartTime;
      
      expect(switchTime).toBeLessThan(50);

      // Benchmark: Predictions generation should be < 10ms
      const predictStartTime = performance.now();
      getSwitchPredictions(identity.did);
      const predictTime = performance.now() - predictStartTime;
      
      expect(predictTime).toBeLessThan(10);

      // Benchmark: Metrics calculation should be < 5ms
      const metricsStartTime = performance.now();
      getSwitchMetrics();
      const metricsTime = performance.now() - metricsStartTime;
      
      expect(metricsTime).toBeLessThan(5);
    });

    it('should maintain performance under load', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      const identities = Array.from({ length: 20 }, (_, i) => createMockIdentity(`load-test-${i}`));
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: identities[0],
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 5)); // Small delay
        return identities.find(id => id.did === did) || null;
      });

      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Perform many switches rapidly
      const switchPromises = Array.from({ length: 50 }, (_, i) => 
        identitySwitchOptimizer.optimizedSwitch(identities[i % identities.length].did)
      );

      const startTime = performance.now();
      await Promise.all(switchPromises);
      const totalTime = performance.now() - startTime;

      // Should handle load efficiently
      expect(totalTime).toBeLessThan(2000); // Less than 2 seconds for 50 switches
      
      const metrics = getSwitchMetrics();
      expect(metrics.totalSwitches).toBe(50);
      expect(metrics.averageSwitchTime).toBeLessThan(100); // Average should be reasonable
      expect(metrics.contextPrepHitRate).toBeGreaterThan(0.2); // Should have some cache hits
    });

    it('should demonstrate performance improvement over time', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const { useIdentityStore } = await import('@/state/identity');
      
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockSetActiveIdentity = vi.fn();
      
      const identities = Array.from({ length: 3 }, (_, i) => createMockIdentity(`improve-${i}`));
      
      vi.mocked(useIdentityStore.getState).mockReturnValue({
        activeIdentity: identities[0],
        setActiveIdentity: mockSetActiveIdentity
      } as any);

      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return identities.find(id => id.did === did) || null;
      });

      mockSetActiveIdentity.mockResolvedValue(undefined);

      // Measure initial switches (cold)
      const initialSwitches = [1, 2, 0, 1, 2];
      const initialTimes: number[] = [];
      
      for (const index of initialSwitches) {
        const startTime = performance.now();
        await identitySwitchOptimizer.optimizedSwitch(identities[index].did);
        initialTimes.push(performance.now() - startTime);
      }

      // Measure later switches (warm)
      const laterSwitches = [0, 1, 2, 0, 1];
      const laterTimes: number[] = [];
      
      for (const index of laterSwitches) {
        const startTime = performance.now();
        await identitySwitchOptimizer.optimizedSwitch(identities[index].did);
        laterTimes.push(performance.now() - startTime);
      }

      const initialAverage = initialTimes.reduce((sum, time) => sum + time, 0) / initialTimes.length;
      const laterAverage = laterTimes.reduce((sum, time) => sum + time, 0) / laterTimes.length;

      // Later switches should be faster due to caching and preparation
      expect(laterAverage).toBeLessThan(initialAverage * 0.8); // At least 20% improvement
      
      const metrics = getSwitchMetrics();
      expect(metrics.contextPrepHitRate).toBeGreaterThan(0.4); // Should have good hit rate
    });
  });
});