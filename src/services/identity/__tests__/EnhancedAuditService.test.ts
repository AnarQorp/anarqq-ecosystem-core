/**
 * Enhanced Audit Service Tests
 * Comprehensive test suite for the Enhanced Audit and Risk Assessment Service
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  EnhancedAuditService, 
  RiskFactor, 
  BehavioralPattern, 
  ComplianceViolation,
  SecurityAlert,
  AlertRule,
  AuditReport
} from '../EnhancedAuditService';
import { IdentityType } from '../../../types/identity';
import { WalletAuditLog, WalletOperation } from '../../../types/wallet-config';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('EnhancedAuditService', () => {
  let auditService: EnhancedAuditService;
  let mockIdentityId: string;
  let mockOperation: WalletOperation;
  let mockAuditLog: WalletAuditLog;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    auditService = new EnhancedAuditService();
    mockIdentityId = 'test_root_identity_123';
    mockOperation = {
      type: 'TRANSFER',
      amount: 1000,
      token: 'ETH'
    };
    mockAuditLog = {
      identityId: mockIdentityId,
      operation: 'transfer',
      operationType: 'TRANSFER',
      amount: 1000,
      token: 'ETH',
      success: true,
      timestamp: new Date().toISOString()
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Risk Assessment', () => {
    it('should calculate risk score for identity', async () => {
      const riskAssessment = await auditService.calculateRiskScore(mockIdentityId, mockOperation);

      expect(riskAssessment).toBeDefined();
      expect(riskAssessment.identityId).toBe(mockIdentityId);
      expect(riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.riskScore).toBeLessThanOrEqual(1);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(riskAssessment.riskLevel);
      expect(riskAssessment.factors).toBeInstanceOf(Array);
      expect(riskAssessment.recommendations).toBeInstanceOf(Array);
      expect(riskAssessment.mitigationActions).toBeInstanceOf(Array);
    });

    it('should handle high-value transactions with higher risk', async () => {
      const highValueOperation = { ...mockOperation, amount: 50000 };
      const riskAssessment = await auditService.calculateRiskScore(mockIdentityId, highValueOperation);

      expect(riskAssessment.riskScore).toBeGreaterThan(0.5);
      expect(['HIGH', 'CRITICAL']).toContain(riskAssessment.riskLevel);
    });

    it('should handle low-value transactions with lower risk', async () => {
      const lowValueOperation = { ...mockOperation, amount: 10 };
      const riskAssessment = await auditService.calculateRiskScore(mockIdentityId, lowValueOperation);

      expect(riskAssessment.riskScore).toBeLessThan(0.7);
    });

    it('should return error assessment on calculation failure', async () => {
      // Force an error by passing invalid data
      const invalidIdentityId = null as any;
      const riskAssessment = await auditService.calculateRiskScore(invalidIdentityId, mockOperation);

      expect(riskAssessment.riskLevel).toBe('HIGH');
      expect(riskAssessment.riskScore).toBe(0.8);
      expect(riskAssessment.factors[0].name).toBe('Risk Calculation Error');
    });

    it('should get risk factors for identity', async () => {
      await auditService.calculateRiskScore(mockIdentityId, mockOperation);
      const riskFactors = await auditService.getRiskFactors(mockIdentityId);

      expect(riskFactors).toBeInstanceOf(Array);
      expect(riskFactors.length).toBeGreaterThan(0);
      riskFactors.forEach(factor => {
        expect(factor).toHaveProperty('id');
        expect(factor).toHaveProperty('name');
        expect(factor).toHaveProperty('category');
        expect(factor).toHaveProperty('score');
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Behavioral Analysis', () => {
    beforeEach(async () => {
      // Add some audit logs for behavioral analysis
      const logs = [
        { ...mockAuditLog, timestamp: new Date(Date.now() - 1000).toISOString(), amount: 1000 },
        { ...mockAuditLog, timestamp: new Date(Date.now() - 2000).toISOString(), amount: 2000 },
        { ...mockAuditLog, timestamp: new Date(Date.now() - 3000).toISOString(), amount: 1500 },
      ];

      for (const log of logs) {
        await auditService.logOperation(log);
      }
    });

    it('should analyze behavioral patterns', async () => {
      const patterns = await auditService.analyzeBehavioralPatterns(mockIdentityId);

      expect(patterns).toBeInstanceOf(Array);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('identityId');
        expect(pattern).toHaveProperty('patternType');
        expect(pattern).toHaveProperty('confidence');
        expect(['NORMAL', 'SUSPICIOUS', 'ANOMALOUS', 'FRAUDULENT']).toContain(pattern.patternType);
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should detect anomalies', async () => {
      const anomalies = await auditService.detectAnomalies(mockIdentityId, 60);

      expect(anomalies).toBeInstanceOf(Array);
      anomalies.forEach(anomaly => {
        expect(['SUSPICIOUS', 'ANOMALOUS', 'FRAUDULENT']).toContain(anomaly.patternType);
        expect(anomaly.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should update behavioral baseline', async () => {
      const result = await auditService.updateBehavioralBaseline(mockIdentityId);

      expect(result).toBe(true);
    });

    it('should handle empty audit logs gracefully', async () => {
      const emptyIdentityId = 'empty_identity';
      const patterns = await auditService.analyzeBehavioralPatterns(emptyIdentityId);
      const anomalies = await auditService.detectAnomalies(emptyIdentityId, 60);

      expect(patterns).toEqual([]);
      expect(anomalies).toEqual([]);
    });
  });

  describe('Compliance Monitoring', () => {
    it('should check compliance for operations', async () => {
      const violations = await auditService.checkCompliance(mockIdentityId, mockOperation);

      expect(violations).toBeInstanceOf(Array);
      violations.forEach(violation => {
        expect(violation).toHaveProperty('id');
        expect(violation).toHaveProperty('identityId');
        expect(violation).toHaveProperty('violationType');
        expect(violation).toHaveProperty('severity');
        expect(['AML', 'KYC', 'SANCTIONS', 'REGULATORY', 'INTERNAL']).toContain(violation.violationType);
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(violation.severity);
      });
    });

    it('should detect AML violations for structuring', async () => {
      // Create multiple transactions just under $10,000
      const structuringOperations = [
        { ...mockOperation, amount: 9500 },
        { ...mockOperation, amount: 9800 },
        { ...mockOperation, amount: 9900 }
      ];

      // Log the operations first
      for (const op of structuringOperations) {
        await auditService.logOperation({
          ...mockAuditLog,
          amount: op.amount,
          timestamp: new Date().toISOString()
        });
      }

      const violations = await auditService.checkCompliance(mockIdentityId, structuringOperations[2]);
      const amlViolations = violations.filter(v => v.violationType === 'AML');

      expect(amlViolations.length).toBeGreaterThan(0);
      expect(amlViolations[0].description).toContain('structuring');
    });

    it('should detect large transaction reporting requirements', async () => {
      const largeOperation = { ...mockOperation, amount: 15000 };
      const violations = await auditService.checkCompliance(mockIdentityId, largeOperation);
      const amlViolations = violations.filter(v => v.violationType === 'AML');

      expect(amlViolations.length).toBeGreaterThan(0);
      expect(amlViolations[0].description).toContain('CTR');
    });

    it('should detect KYC violations for unverified identities', async () => {
      const aidIdentityId = 'test_aid_identity_123';
      const highValueOperation = { ...mockOperation, amount: 5000 };
      const violations = await auditService.checkCompliance(aidIdentityId, highValueOperation);
      const kycViolations = violations.filter(v => v.violationType === 'KYC');

      expect(kycViolations.length).toBeGreaterThan(0);
      expect(kycViolations[0].description).toContain('unverified');
    });

    it('should generate compliance report', async () => {
      // Create some violations first
      await auditService.checkCompliance(mockIdentityId, { ...mockOperation, amount: 15000 });
      
      const report = await auditService.generateComplianceReport(mockIdentityId);

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('identityId', mockIdentityId);
      expect(report).toHaveProperty('overallStatus');
      expect(['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW']).toContain(report.overallStatus);
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
    });

    it('should resolve violations', async () => {
      const violations = await auditService.checkCompliance(mockIdentityId, { ...mockOperation, amount: 15000 });
      
      if (violations.length > 0) {
        const result = await auditService.resolveViolation(violations[0].id, 'Manual review completed');
        expect(result).toBe(true);
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log operations', async () => {
      const result = await auditService.logOperation(mockAuditLog);

      expect(result).toBe(true);
    });

    it('should get audit trail', async () => {
      await auditService.logOperation(mockAuditLog);
      const auditTrail = await auditService.getAuditTrail(mockIdentityId);

      expect(auditTrail).toBeInstanceOf(Array);
      expect(auditTrail.length).toBeGreaterThan(0);
      expect(auditTrail[0]).toHaveProperty('identityId', mockIdentityId);
    });

    it('should filter audit trail', async () => {
      await auditService.logOperation(mockAuditLog);
      await auditService.logOperation({ ...mockAuditLog, operationType: 'DEPOSIT' });

      const filteredTrail = await auditService.getAuditTrail(mockIdentityId, {
        operationType: 'TRANSFER'
      });

      expect(filteredTrail.length).toBe(1);
      expect(filteredTrail[0].operationType).toBe('TRANSFER');
    });

    it('should export audit logs', async () => {
      await auditService.logOperation(mockAuditLog);
      const filename = await auditService.exportAuditLogs({ identityId: mockIdentityId });

      expect(filename).toContain('audit_export_');
      expect(filename).toContain('.csv');
    });
  });

  describe('Alerting System', () => {
    let mockAlertRule: AlertRule;

    beforeEach(() => {
      mockAlertRule = {
        id: 'test_alert_rule',
        name: 'Test Alert Rule',
        description: 'Test alert for high value transactions',
        category: 'TRANSACTION',
        conditions: [
          { field: 'amount', operator: 'GT', value: 5000 }
        ],
        actions: [
          { type: 'LOG', config: {} }
        ],
        enabled: true,
        priority: 'HIGH',
        cooldownPeriod: 60
      };
    });

    it('should create alert rules', async () => {
      const result = await auditService.createAlertRule(mockAlertRule);

      expect(result).toBe(true);
    });

    it('should evaluate alerts', async () => {
      await auditService.createAlertRule(mockAlertRule);
      const highValueOperation = { ...mockOperation, amount: 10000 };
      
      const alerts = await auditService.evaluateAlerts(mockIdentityId, highValueOperation);

      expect(alerts).toBeInstanceOf(Array);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty('id');
        expect(alerts[0]).toHaveProperty('ruleId', mockAlertRule.id);
        expect(alerts[0]).toHaveProperty('identityId', mockIdentityId);
        expect(alerts[0]).toHaveProperty('severity');
      }
    });

    it('should not trigger alerts during cooldown period', async () => {
      await auditService.createAlertRule(mockAlertRule);
      const highValueOperation = { ...mockOperation, amount: 10000 };
      
      // First evaluation should trigger alert
      const firstAlerts = await auditService.evaluateAlerts(mockIdentityId, highValueOperation);
      
      // Second evaluation immediately after should not trigger due to cooldown
      const secondAlerts = await auditService.evaluateAlerts(mockIdentityId, highValueOperation);

      expect(firstAlerts.length).toBeGreaterThanOrEqual(secondAlerts.length);
    });

    it('should resolve alerts', async () => {
      await auditService.createAlertRule(mockAlertRule);
      const alerts = await auditService.evaluateAlerts(mockIdentityId, { ...mockOperation, amount: 10000 });
      
      if (alerts.length > 0) {
        const result = await auditService.resolveAlert(alerts[0].id, 'False positive');
        expect(result).toBe(true);
      }
    });
  });

  describe('Reporting', () => {
    beforeEach(async () => {
      // Set up some data for reporting
      await auditService.logOperation(mockAuditLog);
      await auditService.calculateRiskScore(mockIdentityId, mockOperation);
    });

    it('should generate audit report', async () => {
      const reportConfig = {
        identityId: mockIdentityId,
        reportType: 'ON_DEMAND' as const,
        includeRiskAnalysis: true,
        includeComplianceAnalysis: true,
        includeBehavioralAnalysis: true,
        format: 'JSON' as const
      };

      const report = await auditService.generateAuditReport(reportConfig);

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('identityId', mockIdentityId);
      expect(report).toHaveProperty('reportType', 'ON_DEMAND');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('riskAnalysis');
      expect(report).toHaveProperty('complianceAnalysis');
      expect(report).toHaveProperty('behavioralAnalysis');
      expect(report.summary).toHaveProperty('totalTransactions');
      expect(report.summary).toHaveProperty('riskScore');
    });

    it('should schedule reports', async () => {
      const reportConfig = {
        reportType: 'DAILY' as const,
        includeRiskAnalysis: true,
        includeComplianceAnalysis: false,
        includeBehavioralAnalysis: false,
        format: 'JSON' as const
      };

      const scheduleId = await auditService.scheduleReport(reportConfig, '0 0 * * *');

      expect(scheduleId).toContain('schedule_');
    });

    it('should get report history', async () => {
      const history = await auditService.getReportHistory(mockIdentityId);

      expect(history).toBeInstanceOf(Array);
    });
  });

  describe('Data Persistence', () => {
    it('should save data to localStorage', async () => {
      await auditService.logOperation(mockAuditLog);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'enhanced_audit_data',
        expect.any(String)
      );
    });

    it('should load data from localStorage', () => {
      const mockData = {
        auditLogs: { [mockIdentityId]: [mockAuditLog] },
        riskAssessments: {},
        behavioralPatterns: {},
        complianceViolations: {},
        alertRules: {},
        securityAlerts: {},
        riskModels: {},
        behavioralBaselines: {}
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));
      
      const newService = new EnhancedAuditService();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('enhanced_audit_data');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => new EnhancedAuditService()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operations gracefully', async () => {
      const invalidOperation = null as any;
      const result = await auditService.checkCompliance(mockIdentityId, invalidOperation);

      expect(result).toBeInstanceOf(Array);
    });

    it('should handle missing identity gracefully', async () => {
      const result = await auditService.getAuditTrail('nonexistent_identity');

      expect(result).toEqual([]);
    });

    it('should handle storage errors during save', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = await auditService.logOperation(mockAuditLog);
      
      // Should still return true even if storage fails
      expect(result).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of audit logs efficiently', async () => {
      const startTime = Date.now();
      
      // Create 1000 audit logs
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(auditService.logOperation({
          ...mockAuditLog,
          timestamp: new Date(Date.now() - i * 1000).toISOString()
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent risk assessments', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(auditService.calculateRiskScore(`identity_${i}`, mockOperation));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('riskScore');
        expect(result).toHaveProperty('riskLevel');
      });
    });
  });
});