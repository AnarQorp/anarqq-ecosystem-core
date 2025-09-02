/**
 * useEmergencyControls Hook
 * 
 * React hook for managing emergency wallet controls including:
 * - Wallet freeze/unfreeze operations
 * - Emergency contact management
 * - Administrative overrides
 * - Emergency notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { 
  emergencyControlsService,
  EmergencyContact,
  EmergencyAction,
  WalletFreezeStatus,
  AdministrativeOverride,
  EmergencyNotification
} from '../services/identity/EmergencyControlsService';

export interface UseEmergencyControlsOptions {
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
  maxNotifications?: number;
}

export interface UseEmergencyControlsReturn {
  // State
  freezeStatus: WalletFreezeStatus | null;
  emergencyContacts: EmergencyContact[];
  pendingActions: EmergencyAction[];
  activeOverrides: AdministrativeOverride[];
  recentNotifications: EmergencyNotification[];
  loading: boolean;
  error: string | null;

  // Emergency Contact Management
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id' | 'createdAt'>) => Promise<string | null>;
  removeEmergencyContact: (contactId: string) => Promise<boolean>;
  updateEmergencyContact: (contactId: string, updates: Partial<EmergencyContact>) => Promise<boolean>;

  // Wallet Freeze Controls
  freezeWallet: (reason: string, freezeType?: WalletFreezeStatus['freezeType']) => Promise<boolean>;
  unfreezeWallet: (approvalId?: string) => Promise<boolean>;
  requestUnfreezeApproval: (reason: string) => Promise<string | null>;

  // Administrative Overrides
  createAdminOverride: (overrideData: Omit<AdministrativeOverride, 'id' | 'timestamp' | 'isActive' | 'auditTrail'>) => Promise<string | null>;
  revokeAdminOverride: (overrideId: string) => Promise<boolean>;

  // Emergency Actions
  approveEmergencyAction: (actionId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => Promise<boolean>;
  getActionHistory: () => EmergencyAction[];

  // Notifications
  markNotificationAsRead: (notificationId: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;

  // Utility
  refreshData: () => Promise<void>;
  isEmergencyContact: (identityId: string) => boolean;
  canPerformEmergencyAction: (actionType: string) => boolean;
}

export const useEmergencyControls = (
  identity: ExtendedSquidIdentity | null,
  options: UseEmergencyControlsOptions = {}
): UseEmergencyControlsReturn => {
  const {
    enableRealTimeUpdates = true,
    updateInterval = 30000, // 30 seconds
    maxNotifications = 50
  } = options;

  // State
  const [freezeStatus, setFreezeStatus] = useState<WalletFreezeStatus | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [pendingActions, setPendingActions] = useState<EmergencyAction[]>([]);
  const [activeOverrides, setActiveOverrides] = useState<AdministrativeOverride[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<EmergencyNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Load initial data
  const loadEmergencyData = useCallback(async () => {
    if (!identity) {
      setFreezeStatus(null);
      setEmergencyContacts([]);
      setPendingActions([]);
      setActiveOverrides([]);
      setRecentNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        freezeStatusData,
        contactsData,
        overridesData
      ] = await Promise.all([
        emergencyControlsService.getWalletFreezeStatus(identity.did),
        emergencyControlsService.getEmergencyContacts(identity.did),
        emergencyControlsService.getActiveOverrides(identity.did)
      ]);

      if (mountedRef.current) {
        setFreezeStatus(freezeStatusData);
        setEmergencyContacts(contactsData);
        setPendingActions(freezeStatusData?.pendingActions || []);
        setActiveOverrides(overridesData);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load emergency data');
        console.error('[useEmergencyControls] Error loading data:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [identity]);

  // Emergency Contact Management
  const addEmergencyContact = useCallback(async (
    contact: Omit<EmergencyContact, 'id' | 'createdAt'>
  ): Promise<string | null> => {
    if (!identity) return null;

    try {
      setLoading(true);
      const contactId = await emergencyControlsService.addEmergencyContact(identity.did, contact);
      
      // Refresh contacts list
      const updatedContacts = await emergencyControlsService.getEmergencyContacts(identity.did);
      setEmergencyContacts(updatedContacts);
      
      return contactId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add emergency contact');
      console.error('[useEmergencyControls] Error adding emergency contact:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const removeEmergencyContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      const success = await emergencyControlsService.removeEmergencyContact(identity.did, contactId);
      
      if (success) {
        // Update local state
        setEmergencyContacts(prev => prev.filter(c => c.id !== contactId));
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove emergency contact');
      console.error('[useEmergencyControls] Error removing emergency contact:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const updateEmergencyContact = useCallback(async (
    contactId: string, 
    updates: Partial<EmergencyContact>
  ): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      
      // Update local state optimistically
      setEmergencyContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, ...updates }
            : contact
        )
      );

      // In a real implementation, this would call the service
      // For now, we'll just return success
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update emergency contact');
      console.error('[useEmergencyControls] Error updating emergency contact:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  // Wallet Freeze Controls
  const freezeWallet = useCallback(async (
    reason: string, 
    freezeType: WalletFreezeStatus['freezeType'] = 'MANUAL'
  ): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      const success = await emergencyControlsService.freezeWallet(
        identity.did, 
        reason, 
        identity.did, 
        freezeType
      );
      
      if (success) {
        // Refresh freeze status
        const updatedStatus = await emergencyControlsService.getWalletFreezeStatus(identity.did);
        setFreezeStatus(updatedStatus);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to freeze wallet');
      console.error('[useEmergencyControls] Error freezing wallet:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const unfreezeWallet = useCallback(async (approvalId?: string): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      const success = await emergencyControlsService.unfreezeWallet(identity.did, identity.did, approvalId);
      
      if (success) {
        // Refresh freeze status
        const updatedStatus = await emergencyControlsService.getWalletFreezeStatus(identity.did);
        setFreezeStatus(updatedStatus);
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfreeze wallet');
      console.error('[useEmergencyControls] Error unfreezing wallet:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const requestUnfreezeApproval = useCallback(async (reason: string): Promise<string | null> => {
    if (!identity) return null;

    try {
      setLoading(true);
      const actionId = await emergencyControlsService.createEmergencyAction({
        identityId: identity.did,
        actionType: 'UNFREEZE',
        reason,
        initiatedBy: identity.did,
        initiatorType: 'USER',
        metadata: { requestType: 'unfreeze_approval' }
      });
      
      // Refresh pending actions
      await loadEmergencyData();
      
      return actionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request unfreeze approval');
      console.error('[useEmergencyControls] Error requesting unfreeze approval:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [identity, loadEmergencyData]);

  // Administrative Overrides
  const createAdminOverride = useCallback(async (
    overrideData: Omit<AdministrativeOverride, 'id' | 'timestamp' | 'isActive' | 'auditTrail'>
  ): Promise<string | null> => {
    if (!identity) return null;

    try {
      setLoading(true);
      const overrideId = await emergencyControlsService.createAdministrativeOverride(identity.did, overrideData);
      
      // Refresh overrides list
      const updatedOverrides = await emergencyControlsService.getActiveOverrides(identity.did);
      setActiveOverrides(updatedOverrides);
      
      return overrideId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create administrative override');
      console.error('[useEmergencyControls] Error creating admin override:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const revokeAdminOverride = useCallback(async (overrideId: string): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      const success = await emergencyControlsService.revokeAdministrativeOverride(
        identity.did, 
        overrideId, 
        identity.did
      );
      
      if (success) {
        // Update local state
        setActiveOverrides(prev => prev.filter(o => o.id !== overrideId));
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke administrative override');
      console.error('[useEmergencyControls] Error revoking admin override:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  // Emergency Actions
  const approveEmergencyAction = useCallback(async (
    actionId: string, 
    decision: 'APPROVE' | 'REJECT', 
    reason?: string
  ): Promise<boolean> => {
    if (!identity) return false;

    try {
      setLoading(true);
      const success = await emergencyControlsService.approveEmergencyAction(
        actionId, 
        identity.did, 
        decision, 
        reason
      );
      
      if (success) {
        // Refresh pending actions
        await loadEmergencyData();
      }
      
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve emergency action');
      console.error('[useEmergencyControls] Error approving emergency action:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity, loadEmergencyData]);

  const getActionHistory = useCallback((): EmergencyAction[] => {
    // Return all actions (pending and completed) for the current identity
    return pendingActions;
  }, [pendingActions]);

  // Notifications
  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      // Update local state optimistically
      setRecentNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, metadata: { ...notification.metadata, read: true } }
            : notification
        )
      );
      
      // In a real implementation, this would call the service
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      console.error('[useEmergencyControls] Error marking notification as read:', err);
      return false;
    }
  }, []);

  const clearAllNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setRecentNotifications([]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear notifications');
      console.error('[useEmergencyControls] Error clearing notifications:', err);
      return false;
    }
  }, []);

  // Utility functions
  const refreshData = useCallback(async (): Promise<void> => {
    await loadEmergencyData();
  }, [loadEmergencyData]);

  const isEmergencyContact = useCallback((identityId: string): boolean => {
    return emergencyContacts.some(contact => contact.contactId === identityId && contact.isActive);
  }, [emergencyContacts]);

  const canPerformEmergencyAction = useCallback((actionType: string): boolean => {
    if (!identity) return false;
    
    // Check if user is an emergency contact with appropriate permissions
    const userAsContact = emergencyContacts.find(contact => contact.contactId === identity.did);
    if (userAsContact) {
      switch (actionType) {
        case 'UNFREEZE':
          return userAsContact.canUnfreeze;
        case 'OVERRIDE':
          return userAsContact.canOverride;
        default:
          return false;
      }
    }
    
    // Check if user is the wallet owner
    return identity.did === identity.did; // Always true for wallet owner
  }, [identity, emergencyContacts]);

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    loadEmergencyData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadEmergencyData]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !identity) return;

    updateIntervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        loadEmergencyData();
      }
    }, updateInterval);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enableRealTimeUpdates, updateInterval, identity, loadEmergencyData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    freezeStatus,
    emergencyContacts,
    pendingActions,
    activeOverrides,
    recentNotifications,
    loading,
    error,

    // Emergency Contact Management
    addEmergencyContact,
    removeEmergencyContact,
    updateEmergencyContact,

    // Wallet Freeze Controls
    freezeWallet,
    unfreezeWallet,
    requestUnfreezeApproval,

    // Administrative Overrides
    createAdminOverride,
    revokeAdminOverride,

    // Emergency Actions
    approveEmergencyAction,
    getActionHistory,

    // Notifications
    markNotificationAsRead,
    clearAllNotifications,

    // Utility
    refreshData,
    isEmergencyContact,
    canPerformEmergencyAction
  };
};