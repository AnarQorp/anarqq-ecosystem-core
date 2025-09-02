/**
 * Integration Tests for Qwallet API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../../src/server.mjs';
import request from 'supertest';

describe('Qwallet API Integration', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Set test environment
    process.env.QWALLET_MODE = 'standalone';
    process.env.QWALLET_MOCK_SERVICES = 'true';
    process.env.PORT = '0'; // Use random available port
    
    server = await startServer();
    app = server;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toMatch(/healthy|degraded/);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.ready).toBe(true);
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.alive).toBe(true);
    });
  });

  describe('OpenAPI Specification', () => {
    it('should serve OpenAPI YAML', async () => {
      const response = await request(app)
        .get('/openapi.yaml')
        .expect(200);

      expect(response.headers['content-type']).toContain('yaml');
    });

    it('should serve OpenAPI JSON', async () => {
      const response = await request(app)
        .get('/openapi.json')
        .expect(200);

      expect(response.body.openapi).toBeDefined();
      expect(response.body.info.title).toBe('Qwallet API');
    });
  });

  describe('MCP Configuration', () => {
    it('should serve MCP configuration', async () => {
      const response = await request(app)
        .get('/mcp.json')
        .expect(200);

      expect(response.body.name).toBe('qwallet');
      expect(response.body.tools).toBeDefined();
      expect(response.body.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Payment Quote API', () => {
    it('should generate payment quote', async () => {
      const response = await request(app)
        .get('/api/payments/quote')
        .query({
          amount: 100,
          currency: 'QToken'
        })
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.amount).toBe(100);
      expect(response.body.data.currency).toBe('QToken');
      expect(response.body.data.fees).toBeDefined();
    });

    it('should reject invalid quote request', async () => {
      const response = await request(app)
        .get('/api/payments/quote')
        .query({
          amount: -100,
          currency: 'QToken'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('MCP Handler', () => {
    it('should handle wallet.quote tool', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          tool: 'wallet.quote',
          arguments: {
            amount: 100,
            currency: 'QToken'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.amount).toBe(100);
      expect(response.body.currency).toBe('QToken');
    });

    it('should reject unknown MCP tool', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          tool: 'unknown.tool',
          arguments: {}
        })
        .expect(400);

      expect(response.body.error).toContain('Unknown tool');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown/endpoint')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });
});