/**
 * Notification Service Tests
 * Tests for notification creation, delivery, preferences, and DND functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { notificationService } from '../services/NotificationService.mjs';

describe('Notification Service', () => {
  const testUserId = 'did:squid:test123';
  const testUserId2 = 'did:squid:test456';

  beforeEach(() => {
    // Clear any existing notifications and settings
    notificationService.notifications.clear();
    notificationService.preferences.clear();
    notificationService.doNotDisturbSettings.clear();
  });

  afterEach(() => {
    // Clean up after each test
    notificationService.notifications.clear();
    notificationService.preferences.clear();
    notificationService.doNotDisturbSettings.clear();
  });

  describe('Notification Creation', () => {
    it('should create a basic notification', async () => {
      const notification = await notificationService.createNotification({
        userId: testUserId,
        type: 'test',
        title: 'Test Notification',
        message: 'This is a test',
        sourceId: 'test-source',
        sourceType: 'test',
        sourceUserId: testUserId2
      });

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.type).toBe('test');
      expect(notification.title).toBe('Test Notification');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });

    it('should create mention notification', async () => {
      const notification = await notificationService.createMentionNotification(
        testUserId,
        testUserId2,
        'post-123',
        'post',
        'Hey @user, check this out!'
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe('mention');
      expect(notification.title).toBe('You were mentioned');
      expect(notification.data.content).toContain('Hey @user');
      expect(notification.data.mentionerName).toContain('User_');
    });

    it('should create reply notification', async () => {
      const notification = await notificationService.createReplyNotification(
        testUserId,
        testUserId2,
        'post-123',
        'post',
        'Great post! Thanks for sharing.'
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe('reply');
      expect(notification.title).toBe('New reply to your post');
      expect(notification.data.content).toContain('Great post!');
    });

    it('should create vote notification for upvotes only', async () => {
      const upvoteNotification = await notificationService.createVoteNotification(
        testUserId,
        testUserId2,
        'post-123',
        'post',
        'up',
        15
      );

      expect(upvoteNotification).toBeDefined();
      expect(upvoteNotification.type).toBe('vote');
      expect(upvoteNotification.data.voteType).toBe('up');

      const downvoteNotification = await notificationService.createVoteNotification(
        testUserId,
        testUserId2,
        'post-123',
        'post',
        'down',
        10
      );

      expect(downvoteNotification).toBeNull();
    });

    it('should create community post notifications', async () => {
      const notifications = await notificationService.createPostInCommunityNotification(
        'community-123',
        testUserId,
        'post-456',
        'New Community Post'
      );

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      
      notifications.forEach(notification => {
        expect(notification.type).toBe('post_in_community');
        expect(notification.data.subcommunityId).toBe('community-123');
        expect(notification.data.postTitle).toBe('New Community Post');
      });
    });

    it('should create moderation notification', async () => {
      const notification = await notificationService.createModerationNotification(
        testUserId,
        testUserId2,
        'removed',
        'post-123',
        'post',
        'Spam content'
      );

      expect(notification).toBeDefined();
      expect(notification.type).toBe('moderation');
      expect(notification.data.action).toBe('removed');
      expect(notification.data.reason).toBe('Spam content');
    });
  });

  describe('Notification Management', () => {
    beforeEach(async () => {
      // Create some test notifications
      await notificationService.createNotification({
        userId: testUserId,
        type: 'test1',
        title: 'Test 1',
        message: 'First test notification',
        sourceId: 'test-1',
        sourceType: 'test'
      });

      await notificationService.createNotification({
        userId: testUserId,
        type: 'test2',
        title: 'Test 2',
        message: 'Second test notification',
        sourceId: 'test-2',
        sourceType: 'test'
      });
    });

    it('should get user notifications', () => {
      const result = notificationService.getUserNotifications(testUserId);

      expect(result.notifications).toBeDefined();
      expect(result.notifications.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.unreadCount).toBe(2);
    });

    it('should get unread notifications only', () => {
      const result = notificationService.getUserNotifications(testUserId, { unreadOnly: true });

      expect(result.notifications.length).toBe(2);
      expect(result.unreadCount).toBe(2);
    });

    it('should paginate notifications', () => {
      const result = notificationService.getUserNotifications(testUserId, { limit: 1, offset: 0 });

      expect(result.notifications.length).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should mark notification as read', () => {
      const result = notificationService.getUserNotifications(testUserId);
      const notificationId = result.notifications[0].id;

      const success = notificationService.markAsRead(testUserId, notificationId);
      expect(success).toBe(true);

      const updatedResult = notificationService.getUserNotifications(testUserId);
      expect(updatedResult.unreadCount).toBe(1);
    });

    it('should mark all notifications as read', () => {
      const markedCount = notificationService.markAllAsRead(testUserId);
      expect(markedCount).toBe(2);

      const result = notificationService.getUserNotifications(testUserId);
      expect(result.unreadCount).toBe(0);
    });

    it('should delete notification', () => {
      const result = notificationService.getUserNotifications(testUserId);
      const notificationId = result.notifications[0].id;

      const success = notificationService.deleteNotification(testUserId, notificationId);
      expect(success).toBe(true);

      const updatedResult = notificationService.getUserNotifications(testUserId);
      expect(updatedResult.total).toBe(1);
    });

    it('should clear all notifications', () => {
      const clearedCount = notificationService.clearAllNotifications(testUserId);
      expect(clearedCount).toBe(2);

      const result = notificationService.getUserNotifications(testUserId);
      expect(result.total).toBe(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should get default preferences', () => {
      const preferences = notificationService.getUserPreferences(testUserId);

      expect(preferences).toBeDefined();
      expect(preferences.mention).toBe(true);
      expect(preferences.reply).toBe(true);
      expect(preferences.vote).toBe(true);
      expect(preferences.post_in_community).toBe(true);
      expect(preferences.moderation).toBe(true);
    });

    it('should update preferences', () => {
      const newPreferences = {
        mention: false,
        vote: false
      };

      const updatedPrefs = notificationService.updateUserPreferences(testUserId, newPreferences);

      expect(updatedPrefs.mention).toBe(false);
      expect(updatedPrefs.vote).toBe(false);
      expect(updatedPrefs.reply).toBe(true); // Should remain unchanged
    });

    it('should respect preferences when creating notifications', async () => {
      // Disable mention notifications
      notificationService.updateUserPreferences(testUserId, { mention: false });

      const notification = await notificationService.createMentionNotification(
        testUserId,
        testUserId2,
        'post-123',
        'post',
        'Hey @user!'
      );

      expect(notification).toBeNull();
    });
  });

  describe('Do Not Disturb', () => {
    it('should enable DND indefinitely', () => {
      const dndSettings = notificationService.enableDoNotDisturb(testUserId);

      expect(dndSettings.enabled).toBe(true);
      expect(dndSettings.duration).toBeNull();
      expect(dndSettings.expiresAt).toBeNull();
      expect(notificationService.isDoNotDisturbActive(testUserId)).toBe(true);
    });

    it('should enable DND with duration', () => {
      const duration = 30; // 30 minutes
      const dndSettings = notificationService.enableDoNotDisturb(testUserId, { duration });

      expect(dndSettings.enabled).toBe(true);
      expect(dndSettings.duration).toBe(duration);
      expect(dndSettings.expiresAt).toBeDefined();
      expect(notificationService.isDoNotDisturbActive(testUserId)).toBe(true);
    });

    it('should disable DND', () => {
      notificationService.enableDoNotDisturb(testUserId);
      expect(notificationService.isDoNotDisturbActive(testUserId)).toBe(true);

      const success = notificationService.disableDoNotDisturb(testUserId);
      expect(success).toBe(true);
      expect(notificationService.isDoNotDisturbActive(testUserId)).toBe(false);
    });

    it('should queue notifications when DND is active', async () => {
      notificationService.enableDoNotDisturb(testUserId);

      const notification = await notificationService.createNotification({
        userId: testUserId,
        type: 'test',
        title: 'Test',
        message: 'This should be queued',
        sourceId: 'test',
        sourceType: 'test'
      });

      expect(notification).toBeUndefined(); // Should be queued, not returned

      const result = notificationService.getUserNotifications(testUserId);
      expect(result.total).toBe(0); // No notifications in main list

      // Check if notification is in queue
      const queueKey = `queue_${testUserId}`;
      const queue = notificationService.notifications.get(queueKey);
      expect(queue).toBeDefined();
      expect(queue.length).toBe(1);
    });

    it('should send queued notifications when DND is disabled', async () => {
      notificationService.enableDoNotDisturb(testUserId);

      // Create notification while DND is active
      await notificationService.createNotification({
        userId: testUserId,
        type: 'test',
        title: 'Queued Test',
        message: 'This was queued',
        sourceId: 'test',
        sourceType: 'test'
      });

      // Disable DND
      notificationService.disableDoNotDisturb(testUserId);

      // Check if queued notification was delivered
      const result = notificationService.getUserNotifications(testUserId);
      expect(result.total).toBe(1);
      expect(result.notifications[0].title).toBe('Queued Test');
    });

    it('should auto-expire DND after duration', () => {
      // Enable DND for 1 millisecond (will expire immediately)
      const duration = 0.001 / 60; // Convert to minutes
      notificationService.enableDoNotDisturb(testUserId, { duration });

      // Wait a bit for expiration
      setTimeout(() => {
        expect(notificationService.isDoNotDisturbActive(testUserId)).toBe(false);
      }, 10);
    });
  });

  describe('Notification Statistics', () => {
    beforeEach(async () => {
      // Create test notifications with different types and times
      await notificationService.createNotification({
        userId: testUserId,
        type: 'mention',
        title: 'Mention',
        message: 'Test mention',
        sourceId: 'test',
        sourceType: 'test'
      });

      await notificationService.createNotification({
        userId: testUserId,
        type: 'reply',
        title: 'Reply',
        message: 'Test reply',
        sourceId: 'test',
        sourceType: 'test'
      });

      // Mark one as read
      const result = notificationService.getUserNotifications(testUserId);
      notificationService.markAsRead(testUserId, result.notifications[0].id);
    });

    it('should get notification statistics', () => {
      const stats = notificationService.getNotificationStats(testUserId);

      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(1);
      expect(stats.byType.mention).toBe(1);
      expect(stats.byType.reply).toBe(1);
      expect(stats.today).toBe(2);
      expect(stats.thisWeek).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old notifications', async () => {
      // Create a notification
      await notificationService.createNotification({
        userId: testUserId,
        type: 'test',
        title: 'Test',
        message: 'Test',
        sourceId: 'test',
        sourceType: 'test'
      });

      // Manually set an old creation date
      const userNotifications = notificationService.notifications.get(testUserId);
      userNotifications[0].createdAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(); // 31 days ago

      const cleanedCount = notificationService.cleanupOldNotifications(30); // 30 days
      expect(cleanedCount).toBe(1);

      const result = notificationService.getUserNotifications(testUserId);
      expect(result.total).toBe(0);
    });
  });
});