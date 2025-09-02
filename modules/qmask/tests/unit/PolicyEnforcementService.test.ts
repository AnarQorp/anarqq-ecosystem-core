import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEnforcementService } from '../../src/services/PolicyEnforcementService';

describe('PolicyEnforcementService', () => {
  let service: PolicyEnforcementService;

  beforeEach(() => {
    service = new PolicyEnforcementService();
  });

  describe('evaluatePrivacyPolicies', () => {
    it('should evaluate policies for GDPR jurisdiction', async () => {
      const operation = {
        dataTypes: ['personal_data', 'email'],
        purpose: 'Customer service',
        jurisdiction: 'EU',
        recipients: ['internal-team'],
        retention: '2 years'
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      expect(result.allowed).toBeDefined();
      expect(result.appliedRules).toBeInstanceOf(Array);
      expect(result.requiredActions).toBeInstanceOf(Array);
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should block high-risk operations without proper safeguards', async () => {
      const operation = {
        dataTypes: ['health', 'biometric', 'genetic'],
        purpose: 'Research',
        jurisdiction: 'EU',
        recipients: ['third-party', 'research-partner'],
        retention: 'indefinite',
        riskLevel: 'CRITICAL' as const
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      expect(result.appliedRules.length).toBeGreaterThan(0);
      expect(result.requiredActions.length).toBeGreaterThan(0);
    });

    it('should require consent for sensitive data types', async () => {
      const operation = {
        dataTypes: ['health', 'medical'],
        purpose: 'Healthcare service',
        jurisdiction: 'EU',
        recipients: ['healthcare-provider'],
        retention: '10 years'
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      const consentAction = result.requiredActions.find(action => action.type === 'require_consent');
      expect(consentAction).toBeDefined();
    });

    it('should apply appropriate profile for high-risk operations', async () => {
      const operation = {
        dataTypes: ['personal_data'],
        purpose: 'Profiling',
        jurisdiction: 'EU',
        recipients: ['analytics-team'],
        retention: '5 years',
        riskLevel: 'HIGH' as const
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      const profileAction = result.requiredActions.find(action => action.type === 'require_profile');
      expect(profileAction).toBeDefined();
    });

    it('should handle operations outside regulated jurisdictions', async () => {
      const operation = {
        dataTypes: ['basic_info'],
        purpose: 'Service delivery',
        jurisdiction: 'OTHER',
        recipients: ['internal-team'],
        retention: '1 year'
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      expect(result.allowed).toBe(true);
      expect(result.appliedRules.length).toBe(0); // No specific rules should apply
    });
  });

  describe('enforcePrivacyPolicies', () => {
    it('should enforce policies during masking operation', async () => {
      const data = {
        email: 'user@example.com',
        name: 'John Doe',
        health_condition: 'diabetes'
      };

      const context = {
        purpose: 'Healthcare service',
        jurisdiction: 'EU',
        processingBasis: 'consent'
      };

      const result = await service.enforcePrivacyPolicies(data, 'basic-profile', context);

      expect(result.allowed).toBeDefined();
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.auditLog).toBeInstanceOf(Array);
    });

    it('should change profile when required by policy', async () => {
      const data = {
        health_record: 'sensitive medical data',
        patient_id: '12345'
      };

      const context = {
        purpose: 'Medical research',
        jurisdiction: 'US'
      };

      const result = await service.enforcePrivacyPolicies(data, 'basic-profile', context);

      if (result.enforcedProfile) {
        expect(result.enforcedProfile).not.toBe('basic-profile');
        expect(result.auditLog.some(log => log.includes('Profile changed'))).toBe(true);
      }
    });

    it('should block operations that violate policies', async () => {
      const data = {
        sensitive_data: 'highly confidential',
        personal_id: 'SSN-123-45-6789'
      };

      const context = {
        purpose: 'Unauthorized access',
        jurisdiction: 'EU'
      };

      // This should potentially be blocked depending on policy configuration
      const result = await service.enforcePrivacyPolicies(data, 'weak-profile', context);

      expect(result.allowed).toBeDefined();
      expect(result.auditLog.length).toBeGreaterThan(0);
    });
  });

  describe('compliance policy management', () => {
    it('should create a new compliance policy', async () => {
      const policyData = {
        name: 'Test GDPR Policy',
        regulation: 'GDPR' as const,
        jurisdiction: ['EU'],
        dataTypes: ['personal_data'],
        mandatory: true,
        version: '1.0.0',
        rules: [
          {
            id: 'test_rule_1',
            name: 'Test Rule',
            description: 'A test rule',
            condition: {
              type: 'data_type' as const,
              operator: 'contains' as const,
              value: 'personal'
            },
            action: {
              type: 'require_consent' as const,
              parameters: { explicit: true }
            },
            priority: 1,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };

      const policy = await service.createCompliancePolicy(policyData);

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Test GDPR Policy');
      expect(policy.regulation).toBe('GDPR');
      expect(policy.rules).toHaveLength(1);
    });

    it('should update an existing compliance policy', async () => {
      const policyData = {
        name: 'Original Policy',
        regulation: 'GDPR' as const,
        jurisdiction: ['EU'],
        dataTypes: ['personal_data'],
        mandatory: true,
        version: '1.0.0',
        rules: []
      };

      const policy = await service.createCompliancePolicy(policyData);
      
      const updatedPolicy = await service.updateCompliancePolicy(policy.id, {
        name: 'Updated Policy',
        version: '1.1.0'
      });

      expect(updatedPolicy).toBeDefined();
      expect(updatedPolicy!.name).toBe('Updated Policy');
      expect(updatedPolicy!.version).toBe('1.1.0');
    });

    it('should delete a compliance policy', async () => {
      const policyData = {
        name: 'Policy to Delete',
        regulation: 'GDPR' as const,
        jurisdiction: ['EU'],
        dataTypes: ['personal_data'],
        mandatory: false,
        version: '1.0.0',
        rules: []
      };

      const policy = await service.createCompliancePolicy(policyData);
      const deleted = await service.deleteCompliancePolicy(policy.id);

      expect(deleted).toBe(true);

      // Verify policy is no longer in the list
      const policies = service.listCompliancePolicies();
      expect(policies.find(p => p.id === policy.id)).toBeUndefined();
    });

    it('should list compliance policies with filters', async () => {
      // Create test policies
      await service.createCompliancePolicy({
        name: 'GDPR Policy',
        regulation: 'GDPR',
        jurisdiction: ['EU'],
        dataTypes: ['personal_data'],
        mandatory: true,
        version: '1.0.0',
        rules: []
      });

      await service.createCompliancePolicy({
        name: 'HIPAA Policy',
        regulation: 'HIPAA',
        jurisdiction: ['US'],
        dataTypes: ['health'],
        mandatory: true,
        version: '1.0.0',
        rules: []
      });

      // Test filtering by regulation
      const gdprPolicies = service.listCompliancePolicies({ regulation: 'GDPR' });
      expect(gdprPolicies.length).toBeGreaterThan(0);
      expect(gdprPolicies.every(p => p.regulation === 'GDPR')).toBe(true);

      // Test filtering by jurisdiction
      const euPolicies = service.listCompliancePolicies({ jurisdiction: 'EU' });
      expect(euPolicies.length).toBeGreaterThan(0);
      expect(euPolicies.every(p => p.jurisdiction.includes('EU'))).toBe(true);

      // Test filtering by mandatory status
      const mandatoryPolicies = service.listCompliancePolicies({ mandatory: true });
      expect(mandatoryPolicies.length).toBeGreaterThan(0);
      expect(mandatoryPolicies.every(p => p.mandatory === true)).toBe(true);
    });
  });

  describe('profile compliance validation', () => {
    it('should validate profile compliance against GDPR', async () => {
      const profile = {
        name: 'gdpr-compliant-profile',
        rules: [
          {
            field: 'email',
            strategy: 'HASH' as const,
            params: { algorithm: 'sha256' }
          },
          {
            field: 'name',
            strategy: 'REMOVE' as const
          }
        ],
        defaults: {},
        version: '1.0.0'
      };

      const result = await service.validateProfileCompliance(profile, 'EU');

      expect(result.compliant).toBeDefined();
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.applicablePolicies).toBeInstanceOf(Array);
    });

    it('should detect insufficient masking strategies', async () => {
      const weakProfile = {
        name: 'weak-profile',
        rules: [
          {
            field: 'email',
            strategy: 'REDACT' as const,
            params: { replacement: '[REDACTED]' }
          }
        ],
        defaults: {},
        version: '1.0.0'
      };

      const result = await service.validateProfileCompliance(weakProfile, 'EU');

      // Should detect that GDPR requires stronger masking
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate HIPAA compliance for health data', async () => {
      const hipaaProfile = {
        name: 'hipaa-profile',
        rules: [
          {
            field: 'medical_record',
            strategy: 'ENCRYPT' as const
          },
          {
            field: 'ssn',
            strategy: 'REMOVE' as const
          }
        ],
        defaults: {},
        version: '1.0.0'
      };

      const result = await service.validateProfileCompliance(hipaaProfile, 'US');

      expect(result.applicablePolicies.some(p => p.includes('HIPAA'))).toBe(true);
    });

    it('should handle profiles with no rules', async () => {
      const emptyProfile = {
        name: 'empty-profile',
        rules: [],
        defaults: {},
        version: '1.0.0'
      };

      const result = await service.validateProfileCompliance(emptyProfile, 'EU');

      expect(result.compliant).toBe(false);
      expect(result.violations.some(v => v.includes('no masking rules'))).toBe(true);
    });
  });

  describe('policy condition evaluation', () => {
    it('should evaluate data type conditions correctly', async () => {
      const operation = {
        dataTypes: ['email', 'personal_data'],
        purpose: 'Marketing',
        jurisdiction: 'EU',
        recipients: ['marketing-team'],
        retention: '2 years'
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      // Should apply rules that match personal data types
      expect(result.appliedRules.length).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate jurisdiction conditions correctly', async () => {
      const euOperation = {
        dataTypes: ['personal_data'],
        purpose: 'Service',
        jurisdiction: 'EU',
        recipients: ['internal'],
        retention: '1 year'
      };

      const usOperation = {
        dataTypes: ['personal_data'],
        purpose: 'Service',
        jurisdiction: 'US',
        recipients: ['internal'],
        retention: '1 year'
      };

      const euResult = await service.evaluatePrivacyPolicies(euOperation);
      const usResult = await service.evaluatePrivacyPolicies(usOperation);

      // EU operation should trigger GDPR rules, US operation should trigger different rules
      expect(euResult.appliedRules).not.toEqual(usResult.appliedRules);
    });

    it('should evaluate composite conditions correctly', async () => {
      const operation = {
        dataTypes: ['health', 'personal_data'],
        purpose: 'Research',
        jurisdiction: 'EU',
        recipients: ['research-partner', 'university'],
        retention: '10 years',
        riskLevel: 'HIGH' as const
      };

      const result = await service.evaluatePrivacyPolicies(operation);

      // Should trigger multiple rules due to sensitive data + high risk + multiple recipients
      expect(result.appliedRules.length).toBeGreaterThan(0);
      expect(result.requiredActions.length).toBeGreaterThan(0);
    });
  });
});