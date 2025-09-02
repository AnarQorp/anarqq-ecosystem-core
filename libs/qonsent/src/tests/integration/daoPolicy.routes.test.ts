import { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, generateTestData, getAuthHeader } from '../test-utils';

describe('DAO Policy Routes', () => {
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

  describe('POST /qonsent/dao-policy', () => {
    it('should create a new DAO policy', async () => {
      const policyData = {
        daoId: 'dao:test',
        resourcePattern: 'resource:test:*',
        allowedRoles: ['admin', 'member'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/qonsent/dao-policy',
        headers: getAuthHeader(token),
        payload: policyData,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.policyId).toBeDefined();
    });

    it('should update an existing policy', async () => {
      // First create a policy
      const createResponse = await app.inject({
        method: 'POST',
        url: '/qonsent/dao-policy',
        headers: getAuthHeader(token),
        payload: {
          daoId: 'dao:test',
          resourcePattern: 'resource:test:*',
          allowedRoles: ['admin'],
        },
      });

      expect(createResponse.statusCode).toBe(200);
      const createData = JSON.parse(createResponse.payload);

      // Update the policy
      const updateResponse = await app.inject({
        method: 'POST',
        url: '/qonsent/dao-policy',
        headers: getAuthHeader(token),
        payload: {
          daoId: 'dao:test',
          resourcePattern: 'resource:test:*',
          allowedRoles: ['admin', 'member'],
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateData = JSON.parse(updateResponse.payload);
      expect(updateData.success).toBe(true);
      expect(updateData.policyId).toBe(createData.policyId);
    });
  });

  describe('GET /qonsent/dao-policy/:daoId', () => {
    it('should return policies for a DAO', async () => {
      // Create test data
      await generateTestData();

      const response = await app.inject({
        method: 'GET',
        url: '/consent/dao-policy/dao:test',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data.policies)).toBe(true);
      expect(data.policies.length).toBeGreaterThan(0);
    });

    it('should filter policies by resource pattern', async () => {
      // Create test data
      await generateTestData();

      const response = await app.inject({
        method: 'GET',
        url: '/consent/dao-policy/dao:test?resourcePattern=resource:restricted:*',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data.policies)).toBe(true);
      expect(data.policies).toHaveLength(1);
      expect(data.policies[0].resourcePattern).toBe('resource:restricted:*');
    });
  });

  describe('DELETE /qonsent/dao-policy/:policyId', () => {
    it('should delete a DAO policy', async () => {
      // First create a policy
      const createResponse = await app.inject({
        method: 'POST',
        url: '/qonsent/dao-policy',
        headers: getAuthHeader(token),
        payload: {
          daoId: 'dao:test',
          resourcePattern: 'resource:test:delete',
          allowedRoles: ['admin'],
        },
      });

      expect(createResponse.statusCode).toBe(200);
      const createData = JSON.parse(createResponse.payload);

      // Delete the policy
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/consent/dao-policy/${createData.policyId}`,
        headers: getAuthHeader(token),
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deleteData = JSON.parse(deleteResponse.payload);
      expect(deleteData.success).toBe(true);
    });

    it('should return 404 for non-existent policy', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/consent/dao-policy/5f8d04b3ab35b62e00c2e4d4',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
