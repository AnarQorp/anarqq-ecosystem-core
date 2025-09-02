/**
 * Cached Post Service
 * 
 * Extends the existing PostService with caching capabilities for improved performance.
 * Implements cache invalidation strategies for real-time updates.
 */

import { getCacheService, CacheKeys, CacheTags, CacheTTL } from './CacheService';
import { getPerformanceService, PerformanceUtils } from './PerformanceMonitoringService';
import type { 
  QsocialPost, 
  CreatePostRequest,
  UpdatePostRequest,
  FeedOptions,
  VoteResult,
  CrossPostOptions
} from '../../types/qsocial';

export class CachedPostService {
  private cache = getCacheService();
  private performance = getPerformanceService();

  /**
   * Create a new post with cache invalidation
   */
  async createPost(post: CreatePostRequest): Promise<QsocialPost> {
    return PerformanceUtils.measureAsync(
      'post_service.create_post',
      async () => {
        // Import the actual PostService dynamically to avoid circular dependencies
        const { PostService } = await import('../../api/qsocial');
        
        const createdPost = await PostService.createPost(post);
        
        // Cache the new post
        await this.cache.set(
          CacheKeys.post(createdPost.id),
          createdPost,
          {
            ttl: CacheTTL.posts,
            tags: [
              CacheTags.posts,
              CacheTags.post(createdPost.id),
              CacheTags.user(createdPost.authorId),
              ...(createdPost.subcommunityId ? [CacheTags.subcommunity(createdPost.subcommunityId)] : [])
            ]
          }
        );

        // Invalidate related caches
        await this.invalidatePostCreationCaches(createdPost);

        return createdPost;
      },
      { operation: 'create' }
    );
  }

