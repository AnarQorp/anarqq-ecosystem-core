/**
 * Audit Service
 * 
 * Provides comprehensive audit logging for all Qlock operations
 * with integration to Qerberos security monitoring.
 */

import crypto from 'crypto';

export class AuditService {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.eventService = options.eventService;
    this.qerberosService = options.qerberosService;
    this.auditLogs = []; // In-memory storage for standalone mode
    this.maxLogs = 10000; // Maximum logs to keep in memory
  }

  async initialize() {
    console.log('[AuditService] Initializing...');
    
    if (!this.eventService) {
      throw new Error('Event service is required for audit logging');
    }
    
    console.log(`[AuditService] Initialized (enabled: ${this.enabled})`);
  }

  /**
   * Log encryption operation
   */
  async logEncryption(operation, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'ENCRYPTION',
      operation,
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: details.success !== false ? 'ALLOW' : 'DENY',
      details: {
        algorithm: details.algorithm,
        keyId: details.keyId,
        dataSize: details.dataSize,
        quantumResistant: details.quantumResistant,
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log signature operation
   */
  async logSignature(operation, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'SIGNATURE',
      operation,
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: details.success !== false ? 'ALLOW' : 'DENY',
      details: {
        algorithm: details.algorithm,
        keyId: details.keyId,
        dataHash: details.dataHash,
        quantumResistant: details.quantumResistant,
        valid: details.valid,
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log lock operation
   */
  async logLock(operation, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'LOCK',
      operation,
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: details.success !== false ? 'ALLOW' : 'DENY',
      details: {
        lockId: details.lockId,
        resource: details.resource,
        ttl: details.ttl,
        duration: details.duration,
        reason: details.reason,
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log key management operation
   */
  async logKeyManagement(operation, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'KEY_MANAGEMENT',
      operation,
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: details.success !== false ? 'ALLOW' : 'DENY',
      details: {
        keyId: details.keyId,
        algorithm: details.algorithm,
        keyType: details.keyType,
        previousKeyId: details.previousKeyId,
        rotationReason: details.rotationReason,
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventType, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'SECURITY',
      operation: eventType,
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: 'WARN',
      details: {
        alertType: details.alertType,
        severity: details.severity,
        resource: details.resource,
        anomalyScore: details.anomalyScore,
        riskLevel: details.riskLevel,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);

    // Send security alert to event service
    if (this.eventService) {
      await this.eventService.publishSecurityAlert({
        alertType: eventType,
        severity: details.severity || 'medium',
        identityId,
        resource: details.resource,
        details: details,
        detectedAt: auditEntry.timestamp
      });
    }
  }

  /**
   * Log authentication event
   */
  async logAuthentication(result, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'AUTHENTICATION',
      operation: 'authenticate',
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: result === 'success' ? 'ALLOW' : 'DENY',
      details: {
        result,
        method: details.method,
        ip: details.ip,
        userAgent: details.userAgent,
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log authorization event
   */
  async logAuthorization(result, identityId, details = {}) {
    if (!this.enabled) return;

    const auditEntry = {
      type: 'AUTHORIZATION',
      operation: 'authorize',
      actor: { squidId: identityId },
      layer: 'qlock',
      verdict: result === 'granted' ? 'ALLOW' : 'DENY',
      details: {
        result,
        permission: details.permission,
        resource: details.resource,
        qonsentToken: details.qonsentToken ? 'present' : 'missing',
        error: details.error,
        ...details
      },
      timestamp: new Date().toISOString(),
      requestId: details.requestId || crypto.randomUUID()
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Write audit log entry
   */
  async writeAuditLog(auditEntry) {
    try {
      // Add to in-memory storage
      this.auditLogs.push(auditEntry);
      
      // Maintain maximum log size
      if (this.auditLogs.length > this.maxLogs) {
        this.auditLogs = this.auditLogs.slice(-this.maxLogs);
      }

      // Send to Qerberos if available
      if (this.qerberosService) {
        await this.qerberosService.logAuditEvent(auditEntry);
      }

      console.log(`[AuditService] Logged ${auditEntry.type} event: ${auditEntry.operation}`);

    } catch (error) {
      console.error('[AuditService] Failed to write audit log:', error);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Query audit logs
   */
  queryLogs(filters = {}) {
    let logs = [...this.auditLogs];

    // Filter by type
    if (filters.type) {
      logs = logs.filter(log => log.type === filters.type);
    }

    // Filter by actor
    if (filters.identityId) {
      logs = logs.filter(log => log.actor.squidId === filters.identityId);
    }

    // Filter by verdict
    if (filters.verdict) {
      logs = logs.filter(log => log.verdict === filters.verdict);
    }

    // Filter by time range
    if (filters.startTime) {
      const startTime = new Date(filters.startTime);
      logs = logs.filter(log => new Date(log.timestamp) >= startTime);
    }

    if (filters.endTime) {
      const endTime = new Date(filters.endTime);
      logs = logs.filter(log => new Date(log.timestamp) <= endTime);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    const limit = filters.limit || 100;
    return logs.slice(0, limit);
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics() {
    const stats = {
      totalLogs: this.auditLogs.length,
      byType: {},
      byVerdict: {},
      recentActivity: {},
      topActors: {}
    };

    // Count by type and verdict
    this.auditLogs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.byVerdict[log.verdict] = (stats.byVerdict[log.verdict] || 0) + 1;
      
      // Count by actor
      const actor = log.actor.squidId;
      stats.topActors[actor] = (stats.topActors[actor] || 0) + 1;
    });

    // Recent activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) > oneHourAgo
    );

    recentLogs.forEach(log => {
      stats.recentActivity[log.type] = (stats.recentActivity[log.type] || 0) + 1;
    });

    // Convert topActors to sorted array
    stats.topActors = Object.entries(stats.topActors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([actor, count]) => ({ actor, count }));

    return stats;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(type = 'GDPR', timeRange = '30d') {
    const endTime = new Date();
    const startTime = new Date();
    
    // Calculate start time based on range
    switch (timeRange) {
      case '24h':
        startTime.setHours(startTime.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(startTime.getDate() - 30);
        break;
      case '90d':
        startTime.setDate(startTime.getDate() - 90);
        break;
      default:
        startTime.setDate(startTime.getDate() - 30);
    }

    const logs = this.queryLogs({ startTime, endTime });

    const report = {
      type,
      timeRange,
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: logs.length,
        securityEvents: logs.filter(log => log.type === 'SECURITY').length,
        failedOperations: logs.filter(log => log.verdict === 'DENY').length,
        keyRotations: logs.filter(log => 
          log.type === 'KEY_MANAGEMENT' && log.operation === 'rotate'
        ).length
      },
      details: logs
    };

    return report;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getAuditStatistics();
    
    return {
      status: 'healthy',
      enabled: this.enabled,
      qerberosConnected: !!this.qerberosService,
      statistics: stats
    };
  }
}