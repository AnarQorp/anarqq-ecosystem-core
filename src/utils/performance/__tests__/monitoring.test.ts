/**
 * Performance Monitoring Utilities Tests
 * 
 * Tests for performance monitoring including component render tracking,
 * API response time monitoring, and performance metrics collection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useApiMonitoring, 
  useRenderMonitoring, 
  useMemoryMonitoring,
  usePerformanceDashboard,
  performanceStore
} from '../monitoring';

// Mock performance API
const mockPerformance = {
  now: vi.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('useApiMonitoring', () => {
  beforeEach(() => {
    performanceStore.clearMetrics();
    mockPerformance.now.mockClear();
  });

  it('should monitor successful API calls', async () => {
    let callCount = 0;
    mockPerformance.now.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 150; // 150ms duration
    });

    const { result } = renderHook(() => useApiMonitoring());
    const mockApiCall = vi.fn().mockResolvedValue('success');

    const apiResult = await act(async () => {
      return await result.current.monitorApiCall('/api/test', 'GET', mockApiCall);
    });

    expect(apiResult).toBe('success');
    expect(mockApiCall).toHaveBeenCalledTimes(1);

    const metrics = performanceStore.getApiMetrics('/api/test');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      endpoint: '/api/test',
      method: 'GET',
      duration: 150,
      success: true
    });
  });

  it('should monitor failed API calls', async () => {
    let callCount = 0;
    mockPerformance.now.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 200; // 200ms duration
    });

    const { result } = renderHook(() => useApiMonitoring());
    const mockApiCall = vi.fn().mockRejectedValue(new Error('API Error'));

    await act(async () => {
      try {
        await result.current.monitorApiCall('/api/test', 'POST', mockApiCall);
      } catch (error) {
        expect(error.message).toBe('API Error');
      }
    });

    const metrics = performanceStore.getApiMetrics('/api/test');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      endpoint: '/api/test',
      method: 'POST',
      duration: 200,
      success: false,
      error: 'API Error'
    });
  });
});

describe('useRenderMonitoring', () => {
  beforeEach(() => {
    performanceStore.clearMetrics();
    mockPerformance.now.mockClear();
  });

  it('should track component render times', () => {
    let callCount = 0;
    mockPerformance.now.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return 0; // Mount time
      if (callCount === 2) return 10; // Render start
      return 25; // Render end (15ms render time)
    });

    const { result, rerender } = renderHook(() => 
      useRenderMonitoring('TestComponent', { prop1: 'value1' })
    );

    // Trigger a re-render
    act(() => {
      rerender();
    });

    const mountTime = result.current.getMountTime();
    expect(mountTime).toBe(25); // Total time since mount

    const metrics = performanceStore.getRenderMetrics('TestComponent');
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]).toMatchObject({
      componentName: 'TestComponent',
      renderTime: 15,
      props: { prop1: 'value1' }
    });
  });
});

describe('useMemoryMonitoring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should monitor memory usage', () => {
    const { result } = renderHook(() => useMemoryMonitoring());

    expect(result.current.memoryInfo).toMatchObject({
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
    });
  });

  it('should check memory periodically', () => {
    const { result } = renderHook(() => useMemoryMonitoring());
    const checkMemorySpy = vi.spyOn(result.current, 'checkMemory');

    // Fast-forward 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(checkMemorySpy).toHaveBeenCalled();
  });
});

describe('usePerformanceDashboard', () => {
  beforeEach(() => {
    performanceStore.clearMetrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should provide performance summary', () => {
    const { result } = renderHook(() => usePerformanceDashboard());

    expect(result.current.summary).toMatchObject({
      api: {
        totalCalls: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowCalls: 0
      },
      render: {
        totalRenders: 0,
        averageRenderTime: 0,
        slowRenders: 0
      },
      alerts: {
        total: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    });
  });

  it('should refresh data periodically', () => {
    const { result } = renderHook(() => usePerformanceDashboard());
    const refreshSpy = vi.spyOn(result.current, 'refreshData');

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should clear metrics', () => {
    const { result } = renderHook(() => usePerformanceDashboard());

    act(() => {
      result.current.clearMetrics();
    });

    expect(result.current.summary.api.totalCalls).toBe(0);
    expect(result.current.summary.render.totalRenders).toBe(0);
    expect(result.current.alerts).toHaveLength(0);
  });
});

describe('performanceStore', () => {
  beforeEach(() => {
    performanceStore.clearMetrics();
  });

  it('should store and retrieve API metrics', () => {
    const metric = {
      endpoint: '/api/test',
      method: 'GET',
      duration: 100,
      timestamp: Date.now(),
      success: true
    };

    performanceStore.addApiMetric(metric);

    const metrics = performanceStore.getApiMetrics('/api/test');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject(metric);
  });

  it('should store and retrieve render metrics', () => {
    const metric = {
      componentName: 'TestComponent',
      renderTime: 50,
      timestamp: Date.now(),
      props: { test: true }
    };

    performanceStore.addRenderMetric(metric);

    const metrics = performanceStore.getRenderMetrics('TestComponent');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject(metric);
  });

  it('should generate performance summary', () => {
    // Add some test metrics
    performanceStore.addApiMetric({
      endpoint: '/api/test1',
      method: 'GET',
      duration: 100,
      timestamp: Date.now(),
      success: true
    });

    performanceStore.addApiMetric({
      endpoint: '/api/test2',
      method: 'POST',
      duration: 3000, // Slow call
      timestamp: Date.now(),
      success: false,
      error: 'Timeout'
    });

    performanceStore.addRenderMetric({
      componentName: 'TestComponent',
      renderTime: 150, // Slow render
      timestamp: Date.now()
    });

    const summary = performanceStore.getPerformanceSummary();

    expect(summary.api.totalCalls).toBe(2);
    expect(summary.api.averageResponseTime).toBe(1550); // (100 + 3000) / 2
    expect(summary.api.errorRate).toBe(0.5); // 1 error out of 2 calls
    expect(summary.api.slowCalls).toBe(1); // 1 call > 2000ms

    expect(summary.render.totalRenders).toBe(1);
    expect(summary.render.averageRenderTime).toBe(150);
    expect(summary.render.slowRenders).toBe(1); // 1 render > 100ms
  });

  it('should limit stored metrics', () => {
    // Add more than the maximum number of metrics
    for (let i = 0; i < 1100; i++) {
      performanceStore.addApiMetric({
        endpoint: `/api/test${i}`,
        method: 'GET',
        duration: 100,
        timestamp: Date.now(),
        success: true
      });
    }

    const allMetrics = performanceStore.getApiMetrics();
    expect(allMetrics.length).toBe(1000); // Should be limited to 1000
  });
});