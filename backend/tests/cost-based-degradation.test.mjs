/**
 * Cost-Based Degradation Tests
 * Tests auto-pause for low-priority flows, cost monitoring,
 * and threshold-based flow control with serverless cost control integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CostBasedDegradationService from '../services/CostBasedDegradationService.mjs';

describe('Cost-Based Degradation Service', () => {
  let degradationService;

  beforeEach(async () => {
    degradationService = new CostBasedDegradationService({
      burnRateThreshold: 0.10, // 10%
      criticalBurnRateThreshold: 0.20, // 20%
      costBudgetDaily: 1000,
      costBudgetHourly: 50,
      costMonitoringInterval: 1000, // 1 second for tests
      recoveryDelay: 2000 // 2 seconds for tests
    });
  });

  afterEach(async () => {
    if (degradationService) {
      await degradationService.cleanup();
    }
  });

  describe('Flow Registration and Management', () => {
    it('should register flows with different priorities', async () => {
      const highPriorityFlow = await degradationService.registerFlow('flow-high', {
        priority: 'high',
        estimatedCost: 10,
        maxCost: 20
      });

      const lowPriorityFlow = await degradationService.registerFlow('flow-low', {
        priority: 'low',
        estimatedCost: 5,
        maxCost: 15
      });

      expect(highPriorityFlow.priority).toBe('high');
      expect(lowPriorityFlow.priority).toBe('low');
      expect(degradationService.activeFlows.size).toBe(2);
    });

    it('should update flow costs', async () => {
      await degradationService.registerFlow('flow-1', {
        priority: 'medium',
        estimatedCost: 10
      });

      const updatedFlow = await degradationService.updateFlowCost('flow-1', 15);

      expect(updatedFlow.actualCost).toBe(15);
      expect(updatedFlow.lastUpdated).toBeDefined();
    });

    it('should complete flows and track metrics', async () => {
      await degradationService.registerFlow('flow-1', {
        priority: 'medium',
        estimatedCost: 10
      });

      const completedFlow = await degradationService.completeFlow('flow-1', 12);

      expect(completedFlow.status).toBe('completed');
      expect(completedFlow.actualCost).toBe(12);
      expect(degradationService.activeFlows.has('flow-1')).toBe(false);
      expect(degradationService.flowMetrics.has('flow-1')).toBe(true);
    });

    it('should pause flows that exceed cost limits', async () => {
      await degradationService.registerFlow('flow-1', {
        priority: 'medium',
        estimatedCost: 10,
        maxCost: 20
      });

      // Update cost beyond limit
      await degradationService.updateFlowCost('flow-1', 25);

      expect(degradationService.pausedFlows.has('flow-1')).toBe(true);
    });
  });

  describe('Cost Monitoring and Burn Rate Calculation', () => {
    it('should calculate burn rate from cost history', async () => {
      // Simulate cost history
      degradationService.costHistory = [
        { timestamp: new Date(Date.now() - 300000).toISOString(), totalCost: 10 }, // 5 min ago
        { timestamp: new Date(Date.now() - 240000).toISOString(), totalCost: 15 }, // 4 min ago
        { timestamp: new Date(Date.now() - 180000).toISOString(), totalCost: 20 }  // 3 min ago
      ];

      const currentCosts = { totalCost: 30 };
      const burnRate = await degradationService.calculateBurnRate(currentCosts);

      expect(burnRate).toBeGreaterThan(0);
    });

    it('should determine degradation levels based on burn rate', async () => {
      // Test different burn rate scenarios
      expect(degradationService.determineDegradationLevel(0.05, { budgetUtilization: { hourly: 0.5, daily: 0.5 } })).toBe('none');
      expect(degradationService.determineDegradationLevel(0.12, { budgetUtilization: { hourly: 0.5, daily: 0.5 } })).toBe('throttle_low');
      expect(degradationService.determineDegradationLevel(0.18, { budgetUtilization: { hourly: 0.5, daily: 0.5 } })).toBe('pause_low');
      expect(degradationService.determineDegradationLevel(0.25, { budgetUtilization: { hourly: 0.5, daily: 0.5 } })).toBe('emergency');
    });

    it('should determine degradation levels based on budget utilization', async () => {
      // Test budget-based degradation
      expect(degradationService.determineDegradationLevel(0.05, { budgetUtilization: { hourly: 0.95, daily: 0.5 } })).toBe('pause_medium');
      expect(degradationService.determineDegradationLevel(0.05, { budgetUtilization: { hourly: 0.5, daily: 0.85 } })).toBe('throttle_medium');
    });

    it('should get current cost metrics', async () => {
      // Register some flows with costs
      await degradationService.registerFlow('flow-1', { priority: 'high', estimatedCost: 10 });
      await degradationService.updateFlowCost('flow-1', 15);

      const costMetrics = await degradationService.getCurrentCostMetrics();

      expect(costMetrics.flowCost).toBe(15);
      expect(costMetrics.budgetUtilization).toBeDefined();
      expect(costMetrics.timestamp).toBeDefined();
    });
  });

  describe('Flow Degradation and Recovery', () => {
    beforeEach(async () => {
      // Register flows with different priorities
      await degradationService.registerFlow('critical-1', { priority: 'critical', estimatedCost: 5 });
      await degradationService.registerFlow('high-1', { priority: 'high', estimatedCost: 10 });
      await degradationService.registerFlow('medium-1', { priority: 'medium', estimatedCost: 8 });
      await degradationService.registerFlow('low-1', { priority: 'low', estimatedCost: 3 });
      await degradationService.registerFlow('background-1', { priority: 'background', estimatedCost: 2 });
    });

    it('should throttle low priority flows during throttle_low degradation', async () => {
      await degradationService.applyDegradation('throttle_low', 0.12, {});

      expect(degradationService.currentDegradationLevel).toBe('throttle_low');
      expect(degradationService.throttledFlows.has('low-1')).toBe(true);
      expect(degradationService.throttledFlows.has('background-1')).toBe(true);
      expect(degradationService.throttledFlows.has('medium-1')).toBe(false);
      expect(degradationService.throttledFlows.has('high-1')).toBe(false);
    });

    it('should pause low priority flows during pause_low degradation', async () => {
      await degradationService.applyDegradation('pause_low', 0.18, {});

      expect(degradationService.currentDegradationLevel).toBe('pause_low');
      expect(degradationService.pausedFlows.has('low-1')).toBe(true);
      expect(degradationService.pausedFlows.has('background-1')).toBe(true);
      expect(degradationService.pausedFlows.has('medium-1')).toBe(false);
    });

    it('should pause medium and low priority flows during pause_medium degradation', async () => {
      await degradationService.applyDegradation('pause_medium', 0.15, {});

      expect(degradationService.currentDegradationLevel).toBe('pause_medium');
      expect(degradationService.pausedFlows.has('medium-1')).toBe(true);
      expect(degradationService.pausedFlows.has('low-1')).toBe(true);
      expect(degradationService.pausedFlows.has('background-1')).toBe(true);
      expect(degradationService.pausedFlows.has('high-1')).toBe(false);
      expect(degradationService.pausedFlows.has('critical-1')).toBe(false);
    });

    it('should pause all non-critical flows during emergency degradation', async () => {
      await degradationService.applyDegradation('emergency', 0.25, {});

      expect(degradationService.currentDegradationLevel).toBe('emergency');
      expect(degradationService.pausedFlows.has('high-1')).toBe(true);
      expect(degradationService.pausedFlows.has('medium-1')).toBe(true);
      expect(degradationService.pausedFlows.has('low-1')).toBe(true);
      expect(degradationService.pausedFlows.has('background-1')).toBe(true);
      expect(degradationService.pausedFlows.has('critical-1')).toBe(false);
    });

    it('should resume all flows during recovery', async () => {
      // First apply degradation
      await degradationService.applyDegradation('pause_medium', 0.15, {});
      
      expect(degradationService.pausedFlows.size).toBeGreaterThan(0);

      // Then recover
      await degradationService.applyDegradation('none', 0.03, {});

      expect(degradationService.currentDegradationLevel).toBe('none');
      expect(degradationService.pausedFlows.size).toBe(0);
      expect(degradationService.throttledFlows.size).toBe(0);
    });

    it('should immediately degrade new flows based on current degradation level', async () => {
      // Set degradation level
      degradationService.currentDegradationLevel = 'pause_low';

      // Register new low priority flow
      const flow = await degradationService.registerFlow('new-low', { priority: 'low' });

      expect(degradationService.pausedFlows.has('new-low')).toBe(true);
    });
  });

  describe('Individual Flow Control', () => {
    beforeEach(async () => {
      await degradationService.registerFlow('test-flow', { priority: 'medium' });
    });

    it('should throttle individual flows', async () => {
      const result = await degradationService.throttleFlow('test-flow', 'manual_throttle');

      expect(result).toBe(true);
      expect(degradationService.throttledFlows.has('test-flow')).toBe(true);
      
      const flow = degradationService.activeFlows.get('test-flow');
      expect(flow.status).toBe('throttled');
    });

    it('should pause individual flows', async () => {
      const result = await degradationService.pauseFlow('test-flow', 'manual_pause');

      expect(result).toBe(true);
      expect(degradationService.pausedFlows.has('test-flow')).toBe(true);
      
      const flow = degradationService.activeFlows.get('test-flow');
      expect(flow.status).toBe('paused');
    });

    it('should resume individual flows', async () => {
      // First pause the flow
      await degradationService.pauseFlow('test-flow', 'test');
      
      // Then resume it
      const result = await degradationService.resumeFlow('test-flow');

      expect(result).toBe(true);
      expect(degradationService.pausedFlows.has('test-flow')).toBe(false);
      
      const flow = degradationService.activeFlows.get('test-flow');
      expect(flow.status).toBe('active');
    });

    it('should handle non-existent flows gracefully', async () => {
      const throttleResult = await degradationService.throttleFlow('non-existent', 'test');
      const pauseResult = await degradationService.pauseFlow('non-existent', 'test');
      const resumeResult = await degradationService.resumeFlow('non-existent');

      expect(throttleResult).toBe(false);
      expect(pauseResult).toBe(false);
      expect(resumeResult).toBe(false);
    });
  });

  describe('Recovery Scheduling', () => {
    it('should schedule recovery when burn rate drops', async () => {
      // Set degradation level
      degradationService.currentDegradationLevel = 'throttle_low';

      // Mock burn rate calculation to return low value
      vi.spyOn(degradationService, 'calculateBurnRate').mockResolvedValue(0.03);

      const shouldRecover = degradationService.shouldAttemptRecovery(0.03);
      expect(shouldRecover).toBe(true);

      await degradationService.scheduleRecovery();
      expect(degradationService.recoveryTimer).toBeDefined();
    });

    it('should not schedule recovery if already scheduled', async () => {
      degradationService.currentDegradationLevel = 'throttle_low';
      degradationService.recoveryTimer = setTimeout(() => {}, 1000); // Mock existing timer

      const shouldRecover = degradationService.shouldAttemptRecovery(0.03);
      expect(shouldRecover).toBe(false);

      clearTimeout(degradationService.recoveryTimer);
    });

    it('should not schedule recovery if degradation level is none', async () => {
      degradationService.currentDegradationLevel = 'none';

      const shouldRecover = degradationService.shouldAttemptRecovery(0.03);
      expect(shouldRecover).toBe(false);
    });
  });

  describe('Cost History Management', () => {
    it('should trim old cost history', async () => {
      // Add old entries
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      const recentTimestamp = new Date().toISOString();

      degradationService.costHistory = [
        { timestamp: oldTimestamp, totalCost: 10 },
        { timestamp: recentTimestamp, totalCost: 20 }
      ];

      degradationService.burnRateHistory = [
        { timestamp: oldTimestamp, burnRate: 0.1 },
        { timestamp: recentTimestamp, burnRate: 0.05 }
      ];

      degradationService.trimHistory();

      expect(degradationService.costHistory).toHaveLength(1);
      expect(degradationService.burnRateHistory).toHaveLength(1);
      expect(degradationService.costHistory[0].timestamp).toBe(recentTimestamp);
    });

    it('should calculate costs in time window', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      degradationService.costHistory = [
        { timestamp: twoHoursAgo.toISOString(), totalCost: 10 },
        { timestamp: oneHourAgo.toISOString(), totalCost: 20 },
        { timestamp: now.toISOString(), totalCost: 30 }
      ];

      const costsInLastHour = degradationService.calculateCostsInTimeWindow(oneHourAgo, now);
      expect(costsInLastHour).toBe(30); // Should return the maximum cost in the window
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide degradation status', async () => {
      await degradationService.registerFlow('flow-1', { priority: 'low' });
      await degradationService.pauseFlow('flow-1', 'test');

      const status = degradationService.getDegradationStatus();

      expect(status.currentLevel).toBe('none');
      expect(status.activeFlows).toBe(1);
      expect(status.pausedFlows).toBe(1);
      expect(status.throttledFlows).toBe(0);
      expect(status.recentBurnRate).toBe(0);
    });

    it('should provide cost summary', async () => {
      degradationService.costHistory = [
        { timestamp: new Date().toISOString(), totalCost: 100 }
      ];

      const summary = degradationService.getCostSummary();

      expect(summary.currentCosts.totalCost).toBe(100);
      expect(summary.totalFlows).toBe(0);
      expect(summary.costHistory).toHaveLength(1);
    });

    it('should provide health check information', async () => {
      const health = await degradationService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.degradationLevel).toBe('none');
      expect(health.monitoringActive).toBe(true);
      expect(health.config.burnRateThreshold).toBe(0.10);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in cost monitoring gracefully', async () => {
      // Mock getCurrentCostMetrics to throw error
      vi.spyOn(degradationService, 'getCurrentCostMetrics').mockRejectedValue(new Error('Cost service unavailable'));

      // Should not throw
      await expect(degradationService.performCostMonitoring()).resolves.toBeUndefined();
    });

    it('should handle errors when updating non-existent flows', async () => {
      await expect(degradationService.updateFlowCost('non-existent', 10))
        .rejects.toThrow(/Flow not found/);
    });

    it('should handle cleanup gracefully', async () => {
      await expect(degradationService.cleanup()).resolves.toBeUndefined();
      expect(degradationService.costMonitoringTimer).toBeNull();
    });
  });

  describe('Integration with Serverless Cost Control', () => {
    it('should trigger emergency measures during emergency degradation', async () => {
      // Mock serverless cost control service
      const mockTriggerEmergency = vi.spyOn(degradationService.serverlessCostControl, 'triggerEmergencyMeasures')
        .mockResolvedValue(true);

      await degradationService.applyDegradation('emergency', 0.25, {});

      expect(mockTriggerEmergency).toHaveBeenCalled();
    });

    it('should integrate serverless costs in cost metrics', async () => {
      // Mock serverless cost control to return costs
      vi.spyOn(degradationService.serverlessCostControl, 'getCurrentCosts')
        .mockResolvedValue({ totalCost: 50 });

      const costMetrics = await degradationService.getCurrentCostMetrics();

      expect(costMetrics.serverlessCost).toBe(50);
      expect(costMetrics.totalCost).toBeGreaterThanOrEqual(50);
    });
  });
});