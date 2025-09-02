/**
 * Qerberos - Security & Audit Module
 * Main entry point for the Qerberos service
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { config } from './config';
import { auditRoutes } from './routes/audit';
import { riskRoutes } from './routes/risk';
import { anomalyRoutes } from './routes/anomaly';
import { alertRoutes } from './routes/alert';
import { complianceRoutes } from './routes/compliance';
import { healthRoutes } from './routes/health';
import { mcpHandler } from './handlers/mcp';
import { securityHeaders, auditLogger, errorHandler } from '../security/middleware';
import { AuditService } from './services/AuditService';
import { RiskScoringService } from './services/RiskScoringService';
import { AnomalyDetectionService } from './services/AnomalyDetectionService';
import { AlertService } from './services/AlertService';
import { ComplianceService } from './services/ComplianceService';
import { IPFSStorageService } from './services/IPFSStorageService';
import { EventBusService } from './services/EventBusService';

// Load environment variables
dotenv.config();

const app = express();
const port = config.port;

// Initialize services
const ipfsStorage = new IPFSStorageService(config.ipfs);
const eventBus = new EventBusService(config.eventBus);
const auditService = new AuditService(ipfsStorage, eventBus);
const riskScoringService = new RiskScoringService();
const anomalyDetectionService = new AnomalyDetectionService();
const alertService = new AlertService(eventBus);
const complianceService = new ComplianceService(auditService);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-squid-id',
    'x-subid',
    'x-dao-id',
    'x-sig',
    'x-ts',
    'x-api-version',
    'Idempotency-Key'
  ]
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Security middleware
app.use(securityHeaders);
app.use(auditLogger);

// Routes
app.use('/health', healthRoutes);
app.use('/audit', auditRoutes(auditService));
app.use('/risk-score', riskRoutes(riskScoringService));
app.use('/anomaly', anomalyRoutes(anomalyDetectionService));
app.use('/alerts', alertRoutes(alertService));
app.use('/compliance', complianceRoutes(complianceService));

// MCP handler for serverless environments
app.post('/mcp', mcpHandler({
  auditService,
  riskScoringService,
  anomalyDetectionService,
  alertService,
  complianceService
}));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
    retryable: false
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    // Close services
    await eventBus.close();
    await ipfsStorage.close();
    
    logger.info('All services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    // Close services
    await eventBus.close();
    await ipfsStorage.close();
    
    logger.info('All services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await ipfsStorage.initialize();
    await eventBus.initialize();
    
    // Start HTTP server
    app.listen(port, () => {
      logger.info(`Qerberos service started on port ${port}`, {
        environment: config.environment,
        version: config.version,
        nodeVersion: process.version
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { app, startServer };