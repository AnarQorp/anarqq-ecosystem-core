import expressPkg from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware imports
import { authRateLimiter, sensitiveRateLimiter } from '../middleware/rateLimit.js';
import { validateRegistration, validateLogin, validateUCAN, handleValidationErrors } from '../middleware/validation.js';
import { asyncHandler, errorHandler, validationErrorHandler, APIError } from '../middleware/errorHandler.js';
import appConfig from '../utils/config.js';
import * as UCAN from '@ucanto/core';
import * as DID from '@ipld/dag-ucan/did';
import { validateEnv } from '../utils/envValidator.js';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables and validate
validateEnv();

const router = expressPkg.Router();

// Ensure JWT secret is available immediately when this module is loaded.
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET no está definido en el entorno (auth.mjs)');
  process.exit(1);
}

// --- Mocked services ---
// These placeholders emulate DID and authorization logic until real
// implementations are integrated.

// Generate a pseudo-random DID for a user's personal space
async function createSpaceDID(userDID) {
  return `did:key:z6Mk${Math.random().toString(36).substring(2, 15)}`;
}

// Generate a pseudo-random DID for the user's agent
async function createAgentDID() {
  return `did:key:z6Mk${Math.random().toString(36).substring(2, 15)}`;
}

// Authorize an agent for a given space (mocked)
async function authorizeAgent(agentDID, spaceDID) {
  console.log(`[Auth] Authorizing ${agentDID} on ${spaceDID}`);
  return true;
}

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
// Register route handler function
const registerHandler = async (req, res, next) => {
  try {
    const { alias, email, password } = req.body;
    
    console.log(`[Auth] Registration request for alias: ${alias}`);
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate user DID (simplified version)
    const userDID = `did:qlock:${alias.toLowerCase()}_${Date.now()}`;

    // Create user object
    const user = {
      alias,
      email,
      passwordHash,
      userDID,
      createdAt: new Date().toISOString()
    };

    // Generate JWT token
    const token = jwt.sign(
      { userDID },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Generate space and agent DIDs
    const spaceDID = await createSpaceDID(userDID);
    const agentDID = await createAgentDID();

    // Authorize agent for space
    await authorizeAgent(agentDID, spaceDID);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        did: userDID,
        alias: user.alias,
        email: user.email,
        spaceDID,
        agentDID
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(new Error('Registration failed. Please try again.'));
  }
};

// Register route
router.post(
  '/register',
  authRateLimiter,
  validateRegistration,
  handleValidationErrors,
  asyncHandler(registerHandler)
);

// Login route handler function
const loginHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log(`[Auth] Login attempt for email: ${email}`);
    
    // TODO: Implement actual user lookup
    const user = {
      email,
      passwordHash: 'mocked_hash', // In real implementation, this would come from the database
      userDID: `did:qlock:${email.split('@')[0]}_${Date.now()}`
    };

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      throw new APIError('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userDID: user.userDID },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Generate space and agent DIDs (in a real app, these would be retrieved from the user's record)
    const spaceDID = await createSpaceDID(user.userDID);
    const agentDID = await createAgentDID();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        did: user.userDID,
        email: user.email,
        spaceDID,
        agentDID
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    next(error);
  }
};

/**
 * @route POST /auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  authRateLimiter,
  validateLogin,
  handleValidationErrors,
  asyncHandler(loginHandler)
);

/**
 * Verify UCAN token and extract claims
 * @param {string} ucanToken - The UCAN token to verify
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function verifyUCAN(ucanToken) {
  try {
    // Parse and validate the UCAN token
    const result = await UCAN.decode(ucanToken);
    
    // Verify issuer DID
    const did = result.issuer;
    if (!DID.is(did)) {
      throw new APIError('Invalid DID in UCAN token', 400);
    }

    // Check capabilities
    const hasLoginCapability = result.capabilities.some(
      cap => 
        cap.can === 'access/login' && 
        cap.with && 
        cap.with.startsWith('did:')
    );

    if (!hasLoginCapability) {
      throw new APIError('Missing required capability: access/login', 403);
    }

    return {
      success: true,
      data: {
        userDID: did,
        capabilities: result.capabilities
      }
    };
  } catch (error) {
    console.error('[Auth] UCAN verification error:', error);
    throw new APIError(
      error.message || 'Failed to verify UCAN token',
      error.statusCode || 400
    );
    return { 
      success: false, 
      error: 'Failed to verify UCAN',
      details: error.message 
    };
  }
}

/**
 * @route POST /auth/ucan-login
 * @desc Authenticate with UCAN token
 * @access Public
 */
const ucanLoginHandler = asyncHandler(async (req, res, next) => {
  try {
    const { ucan } = req.body;
    
    if (!ucan) {
      return res.status(400).json({
        success: false,
        error: 'UCAN token is required'
      });
    }

    const verification = await verifyUCAN(ucan);
    
    if (!verification.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid UCAN',
        details: verification.error,
        ...(verification.details && { debug: verification.details })
      });
    }

    // If we get here, the UCAN is valid
    res.json({
      success: true,
      ...verification.data
    });
  } catch (error) {
    console.error('[Auth] UCAN login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during UCAN verification',
      details: error.message
    });
  }
});

router.post(
  '/ucan-login',
  authRateLimiter,
  validateUCAN,
  ucanLoginHandler
);

/**
 * Handler for GET /auth/me
 * Gets the current user's profile using UCAN token
 */
const meHandler = asyncHandler(async (req, res, next) => {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required'
      });
    }

    // Extract the token (remove 'Bearer ' prefix)
    const ucanToken = authHeader.split(' ')[1];
    
    if (!ucanToken) {
      return res.status(401).json({
        success: false,
        error: 'UCAN token is required in Authorization header'
      });
    }

    // Verify the UCAN token
    const verification = await verifyUCAN(ucanToken);
    
    if (!verification.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid UCAN token',
        details: verification.error,
        ...(verification.details && { debug: verification.details })
      });
    }

    const { issuer, audience, proof, exp } = verification.data;
    
    // Additional check for audience
    if (audience !== 'did:web:anarq.coyotedron.com') {
      return res.status(403).json({
        success: false,
        error: 'Invalid audience in UCAN token',
        details: `Expected 'did:web:anarq.coyotedron.com', got '${audience}'`
      });
    }

    // Token is valid, return the claims
    return res.json({
      success: true,
      issuer,
      audience,
      exp,
      capabilities: [{
        can: 'access/login',
        with: issuer
      }]
    });
    
  } catch (error) {
    console.error('[Auth] ME endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during token verification',
      details: error.message
    });
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user's profile
 * @access Private (requires valid UCAN token)
 */
router.get(
  '/me',
  authRateLimiter,
  meHandler
);

// Test route with minimal handler
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test route works!' });
});

// Apply error handling middleware
router.use(errorHandler);

export default router;
