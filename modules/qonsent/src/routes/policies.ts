import { FastifyPluginAsync } from 'fastify';
import { UCANPolicyEngine } from '../services/UCANPolicyEngine';
import { QonsentError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';
import { StandardResponse } from '../types';

const policyRoutes: FastifyPluginAsync = async (fastify) => {
  const policyEngine = new UCANPolicyEngine();

  // List policies
  fastify.get('/', {
    schema: {
      tags: ['Policies'],
      summary: 'List policies',
      description: 'List policies for a resource or identity',
      querystring: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            description: 'Filter by resource pattern',
          },
          identity: {
            type: 'string',
            description: 'Filter by identity DID',
          },
          scope: {
            type: 'string',
            enum: ['global', 'dao', 'resource'],
            description: 'Filter by policy scope',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            data: {
              type: 'object',
              properties: {
                policies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      scope: { type: 'string' },
                      active: { type: 'boolean' },
                      createdBy: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                      expiresAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
                limit: { type: 'integer' },
                offset: { type: 'integer' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, scope, limit = 50, offset = 0 } = request.query as any;

      // This would be implemented in the policy engine
      // For now, return a mock response
      const policies = [
        {
          id: 'policy-001',
          name: 'DAO Member Access',
          description: 'Default access for DAO members',
          scope: 'dao',
          active: true,
          createdBy: 'did:squid:admin',
          createdAt: new Date().toISOString(),
          expiresAt: undefined,
        },
      ];

      const response: StandardResponse = {
        status: 'ok',
        data: {
          policies,
          total: policies.length,
          limit,
          offset,
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Policy listing failed', { error, query: request.query });
      throw error;
    }
  });

  // Create policy
  fastify.post('/', {
    schema: {
      tags: ['Policies'],
      summary: 'Create a policy',
      description: 'Create a new UCAN policy',
      body: {
        type: 'object',
        required: ['name', 'rules'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Policy name',
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Policy description',
          },
          scope: {
            type: 'string',
            enum: ['global', 'dao', 'resource'],
            default: 'resource',
            description: 'Policy scope',
          },
          rules: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['audience', 'resource', 'actions'],
              properties: {
                audience: {
                  type: 'string',
                  description: 'Identity pattern or DAO',
                },
                resource: {
                  type: 'string',
                  description: 'Resource pattern',
                },
                actions: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['read', 'write', 'delete', 'admin', 'share', 'execute', '*'],
                  },
                  minItems: 1,
                  uniqueItems: true,
                },
                conditions: {
                  type: 'object',
                  description: 'Additional conditions',
                },
              },
            },
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Policy expiration time',
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            data: {
              type: 'object',
              properties: {
                policyId: { type: 'string' },
                name: { type: 'string' },
                scope: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { name, description, scope, rules, expiresAt } = request.body as any;
      const createdBy = request.identity?.squidId;

      if (!createdBy) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Valid identity required to create policies'
        );
      }

      const policy = await policyEngine.createPolicy({
        name,
        description,
        scope: scope || 'resource',
        rules,
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      const response: StandardResponse = {
        status: 'ok',
        data: {
          policyId: policy._id?.toString(),
          name: policy.name,
          scope: policy.scope,
          createdAt: policy.createdAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      reply.code(201);
      return response;

    } catch (error) {
      logger.error('Policy creation failed', { error, body: request.body });
      throw error;
    }
  });

  // Update policy
  fastify.put('/:policyId', {
    schema: {
      tags: ['Policies'],
      summary: 'Update a policy',
      description: 'Update an existing UCAN policy',
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          rules: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['audience', 'resource', 'actions'],
              properties: {
                audience: { type: 'string' },
                resource: { type: 'string' },
                actions: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['read', 'write', 'delete', 'admin', 'share', 'execute', '*'],
                  },
                  minItems: 1,
                  uniqueItems: true,
                },
                conditions: { type: 'object' },
              },
            },
          },
          expiresAt: { type: 'string', format: 'date-time' },
          active: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            data: {
              type: 'object',
              properties: {
                policyId: { type: 'string' },
                name: { type: 'string' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { policyId } = request.params as any;
      const updates = request.body as any;
      const updatedBy = request.identity?.squidId;

      if (!updatedBy) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Valid identity required to update policies'
        );
      }

      const policy = await policyEngine.updatePolicy(policyId, updates, updatedBy);

      const response: StandardResponse = {
        status: 'ok',
        data: {
          policyId: policy._id?.toString(),
          name: policy.name,
          updatedAt: policy.updatedAt.toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Policy update failed', { error, params: request.params, body: request.body });
      throw error;
    }
  });

  // Delete policy
  fastify.delete('/:policyId', {
    schema: {
      tags: ['Policies'],
      summary: 'Delete a policy',
      description: 'Delete (deactivate) a UCAN policy',
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            data: {
              type: 'object',
              properties: {
                policyId: { type: 'string' },
                deletedAt: { type: 'string', format: 'date-time' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { policyId } = request.params as any;
      const deletedBy = request.identity?.squidId;

      if (!deletedBy) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Valid identity required to delete policies'
        );
      }

      await policyEngine.deletePolicy(policyId, deletedBy);

      const response: StandardResponse = {
        status: 'ok',
        data: {
          policyId,
          deletedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Policy deletion failed', { error, params: request.params });
      throw error;
    }
  });
};

export { policyRoutes };