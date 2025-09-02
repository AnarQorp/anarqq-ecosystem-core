/**
 * Rate Limiting Middleware
 * 
 * Express middleware that integrates with RateLimitingService to provide
 * comprehensive rate limiting and anti-abuse protection
 */

import RateLimitingService from '../services/RateLimitingService.mjs';

// Global rate limiting service instance
let rateLimitingService = null;

/**
 * Initialize rate limiting service with configuration
 */
export function initializeRateLimiting(config = {}, qerberosService = null) {
  // Pass Qerberos service to rate limiting service
  rateLimitingService = new RateLimitingService({
    ...config,
    qerberosService
  });
  
  // Set up event listeners for monitoring and alerting
  rateLimitingService.on('budgetAlert', (alert) => {
    console.warn('Budget alert:', alert);
    // In production, this would trigger cost control measures
  });
  
  return rateLimitingService;
}

/**
 * Get the current rate limiting service instance
 */
export function getRateLimitingService() {
  if (!rateLimitingService) {
    rateLimitingService = new RateLimitingService();
  }
  return rateLimitingService;
}

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(options = {}) {
  const service = getRateLimitingService();
  
  return async (req, res, next) => {
    try {
      // Extract context from request
      const context = {
        squidId: req.headers['x-squid-id'],
        subId: req.headers['x-subid'],
        daoId: req.headers['x-dao-id'],
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        timestamp: Date.now()
      };
      
      // Check rate limits
      const result = await service.checkRateLimit(context);
      
      // Add rate limit headers to response
      res.set({
        'X-RateLimit-Allowed': result.allowed.toString(),
        'X-RateLimit-Reason': result.reason,
        'X-RateLimit-Remaining': result.remaining?.toString() || '0',
        'X-RateLimit-Reset': result.resetTime?.toString() || '0',
        'X-RateLimit-Limit': result.limit?.toString() || '0'
      });
      
      if (!result.allowed) {
        // Rate limit exceeded
        const statusCode = getStatusCodeForReason(result.reason);
        const response = {
          status: 'error',
          code: result.reason,
          message: getRateLimitMessage(result.reason),
          details: {
            reason: result.reason,
            resetTime: result.resetTime,
            retryAfter: result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60
          },
          timestamp: new Date().toISOString()
        };
        
        // Add Retry-After header for client guidance
        if (result.resetTime) {
          res.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
        }
        
        return res.status(statusCode).json(response);
      }
      
      // Store rate limit result for potential use by other middleware
      req.rateLimit = result;
      
      next();
      
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      
      // Fail open - allow request to proceed but log the error
      req.rateLimit = {
        allowed: true,
        reason: 'MIDDLEWARE_ERROR',
        error: error.message
      };
      
      next();
    }
  };
}

/**
 * Middleware to record request success/failure for circuit breaker
 */
export function recordRequestOutcome() {
  return (req, res, next) => {
    const service = getRateLimitingService();
    const originalSend = res.send;
    
    res.send = function(data) {
      // Record success or failure based on status code
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      if (res.statusCode >= 500) {
        // Server error - record as circuit breaker failure
        service.recordCircuitBreakerFailure(endpoint);
      } else {
        // Success or client error - record as circuit breaker success
        service.recordCircuitBreakerSuccess(endpoint);
      }
      
      // Update failure rate tracking
      const identifier = req.headers['x-squid-id'] || req.ip;
      const key = `failures:${identifier}`;
      const stats = service.rateLimitStore.get(key) || { total: 0, failures: 0, window: Date.now() };
      
      stats.total++;
      if (res.statusCode >= 400) {
        stats.failures++;
      }
      
      service.rateLimitStore.set(key, stats);
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware for cost tracking in serverless environments
 */
export function costTrackingMiddleware() {
  return (req, res, next) => {
    const service = getRateLimitingService();
    
    // Track invocation start time
    req.invocationStart = Date.now();
    
    // Track invocation completion
    res.on('finish', () => {
      const duration = Date.now() - req.invocationStart;
      
      // Emit cost tracking event
      service.emit('invocationComplete', {
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        duration,
        statusCode: res.statusCode,
        squidId: req.headers['x-squid-id'],
        timestamp: Date.now()
      });
    });
    
    next();
  };
}

/**
 * Middleware to apply adaptive rate limiting based on endpoint sensitivity
 */
export function adaptiveRateLimitMiddleware(endpointConfig = {}) {
  return async (req, res, next) => {
    const service = getRateLimitingService();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const config = endpointConfig[endpoint] || {};
    
    // Apply endpoint-specific rate limiting rules
    if (config.strictMode) {
      // More restrictive limits for sensitive endpoints
      const originalConfig = service.config.baseLimits;
      service.config.baseLimits = {
        identity: { requests: Math.floor(originalConfig.identity.requests * 0.5), window: originalConfig.identity.window },
        subidentity: { requests: Math.floor(originalConfig.subidentity.requests * 0.5), window: originalConfig.subidentity.window },
        dao: { requests: Math.floor(originalConfig.dao.requests * 0.5), window: originalConfig.dao.window },
        anonymous: { requests: Math.floor(originalConfig.anonymous.requests * 0.2), window: originalConfig.anonymous.window }
      };
      
      // Restore original config after request
      res.on('finish', () => {
        service.config.baseLimits = originalConfig;
      });
    }
    
    next();
  };
}

/**
 * Get appropriate HTTP status code for rate limit reason
 */
function getStatusCodeForReason(reason) {
  switch (reason) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429; // Too Many Requests
    case 'CIRCUIT_BREAKER_OPEN':
      return 503; // Service Unavailable
    case 'COST_LIMIT_EXCEEDED':
      return 402; // Payment Required
    case 'ABUSE_DETECTED':
      return 403; // Forbidden
    default:
      return 429; // Default to Too Many Requests
  }
}

/**
 * Get human-readable message for rate limit reason
 */
function getRateLimitMessage(reason) {
  switch (reason) {
    case 'RATE_LIMIT_EXCEEDED':
      return 'Rate limit exceeded. Please slow down your requests.';
    case 'CIRCUIT_BREAKER_OPEN':
      return 'Service temporarily unavailable due to high error rate.';
    case 'COST_LIMIT_EXCEEDED':
      return 'Cost limits exceeded. Please contact support to increase limits.';
    case 'ABUSE_DETECTED':
      return 'Suspicious activity detected. Access temporarily restricted.';
    case 'ALLOWED':
      return 'Request allowed.';
    case 'FAIL_OPEN':
      return 'Rate limiting temporarily unavailable. Request allowed.';
    default:
      return 'Request rate limited.';
  }
}

/**
 * Health check endpoint for rate limiting service
 */
export function rateLimitHealthCheck() {
  return (req, res) => {
    const service = getRateLimitingService();
    const stats = service.getStatistics();
    
    res.json({
      status: 'ok',
      service: 'rate-limiting',
      timestamp: new Date().toISOString(),
      statistics: stats,
      config: {
        baseLimits: service.config.baseLimits,
        circuitBreaker: service.config.circuitBreaker,
        costControl: service.config.costControl
      }
    });
  };
}

export default {
  initializeRateLimiting,
  getRateLimitingService,
  rateLimitMiddleware,
  recordRequestOutcome,
  costTrackingMiddleware,
  adaptiveRateLimitMiddleware,
  rateLimitHealthCheck
};