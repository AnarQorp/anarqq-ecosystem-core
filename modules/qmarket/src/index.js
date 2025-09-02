/**
 * Qmarket - Content Marketplace Module
 * 
 * Main entry point for the Qmarket standalone module.
 * Provides HTTP API and MCP tools for marketplace operations.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import services and middleware
import { QmarketService } from './services/QmarketService.js';
import { LicenseService } from './services/LicenseService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { MCPServer } from './mcp/MCPServer.js';

// Import routes
import { createListingRoutes } from './routes/listings.js';
import { createPurchaseRoutes } from './routes/purchases.js';
import { createLicenseRoutes } from './routes/licenses.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createHealthRoutes } from './routes/health.js';

// Import middleware
import { 
  squidAuth, 
  securityHeaders, 
  correlationId, 
  auditLogger 
} from '../security/middleware.js';

// Configuration
const PORT = process.env.PORT || 3008;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Initialize and configure the Express application
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Squid-ID',
      'X-SubID',
      'X-Sig',
      'X-TS',
      'X-API-Version',
      'X-Correlation-ID'
    ]
  }));

  // Basic middleware
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Custom middleware
  app.use(securityHeaders);
  app.use(correlationId);
  app.use(auditLogger);

  // Health check (no auth required)
  app.use('/health', createHealthRoutes());

  // API routes (with authentication)
  app.use('/api/listings', squidAuth, createListingRoutes());
  app.use('/api/purchases', squidAuth, createPurchaseRoutes());
  app.use('/api/licenses', squidAuth, createLicenseRoutes());
  app.use('/api/analytics', squidAuth, createAnalyticsRoutes());

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Qmarket',
      version: '1.0.0',
      description: 'Content Marketplace Module for AnarQ&Q Ecosystem',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        api: '/api',
        mcp: '/mcp'
      },
      documentation: {
        openapi: '/openapi.yaml',
        mcp: '/mcp.json'
      }
    });
  });

  // Serve OpenAPI specification
  app.get('/openapi.yaml', (req, res) => {
    res.sendFile('openapi.yaml', { root: '.' });
  });

  // Serve MCP configuration
  app.get('/mcp.json', (req, res) => {
    res.sendFile('mcp.json', { root: '.' });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('[Qmarket] Error:', err);
    
    const isDevelopment = NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      ...(isDevelopment && { stack: err.stack })
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  });

  return app;
}

/**
 * Initialize services
 */
async function initializeServices() {
  console.log('[Qmarket] Initializing services...');

  // Initialize core services
  const qmarketService = new QmarketService({
    sandboxMode: NODE_ENV === 'development'
  });

  const licenseService = new LicenseService({
    qmarketService
  });

  const analyticsService = new AnalyticsService({
    qmarketService
  });

  // Store services globally for route access
  global.qmarketService = qmarketService;
  global.licenseService = licenseService;
  global.analyticsService = analyticsService;

  console.log('[Qmarket] Services initialized successfully');
  return { qmarketService, licenseService, analyticsService };
}

/**
 * Initialize MCP server
 */
async function initializeMCPServer(httpServer) {
  console.log('[Qmarket] Initializing MCP server...');

  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/mcp'
  });

  const mcpServer = new MCPServer({
    qmarketService: global.qmarketService,
    licenseService: global.licenseService,
    analyticsService: global.analyticsService
  });

  wss.on('connection', (ws, req) => {
    console.log('[Qmarket] MCP client connected:', req.socket.remoteAddress);
    mcpServer.handleConnection(ws);
  });

  console.log('[Qmarket] MCP server initialized');
  return mcpServer;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('[Qmarket] Starting Qmarket module...');
    console.log(`[Qmarket] Environment: ${NODE_ENV}`);
    console.log(`[Qmarket] Port: ${PORT}`);

    // Initialize services
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = createServer(app);

    // Initialize MCP server
    await initializeMCPServer(server);

    // Start listening
    server.listen(PORT, () => {
      console.log(`[Qmarket] Server running on port ${PORT}`);
      console.log(`[Qmarket] HTTP API: http://localhost:${PORT}/api`);
      console.log(`[Qmarket] MCP WebSocket: ws://localhost:${PORT}/mcp`);
      console.log(`[Qmarket] Health check: http://localhost:${PORT}/health`);
      console.log(`[Qmarket] OpenAPI spec: http://localhost:${PORT}/openapi.yaml`);
      console.log(`[Qmarket] MCP config: http://localhost:${PORT}/mcp.json`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Qmarket] Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('[Qmarket] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[Qmarket] Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('[Qmarket] Server closed');
        process.exit(0);
      });
    });

    return server;

  } catch (error) {
    console.error('[Qmarket] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createApp, startServer, initializeServices };