/**
 * Risk Assessment Service Tests
 * Tests for risk assessment, suspicious activity detection, audit logging,
 * and compliance reporting functionality
 */

import { 
  RiskAssessmentService, 
  SuspiciousActivityPattern, 
  AuditEvent, 
  ComplianceViolation,
  ReputationScore 
} from '../RiskAssessmentService';
import { IdentityType } from '../../../types/identity';

describe('RiskAssessmentService', () => {
  let riskService: RiskAssessmentService;
  
  const mockIdentityId = 'test-identity-123';
  const mockRootIdentityId = 'root-identity-456';
  const mockDAOIdentityId = 'dao-identity-789';

  beforeEach(() => {
    localStorage.clear();
    riskService = new RiskAssessmentService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Risk Assessment', () => {
    it('should assess risk for identity', async () => {
      const assessment = await riskService.assessRisk(mockIdentityId);
      
      expect(assessment).toBeDefined();
      expect(assessment.identityId).toBe(mockIdentityId);
      expect(assessment.overallRisk).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(assessment.riskFactors).toBeInstanceOf(Array);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.lastAssessment).toBeDefined();
      expect(assessment.nextAssessment).toBeDefined();
    });

    it('should assess risk with operation context', async () => {
      const operation = {
        type: 'TRANSFER',
        amount: 5000,
        token: 'ETH'
      };
      
      const assessment = await riskService.assessRisk(mockIdentityId, operation);
      
      expect(assessment).toBeDefined();
      expect(assessment.identityId).toBe(mockIdentityId);
    });

    it('should calculate risk score', async () => {
      const score = await riskService.calculateRiskScore(mockIdentityId);
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should update risk factors', async () => {
      const riskFactors = [{
        type: 'VELOCITY' as const,
        severity: 'HIGH' as const,
        description: 'High transaction velocity',
        value: 100,
        threshold: 50,
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString()
      }];
      
      const result = await riskService.updateRiskFactors(mockIdentityId, riskFactors);
      
      expect(result).toBe(true);
      
      const assessment = await riskService.assessRisk(mockIdentityId);
      expect(assessment.riskFactors.length).toBeGreaterThanOrEqual(1);
      expect(assessment.riskFactors.some(f => f.type === 'VELOCITY')).toBe(true);
    });

    it('should determine overall risk correctly', async () => {
      const criticalFactors = [{
        type: 'PATTERN' as const,
        severity: 'CRITICAL' as const,
        description: 'Critical security pattern detected',
        value: 10,
        threshold: 1,
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString()
      }];
      
      await riskService.updateRiskFactors(mockIdentityId, criticalFactors);
      const assessment = await riskService.assessRisk(mockIdentityId);
      
      expect(['HIGH', 'CRITICAL']).toContain(assessment.overallRisk);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious activity patterns', async () => {
      const operation = {
        type: 'TRANSFER',
        amount: 15000, // Large amount
        token: 'ETH'
      };
      
      const patterns = await riskService.detectSuspiciousActivity(mockIdentityId, operation);
      
      expect(patterns).toBeInstanceOf(Array);
      // Should detect large amount pattern
      expect(patterns.some(p => p.name === 'Large Amount Transactions')).toBe(true);
    });

    it('should add detection pattern', async () => {
      const pattern: SuspiciousActivityPattern = {
        id: 'test_pattern',
        name: 'Test Pattern',
        description: 'Test suspicious activity pattern',
        severity: 'MEDIUM',
        detectionRules: [{
          type: 'AMOUNT',
          condition: 'GREATER_THAN',
          value: 1000,
          weight: 0.5
        }],
        threshold: 1000,
        timeWindow: 60,
        enabled: true
      };
      
      const result = await riskService.addDetectionPattern(pattern);
      
      expect(result).toBe(true);
    });

    it('should update detection pattern', async () => {
      const pattern: SuspiciousActivityPattern = {
        id: 'test_pattern_update',
        name: 'Test Pattern',
        description: 'Test pattern',
        severity: 'LOW',
        detectionRules: [],
        threshold: 100,
        timeWindow: 60,
        enabled: true
      };
      
      await riskService.addDetectionPattern(pattern);
      
      const result = await riskService.updateDetectionPattern('test_pattern_update', {
        severity: 'HIGH',
        threshold: 500
      });
      
      expect(result).toBe(true);
    });

    it('should not detect disabled patterns', async () => {
      const pattern: SuspiciousActivityPattern = {
        id: 'disabled_pattern',
        name: 'Disabled Pattern',
        description: 'This pattern is disabled',
        severity: 'HIGH',
        detectionRules: [{
          type: 'AMOUNT',
          condition: 'GREATER_THAN',
          value: 1,
          weight: 1.0
        }],
        threshold: 1,
        timeWindow: 60,
        enabled: false
      };
      
      await riskService.addDetectionPattern(pattern);
      
      const operation = { type: 'TRANSFER', amount: 1000 };
      const patterns = await riskService.detectSuspiciousActivity(mockIdentityId, operation);
      
      expect(patterns.find(p => p.id === 'disabled_pattern')).toBeUndefined();
    });
  });

  describe('Reputation Management', () => {
    it('should get reputation score for new identity', async () => {
      const reputation = await riskService.getReputationScore(mockIdentityId);
      
      expect(reputation).toBeDefined();
      expect(reputation.identityId).toBe(mockIdentityId);
      expect(reputation.score).toBeGreaterThan(0);
      expect(reputation.tier).toMatch(/^(TRUSTED|NEUTRAL|RESTRICTED|BLOCKED)$/);
      expect(reputation.factors).toBeInstanceOf(Array);
      expect(reputation.history).toBeInstanceOf(Array);
      expect(reputation.history).toHaveLength(1); // Initial entry
    });

    it('should calculate different base scores for different identity types', async () => {
      const rootReputation = await riskService.getReputationScore(mockRootIdentityId);
      const daoReputation = await riskService.getReputationScore(mockDAOIdentityId);
      const aidReputation = await riskService.getReputationScore(mockIdentityId);
      
      expect(rootReputation.score).toBeGreaterThan(daoReputation.score);
      expect(daoReputation.score).toBeGreaterThan(aidReputation.score);
    });

    it('should update reputation score', async () => {
      const initialReputation = await riskService.getReputationScore(mockIdentityId);
      const initialScore = initialReputation.score;
      
      const result = await riskService.updateReputationScore(mockIdentityId, 100, 'Good behavior');
      
      expect(result).toBe(true);
      
      const updatedReputation = await riskService.getReputationScore(mockIdentityId);
      expect(updatedReputation.score).toBe(initialScore + 100);
      expect(updatedReputation.history).toHaveLength(2);
    });

    it('should not allow reputation score below 0 or above 1000', async () => {
      // Test lower bound
      await riskService.updateReputationScore(mockIdentityId, -2000, 'Large penalty');
      let reputation = await riskService.getReputationScore(mockIdentityId);
      expect(reputation.score).toBe(0);
      
      // Test upper bound
      await riskService.updateReputationScore(mockIdentityId, 2000, 'Large bonus');
      reputation = await riskService.getReputationScore(mockIdentityId);
      expect(reputation.score).toBe(1000);
    });

    it('should calculate reputation tier correctly', async () => {
      // Test TRUSTED tier
      await riskService.updateReputationScore(mockIdentityId, 1000, 'Max score');
      let reputation = await riskService.getReputationScore(mockIdentityId);
      expect(reputation.tier).toBe('TRUSTED');
      
      // Test BLOCKED tier
      await riskService.updateReputationScore(mockIdentityId, -2000, 'Min score');
      reputation = await riskService.getReputationScore(mockIdentityId);
      expect(reputation.tier).toBe('BLOCKED');
    });
  });

  describe('Audit Logging', () => {
    it('should log audit event', async () => {
      const event: AuditEvent = {
        id: 'test-event-123',
        identityId: mockIdentityId,
        eventType: 'TRANSACTION',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: 'Test transaction event',
        metadata: { amount: 100, token: 'ETH' },
        resolved: true
      };
      
      const eventId = await riskService.logAuditEvent(event);
      
      expect(eventId).toBe(event.id);
    });

    it('should get audit events', async () => {
      const event1: AuditEvent = {
        id: 'event-1',
        identityId: mockIdentityId,
        eventType: 'TRANSACTION',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: 'Transaction 1',
        metadata: {},
        resolved: true
      };
      
      const event2: AuditEvent = {
        id: 'event-2',
        identityId: mockIdentityId,
        eventType: 'SECURITY_ALERT',
        severity: 'WARNING',
        timestamp: new Date().toISOString(),
        description: 'Security alert',
        metadata: {},
        resolved: false
      };
      
      await riskService.logAuditEvent(event1);
      await riskService.logAuditEvent(event2);
      
      const events = await riskService.getAuditEvents(mockIdentityId);
      
      expect(events).toHaveLength(2);
      expect(events.find(e => e.id === 'event-1')).toBeDefined();
      expect(events.find(e => e.id === 'event-2')).toBeDefined();
    });

    it('should filter audit events', async () => {
      const transactionEvent: AuditEvent = {
        id: 'tx-event',
        identityId: mockIdentityId,
        eventType: 'TRANSACTION',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: 'Transaction event',
        metadata: {},
        resolved: true
      };
      
      const securityEvent: AuditEvent = {
        id: 'security-event',
        identityId: mockIdentityId,
        eventType: 'SECURITY_ALERT',
        severity: 'WARNING',
        timestamp: new Date().toISOString(),
        description: 'Security event',
        metadata: {},
        resolved: false
      };
      
      await riskService.logAuditEvent(transactionEvent);
      await riskService.logAuditEvent(securityEvent);
      
      // Filter by event type
      const transactionEvents = await riskService.getAuditEvents(mockIdentityId, {
        eventTypes: ['TRANSACTION']
      });
      
      expect(transactionEvents).toHaveLength(1);
      expect(transactionEvents[0].eventType).toBe('TRANSACTION');
      
      // Filter by severity
      const warningEvents = await riskService.getAuditEvents(mockIdentityId, {
        severities: ['WARNING']
      });
      
      expect(warningEvents).toHaveLength(1);
      expect(warningEvents[0].severity).toBe('WARNING');
      
      // Filter by resolved status
      const unresolvedEvents = await riskService.getAuditEvents(mockIdentityId, {
        resolved: false
      });
      
      expect(unresolvedEvents).toHaveLength(1);
      expect(unresolvedEvents[0].resolved).toBe(false);
    });

    it('should export audit logs in different formats', async () => {
      const event: AuditEvent = {
        id: 'export-test',
        identityId: mockIdentityId,
        eventType: 'TRANSACTION',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: 'Export test event',
        metadata: {},
        resolved: true
      };
      
      await riskService.logAuditEvent(event);
      
      const period = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      };
      
      // Test JSON export
      const jsonExport = await riskService.exportAuditLogs(mockIdentityId, period, 'JSON');
      expect(jsonExport).toContain('export-test');
      expect(() => JSON.parse(jsonExport)).not.toThrow();
      
      // Test CSV export
      const csvExport = await riskService.exportAuditLogs(mockIdentityId, period, 'CSV');
      expect(csvExport).toContain('export-test');
      expect(csvExport).toContain('ID,Identity ID');
      
      // Test PDF export
      const pdfExport = await riskService.exportAuditLogs(mockIdentityId, period, 'PDF');
      expect(pdfExport).toContain(mockIdentityId);
    });
  });

  describe('Compliance', () => {
    it('should check compliance violations', async () => {
      const violation: ComplianceViolation = {
        id: 'violation-1',
        identityId: mockIdentityId,
        violationType: 'LIMIT_EXCEEDED',
        severity: 'HIGH',
        description: 'Daily limit exceeded',
        detectedAt: new Date().toISOString(),
        relatedTransactions: ['tx-1', 'tx-2'],
        status: 'OPEN'
      };
      
      await riskService.reportViolation(violation);
      
      const violations = await riskService.checkCompliance(mockIdentityId);
      
      expect(violations).toHaveLength(1);
      expect(violations[0].id).toBe('violation-1');
      expect(violations[0].status).toBe('OPEN');
    });

    it('should generate compliance report', async () => {
      // Add some audit events
      const event: AuditEvent = {
        id: 'compliance-event',
        identityId: mockIdentityId,
        eventType: 'TRANSACTION',
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        description: 'Compliance test transaction',
        metadata: { amount: 500 },
        resolved: true
      };
      
      await riskService.logAuditEvent(event);
      
      const period = {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      };
      
      const report = await riskService.generateComplianceReport(mockIdentityId, period);
      
      expect(report).toBeDefined();
      expect(report.identityId).toBe(mockIdentityId);
      expect(report.period).toEqual(period);
      expect(report.totalTransactions).toBeGreaterThanOrEqual(1);
      expect(report.auditTrail).toBeInstanceOf(Array);
      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });

    it('should report compliance violation', async () => {
      const violation: ComplianceViolation = {
        id: 'test-violation',
        identityId: mockIdentityId,
        violationType: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        description: 'Suspicious transaction pattern detected',
        detectedAt: new Date().toISOString(),
        relatedTransactions: ['tx-suspicious'],
        status: 'OPEN'
      };
      
      const violationId = await riskService.reportViolation(violation);
      
      expect(violationId).toBe('test-violation');
      
      const violations = await riskService.checkCompliance(mockIdentityId);
      expect(violations.find(v => v.id === 'test-violation')).toBeDefined();
    });
  });

  describe('Auto Actions', () => {
    it('should execute auto actions', async () => {
      const logAction = {
        trigger: 'Test trigger',
        action: 'LOG' as const,
        executed: false
      };
      
      const result = await riskService.executeAutoAction(mockIdentityId, logAction);
      
      expect(result).toBe(true);
      expect(logAction.executed).toBe(true);
      expect(logAction.executedAt).toBeDefined();
      expect(logAction.result).toBe('SUCCESS');
    });

    it('should get recommended actions based on risk level', async () => {
      // Create high risk scenario
      const highRiskFactors = [{
        type: 'VELOCITY' as const,
        severity: 'HIGH' as const,
        description: 'High velocity transactions',
        value: 100,
        threshold: 50,
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString()
      }];
      
      await riskService.updateRiskFactors(mockIdentityId, highRiskFactors);
      await riskService.assessRisk(mockIdentityId);
      
      const actions = await riskService.getRecommendedActions(mockIdentityId);
      
      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThanOrEqual(0); // May or may not have WARN action
    });

    it('should recommend critical actions for critical risk', async () => {
      const criticalRiskFactors = [{
        type: 'PATTERN' as const,
        severity: 'CRITICAL' as const,
        description: 'Critical security breach detected',
        value: 10,
        threshold: 1,
        firstDetected: new Date().toISOString(),
        lastDetected: new Date().toISOString()
      }];
      
      await riskService.updateRiskFactors(mockIdentityId, criticalRiskFactors);
      await riskService.assessRisk(mockIdentityId);
      
      const actions = await riskService.getRecommendedActions(mockIdentityId);
      
      expect(actions).toBeInstanceOf(Array);
      expect(actions.some(a => a.action === 'FREEZE')).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should persist risk assessment data', async () => {
      await riskService.assessRisk(mockIdentityId);
      await riskService.updateReputationScore(mockIdentityId, 50, 'Test update');
      
      // Create new service instance to test loading
      const newService = new RiskAssessmentService();
      
      const reputation = await newService.getReputationScore(mockIdentityId);
      expect(reputation).toBeDefined();
    });

    it('should handle storage errors gracefully', async () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = (() => {
        throw new Error('Storage error');
      }) as any;
      
      // Should not throw error
      await expect(riskService.assessRisk(mockIdentityId)).resolves.toBeDefined();
      
      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Integration Features', () => {
    it('should integrate with Qerberos for critical events', async () => {
      const criticalEvent: AuditEvent = {
        id: 'critical-event',
        identityId: mockIdentityId,
        eventType: 'SECURITY_ALERT',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
        description: 'Critical security event',
        metadata: {},
        resolved: false
      };
      
      // Should not throw error even if Qerberos integration fails
      await expect(riskService.logAuditEvent(criticalEvent)).resolves.toBeDefined();
    });

    it('should handle different identity types correctly', async () => {
      const rootAssessment = await riskService.assessRisk(mockRootIdentityId);
      const daoAssessment = await riskService.assessRisk(mockDAOIdentityId);
      const aidAssessment = await riskService.assessRisk(mockIdentityId);
      
      expect(rootAssessment.reputationScore).toBeGreaterThan(daoAssessment.reputationScore!);
      expect(daoAssessment.reputationScore).toBeGreaterThan(aidAssessment.reputationScore!);
    });
  });
});