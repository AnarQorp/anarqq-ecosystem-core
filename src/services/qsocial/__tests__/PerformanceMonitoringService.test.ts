/**
 * Tests for PerformanceMonitoringService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  PerformanceMonitoringService,
  PerformanceTimer,
  PerformanceUtils,
  getPerformanceService,
  destroyPerformanceService
} from '../PerformanceMonitoringService';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000
    }
  }
});

describe('PerformanceTimer', () => {
  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(1000);
  });

  it('should measure execution time', () => {
    const timer = new PerformanceTimer('test_operation');
    
    mockPerformanceNow.mockReturnValue(1500); // 500ms later
    
    const metric = timer.end();
    
    expect(metric.name).toBe('test_operation');
    expect(metric.duration).toBe(500);
    expect(metric.value).toBe(500);
    expect(metric.unit).toBe('ms');
  });

  it('should include tags in metrics', () => {
    const timer = new PerformanceTimer('test_operation', { operation: 'create', type: 'post' });
    
    mockPerformanceNow.mockReturnValue(1200);
    
    const metric = timer.end();
    
    expect(metric.tags).toEqual({ operation: 'create', type: 'post' });
  });
});

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    service = new PerformanceMonitoringService();
    mockPerformanceNow.mockReturnValue(1000);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should record timing metrics', () => {
    service.recordTiming('api_call', 250, { endpoint: '/posts' });
    
    const metrics = service.getMetrics('api_call');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(250);
    expect(metrics[0].tags?.endpoint).toBe('/posts');
  });

  it('should record counter metrics', () => {
    service.recordCounter('cache_hit', 5, { type: 'post' });
    
    const metrics = service.getMetrics('cache_hit');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(5);
  });

  it('should record memory usage metrics', () => {
    service.recordMemoryUsage();
    
    const metrics = service.getMetrics('memory_usage');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(50); // 50% usage
  });

  it('should record database query metrics', () => {
    service.recordDatabaseQuery('SELECT', 150, 'posts', 10);
    
    const metrics = service.getMetrics('database_query_time');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(150);
  });

  it('should record cache performance metrics', () => {
    service.recordCachePerformance(85, 170, 30, 5);
    
    const metrics = service.getMetrics('cache_hit_rate');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(85);
  });

  it('should record API request metrics', () => {
    service.recordAPIRequest('/api/posts', 'GET', 200, 120, 1024, 2048);
    
    const metrics = service.getMetrics('api_response_time');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(120);
  });

  it('should generate alerts for threshold violations', () => {
    const alertListener = vi.fn();
    service.onAlert(alertListener);
    
    // Record a metric that exceeds the critical threshold
    service.recordTiming('api_response_time', 3500); // Critical threshold is 3000ms
    
    expect(alertListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'critical',
        metric: 'api_response_time',
        currentValue: 3500
      })
    );
  });

  it('should set custom thresholds', () => {
    service.setThreshold('custom_metric', { warning: 100, critical: 200 });
    
    const alertListener = vi.fn();
    service.onAlert(alertListener);
    
    service.recordTiming('custom_metric', 150);
    
    expect(alertListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        metric: 'custom_metric',
        currentValue: 150
      })
    );
  });

  it('should generate performance reports', () => {
    const now = Date.now();
    
    service.recordAPIRequest('/api/posts', 'GET', 200, 200);
    service.recordAPIRequest('/api/posts', 'GET', 200, 300);
    service.recordCounter('api_errors', 1);
    service.recordCachePerformance(80, 80, 20);
    service.recordMemoryUsage();
    
    const report = service.getStats({
      start: now - 60000,
      end: now + 60000
    });
    
    expect(report.summary.totalRequests).toBe(2);
    expect(report.summary.averageResponseTime).toBe(250);
    expect(report.summary.errorRate).toBe(50); // 1 error out of 2 requests
    expect(report.summary.cacheHitRate).toBe(80);
    expect(report.summary.memoryUsage).toBe(50);
    expect(report.recommendations).toBeInstanceOf(Array);
  });

  it('should provide metric listeners', () => {
    const listener = vi.fn();
    service.onMetric(listener);
    
    service.recordTiming('test_metric', 100);
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_metric',
        value: 100
      })
    );
  });

  it('should remove metric listeners', () => {
    const listener = vi.fn();
    service.onMetric(listener);
    service.offMetric(listener);
    
    service.recordTiming('test_metric', 100);
    
    expect(listener).not.toHaveBeenCalled();
  });

  it('should resolve alerts', () => {
    const alertListener = vi.fn();
    service.onAlert(alertListener);
    
    service.recordTiming('api_response_time', 3500);
    
    const alerts = service.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    
    service.resolveAlert(alerts[0].id);
    
    const activeAlerts = service.getActiveAlerts();
    expect(activeAlerts).toHaveLength(0);
  });

  it('should generate recommendations based on metrics', () => {
    // Record metrics that should trigger recommendations
    service.recordAPIRequest('/api/posts', 'GET', 200, 1500); // High response time
    service.recordAPIRequest('/api/posts', 'GET', 200, 800);
    service.recordCachePerformance(60, 60, 40); // Low cache hit rate
    service.recordMemoryUsage(); // High memory usage (50% from mock)
    service.recordCounter('api_errors', 2);
    
    const report = service.getStats();
    
    expect(report.recommendations).toContain('Consider implementing caching for frequently accessed endpoints');
    expect(report.recommendations).toContain('Cache hit rate is low - consider adjusting cache TTL values');
  });
});

describe('PerformanceUtils', () => {
  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(1000);
  });

  it('should measure async function execution', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    mockPerformanceNow
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1250); // End time
    
    const result = await PerformanceUtils.measureAsync('async_test', mockFn, { type: 'test' });
    
    expect(result).toBe('result');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should measure sync function execution', () => {
    const mockFn = vi.fn().mockReturnValue('result');
    
    mockPerformanceNow
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1150); // End time
    
    const result = PerformanceUtils.measure('sync_test', mockFn, { type: 'test' });
    
    expect(result).toBe('result');
    expect(mockFn).toHaveBeenCalled();
  });

  it('should handle errors in measured functions', async () => {
    const error = new Error('Test error');
    const mockFn = vi.fn().mockRejectedValue(error);
    
    await expect(
      PerformanceUtils.measureAsync('error_test', mockFn)
    ).rejects.toThrow('Test error');
  });

  it('should create performance decorator', () => {
    const decorator = PerformanceUtils.performanceDecorator('decorated_method');
    
    expect(typeof decorator).toBe('function');
  });
});

describe('Singleton Performance Service', () => {
  afterEach(() => {
    destroyPerformanceService();
  });

  it('should return the same instance', () => {
    const service1 = getPerformanceService();
    const service2 = getPerformanceService();
    
    expect(service1).toBe(service2);
  });

  it('should create new instance after destroy', () => {
    const service1 = getPerformanceService();
    destroyPerformanceService();
    const service2 = getPerformanceService();
    
    expect(service1).not.toBe(service2);
  });
});