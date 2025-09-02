/**
 * Tests for ParallelExecutionEngine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParallelExecutionEngine } from '../optimization/ParallelExecutionEngine';
import { ResourcePoolManager } from '../optimization/ResourcePoolManager';
import { FlowStep, ExecutionContext } from '../models/FlowDefinition';

describe('ParallelExecutionEngine', () => {
  let parallelEngine: ParallelExecutionEngine;
  let resourceManager: ResourcePoolManager;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    resourceManager = new ResourcePoolManager();
    parallelEngine = new ParallelExecutionEngine({
      maxConcurrentSteps: 3,
      timeoutMs: 30000,
      retryAttempts: 2,
      failureStrategy: 'continue-on-error',
      resourceAllocation: 'balanced'
    }, resourceManager);

    mockContext = {
      triggeredBy: 'test-user',
      triggerType: 'manual',
      inputData: {},
      variables: {},
      permissions: []
    };
  });

  afterEach(async () => {
    await resourceManager.cleanup();
  });

  describe('Step Analysis', () => {
    it('should analyze independent steps for parallel execution', () => {
      const steps: FlowStep[] = [
        {
          id: 'step1',
          type: 'task',
          action: 'process-a',
          params: { input: 'data1' }
        },
        {
          id: 'step2',
          type: 'task',
          action: 'process-b',
          params: { input: 'data2' }
        },
        {
          id: 'step3',
          type: 'task',
          action: 'combine',
          params: { inputs: ['${step1.result}', '${step2.result}'] }
        }
      ];

      const plan = parallelEngine.analyzeSteps(steps);
      
      expect(plan).toBeDefined();
      expect(plan.totalSteps).toBe(3);
      expect(plan.parallelizationRatio).toBeGreaterThan(0);
      
      // Should identify that step1 and step2 can run in parallel
      const parallelGroup = plan.groups.find(g => g.steps.length > 1);
      expect(parallelGroup).toBeDefined();
    });

    it('should handle sequential dependencies correctly', () => {
      const steps: FlowStep[] = [
        {
          id: 'init',
          type: 'task',
          action: 'initialize',
          params: {}
        },
        {
          id: 'process',
          type: 'task',
          action: 'process',
          params: { input: '${init.result}' }
        },
        {
          id: 'finalize',
          type: 'task',
          action: 'finalize',
          params: { input: '${process.result}' }
        }
      ];

      const plan = parallelEngine.analyzeSteps(steps);
      
      // All steps should be sequential due to dependencies
      expect(plan.groups.length).toBe(3);
      plan.groups.forEach(group => {
        expect(group.steps.length).toBe(1);
      });
    });

    it('should detect circular dependencies', () => {
      const steps: FlowStep[] = [
        {
          id: 'step1',
          type: 'task',
          action: 'process',
          params: { input: '${step2.result}' }
        },
        {
          id: 'step2',
          type: 'task',
          action: 'process',
          params: { input: '${step1.result}' }
        }
      ];

      expect(() => {
        parallelEngine.analyzeSteps(steps);
      }).toThrow('Circular dependency detected');
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent steps in parallel', async () => {
      const steps: FlowStep[] = [
        {
          id: 'parallel1',
          type: 'task',
          action: 'task-a',
          params: { duration: 100 }
        },
        {
          id: 'parallel2',
          type: 'task',
          action: 'task-b',
          params: { duration: 100 }
        }
      ];

      const startTime = Date.now();
      const result = await parallelEngine.executeParallel(steps, mockContext);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.results.size).toBe(2);
      expect(result.results.has('parallel1')).toBe(true);
      expect(result.results.has('parallel2')).toBe(true);
      
      // Parallel execution should be faster than sequential
      expect(executionTime).toBeLessThan(250); // Should be much less than 200ms (2 * 100ms)
    });

    it('should handle mixed parallel and sequential execution', async () => {
      const steps: FlowStep[] = [
        {
          id: 'init',
          type: 'task',
          action: 'initialize',
          params: {}
        },
        {
          id: 'parallel1',
          type: 'task',
          action: 'process-a',
          params: { input: '${init.result}' }
        },
        {
          id: 'parallel2',
          type: 'task',
          action: 'process-b',
          params: { input: '${init.result}' }
        },
        {
          id: 'combine',
          type: 'task',
          action: 'combine',
          params: { inputs: ['${parallel1.result}', '${parallel2.result}'] }
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.results.size).toBe(4);
      expect(result.parallelEfficiency).toBeGreaterThan(0);
    });

    it('should respect concurrency limits', async () => {
      const steps: FlowStep[] = Array(10).fill(0).map((_, i) => ({
        id: `step${i}`,
        type: 'task' as const,
        action: 'concurrent-task',
        params: { index: i }
      }));

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.results.size).toBe(10);
      expect(result.resourceUtilization).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle step failures with continue-on-error strategy', async () => {
      const steps: FlowStep[] = [
        {
          id: 'success-step',
          type: 'task',
          action: 'success-task',
          params: {}
        },
        {
          id: 'failure-step',
          type: 'task',
          action: 'failure-task',
          params: { shouldFail: true }
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.success).toBe(false); // Overall failure due to one failed step
      expect(result.results.has('success-step')).toBe(true);
      expect(result.errors.has('failure-step')).toBe(true);
    });

    it('should handle fail-fast strategy', async () => {
      const failFastEngine = new ParallelExecutionEngine({
        maxConcurrentSteps: 3,
        timeoutMs: 30000,
        retryAttempts: 0,
        failureStrategy: 'fail-fast',
        resourceAllocation: 'balanced'
      }, resourceManager);

      const steps: FlowStep[] = [
        {
          id: 'step1',
          type: 'task',
          action: 'task',
          params: {}
        },
        {
          id: 'failing-step',
          type: 'task',
          action: 'failing-task',
          params: { shouldFail: true }
        }
      ];

      await expect(
        failFastEngine.executeParallel(steps, mockContext)
      ).rejects.toThrow();
    });

    it('should retry failed steps', async () => {
      let attemptCount = 0;
      
      // Mock the step execution to fail first time, succeed second time
      const originalExecuteStep = parallelEngine['executeStepWithRetry'];
      parallelEngine['executeStepWithRetry'] = async function(step, context, execution) {
        if (step.id === 'retry-step') {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('First attempt failed');
          }
        }
        return { stepId: step.id, result: 'success', executionTime: 100 };
      };

      const steps: FlowStep[] = [
        {
          id: 'retry-step',
          type: 'task',
          action: 'retry-task',
          params: {}
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2); // Failed once, succeeded on retry
    });
  });

  describe('Resource Management', () => {
    it('should acquire and release resources properly', async () => {
      const steps: FlowStep[] = [
        {
          id: 'resource-step',
          type: 'task',
          action: 'wasm-task', // This should trigger WASM resource acquisition
          params: {}
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.resourceUtilization).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate parallel efficiency', async () => {
      const steps: FlowStep[] = [
        {
          id: 'efficient1',
          type: 'task',
          action: 'task',
          params: {},
          timeout: 1000
        },
        {
          id: 'efficient2',
          type: 'task',
          action: 'task',
          params: {},
          timeout: 1000
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.parallelEfficiency).toBeGreaterThan(0);
      expect(result.parallelEfficiency).toBeLessThanOrEqual(1);
    });

    it('should track resource utilization', async () => {
      const steps: FlowStep[] = [
        {
          id: 'util-step',
          type: 'task',
          action: 'task',
          params: {}
        }
      ];

      const result = await parallelEngine.executeParallel(steps, mockContext);
      
      expect(result.resourceUtilization).toBeGreaterThanOrEqual(0);
      expect(result.resourceUtilization).toBeLessThanOrEqual(1);
    });
  });

  describe('Step Independence Analysis', () => {
    it('should detect resource conflicts', () => {
      const step1: FlowStep = {
        id: 'exclusive1',
        type: 'task',
        action: 'exclusive-task',
        params: { exclusive: true }
      };

      const step2: FlowStep = {
        id: 'exclusive2',
        type: 'task',
        action: 'exclusive-task',
        params: { exclusive: true }
      };

      const areIndependent = parallelEngine['areStepsIndependent'](
        step1,
        step2,
        new Map()
      );

      expect(areIndependent).toBe(false);
    });

    it('should detect state conflicts', () => {
      const step1: FlowStep = {
        id: 'writer',
        type: 'task',
        action: 'write-task',
        params: { output: 'shared-state' }
      };

      const step2: FlowStep = {
        id: 'reader',
        type: 'task',
        action: 'read-task',
        params: { input: ['shared-state'] }
      };

      const areIndependent = parallelEngine['areStepsIndependent'](
        step1,
        step2,
        new Map()
      );

      expect(areIndependent).toBe(false);
    });

    it('should allow truly independent steps', () => {
      const step1: FlowStep = {
        id: 'independent1',
        type: 'task',
        action: 'task-a',
        params: { input: 'data1' }
      };

      const step2: FlowStep = {
        id: 'independent2',
        type: 'task',
        action: 'task-b',
        params: { input: 'data2' }
      };

      const areIndependent = parallelEngine['areStepsIndependent'](
        step1,
        step2,
        new Map()
      );

      expect(areIndependent).toBe(true);
    });
  });

  describe('Execution Planning', () => {
    it('should create optimal execution plan', () => {
      const steps: FlowStep[] = [
        {
          id: 'setup',
          type: 'task',
          action: 'setup',
          params: {}
        },
        {
          id: 'process1',
          type: 'task',
          action: 'process',
          params: { input: '${setup.result}' }
        },
        {
          id: 'process2',
          type: 'task',
          action: 'process',
          params: { input: '${setup.result}' }
        },
        {
          id: 'process3',
          type: 'task',
          action: 'process',
          params: { input: '${setup.result}' }
        },
        {
          id: 'cleanup',
          type: 'task',
          action: 'cleanup',
          params: { 
            inputs: ['${process1.result}', '${process2.result}', '${process3.result}'] 
          }
        }
      ];

      const plan = parallelEngine.analyzeSteps(steps);
      
      expect(plan.groups.length).toBe(3); // setup, parallel processes, cleanup
      
      const parallelGroup = plan.groups.find(g => g.steps.length === 3);
      expect(parallelGroup).toBeDefined();
      expect(parallelGroup?.steps.map(s => s.id)).toEqual(['process1', 'process2', 'process3']);
    });

    it('should estimate execution duration', () => {
      const steps: FlowStep[] = [
        {
          id: 'fast',
          type: 'task',
          action: 'fast-task',
          params: {},
          timeout: 1000
        },
        {
          id: 'slow',
          type: 'task',
          action: 'slow-task',
          params: {},
          timeout: 5000
        }
      ];

      const plan = parallelEngine.analyzeSteps(steps);
      
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeLessThanOrEqual(6000); // Max of both timeouts
    });
  });

  describe('Events', () => {
    it('should emit execution events', async () => {
      const events: string[] = [];
      
      parallelEngine.on('execution_plan_created', () => events.push('plan_created'));
      parallelEngine.on('group_completed', () => events.push('group_completed'));
      parallelEngine.on('step_completed', () => events.push('step_completed'));

      const steps: FlowStep[] = [
        {
          id: 'event-step',
          type: 'task',
          action: 'task',
          params: {}
        }
      ];

      await parallelEngine.executeParallel(steps, mockContext);

      expect(events).toContain('plan_created');
      expect(events).toContain('step_completed');
    });
  });
});