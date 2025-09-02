/**
 * Qflow Execution Engine
 * 
 * Core execution engine for sequential flow processing
 * Handles flow execution lifecycle and state management
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  FlowDefinition, 
  ExecutionState, 
  ExecutionContext, 
  ExecutionError, 
  ErrorType,
  FlowStep 
} from '../models/FlowDefinition.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { executionLedger } from './ExecutionLedger.js';
import { universalValidationPipeline } from '../validation/UniversalValidationPipeline.js';
import { daoSubnetService, DAOExecutionContext } from '../governance/DAOSubnetService.js';
import { ExecutionOptimizationService } from '../optimization/ExecutionOptimizationService.js';
import { LazyLoadingManager } from '../optimization/LazyLoadingManager.js';
import { ResourcePoolManager } from '../optimization/ResourcePoolManager.js';
import { ParallelExecutionEngine } from '../optimization/ParallelExecutionEngine.js';
import { resourceBillingService } from '../billing/ResourceBillingService.js';

export type ExecutionId = string;

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: ExecutionError;
  duration: number;
}

export interface StepExecutionResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: ExecutionError;
  duration: number;
  nextStep?: string;
}

/**
 * Execution Engine
 * Manages flow execution lifecycle with sequential step processing
 */
export class ExecutionEngine {
  private executions = new Map<ExecutionId, ExecutionState>();
  private flowDefinitions = new Map<string, FlowDefinition>();
  
  // Optimization services
  private optimizationService: ExecutionOptimizationService;
  private lazyLoadingManager: LazyLoadingManager;
  private resourcePoolManager: ResourcePoolManager;
  private parallelExecutionEngine: ParallelExecutionEngine;
  private optimizationEnabled: boolean;

  constructor(optimizationEnabled: boolean = true) {
    this.optimizationEnabled = optimizationEnabled;
    
    if (this.optimizationEnabled) {
      // Initialize optimization services
      this.resourcePoolManager = new ResourcePoolManager();
      
      this.lazyLoadingManager = new LazyLoadingManager({
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        preloadThreshold: 3,
        compressionEnabled: false,
        persistentCache: false,
        loadTimeout: 30000
      });
      
      this.optimizationService = new ExecutionOptimizationService({
        maxParallelSteps: 5,
        lazyLoadingEnabled: true,
        resourcePoolSize: 10,
        connectionPoolSize: 15,
        preloadThreshold: 3,
        optimizationLevel: 'balanced'
      });
      
      this.parallelExecutionEngine = new ParallelExecutionEngine({
        maxConcurrentSteps: 5,
        timeoutMs: 300000,
        retryAttempts: 2,
        failureStrategy: 'continue-on-error',
        resourceAllocation: 'balanced'
      }, this.resourcePoolManager);
      
      this.setupOptimizationEventHandlers();
    }
  }

  /**
   * Register a flow definition for execution
   */
  registerFlow(flow: FlowDefinition): void {
    this.flowDefinitions.set(flow.id, flow);
    console.log(`[ExecutionEngine] Registered flow: ${flow.id} v${flow.version}`);
  }

