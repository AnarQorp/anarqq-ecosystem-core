/**
 * Qflow Evaluation Routes
 * Provides endpoints for content evaluation and coherence layer management
 */

import express from 'express';
import crypto from 'crypto';
import { QflowService } from '../services/QflowService.mjs';
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';
import { validateSchema } from '../middleware/jsonSchemaValidation.mjs';

const router = express.Router();
const qflowService = new QflowService();

// Validation schemas
const evaluateSchema = {
  type: 'object',
  required: ['cid'],
  properties: {
    cid: {
      type: 'string',
      pattern: '^Qm[1-9A-HJ-NP-Za-km-z]{44}$',
      description: 'IPFS Content Identifier'
    },
    context: {
      type: 'object',
      properties: {
        identity: {
          type: 'object',
          properties: {
            squidId: { type: 'string' },
            subId: { type: 'string' },
            verified: { type: 'boolean' }
          }
        },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        },
        metadata: {
          type: 'object',
          additionalProperties: true
        }
      },
      additionalProperties: true
    },
    options: {
      type: 'object',
      properties: {
        skipCache: { type: 'boolean' },
        layers: {
          type: 'array',
          items: { type: 'string' }
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 60000
        }
      }
    }
  },
  additionalProperties: false
};

const layerRegistrationSchema = {
  type: 'object',
  required: ['name', 'priority'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    priority: {
      type: 'number',
      minimum: 1,
      maximum: 100
    },
    timeout: {
      type: 'number',
      minimum: 1000,
      maximum: 60000,
      default: 10000
    },
    weight: {
      type: 'number',
      minimum: 0.1,
      maximum: 10.0,
      default: 1.0
    },
    critical: {
      type: 'boolean',
      default: false
    },
    retryPolicy: {
      type: 'object',
      properties: {
        maxRetries: {
          type: 'number',
          minimum: 0,
          maximum: 5,
          default: 2
        },
        backoffMs: {
          type: 'number',
          minimum: 100,
          maximum: 10000,
          default: 1000
        }
      }
    }
  },
  additionalProperties: false
};

/**
 * POST /qflow/evaluate
 * Main evaluation endpoint for CID evaluation with coherence layers
 */
