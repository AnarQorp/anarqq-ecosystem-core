/**
 * Query Builder Service
 * 
 * Provides optimized query building for Qsocial database operations.
 * Includes query optimization, parameter binding, and performance monitoring.
 */

import { getDatabaseOptimizationService } from './DatabaseOptimizationService';
import { getPerformanceService } from './PerformanceMonitoringService';
import type { FeedOptions, CommentOptions } from '../../types/qsocial';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  joins?: string[];
  groupBy?: string[];
  having?: string;
}

export interface QueryResult<T = any> {
  data: T[];
  totalCount?: number;
  executionTime: number;
  query: string;
  parameters: any[];
}

export interface JoinConfig {
  table: string;
  alias?: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  condition: string;
}

/**
 * Optimized query builder for Qsocial database operations
 */
export class QueryBuilderService {
  private dbOptimization = getDatabaseOptimizationService();
  private performance = getPerformanceService();

  /**
   * Build optimized feed query
   */
  buildFeedQuery(options: FeedOptions & { subcommunityId?: string; userId?: string }): {
    query: string;
    parameters: any[];
  } {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      timeRange,
      subcommunityId,
      userId
    } = options;

    let query = `
      SELECT 
        p.id,
        p.author_id,
        p.title,
        p.content,
        p.content_type,
        p.source_module,
        p.source_id,
        p.subcommunity_id,
        p.tags,
        p.upvotes,
        p.downvotes,
        p.comment_count,
        p.created_at,
        p.updated_at,
        p.is_pinned,
        p.moderation_status,
        s.name as subcommunity_name,
        s.display_name as subcommunity_display_name
      FROM qsocial_posts p
      LEFT JOIN qsocial_subcommunities s ON p.subcommunity_id = s.id
      WHERE p.moderation_status = 'approved'
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    // Add subcommunity filter
    if (subcommunityId) {
      query += ` AND p.subcommunity_id = $${paramIndex}`;
      parameters.push(subcommunityId);
      paramIndex++;
    }

    // Add user filter
    if (userId) {
      query += ` AND p.author_id = $${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }

    // Add time range filter
    if (timeRange) {
      const timeRangeHours = this.getTimeRangeHours(timeRange);
      query += ` AND p.created_at > NOW() - INTERVAL '${timeRangeHours} hours'`;
    }

    // Add sorting
    query += this.buildOrderByClause(sortBy, 'DESC');

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    parameters.push(limit, offset);

