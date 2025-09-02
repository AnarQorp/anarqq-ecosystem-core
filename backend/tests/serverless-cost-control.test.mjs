/**
 * Serverless Cost Control Tests
 * Comprehensive tests for cost control, optimization, and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerlessCostControlService } from '../services/ServerlessCostControlService.mjs';
import { ColdStartOptimizationService } from '../services/ColdStartOptimizationService.mjs';
import { BatchProcessingService } from '../services/BatchProcessingService.mjs';
import { CostMonitoringDashboardService } from '../services/CostMonitoringDashboardService.mjs';
import { GracefulDegradationService } from '../services/GracefulDegradationService.mjs';

// Mock dependencies
vi.mock('../services/EventBusService.mjs', () => ({
  EventBusService: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../services/ObservabilityService.mjs', () => ({
  ObservabilityService: vi.fn().mockImplementation(() => ({
    registerMetric: vi.fn(),
    incrementCounter: vi.fn(),
    setGauge: vi.fn(),
    observeHistogram: vi.fn()
  }))
}));

describe('ServerlessCostControlService', () => {
  let costControlService;

  beforeEach(() => {
    costControlService = new ServerlessCostControlService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setInvocationLimits', () => {
    it('should set invocation limits for a module', async () => {
      const module = 'test-module';
      const limits = {
        perMinute: 100,
        perHour: 5000,
        perDay: 100000,
        perMonth: 2500000
      };

      const result = await costControlService.setInvocationLimits(module, limits);

      expect(result.success).toBe(true);
      expect(result.config.module).toBe(module);
      expect(result.config.limits.perMinute).toBe(100);
    });

    it('should use default limits when not specified', async () => {
      const module = 'test-module';
      const result = await costControlService.setInvocationLimits(module, {});

      expect(result.success).toBe(true);
      expect(result.config.limits.perMinute).toBe(1000); // Default value
    });
  });

  describe('checkInvocationLimits', () => {
    it('should allow invocation when within limits', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      await costControlService.setInvocationLimits(module, {
        perMinute: 100
      });

      const result = await costControlService.checkInvocationLimits(module, functionName);

      expect(result.allowed).toBe(true);
    });

    it('should deny invocation when limits exceeded', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      await costControlService.setInvocationLimits(module, {
        perMinute: 1
      });

      // Record multiple invocations to exceed limit
      await costControlService.recordInvocation(module, functionName, 100, 256, 0.001);
      await costControlService.recordInvocation(module, functionName, 100, 256, 0.001);

      const result = await costControlService.checkInvocationLimits(module, functionName);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('limit exceeded');
    });
  });

  describe('recordInvocation', () => {
    it('should record invocation and update metrics', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      await costControlService.setInvocationLimits(module, {});

      const result = await costControlService.recordInvocation(
        module, 
        functionName, 
        150, // duration
        512, // memory used
        0.002 // cost
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getCostOptimizationRecommendations', () => {
    it('should provide recommendations based on usage patterns', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      await costControlService.setInvocationLimits(module, {});

      // Simulate high invocation count
      for (let i = 0; i < 10; i++) {
        await costControlService.recordInvocation(module, functionName, 100, 256, 0.001);
      }

      const result = await costControlService.getCostOptimizationRecommendations(module);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});

describe('ColdStartOptimizationService', () => {
  let coldStartService;

  beforeEach(() => {
    coldStartService = new ColdStartOptimizationService();
  });

  describe('configureMemoryProfile', () => {
    it('should configure memory profile for a function', async () => {
      const module = 'test-module';
      const functionName = 'test-function';
      const config = {
        memory: 512,
        timeout: 60,
        warmupEnabled: true
      };

      const result = await coldStartService.configureMemoryProfile(module, functionName, config);

      expect(result.success).toBe(true);
      expect(result.profile.memory).toBe(512);
      expect(result.profile.timeout).toBe(60);
      expect(result.profile.warmupEnabled).toBe(true);
    });
  });

  describe('recordColdStart', () => {
    it('should record cold start event and analyze performance', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      const result = await coldStartService.recordColdStart(
        module,
        functionName,
        2000, // duration
        400,  // memory used
        512   // memory allocated
      );

      expect(result.success).toBe(true);
      expect(result.metrics.totalColdStarts).toBe(1);
      expect(result.metrics.averageDuration).toBe(2000);
    });

    it('should provide optimization recommendations for poor performance', async () => {
      const module = 'test-module';
      const functionName = 'test-function';

      // Configure low memory utilization scenario
      await coldStartService.configureMemoryProfile(module, functionName, {
        memory: 1024
      });

      // Record cold start with low memory usage
      await coldStartService.recordColdStart(module, functionName, 3000, 200, 1024);

      const recommendations = await coldStartService.getOptimizationRecommendations(module, functionName);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.type === 'REDUCE_MEMORY')).toBe(true);
    });
  });

  describe('setupWarmupSchedule', () => {
    it('should setup warmup schedule for a function', async () => {
      const module = 'test-module';
      const functionName = 'test-function';
      const schedule = '*/5 * * * *';

      const result = await coldStartService.setupWarmupSchedule(module, functionName, schedule);

      expect(result.success).toBe(true);
      expect(result.config.schedule).toBe(schedule);
      expect(result.config.enabled).toBe(true);
    });
  });
});

