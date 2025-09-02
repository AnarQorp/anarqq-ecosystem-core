/**
 * Database Optimization Service
 * 
 * Provides database query optimization, indexing strategies, and performance monitoring
 * for the Qsocial platform. Includes query analysis, index recommendations, and
 * database performance monitoring.
 */

import { getPerformanceService } from './PerformanceMonitoringService';

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexesUsed: string[];
  tableName: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: number;
  optimizationSuggestions: string[];
}

export interface IndexRecommendation {
  tableName: string;
  columnNames: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'composite';
  reason: string;
  estimatedImprovement: number; // Percentage
  priority: 'low' | 'medium' | 'high' | 'critical';
  sqlCommand: string;
}

export interface DatabaseMetrics {
  connectionCount: number;
  activeQueries: number;
  slowQueries: number;
  cacheHitRatio: number;
  indexUsageRatio: number;
  tableStats: TableStats[];
  timestamp: number;
}

export interface TableStats {
  tableName: string;
  rowCount: number;
  tableSize: number; // in bytes
  indexSize: number; // in bytes
  mostUsedIndexes: string[];
  slowestQueries: QueryAnalysis[];
}

export interface QueryOptimizationRule {
  name: string;
  pattern: RegExp;
  suggestion: string;
  severity: 'info' | 'warning' | 'error';
  autoFix?: (query: string) => string;
}

export interface DatabaseAlert {
  id: string;
  type: 'slow_query' | 'missing_index' | 'high_load' | 'connection_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: number;
  resolved?: boolean;
}

/**
 * Database optimization service for Qsocial
 */
export class DatabaseOptimizationService {
  private performance = getPerformanceService();
  private queryAnalyses: QueryAnalysis[] = [];
  private indexRecommendations: IndexRecommendation[] = [];
  private optimizationRules: QueryOptimizationRule[] = [];
  private alerts: DatabaseAlert[] = [];
  private maxAnalysisHistory = 1000;

  constructor() {
    this.setupOptimizationRules();
  }

