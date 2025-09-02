import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function transcodingRoutes(fastify: FastifyInstance) {
  // Start transcoding job
  fastify.post('/media/:id/transcode', {
    schema: {
      description: 'Start transcoding job',
      tags: ['Transcoding'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (_request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(501).send({
      status: 'error',
      code: 'NOT_IMPLEMENTED',
      message: 'Transcoding not yet implemented',
      timestamp: new Date().toISOString()
    });
  });
}