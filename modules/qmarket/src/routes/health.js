/**
 * Health Check Routes
 * 
 * Health monitoring endpoints for the Qmarket module.
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const health = await global.qmarketService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with service dependencies
 */
router.get('/detailed', async (req, res) => {
  try {
    const health = await global.qmarketService.healthCheck();
    
    // Add additional health metrics
    const detailedHealth = {
      ...health,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all required services are available
    const health = await global.qmarketService.healthCheck();
    
    const isReady = health.status === 'healthy' && 
                   health.services && 
                   Object.values(health.services).every(status => 
                     status === 'healthy' || status === 'mock'
                   );
    
    if (isReady) {
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Service dependencies not healthy'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export function createHealthRoutes() {
  return router;
}