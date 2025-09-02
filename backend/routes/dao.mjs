/**
 * DAO Governance API Routes - Decentralized Autonomous Organization Endpoints
 * 
 * Provides REST API endpoints for DAO governance including membership,
 * proposals, voting, and results within the AnarQ&Q ecosystem.
 */

import express from 'express';
import { getDAOService } from '../services/DAOService.mjs';
import { verifySquidIdentity, optionalSquidAuth } from '../middleware/squidAuth.mjs';

const router = express.Router();
const daoService = getDAOService();

/**
 * Get list of all active DAOs
 * GET /api/dao/list
 */
router.get('/list', async (req, res) => {
  try {
    const result = await daoService.getDAOs();

    if (result.success) {
      res.json({
        success: true,
        data: result.daos,
        total: result.total
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        data: [],
        total: 0
      });
    }

  } catch (error) {
    console.error('Get DAOs endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      data: [],
      total: 0
    });
  }
});

/**
 * Get detailed DAO information
 * GET /api/dao/:daoId
 */
router.get('/:daoId', async (req, res) => {
  try {
    const { daoId } = req.params;
    const result = await daoService.getDAO(daoId);

    if (result.success) {
      res.json({
        success: true,
        data: result.dao
      });
    } else {
      const statusCode = result.error === 'DAO not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get DAO endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Join a DAO (request membership)
 * POST /api/dao/:daoId/join
 */
router.post('/:daoId/join', verifySquidIdentity, async (req, res) => {
  try {
    const { daoId } = req.params;
    const userId = req.squidIdentity.did;

    const result = await daoService.joinDAO(daoId, userId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.membership,
        processingTime: result.processingTime
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 :
                        result.error.includes('already a member') ? 409 :
                        result.error.includes('Insufficient') ? 402 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('Join DAO endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get proposals for a DAO
 * GET /api/dao/:daoId/proposals
 */
router.get('/:daoId/proposals', optionalSquidAuth, async (req, res) => {
  try {
    const { daoId } = req.params;
    const options = {
      status: req.query.status || 'all',
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await daoService.getProposals(daoId, options);

    if (result.success) {
      res.json({
        success: true,
        data: result.proposals,
        pagination: result.pagination
      });
    } else {
      const statusCode = result.error === 'DAO not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        data: [],
        pagination: { total: 0, limit: options.limit, offset: options.offset, hasMore: false }
      });
    }

  } catch (error) {
    console.error('Get proposals endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
    });
  }
});

/**
 * Get specific proposal details
 * GET /api/dao/:daoId/proposals/:proposalId
 */
router.get('/:daoId/proposals/:proposalId', optionalSquidAuth, async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const result = await daoService.getProposal(daoId, proposalId);

    if (result.success) {
      res.json({
        success: true,
        data: result.proposal
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get proposal endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Create a new proposal
 * POST /api/dao/:daoId/proposals
 */
router.post('/:daoId/proposals', verifySquidIdentity, async (req, res) => {
  try {
    const { daoId } = req.params;
    const creatorId = req.squidIdentity.did;
    
    const metadata = {
      title: req.body.title,
      description: req.body.description,
      options: req.body.options || ['Yes', 'No'],
      duration: req.body.duration ? parseInt(req.body.duration) : undefined,
      minQuorum: req.body.minQuorum ? parseInt(req.body.minQuorum) : undefined,
      attachments: req.body.attachments || []
    };

    // Validate required fields
    if (!metadata.title || !metadata.description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    if (!Array.isArray(metadata.options) || metadata.options.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 voting options are required'
      });
    }

    const result = await daoService.createProposal(daoId, metadata, creatorId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Proposal created successfully',
        data: result.proposal,
        processingTime: result.processingTime
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 :
                        result.error.includes('not a member') ? 403 :
                        result.error.includes('Insufficient') ? 402 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('Create proposal endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Vote on a proposal
 * POST /api/dao/:daoId/proposals/:proposalId/vote
 */
router.post('/:daoId/proposals/:proposalId/vote', verifySquidIdentity, async (req, res) => {
  try {
    const { daoId, proposalId } = req.params;
    const voterId = req.squidIdentity.did;
    
    const voteData = {
      voterId,
      option: req.body.option,
      signature: req.body.signature || req.squidIdentity.signature
    };

    // Validate required fields
    if (!voteData.option) {
      return res.status(400).json({
        success: false,
        error: 'Voting option is required'
      });
    }

    if (!voteData.signature) {
      return res.status(400).json({
        success: false,
        error: 'Vote signature is required'
      });
    }

    const result = await daoService.voteOnProposal(daoId, proposalId, voteData);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Vote recorded successfully',
        data: {
          vote: result.vote,
          proposalStatus: result.proposalStatus
        },
        processingTime: result.processingTime
      });
    } else {
      const statusCode = result.error.includes('not found') ? 404 :
                        result.error.includes('not active') ? 410 :
                        result.error.includes('expired') ? 410 :
                        result.error.includes('already voted') ? 409 :
                        result.error.includes('Only DAO members') ? 403 :
                        result.error.includes('Invalid') ? 400 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: result.error,
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('Vote on proposal endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get voting results for a DAO
 * GET /api/dao/:daoId/results
 */
router.get('/:daoId/results', optionalSquidAuth, async (req, res) => {
  try {
    const { daoId } = req.params;
    const result = await daoService.getResults(daoId);

    if (result.success) {
      res.json({
        success: true,
        data: {
          daoId: result.daoId,
          daoName: result.daoName,
          results: result.results,
          summary: result.summary
        }
      });
    } else {
      const statusCode = result.error === 'DAO not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Get results endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get DAO membership status for authenticated user
 * GET /api/dao/:daoId/membership
 */
router.get('/:daoId/membership', verifySquidIdentity, async (req, res) => {
  try {
    const { daoId } = req.params;
    const userId = req.squidIdentity.did;

    const dao = await daoService.getDAO(daoId);
    if (!dao.success) {
      return res.status(404).json({
        success: false,
        error: 'DAO not found'
      });
    }

    // Check membership status
    const members = daoService.memberships.get(daoId);
    const isMember = members && members.has(userId);

    // Check creation rights if member
    let canCreateProposals = false;
    if (isMember) {
      const rightsCheck = await daoService.checkProposalCreationRights(daoId, userId);
      canCreateProposals = rightsCheck.allowed;
    }

    res.json({
      success: true,
      data: {
        daoId,
        userId,
        isMember,
        canCreateProposals,
        memberSince: isMember ? new Date().toISOString() : null, // Simplified for demo
        permissions: {
          canVote: isMember,
          canCreateProposals,
          canModerate: false // Simplified for demo
        }
      }
    });

  } catch (error) {
    console.error('Get membership endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get DAO statistics
 * GET /api/dao/:daoId/stats
 */
router.get('/:daoId/stats', async (req, res) => {
  try {
    const { daoId } = req.params;
    
    const dao = await daoService.getDAO(daoId);
    if (!dao.success) {
      return res.status(404).json({
        success: false,
        error: 'DAO not found'
      });
    }

    const proposals = await daoService.getProposals(daoId, { limit: 1000 });
    const results = await daoService.getResults(daoId);

    const stats = {
      daoId,
      name: dao.dao.name,
      memberCount: dao.dao.memberCount,
      totalProposals: proposals.success ? proposals.proposals.length : 0,
      activeProposals: proposals.success ? 
        proposals.proposals.filter(p => p.status === 'active').length : 0,
      totalVotes: results.success ? 
        results.results.reduce((sum, r) => sum + r.totalVotes, 0) : 0,
      averageParticipation: results.success ? results.summary.averageParticipation : '0.00',
      governanceRules: dao.dao.governanceRules,
      recentActivity: dao.dao.recentActivity || []
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get DAO stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/dao/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await daoService.healthCheck();
    res.json(health);

  } catch (error) {
    console.error('DAO health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;