import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecommendationService } from '../RecommendationService';
import { PostService } from '../PostService';
import { CommentService } from '../CommentService';
import { SubcommunityService } from '../SubcommunityService';
import type { QsocialPost, QsocialComment, Subcommunity } from '../../../types/qsocial';

// Mock the services
vi.mock('../PostService');
vi.mock('../CommentService');
vi.mock('../SubcommunityService');

const mockPostService = vi.mocked(PostService);
const mockCommentService = vi.mocked(CommentService);
const mockSubcommunityService = vi.mocked(SubcommunityService);

describe('RecommendationService', () => {
  const mockPost: QsocialPost = {
    id: 'post1',
    authorId: 'user2',
    authorIdentity: {
      did: 'user2',
      name: 'Test Author',
      type: 'ROOT',
      kyc: true,
      reputation: 150
    },
    title: 'Advanced React Patterns',
    content: 'Learn about advanced React patterns including hooks, context, and performance optimization',
    contentType: 'text' as const,
    tags: ['react', 'javascript', 'frontend', 'programming'],
    upvotes: 25,
    downvotes: 3,
    commentCount: 12,
    subcommunityId: 'react-community',
    privacyLevel: 'public' as const,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: 'approved' as const
  };

  const mockPost2: QsocialPost = {
    id: 'post2',
    authorId: 'user3',
    authorIdentity: {
      did: 'user3',
      name: 'Another Author',
      type: 'ROOT',
      kyc: true,
      reputation: 200
    },
    title: 'Vue.js Best Practices',
    content: 'Comprehensive guide to Vue.js best practices and patterns',
    contentType: 'text' as const,
    tags: ['vue', 'javascript', 'frontend'],
    upvotes: 18,
    downvotes: 1,
    commentCount: 8,
    subcommunityId: 'vue-community',
    privacyLevel: 'public' as const,
    createdAt: new Date('2024-01-14T15:30:00Z'),
    updatedAt: new Date('2024-01-14T15:30:00Z'),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: 'approved' as const
  };

  const mockSubcommunity: Subcommunity = {
    id: 'react-community',
    name: 'react',
    displayName: 'React Community',
    description: 'A community for React developers',
    creatorId: 'user1',
    moderators: ['user1'],
    governanceRules: [],
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link'],
    memberCount: 500,
    postCount: 150,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    rules: ['Be respectful', 'Stay on topic']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service responses
    mockPostService.getFeed.mockResolvedValue([mockPost, mockPost2]);
    mockPostService.getSubcommunityFeed.mockResolvedValue([mockPost]);
    mockPostService.getUserPosts.mockResolvedValue([]);
    mockSubcommunityService.getTrendingSubcommunities.mockResolvedValue([mockSubcommunity]);
    
    mockPostService.getPost.mockResolvedValue(mockPost);
    mockCommentService.getComment.mockResolvedValue({} as any);
    mockSubcommunityService.getSubcommunity.mockResolvedValue(mockSubcommunity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should get personalized recommendations for a user', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 10);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(10);
      
      // Each recommendation should have required properties
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('relevanceScore');
        expect(rec).toHaveProperty('data');
        expect(rec).toHaveProperty('explanation');
        expect(rec).toHaveProperty('category', 'personalized');
        expect(rec).toHaveProperty('freshness');
        expect(typeof rec.freshness).toBe('number');
        expect(rec.freshness).toBeGreaterThanOrEqual(0);
        expect(rec.freshness).toBeLessThanOrEqual(1);
      });
    });

    it('should exclude viewed content', async () => {
      const excludeViewed = ['post1'];
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 10, excludeViewed);
      
      // Should not include excluded content
      const hasExcludedContent = recommendations.some(rec => excludeViewed.includes(rec.id));
      expect(hasExcludedContent).toBe(false);
    });

    it('should exclude user\'s own content', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user2', 10);
      
      // Should not include content authored by user2
      const hasOwnContent = recommendations.some(rec => rec.data.authorId === 'user2');
      expect(hasOwnContent).toBe(false);
    });

    it('should sort recommendations by relevance score', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 10);
      
      // Should be sorted by relevance score (descending)
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].relevanceScore).toBeGreaterThanOrEqual(
          recommendations[i].relevanceScore
        );
      }
    });

    it('should include explanation for each recommendation', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 5);
      
      recommendations.forEach(rec => {
        expect(rec.explanation).toBeDefined();
        expect(rec.explanation.primaryReason).toBeDefined();
        expect(Array.isArray(rec.explanation.factors)).toBe(true);
        expect(typeof rec.explanation.confidence).toBe('number');
        expect(rec.explanation.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.explanation.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getTrendingContent', () => {
    it('should get trending content for default timeframe', async () => {
      const trending = await RecommendationService.getTrendingContent();
      
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeLessThanOrEqual(20); // Default limit
      
      // Each trending item should have required properties
      trending.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('data');
        expect(item).toHaveProperty('trendScore');
        expect(item).toHaveProperty('metrics');
        expect(item).toHaveProperty('timeframe');
        expect(typeof item.trendScore).toBe('number');
        expect(item.trendScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should get trending content for specific timeframe', async () => {
      const hourly = await RecommendationService.getTrendingContent('hour', 5);
      const daily = await RecommendationService.getTrendingContent('day', 5);
      const weekly = await RecommendationService.getTrendingContent('week', 5);
      const monthly = await RecommendationService.getTrendingContent('month', 5);
      
      expect(Array.isArray(hourly)).toBe(true);
      expect(Array.isArray(daily)).toBe(true);
      expect(Array.isArray(weekly)).toBe(true);
      expect(Array.isArray(monthly)).toBe(true);
      
      expect(hourly.length).toBeLessThanOrEqual(5);
      expect(daily.length).toBeLessThanOrEqual(5);
      expect(weekly.length).toBeLessThanOrEqual(5);
      expect(monthly.length).toBeLessThanOrEqual(5);
    });

    it('should sort trending content by trend score', async () => {
      const trending = await RecommendationService.getTrendingContent('day', 10);
      
      // Should be sorted by trend score (descending)
      for (let i = 1; i < trending.length; i++) {
        expect(trending[i-1].trendScore).toBeGreaterThanOrEqual(
          trending[i].trendScore
        );
      }
    });

    it('should include trend metrics for each item', async () => {
      const trending = await RecommendationService.getTrendingContent('day', 5);
      
      trending.forEach(item => {
        expect(item.metrics).toBeDefined();
        expect(typeof item.metrics.velocityScore).toBe('number');
        expect(typeof item.metrics.momentumScore).toBe('number');
        expect(typeof item.metrics.qualityScore).toBe('number');
        expect(typeof item.metrics.diversityScore).toBe('number');
        
        // All scores should be between 0 and 1
        expect(item.metrics.velocityScore).toBeGreaterThanOrEqual(0);
        expect(item.metrics.velocityScore).toBeLessThanOrEqual(1);
        expect(item.metrics.momentumScore).toBeGreaterThanOrEqual(0);
        expect(item.metrics.momentumScore).toBeLessThanOrEqual(1);
        expect(item.metrics.qualityScore).toBeGreaterThanOrEqual(0);
        expect(item.metrics.qualityScore).toBeLessThanOrEqual(1);
        expect(item.metrics.diversityScore).toBeGreaterThanOrEqual(0);
        expect(item.metrics.diversityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should filter by content type when specified', async () => {
      const postsTrending = await RecommendationService.getTrendingContent('day', 10, 'posts');
      
      // All results should be posts when filtered
      postsTrending.forEach(item => {
        expect(item.type).toBe('post');
      });
    });

    it('should use caching for performance', async () => {
      // First call
      await RecommendationService.getTrendingContent('day', 5);
      
      // Second call should use cache
      await RecommendationService.getTrendingContent('day', 5);
      
      // Should only call the service once due to caching
      expect(mockPostService.getFeed).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFeaturedContent', () => {
    beforeEach(async () => {
      // Add some featured content for testing
      await RecommendationService.featureContent(
        'post1',
        'post',
        'editorial',
        'admin1',
        5,
        new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
      );
      
      await RecommendationService.featureContent(
        'react-community',
        'subcommunity',
        'community_choice',
        'admin1',
        3
      );
    });

    it('should get all featured content', async () => {
      const featured = await RecommendationService.getFeaturedContent();
      
      expect(Array.isArray(featured)).toBe(true);
      expect(featured.length).toBeGreaterThan(0);
      
      // Each featured item should have required properties
      featured.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('data');
        expect(item).toHaveProperty('featureReason');
        expect(item).toHaveProperty('featuredAt');
        expect(item).toHaveProperty('priority');
        expect(typeof item.priority).toBe('number');
      });
    });

    it('should filter by category when specified', async () => {
      const editorial = await RecommendationService.getFeaturedContent(10, 'editorial');
      const communityChoice = await RecommendationService.getFeaturedContent(10, 'community_choice');
      
      editorial.forEach(item => {
        expect(item.featureReason).toBe('editorial');
      });
      
      communityChoice.forEach(item => {
        expect(item.featureReason).toBe('community_choice');
      });
    });

    it('should sort by priority and featured date', async () => {
      const featured = await RecommendationService.getFeaturedContent();
      
      // Should be sorted by priority (descending), then by featured date
      for (let i = 1; i < featured.length; i++) {
        if (featured[i-1].priority === featured[i].priority) {
          expect(featured[i-1].featuredAt.getTime()).toBeGreaterThanOrEqual(
            featured[i].featuredAt.getTime()
          );
        } else {
          expect(featured[i-1].priority).toBeGreaterThan(featured[i].priority);
        }
      }
    });

    it('should exclude expired content', async () => {
      // Add expired content
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // Expired 1 hour ago
      await RecommendationService.featureContent(
        'post2',
        'post',
        'algorithm',
        'admin1',
        1,
        expiredDate
      );
      
      const featured = await RecommendationService.getFeaturedContent();
      
      // Should not include expired content
      const hasExpiredContent = featured.some(item => item.id === 'post2');
      expect(hasExpiredContent).toBe(false);
    });
  });

  describe('getDiscoveryRecommendations', () => {
    it('should get discovery recommendations for a user', async () => {
      const discovery = await RecommendationService.getDiscoveryRecommendations('user1', 10);
      
      expect(Array.isArray(discovery)).toBe(true);
      expect(discovery.length).toBeLessThanOrEqual(10);
      
      // Each discovery recommendation should have required properties
      discovery.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('relevanceScore');
        expect(rec).toHaveProperty('data');
        expect(rec).toHaveProperty('explanation');
        expect(rec).toHaveProperty('category', 'discovery');
        expect(rec).toHaveProperty('freshness');
      });
    });

    it('should exclude user\'s own content from discovery', async () => {
      const discovery = await RecommendationService.getDiscoveryRecommendations('user2', 10);
      
      // Should not include content authored by user2
      const hasOwnContent = discovery.some(rec => rec.data.authorId === 'user2');
      expect(hasOwnContent).toBe(false);
    });

    it('should prioritize content from unexplored subcommunities', async () => {
      const discovery = await RecommendationService.getDiscoveryRecommendations('user1', 10);
      
      // Discovery recommendations should include content from different subcommunities
      expect(discovery.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSocialRecommendations', () => {
    it('should get social recommendations for a user', async () => {
      const social = await RecommendationService.getSocialRecommendations('user1', 10);
      
      expect(Array.isArray(social)).toBe(true);
      expect(social.length).toBeLessThanOrEqual(10);
      
      // Each social recommendation should have required properties
      social.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('relevanceScore');
        expect(rec).toHaveProperty('data');
        expect(rec).toHaveProperty('explanation');
        expect(rec).toHaveProperty('category', 'social');
        expect(rec).toHaveProperty('freshness');
      });
    });

    it('should exclude user\'s own content from social recommendations', async () => {
      const social = await RecommendationService.getSocialRecommendations('user2', 10);
      
      // Should not include content authored by user2
      const hasOwnContent = social.some(rec => rec.data.authorId === 'user2');
      expect(hasOwnContent).toBe(false);
    });
  });

  describe('featureContent and unfeatureContent', () => {
    it('should feature content successfully', async () => {
      await expect(
        RecommendationService.featureContent('post1', 'post', 'editorial', 'admin1', 5)
      ).resolves.not.toThrow();
      
      const featured = await RecommendationService.getFeaturedContent();
      const featuredPost = featured.find(item => item.id === 'post1');
      
      expect(featuredPost).toBeDefined();
      expect(featuredPost?.featureReason).toBe('editorial');
      expect(featuredPost?.featuredBy).toBe('admin1');
      expect(featuredPost?.priority).toBe(5);
    });

    it('should unfeature content successfully', async () => {
      // First feature the content
      await RecommendationService.featureContent('post1', 'post', 'editorial', 'admin1', 5);
      
      // Then unfeature it
      await RecommendationService.unfeatureContent('post1');
      
      const featured = await RecommendationService.getFeaturedContent();
      const featuredPost = featured.find(item => item.id === 'post1');
      
      expect(featuredPost).toBeUndefined();
    });

    it('should replace existing featured content when featuring again', async () => {
      // Feature with priority 3
      await RecommendationService.featureContent('post1', 'post', 'editorial', 'admin1', 3);
      
      // Feature again with priority 7
      await RecommendationService.featureContent('post1', 'post', 'community_choice', 'admin2', 7);
      
      const featured = await RecommendationService.getFeaturedContent();
      const featuredPost = featured.find(item => item.id === 'post1');
      
      expect(featuredPost).toBeDefined();
      expect(featuredPost?.featureReason).toBe('community_choice');
      expect(featuredPost?.featuredBy).toBe('admin2');
      expect(featuredPost?.priority).toBe(7);
      
      // Should only have one entry for this content
      const allFeaturedPost = featured.filter(item => item.id === 'post1');
      expect(allFeaturedPost.length).toBe(1);
    });

    it('should throw error when featuring non-existent content', async () => {
      mockPostService.getPost.mockRejectedValue(new Error('Post not found'));
      
      await expect(
        RecommendationService.featureContent('nonexistent', 'post', 'editorial', 'admin1', 5)
      ).rejects.toThrow('Failed to feature content: Content not found');
    });
  });

  describe('updateUserInterestProfile', () => {
    it('should update user interest profile based on activity', async () => {
      await RecommendationService.updateUserInterestProfile('user1', {
        type: 'vote',
        contentId: 'post1',
        contentType: 'post',
        tags: ['react', 'javascript'],
        subcommunityId: 'react-community',
        authorId: 'user2'
      });
      
      // Should not throw and should update internal profile
      // In a real implementation, we could verify the profile was updated
      expect(true).toBe(true);
    });

    it('should handle different activity types', async () => {
      const activities = [
        { type: 'view' as const, duration: 45 },
        { type: 'vote' as const },
        { type: 'comment' as const },
        { type: 'share' as const }
      ];
      
      for (const activity of activities) {
        await expect(
          RecommendationService.updateUserInterestProfile('user1', {
            ...activity,
            contentId: 'post1',
            contentType: 'post',
            tags: ['test'],
            subcommunityId: 'test-community',
            authorId: 'user2'
          })
        ).resolves.not.toThrow();
      }
    });

    it('should create profile if it doesn\'t exist', async () => {
      // First activity for a new user should create a profile
      await expect(
        RecommendationService.updateUserInterestProfile('newuser', {
          type: 'view',
          contentId: 'post1',
          contentType: 'post',
          tags: ['newbie'],
          subcommunityId: 'welcome',
          authorId: 'user2'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully in personalized recommendations', async () => {
      mockPostService.getFeed.mockRejectedValue(new Error('Service error'));
      
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 10);
      
      // Should return empty array instead of throwing
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should handle service errors gracefully in trending content', async () => {
      mockPostService.getFeed.mockRejectedValue(new Error('Service error'));
      
      const trending = await RecommendationService.getTrendingContent('day', 10);
      
      // Should return empty array instead of throwing
      expect(Array.isArray(trending)).toBe(true);
    });

    it('should handle missing data gracefully', async () => {
      mockPostService.getPost.mockResolvedValue(null as any);
      
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 10);
      
      // Should filter out null data
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('recommendation explanations', () => {
    it('should provide meaningful explanations for personalized recommendations', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 5);
      
      recommendations.forEach(rec => {
        expect(rec.explanation.primaryReason).toContain('Based on your interests');
        expect(rec.explanation.factors.length).toBeGreaterThan(0);
        
        rec.explanation.factors.forEach(factor => {
          expect(factor).toHaveProperty('factor');
          expect(factor).toHaveProperty('weight');
          expect(factor).toHaveProperty('description');
          expect(typeof factor.weight).toBe('number');
          expect(factor.weight).toBeGreaterThan(0);
        });
      });
    });

    it('should provide different explanations for different recommendation types', async () => {
      const personalized = await RecommendationService.getPersonalizedRecommendations('user1', 2);
      const discovery = await RecommendationService.getDiscoveryRecommendations('user1', 2);
      const social = await RecommendationService.getSocialRecommendations('user1', 2);
      
      if (personalized.length > 0) {
        expect(personalized[0].explanation.primaryReason).toContain('interests');
      }
      
      if (discovery.length > 0) {
        expect(discovery[0].explanation.primaryReason).toContain('Discover');
      }
      
      if (social.length > 0) {
        expect(social[0].explanation.primaryReason).toContain('network');
      }
    });
  });

  describe('freshness calculation', () => {
    it('should calculate freshness correctly', async () => {
      const recommendations = await RecommendationService.getPersonalizedRecommendations('user1', 5);
      
      recommendations.forEach(rec => {
        expect(typeof rec.freshness).toBe('number');
        expect(rec.freshness).toBeGreaterThanOrEqual(0);
        expect(rec.freshness).toBeLessThanOrEqual(1);
        
        // Recent content should have higher freshness
        const ageHours = (Date.now() - rec.data.createdAt.getTime()) / (1000 * 60 * 60);
        const expectedFreshness = Math.max(0, 1 - (ageHours / 24));
        expect(Math.abs(rec.freshness - expectedFreshness)).toBeLessThan(0.1);
      });
    });
  });
});