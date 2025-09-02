/**
 * useQonsentWallet Hook Tests
 * Tests for React integration of Qonsent wallet permission validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQonsentWallet } from '../useQonsentWallet';
import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { WalletOperation } from '../../services/QonsentWalletService';
import * as QonsentWalletServiceModule from '../../services/QonsentWalletService';

// Mock the QonsentWalletService
const mockService = {
  validateWalletPermission: vi.fn(),
  startRealTimePermissionChecking: vi.fn(),
  stopRealTimePermissionChecking: vi.fn(),
  subscribeToPermissionChanges: vi.fn(),
  getPendingNotifications: vi.fn(),
  acknowledgeNotification: vi.fn()
};

vi.mock('../../services/QonsentWalletService', () => ({
  qonsentWalletService: mockService,
  WalletOperation: {},
  PermissionValidationResult: {},
  PermissionChangeNotification: {},
  QonsentPolicyUpdate: {}
}));

describe('useQonsentWallet', () => {
  let mockIdentity: ExtendedSquidIdentity;
  let mockOperation: WalletOperation;

  beforeEach(() => {
    mockIdentity = {
      did: 'test-identity-123',
      name: 'Test Identity',
      type: IdentityType.ROOT,
      rootId: 'test-identity-123',
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
      qonsentProfileId: 'qonsent-profile-123',
      qlockKeyPair: {
        publicKey: 'public-key',
        privateKey: 'private-key',
        algorithm: 'RSA',
        keySize: 2048,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: 'PUBLIC',
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

    mockOperation = {
      type: 'TRANSFER',
      amount: 1000,
      token: 'ETH',
      recipient: '0x1234567890123456789012345678901234567890'
    };

    // Setup default mock responses
    mockService.validateWalletPermission.mockResolvedValue({
      allowed: true,
      permission: {
        operation: mockOperation,
        allowed: true,
        reason: 'Operation permitted'
      },
      warnings: [],
      suggestedActions: []
    });

    mockService.startRealTimePermissionChecking.mockResolvedValue(true);
    mockService.stopRealTimePermissionChecking.mockResolvedValue(true);
    mockService.subscribeToPermissionChanges.mockReturnValue(() => {});
    mockService.getPendingNotifications.mockResolvedValue([]);
    mockService.acknowledgeNotification.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useQonsentWallet(null));

      expect(result.current.lastValidationResult).toBeNull();
      expect(result.current.isRealTimeCheckingActive).toBe(false);
      expect(result.current.pendingNotifications).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start real-time checking when identity is provided', async () => {
      renderHook(() => useQonsentWallet(mockIdentity, { enableRealTimeChecking: true }));

      await waitFor(() => {
        expect(mockService.startRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
      });
    });

    it('should not start real-time checking when disabled', () => {
      renderHook(() => useQonsentWallet(mockIdentity, { enableRealTimeChecking: false }));

      expect(mockService.startRealTimePermissionChecking).not.toHaveBeenCalled();
    });
  });

  describe('validatePermission', () => {
    it('should validate permission successfully', async () => {
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validatePermission(mockOperation);
      });

      expect(mockService.validateWalletPermission).toHaveBeenCalledWith(mockIdentity, mockOperation);
      expect(validationResult.allowed).toBe(true);
      expect(result.current.lastValidationResult).toEqual(validationResult);
    });

    it('should handle validation error', async () => {
      mockService.validateWalletPermission.mockRejectedValue(new Error('Validation failed'));
      
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validatePermission(mockOperation);
      });

      expect(validationResult.allowed).toBe(false);
      expect(validationResult.permission.reason).toBe('Validation failed');
      expect(result.current.error).toBe('Validation failed');
    });

    it('should return error result when no identity is selected', async () => {
      const { result } = renderHook(() => useQonsentWallet(null));

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validatePermission(mockOperation);
      });

      expect(validationResult.allowed).toBe(false);
      expect(validationResult.permission.reason).toBe('No identity selected');
      expect(validationResult.warnings).toContain('Please select an identity before performing wallet operations');
    });

    it('should set loading state during validation', async () => {
      let resolveValidation: (value: any) => void;
      const validationPromise = new Promise(resolve => {
        resolveValidation = resolve;
      });
      mockService.validateWalletPermission.mockReturnValue(validationPromise);

      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      act(() => {
        result.current.validatePermission(mockOperation);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveValidation({
          allowed: true,
          permission: { operation: mockOperation, allowed: true },
          warnings: [],
          suggestedActions: []
        });
        await validationPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('real-time permission checking', () => {
    it('should start real-time checking', async () => {
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      let success;
      await act(async () => {
        success = await result.current.startRealTimeChecking();
      });

      expect(success).toBe(true);
      expect(mockService.startRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
      expect(mockService.subscribeToPermissionChanges).toHaveBeenCalled();
    });

    it('should stop real-time checking', async () => {
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      await act(async () => {
        await result.current.startRealTimeChecking();
      });

      let success;
      await act(async () => {
        success = await result.current.stopRealTimeChecking();
      });

      expect(success).toBe(true);
      expect(mockService.stopRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should handle start real-time checking error', async () => {
      mockService.startRealTimePermissionChecking.mockResolvedValue(false);
      
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      let success;
      await act(async () => {
        success = await result.current.startRealTimeChecking();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to start real-time permission checking');
    });

    it('should return early when no identity is selected', async () => {
      const { result } = renderHook(() => useQonsentWallet(null));

      let success;
      await act(async () => {
        success = await result.current.startRealTimeChecking();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('No identity selected for real-time checking');
    });

    it('should return true if already active', async () => {
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      await act(async () => {
        await result.current.startRealTimeChecking();
      });

      // Mock the active state
      result.current.isRealTimeCheckingActive = true;

      let success;
      await act(async () => {
        success = await result.current.startRealTimeChecking();
      });

      expect(success).toBe(true);
    });
  });

  describe('notifications', () => {
    it('should refresh notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          identityId: mockIdentity.did,
          changeType: 'GRANTED' as const,
          operation: mockOperation,
          newPermission: {
            operation: mockOperation,
            allowed: true
          },
          timestamp: new Date().toISOString(),
          source: 'QONSENT_POLICY' as const,
          notificationSent: false,
          acknowledged: false
        }
      ];

      mockService.getPendingNotifications.mockResolvedValue(mockNotifications);
      
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(mockService.getPendingNotifications).toHaveBeenCalledWith(mockIdentity.did);
      expect(result.current.pendingNotifications).toEqual(mockNotifications);
    });

    it('should acknowledge notification', async () => {
      const notificationId = 'notification-1';
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      // Set up initial notification
      act(() => {
        result.current.pendingNotifications = [
          {
            id: notificationId,
            identityId: mockIdentity.did,
            changeType: 'GRANTED',
            operation: mockOperation,
            newPermission: {
              operation: mockOperation,
              allowed: true
            },
            timestamp: new Date().toISOString(),
            source: 'QONSENT_POLICY',
            notificationSent: false,
            acknowledged: false
          }
        ];
      });

      let success;
      await act(async () => {
        success = await result.current.acknowledgeNotification(notificationId);
      });

      expect(success).toBe(true);
      expect(mockService.acknowledgeNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should handle acknowledge notification error', async () => {
      mockService.acknowledgeNotification.mockRejectedValue(new Error('Acknowledge failed'));
      
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      let success;
      await act(async () => {
        success = await result.current.acknowledgeNotification('notification-1');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Acknowledge failed');
    });

    it('should clear notifications when no identity', async () => {
      const { result } = renderHook(() => useQonsentWallet(null));

      await act(async () => {
        await result.current.refreshNotifications();
      });

      expect(result.current.pendingNotifications).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useQonsentWallet(mockIdentity));

      act(() => {
        result.current.error = 'Test error';
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', () => {
      const unsubscribeMock = vi.fn();
      mockService.subscribeToPermissionChanges.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useQonsentWallet(mockIdentity));

      unmount();

      expect(mockService.stopRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
    });

    it('should cleanup on identity change', async () => {
      const { result, rerender } = renderHook(
        ({ identity }) => useQonsentWallet(identity),
        { initialProps: { identity: mockIdentity } }
      );

      await waitFor(() => {
        expect(mockService.startRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
      });

      // Change identity to null
      rerender({ identity: null });

      await waitFor(() => {
        expect(mockService.stopRealTimePermissionChecking).toHaveBeenCalledWith(mockIdentity.did);
      });
    });
  });

  describe('notification polling', () => {
    it('should set up notification polling', async () => {
      vi.useFakeTimers();
      
      renderHook(() => useQonsentWallet(mockIdentity, { notificationPollingInterval: 1000 }));

      // Initial call
      await waitFor(() => {
        expect(mockService.getPendingNotifications).toHaveBeenCalledWith(mockIdentity.did);
      });

      // Advance timer and check for polling
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockService.getPendingNotifications).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });

    it('should not poll when interval is 0', () => {
      vi.useFakeTimers();
      
      renderHook(() => useQonsentWallet(mockIdentity, { notificationPollingInterval: 0 }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockService.getPendingNotifications).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});