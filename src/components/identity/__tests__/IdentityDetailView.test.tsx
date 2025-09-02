/**
 * Tests for IdentityDetailView Component
 * Requirements: 1.2, 1.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityDetailView } from '../IdentityDetailView';
import { useIdentityManager } from '@/hooks/useIdentityManager';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { IdentityType, PrivacyLevel, IdentityStatus, GovernanceType } from '@/types/identity';

// Mock the hooks
vi.mock('@/hooks/useIdentityManager');
vi.mock('@/hooks/useActiveIdentity');

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div className="card-description">{children}</div>,
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

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, disabled, placeholder, id, ...props }: any) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      data-testid={`input-${id}`}
      {...props}
    />
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, disabled, placeholder, id, rows, ...props }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      data-testid={`textarea-${id}`}
      {...props}
    />
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={`label ${className}`}>{children}</label>
  )
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="alert-dialog-action">{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>
}));

// Mock visual indicators
vi.mock('../IdentityVisualIndicators', () => ({
  IdentityTypeIcon: ({ type, className }: any) => (
    <div className={`identity-type-icon ${className}`} data-type={type}>
      {type}-icon
    </div>
  ),
  IdentityTypeBadge: ({ type }: any) => (
    <span className="identity-type-badge" data-type={type}>
      {type}
    </span>
  ),
  PrivacyLevelBadge: ({ level }: any) => (
    <span className="privacy-level-badge" data-level={level}>
      {level}
    </span>
  ),
  SecurityStatusBadge: ({ identity }: any) => (
    <span className="security-status-badge">
      Security: {identity.securityFlags.length}
    </span>
  ),
  KYCStatusBadge: ({ kyc }: any) => (
    <span className="kyc-status-badge">
      KYC: {kyc.approved ? 'Approved' : kyc.submitted ? 'Pending' : 'Required'}
    </span>
  ),
  GovernanceBadge: ({ governanceType }: any) => (
    <span className="governance-badge" data-governance={governanceType}>
      {governanceType}
    </span>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => <div data-testid="user-icon" className={className} />,
  Edit3: ({ className }: any) => <div data-testid="edit-icon" className={className} />,
  Trash2: ({ className }: any) => <div data-testid="trash-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
  Save: ({ className }: any) => <div data-testid="save-icon" className={className} />,
  Copy: ({ className }: any) => <div data-testid="copy-icon" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  Shield: ({ className }: any) => <div data-testid="shield-icon" className={className} />,
  Key: ({ className }: any) => <div data-testid="key-icon" className={className} />,
  Clock: ({ className }: any) => <div data-testid="clock-icon" className={className} />,
  Activity: ({ className }: any) => <div data-testid="activity-icon" className={className} />,
  Eye: ({ className }: any) => <div data-testid="eye-icon" className={className} />,
  Settings: ({ className }: any) => <div data-testid="settings-icon" className={className} />,
  AlertTriangle: ({ className }: any) => <div data-testid="alert-triangle-icon" className={className} />
}));

const mockIdentity = {
  did: 'did:squid:dao-123',
  name: 'DAO Identity',
  type: IdentityType.DAO,
  parentId: 'did:squid:root-456',
  rootId: 'did:squid:root-456',
  children: ['did:squid:enterprise-789'],
  depth: 1,
  path: ['did:squid:root-456'],
  governanceLevel: GovernanceType.DAO,
  creationRules: {
    type: IdentityType.DAO,
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
  qonsentProfileId: 'qonsent-dao-123',
  qlockKeyPair: {
    publicKey: 'pub-dao-123',
    privateKey: 'priv-dao-123',
    algorithm: 'ECDSA' as const,
    keySize: 256,
    createdAt: '2024-01-01T00:00:00Z'
  },
  privacyLevel: PrivacyLevel.PUBLIC,
  avatar: 'https://example.com/avatar.jpg',
  description: 'DAO governance identity',
  tags: ['dao', 'governance'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  lastUsed: '2024-01-03T00:00:00Z',
  kyc: {
    required: true,
    submitted: true,
    approved: true,
    level: 'BASIC',
    approvedAt: '2024-01-01T12:00:00Z'
  },
  auditLog: [
    {
      id: 'audit-1',
      identityId: 'did:squid:dao-123',
      action: 'CREATED',
      timestamp: '2024-01-01T00:00:00Z',
      metadata: {
        triggeredBy: 'did:squid:root-456',
        securityLevel: 'MEDIUM'
      },
      qerberosLogId: 'qerberos-1'
    }
  ],
  securityFlags: [],
  qindexRegistered: true
};

const mockActiveIdentity = {
  did: 'did:squid:root-456',
  permissions: {
    canCreateSubidentities: true,
    canDeleteSubidentities: true,
    canModifyProfile: true,
    canAccessModule: () => true,
    canPerformAction: () => true,
    governanceLevel: GovernanceType.SELF
  }
};

describe('IdentityDetailView', () => {
  const mockOnClose = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSave = vi.fn();
  const mockDeleteIdentity = vi.fn();
  const mockUpdateIdentity = vi.fn();
  const mockCanPerformAction = vi.fn();

  const defaultProps = {
    identity: mockIdentity,
    onClose: mockOnClose,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onSave: mockOnSave
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useIdentityManager as any).mockReturnValue({
      deleteIdentity: mockDeleteIdentity,
      updateIdentity: mockUpdateIdentity,
      loading: false
    });

    (useActiveIdentity as any).mockReturnValue({
      identity: mockActiveIdentity,
      canPerformAction: mockCanPerformAction
    });

    mockCanPerformAction.mockReturnValue(true);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  describe('Rendering', () => {
    it('should render identity header with name and description', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO governance identity')).toBeInTheDocument();
    });

    it('should render identity type icon', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const typeIcon = document.querySelector('.identity-type-icon');
      expect(typeIcon).toBeInTheDocument();
      expect(typeIcon).toHaveAttribute('data-type', 'DAO');
    });

    it('should render status badges', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(document.querySelector('.identity-type-badge')).toBeInTheDocument();
      expect(document.querySelector('.privacy-level-badge')).toBeInTheDocument();
      expect(document.querySelector('.governance-badge')).toBeInTheDocument();
      expect(document.querySelector('.kyc-status-badge')).toBeInTheDocument();
    });

    it('should render child count badge', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('1 Children')).toBeInTheDocument();
    });

    it('should render tabs navigation', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-security')).toBeInTheDocument();
      expect(screen.getByTestId('tab-privacy')).toBeInTheDocument();
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
      expect(screen.getByTestId('tab-technical')).toBeInTheDocument();
    });

    it('should render default overview tab content', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByTestId('tab-content-overview')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Hierarchy Information')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render edit button when user can edit', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      expect(editButton).toBeInTheDocument();
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
    });

    it('should not render edit button when user cannot edit', () => {
      mockCanPerformAction.mockReturnValue(false);
      
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should render delete button when user can delete non-root identity', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should not render delete button for root identity', () => {
      const rootIdentity = { ...mockIdentity, type: IdentityType.ROOT };
      
      render(<IdentityDetailView {...defaultProps} identity={rootIdentity} />);
      
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should render close button when onClose is provided', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is clicked', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should populate form fields with current values in edit mode', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const nameInput = screen.getByTestId('input-name') as HTMLInputElement;
      const descriptionInput = screen.getByTestId('textarea-description') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('DAO Identity');
      expect(descriptionInput.value).toBe('DAO governance identity');
    });

    it('should update form values when inputs change', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      expect((nameInput as HTMLInputElement).value).toBe('Updated Name');
    });

    it('should exit edit mode when cancel is clicked', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByTestId('input-name')).not.toBeInTheDocument();
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
    });

    it('should save changes when save button is clicked', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const nameInput = screen.getByTestId('input-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateIdentity).toHaveBeenCalledWith('did:squid:dao-123', {
          name: 'Updated Name',
          description: 'Updated description',
          tags: ['dao', 'governance'],
          updatedAt: expect.any(String)
        });
      });
    });

    it('should call onSave callback when provided', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const nameInput = screen.getByTestId('input-name');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockIdentity, {
          name: 'Updated Name',
          description: 'DAO governance identity',
          tags: ['dao', 'governance'],
          updatedAt: expect.any(String)
        });
      });
    });

    it('should disable inputs when loading', () => {
      (useIdentityManager as any).mockReturnValue({
        deleteIdentity: mockDeleteIdentity,
        updateIdentity: mockUpdateIdentity,
        loading: true
      });

      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const nameInput = screen.getByTestId('input-name');
      const saveButton = screen.getByText('Save Changes');
      
      expect(nameInput).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete confirmation dialog when delete button is clicked', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Identity')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "DAO Identity"?')).toBeInTheDocument();
    });

    it('should show warning when identity has children', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This identity has 1 child identities that will also be deleted.')).toBeInTheDocument();
    });

    it('should call deleteIdentity when delete is confirmed', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDeleteIdentity).toHaveBeenCalledWith('did:squid:dao-123');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call onDelete callback when provided', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(mockIdentity);
      });
    });
  });

  describe('Basic Information Display', () => {
    it('should display identity name and description', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      expect(screen.getByText('DAO governance identity')).toBeInTheDocument();
    });

    it('should display tags', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('dao')).toBeInTheDocument();
      expect(screen.getByText('governance')).toBeInTheDocument();
    });

    it('should show "No tags" when no tags exist', () => {
      const identityWithoutTags = { ...mockIdentity, tags: [] };
      
      render(<IdentityDetailView {...defaultProps} identity={identityWithoutTags} />);
      
      expect(screen.getByText('No tags')).toBeInTheDocument();
    });

    it('should show "No description provided" when no description', () => {
      const identityWithoutDescription = { ...mockIdentity, description: undefined };
      
      render(<IdentityDetailView {...defaultProps} identity={identityWithoutDescription} />);
      
      expect(screen.getByText('No description provided')).toBeInTheDocument();
    });
  });

  describe('Hierarchy Information', () => {
    it('should display depth and children count', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // depth
      expect(screen.getByText('1')).toBeInTheDocument(); // children count
    });

    it('should display parent identity DID', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('did:squid:root-456')).toBeInTheDocument();
    });

    it('should display identity path', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      // Should show path visualization
      expect(screen.getByText('root-456...')).toBeInTheDocument();
      expect(screen.getByText('dao-123...')).toBeInTheDocument();
    });

    it('should show "Root identity" for root identity path', () => {
      const rootIdentity = { ...mockIdentity, path: [], parentId: undefined };
      
      render(<IdentityDetailView {...defaultProps} identity={rootIdentity} />);
      
      expect(screen.getByText('Root identity')).toBeInTheDocument();
    });
  });

  describe('Timeline Information', () => {
    it('should display formatted timestamps', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      // Should show formatted dates
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument(); // created
      expect(screen.getByText(/1\/2\/2024/)).toBeInTheDocument(); // updated
      expect(screen.getByText(/1\/3\/2024/)).toBeInTheDocument(); // last used
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy DID to clipboard when copy button is clicked', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      // Find copy button for DID (in technical tab)
      const copyButtons = screen.getAllByTestId('copy-icon');
      const didCopyButton = copyButtons[0].closest('button');
      
      fireEvent.click(didCopyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('did:squid:dao-123');
      });
    });

    it('should show check icon after successful copy', async () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const copyButtons = screen.getAllByTestId('copy-icon');
      const didCopyButton = copyButtons[0].closest('button');
      
      fireEvent.click(didCopyButton!);
      
      await waitFor(() => {
        expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Security Tab', () => {
    it('should display KYC verification status', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('KYC Verification')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument(); // required
      expect(screen.getByText('BASIC')).toBeInTheDocument(); // level
    });

    it('should display encryption key information', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('Encryption Keys')).toBeInTheDocument();
      expect(screen.getByText('ECDSA')).toBeInTheDocument();
      expect(screen.getByText('256 bits')).toBeInTheDocument();
    });

    it('should show security flags when they exist', () => {
      const identityWithFlags = {
        ...mockIdentity,
        securityFlags: [
          {
            id: 'flag-1',
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            description: 'Unusual activity detected',
            timestamp: '2024-01-01T00:00:00Z',
            resolved: false
          }
        ]
      };
      
      render(<IdentityDetailView {...defaultProps} identity={identityWithFlags} />);
      
      expect(screen.getByText('Security Flags')).toBeInTheDocument();
      expect(screen.getByText('SUSPICIOUS_ACTIVITY')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('should show "No security flags" when none exist', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('No security flags')).toBeInTheDocument();
    });
  });

  describe('Privacy Tab', () => {
    it('should display privacy configuration', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('Privacy Configuration')).toBeInTheDocument();
      expect(document.querySelector('.privacy-level-badge')).toBeInTheDocument();
      expect(screen.getByText('qonsent-dao-123')).toBeInTheDocument();
    });
  });

  describe('Audit Log Tab', () => {
    it('should display audit log entries', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
      expect(screen.getByText('Recent activity and changes to this identity')).toBeInTheDocument();
    });

    it('should show "No audit log entries" when none exist', () => {
      const identityWithoutAudit = { ...mockIdentity, auditLog: [] };
      
      render(<IdentityDetailView {...defaultProps} identity={identityWithoutAudit} />);
      
      expect(screen.getByText('No audit log entries')).toBeInTheDocument();
    });
  });

  describe('Technical Tab', () => {
    it('should display technical details', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('did:squid:dao-123')).toBeInTheDocument();
      expect(screen.getByText('did:squid:root-456')).toBeInTheDocument();
    });

    it('should show Qindex registration status', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('Qindex Status')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      const editButton = screen.getByText('Edit');
      expect(editButton).toBeInTheDocument();
    });

    it('should have proper form labels in edit mode', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Tags (comma-separated)')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');
      
      editButton.focus();
      expect(editButton).toHaveFocus();
      
      deleteButton.focus();
      expect(deleteButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      mockUpdateIdentity.mockRejectedValue(new Error('Save failed'));
      
      render(<IdentityDetailView {...defaultProps} />);
      
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      // Should not crash and should remain in edit mode
      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });
    });

    it('should handle delete errors gracefully', async () => {
      mockDeleteIdentity.mockRejectedValue(new Error('Delete failed'));
      
      render(<IdentityDetailView {...defaultProps} />);
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      // Should not crash
      await waitFor(() => {
        expect(mockDeleteIdentity).toHaveBeenCalled();
      });
    });

    it('should handle clipboard errors gracefully', async () => {
      (navigator.clipboard.writeText as any).mockRejectedValue(new Error('Clipboard failed'));
      
      render(<IdentityDetailView {...defaultProps} />);
      
      const copyButtons = screen.getAllByTestId('copy-icon');
      const didCopyButton = copyButtons[0].closest('button');
      
      fireEvent.click(didCopyButton!);
      
      // Should not crash
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<IdentityDetailView {...defaultProps} className="custom-class" />);
      
      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('should work without optional callbacks', () => {
      render(
        <IdentityDetailView 
          identity={mockIdentity}
        />
      );
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      
      // Re-render with same props
      rerender(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
    });

    it('should update when identity changes', () => {
      const { rerender } = render(<IdentityDetailView {...defaultProps} />);
      
      expect(screen.getByText('DAO Identity')).toBeInTheDocument();
      
      const updatedIdentity = { ...mockIdentity, name: 'Updated Identity' };
      rerender(<IdentityDetailView {...defaultProps} identity={updatedIdentity} />);
      
      expect(screen.getByText('Updated Identity')).toBeInTheDocument();
    });
  });
});