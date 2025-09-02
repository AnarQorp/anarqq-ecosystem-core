/**
 * Validation Heatmap
 * 
 * Tracks hot validation pipeline combinations and usage patterns
 * to enable predictive optimization and pre-warming strategies.
 */

import { EventEmitter } from 'events';

export interface ValidationHeatmapConfig {
  enableTracking: boolean;
  maxHeatmapEntries: number;
  decayFactor: number;
  minHeatThreshold: number;
  aggregationInterval: number;
  persistenceEnabled: boolean;
}

export interface ValidationPattern {
  pipelineId: string;
  layers: string[];
  inputHash: string;
  policyVersion: string;
  frequency: number;
  lastAccessed: number;
  averageLatency: number;
  successRate: number;
  cacheHitRate: number;
}

export interface HeatmapEntry {
  pattern: ValidationPattern;
  heatScore: number;
  trend: 'rising' | 'stable' | 'declining';
  predictedNextAccess: number;
  preWarmingCandidate: boolean;
}

export interface ValidationUsageStats {
  totalValidations: number;
  uniquePatterns: number;
  hotPatterns: number;
  cacheEfficiency: number;
  averageLatency: number;
  topPatterns: HeatmapEntry[];
}

export interface PreWarmingRecommendation {
  pattern: ValidationPattern;
  priority: 'high' | 'medium' | 'low';
  estimatedBenefit: number;
  resourceCost: number;
  recommendedAction: 'cache' | 'pool' | 'both';
  reasoning: string;
}

export class ValidationHeatmap extends EventEmitter {
  private config: ValidationHeatmapConfig;
  private heatmap: Map<string, HeatmapEntry>;
  private accessHistory: Map<string, number[]>;
  private aggregationTimer: NodeJS.Timeout | null;
  private lastDecayTime: number;

  constructor(config: ValidationHeatmapConfig) {
    super();
    this.config = config;
    this.heatmap = new Map();
    this.accessHistory = new Map();
    this.aggregationTimer = null;
    this.lastDecayTime = Date.now();

    if (this.config.enableTracking) {
      this.startAggregation();
    }
  }

  /**
   * Record a validation pipeline access
   */
  public recordValidation(
    layers: string[],
    inputHash: string,
    policyVersion: string,
    latency: number,
    success: boolean,
    cacheHit: boolean
  ): void {
    if (!this.config.enableTracking) {
      return;
    }

    const pipelineId = this.generatePipelineId(layers, policyVersion);
    const patternKey = this.generatePatternKey(pipelineId, inputHash);
    
    // Update or create pattern
    const existingEntry = this.heatmap.get(patternKey);
    
    if (existingEntry) {
      this.updateExistingPattern(existingEntry, latency, success, cacheHit);
    } else {
      this.createNewPattern(patternKey, layers, inputHash, policyVersion, latency, success, cacheHit);
    }

    // Record access time for trend analysis
    this.recordAccessTime(patternKey);

    // Emit tracking event
    this.emit('validation_tracked', {
      patternKey,
      pipelineId,
      latency,
      success,
      cacheHit,
      timestamp: Date.now()
    });
  }

