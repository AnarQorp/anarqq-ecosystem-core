/**
 * Compliance API Routes
 * Handles compliance automation, reporting, and dashboard endpoints
 */

import express from 'express';
import { ComplianceService } from '../services/ComplianceService.mjs';
import { standardAuthMiddleware } from '../middleware/standardAuth.mjs';
import { validateJoi } from '../middleware/joiValidation.mjs';
import { validateDSR, validatePIA } from '../middleware/validation.mjs';

const router = express.Router();
const complianceService = new ComplianceService();

// Middleware for compliance routes
router.use(standardAuthMiddleware());

/**
 * GDPR Endpoints
 */

// Process Data Subject Request
router.post('/gdpr/dsr', validateDSR, async (req, res) => {
  try {
    const result = await complianceService.processDSR(req.body);
    
    res.json({
      status: 'ok',
      code: 'DSR_PROCESSED',
      message: 'Data Subject Request processed successfully',
      data: result
    });
  } catch (error) {
    console.error('DSR processing failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'DSR_PROCESSING_FAILED',
      message: error.message
    });
  }
});

// Get DSR status
router.get('/gdpr/dsr/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const dsrRecord = await complianceService.getDSRStatus(requestId);
    
    if (!dsrRecord) {
      return res.status(404).json({
        status: 'error',
        code: 'DSR_NOT_FOUND',
        message: 'Data Subject Request not found'
      });
    }

    res.json({
      status: 'ok',
      code: 'DSR_STATUS_RETRIEVED',
      message: 'DSR status retrieved successfully',
      data: dsrRecord
    });
  } catch (error) {
    console.error('DSR status retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'DSR_STATUS_FAILED',
      message: error.message
    });
  }
});

// Perform GDPR compliance check
router.post('/gdpr/check', async (req, res) => {
  try {
    const report = await complianceService.performGDPRCheck();
    
    res.json({
      status: 'ok',
      code: 'GDPR_CHECK_COMPLETED',
      message: 'GDPR compliance check completed',
      data: report
    });
  } catch (error) {
    console.error('GDPR compliance check failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'GDPR_CHECK_FAILED',
      message: error.message
    });
  }
});

/**
 * SOC2 Endpoints
 */

// Generate SOC2 report
router.post('/soc2/report', async (req, res) => {
  try {
    const { period = 'monthly' } = req.body;
    const report = await complianceService.generateSOC2Report(period);
    
    res.json({
      status: 'ok',
      code: 'SOC2_REPORT_GENERATED',
      message: 'SOC2 compliance report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('SOC2 report generation failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'SOC2_REPORT_FAILED',
      message: error.message
    });
  }
});

// Get SOC2 control assessments
router.get('/soc2/controls', async (req, res) => {
  try {
    const assessments = await complianceService.getSOC2ControlAssessments();
    
    res.json({
      status: 'ok',
      code: 'SOC2_CONTROLS_RETRIEVED',
      message: 'SOC2 control assessments retrieved successfully',
      data: assessments
    });
  } catch (error) {
    console.error('SOC2 controls retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'SOC2_CONTROLS_FAILED',
      message: error.message
    });
  }
});

/**
 * Data Retention Endpoints
 */

// Enforce retention policies
router.post('/retention/enforce', async (req, res) => {
  try {
    const report = await complianceService.enforceRetentionPolicies();
    
    res.json({
      status: 'ok',
      code: 'RETENTION_ENFORCED',
      message: 'Data retention policies enforced successfully',
      data: report
    });
  } catch (error) {
    console.error('Retention enforcement failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'RETENTION_ENFORCEMENT_FAILED',
      message: error.message
    });
  }
});

// Get retention policy status
router.get('/retention/status', async (req, res) => {
  try {
    const status = await complianceService.getRetentionStatus();
    
    res.json({
      status: 'ok',
      code: 'RETENTION_STATUS_RETRIEVED',
      message: 'Retention policy status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Retention status retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'RETENTION_STATUS_FAILED',
      message: error.message
    });
  }
});

/**
 * Privacy Impact Assessment Endpoints
 */

// Perform privacy impact assessment
router.post('/pia/assess', validatePIA, async (req, res) => {
  try {
    const pia = await complianceService.performPrivacyImpactAssessment(req.body);
    
    res.json({
      status: 'ok',
      code: 'PIA_COMPLETED',
      message: 'Privacy Impact Assessment completed successfully',
      data: pia
    });
  } catch (error) {
    console.error('PIA failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'PIA_FAILED',
      message: error.message
    });
  }
});

// Get PIA history
router.get('/pia/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const history = await complianceService.getPIAHistory(limit, offset);
    
    res.json({
      status: 'ok',
      code: 'PIA_HISTORY_RETRIEVED',
      message: 'PIA history retrieved successfully',
      data: history
    });
  } catch (error) {
    console.error('PIA history retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'PIA_HISTORY_FAILED',
      message: error.message
    });
  }
});

/**
 * Compliance Dashboard Endpoints
 */

// Get compliance dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await complianceService.getComplianceDashboard();
    
    res.json({
      status: 'ok',
      code: 'DASHBOARD_RETRIEVED',
      message: 'Compliance dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    console.error('Dashboard retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'DASHBOARD_FAILED',
      message: error.message
    });
  }
});

// Get compliance violations
router.get('/violations', async (req, res) => {
  try {
    const { status = 'ACTIVE', limit = 100 } = req.query;
    const violations = await complianceService.getViolations(status, limit);
    
    res.json({
      status: 'ok',
      code: 'VIOLATIONS_RETRIEVED',
      message: 'Compliance violations retrieved successfully',
      data: violations
    });
  } catch (error) {
    console.error('Violations retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'VIOLATIONS_FAILED',
      message: error.message
    });
  }
});

// Acknowledge violation
router.post('/violations/:violationId/acknowledge', async (req, res) => {
  try {
    const { violationId } = req.params;
    const { acknowledgment } = req.body;
    
    const result = await complianceService.acknowledgeViolation(violationId, {
      acknowledgedBy: req.user.squidId,
      acknowledgment,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'ok',
      code: 'VIOLATION_ACKNOWLEDGED',
      message: 'Violation acknowledged successfully',
      data: result
    });
  } catch (error) {
    console.error('Violation acknowledgment failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'VIOLATION_ACK_FAILED',
      message: error.message
    });
  }
});

// Get compliance metrics
router.get('/metrics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const metrics = await complianceService.getComplianceMetrics(period);
    
    res.json({
      status: 'ok',
      code: 'METRICS_RETRIEVED',
      message: 'Compliance metrics retrieved successfully',
      data: metrics
    });
  } catch (error) {
    console.error('Metrics retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'METRICS_FAILED',
      message: error.message
    });
  }
});

// Get compliance alerts
router.get('/alerts', async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    const alerts = await complianceService.getComplianceAlerts(severity, limit);
    
    res.json({
      status: 'ok',
      code: 'ALERTS_RETRIEVED',
      message: 'Compliance alerts retrieved successfully',
      data: alerts
    });
  } catch (error) {
    console.error('Alerts retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      code: 'ALERTS_FAILED',
      message: error.message
    });
  }
});

export default router;