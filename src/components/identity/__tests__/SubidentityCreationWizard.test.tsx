/**
 * Tests for SubidentityCreationWizard Component
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 3.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubidentityCreationWizard, WizardStep } from '../SubidentityCreationWizard';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useToast } from '@/hooks/use-toast';
import { IdentityType, GovernanceType, PrivacyLevel, IdentityStatus } from '@/types/identity';

// Mock the hooks
vi.mock('@/hooks/useActiveIdentity');
vi.mock('@/hooks/useIdentityManager');
vi.mock('@/hooks/use-toast');

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div className="card-title">{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant} ${size}`}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={`progress ${className}`} data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
  )
}));

// Mock wizard step components
vi.mock('../IdentityTypeSelectionStep', () => ({
  IdentityTypeSelectionStep: ({ availableTypes, selectedType, onTypeSelect, validationErrors }: any) => (
    <div data-testid="type-selection-step">
      <h3>Select Identity Type</h3>
      {validationErrors?.length > 0 && (
        <div data-testid="validation-errors">
          {validationErrors.map((error: string, index: number) => (
            <div key={index} className="error">{error}</div>
          ))}
        </div>
      )}
      <div>
        {availableTypes.map((type: IdentityType) => (
          <button
            key={type}
            onClick={() => onTypeSelect(type)}
            className={selectedType === type ? 'selected' : ''}
            data-testid={`type-${type}`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}));

vi.mock('../BasicInformationStep', () => ({
  BasicInformationStep: ({ selectedType, formData, onFormDataChange, validationErrors, isSubmitting }: any) => (
    <div data-testid="basic-info-step">
      <h3>Basic Information for {selectedType}</h3>
      {Object.keys(validationErrors).length > 0 && (
        <div data-testid="validation-errors">
          {Object.entries(validationErrors).map(([field, errors]: [string, any]) => (
            <div key={field}>
              {errors.map((error: string, index: number) => (
                <div key={index} className="error">{error}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <input
        data-testid="name-input"
        value={formData.name || ''}
        onChange={(e) => onFormDataChange({ name: e.target.value })}
        disabled={isSubmitting}
        placeholder="Identity name"
      />
      <textarea
        data-testid="description-input"
        value={formData.description || ''}
        onChange={(e) => onFormDataChange({ description: e.target.value })}
        disabled={isSubmitting}
        placeholder="Description"
      />
    </div>
  )
}));

vi.mock('../GovernanceSetupStep', () => ({
  GovernanceSetupStep: ({ selectedType, formData, onFormDataChange, validationErrors, isSubmitting }: any) => (
    <div data-testid="governance-step">
      <h3>Governance Setup for {selectedType}</h3>
      {Object.keys(validationErrors).length > 0 && (
        <div data-testid="validation-errors">
          {Object.entries(validationErrors).map(([field, errors]: [string, any]) => (
            <div key={field}>
              {errors.map((error: string, index: number) => (
                <div key={index} className="error">{error}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div>Governance configuration for {selectedType}</div>
    </div>
  )
}));

vi.mock('../PrivacyConfigurationStep', () => ({
  PrivacyConfigurationStep: ({ selectedType, formData, onFormDataChange, validationErrors, isSubmitting }: any) => (
    <div data-testid="privacy-step">
      <h3>Privacy Configuration for {selectedType}</h3>
      {Object.keys(validationErrors).length > 0 && (
        <div data-testid="validation-errors">
          {Object.entries(validationErrors).map(([field, errors]: [string, any]) => (
            <div key={field}>
              {errors.map((error: string, index: number) => (
                <div key={index} className="error">{error}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <select
        data-testid="privacy-level-select"
        value={formData.privacyLevel || ''}
        onChange={(e) => onFormDataChange({ privacyLevel: e.target.value })}
        disabled={isSubmitting}
      >
        <option value="">Select privacy level</option>
        <option value={PrivacyLevel.PUBLIC}>Public</option>
        <option value={PrivacyLevel.PRIVATE}>Private</option>
        <option value={PrivacyLevel.DAO_ONLY}>DAO Only</option>
        <option value={PrivacyLevel.ANONYMOUS}>Anonymous</option>
      </select>
    </div>
  )
}));

vi.mock('../ReviewAndConfirmationStep', () => ({
  ReviewAndConfirmationStep: ({ selectedType, formData, validationErrors, isSubmitting, onSubmit }: any) => (
    <div data-testid="review-step">
      <h3>Review & Confirm {selectedType}</h3>
      {Object.keys(validationErrors).length > 0 && (
        <div data-testid="validation-errors">
          {Object.entries(validationErrors).map(([field, errors]: [string, any]) => (
            <div key={field}>
              {errors.map((error: string, index: number) => (
                <div key={index} className="error">{error}</div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div>
        <p>Name: {formData.name}</p>
        <p>Description: {formData.description}</p>
        <p>Privacy Level: {formData.privacyLevel}</p>
      </div>
      <button
        data-testid="create-button"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating...' : 'Create Identity'}
      </button>
    </div>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />
}));

const mockActiveIdentity = {
  did: 'did:squid:root-123',
  name: 'Root Identity',
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
  qonsentProfileId: 'qonsent-root-123',
  qlockKeyPair: {
    publicKey: 'pub-root-123',
    privateKey: 'priv-root-123',
    algorithm: 'ECDSA' as const,
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
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

describe('SubidentityCreationWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnIdentityCreated = vi.fn();
  const mockCreateSubidentity = vi.fn();
  const mockToast = vi.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onIdentityCreated: mockOnIdentityCreated
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useActiveIdentity as any).mockReturnValue({
      identity: mockActiveIdentity
    });

    (useIdentityManager as any).mockReturnValue({
      createSubidentity: mockCreateSubidentity
    });

    (useToast as any).mockReturnValue({
      toast: mockToast
    });
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(<SubidentityCreationWizard {...defaultProps} open={false} />);
      
      expect(screen.queryByText('Select Identity Type')).not.toBeInTheDocument();
    });

    it('should render wizard when open', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Select Identity Type')).toBeInTheDocument();
      expect(screen.getByText('Choose the type of identity you want to create')).toBeInTheDocument();
    });

    it('should show progress bar with correct initial value', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const progress = document.querySelector('.progress');
      expect(progress).toHaveAttribute('data-value', '20');
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('20% Complete')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should disable Previous button on first step', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('should disable Next button when no type is selected', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when type is selected', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Select a type
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('should navigate to next step when Next is clicked', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Select a type
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      // Click Next
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
        expect(screen.getByText('Basic Information for DAO')).toBeInTheDocument();
      });
    });

    it('should navigate to previous step when Previous is clicked', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to step 2
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      // Go back to step 1
      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('type-selection-step')).toBeInTheDocument();
      });
    });

    it('should update progress bar as user navigates', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Select type and go to next step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const progress = document.querySelector('.progress');
        expect(progress).toHaveAttribute('data-value', '40');
        expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
        expect(screen.getByText('40% Complete')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for type selection', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Try to proceed without selecting a type
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Should still be on first step and show error
      expect(screen.getByTestId('type-selection-step')).toBeInTheDocument();
    });

    it('should validate basic information step', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to basic info step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      let nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      // Try to proceed without entering name
      nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Identity name is required')).toBeInTheDocument();
      });
    });

    it('should validate name length and format', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to basic info step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      // Test short name
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'a' } });
      
      const nextBtn = screen.getByText('Next');
      fireEvent.click(nextBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters long')).toBeInTheDocument();
      });
      
      // Test long name
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });
      fireEvent.click(nextBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Name must be 50 characters or less')).toBeInTheDocument();
      });
      
      // Test invalid characters
      fireEvent.change(nameInput, { target: { value: 'invalid@name!' } });
      fireEvent.click(nextBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Name can only contain letters, numbers, spaces, hyphens, underscores, and periods')).toBeInTheDocument();
      });
    });

    it('should validate description length', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to basic info step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      // Enter valid name and long description
      const nameInput = screen.getByTestId('name-input');
      const descriptionInput = screen.getByTestId('description-input');
      
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(501) } });
      
      const nextBtn = screen.getByText('Next');
      fireEvent.click(nextBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Description must be 500 characters or less')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Wizard Flow', () => {
    it('should complete full wizard flow successfully', async () => {
      mockCreateSubidentity.mockResolvedValue({
        success: true,
        identity: {
          ...mockActiveIdentity,
          did: 'did:squid:dao-456',
          name: 'Test DAO Identity',
          type: IdentityType.DAO
        }
      });

      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Step 1: Select type
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      let nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Step 2: Basic info
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      const descriptionInput = screen.getByTestId('description-input');
      
      fireEvent.change(nameInput, { target: { value: 'Test DAO Identity' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      
      nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Step 3: Governance
      await waitFor(() => {
        expect(screen.getByTestId('governance-step')).toBeInTheDocument();
      });
      
      nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Step 4: Privacy
      await waitFor(() => {
        expect(screen.getByTestId('privacy-step')).toBeInTheDocument();
      });
      
      const privacySelect = screen.getByTestId('privacy-level-select');
      fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
      
      nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      // Step 5: Review
      await waitFor(() => {
        expect(screen.getByTestId('review-step')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Name: Test DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('Description: Test description')).toBeInTheDocument();
      expect(screen.getByText(`Privacy Level: ${PrivacyLevel.PUBLIC}`)).toBeInTheDocument();
      
      // Create identity
      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockCreateSubidentity).toHaveBeenCalledWith(IdentityType.DAO, {
          name: 'Test DAO Identity',
          description: 'Test description',
          privacyLevel: PrivacyLevel.PUBLIC
        });
        
        expect(mockToast).toHaveBeenCalledWith({
          title: "Identity Created",
          description: 'Successfully created dao identity "Test DAO Identity".',
        });
        
        expect(mockOnIdentityCreated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle creation failure', async () => {
      mockCreateSubidentity.mockResolvedValue({
        success: false,
        error: 'Creation failed'
      });

      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to final step quickly
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      // Skip through steps with minimal data
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        
        if (i === 0) {
          // Add required name
          await waitFor(() => {
            const nameInput = screen.getByTestId('name-input');
            fireEvent.change(nameInput, { target: { value: 'Test Name' } });
          });
        }
        
        if (i === 2) {
          // Add required privacy level
          await waitFor(() => {
            const privacySelect = screen.getByTestId('privacy-level-select');
            fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
          });
        }
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('review-step')).toBeInTheDocument();
      });
      
      // Try to create
      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Creation Failed",
          description: "Creation failed",
          variant: "destructive"
        });
      });
    });
  });

  describe('Wizard Controls', () => {
    it('should close wizard when close button is clicked', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close wizard when cancel button is clicked', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show Create Identity button on final step', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to final step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      // Skip through all steps
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        
        if (i === 0) {
          await waitFor(() => {
            const nameInput = screen.getByTestId('name-input');
            fireEvent.change(nameInput, { target: { value: 'Test Name' } });
          });
        }
        
        if (i === 2) {
          await waitFor(() => {
            const privacySelect = screen.getByTestId('privacy-level-select');
            fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
          });
        }
      }
      
      await waitFor(() => {
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
        expect(screen.getByTestId('create-button')).toBeInTheDocument();
      });
    });

    it('should show loading state during creation', async () => {
      mockCreateSubidentity.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to final step quickly
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        
        if (i === 0) {
          await waitFor(() => {
            const nameInput = screen.getByTestId('name-input');
            fireEvent.change(nameInput, { target: { value: 'Test Name' } });
          });
        }
        
        if (i === 2) {
          await waitFor(() => {
            const privacySelect = screen.getByTestId('privacy-level-select');
            fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
          });
        }
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('review-step')).toBeInTheDocument();
      });
      
      // Click create
      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);
      
      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(createButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Check for progress indication
      const progress = document.querySelector('.progress');
      expect(progress).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      const nextButton = screen.getByText('Next');
      const cancelButton = screen.getByText('Cancel');
      
      // Buttons should be focusable
      nextButton.focus();
      expect(nextButton).toHaveFocus();
      
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
    });

    it('should announce validation errors to screen readers', async () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to basic info step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
      });
      
      // Try to proceed without name
      const nextBtn = screen.getByText('Next');
      fireEvent.click(nextBtn);
      
      await waitFor(() => {
        const errorElement = screen.getByText('Identity name is required');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('error');
      });
    });

    it('should provide clear step indicators', () => {
      render(<SubidentityCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('20% Complete')).toBeInTheDocument();
      expect(screen.getByText('Select Identity Type')).toBeInTheDocument();
      expect(screen.getByText('Choose the type of identity you want to create')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors during creation', async () => {
      mockCreateSubidentity.mockRejectedValue(new Error('Network error'));

      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to final step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        
        if (i === 0) {
          await waitFor(() => {
            const nameInput = screen.getByTestId('name-input');
            fireEvent.change(nameInput, { target: { value: 'Test Name' } });
          });
        }
        
        if (i === 2) {
          await waitFor(() => {
            const privacySelect = screen.getByTestId('privacy-level-select');
            fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
          });
        }
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('review-step')).toBeInTheDocument();
      });
      
      // Try to create
      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Unexpected Error",
          description: "An unexpected error occurred while creating the identity.",
          variant: "destructive"
        });
      });
    });

    it('should handle validation errors from server', async () => {
      mockCreateSubidentity.mockResolvedValue({
        success: false,
        error: 'Validation failed',
        validationErrors: ['Name already exists', 'Invalid configuration']
      });

      render(<SubidentityCreationWizard {...defaultProps} />);
      
      // Navigate to final step
      const daoButton = screen.getByTestId('type-DAO');
      fireEvent.click(daoButton);
      
      for (let i = 0; i < 4; i++) {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
        
        if (i === 0) {
          await waitFor(() => {
            const nameInput = screen.getByTestId('name-input');
            fireEvent.change(nameInput, { target: { value: 'Test Name' } });
          });
        }
        
        if (i === 2) {
          await waitFor(() => {
            const privacySelect = screen.getByTestId('privacy-level-select');
            fireEvent.change(privacySelect, { target: { value: PrivacyLevel.PUBLIC } });
          });
        }
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('review-step')).toBeInTheDocument();
      });
      
      // Try to create
      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Creation Failed",
          description: "Validation failed",
          variant: "destructive"
        });
      });
    });
  });
});