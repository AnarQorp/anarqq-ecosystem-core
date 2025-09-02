/**
 * Comprehensive Rate Limiting and Anti-Abuse Protection Service
 * 
 * Implements multi-layer rate limiting with adaptive behavior based on:
 * - Identity reputation and behavior patterns
 * - Multi-layer protection (identity, subidentity, DAO-based limits)
 * - Automated defense mechanisms and circuit breaker integration
 * - Qerberos integration for suspicious activity signaling
 * - Cost control mechanisms for serverless deployments
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class RateLimitingService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Qerberos service for risk assessment
    this.qerberosService = options.qerberosService || null;
    
    this.config = {
      // Base rate limits (requests per time window)
      baseLimits: {
        identity: { requests: 1000, window: 3600000 }, // 1000/hour
        subidentity: { requests: 100, window: 3600000 }, // 100/hour
        dao: { requests: 5000, window: 3600000 }, // 5000/hour
        anonymous: { requests: 10, window: 3600000 } // 10/hour
      },
      
      // Reputation multipliers
      reputationMultipliers: {
        excellent: 2.0,   // 100+ reputation
        good: 1.5,        // 50-99 reputation
        neutral: 1.0,     // 0-49 reputation
        poor: 0.5,        // -50 to -1 reputation
        blocked: 0.0      // < -50 reputation
      },
      
      // Circuit breaker settings
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringWindow: 60000,
        halfOpenMaxCalls: 3
      },
      
      // Cost control settings
      costControl: {
        maxInvocationsPerMinute: 1000,
        maxInvocationsPerHour: 50000,
        budgetAlertThreshold: 0.8,
        emergencyStopThreshold: 0.95
      },
      
      // Abuse detection patterns
      abusePatterns: {
        rapidFireThreshold: 100, // requests per minute
        patternSimilarityThreshold: 0.8,
        suspiciousUserAgents: ['bot', 'crawler', 'scraper'],
        maxFailureRate: 0.5
      },
      
      // Test mode - disables abuse detection
      testMode: process.env.NODE_ENV === 'test',
      
      ...options
    };
    
    // In-memory stores (in production, use Redis or similar)
    this.rateLimitStore = new Map();
    this.reputationStore = new Map();
    this.circuitBreakerStore = new Map();
    this.behaviorPatternStore = new Map();
    this.costTrackingStore = new Map();
    
    // Initialize cleanup intervals
    this.setupCleanupIntervals();
  }

  /**
   * Check if request should be allowed based on comprehensive rate limiting
   */
  async checkRateLimit(context) {
    const {
      squidId,
      subId,
      daoId,
      endpoint,
      userAgent,
      ip,
      timestamp = Date.now()
    } = context;

    try {
      // 1. Check circuit breaker status
      const circuitStatus = await this.checkCircuitBreaker(endpoint);
      if (circuitStatus.state === 'OPEN') {
        return this.createRateLimitResult(false, 'CIRCUIT_BREAKER_OPEN', circuitStatus);
      }

      // 2. Check cost control limits
      const costCheck = await this.checkCostLimits(context);
      if (!costCheck.allowed) {
        return this.createRateLimitResult(false, 'COST_LIMIT_EXCEEDED', costCheck);
      }

      // 3. Check with Qerberos for risk assessment (skip in test mode)
      if (!this.config.testMode && this.qerberosService) {
        const riskAssessment = await this.qerberosService.assessRisk(context);
        if (riskAssessment.blocked) {
          return this.createRateLimitResult(false, 'ABUSE_DETECTED', riskAssessment);
        }
        
        // Apply risk-based rate limit adjustments
        if (riskAssessment.riskScore > 0.5) {
          // Reduce limits for high-risk requests
          context._riskMultiplier = Math.max(0.1, 1 - riskAssessment.riskScore);
        }
      }

      // 4. Apply multi-layer rate limiting
      const rateLimitChecks = await Promise.all([
        this.checkIdentityRateLimit(squidId, context),
        subId ? this.checkSubidentityRateLimit(subId, context) : { allowed: true, remaining: Infinity },
        daoId ? this.checkDAORateLimit(daoId, context) : { allowed: true, remaining: Infinity }
      ]);

      // Find the most restrictive limit
      const restrictiveCheck = rateLimitChecks.find(check => !check.allowed);
      if (restrictiveCheck) {
        return this.createRateLimitResult(false, 'RATE_LIMIT_EXCEEDED', restrictiveCheck);
      }

      // 5. Update usage counters
      await this.updateUsageCounters(context);

      // 6. Update circuit breaker success
      await this.recordCircuitBreakerSuccess(endpoint);

      // Find the most restrictive remaining count
      const minRemaining = Math.min(...rateLimitChecks.map(c => c.remaining || Infinity));
      const mostRestrictiveCheck = rateLimitChecks.find(c => c.remaining === minRemaining) || rateLimitChecks[0];

      return this.createRateLimitResult(true, 'ALLOWED', {
        remaining: minRemaining === Infinity ? undefined : minRemaining,
        resetTime: mostRestrictiveCheck.resetTime,
        limit: mostRestrictiveCheck.limit
      });

    } catch (error) {
      console.error('Rate limiting check failed:', error);
      
      // Record circuit breaker failure
      await this.recordCircuitBreakerFailure(endpoint);
      
      // Fail open for availability (configurable)
      return this.createRateLimitResult(true, 'FAIL_OPEN', { error: error.message });
    }
  }

  /**
   * Check identity-based rate limits with reputation adjustment
   */
  async checkIdentityRateLimit(squidId, context) {
    if (!squidId) {
      return this.checkAnonymousRateLimit(context);
    }

    const reputation = await this.getReputation(squidId);
    const reputationLevel = this.getReputationLevel(reputation);
    const multiplier = this.config.reputationMultipliers[reputationLevel];
    
    const baseLimit = this.config.baseLimits.identity;
    let adjustedLimit = Math.floor(baseLimit.requests * multiplier);
    
    // Apply risk-based adjustment if available
    if (context._riskMultiplier) {
      adjustedLimit = Math.floor(adjustedLimit * context._riskMultiplier);
    }
    
    const key = `identity:${squidId}`;
    const usage = await this.getUsage(key, baseLimit.window);
    
    const allowed = usage.count < adjustedLimit;
    const remaining = Math.max(0, adjustedLimit - usage.count - 1); // Account for current request
    
    return {
      allowed,
      remaining,
      resetTime: usage.resetTime,
      limit: adjustedLimit,
      reputation: reputationLevel
    };
  }

  /**
   * Check subidentity-based rate limits
   */
  async checkSubidentityRateLimit(subId, context) {
    const baseLimit = this.config.baseLimits.subidentity;
    const key = `subidentity:${subId}`;
    const usage = await this.getUsage(key, baseLimit.window);
    
    const allowed = usage.count < baseLimit.requests;
    const remaining = Math.max(0, baseLimit.requests - usage.count);
    
    return {
      allowed,
      remaining,
      resetTime: usage.resetTime,
      limit: baseLimit.requests
    };
  }

  /**
   * Check DAO-based rate limits with collective management
   */
  async checkDAORateLimit(daoId, context) {
    const baseLimit = this.config.baseLimits.dao;
    const key = `dao:${daoId}`;
    const usage = await this.getUsage(key, baseLimit.window);
    
    const allowed = usage.count < baseLimit.requests;
    const remaining = Math.max(0, baseLimit.requests - usage.count);
    
    return {
      allowed,
      remaining,
      resetTime: usage.resetTime,
      limit: baseLimit.requests
    };
  }

  /**
   * Check anonymous user rate limits (most restrictive)
   */
  async checkAnonymousRateLimit(context) {
    const baseLimit = this.config.baseLimits.anonymous;
    const key = `anonymous:${context.ip}`;
    const usage = await this.getUsage(key, baseLimit.window);
    
    const allowed = usage.count < baseLimit.requests;
    const remaining = Math.max(0, baseLimit.requests - usage.count);
    
    return {
      allowed,
      remaining,
      resetTime: usage.resetTime,
      limit: baseLimit.requests
    };
  }



  /**
   * Check circuit breaker status for endpoint
   */
  async checkCircuitBreaker(endpoint) {
    const key = `circuit:${endpoint}`;
    const breaker = this.circuitBreakerStore.get(key) || {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0,
      halfOpenCalls: 0
    };
    
    const now = Date.now();
    
    switch (breaker.state) {
      case 'CLOSED':
        return { state: 'CLOSED', allowed: true };
        
      case 'OPEN':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'HALF_OPEN';
          breaker.halfOpenCalls = 0;
          this.circuitBreakerStore.set(key, breaker);
          return { state: 'HALF_OPEN', allowed: true };
        }
        return { state: 'OPEN', allowed: false, nextAttempt: breaker.nextAttempt };
        
      case 'HALF_OPEN':
        if (breaker.halfOpenCalls < this.config.circuitBreaker.halfOpenMaxCalls) {
          return { state: 'HALF_OPEN', allowed: true };
        }
        return { state: 'HALF_OPEN', allowed: false };
        
      default:
        return { state: 'CLOSED', allowed: true };
    }
  }

  /**
   * Record circuit breaker success
   */
  async recordCircuitBreakerSuccess(endpoint) {
    const key = `circuit:${endpoint}`;
    const breaker = this.circuitBreakerStore.get(key);
    
    if (breaker && breaker.state === 'HALF_OPEN') {
      breaker.halfOpenCalls++;
      
      if (breaker.halfOpenCalls >= this.config.circuitBreaker.halfOpenMaxCalls) {
        breaker.state = 'CLOSED';
        breaker.failures = 0;
      }
      
      this.circuitBreakerStore.set(key, breaker);
    }
  }

  /**
   * Record circuit breaker failure
   */
  async recordCircuitBreakerFailure(endpoint) {
    const key = `circuit:${endpoint}`;
    const breaker = this.circuitBreakerStore.get(key) || {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      nextAttempt: 0,
      halfOpenCalls: 0
    };
    
    const now = Date.now();
    breaker.failures++;
    breaker.lastFailure = now;
    
    if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttempt = now + this.config.circuitBreaker.recoveryTimeout;
    }
    
    this.circuitBreakerStore.set(key, breaker);
  }

  /**
   * Check cost control limits for serverless deployments
   */
  async checkCostLimits(context) {
    const now = Date.now();
    const minuteKey = `cost:minute:${Math.floor(now / 60000)}`;
    const hourKey = `cost:hour:${Math.floor(now / 3600000)}`;
    
    const minuteUsage = this.costTrackingStore.get(minuteKey) || 0;
    const hourUsage = this.costTrackingStore.get(hourKey) || 0;
    
    const minuteExceeded = minuteUsage >= this.config.costControl.maxInvocationsPerMinute;
    const hourExceeded = hourUsage >= this.config.costControl.maxInvocationsPerHour;
    
    // Check budget alerts (include current request in calculation)
    const minuteUtilization = (minuteUsage + 1) / this.config.costControl.maxInvocationsPerMinute;
    const hourUtilization = (hourUsage + 1) / this.config.costControl.maxInvocationsPerHour;
    
    if (minuteUtilization >= this.config.costControl.budgetAlertThreshold ||
        hourUtilization >= this.config.costControl.budgetAlertThreshold) {
      this.emit('budgetAlert', {
        type: 'APPROACHING_LIMIT',
        minuteUtilization,
        hourUtilization,
        timestamp: now
      });
    }
    
    if (minuteUtilization >= this.config.costControl.emergencyStopThreshold ||
        hourUtilization >= this.config.costControl.emergencyStopThreshold) {
      this.emit('budgetAlert', {
        type: 'EMERGENCY_STOP',
        minuteUtilization,
        hourUtilization,
        timestamp: now
      });
    }
    
    return {
      allowed: !minuteExceeded && !hourExceeded,
      minuteUsage,
      hourUsage,
      minuteLimit: this.config.costControl.maxInvocationsPerMinute,
      hourLimit: this.config.costControl.maxInvocationsPerHour,
      minuteExceeded,
      hourExceeded
    };
  }



  /**
   * Update usage counters for all applicable limits
   */
  async updateUsageCounters(context) {
    const now = Date.now();
    
    // Update identity counter
    if (context.squidId) {
      await this.incrementUsage(`identity:${context.squidId}`, this.config.baseLimits.identity.window);
    } else {
      await this.incrementUsage(`anonymous:${context.ip}`, this.config.baseLimits.anonymous.window);
    }
    
    // Update subidentity counter
    if (context.subId) {
      await this.incrementUsage(`subidentity:${context.subId}`, this.config.baseLimits.subidentity.window);
    }
    
    // Update DAO counter
    if (context.daoId) {
      await this.incrementUsage(`dao:${context.daoId}`, this.config.baseLimits.dao.window);
    }
    
    // Update cost tracking
    const minuteKey = `cost:minute:${Math.floor(now / 60000)}`;
    const hourKey = `cost:hour:${Math.floor(now / 3600000)}`;
    
    this.costTrackingStore.set(minuteKey, (this.costTrackingStore.get(minuteKey) || 0) + 1);
    this.costTrackingStore.set(hourKey, (this.costTrackingStore.get(hourKey) || 0) + 1);
  }

  /**
   * Get usage statistics for a key within a time window
   */
  async getUsage(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const usage = this.rateLimitStore.get(key) || { count: 0, timestamps: [], resetTime: now + windowMs };
    
    // Clean old timestamps
    usage.timestamps = usage.timestamps.filter(ts => ts > windowStart);
    usage.count = usage.timestamps.length;
    
    // Update reset time if needed
    if (usage.resetTime <= now) {
      usage.resetTime = now + windowMs;
    }
    
    this.rateLimitStore.set(key, usage);
    
    return usage;
  }

  /**
   * Increment usage counter for a key
   */
  async incrementUsage(key, windowMs) {
    const now = Date.now();
    const usage = await this.getUsage(key, windowMs);
    
    usage.timestamps.push(now);
    usage.count = usage.timestamps.length;
    
    this.rateLimitStore.set(key, usage);
  }

  /**
   * Get reputation for an identity (mock implementation)
   */
  async getReputation(squidId) {
    // In a real implementation, this would query the reputation service
    return this.reputationStore.get(squidId) || 0;
  }

  /**
   * Set reputation for an identity (for testing)
   */
  async setReputation(squidId, reputation) {
    this.reputationStore.set(squidId, reputation);
  }

  /**
   * Get reputation level based on score
   */
  getReputationLevel(reputation) {
    if (reputation >= 100) return 'excellent';
    if (reputation >= 50) return 'good';
    if (reputation >= 0) return 'neutral';
    if (reputation >= -50) return 'poor';
    return 'blocked';
  }



  /**
   * Create standardized rate limit result
   */
  createRateLimitResult(allowed, reason, details = {}) {
    return {
      allowed,
      reason,
      timestamp: Date.now(),
      ...details
    };
  }

  /**
   * Setup cleanup intervals for memory management
   */
  setupCleanupIntervals() {
    // Skip cleanup intervals in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired entries from memory stores
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    
    // Clean rate limit store
    for (const [key, usage] of this.rateLimitStore.entries()) {
      if (usage.resetTime <= now && usage.timestamps.length === 0) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Clean cost tracking store (keep only current hour and minute)
    const currentMinute = Math.floor(now / 60000);
    const currentHour = Math.floor(now / 3600000);
    
    for (const key of this.costTrackingStore.keys()) {
      if (key.startsWith('cost:minute:')) {
        const minute = parseInt(key.split(':')[2]);
        if (minute < currentMinute - 1) {
          this.costTrackingStore.delete(key);
        }
      } else if (key.startsWith('cost:hour:')) {
        const hour = parseInt(key.split(':')[2]);
        if (hour < currentHour - 1) {
          this.costTrackingStore.delete(key);
        }
      }
    }
    
    // Clean behavior pattern store
    for (const [key, patterns] of this.behaviorPatternStore.entries()) {
      const recentPatterns = patterns.filter(p => now - p.timestamp < 3600000);
      if (recentPatterns.length === 0) {
        this.behaviorPatternStore.delete(key);
      } else {
        this.behaviorPatternStore.set(key, recentPatterns);
      }
    }
  }

  /**
   * Get current statistics for monitoring
   */
  getStatistics() {
    return {
      rateLimitEntries: this.rateLimitStore.size,
      circuitBreakerEntries: this.circuitBreakerStore.size,
      behaviorPatternEntries: this.behaviorPatternStore.size,
      costTrackingEntries: this.costTrackingStore.size,
      reputationEntries: this.reputationStore.size
    };
  }
}

export default RateLimitingService;