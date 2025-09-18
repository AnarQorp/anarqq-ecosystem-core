/**
 * Cost Monitoring Dashboard Service
 * Provides cost monitoring dashboard and optimization recommendations
 */

import { EventBusService } from './EventBusService.mjs';
import ObservabilityService from './ObservabilityService.mjs';
import { ServerlessCostControlService } from './ServerlessCostControlService.mjs';
import { ColdStartOptimizationService } from './ColdStartOptimizationService.mjs';
import { BatchProcessingService } from './BatchProcessingService.mjs';

export class CostMonitoringDashboardService {
  constructor() {
    this.eventBus = new EventBusService();
    this.observability = new ObservabilityService();
    this.costControl = new ServerlessCostControlService();
    this.coldStartOptimization = new ColdStartOptimizationService();
    this.batchProcessing = new BatchProcessingService();
    
    this.dashboardData = new Map();
    this.alertThresholds = new Map();
    this.optimizationHistory = new Map();
    
    this.initializeMetrics();
  }

  /**
   * Initialize dashboard metrics
   */
  initializeMetrics() {
    this.observability.registerMetric('dashboard_cost_total', 'gauge', {
      help: 'Total cost across all modules',
      labelNames: ['period']
    });
    
    this.observability.registerMetric('dashboard_optimization_score', 'gauge', {
      help: 'Overall optimization score',
      labelNames: ['module']
    });
    
    this.observability.registerMetric('dashboard_alerts_total', 'counter', {
      help: 'Total dashboard alerts generated',
      labelNames: ['type', 'severity']
    });
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(timeRange = '24h') {
    try {
      const modules = await this.getActiveModules();
      const dashboardData = {
        overview: await this.getOverviewData(timeRange),
        modules: {},
        alerts: await this.getActiveAlerts(),
        recommendations: await this.getGlobalRecommendations(),
        trends: await this.getCostTrends(timeRange),
        lastUpdated: new Date().toISOString()
      };
      
      // Get data for each module
      for (const module of modules) {
        dashboardData.modules[module] = await this.getModuleDashboardData(module, timeRange);
      }
      
      // Cache dashboard data
      this.dashboardData.set(timeRange, dashboardData);
      
      return dashboardData;
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  /**
   * Get overview data across all modules
   */
  async getOverviewData(timeRange) {
    try {
      const modules = await this.getActiveModules();
      let totalCost = 0;
      let totalInvocations = 0;
      let totalColdStarts = 0;
      let totalBatches = 0;
      let averageOptimizationScore = 0;
      
      for (const module of modules) {
        const moduleData = await this.costControl.getCostDashboardData(module);
        if (moduleData && !moduleData.error) {
          totalCost += moduleData.costMetrics.totalCost;
          totalInvocations += moduleData.costMetrics.invocationCount;
        }
        
        const coldStartReport = await this.coldStartOptimization.getOptimizationReport(module, 'handler');
        if (coldStartReport && !coldStartReport.error) {
          totalColdStarts += coldStartReport.coldStartMetrics.totalColdStarts;
        }
        
        const optimizationScore = await this.calculateOptimizationScore(module);
        averageOptimizationScore += optimizationScore;
      }
      
      averageOptimizationScore = modules.length > 0 ? averageOptimizationScore / modules.length : 0;
      
      // Update metrics
      this.observability.setGauge('dashboard_cost_total', totalCost, { period: timeRange });
      
      return {
        totalCost,
        totalInvocations,
        totalColdStarts,
        totalBatches,
        averageOptimizationScore,
        activeModules: modules.length,
        costPerInvocation: totalInvocations > 0 ? totalCost / totalInvocations : 0,
        coldStartRatio: totalInvocations > 0 ? totalColdStarts / totalInvocations : 0
      };
    } catch (error) {
      throw new Error(`Failed to get overview data: ${error.message}`);
    }
  }

  /**
   * Get module-specific dashboard data
   */
  async getModuleDashboardData(module, timeRange) {
    try {
      const moduleData = {
        costMetrics: {},
        coldStartMetrics: {},
        batchMetrics: {},
        optimizationScore: 0,
        recommendations: [],
        alerts: [],
        trends: {}
      };
      
      // Get cost control data
      try {
        const costData = await this.costControl.getCostDashboardData(module);
        if (costData && !costData.error) {
          moduleData.costMetrics = costData.costMetrics;
          moduleData.budgetUtilization = costData.budgetUtilization;
          moduleData.recommendations.push(...costData.recommendations);
        }
      } catch (error) {
        console.warn(`Failed to get cost data for ${module}: ${error.message}`);
      }
      
      // Get cold start optimization data
      try {
        const coldStartData = await this.coldStartOptimization.getOptimizationReport(module, 'handler');
        if (coldStartData && !coldStartData.error) {
          moduleData.coldStartMetrics = coldStartData.coldStartMetrics;
          moduleData.recommendations.push(...coldStartData.recommendations);
        }
      } catch (error) {
        console.warn(`Failed to get cold start data for ${module}: ${error.message}`);
      }
      
      // Get batch processing data
      try {
        const batchData = await this.batchProcessing.getBatchStatistics(module, 'default');
        if (batchData && !batchData.error) {
          moduleData.batchMetrics = batchData.metrics;
          const batchRecs = await this.batchProcessing.getBatchRecommendations(module);
          if (batchRecs && batchRecs.recommendations) {
            moduleData.recommendations.push(...batchRecs.recommendations);
          }
        }
      } catch (error) {
        console.warn(`Failed to get batch data for ${module}: ${error.message}`);
      }
      
      // Calculate optimization score
      moduleData.optimizationScore = await this.calculateOptimizationScore(module);
      
      // Get module-specific alerts
      moduleData.alerts = await this.getModuleAlerts(module);
      
      // Get cost trends
      moduleData.trends = await this.getModuleCostTrends(module, timeRange);
      
      return moduleData;
    } catch (error) {
      throw new Error(`Failed to get module dashboard data: ${error.message}`);
    }
  }

  /**
   * Calculate optimization score for a module
   */
  async calculateOptimizationScore(module) {
    try {
      let score = 100; // Start with perfect score
      
      // Cost efficiency (30% weight)
      const costData = await this.costControl.getCostDashboardData(module);
      if (costData && !costData.error) {
        const budgetUtilization = costData.budgetUtilization?.utilization || 0;
        if (budgetUtilization > 0.9) score -= 20; // High budget utilization
        else if (budgetUtilization > 0.7) score -= 10;
        
        const avgCost = costData.costMetrics.averageCost || 0;
        if (avgCost > 0.01) score -= 10; // High average cost per invocation
      }
      
      // Cold start optimization (25% weight)
      const coldStartData = await this.coldStartOptimization.getOptimizationReport(module, 'handler');
      if (coldStartData && !coldStartData.error) {
        const avgDuration = coldStartData.coldStartMetrics.averageDuration || 0;
        if (avgDuration > 3000) score -= 15; // Long cold starts
        else if (avgDuration > 1500) score -= 8;
        
        const utilization = coldStartData.coldStartMetrics.averageUtilization || 0;
        if (utilization < 0.4) score -= 10; // Low memory utilization
        else if (utilization > 0.9) score -= 5; // High memory utilization
      }
      
      // Batch processing efficiency (20% weight)
      try {
        const batchData = await this.batchProcessing.getBatchStatistics(module, 'default');
        if (batchData && !batchData.error) {
          const avgBatchSize = batchData.metrics?.averageBatchSize || 1;
          if (avgBatchSize < 5) score -= 10; // Small batch sizes
          
          const costSavings = batchData.metrics?.estimatedCostSavings || 0;
          if (costSavings < 0.2) score -= 10; // Low cost savings
        }
      } catch (error) {
        // Batch processing not configured, skip this scoring component
      }
      
      // Alert frequency (15% weight)
      const alerts = await this.getModuleAlerts(module);
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
      score -= criticalAlerts * 5;
      
      // Implementation of recommendations (10% weight)
      const recommendations = await this.getModuleRecommendations(module);
      const highPriorityRecs = recommendations.filter(rec => rec.priority === 'HIGH').length;
      score -= highPriorityRecs * 3;
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.warn(`Failed to calculate optimization score for ${module}: ${error.message}`);
      return 50; // Default score
    }
  }

  /**
   * Get active alerts across all modules
   */
  async getActiveAlerts() {
    try {
      const modules = await this.getActiveModules();
      const allAlerts = [];
      
      for (const module of modules) {
        const moduleAlerts = await this.getModuleAlerts(module);
        allAlerts.push(...moduleAlerts);
      }
      
      // Sort by severity and timestamp
      allAlerts.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      return allAlerts.slice(0, 50); // Return top 50 alerts
    } catch (error) {
      throw new Error(`Failed to get active alerts: ${error.message}`);
    }
  }

  /**
   * Get module-specific alerts
   */
  async getModuleAlerts(module) {
    try {
      const alerts = [];
      
      // Cost-related alerts
      const costData = await this.costControl.getCostDashboardData(module);
      if (costData && !costData.error && costData.budgetUtilization) {
        const utilization = costData.budgetUtilization.utilization;
        if (utilization >= 1.0) {
          alerts.push({
            id: `cost-cutoff-${module}`,
            module,
            type: 'BUDGET_CUTOFF',
            severity: 'critical',
            message: `Budget exceeded for ${module} (${(utilization * 100).toFixed(1)}%)`,
            timestamp: new Date().toISOString(),
            data: { utilization, totalCost: costData.budgetUtilization.totalCost }
          });
        } else if (utilization >= 0.95) {
          alerts.push({
            id: `cost-critical-${module}`,
            module,
            type: 'BUDGET_CRITICAL',
            severity: 'critical',
            message: `Budget critically high for ${module} (${(utilization * 100).toFixed(1)}%)`,
            timestamp: new Date().toISOString(),
            data: { utilization }
          });
        } else if (utilization >= 0.8) {
          alerts.push({
            id: `cost-warning-${module}`,
            module,
            type: 'BUDGET_WARNING',
            severity: 'warning',
            message: `Budget warning for ${module} (${(utilization * 100).toFixed(1)}%)`,
            timestamp: new Date().toISOString(),
            data: { utilization }
          });
        }
      }
      
      // Cold start alerts
      const coldStartData = await this.coldStartOptimization.getOptimizationReport(module, 'handler');
      if (coldStartData && !coldStartData.error) {
        const avgDuration = coldStartData.coldStartMetrics.averageDuration;
        if (avgDuration > 5000) {
          alerts.push({
            id: `coldstart-slow-${module}`,
            module,
            type: 'COLD_START_SLOW',
            severity: 'warning',
            message: `Slow cold starts detected for ${module} (${avgDuration}ms average)`,
            timestamp: new Date().toISOString(),
            data: { avgDuration }
          });
        }
      }
      
      return alerts;
    } catch (error) {
      console.warn(`Failed to get module alerts for ${module}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get global optimization recommendations
   */
  async getGlobalRecommendations() {
    try {
      const modules = await this.getActiveModules();
      const allRecommendations = [];
      
      for (const module of modules) {
        const moduleRecs = await this.getModuleRecommendations(module);
        allRecommendations.push(...moduleRecs);
      }
      
      // Sort by priority and potential impact
      allRecommendations.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Sort by estimated savings if available
        const aSavings = this.extractSavingsValue(a.estimatedSavings || a.estimatedImpact || '0%');
        const bSavings = this.extractSavingsValue(b.estimatedSavings || b.estimatedImpact || '0%');
        return bSavings - aSavings;
      });
      
      return allRecommendations.slice(0, 20); // Return top 20 recommendations
    } catch (error) {
      throw new Error(`Failed to get global recommendations: ${error.message}`);
    }
  }

  /**
   * Get module-specific recommendations
   */
  async getModuleRecommendations(module) {
    try {
      const recommendations = [];
      
      // Get cost optimization recommendations
      const costRecs = await this.costControl.getCostOptimizationRecommendations(module);
      if (costRecs && costRecs.recommendations) {
        recommendations.push(...costRecs.recommendations.map(rec => ({ ...rec, module, category: 'cost' })));
      }
      
      // Get cold start optimization recommendations
      const coldStartRecs = await this.coldStartOptimization.getOptimizationRecommendations(module, 'handler');
      if (coldStartRecs) {
        recommendations.push(...coldStartRecs.map(rec => ({ ...rec, module, category: 'coldstart' })));
      }
      
      // Get batch processing recommendations
      try {
        const batchRecs = await this.batchProcessing.getBatchRecommendations(module);
        if (batchRecs && batchRecs.recommendations) {
          recommendations.push(...batchRecs.recommendations.map(rec => ({ ...rec, module, category: 'batch' })));
        }
      } catch (error) {
        // Batch processing not configured, skip recommendations
      }
      
      return recommendations;
    } catch (error) {
      console.warn(`Failed to get module recommendations for ${module}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(timeRange) {
    try {
      // This would typically query historical data from a time-series database
      // For now, we'll simulate trend data
      const trends = {
        totalCost: this.generateTrendData(timeRange, 'cost'),
        invocations: this.generateTrendData(timeRange, 'invocations'),
        coldStarts: this.generateTrendData(timeRange, 'coldstarts'),
        optimizationScore: this.generateTrendData(timeRange, 'score')
      };
      
      return trends;
    } catch (error) {
      throw new Error(`Failed to get cost trends: ${error.message}`);
    }
  }

  /**
   * Get module-specific cost trends
   */
  async getModuleCostTrends(module, timeRange) {
    try {
      return {
        cost: this.generateTrendData(timeRange, 'cost', module),
        invocations: this.generateTrendData(timeRange, 'invocations', module),
        coldStartDuration: this.generateTrendData(timeRange, 'duration', module),
        memoryUtilization: this.generateTrendData(timeRange, 'memory', module)
      };
    } catch (error) {
      console.warn(`Failed to get module cost trends for ${module}: ${error.message}`);
      return {};
    }
  }

  /**
   * Generate simulated trend data
   */
  generateTrendData(timeRange, metric, module = null) {
    const points = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const data = [];
    
    for (let i = 0; i < points; i++) {
      const timestamp = new Date(Date.now() - (points - i) * (timeRange === '24h' ? 3600000 : timeRange === '7d' ? 86400000 : 86400000));
      let value;
      
      switch (metric) {
        case 'cost':
          value = Math.random() * 100 + 50;
          break;
        case 'invocations':
          value = Math.floor(Math.random() * 1000) + 100;
          break;
        case 'coldstarts':
          value = Math.floor(Math.random() * 50) + 5;
          break;
        case 'score':
          value = Math.random() * 30 + 70;
          break;
        case 'duration':
          value = Math.random() * 2000 + 500;
          break;
        case 'memory':
          value = Math.random() * 0.4 + 0.4;
          break;
        default:
          value = Math.random() * 100;
      }
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  }

  /**
   * Get active modules
   */
  async getActiveModules() {
    // This would typically query the module registry
    // For now, we'll return a static list
    return [
      'squid', 'qwallet', 'qlock', 'qonsent', 'qindex',
      'qerberos', 'qmask', 'qdrive', 'qpic', 'qmarket',
      'qmail', 'qchat', 'qnet', 'dao'
    ];
  }

  /**
   * Extract savings value from string
   */
  extractSavingsValue(savingsStr) {
    const match = savingsStr.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Set alert threshold for a module
   */
  async setAlertThreshold(module, type, threshold) {
    try {
      const key = `${module}:${type}`;
      this.alertThresholds.set(key, {
        module,
        type,
        threshold,
        createdAt: new Date().toISOString()
      });
      
      await this.eventBus.publish('q.cost.alert.threshold.updated.v1', {
        module,
        type,
        threshold,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to set alert threshold: ${error.message}`);
    }
  }

  /**
   * Get dashboard summary for API
   */
  async getDashboardSummary() {
    try {
      const overview = await this.getOverviewData('24h');
      const alerts = await this.getActiveAlerts();
      const recommendations = await this.getGlobalRecommendations();
      
      return {
        overview: {
          totalCost: overview.totalCost,
          totalInvocations: overview.totalInvocations,
          averageOptimizationScore: overview.averageOptimizationScore,
          activeModules: overview.activeModules
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length
        },
        recommendations: {
          total: recommendations.length,
          high: recommendations.filter(r => r.priority === 'HIGH').length,
          medium: recommendations.filter(r => r.priority === 'MEDIUM').length
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }
  }
}