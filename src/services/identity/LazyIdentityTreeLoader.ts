/**
 * Lazy Identity Tree Loader
 * Implements lazy loading for identity tree data to improve performance
 * Requirements: 1.1, 1.2, 4.1
 */

import { ExtendedSquidIdentity, IdentityTree, IdentityTreeNode, IdentityType } from '@/types/identity';
import { identityCacheManager } from './IdentityCacheManager';
import { identityStorage } from '@/utils/storage/identityStorage';

export interface LazyTreeNode extends Omit<IdentityTreeNode, 'children'> {
  children: LazyTreeNode[];
  isLoaded: boolean;
  isLoading: boolean;
  hasChildren: boolean;
  childrenCount: number;
  loadChildren: () => Promise<void>;
}

export interface LazyLoadingConfig {
  maxInitialDepth: number;
  batchSize: number;
  preloadSiblings: boolean;
  cacheLoadedNodes: boolean;
}

export interface TreeLoadingStats {
  nodesLoaded: number;
  totalNodes: number;
  loadingTime: number;
  cacheHits: number;
  cacheMisses: number;
}

class LazyIdentityTreeLoader {
  private loadingPromises = new Map<string, Promise<LazyTreeNode[]>>();
  private loadedNodes = new Map<string, LazyTreeNode>();
  private config: LazyLoadingConfig = {
    maxInitialDepth: 2,
    batchSize: 10,
    preloadSiblings: true,
    cacheLoadedNodes: true
  };
  private stats: TreeLoadingStats = {
    nodesLoaded: 0,
    totalNodes: 0,
    loadingTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  /**
   * Load identity tree with lazy loading
   */
  async loadIdentityTree(rootId: string): Promise<LazyTreeNode> {
    const startTime = performance.now();
    
    try {
      // Try to get from cache first
      const cachedTree = await identityCacheManager.getIdentityTree(rootId);
      if (cachedTree) {
        const lazyTree = this.convertToLazyTree(cachedTree.root);
        this.stats.cacheHits++;
        console.log(`[Lazy Tree Loader] Tree loaded from cache: ${rootId}`);
        return lazyTree;
      }

      this.stats.cacheMisses++;
      
      // Load root identity
      const rootIdentity = await identityCacheManager.getIdentity(rootId);
      if (!rootIdentity) {
        throw new Error(`Root identity not found: ${rootId}`);
      }

      // Create lazy root node
      const rootNode = await this.createLazyNode(rootIdentity);
      
      // Load initial depth
      await this.loadToDepth(rootNode, this.config.maxInitialDepth);
      
      this.stats.loadingTime += performance.now() - startTime;
      console.log(`[Lazy Tree Loader] Tree loaded lazily: ${rootId} (${(performance.now() - startTime).toFixed(2)}ms)`);
      
      return rootNode;
      
    } catch (error) {
      console.error(`[Lazy Tree Loader] Failed to load tree: ${rootId}`, error);
      throw error;
    }
  }

  /**
   * Load children for a specific node
   */
  async loadNodeChildren(node: LazyTreeNode): Promise<void> {
    if (node.isLoaded || node.isLoading || !node.hasChildren) {
      return;
    }

    const nodeId = node.identity.did;
    
    // Check if already loading
    if (this.loadingPromises.has(nodeId)) {
      await this.loadingPromises.get(nodeId);
      return;
    }

    node.isLoading = true;
    
    const loadingPromise = this.loadChildrenInternal(node);
    this.loadingPromises.set(nodeId, loadingPromise);
    
    try {
      await loadingPromise;
      node.isLoaded = true;
      node.isLoading = false;
      
      // Preload siblings if configured
      if (this.config.preloadSiblings && node.parent) {
        this.preloadSiblings(node).catch(error => {
          console.warn('[Lazy Tree Loader] Sibling preload failed:', error);
        });
      }
      
    } catch (error) {
      node.isLoading = false;
      console.error(`[Lazy Tree Loader] Failed to load children for ${nodeId}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(nodeId);
    }
  }

  /**
   * Expand node and load children if needed
   */
  async expandNode(node: LazyTreeNode): Promise<void> {
    if (!node.expanded) {
      node.expanded = true;
      
      if (!node.isLoaded && node.hasChildren) {
        await this.loadNodeChildren(node);
      }
    }
  }

  /**
   * Collapse node and optionally unload children
   */
  collapseNode(node: LazyTreeNode, unloadChildren = false): void {
    node.expanded = false;
    
    if (unloadChildren && node.isLoaded) {
      this.unloadNodeChildren(node);
    }
  }

  /**
   * Search for nodes matching criteria with lazy loading
   */
  async searchNodes(
    rootNode: LazyTreeNode,
    predicate: (identity: ExtendedSquidIdentity) => boolean,
    maxResults = 50
  ): Promise<LazyTreeNode[]> {
    const results: LazyTreeNode[] = [];
    const visited = new Set<string>();
    
    await this.searchNodesRecursive(rootNode, predicate, results, visited, maxResults);
    
    return results;
  }

  /**
   * Get node path from root to target node
   */
  async getNodePath(rootNode: LazyTreeNode, targetDid: string): Promise<LazyTreeNode[]> {
    const path: LazyTreeNode[] = [];
    const found = await this.findNodePath(rootNode, targetDid, path);
    
    return found ? path : [];
  }

  /**
   * Preload likely-to-be-accessed nodes
   */
  async preloadNodes(nodeIds: string[]): Promise<void> {
    const batchSize = this.config.batchSize;
    const batches: string[][] = [];
    
    for (let i = 0; i < nodeIds.length; i += batchSize) {
      batches.push(nodeIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const loadPromises = batch.map(async (nodeId) => {
        try {
          const identity = await identityCacheManager.getIdentity(nodeId);
          if (identity && this.config.cacheLoadedNodes) {
            const node = await this.createLazyNode(identity);
            this.loadedNodes.set(nodeId, node);
          }
        } catch (error) {
          console.warn(`[Lazy Tree Loader] Preload failed for ${nodeId}:`, error);
        }
      });

      await Promise.all(loadPromises);
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): TreeLoadingStats {
    return { ...this.stats };
  }

  /**
   * Configure lazy loading behavior
   */
  configure(config: Partial<LazyLoadingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Lazy Tree Loader] Configuration updated:', this.config);
  }

  /**
   * Clear loaded nodes cache
   */
  clearCache(): void {
    this.loadedNodes.clear();
    this.loadingPromises.clear();
    this.stats = {
      nodesLoaded: 0,
      totalNodes: 0,
      loadingTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    console.log('[Lazy Tree Loader] Cache cleared');
  }

  // Private methods

  private async createLazyNode(identity: ExtendedSquidIdentity): Promise<LazyTreeNode> {
    const hasChildren = identity.children && identity.children.length > 0;
    const childrenCount = identity.children?.length || 0;

    const node: LazyTreeNode = {
      identity,
      children: [],
      expanded: false,
      isLoaded: false,
      isLoading: false,
      hasChildren,
      childrenCount,
      loadChildren: async () => {
        await this.loadNodeChildren(node);
      }
    };

    if (this.config.cacheLoadedNodes) {
      this.loadedNodes.set(identity.did, node);
    }

    return node;
  }

  private async loadChildrenInternal(node: LazyTreeNode): Promise<LazyTreeNode[]> {
    const childrenIds = node.identity.children || [];
    const children: LazyTreeNode[] = [];

    // Load children in batches
    const batchSize = this.config.batchSize;
    for (let i = 0; i < childrenIds.length; i += batchSize) {
      const batch = childrenIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (childId) => {
        try {
          // Check if already loaded
          const cached = this.loadedNodes.get(childId);
          if (cached) {
            return cached;
          }

          const childIdentity = await identityCacheManager.getIdentity(childId);
          if (childIdentity) {
            const childNode = await this.createLazyNode(childIdentity);
            childNode.parent = node;
            return childNode;
          }
          return null;
        } catch (error) {
          console.error(`[Lazy Tree Loader] Failed to load child ${childId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validChildren = batchResults.filter((child): child is LazyTreeNode => child !== null);
      children.push(...validChildren);
    }

    node.children = children;
    this.stats.nodesLoaded += children.length;
    
    return children;
  }

  private async loadToDepth(node: LazyTreeNode, maxDepth: number, currentDepth = 0): Promise<void> {
    if (currentDepth >= maxDepth || !node.hasChildren) {
      return;
    }

    await this.loadNodeChildren(node);
    
    // Recursively load children to the specified depth
    const loadPromises = node.children.map(child => 
      this.loadToDepth(child, maxDepth, currentDepth + 1)
    );
    
    await Promise.all(loadPromises);
  }

  private async preloadSiblings(node: LazyTreeNode): Promise<void> {
    if (!node.parent) return;

    const siblingPromises = node.parent.children
      .filter(sibling => sibling !== node && !sibling.isLoaded && sibling.hasChildren)
      .map(sibling => this.loadNodeChildren(sibling));

    await Promise.all(siblingPromises);
  }

  private unloadNodeChildren(node: LazyTreeNode): void {
    node.children.forEach(child => {
      if (child.isLoaded) {
        this.unloadNodeChildren(child);
      }
      this.loadedNodes.delete(child.identity.did);
    });
    
    node.children = [];
    node.isLoaded = false;
    this.stats.nodesLoaded = Math.max(0, this.stats.nodesLoaded - node.childrenCount);
  }

  private async searchNodesRecursive(
    node: LazyTreeNode,
    predicate: (identity: ExtendedSquidIdentity) => boolean,
    results: LazyTreeNode[],
    visited: Set<string>,
    maxResults: number
  ): Promise<void> {
    if (results.length >= maxResults || visited.has(node.identity.did)) {
      return;
    }

    visited.add(node.identity.did);

    // Check current node
    if (predicate(node.identity)) {
      results.push(node);
    }

    // Load children if needed and search recursively
    if (node.hasChildren && !node.isLoaded) {
      await this.loadNodeChildren(node);
    }

    const searchPromises = node.children.map(child =>
      this.searchNodesRecursive(child, predicate, results, visited, maxResults)
    );

    await Promise.all(searchPromises);
  }

  private async findNodePath(
    node: LazyTreeNode,
    targetDid: string,
    path: LazyTreeNode[]
  ): Promise<boolean> {
    path.push(node);

    if (node.identity.did === targetDid) {
      return true;
    }

    // Load children if needed
    if (node.hasChildren && !node.isLoaded) {
      await this.loadNodeChildren(node);
    }

    // Search in children
    for (const child of node.children) {
      if (await this.findNodePath(child, targetDid, path)) {
        return true;
      }
    }

    // Not found in this path, remove from path
    path.pop();
    return false;
  }

  private convertToLazyTree(node: IdentityTreeNode): LazyTreeNode {
    const lazyNode: LazyTreeNode = {
      identity: node.identity,
      children: node.children.map(child => this.convertToLazyTree(child)),
      expanded: node.expanded,
      parent: undefined, // Will be set when building relationships
      isLoaded: true,
      isLoading: false,
      hasChildren: node.children.length > 0,
      childrenCount: node.children.length,
      loadChildren: async () => {
        // Already loaded from cache
      }
    };

    // Set parent relationships
    lazyNode.children.forEach(child => {
      child.parent = lazyNode;
    });

    return lazyNode;
  }
}

// Export singleton instance
export const lazyTreeLoader = new LazyIdentityTreeLoader();

// Export utility functions
export async function loadLazyIdentityTree(rootId: string): Promise<LazyTreeNode> {
  return lazyTreeLoader.loadIdentityTree(rootId);
}

export async function expandTreeNode(node: LazyTreeNode): Promise<void> {
  return lazyTreeLoader.expandNode(node);
}

export function collapseTreeNode(node: LazyTreeNode, unloadChildren = false): void {
  lazyTreeLoader.collapseNode(node, unloadChildren);
}

export async function searchTreeNodes(
  rootNode: LazyTreeNode,
  predicate: (identity: ExtendedSquidIdentity) => boolean,
  maxResults = 50
): Promise<LazyTreeNode[]> {
  return lazyTreeLoader.searchNodes(rootNode, predicate, maxResults);
}

export async function getTreeNodePath(rootNode: LazyTreeNode, targetDid: string): Promise<LazyTreeNode[]> {
  return lazyTreeLoader.getNodePath(rootNode, targetDid);
}

export function getTreeLoadingStats(): TreeLoadingStats {
  return lazyTreeLoader.getStats();
}

export function configureLazyLoading(config: Partial<LazyLoadingConfig>): void {
  lazyTreeLoader.configure(config);
}

export function clearTreeCache(): void {
  lazyTreeLoader.clearCache();
}