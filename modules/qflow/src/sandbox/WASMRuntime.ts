/**
 * WebAssembly Runtime for Secure Code Execution
 * 
 * Implements secure WASM runtime with isolation, multiple module format support,
 * and comprehensive module loading and validation
 */

import { EventEmitter } from 'events';
import { qflowEventEmitter } from '../events/EventEmitter.js';
import { ResourceLimiter, ResourceLimits } from './ResourceLimiter.js';

export interface WASMModule {
  moduleId: string;
  name: string;
  version: string;
  format: 'wasm' | 'wat' | 'wasi';
  code: Uint8Array;
  exports: string[];
  imports: string[];
  metadata: {
    author: string;
    description: string;
    capabilities: string[];
    daoApproved: boolean;
    approvalSignature?: string;
    createdAt: string;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    securityScore: number; // 0-100
  };
}

export interface WASMExecutionContext {
  executionId: string;
  moduleId: string;
  input: any;
  environment: Record<string, any>;
  limits: ResourceLimits;
  timeout: number;
  capabilities: string[];
  daoSubnet?: string;
}

export interface WASMExecutionResult {
  executionId: string;
  success: boolean;
  result?: any;
  error?: string;
  logs: string[];
  metrics: {
    executionTimeMs: number;
    memoryUsedMB: number;
    cpuTimeMs: number;
    instructionCount: number;
  };
  resourceViolations: any[];
}

export interface WASMValidationConfig {
  maxModuleSizeMB: number;
  allowedImports: string[];
  forbiddenInstructions: string[];
  requireDAOApproval: boolean;
  enableSecurityScanning: boolean;
  minSecurityScore: number;
}

export interface SecurityScanResult {
  scanId: string;
  moduleId: string;
  score: number;
  issues: SecurityIssue[];
  recommendations: string[];
  scannedAt: string;
}

export interface SecurityIssue {
  type: 'memory-access' | 'system-call' | 'network-access' | 'file-access' | 'crypto-usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  mitigation?: string;
}

/**
 * WASM Runtime with Security Isolation
 */
export class WASMRuntime extends EventEmitter {
  private modules = new Map<string, WASMModule>();
  private activeExecutions = new Map<string, WASMExecutionContext>();
  private executionResults = new Map<string, WASMExecutionResult>();
  private resourceLimiters = new Map<string, ResourceLimiter>();
  
  private readonly config: WASMValidationConfig;
  private wasmEngine: any = null; // WebAssembly engine instance
  private isInitialized: boolean = false;

  constructor(config: Partial<WASMValidationConfig> = {}) {
    super();
    
    this.config = {
      maxModuleSizeMB: 10,
      allowedImports: [
        'env.memory',
        'env.table',
        'env.abort',
        'env.log',
        'qflow.emit_event',
        'qflow.get_input',
        'qflow.set_output'
      ],
      forbiddenInstructions: [
        'call_indirect', // Potentially unsafe indirect calls
        'memory.grow',   // Uncontrolled memory growth
        'table.grow'     // Uncontrolled table growth
      ],
      requireDAOApproval: true,
      enableSecurityScanning: true,
      minSecurityScore: 70,
      ...config
    };

    this.initializeWASMEngine();
  }

