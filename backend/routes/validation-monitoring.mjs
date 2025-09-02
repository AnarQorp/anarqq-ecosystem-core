/**
 * Validation Monitoring API Routes
 * 
 * Provides REST API endpoints for accessing validation monitoring data,
 * health dashboards, and alerting information.
 */

import express from 'express';
import { ValidationMonitoringService } from '../services/ValidationMonitoringService.mjs';
import { ValidationDashboardService } from '../services/ValidationDashboardService.mjs';
import { ValidationAlertingService } from '../services/ValidationAlertingService.mjs';
import { NotificationService } from '../services/NotificationService.mjs';

const router = express.Router();

// Initialize services
let monitoringService;
let dashboardService;
let alertingService;

// Initialize services on first request
async function initializeServices() {
  if (!monitoringService) {
    const notificationService = new NotificationService();
    
    monitoringService = new ValidationMonitoringService();
    dashboardService = new ValidationDashboardService(monitoringService);
    alertingService = new ValidationAlertingService(notificationService);
    
    // Start monitoring
    await monitoringService.startMonitoring();
    
    console.log('✅ Validation monitoring services initialized');
  }
}

// Middleware to ensure services are initialized
router.use(async (req, res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error) {
    console.error('Failed to initialize monitoring services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize monitoring services',
      details: error.message
    });
  }
});

// Health status endpoint
router.get('/health', async (req, res) => {
  try {
    const healthStatus = monitoringService.healthStatus;
    
    res.json({
      success: true,
      data: {
        overall: healthStatus.overall,
        modules: healthStatus.modules,
        lastUpdate: healthStatus.lastUpdate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Current metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoringService.collectMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Metrics collection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics collection failed',
      details: error.message
    });
  }
});

// Metrics history endpoint
router.get('/metrics/history', async (req, res) => {
  try {
    const timeRange = req.query.range || '1h';
    const validRanges = ['1h', '6h', '24h', '7d'];
    
    if (!validRanges.includes(timeRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time range',
        validRanges
      });
    }
    
    const history = await monitoringService.getMetricsHistory(timeRange);
    
    res.json({
      success: true,
      data: {
        timeRange,
        metrics: history,
        count: history.length
      }
    });
  } catch (error) {
    console.error('Metrics history retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics history retrieval failed',
      details: error.message
    });
  }
});

// Dashboard data endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await monitoringService.getDashboardData();
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Dashboard data retrieval failed',
      details: error.message
    });
  }
});

// Generate dashboard HTML
router.get('/dashboard/html', async (req, res) => {
  try {
    const dashboardPath = await dashboardService.generateHealthDashboard();
    
    res.json({
      success: true,
      data: {
        dashboardPath,
        url: `/artifacts/dashboard/health-dashboard.html`,
        message: 'Dashboard generated successfully'
      }
    });
  } catch (error) {
    console.error('Dashboard generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Dashboard generation failed',
      details: error.message
    });
  }
});

// Metrics report endpoint
router.get('/reports/metrics', async (req, res) => {
  try {
    const report = await dashboardService.generateMetricsReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Metrics report generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Metrics report generation failed',
      details: error.message
    });
  }
});

// Active alerts endpoint
router.get('/alerts', async (req, res) => {
  try {
    const activeAlerts = alertingService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        count: activeAlerts.length
      }
    });
  } catch (error) {
    console.error('Active alerts retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Active alerts retrieval failed',
      details: error.message
    });
  }
});

// Recent alerts endpoint
router.get('/alerts/recent', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const recentAlerts = alertingService.getRecentAlerts(hours);
    
    res.json({
      success: true,
      data: {
        alerts: recentAlerts,
        count: recentAlerts.length,
        timeRange: `${hours}h`
      }
    });
  } catch (error) {
    console.error('Recent alerts retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Recent alerts retrieval failed',
      details: error.message
    });
  }
});

// Alert statistics endpoint
router.get('/alerts/statistics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const statistics = alertingService.getAlertStatistics(hours);
    
    res.json({
      success: true,
      data: {
        statistics,
        timeRange: `${hours}h`
      }
    });
  } catch (error) {
    console.error('Alert statistics retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Alert statistics retrieval failed',
      details: error.message
    });
  }
});

