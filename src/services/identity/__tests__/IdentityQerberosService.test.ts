/**
 * Integration Tests for IdentityQerberosService
 * Tests comprehensive audit logging and security monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityQerberosService } from '../IdentityQerberosService';
import { 
  IdentityAction,
  SecurityFlag
} from '@/types/identity';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

Object.defineProperty(console, 'log', { value: consoleMock.log });
Object.defineProperty(console, 'error', { value: consoleMock.error });
Object.defineProperty(console, 'warn', { value: consoleMock.warn });

describe('IdentityQerberosService', () => {
  let service: IdentityQerberosService;
  const testIdentityId = 'did:squid:test-123';
  const testIdentityId2 = 'did:squid:test-456';

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Create fresh service instance
    service = new IdentityQerberosService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Identity Action Logging', () => {
    it('should log identity action with comprehensive metadata', async () => {
      const metadata = {
        triggeredBy: 'user',
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'device-123'
      };

      const logId = await service.logIdentityAction(testIdentityId, IdentityAction.CREATED, metadata);

      expect(logId).toBeDefined();
      expect(typeof logId).toBe('string');
      expect(logId).toMatch(/^audit-/);

      // Verify the log was stored
      const auditLog = await service.getIdentityAuditLog(testIdentityId);
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].identityId).toBe(testIdentityId);
      expect(auditLog[0].action).toBe(IdentityAction.CREATED);
      expect(auditLog[0].metadata.triggeredBy).toBe('user');
      expect(auditLog[0].metadata.ipAddress).toBe('192.168.1.1');
      expect(auditLog[0].metadata.deviceFingerprint).toBe('device-123');
      expect(auditLog[0].metadata.securityLevel).toBe('HIGH');
    });

    it('should determine correct security levels for different actions', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
      await service.logIdentityAction(testIdentityId, IdentityAction.SECURITY_EVENT);

      const auditLog = await service.getIdentityAuditLog(testIdentityId);
      
      expect(auditLog[2].metadata.securityLevel).toBe('HIGH'); // CREATED
      expect(auditLog[1].metadata.securityLevel).toBe('MEDIUM'); // SWITCHED
      expect(auditLog[0].metadata.securityLevel).toBe('CRITICAL'); // SECURITY_EVENT
    });

    it('should limit audit log size per identity', async () => {
      // Log more than the limit (1000 entries)
      for (let i = 0; i < 1005; i++) {
        await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED, { iteration: i });
      }

      const auditLog = await service.getIdentityAuditLog(testIdentityId, 2000);
      expect(auditLog).toHaveLength(1000); // Should be capped at 1000
    });

    it('should retrieve audit entry by ID', async () => {
      const logId = await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      
      const entry = await service.getAuditLogById(logId);
      
      expect(entry).toBeDefined();
      expect(entry!.id).toBe(logId);
      expect(entry!.identityId).toBe(testIdentityId);
      expect(entry!.action).toBe(IdentityAction.CREATED);
    });

    it('should return null for non-existent audit entry', async () => {
      const entry = await service.getAuditLogById('non-existent-id');
      
      expect(entry).toBeNull();
    });
  });

  describe('Security Event Detection', () => {
    it('should detect suspicious activity from multiple high-security events', async () => {
      // Log multiple high-security events within an hour
      for (let i = 0; i < 4; i++) {
        await service.logIdentityAction(testIdentityId, IdentityAction.SECURITY_EVENT);
      }

      const events = await service.detectSecurityEvents(testIdentityId);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('SUSPICIOUS_ACTIVITY');
      expect(events[0].severity).toBe('HIGH');
      expect(events[0].identityId).toBe(testIdentityId);
      expect(events[0].description).toContain('Multiple high-security events detected');
    });

    it('should detect unusual access patterns', async () => {
      // Mock unusual access times (night hours)
      const originalDate = Date;
      const mockDate = vi.fn();
      
      // Mock multiple accesses during night hours
      for (let i = 0; i < 6; i++) {
        const nightTime = new Date();
        nightTime.setHours(2); // 2 AM
        mockDate.mockReturnValueOnce(nightTime);
        global.Date = mockDate as any;
        
        await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
        
        global.Date = originalDate;
      }

      const events = await service.detectSecurityEvents(testIdentityId);

      expect(events.length).toBeGreaterThan(0);
      const unusualPatternEvent = events.find(e => e.type === 'UNUSUAL_PATTERN');
      expect(unusualPatternEvent).toBeDefined();
      expect(unusualPatternEvent!.severity).toBe('MEDIUM');
    });

    it('should flag security events', async () => {
      const flag: SecurityFlag = {
        id: 'flag-123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test security flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      const success = await service.flagSecurityEvent(testIdentityId, flag);
      expect(success).toBe(true);

      const flags = await service.getSecurityFlags(testIdentityId);
      expect(flags).toHaveLength(1);
      expect(flags[0]).toEqual(flag);
    });

    it('should resolve security flags', async () => {
      const flag: SecurityFlag = {
        id: 'flag-123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test security flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await service.flagSecurityEvent(testIdentityId, flag);
      
      const success = await service.resolveSecurityFlag('flag-123', 'admin-user');
      expect(success).toBe(true);

      const flags = await service.getSecurityFlags(testIdentityId);
      expect(flags[0].resolved).toBe(true);
      expect(flags[0].resolvedBy).toBe('admin-user');
      expect(flags[0].resolvedAt).toBeDefined();
    });
  });

  describe('Audit Trail Management', () => {
    it('should create audit trail for operations', async () => {
      const operation = 'create_subidentity';
      const details = { type: 'DAO', name: 'Test DAO' };

      const trailId = await service.createAuditTrail(testIdentityId, operation, details);

      expect(trailId).toBeDefined();
      
      const auditLog = await service.getIdentityAuditLog(testIdentityId);
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].metadata.operation).toBe(operation);
      expect(auditLog[0].metadata.details).toEqual(details);
      expect(auditLog[0].metadata.auditTrail).toBe(true);
    });

    it('should get audit trail within date range', async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 2); // 2 hours ago
      
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1); // 1 hour from now

      // Log some actions
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);

      const trail = await service.getAuditTrail(
        testIdentityId, 
        startDate.toISOString(), 
        endDate.toISOString()
      );

      expect(trail).toHaveLength(2);
    });

    it('should export audit trail in JSON format', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);

      const exportData = await service.exportAuditTrail(testIdentityId, 'JSON');

      expect(exportData).toBeDefined();
      const parsed = JSON.parse(exportData);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should export audit trail in CSV format', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);

      const exportData = await service.exportAuditTrail(testIdentityId, 'CSV');

      expect(exportData).toBeDefined();
      const lines = exportData.split('\n');
      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[0]).toContain('ID,Identity ID,Action,Timestamp');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect frequency anomalies', async () => {
      // Log many actions of the same type to trigger frequency anomaly
      for (let i = 0; i < 10; i++) {
        await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
      }
      
      // Log a few of another type for comparison
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);

      const report = await service.detectAnomalies(testIdentityId, 24);

      expect(report).toBeDefined();
      expect(report.identityId).toBe(testIdentityId);
      expect(report.anomalies.length).toBeGreaterThan(0);
      
      const frequencyAnomaly = report.anomalies.find(a => a.type === 'FREQUENCY');
      expect(frequencyAnomaly).toBeDefined();
      expect(frequencyAnomaly!.description).toContain('Unusually high frequency');
    });

    it('should detect timing anomalies', async () => {
      // Mock night-time accesses
      const originalDate = Date;
      
      for (let i = 0; i < 5; i++) {
        const mockDate = vi.fn();
        const nightTime = new Date();
        nightTime.setHours(3); // 3 AM
        mockDate.mockReturnValueOnce(nightTime);
        global.Date = mockDate as any;
        
        await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
        
        global.Date = originalDate;
      }

      const report = await service.detectAnomalies(testIdentityId, 24);

      expect(report).toBeDefined();
      const timingAnomaly = report.anomalies.find(a => a.type === 'TIMING');
      expect(timingAnomaly).toBeDefined();
      expect(timingAnomaly!.description).toContain('Unusual access timing');
    });

    it('should calculate risk score based on anomalies', async () => {
      // Create conditions for multiple anomalies
      for (let i = 0; i < 15; i++) {
        await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
      }

      const report = await service.detectAnomalies(testIdentityId, 24);

      expect(report).toBeDefined();
      expect(report.riskScore).toBeGreaterThan(0);
      expect(report.riskScore).toBeLessThanOrEqual(10);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Access Pattern Analysis', () => {
    it('should analyze access patterns and build behavior profile', async () => {
      // Log various actions to create patterns
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);

      const analysis = await service.analyzeAccessPatterns(testIdentityId);

      expect(analysis).toBeDefined();
      expect(analysis.identityId).toBe(testIdentityId);
      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(analysis.normalBehavior).toBeDefined();
      expect(analysis.normalBehavior.averageSessionDuration).toBeDefined();
      expect(analysis.normalBehavior.commonAccessTimes).toBeDefined();
      expect(analysis.normalBehavior.frequentActions).toBeDefined();
    });

    it('should detect pattern deviations', async () => {
      // Create normal pattern first
      for (let i = 0; i < 5; i++) {
        await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);
      }

      const analysis = await service.analyzeAccessPatterns(testIdentityId);

      expect(analysis).toBeDefined();
      expect(analysis.deviations).toBeDefined();
      expect(Array.isArray(analysis.deviations)).toBe(true);
    });
  });

  describe('Compliance and Reporting', () => {
    it('should generate compliance report', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.UPDATED);

      const report = await service.generateComplianceReport(testIdentityId, '2024-Q1');

      expect(report).toBeDefined();
      expect(report.identityId).toBe(testIdentityId);
      expect(report.period).toBe('2024-Q1');
      expect(report.auditTrailCompleteness).toBeGreaterThan(0);
      expect(typeof report.dataRetentionCompliance).toBe('boolean');
      expect(report.securityEventResponse).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should get data retention status', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);

      const status = await service.getDataRetentionStatus(testIdentityId);

      expect(status).toBeDefined();
      expect(status.identityId).toBe(testIdentityId);
      expect(status.totalRecords).toBeGreaterThan(0);
      expect(status.retainedRecords).toBeGreaterThanOrEqual(0);
      expect(status.expiredRecords).toBeGreaterThanOrEqual(0);
      expect(status.nextPurgeDate).toBeDefined();
      expect(status.retentionPolicy).toBe('1 year');
    });
  });

  describe('Cross-Identity Analysis', () => {
    it('should detect cross-identity patterns', async () => {
      // Log actions for multiple identities
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId, IdentityAction.SWITCHED);
      
      await service.logIdentityAction(testIdentityId2, IdentityAction.CREATED);
      await service.logIdentityAction(testIdentityId2, IdentityAction.SWITCHED);

      const analysis = await service.detectCrossIdentityPatterns([testIdentityId, testIdentityId2]);

      expect(analysis).toBeDefined();
      expect(analysis.identityIds).toEqual([testIdentityId, testIdentityId2]);
      expect(Array.isArray(analysis.correlations)).toBe(true);
      expect(Array.isArray(analysis.sharedPatterns)).toBe(true);
      expect(analysis.riskAssessment).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis.riskAssessment);
    });

    it('should correlate security events within time window', async () => {
      // Create security events for different identities
      const flag1: SecurityFlag = {
        id: 'flag-1',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test flag 1',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      const flag2: SecurityFlag = {
        id: 'flag-2',
        type: 'UNUSUAL_PATTERN',
        severity: 'MEDIUM',
        description: 'Test flag 2',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await service.flagSecurityEvent(testIdentityId, flag1);
      await service.flagSecurityEvent(testIdentityId2, flag2);

      // Trigger security event detection to create events
      await service.detectSecurityEvents(testIdentityId);
      await service.detectSecurityEvents(testIdentityId2);

      const correlatedEvents = await service.correlateSecurityEvents(1); // 1 hour window

      expect(Array.isArray(correlatedEvents)).toBe(true);
    });
  });

  describe('Integration Features', () => {
    it('should sync with Qindex', async () => {
      const success = await service.syncWithQindex(testIdentityId);

      expect(success).toBe(true);
    });

    it('should notify security team for critical events', async () => {
      const criticalEvent = {
        id: 'event-123',
        identityId: testIdentityId,
        type: 'SECURITY_BREACH' as const,
        severity: 'CRITICAL' as const,
        description: 'Critical security breach detected',
        timestamp: new Date().toISOString(),
        metadata: {},
        resolved: false
      };

      const success = await service.notifySecurityTeam(criticalEvent);

      expect(success).toBe(true);
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT'),
        expect.stringContaining('Critical security breach detected')
      );
    });

    it('should not notify security team for low severity events', async () => {
      const lowEvent = {
        id: 'event-123',
        identityId: testIdentityId,
        type: 'UNUSUAL_PATTERN' as const,
        severity: 'LOW' as const,
        description: 'Minor unusual pattern',
        timestamp: new Date().toISOString(),
        metadata: {},
        resolved: false
      };

      const success = await service.notifySecurityTeam(lowEvent);

      expect(success).toBe(false);
    });
  });

  describe('Storage Integration', () => {
    it('should save and load data from localStorage', async () => {
      await service.logIdentityAction(testIdentityId, IdentityAction.CREATED);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qerberos_audit',
        expect.stringContaining(testIdentityId)
      );
    });

    it('should handle storage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw error
      await expect(service.logIdentityAction(testIdentityId, IdentityAction.CREATED)).resolves.toBeDefined();
      
      expect(consoleMock.error).toHaveBeenCalledWith(
        '[IdentityQerberosService] Error saving data to storage:',
        expect.any(Error)
      );
    });

    it('should load existing data on initialization', () => {
      const mockAuditData = {
        [testIdentityId]: [{
          id: 'audit-123',
          identityId: testIdentityId,
          action: IdentityAction.CREATED,
          timestamp: new Date().toISOString(),
          metadata: {}
        }]
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'identity_qerberos_audit') {
          return JSON.stringify(mockAuditData);
        }
        return null;
      });

      const newService = new IdentityQerberosService();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('identity_qerberos_audit');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in anomaly detection', async () => {
      // Force an error by passing invalid data
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // This should not throw but should handle the error gracefully
      await expect(service.detectAnomalies('', -1)).rejects.toThrow();

      console.error = originalConsoleError;
    });

    it('should handle errors in cross-identity analysis', async () => {
      // Pass empty array should not crash
      const analysis = await service.detectCrossIdentityPatterns([]);

      expect(analysis).toBeDefined();
      expect(analysis.identityIds).toEqual([]);
    });

    it('should handle export errors gracefully', async () => {
      await expect(service.exportAuditTrail(testIdentityId, 'INVALID' as any)).rejects.toThrow('Unsupported format');
    });
  });
});