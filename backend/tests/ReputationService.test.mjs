/**
 * Unit tests for ReputationService
 * Tests Qarma calculations, achievements, badges, and reputation management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReputationService, QARMA_ACTIONS, BADGES, ACHIEVEMENTS } from '../services/ReputationService.mjs';

describe('ReputationService', () => {
  let reputationService;
  
  beforeEach(() => {
    reputationService = new ReputationService();
  });

  describe('getUserReputation', () => {
    it('should generate consistent reputation for the same user ID', async () => {
      const userId = 'did:squid:testuser123';
      
      const reputation1 = await reputationService.getUserReputation(userId);
      const reputation2 = await reputationService.getUserReputation(userId);
      
      expect(reputation1.userId).toBe(userId);
      expect(reputation1.totalQarma).toBe(reputation2.totalQarma);
      expect(reputation1.postQarma).toBe(reputation2.postQarma);
      expect(reputation1.commentQarma).toBe(reputation2.commentQarma);
    });

    it('should generate different reputation for different users', async () => {
      const user1 = 'did:squid:user1';
      const user2 = 'did:squid:user2';
      
      const reputation1 = await reputationService.getUserReputation(user1);
      const reputation2 = await reputationService.getUserReputation(user2);
      
      expect(reputation1.userId).toBe(user1);
      expect(reputation2.userId).toBe(user2);
      // Very unlikely to have exactly the same Qarma
      expect(reputation1.totalQarma).not.toBe(reputation2.totalQarma);
    });

    it('should include all required reputation fields', async () => {
      const userId = 'did:squid:testuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      expect(reputation).toHaveProperty('userId');
      expect(reputation).toHaveProperty('totalQarma');
      expect(reputation).toHaveProperty('postQarma');
      expect(reputation).toHaveProperty('commentQarma');
      expect(reputation).toHaveProperty('subcommunityQarma');
      expect(reputation).toHaveProperty('badges');
      expect(reputation).toHaveProperty('achievements');
      expect(reputation).toHaveProperty('moderationLevel');
      expect(reputation).toHaveProperty('canModerate');
      expect(reputation).toHaveProperty('qarmaHistory');
      expect(reputation).toHaveProperty('lastUpdated');
    });
  });

  describe('updateQarma', () => {
    it('should update Qarma history for post creation', async () => {
      const userId = 'did:squid:postcreator123';
      const initialReputation = await reputationService.getUserReputation(userId);
      const initialHistoryLength = initialReputation.qarmaHistory.length;
      
      const updatedReputation = await reputationService.updateQarma(userId, 'POST_CREATED');
      
      // Should add entry to history
      expect(updatedReputation.qarmaHistory.length).toBe(initialHistoryLength + 1);
      expect(updatedReputation.qarmaHistory[0].action).toBe('POST_CREATED');
      expect(updatedReputation.qarmaHistory[0].change).toBe(QARMA_ACTIONS.POST_CREATED);
    });

    it('should update comment Qarma for comment creation', async () => {
      const userId = 'did:squid:commentcreator456';
      const initialReputation = await reputationService.getUserReputation(userId);
      
      const updatedReputation = await reputationService.updateQarma(userId, 'COMMENT_CREATED');
      
      // Should update comment Qarma specifically
      expect(updatedReputation.commentQarma).toBe(initialReputation.commentQarma + QARMA_ACTIONS.COMMENT_CREATED);
    });

    it('should update post Qarma for post upvotes', async () => {
      const userId = 'did:squid:upvoter789';
      const initialReputation = await reputationService.getUserReputation(userId);
      
      const updatedReputation = await reputationService.updateQarma(userId, 'POST_UPVOTED');
      
      // Should update post Qarma specifically
      expect(updatedReputation.postQarma).toBe(initialReputation.postQarma + QARMA_ACTIONS.POST_UPVOTED);
    });

    it('should handle negative Qarma actions', async () => {
      const userId = 'did:squid:downvoter321';
      const initialReputation = await reputationService.getUserReputation(userId);
      
      const updatedReputation = await reputationService.updateQarma(userId, 'POST_DOWNVOTED');
      
      // Should apply negative Qarma change
      expect(updatedReputation.postQarma).toBe(initialReputation.postQarma + QARMA_ACTIONS.POST_DOWNVOTED);
      expect(updatedReputation.qarmaHistory[0].change).toBe(QARMA_ACTIONS.POST_DOWNVOTED);
    });

    it('should update subcommunity-specific Qarma when context provided', async () => {
      const userId = 'did:squid:subcommunityuser654';
      const subcommunityId = 'community_test';
      const initialReputation = await reputationService.getUserReputation(userId);
      const initialSubQarma = initialReputation.subcommunityQarma[subcommunityId] || 0;
      
      const updatedReputation = await reputationService.updateQarma(
        userId, 
        'POST_CREATED', 
        { subcommunityId }
      );
      
      // Should update subcommunity Qarma
      expect(updatedReputation.subcommunityQarma[subcommunityId]).toBe(
        initialSubQarma + QARMA_ACTIONS.POST_CREATED
      );
    });

    it('should add entries to Qarma history', async () => {
      const userId = 'did:squid:testuser123';
      const initialReputation = await reputationService.getUserReputation(userId);
      const initialHistoryLength = initialReputation.qarmaHistory.length;
      
      const updatedReputation = await reputationService.updateQarma(userId, 'POST_CREATED');
      
      expect(updatedReputation.qarmaHistory.length).toBe(initialHistoryLength + 1);
      expect(updatedReputation.qarmaHistory[0].action).toBe('POST_CREATED');
      expect(updatedReputation.qarmaHistory[0].change).toBe(QARMA_ACTIONS.POST_CREATED);
    });

    it('should handle unknown actions gracefully', async () => {
      const userId = 'did:squid:testuser123';
      const initialReputation = await reputationService.getUserReputation(userId);
      
      const updatedReputation = await reputationService.updateQarma(userId, 'UNKNOWN_ACTION');
      
      expect(updatedReputation.totalQarma).toBe(initialReputation.totalQarma);
    });
  });

  describe('checkAchievements', () => {
    it('should award first post achievement', async () => {
      const userId = 'did:squid:newuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Remove any existing first post achievement for clean test
      reputation.achievements = reputation.achievements.filter(a => a.id !== 'first_post');
      const initialQarma = reputation.totalQarma;
      
      await reputationService.checkAchievements(userId, reputation, 'POST_CREATED', {});
      
      const firstPostAchievement = reputation.achievements.find(a => a.id === 'first_post');
      expect(firstPostAchievement).toBeDefined();
      expect(firstPostAchievement.name).toBe('First Post');
      expect(reputation.totalQarma).toBe(initialQarma + ACHIEVEMENTS.FIRST_POST.points);
    });

    it('should award first comment achievement', async () => {
      const userId = 'did:squid:newuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Remove any existing first comment achievement for clean test
      reputation.achievements = reputation.achievements.filter(a => a.id !== 'first_comment');
      const initialQarma = reputation.totalQarma;
      
      await reputationService.checkAchievements(userId, reputation, 'COMMENT_CREATED', {});
      
      const firstCommentAchievement = reputation.achievements.find(a => a.id === 'first_comment');
      expect(firstCommentAchievement).toBeDefined();
      expect(firstCommentAchievement.name).toBe('First Comment');
      expect(reputation.totalQarma).toBe(initialQarma + ACHIEVEMENTS.FIRST_COMMENT.points);
    });

    it('should award Qarma milestone achievements', async () => {
      const userId = 'did:squid:newuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Set Qarma to just below 100 threshold
      reputation.totalQarma = 99;
      reputation.achievements = reputation.achievements.filter(a => a.id !== 'hundred_qarma');
      
      // Simulate an action that brings total above 100
      reputation.totalQarma = 105;
      
      await reputationService.checkAchievements(userId, reputation, 'POST_UPVOTED', {});
      
      const hundredQarmaAchievement = reputation.achievements.find(a => a.id === 'hundred_qarma');
      expect(hundredQarmaAchievement).toBeDefined();
      expect(hundredQarmaAchievement.name).toBe('Century Club');
    });

    it('should not award duplicate achievements', async () => {
      const userId = 'did:squid:newuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Add first post achievement manually
      reputation.achievements.push({
        ...ACHIEVEMENTS.FIRST_POST,
        unlockedAt: new Date().toISOString()
      });
      
      const initialAchievementCount = reputation.achievements.length;
      const initialQarma = reputation.totalQarma;
      
      await reputationService.checkAchievements(userId, reputation, 'POST_CREATED', {});
      
      // Should not add duplicate achievement or bonus Qarma
      expect(reputation.achievements.length).toBe(initialAchievementCount);
      expect(reputation.totalQarma).toBe(initialQarma);
    });
  });

  describe('checkBadges', () => {
    it('should award helpful badge for high comment Qarma', async () => {
      const userId = 'did:squid:helpfuluser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Set high comment Qarma
      reputation.commentQarma = 250;
      reputation.badges = reputation.badges.filter(b => b.id !== 'helpful');
      
      await reputationService.checkBadges(userId, reputation);
      
      const helpfulBadge = reputation.badges.find(b => b.id === 'helpful');
      expect(helpfulBadge).toBeDefined();
      expect(helpfulBadge.name).toBe('Helpful');
    });

    it('should award trusted member badge for high total Qarma', async () => {
      const userId = 'did:squid:trusteduser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Set high total Qarma
      reputation.totalQarma = 600;
      reputation.badges = reputation.badges.filter(b => b.id !== 'trusted_member');
      
      await reputationService.checkBadges(userId, reputation);
      
      const trustedBadge = reputation.badges.find(b => b.id === 'trusted_member');
      expect(trustedBadge).toBeDefined();
      expect(trustedBadge.name).toBe('Trusted Member');
    });

    it('should award moderator badge for users with moderation rights', async () => {
      const userId = 'did:squid:moderatoruser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      // Set moderation level
      reputation.moderationLevel = 'community';
      reputation.badges = reputation.badges.filter(b => b.id !== 'moderator');
      
      await reputationService.checkBadges(userId, reputation);
      
      const moderatorBadge = reputation.badges.find(b => b.id === 'moderator');
      expect(moderatorBadge).toBeDefined();
      expect(moderatorBadge.name).toBe('Moderator');
    });
  });

  describe('updateModerationLevel', () => {
    it('should set global moderation for high Qarma users', async () => {
      const userId = 'did:squid:globalmod123';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.totalQarma = 1500;
      reputationService.updateModerationLevel(reputation);
      
      expect(reputation.moderationLevel).toBe('global');
    });

    it('should set community moderation for medium Qarma users', async () => {
      const userId = 'did:squid:communitymod123';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.totalQarma = 750;
      reputationService.updateModerationLevel(reputation);
      
      expect(reputation.moderationLevel).toBe('community');
    });

    it('should set no moderation for low Qarma users', async () => {
      const userId = 'did:squid:newuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.totalQarma = 100;
      reputationService.updateModerationLevel(reputation);
      
      expect(reputation.moderationLevel).toBe('none');
    });
  });

  describe('canModerate', () => {
    it('should allow global moderators to moderate anywhere', async () => {
      const userId = 'did:squid:globalmod123';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.moderationLevel = 'global';
      reputationService.userReputations.set(userId, reputation);
      
      const canModerate = await reputationService.canModerate(userId, 'any_community');
      expect(canModerate).toBe(true);
    });

    it('should allow community moderators to moderate specific communities', async () => {
      const userId = 'did:squid:communitymod123';
      const subcommunityId = 'community_test';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.moderationLevel = 'community';
      reputation.canModerate = [subcommunityId];
      reputationService.userReputations.set(userId, reputation);
      
      const canModerate = await reputationService.canModerate(userId, subcommunityId);
      expect(canModerate).toBe(true);
      
      const cannotModerate = await reputationService.canModerate(userId, 'other_community');
      expect(cannotModerate).toBe(false);
    });

    it('should not allow regular users to moderate', async () => {
      const userId = 'did:squid:regularuser123';
      const reputation = await reputationService.getUserReputation(userId);
      
      reputation.moderationLevel = 'none';
      reputationService.userReputations.set(userId, reputation);
      
      const canModerate = await reputationService.canModerate(userId, 'any_community');
      expect(canModerate).toBe(false);
    });
  });

  describe('addModerationRights', () => {
    it('should add moderation rights for a subcommunity', async () => {
      const userId = 'did:squid:newmod987';
      const subcommunityId = 'community_test';
      const initialReputation = await reputationService.getUserReputation(userId);
      
      const updatedReputation = await reputationService.addModerationRights(userId, subcommunityId);
      
      expect(updatedReputation.canModerate).toContain(subcommunityId);
      // Should have added moderation rights
      expect(updatedReputation.canModerate.length).toBeGreaterThan(initialReputation.canModerate.length);
    });

    it('should not add duplicate moderation rights', async () => {
      const userId = 'did:squid:existingmod123';
      const subcommunityId = 'community_test';
      
      // Add moderation rights first time
      await reputationService.addModerationRights(userId, subcommunityId);
      const firstReputation = await reputationService.getUserReputation(userId);
      
      // Try to add same rights again
      await reputationService.addModerationRights(userId, subcommunityId);
      const secondReputation = await reputationService.getUserReputation(userId);
      
      expect(secondReputation.canModerate.filter(id => id === subcommunityId).length).toBe(1);
      expect(secondReputation.totalQarma).toBe(firstReputation.totalQarma);
    });
  });

  describe('getLeaderboard', () => {
    it('should return users sorted by Qarma', async () => {
      const leaderboard = await reputationService.getLeaderboard(5);
      
      expect(leaderboard).toHaveLength(5);
      expect(leaderboard[0]).toHaveProperty('userId');
      expect(leaderboard[0]).toHaveProperty('totalQarma');
      expect(leaderboard[0]).toHaveProperty('badges');
      expect(leaderboard[0]).toHaveProperty('moderationLevel');
      
      // Check if sorted by Qarma (descending)
      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i - 1].totalQarma).toBeGreaterThanOrEqual(leaderboard[i].totalQarma);
      }
    });

    it('should respect limit parameter', async () => {
      const leaderboard = await reputationService.getLeaderboard(3);
      expect(leaderboard).toHaveLength(3);
    });
  });

  describe('getReputationStats', () => {
    it('should return platform reputation statistics', async () => {
      const stats = await reputationService.getReputationStats();
      
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('averageQarma');
      expect(stats).toHaveProperty('totalQarmaAwarded');
      expect(stats).toHaveProperty('topUser');
      expect(stats).toHaveProperty('badgesAwarded');
      expect(stats).toHaveProperty('achievementsUnlocked');
      
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.averageQarma).toBe('number');
      expect(typeof stats.totalQarmaAwarded).toBe('number');
    });
  });

  describe('resetReputation', () => {
    it('should reset user reputation to initial state', async () => {
      const userId = 'did:squid:resetuser123';
      
      // Get initial reputation and modify it
      await reputationService.updateQarma(userId, 'POST_CREATED');
      const modifiedReputation = await reputationService.getUserReputation(userId);
      
      // Reset reputation
      const resetReputation = await reputationService.resetReputation(userId);
      
      // Should be back to initial generated state
      expect(resetReputation.userId).toBe(userId);
      expect(resetReputation.totalQarma).not.toBe(modifiedReputation.totalQarma);
    });
  });

  describe('Qarma Actions Constants', () => {
    it('should have positive values for positive actions', () => {
      expect(QARMA_ACTIONS.POST_CREATED).toBeGreaterThan(0);
      expect(QARMA_ACTIONS.POST_UPVOTED).toBeGreaterThan(0);
      expect(QARMA_ACTIONS.COMMENT_CREATED).toBeGreaterThan(0);
      expect(QARMA_ACTIONS.COMMENT_UPVOTED).toBeGreaterThan(0);
      expect(QARMA_ACTIONS.COMMUNITY_CREATED).toBeGreaterThan(0);
      expect(QARMA_ACTIONS.BECAME_MODERATOR).toBeGreaterThan(0);
    });

    it('should have negative values for negative actions', () => {
      expect(QARMA_ACTIONS.POST_DOWNVOTED).toBeLessThan(0);
      expect(QARMA_ACTIONS.POST_REMOVED).toBeLessThan(0);
      expect(QARMA_ACTIONS.COMMENT_DOWNVOTED).toBeLessThan(0);
      expect(QARMA_ACTIONS.COMMENT_REMOVED).toBeLessThan(0);
      expect(QARMA_ACTIONS.SPAM_DETECTED).toBeLessThan(0);
    });
  });

  describe('Badge and Achievement Definitions', () => {
    it('should have all required badge properties', () => {
      Object.values(BADGES).forEach(badge => {
        expect(badge).toHaveProperty('id');
        expect(badge).toHaveProperty('name');
        expect(badge).toHaveProperty('description');
        expect(badge).toHaveProperty('icon');
        expect(badge).toHaveProperty('requirement');
      });
    });

    it('should have all required achievement properties', () => {
      Object.values(ACHIEVEMENTS).forEach(achievement => {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('name');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('points');
        expect(achievement.points).toBeGreaterThan(0);
      });
    });
  });
});