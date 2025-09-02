/**
 * Mock Qerberos Service for Standalone Development
 * 
 * Provides mock audit logging and security monitoring for testing.
 */

import crypto from 'crypto';

export class MockQerberosService {
  constructor() {
    this.auditLogs = new Map();
    this.securityEvents = new Map();
    this.riskScores = new Map();
    this.anomalies = new Map();
    
    // Initialize with some test data
    this.initializeTestData();
  }

  initializeTestData() {
    // Initialize risk scores for test identities
    const testRiskScores = [
      { squidId: 'squid_alice123', riskScore: 0.1, lastUpdated: new Date().toISOString() },
      { squidId: 'squid_bob456', riskScore: 0.2, lastUpdated: new Date().toISOString() },
      { squidId: 'squid_charlie789', riskScore: 0.15, lastUpdated: new Date().toISOString() }
    ];

    testRiskScores.forEach(score => {
      this.riskScores.set(score.squidId, score);
    });
  }

  async logEvent({ action, squidId, resourceId, metadata, correlationId }) {
    await this.simulateDelay(50, 150);

    const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const auditEvent = {
      eventId,
      eventType: `qmarket.${action}`,
      timestamp,
      source: 'qmarket',
      version: '1.0.0',
      correlationId,
      actor: {
        squidId: squidId || 'system',
        ipAddress: this.generateMockIP(),
        userAgent: 'MockUserAgent/1.0'
      },
      resource: {
        type: this.inferResourceType(resourceId),
        id: resourceId || 'unknown',
        attributes: metadata || {}
      },
      action: {
        type: action,
        result: this.inferActionResult(action, metadata),
        details: metadata || {},
        metadata: {
          processingTime: metadata?.processingTime || Math.floor(Math.random() * 1000),
          environment: 'development'
        }
      },
      security: {
        riskScore: await this.calculateRiskScore(squidId, action, metadata),
        anomalyFlags: this.detectAnomalies(squidId, action, metadata),
        complianceFlags: this.checkCompliance(action, metadata)
      }
    };

    this.auditLogs.set(eventId, auditEvent);

    // Check for security events
    if (auditEvent.security.riskScore > 0.7 || auditEvent.security.anomalyFlags.length > 0) {
      await this.createSecurityEvent(auditEvent);
    }

    return {
      success: true,
      eventId,
      timestamp,
      riskScore: auditEvent.security.riskScore
    };
  }

