/**
 * useQerberos - React Hook for Qerberos Security and Audit Logging
 * 
 * Provides security monitoring, audit logging, and integrity verification
 * for the AnarQ&Q ecosystem.
 */

import { useState, useCallback } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import * as QerberosAPI from '@/api/qerberos';

export interface AccessLogEntry {
  id: string;
  cid: string;
  identity: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  reason?: string;
  operation: 'UPLOAD' | 'DOWNLOAD' | 'DECRYPT' | 'VERIFY';
  metadata?: {
    fileSize?: number;
    fileName?: string;
    verificationResult?: boolean;
  };
}

export interface AccessStats {
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueCIDs: number;
  recentActivity: AccessLogEntry[];
}

export interface UseQerberosReturn {
  // State
  loading: boolean;
  error: string | null;
  
  // Logging
  logAccess: (event: Omit<AccessLogEntry, 'id' | 'timestamp'>) => Promise<boolean>;
  getAccessLogs: (limit?: number) => Promise<AccessLogEntry[]>;
  getAccessLogsForCID: (cid: string) => Promise<AccessLogEntry[]>;
  clearAccessLogs: () => Promise<boolean>;
  
  // Statistics
  getAccessStats: () => Promise<AccessStats | null>;
  
  // Integrity Verification
  verifyIntegrity: (cid: string, file: File) => Promise<boolean>;
  
  // Security Monitoring
  detectAnomalies: (logs: AccessLogEntry[]) => Promise<any[]>;
  checkSecurityThreats: (data: any) => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
}