  /**
   * Get current validation usage statistics
   */
  public getUsageStats(): ValidationUsageStats {
    const entries = Array.from(this.heatmap.values());
    const hotPatterns = entries.filter(entry => entry.heatScore >= this.config.minHeatThreshold);
    
    const totalValidations = entries.reduce((sum, entry) => sum + entry.pattern.frequency, 0);
    const totalLatency = entries.reduce((sum, entry) => sum + (entry.pattern.averageLatency * entry.pattern.frequency), 0);
    const totalCacheHits = entries.reduce((sum, entry) => sum + (entry.pattern.cacheHitRate * entry.pattern.frequency), 0);

    return {
      totalValidations,
      uniquePatterns: entries.length,
      hotPatterns: hotPatterns.length,
      cacheEfficiency: totalValidations > 0 ? totalCacheHits / totalValidations : 0,
      averageLatency: totalValidations > 0 ? totalLatency / totalValidations : 0,
      topPatterns: hotPatterns
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, 10)
    };
  }

  /**
   * Get pre-warming recommendations
   */
  public getPreWarmingRecommendations(): PreWarmingRecommendation[] {
    const recommendations: PreWarmingRecommendation[] = [];
    const hotEntries = Array.from(this.heatmap.values())
      .filter(entry => entry.preWarmingCandidate)
      .sort((a, b) => b.heatScore - a.heatScore);

    for (const entry of hotEntries.slice(0, 20)) { // Top 20 candidates
      const recommendation = this.generateRecommendation(entry);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.estimatedBenefit) - 
             (priorityWeight[a.priority] * a.estimatedBenefit);
    });
  }

  /**
   * Get hot validation patterns
   */
  public getHotPatterns(limit: number = 50): HeatmapEntry[] {
    return Array.from(this.heatmap.values())
      .filter(entry => entry.heatScore >= this.config.minHeatThreshold)
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, limit);
  }

  /**
   * Predict next access time for a pattern
   */
  public predictNextAccess(patternKey: string): number | null {
    const entry = this.heatmap.get(patternKey);
    if (!entry) {
      return null;
    }

    const accessTimes = this.accessHistory.get(patternKey) || [];
    if (accessTimes.length < 2) {
      return null;
    }

    // Simple prediction based on average interval
    const intervals = [];
    for (let i = 1; i < accessTimes.length; i++) {
      intervals.push(accessTimes[i] - accessTimes[i - 1]);
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return entry.pattern.lastAccessed + averageInterval;
  }

  /**
   * Check if pattern should be pre-warmed
   */
  public shouldPreWarm(patternKey: string): boolean {
    const entry = this.heatmap.get(patternKey);
    if (!entry) {
      return false;
    }

    const predictedAccess = this.predictNextAccess(patternKey);
    if (!predictedAccess) {
      return false;
    }

    const timeUntilAccess = predictedAccess - Date.now();
    const preWarmWindow = 5 * 60 * 1000; // 5 minutes

    return timeUntilAccess <= preWarmWindow && 
           entry.heatScore >= this.config.minHeatThreshold &&
           entry.pattern.cacheHitRate < 0.8; // Low cache hit rate indicates benefit
  }

  /**
   * Start aggregation and decay process
   */
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.performAggregation();
      this.applyDecay();
      this.updateTrends();
      this.identifyPreWarmingCandidates();
    }, this.config.aggregationInterval);
  }

  /**
   * Stop aggregation process
   */
  public stop(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }

  /**
   * Generate pipeline ID from layers and policy version
   */
  private generatePipelineId(layers: string[], policyVersion: string): string {
    return `${layers.join('->')}_v${policyVersion}`;
  }

  /**
   * Generate pattern key from pipeline ID and input hash
   */
  private generatePatternKey(pipelineId: string, inputHash: string): string {
    return `${pipelineId}:${inputHash}`;
  }

  /**
   * Update existing validation pattern
   */
  private updateExistingPattern(
    entry: HeatmapEntry,
    latency: number,
    success: boolean,
    cacheHit: boolean
  ): void {
    const pattern = entry.pattern;
    const oldFreq = pattern.frequency;
    
    // Update frequency
    pattern.frequency++;
    pattern.lastAccessed = Date.now();
    
    // Update running averages
    pattern.averageLatency = ((pattern.averageLatency * oldFreq) + latency) / pattern.frequency;
    pattern.successRate = ((pattern.successRate * oldFreq) + (success ? 1 : 0)) / pattern.frequency;
    pattern.cacheHitRate = ((pattern.cacheHitRate * oldFreq) + (cacheHit ? 1 : 0)) / pattern.frequency;
    
    // Recalculate heat score
    entry.heatScore = this.calculateHeatScore(pattern);
  }

  /**
   * Create new validation pattern
   */
  private createNewPattern(
    patternKey: string,
    layers: string[],
    inputHash: string,
    policyVersion: string,
    latency: number,
    success: boolean,
    cacheHit: boolean
  ): void {
    const pipelineId = this.generatePipelineId(layers, policyVersion);
    
    const pattern: ValidationPattern = {
      pipelineId,
      layers: [...layers],
      inputHash,
      policyVersion,
      frequency: 1,
      lastAccessed: Date.now(),
      averageLatency: latency,
      successRate: success ? 1 : 0,
      cacheHitRate: cacheHit ? 1 : 0
    };

    const entry: HeatmapEntry = {
      pattern,
      heatScore: this.calculateHeatScore(pattern),
      trend: 'stable',
      predictedNextAccess: 0,
      preWarmingCandidate: false
    };

    this.heatmap.set(patternKey, entry);

    // Cleanup if we exceed max entries
    if (this.heatmap.size > this.config.maxHeatmapEntries) {
      this.cleanupOldEntries();
    }
  }

  /**
   * Calculate heat score for a pattern
   */
  private calculateHeatScore(pattern: ValidationPattern): number {
    const now = Date.now();
    const timeSinceAccess = now - pattern.lastAccessed;
    const hoursSinceAccess = timeSinceAccess / (1000 * 60 * 60);
    
    // Base score from frequency
    let score = Math.log(pattern.frequency + 1);
    
    // Time decay factor
    const timeDecay = Math.exp(-hoursSinceAccess / 24); // Decay over 24 hours
    score *= timeDecay;
    
    // Boost for high latency patterns (more benefit from caching)
    if (pattern.averageLatency > 100) {
      score *= 1.5;
    }
    
    // Boost for low cache hit rate (more room for improvement)
    if (pattern.cacheHitRate < 0.5) {
      score *= 1.3;
    }
    
    // Penalty for low success rate
    score *= pattern.successRate;
    
    return score;
  }

  /**
   * Record access time for trend analysis
   */
  private recordAccessTime(patternKey: string): void {
    const accessTimes = this.accessHistory.get(patternKey) || [];
    accessTimes.push(Date.now());
    
    // Keep only recent access times (last 100)
    if (accessTimes.length > 100) {
      accessTimes.shift();
    }
    
    this.accessHistory.set(patternKey, accessTimes);
  }

  /**
   * Perform periodic aggregation
   */
  private performAggregation(): void {
    const stats = this.getUsageStats();
    
    this.emit('aggregation_complete', {
      stats,
      timestamp: Date.now(),
      heatmapSize: this.heatmap.size
    });
  }

  /**
   * Apply decay to heat scores
   */
  private applyDecay(): void {
    const now = Date.now();
    const timeSinceDecay = now - this.lastDecayTime;
    const hoursSinceDecay = timeSinceDecay / (1000 * 60 * 60);
    
    if (hoursSinceDecay >= 1) { // Apply decay every hour
      for (const entry of this.heatmap.values()) {
        entry.heatScore *= this.config.decayFactor;
      }
      
      this.lastDecayTime = now;
      
      this.emit('decay_applied', {
        decayFactor: this.config.decayFactor,
        timestamp: now
      });
    }
  }

  /**
   * Update trends for patterns
   */
  private updateTrends(): void {
    for (const [patternKey, entry] of this.heatmap.entries()) {
      const accessTimes = this.accessHistory.get(patternKey) || [];
      
      if (accessTimes.length >= 3) {
        const recentAccesses = accessTimes.slice(-10); // Last 10 accesses
        const intervals = [];
        
        for (let i = 1; i < recentAccesses.length; i++) {
          intervals.push(recentAccesses[i] - recentAccesses[i - 1]);
        }
        
        if (intervals.length >= 2) {
          const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
          const recentInterval = intervals[intervals.length - 1];
          
          if (recentInterval < avgInterval * 0.8) {
            entry.trend = 'rising';
          } else if (recentInterval > avgInterval * 1.2) {
            entry.trend = 'declining';
          } else {
            entry.trend = 'stable';
          }
        }
      }
      
      // Update predicted next access
      entry.predictedNextAccess = this.predictNextAccess(patternKey) || 0;
    }
  }

  /**
   * Identify pre-warming candidates
   */
  private identifyPreWarmingCandidates(): void {
    for (const entry of this.heatmap.values()) {
      entry.preWarmingCandidate = 
        entry.heatScore >= this.config.minHeatThreshold &&
        entry.pattern.cacheHitRate < 0.8 &&
        entry.pattern.averageLatency > 50 &&
        (entry.trend === 'rising' || entry.trend === 'stable');
    }
  }

  /**
   * Generate pre-warming recommendation
   */
  private generateRecommendation(entry: HeatmapEntry): PreWarmingRecommendation | null {
    const pattern = entry.pattern;
    
    if (!entry.preWarmingCandidate) {
      return null;
    }

    const estimatedBenefit = this.calculateEstimatedBenefit(pattern);
    const resourceCost = this.calculateResourceCost(pattern);
    
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (entry.heatScore > this.config.minHeatThreshold * 3) {
      priority = 'high';
    } else if (entry.heatScore > this.config.minHeatThreshold * 1.5) {
      priority = 'medium';
    }

    let recommendedAction: 'cache' | 'pool' | 'both' = 'cache';
    if (pattern.layers.includes('wasm-execution')) {
      recommendedAction = pattern.cacheHitRate < 0.5 ? 'both' : 'pool';
    }

    const reasoning = this.generateRecommendationReasoning(pattern, entry);

    return {
      pattern,
      priority,
      estimatedBenefit,
      resourceCost,
      recommendedAction,
      reasoning
    };
  }

  /**
   * Calculate estimated benefit of pre-warming
   */
  private calculateEstimatedBenefit(pattern: ValidationPattern): number {
    // Benefit is based on frequency, latency, and cache miss rate
    const frequencyFactor = Math.min(pattern.frequency / 100, 1); // Normalize to 0-1
    const latencyFactor = Math.min(pattern.averageLatency / 1000, 1); // Normalize to 0-1
    const cacheMissFactor = 1 - pattern.cacheHitRate;
    
    return (frequencyFactor * 0.4 + latencyFactor * 0.4 + cacheMissFactor * 0.2) * 100;
  }

  /**
   * Calculate resource cost of pre-warming
   */
  private calculateResourceCost(pattern: ValidationPattern): number {
    // Cost is based on complexity of validation layers
    let cost = pattern.layers.length * 10; // Base cost per layer
    
    // Additional costs for specific layers
    if (pattern.layers.includes('qlock')) cost += 20;
    if (pattern.layers.includes('qerberos')) cost += 30;
    if (pattern.layers.includes('wasm-execution')) cost += 50;
    
    return Math.min(cost, 100); // Cap at 100
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateRecommendationReasoning(pattern: ValidationPattern, entry: HeatmapEntry): string {
    const reasons = [];
    
    if (pattern.frequency > 50) {
      reasons.push(`High frequency (${pattern.frequency} accesses)`);
    }
    
    if (pattern.averageLatency > 100) {
      reasons.push(`High latency (${pattern.averageLatency.toFixed(0)}ms average)`);
    }
    
    if (pattern.cacheHitRate < 0.5) {
      reasons.push(`Low cache hit rate (${(pattern.cacheHitRate * 100).toFixed(1)}%)`);
    }
    
    if (entry.trend === 'rising') {
      reasons.push('Rising usage trend');
    }
    
    return reasons.join(', ');
  }

  /**
   * Cleanup old entries when limit is exceeded
   */
  private cleanupOldEntries(): void {
    const entries = Array.from(this.heatmap.entries());
    entries.sort((a, b) => a[1].heatScore - b[1].heatScore); // Sort by heat score ascending
    
    const toRemove = entries.slice(0, Math.floor(this.config.maxHeatmapEntries * 0.1)); // Remove bottom 10%
    
    for (const [key] of toRemove) {
      this.heatmap.delete(key);
      this.accessHistory.delete(key);
    }
    
    this.emit('cleanup_performed', {
      removedEntries: toRemove.length,
      remainingEntries: this.heatmap.size,
      timestamp: Date.now()
    });
  }

  /**
   * Export heatmap data
   */
  public exportData(): any {
    return {
      heatmap: Object.fromEntries(this.heatmap),
      accessHistory: Object.fromEntries(this.accessHistory),
      config: this.config,
      exportedAt: Date.now()
    };
  }

  /**
   * Clear all heatmap data
   */
  public clear(): void {
    this.heatmap.clear();
    this.accessHistory.clear();
    
    this.emit('heatmap_cleared', {
      timestamp: Date.now()
    });
  }
}