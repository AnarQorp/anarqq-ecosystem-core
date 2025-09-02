import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaRegistry } from '../SchemaRegistry.js';

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('Schema Loading', () => {
    it('should load all Qflow event schemas', () => {
      const schemas = registry.getAllSchemas();
      
      expect(schemas.length).toBeGreaterThan(0);
      
      // Check that core schemas are loaded
      const schemaIds = schemas.map(s => s.id);
      expect(schemaIds).toContain('q.qflow.flow.created.v1');
      expect(schemaIds).toContain('q.qflow.exec.started.v1');
      expect(schemaIds).toContain('q.qflow.exec.step.dispatched.v1');
      expect(schemaIds).toContain('q.qflow.exec.step.completed.v1');
      expect(schemaIds).toContain('q.qflow.exec.completed.v1');
      expect(schemaIds).toContain('q.qflow.validation.pipeline.executed.v1');
      expect(schemaIds).toContain('q.qflow.external.event.received.v1');
    });

    it('should provide schema information', () => {
      const schema = registry.getSchema('q.qflow.flow.created.v1');
      
      expect(schema).toBeDefined();
      expect(schema!.id).toBe('q.qflow.flow.created.v1');
      expect(schema!.title).toBe('Qflow Flow Created Event');
      expect(schema!.validator).toBeDefined();
    });
  });

  describe('Event Validation', () => {
    it('should validate a valid flow created event', () => {
      const validEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-08-15T10:30:00.000Z',
        version: '1.0.0',
        source: 'qflow',
        actor: 'squid:user123',
        data: {
          flowId: 'flow-123',
          flowName: 'Test Flow',
          flowVersion: '1.0.0',
          owner: 'squid:user123',
          ipfsCid: 'QmTest123'
        }
      };

      const result = registry.validateEvent('q.qflow.flow.created.v1', validEvent);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject an invalid flow created event', () => {
      const invalidEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-08-15T10:30:00.000Z',
        version: '1.0.0',
        source: 'qflow',
        actor: 'squid:user123',
        data: {
          // Missing required fields
          flowName: 'Test Flow'
        }
      };

      const result = registry.validateEvent('q.qflow.flow.created.v1', invalidEvent);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate a valid execution started event', () => {
      const validEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-08-15T10:30:00.000Z',
        version: '1.0.0',
        source: 'qflow',
        actor: 'squid:user123',
        data: {
          executionId: 'exec-123',
          flowId: 'flow-123',
          flowVersion: '1.0.0',
          triggerType: 'manual'
        }
      };

      const result = registry.validateEvent('q.qflow.exec.started.v1', validEvent);
      
      expect(result.valid).toBe(true);
    });

    it('should validate a valid step dispatched event', () => {
      const validEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2023-08-15T10:30:00.000Z',
        version: '1.0.0',
        source: 'qflow',
        actor: 'squid:user123',
        data: {
          executionId: 'exec-123',
          stepId: 'step-1',
          stepType: 'task',
          targetNodeId: 'node-abc',
          stepPayload: {
            action: 'test-action'
          }
        }
      };

      const result = registry.validateEvent('q.qflow.exec.step.dispatched.v1', validEvent);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Event Creation', () => {
    it('should create a valid flow created event', () => {
      const eventData = {
        flowId: 'flow-123',
        flowName: 'Test Flow',
        flowVersion: '1.0.0',
        owner: 'squid:user123',
        ipfsCid: 'QmTest123'
      };

      const event = registry.createEvent(
        'q.qflow.flow.created.v1',
        'squid:user123',
        eventData
      );

      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.version).toBe('1.0.0');
      expect(event.source).toBe('qflow');
      expect(event.actor).toBe('squid:user123');
      expect(event.data).toEqual(eventData);
    });

    it('should throw error for invalid event data', () => {
      const invalidEventData = {
        flowName: 'Test Flow'
        // Missing required fields
      };

      expect(() => {
        registry.createEvent(
          'q.qflow.flow.created.v1',
          'squid:user123',
          invalidEventData
        );
      }).toThrow('Event validation failed');
    });
  });

  describe('Schema Versioning', () => {
    it('should track schema versions', () => {
      const versions = registry.getSchemaVersions('q.qflow.flow.created');
      
      expect(versions).toContain('q.qflow.flow.created.v1');
    });

    it('should check backward compatibility', () => {
      const isCompatible = registry.isBackwardCompatible(
        'q.qflow.flow.created.v1',
        'q.qflow.flow.created.v1'
      );
      
      expect(isCompatible).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown event types', () => {
      const result = registry.validateEvent('unknown.event.type', {} as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown event type: unknown.event.type');
    });
  });
});