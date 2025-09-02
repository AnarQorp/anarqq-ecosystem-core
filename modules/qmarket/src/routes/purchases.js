/**
 * Purchases Routes
 * 
 * HTTP API routes for purchase history and management.
 */

import { Router } from 'express';
import Joi from 'joi';
import { createRateLimit } from '../../security/middleware.js';

const router = Router();

// Validation schemas
const purchaseHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('pending', 'completed', 'failed', 'refunded'),
  currency: Joi.string().valid('QToken', 'PI'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso()
});

/**
 * GET /api/purchases
 * Get user's purchase history
 */
router.get('/',
  createRateLimit('getPurchases'),
  async (req, res, next) => {
    try {
      const { squidId } = req.user;
      
      // Validate query parameters
      const { error, value } = purchaseHistorySchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.details
        });
      }

      const options = value;
      const result = await global.qmarketService.getPurchaseHistory(squidId, options);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/purchases/:purchaseId
 * Get specific purchase details
 */
router.get('/:purchaseId',
  async (req, res, next) => {
    try {
      const { purchaseId } = req.params;
      const { squidId } = req.user;

      // This would be implemented in the service
      const result = await global.qmarketService.getPurchase(purchaseId, squidId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'PURCHASE_NOT_FOUND' ? 404 : 
                          result.code === 'ACCESS_DENIED' ? 403 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export function createPurchaseRoutes() {
  return router;
}