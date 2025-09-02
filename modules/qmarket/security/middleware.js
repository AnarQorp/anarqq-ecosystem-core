/**
 * Qmarket Security Middleware
 * 
 * Provides authentication, authorization, and security controls for the Qmarket module.
 * Integrates with sQuid, Qonsent, Qlock, and Qerberos for comprehensive security.
 */

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

/**
 * sQuid Identity Authentication Middleware
 * Verifies sQuid identity tokens and extracts user context
 */
export const squidAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const squidId = req.headers['x-squid-id'];
    const subId = req.headers['x-subid'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];

    // Check for required headers
    if (!authHeader || !squidId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers',
        code: 'SQUID_AUTH_MISSING'
      });
    }

    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    // In standalone mode, use mock validation
    if (process.env.SQUID_SERVICE_URL === 'mock') {
      req.user = {
        squidId,
        subId,
        daoIds: ['dao_test123'],
        reputation: 100,
        verified: true
      };
      return next();
    }

    // Verify token with sQuid service
    const squidService = getSquidService();
    const verificationResult = await squidService.verifyToken({
      token,
      squidId,
      subId,
      signature,
      timestamp
    });

    if (!verificationResult.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid sQuid identity',
        code: 'SQUID_IDENTITY_INVALID'
      });
    }

    // Set user context
    req.user = {
      squidId: verificationResult.squidId,
      subId: verificationResult.subId,
      daoIds: verificationResult.daoIds || [],
      reputation: verificationResult.reputation || 0,
      verified: verificationResult.verified || false
    };

    next();
  } catch (error) {
    console.error('[QmarketAuth] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'SQUID_AUTH_ERROR'
    });
  }
};

/**
 * Qonsent Permission Authorization Middleware
 * Checks permissions for marketplace operations
 */
export const qonsentAuth = (requiredPermission, resourceType = 'listing') => {
  return async (req, res, next) => {
    try {
      const { squidId, subId, daoIds } = req.user;
      const resourceId = req.params.listingId || req.params.id;

      // In standalone mode, use mock authorization
      if (process.env.QONSENT_SERVICE_URL === 'mock') {
        req.permissions = {
          granted: true,
          permissions: [requiredPermission],
          scope: 'full'
        };
        return next();
      }

      // Check permission with Qonsent service
      const qonsentService = getQonsentService();
      const permissionResult = await qonsentService.checkPermission({
        squidId,
        subId,
        daoIds,
        permission: requiredPermission,
        resourceType,
        resourceId,
        context: {
          operation: req.method,
          endpoint: req.path,
          timestamp: new Date().toISOString()
        }
      });

      if (!permissionResult.granted) {
        // Log permission denial
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'permission_denied',
          squidId,
          resourceId,
          metadata: {
            requiredPermission,
            resourceType,
            reason: permissionResult.reason
          }
        });

        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'QONSENT_DENIED',
          requiredPermission,
          reason: permissionResult.reason
        });
      }

      req.permissions = permissionResult;
      next();
    } catch (error) {
      console.error('[QmarketAuth] Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization service error',
        code: 'QONSENT_AUTH_ERROR'
      });
    }
  };
};

/**
 * Resource Ownership Middleware
 * Verifies that the user owns the requested resource
 */
export const requireOwnership = (resourceType = 'listing') => {
  return async (req, res, next) => {
    try {
      const { squidId } = req.user;
      const resourceId = req.params.listingId || req.params.id;

      // Get resource from service
      const qmarketService = getQmarketService();
      let resource;

      if (resourceType === 'listing') {
        const result = await qmarketService.getListing(resourceId);
        if (!result.success) {
          return res.status(404).json({
            success: false,
            error: 'Resource not found',
            code: 'RESOURCE_NOT_FOUND'
          });
        }
        resource = result.listing;
      }

      // Check ownership
      if (resource.squidId !== squidId) {
        return res.status(403).json({
          success: false,
          error: 'Resource access denied - not owner',
          code: 'OWNERSHIP_REQUIRED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('[QmarketAuth] Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership verification error',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Rate Limiting Middleware
 * Implements multi-layer rate limiting based on identity and operation
 */
export const createRateLimit = (operation) => {
  const rateLimits = {
    createListing: {
      windowMs: 60 * 1000, // 1 minute
      max: 5,
      message: {
        success: false,
        error: 'Too many listing creation attempts',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    },
    purchaseItem: {
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      message: {
        success: false,
        error: 'Too many purchase attempts',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    },
    searchListings: {
      windowMs: 60 * 1000, // 1 minute
      max: 60,
      message: {
        success: false,
        error: 'Too many search requests',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    },
    default: {
      windowMs: 60 * 1000, // 1 minute
      max: 30,
      message: {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    }
  };

  const config = rateLimits[operation] || rateLimits.default;

  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      // Use sQuid ID for authenticated requests, IP for anonymous
      return req.user?.squidId || req.ip;
    },
    handler: async (req, res) => {
      // Log rate limit violation
      try {
        const qerberosService = getQerberosService();
        await qerberosService.logEvent({
          action: 'rate_limit_exceeded',
          squidId: req.user?.squidId || 'anonymous',
          metadata: {
            operation,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          }
        });
      } catch (logError) {
        console.error('[QmarketAuth] Rate limit logging error:', logError);
      }

      res.status(429).json(config.message);
    }
  });
};

/**
 * Request Validation Middleware
 * Validates and sanitizes request data
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        });
      }

      req.validatedBody = value;
      next();
    } catch (error) {
      console.error('[QmarketAuth] Validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation service error',
        code: 'VALIDATION_SERVICE_ERROR'
      });
    }
  };
};

/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */
export const securityHeaders = (req, res, next) => {
  // HTTPS enforcement
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // XSS protection
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');
  
  // MIME sniffing protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request Correlation Middleware
 * Adds correlation ID for request tracing
 */
export const correlationId = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

/**
 * Audit Logging Middleware
 * Logs all requests for security auditing
 */
export const auditLogger = async (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  const requestLog = {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    squidId: req.user?.squidId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  try {
    const qerberosService = getQerberosService();
    await qerberosService.logEvent({
      action: 'api_request_start',
      squidId: req.user?.squidId || 'anonymous',
      metadata: requestLog
    });
  } catch (error) {
    console.error('[QmarketAuth] Audit logging error:', error);
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      responseTime,
      success: data?.success !== false
    };

    // Don't await this to avoid blocking response
    getQerberosService().logEvent({
      action: 'api_request_complete',
      squidId: req.user?.squidId || 'anonymous',
      metadata: responseLog
    }).catch(error => {
      console.error('[QmarketAuth] Response audit logging error:', error);
    });

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Mock service getters for standalone mode
 */
function getSquidService() {
  if (process.env.SQUID_SERVICE_URL === 'mock') {
    return {
      verifyToken: async () => ({ valid: true, squidId: 'mock_user', verified: true })
    };
  }
  // Return actual service implementation
  return require('../../../backend/ecosystem/index.mjs').getSquidService();
}

function getQonsentService() {
  if (process.env.QONSENT_SERVICE_URL === 'mock') {
    return {
      checkPermission: async () => ({ granted: true, permissions: ['all'] })
    };
  }
  return require('../../../backend/ecosystem/index.mjs').getQonsentService();
}

function getQerberosService() {
  if (process.env.QERBEROS_SERVICE_URL === 'mock') {
    return {
      logEvent: async () => ({ success: true })
    };
  }
  return require('../../../backend/ecosystem/index.mjs').getQerberosService();
}

function getQmarketService() {
  return require('../src/services/QmarketService.js').getQmarketService();
}