/**
 * WASM Sandbox Security Service
 * Implements no-egress WASM execution environment with capability-based security
 * for filesystem/network access and DAO-signed capability exceptions
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';
import ObservabilityService from './ObservabilityService.mjs';
import { EventBusService } from './EventBusService.mjs';

export class WASMSandboxSecurityService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxExecutionTime: 30000, // 30 seconds
      maxMemoryUsage: 128 * 1024 * 1024, // 128MB
      allowedCapabilities: new Set(['compute', 'memory']), // Default safe capabilities
      blockedCapabilities: new Set(['network', 'filesystem', 'process', 'system']),
      daoSignatureRequired: true,
      capabilityExceptionTimeout: 300000, // 5 minutes
      sandboxWorkerTimeout: 60000, // 1 minute
      ...options
    };

    // Initialize services
    this.observability = new ObservabilityService();
    this.eventBus = new EventBusService();

    // Sandbox state
    this.activeSandboxes = new Map();
    this.capabilityExceptions = new Map();
    this.executionHistory = new Map();
    this.securityViolations = new Map();

    // DAO public keys for capability exception verification
    this.daoPublicKeys = new Set();

    console.log(`[WASMSandboxSecurity] Service initialized with no-egress policy`);
  }

  /**
   * Execute WASM code in secure sandbox with no-egress policy
   */
  async executeInSandbox(wasmCode, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    try {
      console.log(`[WASMSandboxSecurity] Starting sandbox execution: ${executionId}`);

      const execution = {
        executionId,
        startTime: new Date().toISOString(),
        wasmCode: typeof wasmCode === 'string' ? wasmCode : '[Binary WASM]',
        options: options,
        requestedCapabilities: options.capabilities || [],
        grantedCapabilities: [],
        securityChecks: [],
        result: null,
        violations: [],
        status: 'running'
      };

      this.activeSandboxes.set(executionId, execution);

      // Phase 1: Security pre-checks
      const securityCheck = await this.performSecurityPreChecks(executionId, wasmCode, options);
      execution.securityChecks.push(securityCheck);

      if (!securityCheck.passed) {
        execution.status = 'security_violation';
        execution.violations.push(...securityCheck.violations);
        throw new Error(`Security pre-check failed: ${securityCheck.violations.map(v => v.type).join(', ')}`);
      }

      // Phase 2: Capability validation and granting
      const capabilityCheck = await this.validateAndGrantCapabilities(executionId, options.capabilities || []);
      execution.grantedCapabilities = capabilityCheck.grantedCapabilities;

      if (capabilityCheck.violations.length > 0) {
        execution.violations.push(...capabilityCheck.violations);
      }

      // Phase 3: Create isolated sandbox environment
      const sandbox = await this.createIsolatedSandbox(executionId, execution.grantedCapabilities);

      // Phase 4: Execute WASM code with monitoring
      const executionResult = await this.executeWASMWithMonitoring(executionId, wasmCode, sandbox, options);
      execution.result = executionResult;

      // Phase 5: Post-execution security audit
      const postAudit = await this.performPostExecutionAudit(executionId, executionResult);
      execution.securityChecks.push(postAudit);

      execution.endTime = new Date().toISOString();
      execution.duration = performance.now() - startTime;
      execution.status = executionResult.success ? 'completed' : 'failed';

      // Store execution history
      this.executionHistory.set(executionId, execution);

      // Emit execution event
      await this.eventBus.publish({
        topic: 'q.wasm.sandbox.execution.completed.v1',
        payload: {
          executionId,
          status: execution.status,
          duration: execution.duration,
          violations: execution.violations.length,
          grantedCapabilities: execution.grantedCapabilities
        },
        actor: { squidId: 'wasm-sandbox-security', type: 'system' }
      });

      console.log(`[WASMSandboxSecurity] ✅ Sandbox execution completed: ${executionId} (${execution.status})`);
      return execution;

    } catch (error) {
      console.error(`[WASMSandboxSecurity] ❌ Sandbox execution failed: ${executionId}`, error);
      
      const execution = this.activeSandboxes.get(executionId) || { executionId };
      execution.error = error.message;
      execution.status = 'error';
      execution.endTime = new Date().toISOString();
      execution.duration = performance.now() - startTime;

      await this.eventBus.publish({
        topic: 'q.wasm.sandbox.execution.failed.v1',
        payload: {
          executionId,
          error: error.message,
          duration: execution.duration
        },
        actor: { squidId: 'wasm-sandbox-security', type: 'system' }
      });

      throw new Error(`WASM sandbox execution failed: ${error.message}`);
    } finally {
      this.activeSandboxes.delete(executionId);
    }
  }

  /**
   * Grant capability exception with DAO signature
   */
  async grantCapabilityException(capability, daoSignature, expirationTime = null) {
    const exceptionId = this.generateExceptionId();

    try {
      console.log(`[WASMSandboxSecurity] Processing capability exception: ${capability}`);

      // Verify DAO signature
      const signatureValid = await this.verifyDAOSignature(capability, daoSignature);
      if (!signatureValid) {
        throw new Error('Invalid DAO signature for capability exception');
      }

      const exception = {
        exceptionId,
        capability,
        daoSignature,
        grantedAt: new Date().toISOString(),
        expiresAt: expirationTime || new Date(Date.now() + this.config.capabilityExceptionTimeout).toISOString(),
        active: true,
        usageCount: 0,
        maxUsage: 10 // Limit usage of exceptions
      };

      this.capabilityExceptions.set(exceptionId, exception);

      // Emit capability exception event
      await this.eventBus.publish({
        topic: 'q.wasm.capability.exception.granted.v1',
        payload: {
          exceptionId,
          capability,
          expiresAt: exception.expiresAt
        },
        actor: { squidId: 'wasm-sandbox-security', type: 'system' }
      });

      console.log(`[WASMSandboxSecurity] ✅ Capability exception granted: ${capability} (${exceptionId})`);
      return exception;

    } catch (error) {
      console.error(`[WASMSandboxSecurity] ❌ Capability exception failed: ${capability}`, error);
      throw new Error(`Capability exception failed: ${error.message}`);
    }
  }

  /**
   * Revoke capability exception
   */
  async revokeCapabilityException(exceptionId) {
    const exception = this.capabilityExceptions.get(exceptionId);
    if (!exception) {
      throw new Error(`Capability exception not found: ${exceptionId}`);
    }

    exception.active = false;
    exception.revokedAt = new Date().toISOString();

    await this.eventBus.publish({
      topic: 'q.wasm.capability.exception.revoked.v1',
      payload: {
        exceptionId,
        capability: exception.capability
      },
      actor: { squidId: 'wasm-sandbox-security', type: 'system' }
    });

    console.log(`[WASMSandboxSecurity] Capability exception revoked: ${exceptionId}`);
    return exception;
  }

  /**
   * Perform security pre-checks
   */
  async performSecurityPreChecks(executionId, wasmCode, options) {
    const startTime = performance.now();
    const violations = [];

    try {
      // Check 1: Code size limits
      const codeSize = Buffer.isBuffer(wasmCode) ? wasmCode.length : Buffer.byteLength(wasmCode);
      if (codeSize > 10 * 1024 * 1024) { // 10MB limit
        violations.push({
          type: 'code_size_exceeded',
          details: `Code size ${codeSize} exceeds 10MB limit`,
          severity: 'high'
        });
      }

      // Check 2: Scan for dangerous patterns
      const dangerousPatterns = await this.scanForDangerousPatterns(wasmCode);
      violations.push(...dangerousPatterns);

      // Check 3: Validate requested capabilities
      const capabilityViolations = await this.validateRequestedCapabilities(options.capabilities || []);
      violations.push(...capabilityViolations);

      // Check 4: Check execution frequency limits
      const frequencyViolation = await this.checkExecutionFrequency(options.source || 'unknown');
      if (frequencyViolation) {
        violations.push(frequencyViolation);
      }

      return {
        checkType: 'security_pre_check',
        passed: violations.length === 0,
        violations,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        checkType: 'security_pre_check',
        passed: false,
        violations: [{
          type: 'pre_check_error',
          details: error.message,
          severity: 'critical'
        }],
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate and grant capabilities
   */
  async validateAndGrantCapabilities(executionId, requestedCapabilities) {
    const grantedCapabilities = [];
    const violations = [];

    for (const capability of requestedCapabilities) {
      if (this.config.allowedCapabilities.has(capability)) {
        // Capability is in allowed list
        grantedCapabilities.push(capability);
      } else if (this.config.blockedCapabilities.has(capability)) {
        // Check for DAO-signed exceptions
        const exception = await this.findValidCapabilityException(capability);
        if (exception) {
          grantedCapabilities.push(capability);
          exception.usageCount++;
          console.log(`[WASMSandboxSecurity] Granted exceptional capability: ${capability} (exception: ${exception.exceptionId})`);
        } else {
          violations.push({
            type: 'capability_not_granted',
            capability,
            details: `Capability '${capability}' requires DAO-signed exception`,
            severity: 'medium'
          });
        }
      } else {
        // Unknown capability
        violations.push({
          type: 'unknown_capability',
          capability,
          details: `Unknown capability '${capability}'`,
          severity: 'low'
        });
      }
    }

    return {
      grantedCapabilities,
      violations
    };
  }

  /**
   * Create isolated sandbox environment
   */
  async createIsolatedSandbox(executionId, grantedCapabilities) {
    const sandbox = {
      executionId,
      capabilities: new Set(grantedCapabilities),
      memoryLimit: this.config.maxMemoryUsage,
      timeLimit: this.config.maxExecutionTime,
      networkAccess: false, // No-egress policy
      filesystemAccess: false,
      processAccess: false,
      systemAccess: false,
      createdAt: new Date().toISOString()
    };

    // Override access based on granted capabilities
    if (sandbox.capabilities.has('network')) {
      sandbox.networkAccess = true;
      console.log(`[WASMSandboxSecurity] ⚠️  Network access granted to sandbox: ${executionId}`);
    }

    if (sandbox.capabilities.has('filesystem')) {
      sandbox.filesystemAccess = true;
      console.log(`[WASMSandboxSecurity] ⚠️  Filesystem access granted to sandbox: ${executionId}`);
    }

    return sandbox;
  }

  /**
   * Execute WASM with monitoring
   */
  async executeWASMWithMonitoring(executionId, wasmCode, sandbox, options) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      let executionTimeout;

      try {
        // Create worker thread for isolated execution
        const worker = new Worker(new URL('./wasm-sandbox-worker.mjs', import.meta.url), {
          workerData: {
            executionId,
            wasmCode: wasmCode.toString(),
            sandbox,
            options
          }
        });

        // Set execution timeout
        executionTimeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('WASM execution timeout'));
        }, sandbox.timeLimit);

        // Handle worker messages
        worker.on('message', (result) => {
          clearTimeout(executionTimeout);
          
          if (result.success) {
            resolve({
              success: true,
              output: result.output,
              memoryUsed: result.memoryUsed,
              executionTime: performance.now() - startTime,
              securityViolations: result.securityViolations || []
            });
          } else {
            reject(new Error(result.error || 'WASM execution failed'));
          }
        });

        // Handle worker errors
        worker.on('error', (error) => {
          clearTimeout(executionTimeout);
          reject(new Error(`Worker error: ${error.message}`));
        });

        // Handle worker exit
        worker.on('exit', (code) => {
          clearTimeout(executionTimeout);
          if (code !== 0) {
            reject(new Error(`Worker exited with code: ${code}`));
          }
        });

      } catch (error) {
        if (executionTimeout) clearTimeout(executionTimeout);
        reject(error);
      }
    });
  }

  /**
   * Perform post-execution security audit
   */
  async performPostExecutionAudit(executionId, executionResult) {
    const startTime = performance.now();
    const violations = [];

    try {
      // Check 1: Memory usage violations
      if (executionResult.memoryUsed > this.config.maxMemoryUsage) {
        violations.push({
          type: 'memory_limit_exceeded',
          details: `Memory usage ${executionResult.memoryUsed} exceeded limit ${this.config.maxMemoryUsage}`,
          severity: 'high'
        });
      }

      // Check 2: Security violations during execution
      if (executionResult.securityViolations && executionResult.securityViolations.length > 0) {
        violations.push(...executionResult.securityViolations);
      }

      // Check 3: Output validation
      const outputViolations = await this.validateExecutionOutput(executionResult.output);
      violations.push(...outputViolations);

      return {
        checkType: 'post_execution_audit',
        passed: violations.length === 0,
        violations,
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        checkType: 'post_execution_audit',
        passed: false,
        violations: [{
          type: 'audit_error',
          details: error.message,
          severity: 'critical'
        }],
        duration: performance.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Scan for dangerous patterns in WASM code
   */
  async scanForDangerousPatterns(wasmCode) {
    const violations = [];
    const codeString = wasmCode.toString();

    // Dangerous patterns to detect
    const dangerousPatterns = [
      { pattern: /require\s*\(\s*['"]fs['"]/, type: 'filesystem_access_attempt', severity: 'high' },
      { pattern: /require\s*\(\s*['"]net['"]/, type: 'network_access_attempt', severity: 'high' },
      { pattern: /require\s*\(\s*['"]child_process['"]/, type: 'process_spawn_attempt', severity: 'critical' },
      { pattern: /require\s*\(\s*['"]os['"]/, type: 'system_access_attempt', severity: 'high' },
      { pattern: /eval\s*\(/, type: 'code_injection_risk', severity: 'high' },
      { pattern: /Function\s*\(/, type: 'dynamic_code_execution', severity: 'medium' },
      { pattern: /process\.exit/, type: 'process_termination_attempt', severity: 'medium' },
      { pattern: /Buffer\.allocUnsafe/, type: 'unsafe_memory_allocation', severity: 'medium' }
    ];

    for (const { pattern, type, severity } of dangerousPatterns) {
      if (pattern.test(codeString)) {
        violations.push({
          type,
          details: `Detected dangerous pattern: ${pattern.source}`,
          severity
        });
      }
    }

    return violations;
  }

  /**
   * Validate requested capabilities
   */
  async validateRequestedCapabilities(capabilities) {
    const violations = [];

    for (const capability of capabilities) {
      if (this.config.blockedCapabilities.has(capability)) {
        // Check if there's a valid exception
        const exception = await this.findValidCapabilityException(capability);
        if (!exception) {
          violations.push({
            type: 'blocked_capability_requested',
            capability,
            details: `Capability '${capability}' is blocked and requires DAO exception`,
            severity: 'high'
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check execution frequency limits
   */
  async checkExecutionFrequency(source) {
    // Simple rate limiting - in production, this would be more sophisticated
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxExecutions = 10; // Max 10 executions per minute per source

    if (!this.executionFrequency) {
      this.executionFrequency = new Map();
    }

    const sourceHistory = this.executionFrequency.get(source) || [];
    const recentExecutions = sourceHistory.filter(time => now - time < windowMs);

    if (recentExecutions.length >= maxExecutions) {
      return {
        type: 'execution_frequency_exceeded',
        details: `Source '${source}' exceeded ${maxExecutions} executions per minute`,
        severity: 'medium'
      };
    }

    // Update history
    recentExecutions.push(now);
    this.executionFrequency.set(source, recentExecutions);

    return null;
  }

  /**
   * Find valid capability exception
   */
  async findValidCapabilityException(capability) {
    const now = new Date();

    for (const exception of this.capabilityExceptions.values()) {
      if (exception.capability === capability && 
          exception.active && 
          new Date(exception.expiresAt) > now &&
          exception.usageCount < exception.maxUsage) {
        return exception;
      }
    }

    return null;
  }

  /**
   * Verify DAO signature
   */
  async verifyDAOSignature(capability, signature) {
    // Simulate DAO signature verification
    // In production, this would verify against actual DAO public keys
    if (!this.config.daoSignatureRequired) {
      return true;
    }

    // Simple signature format validation
    if (!signature || typeof signature !== 'string' || signature.length < 64) {
      return false;
    }

    // Simulate cryptographic verification
    const expectedSignature = crypto.createHash('sha256')
      .update(`dao_capability_${capability}`)
      .digest('hex');

    return signature.includes(expectedSignature.substring(0, 16));
  }

  /**
   * Validate execution output
   */
  async validateExecutionOutput(output) {
    const violations = [];

    if (!output) {
      return violations;
    }

    const outputString = typeof output === 'string' ? output : JSON.stringify(output);

    // Check for potential data exfiltration patterns
    const exfiltrationPatterns = [
      { pattern: /http[s]?:\/\//, type: 'url_in_output', severity: 'medium' },
      { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, type: 'ip_address_in_output', severity: 'medium' },
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, type: 'email_in_output', severity: 'low' }
    ];

    for (const { pattern, type, severity } of exfiltrationPatterns) {
      if (pattern.test(outputString)) {
        violations.push({
          type,
          details: `Potential data exfiltration pattern detected in output`,
          severity
        });
      }
    }

    return violations;
  }

  /**
   * Add DAO public key for signature verification
   */
  addDAOPublicKey(publicKey) {
    this.daoPublicKeys.add(publicKey);
    console.log(`[WASMSandboxSecurity] Added DAO public key: ${publicKey.substring(0, 16)}...`);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(executionId = null) {
    if (executionId) {
      return this.executionHistory.get(executionId);
    }
    return Array.from(this.executionHistory.values());
  }

  /**
   * Get capability exceptions
   */
  getCapabilityExceptions() {
    return Array.from(this.capabilityExceptions.values());
  }

  /**
   * Get security violations
   */
  getSecurityViolations() {
    return Array.from(this.securityViolations.values());
  }

  // Utility methods
  generateExecutionId() {
    return `wasm_exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateExceptionId() {
    return `cap_exc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      activeSandboxes: this.activeSandboxes.size,
      executionHistory: this.executionHistory.size,
      capabilityExceptions: this.capabilityExceptions.size,
      daoPublicKeys: this.daoPublicKeys.size,
      config: {
        maxExecutionTime: this.config.maxExecutionTime,
        maxMemoryUsage: this.config.maxMemoryUsage,
        daoSignatureRequired: this.config.daoSignatureRequired
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default WASMSandboxSecurityService;