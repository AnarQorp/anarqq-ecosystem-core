/**
 * WASM Runtime Pool with Pre-warming
 * 
 * Manages pools of WASM runtimes with intelligent pre-warming
 * based on validation heatmap patterns and usage predictions.
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { validationHeatmap } from './ValidationHeatmap.js';

export interface WasmRuntime {
  runtimeId: string;
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
  createdAt: string;
  lastUsed: string;
  usageCount: number;
  moduleHash?: string;
  capabilities: string[];
  resourceUsage: {
    memory: number;
    cpu: number;
  };
  performance: {
    initializationTime: number;
    averageExecutionTime: number;
    successRate: number;
  };
}

export interface RuntimePool {
  poolId: string;
  name: string;
  moduleHash: string;
  minSize: number;
  maxSize: number;
  currentSize: number;
  readyRuntimes: number;
  busyRuntimes: number;
  targetSize: number;
  warmupStrategy: 'lazy' | 'eager' | 'predictive';
  runtimes: Map<string, WasmRuntime>;
  lastOptimized: string;
}

export interface PrewarmingStrategy {
  strategyId: string;
  name: string;
  type: 'time-based' | 'pattern-based' | 'load-based' | 'hybrid';
  parameters: {
    triggerThreshold: number;
    warmupCount: number;
    cooldownPeriod: number;
    predictionHorizon: number;
  };
  enabled: boolean;
  performance: {
    hitRate: number;
    wasteRate: number;
    costEfficiency: number;
  };
}

export interface PoolOptimization {
  optimizationId: string;
  poolId: string;
  type: 'resize' | 'prewarm' | 'cooldown' | 'rebalance';
  reason: string;
  parameters: {
    targetSize?: number;
    warmupCount?: number;
    cooldownCount?: number;
  };
  expectedBenefit: {
    latencyReduction: number;
    throughputIncrease: number;
    resourceSaving: number;
  };
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  actualBenefit?: {
    latencyReduction: number;
    throughputIncrease: number;
    resourceSaving: number;
  };
}

/**
 * WASM Runtime Pool Manager
 */
export class WasmRuntimePoolManager extends EventEmitter {
  private pools = new Map<string, RuntimePool>();
  private prewarmingStrategies = new Map<string, PrewarmingStrategy>();
  private optimizations = new Map<string, PoolOptimization>();
  
  private isRunning: boolean = false;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Configuration
  private config = {
    defaultMinPoolSize: 2,
    defaultMaxPoolSize: 20,
    runtimeIdleTimeout: 300000, // 5 minutes
    optimizationIntervalMs: 120000, // 2 minutes
    cleanupIntervalMs: 600000, // 10 minutes
    monitoringIntervalMs: 30000, // 30 seconds
    prewarmingBatchSize: 5,
    maxConcurrentOptimizations: 3,
  };

  constructor() {
    super();
    this.initializeDefaultStrategies();
  }

  /**
   * Start runtime pool manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start optimization cycle
    this.optimizationInterval = setInterval(() => {
      this.optimizePools();
    }, this.config.optimizationIntervalMs);

    // Start cleanup cycle
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleRuntimes();
    }, this.config.cleanupIntervalMs);

    // Start monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitorPools();
    }, this.config.monitoringIntervalMs);

    console.log('[WasmRuntimePoolManager] Started WASM runtime pool management');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.runtime.pool.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-pool',
      actor: 'system',
      data: {
        pools: this.pools.size,
        strategies: this.prewarmingStrategies.size,
        config: this.config
      }
    });
  }

  /**
   * Stop runtime pool manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Terminate all runtimes
    for (const pool of this.pools.values()) {
      await this.terminatePool(pool.poolId);
    }

    console.log('[WasmRuntimePoolManager] Stopped WASM runtime pool management');
  }

  /**
   * Create or get runtime pool
   */
  async createPool(
    moduleHash: string,
    options: {
      name?: string;
      minSize?: number;
      maxSize?: number;
      warmupStrategy?: 'lazy' | 'eager' | 'predictive';
    } = {}
  ): Promise<string> {
    const poolId = this.generatePoolId(moduleHash);
    
    let pool = this.pools.get(poolId);
    if (pool) {
      return poolId;
    }

    pool = {
      poolId,
      name: options.name || `Pool-${moduleHash.substring(0, 8)}`,
      moduleHash,
      minSize: options.minSize || this.config.defaultMinPoolSize,
      maxSize: options.maxSize || this.config.defaultMaxPoolSize,
      currentSize: 0,
      readyRuntimes: 0,
      busyRuntimes: 0,
      targetSize: options.minSize || this.config.defaultMinPoolSize,
      warmupStrategy: options.warmupStrategy || 'predictive',
      runtimes: new Map(),
      lastOptimized: new Date().toISOString()
    };

    this.pools.set(poolId, pool);

    // Initialize pool with minimum runtimes
    await this.warmupPool(poolId, pool.minSize);

    console.log(`[WasmRuntimePoolManager] Created pool ${poolId} for module ${moduleHash}`);

    // Emit pool created event
    await qflowEventEmitter.emit('q.qflow.runtime.pool.created.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-pool',
      actor: 'system',
      data: {
        poolId,
        moduleHash,
        minSize: pool.minSize,
        maxSize: pool.maxSize,
        warmupStrategy: pool.warmupStrategy
      }
    });

