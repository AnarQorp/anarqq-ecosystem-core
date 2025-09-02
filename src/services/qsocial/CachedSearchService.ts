/**
 * Cached Search Service
 * 
 * Extends the existing SearchService with caching capabilities for improved performance.
 * Implements intelligent cache invalidation for search results.
 */

import { getCacheService, CacheKeys, CacheTags, CacheTTL } from './CacheService';
import { getPerformanceService, PerformanceUtils } from './PerformanceMonitoringService';
import type { 
  QsocialPost,
  QsocialComment,
  SearchFilters,
  SearchResults,
  SearchResultItem
} from '../../types/qsocial';

export class CachedSearchService {
  private cache = getCacheService();
  private performance = getPerformanceService();

  /**
   * Perform full-text search with caching
   */
  async search(query: string, filters: SearchFilters = {}): Promise<SearchResults> {
    return PerformanceUtils.measureAsync(
      'search_service.search',
      async () => {
        const cacheKey = CacheKeys.search(query, filters);
        
        // Try to get from cache first
        let results = await this.cache.get<SearchResults>(cacheKey);
        
        if (results) {
          this.performance.recordCounter('cache_hit', 1, { type: 'search', operation: 'search' });
          return results;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'search', operation: 'search' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        results = await SearchService.search(query, filters);

        // Cache the result with search-specific TTL
        await this.cache.set(
          cacheKey,
          results,
          {
            ttl: CacheTTL.search,
            tags: [
              CacheTags.search,
              ...(filters.contentType ? [`search_${filters.contentType}`] : []),
              ...(filters.subcommunityId ? [CacheTags.subcommunity(filters.subcommunityId)] : []),
              ...(filters.authorId ? [CacheTags.user(filters.authorId)] : [])
            ]
          }
        );

        return results;
      },
      { 
        operation: 'search', 
        query: query.substring(0, 50), // Truncate for logging
        filters: JSON.stringify(filters) 
      }
    );
  }

  /**
   * Search specifically for posts with caching
   */
  async searchPosts(query: string, filters: Omit<SearchFilters, 'contentType') = {}): Promise<QsocialPost[]> {
    return PerformanceUtils.measureAsync(
      'search_service.search_posts',
      async () => {
        const cacheKey = CacheKeys.search(query, { ...filters, contentType: 'posts' });
        
        // Try to get from cache first
        let posts = await this.cache.get<QsocialPost[]>(cacheKey);
        
        if (posts) {
          this.performance.recordCounter('cache_hit', 1, { type: 'search_posts', operation: 'search' });
          return posts;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'search_posts', operation: 'search' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        posts = await SearchService.searchPosts(query, filters);

        // Cache the result
        await this.cache.set(
          cacheKey,
          posts,
          {
            ttl: CacheTTL.search,
            tags: [
              CacheTags.search,
              'search_posts',
              ...(filters.subcommunityId ? [CacheTags.subcommunity(filters.subcommunityId)] : []),
              ...(filters.authorId ? [CacheTags.user(filters.authorId)] : [])
            ]
          }
        );

        return posts;
      },
      { 
        operation: 'search_posts', 
        query: query.substring(0, 50),
        filters: JSON.stringify(filters) 
      }
    );
  }

  /**
   * Search specifically for comments with caching
   */
  async searchComments(query: string, filters: Omit<SearchFilters, 'contentType') = {}): Promise<QsocialComment[]> {
    return PerformanceUtils.measureAsync(
      'search_service.search_comments',
      async () => {
        const cacheKey = CacheKeys.search(query, { ...filters, contentType: 'comments' });
        
        // Try to get from cache first
        let comments = await this.cache.get<QsocialComment[]>(cacheKey);
        
        if (comments) {
          this.performance.recordCounter('cache_hit', 1, { type: 'search_comments', operation: 'search' });
          return comments;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'search_comments', operation: 'search' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        comments = await SearchService.searchComments(query, filters);

        // Cache the result
        await this.cache.set(
          cacheKey,
          comments,
          {
            ttl: CacheTTL.search,
            tags: [
              CacheTags.search,
              'search_comments',
              ...(filters.subcommunityId ? [CacheTags.subcommunity(filters.subcommunityId)] : []),
              ...(filters.authorId ? [CacheTags.user(filters.authorId)] : [])
            ]
          }
        );

        return comments;
      },
      { 
        operation: 'search_comments', 
        query: query.substring(0, 50),
        filters: JSON.stringify(filters) 
      }
    );
  }

  /**
   * Get trending content with caching
   */
  async getTrendingContent(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day', 
    limit: number = 20
  ): Promise<SearchResultItem[]> {
    return PerformanceUtils.measureAsync(
      'search_service.get_trending_content',
      async () => {
        const cacheKey = CacheKeys.trending(timeRange, limit);
        
        // Try to get from cache first
        let trending = await this.cache.get<SearchResultItem[]>(cacheKey);
        
        if (trending) {
          this.performance.recordCounter('cache_hit', 1, { type: 'trending', operation: 'get' });
          return trending;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'trending', operation: 'get' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        trending = await SearchService.getTrendingContent(timeRange, limit);

        // Cache the result with trending-specific TTL
        await this.cache.set(
          cacheKey,
          trending,
          {
            ttl: CacheTTL.trending,
            tags: [CacheTags.search, 'trending']
          }
        );

        return trending;
      },
      { operation: 'get_trending', timeRange, limit: limit.toString() }
    );
  }

  /**
   * Get content recommendations with caching
   */
  async getRecommendations(limit: number = 20): Promise<SearchResultItem[]> {
    return PerformanceUtils.measureAsync(
      'search_service.get_recommendations',
      async () => {
        // Get current user ID for personalized caching
        const { getActiveIdentity } = await import('../../state/identity');
        const identity = getActiveIdentity();
        const userId = identity?.did || 'anonymous';
        
        const cacheKey = CacheKeys.recommendations(userId, 'general');
        
        // Try to get from cache first
        let recommendations = await this.cache.get<SearchResultItem[]>(cacheKey);
        
        if (recommendations) {
          this.performance.recordCounter('cache_hit', 1, { type: 'recommendations', operation: 'get' });
          return recommendations;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'recommendations', operation: 'get' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        recommendations = await SearchService.getRecommendations(limit);

        // Cache the result with recommendations-specific TTL
        await this.cache.set(
          cacheKey,
          recommendations,
          {
            ttl: CacheTTL.recommendations,
            tags: [
              CacheTags.recommendations,
              CacheTags.user(userId)
            ]
          }
        );

        return recommendations;
      },
      { operation: 'get_recommendations', limit: limit.toString() }
    );
  }

  /**
   * Get user-specific recommendations with caching
   */
  async getUserRecommendations(userId: string, limit: number = 20): Promise<SearchResultItem[]> {
    return PerformanceUtils.measureAsync(
      'search_service.get_user_recommendations',
      async () => {
        const cacheKey = CacheKeys.recommendations(userId, 'user_specific');
        
        // Try to get from cache first
        let recommendations = await this.cache.get<SearchResultItem[]>(cacheKey);
        
        if (recommendations) {
          this.performance.recordCounter('cache_hit', 1, { type: 'user_recommendations', operation: 'get' });
          return recommendations;
        }

        this.performance.recordCounter('cache_miss', 1, { type: 'user_recommendations', operation: 'get' });

        // Fetch from API if not in cache
        const { SearchService } = await import('../../api/qsocial');
        recommendations = await SearchService.getUserRecommendations(userId, limit);

        // Cache the result
        await this.cache.set(
          cacheKey,
          recommendations,
          {
            ttl: CacheTTL.recommendations,
            tags: [
              CacheTags.recommendations,
              CacheTags.user(userId)
            ]
          }
        );

        return recommendations;
      },
      { operation: 'get_user_recommendations', userId, limit: limit.toString() }
    );
  }

  /**
   * Preload popular search queries
   */
  async preloadPopularSearches(queries: string[]): Promise<void> {
    return PerformanceUtils.measureAsync(
      'search_service.preload_popular_searches',
      async () => {
        const preloadPromises = queries.map(async (query) => {
          try {
            // Preload basic search
            await this.search(query, { limit: 20 });
            
            // Preload post-specific search
            await this.searchPosts(query, { limit: 10 });
            
            // Preload comment-specific search
            await this.searchComments(query, { limit: 10 });
          } catch (error) {
            console.warn(`Failed to preload search for query "${query}":`, error);
          }
        });

        await Promise.all(preloadPromises);
      },
      { operation: 'preload_searches', count: queries.length.toString() }
    );
  }

  /**
   * Warm up search cache with trending and popular content
   */
  async warmupSearchCache(): Promise<void> {
    return PerformanceUtils.measureAsync(
      'search_service.warmup_cache',
      async () => {
        try {
          // Warm up trending content for different time ranges
          await Promise.all([
            this.getTrendingContent('hour', 10),
            this.getTrendingContent('day', 20),
            this.getTrendingContent('week', 15),
            this.getTrendingContent('month', 10)
          ]);

          // Warm up recommendations
          await this.getRecommendations(20);

          // Preload some common search terms
          const commonSearches = [
            'announcement',
            'discussion',
            'help',
            'question',
            'update',
            'news'
          ];
          
          await this.preloadPopularSearches(commonSearches);
          
          console.log('Search cache warmup completed successfully');
        } catch (error) {
          console.error('Search cache warmup failed:', error);
        }
      },
      { operation: 'warmup' }
    );
  }

  /**
   * Invalidate search caches when content changes
   */
  async invalidateSearchCaches(options: {
    contentType?: 'posts' | 'comments';
    subcommunityId?: string;
    authorId?: string;
    tags?: string[];
  } = {}): Promise<void> {
    const { contentType, subcommunityId, authorId } = options;
    
    // Invalidate general search cache
    await this.cache.invalidateByTag(CacheTags.search);
    
    // Invalidate content-type specific caches
    if (contentType) {
      await this.cache.invalidateByTag(`search_${contentType}`);
    }
    
    // Invalidate subcommunity-specific caches
    if (subcommunityId) {
      await this.cache.invalidateByTag(CacheTags.subcommunity(subcommunityId));
    }
    
    // Invalidate user-specific caches
    if (authorId) {
      await this.cache.invalidateByTag(CacheTags.user(authorId));
    }
    
    // Invalidate trending and recommendations
    await this.cache.invalidateByTag('trending');
    await this.cache.invalidateByTag(CacheTags.recommendations);
  }

  /**
   * Get search cache statistics
   */
  async getCacheStats(): Promise<any> {
    const stats = await this.cache.getStats();
    
    // Add search-specific cache metrics
    const searchKeys = await this.cache.keys('search:*');
    const trendingKeys = await this.cache.keys('trending:*');
    const recommendationKeys = await this.cache.keys('recommendations:*');
    
    return {
      ...stats,
      breakdown: {
        searches: searchKeys.length,
        trending: trendingKeys.length,
        recommendations: recommendationKeys.length
      }
    };
  }

  /**
   * Clear all search caches
   */
  async clearSearchCache(): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.search);
    await this.cache.invalidateByTag('trending');
    await this.cache.invalidateByTag(CacheTags.recommendations);
  }

  /**
   * Get cached search suggestions (for autocomplete)
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    const cacheKey = `search_suggestions:${query}:${limit}`;
    
    // Try to get from cache first
    let suggestions = await this.cache.get<string[]>(cacheKey);
    
    if (suggestions) {
      this.performance.recordCounter('cache_hit', 1, { type: 'search_suggestions', operation: 'get' });
      return suggestions;
    }

    this.performance.recordCounter('cache_miss', 1, { type: 'search_suggestions', operation: 'get' });

    // Generate suggestions based on cached search results
    const searchResults = await this.search(query, { limit: limit * 2 });
    
    // Extract unique terms from search results
    const terms = new Set<string>();
    
    searchResults.results.forEach(result => {
      if (result.type === 'post') {
        const post = result.data as QsocialPost;
        post.title.split(' ').forEach(word => {
          if (word.toLowerCase().includes(query.toLowerCase()) && word.length > 2) {
            terms.add(word.toLowerCase());
          }
        });
        post.tags?.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            terms.add(tag.toLowerCase());
          }
        });
      }
    });

    suggestions = Array.from(terms).slice(0, limit);

    // Cache suggestions for a short time
    await this.cache.set(
      cacheKey,
      suggestions,
      {
        ttl: CacheTTL.short,
        tags: [CacheTags.search, 'search_suggestions']
      }
    );

    return suggestions;
  }
}

// Singleton instance
let cachedSearchServiceInstance: CachedSearchService | null = null;

export function getCachedSearchService(): CachedSearchService {
  if (!cachedSearchServiceInstance) {
    cachedSearchServiceInstance = new CachedSearchService();
  }
  return cachedSearchServiceInstance;
}