/**
 * Qlock Module - Main Entry Point
 * 
 * Provides encryption, signatures, time-locks, and distributed mutex services
 * for the Q ecosystem with post-quantum cryptographic support.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

// Import services
import { EncryptionService } from './services/EncryptionService.js';
import { SignatureService } from './services/SignatureService.js';
import { LockService } from './services/LockService.js';
import { KeyManagementService } from './services/KeyManagementService.js';
import { EventService } from './services/EventService.js';
import { AuditService } from './services/AuditService.js';

// Import handlers
import { createEncryptionHandlers } from './handlers/encryptionHandlers.js';
import { createSignatureHandlers } from './handlers/signatureHandlers.js';
import { createLockHandlers } from './handlers/lockHandlers.js';
import { createMCPHandlers } from './handlers/mcpHandlers.js';

// Import middleware
import { 
  authenticate, 
  authorize, 
  rateLimit, 
  auditLog, 
  errorHandler,
  securityHeaders 
} from '../security/middleware.js';

// Import mocks for standalone mode
import { MockKMSService } from './mocks/MockKMSService.js';
import { MockHSMService } from './mocks/MockHSMService.js';
import { MockSquidService } from './mocks/MockSquidService.js';
import { MockQonsentService } from './mocks/MockQonsentService.js';

class QlockModule {
  constructor(options = {}) {
    this.options = {
      port: process.env.PORT || 3000,
      mode: process.env.QLOCK_MODE || 'standalone',
      kmsEndpoint: process.env.QLOCK_KMS_ENDPOINT,
      hsmEnabled: process.env.QLOCK_HSM_ENABLED === 'true',
      pqcEnabled: process.env.QLOCK_PQC_ENABLED === 'true',
      auditEnabled: process.env.QLOCK_AUDIT_ENABLED === 'true',
      ...options
    };

    this.app = express();
    this.server = null;
    this.services = {};
  }

  async initialize() {
    console.log('[Qlock] Initializing module...');
    
    // Initialize services
    await this.initializeServices();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    // Setup error handling
    this.setupErrorHandling();
    
    console.log(`[Qlock] Module initialized in ${this.options.mode} mode`);
  }

  async initializeServices() {
    console.log('[Qlock] Initializing services...');

    // Initialize mock services for standalone mode
    if (this.options.mode === 'standalone') {
      this.services.kms = new MockKMSService();
      this.services.hsm = new MockHSMService();
      this.services.squid = new MockSquidService();
      this.services.qonsent = new MockQonsentService();
    } else {
      // TODO: Initialize real services for integrated mode
      throw new Error('Integrated mode not yet implemented');
    }

    // Initialize core services
    this.services.keyManagement = new KeyManagementService({
      kms: this.services.kms,
      hsm: this.services.hsm,
      pqcEnabled: this.options.pqcEnabled
    });

    this.services.encryption = new EncryptionService({
      keyManagement: this.services.keyManagement,
      pqcEnabled: this.options.pqcEnabled
    });

    this.services.signature = new SignatureService({
      keyManagement: this.services.keyManagement,
      pqcEnabled: this.options.pqcEnabled
    });

    this.services.lock = new LockService({
      redis: null // Will be initialized with Redis connection
    });

    this.services.event = new EventService({
      mode: this.options.mode
    });

    this.services.audit = new AuditService({
      enabled: this.options.auditEnabled,
      eventService: this.services.event
    });

    // Initialize all services
    await Promise.all([
      this.services.keyManagement.initialize(),
      this.services.encryption.initialize(),
      this.services.signature.initialize(),
      this.services.lock.initialize(),
      this.services.event.initialize(),
      this.services.audit.initialize()
    ]);

    console.log('[Qlock] All services initialized');
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(securityHeaders);
    
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 60000, // 1 minute
      maxRequests: 100
    }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        code: 'HEALTHY',
        message: 'Qlock service is healthy',
        data: {
          mode: this.options.mode,
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          services: {
            encryption: 'healthy',
            signature: 'healthy',
            lock: 'healthy',
            keyManagement: 'healthy'
          }
        }
      });
    });

    // API routes with authentication and authorization
    const apiRouter = express.Router();
    
    // Apply authentication to all API routes
    apiRouter.use(authenticate);
    
    // Encryption endpoints
    const encryptionHandlers = createEncryptionHandlers(this.services);
    apiRouter.post('/encrypt', 
      authorize('qlock:encrypt'),
      auditLog('encrypt'),
      encryptionHandlers.encrypt
    );
    apiRouter.post('/decrypt', 
      authorize('qlock:decrypt'),
      auditLog('decrypt'),
      encryptionHandlers.decrypt
    );

    // Signature endpoints
    const signatureHandlers = createSignatureHandlers(this.services);
    apiRouter.post('/sign', 
      authorize('qlock:sign'),
      auditLog('sign'),
      signatureHandlers.sign
    );
    apiRouter.post('/verify', 
      authorize('qlock:verify'),
      auditLog('verify'),
      signatureHandlers.verify
    );

    // Lock endpoints
    const lockHandlers = createLockHandlers(this.services);
    apiRouter.post('/lock', 
      authorize('qlock:lock'),
      auditLog('lock'),
      lockHandlers.acquireLock
    );
    apiRouter.delete('/lock/:lockId', 
      authorize('qlock:lock'),
      auditLog('unlock'),
      lockHandlers.releaseLock
    );
    apiRouter.put('/lock/:lockId/extend', 
      authorize('qlock:lock'),
      auditLog('extend-lock'),
      lockHandlers.extendLock
    );
    apiRouter.get('/lock/:lockId/status', 
      authorize('qlock:lock'),
      auditLog('lock-status'),
      lockHandlers.getLockStatus
    );

    // MCP endpoints
    const mcpHandlers = createMCPHandlers(this.services);
    apiRouter.post('/mcp/:tool', 
      auditLog('mcp'),
      mcpHandlers.handleMCPCall
    );

    // Mount API router
    this.app.use('/api/v1', apiRouter);
    this.app.use('/', apiRouter); // Also mount at root for compatibility
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Endpoint not found'
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app);
      
      this.server.listen(this.options.port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[Qlock] Server listening on port ${this.options.port}`);
          console.log(`[Qlock] Mode: ${this.options.mode}`);
          console.log(`[Qlock] PQC Enabled: ${this.options.pqcEnabled}`);
          console.log(`[Qlock] HSM Enabled: ${this.options.hsmEnabled}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('[Qlock] Server stopped');
          resolve();
        });
      });
    }
  }

  // Expose services for testing
  getServices() {
    return this.services;
  }
}

export { QlockModule };
export default QlockModule;