    return poolId;
  }

  /**
   * Acquire runtime from pool
   */
  async acquireRuntime(moduleHash: string): Promise<WasmRuntime> {
    const poolId = this.generatePoolId(moduleHash);
    let pool = this.pools.get(poolId);

    if (!pool) {
      // Create pool on demand
      await this.createPool(moduleHash);
      pool = this.pools.get(poolId)!;
    }

    // Find ready runtime
    let runtime = this.findReadyRuntime(pool);

    if (!runtime) {
      // No ready runtime available, create new one if possible
      if (pool.currentSize < pool.maxSize) {
        runtime = await this.createRuntime(pool);
      } else {
        // Wait for runtime to become available
        runtime = await this.waitForRuntime(pool);
      }
    }

    // Mark runtime as busy
    runtime.status = 'busy';
    runtime.lastUsed = new Date().toISOString();
    runtime.usageCount++;
    pool.busyRuntimes++;
    pool.readyRuntimes--;

    console.log(`[WasmRuntimePoolManager] Acquired runtime ${runtime.runtimeId} from pool ${poolId}`);

    // Emit runtime acquired event
    await qflowEventEmitter.emit('q.qflow.runtime.acquired.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-pool',
      actor: 'system',
      data: {
        runtimeId: runtime.runtimeId,
        poolId,
        usageCount: runtime.usageCount
      }
    });

    return runtime;
  }

  /**
   * Release runtime back to pool
   */
  async releaseRuntime(runtimeId: string): Promise<void> {
    let targetPool: RuntimePool | undefined;
    let runtime: WasmRuntime | undefined;

    // Find runtime in pools
    for (const pool of this.pools.values()) {
      runtime = pool.runtimes.get(runtimeId);
      if (runtime) {
        targetPool = pool;
        break;
      }
    }

    if (!targetPool || !runtime) {
      throw new Error(`Runtime ${runtimeId} not found in any pool`);
    }

    // Mark runtime as ready
    runtime.status = 'ready';
    runtime.lastUsed = new Date().toISOString();
    targetPool.busyRuntimes--;
    targetPool.readyRuntimes++;

    console.log(`[WasmRuntimePoolManager] Released runtime ${runtimeId} to pool ${targetPool.poolId}`);

    // Emit runtime released event
    await qflowEventEmitter.emit('q.qflow.runtime.released.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-pool',
      actor: 'system',
      data: {
        runtimeId,
        poolId: targetPool.poolId,
        totalUsage: runtime.usageCount
      }
    });

    // Check if pool needs optimization
    await this.checkPoolOptimization(targetPool);
  }

  /**
   * Prewarm pool based on predictions
   */
  async prewarmPool(poolId: string, count: number): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    await this.warmupPool(poolId, count);

    console.log(`[WasmRuntimePoolManager] Prewarmed pool ${poolId} with ${count} runtimes`);

    // Emit prewarming completed event
    await qflowEventEmitter.emit('q.qflow.runtime.pool.prewarmed.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-pool',
      actor: 'system',
      data: {
        poolId,
        count,
        totalRuntimes: pool.currentSize
      }
    });
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolId?: string): Array<{
    poolId: string;
    name: string;
    moduleHash: string;
    currentSize: number;
    readyRuntimes: number;
    busyRuntimes: number;
    utilization: number;
    averageUsage: number;
    performance: {
      averageInitTime: number;
      averageExecTime: number;
      successRate: number;
    };
  }> {
    const pools = poolId ? [this.pools.get(poolId)].filter(Boolean) : Array.from(this.pools.values());
    
    return pools.map(pool => {
      const runtimes = Array.from(pool!.runtimes.values());
      const utilization = pool!.currentSize > 0 ? (pool!.busyRuntimes / pool!.currentSize) * 100 : 0;
      const averageUsage = runtimes.length > 0 
        ? runtimes.reduce((sum, r) => sum + r.usageCount, 0) / runtimes.length 
        : 0;

      const averageInitTime = runtimes.length > 0
        ? runtimes.reduce((sum, r) => sum + r.performance.initializationTime, 0) / runtimes.length
        : 0;

      const averageExecTime = runtimes.length > 0
        ? runtimes.reduce((sum, r) => sum + r.performance.averageExecutionTime, 0) / runtimes.length
        : 0;

      const successRate = runtimes.length > 0
        ? runtimes.reduce((sum, r) => sum + r.performance.successRate, 0) / runtimes.length
        : 0;

      return {
        poolId: pool!.poolId,
        name: pool!.name,
        moduleHash: pool!.moduleHash,
        currentSize: pool!.currentSize,
        readyRuntimes: pool!.readyRuntimes,
        busyRuntimes: pool!.busyRuntimes,
        utilization,
        averageUsage,
        performance: {
          averageInitTime,
          averageExecTime,
          successRate
        }
      };
    });
  }

  // Private methods

  private async createRuntime(pool: RuntimePool): Promise<WasmRuntime> {
    const runtimeId = this.generateRuntimeId();
    const startTime = Date.now();

    const runtime: WasmRuntime = {
      runtimeId,
      status: 'initializing',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      moduleHash: pool.moduleHash,
      capabilities: ['wasm-execution', 'memory-isolation', 'cpu-limiting'],
      resourceUsage: {
        memory: 0,
        cpu: 0
      },
      performance: {
        initializationTime: 0,
        averageExecutionTime: 0,
        successRate: 1.0
      }
    };

    pool.runtimes.set(runtimeId, runtime);
    pool.currentSize++;

    try {
      // Simulate runtime initialization
      await this.initializeRuntime(runtime, pool.moduleHash);
      
      runtime.status = 'ready';
      runtime.performance.initializationTime = Date.now() - startTime;
      pool.readyRuntimes++;

      console.log(`[WasmRuntimePoolManager] Created runtime ${runtimeId} in ${runtime.performance.initializationTime}ms`);

      return runtime;
    } catch (error) {
      runtime.status = 'error';
      pool.currentSize--;
      console.error(`[WasmRuntimePoolManager] Failed to create runtime ${runtimeId}:`, error);
      throw error;
    }
  }

  private async initializeRuntime(runtime: WasmRuntime, moduleHash: string): Promise<void> {
    // Simulate WASM runtime initialization
    const initTime = Math.random() * 500 + 100; // 100-600ms
    await new Promise(resolve => setTimeout(resolve, initTime));

    // Simulate resource allocation
    runtime.resourceUsage.memory = Math.random() * 50 + 10; // 10-60MB
    runtime.resourceUsage.cpu = Math.random() * 20 + 5; // 5-25%

    console.log(`[WasmRuntimePoolManager] Initialized runtime ${runtime.runtimeId} for module ${moduleHash}`);
  }

  private findReadyRuntime(pool: RuntimePool): WasmRuntime | undefined {
    for (const runtime of pool.runtimes.values()) {
      if (runtime.status === 'ready') {
        return runtime;
      }
    }
    return undefined;
  }

  private async waitForRuntime(pool: RuntimePool, timeout: number = 5000): Promise<WasmRuntime> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const runtime = this.findReadyRuntime(pool);
      if (runtime) {
        return runtime;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for runtime in pool ${pool.poolId}`);
  }

  private async warmupPool(poolId: string, count: number): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const runtimesToCreate = Math.min(count, pool.maxSize - pool.currentSize);
    const promises: Promise<WasmRuntime>[] = [];

    for (let i = 0; i < runtimesToCreate; i++) {
      promises.push(this.createRuntime(pool));
    }

    await Promise.all(promises);
    console.log(`[WasmRuntimePoolManager] Warmed up pool ${poolId} with ${runtimesToCreate} runtimes`);
  }

  private async terminatePool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return;
    }

    // Terminate all runtimes
    for (const runtime of pool.runtimes.values()) {
      runtime.status = 'terminated';
    }

    pool.runtimes.clear();
    pool.currentSize = 0;
    pool.readyRuntimes = 0;
    pool.busyRuntimes = 0;

    this.pools.delete(poolId);
    console.log(`[WasmRuntimePoolManager] Terminated pool ${poolId}`);
  }

  private async optimizePools(): Promise<void> {
    const activeOptimizations = Array.from(this.optimizations.values())
      .filter(opt => opt.status === 'executing').length;

    if (activeOptimizations >= this.config.maxConcurrentOptimizations) {
      return;
    }

    // Get hot patterns from validation heatmap
    const hotPatterns = validationHeatmap.getHotPatterns(20);
    
    for (const pool of this.pools.values()) {
      await this.optimizePool(pool, hotPatterns);
    }
  }

  private async optimizePool(pool: RuntimePool, hotPatterns: any[]): Promise<void> {
    const utilization = pool.currentSize > 0 ? (pool.busyRuntimes / pool.currentSize) * 100 : 0;
    
    // Check if pool needs scaling
    if (utilization > 80 && pool.currentSize < pool.maxSize) {
      // Scale up
      const optimization: PoolOptimization = {
        optimizationId: this.generateOptimizationId(),
        poolId: pool.poolId,
        type: 'resize',
        reason: `High utilization (${utilization.toFixed(1)}%)`,
        parameters: {
          targetSize: Math.min(pool.maxSize, pool.currentSize + 2)
        },
        expectedBenefit: {
          latencyReduction: 200,
          throughputIncrease: 25,
          resourceSaving: -10
        },
        status: 'pending',
        startedAt: new Date().toISOString()
      };

      await this.executeOptimization(optimization);
    } else if (utilization < 20 && pool.currentSize > pool.minSize) {
      // Scale down
      const optimization: PoolOptimization = {
        optimizationId: this.generateOptimizationId(),
        poolId: pool.poolId,
        type: 'resize',
        reason: `Low utilization (${utilization.toFixed(1)}%)`,
        parameters: {
          targetSize: Math.max(pool.minSize, pool.currentSize - 1)
        },
        expectedBenefit: {
          latencyReduction: 0,
          throughputIncrease: 0,
          resourceSaving: 15
        },
        status: 'pending',
        startedAt: new Date().toISOString()
      };

      await this.executeOptimization(optimization);
    }

    // Check for predictive prewarming
    if (pool.warmupStrategy === 'predictive') {
      await this.checkPredictivePrewarming(pool, hotPatterns);
    }
  }

  private async checkPredictivePrewarming(pool: RuntimePool, hotPatterns: any[]): Promise<void> {
    // Find patterns that might need this pool's module
    const relevantPatterns = hotPatterns.filter(pattern => 
      pattern.expectedBenefit > 50 && !pattern.prewarmed
    );

    if (relevantPatterns.length > 0 && pool.readyRuntimes < 3) {
      const optimization: PoolOptimization = {
        optimizationId: this.generateOptimizationId(),
        poolId: pool.poolId,
        type: 'prewarm',
        reason: `Predictive prewarming for ${relevantPatterns.length} hot patterns`,
        parameters: {
          warmupCount: Math.min(3, pool.maxSize - pool.currentSize)
        },
        expectedBenefit: {
          latencyReduction: 300,
          throughputIncrease: 20,
          resourceSaving: -5
        },
        status: 'pending',
        startedAt: new Date().toISOString()
      };

      await this.executeOptimization(optimization);
    }
  }

  private async executeOptimization(optimization: PoolOptimization): Promise<void> {
    this.optimizations.set(optimization.optimizationId, optimization);
    optimization.status = 'executing';

    try {
      const pool = this.pools.get(optimization.poolId);
      if (!pool) {
        throw new Error(`Pool ${optimization.poolId} not found`);
      }

      switch (optimization.type) {
        case 'resize':
          await this.resizePool(pool, optimization.parameters.targetSize!);
          break;
        case 'prewarm':
          await this.warmupPool(pool.poolId, optimization.parameters.warmupCount!);
          break;
        case 'cooldown':
          await this.cooldownPool(pool, optimization.parameters.cooldownCount!);
          break;
        case 'rebalance':
          await this.rebalancePool(pool);
          break;
      }

      optimization.status = 'completed';
      optimization.completedAt = new Date().toISOString();

      console.log(`[WasmRuntimePoolManager] Completed optimization ${optimization.optimizationId} for pool ${optimization.poolId}`);

    } catch (error) {
      optimization.status = 'failed';
      optimization.completedAt = new Date().toISOString();
      console.error(`[WasmRuntimePoolManager] Optimization ${optimization.optimizationId} failed:`, error);
    }
  }

  private async resizePool(pool: RuntimePool, targetSize: number): Promise<void> {
    if (targetSize > pool.currentSize) {
      // Scale up
      await this.warmupPool(pool.poolId, targetSize - pool.currentSize);
    } else if (targetSize < pool.currentSize) {
      // Scale down
      await this.cooldownPool(pool, pool.currentSize - targetSize);
    }
    
    pool.targetSize = targetSize;
  }

  private async cooldownPool(pool: RuntimePool, count: number): Promise<void> {
    const runtimesToRemove = Array.from(pool.runtimes.values())
      .filter(r => r.status === 'ready')
      .sort((a, b) => new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime())
      .slice(0, count);

    for (const runtime of runtimesToRemove) {
      runtime.status = 'terminated';
      pool.runtimes.delete(runtime.runtimeId);
      pool.currentSize--;
      pool.readyRuntimes--;
    }

    console.log(`[WasmRuntimePoolManager] Cooled down pool ${pool.poolId} by ${runtimesToRemove.length} runtimes`);
  }

  private async rebalancePool(pool: RuntimePool): Promise<void> {
    // Terminate old/underperforming runtimes and create new ones
    const oldRuntimes = Array.from(pool.runtimes.values())
      .filter(r => r.status === 'ready' && r.performance.successRate < 0.8)
      .slice(0, 2);

    for (const runtime of oldRuntimes) {
      runtime.status = 'terminated';
      pool.runtimes.delete(runtime.runtimeId);
      pool.currentSize--;
      pool.readyRuntimes--;
    }

    // Create new runtimes to replace terminated ones
    if (oldRuntimes.length > 0) {
      await this.warmupPool(pool.poolId, oldRuntimes.length);
    }

    console.log(`[WasmRuntimePoolManager] Rebalanced pool ${pool.poolId}, replaced ${oldRuntimes.length} runtimes`);
  }

  private async checkPoolOptimization(pool: RuntimePool): Promise<void> {
    const timeSinceLastOptimization = Date.now() - new Date(pool.lastOptimized).getTime();
    
    if (timeSinceLastOptimization > this.config.optimizationIntervalMs) {
      pool.lastOptimized = new Date().toISOString();
      // Optimization will be handled in the next cycle
    }
  }

  private cleanupIdleRuntimes(): void {
    const now = Date.now();
    
    for (const pool of this.pools.values()) {
      const idleRuntimes = Array.from(pool.runtimes.values()).filter(runtime => {
        const idleTime = now - new Date(runtime.lastUsed).getTime();
        return runtime.status === 'ready' && 
               idleTime > this.config.runtimeIdleTimeout &&
               pool.currentSize > pool.minSize;
      });

      for (const runtime of idleRuntimes) {
        runtime.status = 'terminated';
        pool.runtimes.delete(runtime.runtimeId);
        pool.currentSize--;
        pool.readyRuntimes--;
      }

      if (idleRuntimes.length > 0) {
        console.log(`[WasmRuntimePoolManager] Cleaned up ${idleRuntimes.length} idle runtimes from pool ${pool.poolId}`);
      }
    }
  }

  private monitorPools(): void {
    for (const pool of this.pools.values()) {
      const utilization = pool.currentSize > 0 ? (pool.busyRuntimes / pool.currentSize) * 100 : 0;
      
      // Emit monitoring event
      qflowEventEmitter.emit('q.qflow.runtime.pool.metrics.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-wasm-pool',
        actor: 'system',
        data: {
          poolId: pool.poolId,
          currentSize: pool.currentSize,
          readyRuntimes: pool.readyRuntimes,
          busyRuntimes: pool.busyRuntimes,
          utilization,
          targetSize: pool.targetSize
        }
      });
    }
  }

  private initializeDefaultStrategies(): void {
    const predictiveStrategy: PrewarmingStrategy = {
      strategyId: 'predictive-default',
      name: 'Predictive Prewarming',
      type: 'hybrid',
      parameters: {
        triggerThreshold: 70,
        warmupCount: 3,
        cooldownPeriod: 300000,
        predictionHorizon: 3600000
      },
      enabled: true,
      performance: {
        hitRate: 0.8,
        wasteRate: 0.15,
        costEfficiency: 0.75
      }
    };

    this.prewarmingStrategies.set(predictiveStrategy.strategyId, predictiveStrategy);
  }

  // Utility methods

  private generatePoolId(moduleHash: string): string {
    return `pool_${moduleHash.substring(0, 16)}`;
  }

  private generateRuntimeId(): string {
    return `runtime_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateOptimizationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[WasmRuntimePoolManager] Configuration updated');
  }

  /**
   * Get all pools
   */
  getPools(): RuntimePool[] {
    return Array.from(this.pools.values());
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(poolId?: string): PoolOptimization[] {
    const optimizations = Array.from(this.optimizations.values());
    return poolId 
      ? optimizations.filter(opt => opt.poolId === poolId)
      : optimizations;
  }
}

// Export singleton instance
export const wasmRuntimePoolManager = new WasmRuntimePoolManager();