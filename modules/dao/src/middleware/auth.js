/**
 * Authentication middleware
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'Authorization token required',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      squidId: decoded.squidId || decoded.sub,
      permissions: decoded.permissions || [],
      tokenType: decoded.tokenType || 'user'
    };

    logger.debug('User authenticated', {
      squidId: req.user.squidId,
      tokenType: req.user.tokenType
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      url: req.url,
      ip: req.ip
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        timestamp: new Date().toISOString()
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(401).json({
      status: 'error',
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
}