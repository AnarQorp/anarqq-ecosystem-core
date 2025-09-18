// Simple server without ecosystem services to avoid infinite loops
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '.env');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

// Import dependencies
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'AnarQ Backend is running!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001
  });
});

// Basic auth routes for testing
app.post('/api/auth/check-alias', (req, res) => {
  const { alias } = req.body;
  
  // Simple mock response - in real implementation this would check database
  res.json({
    available: true,
    alias: alias,
    message: 'Alias is available'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { alias, password } = req.body;
  
  // Create a mock identity with proper structure including permissions
  const mockIdentity = {
    did: `did:qlock:${Date.now()}`,
    name: alias,
    type: 'ROOT',
    status: 'ACTIVE',
    depth: 0,
    parentId: null,
    children: [],
    permissions: {
      canCreateSubidentities: true,
      canDeleteSubidentities: true,
      canModifyProfile: true,
      canAccessModule: (module) => true,
      canPerformAction: (action, resource) => true,
      governanceLevel: 'SELF'
    },
    governanceLevel: 'SELF',
    privacyLevel: 'PUBLIC',
    kyc: {
      required: false,
      approved: false,
      level: 'NONE'
    },
    creationRules: {
      allowedChildTypes: ['CONSENTIDA', 'AID', 'DAO'],
      maxChildren: 10,
      requiresApproval: false
    },
    created: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };
  
  // Simple mock response - in real implementation this would create user
  res.json({
    success: true,
    message: 'User registered successfully',
    user: {
      alias: alias,
      id: 'mock-user-id'
    },
    identity: mockIdentity,
    token: 'mock-jwt-token'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { alias, password } = req.body;
  
  // Simple mock response - in real implementation this would validate credentials
  res.json({
    success: true,
    message: 'Login successful',
    token: 'mock-jwt-token',
    user: {
      alias: alias,
      id: 'mock-user-id'
    }
  });
});

// Import and use basic routes (only the ones that don't cause issues)
try {
  const testRoutes = await import('./routes/test.mjs');
  app.use('/api/test', testRoutes.default);
  console.log('✅ Test routes loaded');
} catch (error) {
  console.log('⚠️  Test routes not available:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
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

const PORT = process.env.PORT || 3001;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple AnarQ Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});