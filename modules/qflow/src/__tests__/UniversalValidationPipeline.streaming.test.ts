/**
 * Integration tests for Universal Validation Pipeline with Signed Cache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { universalValidationPipeline, ValidationRequest, ValidationContext } from '../validation/UniversalValidationPipeline.js';

describe('UniversalValidationPipeline Streaming', () => {
  let mockContext: ValidationContext;

  beforeEach(async () => {
    await universalValidationPipeline.initialize();

    mockContext = {
      requestId: 'test-streaming-123',
      timestamp: new Date().toISOString(),
      source: 'test',
      metadata: {}
    };
  });

  afterEach(async () => {
    await universalValidationPipeline.shutdown();
  });

  describe('Streaming Validation', () => {
    it('should execute streaming validation with cache integration', async () => {
      const testData = { test: 'streaming-validation-data' };
      
      const request: ValidationRequest = {
        context: mockContext,
        data: testData,
        layers: ['schema-validation', 'security-validation'],
        skipCache: false
      };

      // First execution - should miss cache
      const result1 = await universalValidationPipeline.validateStreaming(request);
      
      expect(result1.requestId).toBe(mockContext.requestId);
      expect(result1.results).toHaveLength(2);
      expect(result1.overallStatus).toBe('passed');
      expect(result1.cacheMisses).toBeGreaterThan(0);
      expect(result1.cacheHits).toBe(0);

      // Second execution with same data - should hit cache
      const result2 = await universalValidationPipeline.validateStreaming(request);
      
      expect(result2.requestId).toBe(mockContext.requestId);
      expect(result2.results).toHaveLength(2);
      expect(result2.overallStatus).toBe('passed');
      expect(result2.cacheHits).toBeGreaterThan(0);
      expect(result2.totalDuration).toBeLessThan(result1.totalDuration); // Should be faster due to cache
    });

    it('should handle short-circuiting in streaming validation', async () => {
      // Register a failing validator for testing
      universalValidationPipeline.registerLayer(
        {
          layerId: 'failing-test-layer',
          name: 'Failing Test Layer',
          description: 'Always fails for testing',
          priority: 0,
          required: true,
          timeout: 5000
        },
        async () => ({
          layerId: 'failing-test-layer',
          status: 'failed' as const,
          message: 'Test failure',
          duration: 10,
          timestamp: new Date().toISOString()
        })
      );

      const testData = { test: 'short-circuit-data' };
      
      const request: ValidationRequest = {
        context: mockContext,
        data: testData,
        layers: ['failing-test-layer', 'schema-validation', 'security-validation'],
        skipCache: false
      };

      const result = await universalValidationPipeline.validateStreaming(request);
      
      expect(result.overallStatus).toBe('failed');
      expect(result.metadata.shortCircuited).toBe(true);
      expect(result.results).toHaveLength(1); // Should stop after first failure
      expect(result.results[0].status).toBe('failed');
    });

    it('should provide cache statistics', async () => {
      const stats = universalValidationPipeline.getSignedCacheStatistics();
      
      expect(stats).toBeTruthy();
      expect(typeof stats?.totalEntries).toBe('number');
      expect(typeof stats?.totalHits).toBe('number');
      expect(typeof stats?.totalMisses).toBe('number');
      expect(typeof stats?.hitRate).toBe('number');
    });

    it('should allow cache management operations', async () => {
      // Clear signed cache
      await universalValidationPipeline.clearSignedCache();
      
      const stats = universalValidationPipeline.getSignedCacheStatistics();
      expect(stats?.totalEntries).toBe(0);

      // Update cache policy
      universalValidationPipeline.updateSignedCachePolicy({
        maxEntries: 500,
        defaultTtl: 120000
      });

      // Should still work after policy update
      const testData = { test: 'policy-update-data' };
      
      const request: ValidationRequest = {
        context: mockContext,
        data: testData,
        layers: ['schema-validation'],
        skipCache: false
      };

      const result = await universalValidationPipeline.validateStreaming(request);
      expect(result.overallStatus).toBe('passed');
    });

    it('should compare performance between legacy and streaming validation', async () => {
      const testData = { test: 'performance-comparison-data' };
      
      const request: ValidationRequest = {
        context: mockContext,
        data: testData,
        layers: ['schema-validation', 'security-validation'],
        skipCache: false
      };

      // Execute legacy validation
      const legacyStart = Date.now();
      const legacyResult = await universalValidationPipeline.validate(request);
      const legacyDuration = Date.now() - legacyStart;

      // Execute streaming validation (first time - cache miss)
      const streamingStart = Date.now();
      const streamingResult1 = await universalValidationPipeline.validateStreaming(request);
      const streamingDuration1 = Date.now() - streamingStart;

      // Execute streaming validation (second time - cache hit)
      const streamingStart2 = Date.now();
      const streamingResult2 = await universalValidationPipeline.validateStreaming(request);
      const streamingDuration2 = Date.now() - streamingStart2;

      // Both should have same results
      expect(legacyResult.overallStatus).toBe(streamingResult1.overallStatus);
      expect(streamingResult1.overallStatus).toBe(streamingResult2.overallStatus);

      // Streaming with cache should be faster or equal (in test environment, times might be very small)
      expect(streamingDuration2).toBeLessThanOrEqual(streamingDuration1);
      
      console.log(`Performance comparison:
        Legacy: ${legacyDuration}ms
        Streaming (miss): ${streamingDuration1}ms  
        Streaming (hit): ${streamingDuration2}ms`);
    });
  });
});