/**
 * sQuid Identity Authentication Middleware for Qsocial
 * Verifies sQuid identity signatures and manages authentication
 */

import crypto from 'crypto';

/**
 * Middleware to verify sQuid identity authentication
 * Validates DID, signature, and message integrity
 */
export const verifySquidIdentity = (req, res, next) => {
  try {
    const identityDID = req.header('X-Identity-DID');
    const signature = req.header('X-Signature');
    const message = req.header('X-Message');

    // Check if all required headers are present
    if (!identityDID || !signature || !message) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Missing sQuid identity headers (X-Identity-DID, X-Signature, X-Message)'
      });
    }

    // Parse the message to verify its structure
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid message format',
        message: 'X-Message header must contain valid JSON'
      });
    }

    // Verify message structure
    if (!parsedMessage.action || !parsedMessage.timestamp || !parsedMessage.did) {
      return res.status(400).json({
        error: 'Invalid message structure',
        message: 'Message must contain action, timestamp, and did fields'
      });
    }

    // Verify DID consistency
    if (parsedMessage.did !== identityDID) {
      return res.status(400).json({
        error: 'DID mismatch',
        message: 'DID in message does not match X-Identity-DID header'
      });
    }

    // Verify message timestamp (prevent replay attacks)
    const messageTime = new Date(parsedMessage.timestamp);
    const currentTime = new Date();
    const timeDiff = Math.abs(currentTime - messageTime);
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxAge) {
      return res.status(401).json({
        error: 'Message expired',
        message: 'Message timestamp is too old (max 5 minutes)'
      });
    }

    // For development/testing, we'll use a simple signature verification
    // In production, this would verify against the actual sQuid identity system
    const isValidSignature = verifySignature(message, signature, identityDID);
    
    if (!isValidSignature) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Signature verification failed'
      });
    }

    // Add identity information to request object
    req.squidIdentity = {
      did: identityDID,
      signature: signature,
      message: parsedMessage,
      isAuthenticated: true
    };

    // Add user ID for backward compatibility with existing middleware
    req.user = {
      id: identityDID,
      did: identityDID
    };

    console.log(`[sQuid Auth] Authenticated user: ${identityDID}`);
    next();

  } catch (error) {
    console.error('[sQuid Auth] Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal authentication error'
    });
  }
};

/**
 * Middleware for optional authentication
 * Allows both authenticated and anonymous access
 */
export const optionalSquidAuth = (req, res, next) => {
  const identityDID = req.header('X-Identity-DID');
  
  if (!identityDID) {
    // No authentication provided, continue as anonymous
    req.squidIdentity = null;
    req.user = null;
    next();
    return;
  }

  // Authentication provided, verify it
  verifySquidIdentity(req, res, next);
};

/**
 * Simple signature verification for development
 * In production, this would integrate with the actual sQuid signature verification
 */
function verifySignature(message, signature, did) {
  try {
    // For development, we'll create a deterministic signature based on message and DID
    // This simulates signature verification without requiring actual cryptographic keys
    const expectedSignature = createMockSignature(message, did);
    return signature === expectedSignature;
  } catch (error) {
    console.error('[sQuid Auth] Signature verification error:', error);
    return false;
  }
}

/**
 * Create a mock signature for development
 * This simulates what the frontend would generate using SHA-256
 */
function createMockSignature(message, did) {
  const data = `${message}:${did}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Middleware to check if user has sufficient reputation for an action
 */
export const requireReputation = (minReputation = 0) => {
  return async (req, res, next) => {
    if (!req.squidIdentity) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'This action requires authentication'
      });
    }

    try {
      // In a real implementation, this would fetch reputation from database
      // For now, we'll simulate reputation based on DID
      const userReputation = await getUserReputation(req.squidIdentity.did);
      
      if (userReputation < minReputation) {
        return res.status(403).json({
          error: 'Insufficient reputation',
          message: `This action requires ${minReputation} reputation points. You have ${userReputation}.`
        });
      }

      req.userReputation = userReputation;
      next();

    } catch (error) {
      console.error('[sQuid Auth] Reputation check error:', error);
      res.status(500).json({
        error: 'Reputation check failed',
        message: 'Could not verify user reputation'
      });
    }
  };
};

/**
 * Mock function to get user reputation
 * In production, this would query the reputation database
 */
async function getUserReputation(did) {
  // Simulate reputation based on DID hash
  const hash = crypto.createHash('md5').update(did).digest('hex');
  const reputation = parseInt(hash.substring(0, 4), 16) % 1000;
  return reputation;
}

/**
 * Middleware to check if user can moderate a subcommunity
 */
export const requireModerationRights = (subcommunityId = null) => {
  return async (req, res, next) => {
    if (!req.squidIdentity) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Moderation actions require authentication'
      });
    }

    try {
      const canModerate = await checkModerationRights(
        req.squidIdentity.did, 
        subcommunityId || req.params.subcommunityId
      );
      
      if (!canModerate) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have moderation rights for this community'
        });
      }

      next();

    } catch (error) {
      console.error('[sQuid Auth] Moderation rights check error:', error);
      res.status(500).json({
        error: 'Permission check failed',
        message: 'Could not verify moderation rights'
      });
    }
  };
};

/**
 * Mock function to check moderation rights
 * In production, this would query the subcommunity database
 */
async function checkModerationRights(did, subcommunityId) {
  // For development, simulate moderation rights
  // In production, this would check if user is a moderator of the subcommunity
  const reputation = await getUserReputation(did);
  return reputation > 500; // Users with >500 reputation can moderate
}

/**
 * Rate limiting middleware for authenticated users
 */
export const rateLimitByIdentity = (maxRequests = 100, windowMs = 60000) => {
  const requestCounts = new Map();

  return (req, res, next) => {
    const identifier = req.squidIdentity?.did || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, data] of requestCounts.entries()) {
      if (data.timestamp < windowStart) {
        requestCounts.delete(key);
      }
    }

    // Check current user's requests
    const userRequests = requestCounts.get(identifier) || { count: 0, timestamp: now };
    
    if (userRequests.timestamp < windowStart) {
      userRequests.count = 1;
      userRequests.timestamp = now;
    } else {
      userRequests.count++;
    }

    requestCounts.set(identifier, userRequests);

    if (userRequests.count > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`
      });
    }

    next();
  };
};

export default {
  verifySquidIdentity,
  optionalSquidAuth,
  requireReputation,
  requireModerationRights,
  rateLimitByIdentity
};