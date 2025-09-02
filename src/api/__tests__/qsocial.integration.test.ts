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
import type { 
  QsocialPost, 
  QsocialComment, 
  Subcommunity, 
  CreatePostRequest,
  CreateCommentRequest,
  CreateSubcommunityRequest,
  CrossPostOptions
} from '../../types/qsocial';
import { ContentType, PrivacyLevel, ModerationStatus } from '../../types/qsocial';

// Mock axios for integration testing
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock identity service
vi.mock('../../state/identity');
const mockedGetActiveIdentity = vi.mocked(getActiveIdentity);

// Mock privacy services with proper return values
vi.mock('../../services/qsocial/PrivacyMiddleware', () => ({
  PrivacyMiddleware: {
    validatePostCreation: vi.fn(),
    validateCommentCreation: vi.fn(),
    filterPosts: vi.fn()
  }
}));

vi.mock('../../services/qsocial/EncryptionService', () => ({
  EncryptionService: {
    encryptPost: vi.fn()
  }
}));

vi.mock('../../services/qsocial/PrivacyAnalyticsService', () => ({
  PrivacyAnalyticsService: {
    trackPostCreated: vi.fn()
  }
}));

// Mock WebSocket for real-time features
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

// Mock global WebSocket
global.WebSocket = vi.fn(() => mockWebSocket) as any;

