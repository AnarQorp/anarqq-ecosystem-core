/**
 * Optimization Engine
 * 
 * Provides automated optimization recommendations and performance tuning
 * for Qflow executions based on profiling data and machine learning insights.
 */

import { EventEmitter } from 'events';
import { FlowDefinition, FlowStep } from '../models/FlowDefinition';
import { PerformanceProfiler, OptimizationRecommendation, FlowPerformanceAnalysis } from './PerformanceProfiler';

export interface OptimizationConfig {
  enableAutoOptimization: boolean;
  optimizationThreshold: number;
  maxOptimizationAttempts: number;
  learningRate: number;
  confidenceThreshold: number;
}

export interface OptimizationResult {
  flowId: string;
  optimizationType: string;
  beforeMetrics: PerformanceMetrics;
  afterMetrics: PerformanceMetrics;
  improvement: number;
  success: boolean;
  timestamp: number;
}

export interface PerformanceMetrics {
  averageDuration: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  applicableConditions: (analysis: FlowPerformanceAnalysis) => boolean;
  apply: (flow: FlowDefinition) => Promise<FlowDefinition>;
  expectedImprovement: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export class OptimizationEngine extends EventEmitter {
  private config: OptimizationConfig;
  private profiler: PerformanceProfiler;
  private optimizationHistory: Map<string, OptimizationResult[]>;
  private strategies: OptimizationStrategy[];
  private learningModel: OptimizationLearningModel;

  constructor(config: OptimizationConfig, profiler: PerformanceProfiler) {
    super();
    this.config = config;
    this.profiler = profiler;
    this.optimizationHistory = new Map();
    this.strategies = this.initializeStrategies();
    this.learningModel = new OptimizationLearningModel();
  }

  /**
   * Analyze flow and suggest optimizations
   */
  public async analyzeAndOptimize(flowId: string): Promise<OptimizationRecommendation[]> {
    const analysis = this.profiler.getFlowAnalysis(flowId);
    
    let recommendations: OptimizationRecommendation[] = [];

    if (analysis.executionCount < 5) {
      recommendations = [{
        type: 'resource-optimization',
        priority: 'low',
        description: 'Insufficient execution history for optimization analysis',
        expectedImprovement: 0,
        implementationComplexity: 'low',
        steps: ['Execute flow more times to gather performance data']
      }];
    } else {
      // Apply optimization strategies
      for (const strategy of this.strategies) {
        if (strategy.applicableConditions(analysis)) {
          const recommendation = await this.createRecommendation(strategy, analysis);
          recommendations.push(recommendation);
        }
      }

      // Sort by expected improvement and priority
      recommendations.sort((a, b) => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.expectedImprovement) - 
               (priorityWeight[a.priority] * a.expectedImprovement);
      });

      recommendations = recommendations.slice(0, 5); // Top 5 recommendations
    }

    this.emit('optimization_analysis_complete', {
      flowId,
      recommendationCount: recommendations.length,
      topRecommendation: recommendations[0]?.type,
      timestamp: Date.now()
    });

