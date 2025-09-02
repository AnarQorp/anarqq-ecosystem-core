import { FastifyPluginAsync } from 'fastify';
import { QonsentService } from '../services/QonsentService';
import { QonsentError, ErrorCodes } from '../utils/errors';
import { logger } from '../utils/logger';

const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  const qonsentService = new QonsentService();

  // MCP tool: qonsent.check
  fastify.post('/tools/qonsent.check', {
    schema: {
      tags: ['MCP Tools'],
      summary: 'MCP Tool: Check Permission',
      description: 'Check if an identity has permission to perform an action on a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity', 'action'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier (e.g., "qdrive:file:abc123")',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Identity DID to check permissions for',
          },
          action: {
            type: 'string',
            enum: ['read', 'write', 'delete', 'admin', 'share', 'execute'],
            description: 'Action to check (e.g., "read", "write", "delete")',
          },
          context: {
            type: 'object',
            description: 'Additional context for permission check',
            additionalProperties: true,
          },
        },
      },
      response: {
        200: {
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
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, action, context } = request.body as any;

      const result = await qonsentService.checkPermission({
        resource,
        identity,
        action,
        context: {
          ...context,
          source: 'mcp',
          requestId: request.id,
        },
      });

      // Return MCP-compatible response (without wrapper)
      return {
        allowed: result.allowed,
        reason: result.reason,
        policy: result.policy,
        expiresAt: result.expiresAt,
      };

    } catch (error) {
      logger.error('MCP permission check failed', { error, body: request.body });
      throw error;
    }
  });

  // MCP tool: qonsent.grant
  fastify.post('/tools/qonsent.grant', {
    schema: {
      tags: ['MCP Tools'],
      summary: 'MCP Tool: Grant Permission',
      description: 'Grant permissions to an identity for a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity', 'permissions'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Target identity DID',
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
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Optional expiration time',
          },
          conditions: {
            type: 'object',
            description: 'Additional conditions for the grant',
            additionalProperties: true,
          },
        },
      },
      response: {
        200: {
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

      // Return MCP-compatible response
      return {
        grantId: grant.grantId,
        resource: grant.resource,
        identity: grant.identity,
        permissions: grant.permissions,
        expiresAt: grant.expiresAt?.toISOString(),
        createdAt: grant.createdAt.toISOString(),
      };

    } catch (error) {
      logger.error('MCP permission grant failed', { error, body: request.body });
      throw error;
    }
  });

  // MCP tool: qonsent.revoke
  fastify.post('/tools/qonsent.revoke', {
    schema: {
      tags: ['MCP Tools'],
      summary: 'MCP Tool: Revoke Permission',
      description: 'Revoke permissions from an identity for a resource',
      body: {
        type: 'object',
        required: ['resource', 'identity'],
        properties: {
          resource: {
            type: 'string',
            pattern: '^[a-z]+:[a-z]+:[a-zA-Z0-9_-]+$',
            description: 'Resource identifier',
          },
          identity: {
            type: 'string',
            pattern: '^did:squid:[a-zA-Z0-9_-]+$',
            description: 'Target identity DID',
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
        },
      },
      response: {
        200: {
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
      },
    },
  }, async (request, reply) => {
    try {
      const { resource, identity, permissions } = request.body as any;
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
        reason: 'Revoked via MCP tool',
      });

      // Return MCP-compatible response
      return {
        resource,
        identity,
        revokedPermissions: permissions || [],
        revokedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('MCP permission revocation failed', { error, body: request.body });
      throw error;
    }
  });

  // MCP tool discovery endpoint
  fastify.get('/tools', {
    schema: {
      tags: ['MCP Tools'],
      summary: 'List MCP Tools',
      description: 'List available MCP tools and their schemas',
      response: {
        200: {
          type: 'object',
          properties: {
            tools: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  inputSchema: { type: 'object' },
                  outputSchema: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      tools: [
        {
          name: 'qonsent.check',
          description: 'Check if an identity has permission to perform an action on a resource',
          inputSchema: {
            type: 'object',
            required: ['resource', 'identity', 'action'],
            properties: {
              resource: { type: 'string', description: 'Resource identifier' },
              identity: { type: 'string', description: 'Identity DID' },
              action: { type: 'string', description: 'Action to check' },
              context: { type: 'object', description: 'Additional context' },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              allowed: { type: 'boolean' },
              reason: { type: 'string' },
              policy: { type: 'object' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        {
          name: 'qonsent.grant',
          description: 'Grant permissions to an identity for a resource',
          inputSchema: {
            type: 'object',
            required: ['resource', 'identity', 'permissions'],
            properties: {
              resource: { type: 'string', description: 'Resource identifier' },
              identity: { type: 'string', description: 'Target identity DID' },
              permissions: { type: 'array', items: { type: 'string' } },
              expiresAt: { type: 'string', format: 'date-time' },
              conditions: { type: 'object' },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              grantId: { type: 'string' },
              resource: { type: 'string' },
              identity: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
              expiresAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        {
          name: 'qonsent.revoke',
          description: 'Revoke permissions from an identity for a resource',
          inputSchema: {
            type: 'object',
            required: ['resource', 'identity'],
            properties: {
              resource: { type: 'string', description: 'Resource identifier' },
              identity: { type: 'string', description: 'Target identity DID' },
              permissions: { type: 'array', items: { type: 'string' } },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              resource: { type: 'string' },
              identity: { type: 'string' },
              revokedPermissions: { type: 'array', items: { type: 'string' } },
              revokedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      ],
    };
  });
};

export { mcpRoutes };