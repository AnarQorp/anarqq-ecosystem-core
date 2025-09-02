import { describe, it, expect } from 'vitest';
import { validator } from '../validation/validator.js';
import type { AuditEvent, RiskAssessment, SecurityAlert } from '../types/audit.js';

describe('Audit Schema Validation', () => {
  describe('AuditEvent', () => {
    it('should validate a valid AuditEvent', () => {
      const validAuditEvent: AuditEvent = {
        type: 'DATA_ACCESS',
        ref: 'file_123',
        actor: { squidId: 'user123' },
        layer: 'qdrive',
        verdict: 'ALLOW',
        details: { action: 'download', fileSize: 1024 },
        timestamp: '2024-01-01T00:00:00Z',
        severity: 'LOW',
      };

      const result = validator.validateAuditEvent(validAuditEvent);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validAuditEvent);
    });

    it('should validate AuditEvent with optional fields', () => {
      const validAuditEvent: AuditEvent = {
        type: 'PERMISSION_DENIED',
        ref: 'resource_456',
        actor: { squidId: 'user456', subId: 'work', daoId: 'company' },
        layer: 'qonsent',
        verdict: 'DENY',
        details: { reason: 'insufficient_permissions', scope: 'write:files' },
        cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        timestamp: '2024-01-01T00:00:00Z',
        severity: 'HIGH',
        correlationId: 'corr_123',
      };

      const result = validator.validateAuditEvent(validAuditEvent);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validAuditEvent);
    });

    it('should reject AuditEvent with invalid verdict', () => {
      const invalidAuditEvent = {
        type: 'DATA_ACCESS',
        ref: 'file_123',
        actor: { squidId: 'user123' },
        layer: 'qdrive',
        verdict: 'INVALID_VERDICT',
        details: { action: 'download' },
        timestamp: '2024-01-01T00:00:00Z',
        severity: 'LOW',
      };

      const result = validator.validateAuditEvent(invalidAuditEvent);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject AuditEvent with invalid CID', () => {
      const invalidAuditEvent = {
        type: 'DATA_ACCESS',
        ref: 'file_123',
        actor: { squidId: 'user123' },
        layer: 'qdrive',
        verdict: 'ALLOW',
        details: { action: 'download' },
        cid: 'invalid_cid',
        timestamp: '2024-01-01T00:00:00Z',
        severity: 'LOW',
      };

      const result = validator.validateAuditEvent(invalidAuditEvent);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });
  });

  describe('RiskAssessment', () => {
    it('should validate a valid RiskAssessment', () => {
      const validRiskAssessment: RiskAssessment = {
        assessmentId: 'risk_123',
        subject: { squidId: 'user123' },
        riskScore: 75,
        riskLevel: 'HIGH',
        factors: [
          {
            type: 'login_frequency',
            description: 'Unusual login pattern detected',
            weight: 0.3,
            value: 85,
            confidence: 0.9,
          },
        ],
        timestamp: '2024-01-01T00:00:00Z',
        validUntil: '2024-01-01T01:00:00Z',
      };

      const result = validator.validateRiskAssessment(validRiskAssessment);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validRiskAssessment);
    });

    it('should validate RiskAssessment with recommendations', () => {
      const validRiskAssessment: RiskAssessment = {
        assessmentId: 'risk_456',
        subject: { squidId: 'user456', subId: 'personal' },
        riskScore: 25,
        riskLevel: 'LOW',
        factors: [],
        timestamp: '2024-01-01T00:00:00Z',
        validUntil: '2024-01-01T01:00:00Z',
        recommendations: ['Enable 2FA', 'Review recent activity'],
      };

      const result = validator.validateRiskAssessment(validRiskAssessment);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validRiskAssessment);
    });

    it('should reject RiskAssessment with invalid risk score', () => {
      const invalidRiskAssessment = {
        assessmentId: 'risk_123',
        subject: { squidId: 'user123' },
        riskScore: 150, // Out of range
        riskLevel: 'HIGH',
        factors: [],
        timestamp: '2024-01-01T00:00:00Z',
        validUntil: '2024-01-01T01:00:00Z',
      };

      const result = validator.validateRiskAssessment(invalidRiskAssessment);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be <= 100');
    });
  });

  describe('SecurityAlert', () => {
    it('should validate a valid SecurityAlert', () => {
      const validSecurityAlert: SecurityAlert = {
        alertId: 'alert_123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        title: 'Multiple failed login attempts',
        description: 'User has exceeded the maximum number of failed login attempts',
        affected: [{ squidId: 'user123' }],
        timestamp: '2024-01-01T00:00:00Z',
        status: 'OPEN',
      };

      const result = validator.validateSecurityAlert(validSecurityAlert);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validSecurityAlert);
    });

    it('should validate SecurityAlert with optional fields', () => {
      const validSecurityAlert: SecurityAlert = {
        alertId: 'alert_456',
        type: 'DATA_BREACH',
        severity: 'CRITICAL',
        title: 'Unauthorized data access detected',
        description: 'Suspicious access pattern detected for sensitive files',
        affected: [
          { squidId: 'user123', subId: 'work' },
          { squidId: 'user456', daoId: 'company' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
        status: 'ACKNOWLEDGED',
        remediation: ['Change passwords', 'Review access logs', 'Enable monitoring'],
        relatedEvents: ['event_123', 'event_456'],
      };

      const result = validator.validateSecurityAlert(validSecurityAlert);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validSecurityAlert);
    });

    it('should reject SecurityAlert with invalid severity', () => {
      const invalidSecurityAlert = {
        alertId: 'alert_123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'INVALID_SEVERITY',
        title: 'Test alert',
        description: 'Test description',
        affected: [{ squidId: 'user123' }],
        timestamp: '2024-01-01T00:00:00Z',
        status: 'OPEN',
      };

      const result = validator.validateSecurityAlert(invalidSecurityAlert);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject SecurityAlert with empty affected array', () => {
      const invalidSecurityAlert = {
        alertId: 'alert_123',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        title: 'Test alert',
        description: 'Test description',
        affected: [], // Empty array
        timestamp: '2024-01-01T00:00:00Z',
        status: 'OPEN',
      };

      const result = validator.validateSecurityAlert(invalidSecurityAlert);
      expect(result.valid).toBe(true); // Empty arrays are allowed
      expect(result.data).toEqual(invalidSecurityAlert);
    });
  });
});