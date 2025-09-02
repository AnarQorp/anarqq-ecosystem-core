/**
 * Custom error class for consistent error handling
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

/**
 * Error handler middleware for consistent error responses
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error(`[${new Date().toISOString()}] ${err.name || 'Error'}:`, {
    message: err.message,
    stack: err.stack,
    code: err.statusCode,
    path: req.path,
    method: req.method,
    details: err.details,
    headers: req.headers,
  });

  // Determine response status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = process.env.NODE_ENV === 'development' ? err.details : null;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  const error = new APIError(
    `The requested resource ${req.originalUrl} was not found`,
    404
  );
  
  errorHandler(error, req, res, () => {});
};

/**
 * Async handler wrapper to catch async/await errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped async function with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(err => next(err));
};

/**
 * Validation error handler
 * @param {Array} errors - Array of validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validationErrorHandler = (errors, req, res, next) => {
  const error = new APIError(
    'Validation failed',
    400,
    errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      type: err.type,
    }))
  );
  
  errorHandler(error, req, res, next);
};
