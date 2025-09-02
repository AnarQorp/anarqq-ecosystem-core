/**
 * Cache Invalidation Service
 * 
 * Handles intelligent cache invalidation for real-time updates in the Qsocial platform.
 * Coordinates with WebSocket events and other real-time mechanisms.
 */

import { getCacheService, CacheTags, CacheInvalidationEvent } from './CacheService';
import { getPerformanceService } from './PerformanceMonitoringService';

export interface InvalidationRule {
  event: string;
  tags: string[];
  patterns?: string[];
  condition?: (data: any) => boolean;
}

export interface InvalidationEvent {
  type: 'post_created' | 'post_updated' | 'post_deleted' | 'post_voted' |
        'comment_created' | 'comment_updated' | 'comment_deleted' | 'comment_voted' |
        'subcommunity_created' | 'subcommunity_updated' | 'subcommunity_deleted' |
        'user_reputation_updated' | 'moderation_action' | 'real_time_update';
  data: any;
  timestamp: number;
  userId?: string;
  subcommunityId?: string;
}

export class CacheInvalidationService {
  private cache = getCacheService();
  private performance = getPerformanceService();
  private rules: Map<string, InvalidationRule[]> = new Map();
  private eventListeners: Map<string, ((event: InvalidationEvent) => void)[]> = new Map();
  private webSocketClient: any = null;

  constructor() {
    this.setupDefaultRules();
    this.setupWebSocketListener();
  }

  /**
   * Set up default invalidation rules
   */
  private setupDefaultRules(): void {
    // Post-related invalidation rules
    this.addRule('post_created', {
      event: 'post_created',
      tags: [CacheTags.posts, CacheTags.feeds, CacheTags.search, CacheTags.recommendations],
      condition: (data) => !!data.post
    });

    this.addRule('post_updated', {
      event: 'post_updated',
      tags: [CacheTags.posts, CacheTags.feeds, CacheTags.search],
      condition: (data) => !!data.post
    });

    this.addRule('post_deleted', {
      event: 'post_deleted',
      tags: [CacheTags.posts, CacheTags.feeds, CacheTags.search, CacheTags.recommendations],
      condition: (data) => !!data.postId
    });

    this.addRule('post_voted', {
      event: 'post_voted',
      tags: [CacheTags.posts, CacheTags.feeds, CacheTags.votes],
      condition: (data) => !!data.postId
    });

    // Comment-related invalidation rules
    this.addRule('comment_created', {
      event: 'comment_created',
      tags: [CacheTags.comments, CacheTags.search],
      condition: (data) => !!data.comment
    });

    this.addRule('comment_updated', {
      event: 'comment_updated',
      tags: [CacheTags.comments, CacheTags.search],
      condition: (data) => !!data.comment
    });

    this.addRule('comment_deleted', {
      event: 'comment_deleted',
      tags: [CacheTags.comments, CacheTags.search],
      condition: (data) => !!data.commentId
    });

    this.addRule('comment_voted', {
      event: 'comment_voted',
      tags: [CacheTags.comments, CacheTags.votes],
      condition: (data) => !!data.commentId
    });

    // Subcommunity-related invalidation rules
    this.addRule('subcommunity_created', {
      event: 'subcommunity_created',
      tags: [CacheTags.subcommunities, CacheTags.search],
      condition: (data) => !!data.subcommunity
    });

    this.addRule('subcommunity_updated', {
      event: 'subcommunity_updated',
      tags: [CacheTags.subcommunities, CacheTags.feeds],
      condition: (data) => !!data.subcommunity
    });

    // Reputation-related invalidation rules
    this.addRule('user_reputation_updated', {
      event: 'user_reputation_updated',
      tags: [CacheTags.reputation],
      condition: (data) => !!data.userId
    });

    // Moderation-related invalidation rules
    this.addRule('moderation_action', {
      event: 'moderation_action',
      tags: [CacheTags.posts, CacheTags.comments, CacheTags.feeds, CacheTags.moderation],
      condition: (data) => !!data.action
    });
  }

