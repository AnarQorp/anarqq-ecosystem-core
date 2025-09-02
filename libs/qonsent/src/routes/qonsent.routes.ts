import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { QonsentService } from '../services/qonsent.service';

export const qonsentRoutes: FastifyPluginAsync = async (fastify) => {
  const qonsentService = new QonsentService();

  // Set permissions for an identity or subidentity
  fastify.post('/set', {
    schema: {
      body: z.object({
        resourceId: z.string(),
        targetDid: z.string(),
        permissions: z.array(z.string()),
        expiresAt: z.string().datetime().optional(),
        daoScope: z.string().optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          rule: z.any(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: fastify.authenticate,
  }, async (request: any, reply) => {
    const user = await requireAuth(request);
    const { resourceId, targetDid, permissions, expiresAt, daoScope } = request.body;
    
    const rule = await qonsentService.setQonsent({
      resourceId,
      ownerDid: user.did,
      targetDid,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      daoScope,
    });

    return {
      success: true,
      rule,
    };
  });

  // Get viewable resources for a DID
  fastify.get('/resources/:did', {
    schema: {
      params: z.object({
        did: z.string(),
      }),
      querystring: z.object({
        resourceType: z.string().optional(),
        limit: z.string().default('10'),
        offset: z.string().default('0'),
      }),
    },
    preHandler: fastify.authenticate,
  }, async (request: any, reply) => {
    const { did } = request.params;
    const { resourceType, limit, offset } = request.query;
    
    const { resources, total } = await qonsentService.getViewableResources({
      targetDid: did,
      resourceType,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return {
      resources,
      total,
    };
  });

  // Batch sync permissions
  fastify.post('/batch-sync', {
    schema: {
      body: z.object({
        items: z.array(z.any()),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          processed: z.number(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: fastify.authenticate,
  }, async (request: any, reply) => {
    const user = await requireAuth(request);
    const { items } = request.body;
    
    const processed = await qonsentService.batchSyncPermissions({
      items: items.map((item: any) => ({
        ...item,
        ownerDid: user.did,
      })),
    });

    return {
      success: true,
      processed,
    };
  });

  // List qonsent changes with optional filters
  fastify.get('/logs', {
    schema: {
      querystring: z.object({
        actorDid: z.string().optional(),
        resourceId: z.string().optional(),
        targetDid: z.string().optional(),
        daoId: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        limit: z.string().default('50'),
        offset: z.string().default('0'),
      }),
      response: {
        200: z.object({
          logs: z.array(z.any()),
          total: z.number(),
        }),
      },
      security: [{ apiKey: [] }],
    },
    preHandler: fastify.authenticate,
  }, async (request: any, reply) => {
    const { actorDid, resourceId, targetDid, daoId, from, to, limit, offset } = request.query;
    
    const { logs, total } = await qonsentService.getQonsentLogs({
      actorDid,
      resourceId,
      targetDid,
      daoId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return {
      logs,
      total,
    };
  });
};
