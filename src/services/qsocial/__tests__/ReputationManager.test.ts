import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserReputation, Badge, Achievement, QarmaEvent } from '../../../types/qsocial';

// Mock reputation manager implementation
class ReputationManager {
  private reputations = new Map<string, UserReputation>();
  private qarmaHistory = new Map<string, QarmaEvent[]>();

  // Qarma action values
  private readonly QARMA_VALUES = {
    POST_CREATED: 5,
    POST_UPVOTED: 10,
    POST_DOWNVOTED: -5,
    COMMENT_CREATED: 2,
    COMMENT_UPVOTED: 5,
    COMMENT_DOWNVOTED: -2,
    COMMUNITY_CREATED: 50,
    BECAME_MODERATOR: 100,
    HELPFUL_VOTE: 1,
  };

  // Badge definitions
  private readonly BADGES: Record<string, Badge> = {
    EARLY_ADOPTER: {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'One of the first users',
      icon: '🌟',
      earnedAt: new Date(),
    },
    HELPFUL: {
      id: 'helpful',
      name: 'Helpful',
      description: 'Received many upvotes',
      icon: '🤝',
      earnedAt: new Date(),
    },
    COMMUNITY_BUILDER: {
      id: 'community_builder',
      name: 'Community Builder',
      description: 'Built successful communities',
      icon: '🏗️',
      earnedAt: new Date(),
    },
  };

  // Achievement definitions
  private readonly ACHIEVEMENTS: Record<string, Omit<Achievement, 'unlockedAt'>> = {
    FIRST_POST: {
      id: 'first_post',
      name: 'First Post',
      description: 'Created your first post',
      category: 'content',
      points: 10,
    },
    HUNDRED_QARMA: {
      id: 'hundred_qarma',
      name: 'Century Club',
      description: 'Reached 100 Qarma',
      category: 'reputation',
      points: 25,
    },
    THOUSAND_QARMA: {
      id: 'thousand_qarma',
      name: 'Karma Master',
      description: 'Reached 1000 Qarma',
      category: 'reputation',
      points: 100,
    },
  };

  async getUserReputation(userId: string): Promise<UserReputation> {
    if (!this.reputations.has(userId)) {
      const newReputation: UserReputation = {
        userId,
        totalQarma: 0,
        postQarma: 0,
        commentQarma: 0,
        subcommunityQarma: {},
        badges: [],
        achievements: [],
        moderationLevel: 'none',
        canModerate: [],
        qarmaHistory: [],
        lastUpdated: new Date(),
      };
      this.reputations.set(userId, newReputation);
    }
    
    return this.reputations.get(userId)!;
  }

  async updateQarma(
    userId: string, 
    action: string, 
    context: { subcommunityId?: string; targetId?: string } = {}
  ): Promise<UserReputation> {
    const reputation = await this.getUserReputation(userId);
    const qarmaChange = this.QARMA_VALUES[action as keyof typeof this.QARMA_VALUES] || 0;

    if (qarmaChange === 0) {
      return reputation;
    }

    // Update total Qarma
    reputation.totalQarma += qarmaChange;

    // Update category-specific Qarma
    if (action.startsWith('POST_')) {
      reputation.postQarma += qarmaChange;
    } else if (action.startsWith('COMMENT_')) {
      reputation.commentQarma += qarmaChange;
    }

    // Update subcommunity-specific Qarma
    if (context.subcommunityId) {
      if (!reputation.subcommunityQarma[context.subcommunityId]) {
        reputation.subcommunityQarma[context.subcommunityId] = 0;
      }
      reputation.subcommunityQarma[context.subcommunityId] += qarmaChange;
    }

    // Add to history
    const historyEntry: QarmaEvent = {
      id: `event-${Date.now()}`,
      type: action as any,
      points: qarmaChange,
      sourceId: context.targetId || 'unknown',
      subcommunityId: context.subcommunityId,
      timestamp: new Date(),
    };

    reputation.qarmaHistory.unshift(historyEntry);
    
    // Keep only last 100 entries
    if (reputation.qarmaHistory.length > 100) {
      reputation.qarmaHistory = reputation.qarmaHistory.slice(0, 100);
    }

    // Check for new achievements and badges
    await this.checkAchievements(reputation, action);
    await this.checkBadges(reputation);
    
    // Update moderation level
    this.updateModerationLevel(reputation);

    reputation.lastUpdated = new Date();
    return reputation;
  }

