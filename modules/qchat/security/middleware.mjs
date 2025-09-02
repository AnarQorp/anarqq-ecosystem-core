/**
 * Qchat Security Middleware
 * Implements authentication, authorization, rate limiting, and security monitoring
 */

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createHash, createHmac } from 'crypto';

// Mock services for standalone mode
const mockServices = {
  squid: {
    async verifyIdentity(squidId, token) {
      // Mock identity verification
      if (process.env.QCHAT_MODE === 'standalone') {
        return {
          valid: true,
          identity: {
            squidId,
            reputation: 0.75,
            daoMemberships: ['dao_example_123'],
            subIdentities: ['sub_example_456']
          }
        };
      }
      // Real implementation would call sQuid service
      throw new Error('sQuid service not available');
    }
  },
  
  qonsent: {
    async checkPermission(squidId, resource, action, context = {}) {
      // Mock permission checking
      if (process.env.QCHAT_MODE === 'standalone') {
        // Grant basic permissions in standalone mode
        const basicPermissions = [
          'qchat:room:join',
          'qchat:message:send',
          'qchat:message:react',
          'qchat:room:leave'
        ];
        
        const adminPermissions = [
          'qchat:room:create',
          'qchat:room:moderate',
          'qchat:room:admin'
        ];
        
        const permission = `${resource}:${action}`;
        
        // Mock admin user
        if (squidId === 'squid_admin_123') {
          return { granted: true, scope: 'full' };
        }
        
        // Basic permissions for all users
        if (basicPermissions.includes(permission)) {
          return { granted: true, scope: 'basic' };
        }
        
        // Admin permissions for high reputation users
        if (adminPermissions.includes(permission)) {
          return { granted: false, reason: 'insufficient_privileges' };
        }
        
        return { granted: false, reason: 'permission_denied' };
      }
      // Real implementation would call Qonsent service
      throw new Error('Qonsent service not available');
    }
  },
  
  qerberos: {
    async reportSecurityEvent(event) {
      // Mock security event reporting
      if (process.env.QCHAT_MODE === 'standalone') {
        console.log('Security event reported:', event);
        return { eventId: `qerb_event_${Date.now()}`, riskScore: 0.1 };
      }
      // Real implementation would call Qerberos service
      throw new Error('Qerberos service not available');
    },
    
    async assessRisk(context) {
      // Mock risk assessment
      if (process.env.QCHAT_MODE === 'standalone') {
        return { riskScore: 0.1, factors: ['new_user'], recommendation: 'ALLOW' };
      }
      throw new Error('Qerberos service not available');
    }
  }
};

/**
 * JWT Authentication Middleware
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'Authentication token required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.QCHAT_JWT_SECRET || 'dev-secret');
    
    // Verify identity with sQuid
    const identityResult = await mockServices.squid.verifyIdentity(decoded.squidId, token);
    
    if (!identityResult.valid) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_IDENTITY',
        message: 'Identity verification failed',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Attach user context to request
    req.user = {
      squidId: decoded.squidId,
      subId: decoded.subId,
      daoId: decoded.daoId,
      identity: identityResult.identity,
      token
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token expired',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      code: 'AUTH_ERROR',
      message: 'Authentication service error',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
};

/**
 * Permission Authorization Middleware
 */
export const authorize = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      // Check permission with Qonsent
      const permissionResult = await mockServices.qonsent.checkPermission(
        req.user.squidId,
        resource,
        action,
        {
          roomId: req.params.roomId,
          messageId: req.params.messageId,
          userRole: req.user.role,
          reputation: req.user.identity?.reputation
        }
      );
      
      if (!permissionResult.granted) {
        // Report security event
        await mockServices.qerberos.reportSecurityEvent({
          type: 'PERMISSION_DENIED',
          squidId: req.user.squidId,
          resource,
          action,
          reason: permissionResult.reason,
          timestamp: new Date().toISOString(),
          context: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            roomId: req.params.roomId
          }
        });
        
        return res.status(403).json({
          status: 'error',
          code: 'PERMISSION_DENIED',
          message: `Permission denied for ${resource}:${action}`,
          details: { reason: permissionResult.reason },
          timestamp: new Date().toISOString(),
          requestId: req.id
        });
      }
      
      // Attach permission context
      req.permission = {
        resource,
        action,
        scope: permissionResult.scope,
        granted: true
      };
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
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
 * Reputation-based Rate Limiting
 */
