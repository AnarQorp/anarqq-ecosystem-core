import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Load schemas
const commonSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'common.schema.json'), 'utf8'));
const exampleSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'example.schema.json'), 'utf8'));

// Setup AJV validator
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Add common schema
ajv.addSchema(commonSchema, 'common.schema.json');
ajv.addSchema(exampleSchema, 'example.schema.json');

describe('Contract Tests - Example Schema', () => {
  describe('ExampleRequest Schema', () => {
    const validateRequest = ajv.compile(exampleSchema.definitions.ExampleRequest);

    it('should validate a valid request', () => {
      const validRequest = {
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'create',
        data: {
          name: 'Test Resource',
          description: 'A test resource',
          tags: ['test', 'example']
        }
      };

      const isValid = validateRequest(validRequest);
      expect(isValid).toBe(true);
      expect(validateRequest.errors).toBeNull();
    });

    it('should validate a minimal valid request', () => {
      const minimalRequest = {
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'read'
      };

      const isValid = validateRequest(minimalRequest);
      expect(isValid).toBe(true);
      expect(validateRequest.errors).toBeNull();
    });

    it('should reject request without required fields', () => {
      const invalidRequest = {
        action: 'create'
        // Missing squidId
      };

      const isValid = validateRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateRequest.errors).toHaveLength(1);
      expect(validateRequest.errors[0].instancePath).toBe('');
      expect(validateRequest.errors[0].keyword).toBe('required');
      expect(validateRequest.errors[0].params.missingProperty).toBe('squidId');
    });

    it('should reject request with invalid squidId format', () => {
      const invalidRequest = {
        squidId: 'invalid-uuid',
        action: 'create'
      };

      const isValid = validateRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateRequest.errors).toHaveLength(1);
      expect(validateRequest.errors[0].instancePath).toBe('/squidId');
      expect(validateRequest.errors[0].keyword).toBe('format');
    });

    it('should reject request with invalid action', () => {
      const invalidRequest = {
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'invalid-action'
      };

      const isValid = validateRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateRequest.errors).toHaveLength(1);
      expect(validateRequest.errors[0].instancePath).toBe('/action');
      expect(validateRequest.errors[0].keyword).toBe('enum');
    });

    it('should reject request with invalid data properties', () => {
      const invalidRequest = {
        squidId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'create',
        data: {
          name: '', // Too short
          description: 'x'.repeat(1001), // Too long
          tags: ['x'.repeat(51)], // Tag too long
          extraProperty: 'not allowed' // Additional property
        }
      };

      const isValid = validateRequest(invalidRequest);
      expect(isValid).toBe(false);
      expect(validateRequest.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ExampleResponse Schema', () => {
    const validateResponse = ajv.compile(exampleSchema.definitions.ExampleResponse);

    it('should validate a valid response', () => {
      const validResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Operation completed successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Resource',
          description: 'A test resource',
          tags: ['test', 'example'],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          owner: {
            squidId: '123e4567-e89b-12d3-a456-426614174001'
          }
        },
        cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
      };

      const isValid = validateResponse(validResponse);
      expect(isValid).toBe(true);
      expect(validateResponse.errors).toBeNull();
    });

    it('should validate a minimal valid response', () => {
      const minimalResponse = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Operation completed successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Resource',
          createdAt: '2023-01-01T00:00:00Z',
          owner: {
            squidId: '123e4567-e89b-12d3-a456-426614174001'
          }
        }
      };

      const isValid = validateResponse(minimalResponse);
      expect(isValid).toBe(true);
      expect(validateResponse.errors).toBeNull();
    });

    it('should reject response without required fields', () => {
      const invalidResponse = {
        status: 'ok',
        code: 'SUCCESS'
        // Missing message
      };

      const isValid = validateResponse(invalidResponse);
      expect(isValid).toBe(false);
      expect(validateResponse.errors).toHaveLength(1);
      expect(validateResponse.errors[0].keyword).toBe('required');
    });

    it('should reject response with invalid status', () => {
      const invalidResponse = {
        status: 'invalid-status',
        code: 'SUCCESS',
        message: 'Operation completed successfully'
      };

      const isValid = validateResponse(invalidResponse);
      expect(isValid).toBe(false);
      expect(validateResponse.errors).toHaveLength(1);
      expect(validateResponse.errors[0].instancePath).toBe('/status');
      expect(validateResponse.errors[0].keyword).toBe('enum');
    });
  });

  describe('Integration with Common Schemas', () => {
    it('should validate IdentityRef in response data', () => {
      const responseWithIdentity = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Operation completed successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Resource',
          createdAt: '2023-01-01T00:00:00Z',
          owner: {
            squidId: '123e4567-e89b-12d3-a456-426614174001',
            subId: '123e4567-e89b-12d3-a456-426614174002',
            daoId: '123e4567-e89b-12d3-a456-426614174003'
          }
        }
      };

      const validateResponse = ajv.compile(exampleSchema.definitions.ExampleResponse);
      const isValid = validateResponse(responseWithIdentity);
      expect(isValid).toBe(true);
      expect(validateResponse.errors).toBeNull();
    });

    it('should reject invalid IdentityRef format', () => {
      const responseWithInvalidIdentity = {
        status: 'ok',
        code: 'SUCCESS',
        message: 'Operation completed successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Resource',
          createdAt: '2023-01-01T00:00:00Z',
          owner: {
            squidId: 'invalid-uuid'
          }
        }
      };

      const validateResponse = ajv.compile(exampleSchema.definitions.ExampleResponse);
      const isValid = validateResponse(responseWithInvalidIdentity);
      expect(isValid).toBe(false);
      expect(validateResponse.errors.length).toBeGreaterThan(0);
    });
  });
});