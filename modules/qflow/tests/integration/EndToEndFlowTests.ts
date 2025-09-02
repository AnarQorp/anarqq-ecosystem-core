/**
 * End-to-End Flow Execution Tests
 * 
 * Comprehensive integration tests for flow execution across multiple nodes,
 * testing distributed execution, fault tolerance, and performance.
 */

import { describe, it, beforeAll, afterAll, expect, beforeEach, afterEach } from '@jest/globals';
import { ExecutionEngine } from '../../src/execution/ExecutionEngine.js';
import { QNETNodeManager } from '../../src/network/QNETNodeManager.js';
import { intelligentLoadBalancer } from '../../src/scaling/IntelligentLoadBalancer.js';
import { autoScalingManager } from '../../src/scaling/AutoScalingManager.js';
import { optimizationManager } from '../../src/optimization/index.js';
import { qflowEventEmitter } from '../../src/events/EventEmitter.js';

interface TestNode {
  nodeId: string;
  capabilities: string[];
  status: 'healthy' | 'unhealthy' | 'offline';
  load: number;
}

interface TestFlow {
  flowId: string;
  definition: {
    name: string;
    version: string;
    steps: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
      dependencies?: string[];
    }>;
  };
  metadata: {
    owner: string;
    dao: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
}

describe('End-to-End Flow Execution Tests', () => {
  let executionEngine: ExecutionEngine;
  let nodeManager: QNETNodeManager;
  let testNodes: TestNode[];
  let testFlows: TestFlow[];

  beforeAll(async () => {
    // Initialize test environment
    executionEngine = new ExecutionEngine();
    nodeManager = new QNETNodeManager();
    
    // Start all systems
    await intelligentLoadBalancer.start();
    await autoScalingManager.start();
    await optimizationManager.start();
    await executionEngine.start();
    await nodeManager.start();

    // Setup test nodes
    testNodes = await setupTestNodes();
    
    // Setup test flows
    testFlows = createTestFlows();

    console.log('[E2E Tests] Test environment initialized');
  });

  afterAll(async () => {
    // Cleanup test environment
    await optimizationManager.stop();
    await autoScalingManager.stop();
    await intelligentLoadBalancer.stop();
    await executionEngine.stop();
    await nodeManager.stop();

    console.log('[E2E Tests] Test environment cleaned up');
  });

  beforeEach(async () => {
    // Reset node states
    for (const node of testNodes) {
      node.status = 'healthy';
      node.load = Math.random() * 30; // Low initial load
    }
  });

  afterEach(async () => {
    // Cleanup any running executions
    await cleanupRunningExecutions();
  });

  describe('Single Node Execution', () => {
    it('should execute simple sequential flow on single node', async () => {
      const flow = testFlows.find(f => f.definition.name === 'simple-sequential');
      expect(flow).toBeDefined();

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { message: 'test' },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      // Wait for execution to complete
      const result = await waitForExecution(executionId, 30000);
      
      expect(result.status).toBe('completed');
      expect(result.output).toBeDefined();
      expect(result.executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.steps).toHaveLength(flow!.definition.steps.length);
      
      // Verify all steps completed successfully
      for (const step of result.steps) {
        expect(step.status).toBe('completed');
        expect(step.error).toBeUndefined();
      }
    });

    it('should handle step failures gracefully', async () => {
      const flow = testFlows.find(f => f.definition.name === 'failure-handling');
      expect(flow).toBeDefined();

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { shouldFail: true },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      const result = await waitForExecution(executionId, 30000);
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      
      // Verify error handling and rollback
      const failedStep = result.steps.find(s => s.status === 'failed');
      expect(failedStep).toBeDefined();
      expect(failedStep!.error).toContain('Simulated failure');
    });

    it('should support flow pause and resume', async () => {
      const flow = testFlows.find(f => f.definition.name === 'pausable-flow');
      expect(flow).toBeDefined();

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { pauseAfterStep: 2 },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      // Wait for pause
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Pause execution
      await executionEngine.pauseExecution(executionId);
      
      let status = await executionEngine.getExecutionStatus(executionId);
      expect(status.status).toBe('paused');
      
      // Resume execution
      await executionEngine.resumeExecution(executionId);
      
      const result = await waitForExecution(executionId, 30000);
      expect(result.status).toBe('completed');
    });
  });

  describe('Multi-Node Distributed Execution', () => {
    it('should distribute steps across multiple nodes', async () => {
      const flow = testFlows.find(f => f.definition.name === 'distributed-parallel');
      expect(flow).toBeDefined();

      // Ensure multiple nodes are available
      expect(testNodes.filter(n => n.status === 'healthy')).toHaveLength.greaterThan(2);

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { parallelTasks: 5 },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      const result = await waitForExecution(executionId, 45000);
      
      expect(result.status).toBe('completed');
      expect(result.distributedExecution).toBe(true);
      
      // Verify steps were distributed across nodes
      const usedNodes = new Set(result.steps.map(s => s.nodeId));
      expect(usedNodes.size).toBeGreaterThan(1);
      
      // Verify parallel execution performance
      const parallelSteps = result.steps.filter(s => s.type === 'parallel-task');
      const maxStepTime = Math.max(...parallelSteps.map(s => s.executionTime));
      const totalSequentialTime = parallelSteps.reduce((sum, s) => sum + s.executionTime, 0);
      
      // Parallel execution should be significantly faster than sequential
      expect(result.executionTime).toBeLessThan(totalSequentialTime * 0.7);
    });

    it('should handle node failures during execution', async () => {
      const flow = testFlows.find(f => f.definition.name === 'fault-tolerant');
      expect(flow).toBeDefined();

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { longRunningTask: true },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate node failure
      const runningSteps = await executionEngine.getRunningSteps(executionId);
      if (runningSteps.length > 0) {
        const nodeToFail = runningSteps[0].nodeId;
        await simulateNodeFailure(nodeToFail);
      }

      const result = await waitForExecution(executionId, 60000);
      
      expect(result.status).toBe('completed');
      expect(result.nodeFailures).toBeGreaterThan(0);
      expect(result.recoveredSteps).toBeGreaterThan(0);
      
      // Verify failover occurred
      const failedSteps = result.steps.filter(s => s.status === 'failed');
      const recoveredSteps = result.steps.filter(s => s.status === 'completed' && s.retryCount > 0);
      expect(recoveredSteps.length).toBeGreaterThan(0);
    });

    it('should maintain execution consistency across nodes', async () => {
      const flow = testFlows.find(f => f.definition.name === 'consistency-test');
      expect(flow).toBeDefined();

      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { sharedState: { counter: 0 } },
        context: { userId: 'test-user', dao: 'test-dao' }
      });

      const result = await waitForExecution(executionId, 45000);
      
      expect(result.status).toBe('completed');
      
      // Verify state consistency
      expect(result.finalState.counter).toBe(flow!.definition.steps.length);
      expect(result.stateConflicts).toBe(0);
      
      // Verify execution ledger integrity
      const ledgerEntries = await executionEngine.getExecutionLedger(executionId);
      expect(ledgerEntries).toHaveLength.greaterThan(0);
      
      // Verify hash chain integrity
      for (let i = 1; i < ledgerEntries.length; i++) {
        expect(ledgerEntries[i].prevHash).toBe(ledgerEntries[i - 1].hash);
      }
    });
  });

  describe('Load Balancing and Scaling', () => {
    it('should balance load across available nodes', async () => {
      // Create multiple concurrent executions
      const concurrentFlows = 10;
      const executionPromises: Promise<any>[] = [];

      for (let i = 0; i < concurrentFlows; i++) {
        const flow = testFlows.find(f => f.definition.name === 'load-test');
        const executionId = await executionEngine.startExecution(flow!.flowId, {
          input: { taskId: i },
          context: { userId: `test-user-${i}`, dao: 'test-dao' }
        });
        
        executionPromises.push(waitForExecution(executionId, 30000));
      }

      const results = await Promise.all(executionPromises);
      
      // Verify all executions completed
      for (const result of results) {
        expect(result.status).toBe('completed');
      }

      // Verify load distribution
      const nodeUsage = new Map<string, number>();
      for (const result of results) {
        for (const step of result.steps) {
          nodeUsage.set(step.nodeId, (nodeUsage.get(step.nodeId) || 0) + 1);
        }
      }

      // Load should be reasonably distributed
      const usageValues = Array.from(nodeUsage.values());
      const maxUsage = Math.max(...usageValues);
      const minUsage = Math.min(...usageValues);
      const loadImbalance = (maxUsage - minUsage) / maxUsage;
      
      expect(loadImbalance).toBeLessThan(0.5); // Less than 50% imbalance
    });

    it('should trigger auto-scaling under high load', async () => {
      // Monitor initial node count
      const initialNodeCount = testNodes.filter(n => n.status === 'healthy').length;

      // Generate high load
      const highLoadFlows = 20;
      const executionPromises: Promise<any>[] = [];

      for (let i = 0; i < highLoadFlows; i++) {
        const flow = testFlows.find(f => f.definition.name === 'cpu-intensive');
        const executionId = await executionEngine.startExecution(flow!.flowId, {
          input: { intensity: 'high' },
          context: { userId: `load-user-${i}`, dao: 'test-dao' }
        });
        
        executionPromises.push(waitForExecution(executionId, 60000));
      }

      // Wait for auto-scaling to trigger
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check if scaling occurred
      const scalingStats = autoScalingManager.getScalingStatus();
      expect(scalingStats.activeActions).toBeGreaterThan(0);

      // Wait for executions to complete
      const results = await Promise.all(executionPromises);
      
      // Verify executions completed despite high load
      const successfulExecutions = results.filter(r => r.status === 'completed');
      expect(successfulExecutions.length).toBeGreaterThan(highLoadFlows * 0.8); // At least 80% success
    });
  });

  describe('Performance and Optimization', () => {
    it('should optimize execution based on patterns', async () => {
      // Execute same flow multiple times to establish pattern
      const flow = testFlows.find(f => f.definition.name === 'optimization-test');
      const iterations = 5;
      const executionTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const executionId = await executionEngine.startExecution(flow!.flowId, {
          input: { iteration: i },
          context: { userId: 'optimization-user', dao: 'test-dao' }
        });

        const result = await waitForExecution(executionId, 30000);
        expect(result.status).toBe('completed');
        executionTimes.push(result.executionTime);

        // Small delay between executions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Later executions should be faster due to optimization
      const firstHalf = executionTimes.slice(0, Math.floor(iterations / 2));
      const secondHalf = executionTimes.slice(Math.floor(iterations / 2));
      
      const avgFirstHalf = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      // Should see improvement (allowing for some variance)
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.1);
    });

    it('should utilize validation cache effectively', async () => {
      const flow = testFlows.find(f => f.definition.name === 'validation-heavy');
      
      // First execution - cold cache
      const executionId1 = await executionEngine.startExecution(flow!.flowId, {
        input: { cacheTest: true },
        context: { userId: 'cache-user', dao: 'test-dao' }
      });

      const result1 = await waitForExecution(executionId1, 30000);
      expect(result1.status).toBe('completed');
      
      // Second execution - warm cache
      const executionId2 = await executionEngine.startExecution(flow!.flowId, {
        input: { cacheTest: true },
        context: { userId: 'cache-user', dao: 'test-dao' }
      });

      const result2 = await waitForExecution(executionId2, 30000);
      expect(result2.status).toBe('completed');
      
      // Second execution should be faster due to cache
      expect(result2.validationTime).toBeLessThan(result1.validationTime * 0.8);
      expect(result2.cacheHitRate).toBeGreaterThan(0.5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from network partitions', async () => {
      const flow = testFlows.find(f => f.definition.name === 'network-resilient');
      
      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { networkTest: true },
        context: { userId: 'network-user', dao: 'test-dao' }
      });

      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate network partition
      await simulateNetworkPartition();
      
      // Wait for partition recovery
      await new Promise(resolve => setTimeout(resolve, 5000));
      await recoverNetworkPartition();

      const result = await waitForExecution(executionId, 60000);
      
      expect(result.status).toBe('completed');
      expect(result.networkPartitions).toBeGreaterThan(0);
      expect(result.partitionRecoveries).toBeGreaterThan(0);
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Simulate resource exhaustion
      await simulateResourceExhaustion();

      const flow = testFlows.find(f => f.definition.name === 'resource-aware');
      
      const executionId = await executionEngine.startExecution(flow!.flowId, {
        input: { resourceTest: true },
        context: { userId: 'resource-user', dao: 'test-dao' }
      });

      const result = await waitForExecution(executionId, 45000);
      
      // Should either complete or fail gracefully
      expect(['completed', 'failed']).toContain(result.status);
      
      if (result.status === 'failed') {
        expect(result.error).toContain('resource');
        expect(result.gracefulFailure).toBe(true);
      }

      // Restore resources
      await restoreResources();
    });
  });

  // Helper functions

  async function setupTestNodes(): Promise<TestNode[]> {
    const nodes: TestNode[] = [
      {
        nodeId: 'test-node-1',
        capabilities: ['wasm-execution', 'validation', 'storage'],
        status: 'healthy',
        load: 10
      },
      {
        nodeId: 'test-node-2',
        capabilities: ['wasm-execution', 'validation', 'compute'],
        status: 'healthy',
        load: 15
      },
      {
        nodeId: 'test-node-3',
        capabilities: ['wasm-execution', 'storage', 'network'],
        status: 'healthy',
        load: 20
      },
      {
        nodeId: 'test-node-4',
        capabilities: ['validation', 'compute', 'storage'],
        status: 'healthy',
        load: 5
      }
    ];

    // Register nodes with load balancer
    for (const node of nodes) {
      await intelligentLoadBalancer.updateNodeLoad(node.nodeId, {
        nodeId: node.nodeId,
        cpuUtilization: node.load,
        memoryUtilization: node.load + 5,
        networkUtilization: node.load - 5,
        diskUtilization: node.load + 10,
        activeConnections: Math.floor(node.load / 5),
        queuedTasks: 0,
        averageResponseTime: 100 + node.load * 2,
        throughput: Math.max(1, 10 - node.load / 10),
        errorRate: 0,
        lastUpdated: new Date().toISOString()
      });
    }

    return nodes;
  }

  function createTestFlows(): TestFlow[] {
    return [
      {
        flowId: 'flow-simple-sequential',
        definition: {
          name: 'simple-sequential',
          version: '1.0.0',
          steps: [
            { id: 'step1', type: 'transform', config: { operation: 'uppercase' } },
            { id: 'step2', type: 'validate', config: { schema: 'string' } },
            { id: 'step3', type: 'output', config: { format: 'json' } }
          ]
        },
        metadata: { owner: 'test-user', dao: 'test-dao', priority: 'normal' }
      },
      {
        flowId: 'flow-failure-handling',
        definition: {
          name: 'failure-handling',
          version: '1.0.0',
          steps: [
            { id: 'step1', type: 'transform', config: { operation: 'process' } },
            { id: 'step2', type: 'fail-if', config: { condition: 'shouldFail' } },
            { id: 'step3', type: 'cleanup', config: { onFailure: true } }
          ]
        },
        metadata: { owner: 'test-user', dao: 'test-dao', priority: 'normal' }
      },
      {
        flowId: 'flow-distributed-parallel',
        definition: {
          name: 'distributed-parallel',
          version: '1.0.0',
          steps: [
            { id: 'step1', type: 'split', config: { parallelTasks: 5 } },
            { id: 'step2', type: 'parallel-task', config: { duration: 2000 } },
            { id: 'step3', type: 'parallel-task', config: { duration: 1500 } },
            { id: 'step4', type: 'parallel-task', config: { duration: 1800 } },
            { id: 'step5', type: 'parallel-task', config: { duration: 2200 } },
            { id: 'step6', type: 'parallel-task', config: { duration: 1600 } },
            { id: 'step7', type: 'merge', config: { waitForAll: true }, dependencies: ['step2', 'step3', 'step4', 'step5', 'step6'] }
          ]
        },
        metadata: { owner: 'test-user', dao: 'test-dao', priority: 'high' }
      },
      // Add more test flows...
    ];
  }

  async function waitForExecution(executionId: string, timeout: number): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await executionEngine.getExecutionStatus(executionId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Execution ${executionId} timed out after ${timeout}ms`);
  }

  async function simulateNodeFailure(nodeId: string): Promise<void> {
    const node = testNodes.find(n => n.nodeId === nodeId);
    if (node) {
      node.status = 'offline';
      
      // Notify load balancer of node failure
      await intelligentLoadBalancer.updateNodeLoad(nodeId, {
        nodeId,
        cpuUtilization: 0,
        memoryUtilization: 0,
        networkUtilization: 0,
        diskUtilization: 0,
        activeConnections: 0,
        queuedTasks: 0,
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 100,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  async function simulateNetworkPartition(): Promise<void> {
    // Simulate network partition by marking some nodes as unreachable
    const partitionedNodes = testNodes.slice(0, 2);
    for (const node of partitionedNodes) {
      node.status = 'unhealthy';
    }
  }

  async function recoverNetworkPartition(): Promise<void> {
    // Recover from network partition
    for (const node of testNodes) {
      if (node.status === 'unhealthy') {
        node.status = 'healthy';
      }
    }
  }

  async function simulateResourceExhaustion(): Promise<void> {
    // Simulate high resource usage on all nodes
    for (const node of testNodes) {
      node.load = 95;
      await intelligentLoadBalancer.updateNodeLoad(node.nodeId, {
        nodeId: node.nodeId,
        cpuUtilization: 95,
        memoryUtilization: 90,
        networkUtilization: 85,
        diskUtilization: 80,
        activeConnections: 100,
        queuedTasks: 50,
        averageResponseTime: 2000,
        throughput: 1,
        errorRate: 10,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  async function restoreResources(): Promise<void> {
    // Restore normal resource levels
    for (const node of testNodes) {
      node.load = Math.random() * 30;
      await intelligentLoadBalancer.updateNodeLoad(node.nodeId, {
        nodeId: node.nodeId,
        cpuUtilization: node.load,
        memoryUtilization: node.load + 5,
        networkUtilization: node.load - 5,
        diskUtilization: node.load + 10,
        activeConnections: Math.floor(node.load / 5),
        queuedTasks: 0,
        averageResponseTime: 100 + node.load * 2,
        throughput: Math.max(1, 10 - node.load / 10),
        errorRate: 0,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  async function cleanupRunningExecutions(): Promise<void> {
    // Cleanup any running executions
    const runningExecutions = await executionEngine.getRunningExecutions();
    for (const execution of runningExecutions) {
      try {
        await executionEngine.abortExecution(execution.executionId);
      } catch (error) {
        console.warn(`Failed to cleanup execution ${execution.executionId}:`, error);
      }
    }
  }
});