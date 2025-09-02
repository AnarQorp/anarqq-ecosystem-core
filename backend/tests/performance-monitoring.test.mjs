/**
 * Performance Monitoring System Tests
 * Tests for profiling, caching, metrics, regression detection, and capacity planning
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PerformanceProfilerService from '../services/PerformanceProfilerService.mjs';
import CachingService from '../services/CachingService.mjs';
import AdvancedMetricsService from '../services/AdvancedMetricsService.mjs';
import PerformanceRegressionService from '../services/PerformanceRegressionService.mjs';
import CapacityPlanningService from '../services/CapacityPlanningService.mjs';

describe('Performance Monitoring System', () => {
  let profiler, cache, metrics, regression, capacity;

  beforeEach(() => {
    profiler = new PerformanceProfilerService();
    cache = new CachingService();
    metrics = new AdvancedMetricsService();
    regression = new PerformanceRegressionService();
    capacity = new CapacityPlanningService();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('PerformanceProfilerService', () => {
    it('should start and end profiling correctly', () => {
      const profile = profiler.startProfile('test-1', { module: 'test' });
      expect(profile).toBeDefined();
      expect(profile.id).toBe('test-1');
      expect(profile.startTime).toBeDefined();

      const report = profiler.endProfile('test-1');
      expect(report).toBeDefined();
      expect(report.duration).toBeGreaterThan(0);
    });

    it('should track checkpoints', () => {
      profiler.startProfile('test-2');
      const checkpoint = profiler.checkpoint('test-2', 'database-query');
      expect(checkpoint).toBeDefined();
      expect(checkpoint.name).toBe('database-query');

      const report = profiler.endProfile('test-2');
      expect(report.checkpoints).toHaveLength(1);
    });

    it('should identify bottlenecks', () => {
      const bottleneck = profiler.identifyBottleneck('slow_query', {
        query: 'SELECT * FROM users',
        duration: 500
      });
      
      expect(bottleneck).toBeDefined();
      expect(bottleneck.type).toBe('slow_query');
      expect(bottleneck.severity).toBeGreaterThan(0);
    });
  });

  describe('CachingService', () => {
    it('should set and get cache values', async () => {
      await cache.set('test-cache', 'key1', { data: 'test' });
      const value = await cache.get('test-cache', 'key1');
      expect(value).toEqual({ data: 'test' });
    });

    it('should handle cache misses', async () => {
      const value = await cache.get('test-cache', 'nonexistent');
      expect(value).toBeNull();
    });

    it('should cache queries with automatic key generation', async () => {
      const executor = async () => ({ result: 'query-result' });
      const result = await cache.cacheQuery('SELECT * FROM users', {}, executor);
      expect(result).toEqual({ result: 'query-result' });

      // Second call should hit cache
      const cachedResult = await cache.cacheQuery('SELECT * FROM users', {}, executor);
      expect(cachedResult).toEqual({ result: 'query-result' });
    });
  });

  describe('AdvancedMetricsService', () => {
    it('should record and retrieve metrics', () => {
      metrics.record('test_metric', 100, { module: 'test' });
      const metric = metrics.getMetric('test_metric', { module: 'test' });
      
      expect(metric).toBeDefined();
      expect(metric.values).toHaveLength(1);
      expect(metric.stats.avg).toBe(100);
    });

    it('should calculate SLO status', () => {
      // Record some request metrics
      metrics.recordRequest('test-module', '/api/test', 50, 200);
      metrics.recordRequest('test-module', '/api/test', 300, 200); // Slow request
      
      const sloStatus = metrics.getSLOStatus();
      expect(sloStatus).toBeDefined();
      expect(sloStatus.overall).toBeDefined();
    });

    it('should detect anomalies', () => {
      // Record baseline data
      for (let i = 0; i < 20; i++) {
        metrics.record('anomaly_test', 100 + Math.random() * 10);
      }
      
      // Record anomalous value
      metrics.record('anomaly_test', 500); // Significant deviation
      
      const anomalies = metrics.detectAnomalies('anomaly_test');
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('PerformanceRegressionService', () => {
    it('should establish baseline and detect regressions', async () => {
      const baselineMetrics = Array.from({ length: 100 }, () => 100 + Math.random() * 20);
      const baseline = regression.establishBaseline('test-endpoint', baselineMetrics);
      
      expect(baseline).toBeDefined();
      expect(baseline.metrics.mean).toBeGreaterThan(100);
      expect(baseline.metrics.mean).toBeLessThan(120); // Range check instead of exact value

      // Test with regressed performance
      const regressedMetrics = Array.from({ length: 100 }, () => 150 + Math.random() * 20);
      const result = await regression.runRegressionTest('test-endpoint', regressedMetrics);
      
      expect(result.verdict.status).toBe('regression');
    });

    it('should run benchmarks', async () => {
      const testFunction = async () => {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      regression.addBenchmark('test-benchmark', testFunction, { iterations: 10 });
      const result = await regression.runBenchmark('test-benchmark');
      
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(10);
      expect(result.statistics.mean).toBeGreaterThan(0);
    });
  });

  describe('CapacityPlanningService', () => {
    it('should record usage and analyze capacity', () => {
      // Record usage data
      for (let i = 0; i < 60; i++) {
        capacity.recordUsage('cpu', 50 + Math.random() * 30, Date.now() - i * 60000);
      }

      const analysis = capacity.analyzeCapacity('cpu');
      expect(analysis).toBeDefined();
      expect(analysis.current).toBeDefined();
      expect(analysis.trends).toBeDefined();
      expect(analysis.forecast).toBeDefined();
    });

    it('should generate auto-scaling configuration', () => {
      // Record some usage data first
      for (let i = 0; i < 100; i++) {
        capacity.recordUsage('requests', 10 + Math.random() * 5);
      }

      capacity.analyzeCapacity('requests');
      const config = capacity.generateAutoScalingConfig('requests', 70);
      
      expect(config).toBeDefined();
      expect(config.targetUtilization).toBe(70);
      expect(config.scaleUpPolicy).toBeDefined();
      expect(config.scaleDownPolicy).toBeDefined();
    });

    it('should assess scaling needs', () => {
      const usage = Array.from({ length: 20 }, (_, i) => ({
        value: 80 + Math.random() * 20, // High usage
        timestamp: Date.now() - i * 60000
      }));

      const assessment = capacity.assessScalingNeeds('cpu', usage);
      expect(assessment).toBeDefined();
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      const scaleUpRec = assessment.recommendations.find(r => r.action === 'scale_up');
      expect(scaleUpRec).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should coordinate between services', async () => {
      // Start profiling
      const profile = profiler.startProfile('integration-test', { module: 'test' });
      
      // Record metrics
      metrics.recordRequest('test-module', '/api/integration', 150, 200);
      
      // Cache some data
      await cache.set('integration-cache', 'test-key', { data: 'integration-test' });
      
      // Record capacity usage
      capacity.recordUsage('requests', 1);
      
      // End profiling
      const report = profiler.endProfile('integration-test');
      
      expect(report).toBeDefined();
      expect(report.duration).toBeGreaterThan(0);
      
      const cached = await cache.get('integration-cache', 'test-key');
      expect(cached).toEqual({ data: 'integration-test' });
      
      const metricsData = metrics.getMetrics('request_duration_ms');
      expect(metricsData.size).toBeGreaterThan(0);
    });

    it('should generate comprehensive recommendations', async () => {
      // Create conditions that should generate recommendations
      
      // High latency requests
      for (let i = 0; i < 10; i++) {
        metrics.recordRequest('slow-module', '/api/slow', 500, 200);
      }
      
      // Cache misses - simulate slow queries
      const slowExecutor = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { result: 'slow-data' };
      };
      
      // Execute multiple slow queries to generate optimization recommendations
      for (let i = 0; i < 10; i++) {
        await cache.cacheQuery('SELECT * FROM slow_table WHERE id = ?', { id: i }, slowExecutor);
      }
      
      // Execute the same query multiple times to create cache miss patterns
      for (let i = 0; i < 5; i++) {
        await cache.cacheQuery('SELECT COUNT(*) FROM users', {}, slowExecutor);
      }
      
      // High resource usage
      for (let i = 0; i < 50; i++) {
        capacity.recordUsage('cpu', 85 + Math.random() * 10);
      }
      
      const insights = metrics.getInsights();
      const cacheOptimizations = cache.getQueryOptimizations();
      const capacityAnalysis = capacity.analyzeCapacity('cpu');
      
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(cacheOptimizations.length).toBeGreaterThan(0);
      expect(capacityAnalysis.recommendations.length).toBeGreaterThan(0);
    });
  });
});