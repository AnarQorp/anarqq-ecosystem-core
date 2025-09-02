import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { 
  PostService, 
  CommentService, 
  SubcommunityService, 
  ReputationService,
  SearchService,
  RecommendationService
} from '../qsocial';
import { getActiveIdentity } from '../../state/identity';
import { PrivacyMiddleware } from '../../services/qsocial/PrivacyMiddleware';
import { EncryptionService } from '../../services/qsocial/EncryptionService';
import { PrivacyAnalyticsService } from '../../services/qsocial/PrivacyAnalyticsService';
import type { 
  QsocialPost, 
  QsocialComment, 
  Subcommunity, 
  UserReputation,
  CreatePostRequest,
  CreateCommentRequest,
  CreateSubcommunityRequest,
  VoteResult
} from '../../types/qsocial';
import { ContentType, PrivacyLevel, ModerationStatus } from '../../types/qsocial';

// Mock dependencies
vi.mock('axios');
vi.mock('../../state/identity');
vi.mock('../../services/qsocial/PrivacyMiddleware');
vi.mock('../../services/qsocial/EncryptionService');
vi.mock('../../services/qsocial/PrivacyAnalyticsService');

const mockedAxios = vi.mocked(axios);
const mockedGetActiveIdentity = vi.mocked(getActiveIdentity);
const mockedPrivacyMiddleware = vi.mocked(PrivacyMiddleware);
const mockedEncryptionService = vi.mocked(EncryptionService);
const mockedPrivacyAnalyticsService = vi.mocked(PrivacyAnalyticsService);

// Mock data
const mockIdentity = {
  did: 'did:squid:testuser',
  name: 'Test User',
  type: 'ROOT' as const,
  kyc: true,
  reputation: 100,
  isAuthenticated: true,
  signMessage: vi.fn().mockResolvedValue('mock-signature'),
};

const mockPost: QsocialPost = {
  id: 'post-123',
  authorId: 'did:squid:testuser',
  authorIdentity: mockIdentity,
  title: 'Test Post',
  content: 'This is test content',
  contentType: ContentType.TEXT,
  tags: ['test'],
  upvotes: 5,
  downvotes: 1,
  commentCount: 3,
  privacyLevel: PrivacyLevel.PUBLIC,
  createdAt: new Date(),
  updatedAt: new Date(),
  isEdited: false,
  isPinned: false,
  isLocked: false,
  moderationStatus: ModerationStatus.APPROVED,
};

const mockComment: QsocialComment = {
  id: 'comment-123',
  postId: 'post-123',
  authorId: 'did:squid:testuser',
  authorIdentity: mockIdentity,
  content: 'Test comment',
  parentCommentId: undefined,
  depth: 0,
  childrenIds: [],
  upvotes: 2,
  downvotes: 0,
  privacyLevel: PrivacyLevel.PUBLIC,
  createdAt: new Date(),
  updatedAt: new Date(),
  isEdited: false,
  moderationStatus: ModerationStatus.APPROVED,
};

const mockSubcommunity: Subcommunity = {
  id: 'sub-123',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community',
  creatorId: 'did:squid:testuser',
  moderators: ['did:squid:testuser'],
  governanceRules: [],
  isPrivate: false,
  requiresApproval: false,
  minimumQarma: 0,
  allowedContentTypes: ['text', 'link'],
  memberCount: 10,
  postCount: 5,
  createdAt: new Date(),
  rules: ['Be respectful'],
};

const mockVoteResult: VoteResult = {
  success: true,
  newUpvotes: 6,
  newDownvotes: 1,
  qarmaChange: 10,
  userVote: 'up',
};

