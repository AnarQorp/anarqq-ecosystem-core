/**
 * Privacy-Preserving Analytics Service for Qsocial
 * Collects anonymized metrics while respecting user privacy
 */

import { getActiveIdentity } from '../../state/identity';
import { PrivacyService } from './PrivacyService';
import type { 
  QsocialPost, 
  QsocialComment, 
  Subcommunity,
  PrivacyLevel 
} from '../../types/qsocial';
import type { PrivacyLevel as QonsentPrivacyLevel } from '../../types';

/**
 * Anonymized user identifier
 */
type AnonymizedUserId = string;

/**
 * Analytics event types
 */
export type AnalyticsEventType = 
  | 'post_created'
  | 'post_viewed'
  | 'post_voted'
  | 'comment_created'
  | 'comment_viewed'
  | 'comment_voted'
  | 'subcommunity_joined'
  | 'subcommunity_left'
  | 'search_performed'
  | 'content_shared'
  | 'privacy_level_changed';

/**
 * Privacy-safe analytics event
 */
export interface PrivacyAnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  anonymizedUserId: AnonymizedUserId;
  
  // Aggregated/anonymized data only
  metadata: {
    privacyLevel: PrivacyLevel;
    contentType?: 'text' | 'link' | 'media' | 'cross-post';
    subcommunityCategory?: string; // Generic category, not specific ID
    userPrivacyTier?: 'low' | 'medium' | 'high';
    sessionDuration?: number;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    
    // Aggregated metrics (no personal data)
    engagementScore?: number;
    contentLength?: 'short' | 'medium' | 'long';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: string;
  };
}

/**
 * Aggregated analytics metrics
 */
export interface AnalyticsMetrics {
  totalEvents: number;
  eventsByType: Record<AnalyticsEventType, number>;
  privacyLevelDistribution: Record<PrivacyLevel, number>;
  userPrivacyTierDistribution: Record<string, number>;
  engagementMetrics: {
    averageEngagement: number;
    highEngagementContent: number;
    lowEngagementContent: number;
  };
  contentMetrics: {
    totalPosts: number;
    totalComments: number;
    averageContentLength: number;
    contentTypeDistribution: Record<string, number>;
  };
  privacyMetrics: {
    encryptedContentPercentage: number;
    privacyLevelChanges: number;
    averagePrivacyLevel: number;
  };
  temporalMetrics: {
    peakUsageHours: string[];
    activeUsersByDay: Record<string, number>;
    contentCreationTrends: Record<string, number>;
  };
}

/**
 * Privacy-preserving analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  anonymizationLevel: 'basic' | 'enhanced' | 'maximum';
  collectDeviceInfo: boolean;
  collectTimingInfo: boolean;
  collectEngagementMetrics: boolean;
  respectDoNotTrack: boolean;
}

/**
 * Privacy-Preserving Analytics Service
 */
export class PrivacyAnalyticsService {
  private static readonly DEFAULT_CONFIG: AnalyticsConfig = {
    enabled: true,
    retentionDays: 90,
    anonymizationLevel: 'enhanced',
    collectDeviceInfo: false,
    collectTimingInfo: true,
    collectEngagementMetrics: true,
    respectDoNotTrack: true
  };

  private static events: PrivacyAnalyticsEvent[] = [];
  private static config: AnalyticsConfig = this.DEFAULT_CONFIG;

  /**
   * Initialize analytics service with configuration
   */
  static initialize(config: Partial<AnalyticsConfig> = {}): void {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    
    // Respect Do Not Track header
    if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
      this.config.enabled = false;
    }

    // Load existing events from storage
    this.loadEventsFromStorage();
    
