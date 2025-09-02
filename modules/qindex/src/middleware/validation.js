/**
 * Request validation middleware
 */

import Joi from 'joi';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Validation');

export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'params' ? req.params :
                   source === 'query' ? req.query :
                   req.body;

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Request validation failed', {
          method: req.method,
          url: req.originalUrl,
          errors: validationError.details
        });

        return next(validationError);
      }

      // Replace the data with validated/sanitized version
      if (source === 'params') {
        req.params = value;
      } else if (source === 'query') {
        req.query = value;
      } else {
        req.body = value;
      }

      next();

    } catch (error) {
      logger.error('Validation middleware error', { error: error.message });
      next(error);
    }
  };
}