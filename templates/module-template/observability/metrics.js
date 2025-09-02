/**
 * Metrics Collection for {{MODULE_NAME}}
 * 
 * Implements comprehensive metrics collection following Q ecosystem standards
 * with Prometheus integration and SLO monitoring.
 */

import client from 'prom-client';
import { EventEmitter } from 'events';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({
  register,
  prefix: '{{MODULE_NAME}}_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

/**
 * HTTP Request Metrics
 */
const httpRequestDuration = new client.Histogram({
  name: '{{MODULE_NAME}}_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'squid_id'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
  name: '{{MODULE_NAME}}_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'squid_id']
});

const httpRequestSize = new client.Histogram({
  name: '{{MODULE_NAME}}_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000]
});

const httpResponseSize = new client.Histogram({
  name: '{{MODULE_NAME}}_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000]
});

/**
 * Authentication and Authorization Metrics
 */
const authenticationAttempts = new client.Counter({
  name: '{{MODULE_NAME}}_authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'method', 'squid_id']
});

const authorizationChecks = new client.Counter({
  name: '{{MODULE_NAME}}_authorization_checks_total',
  help: 'Total number of authorization checks',
  labelNames: ['result', 'scope', 'squid_id']
});

const activeUsers = new client.Gauge({
  name: '{{MODULE_NAME}}_active_users',
  help: 'Number of currently active users',
  labelNames: ['type'] // 'identity', 'subidentity', 'dao'
});

/**
 * Business Logic Metrics
 */
const resourceOperations = new client.Counter({
  name: '{{MODULE_NAME}}_resource_operations_total',
  help: 'Total number of resource operations',
  labelNames: ['operation', 'resource_type', 'result', 'squid_id']
});

const resourceOperationDuration = new client.Histogram({
  name: '{{MODULE_NAME}}_resource_operation_duration_seconds',
  help: 'Duration of resource operations in seconds',
  labelNames: ['operation', 'resource_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});

const resourceCount = new client.Gauge({
  name: '{{MODULE_NAME}}_resources_total',
  help: 'Total number of resources',
  labelNames: ['type', 'status']
});

/**
 * External Service Metrics
 */
const externalServiceCalls = new client.Counter({
  name: '{{MODULE_NAME}}_external_service_calls_total',
  help: 'Total number of external service calls',
  labelNames: ['service', 'operation', 'result']
});

const externalServiceDuration = new client.Histogram({
  name: '{{MODULE_NAME}}_external_service_duration_seconds',
  help: 'Duration of external service calls in seconds',
  labelNames: ['service', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});

const externalServiceAvailability = new client.Gauge({
  name: '{{MODULE_NAME}}_external_service_availability',
  help: 'Availability of external services (0-1)',
  labelNames: ['service']
});

/**
 * Storage and IPFS Metrics
 */
const ipfsOperations = new client.Counter({
  name: '{{MODULE_NAME}}_ipfs_operations_total',
  help: 'Total number of IPFS operations',
  labelNames: ['operation', 'result'] // 'add', 'get', 'pin', 'unpin'
});

const ipfsOperationDuration = new client.Histogram({
  name: '{{MODULE_NAME}}_ipfs_operation_duration_seconds',
  help: 'Duration of IPFS operations in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const ipfsStorageSize = new client.Gauge({
  name: '{{MODULE_NAME}}_ipfs_storage_bytes',
  help: 'Total IPFS storage used in bytes',
  labelNames: ['type'] // 'pinned', 'cached', 'total'
});

const ipfsPinnedObjects = new client.Gauge({
  name: '{{MODULE_NAME}}_ipfs_pinned_objects_total',
  help: 'Total number of pinned IPFS objects',
  labelNames: ['policy'] // 'permanent', 'temporary', 'conditional'
});

/**
 * Security Metrics
 */
const securityEvents = new client.Counter({
  name: '{{MODULE_NAME}}_security_events_total',
  help: 'Total number of security events',
  labelNames: ['type', 'severity', 'blocked']
});

const rateLimitHits = new client.Counter({
  name: '{{MODULE_NAME}}_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limit_type', 'squid_id']
});

const encryptionOperations = new client.Counter({
  name: '{{MODULE_NAME}}_encryption_operations_total',
  help: 'Total number of encryption operations',
  labelNames: ['operation', 'algorithm', 'result'] // 'encrypt', 'decrypt', 'sign', 'verify'
});

/**
 * Error Metrics
 */
const errors = new client.Counter({
  name: '{{MODULE_NAME}}_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code', 'severity']
});

const errorRate = new client.Gauge({
  name: '{{MODULE_NAME}}_error_rate',
  help: 'Current error rate (errors per second)',
  labelNames: ['type']
});

/**
 * SLO Metrics
 */
const sloLatency = new client.Histogram({
  name: '{{MODULE_NAME}}_slo_latency_seconds',
  help: 'SLO latency measurements',
  labelNames: ['endpoint', 'operation'],
  buckets: [0.05, 0.1, 0.15, 0.2, 0.5, 1, 2, 5]
});

const sloAvailability = new client.Gauge({
  name: '{{MODULE_NAME}}_slo_availability',
  help: 'SLO availability measurement (0-1)',
  labelNames: ['service']
});

const sloErrorBudget = new client.Gauge({
  name: '{{MODULE_NAME}}_slo_error_budget_remaining',
  help: 'Remaining error budget (0-1)',
  labelNames: ['service']
});

/**
 * Custom Metrics for {{MODULE_NAME}}
 */
// Add module-specific metrics here
const moduleSpecificMetric = new client.Counter({
  name: '{{MODULE_NAME}}_specific_operations_total',
  help: 'Total number of module-specific operations',
  labelNames: ['operation_type', 'result']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestSize);
register.registerMetric(httpResponseSize);
register.registerMetric(authenticationAttempts);
register.registerMetric(authorizationChecks);
register.registerMetric(activeUsers);
register.registerMetric(resourceOperations);
register.registerMetric(resourceOperationDuration);
register.registerMetric(resourceCount);
register.registerMetric(externalServiceCalls);
register.registerMetric(externalServiceDuration);
register.registerMetric(externalServiceAvailability);
register.registerMetric(ipfsOperations);
register.registerMetric(ipfsOperationDuration);
register.registerMetric(ipfsStorageSize);
register.registerMetric(ipfsPinnedObjects);
register.registerMetric(securityEvents);
register.registerMetric(rateLimitHits);
register.registerMetric(encryptionOperations);
register.registerMetric(errors);
register.registerMetric(errorRate);
register.registerMetric(sloLatency);
register.registerMetric(sloAvailability);
register.registerMetric(sloErrorBudget);
register.registerMetric(moduleSpecificMetric);

/**
 * Metrics Collection Class
 */
class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.startTime = Date.now();
    this.errorCounts = new Map();
    this.setupErrorRateCalculation();
  }

  /**
   * HTTP Request Metrics
   */
  recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize, squidId = 'anonymous') {
    const labels = { method, route, status_code: statusCode, squid_id: squidId };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    
    if (requestSize) {
      httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize) {
      httpResponseSize.observe({ method, route, status_code: statusCode }, responseSize);
    }

    // SLO tracking
    sloLatency.observe({ endpoint: route, operation: method }, duration);
  }

  /**
   * Authentication Metrics
   */
  recordAuthentication(result, method = 'squid', squidId = 'unknown') {
    authenticationAttempts.inc({ result, method, squid_id: squidId });
  }

  recordAuthorization(result, scope, squidId = 'unknown') {
    authorizationChecks.inc({ result, scope, squid_id: squidId });
  }

  updateActiveUsers(identityCount, subidentityCount, daoCount) {
    activeUsers.set({ type: 'identity' }, identityCount);
    activeUsers.set({ type: 'subidentity' }, subidentityCount);
    activeUsers.set({ type: 'dao' }, daoCount);
  }

  /**
   * Business Logic Metrics
   */
  recordResourceOperation(operation, resourceType, result, duration, squidId = 'unknown') {
    resourceOperations.inc({ operation, resource_type: resourceType, result, squid_id: squidId });
    resourceOperationDuration.observe({ operation, resource_type: resourceType }, duration);
  }

  updateResourceCount(type, status, count) {
    resourceCount.set({ type, status }, count);
  }

  /**
   * External Service Metrics
   */
  recordExternalServiceCall(service, operation, result, duration) {
    externalServiceCalls.inc({ service, operation, result });
    externalServiceDuration.observe({ service, operation }, duration);
  }

  updateExternalServiceAvailability(service, availability) {
    externalServiceAvailability.set({ service }, availability);
  }

  /**
   * Storage and IPFS Metrics
   */
  recordIpfsOperation(operation, result, duration) {
    ipfsOperations.inc({ operation, result });
    ipfsOperationDuration.observe({ operation }, duration);
  }

  updateIpfsStorage(pinnedSize, cachedSize, totalSize) {
    ipfsStorageSize.set({ type: 'pinned' }, pinnedSize);
    ipfsStorageSize.set({ type: 'cached' }, cachedSize);
    ipfsStorageSize.set({ type: 'total' }, totalSize);
  }

  updateIpfsPinnedObjects(permanent, temporary, conditional) {
    ipfsPinnedObjects.set({ policy: 'permanent' }, permanent);
    ipfsPinnedObjects.set({ policy: 'temporary' }, temporary);
    ipfsPinnedObjects.set({ policy: 'conditional' }, conditional);
  }

  /**
   * Security Metrics
   */
  recordSecurityEvent(type, severity, blocked) {
    securityEvents.inc({ type, severity, blocked: blocked.toString() });
  }

  recordRateLimitHit(limitType, squidId = 'unknown') {
    rateLimitHits.inc({ limit_type: limitType, squid_id: squidId });
  }

  recordEncryptionOperation(operation, algorithm, result) {
    encryptionOperations.inc({ operation, algorithm, result });
  }

  /**
   * Error Metrics
   */
  recordError(type, code, severity = 'medium') {
    errors.inc({ type, code, severity });
    
    // Track for error rate calculation
    const key = `${type}:${code}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
  }

  /**
   * SLO Metrics
   */
  updateSloAvailability(service, availability) {
    sloAvailability.set({ service }, availability);
  }

  updateSloErrorBudget(service, remaining) {
    sloErrorBudget.set({ service }, remaining);
  }

  /**
   * Module-Specific Metrics
   */
  recordModuleOperation(operationType, result) {
    moduleSpecificMetric.inc({ operation_type: operationType, result });
  }

  /**
   * Error Rate Calculation
   */
  setupErrorRateCalculation() {
    setInterval(() => {
      this.calculateErrorRates();
    }, 60000); // Calculate every minute
  }

  calculateErrorRates() {
    for (const [key, count] of this.errorCounts.entries()) {
      const [type] = key.split(':');
      const rate = count / 60; // Errors per second over the last minute
      errorRate.set({ type }, rate);
    }
    
    // Reset counters
    this.errorCounts.clear();
  }

  /**
   * Health Check Metrics
   */
  getHealthMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    
    return {
      uptime,
      timestamp: new Date().toISOString(),
      metrics: {
        http_requests: httpRequestTotal._hashMap.size,
        active_users: activeUsers._hashMap.size,
        errors: errors._hashMap.size,
        external_services: externalServiceAvailability._hashMap.size
      }
    };
  }

  /**
   * Get Prometheus Metrics
   */
  async getMetrics() {
    return register.metrics();
  }

  /**
   * Get Metrics in JSON Format
   */
  async getMetricsJSON() {
    const metrics = await register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Reset All Metrics (for testing)
   */
  reset() {
    register.resetMetrics();
    this.errorCounts.clear();
    this.startTime = Date.now();
  }
}

/**
 * Express Middleware for Automatic HTTP Metrics Collection
 */
export function createMetricsMiddleware(metricsCollector) {
  return (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
      const duration = (Date.now() - start) / 1000;
      const requestSize = req.get('content-length') || 0;
      const responseSize = Buffer.byteLength(data || '', 'utf8');
      const squidId = req.identity?.squidId || 'anonymous';
      
      metricsCollector.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration,
        parseInt(requestSize),
        responseSize,
        squidId
      );
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * SLO Monitor
 */
class SLOMonitor {
  constructor(metricsCollector) {
    this.metrics = metricsCollector;
    this.sloTargets = {
      availability: 0.999, // 99.9%
      latencyP99: 0.2,     // 200ms
      errorRate: 0.001     // 0.1%
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      this.checkSLOs();
    }, 60000); // Check every minute
  }

  async checkSLOs() {
    const metrics = await this.metrics.getMetricsJSON();
    
    // Check availability SLO
    const availability = this.calculateAvailability(metrics);
    this.metrics.updateSloAvailability('{{MODULE_NAME}}', availability);
    
    // Check latency SLO
    const p99Latency = this.calculateP99Latency(metrics);
    if (p99Latency > this.sloTargets.latencyP99) {
      this.metrics.emit('slo-violation', {
        type: 'latency',
        current: p99Latency,
        target: this.sloTargets.latencyP99
      });
    }
    
    // Check error rate SLO
    const errorRate = this.calculateErrorRate(metrics);
    if (errorRate > this.sloTargets.errorRate) {
      this.metrics.emit('slo-violation', {
        type: 'error-rate',
        current: errorRate,
        target: this.sloTargets.errorRate
      });
    }
    
    // Update error budget
    const errorBudget = this.calculateErrorBudget(availability, errorRate);
    this.metrics.updateSloErrorBudget('{{MODULE_NAME}}', errorBudget);
  }

  calculateAvailability(metrics) {
    // Implementation depends on your specific availability calculation
    // This is a simplified example
    const totalRequests = this.getMetricValue(metrics, '{{MODULE_NAME}}_http_requests_total');
    const errorRequests = this.getMetricValue(metrics, '{{MODULE_NAME}}_errors_total');
    
    if (totalRequests === 0) return 1;
    return Math.max(0, (totalRequests - errorRequests) / totalRequests);
  }

  calculateP99Latency(metrics) {
    // Get P99 from histogram
    const latencyMetric = metrics.find(m => m.name === '{{MODULE_NAME}}_http_request_duration_seconds');
    if (!latencyMetric) return 0;
    
    // This is simplified - in practice you'd calculate P99 from histogram buckets
    return 0.1; // Placeholder
  }

  calculateErrorRate(metrics) {
    const errorRateMetric = metrics.find(m => m.name === '{{MODULE_NAME}}_error_rate');
    if (!errorRateMetric) return 0;
    
    return errorRateMetric.values[0]?.value || 0;
  }

  calculateErrorBudget(availability, errorRate) {
    const availabilityBudget = Math.max(0, 1 - (1 - availability) / (1 - this.sloTargets.availability));
    const errorBudget = Math.max(0, 1 - errorRate / this.sloTargets.errorRate);
    
    return Math.min(availabilityBudget, errorBudget);
  }

  getMetricValue(metrics, name) {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return 0;
    
    return metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
  }
}

// Create singleton instances
const metricsCollector = new MetricsCollector();
const sloMonitor = new SLOMonitor(metricsCollector);

export {
  metricsCollector,
  sloMonitor,
  register,
  createMetricsMiddleware
};