  /**
   * Set up WebSocket listener for real-time invalidation
   */
  private setupWebSocketListener(): void {
    try {
      // Import WebSocket client dynamically to avoid circular dependencies
      import('./WebSocketClient').then(({ WebSocketClient }) => {
        this.webSocketClient = new WebSocketClient();
        
        // Listen for real-time events
        this.webSocketClient.on('post_created', (data: any) => {
          this.handleInvalidationEvent({
            type: 'post_created',
            data,
            timestamp: Date.now()
          });
        });

        this.webSocketClient.on('post_updated', (data: any) => {
          this.handleInvalidationEvent({
            type: 'post_updated',
            data,
            timestamp: Date.now()
          });
        });

        this.webSocketClient.on('post_deleted', (data: any) => {
          this.handleInvalidationEvent({
            type: 'post_deleted',
            data,
            timestamp: Date.now()
          });
        });

        this.webSocketClient.on('comment_created', (data: any) => {
          this.handleInvalidationEvent({
            type: 'comment_created',
            data,
            timestamp: Date.now()
          });
        });

        this.webSocketClient.on('vote_updated', (data: any) => {
          const eventType = data.contentType === 'post' ? 'post_voted' : 'comment_voted';
          this.handleInvalidationEvent({
            type: eventType as any,
            data,
            timestamp: Date.now()
          });
        });

        this.webSocketClient.on('reputation_updated', (data: any) => {
          this.handleInvalidationEvent({
            type: 'user_reputation_updated',
            data,
            timestamp: Date.now()
          });
        });

        console.log('Cache invalidation WebSocket listener set up successfully');
      }).catch(error => {
        console.warn('Failed to set up WebSocket listener for cache invalidation:', error);
      });
    } catch (error) {
      console.warn('WebSocket not available for cache invalidation:', error);
    }
  }

  /**
   * Add a new invalidation rule
   */
  addRule(eventType: string, rule: InvalidationRule): void {
    if (!this.rules.has(eventType)) {
      this.rules.set(eventType, []);
    }
    this.rules.get(eventType)!.push(rule);
  }

  /**
   * Remove an invalidation rule
   */
  removeRule(eventType: string, rule: InvalidationRule): void {
    const rules = this.rules.get(eventType);
    if (rules) {
      const index = rules.indexOf(rule);
      if (index > -1) {
        rules.splice(index, 1);
      }
    }
  }

