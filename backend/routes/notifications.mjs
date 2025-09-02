/**
 * Notification API Routes
 * Handles notification management, preferences, and do-not-disturb settings
 */

import express from 'express';
import { verifySquidIdentity, rateLimitByIdentity } from '../middleware/squidAuth.mjs';
import { notificationService } from '../services/NotificationService.mjs';

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimitByIdentity(200, 60000)); // 200 requests per minute

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Notifications',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/**
 * Get user notifications
 * Requires authentication
 */
router.get('/', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    const result = notificationService.getUserNotifications(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true'
    });

    console.log(`[Notifications] Retrieved ${result.notifications.length} notifications for user ${userId}`);
    
    res.json(result);

  } catch (error) {
    console.error('[Notifications] Error getting notifications:', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      message: error.message
    });
  }
});

/**
 * Mark notification as read
 * Requires authentication
 */
router.put('/:notificationId/read', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { notificationId } = req.params;

    const success = notificationService.markAsRead(userId, notificationId);

    if (success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or already read'
      });
    }

  } catch (error) {
    console.error('[Notifications] Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

/**
 * Mark all notifications as read
 * Requires authentication
 */
router.put('/read-all', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const markedCount = notificationService.markAllAsRead(userId);

    res.json({ 
      success: true, 
      message: `Marked ${markedCount} notifications as read`,
      markedCount 
    });

  } catch (error) {
    console.error('[Notifications] Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

/**
 * Delete notification
 * Requires authentication
 */
router.delete('/:notificationId', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { notificationId } = req.params;

    const success = notificationService.deleteNotification(userId, notificationId);

    if (success) {
      res.json({ success: true, message: 'Notification deleted' });
    } else {
      res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found'
      });
    }

  } catch (error) {
    console.error('[Notifications] Error deleting notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

/**
 * Clear all notifications
 * Requires authentication
 */
router.delete('/', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const clearedCount = notificationService.clearAllNotifications(userId);

    res.json({ 
      success: true, 
      message: `Cleared ${clearedCount} notifications`,
      clearedCount 
    });

  } catch (error) {
    console.error('[Notifications] Error clearing notifications:', error);
    res.status(500).json({
      error: 'Failed to clear notifications',
      message: error.message
    });
  }
});

/**
 * Get notification statistics
 * Requires authentication
 */
router.get('/stats', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const stats = notificationService.getNotificationStats(userId);

    console.log(`[Notifications] Retrieved stats for user ${userId}: ${stats.total} total, ${stats.unread} unread`);
    
    res.json(stats);

  } catch (error) {
    console.error('[Notifications] Error getting notification stats:', error);
    res.status(500).json({
      error: 'Failed to get notification statistics',
      message: error.message
    });
  }
});

// ============================================================================
// PREFERENCES ROUTES
// ============================================================================

/**
 * Get user notification preferences
 * Requires authentication
 */
router.get('/preferences', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const preferences = notificationService.getUserPreferences(userId);

    console.log(`[Notifications] Retrieved preferences for user ${userId}`);
    
    res.json(preferences);

  } catch (error) {
    console.error('[Notifications] Error getting preferences:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences',
      message: error.message
    });
  }
});

/**
 * Update user notification preferences
 * Requires authentication
 */
router.put('/preferences', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const newPreferences = req.body;

    // Validate preferences
    const validKeys = ['mention', 'reply', 'vote', 'post_in_community', 'moderation', 'email', 'push', 'sound', 'desktop'];
    const invalidKeys = Object.keys(newPreferences).filter(key => !validKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        error: 'Invalid preference keys',
        message: `Invalid keys: ${invalidKeys.join(', ')}`
      });
    }

    const updatedPreferences = notificationService.updateUserPreferences(userId, newPreferences);

    console.log(`[Notifications] Updated preferences for user ${userId}`);
    
    res.json(updatedPreferences);

  } catch (error) {
    console.error('[Notifications] Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences',
      message: error.message
    });
  }
});

// ============================================================================
// DO NOT DISTURB ROUTES
// ============================================================================

/**
 * Get Do Not Disturb settings
 * Requires authentication
 */
router.get('/dnd', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const dndSettings = notificationService.getDoNotDisturbSettings(userId);

    console.log(`[Notifications] Retrieved DND settings for user ${userId}: ${dndSettings.enabled ? 'enabled' : 'disabled'}`);
    
    res.json(dndSettings);

  } catch (error) {
    console.error('[Notifications] Error getting DND settings:', error);
    res.status(500).json({
      error: 'Failed to get Do Not Disturb settings',
      message: error.message
    });
  }
});

/**
 * Enable Do Not Disturb
 * Requires authentication
 */
router.post('/dnd/enable', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { duration, allowUrgent = true, allowMentions = false } = req.body;

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || duration < 1)) {
      return res.status(400).json({
        error: 'Invalid duration',
        message: 'Duration must be a positive number (minutes)'
      });
    }

    const dndSettings = notificationService.enableDoNotDisturb(userId, {
      duration,
      allowUrgent,
      allowMentions
    });

    console.log(`[Notifications] Enabled DND for user ${userId}`);
    
    res.json(dndSettings);

  } catch (error) {
    console.error('[Notifications] Error enabling DND:', error);
    res.status(500).json({
      error: 'Failed to enable Do Not Disturb',
      message: error.message
    });
  }
});

/**
 * Disable Do Not Disturb
 * Requires authentication
 */
router.post('/dnd/disable', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;

    const success = notificationService.disableDoNotDisturb(userId);

    if (success) {
      console.log(`[Notifications] Disabled DND for user ${userId}`);
      res.json({ success: true, message: 'Do Not Disturb disabled' });
    } else {
      res.status(400).json({
        error: 'Do Not Disturb not active',
        message: 'Do Not Disturb is not currently enabled'
      });
    }

  } catch (error) {
    console.error('[Notifications] Error disabling DND:', error);
    res.status(500).json({
      error: 'Failed to disable Do Not Disturb',
      message: error.message
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * Send test notification (for testing purposes)
 * Requires authentication
 */
router.post('/test', verifySquidIdentity, async (req, res) => {
  try {
    const userId = req.squidIdentity.did;
    const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    const notification = await notificationService.createNotification({
      userId,
      type,
      title,
      message,
      sourceId: 'test',
      sourceType: 'test',
      sourceUserId: userId,
      data: { test: true }
    });

    console.log(`[Notifications] Sent test notification to user ${userId}`);
    
    res.json(notification);

  } catch (error) {
    console.error('[Notifications] Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

/**
 * Cleanup old notifications (admin only)
 * Requires authentication
 */
router.post('/cleanup', verifySquidIdentity, async (req, res) => {
  try {
    const { maxAge = 30 } = req.body;

    // Validate maxAge
    if (typeof maxAge !== 'number' || maxAge < 1) {
      return res.status(400).json({
        error: 'Invalid maxAge',
        message: 'maxAge must be a positive number (days)'
      });
    }

    const cleanedCount = notificationService.cleanupOldNotifications(maxAge);

    console.log(`[Notifications] Cleaned up ${cleanedCount} old notifications`);
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${cleanedCount} old notifications`,
      cleanedCount 
    });

  } catch (error) {
    console.error('[Notifications] Error cleaning up notifications:', error);
    res.status(500).json({
      error: 'Failed to cleanup notifications',
      message: error.message
    });
  }
});

export default router;