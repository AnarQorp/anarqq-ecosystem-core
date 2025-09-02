/**
 * Validation utilities for ecosystem integrity validation
 * Common helper functions and constants for validation services
 */

export class ValidationUtils {
  /**
   * Q∞ module definitions and their expected endpoints
   */
  static Q_MODULES = {
    squid: {
      name: 'sQuid Identity',
      endpoints: ['/health', '/identity/create', '/identity/verify'],
      port: 3001,
      requiredServices: ['ipfs', 'qerberos']
    },
    qlock: {
      name: 'Qlock Encryption',
      endpoints: ['/health', '/encrypt', '/decrypt'],
      port: 3002,
      requiredServices: ['ipfs', 'qonsent']
    },
    qonsent: {
      name: 'Qonsent Permissions',
      endpoints: ['/health', '/permissions/grant', '/permissions/check'],
      port: 3003,
      requiredServices: ['qerberos', 'qindex']
    },
    qindex: {
      name: 'Qindex Metadata',
      endpoints: ['/health', '/metadata/store', '/metadata/query'],
      port: 3004,
      requiredServices: ['ipfs', 'qerberos']
    },
    qerberos: {
      name: 'Qerberos Security',
      endpoints: ['/health', '/audit/log', '/audit/query'],
      port: 3005,
      requiredServices: ['ipfs', 'observability']
    },
    qflow: {
      name: 'Qflow Serverless',
      endpoints: ['/health', '/workflow/execute', '/workflow/status'],
      port: 3006,
      requiredServices: ['qnet', 'qerberos']
    },
    qwallet: {
      name: 'Qwallet Payments',
      endpoints: ['/health', '/wallet/balance', '/wallet/transfer'],
      port: 3007,
      requiredServices: ['squid', 'qerberos']
    },
    qnet: {
      name: 'QNET Network',
      endpoints: ['/health', '/nodes/list', '/nodes/status'],
      port: 3008,
      requiredServices: ['ipfs', 'libp2p']
    }
  };

  /**
   * Environment configurations
   */
  static ENVIRONMENTS = {
    local: {
      name: 'Local Development',
      baseUrl: 'http://localhost',
      timeout: 5000,
      retries: 2
    },
    staging: {
      name: 'Staging Environment',
      baseUrl: 'https://staging.anarq.org',
      timeout: 10000,
      retries: 3
    },
    'qnet-phase2': {
      name: 'QNET Phase 2',
      baseUrl: 'https://qnet.anarq.org',
      timeout: 15000,
      retries: 5
    }
  };

  /**
   * Performance gate thresholds
   */
  static PERFORMANCE_GATES = {
    p95_latency_ms: 150,
    p99_latency_ms: 200,
    error_rate_percent: 10,
    cache_hit_rate_percent: 85,
    uptime_percent: 99.9
  };

