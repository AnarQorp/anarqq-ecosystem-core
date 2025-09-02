/**
 * Validation Alerting Service
 * 
 * Provides automated alerting for validation failures, SLO violations, and system health issues.
 * Integrates with multiple notification channels and implements intelligent alert routing.
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ValidationAlertingService extends EventEmitter {
  constructor(notificationService) {
    super();
    this.notificationService = notificationService;
    this.alertsDir = './artifacts/alerts';
    this.configDir = './config';
    
    this.alerts = new Map();
    this.alertRules = new Map();
    this.suppressions = new Map();
    this.escalationPolicies = new Map();
    
    this.ensureDirectories();
    this.loadConfiguration();
    this.setupDefaultRules();
  }
  
  ensureDirectories() {
    mkdirSync(this.alertsDir, { recursive: true });
    mkdirSync(this.configDir, { recursive: true });
  }
  
  loadConfiguration() {
    try {
      const configPath = join(this.configDir, 'alerting-config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        this.loadAlertRules(config.rules || []);
        this.loadEscalationPolicies(config.escalationPolicies || []);
        this.loadSuppressions(config.suppressions || []);
      }
    } catch (error) {
      console.warn('Failed to load alerting configuration:', error.message);
    }
  }
  
  loadAlertRules(rules) {
    rules.forEach(rule => {
      this.alertRules.set(rule.id, {
        ...rule,
        condition: new Function('metrics', `return ${rule.condition}`),
        createdAt: new Date(rule.createdAt || Date.now())
      });
    });
  }
  
  loadEscalationPolicies(policies) {
    policies.forEach(policy => {
      this.escalationPolicies.set(policy.id, policy);
    });
  }
  
  loadSuppressions(suppressions) {
    suppressions.forEach(suppression => {
      if (new Date(suppression.expiresAt) > new Date()) {
        this.suppressions.set(suppression.id, suppression);
      }
    });
  }
  
  setupDefaultRules() {
    const defaultRules = [
      {
        id: 'critical_system_failure',
        name: 'Critical System Failure',
        condition: 'metrics.health?.overall === "unhealthy"',
        severity: 'critical',
        description: 'System health is critical',
        channels: ['email', 'slack', 'webhook'],
        escalationPolicy: 'immediate',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'performance_degradation',
        name: 'Performance Degradation',
        condition: 'metrics.performance?.p99Latency > 200',
        severity: 'warning',
        description: 'P99 latency exceeded threshold',
        channels: ['slack'],
        escalationPolicy: 'standard',
        cooldown: 900000 // 15 minutes
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'metrics.performance?.errorRate > 10',
        severity: 'critical',
        description: 'Error rate exceeded acceptable threshold',
        channels: ['email', 'slack'],
        escalationPolicy: 'urgent',
        cooldown: 600000 // 10 minutes
      },
      {
        id: 'chain_continuity_failure',
        name: 'Chain Continuity Failure',
        condition: 'metrics.quality?.chainContinuity < 100',
        severity: 'critical',
        description: 'Blockchain chain continuity compromised',
        channels: ['email', 'slack', 'webhook'],
        escalationPolicy: 'immediate',
        cooldown: 0 // No cooldown for critical security issues
      },
      {
        id: 'consensus_failure',
        name: 'Consensus Failure',
        condition: 'metrics.quality?.consensusSuccess < 60',
        severity: 'critical',
        description: 'Consensus mechanism failing',
        channels: ['email', 'slack', 'webhook'],
        escalationPolicy: 'immediate',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'security_violation',
        name: 'Security Violation',
        condition: 'metrics.security?.piiDetected > 0 || metrics.security?.sandboxViolations > 0',
        severity: 'critical',
        description: 'Security policy violation detected',
        channels: ['email', 'slack', 'webhook'],
        escalationPolicy: 'immediate',
        cooldown: 0 // No cooldown for security violations
      },
      {
        id: 'pi_integration_failure',
        name: 'Pi Integration Failure',
        condition: 'metrics.piIntegration?.connected === false',
        severity: 'warning',
        description: 'Pi Network integration is down',
        channels: ['slack'],
        escalationPolicy: 'standard',
        cooldown: 1800000 // 30 minutes
      },
      {
        id: 'demo_scenario_failure',
        name: 'Demo Scenario Failure',
        condition: 'metrics.demo?.failureRate > 20',
        severity: 'warning',
        description: 'Demo scenarios are failing frequently',
        channels: ['slack'],
        escalationPolicy: 'standard',
        cooldown: 3600000 // 1 hour
      }
    ];
    
    defaultRules.forEach(rule => {
      if (!this.alertRules.has(rule.id)) {
        this.alertRules.set(rule.id, {
          ...rule,
          condition: new Function('metrics', `return ${rule.condition}`),
          createdAt: new Date()
        });
      }
    });
    
    // Setup default escalation policies
    this.setupDefaultEscalationPolicies();
  }
  
  setupDefaultEscalationPolicies() {
    const defaultPolicies = [
      {
        id: 'immediate',
        name: 'Immediate Escalation',
        steps: [
          { delay: 0, channels: ['email', 'slack', 'webhook'] },
          { delay: 300000, channels: ['phone'] }, // 5 minutes
          { delay: 900000, channels: ['escalation_email'] } // 15 minutes
        ]
      },
      {
        id: 'urgent',
        name: 'Urgent Escalation',
        steps: [
          { delay: 0, channels: ['slack'] },
          { delay: 600000, channels: ['email'] }, // 10 minutes
          { delay: 1800000, channels: ['phone'] } // 30 minutes
        ]
      },
      {
        id: 'standard',
        name: 'Standard Escalation',
        steps: [
          { delay: 0, channels: ['slack'] },
          { delay: 1800000, channels: ['email'] }, // 30 minutes
          { delay: 7200000, channels: ['escalation_email'] } // 2 hours
        ]
      }
    ];
    
    defaultPolicies.forEach(policy => {
      if (!this.escalationPolicies.has(policy.id)) {
        this.escalationPolicies.set(policy.id, policy);
      }
    });
  }
  
  async evaluateAlerts(metrics) {
    const triggeredAlerts = [];
    
    for (const [ruleId, rule] of this.alertRules) {
      try {
        // Check if alert is suppressed
        if (this.isAlertSuppressed(ruleId)) {
          continue;
        }
        
        // Check cooldown period
        if (this.isInCooldown(ruleId)) {
          continue;
        }
        
        // Evaluate condition
        if (rule.condition(metrics)) {
          const alert = await this.createAlert(rule, metrics);
          triggeredAlerts.push(alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${ruleId}:`, error);
      }
    }
    
    return triggeredAlerts;
  }
  
  async createAlert(rule, metrics) {
    const alertId = `${rule.id}_${Date.now()}`;
    
    const alert = {
      id: alertId,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      description: rule.description,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: this.sanitizeMetrics(metrics),
      channels: rule.channels,
      escalationPolicy: rule.escalationPolicy,
      cooldown: rule.cooldown,
      acknowledgedBy: null,
      resolvedBy: null,
      resolvedAt: null,
      escalationStep: 0,
      nextEscalation: null
    };
    
    // Store alert
    this.alerts.set(alertId, alert);
    
    // Save to disk
    await this.saveAlert(alert);
    
    // Send initial notifications
    await this.sendAlertNotifications(alert);
    
    // Schedule escalation if needed
    this.scheduleEscalation(alert);
    
    // Emit event
    this.emit('alert.created', alert);
    
    console.log(`🚨 Alert created: ${alert.name} (${alert.severity})`);
    
    return alert;
  }
  
  async sendAlertNotifications(alert) {
    const notifications = alert.channels.map(channel => ({
      channel,
      type: 'alert',
      severity: alert.severity,
      title: `${alert.severity.toUpperCase()}: ${alert.name}`,
      message: alert.description,
      details: {
        alertId: alert.id,
        ruleId: alert.ruleId,
        createdAt: alert.createdAt,
        metrics: alert.metrics
      },
      metadata: {
        alerting: true,
        severity: alert.severity,
        escalationPolicy: alert.escalationPolicy
      }
    }));
    
    for (const notification of notifications) {
      try {
        await this.notificationService.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send alert notification via ${notification.channel}:`, error);
      }
    }
  }
  
  scheduleEscalation(alert) {
    const policy = this.escalationPolicies.get(alert.escalationPolicy);
    if (!policy || alert.escalationStep >= policy.steps.length) {
      return;
    }
    
    const nextStep = policy.steps[alert.escalationStep];
    if (nextStep && nextStep.delay > 0) {
      alert.nextEscalation = new Date(Date.now() + nextStep.delay).toISOString();
      
      setTimeout(() => {
        this.escalateAlert(alert.id);
      }, nextStep.delay);
    }
  }
  
  async escalateAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return;
    }
    
    const policy = this.escalationPolicies.get(alert.escalationPolicy);
    if (!policy || alert.escalationStep >= policy.steps.length) {
      return;
    }
    
    const step = policy.steps[alert.escalationStep];
    
    // Send escalation notifications
    const escalationNotifications = step.channels.map(channel => ({
      channel,
      type: 'alert_escalation',
      severity: alert.severity,
      title: `ESCALATED: ${alert.name}`,
      message: `Alert has been escalated (Step ${alert.escalationStep + 1}): ${alert.description}`,
      details: {
        alertId: alert.id,
        escalationStep: alert.escalationStep + 1,
        originalAlert: alert
      }
    }));
    
    for (const notification of escalationNotifications) {
      try {
        await this.notificationService.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send escalation notification via ${notification.channel}:`, error);
      }
    }
    
    // Update alert
    alert.escalationStep++;
    alert.updatedAt = new Date().toISOString();
    
    // Schedule next escalation
    this.scheduleEscalation(alert);
    
    // Save updated alert
    await this.saveAlert(alert);
    
    this.emit('alert.escalated', alert);
    
    console.log(`📈 Alert escalated: ${alert.name} (Step ${alert.escalationStep})`);
  }
  
  async acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      throw new Error('Alert not found or not active');
    }
    
    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = new Date().toISOString();
    
    // Cancel escalation
    alert.nextEscalation = null;
    
    await this.saveAlert(alert);
    
    // Send acknowledgment notification
    await this.notificationService.sendNotification({
      type: 'alert_acknowledged',
      title: `Alert Acknowledged: ${alert.name}`,
      message: `Alert has been acknowledged by ${acknowledgedBy}`,
      details: { alertId, acknowledgedBy },
      channels: ['slack']
    });
    
    this.emit('alert.acknowledged', alert);
    
    console.log(`✅ Alert acknowledged: ${alert.name} by ${acknowledgedBy}`);
    
    return alert;
  }
  
  async resolveAlert(alertId, resolvedBy, resolution) {
    const alert = this.alerts.get(alertId);
    if (!alert || (alert.status !== 'active' && alert.status !== 'acknowledged')) {
      throw new Error('Alert not found or not resolvable');
    }
    
    alert.status = 'resolved';
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date().toISOString();
    alert.resolution = resolution;
    alert.updatedAt = new Date().toISOString();
    
    // Cancel escalation
    alert.nextEscalation = null;
    
    await this.saveAlert(alert);
    
    // Send resolution notification
    await this.notificationService.sendNotification({
      type: 'alert_resolved',
      title: `Alert Resolved: ${alert.name}`,
      message: `Alert has been resolved by ${resolvedBy}: ${resolution}`,
      details: { alertId, resolvedBy, resolution },
      channels: ['slack']
    });
    
    this.emit('alert.resolved', alert);
    
    console.log(`✅ Alert resolved: ${alert.name} by ${resolvedBy}`);
    
    return alert;
  }
  
  async suppressAlert(ruleId, suppressedBy, duration, reason) {
    const suppressionId = `${ruleId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + duration);
    
    const suppression = {
      id: suppressionId,
      ruleId,
      suppressedBy,
      reason,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      active: true
    };
    
    this.suppressions.set(suppressionId, suppression);
    
    // Save suppression
    await this.saveSuppression(suppression);
    
    // Schedule removal
    setTimeout(() => {
      this.suppressions.delete(suppressionId);
    }, duration);
    
    console.log(`🔇 Alert suppressed: ${ruleId} until ${expiresAt.toISOString()}`);
    
    return suppression;
  }
  
  isAlertSuppressed(ruleId) {
    for (const suppression of this.suppressions.values()) {
      if (suppression.ruleId === ruleId && 
          suppression.active && 
          new Date(suppression.expiresAt) > new Date()) {
        return true;
      }
    }
    return false;
  }
  
  isInCooldown(ruleId) {
    // Find the most recent alert for this rule
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.ruleId === ruleId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (recentAlerts.length === 0) {
      return false;
    }
    
    const lastAlert = recentAlerts[0];
    const rule = this.alertRules.get(ruleId);
    
    if (!rule || !rule.cooldown) {
      return false;
    }
    
    const cooldownEnd = new Date(new Date(lastAlert.createdAt).getTime() + rule.cooldown);
    return new Date() < cooldownEnd;
  }
  
  sanitizeMetrics(metrics) {
    // Remove sensitive information from metrics before storing
    const sanitized = JSON.parse(JSON.stringify(metrics));
    
    // Remove any potential PII or sensitive data
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
    
    function removeSensitiveData(obj) {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      for (const key in obj) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          removeSensitiveData(obj[key]);
        }
      }
      
      return obj;
    }
    
    return removeSensitiveData(sanitized);
  }
  
  async saveAlert(alert) {
    const alertPath = join(this.alertsDir, `alert-${alert.id}.json`);
    writeFileSync(alertPath, JSON.stringify(alert, null, 2));
  }
  
  async saveSuppression(suppression) {
    const suppressionPath = join(this.alertsDir, `suppression-${suppression.id}.json`);
    writeFileSync(suppressionPath, JSON.stringify(suppression, null, 2));
  }
  
  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active' || alert.status === 'acknowledged')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  getRecentAlerts(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return Array.from(this.alerts.values())
      .filter(alert => new Date(alert.createdAt) > cutoff)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  getAlertStatistics(hours = 24) {
    const recentAlerts = this.getRecentAlerts(hours);
    
    const stats = {
      total: recentAlerts.length,
      active: recentAlerts.filter(a => a.status === 'active').length,
      acknowledged: recentAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: recentAlerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        warning: recentAlerts.filter(a => a.severity === 'warning').length,
        info: recentAlerts.filter(a => a.severity === 'info').length
      },
      byRule: {}
    };
    
    // Count by rule
    recentAlerts.forEach(alert => {
      stats.byRule[alert.ruleId] = (stats.byRule[alert.ruleId] || 0) + 1;
    });
    
    return stats;
  }
  
  async generateAlertReport() {
    const stats = this.getAlertStatistics(24);
    const activeAlerts = this.getActiveAlerts();
    const recentAlerts = this.getRecentAlerts(24);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: stats,
      activeAlerts: activeAlerts.map(alert => ({
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        status: alert.status,
        createdAt: alert.createdAt,
        escalationStep: alert.escalationStep
      })),
      topAlertRules: Object.entries(stats.byRule)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ruleId, count]) => ({ ruleId, count })),
      recommendations: this.generateAlertRecommendations(stats, recentAlerts)
    };
    
    const reportPath = join(this.alertsDir, `alert-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Alert report generated: ${reportPath}`);
    
    return report;
  }
  
  generateAlertRecommendations(stats, recentAlerts) {
    const recommendations = [];
    
    // High alert volume
    if (stats.total > 50) {
      recommendations.push({
        type: 'alert_fatigue',
        priority: 'medium',
        message: 'High alert volume detected. Consider reviewing alert thresholds.',
        action: 'Review and adjust alert sensitivity'
      });
    }
    
    // Too many critical alerts
    if (stats.bySeverity.critical > 10) {
      recommendations.push({
        type: 'critical_alerts',
        priority: 'high',
        message: 'High number of critical alerts. System may need attention.',
        action: 'Investigate root causes of critical alerts'
      });
    }
    
    // Unacknowledged alerts
    if (stats.active > 5) {
      recommendations.push({
        type: 'unacknowledged_alerts',
        priority: 'medium',
        message: 'Multiple unacknowledged alerts. Review on-call procedures.',
        action: 'Ensure alerts are being acknowledged promptly'
      });
    }
    
    // Frequent rule triggers
    const frequentRules = Object.entries(stats.byRule)
      .filter(([, count]) => count > 10);
    
    if (frequentRules.length > 0) {
      recommendations.push({
        type: 'frequent_rules',
        priority: 'medium',
        message: 'Some alert rules are triggering frequently.',
        action: `Review rules: ${frequentRules.map(([rule]) => rule).join(', ')}`
      });
    }
    
    return recommendations;
  }
}

export default ValidationAlertingService;