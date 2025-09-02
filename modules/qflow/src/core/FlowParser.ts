/**
 * Qflow Flow Parser and Validator
 * 
 * Handles parsing and validation of flow definitions from JSON/YAML
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'yaml';
import { 
  FlowDefinition, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  FLOW_DEFINITION_SCHEMA 
} from '../models/FlowDefinition.js';
import { flowOwnershipService } from '../auth/FlowOwnershipService.js';
import { intelligentCachingService } from '../index.js';

export interface FlowParseResult {
  success: boolean;
  flow?: FlowDefinition;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Flow Parser and Validator
 * Parses JSON/YAML flow definitions and validates them against schema
 */
export class FlowParser {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false 
    });
    addFormats(this.ajv);
    
    // Add custom formats
    this.ajv.addFormat('squid-identity', {
      type: 'string',
      validate: (data: string) => {
        // Basic sQuid identity format validation
        return /^squid:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/.test(data);
      }
    });

    // Compile schema
    this.ajv.compile(FLOW_DEFINITION_SCHEMA);
  }

  /**
   * Parse flow definition from string (JSON or YAML)
   */
  parseFlow(flowData: string, format: 'json' | 'yaml' | 'auto' = 'auto'): FlowParseResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Determine format if auto
      let actualFormat = format;
      if (format === 'auto') {
        actualFormat = this.detectFormat(flowData);
      }

      // Parse the data
      let parsedData: any;
      try {
        if (actualFormat === 'yaml') {
          parsedData = yaml.parse(flowData);
        } else {
          parsedData = JSON.parse(flowData);
        }
      } catch (parseError) {
        errors.push({
          field: 'root',
          message: `Failed to parse ${actualFormat.toUpperCase()}: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          code: 'PARSE_ERROR',
          value: flowData.substring(0, 100)
        });
        return { success: false, errors, warnings };
      }

      // Validate structure
      const validationResult = this.validateFlowStructure(parsedData);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      if (!validationResult.valid) {
        return { success: false, errors, warnings };
      }

      // Additional business logic validation
      const businessValidation = this.validateBusinessLogic(parsedData);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      if (businessValidation.errors.length > 0) {
        return { success: false, errors, warnings };
      }

      // Normalize and enrich the flow definition
      const flow = this.normalizeFlow(parsedData);

      // Cache the parsed flow definition
      try {
        await intelligentCachingService.cacheFlow(flow.id, flow);
      } catch (error) {
        warnings.push({
          field: 'cache',
          message: `Failed to cache flow definition: ${error instanceof Error ? error.message : String(error)}`,
          code: 'CACHE_ERROR'
        });
      }

      // Register flow ownership if owner is specified
      if (flow.owner) {
        try {
          await flowOwnershipService.registerFlowOwnership(flow.id, flow.owner, flow);
        } catch (error) {
          warnings.push({
            field: 'owner',
            message: `Failed to register flow ownership: ${error instanceof Error ? error.message : String(error)}`,
            code: 'OWNERSHIP_REGISTRATION_FAILED'
          });
        }
      }

      return {
        success: true,
        flow,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        field: 'root',
        message: `Unexpected error during parsing: ${error instanceof Error ? error.message : String(error)}`,
        code: 'UNEXPECTED_ERROR'
      });
      return { success: false, errors, warnings };
    }
  }

  /**
   * Get cached flow definition
   */
  async getCachedFlow(flowId: string): Promise<FlowDefinition | null> {
    try {
      return await intelligentCachingService.getFlow(flowId);
    } catch (error) {
      console.error(`[FlowParser] Error getting cached flow ${flowId}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cached flow
   */
  async invalidateCachedFlow(flowId: string): Promise<void> {
    try {
      await intelligentCachingService.invalidate(flowId);
    } catch (error) {
      console.error(`[FlowParser] Error invalidating cached flow ${flowId}:`, error);
    }
  }

  /**
   * Validate flow structure against JSON schema
   */
  validateFlowStructure(flow: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const valid = this.ajv.validate(FLOW_DEFINITION_SCHEMA, flow);

    if (!valid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        errors.push({
          field: error.instancePath || error.schemaPath || 'unknown',
          message: error.message || 'Validation failed',
          code: error.keyword?.toUpperCase() || 'VALIDATION_ERROR',
          value: error.data
        });
      }
    }

    return {
      valid: valid === true,
      errors,
      warnings
    };
  }

  /**
   * Validate business logic rules
   */
  private validateBusinessLogic(flow: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for circular dependencies in step flow
    const circularCheck = this.checkCircularDependencies(flow.steps);
    if (circularCheck.hasCircular) {
      errors.push({
        field: 'steps',
        message: `Circular dependency detected: ${circularCheck.cycle.join(' -> ')}`,
        code: 'CIRCULAR_DEPENDENCY'
      });
    }

    // Check for unreachable steps
    const unreachableSteps = this.findUnreachableSteps(flow.steps);
    if (unreachableSteps.length > 0) {
      warnings.push({
        field: 'steps',
        message: `Unreachable steps detected: ${unreachableSteps.join(', ')}`,
        code: 'UNREACHABLE_STEPS'
      });
    }

    // Validate step references
    const stepIds = new Set(flow.steps.map((step: any) => step.id));
    for (const step of flow.steps) {
      if (step.onSuccess && !stepIds.has(step.onSuccess)) {
        errors.push({
          field: `steps.${step.id}.onSuccess`,
          message: `Referenced step '${step.onSuccess}' does not exist`,
          code: 'INVALID_STEP_REFERENCE',
          value: step.onSuccess
        });
      }
      if (step.onFailure && !stepIds.has(step.onFailure)) {
        errors.push({
          field: `steps.${step.id}.onFailure`,
          message: `Referenced step '${step.onFailure}' does not exist`,
          code: 'INVALID_STEP_REFERENCE',
          value: step.onFailure
        });
      }
    }

    // Check for duplicate step IDs
    const duplicateIds = this.findDuplicateStepIds(flow.steps);
    if (duplicateIds.length > 0) {
      errors.push({
        field: 'steps',
        message: `Duplicate step IDs found: ${duplicateIds.join(', ')}`,
        code: 'DUPLICATE_STEP_IDS'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect format of flow data
   */
  private detectFormat(data: string): 'json' | 'yaml' {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    return 'yaml';
  }

  /**
   * Check for circular dependencies in step flow
   */
  private checkCircularDependencies(steps: any[]): { hasCircular: boolean; cycle: string[] } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const stepMap = new Map(steps.map(step => [step.id, step]));

    const dfs = (stepId: string, path: string[]): string[] | null => {
      if (recursionStack.has(stepId)) {
        const cycleStart = path.indexOf(stepId);
        return path.slice(cycleStart).concat([stepId]);
      }

      if (visited.has(stepId)) {
        return null;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        const nextSteps = [step.onSuccess, step.onFailure].filter(Boolean);
        for (const nextStep of nextSteps) {
          const cycle = dfs(nextStep, [...path, stepId]);
          if (cycle) {
            return cycle;
          }
        }
      }

      recursionStack.delete(stepId);
      return null;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        const cycle = dfs(step.id, []);
        if (cycle) {
          return { hasCircular: true, cycle };
        }
      }
    }

    return { hasCircular: false, cycle: [] };
  }

  /**
   * Find unreachable steps
   */
  private findUnreachableSteps(steps: any[]): string[] {
    if (steps.length === 0) return [];

    const reachable = new Set<string>();
    const stepMap = new Map(steps.map(step => [step.id, step]));

    // Start from first step (entry point)
    const queue = [steps[0].id];
    reachable.add(steps[0].id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const step = stepMap.get(currentId);
      
      if (step) {
        const nextSteps = [step.onSuccess, step.onFailure].filter(Boolean);
        for (const nextStep of nextSteps) {
          if (!reachable.has(nextStep)) {
            reachable.add(nextStep);
            queue.push(nextStep);
          }
        }
      }
    }

    return steps
      .map(step => step.id)
      .filter(id => !reachable.has(id));
  }

  /**
   * Find duplicate step IDs
   */
  private findDuplicateStepIds(steps: any[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const step of steps) {
      if (seen.has(step.id)) {
        duplicates.add(step.id);
      } else {
        seen.add(step.id);
      }
    }

    return Array.from(duplicates);
  }

  /**
   * Normalize and enrich flow definition
   */
  private normalizeFlow(flow: any): FlowDefinition {
    const now = new Date().toISOString();

    return {
      ...flow,
      createdAt: flow.createdAt || now,
      updatedAt: now,
      metadata: {
        ...flow.metadata,
        tags: flow.metadata.tags || [],
        requiredPermissions: flow.metadata.requiredPermissions || []
      },
      steps: flow.steps.map((step: any) => ({
        ...step,
        params: step.params || {},
        timeout: step.timeout || 300000, // 5 minutes default
        retryPolicy: step.retryPolicy || {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000,
          maxDelay: 30000
        }
      }))
    };
  }
}

// Export singleton instance
export const flowParser = new FlowParser();