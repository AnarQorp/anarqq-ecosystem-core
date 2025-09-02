/**
 * Express server for Qindex module
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { config } from './config/index.js';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { validateRequest } from './middleware/validation.js';

const logger = createLogger('Server');

export function createServer(qindexCore) {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Identity-ID'],
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.security.rateLimitWindow,
    max: config.security.rateLimitMax,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.security.rateLimitWindow / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Body parsing and compression
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check endpoint (before other routes)
  app.get('/health', async (req, res) => {
    try {
      const health = await qindexCore.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // API documentation endpoint
  app.get('/docs', (req, res) => {
    res.json({
      name: 'Qindex API',
      version: config.version,
      description: 'Indexing & Pointers Module for Q Ecosystem',
      mode: config.mode,
      endpoints: {
        health: '/health',
        put: 'POST /qindex/put',
        get: 'GET /qindex/get/:key',
        list: 'GET /qindex/list',
        history: 'GET /qindex/history/:key',
        delete: 'DELETE /qindex/delete/:key'
      },
      documentation: {
        openapi: '/openapi.yaml',
        mcp: '/mcp.json'
      }
    });
  });

  // Serve OpenAPI spec
  app.get('/openapi.yaml', (req, res) => {
    res.sendFile('openapi.yaml', { root: '.' });
  });

  // Serve MCP spec
  app.get('/mcp.json', (req, res) => {
    res.sendFile('mcp.json', { root: '.' });
  });

  // API routes
  app.use('/qindex', createRoutes(qindexCore));

  // MCP tools endpoint
  app.post('/mcp/tools/:toolName', async (req, res) => {
    try {
      const { toolName } = req.params;
      const { arguments: args } = req.body;

      let result;
      switch (toolName) {
        case 'qindex.put':
          result = await qindexCore.put(
            args.key,
            args.value,
            args.metadata || {},
            args.options || {}
          );
          break;

        case 'qindex.get':
          result = await qindexCore.get(args.key, args);
          if (!result) {
            return res.status(404).json({
              error: 'Record not found',
              key: args.key
            });
          }
          break;

        case 'qindex.list':
          result = await qindexCore.list(args);
          break;

        case 'qindex.history':
          result = await qindexCore.getHistory(args.key, args);
          break;

        case 'qindex.delete':
          result = await qindexCore.delete(args.key, args);
          break;

        default:
          return res.status(404).json({
            error: 'Tool not found',
            tool: toolName,
            availableTools: [
              'qindex.put',
              'qindex.get', 
              'qindex.list',
              'qindex.history',
              'qindex.delete'
            ]
          });
      }

      res.json({
        success: true,
        tool: toolName,
        result
      });

    } catch (error) {
      logger.error('MCP tool execution failed', {
        tool: req.params.toolName,
        error: error.message
      });

      res.status(500).json({
        error: 'Tool execution failed',
        message: error.message,
        tool: req.params.toolName
      });
    }
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}