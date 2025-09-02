/**
 * API Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import SquidServer from '../../src/server';
import crypto from 'crypto';

describe('sQuid API Integration Tests', () => {
  let server: SquidServer;
  let app: any;

  beforeAll(async () => {
    // Set test environment
    process.env.SQUID_MOCK_MODE = 'true';
    process.env.SQUID_PORT = '0'; // Use random port
    process.env.NODE_ENV = 'test';

    server = new SquidServer();
    app = (server as any).app;
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        timestamp: expect.any(String),
        version: expect.any(String),
        dependencies: expect.any(Object),
        metrics: expect.objectContaining({
          uptime: expect.any(Number),
          requestCount: expect.any(Number),
          errorRate: expect.any(Number),
          avgResponseTime: expect.any(Number)
        })
      });
    });
  });

  describe('Identity Creation', () => {
    it('should create a new root identity', async () => {
      const identityData = {
        name: 'Test Identity',
        description: 'Test description',
        tags: ['test', 'integration']
      };

      const response = await request(app)
        .post('/identity')
        .send(identityData)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'ok',
        code: 'IDENTITY_CREATED',
        message: 'Identity created successfully',
        data: expect.objectContaining({
          did: expect.any(String),
          name: 'Test Identity',
          type: 'ROOT',
          status: 'ACTIVE',
          verificationLevel: 'UNVERIFIED',
          reputation: 100,
          depth: 0,
          children: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }),
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/identity')
        .send({}) // Missing required 'name' field
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        code: expect.any(String),
        message: expect.stringContaining('name'),
        retryable: false
      });
    });

    it('should enforce rate limiting', async () => {
      const identityData = { name: 'Rate Limit Test' };

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/identity')
          .send({ ...identityData, name: `Rate Limit Test ${i}` })
          .expect(201);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/identity')
        .send(identityData)
        .expect(429);

      expect(response.body).toMatchObject({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        retryable: true
      });
    });
  });

  describe('Identity Retrieval', () => {
    let testIdentityId: string;

    beforeEach(async () => {
      // Create a test identity
      const response = await request(app)
        .post('/identity')
        .send({ name: 'Retrieval Test Identity' });
      
      testIdentityId = response.body.data.did;
    });

    it('should retrieve an existing identity', async () => {
      const response = await request(app)
        .get(`/identity/${testIdentityId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        code: 'IDENTITY_RETRIEVED',
        data: expect.objectContaining({
          did: testIdentityId,
          name: 'Retrieval Test Identity'
        })
      });
    });

    it('should return 404 for non-existent identity', async () => {
      const response = await request(app)
        .get('/identity/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        code: 'IDENTITY_NOT_FOUND',
        retryable: false
      });
    });
  });

  describe('Authentication', () => {
    let testIdentity: any;

    beforeEach(async () => {
      // Create a test identity
      const response = await request(app)
        .post('/identity')
        .send({ name: 'Auth Test Identity' });
      
      testIdentity = response.body.data;
    });

    it('should reject requests without authentication headers', async () => {
      const response = await request(app)
        .put(`/identity/${testIdentity.did}`)
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        code: 'SQUID_AUTH_REQUIRED',
        retryable: false
      });
    });

    it('should accept valid authentication', async () => {
      const message = JSON.stringify({
        action: 'update_identity',
        timestamp: new Date().toISOString(),
        did: testIdentity.did
      });

      const signature = crypto
        .createHash('sha256')
        .update(`${message}:${testIdentity.publicKey}`)
        .digest('hex');

      const response = await request(app)
        .put(`/identity/${testIdentity.did}`)
        .set('x-squid-id', testIdentity.did)
        .set('x-sig', signature)
        .set('x-ts', new Date().toISOString())
        .set('x-message', message)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        code: 'IDENTITY_UPDATED'
      });
    });

    it('should reject expired messages', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const message = JSON.stringify({
        action: 'update_identity',
        timestamp: oldTimestamp,
        did: testIdentity.did
      });

      const signature = crypto
        .createHash('sha256')
        .update(`${message}:${testIdentity.publicKey}`)
        .digest('hex');

      const response = await request(app)
        .put(`/identity/${testIdentity.did}`)
        .set('x-squid-id', testIdentity.did)
        .set('x-sig', signature)
        .set('x-ts', oldTimestamp)
        .set('x-message', message)
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        code: 'SQUID_MESSAGE_EXPIRED',
        retryable: false
      });
    });
  });

  describe('MCP Tools', () => {
    let testIdentity: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/identity')
        .send({ name: 'MCP Test Identity' });
      
      testIdentity = response.body.data;
    });

    it('should verify identity through MCP tool', async () => {
      const message = JSON.stringify({
        action: 'verify',
        timestamp: new Date().toISOString(),
        did: testIdentity.did
      });

      const signature = crypto
        .createHash('sha256')
        .update(`${message}:${testIdentity.publicKey}`)
        .digest('hex');

      const response = await request(app)
        .post('/mcp/squid.verifyIdentity')
        .send({
          identityId: testIdentity.did,
          signature,
          message,
          timestamp: new Date().toISOString()
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        data: expect.objectContaining({
          verified: true,
          identity: expect.objectContaining({
            did: testIdentity.did
          }),
          verificationLevel: 'UNVERIFIED',
          reputation: expect.any(Number)
        })
      });
    });

    it('should get active context through MCP tool', async () => {
      const response = await request(app)
        .post('/mcp/squid.activeContext')
        .send({
          sessionId: 'test-session-123',
          includeSubidentities: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        data: expect.any(Object)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        code: 'NOT_FOUND',
        retryable: false
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/identity')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/identity')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,x-squid-id')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });
});