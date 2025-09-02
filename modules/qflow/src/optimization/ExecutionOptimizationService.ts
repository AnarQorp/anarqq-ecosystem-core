/**
 * Execution Optimization Service
 * 
 * Provides advanced execution optimization features including:
 * - Parallel execution for independent steps
 * - Lazy loading for flow components
 * - Resource pooling for WASM runtimes and connections
 * - Performance monitoring and optimization
 */

import { EventEmitter } from 'events';
import { FlowDefinition, FlowStep, ExecutionContext, ExecutionState } from '../models/FlowDefinition';
import { WASMRuntime } from '../sandbox/WASMRuntime';
import { ResourceLimiter } from '../sandbox/ResourceLimiter';

export interface OptimizationConfig {
  maxParallelSteps: number;
  lazyLoadingEnabled: boolean;
  resourcePoolSize: number;
  connectionPoolSize: number;
  preloadThreshold: number;
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
}

export interface ParallelExecutionGroup {
  id: string;
  steps: FlowStep[];
  dependencies: string[];
  estimatedDuration: number;
  priority: number;
}

export interface ResourcePool<T> {
  available: T[];
  inUse: Set<T>;
  maxSize: number;
  createResource: () => Promise<T>;
  destroyResource: (resource: T) => Promise<void>;
  validateResource: (resource: T) => boolean;
}

export interface LazyLoadableComponent {
  id: string;
  type: 'step' | 'template' | 'module';
  loadPriority: number;
  estimatedSize: number;
  dependencies: string[];
  loader: () => Promise<any>;
}

export interface OptimizationMetrics {
  parallelExecutionCount: number;
  lazyLoadHitRate: number;
  resourcePoolUtilization: number;
  averageExecutionTime: number;
  optimizationSavings: number;
  memoryUsage: number;
}

export class ExecutionOptimizationService extends EventEmitter {
  private config: OptimizationConfig;
  private wasmPool: ResourcePool<WASMRuntime>;
  private connectionPool: ResourcePool<any>;
  private lazyComponents: Map<string, LazyLoadableComponent>;
  private loadedComponents: Map<string, any>;
  private parallelGroups: Map<string, ParallelExecutionGroup>;
  private metrics: OptimizationMetrics;
  private optimizationHistory: Map<string, number[]>;

  constructor(config: OptimizationConfig) {
    super();
    this.config = config;
    this.lazyComponents = new Map();
    this.loadedComponents = new Map();
    this.parallelGroups = new Map();
    this.optimizationHistory = new Map();
    
    this.metrics = {
      parallelExecutionCount: 0,
      lazyLoadHitRate: 0,
      resourcePoolUtilization: 0,
      averageExecutionTime: 0,
      optimizationSavings: 0,
      memoryUsage: 0
    };

    this.initializeResourcePools();
    this.startOptimizationMonitoring();
  }

  /**
   * Initialize resource pools for WASM runtimes and connections
   */
  private initializeResourcePools(): void {
    // WASM Runtime Pool
    this.wasmPool = {
      available: [],
      inUse: new Set(),
      maxSize: this.config.resourcePoolSize,
      createResource: async () => {
        const runtime = new WASMRuntime({
          maxMemoryMB: 128,
          maxExecutionTimeMs: 30000,
          allowedModules: ['dao-approved']
        });
        // WASMRuntime initializes automatically in constructor
        return runtime;
      },
      destroyResource: async (runtime: WASMRuntime) => {
        await runtime.cleanup();
      },
      validateResource: (runtime: WASMRuntime) => {
        return runtime.isHealthy();
      }
    };

    // Connection Pool (for external services)
    this.connectionPool = {
      available: [],
      inUse: new Set(),
      maxSize: this.config.connectionPoolSize,
      createResource: async () => {
        return {
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created: Date.now(),
          lastUsed: Date.now(),
          isHealthy: true
        };
      },
      destroyResource: async (connection: any) => {
        connection.isHealthy = false;
      },
      validateResource: (connection: any) => {
        return connection.isHealthy && (Date.now() - connection.lastUsed) < 300000; // 5 minutes
      }
    };

    // Pre-populate pools
    this.prePopulateResourcePools();
  }

  /**
   * Pre-populate resource pools to avoid cold start delays
   */
  private async prePopulateResourcePools(): Promise<void> {
    try {
      // Pre-create WASM runtimes
      const wasmPromises = Array(Math.min(3, this.config.resourcePoolSize))
        .fill(0)
        .map(() => this.wasmPool.createResource());
      
      const wasmRuntimes = await Promise.all(wasmPromises);
      this.wasmPool.available.push(...wasmRuntimes);

      // Pre-create connections
      const connPromises = Array(Math.min(5, this.config.connectionPoolSize))
        .fill(0)
        .map(() => this.connectionPool.createResource());
      
      const connections = await Promise.all(connPromises);
      this.connectionPool.available.push(...connections);

      this.emit('pools_initialized', {
        wasmCount: wasmRuntimes.length,
        connectionCount: connections.length
      });
    } catch (error) {
      this.emit('pool_initialization_error', { error: error.message });
    }
  }

