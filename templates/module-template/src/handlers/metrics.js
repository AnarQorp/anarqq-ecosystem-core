/**
 * Metrics Route Handlers
 * 
 * Provides metrics endpoints for monitoring and observability
 */

import express from 'express';
import { metricsCollector, register } from '../../observability/metrics.js';

const router = express.Router();

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
router.get('/', async (req, res) => {
  try {
    const metrics = await register.metrics();
    
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    
    res.status(500).json({
      status: 'error',
      code: 'METRICS_ERROR',
      message: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * JSON metrics endpoint
 * GET /metrics/json
 */
router.get('/json', async (req, res) => {
  try {
    const metrics = await metricsCollector.getMetricsJSON();
    
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Metrics retrieved successfully',
      data: {
        timestamp: new Date().toISOString(),
        module: '{{MODULE_NAME}}',
        metrics
      }
    });
  } catch (error) {
    console.error('JSON metrics endpoint error:', error);
    
    res.status(500).json({
      status: 'error',
      code: 'METRICS_ERROR',
      message: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health metrics endpoint
 * GET /metrics/health
 */
router.get('/health', async (req, res) => {
  try {
    const healthMetrics = metricsCollector.getHealthMetrics();
    
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'Health metrics retrieved successfully',
      data: healthMetrics
    });
  } catch (error) {
    console.error('Health metrics endpoint error:', error);
    
    res.status(500).json({
      status: 'error',
      code: 'HEALTH_METRICS_ERROR',
      message: 'Failed to retrieve health metrics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;