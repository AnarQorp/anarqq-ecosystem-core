/**
 * ReviewAndConfirmationStep Component Tests
 * Tests for the final review and confirmation step of the identity creation wizard
 * Requirements: 2.7, 2.8, 2.9, 2.10
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReviewAndConfirmationStep } from '../ReviewAndConfirmationStep';
import { IdentityType, PrivacyLevel, ExtendedSquidIdentity, SubidentityMetadata } from '@/types/identity';
import { useToast } from '@/hooks/use-toast';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText
  }
});

// Mock window.open
Object.assign(window, {
  open: vi.fn()
});

describe('ReviewAndConfirmationStep', () => {
  const mockToast = vi.fn();
  const mockOnSubmit = vi.fn();

  // Mock active identity
  const mockActiveIdentity: ExtendedSquidIdentity = {
    did: 'did:squid:root123',
    name: 'Test Root Identity',
    type: IdentityType.ROOT,
    rootId: 'did:squid:root123',
    children: [],
    depth: 0,
    path: [],
    governanceLevel: 'SELF' as any,
    creationRules: {} as any,
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: () => true,
      canPerformAction: () => true,
      governanceLevel: 'SELF' as any
    },
    status: 'ACTIVE' as any,
    qonsentProfileId: 'qonsent-123',
    qlockKeyPair: {} as any,
    privacyLevel: PrivacyLevel.PUBLIC,
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastUsed: '2024-01-01T00:00:00Z',
    kyc: {
      required: false,
      submitted: true,
      approved: true,
      level: 'BASIC'
    },
    auditLog: [],
    securityFlags: [],
    qindexRegistered: true
  };

  // Mock form data for different identity types
  const mockDAOFormData: Partial<SubidentityMetadata> = {
    name: 'Test DAO Identity',
    description: 'A test DAO identity for governance',
    type: IdentityType.DAO,
    tags: ['dao', 'governance', 'test'],
    privacyLevel: PrivacyLevel.PUBLIC,
    governanceConfig: {
      daoId: 'dao-tech-collective'
    },
    qonsentConfig: {
      identityId: '',
      profileId: 'qonsent-dao-123',
      privacyLevel: PrivacyLevel.PUBLIC,
      dataSharing: {
        qsocial: { enabled: true, level: 'FULL', restrictions: [] },
        qwallet: { enabled: true, level: 'STANDARD', restrictions: [] }
      },
      visibilityRules: {
        profile: PrivacyLevel.PUBLIC,
        activity: PrivacyLevel.DAO_ONLY,
        connections: PrivacyLevel.DAO_ONLY
      },
      consentHistory: [],
      lastUpdated: '2024-01-01T00:00:00Z'
    }
  };

  const mockConsentidaFormData: Partial<SubidentityMetadata> = {
    name: 'Test Consentida Identity',
    description: 'A test identity for a minor',
    type: IdentityType.CONSENTIDA,
    tags: ['minor', 'protected'],
    privacyLevel: PrivacyLevel.PRIVATE,
    governanceConfig: {
      parentalConsent: {
        guardianName: 'John Doe',
        guardianEmail: 'john.doe@example.com',
        guardianPhone: '+1-555-123-4567',
        relationship: 'PARENT',
        consentStatement: 'I consent to the creation of this identity',
        signatureMethod: 'EMAIL',
        consentDate: '2024-01-01T00:00:00Z',
        isVerified: true
      }
    },
    qonsentConfig: {
      identityId: '',
      profileId: 'qonsent-consentida-123',
      privacyLevel: PrivacyLevel.PRIVATE,
      dataSharing: {
        qmail: { enabled: true, level: 'MINIMAL', restrictions: ['external_contacts'] },
        qsocial: { enabled: false, level: 'MINIMAL', restrictions: ['all'] }
      },
      visibilityRules: {
        profile: PrivacyLevel.PRIVATE,
        activity: PrivacyLevel.PRIVATE,
        connections: PrivacyLevel.PRIVATE
      },
      consentHistory: [],
      lastUpdated: '2024-01-01T00:00:00Z'
    }
  };

  const defaultProps = {
    selectedType: IdentityType.DAO,
    formData: mockDAOFormData,
    validationErrors: {},
    isSubmitting: false,
    activeIdentity: mockActiveIdentity,
    onSubmit: mockOnSubmit
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockClear();
    mockWriteText.mockResolvedValue(undefined);
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders the review step with correct title and description', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      expect(screen.getByText(/Please review all settings before creating your dao identity/i)).toBeInTheDocument();
    });

    it('displays the correct identity type badge and icon', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Identity Type & Basic Information')).toBeInTheDocument();
    });

    it('shows all form data in review sections', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      // Basic information
      expect(screen.getByText('Test DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('A test DAO identity for governance')).toBeInTheDocument();
      expect(screen.getByText('dao')).toBeInTheDocument();
      expect(screen.getByText('governance')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      
      // Governance
      expect(screen.getByText('Governance Configuration')).toBeInTheDocument();
      expect(screen.getByText('DAO Governed')).toBeInTheDocument();
      expect(screen.getByText('dao-tech-collective')).toBeInTheDocument();
      
      // Privacy
      expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('renders requirements and compliance section', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Requirements & Compliance')).toBeInTheDocument();
      expect(screen.getByText('KYC Required')).toBeInTheDocument();
      expect(screen.getByText('Can Create Sub-identities')).toBeInTheDocument();
      expect(screen.getByText('Default Visibility')).toBeInTheDocument();
      expect(screen.getByText('Governance Model')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows validation success when all checks pass', async () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('All validation checks passed. Ready to create identity.')).toBeInTheDocument();
      });
    });

    it('shows validation errors when required fields are missing', async () => {
      const incompleteFormData = {
        ...mockDAOFormData,
        name: '', // Missing required name
        qonsentConfig: undefined // Missing qonsent config
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          formData={incompleteFormData}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
        expect(screen.getByText(/Identity name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Privacy profile configuration is incomplete/)).toBeInTheDocument();
      });
    });

    it('shows KYC validation error when required but not approved', async () => {
      const identityWithoutKYC = {
        ...mockActiveIdentity,
        kyc: {
          required: true,
          submitted: false,
          approved: false
        }
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          activeIdentity={identityWithoutKYC}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/KYC verification is required for this identity type/)).toBeInTheDocument();
      });
    });

    it('shows governance validation error when DAO is required but not provided', async () => {
      const formDataWithoutDAO = {
        ...mockDAOFormData,
        governanceConfig: undefined
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          formData={formDataWithoutDAO}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/DAO governance is required for this identity type/)).toBeInTheDocument();
      });
    });

    it('shows parental consent validation error for Consentida identity', async () => {
      const formDataWithoutConsent = {
        ...mockConsentidaFormData,
        governanceConfig: {
          parentalConsent: {
            guardianName: 'John Doe',
            guardianEmail: 'john.doe@example.com',
            relationship: 'PARENT',
            consentStatement: 'I consent',
            signatureMethod: 'EMAIL',
            isVerified: false
            // Missing consentDate
          }
        }
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
          formData={formDataWithoutConsent}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Parental consent must be collected before creating this identity/)).toBeInTheDocument();
      });
    });
  });

  describe('Parental Consent Display', () => {
    it('displays parental consent information for Consentida identity', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
          formData={mockConsentidaFormData}
        />
      );
      
      expect(screen.getByText('Parental Control')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-123-4567')).toBeInTheDocument();
      expect(screen.getAllByText('PARENT')).toHaveLength(2); // One in detail row, one in badge
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('shows pending status when consent is not verified', () => {
      const formDataWithPendingConsent = {
        ...mockConsentidaFormData,
        governanceConfig: {
          parentalConsent: {
            ...mockConsentidaFormData.governanceConfig!.parentalConsent!,
            isVerified: false,
            consentDate: undefined
          }
        }
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
          formData={formDataWithPendingConsent}
        />
      );
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onSubmit when create button is clicked and validation passes', async () => {
      const user = userEvent.setup();
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('All validation checks passed. Ready to create identity.')).toBeInTheDocument();
      });
      
      const createButton = screen.getByRole('button', { name: /create identity/i });
      await user.click(createButton);
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('does not call onSubmit when validation fails', async () => {
      const user = userEvent.setup();
      const incompleteFormData = {
        ...mockDAOFormData,
        name: ''
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          formData={incompleteFormData}
        />
      );
      
      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
      });
      
      const createButton = screen.getByRole('button', { name: /create identity/i });
      expect(createButton).toBeDisabled();
      
      await user.click(createButton);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows loading state when submitting', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          isSubmitting={true}
        />
      );
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    it('renders copy configuration button', async () => {
      const user = userEvent.setup();
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      const copyButton = screen.getByRole('button', { name: /copy configuration/i });
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).not.toBeDisabled();
    });

    it('disables copy button when submitting', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          isSubmitting={true}
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy configuration/i });
      expect(copyButton).toBeDisabled();
    });

    it('opens documentation when view documentation button is clicked', async () => {
      const user = userEvent.setup();
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      const docButton = screen.getByRole('button', { name: /view documentation/i });
      await user.click(docButton);
      
      expect(window.open).toHaveBeenCalledWith('/docs/identity-creation', '_blank');
    });
  });

  describe('Privacy Level Display', () => {
    it('displays correct privacy level badge and description', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('displays private privacy level for Consentida identity', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
          formData={mockConsentidaFormData}
        />
      );
      
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  describe('Data Sharing Display', () => {
    it('displays enabled data sharing modules', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByText('qsocial')).toBeInTheDocument();
      expect(screen.getByText('qwallet')).toBeInTheDocument();
    });

    it('shows restricted modules for Consentida identity', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
          formData={mockConsentidaFormData}
        />
      );
      
      expect(screen.getByText('qmail')).toBeInTheDocument();
      // qsocial should not be shown as it's disabled
      expect(screen.queryByText('qsocial')).not.toBeInTheDocument();
    });
  });

  describe('Validation Errors Display', () => {
    it('displays validation errors in appropriate sections', () => {
      const validationErrors = {
        name: ['Name is required'],
        governance: ['DAO selection is required'],
        qonsent: ['Privacy configuration is incomplete']
      };

      const { container } = render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          validationErrors={validationErrors}
        />
      );
      
      // Should show error indicators in section headers - using class selector instead of test-id
      const alertTriangles = container.querySelectorAll('.lucide-alert-triangle');
      expect(alertTriangles.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ReviewAndConfirmationStep {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /create identity/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view documentation/i })).toBeInTheDocument();
    });

    it('properly disables buttons when submitting', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          isSubmitting={true}
        />
      );
      
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /copy configuration/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /view documentation/i })).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing form data gracefully', () => {
      const emptyFormData = {};

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          formData={emptyFormData}
        />
      );
      
      expect(screen.getByText('Not specified')).toBeInTheDocument();
      expect(screen.getAllByText('Not configured')).toHaveLength(2); // Multiple "Not configured" texts
    });

    it('handles missing active identity', () => {
      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          activeIdentity={null}
        />
      );
      
      expect(screen.getByText('Current Identity')).toBeInTheDocument();
    });

    it('handles missing privacy configuration', () => {
      const formDataWithoutPrivacy = {
        ...mockDAOFormData,
        privacyLevel: undefined,
        qonsentConfig: undefined
      };

      render(
        <ReviewAndConfirmationStep 
          {...defaultProps} 
          formData={formDataWithoutPrivacy}
        />
      );
      
      expect(screen.getAllByText('Not configured')).toHaveLength(2); // Multiple "Not configured" texts
    });
  });
});