export const useQerberos = (): UseQerberosReturn => {
  const { session, isAuthenticated } = useSessionContext();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logAccess = useCallback(async (
    event: Omit<AccessLogEntry, 'id' | 'timestamp'>
  ): Promise<boolean> => {
    try {
      setError(null);
      
      await QerberosAPI.logAccess(event);
      
      console.log(`[Qerberos] Logged ${event.operation} event: ${event.status}`);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log access';
      setError(errorMessage);
      console.error('Qerberos access logging error:', err);
      return false;
    }
  }, []);

  const getAccessLogs = useCallback(async (limit: number = 50): Promise<AccessLogEntry[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const logs = await QerberosAPI.getAccessLogs(limit);
      
      console.log(`[Qerberos] Retrieved ${logs.length} access logs`);
      
      return logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get access logs';
      setError(errorMessage);
      console.error('Qerberos access logs retrieval error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccessLogsForCID = useCallback(async (cid: string): Promise<AccessLogEntry[]> => {
    try {
      setError(null);
      
      const logs = await QerberosAPI.getAccessLogsForCID(cid);
      
      console.log(`[Qerberos] Retrieved ${logs.length} access logs for CID: ${cid.substring(0, 16)}...`);
      
      return logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get CID access logs';
      setError(errorMessage);
      console.error('Qerberos CID access logs error:', err);
      return [];
    }
  }, []);

  const clearAccessLogs = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      await QerberosAPI.clearAccessLogs();
      
      console.log('[Qerberos] Cleared all access logs');
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear access logs';
      setError(errorMessage);
      console.error('Qerberos clear logs error:', err);
      return false;
    }
  }, []);

  const getAccessStats = useCallback(async (): Promise<AccessStats | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await QerberosAPI.getAccessStats();
      
      console.log(`[Qerberos] Retrieved access statistics: ${stats.totalAccesses} total accesses`);
      
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get access stats';
      setError(errorMessage);
      console.error('Qerberos access stats error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyIntegrity = useCallback(async (cid: string, file: File): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const isValid = await QerberosAPI.verifyIntegrity(cid, file);
      
      // Log the verification attempt
      await logAccess({
        cid,
        identity: session?.did || session?.id || 'anonymous',
        status: isValid ? 'SUCCESS' : 'FAILED',
        operation: 'VERIFY',
        reason: isValid ? 'Integrity verification passed' : 'Integrity verification failed',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          verificationResult: isValid
        }
      });
      
      console.log(`[Qerberos] Integrity verification for ${file.name}: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify integrity';
      setError(errorMessage);
      console.error('Qerberos integrity verification error:', err);
      
      // Log the error
      await logAccess({
        cid,
        identity: session?.did || session?.id || 'anonymous',
        status: 'FAILED',
        operation: 'VERIFY',
        reason: `Verification error: ${errorMessage}`,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          verificationResult: false
        }
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, logAccess]);

  const detectAnomalies = useCallback(async (logs: AccessLogEntry[]): Promise<any[]> => {
    try {
      setError(null);
      
      const anomalies: any[] = [];
      
      // Simple anomaly detection algorithms
      
      // 1. Detect unusual access patterns (too many failed attempts)
      const failedAttempts = logs.filter(log => log.status === 'FAILED');
      const failureRate = failedAttempts.length / logs.length;
      
      if (failureRate > 0.3) { // More than 30% failures
        anomalies.push({
          type: 'high_failure_rate',
          severity: 'medium',
          description: `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
          affectedLogs: failedAttempts.length
        });
      }
      
      // 2. Detect rapid successive access attempts (potential brute force)
      const recentLogs = logs.slice(0, 10);
      const rapidAccess = recentLogs.filter((log, index) => {
        if (index === 0) return false;
        const prevLog = recentLogs[index - 1];
        const timeDiff = new Date(log.timestamp).getTime() - new Date(prevLog.timestamp).getTime();
        return timeDiff < 1000; // Less than 1 second apart
      });
      
      if (rapidAccess.length > 3) {
        anomalies.push({
          type: 'rapid_access_attempts',
          severity: 'high',
          description: `Detected ${rapidAccess.length} rapid access attempts`,
          affectedLogs: rapidAccess.length
        });
      }
      
      // 3. Detect access from unusual identities
      const identityFreq: Record<string, number> = {};
      logs.forEach(log => {
        identityFreq[log.identity] = (identityFreq[log.identity] || 0) + 1;
      });
      
      const unusualIdentities = Object.entries(identityFreq)
        .filter(([_, count]) => count === 1 && logs.length > 10)
        .map(([identity]) => identity);
      
      if (unusualIdentities.length > 0) {
        anomalies.push({
          type: 'unusual_identity_access',
          severity: 'low',
          description: `Access from ${unusualIdentities.length} unusual identities`,
          affectedIdentities: unusualIdentities
        });
      }
      
      console.log(`[Qerberos] Detected ${anomalies.length} anomalies in ${logs.length} logs`);
      
      return anomalies;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect anomalies';
      setError(errorMessage);
      console.error('Qerberos anomaly detection error:', err);
      return [];
    }
  }, []);

  const checkSecurityThreats = useCallback(async (data: any): Promise<boolean> => {
    try {
      setError(null);
      
      // Simple security threat detection
      const threats: string[] = [];
      
      // Check for suspicious patterns in data
      if (typeof data === 'string') {
        // Check for potential injection attempts
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /eval\s*\(/i,
          /document\./i,
          /window\./i
        ];
        
        suspiciousPatterns.forEach(pattern => {
          if (pattern.test(data)) {
            threats.push(`Suspicious pattern detected: ${pattern.source}`);
          }
        });
      }
      
      // Check for excessive data size (potential DoS)
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1024 * 1024) { // 1MB
        threats.push(`Excessive data size: ${dataSize} bytes`);
      }
      
      const isThreat = threats.length > 0;
      
      if (isThreat) {
        console.warn(`[Qerberos] Security threats detected:`, threats);
        
        // Log the threat detection
        await logAccess({
          cid: 'security-check',
          identity: session?.did || session?.id || 'anonymous',
          status: 'DENIED',
          operation: 'VERIFY',
          reason: `Security threats detected: ${threats.join(', ')}`,
          metadata: {
            threatCount: threats.length,
            dataSize
          }
        });
      } else {
        console.log('[Qerberos] No security threats detected');
      }
      
      return isThreat;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check security threats';
      setError(errorMessage);
      console.error('Qerberos security check error:', err);
      return false;
    }
  }, [session, logAccess]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    
    // Logging
    logAccess,
    getAccessLogs,
    getAccessLogsForCID,
    clearAccessLogs,
    
    // Statistics
    getAccessStats,
    
    // Integrity Verification
    verifyIntegrity,
    
    // Security Monitoring
    detectAnomalies,
    checkSecurityThreats,
    
    // Utilities
    clearError
  };
};