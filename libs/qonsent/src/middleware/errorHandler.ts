import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors,
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }

  // Handle 404 errors
  if (error.statusCode === 404) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: error.message || 'Resource not found',
    });
  }

  // Handle 401 Unauthorized
  if (error.statusCode === 401) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: error.message || 'Authentication required',
    });
  }

  // Handle 403 Forbidden
  if (error.statusCode === 403) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: error.message || 'Insufficient permissions',
    });
  }

  // Default to 500 for unhandled errors
  const statusCode = error.statusCode || 500;
  
  // Don't expose internal errors in production
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : error.message;

  reply.status(statusCode).send({
    statusCode,
    error: error.name || 'Internal Server Error',
    message,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: error.stack,
    }),
  });
};
