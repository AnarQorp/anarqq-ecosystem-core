/**
 * Performance tests for Lazy Identity Tree Loader
 * Tests lazy loading effectiveness and tree performance
 * Requirements: 1.1, 1.2, 4.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lazyTreeLoader, getTreeLoadingStats, clearTreeCache } from '../LazyIdentityTreeLoader';
import { ExtendedSquidIdentity, IdentityType, IdentityStatus, GovernanceType, PrivacyLevel } from '@/types/identity';

// Mock the cache manager
vi.mock('../IdentityCacheManager', () => ({
  identityCacheManager: {
    getIdentity: vi.fn(),
    getIdentityTree: vi.fn()
  }
}));

describe('Lazy Identity Tree Loader Performance Tests', () => {
  const createMockIdentity = (id: string, parentId?: string, childrenIds: string[] = []): ExtendedSquidIdentity => ({
    did: id,
    name: `Identity ${id}`,
    type: parentId ? IdentityType.DAO : IdentityType.ROOT,
    rootId: parentId ? 'root-1' : id,
    parentId,
    children: childrenIds,
    depth: parentId ? 1 : 0,
    path: parentId ? ['root-1'] : [],
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      type: parentId ? IdentityType.DAO : IdentityType.ROOT,
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
    clearTreeCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearTreeCache();
  });

  describe('Initial Loading Performance', () => {
    it('should load tree with minimal initial requests', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      // Mock tree structure: root -> 3 children -> 2 grandchildren each
      const rootId = 'root-1';
      const childIds = ['child-1', 'child-2', 'child-3'];
      const grandchildIds = [
        'grandchild-1-1', 'grandchild-1-2',
        'grandchild-2-1', 'grandchild-2-2',
        'grandchild-3-1', 'grandchild-3-2'
      ];

      const rootIdentity = createMockIdentity(rootId, undefined, childIds);
      const childIdentities = childIds.map((id, index) => 
        createMockIdentity(id, rootId, [grandchildIds[index * 2], grandchildIds[index * 2 + 1]])
      );
      const grandchildIdentities = grandchildIds.map(id => createMockIdentity(id, 'parent'));

      mockGetTree.mockResolvedValue(null); // No cached tree
      mockGetIdentity.mockImplementation(async (did) => {
        // Simulate database latency
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (did === rootId) return rootIdentity;
        if (childIds.includes(did)) return childIdentities.find(c => c.did === did) || null;
        if (grandchildIds.includes(did)) return grandchildIdentities.find(g => g.did === did) || null;
        return null;
      });

      const startTime = performance.now();
      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      const loadTime = performance.now() - startTime;

      // Should load root + children (depth 2) but not grandchildren initially
      expect(tree.identity.did).toBe(rootId);
      expect(tree.children).toHaveLength(3);
      expect(tree.children[0].isLoaded).toBe(true);
      expect(tree.children[0].children).toHaveLength(2);
      expect(tree.children[0].children[0].isLoaded).toBe(false); // Grandchildren not loaded

      // Should be reasonably fast (only loaded root + 3 children + 6 grandchildren for structure)
      expect(loadTime).toBeLessThan(200);
      
      // Should have made minimal requests
      expect(mockGetIdentity).toHaveBeenCalledTimes(10); // root + 3 children + 6 grandchildren
    });

    it('should demonstrate performance benefit of lazy loading vs eager loading', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      // Create large tree: root -> 10 children -> 5 grandchildren each = 51 total nodes
      const rootId = 'root-large';
      const childIds = Array.from({ length: 10 }, (_, i) => `child-${i}`);
      const grandchildIds = childIds.flatMap(childId => 
        Array.from({ length: 5 }, (_, j) => `${childId}-grandchild-${j}`)
      );

      const allIdentities = new Map<string, ExtendedSquidIdentity>();
      
      // Root
      allIdentities.set(rootId, createMockIdentity(rootId, undefined, childIds));
      
      // Children
      childIds.forEach((childId, index) => {
        const childGrandchildren = grandchildIds.slice(index * 5, (index + 1) * 5);
        allIdentities.set(childId, createMockIdentity(childId, rootId, childGrandchildren));
      });
      
      // Grandchildren
      grandchildIds.forEach(grandchildId => {
        allIdentities.set(grandchildId, createMockIdentity(grandchildId, 'parent'));
      });

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 5)); // Simulate latency
        return allIdentities.get(did) || null;
      });

      // Test lazy loading
      const lazyStartTime = performance.now();
      const lazyTree = await lazyTreeLoader.loadIdentityTree(rootId);
      const lazyLoadTime = performance.now() - lazyStartTime;

      // Simulate eager loading by expanding all nodes
      const eagerStartTime = performance.now();
      for (const child of lazyTree.children) {
        await child.loadChildren();
        for (const grandchild of child.children) {
          await grandchild.loadChildren();
        }
      }
      const eagerLoadTime = performance.now() - eagerStartTime;

      // Lazy loading should be significantly faster for initial load
      expect(lazyLoadTime).toBeLessThan(eagerLoadTime / 2);
      expect(lazyLoadTime).toBeLessThan(200); // Should be fast
      
      const stats = getTreeLoadingStats();
      expect(stats.nodesLoaded).toBeLessThan(51); // Should not load all nodes initially
    });
  });

  describe('On-Demand Loading Performance', () => {
    it('should load children efficiently on demand', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      const rootId = 'root-demand';
      const childIds = ['child-1', 'child-2', 'child-3'];
      
      const rootIdentity = createMockIdentity(rootId, undefined, childIds);
      const childIdentities = childIds.map(id => createMockIdentity(id, rootId));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 8));
        if (did === rootId) return rootIdentity;
        return childIdentities.find(c => c.did === did) || null;
      });

      // Load tree (should not load children initially)
      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      expect(tree.children).toHaveLength(0); // Children not loaded yet
      
      // Load children on demand
      const loadStartTime = performance.now();
      await tree.loadChildren();
      const loadTime = performance.now() - loadStartTime;
      
      expect(tree.children).toHaveLength(3);
      expect(tree.isLoaded).toBe(true);
      expect(loadTime).toBeLessThan(50); // Should be fast
    });

    it('should handle concurrent child loading efficiently', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      const rootId = 'root-concurrent';
      const childIds = Array.from({ length: 20 }, (_, i) => `child-${i}`);
      
      const rootIdentity = createMockIdentity(rootId, undefined, childIds);
      const childIdentities = childIds.map(id => createMockIdentity(id, rootId));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (did === rootId) return rootIdentity;
        return childIdentities.find(c => c.did === did) || null;
      });

      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      
      // Trigger multiple concurrent loads
      const concurrentPromises = Array.from({ length: 5 }, () => tree.loadChildren());
      
      const startTime = performance.now();
      await Promise.all(concurrentPromises);
      const totalTime = performance.now() - startTime;
      
      expect(tree.children).toHaveLength(20);
      expect(totalTime).toBeLessThan(300); // Should handle concurrency well
      
      // Should not have made duplicate requests
      const identityCallCount = mockGetIdentity.mock.calls.length;
      expect(identityCallCount).toBeLessThan(25); // Root + 20 children + some buffer
    });
  });

  describe('Tree Navigation Performance', () => {
    it('should search tree efficiently with lazy loading', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      // Create tree with target deep in structure
      const rootId = 'root-search';
      const targetId = 'target-deep-node';
      
      const identities = new Map<string, ExtendedSquidIdentity>();
      
      // Build tree: root -> 5 branches -> 3 levels deep
      const buildTree = (parentId: string, depth: number, maxDepth: number): string[] => {
        if (depth >= maxDepth) return [];
        
        const children = Array.from({ length: 5 }, (_, i) => `${parentId}-child-${i}-depth-${depth}`);
        
        children.forEach(childId => {
          const grandchildren = buildTree(childId, depth + 1, maxDepth);
          identities.set(childId, createMockIdentity(childId, parentId, grandchildren));
        });
        
        return children;
      };
      
      const rootChildren = buildTree(rootId, 1, 4);
      identities.set(rootId, createMockIdentity(rootId, undefined, rootChildren));
      
      // Add target node deep in tree
      identities.set(targetId, createMockIdentity(targetId, 'root-search-child-2-depth-1-child-1-depth-2'));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return identities.get(did) || null;
      });

      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      
      // Search for target node
      const searchStartTime = performance.now();
      const results = await lazyTreeLoader.searchNodes(
        tree,
        (identity) => identity.did === targetId,
        10
      );
      const searchTime = performance.now() - searchStartTime;
      
      expect(results).toHaveLength(1);
      expect(results[0].identity.did).toBe(targetId);
      expect(searchTime).toBeLessThan(200); // Should be reasonably fast
      
      const stats = getTreeLoadingStats();
      expect(stats.nodesLoaded).toBeLessThan(identities.size); // Should not load entire tree
    });

    it('should find node paths efficiently', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      const rootId = 'root-path';
      const targetId = 'deep-target';
      const intermediatePath = ['child-1', 'grandchild-1-2', 'great-grandchild-1-2-1'];
      
      const identities = new Map<string, ExtendedSquidIdentity>();
      
      // Build specific path
      identities.set(rootId, createMockIdentity(rootId, undefined, ['child-1', 'child-2']));
      identities.set('child-1', createMockIdentity('child-1', rootId, ['grandchild-1-1', 'grandchild-1-2']));
      identities.set('child-2', createMockIdentity('child-2', rootId, []));
      identities.set('grandchild-1-1', createMockIdentity('grandchild-1-1', 'child-1', []));
      identities.set('grandchild-1-2', createMockIdentity('grandchild-1-2', 'child-1', ['great-grandchild-1-2-1']));
      identities.set('great-grandchild-1-2-1', createMockIdentity('great-grandchild-1-2-1', 'grandchild-1-2', [targetId]));
      identities.set(targetId, createMockIdentity(targetId, 'great-grandchild-1-2-1', []));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        await new Promise(resolve => setTimeout(resolve, 3));
        return identities.get(did) || null;
      });

      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      
      // Find path to target
      const pathStartTime = performance.now();
      const path = await lazyTreeLoader.getNodePath(tree, targetId);
      const pathTime = performance.now() - pathStartTime;
      
      expect(path).toHaveLength(5); // root -> child-1 -> grandchild-1-2 -> great-grandchild-1-2-1 -> target
      expect(path[0].identity.did).toBe(rootId);
      expect(path[path.length - 1].identity.did).toBe(targetId);
      expect(pathTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('Memory Management Performance', () => {
    it('should manage memory efficiently with large trees', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      // Create very large tree structure
      const rootId = 'root-memory';
      const identities = new Map<string, ExtendedSquidIdentity>();
      
      // Generate 1000 identities in tree structure
      for (let i = 0; i < 1000; i++) {
        const id = `identity-${i}`;
        const parentId = i === 0 ? undefined : `identity-${Math.floor(i / 10)}`;
        const children = i < 100 ? Array.from({ length: 10 }, (_, j) => `identity-${i * 10 + j + 1}`).filter(childId => parseInt(childId.split('-')[1]) < 1000) : [];
        
        identities.set(id, createMockIdentity(id, parentId, children));
      }

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        return identities.get(did) || null;
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Load tree with limited initial depth
      const tree = await lazyTreeLoader.loadIdentityTree('identity-0');
      
      // Expand some nodes
      await tree.loadChildren();
      if (tree.children.length > 0) {
        await tree.children[0].loadChildren();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      const stats = getTreeLoadingStats();
      expect(stats.nodesLoaded).toBeLessThan(200); // Should not load entire tree
    });

    it('should handle node unloading for memory optimization', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      const rootId = 'root-unload';
      const childIds = Array.from({ length: 50 }, (_, i) => `child-${i}`);
      
      const rootIdentity = createMockIdentity(rootId, undefined, childIds);
      const childIdentities = childIds.map(id => createMockIdentity(id, rootId, []));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockImplementation(async (did) => {
        if (did === rootId) return rootIdentity;
        return childIdentities.find(c => c.did === did) || null;
      });

      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      
      // Load children
      await tree.loadChildren();
      expect(tree.children).toHaveLength(50);
      expect(tree.isLoaded).toBe(true);
      
      // Collapse and unload
      const unloadStartTime = performance.now();
      lazyTreeLoader.collapseNode(tree, true); // Unload children
      const unloadTime = performance.now() - unloadStartTime;
      
      expect(tree.expanded).toBe(false);
      expect(tree.children).toHaveLength(0); // Children unloaded
      expect(unloadTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for tree operations', async () => {
      const { identityCacheManager } = await import('../IdentityCacheManager');
      const mockGetIdentity = vi.mocked(identityCacheManager.getIdentity);
      const mockGetTree = vi.mocked(identityCacheManager.getIdentityTree);
      
      const rootId = 'root-benchmark';
      const childIds = ['child-1', 'child-2', 'child-3'];
      
      const rootIdentity = createMockIdentity(rootId, undefined, childIds);
      const childIdentities = childIds.map(id => createMockIdentity(id, rootId));

      mockGetTree.mockResolvedValue(null);
      mockGetIdentity.mockResolvedValue(rootIdentity);

      // Benchmark: Initial tree load should be < 100ms
      const loadStartTime = performance.now();
      const tree = await lazyTreeLoader.loadIdentityTree(rootId);
      const loadTime = performance.now() - loadStartTime;
      
      expect(loadTime).toBeLessThan(100);

      // Benchmark: Node expansion should be < 50ms
      mockGetIdentity.mockImplementation(async (did) => {
        return childIdentities.find(c => c.did === did) || null;
      });

      const expandStartTime = performance.now();
      await lazyTreeLoader.expandNode(tree);
      const expandTime = performance.now() - expandStartTime;
      
      expect(expandTime).toBeLessThan(50);

      // Benchmark: Node collapse should be < 5ms
      const collapseStartTime = performance.now();
      lazyTreeLoader.collapseNode(tree);
      const collapseTime = performance.now() - collapseStartTime;
      
      expect(collapseTime).toBeLessThan(5);

      // Benchmark: Stats calculation should be < 1ms
      const statsStartTime = performance.now();
      getTreeLoadingStats();
      const statsTime = performance.now() - statsStartTime;
      
      expect(statsTime).toBeLessThan(1);
    });
  });
});