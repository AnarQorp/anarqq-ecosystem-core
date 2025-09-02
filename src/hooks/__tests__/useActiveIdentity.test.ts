/**
 * Unit Tests for useActiveIdentity Hook
 * Tests active identity state management, capability checking, and permission validation
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useActiveIdentity } from '../useActiveIdentity';
import { useIdentityStore } from '@/state/identity';
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

describe('useActiveIdentity', () => {
  // Mock identities for different test scenarios
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
    children: [],
    governanceLevel: GovernanceType.DAO,
    privacyLevel: PrivacyLevel.DAO_ONLY,
    creationRules: {
      ...mockRootIdentity.creationRules,
      type: IdentityType.DAO,
      parentType: IdentityType.ROOT,
      requiresKYC: true,
      allowedChildTypes: [IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID]
    },
    kyc: {
      required: true,
      submitted: true,
      approved: true
    }
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
    privacyLevel: PrivacyLevel.PRIVATE,
    permissions: {
      ...mockRootIdentity.permissions,
      canCreateSubidentities: false
    },
    creationRules: {
      ...mockRootIdentity.creationRules,
      type: IdentityType.CONSENTIDA,
      parentType: IdentityType.ROOT,
      requiresParentalConsent: true,
      allowedChildTypes: []
    },
    kyc: {
      required: false,
      submitted: false,
      approved: false
    }
  };

  const mockAIDIdentity: ExtendedSquidIdentity = {
    ...mockRootIdentity,
    did: 'did:squid:aid:101',
    name: 'AID Identity',
    type: IdentityType.AID,
    parentId: 'did:squid:root:123',
    depth: 1,
    path: ['did:squid:root:123'],
    children: [],
    governanceLevel: GovernanceType.SELF,
    privacyLevel: PrivacyLevel.ANONYMOUS,
    permissions: {
      ...mockRootIdentity.permissions,
      canCreateSubidentities: false
    },
    creationRules: {
      ...mockRootIdentity.creationRules,
      type: IdentityType.AID,
      parentType: IdentityType.ROOT,
      requiresKYC: true,
      allowedChildTypes: []
    },
    kyc: {
      required: true,
      submitted: true,
      approved: true
    }
  };

  const mockDeepIdentity: ExtendedSquidIdentity = {
    ...mockRootIdentity,
    did: 'did:squid:deep:999',
    name: 'Deep Identity',
    type: IdentityType.ENTERPRISE,
    parentId: 'did:squid:dao:456',
    depth: 2, // At maximum depth
    path: ['did:squid:root:123', 'did:squid:dao:456'],
    children: [],
    permissions: {
      ...mockRootIdentity.permissions,
      canCreateSubidentities: false // Should be false due to depth
    },
    creationRules: {
      ...mockRootIdentity.creationRules,
      type: IdentityType.ENTERPRISE,
      allowedChildTypes: []
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No Active Identity', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: null,
        loading: false
      });
    });

    it('should handle no active identity gracefully', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.identity).toBeNull();
      expect(result.current.isRoot).toBe(false);
      expect(result.current.canCreateSubidentities).toBe(false);
      expect(result.current.governanceType).toBe(GovernanceType.SELF);
      expect(result.current.privacyLevel).toBe(PrivacyLevel.PUBLIC);
    });

    it('should return empty permissions when no active identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.permissions.canCreateSubidentities).toBe(false);
      expect(result.current.permissions.canDeleteSubidentities).toBe(false);
      expect(result.current.permissions.canModifyProfile).toBe(false);
      expect(result.current.permissions.canAccessModule('test')).toBe(false);
      expect(result.current.permissions.canPerformAction('test', 'resource')).toBe(false);
    });

    it('should return appropriate context info when no identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const contextInfo = result.current.getContextInfo();

      expect(contextInfo.displayName).toBe('No Identity');
      expect(contextInfo.typeLabel).toBe('None');
      expect(contextInfo.statusLabel).toBe('Not Authenticated');
      expect(contextInfo.warnings).toContain('No active identity found');
    });
  });

  describe('Root Identity', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockRootIdentity,
        loading: false
      });
    });

    it('should identify root identity correctly', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.identity).toEqual(mockRootIdentity);
      expect(result.current.isRoot).toBe(true);
      expect(result.current.canCreateSubidentities).toBe(true);
      expect(result.current.governanceType).toBe(GovernanceType.SELF);
      expect(result.current.privacyLevel).toBe(PrivacyLevel.PUBLIC);
    });

    it('should return correct permissions for root identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.permissions.canCreateSubidentities).toBe(true);
      expect(result.current.permissions.canDeleteSubidentities).toBe(true);
      expect(result.current.permissions.canModifyProfile).toBe(true);
    });

    it('should allow access to all modules for root identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canAccessModule('qsocial')).toBe(true);
      expect(result.current.canAccessModule('qwallet')).toBe(true);
      expect(result.current.canAccessModule('qmarket')).toBe(true);
      expect(result.current.canAccessModule('qindex')).toBe(true);
    });

    it('should return all allowed child types for root identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const allowedTypes = result.current.getAllowedChildTypes();

      expect(allowedTypes).toContain(IdentityType.DAO);
      expect(allowedTypes).toContain(IdentityType.ENTERPRISE);
      expect(allowedTypes).toContain(IdentityType.CONSENTIDA);
      expect(allowedTypes).toContain(IdentityType.AID);
    });

    it('should have correct capabilities for root identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.hasCapability('create_subidentities')).toBe(true);
      expect(result.current.hasCapability('delete_subidentities')).toBe(true);
      expect(result.current.hasCapability('modify_profile')).toBe(true);
      expect(result.current.hasCapability('kyc_verified')).toBe(true);
      expect(result.current.hasCapability('governance_participation')).toBe(true);
      expect(result.current.hasCapability('public_visibility')).toBe(true);
    });
  });

  describe('DAO Identity', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockDAOIdentity,
        loading: false
      });
    });

    it('should identify DAO identity correctly', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.identity).toEqual(mockDAOIdentity);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.canCreateSubidentities).toBe(true);
      expect(result.current.governanceType).toBe(GovernanceType.DAO);
      expect(result.current.privacyLevel).toBe(PrivacyLevel.DAO_ONLY);
    });

    it('should restrict module access for DAO-only privacy', () => {
      const { result } = renderHook(() => useActiveIdentity());

      // Should allow access since governance is DAO
      expect(result.current.canAccessModule('qsocial')).toBe(true);
      expect(result.current.canAccessModule('qwallet')).toBe(true);
    });

    it('should have DAO-specific capabilities', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.hasCapability('dao_membership')).toBe(true);
      expect(result.current.hasCapability('governance_participation')).toBe(true);
      expect(result.current.hasCapability('kyc_verified')).toBe(true);
    });

    it('should require DAO approval for certain actions', () => {
      const { result } = renderHook(() => useActiveIdentity());

      // Should still return true but log the requirement
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      expect(result.current.canPerformAction('governance', 'proposal')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Action 'governance' on 'proposal' requires DAO approval")
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Consentida Identity', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockConsentidaIdentity,
        loading: false
      });
    });

    it('should identify Consentida identity correctly', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.identity).toEqual(mockConsentidaIdentity);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.canCreateSubidentities).toBe(false);
      expect(result.current.governanceType).toBe(GovernanceType.PARENT);
      expect(result.current.privacyLevel).toBe(PrivacyLevel.PRIVATE);
    });

    it('should restrict module access for parental control', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canAccessModule('qmarket')).toBe(false);
      expect(result.current.canAccessModule('qwallet')).toBe(false);
      expect(result.current.canAccessModule('qsocial')).toBe(true); // Should be allowed
    });

    it('should restrict actions for parental control', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canPerformAction('delete', 'identity')).toBe(false);
      expect(result.current.canPerformAction('transfer', 'funds')).toBe(false);
      expect(result.current.canPerformAction('financial', 'transaction')).toBe(false);
      expect(result.current.canPerformAction('read', 'profile')).toBe(true);
    });

    it('should have parental control capabilities', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.hasCapability('parental_control')).toBe(true);
      expect(result.current.hasCapability('create_subidentities')).toBe(false);
      expect(result.current.hasCapability('kyc_verified')).toBe(false);
    });

    it('should return empty allowed child types', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const allowedTypes = result.current.getAllowedChildTypes();
      expect(allowedTypes).toHaveLength(0);
    });
  });

  describe('AID Identity', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockAIDIdentity,
        loading: false
      });
    });

    it('should identify AID identity correctly', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.identity).toEqual(mockAIDIdentity);
      expect(result.current.isRoot).toBe(false);
      expect(result.current.canCreateSubidentities).toBe(false);
      expect(result.current.governanceType).toBe(GovernanceType.SELF);
      expect(result.current.privacyLevel).toBe(PrivacyLevel.ANONYMOUS);
    });

    it('should restrict module access for anonymous identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canAccessModule('qsocial')).toBe(false);
      expect(result.current.canAccessModule('qindex')).toBe(false);
      expect(result.current.canAccessModule('qmarket')).toBe(false);
      expect(result.current.canAccessModule('qlock')).toBe(true); // Should be allowed
    });

    it('should have anonymous capabilities', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.hasCapability('anonymous_operations')).toBe(true);
      expect(result.current.hasCapability('public_visibility')).toBe(false);
      expect(result.current.hasCapability('kyc_verified')).toBe(true);
    });
  });

  describe('Deep Identity (Max Depth)', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockDeepIdentity,
        loading: false
      });
    });

    it('should prevent subidentity creation at max depth', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canCreateSubidentities).toBe(false);
      expect(result.current.getAllowedChildTypes()).toHaveLength(0);
    });

    it('should show depth warning in context info', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const contextInfo = result.current.getContextInfo();
      expect(contextInfo.warnings).toContain('Maximum nesting depth reached');
    });
  });

  describe('Inactive Identity', () => {
    beforeEach(() => {
      const inactiveIdentity = {
        ...mockRootIdentity,
        status: IdentityStatus.INACTIVE
      };

      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: inactiveIdentity,
        loading: false
      });
    });

    it('should prevent operations on inactive identity', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canCreateSubidentities).toBe(false);
      expect(result.current.canAccessModule('qsocial')).toBe(false);
    });

    it('should show status warning in context info', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const contextInfo = result.current.getContextInfo();
      expect(contextInfo.warnings).toContain('Identity status: INACTIVE');
    });
  });

  describe('Capabilities Summary', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockRootIdentity,
        loading: false
      });
    });

    it('should return comprehensive capabilities summary', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const summary = result.current.getCapabilitiesSummary();

      expect(summary.canCreateSubidentities).toBe(true);
      expect(summary.canDeleteSubidentities).toBe(true);
      expect(summary.canModifyProfile).toBe(true);
      expect(summary.hasKYC).toBe(true);
      expect(summary.isGovernanceParticipant).toBe(true);
      expect(summary.isPublic).toBe(true);
      expect(summary.allowedChildTypes).toHaveLength(4);
      expect(summary.restrictedModules).toHaveLength(0);
      expect(summary.restrictedActions).toHaveLength(0);
    });
  });

  describe('Context Info', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockDAOIdentity,
        loading: false
      });
    });

    it('should return detailed context information', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const contextInfo = result.current.getContextInfo();

      expect(contextInfo.displayName).toBe('DAO Identity');
      expect(contextInfo.typeLabel).toBe(IdentityType.DAO);
      expect(contextInfo.statusLabel).toBe(IdentityStatus.ACTIVE);
      expect(contextInfo.privacyLabel).toBe(PrivacyLevel.DAO_ONLY);
      expect(contextInfo.governanceLabel).toBe(GovernanceType.DAO);
      expect(contextInfo.capabilities).toContain('Can create subidentities');
      expect(contextInfo.capabilities).toContain('KYC verified');
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: mockRootIdentity,
        loading: true
      });
    });

    it('should reflect loading state from store', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.loading).toBe(true);
    });
  });

  describe('KYC Requirements', () => {
    beforeEach(() => {
      const identityWithoutKYC = {
        ...mockDAOIdentity,
        kyc: {
          required: true,
          submitted: false,
          approved: false
        }
      };

      (useIdentityStore as Mock).mockReturnValue({
        activeIdentity: identityWithoutKYC,
        loading: false
      });
    });

    it('should restrict KYC-required actions when not verified', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.canPerformAction('financial', 'transaction')).toBe(false);
      expect(result.current.canPerformAction('governance', 'vote')).toBe(false);
      expect(result.current.canPerformAction('verification', 'submit')).toBe(false);
    });

    it('should show KYC warning in context info', () => {
      const { result } = renderHook(() => useActiveIdentity());

      const contextInfo = result.current.getContextInfo();
      expect(contextInfo.warnings).toContain('KYC verification required');
    });

    it('should reflect KYC status in capabilities', () => {
      const { result } = renderHook(() => useActiveIdentity());

      expect(result.current.hasCapability('kyc_verified')).toBe(false);
      
      const summary = result.current.getCapabilitiesSummary();
      expect(summary.hasKYC).toBe(false);
      expect(summary.restrictedActions).toContain('financial');
      expect(summary.restrictedActions).toContain('governance');
      expect(summary.restrictedActions).toContain('verification');
    });
  });
});