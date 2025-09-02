/**
 * Module Registration Service - Qerberos Integration Test
 * Tests the integration between ModuleRegistrationService and enhanced Qerberos audit logging
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QerberosService } from '../ecosystem/QerberosService.mjs';

describe('Module Registration Service - Qerberos Integration', () => {
  let qerberosService;

  beforeEach(() => {
    qerberosService = new QerberosService();
  });

  afterEach(() => {
    // Clean up test data
    qerberosService.eventLog = [];
    qerberosService.moduleAuditTrails = new Map();
    qerberosService.moduleAlerts = [];
    qerberosService.moduleStats = null;
  });

  describe('Enhanced Module Registration Logging', () => {
    it('should log module registration with enhanced metadata structure', async () => {
      // Simulate a module registration event as would be called by ModuleRegistrationService
      const registrationData = {
        action: 'REGISTERED',
        moduleId: 'qwallet',
        signerIdentity: 'did:root:system-admin',
        success: true,
        details: {
          version: '1.0.0',
          status: 'PRODUCTION_READY',
          testMode: false
        },
        moduleVersion: '1.0.0',
        moduleStatus: 'PRODUCTION_READY',
        testMode: false,
        complianceInfo: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        auditHash: 'sha256:abc123def456789',
        signatureInfo: {
          algorithm: 'RSA-SHA256',
          publicKeyId: 'did:root:system-admin_module_key',
          valid: true,
          identityType: 'ROOT'
        },
        dependencyInfo: {
          dependencies: ['qindex', 'qlock'],
          integrations: ['qsocial', 'qerberos']
        }
      };

      const result = await qerberosService.logModuleRegistration(registrationData);

      // Verify the audit logging result
      expect(result).toMatchObject({
        logged: true,
        severity: 'medium',
        complianceIssues: expect.any(Array)
      });
      expect(result.auditTrailId).toBeDefined();

      // Verify the event was properly logged with enhanced structure
      expect(qerberosService.eventLog).toHaveLength(1);
      const loggedEvent = qerberosService.eventLog[0];

      expect(loggedEvent).toMatchObject({
        eventType: 'MODULE_REGISTRATION',
        action: 'REGISTERED',
        moduleId: 'qwallet',
        signerIdentity: 'did:root:system-admin',
        success: true,
        severity: 'medium'
      });

      // Verify enhanced module metadata structure
      expect(loggedEvent.moduleMetadata).toMatchObject({
        version: '1.0.0',
        status: 'PRODUCTION_READY',
        testMode: false,
        auditHash: 'sha256:abc123def456789',
        complianceInfo: {
          audit: true,
          risk_scoring: true,
          privacy_enforced: true,
          kyc_support: false,
          gdpr_compliant: true,
          data_retention_policy: 'standard'
        },
        signatureInfo: {
          algorithm: 'RSA-SHA256',
          publicKeyId: 'did:root:system-admin_module_key',
          valid: true,
          identityType: 'ROOT'
        }
      });

      // Verify registration context
      expect(loggedEvent.registrationContext).toMatchObject({
        ecosystem: 'anarq',
        registrationService: 'qwallet-module-registration',
        serviceVersion: '1.0.0',
        dependencyInfo: {
          dependencies: ['qindex', 'qlock'],
          integrations: ['qsocial', 'qerberos']
        }
      });

      // Verify compliance tracking
      expect(loggedEvent.complianceTracking).toMatchObject({
        auditRequired: true,
        privacyEnforced: true,
        kycSupport: false,
        gdprCompliant: true,
        riskScoring: true
      });

      // Verify security context
      expect(loggedEvent.securityContext).toMatchObject({
        signatureAlgorithm: 'RSA-SHA256',
        publicKeyId: 'did:root:system-admin_module_key',
        signatureValid: true,
        identityType: 'ROOT',
        authorizationLevel: 'ROOT'
      });
    });

    it('should create comprehensive audit trail for module lifecycle', async () => {
      const moduleId = 'qwallet-lifecycle-test';
      
      // 1. Register module
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId,
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: 'PRODUCTION_READY',
        complianceInfo: { audit: true, gdpr_compliant: true }
      });

      // 2. Update module
      await qerberosService.logModuleRegistration({
        action: 'UPDATED',
        moduleId,
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.1.0',
        moduleStatus: 'PRODUCTION_READY',
        complianceInfo: { audit: true, gdpr_compliant: true }
      });

      // 3. Verify module
      await qerberosService.logModuleRegistration({
        action: 'VERIFIED',
        moduleId,
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.1.0',
        moduleStatus: 'PRODUCTION_READY'
      });

      // Verify audit trail was created
      expect(qerberosService.moduleAuditTrails.has(moduleId)).toBe(true);
      const auditTrail = qerberosService.moduleAuditTrails.get(moduleId);
      expect(auditTrail).toHaveLength(3);

      // Verify audit trail entries
      expect(auditTrail[0]).toMatchObject({
        action: 'REGISTERED',
        moduleVersion: '1.0.0',
        success: true
      });

      expect(auditTrail[1]).toMatchObject({
        action: 'UPDATED',
        moduleVersion: '1.1.0',
        success: true
      });

      expect(auditTrail[2]).toMatchObject({
        action: 'VERIFIED',
        moduleVersion: '1.1.0',
        success: true
      });

      // Verify each entry has required audit fields
      auditTrail.forEach(entry => {
        expect(entry).toHaveProperty('auditId');
        expect(entry).toHaveProperty('eventId');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('complianceSnapshot');
        expect(entry).toHaveProperty('securitySnapshot');
        expect(entry).toHaveProperty('regulatoryFlags');
      });
    });

    it('should detect compliance violations and generate appropriate alerts', async () => {
      // Register a production module without required audit
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-compliance-violation',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: 'PRODUCTION_READY', // Production status
        complianceInfo: {
          audit: false, // Missing required audit
          gdpr_compliant: false,
          privacy_enforced: false,
          kyc_support: false,
          risk_scoring: false
        }
      });

      // Verify compliance violation was detected
      expect(qerberosService.moduleAlerts).toBeDefined();
      const complianceAlert = qerberosService.moduleAlerts.find(
        alert => alert.type === 'COMPLIANCE_VIOLATION'
      );
      
      expect(complianceAlert).toBeDefined();
      expect(complianceAlert).toMatchObject({
        type: 'COMPLIANCE_VIOLATION',
        moduleId: 'qwallet-compliance-violation',
        severity: 'high',
        regulation: 'INTERNAL_SECURITY_POLICY'
      });
    });

    it('should support audit event querying with module-specific filters', async () => {
      // Create test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-query-test',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        testMode: false
      });

      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qsocial-query-test',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        testMode: true
      });

      // Query by module ID
      const moduleQuery = await qerberosService.queryModuleAuditEvents({
        moduleId: 'qwallet-query-test'
      });

      expect(moduleQuery.events).toHaveLength(1);
      expect(moduleQuery.events[0].moduleId).toBe('qwallet-query-test');

      // Query by test mode
      const testModeQuery = await qerberosService.queryModuleAuditEvents({
        testMode: true
      });

      expect(testModeQuery.events).toHaveLength(1);
      expect(testModeQuery.events[0].moduleMetadata.testMode).toBe(true);

      // Query by action
      const actionQuery = await qerberosService.queryModuleAuditEvents({
        action: 'REGISTERED'
      });

      expect(actionQuery.events).toHaveLength(2);
      expect(actionQuery.events.every(e => e.action === 'REGISTERED')).toBe(true);
    });

    it('should export comprehensive audit data for compliance reporting', async () => {
      // Create test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-export-test',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: 'PRODUCTION_READY',
        complianceInfo: {
          audit: true,
          gdpr_compliant: true,
          privacy_enforced: true
        }
      });

      // Export audit data with all reports
      const exportData = await qerberosService.exportModuleAuditData({
        moduleId: 'qwallet-export-test',
        includeComplianceData: true,
        includeSecurityData: true,
        includeStatistics: true
      });

      // Verify export structure
      expect(exportData).toHaveProperty('exportMetadata');
      expect(exportData).toHaveProperty('auditEvents');
      expect(exportData).toHaveProperty('complianceReport');
      expect(exportData).toHaveProperty('securityReport');
      expect(exportData).toHaveProperty('statisticsReport');

      // Verify export metadata
      expect(exportData.exportMetadata).toMatchObject({
        exportId: expect.any(String),
        exportTimestamp: expect.any(String),
        exportedBy: 'qerberos-audit-system',
        totalEvents: 1
      });

      // Verify compliance report structure
      expect(exportData.complianceReport).toMatchObject({
        reportId: expect.any(String),
        moduleId: 'qwallet-export-test',
        complianceSummary: expect.any(Object),
        violations: expect.any(Array),
        recommendations: expect.any(Array),
        regulatoryFlags: expect.any(Array)
      });

      // Verify security report structure
      expect(exportData.securityReport).toMatchObject({
        reportId: expect.any(String),
        moduleId: 'qwallet-export-test',
        securitySummary: expect.any(Object),
        signatureAnalysis: expect.any(Object),
        riskAssessment: expect.any(Object)
      });

      // Verify statistics report structure
      expect(exportData.statisticsReport).toMatchObject({
        reportId: expect.any(String),
        moduleId: 'qwallet-export-test',
        overallStats: expect.any(Object),
        actionBreakdown: expect.any(Object),
        statusBreakdown: expect.any(Object)
      });
    });

    it('should maintain module registration statistics accurately', async () => {
      // Register successful module
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-stats-success',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0',
        moduleStatus: 'PRODUCTION_READY',
        complianceInfo: {
          audit: true,
          gdpr_compliant: true,
          kyc_support: true,
          privacy_enforced: true
        }
      });

      // Register failed module
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-stats-failed',
        signerIdentity: 'did:root:admin',
        success: false,
        error: 'Test failure',
        moduleVersion: '1.0.0',
        moduleStatus: 'DEVELOPMENT'
      });

      // Verify statistics
      expect(qerberosService.moduleStats).toMatchObject({
        totalRegistrations: 2,
        successfulRegistrations: 1,
        failedRegistrations: 1
      });

      expect(qerberosService.moduleStats.modulesByStatus).toMatchObject({
        'PRODUCTION_READY': 1,
        'DEVELOPMENT': 1
      });

      expect(qerberosService.moduleStats.registrationsByAction).toMatchObject({
        'REGISTERED': 2
      });

      expect(qerberosService.moduleStats.complianceStats).toMatchObject({
        auditedModules: 1,
        gdprCompliantModules: 1,
        kycSupportingModules: 1,
        privacyEnforcingModules: 1
      });
    });

    it('should include module registration metrics in health check', async () => {
      // Add some test data
      await qerberosService.logModuleRegistration({
        action: 'REGISTERED',
        moduleId: 'qwallet-health-test',
        signerIdentity: 'did:root:admin',
        success: true,
        moduleVersion: '1.0.0'
      });

      const healthCheck = await qerberosService.healthCheck();

      // Verify health check includes module registration metrics
      expect(healthCheck).toHaveProperty('moduleRegistration');
      expect(healthCheck.moduleRegistration).toMatchObject({
        auditTrails: expect.any(Number),
        moduleAlerts: expect.any(Number),
        totalRegistrations: expect.any(Number),
        successfulRegistrations: expect.any(Number)
      });

      // Verify specific values
      expect(healthCheck.moduleRegistration.auditTrails).toBe(1);
      expect(healthCheck.moduleRegistration.totalRegistrations).toBe(1);
      expect(healthCheck.moduleRegistration.successfulRegistrations).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing optional fields gracefully', async () => {
      const minimalRegistrationData = {
        action: 'REGISTERED',
        moduleId: 'minimal-test',
        signerIdentity: 'did:root:admin',
        success: true
      };

      const result = await qerberosService.logModuleRegistration(minimalRegistrationData);

      expect(result).toMatchObject({
        logged: true,
        complianceIssues: expect.any(Array)
      });

      // Verify event was logged despite missing optional fields
      expect(qerberosService.eventLog).toHaveLength(1);
      const loggedEvent = qerberosService.eventLog[0];
      expect(loggedEvent.moduleId).toBe('minimal-test');
    });

    it('should handle audit logging errors without breaking the flow', async () => {
      // This test verifies that audit logging errors don't break the registration process
      // In a real scenario, this would be handled by the ModuleRegistrationService
      
      const registrationData = {
        action: 'REGISTERED',
        moduleId: 'error-handling-test',
        signerIdentity: 'did:root:admin',
        success: true
      };

      // Should not throw even if there are internal errors
      await expect(qerberosService.logModuleRegistration(registrationData)).resolves.toBeDefined();
    });
  });
});