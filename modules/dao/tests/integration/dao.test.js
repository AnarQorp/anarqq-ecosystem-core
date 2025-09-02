/**
 * Integration tests for DAO module
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/server.js';
import { DatabaseManager } from '../../src/storage/database.js';

describe('DAO Integration Tests', () => {
  let app;
  let db;
  let authToken;

  beforeAll(async () => {
    // Initialize test database
    db = new DatabaseManager();
    await db.initialize();

    // Create test server
    app = await createServer();

    // Mock auth token for testing
    authToken = 'Bearer test-jwt-token';
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('ready', true);
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('alive', true);
    });
  });

  describe('DAO Endpoints', () => {
    it('should list DAOs without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/daos')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('daos');
      expect(Array.isArray(response.body.data.daos)).toBe(true);
    });

    it('should get specific DAO details', async () => {
      const response = await request(app)
        .get('/api/v1/daos/anarq-governance')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'anarq-governance');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('description');
    });

    it('should return 404 for non-existent DAO', async () => {
      const response = await request(app)
        .get('/api/v1/daos/non-existent-dao')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'DAO_NOT_FOUND');
    });

    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .get('/api/v1/daos')
        .expect(401);
    });
  });

  describe('Proposal Endpoints', () => {
    it('should list proposals for a DAO', async () => {
      const response = await request(app)
        .get('/api/v1/daos/anarq-governance/proposals')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('proposals');
      expect(Array.isArray(response.body.data.proposals)).toBe(true);
    });

    it('should validate proposal creation input', async () => {
      const invalidProposal = {
        title: 'A', // Too short
        description: 'Short', // Too short
        creatorId: 'invalid-id', // Invalid format
        signature: 'sig'
      };

      const response = await request(app)
        .post('/api/v1/daos/anarq-governance/proposals')
        .set('Authorization', authToken)
        .send(invalidProposal)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Voting Endpoints', () => {
    it('should validate vote input', async () => {
      const invalidVote = {
        voterId: 'invalid-id',
        option: '',
        signature: 'short'
      };

      const response = await request(app)
        .post('/api/v1/daos/anarq-governance/proposals/test-proposal/vote')
        .set('Authorization', authToken)
        .send(invalidVote)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Results Endpoints', () => {
    it('should get voting results for a DAO', async () => {
      const response = await request(app)
        .get('/api/v1/daos/anarq-governance/results')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('daoId', 'anarq-governance');
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should get reputation leaderboard', async () => {
      const response = await request(app)
        .get('/api/v1/daos/anarq-governance/leaderboard')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
    });
  });
});