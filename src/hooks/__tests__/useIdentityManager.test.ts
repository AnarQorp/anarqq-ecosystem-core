/**
 * Unit Tests for useIdentityManager Hook
 * Tests hook behavior, state management, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useIdentityManager } from '../useIdentityManager';
import { useIdentityStore } from '@/state/identity';
import { identityManager } from '@/services/IdentityManager';
import {
  ExtendedSquidIdentity,
  IdentityType,
  IdentityStatus,
  GovernanceType,
  PrivacyLevel
} from '@/types/identity';

// Mock the identity store
vi.mock('@/state/identity', () => ({
  useIdentityStore: vi.fn()
}));

// Mock the identity manager service
vi.mock('@/services/IdentityManager', () => ({
  identityManager: {
    createSubidentity: vi.fn(),
    switchActiveIdentity: vi.fn(),
    deleteSubidentity: vi.fn(),
    verifyIdentityOwnership: vi.fn(),
    getIdentityTree: vi.fn()
  }
}));

describe('useIdentityManager', () => {
  // Mock data
  const mockRootIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root:123',
    name: 'Root Identity',
    type: IdentityType.ROOT,
    rootId: 'did:squid:root:123',
    children: ['did:squid:dao:456'],
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
      approved: false
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
    children: [],
    governanceLevel: GovernanceType.DAO,
    creationRules: {
      ...mockRootIdentity.creationRules,
      type: IdentityType.DAO,
      parentType: IdentityType.ROOT,
      requiresKYC: true
    }
  };

  // Mock store state
  const mockStoreState = {
    activeIdentity: mockRootIdentity,
    identities: new Map([
      [mockRootIdentity.did, mockRootIdentity],
      [mockDAOIdentity.did, mockDAOIdentity]
    ]),
    setActiveIdentity: vi.fn(),
    createSubidentity: vi.fn(),
    deleteSubidentity: vi.fn(),
    logIdentityAction: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useIdentityStore as Mock).mockReturnValue(mockStoreState);
  });

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useIdentityManager());

      expect(result.current.identities).toHaveLength(2);
      expect(result.current.activeIdentity).toEqual(mockRootIdentity);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useIdentityManager());

      expect(typeof result.current.createSubidentity).toBe('function');
      expect(typeof result.current.switchIdentity).toBe('function');
      expect(typeof result.current.deleteIdentity).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.refreshIdentities).toBe('function');
      expect(typeof result.current.getIdentityStats).toBe('function');
    });
  });

  describe('createSubidentity', () => {
    it('should create subidentity successfully', async () => {
      const mockResult = {
        success: true,
        identity: mockDAOIdentity
      };

      (identityManager.createSubidentity as Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO,
          description: 'Test DAO Identity'
        });

        expect(createResult.success).toBe(true);
        expect(createResult.identity).toEqual(mockDAOIdentity);
      });

      expect(identityManager.createSubidentity).toHaveBeenCalledWith(
        IdentityType.DAO,
        {
          name: 'Test DAO',
          type: IdentityType.DAO,
          description: 'Test DAO Identity'
        }
      );
    });

    it('should handle creation failure', async () => {
      const mockResult = {
        success: false,
        error: 'Creation failed'
      };

      (identityManager.createSubidentity as Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Creation failed');
      });

      expect(result.current.error).toBe('Creation failed');
    });

    it('should validate required fields', async () => {
      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: '',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Identity name is required');
      });

      expect(result.current.error).toBe('Identity name is required');
    });

    it('should check permissions before creation', async () => {
      const mockStoreWithoutPermissions = {
        ...mockStoreState,
        activeIdentity: {
          ...mockRootIdentity,
          permissions: {
            ...mockRootIdentity.permissions,
            canCreateSubidentities: false
          }
        }
      };

      (useIdentityStore as Mock).mockReturnValue(mockStoreWithoutPermissions);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Current identity does not have permission to create subidentities');
      });
    });

    it('should check depth limits', async () => {
      const mockDeepIdentity = {
        ...mockRootIdentity,
        depth: 2 // At max depth
      };

      const mockStoreWithDeepIdentity = {
        ...mockStoreState,
        activeIdentity: mockDeepIdentity
      };

      (useIdentityStore as Mock).mockReturnValue(mockStoreWithDeepIdentity);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Maximum identity depth exceeded. Cannot create more nested identities.');
      });
    });
  });

  describe('switchIdentity', () => {
    it('should switch identity successfully', async () => {
      const mockResult = {
        success: true,
        previousIdentity: mockRootIdentity,
        newIdentity: mockDAOIdentity
      };

      (identityManager.switchActiveIdentity as Mock).mockResolvedValue(mockResult);
      (identityManager.verifyIdentityOwnership as Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const switchResult = await result.current.switchIdentity(mockDAOIdentity.did);

        expect(switchResult.success).toBe(true);
        expect(switchResult.newIdentity).toEqual(mockDAOIdentity);
      });

      expect(identityManager.switchActiveIdentity).toHaveBeenCalledWith(mockDAOIdentity.did);
      expect(mockStoreState.setActiveIdentity).toHaveBeenCalledWith(mockDAOIdentity);
    });

    it('should handle switch failure', async () => {
      const mockResult = {
        success: false,
        error: 'Switch failed'
      };

      (identityManager.switchActiveIdentity as Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const switchResult = await result.current.switchIdentity(mockDAOIdentity.did);

        expect(switchResult.success).toBe(false);
        expect(switchResult.error).toBe('Switch failed');
      });

      expect(result.current.error).toBe('Switch failed');
    });

    it('should validate identity exists', async () => {
      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const switchResult = await result.current.switchIdentity('non-existent-id');

        expect(switchResult.success).toBe(false);
        expect(switchResult.error).toBe('Identity with ID non-existent-id not found');
      });
    });

    it('should check identity status', async () => {
      const inactiveIdentity = {
        ...mockDAOIdentity,
        status: IdentityStatus.INACTIVE
      };

      const mockStoreWithInactive = {
        ...mockStoreState,
        identities: new Map([
          [mockRootIdentity.did, mockRootIdentity],
          [inactiveIdentity.did, inactiveIdentity]
        ])
      };

      (useIdentityStore as Mock).mockReturnValue(mockStoreWithInactive);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const switchResult = await result.current.switchIdentity(inactiveIdentity.did);

        expect(switchResult.success).toBe(false);
        expect(switchResult.error).toBe('Cannot switch to inactive identity');
      });
    });

    it('should verify ownership for different identities', async () => {
      (identityManager.verifyIdentityOwnership as Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const switchResult = await result.current.switchIdentity(mockDAOIdentity.did);

        expect(switchResult.success).toBe(false);
        expect(switchResult.error).toBe('You do not have permission to switch to this identity');
      });

      expect(identityManager.verifyIdentityOwnership).toHaveBeenCalledWith(
        mockDAOIdentity.did,
        mockRootIdentity.did
      );
    });
  });

  describe('deleteIdentity', () => {
    it('should delete identity successfully', async () => {
      const mockResult = {
        success: true,
        deletedIdentity: mockDAOIdentity,
        affectedChildren: []
      };

      (identityManager.deleteSubidentity as Mock).mockResolvedValue(mockResult);
      (identityManager.verifyIdentityOwnership as Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const deleteResult = await result.current.deleteIdentity(mockDAOIdentity.did);

        expect(deleteResult.success).toBe(true);
        expect(deleteResult.deletedIdentity).toEqual(mockDAOIdentity);
      });

      expect(identityManager.deleteSubidentity).toHaveBeenCalledWith(mockDAOIdentity.did);
    });

    it('should handle deletion failure', async () => {
      const mockResult = {
        success: false,
        error: 'Deletion failed'
      };

      (identityManager.deleteSubidentity as Mock).mockResolvedValue(mockResult);
      (identityManager.verifyIdentityOwnership as Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const deleteResult = await result.current.deleteIdentity(mockDAOIdentity.did);

        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBe('Deletion failed');
      });
    });

    it('should prevent deletion of root identity', async () => {
      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const deleteResult = await result.current.deleteIdentity(mockRootIdentity.did);

        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBe('Cannot delete root identity');
      });
    });

    it('should check permissions before deletion', async () => {
      const mockStoreWithoutPermissions = {
        ...mockStoreState,
        activeIdentity: {
          ...mockRootIdentity,
          permissions: {
            ...mockRootIdentity.permissions,
            canDeleteSubidentities: false
          }
        }
      };

      (useIdentityStore as Mock).mockReturnValue(mockStoreWithoutPermissions);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const deleteResult = await result.current.deleteIdentity(mockDAOIdentity.did);

        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBe('Current identity does not have permission to delete subidentities');
      });
    });

    it('should verify ownership before deletion', async () => {
      (identityManager.verifyIdentityOwnership as Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const deleteResult = await result.current.deleteIdentity(mockDAOIdentity.did);

        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBe('You do not have permission to delete this identity');
      });
    });
  });

  describe('Utility Functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useIdentityManager());

      act(() => {
        // Simulate an error state
        result.current.createSubidentity(IdentityType.DAO, { name: '', type: IdentityType.DAO });
      });

      waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should get identity statistics', () => {
      const { result } = renderHook(() => useIdentityManager());

      const stats = result.current.getIdentityStats();

      expect(stats.total).toBe(2);
      expect(stats.byType[IdentityType.ROOT]).toBe(1);
      expect(stats.byType[IdentityType.DAO]).toBe(1);
      expect(stats.active).toBe(2);
      expect(stats.withKYC).toBe(0);
    });

    it('should refresh identities', async () => {
      (identityManager.getIdentityTree as Mock).mockResolvedValue({});

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        await result.current.refreshIdentities();
      });

      expect(identityManager.getIdentityTree).toHaveBeenCalledWith(mockRootIdentity.did);
    });
  });

  describe('Loading States', () => {
    it('should set loading state during operations', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (identityManager.createSubidentity as Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useIdentityManager());

      act(() => {
        result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, identity: mockDAOIdentity });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      (identityManager.createSubidentity as Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Service unavailable');
      });

      expect(result.current.error).toBe('Service unavailable');
    });

    it('should handle unknown errors', async () => {
      (identityManager.createSubidentity as Mock).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useIdentityManager());

      await act(async () => {
        const createResult = await result.current.createSubidentity(IdentityType.DAO, {
          name: 'Test DAO',
          type: IdentityType.DAO
        });

        expect(createResult.success).toBe(false);
        expect(createResult.error).toBe('Unknown error occurred while creating subidentity');
      });
    });
  });
});