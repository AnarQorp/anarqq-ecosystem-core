/**
 * Event Publisher - Publishes DAO events to the ecosystem event bus
 */

import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class EventPublisher {
  constructor() {
    this.eventBusUrl = config.EVENT_BUS_URL;
    this.useMocks = config.USE_MOCKS;
  }

  /**
   * Publish an event to the event bus
   */
  async publish(eventType, data, metadata = {}) {
    try {
      const event = {
        eventId: `evt_${crypto.randomBytes(8).toString('hex')}`,
        timestamp: new Date().toISOString(),
        version: 'v1',
        source: 'dao-service',
        type: eventType,
        data,
        metadata: {
          ...metadata,
          publishedBy: 'dao-module',
          environment: config.NODE_ENV
        }
      };

      if (this.useMocks) {
        return this.mockPublish(event);
      }

      const response = await axios.post(`${this.eventBusUrl}/api/v1/events`, event, {
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Source': 'dao-service'
        },
        timeout: 5000
      });

      logger.info(`Published event: ${eventType}`, { 
        eventId: event.eventId,
        success: response.data.success 
      });

      return {
        success: true,
        eventId: event.eventId,
        published: true
      };

    } catch (error) {
      logger.error('Error publishing event', { 
        eventType, 
        error: error.message 
      });

      // Don't fail the main operation if event publishing fails
      return {
        success: false,
        error: error.message,
        published: false
      };
    }
  }

  /**
   * Publish DAO created event
   */
  async publishDAOCreated(daoData) {
    return this.publish('q.dao.created.v1', {
      daoId: daoData.id,
      name: daoData.name,
      description: daoData.description,
      createdBy: daoData.createdBy,
      visibility: daoData.visibility,
      memberCount: daoData.memberCount || 1,
      quorum: daoData.quorum,
      governanceRules: daoData.governanceRules
    });
  }

  /**
   * Publish member joined event
   */
  async publishMemberJoined(membershipData) {
    return this.publish('q.dao.member.joined.v1', {
      daoId: membershipData.daoId,
      userId: membershipData.userId,
      membershipType: membershipData.membershipType,
      joinedAt: membershipData.joinedAt,
      memberCount: membershipData.memberCount
    });
  }

  /**
   * Publish proposal created event
   */
  async publishProposalCreated(proposalData) {
    return this.publish('q.dao.proposal.created.v1', {
      proposalId: proposalData.id,
      daoId: proposalData.daoId,
      title: proposalData.title,
      description: proposalData.description,
      createdBy: proposalData.createdBy,
      expiresAt: proposalData.expiresAt,
      quorum: proposalData.quorum,
      options: proposalData.options
    });
  }

  /**
   * Publish vote cast event
   */
  async publishVoteCast(voteData) {
    return this.publish('q.dao.vote.cast.v1', {
      voteId: voteData.id,
      proposalId: voteData.proposalId,
      daoId: voteData.daoId,
      voter: voteData.voter,
      option: voteData.option,
      weight: voteData.weight,
      timestamp: voteData.timestamp,
      voteCount: voteData.voteCount,
      quorumReached: voteData.quorumReached
    });
  }

  /**
   * Publish proposal closed event
   */
  async publishProposalClosed(proposalData) {
    return this.publish('q.dao.proposal.closed.v1', {
      proposalId: proposalData.id,
      daoId: proposalData.daoId,
      closedAt: proposalData.closedAt,
      finalResults: proposalData.results,
      totalVotes: proposalData.voteCount,
      quorumReached: proposalData.quorumReached
    });
  }

  /**
   * Publish proposal executed event
   */
  async publishProposalExecuted(executionData) {
    return this.publish('q.dao.proposal.executed.v1', {
      proposalId: executionData.proposalId,
      daoId: executionData.daoId,
      executedBy: executionData.executedBy,
      executedAt: executionData.executedAt,
      executionResult: executionData.executionResult,
      transactionHash: executionData.transactionHash
    });
  }

  /**
   * Publish governance rule changed event
   */
  async publishRuleChanged(ruleData) {
    return this.publish('q.dao.rule.changed.v1', {
      daoId: ruleData.daoId,
      changedBy: ruleData.changedBy,
      ruleType: ruleData.ruleType,
      oldValue: ruleData.oldValue,
      newValue: ruleData.newValue,
      reason: ruleData.reason,
      changedAt: ruleData.changedAt || new Date().toISOString()
    });
  }

  /**
   * Publish reputation updated event
   */
  async publishReputationUpdated(reputationData) {
    return this.publish('q.dao.reputation.updated.v1', {
      daoId: reputationData.daoId,
      userId: reputationData.userId,
      oldScore: reputationData.oldScore,
      newScore: reputationData.newScore,
      factors: reputationData.factors,
      updatedAt: reputationData.updatedAt || new Date().toISOString()
    });
  }

  /**
   * Batch publish multiple events
   */
  async publishBatch(events) {
    try {
      const results = await Promise.allSettled(
        events.map(event => this.publish(event.type, event.data, event.metadata))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      logger.info(`Batch published ${successful}/${results.length} events`, { failed });

      return {
        success: failed === 0,
        total: results.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      logger.error('Error in batch publish', { error: error.message });
      return {
        success: false,
        error: error.message,
        total: events.length,
        successful: 0,
        failed: events.length
      };
    }
  }

  /**
   * Mock event publishing for standalone mode
   */
  mockPublish(event) {
    logger.info(`[MOCK] Published event: ${event.type}`, { 
      eventId: event.eventId,
      data: event.data 
    });

    return {
      success: true,
      eventId: event.eventId,
      published: true,
      mock: true
    };
  }

  /**
   * Get event publishing statistics
   */
  getStats() {
    // In a real implementation, this would track publishing metrics
    return {
      totalPublished: 0,
      successRate: 100,
      averageLatency: 0,
      lastPublished: null
    };
  }
}