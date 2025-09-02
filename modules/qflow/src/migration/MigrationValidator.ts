/**
 * Migration Validator
 * 
 * Validates migrated workflows and provides testing tools to ensure
 * successful migration from n8n to Qflow
 */

import { FlowDefinition, FlowStep } from '../models/FlowDefinition';
import { ExecutionEngine } from '../core/ExecutionEngine';
import { CompatibilityLayer } from './CompatibilityLayer';
import { N8nWorkflow, MigrationResult, MigrationTestCase } from './N8nWorkflowImporter';

export interface ValidationConfig {
  enableStructuralValidation?: boolean;
  enableSemanticValidation?: boolean;
  enablePerformanceValidation?: boolean;
  enableSecurityValidation?: boolean;
  enableCompatibilityValidation?: boolean;
  strictMode?: boolean;
  timeoutMs?: number;
}

export interface ValidationReport {
  overall: {
    passed: boolean;
    score: number;
    timestamp: string;
    duration: number;
  };
  structural: StructuralValidationResult;
  semantic: SemanticValidationResult;
  performance: PerformanceValidationResult;
  security: SecurityValidationResult;
  compatibility: CompatibilityValidationResult;
  testResults: TestExecutionResult[];
  recommendations: string[];
}

export interface StructuralValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    stepCount: number;
    connectionCount: number;
    cyclicDependencies: string[];
    unreachableSteps: string[];
  };
}

export interface SemanticValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    parameterCoverage: number;
    credentialMappings: number;
    expressionComplexity: number;
  };
}

export interface PerformanceValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    estimatedExecutionTime: number;
    resourceRequirements: any;
    bottlenecks: string[];
  };
}

export interface SecurityValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    credentialExposure: string[];
    unsafeOperations: string[];
    sandboxViolations: string[];
  };
}

export interface CompatibilityValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    compatibilityScore: number;
    unsupportedFeatures: string[];
    requiredManualChanges: string[];
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  stepId?: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface TestExecutionResult {
  testCase: MigrationTestCase;
  passed: boolean;
  executionTime: number;
  actualOutput: any;
  error?: string;
  warnings: string[];
}

export interface MigrationTestSuite {
  name: string;
  description: string;
  testCases: MigrationTestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * Migration validator for n8n to Qflow migrations
 */
export class MigrationValidator {
  private config: ValidationConfig;
  private compatibilityLayer: CompatibilityLayer;
  private executionEngine: ExecutionEngine;

  constructor(
    config: ValidationConfig = {},
    compatibilityLayer?: CompatibilityLayer,
    executionEngine?: ExecutionEngine
  ) {
    this.config = {
      enableStructuralValidation: true,
      enableSemanticValidation: true,
      enablePerformanceValidation: true,
      enableSecurityValidation: true,
      enableCompatibilityValidation: true,
      strictMode: false,
      timeoutMs: 30000,
      ...config
    };

    this.compatibilityLayer = compatibilityLayer || new CompatibilityLayer();
    this.executionEngine = executionEngine || new ExecutionEngine();
  }

