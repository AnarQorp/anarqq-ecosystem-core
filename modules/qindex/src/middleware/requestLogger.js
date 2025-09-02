/**
 * Request logging middleware
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('HTTP');

export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    identity: req.headers['x-identity-id']
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      identity: req.headers['x-identity-id']
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}