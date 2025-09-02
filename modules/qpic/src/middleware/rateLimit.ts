import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { getRedisClient } from '../database/redis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  max: number;
  window: number;
  keyGenerator?: (request: any) => string;
  skipOnError?: boolean;
}

async function rateLimitMiddleware(fastify: FastifyInstance) {
  const redis = getRedisClient();

  async function rateLimit(
    key: string,
    options: RateLimitOptions
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const window = options.window;
    const max = options.max;
    
    const windowStart = Math.floor(now / window) * window;
    const redisKey = `rate_limit:${key}:${windowStart}`;
    
    try {
      const current = await redis.incr(redisKey);
      
      if (current === 1) {
        await redis.expire(redisKey, Math.ceil(window / 1000));
      }
      
      const remaining = Math.max(0, max - current);
      const resetTime = windowStart + window;
      
      return {
        allowed: current <= max,
        remaining,
        resetTime
      };
    } catch (error) {
      logger.error('Rate limit error:', error);
      
      if (options.skipOnError) {
        return {
          allowed: true,
          remaining: max,
          resetTime: now + window
        };
      }
      
      throw error;
    }
  }

  fastify.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for health checks and docs
    if (request.url.startsWith('/api/v1/health') || 
        request.url.startsWith('/docs') ||
        request.url.startsWith('/mock/')) {
      return;
    }

    try {
      // Generate rate limit key based on user identity or IP
      let key = request.ip;
      
      if (request.user?.squidId) {
        key = `user:${request.user.squidId}`;
        
        // Add subidentity if present
        if (request.user.subId) {
          key += `:sub:${request.user.subId}`;
        }
        
        // Add DAO context if present
        if (request.user.daoId) {
          key += `:dao:${request.user.daoId}`;
        }
      }

      // Different limits for different endpoints
      let rateLimitOptions: RateLimitOptions = {
        max: config.rateLimitMax,
        window: config.rateLimitWindow,
        skipOnError: true
      };

      // Higher limits for authenticated users
      if (request.user?.squidId) {
        rateLimitOptions.max = config.rateLimitMax * 2;
      }

      // Lower limits for upload endpoints
      if (request.url.includes('/upload')) {
        rateLimitOptions.max = Math.floor(rateLimitOptions.max / 4);
        rateLimitOptions.window = rateLimitOptions.window * 2;
      }

      // Lower limits for transcoding endpoints
      if (request.url.includes('/transcode')) {
        rateLimitOptions.max = Math.floor(rateLimitOptions.max / 10);
        rateLimitOptions.window = rateLimitOptions.window * 5;
      }

      const result = await rateLimit(key, rateLimitOptions);

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', rateLimitOptions.max);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        return reply.code(429).send({
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: {
            limit: rateLimitOptions.max,
            remaining: result.remaining,
            resetTime: result.resetTime
          },
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue on error to avoid blocking requests
    }
  });
}

export { rateLimitMiddleware };

export default fp(rateLimitMiddleware, {
  name: 'rate-limit-middleware'
});