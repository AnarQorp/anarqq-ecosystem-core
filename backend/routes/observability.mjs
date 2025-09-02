import express from 'express';
import { 
  createHealthEndpoint, 
  createMetricsEndpoint, 
  createTracingEndpoints 
} from '../middleware/observability.mjs';

/**
 * Create observability routes
 */
export function createObservabilityRoutes(observabilityService, tracingService, alertingService) {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', createHealthEndpoint(observabilityService));

  // Detailed health check with dependency status
  router.get('/health/detailed', (req, res) => {
    try {
      const health = observabilityService.getHealthStatus();
      const tracingStats = tracingService.getStats();
      const alertStats = alertingService.getAlertStats();

      const detailedHealth = {
        ...health,
        tracing: tracingStats,
        alerting: alertStats,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          environment: process.env.NODE_ENV || 'development'
        }
      };

      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200;
      } else if (health.status === 'unhealthy') {
        statusCode = 503;
      }

      res.status(statusCode).json(detailedHealth);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Detailed health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint
  router.get('/metrics', createMetricsEndpoint(observabilityService));

  // Prometheus-style metrics endpoint
  router.get('/metrics/prometheus', (req, res) => {
    try {
      const metrics = observabilityService.getMetrics();
      let prometheusMetrics = '';

      // Convert metrics to Prometheus format
      for (const [key, value] of Object.entries(metrics.metrics)) {
        if (typeof value === 'number') {
          prometheusMetrics += `# HELP ${key} ${key} metric\n`;
          prometheusMetrics += `# TYPE ${key} gauge\n`;
          prometheusMetrics += `${key} ${value}\n\n`;
        } else if (typeof value === 'object' && value !== null) {
          for (const [subKey, subValue] of Object.entries(value)) {
            if (typeof subValue === 'number') {
              prometheusMetrics += `# HELP ${key}_${subKey} ${key} ${subKey} metric\n`;
              prometheusMetrics += `# TYPE ${key}_${subKey} gauge\n`;
              prometheusMetrics += `${key}_${subKey} ${subValue}\n\n`;
            }
          }
        }
      }

      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Prometheus metrics generation failed',
        error: error.message
      });
    }
  });

  // SLO status endpoint
  router.get('/slo', (req, res) => {
    try {
      const health = observabilityService.getHealthStatus();
      const sloStatus = {
        timestamp: new Date().toISOString(),
        status: health.status,
        slo: health.slo,
        violations: {
          latency: health.slo.latency.p99 > health.slo.latency.targets.p99,
          errorRate: health.slo.availability.errorRate > health.slo.availability.targets.errorBudget
        },
        errorBudget: {
          remaining: Math.max(0, health.slo.availability.targets.errorBudget - health.slo.availability.errorRate),
          consumed: Math.min(100, (health.slo.availability.errorRate / health.slo.availability.targets.errorBudget) * 100)
        }
      };

      res.json({
        status: 'ok',
        data: sloStatus
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'SLO status check failed',
        error: error.message
      });
    }
  });

  // Update SLO targets
  router.put('/slo/targets', (req, res) => {
    try {
      const newTargets = req.body;
      observabilityService.updateSLOTargets(newTargets);
      
      res.json({
        status: 'ok',
        message: 'SLO targets updated',
        targets: observabilityService.sloTargets
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to update SLO targets',
        error: error.message
      });
    }
  });

  // Tracing endpoints
  const tracingEndpoints = createTracingEndpoints(tracingService);
  
  router.get('/traces/:traceId', tracingEndpoints.getTrace);
  router.get('/traces', tracingEndpoints.searchTraces);
  router.get('/tracing/stats', tracingEndpoints.getStats);
  router.get('/tracing/export', tracingEndpoints.exportTraces);

  // Alerting endpoints
  router.get('/alerts', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const alerts = alertingService.getAlertHistory(limit);
      
      res.json({
        status: 'ok',
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve alerts',
        error: error.message
      });
    }
  });

  router.get('/alerts/stats', (req, res) => {
    try {
      const stats = alertingService.getAlertStats();
      
      res.json({
        status: 'ok',
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve alert stats',
        error: error.message
      });
    }
  });

  // Test alert endpoint (for testing purposes)
  router.post('/alerts/test', (req, res) => {
    try {
      const { type, data } = req.body;
      alertingService.processAlert(type || 'test', data || { message: 'Test alert' });
      
      res.json({
        status: 'ok',
        message: 'Test alert triggered'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to trigger test alert',
        error: error.message
      });
    }
  });

  // Dependency registration endpoint
  router.post('/dependencies', (req, res) => {
    try {
      const { name, healthCheckUrl, options } = req.body;
      
      if (!name || !healthCheckUrl) {
        return res.status(400).json({
          status: 'error',
          message: 'Name and healthCheckUrl are required'
        });
      }

      // Create health check function
      const healthCheck = async () => {
        try {
          const response = await fetch(healthCheckUrl, { 
            method: 'HEAD',
            timeout: options?.timeout || 5000 
          });
          return response.ok;
        } catch (error) {
          return false;
        }
      };

      observabilityService.registerDependency(name, healthCheck, options);
      
      res.json({
        status: 'ok',
        message: `Dependency ${name} registered successfully`
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to register dependency',
        error: error.message
      });
    }
  });

  // Get registered dependencies
  router.get('/dependencies', (req, res) => {
    try {
      const dependencies = {};
      for (const [name, dep] of observabilityService.dependencies) {
        dependencies[name] = {
          name: dep.name,
          status: dep.status,
          latency: dep.latency,
          lastCheck: dep.lastCheck,
          critical: dep.critical,
          retryCount: dep.retryCount,
          maxRetries: dep.maxRetries
        };
      }
      
      res.json({
        status: 'ok',
        data: dependencies
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve dependencies',
        error: error.message
      });
    }
  });

  // Manual dependency health check
  router.post('/dependencies/:name/check', async (req, res) => {
    try {
      const { name } = req.params;
      const dependency = observabilityService.dependencies.get(name);
      
      if (!dependency) {
        return res.status(404).json({
          status: 'error',
          message: `Dependency ${name} not found`
        });
      }

      await observabilityService.checkDependencyHealth(dependency);
      
      res.json({
        status: 'ok',
        message: `Health check completed for ${name}`,
        data: {
          name: dependency.name,
          status: dependency.status,
          latency: dependency.latency,
          lastCheck: dependency.lastCheck
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to check dependency health',
        error: error.message
      });
    }
  });

  // Reset metrics (for testing)
  router.post('/metrics/reset', (req, res) => {
    try {
      observabilityService.resetMetrics();
      
      res.json({
        status: 'ok',
        message: 'Metrics reset successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset metrics',
        error: error.message
      });
    }
  });

  return router;
}