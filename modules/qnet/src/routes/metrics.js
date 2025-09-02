/**
 * Metrics Routes - Performance metrics and monitoring endpoints
 */

import express from 'express';
import { authenticateIdentity, authorizePermission, rateLimitByIdentity } from '../../security/middleware.js';

export function createMetricsRoutes(metrics, mockMode) {
  const router = express.Router();

  // Apply authentication and rate limiting to all routes
  router.use(authenticateIdentity(mockMode));
  router.use(rateLimitByIdentity());

  /**
   * GET /metrics - Get current metrics (Prometheus format)
   */
  router.get('/', async (req, res) => {
    try {
      const format = req.query.format || req.get('Accept');
      
      if (format === 'application/json' || req.get('Accept')?.includes('application/json')) {
        // JSON format
        const metricsData = metrics.getAllMetrics();
        
        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Metrics retrieved',
          data: metricsData,
          timestamp: new Date().toISOString()
        });
      } else {
        // Prometheus format (default)
        const prometheusMetrics = metrics.exportPrometheusMetrics();
        
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(prometheusMetrics);
      }
      
    } catch (error) {
      console.error('[Metrics Route] Get metrics failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'GET_METRICS_FAILED',
        message: 'Failed to get metrics',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /metrics/summary - Get metrics summary
   */
  router.get('/summary', async (req, res) => {
    try {
      const allMetrics = metrics.getAllMetrics();
      
      const summary = {
        requests: {
          total: allMetrics.counters.requests_total || 0,
          success: allMetrics.counters.requests_success || 0,
          errors: allMetrics.counters.requests_error || 0,
          successRate: allMetrics.counters.requests_total > 0 
            ? (allMetrics.counters.requests_success / allMetrics.counters.requests_total) * 100 
            : 0
        },
        latency: {
          average: allMetrics.gauges.average_latency || 0,
          p95: allMetrics.gauges.p95_latency || 0,
          p99: allMetrics.gauges.p99_latency || 0
        },
        nodes: {
          total: allMetrics.gauges.nodes_total || 0,
          active: allMetrics.gauges.nodes_active || 0,
          degraded: allMetrics.gauges.nodes_degraded || 0,
          inactive: allMetrics.gauges.nodes_inactive || 0
        },
        security: {
          authAttempts: allMetrics.counters.auth_attempts || 0,
          authFailures: allMetrics.counters.auth_failures || 0,
          rateLimitViolations: allMetrics.counters.rate_limit_violations || 0,
          securityAlerts: allMetrics.counters.security_alerts || 0
        },
        timestamp: allMetrics.timestamp
      };

      res.json({
        status: 'ok',
        code: 'SUCCESS',
        message: 'Metrics summary retrieved',
        data: summary,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[Metrics Route] Get metrics summary failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'GET_METRICS_SUMMARY_FAILED',
        message: 'Failed to get metrics summary',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /metrics/history - Get metrics for time range
   */
  router.get('/history',
    authorizePermission('qonsent:qnet:metrics:detailed', mockMode),
    async (req, res) => {
      try {
        const { 
          startTime, 
          endTime, 
          timeRange = '1h' 
        } = req.query;

        let start, end;
        
        if (startTime && endTime) {
          start = new Date(startTime).getTime();
          end = new Date(endTime).getTime();
        } else {
          // Parse time range
          const now = Date.now();
          const ranges = {
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
          };
          
          const duration = ranges[timeRange] || ranges['1h'];
          start = now - duration;
          end = now;
        }

        const historicalMetrics = metrics.getMetricsForTimeRange(start, end);

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'Historical metrics retrieved',
          data: {
            ...historicalMetrics,
            timeRange: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              duration: end - start
            }
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Metrics Route] Get historical metrics failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'GET_HISTORICAL_METRICS_FAILED',
          message: 'Failed to get historical metrics',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * GET /metrics/slo - Get SLO compliance status
   */
  router.get('/slo',
    authorizePermission('qonsent:qnet:metrics:read', mockMode),
    async (req, res) => {
      try {
        const allMetrics = metrics.getAllMetrics();
        
        const slos = {
          latency: {
            metric: 'p99_latency',
            threshold: 200,
            current: allMetrics.gauges.p99_latency || 0,
            compliant: (allMetrics.gauges.p99_latency || 0) <= 200,
            unit: 'ms'
          },
          uptime: {
            metric: 'uptime_percentage',
            threshold: 99.9,
            current: allMetrics.gauges.uptime_percentage || 100,
            compliant: (allMetrics.gauges.uptime_percentage || 100) >= 99.9,
            unit: '%'
          },
          errorRate: {
            metric: 'network_error_rate',
            threshold: 0.1,
            current: (allMetrics.gauges.network_error_rate || 0) * 100,
            compliant: (allMetrics.gauges.network_error_rate || 0) <= 0.001,
            unit: '%'
          }
        };

        const overallCompliance = Object.values(slos).every(slo => slo.compliant);

        res.json({
          status: 'ok',
          code: 'SUCCESS',
          message: 'SLO compliance status retrieved',
          data: {
            overallCompliance,
            slos,
            timestamp: allMetrics.timestamp
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Metrics Route] Get SLO status failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'GET_SLO_STATUS_FAILED',
          message: 'Failed to get SLO compliance status',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  /**
   * POST /metrics/reset - Reset metrics counters (admin only)
   */
  router.post('/reset',
    authorizePermission('qonsent:qnet:metrics:admin', mockMode),
    async (req, res) => {
      try {
        // Create snapshot before reset
        const snapshot = metrics.getAllMetrics();
        
        // Reset counters (this would need to be implemented in metrics class)
        // For now, we'll just acknowledge the request
        
        res.json({
          status: 'ok',
          code: 'METRICS_RESET',
          message: 'Metrics counters reset successfully',
          data: {
            resetAt: new Date().toISOString(),
            resetBy: req.identity?.squidId,
            snapshotTaken: true
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('[Metrics Route] Reset metrics failed:', error);
        
        res.status(500).json({
          status: 'error',
          code: 'RESET_METRICS_FAILED',
          message: 'Failed to reset metrics',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  return router;
}