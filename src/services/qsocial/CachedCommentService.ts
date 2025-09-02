/**
 * Cached Comment Service
 * 
 * Extends the existing CommentService with caching capabilities for improved performance.
 * Implements cache invalidation strategies for real-time updates.
 */

import { getCacheService, CacheKeys, CacheTags, CacheTTL } from './CacheService';
import { getPerformanceService, PerformanceUtils } from './PerformanceMonitoringService';
import type { 
  QsocialComment, 
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentOptions,
  VoteResult
} from '../../types/qsocial';

export class CachedCommentService {
  private cache = getCacheService();
  private performance = getPerformanceService();

  /**
   * Create a new comment with cache invalidation
   */
  async createComment(comment: CreateCommentRequest): Promise<QsocialComment> {
    return PerformanceUtils.measureAsync(
      'comment_service.create_comment',
      async () => {
        const { CommentService } = await import('../../api/qsocial');
        
        const createdComment = await CommentService.createComment(comment);
        
        // Cache the new comment
        await this.cache.set(
          CacheKeys.comment(createdComment.id),
          createdComment,
          {
            ttl: CacheTTL.comments,
            tags: [
              CacheTags.comments,
              CacheTags.comment(createdComment.id),
              CacheTags.post(createdComment.postId),
              CacheTags.user(createdComment.authorId)
            ]
          }
        );

        // Invalidate related caches
        await this.invalidateCommentCreationCaches(createdComment);

        return createdComment;
      },
      { operation: 'create', postId: comment.postId }
    );
  }

