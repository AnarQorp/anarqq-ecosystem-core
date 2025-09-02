import { v4 as uuidv4 } from 'uuid';
import { logger, loggerHelpers } from '../utils/logger';
import { EventBus } from '../utils/eventBus';
import { AuditEvent } from '../types';
import { config } from '../config';

export interface PermissionCheckAuditParams {
  checkId: string;
  resource: string;
  identity: string;
  action: string;
  result: 'ALLOWED' | 'DENIED' | 'ERROR';
  reason: string;
  responseTime: number;
  context?: Record<string, any>;
  cacheHit?: boolean;
}

export interface PermissionGrantAuditParams {
  grantId: string;
  resource: string;
  identity: string;
  permissions: string[];
  grantedBy: string;
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

export interface PermissionRevocationAuditParams {
  resource: string;
  identity: string;
  revokedPermissions: string[];
  revokedBy: string;
  reason?: string;
}

export class AuditService {
  private eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Log a permission check event
   */
  async logPermissionCheck(params: PermissionCheckAuditParams): Promise<void> {
    if (!config.features.auditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        eventId: uuidv4(),
        timestamp: new Date(),
        eventType: 'PERMISSION_CHECK',
        severity: params.result === 'ERROR' ? 'ERROR' : 'INFO',
        actor: {
          identity: params.identity,
        },
        resource: {
          id: params.resource,
          type: this.extractResourceType(params.resource),
        },
        action: {
          type: params.action,
          result: params.result,
          reason: params.reason,
        },
        context: {
          checkId: params.checkId,
          responseTime: params.responseTime,
          cacheHit: params.cacheHit || false,
          ...params.context,
        },
      };

      // Log locally
      loggerHelpers.logPermissionCheck(params);

      // Send to audit system (Qerberos)
      await this.sendToAuditSystem(auditEvent);

      // Publish audit event
      await this.publishAuditEvent(auditEvent);

    } catch (error) {
      logger.error('Failed to log permission check audit', { error, params });
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  /**
   * Log a permission grant event
   */
  async logPermissionGrant(params: PermissionGrantAuditParams): Promise<void> {
    if (!config.features.auditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        eventId: uuidv4(),
        timestamp: new Date(),
        eventType: 'PERMISSION_GRANTED',
        severity: 'INFO',
        actor: {
          identity: params.grantedBy,
        },
        resource: {
          id: params.resource,
          type: this.extractResourceType(params.resource),
        },
        action: {
          type: 'grant',
          result: 'ALLOWED',
          reason: `Granted permissions: ${params.permissions.join(', ')}`,
        },
        context: {
          grantId: params.grantId,
          targetIdentity: params.identity,
          permissions: params.permissions,
          expiresAt: params.expiresAt?.toISOString(),
          conditions: params.conditions,
        },
      };

      // Log locally
      loggerHelpers.logPermissionGrant(params);

      // Send to audit system
      await this.sendToAuditSystem(auditEvent);

      // Publish audit event
      await this.publishAuditEvent(auditEvent);

    } catch (error) {
      logger.error('Failed to log permission grant audit', { error, params });
    }
  }

