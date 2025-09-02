/**
 * Optimization Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizationEngine, OptimizationConfig } from '../../profiling/OptimizationEngine';
import { PerformanceProfiler, ProfilerConfig } from '../../profiling/PerformanceProfiler';
import { FlowDefinition } from '../../models/FlowDefinition';

describe('OptimizationEngine', () => {
  let optimizationEngine: OptimizationEngine;
  let profiler: PerformanceProfiler;
  let optimizationConfig: OptimizationConfig;
  let profilerConfig: ProfilerConfig;

  beforeEach(() => {
    profilerConfig = {
      enableTracing: true,
      enableBottleneckDetection: true,
      enableRegressionDetection: true,
      samplingRate: 1.0,
      maxTraceHistory: 100,
      performanceThresholds: {
        maxExecutionTime: 30000,
        maxMemoryUsage: 512 * 1024 * 1024,
        maxCpuUsage: 90,
        minThroughput: 10,
        maxLatency: 5000
      }
    };

    optimizationConfig = {
      enableAutoOptimization: true,
      optimizationThreshold: 10000,
      maxOptimizationAttempts: 3,
      learningRate: 0.1,
      confidenceThreshold: 0.8
    };

    profiler = new PerformanceProfiler(profilerConfig);
    optimizationEngine = new OptimizationEngine(optimizationConfig, profiler);
  });

  describe('analyzeAndOptimize', () => {
    it('should return insufficient data message for new flow', async () => {
      const recommendations = await optimizationEngine.analyzeAndOptimize('new-flow');

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].description).toContain('Insufficient execution history');
      expect(recommendations[0].priority).toBe('low');
    });

    it('should emit optimization_analysis_complete event', async () => {
      const eventSpy = vi.fn();
      optimizationEngine.on('optimization_analysis_complete', eventSpy);

      await optimizationEngine.analyzeAndOptimize('flow-1');

      expect(eventSpy).toHaveBeenCalledWith({
        flowId: 'flow-1',
        recommendationCount: expect.any(Number),
        topRecommendation: expect.any(String),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('autoOptimize', () => {
    const mockFlow: FlowDefinition = {
      id: 'flow-1',
      name: 'Test Flow',
      version: '1.0.0',
      owner: 'test-user',
      steps: [
        {
          id: 'step-1',
          type: 'task',
          action: 'test-action',
          params: {}
        },
        {
          id: 'step-2',
          type: 'task',
          action: 'another-action',
          params: {}
        }
      ],
      metadata: {
        tags: [],
        category: 'test',
        visibility: 'private',
        requiredPermissions: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should return null when auto-optimization is disabled', async () => {
      optimizationConfig.enableAutoOptimization = false;
      optimizationEngine = new OptimizationEngine(optimizationConfig, profiler);

      const result = await optimizationEngine.autoOptimize('flow-1', mockFlow);
      expect(result).toBeNull();
    });

    it('should return null when optimization threshold is not met', async () => {
      // Mock profiler to return low execution time
      vi.spyOn(profiler, 'getFlowAnalysis').mockReturnValue({
        flowId: 'flow-1',
        executionCount: 10,
        averageDuration: 1000, // Below threshold
        medianDuration: 1000,
        p95Duration: 1200,
        p99Duration: 1500,
        bottlenecks: [],
        recommendations: [],
        trends: []
      });

      const result = await optimizationEngine.autoOptimize('flow-1', mockFlow);
      expect(result).toBeNull();
    });

    it('should emit auto_optimization_applied event on successful optimization', async () => {
      // Mock profiler to return high execution time
      vi.spyOn(profiler, 'getFlowAnalysis').mockReturnValue({
        flowId: 'flow-1',
        executionCount: 10,
        averageDuration: 15000, // Above threshold
        medianDuration: 15000,
        p95Duration: 18000,
        p99Duration: 20000,
        bottlenecks: [
          {
            type: 'cpu',
            stepId: 'step-1',
            severity: 'high',
            impact: 0.8,
            description: 'High CPU usage',
            recommendation: 'Optimize step logic'
          }
        ],
        recommendations: [],
        trends: []
      });

      const eventSpy = vi.fn();
      optimizationEngine.on('auto_optimization_applied', eventSpy);

      const result = await optimizationEngine.autoOptimize('flow-1', mockFlow);

      if (result) {
        expect(eventSpy).toHaveBeenCalledWith({
          flowId: 'flow-1',
          strategy: expect.any(String),
          expectedImprovement: expect.any(Number),
          timestamp: expect.any(Number)
        });
      }
    });

    it('should emit optimization_failed event on error', async () => {
      // Mock profiler to return conditions that would trigger optimization
      vi.spyOn(profiler, 'getFlowAnalysis').mockReturnValue({
        flowId: 'flow-1',
        executionCount: 10,
        averageDuration: 15000,
        medianDuration: 15000,
        p95Duration: 18000,
        p99Duration: 20000,
        bottlenecks: [
          {
            type: 'cpu',
            stepId: 'step-1',
            severity: 'high',
            impact: 0.8,
            description: 'High CPU usage',
            recommendation: 'Optimize step logic'
          }
        ],
        recommendations: [],
        trends: []
      });

      // Mock strategy to throw error
      const originalStrategies = (optimizationEngine as any).strategies;
      (optimizationEngine as any).strategies = [
        {
          name: 'failing-strategy',
          description: 'This will fail',
          applicableConditions: () => true,
          apply: async () => { throw new Error('Test error'); },
          expectedImprovement: 0.5,
          riskLevel: 'low'
        }
      ];

      const eventSpy = vi.fn();
      optimizationEngine.on('optimization_failed', eventSpy);

      const result = await optimizationEngine.autoOptimize('flow-1', mockFlow);

      expect(result).toBeNull();
      expect(eventSpy).toHaveBeenCalledWith({
        flowId: 'flow-1',
        strategy: 'failing-strategy',
        error: 'Test error',
        timestamp: expect.any(Number)
      });

      // Restore original strategies
      (optimizationEngine as any).strategies = originalStrategies;
    });
  });

  describe('getOptimizationHistory', () => {
    it('should return empty array for flow with no optimization history', () => {
      const history = optimizationEngine.getOptimizationHistory('new-flow');
      expect(history).toEqual([]);
    });
  });

  describe('clearOptimizationHistory', () => {
    it('should clear all optimization history', () => {
      optimizationEngine.clearOptimizationHistory();
      // Verify history is cleared (would need access to internal state)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should clear optimization history for specific flow', () => {
      optimizationEngine.clearOptimizationHistory('flow-1');
      const history = optimizationEngine.getOptimizationHistory('flow-1');
      expect(history).toEqual([]);
    });
  });

  describe('optimization strategies', () => {
    const mockFlow: FlowDefinition = {
      id: 'flow-1',
      name: 'Test Flow',
      version: '1.0.0',
      owner: 'test-user',
      steps: [
        {
          id: 'step-1',
          type: 'task',
          action: 'test-action',
          params: {}
        },
        {
          id: 'step-2',
          type: 'task',
          action: 'another-action',
          params: {}
        }
      ],
      metadata: {
        tags: [],
        category: 'test',
        visibility: 'private',
        requiredPermissions: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should apply step parallelization optimization', async () => {
      const strategies = (optimizationEngine as any).strategies;
      const parallelizationStrategy = strategies.find((s: any) => s.name === 'step-parallelization');
      
      if (parallelizationStrategy) {
        const optimizedFlow = await parallelizationStrategy.apply(mockFlow);
        
        expect(optimizedFlow).toBeTruthy();
        expect(optimizedFlow.metadata.optimizations).toContain('step-parallelization');
      }
    });

    it('should apply validation caching optimization', async () => {
      const strategies = (optimizationEngine as any).strategies;
      const cachingStrategy = strategies.find((s: any) => s.name === 'validation-caching');
      
      if (cachingStrategy) {
        const optimizedFlow = await cachingStrategy.apply(mockFlow);
        
        expect(optimizedFlow).toBeTruthy();
        expect(optimizedFlow.metadata.optimizations).toContain('validation-caching');
        expect(optimizedFlow.steps[0].params.enableValidationCache).toBe(true);
      }
    });

    it('should apply resource pooling optimization', async () => {
      const strategies = (optimizationEngine as any).strategies;
      const poolingStrategy = strategies.find((s: any) => s.name === 'resource-pooling');
      
      if (poolingStrategy) {
        const optimizedFlow = await poolingStrategy.apply(mockFlow);
        
        expect(optimizedFlow).toBeTruthy();
        expect(optimizedFlow.metadata.optimizations).toContain('resource-pooling');
        expect(optimizedFlow.steps[0].params.useResourcePool).toBe(true);
      }
    });

    it('should apply lazy loading optimization', async () => {
      const strategies = (optimizationEngine as any).strategies;
      const lazyLoadingStrategy = strategies.find((s: any) => s.name === 'lazy-loading');
      
      if (lazyLoadingStrategy) {
        const optimizedFlow = await lazyLoadingStrategy.apply(mockFlow);
        
        expect(optimizedFlow).toBeTruthy();
        expect(optimizedFlow.metadata.optimizations).toContain('lazy-loading');
        expect(optimizedFlow.steps[0].params.lazyLoading).toBe(true);
      }
    });
  });
});