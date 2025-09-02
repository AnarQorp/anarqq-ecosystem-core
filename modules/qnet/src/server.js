/**
 * QNET HTTP Server
 * 
 * Express server providing HTTP API endpoints for QNET network infrastructure services
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { QNetService } from './services/QNetService.js';
import { getMetricsInstance } from '../observability/metrics.js';
import { 
  authenticateIdentity, 
  authorizePermission, 
  rateLimitByIdentity,
  auditLog,
  securityHeaders 
} from '../security/middleware.js';

// Import route handlers
import { createHealthRoutes } from './routes/health.js';
import { createNodeRoutes } from './routes/nodes.js';
import { createNetworkRoutes } from './routes/network.js';
import { createMetricsRoutes } from './routes/metrics.js';

/**
 * Create and configure QNET server
 */
export function createQNetServer(options = {}) {
  const {
    port = process.env.QNET_PORT || 3014,
    nodeId = process.env.QNET_NODE_ID || 'qnet-default-node',
    region = process.env.QNET_REGION || 'global',
    tier = process.env.QNET_TIER || 'standard',
    mockMode = process.env.QNET_MODE === 'standalone'
  } = options;

  const app = express();
  const qnetService = new QNetService({ nodeId, region, tier, mockMode });
  const metrics = getMetricsInstance();

  // Basic middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security middleware
  app.use(securityHeaders());
  app.use(auditLog(mockMode));

  // Global rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP'
    },
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Request metrics middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      metrics.recordRequest(duration, success, req.path);
    });
    
    next();
  });

  // Mount route handlers
  app.use('/health', createHealthRoutes(qnetService, metrics));
  app.use('/nodes', createNodeRoutes(qnetService, metrics, mockMode));
  app.use('/network', createNetworkRoutes(qnetService, metrics, mockMode));
  app.use('/metrics', createMetricsRoutes(metrics, mockMode));

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      code: 'SUCCESS',
      message: 'QNET Network Infrastructure Service',
      data: {
        service: 'qnet',
        version: '1.0.0',
        nodeId,
        region,
        tier,
        mode: mockMode ? 'standalone' : 'integrated',
        endpoints: {
          health: '/health',
          nodes: '/nodes',
          capabilities: '/capabilities',
          topology: '/topology',
          metrics: '/metrics'
        }
      },
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    });
  });

  // Error handler
  app.use((error, req, res, next) => {
    console.error('[QNET Server] Error:', error);
    
    metrics.recordRequest(0, false, req.path);
    
    res.status(error.status || 500).json({
      status: 'error',
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      timestamp: new Date().toISOString()
    });
  });

  return { app, qnetService, metrics };
}

/**
 * Start QNET server
 */
export async function startQNetServer(options = {}) {
  const { app, qnetService, metrics } = createQNetServer(options);
  const port = options.port || process.env.QNET_PORT || 3014;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, (error) => {
      if (error) {
        reject(error);
        return;
      }

      console.log(`[QNET] Server started on port ${port}`);
      console.log(`[QNET] Node ID: ${qnetService.nodeId}`);
      console.log(`[QNET] Region: ${qnetService.region}`);
      console.log(`[QNET] Mode: ${qnetService.mockMode ? 'standalone' : 'integrated'}`);
      
      resolve({ server, app, qnetService, metrics });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[QNET] Received SIGTERM, shutting down gracefully');
      server.close(() => {
        qnetService.stop();
        metrics.stop();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[QNET] Received SIGINT, shutting down gracefully');
      server.close(() => {
        qnetService.stop();
        metrics.stop();
        process.exit(0);
      });
    });
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startQNetServer().catch(console.error);
}