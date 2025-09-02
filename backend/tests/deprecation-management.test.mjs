/**
 * Deprecation Management Service Tests
 * Comprehensive test suite for deprecation and migration management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import DeprecationManagementService from '../services/DeprecationManagementService.mjs';
import DeprecationTrackingMiddleware from '../middleware/deprecationTracking.mjs';

describe('DeprecationManagementService', () => {
  let service;
  let testDataDir;

  beforeEach(async () => {
    // Create temporary test directory
    testDataDir = path.join(process.cwd(), 'test-deprecation-data');
    await fs.mkdir(testDataDir, { recursive: true });
    
    service = new DeprecationManagementService({
      dataDir: testDataDir
    });
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Deprecation Schedule Management', () => {
    it('should create a deprecation schedule', async () => {
      const schedule = {
        feature: 'Test API',
        version: 'v1',
        deprecationDate: '2024-01-01T00:00:00Z',
        sunsetDate: '2024-06-01T00:00:00Z',
        migrationDeadline: '2024-05-15T00:00:00Z',
        replacementFeature: 'Test API v2',
        migrationGuide: 'https://example.com/migration',
        supportLevel: 'MAINTENANCE'
      };

      const result = await service.createDeprecationSchedule('test-api@v1', schedule);

      expect(result).toBeDefined();
      expect(result.featureId).toBe('test-api@v1');
      expect(result.feature).toBe('Test API');
      expect(result.status).toBe('ANNOUNCED');
      expect(result.notifications.scheduled).toHaveLength(5); // announcement + 4 warnings
    });

    it('should calculate notification schedule correctly', () => {
      const deprecationDate = '2024-01-01T00:00:00Z';
      const sunsetDate = '2024-06-01T00:00:00Z';
      
      const notifications = service.calculateNotificationSchedule(deprecationDate, sunsetDate);
      
      expect(notifications).toHaveLength(5);
      expect(notifications[0].type).toBe('ANNOUNCEMENT');
      expect(notifications[1].type).toBe('WARNING_90_DAYS');
      expect(notifications[2].type).toBe('WARNING_30_DAYS');
      expect(notifications[3].type).toBe('FINAL_WARNING');
      expect(notifications[4].type).toBe('SUNSET');
    });

    it('should get deprecation status', async () => {
      const schedule = {
        feature: 'Test API',
        version: 'v1',
        deprecationDate: '2025-01-01T00:00:00Z',
        sunsetDate: '2026-06-01T00:00:00Z' // Future date to ensure isActive is true
      };

      await service.createDeprecationSchedule('test-api@v1', schedule);
      const status = service.getDeprecationStatus('test-api@v1');

      expect(status.isDeprecated).toBe(true);
      expect(status.schedule).toBeDefined();
      expect(status.schedule.sunsetDate).toBe('2026-06-01T00:00:00Z');
      expect(status.isActive).toBe(true);
    });
  });

  describe('Usage Telemetry', () => {
    it('should track feature usage', async () => {
      const usageData = {
        consumerId: 'test-consumer',
        context: { endpoint: '/api/test' },
        metadata: { userAgent: 'test-agent' }
      };

      const result = await service.trackFeatureUsage('test-feature@v1', usageData);

      expect(result.totalUsage).toBe(1);
      expect(result.uniqueConsumers).toContain('test-consumer');
      expect(result.usageHistory).toHaveLength(1);
    });

    it('should track multiple consumers', async () => {
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer1' });
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer2' });
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer1' });

      const telemetry = service.usageTelemetry.get('test-feature@v1');

      expect(telemetry.totalUsage).toBe(3);
      expect(telemetry.uniqueConsumers.size).toBe(2);
      expect(telemetry.consumers.get('consumer1').usageCount).toBe(2);
      expect(telemetry.consumers.get('consumer2').usageCount).toBe(1);
    });

    it('should update consumer migration status', async () => {
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer1' });
      
      const telemetry = service.usageTelemetry.get('test-feature@v1');
      expect(telemetry.consumers.get('consumer1').migrationStatus).toBe('NOT_STARTED');
    });
  });

  describe('Migration Management', () => {
    it('should create a migration plan', async () => {
      const migrationPlan = {
        fromFeature: 'test-api@v1',
        toFeature: 'test-api@v2',
        steps: [
          {
            name: 'Update endpoints',
            type: 'API_MIGRATION',
            configuration: { oldEndpoint: '/v1', newEndpoint: '/v2' }
          }
        ],
        validationRules: [
          {
            name: 'API compatibility',
            type: 'API_COMPATIBILITY',
            configuration: { endpoints: ['/v2'] }
          }
        ],
        rollbackSupport: true
      };

      const result = await service.createMigrationPlan('test-api@v1', migrationPlan);

      expect(result.featureId).toBe('test-api@v1');
      expect(result.status).toBe('PLANNED');
      expect(result.migrationSteps).toHaveLength(1);
      expect(result.validationRules).toHaveLength(1);
    });

    it('should execute migration successfully', async () => {
      // Create migration plan first
      const migrationPlan = {
        fromFeature: 'test-api@v1',
        toFeature: 'test-api@v2',
        steps: [
          {
            name: 'Test step',
            type: 'CONFIG_UPDATE',
            configuration: {}
          }
        ],
        validationRules: [
          {
            name: 'Test validation',
            type: 'API_COMPATIBILITY',
            configuration: {}
          }
        ]
      };

      await service.createMigrationPlan('test-api@v1', migrationPlan);

      // Execute migration
      const result = await service.executeMigration('test-api@v1', 'test-consumer');

      expect(result.status).toBe('COMPLETED');
      expect(result.steps).toHaveLength(1);
      expect(result.validationResults).toHaveLength(1);
    });

    it('should handle migration failures', async () => {
      // Mock a failing migration step
      const originalExecuteStep = service.executeMigrationStep;
      service.executeMigrationStep = vi.fn().mockResolvedValue({
        success: false,
        error: 'Migration step failed'
      });

      const migrationPlan = {
        fromFeature: 'test-api@v1',
        toFeature: 'test-api@v2',
        steps: [{ name: 'Failing step', type: 'CONFIG_UPDATE' }],
        validationRules: []
      };

      await service.createMigrationPlan('test-api@v1', migrationPlan);
      const result = await service.executeMigration('test-api@v1', 'test-consumer');

      expect(result.status).toBe('FAILED');
      expect(result.errors).toContain('Migration step failed');

      // Restore original method
      service.executeMigrationStep = originalExecuteStep;
    });

    it('should get migration progress', async () => {
      // Track some usage first
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer1' });
      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer2' });

      const progress = service.getMigrationProgress('test-feature@v1');

      expect(progress.totalConsumers).toBe(2);
      expect(progress.migrationStatus.NOT_STARTED).toBe(2);
      expect(progress.consumers).toHaveLength(2);
    });
  });

  describe('Compatibility Layers', () => {
    it('should create a compatibility layer', async () => {
      const layerConfig = {
        type: 'ADAPTER',
        configuration: {
          proxyTo: '/api/v2',
          transformations: { fieldMappings: { name: 'fullName' } }
        },
        expiresAt: '2024-12-31T00:00:00Z'
      };

      const result = await service.createCompatibilityLayer('test-api@v1', layerConfig);

      expect(result.featureId).toBe('test-api@v1');
      expect(result.layerType).toBe('ADAPTER');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('Automated Timeline Management', () => {
    it('should process scheduled notifications', async () => {
      const mockSendNotification = vi.fn();
      service.sendDeprecationNotification = mockSendNotification;

      // Create a schedule with a notification due now
      const schedule = {
        feature: 'Test API',
        version: 'v1',
        deprecationDate: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        sunsetDate: new Date(Date.now() + 86400000).toISOString() // 1 day from now
      };

      await service.createDeprecationSchedule('test-api@v1', schedule);
      await service.processScheduledNotifications();

      expect(mockSendNotification).toHaveBeenCalled();
    });
  });

  describe('Reporting', () => {
    it('should generate deprecation report', async () => {
      // Create some test data
      await service.createDeprecationSchedule('test-api@v1', {
        feature: 'Test API',
        version: 'v1',
        deprecationDate: '2024-01-01T00:00:00Z',
        sunsetDate: '2024-06-01T00:00:00Z'
      });

      await service.trackFeatureUsage('test-api@v1', { consumerId: 'consumer1' });

      const report = await service.generateDeprecationReport();

      expect(report.summary.totalDeprecatedFeatures).toBe(1);
      expect(report.features).toHaveLength(1);
      expect(report.features[0].featureId).toBe('test-api@v1');
    });
  });

  describe('Event Emission', () => {
    it('should emit deprecation.announced event', async () => {
      const eventSpy = vi.fn();
      service.on('deprecation.announced', eventSpy);

      await service.createDeprecationSchedule('test-api@v1', {
        feature: 'Test API',
        version: 'v1',
        deprecationDate: '2024-01-01T00:00:00Z',
        sunsetDate: '2024-06-01T00:00:00Z'
      });

      expect(eventSpy).toHaveBeenCalledWith({
        featureId: 'test-api@v1',
        schedule: expect.any(Object)
      });
    });

    it('should emit usage.tracked event', async () => {
      const eventSpy = vi.fn();
      service.on('usage.tracked', eventSpy);

      await service.trackFeatureUsage('test-feature@v1', { consumerId: 'consumer1' });

      expect(eventSpy).toHaveBeenCalledWith({
        featureId: 'test-feature@v1',
        consumerId: 'consumer1',
        usage: expect.any(Object)
      });
    });
  });
});

describe('DeprecationTrackingMiddleware', () => {
  let middleware;
  let mockService;

  beforeEach(() => {
    mockService = {
      trackFeatureUsage: vi.fn().mockResolvedValue({}),
      generateDeprecationReport: vi.fn().mockResolvedValue({ features: [] })
    };

    middleware = new DeprecationTrackingMiddleware({
      deprecationService: mockService,
      trackingEnabled: true
    });
  });

  describe('API Tracking', () => {
    it('should register deprecated endpoints', () => {
      middleware.registerDeprecatedEndpoint('/api/v1/test', 'GET', 'test-api@v1', {
        deprecationDate: '2024-01-01T00:00:00Z',
        sunsetDate: '2024-06-01T00:00:00Z'
      });

      const endpoint = middleware.deprecatedEndpoints.get('GET /api/v1/test');
      expect(endpoint).toBeDefined();
      expect(endpoint.featureId).toBe('test-api@v1');
    });

    it('should track deprecated API usage', async () => {
      middleware.registerDeprecatedEndpoint('/api/v1/test', 'GET', 'test-api@v1');

      const mockReq = {
        method: 'GET',
        path: '/api/v1/test',
        get: vi.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
        query: {}
      };

      const mockRes = {
        set: vi.fn()
      };

      const mockNext = vi.fn();

      const trackingMiddleware = middleware.trackDeprecatedAPI();
      await trackingMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-API-Deprecated': 'true',
        'X-API-Deprecation-Date': 'unknown',
        'X-API-Sunset-Date': 'unknown',
        'X-API-Replacement': '',
        'X-API-Migration-Guide': ''
      });

      expect(mockService.trackFeatureUsage).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Feature Tracking', () => {
    it('should track deprecated feature usage', async () => {
      await middleware.trackDeprecatedFeature('test-feature@v1', {
        consumerId: 'test-consumer'
      });

      expect(mockService.trackFeatureUsage).toHaveBeenCalledWith(
        'test-feature@v1',
        expect.objectContaining({
          consumerId: 'test-consumer'
        })
      );
    });

    it('should not track when disabled', async () => {
      middleware.trackingEnabled = false;

      await middleware.trackDeprecatedFeature('test-feature@v1', {
        consumerId: 'test-consumer'
      });

      expect(mockService.trackFeatureUsage).not.toHaveBeenCalled();
    });
  });

  describe('Usage Analytics', () => {
    it('should generate usage analytics', async () => {
      const mockTelemetry = {
        totalUsage: 100,
        uniqueConsumers: ['consumer1', 'consumer2'],
        usageHistory: [
          {
            timestamp: '2024-01-01T10:00:00Z',
            consumerId: 'consumer1'
          },
          {
            timestamp: '2024-01-02T10:00:00Z',
            consumerId: 'consumer2'
          }
        ]
      };

      middleware.deprecationService.usageTelemetry = new Map([
        ['test-feature@v1', mockTelemetry]
      ]);

      const analytics = await middleware.generateUsageAnalytics('test-feature@v1');

      expect(analytics.totalUsage).toBe(100);
      expect(analytics.uniqueConsumers).toBe(2);
      expect(analytics.usageByDay).toBeDefined();
      expect(analytics.topConsumers).toBeDefined();
    });

    it('should return null for non-existent feature', async () => {
      const analytics = await middleware.generateUsageAnalytics('non-existent@v1');
      expect(analytics).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should extract consumer ID from request', () => {
      const mockReq = {
        get: vi.fn()
          .mockReturnValueOnce('squid-123') // x-squid-id
          .mockReturnValueOnce(null) // x-consumer-id
          .mockReturnValueOnce(null), // x-api-key
        ip: '127.0.0.1'
      };

      const consumerId = middleware.extractConsumerId(mockReq);
      expect(consumerId).toBe('squid-123');
    });

    it('should sanitize sensitive headers', () => {
      const headers = {
        'authorization': 'Bearer token123',
        'x-api-key': 'key123',
        'user-agent': 'test-agent',
        'content-type': 'application/json'
      };

      const sanitized = middleware.sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
      expect(sanitized['user-agent']).toBe('test-agent');
      expect(sanitized['content-type']).toBe('application/json');
    });

    it('should check if feature is deprecated', () => {
      middleware.deprecatedFeatures.set('test-feature@v1', {
        featureId: 'test-feature@v1',
        status: 'ANNOUNCED'
      });

      expect(middleware.isFeatureDeprecated('test-feature@v1')).toBe(true);
      expect(middleware.isFeatureDeprecated('non-existent@v1')).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  let service;
  let middleware;
  let testDataDir;

  beforeEach(async () => {
    testDataDir = path.join(process.cwd(), 'test-integration-data');
    await fs.mkdir(testDataDir, { recursive: true });
    
    service = new DeprecationManagementService({ dataDir: testDataDir });
    middleware = new DeprecationTrackingMiddleware({ deprecationService: service });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should handle complete deprecation workflow', async () => {
    // 1. Create deprecation schedule
    const schedule = await service.createDeprecationSchedule('integration-test@v1', {
      feature: 'Integration Test API',
      version: 'v1',
      deprecationDate: '2024-01-01T00:00:00Z',
      sunsetDate: '2024-06-01T00:00:00Z'
    });

    expect(schedule.status).toBe('ANNOUNCED');

    // 2. Track usage
    await service.trackFeatureUsage('integration-test@v1', {
      consumerId: 'test-consumer',
      context: { test: true }
    });

    // 3. Create migration plan
    const migrationPlan = await service.createMigrationPlan('integration-test@v1', {
      fromFeature: 'integration-test@v1',
      toFeature: 'integration-test@v2',
      steps: [
        {
          name: 'Test migration',
          type: 'CONFIG_UPDATE',
          configuration: {}
        }
      ],
      validationRules: []
    });

    expect(migrationPlan.status).toBe('PLANNED');

    // 4. Execute migration
    const migrationResult = await service.executeMigration('integration-test@v1', 'test-consumer');
    expect(migrationResult.status).toBe('COMPLETED');

    // 5. Check migration progress
    const progress = service.getMigrationProgress('integration-test@v1');
    expect(progress.migrationStatus.COMPLETED).toBe(1);

    // 6. Generate report
    const report = await service.generateDeprecationReport();
    expect(report.summary.totalDeprecatedFeatures).toBe(1);
    expect(report.summary.completedMigrations).toBe(1);
  });
});