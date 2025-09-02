import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/utils/database';
import { connectEventBus } from '../src/utils/eventBus';

describe('Qonsent Service', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/qonsent-test';
    process.env.EVENT_BUS_TYPE = 'mock';
    
    // Connect to test database
    await connectDatabase();
    await connectEventBus();
    
    // Build app
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // This would clear test collections in a real implementation
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toMatch(/healthy|degraded|unhealthy/);
      expect(body.version).toBe('2.0.0');
      expect(body.dependencies).toBeDefined();
    });

    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ready).toBe(true);
    });

    it('should return liveness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alive).toBe(true);
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  describe('Permission Check', () => {
    it('should check permission with valid request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/check',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-squid-id': 'did:squid:test-user',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'did:squid:alice',
          action: 'read',
          context: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.data).toBeDefined();
      expect(body.data.allowed).toBeDefined();
      expect(body.data.reason).toBeDefined();
    });

    it('should reject invalid resource format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/check',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        payload: {
          resource: 'invalid-resource',
          identity: 'did:squid:alice',
          action: 'read',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid identity format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/check',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'invalid-identity',
          action: 'read',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid action', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/check',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'did:squid:alice',
          action: 'invalid-action',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Permission Grant', () => {
    it('should grant permission with valid request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/grant',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-squid-id': 'did:squid:test-user',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'did:squid:alice',
          permissions: ['read', 'write'],
          expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.data).toBeDefined();
      expect(body.data.grantId).toBeDefined();
      expect(body.data.resource).toBe('qdrive:file:test123');
      expect(body.data.identity).toBe('did:squid:alice');
      expect(body.data.permissions).toEqual(['read', 'write']);
    });

    it('should reject grant without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/grant',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'did:squid:alice',
          permissions: ['read'],
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('INVALID_TOKEN');
    });

    it('should reject invalid permissions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/grant',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        payload: {
          resource: 'qdrive:file:test123',
          identity: 'did:squid:alice',
          permissions: ['invalid-permission'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('error');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Permission Revoke', () => {
    it('should revoke permission with valid request', async () => {
      // First grant a permission
      await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/grant',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-squid-id': 'did:squid:test-user',
        },
        payload: {
          resource: 'qdrive:file:test456',
          identity: 'did:squid:bob',
          permissions: ['read', 'write'],
        },
      });

      // Then revoke it
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/qonsent/revoke',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
          'x-squid-id': 'did:squid:test-user',
        },
        payload: {
          resource: 'qdrive:file:test456',
          identity: 'did:squid:bob',
          permissions: ['write'],
          reason: 'Test revocation',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.data).toBeDefined();
      expect(body.data.resource).toBe('qdrive:file:test456');
      expect(body.data.identity).toBe('did:squid:bob');
      expect(body.data.revokedPermissions).toEqual(['write']);
    });
  });

  describe('MCP Tools', () => {
    it('should list available MCP tools', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mcp/v1/tools',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tools).toBeDefined();
      expect(body.tools).toHaveLength(3);
      
      const toolNames = body.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('qonsent.check');
      expect(toolNames).toContain('qonsent.grant');
      expect(toolNames).toContain('qonsent.revoke');
    });

    it('should execute qonsent.check MCP tool', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/mcp/v1/tools/qonsent.check',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        payload: {
          resource: 'qdrive:file:mcp-test',
          identity: 'did:squid:alice',
          action: 'read',
          context: {
            source: 'mcp-test',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.allowed).toBeDefined();
      expect(body.reason).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 5; i++) {
        requests.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/qonsent/check',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            },
            payload: {
              resource: 'qdrive:file:rate-test',
              identity: 'did:squid:alice',
              action: 'read',
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect(response.statusCode).toBeLessThan(400);
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });
    });
  });
});