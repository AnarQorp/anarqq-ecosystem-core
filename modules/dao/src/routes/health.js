/**
 * Health check routes
 */

import express from 'express';
import { DatabaseManager } from '../storage/database.js';
import { IntegrationService } from '../services/IntegrationService.js';
import { config } from '../config/index.js';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.NODE_ENV,
      mode: config.USE_MOCKS ? 'standalone' : 'integrated'
    };

    // Check database
    const db = new DatabaseManager();
    const dbStats = await db.getStats();
    
    health.dependencies = {
      database: {
        status: dbStats.success ? 'up' : 'down',
        connected: dbStats.connected,
        stats: dbStats.stats,
        lastCheck: new Date().toISOString()
      }
    };

    // Check integrations if not using mocks
    if (!config.USE_MOCKS) {
      const integration = new IntegrationService();
      
      // Test sQuid connection
      try {
        const squidTest = await integration.verifyIdentity('test', 'test-signature');
        health.dependencies.squid = {
          status: squidTest.success ? 'up' : 'down',
          lastCheck: new Date().toISOString()
        };
      } catch (error) {
        health.dependencies.squid = {
          status: 'down',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    } else {
      health.dependencies.mocks = {
        status: 'up',
        message: 'Running in mock mode',
        lastCheck: new Date().toISOString()
      };
    }

    // Determine overall health
    const dependencyStatuses = Object.values(health.dependencies).map(dep => dep.status);
    const hasDown = dependencyStatuses.includes('down');
    const hasDegraded = dependencyStatuses.includes('degraded');

    if (hasDown) {
      health.status = 'unhealthy';
      res.status(503);
    } else if (hasDegraded) {
      health.status = 'degraded';
      res.status(200);
    } else {
      health.status = 'healthy';
      res.status(200);
    }

    res.json(health);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      version: '1.0.0'
    });
  }
});

/**
 * GET /health/ready
 * Readiness check
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    const db = new DatabaseManager();
    const dbStats = await db.getStats();

    if (!dbStats.success || !dbStats.connected) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not ready',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ready'
      }
    });

  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/live
 * Liveness check
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

export default router;