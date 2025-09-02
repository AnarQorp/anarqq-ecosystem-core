/**
 * useQonsentWallet Hook
 * Provides React integration for Qonsent wallet permission validation,
 * real-time permission checking, and permission change notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExtendedSquidIdentity } from '../types/identity';
import { ConfigUpdateEvent } from '../types/wallet-config';
import { 
  qonsentWalletService,
  WalletOperation,
  PermissionValidationResult,
  PermissionChangeNotification,
  QonsentPolicyUpdate
} from '../services/QonsentWalletService';

export interface UseQonsentWalletOptions {
  enableRealTimeChecking?: boolean;
  autoValidateOperations?: boolean;
  notificationPollingInterval?: number;
}

export interface UseQonsentWalletReturn {
  // Permission validation
  validatePermission: (operation: WalletOperation) => Promise<PermissionValidationResult>;
  lastValidationResult: PermissionValidationResult | null;
  
  // Real-time permission checking
  isRealTimeCheckingActive: boolean;
  startRealTimeChecking: () => Promise<boolean>;
  stopRealTimeChecking: () => Promise<boolean>;
  
  // Notifications
  pendingNotifications: PermissionChangeNotification[];
  acknowledgeNotification: (notificationId: string) => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Utilities
  clearError: () => void;
}

export const useQonsentWallet = (
  identity: ExtendedSquidIdentity | null,
  options: UseQonsentWalletOptions = {}
): UseQonsentWalletReturn => {
  const {
    enableRealTimeChecking = true,
    autoValidateOperations = false,
    notificationPollingInterval = 10000 // 10 seconds
  } = options;

  // State
  const [lastValidationResult, setLastValidationResult] = useState<PermissionValidationResult | null>(null);
  const [isRealTimeCheckingActive, setIsRealTimeCheckingActive] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PermissionChangeNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Identity ID for convenience
  const identityId = identity?.did || null;

  /**
   * Validate wallet operation permission
   */
  const validatePermission = useCallback(async (operation: WalletOperation): Promise<PermissionValidationResult> => {
    if (!identity) {
      const errorResult: PermissionValidationResult = {
        allowed: false,
        permission: {
          operation,
          allowed: false,
          reason: 'No identity selected'
        },
        warnings: ['Please select an identity before performing wallet operations'],
        suggestedActions: ['Switch to an active identity']
      };
      setLastValidationResult(errorResult);
      return errorResult;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await qonsentWalletService.validateWalletPermission(identity, operation);
      setLastValidationResult(result);

      // Log validation for debugging
      console.log(`[useQonsentWallet] Permission validation for ${operation.type}:`, {
        allowed: result.allowed,
        reason: result.permission.reason,
        warnings: result.warnings
      });

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission validation failed';
      setError(errorMessage);
      
      const errorResult: PermissionValidationResult = {
        allowed: false,
        permission: {
          operation,
          allowed: false,
          reason: errorMessage
        },
        warnings: ['Permission validation service error'],
        suggestedActions: ['Try again later', 'Contact support if issue persists']
      };
      
      setLastValidationResult(errorResult);
      return errorResult;

    } finally {
      setLoading(false);
    }
  }, [identity]);

  /**
   * Start real-time permission checking
   */
  const startRealTimeChecking = useCallback(async (): Promise<boolean> => {
    if (!identityId) {
      setError('No identity selected for real-time checking');
      return false;
    }

    if (isRealTimeCheckingActive) {
      return true; // Already active
    }

    try {
      setLoading(true);
      setError(null);

      const success = await qonsentWalletService.startRealTimePermissionChecking(identityId);
      
      if (success) {
        setIsRealTimeCheckingActive(true);
        
        // Subscribe to permission change events
        const unsubscribe = qonsentWalletService.subscribeToPermissionChanges(
          identityId,
          handlePermissionChange
        );
        unsubscribeRef.current = unsubscribe;

        console.log(`[useQonsentWallet] Started real-time permission checking for: ${identityId}`);
      } else {
        setError('Failed to start real-time permission checking');
      }

      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start real-time checking';
      setError(errorMessage);
      return false;

    } finally {
      setLoading(false);
    }
  }, [identityId, isRealTimeCheckingActive]);

  /**
   * Stop real-time permission checking
   */
  const stopRealTimeChecking = useCallback(async (): Promise<boolean> => {
    if (!identityId || !isRealTimeCheckingActive) {
      return true; // Already stopped or no identity
    }

    try {
      const success = await qonsentWalletService.stopRealTimePermissionChecking(identityId);
      
      if (success) {
        setIsRealTimeCheckingActive(false);
        
        // Unsubscribe from events
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        console.log(`[useQonsentWallet] Stopped real-time permission checking for: ${identityId}`);
      }

      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop real-time checking';
      setError(errorMessage);
      return false;
    }
  }, [identityId, isRealTimeCheckingActive]);

  /**
   * Handle permission change events
   */
  const handlePermissionChange = useCallback((event: ConfigUpdateEvent) => {
    console.log(`[useQonsentWallet] Permission change event:`, event);
    
    // Refresh notifications when permissions change
    refreshNotifications();
    
    // Clear last validation result as it may be outdated
    setLastValidationResult(null);
  }, []);

  /**
   * Refresh pending notifications
   */
  const refreshNotifications = useCallback(async (): Promise<void> => {
    if (!identityId) {
      setPendingNotifications([]);
      return;
    }

    try {
      const notifications = await qonsentWalletService.getPendingNotifications(identityId);
      setPendingNotifications(notifications);
      
    } catch (err) {
      console.error('[useQonsentWallet] Failed to refresh notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh notifications');
    }
  }, [identityId]);

  /**
   * Acknowledge a notification
   */
  const acknowledgeNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const success = await qonsentWalletService.acknowledgeNotification(notificationId);
      
      if (success) {
        // Remove from pending notifications
        setPendingNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
      }

      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge notification';
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Effect: Start/stop real-time checking based on identity and options
  useEffect(() => {
    if (identityId && enableRealTimeChecking) {
      startRealTimeChecking();
    } else if (!identityId && isRealTimeCheckingActive) {
      stopRealTimeChecking();
    }

    // Cleanup on unmount or identity change
    return () => {
      if (isRealTimeCheckingActive) {
        stopRealTimeChecking();
      }
    };
  }, [identityId, enableRealTimeChecking]);

  // Effect: Set up notification polling
  useEffect(() => {
    if (identityId && notificationPollingInterval > 0) {
      // Initial load
      refreshNotifications();

      // Set up polling
      const interval = setInterval(refreshNotifications, notificationPollingInterval);
      notificationIntervalRef.current = interval;

      return () => {
        if (notificationIntervalRef.current) {
          clearInterval(notificationIntervalRef.current);
          notificationIntervalRef.current = null;
        }
      };
    }
  }, [identityId, notificationPollingInterval, refreshNotifications]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop real-time checking
      if (isRealTimeCheckingActive && identityId) {
        qonsentWalletService.stopRealTimePermissionChecking(identityId);
      }

      // Unsubscribe from events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      // Clear notification polling
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, []);

  return {
    // Permission validation
    validatePermission,
    lastValidationResult,
    
    // Real-time permission checking
    isRealTimeCheckingActive,
    startRealTimeChecking,
    stopRealTimeChecking,
    
    // Notifications
    pendingNotifications,
    acknowledgeNotification,
    refreshNotifications,
    
    // State
    loading,
    error,
    
    // Utilities
    clearError
  };
};