/**
 * Qindex Validation Layer Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  QindexValidationLayer, 
  qindexValidationLayer,
  MetadataSchema,
  QindexValidationResult
} from '../validation/QindexValidationLayer.js';
import { ValidationContext } from '../validation/UniversalValidationPipeline.js';

describe('QindexValidationLayer', () => {
  let qindexLayer: QindexValidationLayer;
  let mockContext: ValidationContext;

  beforeEach(() => {
    qindexLayer = new QindexValidationLayer();
    mockContext = {
      requestId: 'test-request-001',
      timestamp: new Date().toISOString(),
      source: 'test',
      metadata: { type: 'flow' }
    };
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = qindexLayer.getConfig();
      
      expect(config.endpoint).toBeDefined();
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableIndexing).toBe(true);
      expect(config.validateSchema).toBe(true);
      expect(config.schemaVersion).toBe('1.0.0');
    });

    it('should initialize with custom configuration', () => {
      const customLayer = new QindexValidationLayer({
        timeout: 5000,
        enableIndexing: false,
        validateSchema: false
      });

      const config = customLayer.getConfig();
      
      expect(config.timeout).toBe(5000);
      expect(config.enableIndexing).toBe(false);
      expect(config.validateSchema).toBe(false);
    });

    it('should provide validation layer configuration', () => {
      const layerConfig = qindexLayer.getValidationLayer();
      
      expect(layerConfig.layerId).toBe('qindex-validation');
      expect(layerConfig.name).toBe('Qindex Metadata Validation');
      expect(layerConfig.required).toBe(false);
      expect(layerConfig.priority).toBe(3);
    });
  });

  describe('metadata validation', () => {
    it('should pass validation when no schema required', async () => {
      const plainData = { message: 'Hello, World!' };
      const plainContext = { ...mockContext, metadata: {} };
      
      const result = await qindexLayer.validateMetadata(plainData, plainContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.message).toContain('No metadata validation required');
      expect(result.details.schemaValidation).toBe(false);
      expect(result.details.indexingStatus).toBe('skipped');
    });

    it('should validate flow metadata successfully', async () => {
      const flowData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        description: 'A test flow',
        tags: ['test', 'automation'],
        category: 'automation',
        priority: 5,
        public: true
      };
      
      const result = await qindexLayer.validateMetadata(flowData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
      expect(result.details.metadataComplete).toBe(true);
      expect(result.details.indexingStatus).toBe('indexed');
      expect(result.details.extractedMetadata).toBeDefined();
      expect(result.details.searchTags).toContain('test');
      expect(result.details.searchTags).toContain('automation');
    });

    it('should validate execution metadata successfully', async () => {
      const executionData = {
        flowId: 'flow-123',
        executionId: 'exec-456',
        actor: 'squid:test-user',
        environment: 'development',
        parameters: { input: 'test' },
        timeout: 30000
      };
      
      const executionContext = { ...mockContext, metadata: { type: 'execution' } };
      const result = await qindexLayer.validateMetadata(executionData, executionContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
      expect(result.details.metadataComplete).toBe(true);
      expect(result.details.indexingStatus).toBe('indexed');
    });

    it('should fail validation for missing required fields', async () => {
      const incompleteFlowData = {
        description: 'A flow without required fields'
      };
      
      const result = await qindexLayer.validateMetadata(incompleteFlowData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.schemaValidation).toBe(false);
      expect(result.details.missingFields).toContain('name');
      expect(result.details.missingFields).toContain('version');
      expect(result.details.missingFields).toContain('author');
    });

    it('should fail validation for invalid field types', async () => {
      const invalidFlowData = {
        name: 123, // Should be string
        version: '1.0.0',
        author: 'squid:test-user',
        priority: 'high' // Should be number
      };
      
      const result = await qindexLayer.validateMetadata(invalidFlowData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.schemaValidation).toBe(false);
      expect(result.details.invalidFields).toContain('name');
      expect(result.details.invalidFields).toContain('priority');
    });

    it('should fail validation for constraint violations', async () => {
      const constraintViolationData = {
        name: '', // Too short
        version: 'invalid-version', // Invalid pattern
        author: 'invalid-author', // Invalid pattern
        priority: 15 // Too high
      };
      
      const result = await qindexLayer.validateMetadata(constraintViolationData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.schemaValidation).toBe(false);
    });

    it('should handle enum validation', async () => {
      const invalidEnumData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        category: 'invalid-category' // Not in enum
      };
      
      const result = await qindexLayer.validateMetadata(invalidEnumData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.schemaValidation).toBe(false);
    });

    it('should handle array validation', async () => {
      const arrayData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        tags: ['valid-tag', '', 'a'.repeat(60)] // Empty and too long tags
      };
      
      const result = await qindexLayer.validateMetadata(arrayData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.details.schemaValidation).toBe(false);
    });

    it('should skip indexing when disabled', async () => {
      const noIndexLayer = new QindexValidationLayer({ enableIndexing: false });
      
      const flowData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      const result = await noIndexLayer.validateMetadata(flowData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.indexingStatus).toBe('skipped');
    });
  });

  describe('indexing operations', () => {
    it('should search indexed data', async () => {
      // First index some data
      const flowData = {
        id: 'searchable-flow',
        name: 'Searchable Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        tags: ['searchable', 'test']
      };
      
      await qindexLayer.validateMetadata(flowData, mockContext);
      
      // Then search for it
      const results = await qindexLayer.searchIndex('searchable');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('searchable-flow');
      expect(results[0].extractedTags).toContain('searchable');
    });

    it('should search with filters', async () => {
      // Index data with specific metadata
      const flowData = {
        id: 'filtered-flow',
        name: 'Filtered Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        category: 'automation'
      };
      
      await qindexLayer.validateMetadata(flowData, mockContext);
      
      // Search with filters
      const results = await qindexLayer.searchIndex('flow', { category: 'automation' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].metadata.category).toBe('automation');
    });

    it('should get index entry by ID', async () => {
      const flowData = {
        id: 'get-test-flow',
        name: 'Get Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      await qindexLayer.validateMetadata(flowData, mockContext);
      
      const entry = await qindexLayer.getIndexEntry('get-test-flow');
      
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('get-test-flow');
      expect(entry?.metadata.name).toBe('Get Test Flow');
    });

    it('should return null for non-existent index entry', async () => {
      const entry = await qindexLayer.getIndexEntry('non-existent');
      expect(entry).toBeNull();
    });

    it('should delete index entry', async () => {
      const flowData = {
        id: 'delete-test-flow',
        name: 'Delete Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      await qindexLayer.validateMetadata(flowData, mockContext);
      
      // Verify it exists
      let entry = await qindexLayer.getIndexEntry('delete-test-flow');
      expect(entry).toBeDefined();
      
      // Delete it
      const deleted = await qindexLayer.deleteIndexEntry('delete-test-flow');
      expect(deleted).toBe(true);
      
      // Verify it's gone
      entry = await qindexLayer.getIndexEntry('delete-test-flow');
      expect(entry).toBeNull();
    });

    it('should return false when deleting non-existent entry', async () => {
      const deleted = await qindexLayer.deleteIndexEntry('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('schema management', () => {
    it('should register new schema', async () => {
      const customSchema: MetadataSchema = {
        id: 'custom-schema-v1',
        version: '1.0.0',
        name: 'Custom Schema',
        description: 'A custom metadata schema',
        properties: {
          customField: {
            type: 'string',
            description: 'A custom field'
          }
        },
        required: ['customField'],
        additionalProperties: false
      };
      
      await qindexLayer.registerSchema(customSchema);
      
      const retrievedSchema = await qindexLayer.getSchema('custom-schema-v1');
      expect(retrievedSchema).toBeDefined();
      expect(retrievedSchema?.name).toBe('Custom Schema');
    });

    it('should get existing schema', async () => {
      const schema = await qindexLayer.getSchema('flow-metadata-v1');
      
      expect(schema).toBeDefined();
      expect(schema?.id).toBe('flow-metadata-v1');
      expect(schema?.name).toBe('Flow Metadata Schema');
    });

    it('should return null for non-existent schema', async () => {
      const schema = await qindexLayer.getSchema('non-existent-schema');
      expect(schema).toBeNull();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const originalConfig = qindexLayer.getConfig();
      
      qindexLayer.updateConfig({
        timeout: 15000,
        enableIndexing: false
      });
      
      const updatedConfig = qindexLayer.getConfig();
      
      expect(updatedConfig.timeout).toBe(15000);
      expect(updatedConfig.enableIndexing).toBe(false);
      expect(updatedConfig.endpoint).toBe(originalConfig.endpoint); // Should remain unchanged
    });
  });

  describe('validator function', () => {
    it('should provide validator function for pipeline integration', async () => {
      const validator = qindexLayer.getValidator();
      
      expect(typeof validator).toBe('function');
      
      const testData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      const result = await validator(testData, mockContext);
      
      expect(result).toBeDefined();
      expect(result.layerId).toBe('qindex-validation');
      expect(result.status).toBe('passed');
    });
  });

  describe('statistics', () => {
    it('should provide index statistics', async () => {
      const stats = qindexLayer.getIndexStats();
      
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.schemas).toBe('number');
      expect(stats.schemas).toBeGreaterThanOrEqual(2); // At least flow and execution schemas
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock the internal service to throw an error
      const originalValidateMetadata = (qindexLayer as any).qindexService.validateMetadata;
      (qindexLayer as any).qindexService.validateMetadata = vi.fn().mockRejectedValue(new Error('Service error'));
      
      const flowData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      const result = await qindexLayer.validateMetadata(flowData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('failed');
      expect(result.message).toContain('Qindex validation error');
      expect(result.details.error).toContain('Service error');
      
      // Restore original method
      (qindexLayer as any).qindexService.validateMetadata = originalValidateMetadata;
    });

    it('should handle indexing errors gracefully', async () => {
      // Mock the internal service to throw an error during indexing
      const originalIndexData = (qindexLayer as any).qindexService.indexData;
      (qindexLayer as any).qindexService.indexData = vi.fn().mockRejectedValue(new Error('Index error'));
      
      const flowData = {
        name: 'Test Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      const result = await qindexLayer.validateMetadata(flowData, mockContext) as QindexValidationResult;
      
      // Validation should still pass, but indexing should fail
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
      expect(result.details.indexingStatus).toBe('failed');
      
      // Restore original method
      (qindexLayer as any).qindexService.indexData = originalIndexData;
    });

    it('should handle search errors', async () => {
      const originalSearchIndex = (qindexLayer as any).qindexService.searchIndex;
      (qindexLayer as any).qindexService.searchIndex = vi.fn().mockRejectedValue(new Error('Search error'));
      
      await expect(qindexLayer.searchIndex('test')).rejects.toThrow('Search error');
      
      // Restore original method
      (qindexLayer as any).qindexService.searchIndex = originalSearchIndex;
    });
  });

  describe('schema inference', () => {
    it('should infer flow schema from data structure', async () => {
      const flowLikeData = {
        steps: [{ type: 'action', name: 'test' }],
        name: 'Inferred Flow',
        version: '1.0.0',
        author: 'squid:test-user'
      };
      
      const neutralContext = { ...mockContext, metadata: {} };
      const result = await qindexLayer.validateMetadata(flowLikeData, neutralContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
    });

    it('should infer execution schema from data structure', async () => {
      const executionLikeData = {
        executionId: 'exec-123',
        flowId: 'flow-456',
        actor: 'squid:test-user'
      };
      
      const neutralContext = { ...mockContext, metadata: {} };
      const result = await qindexLayer.validateMetadata(executionLikeData, neutralContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
    });

    it('should use explicit schema when provided', async () => {
      const dataWithSchema = {
        schema: 'execution-metadata-v1',
        flowId: 'flow-123',
        executionId: 'exec-456',
        actor: 'squid:test-user'
      };
      
      const result = await qindexLayer.validateMetadata(dataWithSchema, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.schemaValidation).toBe(true);
    });
  });

  describe('tag extraction', () => {
    it('should extract tags from metadata and content', async () => {
      const complexData = {
        name: 'Complex Flow',
        version: '1.0.0',
        author: 'squid:test-user',
        category: 'automation',
        tags: ['custom-tag'],
        steps: [
          { type: 'webhook', name: 'webhook-step' },
          { type: 'email', name: 'email-step' }
        ]
      };
      
      const result = await qindexLayer.validateMetadata(complexData, mockContext) as QindexValidationResult;
      
      expect(result.status).toBe('passed');
      expect(result.details.searchTags).toContain('custom-tag');
      expect(result.details.searchTags).toContain('automation');
      expect(result.details.searchTags).toContain('squid:test-user');
      expect(result.details.searchTags).toContain('step:webhook');
      expect(result.details.searchTags).toContain('step:email');
    });
  });

  describe('singleton instance', () => {
    it('should provide singleton instance', () => {
      expect(qindexValidationLayer).toBeInstanceOf(QindexValidationLayer);
    });
  });
});