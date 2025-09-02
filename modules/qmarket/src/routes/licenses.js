/**
 * Licenses Routes
 * 
 * HTTP API routes for digital license management.
 */

import { Router } from 'express';
import { createRateLimit } from '../../security/middleware.js';

const router = Router();

/**
 * GET /api/licenses
 * Get user's digital licenses
 */
router.get('/',
  createRateLimit('getLicenses'),
  async (req, res, next) => {
    try {
      const { squidId } = req.user;
      const { limit = 50, offset = 0, status = 'active' } = req.query;

      const result = await global.licenseService.getUserLicenses(squidId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/licenses/:licenseId
 * Get specific license details
 */
router.get('/:licenseId',
  async (req, res, next) => {
    try {
      const { licenseId } = req.params;
      const { squidId } = req.user;

      const result = await global.licenseService.getLicense(licenseId, squidId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LICENSE_NOT_FOUND' ? 404 : 
                          result.code === 'ACCESS_DENIED' ? 403 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/licenses/:licenseId/transfer
 * Transfer license to another user
 */
router.post('/:licenseId/transfer',
  createRateLimit('transferLicense'),
  async (req, res, next) => {
    try {
      const { licenseId } = req.params;
      const { squidId } = req.user;
      const { toId, price, currency = 'QToken' } = req.body;

      if (!toId) {
        return res.status(400).json({
          success: false,
          error: 'Transfer recipient required',
          code: 'RECIPIENT_REQUIRED'
        });
      }

      const result = await global.licenseService.transferLicense({
        licenseId,
        fromId: squidId,
        toId,
        price,
        currency
      });

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LICENSE_NOT_FOUND' ? 404 : 
                          result.code === 'ACCESS_DENIED' ? 403 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export function createLicenseRoutes() {
  return router;
}