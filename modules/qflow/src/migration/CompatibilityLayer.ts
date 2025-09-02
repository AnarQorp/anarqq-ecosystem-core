/**
 * Compatibility Layer for N8n Migration
 * 
 * Provides compatibility shims and adapters to ease migration from n8n to Qflow
 * Handles API compatibility, data format translation, and execution context mapping
 */

import { FlowDefinition, FlowStep } from '../models/FlowDefinition';
import { ExecutionEngine } from '../core/ExecutionEngine';
import { ValidationResult } from '../validation/UniversalValidationPipeline';

export interface CompatibilityConfig {
  enableN8nApiEmulation?: boolean;
  enableLegacyWebhooks?: boolean;
  enableCredentialMapping?: boolean;
  enableDataFormatTranslation?: boolean;
  strictMode?: boolean;
}

export interface N8nExecutionData {
  data: {
    main: any[][];
  };
  json: Record<string, any>;
  binary?: Record<string, any>;
  pairedItem?: {
    item: number;
    input?: number;
  };
}

export interface N8nNodeExecutionData {
  [key: string]: N8nExecutionData[];
}

export interface QflowExecutionContext {
  executionId: string;
  stepId: string;
  inputData: any;
  variables: Record<string, any>;
  metadata: Record<string, any>;
}

export interface CredentialMapping {
  n8nCredentialType: string;
  qflowCredentialType: string;
  parameterMapping: Record<string, string>;
  transformFunction?: (n8nCreds: any) => any;
}

export interface DataFormatTranslation {
  fromFormat: 'n8n' | 'qflow';
  toFormat: 'n8n' | 'qflow';
  translator: (data: any) => any;
}

/**
 * Compatibility layer for n8n migration
 */
export class CompatibilityLayer {
  private config: CompatibilityConfig;
  private credentialMappings: Map<string, CredentialMapping>;
  private dataTranslators: Map<string, DataFormatTranslation>;
  private legacyWebhookHandlers: Map<string, Function>;

  constructor(config: CompatibilityConfig = {}) {
    this.config = {
      enableN8nApiEmulation: true,
      enableLegacyWebhooks: true,
      enableCredentialMapping: true,
      enableDataFormatTranslation: true,
      strictMode: false,
      ...config
    };

    this.credentialMappings = new Map();
    this.dataTranslators = new Map();
    this.legacyWebhookHandlers = new Map();

    this.initializeDefaultMappings();
    this.initializeDataTranslators();
  }

  /**
   * Initialize default credential mappings
   */
  private initializeDefaultMappings(): void {
    // HTTP Basic Auth
    this.credentialMappings.set('httpBasicAuth', {
      n8nCredentialType: 'httpBasicAuth',
      qflowCredentialType: 'basic_auth',
      parameterMapping: {
        user: 'username',
        password: 'password'
      }
    });

    // HTTP Header Auth
    this.credentialMappings.set('httpHeaderAuth', {
      n8nCredentialType: 'httpHeaderAuth',
      qflowCredentialType: 'header_auth',
      parameterMapping: {
        name: 'header_name',
        value: 'header_value'
      }
    });

    // OAuth2
    this.credentialMappings.set('oAuth2Api', {
      n8nCredentialType: 'oAuth2Api',
      qflowCredentialType: 'oauth2',
      parameterMapping: {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessTokenUrl: 'token_url',
        authUrl: 'auth_url',
        scope: 'scope'
      }
    });

    // Gmail OAuth2
    this.credentialMappings.set('gmailOAuth2', {
      n8nCredentialType: 'gmailOAuth2',
      qflowCredentialType: 'qmail_oauth2',
      parameterMapping: {
        clientId: 'client_id',
        clientSecret: 'client_secret'
      },
      transformFunction: (n8nCreds) => ({
        ...n8nCreds,
        service: 'gmail',
        module: 'qmail'
      })
    });

    // Slack OAuth2
    this.credentialMappings.set('slackOAuth2Api', {
      n8nCredentialType: 'slackOAuth2Api',
      qflowCredentialType: 'qchat_slack_oauth2',
      parameterMapping: {
        clientId: 'client_id',
        clientSecret: 'client_secret',
        accessToken: 'access_token'
      },
      transformFunction: (n8nCreds) => ({
        ...n8nCreds,
        service: 'slack',
        module: 'qchat'
      })
    });
  }

