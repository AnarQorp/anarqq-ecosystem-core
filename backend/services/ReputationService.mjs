/**
 * Qarma Reputation Service
 * Manages user reputation, badges, and achievements in the Qsocial platform
 */

import crypto from 'crypto';

/**
 * Qarma action types and their point values
 */
export const QARMA_ACTIONS = {
  // Post actions
  POST_CREATED: 5,
  POST_UPVOTED: 10,
  POST_DOWNVOTED: -5,
  POST_REMOVED: -20,
  
  // Comment actions
  COMMENT_CREATED: 2,
  COMMENT_UPVOTED: 5,
  COMMENT_DOWNVOTED: -2,
  COMMENT_REMOVED: -10,
  
  // Voting actions (for the voter)
  GAVE_UPVOTE: 1,
  GAVE_DOWNVOTE: 0,
  
  // Community actions
  COMMUNITY_CREATED: 50,
  COMMUNITY_JOINED: 1,
  BECAME_MODERATOR: 100,
  
  // Moderation actions
  MODERATION_ACTION: 5,
  SPAM_DETECTED: -50,
  
  // Special achievements
  FIRST_POST: 10,
  FIRST_COMMENT: 5,
  HELPFUL_MEMBER: 25,
  COMMUNITY_BUILDER: 100
};

/**
 * Badge definitions
 */
export const BADGES = {
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first users on the platform',
    icon: '🌟',
    requirement: 'Join within first 1000 users'
  },
  HELPFUL: {
    id: 'helpful',
    name: 'Helpful',
    description: 'Received many upvotes on comments',
    icon: '🤝',
    requirement: 'Get 100+ comment upvotes'
  },
  COMMUNITY_BUILDER: {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Created and grew a successful community',
    icon: '🏗️',
    requirement: 'Create community with 100+ members'
  },
  TRUSTED_MEMBER: {
    id: 'trusted_member',
    name: 'Trusted Member',
    description: 'High reputation and positive contributions',
    icon: '🛡️',
    requirement: 'Maintain 500+ Qarma for 30 days'
  },
  MODERATOR: {
    id: 'moderator',
    name: 'Moderator',
    description: 'Helps maintain community standards',
    icon: '⚖️',
    requirement: 'Become a community moderator'
  },
  CONTENT_CREATOR: {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Creates engaging and popular content',
    icon: '✍️',
    requirement: 'Have 10+ posts with 50+ upvotes each'
  }
};

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS = {
  FIRST_POST: {
    id: 'first_post',
    name: 'First Post',
    description: 'Created your first post',
    points: 10
  },
  FIRST_COMMENT: {
    id: 'first_comment',
    name: 'First Comment',
    description: 'Made your first comment',
    points: 5
  },
  FIRST_UPVOTE: {
    id: 'first_upvote',
    name: 'First Upvote',
    description: 'Received your first upvote',
    points: 5
  },
  HUNDRED_QARMA: {
    id: 'hundred_qarma',
    name: 'Century Club',
    description: 'Reached 100 Qarma points',
    points: 25
  },
  THOUSAND_QARMA: {
    id: 'thousand_qarma',
    name: 'Karma Master',
    description: 'Reached 1000 Qarma points',
    points: 100
  },
  POPULAR_POST: {
    id: 'popular_post',
    name: 'Popular Post',
    description: 'Created a post with 100+ upvotes',
    points: 50
  },
  COMMUNITY_FOUNDER: {
    id: 'community_founder',
    name: 'Community Founder',
    description: 'Created your first subcommunity',
    points: 100
  }
};

/**
 * Reputation Service Class
 */
export class ReputationService {
  constructor() {
    // In production, this would connect to a database
    this.userReputations = new Map();
    this.qarmaHistory = new Map();
  }

