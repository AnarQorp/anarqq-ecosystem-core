/**
 * Privacy Middleware for Qsocial API
 * Enforces privacy controls and content filtering at the API level
 */

import { PrivacyService } from './PrivacyService';
import { getActiveIdentity } from '../../state/identity';
import type { 
  QsocialPost, 
  QsocialComment, 
  CreatePostRequest,
  CreateCommentRequest,
  UpdatePostRequest,
  UpdateCommentRequest,
  PrivacyLevel 
} from '../../types/qsocial';

/**
 * Request context for privacy middleware
 */
export interface PrivacyContext {
  userId?: string;
  userPrivacyLevel?: string;
  requestType: 'read' | 'write' | 'update' | 'delete';
  contentType: 'post' | 'comment' | 'subcommunity';
}

/**
 * Privacy middleware result
 */
export interface PrivacyMiddlewareResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  filtered?: number;
  privacyReasons?: string[];
}

/**
 * Privacy enforcement middleware for Qsocial operations
 */
export class PrivacyMiddleware {
  /**
   * Middleware for creating posts with privacy validation
   */
  static async validatePostCreation(
    request: CreatePostRequest,
    authorId: string
  ): Promise<PrivacyMiddlewareResult<CreatePostRequest>> {
    try {
      // Check if user can create content with specified privacy level
      const privacyLevel = request.privacyLevel || PrivacyLevel.PUBLIC;
      const canCreate = await PrivacyService.canCreateContentWithPrivacy(authorId, privacyLevel);
      
      if (!canCreate.canCreate) {
        return {
          success: false,
          error: canCreate.reason || 'Privacy level not allowed'
        };
      }

      // Apply privacy settings to the request
      const processedRequest = await PrivacyService.applyPrivacyToContent(
        request,
        authorId,
        request.privacyLevel
      );

      return {
        success: true,
        data: processedRequest
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Privacy validation failed'
      };
    }
  }

  /**
   * Middleware for creating comments with privacy validation
   */
  static async validateCommentCreation(
    request: CreateCommentRequest,
    authorId: string,
    parentPost?: QsocialPost
  ): Promise<PrivacyMiddlewareResult<CreateCommentRequest>> {
    try {
      // Check if user can create content with specified privacy level
      const privacyLevel = request.privacyLevel || PrivacyLevel.PUBLIC;
      const canCreate = await PrivacyService.canCreateContentWithPrivacy(authorId, privacyLevel);
      
      if (!canCreate.canCreate) {
        return {
          success: false,
          error: canCreate.reason || 'Privacy level not allowed'
        };
      }

      // If commenting on a post, ensure comment privacy doesn't exceed post privacy
      if (parentPost) {
        const postPrivacyLevel = parentPost.privacyLevel;
        const levelHierarchy = {
          [PrivacyLevel.PUBLIC]: 1,
          [PrivacyLevel.COMMUNITY]: 2,
          [PrivacyLevel.PRIVATE]: 3
        };

        if (levelHierarchy[privacyLevel] < levelHierarchy[postPrivacyLevel]) {
          return {
            success: false,
            error: `Comment privacy level cannot be lower than post privacy level (${postPrivacyLevel})`
          };
        }
      }

      // Apply privacy settings to the request
      const processedRequest = await PrivacyService.applyPrivacyToContent(
        request,
        authorId,
        request.privacyLevel
      );

      return {
        success: true,
        data: processedRequest
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Privacy validation failed'
      };
    }
  }

  /**
   * Middleware for updating posts with privacy validation
   */
  static async validatePostUpdate(
    postId: string,
    updates: UpdatePostRequest,
    userId: string,
    existingPost: QsocialPost
  ): Promise<PrivacyMiddlewareResult<UpdatePostRequest>> {
    try {
      // Only author can update their posts
      if (existingPost.authorId !== userId) {
        return {
          success: false,
          error: 'Only the author can update this post'
        };
      }

      // If privacy level is being changed, validate it
      if (updates.privacyLevel && updates.privacyLevel !== existingPost.privacyLevel) {
        const validation = await PrivacyService.validatePrivacyLevelChange(
          existingPost,
          updates.privacyLevel,
          userId
        );

        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason || 'Privacy level change not allowed'
          };
        }
      }

