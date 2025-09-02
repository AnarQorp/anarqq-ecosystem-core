import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'qdrive'
    };

    // Add basic system info
    health.uptime = process.uptime();
    health.memory = process.memoryUsage();

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export { router as healthRoutes };