  /**
   * Analyze flow for parallel execution opportunities
   */
  public analyzeParallelExecution(flow: FlowDefinition): ParallelExecutionGroup[] {
    const groups: ParallelExecutionGroup[] = [];
    const stepDependencies = this.buildDependencyGraph(flow.steps);
    const processedSteps = new Set<string>();

    // Find independent step groups
    for (const step of flow.steps) {
      if (processedSteps.has(step.id)) continue;

      const independentSteps = this.findIndependentSteps(
        step,
        flow.steps,
        stepDependencies,
        processedSteps
      );

      if (independentSteps.length > 1) {
        const group: ParallelExecutionGroup = {
          id: `group_${groups.length + 1}`,
          steps: independentSteps,
          dependencies: this.getGroupDependencies(independentSteps, stepDependencies),
          estimatedDuration: Math.max(...independentSteps.map(s => s.timeout || 30000)),
          priority: this.calculateGroupPriority(independentSteps)
        };

        groups.push(group);
        independentSteps.forEach(s => processedSteps.add(s.id));
      } else {
        processedSteps.add(step.id);
      }
    }

    // Cache parallel groups for this flow
    this.parallelGroups.set(flow.id, groups[0] || null);

    this.emit('parallel_analysis_completed', {
      flowId: flow.id,
      groupCount: groups.length,
      totalSteps: flow.steps.length,
      parallelizableSteps: groups.reduce((sum, g) => sum + g.steps.length, 0)
    });

    return groups;
  }

