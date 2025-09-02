/**
 * Identity Hierarchy Data Structures
 * Manages tree structures and relationships between identities
 */

import { ExtendedSquidIdentity, IdentityType, IdentityTreeNode, IdentityTree } from './identity';

// Tree Navigation and Manipulation
export interface IdentityTreeOperations {
  // Tree Construction
  buildTree(identities: ExtendedSquidIdentity[]): IdentityTree;
  addNode(tree: IdentityTree, identity: ExtendedSquidIdentity): IdentityTree;
  removeNode(tree: IdentityTree, identityId: string): IdentityTree;
  
  // Tree Traversal
  findNode(tree: IdentityTree, identityId: string): IdentityTreeNode | null;
  getPath(tree: IdentityTree, identityId: string): IdentityTreeNode[];
  getAncestors(tree: IdentityTree, identityId: string): IdentityTreeNode[];
  getDescendants(tree: IdentityTree, identityId: string): IdentityTreeNode[];
  getSiblings(tree: IdentityTree, identityId: string): IdentityTreeNode[];
  
  // Tree Validation
  validateHierarchy(tree: IdentityTree): HierarchyValidationResult;
  checkCircularReference(tree: IdentityTree): boolean;
  validateDepthLimits(tree: IdentityTree): boolean;
  
  // Tree Statistics
  getTreeStats(tree: IdentityTree): TreeStatistics;
  getNodeCount(tree: IdentityTree): number;
  getMaxDepth(tree: IdentityTree): number;
  getTypeDistribution(tree: IdentityTree): Record<IdentityType, number>;
}

// Tree Validation Results
export interface HierarchyValidationResult {
  valid: boolean;
  errors: HierarchyError[];
  warnings: HierarchyWarning[];
  statistics: TreeStatistics;
}

export interface HierarchyError {
  type: 'CIRCULAR_REFERENCE' | 'INVALID_PARENT' | 'DEPTH_EXCEEDED' | 'TYPE_VIOLATION' | 'ORPHANED_NODE';
  nodeId: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface HierarchyWarning {
  type: 'DEEP_NESTING' | 'MANY_CHILDREN' | 'UNUSED_IDENTITY' | 'GOVERNANCE_MISMATCH';
  nodeId: string;
  message: string;
  recommendation?: string;
}

// Tree Statistics
export interface TreeStatistics {
  totalNodes: number;
  maxDepth: number;
  averageDepth: number;
  typeDistribution: Record<IdentityType, number>;
  leafNodes: number;
  branchNodes: number;
  orphanedNodes: number;
  lastUpdated: string;
}

// Tree Visualization Data
export interface TreeVisualizationNode {
  id: string;
  name: string;
  type: IdentityType;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
  selected: boolean;
  children: TreeVisualizationNode[];
  parent?: TreeVisualizationNode;
  metadata: {
    status: string;
    privacyLevel: string;
    hasKYC: boolean;
    childCount: number;
    lastUsed: string;
  };
}

export interface TreeVisualizationData {
  nodes: TreeVisualizationNode[];
  edges: TreeEdge[];
  layout: TreeLayout;
  viewport: TreeViewport;
}

export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  type: 'parent-child' | 'governance' | 'delegation';
  style: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
}

export interface TreeLayout {
  type: 'hierarchical' | 'radial' | 'force-directed';
  direction: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
  spacing: {
    horizontal: number;
    vertical: number;
  };
  nodeSize: {
    width: number;
    height: number;
  };
}

export interface TreeViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

// Identity Relationship Types
export enum RelationshipType {
  PARENT_CHILD = 'PARENT_CHILD',
  GOVERNANCE = 'GOVERNANCE',
  DELEGATION = 'DELEGATION',
  SIBLING = 'SIBLING',
  ANCESTOR = 'ANCESTOR',
  DESCENDANT = 'DESCENDANT'
}

export interface IdentityRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-1, how strong the relationship is
  bidirectional: boolean;
  metadata: {
    createdAt: string;
    createdBy: string;
    permissions?: string[];
    restrictions?: string[];
    expiresAt?: string;
  };
}

// Tree Manipulation Operations
export interface TreeMutation {
  type: 'ADD_NODE' | 'REMOVE_NODE' | 'MOVE_NODE' | 'UPDATE_NODE';
  nodeId: string;
  parentId?: string;
  newParentId?: string;
  data?: Partial<ExtendedSquidIdentity>;
  timestamp: string;
  performedBy: string;
}

export interface TreeMutationResult {
  success: boolean;
  mutation: TreeMutation;
  newTree: IdentityTree;
  affectedNodes: string[];
  validationErrors: string[];
  warnings: string[];
}

// Tree Search and Filtering
export interface TreeSearchCriteria {
  query?: string; // Text search in name/description
  type?: IdentityType[];
  status?: string[];
  privacyLevel?: string[];
  hasKYC?: boolean;
  depth?: {
    min?: number;
    max?: number;
  };
  createdAfter?: string;
  createdBefore?: string;
  lastUsedAfter?: string;
  tags?: string[];
}

