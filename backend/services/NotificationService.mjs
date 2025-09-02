/**
 * Notification Service for Real-time Notifications
 * Handles notification creation, delivery, preferences, and history
 */

import { webSocketService } from './WebSocketService.mjs';

class NotificationService {
  constructor() {
    this.notifications = new Map(); // userId -> notifications array
    this.preferences = new Map(); // userId -> preferences object
    this.doNotDisturbSettings = new Map(); // userId -> DND settings
  }

  /**
   * Create and send a notification
   */
  async createNotification(notification) {
    const {
      userId,
      type,
      title,
      message,
      sourceId,
      sourceType,
      sourceUserId,
      data = {}
    } = notification;

    // Check if user has DND enabled
    if (this.isDoNotDisturbActive(userId)) {
      console.log(`[Notification] User ${userId} has DND enabled, queuing notification`);
      return this.queueNotification(notification);
    }

    // Check user preferences
    const userPrefs = this.getUserPreferences(userId);
    if (!this.shouldSendNotification(type, userPrefs)) {
      console.log(`[Notification] User ${userId} has disabled ${type} notifications`);
      return null;
    }

    // Create notification object
    const notificationObj = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      sourceId,
      sourceType,
      sourceUserId,
      data,
      isRead: false,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString()
    };

    // Store notification
    this.storeNotification(userId, notificationObj);

    // Send real-time notification
    webSocketService.sendNotificationToUser(userId, notificationObj);

    console.log(`[Notification] Sent ${type} notification to user ${userId}: ${title}`);
    
