import { describe, it, expect } from 'vitest';
import {
  isValidCID,
  isValidBase64,
  isValidIdentityRef,
  isValidConsentScope,
  isValidEventType,
  isValidTag,
  isValidVersion,
  sanitizeIndexKey,
  generateCorrelationId,
  validateTimestamp,
  validateExpirationTimestamp,
  createErrorResponse,
  createSuccessResponse,
  ValidationError,
  validateOrThrow,
} from '../validation/utils.js';

describe('Validation Utils', () => {
  describe('isValidCID', () => {
    it('should validate v0 CIDs', () => {
      expect(isValidCID('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
    });

    it('should validate v1 CIDs', () => {
      expect(isValidCID('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true);
    });

    it('should reject invalid CIDs', () => {
      expect(isValidCID('invalid_cid')).toBe(false);
      expect(isValidCID('Qm123')).toBe(false);
      expect(isValidCID('')).toBe(false);
    });
  });

  describe('isValidBase64', () => {
    it('should validate base64 strings', () => {
      expect(isValidBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isValidBase64('YWJjZGVmZw==')).toBe(true);
      expect(isValidBase64('MTIzNDU2')).toBe(true);
    });

    it('should reject invalid base64 strings', () => {
      expect(isValidBase64('Hello World!')).toBe(false);
      expect(isValidBase64('invalid@base64')).toBe(false);
      expect(isValidBase64('')).toBe(false);
    });
  });

  describe('isValidIdentityRef', () => {
    it('should validate valid identity references', () => {
      expect(isValidIdentityRef({ squidId: 'user123' })).toBe(true);
      expect(isValidIdentityRef({ squidId: 'user123', subId: 'sub456' })).toBe(true);
      expect(isValidIdentityRef({ squidId: 'user123', daoId: 'dao789' })).toBe(true);
    });

    it('should reject invalid identity references', () => {
      expect(isValidIdentityRef({})).toBe(false);
      expect(isValidIdentityRef({ subId: 'sub456' })).toBe(false);
      expect(isValidIdentityRef({ squidId: 'user@123!' })).toBe(false);
    });
  });

  describe('isValidConsentScope', () => {
    it('should validate valid consent scopes', () => {
      expect(isValidConsentScope('read:files')).toBe(true);
      expect(isValidConsentScope('write:messages')).toBe(true);
      expect(isValidConsentScope('admin:users')).toBe(true);
    });

    it('should reject invalid consent scopes', () => {
      expect(isValidConsentScope('invalid-scope')).toBe(false);
      expect(isValidConsentScope('read_files')).toBe(false);
      expect(isValidConsentScope('READ:FILES')).toBe(false);
      expect(isValidConsentScope('')).toBe(false);
    });
  });

  describe('isValidEventType', () => {
    it('should validate valid event types', () => {
      expect(isValidEventType('AUTH_SUCCESS')).toBe(true);
      expect(isValidEventType('PERMISSION_DENIED')).toBe(true);
      expect(isValidEventType('DATA_ACCESS')).toBe(true);
    });

    it('should reject invalid event types', () => {
      expect(isValidEventType('auth_success')).toBe(false);
      expect(isValidEventType('Auth-Success')).toBe(false);
      expect(isValidEventType('AUTH SUCCESS')).toBe(false);
      expect(isValidEventType('')).toBe(false);
    });
  });

  describe('isValidTag', () => {
    it('should validate valid tags', () => {
      expect(isValidTag('tag1')).toBe(true);
      expect(isValidTag('tag-2')).toBe(true);
      expect(isValidTag('tag_3')).toBe(true);
      expect(isValidTag('123')).toBe(true);
    });

    it('should reject invalid tags', () => {
      expect(isValidTag('TAG1')).toBe(false);
      expect(isValidTag('tag@1')).toBe(false);
      expect(isValidTag('tag 1')).toBe(false);
      expect(isValidTag('a'.repeat(33))).toBe(false);
      expect(isValidTag('')).toBe(false);
    });
  });

  describe('isValidVersion', () => {
    it('should validate semantic versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('2.1.3')).toBe(true);
      expect(isValidVersion('10.20.30')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('v1.0.0')).toBe(false);
      expect(isValidVersion('1.0.0-beta')).toBe(false);
      expect(isValidVersion('')).toBe(false);
    });
  });

  describe('sanitizeIndexKey', () => {
    it('should sanitize valid keys', () => {
      expect(sanitizeIndexKey('valid_key-123')).toBe('valid_key-123');
      expect(sanitizeIndexKey('user.profile.name')).toBe('user.profile.name');
    });

    it('should sanitize invalid characters', () => {
      expect(sanitizeIndexKey('user@profile#name')).toBe('user_profile_name');
      expect(sanitizeIndexKey('key with spaces')).toBe('key_with_spaces');
    });

    it('should limit key length', () => {
      const longKey = 'a'.repeat(300);
      const sanitized = sanitizeIndexKey(longKey);
      expect(sanitized.length).toBe(256);
    });

    it('should throw for empty keys', () => {
      expect(() => sanitizeIndexKey('')).toThrow(ValidationError);
      expect(() => sanitizeIndexKey('!@#$%')).toThrow(ValidationError);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate valid correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^corr_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateTimestamp', () => {
    it('should validate valid timestamps', () => {
      expect(validateTimestamp('2024-01-01T00:00:00Z')).toBe(true);
      expect(validateTimestamp(new Date().toISOString())).toBe(true);
    });

    it('should reject future timestamps', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
      expect(validateTimestamp(futureDate)).toBe(false);
    });

    it('should reject invalid timestamps', () => {
      expect(validateTimestamp('invalid-date')).toBe(false);
      expect(validateTimestamp('')).toBe(false);
    });
  });

  describe('validateExpirationTimestamp', () => {
    it('should validate future timestamps', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(validateExpirationTimestamp(futureTimestamp)).toBe(true);
    });

    it('should reject past timestamps', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      expect(validateExpirationTimestamp(pastTimestamp)).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error responses', () => {
      const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input');
      
      expect(response.status).toBe('error');
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.message).toBe('Invalid input');
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include details when provided', () => {
      const details = { field: 'username', reason: 'too_short' };
      const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input', details);
      
      expect(response.details).toEqual(details);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create standardized success responses', () => {
      const response = createSuccessResponse();
      
      expect(response.status).toBe('ok');
      expect(response.code).toBe('SUCCESS');
      expect(response.message).toBe('Operation completed successfully');
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include data and CID when provided', () => {
      const data = { id: 123, name: 'test' };
      const cid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const response = createSuccessResponse(data, cid);
      
      expect(response.data).toEqual(data);
      expect(response.cid).toBe(cid);
    });
  });

  describe('validateOrThrow', () => {
    it('should return data for valid input', () => {
      const validData = { squidId: 'user123' };
      const result = validateOrThrow('IdentityRef', validData);
      expect(result).toEqual(validData);
    });

    it('should throw ValidationError for invalid input', () => {
      const invalidData = { subId: 'sub123' }; // missing squidId
      expect(() => validateOrThrow('IdentityRef', invalidData)).toThrow(ValidationError);
    });
  });

  describe('ValidationError', () => {
    it('should create error with message and errors', () => {
      const errors = ['Field is required', 'Invalid format'];
      const error = new ValidationError('Validation failed', errors);
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });
  });
});