  /**
   * Get a comment by ID with caching
   */
  async getComment(id: string): Promise<QsocialComment> {
    return PerformanceUtils.measureAsync(
      'comment_service.get_comment',
      async () => {
        const cacheKey = CacheKeys.comment(id);
        
        // Try to get from cache first
        let comment = await this.cache.get<QsocialComment>(cacheKey);
        
        if (comment) {
          this.performance.recordCounter('cache_hit', 1, { type: 'comment', operation: 'get' });
          return comment;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'comment', operation: 'get' });

        // Fetch from API if not in cache
        const { CommentService } = await import('../../api/qsocial');
        comment = await CommentService.getComment(id);

        // Cache the result
        await this.cache.set(
          cacheKey,
          comment,
          {
            ttl: CacheTTL.comments,
            tags: [
              CacheTags.comments,
              CacheTags.comment(comment.id),
              CacheTags.post(comment.postId),
              CacheTags.user(comment.authorId)
            ]
          }
        );

        return comment;
      },
      { operation: 'get', commentId: id }
    );
  }

  /**
   * Update a comment with cache invalidation
   */
  async updateComment(id: string, updates: UpdateCommentRequest): Promise<QsocialComment> {
    return PerformanceUtils.measureAsync(
      'comment_service.update_comment',
      async () => {
        const { CommentService } = await import('../../api/qsocial');
        
        const updatedComment = await CommentService.updateComment(id, updates);

        // Update cache
        await this.cache.set(
          CacheKeys.comment(updatedComment.id),
          updatedComment,
          {
            ttl: CacheTTL.comments,
            tags: [
              CacheTags.comments,
              CacheTags.comment(updatedComment.id),
              CacheTags.post(updatedComment.postId),
              CacheTags.user(updatedComment.authorId)
            ]
          }
        );

        // Invalidate related caches
        await this.invalidateCommentUpdateCaches(updatedComment);

        return updatedComment;
      },
      { operation: 'update', commentId: id }
    );
  }

  /**
   * Delete a comment with cache invalidation
   */
  async deleteComment(id: string): Promise<void> {
    return PerformanceUtils.measureAsync(
      'comment_service.delete_comment',
      async () => {
        // Get the comment before deletion for cache invalidation
        const comment = await this.getComment(id);
        
        const { CommentService } = await import('../../api/qsocial');
        await CommentService.deleteComment(id);

        // Remove from cache
        await this.cache.delete(CacheKeys.comment(id));

        // Invalidate related caches
        await this.invalidateCommentDeletionCaches(comment);
      },
      { operation: 'delete', commentId: id }
    );
  }

  /**
   * Get comments for a post with caching
   */
  async getPostComments(postId: string, options: CommentOptions = {}): Promise<QsocialComment[]> {
    return PerformanceUtils.measureAsync(
      'comment_service.get_post_comments',
      async () => {
        const cacheKey = CacheKeys.comments(postId, options);
        
        // Try to get from cache first
        let comments = await this.cache.get<QsocialComment[]>(cacheKey);
        
        if (comments) {
          this.performance.recordCounter('cache_hit', 1, { type: 'post_comments', operation: 'get' });
          return comments;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'post_comments', operation: 'get' });

        // Fetch from API if not in cache
        const { CommentService } = await import('../../api/qsocial');
        comments = await CommentService.getPostComments(postId, options);

        // Cache the result
        await this.cache.set(
          cacheKey,
          comments,
          {
            ttl: CacheTTL.comments,
            tags: [
              CacheTags.comments,
              CacheTags.post(postId)
            ]
          }
        );

        // Also cache individual comments
        for (const comment of comments) {
          await this.cache.set(
            CacheKeys.comment(comment.id),
            comment,
            {
              ttl: CacheTTL.comments,
              tags: [
                CacheTags.comments,
                CacheTags.comment(comment.id),
                CacheTags.post(comment.postId),
                CacheTags.user(comment.authorId)
              ]
            }
          );
        }

        return comments;
      },
      { operation: 'get_post_comments', postId, options: JSON.stringify(options) }
    );
  }

  /**
   * Get comment thread with caching
   */
  async getCommentThread(commentId: string): Promise<QsocialComment[]> {
    return PerformanceUtils.measureAsync(
      'comment_service.get_comment_thread',
      async () => {
        const cacheKey = `comment_thread:${commentId}`;
        
        // Try to get from cache first
        let comments = await this.cache.get<QsocialComment[]>(cacheKey);
        
        if (comments) {
          this.performance.recordCounter('cache_hit', 1, { type: 'comment_thread', operation: 'get' });
          return comments;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'comment_thread', operation: 'get' });

        // Fetch from API if not in cache
        const { CommentService } = await import('../../api/qsocial');
        comments = await CommentService.getCommentThread(commentId);

        // Cache the result
        await this.cache.set(
          cacheKey,
          comments,
          {
            ttl: CacheTTL.comments,
            tags: [
              CacheTags.comments,
              CacheTags.comment(commentId)
            ]
          }
        );

        // Also cache individual comments
        for (const comment of comments) {
          await this.cache.set(
            CacheKeys.comment(comment.id),
            comment,
            {
              ttl: CacheTTL.comments,
              tags: [
                CacheTags.comments,
                CacheTags.comment(comment.id),
                CacheTags.post(comment.postId),
                CacheTags.user(comment.authorId)
              ]
            }
          );
        }

        return comments;
      },
      { operation: 'get_comment_thread', commentId }
    );
  }

  /**
   * Vote on a comment with cache invalidation
   */
  async voteComment(commentId: string, vote: 'up' | 'down' | 'remove'): Promise<VoteResult> {
    return PerformanceUtils.measureAsync(
      'comment_service.vote_comment',
      async () => {
        const { CommentService } = await import('../../api/qsocial');
        
        const voteResult = await CommentService.voteComment(commentId, vote);

        // Invalidate comment cache to reflect new vote counts
        await this.cache.delete(CacheKeys.comment(commentId));

        // Invalidate related caches
        await this.cache.invalidateByTag(CacheTags.comment(commentId));
        await this.cache.invalidateByTag(CacheTags.votes);

        return voteResult;
      },
      { operation: 'vote', commentId, vote }
    );
  }

  /**
   * Preload comments into cache
   */
  async preloadComments(commentIds: string[]): Promise<void> {
    return PerformanceUtils.measureAsync(
      'comment_service.preload_comments',
      async () => {
        const { CommentService } = await import('../../api/qsocial');
        
        // Check which comments are not in cache
        const uncachedIds: string[] = [];
        
        for (const id of commentIds) {
          const exists = await this.cache.exists(CacheKeys.comment(id));
          if (!exists) {
            uncachedIds.push(id);
          }
        }

        // Fetch uncached comments in parallel
        const fetchPromises = uncachedIds.map(async (id) => {
          try {
            const comment = await CommentService.getComment(id);
            await this.cache.set(
              CacheKeys.comment(id),
              comment,
              {
                ttl: CacheTTL.comments,
                tags: [
                  CacheTags.comments,
                  CacheTags.comment(comment.id),
                  CacheTags.post(comment.postId),
                  CacheTags.user(comment.authorId)
                ]
              }
            );
          } catch (error) {
            console.warn(`Failed to preload comment ${id}:`, error);
          }
        });

        await Promise.all(fetchPromises);
      },
      { operation: 'preload', count: commentIds.length.toString() }
    );
  }

  /**
   * Get cached comments by post ID (without API call)
   */
  async getCachedPostComments(postId: string): Promise<QsocialComment[] | null> {
    const cacheKey = CacheKeys.comments(postId, {});
    return this.cache.get<QsocialComment[]>(cacheKey);
  }

  /**
   * Invalidate all comment caches for a specific post
   */
  async invalidatePostComments(postId: string): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.post(postId));
  }

  /**
   * Get cache statistics for comments
   */
  async getCacheStats(): Promise<any> {
    const stats = await this.cache.getStats();
    
    // Add comment-specific cache metrics
    const commentKeys = await this.cache.keys('comment:*');
    const commentListKeys = await this.cache.keys('comments:*');
    const threadKeys = await this.cache.keys('comment_thread:*');
    
    return {
      ...stats,
      breakdown: {
        comments: commentKeys.length,
        commentLists: commentListKeys.length,
        threads: threadKeys.length
      }
    };
  }

  private async invalidateCommentCreationCaches(comment: QsocialComment): Promise<void> {
    // Invalidate post-specific comment caches
    await this.cache.invalidateByTag(CacheTags.post(comment.postId));
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(comment.authorId));
    
    // Invalidate parent comment thread if this is a reply
    if (comment.parentCommentId) {
      await this.cache.invalidateByTag(CacheTags.comment(comment.parentCommentId));
    }
    
    // Invalidate search caches
    await this.cache.invalidateByTag(CacheTags.search);
  }

  private async invalidateCommentUpdateCaches(comment: QsocialComment): Promise<void> {
    // Invalidate the specific comment cache
    await this.cache.invalidateByTag(CacheTags.comment(comment.id));
    
    // Invalidate post-specific comment caches
    await this.cache.invalidateByTag(CacheTags.post(comment.postId));
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(comment.authorId));
    
    // Invalidate search caches
    await this.cache.invalidateByTag(CacheTags.search);
  }

  private async invalidateCommentDeletionCaches(comment: QsocialComment): Promise<void> {
    // Invalidate all caches related to this comment
    await this.cache.invalidateByTag(CacheTags.comment(comment.id));
    
    // Invalidate post-specific comment caches
    await this.cache.invalidateByTag(CacheTags.post(comment.postId));
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(comment.authorId));
    
    // Invalidate parent comment thread if this was a reply
    if (comment.parentCommentId) {
      await this.cache.invalidateByTag(CacheTags.comment(comment.parentCommentId));
    }
    
    // Invalidate search caches
    await this.cache.invalidateByTag(CacheTags.search);
  }
}

// Singleton instance
let cachedCommentServiceInstance: CachedCommentService | null = null;

export function getCachedCommentService(): CachedCommentService {
  if (!cachedCommentServiceInstance) {
    cachedCommentServiceInstance = new CachedCommentService();
  }
  return cachedCommentServiceInstance;
}