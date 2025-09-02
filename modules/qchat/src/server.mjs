/**
 * Qchat Server - Instant Messaging Module
 * Main server entry point with HTTP API and WebSocket support
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Import routes and services
import roomRoutes from './routes/rooms.mjs';
import messageRoutes from './routes/messages.mjs';
import moderationRoutes from './routes/moderation.mjs';
import healthRoutes from './routes/health.mjs';
import websocketHandler from './services/websocket.mjs';

// Import middleware
import {
  authenticateJWT,
  createReputationRateLimit,
  securityHeaders,
  contentSecurity,
  riskAssessment
} from '../security/middleware.mjs';

// Configuration
const PORT = process.env.QCHAT_PORT || 3001;
const MODE = process.env.QCHAT_MODE || 'standalone';
const CORS_ORIGIN = process.env.QCHAT_CORS_ORIGIN || '*';

// Create Express app
const app = express();
const server = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(securityHeaders);
app.use(compression());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Squid-ID',
    'X-SubID',
    'X-Qonsent',
    'X-Sig',
    'X-TS',
    'X-API-Version'
  ]
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  next();
});

// Rate limiting (applied after authentication)
const rateLimiter = createReputationRateLimit();

// Health check (no auth required)
app.use('/api/qchat/health', healthRoutes);

// Authentication middleware for protected routes
app.use('/api/qchat', authenticateJWT);
app.use('/api/qchat', rateLimiter);
app.use('/api/qchat', contentSecurity);
app.use('/api/qchat', riskAssessment);

// API routes
app.use('/api/qchat/rooms', roomRoutes);
app.use('/api/qchat/messages', messageRoutes);
app.use('/api/qchat/moderation', moderationRoutes);

// WebSocket endpoint info
app.get('/api/qchat/websocket', (req, res) => {
  res.json({
    status: 'ok',
    code: 'WEBSOCKET_INFO',
    message: 'WebSocket endpoint information',
    data: {
      endpoint: `/websocket`,
      protocols: ['websocket', 'polling'],
      authentication: 'JWT token required in query parameter or header',
      events: [
        'message',
        'typing',
        'presence',
        'room:join',
        'room:leave',
        'moderation'
      ]
    },
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    status: 'error',
    code: error.code || 'INTERNAL_ERROR',
    message: isDevelopment ? error.message : 'Internal server error',
    details: isDevelopment ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Verify token (simplified for demo)
    // In real implementation, this would use the same JWT verification as HTTP
    const mockUser = {
      squidId: 'squid_websocket_user',
      reputation: 0.75,
      identity: { reputation: 0.75 }
    };
    
    socket.user = mockUser;
    socket.rooms = new Set();
    socket.lastActivity = Date.now();
    
    next();
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`WebSocket connected: ${socket.user.squidId} (${socket.id})`);
  
  // Initialize WebSocket handler
  websocketHandler(io, socket);
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`WebSocket disconnected: ${socket.user.squidId} (${socket.id}) - ${reason}`);
    
    // Notify rooms about user leaving
    socket.rooms.forEach(roomId => {
      socket.to(roomId).emit('presence', {
        type: 'USER_OFFLINE',
        squidId: socket.user.squidId,
        timestamp: new Date().toISOString()
      });
    });
  });
  
  // Heartbeat for connection health
  socket.on('ping', () => {
    socket.lastActivity = Date.now();
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// Periodic cleanup of inactive connections
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  io.sockets.sockets.forEach((socket) => {
    if (now - socket.lastActivity > timeout) {
      console.log(`Disconnecting inactive socket: ${socket.user?.squidId} (${socket.id})`);
      socket.disconnect(true);
    }
  });
}, 60000); // Check every minute

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Qchat server running on port ${PORT}`);
  console.log(`📡 Mode: ${MODE}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/qchat/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/qchat/websocket`);
  
  if (MODE === 'standalone') {
    console.log('🧪 Running in standalone mode with mock services');
  }
});

export default app;