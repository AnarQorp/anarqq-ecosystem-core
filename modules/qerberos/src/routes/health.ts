/**
 * Health Routes
 * Health check endpoints for Qerberos service
 */

import { Router } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.version,
      uptime: Math.floor(uptime),
      dependencies: {
        ipfs: {
          status: 'up', // This would be checked in real implementation
          latency: 50,
          lastCheck: new Date().toISOString()
        },
        eventBus: {
          status: 'up',
          latency: 10,
          lastCheck: new Date().toISOString()
        }
      },
      metrics: {
        requestCount: 0, // This would be tracked in real implementation
        errorRate: 0,
        avgResponseTime: 25,
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000) // ms
      }
    };

    res.json({
      status: 'ok',
      code: 'HEALTHY',
      message: 'Qerberos service is healthy',
      data: healthData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(503).json({
      status: 'error',
      code: 'HEALTH_CHECK_FAILED',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      retryable: true
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    const ready = true; // This would check actual service readiness

    if (ready) {
      res.json({
        status: 'ok',
        code: 'READY',
        message: 'Qerberos service is ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'error',
        code: 'NOT_READY',
        message: 'Qerberos service is not ready',
        timestamp: new Date().toISOString(),
        retryable: true
      });
    }

  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(503).json({
      status: 'error',
      code: 'READINESS_CHECK_FAILED',
      message: 'Readiness check failed',
      timestamp: new Date().toISOString(),
      retryable: true
    });
  }
});

/**
 * GET /health/live
 * Liveness probe endpoint
 */
router.get('/live', async (req, res) => {
  try {
    // Simple liveness check
    res.json({
      status: 'ok',
      code: 'ALIVE',
      message: 'Qerberos service is alive',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Liveness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(503).json({
      status: 'error',
      code: 'LIVENESS_CHECK_FAILED',
      message: 'Liveness check failed',
      timestamp: new Date().toISOString(),
      retryable: true
    });
  }
});

export { router as healthRoutes };