  private async checkAchievements(reputation: UserReputation, action: string): Promise<void> {
    const newAchievements: Achievement[] = [];

    // First post achievement
    if (action === 'POST_CREATED' && !reputation.achievements.find(a => a.id === 'first_post')) {
      newAchievements.push({
        ...this.ACHIEVEMENTS.FIRST_POST,
        unlockedAt: new Date(),
      });
    }

    // Qarma milestone achievements
    if (reputation.totalQarma >= 100 && !reputation.achievements.find(a => a.id === 'hundred_qarma')) {
      newAchievements.push({
        ...this.ACHIEVEMENTS.HUNDRED_QARMA,
        unlockedAt: new Date(),
      });
    }

    if (reputation.totalQarma >= 1000 && !reputation.achievements.find(a => a.id === 'thousand_qarma')) {
      newAchievements.push({
        ...this.ACHIEVEMENTS.THOUSAND_QARMA,
        unlockedAt: new Date(),
      });
    }

    // Add achievements and bonus Qarma
    for (const achievement of newAchievements) {
      reputation.achievements.push(achievement);
      reputation.totalQarma += achievement.points;
    }
  }

  private async checkBadges(reputation: UserReputation): Promise<void> {
    const newBadges: Badge[] = [];

    // Helpful badge - high comment Qarma
    if (reputation.commentQarma >= 100 && !reputation.badges.find(b => b.id === 'helpful')) {
      newBadges.push(this.BADGES.HELPFUL);
    }

    // Community builder badge - created communities
    const communityQarmaSum = Object.values(reputation.subcommunityQarma).reduce((sum, qarma) => sum + qarma, 0);
    if (communityQarmaSum >= 200 && !reputation.badges.find(b => b.id === 'community_builder')) {
      newBadges.push(this.BADGES.COMMUNITY_BUILDER);
    }

    reputation.badges.push(...newBadges);
  }

  private updateModerationLevel(reputation: UserReputation): void {
    if (reputation.totalQarma >= 1000) {
      reputation.moderationLevel = 'global';
    } else if (reputation.totalQarma >= 500) {
      reputation.moderationLevel = 'community';
    } else {
      reputation.moderationLevel = 'none';
    }
  }

  async canModerate(userId: string, subcommunityId?: string): Promise<boolean> {
    const reputation = await this.getUserReputation(userId);
    
    if (reputation.moderationLevel === 'global') {
      return true;
    }
    
    if (reputation.moderationLevel === 'community') {
      return !subcommunityId || reputation.canModerate.includes(subcommunityId);
    }
    
    return false;
  }

  async addModerationRights(userId: string, subcommunityId: string): Promise<UserReputation> {
    const reputation = await this.getUserReputation(userId);
    
    if (!reputation.canModerate.includes(subcommunityId)) {
      reputation.canModerate.push(subcommunityId);
      await this.updateQarma(userId, 'BECAME_MODERATOR', { subcommunityId });
    }
    
    return reputation;
  }

  async getLeaderboard(limit: number = 10, subcommunityId?: string): Promise<Array<{
    userId: string;
    totalQarma: number;
    badges: Badge[];
    moderationLevel: string;
  }>> {
    const users = Array.from(this.reputations.entries())
      .map(([userId, reputation]) => ({
        userId,
        totalQarma: subcommunityId 
          ? (reputation.subcommunityQarma[subcommunityId] || 0)
          : reputation.totalQarma,
        badges: reputation.badges.slice(0, 3),
        moderationLevel: reputation.moderationLevel,
      }))
      .sort((a, b) => b.totalQarma - a.totalQarma)
      .slice(0, limit);

    return users;
  }

