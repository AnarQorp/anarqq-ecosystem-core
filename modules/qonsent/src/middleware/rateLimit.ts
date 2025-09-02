import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { logger } from '../utils/logger';
import { CacheService } from '../utils/cache';
import { QonsentError, ErrorCodes } from '../utils/errors';

interface RateLimitOptions {
  max: number;
  window: number; // in milliseconds
  keyGenerator?: (request: any) => string;
  skipOnError?: boolean;
  skipSuccessfulRequests?: boolean;
}

const rateLimitMiddleware: FastifyPluginAsync = async (fastify) => {
  const cache = CacheService.getInstance();
  await cache.connect();

  const defaultOptions: RateLimitOptions = {
    max: config.rateLimit.max,
    window: config.rateLimit.window,
    keyGenerator: (request) => {
      // Use identity-based rate limiting if available
      const identity = request.identity?.squidId;
      if (identity) {
        return `rate_limit:identity:${identity}`;
      }
      
      // Fall back to IP-based rate limiting
      return `rate_limit:ip:${request.ip}`;
    },
    skipOnError: true,
    skipSuccessfulRequests: false,
  };

  // Add rate limiting hook
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for health checks
    const skipPaths = ['/health', '/ready', '/live', '/docs', '/documentation'];
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    try {
      const key = defaultOptions.keyGenerator!(request);
      const windowStart = Math.floor(Date.now() / defaultOptions.window) * defaultOptions.window;
      const windowKey = `${key}:${windowStart}`;

      // Get current count
      const currentCount = await cache.get(windowKey) || 0;

      // Check if limit exceeded
      if (currentCount >= defaultOptions.max) {
        // Log rate limit violation
        logger.warn('Rate limit exceeded', {
          key,
          currentCount,
          limit: defaultOptions.max,
          window: defaultOptions.window,
          identity: request.identity?.squidId,
          ip: request.ip,
          method: request.method,
          url: request.url,
        });

        // Calculate reset time
        const resetTime = windowStart + defaultOptions.window;
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        // Set rate limit headers
        reply.header('X-RateLimit-Limit', defaultOptions.max);
        reply.header('X-RateLimit-Remaining', 0);
        reply.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
        reply.header('Retry-After', retryAfter);

        throw new QonsentError(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          {
            limit: defaultOptions.max,
            window: defaultOptions.window,
            retryAfter,
            resetTime,
          },
          true
        );
      }

      // Increment counter
      const newCount = currentCount + 1;
      const ttl = Math.ceil(defaultOptions.window / 1000);
      await cache.set(windowKey, newCount, ttl);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', defaultOptions.max);
      reply.header('X-RateLimit-Remaining', Math.max(0, defaultOptions.max - newCount));
      reply.header('X-RateLimit-Reset', Math.ceil((windowStart + defaultOptions.window) / 1000));

      // Log rate limit info (debug level)
      logger.debug('Rate limit check', {
        key,
        count: newCount,
        limit: defaultOptions.max,
        remaining: Math.max(0, defaultOptions.max - newCount),
      });

    } catch (error) {
      if (error instanceof QonsentError) {
        throw error;
      }

      // If rate limiting fails and skipOnError is true, continue
      if (defaultOptions.skipOnError) {
        logger.error('Rate limiting error, skipping', { error });
        return;
      }

      throw new QonsentError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Rate limiting service error',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        true
      );
    }
  });

  // Add response hook to handle successful requests
  if (!defaultOptions.skipSuccessfulRequests) {
    fastify.addHook('onResponse', async (request, reply) => {
      // Only count successful requests if configured
      if (reply.statusCode >= 400) {
        // For failed requests, we might want to decrement the counter
        // This is optional and depends on the rate limiting strategy
        return;
      }

      // Log successful request for monitoring
      logger.debug('Successful request processed', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
        identity: request.identity?.squidId,
      });
    });
  }

  // Adaptive rate limiting based on identity reputation
  fastify.decorate('getAdaptiveRateLimit', async (request: any) => {
    const identity = request.identity?.squidId;
    if (!identity) {
      return defaultOptions;
    }

    try {
      // Get identity reputation (this would come from sQuid service)
      // For now, we'll use a simple mock implementation
      const reputation = await getIdentityReputation(identity);
      
      // Adjust rate limits based on reputation
      let multiplier = 1;
      if (reputation >= 0.8) {
        multiplier = 2; // High reputation gets 2x limit
      } else if (reputation >= 0.6) {
        multiplier = 1.5; // Good reputation gets 1.5x limit
      } else if (reputation < 0.3) {
        multiplier = 0.5; // Low reputation gets 0.5x limit
      }

      return {
        ...defaultOptions,
        max: Math.floor(defaultOptions.max * multiplier),
      };

    } catch (error) {
      logger.error('Failed to get adaptive rate limit', { error, identity });
      return defaultOptions;
    }
  });

  // Helper function to reset rate limit for an identity (admin function)
  fastify.decorate('resetRateLimit', async (identity: string) => {
    try {
      const key = `rate_limit:identity:${identity}`;
      await cache.deletePattern(`${key}:*`);
      
      logger.info('Rate limit reset', { identity });
      return true;

    } catch (error) {
      logger.error('Failed to reset rate limit', { error, identity });
      return false;
    }
  });
};

// Mock function to get identity reputation
async function getIdentityReputation(identity: string): Promise<number> {
  // In a real implementation, this would call the sQuid service
  // For now, return a random reputation score
  return Math.random();
}

export { rateLimitMiddleware };
export default fp(rateLimitMiddleware, {
  name: 'rate-limit-middleware',
});