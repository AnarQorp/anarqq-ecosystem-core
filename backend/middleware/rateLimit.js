import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import config from '../utils/config.js';

// In-memory store for development (fallback when Redis is not available)
const memoryStore = new Map();

/**
 * Rate limiting middleware to prevent abuse
 * @param {Object} options - Custom options for rate limiting
 * @returns {Function} Express middleware function
 */
export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: config.RATE_LIMIT_MAX || 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and in development
      return req.path === '/health' || config.NODE_ENV === 'development';
    },
    handler: (req, res) => {
      const retryAfter = Math.floor((options.windowMs || 15 * 60 * 1000) / 1000);
      res
        .status(429)
        .header('Retry-After', retryAfter)
        .json({
          success: false,
          error: options.message || 'Too many requests, please try again later.',
          retryAfter: retryAfter
        });
    },
    // Use in-memory store by default for now
    store: {
      // Simple in-memory store implementation
      incr: (key, cb) => {
        const now = Date.now();
        const entry = memoryStore.get(key) || { hits: 0, resetTime: now + (options.windowMs || 15 * 60 * 1000) };
        
        if (now > entry.resetTime) {
          entry.hits = 1;
          entry.resetTime = now + (options.windowMs || 15 * 60 * 1000);
        } else {
          entry.hits++;
        }
        
        memoryStore.set(key, entry);
        cb(null, entry.hits);
      },
      decrement: (key) => {
        const entry = memoryStore.get(key);
        if (entry && entry.hits > 0) {
          entry.hits--;
          memoryStore.set(key, entry);
        }
      },
      resetKey: (key) => {
        memoryStore.delete(key);
      }
    },
    ...options,
  };

  return rateLimit(defaultOptions);
};

// Default rate limiter for auth routes
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many login attempts, please try again later.',
});

// Stricter rate limiter for sensitive operations
export const sensitiveRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: 'Too many requests, please try again in an hour.',
});

// Cleanup function to close Redis connection
export const closeRateLimitStore = async () => {
  await redisClient.quit();
};
