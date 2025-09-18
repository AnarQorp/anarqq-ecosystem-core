import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * ObservabilityService - Comprehensive observability and SLO monitoring
 * Implements health endpoints, metrics collection, and SLO tracking
 */
class ObservabilityService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.dependencies = new Map();
    this.sloTargets = {
      latency: {
        p50: 50,    // 50ms
        p95: 150,   // 150ms
        p99: 200    // 200ms
      },
      availability: {
        uptime: 99.9,      // 99.9%
        errorBudget: 0.1   // 0.1% error rate
      },
      throughput: {
        rps: 1000,         // Requests per second
        concurrent: 100    // Concurrent requests
      }
    };
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.latencyBuffer = [];
    this.maxLatencyBufferSize = 1000;
    
    // Initialize core metrics
    this.initializeMetrics();
    
    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Initialize core metrics tracking
   */
  initializeMetrics() {
    this.metrics.set('uptime', 0);
    this.metrics.set('requestCount', 0);
    this.metrics.set('errorCount', 0);
    this.metrics.set('errorRate', 0);
    this.metrics.set('avgResponseTime', 0);
    this.metrics.set('p50Latency', 0);
    this.metrics.set('p95Latency', 0);
    this.metrics.set('p99Latency', 0);
    this.metrics.set('currentRPS', 0);
    this.metrics.set('concurrentRequests', 0);
    this.metrics.set('memoryUsage', 0);
    this.metrics.set('cpuUsage', 0);
  }

  /**
   * Register a dependency for health monitoring
   */
  registerDependency(name, healthCheckFn, options = {}) {
    this.dependencies.set(name, {
      name,
      healthCheck: healthCheckFn,
      status: 'unknown',
      latency: 0,
      lastCheck: null,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    });
  }

  /**
   * Record request metrics
   */
  recordRequest(duration, statusCode, path, method) {
    this.requestCount++;
    this.metrics.set('requestCount', this.requestCount);

    // Track errors
    if (statusCode >= 400) {
      this.errorCount++;
      this.metrics.set('errorCount', this.errorCount);
    }

    // Update error rate
    const errorRate = (this.errorCount / this.requestCount) * 100;
    this.metrics.set('errorRate', errorRate);

    // Track latency
    this.latencyBuffer.push(duration);
    if (this.latencyBuffer.length > this.maxLatencyBufferSize) {
      this.latencyBuffer.shift();
    }

    // Update latency percentiles
    this.updateLatencyMetrics();

    // Emit SLO violation events
    this.checkSLOViolations(duration, statusCode);

    // Emit metrics event
    this.emit('request', {
      duration,
      statusCode,
      path,
      method,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update latency percentile metrics
   */
  updateLatencyMetrics() {
    if (this.latencyBuffer.length === 0) return;

    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    const len = sorted.length;

    const p50 = sorted[Math.floor(len * 0.5)];
    const p95 = sorted[Math.floor(len * 0.95)];
    const p99 = sorted[Math.floor(len * 0.99)];
    const avg = sorted.reduce((sum, val) => sum + val, 0) / len;

    this.metrics.set('p50Latency', p50);
    this.metrics.set('p95Latency', p95);
    this.metrics.set('p99Latency', p99);
    this.metrics.set('avgResponseTime', avg);
  }

  /**
   * Check for SLO violations and emit alerts
   */
  checkSLOViolations(duration, statusCode) {
    const p99 = this.metrics.get('p99Latency');
    const errorRate = this.metrics.get('errorRate');

    // Check latency SLO
    if (p99 > this.sloTargets.latency.p99) {
      this.emit('slo-violation', {
        type: 'latency',
        metric: 'p99',
        value: p99,
        target: this.sloTargets.latency.p99,
        severity: 'warning',
        timestamp: new Date().toISOString()
      });
    }

    // Check error rate SLO
    if (errorRate > this.sloTargets.availability.errorBudget) {
      this.emit('slo-violation', {
        type: 'error-rate',
        metric: 'errorRate',
        value: errorRate,
        target: this.sloTargets.availability.errorBudget,
        severity: 'critical',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start periodic health checks for dependencies
   */
  startHealthChecks() {
    setInterval(async () => {
      await this.checkAllDependencies();
      this.updateSystemMetrics();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check health of all registered dependencies
   */
  async checkAllDependencies() {
    const promises = Array.from(this.dependencies.values()).map(dep => 
      this.checkDependencyHealth(dep)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Check health of a specific dependency
   */
  async checkDependencyHealth(dependency) {
    const startTime = performance.now();
    
    try {
      const result = await Promise.race([
        dependency.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), dependency.timeout)
        )
      ]);

      const latency = performance.now() - startTime;
      
      dependency.status = result ? 'up' : 'down';
      dependency.latency = latency;
      dependency.lastCheck = new Date().toISOString();
      dependency.retryCount = 0;

      this.emit('dependency-health', {
        name: dependency.name,
        status: dependency.status,
        latency,
        timestamp: dependency.lastCheck
      });

    } catch (error) {
      const latency = performance.now() - startTime;
      
      dependency.status = 'down';
      dependency.latency = latency;
      dependency.lastCheck = new Date().toISOString();
      dependency.retryCount++;

      this.emit('dependency-health', {
        name: dependency.name,
        status: 'down',
        error: error.message,
        latency,
        timestamp: dependency.lastCheck
      });

      // Emit critical alert for critical dependencies
      if (dependency.critical) {
        this.emit('critical-dependency-down', {
          name: dependency.name,
          error: error.message,
          retryCount: dependency.retryCount,
          timestamp: dependency.lastCheck
        });
      }
    }
  }

  /**
   * Update system-level metrics
   */
  updateSystemMetrics() {
    const uptime = Date.now() - this.startTime;
    this.metrics.set('uptime', uptime);

    // Memory usage
    const memUsage = process.memoryUsage();
    this.metrics.set('memoryUsage', {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    });

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.metrics.set('cpuUsage', cpuUsage);
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus() {
    const uptime = this.metrics.get('uptime');
    const errorRate = this.metrics.get('errorRate');
    
    // Determine overall health status
    let status = 'healthy';
    const criticalDepsDown = Array.from(this.dependencies.values())
      .filter(dep => dep.critical && dep.status === 'down');
    
    if (criticalDepsDown.length > 0) {
      status = 'unhealthy';
    } else if (errorRate > this.sloTargets.availability.errorBudget * 0.8) {
      status = 'degraded';
    }

    // Build dependency status
    const dependencies = {};
    for (const [name, dep] of this.dependencies) {
      dependencies[name] = {
        status: dep.status,
        latency: dep.latency,
        lastCheck: dep.lastCheck
      };
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      dependencies,
      metrics: {
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        requestCount: this.metrics.get('requestCount'),
        errorRate: this.metrics.get('errorRate'),
        avgResponseTime: this.metrics.get('avgResponseTime')
      },
      slo: {
        latency: {
          p50: this.metrics.get('p50Latency'),
          p95: this.metrics.get('p95Latency'),
          p99: this.metrics.get('p99Latency'),
          targets: this.sloTargets.latency
        },
        availability: {
          uptime: ((uptime / 1000) / (uptime / 1000 + (this.errorCount * 0.1))) * 100,
          errorRate: this.metrics.get('errorRate'),
          targets: this.sloTargets.availability
        }
      }
    };
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics() {
    const metrics = {};
    for (const [key, value] of this.metrics) {
      metrics[key] = value;
    }
    return {
      timestamp: new Date().toISOString(),
      metrics,
      sloTargets: this.sloTargets
    };
  }

  /**
   * Update SLO targets
   */
  updateSLOTargets(newTargets) {
    this.sloTargets = { ...this.sloTargets, ...newTargets };
    this.emit('slo-targets-updated', this.sloTargets);
  }

  /**
   * Register a custom metric
   */
  registerMetric(name, type, options = {}) {
    const metric = {
      name,
      type,
      help: options.help || `${name} metric`,
      labelNames: options.labelNames || [],
      value: type === 'counter' ? 0 : null,
      labels: new Map()
    };
    
    this.metrics.set(name, metric);
    console.log(`[ObservabilityService] Registered metric: ${name} (${type})`);
    return metric;
  }

  /**
   * Update a custom metric value
   */
  updateMetric(name, value, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[ObservabilityService] Metric not found: ${name}`);
      return;
    }

    if (Object.keys(labels).length > 0) {
      const labelKey = JSON.stringify(labels);
      metric.labels.set(labelKey, value);
    } else {
      metric.value = value;
    }
  }

  /**
   * Increment a counter metric
   */
  incrementMetric(name, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      console.warn(`[ObservabilityService] Counter metric not found: ${name}`);
      return;
    }

    if (Object.keys(labels).length > 0) {
      const labelKey = JSON.stringify(labels);
      const currentValue = metric.labels.get(labelKey) || 0;
      metric.labels.set(labelKey, currentValue + 1);
    } else {
      metric.value = (metric.value || 0) + 1;
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.latencyBuffer = [];
    this.initializeMetrics();
  }
}

export default ObservabilityService;