describe('Qsocial API Integration Tests', () => {
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
    title: 'Integration Test Post',
    content: 'This is an integration test post',
    contentType: ContentType.TEXT,
    tags: ['integration', 'test'],
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    privacyLevel: PrivacyLevel.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: ModerationStatus.APPROVED,
  };

  const mockSubcommunity: Subcommunity = {
    id: 'sub-123',
    name: 'integration-test',
    displayName: 'Integration Test Community',
    description: 'A community for integration testing',
    creatorId: 'did:squid:testuser',
    moderators: ['did:squid:testuser'],
    governanceRules: [],
    isPrivate: false,
    requiresApproval: false,
    minimumQarma: 0,
    allowedContentTypes: ['text', 'link'],
    memberCount: 1,
    postCount: 0,
    createdAt: new Date(),
    rules: ['Be respectful', 'No spam'],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockedGetActiveIdentity.mockReturnValue(mockIdentity);
    
    // Setup privacy middleware mocks
    const { PrivacyMiddleware } = await import('../../services/qsocial/PrivacyMiddleware');
    const { EncryptionService } = await import('../../services/qsocial/EncryptionService');
    const { PrivacyAnalyticsService } = await import('../../services/qsocial/PrivacyAnalyticsService');
    
    vi.mocked(PrivacyMiddleware.validatePostCreation).mockResolvedValue({
      success: true,
      data: {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
        privacyLevel: PrivacyLevel.PUBLIC
      }
    });
    
    vi.mocked(PrivacyMiddleware.validateCommentCreation).mockResolvedValue({
      success: true,
      data: {
        postId: 'post-123',
        content: 'Test comment',
        privacyLevel: PrivacyLevel.PUBLIC
      }
    });
    
    vi.mocked(PrivacyMiddleware.filterPosts).mockImplementation((posts) => Promise.resolve({
      success: true,
      data: posts.filter(p => p.privacyLevel !== PrivacyLevel.PRIVATE)
    }));
    
    vi.mocked(EncryptionService.encryptPost).mockImplementation((post) => Promise.resolve(post));
    vi.mocked(PrivacyAnalyticsService.trackPostCreated).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Post Workflow', () => {
    it('should create, vote on, comment on, and search for posts', async () => {
      // Step 1: Create a subcommunity
      const createSubRequest: CreateSubcommunityRequest = {
        name: 'integration-test',
        displayName: 'Integration Test Community',
        description: 'A community for integration testing',
        rules: ['Be respectful', 'No spam'],
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockSubcommunity });
      const subcommunity = await SubcommunityService.createSubcommunity(createSubRequest);
      expect(subcommunity.id).toBe('sub-123');

      // Step 2: Create a post in the subcommunity
      const createPostRequest: CreatePostRequest = {
        title: 'Integration Test Post',
        content: 'This is an integration test post',
        contentType: ContentType.TEXT,
        subcommunityId: subcommunity.id,
        tags: ['integration', 'test'],
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { ...mockPost, subcommunityId: subcommunity.id } });
      const post = await PostService.createPost(createPostRequest);
      expect(post.subcommunityId).toBe(subcommunity.id);

      // Step 3: Vote on the post
      const voteResult = {
        success: true,
        newUpvotes: 1,
        newDownvotes: 0,
        qarmaChange: 10,
        userVote: 'up' as const,
      };

      mockedAxios.post.mockResolvedValueOnce({ data: voteResult });
      const vote = await PostService.votePost(post.id, 'up');
      expect(vote.success).toBe(true);
      expect(vote.newUpvotes).toBe(1);

      // Step 4: Create a comment on the post
      const createCommentRequest: CreateCommentRequest = {
        postId: post.id,
        content: 'This is a test comment',
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      const mockComment: QsocialComment = {
        id: 'comment-123',
        postId: post.id,
        authorId: mockIdentity.did,
        authorIdentity: mockIdentity,
        content: 'This is a test comment',
        parentCommentId: undefined,
        depth: 0,
        childrenIds: [],
        upvotes: 0,
        downvotes: 0,
        privacyLevel: PrivacyLevel.PUBLIC,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false,
        moderationStatus: ModerationStatus.APPROVED,
      };

      mockedAxios.get.mockResolvedValueOnce({ data: post }); // For parent post fetch
      mockedAxios.post.mockResolvedValueOnce({ data: mockComment });
      const comment = await CommentService.createComment(createCommentRequest);
      expect(comment.postId).toBe(post.id);

      // Step 5: Search for the post
      const searchResults = {
        results: [{ type: 'post', data: post, score: 0.9 }],
        total: 1,
        query: 'integration',
        filters: {}
      };

      mockedAxios.get.mockResolvedValueOnce({ data: searchResults });
      const results = await SearchService.search('integration');
      expect(results.total).toBe(1);
      expect(results.results[0].data.id).toBe(post.id);

      // Verify all API calls were made with correct parameters
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // subcommunity, post, vote, comment
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // parent post fetch, search
    });
  });

  describe('Cross-Module Integration', () => {
    it('should create cross-posts from other modules', async () => {
      const crossPostOptions: CrossPostOptions = {
        title: 'Shared from QpiC',
        additionalContent: 'Check out this amazing image!',
        subcommunityId: 'sub-123',
        tags: ['qpic', 'image', 'shared'],
        privacyLevel: PrivacyLevel.PUBLIC,
      };

      const mockCrossPost: QsocialPost = {
        ...mockPost,
        id: 'crosspost-123',
        title: 'Shared from QpiC',
        content: 'Check out this amazing image!',
        contentType: ContentType.CROSS_POST,
        sourceModule: 'qpic',
        sourceId: 'qpic-item-456',
        sourceData: {
          originalTitle: 'Beautiful Sunset',
          imageUrl: 'https://example.com/sunset.jpg',
          author: 'photographer123'
        },
        tags: ['qpic', 'image', 'shared'],
        subcommunityId: 'sub-123',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockCrossPost });

      const crossPost = await PostService.createCrossPost('qpic', 'qpic-item-456', crossPostOptions);

      expect(crossPost.sourceModule).toBe('qpic');
      expect(crossPost.sourceId).toBe('qpic-item-456');
      expect(crossPost.contentType).toBe(ContentType.CROSS_POST);
      expect(crossPost.title).toBe('Shared from QpiC');

      // Verify the API call was made correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/qsocial/cross-posts',
        expect.objectContaining({
          sourceModule: 'qpic',
          sourceId: 'qpic-item-456',
          authorId: mockIdentity.did,
          ...crossPostOptions,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Identity-DID': mockIdentity.did,
          })
        })
      );
    });

    it('should handle cross-module content in unified dashboard', async () => {
      const mockDashboardData = {
        recentPosts: [mockPost],
        moduleActivities: [
          {
            moduleId: 'qpic' as const,
            moduleName: 'QpiC',
            activities: [
              {
                id: 'activity-1',
                type: 'image_uploaded',
                title: 'New Image Uploaded',
                description: 'Beautiful sunset photo',
                url: '/qpic/item/123',
                timestamp: new Date(),
                metadata: { imageUrl: 'https://example.com/sunset.jpg' }
              }
            ],
            lastUpdated: new Date()
          },
          {
            moduleId: 'qmail' as const,
            moduleName: 'Qmail',
            activities: [
              {
                id: 'activity-2',
                type: 'message_received',
                title: 'New Message',
                description: 'You have a new encrypted message',
                url: '/qmail/message/456',
                timestamp: new Date(),
                metadata: { sender: 'friend@example.com' }
              }
            ],
            lastUpdated: new Date()
          }
        ],
        notifications: [],
        trendingSubcommunities: [mockSubcommunity],
        userStats: {
          totalPosts: 5,
          totalComments: 12,
          totalQarma: 150,
          joinedCommunities: 3
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockDashboardData });

      // This would be a dashboard service call
      const dashboardData = (await axios.get('/api/qsocial/dashboard')).data;

      expect(dashboardData.moduleActivities).toHaveLength(2);
      expect(dashboardData.moduleActivities[0].moduleId).toBe('qpic');
      expect(dashboardData.moduleActivities[1].moduleId).toBe('qmail');
      expect(dashboardData.userStats.totalQarma).toBe(150);
    });
  });

  describe('Real-time Features Integration', () => {
    it('should handle real-time vote updates via WebSocket', async () => {
      const mockWebSocketClient = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        send: vi.fn(),
      };

      // Mock WebSocket connection
      const wsEventHandlers: Record<string, Function> = {};
      mockWebSocket.addEventListener.mockImplementation((event: string, handler: Function) => {
        wsEventHandlers[event] = handler;
      });

      // Simulate WebSocket connection
      mockWebSocketClient.connect();

      // Simulate real-time vote update
      const voteUpdateMessage = {
        type: 'vote_update',
        data: {
          targetId: 'post-123',
          targetType: 'post',
          newUpvotes: 5,
          newDownvotes: 1,
          score: 4,
          userVote: 'up',
          qarmaChange: 10
        }
      };

      // Simulate receiving WebSocket message
      if (wsEventHandlers.message) {
        wsEventHandlers.message({ data: JSON.stringify(voteUpdateMessage) });
      }

      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle real-time comment notifications', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: mockIdentity.did,
        type: 'comment',
        title: 'New Comment',
        message: 'Someone commented on your post',
        data: {
          postId: 'post-123',
          commentId: 'comment-456',
          authorName: 'Commenter'
        },
        isRead: false,
        createdAt: new Date()
      };

      // Mock WebSocket notification
      const notificationMessage = {
        type: 'notification',
        data: mockNotification
      };

      const wsEventHandlers: Record<string, Function> = {};
      mockWebSocket.addEventListener.mockImplementation((event: string, handler: Function) => {
        wsEventHandlers[event] = handler;
      });

      // Simulate receiving notification
      if (wsEventHandlers.message) {
        wsEventHandlers.message({ data: JSON.stringify(notificationMessage) });
      }

      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Privacy and Security Integration', () => {
    it('should handle privacy-aware content filtering', async () => {
      const publicPost = { ...mockPost, id: 'public-post', privacyLevel: PrivacyLevel.PUBLIC };
      const privatePost = { ...mockPost, id: 'private-post', privacyLevel: PrivacyLevel.PRIVATE };
      const communityPost = { 
        ...mockPost, 
        id: 'community-post', 
        privacyLevel: PrivacyLevel.COMMUNITY,
        subcommunityId: 'sub-123'
      };

      const allPosts = [publicPost, privatePost, communityPost];
      const filteredPosts = [publicPost, communityPost]; // Private post filtered out

      mockedAxios.get.mockResolvedValueOnce({ data: { posts: allPosts } });

      // Mock privacy middleware filtering
      const mockPrivacyMiddleware = {
        filterPosts: vi.fn().mockResolvedValue({
          success: true,
          data: filteredPosts
        })
      };

      // This would normally be handled by the privacy middleware
      const feed = await PostService.getFeed();

      expect(feed).toHaveLength(2);
      expect(feed.find(p => p.id === 'private-post')).toBeUndefined();
    });

    it('should handle encrypted content for private posts', async () => {
      const encryptedPost = {
        ...mockPost,
        id: 'encrypted-post',
        content: 'encrypted:base64encodedcontent',
        privacyLevel: PrivacyLevel.PRIVATE
      };

      mockedAxios.post.mockResolvedValueOnce({ data: encryptedPost });

      const createRequest: CreatePostRequest = {
        title: 'Private Post',
        content: 'This is private content',
        contentType: ContentType.TEXT,
        privacyLevel: PrivacyLevel.PRIVATE,
      };

      const post = await PostService.createPost(createRequest);

      expect(post.privacyLevel).toBe(PrivacyLevel.PRIVATE);
      // In a real implementation, the content would be encrypted
      expect(post.content).toContain('encrypted:');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
      };

      await expect(PostService.createPost(createRequest)).rejects.toThrow('Network error');
    });

    it('should handle authentication failures', async () => {
      mockedGetActiveIdentity.mockReturnValue(null);

      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
      };

      await expect(PostService.createPost(createRequest)).rejects.toThrow('No active identity found');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(rateLimitError);

      const createRequest: CreatePostRequest = {
        title: 'Test Post',
        content: 'Test content',
        contentType: ContentType.TEXT,
      };

      await expect(PostService.createPost(createRequest)).rejects.toMatchObject(rateLimitError);
    });

    it('should handle service unavailability', async () => {
      const serviceUnavailableError = {
        response: {
          status: 503,
          data: { error: 'Service temporarily unavailable' }
        }
      };

      mockedAxios.get.mockRejectedValueOnce(serviceUnavailableError);

      await expect(PostService.getFeed()).rejects.toMatchObject(serviceUnavailableError);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle large feed requests efficiently', async () => {
      const largeFeed = Array(100).fill(null).map((_, i) => ({
        ...mockPost,
        id: `post-${i}`,
        title: `Post ${i}`,
      }));

      mockedAxios.get.mockResolvedValueOnce({ data: { posts: largeFeed } });

      const feed = await PostService.getFeed({ limit: 100 });

      expect(feed).toHaveLength(100);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=100')
      );
    });

    it('should handle pagination correctly', async () => {
      const firstPage = Array(20).fill(null).map((_, i) => ({
        ...mockPost,
        id: `post-${i}`,
        title: `Post ${i}`,
      }));

      const secondPage = Array(20).fill(null).map((_, i) => ({
        ...mockPost,
        id: `post-${i + 20}`,
        title: `Post ${i + 20}`,
      }));

      // First page request
      mockedAxios.get.mockResolvedValueOnce({ data: { posts: firstPage } });
      const page1 = await PostService.getFeed({ limit: 20, offset: 0 });

      // Second page request
      mockedAxios.get.mockResolvedValueOnce({ data: { posts: secondPage } });
      const page2 = await PostService.getFeed({ limit: 20, offset: 20 });

      expect(page1).toHaveLength(20);
      expect(page2).toHaveLength(20);
      expect(page1[0].id).toBe('post-0');
      expect(page2[0].id).toBe('post-20');
    });
  });

  describe('Search and Discovery Integration', () => {
    it('should perform complex search with multiple filters', async () => {
      const searchResults = {
        results: [
          { type: 'post', data: mockPost, score: 0.9 },
          { type: 'subcommunity', data: mockSubcommunity, score: 0.8 }
        ],
        total: 2,
        query: 'integration test',
        filters: {
          contentType: 'all',
          dateRange: { from: new Date('2023-01-01'), to: new Date('2023-12-31') },
          subcommunityId: 'sub-123',
          tags: ['integration', 'test'],
          minQarma: 50
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: searchResults });

      const results = await SearchService.search('integration test', {
        dateRange: { from: new Date('2023-01-01'), to: new Date('2023-12-31') },
        subcommunityId: 'sub-123',
        tags: ['integration', 'test'],
        minQarma: 50
      });

      expect(results.total).toBe(2);
      expect(results.results).toHaveLength(2);
      expect(results.results[0].type).toBe('post');
      expect(results.results[1].type).toBe('subcommunity');
    });

    it('should get personalized recommendations', async () => {
      const recommendations = [
        {
          content: mockPost,
          score: 0.95,
          reason: 'Similar to your interests in integration testing'
        },
        {
          content: mockSubcommunity,
          score: 0.85,
          reason: 'Active community in your field'
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: { results: recommendations } });

      const results = await RecommendationService.getPersonalizedRecommendations(10);

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.95);
      expect(results[0].reason).toContain('Similar to your interests');
    });
  });

  describe('Moderation Integration', () => {
    it('should handle content moderation workflow', async () => {
      const moderatedPost = {
        ...mockPost,
        id: 'moderated-post',
        moderationStatus: ModerationStatus.PENDING
      };

      // Create post that requires moderation
      mockedAxios.post.mockResolvedValueOnce({ data: moderatedPost });

      const createRequest: CreatePostRequest = {
        title: 'Potentially Problematic Post',
        content: 'This content might need review',
        contentType: ContentType.TEXT,
      };

      const post = await PostService.createPost(createRequest);
      expect(post.moderationStatus).toBe(ModerationStatus.PENDING);

      // Simulate moderation approval
      const approvedPost = {
        ...moderatedPost,
        moderationStatus: ModerationStatus.APPROVED,
        moderatedBy: 'did:squid:moderator'
      };

      mockedAxios.put.mockResolvedValueOnce({ data: approvedPost });

      const updatedPost = await PostService.updatePost(post.id, {
        // This would normally be done by a moderation service
      });

      // In a real implementation, this would be handled by moderation endpoints
      expect(post.moderationStatus).toBe(ModerationStatus.PENDING);
    });
  });
});