router.post('/evaluate', 
  standardAuthMiddleware(),
  validateSchema(evaluateSchema),
  async (req, res) => {
    try {
      const { cid, context = {}, options = {} } = req.body;
      
      // Add request context
      const evaluationContext = {
        ...context,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      };

      // Handle cache skip option
      if (options.skipCache) {
        const evaluationId = qflowService.generateEvaluationId(cid, evaluationContext);
        qflowService.evaluationCache.delete(evaluationId);
      }

      const evaluation = await qflowService.evaluate(cid, evaluationContext);

      res.json({
        status: 'ok',
        code: 'EVALUATION_COMPLETED',
        message: 'Content evaluation completed successfully',
        data: evaluation,
        cid
      });

    } catch (error) {
      console.error('Qflow evaluation error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'EVALUATION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /qflow/evaluate/:cid
 * Get cached evaluation result
 */
router.get('/evaluate/:cid',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const { cid } = req.params;
      const context = req.query.context ? JSON.parse(req.query.context) : {};
      
      const evaluationId = qflowService.generateEvaluationId(cid, context);
      const cached = qflowService.getCachedEvaluation(evaluationId);

      if (!cached) {
        return res.status(404).json({
          status: 'error',
          code: 'EVALUATION_NOT_FOUND',
          message: 'No cached evaluation found for this CID and context'
        });
      }

      res.json({
        status: 'ok',
        code: 'CACHED_EVALUATION_FOUND',
        message: 'Cached evaluation retrieved successfully',
        data: cached,
        cid
      });

    } catch (error) {
      console.error('Cached evaluation retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'CACHE_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/batch-evaluate
 * Batch evaluation for multiple CIDs
 */
router.post('/batch-evaluate',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    required: ['cids'],
    properties: {
      cids: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'
        },
        minItems: 1,
        maxItems: 50
      },
      context: {
        type: 'object',
        additionalProperties: true
      }
    }
  }),
  async (req, res) => {
    try {
      const { cids, context = {} } = req.body;

      const evaluations = await Promise.allSettled(
        cids.map(cid => qflowService.evaluate(cid, context))
      );

      const results = evaluations.map((result, index) => ({
        cid: cids[index],
        success: result.status === 'fulfilled',
        evaluation: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));

      const successCount = results.filter(r => r.success).length;

      res.json({
        status: 'ok',
        code: 'BATCH_EVALUATION_COMPLETED',
        message: `Batch evaluation completed: ${successCount}/${cids.length} successful`,
        data: {
          results,
          summary: {
            total: cids.length,
            successful: successCount,
            failed: cids.length - successCount
          }
        }
      });

    } catch (error) {
      console.error('Batch evaluation error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'BATCH_EVALUATION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/layers
 * Get registered coherence layers
 */
router.get('/layers',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const layers = qflowService.getRegisteredLayers();

      res.json({
        status: 'ok',
        code: 'LAYERS_RETRIEVED',
        message: 'Coherence layers retrieved successfully',
        data: {
          layers,
          count: layers.length
        }
      });

    } catch (error) {
      console.error('Layer retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'LAYER_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/layers/:layerId
 * Register a new coherence layer
 */
router.post('/layers/:layerId',
  standardAuthMiddleware(),
  validateSchema(layerRegistrationSchema),
  async (req, res) => {
    try {
      const { layerId } = req.params;
      const layerConfig = req.body;

      // For now, we only support configuration of existing layers
      // Custom layer handlers would need to be implemented separately
      const existingLayer = qflowService.coherenceLayers.get(layerId);
      if (!existingLayer) {
        return res.status(404).json({
          status: 'error',
          code: 'LAYER_NOT_FOUND',
          message: 'Layer not found. Custom layer registration not yet supported.'
        });
      }

      // Update layer configuration
      qflowService.registerCoherenceLayer(layerId, {
        ...existingLayer,
        ...layerConfig
      });

      res.json({
        status: 'ok',
        code: 'LAYER_UPDATED',
        message: 'Coherence layer configuration updated successfully',
        data: {
          layerId,
          config: layerConfig
        }
      });

    } catch (error) {
      console.error('Layer registration error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'LAYER_REGISTRATION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /qflow/layers/:layerId
 * Unregister a coherence layer
 */
router.delete('/layers/:layerId',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const { layerId } = req.params;
      
      const removed = qflowService.unregisterCoherenceLayer(layerId);
      
      if (!removed) {
        return res.status(404).json({
          status: 'error',
          code: 'LAYER_NOT_FOUND',
          message: 'Coherence layer not found'
        });
      }

      res.json({
        status: 'ok',
        code: 'LAYER_REMOVED',
        message: 'Coherence layer removed successfully',
        data: { layerId }
      });

    } catch (error) {
      console.error('Layer removal error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'LAYER_REMOVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/escalation-rules
 * Get escalation rules
 */
router.get('/escalation-rules',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const rules = qflowService.getEscalationRules();

      res.json({
        status: 'ok',
        code: 'ESCALATION_RULES_RETRIEVED',
        message: 'Escalation rules retrieved successfully',
        data: {
          rules,
          count: rules.length
        }
      });

    } catch (error) {
      console.error('Escalation rules retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ESCALATION_RULES_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/escalation-rules/:ruleId
 * Add or update escalation rule
 */
router.post('/escalation-rules/:ruleId',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    required: ['action', 'priority'],
    properties: {
      action: {
        type: 'string',
        enum: ['human-review', 'expert-review', 'immediate-review', 'auto-deny', 'auto-allow']
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical']
      },
      timeout: {
        type: 'number',
        minimum: 60000,
        maximum: 86400000
      },
      description: {
        type: 'string',
        maxLength: 500
      }
    }
  }),
  async (req, res) => {
    try {
      const { ruleId } = req.params;
      const ruleConfig = req.body;

      // Create a simple condition function for basic rules
      const condition = (evaluation) => {
        if (ruleId.includes('confidence')) {
          return evaluation.confidence < 0.5;
        }
        if (ruleId.includes('risk')) {
          return evaluation.riskScore > 0.8;
        }
        return false;
      };

      qflowService.addEscalationRule(ruleId, {
        ...ruleConfig,
        condition
      });

      res.json({
        status: 'ok',
        code: 'ESCALATION_RULE_ADDED',
        message: 'Escalation rule added successfully',
        data: {
          ruleId,
          config: ruleConfig
        }
      });

    } catch (error) {
      console.error('Escalation rule addition error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ESCALATION_RULE_ADDITION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /qflow/escalation-rules/:ruleId
 * Remove escalation rule
 */
router.delete('/escalation-rules/:ruleId',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const { ruleId } = req.params;
      
      const removed = qflowService.removeEscalationRule(ruleId);
      
      if (!removed) {
        return res.status(404).json({
          status: 'error',
          code: 'ESCALATION_RULE_NOT_FOUND',
          message: 'Escalation rule not found'
        });
      }

      res.json({
        status: 'ok',
        code: 'ESCALATION_RULE_REMOVED',
        message: 'Escalation rule removed successfully',
        data: { ruleId }
      });

    } catch (error) {
      console.error('Escalation rule removal error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ESCALATION_RULE_REMOVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/metrics
 * Get Qflow service metrics
 */
router.get('/metrics',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const metrics = qflowService.getMetrics();

      res.json({
        status: 'ok',
        code: 'METRICS_RETRIEVED',
        message: 'Qflow metrics retrieved successfully',
        data: metrics
      });

    } catch (error) {
      console.error('Metrics retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'METRICS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/warmup
 * Warmup cache with frequently accessed CIDs
 */
router.post('/warmup',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    required: ['cids'],
    properties: {
      cids: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^Qm[1-9A-HJ-NP-Za-km-z]{44}$'
        },
        minItems: 1,
        maxItems: 100
      },
      context: {
        type: 'object',
        additionalProperties: true
      }
    }
  }),
  async (req, res) => {
    try {
      const { cids, context = {} } = req.body;

      const results = await qflowService.warmupCache(cids, context);

      const successCount = results.filter(r => r.success).length;

      res.json({
        status: 'ok',
        code: 'CACHE_WARMUP_COMPLETED',
        message: `Cache warmup completed: ${successCount}/${cids.length} successful`,
        data: {
          results,
          summary: {
            total: cids.length,
            successful: successCount,
            failed: cids.length - successCount
          }
        }
      });

    } catch (error) {
      console.error('Cache warmup error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'CACHE_WARMUP_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/config
 * Update Qflow configuration
 */
router.post('/config',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    properties: {
      cacheTimeout: {
        type: 'number',
        minimum: 60000,
        maximum: 3600000
      },
      confidenceThreshold: {
        type: 'number',
        minimum: 0,
        maximum: 1
      },
      escalationThreshold: {
        type: 'number',
        minimum: 0,
        maximum: 1
      },
      maxLayerDepth: {
        type: 'number',
        minimum: 1,
        maximum: 50
      },
      evaluationTimeout: {
        type: 'number',
        minimum: 5000,
        maximum: 300000
      },
      parallelExecution: {
        type: 'boolean'
      },
      maxConcurrentLayers: {
        type: 'number',
        minimum: 1,
        maximum: 20
      },
      resourcePoolSize: {
        type: 'number',
        minimum: 1,
        maximum: 100
      },
      lazyLoadingEnabled: {
        type: 'boolean'
      }
    },
    additionalProperties: false
  }),
  async (req, res) => {
    try {
      const newConfig = req.body;
      
      qflowService.updateConfig(newConfig);

      res.json({
        status: 'ok',
        code: 'CONFIG_UPDATED',
        message: 'Qflow configuration updated successfully',
        data: {
          config: qflowService.config
        }
      });

    } catch (error) {
      console.error('Config update error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'CONFIG_UPDATE_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/optimization-metrics
 * Get execution optimization metrics
 */
router.get('/optimization-metrics',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const metrics = qflowService.getOptimizationMetrics();

      res.json({
        status: 'ok',
        code: 'OPTIMIZATION_METRICS_RETRIEVED',
        message: 'Optimization metrics retrieved successfully',
        data: metrics
      });

    } catch (error) {
      console.error('Optimization metrics retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'OPTIMIZATION_METRICS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/resource-pools/cleanup
 * Cleanup resource pools
 */
router.post('/resource-pools/cleanup',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      await qflowService.cleanup();

      res.json({
        status: 'ok',
        code: 'RESOURCE_POOLS_CLEANED',
        message: 'Resource pools cleaned up successfully'
      });

    } catch (error) {
      console.error('Resource pool cleanup error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'RESOURCE_POOL_CLEANUP_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/preload-components
 * Preload layer components for optimization
 */
router.post('/preload-components',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    required: ['layerIds'],
    properties: {
      layerIds: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 20
      }
    }
  }),
  async (req, res) => {
    try {
      const { layerIds } = req.body;
      const results = [];

      for (const layerId of layerIds) {
        const layer = qflowService.coherenceLayers.get(layerId);
        if (layer) {
          await qflowService.lazyLoadLayerComponents(layer);
          results.push({ layerId, status: 'loaded' });
        } else {
          results.push({ layerId, status: 'not-found' });
        }
      }

      const successCount = results.filter(r => r.status === 'loaded').length;

      res.json({
        status: 'ok',
        code: 'COMPONENTS_PRELOADED',
        message: `Components preloaded: ${successCount}/${layerIds.length} successful`,
        data: {
          results,
          summary: {
            total: layerIds.length,
            loaded: successCount,
            notFound: layerIds.length - successCount
          }
        }
      });

    } catch (error) {
      console.error('Component preloading error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'COMPONENT_PRELOADING_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/performance/profile/:evaluationId
 * Get performance profile for a specific evaluation
 */
router.get('/performance/profile/:evaluationId',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const { evaluationId } = req.params;
      const profile = qflowService.getPerformanceProfile(evaluationId);

      if (!profile) {
        return res.status(404).json({
          status: 'error',
          code: 'PROFILE_NOT_FOUND',
          message: 'Performance profile not found for this evaluation'
        });
      }

      res.json({
        status: 'ok',
        code: 'PERFORMANCE_PROFILE_RETRIEVED',
        message: 'Performance profile retrieved successfully',
        data: profile
      });

    } catch (error) {
      console.error('Performance profile retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'PERFORMANCE_PROFILE_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/performance/bottlenecks
 * Get identified performance bottlenecks
 */
router.get('/performance/bottlenecks',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const bottlenecks = qflowService.getBottlenecks();

      res.json({
        status: 'ok',
        code: 'BOTTLENECKS_RETRIEVED',
        message: 'Performance bottlenecks retrieved successfully',
        data: {
          bottlenecks,
          count: bottlenecks.length,
          summary: {
            critical: bottlenecks.filter(b => b.severity === 'critical').length,
            high: bottlenecks.filter(b => b.severity === 'high').length,
            medium: bottlenecks.filter(b => b.severity === 'medium').length,
            low: bottlenecks.filter(b => b.severity === 'low').length
          }
        }
      });

    } catch (error) {
      console.error('Bottlenecks retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'BOTTLENECKS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/performance/recommendations
 * Get optimization recommendations
 */
router.get('/performance/recommendations',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const recommendations = qflowService.getOptimizationRecommendations(limit);

      res.json({
        status: 'ok',
        code: 'RECOMMENDATIONS_RETRIEVED',
        message: 'Optimization recommendations retrieved successfully',
        data: {
          recommendations,
          count: recommendations.length,
          summary: {
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
          }
        }
      });

    } catch (error) {
      console.error('Recommendations retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'RECOMMENDATIONS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /qflow/performance/statistics
 * Get execution statistics and trends
 */
router.get('/performance/statistics',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const statistics = qflowService.getExecutionStatistics();

      res.json({
        status: 'ok',
        code: 'STATISTICS_RETRIEVED',
        message: 'Execution statistics retrieved successfully',
        data: statistics
      });

    } catch (error) {
      console.error('Statistics retrieval error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'STATISTICS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/performance/baseline
 * Set performance baseline for regression detection
 */
router.post('/performance/baseline',
  standardAuthMiddleware(),
  validateSchema({
    type: 'object',
    properties: {
      evaluationTime: {
        type: 'number',
        minimum: 100,
        maximum: 60000
      },
      layerExecutionTime: {
        type: 'number',
        minimum: 50,
        maximum: 30000
      },
      cacheHitRatio: {
        type: 'number',
        minimum: 0,
        maximum: 1
      },
      errorRate: {
        type: 'number',
        minimum: 0,
        maximum: 1
      }
    }
  }),
  async (req, res) => {
    try {
      const newBaseline = req.body;
      
      // Update performance thresholds
      qflowService.config.performanceThresholds = {
        ...qflowService.config.performanceThresholds,
        ...newBaseline
      };

      res.json({
        status: 'ok',
        code: 'BASELINE_UPDATED',
        message: 'Performance baseline updated successfully',
        data: {
          baseline: qflowService.config.performanceThresholds
        }
      });

    } catch (error) {
      console.error('Baseline update error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'BASELINE_UPDATE_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /qflow/performance/analyze
 * Trigger performance analysis for recent evaluations
 */
router.post('/performance/analyze',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const statistics = qflowService.getExecutionStatistics();
      const bottlenecks = qflowService.getBottlenecks();
      const recommendations = qflowService.getOptimizationRecommendations();

      const analysis = {
        timestamp: new Date().toISOString(),
        statistics,
        bottlenecks: {
          total: bottlenecks.length,
          bySeverity: {
            critical: bottlenecks.filter(b => b.severity === 'critical').length,
            high: bottlenecks.filter(b => b.severity === 'high').length,
            medium: bottlenecks.filter(b => b.severity === 'medium').length,
            low: bottlenecks.filter(b => b.severity === 'low').length
          },
          items: bottlenecks
        },
        recommendations: {
          total: recommendations.length,
          byPriority: {
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
          },
          items: recommendations
        }
      };

      res.json({
        status: 'ok',
        code: 'ANALYSIS_COMPLETED',
        message: 'Performance analysis completed successfully',
        data: analysis
      });

    } catch (error) {
      console.error('Performance analysis error:', error);
      
      res.status(500).json({
        status: 'error',
        code: 'ANALYSIS_FAILED',
        message: error.message
      });
    }
  }
);

export default router;