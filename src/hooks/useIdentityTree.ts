/**
 * useIdentityTree Hook
 * Hook for identity hierarchy visualization with tree expansion/collapse state management
 * Requirements: 1.1, 1.2
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useIdentityStore } from '@/state/identity';
import { identityManager } from '@/services/IdentityManager';
import {
  IdentityTreeNode,
  IdentityTree,
  ExtendedSquidIdentity,
  IdentityType,
  UseIdentityTreeReturn
} from '@/types/identity';

export const useIdentityTree = (rootId?: string): UseIdentityTreeReturn => {
  // Local state for tree visualization
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get state from the identity store
  const {
    identityTree: storeTree,
    activeIdentity,
    identities,
    buildIdentityTree,
    getRootIdentity
  } = useIdentityStore();

  // Determine the root ID to use
  const effectiveRootId = useMemo(() => {
    if (rootId) return rootId;
    if (activeIdentity?.rootId) return activeIdentity.rootId;
    const rootIdentity = getRootIdentity();
    return rootIdentity?.did || null;
  }, [rootId, activeIdentity, getRootIdentity]);

  // Get the tree from store or build it
  const tree = useMemo(() => {
    if (!effectiveRootId) return null;
    
    // If we have a tree in store and it matches our root, use it
    if (storeTree && storeTree.root.identity.did === effectiveRootId) {
      return storeTree.root;
    }

    // Otherwise, build a tree from the identities in the store
    const rootIdentity = identities.get(effectiveRootId);
    if (!rootIdentity) return null;

    const buildTreeNode = (identity: ExtendedSquidIdentity): IdentityTreeNode => {
      const node: IdentityTreeNode = {
        identity,
        children: [],
        expanded: expandedNodes.includes(identity.did)
      };

      // Add children recursively
      identity.children.forEach(childId => {
        const childIdentity = identities.get(childId);
        if (childIdentity) {
          const childNode = buildTreeNode(childIdentity);
          childNode.parent = node;
          node.children.push(childNode);
        }
      });

      return node;
    };

    return buildTreeNode(rootIdentity);
  }, [effectiveRootId, storeTree, identities, expandedNodes]);

  /**
   * Toggle expansion state of a tree node
   * Requirements: 1.1, 1.2
   */
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const isExpanded = prev.includes(nodeId);
      if (isExpanded) {
        // Collapse node and all its descendants
        const nodeToCollapse = findNodeInTree(tree, nodeId);
        if (nodeToCollapse) {
          const descendantIds = getAllDescendantIds(nodeToCollapse);
          return prev.filter(id => id !== nodeId && !descendantIds.includes(id));
        }
        return prev.filter(id => id !== nodeId);
      } else {
        // Expand node
        return [...prev, nodeId];
      }
    });

    console.log(`[useIdentityTree] Toggled node: ${nodeId}`);
  }, [tree]);

  /**
   * Select a tree node
   * Requirements: 1.1, 1.2
   */
  const selectNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    console.log(`[useIdentityTree] Selected node: ${nodeId}`);
  }, []);

  /**
   * Expand all nodes in the tree
   */
  const expandAll = useCallback(() => {
    if (!tree) return;

    const allNodeIds = getAllNodeIds(tree);
    setExpandedNodes(allNodeIds);
    console.log(`[useIdentityTree] Expanded all nodes (${allNodeIds.length} nodes)`);
  }, [tree]);

  /**
   * Collapse all nodes in the tree
   */
  const collapseAll = useCallback(() => {
    setExpandedNodes([]);
    console.log('[useIdentityTree] Collapsed all nodes');
  }, []);

  /**
   * Expand to a specific node (expand all parents)
   */
  const expandToNode = useCallback((nodeId: string) => {
    if (!tree) return;

    const targetNode = findNodeInTree(tree, nodeId);
    if (!targetNode) return;

    const pathToRoot = getPathToRoot(targetNode);
    const nodesToExpand = pathToRoot.map(node => node.identity.did);
    
    setExpandedNodes(prev => {
      const newExpanded = new Set([...prev, ...nodesToExpand]);
      return Array.from(newExpanded);
    });

    console.log(`[useIdentityTree] Expanded path to node: ${nodeId}`);
  }, [tree]);

  /**
   * Get tree statistics
   */
  const getTreeStats = useCallback(() => {
    if (!tree) {
      return {
        totalNodes: 0,
        maxDepth: 0,
        expandedNodes: 0,
        nodesByType: {
          [IdentityType.ROOT]: 0,
          [IdentityType.DAO]: 0,
          [IdentityType.ENTERPRISE]: 0,
          [IdentityType.CONSENTIDA]: 0,
          [IdentityType.AID]: 0
        }
      };
    }

    const stats = {
      totalNodes: 0,
      maxDepth: 0,
      expandedNodes: expandedNodes.length,
      nodesByType: {
        [IdentityType.ROOT]: 0,
        [IdentityType.DAO]: 0,
        [IdentityType.ENTERPRISE]: 0,
        [IdentityType.CONSENTIDA]: 0,
        [IdentityType.AID]: 0
      }
    };

    const traverseTree = (node: IdentityTreeNode, depth: number) => {
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      stats.nodesByType[node.identity.type]++;

      node.children.forEach(child => traverseTree(child, depth + 1));
    };

    traverseTree(tree, 0);
    return stats;
  }, [tree, expandedNodes]);

  /**
   * Find nodes by criteria
   */
  const findNodes = useCallback((
    predicate: (identity: ExtendedSquidIdentity) => boolean
  ): IdentityTreeNode[] => {
    if (!tree) return [];

    const results: IdentityTreeNode[] = [];

    const traverseTree = (node: IdentityTreeNode) => {
      if (predicate(node.identity)) {
        results.push(node);
      }
      node.children.forEach(child => traverseTree(child));
    };

    traverseTree(tree);
    return results;
  }, [tree]);

  /**
   * Get visible nodes (considering expansion state)
   */
  const getVisibleNodes = useCallback((): IdentityTreeNode[] => {
    if (!tree) return [];

    const visibleNodes: IdentityTreeNode[] = [];

    const traverseTree = (node: IdentityTreeNode, isVisible: boolean = true) => {
      if (isVisible) {
        visibleNodes.push(node);
      }

      // Children are visible only if current node is expanded
      const childrenVisible = isVisible && expandedNodes.includes(node.identity.did);
      node.children.forEach(child => traverseTree(child, childrenVisible));
    };

    traverseTree(tree);
    return visibleNodes;
  }, [tree, expandedNodes]);

  /**
   * Refresh the tree from the store
   */
  const refreshTree = useCallback(async () => {
    if (!effectiveRootId) return;

    try {
      setLoading(true);
      setError(null);

      await buildIdentityTree(effectiveRootId);
      console.log(`[useIdentityTree] Refreshed tree for root: ${effectiveRootId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh identity tree';
      console.error('[useIdentityTree] Error refreshing tree:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [effectiveRootId, buildIdentityTree]);

  /**
   * Get node by ID
   */
  const getNodeById = useCallback((nodeId: string): IdentityTreeNode | null => {
    return tree ? findNodeInTree(tree, nodeId) : null;
  }, [tree]);

  /**
   * Check if node is expanded
   */
  const isNodeExpanded = useCallback((nodeId: string): boolean => {
    return expandedNodes.includes(nodeId);
  }, [expandedNodes]);

  /**
   * Check if node is selected
   */
  const isNodeSelected = useCallback((nodeId: string): boolean => {
    return selectedNode === nodeId;
  }, [selectedNode]);

  /**
   * Get children of a specific node
   */
  const getNodeChildren = useCallback((nodeId: string): IdentityTreeNode[] => {
    const node = getNodeById(nodeId);
    return node ? node.children : [];
  }, [getNodeById]);

  /**
   * Get parent of a specific node
   */
  const getNodeParent = useCallback((nodeId: string): IdentityTreeNode | null => {
    const node = getNodeById(nodeId);
    return node?.parent || null;
  }, [getNodeById]);

  /**
   * Get siblings of a specific node
   */
  const getNodeSiblings = useCallback((nodeId: string): IdentityTreeNode[] => {
    const node = getNodeById(nodeId);
    if (!node?.parent) return [];
    
    return node.parent.children.filter(sibling => sibling.identity.did !== nodeId);
  }, [getNodeById]);

  // Effect to auto-expand root node on initial load
  useEffect(() => {
    if (tree && !expandedNodes.includes(tree.identity.did)) {
      setExpandedNodes(prev => [...prev, tree.identity.did]);
    }
  }, [tree?.identity.did]);

  // Effect to build tree if we have a root ID but no tree
  useEffect(() => {
    if (effectiveRootId && !tree && !loading) {
      refreshTree();
    }
  }, [effectiveRootId, tree, loading, refreshTree]);

  // Effect to clear error when tree changes successfully
  useEffect(() => {
    if (tree && error) {
      setError(null);
    }
  }, [tree, error]);

  // Effect to log tree state changes
  useEffect(() => {
    if (tree) {
      console.log(`[useIdentityTree] Tree updated - Root: ${tree.identity.did}, Expanded: ${expandedNodes.length}, Selected: ${selectedNode || 'none'}`);
    }
  }, [tree, expandedNodes.length, selectedNode]);

  return {
    // Core tree data
    tree,
    loading,
    error,

    // Node state
    expandedNodes,
    selectedNode,

    // Tree manipulation
    toggleNode,
    selectNode,
    expandAll,
    collapseAll,
    expandToNode,

    // Tree queries
    getTreeStats,
    findNodes,
    getVisibleNodes,
    getNodeById,
    getNodeChildren,
    getNodeParent,
    getNodeSiblings,

    // Node state queries
    isNodeExpanded,
    isNodeSelected,

    // Utility functions
    refreshTree
  };
};

// Helper functions
function findNodeInTree(tree: IdentityTreeNode | null, nodeId: string): IdentityTreeNode | null {
  if (!tree) return null;
  
  if (tree.identity.did === nodeId) {
    return tree;
  }
  
  for (const child of tree.children) {
    const found = findNodeInTree(child, nodeId);
    if (found) return found;
  }
  
  return null;
}

function getAllNodeIds(tree: IdentityTreeNode): string[] {
  const ids: string[] = [tree.identity.did];
  
  tree.children.forEach(child => {
    ids.push(...getAllNodeIds(child));
  });
  
  return ids;
}

function getAllDescendantIds(tree: IdentityTreeNode): string[] {
  const ids: string[] = [];
  
  tree.children.forEach(child => {
    ids.push(child.identity.did);
    ids.push(...getAllDescendantIds(child));
  });
  
  return ids;
}

function getPathToRoot(node: IdentityTreeNode): IdentityTreeNode[] {
  const path: IdentityTreeNode[] = [];
  let current: IdentityTreeNode | undefined = node;
  
  while (current) {
    path.unshift(current);
    current = current.parent;
  }
  
  return path;
}

export default useIdentityTree;