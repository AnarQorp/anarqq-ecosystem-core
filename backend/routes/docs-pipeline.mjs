/**
 * Documentation Pipeline Routes
 * Provides endpoints for managing the Qflow documentation automation pipeline
 */

import express from 'express';
import { QflowDocumentationPipeline } from '../services/QflowDocumentationPipeline.mjs';
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';
import { validateSchema } from '../middleware/jsonSchemaValidation.mjs';

const router = express.Router();
const docsPipeline = new QflowDocumentationPipeline();

// Validation schemas
const executePipelineSchema = {
  type: 'object',
  properties: {
    trigger: {
      type: 'string',
      enum: ['manual', 'documentation-update', 'module-release', 'quality-remediation', 'scheduled']
    },
    context: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        updateType: { type: 'string' },
        module: { type: 'string' },
        version: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string' }
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical']
        }
      },
      additionalProperties: true
    },
    options: {
      type: 'object',
      properties: {
        skipValidation: { type: 'boolean' },
        skipIndexGeneration: { type: 'boolean' },
        skipScriptGeneration: { type: 'boolean' },
        skipPortalPublish: { type: 'boolean' },
        rollbackOnFailure: { type: 'boolean' },
        notifyOnFailure: { type: 'boolean' }
      }
    }
  },
  additionalProperties: false
};

const configUpdateSchema = {
  type: 'object',
  properties: {
    maxRetries: {
      type: 'number',
      minimum: 0,
      maximum: 10
    },
    retryDelayMs: {
      type: 'number',
      minimum: 1000,
      maximum: 60000
    },
    rollbackOnFailure: {
      type: 'boolean'
    },
    publishToPortal: {
      type: 'boolean'
    },
    notifyOnFailure: {
      type: 'boolean'
    },
    validationTimeout: {
      type: 'number',
      minimum: 60000,
      maximum: 600000
    },
    indexGenerationTimeout: {
      type: 'number',
      minimum: 60000,
      maximum: 600000
    },
    scriptGenerationTimeout: {
      type: 'number',
      minimum: 60000,
      maximum: 600000
    },
    portalPublishTimeout: {
      type: 'number',
      minimum: 60000,
      maximum: 600000
    }
  },
  additionalProperties: false
};

/**
 * POST /docs-pipeline/execute
 * Execute the documentation automation pipeline
 */