  /**
   * Get user reputation data
   */
  async getUserReputation(userId) {
    try {
      // Check if we have cached reputation data
      if (this.userReputations.has(userId)) {
        return this.userReputations.get(userId);
      }

      // Generate mock reputation based on user ID
      const reputation = await this.generateMockReputation(userId);
      this.userReputations.set(userId, reputation);
      
      return reputation;

    } catch (error) {
      console.error('[ReputationService] Error getting user reputation:', error);
      throw new Error('Failed to get user reputation');
    }
  }

  /**
   * Update user Qarma based on an action
   */
  async updateQarma(userId, action, context = {}) {
    try {
      const reputation = await this.getUserReputation(userId);
      const qarmaChange = QARMA_ACTIONS[action] || 0;

      if (qarmaChange === 0) {
        console.warn(`[ReputationService] Unknown action: ${action}`);
        return reputation;
      }

      // Update Qarma scores
      reputation.totalQarma += qarmaChange;
      
      // Update specific Qarma categories
      if (action.startsWith('POST_')) {
        reputation.postQarma += qarmaChange;
      } else if (action.startsWith('COMMENT_')) {
        reputation.commentQarma += qarmaChange;
      }

      // Update subcommunity-specific Qarma if context provided
      if (context.subcommunityId) {
        if (!reputation.subcommunityQarma[context.subcommunityId]) {
          reputation.subcommunityQarma[context.subcommunityId] = 0;
        }
        reputation.subcommunityQarma[context.subcommunityId] += qarmaChange;
      }

      // Add to Qarma history
      const historyEntry = {
        action,
        change: qarmaChange,
        timestamp: new Date().toISOString(),
        context
      };

      reputation.qarmaHistory.unshift(historyEntry);
      
      // Keep only last 100 history entries
      if (reputation.qarmaHistory.length > 100) {
        reputation.qarmaHistory = reputation.qarmaHistory.slice(0, 100);
      }

      // Check for new achievements
      await this.checkAchievements(userId, reputation, action, context);

      // Check for new badges
      await this.checkBadges(userId, reputation);

      // Update moderation level based on reputation
      this.updateModerationLevel(reputation);

      reputation.lastUpdated = new Date().toISOString();

      console.log(`[ReputationService] Updated Qarma for ${userId}: ${action} (${qarmaChange > 0 ? '+' : ''}${qarmaChange}) = ${reputation.totalQarma}`);

      return reputation;

    } catch (error) {
      console.error('[ReputationService] Error updating Qarma:', error);
      throw new Error('Failed to update Qarma');
    }
  }

  /**
   * Check and award achievements
   */
  async checkAchievements(userId, reputation, action, context) {
    const newAchievements = [];

    // First post achievement
    if (action === 'POST_CREATED' && !reputation.achievements.find(a => a.id === 'first_post')) {
      newAchievements.push({
        ...ACHIEVEMENTS.FIRST_POST,
        unlockedAt: new Date().toISOString()
      });
    }

    // First comment achievement
    if (action === 'COMMENT_CREATED' && !reputation.achievements.find(a => a.id === 'first_comment')) {
      newAchievements.push({
        ...ACHIEVEMENTS.FIRST_COMMENT,
        unlockedAt: new Date().toISOString()
      });
    }

    // First upvote achievement
    if ((action === 'POST_UPVOTED' || action === 'COMMENT_UPVOTED') && 
        !reputation.achievements.find(a => a.id === 'first_upvote')) {
      newAchievements.push({
        ...ACHIEVEMENTS.FIRST_UPVOTE,
        unlockedAt: new Date().toISOString()
      });
    }

    // Qarma milestone achievements
    if (reputation.totalQarma >= 100 && !reputation.achievements.find(a => a.id === 'hundred_qarma')) {
      newAchievements.push({
        ...ACHIEVEMENTS.HUNDRED_QARMA,
        unlockedAt: new Date().toISOString()
      });
    }

    if (reputation.totalQarma >= 1000 && !reputation.achievements.find(a => a.id === 'thousand_qarma')) {
      newAchievements.push({
        ...ACHIEVEMENTS.THOUSAND_QARMA,
        unlockedAt: new Date().toISOString()
      });
    }

    // Community founder achievement
    if (action === 'COMMUNITY_CREATED' && !reputation.achievements.find(a => a.id === 'community_founder')) {
      newAchievements.push({
        ...ACHIEVEMENTS.COMMUNITY_FOUNDER,
        unlockedAt: new Date().toISOString()
      });
    }

    // Add new achievements and award bonus Qarma
    for (const achievement of newAchievements) {
      reputation.achievements.push(achievement);
      reputation.totalQarma += achievement.points;
      
      console.log(`[ReputationService] Achievement unlocked for ${userId}: ${achievement.name} (+${achievement.points} Qarma)`);
    }
  }

