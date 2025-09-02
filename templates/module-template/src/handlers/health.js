/**
 * Health Check Handlers
 * 
 * Provides health check endpoints for monitoring and load balancing
 */

import express from 'express';
import { metricsCollector } from '../../observability/metrics.js';

const router = express.Router();

/**
 * Basic health check
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      module: '{{MODULE_NAME}}',
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    const dependencies = {};
    
    // Check service dependencies
    const services = req.services;
    
    // Check sQuid service
    try {
      const squidHealth = await services.squid.health();
      dependencies.squid = {
        status: squidHealth.status === 'healthy' ? 'up' : 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        version: squidHealth.version
      };
    } catch (error) {
      dependencies.squid = {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check Qlock service
    try {
      const qlockHealth = await services.qlock.health();
      dependencies.qlock = {
        status: qlockHealth.status === 'healthy' ? 'up' : 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        version: qlockHealth.version
      };
    } catch (error) {
      dependencies.qlock = {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check Qonsent service
    try {
      const qonsentHealth = await services.qonsent.health();
      dependencies.qonsent = {
        status: qonsentHealth.status === 'healthy' ? 'up' : 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        version: qonsentHealth.version
      };
    } catch (error) {
      dependencies.qonsent = {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check Qindex service
    try {
      const qindexHealth = await services.qindex.health();
      dependencies.qindex = {
        status: qindexHealth.status === 'healthy' ? 'up' : 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        version: qindexHealth.version
      };
    } catch (error) {
      dependencies.qindex = {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check Qerberos service
    try {
      const qerberosHealth = await services.qerberos.health();
      dependencies.qerberos = {
        status: qerberosHealth.status === 'healthy' ? 'up' : 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        version: qerberosHealth.version
      };
    } catch (error) {
      dependencies.qerberos = {
        status: 'down',
        latency: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }

    // Check IPFS if available
    if (services.ipfs) {
      try {
        const ipfsHealth = await services.ipfs.health();
        dependencies.ipfs = {
          status: ipfsHealth.status === 'healthy' ? 'up' : 'down',
          latency: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          version: ipfsHealth.version
        };
      } catch (error) {
        dependencies.ipfs = {
          status: 'down',
          latency: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          error: error.message
        };
      }
    }

    // Determine overall health status
    const downServices = Object.values(dependencies).filter(dep => dep.status === 'down');
    const degradedServices = Object.values(dependencies).filter(dep => dep.latency > 1000);
    
    let overallStatus = 'healthy';
    if (downServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    }

    // Get metrics for health report
    const healthMetrics = metricsCollector.getHealthMetrics();

    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      module: '{{MODULE_NAME}}',
      environment: process.env.NODE_ENV || 'development',
      dependencies,
      metrics: {
        uptime: healthMetrics.uptime,
        requestCount: healthMetrics.metrics.http_requests,
        activeUsers: healthMetrics.metrics.active_users,
        errorCount: healthMetrics.metrics.errors,
        externalServices: healthMetrics.metrics.external_services
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage()
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    console.error('Detailed health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      module: '{{MODULE_NAME}}'
    });
  }
});

/**
 * Readiness probe
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are available
    const services = req.services;
    const criticalServices = ['squid', 'qlock', 'qonsent'];
    
    for (const serviceName of criticalServices) {
      const service = services[serviceName];
      if (!service) {
        throw new Error(`Critical service ${serviceName} not available`);
      }
      
      // Quick health check
      try {
        await service.health();
      } catch (error) {
        throw new Error(`Critical service ${serviceName} unhealthy: ${error.message}`);
      }
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      module: '{{MODULE_NAME}}'
    });
  } catch (error) {
    console.error('Readiness check error:', error);
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      module: '{{MODULE_NAME}}'
    });
  }
});

/**
 * Liveness probe
 * GET /health/live
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    module: '{{MODULE_NAME}}',
    uptime: process.uptime()
  });
});

export default router;