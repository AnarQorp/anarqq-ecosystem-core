import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';

import { config } from './config';
// import { logger } from './utils/logger';

// Import middleware
import authMiddleware from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import rateLimitMiddleware from './middleware/rateLimit';

// Import routes
import { healthRoutes } from './routes/health';
import { mediaRoutes } from './routes/media';
import { metadataRoutes } from './routes/metadata';
import { transcodingRoutes } from './routes/transcoding';
import { optimizationRoutes } from './routes/optimization';
import { licensingRoutes } from './routes/licensing';
import { jobRoutes } from './routes/jobs';
import { searchRoutes } from './routes/search';
import { mcpRoutes } from './routes/mcp';

// Import mock routes for standalone mode
import { mockRoutes } from './routes/mocks';

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: config.nodeEnv === 'test' ? false : true,
    bodyLimit: config.maxFileSize,
    requestTimeout: 60000
  });

  // Register plugins
  await server.register(cors, {
    origin: true,
    credentials: true
  });

  await server.register(helmet, {
    contentSecurityPolicy: false
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.maxFileSize
    }
  });

  // Register Swagger documentation
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'QpiC API',
        description: 'Media Management module for Q ecosystem',
        version: '2.0.0'
      },
      servers: [
        {
          url: `http://localhost:${config.port}/api/v1`,
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // Register middleware
  await server.register(rateLimitMiddleware);
  await server.register(authMiddleware);
  
  // Register error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  await server.register(healthRoutes, { prefix: '/api/v1' });
  await server.register(mediaRoutes, { prefix: '/api/v1' });
  await server.register(metadataRoutes, { prefix: '/api/v1' });
  await server.register(transcodingRoutes, { prefix: '/api/v1' });
  await server.register(optimizationRoutes, { prefix: '/api/v1' });
  await server.register(licensingRoutes, { prefix: '/api/v1' });
  await server.register(jobRoutes, { prefix: '/api/v1' });
  await server.register(searchRoutes, { prefix: '/api/v1' });
  await server.register(mcpRoutes, { prefix: '/mcp/v1' });

  // Register mock routes for standalone mode
  if (config.nodeEnv === 'development') {
    await server.register(mockRoutes, { prefix: '/mock' });
  }

  return server;
}