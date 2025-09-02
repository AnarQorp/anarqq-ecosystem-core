import { validator, ValidationResult } from './validator.js';

/**
 * Utility functions for common validation tasks
 */

/**
 * Validate and throw if invalid
 */
export function validateOrThrow(schemaName: string, data: any): any {
  const result = validator.validate(schemaName, data);
  if (!result.valid) {
    throw new ValidationError(`Validation failed for ${schemaName}`, result.errors || []);
  }
  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Check if a string is a valid IPFS CID
 */
export function isValidCID(cid: string): boolean {
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/.test(cid);
}

/**
 * Check if a string is valid base64
 */
export function isValidBase64(data: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(data);
}

/**
 * Validate identity reference format
 */
export function isValidIdentityRef(identityRef: any): identityRef is { squidId: string; subId?: string; daoId?: string } {
  const result = validator.validateIdentityRef(identityRef);
  return result.valid;
}

/**
 * Validate consent scope format
 */
export function isValidConsentScope(scope: string): boolean {
  return /^[a-z]+:[a-z_]+$/.test(scope);
}

/**
 * Validate event type format
 */
export function isValidEventType(eventType: string): boolean {
  return /^[A-Z_]+$/.test(eventType);
}

/**
 * Validate tag format
 */
export function isValidTag(tag: string): boolean {
  return /^[a-z0-9_-]+$/.test(tag) && tag.length <= 32;
}

/**
 * Validate version string format (semantic versioning)
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Sanitize and validate a key for indexing
 */
export function sanitizeIndexKey(key: string): string {
  if (!key || key.trim().length === 0) {
    throw new ValidationError('Invalid index key', ['Key cannot be empty']);
  }
  
  // Remove invalid characters and limit length
  const sanitized = key.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 256);
  if (sanitized.length === 0 || sanitized.replace(/_/g, '').length === 0) {
    throw new ValidationError('Invalid index key', ['Key cannot be empty after sanitization']);
  }
  return sanitized;
}

/**
 * Generate a correlation ID for audit events
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate timestamp format and ensure it's not in the future
 */
export function validateTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    return date.getTime() <= now.getTime() && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Validate expiration timestamp (must be in the future)
 */
export function validateExpirationTimestamp(timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return timestamp > now;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(code: string, message: string, details?: any): {
  status: 'error';
  code: string;
  message: string;
  details?: any;
  timestamp: string;
} {
  return {
    status: 'error',
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data?: any, cid?: string): {
  status: 'ok';
  code: 'SUCCESS';
  message: string;
  data?: any;
  cid?: string;
  timestamp: string;
} {
  return {
    status: 'ok',
    code: 'SUCCESS',
    message: 'Operation completed successfully',
    data,
    cid,
    timestamp: new Date().toISOString(),
  };
}