/**
 * Joi Validation Middleware
 * 
 * Provides validation utilities for API endpoints using Joi schemas
 */

/**
 * Create validation middleware for Joi schema
 */
export const validateJoi = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true 
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          errors,
          timestamp: new Date().toISOString()
        });
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();

    } catch (err) {
      console.error('[JoiValidation] Validation error:', err);
      res.status(500).json({
        status: 'error',
        code: 'VALIDATION_SERVICE_ERROR',
        message: 'Validation service error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

export default validateJoi;