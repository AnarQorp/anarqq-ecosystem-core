/**
 * Performance tests for Identity Cache Manager
 * Tests caching effectiveness and performance optimizations
 * Requirements: 1.1, 1.2, 4.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { identityCacheManager, getCacheStats, clearAllCaches } from '../IdentityCacheManager';
import { ExtendedSquidIdentity, IdentityType, IdentityStatus, GovernanceType, PrivacyLevel } from '@/types/identity';

// Mock the identity storage
vi.mock('@/utils/storage/identityStorage', () => ({
  identityStorage: {
    getIdentity: vi.fn(),
    getIdentityTree: vi.fn(),
    storeIdentity: vi.fn(),
    storeIdentityTree: vi.fn()
  }
}));

describe('Identity Cache Manager Performance Tests', () => {
  const mockIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:test-123',
    name: 'Test Identity',
    type: IdentityType.ROOT,
    rootId: 'did:squid:test-123',
    children: ['did:squid:child-1', 'did:squid:child-2'],
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
    qonsentProfileId: 'qonsent-test',
    qlockKeyPair: {
      publicKey: 'pub-test',
      privateKey: 'priv-test',
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
  };

  beforeEach(() => {
    clearAllCaches();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllCaches();
  });

  describe('Cache Hit Performance', () => {
    it('should demonstrate significant performance improvement with cache hits', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      
      // Mock storage to simulate slow database access
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      mockGetIdentity.mockImplementation(async (did) => {
        // Simulate database latency
        await new Promise(resolve => setTimeout(resolve, 50));
        return did === mockIdentity.did ? mockIdentity : null;
      });

      // First access - cache miss (should be slow)
      const startTime1 = performance.now();
      const result1 = await identityCacheManager.getIdentity(mockIdentity.did);
      const time1 = performance.now() - startTime1;

      expect(result1).toEqual(mockIdentity);
      expect(time1).toBeGreaterThan(40); // Should include storage latency

      // Second access - cache hit (should be fast)
      const startTime2 = performance.now();
      const result2 = await identityCacheManager.getIdentity(mockIdentity.did);
      const time2 = performance.now() - startTime2;

      expect(result2).toEqual(mockIdentity);
      expect(time2).toBeLessThan(10); // Should be much faster
      expect(time1).toBeGreaterThan(time2 * 4); // At least 4x faster

      // Verify cache stats
      const stats = getCacheStats();
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should maintain high hit rates with repeated access patterns', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      // Create multiple test identities
      const identities = Array.from({ length: 10 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:test-${i}`,
        name: `Test Identity ${i}`
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return identities.find(id => id.did === did) || null;
      });

      // Simulate realistic access pattern
      const accessPattern = [0, 1, 0, 2, 1, 0, 3, 1, 2, 0, 4, 1, 0, 2];
      
      for (const index of accessPattern) {
        await identityCacheManager.getIdentity(identities[index].did);
      }

      const stats = getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0.6); // Should achieve >60% hit rate
      expect(stats.totalHits).toBeGreaterThan(stats.totalMisses);
    });
  });

  describe('Cache Level Management', () => {
    it('should promote frequently accessed identities to hot cache', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      mockGetIdentity.mockResolvedValue(mockIdentity);

      // Access the same identity multiple times to trigger promotion
      for (let i = 0; i < 12; i++) {
        await identityCacheManager.getIdentity(mockIdentity.did);
        // Small delay to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const stats = getCacheStats();
      expect(stats.levelStats.HOT.entries).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0.9); // Should be very high
    });

    it('should handle cache capacity limits effectively', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      // Create many identities to test capacity limits
      const identities = Array.from({ length: 100 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:capacity-test-${i}`,
        name: `Capacity Test ${i}`
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        return identities.find(id => id.did === did) || null;
      });

      // Access all identities once
      for (const identity of identities) {
        await identityCacheManager.getIdentity(identity.did);
      }

      const stats = getCacheStats();
      
      // Should not exceed configured limits
      expect(stats.levelStats.HOT.entries).toBeLessThanOrEqual(10);
      expect(stats.levelStats.WARM.entries).toBeLessThanOrEqual(50);
      expect(stats.levelStats.COLD.entries).toBeLessThanOrEqual(200);
      
      // Total cached should be reasonable
      const totalCached = stats.levelStats.HOT.entries + 
                         stats.levelStats.WARM.entries + 
                         stats.levelStats.COLD.entries;
      expect(totalCached).toBeLessThanOrEqual(260);
    });
  });

  describe('Predictive Loading', () => {
    it('should improve performance through predictive loading', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      const identities = Array.from({ length: 5 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:predict-${i}`,
        name: `Predict Test ${i}`
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return identities.find(id => id.did === did) || null;
      });

      // Establish a pattern: 0 -> 1 -> 2 -> 0 -> 1 -> 2
      const pattern = [0, 1, 2, 0, 1, 2, 0, 1, 2];
      
      for (const index of pattern) {
        await identityCacheManager.getIdentity(identities[index].did);
      }

      // Now access should be faster due to predictive loading
      const startTime = performance.now();
      await identityCacheManager.getIdentity(identities[1].did); // Should be predicted
      const accessTime = performance.now() - startTime;

      expect(accessTime).toBeLessThan(10); // Should be fast due to prediction
      
      const stats = getCacheStats();
      expect(stats.preloadStats.triggered).toBeGreaterThan(0);
    });
  });

  describe('Cache Invalidation Performance', () => {
    it('should handle batch invalidation efficiently', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      const identities = Array.from({ length: 20 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:invalidate-${i}`,
        name: `Invalidate Test ${i}`
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        return identities.find(id => id.did === did) || null;
      });

      // Load all identities into cache
      for (const identity of identities) {
        await identityCacheManager.getIdentity(identity.did);
      }

      // Invalidate multiple identities
      const startTime = performance.now();
      identities.slice(0, 10).forEach(identity => {
        identityCacheManager.invalidateIdentity(identity.did);
      });
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const invalidationTime = performance.now() - startTime;
      
      expect(invalidationTime).toBeLessThan(200); // Should be fast
      
      // Verify invalidation worked
      const stats = getCacheStats();
      const totalCached = stats.levelStats.HOT.entries + 
                         stats.levelStats.WARM.entries + 
                         stats.levelStats.COLD.entries;
      expect(totalCached).toBeLessThan(20); // Some should be invalidated
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      // Create large identities to test memory management
      const largeIdentities = Array.from({ length: 50 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:large-${i}`,
        name: `Large Identity ${i}`,
        description: 'A'.repeat(1000), // Large description
        tags: Array.from({ length: 100 }, (_, j) => `tag-${j}`), // Many tags
        auditLog: Array.from({ length: 50 }, (_, j) => ({
          id: `audit-${j}`,
          identityId: `did:squid:large-${i}`,
          action: 'UPDATED' as const,
          timestamp: new Date().toISOString(),
          metadata: { data: 'B'.repeat(100) }
        }))
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        return largeIdentities.find(id => id.did === did) || null;
      });

      // Load all large identities
      for (const identity of largeIdentities) {
        await identityCacheManager.getIdentity(identity.did);
      }

      const stats = getCacheStats();
      
      // Memory usage should be tracked and reasonable
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.totalSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      
      // Cache should still be effective
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent access efficiently', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return did === mockIdentity.did ? mockIdentity : null;
      });

      // Simulate concurrent access
      const concurrentPromises = Array.from({ length: 20 }, () =>
        identityCacheManager.getIdentity(mockIdentity.did)
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentPromises);
      const totalTime = performance.now() - startTime;

      // All should return the same identity
      results.forEach(result => {
        expect(result).toEqual(mockIdentity);
      });

      // Should be faster than sequential access due to caching
      expect(totalTime).toBeLessThan(100); // Much faster than 20 * 10ms
      
      // Should have high hit rate
      const stats = getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0.9);
    });
  });

  describe('Cache Cleanup Performance', () => {
    it('should perform cleanup efficiently', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      
      // Create expired identities
      const expiredIdentities = Array.from({ length: 30 }, (_, i) => ({
        ...mockIdentity,
        did: `did:squid:expired-${i}`,
        name: `Expired ${i}`
      }));

      mockGetIdentity.mockImplementation(async (did) => {
        return expiredIdentities.find(id => id.did === did) || null;
      });

      // Load identities into cache
      for (const identity of expiredIdentities) {
        await identityCacheManager.getIdentity(identity.did);
      }

      // Simulate time passing to expire entries
      vi.useFakeTimers();
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      const startTime = performance.now();
      
      // Trigger cleanup by accessing cache
      await identityCacheManager.getIdentity('non-existent');
      
      const cleanupTime = performance.now() - startTime;
      
      vi.useRealTimers();

      expect(cleanupTime).toBeLessThan(100); // Cleanup should be fast
      
      // Cache should be cleaned
      const stats = getCacheStats();
      const totalCached = stats.levelStats.HOT.entries + 
                         stats.levelStats.WARM.entries + 
                         stats.levelStats.COLD.entries;
      expect(totalCached).toBeLessThan(30); // Some expired entries should be removed
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for cache operations', async () => {
      const { identityStorage } = await import('@/utils/storage/identityStorage');
      const mockGetIdentity = vi.mocked(identityStorage.getIdentity);
      mockGetIdentity.mockResolvedValue(mockIdentity);

      // Benchmark: Cache hit should be < 1ms
      await identityCacheManager.getIdentity(mockIdentity.did); // Prime cache
      
      const hitStartTime = performance.now();
      await identityCacheManager.getIdentity(mockIdentity.did);
      const hitTime = performance.now() - hitStartTime;
      
      expect(hitTime).toBeLessThan(1);

      // Benchmark: Cache invalidation should be < 5ms
      const invalidateStartTime = performance.now();
      identityCacheManager.invalidateIdentity(mockIdentity.did);
      const invalidateTime = performance.now() - invalidateStartTime;
      
      expect(invalidateTime).toBeLessThan(5);

      // Benchmark: Stats calculation should be < 1ms
      const statsStartTime = performance.now();
      getCacheStats();
      const statsTime = performance.now() - statsStartTime;
      
      expect(statsTime).toBeLessThan(1);
    });
  });
});