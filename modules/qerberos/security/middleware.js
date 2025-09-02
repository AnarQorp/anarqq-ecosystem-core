/**
 * Qerberos Security Middleware
 * 
 * Provides authentication, authorization, and security controls for Qerberos API endpoints
 */

const crypto = require('crypto');
const { validateIdentity } = require('../src/mocks/squid-mock');
const { checkPermission } = require('../src/mocks/qonsent-mock');
const { verifySignature } = require('../src/mocks/qlock-mock');

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map();

/**
 * Authentication middleware - verifies identity through sQuid
 */
async function authenticate(req, res, next) {
  try {
    const squidId = req.headers['x-squid-id'];
    const subId = req.headers['x-subid'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];

    if (!squidId) {
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_IDENTITY_MISSING',
        message: 'sQuid identity required',
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    if (!signature || !timestamp) {
      return res.status(401).json({
        status: 'error',
        code: 'SIGNATURE_MISSING',
        message: 'Cryptographic signature required',
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({
        status: 'error',
        code: 'TIMESTAMP_INVALID',
        message: 'Request timestamp too old or in future',
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    // Validate identity with sQuid
    const identityValid = await validateIdentity(squidId, subId);
    if (!identityValid) {
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_IDENTITY_INVALID',
        message: 'Invalid sQuid identity',
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    // Verify signature with Qlock
    const signatureValid = await verifySignature(signature, {
      method: req.method,
      path: req.path,
      timestamp,
      squidId,
      subId
    });

    if (!signatureValid) {
      return res.status(401).json({
        status: 'error',
        code: 'SIGNATURE_INVALID',
        message: 'Invalid cryptographic signature',
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    // Add identity to request context
    req.identity = {
      squidId,
      subId,
      daoId: req.headers['x-dao-id']
    };

    next();
  } catch (error) {
    console.error('[Qerberos] Authentication error:', error);
    res.status(500).json({
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication service error',
      timestamp: new Date().toISOString(),
      retryable: true
    });
  }
}

/**
 * Authorization middleware - checks permissions through Qonsent
 */
function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.identity) {
        return res.status(401).json({
          status: 'error',
          code: 'IDENTITY_MISSING',
          message: 'Identity required for authorization',
          timestamp: new Date().toISOString(),
          retryable: false
        });
      }

      // Check permission with Qonsent
      const hasPermission = await checkPermission(
        req.identity.squidId,
        requiredPermission,
        {
          subId: req.identity.subId,
          daoId: req.identity.daoId,
          resource: req.path,
          action: req.method
        }
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: `Permission denied: ${requiredPermission}`,
          timestamp: new Date().toISOString(),
          retryable: false,
          suggestedActions: [
            'Request permission from resource owner',
            'Check your role assignments',
            'Contact system administrator'
          ]
        });
      }

      next();
    } catch (error) {
      console.error('[Qerberos] Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: 'Authorization service error',
        timestamp: new Date().toISOString(),
        retryable: true
      });
    }
  };
}

/**
 * Rate limiting middleware
 */
function rateLimit(options = {}) {
  const {
    windowMs = 60 * 60 * 1000, // 1 hour
    maxRequests = 1000,
    keyGenerator = (req) => req.identity?.squidId || req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this key
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitStore.set(key, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded: ${maxRequests} requests per ${windowMs / 1000} seconds`,
        timestamp: new Date().toISOString(),
        retryable: true,
        suggestedActions: [
          'Wait before making more requests',
          'Implement exponential backoff',
          'Contact support if you need higher limits'
        ]
      });
    }

    // Add current request timestamp
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - validRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });

  next();
}

/**
 * Request validation middleware
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        },
        timestamp: new Date().toISOString(),
        retryable: false
      });
    }

    req.validatedBody = value;
    next();
  };
}

/**
 * Audit logging middleware - logs all requests
 */
function auditLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to headers
  res.set('X-Request-ID', requestId);
  req.requestId = requestId;

  // Log request
  console.log(`[Qerberos] ${requestId} ${req.method} ${req.path}`, {
    identity: req.identity?.squidId,
    subId: req.identity?.subId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    console.log(`[Qerberos] ${requestId} Response ${res.statusCode}`, {
      duration: `${duration}ms`,
      status: data?.status,
      code: data?.code
    });

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Error handling middleware
 */
function errorHandler(error, req, res, next) {
  console.error(`[Qerberos] ${req.requestId} Error:`, error);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let retryable = true;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    retryable = false;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
    retryable = false;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
    retryable = false;
  }

  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message,
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    retryable
  });
}

module.exports = {
  authenticate,
  authorize,
  rateLimit,
  securityHeaders,
  validateRequest,
  auditLogger,
  errorHandler
};