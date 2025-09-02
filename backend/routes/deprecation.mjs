/**
 * Deprecation Management API Routes
 * 
 * Provides HTTP endpoints for managing deprecation schedules,
 * migration tasks, compatibility layers, and usage telemetry.
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import DeprecationManagementService from '../services/DeprecationManagementService.mjs';

const router = express.Router();

// Initialize deprecation management service
const deprecationService = new DeprecationManagementService({
  deprecationDataPath: process.env.DEPRECATION_DATA_PATH || './data/deprecation',
  telemetryEnabled: process.env.DEPRECATION_TELEMETRY_ENABLED !== 'false',
  notificationChannels: (process.env.DEPRECATION_NOTIFICATION_CHANNELS || 'email,webhook').split(',')
});

// Initialize service on startup
deprecationService.initialize().catch(console.error);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/deprecation/schedules:
 *   post:
 *     summary: Create a new deprecation schedule
 *     tags: [Deprecation Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature
 *               - module
 *               - version
 *               - deprecationDate
 *               - sunsetDate
 *               - migrationDeadline
 *             properties:
 *               feature:
 *                 type: string
 *                 description: Name of the feature being deprecated
 *               module:
 *                 type: string
 *                 description: Module containing the feature
 *               version:
 *                 type: string
 *                 description: Version being deprecated
 *               deprecationDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date when feature becomes deprecated
 *               sunsetDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date when feature will be removed
 *               migrationDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Deadline for migration completion
 *               supportLevel:
 *                 type: string
 *                 enum: [full, maintenance, security_only, none]
 *                 description: Support level during deprecation period
 *               replacementFeature:
 *                 type: object
 *                 description: Information about replacement feature
 *               migrationGuide:
 *                 type: string
 *                 description: URL or text of migration guide
 *               reason:
 *                 type: string
 *                 description: Reason for deprecation
 *               impact:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Impact level of deprecation
 *     responses:
 *       201:
 *         description: Deprecation schedule created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/schedules', [
  body('feature').notEmpty().withMessage('Feature name is required'),
  body('module').notEmpty().withMessage('Module name is required'),
  body('version').notEmpty().withMessage('Version is required'),
  body('deprecationDate').isISO8601().withMessage('Valid deprecation date is required'),
  body('sunsetDate').isISO8601().withMessage('Valid sunset date is required'),
  body('migrationDeadline').isISO8601().withMessage('Valid migration deadline is required'),
  body('supportLevel').optional().isIn(['full', 'maintenance', 'security_only', 'none']),
  body('impact').optional().isIn(['low', 'medium', 'high', 'critical'])
], handleValidationErrors, async (req, res) => {
  try {
    const result = await deprecationService.createDeprecationSchedule(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'SCHEDULE_CREATION_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/schedules:
 *   get:
 *     summary: Get deprecation calendar
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, sunset, completed]
 *         description: Filter by status
 *       - in: query
 *         name: supportLevel
 *         schema:
 *           type: string
 *           enum: [full, maintenance, security_only, none]
 *         description: Filter by support level
 *     responses:
 *       200:
 *         description: Deprecation calendar retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/schedules', [
  query('module').optional().isString(),
  query('status').optional().isIn(['active', 'sunset', 'completed']),
  query('supportLevel').optional().isIn(['full', 'maintenance', 'security_only', 'none'])
], handleValidationErrors, async (req, res) => {
  try {
    const schedules = deprecationService.getDeprecationCalendar(req.query);
    res.json({
      status: 'ok',
      message: 'Deprecation calendar retrieved',
      data: { schedules }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'CALENDAR_RETRIEVAL_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/usage/{featureId}:
 *   post:
 *     summary: Track usage of a deprecated feature
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the feature being used
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consumer
 *             properties:
 *               consumer:
 *                 type: object
 *                 required:
 *                   - id
 *                   - name
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Consumer identifier
 *                   name:
 *                     type: string
 *                     description: Consumer name
 *                   type:
 *                     type: string
 *                     description: Consumer type
 *                   contact:
 *                     type: string
 *                     description: Consumer contact information
 *               context:
 *                 type: object
 *                 description: Usage context information
 *     responses:
 *       200:
 *         description: Usage tracked successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/usage/:featureId', [
  param('featureId').notEmpty().withMessage('Feature ID is required'),
  body('consumer.id').notEmpty().withMessage('Consumer ID is required'),
  body('consumer.name').notEmpty().withMessage('Consumer name is required')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await deprecationService.trackFeatureUsage(
      req.params.featureId,
      req.body.consumer,
      req.body.context
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'USAGE_TRACKING_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/usage/{featureId}:
 *   get:
 *     summary: Get usage telemetry for a deprecated feature
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the feature
 *     responses:
 *       200:
 *         description: Usage telemetry retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/usage/:featureId', [
  param('featureId').notEmpty().withMessage('Feature ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const telemetry = deprecationService.getUsageTelemetry(req.params.featureId);
    res.json({
      status: 'ok',
      message: 'Usage telemetry retrieved',
      data: { telemetry }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'TELEMETRY_RETRIEVAL_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/migrations:
 *   post:
 *     summary: Execute migration for a consumer
 *     tags: [Deprecation Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - migrationTaskId
 *               - consumerId
 *             properties:
 *               migrationTaskId:
 *                 type: string
 *                 description: ID of the migration task
 *               consumerId:
 *                 type: string
 *                 description: ID of the consumer
 *               options:
 *                 type: object
 *                 properties:
 *                   dryRun:
 *                     type: boolean
 *                     description: Whether to perform a dry run
 *                   continueOnError:
 *                     type: boolean
 *                     description: Whether to continue on step errors
 *     responses:
 *       200:
 *         description: Migration executed successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Migration execution failed
 */
