import { 
  QsocialPost, 
  QsocialComment, 
  ModerationStatus, 
  ModerationLevel,
  Identity,
  UserReputation,
  Subcommunity
} from '../../types/qsocial';

/**
 * Moderation action types
 */
export enum ModerationAction {
  APPROVE = 'approve',
  HIDE = 'hide',
  REMOVE = 'remove',
  BAN_USER = 'ban_user',
  UNBAN_USER = 'unban_user',
  PIN_POST = 'pin_post',
  UNPIN_POST = 'unpin_post',
  LOCK_POST = 'lock_post',
  UNLOCK_POST = 'unlock_post'
}

/**
 * Moderation queue item
 */
export interface ModerationQueueItem {
  id: string;
  contentType: 'post' | 'comment';
  contentId: string;
  content: QsocialPost | QsocialComment;
  reportReason?: string;
  reportedBy?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subcommunityId?: string;
  createdAt: Date;
  assignedTo?: string;
  status: 'pending' | 'in_review' | 'resolved';
}

/**
 * Moderation log entry
 */
export interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  moderatorIdentity: Identity;
  action: ModerationAction;
  contentType: 'post' | 'comment' | 'user';
  contentId: string;
  subcommunityId?: string;
  reason: string;
  previousStatus?: ModerationStatus;
  newStatus?: ModerationStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Content filter rule
 */
export interface ContentFilterRule {
  id: string;
  name: string;
  type: 'keyword' | 'regex' | 'ml_classifier' | 'spam_detector';
  pattern: string;
  action: 'flag' | 'auto_hide' | 'auto_remove';
  severity: 'low' | 'medium' | 'high';
  isActive: boolean;
  subcommunityId?: string; // null for global rules
  createdBy: string;
  createdAt: Date;
}

/**
 * Automated moderation result
 */
export interface AutoModerationResult {
  action: 'approve' | 'flag' | 'hide' | 'remove';
  confidence: number;
  reasons: string[];
  triggeredRules: ContentFilterRule[];
  requiresHumanReview: boolean;
}

/**
 * User ban information
 */
export interface UserBan {
  id: string;
  userId: string;
  subcommunityId?: string; // null for global ban
  bannedBy: string;
  reason: string;
  duration?: number; // hours, null for permanent
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * Moderation statistics
 */
export interface ModerationStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  autoModeratedContent: number;
  manualModerationActions: number;
  activeBans: number;
  averageResponseTime: number; // hours
  topReportReasons: Array<{ reason: string; count: number }>;
}

/**
 * ModerationService handles all content moderation functionality
 */
export class ModerationService {
  private static moderationQueue: ModerationQueueItem[] = [];
  private static moderationLog: ModerationLogEntry[] = [];
  private static contentFilters: ContentFilterRule[] = [];
  private static userBans: UserBan[] = [];

  /**
   * Initialize default content filters
   */
  static async initializeDefaultFilters(): Promise<void> {
    const defaultFilters: Omit<ContentFilterRule, 'id' | 'createdAt'>[] = [
      {
        name: 'Spam Detection',
        type: 'ml_classifier',
        pattern: 'spam_classifier_v1',
        action: 'flag',
        severity: 'medium',
        isActive: true,
        createdBy: 'system'
      },
      {
        name: 'Profanity Filter',
        type: 'keyword',
        pattern: 'fuck|shit|damn|hell|ass|bitch',
        action: 'flag',
        severity: 'low',
        isActive: true,
        createdBy: 'system'
      },
      {
        name: 'Hate Speech Detection',
        type: 'ml_classifier',
        pattern: 'hate_speech_classifier_v1',
        action: 'auto_hide',
        severity: 'high',
        isActive: true,
        createdBy: 'system'
      },
      {
        name: 'Excessive Caps',
        type: 'regex',
        pattern: '[A-Z]{10,}',
        action: 'flag',
        severity: 'low',
        isActive: true,
        createdBy: 'system'
      }
    ];

    for (const filter of defaultFilters) {
      const filterRule: ContentFilterRule = {
        ...filter,
        id: this.generateId(),
        createdAt: new Date()
      };
      this.contentFilters.push(filterRule);
    }

    console.log('[ModerationService] Initialized default content filters');
  }

