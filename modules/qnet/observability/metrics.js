/**
 * QNET Metrics Collection and Monitoring
 * 
 * Provides comprehensive metrics collection for network performance,
 * health monitoring, and SLO tracking.
 */

import { EventEmitter } from 'events';

export class QNetMetrics extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners to avoid warnings
    this.metrics = new Map();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.startTime = Date.now();
    
    this.initializeMetrics();
    this.startMetricsCollection();
  }

  /**
   * Initialize metric collectors
   */
  initializeMetrics() {
    // Request metrics
    this.counters.set('requests_total', 0);
    this.counters.set('requests_success', 0);
    this.counters.set('requests_error', 0);
    
    // Latency metrics
    this.histograms.set('request_duration', []);
    this.histograms.set('node_ping_duration', []);
    
    // Node metrics
    this.gauges.set('nodes_total', 0);
    this.gauges.set('nodes_active', 0);
    this.gauges.set('nodes_degraded', 0);
    this.gauges.set('nodes_inactive', 0);
    
    // Network metrics
    this.gauges.set('network_connections', 0);
    this.gauges.set('network_bandwidth_utilization', 0);
    this.gauges.set('network_error_rate', 0);
    
    // Performance metrics
    this.gauges.set('average_latency', 0);
    this.gauges.set('p95_latency', 0);
    this.gauges.set('p99_latency', 0);
    this.gauges.set('uptime_percentage', 100);
    
    // Security metrics
    this.counters.set('auth_attempts', 0);
    this.counters.set('auth_failures', 0);
    this.counters.set('rate_limit_violations', 0);
    this.counters.set('security_alerts', 0);
  }

  /**
   * Start periodic metrics collection
   */
  startMetricsCollection() {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.calculateDerivedMetrics();
      this.checkSLOs();
      this.emit('metrics_collected', this.getAllMetrics());
    }, 30000);

    // Reset counters every hour
    this.resetInterval = setInterval(() => {
      this.resetHourlyCounters();
    }, 3600000);
  }

  /**
   * Record request metrics
   */
  recordRequest(duration, success = true, endpoint = null) {
    this.incrementCounter('requests_total');
    
    if (success) {
      this.incrementCounter('requests_success');
    } else {
      this.incrementCounter('requests_error');
    }
    
    this.recordHistogram('request_duration', duration);
    
    // Emit real-time metric
    this.emit('request_recorded', {
      duration,
      success,
      endpoint,
      timestamp: Date.now()
    });
  }

  /**
   * Record node ping result
   */
  recordNodePing(nodeId, latency, success = true) {
    if (success) {
      this.recordHistogram('node_ping_duration', latency);
    }
    
    this.emit('node_ping_recorded', {
      nodeId,
      latency,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Update node status metrics
   */
  updateNodeStatus(totalNodes, activeNodes, degradedNodes, inactiveNodes) {
    this.setGauge('nodes_total', totalNodes);
    this.setGauge('nodes_active', activeNodes);
    this.setGauge('nodes_degraded', degradedNodes);
    this.setGauge('nodes_inactive', inactiveNodes);
    
    this.emit('node_status_updated', {
      totalNodes,
      activeNodes,
      degradedNodes,
      inactiveNodes,
      timestamp: Date.now()
    });
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(success = true, reason = null) {
    this.incrementCounter('auth_attempts');
    
    if (!success) {
      this.incrementCounter('auth_failures');
    }
    
    this.emit('auth_attempt_recorded', {
      success,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Record rate limit violation
   */
  recordRateLimitViolation(identity, endpoint) {
    this.incrementCounter('rate_limit_violations');
    
    this.emit('rate_limit_violation', {
      identity,
      endpoint,
      timestamp: Date.now()
    });
  }

  /**
   * Record security alert
   */
  recordSecurityAlert(alertType, severity, details) {
    this.incrementCounter('security_alerts');
    
    this.emit('security_alert', {
      alertType,
      severity,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Increment counter metric
   */
  incrementCounter(name, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Set gauge metric
   */
  setGauge(name, value) {
    this.gauges.set(name, value);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name, value) {
    const values = this.histograms.get(name) || [];
    values.push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(name, values);
  }

  /**
   * Calculate percentile from histogram
   */
  calculatePercentile(histogramName, percentile) {
    const values = this.histograms.get(histogramName) || [];
    if (values.length === 0) return 0;
    
    const sortedValues = values
      .map(v => v.value)
      .sort((a, b) => a - b);
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Calculate average from histogram
   */
  calculateAverage(histogramName) {
    const values = this.histograms.get(histogramName) || [];
    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, v) => acc + v.value, 0);
    return sum / values.length;
  }

  /**
   * Collect system-level metrics
   */
  collectSystemMetrics() {
    // Calculate uptime
    const uptime = (Date.now() - this.startTime) / 1000;
    const uptimeHours = uptime / 3600;
    
    // Memory usage (if available)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.setGauge('memory_used_bytes', memory.heapUsed);
      this.setGauge('memory_total_bytes', memory.heapTotal);
    }
    
    // CPU usage (simplified)
    this.setGauge('cpu_usage_percent', Math.random() * 100); // Mock for now
    
    this.emit('system_metrics_collected', {
      uptime,
      uptimeHours,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate derived metrics
   */
  calculateDerivedMetrics() {
    // Calculate error rate
    const totalRequests = this.counters.get('requests_total') || 0;
    const errorRequests = this.counters.get('requests_error') || 0;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
    this.setGauge('network_error_rate', errorRate);
    
    // Calculate latency percentiles
    const avgLatency = this.calculateAverage('request_duration');
    const p95Latency = this.calculatePercentile('request_duration', 95);
    const p99Latency = this.calculatePercentile('request_duration', 99);
    
    this.setGauge('average_latency', avgLatency);
    this.setGauge('p95_latency', p95Latency);
    this.setGauge('p99_latency', p99Latency);
    
    // Calculate authentication failure rate
    const totalAuth = this.counters.get('auth_attempts') || 0;
    const failedAuth = this.counters.get('auth_failures') || 0;
    const authFailureRate = totalAuth > 0 ? failedAuth / totalAuth : 0;
    this.setGauge('auth_failure_rate', authFailureRate);
  }

  /**
   * Check SLO compliance
   */
  checkSLOs() {
    const slos = {
      p99_latency: { threshold: 200, current: this.gauges.get('p99_latency') },
      uptime: { threshold: 99.9, current: this.gauges.get('uptime_percentage') },
      error_rate: { threshold: 0.1, current: this.gauges.get('network_error_rate') * 100 }
    };
    
    for (const [metric, slo] of Object.entries(slos)) {
      const violated = metric === 'uptime' 
        ? slo.current < slo.threshold
        : slo.current > slo.threshold;
      
      if (violated) {
        this.emit('slo_violation', {
          metric,
          threshold: slo.threshold,
          current: slo.current,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Reset hourly counters
   */
  resetHourlyCounters() {
    // Archive current values before reset
    const snapshot = {
      timestamp: Date.now(),
      counters: new Map(this.counters),
      gauges: new Map(this.gauges)
    };
    
    this.emit('hourly_snapshot', snapshot);
    
    // Reset counters but keep gauges
    this.counters.set('requests_total', 0);
    this.counters.set('requests_success', 0);
    this.counters.set('requests_error', 0);
    this.counters.set('auth_attempts', 0);
    this.counters.set('auth_failures', 0);
    this.counters.set('rate_limit_violations', 0);
    this.counters.set('security_alerts', 0);
  }

  /**
   * Get all current metrics
   */
  getAllMetrics() {
    return {
      timestamp: Date.now(),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            average: this.calculateAverage(key),
            p50: this.calculatePercentile(key, 50),
            p95: this.calculatePercentile(key, 95),
            p99: this.calculatePercentile(key, 99)
          }
        ])
      )
    };
  }

  /**
   * Get metrics for specific time range
   */
  getMetricsForTimeRange(startTime, endTime) {
    const filteredHistograms = {};
    
    for (const [name, values] of this.histograms.entries()) {
      filteredHistograms[name] = values.filter(
        v => v.timestamp >= startTime && v.timestamp <= endTime
      );
    }
    
    return {
      startTime,
      endTime,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: filteredHistograms
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics() {
    let output = '';
    
    // Export counters
    for (const [name, value] of this.counters.entries()) {
      output += `# TYPE qnet_${name} counter\n`;
      output += `qnet_${name} ${value}\n`;
    }
    
    // Export gauges
    for (const [name, value] of this.gauges.entries()) {
      output += `# TYPE qnet_${name} gauge\n`;
      output += `qnet_${name} ${value}\n`;
    }
    
    // Export histogram summaries
    for (const [name] of this.histograms.entries()) {
      const avg = this.calculateAverage(name);
      const p95 = this.calculatePercentile(name, 95);
      const p99 = this.calculatePercentile(name, 99);
      
      output += `# TYPE qnet_${name}_average gauge\n`;
      output += `qnet_${name}_average ${avg}\n`;
      output += `# TYPE qnet_${name}_p95 gauge\n`;
      output += `qnet_${name}_p95 ${p95}\n`;
      output += `# TYPE qnet_${name}_p99 gauge\n`;
      output += `qnet_${name}_p99 ${p99}\n`;
    }
    
    return output;
  }

  /**
   * Stop metrics collection
   */
  stop() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }
  }
}

// Singleton instance
let metricsInstance = null;

export function getMetricsInstance() {
  if (!metricsInstance) {
    metricsInstance = new QNetMetrics();
  }
  return metricsInstance;
}

// For testing - create new instance
export function createMetricsInstance() {
  return new QNetMetrics();
}

export default QNetMetrics;