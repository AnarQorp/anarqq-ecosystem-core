/**
 * Qmail Security Middleware
 * Implements authentication, authorization, and security policies
 */

import crypto from 'crypto';

// Mock integrations - in production these would be actual service calls
const mockSquidService = {
  async verifyIdentity(squidId, signature, timestamp) {
    // Mock identity verification
    if (!squidId || !signature) return false;
    
    // Simulate signature verification
    const isValid = signature.length > 10 && 
                   Math.abs(Date.now() - new Date(timestamp).getTime()) < 300000; // 5 min window
    
    console.log(`[sQuid] Identity verification for ${squidId}: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
  },

  async getIdentityInfo(squidId) {
    return {
      squidId,
      reputation: 0.85,
      verified: true,
      subidentities: [],
      daoMemberships: []
    };
  }
};

const mockQonsentService = {
  async checkPermission(squidId, action, resource, context = {}) {
    // Mock permission checking
    const permissions = {
      'message.send': true,
      'message.read': true,
      'message.delete': squidId === context.messageOwner,
      'admin.access': false
    };
    
    const hasPermission = permissions[action] !== false;
    console.log(`[Qonsent] Permission check ${squidId} -> ${action} on ${resource}: ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    return hasPermission;
  }
};

const mockQerberosService = {
  async analyzeMessage(content, metadata) {
    // Mock spam/threat analysis
    const spamScore = Math.random() * 0.1; // Low spam score for demo
    const riskScore = Math.random() * 0.05; // Low risk score for demo
    
    console.log(`[Qerberos] Message analysis - Spam: ${spamScore.toFixed(3)}, Risk: ${riskScore.toFixed(3)}`);
    
    return {
      spamScore,
      riskScore,
      threats: [],
      recommendation: spamScore > 0.7 ? 'BLOCK' : 'ALLOW'
    };
  },

  async logAuditEvent(event) {
    console.log(`[Qerberos] Audit event logged:`, {
      type: event.type,
      actor: event.actor,
      resource: event.resource,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Authentication middleware - verifies sQuid identity
 */
export const authenticateSquid = async (req, res, next) => {
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

    // Verify identity signature
    const isValid = await mockSquidService.verifyIdentity(squidId, signature, timestamp);
    
    if (!isValid) {
      await mockQerberosService.logAuditEvent({
        type: 'AUTH_FAILED',
        actor: squidId,
        resource: req.path,
        details: { reason: 'Invalid signature' }
      });
      
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_AUTH_FAIL',
        message: 'Invalid identity signature',
        timestamp: new Date().toISOString()
      });
    }

    // Get identity information
    const identityInfo = await mockSquidService.getIdentityInfo(squidId);
    
    // Attach identity to request
    req.identity = {
      squidId,
      subId: req.headers['x-subid'],
      ...identityInfo
    };

    // Log successful authentication
    await mockQerberosService.logAuditEvent({
      type: 'AUTH_SUCCESS',
      actor: squidId,
      resource: req.path
    });

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({
      status: 'error',
      code: 'AUTH_ERROR',
      message: 'Authentication error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Authorization middleware - checks permissions via Qonsent
 */
export const authorizeAction = (action, resourceExtractor = null) => {
  return async (req, res, next) => {
    try {
      const { squidId } = req.identity;
      const resource = resourceExtractor ? resourceExtractor(req) : req.path;
      
      // Build context for permission check
      const context = {
        method: req.method,
        path: req.path,
        messageOwner: req.params.squidId || req.body.senderId,
        ...req.body
      };

      // Check permission
      const hasPermission = await mockQonsentService.checkPermission(
        squidId, 
        action, 
        resource, 
        context
      );

      if (!hasPermission) {
        await mockQerberosService.logAuditEvent({
          type: 'AUTHZ_DENIED',
          actor: squidId,
          resource,
          details: { action, context }
        });

        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: `Permission denied for action: ${action}`,
          timestamp: new Date().toISOString()
        });
      }

      // Log successful authorization
      await mockQerberosService.logAuditEvent({
        type: 'AUTHZ_GRANTED',
        actor: squidId,
        resource,
        details: { action }
      });

      next();
    } catch (error) {
      console.error('[Authorization Middleware] Error:', error);
      res.status(500).json({
        status: 'error',
        code: 'AUTHZ_ERROR',
        message: 'Authorization error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Content security middleware - analyzes messages for spam/threats
 */
export const analyzeContent = async (req, res, next) => {
  try {
    if (req.method === 'POST' && req.body.content) {
      const analysis = await mockQerberosService.analyzeMessage(
        req.body.content,
        {
          subject: req.body.subject,
          senderId: req.identity.squidId,
          recipientId: req.body.recipientId,
          attachmentCount: req.body.attachments?.length || 0
        }
      );

      // Block high-risk messages
      if (analysis.recommendation === 'BLOCK') {
        await mockQerberosService.logAuditEvent({
          type: 'MESSAGE_BLOCKED',
          actor: req.identity.squidId,
          resource: 'message',
          details: { 
            reason: 'High spam/risk score',
            spamScore: analysis.spamScore,
            riskScore: analysis.riskScore
          }
        });

        return res.status(403).json({
          status: 'error',
          code: 'QERB_SUSPECT',
          message: 'Message blocked due to security analysis',
          timestamp: new Date().toISOString()
        });
      }

      // Attach analysis to request
      req.contentAnalysis = analysis;
    }

    next();
  } catch (error) {
    console.error('[Content Security Middleware] Error:', error);
    res.status(500).json({
      status: 'error',
      code: 'CONTENT_ANALYSIS_ERROR',
      message: 'Content analysis error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimitByIdentity = (maxRequests = 100, windowMs = 3600000) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const { squidId } = req.identity;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, data] of requestCounts.entries()) {
      if (data.timestamp < windowStart) {
        requestCounts.delete(key);
      }
    }
    
    // Get current count
    const currentData = requestCounts.get(squidId) || { count: 0, timestamp: now };
    
    if (currentData.timestamp < windowStart) {
      // Reset count for new window
      currentData.count = 1;
      currentData.timestamp = now;
    } else {
      currentData.count++;
    }
    
    requestCounts.set(squidId, currentData);
    
    // Check rate limit
    if (currentData.count > maxRequests) {
      mockQerberosService.logAuditEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        actor: squidId,
        resource: req.path,
        details: { count: currentData.count, limit: maxRequests }
      });
      
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - currentData.count),
      'X-RateLimit-Reset': new Date(currentData.timestamp + windowMs).toISOString()
    });
    
    next();
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Simple validation - in production use Joi or similar
      if (schema.required) {
        for (const field of schema.required) {
          if (!req.body[field]) {
            return res.status(400).json({
              status: 'error',
              code: 'VALIDATION_ERROR',
              message: `Required field missing: ${field}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      // Validate field lengths
      if (schema.maxLengths) {
        for (const [field, maxLength] of Object.entries(schema.maxLengths)) {
          if (req.body[field] && req.body[field].length > maxLength) {
            return res.status(400).json({
              status: 'error',
              code: 'VALIDATION_ERROR',
              message: `Field ${field} exceeds maximum length of ${maxLength}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('[Validation Middleware] Error:', error);
      res.status(500).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Audit logging middleware
 */
export const auditRequest = (eventType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Log request start
    await mockQerberosService.logAuditEvent({
      type: `${eventType}_START`,
      actor: req.identity?.squidId || 'anonymous',
      resource: req.path,
      details: {
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log request completion
      mockQerberosService.logAuditEvent({
        type: `${eventType}_COMPLETE`,
        actor: req.identity?.squidId || 'anonymous',
        resource: req.path,
        details: {
          statusCode: res.statusCode,
          duration,
          success: res.statusCode < 400
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Error handling middleware
 */
export const handleSecurityError = (err, req, res, next) => {
  console.error('[Security Error]:', err);
  
  // Log security error
  if (req.identity) {
    mockQerberosService.logAuditEvent({
      type: 'SECURITY_ERROR',
      actor: req.identity.squidId,
      resource: req.path,
      details: {
        error: err.message,
        stack: err.stack
      }
    });
  }
  
  // Don't expose internal errors
  res.status(500).json({
    status: 'error',
    code: 'SECURITY_ERROR',
    message: 'A security error occurred',
    timestamp: new Date().toISOString()
  });
};

export default {
  authenticateSquid,
  authorizeAction,
  analyzeContent,
  rateLimitByIdentity,
  validateRequest,
  auditRequest,
  handleSecurityError
};