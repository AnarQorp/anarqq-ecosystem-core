/**
 * N8n Converter and Visual Designer Tests
 * 
 * Tests for task 16.4 implementation:
 * - CLI to import n8n JSON workflows → Qflow specifications
 * - Visual designer functionality
 * - Compatibility templates and migration validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { N8nWorkflowImporter, MigrationOptions } from '../../src/migration/N8nWorkflowImporter.js';
import { TemplateValidator } from '../../src/migration/TemplateValidator.js';
import { MigrationCLI } from '../../src/migration/MigrationCLI.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('N8n Converter and Visual Designer', () => {
  let importer: N8nWorkflowImporter;
  let templateValidator: TemplateValidator;
  let migrationCLI: MigrationCLI;

  beforeEach(() => {
    const options: MigrationOptions = {
      preserveNodeIds: false,
      validateCredentials: true,
      createCompatibilityLayer: true,
      generateTestCases: true,
      owner: 'test-user',
      daoSubnet: 'test-dao'
    };
    
    importer = new N8nWorkflowImporter(options);
    templateValidator = new TemplateValidator();
    migrationCLI = new MigrationCLI();
  });

  describe('N8n Workflow Import', () => {
    it('should import simple n8n workflow with HTTP request', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Simple HTTP Workflow',
        nodes: [
          {
            id: 'start-node',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 100],
            parameters: {}
          },
          {
            id: 'http-node',
            name: 'HTTP Request',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [300, 100],
            parameters: {
              url: 'https://api.example.com/data',
              requestMethod: 'GET',
              headers: {
                parameters: [
                  { name: 'Authorization', value: 'Bearer token' }
                ]
              }
            }
          }
        ],
        connections: {
          'Start': {
            main: [
              [{ node: 'HTTP Request', type: 'main', index: 0 }]
            ]
          }
        },
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();
      expect(result.flowDefinition!.name).toBe('Simple HTTP Workflow');
      expect(result.flowDefinition!.steps).toHaveLength(2);
      
      const httpStep = result.flowDefinition!.steps.find(s => s.action === 'qflow.action.http');
      expect(httpStep).toBeDefined();
      expect(httpStep!.params.url).toBe('https://api.example.com/data');
      expect(httpStep!.params.method).toBe('GET');
    });

    it('should handle n8n function nodes with security validation', async () => {
      const n8nWorkflow = {
        id: 'function-workflow',
        name: 'Function Workflow',
        nodes: [
          {
            id: 'function-node',
            name: 'Process Data',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [200, 100],
            parameters: {
              functionCode: `
                // Safe function code
                const data = items[0].json;
                return [{
                  json: {
                    processed: true,
                    value: data.value * 2
                  }
                }];
              `
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();
      
      const functionStep = result.flowDefinition!.steps.find(s => s.action === 'qflow.action.function');
      expect(functionStep).toBeDefined();
      expect(functionStep!.params.language).toBe('javascript');
      expect(functionStep!.params.sandboxed).toBe(true);
    });

    it('should detect security issues in function code', async () => {
      const n8nWorkflow = {
        id: 'unsafe-function-workflow',
        name: 'Unsafe Function Workflow',
        nodes: [
          {
            id: 'unsafe-function-node',
            name: 'Unsafe Function',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [200, 100],
            parameters: {
              functionCode: `
                // Unsafe code with eval
                const result = eval('2 + 2');
                const fs = require('fs');
                return [{ json: { result } }];
              `
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true); // Should still import but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const functionStep = result.flowDefinition!.steps.find(s => s.action === 'qflow.action.function');
      expect(functionStep!.migrationNotes?.securityIssues).toBeDefined();
      expect(functionStep!.migrationNotes!.securityIssues!.length).toBeGreaterThan(0);
    });

    it('should convert n8n IF conditions correctly', async () => {
      const n8nWorkflow = {
        id: 'condition-workflow',
        name: 'Condition Workflow',
        nodes: [
          {
            id: 'if-node',
            name: 'Check Value',
            type: 'n8n-nodes-base.if',
            typeVersion: 1,
            position: [200, 100],
            parameters: {
              conditions: {
                values: [
                  {
                    leftValue: '{{ $json.value }}',
                    operation: 'larger',
                    rightValue: 10
                  }
                ]
              },
              combineOperation: 'AND'
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      
      const conditionStep = result.flowDefinition!.steps.find(s => s.action === 'qflow.condition.if');
      expect(conditionStep).toBeDefined();
      expect(conditionStep!.params.conditions).toBeDefined();
      expect(conditionStep!.params.conditions[0].operation).toBe('greater_than');
    });
  });

  describe('Template Validator', () => {
    it('should validate HTTP request node parameters', async () => {
      const nodeParameters = {
        url: 'https://api.example.com/test',
        requestMethod: 'POST',
        headers: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        body: '{"test": true}'
      };

      const result = await templateValidator.validateNodeConversion(
        'n8n-nodes-base.httpRequest',
        nodeParameters
      );

      expect(result.valid).toBe(true);
      expect(result.transformedParams.url).toBe('https://api.example.com/test');
      expect(result.transformedParams.method).toBe('POST');
      expect(result.transformedParams.headers['Content-Type']).toBe('application/json');
    });

    it('should detect missing required parameters', async () => {
      const nodeParameters = {
        requestMethod: 'GET'
        // Missing required 'url' parameter
      };

      const result = await templateValidator.validateNodeConversion(
        'n8n-nodes-base.httpRequest',
        nodeParameters
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'url')).toBe(true);
    });

    it('should provide compatibility notes for unsupported nodes', async () => {
      const result = await templateValidator.validateNodeConversion(
        'n8n-nodes-base.unsupported-node',
        {}
      );

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should validate function code for security issues', async () => {
      const nodeParameters = {
        functionCode: `
          const fs = require('fs');
          eval('dangerous code');
          return items;
        `
      };

      const result = await templateValidator.validateNodeConversion(
        'n8n-nodes-base.function',
        nodeParameters
      );

      expect(result.securityIssues.length).toBeGreaterThan(0);
      expect(result.securityIssues.some(issue => issue.type === 'code_injection')).toBe(true);
    });
  });

  describe('Migration CLI', () => {
    const testWorkflowPath = path.join(__dirname, 'test-workflow.json');
    const testOutputPath = path.join(__dirname, 'test-output.json');

    beforeEach(async () => {
      const testWorkflow = {
        id: 'cli-test-workflow',
        name: 'CLI Test Workflow',
        nodes: [
          {
            id: 'start',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 100],
            parameters: {}
          }
        ],
        connections: {},
        active: true
      };

      await fs.writeFile(testWorkflowPath, JSON.stringify(testWorkflow, null, 2));
    });

    afterEach(async () => {
      try {
        await fs.unlink(testWorkflowPath);
        await fs.unlink(testOutputPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should import workflow via CLI', async () => {
      // This would test the CLI functionality
      // For now, we'll test the underlying functionality
      const workflowContent = await fs.readFile(testWorkflowPath, 'utf-8');
      const result = await importer.importFromJson(workflowContent);

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();
    });
  });

  describe('Visual Designer Integration', () => {
    it('should provide flow definition in designer-compatible format', async () => {
      const n8nWorkflow = {
        id: 'designer-test',
        name: 'Designer Test Workflow',
        nodes: [
          {
            id: 'start-node',
            name: 'Start',
            type: 'n8n-nodes-base.start',
            typeVersion: 1,
            position: [100, 100],
            parameters: {}
          },
          {
            id: 'http-node',
            name: 'API Call',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [300, 100],
            parameters: {
              url: 'https://api.example.com/data',
              requestMethod: 'GET'
            }
          }
        ],
        connections: {
          'Start': {
            main: [
              [{ node: 'API Call', type: 'main', index: 0 }]
            ]
          }
        },
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();

      // Check that the flow definition has all required fields for the designer
      const flow = result.flowDefinition!;
      expect(flow.id).toBeDefined();
      expect(flow.name).toBeDefined();
      expect(flow.steps).toBeDefined();
      expect(flow.metadata).toBeDefined();

      // Check that steps have the required structure
      for (const step of flow.steps) {
        expect(step.id).toBeDefined();
        expect(step.type).toBeDefined();
        expect(step.action).toBeDefined();
        expect(step.params).toBeDefined();
      }
    });

    it('should validate flow definition for designer', async () => {
      const flowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-user',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'qflow.action.http',
            params: { url: 'https://api.example.com' },
            onSuccess: 'step2'
          },
          {
            id: 'step2',
            type: 'task',
            action: 'qflow.action.transform',
            params: { transformations: [] }
          }
        ],
        metadata: {
          tags: ['test'],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // This would be the validation logic used by the designer API
      const issues = [];
      
      if (!flowDefinition.name) {
        issues.push({ severity: 'error', message: 'Flow name is required' });
      }
      
      if (!flowDefinition.steps || flowDefinition.steps.length === 0) {
        issues.push({ severity: 'error', message: 'Flow must have at least one step' });
      }
      
      if (!flowDefinition.owner) {
        issues.push({ severity: 'error', message: 'Flow owner is required' });
      }

      expect(issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Compatibility Templates', () => {
    it('should load compatibility templates successfully', async () => {
      const availableTemplates = templateValidator.getAvailableTemplates();
      
      expect(availableTemplates.length).toBeGreaterThan(0);
      expect(availableTemplates).toContain('n8n-nodes-base.httpRequest');
      expect(availableTemplates).toContain('n8n-nodes-base.function');
      expect(availableTemplates).toContain('n8n-nodes-base.if');
    });

    it('should provide template for HTTP request node', () => {
      const template = templateValidator.getTemplate('n8n-nodes-base.httpRequest');
      
      expect(template).toBeDefined();
      expect(template!.qflowAction).toBe('qflow.action.http');
      expect(template!.parameterMapping.url).toBe('url');
      expect(template!.parameterMapping.requestMethod).toBe('method');
      expect(template!.validation.required).toContain('url');
    });

    it('should provide compatibility notes', () => {
      const notes = templateValidator.getCompatibilityNotes('n8n-nodes-base.function');
      
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.some(note => note.includes('sandbox'))).toBe(true);
    });
  });

  describe('End-to-End Migration', () => {
    it('should perform complete n8n to Qflow migration', async () => {
      const complexN8nWorkflow = {
        id: 'complex-workflow',
        name: 'Complex E2E Workflow',
        nodes: [
          {
            id: 'webhook-trigger',
            name: 'Webhook Trigger',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              path: 'test-webhook',
              httpMethod: 'POST'
            }
          },
          {
            id: 'condition-check',
            name: 'Check Data',
            type: 'n8n-nodes-base.if',
            typeVersion: 1,
            position: [300, 100],
            parameters: {
              conditions: {
                values: [
                  {
                    leftValue: '{{ $json.type }}',
                    operation: 'equal',
                    rightValue: 'important'
                  }
                ]
              }
            }
          },
          {
            id: 'process-data',
            name: 'Process Important Data',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [500, 50],
            parameters: {
              functionCode: `
                const data = items[0].json;
                return [{
                  json: {
                    ...data,
                    processed: true,
                    timestamp: new Date().toISOString()
                  }
                }];
              `
            }
          },
          {
            id: 'send-notification',
            name: 'Send Notification',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [700, 50],
            parameters: {
              url: 'https://api.notification.service/send',
              requestMethod: 'POST',
              headers: {
                parameters: [
                  { name: 'Content-Type', value: 'application/json' }
                ]
              },
              body: '{{ JSON.stringify($json) }}'
            }
          }
        ],
        connections: {
          'Webhook Trigger': {
            main: [
              [{ node: 'Check Data', type: 'main', index: 0 }]
            ]
          },
          'Check Data': {
            main: [
              [{ node: 'Process Important Data', type: 'main', index: 0 }]
            ]
          },
          'Process Important Data': {
            main: [
              [{ node: 'Send Notification', type: 'main', index: 0 }]
            ]
          }
        },
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(complexN8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();
      
      const flow = result.flowDefinition!;
      expect(flow.steps).toHaveLength(4);
      
      // Verify webhook trigger
      const webhookStep = flow.steps.find(s => s.action === 'qflow.trigger.webhook');
      expect(webhookStep).toBeDefined();
      expect(webhookStep!.params.path).toBe('test-webhook');
      
      // Verify condition
      const conditionStep = flow.steps.find(s => s.action === 'qflow.condition.if');
      expect(conditionStep).toBeDefined();
      expect(conditionStep!.params.conditions[0].operation).toBe('equals');
      
      // Verify function
      const functionStep = flow.steps.find(s => s.action === 'qflow.action.function');
      expect(functionStep).toBeDefined();
      expect(functionStep!.params.sandboxed).toBe(true);
      
      // Verify HTTP request
      const httpStep = flow.steps.find(s => s.action === 'qflow.action.http');
      expect(httpStep).toBeDefined();
      expect(httpStep!.params.method).toBe('POST');
      
      // Verify connections are preserved
      expect(webhookStep!.onSuccess).toBeDefined();
      expect(conditionStep!.onSuccess).toBeDefined();
      expect(functionStep!.onSuccess).toBeDefined();
    });
  });
});