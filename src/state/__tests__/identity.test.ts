/**
 * Unit tests for Enhanced Identity Store
 * Tests subidentity creation, deletion, switching, and tree management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIdentityStore } from '../identity';
import { 
  IdentityType, 
  IdentityStatus, 
  GovernanceType, 
  PrivacyLevel,
  ExtendedSquidIdentity,
  SubidentityMetadata,
  IdentityAction
} from '@/types/identity';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Helper function to create a mock root identity
function createMockRootIdentity(): ExtendedSquidIdentity {
  const now = new Date().toISOString();
  return {
    did: 'did:squid:root-123',
    name: 'Test Root',
    type: IdentityType.ROOT,
    rootId: 'did:squid:root-123',
    children: [],
    depth: 0,
    path: [],
    governanceLevel: GovernanceType.SELF,
    creationRules: {
      type: IdentityType.ROOT,
      requiresKYC: false,
      requiresDAOGovernance: false,
      requiresParentalConsent: false,
      maxDepth: 3,
      allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID, IdentityType.DAO]
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
    qonsentProfileId: 'qonsent-root-123',
    qlockKeyPair: {
      publicKey: 'pub-root-123',
      privateKey: 'priv-root-123',
      algorithm: 'ECDSA',
      keySize: 256,
      createdAt: now
    },
    privacyLevel: PrivacyLevel.PUBLIC,
    tags: ['test', 'root'],
    createdAt: now,
    updatedAt: now,
    lastUsed: now,
    kyc: {
      required: false,
      submitted: true,
      approved: true
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: true
  };
}

describe('Enhanced Identity Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useIdentityStore.getState().clearAllIdentities();
    vi.clearAllMocks();
  });

  describe('Core State Management', () => {
    it('should initialize with empty state', () => {
      const state = useIdentityStore.getState();
      
      expect(state.activeIdentity).toBeNull();
      expect(state.identities.size).toBe(0);
      expect(state.identityTree).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set active identity correctly', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const newState = useIdentityStore.getState();
      expect(newState.activeIdentity).toEqual(expect.objectContaining({
        did: rootIdentity.did,
        name: rootIdentity.name,
        type: IdentityType.ROOT
      }));
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.identities.has(rootIdentity.did)).toBe(true);
    });

    it('should update usage stats when setting active identity', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const activeIdentity = useIdentityStore.getState().activeIdentity;
      expect(activeIdentity?.usageStats?.switchCount).toBeGreaterThan(0);
      expect(activeIdentity?.usageStats?.lastSwitch).toBeDefined();
    });
  });

  describe('Subidentity Creation', () => {
    it('should create a DAO subidentity successfully', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      // Set root identity as active
      await state.setActiveIdentity(rootIdentity);
      
      const metadata: SubidentityMetadata = {
        name: 'Test DAO',
        description: 'A test DAO identity',
        type: IdentityType.DAO,
        tags: ['dao', 'test'],
        privacyLevel: PrivacyLevel.PUBLIC
      };
      
      const result = await state.createSubidentity(metadata);
      
      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();
      expect(result.identity?.type).toBe(IdentityType.DAO);
      expect(result.identity?.name).toBe('Test DAO');
      expect(result.identity?.parentId).toBe(rootIdentity.did);
      expect(result.identity?.depth).toBe(1);
      
      // Check that parent's children array was updated
      const updatedRoot = useIdentityStore.getState().identities.get(rootIdentity.did);
      expect(updatedRoot?.children).toContain(result.identity?.did);
    });

    it('should create a Consentida subidentity with correct governance', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const metadata: SubidentityMetadata = {
        name: 'Test Consentida',
        type: IdentityType.CONSENTIDA,
        privacyLevel: PrivacyLevel.PRIVATE
      };
      
      const result = await state.createSubidentity(metadata);
      
      expect(result.success).toBe(true);
      expect(result.identity?.type).toBe(IdentityType.CONSENTIDA);
      expect(result.identity?.governanceLevel).toBe(GovernanceType.PARENT);
      expect(result.identity?.permissions.canCreateSubidentities).toBe(false);
      expect(result.identity?.privacyLevel).toBe(PrivacyLevel.PRIVATE);
    });

    it('should create an AID subidentity with anonymous privacy', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const metadata: SubidentityMetadata = {
        name: 'Test AID',
        type: IdentityType.AID,
        privacyLevel: PrivacyLevel.ANONYMOUS
      };
      
      const result = await state.createSubidentity(metadata);
      
      expect(result.success).toBe(true);
      expect(result.identity?.type).toBe(IdentityType.AID);
      expect(result.identity?.permissions.canCreateSubidentities).toBe(false);
      expect(result.identity?.kyc.required).toBe(true);
    });

    it('should fail to create subidentity without active identity', async () => {
      const state = useIdentityStore.getState();
      
      const metadata: SubidentityMetadata = {
        name: 'Test Identity',
        type: IdentityType.DAO
      };
      
      const result = await state.createSubidentity(metadata);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active identity to create subidentity from');
    });
  });

  describe('Subidentity Deletion', () => {
    it('should delete a subidentity successfully', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      // Create root and subidentity
      await state.setActiveIdentity(rootIdentity);
      
      const metadata: SubidentityMetadata = {
        name: 'Test DAO',
        type: IdentityType.DAO
      };
      
      const createResult = await state.createSubidentity(metadata);
      expect(createResult.success).toBe(true);
      
      const subidentityId = createResult.identity!.did;
      
      // Delete the subidentity
      const deleteResult = await state.deleteSubidentity(subidentityId);
      
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deletedIdentity?.did).toBe(subidentityId);
      
      // Verify it's removed from store
      const finalState = useIdentityStore.getState();
      expect(finalState.identities.has(subidentityId)).toBe(false);
      
      // Verify parent's children array is updated
      const updatedRoot = finalState.identities.get(rootIdentity.did);
      expect(updatedRoot?.children).not.toContain(subidentityId);
    });

    it('should prevent deletion of root identity', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const result = await state.deleteSubidentity(rootIdentity.did);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete root identity');
    });

    it('should cascade delete children when deleting parent', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      // Create parent DAO
      const daoResult = await state.createSubidentity({
        name: 'Parent DAO',
        type: IdentityType.DAO
      });
      
      // Switch to DAO and create child
      await state.setActiveIdentity(daoResult.identity!);
      
      const childResult = await state.createSubidentity({
        name: 'Child Consentida',
        type: IdentityType.CONSENTIDA
      });
      
      // Delete the parent DAO
      const deleteResult = await state.deleteSubidentity(daoResult.identity!.did);
      
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.affectedChildren).toContain(childResult.identity!.did);
      
      // Verify both parent and child are deleted
      const finalState = useIdentityStore.getState();
      expect(finalState.identities.has(daoResult.identity!.did)).toBe(false);
      expect(finalState.identities.has(childResult.identity!.did)).toBe(false);
    });

    it('should switch to parent when deleting active identity', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      // Create and switch to subidentity
      const subResult = await state.createSubidentity({
        name: 'Test Sub',
        type: IdentityType.DAO
      });
      
      await state.setActiveIdentity(subResult.identity!);
      
      // Delete the active subidentity
      const deleteResult = await state.deleteSubidentity(subResult.identity!.did);
      
      expect(deleteResult.success).toBe(true);
      
      // Should switch back to root
      const finalState = useIdentityStore.getState();
      expect(finalState.activeIdentity?.did).toBe(rootIdentity.did);
    });
  });

  describe('Identity Tree Management', () => {
    it('should build identity tree correctly', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      // Create some subidentities
      const dao1 = await state.createSubidentity({
        name: 'DAO 1',
        type: IdentityType.DAO
      });
      
      const dao2 = await state.createSubidentity({
        name: 'DAO 2',
        type: IdentityType.DAO
      });
      
      // Switch to DAO 1 and create child
      await state.setActiveIdentity(dao1.identity!);
      const child = await state.createSubidentity({
        name: 'Child',
        type: IdentityType.CONSENTIDA
      });
      
      // Build tree
      await state.buildIdentityTree(rootIdentity.did);
      
      const tree = useIdentityStore.getState().identityTree;
      expect(tree).toBeDefined();
      expect(tree!.root.identity.did).toBe(rootIdentity.did);
      expect(tree!.root.children).toHaveLength(2);
      expect(tree!.totalNodes).toBe(4); // root + 2 DAOs + 1 child
      expect(tree!.maxDepth).toBe(2);
      
      // Check child relationship
      const dao1Node = tree!.root.children.find(n => n.identity.did === dao1.identity!.did);
      expect(dao1Node?.children).toHaveLength(1);
      expect(dao1Node?.children[0].identity.did).toBe(child.identity!.did);
    });

    it('should get child identities correctly', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const child1 = await state.createSubidentity({
        name: 'Child 1',
        type: IdentityType.DAO
      });
      
      const child2 = await state.createSubidentity({
        name: 'Child 2',
        type: IdentityType.CONSENTIDA
      });
      
      const children = state.getChildIdentities(rootIdentity.did);
      
      expect(children).toHaveLength(2);
      expect(children.map(c => c.did)).toContain(child1.identity!.did);
      expect(children.map(c => c.did)).toContain(child2.identity!.did);
    });

    it('should find identity by ID', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const found = state.getIdentityById(rootIdentity.did);
      expect(found).toBeDefined();
      expect(found!.did).toBe(rootIdentity.did);
      
      const notFound = state.getIdentityById('non-existent');
      expect(notFound).toBeNull();
    });

    it('should get root identity correctly', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      const root = state.getRootIdentity();
      expect(root).toBeDefined();
      expect(root!.did).toBe(rootIdentity.did);
      expect(root!.type).toBe(IdentityType.ROOT);
    });
  });

  describe('Audit and Security', () => {
    it('should log identity actions', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      
      await state.logIdentityAction(
        rootIdentity.did, 
        IdentityAction.UPDATED, 
        { field: 'name', oldValue: 'old', newValue: 'new' }
      );
      
      const identity = state.getIdentityById(rootIdentity.did);
      expect(identity!.auditLog).toHaveLength(2); // 1 from setActiveIdentity + 1 from manual log
      
      const updateLog = identity!.auditLog.find(log => log.action === IdentityAction.UPDATED);
      expect(updateLog).toBeDefined();
      expect(updateLog!.metadata.field).toBe('name');
    });

    it('should add security flags', () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      state.setActiveIdentity(rootIdentity);
      
      const flag = {
        id: 'flag-1',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      state.addSecurityFlag(rootIdentity.did, flag);
      
      const identity = state.getIdentityById(rootIdentity.did);
      expect(identity!.securityFlags).toContain(flag);
    });
  });

  describe('Persistence', () => {
    it('should persist identity tree to localStorage', async () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      await state.setActiveIdentity(rootIdentity);
      await state.persistIdentityTree();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'squid-identity-tree',
        expect.stringContaining(rootIdentity.did)
      );
    });

    it('should load identity tree from localStorage', async () => {
      const rootIdentity = createMockRootIdentity();
      const mockData = {
        identities: [[rootIdentity.did, rootIdentity]],
        tree: null,
        activeIdentityId: rootIdentity.did
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const state = useIdentityStore.getState();
      await state.loadIdentityTree();
      
      const newState = useIdentityStore.getState();
      expect(newState.identities.has(rootIdentity.did)).toBe(true);
      expect(newState.activeIdentity?.did).toBe(rootIdentity.did);
      expect(newState.isAuthenticated).toBe(true);
    });

    it('should clear all identities and localStorage', () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      state.setActiveIdentity(rootIdentity);
      state.clearAllIdentities();
      
      const newState = useIdentityStore.getState();
      expect(newState.activeIdentity).toBeNull();
      expect(newState.identities.size).toBe(0);
      expect(newState.identityTree).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('squid-identity-tree');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should convert legacy identity format', () => {
      const legacyIdentity = {
        did: 'did:legacy:123',
        name: 'Legacy User',
        type: 'ROOT' as const,
        kyc: true,
        reputation: 100,
        email: 'test@example.com'
      };
      
      const state = useIdentityStore.getState();
      state.setIdentity(legacyIdentity);
      
      const activeIdentity = useIdentityStore.getState().activeIdentity;
      expect(activeIdentity).toBeDefined();
      expect(activeIdentity!.did).toBe(legacyIdentity.did);
      expect(activeIdentity!.name).toBe(legacyIdentity.name);
      expect(activeIdentity!.type).toBe(IdentityType.ROOT);
      expect(activeIdentity!.email).toBe(legacyIdentity.email);
    });

    it('should clear identity using legacy method', () => {
      const rootIdentity = createMockRootIdentity();
      const state = useIdentityStore.getState();
      
      state.setActiveIdentity(rootIdentity);
      state.clearIdentity();
      
      const newState = useIdentityStore.getState();
      expect(newState.activeIdentity).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in setActiveIdentity', async () => {
      const invalidIdentity = { did: undefined } as any;
      const state = useIdentityStore.getState();
      
      try {
        await state.setActiveIdentity(invalidIdentity);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Error should be thrown
        expect(error).toBeDefined();
      }
      
      const newState = useIdentityStore.getState();
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeDefined();
    });

    it('should handle identity not found in deletion', async () => {
      const state = useIdentityStore.getState();
      
      const result = await state.deleteSubidentity('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Identity not found');
    });

    it('should handle identity not found in update', async () => {
      const state = useIdentityStore.getState();
      
      await expect(
        state.updateIdentity('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Identity not found');
    });
  });
});