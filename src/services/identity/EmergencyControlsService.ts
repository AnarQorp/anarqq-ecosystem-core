/**
 * Emergency Controls Service
 * 
 * Provides comprehensive emergency controls for wallet operations including:
 * - Wallet freeze/unfreeze functionality
 * - Emergency contact notification system
 * - Administrative override capabilities
 * - Emergency audit logging
 */

import { ExtendedSquidIdentity, IdentityType } from '../../types/identity';
import { NotificationService } from '../qsocial/NotificationService';
import { enhancedAuditService } from './EnhancedAuditService';
import { riskAssessmentService } from './RiskAssessmentService';

export interface EmergencyContact {
  id: string;
  identityId: string;
  contactId: string; // Identity ID of the emergency contact
  contactType: 'GUARDIAN' | 'ADMIN' | 'TRUSTED_USER' | 'SUPPORT';
  name: string;
  email?: string;
  phone?: string;
  priority: number; // 1 = highest priority
  canUnfreeze: boolean;
  canOverride: boolean;
  notificationMethods: ('EMAIL' | 'SMS' | 'IN_APP' | 'PUSH')[];
  createdAt: string;
  lastNotified?: string;
  isActive: boolean;
}

export interface EmergencyAction {
  id: string;
  identityId: string;
  actionType: 'FREEZE' | 'UNFREEZE' | 'OVERRIDE' | 'RESTRICT' | 'EMERGENCY_TRANSFER';
  reason: string;
  initiatedBy: string; // Identity ID of who initiated the action
  initiatorType: 'USER' | 'ADMIN' | 'SYSTEM' | 'EMERGENCY_CONTACT';
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
  approvals: EmergencyApproval[];
  metadata: Record<string, any>;
  expiresAt?: string;
  executedAt?: string;
  executedBy?: string;
}

export interface EmergencyApproval {
  id: string;
  actionId: string;
  approverId: string; // Identity ID of approver
  approverType: 'EMERGENCY_CONTACT' | 'ADMIN' | 'GUARDIAN';
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
  timestamp: string;
  signature?: string;
}

export interface WalletFreezeStatus {
  identityId: string;
  isFrozen: boolean;
  freezeReason?: string;
  frozenAt?: string;
  frozenBy?: string;
  freezeType: 'MANUAL' | 'AUTOMATIC' | 'EMERGENCY' | 'COMPLIANCE';
  canUnfreeze: boolean;
  unfreezeRequiresApproval: boolean;
  emergencyContacts: EmergencyContact[];
  pendingActions: EmergencyAction[];
}

export interface AdministrativeOverride {
  id: string;
  identityId: string;
  overrideType: 'LIMIT_BYPASS' | 'PERMISSION_GRANT' | 'EMERGENCY_ACCESS' | 'COMPLIANCE_OVERRIDE';
  originalValue: any;
  overrideValue: any;
  reason: string;
  adminId: string;
  adminSignature: string;
  timestamp: string;
  expiresAt: string;
  isActive: boolean;
  auditTrail: string[];
}

export interface EmergencyNotification {
  id: string;
  identityId: string;
  emergencyType: 'WALLET_FROZEN' | 'SUSPICIOUS_ACTIVITY' | 'OVERRIDE_REQUESTED' | 'EMERGENCY_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recipients: string[]; // Emergency contact IDs
  deliveryMethods: ('EMAIL' | 'SMS' | 'IN_APP' | 'PUSH')[];
  sentAt: string;
  deliveryStatus: Record<string, 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'>;
  metadata: Record<string, any>;
}

export class EmergencyControlsService {
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map();
  private emergencyActions: Map<string, EmergencyAction[]> = new Map();
  private walletFreezeStatus: Map<string, WalletFreezeStatus> = new Map();
  private administrativeOverrides: Map<string, AdministrativeOverride[]> = new Map();
  private emergencyNotifications: Map<string, EmergencyNotification[]> = new Map();

  constructor() {
    this.loadDataFromStorage();
  }

