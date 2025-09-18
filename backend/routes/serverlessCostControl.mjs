/**
 * Serverless Cost Control API Routes
 * Provides endpoints for cost control, monitoring, and optimization
 */

import express from 'express';
import { ServerlessCostControlService } from '../services/ServerlessCostControlService.mjs';
import { ColdStartOptimizationService } from '../services/ColdStartOptimizationService.mjs';
import { BatchProcessingService } from '../services/BatchProcessingService.mjs';
import { CostMonitoringDashboardService } from '../services/CostMonitoringDashboardService.mjs';
import { GracefulDegradationService } from '../services/GracefulDegradationService.mjs';
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';
import { validateJoi } from '../middleware/joiValidation.mjs';

const router = express.Router();

// Initialize services
const costControlService = new ServerlessCostControlService();
const coldStartService = new ColdStartOptimizationService();
const batchService = new BatchProcessingService();
const dashboardService = new CostMonitoringDashboardService();
const degradationService = new GracefulDegradationService();

// Validation schemas
const invocationLimitsSchema = {
  type: 'object',
  properties: {
    module: { type: 'string', minLength: 1 },
    limits: {
      type: 'object',
      properties: {
        perMinute: { type: 'number', minimum: 1 },
        perHour: { type: 'number', minimum: 1 },
        perDay: { type: 'number', minimum: 1 },
        perMonth: { type: 'number', minimum: 1 }
      }
    },
    budgetAlerts: {
      type: 'object',
      properties: {
        warning: { type: 'number', minimum: 0, maximum: 1 },
        critical: { type: 'number', minimum: 0, maximum: 1 },
        cutoff: { type: 'number', minimum: 0, maximum: 1 }
      }
    },
    monthlyBudget: { type: 'number', minimum: 0 }
  },
  required: ['module']
};

const memoryProfileSchema = {
  type: 'object',
  properties: {
    module: { type: 'string', minLength: 1 },
    functionName: { type: 'string', minLength: 1 },
    config: {
      type: 'object',
      properties: {
        memory: { type: 'number', minimum: 128, maximum: 3008 },
        timeout: { type: 'number', minimum: 1, maximum: 900 },
        warmupEnabled: { type: 'boolean' },
        warmupSchedule: { type: 'string' },
        autoOptimize: { type: 'boolean' }
      }
    }
  },
  required: ['module', 'functionName', 'config']
};

const batchConfigSchema = {
  type: 'object',
  properties: {
    module: { type: 'string', minLength: 1 },
    operationType: { type: 'string', minLength: 1 },
    config: {
      type: 'object',
      properties: {
        maxBatchSize: { type: 'number', minimum: 1, maximum: 1000 },
        maxWaitTime: { type: 'number', minimum: 100, maximum: 60000 },
        maxMemoryUsage: { type: 'number', minimum: 0.1, maximum: 1.0 },
        retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
        retryDelay: { type: 'number', minimum: 100, maximum: 30000 },
        enabled: { type: 'boolean' }
      }
    }
  },
  required: ['module', 'operationType', 'config']
};

// Cost Control Routes

/**
 * Set invocation limits for a module
 */
router.post('/limits', 
  standardAuthMiddleware(), 
  validateJoi(invocationLimitsSchema),
  async (req, res) => {
    try {
      const { module, limits, budgetAlerts, monthlyBudget } = req.body;
      
      const result = await costControlService.setInvocationLimits(module, {
        ...limits,
        budgetAlerts,
        monthlyBudget
      });
      
      res.json({
        status: 'ok',
        code: 'LIMITS_SET',
        message: 'Invocation limits configured successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 'LIMITS_SET_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * Check invocation limits for a module
 */
router.get('/limits/:module/:functionName/check', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, functionName } = req.params;
    
    const result = await costControlService.checkInvocationLimits(module, functionName);
    
    res.json({
      status: 'ok',
      code: 'LIMITS_CHECKED',
      message: 'Invocation limits checked',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'LIMITS_CHECK_FAILED',
      message: error.message
    });
  }
});

/**
 * Record an invocation
 */
router.post('/invocations', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, functionName, duration, memoryUsed, cost } = req.body;
    
    const result = await costControlService.recordInvocation(
      module, 
      functionName, 
      duration, 
      memoryUsed, 
      cost
    );
    
    res.json({
      status: 'ok',
      code: 'INVOCATION_RECORDED',
      message: 'Invocation recorded successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'INVOCATION_RECORD_FAILED',
      message: error.message
    });
  }
});

/**
 * Get cost dashboard data for a module
 */
router.get('/dashboard/:module', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module } = req.params;
    
    const result = await costControlService.getCostDashboardData(module);
    
    res.json({
      status: 'ok',
      code: 'DASHBOARD_DATA_RETRIEVED',
      message: 'Cost dashboard data retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DASHBOARD_DATA_FAILED',
      message: error.message
    });
  }
});

/**
 * Get cost optimization recommendations
 */
router.get('/recommendations/:module', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module } = req.params;
    
    const result = await costControlService.getCostOptimizationRecommendations(module);
    
    res.json({
      status: 'ok',
      code: 'RECOMMENDATIONS_RETRIEVED',
      message: 'Cost optimization recommendations retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'RECOMMENDATIONS_FAILED',
      message: error.message
    });
  }
});

// Cold Start Optimization Routes

/**
 * Configure memory profile for a function
 */
