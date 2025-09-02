/**
 * Voting Service - Handles DAO proposal voting with reputation-based weighting
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../storage/database.js';
import { IntegrationService } from './IntegrationService.js';
import { ReputationService } from './ReputationService.js';
import { EventPublisher } from './EventPublisher.js';

export class VotingService {
  constructor() {
    this.db = new DatabaseManager();
    this.integration = new IntegrationService();
    this.reputation = new ReputationService();
    this.events = new EventPublisher();
  }

  /**
   * Vote on a proposal
   */
  async voteOnProposal(daoId, proposalId, voteData) {
    const startTime = Date.now();
    
    try {
      const { voterId, option, signature, reason } = voteData;

      if (!voterId || !option || !signature) {
        throw new Error('Voter ID, option, and signature are required');
      }

      // Get DAO and proposal
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ?', [daoId]);
      const proposal = await this.db.get(
        'SELECT * FROM proposals WHERE id = ? AND dao_id = ?',
        [proposalId, daoId]
      );

      if (!dao || !proposal) {
        return { success: false, error: 'DAO or proposal not found' };
      }

      if (proposal.status !== 'active') {
        return { success: false, error: 'Proposal is not active' };
      }

      if (new Date() > new Date(proposal.expires_at)) {
        return { success: false, error: 'Proposal voting period has expired' };
      }

      const options = JSON.parse(proposal.options || '[]');
      if (!options.includes(option)) {
        return { success: false, error: 'Invalid voting option' };
      }

      logger.info(`Processing vote: ${voterId} → ${option} on ${proposalId}`);

      // Check if user is a DAO member
      const membership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
        [daoId, voterId]
      );

      if (!membership) {
        return { success: false, error: 'Only DAO members can vote' };
      }

      // Check if user has already voted
      const existingVote = await this.db.get(
        'SELECT * FROM votes WHERE proposal_id = ? AND voter = ?',
        [proposalId, voterId]
      );

      if (existingVote) {
        return { success: false, error: 'User has already voted on this proposal' };
      }

      // Verify signature
      const signatureValid = await this.integration.verifyVoteSignature(voterId, proposalId, option, signature);
      if (!signatureValid) {
        return { success: false, error: 'Invalid vote signature' };
      }

      // Calculate vote weight
      const voteWeight = await this.calculateVoteWeight(voterId, daoId);

      // Log integrity check
      await this.integration.logVoteIntegrity(voterId, proposalId, option, voteWeight, signature);

      // Create vote record
      const voteId = `vote_${crypto.randomBytes(8).toString('hex')}`;
      const timestamp = new Date().toISOString();

      await this.db.run(`
        INSERT INTO votes (
          id, proposal_id, dao_id, voter, option, weight, signature, timestamp, verified, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        voteId, proposalId, daoId, voterId, option, voteWeight, signature, timestamp, 1, reason || null
      ]);

      // Update proposal results
      const currentResults = JSON.parse(proposal.results || '{}');
      if (!currentResults[option]) {
        currentResults[option] = { count: 0, weight: 0 };
      }
      currentResults[option].count += 1;
      currentResults[option].weight += voteWeight;

      const newVoteCount = proposal.vote_count + 1;

      await this.db.run(`
        UPDATE proposals SET 
          vote_count = ?,
          results = ?
        WHERE id = ?
      `, [newVoteCount, JSON.stringify(currentResults), proposalId]);

      // Log vote
      await this.integration.logVote(voteId, proposalId, daoId, voterId, option, voteWeight);

      // Update voter reputation
      await this.reputation.updateVotingReputation(voterId, daoId);

      // Check if proposal should be closed
      const shouldClose = await this.checkProposalClosure(proposalId, newVoteCount, proposal.quorum);
      if (shouldClose) {
        await this.closeProposal(proposalId);
      }

      // Publish event
      await this.events.publish('q.dao.vote.cast.v1', {
        voteId,
        proposalId,
        daoId,
        voter: voterId,
        option,
        weight: voteWeight,
        voteCount: newVoteCount,
        quorumReached: newVoteCount >= proposal.quorum
      });

      logger.info(`Vote recorded: ${voteId} by ${voterId} (weight: ${voteWeight})`);

      return {
        success: true,
        vote: {
          id: voteId,
          proposalId,
          option,
          weight: voteWeight,
          timestamp
        },
        proposalStatus: {
          voteCount: newVoteCount,
          results: currentResults,
          quorumReached: newVoteCount >= proposal.quorum,
          status: proposal.status
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Error voting on proposal', { error: error.message });
      
      await this.integration.logError('vote_error', voteData.voterId, proposalId, error.message);

      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get voting results for a DAO
   */
  async getResults(daoId) {
    try {
      const dao = await this.db.get('SELECT * FROM daos WHERE id = ?', [daoId]);
      if (!dao) {
        return { success: false, error: 'DAO not found' };
      }

      // Get all proposals for this DAO
      const proposals = await this.db.query('SELECT * FROM proposals WHERE dao_id = ?', [daoId]);

      const results = proposals.map(proposal => {
        const totalVotes = proposal.vote_count || 0;
        const results = JSON.parse(proposal.results || '{}');
        const options = JSON.parse(proposal.options || '[]');

        const totalWeight = Object.values(results).reduce((sum, result) => sum + (result.weight || 0), 0);

        // Calculate percentages
        const optionResults = {};
        options.forEach(option => {
          const result = results[option] || { count: 0, weight: 0 };
          optionResults[option] = {
            count: result.count,
            weight: result.weight,
            percentage: totalVotes > 0 ? (result.count / totalVotes * 100).toFixed(2) : '0.00',
            weightPercentage: totalWeight > 0 ? (result.weight / totalWeight * 100).toFixed(2) : '0.00'
          };
        });

        // Determine winning option
        const winningOption = options.reduce((winner, option) => {
          const currentResult = results[option] || { weight: 0 };
          const winnerResult = results[winner] || { weight: 0 };
          return currentResult.weight > winnerResult.weight ? option : winner;
        }, options[0]);

        return {
          id: proposal.id,
          title: proposal.title,
          status: proposal.status,
          totalVotes,
          totalWeight,
          quorum: proposal.quorum,
          quorumReached: totalVotes >= proposal.quorum,
          results: optionResults,
          winningOption,
          createdAt: proposal.created_at,
          expiresAt: proposal.expires_at,
          isExpired: new Date() > new Date(proposal.expires_at)
        };
      });

      // Sort by creation date (newest first)
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      logger.info(`Retrieved results for ${results.length} proposals in DAO ${daoId}`);

      return {
        success: true,
        daoId,
        daoName: dao.name,
        results,
        summary: {
          totalProposals: results.length,
          activeProposals: results.filter(r => r.status === 'active').length,
          completedProposals: results.filter(r => r.status === 'closed').length,
          averageParticipation: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.totalVotes, 0) / results.length).toFixed(2)
            : '0.00'
        }
      };

    } catch (error) {
      logger.error('Error getting results', { error: error.message });
      return { success: false, error: error.message };
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
          const reputationScore = membership.reputation_score || 100;
          weight = Math.max(reputationScore / 100, 0.1); // Minimum 0.1 weight
          break;

        case 'one_person_one_vote':
        default:
          weight = 1;
          break;
      }

      // Apply delegation if any
      const delegations = JSON.parse(membership.delegations || '{}');
      if (delegations.delegatedWeight) {
        weight += delegations.delegatedWeight;
      }

      return Math.max(weight, 0.1); // Minimum weight of 0.1

    } catch (error) {
      logger.error('Error calculating vote weight', { error: error.message });
      return 1;
    }
  }

  /**
   * Check if proposal should be closed
   */
  async checkProposalClosure(proposalId, voteCount, quorum) {
    try {
      const proposal = await this.db.get('SELECT * FROM proposals WHERE id = ?', [proposalId]);
      if (!proposal) return false;

      const now = new Date();
      const expiresAt = new Date(proposal.expires_at);
      const quorumReached = voteCount >= quorum;

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
   * Get vote history for a user
   */
  async getUserVoteHistory(userId, daoId = null, limit = 50) {
    try {
      let query = 'SELECT v.*, p.title, p.dao_id FROM votes v JOIN proposals p ON v.proposal_id = p.id WHERE v.voter = ?';
      const params = [userId];

      if (daoId) {
        query += ' AND v.dao_id = ?';
        params.push(daoId);
      }

      query += ' ORDER BY v.timestamp DESC LIMIT ?';
      params.push(limit);

      const votes = await this.db.query(query, params);

      return {
        success: true,
        votes: votes.map(vote => ({
          id: vote.id,
          proposalId: vote.proposal_id,
          proposalTitle: vote.title,
          daoId: vote.dao_id,
          option: vote.option,
          weight: vote.weight,
          timestamp: vote.timestamp,
          reason: vote.reason
        }))
      };

    } catch (error) {
      logger.error('Error getting user vote history', { error: error.message });
      return { success: false, error: error.message, votes: [] };
    }
  }

  /**
   * Delegate voting power
   */
  async delegateVote(daoId, delegatorId, delegateId, signature) {
    try {
      // Verify both users are DAO members
      const delegatorMembership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
        [daoId, delegatorId]
      );

      const delegateMembership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ? AND status = "active"',
        [daoId, delegateId]
      );

      if (!delegatorMembership || !delegateMembership) {
        return { success: false, error: 'Both users must be DAO members' };
      }

      // Verify signature
      const signatureValid = await this.integration.verifySignature(
        delegatorId, 
        { action: 'delegate', daoId, delegateId }, 
        signature
      );
      if (!signatureValid) {
        return { success: false, error: 'Invalid signature' };
      }

      // Calculate delegator's voting weight
      const delegatorWeight = await this.calculateVoteWeight(delegatorId, daoId);

      // Update delegations
      const delegatorDelegations = JSON.parse(delegatorMembership.delegations || '{}');
      delegatorDelegations.delegatedTo = delegateId;

      const delegateDelegations = JSON.parse(delegateMembership.delegations || '{}');
      if (!delegateDelegations.delegatedFrom) {
        delegateDelegations.delegatedFrom = [];
      }
      if (!delegateDelegations.delegatedFrom.includes(delegatorId)) {
        delegateDelegations.delegatedFrom.push(delegatorId);
      }
      delegateDelegations.delegatedWeight = (delegateDelegations.delegatedWeight || 0) + delegatorWeight;

      // Update database
      await this.db.run(
        'UPDATE memberships SET delegations = ? WHERE dao_id = ? AND user_id = ?',
        [JSON.stringify(delegatorDelegations), daoId, delegatorId]
      );

      await this.db.run(
        'UPDATE memberships SET delegations = ? WHERE dao_id = ? AND user_id = ?',
        [JSON.stringify(delegateDelegations), daoId, delegateId]
      );

      logger.info(`Vote delegation: ${delegatorId} → ${delegateId} (weight: ${delegatorWeight})`);

      return {
        success: true,
        delegation: {
          delegator: delegatorId,
          delegate: delegateId,
          weight: delegatorWeight,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error delegating vote', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}