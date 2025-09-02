#!/usr/bin/env ts-node

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

/**
 * API Documentation Generator for Qflow
 * 
 * Generates comprehensive API documentation including:
 * - OpenAPI specifications
 * - Interactive API documentation
 * - SDK documentation
 * - Code examples
 */
class APIDocumentationGenerator {
  private readonly docsDir: string;
  private readonly apiDir: string;
  private readonly sdkDir: string;

  constructor() {
    this.docsDir = join(__dirname, '../docs');
    this.apiDir = join(this.docsDir, 'api');
    this.sdkDir = join(this.docsDir, 'sdk');
    
    this.ensureDirectories();
  }

  /**
   * Generate all API documentation
   */
  async generateAll(): Promise<void> {
    console.log('🚀 Generating Qflow API Documentation...\n');

    try {
      // Generate OpenAPI specification
      await this.generateOpenAPISpec();
      
      // Generate interactive documentation
      await this.generateInteractiveDocs();
      
      // Generate SDK documentation
      await this.generateSDKDocs();
      
      // Generate code examples
      await this.generateCodeExamples();
      
      // Generate API reference
      await this.generateAPIReference();

      console.log('✅ API documentation generated successfully!');
      console.log(`📁 Documentation available at: ${this.docsDir}`);
      
    } catch (error) {
      console.error('❌ Failed to generate API documentation:', error);
      process.exit(1);
    }
  }

  /**
   * Generate complete OpenAPI specification
   */
  private async generateOpenAPISpec(): Promise<void> {
    console.log('📝 Generating OpenAPI specification...');

    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'Qflow Serverless Automation Engine API',
        description: this.getAPIDescription(),
        version: '1.0.0',
        contact: {
          name: 'Qflow API Support',
          url: 'https://github.com/anarq/qflow',
          email: 'support@anarq.org'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'https://api.qflow.anarq.org/v1',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.qflow.anarq.org/v1',
          description: 'Staging server'
        },
        {
          url: 'http://localhost:8080/v1',
          description: 'Local development server'
        }
      ],
      security: [
        { squidAuth: [] }
      ],
      paths: this.generatePaths(),
      components: this.generateComponents()
    };

    const yamlContent = yaml.stringify(openApiSpec);
    writeFileSync(join(this.apiDir, 'openapi.yaml'), yamlContent);
    writeFileSync(join(this.apiDir, 'openapi.json'), JSON.stringify(openApiSpec, null, 2));

    console.log('✅ OpenAPI specification generated');
  }

  /**
   * Generate interactive API documentation
   */
  private async generateInteractiveDocs(): Promise<void> {
    console.log('🌐 Generating interactive API documentation...');

    const htmlContent = this.generateSwaggerUI();
    writeFileSync(join(this.apiDir, 'index.html'), htmlContent);

    const redocContent = this.generateRedocUI();
    writeFileSync(join(this.apiDir, 'redoc.html'), redocContent);

    console.log('✅ Interactive documentation generated');
  }

  /**
   * Generate SDK documentation
   */
  private async generateSDKDocs(): Promise<void> {
    console.log('📚 Generating SDK documentation...');

    // TypeScript SDK documentation
    const tsSDKDocs = this.generateTypeScriptSDKDocs();
    writeFileSync(join(this.sdkDir, 'typescript.md'), tsSDKDocs);

    // Python SDK documentation
    const pythonSDKDocs = this.generatePythonSDKDocs();
    writeFileSync(join(this.sdkDir, 'python.md'), pythonSDKDocs);

    // JavaScript SDK documentation
    const jsSDKDocs = this.generateJavaScriptSDKDocs();
    writeFileSync(join(this.sdkDir, 'javascript.md'), jsSDKDocs);

    // Go SDK documentation
    const goSDKDocs = this.generateGoSDKDocs();
    writeFileSync(join(this.sdkDir, 'go.md'), goSDKDocs);

    console.log('✅ SDK documentation generated');
  }

  /**
   * Generate code examples
   */
  private async generateCodeExamples(): Promise<void> {
    console.log('💻 Generating code examples...');

    const examplesDir = join(this.docsDir, 'examples');
    if (!existsSync(examplesDir)) {
      mkdirSync(examplesDir, { recursive: true });
    }

    // Flow management examples
    const flowExamples = this.generateFlowExamples();
    writeFileSync(join(examplesDir, 'flow-management.md'), flowExamples);

    // Execution examples
    const executionExamples = this.generateExecutionExamples();
    writeFileSync(join(examplesDir, 'execution-control.md'), executionExamples);

    // Monitoring examples
    const monitoringExamples = this.generateMonitoringExamples();
    writeFileSync(join(examplesDir, 'monitoring.md'), monitoringExamples);

    // Integration examples
    const integrationExamples = this.generateIntegrationExamples();
    writeFileSync(join(examplesDir, 'ecosystem-integration.md'), integrationExamples);

    console.log('✅ Code examples generated');
  }

  /**
   * Generate API reference documentation
   */
  private async generateAPIReference(): Promise<void> {
    console.log('📖 Generating API reference...');

    const referenceContent = this.generateAPIReferenceContent();
    writeFileSync(join(this.docsDir, 'api-reference.md'), referenceContent);

    console.log('✅ API reference generated');
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.docsDir, this.apiDir, this.sdkDir];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get API description
   */
  private getAPIDescription(): string {
    return `
Qflow is the serverless, distributed automation engine that serves as the universal coherence motor 
for the entire AnarQ & Q ecosystem. This API provides comprehensive access to flow management, 
execution control, monitoring, and ecosystem integration capabilities.

## Key Features
- Serverless distributed execution on QNET nodes
- Universal validation pipeline (Qlock → Qonsent → Qindex → Qerberos)
- Multi-tenant DAO governance and subnet isolation
- Byzantine fault tolerance and chaos engineering
- Real-time monitoring and adaptive performance

## Authentication
All API endpoints require valid sQuid identity authentication tokens.

## Rate Limiting
API requests are rate-limited per identity and DAO subnet.
    `.trim();
  }  /