  /**
   * Initialize data format translators
   */
  private initializeDataTranslators(): void {
    // N8n to Qflow data translation
    this.dataTranslators.set('n8n_to_qflow', {
      fromFormat: 'n8n',
      toFormat: 'qflow',
      translator: this.translateN8nToQflow.bind(this)
    });

    // Qflow to N8n data translation (for compatibility)
    this.dataTranslators.set('qflow_to_n8n', {
      fromFormat: 'qflow',
      toFormat: 'n8n',
      translator: this.translateQflowToN8n.bind(this)
    });
  }

  /**
   * Translate n8n execution data to Qflow format
   */
  private translateN8nToQflow(n8nData: N8nNodeExecutionData): any {
    const qflowData: any = {};

    for (const [nodeName, nodeData] of Object.entries(n8nData)) {
      if (nodeData && nodeData.length > 0) {
        const firstExecution = nodeData[0];
        
        if (firstExecution.data?.main && firstExecution.data.main.length > 0) {
          // Extract main data
          qflowData[nodeName] = firstExecution.data.main[0];
        } else if (firstExecution.json) {
          // Use JSON data if main is not available
          qflowData[nodeName] = [firstExecution.json];
        }

        // Handle binary data
        if (firstExecution.binary) {
          qflowData[`${nodeName}_binary`] = firstExecution.binary;
        }
      }
    }

    return qflowData;
  }

  /**
   * Translate Qflow data to n8n format (for backward compatibility)
   */
  private translateQflowToN8n(qflowData: any): N8nNodeExecutionData {
    const n8nData: N8nNodeExecutionData = {};

    for (const [key, value] of Object.entries(qflowData)) {
      if (key.endsWith('_binary')) {
        // Handle binary data separately
        const nodeName = key.replace('_binary', '');
        if (!n8nData[nodeName]) {
          n8nData[nodeName] = [{
            data: { main: [[]] },
            json: {},
            binary: value as any
          }];
        } else {
          n8nData[nodeName][0].binary = value as any;
        }
      } else {
        // Handle regular data
        const dataArray = Array.isArray(value) ? value : [value];
        n8nData[key] = [{
          data: { main: [dataArray] },
          json: dataArray[0] || {}
        }];
      }
    }

    return n8nData;
  }

  /**
   * Map n8n credentials to Qflow format
   */
  async mapCredentials(
    n8nCredentialType: string, 
    n8nCredentials: any
  ): Promise<any> {
    if (!this.config.enableCredentialMapping) {
      throw new Error('Credential mapping is disabled');
    }

    const mapping = this.credentialMappings.get(n8nCredentialType);
    if (!mapping) {
      if (this.config.strictMode) {
        throw new Error(`No credential mapping found for type: ${n8nCredentialType}`);
      }
      
      // Return as-is with warning
      console.warn(`No credential mapping for ${n8nCredentialType}, using as-is`);
      return {
        type: n8nCredentialType,
        ...n8nCredentials
      };
    }

    // Apply parameter mapping
    const mappedCredentials: any = {
      type: mapping.qflowCredentialType
    };

    for (const [n8nParam, qflowParam] of Object.entries(mapping.parameterMapping)) {
      if (n8nCredentials[n8nParam] !== undefined) {
        mappedCredentials[qflowParam] = n8nCredentials[n8nParam];
      }
    }

    // Apply transformation function if available
    if (mapping.transformFunction) {
      return mapping.transformFunction(mappedCredentials);
    }

    return mappedCredentials;
  }

