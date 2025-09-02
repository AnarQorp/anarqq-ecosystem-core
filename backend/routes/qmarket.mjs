/**
 * Qmarket API Routes - Decentralized Marketplace Endpoints
 * 
 * Provides REST API endpoints for the Qmarket decentralized marketplace
 * with full AnarQ&Q ecosystem integration.
 */

import express from 'express';
import { getQmarketService } from '../services/QmarketService.mjs';
import { authenticateSquid } from '../middleware/auth.mjs';
import { validateRequest } from '../middleware/validation.mjs';

const router = express.Router();
const qmarketService = getQmarketService();

/**
 * Create new marketplace listing
 * POST /api/qmarket/listings
 */
router.post('/listings', authenticateSquid, validateRequest([
  'squidId',
  'title', 
  'description',
  'price',
  'fileCid'
]), async (req, res) => {
  try {
    const listingData = {
      squidId: req.squidId,
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      currency: req.body.currency || 'QToken',
      category: req.body.category || 'digital-art',
      tags: req.body.tags || [],
      fileCid: req.body.fileCid,
      fileMetadata: req.body.fileMetadata || {},
      visibility: req.body.visibility || 'public',
      daoId: req.body.daoId || null,
      mintNFT: req.body.mintNFT !== false, // Default to true
      enableResale: req.body.enableResale !== false, // Default to true
      royaltyPercentage: req.body.royaltyPercentage || 5,
      sellerContact: req.body.sellerContact,
      privateNotes: req.body.privateNotes,
      internalMetadata: req.body.internalMetadata
    };

    const result = await qmarketService.createListing(listingData);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Listing created successfully',
        data: result.listing,
        processingTime: result.processingTime
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('Create listing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get listing by ID
 * GET /api/qmarket/listings/:id
 */
router.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await qmarketService.getListing(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.listing
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get listing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Search listings
 * GET /api/qmarket/listings
 */
router.get('/listings', async (req, res) => {
  try {
    const searchParams = {
      query: req.query.q,
      category: req.query.category,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      currency: req.query.currency,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      squidId: req.query.squidId,
      status: req.query.status || 'active',
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await qmarketService.searchListings(searchParams);

    res.json({
      success: result.success,
      data: result.listings,
      pagination: result.pagination,
      error: result.error
    });

  } catch (error) {
    console.error('Search listings endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
    });
  }
});

/**
 * Update listing
 * PUT /api/qmarket/listings/:id
 */
router.put('/listings/:id', authenticateSquid, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const squidId = req.squidId;

    const result = await qmarketService.updateListing(id, updates, squidId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Listing updated successfully',
        data: result.listing
      });
    } else {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Update listing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Delete listing
 * DELETE /api/qmarket/listings/:id
 */
router.delete('/listings/:id', authenticateSquid, async (req, res) => {
  try {
    const { id } = req.params;
    const squidId = req.squidId;

    const result = await qmarketService.deleteListing(id, squidId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      const statusCode = result.error.includes('Unauthorized') ? 403 : 
                        result.error.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Delete listing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get marketplace statistics
 * GET /api/qmarket/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await qmarketService.getMarketplaceStats();

    if (result.success) {
      res.json({
        success: true,
        data: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get marketplace stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get marketplace categories
 * GET /api/qmarket/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = Array.from(qmarketService.categories.values());
    
    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get categories endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/qmarket/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await qmarketService.healthCheck();
    res.json(health);

  } catch (error) {
    console.error('Qmarket health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;