/**
 * Module Analytics and Monitoring Service
 * Provides comprehensive analytics, monitoring, and alerting for module registration operations
 */

import { EventEmitter } from 'events';
import {
  RegisteredModule,
  ModuleStatus,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleAccessStats,
  ModuleAuditEvent
} from '../types/qwallet-module-registration';
import { ModuleRegistry } from './ModuleRegistry';

/**
 * Analytics data structures
 */
export interface ModuleUsageAnalytics {
  moduleId: string;
  totalQueries: number;
  uniqueUsers: number;
  averageResponseTime: number;
  errorRate: number;
  popularityScore: number;
  trendingScore: number;
  lastAnalyzed: string;
  timeSeriesData: TimeSeriesDataPoint[];
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  queries: number;
  errors: number;
  responseTime: number;
  uniqueUsers: number;
}

export interface PerformanceMetrics {
  operationType: 'register' | 'update' | 'deregister' | 'verify' | 'search';
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  totalOperations: number;
  lastUpdated: string;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  details: Record<string, any>;
  issues: string[];
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  lastCheck: string;
  uptime: number;
  version: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: string;
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  timeWindow: number; // minutes
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'slack';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface DashboardData {
  overview: {
    totalModules: number;
    activeModules: number;
    totalRegistrations: number;
    totalQueries: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  recentActivity: ModuleAuditEvent[];
  topModules: ModuleUsageAnalytics[];
  performanceMetrics: PerformanceMetrics[];
  healthStatus: SystemHealthStatus;
  activeAlerts: Alert[];
  trends: {
    registrationsOverTime: TimeSeriesDataPoint[];
    queriesOverTime: TimeSeriesDataPoint[];
    errorsOverTime: TimeSeriesDataPoint[];
  };
}

/**
 * Module Analytics and Monitoring Service
 */
export class ModuleAnalyticsService extends EventEmitter {
  private moduleRegistry: ModuleRegistry;
  private usageAnalytics = new Map<string, ModuleUsageAnalytics>();
  private performanceMetrics = new Map<string, PerformanceMetrics>();
  private healthChecks = new Map<string, HealthCheckResult>();
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private timeSeriesData: TimeSeriesDataPoint[] = [];
  
  // Configuration
  private readonly ANALYTICS_RETENTION_DAYS = 30;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly ANALYTICS_UPDATE_INTERVAL = 300000; // 5 minutes
  private readonly ALERT_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_TIME_SERIES_POINTS = 2880; // 24 hours at 30-second intervals
  
  // Service tracking
  private startTime = Date.now();
  private healthCheckTimer?: NodeJS.Timeout;
  private analyticsTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;

  constructor(moduleRegistry: ModuleRegistry) {
    super();
    this.moduleRegistry = moduleRegistry;
    this.initializeService();
  }

  /**
   * Initialize the analytics service
   */
  private initializeService(): void {
    console.log('[ModuleAnalyticsService] Initializing analytics and monitoring service');
    
    // Set up default alert rules
    this.setupDefaultAlertRules();
    
    // Start monitoring timers
    this.startHealthChecks();
    this.startAnalyticsUpdates();
    this.startAlertMonitoring();
    
    console.log('[ModuleAnalyticsService] Analytics service initialized');
  }

  /**
   * Record a module operation for analytics
   */
  public recordOperation(
    operationType: 'register' | 'update' | 'deregister' | 'verify' | 'search',
    moduleId: string,
    duration: number,
    success: boolean,
    userId?: string,
    error?: Error
  ): void {
    const timestamp = new Date().toISOString();
    
    // Update performance metrics
    this.updatePerformanceMetrics(operationType, duration, success);
    
    // Update usage analytics for specific module
    if (moduleId) {
      this.updateUsageAnalytics(moduleId, duration, success, userId);
    }
    
    // Add to time series data
    this.addTimeSeriesDataPoint({
      timestamp,
      queries: 1,
      errors: success ? 0 : 1,
      responseTime: duration,
      uniqueUsers: userId ? 1 : 0
    });
    
    // Emit event for real-time monitoring
    this.emit('operation', {
      type: operationType,
      moduleId,
      duration,
      success,
      userId,
      error: error?.message,
      timestamp
    });
    
    // Check for immediate alerts
    this.checkImmediateAlerts(operationType, duration, success, error);
  }

  /**
   * Get usage analytics for a specific module
   */
  public getModuleAnalytics(moduleId: string): ModuleUsageAnalytics | null {
    return this.usageAnalytics.get(moduleId) || null;
  }

  /**
   * Get usage analytics for all modules
   */
  public getAllModuleAnalytics(): ModuleUsageAnalytics[] {
    return Array.from(this.usageAnalytics.values());
  }

  /**
   * Get performance metrics for an operation type
   */
  public getPerformanceMetrics(operationType?: string): PerformanceMetrics[] {
    if (operationType) {
      const metrics = this.performanceMetrics.get(operationType);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Perform health checks on all services
   */
  public async performHealthChecks(): Promise<SystemHealthStatus> {
    const services: HealthCheckResult[] = [];
    
    // Check Module Registry
    services.push(await this.checkModuleRegistryHealth());
    
    // Check Qindex Service
    services.push(await this.checkQindexHealth());
    
    // Check Qlock Service
    services.push(await this.checkQlockHealth());
    
    // Check Qerberos Service
    services.push(await this.checkQerberosHealth());
    
    // Check IPFS connectivity
    services.push(await this.checkIPFSHealth());
    
    // Determine overall health
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices > 0) {
      overall = 'unhealthy';
    } else if (degradedServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    const healthStatus: SystemHealthStatus = {
      overall,
      services,
      lastCheck: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    };
    
    // Store health check results
    services.forEach(service => {
      this.healthChecks.set(service.service, service);
    });
    
    // Emit health status event
    this.emit('healthCheck', healthStatus);
    
    return healthStatus;
  }

  /**
   * Get current system health status
   */
  public getHealthStatus(): SystemHealthStatus {
    const services = Array.from(this.healthChecks.values());
    
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices > 0) {
      overall = 'unhealthy';
    } else if (degradedServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    return {
      overall,
      services,
      lastCheck: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    };
  }

  /**
   * Add or update an alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`[ModuleAnalyticsService] Added alert rule: ${rule.name}`);
  }

  /**
   * Remove an alert rule
   */
  public removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      console.log(`[ModuleAnalyticsService] Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get all alert rules
   */
  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  public getAllAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get comprehensive dashboard data
   */
  public getDashboardData(): DashboardData {
    const registryStats = this.moduleRegistry.getRegistryStats();
    const recentActivity = this.moduleRegistry.getAuditLog(undefined, 20);
    const topModules = this.getTopModules(10);
    const performanceMetrics = this.getPerformanceMetrics();
    const healthStatus = this.getHealthStatus();
    const activeAlerts = this.getActiveAlerts();
    
    // Calculate trends
    const trends = this.calculateTrends();
    
    // Calculate overall metrics
    const totalQueries = Array.from(this.usageAnalytics.values())
      .reduce((sum, analytics) => sum + analytics.totalQueries, 0);
    
    const averageResponseTime = this.calculateAverageResponseTime();
    const errorRate = this.calculateOverallErrorRate();
    
    return {
      overview: {
        totalModules: registryStats.totalModules,
        activeModules: registryStats.productionModules,
        totalRegistrations: registryStats.totalModules,
        totalQueries,
        averageResponseTime,
        errorRate,
        uptime: Date.now() - this.startTime
      },
      recentActivity,
      topModules,
      performanceMetrics,
      healthStatus,
      activeAlerts,
      trends
    };
  }

  /**
   * Export analytics data for reporting
   */
  public exportAnalyticsData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      timestamp: new Date().toISOString(),
      overview: this.getDashboardData().overview,
      moduleAnalytics: this.getAllModuleAnalytics(),
      performanceMetrics: this.getPerformanceMetrics(),
      healthStatus: this.getHealthStatus(),
      alerts: this.getAllAlerts(),
      timeSeriesData: this.timeSeriesData.slice(-1440) // Last 24 hours
    };
    
    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Cleanup old data
   */
  public cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.ANALYTICS_RETENTION_DAYS);
    const cutoffTime = cutoffDate.getTime();
    
    // Clean up time series data
    this.timeSeriesData = this.timeSeriesData.filter(point => 
      new Date(point.timestamp).getTime() > cutoffTime
    );
    
    // Clean up resolved alerts older than retention period
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.resolved && alert.resolvedAt) {
        const resolvedTime = new Date(alert.resolvedAt).getTime();
        if (resolvedTime < cutoffTime) {
          this.activeAlerts.delete(alertId);
        }
      }
    }
    
    console.log(`[ModuleAnalyticsService] Cleaned up data older than ${this.ANALYTICS_RETENTION_DAYS} days`);
  }

  /**
   * Stop the analytics service
   */
  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer);
    }
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }
    
    console.log('[ModuleAnalyticsService] Analytics service stopped');
  }

  // Private methods

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5% over 5 minutes',
        condition: {
          metric: 'error_rate',
          operator: '>',
          threshold: 0.05,
          timeWindow: 5,
          aggregation: 'avg'
        },
        severity: 'high',
        enabled: true,
        cooldownPeriod: 15,
        actions: [
          { type: 'log', config: { level: 'error' } }
        ]
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        description: 'Alert when average response time exceeds 2 seconds',
        condition: {
          metric: 'response_time',
          operator: '>',
          threshold: 2000,
          timeWindow: 5,
          aggregation: 'avg'
        },
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 10,
        actions: [
          { type: 'log', config: { level: 'warn' } }
        ]
      },
      {
        id: 'service-unhealthy',
        name: 'Service Unhealthy',
        description: 'Alert when any service becomes unhealthy',
        condition: {
          metric: 'service_health',
          operator: '==',
          threshold: 0, // 0 = unhealthy
          timeWindow: 1,
          aggregation: 'min'
        },
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 5,
        actions: [
          { type: 'log', config: { level: 'error' } }
        ]
      },
      {
        id: 'registration-failures',
        name: 'Registration Failures',
        description: 'Alert when registration failures exceed 3 in 10 minutes',
        condition: {
          metric: 'registration_failures',
          operator: '>',
          threshold: 3,
          timeWindow: 10,
          aggregation: 'sum'
        },
        severity: 'high',
        enabled: true,
        cooldownPeriod: 20,
        actions: [
          { type: 'log', config: { level: 'error' } }
        ]
      }
    ];
    
    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('[ModuleAnalyticsService] Health check failed:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private startAnalyticsUpdates(): void {
    this.analyticsTimer = setInterval(() => {
      try {
        this.updateAnalytics();
        this.cleanupOldData();
      } catch (error) {
        console.error('[ModuleAnalyticsService] Analytics update failed:', error);
      }
    }, this.ANALYTICS_UPDATE_INTERVAL);
  }

  private startAlertMonitoring(): void {
    this.alertTimer = setInterval(() => {
      try {
        this.checkAlerts();
      } catch (error) {
        console.error('[ModuleAnalyticsService] Alert monitoring failed:', error);
      }
    }, this.ALERT_CHECK_INTERVAL);
  }

  private updatePerformanceMetrics(
    operationType: string,
    duration: number,
    success: boolean
  ): void {
    let metrics = this.performanceMetrics.get(operationType);
    
    if (!metrics) {
      metrics = {
        operationType: operationType as any,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        errorRate: 0,
        successRate: 0,
        totalOperations: 0,
        lastUpdated: new Date().toISOString()
      };
      this.performanceMetrics.set(operationType, metrics);
    }
    
    // Update metrics
    metrics.totalOperations++;
    metrics.averageLatency = (metrics.averageLatency * (metrics.totalOperations - 1) + duration) / metrics.totalOperations;
    metrics.successRate = success ? 
      (metrics.successRate * (metrics.totalOperations - 1) + 1) / metrics.totalOperations :
      (metrics.successRate * (metrics.totalOperations - 1)) / metrics.totalOperations;
    metrics.errorRate = 1 - metrics.successRate;
    metrics.lastUpdated = new Date().toISOString();
    
    // Calculate throughput (operations per minute)
    const timeWindow = 60000; // 1 minute
    const recentOperations = this.timeSeriesData
      .filter(point => Date.now() - new Date(point.timestamp).getTime() < timeWindow)
      .length;
    metrics.throughput = recentOperations;
  }

  private updateUsageAnalytics(
    moduleId: string,
    duration: number,
    success: boolean,
    userId?: string
  ): void {
    let analytics = this.usageAnalytics.get(moduleId);
    
    if (!analytics) {
      analytics = {
        moduleId,
        totalQueries: 0,
        uniqueUsers: 0,
        averageResponseTime: 0,
        errorRate: 0,
        popularityScore: 0,
        trendingScore: 0,
        lastAnalyzed: new Date().toISOString(),
        timeSeriesData: []
      };
      this.usageAnalytics.set(moduleId, analytics);
    }
    
    // Update analytics
    analytics.totalQueries++;
    analytics.averageResponseTime = (analytics.averageResponseTime * (analytics.totalQueries - 1) + duration) / analytics.totalQueries;
    
    if (userId) {
      // This is simplified - in a real implementation, you'd track unique users properly
      analytics.uniqueUsers = Math.max(analytics.uniqueUsers, analytics.totalQueries * 0.1);
    }
    
    // Update error rate
    const errorCount = analytics.timeSeriesData.reduce((sum, point) => sum + point.errors, 0) + (success ? 0 : 1);
    analytics.errorRate = errorCount / analytics.totalQueries;
    
    // Add to time series
    analytics.timeSeriesData.push({
      timestamp: new Date().toISOString(),
      queries: 1,
      errors: success ? 0 : 1,
      responseTime: duration,
      uniqueUsers: userId ? 1 : 0
    });
    
    // Keep only recent data
    if (analytics.timeSeriesData.length > this.MAX_TIME_SERIES_POINTS) {
      analytics.timeSeriesData = analytics.timeSeriesData.slice(-this.MAX_TIME_SERIES_POINTS);
    }
    
    analytics.lastAnalyzed = new Date().toISOString();
  }

  private addTimeSeriesDataPoint(point: TimeSeriesDataPoint): void {
    this.timeSeriesData.push(point);
    
    // Keep only recent data
    if (this.timeSeriesData.length > this.MAX_TIME_SERIES_POINTS) {
      this.timeSeriesData = this.timeSeriesData.slice(-this.MAX_TIME_SERIES_POINTS);
    }
  }

  private async checkModuleRegistryHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const stats = this.moduleRegistry.getRegistryStats();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'ModuleRegistry',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          totalModules: stats.totalModules,
          productionModules: stats.productionModules,
          sandboxModules: stats.sandboxModules,
          cacheHitRate: stats.cacheHitRate
        },
        issues: []
      };
    } catch (error) {
      return {
        service: 'ModuleRegistry',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
        issues: [`Registry error: ${error.message}`]
      };
    }
  }

  private async checkQindexHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would be replaced with actual Qindex health check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'QindexService',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: { connected: true },
        issues: []
      };
    } catch (error) {
      return {
        service: 'QindexService',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
        issues: [`Qindex error: ${error.message}`]
      };
    }
  }

  private async checkQlockHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would be replaced with actual Qlock health check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'QlockService',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: { connected: true },
        issues: []
      };
    } catch (error) {
      return {
        service: 'QlockService',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
        issues: [`Qlock error: ${error.message}`]
      };
    }
  }

  private async checkQerberosHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would be replaced with actual Qerberos health check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'QerberosService',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: { connected: true },
        issues: []
      };
    } catch (error) {
      return {
        service: 'QerberosService',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
        issues: [`Qerberos error: ${error.message}`]
      };
    }
  }

  private async checkIPFSHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This would be replaced with actual IPFS health check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'IPFS',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: { connected: true },
        issues: []
      };
    } catch (error) {
      return {
        service: 'IPFS',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: { error: error.message },
        issues: [`IPFS error: ${error.message}`]
      };
    }
  }

  private checkImmediateAlerts(
    operationType: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    // Check for immediate critical conditions
    if (!success && error instanceof ModuleRegistrationError) {
      if (error.code === ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER) {
        this.triggerAlert('security-breach', 'critical', 'Unauthorized registration attempt detected', {
          operationType,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (duration > 10000) { // 10 seconds
      this.triggerAlert('extreme-latency', 'high', 'Extremely slow operation detected', {
        operationType,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  private checkAlerts(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      if (rule.lastTriggered) {
        const lastTriggeredTime = new Date(rule.lastTriggered).getTime();
        const cooldownMs = rule.cooldownPeriod * 60000;
        if (Date.now() - lastTriggeredTime < cooldownMs) {
          continue;
        }
      }
      
      // Evaluate condition
      if (this.evaluateAlertCondition(rule.condition)) {
        this.triggerAlert(rule.id, rule.severity, rule.name, {
          rule: rule.name,
          condition: rule.condition,
          timestamp: new Date().toISOString()
        });
        
        rule.lastTriggered = new Date().toISOString();
      }
    }
  }

  private evaluateAlertCondition(condition: AlertCondition): boolean {
    const timeWindowMs = condition.timeWindow * 60000;
    const cutoffTime = Date.now() - timeWindowMs;
    
    // Get relevant data points
    const relevantData = this.timeSeriesData.filter(point => 
      new Date(point.timestamp).getTime() > cutoffTime
    );
    
    if (relevantData.length === 0) return false;
    
    let value: number;
    
    switch (condition.metric) {
      case 'error_rate':
        const totalOps = relevantData.reduce((sum, point) => sum + point.queries, 0);
        const totalErrors = relevantData.reduce((sum, point) => sum + point.errors, 0);
        value = totalOps > 0 ? totalErrors / totalOps : 0;
        break;
        
      case 'response_time':
        if (condition.aggregation === 'avg') {
          value = relevantData.reduce((sum, point) => sum + point.responseTime, 0) / relevantData.length;
        } else if (condition.aggregation === 'max') {
          value = Math.max(...relevantData.map(point => point.responseTime));
        } else {
          value = 0;
        }
        break;
        
      case 'registration_failures':
        value = relevantData.reduce((sum, point) => sum + point.errors, 0);
        break;
        
      default:
        return false;
    }
    
    // Evaluate condition
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      case '==': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      default: return false;
    }
  }

  private triggerAlert(
    ruleId: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    metadata: Record<string, any>
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId,
      severity,
      title,
      message: `Alert triggered: ${title}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata
    };
    
    this.activeAlerts.set(alert.id, alert);
    
    // Execute alert actions
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.actions.forEach(action => this.executeAlertAction(action, alert));
    }
    
    // Emit alert event
    this.emit('alert', alert);
    
    console.log(`[ModuleAnalyticsService] Alert triggered: ${title} (${severity})`);
  }

  private executeAlertAction(action: AlertAction, alert: Alert): void {
    switch (action.type) {
      case 'log':
        const level = action.config.level || 'info';
        console[level](`[ALERT] ${alert.title}: ${alert.message}`, alert.metadata);
        break;
        
      case 'email':
        // Email implementation would go here
        console.log(`[ModuleAnalyticsService] Would send email alert: ${alert.title}`);
        break;
        
      case 'webhook':
        // Webhook implementation would go here
        console.log(`[ModuleAnalyticsService] Would send webhook alert: ${alert.title}`);
        break;
        
      case 'slack':
        // Slack implementation would go here
        console.log(`[ModuleAnalyticsService] Would send Slack alert: ${alert.title}`);
        break;
    }
  }

  private updateAnalytics(): void {
    // Update popularity and trending scores
    for (const analytics of this.usageAnalytics.values()) {
      // Calculate popularity score based on total queries and unique users
      analytics.popularityScore = Math.log(analytics.totalQueries + 1) * Math.log(analytics.uniqueUsers + 1);
      
      // Calculate trending score based on recent activity
      const recentData = analytics.timeSeriesData.slice(-288); // Last 24 hours
      const recentQueries = recentData.reduce((sum, point) => sum + point.queries, 0);
      analytics.trendingScore = recentQueries / Math.max(recentData.length, 1);
      
      analytics.lastAnalyzed = new Date().toISOString();
    }
  }

  private getTopModules(limit: number): ModuleUsageAnalytics[] {
    return Array.from(this.usageAnalytics.values())
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  }

  private calculateTrends(): {
    registrationsOverTime: TimeSeriesDataPoint[];
    queriesOverTime: TimeSeriesDataPoint[];
    errorsOverTime: TimeSeriesDataPoint[];
  } {
    // Group time series data by hour for trends
    const hourlyData = new Map<string, TimeSeriesDataPoint>();
    
    this.timeSeriesData.forEach(point => {
      const hour = new Date(point.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, {
          timestamp: hour,
          queries: 0,
          errors: 0,
          responseTime: 0,
          uniqueUsers: 0
        });
      }
      
      const hourData = hourlyData.get(hour)!;
      hourData.queries += point.queries;
      hourData.errors += point.errors;
      hourData.responseTime = (hourData.responseTime + point.responseTime) / 2;
      hourData.uniqueUsers += point.uniqueUsers;
    });
    
    const trendData = Array.from(hourlyData.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      registrationsOverTime: trendData,
      queriesOverTime: trendData,
      errorsOverTime: trendData
    };
  }

  private calculateAverageResponseTime(): number {
    const allMetrics = Array.from(this.performanceMetrics.values());
    if (allMetrics.length === 0) return 0;
    
    const totalLatency = allMetrics.reduce((sum, metrics) => sum + metrics.averageLatency, 0);
    return totalLatency / allMetrics.length;
  }

  private calculateOverallErrorRate(): number {
    const allMetrics = Array.from(this.performanceMetrics.values());
    if (allMetrics.length === 0) return 0;
    
    const totalOperations = allMetrics.reduce((sum, metrics) => sum + metrics.totalOperations, 0);
    const totalErrors = allMetrics.reduce((sum, metrics) => sum + (metrics.totalOperations * metrics.errorRate), 0);
    
    return totalOperations > 0 ? totalErrors / totalOperations : 0;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in a real implementation, you'd use a proper CSV library
    const headers = Object.keys(data);
    const csvRows = [headers.join(',')];
    
    // This is a simplified implementation
    csvRows.push(headers.map(header => JSON.stringify(data[header])).join(','));
    
    return csvRows.join('\n');
  }
}

export default ModuleAnalyticsService;