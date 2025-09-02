import { describe, it, expect, beforeEach } from 'vitest';
import { MaskingService } from '../../src/services/MaskingService';
import { MaskProfile } from '../../src/types/privacy';

describe('MaskingService', () => {
  let maskingService: MaskingService;

  beforeEach(() => {
    maskingService = new MaskingService();
  });

  describe('applyMasking', () => {
    it('should apply REDACT strategy correctly', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'email',
            strategy: 'REDACT',
            params: { replacement: '[REDACTED]' }
          }
        ],
        defaults: {}
      };

      const data = {
        email: 'user@example.com',
        name: 'John Doe'
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.email).toBe('[REDACTED]');
      expect(result.maskedData.name).toBe('John Doe');
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].applied).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should apply HASH strategy correctly', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'email',
            strategy: 'HASH',
            params: { algorithm: 'sha256', salt: 'test-salt' }
          }
        ],
        defaults: {}
      };

      const data = {
        email: 'user@example.com'
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.email).not.toBe('user@example.com');
      expect(result.maskedData.email).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(result.appliedRules[0].applied).toBe(true);
    });

    it('should apply REMOVE strategy correctly', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'ssn',
            strategy: 'REMOVE'
          }
        ],
        defaults: {}
      };

      const data = {
        ssn: '123-45-6789',
        name: 'John Doe'
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.ssn).toBeUndefined();
      expect(result.maskedData.name).toBe('John Doe');
      expect(result.appliedRules[0].applied).toBe(true);
    });

    it('should apply ANONYMIZE strategy correctly', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'age',
            strategy: 'ANONYMIZE',
            params: { technique: 'generalization', range: 10 }
          }
        ],
        defaults: {}
      };

      const data = {
        age: 25
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.age).toBe(20); // Generalized to range
      expect(result.appliedRules[0].applied).toBe(true);
    });

    it('should handle nested field paths', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'user.email',
            strategy: 'REDACT'
          }
        ],
        defaults: {}
      };

      const data = {
        user: {
          email: 'user@example.com',
          name: 'John Doe'
        }
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.user.email).toBe('[REDACTED]');
      expect(result.maskedData.user.name).toBe('John Doe');
    });

    it('should handle missing fields gracefully', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'nonexistent',
            strategy: 'REDACT'
          }
        ],
        defaults: {}
      };

      const data = {
        name: 'John Doe'
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.maskedData.name).toBe('John Doe');
      expect(result.appliedRules[0].applied).toBe(false);
      expect(result.appliedRules[0].reason).toContain('not found');
    });

    it('should calculate risk score based on masking effectiveness', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'email',
            strategy: 'REMOVE' // Complete removal = lower risk
          },
          {
            field: 'name',
            strategy: 'HASH' // Hash = medium risk
          }
        ],
        defaults: {}
      };

      const data = {
        email: 'user@example.com',
        name: 'John Doe'
      };

      const result = await maskingService.applyMasking(data, profile);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      
      // Risk should be relatively low due to REMOVE strategy
      expect(result.riskScore).toBeLessThan(0.5);
    });

    it('should determine compliance flags based on context', async () => {
      const profile: MaskProfile = {
        name: 'gdpr-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'email',
            strategy: 'HASH'
          }
        ],
        defaults: {}
      };

      const data = {
        email: 'user@example.com'
      };

      const context = {
        jurisdiction: 'EU',
        purpose: 'marketing'
      };

      const result = await maskingService.applyMasking(data, profile, context);

      expect(result.complianceFlags).toContain('GDPR');
    });

    it('should handle multiple rules on the same field', async () => {
      const profile: MaskProfile = {
        name: 'test-profile',
        version: '1.0.0',
        rules: [
          {
            field: 'email',
            strategy: 'REDACT'
          },
          {
            field: 'email',
            strategy: 'HASH' // This should override the previous rule
          }
        ],
        defaults: {}
      };

      const data = {
        email: 'user@example.com'
      };

      const result = await maskingService.applyMasking(data, profile);

      // The last rule should win
      expect(result.maskedData.email).not.toBe('[REDACTED]');
      expect(result.maskedData.email).toMatch(/^[a-f0-9]+$/);
      expect(result.appliedRules).toHaveLength(2);
    });
  });
});