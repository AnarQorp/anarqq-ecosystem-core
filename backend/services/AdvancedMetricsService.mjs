/**
 * Advanced Metrics Service
 * Provides comprehensive metrics collection and anomaly detection
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export class AdvancedMetricsService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      retentionPeriod: options.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      aggregationInterval: options.aggregationInterval || 60000, // 1 minute
      anomalyThreshold: options.anomalyThreshold || 2, // 2 standard deviations
      ...options
    };

    this.metrics = new Map();
    this.timeSeries = new Map();
    this.anomalies = new Map();
    this.baselines = new Map();
    
    // SLO definitions
    this.slos = {
      latency: {
        p50: 50,   // 50ms
        p95: 150,  // 150ms
        p99: 200   // 200ms
      },
      availability: {
        uptime: 99.9,      // 99.9%
        errorBudget: 0.1   // 0.1%
      },
      throughput: {
        minRps: 10,        // minimum requests per second
        maxRps: 1000       // maximum sustainable RPS
      }
    };

    this.collectors = new Map();
    this.startAggregation();
  }

  /**
   * Register a metric collector
   */
  registerCollector(name, collector) {
    this.collectors.set(name, collector);
    this.emit('collector_registered', { name });
  }

  /**
   * Record a metric value
   */
  record(metricName, value, labels = {}, timestamp = Date.now()) {
    const key = this.getMetricKey(metricName, labels);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        name: metricName,
        labels,
        values: [],
        stats: {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          avg: 0,
          p50: 0,
          p95: 0,
          p99: 0
        },
        lastUpdated: timestamp
      });
    }

    const metric = this.metrics.get(key);
    metric.values.push({ value, timestamp });
    metric.lastUpdated = timestamp;

    // Update statistics
    this.updateStats(metric);

    // Check for anomalies
    this.checkAnomaly(key, value, timestamp);

    // Emit metric recorded event
    this.emit('metric_recorded', { metricName, value, labels, timestamp });

    // Cleanup old values
    this.cleanupOldValues(metric);
  }

  /**
   * Record request metrics
   */
  recordRequest(module, endpoint, duration, statusCode, labels = {}) {
    const baseLabels = { module, endpoint, status: statusCode, ...labels };
    
    this.record('request_duration_ms', duration, baseLabels);
    this.record('request_count', 1, baseLabels);
    
    if (statusCode >= 400) {
      this.record('error_count', 1, baseLabels);
    }

    // Check SLO violations
    this.checkSLOViolation('latency', duration, baseLabels);
  }

  /**
   * Record business metrics
   */
  recordBusiness(metricName, value, labels = {}) {
    this.record(`business_${metricName}`, value, labels);
  }

  /**
   * Record system metrics
   */
  recordSystem() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const timestamp = Date.now();

    this.record('system_memory_rss', memUsage.rss, {}, timestamp);
    this.record('system_memory_heap_used', memUsage.heapUsed, {}, timestamp);
    this.record('system_memory_heap_total', memUsage.heapTotal, {}, timestamp);
    this.record('system_memory_external', memUsage.external, {}, timestamp);
    
    this.record('system_cpu_user', cpuUsage.user, {}, timestamp);
    this.record('system_cpu_system', cpuUsage.system, {}, timestamp);
    
    this.record('system_uptime', process.uptime(), {}, timestamp);
  }

  /**
   * Get metric values
   */
  getMetric(metricName, labels = {}) {
    const key = this.getMetricKey(metricName, labels);
    return this.metrics.get(key);
  }

  /**
   * Get all metrics matching a pattern
   */
  getMetrics(pattern) {
    const regex = new RegExp(pattern);
    const results = new Map();
    
    for (const [key, metric] of this.metrics.entries()) {
      if (regex.test(metric.name)) {
        results.set(key, metric);
      }
    }
    
    return results;
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(metricName, labels = {}, timeRange = 3600000) { // 1 hour default
    const key = this.getMetricKey(metricName, labels);
    const metric = this.metrics.get(key);
    
    if (!metric) return null;

    const cutoff = Date.now() - timeRange;
    return metric.values.filter(v => v.timestamp > cutoff);
  }

  /**
   * Get SLO compliance status
   */
  getSLOStatus(timeRange = 3600000) {
    const status = {
      latency: this.getLatencySLOStatus(timeRange),
      availability: this.getAvailabilitySLOStatus(timeRange),
      throughput: this.getThroughputSLOStatus(timeRange),
      overall: 'healthy'
    };

    // Determine overall status
    const statuses = [status.latency.status, status.availability.status, status.throughput.status];
    if (statuses.includes('critical')) {
      status.overall = 'critical';
    } else if (statuses.includes('warning')) {
      status.overall = 'warning';
    }

    return status;
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(metricName, labels = {}) {
    const key = this.getMetricKey(metricName, labels);
    const anomalies = [];
    
    if (this.anomalies.has(key)) {
      const metricAnomalies = this.anomalies.get(key);
      const cutoff = Date.now() - this.config.retentionPeriod;
      
      for (const anomaly of metricAnomalies) {
        if (anomaly.timestamp > cutoff) {
          anomalies.push(anomaly);
        }
      }
    }
    
    return anomalies;
  }

  /**
   * Get performance insights and recommendations
   */
  getInsights() {
    const insights = {
      performance: this.getPerformanceInsights(),
      anomalies: this.getAnomalyInsights(),
      slo: this.getSLOInsights(),
      recommendations: this.getRecommendations()
    };

    return insights;
  }

  /**
   * Helper methods
   */
  getMetricKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  updateStats(metric) {
    const values = metric.values.map(v => v.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    metric.stats.count = values.length;
    metric.stats.sum = values.reduce((sum, v) => sum + v, 0);
    metric.stats.min = Math.min(...values);
    metric.stats.max = Math.max(...values);
    metric.stats.avg = metric.stats.sum / metric.stats.count;
    
    // Calculate percentiles
    metric.stats.p50 = this.percentile(sorted, 0.5);
    metric.stats.p95 = this.percentile(sorted, 0.95);
    metric.stats.p99 = this.percentile(sorted, 0.99);
  }

  percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  checkAnomaly(key, value, timestamp) {
    if (!this.baselines.has(key)) {
      this.establishBaseline(key);
      return;
    }

    const baseline = this.baselines.get(key);
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);
    
    if (zScore > this.config.anomalyThreshold) {
      const anomaly = {
        metricKey: key,
        value,
        baseline: baseline.mean,
        zScore,
        timestamp,
        severity: zScore > 3 ? 'critical' : 'warning'
      };

      if (!this.anomalies.has(key)) {
        this.anomalies.set(key, []);
      }
      this.anomalies.get(key).push(anomaly);

      this.emit('anomaly_detected', anomaly);
    }
  }

  establishBaseline(key) {
    const metric = this.metrics.get(key);
    if (!metric || metric.values.length < 10) return;

    const values = metric.values.map(v => v.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    this.baselines.set(key, { mean, stdDev, sampleSize: values.length });
  }

  checkSLOViolation(type, value, labels) {
    let violation = false;
    let threshold = 0;

    switch (type) {
      case 'latency':
        threshold = this.slos.latency.p99;
        violation = value > threshold;
        break;
      case 'error_rate':
        threshold = this.slos.availability.errorBudget;
        violation = value > threshold;
        break;
    }

    if (violation) {
      this.emit('slo_violation', {
        type,
        value,
        threshold,
        labels,
        timestamp: Date.now()
      });
    }
  }

  getLatencySLOStatus(timeRange) {
    const latencyMetrics = this.getMetrics('request_duration_ms');
    let totalRequests = 0;
    let p99Violations = 0;

    for (const [key, metric] of latencyMetrics) {
      const recentValues = metric.values.filter(v => v.timestamp > Date.now() - timeRange);
      totalRequests += recentValues.length;
      p99Violations += recentValues.filter(v => v.value > this.slos.latency.p99).length;
    }

    const violationRate = totalRequests > 0 ? (p99Violations / totalRequests) * 100 : 0;
    
    return {
      status: violationRate > 5 ? 'critical' : violationRate > 1 ? 'warning' : 'healthy',
      violationRate,
      threshold: this.slos.latency.p99,
      totalRequests,
      violations: p99Violations
    };
  }

  getAvailabilitySLOStatus(timeRange) {
    const errorMetrics = this.getMetrics('error_count');
    const requestMetrics = this.getMetrics('request_count');
    
    let totalErrors = 0;
    let totalRequests = 0;

    for (const [key, metric] of errorMetrics) {
      totalErrors += metric.values
        .filter(v => v.timestamp > Date.now() - timeRange)
        .reduce((sum, v) => sum + v.value, 0);
    }

    for (const [key, metric] of requestMetrics) {
      totalRequests += metric.values
        .filter(v => v.timestamp > Date.now() - timeRange)
        .reduce((sum, v) => sum + v.value, 0);
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const availability = 100 - errorRate;

    return {
      status: availability < 99.5 ? 'critical' : availability < 99.9 ? 'warning' : 'healthy',
      availability,
      errorRate,
      threshold: this.slos.availability.uptime,
      totalRequests,
      totalErrors
    };
  }

  getThroughputSLOStatus(timeRange) {
    const requestMetrics = this.getMetrics('request_count');
    const windowSize = 60000; // 1 minute windows
    const windows = Math.floor(timeRange / windowSize);
    
    let avgRps = 0;
    let minRps = Infinity;
    let maxRps = 0;

    for (let i = 0; i < windows; i++) {
      const windowStart = Date.now() - timeRange + (i * windowSize);
      const windowEnd = windowStart + windowSize;
      
      let windowRequests = 0;
      for (const [key, metric] of requestMetrics) {
        windowRequests += metric.values
          .filter(v => v.timestamp >= windowStart && v.timestamp < windowEnd)
          .reduce((sum, v) => sum + v.value, 0);
      }
      
      const rps = windowRequests / (windowSize / 1000);
      avgRps += rps;
      minRps = Math.min(minRps, rps);
      maxRps = Math.max(maxRps, rps);
    }

    avgRps = avgRps / windows;
    minRps = minRps === Infinity ? 0 : minRps;

    return {
      status: avgRps < this.slos.throughput.minRps ? 'warning' : 'healthy',
      avgRps,
      minRps,
      maxRps,
      threshold: this.slos.throughput.minRps
    };
  }

  getPerformanceInsights() {
    const insights = [];
    
    // Analyze request patterns
    const requestMetrics = this.getMetrics('request_duration_ms');
    for (const [key, metric] of requestMetrics) {
      if (metric.stats.p99 > this.slos.latency.p99) {
        insights.push({
          type: 'high_latency',
          metric: key,
          value: metric.stats.p99,
          threshold: this.slos.latency.p99,
          impact: 'high'
        });
      }
    }

    return insights;
  }

  getAnomalyInsights() {
    const insights = [];
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [key, anomalies] of this.anomalies) {
      const recentAnomalies = anomalies.filter(a => a.timestamp > cutoff);
      if (recentAnomalies.length > 0) {
        insights.push({
          type: 'anomaly_cluster',
          metric: key,
          count: recentAnomalies.length,
          severity: recentAnomalies.some(a => a.severity === 'critical') ? 'critical' : 'warning'
        });
      }
    }

    return insights;
  }

  getSLOInsights() {
    const sloStatus = this.getSLOStatus();
    const insights = [];

    if (sloStatus.latency.status !== 'healthy') {
      insights.push({
        type: 'slo_violation',
        slo: 'latency',
        status: sloStatus.latency.status,
        violationRate: sloStatus.latency.violationRate
      });
    }

    if (sloStatus.availability.status !== 'healthy') {
      insights.push({
        type: 'slo_violation',
        slo: 'availability',
        status: sloStatus.availability.status,
        availability: sloStatus.availability.availability
      });
    }

    return insights;
  }

  getRecommendations() {
    const recommendations = [];
    
    // Get insights without recommendations to avoid circular dependency
    const performanceInsights = this.getPerformanceInsights();
    const anomalyInsights = this.getAnomalyInsights();
    const sloInsights = this.getSLOInsights();

    // Performance recommendations
    for (const insight of performanceInsights) {
      if (insight.type === 'high_latency') {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          title: 'High Latency Detected',
          description: `Metric ${insight.metric} has p99 latency of ${insight.value}ms`,
          actions: [
            'Implement caching for frequently accessed data',
            'Optimize database queries',
            'Consider request batching',
            'Review and optimize critical path operations'
          ]
        });
      }
    }

    // Anomaly recommendations
    for (const insight of anomalyInsights) {
      if (insight.severity === 'critical') {
        recommendations.push({
          type: 'anomaly',
          priority: 'critical',
          title: 'Critical Anomaly Detected',
          description: `${insight.count} anomalies detected in ${insight.metric}`,
          actions: [
            'Investigate root cause of anomalous behavior',
            'Check for system resource constraints',
            'Review recent deployments or configuration changes',
            'Consider implementing circuit breakers'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 3, high: 2, medium: 1, low: 0 };
      return (priority[b.priority] || 0) - (priority[a.priority] || 0);
    });
  }

  cleanupOldValues(metric) {
    const cutoff = Date.now() - this.config.retentionPeriod;
    metric.values = metric.values.filter(v => v.timestamp > cutoff);
  }

  startAggregation() {
    setInterval(() => {
      this.recordSystem();
      this.emit('metrics_aggregated', { timestamp: Date.now() });
    }, this.config.aggregationInterval);
  }
}

export default AdvancedMetricsService;