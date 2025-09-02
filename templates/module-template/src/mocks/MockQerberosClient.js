/**
 * Mock Qerberos Client
 * 
 * Mock implementation of Qerberos security/audit service for development and testing
 */

import { v4 as uuidv4 } from 'uuid';

export class MockQerberosClient {
  constructor(options = {}) {
    this.options = options;
    this.auditLogs = [];
    this.alerts = [];
    this.riskScores = new Map();
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event) {
    await this.delay(25);

    const auditEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.auditLogs.push(auditEvent);

    // Simulate risk scoring
    if (event.type === 'SECURITY' || event.verdict === 'DENY') {
      await this.updateRiskScore(event.actor?.squidId, 10);
    }

    // Simulate anomaly detection
    if (this.shouldTriggerAlert(event)) {
      await this.createAlert(event);
    }

    return auditEvent;
  }

  /**
   * Query audit events
   */
  async queryEvents(query = {}) {
    await this.delay(40);

    let events = [...this.auditLogs];

    // Filter by type
    if (query.type) {
      events = events.filter(event => event.type === query.type);
    }

    // Filter by actor
    if (query.actor) {
      events = events.filter(event => 
        event.actor?.squidId === query.actor ||
        event.actor?.squidId === query.actor.squidId
      );
    }

    // Filter by time range
    if (query.timeRange) {
      const { start, end } = query.timeRange;
      events = events.filter(event => {
        const eventTime = new Date(event.timestamp);
        return (!start || eventTime >= new Date(start)) &&
               (!end || eventTime <= new Date(end));
      });
    }

    // Filter by verdict
    if (query.verdict) {
      events = events.filter(event => event.verdict === query.verdict);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total: events.length,
      limit,
      offset
    };
  }

  /**
   * Get risk score for identity
   */
  async getRiskScore(squidId) {
    await this.delay(30);

    const riskScore = this.riskScores.get(squidId) || {
      squidId,
      score: 0,
      level: 'low',
      factors: [],
      lastUpdated: new Date().toISOString()
    };

    return riskScore;
  }

  /**
   * Update risk score
   */
  async updateRiskScore(squidId, delta) {
    if (!squidId) return;

    const current = this.riskScores.get(squidId) || {
      squidId,
      score: 0,
      level: 'low',
      factors: [],
      lastUpdated: new Date().toISOString()
    };

    const newScore = Math.max(0, Math.min(100, current.score + delta));
    const level = newScore < 25 ? 'low' : 
                  newScore < 50 ? 'medium' : 
                  newScore < 75 ? 'high' : 'critical';

    const updated = {
      ...current,
      score: newScore,
      level,
      lastUpdated: new Date().toISOString()
    };

    this.riskScores.set(squidId, updated);

    return updated;
  }

  /**
   * Create security alert
   */
  async createAlert(event) {
    const alert = {
      id: uuidv4(),
      type: 'SECURITY_ALERT',
      severity: this.calculateSeverity(event),
      title: this.generateAlertTitle(event),
      description: this.generateAlertDescription(event),
      event: event,
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    this.alerts.push(alert);

    return alert;
  }

  /**
   * Get alerts
   */
  async getAlerts(query = {}) {
    await this.delay(35);

    let alerts = [...this.alerts];

    // Filter by severity
    if (query.severity) {
      alerts = alerts.filter(alert => alert.severity === query.severity);
    }

    // Filter by status
    if (query.status) {
      alerts = alerts.filter(alert => alert.status === query.status);
    }

    // Sort by created date (newest first)
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      alerts,
      total: alerts.length
    };
  }

  /**
   * Analyze security patterns
   */
  async analyzePatterns(timeWindow = '24h') {
    await this.delay(60);

    const cutoff = new Date();
    if (timeWindow === '24h') {
      cutoff.setHours(cutoff.getHours() - 24);
    } else if (timeWindow === '7d') {
      cutoff.setDate(cutoff.getDate() - 7);
    }

    const recentEvents = this.auditLogs.filter(event => 
      new Date(event.timestamp) >= cutoff
    );

    // Analyze patterns
    const patterns = {
      authenticationFailures: recentEvents.filter(e => 
        e.type === 'AUTHENTICATION' && e.verdict === 'DENY'
      ).length,
      
      authorizationDenials: recentEvents.filter(e => 
        e.type === 'AUTHORIZATION' && e.verdict === 'DENY'
      ).length,
      
      securityEvents: recentEvents.filter(e => 
        e.type === 'SECURITY'
      ).length,
      
      suspiciousActivities: recentEvents.filter(e => 
        e.verdict === 'WARN' || e.verdict === 'DENY'
      ).length,

      topActors: this.getTopActors(recentEvents),
      topResources: this.getTopResources(recentEvents)
    };

    return {
      timeWindow,
      totalEvents: recentEvents.length,
      patterns,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async health() {
    return {
      status: 'healthy',
      version: '1.0.0-mock',
      timestamp: new Date().toISOString(),
      auditLogs: this.auditLogs.length,
      alerts: this.alerts.length,
      riskScores: this.riskScores.size
    };
  }

  /**
   * Helper methods
   */
  shouldTriggerAlert(event) {
    // Simple alert triggers
    return event.type === 'SECURITY' || 
           event.verdict === 'DENY' ||
           (event.type === 'AUTHENTICATION' && event.verdict === 'DENY');
  }

  calculateSeverity(event) {
    if (event.type === 'SECURITY') return 'high';
    if (event.verdict === 'DENY') return 'medium';
    return 'low';
  }

  generateAlertTitle(event) {
    if (event.type === 'AUTHENTICATION' && event.verdict === 'DENY') {
      return 'Authentication Failure Detected';
    }
    if (event.type === 'AUTHORIZATION' && event.verdict === 'DENY') {
      return 'Authorization Denied';
    }
    if (event.type === 'SECURITY') {
      return 'Security Event Detected';
    }
    return 'Security Alert';
  }

  generateAlertDescription(event) {
    return `Security event detected: ${event.type} with verdict ${event.verdict}`;
  }

  getTopActors(events) {
    const actorCounts = {};
    events.forEach(event => {
      const actor = event.actor?.squidId || 'unknown';
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;
    });

    return Object.entries(actorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([actor, count]) => ({ actor, count }));
  }

  getTopResources(events) {
    const resourceCounts = {};
    events.forEach(event => {
      const resource = event.resource?.id || event.resource?.type || 'unknown';
      resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
    });

    return Object.entries(resourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([resource, count]) => ({ resource, count }));
  }

  /**
   * Simulate network delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}