import { FastifyInstance } from 'fastify';
import { createTestApp, clearDatabase, generateTestData, getAuthHeader } from '../test-utils';

describe('Delegation Routes', () => {
  let app: FastifyInstance;
  let token: string;
  let testData: any;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    token = testApp.token;
    testData = await generateTestData();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /qonsent/delegate', () => {
    it('should create a new delegation', async () => {
      const delegationData = {
        delegateeDid: 'did:test:newdelegatee',
        scope: ['read:documents'],
        capabilities: ['read:documents:123'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/qonsent/delegate',
        headers: getAuthHeader(token),
        payload: delegationData,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.delegationId).toBeDefined();
    });
  });

  describe('GET /consent/delegate/my-delegations', () => {
    it('should return outgoing delegations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/consent/delegate/my-delegations?type=outgoing',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data.delegations)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
      expect(
        data.delegations.every((d: any) => d.delegatorDid === 'did:test:user')
      ).toBe(true);
    });

    it('should return incoming delegations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/consent/delegate/my-delegations?type=incoming',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data.delegations)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
      expect(
        data.delegations.every((d: any) => d.delegateeDid === 'did:test:user')
      ).toBe(true);
    });
  });

  describe('DELETE /qonsent/delegate/:delegationId', () => {
    it('should revoke a delegation', async () => {
      // Get the first delegation ID from test data
      const delegationId = testData.delegations[0]._id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/consent/delegate/${delegationId}`,
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent delegation', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/consent/delegate/5f8d04b3ab35b62e00c2e4d4',
        headers: getAuthHeader(token),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /consent/delegate/verify', () => {
    it('should verify a valid delegation', async () => {
      // Create a test delegation
      const createResponse = await app.inject({
        method: 'POST',
        url: '/qonsent/delegate',
        headers: getAuthHeader(token),
        payload: {
          delegateeDid: 'did:test:verify',
          scope: ['read:documents'],
          capabilities: ['read:documents:123'],
        },
      });

      const { delegationId } = JSON.parse(createResponse.payload);

      // Verify the delegation
      const response = await app.inject({
        method: 'POST',
        url: '/consent/delegate/verify',
        headers: getAuthHeader(token),
        payload: {
          delegatorDid: 'did:test:user',
          delegateeDid: 'did:test:verify',
          scope: 'read:documents',
          capability: 'read:documents:123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isValid).toBe(true);
      expect(data.delegation).toBeDefined();
    });

    it('should reject invalid delegation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/consent/delegate/verify',
        headers: getAuthHeader(token),
        payload: {
          delegatorDid: 'did:test:nonexistent',
          delegateeDid: 'did:test:user',
          scope: 'read:documents',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.isValid).toBe(false);
    });
  });
});
