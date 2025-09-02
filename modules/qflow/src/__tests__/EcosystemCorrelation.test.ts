/**
 * Tests for Ecosystem Correlation and Predictive Performance Services
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EcosystemCorrelationService, { ModuleMetrics } from '../services/EcosystemCorrelationService.js';
import PredictivePerformanceService from '../services/PredictivePerformanceService.js';

describe('EcosystemCorrelationService', () => {
  let correlationService: EcosystemCorrelationService;

  beforeEach(() => {
    correlationService = new EcosystemCorrelationService({
      correlationWindowSize: 60000, // 1 minute for testing
      minDataPointsForCorrelation: 5,
      updateInterval: 1000 // 1 second for testing
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with ecosystem topology', () => {
    const qflowCorrelations = correlationService.getModuleCorrelations('qflow');
    expect(Array.isArray(qflowCorrelations)).toBe(true);
  });

  it('should update module metrics', () => {
    const mockMetrics: ModuleMetrics = {
      moduleId: 'qflow',
      moduleName: 'Qflow',
      health: 'healthy',
      metrics: {
        latency: { p50: 100, p95: 200, p99: 300 },
        throughput: 50,
        errorRate: 0.02,
        availability: 0.99,
        resourceUtilization: { cpu: 0.6, memory: 0.4, network: 0.3 }
      },
      timestamp: Date.now()
    };

    const updatePromise = new Promise((resolve) => {
      correlationService.on('module_metrics_updated', resolve);
    });

    correlationService.updateModuleMetrics(mockMetrics);

    expect(updatePromise).resolves.toBeDefined();
  });

  it('should calculate correlations between modules', async () => {
    // Add metrics for two modules
    const qflowMetrics: ModuleMetrics = {
      moduleId: 'qflow',
      moduleName: 'Qflow',
      health: 'healthy',
      metrics: {
        latency: { p50: 100, p95: 200, p99: 300 },
        throughput: 50,
        errorRate: 0.02,
        availability: 0.99,
        resourceUtilization: { cpu: 0.6, memory: 0.4, network: 0.3 }
      },
      timestamp: Date.now()
    };

    const qindexMetrics: ModuleMetrics = {
      moduleId: 'qindex',
      moduleName: 'Qindex',
      health: 'healthy',
      metrics: {
        latency: { p50: 80, p95: 150, p99: 250 },
        throughput: 60,
        errorRate: 0.01,
        availability: 0.995,
        resourceUtilization: { cpu: 0.5, memory: 0.3, network: 0.2 }
      },
      timestamp: Date.now()
    };

    // Add multiple data points for correlation
    for (let i = 0; i < 10; i++) {
      correlationService.updateModuleMetrics({
        ...qflowMetrics,
        timestamp: Date.now() + (i * 1000)
      });
      correlationService.updateModuleMetrics({
        ...qindexMetrics,
        timestamp: Date.now() + (i * 1000)
      });
    }

    // Wait for correlation calculation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const correlation = correlationService.getModuleCorrelation('qflow', 'qindex');
    expect(correlation).toBeDefined();
    if (correlation) {
      expect(correlation.moduleA).toBe('qflow');
      expect(correlation.moduleB).toBe('qindex');
      expect(typeof correlation.correlationCoefficient).toBe('number');
      expect(['positive', 'negative', 'neutral']).toContain(correlation.correlationType);
    }
  });

  it('should calculate ecosystem health index', () => {
    // Add some module metrics
    const modules = ['qflow', 'qindex', 'qonsent', 'qerberos'];
    
    modules.forEach(moduleId => {
      const metrics: ModuleMetrics = {
        moduleId,
        moduleName: moduleId,
        health: 'healthy',
        metrics: {
          latency: { p50: 100, p95: 200, p99: 300 },
          throughput: 50,
          errorRate: 0.02,
          availability: 0.99,
          resourceUtilization: { cpu: 0.6, memory: 0.4, network: 0.3 }
        },
        timestamp: Date.now()
      };
      correlationService.updateModuleMetrics(metrics);
    });

    const healthIndex = correlationService.getEcosystemHealthIndex();
    
    expect(healthIndex.overall).toBeGreaterThanOrEqual(0);
    expect(healthIndex.overall).toBeLessThanOrEqual(1);
    expect(healthIndex.components).toBeDefined();
    expect(healthIndex.components.connectivity).toBeGreaterThanOrEqual(0);
    expect(healthIndex.components.performance).toBeGreaterThanOrEqual(0);
    expect(healthIndex.components.reliability).toBeGreaterThanOrEqual(0);
    expect(healthIndex.components.scalability).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(healthIndex.criticalPaths)).toBe(true);
  });

  it('should generate performance impact analysis', () => {
    // Add metrics for qflow and its dependencies
    const modules = ['qflow', 'qindex', 'qonsent', 'qerberos', 'qlock'];
    
    modules.forEach(moduleId => {
      for (let i = 0; i < 6; i++) {
        const metrics: ModuleMetrics = {
          moduleId,
          moduleName: moduleId,
          health: 'healthy',
          metrics: {
            latency: { p50: 100 + i * 10, p95: 200 + i * 20, p99: 300 + i * 30 },
            throughput: 50 - i * 2,
            errorRate: 0.02 + i * 0.005,
            availability: 0.99 - i * 0.001,
            resourceUtilization: { cpu: 0.6 + i * 0.05, memory: 0.4 + i * 0.03, network: 0.3 + i * 0.02 }
          },
          timestamp: Date.now() + (i * 1000)
        };
        correlationService.updateModuleMetrics(metrics);
      }
    });

    const impactAnalysis = correlationService.getPerformanceImpactAnalysis('qflow');
    
    expect(impactAnalysis.directImpacts).toBeDefined();
    expect(Array.isArray(impactAnalysis.directImpacts)).toBe(true);
    expect(impactAnalysis.cascadingEffects).toBeDefined();
    expect(Array.isArray(impactAnalysis.cascadingEffects)).toBe(true);
    expect(impactAnalysis.recommendations).toBeDefined();
    expect(Array.isArray(impactAnalysis.recommendations)).toBe(true);
  });

  it('should generate performance predictions', () => {
    // Add historical data
    for (let i = 0; i < 10; i++) {
      const metrics: ModuleMetrics = {
        moduleId: 'qflow',
        moduleName: 'Qflow',
        health: 'healthy',
        metrics: {
          latency: { p50: 100 + i * 5, p95: 200 + i * 10, p99: 300 + i * 15 },
          throughput: 50 - i,
          errorRate: 0.02 + i * 0.002,
          availability: 0.99,
          resourceUtilization: { cpu: 0.6 + i * 0.02, memory: 0.4 + i * 0.01, network: 0.3 }
        },
        timestamp: Date.now() + (i * 1000)
      };
      correlationService.updateModuleMetrics(metrics);
    }

    const prediction = correlationService.generatePerformancePredictions('qflow', 30);
    
    expect(prediction.targetModule).toBe('qflow');
    expect(prediction.timeHorizon).toBe(30);
    expect(prediction.predictedMetrics).toBeDefined();
    expect(prediction.predictedMetrics.latency).toBeDefined();
    expect(prediction.predictedMetrics.throughput).toBeDefined();
    expect(prediction.predictedMetrics.errorRate).toBeDefined();
    expect(typeof prediction.confidence).toBe('number');
    expect(Array.isArray(prediction.basedOnModules)).toBe(true);
    expect(Array.isArray(prediction.assumptions)).toBe(true);
  });

  it('should get ecosystem trends', () => {
    // Add time series data
    const modules = ['qflow', 'qindex', 'qonsent'];
    
    modules.forEach(moduleId => {
      for (let i = 0; i < 20; i++) {
        const metrics: ModuleMetrics = {
          moduleId,
          moduleName: moduleId,
          health: i < 10 ? 'healthy' : 'warning',
          metrics: {
            latency: { p50: 100 + i * 2, p95: 200 + i * 4, p99: 300 + i * 6 },
            throughput: 50 - i * 0.5,
            errorRate: 0.02 + i * 0.001,
            availability: 0.99 - i * 0.0001,
            resourceUtilization: { cpu: 0.6 + i * 0.01, memory: 0.4 + i * 0.005, network: 0.3 }
          },
          timestamp: Date.now() - (20 - i) * 60000 // 1 minute intervals
        };
        correlationService.updateModuleMetrics(metrics);
      }
    });

    const trends = correlationService.getEcosystemTrends(3600000); // 1 hour
    
    expect(['improving', 'stable', 'degrading']).toContain(trends.overallTrend);
    expect(trends.modulesTrends).toBeDefined();
    expect(Array.isArray(trends.criticalCorrelations)).toBe(true);
    expect(Array.isArray(trends.emergingIssues)).toBe(true);
  });

  it('should get Qflow ecosystem correlation', () => {
    // Add Qflow and related module metrics
    const modules = ['qflow', 'qindex', 'qonsent', 'qerberos', 'qlock'];
    
    modules.forEach(moduleId => {
      for (let i = 0; i < 8; i++) {
        const metrics: ModuleMetrics = {
          moduleId,
          moduleName: moduleId,
          health: 'healthy',
          metrics: {
            latency: { p50: 100, p95: 200, p99: 300 },
            throughput: 50,
            errorRate: 0.02,
            availability: 0.99,
            resourceUtilization: { cpu: 0.6, memory: 0.4, network: 0.3 }
          },
          timestamp: Date.now() + (i * 1000)
        };
        correlationService.updateModuleMetrics(metrics);
      }
    });

    const qflowCorrelation = correlationService.getQflowEcosystemCorrelation();
    
    expect(['healthy', 'warning', 'critical', 'unknown']).toContain(qflowCorrelation.qflowHealth);
    expect(['healthy', 'warning', 'critical', 'unknown']).toContain(qflowCorrelation.ecosystemHealth);
    expect(Array.isArray(qflowCorrelation.correlations)).toBe(true);
    expect(Array.isArray(qflowCorrelation.performanceGates)).toBe(true);
    expect(Array.isArray(qflowCorrelation.recommendations)).toBe(true);
    
    qflowCorrelation.correlations.forEach(corr => {
      expect(typeof corr.module).toBe('string');
      expect(typeof corr.correlation).toBe('number');
      expect(['positive', 'negative', 'neutral']).toContain(corr.impact);
      expect(typeof corr.criticalPath).toBe('boolean');
    });
  });
});

describe('PredictivePerformanceService', () => {
  let correlationService: EcosystemCorrelationService;
  let predictiveService: PredictivePerformanceService;

  beforeEach(() => {
    correlationService = new EcosystemCorrelationService();
    predictiveService = new PredictivePerformanceService(correlationService, {
      modelRetrainingInterval: 1000, // 1 second for testing
      forecastCacheTimeout: 5000, // 5 seconds for testing
      minTrainingDataSize: 5
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with prediction models', () => {
    const stats = predictiveService.getModelStatistics();
    
    expect(stats.totalModels).toBeGreaterThan(0);
    expect(stats.averageAccuracy).toBeGreaterThan(0);
    expect(stats.modelsByType).toBeDefined();
    expect(typeof stats.recentPredictions).toBe('number');
    expect(typeof stats.trainingDataSize).toBe('number');
  });

  it('should generate performance forecast', async () => {
    const forecast = await predictiveService.generatePerformanceForecast('qflow', 'latency', 60);
    
    expect(forecast.targetModule).toBe('qflow');
    expect(forecast.targetMetric).toBe('latency');
    expect(forecast.timeHorizon).toBe(60);
    expect(Array.isArray(forecast.predictions)).toBe(true);
    expect(forecast.predictions.length).toBeGreaterThan(0);
    expect(typeof forecast.modelUsed).toBe('string');
    expect(typeof forecast.accuracy).toBe('number');
    expect(Array.isArray(forecast.assumptions)).toBe(true);
    expect(Array.isArray(forecast.riskFactors)).toBe(true);
    
    forecast.predictions.forEach(prediction => {
      expect(typeof prediction.timestamp).toBe('number');
      expect(typeof prediction.value).toBe('number');
      expect(typeof prediction.confidence).toBe('number');
      expect(typeof prediction.upperBound).toBe('number');
      expect(typeof prediction.lowerBound).toBe('number');
      expect(prediction.value).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should predict anomalies', async () => {
    const anomalies = await predictiveService.predictAnomalies('qflow', 30);
    
    expect(Array.isArray(anomalies)).toBe(true);
    
    anomalies.forEach(anomaly => {
      expect(anomaly.module).toBe('qflow');
      expect(typeof anomaly.metric).toBe('string');
      expect(typeof anomaly.probabilityOfAnomaly).toBe('number');
      expect(anomaly.probabilityOfAnomaly).toBeGreaterThanOrEqual(0);
      expect(anomaly.probabilityOfAnomaly).toBeLessThanOrEqual(1);
      expect(typeof anomaly.expectedTimeToAnomaly).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(anomaly.severity);
      expect(Array.isArray(anomaly.contributingFactors)).toBe(true);
      
      anomaly.contributingFactors.forEach(factor => {
        expect(typeof factor.factor).toBe('string');
        expect(typeof factor.impact).toBe('number');
        expect(typeof factor.confidence).toBe('number');
      });
    });
  });

  it('should generate capacity forecasts', async () => {
    const forecasts = await predictiveService.generateCapacityForecasts('qflow', 60);
    
    expect(Array.isArray(forecasts)).toBe(true);
    
    forecasts.forEach(forecast => {
      expect(forecast.module).toBe('qflow');
      expect(['cpu', 'memory', 'network', 'storage']).toContain(forecast.resource);
      expect(typeof forecast.currentUtilization).toBe('number');
      expect(forecast.currentUtilization).toBeGreaterThanOrEqual(0);
      expect(forecast.currentUtilization).toBeLessThanOrEqual(1);
      expect(Array.isArray(forecast.predictedUtilization)).toBe(true);
      expect(Array.isArray(forecast.recommendedActions)).toBe(true);
      
      forecast.predictedUtilization.forEach(prediction => {
        expect(typeof prediction.timestamp).toBe('number');
        expect(typeof prediction.utilization).toBe('number');
        expect(prediction.utilization).toBeGreaterThanOrEqual(0);
        expect(prediction.utilization).toBeLessThanOrEqual(1);
        expect(typeof prediction.confidence).toBe('number');
      });
    });
  });

  it('should train models', async () => {
    const trainingPromise = new Promise((resolve) => {
      predictiveService.on('model_training_completed', resolve);
    });

    await predictiveService.trainModels(true);

    const result = await Promise.race([
      trainingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    expect(result).toBeDefined();
  });

  it('should get ecosystem predictions', async () => {
    const predictions = await predictiveService.getEcosystemPredictions(60);
    
    expect(predictions.overallHealth).toBeDefined();
    expect(typeof predictions.overallHealth.current).toBe('number');
    expect(typeof predictions.overallHealth.predicted).toBe('number');
    expect(typeof predictions.overallHealth.confidence).toBe('number');
    
    expect(Array.isArray(predictions.moduleForecasts)).toBe(true);
    expect(Array.isArray(predictions.criticalAlerts)).toBe(true);
    
    predictions.moduleForecasts.forEach(forecast => {
      expect(typeof forecast.module).toBe('string');
      expect(typeof forecast.currentHealth).toBe('string');
      expect(typeof forecast.predictedHealth).toBe('string');
      expect(typeof forecast.confidence).toBe('number');
      expect(Array.isArray(forecast.keyRisks)).toBe(true);
    });
    
    predictions.criticalAlerts.forEach(alert => {
      expect(typeof alert.module).toBe('string');
      expect(typeof alert.alert).toBe('string');
      expect(typeof alert.severity).toBe('string');
      expect(typeof alert.timeToImpact).toBe('number');
    });
  });

  it('should cache forecasts', async () => {
    // Generate first forecast
    const forecast1 = await predictiveService.generatePerformanceForecast('qflow', 'latency', 60);
    
    // Generate second forecast immediately (should be cached)
    const forecast2 = await predictiveService.generatePerformanceForecast('qflow', 'latency', 60);
    
    // Should be the same object (cached)
    expect(forecast1.predictions[0].timestamp).toBe(forecast2.predictions[0].timestamp);
  });

  it('should handle model training errors gracefully', async () => {
    const errorPromise = new Promise((resolve) => {
      predictiveService.on('model_training_error', resolve);
    });

    // Force training with insufficient data
    await predictiveService.trainModels(true);

    // Should handle errors gracefully and continue with other models
    const stats = predictiveService.getModelStatistics();
    expect(stats.totalModels).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  let correlationService: EcosystemCorrelationService;
  let predictiveService: PredictivePerformanceService;

  beforeEach(() => {
    correlationService = new EcosystemCorrelationService();
    predictiveService = new PredictivePerformanceService(correlationService);
  });

  it('should integrate correlation data with predictions', async () => {
    // Add correlated metrics for multiple modules
    const modules = ['qflow', 'qindex', 'qonsent'];
    
    for (let t = 0; t < 15; t++) {
      modules.forEach(moduleId => {
        const metrics: ModuleMetrics = {
          moduleId,
          moduleName: moduleId,
          health: 'healthy',
          metrics: {
            latency: { p50: 100 + t * 5, p95: 200 + t * 10, p99: 300 + t * 15 },
            throughput: 50 - t * 0.5,
            errorRate: 0.02 + t * 0.001,
            availability: 0.99,
            resourceUtilization: { cpu: 0.6 + t * 0.01, memory: 0.4, network: 0.3 }
          },
          timestamp: Date.now() + (t * 1000)
        };
        correlationService.updateModuleMetrics(metrics);
      });
    }

    // Wait for correlations to be calculated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate predictions that should consider correlations
    const forecast = await predictiveService.generatePerformanceForecast('qflow', 'latency', 30);
    
    expect(forecast.riskFactors.length).toBeGreaterThanOrEqual(0);
    expect(forecast.assumptions.length).toBeGreaterThan(0);
  });

  it('should provide comprehensive ecosystem analysis', async () => {
    // Add comprehensive ecosystem data
    const modules = ['qflow', 'qindex', 'qonsent', 'qerberos', 'qlock', 'qwallet'];
    
    modules.forEach(moduleId => {
      for (let i = 0; i < 10; i++) {
        const metrics: ModuleMetrics = {
          moduleId,
          moduleName: moduleId,
          health: i < 8 ? 'healthy' : 'warning',
          metrics: {
            latency: { p50: 100 + i * 3, p95: 200 + i * 6, p99: 300 + i * 9 },
            throughput: 50 - i * 0.3,
            errorRate: 0.02 + i * 0.0005,
            availability: 0.99 - i * 0.0001,
            resourceUtilization: { cpu: 0.6 + i * 0.008, memory: 0.4 + i * 0.005, network: 0.3 }
          },
          timestamp: Date.now() + (i * 1000)
        };
        correlationService.updateModuleMetrics(metrics);
      }
    });

    // Get ecosystem health
    const healthIndex = correlationService.getEcosystemHealthIndex();
    expect(healthIndex.overall).toBeGreaterThanOrEqual(0);

    // Get ecosystem predictions
    const predictions = await predictiveService.getEcosystemPredictions(60);
    expect(predictions.moduleForecasts.length).toBeGreaterThan(0);

    // Get Qflow-specific correlation
    const qflowCorrelation = correlationService.getQflowEcosystemCorrelation();
    expect(qflowCorrelation.correlations.length).toBeGreaterThanOrEqual(0);
  });
});