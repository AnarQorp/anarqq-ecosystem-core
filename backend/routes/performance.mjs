/**
 * Performance Monitoring API Routes
 * Provides endpoints for performance metrics, profiling, and optimization
 */

import express from 'express';
import { performanceServices } from '../middleware/performanceMonitoring.mjs';

const router = express.Router();
const { profiler, cache, metrics, regression, capacity } = performanceServices;

/**
 * GET /performance/metrics
 * Get comprehensive performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
    const metricPattern = req.query.pattern || '.*';

    const data = {
      timestamp: Date.now(),
      timeRange,
      profiler: profiler.getMetrics(),
      cache: cache.getStats(),
      metrics: {
        summary: metrics.getSLOStatus(timeRange),
        insights: metrics.getInsights()
      },
      regression: regression.getRegressionAnalysis(timeRange),
      capacity: capacity.getDashboardData()
    };

    res.json({
      status: 'ok',
      code: 'METRICS_RETRIEVED',
      message: 'Performance metrics retrieved successfully',
      data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'METRICS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/slo
 * Get Service Level Objectives status
 */
router.get('/slo', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000;
    const sloStatus = metrics.getSLOStatus(timeRange);

    res.json({
      status: 'ok',
      code: 'SLO_STATUS_RETRIEVED',
      message: 'SLO status retrieved successfully',
      data: sloStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'SLO_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/bottlenecks
 * Get identified performance bottlenecks
 */
router.get('/bottlenecks', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000;
    const bottlenecks = profiler.getBottlenecks(timeRange);

    res.json({
      status: 'ok',
      code: 'BOTTLENECKS_RETRIEVED',
      message: 'Performance bottlenecks retrieved successfully',
      data: {
        bottlenecks,
        summary: {
          total: bottlenecks.length,
          critical: bottlenecks.filter(b => b.severity >= 8).length,
          high: bottlenecks.filter(b => b.severity >= 6 && b.severity < 8).length,
          medium: bottlenecks.filter(b => b.severity >= 4 && b.severity < 6).length,
          low: bottlenecks.filter(b => b.severity < 4).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'BOTTLENECKS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/cache/stats
 * Get caching performance statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const cacheName = req.query.cache;
    const stats = cache.getStats(cacheName);
    const optimizations = cache.getQueryOptimizations();

    res.json({
      status: 'ok',
      code: 'CACHE_STATS_RETRIEVED',
      message: 'Cache statistics retrieved successfully',
      data: {
        stats,
        optimizations,
        recommendations: optimizations.slice(0, 5) // Top 5 recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CACHE_STATS_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /performance/cache/invalidate
 * Invalidate cache entries
 */
router.post('/cache/invalidate', async (req, res) => {
  try {
    const { cacheName, pattern } = req.body;
    
    if (!cacheName || !pattern) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'cacheName and pattern are required'
      });
    }

    const deletedCount = cache.invalidate(cacheName, pattern);

    res.json({
      status: 'ok',
      code: 'CACHE_INVALIDATED',
      message: `Cache invalidated successfully`,
      data: { deletedCount }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CACHE_INVALIDATION_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /performance/cache/warmup
 * Warm up cache with frequently accessed data
 */
router.post('/cache/warmup', async (req, res) => {
  try {
    const { cacheName, keys, dataLoader } = req.body;
    
    if (!cacheName || !keys || !Array.isArray(keys)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'cacheName and keys array are required'
      });
    }

    // Simple data loader for demo - in production, this would be more sophisticated
    const loader = async (key) => {
      return { key, data: `cached_data_for_${key}`, timestamp: Date.now() };
    };

    const results = await cache.warmup(cacheName, loader, keys);

    res.json({
      status: 'ok',
      code: 'CACHE_WARMED',
      message: 'Cache warmup completed',
      data: { results }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CACHE_WARMUP_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/regression/analysis
 * Get performance regression analysis
 */
router.get('/regression/analysis', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 7 * 24 * 60 * 60 * 1000; // 7 days
    const analysis = regression.getRegressionAnalysis(timeRange);

    res.json({
      status: 'ok',
      code: 'REGRESSION_ANALYSIS_RETRIEVED',
      message: 'Regression analysis retrieved successfully',
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'REGRESSION_ANALYSIS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/trends/:testName
 * Get performance trends for a specific test
 */
router.get('/trends/:testName', async (req, res) => {
  try {
    const { testName } = req.params;
    const timeRange = parseInt(req.query.timeRange) || 30 * 24 * 60 * 60 * 1000; // 30 days
    
    const trends = regression.getPerformanceTrends(testName, timeRange);

    res.json({
      status: 'ok',
      code: 'TRENDS_RETRIEVED',
      message: 'Performance trends retrieved successfully',
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'TRENDS_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /performance/benchmark/run
 * Run a performance benchmark
 */
router.post('/benchmark/run', async (req, res) => {
  try {
    const { name, iterations = 100, timeout = 30000 } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'Benchmark name is required'
      });
    }

    // Add a simple benchmark if it doesn't exist
    if (!regression.benchmarks.has(name)) {
      regression.addBenchmark(name, async () => {
        // Simple CPU-bound task for demonstration
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += Math.random();
        }
        return sum;
      }, { iterations, timeout });
    }

    const result = await regression.runBenchmark(name);

    res.json({
      status: 'ok',
      code: 'BENCHMARK_COMPLETED',
      message: 'Benchmark completed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'BENCHMARK_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/capacity/dashboard
 * Get capacity planning dashboard data
 */
router.get('/capacity/dashboard', async (req, res) => {
  try {
    const dashboard = capacity.getDashboardData();

    res.json({
      status: 'ok',
      code: 'CAPACITY_DASHBOARD_RETRIEVED',
      message: 'Capacity dashboard data retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CAPACITY_DASHBOARD_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/capacity/forecast/:resource
 * Get capacity forecast for a specific resource
 */
router.get('/capacity/forecast/:resource', async (req, res) => {
  try {
    const { resource } = req.params;
    const forecastDays = parseInt(req.query.days) || 30;
    
    const analysis = capacity.analyzeCapacity(resource);
    if (!analysis) {
      return res.status(404).json({
        status: 'error',
        code: 'RESOURCE_NOT_FOUND',
        message: `No capacity data found for resource: ${resource}`
      });
    }

    res.json({
      status: 'ok',
      code: 'CAPACITY_FORECAST_RETRIEVED',
      message: 'Capacity forecast retrieved successfully',
      data: {
        resource,
        forecast: analysis.forecast,
        recommendations: analysis.recommendations,
        scalingNeeds: analysis.scalingNeeds
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CAPACITY_FORECAST_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /performance/capacity/autoscaling-config
 * Generate auto-scaling configuration
 */
router.post('/capacity/autoscaling-config', async (req, res) => {
  try {
    const { resource, targetUtilization = 70 } = req.body;
    
    if (!resource) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_REQUEST',
        message: 'Resource name is required'
      });
    }

    const config = capacity.generateAutoScalingConfig(resource, targetUtilization);

    res.json({
      status: 'ok',
      code: 'AUTOSCALING_CONFIG_GENERATED',
      message: 'Auto-scaling configuration generated successfully',
      data: config
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'AUTOSCALING_CONFIG_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/recommendations
 * Get performance optimization recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = [];
    
    // Collect recommendations from all services
    const metricsInsights = metrics.getInsights();
    recommendations.push(...metricsInsights.recommendations);
    
    const cacheOptimizations = cache.getQueryOptimizations();
    recommendations.push(...cacheOptimizations.map(opt => ({
      type: 'cache_optimization',
      priority: opt.type === 'slow_query' ? 'high' : 'medium',
      title: `Query Optimization: ${opt.type}`,
      description: opt.suggestion,
      metric: opt.query
    })));

    const capacityDashboard = capacity.getDashboardData();
    recommendations.push(...capacityDashboard.recommendations);

    // Sort by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => 
      (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
    );

    res.json({
      status: 'ok',
      code: 'RECOMMENDATIONS_RETRIEVED',
      message: 'Performance recommendations retrieved successfully',
      data: {
        recommendations: recommendations.slice(0, 20), // Top 20
        summary: {
          total: recommendations.length,
          critical: recommendations.filter(r => r.priority === 'critical').length,
          high: recommendations.filter(r => r.priority === 'high').length,
          medium: recommendations.filter(r => r.priority === 'medium').length,
          low: recommendations.filter(r => r.priority === 'low').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'RECOMMENDATIONS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /performance/health
 * Get overall performance health status
 */
router.get('/health', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000;
    
    const sloStatus = metrics.getSLOStatus(timeRange);
    const bottlenecks = profiler.getBottlenecks(timeRange);
    const regressionAnalysis = regression.getRegressionAnalysis(timeRange);
    const capacityDashboard = capacity.getDashboardData();
    
    // Calculate overall health score
    let healthScore = 100;
    
    // Deduct for SLO violations
    if (sloStatus.overall === 'critical') healthScore -= 30;
    else if (sloStatus.overall === 'warning') healthScore -= 15;
    
    // Deduct for bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity >= 8).length;
    healthScore -= criticalBottlenecks * 10;
    
    // Deduct for regressions
    healthScore -= regressionAnalysis.criticalRegressions * 15;
    
    // Deduct for capacity alerts
    healthScore -= capacityDashboard.alerts.length * 5;
    
    healthScore = Math.max(0, healthScore);
    
    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 70) status = 'warning';
    else if (healthScore < 90) status = 'degraded';

    res.json({
      status: 'ok',
      code: 'HEALTH_STATUS_RETRIEVED',
      message: 'Performance health status retrieved successfully',
      data: {
        healthScore,
        status,
        slo: sloStatus,
        bottlenecks: {
          total: bottlenecks.length,
          critical: criticalBottlenecks
        },
        regressions: {
          total: regressionAnalysis.totalRegressions,
          critical: regressionAnalysis.criticalRegressions
        },
        capacity: {
          alerts: capacityDashboard.alerts.length,
          recommendations: capacityDashboard.recommendations.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'HEALTH_STATUS_ERROR',
      message: error.message
    });
  }
});

export default router;