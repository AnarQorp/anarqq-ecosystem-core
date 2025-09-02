/**
 * DAO management routes
 */

import express from 'express';
import Joi from 'joi';
import { DAOService } from '../services/DAOService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const daoService = new DAOService();

// Validation schemas
const listDAOsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  visibility: Joi.string().valid('public', 'dao-only', 'private'),
  search: Joi.string().max(100)
});

const joinDAOSchema = Joi.object({
  userId: Joi.string().pattern(/^did:squid:[a-zA-Z0-9-_]+$/).required(),
  signature: Joi.string().min(10).required()
});

/**
 * GET /api/v1/daos
 * List all DAOs with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { error, value } = listDAOsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    const result = await daoService.getDAOs(value);

    res.json({
      status: 'ok',
      code: 'DAOS_RETRIEVED',
      message: 'DAOs retrieved successfully',
      data: {
        daos: result.daos,
        pagination: result.pagination
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve DAOs',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId
 * Get detailed DAO information
 */
router.get('/:daoId', async (req, res) => {
  try {
    const { daoId } = req.params;

    if (!daoId || typeof daoId !== 'string') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_DAO_ID',
        message: 'Valid DAO ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await daoService.getDAO(daoId);

    if (!result.success) {
      return res.status(404).json({
        status: 'error',
        code: 'DAO_NOT_FOUND',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'DAO_RETRIEVED',
      message: 'DAO retrieved successfully',
      data: result.dao,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId', { error: error.message, daoId: req.params.daoId });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve DAO',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/daos/:daoId/join
 * Join a DAO
 */
router.post('/:daoId/join', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { error, value } = joinDAOSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    if (!daoId || typeof daoId !== 'string') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_DAO_ID',
        message: 'Valid DAO ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await daoService.joinDAO(daoId, value.userId, value.signature);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'JOIN_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'DAO_JOINED',
      message: result.message,
      data: {
        membership: result.membership,
        processingTime: result.processingTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /daos/:daoId/join', { 
      error: error.message, 
      daoId: req.params.daoId,
      userId: req.body.userId 
    });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to join DAO',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/members
 * Get DAO members (requires membership)
 */
router.get('/:daoId/members', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Check if user is a member of the DAO
    const userMembership = await daoService.checkMembership(daoId, req.user.squidId);
    if (!userMembership.isMember) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Only DAO members can view member list',
        timestamp: new Date().toISOString()
      });
    }

    const result = await daoService.getMembers(daoId, { limit, offset });

    res.json({
      status: 'ok',
      code: 'MEMBERS_RETRIEVED',
      message: 'DAO members retrieved successfully',
      data: {
        members: result.members,
        pagination: result.pagination
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/members', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve members',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/stats
 * Get DAO statistics
 */
router.get('/:daoId/stats', async (req, res) => {
  try {
    const { daoId } = req.params;

    const result = await daoService.getDAOStats(daoId);

    if (!result.success) {
      return res.status(404).json({
        status: 'error',
        code: 'DAO_NOT_FOUND',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'STATS_RETRIEVED',
      message: 'DAO statistics retrieved successfully',
      data: result.stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/stats', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;