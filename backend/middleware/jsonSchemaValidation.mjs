/**
 * JSON Schema Validation Middleware
 * Provides JSON Schema validation for API endpoints
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * Create validation middleware for JSON Schema
 */
export const validateSchema = (schema) => {
  const validate = ajv.compile(schema);
  
  return (req, res, next) => {
    const valid = validate(req.body);
    
    if (!valid) {
      const errors = validate.errors.map(error => ({
        field: error.instancePath || error.schemaPath,
        message: error.message,
        value: error.data
      }));
      
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        errors
      });
    }
    
    next();
  };
};

export default validateSchema;