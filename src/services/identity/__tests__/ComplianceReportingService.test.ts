/**
 * Compliance Reporting Service Tests
 * Tests for compliance report generation, audit trail export,
 * regulatory reporting templates, and automated compliance monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ComplianceReportingService,
  RegulatoryReportType,
  ComplianceViolation,
  ComplianceTemplate,
  ComplianceMonitoringRule
} from '../ComplianceReportingService';
import { IdentityType } from '../../../types/identity';
import { WalletTransaction, TransactionExportOptions, TransactionFilter } from '../../../types/wallet-transactions';
import { DateRange } from '../../../types/wallet-config';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock external services
vi.mock('../EnhancedAuditService', () => ({
  enhancedAuditService: {
    getAuditTrail: vi.fn().mockResolvedValue([
      {
        id: 'audit_1',
        identityId: 'test-identity',
        operation: 'TRANSFER',
        operationType: 'TRANSFER',
        timestamp: new Date().toISOString(),
        success: true,
        riskScore: 0.3,
        securityLevel: 'MEDIUM',
        metadata: { sessionId: 'session_1' },
        complianceFlags: [],
        retentionPeriod: 365
      }
    ])
  }
}));

vi.mock('../RiskAssessmentService', () => ({
  riskAssessmentService: {
    assessRisk: vi.fn().mockResolvedValue({
      identityId: 'test-identity',
      overallRisk: 'LOW',
      riskFactors: [
        {
          type: 'VELOCITY',
          severity: 'LOW',
          description: 'Normal transaction velocity',
          value: 5,
          threshold: 10,
          firstDetected: new Date().toISOString(),
          lastDetected: new Date().toISOString()
        }
      ],
      recommendations: ['Continue monitoring'],
      lastAssessment: new Date().toISOString(),
      nextAssessment: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      autoActions: []
    }),
    logAuditEvent: vi.fn().mockResolvedValue('audit-event-id')
  }
}));

describe('ComplianceReportingService', () => {
  let service: ComplianceReportingService;
  let mockIdentityId: string;
  let mockPeriod: DateRange;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    service = new ComplianceReportingService();
    mockIdentityId = 'test-identity-123';
    mockPeriod = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    };
  });

  describe('Report Generation', () => {
    it('should generate compliance report', async () => {
      const report = await service.generateComplianceReport(mockIdentityId, mockPeriod);

      expect(report).toBeDefined();
      expect(report.identityId).toBe(mockIdentityId);
      expect(report.period).toEqual(mockPeriod);
      expect(report.reportType).toBe('COMPLIANCE_STATUS');
      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.generatedBy).toBe('ComplianceReportingService');
      expect(report.version).toBe('1.0');
      expect(report.transactionCount).toBeGreaterThanOrEqual(0);
      expect(report.totalVolume).toBeGreaterThanOrEqual(0);
      expect(report.riskEvents).toBeGreaterThanOrEqual(0);
      expect(report.complianceViolations).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.transactions)).toBe(true);
      expect(Array.isArray(report.riskAssessments)).toBe(true);
      expect(Array.isArray(report.auditLogs)).toBe(true);
    });

    it('should generate regulatory report', async () => {
      const reportType = RegulatoryReportType.AML_SUSPICIOUS_ACTIVITY;
      const jurisdiction = 'US';
      
      const report = await service.generateRegulatoryReport(mockIdentityId, reportType, jurisdiction, mockPeriod);

      expect(report).toBeDefined();
      expect(report.identityId).toBe(mockIdentityId);
      expect(report.reportType).toBe(reportType);
      expect(report.jurisdiction).toBe(jurisdiction);
      expect(report.period).toEqual(mockPeriod);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalTransactions).toBeGreaterThanOrEqual(0);
      expect(report.summary.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.regulatoryData).toBeDefined();
      expect(Array.isArray(report.certifications)).toBe(true);
      expect(report.format).toBeDefined();
      expect(report.encrypted).toBe(false);
    });

    it('should export audit trail to CSV', async () => {
      const options: TransactionExportOptions = {
        format: 'CSV',
        includeMetadata: true,
        includeAuditTrail: true,
        includeComplianceData: false,
        anonymizeAddresses: false,
        excludePrivateTransactions: false,
        startDate: mockPeriod.startDate,
        endDate: mockPeriod.endDate
      };

      const result = await service.exportAuditTrail(mockIdentityId, options);

      expect(typeof result).toBe('string');
      expect(result).toContain('ID,Identity ID,Operation,Type,Timestamp,Success,Risk Score,Security Level');
    });

    it('should create and manage monitoring rules', async () => {
      const rule: ComplianceMonitoringRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test monitoring rule',
        category: 'TRANSACTION',
        conditions: [
          {
            field: 'transaction.amount',
            operator: 'GT',
            value: 5000,
            weight: 1.0
          }
        ],
        threshold: 100,
        timeWindow: 60,
        actions: [
          {
            type: 'ALERT',
            config: { severity: 'MEDIUM' }
          }
        ],
        enabled: true,
        priority: 'MEDIUM',
        cooldownPeriod: 30,
        createdAt: new Date().toISOString(),
        triggerCount: 0
      };

      const ruleId = await service.createMonitoringRule(rule);
      expect(ruleId).toBe('test-rule');
    });

    it('should calculate compliance metrics', async () => {
      const metrics = await service.getComplianceMetrics(mockIdentityId, mockPeriod);

      expect(metrics).toBeDefined();
      expect(metrics.identityId).toBe(mockIdentityId);
      expect(metrics.period).toEqual(mockPeriod);
      expect(typeof metrics.complianceScore).toBe('number');
      expect(metrics.complianceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.complianceScore).toBeLessThanOrEqual(100);
      expect(typeof metrics.riskScore).toBe('number');
      expect(typeof metrics.violationCount).toBe('number');
      expect(typeof metrics.alertCount).toBe('number');
      expect(Array.isArray(metrics.recommendations)).toBe(true);
      expect(Array.isArray(metrics.actionItems)).toBe(true);
    });

    it('should report and manage violations', async () => {
      const violation: ComplianceViolation = {
        id: 'test-violation',
        identityId: mockIdentityId,
        violationType: 'LIMIT_EXCEEDED',
        severity: 'MEDIUM',
        description: 'Daily transaction limit exceeded',
        detectedAt: new Date().toISOString(),
        relatedTransactions: ['tx_1', 'tx_2'],
        status: 'OPEN',
        evidence: [],
        documentation: [],
        reportedToAuthorities: false
      };

      const violationId = await service.reportViolation(violation);
      expect(violationId).toBe('test-violation');
      
      const violations = await service.getViolations(mockIdentityId);
      expect(violations.length).toBeGreaterThan(0);
      
      const reportedViolation = violations.find(v => v.id === violationId);
      expect(reportedViolation).toBeDefined();
      expect(reportedViolation!.violationType).toBe('LIMIT_EXCEEDED');
      expect(reportedViolation!.severity).toBe('MEDIUM');
    });
  });
});