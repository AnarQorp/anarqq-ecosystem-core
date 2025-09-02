/**
 * Qsocial Privacy Service
 * Integrates with Qonsent privacy system for content access control and privacy enforcement
 */

import { getPrivacySettings, updatePrivacySettings } from '../../api/qonsent';
import { getActiveIdentity } from '../../state/identity';
import type { 
  QsocialPost, 
  QsocialComment, 
  PrivacyLevel as QsocialPrivacyLevel,
  Identity 
} from '../../types/qsocial';
import type { PrivacyLevel as QonsentPrivacyLevel, User } from '../../types';

/**
 * Privacy enforcement result
 */
export interface PrivacyEnforcementResult {
  canAccess: boolean;
  reason?: string;
  requiredLevel?: QonsentPrivacyLevel;
  currentLevel?: QonsentPrivacyLevel;
}

/**
 * Content filtering options
 */
export interface ContentFilterOptions {
  respectPrivacyLevel: boolean;
  includePrivate: boolean;
  includeCommunityOnly: boolean;
  userPrivacyLevel?: QonsentPrivacyLevel;
}

/**
 * Privacy-aware content result
 */
export interface PrivacyAwareContent<T> {
  content: T[];
  filtered: number;
  totalAvailable: number;
  privacyReasons: string[];
}

/**
 * Privacy Service for Qsocial content
 */
export class PrivacyService {
  /**
   * Map Qsocial privacy levels to Qonsent privacy levels
   */
  private static mapQsocialToQonsentPrivacy(qsocialLevel: QsocialPrivacyLevel): QonsentPrivacyLevel {
    switch (qsocialLevel) {
      case QsocialPrivacyLevel.PUBLIC:
        return QonsentPrivacyLevel.LOW;
      case QsocialPrivacyLevel.COMMUNITY:
        return QonsentPrivacyLevel.MEDIUM;
      case QsocialPrivacyLevel.PRIVATE:
        return QonsentPrivacyLevel.HIGH;
      default:
        return QonsentPrivacyLevel.LOW;
    }
  }

  /**
   * Map Qonsent privacy levels to Qsocial privacy levels
   */
  private static mapQonsentToQsocialPrivacy(qonsentLevel: QonsentPrivacyLevel): QsocialPrivacyLevel {
    switch (qonsentLevel) {
      case QonsentPrivacyLevel.LOW:
        return QsocialPrivacyLevel.PUBLIC;
      case QonsentPrivacyLevel.MEDIUM:
        return QsocialPrivacyLevel.COMMUNITY;
      case QonsentPrivacyLevel.HIGH:
        return QsocialPrivacyLevel.PRIVATE;
      default:
        return QsocialPrivacyLevel.PUBLIC;
    }
  }

