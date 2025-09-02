/**
 * Tests for IdentityDisplay Component
 * Requirements: 1.1, 1.2, 1.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityDisplay } from '../IdentityDisplay';
import { IdentityType, PrivacyLevel, IdentityStatus, GovernanceType } from '@/types/identity';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock the identity store
const mockActiveIdentity = {
  did: 'did:squid:root-123',
  name: 'Root Identity',
  type: IdentityType.ROOT,
  rootId: 'did:squid:root-123',
  children: ['did:squid:dao-456'],
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
  avatar: 'https://example.com/avatar.jpg',
  description: 'Main root identity',
  tags: ['root', 'main'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastUsed: '2024-01-02T00:00:00Z',
  kyc: {
    required: false,
    submitted: true,
    approved: true
  },
  auditLog: [],
  securityFlags: [],
  qindexRegistered: true
};

const mockClearIdentity = vi.fn();
const mockUseIdentityStore = vi.fn();

vi.mock('@/lib/stores/identityStore', () => ({
  useIdentityStore: () => mockUseIdentityStore()
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  )
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={`avatar ${className}`}>{children}</div>,
  AvatarFallback: ({ children, className }: any) => <div className={`avatar-fallback ${className}`}>{children}</div>,
  AvatarImage: ({ src, alt, className }: any) => <img src={src} alt={alt} className={`avatar-image ${className}`} />
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => <div data-testid="user-icon" className={className} />,
  Crown: ({ className }: any) => <div data-testid="crown-icon" className={className} />,
  Users: ({ className }: any) => <div data-testid="users-icon" className={className} />,
  Building2: ({ className }: any) => <div data-testid="building-icon" className={className} />,
  Shield: ({ className }: any) => <div data-testid="shield-icon" className={className} />,
  EyeOff: ({ className }: any) => <div data-testid="eye-off-icon" className={className} />,
  Settings: ({ className }: any) => <div data-testid="settings-icon" className={className} />,
  LogOut: ({ className }: any) => <div data-testid="logout-icon" className={className} />,
  Edit: ({ className }: any) => <div data-testid="edit-icon" className={className} />,
  Eye: ({ className }: any) => <div data-testid="eye-icon" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-icon" className={className} />
}));

describe('IdentityDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseIdentityStore.mockReturnValue({
      activeIdentity: mockActiveIdentity,
      clearIdentity: mockClearIdentity
    });
  });

  describe('Rendering with Active Identity', () => {
    it('should render identity information when active identity exists', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      expect(screen.getByText('Main root identity')).toBeInTheDocument();
      expect(screen.getByText('ROOT')).toBeInTheDocument();
      expect(screen.getByText('PUBLIC')).toBeInTheDocument();
    });

    it('should display identity avatar', () => {
      render(<IdentityDisplay />);
      
      const avatar = screen.getByAltText('Root Identity');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should show fallback icon when no avatar', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, avatar: undefined },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
    });

    it('should display identity type badge', () => {
      render(<IdentityDisplay />);
      
      const typeBadge = screen.getByText('ROOT');
      expect(typeBadge).toBeInTheDocument();
      expect(typeBadge).toHaveClass('badge');
    });

    it('should display privacy level badge', () => {
      render(<IdentityDisplay />);
      
      const privacyBadge = screen.getByText('PUBLIC');
      expect(privacyBadge).toBeInTheDocument();
      expect(privacyBadge).toHaveClass('badge');
    });

    it('should show KYC status when approved', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.getByText('KYC Verified')).toBeInTheDocument();
    });

    it('should show identity tags', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByText('root')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should display child count when identity has children', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByText('1 Subidentity')).toBeInTheDocument();
    });

    it('should show correct child count for multiple children', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          children: ['did:squid:dao-456', 'did:squid:aid-789', 'did:squid:enterprise-101'] 
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('3 Subidentities')).toBeInTheDocument();
    });
  });

  describe('No Active Identity State', () => {
    beforeEach(() => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: null,
        clearIdentity: mockClearIdentity
      });
    });

    it('should render empty state when no active identity', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByText('No Active Identity')).toBeInTheDocument();
      expect(screen.getByText('Please select an identity to continue')).toBeInTheDocument();
    });

    it('should show login button in empty state', () => {
      render(<IdentityDisplay />);
      
      const loginButton = screen.getByText('Go to Login');
      expect(loginButton).toBeInTheDocument();
    });

    it('should navigate to login when login button is clicked', () => {
      render(<IdentityDisplay />);
      
      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Action Buttons', () => {
    it('should render manage identity button', () => {
      render(<IdentityDisplay />);
      
      const manageButton = screen.getByText('Manage Identity');
      expect(manageButton).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should navigate to identity management when manage button is clicked', () => {
      render(<IdentityDisplay />);
      
      const manageButton = screen.getByText('Manage Identity');
      fireEvent.click(manageButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/identity');
    });

    it('should render logout button', () => {
      render(<IdentityDisplay />);
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });

    it('should call clearIdentity and navigate when logout is clicked', async () => {
      render(<IdentityDisplay />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockClearIdentity).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/');
        expect(mockToast).toHaveBeenCalledWith({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
      });
    });
  });

  describe('Identity Status Indicators', () => {
    it('should show active status indicator', () => {
      render(<IdentityDisplay />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show inactive status for inactive identity', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, status: IdentityStatus.INACTIVE },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should show suspended status for suspended identity', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, status: IdentityStatus.SUSPENDED },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Suspended')).toBeInTheDocument();
    });

    it('should show pending verification status', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, status: IdentityStatus.PENDING_VERIFICATION },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
    });
  });

  describe('Different Identity Types', () => {
    it('should render DAO identity correctly', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          type: IdentityType.DAO,
          name: 'DAO Identity'
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    });

    it('should render Enterprise identity correctly', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          type: IdentityType.ENTERPRISE,
          name: 'Enterprise Identity'
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Enterprise Identity')).toBeInTheDocument();
      expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
      expect(screen.getByTestId('building-icon')).toBeInTheDocument();
    });

    it('should render Consentida identity correctly', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          type: IdentityType.CONSENTIDA,
          name: 'Consentida Identity'
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Consentida Identity')).toBeInTheDocument();
      expect(screen.getByText('CONSENTIDA')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('should render AID identity correctly', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          type: IdentityType.AID,
          name: 'Anonymous Identity',
          privacyLevel: PrivacyLevel.ANONYMOUS
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Anonymous Identity')).toBeInTheDocument();
      expect(screen.getByText('AID')).toBeInTheDocument();
      expect(screen.getByText('ANONYMOUS')).toBeInTheDocument();
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });
  });

  describe('Privacy Levels', () => {
    it('should display DAO_ONLY privacy level', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, privacyLevel: PrivacyLevel.DAO_ONLY },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('DAO ONLY')).toBeInTheDocument();
    });

    it('should display PRIVATE privacy level', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, privacyLevel: PrivacyLevel.PRIVATE },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('PRIVATE')).toBeInTheDocument();
    });

    it('should display ANONYMOUS privacy level', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { ...mockActiveIdentity, privacyLevel: PrivacyLevel.ANONYMOUS },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('ANONYMOUS')).toBeInTheDocument();
    });
  });

  describe('KYC Status', () => {
    it('should show KYC required but not submitted', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          kyc: { required: true, submitted: false, approved: false }
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('KYC Required')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('should show KYC submitted but not approved', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          kyc: { required: true, submitted: true, approved: false }
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('KYC Pending')).toBeInTheDocument();
    });

    it('should not show KYC status when not required', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          kyc: { required: false, submitted: false, approved: false }
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.queryByText(/KYC/)).not.toBeInTheDocument();
    });
  });

  describe('Security Flags', () => {
    it('should show security alert when security flags exist', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          securityFlags: [
            {
              id: 'flag-1',
              type: 'SUSPICIOUS_ACTIVITY',
              severity: 'HIGH',
              description: 'Unusual login pattern detected',
              timestamp: '2024-01-01T00:00:00Z',
              resolved: false
            }
          ]
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('1 Security Alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('should show multiple security alerts', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          securityFlags: [
            {
              id: 'flag-1',
              type: 'SUSPICIOUS_ACTIVITY',
              severity: 'HIGH',
              description: 'Unusual login pattern detected',
              timestamp: '2024-01-01T00:00:00Z',
              resolved: false
            },
            {
              id: 'flag-2',
              type: 'FAILED_VERIFICATION',
              severity: 'MEDIUM',
              description: 'Failed signature verification',
              timestamp: '2024-01-01T01:00:00Z',
              resolved: false
            }
          ]
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('2 Security Alerts')).toBeInTheDocument();
    });

    it('should not show security alerts when none exist', () => {
      render(<IdentityDisplay />);
      
      expect(screen.queryByText(/Security Alert/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<IdentityDisplay />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      const manageButton = screen.getByText('Manage Identity');
      expect(manageButton).toHaveAttribute('aria-label', 'Manage identity settings');
      
      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toHaveAttribute('aria-label', 'Logout from current identity');
    });

    it('should have proper heading structure', () => {
      render(<IdentityDisplay />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Root Identity');
    });

    it('should support keyboard navigation', () => {
      render(<IdentityDisplay />);
      
      const manageButton = screen.getByText('Manage Identity');
      const logoutButton = screen.getByText('Logout');
      
      // Buttons should be focusable
      manageButton.focus();
      expect(manageButton).toHaveFocus();
      
      logoutButton.focus();
      expect(logoutButton).toHaveFocus();
    });

    it('should have proper alt text for avatar', () => {
      render(<IdentityDisplay />);
      
      const avatar = screen.getByAltText('Root Identity');
      expect(avatar).toBeInTheDocument();
    });

    it('should provide screen reader friendly status information', () => {
      render(<IdentityDisplay />);
      
      // Status should be announced to screen readers
      const statusElement = screen.getByText('Active');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      render(<IdentityDisplay />);
      
      const card = document.querySelector('.card');
      expect(card).toBeInTheDocument();
    });

    it('should handle long identity names gracefully', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          name: 'Very Long Identity Name That Should Wrap Properly In The Display'
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Very Long Identity Name That Should Wrap Properly In The Display')).toBeInTheDocument();
    });

    it('should handle long descriptions gracefully', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          description: 'This is a very long description that should be handled properly by the component without breaking the layout or causing overflow issues'
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('This is a very long description that should be handled properly by the component without breaking the layout or causing overflow issues')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle logout errors gracefully', async () => {
      mockClearIdentity.mockImplementation(() => {
        throw new Error('Logout failed');
      });

      render(<IdentityDisplay />);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Logout Failed",
          description: "Failed to logout. Please try again.",
          variant: "destructive"
        });
      });
    });

    it('should handle missing identity properties gracefully', () => {
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          description: undefined,
          tags: [],
          children: []
        },
        clearIdentity: mockClearIdentity
      });

      render(<IdentityDisplay />);
      
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      expect(screen.queryByText('No description')).toBeInTheDocument();
      expect(screen.queryByText('0 Subidentities')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<IdentityDisplay />);
      
      // Re-render with same identity
      rerender(<IdentityDisplay />);
      
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
    });

    it('should update when identity changes', () => {
      const { rerender } = render(<IdentityDisplay />);
      
      expect(screen.getByText('Root Identity')).toBeInTheDocument();
      
      // Change identity
      mockUseIdentityStore.mockReturnValue({
        activeIdentity: { 
          ...mockActiveIdentity, 
          name: 'Updated Identity',
          type: IdentityType.DAO
        },
        clearIdentity: mockClearIdentity
      });
      
      rerender(<IdentityDisplay />);
      
      expect(screen.getByText('Updated Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO')).toBeInTheDocument();
    });
  });
});