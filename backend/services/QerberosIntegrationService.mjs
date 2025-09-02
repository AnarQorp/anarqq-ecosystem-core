/**
 * Qerberos Integration Service
 * 
 * Handles integration with Qerberos security module for suspicious activity reporting,
 * risk assessment, and automated security responses
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { qerberosIntegration } from '../config/rateLimiting.mjs';

export class QerberosIntegrationService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      ...qerberosIntegration,
      ...config
    };
    
    // Queue for batching events
    this.eventQueue = [];
    this.batchSize = 10;
    this.batchTimeout = 5000; // 5 seconds
    
    // Storage for abuse detection
    this.usageStore = new Map();
    this.behaviorPatternStore = new Map();
    
    // Setup batch processing
    this.setupBatchProcessing();
  }

  /**
   * Report suspicious activity to Qerberos
   */
  async reportSuspiciousActivity(event) {
    if (!this.config.enabled) {
      console.log('Qerberos integration disabled, skipping event:', event.type);
      return;
    }

    try {
      const qerberosEvent = this.formatEventForQerberos(event);
      
      // Add to queue for batch processing
      this.eventQueue.push(qerberosEvent);
      
      // If high priority, send immediately
      if (this.isHighPriority(event)) {
        await this.flushEventQueue();
      }
      
      this.emit('eventQueued', qerberosEvent);
      
    } catch (error) {
      console.error('Failed to report suspicious activity to Qerberos:', error);
      this.emit('error', error);
    }
  }

  /**
   * Assess risk for a request context (includes abuse detection)
   */
  async assessRisk(context) {
    if (!this.config.enabled) {
      return { riskScore: 0, level: 'LOW', factors: [], blocked: false };
    }

    try {
      // Perform local abuse detection first (fast path)
      const abuseCheck = await this.detectAbusePatterns(context);
      
      // If high-confidence abuse detected, block immediately
      if (abuseCheck.suspicious && abuseCheck.riskScore > 0.8) {
        await this.reportSuspiciousActivity({
          type: 'ABUSE_DETECTED',
          actor: {
            squidId: context.squidId,
            subId: context.subId,
            daoId: context.daoId,
            ip: context.ip,
            userAgent: context.userAgent
          },
          details: abuseCheck,
          severity: this.getSeverityLevel(abuseCheck.riskScore)
        });
        
        return {
          riskScore: abuseCheck.riskScore,
          level: this.getRiskLevel(abuseCheck.riskScore),
          factors: abuseCheck.patterns,
          blocked: true,
          reason: 'ABUSE_PATTERNS_DETECTED'
        };
      }

      // For lower-confidence cases, query Qerberos service if available
      const response = await this.makeQerberosRequest('/api/risk-assessment', {
        method: 'POST',
        body: JSON.stringify({
          context: {
            timestamp: Date.now(),
            ...context
          },
          localAssessment: abuseCheck
        })
      });

      const qerberosAssessment = response.data || { riskScore: 0, level: 'LOW', factors: [], blocked: false };
      
      // Combine local and remote assessments
      const combinedRiskScore = Math.max(abuseCheck.riskScore || 0, qerberosAssessment.riskScore || 0);
      
      return {
        riskScore: combinedRiskScore,
        level: this.getRiskLevel(combinedRiskScore),
        factors: [...(abuseCheck.patterns || []), ...(qerberosAssessment.factors || [])],
        blocked: qerberosAssessment.blocked || false,
        reason: qerberosAssessment.reason
      };
      
    } catch (error) {
      console.error('Failed to assess risk with Qerberos:', error);
      
      // Fall back to local assessment only
      const abuseCheck = await this.detectAbusePatterns(context);
      return {
        riskScore: abuseCheck.riskScore || 0,
        level: this.getRiskLevel(abuseCheck.riskScore || 0),
        factors: abuseCheck.patterns || [],
        blocked: abuseCheck.suspicious && abuseCheck.riskScore > 0.7, // Higher threshold for local-only
        error: error.message
      };
    }
  }

  /**
   * Get risk score from Qerberos for an identity (legacy method)
   */
  async getRiskScore(squidId, context = {}) {
    const assessment = await this.assessRisk({ squidId, ...context });
    return {
      riskScore: assessment.riskScore,
      level: assessment.level,
      factors: assessment.factors
    };
  }

  /**
   * Check if identity is blocked by Qerberos
   */
  async isIdentityBlocked(squidId) {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await this.makeQerberosRequest(`/api/identity/${squidId}/status`);
      return response.data?.blocked === true;
      
    } catch (error) {
      console.error('Failed to check identity status in Qerberos:', error);
      // Fail open - don't block if service is unavailable
      return false;
    }
  }

  /**
   * Report rate limiting event to Qerberos
   */
  async reportRateLimitEvent(event) {
    const qerberosEvent = {
      type: 'RATE_LIMIT_EVENT',
      timestamp: Date.now(),
      actor: event.actor,
      details: {
        reason: event.reason,
        endpoint: event.endpoint,
        limits: event.limits,
        usage: event.usage
      },
      severity: this.getSeverityForRateLimit(event.reason),
      source: 'rate-limiting-service'
    };

    await this.reportSuspiciousActivity(qerberosEvent);
  }

  /**
   * Report circuit breaker event to Qerberos
   */
  async reportCircuitBreakerEvent(event) {
    const qerberosEvent = {
      type: 'CIRCUIT_BREAKER_EVENT',
      timestamp: Date.now(),
      details: {
        endpoint: event.endpoint,
        state: event.state,
        failures: event.failures,
        lastFailure: event.lastFailure
      },
      severity: event.state === 'OPEN' ? 'HIGH' : 'MEDIUM',
      source: 'rate-limiting-service'
    };

    await this.reportSuspiciousActivity(qerberosEvent);
  }

  /**
   * Report cost control event to Qerberos
   */
  async reportCostControlEvent(event) {
    const qerberosEvent = {
      type: 'COST_CONTROL_EVENT',
      timestamp: Date.now(),
      details: {
        type: event.type,
        minuteUtilization: event.minuteUtilization,
        hourUtilization: event.hourUtilization,
        limits: event.limits
      },
      severity: event.type === 'EMERGENCY_STOP' ? 'CRITICAL' : 'HIGH',
      source: 'rate-limiting-service'
    };

    await this.reportSuspiciousActivity(qerberosEvent);
  }

  /**
   * Format event for Qerberos consumption
   */
  formatEventForQerberos(event) {
    return {
      id: this.generateEventId(),
      type: event.type,
      timestamp: event.timestamp || Date.now(),
      actor: event.actor || {},
      details: event.details || {},
      severity: event.severity || 'MEDIUM',
      source: event.source || 'rate-limiting-service',
      metadata: {
        version: '1.0',
        schema: 'qerberos-security-event-v1'
      }
    };
  }

  /**
   * Make HTTP request to Qerberos service
   */
  async makeQerberosRequest(path, options = {}) {
    const url = `${this.config.endpoint}${path}`;
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'rate-limiting-service/1.0',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      timeout: this.config.timeout,
      ...options
    };

    // Use fetch or a similar HTTP client
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`Qerberos request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Setup batch processing for events
   */
  setupBatchProcessing() {
    // Skip batch processing in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    // Process queue every batchTimeout milliseconds
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEventQueue();
      }
    }, this.batchTimeout);
  }

  /**
   * Flush event queue to Qerberos
   */
  async flushEventQueue() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = this.eventQueue.splice(0, this.batchSize);
    
    try {
      await this.sendEventBatch(events);
      this.emit('batchSent', { count: events.length });
      
    } catch (error) {
      console.error('Failed to send event batch to Qerberos:', error);
      
      // Re-queue events for retry (with limit to prevent infinite growth)
      if (this.eventQueue.length < 1000) {
        this.eventQueue.unshift(...events);
      }
      
      this.emit('batchError', { error, events });
    }
  }

  /**
   * Send batch of events to Qerberos
   */
  async sendEventBatch(events) {
    if (!this.config.enabled || events.length === 0) {
      return;
    }

    const batch = {
      events,
      timestamp: Date.now(),
      source: 'rate-limiting-service',
      batchId: this.generateBatchId()
    };

    await this.makeQerberosRequest('/api/events/batch', {
      method: 'POST',
      body: JSON.stringify(batch)
    });
  }

  /**
   * Check if event is high priority and should be sent immediately
   */
  isHighPriority(event) {
    const highPriorityTypes = [
      'SUSPICIOUS_ACTIVITY',
      'ABUSE_DETECTED',
      'COST_CONTROL_EVENT'
    ];
    
    const highPrioritySeverities = ['HIGH', 'CRITICAL'];
    
    return highPriorityTypes.includes(event.type) || 
           highPrioritySeverities.includes(event.severity);
  }

  /**
   * Get severity level for rate limit events
   */
  getSeverityForRateLimit(reason) {
    switch (reason) {
      case 'ABUSE_DETECTED':
        return 'HIGH';
      case 'COST_LIMIT_EXCEEDED':
        return 'HIGH';
      case 'CIRCUIT_BREAKER_OPEN':
        return 'MEDIUM';
      case 'RATE_LIMIT_EXCEEDED':
        return 'LOW';
      default:
        return 'LOW';
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `rl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    if (!this.config.enabled) {
      return {
        status: 'disabled',
        queueSize: this.eventQueue.length
      };
    }

    try {
      const response = await this.makeQerberosRequest('/health');
      return {
        status: 'healthy',
        qerberosStatus: response.status,
        queueSize: this.eventQueue.length,
        lastCheck: Date.now()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        queueSize: this.eventQueue.length,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * Get integration statistics
   */
  getStatistics() {
    return {
      enabled: this.config.enabled,
      queueSize: this.eventQueue.length,
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout,
      endpoint: this.config.endpoint
    };
  }

  /**
   * Clear event queue (for testing)
   */
  clearQueue() {
    this.eventQueue = [];
  }

  /**
   * Detect abuse patterns and suspicious behavior
   */
  async detectAbusePatterns(context) {
    const patterns = [];
    
    // 1. Rapid fire detection
    const rapidFireCheck = await this.checkRapidFire(context);
    if (rapidFireCheck.detected) {
      patterns.push('RAPID_FIRE');
    }
    
    // 2. Pattern similarity detection
    const similarityCheck = await this.checkPatternSimilarity(context);
    if (similarityCheck.detected) {
      patterns.push('PATTERN_SIMILARITY');
    }
    
    // 3. Suspicious user agent detection
    const userAgentCheck = this.checkSuspiciousUserAgent(context.userAgent);
    if (userAgentCheck.detected) {
      patterns.push('SUSPICIOUS_USER_AGENT');
    }
    
    // 4. High failure rate detection
    const failureRateCheck = await this.checkFailureRate(context);
    if (failureRateCheck.detected) {
      patterns.push('HIGH_FAILURE_RATE');
    }
    
    const suspicious = patterns.length > 0;
    const riskScore = this.calculateRiskScore(patterns);
    
    return {
      suspicious,
      patterns,
      riskScore,
      details: {
        rapidFire: rapidFireCheck,
        similarity: similarityCheck,
        userAgent: userAgentCheck,
        failureRate: failureRateCheck
      }
    };
  }

  /**
   * Check for rapid fire requests
   */
  async checkRapidFire(context) {
    const key = `rapidfire:${context.squidId || context.ip}`;
    const window = 60000; // 1 minute
    const usage = await this.getUsage(key, window);
    
    const detected = usage.count > 100; // Default threshold
    
    return {
      detected,
      requestCount: usage.count,
      threshold: 100,
      window: window
    };
  }

  /**
   * Check for pattern similarity (repeated identical requests)
   */
  async checkPatternSimilarity(context) {
    const identifier = context.squidId || context.ip;
    const key = `patterns:${identifier}`;
    
    // Create request fingerprint
    const fingerprint = this.createRequestFingerprint(context);
    
    // Get recent patterns
    const patterns = this.behaviorPatternStore.get(key) || [];
    const now = Date.now();
    
    // Clean old patterns (last hour)
    const recentPatterns = patterns.filter(p => now - p.timestamp < 3600000);
    
    // Check similarity
    const similarPatterns = recentPatterns.filter(p => 
      this.calculateSimilarity(p.fingerprint, fingerprint) > 0.8
    );
    
    const detected = similarPatterns.length > 10; // More than 10 similar requests
    
    // Store current pattern
    recentPatterns.push({ fingerprint, timestamp: now });
    this.behaviorPatternStore.set(key, recentPatterns.slice(-50)); // Keep last 50
    
    return {
      detected,
      similarCount: similarPatterns.length,
      threshold: 0.8
    };
  }

  /**
   * Check for suspicious user agents
   */
  checkSuspiciousUserAgent(userAgent) {
    if (!userAgent) {
      return { detected: false };
    }
    
    const suspiciousPatterns = ['bot', 'crawler', 'scraper'];
    const suspicious = suspiciousPatterns.some(pattern =>
      userAgent.toLowerCase().includes(pattern)
    );
    
    return {
      detected: suspicious,
      userAgent,
      matchedPatterns: suspiciousPatterns.filter(pattern =>
        userAgent.toLowerCase().includes(pattern)
      )
    };
  }

  /**
   * Check failure rate for potential attacks
   */
  async checkFailureRate(context) {
    const identifier = context.squidId || context.ip;
    const key = `failures:${identifier}`;
    
    const stats = this.usageStore.get(key) || { total: 0, failures: 0, window: Date.now() };
    const now = Date.now();
    
    // Reset if window expired (1 hour)
    if (now - stats.window > 3600000) {
      stats.total = 0;
      stats.failures = 0;
      stats.window = now;
    }
    
    const failureRate = stats.total > 0 ? stats.failures / stats.total : 0;
    const detected = stats.total > 10 && failureRate > 0.5;
    
    return {
      detected,
      failureRate,
      totalRequests: stats.total,
      failures: stats.failures,
      threshold: 0.5
    };
  }

  /**
   * Get usage statistics for a key within a time window
   */
  async getUsage(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const usage = this.usageStore.get(key) || { count: 0, timestamps: [], resetTime: now + windowMs };
    
    // Clean old timestamps
    usage.timestamps = usage.timestamps.filter(ts => ts > windowStart);
    usage.count = usage.timestamps.length;
    
    // Update reset time if needed
    if (usage.resetTime <= now) {
      usage.resetTime = now + windowMs;
    }
    
    this.usageStore.set(key, usage);
    
    return usage;
  }

  /**
   * Create request fingerprint for pattern detection
   */
  createRequestFingerprint(context) {
    const data = {
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent,
      // Add other relevant fields but exclude timestamps and unique IDs
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Calculate similarity between two fingerprints
   */
  calculateSimilarity(fp1, fp2) {
    // Simple exact match for now - could be enhanced with fuzzy matching
    return fp1 === fp2 ? 1.0 : 0.0;
  }

  /**
   * Calculate risk score based on detected patterns
   */
  calculateRiskScore(patterns) {
    const scores = {
      'RAPID_FIRE': 0.3,
      'PATTERN_SIMILARITY': 0.4,
      'SUSPICIOUS_USER_AGENT': 0.2,
      'HIGH_FAILURE_RATE': 0.5
    };
    
    return patterns.reduce((total, pattern) => total + (scores[pattern] || 0), 0);
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.5) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get severity level based on risk score
   */
  getSeverityLevel(riskScore) {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.5) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get severity level based on rate limit reason
   */
  getSeverityForRateLimit(reason) {
    switch (reason) {
      case 'ABUSE_DETECTED':
        return 'HIGH';
      case 'COST_LIMIT_EXCEEDED':
        return 'HIGH';
      case 'CIRCUIT_BREAKER_OPEN':
        return 'MEDIUM';
      case 'RATE_LIMIT_EXCEEDED':
        return 'LOW';
      default:
        return 'LOW';
    }
  }
}

// Global instance
let qerberosService = null;

/**
 * Get or create Qerberos integration service instance
 */
export function getQerberosService(config) {
  if (!qerberosService) {
    qerberosService = new QerberosIntegrationService(config);
  }
  return qerberosService;
}

/**
 * Initialize Qerberos integration service
 */
export function initializeQerberosIntegration(config) {
  qerberosService = new QerberosIntegrationService(config);
  return qerberosService;
}

export default QerberosIntegrationService;