  async createSecurityEvent(auditEvent) {
    const securityEventId = `sec_${crypto.randomBytes(12).toString('hex')}`;
    
    const securityEvent = {
      securityEventId,
      auditEventId: auditEvent.eventId,
      severity: this.calculateSeverity(auditEvent.security.riskScore, auditEvent.security.anomalyFlags),
      type: this.classifySecurityEventType(auditEvent.action.type, auditEvent.security.anomalyFlags),
      squidId: auditEvent.actor.squidId,
      description: this.generateSecurityDescription(auditEvent),
      riskScore: auditEvent.security.riskScore,
      anomalyFlags: auditEvent.security.anomalyFlags,
      complianceFlags: auditEvent.security.complianceFlags,
      automaticActions: this.determineAutomaticActions(auditEvent.security.riskScore),
      manualReviewRequired: auditEvent.security.riskScore > 0.8,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    this.securityEvents.set(securityEventId, securityEvent);

    return securityEvent;
  }

  async calculateRiskScore(squidId, action, metadata) {
    await this.simulateDelay(20, 50);

    // Get base risk score for the identity
    const baseRisk = this.riskScores.get(squidId)?.riskScore || 0.5;

    // Adjust based on action type
    const actionRiskMultipliers = {
      'listing_created': 0.1,
      'listing_updated': 0.05,
      'listing_deleted': 0.2,
      'marketplace_purchase': 0.3,
      'purchase_failed': 0.8,
      'auth_failure': 0.9,
      'permission_denied': 0.6,
      'rate_limit_exceeded': 0.7,
      'anomaly_detection': 0.9
    };

    const actionMultiplier = actionRiskMultipliers[action] || 0.3;
    
    // Adjust based on metadata
    let metadataMultiplier = 1.0;
    if (metadata) {
      if (metadata.error) metadataMultiplier += 0.3;
      if (metadata.price && metadata.price > 1000) metadataMultiplier += 0.2;
      if (metadata.failureReason) metadataMultiplier += 0.4;
      if (metadata.retryAttempts && metadata.retryAttempts > 3) metadataMultiplier += 0.3;
    }

    const finalRiskScore = Math.min(1.0, baseRisk * actionMultiplier * metadataMultiplier);

    // Update stored risk score
    this.riskScores.set(squidId, {
      squidId,
      riskScore: finalRiskScore,
      lastUpdated: new Date().toISOString(),
      lastAction: action
    });

    return Math.round(finalRiskScore * 100) / 100; // Round to 2 decimal places
  }

  detectAnomalies(squidId, action, metadata) {
    const anomalies = [];

    // Check for rapid successive actions
    const recentEvents = this.getRecentEventsByUser(squidId, 5 * 60 * 1000); // Last 5 minutes
    if (recentEvents.length > 10) {
      anomalies.push('rapid_successive_actions');
    }

    // Check for high-value transactions
    if (metadata?.price && metadata.price > 5000) {
      anomalies.push('high_value_transaction');
    }

    // Check for repeated failures
    const recentFailures = recentEvents.filter(event => 
      event.action.result === 'failure' || event.action.type.includes('failed')
    );
    if (recentFailures.length > 3) {
      anomalies.push('repeated_failures');
    }

    // Check for unusual patterns
    if (action === 'marketplace_purchase' && metadata?.paymentMethod === 'unknown') {
      anomalies.push('unusual_payment_method');
    }

    return anomalies;
  }

  checkCompliance(action, metadata) {
    const complianceFlags = [];

    // GDPR compliance checks
    if (action.includes('delete') || action.includes('remove')) {
      complianceFlags.push('data_deletion');
    }

    // Financial compliance checks
    if (action === 'marketplace_purchase' && metadata?.price > 10000) {
      complianceFlags.push('high_value_transaction');
    }

    // Access control compliance
    if (action === 'permission_denied') {
      complianceFlags.push('access_control_event');
    }

    // Audit trail compliance
    if (action.includes('audit') || action.includes('log')) {
      complianceFlags.push('audit_event');
    }

    return complianceFlags;
  }

  async getAuditLogs(filters = {}) {
    await this.simulateDelay(100, 300);

    const {
      squidId,
      action,
      startDate,
      endDate,
      riskScoreMin,
      limit = 100,
      offset = 0
    } = filters;

    let logs = Array.from(this.auditLogs.values());

    // Apply filters
    if (squidId) {
      logs = logs.filter(log => log.actor.squidId === squidId);
    }

    if (action) {
      logs = logs.filter(log => log.action.type === action);
    }

    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }

    if (riskScoreMin !== undefined) {
      logs = logs.filter(log => log.security.riskScore >= riskScoreMin);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedLogs = logs.slice(offset, offset + limit);

    return {
      success: true,
      logs: paginatedLogs,
      pagination: {
        total: logs.length,
        limit,
        offset,
        hasMore: logs.length > offset + limit
      }
    };
  }

  async getSecurityEvents(filters = {}) {
    await this.simulateDelay(100, 200);

    const {
      squidId,
      severity,
      status = 'active',
      limit = 50,
      offset = 0
    } = filters;

    let events = Array.from(this.securityEvents.values());

    // Apply filters
    if (squidId) {
      events = events.filter(event => event.squidId === squidId);
    }

    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    if (status) {
      events = events.filter(event => event.status === status);
    }

    // Sort by creation date (newest first)
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      success: true,
      events: paginatedEvents,
      pagination: {
        total: events.length,
        limit,
        offset,
        hasMore: events.length > offset + limit
      }
    };
  }

