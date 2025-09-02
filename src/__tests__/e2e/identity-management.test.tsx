/**
 * End-to-End Tests for Identity Management System
 * Tests complete user workflows from creation to deletion
 * Requirements: All requirements from squid-identity-expansion spec
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Components to test
import IdentityManagement from '@/pages/IdentityManagement';
import { SubidentityCreationWizard } from '@/components/identity/SubidentityCreationWizard';
import { IdentitySwitcher } from '@/components/identity/IdentitySwitcher';

// Hooks and services
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { identityManager } from '@/services/IdentityManager';

// Types
import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  PrivacyLevel, 
  IdentityStatus,
  GovernanceType 
} from '@/types/identity';

// Mock data
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  parentId: undefined,
  depth: 0,
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    kycRequired: false,
    canCreateSubidentities: true,
    visibility: 'PUBLIC',
    governedBy: 'SELF'
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canSwitchIdentities: true
  },
  qonsentProfileId: 'qonsent_profile_root',
  qlockKeyPair: {
    publicKey: 'mock_public_key',
    privateKey: 'mock_private_key'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: undefined,
  description: 'Primary root identity',
  tags: ['root', 'primary'],
  createdAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-02-08T00:00:00Z',
  status: IdentityStatus.ACTIVE,
  kyc: {
    approved: true,
    level: 'FULL',
    verifiedAt: '2024-01-01T00:00:00Z',
    documents: []
  },
  auditLog: [],
  securityFlags: []
};

const mockDAOIdentity: ExtendedSquidIdentity = {
  did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
  name: 'DAO Identity',
  type: IdentityType.DAO,
  parentId: mockRootIdentity.did,
  depth: 1,
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    kycRequired: true,
    canCreateSubidentities: true,
    visibility: 'PUBLIC',
    governedBy: 'DAO'
  },
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: false,
    canModifyProfile: true,
    canSwitchIdentities: true
  },
  qonsentProfileId: 'qonsent_profile_dao',
  qlockKeyPair: {
    publicKey: 'mock_dao_public_key',
    privateKey: 'mock_dao_private_key'
  },
  privacyLevel: PrivacyLevel.DAO_ONLY,
  avatar: undefined,
  description: 'DAO governance identity',
  tags: ['dao', 'governance'],
  createdAt: '2024-01-15T00:00:00Z',
  lastUsed: '2024-02-07T00:00:00Z',
  status: IdentityStatus.ACTIVE,
  kyc: {
    approved: true,
    level: 'FULL',
    verifiedAt: '2024-01-15T00:00:00Z',
    documents: []
  },
  auditLog: [],
  securityFlags: []
};

// Mock hooks
vi.mock('@/hooks/useIdentityManager');
vi.mock('@/hooks/useActiveIdentity');
vi.mock('@/hooks/use-toast');

// Mock services
vi.mock('@/services/IdentityManager');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Identity Management E2E Tests', () => {
  const mockUseIdentityManager = vi.mocked(useIdentityManager);
  const mockUseActiveIdentity = vi.mocked(useActiveIdentity);
  const mockIdentityManager = vi.mocked(identityManager);

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock toast hook
    vi.mock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: vi.fn()
      })
    }));

    // Setup default mock implementations
    mockUseIdentityManager.mockReturnValue({
      identities: [mockRootIdentity, mockDAOIdentity],
      activeIdentity: mockRootIdentity,
      loading: false,
      error: null,
      createSubidentity: vi.fn(),
      switchIdentity: vi.fn(),
      deleteIdentity: vi.fn(),
      clearError: vi.fn(),
      refreshIdentities: vi.fn(),
      getIdentityStats: vi.fn(() => ({
        total: 2,
        byType: {
          [IdentityType.ROOT]: 1,
          [IdentityType.DAO]: 1,
          [IdentityType.ENTERPRISE]: 0,
          [IdentityType.CONSENTIDA]: 0,
          [IdentityType.AID]: 0
        },
        active: 2,
        withKYC: 2
      }))
    });

    mockUseActiveIdentity.mockReturnValue({
      identity: mockRootIdentity,
      isRoot: true,
      canCreateSubidentities: true,
      governanceType: GovernanceType.SELF,
      privacyLevel: PrivacyLevel.PUBLIC
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Identity Overview Dashboard', () => {
    it('should display identity statistics correctly', async () => {
      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      // Check that statistics are displayed
      expect(screen.getByText('2')).toBeInTheDocument(); // Total identities
      expect(screen.getByText('Total Identities')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('KYC Verified')).toBeInTheDocument();
    });

    it('should show current identity information', async () => {
      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      // Check current identity display
      expect(screen.getByText('Currently Operating As')).toBeInTheDocument();
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      expect(screen.getByText('ROOT')).toBeInTheDocument();
    });

    it('should display create identity button when user can create subidentities', async () => {
      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      const createButton = screen.getByRole('button', { name: /create identity/i });
      expect(createButton).toBeInTheDocument();
    });

    it('should not display create identity button when user cannot create subidentities', async () => {
      mockUseActiveIdentity.mockReturnValue({
        identity: mockDAOIdentity,
        isRoot: false,
        canCreateSubidentities: false,
        governanceType: GovernanceType.DAO,
        privacyLevel: PrivacyLevel.DAO_ONLY
      });

      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      const createButton = screen.queryByRole('button', { name: /create identity/i });
      expect(createButton).not.toBeInTheDocument();
    });
  });

  describe('Identity Switcher Integration', () => {
    it('should display identity switcher when multiple identities exist', async () => {
      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      // Look for the identity switcher dropdown
      const switcher = screen.getByRole('button', { name: /root identity/i });
      expect(switcher).toBeInTheDocument();
    });

    it('should allow switching between identities', async () => {
      const user = userEvent.setup();
      const mockSwitchIdentity = vi.fn().mockResolvedValue({ success: true });
      
      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, mockDAOIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: mockSwitchIdentity,
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 2,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 1,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 2,
          withKYC: 2
        }))
      });

      render(
        <TestWrapper>
          <IdentitySwitcher 
            mode="dropdown"
            showSecurityBadges={true}
            onIdentitySwitch={vi.fn()}
          />
        </TestWrapper>
      );

      // Click on the switcher to open dropdown
      const switcher = screen.getByRole('button');
      await user.click(switcher);

      // Wait for dropdown to appear and click on DAO identity
      await waitFor(() => {
        const daoOption = screen.getByText('DAO Identity');
        expect(daoOption).toBeInTheDocument();
      });

      const daoOption = screen.getByText('DAO Identity');
      await user.click(daoOption);

      // Verify switch was called
      expect(mockSwitchIdentity).toHaveBeenCalledWith(mockDAOIdentity.did);
    });
  });

  describe('Subidentity Creation Workflow', () => {
    it('should open creation wizard when create button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      const createButton = screen.getByRole('button', { name: /create identity/i });
      await user.click(createButton);

      // Check that wizard opens
      await waitFor(() => {
        expect(screen.getByText('Select Identity Type')).toBeInTheDocument();
      });
    });

    it('should complete full identity creation workflow', async () => {
      const user = userEvent.setup();
      const mockCreateSubidentity = vi.fn().mockResolvedValue({
        success: true,
        identity: {
          ...mockDAOIdentity,
          did: 'did:key:new_identity',
          name: 'Test DAO Identity'
        }
      });

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: mockCreateSubidentity,
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 1,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 0,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 1,
          withKYC: 1
        }))
      });

      render(
        <TestWrapper>
          <SubidentityCreationWizard
            open={true}
            onClose={vi.fn()}
            onIdentityCreated={vi.fn()}
          />
        </TestWrapper>
      );

      // Step 1: Select identity type
      expect(screen.getByText('Select Identity Type')).toBeInTheDocument();
      
      const daoTypeButton = screen.getByRole('button', { name: /dao/i });
      await user.click(daoTypeButton);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Basic information
      await waitFor(() => {
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test DAO Identity');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test DAO for governance');

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Governance setup
      await waitFor(() => {
        expect(screen.getByText('Governance Setup')).toBeInTheDocument();
      });

      // Mock DAO selection
      const daoSelect = screen.getByRole('combobox');
      await user.click(daoSelect);
      
      // Select a mock DAO
      const daoOption = screen.getByText(/test dao/i);
      await user.click(daoOption);

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Privacy configuration
      await waitFor(() => {
        expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
      });

      // Select privacy level
      const privacySelect = screen.getByRole('combobox');
      await user.click(privacySelect);
      
      const daoOnlyOption = screen.getByText(/dao only/i);
      await user.click(daoOnlyOption);

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 5: Review and confirm
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      expect(screen.getByText('Test DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Test DAO for governance')).toBeInTheDocument();

      const createButton = screen.getByRole('button', { name: /create identity/i });
      await user.click(createButton);

      // Verify creation was called
      await waitFor(() => {
        expect(mockCreateSubidentity).toHaveBeenCalledWith(
          IdentityType.DAO,
          expect.objectContaining({
            name: 'Test DAO Identity',
            description: 'Test DAO for governance'
          })
        );
      });
    });

    it('should validate required fields in creation wizard', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubidentityCreationWizard
            open={true}
            onClose={vi.fn()}
            onIdentityCreated={vi.fn()}
          />
        </TestWrapper>
      );

      // Try to proceed without selecting type
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should show validation error
      expect(screen.getByText(/please select an identity type/i)).toBeInTheDocument();
    });
  });

  describe('Identity Switching System', () => {
    it('should update context when identity is switched', async () => {
      const user = userEvent.setup();
      const mockSwitchIdentity = vi.fn().mockResolvedValue({ success: true });
      const onIdentitySwitch = vi.fn();

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, mockDAOIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: mockSwitchIdentity,
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 2,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 1,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 2,
          withKYC: 2
        }))
      });

      render(
        <TestWrapper>
          <IdentitySwitcher 
            mode="dropdown"
            onIdentitySwitch={onIdentitySwitch}
          />
        </TestWrapper>
      );

      // Open dropdown and switch identity
      const switcher = screen.getByRole('button');
      await user.click(switcher);

      await waitFor(() => {
        const daoOption = screen.getByText('DAO Identity');
        expect(daoOption).toBeInTheDocument();
      });

      const daoOption = screen.getByText('DAO Identity');
      await user.click(daoOption);

      // Verify callbacks were called
      expect(mockSwitchIdentity).toHaveBeenCalledWith(mockDAOIdentity.did);
      
      await waitFor(() => {
        expect(onIdentitySwitch).toHaveBeenCalledWith(mockDAOIdentity);
      });
    });

    it('should show loading state during identity switch', async () => {
      const user = userEvent.setup();
      const mockSwitchIdentity = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, mockDAOIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: mockSwitchIdentity,
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 2,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 1,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 2,
          withKYC: 2
        }))
      });

      render(
        <TestWrapper>
          <IdentitySwitcher mode="dropdown" />
        </TestWrapper>
      );

      // Open dropdown and initiate switch
      const switcher = screen.getByRole('button');
      await user.click(switcher);

      const daoOption = screen.getByText('DAO Identity');
      await user.click(daoOption);

      // Should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for switch to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when identity creation fails', async () => {
      const user = userEvent.setup();
      const mockCreateSubidentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create identity: Insufficient permissions'
      });

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: mockCreateSubidentity,
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 1,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 0,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 1,
          withKYC: 1
        }))
      });

      render(
        <TestWrapper>
          <SubidentityCreationWizard
            open={true}
            onClose={vi.fn()}
            onIdentityCreated={vi.fn()}
          />
        </TestWrapper>
      );

      // Complete the wizard quickly
      const daoTypeButton = screen.getByRole('button', { name: /dao/i });
      await user.click(daoTypeButton);
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Fill basic info
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Identity');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Skip to final step
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Try to create
      const createButton = screen.getByRole('button', { name: /create identity/i });
      await user.click(createButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create identity/i)).toBeInTheDocument();
      });
    });

    it('should display error message when identity switching fails', async () => {
      const user = userEvent.setup();
      const mockSwitchIdentity = vi.fn().mockResolvedValue({
        success: false,
        error: 'Identity switch failed: Network error'
      });

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, mockDAOIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: mockSwitchIdentity,
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 2,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 1,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 2,
          withKYC: 2
        }))
      });

      render(
        <TestWrapper>
          <IdentitySwitcher mode="dropdown" />
        </TestWrapper>
      );

      // Try to switch identity
      const switcher = screen.getByRole('button');
      await user.click(switcher);

      const daoOption = screen.getByText('DAO Identity');
      await user.click(daoOption);

      // Should show error toast
      await waitFor(() => {
        expect(screen.getByText(/switch failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security and Audit Features', () => {
    it('should display security badges for verified identities', async () => {
      render(
        <TestWrapper>
          <IdentitySwitcher 
            mode="grid"
            showSecurityBadges={true}
          />
        </TestWrapper>
      );

      // Should show KYC badge for verified identities
      expect(screen.getByText(/kyc/i)).toBeInTheDocument();
    });

    it('should show security alerts for flagged identities', async () => {
      const flaggedIdentity = {
        ...mockDAOIdentity,
        securityFlags: [
          {
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            message: 'Unusual login pattern detected',
            timestamp: '2024-02-08T00:00:00Z'
          }
        ]
      };

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, flaggedIdentity],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 2,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 1,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 2,
          withKYC: 2
        }))
      });

      render(
        <TestWrapper>
          <IdentitySwitcher 
            mode="grid"
            showSecurityBadges={true}
          />
        </TestWrapper>
      );

      // Should show security alert badge
      expect(screen.getByText(/1 alert/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading state while identities are being fetched', async () => {
      mockUseIdentityManager.mockReturnValue({
        identities: [],
        activeIdentity: null,
        loading: true,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 0,
          byType: {
            [IdentityType.ROOT]: 0,
            [IdentityType.DAO]: 0,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 0,
          withKYC: 0
        }))
      });

      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      // Should show loading skeleton
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should handle large numbers of identities efficiently', async () => {
      const manyIdentities = Array.from({ length: 50 }, (_, i) => ({
        ...mockDAOIdentity,
        did: `did:key:identity_${i}`,
        name: `Identity ${i}`
      }));

      mockUseIdentityManager.mockReturnValue({
        identities: [mockRootIdentity, ...manyIdentities],
        activeIdentity: mockRootIdentity,
        loading: false,
        error: null,
        createSubidentity: vi.fn(),
        switchIdentity: vi.fn(),
        deleteIdentity: vi.fn(),
        clearError: vi.fn(),
        refreshIdentities: vi.fn(),
        getIdentityStats: vi.fn(() => ({
          total: 51,
          byType: {
            [IdentityType.ROOT]: 1,
            [IdentityType.DAO]: 50,
            [IdentityType.ENTERPRISE]: 0,
            [IdentityType.CONSENTIDA]: 0,
            [IdentityType.AID]: 0
          },
          active: 51,
          withKYC: 51
        }))
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <IdentityManagement />
        </TestWrapper>
      );

      const endTime = performance.now();
      
      // Should render within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should display correct total
      expect(screen.getByText('51')).toBeInTheDocument();
    });
  });
});