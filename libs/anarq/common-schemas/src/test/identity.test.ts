import { describe, it, expect } from 'vitest';
import { validator } from '../validation/validator.js';
import type { IdentityRef, IdentityInfo } from '../types/identity.js';

describe('Identity Schema Validation', () => {
  describe('IdentityRef', () => {
    it('should validate a valid IdentityRef', () => {
      const validIdentityRef: IdentityRef = {
        squidId: 'user123',
      };

      const result = validator.validateIdentityRef(validIdentityRef);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validIdentityRef);
    });

    it('should validate IdentityRef with subId and daoId', () => {
      const validIdentityRef: IdentityRef = {
        squidId: 'user123',
        subId: 'sub456',
        daoId: 'dao789',
      };

      const result = validator.validateIdentityRef(validIdentityRef);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validIdentityRef);
    });

    it('should reject IdentityRef without squidId', () => {
      const invalidIdentityRef = {
        subId: 'sub456',
      };

      const result = validator.validateIdentityRef(invalidIdentityRef);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("root: must have required property 'squidId'");
    });

    it('should reject IdentityRef with invalid squidId format', () => {
      const invalidIdentityRef = {
        squidId: 'user@123!',
      };

      const result = validator.validateIdentityRef(invalidIdentityRef);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('pattern');
    });

    it('should reject IdentityRef with squidId too long', () => {
      const invalidIdentityRef = {
        squidId: 'a'.repeat(65),
      };

      const result = validator.validateIdentityRef(invalidIdentityRef);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must NOT have more than 64 characters');
    });
  });

  describe('IdentityInfo', () => {
    it('should validate a valid IdentityInfo', () => {
      const validIdentityInfo: IdentityInfo = {
        squidId: 'user123',
        displayName: 'John Doe',
        reputation: 85,
        createdAt: '2024-01-01T00:00:00Z',
        lastActive: '2024-01-15T12:00:00Z',
        status: 'ACTIVE',
      };

      const result = validator.validateIdentityInfo(validIdentityInfo);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validIdentityInfo);
    });

    it('should validate minimal IdentityInfo', () => {
      const validIdentityInfo: IdentityInfo = {
        squidId: 'user123',
        createdAt: '2024-01-01T00:00:00Z',
        status: 'ACTIVE',
      };

      const result = validator.validateIdentityInfo(validIdentityInfo);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validIdentityInfo);
    });

    it('should reject IdentityInfo with invalid status', () => {
      const invalidIdentityInfo = {
        squidId: 'user123',
        createdAt: '2024-01-01T00:00:00Z',
        status: 'INVALID_STATUS',
      };

      const result = validator.validateIdentityInfo(invalidIdentityInfo);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be equal to one of the allowed values');
    });

    it('should reject IdentityInfo with reputation out of range', () => {
      const invalidIdentityInfo = {
        squidId: 'user123',
        reputation: 150,
        createdAt: '2024-01-01T00:00:00Z',
        status: 'ACTIVE',
      };

      const result = validator.validateIdentityInfo(invalidIdentityInfo);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('must be <= 100');
    });

    it('should reject IdentityInfo with invalid date format', () => {
      const invalidIdentityInfo = {
        squidId: 'user123',
        createdAt: 'invalid-date',
        status: 'ACTIVE',
      };

      const result = validator.validateIdentityInfo(invalidIdentityInfo);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('format');
    });
  });
});