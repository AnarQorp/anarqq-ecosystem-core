/**
 * Tests for IdentityTypeSelectionStep Component
 * Requirements: 2.2, 2.11, 2.12, 2.13, 2.14
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityTypeSelectionStep } from '../IdentityTypeSelectionStep';
import { IdentityType, ExtendedSquidIdentity, PrivacyLevel, GovernanceType } from '@/types/identity';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building2-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  UserCheck: () => <div data-testid="user-check-icon" />,
  FileText: () => <div data-testid="file-text-icon" />
}));

// Mock active identity
const mockRootIdentity: ExtendedSquidIdentity = {
  did: 'did:example:root123',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:example:root123',
  children: [],
  depth: 0,
  path: [],
  governanceLevel: GovernanceType.SELF,
  creationRules: {
    type: IdentityType.ROOT,
    requiresKYC: false,
    requiresDAOGovernance: false,
    requiresParentalConsent: false,
    maxDepth: 5,
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
  status: 'ACTIVE' as any,
  qonsentProfileId: 'qonsent123',
  qlockKeyPair: {
    publicKey: 'pub123',
    privateKey: 'priv123',
    algorithm: 'RSA',
    keySize: 2048,
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
  qindexRegistered: true
};

const mockDAOIdentity: ExtendedSquidIdentity = {
  ...mockRootIdentity,
  did: 'did:example:dao123',
  name: 'DAO Identity',
  type: IdentityType.DAO,
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    ...mockRootIdentity.creationRules,
    type: IdentityType.DAO,
    requiresKYC: true,
    requiresDAOGovernance: true,
    allowedChildTypes: [IdentityType.ENTERPRISE]
  }
};

describe('IdentityTypeSelectionStep', () => {
  const mockOnTypeSelect = vi.fn();
  const defaultProps = {
    availableTypes: [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID],
    selectedType: null,
    onTypeSelect: mockOnTypeSelect,
    validationErrors: [],
    activeIdentity: mockRootIdentity
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with header and description', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Choose Your Identity Type')).toBeInTheDocument();
      expect(screen.getByText(/Select the type of identity that best fits your needs/)).toBeInTheDocument();
    });

    it('renders all available identity types as cards', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Identity')).toBeInTheDocument();
      expect(screen.getByText('Consentida Identity')).toBeInTheDocument();
      expect(screen.getByText('Anonymous Identity (AID)')).toBeInTheDocument();
    });

    it('displays correct icons for each identity type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getAllByTestId('users-icon')).toHaveLength(5); // DAO icon appears multiple times (header + badges)
      expect(screen.getByTestId('building2-icon')).toBeInTheDocument(); // Enterprise
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument(); // Consentida
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument(); // AID
    });

    it('shows help text at the bottom', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Need help choosing?')).toBeInTheDocument();
      expect(screen.getByText(/For community participation and governance/)).toBeInTheDocument();
    });
  });

  describe('Identity Type Information', () => {
    it('displays correct governance and privacy badges for DAO type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      const daoCard = screen.getByRole('button', { name: /Select DAO Identity identity type/i });
      expect(daoCard).toBeInTheDocument();
      
      // Check for PUBLIC visibility badge - DAO and Enterprise both have PUBLIC visibility
      const publicBadges = screen.getAllByText('PUBLIC');
      expect(publicBadges.length).toBeGreaterThanOrEqual(2);
      // Check for DAO Governed badge - there are multiple, so use getAllByText
      expect(screen.getAllByText('DAO Governed')).toHaveLength(2);
      // Check for KYC Required badge - DAO and AID both require KYC
      const kycBadges = screen.getAllByText('KYC Required');
      expect(kycBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('displays correct information for Enterprise type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Business and Professional Use')).toBeInTheDocument();
      expect(screen.getByText(/Create a professional identity for business activities/)).toBeInTheDocument();
    });

    it('displays correct information for Consentida type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Protected Minor Identity')).toBeInTheDocument();
      expect(screen.getByText(/Create a protected identity for minors/)).toBeInTheDocument();
    });

    it('displays correct information for AID type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Anonymous and Private')).toBeInTheDocument();
      expect(screen.getByText(/Create a completely anonymous identity/)).toBeInTheDocument();
    });
  });

  describe('Selection Behavior', () => {
    it('calls onTypeSelect when a type is clicked', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      const daoCard = screen.getByText('DAO Identity').closest('[role="button"], .cursor-pointer');
      fireEvent.click(daoCard!);
      
      expect(mockOnTypeSelect).toHaveBeenCalledWith(IdentityType.DAO);
    });

    it('highlights selected type with visual indicators', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.DAO}
      />);
      
      const daoCard = screen.getByRole('button', { name: /Select DAO Identity identity type/i });
      expect(daoCard).toHaveClass('ring-2', 'ring-primary', 'border-primary');
      
      // Check for checkmark icon in the selected card header
      const checkmarkInHeader = daoCard.querySelector('[data-testid="check-circle-icon"]');
      expect(checkmarkInHeader).toBeInTheDocument();
    });

    it('shows expanded information when type is selected', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.DAO}
      />);
      
      // Should show use cases and limitations when selected
      expect(screen.getByText('Common Use Cases')).toBeInTheDocument();
      expect(screen.getByText('Limitations')).toBeInTheDocument();
      expect(screen.getByText('DAO member participation')).toBeInTheDocument();
    });

    it('allows switching between different types', () => {
      const { rerender } = render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.DAO}
      />);
      
      // Initially DAO is selected - check for checkmark in the selected card
      const daoCard = screen.getByRole('button', { name: /Select DAO Identity identity type/i });
      const checkmarkInDAO = daoCard.querySelector('[data-testid="check-circle-icon"]');
      expect(checkmarkInDAO).toBeInTheDocument();
      
      // Click on Enterprise
      const enterpriseCard = screen.getByRole('button', { name: /Select Enterprise Identity identity type/i });
      fireEvent.click(enterpriseCard);
      
      expect(mockOnTypeSelect).toHaveBeenCalledWith(IdentityType.ENTERPRISE);
      
      // Rerender with Enterprise selected
      rerender(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.ENTERPRISE}
      />);
      
      const enterpriseCardSelected = screen.getByRole('button', { name: /Select Enterprise Identity identity type/i });
      expect(enterpriseCardSelected).toHaveClass('ring-2', 'ring-primary');
    });
  });

  describe('Validation Errors', () => {
    it('displays validation errors when provided', () => {
      const validationErrors = ['Please select an identity type', 'Invalid selection'];
      
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        validationErrors={validationErrors}
      />);
      
      expect(screen.getByText('Please select an identity type')).toBeInTheDocument();
      expect(screen.getByText('Invalid selection')).toBeInTheDocument();
      // Check for alert triangle icon in the validation error alert (first one)
      const errorAlerts = screen.getAllByRole('alert');
      const errorAlert = errorAlerts.find(alert => alert.textContent?.includes('Please select an identity type'));
      expect(errorAlert).toBeInTheDocument();
      const alertTriangleInError = errorAlert?.querySelector('[data-testid="alert-triangle-icon"]');
      expect(alertTriangleInError).toBeInTheDocument();
    });

    it('does not show validation errors section when no errors', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      // Should not have destructive alert
      expect(screen.queryByRole('alert')).not.toHaveClass('destructive');
    });
  });

  describe('No Available Types', () => {
    it('shows appropriate message when no types are available', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        availableTypes={[]}
      />);
      
      expect(screen.getByText('No Identity Types Available')).toBeInTheDocument();
      expect(screen.getByText(/Your current identity type \(ROOT\) cannot create sub-identities/)).toBeInTheDocument();
      expect(screen.getByText(/Only ROOT and DAO identities can create sub-identities/)).toBeInTheDocument();
    });

    it('shows correct identity type in no available types message', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        availableTypes={[]}
        activeIdentity={mockDAOIdentity}
      />);
      
      expect(screen.getByText(/Your current identity type \(DAO\) cannot create sub-identities/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      const cards = screen.getAllByRole('button');
      expect(cards.length).toBe(4); // Should have 4 identity type cards
      
      // Each card should have proper accessibility attributes
      cards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', '0');
        expect(card).toHaveAttribute('aria-pressed');
        expect(card).toHaveAttribute('aria-label');
      });
    });

    it('supports keyboard navigation', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      const daoCard = screen.getByRole('button', { name: /Select DAO Identity identity type/i });
      
      // Should be focusable
      daoCard.focus();
      expect(document.activeElement).toBe(daoCard);
      
      // Should respond to Enter key
      fireEvent.keyDown(daoCard, { key: 'Enter' });
      expect(mockOnTypeSelect).toHaveBeenCalledWith(IdentityType.DAO);
    });
  });

  describe('Responsive Design', () => {
    it('renders cards in a responsive grid layout', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      const gridContainer = screen.getByText('DAO Identity').closest('.grid');
      expect(gridContainer).toHaveClass('grid', 'gap-4');
    });

    it('handles long content gracefully', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      // Check that descriptions are properly contained
      const descriptions = screen.getAllByText(/Create a/);
      descriptions.forEach(desc => {
        expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
      });
    });
  });

  describe('Identity Type Rules Integration', () => {
    it('correctly displays KYC requirements based on type rules', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      // DAO and AID should show KYC Required
      const kycBadges = screen.getAllByText('KYC Required');
      expect(kycBadges.length).toBeGreaterThan(0);
    });

    it('correctly displays governance information', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getAllByText('DAO Governed')).toHaveLength(2); // DAO and Enterprise both have DAO governance
      expect(screen.getByText('PARENT Governed')).toBeInTheDocument();
      expect(screen.getByText('SELF Governed')).toBeInTheDocument();
    });

    it('shows sub-identity creation capability correctly', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      // DAO should show "Can Create Sub-IDs"
      expect(screen.getByText('Can Create Sub-IDs')).toBeInTheDocument();
    });
  });

  describe('Content Accuracy', () => {
    it('displays accurate feature lists for each type', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.DAO}
      />);
      
      expect(screen.getByText('Public visibility for transparency')).toBeInTheDocument();
      expect(screen.getByText('DAO governance and voting rights')).toBeInTheDocument();
      expect(screen.getByText('Can create Enterprise sub-identities')).toBeInTheDocument();
    });

    it('displays accurate requirements for each type', () => {
      render(<IdentityTypeSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('KYC verification required')).toBeInTheDocument();
      expect(screen.getByText('DAO governance approval needed')).toBeInTheDocument();
      expect(screen.getByText('Parental consent required')).toBeInTheDocument();
    });

    it('shows correct use cases when type is selected', () => {
      render(<IdentityTypeSelectionStep 
        {...defaultProps} 
        selectedType={IdentityType.CONSENTIDA}
      />);
      
      expect(screen.getByText('Educational activities')).toBeInTheDocument();
      expect(screen.getByText('Safe social interaction')).toBeInTheDocument();
      expect(screen.getByText('Family communication')).toBeInTheDocument();
    });
  });
});