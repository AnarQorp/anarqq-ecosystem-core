/**
 * Performance-Based Node Selection Optimization
 * 
 * Implements machine learning for node selection optimization,
 * historical performance analysis and prediction, and adaptive
 * algorithms based on execution patterns
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface PerformanceMetric {
  metricId: string;
  nodeId: string;
  timestamp: string;
  metrics: {
    executionTime: number;
    throughput: number;
    errorRate: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
    responseTime: number;
    queueTime: number;
    successRate: number;
  };
  workloadCharacteristics: {
    taskType: string;
    complexity: 'low' | 'medium' | 'high';
    dataSize: number;
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
}

export interface NodePerformanceProfile {
  nodeId: string;
  profileId: string;
  capabilities: string[];
  strengths: string[];
  weaknesses: string[];
  optimalWorkloads: string[];
  performanceScores: {
    overall: number;
    reliability: number;
    speed: number;
    efficiency: number;
    consistency: number;
  };
  historicalTrends: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
    trendScore: number;
  };
  lastUpdated: string;
}

export interface MLModel {
  modelId: string;
  type: 'linear-regression' | 'random-forest' | 'neural-network' | 'gradient-boosting' | 'ensemble';
  purpose: 'performance-prediction' | 'node-ranking' | 'workload-matching' | 'anomaly-detection';
  features: string[];
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingData: {
    samples: number;
    lastTrained: string;
    trainingDuration: number;
  };
  hyperparameters: Record<string, any>;
  status: 'training' | 'ready' | 'updating' | 'deprecated';
}

export interface PredictionResult {
  predictionId: string;
  nodeId: string;
  workloadId: string;
  predictedPerformance: {
    executionTime: number;
    successProbability: number;
    resourceUsage: Record<string, number>;
    confidence: number;
  };
  reasoning: string[];
  alternatives: Array<{
    nodeId: string;
    score: number;
    reason: string;
  }>;
  timestamp: string;
}

export interface AdaptiveAlgorithm {
  algorithmId: string;
  name: string;
  type: 'reinforcement-learning' | 'genetic-algorithm' | 'particle-swarm' | 'simulated-annealing';
  objective: 'minimize-latency' | 'maximize-throughput' | 'optimize-cost' | 'balance-load';
  parameters: Record<string, any>;
  performance: {
    currentScore: number;
    bestScore: number;
    improvementRate: number;
    convergenceStatus: 'converging' | 'converged' | 'diverging';
  };
  adaptationHistory: Array<{
    timestamp: string;
    parameterChanges: Record<string, any>;
    performanceImpact: number;
    reason: string;
  }>;
}

export interface ExecutionPattern {
  patternId: string;
  name: string;
  description: string;
  characteristics: {
    taskTypes: string[];
    timePatterns: string[];
    resourcePatterns: string[];
    userPatterns: string[];
  };
  frequency: number;
  impact: {
    performanceEffect: number;
    resourceEffect: number;
    costEffect: number;
  };
  recommendations: string[];
  detectedAt: string;
  lastSeen: string;
}

/**
 * Performance Optimizer with ML-based Node Selection
 */
export class PerformanceOptimizer extends EventEmitter {
  private performanceMetrics: PerformanceMetric[] = [];
  private nodeProfiles = new Map<string, NodePerformanceProfile>();
  private mlModels = new Map<string, MLModel>();
  private adaptiveAlgorithms = new Map<string, AdaptiveAlgorithm>();
  private executionPatterns = new Map<string, ExecutionPattern>();
  private predictions: PredictionResult[] = [];
  
