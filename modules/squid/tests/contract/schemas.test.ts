/**
 * Contract Tests for JSON Schemas
 */

import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load schemas
const identitySchema = JSON.parse(
  readFileSync(join(__dirname, '../../contracts/identity.schema.json'), 'utf-8')
);

const createIdentityRequestSchema = JSON.parse(
  readFileSync(join(__dirname, '../../contracts/create-identity-request.schema.json'), 'utf-8')
);

const createSubidentityRequestSchema = JSON.parse(
  readFileSync(join(__dirname, '../../contracts/create-subidentity-request.schema.json'), 'utf-8')
);

// Setup AJV validator
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateIdentity = ajv.compile(identitySchema);
const validateCreateIdentityRequest = ajv.compile(createIdentityRequestSchema);
const validateCreateSubidentityRequest = ajv.compile(createSubidentityRequestSchema);

describe('Schema Contract Tests', () => {
  describe('Identity Schema', () => {
    it('should validate a complete identity object', () => {
      const validIdentity = {
        did: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Identity',
        type: 'ROOT',
        rootId: '123e4567-e89b-12d3-a456-426614174000',
        children: [],
        depth: 0,
        path: ['123e4567-e89b-12d3-a456-426614174000'],
        status: 'ACTIVE',
        verificationLevel: 'UNVERIFIED',
        reputation: 100,
        governanceType: 'SELF',
        privacyLevel: 'PUBLIC',
        publicKey: 'pub_test_key',
        qindexRegistered: false,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUsed: '2024-01-01T00:00:00.000Z'
      };

      const isValid = validateIdentity(validIdentity);
      
      if (!isValid) {
        console.error('Validation errors:', validateIdentity.errors);
      }
      
      expect(isValid).toBe(true);
    });

    it('should validate a subidentity object', () => {
      const validSubidentity = {
        did: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Test Subidentity',
        type: 'DAO',
        parentId: '123e4567-e89b-12d3-a456-426614174000',
        rootId: '123e4567-e89b-12d3-a456-426614174000',
        children: [],
        depth: 1,
        path: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174001'],
        status: 'ACTIVE',
        verificationLevel: 'BASIC',
        reputation: 80,
        governanceType: 'DAO',
        privacyLevel: 'DAO_ONLY',
        publicKey: 'pub_test_sub_key',
        qindexRegistered: true,
        kyc: {
          required: true,
          submitted: true,
          approved: false,
          level: 'BASIC',
          submittedAt: '2024-01-01T00:00:00.000Z'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUsed: '2024-01-01T00:00:00.000Z',
        metadata: {
          purpose: 'DAO governance'
        }
      };

      const isValid = validateIdentity(validSubidentity);
      
      if (!isValid) {
        console.error('Validation errors:', validateIdentity.errors);
      }
      
      expect(isValid).toBe(true);
    });

    it('should reject identity with invalid type', () => {
      const invalidIdentity = {
        did: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Identity',
        type: 'INVALID_TYPE', // Invalid type
        rootId: '123e4567-e89b-12d3-a456-426614174000',
        children: [],
        depth: 0,
        path: ['123e4567-e89b-12d3-a456-426614174000'],
        status: 'ACTIVE',
        verificationLevel: 'UNVERIFIED',
        reputation: 100,
        governanceType: 'SELF',
        privacyLevel: 'PUBLIC',
        publicKey: 'pub_test_key',
        qindexRegistered: false,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUsed: '2024-01-01T00:00:00.000Z'
      };

      const isValid = validateIdentity(invalidIdentity);
      expect(isValid).toBe(false);
      expect(validateIdentity.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/type',
          keyword: 'enum'
        })
      );
    });

    it('should reject identity with missing required fields', () => {
      const incompleteIdentity = {
        did: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Identity'
        // Missing required fields
      };

      const isValid = validateIdentity(incompleteIdentity);
      expect(isValid).toBe(false);
      
      const missingFields = validateIdentity.errors?.filter(
        error => error.keyword === 'required'
      ).map(error => error.params?.missingProperty);
      
      expect(missingFields).toContain('type');
      expect(missingFields).toContain('rootId');
      expect(missingFields).toContain('status');
    });

    it('should reject identity with invalid reputation range', () => {
      const invalidIdentity = {
        did: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Identity',
        type: 'ROOT',
        rootId: '123e4567-e89b-12d3-a456-426614174000',
        children: [],
        depth: 0,
        path: ['123e4567-e89b-12d3-a456-426614174000'],
        status: 'ACTIVE',
        verificationLevel: 'UNVERIFIED',
        reputation: 1500, // Invalid: exceeds maximum of 1000
        governanceType: 'SELF',
        privacyLevel: 'PUBLIC',
        publicKey: 'pub_test_key',
        qindexRegistered: false,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUsed: '2024-01-01T00:00:00.000Z'
      };

      const isValid = validateIdentity(invalidIdentity);
      expect(isValid).toBe(false);
      expect(validateIdentity.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/reputation',
          keyword: 'maximum'
        })
      );
    });
  });

  describe('Create Identity Request Schema', () => {
    it('should validate a minimal create identity request', () => {
      const validRequest = {
        name: 'Test Identity'
      };

      const isValid = validateCreateIdentityRequest(validRequest);
      expect(isValid).toBe(true);
    });

    it('should validate a complete create identity request', () => {
      const validRequest = {
        name: 'Test Identity',
        description: 'A test identity for validation',
        avatar: 'https://example.com/avatar.jpg',
        tags: ['test', 'validation'],
        privacyLevel: 'PUBLIC',
        metadata: {
          source: 'test',
          version: '1.0'
        }
      };

      const isValid = validateCreateIdentityRequest(validRequest);
      expect(isValid).toBe(true);
    });

    it('should reject request with invalid name', () => {
      const invalidRequest = {
        name: '' // Empty name not allowed
      };

      const isValid = validateCreateIdentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateIdentityRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/name',
          keyword: 'minLength'
        })
      );
    });

    it('should reject request with invalid privacy level', () => {
      const invalidRequest = {
        name: 'Test Identity',
        privacyLevel: 'INVALID_LEVEL'
      };

      const isValid = validateCreateIdentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateIdentityRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/privacyLevel',
          keyword: 'enum'
        })
      );
    });

    it('should reject request with too many tags', () => {
      const invalidRequest = {
        name: 'Test Identity',
        tags: Array.from({ length: 15 }, (_, i) => `tag${i}`) // Exceeds maxItems: 10
      };

      const isValid = validateCreateIdentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateIdentityRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/tags',
          keyword: 'maxItems'
        })
      );
    });
  });

  describe('Create Subidentity Request Schema', () => {
    it('should validate a minimal create subidentity request', () => {
      const validRequest = {
        name: 'Test Subidentity',
        type: 'DAO'
      };

      const isValid = validateCreateSubidentityRequest(validRequest);
      expect(isValid).toBe(true);
    });

    it('should validate a complete create subidentity request', () => {
      const validRequest = {
        name: 'Test DAO Subidentity',
        type: 'DAO',
        description: 'A DAO subidentity for governance',
        purpose: 'Community governance and voting',
        avatar: 'https://example.com/dao-avatar.jpg',
        tags: ['dao', 'governance'],
        privacyLevel: 'DAO_ONLY',
        kycLevel: 'ENHANCED',
        governanceConfig: {
          daoId: '789e0123-e89b-12d3-a456-426614174002',
          parentalConsent: false,
          governanceRules: {
            votingThreshold: 0.6,
            proposalDelay: 86400
          }
        },
        metadata: {
          category: 'governance',
          region: 'global'
        }
      };

      const isValid = validateCreateSubidentityRequest(validRequest);
      
      if (!isValid) {
        console.error('Validation errors:', validateCreateSubidentityRequest.errors);
      }
      
      expect(isValid).toBe(true);
    });

    it('should reject request with ROOT type', () => {
      const invalidRequest = {
        name: 'Test Subidentity',
        type: 'ROOT' // ROOT type not allowed for subidentities
      };

      const isValid = validateCreateSubidentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateSubidentityRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/type',
          keyword: 'enum'
        })
      );
    });

    it('should reject request with missing required fields', () => {
      const invalidRequest = {
        name: 'Test Subidentity'
        // Missing required 'type' field
      };

      const isValid = validateCreateSubidentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateSubidentityRequest.errors).toContainEqual(
        expect.objectContaining({
          keyword: 'required',
          params: expect.objectContaining({
            missingProperty: 'type'
          })
        })
      );
    });

    it('should reject request with invalid KYC level', () => {
      const invalidRequest = {
        name: 'Test Subidentity',
        type: 'DAO',
        kycLevel: 'INVALID_LEVEL'
      };

      const isValid = validateCreateSubidentityRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateCreateSubidentityRequest.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/kycLevel',
          keyword: 'enum'
        })
      );
    });
  });

  describe('Schema Evolution Compatibility', () => {
    it('should handle additional properties gracefully', () => {
      const identityWithExtraProps = {
        did: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Identity',
        type: 'ROOT',
        rootId: '123e4567-e89b-12d3-a456-426614174000',
        children: [],
        depth: 0,
        path: ['123e4567-e89b-12d3-a456-426614174000'],
        status: 'ACTIVE',
        verificationLevel: 'UNVERIFIED',
        reputation: 100,
        governanceType: 'SELF',
        privacyLevel: 'PUBLIC',
        publicKey: 'pub_test_key',
        qindexRegistered: false,
        kyc: {
          required: false,
          submitted: false,
          approved: false
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        lastUsed: '2024-01-01T00:00:00.000Z',
        // Additional properties that might be added in future versions
        futureField: 'future value',
        anotherFutureField: {
          nested: 'data'
        }
      };

      // Schema should reject additional properties (additionalProperties: false)
      const isValid = validateIdentity(identityWithExtraProps);
      expect(isValid).toBe(false);
      
      const additionalPropErrors = validateIdentity.errors?.filter(
        error => error.keyword === 'additionalProperties'
      );
      expect(additionalPropErrors?.length).toBeGreaterThan(0);
    });
  });
});