  /**
   * Validate migrated workflow comprehensively
   */
  async validateMigration(
    originalWorkflow: N8nWorkflow,
    migratedFlow: FlowDefinition,
    migrationResult: MigrationResult
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const report: ValidationReport = {
      overall: {
        passed: false,
        score: 0,
        timestamp: new Date().toISOString(),
        duration: 0
      },
      structural: { passed: true, issues: [], metrics: { stepCount: 0, connectionCount: 0, cyclicDependencies: [], unreachableSteps: [] } },
      semantic: { passed: true, issues: [], metrics: { parameterCoverage: 0, credentialMappings: 0, expressionComplexity: 0 } },
      performance: { passed: true, issues: [], metrics: { estimatedExecutionTime: 0, resourceRequirements: {}, bottlenecks: [] } },
      security: { passed: true, issues: [], metrics: { credentialExposure: [], unsafeOperations: [], sandboxViolations: [] } },
      compatibility: { passed: true, issues: [], metrics: { compatibilityScore: 0, unsupportedFeatures: [], requiredManualChanges: [] } },
      testResults: [],
      recommendations: []
    };

    try {
      // Structural validation
      if (this.config.enableStructuralValidation) {
        report.structural = await this.validateStructure(migratedFlow);
      }

      // Semantic validation
      if (this.config.enableSemanticValidation) {
        report.semantic = await this.validateSemantics(originalWorkflow, migratedFlow);
      }

      // Performance validation
      if (this.config.enablePerformanceValidation) {
        report.performance = await this.validatePerformance(migratedFlow);
      }

      // Security validation
      if (this.config.enableSecurityValidation) {
        report.security = await this.validateSecurity(migratedFlow);
      }

      // Compatibility validation
      if (this.config.enableCompatibilityValidation) {
        report.compatibility = await this.validateCompatibility(originalWorkflow, migratedFlow);
      }

      // Execute test cases
      if (migrationResult.testCases) {
        report.testResults = await this.executeTestCases(migratedFlow, migrationResult.testCases);
      }

      // Calculate overall score and status
      report.overall.score = this.calculateOverallScore(report);
      report.overall.passed = this.determineOverallStatus(report);
      report.overall.duration = Date.now() - startTime;

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

    } catch (error) {
      report.overall.passed = false;
      report.overall.duration = Date.now() - startTime;
      report.recommendations = [`Validation failed with error: ${error.message}`];
    }

    return report;
  }

