/**
 * Unit Tests for IdentityQerberosService
 * Tests comprehensive audit logging and security event detection per identity
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdentityQerberosService } from '../identity/IdentityQerberosService';
import {
  ExtendedSquidIdentity,
  IdentityType,
  GovernanceType,
  PrivacyLevel,
  IdentityStatus,
  IdentityAction,
  AuditEntry,
  SecurityFlag
} from '@/types/identity';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('IdentityQerberosService', () => {
  let qerberosService: IdentityQerberosService;
  let mockRootIdentity: ExtendedSquidIdentity;
  let mockDAOIdentity: ExtendedSquidIdentity;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
    
    qerberosService = new IdentityQerberosService();

    // Create mock identities
    mockRootIdentity = {
      did: 'did:squid:root:123',
      name: 'Root Identity',
      type: IdentityType.ROOT,
      rootId: 'did:squid:root:123',
      children: [],
      depth: 0,
      path: [],
      governanceLevel: GovernanceType.SELF,
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
        governanceLevel: GovernanceType.SELF
      },
      status: IdentityStatus.ACTIVE,
      qonsentProfileId: 'qonsent-123',
      qlockKeyPair: {
        publicKey: 'pub-123',
        privateKey: 'priv-123',
        algorithm: 'ECDSA',
        keySize: 256,
        createdAt: '2024-01-01T00:00:00Z'
      },
      privacyLevel: PrivacyLevel.PUBLIC,
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastUsed: '2024-01-01T00:00:00Z',
      kyc: {
        required: false,
        submitted: true,
        approved: true,
        level: 'ENHANCED'
      },
      auditLog: [],
      securityFlags: [],
      qindexRegistered: true
    };

    mockDAOIdentity = {
      ...mockRootIdentity,
      did: 'did:squid:dao:456',
      name: 'Test DAO',
      type: IdentityType.DAO,
      parentId: 'did:squid:root:123',
      depth: 1,
      path: ['did:squid:root:123'],
      governanceLevel: GovernanceType.DAO
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logIdentityAction', () => {
    it('should log identity action with comprehensive metadata', async () => {
      const logId = await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.CREATED,
        { reason: 'Initial creation' }
      );

      expect(logId).toBeDefined();
      expect(logId).toMatch(/^audit-\d+-[a-z0-9]+$/);

      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].identityId).toBe(mockRootIdentity.did);
      expect(auditLog[0].action).toBe(IdentityAction.CREATED);
      expect(auditLog[0].metadata.reason).toBe('Initial creation');
      expect(auditLog[0].metadata.triggeredBy).toBeDefined();
      expect(auditLog[0].metadata.ipAddress).toBeDefined();
      expect(auditLog[0].metadata.deviceFingerprint).toBeDefined();
      expect(auditLog[0].metadata.securityLevel).toBeDefined();
    });

    it('should determine appropriate security level based on action', async () => {
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.SWITCHED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.SECURITY_EVENT);

      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      
      const createdEntry = auditLog.find(entry => entry.action === IdentityAction.CREATED);
      const switchedEntry = auditLog.find(entry => entry.action === IdentityAction.SWITCHED);
      const securityEntry = auditLog.find(entry => entry.action === IdentityAction.SECURITY_EVENT);

      expect(createdEntry?.metadata.securityLevel).toBe('HIGH');
      expect(switchedEntry?.metadata.securityLevel).toBe('MEDIUM');
      expect(securityEntry?.metadata.securityLevel).toBe('CRITICAL');
    });

    it('should limit audit log size to 1000 entries per identity', async () => {
      // Create 1005 log entries
      for (let i = 0; i < 1005; i++) {
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.UPDATED,
          { iteration: i }
        );
      }

      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog).toHaveLength(1000);
      
      // Should keep the most recent entries
      expect(auditLog[0].metadata.iteration).toBe(1004);
      expect(auditLog[999].metadata.iteration).toBe(5);
    });

    it('should analyze for security events after logging', async () => {
      // Create multiple rapid actions to trigger security event detection
      for (let i = 0; i < 6; i++) {
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.SWITCHED,
          { rapidAction: i }
        );
      }

      const securityEvents = await qerberosService.detectSecurityEvents(mockRootIdentity.did);
      expect(securityEvents.length).toBeGreaterThan(0);
      
      const rapidActionEvent = securityEvents.find(event => 
        event.type === 'SUSPICIOUS_ACTIVITY' && 
        event.description.includes('Rapid successive actions')
      );
      expect(rapidActionEvent).toBeDefined();
    });
  });

  describe('getIdentityAuditLog', () => {
    beforeEach(async () => {
      // Create some test audit entries
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.UPDATED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.SWITCHED);
    });

    it('should return audit log for identity with default limit', async () => {
      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);

      expect(auditLog).toHaveLength(3);
      expect(auditLog[0].action).toBe(IdentityAction.SWITCHED); // Most recent first
      expect(auditLog[2].action).toBe(IdentityAction.CREATED); // Oldest last
    });

    it('should respect custom limit parameter', async () => {
      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did, 2);

      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].action).toBe(IdentityAction.SWITCHED);
      expect(auditLog[1].action).toBe(IdentityAction.UPDATED);
    });

    it('should return empty array for non-existent identity', async () => {
      const auditLog = await qerberosService.getIdentityAuditLog('nonexistent-id');

      expect(auditLog).toHaveLength(0);
    });
  });

  describe('getAuditLogById', () => {
    it('should return specific audit entry by ID', async () => {
      const logId = await qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.CREATED,
        { test: 'data' }
      );

      const auditEntry = await qerberosService.getAuditLogById(logId);

      expect(auditEntry).toBeDefined();
      expect(auditEntry!.id).toBe(logId);
      expect(auditEntry!.action).toBe(IdentityAction.CREATED);
      expect(auditEntry!.metadata.test).toBe('data');
    });

    it('should return null for non-existent audit entry', async () => {
      const auditEntry = await qerberosService.getAuditLogById('nonexistent-id');

      expect(auditEntry).toBeNull();
    });
  });

  describe('detectSecurityEvents', () => {
    it('should detect suspicious activity from multiple high-security events', async () => {
      // Create multiple high-security events within an hour
      for (let i = 0; i < 4; i++) {
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.DELETED, // HIGH security level
          { attempt: i }
        );
      }

      const securityEvents = await qerberosService.detectSecurityEvents(mockRootIdentity.did);

      expect(securityEvents.length).toBeGreaterThan(0);
      const suspiciousEvent = securityEvents.find(event => 
        event.type === 'SUSPICIOUS_ACTIVITY' &&
        event.description.includes('Multiple high-security events')
      );
      expect(suspiciousEvent).toBeDefined();
      expect(suspiciousEvent!.severity).toBe('HIGH');
      expect(suspiciousEvent!.metadata.failureCount).toBe(4);
    });

    it('should detect unusual access patterns during night hours', async () => {
      // Mock current time to simulate night access
      const nightHours = [2, 3, 23, 1, 4, 22]; // 6 night accesses
      
      for (const hour of nightHours) {
        const nightTime = new Date();
        nightTime.setHours(hour, 0, 0, 0);
        vi.setSystemTime(nightTime);
        
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.SWITCHED,
          { hour }
        );
      }

      const securityEvents = await qerberosService.detectSecurityEvents(mockRootIdentity.did);

      const unusualPatternEvent = securityEvents.find(event => 
        event.type === 'UNUSUAL_PATTERN' &&
        event.description.includes('Unusual access times')
      );
      expect(unusualPatternEvent).toBeDefined();
      expect(unusualPatternEvent!.severity).toBe('MEDIUM');
      expect(unusualPatternEvent!.metadata.unusualAccessCount).toBe(6);
    });

    it('should store detected events for future reference', async () => {
      // Trigger security event detection
      for (let i = 0; i < 4; i++) {
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.SECURITY_EVENT
        );
      }

      await qerberosService.detectSecurityEvents(mockRootIdentity.did);

      // Events should be stored and retrievable
      const securityEvents = await qerberosService.detectSecurityEvents(mockRootIdentity.did);
      expect(securityEvents.length).toBeGreaterThan(0);
    });
  });

  describe('flagSecurityEvent', () => {
    it('should flag security event successfully', async () => {
      const securityFlag: SecurityFlag = {
        id: 'flag-123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test security flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      const flagged = await qerberosService.flagSecurityEvent(mockRootIdentity.did, securityFlag);

      expect(flagged).toBe(true);

      const flags = await qerberosService.getSecurityFlags(mockRootIdentity.did);
      expect(flags).toHaveLength(1);
      expect(flags[0]).toEqual(securityFlag);
    });

    it('should handle multiple flags for same identity', async () => {
      const flag1: SecurityFlag = {
        id: 'flag-1',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        description: 'First flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      const flag2: SecurityFlag = {
        id: 'flag-2',
        type: 'SECURITY_BREACH',
        severity: 'CRITICAL',
        description: 'Second flag',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await qerberosService.flagSecurityEvent(mockRootIdentity.did, flag1);
      await qerberosService.flagSecurityEvent(mockRootIdentity.did, flag2);

      const flags = await qerberosService.getSecurityFlags(mockRootIdentity.did);
      expect(flags).toHaveLength(2);
      expect(flags.map(f => f.id)).toContain('flag-1');
      expect(flags.map(f => f.id)).toContain('flag-2');
    });
  });

  describe('resolveSecurityFlag', () => {
    beforeEach(async () => {
      const securityFlag: SecurityFlag = {
        id: 'flag-resolve-test',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Test flag for resolution',
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await qerberosService.flagSecurityEvent(mockRootIdentity.did, securityFlag);
    });

    it('should resolve security flag successfully', async () => {
      const resolved = await qerberosService.resolveSecurityFlag('flag-resolve-test', 'admin-user');

      expect(resolved).toBe(true);

      const flags = await qerberosService.getSecurityFlags(mockRootIdentity.did);
      const resolvedFlag = flags.find(f => f.id === 'flag-resolve-test');
      
      expect(resolvedFlag).toBeDefined();
      expect(resolvedFlag!.resolved).toBe(true);
      expect(resolvedFlag!.resolvedBy).toBe('admin-user');
      expect(resolvedFlag!.resolvedAt).toBeDefined();
    });

    it('should return false for non-existent flag', async () => {
      const resolved = await qerberosService.resolveSecurityFlag('nonexistent-flag', 'admin-user');

      expect(resolved).toBe(false);
    });
  });

  describe('createAuditTrail', () => {
    it('should create audit trail for operation', async () => {
      const auditId = await qerberosService.createAuditTrail(
        mockRootIdentity.did,
        'user_login',
        { ip: '192.168.1.1', device: 'mobile' }
      );

      expect(auditId).toBeDefined();

      const auditLog = await qerberosService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].metadata.operation).toBe('user_login');
      expect(auditLog[0].metadata.details.ip).toBe('192.168.1.1');
      expect(auditLog[0].metadata.auditTrail).toBe(true);
    });
  });

  describe('getAuditTrail', () => {
    beforeEach(async () => {
      // Create audit entries with different timestamps
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      for (let i = 0; i < 5; i++) {
        const entryTime = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000); // Each day apart
        vi.setSystemTime(entryTime);
        
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.UPDATED,
          { day: i }
        );
      }
    });

    it('should return all audit entries when no date filters provided', async () => {
      const auditTrail = await qerberosService.getAuditTrail(mockRootIdentity.did);

      expect(auditTrail).toHaveLength(5);
    });

    it('should filter audit entries by start date', async () => {
      const startDate = '2024-01-03T00:00:00Z';
      const auditTrail = await qerberosService.getAuditTrail(mockRootIdentity.did, startDate);

      expect(auditTrail.length).toBeLessThan(5);
      auditTrail.forEach(entry => {
        expect(new Date(entry.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
      });
    });

    it('should filter audit entries by end date', async () => {
      const endDate = '2024-01-03T00:00:00Z';
      const auditTrail = await qerberosService.getAuditTrail(mockRootIdentity.did, undefined, endDate);

      auditTrail.forEach(entry => {
        expect(new Date(entry.timestamp).getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should filter audit entries by date range', async () => {
      const startDate = '2024-01-02T00:00:00Z';
      const endDate = '2024-01-04T00:00:00Z';
      const auditTrail = await qerberosService.getAuditTrail(mockRootIdentity.did, startDate, endDate);

      auditTrail.forEach(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        expect(entryTime).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(entryTime).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });
  });

  describe('exportAuditTrail', () => {
    beforeEach(async () => {
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.UPDATED);
    });

    it('should export audit trail in JSON format', async () => {
      const exported = await qerberosService.exportAuditTrail(mockRootIdentity.did, 'JSON');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].action).toBeDefined();
      expect(parsed[0].identityId).toBe(mockRootIdentity.did);
    });

    it('should export audit trail in CSV format', async () => {
      const exported = await qerberosService.exportAuditTrail(mockRootIdentity.did, 'CSV');

      expect(exported).toBeDefined();
      const lines = exported.split('\n');
      expect(lines.length).toBeGreaterThan(2); // Header + 2 data rows
      expect(lines[0]).toContain('ID,Identity ID,Action,Timestamp');
      expect(lines[1]).toContain(mockRootIdentity.did);
    });

    it('should throw error for unsupported format', async () => {
      await expect(qerberosService.exportAuditTrail(mockRootIdentity.did, 'XML' as any))
        .rejects.toThrow('Unsupported format: XML');
    });
  });

  describe('detectAnomalies', () => {
    beforeEach(async () => {
      // Create various audit entries to test anomaly detection
      const actions = [
        IdentityAction.SWITCHED, IdentityAction.SWITCHED, IdentityAction.SWITCHED,
        IdentityAction.SWITCHED, IdentityAction.SWITCHED, IdentityAction.SWITCHED, // High frequency
        IdentityAction.UPDATED, IdentityAction.CREATED
      ];

      for (const action of actions) {
        await qerberosService.logIdentityAction(mockRootIdentity.did, action);
      }
    });

    it('should detect frequency anomalies', async () => {
      const report = await qerberosService.detectAnomalies(mockRootIdentity.did, 24);

      expect(report.identityId).toBe(mockRootIdentity.did);
      expect(report.timeWindow).toBe(24);
      expect(report.anomalies.length).toBeGreaterThan(0);
      
      const frequencyAnomaly = report.anomalies.find(a => a.type === 'FREQUENCY');
      expect(frequencyAnomaly).toBeDefined();
      expect(frequencyAnomaly!.description).toContain('Unusually high frequency');
      expect(frequencyAnomaly!.affectedActions).toContain(IdentityAction.SWITCHED);
    });

    it('should detect timing anomalies for night access', async () => {
      // Create night access entries
      for (let i = 0; i < 5; i++) {
        const nightTime = new Date();
        nightTime.setHours(2, 0, 0, 0); // 2 AM
        vi.setSystemTime(nightTime);
        
        await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.SWITCHED);
      }

      const report = await qerberosService.detectAnomalies(mockRootIdentity.did, 24);

      const timingAnomaly = report.anomalies.find(a => a.type === 'TIMING');
      expect(timingAnomaly).toBeDefined();
      expect(timingAnomaly!.description).toContain('Unusual access timing');
    });

    it('should calculate risk score based on anomalies', async () => {
      const report = await qerberosService.detectAnomalies(mockRootIdentity.did, 24);

      expect(report.riskScore).toBeGreaterThanOrEqual(0);
      expect(report.riskScore).toBeLessThanOrEqual(10);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      const report = await qerberosService.detectAnomalies(mockRootIdentity.did, 24);

      if (report.anomalies.some(a => a.type === 'FREQUENCY')) {
        expect(report.recommendations).toContain('Consider implementing rate limiting for high-frequency actions');
      }
    });
  });

  describe('analyzeAccessPatterns', () => {
    beforeEach(async () => {
      // Create pattern of actions
      const actionSequence = [
        IdentityAction.SWITCHED, IdentityAction.UPDATED,
        IdentityAction.SWITCHED, IdentityAction.UPDATED,
        IdentityAction.SWITCHED, IdentityAction.CREATED
      ];

      for (const action of actionSequence) {
        await qerberosService.logIdentityAction(mockRootIdentity.did, action);
      }
    });

    it('should analyze access patterns and return comprehensive analysis', async () => {
      const analysis = await qerberosService.analyzeAccessPatterns(mockRootIdentity.did);

      expect(analysis.identityId).toBe(mockRootIdentity.did);
      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(analysis.normalBehavior).toBeDefined();
      expect(analysis.deviations).toBeDefined();
      expect(analysis.analysisDate).toBeDefined();
    });

    it('should extract action sequences as patterns', async () => {
      const analysis = await qerberosService.analyzeAccessPatterns(mockRootIdentity.did);

      const sequencePattern = analysis.patterns.find(p => 
        p.type === 'SEQUENCE' && p.pattern.includes('SWITCHED->UPDATED')
      );
      expect(sequencePattern).toBeDefined();
      expect(sequencePattern!.frequency).toBeGreaterThan(1);
    });

    it('should build normal behavior profile', async () => {
      const analysis = await qerberosService.analyzeAccessPatterns(mockRootIdentity.did);

      expect(analysis.normalBehavior.averageSessionDuration).toBeDefined();
      expect(analysis.normalBehavior.commonAccessTimes).toBeDefined();
      expect(analysis.normalBehavior.frequentActions).toBeDefined();
      expect(Array.isArray(analysis.normalBehavior.frequentActions)).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(async () => {
      // Create audit entries and security flags for compliance testing
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.UPDATED);
      
      const securityFlag: SecurityFlag = {
        id: 'compliance-flag',
        type: 'SECURITY_BREACH',
        severity: 'HIGH',
        description: 'Test security breach',
        timestamp: new Date().toISOString(),
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'admin'
      };
      
      await qerberosService.flagSecurityEvent(mockRootIdentity.did, securityFlag);
    });

    it('should generate comprehensive compliance report', async () => {
      const report = await qerberosService.generateComplianceReport(mockRootIdentity.did, 'monthly');

      expect(report.identityId).toBe(mockRootIdentity.did);
      expect(report.period).toBe('monthly');
      expect(report.auditTrailCompleteness).toBeGreaterThanOrEqual(0);
      expect(report.auditTrailCompleteness).toBeLessThanOrEqual(100);
      expect(typeof report.dataRetentionCompliance).toBe('boolean');
      expect(report.securityEventResponse).toBeGreaterThanOrEqual(0);
      expect(report.policyViolations).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.generatedAt).toBeDefined();
    });

    it('should count policy violations correctly', async () => {
      const report = await qerberosService.generateComplianceReport(mockRootIdentity.did, 'monthly');

      expect(report.policyViolations).toBe(1); // One SECURITY_BREACH flag
    });
  });

  describe('getDataRetentionStatus', () => {
    beforeEach(async () => {
      // Create audit entries with different ages
      const oldTime = new Date();
      oldTime.setFullYear(oldTime.getFullYear() - 2); // 2 years ago
      vi.setSystemTime(oldTime);
      
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);
      
      vi.setSystemTime(new Date()); // Current time
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.UPDATED);
    });

    it('should return data retention status', async () => {
      const status = await qerberosService.getDataRetentionStatus(mockRootIdentity.did);

      expect(status.identityId).toBe(mockRootIdentity.did);
      expect(status.totalRecords).toBe(2);
      expect(status.retainedRecords).toBeLessThanOrEqual(status.totalRecords);
      expect(status.expiredRecords).toBeGreaterThanOrEqual(0);
      expect(status.nextPurgeDate).toBeDefined();
      expect(status.retentionPolicy).toBe('1 year');
    });

    it('should identify expired records correctly', async () => {
      const status = await qerberosService.getDataRetentionStatus(mockRootIdentity.did);

      expect(status.expiredRecords).toBe(1); // The 2-year-old record should be expired
      expect(status.retainedRecords).toBe(1); // The current record should be retained
    });
  });

  describe('detectCrossIdentityPatterns', () => {
    beforeEach(async () => {
      // Create similar patterns for both identities
      const actions = [IdentityAction.SWITCHED, IdentityAction.UPDATED];
      
      for (const action of actions) {
        await qerberosService.logIdentityAction(mockRootIdentity.did, action);
        await qerberosService.logIdentityAction(mockDAOIdentity.did, action);
      }
    });

    it('should detect cross-identity patterns', async () => {
      const analysis = await qerberosService.detectCrossIdentityPatterns([
        mockRootIdentity.did,
        mockDAOIdentity.did
      ]);

      expect(analysis.identityIds).toEqual([mockRootIdentity.did, mockDAOIdentity.did]);
      expect(analysis.correlations).toBeDefined();
      expect(analysis.sharedPatterns).toBeDefined();
      expect(analysis.riskAssessment).toBeDefined();
      expect(analysis.analysisDate).toBeDefined();
    });

    it('should find temporal correlations between identities', async () => {
      const analysis = await qerberosService.detectCrossIdentityPatterns([
        mockRootIdentity.did,
        mockDAOIdentity.did
      ]);

      // Should find correlations if patterns are similar enough
      if (analysis.correlations.length > 0) {
        const correlation = analysis.correlations[0];
        expect(correlation.identity1).toBeDefined();
        expect(correlation.identity2).toBeDefined();
        expect(correlation.correlationType).toBeDefined();
        expect(correlation.strength).toBeGreaterThanOrEqual(0);
        expect(correlation.strength).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('correlateSecurityEvents', () => {
    beforeEach(async () => {
      // Create security events close in time
      const baseTime = new Date();
      
      for (let i = 0; i < 3; i++) {
        const eventTime = new Date(baseTime.getTime() + i * 60000); // 1 minute apart
        vi.setSystemTime(eventTime);
        
        await qerberosService.logIdentityAction(
          mockRootIdentity.did,
          IdentityAction.SECURITY_EVENT,
          { eventIndex: i }
        );
      }
      
      // Trigger security event detection
      await qerberosService.detectSecurityEvents(mockRootIdentity.did);
    });

    it('should correlate security events within time window', async () => {
      const correlatedEvents = await qerberosService.correlateSecurityEvents(1); // 1 hour window

      expect(Array.isArray(correlatedEvents)).toBe(true);
      
      if (correlatedEvents.length > 0) {
        const correlation = correlatedEvents[0];
        expect(correlation.id).toBeDefined();
        expect(correlation.events).toBeDefined();
        expect(Array.isArray(correlation.events)).toBe(true);
        expect(correlation.correlationType).toBeDefined();
        expect(correlation.confidence).toBeGreaterThanOrEqual(0);
        expect(correlation.confidence).toBeLessThanOrEqual(1);
        expect(correlation.description).toBeDefined();
        expect(correlation.timestamp).toBeDefined();
      }
    });
  });

  describe('integration methods', () => {
    describe('syncWithQindex', () => {
      it('should sync audit data with Qindex successfully', async () => {
        const synced = await qerberosService.syncWithQindex(mockRootIdentity.did);

        expect(synced).toBe(true);
      });
    });

    describe('notifySecurityTeam', () => {
      it('should notify security team for critical events', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        const criticalEvent = {
          id: 'critical-event',
          identityId: mockRootIdentity.did,
          type: 'SECURITY_BREACH' as const,
          severity: 'CRITICAL' as const,
          description: 'Critical security breach detected',
          timestamp: new Date().toISOString(),
          metadata: {},
          resolved: false
        };

        const notified = await qerberosService.notifySecurityTeam(criticalEvent);

        expect(notified).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('SECURITY ALERT: Critical security breach detected')
        );
        
        consoleSpy.mockRestore();
      });

      it('should not notify for low severity events', async () => {
        const lowEvent = {
          id: 'low-event',
          identityId: mockRootIdentity.did,
          type: 'SUSPICIOUS_ACTIVITY' as const,
          severity: 'LOW' as const,
          description: 'Low severity event',
          timestamp: new Date().toISOString(),
          metadata: {},
          resolved: false
        };

        const notified = await qerberosService.notifySecurityTeam(lowEvent);

        expect(notified).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error, but handle gracefully
      await expect(qerberosService.logIdentityAction(
        mockRootIdentity.did,
        IdentityAction.CREATED
      )).rejects.toThrow('Failed to log identity action');
    });

    it('should handle anomaly detection errors gracefully', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw error for invalid identity
      await expect(qerberosService.detectAnomalies('invalid-id', 24))
        .rejects.toThrow('Failed to detect anomalies for identity');

      consoleSpy.mockRestore();
    });

    it('should handle export errors gracefully', async () => {
      // Mock JSON.stringify to fail
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw new Error('Stringify failed');
      });

      await expect(qerberosService.exportAuditTrail(mockRootIdentity.did, 'JSON'))
        .rejects.toThrow('Failed to export audit trail in JSON format');

      // Restore original function
      JSON.stringify = originalStringify;
    });
  });

  describe('data persistence', () => {
    it('should save data to localStorage after operations', async () => {
      await qerberosService.logIdentityAction(mockRootIdentity.did, IdentityAction.CREATED);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'identity_qerberos_data',
        expect.stringContaining(mockRootIdentity.did)
      );
    });

    it('should load data from localStorage on initialization', async () => {
      const mockData = {
        auditLogs: {
          [mockRootIdentity.did]: [{
            id: 'stored-audit',
            identityId: mockRootIdentity.did,
            action: IdentityAction.CREATED,
            timestamp: '2024-01-01T00:00:00Z',
            metadata: {}
          }]
        },
        securityFlags: {},
        securityEvents: {}
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      // Create new service instance to trigger loading
      const newService = new IdentityQerberosService();
      
      const auditLog = await newService.getIdentityAuditLog(mockRootIdentity.did);
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].id).toBe('stored-audit');
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      // Should not throw error, but handle gracefully
      expect(() => new IdentityQerberosService()).not.toThrow();
    });
  });
});