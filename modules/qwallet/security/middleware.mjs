/**
 * Qwallet Security Middleware
 * 
 * Provides authentication, authorization, and security controls for Qwallet operations
 */

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

/**
 * sQuid Identity Authentication Middleware
 */
export const authenticateSquid = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const squidId = req.headers['x-squid-id'];
    const subId = req.headers['x-subid'];
    const signature = req.headers['x-sig'];
    const timestamp = req.headers['x-ts'];

    if (!authHeader || !squidId || !signature || !timestamp) {
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_AUTH_REQUIRED',
        message: 'sQuid authentication required',
        details: {
          required: ['authorization', 'x-squid-id', 'x-sig', 'x-ts'],
          provided: Object.keys(req.headers).filter(h => h.startsWith('x-') || h === 'authorization')
        }
      });
    }

    // Verify timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 300000) { // 5 minutes
      return res.status(401).json({
        status: 'error',
        code: 'TIMESTAMP_EXPIRED',
        message: 'Request timestamp expired',
        details: { maxAge: '5 minutes' }
      });
    }

    // In standalone mode, use mock verification
    if (process.env.QWALLET_MODE === 'standalone' || process.env.QWALLET_MOCK_SERVICES === 'true') {
      req.identity = {
        squidId,
        subId,
        verified: true,
        mock: true
      };
      return next();
    }

    // Verify identity with sQuid service
    const squidResponse = await fetch(`${process.env.SQUID_SERVICE_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        squidId,
        subId,
        signature,
        timestamp,
        requestHash: crypto.createHash('sha256').update(req.originalUrl + JSON.stringify(req.body)).digest('hex')
      })
    });

    if (!squidResponse.ok) {
      return res.status(401).json({
        status: 'error',
        code: 'SQUID_VERIFICATION_FAILED',
        message: 'Identity verification failed'
      });
    }

    const identityData = await squidResponse.json();
    req.identity = {
      squidId,
      subId,
      verified: true,
      reputation: identityData.reputation,
      daoMemberships: identityData.daoMemberships
    };

    next();
  } catch (error) {
    console.error('[Qwallet Security] Authentication error:', error);
    res.status(500).json({
      status: 'error',
      code: 'AUTH_SERVICE_ERROR',
      message: 'Authentication service unavailable'
    });
  }
};

/**
 * Qonsent Permission Authorization Middleware
 */
export const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { squidId, subId } = req.identity;
      const consentToken = req.headers['x-qonsent'];

      if (!consentToken) {
        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_TOKEN_REQUIRED',
          message: 'Permission token required',
          details: { requiredPermission }
        });
      }

      // In standalone mode, use mock authorization
      if (process.env.QWALLET_MODE === 'standalone' || process.env.QWALLET_MOCK_SERVICES === 'true') {
        req.permissions = {
          [requiredPermission]: true,
          mock: true
        };
        return next();
      }

      // Check permission with Qonsent service
      const qonsentResponse = await fetch(`${process.env.QONSENT_SERVICE_URL}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-squid-id': squidId,
          'x-subid': subId || '',
          'x-qonsent': consentToken
        },
        body: JSON.stringify({
          permission: requiredPermission,
          resource: req.originalUrl,
          action: req.method
        })
      });

      if (!qonsentResponse.ok) {
        return res.status(403).json({
          status: 'error',
          code: 'QONSENT_DENIED',
          message: 'Permission denied',
          details: { requiredPermission }
        });
      }

      const permissionData = await qonsentResponse.json();
      req.permissions = permissionData.permissions;

      next();
    } catch (error) {
      console.error('[Qwallet Security] Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'AUTH_SERVICE_ERROR',
        message: 'Authorization service unavailable'
      });
    }
  };
};

/**
 * Transaction Signature Verification Middleware
 */