    return recommendations;
  }

  /**
   * Apply automatic optimization if enabled
   */
  public async autoOptimize(flowId: string, flow: FlowDefinition): Promise<FlowDefinition | null> {
    if (!this.config.enableAutoOptimization) {
      return null;
    }

    const analysis = this.profiler.getFlowAnalysis(flowId);
    const history = this.optimizationHistory.get(flowId) || [];

    // Check if optimization is needed
    if (analysis.p95Duration < this.config.optimizationThreshold) {
      return null;
    }

    // Check if we've exceeded max attempts
    if (history.length >= this.config.maxOptimizationAttempts) {
      return null;
    }

    // Find best strategy
    const strategy = this.selectBestStrategy(analysis, history);
    if (!strategy) {
      return null;
    }

    try {
      const beforeMetrics = this.extractMetrics(analysis);
      const optimizedFlow = await strategy.apply(flow);
      
      // Record optimization attempt
      const result: OptimizationResult = {
        flowId,
        optimizationType: strategy.name,
        beforeMetrics,
        afterMetrics: beforeMetrics, // Will be updated after execution
        improvement: 0,
        success: true,
        timestamp: Date.now()
      };

      this.recordOptimization(flowId, result);

      this.emit('auto_optimization_applied', {
        flowId,
        strategy: strategy.name,
        expectedImprovement: strategy.expectedImprovement,
        timestamp: Date.now()
      });

      return optimizedFlow;
    } catch (error) {
      this.emit('optimization_failed', {
        flowId,
        strategy: strategy.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * Initialize optimization strategies
   */
  private initializeStrategies(): OptimizationStrategy[] {
    return [
      {
        name: 'step-parallelization',
        description: 'Parallelize independent steps to reduce execution time',
        applicableConditions: (analysis) => {
          return analysis.averageDuration > 5000 && // > 5 seconds
                 analysis.bottlenecks.some(b => b.type === 'cpu');
        },
        apply: async (flow) => this.applyStepParallelization(flow),
        expectedImprovement: 0.4,
        riskLevel: 'medium'
      },
      {
        name: 'validation-caching',
        description: 'Cache validation results to reduce validation overhead',
        applicableConditions: (analysis) => {
          return analysis.bottlenecks.some(b => b.type === 'validation' && b.severity === 'high');
        },
        apply: async (flow) => this.applyValidationCaching(flow),
        expectedImprovement: 0.3,
        riskLevel: 'low'
      },
      {
        name: 'resource-pooling',
        description: 'Pool resources to reduce initialization overhead',
        applicableConditions: (analysis) => {
          return analysis.bottlenecks.some(b => b.type === 'resource-wait');
        },
        apply: async (flow) => this.applyResourcePooling(flow),
        expectedImprovement: 0.25,
        riskLevel: 'low'
      },
      {
        name: 'step-reordering',
        description: 'Reorder steps to optimize execution flow',
        applicableConditions: (analysis) => {
          return analysis.executionCount > 10 && analysis.averageDuration > 3000;
        },
        apply: async (flow) => this.applyStepReordering(flow),
        expectedImprovement: 0.15,
        riskLevel: 'medium'
      },
      {
        name: 'lazy-loading',
        description: 'Implement lazy loading for large data operations',
        applicableConditions: (analysis) => {
          return analysis.bottlenecks.some(b => b.type === 'memory' && b.severity === 'high');
        },
        apply: async (flow) => this.applyLazyLoading(flow),
        expectedImprovement: 0.2,
        riskLevel: 'medium'
      }
    ];
  }

  /**
   * Apply step parallelization optimization
   */
  private async applyStepParallelization(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    // Analyze step dependencies
    const dependencyGraph = this.buildDependencyGraph(flow.steps);
    const parallelGroups = this.findParallelizableGroups(dependencyGraph);

    // Create parallel execution groups
    const newSteps: FlowStep[] = [];
    let stepIndex = 0;

    for (const group of parallelGroups) {
      if (group.length > 1) {
        // Create parallel step
        const parallelStep: FlowStep = {
          id: `parallel_${stepIndex++}`,
          type: 'parallel',
          action: 'parallel_execution',
          params: {
            steps: group,
            maxConcurrency: Math.min(group.length, 4)
          },
          timeout: Math.max(...group.map(s => s.timeout || 30000)),
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            backoffMultiplier: 2,
            initialDelay: 1000,
            maxDelay: 30000
          }
        };
        newSteps.push(parallelStep);
      } else {
        newSteps.push(group[0]);
      }
    }

    optimizedFlow.steps = newSteps;
    optimizedFlow.metadata = {
      ...optimizedFlow.metadata,
      optimizations: [...(optimizedFlow.metadata.optimizations || []), 'step-parallelization']
    };

    return optimizedFlow;
  }

  /**
   * Apply validation caching optimization
   */
  private async applyValidationCaching(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    optimizedFlow.steps = flow.steps.map(step => ({
      ...step,
      params: {
        ...step.params,
        enableValidationCache: true,
        validationCacheTTL: 300000 // 5 minutes
      }
    }));

    optimizedFlow.metadata = {
      ...optimizedFlow.metadata,
      optimizations: [...(optimizedFlow.metadata.optimizations || []), 'validation-caching']
    };

    return optimizedFlow;
  }

  /**
   * Apply resource pooling optimization
   */
  private async applyResourcePooling(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    optimizedFlow.steps = flow.steps.map(step => ({
      ...step,
      params: {
        ...step.params,
        useResourcePool: true,
        poolSize: 5,
        poolTimeout: 10000
      }
    }));

    optimizedFlow.metadata = {
      ...optimizedFlow.metadata,
      optimizations: [...(optimizedFlow.metadata.optimizations || []), 'resource-pooling']
    };

    return optimizedFlow;
  }

  /**
   * Apply step reordering optimization
   */
  private async applyStepReordering(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    // Simple heuristic: move faster steps first
    const reorderedSteps = [...flow.steps].sort((a, b) => {
      const aWeight = this.getStepWeight(a);
      const bWeight = this.getStepWeight(b);
      return aWeight - bWeight;
    });

    optimizedFlow.steps = reorderedSteps;
    optimizedFlow.metadata = {
      ...optimizedFlow.metadata,
      optimizations: [...(optimizedFlow.metadata.optimizations || []), 'step-reordering']
    };

    return optimizedFlow;
  }

  /**
   * Apply lazy loading optimization
   */
  private async applyLazyLoading(flow: FlowDefinition): Promise<FlowDefinition> {
    const optimizedFlow = { ...flow };
    
    optimizedFlow.steps = flow.steps.map(step => ({
      ...step,
      params: {
        ...step.params,
        lazyLoading: true,
        chunkSize: 1000,
        streamingEnabled: true
      }
    }));

    optimizedFlow.metadata = {
      ...optimizedFlow.metadata,
      optimizations: [...(optimizedFlow.metadata.optimizations || []), 'lazy-loading']
    };

    return optimizedFlow;
  }

  /**
   * Build dependency graph for steps
   */
  private buildDependencyGraph(steps: FlowStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    steps.forEach(step => {
      const dependencies: string[] = [];
      
      // Simple dependency detection based on onSuccess/onFailure
      steps.forEach(otherStep => {
        if (otherStep.onSuccess === step.id || otherStep.onFailure === step.id) {
          dependencies.push(otherStep.id);
        }
      });
      
      graph.set(step.id, dependencies);
    });
    
    return graph;
  }

  /**
   * Find parallelizable groups of steps
   */
  private findParallelizableGroups(dependencyGraph: Map<string, string[]>): FlowStep[][] {
    // Simplified implementation - in practice, this would use topological sorting
    const groups: FlowStep[][] = [];
    const processed = new Set<string>();
    
    // For now, just group steps with no dependencies
    const independentSteps: FlowStep[] = [];
    
    dependencyGraph.forEach((dependencies, stepId) => {
      if (dependencies.length === 0 && !processed.has(stepId)) {
        // Find the actual step object (simplified)
        independentSteps.push({ id: stepId } as FlowStep);
        processed.add(stepId);
      }
    });
    
    if (independentSteps.length > 1) {
      groups.push(independentSteps);
    }
    
    return groups;
  }

  /**
   * Get step weight for reordering
   */
  private getStepWeight(step: FlowStep): number {
    // Simple heuristic based on step type and estimated complexity
    const typeWeights = {
      'task': 1,
      'condition': 0.5,
      'parallel': 2,
      'event-trigger': 0.3,
      'module-call': 1.5
    };
    
    return typeWeights[step.type] || 1;
  }

  /**
   * Select best optimization strategy
   */
  private selectBestStrategy(
    analysis: FlowPerformanceAnalysis, 
    history: OptimizationResult[]
  ): OptimizationStrategy | null {
    const applicableStrategies = this.strategies.filter(s => s.applicableConditions(analysis));
    
    if (applicableStrategies.length === 0) {
      return null;
    }

    // Avoid strategies that have failed recently
    const recentFailures = history
      .filter(h => !h.success && Date.now() - h.timestamp < 86400000) // 24 hours
      .map(h => h.optimizationType);

    const viableStrategies = applicableStrategies.filter(s => 
      !recentFailures.includes(s.name)
    );

    if (viableStrategies.length === 0) {
      return null;
    }

    // Select strategy with highest expected improvement and lowest risk
    return viableStrategies.reduce((best, current) => {
      const bestScore = best.expectedImprovement * (best.riskLevel === 'low' ? 1.2 : best.riskLevel === 'medium' ? 1.0 : 0.8);
      const currentScore = current.expectedImprovement * (current.riskLevel === 'low' ? 1.2 : current.riskLevel === 'medium' ? 1.0 : 0.8);
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Create optimization recommendation
   */
  private async createRecommendation(
    strategy: OptimizationStrategy, 
    analysis: FlowPerformanceAnalysis
  ): Promise<OptimizationRecommendation> {
    return {
      type: strategy.name as any,
      priority: strategy.expectedImprovement > 0.3 ? 'high' : 
                strategy.expectedImprovement > 0.15 ? 'medium' : 'low',
      description: strategy.description,
      expectedImprovement: strategy.expectedImprovement,
      implementationComplexity: strategy.riskLevel,
      steps: this.generateImplementationSteps(strategy)
    };
  }

  /**
   * Generate implementation steps for a strategy
   */
  private generateImplementationSteps(strategy: OptimizationStrategy): string[] {
    const stepMap: Record<string, string[]> = {
      'step-parallelization': [
        'Analyze step dependencies',
        'Identify parallelizable steps',
        'Implement parallel execution',
        'Test parallel execution',
        'Monitor performance improvement'
      ],
      'validation-caching': [
        'Implement validation cache',
        'Configure cache TTL',
        'Add cache invalidation logic',
        'Monitor cache hit rates'
      ],
      'resource-pooling': [
        'Implement resource pool',
        'Configure pool size',
        'Add pool monitoring',
        'Test resource reuse'
      ],
      'step-reordering': [
        'Analyze step execution times',
        'Identify optimal order',
        'Reorder steps',
        'Validate execution correctness'
      ],
      'lazy-loading': [
        'Identify large data operations',
        'Implement streaming',
        'Add chunking logic',
        'Test memory usage'
      ]
    };

    return stepMap[strategy.name] || ['Apply optimization', 'Test results', 'Monitor performance'];
  }

  /**
   * Extract performance metrics from analysis
   */
  private extractMetrics(analysis: FlowPerformanceAnalysis): PerformanceMetrics {
    return {
      averageDuration: analysis.averageDuration,
      memoryUsage: 0, // Would be extracted from traces
      cpuUsage: 0, // Would be extracted from traces
      throughput: analysis.executionCount / (Date.now() / 1000 / 3600), // executions per hour
      errorRate: 0 // Would be calculated from failed executions
    };
  }

  /**
   * Record optimization result
   */
  private recordOptimization(flowId: string, result: OptimizationResult): void {
    const history = this.optimizationHistory.get(flowId) || [];
    history.push(result);
    this.optimizationHistory.set(flowId, history);

    // Keep only last 10 optimization attempts
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get optimization history for a flow
   */
  public getOptimizationHistory(flowId: string): OptimizationResult[] {
    return this.optimizationHistory.get(flowId) || [];
  }

  /**
   * Clear optimization history
   */
  public clearOptimizationHistory(flowId?: string): void {
    if (flowId) {
      this.optimizationHistory.delete(flowId);
    } else {
      this.optimizationHistory.clear();
    }
  }
}

/**
 * Machine Learning Model for Optimization
 */
class OptimizationLearningModel {
  private trainingData: any[] = [];

  public learn(result: OptimizationResult): void {
    this.trainingData.push({
      strategy: result.optimizationType,
      improvement: result.improvement,
      success: result.success,
      beforeMetrics: result.beforeMetrics,
      afterMetrics: result.afterMetrics
    });

    // Keep only recent training data
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }
  }

  public predict(strategy: string, metrics: PerformanceMetrics): number {
    // Simple prediction based on historical success rate
    const relevantData = this.trainingData.filter(d => d.strategy === strategy);
    
    if (relevantData.length === 0) {
      return 0.5; // Default confidence
    }

    const successRate = relevantData.filter(d => d.success).length / relevantData.length;
    const avgImprovement = relevantData
      .filter(d => d.success)
      .reduce((sum, d) => sum + d.improvement, 0) / relevantData.filter(d => d.success).length;

    return successRate * (avgImprovement || 0.1);
  }
}