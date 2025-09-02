/**
 * Example showing how to integrate idempotency and retry infrastructure
 * in backend services
 */

import { ClientFactory, RetryPolicyManager } from '@anarq/common-clients';

/**
 * Example service using idempotent HTTP client
 */
class QwalletService {
  constructor() {
    this.client = ClientFactory.createModuleClient(
      'qwallet',
      process.env.QWALLET_API_URL || 'https://qwallet.api.com'
    );
  }

  /**
   * Process payment with idempotency
   */
  async processPayment(paymentData, userId, requestId) {
    try {
      const response = await this.client.post('/payments', paymentData, {
        'Idempotency-Key': `payment-${userId}-${requestId}`,
        'x-squid-id': userId,
        'x-correlation-id': requestId
      });

      console.log('Payment processed:', response);
      return response;
    } catch (error) {
      console.error('Payment failed:', error.message);
      throw error;
    }
  }

  /**
   * Get payment status (no idempotency needed for reads)
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return response;
    } catch (error) {
      console.error('Failed to get payment status:', error.message);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      retry: this.client.getRetryConfig(),
      circuitBreaker: this.client.getCircuitBreakerState(),
      idempotency: this.client.getIdempotencyStats()
    };
  }

  shutdown() {
    this.client.shutdown();
  }
}

/**
 * Example service with custom retry policy
 */
class QindexService {
  constructor() {
    // Create custom retry policy for indexing operations
    const customPolicy = RetryPolicyManager.createCustom({
      maxAttempts: 5,
      baseDelay: 100,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['SERVICE_UNAVAILABLE', 'TIMEOUT_ERROR', 'IPFS_UNAVAILABLE'],
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
    });

    this.client = ClientFactory.createHttpClient({
      baseUrl: process.env.QINDEX_API_URL || 'https://qindex.api.com',
      module: 'qindex',
      retryPolicy: customPolicy,
      circuitBreaker: {
        failureThreshold: 10, // More tolerant for indexing
        recoveryTimeout: 30000,
        monitoringWindow: 60000,
        halfOpenMaxCalls: 5,
        fallbackStrategy: 'CACHE'
      }
    });
  }

  /**
   * Index document with retry and idempotency
   */
  async indexDocument(documentData, userId, documentId) {
    try {
      const response = await this.client.post('/index', documentData, {
        'Idempotency-Key': `index-${documentId}-${Date.now()}`,
        'x-squid-id': userId
      });

      console.log('Document indexed:', response);
      return response;
    } catch (error) {
      console.error('Indexing failed:', error.message);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query, userId) {
    try {
      const response = await this.client.post('/search', { query }, {
        'x-squid-id': userId
      });

      return response;
    } catch (error) {
      console.error('Search failed:', error.message);
      throw error;
    }
  }

  shutdown() {
    this.client.shutdown();
  }
}

/**
 * Example API endpoint using the services
 */
class ApiHandler {
  constructor() {
    this.qwalletService = new QwalletService();
    this.qindexService = new QindexService();
  }

  /**
   * Handle payment request
   */
  async handlePayment(req, res) {
    try {
      const { amount, currency, recipient } = req.body;
      const userId = req.headers['x-squid-id'];
      const requestId = req.headers['x-correlation-id'] || `req-${Date.now()}`;

      const paymentData = {
        amount,
        currency,
        recipient,
        timestamp: new Date().toISOString()
      };

      const result = await this.qwalletService.processPayment(paymentData, userId, requestId);

      res.json({
        status: 'ok',
        code: 'PAYMENT_PROCESSED',
        message: 'Payment processed successfully',
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: error.code || 'PAYMENT_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Handle document upload and indexing
   */
  async handleDocumentUpload(req, res) {
    try {
      const { title, content, metadata } = req.body;
      const userId = req.headers['x-squid-id'];
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const documentData = {
        type: 'document',
        key: documentId,
        title,
        content,
        metadata: {
          ...metadata,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await this.qindexService.indexDocument(documentData, userId, documentId);

      res.json({
        status: 'ok',
        code: 'DOCUMENT_INDEXED',
        message: 'Document uploaded and indexed successfully',
        data: {
          documentId,
          indexResult: result.data
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: error.code || 'INDEXING_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Get service health and statistics
   */
  async handleHealthCheck(req, res) {
    try {
      const qwalletStats = this.qwalletService.getStats();
      const globalRetryStats = ClientFactory.getGlobalRetryStats();
      const globalIdempotencyStats = ClientFactory.getGlobalIdempotencyStats();

      res.json({
        status: 'ok',
        code: 'HEALTH_CHECK',
        message: 'Services are healthy',
        data: {
          services: {
            qwallet: qwalletStats,
          },
          global: {
            retry: globalRetryStats,
            idempotency: globalIdempotencyStats
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 'HEALTH_CHECK_FAILED',
        message: error.message
      });
    }
  }

  /**
   * Shutdown all services
   */
  shutdown() {
    this.qwalletService.shutdown();
    this.qindexService.shutdown();
    ClientFactory.shutdown();
  }
}

/**
 * Example Express.js integration
 */
function setupExampleRoutes(app) {
  const apiHandler = new ApiHandler();

  // Payment endpoint
  app.post('/api/payments', (req, res) => {
    apiHandler.handlePayment(req, res);
  });

  // Document upload endpoint
  app.post('/api/documents', (req, res) => {
    apiHandler.handleDocumentUpload(req, res);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    apiHandler.handleHealthCheck(req, res);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down services...');
    apiHandler.shutdown();
    process.exit(0);
  });

  return apiHandler;
}

/**
 * Example standalone usage
 */
async function exampleUsage() {
  console.log('=== Idempotency and Retry Integration Example ===');

  const qwalletService = new QwalletService();
  const qindexService = new QindexService();

  try {
    // Example payment
    console.log('\n1. Processing payment...');
    const paymentResult = await qwalletService.processPayment({
      amount: 100,
      currency: 'USD',
      recipient: 'user456'
    }, 'user123', 'req-001');

    console.log('Payment result:', paymentResult);

    // Example document indexing
    console.log('\n2. Indexing document...');
    const indexResult = await qindexService.indexDocument({
      type: 'document',
      key: 'doc-001',
      title: 'Example Document',
      content: 'This is an example document for testing.',
      metadata: { category: 'test' }
    }, 'user123', 'doc-001');

    console.log('Index result:', indexResult);

    // Get statistics
    console.log('\n3. Service statistics:');
    console.log('Qwallet stats:', qwalletService.getStats());
    console.log('Global retry stats:', ClientFactory.getGlobalRetryStats());
    console.log('Global idempotency stats:', ClientFactory.getGlobalIdempotencyStats());

  } catch (error) {
    console.error('Example failed:', error);
  } finally {
    // Cleanup
    qwalletService.shutdown();
    qindexService.shutdown();
    ClientFactory.shutdown();
  }
}

export {
  QwalletService,
  QindexService,
  ApiHandler,
  setupExampleRoutes,
  exampleUsage
};

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}