/**
 * Flow Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { flowParser } from '../core/FlowParser.js';

describe('FlowParser', () => {
  describe('parseFlow', () => {
    it('should parse valid JSON flow definition', () => {
      const flowJson = JSON.stringify({
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'test-action',
            params: { key: 'value' }
          }
        ],
        metadata: {
          tags: ['test'],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: ['test.execute']
        }
      });

      const result = flowParser.parseFlow(flowJson, 'json');
      
      expect(result.success).toBe(true);
      expect(result.flow).toBeDefined();
      expect(result.flow?.id).toBe('test-flow');
      expect(result.flow?.steps).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse valid YAML flow definition', () => {
      const flowYaml = `
id: test-flow
name: Test Flow
version: 1.0.0
owner: squid:test:user
steps:
  - id: step1
    type: task
    action: test-action
    params:
      key: value
metadata:
  tags:
    - test
  category: testing
  visibility: private
  requiredPermissions:
    - test.execute
`;

      const result = flowParser.parseFlow(flowYaml, 'yaml');
      
      expect(result.success).toBe(true);
      expect(result.flow).toBeDefined();
      expect(result.flow?.id).toBe('test-flow');
      expect(result.flow?.steps).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect format automatically', () => {
      const flowJson = JSON.stringify({
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'test-action'
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      });

      const result = flowParser.parseFlow(flowJson, 'auto');
      
      expect(result.success).toBe(true);
      expect(result.flow).toBeDefined();
    });

    it('should validate required fields', () => {
      const invalidFlow = JSON.stringify({
        name: 'Test Flow',
        // Missing required fields: id, version, owner, steps, metadata
      });

      const result = flowParser.parseFlow(invalidFlow, 'json');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Check for any required field error (id, version, owner, steps, metadata)
      const hasRequiredFieldError = result.errors.some(e => 
        e.message?.includes('required') || 
        e.code === 'REQUIRED' ||
        ['id', 'version', 'owner', 'steps', 'metadata'].some(field => e.field.includes(field))
      );
      expect(hasRequiredFieldError).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const flowWithCircular = JSON.stringify({
        id: 'circular-flow',
        name: 'Circular Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'action1',
            onSuccess: 'step2'
          },
          {
            id: 'step2',
            type: 'task',
            action: 'action2',
            onSuccess: 'step1' // Creates circular dependency
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      });

      const result = flowParser.parseFlow(flowWithCircular, 'json');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should detect invalid step references', () => {
      const flowWithInvalidRef = JSON.stringify({
        id: 'invalid-ref-flow',
        name: 'Invalid Reference Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'action1',
            onSuccess: 'nonexistent-step'
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      });

      const result = flowParser.parseFlow(flowWithInvalidRef, 'json');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STEP_REFERENCE')).toBe(true);
    });

    it('should detect duplicate step IDs', () => {
      const flowWithDuplicates = JSON.stringify({
        id: 'duplicate-flow',
        name: 'Duplicate Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'action1'
          },
          {
            id: 'step1', // Duplicate ID
            type: 'task',
            action: 'action2'
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      });

      const result = flowParser.parseFlow(flowWithDuplicates, 'json');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_STEP_IDS')).toBe(true);
    });

    it('should handle malformed JSON', () => {
      const malformedJson = '{ invalid json }';

      const result = flowParser.parseFlow(malformedJson, 'json');
      
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === 'PARSE_ERROR')).toBe(true);
    });

    it('should normalize flow definition', () => {
      const minimalFlow = JSON.stringify({
        id: 'minimal-flow',
        name: 'Minimal Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'action1'
            // Missing optional fields
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      });

      const result = flowParser.parseFlow(minimalFlow, 'json');
      
      expect(result.success).toBe(true);
      expect(result.flow?.steps[0].params).toBeDefined();
      expect(result.flow?.steps[0].timeout).toBe(300000); // Default timeout
      expect(result.flow?.steps[0].retryPolicy).toBeDefined();
      expect(result.flow?.createdAt).toBeDefined();
      expect(result.flow?.updatedAt).toBeDefined();
    });
  });

  describe('validateFlowStructure', () => {
    it('should validate valid flow structure', () => {
      const validFlow = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'test-action'
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      };

      const result = flowParser.validateFlowStructure(validFlow);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid step types', () => {
      const invalidFlow = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'squid:test:user',
        steps: [
          {
            id: 'step1',
            type: 'invalid-type', // Invalid step type
            action: 'test-action'
          }
        ],
        metadata: {
          tags: [],
          category: 'testing',
          visibility: 'private',
          requiredPermissions: []
        }
      };

      const result = flowParser.validateFlowStructure(invalidFlow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});