  async getRiskScore(squidId) {
    await this.simulateDelay(50, 100);

    const riskData = this.riskScores.get(squidId);
    if (!riskData) {
      return {
        success: false,
        error: 'Risk score not found'
      };
    }

    return {
      success: true,
      squidId,
      riskScore: riskData.riskScore,
      riskLevel: this.classifyRiskLevel(riskData.riskScore),
      lastUpdated: riskData.lastUpdated,
      lastAction: riskData.lastAction
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'mock-qerberos',
      timestamp: new Date().toISOString(),
      auditLogs: this.auditLogs.size,
      securityEvents: this.securityEvents.size,
      riskScores: this.riskScores.size,
      anomalies: this.anomalies.size
    };
  }

  // Helper methods
  inferResourceType(resourceId) {
    if (!resourceId) return 'unknown';
    if (resourceId.startsWith('listing_')) return 'listing';
    if (resourceId.startsWith('purchase_')) return 'purchase';
    if (resourceId.startsWith('license_')) return 'license';
    return 'unknown';
  }

  inferActionResult(action, metadata) {
    if (metadata?.error || action.includes('failed') || action.includes('error')) {
      return 'failure';
    }
    if (action.includes('warning') || action.includes('anomaly')) {
      return 'warning';
    }
    return 'success';
  }

  calculateSeverity(riskScore, anomalyFlags) {
    if (riskScore > 0.8 || anomalyFlags.includes('high_confidence_anomaly')) {
      return 'critical';
    }
    if (riskScore > 0.6 || anomalyFlags.length > 2) {
      return 'high';
    }
    if (riskScore > 0.4 || anomalyFlags.length > 0) {
      return 'medium';
    }
    return 'low';
  }

  classifySecurityEventType(actionType, anomalyFlags) {
    if (actionType.includes('auth')) return 'authentication';
    if (actionType.includes('permission')) return 'authorization';
    if (actionType.includes('purchase') || actionType.includes('payment')) return 'financial';
    if (anomalyFlags.length > 0) return 'anomaly';
    return 'operational';
  }

  generateSecurityDescription(auditEvent) {
    const action = auditEvent.action.type;
    const squidId = auditEvent.actor.squidId;
    const riskScore = auditEvent.security.riskScore;
    const anomalies = auditEvent.security.anomalyFlags;

    let description = `Security event for ${action} by ${squidId}`;
    
    if (riskScore > 0.7) {
      description += ` with high risk score (${riskScore})`;
    }
    
    if (anomalies.length > 0) {
      description += ` with anomalies: ${anomalies.join(', ')}`;
    }

    return description;
  }

  determineAutomaticActions(riskScore) {
    const actions = [];
    
    if (riskScore > 0.8) {
      actions.push('temporary_account_restriction');
    }
    
    if (riskScore > 0.6) {
      actions.push('enhanced_monitoring');
    }
    
    if (riskScore > 0.4) {
      actions.push('rate_limit_applied');
    }

    return actions;
  }

  classifyRiskLevel(riskScore) {
    if (riskScore > 0.8) return 'critical';
    if (riskScore > 0.6) return 'high';
    if (riskScore > 0.4) return 'medium';
    if (riskScore > 0.2) return 'low';
    return 'minimal';
  }

  getRecentEventsByUser(squidId, timeWindowMs) {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return Array.from(this.auditLogs.values())
      .filter(log => 
        log.actor.squidId === squidId && 
        new Date(log.timestamp) > cutoffTime
      );
  }

  generateMockIP() {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  async simulateDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Test helper methods
  addTestAuditLog(auditEvent) {
    this.auditLogs.set(auditEvent.eventId, auditEvent);
  }

  addTestSecurityEvent(securityEvent) {
    this.securityEvents.set(securityEvent.securityEventId, securityEvent);
  }

  setTestRiskScore(squidId, riskScore) {
    this.riskScores.set(squidId, {
      squidId,
      riskScore,
      lastUpdated: new Date().toISOString()
    });
  }

  getTestData() {
    return {
      auditLogs: Array.from(this.auditLogs.values()),
      securityEvents: Array.from(this.securityEvents.values()),
      riskScores: Array.from(this.riskScores.values())
    };
  }
}

export default MockQerberosService;