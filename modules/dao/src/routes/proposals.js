/**
 * Proposal management routes
 */

import express from 'express';
import Joi from 'joi';
import { ProposalService } from '../services/ProposalService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const proposalService = new ProposalService();

// Validation schemas
const listProposalsSchema = Joi.object({
  status: Joi.string().valid('active', 'closed', 'executed', 'all').default('all'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('created_at', 'expires_at', 'vote_count').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const createProposalSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(20).max(5000).required(),
  options: Joi.array().items(Joi.string().min(1).max(100)).min(2).max(10).default(['Yes', 'No']),
  duration: Joi.number().integer().min(3600000).max(2592000000), // 1 hour to 30 days
  minQuorum: Joi.number().integer().min(1),
  creatorId: Joi.string().pattern(/^did:squid:[a-zA-Z0-9-_]+$/).required(),
  signature: Joi.string().min(10).required(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    cid: Joi.string().required(),
    type: Joi.string().required(),
    size: Joi.number().integer().min(0)
  })).default([])
});

const executeProposalSchema = Joi.object({
  executorId: Joi.string().pattern(/^did:squid:[a-zA-Z0-9-_]+$/).required(),
  signature: Joi.string().min(10).required()
});

/**
 * GET /api/v1/daos/:daoId/proposals
 * List proposals for a DAO
 */
router.get('/:daoId/proposals', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { error, value } = listProposalsSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    const result = await proposalService.getProposals(daoId, value);

    res.json({
      status: 'ok',
      code: 'PROPOSALS_RETRIEVED',
      message: 'Proposals retrieved successfully',
      data: {
        proposals: result.proposals,
        pagination: result.pagination
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/proposals', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve proposals',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/daos/:daoId/proposals
 * Create a new proposal
 */
router.post('/:daoId/proposals', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { error, value } = createProposalSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    // Verify the creator matches the authenticated user
    if (value.creatorId !== req.user.squidId) {
      return res.status(403).json({
        status: 'error',
        code: 'UNAUTHORIZED_CREATOR',
        message: 'Creator ID must match authenticated user',
        timestamp: new Date().toISOString()
      });
    }

    const result = await proposalService.createProposal(daoId, value, value.creatorId, value.signature);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'PROPOSAL_CREATION_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      status: 'ok',
      code: 'PROPOSAL_CREATED',
      message: 'Proposal created successfully',
      data: {
        proposal: result.proposal,
        processingTime: result.processingTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /daos/:daoId/proposals', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to create proposal',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/proposals/:proposalId
 * Get specific proposal details
 */
router.get('/:daoId/proposals/:proposalId', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;

    const result = await proposalService.getProposal(daoId, proposalId);

    if (!result.success) {
      return res.status(404).json({
        status: 'error',
        code: 'PROPOSAL_NOT_FOUND',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'PROPOSAL_RETRIEVED',
      message: 'Proposal retrieved successfully',
      data: result.proposal,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/proposals/:proposalId', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve proposal',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/daos/:daoId/proposals/:proposalId/execute
 * Execute an approved proposal
 */
router.post('/:daoId/proposals/:proposalId/execute', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const { error, value } = executeProposalSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    // Verify the executor matches the authenticated user
    if (value.executorId !== req.user.squidId) {
      return res.status(403).json({
        status: 'error',
        code: 'UNAUTHORIZED_EXECUTOR',
        message: 'Executor ID must match authenticated user',
        timestamp: new Date().toISOString()
      });
    }

    const result = await proposalService.executeProposal(daoId, proposalId, value.executorId, value.signature);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'EXECUTION_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'PROPOSAL_EXECUTED',
      message: 'Proposal executed successfully',
      data: {
        proposalId: result.proposalId,
        executedAt: result.executedAt,
        executionResult: result.executionResult,
        processingTime: result.processingTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /daos/:daoId/proposals/:proposalId/execute', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to execute proposal',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/daos/:daoId/proposals/:proposalId
 * Cancel a proposal (only by creator or admin)
 */
router.delete('/:daoId/proposals/:proposalId', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const userId = req.user.squidId;

    const result = await proposalService.cancelProposal(daoId, proposalId, userId);

    if (!result.success) {
      const statusCode = result.error.includes('not found') ? 404 : 
                        result.error.includes('permission') ? 403 : 400;
      
      return res.status(statusCode).json({
        status: 'error',
        code: 'CANCELLATION_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'PROPOSAL_CANCELLED',
      message: 'Proposal cancelled successfully',
      data: {
        proposalId,
        cancelledAt: result.cancelledAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in DELETE /daos/:daoId/proposals/:proposalId', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to cancel proposal',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;