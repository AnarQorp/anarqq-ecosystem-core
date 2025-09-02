import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ObservabilityService from '../services/ObservabilityService.mjs';
import TracingService from '../services/TracingService.mjs';
import AlertingService from '../services/AlertingService.mjs';
import { createObservabilityMiddleware } from '../middleware/observability.mjs';

describe('ObservabilityService', () => {
  let observabilityService;

  beforeEach(() => {
    observabilityService = new ObservabilityService();
  });

  afterEach(() => {
    observabilityService.removeAllListeners();
  });

  describe('Metrics Collection', () => {
    it('should initialize with default metrics', () => {
      const metrics = observabilityService.getMetrics();
      expect(metrics.metrics.requestCount).toBe(0);
      expect(metrics.metrics.errorCount).toBe(0);
      expect(metrics.metrics.errorRate).toBe(0);
    });

    it('should record request metrics correctly', () => {
      observabilityService.recordRequest(100, 200, '/test', 'GET');
      
      const metrics = observabilityService.getMetrics();
      expect(metrics.metrics.requestCount).toBe(1);
      expect(metrics.metrics.errorCount).toBe(0);
      expect(metrics.metrics.errorRate).toBe(0);
    });

    it('should track error rates correctly', () => {
      observabilityService.recordRequest(100, 200, '/test', 'GET');
      observabilityService.recordRequest(150, 500, '/test', 'POST');
      
      const metrics = observabilityService.getMetrics();
      expect(metrics.metrics.requestCount).toBe(2);
      expect(metrics.metrics.errorCount).toBe(1);
      expect(metrics.metrics.errorRate).toBe(50);
    });

    it('should calculate latency percentiles', () => {
      // Add multiple requests with different latencies
      for (let i = 0; i < 100; i++) {
        observabilityService.recordRequest(i * 10, 200, '/test', 'GET');
      }
      
      const metrics = observabilityService.getMetrics();
      expect(metrics.metrics.p50Latency).toBeGreaterThan(0);
      expect(metrics.metrics.p95Latency).toBeGreaterThan(metrics.metrics.p50Latency);
      expect(metrics.metrics.p99Latency).toBeGreaterThan(metrics.metrics.p95Latency);
    });
  });

  describe('Health Monitoring', () => {
    it('should register dependencies', () => {
      const healthCheck = vi.fn().mockResolvedValue(true);
      observabilityService.registerDependency('test-service', healthCheck);
      
      expect(observabilityService.dependencies.has('test-service')).toBe(true);
    });

    it('should check dependency health', async () => {
      const healthCheck = vi.fn().mockResolvedValue(true);
      observabilityService.registerDependency('test-service', healthCheck);
      
      const dependency = observabilityService.dependencies.get('test-service');
      await observabilityService.checkDependencyHealth(dependency);
      
      expect(healthCheck).toHaveBeenCalled();
      expect(dependency.status).toBe('up');
    });

    it('should handle dependency failures', async () => {
      const healthCheck = vi.fn().mockRejectedValue(new Error('Service down'));
      observabilityService.registerDependency('test-service', healthCheck);
      
      const dependency = observabilityService.dependencies.get('test-service');
      await observabilityService.checkDependencyHealth(dependency);
      
      expect(dependency.status).toBe('down');
      expect(dependency.retryCount).toBe(1);
    });

    it('should return correct health status', () => {
      const health = observabilityService.getHealthStatus();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('dependencies');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('slo');
    });
  });

  describe('SLO Monitoring', () => {
    it('should emit SLO violation for high latency', async () => {
      const violationPromise = new Promise((resolve) => {
        observabilityService.on('slo-violation', resolve);
      });

      // Simulate high latency requests
      for (let i = 0; i < 10; i++) {
        observabilityService.recordRequest(300, 200, '/test', 'GET'); // Above p99 target of 200ms
      }

      const violation = await violationPromise;
      expect(violation.type).toBe('latency');
      expect(violation.severity).toBe('warning');
    });

    it('should emit SLO violation for high error rate', async () => {
      const violationPromise = new Promise((resolve) => {
        observabilityService.on('slo-violation', resolve);
      });

      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        observabilityService.recordRequest(50, 500, '/test', 'GET'); // All errors
      }

      const violation = await violationPromise;
      expect(violation.type).toBe('error-rate');
      expect(violation.severity).toBe('critical');
    });

    it('should update SLO targets', () => {
      const newTargets = {
        latency: { p99: 300 }
      };
      
      observabilityService.updateSLOTargets(newTargets);
      expect(observabilityService.sloTargets.latency.p99).toBe(300);
    });
  });
});