  /**
   * Check and award badges
   */
  async checkBadges(userId, reputation) {
    const newBadges = [];

    // Helpful badge - 100+ comment upvotes
    if (reputation.commentQarma >= 200 && !reputation.badges.find(b => b.id === 'helpful')) {
      newBadges.push(BADGES.HELPFUL);
    }

    // Trusted member badge - 500+ total Qarma
    if (reputation.totalQarma >= 500 && !reputation.badges.find(b => b.id === 'trusted_member')) {
      newBadges.push(BADGES.TRUSTED_MEMBER);
    }

    // Moderator badge - has moderation rights
    if (reputation.moderationLevel !== 'none' && !reputation.badges.find(b => b.id === 'moderator')) {
      newBadges.push(BADGES.MODERATOR);
    }

    // Content creator badge - high post Qarma
    if (reputation.postQarma >= 500 && !reputation.badges.find(b => b.id === 'content_creator')) {
      newBadges.push(BADGES.CONTENT_CREATOR);
    }

    // Add new badges
    for (const badge of newBadges) {
      reputation.badges.push(badge);
      console.log(`[ReputationService] Badge earned by ${userId}: ${badge.name}`);
    }
  }

  /**
   * Update moderation level based on reputation
   */
  updateModerationLevel(reputation) {
    if (reputation.totalQarma >= 1000) {
      reputation.moderationLevel = 'global';
    } else if (reputation.totalQarma >= 500) {
      reputation.moderationLevel = 'community';
    } else {
      reputation.moderationLevel = 'none';
    }
  }

  /**
   * Check if user can moderate a subcommunity
   */
  async canModerate(userId, subcommunityId = null) {
    try {
      const reputation = await this.getUserReputation(userId);
      
      // Global moderators can moderate anywhere
      if (reputation.moderationLevel === 'global') {
        return true;
      }

      // Community moderators can moderate specific communities
      if (reputation.moderationLevel === 'community') {
        if (!subcommunityId) {
          return true; // Can moderate in general
        }
        return reputation.canModerate.includes(subcommunityId);
      }

      return false;

    } catch (error) {
      console.error('[ReputationService] Error checking moderation rights:', error);
      return false;
    }
  }

  /**
   * Add moderation rights for a subcommunity
   */
  async addModerationRights(userId, subcommunityId) {
    try {
      const reputation = await this.getUserReputation(userId);
      
      if (!reputation.canModerate.includes(subcommunityId)) {
        reputation.canModerate.push(subcommunityId);
        
        // Award Qarma for becoming a moderator
        await this.updateQarma(userId, 'BECAME_MODERATOR', { subcommunityId });
        
        console.log(`[ReputationService] Added moderation rights for ${userId} in ${subcommunityId}`);
      }

      return reputation;

    } catch (error) {
      console.error('[ReputationService] Error adding moderation rights:', error);
      throw new Error('Failed to add moderation rights');
    }
  }