  /**
   * Start flow execution
   */
  async startExecution(flowId: string, context: ExecutionContext): Promise<ExecutionId> {
    const flow = this.flowDefinitions.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const executionId = uuidv4();
    const now = new Date().toISOString();

    // Enhanced context for DAO execution
    const daoContext: DAOExecutionContext = {
      ...context,
      daoSubnet: context.daoSubnet || flow.metadata?.daoSubnet || 'dao.public.default',
      isolationLevel: 'standard',
      resourceAllocation: {
        cpu: 1,
        memory: 128,
        storage: 10,
        network: 1
      },
      governanceApprovals: [],
      policyValidations: []
    };

    // Validate DAO policies before execution
    if (daoContext.daoSubnet) {
      const policyValidations = await daoSubnetService.validateDAOExecution(flowId, daoContext);
      daoContext.policyValidations = policyValidations;

      // Check for policy failures
      const policyFailures = policyValidations.filter(v => v.result === 'fail');
      if (policyFailures.length > 0) {
        throw new Error(`DAO policy validation failed: ${policyFailures.map(f => f.message).join(', ')}`);
      }

      // Check billing limits before allocation
      const billingCheck = await resourceBillingService.canAllocateResources(
        daoContext.daoSubnet,
        {
          cpu: daoContext.resourceAllocation.cpu * 3600, // Convert to seconds
          memory: daoContext.resourceAllocation.memory,
          storage: daoContext.resourceAllocation.storage,
          executions: 1
        }
      );

      if (!billingCheck.allowed) {
        throw new Error(`Billing limit exceeded: ${billingCheck.reason}`);
      }

      // Allocate resources
      const resourceAllocation = await daoSubnetService.allocateResources(
        daoContext.daoSubnet,
        daoContext.resourceAllocation
      );

      if (!resourceAllocation.allocated) {
        throw new Error(`Resource allocation failed: ${resourceAllocation.reason}`);
      }

      daoContext.resourceAllocation = resourceAllocation.allocation || daoContext.resourceAllocation;
    }

    // Create initial execution state
    const executionState: ExecutionState = {
      executionId,
      flowId,
      status: 'pending',
      currentStep: flow.steps[0]?.id || '',
      completedSteps: [],
      failedSteps: [],
      context: daoContext,
      startTime: now,
      checkpoints: [],
      nodeAssignments: {}
    };

    this.executions.set(executionId, executionState);

    // Emit execution started event
    qflowEventEmitter.emit('q.qflow.exec.started.v1', {
      executionId,
      flowId,
      triggeredBy: daoContext.triggeredBy,
      triggerType: daoContext.triggerType,
      daoSubnet: daoContext.daoSubnet,
      resourceAllocation: daoContext.resourceAllocation,
      timestamp: now
    });

    console.log(`[ExecutionEngine] Started execution: ${executionId} for flow: ${flowId} in DAO subnet: ${daoContext.daoSubnet}`);

    // Start execution asynchronously
    this.executeFlow(executionId).catch(error => {
      console.error(`[ExecutionEngine] Execution failed: ${executionId}`, error);
      this.handleExecutionError(executionId, error);
    });

    return executionId;
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: ExecutionId): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'running') {
      throw new Error(`Cannot pause execution in status: ${execution.status}`);
    }

    execution.status = 'paused';
    
    qflowEventEmitter.emit('q.qflow.exec.paused.v1', {
      executionId,
      flowId: execution.flowId,
      currentStep: execution.currentStep,
      timestamp: new Date().toISOString()
    });

    console.log(`[ExecutionEngine] Paused execution: ${executionId}`);
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: ExecutionId): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume execution in status: ${execution.status}`);
    }

    execution.status = 'running';
    
    qflowEventEmitter.emit('q.qflow.exec.resumed.v1', {
      executionId,
      flowId: execution.flowId,
      currentStep: execution.currentStep,
      timestamp: new Date().toISOString()
    });

    console.log(`[ExecutionEngine] Resumed execution: ${executionId}`);

    // Continue execution
    this.executeFlow(executionId).catch(error => {
      console.error(`[ExecutionEngine] Execution failed after resume: ${executionId}`, error);
      this.handleExecutionError(executionId, error);
    });
  }

  /**
   * Abort execution
   */
  async abortExecution(executionId: ExecutionId): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (['completed', 'failed', 'aborted'].includes(execution.status)) {
      throw new Error(`Cannot abort execution in status: ${execution.status}`);
    }

    execution.status = 'aborted';
    execution.endTime = new Date().toISOString();
    
    qflowEventEmitter.emit('q.qflow.exec.aborted.v1', {
      executionId,
      flowId: execution.flowId,
      currentStep: execution.currentStep,
      timestamp: execution.endTime
    });

    console.log(`[ExecutionEngine] Aborted execution: ${executionId}`);
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: ExecutionId): Promise<ExecutionState | null> {
    return this.executions.get(executionId) || null;
  }

  /**
   * Execute flow steps sequentially
   */
  private async executeFlow(executionId: ExecutionId): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    const flow = this.flowDefinitions.get(execution.flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${execution.flowId}`);
    }

    execution.status = 'running';

    try {
      let currentStepId = execution.currentStep;
      
      while (currentStepId && execution.status === 'running') {
        const step = flow.steps.find(s => s.id === currentStepId);
        if (!step) {
          throw new Error(`Step not found: ${currentStepId}`);
        }

        console.log(`[ExecutionEngine] Executing step: ${currentStepId}`);

        // Execute step
        const stepResult = await this.executeStep(executionId, step, execution.context);
        
        if (stepResult.success) {
          execution.completedSteps.push(currentStepId);
          currentStepId = stepResult.nextStep || step.onSuccess || '';
        } else {
          execution.failedSteps.push(currentStepId);
          
          if (stepResult.error) {
            execution.error = stepResult.error;
          }

          // Handle failure - go to failure step or abort
          currentStepId = step.onFailure || '';
          if (!currentStepId) {
            execution.status = 'failed';
            break;
          }
        }

        execution.currentStep = currentStepId;
      }

      // Complete execution if no more steps
      if (!currentStepId && execution.status === 'running') {
        execution.status = 'completed';
        execution.endTime = new Date().toISOString();
        
        // Release DAO resources
        this.releaseDAOResources(execution);
        
        qflowEventEmitter.emit('q.qflow.exec.completed.v1', {
          executionId,
          flowId: execution.flowId,
          duration: Date.parse(execution.endTime) - Date.parse(execution.startTime),
          completedSteps: execution.completedSteps.length,
          timestamp: execution.endTime
        });

        console.log(`[ExecutionEngine] Completed execution: ${executionId}`);
      }

    } catch (error) {
      this.handleExecutionError(executionId, error);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(executionId: ExecutionId, step: FlowStep, context: ExecutionContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate step through universal pipeline
      const validationResult = await universalValidationPipeline.validate({
        data: { action: step.action, params: step.params },
        context: {
          requestId: `${executionId}-${step.id}`,
          timestamp: new Date().toISOString(),
          source: 'qflow-execution-engine',
          metadata: { 
            actor: context.triggeredBy, 
            stepId: step.id,
            daoSubnet: context.daoSubnet,
            permissions: context.permissions
          }
        },
        layers: ['schema', 'business', 'security'] // Use default layers
      });

      if (validationResult.overallStatus === 'failed') {
        const failedResults = validationResult.results.filter(r => r.status === 'failed');
        throw new Error(`Step validation failed: ${failedResults.map(r => r.message).join(', ')}`);
      }

      // Emit step started event
      qflowEventEmitter.emit('q.qflow.exec.step.started.v1', {
        executionId,
        stepId: step.id,
        stepType: step.type,
        action: step.action,
        validationResult,
        timestamp: new Date().toISOString()
      });

      // Create ledger record for step execution
      const payloadCID = `QmStep${step.id}${Date.now()}`; // Simplified CID for prototype
      const ledgerRecord = await executionLedger.appendRecord({
        execId: executionId,
        stepId: step.id,
        payloadCID,
        actor: context.triggeredBy, // Use actual actor from context
        nodeId: 'local-node-1', // In production, this would be the actual node ID
        timestamp: new Date().toISOString()
      });

      // Execute step based on type
      let result: any;
      
      switch (step.type) {
        case 'task':
          result = await this.executeTask(step);
          break;
        case 'condition':
          result = await this.executeCondition(step);
          break;
        case 'parallel':
          result = await this.executeParallel(step);
          break;
        case 'event-trigger':
          result = await this.executeEventTrigger(step);
          break;
        case 'module-call':
          result = await this.executeModuleCall(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const duration = Date.now() - startTime;

      // Validate ledger integrity for this execution
      const ledgerValidation = await executionLedger.validateLedger(executionId);
      if (!ledgerValidation.isValid) {
        console.warn(`[ExecutionEngine] Ledger validation warnings for ${executionId}:`, ledgerValidation.warnings);
      }

      // Emit step completed event with Qerberos stamp
      qflowEventEmitter.emit('q.qflow.exec.step.completed.v1', {
        executionId,
        stepId: step.id,
        success: true,
        duration,
        ledgerRecord: ledgerRecord.recordHash,
        qerberosStamp: {
          recordHash: ledgerRecord.recordHash,
          validated: true,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      return {
        stepId: step.id,
        success: true,
        result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      const executionError: ExecutionError = {
        type: ErrorType.EXECUTION_ERROR,
        message: error instanceof Error ? error.message : 'Step execution failed',
        stepId: step.id,
        retryable: true,
        details: { error: String(error) },
        timestamp: new Date().toISOString()
      };

      // Emit step failed event
      qflowEventEmitter.emit('q.qflow.exec.step.failed.v1', {
        executionId,
        stepId: step.id,
        error: executionError,
        duration,
        timestamp: new Date().toISOString()
      });

      return {
        stepId: step.id,
        success: false,
        error: executionError,
        duration
      };
    }
  }

  /**
   * Execute task step (placeholder implementation)
   */
  private async executeTask(step: FlowStep): Promise<any> {
    // Placeholder implementation - will be enhanced in later tasks
    console.log(`[ExecutionEngine] Executing task: ${step.action}`, step.params);
    
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      action: step.action,
      params: step.params,
      result: 'Task completed successfully'
    };
  }

  /**
   * Execute condition step (placeholder implementation)
   */
  private async executeCondition(step: FlowStep): Promise<any> {
    console.log(`[ExecutionEngine] Evaluating condition: ${step.action}`, step.params);
    
    // Placeholder implementation
    return {
      condition: step.action,
      result: true
    };
  }

  /**
   * Execute parallel step (placeholder implementation)
   */
  private async executeParallel(step: FlowStep): Promise<any> {
    console.log(`[ExecutionEngine] Executing parallel: ${step.action}`, step.params);
    
    // Placeholder implementation
    return {
      parallel: step.action,
      result: 'Parallel execution completed'
    };
  }

  /**
   * Execute event trigger step (placeholder implementation)
   */
  private async executeEventTrigger(step: FlowStep): Promise<any> {
    console.log(`[ExecutionEngine] Triggering event: ${step.action}`, step.params);
    
    // Placeholder implementation
    return {
      event: step.action,
      result: 'Event triggered successfully'
    };
  }

  /**
   * Execute module call step (placeholder implementation)
   */
  private async executeModuleCall(step: FlowStep): Promise<any> {
    console.log(`[ExecutionEngine] Calling module: ${step.action}`, step.params);
    
    // Placeholder implementation
    return {
      module: step.action,
      result: 'Module call completed successfully'
    };
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(executionId: ExecutionId, error: any): void {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return;
    }

    execution.status = 'failed';
    execution.endTime = new Date().toISOString();
    execution.error = {
      type: ErrorType.EXECUTION_ERROR,
      message: error instanceof Error ? error.message : 'Execution failed',
      retryable: false,
      details: { error: String(error) },
      timestamp: execution.endTime
    };

    // Release DAO resources
    this.releaseDAOResources(execution);

    qflowEventEmitter.emit('q.qflow.exec.failed.v1', {
      executionId,
      flowId: execution.flowId,
      error: execution.error,
      timestamp: execution.endTime
    });

    console.error(`[ExecutionEngine] Execution failed: ${executionId}`, error);
  }

  /**
   * Get all executions (for monitoring)
   */
  getAllExecutions(): ExecutionState[] {
    return Array.from(this.executions.values());
  }

  /**
   * Clean up completed executions (basic cleanup)
   */
  cleanupExecutions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: ExecutionId[] = [];

    for (const [executionId, execution] of this.executions) {
      if (execution.endTime) {
        const age = now - Date.parse(execution.endTime);
        if (age > maxAge) {
          toDelete.push(executionId);
        }
      }
    }

    for (const executionId of toDelete) {
      this.executions.delete(executionId);
    }

    if (toDelete.length > 0) {
      console.log(`[ExecutionEngine] Cleaned up ${toDelete.length} old executions`);
    }
  }

  /**
   * Release DAO resources for execution
   */
  private async releaseDAOResources(execution: ExecutionState): Promise<void> {
    try {
      const daoContext = execution.context as DAOExecutionContext;
      if (daoContext.daoSubnet && daoContext.resourceAllocation) {
        // Calculate actual resource usage
        const duration = execution.endTime ? 
          (Date.parse(execution.endTime) - Date.parse(execution.startTime)) / 1000 : 0;

        const resourceUsage = {
          cpuTime: daoContext.resourceAllocation.cpu * duration, // CPU seconds
          memoryUsage: daoContext.resourceAllocation.memory * duration, // MB-seconds
          storageUsed: daoContext.resourceAllocation.storage, // MB
          networkTransfer: daoContext.resourceAllocation.network, // MB
          duration
        };

        // Track usage for billing
        await resourceBillingService.trackExecutionUsage(
          daoContext.daoSubnet,
          execution.executionId,
          resourceUsage
        );

        // Release DAO subnet resources
        await daoSubnetService.releaseResources(
          daoContext.daoSubnet,
          daoContext.resourceAllocation
        );

        console.log(`[ExecutionEngine] Released DAO resources and tracked usage for execution: ${execution.executionId}`);
      }
    } catch (error) {
      console.error(`[ExecutionEngine] Failed to release DAO resources: ${error}`);
    }
  }

  /**
   * Setup optimization event handlers
   */
  private setupOptimizationEventHandlers(): void {
    if (!this.optimizationEnabled) return;

    // Handle optimization events
    this.optimizationService.on('parallel_execution_completed', (data) => {
      qflowEventEmitter.emit('q.qflow.optimization.parallel.completed.v1', data);
    });

    this.lazyLoadingManager.on('component_loaded', (data) => {
      qflowEventEmitter.emit('q.qflow.optimization.lazy.loaded.v1', data);
    });

    this.parallelExecutionEngine.on('group_completed', (data) => {
      qflowEventEmitter.emit('q.qflow.optimization.group.completed.v1', data);
    });
  }

  /**
   * Get optimization metrics
   */
  public getOptimizationMetrics(): any {
    if (!this.optimizationEnabled) {
      return { optimizationEnabled: false };
    }

    return {
      optimizationEnabled: true,
      executionOptimization: this.optimizationService.getMetrics(),
      lazyLoading: this.lazyLoadingManager.getCacheStats(),
      resourcePools: this.resourcePoolManager.getAllStats(),
      parallelExecution: {
        activeExecutions: this.parallelExecutionEngine['activeExecutions']?.size || 0
      }
    };
  }

  /**
   * Optimize a flow for better performance
   */
  public async optimizeFlow(flow: FlowDefinition): Promise<FlowDefinition> {
    if (!this.optimizationEnabled) {
      return flow;
    }

    try {
      const optimizedFlow = await this.optimizationService.optimizeFlow(flow);
      
      // Register lazy loadable components
      for (const step of optimizedFlow.steps) {
        if (step.lazyLoad) {
          this.lazyLoadingManager.registerComponent(
            `step_${step.id}`,
            async () => {
              // Simulate loading step component
              return { stepId: step.id, loaded: true };
            },
            {
              type: 'step',
              size: step.params?.size || 1024,
              priority: 7,
              dependencies: []
            }
          );
        }
      }

      qflowEventEmitter.emit('q.qflow.optimization.flow.optimized.v1', {
        flowId: flow.id,
        originalSteps: flow.steps.length,
        optimizedSteps: optimizedFlow.steps.length,
        optimizationsApplied: ['parallel_execution', 'lazy_loading', 'resource_pooling']
      });

      return optimizedFlow;
    } catch (error) {
      console.error(`[ExecutionEngine] Flow optimization failed: ${error.message}`);
      return flow; // Return original flow if optimization fails
    }
  }

  /**
   * Execute steps with optimization
   */
  private async executeStepsOptimized(
    steps: FlowStep[],
    context: ExecutionContext,
    executionId: string
  ): Promise<Map<string, any>> {
    if (!this.optimizationEnabled) {
      // Fall back to sequential execution
      const results = new Map<string, any>();
      for (const step of steps) {
        const result = await this.executeStep(step, context, executionId);
        results.set(step.id, result);
      }
      return results;
    }

    try {
      // Analyze for parallel execution
      const executionPlan = this.parallelExecutionEngine.analyzeSteps(steps);
      
      if (executionPlan.parallelizationRatio > 0.3) {
        // Use parallel execution if significant parallelization is possible
        const result = await this.parallelExecutionEngine.executeParallel(steps, context);
        return result.results;
      } else {
        // Use optimized sequential execution with resource pooling
        const results = new Map<string, any>();
        
        for (const step of steps) {
          // Preload components if needed
          if (step.lazyLoad) {
            await this.lazyLoadingManager.loadComponent(`step_${step.id}`);
          }
          
          const result = await this.executeStep(step, context, executionId);
          results.set(step.id, result);
        }
        
        return results;
      }
    } catch (error) {
      console.error(`[ExecutionEngine] Optimized execution failed: ${error.message}`);
      
      // Fall back to sequential execution
      const results = new Map<string, any>();
      for (const step of steps) {
        const result = await this.executeStep(step, context, executionId);
        results.set(step.id, result);
      }
      return results;
    }
  }

  /**
   * Get optimization recommendations for a flow
   */
  public getOptimizationRecommendations(flowId: string): string[] {
    if (!this.optimizationEnabled) {
      return ['Enable optimization to get recommendations'];
    }

    const flow = this.flowDefinitions.get(flowId);
    if (!flow) {
      return ['Flow not found'];
    }

    return this.optimizationService.getOptimizationRecommendations(flow);
  }

  /**
   * Cleanup optimization resources
   */
  public async cleanup(): Promise<void> {
    if (this.optimizationEnabled) {
      await this.optimizationService.cleanup();
      await this.resourcePoolManager.cleanup();
      this.lazyLoadingManager.clearCache();
    }
  }
}

// Export singleton instance
export const executionEngine = new ExecutionEngine();