export interface TreeSearchResult {
  nodes: IdentityTreeNode[];
  totalMatches: number;
  searchTime: number;
  criteria: TreeSearchCriteria;
  suggestions?: string[];
}

// Tree Export/Import
export interface TreeExportOptions {
  format: 'JSON' | 'XML' | 'CSV' | 'GRAPHML';
  includeMetadata: boolean;
  includeAuditLog: boolean;
  includePrivateData: boolean;
  compression?: 'gzip' | 'brotli';
}

export interface TreeExportResult {
  data: string | ArrayBuffer;
  format: string;
  size: number;
  checksum: string;
  exportedAt: string;
  exportedBy: string;
}

export interface TreeImportOptions {
  format: 'JSON' | 'XML' | 'CSV' | 'GRAPHML';
  validateStructure: boolean;
  mergeStrategy: 'REPLACE' | 'MERGE' | 'APPEND';
  conflictResolution: 'SKIP' | 'OVERWRITE' | 'RENAME';
}

export interface TreeImportResult {
  success: boolean;
  importedNodes: number;
  skippedNodes: number;
  errors: string[];
  warnings: string[];
  newTree: IdentityTree;
}

// Tree Performance Monitoring
export interface TreePerformanceMetrics {
  operationTimes: {
    buildTree: number;
    findNode: number;
    addNode: number;
    removeNode: number;
    validateTree: number;
  };
  memoryUsage: {
    treeSize: number;
    nodeCount: number;
    averageNodeSize: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionCount: number;
  };
  lastMeasured: string;
}

// Tree Configuration
export interface TreeConfiguration {
  maxDepth: number;
  maxChildrenPerNode: number;
  enableCaching: boolean;
  cacheSize: number;
  validationLevel: 'NONE' | 'BASIC' | 'STRICT';
  autoExpand: boolean;
  defaultLayout: TreeLayout;
  performanceMonitoring: boolean;
}

// Tree Event System
export interface TreeEvent {
  type: 'NODE_ADDED' | 'NODE_REMOVED' | 'NODE_MOVED' | 'NODE_UPDATED' | 'TREE_REBUILT';
  nodeId: string;
  parentId?: string;
  timestamp: string;
  metadata?: any;
}

export interface TreeEventHandler {
  (event: TreeEvent): void;
}

export interface TreeEventEmitter {
  on(eventType: string, handler: TreeEventHandler): void;
  off(eventType: string, handler: TreeEventHandler): void;
  emit(event: TreeEvent): void;
}

// Utility Functions Interface
export interface TreeUtilities {
  // Path Operations
  getNodePath(tree: IdentityTree, nodeId: string): string;
  parseNodePath(path: string): string[];
  isValidPath(tree: IdentityTree, path: string): boolean;
  
  // Comparison Operations
  compareNodes(node1: IdentityTreeNode, node2: IdentityTreeNode): number;
  compareTrees(tree1: IdentityTree, tree2: IdentityTree): TreeComparisonResult;
  
  // Transformation Operations
  flattenTree(tree: IdentityTree): ExtendedSquidIdentity[];
  cloneTree(tree: IdentityTree): IdentityTree;
  mergeTree(tree1: IdentityTree, tree2: IdentityTree): IdentityTree;
  
  // Validation Utilities
  isValidHierarchy(identities: ExtendedSquidIdentity[]): boolean;
  findCircularReferences(identities: ExtendedSquidIdentity[]): string[];
  validateTypeHierarchy(parent: IdentityType, child: IdentityType): boolean;
}

export interface TreeComparisonResult {
  identical: boolean;
  differences: {
    added: string[];
    removed: string[];
    modified: string[];
    moved: string[];
  };
  statistics: {
    totalChanges: number;
    changePercentage: number;
  };
}

// Tree Caching System
export interface TreeCache {
  get(key: string): IdentityTree | null;
  set(key: string, tree: IdentityTree, ttl?: number): void;
  invalidate(key: string): void;
  clear(): void;
  getStats(): {
    size: number;
    hitRate: number;
    missRate: number;
  };
}

// Tree Serialization
export interface TreeSerializer {
  serialize(tree: IdentityTree): string;
  deserialize(data: string): IdentityTree;
  compress(tree: IdentityTree): ArrayBuffer;
  decompress(data: ArrayBuffer): IdentityTree;
}

// Tree Diff System
export interface TreeDiff {
  operations: TreeOperation[];
  metadata: {
    fromVersion: string;
    toVersion: string;
    createdAt: string;
    operationCount: number;
  };
}

export interface TreeOperation {
  type: 'INSERT' | 'DELETE' | 'MOVE' | 'UPDATE';
  path: string;
  value?: any;
  oldValue?: any;
}

export interface TreeDiffEngine {
  diff(oldTree: IdentityTree, newTree: IdentityTree): TreeDiff;
  apply(tree: IdentityTree, diff: TreeDiff): IdentityTree;
  reverse(diff: TreeDiff): TreeDiff;
  merge(diff1: TreeDiff, diff2: TreeDiff): TreeDiff;
}