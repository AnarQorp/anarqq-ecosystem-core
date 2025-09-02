import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';

import { fileRoutes } from './routes/files.js';
import { healthRoutes } from './routes/health.js';
import { mcpHandler } from './handlers/mcp.js';
import { ServiceManager } from './services/ServiceManager.js';

export class QdriveServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.server = null;
    this.serviceManager = new ServiceManager(config);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow file uploads
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS configuration
    this.app.use(cors({
      origin: this.config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-squid-id', 'x-subid', 'x-sig', 'x-ts']
    }));
    
    // Compression
    this.app.use(compression());
    
    // Request logging
    this.app.use(requestLogger);
    
    // Rate limiting
    this.app.use(rateLimitMiddleware);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);
    
    // MCP endpoint (no auth required for capability discovery)
    this.app.use('/mcp', mcpHandler);
    
    // File routes (auth required)
    this.app.use('/files', authMiddleware, fileRoutes);
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        timestamp: new Date().toISOString()
      });
    });
  } 
 setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Initialize services
      await this.serviceManager.initialize();
      
      // Start HTTP server
      this.server = createServer(this.app);
      
      return new Promise((resolve, reject) => {
        this.server.listen(this.config.port, (error) => {
          if (error) {
            reject(error);
          } else {
            logger.info(`Qdrive server listening on port ${this.config.port}`);
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop() {
    try {
      // Stop HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }
      
      // Shutdown services
      await this.serviceManager.shutdown();
      
      logger.info('Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }

  getApp() {
    return this.app;
  }
}