  /**
   * Create compatibility wrapper for n8n-style function execution
   */
  createN8nFunctionWrapper(originalCode: string): string {
    return `
// N8n Compatibility Wrapper
function n8nCompatibilityWrapper(items, context) {
  // Emulate n8n execution context
  const $input = {
    all: () => items,
    first: () => items[0] || {},
    last: () => items[items.length - 1] || {},
    item: items[0] || {},
    params: context.params || {}
  };

  const $node = {
    name: context.stepId || 'unknown',
    type: 'qflow.action.function',
    parameters: context.params || {}
  };

  const $workflow = {
    id: context.executionId || 'unknown',
    name: context.flowName || 'migrated-workflow',
    active: true
  };

  const $execution = {
    id: context.executionId || 'unknown',
    mode: 'manual',
    resumeUrl: ''
  };

  // Helper functions
  const $json = $input.item;
  const $binary = context.binary || {};
  const $position = 0;
  const $runIndex = 0;
  const $mode = 'manual';
  const $now = new Date();
  const $today = new Date().toISOString().split('T')[0];

  // Original n8n code
  ${originalCode}

  // Return results in Qflow format
  if (typeof items !== 'undefined' && Array.isArray(items)) {
    return items;
  }
  
  return [{ result: 'completed' }];
}

// Execute the wrapper
return n8nCompatibilityWrapper(context.inputData || [{}], context);
`;
  }

  /**
   * Handle legacy webhook endpoints
   */
  async handleLegacyWebhook(
    webhookPath: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    query: Record<string, string>
  ): Promise<any> {
    if (!this.config.enableLegacyWebhooks) {
      throw new Error('Legacy webhook handling is disabled');
    }

    const handler = this.legacyWebhookHandlers.get(webhookPath);
    if (!handler) {
      // Default handler - translate to Qflow webhook format
      return {
        headers,
        body,
        query,
        method,
        timestamp: new Date().toISOString(),
        source: 'n8n-compatibility'
      };
    }

    return await handler({ headers, body, query, method });
  }

  /**
   * Register legacy webhook handler
   */
  registerLegacyWebhookHandler(path: string, handler: Function): void {
    this.legacyWebhookHandlers.set(path, handler);
  }

  /**
   * Validate migrated flow for compatibility issues
   */
  async validateMigratedFlow(flow: FlowDefinition): Promise<ValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for unsupported features
    for (const step of flow.steps) {
      // Check for n8n-specific parameters that might not work in Qflow
      if (step.params?.continueOnFail !== undefined) {
        warnings.push(`Step ${step.id}: continueOnFail parameter may behave differently in Qflow`);
      }

      if (step.params?.alwaysOutputData !== undefined) {
        warnings.push(`Step ${step.id}: alwaysOutputData parameter is not supported in Qflow`);
      }

      if (step.params?.executeOnce !== undefined) {
        warnings.push(`Step ${step.id}: executeOnce parameter may need manual implementation`);
      }

      // Check for credential references
      if (step.params?.credentials) {
        const credType = step.params.credentials.type;
        if (!this.credentialMappings.has(credType)) {
          warnings.push(`Step ${step.id}: Credential type '${credType}' may need manual mapping`);
        }
      }

      // Check for complex expressions
      if (this.hasComplexExpressions(step.params)) {
        warnings.push(`Step ${step.id}: Contains complex expressions that may need review`);
      }
    }

    // Check flow-level settings
    if (flow.metadata?.n8nSettings) {
      const settings = flow.metadata.n8nSettings as any;
      
      if (settings.executionOrder === 'v0') {
        warnings.push('Flow uses n8n execution order v0, which may behave differently in Qflow');
      }

      if (settings.errorWorkflow) {
        warnings.push('Flow references error workflow, which needs to be implemented as step error handlers');
      }

      if (settings.timezone) {
        warnings.push('Timezone settings may need to be configured at the system level in Qflow');
      }
    }

