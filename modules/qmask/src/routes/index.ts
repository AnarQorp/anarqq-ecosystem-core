import { FastifyPluginAsync } from 'fastify';
import { maskRoutes } from './mask';
import { profileRoutes } from './profiles';
import { assessmentRoutes } from './assessments';
import { complianceRoutes } from './compliance';

export const registerRoutes: FastifyPluginAsync = async (fastify) => {
  // Register all route modules
  await fastify.register(maskRoutes, { prefix: '/mask' });
  await fastify.register(profileRoutes, { prefix: '/profiles' });
  await fastify.register(assessmentRoutes, { prefix: '/assessments' });
  await fastify.register(complianceRoutes, { prefix: '/compliance' });

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      service: 'qmask'
    };
  });
};