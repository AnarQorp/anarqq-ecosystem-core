/**
 * Standardized error response utility
 * @param {number} status - HTTP status code
 * @param {string} code - Error code identifier
 * @param {string} message - Human-readable error message
 * @param {Object} [details] - Optional additional error details
 * @returns {Object} Standardized error response
 */
export const createErrorResponse = (status, code, message, details = null) => ({
  success: false,
  error: {
    status,
    code,
    message,
    ...(details && { details }),
  },
});

/**
 * Standard error codes for auth service
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELDS: 'VALIDATION_MISSING_FIELDS',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
};

/**
 * Create a standardized error response for validation failures
 * @param {Object[]} validationErrors - Array of validation errors from express-validator
 * @returns {Object} Standardized error response
 */
export const createValidationErrorResponse = (validationErrors) => {
  const details = validationErrors.map(err => ({
    field: err.param,
    message: err.msg,
  }));
  
  return createErrorResponse(
    400,
    ERROR_CODES.VALIDATION_FAILED,
    'Validation failed',
    { details }
  );
};

/**
 * Create a standardized error response for rate limiting
 * @param {string} message - Optional custom message
 * @returns {Object} Standardized error response
 */
export const createRateLimitErrorResponse = (message = 'Too many requests, please try again later.') => {
  return createErrorResponse(
    429,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message
  );
};