  // Emergency Contact Management
  async addEmergencyContact(identityId: string, contact: Omit<EmergencyContact, 'id' | 'createdAt'>): Promise<string> {
    try {
      const contactId = this.generateId();
      const newContact: EmergencyContact = {
        ...contact,
        id: contactId,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      const contacts = this.emergencyContacts.get(identityId) || [];
      contacts.push(newContact);
      this.emergencyContacts.set(identityId, contacts);

      await this.saveDataToStorage();
      
      // Log the addition
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'ADD_EMERGENCY_CONTACT',
        operationType: 'SECURITY',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          contactId,
          contactType: contact.contactType,
          canUnfreeze: contact.canUnfreeze,
          canOverride: contact.canOverride
        }
      });

      console.log(`[EmergencyControlsService] Added emergency contact ${contactId} for identity: ${identityId}`);
      return contactId;
    } catch (error) {
      console.error('[EmergencyControlsService] Error adding emergency contact:', error);
      throw error;
    }
  }

  async removeEmergencyContact(identityId: string, contactId: string): Promise<boolean> {
    try {
      const contacts = this.emergencyContacts.get(identityId) || [];
      const updatedContacts = contacts.filter(c => c.id !== contactId);
      
      if (contacts.length === updatedContacts.length) {
        return false; // Contact not found
      }

      this.emergencyContacts.set(identityId, updatedContacts);
      await this.saveDataToStorage();

      // Log the removal
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'REMOVE_EMERGENCY_CONTACT',
        operationType: 'SECURITY',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: { contactId }
      });

      console.log(`[EmergencyControlsService] Removed emergency contact ${contactId} for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EmergencyControlsService] Error removing emergency contact:', error);
      return false;
    }
  }

  async getEmergencyContacts(identityId: string): Promise<EmergencyContact[]> {
    return this.emergencyContacts.get(identityId) || [];
  }

  // Wallet Freeze/Unfreeze Functionality
  async freezeWallet(
    identityId: string, 
    reason: string, 
    initiatedBy: string,
    freezeType: WalletFreezeStatus['freezeType'] = 'MANUAL'
  ): Promise<boolean> {
    try {
      const existingStatus = this.walletFreezeStatus.get(identityId);
      if (existingStatus?.isFrozen) {
        console.warn(`[EmergencyControlsService] Wallet already frozen for identity: ${identityId}`);
        return false;
      }

      const emergencyContacts = await this.getEmergencyContacts(identityId);
      const freezeStatus: WalletFreezeStatus = {
        identityId,
        isFrozen: true,
        freezeReason: reason,
        frozenAt: new Date().toISOString(),
        frozenBy: initiatedBy,
        freezeType,
        canUnfreeze: freezeType !== 'COMPLIANCE',
        unfreezeRequiresApproval: freezeType === 'EMERGENCY' || freezeType === 'COMPLIANCE',
        emergencyContacts,
        pendingActions: []
      };

      this.walletFreezeStatus.set(identityId, freezeStatus);
      await this.saveDataToStorage();

      // Create emergency action record
      const actionId = await this.createEmergencyAction({
        identityId,
        actionType: 'FREEZE',
        reason,
        initiatedBy,
        initiatorType: this.determineInitiatorType(initiatedBy),
        metadata: { freezeType }
      });

      // Log the freeze
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'WALLET_FREEZE',
        operationType: 'SECURITY',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          reason,
          freezeType,
          initiatedBy,
          actionId
        }
      });

      // Notify emergency contacts
      await this.notifyEmergencyContacts(identityId, {
        emergencyType: 'WALLET_FROZEN',
        severity: freezeType === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
        message: `Wallet has been frozen. Reason: ${reason}`,
        metadata: { freezeType, actionId }
      });

      // Update risk assessment
      await riskAssessmentService.logAuditEvent({
        identityId,
        eventType: 'WALLET_FROZEN',
        severity: 'HIGH',
        description: `Wallet frozen: ${reason}`,
        metadata: { freezeType, initiatedBy }
      });

      console.log(`[EmergencyControlsService] Wallet frozen for identity: ${identityId}, reason: ${reason}`);
      return true;
    } catch (error) {
      console.error('[EmergencyControlsService] Error freezing wallet:', error);
      return false;
    }
  }

  async unfreezeWallet(identityId: string, initiatedBy: string, approvalId?: string): Promise<boolean> {
    try {
      const freezeStatus = this.walletFreezeStatus.get(identityId);
      if (!freezeStatus?.isFrozen) {
        console.warn(`[EmergencyControlsService] Wallet not frozen for identity: ${identityId}`);
        return false;
      }

      // Check if unfreeze requires approval
      if (freezeStatus.unfreezeRequiresApproval && !approvalId) {
        console.warn(`[EmergencyControlsService] Unfreeze requires approval for identity: ${identityId}`);
        return false;
      }

      // Validate approval if required
      if (approvalId) {
        const isValidApproval = await this.validateEmergencyApproval(approvalId, identityId);
        if (!isValidApproval) {
          console.warn(`[EmergencyControlsService] Invalid approval for unfreeze: ${approvalId}`);
          return false;
        }
      }

      // Update freeze status
      freezeStatus.isFrozen = false;
      freezeStatus.freezeReason = undefined;
      freezeStatus.frozenAt = undefined;
      freezeStatus.frozenBy = undefined;
      this.walletFreezeStatus.set(identityId, freezeStatus);
      await this.saveDataToStorage();

      // Create emergency action record
      const actionId = await this.createEmergencyAction({
        identityId,
        actionType: 'UNFREEZE',
        reason: 'Wallet unfrozen',
        initiatedBy,
        initiatorType: this.determineInitiatorType(initiatedBy),
        metadata: { approvalId }
      });

      // Log the unfreeze
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'WALLET_UNFREEZE',
        operationType: 'SECURITY',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          initiatedBy,
          actionId,
          approvalId
        }
      });

      // Notify emergency contacts
      await this.notifyEmergencyContacts(identityId, {
        emergencyType: 'WALLET_FROZEN',
        severity: 'MEDIUM',
        message: 'Wallet has been unfrozen and is now accessible.',
        metadata: { actionId, approvalId }
      });

      console.log(`[EmergencyControlsService] Wallet unfrozen for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EmergencyControlsService] Error unfreezing wallet:', error);
      return false;
    }
  }

  async isWalletFrozen(identityId: string): Promise<boolean> {
    const status = this.walletFreezeStatus.get(identityId);
    return status?.isFrozen || false;
  }

  async getWalletFreezeStatus(identityId: string): Promise<WalletFreezeStatus | null> {
    return this.walletFreezeStatus.get(identityId) || null;
  }

  // Administrative Override Capabilities
  async createAdministrativeOverride(
    identityId: string,
    overrideData: Omit<AdministrativeOverride, 'id' | 'timestamp' | 'isActive' | 'auditTrail'>
  ): Promise<string> {
    try {
      const overrideId = this.generateId();
      const override: AdministrativeOverride = {
        ...overrideData,
        id: overrideId,
        timestamp: new Date().toISOString(),
        isActive: true,
        auditTrail: []
      };

      const overrides = this.administrativeOverrides.get(identityId) || [];
      overrides.push(override);
      this.administrativeOverrides.set(identityId, overrides);
      await this.saveDataToStorage();

      // Log the override creation
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'ADMIN_OVERRIDE_CREATED',
        operationType: 'ADMINISTRATIVE',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          overrideId,
          overrideType: override.overrideType,
          adminId: override.adminId,
          reason: override.reason
        }
      });

      // Notify emergency contacts about the override
      await this.notifyEmergencyContacts(identityId, {
        emergencyType: 'OVERRIDE_REQUESTED',
        severity: 'HIGH',
        message: `Administrative override created: ${override.overrideType}`,
        metadata: { overrideId, adminId: override.adminId }
      });

      console.log(`[EmergencyControlsService] Created administrative override ${overrideId} for identity: ${identityId}`);
      return overrideId;
    } catch (error) {
      console.error('[EmergencyControlsService] Error creating administrative override:', error);
      throw error;
    }
  }

  async revokeAdministrativeOverride(identityId: string, overrideId: string, revokedBy: string): Promise<boolean> {
    try {
      const overrides = this.administrativeOverrides.get(identityId) || [];
      const override = overrides.find(o => o.id === overrideId);
      
      if (!override) {
        return false;
      }

      override.isActive = false;
      override.auditTrail.push(`Revoked by ${revokedBy} at ${new Date().toISOString()}`);
      
      this.administrativeOverrides.set(identityId, overrides);
      await this.saveDataToStorage();

      // Log the revocation
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'ADMIN_OVERRIDE_REVOKED',
        operationType: 'ADMINISTRATIVE',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          overrideId,
          revokedBy,
          originalType: override.overrideType
        }
      });

      console.log(`[EmergencyControlsService] Revoked administrative override ${overrideId} for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[EmergencyControlsService] Error revoking administrative override:', error);
      return false;
    }
  }

  async getActiveOverrides(identityId: string): Promise<AdministrativeOverride[]> {
    const overrides = this.administrativeOverrides.get(identityId) || [];
    return overrides.filter(o => o.isActive && new Date(o.expiresAt) > new Date());
  }

  // Emergency Action Management
  async createEmergencyAction(
    actionData: Omit<EmergencyAction, 'id' | 'timestamp' | 'status' | 'approvals'>
  ): Promise<string> {
    try {
      const actionId = this.generateId();
      const action: EmergencyAction = {
        ...actionData,
        id: actionId,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        approvals: []
      };

      const actions = this.emergencyActions.get(actionData.identityId) || [];
      actions.push(action);
      this.emergencyActions.set(actionData.identityId, actions);
      await this.saveDataToStorage();

      console.log(`[EmergencyControlsService] Created emergency action ${actionId} for identity: ${actionData.identityId}`);
      return actionId;
    } catch (error) {
      console.error('[EmergencyControlsService] Error creating emergency action:', error);
      throw error;
    }
  }

  async approveEmergencyAction(actionId: string, approverId: string, decision: 'APPROVE' | 'REJECT', reason?: string): Promise<boolean> {
    try {
      // Find the action across all identities
      let targetAction: EmergencyAction | null = null;
      let targetIdentityId: string | null = null;

      for (const [identityId, actions] of this.emergencyActions.entries()) {
        const action = actions.find(a => a.id === actionId);
        if (action) {
          targetAction = action;
          targetIdentityId = identityId;
          break;
        }
      }

      if (!targetAction || !targetIdentityId) {
        return false;
      }

      const approval: EmergencyApproval = {
        id: this.generateId(),
        actionId,
        approverId,
        approverType: 'EMERGENCY_CONTACT', // This could be determined based on the approver
        decision,
        reason,
        timestamp: new Date().toISOString()
      };

      targetAction.approvals.push(approval);
      
      // Update action status based on approvals
      if (decision === 'REJECT') {
        targetAction.status = 'REJECTED';
      } else {
        // Check if we have enough approvals (simplified logic)
        const approvals = targetAction.approvals.filter(a => a.decision === 'APPROVE');
        if (approvals.length >= 1) { // Simplified: require at least 1 approval
          targetAction.status = 'APPROVED';
        }
      }

      await this.saveDataToStorage();

      // Log the approval
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId: targetIdentityId,
        operation: 'EMERGENCY_ACTION_APPROVAL',
        operationType: 'SECURITY',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          actionId,
          approverId,
          decision,
          reason
        }
      });

      console.log(`[EmergencyControlsService] Emergency action ${actionId} ${decision.toLowerCase()}d by ${approverId}`);
      return true;
    } catch (error) {
      console.error('[EmergencyControlsService] Error approving emergency action:', error);
      return false;
    }
  }

  // Emergency Notification System
  async notifyEmergencyContacts(
    identityId: string,
    notificationData: Omit<EmergencyNotification, 'id' | 'recipients' | 'sentAt' | 'deliveryStatus'>
  ): Promise<string> {
    try {
      const emergencyContacts = await this.getEmergencyContacts(identityId);
      const recipients = emergencyContacts
        .filter(c => c.isActive)
        .sort((a, b) => a.priority - b.priority)
        .map(c => c.id);

      const notificationId = this.generateId();
      const notification: EmergencyNotification = {
        ...notificationData,
        id: notificationId,
        recipients,
        sentAt: new Date().toISOString(),
        deliveryStatus: {}
      };

      // Send notifications to each contact
      for (const contact of emergencyContacts.filter(c => c.isActive)) {
        try {
          // Send in-app notification
          if (contact.notificationMethods.includes('IN_APP')) {
            await NotificationService.createNotification({
              userId: contact.contactId,
              type: 'emergency',
              title: `Emergency: ${notification.emergencyType}`,
              message: notification.message,
              priority: 'HIGH',
              metadata: {
                identityId,
                emergencyType: notification.emergencyType,
                severity: notification.severity,
                ...notification.metadata
              }
            });
            notification.deliveryStatus[contact.id] = 'SENT';
          }

          // Update last notified timestamp
          contact.lastNotified = new Date().toISOString();
        } catch (error) {
          console.error(`[EmergencyControlsService] Error notifying contact ${contact.id}:`, error);
          notification.deliveryStatus[contact.id] = 'FAILED';
        }
      }

      const notifications = this.emergencyNotifications.get(identityId) || [];
      notifications.push(notification);
      this.emergencyNotifications.set(identityId, notifications);
      await this.saveDataToStorage();

      // Log the notification
      await enhancedAuditService.logOperation({
        id: this.generateId(),
        identityId,
        operation: 'EMERGENCY_NOTIFICATION_SENT',
        operationType: 'NOTIFICATION',
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          notificationId,
          emergencyType: notification.emergencyType,
          recipientCount: recipients.length,
          severity: notification.severity
        }
      });

      console.log(`[EmergencyControlsService] Sent emergency notification ${notificationId} to ${recipients.length} contacts`);
      return notificationId;
    } catch (error) {
      console.error('[EmergencyControlsService] Error sending emergency notifications:', error);
      throw error;
    }
  }

  // Utility Methods
  private determineInitiatorType(initiatorId: string): EmergencyAction['initiatorType'] {
    // This is a simplified implementation
    // In a real system, you'd check the identity type and permissions
    if (initiatorId.includes('admin')) return 'ADMIN';
    if (initiatorId.includes('system')) return 'SYSTEM';
    return 'USER';
  }

  private async validateEmergencyApproval(approvalId: string, identityId: string): Promise<boolean> {
    // Find the approval and validate it
    const actions = this.emergencyActions.get(identityId) || [];
    for (const action of actions) {
      const approval = action.approvals.find(a => a.id === approvalId);
      if (approval && approval.decision === 'APPROVE') {
        return true;
      }
    }
    return false;
  }

  private generateId(): string {
    return `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data Persistence
  private async loadDataFromStorage(): Promise<void> {
    try {
      const data = localStorage.getItem('emergency_controls_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.emergencyContacts = new Map(Object.entries(parsed.emergencyContacts || {}));
        this.emergencyActions = new Map(Object.entries(parsed.emergencyActions || {}));
        this.walletFreezeStatus = new Map(Object.entries(parsed.walletFreezeStatus || {}));
        this.administrativeOverrides = new Map(Object.entries(parsed.administrativeOverrides || {}));
        this.emergencyNotifications = new Map(Object.entries(parsed.emergencyNotifications || {}));
        console.log(`[EmergencyControlsService] Loaded emergency controls data from storage`);
      }
    } catch (error) {
      console.error('[EmergencyControlsService] Error loading data from storage:', error);
    }
  }

  private async saveDataToStorage(): Promise<void> {
    try {
      const data = {
        emergencyContacts: Object.fromEntries(this.emergencyContacts),
        emergencyActions: Object.fromEntries(this.emergencyActions),
        walletFreezeStatus: Object.fromEntries(this.walletFreezeStatus),
        administrativeOverrides: Object.fromEntries(this.administrativeOverrides),
        emergencyNotifications: Object.fromEntries(this.emergencyNotifications)
      };
      localStorage.setItem('emergency_controls_data', JSON.stringify(data));
    } catch (error) {
      console.error('[EmergencyControlsService] Error saving data to storage:', error);
    }
  }
}

// Singleton instance
export const emergencyControlsService = new EmergencyControlsService();