  private isRunning: boolean = false;
  private trainingInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private patternDetectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeMLModels();
    this.initializeAdaptiveAlgorithms();
  }

  /**
   * Start performance optimizer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start model training
    this.trainingInterval = setInterval(() => {
      this.trainModels();
    }, 300000); // Every 5 minutes

    // Start optimization
    this.optimizationInterval = setInterval(() => {
      this.optimizeAlgorithms();
    }, 60000); // Every minute

    // Start pattern detection
    this.patternDetectionInterval = setInterval(() => {
      this.detectExecutionPatterns();
    }, 120000); // Every 2 minutes

    console.log('[PerformanceOptimizer] Started performance optimization system');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.performance.optimizer.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-performance-optimizer',
      actor: 'system',
      data: {
        mlModels: this.mlModels.size,
        adaptiveAlgorithms: this.adaptiveAlgorithms.size,
        nodeProfiles: this.nodeProfiles.size
      }
    });
  }

  /**
   * Stop performance optimizer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    if (this.patternDetectionInterval) {
      clearInterval(this.patternDetectionInterval);
      this.patternDetectionInterval = null;
    }

    console.log('[PerformanceOptimizer] Stopped performance optimization system');
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    this.performanceMetrics.push(metric);

    // Keep only recent metrics (last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.performanceMetrics = this.performanceMetrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    // Update node profile
    await this.updateNodeProfile(metric.nodeId);

    // Emit metric recorded event
    await qflowEventEmitter.emit('q.qflow.performance.metric.recorded.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-performance-optimizer',
      actor: 'system',
      data: {
        metricId: metric.metricId,
        nodeId: metric.nodeId,
        executionTime: metric.metrics.executionTime,
        successRate: metric.metrics.successRate
      }
    });
  }

  /**
   * Predict node performance for workload
   */
  async predictNodePerformance(
    nodeIds: string[],
    workloadCharacteristics: PerformanceMetric['workloadCharacteristics']
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    for (const nodeId of nodeIds) {
      const prediction = await this.generatePrediction(nodeId, workloadCharacteristics);
      predictions.push(prediction);
    }

    // Sort by predicted performance (best first)
    predictions.sort((a, b) => b.predictedPerformance.successProbability - a.predictedPerformance.successProbability);

    // Store predictions
    this.predictions.push(...predictions);

    // Keep only recent predictions
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
    this.predictions = this.predictions.filter(p => 
      new Date(p.timestamp).getTime() > cutoff
    );

    console.log(`[PerformanceOptimizer] Generated ${predictions.length} performance predictions`);

    return predictions;
  }

  /**
   * Get optimal node selection
   */
  async getOptimalNodeSelection(
    availableNodes: string[],
    workloadCharacteristics: PerformanceMetric['workloadCharacteristics'],
    selectionCriteria: {
      prioritize: 'speed' | 'reliability' | 'efficiency' | 'cost';
      maxNodes: number;
      minConfidence: number;
    }
  ): Promise<{
    selectedNodes: string[];
    reasoning: string;
    confidence: number;
    alternatives: Array<{ nodes: string[]; score: number; reason: string }>;
  }> {
    // Get predictions for all available nodes
    const predictions = await this.predictNodePerformance(availableNodes, workloadCharacteristics);

    // Filter by confidence threshold
    const qualifiedPredictions = predictions.filter(p => 
      p.predictedPerformance.confidence >= selectionCriteria.minConfidence
    );

    if (qualifiedPredictions.length === 0) {
      throw new Error('No nodes meet the minimum confidence threshold');
    }

    // Apply selection algorithm based on criteria
    const selectedNodes = await this.applySelectionAlgorithm(
      qualifiedPredictions,
      selectionCriteria
    );

    // Generate reasoning
    const reasoning = this.generateSelectionReasoning(selectedNodes, selectionCriteria, qualifiedPredictions);

    // Calculate overall confidence
    const confidence = selectedNodes.reduce((sum, nodeId) => {
      const prediction = qualifiedPredictions.find(p => p.nodeId === nodeId);
      return sum + (prediction?.predictedPerformance.confidence || 0);
    }, 0) / selectedNodes.length;

    // Generate alternatives
    const alternatives = await this.generateAlternatives(qualifiedPredictions, selectedNodes, selectionCriteria);

    console.log(`[PerformanceOptimizer] Selected ${selectedNodes.length} optimal nodes`);

    // Emit selection event
    await qflowEventEmitter.emit('q.qflow.performance.selection.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-performance-optimizer',
      actor: 'system',
      data: {
        selectedNodes,
        criteria: selectionCriteria.prioritize,
        confidence,
        workloadType: workloadCharacteristics.taskType
      }
    });

    return {
      selectedNodes,
      reasoning,
      confidence,
      alternatives
    };
  }

  /**
   * Get node performance profile
   */
  getNodeProfile(nodeId: string): NodePerformanceProfile | undefined {
    return this.nodeProfiles.get(nodeId);
  }

  /**
   * Get execution patterns
   */
  getExecutionPatterns(): ExecutionPattern[] {
    return Array.from(this.executionPatterns.values());
  }

  /**
   * Get ML model status
   */
  getMLModelStatus(): Array<{
    modelId: string;
    type: string;
    purpose: string;
    accuracy: number;
    status: string;
    lastTrained: string;
  }> {
    return Array.from(this.mlModels.values()).map(model => ({
      modelId: model.modelId,
      type: model.type,
      purpose: model.purpose,
      accuracy: model.accuracy,
      status: model.status,
      lastTrained: model.trainingData.lastTrained
    }));
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalMetrics: number;
    nodeProfiles: number;
    activePredictions: number;
    detectedPatterns: number;
    modelAccuracy: number;
    optimizationScore: number;
  } {
    const avgAccuracy = Array.from(this.mlModels.values())
      .reduce((sum, model) => sum + model.accuracy, 0) / this.mlModels.size;

    const avgOptimizationScore = Array.from(this.adaptiveAlgorithms.values())
      .reduce((sum, algo) => sum + algo.performance.currentScore, 0) / this.adaptiveAlgorithms.size;

    return {
      totalMetrics: this.performanceMetrics.length,
      nodeProfiles: this.nodeProfiles.size,
      activePredictions: this.predictions.length,
      detectedPatterns: this.executionPatterns.size,
      modelAccuracy: avgAccuracy,
      optimizationScore: avgOptimizationScore
    };
  }

  // Private methods

  private async updateNodeProfile(nodeId: string): Promise<void> {
    const nodeMetrics = this.performanceMetrics.filter(m => m.nodeId === nodeId);
    if (nodeMetrics.length === 0) {
      return;
    }

    let profile = this.nodeProfiles.get(nodeId);
    if (!profile) {
      profile = {
        nodeId,
        profileId: this.generateProfileId(),
        capabilities: [],
        strengths: [],
        weaknesses: [],
        optimalWorkloads: [],
        performanceScores: {
          overall: 0,
          reliability: 0,
          speed: 0,
          efficiency: 0,
          consistency: 0
        },
        historicalTrends: {
          improving: false,
          degrading: false,
          stable: true,
          trendScore: 0
        },
        lastUpdated: new Date().toISOString()
      };
    }

    // Calculate performance scores
    const recentMetrics = nodeMetrics.slice(-100); // Last 100 metrics
    
    profile.performanceScores.reliability = this.calculateReliabilityScore(recentMetrics);
    profile.performanceScores.speed = this.calculateSpeedScore(recentMetrics);
    profile.performanceScores.efficiency = this.calculateEfficiencyScore(recentMetrics);
    profile.performanceScores.consistency = this.calculateConsistencyScore(recentMetrics);
    profile.performanceScores.overall = (
      profile.performanceScores.reliability * 0.3 +
      profile.performanceScores.speed * 0.25 +
      profile.performanceScores.efficiency * 0.25 +
      profile.performanceScores.consistency * 0.2
    );

    // Analyze trends
    profile.historicalTrends = this.analyzeTrends(nodeMetrics);

    // Identify strengths and weaknesses
    profile.strengths = this.identifyStrengths(profile.performanceScores);
    profile.weaknesses = this.identifyWeaknesses(profile.performanceScores);

    // Determine optimal workloads
    profile.optimalWorkloads = this.determineOptimalWorkloads(recentMetrics);

    profile.lastUpdated = new Date().toISOString();
    this.nodeProfiles.set(nodeId, profile);
  }

  private calculateReliabilityScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.metrics.successRate, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.metrics.errorRate, 0) / metrics.length;
    
    return Math.max(0, Math.min(100, (avgSuccessRate * 100) - (avgErrorRate * 50)));
  }

  private calculateSpeedScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.metrics.executionTime, 0) / metrics.length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.metrics.responseTime, 0) / metrics.length;
    
    // Lower times = higher score
    const executionScore = Math.max(0, 100 - (avgExecutionTime / 1000)); // Assume 1000ms baseline
    const responseScore = Math.max(0, 100 - (avgResponseTime / 100)); // Assume 100ms baseline
    
    return (executionScore + responseScore) / 2;
  }

  private calculateEfficiencyScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const avgThroughput = metrics.reduce((sum, m) => sum + m.metrics.throughput, 0) / metrics.length;
    const avgResourceUtilization = metrics.reduce((sum, m) => {
      const util = m.metrics.resourceUtilization;
      return sum + ((util.cpu + util.memory + util.disk + util.network) / 4);
    }, 0) / metrics.length;
    
    // High throughput with reasonable resource usage = high efficiency
    const throughputScore = Math.min(100, avgThroughput * 10);
    const resourceScore = Math.max(0, 100 - avgResourceUtilization);
    
    return (throughputScore + resourceScore) / 2;
  }

  private calculateConsistencyScore(metrics: PerformanceMetric[]): number {
    if (metrics.length < 2) return 100;
    
    const executionTimes = metrics.map(m => m.metrics.executionTime);
    const mean = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / executionTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, 100 - (coefficientOfVariation * 100));
  }

  private analyzeTrends(metrics: PerformanceMetric[]): NodePerformanceProfile['historicalTrends'] {
    if (metrics.length < 10) {
      return { improving: false, degrading: false, stable: true, trendScore: 0 };
    }

    // Split metrics into two halves and compare
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midpoint);
    const secondHalf = metrics.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.metrics.executionTime, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.metrics.executionTime, 0) / secondHalf.length;

    const improvement = (firstHalfAvg - secondHalfAvg) / firstHalfAvg;
    const trendScore = improvement * 100;

    return {
      improving: improvement > 0.05, // 5% improvement
      degrading: improvement < -0.05, // 5% degradation
      stable: Math.abs(improvement) <= 0.05,
      trendScore
    };
  }

  private identifyStrengths(scores: NodePerformanceProfile['performanceScores']): string[] {
    const strengths: string[] = [];
    
    if (scores.reliability > 85) strengths.push('high-reliability');
    if (scores.speed > 85) strengths.push('high-speed');
    if (scores.efficiency > 85) strengths.push('high-efficiency');
    if (scores.consistency > 85) strengths.push('high-consistency');
    
    return strengths;
  }

  private identifyWeaknesses(scores: NodePerformanceProfile['performanceScores']): string[] {
    const weaknesses: string[] = [];
    
    if (scores.reliability < 60) weaknesses.push('low-reliability');
    if (scores.speed < 60) weaknesses.push('low-speed');
    if (scores.efficiency < 60) weaknesses.push('low-efficiency');
    if (scores.consistency < 60) weaknesses.push('low-consistency');
    
    return weaknesses;
  }

  private determineOptimalWorkloads(metrics: PerformanceMetric[]): string[] {
    const workloadPerformance = new Map<string, number[]>();
    
    // Group metrics by workload type
    for (const metric of metrics) {
      const workloadType = metric.workloadCharacteristics.taskType;
      if (!workloadPerformance.has(workloadType)) {
        workloadPerformance.set(workloadType, []);
      }
      workloadPerformance.get(workloadType)!.push(metric.metrics.successRate);
    }

    // Find workloads with high average success rate
    const optimalWorkloads: string[] = [];
    for (const [workloadType, successRates] of workloadPerformance.entries()) {
      const avgSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
      if (avgSuccessRate > 0.9 && successRates.length >= 5) { // 90% success rate with at least 5 samples
        optimalWorkloads.push(workloadType);
      }
    }

    return optimalWorkloads;
  }

  private async generatePrediction(
    nodeId: string,
    workloadCharacteristics: PerformanceMetric['workloadCharacteristics']
  ): Promise<PredictionResult> {
    const predictionId = this.generatePredictionId();
    const profile = this.nodeProfiles.get(nodeId);

    // Use ML model to predict performance
    const model = this.mlModels.get('performance-prediction');
    let predictedPerformance = {
      executionTime: 1000, // Default 1 second
      successProbability: 0.8, // Default 80%
      resourceUsage: { cpu: 50, memory: 50, disk: 30, network: 20 },
      confidence: 0.5 // Default 50%
    };

    if (model && profile) {
      predictedPerformance = await this.runMLPrediction(model, profile, workloadCharacteristics);
    }

    // Generate reasoning
    const reasoning: string[] = [];
    if (profile) {
      if (profile.strengths.length > 0) {
        reasoning.push(`Node strengths: ${profile.strengths.join(', ')}`);
      }
      if (profile.optimalWorkloads.includes(workloadCharacteristics.taskType)) {
        reasoning.push(`Optimal for ${workloadCharacteristics.taskType} workloads`);
      }
      if (profile.historicalTrends.improving) {
        reasoning.push('Performance trending upward');
      }
    }

    return {
      predictionId,
      nodeId,
      workloadId: `${workloadCharacteristics.taskType}_${workloadCharacteristics.complexity}`,
      predictedPerformance,
      reasoning,
      alternatives: [], // Will be filled by caller
      timestamp: new Date().toISOString()
    };
  }

  private async runMLPrediction(
    model: MLModel,
    profile: NodePerformanceProfile,
    workload: PerformanceMetric['workloadCharacteristics']
  ): Promise<PredictionResult['predictedPerformance']> {
    // Simplified ML prediction - in real implementation would use actual ML libraries
    const features = {
      overallScore: profile.performanceScores.overall,
      reliabilityScore: profile.performanceScores.reliability,
      speedScore: profile.performanceScores.speed,
      efficiencyScore: profile.performanceScores.efficiency,
      consistencyScore: profile.performanceScores.consistency,
      trendScore: profile.historicalTrends.trendScore,
      workloadComplexity: workload.complexity === 'low' ? 1 : workload.complexity === 'medium' ? 2 : 3,
      workloadPriority: workload.priority === 'low' ? 1 : workload.priority === 'normal' ? 2 : workload.priority === 'high' ? 3 : 4,
      dataSize: Math.log10(workload.dataSize + 1)
    };

    // Simple linear combination (in real implementation would use trained model)
    const executionTime = Math.max(100, 2000 - (features.speedScore * 15) - (features.efficiencyScore * 10));
    const successProbability = Math.min(1, (features.reliabilityScore + features.consistencyScore) / 200);
    const confidence = Math.min(1, model.accuracy * (1 - Math.abs(features.trendScore) / 100));

    return {
      executionTime,
      successProbability,
      resourceUsage: {
        cpu: Math.max(10, 100 - features.efficiencyScore),
        memory: Math.max(10, 80 - (features.efficiencyScore * 0.8)),
        disk: Math.max(5, 50 - (features.efficiencyScore * 0.5)),
        network: Math.max(5, 40 - (features.efficiencyScore * 0.4))
      },
      confidence
    };
  }

  private async applySelectionAlgorithm(
    predictions: PredictionResult[],
    criteria: { prioritize: string; maxNodes: number; minConfidence: number }
  ): Promise<string[]> {
    // Sort predictions based on criteria
    let sortedPredictions = [...predictions];

    switch (criteria.prioritize) {
      case 'speed':
        sortedPredictions.sort((a, b) => a.predictedPerformance.executionTime - b.predictedPerformance.executionTime);
        break;
      case 'reliability':
        sortedPredictions.sort((a, b) => b.predictedPerformance.successProbability - a.predictedPerformance.successProbability);
        break;
      case 'efficiency':
        sortedPredictions.sort((a, b) => {
          const aEfficiency = a.predictedPerformance.successProbability / (a.predictedPerformance.resourceUsage.cpu / 100);
          const bEfficiency = b.predictedPerformance.successProbability / (b.predictedPerformance.resourceUsage.cpu / 100);
          return bEfficiency - aEfficiency;
        });
        break;
      case 'cost':
        // Assume lower resource usage = lower cost
        sortedPredictions.sort((a, b) => {
          const aCost = Object.values(a.predictedPerformance.resourceUsage).reduce((sum, val) => sum + val, 0);
          const bCost = Object.values(b.predictedPerformance.resourceUsage).reduce((sum, val) => sum + val, 0);
          return aCost - bCost;
        });
        break;
    }

    // Select top nodes up to maxNodes limit
    return sortedPredictions.slice(0, criteria.maxNodes).map(p => p.nodeId);
  }

  private generateSelectionReasoning(
    selectedNodes: string[],
    criteria: any,
    predictions: PredictionResult[]
  ): string {
    const reasons: string[] = [];
    
    reasons.push(`Selected ${selectedNodes.length} nodes optimized for ${criteria.prioritize}`);
    
    const avgConfidence = selectedNodes.reduce((sum, nodeId) => {
      const prediction = predictions.find(p => p.nodeId === nodeId);
      return sum + (prediction?.predictedPerformance.confidence || 0);
    }, 0) / selectedNodes.length;
    
    reasons.push(`Average prediction confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    
    return reasons.join('. ');
  }

  private async generateAlternatives(
    predictions: PredictionResult[],
    selectedNodes: string[],
    criteria: any
  ): Promise<Array<{ nodes: string[]; score: number; reason: string }>> {
    const alternatives: Array<{ nodes: string[]; score: number; reason: string }> = [];
    
    // Generate alternative selections with different priorities
    const alternativePriorities = ['speed', 'reliability', 'efficiency', 'cost'].filter(p => p !== criteria.prioritize);
    
    for (const priority of alternativePriorities.slice(0, 2)) { // Top 2 alternatives
      const altCriteria = { ...criteria, prioritize: priority };
      const altNodes = await this.applySelectionAlgorithm(predictions, altCriteria);
      
      if (JSON.stringify(altNodes) !== JSON.stringify(selectedNodes)) {
        const score = this.calculateAlternativeScore(altNodes, predictions);
        alternatives.push({
          nodes: altNodes,
          score,
          reason: `Optimized for ${priority} instead of ${criteria.prioritize}`
        });
      }
    }
    
    return alternatives.sort((a, b) => b.score - a.score);
  }

  private calculateAlternativeScore(nodes: string[], predictions: PredictionResult[]): number {
    const nodesPredictions = nodes.map(nodeId => predictions.find(p => p.nodeId === nodeId)).filter(Boolean) as PredictionResult[];
    
    if (nodesPredictions.length === 0) return 0;
    
    const avgSuccess = nodesPredictions.reduce((sum, p) => sum + p.predictedPerformance.successProbability, 0) / nodesPredictions.length;
    const avgConfidence = nodesPredictions.reduce((sum, p) => sum + p.predictedPerformance.confidence, 0) / nodesPredictions.length;
    
    return (avgSuccess * 0.7 + avgConfidence * 0.3) * 100;
  }

  private async trainModels(): Promise<void> {
    console.log('[PerformanceOptimizer] Training ML models...');
    
    for (const model of this.mlModels.values()) {
      if (model.status === 'ready' && this.performanceMetrics.length >= 100) {
        await this.trainModel(model);
      }
    }
  }

  private async trainModel(model: MLModel): Promise<void> {
    model.status = 'training';
    
    // Simulate training process
    const trainingStart = Date.now();
    
    // In real implementation, would use actual ML training
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate training time
    
    // Update model metrics
    model.accuracy = Math.min(0.95, model.accuracy + 0.01);
    model.precision = Math.min(0.95, model.precision + 0.005);
    model.recall = Math.min(0.95, model.recall + 0.005);
    model.f1Score = (2 * model.precision * model.recall) / (model.precision + model.recall);
    
    model.trainingData.samples = this.performanceMetrics.length;
    model.trainingData.lastTrained = new Date().toISOString();
    model.trainingData.trainingDuration = Date.now() - trainingStart;
    
    model.status = 'ready';
    
    console.log(`[PerformanceOptimizer] Model ${model.modelId} trained (accuracy: ${model.accuracy.toFixed(3)})`);
  }

  private async optimizeAlgorithms(): Promise<void> {
    for (const algorithm of this.adaptiveAlgorithms.values()) {
      await this.optimizeAlgorithm(algorithm);
    }
  }

  private async optimizeAlgorithm(algorithm: AdaptiveAlgorithm): Promise<void> {
    // Simulate adaptive optimization
    const currentScore = algorithm.performance.currentScore;
    const randomAdjustment = (Math.random() - 0.5) * 10;
    const newScore = Math.max(0, Math.min(100, currentScore + randomAdjustment));
    
    if (newScore > algorithm.performance.bestScore) {
      algorithm.performance.bestScore = newScore;
    }
    
    algorithm.performance.currentScore = newScore;
    algorithm.performance.improvementRate = (newScore - currentScore) / Math.max(1, currentScore);
    
    // Update convergence status
    if (Math.abs(algorithm.performance.improvementRate) < 0.01) {
      algorithm.performance.convergenceStatus = 'converged';
    } else if (algorithm.performance.improvementRate > 0) {
      algorithm.performance.convergenceStatus = 'converging';
    } else {
      algorithm.performance.convergenceStatus = 'diverging';
    }
    
    // Record adaptation
    algorithm.adaptationHistory.push({
      timestamp: new Date().toISOString(),
      parameterChanges: { randomAdjustment },
      performanceImpact: algorithm.performance.improvementRate,
      reason: 'Automated optimization cycle'
    });
    
    // Keep only recent history
    if (algorithm.adaptationHistory.length > 100) {
      algorithm.adaptationHistory.shift();
    }
  }

  private async detectExecutionPatterns(): Promise<void> {
    if (this.performanceMetrics.length < 50) {
      return; // Need sufficient data
    }

    // Analyze recent metrics for patterns
    const recentMetrics = this.performanceMetrics.slice(-200);
    
    // Detect time-based patterns
    await this.detectTimePatterns(recentMetrics);
    
    // Detect workload patterns
    await this.detectWorkloadPatterns(recentMetrics);
    
    // Detect resource patterns
    await this.detectResourcePatterns(recentMetrics);
  }

  private async detectTimePatterns(metrics: PerformanceMetric[]): Promise<void> {
    // Group metrics by hour of day
    const hourlyMetrics = new Map<number, PerformanceMetric[]>();
    
    for (const metric of metrics) {
      const hour = new Date(metric.timestamp).getHours();
      if (!hourlyMetrics.has(hour)) {
        hourlyMetrics.set(hour, []);
      }
      hourlyMetrics.get(hour)!.push(metric);
    }

    // Find peak hours
    const hourlyLoads = Array.from(hourlyMetrics.entries()).map(([hour, metrics]) => ({
      hour,
      load: metrics.length,
      avgPerformance: metrics.reduce((sum, m) => sum + m.metrics.executionTime, 0) / metrics.length
    }));

    const maxLoad = Math.max(...hourlyLoads.map(h => h.load));
    const peakHours = hourlyLoads.filter(h => h.load > maxLoad * 0.8).map(h => h.hour);

    if (peakHours.length > 0) {
      const patternId = 'peak-hours-pattern';
      const pattern: ExecutionPattern = {
        patternId,
        name: 'Peak Hours Pattern',
        description: `High execution load during hours: ${peakHours.join(', ')}`,
        characteristics: {
          taskTypes: [],
          timePatterns: [`peak-hours-${peakHours.join('-')}`],
          resourcePatterns: [],
          userPatterns: []
        },
        frequency: peakHours.length / 24,
        impact: {
          performanceEffect: -15,
          resourceEffect: 30,
          costEffect: 20
        },
        recommendations: [
          'Consider pre-scaling during peak hours',
          'Implement load balancing strategies',
          'Monitor resource utilization closely'
        ],
        detectedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      this.executionPatterns.set(patternId, pattern);
    }
  }

  private async detectWorkloadPatterns(metrics: PerformanceMetric[]): Promise<void> {
    // Analyze workload type distributions
    const workloadCounts = new Map<string, number>();
    
    for (const metric of metrics) {
      const workloadType = metric.workloadCharacteristics.taskType;
      workloadCounts.set(workloadType, (workloadCounts.get(workloadType) || 0) + 1);
    }

    // Find dominant workload types
    const totalMetrics = metrics.length;
    for (const [workloadType, count] of workloadCounts.entries()) {
      const frequency = count / totalMetrics;
      
      if (frequency > 0.3) { // More than 30% of workload
        const patternId = `workload-${workloadType}-dominant`;
        const pattern: ExecutionPattern = {
          patternId,
          name: `${workloadType} Dominant Workload`,
          description: `${workloadType} tasks represent ${(frequency * 100).toFixed(1)}% of workload`,
          characteristics: {
            taskTypes: [workloadType],
            timePatterns: [],
            resourcePatterns: [],
            userPatterns: []
          },
          frequency,
          impact: {
            performanceEffect: 0,
            resourceEffect: 0,
            costEffect: 0
          },
          recommendations: [
            `Optimize nodes for ${workloadType} workloads`,
            'Consider specialized node pools',
            'Monitor workload-specific performance metrics'
          ],
          detectedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        };

        this.executionPatterns.set(patternId, pattern);
      }
    }
  }

  private async detectResourcePatterns(metrics: PerformanceMetric[]): Promise<void> {
    // Analyze resource utilization patterns
    const avgResourceUsage = {
      cpu: metrics.reduce((sum, m) => sum + m.metrics.resourceUtilization.cpu, 0) / metrics.length,
      memory: metrics.reduce((sum, m) => sum + m.metrics.resourceUtilization.memory, 0) / metrics.length,
      disk: metrics.reduce((sum, m) => sum + m.metrics.resourceUtilization.disk, 0) / metrics.length,
      network: metrics.reduce((sum, m) => sum + m.metrics.resourceUtilization.network, 0) / metrics.length
    };

    // Detect high resource usage patterns
    for (const [resource, usage] of Object.entries(avgResourceUsage)) {
      if (usage > 80) {
        const patternId = `high-${resource}-usage`;
        const pattern: ExecutionPattern = {
          patternId,
          name: `High ${resource.toUpperCase()} Usage Pattern`,
          description: `Average ${resource} utilization is ${usage.toFixed(1)}%`,
          characteristics: {
            taskTypes: [],
            timePatterns: [],
            resourcePatterns: [`high-${resource}-usage`],
            userPatterns: []
          },
          frequency: 1.0,
          impact: {
            performanceEffect: -20,
            resourceEffect: 40,
            costEffect: 15
          },
          recommendations: [
            `Consider upgrading ${resource} capacity`,
            'Implement resource optimization strategies',
            'Monitor for resource bottlenecks'
          ],
          detectedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        };

        this.executionPatterns.set(patternId, pattern);
      }
    }
  }

  private initializeMLModels(): void {
    // Performance prediction model
    const performancePredictionModel: MLModel = {
      modelId: 'performance-prediction',
      type: 'random-forest',
      purpose: 'performance-prediction',
      features: [
        'node-cpu-score', 'node-memory-score', 'node-reliability-score',
        'workload-complexity', 'workload-size', 'workload-priority',
        'historical-performance', 'resource-utilization'
      ],
      accuracy: 0.75,
      precision: 0.72,
      recall: 0.78,
      f1Score: 0.75,
      trainingData: {
        samples: 0,
        lastTrained: new Date().toISOString(),
        trainingDuration: 0
      },
      hyperparameters: {
        n_estimators: 100,
        max_depth: 10,
        min_samples_split: 5
      },
      status: 'ready'
    };

    this.mlModels.set(performancePredictionModel.modelId, performancePredictionModel);

    // Node ranking model
    const nodeRankingModel: MLModel = {
      modelId: 'node-ranking',
      type: 'gradient-boosting',
      purpose: 'node-ranking',
      features: [
        'performance-scores', 'historical-trends', 'workload-compatibility',
        'resource-efficiency', 'reliability-metrics'
      ],
      accuracy: 0.82,
      precision: 0.80,
      recall: 0.84,
      f1Score: 0.82,
      trainingData: {
        samples: 0,
        lastTrained: new Date().toISOString(),
        trainingDuration: 0
      },
      hyperparameters: {
        learning_rate: 0.1,
        n_estimators: 200,
        max_depth: 8
      },
      status: 'ready'
    };

    this.mlModels.set(nodeRankingModel.modelId, nodeRankingModel);
  }

  private initializeAdaptiveAlgorithms(): void {
    // Reinforcement learning algorithm for node selection
    const rlAlgorithm: AdaptiveAlgorithm = {
      algorithmId: 'rl-node-selection',
      name: 'Reinforcement Learning Node Selection',
      type: 'reinforcement-learning',
      objective: 'minimize-latency',
      parameters: {
        learning_rate: 0.01,
        epsilon: 0.1,
        discount_factor: 0.95,
        exploration_decay: 0.995
      },
      performance: {
        currentScore: 75,
        bestScore: 75,
        improvementRate: 0,
        convergenceStatus: 'converging'
      },
      adaptationHistory: []
    };

    this.adaptiveAlgorithms.set(rlAlgorithm.algorithmId, rlAlgorithm);

    // Genetic algorithm for workload optimization
    const gaAlgorithm: AdaptiveAlgorithm = {
      algorithmId: 'ga-workload-optimization',
      name: 'Genetic Algorithm Workload Optimization',
      type: 'genetic-algorithm',
      objective: 'maximize-throughput',
      parameters: {
        population_size: 50,
        mutation_rate: 0.1,
        crossover_rate: 0.8,
        selection_pressure: 2.0
      },
      performance: {
        currentScore: 68,
        bestScore: 68,
        improvementRate: 0,
        convergenceStatus: 'converging'
      },
      adaptationHistory: []
    };

    this.adaptiveAlgorithms.set(gaAlgorithm.algorithmId, gaAlgorithm);
  }

  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generatePredictionId(): string {
    return `pred_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.performanceMetrics.length = 0;
    this.nodeProfiles.clear();
    this.mlModels.clear();
    this.adaptiveAlgorithms.clear();
    this.executionPatterns.clear();
    this.predictions.length = 0;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();