    return {
      valid: errors.length === 0,
      layer: 'compatibility',
      errors: errors.map(msg => ({ message: msg, code: 'COMPATIBILITY_ERROR' })),
      warnings: warnings.map(msg => ({ message: msg, code: 'COMPATIBILITY_WARNING' })),
      metadata: {
        compatibilityVersion: '1.0.0',
        migratedFrom: 'n8n',
        validatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if step parameters contain complex expressions
   */
  private hasComplexExpressions(params: any): boolean {
    const paramStr = JSON.stringify(params);
    
    // Check for n8n expression patterns
    const expressionPatterns = [
      /\{\{.*\}\}/,  // {{ expression }}
      /\$\(.*\)/,    // $(expression)
      /\$node\[/,    // $node[
      /\$workflow\[/, // $workflow[
      /\$execution\[/ // $execution[
    ];

    return expressionPatterns.some(pattern => pattern.test(paramStr));
  }

  /**
   * Create execution context adapter
   */
  createExecutionContextAdapter(
    qflowContext: QflowExecutionContext
  ): any {
    return {
      // N8n-style context
      getInputData: () => qflowContext.inputData,
      getNodeParameter: (name: string, fallback?: any) => 
        qflowContext.variables[name] ?? fallback,
      getWorkflowStaticData: (type: string) => 
        qflowContext.metadata[`staticData_${type}`] || {},
      
      // Qflow context passthrough
      qflow: qflowContext,
      
      // Helper methods
      helpers: {
        returnJsonArray: (data: any[]) => data,
        constructExecutionMetaData: (data: any, meta: any) => ({ ...data, ...meta })
      }
    };
  }

  /**
   * Generate migration report
   */
  generateMigrationReport(
    originalWorkflow: any,
    migratedFlow: FlowDefinition,
    validationResult: ValidationResult
  ): string {
    const report = {
      migration: {
        timestamp: new Date().toISOString(),
        originalWorkflowId: originalWorkflow.id,
        originalWorkflowName: originalWorkflow.name,
        migratedFlowId: migratedFlow.id,
        migratedFlowName: migratedFlow.name
      },
      statistics: {
        originalNodeCount: originalWorkflow.nodes?.length || 0,
        migratedStepCount: migratedFlow.steps.length,
        conversionRate: migratedFlow.steps.length / (originalWorkflow.nodes?.length || 1)
      },
      compatibility: {
        warningCount: validationResult.warnings?.length || 0,
        errorCount: validationResult.errors?.length || 0,
        compatibilityScore: this.calculateCompatibilityScore(validationResult)
      },
      recommendations: this.generateRecommendations(validationResult),
      nextSteps: [
        'Review all warnings and errors in the validation report',
        'Test the migrated workflow with sample data',
        'Update credentials and authentication settings',
        'Configure error handling and retry policies',
        'Set up monitoring and alerting for the new workflow'
      ]
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Calculate compatibility score (0-100)
   */
  private calculateCompatibilityScore(validationResult: ValidationResult): number {
    const warningCount = validationResult.warnings?.length || 0;
    const errorCount = validationResult.errors?.length || 0;
    
    // Start with 100, deduct points for issues
    let score = 100;
    score -= errorCount * 20; // Major deduction for errors
    score -= warningCount * 5; // Minor deduction for warnings
    
    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(validationResult: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (validationResult.errors && validationResult.errors.length > 0) {
      recommendations.push('Address all validation errors before deploying the migrated workflow');
    }

    if (validationResult.warnings && validationResult.warnings.length > 0) {
      recommendations.push('Review and test all functionality mentioned in warnings');
    }

    recommendations.push(
      'Set up comprehensive monitoring for the migrated workflow',
      'Create test cases to validate workflow behavior',
      'Document any manual changes made during migration',
      'Plan for gradual rollout and rollback procedures'
    );

    return recommendations;
  }

  /**
   * Get compatibility configuration
   */
  getConfig(): CompatibilityConfig {
    return { ...this.config };
  }

  /**
   * Update compatibility configuration
   */
  updateConfig(newConfig: Partial<CompatibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}