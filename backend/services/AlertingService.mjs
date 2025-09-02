import { EventEmitter } from 'events';

/**
 * AlertingService - Automated alerting and runbook integration
 * Handles SLO violations, dependency failures, and automated responses
 */
class AlertingService extends EventEmitter {
  constructor(observabilityService, tracingService) {
    super();
    this.observabilityService = observabilityService;
    this.tracingService = tracingService;
    this.alertRules = new Map();
    this.runbooks = new Map();
    this.alertHistory = [];
    this.maxAlertHistory = 1000;
    this.alertCooldowns = new Map();
    
    // Initialize default alert rules
    this.initializeDefaultRules();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize default alerting rules
   */
  initializeDefaultRules() {
    // SLO violation rules
    this.addAlertRule('slo-latency-p99', {
      condition: (data) => data.type === 'latency' && data.metric === 'p99',
      severity: 'warning',
      cooldown: 300000, // 5 minutes
      runbook: 'latency-investigation',
      channels: ['slack', 'email'],
      escalation: {
        after: 900000, // 15 minutes
        to: 'critical'
      }
    });

    this.addAlertRule('slo-error-rate', {
      condition: (data) => data.type === 'error-rate',
      severity: 'critical',
      cooldown: 60000, // 1 minute
      runbook: 'error-rate-investigation',
      channels: ['slack', 'email', 'pagerduty'],
      escalation: {
        after: 300000, // 5 minutes
        to: 'incident'
      }
    });

    // Dependency failure rules
    this.addAlertRule('critical-dependency-down', {
      condition: (data) => data.name && data.error,
      severity: 'critical',
      cooldown: 120000, // 2 minutes
      runbook: 'dependency-recovery',
      channels: ['slack', 'pagerduty'],
      autoRemediation: true
    });

    // System resource rules
    this.addAlertRule('high-memory-usage', {
      condition: (data) => {
        const memUsage = data.metrics?.memoryUsage;
        if (!memUsage) return false;
        const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        return usagePercent > 85;
      },
      severity: 'warning',
      cooldown: 600000, // 10 minutes
      runbook: 'memory-optimization',
      channels: ['slack']
    });

    // Request volume rules
    this.addAlertRule('high-request-volume', {
      condition: (data) => {
        const rps = data.metrics?.currentRPS || 0;
        return rps > 500; // Threshold for high volume
      },
      severity: 'info',
      cooldown: 300000, // 5 minutes
      runbook: 'scaling-procedures',
      channels: ['slack']
    });
  }

  /**
   * Set up event listeners for observability events
   */
  setupEventListeners() {
    // Listen for SLO violations
    this.observabilityService.on('slo-violation', (data) => {
      this.processAlert('slo-violation', data);
    });

    // Listen for critical dependency failures
    this.observabilityService.on('critical-dependency-down', (data) => {
      this.processAlert('critical-dependency-down', data);
    });

    // Listen for general errors
    this.observabilityService.on('error', (data) => {
      this.processAlert('error', data);
    });

    // Listen for dependency health changes
    this.observabilityService.on('dependency-health', (data) => {
      if (data.status === 'down') {
        this.processAlert('dependency-down', data);
      }
    });

    // Periodic system checks
    setInterval(() => {
      this.checkSystemMetrics();
    }, 60000); // Check every minute
  }

  /**
   * Add a new alert rule
   */
  addAlertRule(name, rule) {
    this.alertRules.set(name, {
      name,
      ...rule,
      created: Date.now(),
      triggered: 0,
      lastTriggered: null
    });
  }

  /**
   * Add a runbook
   */
  addRunbook(name, runbook) {
    this.runbooks.set(name, {
      name,
      ...runbook,
      created: Date.now(),
      executed: 0,
      lastExecuted: null
    });
  }

  /**
   * Process an alert based on rules
   */
  async processAlert(type, data) {
    const matchingRules = this.findMatchingRules(type, data);
    
    for (const rule of matchingRules) {
      // Check cooldown
      if (this.isInCooldown(rule.name)) {
        continue;
      }

      // Create alert
      const alert = this.createAlert(rule, type, data);
      
      // Add to history
      this.addToHistory(alert);
      
      // Set cooldown before processing to prevent duplicates
      this.setCooldown(rule.name, rule.cooldown);
      
      // Send notifications
      await this.sendNotifications(alert);
      
      // Execute runbook if specified
      if (rule.runbook) {
        await this.executeRunbook(rule.runbook, alert);
      }
      
      // Update rule statistics
      rule.triggered++;
      rule.lastTriggered = Date.now();
      
      // Emit alert event
      this.emit('alert-triggered', alert);
    }
  }

  /**
   * Find matching alert rules for given type and data
   */
  findMatchingRules(type, data) {
    const matchingRules = [];
    
    for (const rule of this.alertRules.values()) {
      try {
        if (rule.condition(data)) {
          matchingRules.push(rule);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
    
    return matchingRules;
  }

  /**
   * Check if a rule is in cooldown period
   */
  isInCooldown(ruleName) {
    const cooldownEnd = this.alertCooldowns.get(ruleName);
    return cooldownEnd && Date.now() < cooldownEnd;
  }

  /**
   * Set cooldown for a rule
   */
  setCooldown(ruleName, duration) {
    this.alertCooldowns.set(ruleName, Date.now() + duration);
  }

  /**
   * Create an alert object
   */
  createAlert(rule, type, data) {
    return {
      id: this.generateAlertId(),
      rule: rule.name,
      type,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, type, data),
      description: this.generateAlertDescription(rule, type, data),
      data,
      timestamp: new Date().toISOString(),
      status: 'active',
      channels: rule.channels || [],
      runbook: rule.runbook,
      escalation: rule.escalation,
      context: {
        traceId: this.tracingService.getCurrentContext()?.traceId,
        service: process.env.SERVICE_NAME || 'anarq-backend',
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert title
   */
  generateAlertTitle(rule, type, data) {
    switch (type) {
      case 'slo-violation':
        return `SLO Violation: ${data.metric} exceeded target (${data.value} > ${data.target})`;
      case 'critical-dependency-down':
        return `Critical Dependency Down: ${data.name}`;
      case 'dependency-down':
        return `Dependency Health Issue: ${data.name}`;
      case 'error':
        return `Application Error: ${data.error?.name || 'Unknown Error'}`;
      default:
        return `Alert: ${rule.name}`;
    }
  }

  /**
   * Generate alert description
   */
  generateAlertDescription(rule, type, data) {
    let description = `Alert triggered by rule: ${rule.name}\n`;
    description += `Type: ${type}\n`;
    description += `Timestamp: ${new Date().toISOString()}\n\n`;
    
    if (data.message) {
      description += `Message: ${data.message}\n`;
    }
    
    if (data.error) {
      description += `Error: ${data.error.message}\n`;
    }
    
    if (rule.runbook) {
      description += `\nRunbook: ${rule.runbook}\n`;
    }
    
    return description;
  }

  /**
   * Send notifications through configured channels
   */
  async sendNotifications(alert) {
    const promises = alert.channels.map(channel => 
      this.sendToChannel(channel, alert)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, alert) {
    try {
      switch (channel) {
        case 'slack':
          await this.sendToSlack(alert);
          break;
        case 'email':
          await this.sendToEmail(alert);
          break;
        case 'pagerduty':
          await this.sendToPagerDuty(alert);
          break;
        case 'webhook':
          await this.sendToWebhook(alert);
          break;
        default:
          console.log(`Alert sent to ${channel}:`, alert.title);
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel}:`, error);
    }
  }

  /**
   * Send alert to Slack (mock implementation)
   */
  async sendToSlack(alert) {
    // Mock Slack integration
    console.log(`📢 SLACK ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`Description: ${alert.description}`);
    
    // In a real implementation, you would use Slack API
    // const slackClient = new SlackClient(process.env.SLACK_TOKEN);
    // await slackClient.sendMessage(alert);
  }

  /**
   * Send alert to email (mock implementation)
   */
  async sendToEmail(alert) {
    // Mock email integration
    console.log(`📧 EMAIL ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    
    // In a real implementation, you would use an email service
    // const emailService = new EmailService();
    // await emailService.sendAlert(alert);
  }

  /**
   * Send alert to PagerDuty (mock implementation)
   */
  async sendToPagerDuty(alert) {
    // Mock PagerDuty integration
    console.log(`🚨 PAGERDUTY ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    
    // In a real implementation, you would use PagerDuty API
    // const pagerDuty = new PagerDutyClient(process.env.PAGERDUTY_TOKEN);
    // await pagerDuty.createIncident(alert);
  }

  /**
   * Send alert to webhook (mock implementation)
   */
  async sendToWebhook(alert) {
    // Mock webhook integration
    console.log(`🔗 WEBHOOK ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    
    // In a real implementation, you would POST to webhook URL
    // await fetch(process.env.WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(alert)
    // });
  }

  /**
   * Execute a runbook
   */
  async executeRunbook(runbookName, alert) {
    const runbook = this.runbooks.get(runbookName);
    if (!runbook) {
      console.warn(`Runbook not found: ${runbookName}`);
      return;
    }

    try {
      console.log(`📖 Executing runbook: ${runbookName}`);
      
      // Update runbook statistics
      runbook.executed++;
      runbook.lastExecuted = Date.now();
      
      // Execute runbook steps
      if (runbook.steps) {
        for (const step of runbook.steps) {
          await this.executeRunbookStep(step, alert);
        }
      }
      
      // Emit runbook execution event
      this.emit('runbook-executed', {
        runbook: runbookName,
        alert: alert.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Failed to execute runbook ${runbookName}:`, error);
      this.emit('runbook-failed', {
        runbook: runbookName,
        alert: alert.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Execute a single runbook step
   */
  async executeRunbookStep(step, alert) {
    console.log(`  📋 Executing step: ${step.name}`);
    
    switch (step.type) {
      case 'log':
        console.log(`    ${step.message}`);
        break;
      case 'metric-check':
        await this.checkMetrics(step.metrics);
        break;
      case 'restart-service':
        await this.restartService(step.service);
        break;
      case 'scale-up':
        await this.scaleService(step.service, step.instances);
        break;
      case 'notify':
        await this.sendNotification(step.channel, step.message);
        break;
      default:
        console.log(`    Unknown step type: ${step.type}`);
    }
  }

  /**
   * Check system metrics periodically
   */
  checkSystemMetrics() {
    const metrics = this.observabilityService.getMetrics();
    
    // Check for high memory usage
    const memUsage = metrics.metrics.memoryUsage;
    if (memUsage && typeof memUsage === 'object') {
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (usagePercent > 85) {
        this.processAlert('high-memory-usage', { metrics: metrics.metrics });
      }
    }
    
    // Check for high error rate
    const errorRate = metrics.metrics.errorRate;
    if (errorRate > 5) { // 5% error rate threshold
      this.processAlert('high-error-rate', { metrics: metrics.metrics });
    }
  }

  /**
   * Add alert to history
   */
  addToHistory(alert) {
    this.alertHistory.unshift(alert);
    
    // Trim history if too long
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(0, this.maxAlertHistory);
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last1h = now - (60 * 60 * 1000);
    
    const recent24h = this.alertHistory.filter(a => 
      new Date(a.timestamp).getTime() > last24h
    );
    
    const recent1h = this.alertHistory.filter(a => 
      new Date(a.timestamp).getTime() > last1h
    );
    
    const bySeverity = {};
    recent24h.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    });
    
    return {
      total: this.alertHistory.length,
      last24h: recent24h.length,
      last1h: recent1h.length,
      bySeverity,
      rules: {
        total: this.alertRules.size,
        active: Array.from(this.alertRules.values()).filter(r => r.triggered > 0).length
      },
      runbooks: {
        total: this.runbooks.size,
        executed: Array.from(this.runbooks.values()).filter(r => r.executed > 0).length
      }
    };
  }

  /**
   * Mock runbook step implementations
   */
  async checkMetrics(metrics) {
    console.log(`    Checking metrics: ${metrics.join(', ')}`);
  }

  async restartService(service) {
    console.log(`    Restarting service: ${service}`);
  }

  async scaleService(service, instances) {
    console.log(`    Scaling service ${service} to ${instances} instances`);
  }

  async sendNotification(channel, message) {
    console.log(`    Sending notification to ${channel}: ${message}`);
  }
}

export default AlertingService;