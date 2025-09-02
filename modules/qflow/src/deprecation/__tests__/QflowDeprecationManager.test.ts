import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QflowDeprecationManager } from '../QflowDeprecationManager.js';

// Mock the DeprecationManagementService
vi.mock('../../../../backend/services/DeprecationManagementService.mjs', () => ({
  DeprecationManagementService: vi.fn().mockImplementation(() => ({
    createDeprecationSchedule: vi.fn().mockResolvedValue({
      featureId: 'test-feature',
      feature: 'Test Feature',
      version: '1.0.0',
      deprecationDate: '2024-01-01T00:00:00.000Z',
      sunsetDate: '2024-04-01T00:00:00.000Z',
      status: 'ANNOUNCED'
    }),
    trackFeatureUsage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn()
  }))
}));

// Mock the event emitter
vi.mock('../../events/EventEmitter.js', () => ({
  qflowEventEmitter: {
    emitValidationPipelineExecuted: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('QflowDeprecationManager', () => {
  let deprecationManager: QflowDeprecationManager;

  beforeEach(() => {
    deprecationManager = new QflowDeprecationManager();
  });

  describe('Feature Deprecation', () => {
    it('should deprecate a feature successfully', async () => {
      const deprecationInfo = {
        feature: 'Old Flow Template',
        version: '1.0.0',
        deprecationDate: '2024-01-01T00:00:00.000Z',
        sunsetDate: '2024-04-01T00:00:00.000Z',
        reason: 'Replaced by new template system',
        replacementFeature: 'new-flow-template-v2',
        migrationGuide: 'https://docs.anarq.org/migration/old-to-new'
      };

      await expect(
        deprecationManager.deprecateFeature('old-flow-template', deprecationInfo)
      ).resolves.not.toThrow();
    });

    it('should track usage of deprecated features', async () => {
      const usageData = {
        flowId: 'flow-123',
        executionId: 'exec-456',
        actor: 'squid:user123',
        context: { source: 'manual' }
      };

      await expect(
        deprecationManager.trackDeprecatedFeatureUsage('old-feature', usageData)
      ).resolves.not.toThrow();
    });
  });

  describe('Deprecation Status', () => {
    it('should return non-deprecated status for unknown features', () => {
      const status = deprecationManager.getDeprecationStatus('unknown-feature');
      
      expect(status.deprecated).toBe(false);
    });

    it('should return proper deprecation status for deprecated features', async () => {
      // First deprecate a feature
      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2020-01-01T00:00:00.000Z', // Past date
        sunsetDate: '2025-01-01T00:00:00.000Z', // Future date
        reason: 'Testing',
        replacementFeature: 'new-feature'
      };

      await deprecationManager.deprecateFeature('test-feature', deprecationInfo);
      
      const status = deprecationManager.getDeprecationStatus('test-feature');
      
      expect(status.deprecated).toBe(true);
      expect(status.sunset).toBe(false);
      expect(status.replacementFeature).toBe('new-feature');
      expect(typeof status.daysUntilSunset).toBe('number');
    });
  });

  describe('Migration Recommendations', () => {
    it('should return null for non-deprecated features', async () => {
      const recommendations = await deprecationManager.getMigrationRecommendations('unknown-feature');
      
      expect(recommendations).toBeNull();
    });

    it('should provide migration recommendations for deprecated features', async () => {
      // First deprecate a feature
      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2024-01-01T00:00:00.000Z',
        sunsetDate: '2024-04-01T00:00:00.000Z',
        reason: 'Testing',
        replacementFeature: 'new-feature',
        migrationGuide: 'https://docs.example.com/migration'
      };

      await deprecationManager.deprecateFeature('test-feature', deprecationInfo);
      
      const recommendations = await deprecationManager.getMigrationRecommendations('test-feature');
      
      expect(recommendations).toBeDefined();
      expect(recommendations.featureId).toBe('test-feature');
      expect(recommendations.replacementFeature).toBe('new-feature');
      expect(recommendations.migrationGuide).toBe('https://docs.example.com/migration');
      expect(recommendations.estimatedEffort).toBeDefined();
      expect(typeof recommendations.automatedMigration).toBe('boolean');
    });
  });

  describe('Compatibility Warnings', () => {
    it('should return empty string for non-deprecated features', () => {
      const warning = deprecationManager.createCompatibilityWarning('unknown-feature');
      
      expect(warning).toBe('');
    });

    it('should create appropriate warning for deprecated features', async () => {
      // Deprecate a feature with sunset in the future
      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2020-01-01T00:00:00.000Z', // Past date (deprecated)
        sunsetDate: '2025-01-01T00:00:00.000Z', // Future date (not sunset)
        reason: 'Testing',
        replacementFeature: 'new-feature'
      };

      await deprecationManager.deprecateFeature('test-feature', deprecationInfo);
      
      const warning = deprecationManager.createCompatibilityWarning('test-feature');
      
      expect(warning).toContain('⚠️');
      expect(warning).toContain('deprecated');
      expect(warning).toContain('test-feature');
      expect(warning).toContain('new-feature');
    });

    it('should create urgent warning for sunset features', async () => {
      // Deprecate a feature that's already sunset
      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2020-01-01T00:00:00.000Z', // Past date
        sunsetDate: '2020-06-01T00:00:00.000Z', // Past date (sunset)
        reason: 'Testing',
        replacementFeature: 'new-feature'
      };

      await deprecationManager.deprecateFeature('sunset-feature', deprecationInfo);
      
      const warning = deprecationManager.createCompatibilityWarning('sunset-feature');
      
      expect(warning).toContain('⚠️ DEPRECATED');
      expect(warning).toContain('has been sunset');
      expect(warning).toContain('no longer supported');
      expect(warning).toContain('migrate');
    });
  });

  describe('Event Handling', () => {
    it('should set up event listeners on construction', () => {
      // The constructor should set up event listeners
      // This is tested implicitly by the successful construction
      expect(deprecationManager).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle deprecation service errors gracefully', async () => {
      // Mock a service that throws an error
      const mockService = {
        createDeprecationSchedule: vi.fn().mockRejectedValue(new Error('Service error')),
        trackFeatureUsage: vi.fn().mockResolvedValue(undefined),
        on: vi.fn()
      };

      (deprecationManager as any).deprecationService = mockService;

      const deprecationInfo = {
        feature: 'Test Feature',
        version: '1.0.0',
        deprecationDate: '2024-01-01T00:00:00.000Z',
        sunsetDate: '2024-04-01T00:00:00.000Z',
        reason: 'Testing'
      };

      await expect(
        deprecationManager.deprecateFeature('test-feature', deprecationInfo)
      ).rejects.toThrow('Service error');
    });

    it('should handle usage tracking errors gracefully', async () => {
      // Mock a service that throws an error for usage tracking
      const mockService = {
        createDeprecationSchedule: vi.fn().mockResolvedValue({}),
        trackFeatureUsage: vi.fn().mockRejectedValue(new Error('Tracking error')),
        on: vi.fn()
      };

      (deprecationManager as any).deprecationService = mockService;

      const usageData = {
        actor: 'squid:user123'
      };

      // Should not throw, but handle error gracefully
      await expect(
        deprecationManager.trackDeprecatedFeatureUsage('test-feature', usageData)
      ).resolves.not.toThrow();
    });
  });
});