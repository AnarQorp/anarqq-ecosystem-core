/**
 * Intelligent Load Distribution Across Nodes
 * 
 * Implements load balancing algorithms for execution distribution,
 * real-time load monitoring and adjustment, and predictive scaling
 * based on demand patterns
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { QNETNode } from '../network/QNETNodeManager.js';

export interface LoadBalancingStrategy {
  name: 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'least-response-time' | 'resource-based' | 'predictive';
  parameters: Record<string, any>;
}

export interface NodeLoad {
  nodeId: string;
  cpuUtilization: number; // 0-100
  memoryUtilization: number; // 0-100
  networkUtilization: number; // 0-100
  diskUtilization: number; // 0-100
  activeConnections: number;
  queuedTasks: number;
  averageResponseTime: number; // milliseconds
  throughput: number; // tasks per second
  errorRate: number; // 0-1
  lastUpdated: string;
}

export interface LoadBalancingDecision {
  decisionId: string;
  selectedNode: string;
  strategy: string;
  score: number;
  alternatives: Array<{
    nodeId: string;
    score: number;
    reason: string;
  }>;
  factors: Record<string, number>;
  timestamp: string;
}

export interface PredictiveModel {
  modelId: string;
  type: 'linear-regression' | 'exponential-smoothing' | 'arima' | 'neural-network';
  parameters: Record<string, any>;
  accuracy: number; // 0-1
  lastTrained: string;
  predictions: Array<{
    timestamp: string;
    predictedLoad: number;
    confidence: number;
  }>;
}

export interface LoadPattern {
  patternId: string;
  name: string;
  description: string;
  timeWindows: Array<{
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
    expectedLoad: number;
    variance: number;
  }>;
  seasonality: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  triggers: string[];
}

export interface ScalingRecommendation {
  recommendationId: string;
  type: 'scale-up' | 'scale-down' | 'redistribute' | 'no-action';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  targetNodes: string[];
  expectedImpact: {
    loadReduction: number;
    responseTimeImprovement: number;
    costIncrease: number;
  };
  confidence: number; // 0-1
  validUntil: string;
}

/**
 * Intelligent Load Balancer
 */
export class IntelligentLoadBalancer extends EventEmitter {
  private nodeLoads = new Map<string, NodeLoad>();
  private loadHistory: Array<{ timestamp: string; loads: Map<string, NodeLoad> }> = [];
  private decisions: LoadBalancingDecision[] = [];
  private predictiveModels = new Map<string, PredictiveModel>();
  private loadPatterns = new Map<string, LoadPattern>();
  private scalingRecommendations: ScalingRecommendation[] = [];
  
