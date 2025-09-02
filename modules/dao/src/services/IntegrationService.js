/**
 * Integration Service - Handles integration with ecosystem services
 * Provides both real integrations and mock implementations
 */

import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class IntegrationService {
  constructor() {
    this.useMocks = config.USE_MOCKS;
    this.services = {
      squid: config.SQUID_SERVICE_URL,
      qonsent: config.QONSENT_SERVICE_URL,
      qlock: config.QLOCK_SERVICE_URL,
      qindex: config.QINDEX_SERVICE_URL,
      qerberos: config.QERBEROS_SERVICE_URL,
      qwallet: config.QWALLET_SERVICE_URL
    };
  }

  /**
   * Verify user identity via sQuid
   */
  async verifyIdentity(userId, signature) {
    if (this.useMocks) {
      return this.mockVerifyIdentity(userId, signature);
    }

    try {
      const response = await axios.post(`${this.services.squid}/api/v1/verify`, {
        userId,
        signature
      });

      return {
        success: response.data.success,
        verified: response.data.verified,
        profile: response.data.profile
      };
    } catch (error) {
      logger.error('Error verifying identity', { error: error.message });
      return { success: false, verified: false };
    }
  }

  /**
   * Check access permissions via Qonsent
   */
  async checkAccess(userId, resourceId, visibility) {
    if (this.useMocks) {
      return this.mockCheckAccess(userId, resourceId, visibility);
    }

    try {
      const response = await axios.post(`${this.services.qonsent}/api/v1/check-access`, {
        squidId: userId,
        resourceId,
        visibility,
        dataType: 'dao-membership'
      });

      return {
        allowed: response.data.allowed,
        reason: response.data.reason,
        profileId: response.data.profileId
      };
    } catch (error) {
      logger.error('Error checking access', { error: error.message });
      return { allowed: false, reason: 'Access check failed' };
    }
  }

  /**
   * Validate token balance via Qwallet
   */
  async validateBalance(userId, amount, token) {
    if (this.useMocks) {
      return this.mockValidateBalance(userId, amount, token);
    }

    try {
      const response = await axios.post(`${this.services.qwallet}/api/v1/validate-balance`, {
        userId,
        amount,
        token
      });

      return {
        hasBalance: response.data.hasBalance,
        currentBalance: response.data.currentBalance,
        token: response.data.token
      };
    } catch (error) {
      logger.error('Error validating balance', { error: error.message });
      return { hasBalance: false, currentBalance: 0 };
    }
  }

  /**
   * Get token balance via Qwallet
   */
  async getBalance(userId, token) {
    if (this.useMocks) {
      return this.mockGetBalance(userId, token);
    }

    try {
      const response = await axios.get(`${this.services.qwallet}/api/v1/balance/${userId}/${token}`);

      return {
        success: response.data.success,
        balance: response.data.balance,
        token: response.data.token
      };
    } catch (error) {
      logger.error('Error getting balance', { error: error.message });
      return { success: false, balance: 0 };
    }
  }

  /**
   * Verify cryptographic signature via Qlock
   */
  async verifySignature(userId, data, signature) {
    if (this.useMocks) {
      return this.mockVerifySignature(userId, data, signature);
    }

    try {
      const response = await axios.post(`${this.services.qlock}/api/v1/verify`, {
        userId,
        data,
        signature
      });

      return response.data.valid;
    } catch (error) {
      logger.error('Error verifying signature', { error: error.message });
      return false;
    }
  }

  /**
   * Verify vote signature via Qlock
   */
  async verifyVoteSignature(voterId, proposalId, option, signature) {
    const voteData = { proposalId, option, timestamp: Date.now() };
    return this.verifySignature(voterId, voteData, signature);
  }

  /**
   * Log membership via Qindex
   */
  async logMembership(membershipId, daoId, userId, joinedAt) {
    if (this.useMocks) {
      return this.mockLogMembership(membershipId, daoId, userId, joinedAt);
    }

    try {
      await axios.post(`${this.services.qindex}/api/v1/register`, {
        cid: `dao_membership_${membershipId}`,
        squidId: userId,
        visibility: 'dao-only',
        contentType: 'dao-membership',
        timestamp: joinedAt,
        storjUrl: `dao://${daoId}/members/${userId}`,
        fileSize: 0,
        originalName: `DAO Membership`,
        metadata: {
          daoId,
          userId,
          membershipId,
          joinedAt
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging membership', { error: error.message });
      return { success: false };
    }
  }

  /**
   * Log proposal via Qindex
   */
  async logProposal(proposalId, daoId, creatorId, title) {
    if (this.useMocks) {
      return this.mockLogProposal(proposalId, daoId, creatorId, title);
    }

    try {
      await axios.post(`${this.services.qindex}/api/v1/register`, {
        cid: `proposal_${proposalId}`,
        squidId: creatorId,
        visibility: 'dao-only',
        contentType: 'dao-proposal',
        timestamp: new Date().toISOString(),
        storjUrl: `dao://${daoId}/proposals/${proposalId}`,
        fileSize: 0,
        originalName: title,
        metadata: {
          proposalId,
          daoId,
          creatorId,
          title
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging proposal', { error: error.message });
      return { success: false };
    }
  }

  /**
   * Log vote via Qindex
   */
  async logVote(voteId, proposalId, daoId, voterId, option, weight) {
    if (this.useMocks) {
      return this.mockLogVote(voteId, proposalId, daoId, voterId, option, weight);
    }

    try {
      await axios.post(`${this.services.qindex}/api/v1/register`, {
        cid: `vote_${voteId}`,
        squidId: voterId,
        visibility: 'dao-only',
        contentType: 'dao-vote',
        timestamp: new Date().toISOString(),
        storjUrl: `dao://${daoId}/proposals/${proposalId}/votes/${voteId}`,
        fileSize: 0,
        originalName: `Vote on Proposal`,
        metadata: {
          voteId,
          proposalId,
          daoId,
          voterId,
          option,
          weight
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging vote', { error: error.message });
      return { success: false };
    }
  }

  /**
   * Log vote integrity check via Qerberos
   */
  async logVoteIntegrity(voterId, proposalId, option, weight, signature) {
    if (this.useMocks) {
      return this.mockLogVoteIntegrity(voterId, proposalId, option, weight, signature);
    }

    try {
      await axios.post(`${this.services.qerberos}/api/v1/log`, {
        action: 'vote_integrity_check',
        squidId: voterId,
        resourceId: proposalId,
        metadata: {
          option,
          weight,
          signature: signature.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging vote integrity', { error: error.message });
      return { success: false };
    }
  }

  /**
   * Log execution via Qerberos
   */
  async logExecution(proposalId, executorId, result) {
    if (this.useMocks) {
      return this.mockLogExecution(proposalId, executorId, result);
    }

    try {
      await axios.post(`${this.services.qerberos}/api/v1/log`, {
        action: 'proposal_executed',
        squidId: executorId,
        resourceId: proposalId,
        metadata: {
          result,
          timestamp: new Date().toISOString()
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging execution', { error: error.message });
      return { success: false };
    }
  }

  /**
   * Log error via Qerberos
   */
  async logError(action, userId, resourceId, errorMessage) {
    if (this.useMocks) {
      return this.mockLogError(action, userId, resourceId, errorMessage);
    }

    try {
      await axios.post(`${this.services.qerberos}/api/v1/log`, {
        action,
        squidId: userId,
        resourceId,
        metadata: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error logging error', { error: error.message });
      return { success: false };
    }
  }

  // Mock implementations for standalone mode
  mockVerifyIdentity(userId, signature) {
    return {
      success: true,
      verified: signature && signature.length > 10,
      profile: { squidId: userId, verified: true }
    };
  }

  mockCheckAccess(userId, resourceId, visibility) {
    return {
      allowed: visibility === 'public' || userId.includes('admin'),
      reason: visibility === 'public' ? 'Public access' : 'Admin access',
      profileId: `profile_${userId}`
    };
  }

  mockValidateBalance(userId, amount, token) {
    const mockBalance = Math.random() * 1000 + amount; // Always have enough for testing
    return {
      hasBalance: mockBalance >= amount,
      currentBalance: mockBalance,
      token
    };
  }

  mockGetBalance(userId, token) {
    return {
      success: true,
      balance: Math.random() * 1000 + 100,
      token
    };
  }

  mockVerifySignature(userId, data, signature) {
    return signature && signature.length > 10; // Simple mock validation
  }

  mockLogMembership() { return { success: true }; }
  mockLogProposal() { return { success: true }; }
  mockLogVote() { return { success: true }; }
  mockLogVoteIntegrity() { return { success: true }; }
  mockLogExecution() { return { success: true }; }
  mockLogError() { return { success: true }; }
}