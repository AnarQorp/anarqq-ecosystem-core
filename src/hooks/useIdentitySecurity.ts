/**
 * Hook for Identity Security Operations
 * 
 * Provides React integration for identity security validation,
 * device fingerprinting, and suspicious activity detection.
 */

import { useState, useEffect, useCallback } from 'react';
import IdentitySecurityService, {
  DeviceFingerprint,
  SignatureVerificationRequest,
  SignatureVerificationResult,
  SecurityValidationRequest,
  SecurityValidationResult,
  SuspiciousActivityResult
} from '@/services/identity/IdentitySecurityService';
import { ExtendedSquidIdentity, AuditEntry, IdentityAction } from '@/types/identity';
import { useIdentityStore } from '@/state/identity';

export interface UseIdentitySecurityReturn {
  // Device fingerprinting
  deviceFingerprint: DeviceFingerprint | null;
  generateFingerprint: () => Promise<void>;
  isDeviceTrusted: (fingerprintId: string) => boolean;
  registerTrustedDevice: (fingerprint: DeviceFingerprint) => Promise<void>;
  
  // Signature verification
  verifySignature: (request: SignatureVerificationRequest) => Promise<SignatureVerificationResult>;
  
  // Security validation
  validateOperation: (request: SecurityValidationRequest) => Promise<SecurityValidationResult>;
  
  // Suspicious activity detection
  detectSuspiciousActivity: (identityId: string) => Promise<SuspiciousActivityResult>;
  
  // Security recommendations
  getSecurityRecommendations: (identity: ExtendedSquidIdentity) => string[];
  
  // State
  loading: boolean;
  error: string | null;
}

export const useIdentitySecurity = (): UseIdentitySecurityReturn => {
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getAuditLog } = useIdentityStore();
  const securityService = IdentitySecurityService.getInstance();

  // Generate device fingerprint on mount
  useEffect(() => {
    generateFingerprint();
  }, []);

  const generateFingerprint = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fingerprint = await securityService.generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate device fingerprint';
      setError(errorMessage);
      console.error('[useIdentitySecurity] Fingerprint generation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [securityService]);

  const isDeviceTrusted = useCallback((fingerprintId: string): boolean => {
    return securityService.isDeviceTrusted(fingerprintId);
  }, [securityService]);

  const registerTrustedDevice = useCallback(async (fingerprint: DeviceFingerprint) => {
    setLoading(true);
    setError(null);
    
    try {
      await securityService.registerTrustedDevice(fingerprint);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register trusted device';
      setError(errorMessage);
      console.error('[useIdentitySecurity] Device registration failed:', err);
    } finally {
      setLoading(false);
    }
  }, [securityService]);

  const verifySignature = useCallback(async (
    request: SignatureVerificationRequest
  ): Promise<SignatureVerificationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await securityService.verifySignature(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signature verification failed';
      setError(errorMessage);
      console.error('[useIdentitySecurity] Signature verification failed:', err);
      
      return {
        valid: false,
        algorithm: request.algorithm,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [securityService]);

  const validateOperation = useCallback(async (
    request: SecurityValidationRequest
  ): Promise<SecurityValidationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Add current device fingerprint if not provided
      if (!request.deviceFingerprint && deviceFingerprint) {
        request.deviceFingerprint = deviceFingerprint;
      }

      // Add audit logs to metadata if not provided
      if (!request.metadata?.auditLogs) {
        const auditLogs = await getAuditLog(request.identityId);
        request.metadata = {
          ...request.metadata,
          auditLogs
        };
      }

      const result = await securityService.validateIdentityOperation(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Security validation failed';
      setError(errorMessage);
      console.error('[useIdentitySecurity] Security validation failed:', err);
      
      return {
        valid: false,
        riskScore: 100,
        deviceTrust: 'UNKNOWN',
        securityFlags: [],
        recommendations: ['Security validation failed - operation blocked'],
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [securityService, deviceFingerprint, getAuditLog]);

  const detectSuspiciousActivity = useCallback(async (
    identityId: string
  ): Promise<SuspiciousActivityResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const auditLogs = await getAuditLog(identityId);
      const result = await securityService.detectSuspiciousActivity(identityId, auditLogs);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Suspicious activity detection failed';
      setError(errorMessage);
      console.error('[useIdentitySecurity] Suspicious activity detection failed:', err);
      
      return {
        detected: false,
        patterns: [],
        events: [],
        riskScore: 0,
        recommendations: []
      };
    } finally {
      setLoading(false);
    }
  }, [securityService, getAuditLog]);

  const getSecurityRecommendations = useCallback((
    identity: ExtendedSquidIdentity
  ): string[] => {
    try {
      return securityService.getSecurityRecommendations(identity);
    } catch (err) {
      console.error('[useIdentitySecurity] Failed to get security recommendations:', err);
      return ['Unable to generate security recommendations'];
    }
  }, [securityService]);

  return {
    deviceFingerprint,
    generateFingerprint,
    isDeviceTrusted,
    registerTrustedDevice,
    verifySignature,
    validateOperation,
    detectSuspiciousActivity,
    getSecurityRecommendations,
    loading,
    error
  };
};

// Convenience hooks for specific security operations

/**
 * Hook for device fingerprinting only
 */
export const useDeviceFingerprinting = () => {
  const { 
    deviceFingerprint, 
    generateFingerprint, 
    isDeviceTrusted, 
    registerTrustedDevice,
    loading,
    error 
  } = useIdentitySecurity();

  return {
    deviceFingerprint,
    generateFingerprint,
    isDeviceTrusted,
    registerTrustedDevice,
    loading,
    error
  };
};

/**
 * Hook for signature verification only
 */
export const useSignatureVerification = () => {
  const { verifySignature, loading, error } = useIdentitySecurity();

  return {
    verifySignature,
    loading,
    error
  };
};

/**
 * Hook for suspicious activity detection only
 */
export const useSuspiciousActivityDetection = () => {
  const { detectSuspiciousActivity, loading, error } = useIdentitySecurity();

  return {
    detectSuspiciousActivity,
    loading,
    error
  };
};

/**
 * Hook for security validation with automatic device fingerprinting
 */
export const useSecurityValidation = () => {
  const { 
    validateOperation, 
    deviceFingerprint, 
    generateFingerprint,
    loading, 
    error 
  } = useIdentitySecurity();

  // Enhanced validation that ensures device fingerprint is available
  const validateWithFingerprint = useCallback(async (
    request: Omit<SecurityValidationRequest, 'deviceFingerprint'>
  ): Promise<SecurityValidationResult> => {
    // Generate fingerprint if not available
    if (!deviceFingerprint) {
      await generateFingerprint();
    }

    return validateOperation({
      ...request,
      deviceFingerprint: deviceFingerprint || undefined
    });
  }, [validateOperation, deviceFingerprint, generateFingerprint]);

  return {
    validateOperation: validateWithFingerprint,
    deviceFingerprint,
    loading,
    error
  };
};

export default useIdentitySecurity;