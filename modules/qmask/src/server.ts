import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './database';
import { registerRoutes } from './routes';
import { registerMcpRoutes } from './routes/mcp';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

export async function createServer() {
  const server = Fastify({
    logger: logger,
    trustProxy: true
  });

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  });

  await server.register(cors, {
    origin: config.isDevelopment ? true : false,
    credentials: true
  });

  // Swagger documentation
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Qmask API',
        description: 'Privacy & Anonymization module for Q ecosystem',
        version: '2.0.0'
      },
      servers: [
        {
          url: `http://${config.host}:${config.port}`,
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
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    }
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    }
  });

  // Connect to database
  await connectDatabase();

  // Register middleware
  await server.register(rateLimitMiddleware);
  await server.register(authMiddleware);
  await server.register(errorHandler);

  // Register routes
  await server.register(registerRoutes, { prefix: '/api/v1' });
  await server.register(registerMcpRoutes, { prefix: '/mcp/v1' });

  // Health check endpoint
  server.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      service: 'qmask'
    };
  });

  return server;
}