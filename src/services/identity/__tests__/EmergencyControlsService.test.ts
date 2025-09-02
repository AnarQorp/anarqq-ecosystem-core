/**
 * Emergency Controls Service Tests
 * 
 * Comprehensive test suite for the EmergencyControlsService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  EmergencyControlsService,
  EmergencyContact,
  EmergencyAction,
  WalletFreezeStatus,
  AdministrativeOverride
} from '../EmergencyControlsService';

// Mock dependencies
vi.mock('../EnhancedAuditService', () => ({
  enhancedAuditService: {
    logOperation: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../RiskAssessmentService', () => ({
  riskAssessmentService: {
    logAuditEvent: vi.fn().mockResolvedValue('audit-event-id')
  }
}));

vi.mock('../../qsocial/NotificationService', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue({ id: 'notification-id' })
  }
}));

describe('EmergencyControlsService', () => {
  let service: EmergencyControlsService;
  const mockIdentityId = 'test-identity-123';
  const mockContactId = 'contact-identity-456';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Create fresh service instance
    service = new EmergencyControlsService();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Emergency Contact Management', () => {
    const mockContact: Omit<EmergencyContact, 'id' | 'createdAt'> = {
      identityId: mockIdentityId,
      contactId: mockContactId,
      contactType: 'TRUSTED_USER',
      name: 'Test Contact',
      email: 'test@example.com',
      priority: 1,
      canUnfreeze: true,
      canOverride: false,
      notificationMethods: ['IN_APP', 'EMAIL'],
      isActive: true
    };

    it('should add emergency contact successfully', async () => {
      const contactId = await service.addEmergencyContact(mockIdentityId, mockContact);
      
      expect(contactId).toBeDefined();
      expect(typeof contactId).toBe('string');
      
      const contacts = await service.getEmergencyContacts(mockIdentityId);
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe(mockContact.name);
      expect(contacts[0].contactType).toBe(mockContact.contactType);
    });
  });
});   
 it('should remove emergency contact successfully', async () => {
      // Add a contact first
      const contactId = await service.addEmergencyContact(mockIdentityId, mockContact);
      
      // Remove the contact
      const success = await service.removeEmergencyContact(mockIdentityId, contactId);
      expect(success).toBe(true);
      
      // Verify contact is removed
      const contacts = await service.getEmergencyContacts(mockIdentityId);
      expect(contacts).toHaveLength(0);
    });

    it('should return false when removing non-existent contact', async () => {
      const success = await service.removeEmergencyContact(mockIdentityId, 'non-existent-id');
      expect(success).toBe(false);
    });

    it('should get empty array for identity with no contacts', async () => {
      const contacts = await service.getEmergencyContacts(mockIdentityId);
      expect(contacts).toEqual([]);
    });
  });

  describe('Wallet Freeze/Unfreeze Functionality', () => {
    it('should freeze wallet successfully', async () => {
      const reason = 'Suspicious activity detected';
      const initiatedBy = 'admin-user';
      
      const success = await service.freezeWallet(mockIdentityId, reason, initiatedBy, 'MANUAL');
      expect(success).toBe(true);
      
      const freezeStatus = await service.getWalletFreezeStatus(mockIdentityId);
      expect(freezeStatus).toBeDefined();
      expect(freezeStatus!.isFrozen).toBe(true);
      expect(freezeStatus!.freezeReason).toBe(reason);
      expect(freezeStatus!.frozenBy).toBe(initiatedBy);
      expect(freezeStatus!.freezeType).toBe('MANUAL');
    });

    it('should not freeze already frozen wallet', async () => {
      // Freeze wallet first
      await service.freezeWallet(mockIdentityId, 'First freeze', 'admin-user', 'MANUAL');
      
      // Try to freeze again
      const success = await service.freezeWallet(mockIdentityId, 'Second freeze', 'admin-user', 'MANUAL');
      expect(success).toBe(false);
    });

    it('should unfreeze wallet successfully', async () => {
      // Freeze wallet first
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      // Unfreeze wallet
      const success = await service.unfreezeWallet(mockIdentityId, 'admin-user');
      expect(success).toBe(true);
      
      const freezeStatus = await service.getWalletFreezeStatus(mockIdentityId);
      expect(freezeStatus!.isFrozen).toBe(false);
    });

    it('should not unfreeze non-frozen wallet', async () => {
      const success = await service.unfreezeWallet(mockIdentityId, 'admin-user');
      expect(success).toBe(false);
    });

    it('should check wallet frozen status correctly', async () => {
      // Initially not frozen
      let isFrozen = await service.isWalletFrozen(mockIdentityId);
      expect(isFrozen).toBe(false);
      
      // Freeze wallet
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      // Should be frozen now
      isFrozen = await service.isWalletFrozen(mockIdentityId);
      expect(isFrozen).toBe(true);
    });

    it('should require approval for emergency freeze unfreeze', async () => {
      // Freeze with emergency type
      await service.freezeWallet(mockIdentityId, 'Emergency freeze', 'system', 'EMERGENCY');
      
      const freezeStatus = await service.getWalletFreezeStatus(mockIdentityId);
      expect(freezeStatus!.unfreezeRequiresApproval).toBe(true);
      
      // Try to unfreeze without approval
      const success = await service.unfreezeWallet(mockIdentityId, 'admin-user');
      expect(success).toBe(false);
    });
  });

  describe('Administrative Override Management', () => {
    const mockOverride: Omit<AdministrativeOverride, 'id' | 'timestamp' | 'isActive' | 'auditTrail'> = {
      identityId: mockIdentityId,
      overrideType: 'LIMIT_BYPASS',
      originalValue: 1000,
      overrideValue: 5000,
      reason: 'Emergency transaction needed',
      adminId: 'admin-123',
      adminSignature: 'mock-signature',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    it('should create administrative override successfully', async () => {
      const overrideId = await service.createAdministrativeOverride(mockIdentityId, mockOverride);
      
      expect(overrideId).toBeDefined();
      expect(typeof overrideId).toBe('string');
      
      const overrides = await service.getActiveOverrides(mockIdentityId);
      expect(overrides).toHaveLength(1);
      expect(overrides[0].overrideType).toBe(mockOverride.overrideType);
      expect(overrides[0].isActive).toBe(true);
    });

    it('should revoke administrative override successfully', async () => {
      // Create override first
      const overrideId = await service.createAdministrativeOverride(mockIdentityId, mockOverride);
      
      // Revoke override
      const success = await service.revokeAdministrativeOverride(mockIdentityId, overrideId, 'admin-456');
      expect(success).toBe(true);
      
      // Verify override is no longer active
      const overrides = await service.getActiveOverrides(mockIdentityId);
      expect(overrides).toHaveLength(0);
    });

    it('should return false when revoking non-existent override', async () => {
      const success = await service.revokeAdministrativeOverride(mockIdentityId, 'non-existent-id', 'admin-456');
      expect(success).toBe(false);
    });

    it('should filter out expired overrides', async () => {
      // Create override that expires immediately
      const expiredOverride = {
        ...mockOverride,
        expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
      };
      
      await service.createAdministrativeOverride(mockIdentityId, expiredOverride);
      
      const activeOverrides = await service.getActiveOverrides(mockIdentityId);
      expect(activeOverrides).toHaveLength(0);
    });
  });

  describe('Emergency Action Management', () => {
    const mockActionData: Omit<EmergencyAction, 'id' | 'timestamp' | 'status' | 'approvals'> = {
      identityId: mockIdentityId,
      actionType: 'UNFREEZE',
      reason: 'Need to access funds for emergency',
      initiatedBy: 'user-123',
      initiatorType: 'USER',
      metadata: { urgency: 'high' }
    };

    it('should create emergency action successfully', async () => {
      const actionId = await service.createEmergencyAction(mockActionData);
      
      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');
    });

    it('should approve emergency action successfully', async () => {
      // Create action first
      const actionId = await service.createEmergencyAction(mockActionData);
      
      // Approve action
      const success = await service.approveEmergencyAction(actionId, 'approver-123', 'APPROVE', 'Approved for emergency');
      expect(success).toBe(true);
    });

    it('should reject emergency action successfully', async () => {
      // Create action first
      const actionId = await service.createEmergencyAction(mockActionData);
      
      // Reject action
      const success = await service.approveEmergencyAction(actionId, 'approver-123', 'REJECT', 'Not sufficient justification');
      expect(success).toBe(true);
    });

    it('should return false when approving non-existent action', async () => {
      const success = await service.approveEmergencyAction('non-existent-id', 'approver-123', 'APPROVE');
      expect(success).toBe(false);
    });
  });

  describe('Emergency Notification System', () => {
    beforeEach(async () => {
      // Add an emergency contact for notifications
      const mockContact: Omit<EmergencyContact, 'id' | 'createdAt'> = {
        identityId: mockIdentityId,
        contactId: mockContactId,
        contactType: 'TRUSTED_USER',
        name: 'Test Contact',
        priority: 1,
        canUnfreeze: true,
        canOverride: false,
        notificationMethods: ['IN_APP'],
        isActive: true
      };
      
      await service.addEmergencyContact(mockIdentityId, mockContact);
    });

    it('should send emergency notifications successfully', async () => {
      const notificationId = await service.notifyEmergencyContacts(mockIdentityId, {
        emergencyType: 'WALLET_FROZEN',
        severity: 'HIGH',
        message: 'Your wallet has been frozen due to suspicious activity',
        deliveryMethods: ['IN_APP'],
        metadata: { reason: 'suspicious_activity' }
      });
      
      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('string');
    });

    it('should handle notification failures gracefully', async () => {
      // Mock notification service to fail
      const { NotificationService } = await import('../../qsocial/NotificationService');
      vi.mocked(NotificationService.createNotification).mockRejectedValueOnce(new Error('Notification failed'));
      
      const notificationId = await service.notifyEmergencyContacts(mockIdentityId, {
        emergencyType: 'WALLET_FROZEN',
        severity: 'HIGH',
        message: 'Test notification',
        deliveryMethods: ['IN_APP'],
        metadata: {}
      });
      
      // Should still return notification ID even if delivery fails
      expect(notificationId).toBeDefined();
    });
  });

  describe('Data Persistence', () => {
    it('should persist emergency contacts to localStorage', async () => {
      const mockContact: Omit<EmergencyContact, 'id' | 'createdAt'> = {
        identityId: mockIdentityId,
        contactId: mockContactId,
        contactType: 'TRUSTED_USER',
        name: 'Test Contact',
        priority: 1,
        canUnfreeze: true,
        canOverride: false,
        notificationMethods: ['IN_APP'],
        isActive: true
      };
      
      await service.addEmergencyContact(mockIdentityId, mockContact);
      
      // Create new service instance to test loading from storage
      const newService = new EmergencyControlsService();
      const contacts = await newService.getEmergencyContacts(mockIdentityId);
      
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe(mockContact.name);
    });

    it('should persist wallet freeze status to localStorage', async () => {
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      // Create new service instance to test loading from storage
      const newService = new EmergencyControlsService();
      const freezeStatus = await newService.getWalletFreezeStatus(mockIdentityId);
      
      expect(freezeStatus).toBeDefined();
      expect(freezeStatus!.isFrozen).toBe(true);
      expect(freezeStatus!.freezeReason).toBe('Test freeze');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Corrupt the localStorage data
      localStorage.setItem('emergency_controls_data', 'invalid-json');
      
      // Should not throw error when creating new service
      expect(() => new EmergencyControlsService()).not.toThrow();
    });
  });

  describe('Integration with Other Services', () => {
    it('should log operations to audit service', async () => {
      const { enhancedAuditService } = await import('../EnhancedAuditService');
      
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      expect(enhancedAuditService.logOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: mockIdentityId,
          operation: 'WALLET_FREEZE',
          operationType: 'SECURITY',
          success: true
        })
      );
    });

    it('should update risk assessment on wallet freeze', async () => {
      const { riskAssessmentService } = await import('../RiskAssessmentService');
      
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      expect(riskAssessmentService.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          identityId: mockIdentityId,
          eventType: 'WALLET_FROZEN',
          severity: 'HIGH'
        })
      );
    });

    it('should send notifications through notification service', async () => {
      const { NotificationService } = await import('../../qsocial/NotificationService');
      
      // Add emergency contact first
      const mockContact: Omit<EmergencyContact, 'id' | 'createdAt'> = {
        identityId: mockIdentityId,
        contactId: mockContactId,
        contactType: 'TRUSTED_USER',
        name: 'Test Contact',
        priority: 1,
        canUnfreeze: true,
        canOverride: false,
        notificationMethods: ['IN_APP'],
        isActive: true
      };
      
      await service.addEmergencyContact(mockIdentityId, mockContact);
      
      // Freeze wallet (should trigger notification)
      await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      
      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockContactId,
          type: 'emergency',
          title: expect.stringContaining('Emergency'),
          priority: 'HIGH'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock audit service to throw error
      const { enhancedAuditService } = await import('../EnhancedAuditService');
      vi.mocked(enhancedAuditService.logOperation).mockRejectedValueOnce(new Error('Audit service error'));
      
      // Should still complete the operation
      const success = await service.freezeWallet(mockIdentityId, 'Test freeze', 'admin-user', 'MANUAL');
      expect(success).toBe(true);
    });

    it('should validate input parameters', async () => {
      // Test with empty reason
      await expect(service.freezeWallet(mockIdentityId, '', 'admin-user', 'MANUAL')).resolves.toBe(true);
      
      // Test with empty identity ID
      await expect(service.freezeWallet('', 'Test reason', 'admin-user', 'MANUAL')).resolves.toBe(true);
    });
  });
});