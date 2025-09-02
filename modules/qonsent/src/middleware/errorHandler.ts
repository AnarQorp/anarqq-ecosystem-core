import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { QonsentError, ErrorCodes, getErrorSuggestedActions } from '../utils/errors';
import { logger } from '../utils/logger';
import { StandardError } from '../types';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const timestamp = new Date().toISOString();
  const requestId = request.id;

  // Log the error
  logger.error('Request error', {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-squid-id': request.headers['x-squid-id'],
      },
      body: request.body,
    },
    requestId,
  });

  // Handle QonsentError
  if (error instanceof QonsentError) {
    const errorResponse: StandardError = {
      status: 'error',
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp,
      requestId,
      retryable: error.retryable,
      suggestedActions: getErrorSuggestedActions(error.code),
    };

    reply.code(error.statusCode).send(errorResponse);
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Request validation failed',
      details: {
        validation: error.validation,
        validationContext: error.validationContext,
      },
      timestamp,
      requestId,
      retryable: false,
      suggestedActions: ['Check request format', 'Validate input parameters'],
    };

    reply.code(400).send(errorResponse);
    return;
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      details: {
        limit: error.message,
      },
      timestamp,
      requestId,
      retryable: true,
      suggestedActions: ['Wait before retrying', 'Reduce request frequency'],
    };

    reply.code(429).send(errorResponse);
    return;
  }

  // Handle authentication errors
  if (error.statusCode === 401) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.INVALID_TOKEN,
      message: error.message || 'Authentication required',
      timestamp,
      requestId,
      retryable: false,
      suggestedActions: ['Provide valid authentication token', 'Check token format'],
    };

    reply.code(401).send(errorResponse);
    return;
  }

  // Handle authorization errors
  if (error.statusCode === 403) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
      message: error.message || 'Insufficient permissions',
      timestamp,
      requestId,
      retryable: false,
      suggestedActions: ['Request additional permissions', 'Contact resource owner'],
    };

    reply.code(403).send(errorResponse);
    return;
  }

  // Handle not found errors
  if (error.statusCode === 404) {
    const errorResponse: StandardError = {
      status: 'error',
      code: 'RESOURCE_NOT_FOUND',
      message: error.message || 'Resource not found',
      timestamp,
      requestId,
      retryable: false,
      suggestedActions: ['Check resource identifier', 'Verify resource exists'],
    };

    reply.code(404).send(errorResponse);
    return;
  }

  // Handle timeout errors
  if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.TIMEOUT_ERROR,
      message: 'Request timeout',
      details: {
        timeout: error.message,
      },
      timestamp,
      requestId,
      retryable: true,
      suggestedActions: ['Retry the request', 'Check network connectivity'],
    };

    reply.code(504).send(errorResponse);
    return;
  }

  // Handle database connection errors
  if (error.message.includes('MongoError') || error.message.includes('connection')) {
    const errorResponse: StandardError = {
      status: 'error',
      code: ErrorCodes.DATABASE_CONNECTION_ERROR,
      message: 'Database connection error',
      timestamp,
      requestId,
      retryable: true,
      suggestedActions: ['Retry after a delay', 'Check service status'],
    };

    reply.code(503).send(errorResponse);
    return;
  }

  // Handle generic HTTP errors
  if (error.statusCode && error.statusCode >= 400) {
    const errorResponse: StandardError = {
      status: 'error',
      code: 'HTTP_ERROR',
      message: error.message || 'HTTP error',
      details: {
        statusCode: error.statusCode,
        code: error.code,
      },
      timestamp,
      requestId,
      retryable: error.statusCode >= 500,
      suggestedActions: error.statusCode >= 500 
        ? ['Retry after a delay', 'Check service status']
        : ['Check request format', 'Validate input parameters'],
    };

    reply.code(error.statusCode).send(errorResponse);
    return;
  }

  // Handle unknown errors
  const errorResponse: StandardError = {
    status: 'error',
    code: ErrorCodes.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    details: {
      error: error.name,
      message: error.message,
    },
    timestamp,
    requestId,
    retryable: true,
    suggestedActions: ['Retry after a delay', 'Contact support if the issue persists'],
  };

  reply.code(500).send(errorResponse);
}