  /**
   * Validation result status codes
   */
  static STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    CRITICAL: 'critical',
    UNKNOWN: 'unknown'
  };

  /**
   * Check if a URL is reachable
   */
  static async checkEndpoint(url, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'EcosystemIntegrityValidator/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        responseTime: Date.now() - Date.now() // Will be calculated by caller
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Validate module health endpoints
   */
  static async validateModuleHealth(moduleId, environment = 'local') {
    const module = this.Q_MODULES[moduleId];
    if (!module) {
      throw new Error(`Unknown module: ${moduleId}`);
    }

    const envConfig = this.ENVIRONMENTS[environment];
    if (!envConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const results = {
      moduleId,
      moduleName: module.name,
      environment,
      status: this.STATUS.HEALTHY,
      endpoints: [],
      overallHealth: true,
      timestamp: new Date().toISOString()
    };

    // Check each endpoint
    for (const endpoint of module.endpoints) {
      const url = `${envConfig.baseUrl}:${module.port}${endpoint}`;
      const startTime = Date.now();
      
      const endpointResult = await this.checkEndpoint(url, envConfig.timeout);
      endpointResult.responseTime = Date.now() - startTime;
      endpointResult.endpoint = endpoint;
      endpointResult.url = url;
      
      results.endpoints.push(endpointResult);
      
      if (!endpointResult.success) {
        results.overallHealth = false;
        results.status = this.STATUS.DEGRADED;
      }
    }

    // If no endpoints are working, mark as critical
    if (results.endpoints.every(ep => !ep.success)) {
      results.status = this.STATUS.CRITICAL;
    }

    return results;
  }

  /**
   * Generate health sample data for artifacts
   */
  static generateHealthSample(moduleResults) {
    const sample = {
      timestamp: new Date().toISOString(),
      environment: 'local',
      totalModules: Object.keys(this.Q_MODULES).length,
      healthyModules: 0,
      degradedModules: 0,
      criticalModules: 0,
      modules: {},
      overallStatus: this.STATUS.HEALTHY,
      performanceGates: {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        totalEndpoints: 0,
        successfulEndpoints: 0
      }
    };

    let totalResponseTime = 0;
    let endpointCount = 0;

    for (const [moduleId, result] of Object.entries(moduleResults)) {
      sample.modules[moduleId] = {
        status: result.status,
        endpointCount: result.endpoints.length,
        successfulEndpoints: result.endpoints.filter(ep => ep.success).length,
        averageResponseTime: result.endpoints.reduce((sum, ep) => sum + (ep.responseTime || 0), 0) / result.endpoints.length
      };

      // Count module statuses
      switch (result.status) {
        case this.STATUS.HEALTHY:
          sample.healthyModules++;
          break;
        case this.STATUS.DEGRADED:
          sample.degradedModules++;
          break;
        case this.STATUS.CRITICAL:
          sample.criticalModules++;
          break;
      }

      // Calculate performance metrics
      for (const endpoint of result.endpoints) {
        if (endpoint.responseTime) {
          totalResponseTime += endpoint.responseTime;
          endpointCount++;
          sample.performanceGates.maxResponseTime = Math.max(
            sample.performanceGates.maxResponseTime, 
            endpoint.responseTime
          );
          sample.performanceGates.minResponseTime = Math.min(
            sample.performanceGates.minResponseTime, 
            endpoint.responseTime
          );
        }
        if (endpoint.success) {
          sample.performanceGates.successfulEndpoints++;
        }
      }
      sample.performanceGates.totalEndpoints += result.endpoints.length;
    }

    // Calculate overall metrics
    sample.performanceGates.averageResponseTime = endpointCount > 0 ? totalResponseTime / endpointCount : 0;
    sample.performanceGates.successRate = sample.performanceGates.totalEndpoints > 0 ? 
      sample.performanceGates.successfulEndpoints / sample.performanceGates.totalEndpoints : 0;

    // Determine overall status
    if (sample.criticalModules > 0) {
      sample.overallStatus = this.STATUS.CRITICAL;
    } else if (sample.degradedModules > 0) {
      sample.overallStatus = this.STATUS.DEGRADED;
    }

    return sample;
  }

  /**
   * Validate performance against gates
   */
  static validatePerformanceGates(metrics) {
    const results = {
      passed: true,
      gates: {},
      violations: []
    };

    // Check P95 latency
    if (metrics.p95_latency_ms > this.PERFORMANCE_GATES.p95_latency_ms) {
      results.passed = false;
      results.violations.push(`P95 latency ${metrics.p95_latency_ms}ms exceeds gate ${this.PERFORMANCE_GATES.p95_latency_ms}ms`);
    }
    results.gates.p95_latency = metrics.p95_latency_ms <= this.PERFORMANCE_GATES.p95_latency_ms;

    // Check P99 latency
    if (metrics.p99_latency_ms > this.PERFORMANCE_GATES.p99_latency_ms) {
      results.passed = false;
      results.violations.push(`P99 latency ${metrics.p99_latency_ms}ms exceeds gate ${this.PERFORMANCE_GATES.p99_latency_ms}ms`);
    }
    results.gates.p99_latency = metrics.p99_latency_ms <= this.PERFORMANCE_GATES.p99_latency_ms;

    // Check error rate
    if (metrics.error_rate_percent > this.PERFORMANCE_GATES.error_rate_percent) {
      results.passed = false;
      results.violations.push(`Error rate ${metrics.error_rate_percent}% exceeds gate ${this.PERFORMANCE_GATES.error_rate_percent}%`);
    }
    results.gates.error_rate = metrics.error_rate_percent <= this.PERFORMANCE_GATES.error_rate_percent;

    // Check cache hit rate
    if (metrics.cache_hit_rate_percent < this.PERFORMANCE_GATES.cache_hit_rate_percent) {
      results.passed = false;
      results.violations.push(`Cache hit rate ${metrics.cache_hit_rate_percent}% below gate ${this.PERFORMANCE_GATES.cache_hit_rate_percent}%`);
    }
    results.gates.cache_hit_rate = metrics.cache_hit_rate_percent >= this.PERFORMANCE_GATES.cache_hit_rate_percent;

    return results;
  }

  /**
   * Create validation report structure
   */
  static createValidationReport(moduleResults, performanceResults = null) {
    const report = {
      reportId: `validation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      overallStatus: this.STATUS.HEALTHY,
      moduleResults: moduleResults || {},
      performanceGates: performanceResults,
      summary: {
        totalModules: 0,
        healthyModules: 0,
        degradedModules: 0,
        criticalModules: 0,
        totalEndpoints: 0,
        successfulEndpoints: 0
      },
      recommendations: []
    };

    // Calculate summary
    for (const [moduleId, result] of Object.entries(report.moduleResults)) {
      report.summary.totalModules++;
      
      switch (result.status) {
        case this.STATUS.HEALTHY:
          report.summary.healthyModules++;
          break;
        case this.STATUS.DEGRADED:
          report.summary.degradedModules++;
          break;
        case this.STATUS.CRITICAL:
          report.summary.criticalModules++;
          break;
      }

      if (result.endpoints) {
        report.summary.totalEndpoints += result.endpoints.length;
        report.summary.successfulEndpoints += result.endpoints.filter(ep => ep.success).length;
      }
    }

    // Determine overall status
    if (report.summary.criticalModules > 0) {
      report.overallStatus = this.STATUS.CRITICAL;
      report.recommendations.push('Critical modules detected - immediate attention required');
    } else if (report.summary.degradedModules > 0) {
      report.overallStatus = this.STATUS.DEGRADED;
      report.recommendations.push('Some modules are degraded - investigate and resolve issues');
    }

    // Add performance recommendations
    if (performanceResults && !performanceResults.passed) {
      report.recommendations.push(...performanceResults.violations);
    }

    return report;
  }

  /**
   * Retry helper with exponential backoff
   */
  static async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

export default ValidationUtils;