/**
 * Qwallet Server - Payments & Fees Module
 * 
 * Standalone server for the Qwallet module with multi-chain support,
 * Pi Wallet integration, and comprehensive audit logging.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { QwalletService } from './services/QwalletService.mjs';
import { MockServices } from './mocks/MockServices.mjs';
import { securityHeaders, paymentRateLimit } from '../security/middleware.mjs';
import { createPaymentRoutes } from './routes/payments.mjs';
import { createWalletRoutes } from './routes/wallets.mjs';
import { createMCPHandler } from './handlers/mcp.mjs';
import { EventBus } from './services/EventBus.mjs';
import { HealthService } from './services/HealthService.mjs';

const app = express();
const PORT = process.env.PORT || 3000;
const MODE = process.env.QWALLET_MODE || 'standalone';

// Global middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(securityHeaders);
app.use(paymentRateLimit);

// Initialize services
let qwalletService;
let mockServices;
let eventBus;
let healthService;

async function initializeServices() {
  try {
    console.log(`[Qwallet] Initializing in ${MODE} mode...`);

    // Initialize event bus
    eventBus = new EventBus({
      mode: MODE,
      topics: [
        'q.qwallet.intent.created.v1',
        'q.qwallet.tx.signed.v1',
        'q.qwallet.tx.settled.v1',
        'q.qwallet.limit.exceeded.v1',
        'q.qwallet.balance.updated.v1',
        'q.qwallet.fee.calculated.v1',
        'q.qwallet.error.v1'
      ]
    });

    // Initialize mock services if in standalone mode
    if (MODE === 'standalone' || process.env.QWALLET_MOCK_SERVICES === 'true') {
      mockServices = new MockServices();
      await mockServices.initialize();
      console.log('[Qwallet] Mock services initialized');
    }

    // Initialize main Qwallet service
    qwalletService = new QwalletService({
      mode: MODE,
      eventBus,
      mockServices,
      config: {
        piNetworkEnabled: process.env.QWALLET_PI_NETWORK_ENABLED === 'true',
        defaultCurrency: process.env.QWALLET_DEFAULT_CURRENCY || 'QToken',
        maxTransactionAmount: parseFloat(process.env.QWALLET_MAX_TRANSACTION_AMOUNT) || 10000,
        feeCalculationMode: process.env.QWALLET_FEE_CALCULATION_MODE || 'dynamic',
        dailyLimit: parseFloat(process.env.QWALLET_DAILY_LIMIT) || 1000,
        monthlyLimit: parseFloat(process.env.QWALLET_MONTHLY_LIMIT) || 10000,
        daoLimit: parseFloat(process.env.QWALLET_DAO_LIMIT) || 50000
      }
    });

    await qwalletService.initialize();
    console.log('[Qwallet] Main service initialized');

    // Initialize health service
    healthService = new HealthService({
      services: {
        qwallet: qwalletService,
        eventBus,
        mockServices
      },
      dependencies: MODE === 'standalone' ? [] : [
        { name: 'squid', url: process.env.SQUID_SERVICE_URL },
        { name: 'qonsent', url: process.env.QONSENT_SERVICE_URL },
        { name: 'qlock', url: process.env.QLOCK_SERVICE_URL },
        { name: 'qindex', url: process.env.QINDEX_SERVICE_URL },
        { name: 'qerberos', url: process.env.QERBEROS_SERVICE_URL }
      ]
    });

    console.log('[Qwallet] All services initialized successfully');
  } catch (error) {
    console.error('[Qwallet] Service initialization failed:', error);
    process.exit(1);
  }
}

// Routes
app.get('/health', async (req, res) => {
  try {
    const health = await healthService.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.get('/health/ready', async (req, res) => {
  try {
    const ready = await healthService.isReady();
    res.status(ready ? 200 : 503).json({ ready });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true, timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/payments', createPaymentRoutes(qwalletService));
app.use('/api/wallets', createWalletRoutes(qwalletService));

// MCP Handler
app.post('/mcp', createMCPHandler(qwalletService));

// OpenAPI specification
app.get('/openapi.yaml', (req, res) => {
  res.sendFile('openapi.yaml', { root: '.' });
});

app.get('/openapi.json', async (req, res) => {
  try {
    const yaml = await import('yaml');
    const fs = await import('fs/promises');
    const spec = await fs.readFile('./openapi.yaml', 'utf8');
    const json = yaml.parse(spec);
    res.json(json);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
});

// MCP configuration
app.get('/mcp.json', (req, res) => {
  res.sendFile('mcp.json', { root: '.' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Qwallet] Unhandled error:', error);
  
  res.status(error.status || 500).json({
    status: 'error',
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: req.id || crypto.randomUUID()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Qwallet] Received SIGTERM, shutting down gracefully...');
  
  try {
    if (qwalletService) {
      await qwalletService.shutdown();
    }
    if (eventBus) {
      await eventBus.shutdown();
    }
    if (mockServices) {
      await mockServices.shutdown();
    }
    
    console.log('[Qwallet] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Qwallet] Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('[Qwallet] Received SIGINT, shutting down gracefully...');
  
  try {
    if (qwalletService) {
      await qwalletService.shutdown();
    }
    if (eventBus) {
      await eventBus.shutdown();
    }
    if (mockServices) {
      await mockServices.shutdown();
    }
    
    console.log('[Qwallet] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Qwallet] Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, () => {
      console.log(`[Qwallet] Server running on port ${PORT} in ${MODE} mode`);
      console.log(`[Qwallet] Health check: http://localhost:${PORT}/health`);
      console.log(`[Qwallet] OpenAPI spec: http://localhost:${PORT}/openapi.yaml`);
      console.log(`[Qwallet] MCP config: http://localhost:${PORT}/mcp.json`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('[Qwallet] Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('[Qwallet] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };