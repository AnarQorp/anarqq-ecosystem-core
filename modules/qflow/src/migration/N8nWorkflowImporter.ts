/**
 * N8n Workflow Importer
 * 
 * Converts n8n workflow JSON files to Qflow flow definitions
 * Handles node mapping, connection translation, and credential migration
 */

import { FlowDefinition, FlowStep, FlowMetadata } from '../models/FlowDefinition';
import { ValidationResult } from '../validation/UniversalValidationPipeline';
import { TemplateValidator, TemplateValidationResult } from './TemplateValidator';

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active: boolean;
  settings?: N8nSettings;
  staticData?: any;
  pinData?: any;
  versionId?: string;
  meta?: {
    templateCredsSetupCompleted?: boolean;
    instanceId?: string;
  };
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  webhookId?: string;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  color?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
}

export interface N8nConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface N8nSettings {
  executionOrder?: 'v0' | 'v1';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
}

export interface MigrationOptions {
  preserveNodeIds?: boolean;
  validateCredentials?: boolean;
  createCompatibilityLayer?: boolean;
  generateTestCases?: boolean;
  daoSubnet?: string;
  owner?: string; // sQuid identity
}

export interface MigrationResult {
  success: boolean;
  flowDefinition?: FlowDefinition;
  warnings: MigrationWarning[];
  errors: MigrationError[];
  compatibilityNotes: string[];
  testCases?: MigrationTestCase[];
}

export interface MigrationWarning {
  nodeId?: string;
  nodeName?: string;
  type: 'unsupported_feature' | 'credential_migration' | 'parameter_conversion' | 'connection_change';
  message: string;
  suggestion?: string;
}

export interface MigrationError {
  nodeId?: string;
  nodeName?: string;
  type: 'unsupported_node' | 'invalid_connection' | 'missing_credential' | 'conversion_failed';
  message: string;
  critical: boolean;
}

export interface MigrationTestCase {
  name: string;
  description: string;
  inputData: any;
  expectedOutput: any;
  stepId: string;
}

/**
 * Node type mappings from n8n to Qflow
 */
const NODE_TYPE_MAPPINGS: Record<string, string> = {
  // Core nodes
  'n8n-nodes-base.start': 'qflow.trigger.manual',
  'n8n-nodes-base.webhook': 'qflow.trigger.webhook',
  'n8n-nodes-base.cron': 'qflow.trigger.schedule',
  'n8n-nodes-base.httpRequest': 'qflow.action.http',
  'n8n-nodes-base.set': 'qflow.action.transform',
  'n8n-nodes-base.if': 'qflow.condition.if',
  'n8n-nodes-base.switch': 'qflow.condition.switch',
  'n8n-nodes-base.merge': 'qflow.action.merge',
  'n8n-nodes-base.split': 'qflow.action.split',
  'n8n-nodes-base.function': 'qflow.action.function',
  'n8n-nodes-base.functionItem': 'qflow.action.function',
  'n8n-nodes-base.code': 'qflow.action.wasm',
  'n8n-nodes-base.wait': 'qflow.action.delay',
  'n8n-nodes-base.stopAndError': 'qflow.action.error',
  
  // Ecosystem integrations
  'n8n-nodes-base.gmail': 'qflow.module.qmail',
  'n8n-nodes-base.googleDrive': 'qflow.module.qdrive',
  'n8n-nodes-base.slack': 'qflow.module.qchat',
  'n8n-nodes-base.discord': 'qflow.module.qchat',
  'n8n-nodes-base.telegram': 'qflow.module.qchat',
  
  // Database and storage
  'n8n-nodes-base.postgres': 'qflow.action.database',
  'n8n-nodes-base.mysql': 'qflow.action.database',
  'n8n-nodes-base.mongodb': 'qflow.action.database',
  'n8n-nodes-base.redis': 'qflow.action.cache',
  
  // File operations
  'n8n-nodes-base.readBinaryFile': 'qflow.action.file.read',
  'n8n-nodes-base.writeBinaryFile': 'qflow.action.file.write',
  'n8n-nodes-base.ftp': 'qflow.action.file.transfer',
  'n8n-nodes-base.sftp': 'qflow.action.file.transfer',
  
  // Crypto and blockchain
  'n8n-nodes-base.crypto': 'qflow.module.qlock',
  'n8n-nodes-base.ethereum': 'qflow.module.qwallet',
  
  // Notifications
  'n8n-nodes-base.emailSend': 'qflow.module.qmail',
  'n8n-nodes-base.pushover': 'qflow.action.notification',
  'n8n-nodes-base.pushbullet': 'qflow.action.notification',
};

export class N8nWorkflowImporter {
  private options: MigrationOptions;
  private templateValidator: TemplateValidator;
  
  constructor(options: MigrationOptions = {}) {
    this.options = {
      preserveNodeIds: false,
      validateCredentials: true,
      createCompatibilityLayer: true,
      generateTestCases: false,
      ...options
    };
    this.templateValidator = new TemplateValidator();
  }

  /**
   * Import n8n workflow from JSON string
   */
  async importFromJson(workflowJson: string): Promise<MigrationResult> {
    try {
      const n8nWorkflow: N8nWorkflow = JSON.parse(workflowJson);
      return await this.convertWorkflow(n8nWorkflow);
    } catch (error) {
      return {
        success: false,
        warnings: [],
        errors: [{
          type: 'conversion_failed',
          message: `Failed to parse n8n workflow JSON: ${error.message}`,
          critical: true
        }],
        compatibilityNotes: []
      };
    }
  }

  /**
   * Import n8n workflow from file
   */
  async importFromFile(filePath: string): Promise<MigrationResult> {
    try {
      const fs = await import('fs/promises');
      const workflowJson = await fs.readFile(filePath, 'utf-8');
      return await this.importFromJson(workflowJson);
    } catch (error) {
      return {
        success: false,
        warnings: [],
        errors: [{
          type: 'conversion_failed',
          message: `Failed to read workflow file: ${error.message}`,
          critical: true
        }],
        compatibilityNotes: []
      };
    }
  }

