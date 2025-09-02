/**
 * Reputation Service - Manages member reputation scores and reputation-based governance
 */

import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../storage/database.js';
import { config } from '../config/index.js';

export class ReputationService {
  constructor() {
    this.db = new DatabaseManager();
    this.enabled = config.REPUTATION_ENABLED;
    this.decayRate = config.REPUTATION_DECAY_RATE;
  }

  /**
   * Update voting reputation after a vote is cast
   */
  async updateVotingReputation(userId, daoId) {
    if (!this.enabled) return { success: true };

    try {
      const membership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ?',
        [daoId, userId]
      );

      if (!membership) {
        return { success: false, error: 'Membership not found' };
      }

      // Get voting history
      const voteCount = await this.db.get(
        'SELECT COUNT(*) as count FROM votes WHERE voter = ? AND dao_id = ?',
        [userId, daoId]
      );

      // Calculate participation score (0-100)
      const totalProposals = await this.db.get(
        'SELECT COUNT(*) as count FROM proposals WHERE dao_id = ?',
        [daoId]
      );

      const participationScore = totalProposals.count > 0 
        ? Math.min((voteCount.count / totalProposals.count) * 100, 100)
        : 0;

      // Get proposal success rate (proposals created that passed)
      const createdProposals = await this.db.query(
        'SELECT * FROM proposals WHERE created_by = ? AND dao_id = ? AND status IN ("closed", "executed")',
        [userId, daoId]
      );

      let proposalSuccessScore = 50; // Default neutral score
      if (createdProposals.length > 0) {
        const successfulProposals = createdProposals.filter(p => {
          const results = JSON.parse(p.results || '{}');
          const options = JSON.parse(p.options || '[]');
          
          // Simple heuristic: if "Yes" or first option has majority, consider successful
          const firstOption = options[0];
          const firstOptionResult = results[firstOption] || { weight: 0 };
          const totalWeight = Object.values(results).reduce((sum, r) => sum + (r.weight || 0), 0);
          
          return totalWeight > 0 && (firstOptionResult.weight / totalWeight) > 0.5;
        });

        proposalSuccessScore = (successfulProposals.length / createdProposals.length) * 100;
      }

      // Calculate voting consistency (how often user votes with majority)
      const userVotes = await this.db.query(
        'SELECT v.*, p.results FROM votes v JOIN proposals p ON v.proposal_id = p.id WHERE v.voter = ? AND v.dao_id = ? AND p.status IN ("closed", "executed")',
        [userId, daoId]
      );

      let votingConsistencyScore = 50; // Default neutral score
      if (userVotes.length > 0) {
        const consistentVotes = userVotes.filter(vote => {
          const results = JSON.parse(vote.results || '{}');
          const totalWeight = Object.values(results).reduce((sum, r) => sum + (r.weight || 0), 0);
          
          if (totalWeight === 0) return false;
          
          // Check if user voted with the majority
          const userOptionResult = results[vote.option] || { weight: 0 };
          return (userOptionResult.weight / totalWeight) > 0.5;
        });

        votingConsistencyScore = (consistentVotes.length / userVotes.length) * 100;
      }

      // Calculate tenure score
      const joinedAt = new Date(membership.joined_at);
      const tenureDays = (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);
      const tenureScore = Math.min(tenureDays, 365); // Cap at 365 days

      // Calculate overall reputation score
      const factors = {
        participation: participationScore,
        proposalSuccess: proposalSuccessScore,
        votingConsistency: votingConsistencyScore,
        tenure: tenureScore
      };

      // Weighted average (can be customized per DAO)
      const reputationScore = Math.round(
        (factors.participation * 0.3) +
        (factors.proposalSuccess * 0.25) +
        (factors.votingConsistency * 0.25) +
        (factors.tenure * 0.2)
      );

      // Update membership with new reputation
      await this.db.run(
        'UPDATE memberships SET reputation_score = ?, reputation_factors = ?, reputation_updated = ? WHERE dao_id = ? AND user_id = ?',
        [reputationScore, JSON.stringify(factors), new Date().toISOString(), daoId, userId]
      );

      logger.info(`Updated reputation for ${userId} in DAO ${daoId}: ${reputationScore}`, { factors });

      return {
        success: true,
        reputationScore,
        factors,
        previousScore: membership.reputation_score
      };

    } catch (error) {
      logger.error('Error updating voting reputation', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Update proposal creation reputation
   */
  async updateProposalReputation(userId, daoId, proposalId) {
    if (!this.enabled) return { success: true };

    try {
      // This will be called when a proposal is created
      // The actual reputation impact will be calculated when the proposal closes
      logger.info(`Proposal created by ${userId} in DAO ${daoId}: ${proposalId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating proposal reputation', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply reputation decay over time
   */
  async applyReputationDecay() {
    if (!this.enabled) return { success: true };

    try {
      const memberships = await this.db.query(
        'SELECT * FROM memberships WHERE reputation_updated < datetime("now", "-1 day")'
      );

      for (const membership of memberships) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(membership.reputation_updated).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceUpdate > 0) {
          const decayAmount = membership.reputation_score * this.decayRate * daysSinceUpdate;
          const newScore = Math.max(membership.reputation_score - decayAmount, 10); // Minimum score of 10

          await this.db.run(
            'UPDATE memberships SET reputation_score = ?, reputation_updated = ? WHERE id = ?',
            [Math.round(newScore), new Date().toISOString(), membership.id]
          );

          logger.debug(`Applied reputation decay to ${membership.user_id}: ${membership.reputation_score} → ${Math.round(newScore)}`);
        }
      }

      logger.info(`Applied reputation decay to ${memberships.length} memberships`);

      return { success: true, updated: memberships.length };

    } catch (error) {
      logger.error('Error applying reputation decay', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reputation leaderboard for a DAO
   */
  async getReputationLeaderboard(daoId, limit = 20) {
    try {
      const leaderboard = await this.db.query(`
        SELECT 
          user_id,
          reputation_score,
          reputation_factors,
          joined_at,
          reputation_updated
        FROM memberships 
        WHERE dao_id = ? AND status = "active"
        ORDER BY reputation_score DESC 
        LIMIT ?
      `, [daoId, limit]);

      const formattedLeaderboard = leaderboard.map((member, index) => ({
        rank: index + 1,
        userId: member.user_id,
        reputationScore: member.reputation_score,
        factors: member.reputation_factors ? JSON.parse(member.reputation_factors) : {},
        joinedAt: member.joined_at,
        lastUpdated: member.reputation_updated
      }));

      return {
        success: true,
        leaderboard: formattedLeaderboard
      };

    } catch (error) {
      logger.error('Error getting reputation leaderboard', { error: error.message });
      return { success: false, error: error.message, leaderboard: [] };
    }
  }

  /**
   * Get reputation history for a user
   */
  async getReputationHistory(userId, daoId) {
    try {
      // This would require a reputation_history table in a full implementation
      // For now, return current reputation data
      const membership = await this.db.get(
        'SELECT * FROM memberships WHERE dao_id = ? AND user_id = ?',
        [daoId, userId]
      );

      if (!membership) {
        return { success: false, error: 'Membership not found' };
      }

      return {
        success: true,
        currentScore: membership.reputation_score,
        factors: membership.reputation_factors ? JSON.parse(membership.reputation_factors) : {},
        lastUpdated: membership.reputation_updated,
        joinedAt: membership.joined_at
      };

    } catch (error) {
      logger.error('Error getting reputation history', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate reputation-based voting weight
   */
  calculateReputationWeight(reputationScore, baseWeight = 1) {
    if (!this.enabled) return baseWeight;

    // Convert reputation score (0-1000) to weight multiplier (0.1-2.0)
    const normalizedScore = Math.max(reputationScore, 10) / 100; // 10-1000 → 0.1-10
    const weightMultiplier = Math.min(Math.max(normalizedScore / 5, 0.1), 2.0); // Cap at 2x weight

    return baseWeight * weightMultiplier;
  }

  /**
   * Get reputation statistics for a DAO
   */
  async getReputationStats(daoId) {
    try {
      const stats = await this.db.get(`
        SELECT 
          COUNT(*) as totalMembers,
          AVG(reputation_score) as averageScore,
          MIN(reputation_score) as minScore,
          MAX(reputation_score) as maxScore,
          COUNT(CASE WHEN reputation_score >= 800 THEN 1 END) as highRepMembers,
          COUNT(CASE WHEN reputation_score <= 200 THEN 1 END) as lowRepMembers
        FROM memberships 
        WHERE dao_id = ? AND status = "active"
      `, [daoId]);

      return {
        success: true,
        stats: {
          totalMembers: stats.totalMembers,
          averageScore: Math.round(stats.averageScore || 0),
          minScore: stats.minScore || 0,
          maxScore: stats.maxScore || 0,
          highReputationMembers: stats.highRepMembers,
          lowReputationMembers: stats.lowRepMembers,
          distributionHealthy: stats.averageScore > 300 && stats.maxScore - stats.minScore < 800
        }
      };

    } catch (error) {
      logger.error('Error getting reputation stats', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}