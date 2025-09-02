import { describe, it, expect } from 'vitest';
import { validator } from '../validation/validator.js';
import type { ConsentRef, ConsentGrant } from '../types/consent.js';

describe('Consent Schema Validation', () => {
  describe('ConsentRef', () => {
    it('should validate a valid ConsentRef', () => {
      const validConsentRef: ConsentRef = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      const result = validator.validateConsentRef(validConsentRef);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validConsentRef);
    });

    it('should validate ConsentRef with optional fields', () => {
      const validConsentRef: ConsentRef = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'write:messages',
        grant: 'grant_token_456',
        exp: Math.floor(Date.now() / 1000) + 7200,
        issuer: 'issuer123',
        subject: 'subject456',
      };

      const result = validator.validateConsentRef(validConsentRef);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validConsentRef);
    });

    it('should reject ConsentRef with invalid CID', () => {
      const invalidConsentRef = {
        policyCid: 'invalid_cid',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = validator.validateConsentRef(invalidConsentRef);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });

    it('should reject ConsentRef with invalid scope format', () => {
      const invalidConsentRef = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'invalid-scope-format',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const result = validator.validateConsentRef(invalidConsentRef);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });

    it('should reject ConsentRef with negative expiration', () => {
      const invalidConsentRef = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: -1,
      };

      const result = validator.validateConsentRef(invalidConsentRef);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be >= 0');
    });
  });

  describe('ConsentGrant', () => {
    it('should validate a valid ConsentGrant', () => {
      const validConsentGrant: ConsentGrant = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        grantId: 'grant_123',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = validator.validateConsentGrant(validConsentGrant);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validConsentGrant);
    });

    it('should validate ConsentGrant with revocation info', () => {
      const validConsentGrant: ConsentGrant = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'write:messages',
        grant: 'grant_token_456',
        exp: Math.floor(Date.now() / 1000) + 7200,
        grantId: 'grant_456',
        status: 'REVOKED',
        createdAt: '2024-01-01T00:00:00Z',
        revokedAt: '2024-01-02T00:00:00Z',
        revocationReason: 'User requested revocation',
        metadata: { source: 'user_request' },
      };

      const result = validator.validateConsentGrant(validConsentGrant);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validConsentGrant);
    });

    it('should reject ConsentGrant with invalid status', () => {
      const invalidConsentGrant = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        grantId: 'grant_123',
        status: 'INVALID_STATUS',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = validator.validateConsentGrant(invalidConsentGrant);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject ConsentGrant with invalid grantId format', () => {
      const invalidConsentGrant = {
        policyCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        scope: 'read:files',
        grant: 'grant_token_123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        grantId: 'grant@123!',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const result = validator.validateConsentGrant(invalidConsentGrant);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });
  });
});