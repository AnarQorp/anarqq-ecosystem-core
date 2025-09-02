import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { rateLimitMiddleware } from './middleware/rateLimit';

// Route imports
import { healthRoutes } from './routes/health';
import { qonsentRoutes } from './routes/qonsent';
import { policyRoutes } from './routes/policies';
import { mcpRoutes } from './routes/mcp';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isDevelopment,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register plugins
  await app.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-squid-id',
      'x-subid',
      'x-qonsent',
      'x-sig',
      'x-ts',
      'x-api-version',
      'x-request-id',
      'x-trace-id',
    ],
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  // Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Qonsent API',
        description: 'Policies & Permissions module for Q ecosystem with UCAN policy engine',
        version: '2.0.0',
        contact: {
          name: 'Q Ecosystem',
          url: 'https://github.com/anarq/qonsent',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}/api/v1`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          squidAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'sQuid identity token',
          },
        },
      },
      security: [{ squidAuth: [] }],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register middleware
  app.setErrorHandler(errorHandler);
  await app.register(rateLimitMiddleware);
  await app.register(auditMiddleware);
  await app.register(authMiddleware);

  // Register routes
  await app.register(healthRoutes);
  await app.register(qonsentRoutes, { prefix: '/api/v1/qonsent' });
  await app.register(policyRoutes, { prefix: '/api/v1/qonsent/policies' });
  await app.register(mcpRoutes, { prefix: '/mcp/v1' });

  // Add hooks for request/response logging
  app.addHook('onRequest', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-squid-id': request.headers['x-squid-id'],
        'x-api-version': request.headers['x-api-version'],
      },
    }, 'Incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    }, 'Request completed');
  });

  return app;
}