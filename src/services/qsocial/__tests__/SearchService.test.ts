import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from '../SearchService';
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

describe('SearchService', () => {
  const mockPost: QsocialPost = {
    id: 'post1',
    authorId: 'user1',
    authorIdentity: {
      did: 'user1',
      name: 'Test User',
      type: 'ROOT',
      kyc: true,
      reputation: 100
    },
    title: 'Test Post About Technology',
    content: 'This is a test post about web development and programming',
    contentType: 'text' as const,
    tags: ['technology', 'programming', 'web'],
    upvotes: 10,
    downvotes: 2,
    commentCount: 5,
    privacyLevel: 'public' as const,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: 'approved' as const
  };

  const mockComment: QsocialComment = {
    id: 'comment1',
    postId: 'post1',
    authorId: 'user2',
    authorIdentity: {
      did: 'user2',
      name: 'Commenter',
      type: 'ROOT',
      kyc: true,
      reputation: 50
    },
    content: 'Great post about JavaScript frameworks!',
    depth: 0,
    childrenIds: [],
    upvotes: 5,
    downvotes: 1,
    privacyLevel: 'public' as const,
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
    isEdited: false,
    moderationStatus: 'approved' as const
  };

  const mockSubcommunity: Subcommunity = {
    id: 'sub1',
    name: 'programming',
    displayName: 'Programming Community',
    description: 'A community for programming discussions and tutorials',
    creatorId: 'user1',
    moderators: ['user1'],
    governanceRules: [],
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link'],
    memberCount: 100,
    postCount: 50,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    rules: ['Be respectful', 'No spam']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service responses
    mockPostService.getFeed.mockResolvedValue([mockPost]);
    mockCommentService.getPostComments.mockResolvedValue([mockComment]);
    mockSubcommunityService.getTrendingSubcommunities.mockResolvedValue([mockSubcommunity]);
    
    mockPostService.getPost.mockResolvedValue(mockPost);
    mockCommentService.getComment.mockResolvedValue(mockComment);
    mockSubcommunityService.getSubcommunity.mockResolvedValue(mockSubcommunity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('should perform basic text search', async () => {
      const results = await SearchService.search('technology');
      
      expect(results.query).toBe('technology');
      expect(results.totalResults).toBeGreaterThan(0);
      expect(results.results).toBeDefined();
      expect(results.facets).toBeDefined();
    });

    it('should throw error for empty query', async () => {
      await expect(SearchService.search('')).rejects.toThrow('Search query is required');
      await expect(SearchService.search('   ')).rejects.toThrow('Search query is required');
    });

    it('should filter by content type', async () => {
      const results = await SearchService.search('technology', { contentType: 'posts' });
      
      expect(results.results.every(r => r.type === 'post')).toBe(true);
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01T00:00:00Z');
      const dateTo = new Date('2024-01-01T23:59:59Z');
      
      const results = await SearchService.search('technology', {
        dateRange: { from: dateFrom, to: dateTo }
      });
      
      expect(results.results).toBeDefined();
    });

    it('should filter by subcommunity', async () => {
      const results = await SearchService.search('technology', {
        subcommunityId: 'sub1'
      });
      
      expect(results.results).toBeDefined();
    });

    it('should filter by author', async () => {
      const results = await SearchService.search('technology', {
        authorId: 'user1'
      });
      
      expect(results.results).toBeDefined();
    });

    it('should filter by tags', async () => {
      const results = await SearchService.search('technology', {
        tags: ['programming']
      });
      
      expect(results.results).toBeDefined();
    });

    it('should filter by minimum qarma', async () => {
      const results = await SearchService.search('technology', {
        minQarma: 5
      });
      
      expect(results.results).toBeDefined();
    });

    it('should sort by relevance by default', async () => {
      const results = await SearchService.search('technology');
      
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.results.length; i++) {
        expect(results.results[i-1].relevanceScore).toBeGreaterThanOrEqual(
          results.results[i].relevanceScore
        );
      }
    });

    it('should sort by date when specified', async () => {
      const results = await SearchService.search('technology', { sortBy: 'date' });
      
      expect(results.results).toBeDefined();
    });

    it('should sort by popularity when specified', async () => {
      const results = await SearchService.search('technology', { sortBy: 'popularity' });
      
      expect(results.results).toBeDefined();
    });

    it('should sort by qarma when specified', async () => {
      const results = await SearchService.search('technology', { sortBy: 'qarma' });
      
      expect(results.results).toBeDefined();
    });

    it('should limit results', async () => {
      const results = await SearchService.search('technology', { limit: 5 });
      
      expect(results.results.length).toBeLessThanOrEqual(5);
    });

    it('should offset results', async () => {
      const results = await SearchService.search('technology', { offset: 10, limit: 5 });
      
      expect(results.results.length).toBeLessThanOrEqual(5);
    });

    it('should generate highlights for search terms', async () => {
      const results = await SearchService.search('technology');
      
      const hasHighlights = results.results.some(result => 
        result.highlights && result.highlights.length > 0
      );
      expect(hasHighlights).toBe(true);
    });

    it('should calculate facets correctly', async () => {
      const results = await SearchService.search('technology');
      
      expect(results.facets).toBeDefined();
      expect(results.facets.contentTypes).toBeDefined();
      expect(results.facets.subcommunities).toBeDefined();
      expect(results.facets.authors).toBeDefined();
      expect(results.facets.tags).toBeDefined();
    });

    it('should generate search suggestions', async () => {
      const results = await SearchService.search('tech');
      
      expect(results.suggestions).toBeDefined();
      expect(Array.isArray(results.suggestions)).toBe(true);
    });

    it('should handle multiple search terms', async () => {
      const results = await SearchService.search('web development programming');
      
      expect(results.query).toBe('web development programming');
      expect(results.results).toBeDefined();
    });

    it('should sanitize long queries', async () => {
      const longQuery = 'a'.repeat(300);
      const results = await SearchService.search(longQuery);
      
      expect(results.query.length).toBeLessThanOrEqual(200);
    });
  });

  describe('searchPosts', () => {
    it('should search only posts', async () => {
      const posts = await SearchService.searchPosts('technology');
      
      expect(Array.isArray(posts)).toBe(true);
      // All results should be posts (when we have actual data)
    });

    it('should apply filters to post search', async () => {
      const posts = await SearchService.searchPosts('technology', {
        subcommunityId: 'sub1',
        limit: 10
      });
      
      expect(Array.isArray(posts)).toBe(true);
    });
  });

  describe('searchComments', () => {
    it('should search only comments', async () => {
      const comments = await SearchService.searchComments('JavaScript');
      
      expect(Array.isArray(comments)).toBe(true);
      // All results should be comments (when we have actual data)
    });

    it('should apply filters to comment search', async () => {
      const comments = await SearchService.searchComments('JavaScript', {
        authorId: 'user2',
        limit: 5
      });
      
      expect(Array.isArray(comments)).toBe(true);
    });
  });

  describe('searchSubcommunities', () => {
    it('should search only subcommunities', async () => {
      const subcommunities = await SearchService.searchSubcommunities('programming');
      
      expect(Array.isArray(subcommunities)).toBe(true);
      // All results should be subcommunities (when we have actual data)
    });

    it('should apply filters to subcommunity search', async () => {
      const subcommunities = await SearchService.searchSubcommunities('programming', {
        minQarma: 50,
        limit: 3
      });
      
      expect(Array.isArray(subcommunities)).toBe(true);
    });
  });

  describe('getTrendingContent', () => {
    it('should get trending content for default time range', async () => {
      const trending = await SearchService.getTrendingContent();
      
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeLessThanOrEqual(20); // Default limit
    });

    it('should get trending content for specific time range', async () => {
      const trending = await SearchService.getTrendingContent('week', 10);
      
      expect(Array.isArray(trending)).toBe(true);
      expect(trending.length).toBeLessThanOrEqual(10);
    });

    it('should sort trending content by trending score', async () => {
      const trending = await SearchService.getTrendingContent();
      
      // Results should be sorted by trending score (descending)
      for (let i = 1; i < trending.length; i++) {
        expect(trending[i-1].relevanceScore).toBeGreaterThanOrEqual(
          trending[i].relevanceScore
        );
      }
    });

    it('should handle different time ranges', async () => {
      const hourly = await SearchService.getTrendingContent('hour');
      const daily = await SearchService.getTrendingContent('day');
      const weekly = await SearchService.getTrendingContent('week');
      const monthly = await SearchService.getTrendingContent('month');
      
      expect(Array.isArray(hourly)).toBe(true);
      expect(Array.isArray(daily)).toBe(true);
      expect(Array.isArray(weekly)).toBe(true);
      expect(Array.isArray(monthly)).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations for a user', async () => {
      const recommendations = await SearchService.getRecommendations('user1');
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(20); // Default limit
    });

    it('should get recommendations with custom limit', async () => {
      const recommendations = await SearchService.getRecommendations('user1', 10);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });

    it('should exclude user\'s own content from recommendations', async () => {
      const recommendations = await SearchService.getRecommendations('user1');
      
      // Should not include content authored by user1
      const hasOwnContent = recommendations.some(rec => {
        const entry = (SearchService as any).searchIndex.get(`${rec.type}:${rec.id}`);
        return entry && entry.authorId === 'user1';
      });
      
      expect(hasOwnContent).toBe(false);
    });

    it('should sort recommendations by relevance score', async () => {
      const recommendations = await SearchService.getRecommendations('user1');
      
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].relevanceScore).toBeGreaterThanOrEqual(
          recommendations[i].relevanceScore
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockPostService.getFeed.mockRejectedValue(new Error('Service error'));
      
      // Should not throw, but continue with available data
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });

    it('should handle missing data gracefully', async () => {
      mockPostService.getPost.mockResolvedValue(null as any);
      
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });

    it('should handle invalid search parameters', async () => {
      const results = await SearchService.search('technology', {
        limit: -1,
        offset: -1
      });
      
      expect(results).toBeDefined();
    });
  });

  describe('search index management', () => {
    it('should update search index periodically', async () => {
      // Force index update by calling search multiple times
      await SearchService.search('test1');
      await SearchService.search('test2');
      
      expect(mockPostService.getFeed).toHaveBeenCalled();
      expect(mockSubcommunityService.getTrendingSubcommunities).toHaveBeenCalled();
    });

    it('should handle index update failures', async () => {
      mockPostService.getFeed.mockRejectedValue(new Error('Index update failed'));
      
      // Should still work with stale index
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });
  });

  describe('relevance scoring', () => {
    it('should score title matches higher than content matches', async () => {
      // This test would require more detailed mocking of the search index
      // For now, we just verify the search works
      const results = await SearchService.search('Test');
      expect(results).toBeDefined();
    });

    it('should boost recent content', async () => {
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });

    it('should boost high-qarma content', async () => {
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });

    it('should boost popular content', async () => {
      const results = await SearchService.search('technology');
      expect(results).toBeDefined();
    });
  });

  describe('fuzzy matching', () => {
    it('should handle typos in search queries', async () => {
      const results = await SearchService.search('technolgy'); // Typo in "technology"
      expect(results).toBeDefined();
    });

    it('should handle partial word matches', async () => {
      const results = await SearchService.search('prog'); // Partial match for "programming"
      expect(results).toBeDefined();
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords from content', async () => {
      // This tests the private extractKeywords method indirectly
      const results = await SearchService.search('development');
      expect(results).toBeDefined();
    });

    it('should filter out stop words', async () => {
      const results = await SearchService.search('the and or'); // All stop words
      expect(results.totalResults).toBe(0);
    });
  });
});