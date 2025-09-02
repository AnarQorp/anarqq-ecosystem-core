/**
 * Health Routes - Health check endpoints
 */

import express from 'express';

export function createHealthRoutes(qnetService, metrics) {
  const router = express.Router();

  /**
   * GET /health - Service health check
   */
  router.get('/', async (req, res) => {
    try {
      const health = await qnetService.getHealth();
      
      const status = health.status === 'healthy' ? 200 : 503;
      
      res.status(status).json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'QNET service health check',
        data: health,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Health Route] Health check failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /health/detailed - Detailed health information
   */
  router.get('/detailed', async (req, res) => {
    try {
      const health = await qnetService.getHealth();
      const networkStatus = await qnetService.getNetworkStatus({ includeMetrics: true });
      
      const detailedHealth = {
        ...health,
        network: networkStatus.network,
        regions: networkStatus.regions,
        services: networkStatus.services,
        metrics: networkStatus.metrics
      };
      
      const status = health.status === 'healthy' ? 200 : 503;
      
      res.status(status).json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'QNET detailed health check',
        data: detailedHealth,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Health Route] Detailed health check failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'DETAILED_HEALTH_CHECK_FAILED',
        message: 'Detailed health check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /health/ready - Readiness probe
   */
  router.get('/ready', async (req, res) => {
    try {
      const health = await qnetService.getHealth();
      const isReady = health.status === 'healthy' && 
                     health.network.activeNodes > 0;
      
      if (isReady) {
        res.status(200).json({
          status: 'ok',
          code: 'READY',
          message: 'Service is ready',
          data: { ready: true },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'error',
          code: 'NOT_READY',
          message: 'Service is not ready',
          data: { ready: false, reason: 'No active nodes' },
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('[Health Route] Readiness check failed:', error);
      
      res.status(503).json({
        status: 'error',
        code: 'READINESS_CHECK_FAILED',
        message: 'Readiness check failed',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /health/live - Liveness probe
   */
  router.get('/live', (req, res) => {
    // Simple liveness check - service is running
    res.status(200).json({
      status: 'ok',
      code: 'ALIVE',
      message: 'Service is alive',
      data: { alive: true },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}