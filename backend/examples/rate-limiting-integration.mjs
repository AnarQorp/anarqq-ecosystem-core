/**
 * Rate Limiting Integration Example
 * 
 * Demonstrates how to integrate the comprehensive rate limiting system
 * into an Express application with Qerberos integration
 */

import express from 'express';
import { 
  initializeRateLimiting, 
  rateLimitMiddleware, 
  recordRequestOutcome,
  costTrackingMiddleware,
  adaptiveRateLimitMiddleware,
  rateLimitHealthCheck
} from '../middleware/rateLimiting.mjs';
import { initializeQerberosIntegration } from '../services/QerberosIntegrationService.mjs';
import { getEnvironmentConfig, endpointConfigs } from '../config/rateLimiting.mjs';

const app = express();
app.use(express.json());

// Initialize Qerberos integration first
const qerberosService = initializeQerberosIntegration();

// Initialize rate limiting with environment-specific configuration and Qerberos integration
const rateLimitConfig = getEnvironmentConfig();
const rateLimitingService = initializeRateLimiting(rateLimitConfig, qerberosService);

// Connect rate limiting service to Qerberos for cost control events
rateLimitingService.on('budgetAlert', async (alert) => {
  await qerberosService.reportCostControlEvent(alert);
});

// Global middleware setup
app.use(costTrackingMiddleware()); // Track invocation costs
app.use(rateLimitMiddleware()); // Apply rate limiting
app.use(recordRequestOutcome()); // Record success/failure for circuit breaker

// Health check endpoint (no rate limiting)
app.get('/health/rate-limiting', rateLimitHealthCheck());

// Example: Authentication endpoints with strict rate limiting
app.post('/auth/login', 
  adaptiveRateLimitMiddleware(endpointConfigs),
  async (req, res) => {
    // Simulate authentication logic
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Username and password required'
      });
    }
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    res.json({
      status: 'ok',
      message: 'Authentication successful',
      token: 'mock-jwt-token'
    });
  }
);

// Example: Payment endpoint with very strict rate limiting
app.post('/qwallet/pay',
  adaptiveRateLimitMiddleware(endpointConfigs),
  async (req, res) => {
    const { amount, recipient } = req.body;
    
    if (!amount || !recipient) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_PAYMENT_REQUEST',
        message: 'Amount and recipient required'
      });
    }
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    res.json({
      status: 'ok',
      message: 'Payment processed',
      transactionId: `tx_${Date.now()}`
    });
  }
);

// Example: File upload endpoint with moderate rate limiting
app.post('/qdrive/upload',
  adaptiveRateLimitMiddleware(endpointConfigs),
  async (req, res) => {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_UPLOAD_REQUEST',
        message: 'Filename and content required'
      });
    }
    
    // Simulate file upload processing
    await new Promise(resolve => setTimeout(resolve, 300));
    
    res.json({
      status: 'ok',
      message: 'File uploaded successfully',
      cid: `Qm${Math.random().toString(36).substr(2, 44)}`
    });
  }
);

// Example: Search endpoint with permissive rate limiting
app.get('/qindex/search',
  adaptiveRateLimitMiddleware(endpointConfigs),
  async (req, res) => {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_SEARCH_QUERY',
        message: 'Search query required'
      });
    }
    
    // Simulate search processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    res.json({
      status: 'ok',
      message: 'Search completed',
      results: [
        { id: '1', title: 'Mock Result 1' },
        { id: '2', title: 'Mock Result 2' }
      ]
    });
  }
);

// Example: Endpoint that might fail (for circuit breaker testing)
app.get('/test/failing-endpoint', async (req, res) => {
  // Simulate random failures for circuit breaker testing
  if (Math.random() < 0.7) { // 70% failure rate
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Simulated server error'
    });
  }
  
  res.json({
    status: 'ok',
    message: 'Request succeeded'
  });
});

// Example: Endpoint for testing abuse detection
app.post('/test/abuse-target', async (req, res) => {
  // This endpoint can be used to test abuse detection patterns
  res.json({
    status: 'ok',
    message: 'Request processed',
    timestamp: Date.now()
  });
});

// Statistics endpoint for monitoring
app.get('/stats/rate-limiting', async (req, res) => {
  const rateLimitStats = rateLimitingService.getStatistics();
  const qerberosStats = qerberosService.getStatistics();
  const qerberosHealth = await qerberosService.getHealthStatus();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rateLimiting: rateLimitStats,
    qerberos: {
      ...qerberosStats,
      health: qerberosHealth
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rate limiting example server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health/rate-limiting - Rate limiting health check');
  console.log('  POST /auth/login - Authentication (strict rate limiting)');
  console.log('  POST /qwallet/pay - Payment processing (very strict)');
  console.log('  POST /qdrive/upload - File upload (moderate)');
  console.log('  GET  /qindex/search - Search (permissive)');
  console.log('  GET  /test/failing-endpoint - Circuit breaker testing');
  console.log('  POST /test/abuse-target - Abuse detection testing');
  console.log('  GET  /stats/rate-limiting - Statistics and monitoring');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down rate limiting example server...');
  process.exit(0);
});

export default app;