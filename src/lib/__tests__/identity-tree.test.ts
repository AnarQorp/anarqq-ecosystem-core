/**
 * Unit tests for Identity Tree Management Utilities
 * Tests tree traversal, manipulation, validation, and query functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  traverseTreeDepthFirst,
  traverseTreeBreadthFirst,
  findNodeById,
  findNodes,
  getPathToNode,
  getAncestors,
  getDescendants,
  getSiblings,
  addNodeToTree,
  removeNodeFromTree,
  moveNodeInTree,
  validateIdentityTree,
  validateIdentityNode,
  validateIdentityCreation,
  filterIdentities,
  sortIdentities,
  queryIdentities,
  calculateTreeStatistics,
  treeToFlatList,
  treeToHierarchicalData,
  expandNode,
  collapseNode,
  toggleNodeExpansion,
  expandToDepth,
  collapseAll,
  expandAll
} from '../identity-tree';

import {
  ExtendedSquidIdentity,
  IdentityTree,
  IdentityTreeNode,
  IdentityType,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel,
  IdentityFilter,
  IdentitySort
} from '@/types/identity';

// Helper function to create a mock identity
function createMockIdentity(
  did: string,
  name: string,
  type: IdentityType,
  parentId?: string,
  depth: number = 0
): ExtendedSquidIdentity {
  const now = new Date().toISOString();
  return {
    did,
    name,
    type,
    parentId,
    rootId: parentId ? 'did:squid:root' : did,
    children: [],
    depth,
    path: parentId ? ['did:squid:root'] : [],
    governanceLevel: type === IdentityType.DAO ? GovernanceType.DAO : GovernanceType.SELF,
    creationRules: {
      type,
      requiresKYC: type === IdentityType.DAO,
      requiresDAOGovernance: type === IdentityType.ENTERPRISE,
      requiresParentalConsent: type === IdentityType.CONSENTIDA,
      maxDepth: 3,
      allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
    },
    permissions: {
      canCreateSubidentities: type !== IdentityType.CONSENTIDA && type !== IdentityType.AID,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: () => true,
      canPerformAction: () => true,
      governanceLevel: GovernanceType.SELF
    },
    status: IdentityStatus.ACTIVE,
    qonsentProfileId: `qonsent-${did}`,
    qlockKeyPair: {
      publicKey: `pub-${did}`,
      privateKey: `priv-${did}`,
      algorithm: 'ECDSA',
      keySize: 256,
      createdAt: now
    },
    privacyLevel: type === IdentityType.AID ? PrivacyLevel.ANONYMOUS : PrivacyLevel.PUBLIC,
    tags: [],
    createdAt: now,
    updatedAt: now,
    lastUsed: now,
    kyc: {
      required: type === IdentityType.DAO,
      submitted: type === IdentityType.DAO,
      approved: type === IdentityType.DAO
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: true
  };
}

// Helper function to create a test tree
function createTestTree(): IdentityTree {
  const root = createMockIdentity('did:squid:root', 'Root Identity', IdentityType.ROOT);
  const dao1 = createMockIdentity('did:squid:dao1', 'DAO 1', IdentityType.DAO, 'did:squid:root', 1);
  const dao2 = createMockIdentity('did:squid:dao2', 'DAO 2', IdentityType.DAO, 'did:squid:root', 1);
  const consentida1 = createMockIdentity('did:squid:con1', 'Consentida 1', IdentityType.CONSENTIDA, 'did:squid:dao1', 2);
  const aid1 = createMockIdentity('did:squid:aid1', 'AID 1', IdentityType.AID, 'did:squid:dao2', 2);

  // Update children arrays
  root.children = ['did:squid:dao1', 'did:squid:dao2'];
  dao1.children = ['did:squid:con1'];
  dao2.children = ['did:squid:aid1'];

  const rootNode: IdentityTreeNode = {
    identity: root,
    children: [],
    expanded: true
  };

  const dao1Node: IdentityTreeNode = {
    identity: dao1,
    children: [],
    parent: rootNode,
    expanded: false
  };

  const dao2Node: IdentityTreeNode = {
    identity: dao2,
    children: [],
    parent: rootNode,
    expanded: false
  };

  const consentida1Node: IdentityTreeNode = {
    identity: consentida1,
    children: [],
    parent: dao1Node,
    expanded: false
  };

  const aid1Node: IdentityTreeNode = {
    identity: aid1,
    children: [],
    parent: dao2Node,
    expanded: false
  };

  // Set up tree structure
  rootNode.children = [dao1Node, dao2Node];
  dao1Node.children = [consentida1Node];
  dao2Node.children = [aid1Node];

  return {
    root: rootNode,
    totalNodes: 5,
    maxDepth: 2,
    lastUpdated: new Date().toISOString()
  };
}

describe('Identity Tree Management Utilities', () => {
  let testTree: IdentityTree;

  beforeEach(() => {
    testTree = createTestTree();
  });

  describe('Tree Traversal Functions', () => {
    it('should traverse tree depth-first correctly', () => {
      const visitedNodes: string[] = [];
      const visitedDepths: number[] = [];

      traverseTreeDepthFirst(testTree.root, (node, depth) => {
        visitedNodes.push(node.identity.name);
        visitedDepths.push(depth);
      });

      expect(visitedNodes).toEqual([
        'Root Identity',
        'DAO 1',
        'Consentida 1',
        'DAO 2',
        'AID 1'
      ]);
      expect(visitedDepths).toEqual([0, 1, 2, 1, 2]);
    });

    it('should traverse tree breadth-first correctly', () => {
      const visitedNodes: string[] = [];
      const visitedDepths: number[] = [];

      traverseTreeBreadthFirst(testTree.root, (node, depth) => {
        visitedNodes.push(node.identity.name);
        visitedDepths.push(depth);
      });

      expect(visitedNodes).toEqual([
        'Root Identity',
        'DAO 1',
        'DAO 2',
        'Consentida 1',
        'AID 1'
      ]);
      expect(visitedDepths).toEqual([0, 1, 1, 2, 2]);
    });

    it('should find node by ID correctly', () => {
      const node = findNodeById(testTree.root, 'did:squid:dao1');
      expect(node).toBeDefined();
      expect(node!.identity.name).toBe('DAO 1');

      const notFound = findNodeById(testTree.root, 'did:squid:nonexistent');
      expect(notFound).toBeNull();
    });

    it('should find nodes by predicate', () => {
      const daoNodes = findNodes(testTree.root, (node) => 
        node.identity.type === IdentityType.DAO
      );

      expect(daoNodes).toHaveLength(2);
      expect(daoNodes.map(n => n.identity.name)).toEqual(['DAO 1', 'DAO 2']);
    });

    it('should get path to node correctly', () => {
      const path = getPathToNode(testTree.root, 'did:squid:con1');
      expect(path).toBeDefined();
      expect(path!.map(n => n.identity.name)).toEqual([
        'Root Identity',
        'DAO 1',
        'Consentida 1'
      ]);

      const noPath = getPathToNode(testTree.root, 'did:squid:nonexistent');
      expect(noPath).toBeNull();
    });

    it('should get ancestors correctly', () => {
      const ancestors = getAncestors(testTree.root, 'did:squid:con1');
      expect(ancestors.map(n => n.identity.name)).toEqual([
        'Root Identity',
        'DAO 1'
      ]);

      const rootAncestors = getAncestors(testTree.root, 'did:squid:root');
      expect(rootAncestors).toEqual([]);
    });

    it('should get descendants correctly', () => {
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      const descendants = getDescendants(dao1Node);
      expect(descendants.map(n => n.identity.name)).toEqual(['Consentida 1']);

      const rootDescendants = getDescendants(testTree.root);
      expect(rootDescendants).toHaveLength(4);
    });

    it('should get siblings correctly', () => {
      const siblings = getSiblings(testTree.root, 'did:squid:dao1');
      expect(siblings.map(n => n.identity.name)).toEqual(['DAO 2']);

      const rootSiblings = getSiblings(testTree.root, 'did:squid:root');
      expect(rootSiblings).toEqual([]);
    });
  });

  describe('Tree Manipulation Functions', () => {
    it('should add node to tree correctly', () => {
      const newIdentity = createMockIdentity(
        'did:squid:new',
        'New Identity',
        IdentityType.AID,
        'did:squid:dao1',
        2
      );

      const newNode = addNodeToTree(testTree.root, 'did:squid:dao1', newIdentity);
      expect(newNode).toBeDefined();
      expect(newNode!.identity.name).toBe('New Identity');
      expect(newNode!.parent!.identity.did).toBe('did:squid:dao1');

      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      expect(dao1Node.children).toHaveLength(2);
    });

    it('should fail to add node to non-existent parent', () => {
      const newIdentity = createMockIdentity(
        'did:squid:new',
        'New Identity',
        IdentityType.AID,
        'did:squid:nonexistent',
        2
      );

      const newNode = addNodeToTree(testTree.root, 'did:squid:nonexistent', newIdentity);
      expect(newNode).toBeNull();
    });

    it('should remove node from tree correctly', () => {
      const removed = removeNodeFromTree(testTree.root, 'did:squid:con1');
      expect(removed).toBe(true);

      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      expect(dao1Node.children).toHaveLength(0);

      const notFound = findNodeById(testTree.root, 'did:squid:con1');
      expect(notFound).toBeNull();
    });

    it('should fail to remove root node', () => {
      const removed = removeNodeFromTree(testTree.root, 'did:squid:root');
      expect(removed).toBe(false);
    });

    it('should move node in tree correctly', () => {
      const moved = moveNodeInTree(testTree.root, 'did:squid:con1', 'did:squid:dao2');
      expect(moved).toBe(true);

      // Check old parent
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      expect(dao1Node.children).toHaveLength(0);

      // Check new parent
      const dao2Node = findNodeById(testTree.root, 'did:squid:dao2')!;
      expect(dao2Node.children).toHaveLength(2);

      // Check moved node
      const movedNode = findNodeById(testTree.root, 'did:squid:con1')!;
      expect(movedNode.parent!.identity.did).toBe('did:squid:dao2');
      expect(movedNode.identity.parentId).toBe('did:squid:dao2');
      expect(movedNode.identity.depth).toBe(2);
    });

    it('should prevent moving node to create cycle', () => {
      const moved = moveNodeInTree(testTree.root, 'did:squid:dao1', 'did:squid:con1');
      expect(moved).toBe(false);
    });

    it('should fail to move root node', () => {
      const moved = moveNodeInTree(testTree.root, 'did:squid:root', 'did:squid:dao1');
      expect(moved).toBe(false);
    });
  });

  describe('Tree Validation Functions', () => {
    it('should validate correct tree structure', () => {
      const result = validateIdentityTree(testTree);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid root type', () => {
      testTree.root.identity.type = IdentityType.DAO;
      const result = validateIdentityTree(testTree);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Root node must be of type ROOT');
    });

    it('should detect incorrect depth', () => {
      testTree.root.identity.depth = 1;
      const result = validateIdentityTree(testTree);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Root node depth must be 0');
    });

    it('should validate individual node correctly', () => {
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      const result = validateIdentityNode(dao1Node, 1);
      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
      expect(result.requirements.governance).toBe(true);
    });

    it('should validate identity creation rules', () => {
      const rootIdentity = testTree.root.identity;
      // Update the root identity to allow DAO creation
      rootIdentity.creationRules.allowedChildTypes = [IdentityType.DAO, IdentityType.CONSENTIDA, IdentityType.AID];
      
      const result = validateIdentityCreation(rootIdentity, IdentityType.DAO);
      expect(result.valid).toBe(true);
      expect(result.requirements.kyc).toBe(true);
      expect(result.requirements.governance).toBe(true);
    });

    it('should prevent invalid identity creation', () => {
      const consentidaNode = findNodeById(testTree.root, 'did:squid:con1')!;
      const result = validateIdentityCreation(consentidaNode.identity, IdentityType.DAO);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parent identity of type CONSENTIDA cannot create subidentities');
    });
  });

  describe('Tree Query and Filtering Functions', () => {
    it('should filter identities by type', () => {
      const filter: IdentityFilter = { type: IdentityType.DAO };
      const results = filterIdentities(testTree.root, filter);
      expect(results).toHaveLength(2);
      expect(results.every(n => n.identity.type === IdentityType.DAO)).toBe(true);
    });

    it('should filter identities by privacy level', () => {
      const filter: IdentityFilter = { privacyLevel: PrivacyLevel.ANONYMOUS };
      const results = filterIdentities(testTree.root, filter);
      expect(results).toHaveLength(1);
      expect(results[0].identity.type).toBe(IdentityType.AID);
    });

    it('should sort identities by name', () => {
      const allNodes = findNodes(testTree.root, () => true);
      const sort: IdentitySort = { field: 'name', direction: 'asc' };
      const sorted = sortIdentities(allNodes, sort);
      
      const names = sorted.map(n => n.identity.name);
      expect(names).toEqual([
        'AID 1',
        'Consentida 1',
        'DAO 1',
        'DAO 2',
        'Root Identity'
      ]);
    });

    it('should sort identities by type descending', () => {
      const allNodes = findNodes(testTree.root, () => true);
      const sort: IdentitySort = { field: 'type', direction: 'desc' };
      const sorted = sortIdentities(allNodes, sort);
      
      const types = sorted.map(n => n.identity.type);
      expect(types[0]).toBe(IdentityType.ROOT);
      expect(types[types.length - 1]).toBe(IdentityType.AID);
    });

    it('should query identities with filter and sort', () => {
      const query = {
        filter: { type: IdentityType.DAO },
        sort: { field: 'name' as const, direction: 'desc' as const },
        limit: 1
      };
      
      const results = queryIdentities(testTree.root, query);
      expect(results).toHaveLength(1);
      expect(results[0].identity.name).toBe('DAO 2');
    });
  });

  describe('Tree Statistics and Analysis', () => {
    it('should calculate tree statistics correctly', () => {
      const stats = calculateTreeStatistics(testTree);
      
      expect(stats.totalNodes).toBe(5);
      expect(stats.maxDepth).toBe(2);
      expect(stats.leafNodes).toBe(2); // Consentida 1 and AID 1
      expect(stats.nodesByType[IdentityType.ROOT]).toBe(1);
      expect(stats.nodesByType[IdentityType.DAO]).toBe(2);
      expect(stats.nodesByType[IdentityType.CONSENTIDA]).toBe(1);
      expect(stats.nodesByType[IdentityType.AID]).toBe(1);
      expect(stats.nodesByDepth[0]).toBe(1);
      expect(stats.nodesByDepth[1]).toBe(2);
      expect(stats.nodesByDepth[2]).toBe(2);
    });
  });

  describe('Tree Visualization Functions', () => {
    it('should convert tree to flat list', () => {
      testTree.root.expanded = true;
      testTree.root.children[0].expanded = true; // DAO 1
      testTree.root.children[1].expanded = true; // DAO 2

      const flatList = treeToFlatList(testTree.root);
      
      expect(flatList).toHaveLength(5);
      expect(flatList[0].identity.name).toBe('Root Identity');
      expect(flatList[0].depth).toBe(0);
      expect(flatList[0].isVisible).toBe(true);
      
      expect(flatList[2].identity.name).toBe('Consentida 1');
      expect(flatList[2].depth).toBe(2);
      expect(flatList[2].isVisible).toBe(true);
    });

    it('should convert tree to hierarchical data', () => {
      const hierarchical = treeToHierarchicalData(testTree.root);
      
      expect(hierarchical.id).toBe('did:squid:root');
      expect(hierarchical.name).toBe('Root Identity');
      expect(hierarchical.children).toHaveLength(2);
      expect(hierarchical.children[0].name).toBe('DAO 1');
      expect(hierarchical.children[0].children).toHaveLength(1);
      expect(hierarchical.children[0].children[0].name).toBe('Consentida 1');
    });
  });

  describe('Tree Expansion/Collapse Functions', () => {
    it('should expand node correctly', () => {
      const expanded = expandNode(testTree.root, 'did:squid:dao1');
      expect(expanded).toBe(true);
      
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      expect(dao1Node.expanded).toBe(true);
    });

    it('should expand node recursively', () => {
      const expanded = expandNode(testTree.root, 'did:squid:root', true);
      expect(expanded).toBe(true);
      
      traverseTreeDepthFirst(testTree.root, (node) => {
        expect(node.expanded).toBe(true);
      });
    });

    it('should collapse node correctly', () => {
      // First expand some nodes
      testTree.root.expanded = true;
      testTree.root.children[0].expanded = true;
      
      const collapsed = collapseNode(testTree.root, 'did:squid:dao1');
      expect(collapsed).toBe(true);
      
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      expect(dao1Node.expanded).toBe(false);
    });

    it('should toggle node expansion', () => {
      const dao1Node = findNodeById(testTree.root, 'did:squid:dao1')!;
      const initialState = dao1Node.expanded || false;
      
      const toggled = toggleNodeExpansion(testTree.root, 'did:squid:dao1');
      expect(toggled).toBe(true);
      expect(dao1Node.expanded).toBe(!initialState);
      
      toggleNodeExpansion(testTree.root, 'did:squid:dao1');
      expect(dao1Node.expanded).toBe(initialState);
    });

    it('should expand to specific depth', () => {
      expandToDepth(testTree.root, 1);
      
      expect(testTree.root.expanded).toBe(true);
      expect(testTree.root.children[0].expanded).toBe(false);
      expect(testTree.root.children[1].expanded).toBe(false);
    });

    it('should collapse all nodes', () => {
      // First expand all
      expandAll(testTree.root);
      
      // Then collapse all
      collapseAll(testTree.root);
      
      traverseTreeDepthFirst(testTree.root, (node) => {
        expect(node.expanded).toBe(false);
      });
    });

    it('should expand all nodes', () => {
      expandAll(testTree.root);
      
      traverseTreeDepthFirst(testTree.root, (node) => {
        expect(node.expanded).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on non-existent nodes', () => {
      expect(findNodeById(testTree.root, 'nonexistent')).toBeNull();
      expect(expandNode(testTree.root, 'nonexistent')).toBe(false);
      expect(collapseNode(testTree.root, 'nonexistent')).toBe(false);
      expect(toggleNodeExpansion(testTree.root, 'nonexistent')).toBe(false);
    });

    it('should handle empty tree operations gracefully', () => {
      const emptyRoot: IdentityTreeNode = {
        identity: createMockIdentity('empty', 'Empty', IdentityType.ROOT),
        children: []
      };
      
      const descendants = getDescendants(emptyRoot);
      expect(descendants).toHaveLength(0);
      
      const siblings = getSiblings(emptyRoot, 'empty');
      expect(siblings).toHaveLength(0);
    });
  });
});