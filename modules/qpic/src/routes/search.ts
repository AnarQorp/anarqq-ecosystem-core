import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function searchRoutes(fastify: FastifyInstance) {
  // Search media files
  fastify.get('/search', {
    schema: {
      description: 'Search media files',
      tags: ['Search'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          format: { type: 'string' },
          tags: { type: 'string' },
          category: { type: 'string' },
          license: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sort: { 
            type: 'string', 
            enum: ['created', 'modified', 'size', 'name', 'relevance'],
            default: 'relevance'
          }
        }
      }
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(501).send({
      status: 'error',
      code: 'NOT_IMPLEMENTED',
      message: 'Media search not yet implemented',
      timestamp: new Date().toISOString()
    });
  });
}