    // Set up periodic cleanup
    this.setupPeriodicCleanup();
  }

  /**
   * Generate anonymized user ID
   */
  private static async generateAnonymizedUserId(userId: string): Promise<AnonymizedUserId> {
    // Use a one-way hash to anonymize user ID
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + 'qsocial_analytics_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Determine user privacy tier from settings
   */
  private static async getUserPrivacyTier(userId: string): Promise<'low' | 'medium' | 'high'> {
    const settings = await PrivacyService.getUserPrivacySettings(userId);
    
    if (!settings) {
      return 'medium'; // Default
    }

    switch (settings.level) {
      case QonsentPrivacyLevel.LOW:
        return 'low';
      case QonsentPrivacyLevel.MEDIUM:
        return 'medium';
      case QonsentPrivacyLevel.HIGH:
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Get time of day category
   */
  private static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get content length category
   */
  private static getContentLengthCategory(content: string): 'short' | 'medium' | 'long' {
    const length = content.length;
    
    if (length < 100) return 'short';
    if (length < 500) return 'medium';
    return 'long';
  }

  /**
   * Get device type
   */
  private static getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  /**
   * Track post creation event
   */
  static async trackPostCreated(post: QsocialPost): Promise<void> {
    if (!this.config.enabled) return;

    const identity = getActiveIdentity();
    if (!identity) return;

    try {
      const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
      const userPrivacyTier = await this.getUserPrivacyTier(identity.did);

      const event: PrivacyAnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'post_created',
        timestamp: new Date(),
        anonymizedUserId,
        metadata: {
          privacyLevel: post.privacyLevel,
          contentType: post.contentType,
          subcommunityCategory: post.subcommunityId ? 'community' : 'general',
          userPrivacyTier,
          contentLength: this.getContentLengthCategory(post.content),
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          deviceType: this.config.collectDeviceInfo ? this.getDeviceType() : undefined
        }
      };

      await this.recordEvent(event);
    } catch (error) {
      console.error('Failed to track post creation:', error);
    }
  }

  /**
   * Track comment creation event
   */
  static async trackCommentCreated(comment: QsocialComment): Promise<void> {
    if (!this.config.enabled) return;

    const identity = getActiveIdentity();
    if (!identity) return;

    try {
      const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
      const userPrivacyTier = await this.getUserPrivacyTier(identity.did);

      const event: PrivacyAnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'comment_created',
        timestamp: new Date(),
        anonymizedUserId,
        metadata: {
          privacyLevel: comment.privacyLevel,
          contentType: 'text',
          userPrivacyTier,
          contentLength: this.getContentLengthCategory(comment.content),
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          deviceType: this.config.collectDeviceInfo ? this.getDeviceType() : undefined
        }
      };

      await this.recordEvent(event);
    } catch (error) {
      console.error('Failed to track comment creation:', error);
    }
  }

  /**
   * Track content view event
   */
  static async trackContentViewed(
    contentType: 'post' | 'comment',
    privacyLevel: PrivacyLevel,
    viewDuration?: number
  ): Promise<void> {
    if (!this.config.enabled) return;

    const identity = getActiveIdentity();
    if (!identity) return;

    try {
      const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
      const userPrivacyTier = await this.getUserPrivacyTier(identity.did);

      const eventType: AnalyticsEventType = contentType === 'post' ? 'post_viewed' : 'comment_viewed';

      const event: PrivacyAnalyticsEvent = {
        id: crypto.randomUUID(),
        type: eventType,
        timestamp: new Date(),
        anonymizedUserId,
        metadata: {
          privacyLevel,
          userPrivacyTier,
          sessionDuration: viewDuration,
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          deviceType: this.config.collectDeviceInfo ? this.getDeviceType() : undefined
        }
      };

      await this.recordEvent(event);
    } catch (error) {
      console.error('Failed to track content view:', error);
    }
  }

  /**
   * Track voting event
   */
  static async trackVote(
    contentType: 'post' | 'comment',
    voteType: 'up' | 'down',
    privacyLevel: PrivacyLevel
  ): Promise<void> {
    if (!this.config.enabled) return;

    const identity = getActiveIdentity();
    if (!identity) return;

    try {
      const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
      const userPrivacyTier = await this.getUserPrivacyTier(identity.did);

      const eventType: AnalyticsEventType = contentType === 'post' ? 'post_voted' : 'comment_voted';

      const event: PrivacyAnalyticsEvent = {
        id: crypto.randomUUID(),
        type: eventType,
        timestamp: new Date(),
        anonymizedUserId,
        metadata: {
          privacyLevel,
          userPrivacyTier,
          engagementScore: voteType === 'up' ? 1 : -1,
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          deviceType: this.config.collectDeviceInfo ? this.getDeviceType() : undefined
        }
      };

      await this.recordEvent(event);
    } catch (error) {
      console.error('Failed to track vote:', error);
    }
  }

  /**
   * Track privacy level change
   */
  static async trackPrivacyLevelChange(
    oldLevel: PrivacyLevel,
    newLevel: PrivacyLevel,
    contentType: 'post' | 'comment'
  ): Promise<void> {
    if (!this.config.enabled) return;

    const identity = getActiveIdentity();
    if (!identity) return;

    try {
      const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
      const userPrivacyTier = await this.getUserPrivacyTier(identity.did);

      const event: PrivacyAnalyticsEvent = {
        id: crypto.randomUUID(),
        type: 'privacy_level_changed',
        timestamp: new Date(),
        anonymizedUserId,
        metadata: {
          privacyLevel: newLevel,
          contentType: contentType === 'post' ? 'text' : undefined,
          userPrivacyTier,
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' })
        }
      };

      await this.recordEvent(event);
    } catch (error) {
      console.error('Failed to track privacy level change:', error);
    }
  }

  /**
   * Record analytics event
   */
  private static async recordEvent(event: PrivacyAnalyticsEvent): Promise<void> {
    // Add to in-memory storage
    this.events.push(event);

    // Persist to storage
    await this.saveEventsToStorage();

    // Clean up old events if needed
    if (this.events.length > 10000) {
      await this.cleanupOldEvents();
    }
  }

  /**
   * Get aggregated analytics metrics
   */
  static async getMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsMetrics> {
    const filteredEvents = this.events.filter(event => {
      if (startDate && event.timestamp < startDate) return false;
      if (endDate && event.timestamp > endDate) return false;
      return true;
    });

    const metrics: AnalyticsMetrics = {
      totalEvents: filteredEvents.length,
      eventsByType: {} as Record<AnalyticsEventType, number>,
      privacyLevelDistribution: {} as Record<PrivacyLevel, number>,
      userPrivacyTierDistribution: {},
      engagementMetrics: {
        averageEngagement: 0,
        highEngagementContent: 0,
        lowEngagementContent: 0
      },
      contentMetrics: {
        totalPosts: 0,
        totalComments: 0,
        averageContentLength: 0,
        contentTypeDistribution: {}
      },
      privacyMetrics: {
        encryptedContentPercentage: 0,
        privacyLevelChanges: 0,
        averagePrivacyLevel: 0
      },
      temporalMetrics: {
        peakUsageHours: [],
        activeUsersByDay: {},
        contentCreationTrends: {}
      }
    };

    // Calculate metrics
    let totalEngagement = 0;
    let engagementCount = 0;
    const hourlyActivity: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    for (const event of filteredEvents) {
      // Event type distribution
      metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;

      // Privacy level distribution
      const privacyLevel = event.metadata.privacyLevel;
      metrics.privacyLevelDistribution[privacyLevel] = 
        (metrics.privacyLevelDistribution[privacyLevel] || 0) + 1;

      // User privacy tier distribution
      if (event.metadata.userPrivacyTier) {
        metrics.userPrivacyTierDistribution[event.metadata.userPrivacyTier] = 
          (metrics.userPrivacyTierDistribution[event.metadata.userPrivacyTier] || 0) + 1;
      }

      // Engagement metrics
      if (event.metadata.engagementScore !== undefined) {
        totalEngagement += event.metadata.engagementScore;
        engagementCount++;
      }

      // Content metrics
      if (event.type === 'post_created') {
        metrics.contentMetrics.totalPosts++;
      } else if (event.type === 'comment_created') {
        metrics.contentMetrics.totalComments++;
      }

      // Privacy level changes
      if (event.type === 'privacy_level_changed') {
        metrics.privacyMetrics.privacyLevelChanges++;
      }

      // Temporal metrics
      const hour = event.timestamp.getHours().toString();
      const day = event.timestamp.toLocaleDateString();
      
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    }

    // Calculate averages and derived metrics
    metrics.engagementMetrics.averageEngagement = 
      engagementCount > 0 ? totalEngagement / engagementCount : 0;

    // Find peak usage hours
    const sortedHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
    metrics.temporalMetrics.peakUsageHours = sortedHours;

    // Set daily activity
    metrics.temporalMetrics.activeUsersByDay = dailyActivity;

    // Calculate encrypted content percentage
    const encryptedEvents = filteredEvents.filter(
      event => event.metadata.privacyLevel !== PrivacyLevel.PUBLIC
    );
    metrics.privacyMetrics.encryptedContentPercentage = 
      filteredEvents.length > 0 ? (encryptedEvents.length / filteredEvents.length) * 100 : 0;

    return metrics;
  }

  /**
   * Load events from storage
   */
  private static loadEventsFromStorage(): void {
    try {
      const stored = localStorage.getItem('qsocial_analytics_events');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load analytics events:', error);
      this.events = [];
    }
  }

  /**
   * Save events to storage
   */
  private static async saveEventsToStorage(): Promise<void> {
    try {
      localStorage.setItem('qsocial_analytics_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save analytics events:', error);
    }
  }

  /**
   * Clean up old events
   */
  private static async cleanupOldEvents(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.events = this.events.filter(event => event.timestamp > cutoffDate);
    await this.saveEventsToStorage();
  }

  /**
   * Set up periodic cleanup
   */
  private static setupPeriodicCleanup(): void {
    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
  }

  /**
   * Clear all analytics data
   */
  static async clearAllData(): Promise<void> {
    this.events = [];
    localStorage.removeItem('qsocial_analytics_events');
  }

  /**
   * Export analytics data (anonymized)
   */
  static async exportData(): Promise<string> {
    const metrics = await this.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Get privacy-safe user statistics
   */
  static async getUserStatistics(): Promise<{
    totalInteractions: number;
    contentCreated: number;
    averageEngagement: number;
    privacyLevelUsage: Record<PrivacyLevel, number>;
  }> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found');
    }

    const anonymizedUserId = await this.generateAnonymizedUserId(identity.did);
    const userEvents = this.events.filter(event => event.anonymizedUserId === anonymizedUserId);

    const stats = {
      totalInteractions: userEvents.length,
      contentCreated: userEvents.filter(e => 
        e.type === 'post_created' || e.type === 'comment_created'
      ).length,
      averageEngagement: 0,
      privacyLevelUsage: {} as Record<PrivacyLevel, number>
    };

    let totalEngagement = 0;
    let engagementCount = 0;

    for (const event of userEvents) {
      // Privacy level usage
      const privacyLevel = event.metadata.privacyLevel;
      stats.privacyLevelUsage[privacyLevel] = (stats.privacyLevelUsage[privacyLevel] || 0) + 1;

      // Engagement
      if (event.metadata.engagementScore !== undefined) {
        totalEngagement += event.metadata.engagementScore;
        engagementCount++;
      }
    }

    stats.averageEngagement = engagementCount > 0 ? totalEngagement / engagementCount : 0;

    return stats;
  }
}