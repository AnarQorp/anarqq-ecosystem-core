import { FastifyInstance } from 'fastify';
import { qonsentRoutes } from './qonsent.routes';
// Import other route files if they exist
// import { daoPolicyRoutes } from './daoPolicy.routes';
// import { delegationRoutes } from './delegation.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register qonsent routes
  await fastify.register(qonsentRoutes, { prefix: '/qonsent' });

  // Add a root route with API documentation link
  fastify.get('/', async () => {
    return {
      name: 'Qonsent API',
      version: '0.1.0',
      documentation: '/docs',
      endpoints: [
        { path: '/qonsent', description: 'Qonsent management endpoints' },
      ],
    };
  });
}