  /**
   * Set up default query optimization rules
   */
  private setupOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'Missing WHERE clause',
        pattern: /SELECT\s+.*\s+FROM\s+\w+(?!\s+WHERE)/i,
        suggestion: 'Consider adding WHERE clause to limit results',
        severity: 'warning'
      },
      {
        name: 'SELECT *',
        pattern: /SELECT\s+\*\s+FROM/i,
        suggestion: 'Avoid SELECT * - specify only needed columns',
        severity: 'info',
        autoFix: (query) => query.replace(/SELECT\s+\*/i, 'SELECT id, created_at')
      },
      {
        name: 'Missing LIMIT',
        pattern: /SELECT\s+.*\s+FROM\s+.*(?!\s+LIMIT)/i,
        suggestion: 'Consider adding LIMIT clause for large result sets',
        severity: 'info'
      },
      {
        name: 'LIKE with leading wildcard',
        pattern: /LIKE\s+['"]%/i,
        suggestion: 'Leading wildcards prevent index usage - consider full-text search',
        severity: 'warning'
      },
      {
        name: 'OR in WHERE clause',
        pattern: /WHERE\s+.*\s+OR\s+/i,
        suggestion: 'OR conditions can prevent index usage - consider UNION or separate queries',
        severity: 'info'
      },
      {
        name: 'Function in WHERE clause',
        pattern: /WHERE\s+\w+\s*\(/i,
        suggestion: 'Functions in WHERE clause prevent index usage',
        severity: 'warning'
      },
      {
        name: 'Missing JOIN condition',
        pattern: /JOIN\s+\w+(?!\s+ON)/i,
        suggestion: 'Missing JOIN condition can cause cartesian product',
        severity: 'error'
      },
      {
        name: 'ORDER BY without index',
        pattern: /ORDER\s+BY\s+(?!id|created_at|updated_at)/i,
        suggestion: 'ORDER BY on non-indexed columns can be slow',
        severity: 'info'
      }
    ];
  }

  /**
   * Analyze a database query for optimization opportunities
   */
  analyzeQuery(
    query: string,
    executionTime: number,
    rowsExamined: number = 0,
    rowsReturned: number = 0,
    indexesUsed: string[] = [],
    tableName: string = 'unknown'
  ): QueryAnalysis {
    const queryType = this.getQueryType(query);
    const optimizationSuggestions = this.getOptimizationSuggestions(query);

    const analysis: QueryAnalysis = {
      query: query.trim(),
      executionTime,
      rowsExamined,
      rowsReturned,
      indexesUsed,
      tableName,
      queryType,
      timestamp: Date.now(),
      optimizationSuggestions
    };

    // Store analysis
    this.queryAnalyses.push(analysis);
    if (this.queryAnalyses.length > this.maxAnalysisHistory) {
      this.queryAnalyses = this.queryAnalyses.slice(-this.maxAnalysisHistory);
    }

    // Record performance metrics
    this.performance.recordDatabaseQuery(
      queryType,
      executionTime,
      tableName,
      rowsReturned,
      {
        indexes_used: indexesUsed.join(','),
        rows_examined: rowsExamined.toString(),
        optimization_suggestions: optimizationSuggestions.length.toString()
      }
    );

    // Generate alerts for slow queries
    if (executionTime > 1000) { // Slow query threshold: 1 second
      this.generateSlowQueryAlert(analysis);
    }

    // Generate index recommendations
    this.generateIndexRecommendations(analysis);

    return analysis;
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
    return 'SELECT'; // Default
  }

  /**
   * Get optimization suggestions for a query
   */
  private getOptimizationSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    for (const rule of this.optimizationRules) {
      if (rule.pattern.test(query)) {
        suggestions.push(`${rule.name}: ${rule.suggestion}`);
      }
    }

    return suggestions;
  }

  /**
   * Generate slow query alert
   */
  private generateSlowQueryAlert(analysis: QueryAnalysis): void {
    const alert: DatabaseAlert = {
      id: `slow_query_${Date.now()}`,
      type: 'slow_query',
      severity: analysis.executionTime > 5000 ? 'critical' : 
                analysis.executionTime > 3000 ? 'high' : 'medium',
      message: `Slow query detected: ${analysis.executionTime}ms execution time`,
      details: {
        query: analysis.query.substring(0, 200),
        executionTime: analysis.executionTime,
        tableName: analysis.tableName,
        suggestions: analysis.optimizationSuggestions
      },
      timestamp: Date.now()
    };

    this.alerts.push(alert);
  }

  /**
   * Generate index recommendations based on query analysis
   */
  private generateIndexRecommendations(analysis: QueryAnalysis): void {
    const { query, tableName, executionTime, rowsExamined, rowsReturned } = analysis;

    // Skip if query is already fast
    if (executionTime < 100) return;

    // Extract WHERE conditions for index recommendations
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columns = this.extractColumnsFromWhere(whereClause);

      for (const column of columns) {
        // Check if we already have a recommendation for this column
        const existingRec = this.indexRecommendations.find(
          rec => rec.tableName === tableName && rec.columnNames.includes(column)
        );

        if (!existingRec) {
          const recommendation: IndexRecommendation = {
            tableName,
            columnNames: [column],
            indexType: 'btree',
            reason: `Frequently used in WHERE clause, execution time: ${executionTime}ms`,
            estimatedImprovement: this.estimateIndexImprovement(rowsExamined, rowsReturned),
            priority: executionTime > 2000 ? 'high' : executionTime > 1000 ? 'medium' : 'low',
            sqlCommand: `CREATE INDEX idx_${tableName}_${column} ON ${tableName} (${column});`
          };

          this.indexRecommendations.push(recommendation);
        }
      }
    }

    // Check for composite index opportunities
    this.generateCompositeIndexRecommendations(analysis);
  }

  /**
   * Extract column names from WHERE clause
   */
  private extractColumnsFromWhere(whereClause: string): string[] {
    const columns: string[] = [];
    
    // Simple regex to extract column names (this could be more sophisticated)
    const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
    
    if (columnMatches) {
      for (const match of columnMatches) {
        const column = match.replace(/\s*[=<>!].*/, '').trim();
        if (column && !columns.includes(column)) {
          columns.push(column);
        }
      }
    }

    return columns;
  }

  /**
   * Generate composite index recommendations
   */
  private generateCompositeIndexRecommendations(analysis: QueryAnalysis): void {
    const { query, tableName, executionTime } = analysis;

    // Look for ORDER BY with WHERE conditions
    const orderByMatch = query.match(/ORDER\s+BY\s+(\w+)/i);
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);

    if (orderByMatch && whereMatch) {
      const orderColumn = orderByMatch[1];
      const whereColumns = this.extractColumnsFromWhere(whereMatch[1]);

      if (whereColumns.length > 0) {
        const compositeColumns = [...whereColumns, orderColumn];
        
        const recommendation: IndexRecommendation = {
          tableName,
          columnNames: compositeColumns,
          indexType: 'composite',
          reason: `Composite index for WHERE + ORDER BY optimization`,
          estimatedImprovement: 60,
          priority: executionTime > 1000 ? 'high' : 'medium',
          sqlCommand: `CREATE INDEX idx_${tableName}_composite ON ${tableName} (${compositeColumns.join(', ')});`
        };

        this.indexRecommendations.push(recommendation);
      }
    }
  }

  /**
   * Estimate performance improvement from adding an index
   */
  private estimateIndexImprovement(rowsExamined: number, rowsReturned: number): number {
    if (rowsExamined === 0) return 0;
    
    const selectivity = rowsReturned / rowsExamined;
    
    // Higher selectivity (fewer rows returned relative to examined) = better improvement
    if (selectivity < 0.01) return 90; // 90% improvement
    if (selectivity < 0.1) return 70;  // 70% improvement
    if (selectivity < 0.3) return 50;  // 50% improvement
    if (selectivity < 0.5) return 30;  // 30% improvement
    
    return 10; // 10% improvement
  }

  /**
   * Get recommended database indexes for Qsocial tables
   */
  getRecommendedIndexes(): IndexRecommendation[] {
    const baseRecommendations: IndexRecommendation[] = [
      // Posts table indexes
      {
        tableName: 'qsocial_posts',
        columnNames: ['author_id'],
        indexType: 'btree',
        reason: 'Frequently queried for user posts',
        estimatedImprovement: 80,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_author_id ON qsocial_posts (author_id);'
      },
      {
        tableName: 'qsocial_posts',
        columnNames: ['subcommunity_id'],
        indexType: 'btree',
        reason: 'Frequently queried for subcommunity feeds',
        estimatedImprovement: 75,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_subcommunity_id ON qsocial_posts (subcommunity_id);'
      },
      {
        tableName: 'qsocial_posts',
        columnNames: ['created_at'],
        indexType: 'btree',
        reason: 'Used for chronological ordering',
        estimatedImprovement: 70,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_created_at ON qsocial_posts (created_at DESC);'
      },
      {
        tableName: 'qsocial_posts',
        columnNames: ['moderation_status', 'created_at'],
        indexType: 'composite',
        reason: 'Composite index for filtering approved posts by date',
        estimatedImprovement: 85,
        priority: 'critical',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_status_date ON qsocial_posts (moderation_status, created_at DESC);'
      },
      {
        tableName: 'qsocial_posts',
        columnNames: ['subcommunity_id', 'created_at'],
        indexType: 'composite',
        reason: 'Composite index for subcommunity feeds ordered by date',
        estimatedImprovement: 80,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_subcommunity_date ON qsocial_posts (subcommunity_id, created_at DESC);'
      },
      {
        tableName: 'qsocial_posts',
        columnNames: ['tags'],
        indexType: 'gin',
        reason: 'GIN index for array tag searches',
        estimatedImprovement: 90,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_posts_tags ON qsocial_posts USING gin (tags);'
      },

      // Comments table indexes
      {
        tableName: 'qsocial_comments',
        columnNames: ['post_id'],
        indexType: 'btree',
        reason: 'Frequently queried for post comments',
        estimatedImprovement: 85,
        priority: 'critical',
        sqlCommand: 'CREATE INDEX idx_qsocial_comments_post_id ON qsocial_comments (post_id);'
      },
      {
        tableName: 'qsocial_comments',
        columnNames: ['author_id'],
        indexType: 'btree',
        reason: 'Queried for user comment history',
        estimatedImprovement: 70,
        priority: 'medium',
        sqlCommand: 'CREATE INDEX idx_qsocial_comments_author_id ON qsocial_comments (author_id);'
      },
      {
        tableName: 'qsocial_comments',
        columnNames: ['parent_comment_id'],
        indexType: 'btree',
        reason: 'Used for threaded comment structure',
        estimatedImprovement: 75,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_comments_parent_id ON qsocial_comments (parent_comment_id);'
      },
      {
        tableName: 'qsocial_comments',
        columnNames: ['post_id', 'created_at'],
        indexType: 'composite',
        reason: 'Composite index for post comments ordered by date',
        estimatedImprovement: 80,
        priority: 'high',
        sqlCommand: 'CREATE INDEX idx_qsocial_comments_post_date ON qsocial_comments (post_id, created_at DESC);'
      },

      // Subcommunities table indexes
      {
        tableName: 'qsocial_subcommunities',
        columnNames: ['name'],
        indexType: 'btree',
        reason: 'Unique constraint and lookups by name',
        estimatedImprovement: 95,
        priority: 'critical',
        sqlCommand: 'CREATE UNIQUE INDEX idx_qsocial_subcommunities_name ON qsocial_subcommunities (name);'
      },
      {
        tableName: 'qsocial_subcommunities',
        columnNames: ['creator_id'],
        indexType: 'btree',
        reason: 'Queried for user-created subcommunities',
        estimatedImprovement: 60,
        priority: 'medium',
        sqlCommand: 'CREATE INDEX idx_qsocial_subcommunities_creator_id ON qsocial_subcommunities (creator_id);'
      },
      {
        tableName: 'qsocial_subcommunities',
        columnNames: ['member_count'],
        indexType: 'btree',
        reason: 'Used for sorting by popularity',
        estimatedImprovement: 50,
        priority: 'low',
        sqlCommand: 'CREATE INDEX idx_qsocial_subcommunities_member_count ON qsocial_subcommunities (member_count DESC);'
      },

      // User reputation table indexes
      {
        tableName: 'qsocial_user_reputation',
        columnNames: ['total_qarma'],
        indexType: 'btree',
        reason: 'Used for reputation-based sorting and filtering',
        estimatedImprovement: 70,
        priority: 'medium',
        sqlCommand: 'CREATE INDEX idx_qsocial_user_reputation_qarma ON qsocial_user_reputation (total_qarma DESC);'
      }
    ];

    // Combine base recommendations with dynamic ones
    return [...baseRecommendations, ...this.indexRecommendations];
  }

  /**
   * Get optimized query suggestions for common Qsocial operations
   */
  getOptimizedQueries(): Record<string, string> {
    return {
      // Feed queries
      'main_feed': `
        SELECT p.*, u.display_name, u.avatar_url
        FROM qsocial_posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.moderation_status = 'approved'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2;
      `,

      'subcommunity_feed': `
        SELECT p.*, u.display_name, u.avatar_url
        FROM qsocial_posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.subcommunity_id = $1 
          AND p.moderation_status = 'approved'
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3;
      `,

      'user_posts': `
        SELECT p.*, s.name as subcommunity_name
        FROM qsocial_posts p
        LEFT JOIN qsocial_subcommunities s ON p.subcommunity_id = s.id
        WHERE p.author_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3;
      `,

      // Comment queries
      'post_comments': `
        SELECT c.*, u.display_name, u.avatar_url
        FROM qsocial_comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.post_id = $1 
          AND c.moderation_status = 'approved'
        ORDER BY c.created_at ASC
        LIMIT $2 OFFSET $3;
      `,

      'comment_thread': `
        WITH RECURSIVE comment_tree AS (
          SELECT c.*, 0 as level
          FROM qsocial_comments c
          WHERE c.id = $1
          
          UNION ALL
          
          SELECT c.*, ct.level + 1
          FROM qsocial_comments c
          JOIN comment_tree ct ON c.parent_comment_id = ct.id
          WHERE ct.level < 10
        )
        SELECT ct.*, u.display_name, u.avatar_url
        FROM comment_tree ct
        LEFT JOIN users u ON ct.author_id = u.id
        ORDER BY ct.level, ct.created_at;
      `,

      // Search queries
      'search_posts': `
        SELECT p.*, u.display_name, 
               ts_rank(to_tsvector('english', p.title || ' ' || p.content), plainto_tsquery('english', $1)) as rank
        FROM qsocial_posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE to_tsvector('english', p.title || ' ' || p.content) @@ plainto_tsquery('english', $1)
          AND p.moderation_status = 'approved'
        ORDER BY rank DESC, p.created_at DESC
        LIMIT $2 OFFSET $3;
      `,

      'trending_posts': `
        SELECT p.*, u.display_name,
               (p.upvotes - p.downvotes) / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.8) as hot_score
        FROM qsocial_posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE p.created_at > NOW() - INTERVAL '7 days'
          AND p.moderation_status = 'approved'
        ORDER BY hot_score DESC
        LIMIT $1;
      `,

      // Reputation queries
      'user_reputation': `
        SELECT ur.*, 
               COUNT(p.id) as post_count,
               COUNT(c.id) as comment_count
        FROM qsocial_user_reputation ur
        LEFT JOIN qsocial_posts p ON ur.user_id = p.author_id
        LEFT JOIN qsocial_comments c ON ur.user_id = c.author_id
        WHERE ur.user_id = $1
        GROUP BY ur.user_id, ur.total_qarma, ur.post_qarma, ur.comment_qarma;
      `
    };
  }

  /**
   * Get database performance monitoring queries
   */
  getMonitoringQueries(): Record<string, string> {
    return {
      'slow_queries': `
        SELECT query, mean_time, calls, total_time
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 20;
      `,

      'index_usage': `
        SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC;
      `,

      'table_stats': `
        SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC;
      `,

      'connection_stats': `
        SELECT state, count(*)
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state;
      `,

      'cache_hit_ratio': `
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables;
      `
    };
  }

  /**
   * Get query analyses within time range
   */
  getQueryAnalyses(timeRange?: { start: number; end: number }): QueryAnalysis[] {
    if (!timeRange) {
      return this.queryAnalyses;
    }

    return this.queryAnalyses.filter(
      analysis => analysis.timestamp >= timeRange.start && analysis.timestamp <= timeRange.end
    );
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 1000): QueryAnalysis[] {
    return this.queryAnalyses.filter(analysis => analysis.executionTime > threshold);
  }

  /**
   * Get index recommendations by priority
   */
  getIndexRecommendationsByPriority(priority?: 'low' | 'medium' | 'high' | 'critical'): IndexRecommendation[] {
    const recommendations = this.getRecommendedIndexes();
    
    if (!priority) {
      return recommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    }

    return recommendations.filter(rec => rec.priority === priority);
  }

  /**
   * Get database alerts
   */
  getAlerts(resolved?: boolean): DatabaseAlert[] {
    if (resolved === undefined) {
      return this.alerts;
    }
    
    return this.alerts.filter(alert => !!alert.resolved === resolved);
  }

  /**
   * Resolve a database alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Add custom optimization rule
   */
  addOptimizationRule(rule: QueryOptimizationRule): void {
    this.optimizationRules.push(rule);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): any {
    const totalQueries = this.queryAnalyses.length;
    const slowQueries = this.getSlowQueries().length;
    const queriesWithSuggestions = this.queryAnalyses.filter(
      a => a.optimizationSuggestions.length > 0
    ).length;

    const avgExecutionTime = totalQueries > 0 
      ? this.queryAnalyses.reduce((sum, a) => sum + a.executionTime, 0) / totalQueries 
      : 0;

    return {
      totalQueries,
      slowQueries,
      slowQueryPercentage: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
      queriesWithSuggestions,
      avgExecutionTime,
      indexRecommendations: this.indexRecommendations.length,
      activeAlerts: this.getAlerts(false).length,
      optimizationRules: this.optimizationRules.length
    };
  }

  /**
   * Clear old analyses and recommendations
   */
  cleanup(olderThan: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThan;
    
    this.queryAnalyses = this.queryAnalyses.filter(a => a.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

// Singleton instance
let databaseOptimizationServiceInstance: DatabaseOptimizationService | null = null;

export function getDatabaseOptimizationService(): DatabaseOptimizationService {
  if (!databaseOptimizationServiceInstance) {
    databaseOptimizationServiceInstance = new DatabaseOptimizationService();
  }
  return databaseOptimizationServiceInstance;
}