describe('PostService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
    mockedPrivacyMiddleware.validatePostCreation.mockResolvedValue({
      success: true,
      data: { title: 'Test Post', content: 'Test content', contentType: ContentType.TEXT }
    });
    mockedEncryptionService.encryptPost.mockResolvedValue(mockPost);
    mockedPrivacyAnalyticsService.trackPostCreated.mockResolvedValue(undefined);
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
        tags: ['test'],
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      mockedAxios.post.mockResolvedValue({ data: mockPost });

      const result = await PostService.createPost(createRequest);

      expect(result).toEqual(mockPost);
      expect(mockedPrivacyMiddleware.validatePostCreation).toHaveBeenCalledWith(
        createRequest,
        mockIdentity.did
      );
      expect(mockedEncryptionService.encryptPost).toHaveBeenCalled();
      expect(mockedPrivacyAnalyticsService.trackPostCreated).toHaveBeenCalledWith(mockPost);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/posts',
        mockPost,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
            'X-Signature': 'mock-signature',
          })
        })
      );
    });

    it('should throw error when no active identity', async () => {
      mockedGetActiveIdentity.mockReturnValue(null);

      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
      };

      await expect(PostService.createPost(createRequest)).rejects.toThrow('No active identity found');
    });

    it('should throw error when privacy validation fails', async () => {
      mockedPrivacyMiddleware.validatePostCreation.mockResolvedValue({
        success: false,
        error: 'Privacy validation failed'
      });

      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
      };

      await expect(PostService.createPost(createRequest)).rejects.toThrow('Privacy validation failed');
    });
  });

  describe('getPost', () => {
    it('should get a post successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPost });

      const result = await PostService.getPost('post-123');

      expect(result).toEqual(mockPost);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/posts/post-123');
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      const updates = { title: 'Updated Title' };
      const updatedPost = { ...mockPost, title: 'Updated Title' };
      
      mockedAxios.put.mockResolvedValue({ data: updatedPost });

      const result = await PostService.updatePost('post-123', updates);

      expect(result).toEqual(updatedPost);
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/api/qsocial/posts/post-123',
        updates,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      mockedAxios.delete.mockResolvedValue({});

      await PostService.deletePost('post-123');

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        '/api/qsocial/posts/post-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });

  describe('getFeed', () => {
    it('should get feed with privacy filtering', async () => {
      const posts = [mockPost];
      mockedAxios.get.mockResolvedValue({ data: { posts } });
      mockedPrivacyMiddleware.filterPosts.mockResolvedValue({
        success: true,
        data: posts
      });

      const result = await PostService.getFeed({ limit: 10 });

      expect(result).toEqual(posts);
      expect(mockedPrivacyMiddleware.filterPosts).toHaveBeenCalledWith(posts, mockIdentity.did);
    });

    it('should return unfiltered posts when privacy filtering fails', async () => {
      const posts = [mockPost];
      mockedAxios.get.mockResolvedValue({ data: { posts } });
      mockedPrivacyMiddleware.filterPosts.mockResolvedValue({
        success: false,
        error: 'Filtering failed'
      });

      const result = await PostService.getFeed();

      expect(result).toEqual(posts);
    });
  });

  describe('votePost', () => {
    it('should vote on a post successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockVoteResult });

      const result = await PostService.votePost('post-123', 'up');

      expect(result).toEqual(mockVoteResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/posts/post-123/vote',
        { vote: 'up' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });
});

describe('CommentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
    mockedPrivacyMiddleware.validateCommentCreation.mockResolvedValue({
      success: true,
      data: { postId: 'post-123', content: 'Test comment' }
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const createRequest: CreateCommentRequest = {
        postId: 'post-123',
        content: 'Test comment',
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      mockedAxios.get.mockResolvedValue({ data: mockPost }); // For parent post fetch
      mockedAxios.post.mockResolvedValue({ data: mockComment });

      const result = await CommentService.createComment(createRequest);

      expect(result).toEqual(mockComment);
      expect(mockedPrivacyMiddleware.validateCommentCreation).toHaveBeenCalledWith(
        createRequest,
        mockIdentity.did,
        mockPost
      );
    });

    it('should handle parent post fetch failure gracefully', async () => {
      const createRequest: CreateCommentRequest = {
        postId: 'post-123',
        content: 'Test comment',
      };

      mockedAxios.get.mockRejectedValue(new Error('Post not found'));
      mockedAxios.post.mockResolvedValue({ data: mockComment });

      const result = await CommentService.createComment(createRequest);

      expect(result).toEqual(mockComment);
      expect(mockedPrivacyMiddleware.validateCommentCreation).toHaveBeenCalledWith(
        createRequest,
        mockIdentity.did,
        undefined
      );
    });
  });

  describe('getPostComments', () => {
    it('should get post comments successfully', async () => {
      const comments = [mockComment];
      mockedAxios.get.mockResolvedValue({ data: { comments } });

      const result = await CommentService.getPostComments('post-123', { limit: 10 });

      expect(result).toEqual(comments);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/posts/post-123/comments?limit=10');
    });
  });

  describe('voteComment', () => {
    it('should vote on a comment successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockVoteResult });

      const result = await CommentService.voteComment('comment-123', 'up');

      expect(result).toEqual(mockVoteResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/comments/comment-123/vote',
        { vote: 'up' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });
});

describe('SubcommunityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
  });

  describe('createSubcommunity', () => {
    it('should create a subcommunity successfully', async () => {
      const createRequest: CreateSubcommunityRequest = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
      };

      mockedAxios.post.mockResolvedValue({ data: mockSubcommunity });

      const result = await SubcommunityService.createSubcommunity(createRequest);

      expect(result).toEqual(mockSubcommunity);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/subcommunities',
        { ...createRequest, creatorId: mockIdentity.did },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });

  describe('searchSubcommunities', () => {
    it('should search subcommunities successfully', async () => {
      const subcommunities = [mockSubcommunity];
      mockedAxios.get.mockResolvedValue({ data: { subcommunities } });

      const result = await SubcommunityService.searchSubcommunities('test');

      expect(result).toEqual(subcommunities);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/subcommunities/search?q=test');
    });
  });

  describe('joinSubcommunity', () => {
    it('should join a subcommunity successfully', async () => {
      mockedAxios.post.mockResolvedValue({});

      await SubcommunityService.joinSubcommunity('sub-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/subcommunities/sub-123/join',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });
});

describe('ReputationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
  });

  describe('getUserReputation', () => {
    it('should get user reputation successfully', async () => {
      const mockReputation: UserReputation = {
        userId: 'did:squid:testuser',
        totalQarma: 150,
        postQarma: 100,
        commentQarma: 50,
        subcommunityQarma: {},
        badges: [],
        achievements: [],
        moderationLevel: 'none' as any,
        canModerate: [],
        qarmaHistory: [],
        lastUpdated: new Date(),
      };

      mockedAxios.get.mockResolvedValue({ data: mockReputation });

      const result = await ReputationService.getUserReputation('did:squid:testuser');

      expect(result).toEqual(mockReputation);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/users/did:squid:testuser/reputation');
    });
  });

  describe('getMyReputation', () => {
    it('should get current user reputation successfully', async () => {
      const mockReputation: UserReputation = {
        userId: mockIdentity.did,
        totalQarma: 150,
        postQarma: 100,
        commentQarma: 50,
        subcommunityQarma: {},
        badges: [],
        achievements: [],
        moderationLevel: 'none' as any,
        canModerate: [],
        qarmaHistory: [],
        lastUpdated: new Date(),
      };

      mockedAxios.get.mockResolvedValue({ data: mockReputation });

      const result = await ReputationService.getMyReputation();

      expect(result).toEqual(mockReputation);
      expect(mockedAxios.get).toHaveBeenCalledWith(`/api/qsocial/users/${mockIdentity.did}/reputation`);
    });

    it('should throw error when no active identity', async () => {
      mockedGetActiveIdentity.mockReturnValue(null);

      await expect(ReputationService.getMyReputation()).rejects.toThrow('No active identity found');
    });
  });
});

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should perform search successfully', async () => {
      const mockResults = {
        results: [
          { type: 'post', data: mockPost, score: 0.9 }
        ],
        total: 1,
        query: 'test',
        filters: {}
      };

      mockedAxios.get.mockResolvedValue({ data: mockResults });

      const result = await SearchService.search('test', { contentType: 'posts' });

      expect(result).toEqual(mockResults);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/search?q=test&contentType=posts');
    });

    it('should handle search filters correctly', async () => {
      const mockResults = { results: [], total: 0, query: 'test', filters: {} };
      mockedAxios.get.mockResolvedValue({ data: mockResults });

      const filters = {
        dateRange: { from: new Date('2023-01-01'), to: new Date('2023-12-31') },
        subcommunityId: 'sub-123',
        tags: ['tag1', 'tag2'],
        minQarma: 100,
        sortBy: 'relevance' as const,
        limit: 20,
        offset: 10
      };

      await SearchService.search('test', filters);

      const expectedUrl = '/api/qsocial/search?q=test&dateFrom=2023-01-01T00%3A00%3A00.000Z&dateTo=2023-12-31T00%3A00%3A00.000Z&subcommunityId=sub-123&tags=tag1%2Ctag2&minQarma=100&sortBy=relevance&limit=20&offset=10';
      expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe('searchPosts', () => {
    it('should search posts specifically', async () => {
      const mockResults = {
        results: [{ type: 'post', data: mockPost, score: 0.9 }],
        total: 1,
        query: 'test',
        filters: { contentType: 'posts' }
      };

      mockedAxios.get.mockResolvedValue({ data: mockResults });

      const result = await SearchService.searchPosts('test');

      expect(result).toEqual([mockPost]);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/search?q=test&contentType=posts');
    });
  });
});

describe('RecommendationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
  });

  describe('getPersonalizedRecommendations', () => {
    it('should get personalized recommendations successfully', async () => {
      const mockRecommendations = [
        { content: mockPost, score: 0.9, reason: 'Similar to your interests' }
      ];

      mockedAxios.get.mockResolvedValue({ data: { results: mockRecommendations } });

      const result = await RecommendationService.getPersonalizedRecommendations(10, ['post-456']);

      expect(result).toEqual(mockRecommendations);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/api/qsocial/recommendations/personalized?limit=10&excludeViewed=post-456',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });

  describe('getTrendingContent', () => {
    it('should get trending content successfully', async () => {
      const mockTrending = [
        { content: mockPost, trendingScore: 0.95, metrics: { views: 1000, votes: 50 } }
      ];

      mockedAxios.get.mockResolvedValue({ data: { results: mockTrending } });

      const result = await RecommendationService.getTrendingContent('day', 20, 'posts');

      expect(result).toEqual(mockTrending);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/qsocial/recommendations/trending?timeframe=day&limit=20&contentType=posts');
    });
  });

  describe('featureContent', () => {
    it('should feature content successfully', async () => {
      mockedAxios.post.mockResolvedValue({});

      const expiresAt = new Date('2024-12-31');
      await RecommendationService.featureContent('post-123', 'post', 'editorial', 1, expiresAt);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/recommendations/feature',
        {
          contentId: 'post-123',
          contentType: 'post',
          reason: 'editorial',
          priority: 1,
          expiresAt: expiresAt.toISOString()
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });
  });
});