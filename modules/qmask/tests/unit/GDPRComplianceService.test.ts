import { describe, it, expect, beforeEach } from 'vitest';
import { GDPRComplianceService } from '../../src/services/GDPRComplianceService';

describe('GDPRComplianceService', () => {
  let service: GDPRComplianceService;

  beforeEach(() => {
    service = new GDPRComplianceService();
  });

  describe('processDataSubjectRequest', () => {
    it('should process an access request successfully', async () => {
      const request = {
        type: 'ACCESS' as const,
        dataSubject: 'user@example.com',
        description: 'Request access to all personal data'
      };

      const result = await service.processDataSubjectRequest(request);

      expect(result.status).toBe('COMPLETED');
      expect(result.requestId).toBeDefined();
      expect(result.processedData).toBeDefined();
      expect(result.processedData.dataSubject).toBe('user@example.com');
    });

    it('should process an erasure request successfully', async () => {
      const request = {
        type: 'ERASURE' as const,
        dataSubject: 'user@example.com',
        description: 'Delete all personal data'
      };

      const result = await service.processDataSubjectRequest(request);

      expect(result.status).toBe('COMPLETED');
      expect(result.processedData).toBeDefined();
      expect(result.processedData.complete).toBe(true);
    });

    it('should process a portability request successfully', async () => {
      const request = {
        type: 'PORTABILITY' as const,
        dataSubject: 'user@example.com',
        description: 'Export all personal data'
      };

      const result = await service.processDataSubjectRequest(request);

      expect(result.status).toBe('COMPLETED');
      expect(result.processedData).toBeDefined();
      expect(result.processedData.format).toBe('JSON');
      expect(result.processedData.data).toBeDefined();
    });

    it('should handle unsupported request types', async () => {
      const request = {
        type: 'INVALID' as any,
        dataSubject: 'user@example.com',
        description: 'Invalid request type'
      };

      const result = await service.processDataSubjectRequest(request);

      expect(result.status).toBe('FAILED');
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Unsupported DSR type');
    });
  });

  describe('validateGDPRCompliance', () => {
    it('should validate compliant operation', async () => {
      const operation = {
        purpose: 'Customer service',
        dataTypes: ['email', 'name'],
        lawfulBasis: 'consent',
        dataSubjectConsent: true,
        retentionPeriod: '2 years',
        recipients: ['internal-team']
      };

      const result = await service.validateGDPRCompliance(operation);

      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect invalid lawful basis', async () => {
      const operation = {
        purpose: 'Customer service',
        dataTypes: ['email', 'name'],
        lawfulBasis: 'invalid_basis',
        retentionPeriod: '2 years',
        recipients: ['internal-team']
      };

      const result = await service.validateGDPRCompliance(operation);

      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Invalid or missing lawful basis for processing');
    });

    it('should detect missing consent for sensitive data', async () => {
      const operation = {
        purpose: 'Health analysis',
        dataTypes: ['health', 'medical'],
        lawfulBasis: 'consent',
        dataSubjectConsent: false,
        retentionPeriod: '2 years',
        recipients: ['internal-team']
      };

      const result = await service.validateGDPRCompliance(operation);

      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Sensitive data processing requires explicit consent');
    });

    it('should detect excessive data collection', async () => {
      const operation = {
        purpose: 'Simple registration',
        dataTypes: Array.from({ length: 15 }, (_, i) => `dataType${i}`),
        lawfulBasis: 'consent',
        retentionPeriod: '2 years',
        recipients: ['internal-team']
      };

      const result = await service.validateGDPRCompliance(operation);

      expect(result.compliant).toBe(false);
      expect(result.violations).toContain('Potential data minimization violation - too many data types');
    });
  });

  describe('assessBreachNotificationRequirement', () => {
    it('should require notification for high-risk breach', async () => {
      const incident = {
        dataTypes: ['email', 'password'],
        affectedSubjects: 1000,
        riskLevel: 'HIGH' as const,
        containmentTime: 2,
        description: 'Database breach exposing user credentials'
      };

      const result = await service.assessBreachNotificationRequirement(incident);

      expect(result.notificationRequired).toBe(true);
      expect(result.timeframe).toBe('72 hours');
      expect(result.recipients).toContain('supervisory-authority@example.com');
      expect(result.recipients).toContain('data-subjects');
    });

    it('should not require notification for low-risk breach', async () => {
      const incident = {
        dataTypes: ['newsletter_preference'],
        affectedSubjects: 10,
        riskLevel: 'LOW' as const,
        containmentTime: 1,
        description: 'Minor preference data exposure'
      };

      const result = await service.assessBreachNotificationRequirement(incident);

      expect(result.notificationRequired).toBe(false);
    });

    it('should require notification for large number of affected subjects', async () => {
      const incident = {
        dataTypes: ['email'],
        affectedSubjects: 500,
        riskLevel: 'MEDIUM' as const,
        containmentTime: 1,
        description: 'Email list exposure'
      };

      const result = await service.assessBreachNotificationRequirement(incident);

      expect(result.notificationRequired).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Create some test DSR requests
      await service.processDataSubjectRequest({
        type: 'ACCESS',
        dataSubject: 'user1@example.com',
        description: 'Access request'
      });

      await service.processDataSubjectRequest({
        type: 'ERASURE',
        dataSubject: 'user2@example.com',
        description: 'Erasure request'
      });

      const report = await service.generateComplianceReport(startDate, endDate);

      expect(report.reportId).toBeDefined();
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.dsrRequests.total).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(1);
      expect(report.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('DSR management', () => {
    it('should store and retrieve DSR requests', async () => {
      const request = {
        type: 'ACCESS' as const,
        dataSubject: 'user@example.com',
        description: 'Test request'
      };

      const result = await service.processDataSubjectRequest(request);
      const retrieved = service.getDSRRequest(result.requestId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.requestId).toBe(result.requestId);
      expect(retrieved!.type).toBe('ACCESS');
      expect(retrieved!.dataSubject).toBe('user@example.com');
    });

    it('should list DSR requests with filters', async () => {
      // Create test requests
      await service.processDataSubjectRequest({
        type: 'ACCESS',
        dataSubject: 'user1@example.com',
        description: 'Access request'
      });

      await service.processDataSubjectRequest({
        type: 'ERASURE',
        dataSubject: 'user2@example.com',
        description: 'Erasure request'
      });

      // Test filtering by type
      const accessRequests = service.listDSRRequests({ type: 'ACCESS' });
      expect(accessRequests.length).toBeGreaterThan(0);
      expect(accessRequests.every(req => req.type === 'ACCESS')).toBe(true);

      // Test filtering by data subject
      const user1Requests = service.listDSRRequests({ dataSubject: 'user1@example.com' });
      expect(user1Requests.length).toBeGreaterThan(0);
      expect(user1Requests.every(req => req.dataSubject === 'user1@example.com')).toBe(true);
    });
  });
});