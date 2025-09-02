import { 
  QsocialComment, 
  CreateCommentRequest, 
  UpdateCommentRequest, 
  CommentOptions, 
  VoteResult,
  PrivacyLevel,
  ModerationStatus
} from '../../types/qsocial';
import {
  validateCreateCommentRequest,
  validateUpdateCommentRequest,
  validateCommentOptions,
  safeValidateCreateCommentRequest,
  safeValidateUpdateCommentRequest
} from '../../types/qsocial-validation';
import { getActiveIdentity } from '../../state/identity';
import { CommentService as CommentAPI } from '../../api/qsocial';
import { ContentSanitizer } from './PostService';
import { QsocialStorageService } from './QsocialStorageService';

/**
 * Comment validation utilities
 */
export class CommentValidator {
  /**
   * Validate comment content
   */
  static validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }
    if (content.length > 10000) {
      throw new Error('Comment content exceeds maximum length');
    }
  }

  /**
   * Validate comment depth
   */
  static validateDepth(depth: number): void {
    if (depth < 0) {
      throw new Error('Comment depth cannot be negative');
    }
    if (depth > 10) {
      throw new Error('Comment depth exceeds maximum nesting level');
    }
  }

  /**
   * Check if user can comment on post
   */
  static async validateCommentAccess(postId: string): Promise<void> {
    if (!postId || postId.trim().length === 0) {
      throw new Error('Post ID is required');
    }
    
    // TODO: Implement post access validation
    // This would check if post exists, is not locked, user is not banned, etc.
    // For now, we'll just validate the ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(postId)) {
      throw new Error('Invalid post ID format');
    }
  }
}

/**
 * Comment threading utilities
 */
export class CommentThreadManager {
  /**
   * Calculate comment depth based on parent
   */
  static calculateDepth(parentComment?: QsocialComment): number {
    return parentComment ? parentComment.depth + 1 : 0;
  }

  /**
   * Build comment tree from flat list
   */
  static buildCommentTree(comments: QsocialComment[]): QsocialComment[] {
    const commentMap = new Map<string, QsocialComment>();
    const rootComments: QsocialComment[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, childrenIds: [] });
    });

    // Second pass: build parent-child relationships
    comments.forEach(comment => {
      const commentWithChildren = commentMap.get(comment.id)!;
      
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.childrenIds.push(comment.id);
        }
      } else {
        rootComments.push(commentWithChildren);
      }
    });

    return rootComments;
  }

  /**
   * Flatten comment tree to list
   */
  static flattenCommentTree(comments: QsocialComment[], commentMap: Map<string, QsocialComment>): QsocialComment[] {
    const result: QsocialComment[] = [];

    const addCommentAndChildren = (comment: QsocialComment) => {
      result.push(comment);
      comment.childrenIds.forEach(childId => {
        const child = commentMap.get(childId);
        if (child) {
          addCommentAndChildren(child);
        }
      });
    };

    comments.forEach(addCommentAndChildren);
    return result;
  }

  /**
   * Get comment thread (comment and all its descendants)
   */
  static getCommentThread(commentId: string, allComments: QsocialComment[]): QsocialComment[] {
    const commentMap = new Map<string, QsocialComment>();
    allComments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    const rootComment = commentMap.get(commentId);
    if (!rootComment) {
      return [];
    }

    const thread: QsocialComment[] = [];
    const addToThread = (comment: QsocialComment) => {
      thread.push(comment);
      comment.childrenIds.forEach(childId => {
        const child = commentMap.get(childId);
        if (child) {
          addToThread(child);
        }
      });
    };

    addToThread(rootComment);
    return thread;
  }

  /**
   * Sort comments by specified criteria
   */
  static sortComments(comments: QsocialComment[], sortBy: 'newest' | 'oldest' | 'popular'): QsocialComment[] {
    return [...comments].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          const aScore = a.upvotes - a.downvotes;
          const bScore = b.upvotes - b.downvotes;
          return bScore - aScore;
        default:
          return 0;
      }
    });
  }

  /**
   * Filter comments by maximum depth
   */
  static filterByMaxDepth(comments: QsocialComment[], maxDepth: number): QsocialComment[] {
    return comments.filter(comment => comment.depth <= maxDepth);
  }

  /**
   * Paginate comments
   */
  static paginateComments(comments: QsocialComment[], limit: number, offset: number): QsocialComment[] {
    return comments.slice(offset, offset + limit);
  }
}

