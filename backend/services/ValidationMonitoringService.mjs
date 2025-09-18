/**
 * Validation Monitoring Service
 * 
 * Integrates the ecosystem integrity validation system with existing observability infrastructure.
 * Provides real-time health dashboards, SLO monitoring, and automated alerting for validation failures.
 */

import { EventEmitter } from 'events';
import ObservabilityService from './ObservabilityService.mjs';
import { AlertingService } from './AlertingService.mjs';
import { NotificationService } from './NotificationService.mjs';

export class ValidationMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.observabilityService = new ObservabilityService();
    this.alertingService = new AlertingService();
    this.notificationService = new NotificationService();
    
    this.metrics = new Map();
    this.sloThresholds = this.initializeSLOThresholds();
    this.alertRules = this.initializeAlertRules();
    this.healthStatus = {
      overall: 'unknown',
      modules: new Map(),
      lastUpdate: null
    };
    
    this.setupEventHandlers();
  }
  
  initializeSLOThresholds() {
    return {
      performance: {
        p95Latency: 150, // ms
        p99Latency: 200, // ms
        errorBurnRate: 10, // %
        cacheHitRate: 85 // %
      },
      availability: {
        uptime: 99.9, // %
        mttr: 300, // seconds (5 minutes)
        mtbf: 86400 // seconds (24 hours)
      },
      quality: {
        chainContinuity: 100, // %
        deterministicReplayDivergence: 1, // %
        consensusQuorum: 60, // % (3/5)
        consensusRecoveryTime: 60 // seconds
      },
      security: {
        piiLeakage: 0, // count
        sandboxViolations: 0, // count
        unauthorizedAccess: 0 // count
      }
    };
  }
  
  initializeAlertRules() {
    return [
      {
        id: 'performance_degradation',
        condition: (metrics) => metrics.p99Latency > this.sloThresholds.performance.p99Latency,
        severity: 'warning',
        message: 'Performance degradation detected: P99 latency exceeded threshold'
      },
      {
        id: 'high_error_rate',
        condition: (metrics) => metrics.errorRate > this.sloThresholds.performance.errorBurnRate,
        severity: 'critical',
        message: 'High error rate detected: Error burn-rate exceeded threshold'
      },
      {
        id: 'chain_continuity_failure',
        condition: (metrics) => metrics.chainContinuity < this.sloThresholds.quality.chainContinuity,
        severity: 'critical',
        message: 'Chain continuity failure detected'
      },
      {
        id: 'consensus_failure',
        condition: (metrics) => metrics.consensusSuccess < this.sloThresholds.quality.consensusQuorum,
        severity: 'critical',
        message: 'Consensus failure: Quorum not reached'
      },
      {
        id: 'decentralization_violation',
        condition: (metrics) => !metrics.decentralizationAttestation,
        severity: 'critical',
        message: 'Decentralization attestation failed'
      },
      {
        id: 'security_violation',
        condition: (metrics) => metrics.piiDetected > 0 || metrics.sandboxViolations > 0,
        severity: 'critical',
        message: 'Security violation detected'
      }
    ];
  }
  
  setupEventHandlers() {
    // Listen for validation events
    this.on('validation.completed', this.handleValidationCompleted.bind(this));
    this.on('validation.failed', this.handleValidationFailed.bind(this));
    this.on('health.updated', this.handleHealthUpdated.bind(this));
    this.on('slo.violated', this.handleSLOViolation.bind(this));
  }
  
  async startMonitoring() {
    console.log('🔍 Starting validation monitoring service...');
    
    // Start periodic health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      30000 // Every 30 seconds
    );
    
    // Start SLO monitoring
    this.sloMonitoringInterval = setInterval(
      () => this.monitorSLOs(),
      60000 // Every minute
    );
    
    // Start metrics collection
    this.metricsCollectionInterval = setInterval(
      () => this.collectMetrics(),
      15000 // Every 15 seconds
    );
    
    console.log('✅ Validation monitoring service started');
  }
  
  async stopMonitoring() {
    console.log('🛑 Stopping validation monitoring service...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.sloMonitoringInterval) {
      clearInterval(this.sloMonitoringInterval);
    }
    
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    
    console.log('✅ Validation monitoring service stopped');
  }
  
  async performHealthCheck() {
    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        modules: {},
        overall: 'healthy'
      };
      
      // Check core modules
      const modules = [
        'integrity-validator',
        'data-flow-tester',
        'demo-orchestrator',
        'pi-integration-layer',
        'documentation-generator'
      ];
      
      for (const module of modules) {
        try {
          const moduleHealth = await this.checkModuleHealth(module);
          healthData.modules[module] = moduleHealth;
          
          if (moduleHealth.status !== 'healthy') {
            healthData.overall = 'degraded';
          }
        } catch (error) {
          healthData.modules[module] = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
          };
          healthData.overall = 'unhealthy';
        }
      }
      
      // Update health status
      this.healthStatus = healthData;
      this.emit('health.updated', healthData);
      
      // Record health metrics
      await this.observabilityService.recordMetric('validation.health.overall', 
        healthData.overall === 'healthy' ? 1 : 0
      );
      
    } catch (error) {
      console.error('Health check failed:', error);
      this.emit('validation.failed', {
        type: 'health_check_failure',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  async checkModuleHealth(moduleName) {
    const healthChecks = {
      'integrity-validator': () => this.checkIntegrityValidatorHealth(),
      'data-flow-tester': () => this.checkDataFlowTesterHealth(),
      'demo-orchestrator': () => this.checkDemoOrchestratorHealth(),
      'pi-integration-layer': () => this.checkPiIntegrationHealth(),
      'documentation-generator': () => this.checkDocumentationGeneratorHealth()
    };
    
    const checkFunction = healthChecks[moduleName];
    if (!checkFunction) {
      throw new Error(`Unknown module: ${moduleName}`);
    }
    
    return await checkFunction();
  }
  
  async checkIntegrityValidatorHealth() {
    // Check if IntegrityValidator can perform basic validation
    try {
      const { IntegrityValidator } = await import('./IntegrityValidator.mjs');
      const validator = new IntegrityValidator();
      
      // Perform a lightweight health check
      const healthCheck = await validator.validateModuleEndpoints(['qwallet']);
      
      return {
        status: healthCheck.success ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        details: {
          endpointsChecked: 1,
          validationSuccess: healthCheck.success
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  async checkDataFlowTesterHealth() {
    try {
      const { DataFlowTester } = await import('./DataFlowTester.mjs');
      const tester = new DataFlowTester();
      
      // Perform a simple flow test
      const testData = { test: 'health-check', timestamp: Date.now() };
      const flowTest = await tester.testInputFlow(testData, { timeout: 5000 });
      
      return {
        status: flowTest.success ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        details: {
          flowTestSuccess: flowTest.success,
          duration: flowTest.duration
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  async checkDemoOrchestratorHealth() {
    try {
      const { DemoOrchestrator } = await import('./DemoOrchestrator.mjs');
      const orchestrator = new DemoOrchestrator();
      
      // Check demo environment readiness
      const envCheck = await orchestrator.checkDemoEnvironment();
      
      return {
        status: envCheck.ready ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        details: {
          environmentReady: envCheck.ready,
          services: envCheck.services
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  async checkPiIntegrationHealth() {
    try {
      const { PiIntegrationLayer } = await import('./PiIntegrationLayer.mjs');
      const piIntegration = new PiIntegrationLayer();
      
      // Check Pi Network connectivity
      const piStatus = await piIntegration.getStatus();
      
      return {
        status: piStatus.connected ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        details: {
          piConnected: piStatus.connected,
          environment: piStatus.environment,
          apiVersion: piStatus.apiVersion
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  async checkDocumentationGeneratorHealth() {
    try {
      const { DocumentationGenerator } = await import('./DocumentationGenerator.mjs');
      const generator = new DocumentationGenerator();
      
      // Check documentation consistency
      const consistencyCheck = await generator.validateDocumentationConsistency();
      
      return {
        status: consistencyCheck.consistent ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        details: {
          documentationConsistent: consistencyCheck.consistent,
          bilingualParity: consistencyCheck.bilingualParity
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
  
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        performance: await this.collectPerformanceMetrics(),
        quality: await this.collectQualityMetrics(),
        security: await this.collectSecurityMetrics(),
        availability: await this.collectAvailabilityMetrics()
      };
      
      // Store metrics
      this.metrics.set(Date.now(), metrics);
      
      // Keep only last 1000 metric points
      if (this.metrics.size > 1000) {
        const oldestKey = Math.min(...this.metrics.keys());
        this.metrics.delete(oldestKey);
      }
      
      // Send metrics to observability service
      await this.sendMetricsToObservability(metrics);
      
      return metrics;
    } catch (error) {
      console.error('Metrics collection failed:', error);
      throw error;
    }
  }
  
  async collectPerformanceMetrics() {
    // Collect performance metrics from various sources
    const performanceData = await this.observabilityService.getMetrics([
      'api.response.time.p95',
      'api.response.time.p99',
      'api.error.rate',
      'cache.hit.rate'
    ]);
    
    return {
      p95Latency: performanceData['api.response.time.p95'] || 0,
      p99Latency: performanceData['api.response.time.p99'] || 0,
      errorRate: performanceData['api.error.rate'] || 0,
      cacheHitRate: performanceData['cache.hit.rate'] || 0
    };
  }
  
  async collectQualityMetrics() {
    // Collect quality metrics from validation services
    const qualityData = await this.observabilityService.getMetrics([
      'validation.chain.continuity',
      'validation.replay.divergence',
      'validation.consensus.success',
      'validation.consensus.recovery.time'
    ]);
    
    return {
      chainContinuity: qualityData['validation.chain.continuity'] || 0,
      replayDivergence: qualityData['validation.replay.divergence'] || 0,
      consensusSuccess: qualityData['validation.consensus.success'] || 0,
      consensusRecoveryTime: qualityData['validation.consensus.recovery.time'] || 0
    };
  }
  
  async collectSecurityMetrics() {
    // Collect security metrics
    const securityData = await this.observabilityService.getMetrics([
      'security.pii.detected',
      'security.sandbox.violations',
      'security.unauthorized.access',
      'validation.decentralization.attestation'
    ]);
    
    return {
      piiDetected: securityData['security.pii.detected'] || 0,
      sandboxViolations: securityData['security.sandbox.violations'] || 0,
      unauthorizedAccess: securityData['security.unauthorized.access'] || 0,
      decentralizationAttestation: securityData['validation.decentralization.attestation'] || false
    };
  }
  
  async collectAvailabilityMetrics() {
    // Collect availability metrics
    const availabilityData = await this.observabilityService.getMetrics([
      'service.uptime',
      'service.mttr',
      'service.mtbf'
    ]);
    
    return {
      uptime: availabilityData['service.uptime'] || 0,
      mttr: availabilityData['service.mttr'] || 0,
      mtbf: availabilityData['service.mtbf'] || 0
    };
  }
  
  async sendMetricsToObservability(metrics) {
    // Send all collected metrics to observability service
    const flatMetrics = this.flattenMetrics(metrics);
    
    for (const [metricName, value] of Object.entries(flatMetrics)) {
      await this.observabilityService.recordMetric(`validation.${metricName}`, value);
    }
  }
  
  flattenMetrics(metrics, prefix = '') {
    const flattened = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenMetrics(value, fullKey));
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        flattened[fullKey] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      }
    }
    
    return flattened;
  }
  
  async monitorSLOs() {
    try {
      const currentMetrics = await this.collectMetrics();
      const violations = [];
      
      // Check each alert rule
      for (const rule of this.alertRules) {
        try {
          if (rule.condition(currentMetrics)) {
            violations.push({
              ruleId: rule.id,
              severity: rule.severity,
              message: rule.message,
              metrics: currentMetrics,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Error evaluating alert rule ${rule.id}:`, error);
        }
      }
      
      // Process violations
      for (const violation of violations) {
        await this.handleSLOViolation(violation);
      }
      
      // Record SLO compliance
      await this.observabilityService.recordMetric('validation.slo.violations', violations.length);
      
    } catch (error) {
      console.error('SLO monitoring failed:', error);
    }
  }
  
  async handleValidationCompleted(event) {
    console.log('✅ Validation completed:', event.type);
    
    // Record successful validation
    await this.observabilityService.recordMetric('validation.completed.count', 1);
    await this.observabilityService.recordMetric(`validation.${event.type}.success`, 1);
    
    // Update health status if needed
    if (this.healthStatus.overall !== 'healthy') {
      await this.performHealthCheck();
    }
  }
  
  async handleValidationFailed(event) {
    console.error('❌ Validation failed:', event.type, event.error);
    
    // Record failed validation
    await this.observabilityService.recordMetric('validation.failed.count', 1);
    await this.observabilityService.recordMetric(`validation.${event.type}.failure`, 1);
    
    // Create alert for validation failure
    const alert = {
      id: `validation_failure_${Date.now()}`,
      severity: 'warning',
      message: `Validation failed: ${event.type} - ${event.error}`,
      timestamp: event.timestamp,
      details: event
    };
    
    await this.alertingService.createAlert(alert);
    
    // Update health status
    await this.performHealthCheck();
  }
  
  async handleHealthUpdated(healthData) {
    console.log(`🏥 Health status updated: ${healthData.overall}`);
    
    // Record health metrics
    await this.observabilityService.recordMetric('validation.health.status', 
      healthData.overall === 'healthy' ? 1 : 0
    );
    
    // Create alert if health is degraded
    if (healthData.overall !== 'healthy') {
      const unhealthyModules = Object.entries(healthData.modules)
        .filter(([_, module]) => module.status !== 'healthy')
        .map(([name, _]) => name);
      
      const alert = {
        id: `health_degraded_${Date.now()}`,
        severity: healthData.overall === 'unhealthy' ? 'critical' : 'warning',
        message: `System health degraded: ${unhealthyModules.join(', ')}`,
        timestamp: healthData.timestamp,
        details: healthData
      };
      
      await this.alertingService.createAlert(alert);
    }
  }
  
  async handleSLOViolation(violation) {
    console.warn(`⚠️ SLO violation: ${violation.ruleId}`);
    
    // Record SLO violation
    await this.observabilityService.recordMetric(`validation.slo.${violation.ruleId}.violations`, 1);
    
    // Create alert
    const alert = {
      id: `slo_violation_${violation.ruleId}_${Date.now()}`,
      severity: violation.severity,
      message: violation.message,
      timestamp: violation.timestamp,
      details: violation
    };
    
    await this.alertingService.createAlert(alert);
    
    // Send notification for critical violations
    if (violation.severity === 'critical') {
      await this.notificationService.sendNotification({
        type: 'slo_violation',
        severity: 'critical',
        title: 'Critical SLO Violation',
        message: violation.message,
        details: violation,
        channels: ['email', 'slack', 'webhook']
      });
    }
    
    this.emit('slo.violated', violation);
  }
  
  async getDashboardData() {
    const currentTime = Date.now();
    const oneHourAgo = currentTime - (60 * 60 * 1000);
    
    // Get recent metrics
    const recentMetrics = Array.from(this.metrics.entries())
      .filter(([timestamp, _]) => timestamp > oneHourAgo)
      .map(([timestamp, metrics]) => ({ timestamp, ...metrics }));
    
    // Get current health status
    const healthStatus = this.healthStatus;
    
    // Get recent alerts
    const recentAlerts = await this.alertingService.getRecentAlerts(24); // Last 24 hours
    
    // Calculate SLO compliance
    const sloCompliance = this.calculateSLOCompliance(recentMetrics);
    
    return {
      timestamp: new Date().toISOString(),
      health: healthStatus,
      metrics: recentMetrics,
      alerts: recentAlerts,
      sloCompliance: sloCompliance,
      summary: {
        overallHealth: healthStatus.overall,
        activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
        sloViolations: recentAlerts.filter(a => a.type === 'slo_violation').length,
        lastUpdate: healthStatus.lastUpdate
      }
    };
  }
  
  calculateSLOCompliance(metrics) {
    if (metrics.length === 0) {
      return {};
    }
    
    const compliance = {};
    
    // Calculate performance SLO compliance
    const performanceMetrics = metrics.map(m => m.performance).filter(Boolean);
    if (performanceMetrics.length > 0) {
      compliance.performance = {
        p95Latency: this.calculateCompliance(performanceMetrics, 'p95Latency', this.sloThresholds.performance.p95Latency, 'below'),
        p99Latency: this.calculateCompliance(performanceMetrics, 'p99Latency', this.sloThresholds.performance.p99Latency, 'below'),
        errorRate: this.calculateCompliance(performanceMetrics, 'errorRate', this.sloThresholds.performance.errorBurnRate, 'below'),
        cacheHitRate: this.calculateCompliance(performanceMetrics, 'cacheHitRate', this.sloThresholds.performance.cacheHitRate, 'above')
      };
    }
    
    // Calculate quality SLO compliance
    const qualityMetrics = metrics.map(m => m.quality).filter(Boolean);
    if (qualityMetrics.length > 0) {
      compliance.quality = {
        chainContinuity: this.calculateCompliance(qualityMetrics, 'chainContinuity', this.sloThresholds.quality.chainContinuity, 'above'),
        replayDivergence: this.calculateCompliance(qualityMetrics, 'replayDivergence', this.sloThresholds.quality.deterministicReplayDivergence, 'below'),
        consensusSuccess: this.calculateCompliance(qualityMetrics, 'consensusSuccess', this.sloThresholds.quality.consensusQuorum, 'above')
      };
    }
    
    return compliance;
  }
  
  calculateCompliance(metrics, field, threshold, direction) {
    const values = metrics.map(m => m[field]).filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) {
      return { compliance: 0, samples: 0 };
    }
    
    const compliantCount = values.filter(value => {
      return direction === 'above' ? value >= threshold : value <= threshold;
    }).length;
    
    return {
      compliance: (compliantCount / values.length) * 100,
      samples: values.length,
      threshold: threshold,
      direction: direction
    };
  }
  
  async getMetricsHistory(timeRange = '1h') {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const rangeMs = ranges[timeRange] || ranges['1h'];
    const startTime = now - rangeMs;
    
    return Array.from(this.metrics.entries())
      .filter(([timestamp, _]) => timestamp >= startTime)
      .map(([timestamp, metrics]) => ({
        timestamp: new Date(timestamp).toISOString(),
        ...metrics
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
}

export default ValidationMonitoringService;