router.post('/execute',
  standardAuthMiddleware(),
  validateSchema(executePipelineSchema),
  async (req, res) => {
    try {
      const { trigger = 'manual', context = {}, options = {} } = req.body;

      // Add request metadata to context
      const executionContext = {
        ...context,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        userAgent: req.headers['user-agent'],
        initiatedBy: req.user?.squidId || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Apply options to pipeline configuration if provided
      if (Object.keys(options).length > 0) {
        const tempConfig = { ...docsPipeline.getConfig(), ...options };
        docsPipeline.updateConfig(tempConfig);
      }

      const result = await docsPipeline.executePipeline(executionContext);

      res.json({
        status: 'ok',
        code: 'PIPELINE_EXECUTED',
        message: 'Documentation pipeline executed successfully',
        data: result
      });

    } catch (error) {
      console.error('Documentation pipeline execution error:', error);

      res.status(500).json({
        status: 'error',
        code: 'PIPELINE_EXECUTION_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /docs-pipeline/status
 * Get current pipeline status and configuration
 */
router.get('/status',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const status = docsPipeline.getPipelineStatus();
      const metrics = docsPipeline.getMetrics();

      res.json({
        status: 'ok',
        code: 'PIPELINE_STATUS_RETRIEVED',
        message: 'Pipeline status retrieved successfully',
        data: {
          ...status,
          metrics
        }
      });

    } catch (error) {
      console.error('Pipeline status retrieval error:', error);

      res.status(500).json({
        status: 'error',
        code: 'STATUS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/config
 * Update pipeline configuration
 */
router.post('/config',
  standardAuthMiddleware(),
  validateSchema(configUpdateSchema),
  async (req, res) => {
    try {
      const newConfig = req.body;

      docsPipeline.updateConfig(newConfig);

      res.json({
        status: 'ok',
        code: 'PIPELINE_CONFIG_UPDATED',
        message: 'Pipeline configuration updated successfully',
        data: {
          config: docsPipeline.getConfig()
        }
      });

    } catch (error) {
      console.error('Pipeline config update error:', error);

      res.status(500).json({
        status: 'error',
        code: 'CONFIG_UPDATE_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /docs-pipeline/config
 * Get current pipeline configuration
 */
router.get('/config',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const config = docsPipeline.getConfig();

      res.json({
        status: 'ok',
        code: 'PIPELINE_CONFIG_RETRIEVED',
        message: 'Pipeline configuration retrieved successfully',
        data: { config }
      });

    } catch (error) {
      console.error('Pipeline config retrieval error:', error);

      res.status(500).json({
        status: 'error',
        code: 'CONFIG_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/rollback/:pipelineId
 * Execute rollback for a specific pipeline execution
 */
router.post('/rollback/:pipelineId',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const { pipelineId } = req.params;

      await docsPipeline.executeRollback(pipelineId);

      res.json({
        status: 'ok',
        code: 'PIPELINE_ROLLBACK_EXECUTED',
        message: 'Pipeline rollback executed successfully',
        data: { pipelineId }
      });

    } catch (error) {
      console.error('Pipeline rollback error:', error);

      res.status(500).json({
        status: 'error',
        code: 'ROLLBACK_EXECUTION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /docs-pipeline/metrics
 * Get detailed pipeline metrics and performance data
 */
router.get('/metrics',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const metrics = docsPipeline.getMetrics();
      const status = docsPipeline.getPipelineStatus();

      const detailedMetrics = {
        ...metrics,
        configuration: status.config,
        rollbackPoints: status.rollbackPoints,
        lastExecution: status.lastExecution,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      res.json({
        status: 'ok',
        code: 'PIPELINE_METRICS_RETRIEVED',
        message: 'Pipeline metrics retrieved successfully',
        data: detailedMetrics
      });

    } catch (error) {
      console.error('Pipeline metrics retrieval error:', error);

      res.status(500).json({
        status: 'error',
        code: 'METRICS_RETRIEVAL_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/validate-only
 * Run only the validation step without executing the full pipeline
 */
router.post('/validate-only',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const context = {
        validationOnly: true,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        initiatedBy: req.user?.squidId || 'unknown'
      };

      // Execute only validation step
      const validationResult = await docsPipeline.validateDocumentation(context);

      res.json({
        status: 'ok',
        code: 'VALIDATION_COMPLETED',
        message: 'Documentation validation completed',
        data: {
          verdict: validationResult.verdict,
          confidence: validationResult.confidence,
          evidence: validationResult.evidence,
          passed: validationResult.verdict === 'ALLOW'
        }
      });

    } catch (error) {
      console.error('Documentation validation error:', error);

      res.status(500).json({
        status: 'error',
        code: 'VALIDATION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/regenerate-index-only
 * Run only the index regeneration step
 */
router.post('/regenerate-index-only',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const context = {
        indexOnly: true,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        initiatedBy: req.user?.squidId || 'unknown'
      };

      const indexResult = await docsPipeline.regenerateIndex(context);

      res.json({
        status: 'ok',
        code: 'INDEX_REGENERATION_COMPLETED',
        message: 'Documentation index regeneration completed',
        data: {
          verdict: indexResult.verdict,
          confidence: indexResult.confidence,
          evidence: indexResult.evidence,
          success: indexResult.verdict === 'ALLOW'
        }
      });

    } catch (error) {
      console.error('Index regeneration error:', error);

      res.status(500).json({
        status: 'error',
        code: 'INDEX_REGENERATION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/build-scripts-only
 * Run only the script generation step
 */
router.post('/build-scripts-only',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const context = {
        scriptsOnly: true,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        initiatedBy: req.user?.squidId || 'unknown'
      };

      const scriptsResult = await docsPipeline.buildScripts(context);

      res.json({
        status: 'ok',
        code: 'SCRIPT_GENERATION_COMPLETED',
        message: 'Video script generation completed',
        data: {
          verdict: scriptsResult.verdict,
          confidence: scriptsResult.confidence,
          evidence: scriptsResult.evidence,
          success: scriptsResult.verdict === 'ALLOW'
        }
      });

    } catch (error) {
      console.error('Script generation error:', error);

      res.status(500).json({
        status: 'error',
        code: 'SCRIPT_GENERATION_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/publish-portal-only
 * Run only the portal publishing step
 */
router.post('/publish-portal-only',
  standardAuthMiddleware(),
  async (req, res) => {
    try {
      const context = {
        portalOnly: true,
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        initiatedBy: req.user?.squidId || 'unknown'
      };

      const portalResult = await docsPipeline.publishPortal(context);

      res.json({
        status: 'ok',
        code: 'PORTAL_PUBLISH_COMPLETED',
        message: 'Documentation portal publishing completed',
        data: {
          verdict: portalResult.verdict,
          confidence: portalResult.confidence,
          evidence: portalResult.evidence,
          success: portalResult.verdict === 'ALLOW'
        }
      });

    } catch (error) {
      console.error('Portal publishing error:', error);

      res.status(500).json({
        status: 'error',
        code: 'PORTAL_PUBLISH_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * GET /docs-pipeline/health
 * Health check endpoint for the documentation pipeline
 */
router.get('/health',
  async (req, res) => {
    try {
      const status = docsPipeline.getPipelineStatus();
      const isHealthy = status.steps.length > 0 && status.config;

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'error',
        code: isHealthy ? 'PIPELINE_HEALTHY' : 'PIPELINE_UNHEALTHY',
        message: isHealthy ? 'Documentation pipeline is healthy' : 'Documentation pipeline is not healthy',
        data: {
          healthy: isHealthy,
          steps: status.steps.length,
          rollbackPoints: status.rollbackPoints,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(503).json({
        status: 'error',
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/webhook/github
 * Webhook endpoint for GitHub integration
 */
router.post('/webhook/github',
  async (req, res) => {
    try {
      const event = req.headers['x-github-event'];
      const payload = req.body;

      if (event === 'push' && payload.ref === 'refs/heads/main') {
        // Check if documentation files were modified
        const modifiedFiles = payload.commits?.flatMap(commit => 
          [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])]
        ) || [];

        const docsFiles = modifiedFiles.filter(file => 
          file.startsWith('docs/') || 
          file.includes('README.md') || 
          file.includes('openapi.yaml') ||
          file.includes('mcp.json')
        );

        if (docsFiles.length > 0) {
          console.log(`📝 GitHub webhook: ${docsFiles.length} documentation files modified`);

          // Trigger pipeline asynchronously
          setImmediate(async () => {
            try {
              await docsPipeline.executePipeline({
                trigger: 'documentation-update',
                source: 'github-webhook',
                updateType: 'git-push',
                files: docsFiles,
                commit: payload.head_commit?.id,
                branch: 'main',
                author: payload.head_commit?.author?.name
              });
            } catch (error) {
              console.error('Webhook-triggered pipeline failed:', error.message);
            }
          });
        }
      }

      res.json({
        status: 'ok',
        code: 'WEBHOOK_PROCESSED',
        message: 'GitHub webhook processed successfully'
      });

    } catch (error) {
      console.error('GitHub webhook processing error:', error);

      res.status(500).json({
        status: 'error',
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * POST /docs-pipeline/webhook/ci-cd
 * Webhook endpoint for CI/CD integration
 */
router.post('/webhook/ci-cd',
  async (req, res) => {
    try {
      const { event, module, version, environment, status } = req.body;

      if (event === 'deployment' && status === 'success' && environment === 'production') {
        console.log(`🚀 CI/CD webhook: ${module} v${version} deployed to production`);

        // Trigger pipeline for module release
        setImmediate(async () => {
          try {
            await docsPipeline.executePipeline({
              trigger: 'module-release',
              source: 'ci-cd-webhook',
              module,
              version,
              environment,
              releaseType: 'production-deployment'
            });
          } catch (error) {
            console.error('CI/CD webhook-triggered pipeline failed:', error.message);
          }
        });
      }

      res.json({
        status: 'ok',
        code: 'WEBHOOK_PROCESSED',
        message: 'CI/CD webhook processed successfully'
      });

    } catch (error) {
      console.error('CI/CD webhook processing error:', error);

      res.status(500).json({
        status: 'error',
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: error.message
      });
    }
  }
);

export default router;