/**
 * Enhanced CommentService with threading support
 */
export class CommentService {
  /**
   * Create a new comment with validation and sanitization
   */
  static async createComment(commentData: CreateCommentRequest): Promise<QsocialComment> {
    // Validate input data
    const validationResult = safeValidateCreateCommentRequest(commentData);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    // Additional business logic validation
    CommentValidator.validateContent(validatedData.content);
    await CommentValidator.validateCommentAccess(validatedData.postId);

    // Get current identity for storage
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found. Please login first.');
    }

    let parentDepth = 0;
    // If this is a reply, validate parent comment
    if (validatedData.parentCommentId) {
      try {
        const parentComment = await CommentAPI.getComment(validatedData.parentCommentId);
        parentDepth = parentComment.depth;
        CommentValidator.validateDepth(parentDepth + 1);
      } catch (error) {
        throw new Error('Invalid parent comment');
      }
    }

    // Sanitize content
    const sanitizedComment: CreateCommentRequest = {
      ...validatedData,
      content: ContentSanitizer.sanitizeHtml(validatedData.content.trim()),
      privacyLevel: validatedData.privacyLevel || PrivacyLevel.PUBLIC,
    };

    // Create temporary comment object for storage
    const tempComment = {
      postId: sanitizedComment.postId,
      authorId: identity.did,
      content: sanitizedComment.content,
      parentCommentId: sanitizedComment.parentCommentId,
      depth: parentDepth + 1,
      childrenIds: [],
      upvotes: 0,
      downvotes: 0,
      privacyLevel: sanitizedComment.privacyLevel,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      moderationStatus: ModerationStatus.APPROVED,
    };