  /**
   * Perform automated content moderation
   */
  static async moderateContent(
    content: QsocialPost | QsocialComment,
    contentType: 'post' | 'comment'
  ): Promise<AutoModerationResult> {
    const textContent = contentType === 'post' 
      ? `${(content as QsocialPost).title} ${content.content}`
      : content.content;

    const triggeredRules: ContentFilterRule[] = [];
    let highestSeverity: 'low' | 'medium' | 'high' = 'low';
    const reasons: string[] = [];

    // Apply content filters
    for (const filter of this.contentFilters) {
      if (!filter.isActive) continue;

      // Check if filter applies to this subcommunity
      if (filter.subcommunityId && 
          filter.subcommunityId !== (content as any).subcommunityId) {
        continue;
      }

      let matches = false;

      switch (filter.type) {
        case 'keyword':
          const keywords = filter.pattern.split('|');
          matches = keywords.some(keyword => 
            textContent.toLowerCase().includes(keyword.toLowerCase())
          );
          break;

        case 'regex':
          const regex = new RegExp(filter.pattern, 'gi');
          matches = regex.test(textContent);
          break;

        case 'ml_classifier':
          // Simulate ML classifier (in real implementation, call actual ML service)
          matches = await this.simulateMLClassifier(textContent, filter.pattern);
          break;

        case 'spam_detector':
          matches = await this.detectSpam(textContent, content.authorId);
          break;
      }

      if (matches) {
        triggeredRules.push(filter);
        reasons.push(`Triggered rule: ${filter.name}`);
        
        if (filter.severity === 'high') highestSeverity = 'high';
        else if (filter.severity === 'medium' && highestSeverity !== 'high') {
          highestSeverity = 'medium';
        }
      }
    }

    // Determine action based on triggered rules
    let action: 'approve' | 'flag' | 'hide' | 'remove' = 'approve';
    let confidence = 0.8;
    let requiresHumanReview = false;

    if (triggeredRules.length > 0) {
      const autoHideRules = triggeredRules.filter(r => r.action === 'auto_hide');
      const autoRemoveRules = triggeredRules.filter(r => r.action === 'auto_remove');
      const flagRules = triggeredRules.filter(r => r.action === 'flag');

      if (autoRemoveRules.length > 0) {
        action = 'remove';
        confidence = 0.9;
      } else if (autoHideRules.length > 0) {
        action = 'hide';
        confidence = 0.85;
      } else if (flagRules.length > 0) {
        action = 'flag';
        confidence = 0.7;
        requiresHumanReview = true;
      }

      // High severity always requires human review
      if (highestSeverity === 'high') {
        requiresHumanReview = true;
      }
    }

    const result: AutoModerationResult = {
      action,
      confidence,
      reasons,
      triggeredRules,
      requiresHumanReview
    };

    // Log the automated moderation
    console.log(`[ModerationService] Auto-moderated ${contentType} ${content.id}:`, result);

    return result;
  }

  /**
   * Add content to moderation queue
   */
  static async addToModerationQueue(
    contentType: 'post' | 'comment',
    contentId: string,
    content: QsocialPost | QsocialComment,
    options: {
      reportReason?: string;
      reportedBy?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      subcommunityId?: string;
    } = {}
  ): Promise<ModerationQueueItem> {
    const queueItem: ModerationQueueItem = {
      id: this.generateId(),
      contentType,
      contentId,
      content,
      reportReason: options.reportReason,
      reportedBy: options.reportedBy,
      priority: options.priority || 'medium',
      subcommunityId: options.subcommunityId,
      createdAt: new Date(),
      status: 'pending'
    };

    this.moderationQueue.push(queueItem);
    
    console.log(`[ModerationService] Added ${contentType} ${contentId} to moderation queue`);
    
    return queueItem;
  }

