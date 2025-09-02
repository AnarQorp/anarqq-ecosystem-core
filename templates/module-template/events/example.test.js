import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Load event schemas
const exampleCreatedSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'example.created.v1.event.json'), 'utf8')
);

// Setup AJV validator
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe('Event Tests - Example Created v1', () => {
  const validateEvent = ajv.compile(exampleCreatedSchema);

  describe('Schema Validation', () => {
    it('should validate a complete valid event', () => {
      const validEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001',
          subId: '123e4567-e89b-12d3-a456-426614174002'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource',
          description: 'A test resource',
          tags: ['test', 'example'],
          cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          visibility: 'private'
        },
        metadata: {
          correlationId: '123e4567-e89b-12d3-a456-426614174004',
          traceId: 'trace-123',
          version: '1.0',
          priority: 'normal'
        }
      };

      const isValid = validateEvent(validEvent);
      expect(isValid).toBe(true);
      expect(validateEvent.errors).toBeNull();
    });

    it('should validate a minimal valid event', () => {
      const minimalEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(minimalEvent);
      expect(isValid).toBe(true);
      expect(validateEvent.errors).toBeNull();
    });

    it('should reject event without required fields', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z'
        // Missing source, actor, data, metadata
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with wrong eventType', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.other.example.created.v1', // Wrong event type
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors).toHaveLength(1);
      expect(validateEvent.errors[0].instancePath).toBe('/eventType');
      expect(validateEvent.errors[0].keyword).toBe('const');
    });

    it('should reject event with wrong source', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: 'other-module', // Wrong source
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors).toHaveLength(1);
      expect(validateEvent.errors[0].instancePath).toBe('/source');
      expect(validateEvent.errors[0].keyword).toBe('const');
    });

    it('should reject event with invalid UUID formats', () => {
      const invalidEvent = {
        eventId: 'invalid-uuid',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: 'invalid-uuid'
        },
        data: {
          resourceId: 'invalid-uuid',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors.length).toBe(3); // eventId, actor.squidId, data.resourceId
      validateEvent.errors.forEach(error => {
        expect(error.keyword).toBe('format');
      });
    });

    it('should reject event with invalid timestamp format', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: 'invalid-timestamp',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors).toHaveLength(1);
      expect(validateEvent.errors[0].instancePath).toBe('/timestamp');
      expect(validateEvent.errors[0].keyword).toBe('format');
    });

    it('should reject event with invalid data constraints', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: '', // Too short
          description: 'x'.repeat(1001), // Too long
          tags: Array(11).fill('tag'), // Too many tags
          visibility: 'invalid' // Invalid enum value
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with additional properties', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        },
        extraProperty: 'not allowed' // Additional property
      };

      const isValid = validateEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(validateEvent.errors).toHaveLength(1);
      expect(validateEvent.errors[0].keyword).toBe('additionalProperties');
    });
  });

  describe('Event Structure Validation', () => {
    it('should validate event follows Q ecosystem naming convention', () => {
      const eventType = 'q.{{MODULE_NAME}}.example.created.v1';
      const parts = eventType.split('.');
      
      expect(parts).toHaveLength(5);
      expect(parts[0]).toBe('q');
      expect(parts[1]).toBe('{{MODULE_NAME}}');
      expect(parts[2]).toBe('example');
      expect(parts[3]).toBe('created');
      expect(parts[4]).toBe('v1');
    });

    it('should validate required metadata fields', () => {
      const event = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'q.{{MODULE_NAME}}.example.created.v1',
        timestamp: '2023-01-01T00:00:00Z',
        source: '{{MODULE_NAME}}',
        actor: {
          squidId: '123e4567-e89b-12d3-a456-426614174001'
        },
        data: {
          resourceId: '123e4567-e89b-12d3-a456-426614174003',
          name: 'Example Resource'
        },
        metadata: {
          version: '1.0'
        }
      };

      const isValid = validateEvent(event);
      expect(isValid).toBe(true);
      expect(event.metadata.version).toBe('1.0');
    });
  });

  describe('Event Examples Validation', () => {
    it('should validate all examples in the schema', () => {
      const examples = exampleCreatedSchema.examples || [];
      
      examples.forEach((example, index) => {
        const isValid = validateEvent(example);
        expect(isValid, `Example ${index} should be valid`).toBe(true);
        expect(validateEvent.errors).toBeNull();
      });
    });
  });
});