/**
 * Proposal Service - Handles DAO proposal creation, management, and execution
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../storage/database.js';
import { IntegrationService } from './IntegrationService.js';
import { EventPublisher } from './EventPublisher.js';

export class ProposalService {
  constructor() {
    this.db = new DatabaseManager();
    this.integration = new IntegrationService();
    this.events = new EventPublisher();
  }

  /**
   * Get proposals for a DAO
   */
  async getProposals(daoId, options = {}) {
    try {
      const { status = 'all', limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = options;

      let query = 'SELECT * FROM proposals WHERE dao_id = ?';
      const params = [daoId];

      if (status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const proposals = await this.db.query(query, params);
      const total = await this.db.get('SELECT COUNT(*) as count FROM proposals WHERE dao_id = ?', [daoId]);

      const formattedProposals = proposals.map(proposal => this.formatProposal(proposal));

      logger.info(`Retrieved ${formattedProposals.length} proposals for DAO ${daoId}`);

      return {
        success: true,
        proposals: formattedProposals,
        pagination: {
          total: total.count,
          limit,
          offset,
          hasMore: offset + limit < total.count
        }
      };

    } catch (error) {
      logger.error('Error getting proposals', { error: error.message });
      return {
        success: false,
        error: error.message,
        proposals: []
      };
    }
  }

  /**
   * Get specific proposal details
   */
  async getProposal(daoId, proposalId) {
    try {
      const proposal = await this.db.get(
        'SELECT * FROM proposals WHERE id = ? AND dao_id = ?',
        [proposalId, daoId]
      );

      if (!proposal) {
        return { success: false, error: 'Proposal not found' };
      }

      // Get vote breakdown
      const votes = await this.db.query(
        'SELECT option, COUNT(*) as count, SUM(weight) as weight FROM votes WHERE proposal_id = ? GROUP BY option',
        [proposalId]
      );

      const voteBreakdown = {};
      const options = JSON.parse(proposal.options || '[]');
      
      options.forEach(option => {
        const voteData = votes.find(v => v.option === option);
        voteBreakdown[option] = {
          count: voteData ? voteData.count : 0,
          weight: voteData ? voteData.weight : 0
        };
      });

      const totalVotes = await this.db.get(
        'SELECT COUNT(*) as count, SUM(weight) as weight FROM votes WHERE proposal_id = ?',
        [proposalId]
      );

      const detailedProposal = {
        ...this.formatProposal(proposal),
        voteBreakdown,
        totalVotes: totalVotes.count || 0,
        totalWeight: totalVotes.weight || 0,
        quorumReached: (totalVotes.count || 0) >= proposal.quorum,
        timeRemaining: new Date(proposal.expires_at) - new Date(),
        canVote: proposal.status === 'active' && new Date() < new Date(proposal.expires_at)
      };

      logger.info(`Retrieved proposal details: ${proposalId}`);

      return {
        success: true,
        proposal: detailedProposal
      };

    } catch (error) {
      logger.error('Error getting proposal', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new proposal
   */
  async createProposal(daoId, metadata, creatorId, signature) {
    const startTime = Date.now();
    
    try {
      const {
        title,
        description,
        options = ['Yes', 'No'],
        duration,
        minQuorum,
        attachments = []
      } = metadata;

      // Validate required fields
      if (!title || !description) {
        throw new Error('Title and description are required');
      }

      if (options.length < 2) {
        throw new Error('At least 2 voting options are required');
      }

      // Get DAO
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ? AND is_active = 1', [daoId]);
      if (!dao) {
        return { success: false, error: 'DAO not found' };
      }

      logger.info(`Creating proposal in DAO ${daoId} by ${creatorId}`);

      // Verify signature
      const signatureValid = await this.integration.verifySignature(creatorId, { title, description, options }, signature);
      if (!signatureValid) {
        return { success: false, error: 'Invalid signature' };
      }

      // Check creation rights
      const hasRights = await this.checkProposalCreationRights(daoId, creatorId);
      if (!hasRights.allowed) {
        return { success: false, error: hasRights.reason };
      }

      // Generate proposal ID and calculate expiration
      const proposalId = `prop_${crypto.randomBytes(8).toString('hex')}`;
      const governanceRules = JSON.parse(dao.governance_rules || '{}');
      const proposalDuration = duration || governanceRules.votingDuration || 604800000; // 7 days default
      const expiresAt = new Date(Date.now() + proposalDuration).toISOString();

      // Initialize results
      const results = {};
      options.forEach(option => {
        results[option] = { count: 0, weight: 0 };
      });

      // Create proposal
      await this.db.run(`
        INSERT INTO proposals (
          id, dao_id, title, description, options, created_by, created_at, expires_at,
          status, quorum, vote_count, results, attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        proposalId, daoId, title, description, JSON.stringify(options), creatorId,
        new Date().toISOString(), expiresAt, 'active', minQuorum || dao.quorum,
        0, JSON.stringify(results), JSON.stringify(attachments)
      ]);

      // Update DAO proposal counts
      await this.db.run(`
        UPDATE daos SET 
          proposal_count = proposal_count + 1,
          active_proposals = active_proposals + 1
        WHERE id = ?
      `, [daoId]);

      // Log proposal creation
      await this.integration.logProposal(proposalId, daoId, creatorId, title);

      // Publish event
      await this.events.publish('q.dao.proposal.created.v1', {
        proposalId,
        daoId,
        title,
        createdBy: creatorId,
        expiresAt,
        quorum: minQuorum || dao.quorum,
        options
      });

      logger.info(`Created proposal ${proposalId} in DAO ${daoId}`);

      return {
        success: true,
        proposal: {
          id: proposalId,
          daoId,
          title,
          description,
          options,
          createdBy: creatorId,
          createdAt: new Date().toISOString(),
          expiresAt,
          status: 'active',
          quorum: minQuorum || dao.quorum,
          voteCount: 0,
          results
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Error creating proposal', { error: error.message });
      
      await this.integration.logError('proposal_creation_error', creatorId, daoId, error.message);

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute an approved proposal
   */
  async executeProposal(daoId, proposalId, executorId, signature) {
    const startTime = Date.now();

    try {
      // Get proposal
      const proposal = await this.db.get(
        'SELECT * FROM proposals WHERE id = ? AND dao_id = ?',
        [proposalId, daoId]
      );

      if (!proposal) {
        return { success: false, error: 'Proposal not found' };
      }

      if (proposal.status !== 'closed') {
        return { success: false, error: 'Proposal must be closed before execution' };
      }

      // Check if already executed
      const executionData = proposal.execution_data ? JSON.parse(proposal.execution_data) : {};
      if (executionData.executed) {
        return { success: false, error: 'Proposal already executed' };
      }

      // Verify signature
      const signatureValid = await this.integration.verifySignature(executorId, { proposalId, action: 'execute' }, signature);
      if (!signatureValid) {
        return { success: false, error: 'Invalid signature' };
      }

      // Check execution rights
      const hasRights = await this.checkExecutionRights(daoId, proposalId, executorId);
      if (!hasRights.allowed) {
        return { success: false, error: hasRights.reason };
      }

      logger.info(`Executing proposal ${proposalId} by ${executorId}`);

      // Execute proposal logic (this would be customized based on proposal type)
      const executionResult = await this.performProposalExecution(proposal);

      // Update proposal with execution data
      const newExecutionData = {
        executed: true,
        executedAt: new Date().toISOString(),
        executedBy: executorId,
        result: executionResult,
        transactionHash: executionResult.transactionHash
      };

      await this.db.run(
        'UPDATE proposals SET status = ?, execution_data = ? WHERE id = ?',
        ['executed', JSON.stringify(newExecutionData), proposalId]
      );

      // Log execution
      await this.integration.logExecution(proposalId, executorId, executionResult);

      // Publish event
      await this.events.publish('q.dao.proposal.executed.v1', {
        proposalId,
        daoId,
        executedBy: executorId,
        executedAt: newExecutionData.executedAt,
        executionResult
      });

      logger.info(`Proposal ${proposalId} executed successfully`);

      return {
        success: true,
        proposalId,
        executedAt: newExecutionData.executedAt,
        executionResult,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Error executing proposal', { error: error.message });
      
      await this.integration.logError('proposal_execution_error', executorId, proposalId, error.message);

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if proposal should be closed (quorum reached or expired)
   */
  async checkProposalClosure(proposalId) {
    try {
      const proposal = await this.db.get('SELECT * FROM proposals WHERE id = ?', [proposalId]);
      if (!proposal || proposal.status !== 'active') {
        return false;
      }

      const now = new Date();
      const expiresAt = new Date(proposal.expires_at);
      const quorumReached = proposal.vote_count >= proposal.quorum;

      return now >= expiresAt || quorumReached;
    } catch (error) {
      logger.error('Error checking proposal closure', { error: error.message });
      return false;
    }
  }

  /**
   * Close a proposal
   */
  async closeProposal(proposalId) {
    try {
      await this.db.run('UPDATE proposals SET status = ? WHERE id = ?', ['closed', proposalId]);
      
      const proposal = await this.db.get('SELECT * FROM proposals WHERE id = ?', [proposalId]);
      
      // Update DAO active proposal count
      await this.db.run(
        'UPDATE daos SET active_proposals = active_proposals - 1 WHERE id = ?',
        [proposal.dao_id]
      );

      // Publish event
      await this.events.publish('q.dao.proposal.closed.v1', {
        proposalId,
        daoId: proposal.dao_id,
        closedAt: new Date().toISOString(),
        finalResults: JSON.parse(proposal.results || '{}')
      });

      logger.info(`Proposal ${proposalId} closed`);
    } catch (error) {
      logger.error('Error closing proposal', { error: error.message });
    }
  }

  /**
   * Check proposal creation rights
   */
  async checkProposalCreationRights(daoId, userId) {
    // This would integrate with the main DAO service
    // For now, simplified check
    const membership = await this.db.get(
      'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
      [daoId, userId]
    );

    if (!membership) {
      return { allowed: false, reason: 'User is not a DAO member' };
    }

    const permissions = JSON.parse(membership.permissions || '[]');
    if (!permissions.includes('propose') && !permissions.includes('admin')) {
      return { allowed: false, reason: 'User does not have proposal creation rights' };
    }

    return { allowed: true };
  }

  /**
   * Check execution rights
   */
  async checkExecutionRights(daoId, proposalId, userId) {
    const membership = await this.db.get(
      'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
      [daoId, userId]
    );

    if (!membership) {
      return { allowed: false, reason: 'User is not a DAO member' };
    }

    const permissions = JSON.parse(membership.permissions || '[]');
    if (!permissions.includes('execute') && !permissions.includes('admin')) {
      return { allowed: false, reason: 'User does not have execution rights' };
    }

    return { allowed: true };
  }

  /**
   * Perform actual proposal execution (customizable based on proposal type)
   */
  async performProposalExecution(proposal) {
    // This is a placeholder for actual execution logic
    // In a real implementation, this would handle different types of proposals
    // (e.g., parameter changes, fund transfers, smart contract calls)
    
    return {
      success: true,
      type: 'governance_decision',
      timestamp: new Date().toISOString(),
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}` // Mock transaction hash
    };
  }

  /**
   * Format proposal object for API response
   */
  formatProposal(proposal) {
    return {
      id: proposal.id,
      daoId: proposal.dao_id,
      title: proposal.title,
      description: proposal.description,
      options: proposal.options ? JSON.parse(proposal.options) : [],
      createdBy: proposal.created_by,
      createdAt: proposal.created_at,
      expiresAt: proposal.expires_at,
      status: proposal.status,
      voteCount: proposal.vote_count || 0,
      quorum: proposal.quorum,
      results: proposal.results ? JSON.parse(proposal.results) : {},
      executionData: proposal.execution_data ? JSON.parse(proposal.execution_data) : null,
      attachments: proposal.attachments ? JSON.parse(proposal.attachments) : []
    };
  }
}