  /**
   * Log a permission revocation event
   */
  async logPermissionRevocation(params: PermissionRevocationAuditParams): Promise<void> {
    if (!config.features.auditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        eventId: uuidv4(),
        timestamp: new Date(),
        eventType: 'PERMISSION_REVOKED',
        severity: 'INFO',
        actor: {
          identity: params.revokedBy,
        },
        resource: {
          id: params.resource,
          type: this.extractResourceType(params.resource),
        },
        action: {
          type: 'revoke',
          result: 'ALLOWED',
          reason: params.reason || `Revoked permissions: ${params.revokedPermissions.join(', ')}`,
        },
        context: {
          targetIdentity: params.identity,
          revokedPermissions: params.revokedPermissions,
          reason: params.reason,
        },
      };

      // Log locally
      loggerHelpers.logPermissionRevocation(params);

      // Send to audit system
      await this.sendToAuditSystem(auditEvent);

      // Publish audit event
      await this.publishAuditEvent(auditEvent);

    } catch (error) {
      logger.error('Failed to log permission revocation audit', { error, params });
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(params: {
    eventType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    identity?: string;
    resource?: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    if (!config.features.auditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        eventId: uuidv4(),
        timestamp: new Date(),
        eventType: params.eventType,
        severity: params.severity === 'CRITICAL' ? 'CRITICAL' : 
                 params.severity === 'HIGH' ? 'ERROR' :
                 params.severity === 'MEDIUM' ? 'WARN' : 'INFO',
        actor: {
          identity: params.identity || 'unknown',
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
        resource: params.resource ? {
          id: params.resource,
          type: this.extractResourceType(params.resource),
        } : undefined,
        action: {
          type: 'security_event',
          result: 'DENIED',
          reason: `Security event: ${params.eventType}`,
        },
        context: params.details,
      };

      // Log locally
      loggerHelpers.logSecurityEvent({
        eventType: params.eventType,
        severity: params.severity,
        identity: params.identity,
        resource: params.resource,
        details: params.details,
      });

      // Send to audit system with high priority
      await this.sendToAuditSystem(auditEvent, true);

      // Publish security event
      await this.publishSecurityEvent(auditEvent);

    } catch (error) {
      logger.error('Failed to log security event audit', { error, params });
    }
  }

  /**
   * Log a policy operation event
   */
  async logPolicyOperation(params: {
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    policyId: string;
    policyName: string;
    performedBy: string;
    details?: Record<string, any>;
  }): Promise<void> {
    if (!config.features.auditLogging) {
      return;
    }

    try {
      const auditEvent: AuditEvent = {
        eventId: uuidv4(),
        timestamp: new Date(),
        eventType: 'POLICY_OPERATION',
        severity: 'INFO',
        actor: {
          identity: params.performedBy,
        },
        action: {
          type: params.operation.toLowerCase(),
          result: 'ALLOWED',
          reason: `Policy ${params.operation.toLowerCase()}: ${params.policyName}`,
        },
        context: {
          policyId: params.policyId,
          policyName: params.policyName,
          operation: params.operation,
          ...params.details,
        },
      };

      // Log locally
      loggerHelpers.logPolicyOperation({
        operation: params.operation,
        policyId: params.policyId,
        policyName: params.policyName,
        performedBy: params.performedBy,
      });

      // Send to audit system
      await this.sendToAuditSystem(auditEvent);

      // Publish audit event
      await this.publishAuditEvent(auditEvent);

    } catch (error) {
      logger.error('Failed to log policy operation audit', { error, params });
    }
  }

  /**
   * Send audit event to Qerberos audit system
   */
  private async sendToAuditSystem(auditEvent: AuditEvent, highPriority = false): Promise<void> {
    try {
      // In a real implementation, this would send to Qerberos service
      // For now, we'll just log it
      logger.debug('Sending audit event to Qerberos', {
        eventId: auditEvent.eventId,
        eventType: auditEvent.eventType,
        severity: auditEvent.severity,
        highPriority,
      });

      // Mock implementation - in production this would be an HTTP call to Qerberos
      if (config.isDevelopment) {
        return;
      }

      // Example implementation:
      // const response = await fetch(`${config.services.qerberos.baseUrl}/api/v1/audit`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'x-priority': highPriority ? 'high' : 'normal',
      //   },
      //   body: JSON.stringify(auditEvent),
      // });

    } catch (error) {
      logger.error('Failed to send audit event to Qerberos', { error, eventId: auditEvent.eventId });
    }
  }

  /**
   * Publish audit event to event bus
   */
  private async publishAuditEvent(auditEvent: AuditEvent): Promise<void> {
    try {
      await this.eventBus.publish('q.qonsent.audit.v1', {
        eventId: auditEvent.eventId,
        timestamp: auditEvent.timestamp.toISOString(),
        source: 'qonsent',
        type: 'q.qonsent.audit.v1',
        data: auditEvent,
      });

    } catch (error) {
      logger.error('Failed to publish audit event', { error, eventId: auditEvent.eventId });
    }
  }

  /**
   * Publish security event to event bus
   */
  private async publishSecurityEvent(auditEvent: AuditEvent): Promise<void> {
    try {
      await this.eventBus.publish('q.qonsent.security.alert.v1', {
        eventId: auditEvent.eventId,
        timestamp: auditEvent.timestamp.toISOString(),
        source: 'qonsent',
        type: 'q.qonsent.security.alert.v1',
        data: auditEvent,
      });

    } catch (error) {
      logger.error('Failed to publish security event', { error, eventId: auditEvent.eventId });
    }
  }

  /**
   * Extract resource type from resource identifier
   */
  private extractResourceType(resource: string): string {
    const parts = resource.split(':');
    return parts.length >= 2 ? parts[1] : 'unknown';
  }
}