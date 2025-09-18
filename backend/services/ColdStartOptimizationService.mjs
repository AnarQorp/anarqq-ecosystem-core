/**
 * Cold Start Optimization Service
 * Manages cold start optimization and memory tuning for serverless functions
 */

import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';

export class ColdStartOptimizationService {
  constructor() {
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    this.warmupSchedules = new Map();
    this.memoryProfiles = new Map();
    this.coldStartMetrics = new Map();
    
    // Default memory configurations by function type
    this.defaultMemoryConfigs = {
      'api-handler': { memory: 256, timeout: 30 },
      'data-processor': { memory: 512, timeout: 60 },
      'file-handler': { memory: 1024, timeout: 300 },
      'batch-processor': { memory: 2048, timeout: 900 }
    };
    
    this.initializeMetrics();
  }

  /**
   * Initialize cold start optimization metrics
   */
  initializeMetrics() {
    this.observability.registerMetric('cold_start_duration_seconds', 'histogram', {
      help: 'Cold start duration in seconds',
      labelNames: ['module', 'function', 'memory_size'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });
    
    this.observability.registerMetric('warm_invocations_total', 'counter', {
      help: 'Total warm invocations',
      labelNames: ['module', 'function']
    });
    
    this.observability.registerMetric('memory_utilization_ratio', 'gauge', {
      help: 'Memory utilization ratio',
      labelNames: ['module', 'function']
    });
    
    this.observability.registerMetric('function_timeout_seconds', 'gauge', {
      help: 'Function timeout configuration',
      labelNames: ['module', 'function']
    });
  }

  /**
   * Configure memory profile for a function
   */
  async configureMemoryProfile(module, functionName, config) {
    try {
      const profile = {
        module,
        function: functionName,
        memory: config.memory || this.getDefaultMemory(functionName),
        timeout: config.timeout || this.getDefaultTimeout(functionName),
        environment: config.environment || {},
        warmupEnabled: config.warmupEnabled || false,
        warmupSchedule: config.warmupSchedule || '*/5 * * * *', // Every 5 minutes
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.memoryProfiles.set(`${module}:${functionName}`, profile);
      
      // Update metrics
      this.observability.setGauge('function_timeout_seconds', profile.timeout, {
        module,
        function: functionName
      });
      
      await this.eventBus.publish('q.coldstart.profile.updated.v1', {
        module,
        function: functionName,
        profile,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, profile };
    } catch (error) {
      throw new Error(`Failed to configure memory profile: ${error.message}`);
    }
  }

  /**
   * Record cold start event
   */
  async recordColdStart(module, functionName, duration, memoryUsed, memoryAllocated) {
    try {
      const coldStartData = {
        module,
        function: functionName,
        duration,
        memoryUsed,
        memoryAllocated,
        utilizationRatio: memoryUsed / memoryAllocated,
        timestamp: new Date().toISOString()
      };
      
      // Store metrics
      const key = `${module}:${functionName}`;
      const existingMetrics = this.coldStartMetrics.get(key) || {
        totalColdStarts: 0,
        averageDuration: 0,
        averageUtilization: 0,
        coldStartHistory: []
      };
      
      existingMetrics.totalColdStarts++;
      existingMetrics.averageDuration = (
        (existingMetrics.averageDuration * (existingMetrics.totalColdStarts - 1) + duration) /
        existingMetrics.totalColdStarts
      );
      existingMetrics.averageUtilization = (
        (existingMetrics.averageUtilization * (existingMetrics.totalColdStarts - 1) + coldStartData.utilizationRatio) /
        existingMetrics.totalColdStarts
      );
      existingMetrics.coldStartHistory.push(coldStartData);
      
      // Keep only last 100 cold starts
      if (existingMetrics.coldStartHistory.length > 100) {
        existingMetrics.coldStartHistory = existingMetrics.coldStartHistory.slice(-100);
      }
      
      this.coldStartMetrics.set(key, existingMetrics);
      
      // Update Prometheus metrics
      this.observability.observeHistogram('cold_start_duration_seconds', duration / 1000, {
        module,
        function: functionName,
        memory_size: memoryAllocated.toString()
      });
      
      this.observability.setGauge('memory_utilization_ratio', coldStartData.utilizationRatio, {
        module,
        function: functionName
      });
      
      await this.eventBus.publish('q.coldstart.recorded.v1', coldStartData);
      
      // Analyze and suggest optimizations
      await this.analyzeAndOptimize(module, functionName);
      
      return { success: true, metrics: existingMetrics };
    } catch (error) {
      throw new Error(`Failed to record cold start: ${error.message}`);
    }
  }

  /**
   * Record warm invocation
   */
  async recordWarmInvocation(module, functionName) {
    try {
      this.observability.incrementCounter('warm_invocations_total', {
        module,
        function: functionName
      });
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to record warm invocation: ${error.message}`);
    }
  }

  /**
   * Analyze performance and suggest optimizations
   */
  async analyzeAndOptimize(module, functionName) {
    try {
      const key = `${module}:${functionName}`;
      const metrics = this.coldStartMetrics.get(key);
      const profile = this.memoryProfiles.get(key);
      
      if (!metrics || !profile) return;
      
      const recommendations = [];
      
      // Memory optimization recommendations
      if (metrics.averageUtilization < 0.5) {
        const suggestedMemory = Math.max(128, Math.floor(profile.memory * 0.7));
        recommendations.push({
          type: 'MEMORY_REDUCTION',
          current: profile.memory,
          suggested: suggestedMemory,
          reason: `Low memory utilization (${(metrics.averageUtilization * 100).toFixed(1)}%)`,
          estimatedSavings: this.calculateMemorySavings(profile.memory, suggestedMemory)
        });
      } else if (metrics.averageUtilization > 0.9) {
        const suggestedMemory = Math.min(3008, Math.floor(profile.memory * 1.3));
        recommendations.push({
          type: 'MEMORY_INCREASE',
          current: profile.memory,
          suggested: suggestedMemory,
          reason: `High memory utilization (${(metrics.averageUtilization * 100).toFixed(1)}%)`,
          estimatedImpact: 'Reduced cold start times and better performance'
        });
      }
      
      // Cold start optimization recommendations
      if (metrics.averageDuration > 2000) {
        recommendations.push({
          type: 'WARMUP_ENABLE',
          reason: `High average cold start duration (${metrics.averageDuration}ms)`,
          suggestion: 'Enable function warmup to reduce cold starts'
        });
      }
      
      // Apply automatic optimizations if enabled
      if (profile.autoOptimize) {
        await this.applyOptimizations(module, functionName, recommendations);
      }
      
      if (recommendations.length > 0) {
        await this.eventBus.publish('q.coldstart.optimization.suggested.v1', {
          module,
          function: functionName,
          recommendations,
          timestamp: new Date().toISOString()
        });
      }
      
      return { recommendations };
    } catch (error) {
      throw new Error(`Failed to analyze and optimize: ${error.message}`);
    }
  }

  /**
   * Apply optimization recommendations
   */
  async applyOptimizations(module, functionName, recommendations) {
    try {
      const key = `${module}:${functionName}`;
      const profile = this.memoryProfiles.get(key);
      
      if (!profile) return;
      
      let updated = false;
      
      for (const rec of recommendations) {
        switch (rec.type) {
          case 'MEMORY_REDUCTION':
          case 'MEMORY_INCREASE':
            profile.memory = rec.suggested;
            updated = true;
            break;
          case 'WARMUP_ENABLE':
            profile.warmupEnabled = true;
            updated = true;
            break;
        }
      }
      
      if (updated) {
        profile.updatedAt = new Date().toISOString();
        this.memoryProfiles.set(key, profile);
        
        await this.eventBus.publish('q.coldstart.optimization.applied.v1', {
          module,
          function: functionName,
          profile,
          recommendations,
          timestamp: new Date().toISOString()
        });
      }
      
      return { success: true, updated };
    } catch (error) {
      throw new Error(`Failed to apply optimizations: ${error.message}`);
    }
  }

  /**
   * Setup function warmup schedule
   */
  async setupWarmupSchedule(module, functionName, schedule) {
    try {
      const warmupConfig = {
        module,
        function: functionName,
        schedule: schedule || '*/5 * * * *', // Default: every 5 minutes
        enabled: true,
        lastWarmup: null,
        warmupCount: 0,
        createdAt: new Date().toISOString()
      };
      
      this.warmupSchedules.set(`${module}:${functionName}`, warmupConfig);
      
      await this.eventBus.publish('q.coldstart.warmup.scheduled.v1', {
        module,
        function: functionName,
        schedule,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, config: warmupConfig };
    } catch (error) {
      throw new Error(`Failed to setup warmup schedule: ${error.message}`);
    }
  }

  /**
   * Execute warmup for a function
   */
  async executeWarmup(module, functionName) {
    try {
      const key = `${module}:${functionName}`;
      const warmupConfig = this.warmupSchedules.get(key);
      
      if (!warmupConfig || !warmupConfig.enabled) {
        return { success: false, reason: 'Warmup not configured or disabled' };
      }
      
      // Simulate warmup invocation (in real implementation, this would invoke the actual function)
      const warmupResult = await this.performWarmupInvocation(module, functionName);
      
      // Update warmup metrics
      warmupConfig.lastWarmup = new Date().toISOString();
      warmupConfig.warmupCount++;
      this.warmupSchedules.set(key, warmupConfig);
      
      await this.eventBus.publish('q.coldstart.warmup.executed.v1', {
        module,
        function: functionName,
        result: warmupResult,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, result: warmupResult };
    } catch (error) {
      throw new Error(`Failed to execute warmup: ${error.message}`);
    }
  }

  /**
   * Get cold start optimization report
   */
  async getOptimizationReport(module, functionName) {
    try {
      const key = `${module}:${functionName}`;
      const metrics = this.coldStartMetrics.get(key);
      const profile = this.memoryProfiles.get(key);
      const warmupConfig = this.warmupSchedules.get(key);
      
      if (!metrics) {
        return { error: 'No cold start data available' };
      }
      
      const report = {
        module,
        function: functionName,
        coldStartMetrics: {
          totalColdStarts: metrics.totalColdStarts,
          averageDuration: metrics.averageDuration,
          averageUtilization: metrics.averageUtilization,
          recentTrend: this.calculateTrend(metrics.coldStartHistory)
        },
        memoryProfile: profile,
        warmupConfiguration: warmupConfig,
        recommendations: await this.getOptimizationRecommendations(module, functionName),
        lastAnalyzed: new Date().toISOString()
      };
      
      return report;
    } catch (error) {
      throw new Error(`Failed to get optimization report: ${error.message}`);
    }
  }

  /**
   * Get optimization recommendations for a function
   */
  async getOptimizationRecommendations(module, functionName) {
    try {
      const key = `${module}:${functionName}`;
      const metrics = this.coldStartMetrics.get(key);
      const profile = this.memoryProfiles.get(key);
      
      if (!metrics || !profile) {
        return [];
      }
      
      const recommendations = [];
      
      // Memory optimization
      if (metrics.averageUtilization < 0.4) {
        recommendations.push({
          type: 'REDUCE_MEMORY',
          priority: 'HIGH',
          description: `Memory utilization is low (${(metrics.averageUtilization * 100).toFixed(1)}%). Consider reducing memory allocation.`,
          currentValue: profile.memory,
          suggestedValue: Math.max(128, Math.floor(profile.memory * 0.7)),
          estimatedSavings: '15-30% cost reduction'
        });
      }
      
      // Cold start frequency
      if (metrics.totalColdStarts > 100 && !profile.warmupEnabled) {
        recommendations.push({
          type: 'ENABLE_WARMUP',
          priority: 'MEDIUM',
          description: `High cold start frequency (${metrics.totalColdStarts} cold starts). Consider enabling warmup.`,
          implementation: 'Schedule periodic warmup invocations'
        });
      }
      
      // Performance optimization
      if (metrics.averageDuration > 3000) {
        recommendations.push({
          type: 'OPTIMIZE_INITIALIZATION',
          priority: 'HIGH',
          description: `Long cold start duration (${metrics.averageDuration}ms). Consider optimizing initialization code.`,
          suggestions: [
            'Move heavy imports outside handler',
            'Use connection pooling',
            'Implement lazy loading',
            'Optimize dependency loading'
          ]
        });
      }
      
      return recommendations;
    } catch (error) {
      throw new Error(`Failed to get optimization recommendations: ${error.message}`);
    }
  }

  // Helper methods
  getDefaultMemory(functionName) {
    for (const [type, config] of Object.entries(this.defaultMemoryConfigs)) {
      if (functionName.includes(type)) {
        return config.memory;
      }
    }
    return 256; // Default
  }

  getDefaultTimeout(functionName) {
    for (const [type, config] of Object.entries(this.defaultMemoryConfigs)) {
      if (functionName.includes(type)) {
        return config.timeout;
      }
    }
    return 30; // Default
  }

  calculateMemorySavings(currentMemory, suggestedMemory) {
    const reduction = (currentMemory - suggestedMemory) / currentMemory;
    return `${(reduction * 100).toFixed(1)}% cost reduction`;
  }

  calculateTrend(history) {
    if (history.length < 2) return 'insufficient_data';
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, item) => sum + item.duration, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.duration, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'deteriorating';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  async performWarmupInvocation(module, functionName) {
    // In a real implementation, this would make an actual warmup call to the function
    // For now, we'll simulate it
    return {
      success: true,
      duration: Math.random() * 100 + 50, // Simulated warmup duration
      timestamp: new Date().toISOString()
    };
  }
}