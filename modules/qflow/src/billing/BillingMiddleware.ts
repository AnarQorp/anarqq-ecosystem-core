/**
 * Billing Middleware
 * 
 * Express middleware for tracking API usage and enforcing billing limits
 */

import { Request, Response, NextFunction } from 'express';
import { resourceBillingService } from './ResourceBillingService.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

// Extend Express Request to include billing context
declare global {
  namespace Express {
    interface Request {
      billing?: {
        tenantId: string;
        startTime: number;
        tracked: boolean;
      };
    }
  }
}

export interface BillingMiddlewareOptions {
  trackUsage?: boolean;
  enforceQuotas?: boolean;
  exemptEndpoints?: string[];
}

/**
 * Billing tracking middleware
 */
export function billingTracker(options: BillingMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        trackUsage = true,
        enforceQuotas = true,
        exemptEndpoints = ['/health', '/metrics', '/docs']
      } = options;

      // Skip tracking for exempt endpoints
      if (exemptEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        return next();
      }

      // Get tenant ID from various sources
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return next(); // No tenant ID, skip billing
      }

      // Initialize billing context
      req.billing = {
        tenantId,
        startTime: Date.now(),
        tracked: false
      };

      // Check quotas before processing request
      if (enforceQuotas) {
        const quotaCheck = await resourceBillingService.canAllocateResources(tenantId, {
          executions: req.method === 'POST' && req.path.includes('/start') ? 1 : 0
        });

        if (!quotaCheck.allowed) {
          return res.status(429).json({
            success: false,
            error: 'QUOTA_EXCEEDED',
            message: quotaCheck.reason,
            limits: quotaCheck.limits,
            requestId: req.headers['x-request-id'] || 'unknown'
          });
        }
      }

      // Track API call on response finish
      if (trackUsage) {
        res.on('finish', async () => {
          if (req.billing && !req.billing.tracked) {
            const responseTime = Date.now() - req.billing.startTime;
            
            try {
              await resourceBillingService.trackAPIUsage(
                req.billing.tenantId,
                `${req.method} ${req.path}`,
                responseTime,
                res.statusCode
              );
              req.billing.tracked = true;
            } catch (error) {
              console.error('[BillingMiddleware] Failed to track API usage:', error);
            }
          }
        });
      }

      next();

    } catch (error) {
      console.error('[BillingMiddleware] Billing middleware error:', error);
      
      // Log middleware error
      qflowEventEmitter.emit('q.qflow.billing.middleware.error.v1', {
        eventId: generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-billing-middleware',
        actor: 'system',
        data: {
          error: error instanceof Error ? error.message : String(error),
          endpoint: `${req.method} ${req.path}`,
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      // Don't block request on billing errors
      next();
    }
  };
}

/**
 * Middleware to enforce tenant isolation
 */
export function tenantIsolation() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return next(); // No tenant, skip isolation
      }

      // Get tenant isolation config
      const isolationConfig = await resourceBillingService.getTenantIsolationConfig(tenantId);
      if (!isolationConfig) {
        return next(); // No config, skip isolation
      }

      // Add isolation headers
      if (isolationConfig.isolation.networkSegmentation) {
        res.setHeader('X-Tenant-Network-Segment', tenantId);
      }

      if (isolationConfig.isolation.logIsolation) {
        res.setHeader('X-Tenant-Log-Isolation', 'enabled');
      }

      if (isolationConfig.dataResidency.encryptionInTransit) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      // Add compliance headers
      if (isolationConfig.compliance.gdprCompliant) {
        res.setHeader('X-GDPR-Compliant', 'true');
      }

      if (isolationConfig.compliance.hipaaCompliant) {
        res.setHeader('X-HIPAA-Compliant', 'true');
      }

      if (isolationConfig.compliance.soc2Compliant) {
        res.setHeader('X-SOC2-Compliant', 'true');
      }

      next();

    } catch (error) {
      console.error('[BillingMiddleware] Tenant isolation error:', error);
      next(); // Don't block on isolation errors
    }
  };
}

/**
 * Middleware to add billing context to responses
 */