    return { query, parameters };
  }

  /**
   * Build optimized comments query
   */
  buildCommentsQuery(postId: string, options: CommentOptions): {
    query: string;
    parameters: any[];
  } {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      maxDepth = 10
    } = options;

    // Use recursive CTE for threaded comments
    const query = `
      WITH RECURSIVE comment_tree AS (
        -- Base case: top-level comments
        SELECT 
          c.*,
          0 as depth,
          ARRAY[c.created_at] as sort_path
        FROM qsocial_comments c
        WHERE c.post_id = $1 
          AND c.parent_comment_id IS NULL
          AND c.moderation_status = 'approved'
        
        UNION ALL
        
        -- Recursive case: child comments
        SELECT 
          c.*,
          ct.depth + 1,
          ct.sort_path || c.created_at
        FROM qsocial_comments c
        JOIN comment_tree ct ON c.parent_comment_id = ct.id
        WHERE ct.depth < $2
          AND c.moderation_status = 'approved'
      )
      SELECT 
        ct.*,
        ARRAY_LENGTH(ct.sort_path, 1) as thread_depth
      FROM comment_tree ct
      ORDER BY ${this.buildCommentSortClause(sortBy)}
      LIMIT $3 OFFSET $4
    `;

    return {
      query,
      parameters: [postId, maxDepth, limit, offset]
    };
  }

  /**
   * Build optimized search query
   */
  buildSearchQuery(
    searchTerm: string,
    contentType: 'posts' | 'comments' | 'all' = 'all',
    options: QueryOptions = {}
  ): {
    query: string;
    parameters: any[];
  } {
    const { limit = 20, offset = 0, filters = {} } = options;

    if (contentType === 'posts' || contentType === 'all') {
      return this.buildPostSearchQuery(searchTerm, { limit, offset, filters });
    } else {
      return this.buildCommentSearchQuery(searchTerm, { limit, offset, filters });
    }
  }

  /**
   * Build post search query with full-text search
   */
  private buildPostSearchQuery(searchTerm: string, options: QueryOptions): {
    query: string;
    parameters: any[];
  } {
    const { limit, offset, filters } = options;

    let query = `
      SELECT 
        p.*,
        s.name as subcommunity_name,
        ts_rank(
          to_tsvector('english', p.title || ' ' || COALESCE(p.content, '')), 
          plainto_tsquery('english', $1)
        ) as search_rank
      FROM qsocial_posts p
      LEFT JOIN qsocial_subcommunities s ON p.subcommunity_id = s.id
      WHERE to_tsvector('english', p.title || ' ' || COALESCE(p.content, '')) @@ plainto_tsquery('english', $1)
        AND p.moderation_status = 'approved'
    `;

    const parameters: any[] = [searchTerm];
    let paramIndex = 2;

    // Add filters
    if (filters.subcommunityId) {
      query += ` AND p.subcommunity_id = $${paramIndex}`;
      parameters.push(filters.subcommunityId);
      paramIndex++;
    }

    if (filters.authorId) {
      query += ` AND p.author_id = $${paramIndex}`;
      parameters.push(filters.authorId);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      query += ` AND p.tags && $${paramIndex}`;
      parameters.push(filters.tags);
      paramIndex++;
    }

    if (filters.dateRange) {
      if (filters.dateRange.from) {
        query += ` AND p.created_at >= $${paramIndex}`;
        parameters.push(filters.dateRange.from);
        paramIndex++;
      }
      if (filters.dateRange.to) {
        query += ` AND p.created_at <= $${paramIndex}`;
        parameters.push(filters.dateRange.to);
        paramIndex++;
      }
    }

    // Order by relevance, then by date
    query += ` ORDER BY search_rank DESC, p.created_at DESC`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    parameters.push(limit, offset);

    return { query, parameters };
  }

  /**
   * Build comment search query
   */
  private buildCommentSearchQuery(searchTerm: string, options: QueryOptions): {
    query: string;
    parameters: any[];
  } {
    const { limit, offset, filters } = options;

    let query = `
      SELECT 
        c.*,
        p.title as post_title,
        ts_rank(
          to_tsvector('english', c.content), 
          plainto_tsquery('english', $1)
        ) as search_rank
      FROM qsocial_comments c
      JOIN qsocial_posts p ON c.post_id = p.id
      WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
        AND c.moderation_status = 'approved'
        AND p.moderation_status = 'approved'
    `;

    const parameters: any[] = [searchTerm];
    let paramIndex = 2;

    // Add filters
    if (filters.postId) {
      query += ` AND c.post_id = $${paramIndex}`;
      parameters.push(filters.postId);
      paramIndex++;
    }

    if (filters.authorId) {
      query += ` AND c.author_id = $${paramIndex}`;
      parameters.push(filters.authorId);
      paramIndex++;
    }

    // Order by relevance, then by date
    query += ` ORDER BY search_rank DESC, c.created_at DESC`;

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    parameters.push(limit, offset);

    return { query, parameters };
  }

  /**
   * Build trending posts query
   */
  buildTrendingQuery(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day', limit: number = 20): {
    query: string;
    parameters: any[];
  } {
    const timeRangeHours = this.getTimeRangeHours(timeRange);

    // Hot score algorithm: (upvotes - downvotes) / (age_in_hours + 2)^1.8
    const query = `
      SELECT 
        p.*,
        s.name as subcommunity_name,
        (p.upvotes - p.downvotes) as score,
        (p.upvotes - p.downvotes) / POWER(
          GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1) + 2, 
          1.8
        ) as hot_score,
        p.comment_count,
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 as age_hours
      FROM qsocial_posts p
      LEFT JOIN qsocial_subcommunities s ON p.subcommunity_id = s.id
      WHERE p.created_at > NOW() - INTERVAL '${timeRangeHours} hours'
        AND p.moderation_status = 'approved'
        AND (p.upvotes + p.downvotes) > 0
      ORDER BY hot_score DESC, p.created_at DESC
      LIMIT $1
    `;

    return { query, parameters: [limit] };
  }

  /**
   * Build user reputation query
   */
  buildUserReputationQuery(userId: string): {
    query: string;
    parameters: any[];
  } {
    const query = `
      SELECT 
        ur.*,
        COUNT(DISTINCT p.id) as post_count,
        COUNT(DISTINCT c.id) as comment_count,
        COALESCE(SUM(p.upvotes - p.downvotes), 0) as post_score,
        COALESCE(SUM(c.upvotes - c.downvotes), 0) as comment_score
      FROM qsocial_user_reputation ur
      LEFT JOIN qsocial_posts p ON ur.user_id = p.author_id 
        AND p.moderation_status = 'approved'
      LEFT JOIN qsocial_comments c ON ur.user_id = c.author_id 
        AND c.moderation_status = 'approved'
      WHERE ur.user_id = $1
      GROUP BY ur.user_id, ur.total_qarma, ur.post_qarma, ur.comment_qarma, 
               ur.subcommunity_qarma, ur.badges, ur.achievements, 
               ur.moderation_level, ur.can_moderate, ur.qarma_history, ur.last_updated
    `;

    return { query, parameters: [userId] };
  }

  /**
   * Build subcommunity stats query
   */
  buildSubcommunityStatsQuery(subcommunityId: string): {
    query: string;
    parameters: any[];
  } {
    const query = `
      SELECT 
        s.*,
        COUNT(DISTINCT p.id) as total_posts,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT p.author_id) as unique_posters,
        COUNT(DISTINCT c.author_id) as unique_commenters,
        COALESCE(AVG(p.upvotes - p.downvotes), 0) as avg_post_score,
        MAX(p.created_at) as last_post_at,
        MAX(c.created_at) as last_comment_at
      FROM qsocial_subcommunities s
      LEFT JOIN qsocial_posts p ON s.id = p.subcommunity_id 
        AND p.moderation_status = 'approved'
      LEFT JOIN qsocial_comments c ON p.id = c.post_id 
        AND c.moderation_status = 'approved'
      WHERE s.id = $1
      GROUP BY s.id, s.name, s.display_name, s.description, s.creator_id, 
               s.moderators, s.dao_address, s.governance_rules, s.is_private, 
               s.requires_approval, s.minimum_qarma, s.allowed_content_types, 
               s.member_count, s.post_count, s.created_at, s.avatar, s.banner, 
               s.rules, s.ipfs_hash
    `;

    return { query, parameters: [subcommunityId] };
  }

  /**
   * Build analytics query for dashboard
   */
  buildAnalyticsQuery(timeRange: 'day' | 'week' | 'month' = 'day'): {
    query: string;
    parameters: any[];
  } {
    const timeRangeHours = this.getTimeRangeHours(timeRange);

    const query = `
      WITH time_series AS (
        SELECT generate_series(
          NOW() - INTERVAL '${timeRangeHours} hours',
          NOW(),
          INTERVAL '1 hour'
        ) as hour
      ),
      post_stats AS (
        SELECT 
          DATE_TRUNC('hour', p.created_at) as hour,
          COUNT(*) as posts_created,
          SUM(p.upvotes) as total_upvotes,
          SUM(p.downvotes) as total_downvotes,
          COUNT(DISTINCT p.author_id) as unique_authors
        FROM qsocial_posts p
        WHERE p.created_at > NOW() - INTERVAL '${timeRangeHours} hours'
        GROUP BY DATE_TRUNC('hour', p.created_at)
      ),
      comment_stats AS (
        SELECT 
          DATE_TRUNC('hour', c.created_at) as hour,
          COUNT(*) as comments_created,
          COUNT(DISTINCT c.author_id) as unique_commenters
        FROM qsocial_comments c
        WHERE c.created_at > NOW() - INTERVAL '${timeRangeHours} hours'
        GROUP BY DATE_TRUNC('hour', c.created_at)
      )
      SELECT 
        ts.hour,
        COALESCE(ps.posts_created, 0) as posts_created,
        COALESCE(ps.total_upvotes, 0) as total_upvotes,
        COALESCE(ps.total_downvotes, 0) as total_downvotes,
        COALESCE(ps.unique_authors, 0) as unique_authors,
        COALESCE(cs.comments_created, 0) as comments_created,
        COALESCE(cs.unique_commenters, 0) as unique_commenters
      FROM time_series ts
      LEFT JOIN post_stats ps ON ts.hour = ps.hour
      LEFT JOIN comment_stats cs ON ts.hour = cs.hour
      ORDER BY ts.hour
    `;

    return { query, parameters: [] };
  }

  /**
   * Execute query with performance monitoring
   */
  async executeQuery<T = any>(
    query: string,
    parameters: any[] = [],
    tableName: string = 'unknown'
  ): Promise<QueryResult<T>> {
    const startTime = performance.now();

    try {
      // In a real implementation, this would execute against the actual database
      // For now, we'll simulate the execution and return mock data
      const mockData: T[] = [];
      const executionTime = performance.now() - startTime;

      // Analyze the query for optimization
      this.dbOptimization.analyzeQuery(
        query,
        executionTime,
        0, // rowsExamined - would come from actual DB
        mockData.length,
        [], // indexesUsed - would come from actual DB
        tableName
      );

      // Record performance metrics
      this.performance.recordDatabaseQuery(
        this.getQueryType(query),
        executionTime,
        tableName,
        mockData.length
      );

      return {
        data: mockData,
        executionTime,
        query,
        parameters
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Record error metrics
      this.performance.recordCounter('database_errors', 1, {
        table: tableName,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Build ORDER BY clause with optimization
   */
  private buildOrderByClause(sortBy: string, defaultOrder: 'ASC' | 'DESC' = 'DESC'): string {
    const sortMappings: Record<string, string> = {
      'created_at': 'p.created_at',
      'updated_at': 'p.updated_at',
      'upvotes': 'p.upvotes',
      'downvotes': 'p.downvotes',
      'score': '(p.upvotes - p.downvotes)',
      'hot': '(p.upvotes - p.downvotes) / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.8)',
      'comment_count': 'p.comment_count',
      'title': 'p.title'
    };

    const column = sortMappings[sortBy] || sortMappings['created_at'];
    return ` ORDER BY ${column} ${defaultOrder}`;
  }

  /**
   * Build comment sort clause
   */
  private buildCommentSortClause(sortBy: string): string {
    switch (sortBy) {
      case 'created_at':
        return 'ct.sort_path';
      case 'upvotes':
        return 'ct.upvotes DESC, ct.sort_path';
      case 'score':
        return '(ct.upvotes - ct.downvotes) DESC, ct.sort_path';
      default:
        return 'ct.sort_path';
    }
  }

  /**
   * Get time range in hours
   */
  private getTimeRangeHours(timeRange: string): number {
    switch (timeRange) {
      case 'hour': return 1;
      case 'day': return 24;
      case 'week': return 168;
      case 'month': return 720;
      default: return 24;
    }
  }

  /**
   * Get query type from SQL string
   */
  private getQueryType(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'SELECT';
  }

  /**
   * Get query builder statistics
   */
  getStats(): any {
    return this.dbOptimization.getOptimizationStats();
  }
}

// Singleton instance
let queryBuilderServiceInstance: QueryBuilderService | null = null;

export function getQueryBuilderService(): QueryBuilderService {
  if (!queryBuilderServiceInstance) {
    queryBuilderServiceInstance = new QueryBuilderService();
  }
  return queryBuilderServiceInstance;
}