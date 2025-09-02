/**
 * Emergency Controls Dashboard Component Tests
 * 
 * Comprehensive test suite for the EmergencyControlsDashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EmergencyControlsDashboard from '../EmergencyControlsDashboard';
import { ExtendedSquidIdentity } from '../../../types/identity';

// Mock the useEmergencyControls hook
vi.mock('../../../hooks/useEmergencyControls', () => ({
  useEmergencyControls: vi.fn()
}));

describe('EmergencyControlsDashboard', () => {
  const mockIdentity: ExtendedSquidIdentity = {
    did: 'test-identity-123',
    type: 'INDIVIDUAL',
    name: 'Test User',
    avatar: '',
    publicKey: 'mock-public-key',
    encryptedPrivateKey: 'mock-encrypted-private-key',
    createdAt: '2024-01-01T00:00:00Z',
    lastActive: '2024-01-01T00:00:00Z',
    privacyLevel: 'PRIVATE',
    permissions: [],
    auditLog: [],
    children: [],
    parent: null,
    isActive: true,
    metadata: {}
  };

  const mockHookReturn = {
    freezeStatus: null,
    emergencyContacts: [],
    pendingActions: [],
    activeOverrides: [],
    recentNotifications: [],
    loading: false,
    error: null,
    addEmergencyContact: vi.fn(),
    removeEmergencyContact: vi.fn(),
    updateEmergencyContact: vi.fn(),
    freezeWallet: vi.fn(),
    unfreezeWallet: vi.fn(),
    requestUnfreezeApproval: vi.fn(),
    createAdminOverride: vi.fn(),
    revokeAdminOverride: vi.fn(),
    approveEmergencyAction: vi.fn(),
    getActionHistory: vi.fn(),
    markNotificationAsRead: vi.fn(),
    clearAllNotifications: vi.fn(),
    refreshData: vi.fn(),
    isEmergencyContact: vi.fn(),
    canPerformEmergencyAction: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
    useEmergencyControls.mockReturnValue(mockHookReturn);
  });

  describe('Rendering', () => {
    it('should render emergency controls dashboard', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('Emergency Controls')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Overrides')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        freezeStatus: null
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
    });

    it('should show error message', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        error: 'Test error message'
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Status Tab', () => {
    it('should show active wallet status', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        freezeStatus: {
          identityId: mockIdentity.did,
          isFrozen: false,
          freezeType: 'MANUAL',
          canUnfreeze: true,
          unfreezeRequiresApproval: false,
          emergencyContacts: [],
          pendingActions: []
        }
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Freeze Wallet')).toBeInTheDocument();
    });

    it('should show frozen wallet status', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        freezeStatus: {
          identityId: mockIdentity.did,
          isFrozen: true,
          freezeReason: 'Suspicious activity detected',
          frozenAt: '2024-01-01T00:00:00Z',
          freezeType: 'MANUAL',
          canUnfreeze: true,
          unfreezeRequiresApproval: false,
          emergencyContacts: [],
          pendingActions: []
        }
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('Frozen')).toBeInTheDocument();
      expect(screen.getByText('Suspicious activity detected')).toBeInTheDocument();
      expect(screen.getByText('Unfreeze')).toBeInTheDocument();
    });

    it('should show quick stats', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        emergencyContacts: [{ id: '1' }, { id: '2' }],
        pendingActions: [{ id: '1' }],
        activeOverrides: [{ id: '1' }, { id: '2' }, { id: '3' }]
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Emergency Contacts
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending Actions
      expect(screen.getByText('3')).toBeInTheDocument(); // Active Overrides
    });
  });

  describe('Contacts Tab', () => {
    it('should show empty state when no contacts', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      
      expect(screen.getByText('No emergency contacts configured')).toBeInTheDocument();
      expect(screen.getByText('Add trusted contacts who can help in emergencies')).toBeInTheDocument();
    });

    it('should show emergency contacts list', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        emergencyContacts: [
          {
            id: 'contact-1',
            name: 'Emergency Contact 1',
            contactType: 'TRUSTED_USER',
            priority: 1,
            canUnfreeze: true,
            canOverride: false
          },
          {
            id: 'contact-2',
            name: 'Emergency Contact 2',
            contactType: 'GUARDIAN',
            priority: 2,
            canUnfreeze: true,
            canOverride: true
          }
        ]
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      
      expect(screen.getByText('Emergency Contact 1')).toBeInTheDocument();
      expect(screen.getByText('Emergency Contact 2')).toBeInTheDocument();
      expect(screen.getByText('TRUSTED_USER')).toBeInTheDocument();
      expect(screen.getByText('GUARDIAN')).toBeInTheDocument();
    });

    it('should open add contact modal', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      fireEvent.click(screen.getByText('Add Contact'));
      
      expect(screen.getByText('Add Emergency Contact')).toBeInTheDocument();
      expect(screen.getByLabelText('Contact Identity ID')).toBeInTheDocument();
    });

    it('should remove emergency contact', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockRemoveContact = vi.fn().mockResolvedValue(true);
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        emergencyContacts: [
          {
            id: 'contact-1',
            name: 'Emergency Contact 1',
            contactType: 'TRUSTED_USER',
            priority: 1,
            canUnfreeze: true,
            canOverride: false
          }
        ],
        removeEmergencyContact: mockRemoveContact
      });

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('class')?.includes('text-red-600')
      );
      
      if (removeButton) {
        fireEvent.click(removeButton);
      }

      await waitFor(() => {
        expect(mockRemoveContact).toHaveBeenCalledWith('contact-1');
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Actions Tab', () => {
    it('should show empty state when no pending actions', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Actions'));
      
      expect(screen.getByText('No pending emergency actions')).toBeInTheDocument();
    });

    it('should show pending actions list', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        pendingActions: [
          {
            id: 'action-1',
            actionType: 'UNFREEZE',
            reason: 'Need access for emergency',
            timestamp: '2024-01-01T00:00:00Z',
            status: 'PENDING'
          },
          {
            id: 'action-2',
            actionType: 'OVERRIDE',
            reason: 'Limit bypass required',
            timestamp: '2024-01-01T01:00:00Z',
            status: 'APPROVED'
          }
        ]
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Actions'));
      
      expect(screen.getByText('UNFREEZE')).toBeInTheDocument();
      expect(screen.getByText('OVERRIDE')).toBeInTheDocument();
      expect(screen.getByText('Need access for emergency')).toBeInTheDocument();
      expect(screen.getByText('Limit bypass required')).toBeInTheDocument();
    });

    it('should approve emergency action', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockApproveAction = vi.fn().mockResolvedValue(true);
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        pendingActions: [
          {
            id: 'action-1',
            actionType: 'UNFREEZE',
            reason: 'Need access for emergency',
            timestamp: '2024-01-01T00:00:00Z',
            status: 'PENDING'
          }
        ],
        approveEmergencyAction: mockApproveAction
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Actions'));
      fireEvent.click(screen.getByText('Approve'));

      await waitFor(() => {
        expect(mockApproveAction).toHaveBeenCalledWith('action-1', 'APPROVE');
      });
    });
  });

  describe('Overrides Tab', () => {
    it('should show empty state when no active overrides', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Overrides'));
      
      expect(screen.getByText('No active administrative overrides')).toBeInTheDocument();
    });

    it('should show active overrides list', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        activeOverrides: [
          {
            id: 'override-1',
            overrideType: 'LIMIT_BYPASS',
            reason: 'Emergency transaction needed',
            expiresAt: '2024-01-02T00:00:00Z'
          },
          {
            id: 'override-2',
            overrideType: 'PERMISSION_GRANT',
            reason: 'Temporary access required',
            expiresAt: '2024-01-03T00:00:00Z'
          }
        ]
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Overrides'));
      
      expect(screen.getByText('LIMIT_BYPASS')).toBeInTheDocument();
      expect(screen.getByText('PERMISSION_GRANT')).toBeInTheDocument();
      expect(screen.getByText('Emergency transaction needed')).toBeInTheDocument();
      expect(screen.getByText('Temporary access required')).toBeInTheDocument();
    });

    it('should revoke administrative override', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockRevokeOverride = vi.fn().mockResolvedValue(true);
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        activeOverrides: [
          {
            id: 'override-1',
            overrideType: 'LIMIT_BYPASS',
            reason: 'Emergency transaction needed',
            expiresAt: '2024-01-02T00:00:00Z'
          }
        ],
        revokeAdminOverride: mockRevokeOverride
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Overrides'));
      fireEvent.click(screen.getByText('Revoke'));

      await waitFor(() => {
        expect(mockRevokeOverride).toHaveBeenCalledWith('override-1');
      });
    });
  });

  describe('Wallet Freeze Modal', () => {
    it('should open freeze wallet modal', () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        freezeStatus: {
          identityId: mockIdentity.did,
          isFrozen: false,
          freezeType: 'MANUAL',
          canUnfreeze: true,
          unfreezeRequiresApproval: false,
          emergencyContacts: [],
          pendingActions: []
        }
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Freeze Wallet'));
      
      expect(screen.getByText('Freeze Wallet')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason for freezing')).toBeInTheDocument();
    });

    it('should freeze wallet with reason', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockFreezeWallet = vi.fn().mockResolvedValue(true);
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        freezeStatus: {
          identityId: mockIdentity.did,
          isFrozen: false,
          freezeType: 'MANUAL',
          canUnfreeze: true,
          unfreezeRequiresApproval: false,
          emergencyContacts: [],
          pendingActions: []
        },
        freezeWallet: mockFreezeWallet
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Freeze Wallet'));
      
      const reasonInput = screen.getByLabelText('Reason for freezing');
      fireEvent.change(reasonInput, { target: { value: 'Suspicious activity detected' } });
      
      fireEvent.click(screen.getAllByText('Freeze Wallet')[1]); // The button in the modal

      await waitFor(() => {
        expect(mockFreezeWallet).toHaveBeenCalledWith('Suspicious activity detected', 'MANUAL');
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockRefreshData = vi.fn().mockResolvedValue(undefined);
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        refreshData: mockRefreshData
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      // Initially on Status tab
      expect(screen.getByText('Wallet Status')).toBeInTheDocument();
      
      // Switch to Contacts tab
      fireEvent.click(screen.getByText('Contacts'));
      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
      
      // Switch to Actions tab
      fireEvent.click(screen.getByText('Actions'));
      expect(screen.getByText('Pending Actions')).toBeInTheDocument();
      
      // Switch to Overrides tab
      fireEvent.click(screen.getByText('Overrides'));
      expect(screen.getByText('Active Overrides')).toBeInTheDocument();
    });
  });

  describe('Add Contact Modal', () => {
    it('should add emergency contact through modal', async () => {
      const { useEmergencyControls } = require('../../../hooks/useEmergencyControls');
      const mockAddContact = vi.fn().mockResolvedValue('new-contact-id');
      useEmergencyControls.mockReturnValue({
        ...mockHookReturn,
        addEmergencyContact: mockAddContact
      });

      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      fireEvent.click(screen.getByText('Add Contact'));
      
      // Fill out the form
      fireEvent.change(screen.getByLabelText('Contact Identity ID'), {
        target: { value: 'contact-identity-123' }
      });
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test Contact' }
      });
      fireEvent.change(screen.getByLabelText('Email (Optional)'), {
        target: { value: 'test@example.com' }
      });
      
      // Submit the form
      fireEvent.click(screen.getByText('Add Contact'));

      await waitFor(() => {
        expect(mockAddContact).toHaveBeenCalledWith(
          expect.objectContaining({
            contactId: 'contact-identity-123',
            name: 'Test Contact',
            email: 'test@example.com'
          })
        );
      });
    });

    it('should close modal when cancel is clicked', () => {
      render(<EmergencyControlsDashboard identity={mockIdentity} />);
      
      fireEvent.click(screen.getByText('Contacts'));
      fireEvent.click(screen.getByText('Add Contact'));
      
      expect(screen.getByText('Add Emergency Contact')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Add Emergency Contact')).not.toBeInTheDocument();
    });
  });
});