describe('TracingService', () => {
  let tracingService;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    tracingService = new TracingService();
    mockReq = {
      method: 'GET',
      url: '/test',
      path: '/test',
      headers: {}
    };
    mockRes = {
      setHeader: vi.fn()
    };
    mockNext = vi.fn();
  });

  describe('Trace Management', () => {
    it('should start a new trace', () => {
      tracingService.startTrace(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-span-id', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue existing trace', () => {
      const existingTraceId = 'existing-trace-id';
      mockReq.headers['x-trace-id'] = existingTraceId;
      
      tracingService.startTrace(mockReq, mockRes, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', existingTraceId);
    });

    it('should create child spans', () => {
      tracingService.startTrace(mockReq, mockRes, () => {
        const span = tracingService.startSpan('test-operation');
        
        expect(span).toHaveProperty('spanId');
        expect(span).toHaveProperty('finish');
        expect(span).toHaveProperty('setAttributes');
        expect(span).toHaveProperty('addEvent');
      });
    });
  });

  describe('Span Operations', () => {
    it('should add events to spans', () => {
      tracingService.startTrace(mockReq, mockRes, () => {
        tracingService.addEvent('test-event', { key: 'value' });
        
        const context = tracingService.getCurrentContext();
        expect(context.events).toHaveLength(1);
        expect(context.events[0].name).toBe('test-event');
        expect(context.events[0].attributes.key).toBe('value');
      });
    });

    it('should set attributes on spans', () => {
      tracingService.startTrace(mockReq, mockRes, () => {
        tracingService.setAttribute('test.key', 'test-value');
        
        const context = tracingService.getCurrentContext();
        expect(context.attributes['test.key']).toBe('test-value');
      });
    });

    it('should record errors', () => {
      tracingService.startTrace(mockReq, mockRes, () => {
        const error = new Error('Test error');
        tracingService.recordError(error);
        
        const context = tracingService.getCurrentContext();
        expect(context.status).toBe('ERROR');
        expect(context.events.some(e => e.name === 'error')).toBe(true);
      });
    });
  });

  describe('Trace Retrieval', () => {
    it('should retrieve traces by ID', () => {
      let traceId;
      
      tracingService.startTrace(mockReq, mockRes, () => {
        const context = tracingService.getCurrentContext();
        traceId = context.traceId;
        tracingService.finishSpan();
      });
      
      const trace = tracingService.getTrace(traceId);
      expect(trace).toBeTruthy();
      expect(trace.traceId).toBe(traceId);
    });

    it('should search traces by attributes', () => {
      tracingService.startTrace(mockReq, mockRes, () => {
        tracingService.setAttribute('service.name', 'test-service');
        tracingService.finishSpan();
      });
      
      const traces = tracingService.searchTraces({
        attributes: { 'service.name': 'test-service' }
      });
      
      expect(traces).toHaveLength(1);
    });

    it('should get tracing statistics', () => {
      const stats = tracingService.getStats();
      
      expect(stats).toHaveProperty('totalTraces');
      expect(stats).toHaveProperty('activeTraces');
      expect(stats).toHaveProperty('completedTraces');
      expect(stats).toHaveProperty('totalSpans');
    });
  });
});

describe('AlertingService', () => {
  let alertingService;
  let observabilityService;
  let tracingService;

  beforeEach(() => {
    observabilityService = new ObservabilityService();
    tracingService = new TracingService();
    alertingService = new AlertingService(observabilityService, tracingService);
  });

  afterEach(() => {
    alertingService.removeAllListeners();
    observabilityService.removeAllListeners();
  });

  describe('Alert Rules', () => {
    it('should add custom alert rules', () => {
      const rule = {
        condition: (data) => data.value > 100,
        severity: 'warning',
        cooldown: 60000
      };
      
      alertingService.addAlertRule('test-rule', rule);
      expect(alertingService.alertRules.has('test-rule')).toBe(true);
    });

    it('should process alerts based on rules', async () => {
      const alertPromise = new Promise((resolve) => {
        alertingService.on('alert-triggered', resolve);
      });
      
      // Trigger SLO violation
      observabilityService.emit('slo-violation', {
        type: 'latency',
        metric: 'p99',
        value: 300,
        target: 200
      });
      
      const alert = await alertPromise;
      expect(alert.type).toBe('slo-violation');
      expect(alert.severity).toBe('warning');
    });

    it('should respect cooldown periods', async () => {
      let alertCount = 0;
      alertingService.on('alert-triggered', () => alertCount++);
      
      // Add a rule with zero cooldown for testing
      alertingService.addAlertRule('test-cooldown-rule', {
        condition: (data) => data.test === true,
        severity: 'info',
        cooldown: 100, // 100ms cooldown
        channels: []
      });
      
      // Trigger same alert twice quickly
      await alertingService.processAlert('test', { test: true });
      await alertingService.processAlert('test', { test: true });
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(alertCount).toBe(1); // Should only trigger once due to cooldown
    });
  });

  describe('Runbook Execution', () => {
    it('should execute runbooks for alerts', async () => {
      const runbookPromise = new Promise((resolve) => {
        alertingService.on('runbook-executed', resolve);
      });
      
      // Add a simple runbook
      alertingService.addRunbook('test-runbook', {
        steps: [
          { name: 'test-step', type: 'log', message: 'Test message' }
        ]
      });
      
      // Add rule that uses the runbook
      alertingService.addAlertRule('test-rule-with-runbook', {
        condition: (data) => data.test === true,
        severity: 'info',
        cooldown: 0,
        runbook: 'test-runbook'
      });
      
      // Trigger alert
      await alertingService.processAlert('test', { test: true });
      
      const runbookExecution = await runbookPromise;
      expect(runbookExecution.runbook).toBe('test-runbook');
    });
  });

  describe('Alert History', () => {
    it('should maintain alert history', async () => {
      // Add a rule that will match our test alert
      alertingService.addAlertRule('test-history-rule', {
        condition: (data) => data.message === 'Test alert',
        severity: 'info',
        cooldown: 0,
        channels: []
      });
      
      await alertingService.processAlert('test', { message: 'Test alert' });
      
      const history = alertingService.getAlertHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('test');
    });

    it('should provide alert statistics', () => {
      const stats = alertingService.getAlertStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('last24h');
      expect(stats).toHaveProperty('last1h');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('rules');
      expect(stats).toHaveProperty('runbooks');
    });
  });
});

describe('Observability Middleware', () => {
  let observabilityService;
  let tracingService;
  let middleware;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    observabilityService = new ObservabilityService();
    tracingService = new TracingService();
    middleware = createObservabilityMiddleware(observabilityService, tracingService);
    
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json'
      }
    };
    
    mockRes = {
      statusCode: 200,
      setHeader: vi.fn(),
      get: vi.fn().mockReturnValue('application/json'),
      end: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  it('should track request metrics', (done) => {
    // Override res.end to simulate request completion
    const originalEnd = mockRes.end;
    mockRes.end = function(chunk, encoding) {
      originalEnd.call(this, chunk, encoding);
      
      // Check that metrics were recorded
      const metrics = observabilityService.getMetrics();
      expect(metrics.metrics.requestCount).toBe(1);
      done();
    };
    
    middleware(mockReq, mockRes, mockNext);
    
    // Simulate request completion
    setTimeout(() => {
      mockRes.end();
    }, 10);
  });

  it('should start distributed tracing', () => {
    middleware(mockReq, mockRes, mockNext);
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', expect.any(String));
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-span-id', expect.any(String));
    expect(mockNext).toHaveBeenCalled();
  });

  it('should track concurrent requests', () => {
    middleware(mockReq, mockRes, mockNext);
    
    const concurrentRequests = observabilityService.metrics.get('concurrentRequests');
    expect(concurrentRequests).toBe(1);
  });
});