/**
 * Qwallet Integration API Routes
 * 
 * Provides REST API endpoints for cross-module payment integration
 * including Qmail, Qmarket, and Qdrive payment processing.
 */

import express from 'express';
import { QwalletIntegrationService } from '../services/QwalletIntegrationService.mjs';
import { QmailPaymentService } from '../services/QmailPaymentService.mjs';
import { QdrivePaymentService } from '../services/QdrivePaymentService.mjs';
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';
import { validateJoi } from '../middleware/joiValidation.mjs';
import Joi from 'joi';

const router = express.Router();

// Initialize services
const qwalletIntegration = new QwalletIntegrationService({
  sandboxMode: process.env.QWALLET_SANDBOX_MODE === 'true'
});

const qmailPayment = new QmailPaymentService({
  qwalletIntegration,
  sandboxMode: process.env.QWALLET_SANDBOX_MODE === 'true'
});

const qdrivePayment = new QdrivePaymentService({
  qwalletIntegration,
  sandboxMode: process.env.QWALLET_SANDBOX_MODE === 'true'
});

// Initialize services
Promise.all([
  qwalletIntegration.initialize(),
  qmailPayment.initialize(),
  qdrivePayment.initialize()
]).then(() => {
  console.log('[QwalletIntegration] All payment services initialized');
}).catch(error => {
  console.error('[QwalletIntegration] Service initialization failed:', error);
});

// Validation schemas
const qmailPaymentSchema = Joi.object({
  messageType: Joi.string().valid('premium', 'certified', 'priority', 'bulk').default('premium'),
  recipients: Joi.array().items(Joi.string()).min(1).required(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    size: Joi.number().min(0).required(),
    type: Joi.string()
  })).default([]),
  priority: Joi.string().valid('normal', 'high').default('normal'),
  messageSize: Joi.number().min(0).default(0)
});

const qdriveQuotaSchema = Joi.object({
  currentUsage: Joi.number().min(0).required(),
  requestedSize: Joi.number().min(0).required(),
  subscriptionPlan: Joi.string().allow(null)
});

const qdrivePremiumFeatureSchema = Joi.object({
  featureType: Joi.string().valid('encryption', 'sharing', 'versioning', 'backup', 'sync').required(),
  fileId: Joi.string().allow(null),
  fileSize: Joi.number().min(0).default(0),
  operationCount: Joi.number().min(1).default(1)
});

const subscriptionSchema = Joi.object({
  planId: Joi.string().required(),
  billingPeriod: Joi.string().valid('monthly', 'yearly').default('monthly')
});

// Middleware
router.use(standardAuthMiddleware());

// ===== QMAIL PAYMENT ROUTES =====

/**
 * Process Qmail premium message payment
 */
