import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from '../../src/server';
import { connectDatabase, disconnectDatabase } from '../../src/database';
import { PrivacyProfile } from '../../src/models/PrivacyProfile';
import supertest from 'supertest';

describe('Qmask API Integration Tests', () => {
  let server: any;
  let request: supertest.SuperTest<supertest.Test>;

  const testToken = 'Bearer squid:test-identity:test-sub';
  const testProfile = {
    name: 'test-integration-profile',
    rules: [
      {
        field: 'email',
        strategy: 'HASH',
        params: { algorithm: 'sha256' }
      },
      {
        field: 'name',
        strategy: 'REDACT',
        params: { replacement: '[REDACTED]' }
      }
    ],
    defaults: {},
    version: '1.0.0',
    description: 'Test profile for integration tests',
    tags: ['test', 'integration'],
    complianceFlags: ['GDPR']
  };

  beforeAll(async () => {
    // Use test database
    process.env.MONGODB_URI = 'mongodb://localhost:27017/qmask-test';
    process.env.NODE_ENV = 'test';
    
    await connectDatabase();
    server = await createServer();
    request = supertest(server.server);
  });

  afterAll(async () => {
    await server.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await PrivacyProfile.deleteMany({ name: /test/ });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('qmask');
    });
  });

  describe('Profile Management', () => {
    it('should create a new privacy profile', async () => {
      const response = await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('PROFILE_CREATED');
      expect(response.body.data.name).toBe(testProfile.name);
    });

    it('should get a privacy profile by name', async () => {
      // First create the profile
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);

      // Then retrieve it
      const response = await request
        .get(`/api/v1/profiles/${testProfile.name}`)
        .set('Authorization', testToken)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.name).toBe(testProfile.name);
      expect(response.body.data.rules).toHaveLength(2);
    });

    it('should list privacy profiles', async () => {
      // Create test profile
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);

      const response = await request
        .get('/api/v1/profiles')
        .set('Authorization', testToken)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.profiles).toBeInstanceOf(Array);
      expect(response.body.data.profiles.length).toBeGreaterThan(0);
    });

    it('should update a privacy profile', async () => {
      // Create profile first
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);

      const updateData = {
        rules: [
          {
            field: 'email',
            strategy: 'REMOVE'
          }
        ],
        version: '1.1.0'
      };

      const response = await request
        .put(`/api/v1/profiles/${testProfile.name}`)
        .set('Authorization', testToken)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.version).toBe('1.1.0');
    });

    it('should delete a privacy profile', async () => {
      // Create profile first
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);

      const response = await request
        .delete(`/api/v1/profiles/${testProfile.name}`)
        .set('Authorization', testToken)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('PROFILE_DELETED');
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await request
        .get('/api/v1/profiles/non-existent-profile')
        .set('Authorization', testToken)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('Privacy Masking', () => {
    beforeEach(async () => {
      // Create test profile for masking tests
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);
    });

    it('should apply privacy masking to data with policy enforcement', async () => {
      const maskingRequest = {
        data: {
          email: 'user@example.com',
          name: 'John Doe',
          age: 30
        },
        profileName: testProfile.name,
        context: {
          purpose: 'testing',
          jurisdiction: 'US'
        }
      };

      const response = await request
        .post('/api/v1/mask/apply')
        .set('Authorization', testToken)
        .send(maskingRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('MASKING_APPLIED');
      expect(response.body.data.maskedData.email).not.toBe('user@example.com');
      expect(response.body.data.maskedData.name).toBe('[REDACTED]');
      expect(response.body.data.maskedData.age).toBe(30); // Not masked
      expect(response.body.data.appliedRules).toHaveLength(2);
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.riskScore).toBeLessThanOrEqual(1);
      expect(response.body.data.policyEnforcement).toBeDefined();
    });

    it('should assess re-identification risk for dataset', async () => {
      const assessmentRequest = {
        dataset: [
          { name: 'John', age: 25, city: 'New York' },
          { name: 'Jane', age: 30, city: 'Boston' },
          { name: 'Bob', age: 25, city: 'New York' }
        ],
        config: {
          kAnonymity: 2,
          quasiIdentifiers: ['age', 'city']
        }
      };

      const response = await request
        .post('/api/v1/mask/assess-reidentification')
        .set('Authorization', testToken)
        .send(assessmentRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.riskScore).toBeLessThanOrEqual(1);
      expect(response.body.data.vulnerabilities).toBeInstanceOf(Array);
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
      expect(response.body.data.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should apply k-anonymity to dataset', async () => {
      const kAnonymityRequest = {
        dataset: [
          { name: 'John', age: 25, city: 'New York' },
          { name: 'Jane', age: 27, city: 'New York' },
          { name: 'Bob', age: 35, city: 'Boston' },
          { name: 'Alice', age: 37, city: 'Boston' }
        ],
        quasiIdentifiers: ['age', 'city'],
        k: 2
      };

      const response = await request
        .post('/api/v1/mask/apply-kanonymity')
        .set('Authorization', testToken)
        .send(kAnonymityRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.anonymizedDataset).toBeInstanceOf(Array);
      expect(response.body.data.suppressedRecords).toBeGreaterThanOrEqual(0);
      expect(response.body.data.generalizedFields).toBeInstanceOf(Array);
    });

    it('should validate masking configuration', async () => {
      const validationRequest = {
        profileName: testProfile.name,
        sampleData: {
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      const response = await request
        .post('/api/v1/mask/validate')
        .set('Authorization', testToken)
        .send(validationRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.applicableRules).toBe(2);
    });

    it('should return error for non-existent profile in masking', async () => {
      const maskingRequest = {
        data: { email: 'user@example.com' },
        profileName: 'non-existent-profile'
      };

      const response = await request
        .post('/api/v1/mask/apply')
        .set('Authorization', testToken)
        .send(maskingRequest)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('Privacy Assessments', () => {
    it('should perform privacy impact assessment', async () => {
      const assessmentRequest = {
        operation: {
          type: 'PROCESSING',
          dataTypes: ['email', 'name', 'address'],
          purpose: 'Customer service',
          recipients: ['internal-team'],
          retention: '2 years',
          jurisdiction: 'EU'
        }
      };

      const response = await request
        .post('/api/v1/assessments')
        .set('Authorization', testToken)
        .send(assessmentRequest)
        .expect(201);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('ASSESSMENT_COMPLETED');
      expect(response.body.data.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.riskScore).toBeLessThanOrEqual(1);
      expect(response.body.data.risks).toBeInstanceOf(Array);
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
      expect(response.body.data.complianceRequirements).toContain('GDPR');
    });

    it('should list privacy assessments', async () => {
      // First create an assessment
      const assessmentRequest = {
        operation: {
          type: 'STORAGE',
          dataTypes: ['email'],
          purpose: 'Testing',
          retention: '1 year',
          jurisdiction: 'US'
        }
      };

      await request
        .post('/api/v1/assessments')
        .set('Authorization', testToken)
        .send(assessmentRequest)
        .expect(201);

      const response = await request
        .get('/api/v1/assessments')
        .set('Authorization', testToken)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.assessments).toBeInstanceOf(Array);
    });
  });

  describe('Enhanced Compliance Features', () => {
    it('should create and process data subject request with GDPR service', async () => {
      const dsrRequest = {
        type: 'ACCESS',
        dataSubject: 'user@example.com',
        description: 'Request access to all personal data'
      };

      const response = await request
        .post('/api/v1/compliance/dsr')
        .set('Authorization', testToken)
        .send(dsrRequest)
        .expect(201);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('DSR_CREATED');
      expect(response.body.data.requestId).toBeDefined();
      expect(response.body.data.type).toBe('ACCESS');
      expect(response.body.data.processingResult).toBeDefined();
    });

    it('should validate GDPR compliance for operations', async () => {
      const validationRequest = {
        purpose: 'Customer service',
        dataTypes: ['email', 'name'],
        lawfulBasis: 'consent',
        dataSubjectConsent: true,
        retentionPeriod: '2 years',
        recipients: ['internal-team']
      };

      const response = await request
        .post('/api/v1/compliance/validate-gdpr')
        .set('Authorization', testToken)
        .send(validationRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.compliant).toBeDefined();
      expect(response.body.data.violations).toBeInstanceOf(Array);
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });

    it('should assess breach notification requirements', async () => {
      const breachRequest = {
        dataTypes: ['email', 'password'],
        affectedSubjects: 1000,
        riskLevel: 'HIGH',
        containmentTime: 2,
        description: 'Database breach exposing user credentials'
      };

      const response = await request
        .post('/api/v1/compliance/assess-breach')
        .set('Authorization', testToken)
        .send(breachRequest)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.notificationRequired).toBeDefined();
      expect(response.body.data.timeframe).toBeDefined();
      expect(response.body.data.recipients).toBeInstanceOf(Array);
      expect(response.body.data.template).toBeDefined();
    });

    it('should generate enhanced GDPR compliance report', async () => {
      const response = await request
        .get('/api/v1/compliance/gdpr-report')
        .set('Authorization', testToken)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.reportId).toBeDefined();
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.dsrRequests).toBeDefined();
      expect(response.body.data.complianceScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });

    it('should manage privacy policies', async () => {
      const policyRequest = {
        name: 'Test Privacy Policy',
        regulation: 'GDPR',
        jurisdiction: ['EU'],
        dataTypes: ['personal_data'],
        mandatory: true,
        version: '1.0.0',
        rules: [
          {
            id: 'test_rule',
            name: 'Test Rule',
            description: 'A test privacy rule',
            priority: 1,
            enabled: true
          }
        ]
      };

      const createResponse = await request
        .post('/api/v1/compliance/policies')
        .set('Authorization', testToken)
        .send(policyRequest)
        .expect(201);

      expect(createResponse.body.status).toBe('ok');
      expect(createResponse.body.data.policyId).toBeDefined();

      // List policies
      const listResponse = await request
        .get('/api/v1/compliance/policies')
        .set('Authorization', testToken)
        .query({ regulation: 'GDPR' })
        .expect(200);

      expect(listResponse.body.status).toBe('ok');
      expect(listResponse.body.data.policies).toBeInstanceOf(Array);
    });

    it('should list data subject requests', async () => {
      // Create a DSR first
      const dsrRequest = {
        type: 'ERASURE',
        dataSubject: 'user@example.com',
        description: 'Delete all personal data'
      };

      await request
        .post('/api/v1/compliance/dsr')
        .set('Authorization', testToken)
        .send(dsrRequest)
        .expect(201);

      const response = await request
        .get('/api/v1/compliance/dsr')
        .set('Authorization', testToken)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.requests).toBeInstanceOf(Array);
    });

    it('should generate compliance report', async () => {
      const response = await request
        .get('/api/v1/compliance/report/GDPR')
        .set('Authorization', testToken)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.reportType).toBe('GDPR');
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request
        .get('/api/v1/profiles')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('SQUID_AUTH_REQUIRED');
    });

    it('should reject invalid tokens', async () => {
      const response = await request
        .get('/api/v1/profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('SQUID_IDENTITY_INVALID');
    });
  });

  describe('MCP Tools', () => {
    beforeEach(async () => {
      // Create test profile for MCP tests
      await request
        .post('/api/v1/profiles')
        .set('Authorization', testToken)
        .send(testProfile)
        .expect(201);
    });

    it('should handle qmask.apply MCP tool', async () => {
      const mcpRequest = {
        data: {
          email: 'user@example.com',
          name: 'John Doe'
        },
        profileName: testProfile.name
      };

      const response = await request
        .post('/mcp/v1/tools/qmask.apply')
        .set('Authorization', testToken)
        .send(mcpRequest)
        .expect(200);

      expect(response.body.maskedData).toBeDefined();
      expect(response.body.appliedRules).toBeInstanceOf(Array);
      expect(response.body.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle qmask.profile MCP tool - get action', async () => {
      const mcpRequest = {
        action: 'get',
        profileName: testProfile.name
      };

      const response = await request
        .post('/mcp/v1/tools/qmask.profile')
        .set('Authorization', testToken)
        .send(mcpRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.profile.name).toBe(testProfile.name);
    });

    it('should handle qmask.assess MCP tool', async () => {
      const mcpRequest = {
        operation: {
          type: 'PROCESSING',
          dataTypes: ['email', 'name'],
          purpose: 'Testing MCP tool'
        }
      };

      const response = await request
        .post('/mcp/v1/tools/qmask.assess')
        .set('Authorization', testToken)
        .send(mcpRequest)
        .expect(200);

      expect(response.body.riskLevel).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(response.body.risks).toBeInstanceOf(Array);
      expect(response.body.recommendations).toBeInstanceOf(Array);
    });
  });
});