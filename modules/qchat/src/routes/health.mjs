/**
 * Health Check Routes
 * Provides health status and dependency monitoring
 */

import { Router } from 'express';

const router = Router();

// Mock service health checks for standalone mode
const mockHealthChecks = {
  async checkSQuid() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 50, lastCheck: new Date().toISOString() };
    }
    // Real implementation would check actual sQuid service
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkQlock() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 75, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkQonsent() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 60, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkQindex() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 100, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkQerberos() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 80, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkIPFS() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 120, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  },
  
  async checkRedis() {
    if (process.env.QCHAT_MODE === 'standalone') {
      return { status: 'up', latency: 30, lastCheck: new Date().toISOString() };
    }
    return { status: 'unknown', latency: 0, lastCheck: new Date().toISOString() };
  }
};

// In-memory metrics (in production, this would be from a metrics store)
let metrics = {
  uptime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  activeConnections: 0,
  totalRooms: 0,
  totalMessages: 0
};

// Middleware to track metrics
export const trackMetrics = (req, res, next) => {
  const start = Date.now();
  metrics.requestCount++;
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    metrics.totalResponseTime += responseTime;
    
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
  });
  
  next();
};

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check all dependencies
    const [squidHealth, qlockHealth, qonsentHealth, qindexHealth, qerberosHealth, ipfsHealth, redisHealth] = await Promise.all([
      mockHealthChecks.checkSQuid(),
      mockHealthChecks.checkQlock(),
      mockHealthChecks.checkQonsent(),
      mockHealthChecks.checkQindex(),
      mockHealthChecks.checkQerberos(),
      mockHealthChecks.checkIPFS(),
      mockHealthChecks.checkRedis()
    ]);
    
    const dependencies = {
      squid: squidHealth,
      qlock: qlockHealth,
      qonsent: qonsentHealth,
      qindex: qindexHealth,
      qerberos: qerberosHealth,
      ipfs: ipfsHealth,
      redis: redisHealth
    };
    
    // Determine overall health status
    const criticalServices = ['squid', 'qlock', 'qonsent'];
    const criticalDown = criticalServices.some(service => dependencies[service].status === 'down');
    const anyDown = Object.values(dependencies).some(dep => dep.status === 'down');
    
    let overallStatus = 'healthy';
    if (criticalDown) {
      overallStatus = 'unhealthy';
    } else if (anyDown) {
      overallStatus = 'degraded';
    }
    
    // Calculate metrics
    const uptime = Date.now() - metrics.uptime;
    const avgResponseTime = metrics.requestCount > 0 ? metrics.totalResponseTime / metrics.requestCount : 0;
    const errorRate = metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount) * 100 : 0;
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      mode: process.env.QCHAT_MODE || 'standalone',
      dependencies,
      metrics: {
        uptime: Math.floor(uptime / 1000), // seconds
        requestCount: metrics.requestCount,
        errorRate: Math.round(errorRate * 100) / 100, // percentage
        avgResponseTime: Math.round(avgResponseTime * 100) / 100, // milliseconds
        activeConnections: metrics.activeConnections,
        totalRooms: metrics.totalRooms,
        totalMessages: metrics.totalMessages
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
          external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
        },
        cpu: {
          loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
        }
      },
      checkDuration: Date.now() - startTime
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      error: {
        message: 'Health check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies only
    const [squidHealth, qlockHealth, qonsentHealth] = await Promise.all([
      mockHealthChecks.checkSQuid(),
      mockHealthChecks.checkQlock(),
      mockHealthChecks.checkQonsent()
    ]);
    
    const criticalServices = {
      squid: squidHealth,
      qlock: qlockHealth,
      qonsent: qonsentHealth
    };
    
    const isReady = Object.values(criticalServices).every(service => service.status === 'up');
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        criticalServices
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        criticalServices
      });
    }
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - metrics.uptime) / 1000)
  });
});

/**
 * GET /health/metrics
 * Detailed metrics endpoint
 */
router.get('/metrics', (req, res) => {
  const uptime = Date.now() - metrics.uptime;
  const avgResponseTime = metrics.requestCount > 0 ? metrics.totalResponseTime / metrics.requestCount : 0;
  const errorRate = metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount) * 100 : 0;
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000),
    requests: {
      total: metrics.requestCount,
      errors: metrics.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100
    },
    connections: {
      active: metrics.activeConnections,
      total: metrics.totalConnections || 0
    },
    resources: {
      rooms: metrics.totalRooms,
      messages: metrics.totalMessages
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
      }
    }
  });
});

// Update metrics (called from other parts of the application)
export const updateMetrics = (updates) => {
  Object.assign(metrics, updates);
};

export default router;