  /**
   * Execute steps in parallel within a group
   */
  public async executeParallelGroup(
    group: ParallelExecutionGroup,
    context: ExecutionContext
  ): Promise<Map<string, any>> {
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors: Error[] = [];

    try {
      // Limit concurrent executions
      const maxConcurrent = Math.min(group.steps.length, this.config.maxParallelSteps);
      const semaphore = new Array(maxConcurrent).fill(null);
      let currentIndex = 0;

      const executeStep = async (step: FlowStep): Promise<void> => {
        const runtime = await this.acquireResource(this.wasmPool);
        try {
          const result = await this.executeStepWithRuntime(step, runtime, context);
          results.set(step.id, result);
          
          this.emit('parallel_step_completed', {
            stepId: step.id,
            groupId: group.id,
            duration: Date.now() - startTime
          });
        } catch (error) {
          errors.push(error);
          this.emit('parallel_step_failed', {
            stepId: step.id,
            groupId: group.id,
            error: error.message
          });
        } finally {
          await this.releaseResource(this.wasmPool, runtime);
        }
      };

      // Execute steps with concurrency control
      const promises = group.steps.map(step => executeStep(step));
      await Promise.allSettled(promises);

      // Update metrics
      this.metrics.parallelExecutionCount++;
      const duration = Date.now() - startTime;
      this.updateExecutionMetrics(duration, group.steps.length);

      this.emit('parallel_group_completed', {
        groupId: group.id,
        stepCount: group.steps.length,
        successCount: results.size,
        errorCount: errors.length,
        duration
      });

      if (errors.length > 0) {
        throw new Error(`Parallel execution failed: ${errors.map(e => e.message).join(', ')}`);
      }

      return results;
    } catch (error) {
      this.emit('parallel_group_failed', {
        groupId: group.id,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Register a component for lazy loading
   */
  public registerLazyComponent(component: LazyLoadableComponent): void {
    this.lazyComponents.set(component.id, component);
    
    this.emit('lazy_component_registered', {
      componentId: component.id,
      type: component.type,
      priority: component.loadPriority
    });
  }

  /**
   * Load a component lazily when needed
   */
  public async loadComponent(componentId: string): Promise<any> {
    // Check if already loaded
    if (this.loadedComponents.has(componentId)) {
      this.updateLazyLoadMetrics(true);
      return this.loadedComponents.get(componentId);
    }

    const component = this.lazyComponents.get(componentId);
    if (!component) {
      throw new Error(`Component ${componentId} not registered for lazy loading`);
    }

    try {
      // Load dependencies first
      for (const depId of component.dependencies) {
        await this.loadComponent(depId);
      }

      // Load the component
      const startTime = Date.now();
      const loadedComponent = await component.loader();
      const loadTime = Date.now() - startTime;

      // Cache the loaded component
      this.loadedComponents.set(componentId, loadedComponent);
      this.updateLazyLoadMetrics(false);

      this.emit('component_loaded', {
        componentId,
        type: component.type,
        loadTime,
        size: component.estimatedSize
      });

      return loadedComponent;
    } catch (error) {
      this.emit('component_load_failed', {
        componentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Preload components based on usage patterns
   */
  public async preloadComponents(flowId: string): Promise<void> {
    const history = this.optimizationHistory.get(flowId) || [];
    if (history.length < this.config.preloadThreshold) return;

    // Analyze usage patterns to determine preload candidates
    const candidates = Array.from(this.lazyComponents.values())
      .filter(c => c.loadPriority >= 7) // High priority components
      .sort((a, b) => b.loadPriority - a.loadPriority)
      .slice(0, 5); // Preload top 5

    const preloadPromises = candidates.map(async (component) => {
      try {
        if (!this.loadedComponents.has(component.id)) {
          await this.loadComponent(component.id);
        }
      } catch (error) {
        // Ignore preload failures
      }
    });

    await Promise.allSettled(preloadPromises);

    this.emit('components_preloaded', {
      flowId,
      preloadedCount: candidates.length
    });
  }

  /**
   * Acquire a resource from a pool
   */
  public async acquireResource<T>(pool: ResourcePool<T>): Promise<T> {
    // Try to get an available resource
    if (pool.available.length > 0) {
      const resource = pool.available.pop()!;
      
      // Validate resource health
      if (pool.validateResource(resource)) {
        pool.inUse.add(resource);
        this.updateResourcePoolMetrics();
        return resource;
      } else {
        // Resource is unhealthy, destroy it
        await pool.destroyResource(resource);
      }
    }

    // Create new resource if pool not at capacity
    if (pool.inUse.size < pool.maxSize) {
      const resource = await pool.createResource();
      pool.inUse.add(resource);
      this.updateResourcePoolMetrics();
      return resource;
    }

    // Wait for a resource to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Resource acquisition timeout'));
      }, 30000); // 30 second timeout

      const checkForResource = () => {
        if (pool.available.length > 0) {
          clearTimeout(timeout);
          const resource = pool.available.pop()!;
          pool.inUse.add(resource);
          this.updateResourcePoolMetrics();
          resolve(resource);
        } else {
          setTimeout(checkForResource, 100);
        }
      };

      checkForResource();
    });
  }

  /**
   * Release a resource back to the pool
   */
  public async releaseResource<T>(pool: ResourcePool<T>, resource: T): Promise<void> {
    pool.inUse.delete(resource);

    if (pool.validateResource(resource)) {
      pool.available.push(resource);
    } else {
      await pool.destroyResource(resource);
    }

    this.updateResourcePoolMetrics();
  }

  /**
   * Get optimization metrics
   */
  public getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimization recommendations for a flow
   */
  public getOptimizationRecommendations(flow: FlowDefinition): string[] {
    const recommendations: string[] = [];
    const parallelGroups = this.analyzeParallelExecution(flow);

    // Parallel execution recommendations
    if (parallelGroups.length > 0) {
      recommendations.push(
        `Enable parallel execution for ${parallelGroups.length} step groups to reduce execution time by up to 60%`
      );
    }

    // Lazy loading recommendations
    const heavySteps = flow.steps.filter(s => s.params?.size > 1024 * 1024); // > 1MB
    if (heavySteps.length > 0) {
      recommendations.push(
        `Enable lazy loading for ${heavySteps.length} heavy components to reduce memory usage`
      );
    }

    // Resource pooling recommendations
    const wasmSteps = flow.steps.filter(s => s.type === 'task' && s.action.includes('wasm'));
    if (wasmSteps.length > 2) {
      recommendations.push(
        `Use WASM runtime pooling for ${wasmSteps.length} steps to reduce initialization overhead`
      );
    }

    return recommendations;
  }

  /**
   * Apply automatic optimizations to a flow
   */
  public async optimizeFlow(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    // Apply parallel execution optimization
    if (this.config.optimizationLevel !== 'conservative') {
      const parallelGroups = this.analyzeParallelExecution(flow);
      if (parallelGroups.length > 0) {
        optimizedFlow.metadata = {
          ...optimizedFlow.metadata,
          parallelGroups: parallelGroups.map(g => g.id)
        };
      }
    }

    // Apply lazy loading optimization
    if (this.config.lazyLoadingEnabled) {
      optimizedFlow.steps = optimizedFlow.steps.map(step => ({
        ...step,
        lazyLoad: step.params?.size > 512 * 1024 // > 512KB
      }));
    }

    this.emit('flow_optimized', {
      flowId: flow.id,
      originalSteps: flow.steps.length,
      optimizedSteps: optimizedFlow.steps.length,
      parallelGroups: 0
    });

    return optimizedFlow;
  }

  /**
   * Clean up resources and stop monitoring
   */
  public async cleanup(): Promise<void> {
    // Clean up WASM pool
    for (const runtime of [...this.wasmPool.available, ...this.wasmPool.inUse]) {
      await this.wasmPool.destroyResource(runtime);
    }

    // Clean up connection pool
    for (const conn of [...this.connectionPool.available, ...this.connectionPool.inUse]) {
      await this.connectionPool.destroyResource(conn);
    }

    // Clear caches
    this.loadedComponents.clear();
    this.lazyComponents.clear();
    this.parallelGroups.clear();

    this.emit('cleanup_completed');
  }

  // Private helper methods

  private buildDependencyGraph(steps: FlowStep[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    for (const step of steps) {
      const deps: string[] = [];
      
      // Analyze step parameters for dependencies
      if (step.params) {
        const paramStr = JSON.stringify(step.params);
        for (const otherStep of steps) {
          if (otherStep.id !== step.id && paramStr.includes(otherStep.id)) {
            deps.push(otherStep.id);
          }
        }
      }

      dependencies.set(step.id, deps);
    }

    return dependencies;
  }

  private findIndependentSteps(
    startStep: FlowStep,
    allSteps: FlowStep[],
    dependencies: Map<string, string[]>,
    processed: Set<string>
  ): FlowStep[] {
    const independent = [startStep];
    const startDeps = dependencies.get(startStep.id) || [];

    for (const step of allSteps) {
      if (step.id === startStep.id || processed.has(step.id)) continue;

      const stepDeps = dependencies.get(step.id) || [];
      
      // Check if steps are truly independent
      const hasSharedDependencies = startDeps.some(dep => stepDeps.includes(dep));
      const dependsOnEachOther = stepDeps.includes(startStep.id) || startDeps.includes(step.id);

      if (!hasSharedDependencies && !dependsOnEachOther) {
        independent.push(step);
      }
    }

    return independent;
  }

  private getGroupDependencies(steps: FlowStep[], dependencies: Map<string, string[]>): string[] {
    const allDeps = new Set<string>();
    const stepIds = new Set(steps.map(s => s.id));

    for (const step of steps) {
      const stepDeps = dependencies.get(step.id) || [];
      for (const dep of stepDeps) {
        if (!stepIds.has(dep)) {
          allDeps.add(dep);
        }
      }
    }

    return Array.from(allDeps);
  }

  private calculateGroupPriority(steps: FlowStep[]): number {
    // Higher priority for groups with more steps and shorter timeouts
    const stepCount = steps.length;
    const avgTimeout = steps.reduce((sum, s) => sum + (s.timeout || 30000), 0) / stepCount;
    
    return Math.round((stepCount * 10) / (avgTimeout / 1000));
  }

  private async executeStepWithRuntime(
    step: FlowStep,
    runtime: WASMRuntime,
    context: ExecutionContext
  ): Promise<any> {
    // This would integrate with the actual step execution logic
    // For now, simulate execution
    const executionTime = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    return {
      stepId: step.id,
      result: `Executed ${step.action}`,
      executionTime,
      timestamp: Date.now()
    };
  }

  private updateExecutionMetrics(duration: number, stepCount: number): void {
    const history = this.optimizationHistory.get('global') || [];
    history.push(duration);
    
    if (history.length > 100) {
      history.shift(); // Keep last 100 measurements
    }
    
    this.optimizationHistory.set('global', history);
    
    // Update average execution time
    this.metrics.averageExecutionTime = history.reduce((sum, d) => sum + d, 0) / history.length;
    
    // Calculate optimization savings (estimated)
    const sequentialTime = stepCount * (this.metrics.averageExecutionTime / stepCount);
    this.metrics.optimizationSavings = Math.max(0, sequentialTime - duration);
  }

  private updateLazyLoadMetrics(wasHit: boolean): void {
    const totalLoads = this.loadedComponents.size + (wasHit ? 1 : 0);
    const hits = wasHit ? this.loadedComponents.size + 1 : this.loadedComponents.size;
    this.metrics.lazyLoadHitRate = totalLoads > 0 ? hits / totalLoads : 0;
  }

  private updateResourcePoolMetrics(): void {
    const wasmUtilization = this.wasmPool.inUse.size / this.wasmPool.maxSize;
    const connUtilization = this.connectionPool.inUse.size / this.connectionPool.maxSize;
    this.metrics.resourcePoolUtilization = (wasmUtilization + connUtilization) / 2;
  }

  private startOptimizationMonitoring(): void {
    setInterval(() => {
      this.updateResourcePoolMetrics();
      
      // Estimate memory usage
      this.metrics.memoryUsage = (
        this.loadedComponents.size * 1024 * 1024 + // Assume 1MB per component
        this.wasmPool.inUse.size * 128 * 1024 * 1024 + // 128MB per WASM runtime
        this.connectionPool.inUse.size * 1024 * 1024 // 1MB per connection
      );

      this.emit('metrics_updated', this.metrics);
    }, 30000); // Update every 30 seconds
  }
}