describe('BatchProcessingService', () => {
  let batchService;

  beforeEach(() => {
    batchService = new BatchProcessingService();
  });

  describe('configureBatchProcessing', () => {
    it('should configure batch processing for an operation', async () => {
      const module = 'test-module';
      const operationType = 'data-processing';
      const config = {
        maxBatchSize: 50,
        maxWaitTime: 3000,
        enabled: true
      };

      const result = await batchService.configureBatchProcessing(module, operationType, config);

      expect(result.success).toBe(true);
      expect(result.config.maxBatchSize).toBe(50);
      expect(result.config.maxWaitTime).toBe(3000);
    });
  });

  describe('addToBatch', () => {
    it('should add item to batch queue', async () => {
      const module = 'test-module';
      const operationType = 'data-processing';

      await batchService.configureBatchProcessing(module, operationType, {
        maxBatchSize: 10,
        maxWaitTime: 5000,
        enabled: true,
        processor: async (items) => ({ processed: items.length })
      });

      const result = await batchService.addToBatch(module, operationType, { data: 'test' });

      expect(result.success).toBe(true);
      expect(result.itemId).toBeDefined();
      expect(result.queueSize).toBe(1);
    });

    it('should process immediately when batching is disabled', async () => {
      const module = 'test-module';
      const operationType = 'data-processing';

      await batchService.configureBatchProcessing(module, operationType, {
        enabled: false
      });

      const result = await batchService.addToBatch(module, operationType, { data: 'test' });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
    });
  });

  describe('batch processing triggers', () => {
    it('should process batch when size limit reached', async () => {
      const module = 'test-module';
      const operationType = 'data-processing';

      await batchService.configureBatchProcessing(module, operationType, {
        maxBatchSize: 2,
        maxWaitTime: 10000,
        enabled: true,
        processor: async (items) => ({ processed: items.length })
      });

      // Add items to reach batch size limit
      await batchService.addToBatch(module, operationType, { data: 'test1' });
      const result = await batchService.addToBatch(module, operationType, { data: 'test2' });

      // Should trigger batch processing
      expect(result.success).toBe(true);
    });
  });
});

describe('CostMonitoringDashboardService', () => {
  let dashboardService;

  beforeEach(() => {
    dashboardService = new CostMonitoringDashboardService();
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      const result = await dashboardService.getDashboardSummary();

      expect(result.overview).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const result = await dashboardService.getDashboardData('24h');

      expect(result.overview).toBeDefined();
      expect(result.modules).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.trends).toBeDefined();
    });
  });
});

describe('GracefulDegradationService', () => {
  let degradationService;

  beforeEach(() => {
    degradationService = new GracefulDegradationService();
  });

  describe('configureDegradationStrategies', () => {
    it('should configure degradation strategies for a module', async () => {
      const module = 'test-module';
      const config = {
        strategies: ['CACHE_FALLBACK', 'FEATURE_TOGGLE'],
        budgetThreshold: 0.9,
        autoRecover: true
      };

      const result = await degradationService.configureDegradationStrategies(module, config);

      expect(result.success).toBe(true);
      expect(result.config.strategies).toEqual(['CACHE_FALLBACK', 'FEATURE_TOGGLE']);
      expect(result.config.triggers.budgetThreshold).toBe(0.9);
    });
  });

  describe('triggerDegradation', () => {
    it('should trigger appropriate degradation strategy', async () => {
      const module = 'test-module';

      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK', 'FEATURE_TOGGLE']
      });

      const result = await degradationService.triggerDegradation(
        module, 
        'budget_exceeded', 
        'medium'
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CACHE_FALLBACK'); // Should select lowest priority strategy
    });

    it('should not trigger if no strategies available', async () => {
      const module = 'test-module';

      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK']
      });

      // Trigger first strategy
      await degradationService.triggerDegradation(module, 'budget_exceeded', 'medium');

      // Try to trigger again - should fail as strategy already active
      const result = await degradationService.triggerDegradation(module, 'budget_exceeded', 'medium');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No suitable degradation strategy found');
    });
  });

  describe('recoverFromDegradation', () => {
    it('should recover from active degradation strategy', async () => {
      const module = 'test-module';

      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK']
      });

      // Trigger degradation
      await degradationService.triggerDegradation(module, 'budget_exceeded', 'medium');

      // Recover
      const result = await degradationService.recoverFromDegradation(module, 'CACHE_FALLBACK');

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CACHE_FALLBACK');
    });
  });

  describe('getDegradationStatus', () => {
    it('should return current degradation status', async () => {
      const module = 'test-module';

      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK', 'FEATURE_TOGGLE']
      });

      const result = await degradationService.getDegradationStatus(module);

      expect(result.module).toBe(module);
      expect(result.configured).toBe(true);
      expect(result.availableStrategies).toEqual(['CACHE_FALLBACK', 'FEATURE_TOGGLE']);
      expect(result.activeStrategies).toEqual([]);
    });
  });
});