// Acknowledge alert endpoint
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    
    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: 'acknowledgedBy is required'
      });
    }
    
    const alert = await alertingService.acknowledgeAlert(alertId, acknowledgedBy);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Alert acknowledgment failed:', error);
    res.status(500).json({
      success: false,
      error: 'Alert acknowledgment failed',
      details: error.message
    });
  }
});

// Resolve alert endpoint
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy, resolution } = req.body;
    
    if (!resolvedBy || !resolution) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy and resolution are required'
      });
    }
    
    const alert = await alertingService.resolveAlert(alertId, resolvedBy, resolution);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Alert resolution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Alert resolution failed',
      details: error.message
    });
  }
});

// Suppress alert rule endpoint
router.post('/alerts/rules/:ruleId/suppress', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { suppressedBy, duration, reason } = req.body;
    
    if (!suppressedBy || !duration || !reason) {
      return res.status(400).json({
        success: false,
        error: 'suppressedBy, duration, and reason are required'
      });
    }
    
    const suppression = await alertingService.suppressAlert(
      ruleId, 
      suppressedBy, 
      duration, 
      reason
    );
    
    res.json({
      success: true,
      data: suppression,
      message: 'Alert rule suppressed successfully'
    });
  } catch (error) {
    console.error('Alert suppression failed:', error);
    res.status(500).json({
      success: false,
      error: 'Alert suppression failed',
      details: error.message
    });
  }
});

// Alert report endpoint
router.get('/alerts/report', async (req, res) => {
  try {
    const report = await alertingService.generateAlertReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Alert report generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Alert report generation failed',
      details: error.message
    });
  }
});

// Trigger manual health check
router.post('/health/check', async (req, res) => {
  try {
    await monitoringService.performHealthCheck();
    const healthStatus = monitoringService.healthStatus;
    
    res.json({
      success: true,
      data: healthStatus,
      message: 'Health check completed'
    });
  } catch (error) {
    console.error('Manual health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual health check failed',
      details: error.message
    });
  }
});

// Trigger manual metrics collection
router.post('/metrics/collect', async (req, res) => {
  try {
    const metrics = await monitoringService.collectMetrics();
    
    res.json({
      success: true,
      data: metrics,
      message: 'Metrics collected successfully'
    });
  } catch (error) {
    console.error('Manual metrics collection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual metrics collection failed',
      details: error.message
    });
  }
});

// Evaluate alerts manually
router.post('/alerts/evaluate', async (req, res) => {
  try {
    const metrics = await monitoringService.collectMetrics();
    const triggeredAlerts = await alertingService.evaluateAlerts(metrics);
    
    res.json({
      success: true,
      data: {
        triggeredAlerts,
        count: triggeredAlerts.length,
        metrics
      },
      message: 'Alert evaluation completed'
    });
  } catch (error) {
    console.error('Manual alert evaluation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual alert evaluation failed',
      details: error.message
    });
  }
});

// Get monitoring service status
router.get('/status', async (req, res) => {
  try {
    const status = {
      monitoringService: {
        running: !!monitoringService,
        healthCheckInterval: !!monitoringService?.healthCheckInterval,
        sloMonitoringInterval: !!monitoringService?.sloMonitoringInterval,
        metricsCollectionInterval: !!monitoringService?.metricsCollectionInterval
      },
      dashboardService: {
        available: !!dashboardService
      },
      alertingService: {
        available: !!alertingService,
        activeAlerts: alertingService?.getActiveAlerts()?.length || 0,
        alertRules: alertingService?.alertRules?.size || 0
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      details: error.message
    });
  }
});

// Graceful shutdown endpoint
router.post('/shutdown', async (req, res) => {
  try {
    if (monitoringService) {
      await monitoringService.stopMonitoring();
    }
    
    res.json({
      success: true,
      message: 'Monitoring services stopped'
    });
  } catch (error) {
    console.error('Shutdown failed:', error);
    res.status(500).json({
      success: false,
      error: 'Shutdown failed',
      details: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Validation monitoring API error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
  });
});

export default router;