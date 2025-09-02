/**
 * Tests for IdentitySwitcher Component
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentitySwitcher } from '../IdentitySwitcher';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useToast } from '@/hooks/use-toast';
import {
  IdentityType,
  PrivacyLevel,
  IdentityStatus,
  GovernanceType,
  ExtendedSquidIdentity
} from '@/types/identity';

// Mock the hooks
vi.mock('@/hooks/useIdentityManager');
vi.mock('@/hooks/useActiveIdentity');
vi.mock('@/hooks/use-toast');

const mockUseIdentityManager = vi.mocked(useIdentityManager);
const mockUseActiveIdentity = vi.mocked(useActiveIdentity);
const mockUseToast = vi.mocked(useToast);

// Mock identities for testing
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:root-123',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root-123',
  children: ['did:squid:dao-123', 'did:squid:aid-123'],
  depth: 0,
  path: [],
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    type: IdentityType.ROOT,
    requiresKYC: false,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.DAO, IdentityType.CONSENTIDA, IdentityType.AID]
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
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: 'https://example.com/avatar-root.jpg',
  tags: ['root'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-02T00:00:00Z',
  kyc: {
    required: false,
    submitted: false,
    approved: false
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const mockDAOIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:dao-123',
  name: 'DAO Identity',
  type: IdentityType.DAO,
  parentId: 'did:squid:root-123',
  rootId: 'did:squid:root-123',
  children: [],
  depth: 1,
  path: ['did:squid:root-123'],
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    type: IdentityType.DAO,
    requiresKYC: true,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.CONSENTIDA, IdentityType.AID]
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.DAO
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-dao-123',
  qlockKeyPair: {
    publicKey: 'pub-dao-123',
    privateKey: 'priv-dao-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.DAO_ONLY,
  tags: ['dao'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T12:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true,
    level: 'BASIC'
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const mockAIDIdentity: ExtendedSquidIdentity = {
  did: 'did:squid:aid-123',
  name: 'Anonymous Identity',
  type: IdentityType.AID,
  parentId: 'did:squid:root-123',
  rootId: 'did:squid:root-123',
  children: [],
  depth: 1,
  path: ['did:squid:root-123'],
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    type: IdentityType.AID,
    requiresKYC: true,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: []
  },
  permissions: {
    canCreateSubidentities: false,
    canDeleteSubidentities: false,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.SELF
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-aid-123',
  qlockKeyPair: {
    publicKey: 'pub-aid-123',
    privateKey: 'priv-aid-123',
    algorithm: 'ECDSA',
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.ANONYMOUS,
  tags: ['anonymous'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-01T06:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true,
    level: 'BASIC'
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: false
};

const mockIdentities = [mockRootIdentity, mockDAOIdentity, mockAIDIdentity];

describe('IdentitySwitcher', () => {
  const mockSwitchIdentity = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseIdentityManager.mockReturnValue({
      identities: mockIdentities,
      activeIdentity: mockRootIdentity,
      switchIdentity: mockSwitchIdentity,
      loading: false,
      error: null,
      createSubidentity: vi.fn(),
      deleteIdentity: vi.fn(),
      clearError: vi.fn(),
      refreshIdentities: vi.fn(),
      getIdentityStats: vi.fn()
    });

    mockUseActiveIdentity.mockReturnValue({
      identity: mockRootIdentity,
      loading: false,
      isRoot: true,
      canCreateSubidentities: true,
      governanceType: GovernanceType.SELF,
      privacyLevel: PrivacyLevel.PUBLIC,
      permissions: mockRootIdentity.permissions,
      canAccessModule: vi.fn(),
      canPerformAction: vi.fn(),
      hasCapability: vi.fn(),
      getAllowedChildTypes: vi.fn(),
      getCapabilitiesSummary: vi.fn(),
      getContextInfo: vi.fn()
    });

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    });
  });

  describe('Dropdown Mode', () => {
    it('renders dropdown trigger with active identity', () => {
      render(<IdentitySwitcher mode="dropdown" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
    });

    it('applies compact mode styling', () => {
      render(<IdentitySwitcher mode="dropdown" compactMode={true} />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('min-w-[150px]', 'h-8', 'text-sm');
    });

    it('shows loading state when loading', () => {
      mockUseIdentityManager.mockReturnValue({
        identities: mockIdentities,
        activeIdentity: mockRootIdentity,
        switchIdentity: mockSwitchIdentity,
        loading: true,
        error: null,
        createSubidentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn()
      });
      
      render(<IdentitySwitcher mode="dropdown" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Grid Mode', () => {
    it('renders grid layout with all identities', () => {
      render(<IdentitySwitcher mode="grid" />);
      
      expect(screen.getByText('Switch Identity')).toBeInTheDocument();
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Anonymous Identity')).toBeInTheDocument();
    });

    it('shows active identity indicator', () => {
      render(<IdentitySwitcher mode="grid" />);
      
      // Root identity should have active badge
      const rootIdentityContainer = screen.getByText('Root Identity').closest('div');
      expect(rootIdentityContainer).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays privacy level badges', () => {
      render(<IdentitySwitcher mode="grid" />);
      
      expect(screen.getByText('PUBLIC')).toBeInTheDocument();
      expect(screen.getByText('DAO ONLY')).toBeInTheDocument();
      expect(screen.getByText('ANONYMOUS')).toBeInTheDocument();
    });
  });

  describe('Identity Switching', () => {
    it('calls switchIdentity when identity is clicked in grid mode', async () => {
      mockSwitchIdentity.mockResolvedValue({ success: true });
      
      render(<IdentitySwitcher mode="grid" />);
      
      const daoIdentity = screen.getByText('DAO Identity');
      fireEvent.click(daoIdentity);
      
      await waitFor(() => {
        expect(mockSwitchIdentity).toHaveBeenCalledWith('did:squid:dao-123');
      });
    });

    it('shows success toast on successful switch in grid mode', async () => {
      mockSwitchIdentity.mockResolvedValue({ success: true });
      
      render(<IdentitySwitcher mode="grid" />);
      
      const daoIdentity = screen.getByText('DAO Identity');
      fireEvent.click(daoIdentity);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Identity Switched",
          description: "Now operating as DAO Identity",
        });
      });
    });

    it('shows error toast on failed switch in grid mode', async () => {
      const errorMessage = 'Switch failed';
      mockSwitchIdentity.mockResolvedValue({ success: false, error: errorMessage });
      
      render(<IdentitySwitcher mode="grid" />);
      
      const daoIdentity = screen.getByText('DAO Identity');
      fireEvent.click(daoIdentity);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Switch Failed",
          description: errorMessage,
          variant: "destructive",
        });
      });
    });

    it('does not switch when clicking active identity in grid mode', async () => {
      render(<IdentitySwitcher mode="grid" />);
      
      const rootIdentity = screen.getByText('Root Identity');
      fireEvent.click(rootIdentity);
      
      expect(mockSwitchIdentity).not.toHaveBeenCalled();
    });

    it('calls onIdentitySwitch callback on successful switch', async () => {
      const onIdentitySwitch = vi.fn();
      mockSwitchIdentity.mockResolvedValue({ success: true });
      
      render(
        <IdentitySwitcher 
          mode="grid" 
          onIdentitySwitch={onIdentitySwitch}
        />
      );
      
      const daoIdentity = screen.getByText('DAO Identity');
      fireEvent.click(daoIdentity);
      
      await waitFor(() => {
        expect(onIdentitySwitch).toHaveBeenCalledWith(mockDAOIdentity);
      });
    });

    it('calls onSwitchError callback on failed switch', async () => {
      const onSwitchError = vi.fn();
      const errorMessage = 'Switch failed';
      mockSwitchIdentity.mockResolvedValue({ success: false, error: errorMessage });
      
      render(
        <IdentitySwitcher 
          mode="grid" 
          onSwitchError={onSwitchError}
        />
      );
      
      const daoIdentity = screen.getByText('DAO Identity');
      fireEvent.click(daoIdentity);
      
      await waitFor(() => {
        expect(onSwitchError).toHaveBeenCalledWith(errorMessage);
      });
    });
  });

  describe('Loading States', () => {
    it('disables trigger when loading', () => {
      mockUseIdentityManager.mockReturnValue({
        identities: mockIdentities,
        activeIdentity: mockRootIdentity,
        switchIdentity: mockSwitchIdentity,
        loading: true,
        error: null,
        createSubidentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn()
      });
      
      render(<IdentitySwitcher mode="dropdown" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
    });
  });

  describe('Empty States', () => {
    it('shows "No Identity" when no active identity', () => {
      mockUseActiveIdentity.mockReturnValue({
        identity: null,
        loading: false,
        isRoot: false,
        canCreateSubidentities: false,
        governanceType: GovernanceType.SELF,
        privacyLevel: PrivacyLevel.PUBLIC,
        permissions: {
          canCreateSubidentities: false,
          canDeleteSubidentities: false,
          canModifyProfile: false,
          canAccessModule: () => false,
          canPerformAction: () => false,
          governanceLevel: GovernanceType.SELF
        },
        canAccessModule: vi.fn(),
        canPerformAction: vi.fn(),
        hasCapability: vi.fn(),
        getAllowedChildTypes: vi.fn(),
        getCapabilitiesSummary: vi.fn(),
        getContextInfo: vi.fn()
      });
      
      render(<IdentitySwitcher mode="dropdown" />);
      
      expect(screen.getByText('No Identity')).toBeInTheDocument();
    });

    it('shows no identities message in grid mode when list is empty', () => {
      mockUseIdentityManager.mockReturnValue({
        identities: [],
        activeIdentity: null,
        switchIdentity: mockSwitchIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn()
      });

      render(<IdentitySwitcher mode="grid" />);
      
      expect(screen.getByText('No identities available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IdentitySwitcher mode="dropdown" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('supports keyboard navigation', async () => {
      render(<IdentitySwitcher mode="dropdown" />);
      
      const trigger = screen.getByRole('button');
      
      // Should be focusable
      trigger.focus();
      expect(trigger).toHaveFocus();
      
      // Should open on Enter
      fireEvent.keyDown(trigger, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Switch Identity')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('applies custom className', () => {
      render(<IdentitySwitcher mode="dropdown" className="custom-class" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('custom-class');
    });

    it('handles different screen sizes appropriately', () => {
      const { rerender } = render(
        <IdentitySwitcher mode="dropdown" compactMode={false} />
      );
      
      let trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('min-w-[200px]');
      
      rerender(<IdentitySwitcher mode="dropdown" compactMode={true} />);
      
      trigger = screen.getByRole('button');
      expect(trigger).toHaveClass('min-w-[150px]');
    });
  });
});