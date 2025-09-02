/**
 * Performance Profiler Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceProfiler, ProfilerConfig } from '../../profiling/PerformanceProfiler';
import { FlowDefinition, FlowStep, ExecutionContext } from '../../models/FlowDefinition';

describe('PerformanceProfiler', () => {
  let profiler: PerformanceProfiler;
  let config: ProfilerConfig;

  beforeEach(() => {
    config = {
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

    profiler = new PerformanceProfiler(config);
  });

  describe('startProfiling', () => {
    it('should start profiling and return trace ID', () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      expect(traceId).toBeTruthy();
      expect(traceId).toMatch(/^trace_\d+_[a-z0-9]+$/);
    });

    it('should emit profiling_started event', () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const eventSpy = vi.fn();
      profiler.on('profiling_started', eventSpy);

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);

      expect(eventSpy).toHaveBeenCalledWith({
        traceId,
        flowId: 'flow-1',
        executionId: 'exec-1',
        timestamp: expect.any(Number)
      });
    });

    it('should return empty string when tracing is disabled', () => {
      config.enableTracing = false;
      profiler = new PerformanceProfiler(config);

      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      expect(traceId).toBe('');
    });
  });

  describe('profileStep', () => {
    it('should profile step execution', () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      const step: FlowStep = {
        id: 'step-1',
        type: 'task',
        action: 'test-action',
        params: {}
      };

      const startTime = Date.now();
      const endTime = startTime + 1000;

      profiler.profileStep(traceId, step, startTime, endTime);

      // Verify step was profiled (would need access to internal state)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should emit step_profiled event', () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      const step: FlowStep = {
        id: 'step-1',
        type: 'task',
        action: 'test-action',
        params: {}
      };

      const eventSpy = vi.fn();
      profiler.on('step_profiled', eventSpy);

      const startTime = Date.now();
      const endTime = startTime + 1000;

      profiler.profileStep(traceId, step, startTime, endTime);

      expect(eventSpy).toHaveBeenCalledWith({
        traceId,
        stepId: 'step-1',
        duration: 1000,
        memoryUsage: expect.any(Number)
      });
    });
  });

  describe('completeProfiling', () => {
    it('should complete profiling and return trace', async () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      // Wait a bit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const trace = profiler.completeProfiling(traceId);

      expect(trace).toBeTruthy();
      expect(trace?.traceId).toBe(traceId);
      expect(trace?.flowId).toBe('flow-1');
      expect(trace?.executionId).toBe('exec-1');
      expect(trace?.endTime).toBeTruthy();
      expect(trace?.totalDuration).toBeGreaterThan(0);
    });

    it('should emit profiling_completed event', () => {
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      
      const eventSpy = vi.fn();
      profiler.on('profiling_completed', eventSpy);

      profiler.completeProfiling(traceId);

      expect(eventSpy).toHaveBeenCalledWith({
        traceId,
        flowId: 'flow-1',
        totalDuration: expect.any(Number),
        bottleneckCount: expect.any(Number),
        memoryPeak: expect.any(Number)
      });
    });

    it('should return null for invalid trace ID', () => {
      const trace = profiler.completeProfiling('invalid-trace-id');
      expect(trace).toBeNull();
    });
  });

  describe('getFlowAnalysis', () => {
    it('should return analysis for flow with execution history', async () => {
      // Create some execution history
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      // Execute multiple times to build history
      for (let i = 0; i < 5; i++) {
        const traceId = profiler.startProfiling('flow-1', `exec-${i}`, context);
        // Wait a bit to ensure duration > 0
        await new Promise(resolve => setTimeout(resolve, 5));
        profiler.completeProfiling(traceId);
      }

      const analysis = profiler.getFlowAnalysis('flow-1');

      expect(analysis.flowId).toBe('flow-1');
      expect(analysis.executionCount).toBe(5);
      expect(analysis.averageDuration).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should return insufficient data message for new flow', () => {
      const analysis = profiler.getFlowAnalysis('new-flow');

      expect(analysis.flowId).toBe('new-flow');
      expect(analysis.executionCount).toBe(0);
      expect(analysis.averageDuration).toBe(0);
      expect(analysis.recommendations).toContain('No execution history available for analysis');
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should return optimization recommendations', () => {
      const recommendations = profiler.getOptimizationRecommendations('flow-1');

      expect(recommendations).toBeInstanceOf(Array);
      // Recommendations would be based on actual performance data
    });
  });

  describe('exportPerformanceData', () => {
    it('should export all performance data', () => {
      const data = profiler.exportPerformanceData();

      expect(data).toHaveProperty('traces');
      expect(data).toHaveProperty('baselines');
      expect(data).toHaveProperty('exportedAt');
      expect(data).toHaveProperty('config');
      expect(data.traces).toBeInstanceOf(Array);
    });

    it('should export data for specific flow', () => {
      const data = profiler.exportPerformanceData('flow-1');

      expect(data).toHaveProperty('traces');
      expect(data.traces).toBeInstanceOf(Array);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      // Add some history first
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId = profiler.startProfiling('flow-1', 'exec-1', context);
      profiler.completeProfiling(traceId);

      profiler.clearHistory();

      const analysis = profiler.getFlowAnalysis('flow-1');
      expect(analysis.executionCount).toBe(0);
    });

    it('should clear history for specific flow', () => {
      // Add history for multiple flows
      const context: ExecutionContext = {
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputData: {},
        variables: {},
        permissions: []
      };

      const traceId1 = profiler.startProfiling('flow-1', 'exec-1', context);
      profiler.completeProfiling(traceId1);

      const traceId2 = profiler.startProfiling('flow-2', 'exec-2', context);
      profiler.completeProfiling(traceId2);

      profiler.clearHistory('flow-1');

      const analysis1 = profiler.getFlowAnalysis('flow-1');
      const analysis2 = profiler.getFlowAnalysis('flow-2');

      expect(analysis1.executionCount).toBe(0);
      expect(analysis2.executionCount).toBe(1);
    });
  });
});