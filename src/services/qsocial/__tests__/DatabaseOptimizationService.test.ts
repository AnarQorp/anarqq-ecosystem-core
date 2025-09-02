/**
 * Tests for DatabaseOptimizationService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DatabaseOptimizationService,
  getDatabaseOptimizationService
} from '../DatabaseOptimizationService';

describe('DatabaseOptimizationService', () => {
  let service: DatabaseOptimizationService;

  beforeEach(() => {
    service = new DatabaseOptimizationService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Query Analysis', () => {
    it('should analyze query and provide optimization suggestions', () => {
      const query = 'SELECT * FROM qsocial_posts WHERE author_id = ?';
      
      const analysis = service.analyzeQuery(
        query,
        150, // execution time
        1000, // rows examined
        10, // rows returned
        ['idx_author_id'],
        'qsocial_posts'
      );

      expect(analysis.query).toBe(query);
      expect(analysis.executionTime).toBe(150);
      expect(analysis.rowsExamined).toBe(1000);
      expect(analysis.rowsReturned).toBe(10);
      expect(analysis.indexesUsed).toEqual(['idx_author_id']);
      expect(analysis.tableName).toBe('qsocial_posts');
      expect(analysis.queryType).toBe('SELECT');
      expect(analysis.optimizationSuggestions).toContain('SELECT *: Avoid SELECT * - specify only needed columns');
    });

    it('should detect slow queries and generate alerts', () => {
      const query = 'SELECT * FROM qsocial_posts ORDER BY created_at';
      
      service.analyzeQuery(query, 3500, 10000, 100, [], 'qsocial_posts'); // Use 3500ms to trigger 'high' severity
      
      const alerts = service.getAlerts(false);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('slow_query');
      expect(alerts[0].severity).toBe('high');
    });

    it('should identify different query types', () => {
      const selectAnalysis = service.analyzeQuery('SELECT id FROM posts', 100);
      const insertAnalysis = service.analyzeQuery('INSERT INTO posts VALUES (?)', 50);
      const updateAnalysis = service.analyzeQuery('UPDATE posts SET title = ?', 75);
      const deleteAnalysis = service.analyzeQuery('DELETE FROM posts WHERE id = ?', 25);

      expect(selectAnalysis.queryType).toBe('SELECT');
      expect(insertAnalysis.queryType).toBe('INSERT');
      expect(updateAnalysis.queryType).toBe('UPDATE');
      expect(deleteAnalysis.queryType).toBe('DELETE');
    });

    it('should provide optimization suggestions for common anti-patterns', () => {
      const queries = [
        'SELECT * FROM posts',
        'SELECT id FROM posts WHERE UPPER(title) = ?',
        'SELECT id FROM posts WHERE title LIKE "%test%"',
        'SELECT id FROM posts WHERE id = 1 OR id = 2',
        'SELECT id FROM posts ORDER BY random_column'
      ];

      queries.forEach(query => {
        const analysis = service.analyzeQuery(query, 100);
        expect(analysis.optimizationSuggestions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Index Recommendations', () => {
    it('should generate index recommendations for slow queries', () => {
      const query = 'SELECT * FROM qsocial_posts WHERE author_id = ? AND created_at > ?';
      
      service.analyzeQuery(query, 1500, 5000, 50, [], 'qsocial_posts');
      
      const recommendations = service.getIndexRecommendationsByPriority();
      const dynamicRecs = recommendations.filter(r => !r.sqlCommand.includes('CREATE INDEX idx_qsocial'));
      
      expect(dynamicRecs.length).toBeGreaterThan(0);
    });

    it('should provide base index recommendations for Qsocial tables', () => {
      const recommendations = service.getRecommendedIndexes();
      
      // Should have recommendations for all main tables
      const tables = ['qsocial_posts', 'qsocial_comments', 'qsocial_subcommunities', 'qsocial_user_reputation'];
      
      tables.forEach(table => {
        const tableRecs = recommendations.filter(r => r.tableName === table);
        expect(tableRecs.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize index recommendations correctly', () => {
      const recommendations = service.getIndexRecommendationsByPriority();
      
      // Should be sorted by priority (critical > high > medium > low)
      for (let i = 0; i < recommendations.length - 1; i++) {
        const current = recommendations[i];
        const next = recommendations[i + 1];
        
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        expect(priorityOrder[current.priority]).toBeGreaterThanOrEqual(priorityOrder[next.priority]);
      }
    });

    it('should generate composite index recommendations', () => {
      const query = 'SELECT * FROM qsocial_posts WHERE author_id = ? ORDER BY created_at DESC';
      
      service.analyzeQuery(query, 1200, 3000, 20, [], 'qsocial_posts');
      
      const recommendations = service.getRecommendedIndexes();
      const compositeRecs = recommendations.filter(r => r.indexType === 'composite');
      
      expect(compositeRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Optimized Queries', () => {
    it('should provide optimized queries for common operations', () => {
      const queries = service.getOptimizedQueries();
      
      const expectedQueries = [
        'main_feed',
        'subcommunity_feed',
        'user_posts',
        'post_comments',
        'comment_thread',
        'search_posts',
        'trending_posts',
        'user_reputation'
      ];

      expectedQueries.forEach(queryName => {
        expect(queries[queryName]).toBeDefined();
        expect(typeof queries[queryName]).toBe('string');
        expect(queries[queryName].length).toBeGreaterThan(0);
      });
    });

    it('should provide monitoring queries', () => {
      const queries = service.getMonitoringQueries();
      
      const expectedQueries = [
        'slow_queries',
        'index_usage',
        'table_stats',
        'connection_stats',
        'cache_hit_ratio'
      ];

      expectedQueries.forEach(queryName => {
        expect(queries[queryName]).toBeDefined();
        expect(typeof queries[queryName]).toBe('string');
      });
    });
  });

  describe('Query History and Analytics', () => {
    it('should track query analyses over time', () => {
      service.analyzeQuery('SELECT * FROM posts', 100);
      service.analyzeQuery('SELECT id FROM posts', 50);
      service.analyzeQuery('INSERT INTO posts VALUES (?)', 25);
      
      const analyses = service.getQueryAnalyses();
      expect(analyses).toHaveLength(3);
    });

    it('should filter query analyses by time range', () => {
      const now = Date.now();
      
      service.analyzeQuery('SELECT * FROM posts', 100);
      
      const analyses = service.getQueryAnalyses({
        start: now - 1000,
        end: now + 1000
      });
      
      expect(analyses).toHaveLength(1);
    });

    it('should identify slow queries', () => {
      service.analyzeQuery('SELECT * FROM posts', 500); // Not slow
      service.analyzeQuery('SELECT * FROM posts WHERE complex_condition', 1500); // Slow
      service.analyzeQuery('SELECT * FROM posts ORDER BY random()', 2500); // Very slow
      
      const slowQueries = service.getSlowQueries(1000);
      expect(slowQueries).toHaveLength(2);
    });

    it('should provide optimization statistics', () => {
      service.analyzeQuery('SELECT * FROM posts', 100);
      service.analyzeQuery('SELECT * FROM posts WHERE slow_condition', 1500);
      service.analyzeQuery('INSERT INTO posts VALUES (?)', 50);
      
      const stats = service.getOptimizationStats();
      
      expect(stats.totalQueries).toBe(3);
      expect(stats.slowQueries).toBe(1);
      expect(stats.slowQueryPercentage).toBeCloseTo(33.33, 1);
      expect(stats.avgExecutionTime).toBeCloseTo(550, 0);
      expect(stats.queriesWithSuggestions).toBeGreaterThan(0);
    });
  });

  describe('Alert Management', () => {
    it('should generate and manage alerts', () => {
      service.analyzeQuery('SELECT * FROM posts WHERE slow_condition', 2500);
      
      let alerts = service.getAlerts(false);
      expect(alerts).toHaveLength(1);
      
      service.resolveAlert(alerts[0].id);
      
      alerts = service.getAlerts(false);
      expect(alerts).toHaveLength(0);
      
      const resolvedAlerts = service.getAlerts(true);
      expect(resolvedAlerts).toHaveLength(1);
    });
  });

  describe('Custom Optimization Rules', () => {
    it('should allow adding custom optimization rules', () => {
      const customRule = {
        name: 'Custom Rule',
        pattern: /CUSTOM_PATTERN/i,
        suggestion: 'Custom suggestion',
        severity: 'warning' as const
      };

      service.addOptimizationRule(customRule);
      
      const analysis = service.analyzeQuery('SELECT * FROM posts WHERE CUSTOM_PATTERN', 100);
      
      expect(analysis.optimizationSuggestions).toContain('Custom Rule: Custom suggestion');
    });
  });

  describe('Cleanup', () => {
    it('should clean up old analyses and alerts', async () => {
      // Add some analyses
      service.analyzeQuery('SELECT * FROM posts', 100);
      service.analyzeQuery('SELECT * FROM posts WHERE slow', 1500); // Creates alert
      
      expect(service.getQueryAnalyses()).toHaveLength(2);
      expect(service.getAlerts()).toHaveLength(1);
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Cleanup with very short retention (should remove everything)
      service.cleanup(5); // 5ms retention
      
      expect(service.getQueryAnalyses()).toHaveLength(0);
      expect(service.getAlerts()).toHaveLength(0);
    });
  });
});

describe('Singleton Database Optimization Service', () => {
  it('should return the same instance', () => {
    const service1 = getDatabaseOptimizationService();
    const service2 = getDatabaseOptimizationService();
    
    expect(service1).toBe(service2);
  });
});