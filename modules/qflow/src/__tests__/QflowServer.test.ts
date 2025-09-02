/**
 * Qflow Server Tests
 * 
 * Comprehensive unit tests for the REST API server
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { QflowServer } from '../api/QflowServer.js';
import { executionEngine } from '../core/ExecutionEngine.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

describe('QflowServer', () => {
  let server: QflowServer;
  let app: any;

  beforeEach(() => {
    // Create server instance for testing
    server = new QflowServer({
      port: 0, // Use random port for testing
      auth: { enabled: false, requireSquidIdentity: false },
      rateLimit: { enabled: false, windowMs: 0, maxRequests: 0 }
    });
    app = server.getApp();

    // Mock event emitter methods
    vi.spyOn(qflowEventEmitter, 'emitFlowCreated').mockResolvedValue();
    vi.spyOn(qflowEventEmitter, 'emitFlowUpdated').mockResolvedValue();
    vi.spyOn(qflowEventEmitter, 'emitFlowDeleted').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('0.1.0');
      expect(response.body.data.uptime).toBeGreaterThan(0);
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
      expect(response.body.data.checks).toBeDefined();
    });
  });

  describe('Flow Management', () => {
    const validFlow = {
      id: 'test-flow',
      name: 'Test Flow',
      version: '1.0.0',
      owner: 'squid:user:test',
      description: 'A test flow',
      steps: [
        {
          id: 'step1',
          type: 'task',
          action: 'log-message',
          params: { message: 'Hello, World!' }
        }
      ],
      metadata: {
        tags: ['test'],
        category: 'utility',
        visibility: 'public',
        requiredPermissions: []
      }
    };

    describe('POST /api/v1/flows', () => {
      it('should create a new flow', async () => {
        const response = await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flow.id).toBe('test-flow');
        expect(response.body.data.flow.name).toBe('Test Flow');
        expect(qflowEventEmitter.emitFlowCreated).toHaveBeenCalledWith(
          'squid:user:test',
          expect.objectContaining({
            flowId: 'test-flow',
            flowName: 'Test Flow',
            flowVersion: '1.0.0',
            owner: 'squid:user:test'
          })
        );
      });

      it('should reject invalid flow data', async () => {
        const invalidFlow = { ...validFlow, steps: [] }; // Empty steps array

        const response = await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(invalidFlow),
            format: 'json'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_VALIDATION_FAILED');
      });

      it('should reject missing flow data', async () => {
        const response = await request(app)
          .post('/api/v1/flows')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_FLOW_DATA');
      });

      it('should reject duplicate flow ID', async () => {
        // Create first flow
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          })
          .expect(201);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_EXISTS');
      });
    });

    describe('GET /api/v1/flows', () => {
      beforeEach(async () => {
        // Create test flows
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          });

        const flow2 = { ...validFlow, id: 'test-flow-2', name: 'Test Flow 2' };
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(flow2),
            format: 'json'
          });
      });

      it('should list all flows', async () => {
        const response = await request(app)
          .get('/api/v1/flows')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flows).toHaveLength(2);
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should filter flows by category', async () => {
        const response = await request(app)
          .get('/api/v1/flows?category=utility')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flows).toHaveLength(2);
      });

      it('should filter flows by owner', async () => {
        const response = await request(app)
          .get('/api/v1/flows?owner=squid:user:test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flows).toHaveLength(2);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/v1/flows?limit=1&offset=0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flows).toHaveLength(1);
        expect(response.body.data.pagination.hasMore).toBe(true);
      });
    });

    describe('GET /api/v1/flows/:id', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          });
      });

      it('should get a specific flow', async () => {
        const response = await request(app)
          .get('/api/v1/flows/test-flow')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flow.id).toBe('test-flow');
        expect(response.body.data.flow.name).toBe('Test Flow');
      });

      it('should return 404 for non-existent flow', async () => {
        const response = await request(app)
          .get('/api/v1/flows/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_NOT_FOUND');
      });
    });

    describe('PUT /api/v1/flows/:id', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          });
      });

      it('should update an existing flow', async () => {
        const updatedFlow = { 
          ...validFlow, 
          name: 'Updated Test Flow',
          version: '1.1.0'
        };

        const response = await request(app)
          .put('/api/v1/flows/test-flow')
          .send({
            flowData: JSON.stringify(updatedFlow),
            format: 'json'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flow.name).toBe('Updated Test Flow');
        expect(response.body.data.flow.version).toBe('1.1.0');
        expect(qflowEventEmitter.emitFlowUpdated).toHaveBeenCalledWith(
          'squid:user:test',
          expect.objectContaining({
            flowId: 'test-flow',
            flowName: 'Updated Test Flow',
            flowVersion: '1.1.0',
            previousVersion: '1.0.0'
          })
        );
      });

      it('should return 404 for non-existent flow', async () => {
        const response = await request(app)
          .put('/api/v1/flows/non-existent')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_NOT_FOUND');
      });

      it('should reject ID mismatch', async () => {
        const mismatchedFlow = { ...validFlow, id: 'different-id' };

        const response = await request(app)
          .put('/api/v1/flows/test-flow')
          .send({
            flowData: JSON.stringify(mismatchedFlow),
            format: 'json'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ID_MISMATCH');
      });
    });

    describe('DELETE /api/v1/flows/:id', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/flows')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          });
      });

      it('should delete an existing flow', async () => {
        const response = await request(app)
          .delete('/api/v1/flows/test-flow')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedFlow.id).toBe('test-flow');
        expect(qflowEventEmitter.emitFlowDeleted).toHaveBeenCalledWith(
          'squid:user:test',
          expect.objectContaining({
            flowId: 'test-flow',
            flowName: 'Test Flow',
            flowVersion: '1.0.0'
          })
        );
      });

      it('should return 404 for non-existent flow', async () => {
        const response = await request(app)
          .delete('/api/v1/flows/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_NOT_FOUND');
      });
    });

    describe('POST /api/v1/flows/validate', () => {
      it('should validate a valid flow', async () => {
        const response = await request(app)
          .post('/api/v1/flows/validate')
          .send({
            flowData: JSON.stringify(validFlow),
            format: 'json'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(true);
        expect(response.body.data.errors).toHaveLength(0);
      });

      it('should validate an invalid flow', async () => {
        const invalidFlow = { ...validFlow, steps: [] };

        const response = await request(app)
          .post('/api/v1/flows/validate')
          .send({
            flowData: JSON.stringify(invalidFlow),
            format: 'json'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(false);
        expect(response.body.data.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Execution Management', () => {
    const validFlow = {
      id: 'exec-test-flow',
      name: 'Execution Test Flow',
      version: '1.0.0',
      owner: 'squid:user:test',
      steps: [
        {
          id: 'step1',
          type: 'task',
          action: 'log-message',
          params: { message: 'Hello, World!' }
        }
      ],
      metadata: {
        tags: ['test'],
        category: 'utility',
        visibility: 'public',
        requiredPermissions: []
      }
    };

    beforeEach(async () => {
      // Create test flow
      await request(app)
        .post('/api/v1/flows')
        .send({
          flowData: JSON.stringify(validFlow),
          format: 'json'
        });
    });

    describe('POST /api/v1/flows/:id/start', () => {
      it('should start flow execution', async () => {
        const response = await request(app)
          .post('/api/v1/flows/exec-test-flow/start')
          .send({
            context: {
              triggeredBy: 'squid:user:test',
              triggerType: 'manual',
              inputData: { test: true },
              variables: { env: 'test' },
              permissions: ['flow:execute']
            }
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.executionId).toBeDefined();
        expect(response.body.data.flowId).toBe('exec-test-flow');
        expect(response.body.data.status).toBe('pending');
      });

      it('should reject missing context', async () => {
        const response = await request(app)
          .post('/api/v1/flows/exec-test-flow/start')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_CONTEXT');
      });

      it('should return 404 for non-existent flow', async () => {
        const response = await request(app)
          .post('/api/v1/flows/non-existent/start')
          .send({
            context: {
              triggeredBy: 'squid:user:test',
              triggerType: 'manual'
            }
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FLOW_NOT_FOUND');
      });
    });

    describe('GET /api/v1/executions', () => {
      let executionId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/flows/exec-test-flow/start')
          .send({
            context: {
              triggeredBy: 'squid:user:test',
              triggerType: 'manual'
            }
          });
        executionId = response.body.data.executionId;
      });

      it('should list all executions', async () => {
        const response = await request(app)
          .get('/api/v1/executions')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.executions.length).toBeGreaterThan(0);
        expect(response.body.data.pagination.total).toBeGreaterThan(0);
      });

      it('should filter executions by flowId', async () => {
        const response = await request(app)
          .get('/api/v1/executions?flowId=exec-test-flow')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.executions.length).toBeGreaterThan(0);
        expect(response.body.data.executions[0].flowId).toBe('exec-test-flow');
      });
    });

    describe('GET /api/v1/executions/:id', () => {
      let executionId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/flows/exec-test-flow/start')
          .send({
            context: {
              triggeredBy: 'squid:user:test',
              triggerType: 'manual'
            }
          });
        executionId = response.body.data.executionId;
      });

      it('should get execution status', async () => {
        const response = await request(app)
          .get(`/api/v1/executions/${executionId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.execution.executionId).toBe(executionId);
        expect(response.body.data.execution.flowId).toBe('exec-test-flow');
      });

      it('should return 404 for non-existent execution', async () => {
        const response = await request(app)
          .get('/api/v1/executions/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('EXECUTION_NOT_FOUND');
      });
    });

    describe('Execution Control', () => {
      let executionId: string;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/v1/flows/exec-test-flow/start')
          .send({
            context: {
              triggeredBy: 'squid:user:test',
              triggerType: 'manual'
            }
          });
        executionId = response.body.data.executionId;

        // Wait a bit for execution to start
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      it('should pause execution', async () => {
        const response = await request(app)
          .post(`/api/v1/executions/${executionId}/pause`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('paused successfully');
      });

      it('should resume execution', async () => {
        // First pause
        await request(app)
          .post(`/api/v1/executions/${executionId}/pause`);

        // Then resume
        const response = await request(app)
          .post(`/api/v1/executions/${executionId}/resume`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('resumed successfully');
      });

      it('should abort execution', async () => {
        const response = await request(app)
          .post(`/api/v1/executions/${executionId}/abort`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('aborted successfully');
      });
    });
  });

  describe('System Endpoints', () => {
    describe('GET /api/v1/system/info', () => {
      it('should return system information', async () => {
        const response = await request(app)
          .get('/api/v1/system/info')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Qflow Serverless Automation Engine');
        expect(response.body.data.version).toBe('0.1.0');
        expect(response.body.data.uptime).toBeGreaterThan(0);
      });
    });

    describe('GET /api/v1/system/metrics', () => {
      it('should return system metrics', async () => {
        const response = await request(app)
          .get('/api/v1/system/metrics')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.flows).toBeDefined();
        expect(response.body.data.executions).toBeDefined();
        expect(response.body.data.system).toBeDefined();
      });
    });

    describe('GET /api/v1/docs', () => {
      it('should return API documentation', async () => {
        const response = await request(app)
          .get('/api/v1/docs')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Qflow REST API');
        expect(response.body.data.endpoints).toBeDefined();
        expect(response.body.data.examples).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/flows')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should include request ID in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/flows')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should set CORS headers on actual requests', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});