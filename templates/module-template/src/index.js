/**
 * {{MODULE_NAME}} - Main Entry Point
 * 
 * Q Ecosystem Module following standardized architecture
 * for independence and interoperability.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Security middleware
import {
  authenticate,
  authorize,
  createRateLimiter,
  securityHeaders,
  securityErrorHandler
} from '../security/middleware.js';

// Metrics and monitoring
import {
  metricsCollector,
  createMetricsMiddleware
} from '../observability/metrics.js';

// Route handlers
import healthRoutes from './handlers/health.js';
import apiRoutes from './handlers/api.js';
import metricsRoutes from './handlers/metrics.js';

// Services
import { ServiceManager } from './services/ServiceManager.js';
import { MockServiceManager } from './mocks/MockServiceManager.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MOCK_SERVICES = process.env.MOCK_SERVICES || 'all';

/**
 * Initialize Services
 */
let serviceManager;

if (MOCK_SERVICES === 'all' || NODE_ENV === 'test') {
  console.log('🔧 Initializing with mock services');
  serviceManager = new MockServiceManager();
} else if (MOCK_SERVICES === 'none') {
  console.log('🌐 Initializing with real services');
  serviceManager = new ServiceManager();
} else {
  console.log(`🔀 Initializing with selective mocks: ${MOCK_SERVICES}`);
  serviceManager = new ServiceManager({
    mockServices: MOCK_SERVICES.split(',')
  });
}

/**
 * Middleware Setup
 */

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Security headers
app.use(securityHeaders);

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-squid-id',
    'x-subid',
    'x-qonsent',
    'x-sig',
    'x-ts',
    'x-api-version'
  ]
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Metrics collection middleware
app.use(createMetricsMiddleware(metricsCollector));

// Rate limiting
app.use(createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
}));

// Attach services to request
app.use((req, res, next) => {
  req.services = serviceManager;
  next();
});

/**
 * Routes
 */

// Health check routes (no authentication required)
app.use('/health', healthRoutes);

// Metrics routes (no authentication required)
app.use('/metrics', metricsRoutes);

// API routes (authentication required)
app.use('/api/v1', authenticate, apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// Error handling middleware
app.use(securityErrorHandler);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Record error metric
  metricsCollector.recordError('unhandled', err.code || 'UNKNOWN', 'high');
  
  const isDevelopment = NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

/**
 * Server Startup
 */
async function startServer() {
  try {
    // Initialize services
    console.log('🚀 Initializing services...');
    await serviceManager.initialize();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`✅ {{MODULE_NAME}} server running on port ${PORT}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🔧 Mock services: ${MOCK_SERVICES}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
      
      // Record startup metric
      metricsCollector.recordModuleOperation('startup', 'success');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('📡 HTTP server closed');
        
        try {
          await serviceManager.shutdown();
          console.log('🔌 Services disconnected');
          
          metricsCollector.recordModuleOperation('shutdown', 'success');
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          metricsCollector.recordModuleOperation('shutdown', 'error');
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⏰ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      metricsCollector.recordError('uncaught_exception', 'UNCAUGHT_EXCEPTION', 'critical');
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      metricsCollector.recordError('unhandled_rejection', 'UNHANDLED_REJECTION', 'critical');
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    metricsCollector.recordError('startup', 'STARTUP_FAILED', 'critical');
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };