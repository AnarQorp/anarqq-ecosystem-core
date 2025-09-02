import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VotingService } from '../VotingService';
import { PostService as PostAPI, CommentService as CommentAPI } from '../../../api/qsocial';
import { getActiveIdentity } from '../../../state/identity';
import type { VoteResult, QsocialPost, QsocialComment } from '../../../types/qsocial';

// Mock the API services
vi.mock('../../../api/qsocial', () => ({
  PostService: {
    getPost: vi.fn(),
    votePost: vi.fn(),
  },
  CommentService: {
    getComment: vi.fn(),
    voteComment: vi.fn(),
  },
}));

// Mock the identity service
vi.mock('../../../state/identity', () => ({
  getActiveIdentity: vi.fn(),
}));

describe('VotingService', () => {
  const mockIdentity = {
    did: 'did:squid:testuser',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100,
  };

  const mockPost: QsocialPost = {
    id: 'post1',
    authorId: 'did:squid:author',
    authorIdentity: mockIdentity,
    title: 'Test Post',
    content: 'Test content',
    contentType: 'text' as any,
    tags: [],
    upvotes: 5,
    downvotes: 2,
    commentCount: 0,
    privacyLevel: 'public' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    isPinned: false,
    isLocked: false,
    moderationStatus: 'approved' as any,
  };

  const mockComment: QsocialComment = {
    id: 'comment1',
    postId: 'post1',
    authorId: 'did:squid:author',
    authorIdentity: mockIdentity,
    content: 'Test comment',
    parentCommentId: undefined,
    depth: 0,
    childrenIds: [],
    upvotes: 3,
    downvotes: 1,
    privacyLevel: 'public' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    moderationStatus: 'approved' as any,
  };

  const mockVoteResult: VoteResult = {
    success: true,
    newUpvotes: 6,
    newDownvotes: 2,
    qarmaChange: 10,
    userVote: 'up',
  };

  beforeEach(() => {
    // Clear vote records before each test
    VotingService.clearVoteRecords();
    
    // Setup default mocks
    vi.mocked(getActiveIdentity).mockReturnValue(mockIdentity);
    vi.mocked(PostAPI.getPost).mockResolvedValue(mockPost);
    vi.mocked(CommentAPI.getComment).mockResolvedValue(mockComment);
    vi.mocked(PostAPI.votePost).mockResolvedValue(mockVoteResult);
    vi.mocked(CommentAPI.voteComment).mockResolvedValue(mockVoteResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('votePost', () => {
    it('should successfully vote on a post', async () => {
      const result = await VotingService.votePost('post1', 'up');

      expect(result).toEqual(mockVoteResult);
      expect(PostAPI.getPost).toHaveBeenCalledWith('post1');
      expect(PostAPI.votePost).toHaveBeenCalledWith('post1', 'up');
    });

    it('should throw error for invalid post ID', async () => {
      await expect(VotingService.votePost('', 'up')).rejects.toThrow('Post ID is required');
      await expect(VotingService.votePost('   ', 'up')).rejects.toThrow('Post ID is required');
    });

    it('should throw error for invalid vote type', async () => {
      await expect(VotingService.votePost('post1', 'invalid' as any)).rejects.toThrow('Invalid vote type');
    });

    it('should throw error when user is not authenticated', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue(null);

      await expect(VotingService.votePost('post1', 'up')).rejects.toThrow('Authentication required to vote');
    });

    it('should throw error when voting on own post', async () => {
      const ownPost = { ...mockPost, authorId: mockIdentity.did };
      vi.mocked(PostAPI.getPost).mockResolvedValue(ownPost);

      await expect(VotingService.votePost('post1', 'up')).rejects.toThrow('You cannot vote on your own posts');
    });

    it('should throw error for duplicate vote', async () => {
      // First vote should succeed
      await VotingService.votePost('post1', 'up');

      // Second identical vote should fail
      await expect(VotingService.votePost('post1', 'up')).rejects.toThrow('You have already cast this vote');
    });

    it('should allow changing vote from up to down', async () => {
      // First vote up
      await VotingService.votePost('post1', 'up');

      // Change to down vote should succeed
      const result = await VotingService.votePost('post1', 'down');
      expect(result).toEqual(mockVoteResult);
    });

    it('should allow removing vote', async () => {
      // First vote up
      await VotingService.votePost('post1', 'up');

      // Remove vote should succeed
      const result = await VotingService.votePost('post1', 'remove');
      expect(result).toEqual(mockVoteResult);
    });

    it('should throw error when removing non-existent vote', async () => {
      await expect(VotingService.votePost('post1', 'remove')).rejects.toThrow('No existing vote to remove');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(PostAPI.votePost).mockRejectedValue(new Error('API Error'));

      await expect(VotingService.votePost('post1', 'up')).rejects.toThrow('API Error');
    });
  });

  describe('voteComment', () => {
    it('should successfully vote on a comment', async () => {
      const result = await VotingService.voteComment('comment1', 'up');

      expect(result).toEqual(mockVoteResult);
      expect(CommentAPI.getComment).toHaveBeenCalledWith('comment1');
      expect(CommentAPI.voteComment).toHaveBeenCalledWith('comment1', 'up');
    });

    it('should throw error for invalid comment ID', async () => {
      await expect(VotingService.voteComment('', 'up')).rejects.toThrow('Comment ID is required');
    });

    it('should throw error when voting on own comment', async () => {
      const ownComment = { ...mockComment, authorId: mockIdentity.did };
      vi.mocked(CommentAPI.getComment).mockResolvedValue(ownComment);

      await expect(VotingService.voteComment('comment1', 'up')).rejects.toThrow('You cannot vote on your own comments');
    });

    it('should prevent duplicate comment votes', async () => {
      // First vote should succeed
      await VotingService.voteComment('comment1', 'down');

      // Second identical vote should fail
      await expect(VotingService.voteComment('comment1', 'down')).rejects.toThrow('You have already cast this vote');
    });
  });

  describe('getUserVote', () => {
    it('should return null for no vote', () => {
      const vote = VotingService.getUserVote('user1', 'post1', 'post');
      expect(vote).toBeNull();
    });

    it('should return correct vote after voting', async () => {
      await VotingService.votePost('post1', 'up');
      
      const vote = VotingService.getUserVote(mockIdentity.did, 'post1', 'post');
      expect(vote).toBe('up');
    });

    it('should return null after removing vote', async () => {
      await VotingService.votePost('post1', 'up');
      await VotingService.votePost('post1', 'remove');
      
      const vote = VotingService.getUserVote(mockIdentity.did, 'post1', 'post');
      expect(vote).toBeNull();
    });
  });

  describe('hasUserVoted', () => {
    it('should return false for no vote', () => {
      const hasVoted = VotingService.hasUserVoted('user1', 'post1', 'post');
      expect(hasVoted).toBe(false);
    });

    it('should return true after voting', async () => {
      await VotingService.votePost('post1', 'down');
      
      const hasVoted = VotingService.hasUserVoted(mockIdentity.did, 'post1', 'post');
      expect(hasVoted).toBe(true);
    });
  });

  describe('getVoteStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = VotingService.getVoteStatistics(10, 3);

      expect(stats).toEqual({
        upvotes: 10,
        downvotes: 3,
        score: 7,
        totalVotes: 13,
        upvoteRatio: 10/13,
        isControversial: false,
        isPopular: false,
      });
    });

    it('should identify controversial content', () => {
      const stats = VotingService.getVoteStatistics(6, 5); // 11 total, 54.5% upvote ratio

      expect(stats.isControversial).toBe(true);
      expect(stats.isPopular).toBe(false);
    });

    it('should identify popular content', () => {
      const stats = VotingService.getVoteStatistics(15, 2); // Score 13, 88% upvote ratio

      expect(stats.isPopular).toBe(true);
      expect(stats.isControversial).toBe(false);
    });

    it('should handle zero votes', () => {
      const stats = VotingService.getVoteStatistics(0, 0);

      expect(stats).toEqual({
        upvotes: 0,
        downvotes: 0,
        score: 0,
        totalVotes: 0,
        upvoteRatio: 0,
        isControversial: false,
        isPopular: false,
      });
    });
  });

  describe('calculateQarmaImpact', () => {
    it('should calculate correct Qarma for post upvote', () => {
      const impact = VotingService.calculateQarmaImpact('up', 'post');
      expect(impact).toBe(10);
    });

    it('should calculate correct Qarma for post downvote', () => {
      const impact = VotingService.calculateQarmaImpact('down', 'post');
      expect(impact).toBe(-5);
    });

    it('should calculate correct Qarma for comment upvote', () => {
      const impact = VotingService.calculateQarmaImpact('up', 'comment');
      expect(impact).toBe(5);
    });

    it('should calculate correct Qarma for comment downvote', () => {
      const impact = VotingService.calculateQarmaImpact('down', 'comment');
      expect(impact).toBe(-2);
    });

    it('should return zero for remove vote', () => {
      const impact = VotingService.calculateQarmaImpact('remove', 'post');
      expect(impact).toBe(0);
    });
  });

  describe('onVoteUpdate', () => {
    it('should notify listeners of vote updates', async () => {
      const listener = vi.fn();
      const unsubscribe = VotingService.onVoteUpdate(listener);

      await VotingService.votePost('post1', 'up');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'post1',
          targetType: 'post',
          newUpvotes: 6,
          newDownvotes: 2,
          score: 4,
          qarmaChange: 10,
        })
      );

      unsubscribe();
    });

    it('should allow unsubscribing from updates', async () => {
      const listener = vi.fn();
      const unsubscribe = VotingService.onVoteUpdate(listener);
      
      unsubscribe();
      await VotingService.votePost('post1', 'up');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getUserVoteHistory', () => {
    it('should return empty array for user with no votes', () => {
      const history = VotingService.getUserVoteHistory('user1');
      expect(history).toEqual([]);
    });

    it('should return vote history for user', async () => {
      await VotingService.votePost('post1', 'up');
      await VotingService.voteComment('comment1', 'down');

      const history = VotingService.getUserVoteHistory(mockIdentity.did);
      
      expect(history).toHaveLength(2);
      expect(history[0].targetType).toBe('comment'); // Most recent first
      expect(history[0].voteType).toBe('down');
      expect(history[1].targetType).toBe('post');
      expect(history[1].voteType).toBe('up');
    });
  });

  describe('getTargetVoteSummary', () => {
    it('should return empty summary for unvoted target', () => {
      const summary = VotingService.getTargetVoteSummary('post1', 'post');
      
      expect(summary).toEqual({
        upvotes: [],
        downvotes: [],
        totalVoters: 0,
      });
    });

    it('should return correct vote summary', async () => {
      // Mock multiple users voting
      vi.mocked(getActiveIdentity).mockReturnValue({ ...mockIdentity, did: 'user1' });
      await VotingService.votePost('post1', 'up');

      vi.mocked(getActiveIdentity).mockReturnValue({ ...mockIdentity, did: 'user2' });
      await VotingService.votePost('post1', 'down');

      const summary = VotingService.getTargetVoteSummary('post1', 'post');
      
      expect(summary.upvotes).toEqual(['user1']);
      expect(summary.downvotes).toEqual(['user2']);
      expect(summary.totalVoters).toBe(2);
    });
  });

  describe('getVotingTrends', () => {
    it('should return correct trends', async () => {
      await VotingService.votePost('post1', 'up');
      await VotingService.voteComment('comment1', 'down');

      const trends = VotingService.getVotingTrends('day');

      expect(trends.totalVotes).toBe(2);
      expect(trends.upvotes).toBe(1);
      expect(trends.downvotes).toBe(1);
      expect(trends.uniqueVoters).toBe(1);
      expect(trends.topTargets).toHaveLength(2);
    });

    it('should filter by time range', async () => {
      await VotingService.votePost('post1', 'up');
      
      // Mock old timestamp
      const voteRecords = (VotingService as any).voteRecords;
      const record = voteRecords.get(`${mockIdentity.did}:post1:post`);
      record.timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const trends = VotingService.getVotingTrends('day');
      expect(trends.totalVotes).toBe(0);
    });
  });

  describe('validateBulkVotes', () => {
    it('should validate multiple targets', async () => {
      const targets = [
        { id: 'post1', type: 'post' as const },
        { id: 'comment1', type: 'comment' as const },
      ];

      const results = await VotingService.validateBulkVotes(mockIdentity.did, targets);

      expect(results.size).toBe(2);
      expect(results.get('post1')?.isValid).toBe(true);
      expect(results.get('comment1')?.isValid).toBe(true);
    });

    it('should handle validation errors in bulk', async () => {
      vi.mocked(PostAPI.getPost).mockRejectedValue(new Error('Post not found'));

      const targets = [{ id: 'invalid_post', type: 'post' as const }];
      const results = await VotingService.validateBulkVotes(mockIdentity.did, targets);

      expect(results.get('invalid_post')?.isValid).toBe(false);
    });
  });
});