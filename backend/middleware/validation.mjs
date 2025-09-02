/**
 * Request Validation Middleware
 * 
 * Provides validation utilities for API endpoints
 */

/**
 * Validate required fields in request body
 */
export const validateRequest = (requiredFields = []) => {
  return (req, res, next) => {
    try {
      const missingFields = [];
      
      for (const field of requiredFields) {
        if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          missingFields
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate price format
 */
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice > 0;
};

/**
 * Validate CID format (basic check)
 */
export const validateCID = (cid) => {
  if (!cid || typeof cid !== 'string') return false;
  // Basic CID validation - should start with Qm or baf
  return cid.startsWith('Qm') || cid.startsWith('baf') || cid.startsWith('bafy');
};

/**
 * Validate sQuid ID format
 */
export const validateSquidId = (squidId) => {
  if (!squidId || typeof squidId !== 'string') return false;
  return squidId.length >= 3 && squidId.length <= 50;
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str, maxLength = 1000) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

/**
 * Validate marketplace listing data
 */
export const validateListingData = (req, res, next) => {
  try {
    const { title, description, price, fileCid, currency } = req.body;
    const errors = [];

    // Validate title
    if (!title || title.length < 3 || title.length > 100) {
      errors.push('Title must be between 3 and 100 characters');
    }

    // Validate description
    if (!description || description.length < 10 || description.length > 1000) {
      errors.push('Description must be between 10 and 1000 characters');
    }

    // Validate price
    if (!validatePrice(price)) {
      errors.push('Price must be a positive number');
    }

    // Validate CID
    if (!validateCID(fileCid)) {
      errors.push('Invalid file CID format');
    }

    // Validate currency
    const validCurrencies = ['QToken', 'PI'];
    if (currency && !validCurrencies.includes(currency)) {
      errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    next();

  } catch (error) {
    console.error('Listing validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
};

/**
 * Validate Data Subject Request (DSR)
 */
export const validateDSR = (req, res, next) => {
  const { type, subjectId, requestedBy } = req.body;
  
  if (!type || !subjectId || !requestedBy) {
    return res.status(400).json({
      status: 'error',
      code: 'DSR_VALIDATION_ERROR',
      message: 'Missing required fields: type, subjectId, requestedBy'
    });
  }

  const validTypes = ['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'RESTRICTION'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      status: 'error',
      code: 'DSR_INVALID_TYPE',
      message: `Invalid DSR type. Must be one of: ${validTypes.join(', ')}`
    });
  }

  next();
};

/**
 * Validate Privacy Impact Assessment (PIA)
 */
export const validatePIA = (req, res, next) => {
  const { activityName, dataTypes, processingPurpose, legalBasis } = req.body;
  
  if (!activityName || !dataTypes || !processingPurpose || !legalBasis) {
    return res.status(400).json({
      status: 'error',
      code: 'PIA_VALIDATION_ERROR',
      message: 'Missing required fields: activityName, dataTypes, processingPurpose, legalBasis'
    });
  }

  if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
    return res.status(400).json({
      status: 'error',
      code: 'PIA_INVALID_DATA_TYPES',
      message: 'dataTypes must be a non-empty array'
    });
  }

  const validLegalBases = ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'];
  if (!validLegalBases.includes(legalBasis)) {
    return res.status(400).json({
      status: 'error',
      code: 'PIA_INVALID_LEGAL_BASIS',
      message: `Invalid legal basis. Must be one of: ${validLegalBases.join(', ')}`
    });
  }

  next();
};

export const validation = {
  validateRequest,
  validateEmail,
  validatePrice,
  validateCID,
  validateSquidId,
  sanitizeString,
  validateListingData,
  validateDSR,
  validatePIA
};

export default {
  validateRequest,
  validateEmail,
  validatePrice,
  validateCID,
  validateSquidId,
  sanitizeString,
  validateListingData,
  validateDSR,
  validatePIA
};