router.post('/migrations', [
  body('migrationTaskId').notEmpty().withMessage('Migration task ID is required'),
  body('consumerId').notEmpty().withMessage('Consumer ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await deprecationService.executeMigration(
      req.body.migrationTaskId,
      req.body.consumerId,
      req.body.options || {}
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'MIGRATION_EXECUTION_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/migrations/{migrationTaskId}/rollback:
 *   post:
 *     summary: Rollback a migration
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: path
 *         name: migrationTaskId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the migration task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executionId
 *             properties:
 *               executionId:
 *                 type: string
 *                 description: ID of the migration execution to rollback
 *     responses:
 *       200:
 *         description: Migration rolled back successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Rollback failed
 */
router.post('/migrations/:migrationTaskId/rollback', [
  param('migrationTaskId').notEmpty().withMessage('Migration task ID is required'),
  body('executionId').notEmpty().withMessage('Execution ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    // This would need to be implemented to find and rollback specific execution
    res.json({
      status: 'ok',
      message: 'Migration rollback initiated',
      data: { migrationTaskId: req.params.migrationTaskId }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'ROLLBACK_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/progress/{featureId}:
 *   get:
 *     summary: Get migration progress for a feature
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the feature
 *     responses:
 *       200:
 *         description: Migration progress retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/progress/:featureId', [
  param('featureId').notEmpty().withMessage('Feature ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const progress = deprecationService.getMigrationProgress(req.params.featureId);
    res.json({
      status: 'ok',
      message: 'Migration progress retrieved',
      data: { progress }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'PROGRESS_RETRIEVAL_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/compatibility:
 *   post:
 *     summary: Create a compatibility layer
 *     tags: [Deprecation Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - deprecatedFeature
 *               - replacementFeature
 *               - module
 *               - transformFunction
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the compatibility layer
 *               deprecatedFeature:
 *                 type: string
 *                 description: Deprecated feature identifier
 *               replacementFeature:
 *                 type: string
 *                 description: Replacement feature identifier
 *               module:
 *                 type: string
 *                 description: Module name
 *               transformFunction:
 *                 type: string
 *                 description: Transformation function code
 *               validationRules:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Validation rules for transformation
 *               enabled:
 *                 type: boolean
 *                 description: Whether the layer is enabled
 *     responses:
 *       201:
 *         description: Compatibility layer created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/compatibility', [
  body('name').notEmpty().withMessage('Compatibility layer name is required'),
  body('deprecatedFeature').notEmpty().withMessage('Deprecated feature is required'),
  body('replacementFeature').notEmpty().withMessage('Replacement feature is required'),
  body('module').notEmpty().withMessage('Module is required'),
  body('transformFunction').notEmpty().withMessage('Transform function is required')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await deprecationService.createCompatibilityLayer(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'COMPATIBILITY_LAYER_CREATION_FAILED',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/deprecation/compatibility/{layerId}/apply:
 *   post:
 *     summary: Apply compatibility layer transformation
 *     tags: [Deprecation Management]
 *     parameters:
 *       - in: path
 *         name: layerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the compatibility layer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Request to transform
 *     responses:
 *       200:
 *         description: Transformation applied successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Transformation failed
 */
router.post('/compatibility/:layerId/apply', [
  param('layerId').notEmpty().withMessage('Layer ID is required')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await deprecationService.applyCompatibilityLayer(req.params.layerId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'TRANSFORMATION_FAILED',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Deprecation API Error:', error);
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An internal server error occurred'
  });
});

export default router;