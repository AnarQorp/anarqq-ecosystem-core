/**
 * Unit Tests for useIdentityTree Hook
 * Tests tree state management, expansion/collapse functionality, and tree navigation
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useIdentityTree } from '../useIdentityTree';
import { useIdentityStore } from '@/state/identity';
import { identityManager } from '@/services/IdentityManager';
import {
  ExtendedSquidIdentity,
  IdentityType,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel,
  IdentityTreeNode,
  IdentityTree
} from '@/types/identity';

// Mock the identity store
vi.mock('@/state/identity', () => ({
  useIdentityStore: vi.fn()
}));

// Mock the identity manager service
vi.mock('@/services/IdentityManager', () => ({
  identityManager: {
    getIdentityTree: vi.fn()
  }
}));

describe('useIdentityTree', () => {
  // Mock identities for tree structure
  const mockRootIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root:123',
    name: 'Root Identity',
    type: IdentityType.ROOT,
    rootId: 'did:squid:root:123',
    children: ['did:squid:dao:456', 'did:squid:consentida:789'],
    depth: 0,
    path: [],
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      type: IdentityType.ROOT,
      requiresKYC: false,
      requiresDAOGovernance: false,
      requiresParentalConsent: false,
      maxDepth: 3,
      allowedChildTypes: [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
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
    qonsentProfileId: 'qonsent-123',
    qlockKeyPair: {
      publicKey: 'pub-123',
      privateKey: 'priv-123',
      algorithm: 'ECDSA',
      keySize: 256,
      createdAt: '2024-01-01T00:00:00Z'
    },
    privacyLevel: PrivacyLevel.PUBLIC,
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-01T00:00:00Z',
    kyc: {
      required: false,
      submitted: false,
      approved: true
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: false
  };

  const mockDAOIdentity: ExtendedSquidIdentity = {
    ...mockRootIdentity,
    did: 'did:squid:dao:456',
    name: 'DAO Identity',
    type: IdentityType.DAO,
    parentId: 'did:squid:root:123',
    depth: 1,
    path: ['did:squid:root:123'],
    children: ['did:squid:enterprise:101'],
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.DAO_ONLY
  };

  const mockConsentidaIdentity: ExtendedSquidIdentity = {
    ...mockRootIdentity,
    did: 'did:squid:consentida:789',
    name: 'Consentida Identity',
    type: IdentityType.CONSENTIDA,
    parentId: 'did:squid:root:123',
    depth: 1,
    path: ['did:squid:root:123'],
    children: [],
    governanceLevel: GovernanceType.PARENT,
    privacyLevel: PrivacyLevel.PRIVATE
  };

  const mockEnterpriseIdentity: ExtendedSquidIdentity = {
    ...mockRootIdentity,
    did: 'did:squid:enterprise:101',
    name: 'Enterprise Identity',
    type: IdentityType.ENTERPRISE,
    parentId: 'did:squid:dao:456',
    depth: 2,
    path: ['did:squid:root:123', 'did:squid:dao:456'],
    children: [],
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.PUBLIC
  };

  // Mock tree structure
  const mockTreeNode: IdentityTreeNode = {
    identity: mockRootIdentity,
    children: [
      {
        identity: mockDAOIdentity,
        children: [
          {
            identity: mockEnterpriseIdentity,
            children: [],
            expanded: false
          }
        ],
        expanded: false
      },
      {
        identity: mockConsentidaIdentity,
        children: [],
        expanded: false
      }
    ],
    expanded: true
  };

  const mockIdentityTree: IdentityTree = {
    root: mockTreeNode,
    totalNodes: 4,
    maxDepth: 2,
    lastUpdated: '2024-01-01T00:00:00Z'
  };

  // Mock store state
  const mockStoreState = {
    identityTree: mockIdentityTree,
    activeIdentity: mockRootIdentity,
    identities: new Map([
      [mockRootIdentity.did, mockRootIdentity],
      [mockDAOIdentity.did, mockDAOIdentity],
      [mockConsentidaIdentity.did, mockConsentidaIdentity],
      [mockEnterpriseIdentity.did, mockEnterpriseIdentity]
    ]),
    buildIdentityTree: vi.fn(),
    getRootIdentity: vi.fn(() => mockRootIdentity)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useIdentityStore as Mock).mockReturnValue(mockStoreState);
  });

  describe('Initial State', () => {
    it('should initialize with correct tree structure', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.tree).toBeTruthy();
      expect(result.current.tree?.identity.did).toBe(mockRootIdentity.did);
      expect(result.current.tree?.children).toHaveLength(2);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should auto-expand root node', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.expandedNodes).toContain(mockRootIdentity.did);
    });

    it('should have no selected node initially', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.selectedNode).toBeNull();
    });
  });

  describe('Tree Navigation', () => {
    it('should toggle node expansion', () => {
      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      expect(result.current.expandedNodes).toContain(mockDAOIdentity.did);

      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      expect(result.current.expandedNodes).not.toContain(mockDAOIdentity.did);
    });

    it('should collapse descendants when collapsing parent', () => {
      const { result } = renderHook(() => useIdentityTree());

      // First expand both DAO and Enterprise nodes
      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
        result.current.toggleNode(mockEnterpriseIdentity.did);
      });

      expect(result.current.expandedNodes).toContain(mockDAOIdentity.did);
      expect(result.current.expandedNodes).toContain(mockEnterpriseIdentity.did);

      // Collapse DAO node should also collapse Enterprise
      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      expect(result.current.expandedNodes).not.toContain(mockDAOIdentity.did);
      expect(result.current.expandedNodes).not.toContain(mockEnterpriseIdentity.did);
    });

    it('should select nodes', () => {
      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.selectNode(mockDAOIdentity.did);
      });

      expect(result.current.selectedNode).toBe(mockDAOIdentity.did);
      expect(result.current.isNodeSelected(mockDAOIdentity.did)).toBe(true);
      expect(result.current.isNodeSelected(mockConsentidaIdentity.did)).toBe(false);
    });

    it('should expand all nodes', () => {
      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.expandedNodes).toContain(mockRootIdentity.did);
      expect(result.current.expandedNodes).toContain(mockDAOIdentity.did);
      expect(result.current.expandedNodes).toContain(mockConsentidaIdentity.did);
      expect(result.current.expandedNodes).toContain(mockEnterpriseIdentity.did);
    });

    it('should collapse all nodes', () => {
      const { result } = renderHook(() => useIdentityTree());

      // First expand some nodes
      act(() => {
        result.current.expandAll();
      });

      expect(result.current.expandedNodes.length).toBeGreaterThan(0);

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedNodes).toHaveLength(0);
    });

    it('should expand to specific node', () => {
      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.expandToNode(mockEnterpriseIdentity.did);
      });

      // Should expand all parents in the path
      expect(result.current.expandedNodes).toContain(mockRootIdentity.did);
      expect(result.current.expandedNodes).toContain(mockDAOIdentity.did);
    });
  });

  describe('Tree Queries', () => {
    it('should get tree statistics', () => {
      const { result } = renderHook(() => useIdentityTree());

      const stats = result.current.getTreeStats();

      expect(stats.totalNodes).toBe(4);
      expect(stats.maxDepth).toBe(2);
      expect(stats.nodesByType[IdentityType.ROOT]).toBe(1);
      expect(stats.nodesByType[IdentityType.DAO]).toBe(1);
      expect(stats.nodesByType[IdentityType.CONSENTIDA]).toBe(1);
      expect(stats.nodesByType[IdentityType.ENTERPRISE]).toBe(1);
    });

    it('should find nodes by criteria', () => {
      const { result } = renderHook(() => useIdentityTree());

      const daoNodes = result.current.findNodes(
        identity => identity.type === IdentityType.DAO
      );

      expect(daoNodes).toHaveLength(1);
      expect(daoNodes[0].identity.did).toBe(mockDAOIdentity.did);

      const privateNodes = result.current.findNodes(
        identity => identity.privacyLevel === PrivacyLevel.PRIVATE
      );

      expect(privateNodes).toHaveLength(1);
      expect(privateNodes[0].identity.did).toBe(mockConsentidaIdentity.did);
    });

    it('should get visible nodes based on expansion state', () => {
      const { result } = renderHook(() => useIdentityTree());

      // Initially only root and its direct children should be visible
      let visibleNodes = result.current.getVisibleNodes();
      expect(visibleNodes).toHaveLength(3); // Root + 2 direct children

      // Expand DAO node
      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      visibleNodes = result.current.getVisibleNodes();
      expect(visibleNodes).toHaveLength(4); // Root + 2 direct children + Enterprise
    });

    it('should get node by ID', () => {
      const { result } = renderHook(() => useIdentityTree());

      const node = result.current.getNodeById(mockDAOIdentity.did);

      expect(node).toBeTruthy();
      expect(node?.identity.did).toBe(mockDAOIdentity.did);
      expect(node?.identity.name).toBe('DAO Identity');
    });

    it('should get node children', () => {
      const { result } = renderHook(() => useIdentityTree());

      const children = result.current.getNodeChildren(mockRootIdentity.did);

      expect(children).toHaveLength(2);
      expect(children.map(child => child.identity.did)).toContain(mockDAOIdentity.did);
      expect(children.map(child => child.identity.did)).toContain(mockConsentidaIdentity.did);
    });

    it('should get node parent', () => {
      const { result } = renderHook(() => useIdentityTree());

      const parent = result.current.getNodeParent(mockDAOIdentity.did);

      expect(parent).toBeTruthy();
      expect(parent?.identity.did).toBe(mockRootIdentity.did);
    });

    it('should get node siblings', () => {
      const { result } = renderHook(() => useIdentityTree());

      const siblings = result.current.getNodeSiblings(mockDAOIdentity.did);

      expect(siblings).toHaveLength(1);
      expect(siblings[0].identity.did).toBe(mockConsentidaIdentity.did);
    });

    it('should check node expansion state', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.isNodeExpanded(mockRootIdentity.did)).toBe(true);
      expect(result.current.isNodeExpanded(mockDAOIdentity.did)).toBe(false);

      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      expect(result.current.isNodeExpanded(mockDAOIdentity.did)).toBe(true);
    });
  });

  describe('Custom Root ID', () => {
    it('should use provided root ID', () => {
      const { result } = renderHook(() => useIdentityTree(mockDAOIdentity.did));

      // Should build tree from DAO identity as root
      expect(result.current.tree?.identity.did).toBe(mockDAOIdentity.did);
    });

    it('should fallback to active identity root ID', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.tree?.identity.did).toBe(mockRootIdentity.did);
    });
  });

  describe('No Tree State', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        ...mockStoreState,
        identityTree: null,
        identities: new Map(),
        getRootIdentity: vi.fn(() => null)
      });
    });

    it('should handle no tree gracefully', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.tree).toBeNull();
      expect(result.current.getTreeStats().totalNodes).toBe(0);
      expect(result.current.findNodes(() => true)).toHaveLength(0);
      expect(result.current.getVisibleNodes()).toHaveLength(0);
    });

    it('should return null for node queries when no tree', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.getNodeById('any-id')).toBeNull();
      expect(result.current.getNodeChildren('any-id')).toHaveLength(0);
      expect(result.current.getNodeParent('any-id')).toBeNull();
      expect(result.current.getNodeSiblings('any-id')).toHaveLength(0);
    });
  });

  describe('Tree Refresh', () => {
    it('should refresh tree from store', async () => {
      const { result } = renderHook(() => useIdentityTree());

      await act(async () => {
        await result.current.refreshTree();
      });

      expect(mockStoreState.buildIdentityTree).toHaveBeenCalledWith(mockRootIdentity.did);
    });

    it('should handle refresh errors', async () => {
      const error = new Error('Refresh failed');
      mockStoreState.buildIdentityTree.mockRejectedValue(error);

      const { result } = renderHook(() => useIdentityTree());

      await act(async () => {
        await result.current.refreshTree();
      });

      expect(result.current.error).toBe('Refresh failed');
    });

    it('should set loading state during refresh', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockStoreState.buildIdentityTree.mockReturnValue(promise);

      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.refreshTree();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!();
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Tree Building from Store', () => {
    it('should build tree from identities when no store tree', () => {
      (useIdentityStore as Mock).mockReturnValue({
        ...mockStoreState,
        identityTree: null // No tree in store
      });

      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.tree).toBeTruthy();
      expect(result.current.tree?.identity.did).toBe(mockRootIdentity.did);
      expect(result.current.tree?.children).toHaveLength(2);
    });

    it('should use store tree when available and matching root', () => {
      const { result } = renderHook(() => useIdentityTree());

      expect(result.current.tree).toBe(mockIdentityTree.root);
    });

    it('should rebuild tree when root ID changes', () => {
      const { result, rerender } = renderHook(
        ({ rootId }) => useIdentityTree(rootId),
        { initialProps: { rootId: mockRootIdentity.did } }
      );

      expect(result.current.tree?.identity.did).toBe(mockRootIdentity.did);

      rerender({ rootId: mockDAOIdentity.did });

      expect(result.current.tree?.identity.did).toBe(mockDAOIdentity.did);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when tree is successfully loaded', () => {
      const { result } = renderHook(() => useIdentityTree());

      // Simulate an error state
      act(() => {
        result.current.refreshTree();
      });

      // Error should be cleared when tree is available
      expect(result.current.error).toBeNull();
    });
  });

  describe('Console Logging', () => {
    it('should log tree operations', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useIdentityTree());

      act(() => {
        result.current.toggleNode(mockDAOIdentity.did);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Toggled node: ${mockDAOIdentity.did}`)
      );

      act(() => {
        result.current.selectNode(mockDAOIdentity.did);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Selected node: ${mockDAOIdentity.did}`)
      );

      consoleSpy.mockRestore();
    });
  });
});