  /**
   * Validate workflow structure
   */
  private async validateStructure(flow: FlowDefinition): Promise<StructuralValidationResult> {
    const issues: ValidationIssue[] = [];
    const stepCount = flow.steps.length;
    let connectionCount = 0;

    // Count connections
    for (const step of flow.steps) {
      if (step.onSuccess) connectionCount++;
      if (step.onFailure) connectionCount++;
    }

    // Check for cyclic dependencies
    const cyclicDependencies = this.detectCyclicDependencies(flow.steps);
    if (cyclicDependencies.length > 0) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: `Cyclic dependencies detected: ${cyclicDependencies.join(', ')}`,
        suggestion: 'Review step connections to eliminate cycles'
      });
    }

    // Check for unreachable steps
    const unreachableSteps = this.findUnreachableSteps(flow.steps);
    if (unreachableSteps.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'structure',
        message: `Unreachable steps found: ${unreachableSteps.join(', ')}`,
        suggestion: 'Remove unreachable steps or add connections to them'
      });
    }

    // Check for missing start step
    const hasStartStep = flow.steps.some(step => 
      step.type === 'event-trigger' || 
      step.id === 'start' ||
      !flow.steps.some(s => s.onSuccess === step.id || s.onFailure === step.id)
    );

    if (!hasStartStep) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: 'No start step identified in workflow',
        suggestion: 'Ensure at least one step is marked as a trigger or entry point'
      });
    }

    // Check for orphaned steps
    const orphanedSteps = flow.steps.filter(step => 
      !step.onSuccess && 
      !step.onFailure && 
      step.type !== 'event-trigger'
    );

    if (orphanedSteps.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'structure',
        message: `Steps with no connections: ${orphanedSteps.map(s => s.id).join(', ')}`,
        suggestion: 'Add success/failure connections or remove unused steps'
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        stepCount,
        connectionCount,
        cyclicDependencies,
        unreachableSteps
      }
    };
  }

  /**
   * Validate workflow semantics
   */
  private async validateSemantics(
    originalWorkflow: N8nWorkflow,
    migratedFlow: FlowDefinition
  ): Promise<SemanticValidationResult> {
    const issues: ValidationIssue[] = [];
    let parameterCoverage = 0;
    let credentialMappings = 0;
    let expressionComplexity = 0;

    // Check parameter coverage
    const originalParams = this.extractOriginalParameters(originalWorkflow);
    const migratedParams = this.extractMigratedParameters(migratedFlow);
    
    parameterCoverage = this.calculateParameterCoverage(originalParams, migratedParams);
    
    if (parameterCoverage < 0.8) {
      issues.push({
        severity: 'warning',
        category: 'semantics',
        message: `Low parameter coverage: ${Math.round(parameterCoverage * 100)}%`,
        suggestion: 'Review parameter mapping to ensure all important parameters are migrated'
      });
    }

    // Check credential mappings
    for (const node of originalWorkflow.nodes) {
      if (node.credentials) {
        credentialMappings++;
        const step = migratedFlow.steps.find(s => s.id.includes(node.name.toLowerCase()));
        if (!step || !step.params?.credentials) {
          issues.push({
            severity: 'error',
            category: 'semantics',
            message: `Missing credential mapping for node: ${node.name}`,
            stepId: step?.id,
            suggestion: 'Configure credentials for this step in Qflow'
          });
        }
      }
    }

    // Check expression complexity
    for (const step of migratedFlow.steps) {
      const complexity = this.calculateExpressionComplexity(step.params);
      expressionComplexity = Math.max(expressionComplexity, complexity);
      
      if (complexity > 5) {
        issues.push({
          severity: 'warning',
          category: 'semantics',
          message: `Complex expressions in step: ${step.id}`,
          stepId: step.id,
          suggestion: 'Consider simplifying expressions or breaking into multiple steps'
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        parameterCoverage,
        credentialMappings,
        expressionComplexity
      }
    };
  }

  /**
   * Validate workflow performance characteristics
   */
  private async validatePerformance(flow: FlowDefinition): Promise<PerformanceValidationResult> {
    const issues: ValidationIssue[] = [];
    const bottlenecks: string[] = [];

    // Estimate execution time
    let estimatedExecutionTime = 0;
    for (const step of flow.steps) {
      const stepTime = this.estimateStepExecutionTime(step);
      estimatedExecutionTime += stepTime;
      
      if (stepTime > 60000) { // More than 1 minute
        bottlenecks.push(step.id);
        issues.push({
          severity: 'warning',
          category: 'performance',
          message: `Potentially slow step: ${step.id} (${stepTime}ms)`,
          stepId: step.id,
          suggestion: 'Consider optimizing or breaking down this step'
        });
      }
    }

    // Check resource requirements
    const resourceRequirements = this.calculateResourceRequirements(flow);
    
    if (resourceRequirements.memoryMB > 1024) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: `High memory requirement: ${resourceRequirements.memoryMB}MB`,
        suggestion: 'Consider optimizing memory usage or using streaming operations'
      });
    }

    // Check for parallel execution opportunities
    const parallelizableSteps = this.findParallelizableSteps(flow.steps);
    if (parallelizableSteps.length > 0) {
      issues.push({
        severity: 'info',
        category: 'performance',
        message: `Steps that could be parallelized: ${parallelizableSteps.join(', ')}`,
        suggestion: 'Consider using parallel execution for independent steps'
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        estimatedExecutionTime,
        resourceRequirements,
        bottlenecks
      }
    };
  }

  /**
   * Validate workflow security
   */
  private async validateSecurity(flow: FlowDefinition): Promise<SecurityValidationResult> {
    const issues: ValidationIssue[] = [];
    const credentialExposure: string[] = [];
    const unsafeOperations: string[] = [];
    const sandboxViolations: string[] = [];

    for (const step of flow.steps) {
      // Check for credential exposure
      if (this.hasCredentialExposure(step)) {
        credentialExposure.push(step.id);
        issues.push({
          severity: 'error',
          category: 'security',
          message: `Potential credential exposure in step: ${step.id}`,
          stepId: step.id,
          suggestion: 'Use secure credential storage and avoid logging sensitive data'
        });
      }

      // Check for unsafe operations
      if (this.hasUnsafeOperations(step)) {
        unsafeOperations.push(step.id);
        issues.push({
          severity: 'warning',
          category: 'security',
          message: `Potentially unsafe operation in step: ${step.id}`,
          stepId: step.id,
          suggestion: 'Review operation for security implications'
        });
      }

      // Check for sandbox violations
      if (this.hasSandboxViolations(step)) {
        sandboxViolations.push(step.id);
        issues.push({
          severity: 'error',
          category: 'security',
          message: `Sandbox violation in step: ${step.id}`,
          stepId: step.id,
          suggestion: 'Ensure code runs within sandbox constraints'
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        credentialExposure,
        unsafeOperations,
        sandboxViolations
      }
    };
  }

  /**
   * Validate compatibility with original n8n workflow
   */
  private async validateCompatibility(
    originalWorkflow: N8nWorkflow,
    migratedFlow: FlowDefinition
  ): Promise<CompatibilityValidationResult> {
    const compatibilityResult = await this.compatibilityLayer.validateMigratedFlow(migratedFlow);
    
    const issues: ValidationIssue[] = [
      ...compatibilityResult.errors?.map(e => ({
        severity: 'error' as const,
        category: 'compatibility',
        message: e.message || 'Compatibility error',
        suggestion: 'Review migration for compatibility issues'
      })) || [],
      ...compatibilityResult.warnings?.map(w => ({
        severity: 'warning' as const,
        category: 'compatibility',
        message: w.message || 'Compatibility warning',
        suggestion: 'Test functionality to ensure it works as expected'
      })) || []
    ];

    const compatibilityScore = this.calculateCompatibilityScore(originalWorkflow, migratedFlow);
    const unsupportedFeatures = this.findUnsupportedFeatures(originalWorkflow);
    const requiredManualChanges = this.identifyRequiredManualChanges(originalWorkflow, migratedFlow);

    return {
      passed: compatibilityResult.valid,
      issues,
      metrics: {
        compatibilityScore,
        unsupportedFeatures,
        requiredManualChanges
      }
    };
  }

  /**
   * Execute test cases for migrated workflow
   */
  private async executeTestCases(
    flow: FlowDefinition,
    testCases: MigrationTestCase[]
  ): Promise<TestExecutionResult[]> {
    const results: TestExecutionResult[] = [];

    for (const testCase of testCases) {
      const startTime = Date.now();
      let result: TestExecutionResult;

      try {
        // Execute test case with timeout
        const executionPromise = this.executeTestCase(flow, testCase);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test execution timeout')), this.config.timeoutMs)
        );

        const actualOutput = await Promise.race([executionPromise, timeoutPromise]);
        const executionTime = Date.now() - startTime;

        // Compare results
        const passed = this.compareTestResults(testCase.expectedOutput, actualOutput);

        result = {
          testCase,
          passed,
          executionTime,
          actualOutput,
          warnings: []
        };

        if (!passed) {
          result.warnings.push('Output does not match expected result');
        }

      } catch (error) {
        result = {
          testCase,
          passed: false,
          executionTime: Date.now() - startTime,
          actualOutput: null,
          error: error.message,
          warnings: []
        };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Execute individual test case
   */
  private async executeTestCase(flow: FlowDefinition, testCase: MigrationTestCase): Promise<any> {
    // This would integrate with the actual execution engine
    // For now, return a mock result
    return {
      status: 'completed',
      result: testCase.inputData,
      stepId: testCase.stepId
    };
  }

  /**
   * Helper methods for validation
   */
  private detectCyclicDependencies(steps: FlowStep[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        cycles.push(stepId);
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        if (step.onSuccess && dfs(step.onSuccess)) return true;
        if (step.onFailure && dfs(step.onFailure)) return true;
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        dfs(step.id);
      }
    }

    return cycles;
  }

  private findUnreachableSteps(steps: FlowStep[]): string[] {
    const reachable = new Set<string>();
    const startSteps = steps.filter(step => 
      step.type === 'event-trigger' || 
      !steps.some(s => s.onSuccess === step.id || s.onFailure === step.id)
    );

    const dfs = (stepId: string) => {
      if (reachable.has(stepId)) return;
      reachable.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        if (step.onSuccess) dfs(step.onSuccess);
        if (step.onFailure) dfs(step.onFailure);
      }
    };

    for (const startStep of startSteps) {
      dfs(startStep.id);
    }

    return steps.filter(step => !reachable.has(step.id)).map(step => step.id);
  }

  private extractOriginalParameters(workflow: N8nWorkflow): Record<string, any> {
    const params: Record<string, any> = {};
    for (const node of workflow.nodes) {
      params[node.name] = node.parameters;
    }
    return params;
  }

  private extractMigratedParameters(flow: FlowDefinition): Record<string, any> {
    const params: Record<string, any> = {};
    for (const step of flow.steps) {
      params[step.id] = step.params;
    }
    return params;
  }

  private calculateParameterCoverage(original: Record<string, any>, migrated: Record<string, any>): number {
    const originalKeys = new Set(Object.keys(original));
    const migratedKeys = new Set(Object.keys(migrated));
    const intersection = new Set([...originalKeys].filter(x => migratedKeys.has(x)));
    
    return originalKeys.size > 0 ? intersection.size / originalKeys.size : 1;
  }

  private calculateExpressionComplexity(params: any): number {
    const paramStr = JSON.stringify(params);
    let complexity = 0;
    
    // Count various complexity indicators
    complexity += (paramStr.match(/\{\{.*\}\}/g) || []).length; // Expressions
    complexity += (paramStr.match(/\$\w+/g) || []).length; // Variables
    complexity += (paramStr.match(/if\s*\(/g) || []).length; // Conditionals
    complexity += (paramStr.match(/for\s*\(/g) || []).length; // Loops
    
    return complexity;
  }

  private estimateStepExecutionTime(step: FlowStep): number {
    const baseTime = step.timeout || 30000;
    
    // Adjust based on step type
    const multipliers: Record<string, number> = {
      'task': 1.0,
      'condition': 0.1,
      'parallel': 0.5,
      'event-trigger': 0.1,
      'module-call': 2.0
    };

    return baseTime * (multipliers[step.type] || 1.0);
  }

  private calculateResourceRequirements(flow: FlowDefinition): any {
    let memoryMB = 64; // Base memory
    let cpuCores = 0.5; // Base CPU

    for (const step of flow.steps) {
      if (step.resourceLimits) {
        memoryMB += step.resourceLimits.maxMemoryMB || 0;
        cpuCores += step.resourceLimits.maxCpuPercent ? step.resourceLimits.maxCpuPercent / 100 : 0;
      }
    }

    return { memoryMB, cpuCores };
  }

  private findParallelizableSteps(steps: FlowStep[]): string[] {
    // Find steps that don't depend on each other
    const parallelizable: string[] = [];
    
    for (const step of steps) {
      const hasDependents = steps.some(s => s.onSuccess === step.id || s.onFailure === step.id);
      const hasDependencies = step.onSuccess || step.onFailure;
      
      if (!hasDependents && !hasDependencies) {
        parallelizable.push(step.id);
      }
    }

    return parallelizable;
  }

  private hasCredentialExposure(step: FlowStep): boolean {
    const paramStr = JSON.stringify(step.params);
    return /password|secret|key|token/i.test(paramStr) && !/\*\*\*/.test(paramStr);
  }

  private hasUnsafeOperations(step: FlowStep): boolean {
    const unsafePatterns = [
      /eval\(/,
      /exec\(/,
      /system\(/,
      /shell\(/,
      /require\(/
    ];
    
    const paramStr = JSON.stringify(step.params);
    return unsafePatterns.some(pattern => pattern.test(paramStr));
  }

  private hasSandboxViolations(step: FlowStep): boolean {
    if (step.type !== 'task' || !step.action?.includes('function')) {
      return false;
    }

    const code = step.params?.code || '';
    const violations = [
      /process\./,
      /require\(/,
      /import\(/,
      /fs\./,
      /child_process/
    ];

    return violations.some(pattern => pattern.test(code));
  }

  private calculateCompatibilityScore(original: N8nWorkflow, migrated: FlowDefinition): number {
    let score = 100;
    
    // Deduct points for missing nodes
    const originalNodeCount = original.nodes.length;
    const migratedStepCount = migrated.steps.length;
    
    if (migratedStepCount < originalNodeCount) {
      score -= (originalNodeCount - migratedStepCount) * 10;
    }

    return Math.max(0, score);
  }

  private findUnsupportedFeatures(workflow: N8nWorkflow): string[] {
    const unsupported: string[] = [];
    
    for (const node of workflow.nodes) {
      if (node.type.startsWith('n8n-nodes-community')) {
        unsupported.push(`Community node: ${node.type}`);
      }
      
      if (node.parameters?.mode === 'runOnceForEachItem') {
        unsupported.push(`Run once for each item mode in ${node.name}`);
      }
    }

    return unsupported;
  }

  private identifyRequiredManualChanges(original: N8nWorkflow, migrated: FlowDefinition): string[] {
    const changes: string[] = [];
    
    // Check for credential changes
    const hasCredentials = original.nodes.some(n => n.credentials);
    if (hasCredentials) {
      changes.push('Reconfigure credentials in Qflow');
    }

    // Check for webhook changes
    const hasWebhooks = original.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    if (hasWebhooks) {
      changes.push('Update webhook URLs to point to Qflow endpoints');
    }

    return changes;
  }

  private compareTestResults(expected: any, actual: any): boolean {
    // Simple comparison - could be enhanced with deep comparison
    return JSON.stringify(expected) === JSON.stringify(actual);
  }

  private calculateOverallScore(report: ValidationReport): number {
    const weights = {
      structural: 0.3,
      semantic: 0.2,
      performance: 0.2,
      security: 0.2,
      compatibility: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    if (this.config.enableStructuralValidation) {
      totalScore += (report.structural.passed ? 100 : 0) * weights.structural;
      totalWeight += weights.structural;
    }

    if (this.config.enableSemanticValidation) {
      totalScore += (report.semantic.passed ? 100 : 0) * weights.semantic;
      totalWeight += weights.semantic;
    }

    if (this.config.enablePerformanceValidation) {
      totalScore += (report.performance.passed ? 100 : 0) * weights.performance;
      totalWeight += weights.performance;
    }

    if (this.config.enableSecurityValidation) {
      totalScore += (report.security.passed ? 100 : 0) * weights.security;
      totalWeight += weights.security;
    }

    if (this.config.enableCompatibilityValidation) {
      totalScore += (report.compatibility.passed ? 100 : 0) * weights.compatibility;
      totalWeight += weights.compatibility;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private determineOverallStatus(report: ValidationReport): boolean {
    const criticalSections = [
      report.structural,
      report.security
    ];

    // Must pass critical sections
    if (criticalSections.some(section => !section.passed)) {
      return false;
    }

    // Overall score must be above threshold
    return report.overall.score >= 70;
  }

  private generateRecommendations(report: ValidationReport): string[] {
    const recommendations: string[] = [];

    if (!report.structural.passed) {
      recommendations.push('Fix structural issues before proceeding with migration');
    }

    if (!report.security.passed) {
      recommendations.push('Address all security vulnerabilities');
    }

    if (report.performance.metrics.estimatedExecutionTime > 300000) {
      recommendations.push('Consider optimizing workflow for better performance');
    }

    if (report.compatibility.metrics.compatibilityScore < 80) {
      recommendations.push('Review compatibility issues and test thoroughly');
    }

    const failedTests = report.testResults.filter(t => !t.passed).length;
    if (failedTests > 0) {
      recommendations.push(`Fix ${failedTests} failing test cases`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Migration validation passed - proceed with deployment');
    }

    return recommendations;
  }
}