  private currentStrategy: LoadBalancingStrategy = {
    name: 'resource-based',
    parameters: {
      cpuWeight: 0.3,
      memoryWeight: 0.3,
      responseTimeWeight: 0.2,
      throughputWeight: 0.2
    }
  };

  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private predictionInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeLoadPatterns();
    this.initializePredictiveModels();
  }

  /**
   * Start load balancer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start monitoring
    this.monitoringInterval = setInterval(() => {
      this.updateLoadMetrics();
    }, 5000); // Every 5 seconds

    // Start predictive analysis
    this.predictionInterval = setInterval(() => {
      this.performPredictiveAnalysis();
    }, 60000); // Every minute

    console.log('[IntelligentLoadBalancer] Started load balancing system');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.loadbalancer.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-load-balancer',
      actor: 'system',
      data: {
        strategy: this.currentStrategy.name,
        monitoredNodes: this.nodeLoads.size
      }
    });
  }

  /**
   * Stop load balancer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }

    console.log('[IntelligentLoadBalancer] Stopped load balancing system');
  }

  /**
   * Select best node for task execution
   */
  async selectNode(
    availableNodes: QNETNode[],
    taskRequirements: {
      cpuRequired: number;
      memoryRequired: number;
      estimatedDuration: number;
      priority: 'low' | 'normal' | 'high' | 'critical';
    }
  ): Promise<LoadBalancingDecision> {
    const decisionId = this.generateDecisionId();
    const candidates: Array<{ nodeId: string; score: number; reason: string }> = [];

    // Calculate scores for each available node
    for (const node of availableNodes) {
      const load = this.nodeLoads.get(node.nodeId);
      if (!load) {
        // New node, assume good capacity
        candidates.push({
          nodeId: node.nodeId,
          score: 100,
          reason: 'New node with unknown load'
        });
        continue;
      }

      const score = await this.calculateNodeScore(node, load, taskRequirements);
      candidates.push({
        nodeId: node.nodeId,
        score,
        reason: this.getScoreReason(score, load)
      });
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      throw new Error('No available nodes for task execution');
    }

    const selectedNode = candidates[0];
    const decision: LoadBalancingDecision = {
      decisionId,
      selectedNode: selectedNode.nodeId,
      strategy: this.currentStrategy.name,
      score: selectedNode.score,
      alternatives: candidates.slice(1, 5), // Top 4 alternatives
      factors: await this.getDecisionFactors(selectedNode.nodeId, taskRequirements),
      timestamp: new Date().toISOString()
    };

    this.decisions.push(decision);

    // Keep only recent decisions
    if (this.decisions.length > 1000) {
      this.decisions.shift();
    }

    console.log(`[IntelligentLoadBalancer] Selected node: ${selectedNode.nodeId} (score: ${selectedNode.score})`);

    // Emit decision event
    await qflowEventEmitter.emit('q.qflow.loadbalancer.decision.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-load-balancer',
      actor: 'system',
      data: {
        decisionId,
        selectedNode: selectedNode.nodeId,
        score: selectedNode.score,
        strategy: this.currentStrategy.name,
        taskPriority: taskRequirements.priority
      }
    });

    return decision;
  }

  /**
   * Update node load information
   */
  async updateNodeLoad(nodeId: string, load: Partial<NodeLoad>): Promise<void> {
    const existingLoad = this.nodeLoads.get(nodeId);
    const updatedLoad: NodeLoad = {
      nodeId,
      cpuUtilization: 0,
      memoryUtilization: 0,
      networkUtilization: 0,
      diskUtilization: 0,
      activeConnections: 0,
      queuedTasks: 0,
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
      ...existingLoad,
      ...load
    };

    this.nodeLoads.set(nodeId, updatedLoad);

    // Store in history
    this.storeLoadHistory();

    // Check for scaling recommendations
    await this.checkScalingNeeds();

    // Emit load update event
    await qflowEventEmitter.emit('q.qflow.node.load.updated.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-load-balancer',
      actor: 'system',
      data: {
        nodeId,
        load: updatedLoad
      }
    });
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.currentStrategy = strategy;
    console.log(`[IntelligentLoadBalancer] Strategy changed to: ${strategy.name}`);

    // Emit strategy change event
    qflowEventEmitter.emit('q.qflow.loadbalancer.strategy.changed.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-load-balancer',
      actor: 'system',
      data: {
        strategy: strategy.name,
        parameters: strategy.parameters
      }
    });
  }

  /**
   * Get current load distribution
   */
  getLoadDistribution(): {
    totalNodes: number;
    averageLoad: number;
    loadVariance: number;
    overloadedNodes: string[];
    underutilizedNodes: string[];
  } {
    const loads = Array.from(this.nodeLoads.values());
    
    if (loads.length === 0) {
      return {
        totalNodes: 0,
        averageLoad: 0,
        loadVariance: 0,
        overloadedNodes: [],
        underutilizedNodes: []
      };
    }

    // Calculate composite load score for each node
    const loadScores = loads.map(load => this.calculateCompositeLoad(load));
    const averageLoad = loadScores.reduce((sum, score) => sum + score, 0) / loadScores.length;
    
    // Calculate variance
    const variance = loadScores.reduce((sum, score) => sum + Math.pow(score - averageLoad, 2), 0) / loadScores.length;

    // Identify overloaded and underutilized nodes
    const overloadedNodes = loads.filter(load => this.calculateCompositeLoad(load) > 80).map(load => load.nodeId);
    const underutilizedNodes = loads.filter(load => this.calculateCompositeLoad(load) < 20).map(load => load.nodeId);

    return {
      totalNodes: loads.length,
      averageLoad,
      loadVariance: variance,
      overloadedNodes,
      underutilizedNodes
    };
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(): ScalingRecommendation[] {
    return [...this.scalingRecommendations];
  }

  /**
   * Get load predictions
   */
  getLoadPredictions(nodeId?: string): Array<{ timestamp: string; predictedLoad: number; confidence: number }> {
    if (nodeId) {
      const model = this.predictiveModels.get(nodeId);
      return model?.predictions || [];
    }

    // Return aggregated predictions
    const allPredictions: Array<{ timestamp: string; predictedLoad: number; confidence: number }> = [];
    for (const model of this.predictiveModels.values()) {
      allPredictions.push(...model.predictions);
    }

    return allPredictions;
  }

  // Private methods

  private async calculateNodeScore(
    node: QNETNode,
    load: NodeLoad,
    taskRequirements: any
  ): Promise<number> {
    let score = 100;

    switch (this.currentStrategy.name) {
      case 'round-robin':
        // Simple round-robin, all nodes get equal score
        score = 50;
        break;

      case 'least-connections':
        // Prefer nodes with fewer active connections
        score = Math.max(0, 100 - (load.activeConnections * 2));
        break;

      case 'least-response-time':
        // Prefer nodes with lower response times
        const responseTimePenalty = Math.min(50, load.averageResponseTime / 100);
        score = Math.max(0, 100 - responseTimePenalty);
        break;

      case 'resource-based':
        // Consider multiple resource factors
        const params = this.currentStrategy.parameters;
        const cpuScore = Math.max(0, 100 - load.cpuUtilization);
        const memoryScore = Math.max(0, 100 - load.memoryUtilization);
        const responseScore = Math.max(0, 100 - (load.averageResponseTime / 50));
        const throughputScore = Math.min(100, load.throughput * 10);

        score = (cpuScore * params.cpuWeight) +
                (memoryScore * params.memoryWeight) +
                (responseScore * params.responseTimeWeight) +
                (throughputScore * params.throughputWeight);
        break;

      case 'predictive':
        // Use predictive model
        const prediction = await this.getPredictedLoad(node.nodeId);
        score = Math.max(0, 100 - prediction);
        break;

      default:
        score = 50;
    }

    // Apply task-specific adjustments
    if (taskRequirements.priority === 'critical') {
      // For critical tasks, prefer nodes with lower error rates
      score *= (1 - load.errorRate);
    }

    // Check resource availability
    if (load.cpuUtilization + taskRequirements.cpuRequired > 100) {
      score *= 0.5; // Penalize if CPU would be overloaded
    }

    if (load.memoryUtilization + taskRequirements.memoryRequired > 100) {
      score *= 0.3; // Heavy penalty for memory overload
    }

    return Math.max(0, Math.min(100, score));
  }

  private getScoreReason(score: number, load: NodeLoad): string {
    if (score > 80) {
      return 'Excellent performance and low utilization';
    } else if (score > 60) {
      return 'Good performance with moderate utilization';
    } else if (score > 40) {
      return 'Average performance with high utilization';
    } else if (score > 20) {
      return 'Poor performance or overloaded';
    } else {
      return 'Critical performance issues or severely overloaded';
    }
  }

  private async getDecisionFactors(nodeId: string, taskRequirements: any): Promise<Record<string, number>> {
    const load = this.nodeLoads.get(nodeId);
    if (!load) {
      return {};
    }

    return {
      cpuUtilization: load.cpuUtilization,
      memoryUtilization: load.memoryUtilization,
      activeConnections: load.activeConnections,
      averageResponseTime: load.averageResponseTime,
      throughput: load.throughput,
      errorRate: load.errorRate,
      queuedTasks: load.queuedTasks
    };
  }

  private calculateCompositeLoad(load: NodeLoad): number {
    // Weighted average of different load metrics
    return (load.cpuUtilization * 0.4) +
           (load.memoryUtilization * 0.3) +
           (load.networkUtilization * 0.1) +
           (load.diskUtilization * 0.1) +
           (Math.min(100, load.queuedTasks * 5) * 0.1);
  }

  private storeLoadHistory(): void {
    const snapshot = {
      timestamp: new Date().toISOString(),
      loads: new Map(this.nodeLoads)
    };

    this.loadHistory.push(snapshot);

    // Keep only last 24 hours of history (assuming 5-second intervals)
    const maxEntries = (24 * 60 * 60) / 5; // 17,280 entries
    if (this.loadHistory.length > maxEntries) {
      this.loadHistory.shift();
    }
  }

  private updateLoadMetrics(): void {
    // In real implementation, would collect metrics from actual nodes
    // For now, simulate some load updates
    for (const [nodeId, load] of this.nodeLoads.entries()) {
      // Simulate small random changes in load
      const cpuChange = (Math.random() - 0.5) * 10;
      const memoryChange = (Math.random() - 0.5) * 5;
      
      load.cpuUtilization = Math.max(0, Math.min(100, load.cpuUtilization + cpuChange));
      load.memoryUtilization = Math.max(0, Math.min(100, load.memoryUtilization + memoryChange));
      load.lastUpdated = new Date().toISOString();
    }
  }

  private async performPredictiveAnalysis(): Promise<void> {
    // Update predictive models with recent data
    for (const nodeId of this.nodeLoads.keys()) {
      await this.updatePredictiveModel(nodeId);
    }

    // Generate new predictions
    await this.generatePredictions();

    // Update scaling recommendations
    await this.updateScalingRecommendations();
  }

  private async updatePredictiveModel(nodeId: string): Promise<void> {
    let model = this.predictiveModels.get(nodeId);
    if (!model) {
      model = {
        modelId: this.generateModelId(),
        type: 'exponential-smoothing',
        parameters: { alpha: 0.3, beta: 0.1, gamma: 0.1 },
        accuracy: 0.8,
        lastTrained: new Date().toISOString(),
        predictions: []
      };
      this.predictiveModels.set(nodeId, model);
    }

    // In real implementation, would train model with historical data
    model.lastTrained = new Date().toISOString();
    model.accuracy = Math.min(1, model.accuracy + 0.01); // Gradually improve accuracy
  }

  private async generatePredictions(): Promise<void> {
    const now = Date.now();
    
    for (const [nodeId, model] of this.predictiveModels.entries()) {
      const predictions: Array<{ timestamp: string; predictedLoad: number; confidence: number }> = [];
      
      // Generate predictions for next 6 hours
      for (let i = 1; i <= 6; i++) {
        const futureTime = new Date(now + (i * 60 * 60 * 1000));
        const currentLoad = this.nodeLoads.get(nodeId);
        
        // Simple prediction based on current load and time patterns
        let predictedLoad = currentLoad ? this.calculateCompositeLoad(currentLoad) : 50;
        
        // Apply time-based patterns
        const hour = futureTime.getHours();
        if (hour >= 9 && hour <= 17) {
          predictedLoad *= 1.2; // Business hours increase
        } else if (hour >= 22 || hour <= 6) {
          predictedLoad *= 0.7; // Night time decrease
        }

        // Add some randomness
        predictedLoad += (Math.random() - 0.5) * 20;
        predictedLoad = Math.max(0, Math.min(100, predictedLoad));

        predictions.push({
          timestamp: futureTime.toISOString(),
          predictedLoad,
          confidence: model.accuracy
        });
      }

      model.predictions = predictions;
    }
  }

  private async getPredictedLoad(nodeId: string): Promise<number> {
    const model = this.predictiveModels.get(nodeId);
    if (!model || model.predictions.length === 0) {
      return 50; // Default prediction
    }

    // Return the next prediction
    return model.predictions[0]?.predictedLoad || 50;
  }

  private async checkScalingNeeds(): Promise<void> {
    const distribution = this.getLoadDistribution();
    
    // Clear old recommendations
    this.scalingRecommendations = this.scalingRecommendations.filter(rec => 
      new Date(rec.validUntil) > new Date()
    );

    // Check for scale-up needs
    if (distribution.overloadedNodes.length > 0) {
      const recommendation: ScalingRecommendation = {
        recommendationId: this.generateRecommendationId(),
        type: 'scale-up',
        urgency: distribution.overloadedNodes.length > distribution.totalNodes * 0.5 ? 'high' : 'medium',
        reason: `${distribution.overloadedNodes.length} nodes are overloaded (>80% utilization)`,
        targetNodes: distribution.overloadedNodes,
        expectedImpact: {
          loadReduction: 30,
          responseTimeImprovement: 25,
          costIncrease: 20
        },
        confidence: 0.8,
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      };

      this.scalingRecommendations.push(recommendation);
    }

    // Check for scale-down opportunities
    if (distribution.underutilizedNodes.length > distribution.totalNodes * 0.3) {
      const recommendation: ScalingRecommendation = {
        recommendationId: this.generateRecommendationId(),
        type: 'scale-down',
        urgency: 'low',
        reason: `${distribution.underutilizedNodes.length} nodes are underutilized (<20% utilization)`,
        targetNodes: distribution.underutilizedNodes.slice(0, Math.floor(distribution.underutilizedNodes.length / 2)),
        expectedImpact: {
          loadReduction: -10,
          responseTimeImprovement: 0,
          costIncrease: -15
        },
        confidence: 0.7,
        validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };

      this.scalingRecommendations.push(recommendation);
    }
  }

  private async updateScalingRecommendations(): Promise<void> {
    // Use predictive models to generate proactive scaling recommendations
    const futureLoad = await this.predictFutureLoad();
    
    if (futureLoad > 80) {
      const recommendation: ScalingRecommendation = {
        recommendationId: this.generateRecommendationId(),
        type: 'scale-up',
        urgency: 'medium',
        reason: `Predicted high load (${futureLoad.toFixed(1)}%) in next hour`,
        targetNodes: [],
        expectedImpact: {
          loadReduction: 25,
          responseTimeImprovement: 20,
          costIncrease: 15
        },
        confidence: 0.75,
        validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      };

      this.scalingRecommendations.push(recommendation);
    }
  }

  private async predictFutureLoad(): Promise<number> {
    const predictions = this.getLoadPredictions();
    if (predictions.length === 0) {
      return 50;
    }

    // Average predicted load for next hour
    const nextHourPredictions = predictions.filter(p => {
      const predTime = new Date(p.timestamp).getTime();
      const now = Date.now();
      return predTime > now && predTime <= now + (60 * 60 * 1000);
    });

    if (nextHourPredictions.length === 0) {
      return 50;
    }

    return nextHourPredictions.reduce((sum, p) => sum + p.predictedLoad, 0) / nextHourPredictions.length;
  }

  private initializeLoadPatterns(): void {
    // Define common load patterns
    const businessHoursPattern: LoadPattern = {
      patternId: 'business-hours',
      name: 'Business Hours Pattern',
      description: 'Higher load during business hours (9 AM - 5 PM)',
      timeWindows: [
        {
          startHour: 9,
          endHour: 17,
          daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
          expectedLoad: 70,
          variance: 15
        }
      ],
      seasonality: {
        daily: true,
        weekly: true,
        monthly: false
      },
      triggers: ['user-activity', 'api-requests']
    };

    this.loadPatterns.set(businessHoursPattern.patternId, businessHoursPattern);
  }

  private initializePredictiveModels(): void {
    // Initialize with default models
    // Real implementation would load from persistent storage
  }

  private generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateModelId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.nodeLoads.clear();
    this.loadHistory.length = 0;
    this.decisions.length = 0;
    this.predictiveModels.clear();
    this.loadPatterns.clear();
    this.scalingRecommendations.length = 0;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const intelligentLoadBalancer = new IntelligentLoadBalancer();