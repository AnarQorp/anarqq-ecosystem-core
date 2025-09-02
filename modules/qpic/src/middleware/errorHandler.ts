import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    headers: request.headers,
    statusCode: error.statusCode
  });

  // Handle validation errors
  if (error.validation) {
    return reply.code(400).send({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.validation,
      timestamp: new Date().toISOString()
    });
  }

  // Handle file size errors
  if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.code(413).send({
      status: 'error',
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds maximum allowed limit',
      timestamp: new Date().toISOString()
    });
  }

  // Handle multipart errors
  if (error.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {
    return reply.code(400).send({
      status: 'error',
      code: 'INVALID_CONTENT_TYPE',
      message: 'Invalid multipart content type',
      timestamp: new Date().toISOString()
    });
  }

  // Handle timeout errors
  if (error.code === 'FST_REQUEST_TIMEOUT') {
    return reply.code(408).send({
      status: 'error',
      code: 'REQUEST_TIMEOUT',
      message: 'Request timeout',
      timestamp: new Date().toISOString()
    });
  }

  // Handle MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return reply.code(500).send({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      timestamp: new Date().toISOString()
    });
  }

  // Handle IPFS errors
  if (error.message?.includes('IPFS')) {
    return reply.code(503).send({
      status: 'error',
      code: 'IPFS_UNAVAILABLE',
      message: 'IPFS service unavailable',
      timestamp: new Date().toISOString()
    });
  }

  // Handle media processing errors
  if (error.message?.includes('ffmpeg') || error.message?.includes('sharp')) {
    return reply.code(422).send({
      status: 'error',
      code: 'MEDIA_PROCESSING_ERROR',
      message: 'Media processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    return reply.code(429).send({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  
  return reply.code(statusCode).send({
    status: 'error',
    code,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
}