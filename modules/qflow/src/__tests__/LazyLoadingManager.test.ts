/**
 * Tests for LazyLoadingManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LazyLoadingManager } from '../optimization/LazyLoadingManager';

describe('LazyLoadingManager', () => {
  let lazyManager: LazyLoadingManager;

  beforeEach(() => {
    lazyManager = new LazyLoadingManager({
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      preloadThreshold: 2,
      compressionEnabled: false,
      persistentCache: false,
      loadTimeout: 5000
    });
  });

  afterEach(() => {
    lazyManager.clearCache();
  });

  describe('Component Registration', () => {
    it('should register components for lazy loading', () => {
      const componentId = 'test-component';
      
      lazyManager.registerComponent(
        componentId,
        async () => ({ data: 'test' }),
        {
          type: 'module',
          size: 1024,
          priority: 5,
          dependencies: []
        }
      );

      const metadata = lazyManager.getComponentMetadata(componentId);
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe(componentId);
      expect(metadata?.type).toBe('module');
      expect(metadata?.size).toBe(1024);
    });

    it('should handle component metadata defaults', () => {
      const componentId = 'minimal-component';
      
      lazyManager.registerComponent(
        componentId,
        async () => ({ data: 'minimal' }),
        {}
      );

      const metadata = lazyManager.getComponentMetadata(componentId);
      expect(metadata?.type).toBe('module');
      expect(metadata?.priority).toBe(5);
      expect(metadata?.dependencies).toEqual([]);
    });
  });

  describe('Component Loading', () => {
    it('should load components on demand', async () => {
      const componentId = 'on-demand-component';
      let loadCalled = false;
      
      lazyManager.registerComponent(
        componentId,
        async () => {
          loadCalled = true;
          return { loaded: true, data: 'on-demand' };
        },
        { type: 'step', size: 512 }
      );

      const result = await lazyManager.loadComponent(componentId);
      
      expect(loadCalled).toBe(true);
      expect(result).toEqual({ loaded: true, data: 'on-demand' });
    });

    it('should cache loaded components', async () => {
      const componentId = 'cached-component';
      let loadCount = 0;
      
      lazyManager.registerComponent(
        componentId,
        async () => {
          loadCount++;
          return { loadCount, data: 'cached' };
        },
        { type: 'template', size: 256 }
      );

      // First load
      const result1 = await lazyManager.loadComponent(componentId);
      expect(result1.loadCount).toBe(1);

      // Second load should use cache
      const result2 = await lazyManager.loadComponent(componentId);
      expect(result2.loadCount).toBe(1); // Same as first load
      expect(loadCount).toBe(1); // Loader called only once
    });

    it('should handle loading timeouts', async () => {
      const componentId = 'slow-component';
      
      lazyManager.registerComponent(
        componentId,
        async () => {
          // Simulate slow loading
          await new Promise(resolve => setTimeout(resolve, 10000));
          return { data: 'slow' };
        },
        { type: 'module', size: 1024 }
      );

      await expect(
        lazyManager.loadComponent(componentId)
      ).rejects.toThrow('Load timeout');
    });
  });

  describe('Dependency Management', () => {
    it('should load dependencies before main component', async () => {
      const loadOrder: string[] = [];
      
      // Register dependency
      lazyManager.registerComponent(
        'dependency-1',
        async () => {
          loadOrder.push('dependency-1');
          return { type: 'dependency' };
        },
        { type: 'module', size: 256, dependencies: [] }
      );

      // Register main component with dependency
      lazyManager.registerComponent(
        'main-component',
        async () => {
          loadOrder.push('main-component');
          return { type: 'main', deps: ['dependency-1'] };
        },
        { 
          type: 'module', 
          size: 512, 
          dependencies: ['dependency-1'] 
        }
      );

      await lazyManager.loadComponent('main-component');
      
      expect(loadOrder).toEqual(['dependency-1', 'main-component']);
    });

    it('should handle multiple dependencies', async () => {
      const loadOrder: string[] = [];
      
      // Register dependencies
      lazyManager.registerComponent(
        'dep-a',
        async () => {
          loadOrder.push('dep-a');
          return { name: 'dep-a' };
        },
        { type: 'module', size: 128 }
      );

      lazyManager.registerComponent(
        'dep-b',
        async () => {
          loadOrder.push('dep-b');
          return { name: 'dep-b' };
        },
        { type: 'module', size: 128 }
      );

      // Register main component
      lazyManager.registerComponent(
        'multi-dep-component',
        async () => {
          loadOrder.push('multi-dep-component');
          return { deps: ['dep-a', 'dep-b'] };
        },
        { 
          type: 'module', 
          size: 256, 
          dependencies: ['dep-a', 'dep-b'] 
        }
      );

      await lazyManager.loadComponent('multi-dep-component');
      
      expect(loadOrder).toContain('dep-a');
      expect(loadOrder).toContain('dep-b');
      expect(loadOrder).toContain('multi-dep-component');
      expect(loadOrder.indexOf('multi-dep-component')).toBeGreaterThan(
        Math.max(loadOrder.indexOf('dep-a'), loadOrder.indexOf('dep-b'))
      );
    });
  });

  describe('Cache Management', () => {
    it('should track cache statistics', async () => {
      lazyManager.registerComponent(
        'stats-component',
        async () => ({ data: 'stats' }),
        { type: 'module', size: 1024 }
      );

      await lazyManager.loadComponent('stats-component');
      
      const stats = lazyManager.getCacheStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalSize).toBe(1024);
      expect(stats.registeredComponents).toBe(1);
    });

    it('should clear cache when requested', async () => {
      lazyManager.registerComponent(
        'clearable-component',
        async () => ({ data: 'clearable' }),
        { type: 'module', size: 512 }
      );

      await lazyManager.loadComponent('clearable-component');
      
      let stats = lazyManager.getCacheStats();
      expect(stats.totalEntries).toBe(1);

      lazyManager.clearCache();
      
      stats = lazyManager.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should evict least used entries when cache is full', async () => {
      // Create a manager with very small cache
      const smallCacheManager = new LazyLoadingManager({
        maxCacheSize: 1024, // 1KB only
        preloadThreshold: 2,
        compressionEnabled: false,
        persistentCache: false,
        loadTimeout: 5000
      });

      // Register components that exceed cache size
      smallCacheManager.registerComponent(
        'component-1',
        async () => ({ data: 'component-1' }),
        { type: 'module', size: 600 }
      );

      smallCacheManager.registerComponent(
        'component-2',
        async () => ({ data: 'component-2' }),
        { type: 'module', size: 600 }
      );

      // Load both components
      await smallCacheManager.loadComponent('component-1');
      await smallCacheManager.loadComponent('component-2');

      const stats = smallCacheManager.getCacheStats();
      
      // Cache should not exceed max size significantly
      expect(stats.totalSize).toBeLessThanOrEqual(1024 * 1.1); // Allow 10% overhead
      
      smallCacheManager.clearCache();
    });
  });

  describe('Loading Strategies', () => {
    it('should use registered strategies for preloading decisions', async () => {
      // Register a custom strategy
      lazyManager.registerStrategy({
        name: 'test-strategy',
        shouldPreload: (meta) => meta.priority >= 8,
        loadPriority: (meta) => meta.priority * 2
      });

      // Register high-priority component
      lazyManager.registerComponent(
        'high-priority',
        async () => ({ data: 'high-priority' }),
        { type: 'module', size: 256, priority: 9 }
      );

      // Register low-priority component
      lazyManager.registerComponent(
        'low-priority',
        async () => ({ data: 'low-priority' }),
        { type: 'module', size: 256, priority: 3 }
      );

      await lazyManager.preloadComponents();

      // High-priority component should be preloaded
      const stats = lazyManager.getCacheStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Priority Management', () => {
    it('should update component priorities', () => {
      const componentId = 'priority-component';
      
      lazyManager.registerComponent(
        componentId,
        async () => ({ data: 'priority' }),
        { type: 'module', size: 256, priority: 5 }
      );

      let metadata = lazyManager.getComponentMetadata(componentId);
      expect(metadata?.priority).toBe(5);

      lazyManager.updateComponentPriority(componentId, 8);

      metadata = lazyManager.getComponentMetadata(componentId);
      expect(metadata?.priority).toBe(8);
    });
  });

  describe('Recommendations', () => {
    it('should provide loading recommendations', async () => {
      // Create scenario with low hit rate
      lazyManager.registerComponent(
        'missed-component',
        async () => ({ data: 'missed' }),
        { type: 'module', size: 15 * 1024 * 1024 } // 15MB - larger than cache
      );

      const recommendations = lazyManager.getLoadingRecommendations();
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle component loading failures', async () => {
      lazyManager.registerComponent(
        'failing-component',
        async () => {
          throw new Error('Component load failed');
        },
        { type: 'module', size: 256 }
      );

      await expect(
        lazyManager.loadComponent('failing-component')
      ).rejects.toThrow('Component load failed');
    });

    it('should handle missing components gracefully', async () => {
      await expect(
        lazyManager.loadComponent('non-existent-component')
      ).rejects.toThrow('Component non-existent-component not registered');
    });
  });

  describe('Events', () => {
    it('should emit events for component operations', async () => {
      const events: string[] = [];
      
      lazyManager.on('component_registered', () => events.push('registered'));
      lazyManager.on('loading_started', () => events.push('loading_started'));
      lazyManager.on('loading_completed', () => events.push('loading_completed'));
      lazyManager.on('component_cached', () => events.push('cached'));

      lazyManager.registerComponent(
        'event-component',
        async () => ({ data: 'events' }),
        { type: 'module', size: 256 }
      );

      await lazyManager.loadComponent('event-component');

      expect(events).toContain('registered');
      expect(events).toContain('loading_started');
      expect(events).toContain('loading_completed');
      expect(events).toContain('cached');
    });
  });
});