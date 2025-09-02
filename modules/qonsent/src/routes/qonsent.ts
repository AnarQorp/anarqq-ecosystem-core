import { FastifyPluginAsync } from 'fastify';
import { QonsentService } from '../services/QonsentService';
import { QonsentError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';
import { StandardResponse } from '../types';

const qonsentRoutes: FastifyPluginAsync = async (fastify) => {
  const qonsentService = new QonsentService();

  // Check permission endpoint
  fastify.post('/check', {
    schema: {
      tags: ['Permissions'],
      summary: 'Check permissions for a resource',
      description: 'Check if an identity has permission to perform an action on a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity', 'action'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier in format module:type:id',
            example: 'qdrive:file:abc123',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Identity DID to check permissions for',
            example: 'did:squid:alice',
          },
          action: {
            type: 'string',
            enum: ['read', 'write', 'delete', 'admin', 'share', 'execute'],
            description: 'Action to check permission for',
            example: 'read',
          },
          context: {
            type: 'object',
            description: 'Additional context for permission check',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              clientIp: { type: 'string', format: 'ipv4' },
              userAgent: { type: 'string' },
              daoContext: { type: 'string' },
            },
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
                allowed: { type: 'boolean' },
                reason: { type: 'string' },
                policy: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                  },
                },
                expiresAt: { type: 'string', format: 'date-time' },
                conditions: { type: 'object' },
                auditTrail: {
                  type: 'object',
                  properties: {
                    checkId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    source: { type: 'string' },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, action, context } = request.body as any;

      // Add request context
      const enrichedContext = {
        ...context,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: request.id,
      };

      const result = await qonsentService.checkPermission({
        resource,
        identity,
        action,
        context: enrichedContext,
      });

      const response: StandardResponse = {
        status: 'ok',
        data: result,
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Permission check failed', { error, body: request.body });
      throw error;
    }
  });

  // Grant permission endpoint
  fastify.post('/grant', {
    schema: {
      tags: ['Permissions'],
      summary: 'Grant permissions to an identity',
      description: 'Grant specific permissions to an identity for a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity', 'permissions'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier',
            example: 'qdrive:file:abc123',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Target identity DID',
            example: 'did:squid:bob',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['read', 'write', 'delete', 'admin', 'share', 'execute'],
            },
            minItems: 1,
            uniqueItems: true,
            description: 'List of permissions to grant',
            example: ['read', 'write'],
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Optional expiration time',
          },
          conditions: {
            type: 'object',
            description: 'Additional conditions for the grant',
            properties: {
              timeWindow: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'time' },
                  end: { type: 'string', format: 'time' },
                },
              },
              ipRestrictions: {
                type: 'array',
                items: { type: 'string', format: 'ipv4' },
              },
              maxUses: { type: 'integer', minimum: 1 },
            },
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
                grantId: { type: 'string' },
                resource: { type: 'string' },
                identity: { type: 'string' },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                expiresAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                conditions: { type: 'object' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, permissions, expiresAt, conditions } = request.body as any;
      const grantedBy = request.identity?.squidId;

      if (!grantedBy) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Valid identity required to grant permissions'
        );
      }

      const grant = await qonsentService.grantPermission({
        resource,
        identity,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        conditions,
        grantedBy,
      });

      const response: StandardResponse = {
        status: 'ok',
        data: {
          grantId: grant.grantId,
          resource: grant.resource,
          identity: grant.identity,
          permissions: grant.permissions,
          expiresAt: grant.expiresAt?.toISOString(),
          createdAt: grant.createdAt.toISOString(),
          conditions: grant.conditions,
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Permission grant failed', { error, body: request.body });
      throw error;
    }
  });

  // Revoke permission endpoint
  fastify.post('/revoke', {
    schema: {
      tags: ['Permissions'],
      summary: 'Revoke permissions from an identity',
      description: 'Revoke specific or all permissions from an identity for a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier',
            example: 'qdrive:file:abc123',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Target identity DID',
            example: 'did:squid:bob',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['read', 'write', 'delete', 'admin', 'share', 'execute'],
            },
            uniqueItems: true,
            description: 'Specific permissions to revoke (if empty, revokes all)',
          },
          reason: {
            type: 'string',
            description: 'Reason for revocation',
            example: 'Access no longer needed',
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
                resource: { type: 'string' },
                identity: { type: 'string' },
                revokedPermissions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                revokedAt: { type: 'string', format: 'date-time' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, permissions, reason } = request.body as any;
      const revokedBy = request.identity?.squidId;

      if (!revokedBy) {
        throw new QonsentError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          'Valid identity required to revoke permissions'
        );
      }

      await qonsentService.revokePermission({
        resource,
        identity,
        permissions,
        revokedBy,
        reason,
      });

      const response: StandardResponse = {
        status: 'ok',
        data: {
          resource,
          identity,
          revokedPermissions: permissions || [],
          revokedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Permission revocation failed', { error, body: request.body });
      throw error;
    }
  });

  // List permissions endpoint
  fastify.get('/permissions', {
    schema: {
      tags: ['Permissions'],
      summary: 'List permissions',
      description: 'List permissions for a resource or identity',
      querystring: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            description: 'Filter by resource identifier',
          },
          identity: {
            type: 'string',
            description: 'Filter by identity DID',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Maximum number of results',
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Number of results to skip',
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
                grants: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      grantId: { type: 'string' },
                      resource: { type: 'string' },
                      identity: { type: 'string' },
                      permissions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      expiresAt: { type: 'string', format: 'date-time' },
                      createdAt: { type: 'string', format: 'date-time' },
                      grantedBy: { type: 'string' },
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
      const { resource, identity, limit, offset } = request.query as any;

      const result = await qonsentService.listPermissions({
        resource,
        identity,
        limit: limit || 50,
        offset: offset || 0,
      });

      const response: StandardResponse = {
        status: 'ok',
        data: {
          grants: result.grants.map(grant => ({
            grantId: grant.grantId,
            resource: grant.resource,
            identity: grant.identity,
            permissions: grant.permissions,
            expiresAt: grant.expiresAt?.toISOString(),
            createdAt: grant.createdAt.toISOString(),
            grantedBy: grant.grantedBy,
          })),
          total: result.total,
          limit: limit || 50,
          offset: offset || 0,
        },
        timestamp: new Date().toISOString(),
        requestId: request.id,
      };

      return response;

    } catch (error) {
      logger.error('Permission listing failed', { error, query: request.query });
      throw error;
    }
  });
};

export { qonsentRoutes };