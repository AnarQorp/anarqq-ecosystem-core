import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ModerationService, 
  ModerationAction,
  ContentFilterRule,
  ModerationQueueItem,
  AutoModerationResult
} from '../ModerationService';
import { 
  QsocialPost, 
  QsocialComment, 
  ModerationStatus, 
  ContentType, 
  PrivacyLevel 
} from '../../../types/qsocial';

// Mock identity
const mockIdentity = {
  did: 'did:example:123',
  name: 'Test User',
  type: 'ROOT' as const,
  kyc: true,
  reputation: 100
};

// Mock post
const mockPost: QsocialPost = {
  id: 'post_123',
  authorId: 'user_123',
  authorIdentity: mockIdentity,
  title: 'Test Post',
  content: 'This is a test post content',
  contentType: ContentType.TEXT,
  tags: [],
  upvotes: 0,
  downvotes: 0,
  commentCount: 0,
  privacyLevel: PrivacyLevel.PUBLIC,
  createdAt: new Date(),
  updatedAt: new Date(),
  isEdited: false,
  isPinned: false,
  isLocked: false,
  moderationStatus: ModerationStatus.APPROVED
};

// Mock comment
const mockComment: QsocialComment = {
  id: 'comment_123',
  postId: 'post_123',
  authorId: 'user_123',
  authorIdentity: mockIdentity,
  content: 'This is a test comment',
  depth: 0,
  childrenIds: [],
  upvotes: 0,
  downvotes: 0,
  privacyLevel: PrivacyLevel.PUBLIC,
  createdAt: new Date(),
  updatedAt: new Date(),
  isEdited: false,
  moderationStatus: ModerationStatus.APPROVED
};