**
   * Generate API paths
   */
  private generatePaths(): any {
    return {
      // Flow Management
      '/flows': {
        get: {
          summary: 'List flows',
          description: 'Retrieve a list of flows accessible to the authenticated user',
          operationId: 'listFlows',
          tags: ['Flow Management'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'Maximum number of flows to return',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
            },
            {
              name: 'offset',
              in: 'query',
              description: 'Number of flows to skip',
              schema: { type: 'integer', minimum: 0, default: 0 }
            },
            {
              name: 'daoSubnet',
              in: 'query',
              description: 'Filter flows by DAO subnet',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'List of flows',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      flows: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/FlowSummary' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create flow',
          description: 'Create a new flow definition',
          operationId: 'createFlow',
          tags: ['Flow Management'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlowDefinition' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Flow created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Flow' }
                }
              }
            }
          }
        }
      },
      '/flows/{flowId}': {
        get: {
          summary: 'Get flow',
          description: 'Retrieve a specific flow by ID',
          operationId: 'getFlow',
          tags: ['Flow Management'],
          parameters: [
            {
              name: 'flowId',
              in: 'path',
              required: true,
              description: 'Flow identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Flow details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Flow' }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update flow',
          description: 'Update an existing flow definition',
          operationId: 'updateFlow',
          tags: ['Flow Management'],
          parameters: [
            {
              name: 'flowId',
              in: 'path',
              required: true,
              description: 'Flow identifier',
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FlowDefinition' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Flow updated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Flow' }
                }
              }
            }
          }
        },
        delete: {
          summary: 'Delete flow',
          description: 'Delete a flow definition',
          operationId: 'deleteFlow',
          tags: ['Flow Management'],
          parameters: [
            {
              name: 'flowId',
              in: 'path',
              required: true,
              description: 'Flow identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '204': {
              description: 'Flow deleted successfully'
            }
          }
        }
      },
      // Execution Management
      '/flows/{flowId}/executions': {
        post: {
          summary: 'Start flow execution',
          description: 'Start a new execution of the specified flow',
          operationId: 'startExecution',
          tags: ['Execution Management'],
          parameters: [
            {
              name: 'flowId',
              in: 'path',
              required: true,
              description: 'Flow identifier',
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExecutionRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Execution started successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Execution' }
                }
              }
            }
          }
        }
      },
      '/executions/{executionId}': {
        get: {
          summary: 'Get execution status',
          description: 'Retrieve the status and details of a specific execution',
          operationId: 'getExecution',
          tags: ['Execution Management'],
          parameters: [
            {
              name: 'executionId',
              in: 'path',
              required: true,
              description: 'Execution identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Execution details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Execution' }
                }
              }
            }
          }
        }
      },
      '/executions/{executionId}/pause': {
        post: {
          summary: 'Pause execution',
          description: 'Pause a running execution',
          operationId: 'pauseExecution',
          tags: ['Execution Management'],
          parameters: [
            {
              name: 'executionId',
              in: 'path',
              required: true,
              description: 'Execution identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Execution paused successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Execution' }
                }
              }
            }
          }
        }
      },
      '/executions/{executionId}/resume': {
        post: {
          summary: 'Resume execution',
          description: 'Resume a paused execution',
          operationId: 'resumeExecution',
          tags: ['Execution Management'],
          parameters: [
            {
              name: 'executionId',
              in: 'path',
              required: true,
              description: 'Execution identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Execution resumed successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Execution' }
                }
              }
            }
          }
        }
      },
      '/executions/{executionId}/abort': {
        post: {
          summary: 'Abort execution',
          description: 'Abort a running or paused execution',
          operationId: 'abortExecution',
          tags: ['Execution Management'],
          parameters: [
            {
              name: 'executionId',
              in: 'path',
              required: true,
              description: 'Execution identifier',
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Execution aborted successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Execution' }
                }
              }
            }
          }
        }
      },
      // Monitoring
      '/executions/{executionId}/logs': {
        get: {
          summary: 'Get execution logs',
          description: 'Retrieve logs for a specific execution',
          operationId: 'getExecutionLogs',
          tags: ['Monitoring'],
          parameters: [
            {
              name: 'executionId',
              in: 'path',
              required: true,
              description: 'Execution identifier',
              schema: { type: 'string' }
            },
            {
              name: 'level',
              in: 'query',
              description: 'Log level filter',
              schema: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] }
            }
          ],
          responses: {
            '200': {
              description: 'Execution logs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      logs: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LogEntry' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/system/health': {
        get: {
          summary: 'System health check',
          description: 'Get system health status',
          operationId: 'getSystemHealth',
          tags: ['System'],
          responses: {
            '200': {
              description: 'System health status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' }
                }
              }
            }
          }
        }
      },
      '/system/metrics': {
        get: {
          summary: 'System metrics',
          description: 'Get system-wide metrics',
          operationId: 'getSystemMetrics',
          tags: ['System'],
          responses: {
            '200': {
              description: 'System metrics',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SystemMetrics' }
                }
              }
            }
          }
        }
      }
    };
  }