import { logger } from '../utils/logger.js';

// Simple in-memory rate limiter for demo
const rateLimitStore = new Map();

export const rateLimitMiddleware = (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  // Clean old entries
  if (Math.random() < 0.1) { // 10% chance to clean
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.resetTime > windowMs) {
        rateLimitStore.delete(k);
      }
    }
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.resetTime > windowMs) {
    entry = {
      count: 0,
      resetTime: now
    };
    rateLimitStore.set(key, entry);
  }

  // Check rate limit
  if (entry.count >= maxRequests) {
    logger.warn('Rate limit exceeded', { ip: req.ip, count: entry.count });
    
    return res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      retryAfter: Math.ceil((windowMs - (now - entry.resetTime)) / 1000),
      timestamp: new Date().toISOString()
    });
  }

  // Increment counter
  entry.count++;

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': Math.max(0, maxRequests - entry.count),
    'X-RateLimit-Reset': new Date(entry.resetTime + windowMs).toISOString()
  });

  next();
};