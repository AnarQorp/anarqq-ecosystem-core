import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { verifyMessage } from '@squid-identity/ssi-sdk';

export interface AuthUser {
  did: string;
  address: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the JWT or signature using the sQuid SDK
      const verified = await verifySignature(token);
      
      if (!verified) {
        return reply.code(401).send({ error: 'Invalid or expired token' });
      }

      // Attach user to request
      request.user = {
        did: verified.did,
        address: verified.address,
        iat: verified.iat,
        exp: verified.exp,
      };
    } catch (error) {
      request.log.error(error, 'Error verifying token');
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
};

async function verifySignature(token: string): Promise<any> {
  // TODO: Implement actual verification using sQuid SDK
  // This is a placeholder implementation
  try {
    // In a real implementation, this would verify the JWT or signature
    // using the sQuid SDK and return the decoded payload
    return {
      did: 'did:example:123',
      address: '0x123...',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  } catch (error) {
    throw new Error('Invalid signature');
  }
}

export const requireAuth = async (request: FastifyRequest) => {
  if (!request.user) {
    throw new Error('Authentication required');
  }
  return request.user;
};
