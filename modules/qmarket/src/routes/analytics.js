/**
 * Analytics Routes
 * 
 * HTTP API routes for marketplace analytics and statistics.
 */

import { Router } from 'express';
import { createRateLimit } from '../../security/middleware.js';

const router = Router();

/**
 * GET /api/analytics/marketplace
 * Get overall marketplace statistics
 */
router.get('/marketplace',
  createRateLimit('getAnalytics'),
  async (req, res, next) => {
    try {
      const result = await global.qmarketService.getMarketplaceStats();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/user
 * Get user-specific analytics
 */
router.get('/user',
  createRateLimit('getAnalytics'),
  async (req, res, next) => {
    try {
      const { squidId } = req.user;
      
      const result = await global.analyticsService.getUserAnalytics(squidId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/sales
 * Get user's sales analytics
 */
router.get('/sales',
  createRateLimit('getAnalytics'),
  async (req, res, next) => {
    try {
      const { squidId } = req.user;
      const { limit = 50, offset = 0, period = '30d' } = req.query;

      const result = await global.qmarketService.getSalesHistory(squidId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        period
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/categories
 * Get category-based analytics
 */
router.get('/categories',
  createRateLimit('getAnalytics'),
  async (req, res, next) => {
    try {
      const result = await global.analyticsService.getCategoryAnalytics();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export function createAnalyticsRoutes() {
  return router;
}