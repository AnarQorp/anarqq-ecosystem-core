/**
 * Standardized Authentication and Authorization Middleware
 * Implements Q ecosystem transversal compliance requirements
 * 
 * Features:
 * - sQuid identity verification with standard headers
 * - Qonsent permission checking with deny-by-default policies
 * - Rate limiting with identity/subID/DAO-based limits
 * - Qerberos integration for security event logging
 */

import crypto from 'crypto';

// Standard error codes as defined in the design document
export const ErrorCodes = {
  QLOCK_AUTH_FAIL: 'QLOCK_AUTH_FAIL',
  QONSENT_DENIED: 'QONSENT_DENIED',
  SQUID_IDENTITY_INVALID: 'SQUID_IDENTITY_INVALID',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QERB_SUSPECT: 'QERB_SUSPECT',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
};

// Standard response format
const createStandardResponse = (status, code, message, data = null, cid = null) => ({
  status,
  code,
  message,
  ...(data && { data }),
  ...(cid && { cid }),
  timestamp: new Date().toISOString(),
  requestId: crypto.randomUUID()
});

// In-memory stores for development (would be replaced with Redis/database in production)
const rateLimitStore = new Map();
const auditEventStore = new Map();
const consentStore = new Map();

/**
 * sQuid Identity Verification Middleware
 * Validates identity through standard headers with signature verification
 */
