/**
 * Results and analytics routes
 */

import express from 'express';
import { VotingService } from '../services/VotingService.js';
import { ReputationService } from '../services/ReputationService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const votingService = new VotingService();
const reputationService = new ReputationService();

/**
 * GET /api/v1/daos/:daoId/results
 * Get voting results for a DAO
 */
router.get('/:daoId/results', async (req, res) => {
  try {
    const { daoId } = req.params;

    const result = await votingService.getResults(daoId);

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
      code: 'RESULTS_RETRIEVED',
      message: 'Voting results retrieved successfully',
      data: {
        daoId: result.daoId,
        daoName: result.daoName,
        results: result.results,
        summary: result.summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/results', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve results',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/analytics
 * Get DAO analytics and statistics
 */
router.get('/:daoId/analytics', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { timeframe = '30d' } = req.query;

    // Get voting analytics
    const votingAnalytics = await votingService.getVotingAnalytics(daoId, timeframe);
    
    // Get reputation statistics
    const reputationStats = await reputationService.getReputationStats(daoId);

    // Get participation metrics
    const participationMetrics = await votingService.getParticipationMetrics(daoId, timeframe);

    res.json({
      status: 'ok',
      code: 'ANALYTICS_RETRIEVED',
      message: 'DAO analytics retrieved successfully',
      data: {
        daoId,
        timeframe,
        voting: votingAnalytics,
        reputation: reputationStats,
        participation: participationMetrics,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/analytics', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve analytics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/leaderboard
 * Get reputation leaderboard for a DAO
 */
router.get('/:daoId/leaderboard', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { limit = 20 } = req.query;

    const result = await reputationService.getReputationLeaderboard(daoId, parseInt(limit));

    res.json({
      status: 'ok',
      code: 'LEADERBOARD_RETRIEVED',
      message: 'Reputation leaderboard retrieved successfully',
      data: {
        daoId,
        leaderboard: result.leaderboard,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/leaderboard', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve leaderboard',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/proposals/:proposalId/results
 * Get detailed results for a specific proposal
 */
router.get('/:daoId/proposals/:proposalId/results', async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;

    const result = await votingService.getProposalResults(daoId, proposalId);

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
      code: 'PROPOSAL_RESULTS_RETRIEVED',
      message: 'Proposal results retrieved successfully',
      data: result.results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/proposals/:proposalId/results', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve proposal results',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/governance-health
 * Get governance health metrics for a DAO
 */
router.get('/:daoId/governance-health', async (req, res) => {
  try {
    const { daoId } = req.params;

    const healthMetrics = await votingService.getGovernanceHealth(daoId);

    res.json({
      status: 'ok',
      code: 'GOVERNANCE_HEALTH_RETRIEVED',
      message: 'Governance health metrics retrieved successfully',
      data: {
        daoId,
        health: healthMetrics,
        assessedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/governance-health', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve governance health',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/daos/:daoId/participation-trends
 * Get participation trends over time
 */
router.get('/:daoId/participation-trends', async (req, res) => {
  try {
    const { daoId } = req.params;
    const { period = 'weekly', duration = '3m' } = req.query;

    const trends = await votingService.getParticipationTrends(daoId, period, duration);

    res.json({
      status: 'ok',
      code: 'PARTICIPATION_TRENDS_RETRIEVED',
      message: 'Participation trends retrieved successfully',
      data: {
        daoId,
        period,
        duration,
        trends,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /daos/:daoId/participation-trends', { error: error.message });
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve participation trends',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;