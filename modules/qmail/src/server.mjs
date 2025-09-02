/**
 * Qmail Server
 * Main server entry point for the Qmail certified messaging module
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import routes and middleware
import messageRoutes from './routes/messages.mjs';
import receiptRoutes from './routes/receipts.mjs';
import searchRoutes from './routes/search.mjs';
import healthRoutes from './routes/health.mjs';
import mcpRoutes from './routes/mcp.mjs';

// Import security middleware
import {
  authenticateSquid,
  authorizeAction,
  analyzeContent,
  rateLimitByIdentity,
  auditRequest,
  handleSecurityError
} from '../security/middleware.mjs';

// Import services
import { initializeServices } from './services/index.mjs';

const app = express();
const PORT = process.env.PORT || 3000;
const MODE = process.env.QMAIL_MODE || 'standalone';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
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
    'x-sig',
    'x-ts',
    'x-api-version',
    'x-qonsent'
  ]
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', globalRateLimit);

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/qmail', authenticateSquid);
app.use('/api/qmail', auditRequest('API_REQUEST'));

// Message routes
app.use('/api/qmail', messageRoutes);

// Receipt routes
app.use('/api/qmail', receiptRoutes);

// Search routes
app.use('/api/qmail', searchRoutes);

// MCP routes
app.use('/mcp', mcpRoutes);

// Error handling
app.use(handleSecurityError);

app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'An internal server error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Initialize services based on mode
async function initializeServer() {
  try {
    console.log(`[Qmail] Starting server in ${MODE} mode...`);
    
    // Initialize services (mocks or real services based on mode)
    await initializeServices(MODE);
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`[Qmail] Server running on port ${PORT}`);
      console.log(`[Qmail] Mode: ${MODE}`);
      console.log(`[Qmail] Health check: http://localhost:${PORT}/health`);
      console.log(`[Qmail] API base: http://localhost:${PORT}/api/qmail`);
      console.log(`[Qmail] MCP endpoint: http://localhost:${PORT}/mcp`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Qmail] Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('[Qmail] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[Qmail] Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('[Qmail] Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('[Qmail] Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
initializeServer();