describe('Integration Tests', () => {
  let costControlService;
  let coldStartService;
  let batchService;
  let dashboardService;
  let degradationService;

  beforeEach(() => {
    costControlService = new ServerlessCostControlService();
    coldStartService = new ColdStartOptimizationService();
    batchService = new BatchProcessingService();
    dashboardService = new CostMonitoringDashboardService();
    degradationService = new GracefulDegradationService();
  });

  describe('Cost Control Integration', () => {
    it('should integrate cost control with degradation triggers', async () => {
      const module = 'test-module';

      // Configure cost limits
      await costControlService.setInvocationLimits(module, {
        perMinute: 10,
        monthlyBudget: 100
      });

      // Configure degradation strategies
      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK', 'FEATURE_TOGGLE'],
        budgetThreshold: 0.8
      });

      // Simulate high cost usage
      for (let i = 0; i < 15; i++) {
        await costControlService.recordInvocation(module, 'test-function', 100, 256, 10);
      }

      // Check if degradation should be triggered
      const costData = await costControlService.getCostDashboardData(module);
      const budgetUtilization = costData.budgetUtilization?.utilization || 0;

      if (budgetUtilization > 0.8) {
        const degradationResult = await degradationService.triggerDegradation(
          module, 
          'budget_threshold_exceeded', 
          'medium'
        );
        expect(degradationResult.success).toBe(true);
      }
    });

    it('should provide comprehensive optimization recommendations', async () => {
      const module = 'test-module';

      // Setup services
      await costControlService.setInvocationLimits(module, {});
      await coldStartService.configureMemoryProfile(module, 'handler', { memory: 1024 });
      await batchService.configureBatchProcessing(module, 'data-processing', { enabled: true });

      // Simulate usage patterns
      await costControlService.recordInvocation(module, 'handler', 100, 256, 0.001);
      await coldStartService.recordColdStart(module, 'handler', 3000, 200, 1024);

      // Get recommendations from dashboard
      const dashboardData = await dashboardService.getDashboardData('24h');

      expect(dashboardData.recommendations).toBeDefined();
      expect(Array.isArray(dashboardData.recommendations)).toBe(true);
    });
  });

  describe('End-to-End Cost Optimization Workflow', () => {
    it('should handle complete cost optimization lifecycle', async () => {
      const module = 'test-module';
      const functionName = 'api-handler';

      // 1. Initial configuration
      await costControlService.setInvocationLimits(module, {
        perMinute: 100,
        monthlyBudget: 500
      });

      await coldStartService.configureMemoryProfile(module, functionName, {
        memory: 512,
        timeout: 30,
        warmupEnabled: false
      });

      await batchService.configureBatchProcessing(module, 'api-requests', {
        maxBatchSize: 10,
        maxWaitTime: 2000,
        enabled: true,
        processor: async (items) => ({ processed: items.length })
      });

      await degradationService.configureDegradationStrategies(module, {
        strategies: ['CACHE_FALLBACK', 'FEATURE_TOGGLE', 'RATE_LIMITING'],
        budgetThreshold: 0.8,
        autoRecover: true
      });

      // 2. Simulate usage and performance issues
      for (let i = 0; i < 20; i++) {
        await costControlService.recordInvocation(module, functionName, 150, 400, 0.002);
        if (i % 5 === 0) {
          await coldStartService.recordColdStart(module, functionName, 2500, 350, 512);
        }
      }

      // 3. Get optimization recommendations
      const costRecs = await costControlService.getCostOptimizationRecommendations(module);
      const coldStartRecs = await coldStartService.getOptimizationRecommendations(module, functionName);

      // 4. Check dashboard data
      const dashboardData = await dashboardService.getDashboardData('24h');

      // 5. Verify system health
      expect(costRecs.recommendations).toBeDefined();
      expect(coldStartRecs).toBeDefined();
      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.modules[module]).toBeDefined();

      // 6. Test degradation if needed
      const costData = await costControlService.getCostDashboardData(module);
      if (costData.budgetUtilization?.utilization > 0.8) {
        const degradationResult = await degradationService.triggerDegradation(
          module, 
          'integration_test', 
          'medium'
        );
        expect(degradationResult.success).toBe(true);

        // Test recovery
        const recoveryResult = await degradationService.forceRecovery(module);
        expect(recoveryResult.success).toBe(true);
      }
    });
  });
});