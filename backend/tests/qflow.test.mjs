/**
 * Qflow Service and Routes Tests
 * Tests for content evaluation, coherence layers, and verdict aggregation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { QflowService } from '../services/QflowService.mjs';
import qflowRoutes from '../routes/qflow.mjs';

// Mock dependencies
vi.mock('../services/EventBusService.mjs', () => ({
  EventBusService: vi.fn().mockImplementation(() => ({
    publish: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../services/ObservabilityService.mjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    recordMetric: vi.fn()
  }))
}));

vi.mock('../middleware/standardAuth.mjs', () => ({
  standardAuth: (req, res, next) => {
    req.user = { squidId: 'test-user', subId: 'test-sub' };
    next();
  }
}));

describe('QflowService', () => {
  let qflowService;

  beforeEach(() => {
    qflowService = new QflowService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(qflowService.config).toBeDefined();
      expect(qflowService.config.cacheTimeout).toBe(300000);
      expect(qflowService.config.confidenceThreshold).toBe(0.7);
      expect(qflowService.config.escalationThreshold).toBe(0.5);
    });

    it('should register default coherence layers', () => {
      const layers = qflowService.getRegisteredLayers();
      expect(layers.length).toBeGreaterThan(0);
      
      const layerNames = layers.map(l => l.id);
      expect(layerNames).toContain('content-safety');
      expect(layerNames).toContain('identity-verification');
      expect(layerNames).toContain('permission-validation');
      expect(layerNames).toContain('risk-assessment');
    });

    it('should initialize default escalation rules', () => {
      const rules = qflowService.getEscalationRules();
      expect(rules.length).toBeGreaterThan(0);
      
      const ruleIds = rules.map(r => r.id);
      expect(ruleIds).toContain('low-confidence');
      expect(ruleIds).toContain('conflicting-verdicts');
      expect(ruleIds).toContain('high-risk-content');
    });
  });

  describe('Content Evaluation', () => {
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const testContext = {
      identity: { squidId: 'test-user', verified: true },
      permissions: ['content.evaluate']
    };

    it('should evaluate content successfully', async () => {
      const evaluation = await qflowService.evaluate(testCid, testContext);

      expect(evaluation).toBeDefined();
      expect(evaluation.id).toBeDefined();
      expect(evaluation.cid).toBe(testCid);
      expect(evaluation.verdict).toMatch(/^(ALLOW|DENY|WARN|UNKNOWN)$/);
      expect(evaluation.confidence).toBeGreaterThanOrEqual(0);
      expect(evaluation.confidence).toBeLessThanOrEqual(1);
      expect(evaluation.layers).toBeDefined();
      expect(evaluation.evidence).toBeDefined();
      expect(evaluation.metadata).toBeDefined();
    });

    it('should cache evaluation results', async () => {
      const evaluation1 = await qflowService.evaluate(testCid, testContext);
      const evaluation2 = await qflowService.evaluate(testCid, testContext);

      expect(evaluation1.id).toBe(evaluation2.id);
      expect(evaluation1.metadata.evaluationTime).toBeDefined();
      expect(evaluation2.metadata.evaluationTime).toBeDefined();
    });

    it('should execute all coherence layers', async () => {
      const evaluation = await qflowService.evaluate(testCid, testContext);

      expect(evaluation.layers.length).toBeGreaterThan(0);
      
      const layerNames = evaluation.layers.map(l => l.name);
      expect(layerNames).toContain('Content Safety Evaluation');
      expect(layerNames).toContain('Identity Verification');
      expect(layerNames).toContain('Permission Validation');
      expect(layerNames).toContain('Risk Assessment');
    });

    it('should collect evidence from layers', async () => {
      const evaluation = await qflowService.evaluate(testCid, testContext);

      expect(evaluation.evidence).toBeDefined();
      expect(Array.isArray(evaluation.evidence)).toBe(true);
      
      if (evaluation.evidence.length > 0) {
        const evidence = evaluation.evidence[0];
        expect(evidence.type).toBeDefined();
        expect(evidence.timestamp).toBeDefined();
      }
    });

    it('should calculate risk score', async () => {
      const evaluation = await qflowService.evaluate(testCid, testContext);

      expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Verdict Aggregation', () => {
    it('should aggregate verdicts with confidence scoring', () => {
      const evaluationContext = {
        verdicts: [
          { layer: 'layer1', verdict: 'ALLOW', confidence: 0.8, weight: 1.0 },
          { layer: 'layer2', verdict: 'ALLOW', confidence: 0.9, weight: 1.0 },
          { layer: 'layer3', verdict: 'WARN', confidence: 0.6, weight: 0.5 }
        ],
        evidence: []
      };

      const aggregated = qflowService.aggregateVerdicts(evaluationContext);

      expect(aggregated.verdict).toBe('ALLOW');
      expect(aggregated.confidence).toBeGreaterThan(0);
      expect(aggregated.confidence).toBeLessThanOrEqual(1);
      expect(aggregated.verdictDistribution).toBeDefined();
    });

    it('should handle empty verdicts', () => {
      const evaluationContext = { verdicts: [], evidence: [] };
      const aggregated = qflowService.aggregateVerdicts(evaluationContext);

      expect(aggregated.verdict).toBe('UNKNOWN');
      expect(aggregated.confidence).toBe(0);
      expect(aggregated.riskScore).toBe(0.5);
    });

    it('should detect conflicting verdicts', () => {
      const evaluation = {
        verdictDistribution: { 'ALLOW': 1, 'DENY': 1 }
      };

      const hasConflict = qflowService.hasConflictingVerdicts(evaluation);
      expect(hasConflict).toBe(true);
    });
  });

  describe('Escalation Rules', () => {
    it('should trigger escalation for low confidence', () => {
      const evaluation = { confidence: 0.3, riskScore: 0.2 };
      const escalation = qflowService.checkEscalationRules(evaluation);

      expect(escalation).toBeDefined();
      expect(escalation.action).toBe('human-review');
      expect(escalation.rule).toBe('low-confidence');
    });

    it('should trigger escalation for high risk content', () => {
      const evaluation = { confidence: 0.9, riskScore: 0.9 };
      const escalation = qflowService.checkEscalationRules(evaluation);

      expect(escalation).toBeDefined();
      expect(escalation.action).toBe('immediate-review');
      expect(escalation.rule).toBe('high-risk-content');
    });

    it('should not trigger escalation for normal content', () => {
      const evaluation = { confidence: 0.8, riskScore: 0.3 };
      const escalation = qflowService.checkEscalationRules(evaluation);

      expect(escalation).toBeNull();
    });
  });

  describe('Layer Management', () => {
    it('should register new coherence layer', () => {
      const layerId = 'test-layer';
      const layerConfig = {
        name: 'Test Layer',
        priority: 10,
        handler: () => ({ verdict: 'ALLOW', confidence: 1.0 })
      };

      qflowService.registerCoherenceLayer(layerId, layerConfig);
      const layers = qflowService.getRegisteredLayers();
      
      const testLayer = layers.find(l => l.id === layerId);
      expect(testLayer).toBeDefined();
      expect(testLayer.name).toBe('Test Layer');
    });

    it('should unregister coherence layer', () => {
      const layerId = 'test-layer';
      qflowService.registerCoherenceLayer(layerId, { name: 'Test' });
      
      const removed = qflowService.unregisterCoherenceLayer(layerId);
      expect(removed).toBe(true);
      
      const layers = qflowService.getRegisteredLayers();
      const testLayer = layers.find(l => l.id === layerId);
      expect(testLayer).toBeUndefined();
    });
  });

  describe('Cache Management', () => {
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const testContext = { test: 'context' };

    it('should generate consistent evaluation IDs', () => {
      const id1 = qflowService.generateEvaluationId(testCid, testContext);
      const id2 = qflowService.generateEvaluationId(testCid, testContext);
      
      expect(id1).toBe(id2);
      expect(id1).toContain(testCid);
    });

    it('should cache and retrieve evaluations', () => {
      const evaluationId = 'test-eval-id';
      const evaluation = { verdict: 'ALLOW', confidence: 0.8 };

      qflowService.cacheEvaluation(evaluationId, evaluation);
      const cached = qflowService.getCachedEvaluation(evaluationId);

      expect(cached).toEqual(evaluation);
    });

    it('should expire cached evaluations', () => {
      const evaluationId = 'test-eval-id';
      const evaluation = { verdict: 'ALLOW', confidence: 0.8 };

      // Mock expired cache
      qflowService.evaluationCache.set(evaluationId, {
        evaluation,
        timestamp: Date.now() - qflowService.config.cacheTimeout - 1000
      });

      const cached = qflowService.getCachedEvaluation(evaluationId);
      expect(cached).toBeNull();
    });
  });

  describe('Performance Optimization', () => {
    it('should warmup cache for multiple CIDs', async () => {
      const cids = [
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'
      ];
      const context = { test: 'warmup' };

      const results = await qflowService.warmupCache(cids, context);

      expect(results).toBeDefined();
      expect(results.length).toBe(cids.length);
      results.forEach((result, index) => {
        expect(result.cid).toBe(cids[index]);
        expect(result.success).toBeDefined();
      });
    });

    it('should provide service metrics', () => {
      const metrics = qflowService.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.cacheSize).toBeDefined();
      expect(metrics.registeredLayers).toBeDefined();
      expect(metrics.escalationRules).toBeDefined();
      expect(metrics.config).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        cacheTimeout: 600000,
        confidenceThreshold: 0.8
      };

      qflowService.updateConfig(newConfig);

      expect(qflowService.config.cacheTimeout).toBe(600000);
      expect(qflowService.config.confidenceThreshold).toBe(0.8);
    });
  });

  describe('Execution Optimization Features', () => {
    describe('Resource Pooling', () => {
      it('should initialize resource pools', () => {
        expect(qflowService.resourcePools.size).toBeGreaterThan(0);
        expect(qflowService.resourcePools.has('wasm-runtime')).toBe(true);
        expect(qflowService.resourcePools.has('connections')).toBe(true);
        expect(qflowService.resourcePools.has('eval-context')).toBe(true);
      });

      it('should create and return resources from pool', async () => {
        const resource = await qflowService.getResourceFromPool('wasm-test');
        expect(resource).toBeDefined();
        expect(resource.type).toBe('wasm-runtime');

        await qflowService.returnResourceToPool('wasm-test', resource);
        
        const pooledResource = await qflowService.getResourceFromPool('wasm-test');
        expect(pooledResource).toBe(resource);
      });

      it('should create WASM runtime resources', async () => {
        const runtime = await qflowService.createWasmRuntime();
        expect(runtime).toBeDefined();
        expect(runtime.type).toBe('wasm-runtime');
        expect(runtime.execute).toBeDefined();
        expect(typeof runtime.execute).toBe('function');
      });

      it('should create connection resources', async () => {
        const connection = await qflowService.createConnection();
        expect(connection).toBeDefined();
        expect(connection.type).toBe('connection');
        expect(connection.connected).toBe(true);
      });
    });

    describe('Lazy Loading', () => {
      it('should lazy load layer components', async () => {
        const layer = { id: 'test-layer', name: 'Test Layer' };
        
        const components = await qflowService.lazyLoadLayerComponents(layer);
        expect(components).toBeDefined();
        expect(components.layerId).toBe(layer.id);
        expect(components.components).toBeDefined();
        expect(Array.isArray(components.components)).toBe(true);
      });

      it('should cache lazy loaded components', async () => {
        const layer = { id: 'cache-test-layer', name: 'Cache Test Layer' };
        
        const components1 = await qflowService.lazyLoadLayerComponents(layer);
        const components2 = await qflowService.lazyLoadLayerComponents(layer);
        
        expect(components1).toBe(components2);
      });

      it('should skip lazy loading when disabled', async () => {
        qflowService.config.lazyLoadingEnabled = false;
        const layer = { id: 'disabled-layer', name: 'Disabled Layer' };
        
        const result = await qflowService.lazyLoadLayerComponents(layer);
        expect(result).toBeUndefined();
        
        qflowService.config.lazyLoadingEnabled = true;
      });
    });

    describe('Parallel Execution', () => {
      it('should group layers by dependency', () => {
        const layers = [
          { id: 'layer1', priority: 1 },
          { id: 'layer2', priority: 5 },
          { id: 'layer3', priority: 12 },
          { id: 'layer4', priority: 15 }
        ];

        const groups = qflowService.groupLayersByDependency(layers);
        expect(groups).toBeDefined();
        expect(Array.isArray(groups)).toBe(true);
        expect(groups.length).toBeGreaterThan(0);
      });

      it('should chunk arrays for concurrent processing', () => {
        const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const chunks = qflowService.chunkArray(array, 3);
        
        expect(chunks.length).toBe(4);
        expect(chunks[0]).toEqual([1, 2, 3]);
        expect(chunks[1]).toEqual([4, 5, 6]);
        expect(chunks[2]).toEqual([7, 8, 9]);
        expect(chunks[3]).toEqual([10]);
      });

      it('should execute layers in parallel when enabled', async () => {
        qflowService.config.parallelExecution = true;
        
        const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
        const testContext = {
          identity: { squidId: 'test-user', verified: true },
          permissions: ['content.evaluate']
        };

        const startTime = Date.now();
        const evaluation = await qflowService.evaluate(testCid, testContext);
        const executionTime = Date.now() - startTime;

        expect(evaluation).toBeDefined();
        expect(evaluation.layers.length).toBeGreaterThan(0);
        // Parallel execution should be faster than sequential
        expect(executionTime).toBeLessThan(10000);
      });
    });

    describe('Performance Monitoring', () => {
      it('should provide optimization metrics', () => {
        const metrics = qflowService.getOptimizationMetrics();
        
        expect(metrics).toBeDefined();
        expect(metrics.resourcePools).toBeDefined();
        expect(metrics.lazyLoadedComponents).toBeDefined();
        expect(metrics.parallelExecutionEnabled).toBeDefined();
        expect(metrics.maxConcurrentLayers).toBeDefined();
      });

      it('should track resource pool utilization', async () => {
        const resource = await qflowService.getResourceFromPool('test-layer');
        const metrics = qflowService.getOptimizationMetrics();
        
        expect(metrics.resourcePools['eval-context'].utilization).toBeGreaterThan(0);
        
        await qflowService.returnResourceToPool('test-layer', resource);
      });
    });

    describe('Resource Cleanup', () => {
      it('should cleanup all resources', async () => {
        // Create some resources
        await qflowService.getResourceFromPool('test1');
        await qflowService.lazyLoadLayerComponents({ id: 'test-cleanup', name: 'Test' });
        
        await qflowService.cleanup();
        
        const metrics = qflowService.getOptimizationMetrics();
        expect(metrics.resourcePools['eval-context'].available).toBe(0);
        expect(metrics.lazyLoadedComponents).toBe(0);
      });
    });
  });

  describe('Performance Profiling and Optimization Tools', () => {
    describe('Performance Profiling', () => {
      it('should start and end performance profiling', () => {
        const evaluationId = 'test-eval-123';
        const profileData = qflowService.startPerformanceProfiling(evaluationId);
        
        expect(profileData).toBeDefined();
        expect(profileData.evaluationId).toBe(evaluationId);
        expect(profileData.startTime).toBeDefined();
        expect(profileData.events).toEqual([]);
        expect(profileData.layerTimings).toBeDefined();
        
        qflowService.endPerformanceProfiling(profileData);
        
        expect(profileData.endTime).toBeDefined();
        expect(profileData.totalDuration).toBeDefined();
        expect(profileData.resourceUsage.deltas).toBeDefined();
      });

      it('should record profiling events', () => {
        const profileData = qflowService.startPerformanceProfiling('test-eval');
        
        qflowService.recordProfileEvent(profileData, 'cache-hit', 50, { layerId: 'test-layer' });
        qflowService.recordProfileEvent(profileData, 'layer-execution', 200, { layerId: 'test-layer' });
        
        expect(profileData.events.length).toBe(2);
        expect(profileData.events[0].type).toBe('cache-hit');
        expect(profileData.events[1].type).toBe('layer-execution');
        expect(profileData.layerTimings.has('test-layer')).toBe(true);
      });

      it('should analyze layer performance', () => {
        const profileData = {
          layerTimings: new Map([
            ['layer1', [{ duration: 100 }, { duration: 150 }, { duration: 120 }]],
            ['layer2', [{ duration: 300 }, { duration: 350 }]]
          ])
        };
        
        const analysis = qflowService.analyzeLayerPerformance(profileData);
        
        expect(analysis.layer1).toBeDefined();
        expect(analysis.layer1.executionCount).toBe(3);
        expect(analysis.layer1.averageDuration).toBe(123.33333333333333);
        expect(analysis.layer1.maxDuration).toBe(150);
        expect(analysis.layer1.minDuration).toBe(100);
        
        expect(analysis.layer2).toBeDefined();
        expect(analysis.layer2.executionCount).toBe(2);
        expect(analysis.layer2.averageDuration).toBe(325);
      });

      it('should analyze resource usage', () => {
        const profileData = {
          resourceUsage: {
            deltas: {
              memory: { rss: 1024000, heapUsed: 512000, heapTotal: 2048000 },
              cpu: { user: 100000, system: 50000 }
            }
          },
          totalDuration: 1000
        };
        
        const analysis = qflowService.analyzeResourceUsage(profileData);
        
        expect(analysis.memoryUsage).toBeDefined();
        expect(analysis.memoryUsage.rssIncrease).toBe(1024000);
        expect(analysis.memoryUsage.heapIncrease).toBe(512000);
        expect(analysis.memoryUsage.efficiency).toBeDefined();
        
        expect(analysis.cpuUsage).toBeDefined();
        expect(analysis.cpuUsage.userTime).toBe(100000);
        expect(analysis.cpuUsage.systemTime).toBe(50000);
        expect(analysis.cpuUsage.totalTime).toBe(150000);
      });
    });

    describe('Bottleneck Detection', () => {
      it('should identify performance bottlenecks', () => {
        // Mock slow layer performance
        qflowService.config.performanceThresholds.layerExecutionTime = 1000;
        
        const profileData = {
          layerTimings: new Map([
            ['slow-layer', [{ duration: 2500 }, { duration: 3000 }]]
          ]),
          resourceUsage: {
            deltas: {
              memory: { rss: 100 * 1024 * 1024, heapUsed: 50 * 1024 * 1024 }, // 100MB
              cpu: { user: 1000000, system: 500000 }
            }
          },
          totalDuration: 3000
        };
        
        const bottlenecks = qflowService.identifyBottlenecks(profileData);
        
        expect(bottlenecks.length).toBeGreaterThan(0);
        const slowLayerBottleneck = bottlenecks.find(b => b.type === 'slow-layer');
        expect(slowLayerBottleneck).toBeDefined();
        expect(slowLayerBottleneck.layerId).toBe('slow-layer');
        expect(slowLayerBottleneck.severity).toBe('high');
      });

      it('should detect and store bottlenecks', () => {
        const profileData = {
          layerTimings: new Map([
            ['bottleneck-layer', [{ duration: 5000 }]]
          ]),
          resourceUsage: {
            deltas: {
              memory: { rss: 1024, heapUsed: 512 },
              cpu: { user: 1000, system: 500 }
            }
          },
          totalDuration: 5000
        };
        
        qflowService.detectBottlenecks(profileData);
        
        const bottlenecks = qflowService.getBottlenecks();
        expect(bottlenecks.length).toBeGreaterThan(0);
        
        const detected = bottlenecks.find(b => b.layerId === 'bottleneck-layer');
        expect(detected).toBeDefined();
        expect(detected.occurrences).toBe(1);
      });
    });

    describe('Optimization Recommendations', () => {
      it('should generate optimization recommendations', () => {
        const profileData = {
          layerTimings: new Map([
            ['layer1', [{ duration: 100 }]],
            ['layer2', [{ duration: 200 }]],
            ['layer3', [{ duration: 300 }]],
            ['layer4', [{ duration: 400 }]]
          ]),
          resourceUsage: {
            deltas: {
              memory: { rss: 1024, heapUsed: 512 },
              cpu: { user: 1000, system: 500 }
            }
          },
          totalDuration: 1000,
          evaluationId: 'test-eval'
        };
        
        // Disable parallel execution to trigger recommendation
        qflowService.config.parallelExecution = false;
        
        const evaluation = { verdict: 'ALLOW', confidence: 0.8 };
        const recommendations = qflowService.generateOptimizationRecommendations(profileData, evaluation);
        
        expect(recommendations.length).toBeGreaterThan(0);
        const parallelRec = recommendations.find(r => r.type === 'parallel-execution');
        expect(parallelRec).toBeDefined();
        expect(parallelRec.priority).toBe('high');
      });

      it('should get optimization recommendations with priority sorting', () => {
        // Add some test recommendations
        qflowService.optimizationRecommendations.push(
          { type: 'test1', priority: 'low', timestamp: Date.now() },
          { type: 'test2', priority: 'high', timestamp: Date.now() },
          { type: 'test3', priority: 'medium', timestamp: Date.now() }
        );
        
        const recommendations = qflowService.getOptimizationRecommendations(5);
        
        expect(recommendations.length).toBeGreaterThanOrEqual(1);
        // High priority should come first
        expect(recommendations[0].priority).toBe('high');
      });
    });

    describe('Performance Regression Detection', () => {
      it('should detect performance regression', () => {
        // Add baseline execution history
        for (let i = 0; i < 20; i++) {
          qflowService.executionHistory.push({
            evaluationId: `baseline-${i}`,
            duration: 1000 + Math.random() * 100, // ~1000ms baseline
            timestamp: Date.now() - (20 - i) * 60000
          });
        }
        
        // Add recent slower executions
        for (let i = 0; i < 10; i++) {
          qflowService.executionHistory.push({
            evaluationId: `recent-${i}`,
            duration: 1500 + Math.random() * 100, // ~1500ms (50% slower)
            timestamp: Date.now() - (10 - i) * 60000
          });
        }
        
        const regression = qflowService.checkPerformanceRegression(1600);
        
        expect(regression).toBeDefined();
        expect(regression.detected).toBe(true);
        expect(regression.severity).toBe('high');
        expect(parseFloat(regression.regressionPercentage)).toBeGreaterThan(20);
      });

      it('should not detect regression with stable performance', () => {
        // Clear history and add stable executions
        qflowService.executionHistory.length = 0;
        
        for (let i = 0; i < 30; i++) {
          qflowService.executionHistory.push({
            evaluationId: `stable-${i}`,
            duration: 1000 + Math.random() * 50, // Stable ~1000ms
            timestamp: Date.now() - (30 - i) * 60000
          });
        }
        
        const regression = qflowService.checkPerformanceRegression(1020);
        
        expect(regression).toBeNull();
      });
    });

    describe('Execution Statistics', () => {
      it('should calculate execution statistics', () => {
        // Clear and add test data
        qflowService.executionHistory.length = 0;
        
        const testDurations = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700];
        testDurations.forEach((duration, i) => {
          qflowService.executionHistory.push({
            evaluationId: `stats-${i}`,
            duration,
            timestamp: Date.now() - (testDurations.length - i) * 60000
          });
        });
        
        const stats = qflowService.getExecutionStatistics();
        
        expect(stats.totalExecutions).toBe(10);
        expect(stats.averageDuration).toBe(1250);
        expect(stats.minDuration).toBe(800);
        expect(stats.maxDuration).toBe(1700);
        expect(stats.percentiles).toBeDefined();
        expect(stats.percentiles.p50).toBeDefined();
        expect(stats.percentiles.p95).toBeDefined();
        expect(stats.percentiles.p99).toBeDefined();
      });

      it('should calculate performance trends', () => {
        // Clear and add trending data
        qflowService.executionHistory.length = 0;
        
        // Add older faster executions
        for (let i = 0; i < 10; i++) {
          qflowService.executionHistory.push({
            evaluationId: `old-${i}`,
            duration: 800 + Math.random() * 100,
            timestamp: Date.now() - (20 - i) * 60000
          });
        }
        
        // Add recent slower executions (degrading trend)
        for (let i = 0; i < 10; i++) {
          qflowService.executionHistory.push({
            evaluationId: `recent-${i}`,
            duration: 1200 + Math.random() * 100,
            timestamp: Date.now() - (10 - i) * 60000
          });
        }
        
        const trend = qflowService.calculateRecentTrend();
        expect(trend).toBe('degrading');
      });
    });
  });
});

describe('Qflow Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/qflow', qflowRoutes);
  });

  describe('POST /api/qflow/evaluate', () => {
    const validPayload = {
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      context: {
        identity: { squidId: 'test-user', verified: true },
        permissions: ['content.evaluate']
      }
    };

    it('should evaluate content successfully', async () => {
      const response = await request(app)
        .post('/api/qflow/evaluate')
        .send(validPayload)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('EVALUATION_COMPLETED');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.verdict).toMatch(/^(ALLOW|DENY|WARN|UNKNOWN)$/);
      expect(response.body.cid).toBe(validPayload.cid);
    });

    it('should validate CID format', async () => {
      const invalidPayload = {
        ...validPayload,
        cid: 'invalid-cid'
      };

      const response = await request(app)
        .post('/api/qflow/evaluate')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should require CID parameter', async () => {
      const invalidPayload = {
        context: validPayload.context
      };

      const response = await request(app)
        .post('/api/qflow/evaluate')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/qflow/evaluate/:cid', () => {
    const testCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

    it('should return 404 for non-cached evaluation', async () => {
      const response = await request(app)
        .get(`/api/qflow/evaluate/${testCid}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('EVALUATION_NOT_FOUND');
    });
  });

  describe('POST /api/qflow/batch-evaluate', () => {
    const validPayload = {
      cids: [
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'
      ],
      context: {
        identity: { squidId: 'test-user', verified: true }
      }
    };

    it('should evaluate multiple CIDs', async () => {
      const response = await request(app)
        .post('/api/qflow/batch-evaluate')
        .send(validPayload)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('BATCH_EVALUATION_COMPLETED');
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.results.length).toBe(validPayload.cids.length);
      expect(response.body.data.summary).toBeDefined();
    });

    it('should validate CID array', async () => {
      const invalidPayload = {
        cids: ['invalid-cid'],
        context: {}
      };

      const response = await request(app)
        .post('/api/qflow/batch-evaluate')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should limit batch size', async () => {
      const largeBatch = {
        cids: new Array(100).fill('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'),
        context: {}
      };

      const response = await request(app)
        .post('/api/qflow/batch-evaluate')
        .send(largeBatch)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/qflow/layers', () => {
    it('should return registered layers', async () => {
      const response = await request(app)
        .get('/api/qflow/layers')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('LAYERS_RETRIEVED');
      expect(response.body.data.layers).toBeDefined();
      expect(response.body.data.count).toBeDefined();
    });
  });

  describe('GET /api/qflow/escalation-rules', () => {
    it('should return escalation rules', async () => {
      const response = await request(app)
        .get('/api/qflow/escalation-rules')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('ESCALATION_RULES_RETRIEVED');
      expect(response.body.data.rules).toBeDefined();
      expect(response.body.data.count).toBeDefined();
    });
  });

  describe('POST /api/qflow/escalation-rules/:ruleId', () => {
    const validRule = {
      action: 'human-review',
      priority: 'medium',
      timeout: 3600000,
      description: 'Test escalation rule'
    };

    it('should add escalation rule', async () => {
      const response = await request(app)
        .post('/api/qflow/escalation-rules/test-rule')
        .send(validRule)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('ESCALATION_RULE_ADDED');
      expect(response.body.data.ruleId).toBe('test-rule');
    });

    it('should validate rule configuration', async () => {
      const invalidRule = {
        action: 'invalid-action',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/qflow/escalation-rules/test-rule')
        .send(invalidRule)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/qflow/metrics', () => {
    it('should return service metrics', async () => {
      const response = await request(app)
        .get('/api/qflow/metrics')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('METRICS_RETRIEVED');
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/qflow/warmup', () => {
    const validPayload = {
      cids: [
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'
      ],
      context: {}
    };

    it('should warmup cache', async () => {
      const response = await request(app)
        .post('/api/qflow/warmup')
        .send(validPayload)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('CACHE_WARMUP_COMPLETED');
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });
  });

  describe('POST /api/qflow/config', () => {
    const validConfig = {
      cacheTimeout: 600000,
      confidenceThreshold: 0.8,
      escalationThreshold: 0.6,
      parallelExecution: true,
      maxConcurrentLayers: 8,
      resourcePoolSize: 15,
      lazyLoadingEnabled: true
    };

    it('should update configuration', async () => {
      const response = await request(app)
        .post('/api/qflow/config')
        .send(validConfig)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('CONFIG_UPDATED');
      expect(response.body.data.config).toBeDefined();
      expect(response.body.data.config.parallelExecution).toBe(true);
      expect(response.body.data.config.maxConcurrentLayers).toBe(8);
    });

    it('should validate configuration values', async () => {
      const invalidConfig = {
        cacheTimeout: -1000,
        confidenceThreshold: 2.0,
        maxConcurrentLayers: 50
      };

      const response = await request(app)
        .post('/api/qflow/config')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should update optimization settings', async () => {
      const optimizationConfig = {
        parallelExecution: false,
        lazyLoadingEnabled: false,
        resourcePoolSize: 5
      };

      const response = await request(app)
        .post('/api/qflow/config')
        .send(optimizationConfig)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.config.parallelExecution).toBe(false);
      expect(response.body.data.config.lazyLoadingEnabled).toBe(false);
    });
  });

  describe('GET /api/qflow/optimization-metrics', () => {
    it('should return optimization metrics', async () => {
      const response = await request(app)
        .get('/api/qflow/optimization-metrics')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('OPTIMIZATION_METRICS_RETRIEVED');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.resourcePools).toBeDefined();
      expect(response.body.data.lazyLoadedComponents).toBeDefined();
      expect(response.body.data.parallelExecutionEnabled).toBeDefined();
    });
  });

  describe('POST /api/qflow/resource-pools/cleanup', () => {
    it('should cleanup resource pools', async () => {
      const response = await request(app)
        .post('/api/qflow/resource-pools/cleanup')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('RESOURCE_POOLS_CLEANED');
    });
  });

  describe('POST /api/qflow/preload-components', () => {
    const validPayload = {
      layerIds: ['content-safety', 'identity-verification', 'permission-validation']
    };

    it('should preload layer components', async () => {
      const response = await request(app)
        .post('/api/qflow/preload-components')
        .send(validPayload)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.code).toBe('COMPONENTS_PRELOADED');
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.total).toBe(validPayload.layerIds.length);
    });

    it('should handle non-existent layers', async () => {
      const invalidPayload = {
        layerIds: ['non-existent-layer', 'content-safety']
      };

      const response = await request(app)
        .post('/api/qflow/preload-components')
        .send(invalidPayload)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.data.results).toBeDefined();
      
      const results = response.body.data.results;
      expect(results.find(r => r.layerId === 'non-existent-layer').status).toBe('not-found');
      expect(results.find(r => r.layerId === 'content-safety').status).toBe('loaded');
    });

    it('should validate layer IDs array', async () => {
      const invalidPayload = {
        layerIds: []
      };

      const response = await request(app)
        .post('/api/qflow/preload-components')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});