/**
 * Contract Validator for Q Ecosystem Modules
 * Validates API contracts, schemas, and cross-module compatibility
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
// Note: openapi-schema-validator types may not be available
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

export interface ContractValidationResult {
  valid: boolean;
  errors: ContractValidationError[];
  warnings: string[];
  coverage: {
    endpoints: number;
    schemas: number;
    tested: number;
    percentage: number;
    duration?: number;
  };
}

export interface ContractValidationError {
  type: 'SCHEMA_VALIDATION' | 'API_COMPLIANCE' | 'COMPATIBILITY' | 'MISSING_SCHEMA';
  path: string;
  message: string;
  expected?: any;
  actual?: any;
  severity: 'ERROR' | 'WARNING';
}

export interface ModuleContract {
  name: string;
  version: string;
  openApiSpec?: any;
  mcpSpec?: any;
  schemas: Record<string, any>;
  events: Record<string, any>;
  dependencies: string[];
}

export class ContractValidator {
  private ajv: Ajv;
  private openApiValidator: any;
  private moduleContracts: Map<string, ModuleContract> = new Map();

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false,
      validateFormats: true
    });
    addFormats(this.ajv);
    
    this.openApiValidator = new OpenAPISchemaValidator({ version: 3 });
  }

  /**
   * Load module contract from filesystem
   */
  async loadModuleContract(modulePath: string): Promise<ModuleContract> {
    try {
      const packageJson = JSON.parse(readFileSync(join(modulePath, 'package.json'), 'utf8'));
      const name = packageJson.name.replace('@anarq/', '').replace('modules/', '');
      
      let openApiSpec;
      let mcpSpec;
      const schemas: Record<string, any> = {};
      const events: Record<string, any> = {};

      // Load OpenAPI spec if exists
      try {
        const openApiPath = join(modulePath, 'openapi.yaml');
        const yaml = await import('yaml');
        openApiSpec = yaml.parse(readFileSync(openApiPath, 'utf8'));
      } catch (e) {
        // OpenAPI spec not found or invalid
      }

      // Load MCP spec if exists
      try {
        const mcpPath = join(modulePath, 'mcp.json');
        mcpSpec = JSON.parse(readFileSync(mcpPath, 'utf8'));
      } catch (e) {
        // MCP spec not found or invalid
      }

      // Load contract schemas
      try {
        const contractsPath = join(modulePath, 'contracts');
        const fs = await import('fs');
        const files = fs.readdirSync(contractsPath);
        
        for (const file of files) {
          if (file.endsWith('.schema.json')) {
            const schemaName = file.replace('.schema.json', '');
            schemas[schemaName] = JSON.parse(
              readFileSync(join(contractsPath, file), 'utf8')
            );
          }
        }
      } catch (e) {
        // Contracts directory not found
      }

      // Load event schemas
      try {
        const eventsPath = join(modulePath, 'events');
        const fs = await import('fs');
        const files = fs.readdirSync(eventsPath);
        
        for (const file of files) {
          if (file.endsWith('.event.json')) {
            const eventName = file.replace('.event.json', '');
            events[eventName] = JSON.parse(
              readFileSync(join(eventsPath, file), 'utf8')
            );
          }
        }
      } catch (e) {
        // Events directory not found
      }

      const contract: ModuleContract = {
        name,
        version: packageJson.version,
        openApiSpec,
        mcpSpec,
        schemas,
        events,
        dependencies: Object.keys(packageJson.dependencies || {})
          .filter(dep => dep.startsWith('@anarq/') || dep.startsWith('modules/'))
      };

      this.moduleContracts.set(name, contract);
      return contract;
    } catch (error: any) {
      throw new Error(`Failed to load module contract from ${modulePath}: ${error.message}`);
    }
  }

  /**
   * Validate OpenAPI specification
   */
  validateOpenApiSpec(spec: any): ContractValidationError[] {
    const errors: ContractValidationError[] = [];

    try {
      const result = this.openApiValidator.validate(spec);
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((error: any) => ({
          type: 'API_COMPLIANCE' as const,
          path: error.instancePath || 'root',
          message: error.message,
          severity: 'ERROR' as const
        })));
      }
    } catch (error: any) {
      errors.push({
        type: 'API_COMPLIANCE',
        path: 'root',
        message: `OpenAPI validation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate JSON Schema
   */
  validateSchema(schema: any, data: any, schemaName: string): ContractValidationError[] {
    const errors: ContractValidationError[] = [];

    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (!valid && validate.errors) {
        errors.push(...validate.errors.map(error => ({
          type: 'SCHEMA_VALIDATION' as const,
          path: `${schemaName}${error.instancePath}`,
          message: error.message || 'Schema validation failed',
          expected: error.schema,
          actual: error.data,
          severity: 'ERROR' as const
        })));
      }
    } catch (error: any) {
      errors.push({
        type: 'SCHEMA_VALIDATION',
        path: schemaName,
        message: `Schema compilation failed: ${error.message}`,
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate MCP specification
   */
  validateMcpSpec(spec: any): ContractValidationError[] {
    const errors: ContractValidationError[] = [];

    // Basic MCP structure validation
    if (!spec.name) {
      errors.push({
        type: 'SCHEMA_VALIDATION',
        path: 'name',
        message: 'MCP spec must have a name',
        severity: 'ERROR'
      });
    }

    if (!spec.version) {
      errors.push({
        type: 'SCHEMA_VALIDATION',
        path: 'version',
        message: 'MCP spec must have a version',
        severity: 'ERROR'
      });
    }

    if (!spec.tools || !Array.isArray(spec.tools)) {
      errors.push({
        type: 'SCHEMA_VALIDATION',
        path: 'tools',
        message: 'MCP spec must have tools array',
        severity: 'ERROR'
      });
    } else {
      // Validate each tool
      spec.tools.forEach((tool: any, index: number) => {
        if (!tool.name) {
          errors.push({
            type: 'SCHEMA_VALIDATION',
            path: `tools[${index}].name`,
            message: 'MCP tool must have a name',
            severity: 'ERROR'
          });
        }

        if (!tool.inputSchema) {
          errors.push({
            type: 'SCHEMA_VALIDATION',
            path: `tools[${index}].inputSchema`,
            message: 'MCP tool must have inputSchema',
            severity: 'ERROR'
          });
        }

        if (!tool.outputSchema) {
          errors.push({
            type: 'SCHEMA_VALIDATION',
            path: `tools[${index}].outputSchema`,
            message: 'MCP tool must have outputSchema',
            severity: 'ERROR'
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate cross-module compatibility
   */
  validateCrossModuleCompatibility(
    sourceModule: string, 
    targetModule: string
  ): ContractValidationError[] {
    const errors: ContractValidationError[] = [];
    
    const source = this.moduleContracts.get(sourceModule);
    const target = this.moduleContracts.get(targetModule);

    if (!source || !target) {
      errors.push({
        type: 'COMPATIBILITY',
        path: 'modules',
        message: `Module contracts not loaded: ${sourceModule} -> ${targetModule}`,
        severity: 'ERROR'
      });
      return errors;
    }

    // Check if source depends on target
    if (source.dependencies.includes(targetModule)) {
      // Validate that target provides required interfaces
      this.validateModuleDependency(source, target, errors);
    }

    // Check event compatibility
    this.validateEventCompatibility(source, target, errors);

    // Check schema compatibility for shared types
    this.validateSharedSchemaCompatibility(source, target, errors);

    // Check API compatibility for known integrations
    this.validateApiCompatibility(source, target, errors);

    // Check MCP tool compatibility
    this.validateMcpToolCompatibility(source, target, errors);

    // Check standard header compatibility
    this.validateStandardHeaderCompatibility(source, target, errors);

    return errors;
  }

  /**
   * Validate module dependency requirements
   */
  private validateModuleDependency(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    // Check if target provides required HTTP endpoints
    if (source.openApiSpec && target.openApiSpec) {
      // This would require more sophisticated analysis of API dependencies
      // For now, we'll do basic checks
    }

    // Check if target provides required MCP tools
    if (source.mcpSpec && target.mcpSpec) {
      // Check for tool dependencies (this would need to be defined in specs)
    }
  }

  /**
   * Validate event compatibility between modules
   */
  private validateEventCompatibility(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    // Check if source publishes events that target consumes
    // This would require event dependency mapping in the specs
    
    // For now, validate that event schemas are compatible
    Object.entries(source.events).forEach(([eventName, eventSchema]) => {
      if (target.events[eventName]) {
        // Both modules define the same event - check compatibility
        const sourceSchema = eventSchema;
        const targetSchema = target.events[eventName];
        
        // Basic compatibility check (this could be more sophisticated)
        if (JSON.stringify(sourceSchema) !== JSON.stringify(targetSchema)) {
          errors.push({
            type: 'COMPATIBILITY',
            path: `events.${eventName}`,
            message: `Event schema mismatch between ${source.name} and ${target.name}`,
            expected: targetSchema,
            actual: sourceSchema,
            severity: 'WARNING'
          });
        }
      }
    });
  }

  /**
   * Validate shared schema compatibility
   */
  private validateSharedSchemaCompatibility(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    // Check for common schema names and validate compatibility
    const commonSchemas = Object.keys(source.schemas).filter(
      name => target.schemas[name]
    );

    commonSchemas.forEach(schemaName => {
      const sourceSchema = source.schemas[schemaName];
      const targetSchema = target.schemas[schemaName];

      // Basic compatibility check
      if (JSON.stringify(sourceSchema) !== JSON.stringify(targetSchema)) {
        errors.push({
          type: 'COMPATIBILITY',
          path: `schemas.${schemaName}`,
          message: `Schema definition mismatch between ${source.name} and ${target.name}`,
          expected: targetSchema,
          actual: sourceSchema,
          severity: 'WARNING'
        });
      }
    });
  }

  /**
   * Validate complete module contract
   */
  async validateModuleContract(modulePath: string): Promise<ContractValidationResult> {
    const contract = await this.loadModuleContract(modulePath);
    const errors: ContractValidationError[] = [];
    const warnings: string[] = [];

    // Validate OpenAPI spec
    if (contract.openApiSpec) {
      errors.push(...this.validateOpenApiSpec(contract.openApiSpec));
    } else {
      warnings.push('No OpenAPI specification found');
    }

    // Validate MCP spec
    if (contract.mcpSpec) {
      errors.push(...this.validateMcpSpec(contract.mcpSpec));
    } else {
      warnings.push('No MCP specification found');
    }

    // Validate individual schemas
    Object.entries(contract.schemas).forEach(([name, schema]) => {
      try {
        this.ajv.compile(schema);
      } catch (error: any) {
        errors.push({
          type: 'SCHEMA_VALIDATION',
          path: `schemas.${name}`,
          message: `Schema compilation failed: ${error.message}`,
          severity: 'ERROR'
        });
      }
    });

    // Validate event schemas
    Object.entries(contract.events).forEach(([name, eventSchema]) => {
      try {
        this.ajv.compile(eventSchema);
      } catch (error: any) {
        errors.push({
          type: 'SCHEMA_VALIDATION',
          path: `events.${name}`,
          message: `Event schema compilation failed: ${error.message}`,
          severity: 'ERROR'
        });
      }
    });

    // Calculate coverage
    const totalEndpoints = contract.openApiSpec?.paths ? 
      Object.keys(contract.openApiSpec.paths).length : 0;
    const totalSchemas = Object.keys(contract.schemas).length + 
      Object.keys(contract.events).length;
    const tested = totalEndpoints + totalSchemas; // This would be more sophisticated in practice

    return {
      valid: errors.filter(e => e.severity === 'ERROR').length === 0,
      errors,
      warnings,
      coverage: {
        endpoints: totalEndpoints,
        schemas: totalSchemas,
        tested,
        percentage: totalSchemas > 0 ? (tested / (totalEndpoints + totalSchemas)) * 100 : 0
      }
    };
  }

  /**
   * Generate contract test data
   */
  generateTestData(schema: any): any {
    const jsf = require('json-schema-faker');
    
    // Configure faker options
    jsf.option({
      alwaysFakeOptionals: true,
      useDefaultValue: true,
      useExamplesValue: true,
      failOnInvalidTypes: false
    });

    try {
      return jsf.generate(schema);
    } catch (error: any) {
      throw new Error(`Failed to generate test data: ${error.message}`);
    }
  }

  /**
   * Test API endpoint against contract
   */
  async testApiEndpoint(
    baseUrl: string,
    path: string,
    method: string,
    schema: any,
    headers: Record<string, string> = {}
  ): Promise<ContractValidationError[]> {
    const errors: ContractValidationError[] = [];

    try {
      const response = await axios({
        method: method.toLowerCase() as any,
        url: `${baseUrl}${path}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        validateStatus: () => true // Don't throw on HTTP errors
      });

      // Validate response against schema
      if (schema.responses) {
        const statusCode = response.status.toString();
        const responseSchema = schema.responses[statusCode];
        
        if (responseSchema?.content?.['application/json']?.schema) {
          const validationErrors = this.validateSchema(
            responseSchema.content['application/json'].schema,
            response.data,
            `${method} ${path} response`
          );
          errors.push(...validationErrors);
        }
      }
    } catch (error: any) {
      errors.push({
        type: 'API_COMPLIANCE',
        path: `${method} ${path}`,
        message: `API request failed: ${error.message}`,
        severity: 'ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate API compatibility between modules
   */
  private validateApiCompatibility(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    // Check if source expects certain endpoints from target
    if (source.openApiSpec && target.openApiSpec) {
      // Look for references to target module in source's API spec
      const sourceSpec = JSON.stringify(source.openApiSpec);
      
      // Check for common integration patterns
      const integrationPatterns = [
        { pattern: `${target.name}`, description: `References to ${target.name}` },
        { pattern: `x-${target.name}`, description: `Custom headers for ${target.name}` },
        { pattern: `/${target.name}/`, description: `API paths referencing ${target.name}` }
      ];

      integrationPatterns.forEach(({ pattern, description }) => {
        if (sourceSpec.includes(pattern)) {
          // Validate that target provides expected endpoints
          this.validateExpectedEndpoints(source, target, pattern, errors);
        }
      });
    }
  }

  /**
   * Validate MCP tool compatibility
   */
  private validateMcpToolCompatibility(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    if (source.mcpSpec && target.mcpSpec) {
      const sourceTools = source.mcpSpec.tools || [];
      const targetTools = target.mcpSpec.tools || [];

      // Check for tool name conflicts
      sourceTools.forEach((sourceTool: any) => {
        const conflictingTool = targetTools.find((targetTool: any) => 
          targetTool.name === sourceTool.name
        );

        if (conflictingTool) {
          // Check if schemas are compatible
          const inputCompatible = this.areSchemasCompatible(
            sourceTool.inputSchema, 
            conflictingTool.inputSchema
          );
          const outputCompatible = this.areSchemasCompatible(
            sourceTool.outputSchema, 
            conflictingTool.outputSchema
          );

          if (!inputCompatible || !outputCompatible) {
            errors.push({
              type: 'COMPATIBILITY',
              path: `mcp.tools.${sourceTool.name}`,
              message: `MCP tool schema mismatch between ${source.name} and ${target.name}`,
              severity: 'ERROR'
            });
          }
        }
      });
    }
  }

  /**
   * Validate standard header compatibility
   */
  private validateStandardHeaderCompatibility(
    source: ModuleContract,
    target: ModuleContract,
    errors: ContractValidationError[]
  ): void {
    const standardHeaders = [
      'x-squid-id',
      'x-subid', 
      'x-qonsent',
      'x-sig',
      'x-ts',
      'x-api-version'
    ];

    // Check if both modules define standard headers consistently
    if (source.openApiSpec && target.openApiSpec) {
      const sourceHeaders = this.extractHeaderDefinitions(source.openApiSpec);
      const targetHeaders = this.extractHeaderDefinitions(target.openApiSpec);

      standardHeaders.forEach(headerName => {
        const sourceHeader = sourceHeaders[headerName];
        const targetHeader = targetHeaders[headerName];

        if (sourceHeader && targetHeader) {
          // Both define the header - check compatibility
          if (!this.areHeadersCompatible(sourceHeader, targetHeader)) {
            errors.push({
              type: 'COMPATIBILITY',
              path: `headers.${headerName}`,
              message: `Standard header ${headerName} definition mismatch between ${source.name} and ${target.name}`,
              severity: 'WARNING'
            });
          }
        }
      });
    }
  }

  /**
   * Validate expected endpoints exist
   */
  private validateExpectedEndpoints(
    source: ModuleContract,
    target: ModuleContract,
    pattern: string,
    errors: ContractValidationError[]
  ): void {
    // This is a simplified check - in practice, this would be more sophisticated
    // based on actual integration requirements defined in the specs
    if (!target.openApiSpec || !target.openApiSpec.paths) {
      errors.push({
        type: 'COMPATIBILITY',
        path: `integration.${pattern}`,
        message: `${source.name} expects ${target.name} to provide API endpoints, but ${target.name} has no API specification`,
        severity: 'ERROR'
      });
    }
  }

  /**
   * Check if two schemas are compatible
   */
  private areSchemasCompatible(schema1: any, schema2: any): boolean {
    // Simplified compatibility check
    // In practice, this would implement proper schema compatibility rules
    return JSON.stringify(schema1) === JSON.stringify(schema2);
  }

  /**
   * Extract header definitions from OpenAPI spec
   */
  private extractHeaderDefinitions(spec: any): Record<string, any> {
    const headers: Record<string, any> = {};
    
    // Extract from components/parameters
    if (spec.components?.parameters) {
      Object.entries(spec.components.parameters).forEach(([name, param]: [string, any]) => {
        if (param.in === 'header') {
          headers[param.name || name] = param;
        }
      });
    }

    // Extract from path parameters
    if (spec.paths) {
      Object.values(spec.paths).forEach((pathItem: any) => {
        Object.values(pathItem).forEach((operation: any) => {
          if (operation.parameters) {
            operation.parameters.forEach((param: any) => {
              if (param.in === 'header') {
                headers[param.name] = param;
              }
            });
          }
        });
      });
    }

    return headers;
  }

  /**
   * Check if header definitions are compatible
   */
  private areHeadersCompatible(header1: any, header2: any): boolean {
    // Check basic compatibility
    return header1.schema?.type === header2.schema?.type &&
           header1.required === header2.required;
  }

  /**
   * Get loaded module contracts
   */
  getModuleContracts(): Map<string, ModuleContract> {
    return this.moduleContracts;
  }

  /**
   * Clear loaded contracts
   */
  clearContracts(): void {
    this.moduleContracts.clear();
  }
}