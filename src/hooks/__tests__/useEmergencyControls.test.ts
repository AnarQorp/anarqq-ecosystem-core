/**
 * useEmergencyControls Hook Tests
 * 
 * Comprehensive test suite for the useEmergencyControls hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEmergencyControls } from '../useEmergencyControls';
import { ExtendedSquidIdentity } from '../../types/identity';

// Mock the emergency controls service
vi.mock('../../services/identity/EmergencyControlsService', () => ({
  emergencyControlsService: {
    getWalletFreezeStatus: vi.fn(),
    getEmergencyContacts: vi.fn(),
    getActiveOverrides: vi.fn(),
    addEmergencyContact: vi.fn(),
    removeEmergencyContact: vi.fn(),
    freezeWallet: vi.fn(),
    unfreezeWallet: vi.fn(),
    createEmergencyAction: vi.fn(),
    approveEmergencyAction: vi.fn(),
    createAdministrativeOverride: vi.fn(),
    revokeAdministrativeOverride: vi.fn()
  }
}));

describe('useEmergencyControls', () => {
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

  const mockFreezeStatus = {
    identityId: mockIdentity.did,
    isFrozen: false,
    freezeType: 'MANUAL' as const,
    canUnfreeze: true,
    unfreezeRequiresApproval: false,
    emergencyContacts: [],
    pendingActions: []
  };

  const mockEmergencyContact = {
    id: 'contact-1',
    identityId: mockIdentity.did,
    contactId: 'contact-identity-456',
    contactType: 'TRUSTED_USER' as const,
    name: 'Emergency Contact',
    priority: 1,
    canUnfreeze: true,
    canOverride: false,
    notificationMethods: ['IN_APP'] as const,
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
    emergencyControlsService.getWalletFreezeStatus.mockResolvedValue(mockFreezeStatus);
    emergencyControlsService.getEmergencyContacts.mockResolvedValue([mockEmergencyContact]);
    emergencyControlsService.getActiveOverrides.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty state when no identity provided', () => {
      const { result } = renderHook(() => useEmergencyControls(null));

      expect(result.current.freezeStatus).toBeNull();
      expect(result.current.emergencyContacts).toEqual([]);
      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.activeOverrides).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load emergency data when identity is provided', async () => {
      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.freezeStatus).toEqual(mockFreezeStatus);
      expect(result.current.emergencyContacts).toEqual([mockEmergencyContact]);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading errors gracefully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.getWalletFreezeStatus.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Service error');
    });
  });

  describe('Emergency Contact Management', () => {
    it('should add emergency contact successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.addEmergencyContact.mockResolvedValue('new-contact-id');
      emergencyControlsService.getEmergencyContacts.mockResolvedValue([
        mockEmergencyContact,
        { ...mockEmergencyContact, id: 'new-contact-id', name: 'New Contact' }
      ]);

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let contactId: string | null = null;
      await act(async () => {
        contactId = await result.current.addEmergencyContact({
          identityId: mockIdentity.did,
          contactId: 'new-contact-identity',
          contactType: 'GUARDIAN',
          name: 'New Contact',
          priority: 2,
          canUnfreeze: true,
          canOverride: true,
          notificationMethods: ['IN_APP'],
          isActive: true
        });
      });

      expect(contactId).toBe('new-contact-id');
      expect(result.current.emergencyContacts).toHaveLength(2);
    });

    it('should remove emergency contact successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.removeEmergencyContact.mockResolvedValue(true);

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.removeEmergencyContact('contact-1');
      });

      expect(success).toBe(true);
      expect(result.current.emergencyContacts).toHaveLength(0);
    });

    it('should handle contact management errors', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.addEmergencyContact.mockRejectedValue(new Error('Add contact failed'));

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let contactId: string | null = null;
      await act(async () => {
        contactId = await result.current.addEmergencyContact({
          identityId: mockIdentity.did,
          contactId: 'new-contact-identity',
          contactType: 'GUARDIAN',
          name: 'New Contact',
          priority: 2,
          canUnfreeze: true,
          canOverride: true,
          notificationMethods: ['IN_APP'],
          isActive: true
        });
      });

      expect(contactId).toBeNull();
      expect(result.current.error).toBe('Add contact failed');
    });
  });

  describe('Wallet Freeze Controls', () => {
    it('should freeze wallet successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.freezeWallet.mockResolvedValue(true);
      emergencyControlsService.getWalletFreezeStatus.mockResolvedValue({
        ...mockFreezeStatus,
        isFrozen: true,
        freezeReason: 'Test freeze'
      });

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.freezeWallet('Test freeze', 'MANUAL');
      });

      expect(success).toBe(true);
      expect(result.current.freezeStatus?.isFrozen).toBe(true);
    });

    it('should unfreeze wallet successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.unfreezeWallet.mockResolvedValue(true);
      emergencyControlsService.getWalletFreezeStatus.mockResolvedValue({
        ...mockFreezeStatus,
        isFrozen: false
      });

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.unfreezeWallet();
      });

      expect(success).toBe(true);
      expect(result.current.freezeStatus?.isFrozen).toBe(false);
    });

    it('should request unfreeze approval successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.createEmergencyAction.mockResolvedValue('action-id-123');

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let actionId: string | null = null;
      await act(async () => {
        actionId = await result.current.requestUnfreezeApproval('Need access for emergency');
      });

      expect(actionId).toBe('action-id-123');
    });
  });

  describe('Administrative Overrides', () => {
    it('should create admin override successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.createAdministrativeOverride.mockResolvedValue('override-id-123');
      emergencyControlsService.getActiveOverrides.mockResolvedValue([{
        id: 'override-id-123',
        identityId: mockIdentity.did,
        overrideType: 'LIMIT_BYPASS',
        originalValue: 1000,
        overrideValue: 5000,
        reason: 'Emergency override',
        adminId: 'admin-123',
        adminSignature: 'signature',
        timestamp: '2024-01-01T00:00:00Z',
        expiresAt: '2024-01-02T00:00:00Z',
        isActive: true,
        auditTrail: []
      }]);

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let overrideId: string | null = null;
      await act(async () => {
        overrideId = await result.current.createAdminOverride({
          identityId: mockIdentity.did,
          overrideType: 'LIMIT_BYPASS',
          originalValue: 1000,
          overrideValue: 5000,
          reason: 'Emergency override',
          adminId: 'admin-123',
          adminSignature: 'signature',
          expiresAt: '2024-01-02T00:00:00Z'
        });
      });

      expect(overrideId).toBe('override-id-123');
      expect(result.current.activeOverrides).toHaveLength(1);
    });

    it('should revoke admin override successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.revokeAdministrativeOverride.mockResolvedValue(true);

      // Start with an active override
      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.revokeAdminOverride('override-id-123');
      });

      expect(success).toBe(true);
    });
  });

  describe('Emergency Actions', () => {
    it('should approve emergency action successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.approveEmergencyAction.mockResolvedValue(true);

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.approveEmergencyAction('action-123', 'APPROVE', 'Approved for emergency');
      });

      expect(success).toBe(true);
    });

    it('should get action history', async () => {
      const mockActions = [
        {
          id: 'action-1',
          identityId: mockIdentity.did,
          actionType: 'UNFREEZE' as const,
          reason: 'Emergency access needed',
          initiatedBy: 'user-123',
          initiatorType: 'USER' as const,
          timestamp: '2024-01-01T00:00:00Z',
          status: 'PENDING' as const,
          approvals: [],
          metadata: {}
        }
      ];

      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      emergencyControlsService.getWalletFreezeStatus.mockResolvedValue({
        ...mockFreezeStatus,
        pendingActions: mockActions
      });

      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const actionHistory = result.current.getActionHistory();
      expect(actionHistory).toEqual(mockActions);
    });
  });

  describe('Utility Functions', () => {
    it('should identify emergency contacts correctly', async () => {
      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isContact = result.current.isEmergencyContact('contact-identity-456');
      expect(isContact).toBe(true);

      const isNotContact = result.current.isEmergencyContact('unknown-identity');
      expect(isNotContact).toBe(false);
    });

    it('should check emergency action permissions correctly', async () => {
      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Wallet owner should be able to perform actions
      const canUnfreeze = result.current.canPerformEmergencyAction('UNFREEZE');
      expect(canUnfreeze).toBe(true);
    });

    it('should refresh data successfully', async () => {
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      
      const { result } = renderHook(() => useEmergencyControls(mockIdentity));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshData();
      });

      // Should call the service methods again
      expect(emergencyControlsService.getWalletFreezeStatus).toHaveBeenCalledTimes(2);
      expect(emergencyControlsService.getEmergencyContacts).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-time Updates', () => {
    it('should update data at specified intervals', async () => {
      vi.useFakeTimers();
      
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      
      const { result } = renderHook(() => 
        useEmergencyControls(mockIdentity, { 
          enableRealTimeUpdates: true, 
          updateInterval: 5000 
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(emergencyControlsService.getWalletFreezeStatus).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should not update when real-time updates are disabled', async () => {
      vi.useFakeTimers();
      
      const { emergencyControlsService } = require('../../services/identity/EmergencyControlsService');
      
      const { result } = renderHook(() => 
        useEmergencyControls(mockIdentity, { 
          enableRealTimeUpdates: false 
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should only be called once during initialization
      expect(emergencyControlsService.getWalletFreezeStatus).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals on unmount', async () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { result, unmount } = renderHook(() => 
        useEmergencyControls(mockIdentity, { 
          enableRealTimeUpdates: true 
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });
});