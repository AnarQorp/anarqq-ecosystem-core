/**
 * Search Routes
 * HTTP API routes for message search operations
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
 * Search messages
 */
router.post('/search',
  rateLimitByIdentity(100, 3600000), // 100 searches per hour
  validateRequest({
    required: ['query'],
    maxLengths: {
      query: 200
    }
  }),
  authorizeAction('message.read'),
  async (req, res) => {
    try {
      const searchService = getService('search');
      const { squidId } = req.identity;

      const searchParams = {
        squidId,
        query: req.body.query,
        folder: req.body.folder || 'ALL',
        dateRange: req.body.dateRange,
        limit: Math.min(parseInt(req.body.limit) || 10, 50)
      };

      const result = await searchService.searchMessages(searchParams);

      res.json({
        status: 'ok',
        code: 'SEARCH_COMPLETED',
        message: 'Search completed successfully',
        data: result
      });

    } catch (error) {
      console.error('[Search API] Search failed:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'SEARCH_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;