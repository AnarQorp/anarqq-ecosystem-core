import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authPlugin } from './middleware/auth';
import { registerRoutes } from './routes';
import { publicQonsentRoutes } from './routes/public.qonsent.routes';
import { qsocialMiddleware } from './middleware/qsocail.middleware';

const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register plugins
  await app.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await app.register(fastifyHelmet);

  // Register routes
  await app.register(registerRoutes);
  
  // Register public API routes
  await app.register(publicQonsentRoutes, { prefix: '/api/public/qonsent' });
  
  // Register Qsocial middleware
  app.decorate('qsocail', qsocialMiddleware);

  // Swagger documentation
  await app.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Qonsent API',
        description: 'Programmable permission layer for AnarQ & Q ecosystem',
        version: '0.1.0',
      },
      host: config.host,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  // Register middleware
  app.setErrorHandler(errorHandler);
  
  // Register authentication plugin
  await app.register(authPlugin);

  // Register routes
  await registerRoutes(app);

  // Health check endpoint
  app.get('/health', async () => ({ status: 'ok' }));

  return app;
};

export { buildApp };

// Start the server if this file is run directly
if (require.main === module) {
  (async () => {
    const app = await buildApp();
    try {
      await app.listen({
        port: config.port,
        host: config.host,
      });
      app.log.info(`Server listening on ${config.port}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  })();
}