export const verifySquidIdentity = (options = {}) => {
  const { required = true, allowAnonymous = false } = options;

  return async (req, res, next) => {
    try {
      // Extract standard headers
      const squidId = req.headers['x-squid-id'];
      const subId = req.headers['x-subid'];
      const signature = req.headers['x-sig'];
      const timestamp = req.headers['x-ts'];
      const apiVersion = req.headers['x-api-version'];

      // Check if authentication is required
      if (required && !squidId) {
        await logSecurityEvent(req, 'AUTH_MISSING', 'DENY', {
          reason: 'Missing sQuid identity header',
          headers: Object.keys(req.headers)
        });

        return res.status(401).json(createStandardResponse(
          'error',
          ErrorCodes.SQUID_IDENTITY_INVALID,
          'sQuid identity required. Missing x-squid-id header.'
        ));
      }

      // Allow anonymous access if configured
      if (!squidId && allowAnonymous) {
        req.identity = null;
        await logSecurityEvent(req, 'AUTH_SUCCESS', 'ALLOW', {
          reason: 'Anonymous access allowed'
        });
        return next();
      }

      // Validate required headers for authenticated requests
      if (squidId && (!signature || !timestamp)) {
        await logSecurityEvent(req, 'AUTH_INCOMPLETE', 'DENY', {
          reason: 'Missing required authentication headers',
          squidId,
          hasSignature: !!signature,
          hasTimestamp: !!timestamp
        });

        return res.status(401).json(createStandardResponse(
          'error',
          ErrorCodes.SQUID_IDENTITY_INVALID,
          'Incomplete authentication. Required headers: x-squid-id, x-sig, x-ts'
        ));
      }

      // Validate timestamp to prevent replay attacks
      if (timestamp) {
        const requestTime = new Date(parseInt(timestamp));
        const currentTime = new Date();
        const timeDiff = Math.abs(currentTime - requestTime);
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (timeDiff > maxAge) {
          await logSecurityEvent(req, 'REPLAY_ATTACK', 'DENY', {
            reason: 'Request timestamp too old',
            squidId,
            timestamp,
            timeDiff
          });

          return res.status(401).json(createStandardResponse(
            'error',
            ErrorCodes.QLOCK_AUTH_FAIL,
            'Request timestamp expired. Maximum age: 5 minutes.'
          ));
        }
      }

      // Verify signature (mock implementation for development)
      if (signature && !await verifyQlockSignature(req, squidId, signature, timestamp)) {
        await logSecurityEvent(req, 'SIGNATURE_INVALID', 'DENY', {
          reason: 'Invalid signature verification',
          squidId,
          subId
        });

        return res.status(401).json(createStandardResponse(
          'error',
          ErrorCodes.SIGNATURE_INVALID,
          'Invalid signature verification failed.'
        ));
      }

      // Create identity context
      req.identity = {
        squidId,
        subId,
        apiVersion,
        timestamp: parseInt(timestamp),
        isAuthenticated: true,
        signature
      };

      // Log successful authentication
      await logSecurityEvent(req, 'AUTH_SUCCESS', 'ALLOW', {
        squidId,
        subId,
        apiVersion
      });

      next();

    } catch (error) {
      console.error('[StandardAuth] Identity verification error:', error);
      
      await logSecurityEvent(req, 'AUTH_ERROR', 'DENY', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json(createStandardResponse(
        'error',
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Authentication service error.'
      ));
    }
  };
};

/**
 * Qonsent Permission Checking Middleware
 * Implements deny-by-default authorization with granular permissions
 */
export const checkQonsentPermission = (requiredPermission, options = {}) => {
  const { resource = null, action = null, denyByDefault = true } = options;

  return async (req, res, next) => {
    try {
      // Deny by default if no identity
      if (denyByDefault && !req.identity) {
        await logSecurityEvent(req, 'PERMISSION_DENIED', 'DENY', {
          reason: 'No authenticated identity',
          requiredPermission,
          resource,
          action
        });

        return res.status(401).json(createStandardResponse(
          'error',
          ErrorCodes.QONSENT_DENIED,
          'Authentication required for this operation.'
        ));
      }

      // Extract consent token from headers
      const consentToken = req.headers['x-qonsent'];
      
      if (!consentToken && denyByDefault) {
        await logSecurityEvent(req, 'CONSENT_MISSING', 'DENY', {
          reason: 'Missing consent token',
          squidId: req.identity?.squidId,
          requiredPermission,
          resource,
          action
        });

        return res.status(403).json(createStandardResponse(
          'error',
          ErrorCodes.QONSENT_DENIED,
          'Permission denied. Missing consent token.'
        ));
      }

      // Verify permission (mock implementation for development)
      const hasPermission = await verifyQonsentPermission(
        req.identity,
        consentToken,
        requiredPermission,
        resource,
        action
      );

      if (!hasPermission) {
        await logSecurityEvent(req, 'PERMISSION_DENIED', 'DENY', {
          reason: 'Insufficient permissions',
          squidId: req.identity?.squidId,
          subId: req.identity?.subId,
          requiredPermission,
          resource,
          action,
          consentToken: consentToken ? 'present' : 'missing'
        });

        return res.status(403).json(createStandardResponse(
          'error',
          ErrorCodes.QONSENT_DENIED,
          `Permission denied. Required: ${requiredPermission}${resource ? ` on ${resource}` : ''}`
        ));
      }

      // Add permission context to request
      req.permissions = {
        granted: requiredPermission,
        resource,
        action,
        consentToken
      };

      // Log successful permission check
      await logSecurityEvent(req, 'PERMISSION_GRANTED', 'ALLOW', {
        squidId: req.identity?.squidId,
        subId: req.identity?.subId,
        permission: requiredPermission,
        resource,
        action
      });

      next();

    } catch (error) {
      console.error('[StandardAuth] Permission check error:', error);
      
      await logSecurityEvent(req, 'PERMISSION_ERROR', 'DENY', {
        error: error.message,
        squidId: req.identity?.squidId,
        requiredPermission
      });

      res.status(500).json(createStandardResponse(
        'error',
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Permission service error.'
      ));
    }
  };
};

/**
 * Rate Limiting Middleware with Identity/SubID/DAO-based limits
 * Implements adaptive rate limiting with reputation scoring
 */
export const rateLimitByIdentity = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    maxRequestsPerSubId = 50,
    maxRequestsPerDAO = 200,
    enableAdaptiveLimits = true,
    enableExponentialBackoff = true
  } = options;

  return async (req, res, next) => {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Determine rate limit key based on identity hierarchy
      const rateLimitKey = getRateLimitKey(req);
      const limits = await calculateRateLimits(req, {
        maxRequests,
        maxRequestsPerSubId,
        maxRequestsPerDAO,
        enableAdaptiveLimits
      });

      // Clean expired entries
      cleanExpiredRateLimitEntries(windowStart);

      // Get current request count
      const requestData = rateLimitStore.get(rateLimitKey) || {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        violations: 0
      };

      // Reset window if expired
      if (requestData.firstRequest < windowStart) {
        requestData.count = 0;
        requestData.firstRequest = now;
        requestData.violations = Math.max(0, requestData.violations - 1); // Decay violations
      }

      // Increment request count
      requestData.count++;
      requestData.lastRequest = now;

      // Check rate limits
      const applicable_limit = getApplicableLimit(req, limits);
      const isRateLimited = requestData.count > applicable_limit;

      if (isRateLimited) {
        requestData.violations++;
        rateLimitStore.set(rateLimitKey, requestData);

        // Calculate exponential backoff
        const backoffMultiplier = enableExponentialBackoff ? Math.pow(2, Math.min(requestData.violations, 10)) : 1;
        const retryAfter = Math.floor((windowMs / 1000) * backoffMultiplier);

        await logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', 'DENY', {
          rateLimitKey,
          requestCount: requestData.count,
          limit: applicable_limit,
          violations: requestData.violations,
          retryAfter,
          squidId: req.identity?.squidId,
          subId: req.identity?.subId
        });

        // Check for suspicious patterns
        if (requestData.violations > 5) {
          await logSecurityEvent(req, 'SUSPICIOUS_ACTIVITY', 'WARN', {
            reason: 'Repeated rate limit violations',
            rateLimitKey,
            violations: requestData.violations,
            squidId: req.identity?.squidId
          });
        }

        return res.status(429)
          .header('Retry-After', retryAfter)
          .header('X-RateLimit-Limit', applicable_limit)
          .header('X-RateLimit-Remaining', 0)
          .header('X-RateLimit-Reset', Math.floor((requestData.firstRequest + windowMs) / 1000))
          .json(createStandardResponse(
            'error',
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            {
              limit: applicable_limit,
              retryAfter,
              violations: requestData.violations
            }
          ));
      }

      // Update request data
      rateLimitStore.set(rateLimitKey, requestData);

      // Add rate limit headers
      res.header('X-RateLimit-Limit', applicable_limit);
      res.header('X-RateLimit-Remaining', Math.max(0, applicable_limit - requestData.count));
      res.header('X-RateLimit-Reset', Math.floor((requestData.firstRequest + windowMs) / 1000));

      next();

    } catch (error) {
      console.error('[StandardAuth] Rate limiting error:', error);
      
      await logSecurityEvent(req, 'RATE_LIMIT_ERROR', 'WARN', {
        error: error.message,
        squidId: req.identity?.squidId
      });

      // Fail open for rate limiting errors
      next();
    }
  };
};

