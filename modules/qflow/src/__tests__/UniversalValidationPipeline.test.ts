/**
 * Universal Validation Pipeline Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  universalValidationPipeline, 
  UniversalValidationPipeline,
  ValidationRequest,
  ValidationResult,
  ValidationLayer,
  ValidationContext
} from '../validation/UniversalValidationPipeline.js';

describe('UniversalValidationPipeline', () => {
  let pipeline: UniversalValidationPipeline;

  beforeEach(async () => {
    // Create a new instance for each test to avoid state pollution
    pipeline = new UniversalValidationPipeline();
    await pipeline.initialize();
  });

  afterEach(async () => {
    await pipeline.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newPipeline = new UniversalValidationPipeline();
      await expect(newPipeline.initialize()).resolves.not.toThrow();
      expect(newPipeline.isReady()).toBe(true);
      await newPipeline.shutdown();
    });

    it('should not initialize twice', async () => {
      await pipeline.initialize(); // Second call should not throw
      expect(pipeline.isReady()).toBe(true);
    });

    it('should register default layers on initialization', async () => {
      const layers = pipeline.getLayers();
      expect(layers.length).toBeGreaterThan(0);
      
      const layerIds = layers.map(l => l.layerId);
      expect(layerIds).toContain('schema-validation');
      expect(layerIds).toContain('business-rules');
      expect(layerIds).toContain('security-validation');
    });
  });

  describe('layer management', () => {
    it('should register custom validation layer', async () => {
      const customLayer: ValidationLayer = {
        layerId: 'custom-test',
        name: 'Custom Test Layer',
        description: 'A custom test validation layer',
        priority: 10,
        required: false,
        timeout: 5000
      };

      const validator = async (data: any, context: ValidationContext): Promise<ValidationResult> => {
        return {
          layerId: 'custom-test',
          status: 'passed',
          message: 'Custom validation passed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(customLayer, validator);
      
      const layers = pipeline.getLayers();
      const customLayerFound = layers.find(l => l.layerId === 'custom-test');
      
      expect(customLayerFound).toBeDefined();
      expect(customLayerFound?.name).toBe('Custom Test Layer');
    });

    it('should unregister validation layer', async () => {
      const customLayer: ValidationLayer = {
        layerId: 'removable-test',
        name: 'Removable Test Layer',
        description: 'A removable test validation layer',
        priority: 10,
        required: false,
        timeout: 5000
      };

      const validator = async (): Promise<ValidationResult> => {
        return {
          layerId: 'removable-test',
          status: 'passed',
          message: 'Test passed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(customLayer, validator);
      const removed = pipeline.unregisterLayer('removable-test');
      
      expect(removed).toBe(true);
      
      const layers = pipeline.getLayers();
      const removedLayer = layers.find(l => l.layerId === 'removable-test');
      
      expect(removedLayer).toBeUndefined();
    });

    it('should return false when removing non-existent layer', () => {
      const removed = pipeline.unregisterLayer('non-existent-layer');
      expect(removed).toBe(false);
    });
  });

  describe('validation execution', () => {
    it('should execute validation pipeline successfully', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-001',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation', 'security-validation']
      };

      const result = await pipeline.validate(request);
      
      expect(result).toBeDefined();
      expect(result.requestId).toBe('test-001');
      expect(result.overallStatus).toBe('passed');
      expect(result.results).toHaveLength(2);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('should handle validation failure', async () => {
      const failingLayer: ValidationLayer = {
        layerId: 'failing-test',
        name: 'Failing Test Layer',
        description: 'A layer that always fails',
        priority: 1,
        required: true,
        timeout: 5000
      };

      const failingValidator = async (): Promise<ValidationResult> => {
        return {
          layerId: 'failing-test',
          status: 'failed',
          message: 'Validation failed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(failingLayer, failingValidator);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-002',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['failing-test']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.results[0].status).toBe('failed');
    });

    it('should handle validation warning', async () => {
      const warningLayer: ValidationLayer = {
        layerId: 'warning-test',
        name: 'Warning Test Layer',
        description: 'A layer that returns warnings',
        priority: 1,
        required: false,
        timeout: 5000
      };

      const warningValidator = async (): Promise<ValidationResult> => {
        return {
          layerId: 'warning-test',
          status: 'warning',
          message: 'Validation warning',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(warningLayer, warningValidator);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-003',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['warning-test']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('warning');
      expect(result.results[0].status).toBe('warning');
    });

    it('should execute layers in priority order', async () => {
      const highPriorityLayer: ValidationLayer = {
        layerId: 'high-priority',
        name: 'High Priority Layer',
        description: 'High priority layer',
        priority: 1,
        required: false,
        timeout: 5000
      };

      const lowPriorityLayer: ValidationLayer = {
        layerId: 'low-priority',
        name: 'Low Priority Layer',
        description: 'Low priority layer',
        priority: 10,
        required: false,
        timeout: 5000
      };

      const executionOrder: string[] = [];

      const highPriorityValidator = async (): Promise<ValidationResult> => {
        executionOrder.push('high-priority');
        return {
          layerId: 'high-priority',
          status: 'passed',
          message: 'High priority passed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      const lowPriorityValidator = async (): Promise<ValidationResult> => {
        executionOrder.push('low-priority');
        return {
          layerId: 'low-priority',
          status: 'passed',
          message: 'Low priority passed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(highPriorityLayer, highPriorityValidator);
      pipeline.registerLayer(lowPriorityLayer, lowPriorityValidator);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-004',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['low-priority', 'high-priority'] // Intentionally out of order
      };

      await pipeline.validate(request);
      
      expect(executionOrder).toEqual(['high-priority', 'low-priority']);
    });

    it('should short-circuit on required layer failure', async () => {
      const requiredFailingLayer: ValidationLayer = {
        layerId: 'required-failing',
        name: 'Required Failing Layer',
        description: 'Required layer that fails',
        priority: 1,
        required: true,
        timeout: 5000
      };

      const subsequentLayer: ValidationLayer = {
        layerId: 'subsequent',
        name: 'Subsequent Layer',
        description: 'Layer that should not execute',
        priority: 2,
        required: false,
        timeout: 5000
      };

      let subsequentExecuted = false;

      const requiredFailingValidator = async (): Promise<ValidationResult> => {
        return {
          layerId: 'required-failing',
          status: 'failed',
          message: 'Required validation failed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      const subsequentValidator = async (): Promise<ValidationResult> => {
        subsequentExecuted = true;
        return {
          layerId: 'subsequent',
          status: 'passed',
          message: 'Subsequent passed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      };

      pipeline.registerLayer(requiredFailingLayer, requiredFailingValidator);
      pipeline.registerLayer(subsequentLayer, subsequentValidator);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-005',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['required-failing', 'subsequent']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.metadata.shortCircuited).toBe(true);
      expect(subsequentExecuted).toBe(false);
    });

    it('should handle unknown layers gracefully', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-006',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['unknown-layer', 'schema-validation']
      };

      const result = await pipeline.validate(request);
      
      // Should still execute known layers
      expect(result.results).toHaveLength(1);
      expect(result.results[0].layerId).toBe('schema-validation');
    });

    it('should fail when not initialized', async () => {
      const uninitializedPipeline = new UniversalValidationPipeline();
      
      const request: ValidationRequest = {
        context: {
          requestId: 'test-007',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation']
      };

      await expect(uninitializedPipeline.validate(request)).rejects.toThrow('Universal Validation Pipeline not initialized');
    });
  });

  describe('caching', () => {
    it('should cache validation results', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-008',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation']
      };

      // First execution - should miss cache
      const result1 = await pipeline.validate(request);
      expect(result1.cacheHits).toBe(0);
      expect(result1.cacheMisses).toBe(1);

      // Second execution with same data - should hit cache
      const result2 = await pipeline.validate(request);
      expect(result2.cacheHits).toBe(1);
      expect(result2.cacheMisses).toBe(0);
    });

    it('should skip cache when requested', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-009',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation'],
        skipCache: true
      };

      // First execution
      const result1 = await pipeline.validate(request);
      expect(result1.cacheMisses).toBe(1);

      // Second execution with skipCache - should not use cache
      const result2 = await pipeline.validate(request);
      expect(result2.cacheHits).toBe(0);
      expect(result2.cacheMisses).toBe(1);
    });

    it('should clear cache', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-010',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation']
      };

      // Execute to populate cache
      await pipeline.validate(request);
      
      const statsBefore = pipeline.getStatistics();
      expect(statsBefore.cacheSize).toBeGreaterThan(0);

      // Clear cache
      pipeline.clearCache();
      
      const statsAfter = pipeline.getStatistics();
      expect(statsAfter.cacheSize).toBe(0);
    });
  });

  describe('policy management', () => {
    it('should get current policy', () => {
      const policy = pipeline.getPolicy();
      
      expect(policy).toBeDefined();
      expect(policy.version).toBeDefined();
      expect(policy.layers).toBeDefined();
      expect(policy.caching).toBeDefined();
      expect(policy.execution).toBeDefined();
      expect(policy.signature).toBeDefined();
    });

    it('should update pipeline policy', () => {
      const originalPolicy = pipeline.getPolicy();
      
      pipeline.updatePipelinePolicy({
        caching: {
          enabled: false,
          defaultTtl: 60000,
          maxEntries: 5000
        }
      });

      const updatedPolicy = pipeline.getPolicy();
      
      expect(updatedPolicy.caching.enabled).toBe(false);
      expect(updatedPolicy.caching.defaultTtl).toBe(60000);
      expect(updatedPolicy.caching.maxEntries).toBe(5000);
      expect(updatedPolicy.version).toBe(originalPolicy.version);
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-011',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['schema-validation']
      };

      const statsBefore = pipeline.getStatistics();
      
      await pipeline.validate(request);
      
      const statsAfter = pipeline.getStatistics();
      
      expect(statsAfter.totalRequests).toBe(statsBefore.totalRequests + 1);
      expect(statsAfter.totalValidations).toBe(statsBefore.totalValidations + 1);
      expect(statsAfter.averageLatency).toBeGreaterThan(0);
      expect(statsAfter.layersCount).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle validator exceptions', async () => {
      const errorLayer: ValidationLayer = {
        layerId: 'error-test',
        name: 'Error Test Layer',
        description: 'A layer that throws errors',
        priority: 1,
        required: false,
        timeout: 5000
      };

      const errorValidator = async (): Promise<ValidationResult> => {
        throw new Error('Validator error');
      };

      pipeline.registerLayer(errorLayer, errorValidator);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-012',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['error-test']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].message).toContain('Validator error');
    });

    it('should handle missing validator', async () => {
      const missingValidatorLayer: ValidationLayer = {
        layerId: 'missing-validator',
        name: 'Missing Validator Layer',
        description: 'A layer without a validator',
        priority: 1,
        required: false,
        timeout: 5000
      };

      // Register layer without validator
      pipeline.registerLayer(missingValidatorLayer, null as any);

      const request: ValidationRequest = {
        context: {
          requestId: 'test-013',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { test: 'data' },
        layers: ['missing-validator']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].message).toContain('No validator found');
    });
  });

  describe('default layers', () => {
    it('should validate schema correctly', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-014',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: { valid: 'object' },
        layers: ['schema-validation']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('passed');
      expect(result.results[0].status).toBe('passed');
    });

    it('should fail schema validation for invalid data', async () => {
      const request: ValidationRequest = {
        context: {
          requestId: 'test-015',
          timestamp: new Date().toISOString(),
          source: 'test',
          metadata: {}
        },
        data: null, // Invalid data
        layers: ['schema-validation']
      };

      const result = await pipeline.validate(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].message).toContain('Data must be an object');
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      expect(pipeline.isReady()).toBe(true);
      
      await pipeline.shutdown();
      expect(pipeline.isReady()).toBe(false);
      
      const layers = pipeline.getLayers();
      expect(layers).toHaveLength(0);
      
      const stats = pipeline.getStatistics();
      expect(stats.cacheSize).toBe(0);
    });

    it('should handle shutdown when not initialized', async () => {
      const uninitializedPipeline = new UniversalValidationPipeline();
      await expect(uninitializedPipeline.shutdown()).resolves.not.toThrow();
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton instance', () => {
      expect(universalValidationPipeline).toBeInstanceOf(UniversalValidationPipeline);
    });
  });
});