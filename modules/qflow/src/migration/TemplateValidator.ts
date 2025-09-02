/**
 * Template Validator
 * 
 * Validates n8n to Qflow migrations using compatibility templates
 * Provides security checks, parameter validation, and migration guidance
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface CompatibilityTemplate {
  qflowAction: string;
  parameterMapping: Record<string, string>;
  defaultParams: Record<string, any>;
  validation: {
    required: string[];
    optional?: string[];
    credentialRequired?: boolean;
    securityChecks?: string[];
    ranges?: Record<string, { min?: number; max?: number }>;
    conditionStructure?: Record<string, string>;
  };
}

export interface MigrationRule {
  credentialMapping: Record<string, string>;
  dataTransformation: {
    n8nExpressions: {
      pattern: string;
      replacement: string;
      functions: Record<string, string>;
    };
  };
  errorHandling: Record<string, string>;
}

export interface ValidationRule {
  securityChecks: Record<string, {
    pattern?: string;
    patterns?: string[];
    message: string;
  }>;
  resourceLimits: {
    maxCodeLength: number;
    maxMemoryMB: number;
    maxTimeoutMs: number;
  };
}

export interface TemplateValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  suggestions: string[];
  transformedParams: Record<string, any>;
  securityIssues: SecurityIssue[];
}

export interface ValidationWarning {
  type: 'parameter' | 'credential' | 'compatibility' | 'performance';
  message: string;
  suggestion?: string;
}

export interface ValidationError {
  type: 'missing_required' | 'invalid_value' | 'security_violation' | 'unsupported_feature';
  message: string;
  field?: string;
  critical: boolean;
}

export interface SecurityIssue {
  type: 'code_injection' | 'resource_abuse' | 'credential_exposure' | 'network_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: string;
  mitigation: string;
}

export class TemplateValidator {
  private templates: Record<string, CompatibilityTemplate> = {};
  private migrationRules: MigrationRule;
  private validationRules: ValidationRule;
  private compatibilityNotes: Record<string, string[]> = {};

  constructor() {
    this.loadTemplates();
  }

  /**
   * Load compatibility templates from JSON file
   */
  private async loadTemplates(): Promise<void> {
    try {
      const templatesPath = path.join(__dirname, 'templates', 'n8n-compatibility-templates.json');
      const templatesContent = await fs.readFile(templatesPath, 'utf-8');
      const templatesData = JSON.parse(templatesContent);

      this.templates = templatesData.templates;
      this.migrationRules = templatesData.migrationRules;
      this.validationRules = templatesData.validationRules;
      this.compatibilityNotes = templatesData.compatibilityNotes;
    } catch (error) {
      console.warn(`Could not load compatibility templates: ${error.message}`);
      // Use empty templates as fallback
      this.templates = {};
      this.migrationRules = {
        credentialMapping: {},
        dataTransformation: {
          n8nExpressions: {
            pattern: '{{.*}}',
            replacement: '${.*}',
            functions: {}
          }
        },
        errorHandling: {}
      };
      this.validationRules = {
        securityChecks: {},
        resourceLimits: {
          maxCodeLength: 10000,
          maxMemoryMB: 512,
          maxTimeoutMs: 300000
        }
      };
    }
  }

  /**
   * Validate n8n node conversion using templates
   */
  async validateNodeConversion(
    nodeType: string,
    nodeParameters: Record<string, any>,
    nodeCredentials?: Record<string, string>
  ): Promise<TemplateValidationResult> {
    const template = this.templates[nodeType];
    
    if (!template) {
      return {
        valid: false,
        warnings: [{
          type: 'compatibility',
          message: `No compatibility template found for node type: ${nodeType}`,
          suggestion: 'This node type may not be fully supported. Manual conversion required.'
        }],
        errors: [{
          type: 'unsupported_feature',
          message: `Unsupported node type: ${nodeType}`,
          critical: false
        }],
        suggestions: [
          'Consider using a generic HTTP request or custom function',
          'Check if there\'s an equivalent Qflow module available'
        ],
        transformedParams: nodeParameters,
        securityIssues: []
      };
    }

    const result: TemplateValidationResult = {
      valid: true,
      warnings: [],
      errors: [],
      suggestions: [],
      transformedParams: {},
      securityIssues: []
    };

    // Validate required parameters
    await this.validateRequiredParameters(template, nodeParameters, result);

    // Transform parameters
    result.transformedParams = await this.transformParameters(template, nodeParameters);

    // Apply default parameters
    result.transformedParams = {
      ...template.defaultParams,
      ...result.transformedParams
    };

    // Validate credentials
    if (template.validation.credentialRequired && !nodeCredentials) {
      result.errors.push({
        type: 'missing_required',
        message: 'This node requires credentials that need to be reconfigured in Qflow',
        critical: false
      });
      result.warnings.push({
        type: 'credential',
        message: 'Credentials will need to be set up in Qflow',
        suggestion: 'Configure equivalent credentials in Qflow before testing'
      });
    }

    // Security validation
    if (template.validation.securityChecks) {
      await this.performSecurityChecks(template.validation.securityChecks, nodeParameters, result);
    }

    // Range validation
    if (template.validation.ranges) {
      this.validateRanges(template.validation.ranges, result.transformedParams, result);
    }

    // Add compatibility notes
    const nodeNotes = this.compatibilityNotes.nodeSpecific?.[nodeType];
    if (nodeNotes) {
      result.suggestions.push(...nodeNotes);
    }

    // Add general compatibility notes
    if (this.compatibilityNotes.general) {
      result.suggestions.push(...this.compatibilityNotes.general);
    }

    // Determine overall validity
    result.valid = result.errors.filter(e => e.critical).length === 0;

    return result;
  }

  /**
   * Validate required parameters
   */
  private async validateRequiredParameters(
    template: CompatibilityTemplate,
    parameters: Record<string, any>,
    result: TemplateValidationResult
  ): Promise<void> {
    for (const requiredParam of template.validation.required) {
      const mappedParam = template.parameterMapping[requiredParam] || requiredParam;
      
      if (!parameters.hasOwnProperty(requiredParam) || 
          parameters[requiredParam] === null || 
          parameters[requiredParam] === undefined || 
          parameters[requiredParam] === '') {
        result.errors.push({
          type: 'missing_required',
          message: `Required parameter '${requiredParam}' is missing`,
          field: requiredParam,
          critical: true
        });
      }
    }
  }

  /**
   * Transform parameters using template mapping
   */
  private async transformParameters(
    template: CompatibilityTemplate,
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed: Record<string, any> = {};

    for (const [n8nParam, qflowParam] of Object.entries(template.parameterMapping)) {
      if (parameters.hasOwnProperty(n8nParam)) {
        let value = parameters[n8nParam];

        // Transform n8n expressions to Qflow format
        if (typeof value === 'string') {
          value = this.transformExpressions(value);
        }

        // Special transformations based on parameter type
        value = await this.applySpecialTransformations(n8nParam, value, template);

        transformed[qflowParam] = value;
      }
    }

    return transformed;
  }

  /**
   * Transform n8n expressions to Qflow format
   */
  private transformExpressions(value: string): string {
    const { pattern, replacement, functions } = this.migrationRules.dataTransformation.n8nExpressions;
    
    // Replace n8n expression syntax with Qflow syntax
    let transformed = value.replace(new RegExp(pattern, 'g'), replacement);

    // Replace n8n specific functions
    for (const [n8nFunc, qflowFunc] of Object.entries(functions)) {
      const funcPattern = new RegExp(n8nFunc.replace('$', '\\$'), 'g');
      transformed = transformed.replace(funcPattern, qflowFunc);
    }

    return transformed;
  }

  /**
   * Apply special transformations for specific parameter types
   */
  private async applySpecialTransformations(
    paramName: string,
    value: any,
    template: CompatibilityTemplate
  ): Promise<any> {
    // Handle boolean inversions (e.g., ignoreSSLIssues -> validateSSL)
    if (paramName === 'ignoreSSLIssues' && typeof value === 'boolean') {
      return !value; // Invert the boolean
    }

    // Handle timeout conversions (seconds to milliseconds)
    if (paramName.includes('timeout') && typeof value === 'number') {
      return value < 1000 ? value * 1000 : value; // Convert to ms if needed
    }

    // Handle array transformations
    if (paramName === 'headers' && typeof value === 'object') {
      if (value.parameters) {
        // Convert n8n header format to simple object
        const headers: Record<string, string> = {};
        for (const header of value.parameters) {
          headers[header.name] = header.value;
        }
        return headers;
      }
    }

    // Handle condition transformations for IF nodes
    if (paramName === 'conditions' && Array.isArray(value)) {
      return value.map(condition => ({
        leftValue: condition.leftValue,
        operation: this.mapComparisonOperator(condition.operation),
        rightValue: condition.rightValue,
        combineOperation: condition.combineOperation || 'AND'
      }));
    }

    return value;
  }

  /**
   * Map n8n comparison operators to Qflow operators
   */
  private mapComparisonOperator(n8nOperator: string): string {
    const operatorMap: Record<string, string> = {
      'equal': 'equals',
      'notEqual': 'not_equals',
      'larger': 'greater_than',
      'largerEqual': 'greater_than_or_equal',
      'smaller': 'less_than',
      'smallerEqual': 'less_than_or_equal',
      'contains': 'contains',
      'notContains': 'not_contains',
      'startsWith': 'starts_with',
      'endsWith': 'ends_with',
      'regex': 'matches_regex'
    };

    return operatorMap[n8nOperator] || n8nOperator;
  }

  /**
   * Perform security checks on parameters
   */
  private async performSecurityChecks(
    securityChecks: string[],
    parameters: Record<string, any>,
    result: TemplateValidationResult
  ): Promise<void> {
    for (const checkName of securityChecks) {
      const check = this.validationRules.securityChecks[checkName];
      if (!check) continue;

      // Check code parameters for security issues
      const codeParams = ['functionCode', 'jsCode', 'code', 'query'];
      for (const param of codeParams) {
        if (parameters[param] && typeof parameters[param] === 'string') {
          const code = parameters[param];
          
          if (check.pattern) {
            const regex = new RegExp(check.pattern, 'gi');
            if (regex.test(code)) {
              result.securityIssues.push({
                type: this.getSecurityIssueType(checkName),
                severity: this.getSecuritySeverity(checkName),
                message: check.message,
                location: param,
                mitigation: this.getSecurityMitigation(checkName)
              });
            }
          }

          if (check.patterns) {
            for (const pattern of check.patterns) {
              const regex = new RegExp(pattern, 'gi');
              if (regex.test(code)) {
                result.securityIssues.push({
                  type: this.getSecurityIssueType(checkName),
                  severity: this.getSecuritySeverity(checkName),
                  message: check.message,
                  location: param,
                  mitigation: this.getSecurityMitigation(checkName)
                });
                break;
              }
            }
          }
        }
      }
    }

    // Check resource limits
    this.validateResourceLimits(parameters, result);
  }

  /**
   * Validate parameter ranges
   */
  private validateRanges(
    ranges: Record<string, { min?: number; max?: number }>,
    parameters: Record<string, any>,
    result: TemplateValidationResult
  ): void {
    for (const [param, range] of Object.entries(ranges)) {
      if (parameters[param] !== undefined) {
        const value = Number(parameters[param]);
        
        if (isNaN(value)) {
          result.errors.push({
            type: 'invalid_value',
            message: `Parameter '${param}' must be a number`,
            field: param,
            critical: false
          });
          continue;
        }

        if (range.min !== undefined && value < range.min) {
          result.errors.push({
            type: 'invalid_value',
            message: `Parameter '${param}' must be at least ${range.min}`,
            field: param,
            critical: false
          });
        }

        if (range.max !== undefined && value > range.max) {
          result.errors.push({
            type: 'invalid_value',
            message: `Parameter '${param}' must be at most ${range.max}`,
            field: param,
            critical: false
          });
        }
      }
    }
  }

  /**
   * Validate resource limits
   */
  private validateResourceLimits(
    parameters: Record<string, any>,
    result: TemplateValidationResult
  ): void {
    const limits = this.validationRules.resourceLimits;

    // Check code length
    const codeParams = ['functionCode', 'jsCode', 'code'];
    for (const param of codeParams) {
      if (parameters[param] && typeof parameters[param] === 'string') {
        const codeLength = parameters[param].length;
        if (codeLength > limits.maxCodeLength) {
          result.warnings.push({
            type: 'performance',
            message: `Code in '${param}' is very long (${codeLength} characters)`,
            suggestion: 'Consider breaking down complex code into smaller functions'
          });
        }
      }
    }

    // Check timeout values
    if (parameters.timeout && parameters.timeout > limits.maxTimeoutMs) {
      result.warnings.push({
        type: 'performance',
        message: `Timeout value is very high (${parameters.timeout}ms)`,
        suggestion: 'Consider using a more reasonable timeout value'
      });
    }
  }

  /**
   * Get security issue type from check name
   */
  private getSecurityIssueType(checkName: string): SecurityIssue['type'] {
    const typeMap: Record<string, SecurityIssue['type']> = {
      'noEval': 'code_injection',
      'noFileSystem': 'resource_abuse',
      'noNetwork': 'network_access',
      'sqlInjection': 'code_injection',
      'keyManagement': 'credential_exposure',
      'privateKeyHandling': 'credential_exposure'
    };

    return typeMap[checkName] || 'code_injection';
  }

  /**
   * Get security severity from check name
   */
  private getSecuritySeverity(checkName: string): SecurityIssue['severity'] {
    const severityMap: Record<string, SecurityIssue['severity']> = {
      'noEval': 'critical',
      'sqlInjection': 'critical',
      'privateKeyHandling': 'critical',
      'noFileSystem': 'high',
      'noNetwork': 'medium',
      'keyManagement': 'high'
    };

    return severityMap[checkName] || 'medium';
  }

  /**
   * Get security mitigation advice
   */
  private getSecurityMitigation(checkName: string): string {
    const mitigationMap: Record<string, string> = {
      'noEval': 'Remove eval() calls and use safer alternatives like JSON.parse()',
      'noFileSystem': 'Use Qflow file operations or remove file system access',
      'noNetwork': 'Use HTTP Request nodes instead of direct network calls',
      'sqlInjection': 'Use parameterized queries and input validation',
      'keyManagement': 'Use Qlock for secure key management',
      'privateKeyHandling': 'Store private keys securely using Qwallet'
    };

    return mitigationMap[checkName] || 'Review and secure the flagged code';
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }

  /**
   * Get template for specific node type
   */
  getTemplate(nodeType: string): CompatibilityTemplate | null {
    return this.templates[nodeType] || null;
  }

  /**
   * Get compatibility notes for node type
   */
  getCompatibilityNotes(nodeType: string): string[] {
    const specific = this.compatibilityNotes.nodeSpecific?.[nodeType] || [];
    const general = this.compatibilityNotes.general || [];
    return [...specific, ...general];
  }
}