    return notificationObj;
  }

  /**
   * Create mention notification
   */
  async createMentionNotification(mentionedUserId, mentionerUserId, sourceId, sourceType, content) {
    return this.createNotification({
      userId: mentionedUserId,
      type: 'mention',
      title: 'You were mentioned',
      message: `You were mentioned in a ${sourceType}`,
      sourceId,
      sourceType,
      sourceUserId: mentionerUserId,
      data: {
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        mentionerName: `User_${mentionerUserId.slice(-8)}`
      }
    });
  }

  /**
   * Create reply notification
   */
  async createReplyNotification(originalAuthorId, replierUserId, sourceId, sourceType, content) {
    return this.createNotification({
      userId: originalAuthorId,
      type: 'reply',
      title: 'New reply to your post',
      message: `Someone replied to your ${sourceType}`,
      sourceId,
      sourceType,
      sourceUserId: replierUserId,
      data: {
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        replierName: `User_${replierUserId.slice(-8)}`
      }
    });
  }

  /**
   * Create vote notification
   */
  async createVoteNotification(authorId, voterId, sourceId, sourceType, voteType, newScore) {
    // Only notify for upvotes to avoid spam
    if (voteType !== 'up') return null;

    return this.createNotification({
      userId: authorId,
      type: 'vote',
      title: 'Your content was upvoted',
      message: `Someone upvoted your ${sourceType}`,
      sourceId,
      sourceType,
      sourceUserId: voterId,
      data: {
        voteType,
        newScore,
        voterName: `User_${voterId.slice(-8)}`
      }
    });
  }

  /**
   * Create post in community notification
   */
  async createPostInCommunityNotification(subcommunityId, authorId, postId, title) {
    // Get community members (mock implementation)
    const members = this.getCommunityMembers(subcommunityId);
    
    const notifications = [];
    for (const memberId of members) {
      // Don't notify the author
      if (memberId === authorId) continue;

      const notification = await this.createNotification({
        userId: memberId,
        type: 'post_in_community',
        title: 'New post in community',
        message: `New post: ${title}`,
        sourceId: postId,
        sourceType: 'post',
        sourceUserId: authorId,
        data: {
          subcommunityId,
          postTitle: title,
          authorName: `User_${authorId.slice(-8)}`
        }
      });

      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Create moderation notification
   */
  async createModerationNotification(userId, moderatorId, action, sourceId, sourceType, reason) {
    return this.createNotification({
      userId,
      type: 'moderation',
      title: 'Moderation action on your content',
      message: `Your ${sourceType} was ${action}`,
      sourceId,
      sourceType,
      sourceUserId: moderatorId,
      data: {
        action,
        reason,
        moderatorName: `Moderator_${moderatorId.slice(-8)}`
      }
    });
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId, options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;
    
    const userNotifications = this.notifications.get(userId) || [];
    
    let filtered = userNotifications;
    if (unreadOnly) {
      filtered = userNotifications.filter(n => !n.isRead);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    return {
      notifications: paginated,
      total: filtered.length,
      unreadCount: userNotifications.filter(n => !n.isRead).length
    };
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId, notificationId) {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
      
      console.log(`[Notification] Marked notification ${notificationId} as read for user ${userId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId) {
    const userNotifications = this.notifications.get(userId) || [];
    let markedCount = 0;
    
    userNotifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        markedCount++;
      }
    });

    console.log(`[Notification] Marked ${markedCount} notifications as read for user ${userId}`);
    return markedCount;
  }

  /**
   * Delete notification
   */
  deleteNotification(userId, notificationId) {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
      userNotifications.splice(index, 1);
      console.log(`[Notification] Deleted notification ${notificationId} for user ${userId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(userId) {
    const userNotifications = this.notifications.get(userId) || [];
    const count = userNotifications.length;
    
    this.notifications.set(userId, []);
    
    console.log(`[Notification] Cleared ${count} notifications for user ${userId}`);
    return count;
  }

  // ============================================================================
  // PREFERENCES MANAGEMENT
  // ============================================================================

  /**
   * Get user notification preferences
   */
  getUserPreferences(userId) {
    return this.preferences.get(userId) || {
      mention: true,
      reply: true,
      vote: true,
      post_in_community: true,
      moderation: true,
      email: false,
      push: true,
      sound: true,
      desktop: true
    };
  }

  /**
   * Update user notification preferences
   */
  updateUserPreferences(userId, newPreferences) {
    const currentPrefs = this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...newPreferences };
    
    this.preferences.set(userId, updatedPrefs);
    
    console.log(`[Notification] Updated preferences for user ${userId}`);
    return updatedPrefs;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  shouldSendNotification(type, preferences) {
    return preferences[type] !== false;
  }

  // ============================================================================
  // DO NOT DISTURB MANAGEMENT
  // ============================================================================

  /**
   * Enable Do Not Disturb
   */
  enableDoNotDisturb(userId, options = {}) {
    const {
      duration = null, // null = indefinite, number = minutes
      allowUrgent = true,
      allowMentions = false
    } = options;

    const dndSettings = {
      enabled: true,
      enabledAt: new Date().toISOString(),
      duration,
      expiresAt: duration ? new Date(Date.now() + duration * 60000).toISOString() : null,
      allowUrgent,
      allowMentions
    };

    this.doNotDisturbSettings.set(userId, dndSettings);
    
    console.log(`[Notification] Enabled DND for user ${userId}${duration ? ` for ${duration} minutes` : ' indefinitely'}`);
    return dndSettings;
  }

  /**
   * Disable Do Not Disturb
   */
  disableDoNotDisturb(userId) {
    const dndSettings = this.doNotDisturbSettings.get(userId);
    
    if (dndSettings) {
      this.doNotDisturbSettings.delete(userId);
      console.log(`[Notification] Disabled DND for user ${userId}`);
      
      // Send queued notifications
      this.sendQueuedNotifications(userId);
      
      return true;
    }
    
    return false;
  }

  /**
   * Check if Do Not Disturb is active
   */
  isDoNotDisturbActive(userId) {
    const dndSettings = this.doNotDisturbSettings.get(userId);
    
    if (!dndSettings || !dndSettings.enabled) {
      return false;
    }

    // Check if DND has expired
    if (dndSettings.expiresAt && new Date() > new Date(dndSettings.expiresAt)) {
      this.disableDoNotDisturb(userId);
      return false;
    }

    return true;
  }

  /**
   * Get Do Not Disturb settings
   */
  getDoNotDisturbSettings(userId) {
    return this.doNotDisturbSettings.get(userId) || { enabled: false };
  }

  // ============================================================================
  // NOTIFICATION QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Queue notification for later delivery
   */
  queueNotification(notification) {
    const userId = notification.userId;
    const queueKey = `queue_${userId}`;
    
    if (!this.notifications.has(queueKey)) {
      this.notifications.set(queueKey, []);
    }
    
    const queue = this.notifications.get(queueKey);
    queue.push({
      ...notification,
      queued: true,
      queuedAt: new Date().toISOString()
    });

    console.log(`[Notification] Queued notification for user ${userId} (DND active)`);
  }

  /**
   * Send queued notifications
   */
  sendQueuedNotifications(userId) {
    const queueKey = `queue_${userId}`;
    const queue = this.notifications.get(queueKey) || [];
    
    if (queue.length === 0) return;

    console.log(`[Notification] Sending ${queue.length} queued notifications to user ${userId}`);
    
    queue.forEach(notification => {
      // Remove queue-specific properties
      delete notification.queued;
      delete notification.queuedAt;
      
      // Create the notification normally
      this.createNotification(notification);
    });

    // Clear the queue
    this.notifications.delete(queueKey);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Store notification in memory (in production, this would be a database)
   */
  storeNotification(userId, notification) {
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    
    const userNotifications = this.notifications.get(userId);
    userNotifications.unshift(notification); // Add to beginning
    
    // Keep only the last 1000 notifications per user
    if (userNotifications.length > 1000) {
      userNotifications.splice(1000);
    }
  }

  /**
   * Get community members (mock implementation)
   */
  getCommunityMembers(subcommunityId) {
    // In production, this would query the database
    return [
      'did:squid:member1',
      'did:squid:member2',
      'did:squid:member3'
    ];
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId) {
    const userNotifications = this.notifications.get(userId) || [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.isRead).length,
      today: userNotifications.filter(n => new Date(n.createdAt) > oneDayAgo).length,
      thisWeek: userNotifications.filter(n => new Date(n.createdAt) > oneWeekAgo).length,
      byType: {}
    };

    // Count by type
    userNotifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean up old notifications
   */
  cleanupOldNotifications(maxAge = 30) {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    let totalCleaned = 0;

    this.notifications.forEach((userNotifications, userId) => {
      const initialCount = userNotifications.length;
      const filtered = userNotifications.filter(n => new Date(n.createdAt) > cutoffDate);
      
      if (filtered.length < initialCount) {
        this.notifications.set(userId, filtered);
        const cleaned = initialCount - filtered.length;
        totalCleaned += cleaned;
        console.log(`[Notification] Cleaned ${cleaned} old notifications for user ${userId}`);
      }
    });

    console.log(`[Notification] Total cleaned notifications: ${totalCleaned}`);
    return totalCleaned;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;