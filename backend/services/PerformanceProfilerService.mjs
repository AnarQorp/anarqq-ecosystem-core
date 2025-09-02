/**
 * Performance Profiler Service
 * Provides performance profiling and bottleneck identification tools
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export class PerformanceProfilerService extends EventEmitter {
  constructor() {
    super();
    this.profiles = new Map();
    this.bottlenecks = new Map();
    this.thresholds = {
      slowQuery: 100, // ms
      slowRequest: 200, // ms
      highMemory: 100 * 1024 * 1024, // 100MB
      highCpu: 80 // percentage
    };
    this.metrics = {
      requests: new Map(),
      queries: new Map(),
      memory: [],
      cpu: []
    };
  }

  /**
   * Start profiling a request or operation
   */
  startProfile(id, metadata = {}) {
    const profile = {
      id,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      metadata,
      checkpoints: [],
      queries: [],
      operations: []
    };

    this.profiles.set(id, profile);
    return profile;
  }

  /**
   * Add a checkpoint to track operation progress
   */
  checkpoint(id, name, metadata = {}) {
    const profile = this.profiles.get(id);
    if (!profile) return;

    const checkpoint = {
      name,
      timestamp: performance.now(),
      duration: performance.now() - profile.startTime,
      memory: process.memoryUsage(),
      metadata
    };

    profile.checkpoints.push(checkpoint);
    return checkpoint;
  }

  /**
   * Track database query performance
   */
  trackQuery(profileId, query, duration, metadata = {}) {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.queries.push({
        query,
        duration,
        timestamp: performance.now(),
        metadata
      });
    }

    // Track slow queries
    if (duration > this.thresholds.slowQuery) {
      this.identifyBottleneck('slow_query', {
        query,
        duration,
        profileId,
        metadata
      });
    }

    // Update query metrics
    const queryKey = this.normalizeQuery(query);
    if (!this.metrics.queries.has(queryKey)) {
      this.metrics.queries.set(queryKey, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }

    const queryMetrics = this.metrics.queries.get(queryKey);
    queryMetrics.count++;
    queryMetrics.totalDuration += duration;
    queryMetrics.avgDuration = queryMetrics.totalDuration / queryMetrics.count;
    queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);
    queryMetrics.minDuration = Math.min(queryMetrics.minDuration, duration);
  }

  /**
   * End profiling and generate report
   */
  endProfile(id) {
    const profile = this.profiles.get(id);
    if (!profile) return null;

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const totalDuration = endTime - profile.startTime;

    const report = {
      id: profile.id,
      metadata: profile.metadata,
      duration: totalDuration,
      memoryUsage: {
        start: profile.startMemory,
        end: endMemory,
        delta: {
          rss: endMemory.rss - profile.startMemory.rss,
          heapUsed: endMemory.heapUsed - profile.startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - profile.startMemory.heapTotal,
          external: endMemory.external - profile.startMemory.external
        }
      },
      checkpoints: profile.checkpoints,
      queries: profile.queries,
      operations: profile.operations,
      bottlenecks: this.analyzeBottlenecks(profile),
      recommendations: this.generateRecommendations(profile, totalDuration)
    };

    // Track request metrics
    this.updateRequestMetrics(profile.metadata.module, totalDuration);

    // Check for performance issues
    if (totalDuration > this.thresholds.slowRequest) {
      this.identifyBottleneck('slow_request', {
        profileId: id,
        duration: totalDuration,
        metadata: profile.metadata
      });
    }

    this.profiles.delete(id);
    this.emit('profile_completed', report);

    return report;
  }

  /**
   * Identify and track bottlenecks
   */
  identifyBottleneck(type, data) {
    const bottleneckId = `${type}_${Date.now()}`;
    const bottleneck = {
      id: bottleneckId,
      type,
      timestamp: new Date().toISOString(),
      data,
      severity: this.calculateSeverity(type, data),
      impact: this.calculateImpact(type, data)
    };

    this.bottlenecks.set(bottleneckId, bottleneck);
    this.emit('bottleneck_identified', bottleneck);

    // Auto-cleanup old bottlenecks
    this.cleanupOldBottlenecks();

    return bottleneck;
  }

  /**
   * Analyze profile for bottlenecks
   */
  analyzeBottlenecks(profile) {
    const bottlenecks = [];

    // Analyze checkpoints for slow operations
    for (let i = 1; i < profile.checkpoints.length; i++) {
      const prev = profile.checkpoints[i - 1];
      const curr = profile.checkpoints[i];
      const stepDuration = curr.timestamp - prev.timestamp;

      if (stepDuration > 50) { // 50ms threshold
        bottlenecks.push({
          type: 'slow_operation',
          operation: curr.name,
          duration: stepDuration,
          percentage: (stepDuration / (curr.duration)) * 100
        });
      }
    }

    // Analyze memory usage
    const memoryDelta = profile.checkpoints.length > 0 
      ? profile.checkpoints[profile.checkpoints.length - 1].memory.heapUsed - profile.startMemory.heapUsed
      : 0;

    if (memoryDelta > this.thresholds.highMemory) {
      bottlenecks.push({
        type: 'high_memory_usage',
        memoryDelta,
        percentage: (memoryDelta / profile.startMemory.heapUsed) * 100
      });
    }

    // Analyze query patterns
    const slowQueries = profile.queries.filter(q => q.duration > this.thresholds.slowQuery);
    if (slowQueries.length > 0) {
      bottlenecks.push({
        type: 'slow_queries',
        count: slowQueries.length,
        totalDuration: slowQueries.reduce((sum, q) => sum + q.duration, 0),
        queries: slowQueries
      });
    }

    return bottlenecks;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(profile, totalDuration) {
    const recommendations = [];

    // Query optimization recommendations
    const slowQueries = profile.queries.filter(q => q.duration > this.thresholds.slowQuery);
    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'query_optimization',
        priority: 'high',
        description: `${slowQueries.length} slow queries detected`,
        suggestions: [
          'Add database indexes for frequently queried fields',
          'Consider query result caching',
          'Optimize query structure and joins',
          'Use query pagination for large result sets'
        ]
      });
    }

    // Memory optimization recommendations
    const memoryDelta = profile.checkpoints.length > 0 
      ? profile.checkpoints[profile.checkpoints.length - 1].memory.heapUsed - profile.startMemory.heapUsed
      : 0;

    if (memoryDelta > this.thresholds.highMemory) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'medium',
        description: `High memory usage detected: ${Math.round(memoryDelta / 1024 / 1024)}MB`,
        suggestions: [
          'Implement object pooling for frequently created objects',
          'Use streaming for large data processing',
          'Clear unused references and implement garbage collection hints',
          'Consider pagination for large datasets'
        ]
      });
    }

    // Request duration recommendations
    if (totalDuration > this.thresholds.slowRequest) {
      recommendations.push({
        type: 'request_optimization',
        priority: 'high',
        description: `Slow request detected: ${Math.round(totalDuration)}ms`,
        suggestions: [
          'Implement response caching',
          'Optimize critical path operations',
          'Consider asynchronous processing for non-critical operations',
          'Implement request batching where applicable'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get performance metrics summary
   */
  getMetrics() {
    return {
      requests: Object.fromEntries(this.metrics.requests),
      queries: Object.fromEntries(this.metrics.queries),
      bottlenecks: Array.from(this.bottlenecks.values()),
      systemMetrics: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  /**
   * Get bottleneck analysis
   */
  getBottlenecks(timeRange = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeRange;
    return Array.from(this.bottlenecks.values())
      .filter(b => new Date(b.timestamp).getTime() > cutoff)
      .sort((a, b) => b.severity - a.severity);
  }

  /**
   * Helper methods
   */
  normalizeQuery(query) {
    // Normalize SQL queries by removing parameters
    return query.replace(/\$\d+|'[^']*'|\d+/g, '?').trim();
  }

  updateRequestMetrics(module, duration) {
    if (!this.metrics.requests.has(module)) {
      this.metrics.requests.set(module, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      });
    }

    const metrics = this.metrics.requests.get(module);
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.minDuration = Math.min(metrics.minDuration, duration);
  }

  calculateSeverity(type, data) {
    switch (type) {
      case 'slow_query':
        return Math.min(10, Math.floor(data.duration / 100));
      case 'slow_request':
        return Math.min(10, Math.floor(data.duration / 200));
      case 'high_memory':
        return Math.min(10, Math.floor(data.memoryDelta / (50 * 1024 * 1024)));
      default:
        return 5;
    }
  }

  calculateImpact(type, data) {
    // Calculate business impact based on type and data
    const impacts = {
      slow_query: 'medium',
      slow_request: 'high',
      high_memory: 'medium',
      high_cpu: 'high'
    };
    return impacts[type] || 'low';
  }

  cleanupOldBottlenecks() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const [id, bottleneck] of this.bottlenecks.entries()) {
      if (new Date(bottleneck.timestamp).getTime() < cutoff) {
        this.bottlenecks.delete(id);
      }
    }
  }
}

export default PerformanceProfilerService;