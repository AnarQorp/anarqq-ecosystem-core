/**
 * Capacity Planning Service
 * Implements capacity planning and auto-scaling optimization
 */

import { EventEmitter } from 'events';

export class CapacityPlanningService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      forecastWindow: options.forecastWindow || 30 * 24 * 60 * 60 * 1000, // 30 days
      historicalWindow: options.historicalWindow || 90 * 24 * 60 * 60 * 1000, // 90 days
      scalingThresholds: {
        cpu: { scaleUp: 70, scaleDown: 30 },
        memory: { scaleUp: 80, scaleDown: 40 },
        requests: { scaleUp: 80, scaleDown: 20 },
        latency: { scaleUp: 200, scaleDown: 50 }
      },
      minInstances: options.minInstances || 1,
      maxInstances: options.maxInstances || 100,
      cooldownPeriod: options.cooldownPeriod || 300000, // 5 minutes
      ...options
    };

    this.metrics = new Map();
    this.forecasts = new Map();
    this.scalingEvents = new Map();
    this.recommendations = new Map();
    this.resourceUsage = new Map();
  }

  /**
   * Record resource usage metrics
   */
  recordUsage(resource, value, timestamp = Date.now(), metadata = {}) {
    const key = `${resource}_${timestamp}`;
    
    if (!this.resourceUsage.has(resource)) {
      this.resourceUsage.set(resource, []);
    }

    this.resourceUsage.get(resource).push({
      value,
      timestamp,
      metadata
    });

    // Cleanup old data
    this.cleanupOldData(resource);

    // Trigger analysis if we have enough data
    if (this.resourceUsage.get(resource).length > 100) {
      this.analyzeCapacity(resource);
    }

    this.emit('usage_recorded', { resource, value, timestamp });
  }

  /**
   * Analyze current capacity and generate recommendations
   */
  analyzeCapacity(resource) {
    const usage = this.resourceUsage.get(resource) || [];
    if (usage.length < 50) return null;

    const analysis = {
      resource,
      timestamp: Date.now(),
      current: this.calculateCurrentUsage(usage),
      trends: this.calculateTrends(usage),
      forecast: this.generateForecast(usage),
      recommendations: this.generateCapacityRecommendations(resource, usage),
      scalingNeeds: this.assessScalingNeeds(resource, usage)
    };

    this.recommendations.set(resource, analysis);
    this.emit('capacity_analyzed', analysis);

    return analysis;
  }

  /**
   * Generate capacity forecast
   */
  generateForecast(usage, forecastDays = 30) {
    const sortedUsage = usage.sort((a, b) => a.timestamp - b.timestamp);
    const values = sortedUsage.map(u => u.value);
    
    // Simple linear regression for trend
    const trend = this.calculateLinearTrend(values);
    
    // Seasonal patterns (daily, weekly)
    const seasonality = this.detectSeasonality(sortedUsage);
    
    // Generate forecast points
    const forecastPoints = [];
    const lastTimestamp = sortedUsage[sortedUsage.length - 1].timestamp;
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = 1; i <= forecastDays; i++) {
      const forecastTimestamp = lastTimestamp + (i * dayMs);
      const trendValue = trend.slope * (values.length + i) + trend.intercept;
      const seasonalAdjustment = this.getSeasonalAdjustment(seasonality, forecastTimestamp);
      
      forecastPoints.push({
        timestamp: forecastTimestamp,
        value: Math.max(0, trendValue + seasonalAdjustment),
        confidence: Math.max(0.1, 1 - (i / forecastDays) * 0.5) // Decreasing confidence
      });
    }

    return {
      trend,
      seasonality,
      points: forecastPoints,
      summary: this.summarizeForecast(forecastPoints)
    };
  }

  /**
   * Assess auto-scaling needs
   */
  assessScalingNeeds(resource, usage) {
    const recentUsage = usage.slice(-20); // Last 20 data points
    const avgUsage = recentUsage.reduce((sum, u) => sum + u.value, 0) / recentUsage.length;
    const maxUsage = Math.max(...recentUsage.map(u => u.value));
    const minUsage = Math.min(...recentUsage.map(u => u.value));
    
    const thresholds = this.config.scalingThresholds[resource] || 
                      this.config.scalingThresholds.requests;

    const assessment = {
      resource,
      currentUsage: avgUsage,
      peakUsage: maxUsage,
      minUsage,
      thresholds,
      recommendations: []
    };

    // Scale up recommendations
    if (maxUsage > thresholds.scaleUp) {
      assessment.recommendations.push({
        action: 'scale_up',
        reason: `Peak usage (${maxUsage.toFixed(1)}) exceeds scale-up threshold (${thresholds.scaleUp})`,
        urgency: maxUsage > thresholds.scaleUp * 1.2 ? 'high' : 'medium',
        suggestedIncrease: this.calculateScaleUpAmount(maxUsage, thresholds.scaleUp)
      });
    }

    // Scale down recommendations
    if (maxUsage < thresholds.scaleDown && avgUsage < thresholds.scaleDown * 0.8) {
      assessment.recommendations.push({
        action: 'scale_down',
        reason: `Usage consistently below scale-down threshold (${thresholds.scaleDown})`,
        urgency: 'low',
        suggestedDecrease: this.calculateScaleDownAmount(avgUsage, thresholds.scaleDown)
      });
    }

    // Stability recommendations
    const volatility = this.calculateVolatility(recentUsage.map(u => u.value));
    if (volatility > 0.3) {
      assessment.recommendations.push({
        action: 'optimize_stability',
        reason: `High usage volatility detected (${(volatility * 100).toFixed(1)}%)`,
        urgency: 'medium',
        suggestions: [
          'Implement request queuing to smooth traffic spikes',
          'Add caching to reduce resource usage variability',
          'Consider predictive scaling based on traffic patterns'
        ]
      });
    }

    return assessment;
  }

  /**
   * Generate auto-scaling configuration
   */
  generateAutoScalingConfig(resource, targetUtilization = 70) {
    const analysis = this.recommendations.get(resource);
    if (!analysis) {
      throw new Error(`No capacity analysis found for resource: ${resource}`);
    }

    const config = {
      resource,
      targetUtilization,
      minInstances: this.config.minInstances,
      maxInstances: this.config.maxInstances,
      scaleUpPolicy: {
        threshold: targetUtilization,
        evaluationPeriods: 2,
        cooldown: this.config.cooldownPeriod,
        scalingAdjustment: this.calculateOptimalScalingStep(analysis)
      },
      scaleDownPolicy: {
        threshold: targetUtilization * 0.5,
        evaluationPeriods: 3,
        cooldown: this.config.cooldownPeriod * 2,
        scalingAdjustment: -1
      },
      predictiveScaling: {
        enabled: analysis.trends.predictability > 0.7,
        forecastPeriod: 300, // 5 minutes
        scheduleBasedScaling: this.generateScheduleBasedRules(analysis)
      }
    };

    this.emit('autoscaling_config_generated', config);
    return config;
  }

  /**
   * Optimize resource allocation
   */
  optimizeResourceAllocation(resources) {
    const optimizations = [];
    
    for (const resource of resources) {
      const analysis = this.recommendations.get(resource);
      if (!analysis) continue;

      const optimization = {
        resource,
        currentAllocation: analysis.current.average,
        recommendedAllocation: this.calculateOptimalAllocation(analysis),
        potentialSavings: 0,
        riskAssessment: this.assessOptimizationRisk(analysis)
      };

      optimization.potentialSavings = this.calculatePotentialSavings(
        optimization.currentAllocation,
        optimization.recommendedAllocation
      );

      optimizations.push(optimization);
    }

    // Sort by potential savings
    optimizations.sort((a, b) => b.potentialSavings - a.potentialSavings);

    this.emit('resource_optimization_completed', optimizations);
    return optimizations;
  }

  /**
   * Get capacity planning dashboard data
   */
  getDashboardData() {
    const dashboard = {
      timestamp: Date.now(),
      resources: {},
      alerts: [],
      recommendations: [],
      forecast: {}
    };

    // Resource summaries
    for (const [resource, analysis] of this.recommendations) {
      dashboard.resources[resource] = {
        currentUsage: analysis.current.average,
        trend: analysis.trends.direction,
        forecastPeak: Math.max(...analysis.forecast.points.map(p => p.value)),
        scalingNeeds: analysis.scalingNeeds.recommendations.length > 0,
        status: this.getResourceStatus(analysis)
      };
    }

    // Generate alerts
    for (const [resource, analysis] of this.recommendations) {
      const urgentRecommendations = analysis.scalingNeeds.recommendations
        .filter(r => r.urgency === 'high');
      
      for (const rec of urgentRecommendations) {
        dashboard.alerts.push({
          resource,
          type: 'capacity',
          severity: 'high',
          message: rec.reason,
          action: rec.action
        });
      }
    }

    // Top recommendations
    const allRecommendations = [];
    for (const [resource, analysis] of this.recommendations) {
      for (const rec of analysis.recommendations) {
        allRecommendations.push({ resource, ...rec });
      }
    }

    dashboard.recommendations = allRecommendations
      .sort((a, b) => {
        const urgencyScore = { high: 3, medium: 2, low: 1 };
        return (urgencyScore[b.urgency] || 0) - (urgencyScore[a.urgency] || 0);
      })
      .slice(0, 10);

    return dashboard;
  }

  /**
   * Helper methods
   */
  calculateCurrentUsage(usage) {
    const values = usage.map(u => u.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  calculateTrends(usage) {
    const values = usage.map(u => u.value);
    const trend = this.calculateLinearTrend(values);
    const volatility = this.calculateVolatility(values);
    
    return {
      direction: trend.slope > 0.1 ? 'increasing' : trend.slope < -0.1 ? 'decreasing' : 'stable',
      slope: trend.slope,
      correlation: trend.correlation,
      volatility,
      predictability: Math.max(0, 1 - volatility) * Math.abs(trend.correlation)
    };
  }

  calculateLinearTrend(values) {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate correlation coefficient
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = values.reduce((sum, y, i) => sum + ((i + 1) - meanX) * (y - meanY), 0);
    const denomX = Math.sqrt(values.reduce((sum, _, i) => sum + Math.pow((i + 1) - meanX, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
    const correlation = numerator / (denomX * denomY);
    
    return { slope, intercept, correlation };
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }

  detectSeasonality(usage) {
    // Simple daily pattern detection
    const hourlyAverages = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    for (const u of usage) {
      const hour = new Date(u.timestamp).getHours();
      hourlyAverages[hour] += u.value;
      hourlyCounts[hour]++;
    }
    
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyAverages[i] /= hourlyCounts[i];
      }
    }
    
    return {
      daily: hourlyAverages,
      strength: this.calculateSeasonalStrength(hourlyAverages)
    };
  }

  calculateSeasonalStrength(pattern) {
    const mean = pattern.reduce((sum, v) => sum + v, 0) / pattern.length;
    const variance = pattern.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pattern.length;
    return mean > 0 ? Math.sqrt(variance) / mean : 0;
  }

  getSeasonalAdjustment(seasonality, timestamp) {
    const hour = new Date(timestamp).getHours();
    const dailyPattern = seasonality.daily[hour] || 0;
    const overallAverage = seasonality.daily.reduce((sum, v) => sum + v, 0) / seasonality.daily.length;
    
    return (dailyPattern - overallAverage) * seasonality.strength;
  }

  summarizeForecast(points) {
    const values = points.map(p => p.value);
    const avgConfidence = points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    
    return {
      expectedGrowth: values[values.length - 1] - values[0],
      peakValue: Math.max(...values),
      averageValue: values.reduce((sum, v) => sum + v, 0) / values.length,
      confidence: avgConfidence,
      trend: values[values.length - 1] > values[0] ? 'increasing' : 'decreasing'
    };
  }

  generateCapacityRecommendations(resource, usage) {
    const recommendations = [];
    const analysis = this.calculateCurrentUsage(usage);
    const trends = this.calculateTrends(usage);
    
    // High utilization warning
    if (analysis.p95 > 80) {
      recommendations.push({
        type: 'capacity_warning',
        priority: 'high',
        message: `${resource} utilization at 95th percentile is ${analysis.p95.toFixed(1)}%`,
        actions: ['Consider scaling up resources', 'Optimize resource usage', 'Implement load balancing']
      });
    }
    
    // Growth trend warning
    if (trends.direction === 'increasing' && trends.slope > 1) {
      recommendations.push({
        type: 'growth_trend',
        priority: 'medium',
        message: `${resource} showing increasing trend (${trends.slope.toFixed(2)} per period)`,
        actions: ['Plan for capacity expansion', 'Monitor growth rate', 'Consider predictive scaling']
      });
    }
    
    // Underutilization opportunity
    if (analysis.p95 < 30 && trends.direction !== 'increasing') {
      recommendations.push({
        type: 'optimization_opportunity',
        priority: 'low',
        message: `${resource} appears underutilized (95th percentile: ${analysis.p95.toFixed(1)}%)`,
        actions: ['Consider scaling down', 'Consolidate workloads', 'Review resource allocation']
      });
    }
    
    return recommendations;
  }

  calculateScaleUpAmount(currentUsage, threshold) {
    const overage = currentUsage - threshold;
    const percentageOverage = overage / threshold;
    
    if (percentageOverage > 0.5) return 3; // 50%+ over threshold
    if (percentageOverage > 0.2) return 2; // 20%+ over threshold
    return 1; // Default scale up
  }

  calculateScaleDownAmount(currentUsage, threshold) {
    const underutilization = threshold - currentUsage;
    const percentageUnder = underutilization / threshold;
    
    if (percentageUnder > 0.5) return 2; // Significantly underutilized
    return 1; // Default scale down
  }

  calculateOptimalScalingStep(analysis) {
    const volatility = analysis.trends.volatility;
    
    if (volatility > 0.5) return 2; // High volatility, scale more aggressively
    if (volatility > 0.3) return 1; // Medium volatility
    return 1; // Low volatility, conservative scaling
  }

  generateScheduleBasedRules(analysis) {
    const rules = [];
    
    if (analysis.forecast.seasonality.strength > 0.3) {
      const dailyPattern = analysis.forecast.seasonality.daily;
      const peakHours = dailyPattern
        .map((value, hour) => ({ hour, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(item => item.hour);
      
      rules.push({
        name: 'peak_hours_scaling',
        schedule: peakHours.map(hour => `${hour}:00`),
        action: 'scale_up',
        amount: 1
      });
    }
    
    return rules;
  }

  calculateOptimalAllocation(analysis) {
    const current = analysis.current.p95;
    const forecast = Math.max(...analysis.forecast.points.map(p => p.value));
    const buffer = 0.2; // 20% buffer
    
    return Math.max(current, forecast) * (1 + buffer);
  }

  assessOptimizationRisk(analysis) {
    const volatility = analysis.trends.volatility;
    const growth = analysis.trends.direction === 'increasing' ? 'high' : 'low';
    
    if (volatility > 0.4) return 'high';
    if (volatility > 0.2 || growth === 'high') return 'medium';
    return 'low';
  }

  calculatePotentialSavings(current, recommended) {
    if (recommended >= current) return 0;
    return ((current - recommended) / current) * 100; // Percentage savings
  }

  getResourceStatus(analysis) {
    const current = analysis.current.p95;
    const hasUrgentRecommendations = analysis.scalingNeeds.recommendations
      .some(r => r.urgency === 'high');
    
    if (hasUrgentRecommendations || current > 90) return 'critical';
    if (current > 70) return 'warning';
    return 'healthy';
  }

  cleanupOldData(resource) {
    const usage = this.resourceUsage.get(resource);
    if (!usage) return;
    
    const cutoff = Date.now() - this.config.historicalWindow;
    const filtered = usage.filter(u => u.timestamp > cutoff);
    this.resourceUsage.set(resource, filtered);
  }
}

export default CapacityPlanningService;