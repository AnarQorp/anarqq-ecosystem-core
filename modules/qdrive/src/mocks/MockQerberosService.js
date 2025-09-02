import { logger } from '../utils/logger.js';

export class MockQerberosService {
  constructor() {
    this.auditLogs = [];
    this.riskScores = new Map();
    this.anomalies = [];
  }

  async audit(auditEvent) {
    logger.debug(`[MockQerberos] Logging audit event: ${auditEvent.type}`);
    
    await new Promise(resolve => setTimeout(resolve, 60));

    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...auditEvent
    };

    this.auditLogs.push(logEntry);

    // Keep only last 1000 entries for memory management
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    return {
      success: true,
      auditId: logEntry.id,
      timestamp: logEntry.timestamp
    };
  }

  async riskScore(actor, context = {}) {
    logger.debug(`[MockQerberos] Calculating risk score for: ${actor.squidId}`);
    
    await new Promise(resolve => setTimeout(resolve, 80));

    // Mock risk calculation
    let baseScore = 0.1; // Low base risk
    
    // Increase risk based on activity patterns
    const recentLogs = this.auditLogs.filter(log => 
      log.actor?.squidId === actor.squidId &&
      Date.now() - new Date(log.timestamp).getTime() < 3600000 // Last hour
    );

    if (recentLogs.length > 50) {
      baseScore += 0.3; // High activity
    }

    // Check for failed operations
    const failedOps = recentLogs.filter(log => log.outcome === 'FAILURE');
    if (failedOps.length > 5) {
      baseScore += 0.4; // Multiple failures
    }

    // Check for suspicious patterns
    const uploadCount = recentLogs.filter(log => log.type === 'FILE_UPLOAD').length;
    if (uploadCount > 20) {
      baseScore += 0.2; // Rapid uploads
    }

    const riskScore = Math.min(baseScore, 1.0);
    
    // Cache the score
    this.riskScores.set(actor.squidId, {
      score: riskScore,
      factors: {
        activityLevel: recentLogs.length > 50 ? 'high' : 'normal',
        failureRate: failedOps.length / Math.max(recentLogs.length, 1),
        uploadRate: uploadCount
      },
      calculatedAt: new Date().toISOString()
    });

    return {
      success: true,
      actor: actor.squidId,
      riskScore,
      level: riskScore > 0.8 ? 'critical' : riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
      factors: this.riskScores.get(actor.squidId).factors
    };
  }

  async reportAnomaly(anomalyData) {
    logger.debug(`[MockQerberos] Reporting anomaly: ${anomalyData.type}`);
    
    await new Promise(resolve => setTimeout(resolve, 40));

    const anomaly = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...anomalyData
    };

    this.anomalies.push(anomaly);

    // Keep only last 500 anomalies
    if (this.anomalies.length > 500) {
      this.anomalies = this.anomalies.slice(-500);
    }

    return {
      success: true,
      anomalyId: anomaly.id,
      severity: anomaly.severity || 'medium'
    };
  }

  async getAuditLogs(filters = {}) {
    logger.debug('[MockQerberos] Retrieving audit logs', filters);
    
    await new Promise(resolve => setTimeout(resolve, 30));

    let logs = [...this.auditLogs];

    // Apply filters
    if (filters.actor) {
      logs = logs.filter(log => log.actor?.squidId === filters.actor);
    }

    if (filters.type) {
      logs = logs.filter(log => log.type === filters.type);
    }

    if (filters.startTime) {
      const startTime = new Date(filters.startTime).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= startTime);
    }

    if (filters.endTime) {
      const endTime = new Date(filters.endTime).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= endTime);
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedLogs = logs.slice(offset, offset + limit);

    return {
      success: true,
      logs: paginatedLogs,
      pagination: {
        total: logs.length,
        offset,
        limit,
        hasMore: offset + limit < logs.length
      }
    };
  }

  // File-specific audit methods
  async logFileUpload(actor, fileMetadata) {
    return await this.audit({
      type: 'FILE_UPLOAD',
      actor,
      resource: {
        cid: fileMetadata.cid,
        name: fileMetadata.name,
        size: fileMetadata.size,
        mimeType: fileMetadata.mimeType,
        encrypted: fileMetadata.encrypted,
        privacy: fileMetadata.privacy
      },
      outcome: 'SUCCESS',
      riskScore: 0.1
    });
  }

  async logFileAccess(actor, fileMetadata, accessType = 'download') {
    return await this.audit({
      type: 'FILE_ACCESS',
      actor,
      resource: {
        cid: fileMetadata.cid,
        owner: fileMetadata.owner,
        accessType,
        privacy: fileMetadata.privacy
      },
      outcome: 'SUCCESS',
      riskScore: 0.2
    });
  }

  async logFileShare(actor, cid, shareData) {
    return await this.audit({
      type: 'FILE_SHARE',
      actor,
      resource: {
        cid,
        shareId: shareData.shareId || 'unknown'
      },
      sharing: {
        recipients: shareData.recipients || [],
        permissions: shareData.permissions || ['read'],
        expiresAt: shareData.expiresAt
      },
      outcome: 'SUCCESS',
      riskScore: 0.3
    });
  }

  async logFileDeletion(actor, fileMetadata, reason = 'user_request') {
    return await this.audit({
      type: 'FILE_DELETE',
      actor,
      resource: {
        cid: fileMetadata.cid,
        name: fileMetadata.name,
        size: fileMetadata.size
      },
      deletion: {
        reason,
        retentionPolicy: fileMetadata.retentionPolicy?.policy || 'delete'
      },
      outcome: 'SUCCESS',
      riskScore: 0.1
    });
  }

  async logMetadataUpdate(actor, cid, updates) {
    return await this.audit({
      type: 'METADATA_UPDATE',
      actor,
      resource: {
        cid,
        updates
      },
      outcome: 'SUCCESS',
      riskScore: 0.1
    });
  }

  async logFileList(actor, filters) {
    return await this.audit({
      type: 'FILE_LIST',
      actor,
      context: {
        filters
      },
      outcome: 'SUCCESS',
      riskScore: 0.05
    });
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qerberos',
      auditLogs: this.auditLogs.length,
      riskScores: this.riskScores.size,
      anomalies: this.anomalies.length,
      timestamp: new Date().toISOString()
    };
  }
}