/**
 * Identity Tree Management Utilities
 * Provides functions for traversing, manipulating, and validating identity hierarchies
 */

import {
  ExtendedSquidIdentity,
  IdentityTree,
  IdentityTreeNode,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  ValidationResult,
  IdentityFilter,
  IdentitySort,
  IdentityQuery,
  IDENTITY_TYPE_RULES
} from '@/types/identity';

// Tree Traversal Functions

/**
 * Performs depth-first traversal of identity tree
 */
export function traverseTreeDepthFirst(
  node: IdentityTreeNode,
  callback: (node: IdentityTreeNode, depth: number) => void,
  depth: number = 0
): void {
  callback(node, depth);
  
  for (const child of node.children) {
    traverseTreeDepthFirst(child, callback, depth + 1);
  }
}

/**
 * Performs breadth-first traversal of identity tree
 */
export function traverseTreeBreadthFirst(
  root: IdentityTreeNode,
  callback: (node: IdentityTreeNode, depth: number) => void
): void {
  const queue: Array<{ node: IdentityTreeNode; depth: number }> = [{ node: root, depth: 0 }];
  
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    callback(node, depth);
    
    for (const child of node.children) {
      queue.push({ node: child, depth: depth + 1 });
    }
  }
}

/**
 * Finds a node in the tree by identity DID
 */
export function findNodeById(root: IdentityTreeNode, identityId: string): IdentityTreeNode | null {
  if (root.identity.did === identityId) {
    return root;
  }
  
  for (const child of root.children) {
    const found = findNodeById(child, identityId);
    if (found) return found;
  }
  
  return null;
}

/**
 * Finds all nodes matching a predicate function
 */
export function findNodes(
  root: IdentityTreeNode,
  predicate: (node: IdentityTreeNode) => boolean
): IdentityTreeNode[] {
  const results: IdentityTreeNode[] = [];
  
  traverseTreeDepthFirst(root, (node) => {
    if (predicate(node)) {
      results.push(node);
    }
  });
  
  return results;
}

/**
 * Gets the path from root to a specific node
 */
export function getPathToNode(root: IdentityTreeNode, targetId: string): IdentityTreeNode[] | null {
  const path: IdentityTreeNode[] = [];
  
  function findPath(node: IdentityTreeNode): boolean {
    path.push(node);
    
    if (node.identity.did === targetId) {
      return true;
    }
    
    for (const child of node.children) {
      if (findPath(child)) {
        return true;
      }
    }
    
    path.pop();
    return false;
  }
  
  return findPath(root) ? path : null;
}

/**
 * Gets all ancestor nodes of a specific identity
 */
export function getAncestors(root: IdentityTreeNode, identityId: string): IdentityTreeNode[] {
  const path = getPathToNode(root, identityId);
  return path ? path.slice(0, -1) : []; // Exclude the target node itself
}

/**
 * Gets all descendant nodes of a specific identity
 */
export function getDescendants(node: IdentityTreeNode): IdentityTreeNode[] {
  const descendants: IdentityTreeNode[] = [];
  
  for (const child of node.children) {
    descendants.push(child);
    descendants.push(...getDescendants(child));
  }
  
  return descendants;
}

/**
 * Gets all sibling nodes of a specific identity
 */
export function getSiblings(root: IdentityTreeNode, identityId: string): IdentityTreeNode[] {
  const targetNode = findNodeById(root, identityId);
  if (!targetNode || !targetNode.parent) {
    return [];
  }
  
  return targetNode.parent.children.filter(child => child.identity.did !== identityId);
}

// Tree Manipulation Functions

/**
 * Adds a new identity node to the tree
 */
export function addNodeToTree(
  root: IdentityTreeNode,
  parentId: string,
  newIdentity: ExtendedSquidIdentity
): IdentityTreeNode | null {
  const parentNode = findNodeById(root, parentId);
  if (!parentNode) {
    return null;
  }
  
  const newNode: IdentityTreeNode = {
    identity: newIdentity,
    children: [],
    parent: parentNode,
    expanded: false
  };
  
  parentNode.children.push(newNode);
  return newNode;
}

/**
 * Removes a node and all its descendants from the tree
 */
export function removeNodeFromTree(root: IdentityTreeNode, identityId: string): boolean {
  // Can't remove root node
  if (root.identity.did === identityId) {
    return false;
  }
  
  function removeFromParent(node: IdentityTreeNode): boolean {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      
      if (child.identity.did === identityId) {
        node.children.splice(i, 1);
        return true;
      }
      
      if (removeFromParent(child)) {
        return true;
      }
    }
    
    return false;
  }
  
  return removeFromParent(root);
}

/**
 * Moves a node to a new parent in the tree
 */
