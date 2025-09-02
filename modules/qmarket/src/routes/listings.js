/**
 * Listings Routes
 * 
 * HTTP API routes for marketplace listing operations.
 */

import { Router } from 'express';
import Joi from 'joi';
import { 
  qonsentAuth, 
  requireOwnership, 
  createRateLimit, 
  validateRequest 
} from '../../security/middleware.js';

const router = Router();

// Validation schemas
const createListingSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  price: Joi.number().min(0.01).required(),
  currency: Joi.string().valid('QToken', 'PI').default('QToken'),
  category: Joi.string().valid('digital-art', 'media', 'documents', 'software', 'data', 'services').default('media'),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
  fileCid: Joi.string().required(),
  fileMetadata: Joi.object({
    contentType: Joi.string(),
    fileSize: Joi.number().integer().min(0),
    thumbnailUrl: Joi.string().uri(),
    duration: Joi.number().min(0),
    dimensions: Joi.object({
      width: Joi.number().integer().min(1),
      height: Joi.number().integer().min(1)
    })
  }).default({}),
  visibility: Joi.string().valid('public', 'dao-only', 'private').default('public'),
  daoId: Joi.string().when('visibility', {
    is: 'dao-only',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  mintNFT: Joi.boolean().default(true),
  enableResale: Joi.boolean().default(true),
  royaltyPercentage: Joi.number().min(0).max(50).default(5),
  sellerContact: Joi.string().max(200),
  privateNotes: Joi.string().max(500),
  internalMetadata: Joi.object()
});

const updateListingSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().min(10).max(1000),
  price: Joi.number().min(0.01),
  tags: Joi.array().items(Joi.string().max(50)).max(10),
  status: Joi.string().valid('active', 'paused', 'expired')
});

const searchListingsSchema = Joi.object({
  query: Joi.string().max(200),
  category: Joi.string().valid('digital-art', 'media', 'documents', 'software', 'data', 'services'),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  currency: Joi.string().valid('QToken', 'PI'),
  tags: Joi.string(), // Comma-separated tags
  squidId: Joi.string(),
  status: Joi.string().valid('active', 'sold', 'expired', 'deleted').default('active'),
  visibility: Joi.string().valid('public', 'dao-only', 'private').default('public'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'price', 'title', 'viewCount').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * POST /api/listings
 * Create a new marketplace listing
 */
router.post('/', 
  createRateLimit('createListing'),
  qonsentAuth('qmarket:create', 'listing'),
  validateRequest(createListingSchema),
  async (req, res, next) => {
    try {
      const { squidId } = req.user;
      const listingData = {
        ...req.validatedBody,
        squidId
      };

      const result = await global.qmarketService.createListing(listingData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/listings
 * Search and list marketplace items
 */
router.get('/',
  createRateLimit('searchListings'),
  async (req, res, next) => {
    try {
      // Validate query parameters
      const { error, value } = searchListingsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.details
        });
      }

      const searchParams = value;
      
      // Parse comma-separated tags
      if (searchParams.tags) {
        searchParams.tags = searchParams.tags.split(',').map(tag => tag.trim());
      }

      const result = await global.qmarketService.searchListings(searchParams);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/listings/:listingId
 * Get specific listing details
 */
router.get('/:listingId',
  async (req, res, next) => {
    try {
      const { listingId } = req.params;
      const requestorId = req.user?.squidId || null;

      const result = await global.qmarketService.getListing(listingId, requestorId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LISTING_NOT_FOUND' ? 404 : 
                          result.code === 'ACCESS_DENIED' ? 403 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/listings/:listingId
 * Update listing (owner only)
 */
router.put('/:listingId',
  createRateLimit('updateListing'),
  qonsentAuth('qmarket:update', 'listing'),
  requireOwnership('listing'),
  validateRequest(updateListingSchema),
  async (req, res, next) => {
    try {
      const { listingId } = req.params;
      const { squidId } = req.user;
      const updates = req.validatedBody;

      const result = await global.qmarketService.updateListing(listingId, updates, squidId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LISTING_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/listings/:listingId
 * Delete listing (owner only)
 */
router.delete('/:listingId',
  createRateLimit('deleteListing'),
  qonsentAuth('qmarket:delete', 'listing'),
  requireOwnership('listing'),
  async (req, res, next) => {
    try {
      const { listingId } = req.params;
      const { squidId } = req.user;

      const result = await global.qmarketService.deleteListing(listingId, squidId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LISTING_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/listings/:listingId/purchase
 * Purchase a marketplace listing
 */
router.post('/:listingId/purchase',
  createRateLimit('purchaseItem'),
  qonsentAuth('qmarket:purchase', 'listing'),
  async (req, res, next) => {
    try {
      const { listingId } = req.params;
      const { squidId } = req.user;
      const { paymentMethod = 'QToken' } = req.body;

      const purchaseData = {
        squidId,
        listingId,
        paymentMethod
      };

      const result = await global.qmarketService.purchaseListing(purchaseData);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LISTING_NOT_FOUND' ? 404 :
                          result.code === 'PAYMENT_FAILED' ? 402 :
                          result.code === 'PURCHASE_ACCESS_DENIED' ? 403 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/listings/:listingId/analytics
 * Get listing analytics (owner only)
 */
router.get('/:listingId/analytics',
  qonsentAuth('qmarket:read', 'listing'),
  requireOwnership('listing'),
  async (req, res, next) => {
    try {
      const { listingId } = req.params;

      const result = await global.analyticsService.getListingAnalytics(listingId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.code === 'LISTING_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
);

export function createListingRoutes() {
  return router;
}