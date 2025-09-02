/**
 * Error handling middleware
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('ErrorHandler');

export function errorHandler(error, req, res, next) {
  // Log the error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determine error type and response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation Error',
      message: error.message,
      details: error.details || null,
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse = {
      error: 'Unauthorized',
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse = {
      error: 'Forbidden',
      message: 'Insufficient permissions',
      timestamp: new Date().toISOString()
    };
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse = {
      error: 'Not Found',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  } else if (error.message.includes('not initialized')) {
    statusCode = 503;
    errorResponse = {
      error: 'Service Unavailable',
      message: 'Service is not ready',
      timestamp: new Date().toISOString()
    };
  } else if (error.message.includes('Key must be')) {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid Key',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  } else if (error.message.includes('Value exceeds maximum size')) {
    statusCode = 413;
    errorResponse = {
      error: 'Payload Too Large',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'An unexpected error occurred';
    delete errorResponse.stack;
  } else if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
}