  /**
   * Initialize WASM engine
   */
  private async initializeWASMEngine(): Promise<void> {
    try {
      // Check if WebAssembly is available
      if (typeof WebAssembly === 'undefined') {
        throw new Error('WebAssembly not supported in this environment');
      }

      // Initialize WASM engine (using native WebAssembly for now)
      this.wasmEngine = WebAssembly;
      this.isInitialized = true;

      console.log('[WASMRuntime] WASM engine initialized successfully');

      // Emit initialization event
      await qflowEventEmitter.emit('q.qflow.wasm.initialized.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-wasm-runtime',
        actor: 'system',
        data: {
          config: this.config,
          engineType: 'native-webassembly'
        }
      });

    } catch (error) {
      console.error(`[WASMRuntime] Failed to initialize WASM engine: ${error}`);
      throw error;
    }
  }

  /**
   * Load WASM module
   */
  async loadModule(moduleCode: string | Uint8Array, metadata: WASMModule['metadata']): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('WASM runtime not initialized');
    }

    const moduleId = this.generateModuleId();
    
    // Convert code to Uint8Array if needed
    let codeBytes: Uint8Array;
    if (typeof moduleCode === 'string') {
      // Assume base64 encoded WASM
      codeBytes = new Uint8Array(Buffer.from(moduleCode, 'base64'));
    } else {
      codeBytes = moduleCode;
    }

    // Check module size
    if (codeBytes.length > this.config.maxModuleSizeMB * 1024 * 1024) {
      throw new Error(`Module size exceeds limit: ${codeBytes.length} bytes > ${this.config.maxModuleSizeMB}MB`);
    }

    // Create module object
    const module: WASMModule = {
      moduleId,
      name: metadata.description || `Module ${moduleId}`,
      version: '1.0.0',
      format: 'wasm',
      code: codeBytes,
      exports: [],
      imports: [],
      metadata,
      validation: {
        isValid: false,
        errors: [],
        warnings: [],
        securityScore: 0
      }
    };

    // Validate module
    await this.validateModule(module);

    // Check DAO approval if required
    if (this.config.requireDAOApproval && !metadata.daoApproved) {
      throw new Error('Module requires DAO approval but is not approved');
    }

    // Store module
    this.modules.set(moduleId, module);

    console.log(`[WASMRuntime] Loaded WASM module: ${moduleId} (${codeBytes.length} bytes)`);

    // Emit module loaded event
    await qflowEventEmitter.emit('q.qflow.wasm.module.loaded.v1', {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: 'qflow-wasm-runtime',
      actor: 'system',
      data: {
        moduleId,
        name: module.name,
        size: codeBytes.length,
        securityScore: module.validation.securityScore,
        daoApproved: metadata.daoApproved
      }
    });

    return moduleId;
  }

  /**
   * Validate WASM module
   */
  async validateModule(module: WASMModule): Promise<void> {
    try {
      // Basic WASM validation
      const wasmModule = await this.wasmEngine.compile(module.code);
      
      // Extract exports and imports
      const moduleInfo = await this.analyzeModule(wasmModule);
      module.exports = moduleInfo.exports;
      module.imports = moduleInfo.imports;

      // Validate imports
      const invalidImports = module.imports.filter(imp => 
        !this.config.allowedImports.some(allowed => imp.startsWith(allowed))
      );
      
      if (invalidImports.length > 0) {
        module.validation.errors.push(`Invalid imports: ${invalidImports.join(', ')}`);
      }

      // Security scanning
      if (this.config.enableSecurityScanning) {
        const scanResult = await this.performSecurityScan(module);
        module.validation.securityScore = scanResult.score;
        
        if (scanResult.score < this.config.minSecurityScore) {
          module.validation.errors.push(`Security score too low: ${scanResult.score} < ${this.config.minSecurityScore}`);
        }

        // Add security issues as warnings/errors
        for (const issue of scanResult.issues) {
          if (issue.severity === 'critical' || issue.severity === 'high') {
            module.validation.errors.push(`Security issue: ${issue.description}`);
          } else {
            module.validation.warnings.push(`Security warning: ${issue.description}`);
          }
        }
      }

      // Check if validation passed
      module.validation.isValid = module.validation.errors.length === 0;

      if (!module.validation.isValid) {
        throw new Error(`Module validation failed: ${module.validation.errors.join(', ')}`);
      }

      console.log(`[WASMRuntime] Module validation passed: ${module.moduleId} (score: ${module.validation.securityScore})`);

    } catch (error) {
      module.validation.isValid = false;
      module.validation.errors.push(`Validation error: ${error}`);
      throw error;
    }
  }

  /**
   * Execute WASM code
   */
  async executeCode(
    moduleId: string,
    input: any,
    limits: ResourceLimits,
    timeout: number = 30000,
    capabilities: string[] = []
  ): Promise<WASMExecutionResult> {
    const module = this.modules.get(moduleId);
    if (!module || !module.validation.isValid) {
      throw new Error(`Module ${moduleId} not found or invalid`);
    }

    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    // Create execution context
    const context: WASMExecutionContext = {
      executionId,
      moduleId,
      input,
      environment: {},
      limits,
      timeout,
      capabilities
    };

    this.activeExecutions.set(executionId, context);

    // Create resource limiter
    const resourceLimiter = new ResourceLimiter(executionId, limits);
    this.resourceLimiters.set(executionId, resourceLimiter);
    resourceLimiter.startMonitoring();

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout: ${timeout}ms exceeded`));
      }, timeout);
    });

    try {
      console.log(`[WASMRuntime] Starting execution: ${executionId} (module: ${moduleId})`);

      // Emit execution started event
      await qflowEventEmitter.emit('q.qflow.wasm.execution.started.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-wasm-runtime',
        actor: executionId,
        data: {
          executionId,
          moduleId,
          timeout,
          capabilities
        }
      });

      // Execute WASM code with timeout
      const executionPromise = this.executeWASMModule(module, context, resourceLimiter);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;

      // Create execution result
      const executionResult: WASMExecutionResult = {
        executionId,
        success: true,
        result,
        logs: [], // Would collect logs during execution
        metrics: {
          executionTimeMs,
          memoryUsedMB: resourceLimiter.monitorUsage().memoryUsageMB,
          cpuTimeMs: resourceLimiter.monitorUsage().cpuTimeMs,
          instructionCount: 0 // Would count instructions during execution
        },
        resourceViolations: resourceLimiter.getViolations()
      };

      this.executionResults.set(executionId, executionResult);

      console.log(`[WASMRuntime] Execution completed: ${executionId} (${executionTimeMs}ms)`);

      // Emit execution completed event
      await qflowEventEmitter.emit('q.qflow.wasm.execution.completed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-wasm-runtime',
        actor: executionId,
        data: {
          executionId,
          moduleId,
          success: true,
          executionTimeMs,
          memoryUsedMB: executionResult.metrics.memoryUsedMB
        }
      });

      return executionResult;

    } catch (error) {
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;

      // Create error result
      const executionResult: WASMExecutionResult = {
        executionId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: [],
        metrics: {
          executionTimeMs,
          memoryUsedMB: resourceLimiter.monitorUsage().memoryUsageMB,
          cpuTimeMs: resourceLimiter.monitorUsage().cpuTimeMs,
          instructionCount: 0
        },
        resourceViolations: resourceLimiter.getViolations()
      };

      this.executionResults.set(executionId, executionResult);

      console.error(`[WASMRuntime] Execution failed: ${executionId} - ${error}`);

      // Emit execution failed event
      await qflowEventEmitter.emit('q.qflow.wasm.execution.failed.v1', {
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'qflow-wasm-runtime',
        actor: executionId,
        data: {
          executionId,
          moduleId,
          error: executionResult.error,
          executionTimeMs
        }
      });

      return executionResult;

    } finally {
      // Cleanup
      resourceLimiter.markCompleted();
      this.activeExecutions.delete(executionId);
      this.resourceLimiters.delete(executionId);
    }
  }

  /**
   * Get loaded modules
   */
  getLoadedModules(): WASMModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get execution result
   */
  getExecutionResult(executionId: string): WASMExecutionResult | undefined {
    return this.executionResults.get(executionId);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): WASMExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  // Private methods

  private async executeWASMModule(
    module: WASMModule,
    context: WASMExecutionContext,
    resourceLimiter: ResourceLimiter
  ): Promise<any> {
    // Compile module
    const wasmModule = await this.wasmEngine.compile(module.code);

    // Create imports object
    const imports = this.createImportsObject(context, resourceLimiter);

    // Instantiate module
    const instance = await this.wasmEngine.instantiate(wasmModule, imports);

    // Check for main function
    if (!instance.exports.main) {
      throw new Error('Module does not export a main function');
    }

    // Execute main function
    const result = instance.exports.main();

    return result;
  }

  private createImportsObject(context: WASMExecutionContext, resourceLimiter: ResourceLimiter): any {
    return {
      env: {
        memory: new WebAssembly.Memory({ initial: 1, maximum: 10 }),
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
        
        abort: (msg: number, file: number, line: number, col: number) => {
          throw new Error(`WASM abort: ${msg} at ${file}:${line}:${col}`);
        },
        
        log: (ptr: number, len: number) => {
          // In real implementation, would read string from WASM memory
          console.log(`[WASM ${context.executionId}] Log message`);
        }
      },
      
      qflow: {
        emit_event: (eventType: number, dataPtr: number, dataLen: number) => {
          // Emit custom event from WASM
          qflowEventEmitter.emit('q.qflow.wasm.custom.event.v1', {
            eventId: this.generateEventId(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            source: 'qflow-wasm-runtime',
            actor: context.executionId,
            data: {
              executionId: context.executionId,
              eventType,
              customData: 'event_data' // Would extract from WASM memory
            }
          });
        },
        
        get_input: () => {
          // Return input data to WASM
          return JSON.stringify(context.input);
        },
        
        set_output: (ptr: number, len: number) => {
          // Set output data from WASM
          // Would read from WASM memory in real implementation
        }
      }
    };
  }

  private async analyzeModule(wasmModule: WebAssembly.Module): Promise<{ exports: string[], imports: string[] }> {
    // In real implementation, would use WASM binary analysis tools
    // For now, return mock data
    return {
      exports: ['main', 'memory'],
      imports: ['env.memory', 'env.log']
    };
  }

  private async performSecurityScan(module: WASMModule): Promise<SecurityScanResult> {
    const scanId = this.generateScanId();
    const issues: SecurityIssue[] = [];
    let score = 100;

    // Mock security scanning - in real implementation would use proper WASM analysis
    
    // Check for potentially dangerous imports
    const dangerousImports = module.imports.filter(imp => 
      imp.includes('file') || imp.includes('network') || imp.includes('system')
    );
    
    if (dangerousImports.length > 0) {
      issues.push({
        type: 'system-call',
        severity: 'high',
        description: `Potentially dangerous imports: ${dangerousImports.join(', ')}`,
        mitigation: 'Review import usage and ensure proper sandboxing'
      });
      score -= 30;
    }

    // Check module size (large modules might be suspicious)
    if (module.code.length > 5 * 1024 * 1024) { // 5MB
      issues.push({
        type: 'memory-access',
        severity: 'medium',
        description: 'Large module size may indicate complex or potentially malicious code',
        mitigation: 'Review module contents and optimize if possible'
      });
      score -= 10;
    }

    // Check for DAO approval
    if (!module.metadata.daoApproved) {
      issues.push({
        type: 'crypto-usage',
        severity: 'medium',
        description: 'Module not approved by DAO governance',
        mitigation: 'Submit module for DAO approval process'
      });
      score -= 20;
    }

    const scanResult: SecurityScanResult = {
      scanId,
      moduleId: module.moduleId,
      score: Math.max(0, score),
      issues,
      recommendations: [
        'Ensure all imports are necessary and safe',
        'Test module in isolated environment',
        'Monitor resource usage during execution',
        'Keep module updated and review regularly'
      ],
      scannedAt: new Date().toISOString()
    };

    console.log(`[WASMRuntime] Security scan completed: ${module.moduleId} (score: ${scanResult.score})`);

    return scanResult;
  }

  private generateModuleId(): string {
    return `module_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Check if runtime is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && this.activeExecutions.size < 100; // Arbitrary health check
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.destroy();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Stop all active executions
    for (const resourceLimiter of this.resourceLimiters.values()) {
      resourceLimiter.destroy();
    }

    this.modules.clear();
    this.activeExecutions.clear();
    this.executionResults.clear();
    this.resourceLimiters.clear();
    this.removeAllListeners();

    console.log('[WASMRuntime] WASM runtime destroyed');
  }
}

// Export singleton instance
export const wasmRuntime = new WASMRuntime();