router.post('/coldstart/profile', 
  standardAuthMiddleware(), 
  validateJoi(memoryProfileSchema),
  async (req, res) => {
    try {
      const { module, functionName, config } = req.body;
      
      const result = await coldStartService.configureMemoryProfile(module, functionName, config);
      
      res.json({
        status: 'ok',
        code: 'MEMORY_PROFILE_CONFIGURED',
        message: 'Memory profile configured successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 'MEMORY_PROFILE_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * Record cold start event
 */
router.post('/coldstart/record', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, functionName, duration, memoryUsed, memoryAllocated } = req.body;
    
    const result = await coldStartService.recordColdStart(
      module, 
      functionName, 
      duration, 
      memoryUsed, 
      memoryAllocated
    );
    
    res.json({
      status: 'ok',
      code: 'COLD_START_RECORDED',
      message: 'Cold start recorded successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'COLD_START_RECORD_FAILED',
      message: error.message
    });
  }
});

/**
 * Get cold start optimization report
 */
router.get('/coldstart/report/:module/:functionName', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, functionName } = req.params;
    
    const result = await coldStartService.getOptimizationReport(module, functionName);
    
    res.json({
      status: 'ok',
      code: 'OPTIMIZATION_REPORT_RETRIEVED',
      message: 'Cold start optimization report retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'OPTIMIZATION_REPORT_FAILED',
      message: error.message
    });
  }
});

/**
 * Setup warmup schedule
 */
router.post('/coldstart/warmup/:module/:functionName', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, functionName } = req.params;
    const { schedule } = req.body;
    
    const result = await coldStartService.setupWarmupSchedule(module, functionName, schedule);
    
    res.json({
      status: 'ok',
      code: 'WARMUP_SCHEDULED',
      message: 'Warmup schedule configured',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'WARMUP_SCHEDULE_FAILED',
      message: error.message
    });
  }
});

// Batch Processing Routes

/**
 * Configure batch processing
 */
router.post('/batch/config', 
  standardAuthMiddleware(), 
  validateJoi(batchConfigSchema),
  async (req, res) => {
    try {
      const { module, operationType, config } = req.body;
      
      const result = await batchService.configureBatchProcessing(module, operationType, config);
      
      res.json({
        status: 'ok',
        code: 'BATCH_CONFIG_SET',
        message: 'Batch processing configured successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        code: 'BATCH_CONFIG_FAILED',
        message: error.message
      });
    }
  }
);

/**
 * Add item to batch queue
 */
router.post('/batch/add', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, operationType, item, options } = req.body;
    
    const result = await batchService.addToBatch(module, operationType, item, options);
    
    res.json({
      status: 'ok',
      code: 'BATCH_ITEM_ADDED',
      message: 'Item added to batch queue',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'BATCH_ADD_FAILED',
      message: error.message
    });
  }
});

/**
 * Get batch processing statistics
 */
router.get('/batch/stats/:module/:operationType', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, operationType } = req.params;
    
    const result = await batchService.getBatchStatistics(module, operationType);
    
    res.json({
      status: 'ok',
      code: 'BATCH_STATS_RETRIEVED',
      message: 'Batch processing statistics retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'BATCH_STATS_FAILED',
      message: error.message
    });
  }
});

// Dashboard Routes

/**
 * Get comprehensive dashboard data
 */
router.get('/dashboard', standardAuthMiddleware(), async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const result = await dashboardService.getDashboardData(timeRange);
    
    res.json({
      status: 'ok',
      code: 'DASHBOARD_RETRIEVED',
      message: 'Dashboard data retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DASHBOARD_FAILED',
      message: error.message
    });
  }
});

/**
 * Get dashboard summary
 */
router.get('/dashboard/summary', standardAuthMiddleware(), async (req, res) => {
  try {
    const result = await dashboardService.getDashboardSummary();
    
    res.json({
      status: 'ok',
      code: 'DASHBOARD_SUMMARY_RETRIEVED',
      message: 'Dashboard summary retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DASHBOARD_SUMMARY_FAILED',
      message: error.message
    });
  }
});

// Graceful Degradation Routes

/**
 * Configure degradation strategies
 */
router.post('/degradation/config', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, config } = req.body;
    
    const result = await degradationService.configureDegradationStrategies(module, config);
    
    res.json({
      status: 'ok',
      code: 'DEGRADATION_CONFIGURED',
      message: 'Degradation strategies configured',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DEGRADATION_CONFIG_FAILED',
      message: error.message
    });
  }
});

/**
 * Trigger degradation
 */
router.post('/degradation/trigger', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module, trigger, severity, metadata } = req.body;
    
    const result = await degradationService.triggerDegradation(module, trigger, severity, metadata);
    
    res.json({
      status: 'ok',
      code: 'DEGRADATION_TRIGGERED',
      message: 'Degradation strategy triggered',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DEGRADATION_TRIGGER_FAILED',
      message: error.message
    });
  }
});

/**
 * Get degradation status
 */
router.get('/degradation/status/:module', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module } = req.params;
    
    const result = await degradationService.getDegradationStatus(module);
    
    res.json({
      status: 'ok',
      code: 'DEGRADATION_STATUS_RETRIEVED',
      message: 'Degradation status retrieved',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DEGRADATION_STATUS_FAILED',
      message: error.message
    });
  }
});

/**
 * Force recovery from degradation
 */
router.post('/degradation/recover/:module', standardAuthMiddleware(), async (req, res) => {
  try {
    const { module } = req.params;
    
    const result = await degradationService.forceRecovery(module);
    
    res.json({
      status: 'ok',
      code: 'DEGRADATION_RECOVERED',
      message: 'Forced recovery completed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      code: 'DEGRADATION_RECOVERY_FAILED',
      message: error.message
    });
  }
});

export default router;