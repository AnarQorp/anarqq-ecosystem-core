/**
 * Module Analytics Service Tests
 * Comprehensive test suite for analytics and monitoring functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ModuleAnalyticsService } from '../ModuleAnalyticsService';
import { ModuleRegistry } from '../ModuleRegistry';
import { EventEmitter } from 'events';

// Mock ModuleRegistry
vi.mock('../ModuleRegistry');

describe('ModuleAnalyticsService', () => {
  let analyticsService: ModuleAnalyticsService;
  let mockModuleRegistry: ModuleRegistry;

  beforeEach(() => {
    // Create mock registry
    mockModuleRegistry = {
      getRegistryStats: vi.fn().mockReturnValue({
        totalModules: 10,
        productionModules: 8,
        sandboxModules: 2,
        totalAccesses: 100,
        cacheHitRate: 85,
        auditLogSize: 50
      }),
      getAuditLog: vi.fn().mockReturnValue([
        {
          eventId: 'evt_1',
          moduleId: 'test-module',
          action: 'REGISTERED',
          actorIdentity: 'did:test:user',
          timestamp: new Date().toISOString(),
          details: { version: '1.0.0' }
        }
      ]),
      getAllAccessStats: vi.fn().mockReturnValue(new Map())
    } as any;

    analyticsService = new ModuleAnalyticsService(mockModuleRegistry);
  });

  afterEach(() => {
    analyticsService.stop();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(analyticsService).toBeInstanceOf(ModuleAnalyticsService);
      expect(analyticsService).toBeInstanceOf(EventEmitter);
    });

    it('should set up default alert rules', () => {
      const alertRules = analyticsService.getAlertRules();
      expect(alertRules.length).toBeGreaterThan(0);
      
      const errorRateRule = alertRules.find(rule => rule.id === 'high-error-rate');
      expect(errorRateRule).toBeDefined();
      expect(errorRateRule?.enabled).toBe(true);
    });
  });

  describe('Operation Recording', () => {
    it('should record successful operations', () => {
      const moduleId = 'test-module';
      const duration = 150;
      const userId = 'user123';

      analyticsService.recordOperation('register', moduleId, duration, true, userId);

      const moduleAnalytics = analyticsService.getModuleAnalytics(moduleId);
      expect(moduleAnalytics).toBeDefined();
      expect(moduleAnalytics?.totalQueries).toBe(1);
      expect(moduleAnalytics?.averageResponseTime).toBe(duration);
    });

    it('should record failed operations', () => {
      const moduleId = 'test-module';
      const duration = 200;
      const error = new Error('Test error');

      analyticsService.recordOperation('register', moduleId, duration, false, undefined, error);

      const moduleAnalytics = analyticsService.getModuleAnalytics(moduleId);
      expect(moduleAnalytics).toBeDefined();
      expect(moduleAnalytics?.totalQueries).toBe(1);
      expect(moduleAnalytics?.errorRate).toBe(1);
    });

    it('should update performance metrics', () => {
      analyticsService.recordOperation('register', 'module1', 100, true);
      analyticsService.recordOperation('register', 'module2', 200, false);

      const performanceMetrics = analyticsService.getPerformanceMetrics('register');
      expect(performanceMetrics).toHaveLength(1);
      
      const registerMetrics = performanceMetrics[0];
      expect(registerMetrics.operationType).toBe('register');
      expect(registerMetrics.totalOperations).toBe(2);
      expect(registerMetrics.successRate).toBe(0.5);
      expect(registerMetrics.errorRate).toBe(0.5);
    });

    it('should emit operation events', async () => {
      return new Promise<void>((resolve) => {
        analyticsService.on('operation', (data) => {
          expect(data.type).toBe('register');
          expect(data.moduleId).toBe('test-module');
          expect(data.success).toBe(true);
          resolve();
        });

        analyticsService.recordOperation('register', 'test-module', 100, true);
      });
    });
  });

  describe('Analytics Data', () => {
    beforeEach(() => {
      // Record some test data
      analyticsService.recordOperation('register', 'module1', 100, true, 'user1');
      analyticsService.recordOperation('register', 'module1', 150, true, 'user2');
      analyticsService.recordOperation('update', 'module2', 200, false);
      analyticsService.recordOperation('search', 'module3', 50, true);
    });

    it('should return module analytics', () => {
      const module1Analytics = analyticsService.getModuleAnalytics('module1');
      expect(module1Analytics).toBeDefined();
      expect(module1Analytics?.totalQueries).toBe(2);
      expect(module1Analytics?.averageResponseTime).toBe(125);
      expect(module1Analytics?.errorRate).toBe(0);
    });

    it('should return all module analytics', () => {
      const allAnalytics = analyticsService.getAllModuleAnalytics();
      expect(allAnalytics).toHaveLength(3);
      
      const moduleIds = allAnalytics.map(a => a.moduleId);
      expect(moduleIds).toContain('module1');
      expect(moduleIds).toContain('module2');
      expect(moduleIds).toContain('module3');
    });

    it('should return performance metrics by operation type', () => {
      const registerMetrics = analyticsService.getPerformanceMetrics('register');
      expect(registerMetrics).toHaveLength(1);
      expect(registerMetrics[0].totalOperations).toBe(2);

      const allMetrics = analyticsService.getPerformanceMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Health Checks', () => {
    it('should perform health checks', async () => {
      const healthStatus = await analyticsService.performHealthChecks();
      
      expect(healthStatus).toBeDefined();
      expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.services).toBeInstanceOf(Array);
      expect(healthStatus.services.length).toBeGreaterThan(0);
      expect(healthStatus.uptime).toBeGreaterThan(0);
    });

    it('should return current health status', () => {
      const healthStatus = analyticsService.getHealthStatus();
      
      expect(healthStatus).toBeDefined();
      expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.lastCheck).toBeDefined();
    });

    it('should emit health check events', async () => {
      return new Promise<void>((resolve) => {
        analyticsService.on('healthCheck', (healthStatus) => {
          expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
          expect(healthStatus.services).toBeInstanceOf(Array);
          resolve();
        });

        analyticsService.performHealthChecks();
      });
    });
  });

  describe('Alert Management', () => {
    it('should add alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        condition: {
          metric: 'error_rate',
          operator: '>' as const,
          threshold: 0.1,
          timeWindow: 5,
          aggregation: 'avg' as const
        },
        severity: 'medium' as const,
        enabled: true,
        cooldownPeriod: 10,
        actions: []
      };

      analyticsService.addAlertRule(rule);
      
      const rules = analyticsService.getAlertRules();
      const addedRule = rules.find(r => r.id === 'test-rule');
      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Test Rule');
    });

    it('should remove alert rules', () => {
      const rule = {
        id: 'test-rule-remove',
        name: 'Test Rule Remove',
        description: 'Test alert rule for removal',
        condition: {
          metric: 'error_rate',
          operator: '>' as const,
          threshold: 0.1,
          timeWindow: 5,
          aggregation: 'avg' as const
        },
        severity: 'low' as const,
        enabled: true,
        cooldownPeriod: 5,
        actions: []
      };

      analyticsService.addAlertRule(rule);
      expect(analyticsService.getAlertRules().find(r => r.id === 'test-rule-remove')).toBeDefined();

      const removed = analyticsService.removeAlertRule('test-rule-remove');
      expect(removed).toBe(true);
      expect(analyticsService.getAlertRules().find(r => r.id === 'test-rule-remove')).toBeUndefined();
    });

    it('should get active alerts', () => {
      const activeAlerts = analyticsService.getActiveAlerts();
      expect(activeAlerts).toBeInstanceOf(Array);
      
      // All active alerts should not be resolved
      activeAlerts.forEach(alert => {
        expect(alert.resolved).toBe(false);
      });
    });

    it('should resolve alerts', () => {
      // First, we need to trigger an alert
      // This is a simplified test - in practice, alerts would be triggered by conditions
      const alertId = 'test-alert-id';
      
      // Mock an active alert
      const mockAlert = {
        id: alertId,
        ruleId: 'test-rule',
        severity: 'medium' as const,
        title: 'Test Alert',
        message: 'Test alert message',
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: {}
      };
      
      // Add the alert directly to test resolution
      (analyticsService as any).activeAlerts.set(alertId, mockAlert);
      
      const resolved = analyticsService.resolveAlert(alertId);
      expect(resolved).toBe(true);
      
      const activeAlerts = analyticsService.getActiveAlerts();
      expect(activeAlerts.find(a => a.id === alertId)).toBeUndefined();
    });
  });

  describe('Dashboard Data', () => {
    beforeEach(() => {
      // Add some test data
      analyticsService.recordOperation('register', 'module1', 100, true, 'user1');
      analyticsService.recordOperation('register', 'module2', 150, true, 'user2');
      analyticsService.recordOperation('update', 'module1', 200, false);
    });

    it('should return comprehensive dashboard data', () => {
      const dashboardData = analyticsService.getDashboardData();
      
      expect(dashboardData).toBeDefined();
      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.recentActivity).toBeInstanceOf(Array);
      expect(dashboardData.topModules).toBeInstanceOf(Array);
      expect(dashboardData.performanceMetrics).toBeInstanceOf(Array);
      expect(dashboardData.healthStatus).toBeDefined();
      expect(dashboardData.activeAlerts).toBeInstanceOf(Array);
      expect(dashboardData.trends).toBeDefined();
    });

    it('should calculate overview metrics correctly', () => {
      const dashboardData = analyticsService.getDashboardData();
      const overview = dashboardData.overview;
      
      expect(overview.totalModules).toBe(10); // From mock registry
      expect(overview.activeModules).toBe(8); // From mock registry
      expect(overview.totalQueries).toBeGreaterThan(0);
      expect(overview.averageResponseTime).toBeGreaterThan(0);
      expect(overview.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include trends data', () => {
      const dashboardData = analyticsService.getDashboardData();
      const trends = dashboardData.trends;
      
      expect(trends.registrationsOverTime).toBeInstanceOf(Array);
      expect(trends.queriesOverTime).toBeInstanceOf(Array);
      expect(trends.errorsOverTime).toBeInstanceOf(Array);
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      analyticsService.recordOperation('register', 'module1', 100, true);
      analyticsService.recordOperation('update', 'module2', 200, false);
    });

    it('should export analytics data as JSON', () => {
      const jsonData = analyticsService.exportAnalyticsData('json');
      
      expect(jsonData).toBeDefined();
      expect(() => JSON.parse(jsonData)).not.toThrow();
      
      const parsed = JSON.parse(jsonData);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.overview).toBeDefined();
      expect(parsed.moduleAnalytics).toBeInstanceOf(Array);
      expect(parsed.performanceMetrics).toBeInstanceOf(Array);
    });

    it('should export analytics data as CSV', () => {
      const csvData = analyticsService.exportAnalyticsData('csv');
      
      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe('string');
      expect(csvData.length).toBeGreaterThan(0);
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up old data', () => {
      // Record some operations
      analyticsService.recordOperation('register', 'module1', 100, true);
      analyticsService.recordOperation('update', 'module2', 200, false);
      
      // Mock old timestamp
      const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      
      // Add old alert
      const oldAlert = {
        id: 'old-alert',
        ruleId: 'test-rule',
        severity: 'low' as const,
        title: 'Old Alert',
        message: 'Old alert message',
        timestamp: oldTimestamp,
        resolved: true,
        resolvedAt: oldTimestamp,
        metadata: {}
      };
      
      (analyticsService as any).activeAlerts.set('old-alert', oldAlert);
      
      // Clean up
      analyticsService.cleanupOldData();
      
      // Old alert should be removed
      const allAlerts = analyticsService.getAllAlerts();
      expect(allAlerts.find(a => a.id === 'old-alert')).toBeUndefined();
    });
  });

  describe('Service Lifecycle', () => {
    it('should stop the service cleanly', () => {
      // Start the service (it's already started in beforeEach)
      expect(analyticsService).toBeDefined();
      
      // Stop the service
      analyticsService.stop();
      
      // Service should still be accessible but timers should be cleared
      expect(analyticsService.getHealthStatus()).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in health checks gracefully', async () => {
      // Mock a failing health check
      const originalMethod = (analyticsService as any).checkModuleRegistryHealth;
      (analyticsService as any).checkModuleRegistryHealth = vi.fn().mockResolvedValue({
        service: 'ModuleRegistry',
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: 0,
        details: { error: 'Health check failed' },
        issues: ['Health check failed']
      });
      
      const healthStatus = await analyticsService.performHealthChecks();
      
      // Should still return a health status even if some checks fail
      expect(healthStatus).toBeDefined();
      expect(healthStatus.services).toBeInstanceOf(Array);
      
      // Restore original method
      (analyticsService as any).checkModuleRegistryHealth = originalMethod;
    });

    it('should handle missing module analytics gracefully', () => {
      const nonExistentModule = analyticsService.getModuleAnalytics('non-existent-module');
      expect(nonExistentModule).toBeNull();
    });

    it('should handle invalid alert rule removal', () => {
      const removed = analyticsService.removeAlertRule('non-existent-rule');
      expect(removed).toBe(false);
    });
  });

  describe('Real-time Updates', () => {
    it('should emit events for operations', async () => {
      return new Promise<void>((resolve) => {
        let eventCount = 0;
        
        analyticsService.on('operation', (data) => {
          eventCount++;
          if (eventCount === 2) {
            expect(eventCount).toBe(2);
            resolve();
          }
        });
        
        analyticsService.recordOperation('register', 'module1', 100, true);
        analyticsService.recordOperation('update', 'module2', 200, false);
      });
    });

    it('should emit events for alerts', async () => {
      return new Promise<void>((resolve) => {
        analyticsService.on('alert', (alert) => {
          expect(alert.title).toBeDefined();
          expect(alert.severity).toMatch(/low|medium|high|critical/);
          resolve();
        });
        
        // Trigger an immediate alert by recording a very slow operation
        analyticsService.recordOperation('register', 'slow-module', 15000, true);
      });
    });
  });
});

describe('ModuleAnalyticsService Integration', () => {
  let analyticsService: ModuleAnalyticsService;
  let mockModuleRegistry: ModuleRegistry;

  beforeEach(() => {
    // Create mock registry with proper methods
    mockModuleRegistry = {
      getRegistryStats: vi.fn().mockReturnValue({
        totalModules: 5,
        productionModules: 4,
        sandboxModules: 1,
        totalAccesses: 50,
        cacheHitRate: 90,
        auditLogSize: 25
      }),
      getAuditLog: vi.fn().mockReturnValue([
        {
          eventId: 'evt_integration_1',
          moduleId: 'integration-module',
          action: 'REGISTERED',
          actorIdentity: 'did:test:integration',
          timestamp: new Date().toISOString(),
          details: { version: '1.0.0' }
        }
      ]),
      getAllAccessStats: vi.fn().mockReturnValue(new Map())
    } as any;

    analyticsService = new ModuleAnalyticsService(mockModuleRegistry);
  });

  afterEach(() => {
    analyticsService.stop();
  });

  it('should integrate with ModuleRegistry for statistics', () => {
    const dashboardData = analyticsService.getDashboardData();
    
    expect(dashboardData.overview.totalModules).toBe(5);
    expect(dashboardData.overview.activeModules).toBe(4);
    expect(dashboardData.recentActivity).toBeInstanceOf(Array);
  });

  it('should provide comprehensive monitoring capabilities', async () => {
    // Record various operations
    analyticsService.recordOperation('register', 'module1', 100, true, 'user1');
    analyticsService.recordOperation('register', 'module2', 150, true, 'user2');
    analyticsService.recordOperation('update', 'module1', 200, false);
    analyticsService.recordOperation('search', 'module3', 50, true, 'user3');
    analyticsService.recordOperation('verify', 'module2', 75, true);
    
    // Get comprehensive data
    const dashboardData = analyticsService.getDashboardData();
    const healthStatus = await analyticsService.performHealthChecks();
    const performanceMetrics = analyticsService.getPerformanceMetrics();
    const moduleAnalytics = analyticsService.getAllModuleAnalytics();
    
    // Verify comprehensive monitoring
    expect(dashboardData.overview.totalQueries).toBeGreaterThan(0);
    expect(dashboardData.performanceMetrics.length).toBeGreaterThan(0);
    expect(healthStatus.services.length).toBeGreaterThan(0);
    expect(performanceMetrics.length).toBeGreaterThan(0);
    expect(moduleAnalytics.length).toBeGreaterThan(0);
    
    // Verify data consistency
    const totalQueries = moduleAnalytics.reduce((sum, analytics) => sum + analytics.totalQueries, 0);
    expect(totalQueries).toBe(5); // 5 operations recorded
  });
});