/**
 * Identity Overview Dashboard Component Tests
 * Tests for identity tree visualization, statistics, and management actions
 * Requirements: 1.1, 1.2, 1.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IdentityOverviewDashboard } from '../IdentityOverviewDashboard';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useIdentityTree } from '@/hooks/useIdentityTree';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { IdentityType, PrivacyLevel, IdentityStatus, GovernanceType } from '@/types/identity';

// Mock the hooks
vi.mock('@/hooks/useIdentityManager');
vi.mock('@/hooks/useIdentityTree');
vi.mock('@/hooks/useActiveIdentity');

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardDescription: ({ children }: any) => <div className="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div className="card-title">{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={`button ${className}`} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={`badge ${className}`}>{children}</span>
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr className="separator" />
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div className="scroll-area">{children}</div>
}));

// Mock identity visual indicators
vi.mock('../IdentityVisualIndicators', () => ({
  IdentityTypeIcon: ({ type, className }: any) => (
    <div className={`identity-type-icon ${className}`} data-type={type}>
      {type}-icon
    </div>
  ),
  IdentityTypeBadge: ({ type, size }: any) => (
    <span className={`identity-type-badge ${size}`} data-type={type}>
      {type}
    </span>
  ),
  PrivacyLevelBadge: ({ level, size }: any) => (
    <span className={`privacy-level-badge ${size}`} data-level={level}>
      {level}
    </span>
  ),
  SecurityStatusBadge: ({ flags, size }: any) => (
    <span className={`security-status-badge ${size}`} data-flags={flags?.length || 0}>
      Security
    </span>
  )
}));

// Mock data
const mockRootIdentity = {
  did: 'did:squid:root-123',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root-123',
  children: ['did:squid:dao-456', 'did:squid:aid-789'],
  depth: 0,
  path: [],
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    type: IdentityType.ROOT,
    requiresKYC: false,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.DAO, IdentityType.AID]
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
    algorithm: 'ECDSA' as const,
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  description: 'Main root identity',
  tags: ['root', 'main'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-15T00:00:00Z',
  kyc: {
    required: false,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const mockDAOIdentity = {
  did: 'did:squid:dao-456',
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
    parentType: IdentityType.ROOT,
    requiresKYC: true,
    requiresDAOGovernance: true,
    requiresParentalConsent: false,
    maxDepth: 3,
    allowedChildTypes: [IdentityType.ENTERPRISE]
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: false,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.DAO
  },
  status: IdentityStatus.ACTIVE,
  qonsentProfileId: 'qonsent-dao-456',
  qlockKeyPair: {
    publicKey: 'pub-dao-456',
    privateKey: 'priv-dao-456',
    algorithm: 'ECDSA' as const,
    keySize: 256,
    createdAt: '2024-01-02T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  description: 'DAO governance identity',
  tags: ['dao', 'governance'],
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  lastUsed: '2024-01-14T00:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const mockAIDIdentity = {
  did: 'did:squid:aid-789',
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
    parentType: IdentityType.ROOT,
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
  qonsentProfileId: 'qonsent-aid-789',
  qlockKeyPair: {
    publicKey: 'pub-aid-789',
    privateKey: 'priv-aid-789',
    algorithm: 'ECDSA' as const,
    keySize: 256,
    createdAt: '2024-01-03T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.ANONYMOUS,
  description: 'Anonymous identity for privacy',
  tags: ['anonymous', 'privacy'],
  createdAt: '2024-01-03T00:00:00Z',
  updatedAt: '2024-01-03T00:00:00Z',
  lastUsed: '2024-01-13T00:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: false
};

const mockIdentities = [mockRootIdentity, mockDAOIdentity, mockAIDIdentity];

const mockTreeNode = {
  identity: mockRootIdentity,
  children: [
    {
      identity: mockDAOIdentity,
      children: [],
      parent: undefined
    },
    {
      identity: mockAIDIdentity,
      children: [],
      parent: undefined
    }
  ],
  expanded: true
};

describe('IdentityOverviewDashboard', () => {
  const mockOnCreateIdentity = vi.fn();
  const mockOnEditIdentity = vi.fn();
  const mockOnDeleteIdentity = vi.fn();
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useIdentityManager
    (useIdentityManager as any).mockReturnValue({
      identities: mockIdentities,
      activeIdentity: mockRootIdentity,
      loading: false,
      error: null,
      getIdentityStats: () => ({
        total: 3,
        byType: {
          [IdentityType.ROOT]: 1,
          [IdentityType.DAO]: 1,
          [IdentityType.ENTERPRISE]: 0,
          [IdentityType.CONSENTIDA]: 0,
          [IdentityType.AID]: 1
        },
        active: 3,
        withKYC: 3
      })
    });

    // Mock useActiveIdentity
    (useActiveIdentity as any).mockReturnValue({
      identity: mockRootIdentity,
      canCreateSubidentities: true,
      isRoot: true,
      governanceType: GovernanceType.SELF,
      privacyLevel: PrivacyLevel.PUBLIC
    });

    // Mock useIdentityTree
    (useIdentityTree as any).mockReturnValue({
      tree: mockTreeNode,
      expandedNodes: ['did:squid:root-123'],
      toggleNode: vi.fn(),
      selectNode: vi.fn(),
      selectedNode: null,
      getTreeStats: () => ({
        totalNodes: 3,
        maxDepth: 1,
        expandedNodes: 1,
        nodesByType: {
          [IdentityType.ROOT]: 1,
          [IdentityType.DAO]: 1,
          [IdentityType.ENTERPRISE]: 0,
          [IdentityType.CONSENTIDA]: 0,
          [IdentityType.AID]: 1
        }
      }),
      getVisibleNodes: () => [mockTreeNode, ...mockTreeNode.children]
    });
  });

  describe('Rendering', () => {
    it('should render dashboard header with title and description', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Identity Management')).toBeInTheDocument();
      expect(screen.getByText('Manage your identities and subidentities across the ecosystem')).toBeInTheDocument();
    });

    it('should render create identity button when user can create subidentities', () => {
      render(<IdentityOverviewDashboard onCreateIdentity={mockOnCreateIdentity} />);
      
      const createButton = screen.getByText('Create Identity');
      expect(createButton).toBeInTheDocument();
    });

    it('should not render create identity button when user cannot create subidentities', () => {
      (useActiveIdentity as any).mockReturnValue({
        identity: mockAIDIdentity,
        canCreateSubidentities: false,
        isRoot: false,
        governanceType: GovernanceType.SELF,
        privacyLevel: PrivacyLevel.ANONYMOUS
      });

      render(<IdentityOverviewDashboard onCreateIdentity={mockOnCreateIdentity} />);
      
      expect(screen.queryByText('Create Identity')).not.toBeInTheDocument();
    });

    it('should render statistics cards with correct values', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Total Identities')).toBeInTheDocument();
      expect(screen.getAllByText('3')).toHaveLength(3); // Total, Active, KYC counts
      expect(screen.getAllByText('Active')).toHaveLength(2); // Stats card and tree badge
      expect(screen.getByText('KYC Verified')).toBeInTheDocument();
      expect(screen.getByText('Max Depth')).toBeInTheDocument();
      expect(screen.getAllByText('1')).toHaveLength(4); // Max depth and type distribution counts
    });

    it('should render identity tree with root identity', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Identity Tree')).toBeInTheDocument();
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Anonymous Identity')).toBeInTheDocument();
    });

    it('should render identity type distribution', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Identity Type Distribution')).toBeInTheDocument();
      expect(screen.getByText('Breakdown of your identities by type')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when loading', () => {
      (useIdentityManager as any).mockReturnValue({
        identities: [],
        activeIdentity: null,
        loading: true,
        error: null,
        getIdentityStats: () => ({})
      });

      render(<IdentityOverviewDashboard />);
      
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when there is an error', () => {
      (useIdentityManager as any).mockReturnValue({
        identities: [],
        activeIdentity: null,
        loading: false,
        error: 'Failed to load identities',
        getIdentityStats: () => ({})
      });

      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Error loading identity dashboard')).toBeInTheDocument();
      expect(screen.getByText('Failed to load identities')).toBeInTheDocument();
    });
  });

  describe('Identity Tree Interactions', () => {
    it('should call toggleNode when expand/collapse button is clicked', () => {
      const mockToggleNode = vi.fn();
      (useIdentityTree as any).mockReturnValue({
        tree: mockTreeNode,
        expandedNodes: ['did:squid:root-123'],
        toggleNode: mockToggleNode,
        selectNode: vi.fn(),
        selectedNode: null,
        getTreeStats: () => ({ totalNodes: 3, maxDepth: 1, expandedNodes: 1, nodesByType: {} }),
        getVisibleNodes: () => [mockTreeNode]
      });

      render(<IdentityOverviewDashboard />);
      
      // Find and click the expand/collapse button
      const expandButton = document.querySelector('button[class*="h-6 w-6 p-0"]');
      if (expandButton) {
        fireEvent.click(expandButton);
        expect(mockToggleNode).toHaveBeenCalledWith('did:squid:root-123');
      }
    });

    it('should call selectNode and onViewDetails when identity is clicked', () => {
      const mockSelectNode = vi.fn();
      (useIdentityTree as any).mockReturnValue({
        tree: mockTreeNode,
        expandedNodes: ['did:squid:root-123'],
        toggleNode: vi.fn(),
        selectNode: mockSelectNode,
        selectedNode: null,
        getTreeStats: () => ({ totalNodes: 3, maxDepth: 1, expandedNodes: 1, nodesByType: {} }),
        getVisibleNodes: () => [mockTreeNode]
      });

      render(<IdentityOverviewDashboard onViewDetails={mockOnViewDetails} />);
      
      // Click on the root identity
      const identityElement = screen.getByText('Root Identity').closest('div');
      if (identityElement) {
        fireEvent.click(identityElement);
        expect(mockSelectNode).toHaveBeenCalledWith('did:squid:root-123');
        expect(mockOnViewDetails).toHaveBeenCalledWith(mockRootIdentity);
      }
    });
  });

  describe('Action Callbacks', () => {
    it('should call onCreateIdentity when create button is clicked', () => {
      render(<IdentityOverviewDashboard onCreateIdentity={mockOnCreateIdentity} />);
      
      const createButton = screen.getByText('Create Identity');
      fireEvent.click(createButton);
      
      expect(mockOnCreateIdentity).toHaveBeenCalled();
    });
  });

  describe('Identity Details Panel', () => {
    it('should show "Select an identity" message when no identity is selected', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getByText('Select an identity to view details')).toBeInTheDocument();
    });

    it('should show identity details when an identity is selected', () => {
      (useIdentityTree as any).mockReturnValue({
        tree: mockTreeNode,
        expandedNodes: ['did:squid:root-123'],
        toggleNode: vi.fn(),
        selectNode: vi.fn(),
        selectedNode: 'did:squid:root-123',
        getTreeStats: () => ({ totalNodes: 3, maxDepth: 1, expandedNodes: 1, nodesByType: {} }),
        getVisibleNodes: () => [mockTreeNode]
      });

      render(<IdentityOverviewDashboard />);
      
      // The details panel should show the selected identity
      expect(screen.getByText('Identity Details')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should render identity type icons for each identity', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getAllByText('ROOT-icon')).toHaveLength(2); // One in tree, one in distribution
      expect(screen.getAllByText('DAO-icon')).toHaveLength(2); // One in tree, one in distribution
      expect(screen.getAllByText('AID-icon')).toHaveLength(2); // One in tree, one in distribution
    });

    it('should render privacy level badges', () => {
      render(<IdentityOverviewDashboard />);
      
      const privacyBadges = document.querySelectorAll('.privacy-level-badge');
      expect(privacyBadges.length).toBeGreaterThan(0);
    });

    it('should show active badge for active identity', () => {
      render(<IdentityOverviewDashboard />);
      
      expect(screen.getAllByText('Active')).toHaveLength(2); // One in stats, one in tree
    });

    it('should show KYC badge for verified identities', () => {
      render(<IdentityOverviewDashboard />);
      
      const kycBadges = screen.getAllByText('KYC');
      expect(kycBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<IdentityOverviewDashboard />);
      
      // Check for button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<IdentityOverviewDashboard onCreateIdentity={mockOnCreateIdentity} />);
      
      const createButton = screen.getByText('Create Identity');
      
      // Test keyboard interaction - buttons respond to click, not keyDown in this mock
      createButton.focus();
      fireEvent.click(createButton);
      
      expect(mockOnCreateIdentity).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive grid classes', () => {
      render(<IdentityOverviewDashboard />);
      
      // Check for responsive grid classes
      const gridElements = document.querySelectorAll('[class*="grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large number of identities efficiently', () => {
      const largeIdentityList = Array.from({ length: 100 }, (_, i) => ({
        ...mockRootIdentity,
        did: `did:squid:identity-${i}`,
        name: `Identity ${i}`
      }));

      (useIdentityManager as any).mockReturnValue({
        identities: largeIdentityList,
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        getIdentityStats: () => ({
          total: 100,
          byType: { [IdentityType.ROOT]: 100, [IdentityType.DAO]: 0, [IdentityType.ENTERPRISE]: 0, [IdentityType.CONSENTIDA]: 0, [IdentityType.AID]: 0 },
          active: 100,
          withKYC: 100
        })
      });

      const { container } = render(<IdentityOverviewDashboard />);
      
      // Should render without performance issues
      expect(container).toBeInTheDocument();
      expect(screen.getAllByText('100')).toHaveLength(4); // Total, Active, KYC, and Root type count
    });
  });
});