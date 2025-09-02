/**
 * Tests for ResourcePoolManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResourcePoolManager, ResourcePool, ResourceFactory } from '../optimization/ResourcePoolManager';

// Mock resource for testing
interface MockResource {
  id: string;
  created: number;
  isHealthy: boolean;
  useCount: number;
}

describe('ResourcePoolManager', () => {
  let poolManager: ResourcePoolManager;
  let mockFactory: ResourceFactory<MockResource>;

  beforeEach(() => {
    poolManager = new ResourcePoolManager();
    
    mockFactory = {
      create: async (): Promise<MockResource> => ({
        id: `resource_${Date.now()}_${Math.random()}`,
        created: Date.now(),
        isHealthy: true,
        useCount: 0
      }),
      destroy: async (resource: MockResource): Promise<void> => {
        resource.isHealthy = false;
      },
      validate: async (resource: MockResource): Promise<boolean> => {
        return resource.isHealthy && resource.useCount < 100;
      },
      reset: async (resource: MockResource): Promise<void> => {
        resource.useCount = 0;
      }
    };
  });

  afterEach(async () => {
    await poolManager.cleanup();
  });

  describe('Pool Creation', () => {
    it('should create a new resource pool', () => {
      const pool = poolManager.createPool('test-pool', mockFactory, {
        minSize: 2,
        maxSize: 5
      });

      expect(pool).toBeDefined();
      expect(pool).toBeInstanceOf(ResourcePool);
    });

    it('should get an existing pool', () => {
      const pool1 = poolManager.createPool('existing-pool', mockFactory);
      const pool2 = poolManager.getPool('existing-pool');

      expect(pool2).toBe(pool1);
    });

    it('should return undefined for non-existent pool', () => {
      const pool = poolManager.getPool('non-existent');
      expect(pool).toBeUndefined();
    });
  });

  describe('Resource Pool Operations', () => {
    let pool: ResourcePool<MockResource>;

    beforeEach(() => {
      pool = poolManager.createPool('operations-pool', mockFactory, {
        minSize: 1,
        maxSize: 3,
        maxIdleTime: 60000,
        healthCheckInterval: 30000,
        creationTimeout: 5000,
        acquisitionTimeout: 3000
      });
    });

    it('should acquire and release resources', async () => {
      const resource = await pool.acquire();
      
      expect(resource).toBeDefined();
      expect(resource.isHealthy).toBe(true);

      await pool.release(resource);
      
      const stats = pool.getStats();
      expect(stats.availableResources).toBeGreaterThan(0);
    });

    it('should create resources up to max size', async () => {
      const resources: MockResource[] = [];
      
      // Acquire all resources up to max size
      for (let i = 0; i < 3; i++) {
        const resource = await pool.acquire();
        resources.push(resource);
      }

      const stats = pool.getStats();
      expect(stats.inUseResources).toBe(3);
      expect(stats.totalResources).toBe(3);

      // Release all resources
      for (const resource of resources) {
        await pool.release(resource);
      }
    });

    it('should handle resource validation on release', async () => {
      const resource = await pool.acquire();
      
      // Make resource unhealthy
      resource.isHealthy = false;
      
      await pool.release(resource);
      
      const stats = pool.getStats();
      // Unhealthy resource should be destroyed, not returned to pool
      expect(stats.availableResources).toBe(0);
    });

    it('should perform health checks', async () => {
      const resource = await pool.acquire();
      await pool.release(resource);

      await pool.performHealthCheck();
      
      const stats = pool.getStats();
      expect(stats.healthCheckCount).toBeGreaterThan(0);
    });

    it('should warm up the pool', async () => {
      await pool.warmUp();
      
      const stats = pool.getStats();
      expect(stats.totalResources).toBeGreaterThanOrEqual(1); // minSize
    });

    it('should drain the pool', async () => {
      await pool.warmUp();
      
      let stats = pool.getStats();
      const initialCount = stats.totalResources;
      expect(initialCount).toBeGreaterThan(0);

      await pool.drain();
      
      stats = pool.getStats();
      expect(stats.totalResources).toBe(0);
    });
  });

  describe('Pool Statistics', () => {
    it('should track pool statistics', async () => {
      const pool = poolManager.createPool('stats-pool', mockFactory);
      
      const resource = await pool.acquire();
      await pool.release(resource);
      
      const stats = pool.getStats();
      
      expect(stats.acquisitionCount).toBe(1);
      expect(stats.releaseCount).toBe(1);
      expect(stats.createdCount).toBeGreaterThan(0);
    });

    it('should get all pool statistics', async () => {
      poolManager.createPool('pool-1', mockFactory);
      poolManager.createPool('pool-2', mockFactory);
      
      const allStats = poolManager.getAllStats();
      
      expect(allStats['pool-1']).toBeDefined();
      expect(allStats['pool-2']).toBeDefined();
    });
  });

  describe('Pool Resizing', () => {
    it('should resize pool to larger size', async () => {
      const pool = poolManager.createPool('resize-pool', mockFactory, {
        minSize: 1,
        maxSize: 2
      });

      await pool.warmUp();
      
      let stats = pool.getStats();
      const initialSize = stats.totalResources;

      await pool.resize(3, 5); // Increase min and max size
      
      stats = pool.getStats();
      expect(stats.totalResources).toBeGreaterThanOrEqual(3);
    });

    it('should resize pool to smaller size', async () => {
      const pool = poolManager.createPool('shrink-pool', mockFactory, {
        minSize: 3,
        maxSize: 5
      });

      await pool.warmUp();
      
      await pool.resize(1, 2); // Decrease min and max size
      
      const stats = pool.getStats();
      expect(stats.totalResources).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle resource creation failures', async () => {
      const failingFactory: ResourceFactory<MockResource> = {
        create: async () => {
          throw new Error('Creation failed');
        },
        destroy: async () => {},
        validate: async () => true
      };

      const pool = poolManager.createPool('failing-pool', failingFactory, {
        minSize: 0,
        maxSize: 1,
        creationTimeout: 1000,
        acquisitionTimeout: 2000
      });

      await expect(pool.acquire()).rejects.toThrow('Creation failed');
    });

    it('should handle resource validation failures', async () => {
      const validationFactory: ResourceFactory<MockResource> = {
        create: async () => ({
          id: 'test-resource',
          created: Date.now(),
          isHealthy: true,
          useCount: 0
        }),
        destroy: async () => {},
        validate: async () => false // Always fails validation
      };

      const pool = poolManager.createPool('validation-pool', validationFactory, {
        minSize: 0,
        maxSize: 2
      });

      const resource = await pool.acquire();
      
      // Resource should be destroyed on release due to failed validation
      await pool.release(resource);
      
      const stats = pool.getStats();
      expect(stats.availableResources).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent acquisitions', async () => {
      const pool = poolManager.createPool('concurrent-pool', mockFactory, {
        minSize: 0,
        maxSize: 3
      });

      const acquisitionPromises = Array(3).fill(0).map(() => pool.acquire());
      const resources = await Promise.all(acquisitionPromises);
      
      expect(resources).toHaveLength(3);
      expect(new Set(resources.map(r => r.id)).size).toBe(3); // All unique

      // Release all resources
      const releasePromises = resources.map(r => pool.release(r));
      await Promise.all(releasePromises);
    });

    it('should queue acquisitions when pool is at capacity', async () => {
      const pool = poolManager.createPool('queue-pool', mockFactory, {
        minSize: 0,
        maxSize: 1,
        acquisitionTimeout: 5000
      });

      // Acquire the only resource
      const resource1 = await pool.acquire();
      
      // Start another acquisition (should queue)
      const acquisition2Promise = pool.acquire();
      
      // Release the first resource
      setTimeout(() => pool.release(resource1), 100);
      
      // Second acquisition should complete
      const resource2 = await acquisition2Promise;
      expect(resource2).toBeDefined();
      
      await pool.release(resource2);
    });
  });

  describe('Health Monitoring', () => {
    it('should track resource health', async () => {
      const pool = poolManager.createPool('health-pool', mockFactory);
      
      const resource = await pool.acquire();
      await pool.release(resource);
      
      await pool.performHealthCheck();
      
      // Health check should complete without errors
      const stats = pool.getStats();
      expect(stats.healthCheckCount).toBeGreaterThan(0);
    });

    it('should remove unhealthy resources during health checks', async () => {
      const unhealthyFactory: ResourceFactory<MockResource> = {
        create: async () => ({
          id: 'unhealthy-resource',
          created: Date.now(),
          isHealthy: true,
          useCount: 0
        }),
        destroy: async (resource) => {
          resource.isHealthy = false;
        },
        validate: async (resource) => {
          // Simulate resource becoming unhealthy over time
          return Date.now() - resource.created < 1000;
        }
      };

      const pool = poolManager.createPool('unhealthy-pool', unhealthyFactory);
      
      const resource = await pool.acquire();
      await pool.release(resource);
      
      // Wait for resource to become "unhealthy"
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await pool.performHealthCheck();
      
      const stats = pool.getStats();
      expect(stats.availableResources).toBe(0); // Unhealthy resource removed
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all pools', async () => {
      poolManager.createPool('cleanup-pool-1', mockFactory);
      poolManager.createPool('cleanup-pool-2', mockFactory);
      
      await poolManager.cleanup();
      
      // Pools should be cleared
      expect(poolManager.getPool('cleanup-pool-1')).toBeUndefined();
      expect(poolManager.getPool('cleanup-pool-2')).toBeUndefined();
    });
  });

  describe('Events', () => {
    it('should emit pool events', async () => {
      const events: string[] = [];
      
      poolManager.on('pool_created', () => events.push('pool_created'));
      poolManager.on('pool_resource_created', () => events.push('resource_created'));
      poolManager.on('pool_resource_destroyed', () => events.push('resource_destroyed'));

      const pool = poolManager.createPool('event-pool', mockFactory);
      const resource = await pool.acquire();
      await pool.release(resource);
      await pool.drain();

      expect(events).toContain('pool_created');
      expect(events).toContain('resource_created');
    });
  });
});