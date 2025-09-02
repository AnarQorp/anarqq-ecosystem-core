import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

export const rateLimitMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for health check
    if (request.url === '/health') {
      return;
    }

    // Get client identifier (IP or identity)
    const clientId = request.identity?.squidId || request.ip;
    const now = Date.now();
    const windowStart = now - config.rateLimitWindow;

    // Clean up old entries
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < windowStart) {
        delete rateLimitStore[key];
      }
    });

    // Get or create rate limit entry
    if (!rateLimitStore[clientId]) {
      rateLimitStore[clientId] = {
        count: 0,
        resetTime: now + config.rateLimitWindow
      };
    }

    const entry = rateLimitStore[clientId];

    // Reset if window has passed
    if (entry.resetTime < now) {
      entry.count = 0;
      entry.resetTime = now + config.rateLimitWindow;
    }

    // Check rate limit
    if (entry.count >= config.rateLimitMax) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      
      reply.code(429).send({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn
      });
      return;
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.rateLimitMax);
    reply.header('X-RateLimit-Remaining', Math.max(0, config.rateLimitMax - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    logger.debug(`Rate limit check for ${clientId}: ${entry.count}/${config.rateLimitMax}`);
  });
};