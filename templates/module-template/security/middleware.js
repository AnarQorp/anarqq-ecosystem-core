/**
 * Security Middleware for {{MODULE_NAME}}
 * 
 * Implements authentication, authorization, and security policies
 * following Q ecosystem standards.
 */

import { createHash } from 'crypto';
import rateLimit from 'express-rate-limit';
import { body, header, validationResult } from 'express-validator';

// Mock imports - replace with actual service clients in production
import { SquidClient } from '@anarq/common-clients';
import { QlockClient } from '@anarq/common-clients';
import { QonsentClient } from '@anarq/common-clients';
import { QerberosClient } from '@anarq/common-clients';

/**
 * Authentication middleware - validates sQuid identity
 */
export const authenticate = async (req, res, next) => {
  try {
    const squidId = req.headers['x-squid-id'];
    const subId = req.headers['x-subid'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];

    // Validate required headers
    if (!squidId) {
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_IDENTITY_REQUIRED',
        message: 'sQuid identity header is required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    // Verify identity with sQuid service
    const squidClient = new SquidClient({
      baseURL: process.env.SQUID_URL,
      timeout: 5000
    });

    const identityVerification = await squidClient.verifyIdentity({
      squidId,
      subId,
      signature,
      timestamp
    });

    if (!identityVerification.valid) {
      // Log authentication failure
      await logSecurityEvent(req, {
        type: 'AUTHENTICATION_FAILED',
        verdict: 'DENY',
        details: {
          squidId,
          subId,
          reason: identityVerification.reason
        }
      });

      return res.status(401).json({
        status: 'error',
        code: 'SQUID_IDENTITY_INVALID',
        message: 'Invalid sQuid identity',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    // Attach identity to request
    req.identity = {
      squidId,
      subId,
      daoId: identityVerification.daoId,
      reputation: identityVerification.reputation,
      verified: true
    };

    // Log successful authentication
    await logSecurityEvent(req, {
      type: 'AUTHENTICATION_SUCCESS',
      verdict: 'ALLOW',
      details: {
        squidId,
        subId,
        daoId: identityVerification.daoId
      }
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    await logSecurityEvent(req, {
      type: 'AUTHENTICATION_ERROR',
      verdict: 'DENY',
      details: {
        error: error.message,
        squidId: req.headers['x-squid-id']
      }
    });

    res.status(500).json({
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication service error',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
};

/**
 * Authorization middleware - checks permissions via Qonsent
 */
export const authorize = (requiredScope) => {
  return async (req, res, next) => {
    try {
      const qonsentToken = req.headers['x-qonsent'];
      
      if (!qonsentToken) {
        await logSecurityEvent(req, {
          type: 'AUTHORIZATION_FAILED',
          verdict: 'DENY',
          details: {
            reason: 'missing_qonsent_token',
            requiredScope
          }
        });

        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_TOKEN_REQUIRED',
          message: 'Qonsent permission token is required',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Check permissions with Qonsent service
      const qonsentClient = new QonsentClient({
        baseURL: process.env.QONSENT_URL,
        timeout: 5000
      });

      const permissionCheck = await qonsentClient.checkPermission({
        token: qonsentToken,
        scope: requiredScope,
        resource: req.path,
        action: req.method.toLowerCase(),
        context: {
          squidId: req.identity.squidId,
          subId: req.identity.subId,
          daoId: req.identity.daoId
        }
      });

      if (!permissionCheck.allowed) {
        await logSecurityEvent(req, {
          type: 'AUTHORIZATION_DENIED',
          verdict: 'DENY',
          details: {
            requiredScope,
            reason: permissionCheck.reason,
            resource: req.path,
            action: req.method
          }
        });

        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: 'Permission denied',
          details: {
            requiredScope,
            reason: permissionCheck.reason
          },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }

      // Attach permission info to request
      req.permission = {
        scope: requiredScope,
        token: qonsentToken,
        granted: true,
        expires: permissionCheck.expires
      };

      // Log successful authorization
      await logSecurityEvent(req, {
        type: 'AUTHORIZATION_GRANTED',
        verdict: 'ALLOW',
        details: {
          scope: requiredScope,
          resource: req.path,
          action: req.method
        }
      });

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      
      await logSecurityEvent(req, {
        type: 'AUTHORIZATION_ERROR',
        verdict: 'DENY',
        details: {
          error: error.message,
          requiredScope
        }
      });

      res.status(500).json({
        status: 'error',
        code: 'AUTHORIZATION_ERROR',
        message: 'Authorization service error',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
  };
};

/**
 * Rate limiting middleware with identity-based limits
 */
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Default limit
    message: {
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
    keyGenerator: (req) => {
      // Use identity-based rate limiting
      if (req.identity) {
        if (req.identity.daoId) {
          return `dao:${req.identity.daoId}`;
        } else if (req.identity.subId) {
          return `sub:${req.identity.subId}`;
        } else {
          return `identity:${req.identity.squidId}`;
        }
      }
      // Fallback to IP-based limiting for unauthenticated requests
      return `ip:${req.ip}`;
    },
    handler: async (req, res) => {
      await logSecurityEvent(req, {
        type: 'RATE_LIMIT_EXCEEDED',
        verdict: 'DENY',
        details: {
          limit: options.max || defaultOptions.max,
          window: options.windowMs || defaultOptions.windowMs,
          key: req.rateLimit.key
        }
      });

      res.status(429).json({
        ...defaultOptions.message,
        timestamp: new Date().toISOString(),
        requestId: req.id,
        retryAfter: Math.round(options.windowMs / 1000) || 900
      });
    }
  });
};

/**
 * Input validation middleware
 */
export const validateInput = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logSecurityEvent(req, {
          type: 'INPUT_VALIDATION_FAILED',
          verdict: 'DENY',
          details: {
            errors: errors.array(),
            body: req.body,
            params: req.params,
            query: req.query
          }
        });

        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      next();
    }
  ];
};

/**
 * Common validation rules
 */
export const validationRules = {
  squidId: header('x-squid-id').isUUID().withMessage('Invalid sQuid ID format'),
  subId: header('x-subid').optional().isUUID().withMessage('Invalid subidentity ID format'),
  apiVersion: header('x-api-version').optional().matches(/^\d+\.\d+$/).withMessage('Invalid API version format'),
  
  // Request body validations
  resourceName: body('name').isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  resourceDescription: body('description').optional().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
  resourceTags: body('tags').optional().isArray({ max: 10 }).withMessage('Tags must be array with max 10 items'),
  
  // UUID validations
  uuid: (field) => body(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  // Pagination validations
  page: body('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  limit: body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
};

/**
 * Signature verification middleware for sensitive operations
 */
export const verifySignature = async (req, res, next) => {
  try {
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];

    if (!signature || !timestamp) {
      return res.status(400).json({
        status: 'error',
        code: 'SIGNATURE_REQUIRED',
        message: 'Signature and timestamp headers are required for this operation',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return res.status(400).json({
        status: 'error',
        code: 'SIGNATURE_EXPIRED',
        message: 'Request timestamp is too old',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    // Create request hash for signature verification
    const requestHash = createHash('sha256')
      .update(req.method)
      .update(req.path)
      .update(JSON.stringify(req.body || {}))
      .update(timestamp)
      .digest('hex');

    // Verify signature with Qlock service
    const qlockClient = new QlockClient({
      baseURL: process.env.QLOCK_URL,
      timeout: 5000
    });

    const signatureVerification = await qlockClient.verifySignature({
      signature,
      data: requestHash,
      publicKey: req.identity.publicKey || await getPublicKey(req.identity.squidId)
    });

    if (!signatureVerification.valid) {
      await logSecurityEvent(req, {
        type: 'SIGNATURE_VERIFICATION_FAILED',
        verdict: 'DENY',
        details: {
          reason: signatureVerification.reason,
          requestHash
        }
      });

      return res.status(401).json({
        status: 'error',
        code: 'SIGNATURE_INVALID',
        message: 'Invalid request signature',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }

    req.signature = {
      verified: true,
      timestamp: requestTime,
      hash: requestHash
    };

    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    
    await logSecurityEvent(req, {
      type: 'SIGNATURE_VERIFICATION_ERROR',
      verdict: 'DENY',
      details: {
        error: error.message
      }
    });

    res.status(500).json({
      status: 'error',
      code: 'SIGNATURE_VERIFICATION_ERROR',
      message: 'Signature verification service error',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS header for HTTPS
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // CSP header
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  next();
};

/**
 * Log security events to Qerberos
 */
async function logSecurityEvent(req, eventData) {
  try {
    const qerberosClient = new QerberosClient({
      baseURL: process.env.QERBEROS_URL,
      timeout: 5000
    });

    const auditEvent = {
      type: eventData.type,
      ref: req.id || 'unknown',
      actor: {
        squidId: req.identity?.squidId || 'anonymous',
        subId: req.identity?.subId,
        daoId: req.identity?.daoId
      },
      layer: '{{MODULE_NAME}}',
      verdict: eventData.verdict,
      details: {
        ...eventData.details,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    };

    await qerberosClient.logAuditEvent(auditEvent);
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Get public key for identity (mock implementation)
 */
async function getPublicKey(squidId) {
  // In production, this would fetch the public key from sQuid service
  // For now, return a mock key
  return 'mock-public-key-' + squidId;
}

/**
 * Error handling middleware for security errors
 */
export const securityErrorHandler = (err, req, res, next) => {
  // Log security-related errors
  if (err.type === 'security') {
    logSecurityEvent(req, {
      type: 'SECURITY_ERROR',
      verdict: 'DENY',
      details: {
        error: err.message,
        stack: err.stack
      }
    });
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
};