/**
 * Qerberos Security Event Logging
 * Logs security events for audit and anomaly detection
 */
async function logSecurityEvent(req, eventType, verdict, details = {}) {
  try {
    const auditEvent = {
      type: `AUTH_${eventType}`,
      ref: crypto.randomUUID(),
      actor: {
        squidId: req.identity?.squidId || 'anonymous',
        subId: req.identity?.subId || null,
        daoId: req.headers['x-dao-id'] || null
      },
      layer: 'authentication',
      verdict,
      details: {
        ...details,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      },
      cid: null // Would be set when storing in IPFS
    };

    // Store audit event (in production, this would go to Qerberos service)
    const eventId = crypto.randomUUID();
    auditEventStore.set(eventId, auditEvent);

    // In production, this would publish to event bus: q.qerberos.audit.v1
    console.log(`[Qerberos] ${eventType}:`, JSON.stringify(auditEvent, null, 2));

    return eventId;

  } catch (error) {
    console.error('[Qerberos] Failed to log security event:', error);
    return null;
  }
}

/**
 * Mock Qlock signature verification
 * In production, this would integrate with the actual Qlock service
 */
async function verifyQlockSignature(req, squidId, signature, timestamp) {
  try {
    // Create message to verify (in production, this would be more sophisticated)
    const message = `${req.method}:${req.path}:${squidId}:${timestamp}`;
    const expectedSignature = crypto.createHash('sha256')
      .update(message + ':mock-key')
      .digest('hex');

    return signature === expectedSignature;

  } catch (error) {
    console.error('[StandardAuth] Signature verification error:', error);
    return false;
  }
}

