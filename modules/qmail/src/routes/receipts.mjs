/**
 * Receipt Routes
 * HTTP API routes for delivery receipt operations
 */

import express from 'express';
import { getService } from '../services/index.mjs';
import {
  authorizeAction,
  rateLimitByIdentity,
  validateRequest
} from '../../security/middleware.mjs';

const router = express.Router();

/**
 * Generate delivery receipt
 */
router.post('/receipt/:messageId',
  rateLimitByIdentity(200, 3600000), // 200 requests per hour
  authorizeAction('message.read', req => `message:${req.params.messageId}`),
  async (req, res) => {
    try {
      const receiptService = getService('receipt');
      const { messageId } = req.params;
      const { squidId } = req.identity;

      const result = await receiptService.generateReceipt(
        messageId,
        squidId,
        req.body.receiptType || 'DELIVERY'
      );

      res.json({
        status: 'ok',
        code: 'RECEIPT_GENERATED',
        message: 'Delivery receipt generated successfully',
        data: result
      });

    } catch (error) {
      console.error('[Receipts API] Generate receipt failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 :
                        error.message.includes('Access denied') ? 403 : 500;
      
      const errorCode = error.message.includes('not found') ? 'MESSAGE_NOT_FOUND' :
                       error.message.includes('Access denied') ? 'ACCESS_DENIED' :
                       'RECEIPT_GENERATION_FAILED';

      res.status(statusCode).json({
        status: 'error',
        code: errorCode,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get message receipts
 */
router.get('/receipts/:messageId',
  rateLimitByIdentity(500, 3600000), // 500 requests per hour
  authorizeAction('message.read', req => `message:${req.params.messageId}`),
  async (req, res) => {
    try {
      const receiptService = getService('receipt');
      const { messageId } = req.params;
      const { squidId } = req.identity;

      const result = await receiptService.getMessageReceipts(messageId, squidId);

      res.json({
        status: 'ok',
        code: 'RECEIPTS_RETRIEVED',
        message: 'Message receipts retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('[Receipts API] Get receipts failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: 'RECEIPTS_RETRIEVAL_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Verify receipt
 */
router.post('/receipt/verify',
  rateLimitByIdentity(100, 3600000), // 100 requests per hour
  validateRequest({
    required: ['receiptId', 'receiptData']
  }),
  async (req, res) => {
    try {
      const receiptService = getService('receipt');
      const { receiptId, receiptData } = req.body;

      const result = await receiptService.verifyReceipt(receiptId, receiptData);

      res.json({
        status: 'ok',
        code: 'RECEIPT_VERIFIED',
        message: 'Receipt verified successfully',
        data: result
      });

    } catch (error) {
      console.error('[Receipts API] Verify receipt failed:', error);
      
      res.status(400).json({
        status: 'error',
        code: 'RECEIPT_VERIFICATION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Get receipt by ID
 */
router.get('/receipt/:receiptId',
  rateLimitByIdentity(200, 3600000), // 200 requests per hour
  authorizeAction('message.read'),
  async (req, res) => {
    try {
      const receiptService = getService('receipt');
      const { receiptId } = req.params;
      const { squidId } = req.identity;

      const result = await receiptService.getReceipt(receiptId, squidId);

      res.json({
        status: 'ok',
        code: 'RECEIPT_RETRIEVED',
        message: 'Receipt retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('[Receipts API] Get receipt failed:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        status: 'error',
        code: 'RECEIPT_RETRIEVAL_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;