  /**
   * Get leaderboard of top users by Qarma
   */
  async getLeaderboard(limit = 10, subcommunityId = null) {
    try {
      // In production, this would query the database
      // For now, generate mock leaderboard data
      const users = [];
      
      for (let i = 0; i < limit; i++) {
        const userId = `did:squid:user${i}`;
        const reputation = await this.getUserReputation(userId);
        
        users.push({
          userId,
          name: `User${i}`,
          totalQarma: reputation.totalQarma,
          badges: reputation.badges.slice(0, 3), // Show top 3 badges
          moderationLevel: reputation.moderationLevel
        });
      }

      // Sort by Qarma (descending)
      users.sort((a, b) => b.totalQarma - a.totalQarma);

      console.log(`[ReputationService] Generated leaderboard: ${users.length} users`);

      return users;

    } catch (error) {
      console.error('[ReputationService] Error getting leaderboard:', error);
      throw new Error('Failed to get leaderboard');
    }
  }

  /**
   * Generate mock reputation data for development
   */
  async generateMockReputation(userId) {
    // Create deterministic but varied reputation based on user ID
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const seed = parseInt(hash.substring(0, 8), 16);
    
    // Use seed to generate consistent but varied values
    const baseQarma = (seed % 1000) + 50; // 50-1049 base Qarma
    const postQarma = Math.floor(baseQarma * 0.6);
    const commentQarma = baseQarma - postQarma;
    
    const reputation = {
      userId,
      totalQarma: baseQarma,
      postQarma,
      commentQarma,
      subcommunityQarma: {
        'community_1': Math.floor(baseQarma * 0.3),
        'community_2': Math.floor(baseQarma * 0.2)
      },
      badges: [],
      achievements: [],
      moderationLevel: 'none',
      canModerate: [],
      qarmaHistory: [
        {
          action: 'POST_UPVOTED',
          change: 10,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          context: {}
        },
        {
          action: 'COMMENT_CREATED',
          change: 2,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          context: {}
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    // Add some badges based on Qarma level
    if (baseQarma >= 100) {
      reputation.badges.push(BADGES.EARLY_ADOPTER);
    }
    if (commentQarma >= 200) {
      reputation.badges.push(BADGES.HELPFUL);
    }
    if (baseQarma >= 500) {
      reputation.badges.push(BADGES.TRUSTED_MEMBER);
    }

    // Add some achievements
    reputation.achievements.push({
      ...ACHIEVEMENTS.FIRST_POST,
      unlockedAt: new Date(Date.now() - 30 * 86400000).toISOString()
    });

    if (baseQarma >= 100) {
      reputation.achievements.push({
        ...ACHIEVEMENTS.HUNDRED_QARMA,
        unlockedAt: new Date(Date.now() - 15 * 86400000).toISOString()
      });
    }

    // Set moderation level
    this.updateModerationLevel(reputation);

    // Add some moderation rights for community moderators
    if (reputation.moderationLevel === 'community') {
      reputation.canModerate = ['community_1'];
    }

    return reputation;
  }

  /**
   * Reset user reputation (admin function)
   */
  async resetReputation(userId) {
    try {
      this.userReputations.delete(userId);
      this.qarmaHistory.delete(userId);
      
      console.log(`[ReputationService] Reset reputation for ${userId}`);
      
      return await this.getUserReputation(userId);

    } catch (error) {
      console.error('[ReputationService] Error resetting reputation:', error);
      throw new Error('Failed to reset reputation');
    }
  }

  /**
   * Get reputation statistics
   */
  async getReputationStats() {
    try {
      // In production, this would query database aggregations
      const stats = {
        totalUsers: this.userReputations.size || 1000,
        averageQarma: 250,
        totalQarmaAwarded: 250000,
        topUser: {
          userId: 'did:squid:topuser',
          qarma: 2500
        },
        badgesAwarded: {
          early_adopter: 100,
          helpful: 50,
          trusted_member: 25,
          moderator: 10,
          community_builder: 5,
          content_creator: 15
        },
        achievementsUnlocked: {
          first_post: 800,
          first_comment: 900,
          hundred_qarma: 300,
          thousand_qarma: 50,
          community_founder: 20
        }
      };

      return stats;

    } catch (error) {
      console.error('[ReputationService] Error getting reputation stats:', error);
      throw new Error('Failed to get reputation statistics');
    }
  }
}

// Export singleton instance
export const reputationService = new ReputationService();
export default reputationService;