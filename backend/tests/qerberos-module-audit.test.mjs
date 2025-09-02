/**
 * Qerberos Module Registration Audit Logging Tests
 * Tests the enhanced audit logging functionality for module registration events
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QerberosService } from '../ecosystem/QerberosService.mjs';
import { ModuleStatus } from '../../src/types/qwallet-module-registration.ts';

describe('Qerberos Module Registration Audit Logging', () => {
  let qerberosService;

  beforeEach(() => {
    qerberosService = new QerberosService();
  });

  afterEach(() => {
    // Clean up any test data
    qerberosService.eventLog = [];
    qerberosService.moduleAuditTrails = new Map();
    qerberosService.moduleAlerts = [];
    qerberosService.moduleStats = null;
  });

  describe('logModuleRegistration', () => {
    it('should log successful module registration with complete audit trail', async () => {
      const registrationData = {
        action: 'REGISTERED',
        moduleId: 'test-qwallet',
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        testMode: false,
        complianceInfo: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        auditHash: 'abc123def456789',
        signatureInfo: {
          algorithm: 'RSA-SHA256',
          publicKeyId: 'did:root:test-identity_module_key',
          valid: true,
          identityType: 'ROOT'
        },
        dependencyInfo: {
          dependencies: ['qindex', 'qlock'],
          integrations: ['qsocial', 'qerberos']
        }
      };

      const result = await qerberosService.logModuleRegistration(registrationData);

      expect(result).toMatchObject({
        logged: true,
        severity: 'medium',
        complianceIssues: expect.any(Array)
      });
      expect(result.auditTrailId).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Verify event was logged
      expect(qerberosService.eventLog).toHaveLength(1);
      const loggedEvent = qerberosService.eventLog[0];
      
      expect(loggedEvent).toMatchObject({
        eventType: 'MODULE_REGISTRATION',
        action: 'REGISTERED',
        moduleId: 'test-qwallet',
        signerIdentity: 'did:root:test-identity',
        success: true,
        severity: 'medium'
      });

      expect(loggedEvent.moduleMetadata).toMatchObject({
        version: '1.0.0',
        status: ModuleStatus.PRODUCTION_READY,
        testMode: false,
        auditHash: 'abc123def456789'
      });

      expect(loggedEvent.complianceTracking).toMatchObject({
        auditRequired: true,
        privacyEnforced: true,
        kycSupport: false,
        gdprCompliant: true,
        riskScoring: true
      });

      expect(loggedEvent.securityContext).toMatchObject({
        signatureAlgorithm: 'RSA-SHA256',
        publicKeyId: 'did:root:test-identity_module_key',
        signatureValid: true,
        identityType: 'ROOT',
        authorizationLevel: 'ROOT'
      });
    });

    it('should log failed module registration with error details', async () => {
      const registrationData = {
        action: 'REGISTRATION_FAILED',
        moduleId: 'test-qwallet-failed',
        signerIdentity: 'did:root:test-identity',
        success: false,
        error: 'Signature verification failed',
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.DEVELOPMENT,
        testMode: true,
        signatureInfo: {
          algorithm: 'RSA-SHA256',
          publicKeyId: 'did:root:test-identity_module_key',
          valid: false,
          identityType: 'ROOT'
        }
      };

      const result = await qerberosService.logModuleRegistration(registrationData);

      expect(result).toMatchObject({
        logged: true,
        severity: 'high', // Failed events are high severity
        complianceIssues: expect.any(Array)
      });

      // Verify event was logged with error details
      expect(qerberosService.eventLog).toHaveLength(1);
      const loggedEvent = qerberosService.eventLog[0];
      
      expect(loggedEvent).toMatchObject({
        eventType: 'MODULE_REGISTRATION',
        action: 'REGISTRATION_FAILED',
        success: false,
        error: 'Signature verification failed',
        severity: 'high'
      });
    });

    it('should create module-specific audit trail entries', async () => {
      const moduleId = 'test-audit-trail';
      const registrationData = {
        action: 'REGISTERED',
        moduleId,
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        complianceInfo: {
          audit: true,
          gdpr_compliant: true
        }
      };

      await qerberosService.logModuleRegistration(registrationData);

      // Verify audit trail was created
      expect(qerberosService.moduleAuditTrails).toBeDefined();
      expect(qerberosService.moduleAuditTrails.has(moduleId)).toBe(true);
      
      const auditTrail = qerberosService.moduleAuditTrails.get(moduleId);
      expect(auditTrail).toHaveLength(1);
      
      const auditEntry = auditTrail[0];
      expect(auditEntry).toMatchObject({
        moduleId,
        action: 'REGISTERED',
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        testMode: false
      });
      
      expect(auditEntry.auditId).toBeDefined();
      expect(auditEntry.complianceSnapshot).toBeDefined();
      expect(auditEntry.securitySnapshot).toBeDefined();
      expect(auditEntry.regulatoryFlags).toBeDefined();
    });

    it('should detect and report compliance violations', async () => {
      const registrationData = {
        action: 'REGISTERED',
        moduleId: 'test-compliance-violation',
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY, // Production module
        complianceInfo: {
          audit: false, // Missing required audit for production
          gdpr_compliant: false,
          privacy_enforced: false,
          kyc_support: false,
          risk_scoring: false
        }
      };

      const result = await qerberosService.logModuleRegistration(registrationData);

      expect(result.complianceIssues).toHaveLength(1);
      expect(result.complianceIssues[0]).toMatchObject({
        type: 'AUDIT_REQUIRED',
        severity: 'high',
        message: 'Production modules must have completed security audit',
        regulation: 'INTERNAL_SECURITY_POLICY'
      });
    });

    it('should generate alerts for critical events', async () => {
      const registrationData = {
        action: 'DEREGISTERED',
        moduleId: 'test-critical-event',
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY
      };

      await qerberosService.logModuleRegistration(registrationData);

      // Verify alert was generated for critical event
      expect(qerberosService.moduleAlerts).toBeDefined();
      expect(qerberosService.moduleAlerts.length).toBeGreaterThan(0);
      
      const alert = qerberosService.moduleAlerts.find(a => a.type === 'CRITICAL_MODULE_EVENT');
      expect(alert).toBeDefined();
      expect(alert).toMatchObject({
        type: 'CRITICAL_MODULE_EVENT',
        moduleId: 'test-critical-event',
        severity: 'critical',
        message: expect.stringContaining('Critical module event: DEREGISTERED')
      });
    });

    it('should update module registration statistics', async () => {
      const registrationData = {
        action: 'REGISTERED',
        moduleId: 'test-stats',
        signerIdentity: 'did:root:test-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        complianceInfo: {
          audit: true,
          gdpr_compliant: true,
          kyc_support: true,
          privacy_enforced: true
        }
      };

      await qerberosService.logModuleRegistration(registrationData);

      // Verify statistics were updated
      expect(qerberosService.moduleStats).toBeDefined();
      expect(qerberosService.moduleStats).toMatchObject({
        totalRegistrations: 1,
        successfulRegistrations: 1,
        failedRegistrations: 0
      });
      
      expect(qerberosService.moduleStats.modulesByStatus[ModuleStatus.PRODUCTION_READY]).toBe(1);
      expect(qerberosService.moduleStats.registrationsByAction['REGISTERED']).toBe(1);
      
      expect(qerberosService.moduleStats.complianceStats).toMatchObject({
        auditedModules: 1,
        gdprCompliantModules: 1,
        kycSupportingModules: 1,
        privacyEnforcingModules: 1
      });
    });
  });

  describe('queryModuleAuditEvents', () => {
    beforeEach(async () => {
      // Set up test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'test-module-1',
        signerIdentity: 'did:root:identity-1',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        testMode: false
      });

      await qerberosService.logModuleRegistration({
        action: 'UPDATED',
        moduleId: 'test-module-1',
        signerIdentity: 'did:root:identity-1',
        success: true,
        moduleVersion: '1.1.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        testMode: false
      });

      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'test-module-2',
        signerIdentity: 'did:root:identity-2',
        success: false,
        error: 'Test error',
        testMode: true
      });
    });

    it('should query all module audit events', async () => {
      const result = await qerberosService.queryModuleAuditEvents();

      expect(result.events).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter events by module ID', async () => {
      const result = await qerberosService.queryModuleAuditEvents({
        moduleId: 'test-module-1'
      });

      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.moduleId === 'test-module-1')).toBe(true);
    });

    it('should filter events by action', async () => {
      const result = await qerberosService.queryModuleAuditEvents({
        action: 'REGISTERED'
      });

      expect(result.events).toHaveLength(2);
      expect(result.events.every(e => e.action === 'REGISTERED')).toBe(true);
    });

    it('should filter events by success status', async () => {
      const result = await qerberosService.queryModuleAuditEvents({
        success: false
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].success).toBe(false);
    });

    it('should filter events by test mode', async () => {
      const result = await qerberosService.queryModuleAuditEvents({
        testMode: true
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].moduleMetadata.testMode).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await qerberosService.queryModuleAuditEvents({
        limit: 2,
        offset: 0
      });

      expect(result.events).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(true);

      const nextResult = await qerberosService.queryModuleAuditEvents({
        limit: 2,
        offset: 2
      });

      expect(nextResult.events).toHaveLength(1);
      expect(nextResult.hasMore).toBe(false);
    });
  });

  describe('exportModuleAuditData', () => {
    beforeEach(async () => {
      // Set up test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'export-test-module',
        signerIdentity: 'did:root:export-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        complianceInfo: {
          audit: true,
          gdpr_compliant: true,
          privacy_enforced: true
        }
      });
    });

    it('should export audit data in JSON format', async () => {
      const exportData = await qerberosService.exportModuleAuditData({
        format: 'json',
        moduleId: 'export-test-module'
      });

      expect(exportData).toHaveProperty('exportMetadata');
      expect(exportData).toHaveProperty('auditEvents');
      expect(exportData.exportMetadata).toMatchObject({
        exportId: expect.any(String),
        exportTimestamp: expect.any(String),
        exportedBy: 'qerberos-audit-system',
        totalEvents: 1
      });
      expect(exportData.auditEvents).toHaveLength(1);
    });

    it('should export audit data in CSV format', async () => {
      const csvData = await qerberosService.exportModuleAuditData({
        format: 'csv',
        moduleId: 'export-test-module'
      });

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('EventID,Timestamp,ModuleID,Action,SignerIdentity,Success,ModuleVersion,TestMode');
      expect(csvData).toContain('export-test-module');
      expect(csvData).toContain('REGISTERED');
    });

    it('should export audit data in XML format', async () => {
      const xmlData = await qerberosService.exportModuleAuditData({
        format: 'xml',
        moduleId: 'export-test-module'
      });

      expect(typeof xmlData).toBe('string');
      expect(xmlData).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlData).toContain('<ModuleAuditExport>');
      expect(xmlData).toContain('<ExportMetadata>');
      expect(xmlData).toContain('<AuditEvents>');
      expect(xmlData).toContain('export-test-module');
    });

    it('should include compliance report when requested', async () => {
      const exportData = await qerberosService.exportModuleAuditData({
        moduleId: 'export-test-module',
        includeComplianceData: true
      });

      expect(exportData).toHaveProperty('complianceReport');
      expect(exportData.complianceReport).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        moduleId: 'export-test-module',
        complianceSummary: expect.any(Object),
        violations: expect.any(Array),
        recommendations: expect.any(Array),
        regulatoryFlags: expect.any(Array)
      });
    });

    it('should include security report when requested', async () => {
      const exportData = await qerberosService.exportModuleAuditData({
        moduleId: 'export-test-module',
        includeSecurityData: true
      });

      expect(exportData).toHaveProperty('securityReport');
      expect(exportData.securityReport).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        moduleId: 'export-test-module',
        securitySummary: expect.any(Object),
        securityIncidents: expect.any(Array),
        signatureAnalysis: expect.any(Object),
        riskAssessment: expect.any(Object)
      });
    });

    it('should include statistics report when requested', async () => {
      const exportData = await qerberosService.exportModuleAuditData({
        moduleId: 'export-test-module',
        includeStatistics: true
      });

      expect(exportData).toHaveProperty('statisticsReport');
      expect(exportData.statisticsReport).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        moduleId: 'export-test-module',
        overallStats: expect.any(Object),
        actionBreakdown: expect.any(Object),
        statusBreakdown: expect.any(Object),
        timelineAnalysis: expect.any(Object),
        performanceMetrics: expect.any(Object)
      });
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(async () => {
      // Set up test data with compliance violations
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'compliance-test-module',
        signerIdentity: 'did:root:compliance-identity',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: ModuleStatus.PRODUCTION_READY,
        complianceInfo: {
          audit: false, // Violation: production module without audit
          gdpr_compliant: false,
          privacy_enforced: false,
          kyc_support: false,
          risk_scoring: false
        }
      });
    });

    it('should generate comprehensive compliance report', async () => {
      const report = await qerberosService.generateComplianceReport('compliance-test-module');

      expect(report).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        moduleId: 'compliance-test-module',
        complianceSummary: {
          totalEvents: 1,
          complianceViolations: 1,
          auditedModules: 0,
          gdprCompliantModules: 0,
          kycSupportingModules: 0,
          privacyEnforcingModules: 0
        },
        violations: expect.any(Array),
        recommendations: expect.any(Array),
        regulatoryFlags: expect.any(Array)
      });

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0]).toMatchObject({
        moduleId: 'compliance-test-module',
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'AUDIT_REQUIRED',
            severity: 'high'
          })
        ])
      });
    });
  });

  describe('generateSecurityReport', () => {
    beforeEach(async () => {
      // Set up test data with security events
      await qerberosService.logModuleRegistration({
        action: 'REGISTRATION_FAILED',
        moduleId: 'security-test-module',
        signerIdentity: 'did:root:security-identity',
        success: false,
        error: 'signature verification failed',
        signatureInfo: {
          algorithm: 'RSA-SHA256',
          valid: false,
          identityType: 'ROOT'
        }
      });
    });

    it('should generate comprehensive security report', async () => {
      const report = await qerberosService.generateSecurityReport('security-test-module');

      expect(report).toMatchObject({
        reportId: expect.any(String),
        generatedAt: expect.any(String),
        moduleId: 'security-test-module',
        securitySummary: {
          totalEvents: 1,
          signatureFailures: 1,
          unauthorizedAttempts: 0,
          criticalEvents: 0,
          securityAlerts: 0
        },
        securityIncidents: expect.any(Array),
        signatureAnalysis: expect.any(Object),
        riskAssessment: expect.any(Object)
      });

      expect(report.signatureAnalysis.algorithms['RSA-SHA256']).toBe(1);
      expect(report.signatureAnalysis.identityTypes['ROOT']).toBe(1);
      expect(report.signatureAnalysis.verificationResults.invalid).toBe(1);
    });
  });

  describe('health check integration', () => {
    it('should include module registration metrics in health check', async () => {
      // Add some test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'health-test-module',
        signerIdentity: 'did:root:health-identity',
        success: true,
        moduleVersion: '1.0.0'
      });

      const healthCheck = await qerberosService.healthCheck();

      expect(healthCheck).toHaveProperty('moduleRegistration');
      expect(healthCheck.moduleRegistration).toMatchObject({
        auditTrails: expect.any(Number),
        moduleAlerts: expect.any(Number),
        totalRegistrations: expect.any(Number),
        successfulRegistrations: expect.any(Number)
      });
    });
  });
});