export function moveNodeInTree(
  root: IdentityTreeNode,
  nodeId: string,
  newParentId: string
): boolean {
  const nodeToMove = findNodeById(root, nodeId);
  const newParent = findNodeById(root, newParentId);
  
  if (!nodeToMove || !newParent || nodeToMove === root) {
    return false;
  }
  
  // Check if new parent is not a descendant of the node being moved
  const descendants = getDescendants(nodeToMove);
  if (descendants.some(desc => desc.identity.did === newParentId)) {
    return false; // Would create a cycle
  }
  
  // Remove from current parent
  if (nodeToMove.parent) {
    const currentParent = nodeToMove.parent;
    const index = currentParent.children.indexOf(nodeToMove);
    if (index > -1) {
      currentParent.children.splice(index, 1);
    }
  }
  
  // Add to new parent
  nodeToMove.parent = newParent;
  newParent.children.push(nodeToMove);
  
  // Update identity hierarchy data
  nodeToMove.identity.parentId = newParentId;
  nodeToMove.identity.depth = newParent.identity.depth + 1;
  nodeToMove.identity.path = [...newParent.identity.path, newParentId];
  
  // Update all descendants' depth and path
  function updateDescendants(node: IdentityTreeNode) {
    for (const child of node.children) {
      child.identity.depth = node.identity.depth + 1;
      child.identity.path = [...node.identity.path, node.identity.did];
      updateDescendants(child);
    }
  }
  
  updateDescendants(nodeToMove);
  
  return true;
}

// Tree Validation Functions

/**
 * Validates the entire identity tree structure
 */
export function validateIdentityTree(tree: IdentityTree): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check root node
  if (tree.root.identity.type !== IdentityType.ROOT) {
    errors.push('Root node must be of type ROOT');
  }
  
  if (tree.root.identity.depth !== 0) {
    errors.push('Root node depth must be 0');
  }
  
  if (tree.root.identity.parentId) {
    errors.push('Root node cannot have a parent');
  }
  
  // Validate each node in the tree
  traverseTreeDepthFirst(tree.root, (node, depth) => {
    const nodeErrors = validateIdentityNode(node, depth);
    errors.push(...nodeErrors.errors);
    warnings.push(...nodeErrors.warnings);
  });
  
  // Check for orphaned nodes
  const allNodes: IdentityTreeNode[] = [];
  traverseTreeDepthFirst(tree.root, (node) => allNodes.push(node));
  
  if (allNodes.length !== tree.totalNodes) {
    warnings.push(`Tree node count mismatch: expected ${tree.totalNodes}, found ${allNodes.length}`);
  }
  
  // Check max depth
  let actualMaxDepth = 0;
  traverseTreeDepthFirst(tree.root, (node, depth) => {
    actualMaxDepth = Math.max(actualMaxDepth, depth);
  });
  
  if (actualMaxDepth !== tree.maxDepth) {
    warnings.push(`Tree max depth mismatch: expected ${tree.maxDepth}, found ${actualMaxDepth}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements: {
      kyc: false,
      governance: false,
      parentalConsent: false,
      daoApproval: false
    }
  };
}

/**
 * Validates a single identity node
 */
export function validateIdentityNode(node: IdentityTreeNode, expectedDepth: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const identity = node.identity;
  
  // Check depth consistency
  if (identity.depth !== expectedDepth) {
    errors.push(`Identity ${identity.did} has incorrect depth: expected ${expectedDepth}, got ${identity.depth}`);
  }
  
  // Check parent relationship
  if (node.parent) {
    if (identity.parentId !== node.parent.identity.did) {
      errors.push(`Identity ${identity.did} parent ID mismatch`);
    }
    
    if (!node.parent.children.includes(node)) {
      errors.push(`Identity ${identity.did} not found in parent's children`);
    }
  } else if (identity.parentId) {
    errors.push(`Identity ${identity.did} has parentId but no parent node`);
  }
  
  // Check children relationship
  for (const child of node.children) {
    if (child.identity.parentId !== identity.did) {
      errors.push(`Child ${child.identity.did} has incorrect parentId`);
    }
    
    if (child.parent !== node) {
      errors.push(`Child ${child.identity.did} has incorrect parent reference`);
    }
  }
  
  // Validate identity type rules
  const typeRules = IDENTITY_TYPE_RULES[identity.type];
  
  // Check if identity can have children
  if (node.children.length > 0 && !typeRules.canCreateSubidentities) {
    errors.push(`Identity ${identity.did} of type ${identity.type} cannot have children`);
  }
  
  // Check governance requirements
  if (identity.type === IdentityType.DAO && identity.governanceLevel !== GovernanceType.DAO) {
    warnings.push(`DAO identity ${identity.did} should have DAO governance`);
  }
  
  if (identity.type === IdentityType.CONSENTIDA && identity.governanceLevel !== GovernanceType.PARENT) {
    warnings.push(`Consentida identity ${identity.did} should have parent governance`);
  }
  
  // Check privacy level consistency
  if (identity.type === IdentityType.AID && identity.privacyLevel !== PrivacyLevel.ANONYMOUS) {
    warnings.push(`AID identity ${identity.did} should have anonymous privacy level`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements: {
      kyc: typeRules.kycRequired,
      governance: identity.type === IdentityType.DAO || identity.type === IdentityType.ENTERPRISE,
      parentalConsent: identity.type === IdentityType.CONSENTIDA,
      daoApproval: identity.type === IdentityType.ENTERPRISE
    }
  };
}

