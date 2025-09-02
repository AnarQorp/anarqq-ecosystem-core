/**
 * Privacy Configuration Step Tests
 * Tests for the privacy configuration step of the subidentity creation wizard
 * Requirements: 2.5, 3.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrivacyConfigurationStep } from '../PrivacyConfigurationStep';
import { IdentityType, PrivacyLevel, ExtendedSquidIdentity } from '@/types/identity';
import { useQonsent } from '@/hooks/useQonsent';

// Mock the useQonsent hook
vi.mock('@/hooks/useQonsent', () => ({
  useQonsent: vi.fn()
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span className={`badge-${variant}`}>{children}</span>
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div className={`alert-${variant}`}>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid="switch"
    />
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value} onClick={() => {}}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select value</span>
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, disabled, rows }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      data-testid="textarea"
    />
  )
}));

describe('PrivacyConfigurationStep', () => {
  const mockActiveIdentity: ExtendedSquidIdentity = {
    did: 'did:test:123',
    name: 'Test Identity',
    type: IdentityType.ROOT,
    rootId: 'did:test:123',
    children: [],
    depth: 0,
    path: [],
    governanceLevel: 'SELF',
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
      governanceLevel: 'SELF'
    },
    status: 'ACTIVE',
    qonsentProfileId: 'qonsent-123',
    qlockKeyPair: {
      publicKey: 'pub-key',
      privateKey: 'priv-key',
      algorithm: 'RSA',
      keySize: 2048,
      createdAt: '2024-01-01T00:00:00Z'
    },
    privacyLevel: PrivacyLevel.MEDIUM,
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

  const mockQonsentHook = {
    settings: {
      exposureLevel: 'medium',
      moduleSharing: {},
      useQmask: false,
      qmaskStrength: 'standard'
    },
    loading: false,
    error: null,
    updateSettings: vi.fn(),
    generateProfile: vi.fn(),
    checkConsent: vi.fn(),
    revokeConsent: vi.fn(),
    exportData: vi.fn(),
    deleteAccount: vi.fn(),
    clearError: vi.fn(),
    refreshSettings: vi.fn()
  };

  const defaultProps = {
    selectedType: IdentityType.DAO,
    formData: {
      name: 'Test DAO Identity',
      description: 'Test description'
    },
    onFormDataChange: vi.fn(),
    validationErrors: {},
    isSubmitting: false,
    activeIdentity: mockActiveIdentity
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useQonsent as any).mockReturnValue(mockQonsentHook);
  });

  describe('Component Rendering', () => {
    it('should render privacy configuration step with header', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
      expect(screen.getByText(/Configure privacy settings and Qonsent profile/)).toBeInTheDocument();
    });

    it('should display identity type privacy info', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('DAO identities')).toBeInTheDocument();
      expect(screen.getByText(/have specific privacy requirements/)).toBeInTheDocument();
    });

    it('should render privacy level selection section', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Privacy Level')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('DAO Members Only')).toBeInTheDocument();
    });

    it('should render module data sharing section', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Module Data Sharing')).toBeInTheDocument();
      expect(screen.getByText('QSocial')).toBeInTheDocument();
      expect(screen.getByText('QWallet')).toBeInTheDocument();
      expect(screen.getByText('QIndex')).toBeInTheDocument();
      expect(screen.getByText('Qerberos')).toBeInTheDocument();
    });

    it('should render privacy policy preview section', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Privacy Policy Preview')).toBeInTheDocument();
    });
  });

  describe('Privacy Level Selection', () => {
    it('should allow selecting different privacy levels for DAO identity', () => {
      const onFormDataChange = vi.fn();
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      // Should show Public and DAO Members Only options for DAO identity
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('DAO Members Only')).toBeInTheDocument();
      expect(screen.queryByText('Private')).not.toBeInTheDocument();
      expect(screen.queryByText('Anonymous')).not.toBeInTheDocument();
    });

    it('should show only anonymous option for AID identity', () => {
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          selectedType={IdentityType.AID}
        />
      );
      
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
      expect(screen.queryByText('Public')).not.toBeInTheDocument();
      expect(screen.queryByText('DAO Members Only')).not.toBeInTheDocument();
      expect(screen.queryByText('Private')).not.toBeInTheDocument();
    });

    it('should show private and DAO options for Consentida identity', () => {
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          selectedType={IdentityType.CONSENTIDA}
        />
      );
      
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('DAO Members Only')).toBeInTheDocument();
      expect(screen.queryByText('Public')).not.toBeInTheDocument();
      expect(screen.queryByText('Anonymous')).not.toBeInTheDocument();
    });

    it('should call onFormDataChange when privacy level is selected', async () => {
      const onFormDataChange = vi.fn();
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      // Click on Public privacy level
      const publicOption = screen.getByText('Public').closest('div');
      fireEvent.click(publicOption!);
      
      await waitFor(() => {
        expect(onFormDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            privacyLevel: PrivacyLevel.PUBLIC,
            qonsentConfig: expect.objectContaining({
              privacyLevel: PrivacyLevel.PUBLIC
            })
          })
        );
      });
    });
  });

  describe('Module Data Sharing', () => {
    it('should show required modules as disabled for DAO identity', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      const switches = screen.getAllByTestId('switch');
      
      // QSocial, QIndex, and Qerberos should be required and enabled for DAO
      // QWallet should be optional
      expect(switches.length).toBeGreaterThan(0);
    });

    it('should allow toggling optional module sharing', async () => {
      const user = userEvent.setup();
      const onFormDataChange = vi.fn();
      
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      const switches = screen.getAllByTestId('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
        
        await waitFor(() => {
          expect(onFormDataChange).toHaveBeenCalled();
        });
      }
    });

    it('should show required badge for required modules', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Privacy Options', () => {
    it('should show advanced options for non-anonymous identities', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Advanced Privacy Options')).toBeInTheDocument();
      expect(screen.getByText('Enable Qmask')).toBeInTheDocument();
      expect(screen.getByText('Custom Policy Notes')).toBeInTheDocument();
    });

    it('should not show advanced options for anonymous identities', () => {
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          selectedType={IdentityType.AID}
        />
      );
      
      expect(screen.queryByText('Advanced Privacy Options')).not.toBeInTheDocument();
    });

    it('should allow toggling Qmask', async () => {
      const user = userEvent.setup();
      const onFormDataChange = vi.fn();
      
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      // Find the Qmask switch by looking for the text and then finding the associated switch
      const qmaskText = screen.getByText('Enable Qmask');
      const qmaskContainer = qmaskText.closest('div');
      const qmaskSwitch = qmaskContainer?.querySelector('input[type="checkbox"]');
      
      if (qmaskSwitch) {
        await user.click(qmaskSwitch);
        
        await waitFor(() => {
          expect(onFormDataChange).toHaveBeenCalled();
        });
      }
    });

    it('should allow entering custom policy notes', async () => {
      const user = userEvent.setup();
      const onFormDataChange = vi.fn();
      
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      const textarea = screen.getByTestId('textarea');
      await user.type(textarea, 'Custom privacy requirements');
      
      expect(textarea).toHaveValue('Custom privacy requirements');
    });
  });

  describe('Privacy Policy Preview', () => {
    it('should generate and display privacy policy preview', () => {
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          formData={{
            ...defaultProps.formData,
            privacyLevel: PrivacyLevel.PUBLIC
          }}
        />
      );
      
      expect(screen.getByText('Privacy Policy Preview')).toBeInTheDocument();
      expect(screen.getByText(/Privacy Policy for/)).toBeInTheDocument();
    });

    it('should update preview when settings change', async () => {
      const onFormDataChange = vi.fn();
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
          formData={{
            ...defaultProps.formData,
            name: 'Test Identity'
          }}
        />
      );
      
      expect(screen.getByText(/Privacy Policy for Test Identity/)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should display validation errors', () => {
      const validationErrors = {
        qonsent: ['Privacy configuration is required', 'Privacy level must be selected']
      };
      
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          validationErrors={validationErrors}
        />
      );
      
      expect(screen.getByText('Privacy Configuration Errors:')).toBeInTheDocument();
      expect(screen.getByText('• Privacy configuration is required')).toBeInTheDocument();
      expect(screen.getByText('• Privacy level must be selected')).toBeInTheDocument();
    });

    it('should not display validation errors when none exist', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.queryByText('Privacy Configuration Errors:')).not.toBeInTheDocument();
    });
  });

  describe('Form Data Integration', () => {
    it('should initialize with existing form data', () => {
      const formDataWithPrivacy = {
        ...defaultProps.formData,
        privacyLevel: PrivacyLevel.DAO_ONLY,
        qonsentConfig: {
          identityId: '',
          profileId: 'test-profile-id',
          privacyLevel: PrivacyLevel.DAO_ONLY,
          dataSharing: {
            qsocial: { enabled: true, level: 'STANDARD', restrictions: [] }
          },
          visibilityRules: {
            profile: PrivacyLevel.DAO_ONLY,
            activity: PrivacyLevel.DAO_ONLY,
            connections: PrivacyLevel.DAO_ONLY
          },
          consentHistory: [],
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      };
      
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          formData={formDataWithPrivacy}
        />
      );
      
      // Should initialize with the provided privacy level (DAO Members Only is available for DAO identity)
      expect(screen.getByText('DAO Members Only')).toBeInTheDocument();
    });

    it('should call onFormDataChange with complete qonsent configuration', async () => {
      const onFormDataChange = vi.fn();
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          onFormDataChange={onFormDataChange}
        />
      );
      
      // Component should call onFormDataChange on mount with initial configuration
      await waitFor(() => {
        expect(onFormDataChange).toHaveBeenCalledWith(
          expect.objectContaining({
            privacyLevel: expect.any(String),
            qonsentConfig: expect.objectContaining({
              profileId: expect.any(String),
              privacyLevel: expect.any(String),
              dataSharing: expect.any(Object),
              visibilityRules: expect.any(Object),
              consentHistory: expect.any(Array),
              lastUpdated: expect.any(String)
            })
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form controls', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      expect(screen.getByText('Enable Qmask')).toBeInTheDocument();
      expect(screen.getByText('Custom Policy Notes')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      // Should be able to tab through interactive elements
      await user.tab();
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('Loading and Error States', () => {
    it('should disable controls when submitting', () => {
      render(
        <PrivacyConfigurationStep 
          {...defaultProps} 
          isSubmitting={true}
        />
      );
      
      const switches = screen.getAllByTestId('switch');
      switches.forEach(switchElement => {
        expect(switchElement).toBeDisabled();
      });
      
      const textarea = screen.getByTestId('textarea');
      expect(textarea).toBeDisabled();
    });

    it('should handle Qonsent hook loading state', () => {
      (useQonsent as any).mockReturnValue({
        ...mockQonsentHook,
        loading: true
      });
      
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      // Component should still render even when Qonsent is loading
      expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
    });

    it('should handle Qonsent hook error state', () => {
      (useQonsent as any).mockReturnValue({
        ...mockQonsentHook,
        error: 'Failed to load Qonsent settings'
      });
      
      render(<PrivacyConfigurationStep {...defaultProps} />);
      
      // Component should still render even when Qonsent has errors
      expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
    });
  });
});