  /**
   * Get a post by ID with caching
   */
  async getPost(id: string): Promise<QsocialPost> {
    return PerformanceUtils.measureAsync(
      'post_service.get_post',
      async () => {
        const cacheKey = CacheKeys.post(id);
        
        // Try to get from cache first
        let post = await this.cache.get<QsocialPost>(cacheKey);
        
        if (post) {
          this.performance.recordCounter('cache_hit', 1, { type: 'post', operation: 'get' });
          return post;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'post', operation: 'get' });

        // Fetch from API if not in cache
        const { PostService } = await import('../../api/qsocial');
        post = await PostService.getPost(id);

        // Cache the result
        await this.cache.set(
          cacheKey,
          post,
          {
            ttl: CacheTTL.posts,
            tags: [
              CacheTags.posts,
              CacheTags.post(post.id),
              CacheTags.user(post.authorId),
              ...(post.subcommunityId ? [CacheTags.subcommunity(post.subcommunityId)] : [])
            ]
          }
        );

        return post;
      },
      { operation: 'get', postId: id }
    );
  }

  /**
   * Update a post with cache invalidation
   */
  async updatePost(id: string, updates: UpdatePostRequest): Promise<QsocialPost> {
    return PerformanceUtils.measureAsync(
      'post_service.update_post',
      async () => {
        const { PostService } = await import('../../api/qsocial');
        
        const updatedPost = await PostService.updatePost(id, updates);

        // Update cache
        await this.cache.set(
          CacheKeys.post(updatedPost.id),
          updatedPost,
          {
            ttl: CacheTTL.posts,
            tags: [
              CacheTags.posts,
              CacheTags.post(updatedPost.id),
              CacheTags.user(updatedPost.authorId),
              ...(updatedPost.subcommunityId ? [CacheTags.subcommunity(updatedPost.subcommunityId)] : [])
            ]
          }
        );

        // Invalidate related caches
        await this.invalidatePostUpdateCaches(updatedPost);

        return updatedPost;
      },
      { operation: 'update', postId: id }
    );
  }

  /**
   * Delete a post with cache invalidation
   */
  async deletePost(id: string): Promise<void> {
    return PerformanceUtils.measureAsync(
      'post_service.delete_post',
      async () => {
        // Get the post before deletion for cache invalidation
        const post = await this.getPost(id);
        
        const { PostService } = await import('../../api/qsocial');
        await PostService.deletePost(id);

        // Remove from cache
        await this.cache.delete(CacheKeys.post(id));

        // Invalidate related caches
        await this.invalidatePostDeletionCaches(post);
      },
      { operation: 'delete', postId: id }
    );
  }

  /**
   * Get main feed with caching
   */
  async getFeed(options: FeedOptions = {}): Promise<QsocialPost[]> {
    return PerformanceUtils.measureAsync(
      'post_service.get_feed',
      async () => {
        const cacheKey = CacheKeys.feed('global', options);
        
        // Try to get from cache first
        let posts = await this.cache.get<QsocialPost[]>(cacheKey);
        
        if (posts) {
          this.performance.recordCounter('cache_hit', 1, { type: 'feed', operation: 'get' });
          return posts;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'feed', operation: 'get' });

        // Fetch from API if not in cache
        const { PostService } = await import('../../api/qsocial');
        posts = await PostService.getFeed(options);

        // Cache the result with shorter TTL for feeds
        await this.cache.set(
          cacheKey,
          posts,
          {
            ttl: CacheTTL.feeds,
            tags: [CacheTags.feeds, CacheTags.posts]
          }
        );

        return posts;
      },
      { operation: 'get_feed', options: JSON.stringify(options) }
    );
  }

  /**
   * Get subcommunity feed with caching
   */
  async getSubcommunityFeed(subcommunityId: string, options: FeedOptions = {}): Promise<QsocialPost[]> {
    return PerformanceUtils.measureAsync(
      'post_service.get_subcommunity_feed',
      async () => {
        const cacheKey = CacheKeys.subcommunityFeed(subcommunityId, options);
        
        // Try to get from cache first
        let posts = await this.cache.get<QsocialPost[]>(cacheKey);
        
        if (posts) {
          this.performance.recordCounter('cache_hit', 1, { type: 'subcommunity_feed', operation: 'get' });
          return posts;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'subcommunity_feed', operation: 'get' });

        // Fetch from API if not in cache
        const { PostService } = await import('../../api/qsocial');
        posts = await PostService.getSubcommunityFeed(subcommunityId, options);

        // Cache the result
        await this.cache.set(
          cacheKey,
          posts,
          {
            ttl: CacheTTL.feeds,
            tags: [
              CacheTags.feeds,
              CacheTags.posts,
              CacheTags.subcommunity(subcommunityId)
            ]
          }
        );

        return posts;
      },
      { operation: 'get_subcommunity_feed', subcommunityId, options: JSON.stringify(options) }
    );
  }

  /**
   * Get user posts with caching
   */
  async getUserPosts(userId: string, options: FeedOptions = {}): Promise<QsocialPost[]> {
    return PerformanceUtils.measureAsync(
      'post_service.get_user_posts',
      async () => {
        const cacheKey = CacheKeys.userPosts(userId, options);
        
        // Try to get from cache first
        let posts = await this.cache.get<QsocialPost[]>(cacheKey);
        
        if (posts) {
          this.performance.recordCounter('cache_hit', 1, { type: 'user_posts', operation: 'get' });
          return posts;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'user_posts', operation: 'get' });

        // Fetch from API if not in cache
        const { PostService } = await import('../../api/qsocial');
        posts = await PostService.getUserPosts(userId, options);

        // Cache the result
        await this.cache.set(
          cacheKey,
          posts,
          {
            ttl: CacheTTL.posts,
            tags: [
              CacheTags.posts,
              CacheTags.user(userId)
            ]
          }
        );

        return posts;
      },
      { operation: 'get_user_posts', userId, options: JSON.stringify(options) }
    );
  }

  /**
   * Create cross-post with caching
   */
  async createCrossPost(sourceModule: string, sourceId: string, options: CrossPostOptions): Promise<QsocialPost> {
    return PerformanceUtils.measureAsync(
      'post_service.create_cross_post',
      async () => {
        const { PostService } = await import('../../api/qsocial');
        
        const crossPost = await PostService.createCrossPost(sourceModule, sourceId, options);

        // Cache the new cross-post
        await this.cache.set(
          CacheKeys.post(crossPost.id),
          crossPost,
          {
            ttl: CacheTTL.posts,
            tags: [
              CacheTags.posts,
              CacheTags.post(crossPost.id),
              CacheTags.user(crossPost.authorId),
              ...(crossPost.subcommunityId ? [CacheTags.subcommunity(crossPost.subcommunityId)] : [])
            ]
          }
        );

        // Cache cross-post mapping
        await this.cache.set(
          CacheKeys.crossPost(sourceModule, sourceId),
          crossPost,
          {
            ttl: CacheTTL.posts,
            tags: [CacheTags.posts]
          }
        );

        // Invalidate related caches
        await this.invalidatePostCreationCaches(crossPost);

        return crossPost;
      },
      { operation: 'create_cross_post', sourceModule, sourceId }
    );
  }

  /**
   * Vote on a post with cache invalidation
   */
  async votePost(postId: string, vote: 'up' | 'down' | 'remove'): Promise<VoteResult> {
    return PerformanceUtils.measureAsync(
      'post_service.vote_post',
      async () => {
        const { PostService } = await import('../../api/qsocial');
        
        const voteResult = await PostService.votePost(postId, vote);

        // Invalidate post cache to reflect new vote counts
        await this.cache.delete(CacheKeys.post(postId));

        // Invalidate related caches
        await this.cache.invalidateByTag(CacheTags.post(postId));
        await this.cache.invalidateByTag(CacheTags.feeds);
        await this.cache.invalidateByTag(CacheTags.votes);

        return voteResult;
      },
      { operation: 'vote', postId, vote }
    );
  }

  /**
   * Preload posts into cache
   */
  async preloadPosts(postIds: string[]): Promise<void> {
    return PerformanceUtils.measureAsync(
      'post_service.preload_posts',
      async () => {
        const { PostService } = await import('../../api/qsocial');
        
        // Check which posts are not in cache
        const uncachedIds: string[] = [];
        
        for (const id of postIds) {
          const exists = await this.cache.exists(CacheKeys.post(id));
          if (!exists) {
            uncachedIds.push(id);
          }
        }

        // Fetch uncached posts in parallel
        const fetchPromises = uncachedIds.map(async (id) => {
          try {
            const post = await PostService.getPost(id);
            await this.cache.set(
              CacheKeys.post(id),
              post,
              {
                ttl: CacheTTL.posts,
                tags: [
                  CacheTags.posts,
                  CacheTags.post(post.id),
                  CacheTags.user(post.authorId),
                  ...(post.subcommunityId ? [CacheTags.subcommunity(post.subcommunityId)] : [])
                ]
              }
            );
          } catch (error) {
            console.warn(`Failed to preload post ${id}:`, error);
          }
        });

        await Promise.all(fetchPromises);
      },
      { operation: 'preload', count: postIds.length.toString() }
    );
  }

  /**
   * Warm up cache with popular content
   */
  async warmupCache(): Promise<void> {
    return PerformanceUtils.measureAsync(
      'post_service.warmup_cache',
      async () => {
        try {
          // Warm up main feed
          await this.getFeed({ limit: 50, sortBy: 'hot' });
          await this.getFeed({ limit: 50, sortBy: 'new' });
          await this.getFeed({ limit: 50, sortBy: 'top' });

          // Warm up trending content
          const { SearchService } = await import('../../api/qsocial');
          await SearchService.getTrendingContent('day', 20);
          
          console.log('Cache warmup completed successfully');
        } catch (error) {
          console.error('Cache warmup failed:', error);
        }
      },
      { operation: 'warmup' }
    );
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    const stats = await this.cache.getStats();
    
    // Add post-specific cache metrics
    const postKeys = await this.cache.keys('post:*');
    const feedKeys = await this.cache.keys('feed:*');
    const userPostKeys = await this.cache.keys('user_posts:*');
    
    return {
      ...stats,
      breakdown: {
        posts: postKeys.length,
        feeds: feedKeys.length,
        userPosts: userPostKeys.length
      }
    };
  }

  private async invalidatePostCreationCaches(post: QsocialPost): Promise<void> {
    // Invalidate feeds
    await this.cache.invalidateByTag(CacheTags.feeds);
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(post.authorId));
    
    // Invalidate subcommunity caches
    if (post.subcommunityId) {
      await this.cache.invalidateByTag(CacheTags.subcommunity(post.subcommunityId));
    }
    
    // Invalidate search and recommendation caches
    await this.cache.invalidateByTag(CacheTags.search);
    await this.cache.invalidateByTag(CacheTags.recommendations);
  }

  private async invalidatePostUpdateCaches(post: QsocialPost): Promise<void> {
    // Invalidate the specific post cache
    await this.cache.invalidateByTag(CacheTags.post(post.id));
    
    // Invalidate feeds that might contain this post
    await this.cache.invalidateByTag(CacheTags.feeds);
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(post.authorId));
    
    // Invalidate subcommunity caches
    if (post.subcommunityId) {
      await this.cache.invalidateByTag(CacheTags.subcommunity(post.subcommunityId));
    }
    
    // Invalidate search caches
    await this.cache.invalidateByTag(CacheTags.search);
  }

  private async invalidatePostDeletionCaches(post: QsocialPost): Promise<void> {
    // Invalidate all caches related to this post
    await this.cache.invalidateByTag(CacheTags.post(post.id));
    
    // Invalidate feeds
    await this.cache.invalidateByTag(CacheTags.feeds);
    
    // Invalidate user-specific caches
    await this.cache.invalidateByTag(CacheTags.user(post.authorId));
    
    // Invalidate subcommunity caches
    if (post.subcommunityId) {
      await this.cache.invalidateByTag(CacheTags.subcommunity(post.subcommunityId));
    }
    
    // Invalidate search and recommendation caches
    await this.cache.invalidateByTag(CacheTags.search);
    await this.cache.invalidateByTag(CacheTags.recommendations);
  }
}

// Singleton instance
let cachedPostServiceInstance: CachedPostService | null = null;

export function getCachedPostService(): CachedPostService {
  if (!cachedPostServiceInstance) {
    cachedPostServiceInstance = new CachedPostService();
  }
  return cachedPostServiceInstance;
}