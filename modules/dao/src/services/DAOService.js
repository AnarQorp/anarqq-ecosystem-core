/**
 * DAO Governance Service - Modernized for standalone operation
 * Handles DAO operations with decentralized governance and voting systems
 */

import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../storage/database.js';
import { IntegrationService } from './IntegrationService.js';
import { ReputationService } from './ReputationService.js';
import { EventPublisher } from './EventPublisher.js';

export class DAOService {
  constructor() {
    this.db = new DatabaseManager();
    this.integration = new IntegrationService();
    this.reputation = new ReputationService();
    this.events = new EventPublisher();
  }

  /**
   * Get all active DAOs with filtering and pagination
   */
  async getDAOs(options = {}) {
    try {
      const { limit = 20, offset = 0, visibility, search } = options;
      
      let query = 'SELECT * FROM daos WHERE is_active = 1';
      const params = [];

      if (visibility) {
        query += ' AND visibility = ?';
        params.push(visibility);
      }

      if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const daos = await this.db.query(query, params);
      const total = await this.db.get('SELECT COUNT(*) as count FROM daos WHERE is_active = 1');

      logger.info(`Retrieved ${daos.length} DAOs`, { total: total.count });

      return {
        success: true,
        daos: daos.map(dao => this.formatDAO(dao)),
        pagination: {
          total: total.count,
          limit,
          offset,
          hasMore: offset + limit < total.count
        }
      };
    } catch (error) {
      logger.error('Error getting DAOs', { error: error.message });
      return {
        success: false,
        error: error.message,
        daos: [],
        pagination: { total: 0, limit, offset, hasMore: false }
      };
    }
  }

