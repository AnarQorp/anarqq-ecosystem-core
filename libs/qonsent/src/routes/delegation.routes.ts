import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { DelegationService } from '../services/delegation.service';

export const delegationRoutes: FastifyPluginAsync = async (fastify) => {
  const delegationService = new DelegationService();

  // Delegate specific rights to a subidentity or another DID
  fastify.post('/', {
    schema: {
      body: z.object({
        delegateeDid: z.string(),
        scope: z.array(z.string()),
        expiresAt: z.string().datetime().optional(),
        capabilities: z.array(z.string()).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          delegationId: z.string(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await requireAuth(request);
    const { delegateeDid, scope, expiresAt, capabilities } = request.body;
    
    const delegation = await delegationService.createDelegation({
      delegatorDid: user.did,
      delegateeDid,
      scope,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      capabilities,
    });

    return {
      success: true,
      delegationId: delegation._id.toString(),
    };
  });

  // List active delegations for the current user
  fastify.get('/my-delegations', {
    schema: {
      querystring: z.object({
        type: z.enum(['outgoing', 'incoming']).optional(),
        status: z.enum(['active', 'expired', 'all']).default('active'),
        limit: z.string().default('20'),
        offset: z.string().default('0'),
      }),
      response: {
        200: z.object({
          delegations: z.array(z.any()),
          total: z.number(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await requireAuth(request);
    const { type = 'outgoing', status, limit, offset } = request.query;
    
    const { delegations, total } = await delegationService.listDelegations({
      did: user.did,
      type,
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return {
      delegations,
      total,
    };
  });

  // Revoke a delegation
  fastify.delete('/:delegationId', {
    schema: {
      params: z.object({
        delegationId: z.string(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await requireAuth(request);
    const { delegationId } = request.params;
    
    // Verify the user is the delegator
    const delegation = await delegationService.getDelegationById(delegationId);
    if (!delegation) {
      return reply.status(404).send({ error: 'Delegation not found' });
    }
    
    if (delegation.delegatorDid !== user.did) {
      return reply.status(403).send({ error: 'Not authorized to revoke this delegation' });
    }
    
    await delegationService.revokeDelegation(delegationId);
    
    return {
      success: true,
    };
  });

  // Check if a delegation is valid
  fastify.post('/verify', {
    schema: {
      body: z.object({
        delegatorDid: z.string(),
        delegateeDid: z.string(),
        scope: z.string(),
        capability: z.string().optional(),
      }),
      response: {
        200: z.object({
          isValid: z.boolean(),
          delegation: z.any().optional(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { delegatorDid, delegateeDid, scope, capability } = request.body;
    
    const result = await delegationService.verifyDelegation({
      delegatorDid,
      delegateeDid,
      scope,
      capability,
    });
    
    return result;
  });
};
