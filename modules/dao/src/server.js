/**
 * Express server setup for DAO module
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';

// Route imports
import healthRoutes from './routes/health.js';
import daoRoutes from './routes/dao.js';
import proposalRoutes from './routes/proposals.js';
import votingRoutes from './routes/voting.js';
import resultsRoutes from './routes/results.js';

export async function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.NODE_ENV === 'production' 
      ? ['https://anarq.org', 'https://app.anarq.org']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_MAX,
    message: {
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // API routes with authentication
  app.use('/api/v1/daos', authMiddleware, daoRoutes);
  app.use('/api/v1/daos', authMiddleware, proposalRoutes);
  app.use('/api/v1/daos', authMiddleware, votingRoutes);
  app.use('/api/v1/daos', authMiddleware, resultsRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use(errorHandler);

  return app;
}