/**
 * Mock Qonsent permission verification
 * In production, this would integrate with the actual Qonsent service
 */
async function verifyQonsentPermission(identity, consentToken, permission, resource, action) {
  try {
    if (!identity || !consentToken) {
      return false;
    }

    // Mock permission check based on token structure
    const tokenData = consentStore.get(consentToken) || {
      squidId: identity.squidId,
      permissions: ['read', 'write'], // Mock permissions
      expires: Date.now() + 3600000 // 1 hour
    };

    // Check if token is expired
    if (Date.now() > tokenData.expires) {
      return false;
    }

    // Check if permission is granted
    return tokenData.permissions.includes(permission);

  } catch (error) {
    console.error('[StandardAuth] Permission verification error:', error);
    return false;
  }
}

/**
 * Generate rate limit key based on identity hierarchy
 */
function getRateLimitKey(req) {
  if (req.identity?.squidId) {
    const base = `squid:${req.identity.squidId}`;
    if (req.identity.subId) {
      return `${base}:sub:${req.identity.subId}`;
    }
    return base;
  }
  return `ip:${req.ip}`;
}

/**
 * Calculate adaptive rate limits based on reputation and context
 */
async function calculateRateLimits(req, baseLimits) {
  try {
    let limits = { ...baseLimits };

    if (req.identity?.squidId && baseLimits.enableAdaptiveLimits) {
      // Mock reputation-based adjustment
      const reputation = await getUserReputation(req.identity.squidId);
      const reputationMultiplier = Math.min(2.0, 1.0 + (reputation / 1000));
      
      limits.maxRequests = Math.floor(limits.maxRequests * reputationMultiplier);
      limits.maxRequestsPerSubId = Math.floor(limits.maxRequestsPerSubId * reputationMultiplier);
    }

    return limits;

  } catch (error) {
    console.error('[StandardAuth] Rate limit calculation error:', error);
    return baseLimits;
  }
}

/**
 * Get applicable rate limit for the request
 */
function getApplicableLimit(req, limits) {
  if (req.identity?.subId) {
    return limits.maxRequestsPerSubId;
  }
  if (req.identity?.squidId) {
    return limits.maxRequests;
  }
  return Math.floor(limits.maxRequests / 2); // Lower limit for anonymous users
}

/**
 * Clean expired rate limit entries
 */
function cleanExpiredRateLimitEntries(windowStart) {
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.firstRequest < windowStart) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Mock user reputation lookup
 */
async function getUserReputation(squidId) {
  // Mock reputation based on squidId hash
  const hash = crypto.createHash('md5').update(squidId).digest('hex');
  return parseInt(hash.substring(0, 4), 16) % 1000;
}

/**
 * Composite middleware for full authentication and authorization
 */
export const standardAuthMiddleware = (options = {}) => {
  const {
    requireAuth = true,
    requiredPermission = null,
    resource = null,
    action = null,
    rateLimitOptions = {}
  } = options;

  return [
    // 1. Rate limiting (applied first to prevent abuse)
    rateLimitByIdentity(rateLimitOptions),
    
    // 2. Identity verification
    verifySquidIdentity({ required: requireAuth, allowAnonymous: !requireAuth }),
    
    // 3. Permission checking (if required)
    ...(requiredPermission ? [checkQonsentPermission(requiredPermission, { resource, action })] : [])
  ];
};

export default {
  verifySquidIdentity,
  checkQonsentPermission,
  rateLimitByIdentity,
  standardAuthMiddleware,
  ErrorCodes
};