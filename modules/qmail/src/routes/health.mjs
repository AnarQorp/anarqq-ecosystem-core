/**
 * Health Check Routes
 * System health and status endpoints
 */

import express from 'express';
import { getServices } from '../services/index.mjs';

const router = express.Router();

/**
 * Basic health check
 */
router.get('/', async (req, res) => {
  try {
    const services = getServices();
    const timestamp = new Date().toISOString();
    
    // Check service dependencies
    const dependencies = {};
    const healthChecks = [];

    // Check each service if it has a health check method
    for (const [name, service] of Object.entries(services)) {
      if (typeof service.healthCheck === 'function') {
        healthChecks.push(
          service.healthCheck()
            .then(result => ({ name, ...result }))
            .catch(error => ({ 
              name, 
              status: 'down', 
              error: error.message,
              lastCheck: timestamp
            }))
        );
      }
    }

    const results = await Promise.all(healthChecks);
    
    // Build dependencies object
    results.forEach(result => {
      dependencies[result.name] = {
        status: result.status === 'healthy' ? 'up' : 'down',
        latency: result.latency || 0,
        lastCheck: result.timestamp || timestamp,
        error: result.error
      };
    });

    // Determine overall health
    const allHealthy = Object.values(dependencies).every(dep => dep.status === 'up');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    // Basic metrics
    const metrics = {
      uptime: process.uptime(),
      requestCount: 0, // Would be tracked in production
      errorRate: 0,
      avgResponseTime: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    const healthResponse = {
      status: overallStatus,
      timestamp,
      version: '1.0.0',
      service: 'qmail',
      mode: process.env.QMAIL_MODE || 'standalone',
      dependencies,
      metrics
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthResponse);

  } catch (error) {
    console.error('[Health Check] Error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'qmail',
      error: error.message,
      dependencies: {},
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
  }
});

/**
 * Detailed health check
 */
router.get('/detailed', async (req, res) => {
  try {
    const services = getServices();
    const timestamp = new Date().toISOString();
    
    // Detailed service checks
    const serviceDetails = {};
    
    for (const [name, service] of Object.entries(services)) {
      try {
        if (typeof service.healthCheck === 'function') {
          const health = await service.healthCheck();
          serviceDetails[name] = {
            status: 'healthy',
            ...health,
            lastCheck: timestamp
          };
        } else {
          serviceDetails[name] = {
            status: 'unknown',
            message: 'No health check available',
            lastCheck: timestamp
          };
        }
      } catch (error) {
        serviceDetails[name] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: timestamp
        };
      }
    }

    // System information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: process.loadavg ? process.loadavg() : null,
      environment: process.env.NODE_ENV || 'development'
    };

    // Configuration info (non-sensitive)
    const configInfo = {
      mode: process.env.QMAIL_MODE || 'standalone',
      port: process.env.PORT || 3000,
      encryptionLevel: process.env.QMAIL_ENCRYPTION_LEVEL || 'STANDARD',
      retentionDays: process.env.QMAIL_RETENTION_DAYS || '730'
    };

    res.json({
      status: 'healthy',
      timestamp,
      version: '1.0.0',
      service: 'qmail',
      system: systemInfo,
      configuration: configInfo,
      services: serviceDetails
    });

  } catch (error) {
    console.error('[Detailed Health Check] Error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Readiness check
 */
router.get('/ready', async (req, res) => {
  try {
    const services = getServices();
    
    // Check if all critical services are ready
    const criticalServices = ['squid', 'qlock', 'qonsent', 'qindex', 'qerberos'];
    const readinessChecks = [];

    for (const serviceName of criticalServices) {
      const service = services[serviceName];
      if (service && typeof service.healthCheck === 'function') {
        readinessChecks.push(
          service.healthCheck()
            .then(result => ({ service: serviceName, ready: result.status === 'healthy' }))
            .catch(() => ({ service: serviceName, ready: false }))
        );
      }
    }

    const results = await Promise.all(readinessChecks);
    const allReady = results.every(result => result.ready);

    if (allReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: results
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        services: results
      });
    }

  } catch (error) {
    console.error('[Readiness Check] Error:', error);
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness check
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;