  async getQarmaStatistics(): Promise<{
    totalUsers: number;
    averageQarma: number;
    totalQarmaAwarded: number;
    topUser: { userId: string; qarma: number };
  }> {
    const reputations = Array.from(this.reputations.values());
    
    if (reputations.length === 0) {
      return {
        totalUsers: 0,
        averageQarma: 0,
        totalQarmaAwarded: 0,
        topUser: { userId: '', qarma: 0 },
      };
    }

    const totalQarma = reputations.reduce((sum, rep) => sum + rep.totalQarma, 0);
    const topUser = reputations.reduce((top, rep) => 
      rep.totalQarma > top.totalQarma ? rep : top
    );

    return {
      totalUsers: reputations.length,
      averageQarma: Math.floor(totalQarma / reputations.length),
      totalQarmaAwarded: totalQarma,
      topUser: { userId: topUser.userId, qarma: topUser.totalQarma },
    };
  }

  async resetReputation(userId: string): Promise<UserReputation> {
    this.reputations.delete(userId);
    this.qarmaHistory.delete(userId);
    return this.getUserReputation(userId);
  }

  // Utility methods for testing
  getQarmaHistory(userId: string): QarmaEvent[] {
    return this.qarmaHistory.get(userId) || [];
  }

  calculateQarmaDecay(baseQarma: number, ageInDays: number): number {
    // Simple decay function: 1% per day
    const decayRate = 0.01;
    const decayFactor = Math.pow(1 - decayRate, ageInDays);
    return Math.floor(baseQarma * decayFactor);
  }

  isQarmaInflated(userId: string, timeWindow: number = 24 * 60 * 60 * 1000): boolean {
    const reputation = this.reputations.get(userId);
    if (!reputation) return false;

    const recentEvents = reputation.qarmaHistory.filter(
      event => Date.now() - event.timestamp.getTime() < timeWindow
    );

    const recentQarma = recentEvents.reduce((sum, event) => sum + event.points, 0);
    
    // Flag as inflated if more than 50% of total Qarma was gained in the time window
    return recentQarma > reputation.totalQarma * 0.5;
  }
}

