import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotificationService } from '../NotificationService';
import { getActiveIdentity } from '../../../state/identity';
import type { QsocialNotification } from '../../../types/qsocial';

// Mock the identity service
vi.mock('../../../state/identity', () => ({
  getActiveIdentity: vi.fn(),
}));

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
}));

describe('NotificationService', () => {
  const mockIdentity = {
    did: 'did:squid:testuser',
    name: 'Test User',
    type: 'ROOT' as const,
    kyc: true,
    reputation: 100,
  };

  beforeEach(() => {
    // Clear all notifications and preferences before each test
    NotificationService.clearAllNotifications();
    
    // Setup default mocks
    vi.mocked(getActiveIdentity).mockReturnValue(mockIdentity);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const request = {
        userId: 'did:squid:testuser',
        type: 'vote' as const,
        title: 'New Vote',
        message: 'Someone voted on your post',
        data: { postId: 'post123' }
      };

      const notification = await NotificationService.createNotification(request);

      expect(notification).toMatchObject({
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data,
        isRead: false,
      });
      expect(notification.id).toBeDefined();
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error for missing required fields', async () => {
      const request = {
        userId: '',
        type: 'vote' as const,
        title: '',
        message: 'Test message'
      };

      await expect(NotificationService.createNotification(request)).rejects.toThrow('Missing required notification fields');
    });

    it('should respect user preferences when notifications are disabled', async () => {
      const userId = 'did:squid:testuser';
      
      // Disable notifications for user
      await NotificationService.updateUserPreferences(userId, { enabled: false });

      const request = {
        userId,
        type: 'vote' as const,
        title: 'New Vote',
        message: 'Someone voted on your post'
      };

      const notification = await NotificationService.createNotification(request);
      
      // Should still create notification but not deliver it
      expect(notification).toBeDefined();
    });

    it('should respect type-specific preferences', async () => {
      const userId = 'did:squid:testuser';
      
      // Disable vote notifications
      const preferences = await NotificationService.getUserPreferences(userId);
      preferences.types.vote.enabled = false;
      await NotificationService.updateUserPreferences(userId, preferences);

      const request = {
        userId,
        type: 'vote' as const,
        title: 'New Vote',
        message: 'Someone voted on your post'
      };

      const notification = await NotificationService.createNotification(request);
      expect(notification).toBeDefined();
    });

    it('should handle do not disturb mode', async () => {
      const userId = 'did:squid:testuser';
      
      // Enable do not disturb (current time should be within the range for this test)
      await NotificationService.updateUserPreferences(userId, {
        doNotDisturb: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59'
        }
      });

      const request = {
        userId,
        type: 'vote' as const,
        title: 'New Vote',
        message: 'Someone voted on your post'
      };

      const notification = await NotificationService.createNotification(request);
      expect(notification).toBeDefined();
    });
  });

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // Create some test notifications
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Vote 1',
        message: 'Message 1'
      });

      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'comment',
        title: 'Comment 1',
        message: 'Message 2'
      });

      await NotificationService.createNotification({
        userId: 'did:squid:otheruser',
        type: 'vote',
        title: 'Other Vote',
        message: 'Other Message'
      });
    });

    it('should get notifications for a user', async () => {
      const notifications = await NotificationService.getUserNotifications('did:squid:testuser');

      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.userId === 'did:squid:testuser')).toBe(true);
    });

    it('should filter by unread only', async () => {
      const allNotifications = await NotificationService.getUserNotifications('did:squid:testuser');
      
      // Mark one as read
      await NotificationService.markAsRead(allNotifications[0].id);

      const unreadNotifications = await NotificationService.getUserNotifications('did:squid:testuser', {
        unreadOnly: true
      });

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].isRead).toBe(false);
    });

    it('should filter by notification types', async () => {
      const voteNotifications = await NotificationService.getUserNotifications('did:squid:testuser', {
        types: ['vote']
      });

      expect(voteNotifications).toHaveLength(1);
      expect(voteNotifications[0].type).toBe('vote');
    });

    it('should apply pagination', async () => {
      const notifications = await NotificationService.getUserNotifications('did:squid:testuser', {
        limit: 1,
        offset: 0
      });

      expect(notifications).toHaveLength(1);
    });

    it('should throw error for missing user ID', async () => {
      await expect(NotificationService.getUserNotifications('')).rejects.toThrow('User ID is required');
    });
  });

  describe('markAsRead', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Test Vote',
        message: 'Test message'
      });
      notificationId = notification.id;
    });

    it('should mark notification as read', async () => {
      await NotificationService.markAsRead(notificationId);

      const notifications = await NotificationService.getUserNotifications('did:squid:testuser');
      const notification = notifications.find(n => n.id === notificationId);
      
      expect(notification?.isRead).toBe(true);
    });

    it('should throw error for non-existent notification', async () => {
      await expect(NotificationService.markAsRead('invalid-id')).rejects.toThrow('Notification not found');
    });

    it('should throw error for unauthorized user', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue({
        ...mockIdentity,
        did: 'did:squid:otheruser'
      });

      await expect(NotificationService.markAsRead(notificationId)).rejects.toThrow('Unauthorized to mark notification as read');
    });
  });

  describe('markAllAsRead', () => {
    beforeEach(async () => {
      // Create multiple notifications
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Vote 1',
        message: 'Message 1'
      });

      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'comment',
        title: 'Comment 1',
        message: 'Message 2'
      });
    });

    it('should mark all notifications as read', async () => {
      await NotificationService.markAllAsRead('did:squid:testuser');

      const notifications = await NotificationService.getUserNotifications('did:squid:testuser');
      expect(notifications.every(n => n.isRead)).toBe(true);
    });

    it('should throw error for unauthorized user', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue({
        ...mockIdentity,
        did: 'did:squid:otheruser'
      });

      await expect(NotificationService.markAllAsRead('did:squid:testuser')).rejects.toThrow('Unauthorized to mark notifications as read');
    });
  });

  describe('deleteNotification', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Test Vote',
        message: 'Test message'
      });
      notificationId = notification.id;
    });

    it('should delete notification', async () => {
      await NotificationService.deleteNotification(notificationId);

      const notifications = await NotificationService.getUserNotifications('did:squid:testuser');
      expect(notifications.find(n => n.id === notificationId)).toBeUndefined();
    });

    it('should throw error for non-existent notification', async () => {
      await expect(NotificationService.deleteNotification('invalid-id')).rejects.toThrow('Notification not found');
    });

    it('should throw error for unauthorized user', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue({
        ...mockIdentity,
        did: 'did:squid:otheruser'
      });

      await expect(NotificationService.deleteNotification(notificationId)).rejects.toThrow('Unauthorized to delete notification');
    });
  });

  describe('getUserPreferences', () => {
    it('should return default preferences for new user', async () => {
      const preferences = await NotificationService.getUserPreferences('did:squid:newuser');

      expect(preferences).toMatchObject({
        userId: 'did:squid:newuser',
        enabled: true,
        frequency: 'immediate'
      });
      expect(preferences.types.vote.enabled).toBe(true);
      expect(preferences.types.comment.enabled).toBe(true);
      expect(preferences.doNotDisturb.enabled).toBe(false);
    });

    it('should return cached preferences for existing user', async () => {
      const userId = 'did:squid:testuser';
      
      // Get preferences first time (creates defaults)
      const preferences1 = await NotificationService.getUserPreferences(userId);
      
      // Modify preferences
      preferences1.enabled = false;
      await NotificationService.updateUserPreferences(userId, preferences1);
      
      // Get preferences again (should return modified version)
      const preferences2 = await NotificationService.getUserPreferences(userId);
      
      expect(preferences2.enabled).toBe(false);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'did:squid:testuser';
      const updates = {
        enabled: false,
        frequency: 'daily' as const
      };

      const updatedPreferences = await NotificationService.updateUserPreferences(userId, updates);

      expect(updatedPreferences.enabled).toBe(false);
      expect(updatedPreferences.frequency).toBe('daily');
      expect(updatedPreferences.userId).toBe(userId);
    });

    it('should throw error for unauthorized user', async () => {
      vi.mocked(getActiveIdentity).mockReturnValue({
        ...mockIdentity,
        did: 'did:squid:otheruser'
      });

      await expect(NotificationService.updateUserPreferences('did:squid:testuser', {}))
        .rejects.toThrow('Unauthorized to update notification preferences');
    });

    it('should throw error for missing user ID', async () => {
      await expect(NotificationService.updateUserPreferences('', {}))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('getNotificationStats', () => {
    beforeEach(async () => {
      // Create test notifications
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Vote 1',
        message: 'Message 1'
      });

      const notification2 = await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'comment',
        title: 'Comment 1',
        message: 'Message 2'
      });

      // Mark one as read
      await NotificationService.markAsRead(notification2.id);
    });

    it('should return correct notification statistics', async () => {
      const stats = await NotificationService.getNotificationStats('did:squid:testuser');

      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(1);
      expect(stats.byType.vote).toBe(1);
      expect(stats.byType.comment).toBe(1);
      expect(stats.byPriority.normal).toBe(2);
    });

    it('should throw error for missing user ID', async () => {
      await expect(NotificationService.getNotificationStats('')).rejects.toThrow('User ID is required');
    });
  });

  describe('onNotificationEvent', () => {
    it('should notify listeners of notification events', async () => {
      const listener = vi.fn();
      const unsubscribe = NotificationService.onNotificationEvent(listener);

      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Test Vote',
        message: 'Test message'
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'created',
          notification: expect.objectContaining({
            title: 'Test Vote'
          })
        })
      );

      unsubscribe();
    });

    it('should allow unsubscribing from events', async () => {
      const listener = vi.fn();
      const unsubscribe = NotificationService.onNotificationEvent(listener);
      
      unsubscribe();

      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Test Vote',
        message: 'Test message'
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('connectWebSocket', () => {
    it('should create WebSocket connection', async () => {
      await NotificationService.connectWebSocket('did:squid:testuser');

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001/notifications/did:squid:testuser');
    });

    it('should throw error for missing user ID', async () => {
      await expect(NotificationService.connectWebSocket('')).rejects.toThrow('User ID is required');
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should remove expired notifications', async () => {
      // Create notification with expiration in the past
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Expired Vote',
        message: 'This should be cleaned up',
        expiresAt: expiredDate
      });

      // Create non-expired notification
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'comment',
        title: 'Active Comment',
        message: 'This should remain'
      });

      const cleanedCount = NotificationService.cleanupExpiredNotifications();
      expect(cleanedCount).toBe(1);

      const notifications = await NotificationService.getUserNotifications('did:squid:testuser');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Active Comment');
    });

    it('should return 0 when no notifications are expired', async () => {
      await NotificationService.createNotification({
        userId: 'did:squid:testuser',
        type: 'vote',
        title: 'Active Vote',
        message: 'This should remain'
      });

      const cleanedCount = NotificationService.cleanupExpiredNotifications();
      expect(cleanedCount).toBe(0);
    });
  });
});