export const verifyTransactionSignature = async (req, res, next) => {
  try {
    const { signature, transactionData } = req.body;
    const { squidId } = req.identity;

    if (!signature || !transactionData) {
      return res.status(400).json({
        status: 'error',
        code: 'SIGNATURE_REQUIRED',
        message: 'Transaction signature required'
      });
    }

    // In standalone mode, use mock verification
    if (process.env.QWALLET_MODE === 'standalone' || process.env.QWALLET_MOCK_SERVICES === 'true') {
      req.signatureVerified = true;
      return next();
    }

    // Verify signature with Qlock service
    const qlockResponse = await fetch(`${process.env.QLOCK_SERVICE_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-squid-id': squidId
      },
      body: JSON.stringify({
        signature,
        data: transactionData,
        algorithm: 'ed25519'
      })
    });

    if (!qlockResponse.ok) {
      return res.status(400).json({
        status: 'error',
        code: 'SIGNATURE_INVALID',
        message: 'Invalid transaction signature'
      });
    }

    req.signatureVerified = true;
    next();
  } catch (error) {
    console.error('[Qwallet Security] Signature verification error:', error);
    res.status(500).json({
      status: 'error',
      code: 'SIGNATURE_SERVICE_ERROR',
      message: 'Signature verification service unavailable'
    });
  }
};

/**
 * Spending Limit Enforcement Middleware
 */
export const enforceSpendingLimits = async (req, res, next) => {
  try {
    const { squidId, daoMemberships } = req.identity;
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return next(); // Skip if no amount specified
    }

    // Get current spending for the identity
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    // Mock spending limits for standalone mode
    const limits = {
      daily: process.env.QWALLET_DAILY_LIMIT || 1000,
      monthly: process.env.QWALLET_MONTHLY_LIMIT || 10000,
      dao: process.env.QWALLET_DAO_LIMIT || 50000
    };

    // In a real implementation, this would query the database
    const currentSpending = {
      daily: 0,
      monthly: 0,
      dao: 0
    };

    // Check daily limit
    if (currentSpending.daily + amount > limits.daily) {
      return res.status(403).json({
        status: 'error',
        code: 'DAILY_LIMIT_EXCEEDED',
        message: 'Daily spending limit exceeded',
        details: {
          limit: limits.daily,
          current: currentSpending.daily,
          attempted: amount,
          currency
        }
      });
    }

    // Check monthly limit
    if (currentSpending.monthly + amount > limits.monthly) {
      return res.status(403).json({
        status: 'error',
        code: 'MONTHLY_LIMIT_EXCEEDED',
        message: 'Monthly spending limit exceeded',
        details: {
          limit: limits.monthly,
          current: currentSpending.monthly,
          attempted: amount,
          currency
        }
      });
    }

    // Check DAO limits if applicable
    if (daoMemberships && daoMemberships.length > 0) {
      for (const dao of daoMemberships) {
        if (currentSpending.dao + amount > limits.dao) {
          return res.status(403).json({
            status: 'error',
            code: 'DAO_LIMIT_EXCEEDED',
            message: 'DAO spending limit exceeded',
            details: {
              daoId: dao.id,
              limit: limits.dao,
              current: currentSpending.dao,
              attempted: amount,
              currency
            }
          });
        }
      }
    }

    req.spendingLimits = {
      daily: { limit: limits.daily, used: currentSpending.daily },
      monthly: { limit: limits.monthly, used: currentSpending.monthly },
      dao: { limit: limits.dao, used: currentSpending.dao }
    };

    next();
  } catch (error) {
    console.error('[Qwallet Security] Spending limit check error:', error);
    res.status(500).json({
      status: 'error',
      code: 'LIMIT_CHECK_ERROR',
      message: 'Unable to verify spending limits'
    });
  }
};

/**
 * Rate Limiting Middleware
 */
export const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Rate limit by identity if available, otherwise by IP
      return req.identity?.squidId || req.ip;
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Payment-specific rate limiting
 */
export const paymentRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment operations per minute
  message: {
    status: 'error',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
    message: 'Too many payment requests, please wait before trying again'
  }
});

/**
 * High-value transaction additional security
 */
export const highValueTransactionSecurity = (threshold = 1000) => {
  return async (req, res, next) => {
    try {
      const { amount, currency } = req.body;

      if (!amount || amount < threshold) {
        return next();
      }

      // Require additional verification for high-value transactions
      const mfaToken = req.headers['x-mfa-token'];
      if (!mfaToken) {
        return res.status(403).json({
          status: 'error',
          code: 'MFA_REQUIRED',
          message: 'Multi-factor authentication required for high-value transactions',
          details: {
            threshold,
            amount,
            currency
          }
        });
      }

      // In standalone mode, accept any MFA token
      if (process.env.QWALLET_MODE === 'standalone' || process.env.QWALLET_MOCK_SERVICES === 'true') {
        req.mfaVerified = true;
        return next();
      }

      // Verify MFA token with authentication service
      // Implementation would depend on the MFA provider
      req.mfaVerified = true;
      next();
    } catch (error) {
      console.error('[Qwallet Security] High-value transaction security error:', error);
      res.status(500).json({
        status: 'error',
        code: 'SECURITY_CHECK_ERROR',
        message: 'Unable to perform security checks'
      });
    }
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.validatedBody = value;
    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

export default {
  authenticateSquid,
  authorizePermission,
  verifyTransactionSignature,
  enforceSpendingLimits,
  createRateLimit,
  paymentRateLimit,
  highValueTransactionSecurity,
  validateRequest,
  securityHeaders
};