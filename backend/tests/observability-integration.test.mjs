import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import ObservabilityService from '../services/ObservabilityService.mjs';
import TracingService from '../services/TracingService.mjs';
import AlertingService from '../services/AlertingService.mjs';
import { createObservabilityRoutes } from '../routes/observability.mjs';
import { createObservabilityMiddleware } from '../middleware/observability.mjs';

describe('Observability Integration', () => {
  let app;
  let observabilityService;
  let tracingService;
  let alertingService;

  beforeAll(() => {
    // Initialize services
    observabilityService = new ObservabilityService();
    tracingService = new TracingService();
    alertingService = new AlertingService(observabilityService, tracingService);

    // Create Express app
    app = express();
    app.use(express.json());
    
    // Add observability middleware
    app.use(createObservabilityMiddleware(observabilityService, tracingService));
    
    // Add observability routes
    app.use('/api/observability', createObservabilityRoutes(observabilityService, tracingService, alertingService));
    
    // Add a test route
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test endpoint' });
    });
    
    // Add error route for testing
    app.get('/api/error', (req, res) => {
      res.status(500).json({ error: 'Test error' });
    });
  });

  afterAll(() => {
    observabilityService.removeAllListeners();
    alertingService.removeAllListeners();
  });

  describe('Health Endpoints', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/observability/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('slo');
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/observability/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('tracing');
      expect(response.body).toHaveProperty('alerting');
      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('nodeVersion');
      expect(response.body.system).toHaveProperty('platform');
    });
  });

  describe('Metrics Endpoints', () => {
    it('should return metrics in JSON format', async () => {
      // Make a few requests to generate metrics
      await request(app).get('/api/test');
      await request(app).get('/api/test');
      await request(app).get('/api/error');

      const response = await request(app)
        .get('/api/observability/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('requestCount');
      expect(response.body.metrics).toHaveProperty('errorCount');
      expect(response.body.metrics).toHaveProperty('errorRate');
      expect(response.body.metrics.requestCount).toBeGreaterThan(0);
    });

    it('should return metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/api/observability/metrics/prometheus')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('requestCount');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });
  });

  describe('SLO Endpoints', () => {
    it('should return SLO status', async () => {
      const response = await request(app)
        .get('/api/observability/slo')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('slo');
      expect(response.body.data).toHaveProperty('violations');
      expect(response.body.data).toHaveProperty('errorBudget');
    });

    it('should update SLO targets', async () => {
      const newTargets = {
        latency: { p99: 300 }
      };

      const response = await request(app)
        .put('/api/observability/slo/targets')
        .send(newTargets)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.targets.latency.p99).toBe(300);
    });
  });

  describe('Tracing Endpoints', () => {
    it('should return tracing statistics', async () => {
      // Make a request to generate traces
      await request(app).get('/api/test');

      const response = await request(app)
        .get('/api/observability/tracing/stats')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('totalTraces');
      expect(response.body.data).toHaveProperty('totalSpans');
      expect(response.body.data).toHaveProperty('memoryUsage');
    });

    it('should search traces', async () => {
      // Make a request to generate traces
      await request(app).get('/api/test');

      const response = await request(app)
        .get('/api/observability/traces')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('count');
    });

    it('should export traces', async () => {
      const response = await request(app)
        .get('/api/observability/tracing/export?format=jaeger')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.format).toBe('jaeger');
      expect(response.body.data).toHaveProperty('data');
    });
  });

  describe('Alert Endpoints', () => {
    it('should return alert history', async () => {
      const response = await request(app)
        .get('/api/observability/alerts')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('count');
    });

    it('should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/observability/alerts/stats')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('rules');
      expect(response.body.data).toHaveProperty('runbooks');
    });

    it('should trigger test alert', async () => {
      const testAlert = {
        type: 'test',
        data: { message: 'Integration test alert' }
      };

      const response = await request(app)
        .post('/api/observability/alerts/test')
        .send(testAlert)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toContain('Test alert triggered');
    });
  });

  describe('Dependency Management', () => {
    it('should register a new dependency', async () => {
      const dependency = {
        name: 'test-service',
        healthCheckUrl: 'http://localhost:3000/health',
        options: {
          timeout: 5000,
          critical: false
        }
      };

      const response = await request(app)
        .post('/api/observability/dependencies')
        .send(dependency)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toContain('test-service registered');
    });

    it('should return registered dependencies', async () => {
      const response = await request(app)
        .get('/api/observability/dependencies')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data).toBeInstanceOf(Object);
    });

    it('should handle missing dependency registration data', async () => {
      const response = await request(app)
        .post('/api/observability/dependencies')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Name and healthCheckUrl are required');
    });
  });

  describe('Request Tracking', () => {
    it('should track request metrics through middleware', async () => {
      // Get initial metrics
      const initialResponse = await request(app)
        .get('/api/observability/metrics');
      const initialCount = initialResponse.body.metrics.requestCount;

      // Make a test request
      await request(app).get('/api/test');

      // Get updated metrics
      const updatedResponse = await request(app)
        .get('/api/observability/metrics');
      const updatedCount = updatedResponse.body.metrics.requestCount;

      expect(updatedCount).toBeGreaterThan(initialCount);
    });

    it('should track error rates', async () => {
      // Make an error request
      await request(app).get('/api/error');

      const response = await request(app)
        .get('/api/observability/metrics');

      expect(response.body.metrics.errorCount).toBeGreaterThan(0);
      expect(response.body.metrics.errorRate).toBeGreaterThan(0);
    });

    it('should include tracing headers in responses', async () => {
      const response = await request(app)
        .get('/api/test');

      expect(response.headers).toHaveProperty('x-trace-id');
      expect(response.headers).toHaveProperty('x-span-id');
    });
  });

  describe('Metrics Reset', () => {
    it('should reset metrics when requested', async () => {
      // Make some requests to generate metrics
      await request(app).get('/api/test');
      await request(app).get('/api/test');

      // Get metrics before reset to verify they exist
      const beforeResetResponse = await request(app)
        .get('/api/observability/metrics');
      const beforeCount = beforeResetResponse.body.metrics.requestCount;
      expect(beforeCount).toBeGreaterThan(0);

      // Reset metrics
      const resetResponse = await request(app)
        .post('/api/observability/metrics/reset')
        .expect(200);

      expect(resetResponse.body.status).toBe('ok');

      // Check that metrics are reset (the reset request itself will be counted)
      const metricsResponse = await request(app)
        .get('/api/observability/metrics');

      // After reset, we should have only the reset request and this metrics request
      expect(metricsResponse.body.metrics.requestCount).toBeLessThan(beforeCount);
      expect(metricsResponse.body.metrics.errorCount).toBe(0);
    });
  });
});