  /**
   * Get user's privacy settings from Qonsent
   */
  static async getUserPrivacySettings(userId: string): Promise<User['privacySettings'] | null> {
    try {
      const result = await getPrivacySettings(userId);
      if (result.success && result.settings) {
        return result.settings;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user privacy settings:', error);
      return null;
    }
  }

  /**
   * Update user's privacy settings in Qonsent
   */
  static async updateUserPrivacySettings(
    userId: string, 
    settings: User['privacySettings']
  ): Promise<boolean> {
    try {
      const result = await updatePrivacySettings(userId, settings);
      return result.success;
    } catch (error) {
      console.error('Failed to update user privacy settings:', error);
      return false;
    }
  }

  /**
   * Check if user can access content based on privacy levels
   */
  static async canAccessContent(
    content: QsocialPost | QsocialComment,
    viewerId?: string
  ): Promise<PrivacyEnforcementResult> {
    // Public content is always accessible
    if (content.privacyLevel === QsocialPrivacyLevel.PUBLIC) {
      return { canAccess: true };
    }

    // If no viewer, only public content is accessible
    if (!viewerId) {
      return {
        canAccess: false,
        reason: 'Authentication required for non-public content',
        requiredLevel: this.mapQsocialToQonsentPrivacy(content.privacyLevel)
      };
    }

    // Author can always access their own content
    if (content.authorId === viewerId) {
      return { canAccess: true };
    }

    // Get viewer's privacy settings
    const viewerSettings = await this.getUserPrivacySettings(viewerId);
    if (!viewerSettings) {
      return {
        canAccess: false,
        reason: 'Unable to verify viewer privacy settings',
        requiredLevel: this.mapQsocialToQonsentPrivacy(content.privacyLevel)
      };
    }

    const requiredLevel = this.mapQsocialToQonsentPrivacy(content.privacyLevel);
    const viewerLevel = viewerSettings.level;

    // Check if viewer's privacy level meets the content's requirements
    const levelHierarchy = {
      [QonsentPrivacyLevel.LOW]: 1,
      [QonsentPrivacyLevel.MEDIUM]: 2,
      [QonsentPrivacyLevel.HIGH]: 3
    };

    const canAccess = levelHierarchy[viewerLevel] >= levelHierarchy[requiredLevel];

    if (!canAccess) {
      return {
        canAccess: false,
        reason: `Content requires ${requiredLevel} privacy level, viewer has ${viewerLevel}`,
        requiredLevel,
        currentLevel: viewerLevel
      };
    }

    // Additional checks for community-level content
    if (content.privacyLevel === QsocialPrivacyLevel.COMMUNITY) {
      // Check if viewer is in the same subcommunity (if applicable)
      if ('subcommunityId' in content && content.subcommunityId) {
        // This would need to be implemented with subcommunity membership check
        // For now, we'll allow access if privacy level is sufficient
      }
    }

    // Additional checks for private content
    if (content.privacyLevel === QsocialPrivacyLevel.PRIVATE) {
      // Private content should only be accessible to author and explicitly mentioned users
      // This would need additional implementation for mention tracking
      return {
        canAccess: false,
        reason: 'Private content is only accessible to author and mentioned users',
        requiredLevel,
        currentLevel: viewerLevel
      };
    }

    return { canAccess: true };
  }

  /**
   * Filter content array based on privacy settings
   */
  static async filterContentByPrivacy<T extends QsocialPost | QsocialComment>(
    content: T[],
    viewerId?: string,
    options: ContentFilterOptions = {
      respectPrivacyLevel: true,
      includePrivate: false,
      includeCommunityOnly: true
    }
  ): Promise<PrivacyAwareContent<T>> {
    if (!options.respectPrivacyLevel) {
      return {
        content,
        filtered: 0,
        totalAvailable: content.length,
        privacyReasons: []
      };
    }

    const filteredContent: T[] = [];
    const privacyReasons: string[] = [];
    let filteredCount = 0;

    for (const item of content) {
      const accessResult = await this.canAccessContent(item, viewerId);
      
      if (accessResult.canAccess) {
        filteredContent.push(item);
      } else {
        filteredCount++;
        if (accessResult.reason && !privacyReasons.includes(accessResult.reason)) {
          privacyReasons.push(accessResult.reason);
        }
      }
    }

    return {
      content: filteredContent,
      filtered: filteredCount,
      totalAvailable: content.length,
      privacyReasons
    };
  }

  /**
   * Get recommended privacy level for content based on user settings
   */
  static async getRecommendedPrivacyLevel(
    authorId: string,
    contentType: 'post' | 'comment',
    subcommunityId?: string
  ): Promise<QsocialPrivacyLevel> {
    const authorSettings = await this.getUserPrivacySettings(authorId);
    
    if (!authorSettings) {
      // Default to public if no settings found
      return QsocialPrivacyLevel.PUBLIC;
    }

    // Map user's general privacy preference to content privacy
    const baseLevel = this.mapQonsentToQsocialPrivacy(authorSettings.level);

    // Adjust based on content type and context
    if (contentType === 'comment' && baseLevel === QsocialPrivacyLevel.PRIVATE) {
      // Comments are rarely private, default to community level
      return QsocialPrivacyLevel.COMMUNITY;
    }

    if (subcommunityId && baseLevel === QsocialPrivacyLevel.PUBLIC) {
      // If posting in a subcommunity, consider community-level privacy
      return QsocialPrivacyLevel.COMMUNITY;
    }

    return baseLevel;
  }

  /**
   * Validate privacy level change
   */
  static async validatePrivacyLevelChange(
    content: QsocialPost | QsocialComment,
    newPrivacyLevel: QsocialPrivacyLevel,
    userId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Only author can change privacy level
    if (content.authorId !== userId) {
      return {
        valid: false,
        reason: 'Only the author can change content privacy level'
      };
    }

    // Get user's privacy settings
    const userSettings = await this.getUserPrivacySettings(userId);
    if (!userSettings) {
      return {
        valid: false,
        reason: 'Unable to verify user privacy settings'
      };
    }

    const userMaxLevel = this.mapQonsentToQsocialPrivacy(userSettings.level);
    
    // User cannot set privacy level higher than their account allows
    const levelHierarchy = {
      [QsocialPrivacyLevel.PUBLIC]: 1,
      [QsocialPrivacyLevel.COMMUNITY]: 2,
      [QsocialPrivacyLevel.PRIVATE]: 3
    };

    if (levelHierarchy[newPrivacyLevel] > levelHierarchy[userMaxLevel]) {
      return {
        valid: false,
        reason: `Privacy level ${newPrivacyLevel} exceeds user's maximum level ${userMaxLevel}`
      };
    }

    // Cannot make content more public if it has been commented on privately
    if ('commentCount' in content && content.commentCount > 0) {
      const currentLevel = levelHierarchy[content.privacyLevel];
      const newLevel = levelHierarchy[newPrivacyLevel];
      
      if (newLevel < currentLevel) {
        return {
          valid: false,
          reason: 'Cannot make content more public after receiving private interactions'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get privacy-aware content summary
   */
  static async getContentPrivacySummary(
    content: (QsocialPost | QsocialComment)[],
    viewerId?: string
  ): Promise<{
    total: number;
    accessible: number;
    public: number;
    community: number;
    private: number;
    filtered: number;
  }> {
    const summary = {
      total: content.length,
      accessible: 0,
      public: 0,
      community: 0,
      private: 0,
      filtered: 0
    };

    for (const item of content) {
      // Count by privacy level
      switch (item.privacyLevel) {
        case QsocialPrivacyLevel.PUBLIC:
          summary.public++;
          break;
        case QsocialPrivacyLevel.COMMUNITY:
          summary.community++;
          break;
        case QsocialPrivacyLevel.PRIVATE:
          summary.private++;
          break;
      }

      // Check accessibility
      const accessResult = await this.canAccessContent(item, viewerId);
      if (accessResult.canAccess) {
        summary.accessible++;
      } else {
        summary.filtered++;
      }
    }

    return summary;
  }

  /**
   * Apply privacy settings to new content
   */
  static async applyPrivacyToContent<T extends Partial<QsocialPost | QsocialComment>>(
    content: T,
    authorId: string,
    explicitPrivacyLevel?: QsocialPrivacyLevel
  ): Promise<T & { privacyLevel: QsocialPrivacyLevel }> {
    let privacyLevel: QsocialPrivacyLevel;

    if (explicitPrivacyLevel) {
      // Validate explicit privacy level
      const validation = await this.validatePrivacyLevelChange(
        { ...content, authorId, privacyLevel: explicitPrivacyLevel } as QsocialPost | QsocialComment,
        explicitPrivacyLevel,
        authorId
      );

      if (!validation.valid) {
        throw new Error(`Invalid privacy level: ${validation.reason}`);
      }

      privacyLevel = explicitPrivacyLevel;
    } else {
      // Get recommended privacy level
      const contentType = 'postId' in content ? 'comment' : 'post';
      const subcommunityId = 'subcommunityId' in content ? content.subcommunityId : undefined;
      
      privacyLevel = await this.getRecommendedPrivacyLevel(
        authorId,
        contentType,
        subcommunityId
      );
    }

    return {
      ...content,
      privacyLevel
    };
  }

  /**
   * Check if user can create content with specified privacy level
   */
  static async canCreateContentWithPrivacy(
    authorId: string,
    privacyLevel: QsocialPrivacyLevel
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const userSettings = await this.getUserPrivacySettings(authorId);
    
    if (!userSettings) {
      return {
        canCreate: false,
        reason: 'Unable to verify user privacy settings'
      };
    }

    const userMaxLevel = this.mapQonsentToQsocialPrivacy(userSettings.level);
    
    const levelHierarchy = {
      [QsocialPrivacyLevel.PUBLIC]: 1,
      [QsocialPrivacyLevel.COMMUNITY]: 2,
      [QsocialPrivacyLevel.PRIVATE]: 3
    };

    if (levelHierarchy[privacyLevel] > levelHierarchy[userMaxLevel]) {
      return {
        canCreate: false,
        reason: `User's privacy level (${userMaxLevel}) does not allow creating ${privacyLevel} content`
      };
    }

    return { canCreate: true };
  }
}