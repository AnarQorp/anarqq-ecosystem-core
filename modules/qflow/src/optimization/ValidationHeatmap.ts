/**
 * Validation Heatmap and Pre-warming System
 * 
 * Tracks hot validation pipeline combinations and usage patterns,
 * implements pre-warming for validation caches and WASM runtime pools,
 * and creates predictive optimization based on flow execution patterns.
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface ValidationPattern {
  patternId: string;
  layerCombination: string[];
  inputHashPrefix: string;
  policyVersion: string;
  frequency: number;
  lastSeen: string;
  averageLatency: number;
  successRate: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface HeatmapEntry {
  key: string; // Composite key: layer+inputHash+policyVersion
  hotness: number; // 0-100 scale
  accessCount: number;
  lastAccess: string;
  averageLatency: number;
  cacheHitRate: number;
  prewarmed: boolean;
  prewarmingCost: number;
  expectedBenefit: number;
}

export interface PrewarmingJob {
  jobId: string;
  patternId: string;
  layers: string[];
  inputHash: string;
  policyVersion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  resources: {
    wasmRuntimes: number;
    cacheEntries: number;
    networkConnections: number;
  };
}

export interface PredictiveModel {
  modelId: string;
  type: 'time-series' | 'pattern-matching' | 'ml-regression';
  accuracy: number;
  lastTrained: string;
  predictions: Array<{
    timestamp: string;
    patternId: string;
    expectedFrequency: number;
    confidence: number;
  }>;
}

export interface OptimizationRecommendation {
  recommendationId: string;
  type: 'prewarm-cache' | 'prewarm-runtime' | 'adjust-ttl' | 'increase-pool-size';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedBenefit: {
    latencyReduction: number; // milliseconds
    throughputIncrease: number; // percentage
    costIncrease: number; // percentage
  };
  implementation: {
    action: string;
    parameters: Record<string, any>;
    estimatedDuration: number;
  };
  validUntil: string;
}

/**
 * Validation Heatmap Manager
 */
export class ValidationHeatmap extends EventEmitter {
  private patterns = new Map<string, ValidationPattern>();
  private heatmap = new Map<string, HeatmapEntry>();
  private prewarmingJobs = new Map<string, PrewarmingJob>();
  private predictiveModels = new Map<string, PredictiveModel>();
  private recommendations: OptimizationRecommendation[] = [];
  
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private prewarmingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private config = {
    hotnessThreshold: 70, // Above this, consider for prewarming
    patternMinFrequency: 5, // Minimum frequency to track pattern
    prewarmingBatchSize: 10, // Max concurrent prewarming jobs
    heatmapRetentionDays: 7,
    predictionHorizonHours: 24,
    analysisIntervalMs: 60000, // 1 minute
    prewarmingIntervalMs: 300000, // 5 minutes
    cleanupIntervalMs: 3600000, // 1 hour
  };

  constructor() {
    super();
    this.initializePredictiveModels();
  }