  /**
   * Convert n8n workflow to Qflow definition
   */
  private async convertWorkflow(n8nWorkflow: N8nWorkflow): Promise<MigrationResult> {
    const warnings: MigrationWarning[] = [];
    const errors: MigrationError[] = [];
    const compatibilityNotes: string[] = [];
    const testCases: MigrationTestCase[] = [];

    try {
      // Create flow metadata
      const metadata: FlowMetadata = {
        tags: ['migrated-from-n8n'],
        category: 'automation',
        visibility: 'private',
        daoSubnet: this.options.daoSubnet,
        requiredPermissions: [],
        estimatedDuration: this.estimateExecutionTime(n8nWorkflow),
        resourceRequirements: this.calculateResourceRequirements(n8nWorkflow)
      };

      // Convert nodes to steps
      const { steps, nodeWarnings, nodeErrors } = await this.convertNodes(n8nWorkflow.nodes);
      warnings.push(...nodeWarnings);
      errors.push(...nodeErrors);

      // Process connections
      const { connectionWarnings, connectionErrors } = this.processConnections(
        n8nWorkflow.connections, 
        steps
      );
      warnings.push(...connectionWarnings);
      errors.push(...connectionErrors);

      // Generate test cases if requested
      if (this.options.generateTestCases) {
        testCases.push(...this.generateTestCases(n8nWorkflow, steps));
      }

      // Create flow definition
      const flowDefinition: FlowDefinition = {
        id: n8nWorkflow.id || `migrated-${Date.now()}`,
        name: n8nWorkflow.name || 'Migrated n8n Workflow',
        version: '1.0.0',
        owner: this.options.owner || 'system',
        description: `Migrated from n8n workflow. Original active: ${n8nWorkflow.active}`,
        steps,
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add compatibility notes
      compatibilityNotes.push(
        'This workflow was migrated from n8n. Please review all steps and test thoroughly.',
        'Credentials and sensitive data need to be reconfigured in Qflow.',
        'Some node behaviors may differ between n8n and Qflow execution environments.'
      );

      if (n8nWorkflow.settings?.errorWorkflow) {
        compatibilityNotes.push(
          `Original workflow had error workflow: ${n8nWorkflow.settings.errorWorkflow}. ` +
          'Configure error handling in Qflow step retry policies.'
        );
      }

      return {
        success: errors.filter(e => e.critical).length === 0,
        flowDefinition,
        warnings,
        errors,
        compatibilityNotes,
        testCases: testCases.length > 0 ? testCases : undefined
      };

    } catch (error) {
      errors.push({
        type: 'conversion_failed',
        message: `Workflow conversion failed: ${error.message}`,
        critical: true
      });

      return {
        success: false,
        warnings,
        errors,
        compatibilityNotes
      };
    }
  }

  /**
   * Convert n8n nodes to Qflow steps
   */
  private async convertNodes(nodes: N8nNode[]): Promise<{
    steps: FlowStep[];
    nodeWarnings: MigrationWarning[];
    nodeErrors: MigrationError[];
  }> {
    const steps: FlowStep[] = [];
    const nodeWarnings: MigrationWarning[] = [];
    const nodeErrors: MigrationError[] = [];

    for (const node of nodes) {
      try {
        const step = await this.convertNode(node);
        if (step) {
          steps.push(step);
        }
      } catch (error) {
        if (this.isUnsupportedNode(node.type)) {
          nodeWarnings.push({
            nodeId: node.id,
            nodeName: node.name,
            type: 'unsupported_feature',
            message: `Node type '${node.type}' is not directly supported`,
            suggestion: 'Consider using a custom WASM function or HTTP request'
          });
        } else {
          nodeErrors.push({
            nodeId: node.id,
            nodeName: node.name,
            type: 'conversion_failed',
            message: `Failed to convert node: ${error.message}`,
            critical: false
          });
        }
      }
    }

    return { steps, nodeWarnings, nodeErrors };
  }

  /**
   * Convert individual n8n node to Qflow step
   */
  private async convertNode(node: N8nNode): Promise<FlowStep | null> {
    // Use template validator for enhanced conversion
    const validationResult = await this.templateValidator.validateNodeConversion(
      node.type,
      node.parameters,
      node.credentials
    );

    // Get template or fall back to legacy mapping
    const template = this.templateValidator.getTemplate(node.type);
    const qflowAction = template?.qflowAction || NODE_TYPE_MAPPINGS[node.type];
    
    if (!qflowAction) {
      throw new Error(`Unsupported node type: ${node.type}`);
    }

    const step: FlowStep = {
      id: this.options.preserveNodeIds ? node.id : `step-${node.name.toLowerCase().replace(/\s+/g, '-')}`,
      type: this.getStepType(qflowAction),
      action: qflowAction,
      params: validationResult.transformedParams,
      timeout: this.calculateTimeout(node),
      retryPolicy: this.createRetryPolicy(node)
    };

    // Add resource limits if needed
    if (this.requiresResourceLimits(node.type)) {
      step.resourceLimits = this.calculateNodeResourceLimits(node);
    }

    // Store validation results for reporting
    if (validationResult.warnings.length > 0 || validationResult.errors.length > 0) {
      step.migrationNotes = {
        warnings: validationResult.warnings,
        errors: validationResult.errors,
        securityIssues: validationResult.securityIssues,
        suggestions: validationResult.suggestions
      };
    }

    return step;
  }

  /**
   * Convert node parameters to Qflow format
   */
  private async convertNodeParameters(node: N8nNode): Promise<Record<string, any>> {
    const params: Record<string, any> = { ...node.parameters };

    // Handle special parameter conversions
    switch (node.type) {
      case 'n8n-nodes-base.httpRequest':
        return this.convertHttpRequestParams(params);
      
      case 'n8n-nodes-base.function':
      case 'n8n-nodes-base.functionItem':
        return this.convertFunctionParams(params);
      
      case 'n8n-nodes-base.code':
        return this.convertCodeParams(params);
      
      case 'n8n-nodes-base.webhook':
        return this.convertWebhookParams(params);
      
      case 'n8n-nodes-base.if':
        return this.convertIfParams(params);
      
      default:
        return params;
    }
  }

  /**
   * Convert HTTP request parameters
   */
  private convertHttpRequestParams(params: any): Record<string, any> {
    return {
      method: params.requestMethod || 'GET',
      url: params.url,
      headers: params.headers?.parameters || {},
      body: params.body,
      authentication: params.authentication,
      timeout: params.timeout || 30000,
      followRedirects: params.followRedirect !== false,
      validateSSL: params.ignoreSSLIssues !== true
    };
  }

  /**
   * Convert function parameters to WASM-compatible format
   */
  private convertFunctionParams(params: any): Record<string, any> {
    return {
      code: params.functionCode || params.jsCode,
      language: 'javascript',
      sandboxed: true,
      allowedModules: [], // Restrict to safe modules
      memoryLimit: '128MB',
      timeoutMs: 30000
    };
  }

  /**
   * Convert code node parameters
   */
  private convertCodeParams(params: any): Record<string, any> {
    return {
      code: params.jsCode,
      language: params.mode || 'javascript',
      sandboxed: true,
      allowedModules: [],
      memoryLimit: '256MB',
      timeoutMs: 60000
    };
  }

  /**
   * Convert webhook parameters
   */
  private convertWebhookParams(params: any): Record<string, any> {
    return {
      path: params.path,
      method: params.httpMethod || 'POST',
      authentication: params.authentication,
      responseMode: params.responseMode || 'onReceived',
      responseData: params.responseData,
      headers: params.responseHeaders
    };
  }

  /**
   * Convert IF node parameters
   */
  private convertIfParams(params: any): Record<string, any> {
    const conditions = params.conditions?.values || [];
    
    return {
      conditions: conditions.map((condition: any) => ({
        leftValue: condition.leftValue,
        operation: condition.operation,
        rightValue: condition.rightValue,
        combineOperation: condition.combineOperation || 'AND'
      })),
      combineConditions: params.combineOperation || 'AND'
    };
  }

  /**
   * Process n8n connections and update step flow
   */
  private processConnections(
    connections: N8nConnections, 
    steps: FlowStep[]
  ): {
    connectionWarnings: MigrationWarning[];
    connectionErrors: MigrationError[];
  } {
    const connectionWarnings: MigrationWarning[] = [];
    const connectionErrors: MigrationError[] = [];

    // Create step lookup map
    const stepMap = new Map<string, FlowStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    // Process connections
    for (const [sourceNodeName, outputs] of Object.entries(connections)) {
      for (const [outputType, targets] of Object.entries(outputs)) {
        for (const target of targets) {
          try {
            this.createStepConnection(
              sourceNodeName,
              target.node,
              outputType,
              stepMap
            );
          } catch (error) {
            connectionErrors.push({
              type: 'invalid_connection',
              message: `Failed to create connection from ${sourceNodeName} to ${target.node}: ${error.message}`,
              critical: false
            });
          }
        }
      }
    }

    return { connectionWarnings, connectionErrors };
  }

  /**
   * Create connection between steps
   */
  private createStepConnection(
    sourceNodeName: string,
    targetNodeName: string,
    outputType: string,
    stepMap: Map<string, FlowStep>
  ): void {
    const sourceStep = Array.from(stepMap.values()).find(s => 
      s.id.includes(sourceNodeName.toLowerCase().replace(/\s+/g, '-'))
    );
    const targetStep = Array.from(stepMap.values()).find(s => 
      s.id.includes(targetNodeName.toLowerCase().replace(/\s+/g, '-'))
    );

    if (!sourceStep || !targetStep) {
      throw new Error(`Could not find steps for connection: ${sourceNodeName} -> ${targetNodeName}`);
    }

    // Set connection based on output type
    if (outputType === 'main') {
      sourceStep.onSuccess = targetStep.id;
    } else if (outputType === 'error') {
      sourceStep.onFailure = targetStep.id;
    }
  }

  /**
   * Generate test cases for migrated workflow
   */
  private generateTestCases(n8nWorkflow: N8nWorkflow, steps: FlowStep[]): MigrationTestCase[] {
    const testCases: MigrationTestCase[] = [];

    // Generate basic test case
    testCases.push({
      name: 'Basic Workflow Execution',
      description: 'Test that the migrated workflow executes without errors',
      inputData: this.generateSampleInput(n8nWorkflow),
      expectedOutput: { status: 'completed' },
      stepId: steps[0]?.id || 'start'
    });

    // Generate test cases for conditional nodes
    const conditionalSteps = steps.filter(s => s.type === 'condition');
    for (const step of conditionalSteps) {
      testCases.push({
        name: `Condition Test - ${step.id}`,
        description: `Test condition logic for step ${step.id}`,
        inputData: this.generateConditionalTestData(step),
        expectedOutput: { condition: true },
        stepId: step.id
      });
    }

    return testCases;
  }

  /**
   * Helper methods
   */
  private getStepType(qflowType: string): 'task' | 'condition' | 'parallel' | 'event-trigger' | 'module-call' {
    if (qflowType.includes('condition')) return 'condition';
    if (qflowType.includes('trigger')) return 'event-trigger';
    if (qflowType.includes('module')) return 'module-call';
    if (qflowType.includes('parallel')) return 'parallel';
    return 'task';
  }

  private isUnsupportedNode(nodeType: string): boolean {
    return !NODE_TYPE_MAPPINGS.hasOwnProperty(nodeType);
  }

  private calculateTimeout(node: N8nNode): number {
    if (node.parameters?.timeout) {
      return node.parameters.timeout * 1000; // Convert to milliseconds
    }
    
    // Default timeouts based on node type
    const timeouts: Record<string, number> = {
      'n8n-nodes-base.httpRequest': 30000,
      'n8n-nodes-base.function': 10000,
      'n8n-nodes-base.code': 30000,
      'n8n-nodes-base.wait': 300000,
    };

    return timeouts[node.type] || 60000; // Default 60 seconds
  }

  private createRetryPolicy(node: N8nNode): any {
    if (!node.retryOnFail) {
      return { maxAttempts: 1 };
    }

    return {
      maxAttempts: node.maxTries || 3,
      backoffMs: (node.waitBetweenTries || 1000) * 1000,
      backoffStrategy: 'exponential'
    };
  }

  private requiresResourceLimits(nodeType: string): boolean {
    const resourceIntensiveNodes = [
      'n8n-nodes-base.function',
      'n8n-nodes-base.functionItem',
      'n8n-nodes-base.code'
    ];
    return resourceIntensiveNodes.includes(nodeType);
  }

  private calculateNodeResourceLimits(node: N8nNode): any {
    return {
      maxMemoryMB: 128,
      maxCpuPercent: 50,
      maxExecutionTimeMs: this.calculateTimeout(node)
    };
  }

  private estimateExecutionTime(workflow: N8nWorkflow): number {
    // Rough estimation based on node count and types
    let totalTime = 0;
    
    for (const node of workflow.nodes) {
      const baseTime = this.getNodeBaseExecutionTime(node.type);
      totalTime += baseTime;
    }

    return Math.max(totalTime, 30); // Minimum 30 seconds
  }

  private getNodeBaseExecutionTime(nodeType: string): number {
    const executionTimes: Record<string, number> = {
      'n8n-nodes-base.httpRequest': 5,
      'n8n-nodes-base.function': 2,
      'n8n-nodes-base.code': 10,
      'n8n-nodes-base.wait': 60,
      'n8n-nodes-base.webhook': 1,
    };

    return executionTimes[nodeType] || 3; // Default 3 seconds
  }

  private calculateResourceRequirements(workflow: N8nWorkflow): any {
    const nodeCount = workflow.nodes.length;
    const hasCodeNodes = workflow.nodes.some(n => 
      ['n8n-nodes-base.function', 'n8n-nodes-base.code'].includes(n.type)
    );

    return {
      minMemoryMB: Math.max(64, nodeCount * 16),
      minCpuCores: hasCodeNodes ? 1 : 0.5,
      estimatedNetworkMB: nodeCount * 10
    };
  }

  private generateSampleInput(workflow: N8nWorkflow): any {
    // Generate basic sample input based on workflow structure
    const startNodes = workflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.start' || n.type === 'n8n-nodes-base.webhook'
    );

    if (startNodes.length > 0) {
      const startNode = startNodes[0];
      if (startNode.type === 'n8n-nodes-base.webhook') {
        return {
          headers: { 'content-type': 'application/json' },
          body: { message: 'test webhook payload' },
          query: {}
        };
      }
    }

    return { message: 'test input data' };
  }

  private generateConditionalTestData(step: FlowStep): any {
    return {
      testValue: 'sample',
      numericValue: 42,
      booleanValue: true
    };
  }
}