/**
 * Validates if a new identity can be created under a parent
 */
export function validateIdentityCreation(
  parentIdentity: ExtendedSquidIdentity,
  childType: IdentityType
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const parentRules = IDENTITY_TYPE_RULES[parentIdentity.type];
  const childRules = IDENTITY_TYPE_RULES[childType];
  
  // Check if parent can create children
  if (!parentRules.canCreateSubidentities) {
    errors.push(`Parent identity of type ${parentIdentity.type} cannot create subidentities`);
  }
  
  // Check if child type is allowed
  if (parentIdentity.creationRules.allowedChildTypes && 
      !parentIdentity.creationRules.allowedChildTypes.includes(childType)) {
    errors.push(`Child type ${childType} not allowed under parent type ${parentIdentity.type}`);
  }
  
  // Check depth limits
  if (parentIdentity.depth >= parentIdentity.creationRules.maxDepth - 1) {
    errors.push(`Maximum tree depth would be exceeded`);
  }
  
  // Check child count limits
  if (parentRules.maxSubidentities && 
      parentIdentity.children.length >= parentRules.maxSubidentities) {
    errors.push(`Parent has reached maximum number of subidentities`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements: {
      kyc: childRules.kycRequired,
      governance: childType === IdentityType.DAO || childType === IdentityType.ENTERPRISE,
      parentalConsent: childType === IdentityType.CONSENTIDA,
      daoApproval: childType === IdentityType.ENTERPRISE
    }
  };
}

// Tree Query and Filtering Functions

/**
 * Filters identities in the tree based on criteria
 */
export function filterIdentities(
  root: IdentityTreeNode,
  filter: IdentityFilter
): IdentityTreeNode[] {
  return findNodes(root, (node) => {
    const identity = node.identity;
    
    if (filter.type && identity.type !== filter.type) {
      return false;
    }
    
    if (filter.status && identity.status !== filter.status) {
      return false;
    }
    
    if (filter.privacyLevel && identity.privacyLevel !== filter.privacyLevel) {
      return false;
    }
    
    if (filter.hasKYC !== undefined && identity.kyc.approved !== filter.hasKYC) {
      return false;
    }
    
    if (filter.parentId && identity.parentId !== filter.parentId) {
      return false;
    }
    
    if (filter.createdAfter && identity.createdAt < filter.createdAfter) {
      return false;
    }
    
    if (filter.createdBefore && identity.createdAt > filter.createdBefore) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sorts identity nodes based on criteria
 */
export function sortIdentities(
  nodes: IdentityTreeNode[],
  sort: IdentitySort
): IdentityTreeNode[] {
  return [...nodes].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sort.field) {
      case 'name':
        aValue = a.identity.name;
        bValue = b.identity.name;
        break;
      case 'createdAt':
        aValue = new Date(a.identity.createdAt);
        bValue = new Date(b.identity.createdAt);
        break;
      case 'lastUsed':
        aValue = new Date(a.identity.lastUsed);
        bValue = new Date(b.identity.lastUsed);
        break;
      case 'type':
        aValue = a.identity.type;
        bValue = b.identity.type;
        break;
      default:
        return 0;
    }
    
    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }
    
    return sort.direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Queries identities in the tree with filtering, sorting, and pagination
 */
export function queryIdentities(
  root: IdentityTreeNode,
  query: IdentityQuery
): IdentityTreeNode[] {
  let results = findNodes(root, () => true); // Start with all nodes
  
  // Apply filter
  if (query.filter) {
    results = filterIdentities(root, query.filter);
  }
  
  // Apply sort
  if (query.sort) {
    results = sortIdentities(results, query.sort);
  }
  
  // Apply pagination
  if (query.offset || query.limit) {
    const start = query.offset || 0;
    const end = query.limit ? start + query.limit : undefined;
    results = results.slice(start, end);
  }
  
  return results;
}

// Tree Statistics and Analysis

/**
 * Calculates statistics about the identity tree
 */
export function calculateTreeStatistics(tree: IdentityTree) {
  const stats = {
    totalNodes: 0,
    nodesByType: {} as Record<IdentityType, number>,
    nodesByDepth: {} as Record<number, number>,
    nodesByGovernance: {} as Record<GovernanceType, number>,
    nodesByPrivacy: {} as Record<PrivacyLevel, number>,
    averageDepth: 0,
    maxDepth: 0,
    leafNodes: 0,
    branchingFactor: 0
  };
  
  const depths: number[] = [];
  const childCounts: number[] = [];
  
  traverseTreeDepthFirst(tree.root, (node, depth) => {
    const identity = node.identity;
    
    stats.totalNodes++;
    depths.push(depth);
    childCounts.push(node.children.length);
    
    // Count by type
    stats.nodesByType[identity.type] = (stats.nodesByType[identity.type] || 0) + 1;
    
    // Count by depth
    stats.nodesByDepth[depth] = (stats.nodesByDepth[depth] || 0) + 1;
    
    // Count by governance
    stats.nodesByGovernance[identity.governanceLevel] = 
      (stats.nodesByGovernance[identity.governanceLevel] || 0) + 1;
    
    // Count by privacy
    stats.nodesByPrivacy[identity.privacyLevel] = 
      (stats.nodesByPrivacy[identity.privacyLevel] || 0) + 1;
    
    // Count leaf nodes
    if (node.children.length === 0) {
      stats.leafNodes++;
    }
    
    stats.maxDepth = Math.max(stats.maxDepth, depth);
  });
  
  // Calculate averages
  stats.averageDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
  stats.branchingFactor = childCounts.reduce((sum, c) => sum + c, 0) / childCounts.length;
  
  return stats;
}

// Tree Visualization Data Structures

/**
 * Converts tree to a flat list for visualization
 */
export function treeToFlatList(root: IdentityTreeNode): Array<{
  identity: ExtendedSquidIdentity;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isVisible: boolean;
}> {
  const flatList: Array<{
    identity: ExtendedSquidIdentity;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    isVisible: boolean;
  }> = [];
  
  function addToList(node: IdentityTreeNode, depth: number, parentExpanded: boolean = true) {
    const isVisible = depth === 0 || parentExpanded;
    
    flatList.push({
      identity: node.identity,
      depth,
      hasChildren: node.children.length > 0,
      isExpanded: node.expanded || false,
      isVisible
    });
    
    if (node.expanded || depth === 0) {
      for (const child of node.children) {
        addToList(child, depth + 1, isVisible && (node.expanded || false));
      }
    }
  }
  
  addToList(root, 0);
  return flatList;
}

/**
 * Converts tree to hierarchical data for tree components
 */
export function treeToHierarchicalData(root: IdentityTreeNode): any {
  function nodeToData(node: IdentityTreeNode): any {
    return {
      id: node.identity.did,
      name: node.identity.name,
      type: node.identity.type,
      privacyLevel: node.identity.privacyLevel,
      governanceLevel: node.identity.governanceLevel,
      hasChildren: node.children.length > 0,
      expanded: node.expanded || false,
      children: node.children.map(child => nodeToData(child))
    };
  }
  
  return nodeToData(root);
}

// Tree Expansion/Collapse Utilities

/**
 * Expands a node and optionally all its descendants
 */
export function expandNode(
  root: IdentityTreeNode,
  nodeId: string,
  recursive: boolean = false
): boolean {
  const node = findNodeById(root, nodeId);
  if (!node) return false;
  
  node.expanded = true;
  
  if (recursive) {
    traverseTreeDepthFirst(node, (descendant) => {
      descendant.expanded = true;
    });
  }
  
  return true;
}

/**
 * Collapses a node and all its descendants
 */
export function collapseNode(root: IdentityTreeNode, nodeId: string): boolean {
  const node = findNodeById(root, nodeId);
  if (!node) return false;
  
  traverseTreeDepthFirst(node, (descendant) => {
    descendant.expanded = false;
  });
  
  return true;
}

/**
 * Toggles the expansion state of a node
 */
export function toggleNodeExpansion(root: IdentityTreeNode, nodeId: string): boolean {
  const node = findNodeById(root, nodeId);
  if (!node) return false;
  
  node.expanded = !node.expanded;
  return true;
}

/**
 * Expands all nodes up to a certain depth
 */
export function expandToDepth(root: IdentityTreeNode, maxDepth: number): void {
  traverseTreeDepthFirst(root, (node, depth) => {
    node.expanded = depth < maxDepth;
  });
}

/**
 * Collapses all nodes in the tree
 */
export function collapseAll(root: IdentityTreeNode): void {
  traverseTreeDepthFirst(root, (node) => {
    node.expanded = false;
  });
}

/**
 * Expands all nodes in the tree
 */
export function expandAll(root: IdentityTreeNode): void {
  traverseTreeDepthFirst(root, (node) => {
    node.expanded = true;
  });
}