import { QsocialNotification } from '../../types/qsocial';
import { getActiveIdentity } from '../../state/identity';

/**
 * Notification types
 */
export type NotificationType = 'vote' | 'comment' | 'mention' | 'moderation' | 'achievement';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification delivery methods
 */
export type DeliveryMethod = 'in-app' | 'push' | 'email' | 'websocket';

/**
 * Notification preferences for a user
 */
interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  types: {
    [K in NotificationType]: {
      enabled: boolean;
      deliveryMethods: DeliveryMethod[];
      priority: NotificationPriority;
    };
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
  frequency: 'immediate' | 'batched' | 'daily';
  lastUpdated: Date;
}

/**
 * Notification creation request
 */
interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: NotificationPriority;
  deliveryMethods?: DeliveryMethod[];
  expiresAt?: Date;
}

/**
 * Notification delivery result
 */
interface DeliveryResult {
  method: DeliveryMethod;
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * Notification with delivery status
 */
interface NotificationWithDelivery extends QsocialNotification {
  priority: NotificationPriority;
  deliveryResults: DeliveryResult[];
  expiresAt?: Date;
}

/**
 * Real-time notification event
 */
interface NotificationEvent {
  type: 'created' | 'read' | 'deleted';
  notification: QsocialNotification;
  timestamp: Date;
}

/**
 * Notification statistics
 */
interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  deliverySuccess: number;
  deliveryFailure: number;
}

/**
 * Notification Service for user notifications with real-time delivery
 */
export class NotificationService {
  private static notifications: Map<string, NotificationWithDelivery> = new Map();
  private static userPreferences: Map<string, NotificationPreferences> = new Map();
  private static eventListeners: ((event: NotificationEvent) => void)[] = [];
  private static websocketConnections: Map<string, WebSocket> = new Map();

