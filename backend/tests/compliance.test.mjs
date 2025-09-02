/**
 * Compliance Service Tests
 * Tests for GDPR, SOC2, data retention, and privacy impact assessment functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComplianceService } from '../services/ComplianceService.mjs';

describe('ComplianceService', () => {
  let complianceService;
  let mockStorage;
  let mockEventBus;

  beforeEach(() => {
    // Mock dependencies
    mockStorage = {
      store: vi.fn().mockResolvedValue(true),
      retrieve: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue({ items: [], total: 0 })
    };

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(true),
      subscribe: vi.fn()
    };

    // Create service instance with mocked dependencies
    complianceService = new ComplianceService();
    complianceService.storage = mockStorage;
    complianceService.eventBus = mockEventBus;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GDPR Compliance', () => {
    describe('processDSR', () => {
      it('should process ACCESS request successfully', async () => {
        const dsrRequest = {
          type: 'ACCESS',
          subjectId: 'user123',
          requestedBy: 'user123',
          data: { email: 'user@example.com' }
        };

        // Mock data collection
        complianceService.collectSubjectData = vi.fn().mockResolvedValue({
          profile: { name: 'John Doe', email: 'user@example.com' },
          messages: [],
          transactions: []
        });

        const result = await complianceService.processDSR(dsrRequest);

        expect(result.status).toBe('COMPLETED');
        expect(result.result.type).toBe('DATA_EXPORT');
        expect(mockStorage.store).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          'q.compliance.dsr.completed.v1',
          expect.objectContaining({
            type: 'ACCESS',
            subjectId: 'user123'
          })
        );
      });

      it('should process ERASURE request successfully', async () => {
        const dsrRequest = {
          type: 'ERASURE',
          subjectId: 'user123',
          requestedBy: 'user123',
          data: { reason: 'Account deletion' }
        };

        // Mock data deletion
        complianceService.deleteSubjectData = vi.fn().mockResolvedValue([
          'profile_record',
          'message_records',
          'transaction_records'
        ]);

        const result = await complianceService.processDSR(dsrRequest);

        expect(result.status).toBe('COMPLETED');
        expect(result.result.type).toBe('DATA_DELETION');
        expect(complianceService.deleteSubjectData).toHaveBeenCalledWith('user123');
      });

      it('should reject invalid DSR request', async () => {
        const invalidRequest = {
          type: 'INVALID_TYPE',
          subjectId: 'user123'
        };

        await expect(complianceService.processDSR(invalidRequest))
          .rejects.toThrow('Invalid DSR request');
      });

      it('should handle DSR processing errors', async () => {
        const dsrRequest = {
          type: 'ACCESS',
          subjectId: 'user123',
          requestedBy: 'user123'
        };

        complianceService.collectSubjectData = vi.fn().mockRejectedValue(
          new Error('Data collection failed')
        );

        await expect(complianceService.processDSR(dsrRequest))
          .rejects.toThrow('Data collection failed');

        expect(complianceService.logComplianceViolation).toHaveBeenCalledWith(
          'GDPR_DSR_FAILURE',
          expect.any(Object)
        );
      });
    });

    describe('performGDPRCheck', () => {
      it('should perform comprehensive GDPR compliance check', async () => {
        // Mock compliance check methods
        complianceService.checkDataRetentionCompliance = vi.fn().mockResolvedValue([]);
        complianceService.checkConsentCompliance = vi.fn().mockResolvedValue([]);
        complianceService.checkProcessingLawfulness = vi.fn().mockResolvedValue([]);
        complianceService.checkDataSubjectRights = vi.fn().mockResolvedValue([]);

        const report = await complianceService.performGDPRCheck();

        expect(report.type).toBe('GDPR_COMPLIANCE');
        expect(report.status).toBe('COMPLIANT');
        expect(report.violations).toEqual([]);
        expect(mockStorage.store).toHaveBeenCalledWith(
          expect.stringMatching(/^compliance\/gdpr\//),
          expect.objectContaining({ type: 'GDPR_COMPLIANCE' })
        );
      });

      it('should identify GDPR violations', async () => {
        const violations = [
          { type: 'DATA_RETENTION_VIOLATION', severity: 'HIGH' },
          { type: 'CONSENT_EXPIRED', severity: 'HIGH' }
        ];

        complianceService.checkDataRetentionCompliance = vi.fn().mockResolvedValue([violations[0]]);
        complianceService.checkConsentCompliance = vi.fn().mockResolvedValue([violations[1]]);
        complianceService.checkProcessingLawfulness = vi.fn().mockResolvedValue([]);
        complianceService.checkDataSubjectRights = vi.fn().mockResolvedValue([]);
        complianceService.alertComplianceViolations = vi.fn().mockResolvedValue('alert123');

        const report = await complianceService.performGDPRCheck();

        expect(report.status).toBe('VIOLATIONS_FOUND');
        expect(report.violations).toHaveLength(2);
        expect(complianceService.alertComplianceViolations).toHaveBeenCalledWith('GDPR', violations);
      });
    });
  });

  describe('SOC2 Compliance', () => {
    describe('generateSOC2Report', () => {
      it('should generate SOC2 compliance report', async () => {
        // Mock evidence collection
        complianceService.collectSOC2Evidence = vi.fn().mockResolvedValue({
          accessLogs: [],
          changeLogs: [],
          securityIncidents: [],
          backupRecords: [],
          monitoringAlerts: []
        });

        // Mock control assessments
        complianceService.assessSOC2Controls = vi.fn().mockResolvedValue({
          CC1: { status: 'EFFECTIVE', findings: [] },
          CC2: { status: 'EFFECTIVE', findings: [] }
        });

        complianceService.generateSOC2Findings = vi.fn().mockReturnValue([]);
        complianceService.generateAuditTrail = vi.fn().mockResolvedValue(true);

        const report = await complianceService.generateSOC2Report('monthly');

        expect(report.type).toBe('SOC2_TYPE_II');
        expect(report.status).toBe('COMPLIANT');
        expect(report.period).toBeDefined();
        expect(mockStorage.store).toHaveBeenCalledWith(
          expect.stringMatching(/^compliance\/soc2\//),
          expect.objectContaining({ type: 'SOC2_TYPE_II' })
        );
      });

      it('should identify SOC2 control deficiencies', async () => {
        const findings = [
          {
            controlId: 'CC6',
            severity: 'HIGH',
            description: 'Insufficient access controls',
            recommendation: 'Implement role-based access control'
          }
        ];

        complianceService.collectSOC2Evidence = vi.fn().mockResolvedValue({});
        complianceService.assessSOC2Controls = vi.fn().mockResolvedValue({});
        complianceService.generateSOC2Findings = vi.fn().mockReturnValue(findings);
        complianceService.generateAuditTrail = vi.fn().mockResolvedValue(true);

        const report = await complianceService.generateSOC2Report('monthly');

        expect(report.status).toBe('DEFICIENCIES_FOUND');
        expect(report.findings).toEqual(findings);
        expect(report.recommendations).toBeDefined();
      });
    });
  });

  describe('Data Retention Policy Enforcement', () => {
    describe('enforceRetentionPolicies', () => {
      it('should enforce retention policies across all resource types', async () => {
        const mockResults = [
          { resourceType: 'audit-logs', deleted: 0, archived: 10, errors: [] },
          { resourceType: 'user-messages', deleted: 5, archived: 0, errors: [] },
          { resourceType: 'temp-files', deleted: 20, archived: 0, errors: [] }
        ];

        complianceService.enforceRetentionPolicy = vi.fn()
          .mockResolvedValueOnce(mockResults[0])
          .mockResolvedValueOnce(mockResults[1])
          .mockResolvedValueOnce(mockResults[2]);

        const report = await complianceService.enforceRetentionPolicies();

        expect(report.type).toBe('RETENTION_ENFORCEMENT');
        expect(report.results).toHaveLength(3);
        expect(report.summary.totalDeleted).toBe(25);
        expect(report.summary.totalArchived).toBe(10);
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          'q.compliance.retention.enforced.v1',
          expect.objectContaining({
            resourcesProcessed: 3,
            itemsDeleted: 25,
            itemsArchived: 10
          })
        );
      });

      it('should handle retention enforcement errors', async () => {
        complianceService.enforceRetentionPolicy = vi.fn()
          .mockRejectedValue(new Error('Retention enforcement failed'));

        await expect(complianceService.enforceRetentionPolicies())
          .rejects.toThrow('Retention enforcement failed');
      });
    });

    describe('enforceRetentionPolicy', () => {
      it('should delete expired data according to DELETE policy', async () => {
        const policy = { policy: 'DELETE', period: 'P30D' };
        const expiredData = [
          { id: 'item1', createdAt: '2023-01-01' },
          { id: 'item2', createdAt: '2023-01-02' }
        ];

        complianceService.findExpiredData = vi.fn().mockResolvedValue(expiredData);
        complianceService.deleteData = vi.fn().mockResolvedValue(true);

        const result = await complianceService.enforceRetentionPolicy('temp-files', policy);

        expect(result.deleted).toBe(2);
        expect(result.archived).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(complianceService.deleteData).toHaveBeenCalledTimes(2);
      });

      it('should archive expired data according to ARCHIVE policy', async () => {
        const policy = { policy: 'ARCHIVE', period: 'P7Y' };
        const expiredData = [{ id: 'audit1', createdAt: '2016-01-01' }];

        complianceService.findExpiredData = vi.fn().mockResolvedValue(expiredData);
        complianceService.archiveData = vi.fn().mockResolvedValue(true);

        const result = await complianceService.enforceRetentionPolicy('audit-logs', policy);

        expect(result.deleted).toBe(0);
        expect(result.archived).toBe(1);
        expect(complianceService.archiveData).toHaveBeenCalledWith(expiredData[0]);
      });
    });
  });

  describe('Privacy Impact Assessment', () => {
    describe('performPrivacyImpactAssessment', () => {
      it('should perform comprehensive privacy impact assessment', async () => {
        const activity = {
          activityName: 'User Analytics',
          dataTypes: ['behavioral', 'personal'],
          processingPurpose: 'Service improvement',
          legalBasis: 'LEGITIMATE_INTERESTS',
          scope: 'organization',
          processing: ['automated', 'profiling']
        };

        const mockAnalysis = {
          dataVolume: 50000,
          sensitivityLevel: 7,
          processingScope: 5,
          automatedDecisionMaking: 9
        };

        const mockRisks = [
          { type: 'AUTOMATED_PROFILING', score: 8 },
          { type: 'HIGH_DATA_VOLUME', score: 7 }
        ];

        complianceService.analyzeDataProcessing = vi.fn().mockResolvedValue(mockAnalysis);
        complianceService.assessPrivacyRisks = vi.fn().mockResolvedValue(mockRisks);
        complianceService.generatePrivacyMitigations = vi.fn().mockReturnValue([
          { risk: 'AUTOMATED_PROFILING', mitigation: 'Provide human review option' }
        ]);
        complianceService.alertHighPrivacyRisk = vi.fn().mockResolvedValue(true);

        const pia = await complianceService.performPrivacyImpactAssessment(activity);

        expect(pia.activity).toEqual(activity);
        expect(pia.riskScore).toBe(8); // Average of risk scores
        expect(pia.status).toBe('HIGH_RISK');
        expect(complianceService.alertHighPrivacyRisk).toHaveBeenCalledWith(pia);
        expect(mockStorage.store).toHaveBeenCalledWith(
          expect.stringMatching(/^compliance\/pia\//),
          expect.objectContaining({ activity })
        );
      });

      it('should classify low risk activities correctly', async () => {
        const activity = {
          activityName: 'Newsletter Subscription',
          dataTypes: ['email'],
          processingPurpose: 'Marketing',
          legalBasis: 'CONSENT'
        };

        complianceService.analyzeDataProcessing = vi.fn().mockResolvedValue({
          dataVolume: 100,
          sensitivityLevel: 1,
          processingScope: 1,
          automatedDecisionMaking: 0
        });

        complianceService.assessPrivacyRisks = vi.fn().mockResolvedValue([
          { type: 'LOW_SENSITIVITY', score: 2 }
        ]);

        complianceService.generatePrivacyMitigations = vi.fn().mockReturnValue([]);
        complianceService.alertHighPrivacyRisk = vi.fn();

        const pia = await complianceService.performPrivacyImpactAssessment(activity);

        expect(pia.riskScore).toBe(2);
        expect(pia.status).toBe('LOW_RISK');
        expect(complianceService.alertHighPrivacyRisk).not.toHaveBeenCalled();
      });
    });
  });

  describe('Compliance Dashboard', () => {
    describe('getComplianceDashboard', () => {
      it('should return comprehensive dashboard data', async () => {
        const mockRecentChecks = [
          { checkId: 'check1', type: 'GDPR_COMPLIANCE', status: 'COMPLIANT' }
        ];
        const mockViolations = [
          { violationId: 'v1', type: 'DATA_RETENTION_VIOLATION', severity: 'HIGH' }
        ];
        const mockMetrics = {
          overallScore: 85,
          pendingDSRs: 2
        };
        const mockDeadlines = [
          { type: 'DSR', daysRemaining: 5 }
        ];

        complianceService.getRecentComplianceChecks = vi.fn().mockResolvedValue(mockRecentChecks);
        complianceService.getActiveViolations = vi.fn().mockResolvedValue(mockViolations);
        complianceService.getComplianceMetrics = vi.fn().mockResolvedValue(mockMetrics);
        complianceService.getUpcomingDeadlines = vi.fn().mockResolvedValue(mockDeadlines);

        const dashboard = await complianceService.getComplianceDashboard();

        expect(dashboard.overview.complianceScore).toBe(85);
        expect(dashboard.overview.activeViolations).toBe(1);
        expect(dashboard.overview.pendingDSRs).toBe(2);
        expect(dashboard.overview.upcomingDeadlines).toBe(1);
        expect(dashboard.recentChecks).toEqual(mockRecentChecks);
        expect(dashboard.activeViolations).toEqual(mockViolations);
      });
    });

    describe('alertComplianceViolations', () => {
      it('should create and send compliance violation alerts', async () => {
        const violations = [
          { type: 'GDPR_DSR_FAILURE', severity: 'CRITICAL' },
          { type: 'DATA_RETENTION_VIOLATION', severity: 'HIGH' }
        ];

        complianceService.calculateViolationSeverity = vi.fn().mockReturnValue(9);
        complianceService.getAffectedSystems = vi.fn().mockReturnValue(['qmail', 'qdrive']);
        complianceService.getRecommendedActions = vi.fn().mockReturnValue([
          'Process overdue DSR requests',
          'Implement automated data lifecycle management'
        ]);
        complianceService.sendComplianceNotifications = vi.fn().mockResolvedValue(true);

        const alertId = await complianceService.alertComplianceViolations('GDPR', violations);

        expect(alertId).toBeDefined();
        expect(complianceService.alerts.has(alertId)).toBe(true);
        expect(complianceService.sendComplianceNotifications).toHaveBeenCalled();
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          'q.compliance.violation.alert.v1',
          expect.objectContaining({
            type: 'COMPLIANCE_VIOLATION_GDPR',
            severity: 9,
            violations
          })
        );
      });
    });
  });

  describe('Compliance Metrics', () => {
    describe('getComplianceMetrics', () => {
      it('should calculate comprehensive compliance metrics', async () => {
        const mockViolations = [
          { type: 'GDPR_DSR_FAILURE', severity: 'HIGH' },
          { type: 'DATA_RETENTION_VIOLATION', severity: 'MEDIUM' }
        ];
        const mockDSRs = [
          { status: 'COMPLETED', createdAt: '2024-01-01', completedAt: '2024-01-05' },
          { status: 'PROCESSING', createdAt: '2024-01-10' }
        ];
        const mockPIAs = [
          { riskScore: 8 },
          { riskScore: 3 },
          { riskScore: 6 }
        ];

        complianceService.getViolationsInPeriod = vi.fn().mockResolvedValue(mockViolations);
        complianceService.getDSRRequestsInPeriod = vi.fn().mockResolvedValue(mockDSRs);
        complianceService.getPIAAssessmentsInPeriod = vi.fn().mockResolvedValue(mockPIAs);

        const metrics = await complianceService.getComplianceMetrics('30d');

        expect(metrics.overallScore).toBeDefined();
        expect(metrics.violations.total).toBe(2);
        expect(metrics.violations.byType).toEqual({
          'GDPR_DSR_FAILURE': 1,
          'DATA_RETENTION_VIOLATION': 1
        });
        expect(metrics.dsrRequests.total).toBe(2);
        expect(metrics.dsrRequests.completed).toBe(1);
        expect(metrics.dsrRequests.pending).toBe(1);
        expect(metrics.piaAssessments.total).toBe(3);
        expect(metrics.piaAssessments.highRisk).toBe(1);
        expect(metrics.piaAssessments.mediumRisk).toBe(1);
        expect(metrics.piaAssessments.lowRisk).toBe(1);
      });
    });
  });

  describe('Violation Management', () => {
    describe('acknowledgeViolation', () => {
      it('should acknowledge violation successfully', async () => {
        const violationId = 'violation123';
        const violation = {
          violationId,
          type: 'DATA_RETENTION_VIOLATION',
          status: 'ACTIVE',
          timestamp: '2024-01-01T00:00:00Z'
        };

        complianceService.violations.set(violationId, violation);

        const acknowledgment = {
          acknowledgedBy: 'admin123',
          acknowledgment: 'Remediation in progress',
          timestamp: '2024-01-02T00:00:00Z'
        };

        const result = await complianceService.acknowledgeViolation(violationId, acknowledgment);

        expect(result.status).toBe('ACKNOWLEDGED');
        expect(result.acknowledgment).toEqual(acknowledgment);
        expect(mockStorage.store).toHaveBeenCalledWith(
          `compliance/violations/${violationId}`,
          expect.objectContaining({ status: 'ACKNOWLEDGED' })
        );
      });

      it('should throw error for non-existent violation', async () => {
        await expect(complianceService.acknowledgeViolation('nonexistent', {}))
          .rejects.toThrow('Violation not found');
      });
    });
  });

  describe('Privacy Risk Assessment', () => {
    describe('assessPrivacyRisks', () => {
      it('should identify high data volume risks', async () => {
        const analysis = {
          dataVolume: 150000, // Above high threshold
          sensitivityLevel: 3,
          processingScope: 5,
          automatedDecisionMaking: 0
        };

        const risks = await complianceService.assessPrivacyRisks(analysis);

        expect(risks).toContainEqual(
          expect.objectContaining({
            type: 'HIGH_DATA_VOLUME',
            score: 7
          })
        );
      });

      it('should identify sensitive data risks', async () => {
        const analysis = {
          dataVolume: 1000,
          sensitivityLevel: 9, // Restricted level
          processingScope: 1,
          automatedDecisionMaking: 0
        };

        const risks = await complianceService.assessPrivacyRisks(analysis);

        expect(risks).toContainEqual(
          expect.objectContaining({
            type: 'SENSITIVE_DATA',
            score: 9
          })
        );
      });

      it('should identify automated profiling risks', async () => {
        const analysis = {
          dataVolume: 1000,
          sensitivityLevel: 3,
          processingScope: 1,
          automatedDecisionMaking: 9 // Profiling level
        };

        const risks = await complianceService.assessPrivacyRisks(analysis);

        expect(risks).toContainEqual(
          expect.objectContaining({
            type: 'AUTOMATED_PROFILING',
            score: 8
          })
        );
      });
    });
  });

  describe('Utility Functions', () => {
    describe('calculateViolationSeverity', () => {
      it('should calculate maximum severity from violations', () => {
        const violations = [
          { type: 'DATA_RETENTION_VIOLATION' }, // Score: 7
          { type: 'GDPR_DSR_FAILURE' },        // Score: 9
          { type: 'CONSENT_VIOLATION' }        // Score: 8
        ];

        const severity = complianceService.calculateViolationSeverity(violations);
        expect(severity).toBe(9); // Maximum score
      });
    });

    describe('calculateComplianceScore', () => {
      it('should calculate compliance score based on violations and assessments', () => {
        const violations = [{ type: 'minor' }, { type: 'minor' }]; // -10 points
        const dsrRequests = [
          { status: 'COMPLETED' },
          { status: 'OVERDUE' } // -10 points
        ];
        const piaAssessments = [
          { riskScore: 8 }, // -3 points
          { riskScore: 3 }
        ];

        const score = complianceService.calculateComplianceScore(violations, dsrRequests, piaAssessments);
        expect(score).toBe(77); // 100 - 10 - 10 - 3
      });

      it('should not go below 0', () => {
        const violations = Array(30).fill({ type: 'major' }); // -150 points
        const dsrRequests = [];
        const piaAssessments = [];

        const score = complianceService.calculateComplianceScore(violations, dsrRequests, piaAssessments);
        expect(score).toBe(0);
      });
    });
  });
});