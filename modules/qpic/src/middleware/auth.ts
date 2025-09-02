import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { logger } from '../utils/logger';
import { SquidService } from '../services/SquidService';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      squidId: string;
      subId?: string;
      daoId?: string;
      permissions?: string[];
    };
  }
}

async function authMiddleware(fastify: FastifyInstance) {
  const squidService = new SquidService();

  fastify.decorateRequest('user', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health checks and mock endpoints
    if (request.url.startsWith('/api/v1/health') || 
        request.url.startsWith('/mock/') ||
        request.url.startsWith('/docs')) {
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.substring(7);
      
      // Verify token with sQuid service
      const identity = await squidService.verifyIdentity(token);
      
      if (!identity) {
        return reply.code(401).send({
          status: 'error',
          code: 'SQUID_IDENTITY_INVALID',
          message: 'Invalid identity token',
          timestamp: new Date().toISOString()
        });
      }

      // Extract identity information from headers
      const squidId = request.headers['x-squid-id'] as string || identity.squidId;
      const subId = request.headers['x-subid'] as string;
      const daoId = request.headers['x-dao-id'] as string;

      request.user = {
        squidId,
        subId,
        daoId,
        permissions: identity.permissions || []
      };

      logger.debug('User authenticated', { squidId, subId, daoId });

    } catch (error) {
      logger.error('Authentication error:', error);
      return reply.code(401).send({
        status: 'error',
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      });
    }
  });
}

export { authMiddleware };

export default fp(authMiddleware, {
  name: 'auth-middleware'
});