  /**
   * Start validation heatmap system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start pattern analysis
    this.analysisInterval = setInterval(() => {
      this.analyzePatterns();
    }, this.config.analysisIntervalMs);

    // Start prewarming
    this.prewarmingInterval = setInterval(() => {
      this.executePrewarming();
    }, this.config.prewarmingIntervalMs);

    // Start cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    console.log('[ValidationHeatmap] Started validation heatmap and pre-warming system');

    // Emit started event
    await qflowEventEmitter.emit('q.qflow.heatmap.started.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-validation-heatmap',
      actor: 'system',
      data: {
        trackedPatterns: this.patterns.size,
        heatmapEntries: this.heatmap.size,
        config: this.config
      }
    });
  }

  /**
   * Stop validation heatmap system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.prewarmingInterval) {
      clearInterval(this.prewarmingInterval);
      this.prewarmingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('[ValidationHeatmap] Stopped validation heatmap system');
  }

  /**
   * Record validation pipeline usage
   */
  async recordValidationUsage(
    layers: string[],
    inputHash: string,
    policyVersion: string,
    latency: number,
    success: boolean,
    resourceUsage: { cpu: number; memory: number; network: number }
  ): Promise<void> {
    const patternId = this.generatePatternId(layers, inputHash, policyVersion);
    const heatmapKey = this.generateHeatmapKey(layers, inputHash, policyVersion);

    // Update or create pattern
    let pattern = this.patterns.get(patternId);
    if (!pattern) {
      pattern = {
        patternId,
        layerCombination: layers,
        inputHashPrefix: inputHash.substring(0, 8),
        policyVersion,
        frequency: 0,
        lastSeen: new Date().toISOString(),
        averageLatency: latency,
        successRate: success ? 1 : 0,
        resourceUsage
      };
    } else {
      // Update existing pattern with exponential moving average
      const alpha = 0.1; // Smoothing factor
      pattern.frequency++;
      pattern.lastSeen = new Date().toISOString();
      pattern.averageLatency = (1 - alpha) * pattern.averageLatency + alpha * latency;
      pattern.successRate = (1 - alpha) * pattern.successRate + alpha * (success ? 1 : 0);
      pattern.resourceUsage.cpu = (1 - alpha) * pattern.resourceUsage.cpu + alpha * resourceUsage.cpu;
      pattern.resourceUsage.memory = (1 - alpha) * pattern.resourceUsage.memory + alpha * resourceUsage.memory;
      pattern.resourceUsage.network = (1 - alpha) * pattern.resourceUsage.network + alpha * resourceUsage.network;
    }

    this.patterns.set(patternId, pattern);

    // Update heatmap entry
    await this.updateHeatmapEntry(heatmapKey, pattern, latency, success);

    // Emit usage recorded event
    await qflowEventEmitter.emit('q.qflow.validation.usage.recorded.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-validation-heatmap',
      actor: 'system',
      data: {
        patternId,
        layers,
        latency,
        success,
        frequency: pattern.frequency
      }
    });
  }

  /**
   * Get hot patterns for prewarming
   */
  getHotPatterns(limit: number = 20): HeatmapEntry[] {
    return Array.from(this.heatmap.values())
      .filter(entry => entry.hotness >= this.config.hotnessThreshold)
      .sort((a, b) => b.hotness - a.hotness)
      .slice(0, limit);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Execute prewarming job
   */
  async executePrewarmingJob(patternId: string): Promise<string> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    const jobId = this.generateJobId();
    const job: PrewarmingJob = {
      jobId,
      patternId,
      layers: pattern.layerCombination,
      inputHash: pattern.inputHashPrefix,
      policyVersion: pattern.policyVersion,
      priority: this.calculateJobPriority(pattern),
      status: 'pending',
      resources: {
        wasmRuntimes: this.calculateRequiredRuntimes(pattern),
        cacheEntries: this.calculateRequiredCacheEntries(pattern),
        networkConnections: this.calculateRequiredConnections(pattern)
      }
    };

    this.prewarmingJobs.set(jobId, job);

    // Execute prewarming
    await this.performPrewarming(job);

    console.log(`[ValidationHeatmap] Executed prewarming job: ${jobId} for pattern: ${patternId}`);

    // Emit job completed event
    await qflowEventEmitter.emit('q.qflow.prewarming.job.completed.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-validation-heatmap',
      actor: 'system',
      data: {
        jobId,
        patternId,
        duration: job.duration,
        resources: job.resources
      }
    });

    return jobId;
  }

  /**
   * Get prewarming statistics
   */
  getPrewarmingStats(): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    resourcesSaved: {
      totalLatencyReduction: number;
      cacheHitImprovement: number;
      runtimePoolEfficiency: number;
    };
  } {
    const jobs = Array.from(this.prewarmingJobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');

    const averageDuration = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length
      : 0;

    // Calculate resource savings
    const hotEntries = Array.from(this.heatmap.values()).filter(e => e.prewarmed);
    const totalLatencyReduction = hotEntries.reduce((sum, e) => sum + (e.averageLatency * 0.3), 0); // 30% reduction
    const cacheHitImprovement = hotEntries.reduce((sum, e) => sum + e.cacheHitRate, 0) / Math.max(1, hotEntries.length);
    const runtimePoolEfficiency = this.calculateRuntimePoolEfficiency();

    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageDuration,
      resourcesSaved: {
        totalLatencyReduction,
        cacheHitImprovement,
        runtimePoolEfficiency
      }
    };
  }

  // Private methods

  private async updateHeatmapEntry(
    key: string,
    pattern: ValidationPattern,
    latency: number,
    success: boolean
  ): Promise<void> {
    let entry = this.heatmap.get(key);
    if (!entry) {
      entry = {
        key,
        hotness: 0,
        accessCount: 0,
        lastAccess: new Date().toISOString(),
        averageLatency: latency,
        cacheHitRate: 0,
        prewarmed: false,
        prewarmingCost: 0,
        expectedBenefit: 0
      };
    }

    // Update entry
    entry.accessCount++;
    entry.lastAccess = new Date().toISOString();
    entry.averageLatency = (entry.averageLatency * 0.9) + (latency * 0.1);

    // Calculate hotness based on frequency, recency, and performance
    const frequencyScore = Math.min(100, pattern.frequency * 2);
    const recencyScore = this.calculateRecencyScore(entry.lastAccess);
    const performanceScore = success ? 100 : 50;

    entry.hotness = (frequencyScore * 0.5) + (recencyScore * 0.3) + (performanceScore * 0.2);

    // Calculate expected benefit
    entry.expectedBenefit = this.calculateExpectedBenefit(entry, pattern);

    this.heatmap.set(key, entry);
  }

  private calculateRecencyScore(lastAccess: string): number {
    const now = Date.now();
    const accessTime = new Date(lastAccess).getTime();
    const ageHours = (now - accessTime) / (1000 * 60 * 60);

    // Score decreases with age, 100 for recent, 0 for very old
    return Math.max(0, 100 - (ageHours * 5));
  }

  private calculateExpectedBenefit(entry: HeatmapEntry, pattern: ValidationPattern): number {
    // Benefit = frequency * latency_reduction * success_rate
    const latencyReduction = entry.averageLatency * 0.3; // 30% reduction from prewarming
    const frequencyFactor = Math.min(10, pattern.frequency / 10);
    const successFactor = pattern.successRate;

    return latencyReduction * frequencyFactor * successFactor;
  }

  private async analyzePatterns(): Promise<void> {
    // Update predictive models
    await this.updatePredictiveModels();

    // Generate optimization recommendations
    await this.generateOptimizationRecommendations();

    // Update hotness scores
    this.updateHotnessScores();

    console.log(`[ValidationHeatmap] Analyzed ${this.patterns.size} patterns, ${this.heatmap.size} heatmap entries`);
  }

  private async executePrewarming(): Promise<void> {
    const hotPatterns = this.getHotPatterns(this.config.prewarmingBatchSize);
    const activeJobs = Array.from(this.prewarmingJobs.values()).filter(j => j.status === 'running').length;

    if (activeJobs >= this.config.prewarmingBatchSize) {
      return; // Too many active jobs
    }

    const availableSlots = this.config.prewarmingBatchSize - activeJobs;
    const patternsToPrewarm = hotPatterns
      .filter(entry => !entry.prewarmed && entry.expectedBenefit > 10)
      .slice(0, availableSlots);

    for (const entry of patternsToPrewarm) {
      const pattern = Array.from(this.patterns.values()).find(p => 
        this.generateHeatmapKey(p.layerCombination, p.inputHashPrefix, p.policyVersion) === entry.key
      );

      if (pattern) {
        try {
          await this.executePrewarmingJob(pattern.patternId);
        } catch (error) {
          console.error(`[ValidationHeatmap] Prewarming failed for pattern ${pattern.patternId}:`, error);
        }
      }
    }
  }

  private async performPrewarming(job: PrewarmingJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      const startTime = Date.now();

      // Prewarm validation caches
      await this.prewarmValidationCaches(job);

      // Prewarm WASM runtime pools
      await this.prewarmWasmRuntimes(job);

      // Prewarm network connections
      await this.prewarmNetworkConnections(job);

      job.duration = Date.now() - startTime;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();

      // Mark heatmap entry as prewarmed
      const heatmapKey = this.generateHeatmapKey(job.layers, job.inputHash, job.policyVersion);
      const entry = this.heatmap.get(heatmapKey);
      if (entry) {
        entry.prewarmed = true;
        entry.prewarmingCost = job.duration || 0;
      }

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      throw error;
    }
  }

  private async prewarmValidationCaches(job: PrewarmingJob): Promise<void> {
    // Simulate cache prewarming
    const cacheKeys = job.layers.map(layer => `${layer}:${job.inputHash}:${job.policyVersion}`);
    
    for (const key of cacheKeys) {
      // In real implementation, would populate actual validation caches
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate cache population
    }

    console.log(`[ValidationHeatmap] Prewarmed ${cacheKeys.length} validation cache entries for job ${job.jobId}`);
  }

  private async prewarmWasmRuntimes(job: PrewarmingJob): Promise<void> {
    // Simulate WASM runtime pool prewarming
    for (let i = 0; i < job.resources.wasmRuntimes; i++) {
      // In real implementation, would initialize WASM runtimes
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate runtime initialization
    }

    console.log(`[ValidationHeatmap] Prewarmed ${job.resources.wasmRuntimes} WASM runtimes for job ${job.jobId}`);
  }

  private async prewarmNetworkConnections(job: PrewarmingJob): Promise<void> {
    // Simulate network connection prewarming
    for (let i = 0; i < job.resources.networkConnections; i++) {
      // In real implementation, would establish network connections
      await new Promise(resolve => setTimeout(resolve, 20)); // Simulate connection establishment
    }

    console.log(`[ValidationHeatmap] Prewarmed ${job.resources.networkConnections} network connections for job ${job.jobId}`);
  }

  private calculateJobPriority(pattern: ValidationPattern): 'low' | 'medium' | 'high' | 'critical' {
    if (pattern.frequency > 100 && pattern.averageLatency > 1000) {
      return 'critical';
    } else if (pattern.frequency > 50 && pattern.averageLatency > 500) {
      return 'high';
    } else if (pattern.frequency > 20) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateRequiredRuntimes(pattern: ValidationPattern): number {
    // Base on frequency and resource usage
    return Math.min(10, Math.ceil(pattern.frequency / 20));
  }

  private calculateRequiredCacheEntries(pattern: ValidationPattern): number {
    // One entry per layer combination
    return pattern.layerCombination.length;
  }

  private calculateRequiredConnections(pattern: ValidationPattern): number {
    // Base on network usage
    return Math.min(5, Math.ceil(pattern.resourceUsage.network / 20));
  }

  private calculateRuntimePoolEfficiency(): number {
    // Simulate runtime pool efficiency calculation
    const totalRuntimes = Array.from(this.prewarmingJobs.values())
      .filter(j => j.status === 'completed')
      .reduce((sum, j) => sum + j.resources.wasmRuntimes, 0);

    const utilizationRate = Math.min(100, totalRuntimes * 0.8); // 80% utilization
    return utilizationRate;
  }

  private async updatePredictiveModels(): Promise<void> {
    for (const model of this.predictiveModels.values()) {
      await this.trainPredictiveModel(model);
    }
  }

  private async trainPredictiveModel(model: PredictiveModel): Promise<void> {
    // Simple time-series prediction based on pattern frequency
    const predictions: PredictiveModel['predictions'] = [];
    const now = Date.now();

    for (const pattern of this.patterns.values()) {
      if (pattern.frequency >= this.config.patternMinFrequency) {
        // Predict frequency for next 24 hours
        for (let hour = 1; hour <= this.config.predictionHorizonHours; hour++) {
          const futureTime = new Date(now + (hour * 60 * 60 * 1000));
          
          // Simple prediction: current frequency with some decay
          const decayFactor = Math.pow(0.95, hour); // 5% decay per hour
          const expectedFrequency = pattern.frequency * decayFactor;
          const confidence = Math.max(0.3, 1 - (hour / this.config.predictionHorizonHours));

          predictions.push({
            timestamp: futureTime.toISOString(),
            patternId: pattern.patternId,
            expectedFrequency,
            confidence
          });
        }
      }
    }

    model.predictions = predictions;
    model.lastTrained = new Date().toISOString();
    model.accuracy = Math.min(0.9, model.accuracy + 0.01); // Gradually improve accuracy

    console.log(`[ValidationHeatmap] Updated predictive model ${model.modelId} with ${predictions.length} predictions`);
  }

  private async generateOptimizationRecommendations(): Promise<void> {
    this.recommendations = []; // Clear old recommendations

    // Analyze hot patterns for prewarming recommendations
    const hotPatterns = this.getHotPatterns(50);
    
    for (const entry of hotPatterns) {
      if (!entry.prewarmed && entry.expectedBenefit > 20) {
        const recommendation: OptimizationRecommendation = {
          recommendationId: this.generateRecommendationId(),
          type: 'prewarm-cache',
          priority: entry.hotness > 90 ? 'critical' : entry.hotness > 80 ? 'high' : 'medium',
          description: `Prewarm validation cache for hot pattern (hotness: ${entry.hotness.toFixed(1)})`,
          expectedBenefit: {
            latencyReduction: entry.averageLatency * 0.3,
            throughputIncrease: 15,
            costIncrease: 5
          },
          implementation: {
            action: 'prewarm-validation-cache',
            parameters: { heatmapKey: entry.key },
            estimatedDuration: 30000 // 30 seconds
          },
          validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        };

        this.recommendations.push(recommendation);
      }
    }

    // Analyze runtime pool utilization
    const poolEfficiency = this.calculateRuntimePoolEfficiency();
    if (poolEfficiency < 60) {
      const recommendation: OptimizationRecommendation = {
        recommendationId: this.generateRecommendationId(),
        type: 'increase-pool-size',
        priority: 'medium',
        description: `Increase WASM runtime pool size (current efficiency: ${poolEfficiency.toFixed(1)}%)`,
        expectedBenefit: {
          latencyReduction: 200,
          throughputIncrease: 25,
          costIncrease: 10
        },
        implementation: {
          action: 'increase-runtime-pool',
          parameters: { targetSize: Math.ceil(poolEfficiency * 1.5) },
          estimatedDuration: 60000 // 1 minute
        },
        validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      };

      this.recommendations.push(recommendation);
    }

    console.log(`[ValidationHeatmap] Generated ${this.recommendations.length} optimization recommendations`);
  }

  private updateHotnessScores(): void {
    const now = Date.now();
    
    for (const entry of this.heatmap.values()) {
      // Decay hotness over time
      const ageHours = (now - new Date(entry.lastAccess).getTime()) / (1000 * 60 * 60);
      const decayFactor = Math.pow(0.9, ageHours / 24); // 10% decay per day
      entry.hotness *= decayFactor;
    }
  }

  private cleanup(): void {
    const cutoff = Date.now() - (this.config.heatmapRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up old patterns
    for (const [patternId, pattern] of this.patterns.entries()) {
      if (new Date(pattern.lastSeen).getTime() < cutoff) {
        this.patterns.delete(patternId);
      }
    }

    // Clean up old heatmap entries
    for (const [key, entry] of this.heatmap.entries()) {
      if (new Date(entry.lastAccess).getTime() < cutoff) {
        this.heatmap.delete(key);
      }
    }

    // Clean up completed prewarming jobs
    for (const [jobId, job] of this.prewarmingJobs.entries()) {
      if (job.status === 'completed' && job.completedAt) {
        const completedTime = new Date(job.completedAt).getTime();
        if (completedTime < cutoff) {
          this.prewarmingJobs.delete(jobId);
        }
      }
    }

    // Clean up expired recommendations
    const now = new Date().toISOString();
    this.recommendations = this.recommendations.filter(rec => rec.validUntil > now);

    console.log(`[ValidationHeatmap] Cleanup completed: ${this.patterns.size} patterns, ${this.heatmap.size} heatmap entries`);
  }

  private initializePredictiveModels(): void {
    const timeSeriesModel: PredictiveModel = {
      modelId: 'time-series-frequency',
      type: 'time-series',
      accuracy: 0.7,
      lastTrained: new Date().toISOString(),
      predictions: []
    };

    const patternMatchingModel: PredictiveModel = {
      modelId: 'pattern-matching',
      type: 'pattern-matching',
      accuracy: 0.75,
      lastTrained: new Date().toISOString(),
      predictions: []
    };

    this.predictiveModels.set(timeSeriesModel.modelId, timeSeriesModel);
    this.predictiveModels.set(patternMatchingModel.modelId, patternMatchingModel);
  }

  // Utility methods

  private generatePatternId(layers: string[], inputHash: string, policyVersion: string): string {
    const layersStr = layers.sort().join('|');
    const hashPrefix = inputHash.substring(0, 8);
    return `pattern_${this.hashString(layersStr + hashPrefix + policyVersion)}`;
  }

  private generateHeatmapKey(layers: string[], inputHash: string, policyVersion: string): string {
    const layersStr = layers.sort().join('|');
    const hashPrefix = inputHash.substring(0, 8);
    return `${layersStr}:${hashPrefix}:${policyVersion}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
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
    console.log('[ValidationHeatmap] Configuration updated');
  }

  /**
   * Get system statistics
   */
  getStats(): {
    patterns: number;
    heatmapEntries: number;
    hotPatterns: number;
    activeJobs: number;
    recommendations: number;
    predictiveModels: number;
  } {
    return {
      patterns: this.patterns.size,
      heatmapEntries: this.heatmap.size,
      hotPatterns: this.getHotPatterns().length,
      activeJobs: Array.from(this.prewarmingJobs.values()).filter(j => j.status === 'running').length,
      recommendations: this.recommendations.length,
      predictiveModels: this.predictiveModels.size
    };
  }

  /**
   * Force analysis cycle
   */
  async forceAnalysis(): Promise<void> {
    await this.analyzePatterns();
  }

  /**
   * Force prewarming cycle
   */
  async forcePrewarming(): Promise<void> {
    await this.executePrewarming();
  }
}

// Export singleton instance
export const validationHeatmap = new ValidationHeatmap();