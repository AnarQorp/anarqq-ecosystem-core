/**
 * Qlock Metrics Collection
 * 
 * Defines and collects performance, security, and operational metrics
 * for the Qlock module.
 */

export class QlockMetrics {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.startTime = Date.now();
  }

  /**
   * Initialize metrics collection
   */
  initialize() {
    this.setupCounters();
    this.setupHistograms();
    this.setupGauges();
    
    // Start periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
    
    console.log('[QlockMetrics] Metrics collection initialized');
  }

  /**
   * Setup counter metrics
   */
  setupCounters() {
    const counters = [
      // Cryptographic operations
      'qlock_encryption_operations_total',
      'qlock_decryption_operations_total',
      'qlock_signing_operations_total',
      'qlock_verification_operations_total',
      
      // Lock operations
      'qlock_lock_acquisitions_total',
      'qlock_lock_releases_total',
      'qlock_lock_extensions_total',
      'qlock_lock_failures_total',
      
      // Key management
      'qlock_keys_generated_total',
      'qlock_keys_rotated_total',
      'qlock_key_access_total',
      
      // Security events
      'qlock_security_alerts_total',
      'qlock_auth_failures_total',
      'qlock_authz_denials_total',
      
      // API operations
      'qlock_http_requests_total',
      'qlock_mcp_calls_total',
      'qlock_errors_total'
    ];

    counters.forEach(name => {
      this.counters.set(name, 0);
    });
  }

  /**
   * Setup histogram metrics
   */
  setupHistograms() {
    const histograms = [
      // Performance metrics
      'qlock_encryption_duration_ms',
      'qlock_decryption_duration_ms',
      'qlock_signing_duration_ms',
      'qlock_verification_duration_ms',
      'qlock_lock_acquisition_duration_ms',
      'qlock_key_generation_duration_ms',
      
      // API metrics
      'qlock_http_request_duration_ms',
      'qlock_mcp_call_duration_ms',
      
      // Data size metrics
      'qlock_encrypted_data_size_bytes',
      'qlock_signature_size_bytes'
    ];

    histograms.forEach(name => {
      this.histograms.set(name, []);
    });
  }

  /**
   * Setup gauge metrics
   */
  setupGauges() {
    const gauges = [
      // System state
      'qlock_active_locks',
      'qlock_active_keys',
      'qlock_memory_usage_bytes',
      'qlock_cpu_usage_percent',
      
      // Queue metrics
      'qlock_pending_operations',
      'qlock_audit_queue_size',
      'qlock_event_queue_size',
      
      // Health metrics
      'qlock_service_health_score',
      'qlock_kms_connection_status',
      'qlock_hsm_connection_status'
    ];

    gauges.forEach(name => {
      this.gauges.set(name, 0);
    });
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name, labels = {}, value = 1) {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    this.histograms.set(key, values);
  }

  /**
   * Set a gauge value
   */
  setGauge(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record encryption operation metrics
   */
  recordEncryption(algorithm, duration, dataSize, success = true) {
    const labels = { algorithm, status: success ? 'success' : 'error' };
    
    this.incrementCounter('qlock_encryption_operations_total', labels);
    this.recordHistogram('qlock_encryption_duration_ms', duration, labels);
    this.recordHistogram('qlock_encrypted_data_size_bytes', dataSize, labels);
  }

  /**
   * Record decryption operation metrics
   */
  recordDecryption(algorithm, duration, success = true) {
    const labels = { algorithm, status: success ? 'success' : 'error' };
    
    this.incrementCounter('qlock_decryption_operations_total', labels);
    this.recordHistogram('qlock_decryption_duration_ms', duration, labels);
  }

  /**
   * Record signing operation metrics
   */
  recordSigning(algorithm, duration, signatureSize, success = true) {
    const labels = { algorithm, status: success ? 'success' : 'error' };
    
    this.incrementCounter('qlock_signing_operations_total', labels);
    this.recordHistogram('qlock_signing_duration_ms', duration, labels);
    this.recordHistogram('qlock_signature_size_bytes', signatureSize, labels);
  }

  /**
   * Record verification operation metrics
   */
  recordVerification(algorithm, duration, valid, success = true) {
    const labels = { 
      algorithm, 
      status: success ? 'success' : 'error',
      valid: valid ? 'true' : 'false'
    };
    
    this.incrementCounter('qlock_verification_operations_total', labels);
    this.recordHistogram('qlock_verification_duration_ms', duration, labels);
  }

  /**
   * Record lock operation metrics
   */
  recordLockOperation(operation, duration, success = true) {
    const labels = { operation, status: success ? 'success' : 'error' };
    
    switch (operation) {
      case 'acquire':
        this.incrementCounter('qlock_lock_acquisitions_total', labels);
        this.recordHistogram('qlock_lock_acquisition_duration_ms', duration, labels);
        break;
      case 'release':
        this.incrementCounter('qlock_lock_releases_total', labels);
        break;
      case 'extend':
        this.incrementCounter('qlock_lock_extensions_total', labels);
        break;
    }
    
    if (!success) {
      this.incrementCounter('qlock_lock_failures_total', { operation });
    }
  }

  /**
   * Record key management metrics
   */
  recordKeyOperation(operation, algorithm, duration, success = true) {
    const labels = { operation, algorithm, status: success ? 'success' : 'error' };
    
    switch (operation) {
      case 'generate':
        this.incrementCounter('qlock_keys_generated_total', labels);
        this.recordHistogram('qlock_key_generation_duration_ms', duration, labels);
        break;
      case 'rotate':
        this.incrementCounter('qlock_keys_rotated_total', labels);
        break;
      case 'access':
        this.incrementCounter('qlock_key_access_total', labels);
        break;
    }
  }

  /**
   * Record security event metrics
   */
  recordSecurityEvent(eventType, severity) {
    const labels = { type: eventType, severity };
    this.incrementCounter('qlock_security_alerts_total', labels);
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(reason) {
    const labels = { reason };
    this.incrementCounter('qlock_auth_failures_total', labels);
  }

  /**
   * Record authorization denial
   */
  recordAuthzDenial(permission, reason) {
    const labels = { permission, reason };
    this.incrementCounter('qlock_authz_denials_total', labels);
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method, path, statusCode, duration) {
    const labels = { 
      method, 
      path, 
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`
    };
    
    this.incrementCounter('qlock_http_requests_total', labels);
    this.recordHistogram('qlock_http_request_duration_ms', duration, labels);
    
    if (statusCode >= 400) {
      this.incrementCounter('qlock_errors_total', { type: 'http', ...labels });
    }
  }

  /**
   * Record MCP call metrics
   */
  recordMcpCall(tool, duration, success = true) {
    const labels = { tool, status: success ? 'success' : 'error' };
    
    this.incrementCounter('qlock_mcp_calls_total', labels);
    this.recordHistogram('qlock_mcp_call_duration_ms', duration, labels);
    
    if (!success) {
      this.incrementCounter('qlock_errors_total', { type: 'mcp', tool });
    }
  }

  /**
   * Update system state metrics
   */
  updateSystemState(activeLocks, activeKeys, memoryUsage, cpuUsage) {
    this.setGauge('qlock_active_locks', activeLocks);
    this.setGauge('qlock_active_keys', activeKeys);
    this.setGauge('qlock_memory_usage_bytes', memoryUsage);
    this.setGauge('qlock_cpu_usage_percent', cpuUsage);
  }

  /**
   * Update service health metrics
   */
  updateServiceHealth(healthScore, kmsConnected, hsmConnected) {
    this.setGauge('qlock_service_health_score', healthScore);
    this.setGauge('qlock_kms_connection_status', kmsConnected ? 1 : 0);
    this.setGauge('qlock_hsm_connection_status', hsmConnected ? 1 : 0);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.setGauge('qlock_memory_usage_bytes', memUsage.heapUsed);
      
      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.setGauge('qlock_cpu_usage_percent', cpuPercent);
      
      // Uptime
      const uptime = Date.now() - this.startTime;
      this.setGauge('qlock_uptime_seconds', Math.floor(uptime / 1000));
      
    } catch (error) {
      console.error('[QlockMetrics] Error collecting system metrics:', error);
    }
  }

  /**
   * Get metric key with labels
   */
  getMetricKey(name, labels = {}) {
    if (Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelStr}}`;
  }

  /**
   * Calculate histogram statistics
   */
  calculateHistogramStats(values) {
    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    
    const sorted = values.map(v => v.value).sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    
    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics() {
    const lines = [];
    
    // Counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`${key} ${value}`);
    }
    
    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`${key} ${value}`);
    }
    
    // Histograms
    for (const [key, values] of this.histograms.entries()) {
      const stats = this.calculateHistogramStats(values);
      const baseName = key.replace(/_ms$|_bytes$/, '');
      
      lines.push(`${baseName}_count ${stats.count}`);
      lines.push(`${baseName}_sum ${stats.sum}`);
      lines.push(`${baseName}_avg ${stats.avg}`);
      lines.push(`${baseName}_p50 ${stats.p50}`);
      lines.push(`${baseName}_p95 ${stats.p95}`);
      lines.push(`${baseName}_p99 ${stats.p99}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: {}
    };
    
    // Add histogram statistics
    for (const [key, values] of this.histograms.entries()) {
      summary.histograms[key] = this.calculateHistogramStats(values);
    }
    
    return summary;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.setupCounters();
    this.setupHistograms();
    this.setupGauges();
  }

  /**
   * Shutdown metrics collection
   */
  shutdown() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    console.log('[QlockMetrics] Metrics collection shutdown');
  }
}

// Export singleton instance
export const qlockMetrics = new QlockMetrics();