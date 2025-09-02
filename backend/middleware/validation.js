import { body, validationResult } from 'express-validator';
import config from '../utils/config.js';

/**
 * Validates and sanitizes input for registration
 */
export const validateRegistration = [
  // Sanitize and validate email
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(value => value.toLowerCase())
    .bail(),

  // Validate and sanitize alias
  body('alias')
    .trim()
    .isLength({ min: config.ALIAS_MIN_LENGTH, max: config.ALIAS_MAX_LENGTH })
    .withMessage(`Alias must be between ${config.ALIAS_MIN_LENGTH} and ${config.ALIAS_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Alias can only contain letters, numbers, underscores, periods, and hyphens')
    .customSanitizer(value => value.toLowerCase())
    .bail(),

  // Validate password
  body('password')
    .isLength({ min: config.PASSWORD_MIN_LENGTH, max: config.PASSWORD_MAX_LENGTH })
    .withMessage(`Password must be between ${config.PASSWORD_MIN_LENGTH} and ${config.PASSWORD_MAX_LENGTH} characters`)
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[$!@#%^&*()_+\-=\[\]{};:'"\\|,.<>/?]/)
    .withMessage('Password must contain at least one special character')
    .bail(),
];

/**
 * Validates login credentials
 */
/**
 * Middleware to handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      location: error.location,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
  }
  next();
};

/**
 * Validates and sanitizes input for login
 */
export const validateLogin = [
  // Sanitize and validate email/alias
  body('alias')
    .trim()
    .notEmpty()
    .withMessage('Alias is required')
    .bail(),

  // Validate password
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .bail()
];

/**
 * Validates UCAN token
 */
export const validateUCAN = [
  body('ucan')
    .isString()
    .withMessage('UCAN token must be a string')
    .notEmpty()
    .withMessage('UCAN token is required')
    .bail()
];