  /**
   * Create a new notification
   */
  static async createNotification(request: CreateNotificationRequest): Promise<QsocialNotification> {
    try {
      // Validate request
      if (!request.userId || !request.type || !request.title || !request.message) {
        throw new Error('Missing required notification fields');
      }

      // Check user preferences
      const preferences = await this.getUserPreferences(request.userId);
      if (!preferences.enabled || !preferences.types[request.type].enabled) {
        console.log(`[NotificationService] Notifications disabled for user ${request.userId} or type ${request.type}`);
        return this.createMockNotification(request);
      }

      // Check do not disturb
      if (this.isDoNotDisturbActive(preferences)) {
        console.log(`[NotificationService] Do not disturb active for user ${request.userId}`);
        return this.createMockNotification(request);
      }

      // Create notification
      const notification: NotificationWithDelivery = {
        id: this.generateId(),
        userId: request.userId,
        type: request.type,
        title: request.title,
        message: request.message,
        data: request.data || {},
        isRead: false,
        createdAt: new Date(),
        priority: request.priority || preferences.types[request.type].priority,
        deliveryResults: [],
        expiresAt: request.expiresAt,
      };

      // Store notification
      this.notifications.set(notification.id, notification);

      // Determine delivery methods
      const deliveryMethods = request.deliveryMethods || preferences.types[request.type].deliveryMethods;

      // Deliver notification
      await this.deliverNotification(notification, deliveryMethods);

      // Emit real-time event
      this.emitNotificationEvent({
        type: 'created',
        notification: this.stripDeliveryInfo(notification),
        timestamp: new Date()
      });

      console.log(`[NotificationService] Created notification ${notification.id} for user ${request.userId}`);

      return this.stripDeliveryInfo(notification);

    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
      since?: Date;
    } = {}
  ): Promise<QsocialNotification[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all notifications for user
      let userNotifications = Array.from(this.notifications.values())
        .filter(n => n.userId === userId)
        .filter(n => !n.expiresAt || n.expiresAt > new Date());

      // Apply filters
      if (options.unreadOnly) {
        userNotifications = userNotifications.filter(n => !n.isRead);
      }

      if (options.types && options.types.length > 0) {
        userNotifications = userNotifications.filter(n => options.types!.includes(n.type));
      }

      if (options.since) {
        userNotifications = userNotifications.filter(n => n.createdAt >= options.since!);
      }

      // Sort by creation date (newest first)
      userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      userNotifications = userNotifications.slice(offset, offset + limit);

      return userNotifications.map(n => this.stripDeliveryInfo(n));

    } catch (error) {
      console.error('[NotificationService] Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Verify user can mark this notification as read
      const identity = getActiveIdentity();
      if (!identity || notification.userId !== identity.did) {
        throw new Error('Unauthorized to mark notification as read');
      }

      notification.isRead = true;

      // Emit real-time event
      this.emitNotificationEvent({
        type: 'read',
        notification: this.stripDeliveryInfo(notification),
        timestamp: new Date()
      });

      console.log(`[NotificationService] Marked notification ${notificationId} as read`);

    } catch (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Verify user authorization
      const identity = getActiveIdentity();
      if (!identity || userId !== identity.did) {
        throw new Error('Unauthorized to mark notifications as read');
      }

      let markedCount = 0;
      Array.from(this.notifications.values())
        .filter(n => n.userId === userId && !n.isRead)
        .forEach(notification => {
          notification.isRead = true;
          markedCount++;

          // Emit real-time event for each notification
          this.emitNotificationEvent({
            type: 'read',
            notification: this.stripDeliveryInfo(notification),
            timestamp: new Date()
          });
        });

      console.log(`[NotificationService] Marked ${markedCount} notifications as read for user ${userId}`);

    } catch (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notification = this.notifications.get(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Verify user can delete this notification
      const identity = getActiveIdentity();
      if (!identity || notification.userId !== identity.did) {
        throw new Error('Unauthorized to delete notification');
      }

      this.notifications.delete(notificationId);

      // Emit real-time event
      this.emitNotificationEvent({
        type: 'deleted',
        notification: this.stripDeliveryInfo(notification),
        timestamp: new Date()
      });

      console.log(`[NotificationService] Deleted notification ${notificationId}`);

    } catch (error) {
      console.error('[NotificationService] Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId)!;
      }

      // Create default preferences
      const defaultPreferences: NotificationPreferences = {
        userId,
        enabled: true,
        types: {
          vote: {
            enabled: true,
            deliveryMethods: ['in-app', 'websocket'],
            priority: 'normal'
          },
          comment: {
            enabled: true,
            deliveryMethods: ['in-app', 'websocket', 'push'],
            priority: 'normal'
          },
          mention: {
            enabled: true,
            deliveryMethods: ['in-app', 'websocket', 'push'],
            priority: 'high'
          },
          moderation: {
            enabled: true,
            deliveryMethods: ['in-app', 'websocket', 'email'],
            priority: 'high'
          },
          achievement: {
            enabled: true,
            deliveryMethods: ['in-app', 'websocket'],
            priority: 'low'
          }
        },
        doNotDisturb: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        },
        frequency: 'immediate',
        lastUpdated: new Date()
      };

      this.userPreferences.set(userId, defaultPreferences);
      return defaultPreferences;

    } catch (error) {
      console.error('[NotificationService] Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string, 
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Verify user authorization
      const identity = getActiveIdentity();
      if (!identity || userId !== identity.did) {
        throw new Error('Unauthorized to update notification preferences');
      }

      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...updates,
        userId, // Ensure userId cannot be changed
        lastUpdated: new Date()
      };

      this.userPreferences.set(userId, updatedPreferences);

      console.log(`[NotificationService] Updated preferences for user ${userId}`);

      return updatedPreferences;

    } catch (error) {
      console.error('[NotificationService] Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const userNotifications = Array.from(this.notifications.values())
        .filter(n => n.userId === userId)
        .filter(n => !n.expiresAt || n.expiresAt > new Date());

      const stats: NotificationStats = {
        total: userNotifications.length,
        unread: userNotifications.filter(n => !n.isRead).length,
        byType: {
          vote: 0,
          comment: 0,
          mention: 0,
          moderation: 0,
          achievement: 0
        },
        byPriority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0
        },
        deliverySuccess: 0,
        deliveryFailure: 0
      };

      userNotifications.forEach(notification => {
        stats.byType[notification.type]++;
        stats.byPriority[notification.priority]++;

        notification.deliveryResults.forEach(result => {
          if (result.success) {
            stats.deliverySuccess++;
          } else {
            stats.deliveryFailure++;
          }
        });
      });

      return stats;

    } catch (error) {
      console.error('[NotificationService] Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notification events
   */
  static onNotificationEvent(listener: (event: NotificationEvent) => void): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Connect to WebSocket for real-time notifications
   */
  static async connectWebSocket(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Close existing connection if any
      const existingConnection = this.websocketConnections.get(userId);
      if (existingConnection) {
        existingConnection.close();
      }

      // Create new WebSocket connection
      const wsUrl = `ws://localhost:3001/notifications/${userId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[NotificationService] WebSocket connected for user ${userId}`);
      };

      ws.onmessage = (event) => {
        try {
          const notification: QsocialNotification = JSON.parse(event.data);
          this.emitNotificationEvent({
            type: 'created',
            notification,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('[NotificationService] Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`[NotificationService] WebSocket disconnected for user ${userId}`);
        this.websocketConnections.delete(userId);
      };

      ws.onerror = (error) => {
        console.error(`[NotificationService] WebSocket error for user ${userId}:`, error);
      };

      this.websocketConnections.set(userId, ws);

    } catch (error) {
      console.error('[NotificationService] Error connecting WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket for a user
   */
  static disconnectWebSocket(userId: string): void {
    const connection = this.websocketConnections.get(userId);
    if (connection) {
      connection.close();
      this.websocketConnections.delete(userId);
      console.log(`[NotificationService] WebSocket disconnected for user ${userId}`);
    }
  }

  /**
   * Clean up expired notifications
   */
  static cleanupExpiredNotifications(): number {
    const now = new Date();
    let cleanedCount = 0;

    Array.from(this.notifications.entries()).forEach(([id, notification]) => {
      if (notification.expiresAt && notification.expiresAt <= now) {
        this.notifications.delete(id);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[NotificationService] Cleaned up ${cleanedCount} expired notifications`);
    }

    return cleanedCount;
  }

  /**
   * Helper: Check if do not disturb is active
   */
  private static isDoNotDisturbActive(preferences: NotificationPreferences): boolean {
    if (!preferences.doNotDisturb.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const startTime = preferences.doNotDisturb.startTime;
    const endTime = preferences.doNotDisturb.endTime;

    // Handle overnight do not disturb (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Helper: Deliver notification via specified methods
   */
  private static async deliverNotification(
    notification: NotificationWithDelivery,
    deliveryMethods: DeliveryMethod[]
  ): Promise<void> {
    for (const method of deliveryMethods) {
      try {
        let success = false;
        let error: string | undefined;

        switch (method) {
          case 'in-app':
            success = true; // In-app notifications are always successful (stored locally)
            break;

          case 'websocket':
            success = await this.deliverViaWebSocket(notification);
            break;

          case 'push':
            success = await this.deliverViaPush(notification);
            break;

          case 'email':
            success = await this.deliverViaEmail(notification);
            break;

          default:
            error = `Unknown delivery method: ${method}`;
        }

        notification.deliveryResults.push({
          method,
          success,
          error,
          timestamp: new Date()
        });

      } catch (deliveryError) {
        notification.deliveryResults.push({
          method,
          success: false,
          error: deliveryError instanceof Error ? deliveryError.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Helper: Deliver notification via WebSocket
   */
  private static async deliverViaWebSocket(notification: NotificationWithDelivery): Promise<boolean> {
    const connection = this.websocketConnections.get(notification.userId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.send(JSON.stringify(this.stripDeliveryInfo(notification)));
      return true;
    } catch (error) {
      console.error('[NotificationService] WebSocket delivery error:', error);
      return false;
    }
  }

  /**
   * Helper: Deliver notification via push notification
   */
  private static async deliverViaPush(notification: NotificationWithDelivery): Promise<boolean> {
    // Mock push notification delivery
    // In a real implementation, this would integrate with a push notification service
    console.log(`[NotificationService] Push notification sent to ${notification.userId}: ${notification.title}`);
    return true;
  }

  /**
   * Helper: Deliver notification via email
   */
  private static async deliverViaEmail(notification: NotificationWithDelivery): Promise<boolean> {
    // Mock email delivery
    // In a real implementation, this would integrate with an email service
    console.log(`[NotificationService] Email notification sent to ${notification.userId}: ${notification.title}`);
    return true;
  }

  /**
   * Helper: Generate unique notification ID
   */
  private static generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Strip delivery information from notification
   */
  private static stripDeliveryInfo(notification: NotificationWithDelivery): QsocialNotification {
    const { priority, deliveryResults, expiresAt, ...cleanNotification } = notification;
    return cleanNotification;
  }

  /**
   * Helper: Create mock notification for disabled users
   */
  private static createMockNotification(request: CreateNotificationRequest): QsocialNotification {
    return {
      id: this.generateId(),
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      data: request.data || {},
      isRead: false,
      createdAt: new Date()
    };
  }

  /**
   * Helper: Emit notification event to listeners
   */
  private static emitNotificationEvent(event: NotificationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[NotificationService] Error in notification event listener:', error);
      }
    });
  }

  /**
   * Clear all notifications (for testing)
   */
  static clearAllNotifications(): void {
    this.notifications.clear();
    this.userPreferences.clear();
    console.log('[NotificationService] Cleared all notifications and preferences');
  }

  /**
   * Get all notifications (for debugging/admin)
   */
  static getAllNotifications(): NotificationWithDelivery[] {
    return Array.from(this.notifications.values());
  }
}