// Load environment variables first
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the root directory
const envPath = path.resolve(process.cwd(), '.env');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

// Now import other dependencies
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

// Import WebSocket service
import { webSocketService } from './services/WebSocketService.mjs';

// Import ecosystem services
import { initializeEcosystemServices } from './ecosystem/index.mjs';

// Import observability services
import ObservabilityService from './services/ObservabilityService.mjs';
import TracingService from './services/TracingService.mjs';
import AlertingService from './services/AlertingService.mjs';
import { 
  createObservabilityMiddleware, 
  createSLOMiddleware, 
  createErrorTrackingMiddleware,
  createDependencyHealthChecks 
} from './middleware/observability.mjs';
import { createObservabilityRoutes } from './routes/observability.mjs';
import { initializeRunbooks } from './config/runbooks.mjs';

// Import routes
import testRoutes from './routes/test.mjs';
import authRoutes from './routes/auth-simple.mjs'; // Using simplified auth routes for testing
// import authRoutes from './routes/auth.mjs'; // Commented out for testing
import squidRoutes from './routes/squid.mjs';
// Temporarily commenting out IPFS routes to isolate the auth route issue
// import ipfsRoutes from './routes/ipfs.mjs';
import qdriveRoutes from './routes/qdrive.mjs';
import qmailRoutes from './routes/qmail.mjs';
import qonsentRoutes from './routes/qonsent.mjs';
import qindexRoutes from './routes/qindex.mjs';
import qchatRoutes from './routes/qchat.mjs';
import qsocialRoutes from './routes/qsocial.mjs';
import qsocialSyncRoutes from './routes/qsocial-sync.mjs';
import qsocialFilesRoutes from './routes/qsocial-files.mjs';
import qmarketRoutes from './routes/qmarket.mjs';
import qwalletRoutes from './routes/qwallet.mjs';
import qwalletIntegrationRoutes from './routes/qwallet-integration.mjs';
import daoRoutes from './routes/dao.mjs';
import notificationRoutes from './routes/notifications.mjs';
import complianceRoutes from './routes/compliance.mjs';
import qflowRoutes from './routes/qflow.mjs';
import serverlessCostControlRoutes from './routes/serverlessCostControl.mjs';
import docsPipelineRoutes from './routes/docs-pipeline.mjs';

// Log loaded environment variables for debugging
console.log('🔧 Loaded environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '*** (set)' : '❌ NOT SET');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);

// Abort startup if JWT secret is not provided
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no definido. Aborta el backend.');
  process.exit(1);
}

// Initialize observability services
const observabilityService = new ObservabilityService();
const tracingService = new TracingService();
const alertingService = new AlertingService(observabilityService, tracingService);

// Initialize runbooks
initializeRunbooks(alertingService);

const app = express();

// Middleware de seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

// CORS configurado para desarrollo
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : [
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Identity-DID', 'X-Signature', 'X-Message']
  })
);

// Middleware para parsear JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Observability middleware (before other middleware)
app.use(createObservabilityMiddleware(observabilityService, tracingService));
app.use(createSLOMiddleware(observabilityService));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Observability routes (before other routes)
app.use('/api/observability', createObservabilityRoutes(observabilityService, tracingService, alertingService));

// Rutas
app.use('/api/test', testRoutes); // Test route without any middleware
app.use('/api/auth', authRoutes);
app.use('/api/squid', squidRoutes);
// Temporarily commenting out IPFS routes to isolate the auth route issue
// app.use('/api/ipfs', ipfsRoutes);
app.use('/api/qmail', qmailRoutes);
app.use('/api/qdrive', qdriveRoutes);
app.use('/api/qonsent', qonsentRoutes);
app.use('/api/qindex', qindexRoutes);
app.use('/api/qchat', qchatRoutes);
app.use('/api/qsocial', qsocialRoutes);
app.use('/api/qsocial/sync', qsocialSyncRoutes);
app.use('/api/qsocial/files', qsocialFilesRoutes);
app.use('/api/qmarket', qmarketRoutes);
app.use('/api/qwallet', qwalletRoutes);
app.use('/api/qwallet-integration', qwalletIntegrationRoutes);
app.use('/api/dao', daoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/qflow', qflowRoutes);
app.use('/api/cost-control', serverlessCostControlRoutes);
app.use('/api/docs-pipeline', docsPipelineRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'AnarQ&Q Backend'
  });
});

// Error tracking middleware (before error handling)
app.use(createErrorTrackingMiddleware(observabilityService, tracingService));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001; // Usar 3001 como puerto por defecto para consistencia

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
webSocketService.initialize(server);

// Register dependency health checks
function registerDependencyHealthChecks() {
  const healthChecks = createDependencyHealthChecks();
  
  // Register IPFS dependency
  observabilityService.registerDependency('ipfs', healthChecks.ipfs, {
    critical: true,
    timeout: 5000,
    maxRetries: 3
  });
  
  // Register Redis dependency (if used)
  if (process.env.REDIS_URL) {
    observabilityService.registerDependency('redis', healthChecks.redis, {
      critical: false,
      timeout: 3000,
      maxRetries: 2
    });
  }
  
  // Register database dependency (if used)
  if (process.env.DATABASE_URL) {
    observabilityService.registerDependency('database', healthChecks.database, {
      critical: true,
      timeout: 5000,
      maxRetries: 3
    });
  }
  
  console.log('✅ Dependency health checks registered');
}

// Initialize ecosystem services
async function startServer() {
  try {
    console.log('🔧 Initializing AnarQ&Q ecosystem services...');
    
    // Register dependency health checks
    registerDependencyHealthChecks();
    
    await initializeEcosystemServices();
    console.log('✅ Ecosystem services initialized successfully');
    
    server.listen(PORT, () => {
      console.log(`🚀 Servidor AnarQ escuchando en puerto ${PORT}`);
      console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 API Base: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
      console.log(`🏗️  Q∞ Architecture: Entry → Process → Output`);
      console.log(`🔐 Ecosystem: Qonsent → Qlock → Storj → IPFS → Qindex → Qerberos → QNET`);
      console.log(`📈 Observability: /api/observability/health`);
      console.log(`📊 Metrics: /api/observability/metrics`);
      console.log(`🔍 Tracing: /api/observability/traces`);
      console.log(`🚨 Alerts: /api/observability/alerts`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize ecosystem services:', error);
    console.log('⚠️  Starting server without full ecosystem integration...');
    
    // Still register health checks in degraded mode
    registerDependencyHealthChecks();
    
    server.listen(PORT, () => {
      console.log(`🚀 Servidor AnarQ escuchando en puerto ${PORT} (degraded mode)`);
      console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 API Base: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
      console.log(`⚠️  Ecosystem services not fully initialized`);
      console.log(`📈 Observability: /api/observability/health (available)`);
    });
  }
}

// Start the server
startServer();
