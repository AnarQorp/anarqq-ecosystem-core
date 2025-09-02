/**
 * Voting routes
 */

import express from 'express';
import Joi from 'joi';
import { VotingService } from '../services/VotingService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const votingService = new VotingService();

// Validation schemas
const voteSchema = Joi.object({
  voterId: Joi.string().pattern(/^did:squid:[a-zA-Z0-9-_]+$/).required(),
  option: Joi.string().min(1).max(100).required(),
  signature: Joi.string().min(10).required(),
  reason: Joi.string().max(500).optional()
});

const delegateVoteSchema = Joi.object({
  delegateId: Joi.string().pattern(/^did:squid:[a-zA-Z0-9-_]+$/).required(),
  signature: Joi.string().min(10).required()
});

/**
 * POST /api/v1/daos/:daoId/proposals/:proposalId/vote
 * Vote on a proposal
 */
router.post('/:daoId/proposals/:proposalId/vote', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const { error, value } = voteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    // Verify the voter matches the authenticated user
    if (value.voterId !== req.user.squidId) {
      return res.status(403).json({
        status: 'error',
        code: 'UNAUTHORIZED_VOTER',
        message: 'Voter ID must match authenticated user',
        timestamp: new Date().toISOString()
      });
    }

    const result = await votingService.voteOnProposal(daoId, proposalId, value);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'VOTE_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'VOTE_CAST',
      message: 'Vote cast successfully',
      data: {
        vote: result.vote,
        proposalStatus: result.proposalStatus,
        processingTime: result.processingTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /daos/:daoId/proposals/:proposalId/vote', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to cast vote',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/proposals/:proposalId/votes
 * Get votes for a proposal (admin only)
 */
router.get('/:daoId/proposals/:proposalId/votes', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.squidId;

    // Check if user has admin permissions
    const hasAdminAccess = await votingService.checkAdminAccess(daoId, userId);
    if (!hasAdminAccess) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED',
        message: 'Admin access required to view individual votes',
        timestamp: new Date().toISOString()
      });
    }

    const result = await votingService.getProposalVotes(daoId, proposalId, { limit, offset });

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
      code: 'VOTES_RETRIEVED',
      message: 'Votes retrieved successfully',
      data: {
        votes: result.votes,
        pagination: result.pagination
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/proposals/:proposalId/votes', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve votes',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/votes/history
 * Get user's voting history in a DAO
 */
router.get('/:daoId/votes/history', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.user.squidId;

    const result = await votingService.getUserVoteHistory(userId, daoId, limit);

    res.json({
      status: 'ok',
      code: 'VOTE_HISTORY_RETRIEVED',
      message: 'Vote history retrieved successfully',
      data: {
        votes: result.votes,
        userId,
        daoId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/votes/history', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve vote history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/daos/:daoId/delegate
 * Delegate voting power to another member
 */
router.post('/:daoId/delegate', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { error, value } = delegateVoteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
        timestamp: new Date().toISOString()
      });
    }

    const delegatorId = req.user.squidId;

    // Prevent self-delegation
    if (delegatorId === value.delegateId) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_DELEGATION',
        message: 'Cannot delegate to yourself',
        timestamp: new Date().toISOString()
      });
    }

    const result = await votingService.delegateVote(daoId, delegatorId, value.delegateId, value.signature);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'DELEGATION_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'VOTE_DELEGATED',
      message: 'Vote delegation successful',
      data: result.delegation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /daos/:daoId/delegate', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to delegate vote',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/daos/:daoId/delegate
 * Revoke vote delegation
 */
router.delete('/:daoId/delegate', async (req, res) => {
  try {
    const { daoId } = req.params;
    const delegatorId = req.user.squidId;

    const result = await votingService.revokeDelegation(daoId, delegatorId);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        code: 'REVOCATION_FAILED',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'DELEGATION_REVOKED',
      message: 'Vote delegation revoked successfully',
      data: {
        delegatorId,
        revokedAt: result.revokedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in DELETE /daos/:daoId/delegate', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to revoke delegation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/voting-power
 * Get user's current voting power in a DAO
 */
router.get('/:daoId/voting-power', async (req, res) => {
  try {
    const { daoId } = req.params;
    const userId = req.user.squidId;

    const result = await votingService.getVotingPower(daoId, userId);

    if (!result.success) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      code: 'VOTING_POWER_RETRIEVED',
      message: 'Voting power retrieved successfully',
      data: result.votingPower,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/voting-power', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve voting power',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;