/**
 * Integration Tests for useIdentityQonsent Hook
 * Tests React hook integration with IdentityQonsentService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdentityQonsent } from '../useIdentityQonsent';
import { IdentityQonsentService } from '@/services/identity/IdentityQonsentService';
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  GovernanceType,
  IdentityStatus 
} from '@/types/identity';

// Mock the service
vi.mock('@/services/identity/IdentityQonsentService', () => {
  const mockService = {
    createQonsentProfile: vi.fn(),
    getQonsentProfile: vi.fn(),
    updateQonsentProfile: vi.fn(),
    deleteQonsentProfile: vi.fn(),
    switchPrivacyContext: vi.fn(),
    applyPrivacyPolicy: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
    checkConsent: vi.fn(),
    setPrivacyLevel: vi.fn(),
    getEffectivePrivacyLevel: vi.fn(),
    getModulePermissions: vi.fn(),
    updateModulePermissions: vi.fn(),
    syncProfileWithQonsent: vi.fn(),
    syncAllProfiles: vi.fn(),
  };

  return {
    IdentityQonsentService: vi.fn(() => mockService),
    identityQonsentService: mockService
  };
});

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('useIdentityQonsent', () => {
  let mockService: any;
  let mockIdentity: ExtendedSquidIdentity;
  let mockProfile: any;

  beforeEach(async () => {
    // Get the mocked service instance
    const module = await import('@/services/identity/IdentityQonsentService');
    mockService = module.identityQonsentService;
    
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock identity
    mockIdentity = {
      did: 'did:squid:test-123',
      name: 'Test Identity',
      type: IdentityType.ROOT,
      rootId: 'did:squid:test-123',
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
      qonsentProfileId: 'profile-123',
      qlockKeyPair: {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
        algorithm: 'RSA' as const,
        keySize: 2048,
        createdAt: new Date().toISOString()
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      kyc: {
        required: false,
        submitted: false,
        approved: false
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: false
    };

    // Create mock profile
    mockProfile = {
      identityId: mockIdentity.did,
      profileId: 'profile-123',
      privacyLevel: PrivacyLevel.PUBLIC,
      dataSharing: {
        qsocial: {
          enabled: true,
          level: 'FULL',
          restrictions: []
        },
        qwallet: {
          enabled: true,
          level: 'STANDARD',
          restrictions: []
        }
      },
      visibilityRules: {
        profile: PrivacyLevel.PUBLIC,
        activity: PrivacyLevel.PUBLIC,
        connections: PrivacyLevel.PUBLIC
      },
      consentHistory: [
        {
          id: 'consent-1',
          action: 'GRANTED',
          module: 'SYSTEM',
          permission: 'PROFILE_CREATED',
          timestamp: new Date().toISOString()
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with null profile when no identity provided', () => {
      const { result } = renderHook(() => useIdentityQonsent());

      expect(result.current.currentProfile).toBeNull();
      expect(result.current.activeIdentityId).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load profile when identity ID is provided', async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.getQonsentProfile).toHaveBeenCalledWith(mockIdentity.did);
      expect(result.current.currentProfile).toEqual(mockProfile);
      expect(result.current.activeIdentityId).toBe(mockIdentity.did);
    });

    it('should handle profile loading errors', async () => {
      const error = new Error('Failed to load profile');
      mockService.getQonsentProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load profile');
      expect(result.current.currentProfile).toBeNull();
    });
  });

  describe('Profile Management', () => {
    it('should create new profile', async () => {
      mockService.createQonsentProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useIdentityQonsent());

      let success: boolean;
      await act(async () => {
        success = await result.current.createProfile(mockIdentity);
      });

      expect(success!).toBe(true);
      expect(mockService.createQonsentProfile).toHaveBeenCalledWith(mockIdentity);
      expect(result.current.currentProfile).toEqual(mockProfile);
      expect(result.current.activeIdentityId).toBe(mockIdentity.did);
    });

    it('should handle profile creation errors', async () => {
      const error = new Error('Creation failed');
      mockService.createQonsentProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useIdentityQonsent());

      let success: boolean;
      await act(async () => {
        success = await result.current.createProfile(mockIdentity);
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe('Creation failed');
    });

    it('should update existing profile', async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
      mockService.updateQonsentProfile.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      const updates = { privacyLevel: PrivacyLevel.PRIVATE };
      let success: boolean;

      await act(async () => {
        success = await result.current.updateProfile(updates);
      });

      expect(success!).toBe(true);
      expect(mockService.updateQonsentProfile).toHaveBeenCalledWith(mockIdentity.did, updates);
      expect(mockService.getQonsentProfile).toHaveBeenCalledTimes(2); // Initial load + reload after update
    });

    it('should delete profile', async () => {
      mockService.deleteQonsentProfile.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      let success: boolean;
      await act(async () => {
        success = await result.current.deleteProfile(mockIdentity.did);
      });

      expect(success!).toBe(true);
      expect(mockService.deleteQonsentProfile).toHaveBeenCalledWith(mockIdentity.did);
      expect(result.current.currentProfile).toBeNull();
      expect(result.current.activeIdentityId).toBeNull();
    });
  });

  describe('Privacy Context Switching', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should switch privacy context', async () => {
      const newIdentityId = 'did:squid:new-456';
      const newProfile = { ...mockProfile, identityId: newIdentityId };
      
      mockService.switchPrivacyContext.mockResolvedValue(true);
      mockService.getQonsentProfile.mockImplementation((id: string) => {
        if (id === newIdentityId) return Promise.resolve(newProfile);
        return Promise.resolve(mockProfile);
      });

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.switchPrivacyContext(newIdentityId);
      });

      expect(success!).toBe(true);
      expect(mockService.switchPrivacyContext).toHaveBeenCalledWith(mockIdentity.did, newIdentityId);
      expect(result.current.activeIdentityId).toBe(newIdentityId);
      expect(result.current.currentProfile).toEqual(newProfile);
    });

    it('should apply privacy policy', async () => {
      mockService.applyPrivacyPolicy.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent());

      let success: boolean;
      await act(async () => {
        success = await result.current.applyPrivacyPolicy(mockIdentity.did);
      });

      expect(success!).toBe(true);
      expect(mockService.applyPrivacyPolicy).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should handle context switching errors', async () => {
      mockService.switchPrivacyContext.mockResolvedValue(false);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.switchPrivacyContext('new-identity');
      });

      expect(success!).toBe(false);
      expect(result.current.activeIdentityId).toBe(mockIdentity.did); // Should remain unchanged
    });
  });

  describe('Consent Management', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should grant consent', async () => {
      mockService.grantConsent.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.grantConsent('qwallet', 'transaction_signing', { test: true });
      });

      expect(success!).toBe(true);
      expect(mockService.grantConsent).toHaveBeenCalledWith(
        mockIdentity.did, 
        'qwallet', 
        'transaction_signing', 
        { test: true }
      );
      expect(mockService.getQonsentProfile).toHaveBeenCalledTimes(2); // Initial + reload
    });

    it('should revoke consent', async () => {
      mockService.revokeConsent.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.revokeConsent('qwallet', 'transaction_signing');
      });

      expect(success!).toBe(true);
      expect(mockService.revokeConsent).toHaveBeenCalledWith(
        mockIdentity.did, 
        'qwallet', 
        'transaction_signing'
      );
    });

    it('should check consent', async () => {
      mockService.checkConsent.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      let hasConsent: boolean;
      await act(async () => {
        hasConsent = await result.current.checkConsent('qsocial', 'post_creation');
      });

      expect(hasConsent!).toBe(true);
      expect(mockService.checkConsent).toHaveBeenCalledWith(
        mockIdentity.did, 
        'qsocial', 
        'post_creation'
      );
    });

    it('should handle consent operations without active identity', async () => {
      const { result } = renderHook(() => useIdentityQonsent());

      let success: boolean;
      await act(async () => {
        success = await result.current.grantConsent('qwallet', 'transaction_signing');
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe('No active identity');
    });
  });

  describe('Privacy Level Management', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should set privacy level', async () => {
      mockService.setPrivacyLevel.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.setPrivacyLevel(PrivacyLevel.PRIVATE);
      });

      expect(success!).toBe(true);
      expect(mockService.setPrivacyLevel).toHaveBeenCalledWith(mockIdentity.did, PrivacyLevel.PRIVATE);
    });

    it('should get effective privacy level', async () => {
      mockService.getEffectivePrivacyLevel.mockResolvedValue(PrivacyLevel.DAO_ONLY);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      let level: PrivacyLevel;
      await act(async () => {
        level = await result.current.getEffectivePrivacyLevel();
      });

      expect(level!).toBe(PrivacyLevel.DAO_ONLY);
      expect(mockService.getEffectivePrivacyLevel).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should return PUBLIC level when no active identity', async () => {
      const { result } = renderHook(() => useIdentityQonsent());

      let level: PrivacyLevel;
      await act(async () => {
        level = await result.current.getEffectivePrivacyLevel();
      });

      expect(level!).toBe(PrivacyLevel.PUBLIC);
    });
  });

  describe('Module Permissions', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should get module permissions', async () => {
      const mockPermissions = {
        enabled: true,
        level: 'FULL' as const,
        restrictions: [],
        dataSharing: true,
        visibility: PrivacyLevel.PUBLIC
      };
      mockService.getModulePermissions.mockResolvedValue(mockPermissions);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      let permissions: any;
      await act(async () => {
        permissions = await result.current.getModulePermissions('qsocial');
      });

      expect(permissions).toEqual(mockPermissions);
      expect(mockService.getModulePermissions).toHaveBeenCalledWith(mockIdentity.did, 'qsocial');
    });

    it('should update module permissions', async () => {
      mockService.updateModulePermissions.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      const updates = { enabled: false, level: 'MINIMAL' as const };
      let success: boolean;

      await act(async () => {
        success = await result.current.updateModulePermissions('qsocial', updates);
      });

      expect(success!).toBe(true);
      expect(mockService.updateModulePermissions).toHaveBeenCalledWith(
        mockIdentity.did, 
        'qsocial', 
        updates
      );
    });
  });

  describe('Profile Synchronization', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should sync profile', async () => {
      mockService.syncProfileWithQonsent.mockResolvedValue(true);

      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.syncProfile();
      });

      expect(success!).toBe(true);
      expect(mockService.syncProfileWithQonsent).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should sync all profiles', async () => {
      const syncResult = { success: 3, failed: 1, errors: ['Error syncing profile X'] };
      mockService.syncAllProfiles.mockResolvedValue(syncResult);

      const { result } = renderHook(() => useIdentityQonsent());

      let result_: any;
      await act(async () => {
        result_ = await result.current.syncAllProfiles();
      });

      expect(result_).toEqual(syncResult);
      expect(mockService.syncAllProfiles).toHaveBeenCalled();
      expect(result.current.error).toBe('Sync completed with 1 errors');
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      mockService.getQonsentProfile.mockResolvedValue(mockProfile);
    });

    it('should clear error', async () => {
      const { result } = renderHook(() => useIdentityQonsent());

      // Set an error first
      await act(async () => {
        await result.current.createProfile(mockIdentity);
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should refresh profile', async () => {
      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      // Clear the mock call count
      mockService.getQonsentProfile.mockClear();

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockService.getQonsentProfile).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should get profile history', async () => {
      const { result } = renderHook(() => useIdentityQonsent(mockIdentity.did));

      await waitFor(() => {
        expect(result.current.currentProfile).toEqual(mockProfile);
      });

      const history = result.current.getProfileHistory();

      expect(history).toEqual(mockProfile.consentHistory);
      expect(history).toHaveLength(1);
      expect(history[0].permission).toBe('PROFILE_CREATED');
    });

    it('should return empty history when no profile', () => {
      const { result } = renderHook(() => useIdentityQonsent());

      const history = result.current.getProfileHistory();

      expect(history).toEqual([]);
    });
  });

  describe('Identity Changes', () => {
    it('should update when identity prop changes', async () => {
      mockService.getQonsentProfile.mockImplementation((id: string) => {
        if (id === 'identity-1') return Promise.resolve({ ...mockProfile, identityId: 'identity-1' });
        if (id === 'identity-2') return Promise.resolve({ ...mockProfile, identityId: 'identity-2' });
        return Promise.resolve(null);
      });

      const { result, rerender } = renderHook(
        ({ identityId }) => useIdentityQonsent(identityId),
        { initialProps: { identityId: 'identity-1' } }
      );

      await waitFor(() => {
        expect(result.current.activeIdentityId).toBe('identity-1');
      });

      rerender({ identityId: 'identity-2' });

      await waitFor(() => {
        expect(result.current.activeIdentityId).toBe('identity-2');
      });

      expect(mockService.getQonsentProfile).toHaveBeenCalledWith('identity-1');
      expect(mockService.getQonsentProfile).toHaveBeenCalledWith('identity-2');
    });
  });
});