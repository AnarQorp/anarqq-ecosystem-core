/**
 * Optimization Module Integration
 * 
 * Integrates validation heatmap, WASM runtime pool management,
 * and predictive optimization for comprehensive performance optimization.
 */

export { ValidationHeatmap, validationHeatmap } from './ValidationHeatmap.js';
export { WasmRuntimePoolManager, wasmRuntimePoolManager } from './WasmRuntimePool.js';
export { PredictiveOptimizer, predictiveOptimizer } from './PredictiveOptimizer.js';

export type {
  ValidationPattern,
  HeatmapEntry,
  PrewarmingJob,
  OptimizationRecommendation as HeatmapOptimizationRecommendation
} from './ValidationHeatmap.js';

export type {
  WasmRuntime,
  RuntimePool,
  PrewarmingStrategy,
  PoolOptimization
} from './WasmRuntimePool.js';

export type {
  ExecutionPattern,
  PredictiveModel,
  OptimizationPrediction,
  OptimizationRecommendation,
  OptimizationExecution
} from './PredictiveOptimizer.js';

/**
 * Optimization Manager
 * 
 * Coordinates all optimization components and provides unified interface
 */
export class OptimizationManager {
  private isRunning: boolean = false;

  /**
   * Start all optimization components
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('[OptimizationManager] Starting optimization components...');

    // Start validation heatmap
    await validationHeatmap.start();

    // Start WASM runtime pool manager
    await wasmRuntimePoolManager.start();

    // Start predictive optimizer
    await predictiveOptimizer.start();

    this.isRunning = true;
    console.log('[OptimizationManager] All optimization components started');
  }

  /**
   * Stop all optimization components
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[OptimizationManager] Stopping optimization components...');

    // Stop predictive optimizer
    await predictiveOptimizer.stop();

    // Stop WASM runtime pool manager
    await wasmRuntimePoolManager.stop();

    // Stop validation heatmap
    await validationHeatmap.stop();

    this.isRunning = false;
    console.log('[OptimizationManager] All optimization components stopped');
  }

  /**
   * Get comprehensive optimization statistics
   */
  getOptimizationStats(): {
    heatmap: ReturnType<typeof validationHeatmap.getStats>;
    runtimePools: ReturnType<typeof wasmRuntimePoolManager.getPoolStats>;
    predictive: ReturnType<typeof predictiveOptimizer.getStats>;
    overall: {
      isRunning: boolean;
      totalOptimizations: number;
      averageImpact: number;
      systemEfficiency: number;
    };
  } {
    const heatmapStats = validationHeatmap.getStats();
    const poolStats = wasmRuntimePoolManager.getPoolStats();
    const predictiveStats = predictiveOptimizer.getStats();

    const totalOptimizations = heatmapStats.recommendations + 
                              predictiveStats.recommendations + 
                              predictiveStats.executions.total;

    const averageImpact = predictiveStats.performance.averageImpact;
    
    // Calculate system efficiency based on various metrics
    const systemEfficiency = this.calculateSystemEfficiency(heatmapStats, poolStats, predictiveStats);

    return {
      heatmap: heatmapStats,
      runtimePools: poolStats,
      predictive: predictiveStats,
      overall: {
        isRunning: this.isRunning,
        totalOptimizations,
        averageImpact,
        systemEfficiency
      }
    };
  }

  /**
   * Force optimization analysis across all components
   */
  async forceOptimizationAnalysis(): Promise<void> {
    console.log('[OptimizationManager] Forcing optimization analysis...');

    // Force heatmap analysis
    await validationHeatmap.forceAnalysis();

    // Force predictive analysis
    await predictiveOptimizer.forcePrediction();

    // Force model training
    await predictiveOptimizer.forceTraining();

    console.log('[OptimizationManager] Optimization analysis completed');
  }

  /**
   * Get unified optimization recommendations
   */
  getUnifiedRecommendations(): Array<{
    source: 'heatmap' | 'predictive';
    recommendation: any;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expectedImpact: number;
  }> {
    const recommendations: Array<{
      source: 'heatmap' | 'predictive';
      recommendation: any;
      priority: 'low' | 'medium' | 'high' | 'critical';
      expectedImpact: number;
    }> = [];

    // Get heatmap recommendations
    const heatmapRecs = validationHeatmap.getOptimizationRecommendations();
    for (const rec of heatmapRecs) {
      recommendations.push({
        source: 'heatmap',
        recommendation: rec,
        priority: rec.priority,
        expectedImpact: rec.expectedBenefit.latencyReduction + rec.expectedBenefit.throughputIncrease
      });
    }

    // Get predictive recommendations
    const predictiveRecs = predictiveOptimizer.getOptimizationRecommendations();
    for (const rec of predictiveRecs) {
      recommendations.push({
        source: 'predictive',
        recommendation: rec,
        priority: rec.priority,
        expectedImpact: rec.expectedImpact.latencyReduction + rec.expectedImpact.throughputIncrease
      });
    }

    // Sort by priority and expected impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImpact - a.expectedImpact;
    });
  }

  /**
   * Record comprehensive execution metrics
   */
  async recordExecution(
    flowType: string,
    executionTime: string,
    latency: number,
    resourceUsage: { cpu: number; memory: number; network: number; wasmRuntimes: number },
    validationLayers: string[],
    validationLatency: number,
    success: boolean
  ): Promise<void> {
    // Record in validation heatmap
    await validationHeatmap.recordValidationUsage(
      validationLayers,
      this.generateInputHash(flowType, executionTime),
      'v1.0.0',
      validationLatency,
      success,
      { cpu: resourceUsage.cpu, memory: resourceUsage.memory, network: resourceUsage.network }
    );

    // Record in predictive optimizer
    await predictiveOptimizer.recordExecutionPattern(
      flowType,
      executionTime,
      latency,
      resourceUsage,
      validationLayers,
      success
    );
  }

  /**
   * Get runtime for execution
   */
  async acquireRuntime(moduleHash: string): Promise<any> {
    return await wasmRuntimePoolManager.acquireRuntime(moduleHash);
  }

  /**
   * Release runtime after execution
   */
  async releaseRuntime(runtimeId: string): Promise<void> {
    await wasmRuntimePoolManager.releaseRuntime(runtimeId);
  }

  /**
   * Check if running
   */
  isOptimizationRunning(): boolean {
    return this.isRunning;
  }

  // Private methods

  private calculateSystemEfficiency(
    heatmapStats: any,
    poolStats: any,
    predictiveStats: any
  ): number {
    // Calculate efficiency based on various factors
    let efficiency = 0;

    // Heatmap efficiency (hot patterns vs total patterns)
    if (heatmapStats.patterns > 0) {
      efficiency += (heatmapStats.hotPatterns / heatmapStats.patterns) * 25;
    }

    // Runtime pool efficiency (average utilization)
    if (poolStats.length > 0) {
      const avgUtilization = poolStats.reduce((sum: number, pool: any) => sum + pool.utilization, 0) / poolStats.length;
      efficiency += (avgUtilization / 100) * 25;
    }

    // Predictive model accuracy
    efficiency += predictiveStats.performance.averageAccuracy * 25;

    // Execution success rate
    efficiency += predictiveStats.performance.successRate * 25;

    return Math.min(100, Math.max(0, efficiency));
  }

  private generateInputHash(flowType: string, executionTime: string): string {
    const combined = `${flowType}_${executionTime}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const optimizationManager = new OptimizationManager();