  /**
   * Get detailed DAO information
   */
  async getDAO(daoId) {
    try {
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ? AND is_active = 1', [daoId]);
      
      if (!dao) {
        return { success: false, error: 'DAO not found' };
      }

      // Get active proposals
      const activeProposals = await this.db.query(
        'SELECT id, title, status, vote_count, created_at, expires_at FROM proposals WHERE dao_id = ? AND status = "active"',
        [daoId]
      );

      // Get recent activity
      const recentActivity = await this.getRecentActivity(daoId);

      const detailedDAO = {
        ...this.formatDAO(dao),
        activeProposals: activeProposals.map(p => this.formatProposal(p)),
        recentActivity
      };

      logger.info(`Retrieved detailed DAO info: ${daoId}`);

      return {
        success: true,
        dao: detailedDAO
      };
    } catch (error) {
      logger.error('Error getting DAO', { error: error.message, daoId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Join a DAO (request membership)
   */
  async joinDAO(daoId, userId, signature) {
    const startTime = Date.now();
    
    try {
      // Get DAO
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ? AND is_active = 1', [daoId]);
      if (!dao) {
        return { success: false, error: 'DAO not found' };
      }

      // Check if already a member
      const existingMember = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
        [daoId, userId]
      );

      if (existingMember) {
        return { success: false, error: 'User is already a member of this DAO' };
      }

      logger.info(`Processing join request: ${userId} → ${daoId}`);

      // Verify identity and permissions
      const identityVerified = await this.integration.verifyIdentity(userId, signature);
      if (!identityVerified.success) {
        return { success: false, error: 'Identity verification failed' };
      }

      // Check access permissions
      const accessCheck = await this.integration.checkAccess(userId, daoId, dao.visibility);
      if (!accessCheck.allowed) {
        return { success: false, error: accessCheck.reason };
      }

      // Validate token requirements
      if (dao.token_requirement) {
        const tokenReq = JSON.parse(dao.token_requirement);
        const balanceCheck = await this.integration.validateBalance(userId, tokenReq.amount, tokenReq.token);
        
        if (!balanceCheck.hasBalance) {
          return {
            success: false,
            error: `Insufficient ${tokenReq.token} balance. Required: ${tokenReq.amount}`
          };
        }
      }

      // Create membership
      const membershipId = `member_${crypto.randomBytes(8).toString('hex')}`;
      const joinedAt = new Date().toISOString();

      await this.db.run(
        `INSERT INTO memberships (id, dao_id, user_id, membership_type, joined_at, status, permissions, reputation_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [membershipId, daoId, userId, 'standard', joinedAt, 'active', JSON.stringify(['vote']), 100]
      );

      // Update DAO member count
      await this.db.run('UPDATE daos SET member_count = member_count + 1 WHERE id = ?', [daoId]);

      // Log membership
      await this.integration.logMembership(membershipId, daoId, userId, joinedAt);

      // Publish event
      await this.events.publish('q.dao.member.joined.v1', {
        daoId,
        userId,
        membershipType: 'standard',
        joinedAt,
        memberCount: dao.member_count + 1
      });

      logger.info(`User ${userId} successfully joined DAO ${daoId}`);

      return {
        success: true,
        message: `Successfully joined ${dao.name}`,
        membership: {
          id: membershipId,
          daoId,
          daoName: dao.name,
          userId,
          joinedAt,
          membershipType: 'standard'
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Error joining DAO', { error: error.message, daoId, userId });
      
      await this.integration.logError('dao_join_error', userId, daoId, error.message);

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if user has proposal creation rights
   */
  async checkProposalCreationRights(daoId, userId) {
    try {
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ?', [daoId]);
      if (!dao) {
        return { allowed: false, reason: 'DAO not found' };
      }

      // Check membership
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

      // Check token requirements if any
      if (dao.token_requirement) {
        const tokenReq = JSON.parse(dao.token_requirement);
        const balanceCheck = await this.integration.validateBalance(userId, tokenReq.amount, tokenReq.token);
        
        if (!balanceCheck.hasBalance) {
          return { 
            allowed: false, 
            reason: `Insufficient ${tokenReq.token} balance for proposal creation` 
          };
        }
      }

      return { allowed: true, reason: 'User has proposal creation rights' };

    } catch (error) {
      logger.error('Error checking proposal creation rights', { error: error.message });
      return { allowed: false, reason: 'Error checking rights' };
    }
  }

  /**
   * Calculate vote weight based on reputation and token holdings
   */
  async calculateVoteWeight(voterId, daoId) {
    try {
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ?', [daoId]);
      const membership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ?',
        [daoId, voterId]
      );

      if (!dao || !membership) {
        return 1; // Default weight
      }

      const governanceRules = JSON.parse(dao.governance_rules || '{}');
      let weight = 1;

      switch (governanceRules.votingMechanism) {
        case 'token_weighted':
          if (dao.token_requirement) {
            const tokenReq = JSON.parse(dao.token_requirement);
            const balance = await this.integration.getBalance(voterId, tokenReq.token);
            weight = Math.floor(balance.balance || 1);
          }
          break;

        case 'reputation_weighted':
          weight = (membership.reputation_score || 100) / 100;
          break;

        case 'one_person_one_vote':
        default:
          weight = 1;
          break;
      }

      return Math.max(weight, 1); // Minimum weight of 1

    } catch (error) {
      logger.error('Error calculating vote weight', { error: error.message });
      return 1;
    }
  }

  /**
   * Get recent activity for a DAO
   */
  async getRecentActivity(daoId, limit = 10) {
    try {
      const activities = await this.db.query(`
        SELECT 'proposal' as type, id, title as description, created_at as timestamp, created_by as actor
        FROM proposals WHERE dao_id = ?
        UNION ALL
        SELECT 'vote' as type, id, option as description, timestamp, voter as actor
        FROM votes WHERE dao_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `, [daoId, daoId, limit]);

      return activities;
    } catch (error) {
      logger.error('Error getting recent activity', { error: error.message });
      return [];
    }
  }

  /**
   * Format DAO object for API response
   */
  formatDAO(dao) {
    return {
      id: dao.id,
      name: dao.name,
      description: dao.description,
      visibility: dao.visibility,
      memberCount: dao.member_count,
      quorum: dao.quorum,
      proposalCount: dao.proposal_count,
      activeProposals: dao.active_proposals,
      tokenRequirement: dao.token_requirement ? JSON.parse(dao.token_requirement) : null,
      governanceRules: dao.governance_rules ? JSON.parse(dao.governance_rules) : {},
      createdBy: dao.created_by,
      createdAt: dao.created_at,
      isActive: dao.is_active === 1
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
      results: proposal.results ? JSON.parse(proposal.results) : {}
    };
  }
}