describe('ReputationManager', () => {
  let reputationManager: ReputationManager;
  const testUserId = 'did:squid:testuser';

  beforeEach(() => {
    reputationManager = new ReputationManager();
  });

  describe('getUserReputation', () => {
    it('should create new reputation for new user', async () => {
      const reputation = await reputationManager.getUserReputation(testUserId);

      expect(reputation.userId).toBe(testUserId);
      expect(reputation.totalQarma).toBe(0);
      expect(reputation.postQarma).toBe(0);
      expect(reputation.commentQarma).toBe(0);
      expect(reputation.badges).toEqual([]);
      expect(reputation.achievements).toEqual([]);
      expect(reputation.moderationLevel).toBe('none');
    });

    it('should return existing reputation for existing user', async () => {
      // Create initial reputation
      await reputationManager.getUserReputation(testUserId);
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');

      // Get reputation again
      const reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.totalQarma).toBe(15); // 5 + 10 from first post achievement
    });
  });

  describe('updateQarma', () => {
    it('should update Qarma for post creation', async () => {
      const reputation = await reputationManager.updateQarma(testUserId, 'POST_CREATED');

      expect(reputation.totalQarma).toBe(15); // 5 + 10 from first post achievement
      expect(reputation.postQarma).toBe(5);
      expect(reputation.commentQarma).toBe(0);
      expect(reputation.qarmaHistory).toHaveLength(1);
      expect(reputation.qarmaHistory[0].type).toBe('POST_CREATED');
      expect(reputation.qarmaHistory[0].points).toBe(5);
    });

    it('should update Qarma for comment upvote', async () => {
      const reputation = await reputationManager.updateQarma(testUserId, 'COMMENT_UPVOTED');

      expect(reputation.totalQarma).toBe(5);
      expect(reputation.postQarma).toBe(0);
      expect(reputation.commentQarma).toBe(5);
    });

    it('should handle negative Qarma changes', async () => {
      // First gain some Qarma
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');
      
      // Then lose some
      const reputation = await reputationManager.updateQarma(testUserId, 'POST_DOWNVOTED');

      expect(reputation.totalQarma).toBe(10); // 15 - 5 = 10 (15 includes achievement bonus)
      expect(reputation.postQarma).toBe(0); // 5 - 5 = 0
    });

    it('should update subcommunity-specific Qarma', async () => {
      const subcommunityId = 'test-community';
      const reputation = await reputationManager.updateQarma(
        testUserId, 
        'POST_UPVOTED', 
        { subcommunityId }
      );

      expect(reputation.subcommunityQarma[subcommunityId]).toBe(10);
    });

    it('should ignore unknown actions', async () => {
      const reputation = await reputationManager.updateQarma(testUserId, 'UNKNOWN_ACTION');

      expect(reputation.totalQarma).toBe(0);
      expect(reputation.qarmaHistory).toHaveLength(0);
    });

    it('should limit Qarma history to 100 entries', async () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        await reputationManager.updateQarma(testUserId, 'HELPFUL_VOTE');
      }

      const reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.qarmaHistory).toHaveLength(100);
    });
  });

  describe('achievement system', () => {
    it('should award first post achievement', async () => {
      const reputation = await reputationManager.updateQarma(testUserId, 'POST_CREATED');

      expect(reputation.achievements).toHaveLength(1);
      expect(reputation.achievements[0].id).toBe('first_post');
      expect(reputation.totalQarma).toBe(15); // 5 + 10 bonus
    });

    it('should award hundred Qarma achievement', async () => {
      // Gain enough Qarma to reach 100
      for (let i = 0; i < 10; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');
      }

      const reputation = await reputationManager.getUserReputation(testUserId);
      
      expect(reputation.totalQarma).toBeGreaterThanOrEqual(100);
      expect(reputation.achievements.find(a => a.id === 'hundred_qarma')).toBeDefined();
    });

    it('should not award duplicate achievements', async () => {
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');

      const reputation = await reputationManager.getUserReputation(testUserId);
      const firstPostAchievements = reputation.achievements.filter(a => a.id === 'first_post');
      expect(firstPostAchievements).toHaveLength(1);
    });
  });

  describe('badge system', () => {
    it('should award helpful badge for high comment Qarma', async () => {
      // Gain enough comment Qarma
      for (let i = 0; i < 20; i++) {
        await reputationManager.updateQarma(testUserId, 'COMMENT_UPVOTED');
      }

      const reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.badges.find(b => b.id === 'helpful')).toBeDefined();
    });

    it('should award community builder badge', async () => {
      const subcommunityId = 'test-community';
      
      // Gain Qarma in a subcommunity
      for (let i = 0; i < 20; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED', { subcommunityId });
      }

      const reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.badges.find(b => b.id === 'community_builder')).toBeDefined();
    });
  });

  describe('moderation system', () => {
    it('should update moderation level based on Qarma', async () => {
      // Start with no moderation rights
      let reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.moderationLevel).toBe('none');

      // Gain enough Qarma for community moderation
      for (let i = 0; i < 50; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');
      }

      reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.moderationLevel).toBe('community');

      // Gain enough Qarma for global moderation
      for (let i = 0; i < 50; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');
      }

      reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.moderationLevel).toBe('global');
    });

    it('should check moderation permissions correctly', async () => {
      // User with no Qarma cannot moderate
      expect(await reputationManager.canModerate(testUserId)).toBe(false);

      // Gain community-level Qarma
      for (let i = 0; i < 50; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');
      }

      // Can moderate in general but not specific communities without rights
      expect(await reputationManager.canModerate(testUserId)).toBe(true);
      expect(await reputationManager.canModerate(testUserId, 'specific-community')).toBe(false);

      // Add specific moderation rights
      await reputationManager.addModerationRights(testUserId, 'specific-community');
      expect(await reputationManager.canModerate(testUserId, 'specific-community')).toBe(true);
    });

    it('should award Qarma for becoming moderator', async () => {
      const initialReputation = await reputationManager.getUserReputation(testUserId);
      const initialQarma = initialReputation.totalQarma;

      await reputationManager.addModerationRights(testUserId, 'test-community');

      const updatedReputation = await reputationManager.getUserReputation(testUserId);
      // The user gets 100 for becoming moderator, plus potential achievement bonuses
      expect(updatedReputation.totalQarma).toBeGreaterThanOrEqual(initialQarma + 100);
      expect(updatedReputation.canModerate).toContain('test-community');
    });
  });

  describe('leaderboard', () => {
    it('should return users sorted by Qarma', async () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const user3 = 'user3';

      // Give different amounts of Qarma
      await reputationManager.updateQarma(user1, 'POST_UPVOTED'); // 10
      await reputationManager.updateQarma(user2, 'COMMUNITY_CREATED'); // 50
      await reputationManager.updateQarma(user3, 'POST_CREATED'); // 15 (5 + 10 achievement)

      const leaderboard = await reputationManager.getLeaderboard(3);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].userId).toBe(user2);
      expect(leaderboard[0].totalQarma).toBe(50);
      expect(leaderboard[1].userId).toBe(user3);
      expect(leaderboard[1].totalQarma).toBe(15);
      expect(leaderboard[2].userId).toBe(user1);
      expect(leaderboard[2].totalQarma).toBe(10);
    });

    it('should return subcommunity-specific leaderboard', async () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const subcommunityId = 'test-community';

      await reputationManager.updateQarma(user1, 'POST_UPVOTED', { subcommunityId }); // 10 in community
      await reputationManager.updateQarma(user1, 'POST_UPVOTED'); // 10 global (not in community)
      await reputationManager.updateQarma(user2, 'COMMENT_UPVOTED', { subcommunityId }); // 5 in community

      const leaderboard = await reputationManager.getLeaderboard(2, subcommunityId);

      expect(leaderboard[0].userId).toBe(user1);
      expect(leaderboard[0].totalQarma).toBe(10); // Only community Qarma
      expect(leaderboard[1].userId).toBe(user2);
      expect(leaderboard[1].totalQarma).toBe(5);
    });
  });

  describe('statistics', () => {
    it('should calculate correct statistics', async () => {
      const user1 = 'user1';
      const user2 = 'user2';

      await reputationManager.updateQarma(user1, 'POST_UPVOTED'); // 10
      await reputationManager.updateQarma(user2, 'COMMUNITY_CREATED'); // 50

      const stats = await reputationManager.getQarmaStatistics();

      expect(stats.totalUsers).toBe(2);
      expect(stats.averageQarma).toBe(30); // (10 + 50) / 2
      expect(stats.totalQarmaAwarded).toBe(60);
      expect(stats.topUser.userId).toBe(user2);
      expect(stats.topUser.qarma).toBe(50);
    });

    it('should handle empty statistics', async () => {
      const stats = await reputationManager.getQarmaStatistics();

      expect(stats.totalUsers).toBe(0);
      expect(stats.averageQarma).toBe(0);
      expect(stats.totalQarmaAwarded).toBe(0);
      expect(stats.topUser.userId).toBe('');
      expect(stats.topUser.qarma).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should calculate Qarma decay correctly', () => {
      const baseQarma = 100;
      
      const noDayDecay = reputationManager.calculateQarmaDecay(baseQarma, 0);
      expect(noDayDecay).toBe(100);

      const oneDayDecay = reputationManager.calculateQarmaDecay(baseQarma, 1);
      expect(oneDayDecay).toBe(99); // 1% decay

      const hundredDayDecay = reputationManager.calculateQarmaDecay(baseQarma, 100);
      expect(hundredDayDecay).toBeLessThan(50); // Significant decay
    });

    it('should detect Qarma inflation', async () => {
      // Normal Qarma gain over time
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');
      expect(reputationManager.isQarmaInflated(testUserId)).toBe(false);

      // Rapid Qarma gain (inflation)
      for (let i = 0; i < 20; i++) {
        await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');
      }

      expect(reputationManager.isQarmaInflated(testUserId)).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should reset user reputation completely', async () => {
      // Build up reputation
      await reputationManager.updateQarma(testUserId, 'POST_CREATED');
      await reputationManager.updateQarma(testUserId, 'POST_UPVOTED');

      let reputation = await reputationManager.getUserReputation(testUserId);
      expect(reputation.totalQarma).toBeGreaterThan(0);

      // Reset reputation
      reputation = await reputationManager.resetReputation(testUserId);

      expect(reputation.totalQarma).toBe(0);
      expect(reputation.postQarma).toBe(0);
      expect(reputation.commentQarma).toBe(0);
      expect(reputation.badges).toEqual([]);
      expect(reputation.achievements).toEqual([]);
      expect(reputation.moderationLevel).toBe('none');
      expect(reputation.qarmaHistory).toEqual([]);
    });
  });
});