      return {
        success: true,
        data: updates
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Privacy validation failed'
      };
    }
  }

  /**
   * Middleware for updating comments with privacy validation
   */
  static async validateCommentUpdate(
    commentId: string,
    updates: UpdateCommentRequest,
    userId: string,
    existingComment: QsocialComment
  ): Promise<PrivacyMiddlewareResult<UpdateCommentRequest>> {
    try {
      // Only author can update their comments
      if (existingComment.authorId !== userId) {
        return {
          success: false,
          error: 'Only the author can update this comment'
        };
      }

      // If privacy level is being changed, validate it
      if (updates.privacyLevel && updates.privacyLevel !== existingComment.privacyLevel) {
        const validation = await PrivacyService.validatePrivacyLevelChange(
          existingComment,
          updates.privacyLevel,
          userId
        );

        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason || 'Privacy level change not allowed'
          };
        }
      }

      return {
        success: true,
        data: updates
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Privacy validation failed'
      };
    }
  }

  /**
   * Middleware for filtering posts based on privacy
   */
  static async filterPosts(
    posts: QsocialPost[],
    viewerId?: string
  ): Promise<PrivacyMiddlewareResult<QsocialPost[]>> {
    try {
      const result = await PrivacyService.filterContentByPrivacy(posts, viewerId);
      
      return {
        success: true,
        data: result.content,
        filtered: result.filtered,
        privacyReasons: result.privacyReasons
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content filtering failed'
      };
    }
  }

  /**
   * Middleware for filtering comments based on privacy
   */
  static async filterComments(
    comments: QsocialComment[],
    viewerId?: string
  ): Promise<PrivacyMiddlewareResult<QsocialComment[]>> {
    try {
      const result = await PrivacyService.filterContentByPrivacy(comments, viewerId);
      
      return {
        success: true,
        data: result.content,
        filtered: result.filtered,
        privacyReasons: result.privacyReasons
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content filtering failed'
      };
    }
  }

  /**
   * Middleware for validating content access
   */
  static async validateContentAccess(
    content: QsocialPost | QsocialComment,
    viewerId?: string
  ): Promise<PrivacyMiddlewareResult<boolean>> {
    try {
      const result = await PrivacyService.canAccessContent(content, viewerId);
      
      if (!result.canAccess) {
        return {
          success: false,
          error: result.reason || 'Access denied'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Access validation failed'
      };
    }
  }

  /**
   * Middleware for getting privacy-aware feed
   */
  static async getPrivacyAwareFeed(
    posts: QsocialPost[],
    viewerId?: string,
    includePrivacySummary: boolean = false
  ): Promise<PrivacyMiddlewareResult<{
    posts: QsocialPost[];
    summary?: any;
  }>> {
    try {
      const filterResult = await this.filterPosts(posts, viewerId);
      
      if (!filterResult.success || !filterResult.data) {
        return {
          success: false,
          error: filterResult.error || 'Failed to filter feed'
        };
      }

      const result: any = {
        posts: filterResult.data
      };

      if (includePrivacySummary) {
        result.summary = await PrivacyService.getContentPrivacySummary(posts, viewerId);
      }

      return {
        success: true,
        data: result,
        filtered: filterResult.filtered,
        privacyReasons: filterResult.privacyReasons
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Feed processing failed'
      };
    }
  }

  /**
   * Middleware for privacy-aware search results
   */
  static async filterSearchResults(
    posts: QsocialPost[],
    comments: QsocialComment[],
    viewerId?: string
  ): Promise<PrivacyMiddlewareResult<{
    posts: QsocialPost[];
    comments: QsocialComment[];
    totalFiltered: number;
  }>> {
    try {
      const [postResult, commentResult] = await Promise.all([
        this.filterPosts(posts, viewerId),
        this.filterComments(comments, viewerId)
      ]);

      if (!postResult.success || !commentResult.success) {
        return {
          success: false,
          error: 'Failed to filter search results'
        };
      }

      return {
        success: true,
        data: {
          posts: postResult.data || [],
          comments: commentResult.data || [],
          totalFiltered: (postResult.filtered || 0) + (commentResult.filtered || 0)
        },
        filtered: (postResult.filtered || 0) + (commentResult.filtered || 0),
        privacyReasons: [
          ...(postResult.privacyReasons || []),
          ...(commentResult.privacyReasons || [])
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search filtering failed'
      };
    }
  }

  /**
   * Get current user context for privacy operations
   */
  static getCurrentUserContext(): { userId?: string } {
    const identity = getActiveIdentity();
    return {
      userId: identity?.did
    };
  }

  /**
   * Middleware wrapper for API endpoints
   */
  static withPrivacyEnforcement<T>(
    operation: (context: { userId?: string }) => Promise<T>
  ): Promise<T> {
    const context = this.getCurrentUserContext();
    return operation(context);
  }
}