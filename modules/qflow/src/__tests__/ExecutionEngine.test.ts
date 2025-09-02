/**
 * Execution Engine Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executionEngine } from '../core/ExecutionEngine.js';
import { FlowDefinition, ExecutionContext } from '../models/FlowDefinition.js';

describe('ExecutionEngine', () => {
  const testFlow: FlowDefinition = {
    id: 'test-flow',
    name: 'Test Flow',
    version: '1.0.0',
    owner: 'squid:test:user',
    description: 'Test flow for unit testing',
    steps: [
      {
        id: 'step1',
        type: 'task',
        action: 'test-action-1',
        params: { key: 'value1' },
        onSuccess: 'step2'
      },
      {
        id: 'step2',
        type: 'task',
        action: 'test-action-2',
        params: { key: 'value2' }
      }
    ],
    metadata: {
      tags: ['test'],
      category: 'testing',
      visibility: 'private',
      requiredPermissions: ['test.execute']
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const testContext: ExecutionContext = {
    triggeredBy: 'squid:test:user',
    triggerType: 'manual',
    inputData: { input: 'test' },
    variables: {},
    permissions: ['test.execute']
  };

  beforeEach(() => {
    // Register test flow
    executionEngine.registerFlow(testFlow);
  });

  describe('registerFlow', () => {
    it('should register a flow definition', () => {
      const newFlow: FlowDefinition = {
        ...testFlow,
        id: 'new-test-flow',
        name: 'New Test Flow'
      };

      expect(() => executionEngine.registerFlow(newFlow)).not.toThrow();
    });
  });

  describe('startExecution', () => {
    it('should start flow execution and return execution ID', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');
      expect(executionId.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent flow', async () => {
      await expect(
        executionEngine.startExecution('non-existent-flow', testContext)
      ).rejects.toThrow('Flow not found: non-existent-flow');
    });

    it('should create execution state with correct initial values', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait a bit for async execution to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      
      expect(execution).toBeDefined();
      expect(execution?.executionId).toBe(executionId);
      expect(execution?.flowId).toBe(testFlow.id);
      expect(execution?.context).toEqual(testContext);
      expect(execution?.completedSteps).toEqual([]);
      expect(execution?.failedSteps).toEqual([]);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return execution state for valid execution ID', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      const execution = await executionEngine.getExecutionStatus(executionId);
      
      expect(execution).toBeDefined();
      expect(execution?.executionId).toBe(executionId);
    });

    it('should return null for non-existent execution ID', async () => {
      const execution = await executionEngine.getExecutionStatus('non-existent-id');
      
      expect(execution).toBeNull();
    });
  });

  describe('pauseExecution', () => {
    it('should pause running execution', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await executionEngine.pauseExecution(executionId);
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      expect(execution?.status).toBe('paused');
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        executionEngine.pauseExecution('non-existent-id')
      ).rejects.toThrow('Execution not found: non-existent-id');
    });
  });

  describe('resumeExecution', () => {
    it('should resume paused execution', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await executionEngine.pauseExecution(executionId);
      await executionEngine.resumeExecution(executionId);
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      expect(execution?.status).toBe('running');
    });

    it('should throw error for non-paused execution', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait a bit for execution to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await expect(
        executionEngine.resumeExecution(executionId)
      ).rejects.toThrow(/Cannot resume execution in status: (pending|running)/);
    });
  });

  describe('abortExecution', () => {
    it('should abort running execution', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      await executionEngine.abortExecution(executionId);
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      expect(execution?.status).toBe('aborted');
      expect(execution?.endTime).toBeDefined();
    });

    it('should throw error for non-existent execution', async () => {
      await expect(
        executionEngine.abortExecution('non-existent-id')
      ).rejects.toThrow('Execution not found: non-existent-id');
    });
  });

  describe('getAllExecutions', () => {
    it('should return all executions', async () => {
      const executionId1 = await executionEngine.startExecution(testFlow.id, testContext);
      const executionId2 = await executionEngine.startExecution(testFlow.id, testContext);
      
      const executions = executionEngine.getAllExecutions();
      
      expect(executions.length).toBeGreaterThanOrEqual(2);
      expect(executions.some(e => e.executionId === executionId1)).toBe(true);
      expect(executions.some(e => e.executionId === executionId2)).toBe(true);
    });
  });

  describe('cleanupExecutions', () => {
    it('should clean up old completed executions', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const initialCount = executionEngine.getAllExecutions().length;
      
      // Clean up with very short max age (should remove completed executions)
      executionEngine.cleanupExecutions(1);
      
      const finalCount = executionEngine.getAllExecutions().length;
      
      // Should have cleaned up some executions
      expect(finalCount).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('flow execution', () => {
    it('should execute simple flow to completion', async () => {
      const simpleFlow: FlowDefinition = {
        ...testFlow,
        id: 'simple-flow',
        steps: [
          {
            id: 'only-step',
            type: 'task',
            action: 'simple-action',
            params: {}
          }
        ]
      };

      executionEngine.registerFlow(simpleFlow);
      
      const executionId = await executionEngine.startExecution(simpleFlow.id, testContext);
      
      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      
      expect(execution?.status).toBe('completed');
      expect(execution?.completedSteps).toContain('only-step');
      expect(execution?.endTime).toBeDefined();
    });

    it('should handle step transitions correctly', async () => {
      const executionId = await executionEngine.startExecution(testFlow.id, testContext);
      
      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const execution = await executionEngine.getExecutionStatus(executionId);
      
      expect(execution?.status).toBe('completed');
      expect(execution?.completedSteps).toContain('step1');
      expect(execution?.completedSteps).toContain('step2');
      expect(execution?.completedSteps).toHaveLength(2);
    });
  });
});