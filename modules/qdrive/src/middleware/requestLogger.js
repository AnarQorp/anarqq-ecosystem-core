import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  // Add request ID
  req.id = uuidv4();
  
  // Log request start
  const startTime = Date.now();
  
  logger.info('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    });
    
    originalEnd.call(this, chunk, encoding);
  };

  next();
};