export const createReputationRateLimit = () => {
  return rateLimit({
    windowMs: parseInt(process.env.QCHAT_RATE_LIMIT_WINDOW) || 60000, // 1 minute
    keyGenerator: (req) => {
      return req.user?.squidId || req.ip;
    },
    max: (req) => {
      const reputation = req.user?.identity?.reputation || 0;
      const baseLimit = parseInt(process.env.QCHAT_RATE_LIMIT_MAX) || 100;
      
      // Adjust rate limit based on reputation
      if (reputation >= 0.8) {
        return baseLimit * 2; // High reputation users get double limit
      } else if (reputation >= 0.5) {
        return baseLimit; // Normal users get base limit
      } else if (reputation >= 0.3) {
        return Math.floor(baseLimit * 0.5); // Low reputation users get half limit
      } else {
        return Math.floor(baseLimit * 0.2); // Very low reputation users get 20% limit
      }
    },
    message: (req) => ({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: {
        windowMs: parseInt(process.env.QCHAT_RATE_LIMIT_WINDOW) || 60000,
        maxRequests: req.rateLimit?.limit || 100,
        remainingRequests: req.rateLimit?.remaining || 0,
        resetTime: new Date(Date.now() + (parseInt(process.env.QCHAT_RATE_LIMIT_WINDOW) || 60000))
      },
      timestamp: new Date().toISOString(),
      requestId: req.id
    }),
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: async (req) => {
      // Report rate limit violation
      await mockServices.qerberos.reportSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        squidId: req.user?.squidId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        context: {
          limit: req.rateLimit?.limit,
          windowMs: parseInt(process.env.QCHAT_RATE_LIMIT_WINDOW) || 60000
        }
      });
    }
  });
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = (req, res, next) => {
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CORS headers for WebSocket upgrade
  if (req.headers.upgrade === 'websocket') {
    res.setHeader('Access-Control-Allow-Origin', process.env.QCHAT_CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
};

/**
 * Request Signature Verification
 */
export const verifySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];
    const squidId = req.headers['x-squid-id'];
    
    if (!signature || !timestamp || !squidId) {
      return next(); // Signature verification is optional for some endpoints
    }
    
    // Verify timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - requestTime) > maxAge) {
      return res.status(401).json({
        status: 'error',
        code: 'TIMESTAMP_INVALID',
        message: 'Request timestamp too old or too far in future',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    // Verify signature (simplified for demo)
    const payload = JSON.stringify(req.body) + timestamp + squidId;
    const expectedSignature = createHmac('sha256', process.env.QCHAT_SIGNATURE_SECRET || 'dev-secret')
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({
        status: 'error',
        code: 'SIGNATURE_INVALID',
        message: 'Request signature verification failed',
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    req.signatureVerified = true;
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(500).json({
      status: 'error',
      code: 'SIGNATURE_ERROR',
      message: 'Signature verification error',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }
};

/**
 * Content Security Middleware
 */
export const contentSecurity = async (req, res, next) => {
  try {
    // Check for suspicious content patterns
    if (req.body && req.body.content) {
      const content = req.body.content;
      
      // Basic spam detection
      const spamPatterns = [
        /(.)\1{10,}/g, // Repeated characters
        /(https?:\/\/[^\s]+){5,}/g, // Multiple URLs
        /[A-Z]{20,}/g, // Excessive caps
        /(FREE|URGENT|CLICK HERE|BUY NOW){3,}/gi // Spam keywords
      ];
      
      const isSpam = spamPatterns.some(pattern => pattern.test(content));
      
      if (isSpam) {
        // Report potential spam
        await mockServices.qerberos.reportSecurityEvent({
          type: 'SPAM_DETECTED',
          squidId: req.user?.squidId,
          content: content.substring(0, 100), // First 100 chars for analysis
          timestamp: new Date().toISOString(),
          context: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            roomId: req.params.roomId
          }
        });
        
        // For now, just log and continue (could block in strict mode)
        console.warn('Potential spam detected from user:', req.user?.squidId);
      }
    }
    
    next();
  } catch (error) {
    console.error('Content security error:', error);
    next(); // Don't block on content security errors
  }
};

/**
 * Risk Assessment Middleware
 */
export const riskAssessment = async (req, res, next) => {
  try {
    const riskContext = {
      squidId: req.user?.squidId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      reputation: req.user?.identity?.reputation,
      action: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    };
    
    const riskResult = await mockServices.qerberos.assessRisk(riskContext);
    
    // Attach risk assessment to request
    req.riskAssessment = riskResult;
    
    // Block high-risk requests
    if (riskResult.riskScore > 0.8) {
      return res.status(403).json({
        status: 'error',
        code: 'HIGH_RISK_BLOCKED',
        message: 'Request blocked due to high risk assessment',
        details: {
          riskScore: riskResult.riskScore,
          factors: riskResult.factors
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    }
    
    next();
  } catch (error) {
    console.error('Risk assessment error:', error);
    next(); // Don't block on risk assessment errors
  }
};

export default {
  authenticateJWT,
  authorize,
  createReputationRateLimit,
  securityHeaders,
  verifySignature,
  contentSecurity,
  riskAssessment,
  mockServices
};