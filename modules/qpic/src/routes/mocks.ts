import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function mockRoutes(fastify: FastifyInstance) {
  // Mock sQuid service
  fastify.post('/squid/api/v1/verify', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'IDENTITY_VERIFIED',
      message: 'Identity verified successfully',
      data: {
        squidId: 'mock-user-123',
        verified: true,
        permissions: ['media:upload', 'media:download', 'media:transcode', 'media:license']
      }
    });
  });

  // Mock Qonsent service
  fastify.post('/qonsent/api/v1/check', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'PERMISSION_GRANTED',
      message: 'Permission granted',
      data: {
        allowed: true,
        reason: 'Mock permission granted'
      }
    });
  });

  // Mock Qmask service
  fastify.post('/qmask/api/v1/mask/apply', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'PRIVACY_APPLIED',
      message: 'Privacy profile applied',
      data: {
        maskedData: {},
        appliedRules: [],
        riskScore: 0.1,
        complianceFlags: ['GDPR']
      }
    });
  });

  // Mock Qerberos service
  fastify.post('/qerberos/api/v1/audit', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'AUDIT_LOGGED',
      message: 'Audit event logged',
      data: {
        eventId: 'mock-audit-' + Date.now()
      }
    });
  });

  // Mock Qindex service
  fastify.post('/qindex/api/v1/put', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'INDEXED',
      message: 'Resource indexed',
      data: {
        key: 'mock-index-key',
        cid: 'QmMockCID123'
      }
    });
  });

  // Mock Qmarket service
  fastify.post('/qmarket/api/v1/list', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      code: 'LISTED',
      message: 'Item listed in marketplace',
      data: {
        listingId: 'mock-listing-' + Date.now()
      }
    });
  });
}