  /**
   * Get moderation queue items
   */
  static async getModerationQueue(options: {
    subcommunityId?: string;
    status?: 'pending' | 'in_review' | 'resolved';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ModerationQueueItem[]> {
    let filtered = [...this.moderationQueue];

    if (options.subcommunityId) {
      filtered = filtered.filter(item => item.subcommunityId === options.subcommunityId);
    }

    if (options.status) {
      filtered = filtered.filter(item => item.status === options.status);
    }

    if (options.priority) {
      filtered = filtered.filter(item => item.priority === options.priority);
    }

    if (options.assignedTo) {
      filtered = filtered.filter(item => item.assignedTo === options.assignedTo);
    }

    // Sort by priority and creation date
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Assign moderation queue item to moderator
   */
  static async assignModerationItem(
    itemId: string,
    moderatorId: string
  ): Promise<boolean> {
    const item = this.moderationQueue.find(item => item.id === itemId);
    if (!item) return false;

    item.assignedTo = moderatorId;
    item.status = 'in_review';

    console.log(`[ModerationService] Assigned moderation item ${itemId} to ${moderatorId}`);
    return true;
  }

  /**
   * Perform moderation action
   */
  static async performModerationAction(
    moderatorId: string,
    moderatorIdentity: Identity,
    action: ModerationAction,
    contentType: 'post' | 'comment' | 'user',
    contentId: string,
    reason: string,
    options: {
      subcommunityId?: string;
      banDuration?: number; // hours
      queueItemId?: string;
    } = {}
  ): Promise<boolean> {
    try {
      // Validate moderator permissions
      const canModerate = await this.canPerformModerationAction(
        moderatorId, 
        action, 
        options.subcommunityId
      );
      
      if (!canModerate) {
        console.error(`[ModerationService] User ${moderatorId} lacks permission for action ${action}`);
        return false;
      }

      let previousStatus: ModerationStatus | undefined;
      let newStatus: ModerationStatus | undefined;

      // Apply the moderation action
      switch (action) {
        case ModerationAction.APPROVE:
          newStatus = ModerationStatus.APPROVED;
          await this.updateContentStatus(contentType, contentId, newStatus, moderatorId);
          break;

        case ModerationAction.HIDE:
          newStatus = ModerationStatus.HIDDEN;
          await this.updateContentStatus(contentType, contentId, newStatus, moderatorId);
          break;

        case ModerationAction.REMOVE:
          newStatus = ModerationStatus.REMOVED;
          await this.updateContentStatus(contentType, contentId, newStatus, moderatorId);
          break;

        case ModerationAction.BAN_USER:
          await this.banUser(contentId, moderatorId, reason, options.banDuration, options.subcommunityId);
          break;

        case ModerationAction.UNBAN_USER:
          await this.unbanUser(contentId, options.subcommunityId);
          break;

        case ModerationAction.PIN_POST:
          await this.updatePostProperty(contentId, 'isPinned', true);
          break;

        case ModerationAction.UNPIN_POST:
          await this.updatePostProperty(contentId, 'isPinned', false);
          break;

        case ModerationAction.LOCK_POST:
          await this.updatePostProperty(contentId, 'isLocked', true);
          break;

        case ModerationAction.UNLOCK_POST:
          await this.updatePostProperty(contentId, 'isLocked', false);
          break;
      }

      // Log the moderation action
      const logEntry: ModerationLogEntry = {
        id: this.generateId(),
        moderatorId,
        moderatorIdentity,
        action,
        contentType,
        contentId,
        subcommunityId: options.subcommunityId,
        reason,
        previousStatus,
        newStatus,
        timestamp: new Date(),
        metadata: options
      };

      this.moderationLog.push(logEntry);

      // Update queue item if provided
      if (options.queueItemId) {
        const queueItem = this.moderationQueue.find(item => item.id === options.queueItemId);
        if (queueItem) {
          queueItem.status = 'resolved';
        }
      }

      console.log(`[ModerationService] Performed action ${action} on ${contentType} ${contentId}`);
      return true;

    } catch (error) {
      console.error('[ModerationService] Error performing moderation action:', error);
      return false;
    }
  }

  /**
   * Get moderation log
   */
  static async getModerationLog(options: {
    moderatorId?: string;
    subcommunityId?: string;
    contentType?: 'post' | 'comment' | 'user';
    action?: ModerationAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<ModerationLogEntry[]> {
    let filtered = [...this.moderationLog];

    if (options.moderatorId) {
      filtered = filtered.filter(entry => entry.moderatorId === options.moderatorId);
    }

    if (options.subcommunityId) {
      filtered = filtered.filter(entry => entry.subcommunityId === options.subcommunityId);
    }

    if (options.contentType) {
      filtered = filtered.filter(entry => entry.contentType === options.contentType);
    }

    if (options.action) {
      filtered = filtered.filter(entry => entry.action === options.action);
    }

    if (options.startDate) {
      filtered = filtered.filter(entry => entry.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(entry => entry.timestamp <= options.endDate!);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options.offset || 0;
    const limit = options.limit || 100;
    
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Create content filter rule
   */
  static async createContentFilter(
    creatorId: string,
    filter: Omit<ContentFilterRule, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<ContentFilterRule> {
    const filterRule: ContentFilterRule = {
      ...filter,
      id: this.generateId(),
      createdBy: creatorId,
      createdAt: new Date()
    };

    this.contentFilters.push(filterRule);
    
    console.log(`[ModerationService] Created content filter: ${filterRule.name}`);
    
    return filterRule;
  }

  /**
   * Update content filter rule
   */
  static async updateContentFilter(
    filterId: string,
    updates: Partial<Omit<ContentFilterRule, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<boolean> {
    const filterIndex = this.contentFilters.findIndex(f => f.id === filterId);
    if (filterIndex === -1) return false;

    this.contentFilters[filterIndex] = {
      ...this.contentFilters[filterIndex],
      ...updates
    };

    console.log(`[ModerationService] Updated content filter: ${filterId}`);
    return true;
  }

  /**
   * Delete content filter rule
   */
  static async deleteContentFilter(filterId: string): Promise<boolean> {
    const filterIndex = this.contentFilters.findIndex(f => f.id === filterId);
    if (filterIndex === -1) return false;

    this.contentFilters.splice(filterIndex, 1);
    
    console.log(`[ModerationService] Deleted content filter: ${filterId}`);
    return true;
  }

  /**
   * Get content filters
   */
  static async getContentFilters(subcommunityId?: string): Promise<ContentFilterRule[]> {
    if (subcommunityId) {
      return this.contentFilters.filter(f => 
        !f.subcommunityId || f.subcommunityId === subcommunityId
      );
    }
    return [...this.contentFilters];
  }

  /**
   * Get moderation statistics
   */
  static async getModerationStats(subcommunityId?: string): Promise<ModerationStats> {
    const queueItems = subcommunityId 
      ? this.moderationQueue.filter(item => item.subcommunityId === subcommunityId)
      : this.moderationQueue;

    const logEntries = subcommunityId
      ? this.moderationLog.filter(entry => entry.subcommunityId === subcommunityId)
      : this.moderationLog;

    const activeBans = subcommunityId
      ? this.userBans.filter(ban => ban.subcommunityId === subcommunityId && ban.isActive)
      : this.userBans.filter(ban => ban.isActive);

    // Calculate average response time
    const resolvedItems = queueItems.filter(item => item.status === 'resolved');
    const responseTimes = resolvedItems.map(item => {
      const resolvedEntry = logEntries.find(entry => 
        entry.contentId === item.contentId && 
        entry.timestamp > item.createdAt
      );
      if (resolvedEntry) {
        return (resolvedEntry.timestamp.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60); // hours
      }
      return 0;
    }).filter(time => time > 0);

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Count report reasons
    const reportReasons: Record<string, number> = {};
    queueItems.forEach(item => {
      if (item.reportReason) {
        reportReasons[item.reportReason] = (reportReasons[item.reportReason] || 0) + 1;
      }
    });

    const topReportReasons = Object.entries(reportReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalReports: queueItems.length,
      pendingReports: queueItems.filter(item => item.status === 'pending').length,
      resolvedReports: queueItems.filter(item => item.status === 'resolved').length,
      autoModeratedContent: logEntries.filter(entry => entry.moderatorId === 'system').length,
      manualModerationActions: logEntries.filter(entry => entry.moderatorId !== 'system').length,
      activeBans: activeBans.length,
      averageResponseTime,
      topReportReasons
    };
  }

  /**
   * Check if user is banned
   */
  static async isUserBanned(userId: string, subcommunityId?: string): Promise<boolean> {
    const now = new Date();
    
    return this.userBans.some(ban => 
      ban.userId === userId &&
      ban.isActive &&
      (ban.subcommunityId === subcommunityId || (!ban.subcommunityId && !subcommunityId)) &&
      (!ban.expiresAt || ban.expiresAt > now)
    );
  }

  /**
   * Get user bans
   */
  static async getUserBans(userId: string): Promise<UserBan[]> {
    return this.userBans.filter(ban => ban.userId === userId && ban.isActive);
  }

  // Private helper methods

  private static async simulateMLClassifier(text: string, classifierType: string): Promise<boolean> {
    // Simulate ML classifier with simple heuristics
    const lowerText = text.toLowerCase();
    
    switch (classifierType) {
      case 'spam_classifier_v1':
        return lowerText.includes('buy now') || 
               lowerText.includes('click here') ||
               lowerText.includes('free money') ||
               /(.)\1{4,}/.test(text); // Repeated characters
               
      case 'hate_speech_classifier_v1':
        const hateSpeechKeywords = ['hate', 'kill', 'die', 'stupid', 'idiot'];
        return hateSpeechKeywords.some(keyword => lowerText.includes(keyword));
        
      default:
        return false;
    }
  }

  private static async detectSpam(text: string, authorId: string): Promise<boolean> {
    // Simple spam detection heuristics
    const recentPosts = this.moderationLog.filter(entry => 
      entry.moderatorId === authorId &&
      entry.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    // Too many posts in short time
    if (recentPosts.length > 5) return true;

    // Excessive links
    const linkCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) return true;

    // Excessive repetition
    if (/(.{10,})\1{2,}/.test(text)) return true;

    return false;
  }

  private static async canPerformModerationAction(
    moderatorId: string,
    action: ModerationAction,
    subcommunityId?: string
  ): Promise<boolean> {
    // TODO: Integrate with actual user reputation and permission system
    // For now, simulate permission check
    
    // Global actions require global moderator status
    const globalActions = [ModerationAction.BAN_USER, ModerationAction.UNBAN_USER];
    if (globalActions.includes(action) && !subcommunityId) {
      // Check if user has global moderation privileges
      return moderatorId === 'admin' || moderatorId.includes('moderator');
    }

    // Community-specific actions
    if (subcommunityId) {
      // Check if user is moderator of this subcommunity
      // This would integrate with SubcommunityService in real implementation
      return true; // Simplified for now
    }

    return true; // Simplified permission check
  }

  private static async updateContentStatus(
    contentType: 'post' | 'comment',
    contentId: string,
    status: ModerationStatus,
    moderatorId: string
  ): Promise<void> {
    // TODO: Integrate with actual PostService and CommentService
    console.log(`[ModerationService] Updated ${contentType} ${contentId} status to ${status} by ${moderatorId}`);
  }

  private static async updatePostProperty(
    postId: string,
    property: 'isPinned' | 'isLocked',
    value: boolean
  ): Promise<void> {
    // TODO: Integrate with actual PostService
    console.log(`[ModerationService] Updated post ${postId} ${property} to ${value}`);
  }

  private static async banUser(
    userId: string,
    bannedBy: string,
    reason: string,
    duration?: number,
    subcommunityId?: string
  ): Promise<void> {
    const ban: UserBan = {
      id: this.generateId(),
      userId,
      subcommunityId,
      bannedBy,
      reason,
      duration,
      createdAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined,
      isActive: true
    };

    this.userBans.push(ban);
    console.log(`[ModerationService] Banned user ${userId} for: ${reason}`);
  }

  private static async unbanUser(userId: string, subcommunityId?: string): Promise<void> {
    const banIndex = this.userBans.findIndex(ban => 
      ban.userId === userId && 
      ban.subcommunityId === subcommunityId &&
      ban.isActive
    );

    if (banIndex !== -1) {
      this.userBans[banIndex].isActive = false;
      console.log(`[ModerationService] Unbanned user ${userId}`);
    }
  }

  private static generateId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}