/**
 * Payment Routes - HTTP API for payment operations
 */

import express from 'express';
import Joi from 'joi';
import {
  authenticateSquid,
  authorizePermission,
  verifyTransactionSignature,
  enforceSpendingLimits,
  highValueTransactionSecurity,
  validateRequest
} from '../../security/middleware.mjs';

export function createPaymentRoutes(qwalletService) {
  const router = express.Router();

  // Validation schemas
  const createIntentSchema = Joi.object({
    amount: Joi.number().positive().max(10000).required(),
    currency: Joi.string().valid('QToken', 'PI').required(),
    recipient: Joi.string().required(),
    purpose: Joi.string().max(500).optional(),
    metadata: Joi.object().optional(),
    expiresIn: Joi.number().integer().min(60).max(86400).default(3600)
  });

  const signTransactionSchema = Joi.object({
    intentId: Joi.string().pattern(/^intent_[a-f0-9]{32}$/).required(),
    signature: Joi.string().required()
  });

  const processPaymentSchema = Joi.object({
    transactionId: Joi.string().pattern(/^tx_[a-f0-9]{32}$/).required()
  });

  const quoteSchema = Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('QToken', 'PI').required(),
    network: Joi.string().optional(),
    priority: Joi.string().valid('low', 'normal', 'high').default('normal')
  });

  /**
   * Create payment intent
   * POST /api/payments/intents
   */
  router.post('/intents',
    authenticateSquid,
    authorizePermission('qwallet.create_intent'),
    validateRequest(createIntentSchema),
    enforceSpendingLimits,
    highValueTransactionSecurity(1000),
    async (req, res) => {
      try {
        const { squidId, subId } = req.identity;
        const intentData = {
          squidId,
          subId,
          ...req.validatedBody
        };

        const result = await qwalletService.createPaymentIntent(intentData);

        if (result.success) {
          res.status(201).json({
            status: 'ok',
            code: 'INTENT_CREATED',
            message: 'Payment intent created successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'INTENT_CREATION_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Payment Routes] Create intent error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment intent'
        });
      }
    }
  );

  /**
   * Sign transaction
   * POST /api/payments/sign
   */
  router.post('/sign',
    authenticateSquid,
    authorizePermission('qwallet.sign_transaction'),
    validateRequest(signTransactionSchema),
    verifyTransactionSignature,
    async (req, res) => {
      try {
        const { squidId } = req.identity;
        const signData = {
          squidId,
          ...req.validatedBody
        };

        const result = await qwalletService.signTransaction(signData);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'TRANSACTION_SIGNED',
            message: 'Transaction signed successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'SIGNING_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Payment Routes] Sign transaction error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to sign transaction'
        });
      }
    }
  );

  /**
   * Process payment
   * POST /api/payments/pay
   */
  router.post('/pay',
    authenticateSquid,
    authorizePermission('qwallet.process_payment'),
    validateRequest(processPaymentSchema),
    async (req, res) => {
      try {
        const { squidId } = req.identity;
        const paymentData = {
          squidId,
          ...req.validatedBody
        };

        const result = await qwalletService.processPayment(paymentData);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'PAYMENT_PROCESSED',
            message: 'Payment processed successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'PAYMENT_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Payment Routes] Process payment error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to process payment'
        });
      }
    }
  );

  /**
   * Get payment quote
   * GET /api/payments/quote
   */
  router.get('/quote',
    validateRequest(quoteSchema, 'query'),
    async (req, res) => {
      try {
        const result = await qwalletService.getPaymentQuote(req.query);

        if (result.success) {
          res.json({
            status: 'ok',
            code: 'QUOTE_GENERATED',
            message: 'Payment quote generated successfully',
            data: result
          });
        } else {
          res.status(400).json({
            status: 'error',
            code: 'QUOTE_FAILED',
            message: result.error,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('[Payment Routes] Get quote error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate quote'
        });
      }
    }
  );

  /**
   * Get payment intent
   * GET /api/payments/intents/:intentId
   */
  router.get('/intents/:intentId',
    authenticateSquid,
    async (req, res) => {
      try {
        const { intentId } = req.params;
        const { squidId } = req.identity;

        // Validate intent ID format
        if (!/^intent_[a-f0-9]{32}$/.test(intentId)) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_INTENT_ID',
            message: 'Invalid payment intent ID format'
          });
        }

        // Get intent from service (this would need to be implemented)
        const intent = qwalletService.paymentIntents.get(intentId);

        if (!intent) {
          return res.status(404).json({
            status: 'error',
            code: 'INTENT_NOT_FOUND',
            message: 'Payment intent not found'
          });
        }

        // Check ownership
        if (intent.actor.squidId !== squidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to payment intent'
          });
        }

        res.json({
          status: 'ok',
          code: 'INTENT_RETRIEVED',
          message: 'Payment intent retrieved successfully',
          data: intent
        });
      } catch (error) {
        console.error('[Payment Routes] Get intent error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve payment intent'
        });
      }
    }
  );

  /**
   * List payment intents
   * GET /api/payments/intents
   */
  router.get('/intents',
    authenticateSquid,
    async (req, res) => {
      try {
        const { squidId } = req.identity;
        const { status, limit = 50, offset = 0 } = req.query;

        // Get intents for the identity
        const allIntents = Array.from(qwalletService.paymentIntents.values())
          .filter(intent => intent.actor.squidId === squidId);

        // Apply status filter
        let filteredIntents = allIntents;
        if (status) {
          filteredIntents = filteredIntents.filter(intent => intent.status === status);
        }

        // Sort by creation date (newest first)
        filteredIntents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination
        const paginatedIntents = filteredIntents.slice(
          parseInt(offset),
          parseInt(offset) + parseInt(limit)
        );

        res.json({
          status: 'ok',
          code: 'INTENTS_RETRIEVED',
          message: 'Payment intents retrieved successfully',
          data: {
            intents: paginatedIntents,
            total: filteredIntents.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        });
      } catch (error) {
        console.error('[Payment Routes] List intents error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve payment intents'
        });
      }
    }
  );

  /**
   * Cancel payment intent
   * DELETE /api/payments/intents/:intentId
   */
  router.delete('/intents/:intentId',
    authenticateSquid,
    authorizePermission('qwallet.cancel_intent'),
    async (req, res) => {
      try {
        const { intentId } = req.params;
        const { squidId } = req.identity;

        // Validate intent ID format
        if (!/^intent_[a-f0-9]{32}$/.test(intentId)) {
          return res.status(400).json({
            status: 'error',
            code: 'INVALID_INTENT_ID',
            message: 'Invalid payment intent ID format'
          });
        }

        const intent = qwalletService.paymentIntents.get(intentId);

        if (!intent) {
          return res.status(404).json({
            status: 'error',
            code: 'INTENT_NOT_FOUND',
            message: 'Payment intent not found'
          });
        }

        // Check ownership
        if (intent.actor.squidId !== squidId) {
          return res.status(403).json({
            status: 'error',
            code: 'UNAUTHORIZED',
            message: 'Access denied to payment intent'
          });
        }

        // Check if intent can be cancelled
        if (intent.status !== 'PENDING') {
          return res.status(400).json({
            status: 'error',
            code: 'INTENT_NOT_CANCELLABLE',
            message: `Cannot cancel intent with status: ${intent.status}`
          });
        }

        // Cancel the intent
        intent.status = 'CANCELLED';
        intent.cancelledAt = new Date().toISOString();

        // Audit log
        await qwalletService.auditLog({
          action: 'PAYMENT_INTENT_CANCELLED',
          actor: { squidId },
          resource: { type: 'payment_intent', id: intentId },
          verdict: 'ALLOW',
          details: {
            intentId,
            amount: intent.amount,
            currency: intent.currency,
            recipient: intent.recipient
          }
        });

        res.json({
          status: 'ok',
          code: 'INTENT_CANCELLED',
          message: 'Payment intent cancelled successfully',
          data: {
            intentId,
            status: 'CANCELLED',
            cancelledAt: intent.cancelledAt
          }
        });
      } catch (error) {
        console.error('[Payment Routes] Cancel intent error:', error);
        res.status(500).json({
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel payment intent'
        });
      }
    }
  );

  return router;
}

export default createPaymentRoutes;