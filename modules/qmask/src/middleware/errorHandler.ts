import { FastifyPluginAsync, FastifyError } from 'fastify';
import { logger } from '../utils/logger';

export const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      identity: request.identity?.squidId
    });

    // Handle validation errors
    if (error.validation) {
      reply.code(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation
      });
      return;
    }

    // Handle known error codes
    if (error.message.includes('Profile') && error.message.includes('not found')) {
      reply.code(404).send({
        status: 'error',
        code: 'PROFILE_NOT_FOUND',
        message: error.message
      });
      return;
    }

    if (error.message.includes('already exists')) {
      reply.code(409).send({
        status: 'error',
        code: 'PROFILE_ALREADY_EXISTS',
        message: error.message
      });
      return;
    }

    if (error.message.includes('permission') || error.message.includes('creator')) {
      reply.code(403).send({
        status: 'error',
        code: 'QONSENT_DENIED',
        message: error.message
      });
      return;
    }

    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      reply.code(500).send({
        status: 'error',
        code: 'DATABASE_ERROR',
        message: 'Database operation failed'
      });
      return;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      status: 'error',
      code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
      message: statusCode >= 500 ? 'Internal server error' : error.message,
      timestamp: new Date().toISOString(),
      requestId: request.id
    });
  });
};