router.post('/qmail/premium-message', 
  validateJoi(qmailPaymentSchema), 
  async (req, res) => {
    try {
      const squidId = req.user.squidId;
      const paymentData = { squidId, ...req.body };

      const result = await qmailPayment.processPremiumMessage(paymentData);

      res.status(result.success ? 200 : 400).json({
        status: result.success ? 'ok' : 'error',
        code: result.success ? 'PAYMENT_PROCESSED' : 'PAYMENT_FAILED',
        message: result.success ? 'Premium message payment processed' : result.error,
        data: result.success ? result : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QwalletIntegration] Qmail payment error:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Process Qmail subscription
 */
router.post('/qmail/subscription', 
  validateJoi(subscriptionSchema), 
  async (req, res) => {
    try {
      const squidId = req.user.squidId;
      const subscriptionData = { squidId, ...req.body };

      const result = await qmailPayment.processSubscription(subscriptionData);

      res.status(result.success ? 200 : 400).json({
        status: result.success ? 'ok' : 'error',
        code: result.success ? 'SUBSCRIPTION_PROCESSED' : 'SUBSCRIPTION_FAILED',
        message: result.success ? 'Subscription processed' : result.error,
        data: result.success ? result : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QwalletIntegration] Qmail subscription error:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get Qmail service pricing
 */
router.get('/qmail/pricing', async (req, res) => {
  try {
    const result = await qmailPayment.getServicePricing();

    res.json({
      status: 'ok',
      code: 'PRICING_RETRIEVED',
      message: 'Service pricing retrieved',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Qmail pricing error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Qmail payment history
 */
router.get('/qmail/payment-history', async (req, res) => {
  try {
    const squidId = req.user.squidId;
    const { limit, offset, serviceType } = req.query;

    const result = await qmailPayment.getPaymentHistory(squidId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      serviceType
    });

    res.json({
      status: 'ok',
      code: 'PAYMENT_HISTORY_RETRIEVED',
      message: 'Payment history retrieved',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Qmail payment history error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== QDRIVE PAYMENT ROUTES =====

/**
 * Process Qdrive storage quota
 */
router.post('/qdrive/quota', 
  validateJoi(qdriveQuotaSchema), 
  async (req, res) => {
    try {
      const squidId = req.user.squidId;
      const quotaData = { squidId, ...req.body };

      const result = await qdrivePayment.processStorageQuota(quotaData);

      res.status(result.success ? 200 : 400).json({
        status: result.success ? 'ok' : 'error',
        code: result.success ? 'QUOTA_PROCESSED' : 'QUOTA_FAILED',
        message: result.success ? 'Storage quota processed' : result.error,
        data: result.success ? result : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QwalletIntegration] Qdrive quota error:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Process Qdrive premium feature
 */
router.post('/qdrive/premium-feature', 
  validateJoi(qdrivePremiumFeatureSchema), 
  async (req, res) => {
    try {
      const squidId = req.user.squidId;
      const featureData = { squidId, ...req.body };

      const result = await qdrivePayment.processPremiumFeature(featureData);

      res.status(result.success ? 200 : 400).json({
        status: result.success ? 'ok' : 'error',
        code: result.success ? 'FEATURE_PROCESSED' : 'FEATURE_FAILED',
        message: result.success ? 'Premium feature processed' : result.error,
        data: result.success ? result : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QwalletIntegration] Qdrive premium feature error:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Process Qdrive subscription
 */
router.post('/qdrive/subscription', 
  validateJoi(subscriptionSchema), 
  async (req, res) => {
    try {
      const squidId = req.user.squidId;
      const subscriptionData = { squidId, ...req.body };

      const result = await qdrivePayment.processSubscription(subscriptionData);

      res.status(result.success ? 200 : 400).json({
        status: result.success ? 'ok' : 'error',
        code: result.success ? 'SUBSCRIPTION_PROCESSED' : 'SUBSCRIPTION_FAILED',
        message: result.success ? 'Subscription processed' : result.error,
        data: result.success ? result : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[QwalletIntegration] Qdrive subscription error:', error);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get Qdrive storage summary
 */
router.get('/qdrive/storage-summary', async (req, res) => {
  try {
    const squidId = req.user.squidId;

    const result = await qdrivePayment.getStorageSummary(squidId);

    res.json({
      status: 'ok',
      code: 'STORAGE_SUMMARY_RETRIEVED',
      message: 'Storage summary retrieved',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Qdrive storage summary error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Qdrive pricing information
 */
router.get('/qdrive/pricing', async (req, res) => {
  try {
    const result = await qdrivePayment.getPricingInfo();

    res.json({
      status: 'ok',
      code: 'PRICING_RETRIEVED',
      message: 'Pricing information retrieved',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Qdrive pricing error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== GENERAL INTEGRATION ROUTES =====

/**
 * Get payment status
 */
router.get('/payment/:intentId/status', async (req, res) => {
  try {
    const { intentId } = req.params;

    const result = await qwalletIntegration.getPaymentStatus(intentId);

    res.status(result.success ? 200 : 404).json({
      status: result.success ? 'ok' : 'error',
      code: result.success ? 'PAYMENT_STATUS_RETRIEVED' : 'PAYMENT_NOT_FOUND',
      message: result.success ? 'Payment status retrieved' : result.error,
      data: result.success ? result : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Payment status error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get settlement reconciliation report
 */
router.get('/settlements/report', async (req, res) => {
  try {
    const { module, startDate, endDate, limit } = req.query;

    const result = await qwalletIntegration.getSettlementReport({
      module,
      startDate,
      endDate,
      limit: parseInt(limit) || 100
    });

    res.json({
      status: 'ok',
      code: 'SETTLEMENT_REPORT_GENERATED',
      message: 'Settlement report generated',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Settlement report error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get audit trail
 */
router.get('/audit-trail', async (req, res) => {
  try {
    const { action, module, startDate, endDate, limit } = req.query;
    const squidId = req.user.squidId;

    const result = await qwalletIntegration.getAuditTrail({
      squidId,
      action,
      module,
      startDate,
      endDate,
      limit: parseInt(limit) || 100
    });

    res.json({
      status: 'ok',
      code: 'AUDIT_TRAIL_RETRIEVED',
      message: 'Audit trail retrieved',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Audit trail error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== SANDBOX ROUTES =====

/**
 * Get sandbox wallet balance (sandbox mode only)
 */
router.get('/sandbox/balance', async (req, res) => {
  try {
    if (process.env.QWALLET_SANDBOX_MODE !== 'true') {
      return res.status(403).json({
        status: 'error',
        code: 'SANDBOX_DISABLED',
        message: 'Sandbox mode is not enabled',
        timestamp: new Date().toISOString()
      });
    }

    const squidId = req.user.squidId;
    const result = await qwalletIntegration.getSandboxBalance(squidId);

    res.status(result.success ? 200 : 404).json({
      status: result.success ? 'ok' : 'error',
      code: result.success ? 'SANDBOX_BALANCE_RETRIEVED' : 'SANDBOX_WALLET_NOT_FOUND',
      message: result.success ? 'Sandbox balance retrieved' : result.error,
      data: result.success ? result : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[QwalletIntegration] Sandbox balance error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ===== HEALTH CHECK =====

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const [integrationHealth, qmailHealth, qdriveHealth] = await Promise.all([
      qwalletIntegration.healthCheck(),
      qmailPayment.healthCheck(),
      qdrivePayment.healthCheck()
    ]);

    const overallStatus = [integrationHealth, qmailHealth, qdriveHealth]
      .every(h => h.status === 'healthy') ? 'healthy' : 'degraded';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        integration: integrationHealth,
        qmail: qmailHealth,
        qdrive: qdriveHealth
      }
    });
  } catch (error) {
    console.error('[QwalletIntegration] Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('[QwalletIntegration] Route error:', error);
  
  res.status(error.status || 500).json({
    status: 'error',
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

export default router;