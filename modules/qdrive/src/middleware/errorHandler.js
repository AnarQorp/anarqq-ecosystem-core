import { logger } from '../utils/logger.js';
import { QdriveError } from '../utils/errors.js';

export const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known errors
  if (error instanceof QdriveError) {
    return res.status(error.statusCode).json({
      status: 'error',
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      requestId: req.id
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Handle multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      status: 'error',
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds maximum allowed size',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      code: 'UNEXPECTED_FILE',
      message: 'Unexpected file field',
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Handle generic errors
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
};