describe('ModerationService', () => {
  beforeEach(async () => {
    // Reset service state before each test
    (ModerationService as any).moderationQueue = [];
    (ModerationService as any).moderationLog = [];
    (ModerationService as any).contentFilters = [];
    (ModerationService as any).userBans = [];
    
    // Initialize default filters
    await ModerationService.initializeDefaultFilters();
  });

  describe('initializeDefaultFilters', () => {
    it('should create default content filters', async () => {
      const filters = await ModerationService.getContentFilters();
      
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.some(f => f.name === 'Spam Detection')).toBe(true);
      expect(filters.some(f => f.name === 'Profanity Filter')).toBe(true);
      expect(filters.some(f => f.name === 'Hate Speech Detection')).toBe(true);
      expect(filters.some(f => f.name === 'Excessive Caps')).toBe(true);
    });
  });

  describe('moderateContent', () => {
    it('should approve clean content', async () => {
      const result = await ModerationService.moderateContent(mockPost, 'post');
      
      expect(result.action).toBe('approve');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.triggeredRules).toHaveLength(0);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should flag content with profanity', async () => {
      const profanePost = {
        ...mockPost,
        title: 'This is fucking terrible',
        content: 'What a shit post'
      };

      const result = await ModerationService.moderateContent(profanePost, 'post');
      
      expect(result.action).toBe('flag');
      expect(result.triggeredRules.length).toBeGreaterThan(0);
      expect(result.requiresHumanReview).toBe(true);
      expect(result.reasons.some(r => r.includes('Profanity Filter'))).toBe(true);
    });

    it('should flag content with excessive caps', async () => {
      const capsPost = {
        ...mockPost,
        title: 'THIS IS REALLY IMPORTANT EVERYONE LOOK',
        content: 'PLEASE READ THIS IMMEDIATELY'
      };

      const result = await ModerationService.moderateContent(capsPost, 'post');
      
      expect(result.action).toBe('flag');
      expect(result.triggeredRules.length).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Excessive Caps'))).toBe(true);
    });

    it('should hide content detected as hate speech', async () => {
      const hatePost = {
        ...mockPost,
        content: 'I hate everyone and they should all die'
      };

      const result = await ModerationService.moderateContent(hatePost, 'post');
      
      expect(result.action).toBe('hide');
      expect(result.triggeredRules.length).toBeGreaterThan(0);
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should flag spam content', async () => {
      const spamPost = {
        ...mockPost,
        content: 'Buy now! Click here for free money! Amazing deal!'
      };

      const result = await ModerationService.moderateContent(spamPost, 'post');
      
      expect(result.action).toBe('flag');
      expect(result.triggeredRules.length).toBeGreaterThan(0);
    });
  });

  describe('addToModerationQueue', () => {
    it('should add content to moderation queue', async () => {
      const queueItem = await ModerationService.addToModerationQueue(
        'post',
        mockPost.id,
        mockPost,
        {
          reportReason: 'Spam',
          reportedBy: 'user_456',
          priority: 'high'
        }
      );

      expect(queueItem.id).toBeDefined();
      expect(queueItem.contentType).toBe('post');
      expect(queueItem.contentId).toBe(mockPost.id);
      expect(queueItem.reportReason).toBe('Spam');
      expect(queueItem.priority).toBe('high');
      expect(queueItem.status).toBe('pending');
    });

    it('should use default priority if not specified', async () => {
      const queueItem = await ModerationService.addToModerationQueue(
        'comment',
        mockComment.id,
        mockComment
      );

      expect(queueItem.priority).toBe('medium');
    });
  });

  describe('getModerationQueue', () => {
    beforeEach(async () => {
      // Add test items to queue
      await ModerationService.addToModerationQueue('post', 'post1', mockPost, { priority: 'high' });
      await ModerationService.addToModerationQueue('post', 'post2', mockPost, { priority: 'low' });
      await ModerationService.addToModerationQueue('comment', 'comment1', mockComment, { priority: 'urgent' });
    });

    it('should return all queue items by default', async () => {
      const queue = await ModerationService.getModerationQueue();
      expect(queue).toHaveLength(3);
    });

    it('should sort by priority and creation date', async () => {
      const queue = await ModerationService.getModerationQueue();
      
      // Should be sorted: urgent, high, low
      expect(queue[0].priority).toBe('urgent');
      expect(queue[1].priority).toBe('high');
      expect(queue[2].priority).toBe('low');
    });

    it('should filter by status', async () => {
      const queue = await ModerationService.getModerationQueue({ status: 'pending' });
      expect(queue).toHaveLength(3);
      expect(queue.every(item => item.status === 'pending')).toBe(true);
    });

    it('should filter by priority', async () => {
      const queue = await ModerationService.getModerationQueue({ priority: 'high' });
      expect(queue).toHaveLength(1);
      expect(queue[0].priority).toBe('high');
    });

    it('should respect limit and offset', async () => {
      const queue = await ModerationService.getModerationQueue({ limit: 2, offset: 1 });
      expect(queue).toHaveLength(2);
    });
  });

  describe('assignModerationItem', () => {
    it('should assign queue item to moderator', async () => {
      const queueItem = await ModerationService.addToModerationQueue('post', mockPost.id, mockPost);
      
      const success = await ModerationService.assignModerationItem(queueItem.id, 'moderator_123');
      expect(success).toBe(true);

      const queue = await ModerationService.getModerationQueue();
      const assignedItem = queue.find(item => item.id === queueItem.id);
      expect(assignedItem?.assignedTo).toBe('moderator_123');
      expect(assignedItem?.status).toBe('in_review');
    });

    it('should return false for non-existent item', async () => {
      const success = await ModerationService.assignModerationItem('non_existent', 'moderator_123');
      expect(success).toBe(false);
    });
  });

  describe('performModerationAction', () => {
    it('should perform approve action', async () => {
      const success = await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.APPROVE,
        'post',
        mockPost.id,
        'Content is appropriate'
      );

      expect(success).toBe(true);

      const log = await ModerationService.getModerationLog();
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe(ModerationAction.APPROVE);
      expect(log[0].moderatorId).toBe('moderator_123');
      expect(log[0].reason).toBe('Content is appropriate');
    });

    it('should perform hide action', async () => {
      const success = await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.HIDE,
        'post',
        mockPost.id,
        'Inappropriate content'
      );

      expect(success).toBe(true);

      const log = await ModerationService.getModerationLog();
      expect(log[0].action).toBe(ModerationAction.HIDE);
    });

    it('should perform ban user action', async () => {
      const success = await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.BAN_USER,
        'user',
        'user_456',
        'Repeated violations',
        { banDuration: 24 }
      );

      expect(success).toBe(true);

      const isBanned = await ModerationService.isUserBanned('user_456');
      expect(isBanned).toBe(true);
    });

    it('should update queue item status when provided', async () => {
      const queueItem = await ModerationService.addToModerationQueue('post', mockPost.id, mockPost);
      
      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.APPROVE,
        'post',
        mockPost.id,
        'Approved',
        { queueItemId: queueItem.id }
      );

      const queue = await ModerationService.getModerationQueue();
      const resolvedItem = queue.find(item => item.id === queueItem.id);
      expect(resolvedItem?.status).toBe('resolved');
    });
  });

  describe('getModerationLog', () => {
    beforeEach(async () => {
      // Add test log entries
      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.APPROVE,
        'post',
        'post1',
        'Good content'
      );
      await ModerationService.performModerationAction(
        'moderator_456',
        mockIdentity,
        ModerationAction.HIDE,
        'comment',
        'comment1',
        'Inappropriate'
      );
    });

    it('should return all log entries by default', async () => {
      const log = await ModerationService.getModerationLog();
      expect(log).toHaveLength(2);
    });

    it('should filter by moderator ID', async () => {
      const log = await ModerationService.getModerationLog({ moderatorId: 'moderator_123' });
      expect(log).toHaveLength(1);
      expect(log[0].moderatorId).toBe('moderator_123');
    });

    it('should filter by content type', async () => {
      const log = await ModerationService.getModerationLog({ contentType: 'post' });
      expect(log).toHaveLength(1);
      expect(log[0].contentType).toBe('post');
    });

    it('should filter by action', async () => {
      const log = await ModerationService.getModerationLog({ action: ModerationAction.HIDE });
      expect(log).toHaveLength(1);
      expect(log[0].action).toBe(ModerationAction.HIDE);
    });

    it('should sort by timestamp (newest first)', async () => {
      const log = await ModerationService.getModerationLog();
      expect(log[0].timestamp.getTime()).toBeGreaterThanOrEqual(log[1].timestamp.getTime());
    });
  });

  describe('createContentFilter', () => {
    it('should create new content filter', async () => {
      const filter = await ModerationService.createContentFilter('admin_123', {
        name: 'Custom Filter',
        type: 'keyword',
        pattern: 'badword',
        action: 'flag',
        severity: 'medium',
        isActive: true
      });

      expect(filter.id).toBeDefined();
      expect(filter.name).toBe('Custom Filter');
      expect(filter.createdBy).toBe('admin_123');
      expect(filter.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateContentFilter', () => {
    it('should update existing content filter', async () => {
      const filter = await ModerationService.createContentFilter('admin_123', {
        name: 'Test Filter',
        type: 'keyword',
        pattern: 'test',
        action: 'flag',
        severity: 'low',
        isActive: true
      });

      const success = await ModerationService.updateContentFilter(filter.id, {
        name: 'Updated Filter',
        severity: 'high'
      });

      expect(success).toBe(true);

      const filters = await ModerationService.getContentFilters();
      const updatedFilter = filters.find(f => f.id === filter.id);
      expect(updatedFilter?.name).toBe('Updated Filter');
      expect(updatedFilter?.severity).toBe('high');
    });

    it('should return false for non-existent filter', async () => {
      const success = await ModerationService.updateContentFilter('non_existent', {
        name: 'Updated'
      });
      expect(success).toBe(false);
    });
  });

  describe('deleteContentFilter', () => {
    it('should delete existing content filter', async () => {
      const filter = await ModerationService.createContentFilter('admin_123', {
        name: 'Test Filter',
        type: 'keyword',
        pattern: 'test',
        action: 'flag',
        severity: 'low',
        isActive: true
      });

      const success = await ModerationService.deleteContentFilter(filter.id);
      expect(success).toBe(true);

      const filters = await ModerationService.getContentFilters();
      expect(filters.find(f => f.id === filter.id)).toBeUndefined();
    });

    it('should return false for non-existent filter', async () => {
      const success = await ModerationService.deleteContentFilter('non_existent');
      expect(success).toBe(false);
    });
  });

  describe('getModerationStats', () => {
    beforeEach(async () => {
      // Add test data
      await ModerationService.addToModerationQueue('post', 'post1', mockPost, { 
        reportReason: 'Spam',
        priority: 'high'
      });
      await ModerationService.addToModerationQueue('post', 'post2', mockPost, { 
        reportReason: 'Inappropriate',
        priority: 'medium'
      });
      await ModerationService.addToModerationQueue('comment', 'comment1', mockComment, { 
        reportReason: 'Spam',
        priority: 'low'
      });

      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.APPROVE,
        'post',
        'post1',
        'Approved'
      );
    });

    it('should return comprehensive moderation statistics', async () => {
      const stats = await ModerationService.getModerationStats();

      expect(stats.totalReports).toBe(3);
      expect(stats.pendingReports).toBe(3); // All items start as pending, only one gets resolved
      expect(stats.resolvedReports).toBe(0); // No items are marked as resolved in queue
      expect(stats.manualModerationActions).toBe(1);
      expect(stats.topReportReasons).toEqual([
        { reason: 'Spam', count: 2 },
        { reason: 'Inappropriate', count: 1 }
      ]);
    });
  });

  describe('isUserBanned', () => {
    beforeEach(async () => {
      // Ban a user
      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.BAN_USER,
        'user',
        'user_456',
        'Violations',
        { banDuration: 24 }
      );
    });

    it('should return true for banned user', async () => {
      const isBanned = await ModerationService.isUserBanned('user_456');
      expect(isBanned).toBe(true);
    });

    it('should return false for non-banned user', async () => {
      const isBanned = await ModerationService.isUserBanned('user_789');
      expect(isBanned).toBe(false);
    });
  });

  describe('getUserBans', () => {
    beforeEach(async () => {
      // Ban a user in multiple communities
      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.BAN_USER,
        'user',
        'user_456',
        'Global violation'
      );
      await ModerationService.performModerationAction(
        'moderator_123',
        mockIdentity,
        ModerationAction.BAN_USER,
        'user',
        'user_456',
        'Community violation',
        { subcommunityId: 'community_123' }
      );
    });

    it('should return all active bans for user', async () => {
      const bans = await ModerationService.getUserBans('user_456');
      expect(bans).toHaveLength(2);
      expect(bans.every(ban => ban.userId === 'user_456')).toBe(true);
      expect(bans.every(ban => ban.isActive)).toBe(true);
    });
  });
});