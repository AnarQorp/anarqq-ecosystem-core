/**
 * Privacy and Security Controls Hook
 * Provides React hooks for privacy enforcement, device verification, and data retention
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  privacySecurityService,
  DeviceFingerprint,
  DeviceVerificationResult,
  PrivacyAuditLog,
  EphemeralStorageConfig
} from '../services/identity/PrivacySecurityService';
import { PrivacySettings, SecuritySettings } from '../types/wallet-config';
import { IdentityType } from '../types/identity';
import { useActiveIdentity } from './useActiveIdentity';

export interface UsePrivacySecurityReturn {
  // Privacy Enforcement
  enforcePrivacy: (dataType: string, data: any, action: 'read' | 'write' | 'delete') => Promise<{ allowed: boolean; processedData?: any; reason: string }>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<boolean>;
  
  // Device Verification
  deviceFingerprint: DeviceFingerprint | null;
  deviceVerification: DeviceVerificationResult | null;
  verifyDevice: () => Promise<DeviceVerificationResult>;
  updateDeviceTrust: (deviceId: string, trustLevel: DeviceFingerprint['trustLevel']) => Promise<boolean>;
  
  // Ephemeral Storage (AID identities)
  isEphemeralEnabled: boolean;
  enableEphemeralStorage: () => Promise<boolean>;
  disableEphemeralStorage: () => Promise<boolean>;
  ephemeralConfig: EphemeralStorageConfig | null;
  
  // Data Retention
  performDataCleanup: () => Promise<{ cleaned: string[]; errors: string[] }>;
  scheduleCleanup: (dataType: string, retentionDays: number) => Promise<boolean>;
  
  // Audit and Monitoring
  privacyAuditLogs: PrivacyAuditLog[];
  exportPrivacyData: () => Promise<any>;
  
  // State
  loading: boolean;
  error: string | null;
}

export function usePrivacySecurity(): UsePrivacySecurityReturn {
  const { identity } = useActiveIdentity();
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [deviceVerification, setDeviceVerification] = useState<DeviceVerificationResult | null>(null);
  const [isEphemeralEnabled, setIsEphemeralEnabled] = useState(false);
  const [ephemeralConfig, setEphemeralConfig] = useState<EphemeralStorageConfig | null>(null);
  const [privacyAuditLogs, setPrivacyAuditLogs] = useState<PrivacyAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize privacy and security state
  useEffect(() => {
    if (identity) {
      initializePrivacySecurity();
    }
  }, [identity]);

  const initializePrivacySecurity = useCallback(async () => {
    if (!identity) return;

    setLoading(true);
    setError(null);

    try {
      // Generate device fingerprint
      const fingerprint = await privacySecurityService.generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Verify device
      const verification = await privacySecurityService.verifyDevice(identity.did, fingerprint);
      setDeviceVerification(verification);

      // Check ephemeral storage status (for AID identities)
      if (identity.type === IdentityType.AID) {
        const ephemeralEnabled = await privacySecurityService.isEphemeralStorageEnabled(identity.did);
        setIsEphemeralEnabled(ephemeralEnabled);
        
        if (ephemeralEnabled) {
          // Get ephemeral config if available
          const config = await privacySecurityService.exportPrivacyData(identity.did);
          setEphemeralConfig(config.ephemeralConfig || null);
        }
      }

      // Load privacy audit logs
      const logs = await privacySecurityService.getPrivacyAuditLog(identity.did, 50);
      setPrivacyAuditLogs(logs);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize privacy security');
      console.error('[usePrivacySecurity] Initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [identity]);

  // Privacy Enforcement
  const enforcePrivacy = useCallback(async (
    dataType: string,
    data: any,
    action: 'read' | 'write' | 'delete'
  ) => {
    if (!identity) {
      return { allowed: false, reason: 'No active identity' };
    }

    try {
      const result = await privacySecurityService.enforcePrivacyForIdentity(
        identity.did,
        dataType,
        data,
        action
      );

      // Refresh audit logs after privacy action
      const logs = await privacySecurityService.getPrivacyAuditLog(identity.did, 50);
      setPrivacyAuditLogs(logs);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Privacy enforcement failed';
      setError(errorMsg);
      return { allowed: false, reason: errorMsg };
    }
  }, [identity]);

  const updatePrivacySettings = useCallback(async (settings: Partial<PrivacySettings>) => {
    if (!identity) {
      setError('No active identity');
      return false;
    }

    try {
      setLoading(true);
      const success = await privacySecurityService.updatePrivacySettings(identity.did, settings);
      
      if (success) {
        // Refresh state if ephemeral storage setting changed
        if (settings.ephemeralStorage !== undefined && identity.type === IdentityType.AID) {
          setIsEphemeralEnabled(settings.ephemeralStorage);
          
          if (settings.ephemeralStorage) {
            const config = await privacySecurityService.exportPrivacyData(identity.did);
            setEphemeralConfig(config.ephemeralConfig || null);
          } else {
            setEphemeralConfig(null);
          }
        }

        // Refresh audit logs
        const logs = await privacySecurityService.getPrivacyAuditLog(identity.did, 50);
        setPrivacyAuditLogs(logs);
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  // Device Verification
  const verifyDevice = useCallback(async () => {
    if (!identity) {
      const errorResult: DeviceVerificationResult = {
        verified: false,
        deviceId: '',
        trustLevel: 'BLOCKED',
        riskScore: 100,
        reasons: ['No active identity'],
        requiresAdditionalAuth: true
      };
      setDeviceVerification(errorResult);
      return errorResult;
    }

    try {
      setLoading(true);
      const result = await privacySecurityService.verifyDevice(identity.did);
      setDeviceVerification(result);
      return result;
    } catch (err) {
      const errorResult: DeviceVerificationResult = {
        verified: false,
        deviceId: '',
        trustLevel: 'BLOCKED',
        riskScore: 100,
        reasons: [err instanceof Error ? err.message : 'Device verification failed'],
        requiresAdditionalAuth: true
      };
      setDeviceVerification(errorResult);
      setError(err instanceof Error ? err.message : 'Device verification failed');
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const updateDeviceTrust = useCallback(async (
    deviceId: string,
    trustLevel: DeviceFingerprint['trustLevel']
  ) => {
    try {
      const success = await privacySecurityService.updateDeviceTrustLevel(deviceId, trustLevel);
      
      if (success && deviceVerification && deviceVerification.deviceId === deviceId) {
        setDeviceVerification({
          ...deviceVerification,
          trustLevel,
          requiresAdditionalAuth: trustLevel !== 'TRUSTED'
        });
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device trust');
      return false;
    }
  }, [deviceVerification]);

  // Ephemeral Storage (AID identities only)
  const enableEphemeralStorage = useCallback(async () => {
    if (!identity || identity.type !== IdentityType.AID) {
      setError('Ephemeral storage only available for AID identities');
      return false;
    }

    try {
      setLoading(true);
      const success = await privacySecurityService.enableEphemeralStorage(identity.did);
      
      if (success) {
        setIsEphemeralEnabled(true);
        const config = await privacySecurityService.exportPrivacyData(identity.did);
        setEphemeralConfig(config.ephemeralConfig || null);
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable ephemeral storage');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const disableEphemeralStorage = useCallback(async () => {
    if (!identity) {
      setError('No active identity');
      return false;
    }

    try {
      setLoading(true);
      const success = await privacySecurityService.disableEphemeralStorage(identity.did);
      
      if (success) {
        setIsEphemeralEnabled(false);
        setEphemeralConfig(null);
      }

      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable ephemeral storage');
      return false;
    } finally {
      setLoading(false);
    }
  }, [identity]);

  // Data Retention
  const performDataCleanup = useCallback(async () => {
    if (!identity) {
      return { cleaned: [], errors: ['No active identity'] };
    }

    try {
      setLoading(true);
      const result = await privacySecurityService.performDataCleanup(identity.did);
      
      // Refresh audit logs after cleanup
      const logs = await privacySecurityService.getPrivacyAuditLog(identity.did, 50);
      setPrivacyAuditLogs(logs);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Data cleanup failed';
      setError(errorMsg);
      return { cleaned: [], errors: [errorMsg] };
    } finally {
      setLoading(false);
    }
  }, [identity]);

  const scheduleCleanup = useCallback(async (dataType: string, retentionDays: number) => {
    if (!identity) {
      setError('No active identity');
      return false;
    }

    try {
      return await privacySecurityService.scheduleDataCleanup(identity.did, dataType, retentionDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule cleanup');
      return false;
    }
  }, [identity]);

  // Audit and Monitoring
  const exportPrivacyData = useCallback(async () => {
    if (!identity) {
      throw new Error('No active identity');
    }

    try {
      return await privacySecurityService.exportPrivacyData(identity.did);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export privacy data');
      throw err;
    }
  }, [identity]);

  return {
    // Privacy Enforcement
    enforcePrivacy,
    updatePrivacySettings,
    
    // Device Verification
    deviceFingerprint,
    deviceVerification,
    verifyDevice,
    updateDeviceTrust,
    
    // Ephemeral Storage
    isEphemeralEnabled,
    enableEphemeralStorage,
    disableEphemeralStorage,
    ephemeralConfig,
    
    // Data Retention
    performDataCleanup,
    scheduleCleanup,
    
    // Audit and Monitoring
    privacyAuditLogs,
    exportPrivacyData,
    
    // State
    loading,
    error
  };
}

// Specialized hook for AID identity ephemeral storage
export function useEphemeralStorage() {
  const { identity } = useActiveIdentity();
  const {
    isEphemeralEnabled,
    enableEphemeralStorage,
    disableEphemeralStorage,
    ephemeralConfig,
    loading,
    error
  } = usePrivacySecurity();

  const isAIDIdentity = identity?.type === IdentityType.AID;

  return {
    isAIDIdentity,
    isEphemeralEnabled: isAIDIdentity ? isEphemeralEnabled : false,
    enableEphemeralStorage: isAIDIdentity ? enableEphemeralStorage : async () => false,
    disableEphemeralStorage: isAIDIdentity ? disableEphemeralStorage : async () => false,
    ephemeralConfig: isAIDIdentity ? ephemeralConfig : null,
    loading,
    error: isAIDIdentity ? error : null
  };
}

// Hook for device verification status
export function useDeviceVerification() {
  const {
    deviceFingerprint,
    deviceVerification,
    verifyDevice,
    updateDeviceTrust,
    loading,
    error
  } = usePrivacySecurity();

  const isDeviceTrusted = deviceVerification?.trustLevel === 'TRUSTED';
  const requiresAdditionalAuth = deviceVerification?.requiresAdditionalAuth || false;
  const riskScore = deviceVerification?.riskScore || 0;

  return {
    deviceFingerprint,
    deviceVerification,
    isDeviceTrusted,
    requiresAdditionalAuth,
    riskScore,
    verifyDevice,
    updateDeviceTrust,
    loading,
    error
  };
}

// Hook for privacy audit monitoring
export function usePrivacyAudit() {
  const {
    privacyAuditLogs,
    exportPrivacyData,
    performDataCleanup,
    loading,
    error
  } = usePrivacySecurity();

  const recentLogs = privacyAuditLogs.slice(-10);
  const deniedActions = privacyAuditLogs.filter(log => !log.allowed);
  const privacyViolations = deniedActions.length;

  return {
    privacyAuditLogs,
    recentLogs,
    deniedActions,
    privacyViolations,
    exportPrivacyData,
    performDataCleanup,
    loading,
    error
  };
}