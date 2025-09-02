import { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, generateTestData, getAuthHeader } from '../test-utils';

describe('Consent Routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    token = testApp.token;
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /qonsent/set', () => {
    it('should set consent for a resource', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/qonsent/set',
        headers: getAuthHeader(token),
        payload: {
          resourceId: 'resource:test',
          targetDid: 'did:test:target',
          permissions: ['read', 'write'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.ruleId).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/qonsent/set',
        payload: {
          resourceId: 'resource:test',
          targetDid: 'did:test:target',
          permissions: ['read'],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /qonsent/viewable-by/:did', () => {
    it('should return viewable resources for a DID', async () => {
      // Create test data
      await generateTestData();

      const response = await app.inject({
        method: 'GET',
        url: '/consent/viewable-by/did:test:target1',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.resources).toHaveLength(1);
      expect(data.resources[0].resourceId).toBe('resource:1');
      expect(data.total).toBe(1);
    });
  });

  describe('POST /qonsent/batch-sync', () => {
    it('should process batch permission updates', async () => {
      const items = [
        {
          resourceId: 'resource:batch1',
          targetDid: 'did:test:target1',
          permissions: ['read'],
        },
        {
          resourceId: 'resource:batch2',
          targetDid: 'did:test:target2',
          permissions: ['read', 'write'],
        },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/consent/batch-sync',
        headers: getAuthHeader(token),
        payload: { items },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(2);
    });
  });

  describe('GET /qonsent/logs', () => {
    it('should return consent logs', async () => {
      // Create test data
      await generateTestData();

      const response = await app.inject({
        method: 'GET',
        url: '/consent/logs',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });
  });
});