    // Store content to IPFS
    try {
      const storageResult = await QsocialStorageService.storeCommentContent(tempComment);
      
      // Add IPFS hash to comment data
      const commentWithStorage = {
        ...sanitizedComment,
        ipfsHash: storageResult.ipfsHash,
      };

      // Create comment via API
      const createdComment = await CommentAPI.createComment(commentWithStorage);
      
      console.log(`[CommentService] Comment created successfully with IPFS storage. ID: ${createdComment.id}, Hash: ${storageResult.ipfsHash}`);
      
      return createdComment;
    } catch (storageError) {
      console.error('Failed to store comment content:', storageError);
      
      // If storage fails, still try to create the comment without IPFS hash
      // The content will be stored in the database as fallback
      console.warn('[CommentService] Creating comment without IPFS storage due to storage failure');
      
      try {
        const createdComment = await CommentAPI.createComment(sanitizedComment);
        return createdComment;
      } catch (apiError) {
        console.error('Failed to create comment:', apiError);
        throw new Error('Failed to create comment. Please try again.');
      }
    }
  }

  /**
   * Get a comment by ID with content retrieval from IPFS if needed
   */
  static async getComment(id: string): Promise<QsocialComment> {
    if (!id || id.trim().length === 0) {
      throw new Error('Comment ID is required');
    }

    try {
      const comment = await CommentAPI.getComment(id);
      
      // If comment has IPFS hash, try to retrieve content from IPFS
      if (comment.ipfsHash && comment.ipfsHash !== '') {
        try {
          const retrievedContent = await this.retrieveCommentContentFromIPFS(comment);
          if (retrievedContent.verified) {
            // Use IPFS content if verification passes
            return {
              ...comment,
              content: retrievedContent.content
            };
          } else {
            console.warn(`[CommentService] Content verification failed for comment ${id}, using database content`);
          }
        } catch (ipfsError) {
          console.warn(`[CommentService] Failed to retrieve content from IPFS for comment ${id}, using database content:`, ipfsError);
        }
      }
      
      return comment;
    } catch (error) {
      console.error('Failed to get comment:', error);
      throw new Error('Failed to retrieve comment');
    }
  }

  /**
   * Retrieve comment content from IPFS
   */
  static async retrieveCommentContentFromIPFS(comment: QsocialComment): Promise<{
    content: string;
    verified: boolean;
  }> {
    if (!comment.ipfsHash) {
      throw new Error('Comment has no IPFS hash');
    }

    try {
      // Check if it's a fallback storage key
      if (comment.ipfsHash.startsWith('fallback:')) {
        const fallbackKey = comment.ipfsHash.replace('fallback:', '');
        const isEncrypted = comment.privacyLevel !== PrivacyLevel.PUBLIC;
        const result = await QsocialStorageService.retrieveFallbackContent(fallbackKey, isEncrypted);
        return {
          content: result.content,
          verified: result.verified
        };
      }

      // Determine if content is encrypted based on privacy level
      const isEncrypted = comment.privacyLevel !== PrivacyLevel.PUBLIC;
      const result = await QsocialStorageService.retrieveContent(comment.ipfsHash, isEncrypted);
      
      return {
        content: result.content,
        verified: result.verified
      };
    } catch (error) {
      console.error(`[CommentService] Error retrieving content from IPFS for comment ${comment.id}:`, error);
      throw error;
    }
  }

  /**
   * Update a comment with validation and sanitization
   */
  static async updateComment(id: string, updates: UpdateCommentRequest): Promise<QsocialComment> {
    if (!id || id.trim().length === 0) {
      throw new Error('Comment ID is required');
    }

    // Validate input data
    const validationResult = safeValidateUpdateCommentRequest(updates);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedUpdates = validationResult.data;

    // Additional validation
    if (validatedUpdates.content) {
      CommentValidator.validateContent(validatedUpdates.content);
    }

    // Sanitize content
    const sanitizedUpdates: UpdateCommentRequest = {
      ...validatedUpdates,
    };

    if (validatedUpdates.content) {
      sanitizedUpdates.content = ContentSanitizer.sanitizeHtml(validatedUpdates.content.trim());
    }

    try {
      return await CommentAPI.updateComment(id, sanitizedUpdates);
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw new Error('Failed to update comment. Please try again.');
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(id: string): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new Error('Comment ID is required');
    }

    try {
      await CommentAPI.deleteComment(id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw new Error('Failed to delete comment. Please try again.');
    }
  }

  /**
   * Get comments for a post with threading support
   */
  static async getPostComments(postId: string, options: CommentOptions = {}): Promise<QsocialComment[]> {
    if (!postId || postId.trim().length === 0) {
      throw new Error('Post ID is required');
    }

    // Validate options
    const validatedOptions = validateCommentOptions(options);

    try {
      // Get all comments for the post
      const allComments = await CommentAPI.getPostComments(postId, {
        ...validatedOptions,
        limit: 1000, // Get all comments first for proper threading
        offset: 0,
      });

      // Apply sorting
      let sortedComments = CommentThreadManager.sortComments(allComments, validatedOptions.sortBy || 'newest');

      // Filter by max depth if specified
      if (validatedOptions.maxDepth !== undefined) {
        sortedComments = CommentThreadManager.filterByMaxDepth(sortedComments, validatedOptions.maxDepth);
      }

      // Apply pagination
      const paginatedComments = CommentThreadManager.paginateComments(
        sortedComments,
        validatedOptions.limit || 20,
        validatedOptions.offset || 0
      );

      return paginatedComments;
    } catch (error) {
      console.error('Failed to get post comments:', error);
      throw new Error('Failed to retrieve comments');
    }
  }

  /**
   * Get comment thread (comment and all its replies)
   */
  static async getCommentThread(commentId: string): Promise<QsocialComment[]> {
    if (!commentId || commentId.trim().length === 0) {
      throw new Error('Comment ID is required');
    }

    try {
      return await CommentAPI.getCommentThread(commentId);
    } catch (error) {
      console.error('Failed to get comment thread:', error);
      throw new Error('Failed to retrieve comment thread');
    }
  }

  /**
   * Vote on a comment with validation
   */
  static async voteComment(commentId: string, vote: 'up' | 'down' | 'remove'): Promise<VoteResult> {
    if (!commentId || commentId.trim().length === 0) {
      throw new Error('Comment ID is required');
    }

    if (!['up', 'down', 'remove'].includes(vote)) {
      throw new Error('Invalid vote type');
    }

    try {
      return await CommentAPI.voteComment(commentId, vote);
    } catch (error) {
      console.error('Failed to vote on comment:', error);
      throw new Error('Failed to vote on comment. Please try again.');
    }
  }

  /**
   * Build threaded comment structure
   */
  static buildThreadedComments(comments: QsocialComment[]): QsocialComment[] {
    return CommentThreadManager.buildCommentTree(comments);
  }

  /**
   * Check if current user can edit comment
   */
  static async canEditComment(comment: QsocialComment): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // User can edit their own comments
    if (comment.authorId === identity.did) return true;

    // TODO: Check if user is moderator of subcommunity
    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Check if current user can delete comment
   */
  static async canDeleteComment(comment: QsocialComment): Promise<boolean> {
    const identity = getActiveIdentity();
    if (!identity) return false;

    // User can delete their own comments
    if (comment.authorId === identity.did) return true;

    // TODO: Check if user is moderator of subcommunity
    // TODO: Check if user has admin privileges

    return false;
  }

  /**
   * Get comment statistics
   */
  static getCommentStatistics(comment: QsocialComment) {
    const totalVotes = comment.upvotes + comment.downvotes;
    const score = comment.upvotes - comment.downvotes;
    const upvoteRatio = totalVotes > 0 ? comment.upvotes / totalVotes : 0;

    return {
      score,
      totalVotes,
      upvoteRatio,
      depth: comment.depth,
      hasReplies: comment.childrenIds.length > 0,
      replyCount: comment.childrenIds.length,
      isControversial: totalVotes > 5 && upvoteRatio > 0.4 && upvoteRatio < 0.6,
      isPopular: score > 5 && upvoteRatio > 0.7,
    };
  }

  /**
   * Format comment for display
   */
  static formatCommentForDisplay(comment: QsocialComment) {
    const stats = this.getCommentStatistics(comment);
    
    return {
      ...comment,
      stats,
      formattedCreatedAt: new Date(comment.createdAt).toLocaleString(),
      formattedUpdatedAt: new Date(comment.updatedAt).toLocaleString(),
      isEdited: comment.isEdited,
      canEdit: false, // Will be set by component
      canDelete: false, // Will be set by component
      indentLevel: Math.min(comment.depth, 5), // Limit visual indentation
    };
  }

  /**
   * Get comment ancestors (parent chain)
   */
  static async getCommentAncestors(commentId: string): Promise<QsocialComment[]> {
    const ancestors: QsocialComment[] = [];
    let currentComment: QsocialComment | null = null;

    try {
      currentComment = await this.getComment(commentId);
    } catch {
      return ancestors;
    }

    while (currentComment && currentComment.parentCommentId) {
      try {
        const parent = await this.getComment(currentComment.parentCommentId);
        ancestors.unshift(parent);
        currentComment = parent;
      } catch {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Count total replies in a comment thread
   */
  static countThreadReplies(comment: QsocialComment, allComments: QsocialComment[]): number {
    const commentMap = new Map<string, QsocialComment>();
    allComments.forEach(c => commentMap.set(c.id, c));

    let count = 0;
    const countReplies = (commentId: string) => {
      const c = commentMap.get(commentId);
      if (c) {
        count += c.childrenIds.length;
        c.childrenIds.forEach(countReplies);
      }
    };

    countReplies(comment.id);
    return count;
  }
}