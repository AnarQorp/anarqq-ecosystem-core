import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import { logger } from '../utils/logger';

// Mock sQuid service for standalone mode
class MockSquidService {
  async verifyIdentity(token: string): Promise<{ squidId: string; subId?: string; valid: boolean }> {
    // Simple mock validation - in standalone mode, accept any non-empty token
    if (!token || token.trim().length === 0) {
      return { squidId: '', valid: false };
    }

    // Extract identity from token (mock format: "squid:identity:subid")
    const parts = token.split(':');
    return {
      squidId: parts[1] || 'mock-identity',
      subId: parts[2],
      valid: true
    };
  }
}

// Real sQuid service for integrated mode
class SquidService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async verifyIdentity(token: string): Promise<{ squidId: string; subId?: string; valid: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/identity/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return { squidId: '', valid: false };
      }

      const data = await response.json();
      return {
        squidId: data.squidId,
        subId: data.subId,
        valid: true
      };
    } catch (error) {
      logger.error('Failed to verify identity with sQuid:', error);
      return { squidId: '', valid: false };
    }
  }
}

// Choose service based on environment
const squidService = config.isIntegrated 
  ? new SquidService(config.squidUrl)
  : new MockSquidService();

declare module 'fastify' {
  interface FastifyRequest {
    identity?: {
      squidId: string;
      subId?: string;
    };
  }
}

export const authMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for health check and docs
    if (request.url === '/health' || request.url.startsWith('/docs')) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({
        status: 'error',
        code: 'SQUID_AUTH_REQUIRED',
        message: 'Authorization header with Bearer token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const verification = await squidService.verifyIdentity(token);

    if (!verification.valid) {
      reply.code(401).send({
        status: 'error',
        code: 'SQUID_IDENTITY_INVALID',
        message: 'Invalid identity token'
      });
      return;
    }

    // Add identity to request
    request.identity = {
      squidId: verification.squidId,
      subId: verification.subId
    };

    logger.debug(`Authenticated request from identity: ${verification.squidId}`);
  });
};