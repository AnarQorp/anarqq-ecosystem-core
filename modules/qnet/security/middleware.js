/**
 * QNET Security Middleware
 * 
 * Provides authentication, authorization, and security controls for QNET endpoints
 */

import crypto from 'crypto';

/**
 * Authentication middleware - verifies sQuid identity
 */
export function authenticateIdentity(mockMode = false) {
  return async (req, res, next) => {
    try {
      const squidId = req.headers['x-squid-id'];
      const signature = req.headers['x-sig'];
      const timestamp = req.headers['x-ts'];

      if (!squidId) {
        return res.status(401).json({
          status: 'error',
          code: 'SQUID_IDENTITY_MISSING',
          message: 'sQuid identity required',
          timestamp: new Date().toISOString()
        });
      }

      if (mockMode) {
        // Mock authentication for standalone mode
        req.identity = {
          squidId,
          subId: req.headers['x-subid'],
          verified: true,
          reputation: 0.8
        };
        return next();
      }

      // In integrated mode, verify with sQuid service
      const isValid = await verifySquidIdentity(squidId, signature, timestamp);
      if (!isValid) {
        return res.status(401).json({
          status: 'error',
          code: 'SQUID_IDENTITY_INVALID',
          message: 'Invalid sQuid identity or signature',
          timestamp: new Date().toISOString()
        });
      }

      req.identity = {
        squidId,
        subId: req.headers['x-subid'],
        verified: true,
        reputation: await getIdentityReputation(squidId)
      };

      next();
    } catch (error) {
      console.error('[QNET Security] Authentication error:', error);
      res.status(500).json({
        status: 'error',
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Authorization middleware - checks Qonsent permissions
 */
export function authorizePermission(requiredPermission, mockMode = false) {
  return async (req, res, next) => {
    try {
      const qonsentToken = req.headers['x-qonsent'];
      const { squidId, subId } = req.identity || {};

      if (!squidId) {
        return res.status(401).json({
          status: 'error',
          code: 'IDENTITY_REQUIRED',
          message: 'Authentication required before authorization',
          timestamp: new Date().toISOString()
        });
      }

      if (mockMode) {
        // Mock authorization for standalone mode
        const hasPermission = mockPermissionCheck(requiredPermission, squidId);
        if (!hasPermission) {
          return res.status(403).json({
            status: 'error',
            code: 'QONSENT_DENIED',
            message: `Permission denied: ${requiredPermission}`,
            timestamp: new Date().toISOString()
          });
        }
        return next();
      }

      // In integrated mode, check with Qonsent service
      const hasPermission = await checkQonsentPermission(
        squidId, 
        subId, 
        requiredPermission, 
        qonsentToken
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: `Permission denied: ${requiredPermission}`,
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      console.error('[QNET Security] Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'AUTHZ_ERROR',
        message: 'Authorization service error',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitByIdentity(limits = {}) {
  const defaultLimits = {
    anonymous: { requests: 100, window: 3600 }, // 100/hour
    authenticated: { requests: 1000, window: 3600 }, // 1000/hour
    dao: { requests: 5000, window: 3600 }, // 5000/hour
    admin: { requests: 10000, window: 3600 } // 10000/hour
  };

  const rateLimits = { ...defaultLimits, ...limits };
  const requestCounts = new Map();

  return (req, res, next) => {
    try {
      const { squidId, reputation } = req.identity || {};
      const clientId = squidId || req.ip;
      
      // Determine rate limit tier
      let tier = 'anonymous';
      if (squidId) {
        tier = 'authenticated';
        if (reputation > 0.9) tier = 'admin';
        else if (reputation > 0.7) tier = 'dao';
      }

      const limit = rateLimits[tier];
      const now = Date.now();
      const windowStart = now - (limit.window * 1000);

      // Clean old entries
      const clientRequests = requestCounts.get(clientId) || [];
      const validRequests = clientRequests.filter(time => time > windowStart);

      if (validRequests.length >= limit.requests) {
        return res.status(429).json({
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded: ${limit.requests} requests per ${limit.window} seconds`,
          retryAfter: Math.ceil((validRequests[0] - windowStart) / 1000),
          timestamp: new Date().toISOString()
        });
      }

      // Record this request
      validRequests.push(now);
      requestCounts.set(clientId, validRequests);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.requests,
        'X-RateLimit-Remaining': limit.requests - validRequests.length,
        'X-RateLimit-Reset': Math.ceil((windowStart + limit.window * 1000) / 1000)
      });

      next();
    } catch (error) {
      console.error('[QNET Security] Rate limiting error:', error);
      next(); // Don't block on rate limiting errors
    }
  };
}

/**
 * Audit logging middleware
 */
export function auditLog(mockMode = false) {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log the request
      const auditEvent = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        identity: req.identity?.squidId || 'anonymous',
        subId: req.identity?.subId,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        requestId: req.id || crypto.randomUUID()
      };

      if (mockMode) {
        console.log('[QNET Audit]', JSON.stringify(auditEvent));
      } else {
        // In integrated mode, send to Qerberos
        sendToQerberos(auditEvent).catch(console.error);
      }

      originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req, res, next) => {
    // Security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
      'X-Powered-By': 'QNET/1.0'
    });

    next();
  };
}

// Helper functions

async function verifySquidIdentity(squidId, signature, timestamp) {
  // Mock implementation - in production would call sQuid service
  if (!signature || !timestamp) return false;
  
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  const timeDiff = Math.abs(now - requestTime);
  
  // Reject requests older than 5 minutes
  if (timeDiff > 300000) return false;
  
  // Mock signature verification
  return signature.length > 10;
}

async function getIdentityReputation(squidId) {
  // Mock implementation - in production would call sQuid service
  const hash = crypto.createHash('md5').update(squidId).digest('hex');
  const score = parseInt(hash.substring(0, 2), 16) / 255;
  return Math.max(0.1, score); // Minimum 0.1 reputation
}

function mockPermissionCheck(permission, squidId) {
  // Mock permission check based on identity hash
  const hash = crypto.createHash('md5').update(squidId + permission).digest('hex');
  const score = parseInt(hash.substring(0, 2), 16);
  return score > 64; // ~75% success rate
}

async function checkQonsentPermission(squidId, subId, permission, token) {
  // Mock implementation - in production would call Qonsent service
  if (!token) return false;
  
  // Mock token validation
  return token.length > 20;
}

async function sendToQerberos(auditEvent) {
  // Mock implementation - in production would send to Qerberos service
  console.log('[Qerberos Audit]', auditEvent);
}

export default {
  authenticateIdentity,
  authorizePermission,
  rateLimitByIdentity,
  auditLog,
  securityHeaders
};