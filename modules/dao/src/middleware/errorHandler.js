/**
 * Global error handler middleware
 */

import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: isDevelopment ? err.details : undefined,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'ForbiddenError' || err.status === 403) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? err.message : 'Internal server error',
    stack: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
}