  /**
   * Handle an invalidation event
   */
  async handleInvalidationEvent(event: InvalidationEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      const rules = this.rules.get(event.type) || [];
      
      for (const rule of rules) {
        // Check condition if specified
        if (rule.condition && !rule.condition(event.data)) {
          continue;
        }

        // Invalidate by tags
        for (const tag of rule.tags) {
          let actualTag = tag;
          
          // Handle dynamic tags
          if (event.type.includes('post') && event.data.post) {
            if (tag === CacheTags.posts) {
              actualTag = CacheTags.post(event.data.post.id);
            } else if (tag === CacheTags.user('')) {
              actualTag = CacheTags.user(event.data.post.authorId);
            } else if (tag === CacheTags.subcommunity('') && event.data.post.subcommunityId) {
              actualTag = CacheTags.subcommunity(event.data.post.subcommunityId);
            }
          } else if (event.type.includes('comment') && event.data.comment) {
            if (tag === CacheTags.comments) {
              actualTag = CacheTags.comment(event.data.comment.id);
            } else if (tag === CacheTags.posts) {
              actualTag = CacheTags.post(event.data.comment.postId);
            } else if (tag === CacheTags.user('')) {
              actualTag = CacheTags.user(event.data.comment.authorId);
            }
          } else if (event.type.includes('subcommunity') && event.data.subcommunity) {
            if (tag === CacheTags.subcommunities) {
              actualTag = CacheTags.subcommunity(event.data.subcommunity.id);
            }
          } else if (event.type === 'user_reputation_updated' && event.data.userId) {
            if (tag === CacheTags.reputation) {
              actualTag = CacheTags.user(event.data.userId);
            }
          }

          await this.cache.invalidateByTag(actualTag);
        }

        // Invalidate by patterns if specified
        if (rule.patterns) {
          for (const pattern of rule.patterns) {
            const keys = await this.cache.keys(pattern);
            for (const key of keys) {
              await this.cache.delete(key);
            }
          }
        }
      }

      // Notify event listeners
      const listeners = this.eventListeners.get(event.type) || [];
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Cache invalidation event listener error:', error);
        }
      }

      // Record performance metrics
      const duration = performance.now() - startTime;
      this.performance.recordTiming('cache_invalidation', duration, {
        event_type: event.type,
        rules_processed: rules.length.toString()
      });

    } catch (error) {
      console.error('Cache invalidation error:', error);
      this.performance.recordCounter('cache_invalidation_errors', 1, {
        event_type: event.type,
        error: error.message
      });
    }
  }

  /**
   * Manually trigger cache invalidation
   */
  async invalidate(event: InvalidationEvent): Promise<void> {
    await this.handleInvalidationEvent(event);
  }

  /**
   * Invalidate all caches related to a specific post
   */
  async invalidatePost(postId: string, authorId?: string, subcommunityId?: string): Promise<void> {
    await this.handleInvalidationEvent({
      type: 'post_updated',
      data: {
        post: {
          id: postId,
          authorId,
          subcommunityId
        }
      },
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate all caches related to a specific comment
   */
  async invalidateComment(commentId: string, postId: string, authorId?: string): Promise<void> {
    await this.handleInvalidationEvent({
      type: 'comment_updated',
      data: {
        comment: {
          id: commentId,
          postId,
          authorId
        }
      },
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate all caches related to a specific user
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.user(userId));
    await this.cache.invalidateByTag(CacheTags.reputation);
    await this.cache.invalidateByTag(CacheTags.recommendations);
  }

  /**
   * Invalidate all caches related to a specific subcommunity
   */
  async invalidateSubcommunity(subcommunityId: string): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.subcommunity(subcommunityId));
    await this.cache.invalidateByTag(CacheTags.feeds);
  }

  /**
   * Invalidate all feed caches
   */
  async invalidateFeeds(): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.feeds);
  }

  /**
   * Invalidate all search caches
   */
  async invalidateSearch(): Promise<void> {
    await this.cache.invalidateByTag(CacheTags.search);
  }

  /**
   * Add event listener for invalidation events
   */
  addEventListener(eventType: string, listener: (event: InvalidationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: (event: InvalidationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get invalidation statistics
   */
  async getInvalidationStats(): Promise<any> {
    const cacheStats = await this.cache.getStats();
    
    return {
      cacheStats,
      rules: {
        total: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0),
        byEventType: Object.fromEntries(
          Array.from(this.rules.entries()).map(([type, rules]) => [type, rules.length])
        )
      },
      listeners: {
        total: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
        byEventType: Object.fromEntries(
          Array.from(this.eventListeners.entries()).map(([type, listeners]) => [type, listeners.length])
        )
      }
    };
  }

  /**
   * Schedule periodic cache cleanup
   */
  scheduleCleanup(intervalMs: number = 30 * 60 * 1000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        // Get cache stats to determine if cleanup is needed
        const stats = await this.cache.getStats();
        
        if (stats.hitRate < 0.5 || stats.totalKeys > 50000) {
          console.log('Performing scheduled cache cleanup...');
          
          // Clear low-value caches
          await this.cache.invalidateByTag('search_suggestions');
          await this.cache.invalidateByTag('trending');
          
          // Clear old analytics data
          await this.cache.invalidateByTag(CacheTags.analytics);
          
          console.log('Scheduled cache cleanup completed');
        }
      } catch (error) {
        console.error('Scheduled cache cleanup error:', error);
      }
    }, intervalMs);
  }

  /**
   * Destroy the invalidation service
   */
  destroy(): void {
    if (this.webSocketClient) {
      this.webSocketClient.disconnect();
    }
    this.rules.clear();
    this.eventListeners.clear();
  }
}

// Singleton instance
let cacheInvalidationServiceInstance: CacheInvalidationService | null = null;

export function getCacheInvalidationService(): CacheInvalidationService {
  if (!cacheInvalidationServiceInstance) {
    cacheInvalidationServiceInstance = new CacheInvalidationService();
  }
  return cacheInvalidationServiceInstance;
}

export function destroyCacheInvalidationService(): void {
  if (cacheInvalidationServiceInstance) {
    cacheInvalidationServiceInstance.destroy();
    cacheInvalidationServiceInstance = null;
  }
}