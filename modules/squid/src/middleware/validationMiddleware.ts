/**
 * Validation Middleware
 * Request validation using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

export const validateCreateIdentity = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Name contains invalid characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('privacyLevel')
    .optional()
    .isIn(['PUBLIC', 'DAO_ONLY', 'PRIVATE', 'ANONYMOUS'])
    .withMessage('Invalid privacy level'),
];

export const validateCreateSubidentity = [
  param('identityId')
    .isUUID()
    .withMessage('Invalid identity ID format'),
  
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['DAO', 'ENTERPRISE', 'CONSENTIDA', 'AID'])
    .withMessage('Invalid subidentity type'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('kycLevel')
    .optional()
    .isIn(['BASIC', 'ENHANCED', 'INSTITUTIONAL'])
    .withMessage('Invalid KYC level'),
];

export const validateVerificationRequest = [
  param('identityId')
    .isUUID()
    .withMessage('Invalid identity ID format'),
  
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Invalid date of birth format'),
  
  body('documentType')
    .isIn(['passport', 'drivers_license', 'national_id'])
    .withMessage('Invalid document type'),
  
  body('documentNumber')
    .notEmpty()
    .withMessage('Document number is required'),
];

export const validateIdentityId = [
  param('identityId')
    .isUUID()
    .withMessage('Invalid identity ID format'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        errors: errors.array()
      },
      timestamp: new Date(),
      retryable: false
    });
    return;
  }
  
  next();
};