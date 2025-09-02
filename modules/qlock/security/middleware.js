/**
 * Qlock Security Middleware
 * 
 * Provides authentication, authorization, and security controls for Qlock operations.
 */

import crypto from 'crypto';

/**
 * Authentication middleware - validates sQuid identity
 */
export const authenticate = async (req, res, next) => {
  try {
    const squidId = req.headers['x-squid-id'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];
    
    if (!squidId) {
      return res.status(401).json({
        status: 'error',
        code: 'QLOCK_AUTH_MISSING',
        message: 'Missing sQuid identity header'
      });
    }

    // In standalone mode, use mock authentication
    if (process.env.QLOCK_MODE === 'standalone') {
      req.identity = {
        squidId,
        verified: true,
        mock: true
      };
      return next();
    }

    // Validate signature and timestamp
    if (!signature || !timestamp) {
      return res.status(401).json({
        status: 'error',
        code: 'QLOCK_AUTH_INCOMPLETE',
        message: 'Missing signature or timestamp'
      });
    }

    // Check timestamp freshness (5 minute window)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 300000) {
      return res.status(401).json({
        status: 'error',
        code: 'QLOCK_AUTH_EXPIRED',
        message: 'Request timestamp expired'
      });
    }

    // TODO: Integrate with sQuid service for identity verification
    // For now, accept any valid-looking squid ID
    if (squidId.startsWith('squid_')) {
      req.identity = {
        squidId,
        verified: true,
        timestamp: requestTime
      };
      next();
    } else {
      res.status(401).json({
        status: 'error',
        code: 'QLOCK_AUTH_INVALID',
        message: 'Invalid sQuid identity format'
      });
    }

  } catch (error) {
    console.error('[Qlock Auth] Authentication error:', error);
    res.status(500).json({
      status: 'error',
      code: 'QLOCK_AUTH_ERROR',
      message: 'Authentication service error'
    });
  }
};

/**
 * Authorization middleware - checks Qonsent permissions
 */
export const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const qonsentToken = req.headers['x-qonsent'];
      const { squidId } = req.identity;

      // In standalone mode, allow all operations
      if (process.env.QLOCK_MODE === 'standalone') {
        req.permissions = {
          [requiredPermission]: true,
          mock: true
        };
        return next();
      }

      if (!qonsentToken) {
        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: 'Missing Qonsent authorization token'
        });
      }

      // TODO: Integrate with Qonsent service for permission checking
      // For now, decode and validate token format
      try {
        const decoded = Buffer.from(qonsentToken, 'base64').toString('utf8');
        const permissions = JSON.parse(decoded);
        
        if (permissions[requiredPermission]) {
          req.permissions = permissions;
          next();
        } else {
          res.status(403).json({
            status: 'error',
            code: 'QONSENT_INSUFFICIENT',
            message: `Insufficient permissions for ${requiredPermission}`
          });
        }
      } catch (decodeError) {
        res.status(403).json({
          status: 'error',
          code: 'QONSENT_INVALID',
          message: 'Invalid Qonsent token format'
        });
      }

    } catch (error) {
      console.error('[Qlock Auth] Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'QONSENT_ERROR',
        message: 'Authorization service error'
      });
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = (req) => req.identity?.squidId || req.ip
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [k, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        requests.delete(k);
      } else {
        requests.set(k, filtered);
      }
    }

    // Check current requests
    const currentRequests = requests.get(key) || [];
    const recentRequests = currentRequests.filter(t => t > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - recentRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
};

/**
 * Input validation middleware
 */
export const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      // Basic validation - in production would use JSON Schema validator
      const { body } = req;
      
      if (!body) {
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_MISSING_BODY',
          message: 'Request body is required'
        });
      }

      // Validate required fields based on schema
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in body)) {
            return res.status(400).json({
              status: 'error',
              code: 'VALIDATION_MISSING_FIELD',
              message: `Required field missing: ${field}`
            });
          }
        }
      }

      // Basic type validation
      if (schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (field in body) {
            const value = body[field];
            const expectedType = fieldSchema.type;
            
            if (expectedType === 'string' && typeof value !== 'string') {
              return res.status(400).json({
                status: 'error',
                code: 'VALIDATION_TYPE_ERROR',
                message: `Field ${field} must be a string`
              });
            }
            
            if (expectedType === 'integer' && !Number.isInteger(value)) {
              return res.status(400).json({
                status: 'error',
                code: 'VALIDATION_TYPE_ERROR',
                message: `Field ${field} must be an integer`
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('[Qlock Validation] Input validation error:', error);
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed'
      });
    }
  };
};

/**
 * Audit logging middleware
 */
export const auditLog = (operation) => {
  return (req, res, next) => {
    const startTime = Date.now();
    const { squidId } = req.identity || {};
    
    // Log request
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      identity: squidId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: crypto.randomUUID()
    };

    console.log('[Qlock Audit] Request:', JSON.stringify(auditEntry));

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const responseAudit = {
        ...auditEntry,
        duration,
        statusCode: res.statusCode,
        success: res.statusCode < 400
      };

      console.log('[Qlock Audit] Response:', JSON.stringify(responseAudit));

      // TODO: Send to Qerberos audit service
      if (process.env.QLOCK_AUDIT_ENABLED === 'true') {
        // publishAuditEvent(responseAudit);
      }

      originalSend.call(this, data);
    };

    req.auditEntry = auditEntry;
    next();
  };
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[Qlock Error]', err);

  // Log error for audit
  if (req.auditEntry) {
    const errorAudit = {
      ...req.auditEntry,
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500
    };
    console.log('[Qlock Audit] Error:', JSON.stringify(errorAudit));
  }

  // Determine error response
  let statusCode = 500;
  let errorCode = 'QLOCK_INTERNAL_ERROR';
  let message = 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'QLOCK_VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
    errorCode = 'QLOCK_AUTH_FAIL';
    message = err.message;
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
    errorCode = 'QONSENT_DENIED';
    message = err.message;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    errorCode = err.code || errorCode;
    message = err.message;
  }

  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message,
    timestamp: new Date().toISOString(),
    requestId: req.auditEntry?.requestId
  });
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
};