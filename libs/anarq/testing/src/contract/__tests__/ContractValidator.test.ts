/**
 * Contract Validator Tests
 * Tests for the contract validation system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContractValidator } from '../ContractValidator';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ContractValidator', () => {
  let validator: ContractValidator;
  let testModulePath: string;

  beforeEach(() => {
    validator = new ContractValidator();
    testModulePath = join(__dirname, 'test-module');
    
    // Create test module structure
    mkdirSync(testModulePath, { recursive: true });
    mkdirSync(join(testModulePath, 'contracts'), { recursive: true });
    mkdirSync(join(testModulePath, 'events'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test module
    if (testModulePath) {
      rmSync(testModulePath, { recursive: true, force: true });
    }
    validator.clearContracts();
  });

  describe('loadModuleContract', () => {
    it('should load a valid module contract', async () => {
      // Create test module files
      writeFileSync(join(testModulePath, 'package.json'), JSON.stringify({
        name: 'test-module',
        version: '1.0.0',
        dependencies: {
          '@anarq/common-schemas': '^1.0.0'
        }
      }));

      writeFileSync(join(testModulePath, 'openapi.yaml'), `
openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
      `);

      writeFileSync(join(testModulePath, 'mcp.json'), JSON.stringify({
        name: 'test-module',
        version: '1.0.0',
        tools: [
          {
            name: 'test.tool',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string' }
              },
              required: ['input']
            },
            outputSchema: {
              type: 'object',
              properties: {
                output: { type: 'string' }
              }
            }
          }
        ]
      }));

      writeFileSync(join(testModulePath, 'contracts', 'test.schema.json'), JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      }));

      writeFileSync(join(testModulePath, 'events', 'test.event.json'), JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          eventType: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          data: { type: 'object' }
        },
        required: ['eventType', 'timestamp']
      }));

      const contract = await validator.loadModuleContract(testModulePath);

      expect(contract.name).toBe('test-module');
      expect(contract.version).toBe('1.0.0');
      expect(contract.openApiSpec).toBeDefined();
      expect(contract.mcpSpec).toBeDefined();
      expect(contract.schemas).toHaveProperty('test');
      expect(contract.events).toHaveProperty('test');
      expect(contract.dependencies).toContain('@anarq/common-schemas');
    });

    it('should handle missing optional files gracefully', async () => {
      // Create minimal module with only package.json
      writeFileSync(join(testModulePath, 'package.json'), JSON.stringify({
        name: 'minimal-module',
        version: '1.0.0'
      }));

      const contract = await validator.loadModuleContract(testModulePath);

      expect(contract.name).toBe('minimal-module');
      expect(contract.version).toBe('1.0.0');
      expect(contract.openApiSpec).toBeUndefined();
      expect(contract.mcpSpec).toBeUndefined();
      expect(contract.schemas).toEqual({});
      expect(contract.events).toEqual({});
      expect(contract.dependencies).toEqual([]);
    });
  });

  describe('validateOpenApiSpec', () => {
    it('should validate a correct OpenAPI spec', () => {
      const validSpec = {
        openapi: '3.0.3',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          status: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const errors = validator.validateOpenApiSpec(validSpec);
      expect(errors).toHaveLength(0);
    });

    it('should detect OpenAPI spec errors', () => {
      const invalidSpec = {
        openapi: '3.0.3',
        info: {
          title: 'Test API'
          // Missing version
        },
        paths: {}
      };

      const errors = validator.validateOpenApiSpec(invalidSpec);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('API_COMPLIANCE');
      expect(errors[0].severity).toBe('ERROR');
    });
  });

  describe('validateSchema', () => {
    it('should validate data against a schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number', minimum: 0 }
        },
        required: ['id', 'name']
      };

      const validData = {
        id: 'test-123',
        name: 'Test User',
        age: 25
      };

      const errors = validator.validateSchema(schema, validData, 'test-schema');
      expect(errors).toHaveLength(0);
    });

    it('should detect schema validation errors', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number', minimum: 0 }
        },
        required: ['id', 'name']
      };

      const invalidData = {
        id: 123, // Should be string
        age: -5   // Below minimum
        // Missing required 'name'
      };

      const errors = validator.validateSchema(schema, invalidData, 'test-schema');
      expect(errors.length).toBeGreaterThan(0);
      
      const errorTypes = errors.map(e => e.type);
      expect(errorTypes).toContain('SCHEMA_VALIDATION');
    });
  });

  describe('validateMcpSpec', () => {
    it('should validate a correct MCP spec', () => {
      const validSpec = {
        name: 'test-module',
        version: '1.0.0',
        description: 'Test module',
        tools: [
          {
            name: 'test.tool',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string' }
              }
            },
            outputSchema: {
              type: 'object',
              properties: {
                output: { type: 'string' }
              }
            }
          }
        ]
      };

      const errors = validator.validateMcpSpec(validSpec);
      expect(errors).toHaveLength(0);
    });

    it('should detect MCP spec errors', () => {
      const invalidSpec = {
        // Missing name and version
        tools: [
          {
            // Missing name, inputSchema, outputSchema
            description: 'Invalid tool'
          }
        ]
      };

      const errors = validator.validateMcpSpec(invalidSpec);
      expect(errors.length).toBeGreaterThan(0);
      
      const errorMessages = errors.map(e => e.message);
      expect(errorMessages).toContain('MCP spec must have a name');
      expect(errorMessages).toContain('MCP spec must have a version');
    });
  });

  describe('validateCrossModuleCompatibility', () => {
    it('should validate compatibility between modules', async () => {
      // Create two test modules
      const moduleAPath = join(__dirname, 'module-a');
      const moduleBPath = join(__dirname, 'module-b');

      try {
        // Setup module A
        mkdirSync(moduleAPath, { recursive: true });
        mkdirSync(join(moduleAPath, 'contracts'), { recursive: true });
        mkdirSync(join(moduleAPath, 'events'), { recursive: true });

        writeFileSync(join(moduleAPath, 'package.json'), JSON.stringify({
          name: 'module-a',
          version: '1.0.0',
          dependencies: { 'module-b': '^1.0.0' }
        }));

        writeFileSync(join(moduleAPath, 'contracts', 'shared.schema.json'), JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'string' },
            data: { type: 'string' }
          }
        }));

        writeFileSync(join(moduleAPath, 'events', 'shared.event.json'), JSON.stringify({
          type: 'object',
          properties: {
            eventType: { type: 'string' },
            payload: { type: 'object' }
          }
        }));

        // Setup module B
        mkdirSync(moduleBPath, { recursive: true });
        mkdirSync(join(moduleBPath, 'contracts'), { recursive: true });
        mkdirSync(join(moduleBPath, 'events'), { recursive: true });

        writeFileSync(join(moduleBPath, 'package.json'), JSON.stringify({
          name: 'module-b',
          version: '1.0.0'
        }));

        writeFileSync(join(moduleBPath, 'contracts', 'shared.schema.json'), JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'string' },
            data: { type: 'string' }
          }
        }));

        writeFileSync(join(moduleBPath, 'events', 'shared.event.json'), JSON.stringify({
          type: 'object',
          properties: {
            eventType: { type: 'string' },
            payload: { type: 'object' }
          }
        }));

        // Load both modules
        await validator.loadModuleContract(moduleAPath);
        await validator.loadModuleContract(moduleBPath);

        // Validate compatibility
        const errors = validator.validateCrossModuleCompatibility('module-a', 'module-b');
        
        // Should have no errors since schemas are identical
        expect(errors).toHaveLength(0);

      } finally {
        // Clean up
        rmSync(moduleAPath, { recursive: true, force: true });
        rmSync(moduleBPath, { recursive: true, force: true });
      }
    });
  });

  describe('validateModuleContract', () => {
    it('should validate a complete module contract', async () => {
      // Create a complete test module
      writeFileSync(join(testModulePath, 'package.json'), JSON.stringify({
        name: 'complete-module',
        version: '1.0.0'
      }));

      writeFileSync(join(testModulePath, 'openapi.yaml'), `
openapi: 3.0.3
info:
  title: Complete API
  version: 1.0.0
paths:
  /health:
    get:
      responses:
        '200':
          description: Health check
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
      `);

      writeFileSync(join(testModulePath, 'mcp.json'), JSON.stringify({
        name: 'complete-module',
        version: '1.0.0',
        tools: [
          {
            name: 'complete.test',
            description: 'Complete test tool',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string' }
              },
              required: ['message']
            },
            outputSchema: {
              type: 'object',
              properties: {
                result: { type: 'string' }
              },
              required: ['result']
            }
          }
        ]
      }));

      writeFileSync(join(testModulePath, 'contracts', 'message.schema.json'), JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'content', 'timestamp']
      }));

      const result = await validator.validateModuleContract(testModulePath);

      expect(result.valid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'ERROR')).toHaveLength(0);
      expect(result.coverage.percentage).toBeGreaterThan(0);
    });
  });

  describe('generateTestData', () => {
    it('should generate valid test data from schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9-]+$' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          email: { type: 'string', format: 'email' },
          active: { type: 'boolean' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 5
          }
        },
        required: ['id', 'name', 'email']
      };

      const testData = validator.generateTestData(schema);

      expect(testData).toHaveProperty('id');
      expect(testData).toHaveProperty('name');
      expect(testData).toHaveProperty('email');
      expect(typeof testData.id).toBe('string');
      expect(typeof testData.name).toBe('string');
      expect(typeof testData.email).toBe('string');
      
      if (testData.age !== undefined) {
        expect(typeof testData.age).toBe('number');
        expect(testData.age).toBeGreaterThanOrEqual(0);
        expect(testData.age).toBeLessThanOrEqual(150);
      }
      
      if (testData.active !== undefined) {
        expect(typeof testData.active).toBe('boolean');
      }
      
      if (testData.tags !== undefined) {
        expect(Array.isArray(testData.tags)).toBe(true);
        expect(testData.tags.length).toBeLessThanOrEqual(5);
      }
    });
  });
});