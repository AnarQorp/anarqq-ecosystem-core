import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { DAOPolicyService } from '../services/daoPolicy.service';

export const daoPolicyRoutes: FastifyPluginAsync = async (fastify) => {
  const daoPolicyService = new DAOPolicyService();

  // Create or update a DAO policy
  fastify.post('/', {
    schema: {
      body: z.object({
        daoId: z.string(),
        resourcePattern: z.string(),
        allowedRoles: z.array(z.string()),
        restrictions: z.record(z.any()).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          policyId: z.string(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await requireAuth(request);
    const { daoId, resourcePattern, allowedRoles, restrictions } = request.body;
    
    // Verify user has permission to manage this DAO's policies
    // This would typically check if the user is an admin of the DAO
    const hasPermission = await verifyDAOPermission(user.did, daoId, 'admin');
    if (!hasPermission) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
    
    const policy = await daoPolicyService.upsertPolicy({
      daoId,
      resourcePattern,
      allowedRoles,
      restrictions,
      createdBy: user.did,
    });

    return {
      success: true,
      policyId: policy._id.toString(),
    };
  });

  // Get DAO policy by ID
  fastify.get('/:daoId', {
    schema: {
      params: z.object({
        daoId: z.string(),
      }),
      querystring: z.object({
        resourcePattern: z.string().optional(),
      }),
      response: {
        200: z.object({
          policies: z.array(z.any()),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { daoId } = request.params;
    const { resourcePattern } = request.query;
    
    const policies = await daoPolicyService.getPolicies({
      daoId,
      resourcePattern,
    });

    return {
      policies,
    };
  });

  // Delete a DAO policy
  fastify.delete('/:policyId', {
    schema: {
      params: z.object({
        policyId: z.string(),
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
    const { policyId } = request.params;
    
    // First get the policy to check permissions
    const policy = await daoPolicyService.getPolicyById(policyId);
    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found' });
    }
    
    // Verify user has permission to manage this DAO's policies
    const hasPermission = await verifyDAOPermission(user.did, policy.daoId, 'admin');
    if (!hasPermission) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
    
    await daoPolicyService.deletePolicy(policyId);
    
    return {
      success: true,
    };
  });
};

// Helper function to verify if a user has a specific role in a DAO
async function verifyDAOPermission(userDid: string, daoId: string, requiredRole: string): Promise<boolean> {
  // In a real implementation, this would query the DAO's membership service
  // to verify the user's role. This is a simplified example.
  
  // TODO: Implement actual DAO permission verification
  // This could involve checking a DAO membership service or smart contract
  
  // For now, return true to allow all operations (in production, this should be properly implemented)
  return true;
}
