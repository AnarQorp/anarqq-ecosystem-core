import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../config';
import { logger } from '../utils/logger';
import { QonsentError, ErrorCodes } from '../utils/errors';
import { SquidClient } from '../clients/SquidClient';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: {
      squidId: string;
      subId?: string;
      daoId?: string;
      verified: boolean;
    };
  }
}

interface AuthHeaders {
  'x-squid-id'?: string;
  'x-subid'?: string;
  'x-qonsent'?: string;
  'x-sig'?: string;
  'x-ts'?: string;
  'x-api-version'?: string;
  authorization?: string;
}

const authMiddleware: FastifyPluginAsync = async (fastify) => {
  const squidClient = new SquidClient();

  // Register authentication hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authentication for health checks and documentation
    const skipAuthPaths = ['/health', '/docs', '/documentation'];
    if (skipAuthPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    try {
      const headers = request.headers as AuthHeaders;
      const authHeader = headers.authorization;
      const squidId = headers['x-squid-id'];
      const subId = headers['x-subid'];
      const signature = headers['x-sig'];
      const timestamp = headers['x-ts'];
      const apiVersion = headers['x-api-version'];

      // Check for required headers
      if (!authHeader && !squidId) {
        throw new QonsentError(
          ErrorCodes.INVALID_TOKEN,
          'Missing authentication token or sQuid ID'
        );
      }

      // Verify API version
      if (apiVersion && !['v1', 'v2'].includes(apiVersion)) {
        throw new QonsentError(
          ErrorCodes.VALIDATION_ERROR,
          'Unsupported API version'
        );
      }

      let identity: any = {};

      // Bearer token authentication
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
          throw new QonsentError(
            ErrorCodes.INVALID_TOKEN,
            'Invalid authorization header format'
          );
        }

        try {
          // Verify token with sQuid service
          const verificationResult = await squidClient.verifyToken(token);
          if (!verificationResult.valid) {
            throw new QonsentError(
              ErrorCodes.INVALID_TOKEN,
              'Invalid or expired token'
            );
          }

          identity = {
            squidId: verificationResult.identity.squidId,
            subId: verificationResult.identity.subId,
            daoId: verificationResult.identity.daoId,
            verified: true,
          };

        } catch (error) {
          logger.error('Token verification failed', { error, token: token.substring(0, 10) + '...' });
          throw new QonsentError(
            ErrorCodes.SQUID_SERVICE_ERROR,
            'Failed to verify authentication token'
          );
        }
      }

      // Header-based authentication (for MCP and internal services)
      else if (squidId) {
        // Verify signature if provided
        if (signature && timestamp) {
          try {
            const isValidSignature = await squidClient.verifySignature({
              squidId,
              signature,
              timestamp,
              payload: JSON.stringify(request.body || {}),
            });

            if (!isValidSignature) {
              throw new QonsentError(
                ErrorCodes.INVALID_TOKEN,
                'Invalid signature'
              );
            }
          } catch (error) {
            logger.error('Signature verification failed', { error, squidId });
            throw new QonsentError(
              ErrorCodes.SQUID_SERVICE_ERROR,
              'Failed to verify signature'
            );
          }
        }

        // Verify identity exists
        try {
          const identityExists = await squidClient.verifyIdentity(squidId);
          if (!identityExists) {
            throw new QonsentError(
              ErrorCodes.IDENTITY_NOT_FOUND,
              'Identity not found'
            );
          }

          identity = {
            squidId,
            subId,
            verified: !!signature, // Only consider verified if signature was provided
          };

        } catch (error) {
          logger.error('Identity verification failed', { error, squidId });
          throw new QonsentError(
            ErrorCodes.SQUID_SERVICE_ERROR,
            'Failed to verify identity'
          );
        }
      }

      // Attach identity to request
      request.identity = identity;

      // Log authentication success
      logger.debug('Authentication successful', {
        squidId: identity.squidId,
        subId: identity.subId,
        verified: identity.verified,
        method: request.method,
        url: request.url,
      });

    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: request.method,
        url: request.url,
        headers: {
          'x-squid-id': request.headers['x-squid-id'],
          'user-agent': request.headers['user-agent'],
        },
      });

      if (error instanceof QonsentError) {
        throw error;
      }

      throw new QonsentError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Authentication processing failed'
      );
    }
  });

  // Helper function to check if user has admin permissions
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.identity?.verified) {
      throw new QonsentError(
        ErrorCodes.INSUFFICIENT_PERMISSIONS,
        'Admin access requires verified identity'
      );
    }

    // Additional admin checks could be added here
    // For now, we assume verified identities can perform admin actions
  });

  // Helper function to get current identity
  fastify.decorate('getCurrentIdentity', (request: FastifyRequest) => {
    return request.identity;
  });
};

export { authMiddleware };
export default fp(authMiddleware, {
  name: 'auth-middleware',
});