export function billingContext() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return next();
      }

      // Get current usage
      const usage = await resourceBillingService.getTenantUsage(tenantId);
      if (usage) {
        res.setHeader('X-Tenant-CPU-Usage', usage.usage.cpu.total.toString());
        res.setHeader('X-Tenant-Memory-Usage', usage.usage.memory.total.toString());
        res.setHeader('X-Tenant-Executions', usage.usage.executions.total.toString());
        res.setHeader('X-Tenant-Cost', usage.costs.total.toFixed(4));
        res.setHeader('X-Tenant-Billing-Tier', usage.limits.billingTier);
      }

      // Get unacknowledged alerts
      const alerts = await resourceBillingService.getTenantAlerts(tenantId, true);
      if (alerts.length > 0) {
        res.setHeader('X-Tenant-Alerts', alerts.length.toString());
        res.setHeader('X-Tenant-Alert-Severity', getHighestSeverity(alerts));
      }

      next();

    } catch (error) {
      console.error('[BillingMiddleware] Billing context error:', error);
      next();
    }
  };
}

/**
 * Middleware to check resource limits before expensive operations
 */
export function resourceLimitCheck(resourceType: 'cpu' | 'memory' | 'storage' | 'executions') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return next();
      }

      // Get estimated resource requirements based on operation
      const estimatedResources = estimateResourceRequirements(req, resourceType);
      
      const quotaCheck = await resourceBillingService.canAllocateResources(
        tenantId,
        estimatedResources
      );

      if (!quotaCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: 'RESOURCE_LIMIT_EXCEEDED',
          message: `${resourceType} limit exceeded: ${quotaCheck.reason}`,
          limits: quotaCheck.limits,
          requestId: req.headers['x-request-id'] || 'unknown'
        });
      }

      next();

    } catch (error) {
      console.error('[BillingMiddleware] Resource limit check error:', error);
      next(); // Don't block on check errors
    }
  };
}

/**
 * Get tenant billing summary
 */
export async function getTenantBillingSummary(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'TENANT_ID_REQUIRED',
        message: 'Tenant ID is required for billing summary'
      });
    }

    const [usage, alerts, isolationConfig] = await Promise.all([
      resourceBillingService.getTenantUsage(tenantId),
      resourceBillingService.getTenantAlerts(tenantId),
      resourceBillingService.getTenantIsolationConfig(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        tenantId,
        usage: usage ? {
          period: usage.period,
          resources: usage.usage,
          costs: usage.costs,
          limits: usage.limits.limits,
          billingTier: usage.limits.billingTier
        } : null,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          resource: alert.resource,
          message: alert.message,
          severity: alert.severity,
          createdAt: alert.createdAt,
          acknowledged: alert.acknowledged
        })),
        isolation: isolationConfig ? {
          networkSegmentation: isolationConfig.isolation.networkSegmentation,
          storageEncryption: isolationConfig.isolation.storageEncryption,
          computeIsolation: isolationConfig.isolation.computeIsolation,
          compliance: isolationConfig.compliance
        } : null
      }
    });

  } catch (error) {
    console.error('[BillingMiddleware] Failed to get billing summary:', error);
    res.status(500).json({
      success: false,
      error: 'BILLING_SUMMARY_ERROR',
      message: 'Failed to get billing summary'
    });
  }
}

// Helper functions

function getTenantId(req: Request): string | null {
  // Try multiple sources for tenant ID
  return (
    req.headers['x-tenant-id'] as string ||
    req.headers['x-dao-subnet'] as string ||
    req.query.tenantId as string ||
    req.body?.daoSubnet ||
    req.identity?.metadata?.daoSubnet ||
    null
  );
}

function estimateResourceRequirements(
  req: Request,
  resourceType: string
): Record<string, number> {
  const requirements: Record<string, number> = {};

  // Estimate based on endpoint and operation
  if (req.path.includes('/start') && req.method === 'POST') {
    requirements.executions = 1;
    requirements.cpu = 1; // 1 second of CPU
    requirements.memory = 128; // 128 MB
  }

  if (req.path.includes('/flows') && req.method === 'POST') {
    requirements.storage = 1; // 1 MB for flow definition
  }

  return requirements;
}

function getHighestSeverity(alerts: any[]): string {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  let highest = 'low';

  for (const alert of alerts) {
    const currentIndex = severityOrder.indexOf(alert.severity);
    const highestIndex = severityOrder.indexOf(highest);
    if (currentIndex > highestIndex) {
      highest = alert.severity;
    }
  }

  return highest;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}