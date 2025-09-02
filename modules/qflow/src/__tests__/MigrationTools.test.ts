/**
 * Migration Tools Test Suite
 * 
 * Comprehensive tests for n8n to Qflow migration tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { N8nWorkflowImporter, MigrationOptions } from '../migration/N8nWorkflowImporter';
import { CompatibilityLayer, CompatibilityConfig } from '../migration/CompatibilityLayer';
import { MigrationValidator, ValidationConfig } from '../migration/MigrationValidator';
import { FlowDefinition } from '../models/FlowDefinition';

describe('N8nWorkflowImporter', () => {
  let importer: N8nWorkflowImporter;
  let mockOptions: MigrationOptions;

  beforeEach(() => {
    mockOptions = {
      preserveNodeIds: false,
      validateCredentials: true,
      createCompatibilityLayer: true,
      generateTestCases: true,
      owner: 'test-owner',
      daoSubnet: 'test-dao'
    };
    importer = new N8nWorkflowImporter(mockOptions);
  });

  describe('importFromJson', () => {
    it('should successfully import a simple n8n workflow', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
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
              requestMethod: 'GET'
            }
          }
        ],
        connections: {
          'Start': {
            'main': [
              {
                node: 'HTTP Request',
                type: 'main',
                index: 0
              }
            ]
          }
        },
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.flowDefinition).toBeDefined();
      expect(result.flowDefinition!.name).toBe('Test Workflow');
      expect(result.flowDefinition!.steps).toHaveLength(2);
      expect(result.flowDefinition!.owner).toBe('test-owner');
      expect(result.flowDefinition!.metadata.daoSubnet).toBe('test-dao');
    });

    it('should handle unsupported node types gracefully', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'unsupported-node',
            name: 'Unsupported',
            type: 'n8n-nodes-community.unsupported',
            typeVersion: 1,
            position: [100, 100],
            parameters: {}
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('unsupported_feature');
    });

    it('should generate test cases when requested', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [
          {
            id: 'start-node',
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

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      expect(result.testCases).toBeDefined();
      expect(result.testCases!.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      const result = await importer.importFromJson('invalid json');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('conversion_failed');
    });
  });

  describe('node conversion', () => {
    it('should convert HTTP request nodes correctly', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'HTTP Test',
        nodes: [
          {
            id: 'http-node',
            name: 'HTTP Request',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              url: 'https://api.example.com/data',
              requestMethod: 'POST',
              body: '{"test": true}',
              headers: {
                parameters: [
                  { name: 'Content-Type', value: 'application/json' }
                ]
              }
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      const httpStep = result.flowDefinition!.steps[0];
      expect(httpStep.action).toBe('qflow.action.http');
      expect(httpStep.params.method).toBe('POST');
      expect(httpStep.params.url).toBe('https://api.example.com/data');
      expect(httpStep.params.body).toBe('{"test": true}');
    });

    it('should convert function nodes to WASM format', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Function Test',
        nodes: [
          {
            id: 'function-node',
            name: 'Function',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              functionCode: 'return items.map(item => ({ ...item.json, processed: true }));'
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      const functionStep = result.flowDefinition!.steps[0];
      expect(functionStep.action).toBe('qflow.action.function');
      expect(functionStep.params.code).toContain('return items.map');
      expect(functionStep.params.sandboxed).toBe(true);
      expect(functionStep.resourceLimits).toBeDefined();
    });

    it('should convert webhook nodes correctly', async () => {
      const n8nWorkflow = {
        id: 'test-workflow',
        name: 'Webhook Test',
        nodes: [
          {
            id: 'webhook-node',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              path: 'test-webhook',
              httpMethod: 'POST',
              responseMode: 'onReceived'
            }
          }
        ],
        connections: {},
        active: true
      };

      const result = await importer.importFromJson(JSON.stringify(n8nWorkflow));

      expect(result.success).toBe(true);
      const webhookStep = result.flowDefinition!.steps[0];
      expect(webhookStep.type).toBe('event-trigger');
      expect(webhookStep.action).toBe('qflow.trigger.webhook');
      expect(webhookStep.params.path).toBe('test-webhook');
      expect(webhookStep.params.method).toBe('POST');
    });
  });
});

describe('CompatibilityLayer', () => {
  let compatibilityLayer: CompatibilityLayer;
  let mockConfig: CompatibilityConfig;

  beforeEach(() => {
    mockConfig = {
      enableN8nApiEmulation: true,
      enableLegacyWebhooks: true,
      enableCredentialMapping: true,
      enableDataFormatTranslation: true,
      strictMode: false
    };
    compatibilityLayer = new CompatibilityLayer(mockConfig);
  });

  describe('credential mapping', () => {
    it('should map HTTP basic auth credentials', async () => {
      const n8nCredentials = {
        user: 'testuser',
        password: 'testpass'
      };

      const result = await compatibilityLayer.mapCredentials('httpBasicAuth', n8nCredentials);

      expect(result.type).toBe('basic_auth');
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('testpass');
    });

    it('should map OAuth2 credentials', async () => {
      const n8nCredentials = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        accessTokenUrl: 'https://oauth.example.com/token',
        authUrl: 'https://oauth.example.com/auth',
        scope: 'read write'
      };

      const result = await compatibilityLayer.mapCredentials('oAuth2Api', n8nCredentials);

      expect(result.type).toBe('oauth2');
      expect(result.client_id).toBe('test-client-id');
      expect(result.client_secret).toBe('test-client-secret');
      expect(result.token_url).toBe('https://oauth.example.com/token');
    });

    it('should handle unknown credential types in non-strict mode', async () => {
      const n8nCredentials = { apiKey: 'test-key' };

      const result = await compatibilityLayer.mapCredentials('unknownType', n8nCredentials);

      expect(result.type).toBe('unknownType');
      expect(result.apiKey).toBe('test-key');
    });

    it('should throw error for unknown credential types in strict mode', async () => {
      compatibilityLayer.updateConfig({ strictMode: true });

      await expect(
        compatibilityLayer.mapCredentials('unknownType', {})
      ).rejects.toThrow('No credential mapping found for type: unknownType');
    });
  });

  describe('data format translation', () => {
    it('should translate n8n execution data to Qflow format', () => {
      const n8nData = {
        'HTTP Request': [
          {
            data: {
              main: [[{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]]
            },
            json: { id: 1, name: 'test' },
            binary: { file: 'binary-data' }
          }
        ]
      };

      const translator = compatibilityLayer['dataTranslators'].get('n8n_to_qflow');
      const result = translator!.translator(n8nData);

      expect(result['HTTP Request']).toEqual([{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]);
      expect(result['HTTP Request_binary']).toEqual({ file: 'binary-data' });
    });

    it('should translate Qflow data to n8n format', () => {
      const qflowData = {
        'step1': [{ id: 1, name: 'test' }],
        'step1_binary': { file: 'binary-data' }
      };

      const translator = compatibilityLayer['dataTranslators'].get('qflow_to_n8n');
      const result = translator!.translator(qflowData);

      expect(result.step1).toHaveLength(1);
      expect(result.step1[0].data.main[0]).toEqual([{ id: 1, name: 'test' }]);
      expect(result.step1[0].binary).toEqual({ file: 'binary-data' });
    });
  });

  describe('n8n function wrapper', () => {
    it('should create compatibility wrapper for n8n functions', () => {
      const originalCode = 'return items.map(item => ({ ...item.json, processed: true }));';
      const wrapper = compatibilityLayer.createN8nFunctionWrapper(originalCode);

      expect(wrapper).toContain('n8nCompatibilityWrapper');
      expect(wrapper).toContain('$input');
      expect(wrapper).toContain('$node');
      expect(wrapper).toContain('$workflow');
      expect(wrapper).toContain(originalCode);
    });
  });

  describe('flow validation', () => {
    it('should validate migrated flow and identify compatibility issues', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'qflow.action.http',
            params: {
              continueOnFail: true, // n8n-specific parameter
              alwaysOutputData: true, // n8n-specific parameter
              url: 'https://api.example.com'
            }
          }
        ],
        metadata: {
          tags: ['migrated'],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await compatibilityLayer.validateMigratedFlow(flow);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(2); // continueOnFail and alwaysOutputData warnings
      expect(result.warnings![0].message).toContain('continueOnFail');
      expect(result.warnings![1].message).toContain('alwaysOutputData');
    });
  });
});

describe('MigrationValidator', () => {
  let validator: MigrationValidator;
  let mockConfig: ValidationConfig;
  let compatibilityLayer: CompatibilityLayer;

  beforeEach(() => {
    mockConfig = {
      enableStructuralValidation: true,
      enableSemanticValidation: true,
      enablePerformanceValidation: true,
      enableSecurityValidation: true,
      enableCompatibilityValidation: true,
      strictMode: false,
      timeoutMs: 30000
    };
    compatibilityLayer = new CompatibilityLayer();
    validator = new MigrationValidator(mockConfig, compatibilityLayer);
  });

  describe('structural validation', () => {
    it('should pass validation for well-structured flow', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'start',
            type: 'event-trigger',
            action: 'qflow.trigger.manual',
            params: {},
            onSuccess: 'step1'
          },
          {
            id: 'step1',
            type: 'task',
            action: 'qflow.action.http',
            params: { url: 'https://api.example.com' }
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateStructure'](flow);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.metrics.stepCount).toBe(2);
      expect(result.metrics.connectionCount).toBe(1);
    });

    it('should detect cyclic dependencies', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'step1',
            type: 'task',
            action: 'qflow.action.http',
            params: {},
            onSuccess: 'step2'
          },
          {
            id: 'step2',
            type: 'task',
            action: 'qflow.action.http',
            params: {},
            onSuccess: 'step1' // Creates cycle
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateStructure'](flow);

      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.message.includes('Cyclic dependencies'))).toBe(true);
    });

    it('should detect unreachable steps', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'start',
            type: 'event-trigger',
            action: 'qflow.trigger.manual',
            params: {}
          },
          {
            id: 'unreachable',
            type: 'task',
            action: 'qflow.action.http',
            params: {}
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateStructure'](flow);

      expect(result.passed).toBe(true); // Warnings don't fail structural validation
      expect(result.issues.some(issue => issue.message.includes('Unreachable steps'))).toBe(true);
      expect(result.metrics.unreachableSteps).toContain('unreachable');
    });
  });

  describe('security validation', () => {
    it('should detect potential credential exposure', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'insecure-step',
            type: 'task',
            action: 'qflow.action.http',
            params: {
              headers: {
                'Authorization': 'Bearer secret-token-123' // Exposed credential
              }
            }
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateSecurity'](flow);

      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.message.includes('credential exposure'))).toBe(true);
      expect(result.metrics.credentialExposure).toContain('insecure-step');
    });

    it('should detect unsafe operations', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'unsafe-step',
            type: 'task',
            action: 'qflow.action.function',
            params: {
              code: 'eval(userInput); return result;' // Unsafe eval
            }
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateSecurity'](flow);

      expect(result.passed).toBe(true); // Warnings don't fail security validation
      expect(result.issues.some(issue => issue.message.includes('unsafe operation'))).toBe(true);
      expect(result.metrics.unsafeOperations).toContain('unsafe-step');
    });

    it('should detect sandbox violations', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'violating-step',
            type: 'task',
            action: 'qflow.action.function',
            params: {
              code: 'const fs = require("fs"); fs.readFileSync("/etc/passwd");' // Sandbox violation
            }
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validateSecurity'](flow);

      expect(result.passed).toBe(false);
      expect(result.issues.some(issue => issue.message.includes('Sandbox violation'))).toBe(true);
      expect(result.metrics.sandboxViolations).toContain('violating-step');
    });
  });

  describe('performance validation', () => {
    it('should identify performance bottlenecks', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'slow-step',
            type: 'task',
            action: 'qflow.action.http',
            params: {},
            timeout: 120000 // 2 minutes - potentially slow
          }
        ],
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validatePerformance'](flow);

      expect(result.passed).toBe(true); // Warnings don't fail performance validation
      expect(result.issues.some(issue => issue.message.includes('Potentially slow step'))).toBe(true);
      expect(result.metrics.bottlenecks).toContain('slow-step');
    });

    it('should detect high memory requirements', async () => {
      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: Array.from({ length: 100 }, (_, i) => ({
          id: `step-${i}`,
          type: 'task' as const,
          action: 'qflow.action.function',
          params: {},
          resourceLimits: {
            maxMemoryMB: 512 // High memory per step
          }
        })),
        metadata: {
          tags: [],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await validator['validatePerformance'](flow);

      expect(result.passed).toBe(true); // Warnings don't fail performance validation
      expect(result.issues.some(issue => issue.message.includes('High memory requirement'))).toBe(true);
    });
  });

  describe('comprehensive validation', () => {
    it('should provide overall validation report', async () => {
      const originalWorkflow = {
        id: 'original',
        name: 'Original Workflow',
        nodes: [
          {
            id: 'node1',
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

      const migratedFlow: FlowDefinition = {
        id: 'migrated',
        name: 'Migrated Workflow',
        version: '1.0.0',
        owner: 'test-owner',
        steps: [
          {
            id: 'start',
            type: 'event-trigger',
            action: 'qflow.trigger.manual',
            params: {}
          }
        ],
        metadata: {
          tags: ['migrated'],
          category: 'automation',
          visibility: 'private',
          requiredPermissions: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const migrationResult = {
        success: true,
        warnings: [],
        errors: [],
        compatibilityNotes: []
      };

      const report = await validator.validateMigration(originalWorkflow, migratedFlow, migrationResult);

      expect(report.overall.passed).toBe(true);
      expect(report.overall.score).toBeGreaterThan(0);
      expect(report.overall.timestamp).toBeDefined();
      expect(report.overall.duration).toBeGreaterThan(0);
      expect(report.structural.passed).toBe(true);
      expect(report.semantic.passed).toBe(true);
      expect(report.performance.passed).toBe(true);
      expect(report.security.passed).toBe(true);
      expect(report.compatibility.passed).toBe(true);
      expect(report.recommendations).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should perform end-to-end migration workflow', async () => {
    // Create a complete n8n workflow
    const n8nWorkflow = {
      id: 'e2e-test-workflow',
      name: 'End-to-End Test Workflow',
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
          name: 'Fetch Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [300, 100],
          parameters: {
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            requestMethod: 'GET'
          }
        },
        {
          id: 'function-node',
          name: 'Process Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [500, 100],
          parameters: {
            functionCode: 'return items.map(item => ({ ...item.json, processed: true }));'
          }
        }
      ],
      connections: {
        'Start': {
          'main': [{ node: 'Fetch Data', type: 'main', index: 0 }]
        },
        'Fetch Data': {
          'main': [{ node: 'Process Data', type: 'main', index: 0 }]
        }
      },
      active: true
    };

    // Step 1: Import workflow
    const importer = new N8nWorkflowImporter({
      generateTestCases: true,
      owner: 'e2e-test-owner'
    });

    const importResult = await importer.importFromJson(JSON.stringify(n8nWorkflow));
    expect(importResult.success).toBe(true);
    expect(importResult.flowDefinition).toBeDefined();

    // Step 2: Validate migration
    const compatibilityLayer = new CompatibilityLayer();
    const validator = new MigrationValidator({}, compatibilityLayer);

    const validationReport = await validator.validateMigration(
      n8nWorkflow,
      importResult.flowDefinition!,
      importResult
    );

    expect(validationReport.overall.passed).toBe(true);
    expect(validationReport.overall.score).toBeGreaterThan(70);

    // Step 3: Check compatibility
    const compatibilityResult = await compatibilityLayer.validateMigratedFlow(
      importResult.flowDefinition!
    );

    expect(compatibilityResult.valid).toBe(true);

    // Step 4: Verify flow structure
    const flow = importResult.flowDefinition!;
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[0].type).toBe('event-trigger');
    expect(flow.steps[1].action).toBe('qflow.action.http');
    expect(flow.steps[2].action).toBe('qflow.action.function');

    // Step 5: Verify connections
    expect(flow.steps[0].onSuccess).toBe(flow.steps[1].id);
    expect(flow.steps[1].onSuccess).toBe(flow.steps[2].id);

    // Step 6: Verify test cases were generated
    expect(importResult.testCases).toBeDefined();
    expect(importResult.testCases!.length).toBeGreaterThan(0);
  });
});