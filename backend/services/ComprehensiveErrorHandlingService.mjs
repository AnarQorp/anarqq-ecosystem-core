/**
 * Comprehensive Error Handling Service
 * Implements graceful degradation for module failures, retry mechanisms with exponential backoff,
 * detailed error logging and recovery procedures
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import ObservabilityService from './ObservabilityService.mjs';
import { EventBusService } from './EventBusService.mjs';

export class ComprehensiveErrorHandlingService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Retry configuration
      maxRetries: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      retryMultiplier: 2,
      jitterFactor: 0.1,
      
      // Circuit breaker configuration
      circuitBreakerThreshold: 5, // failures before opening circuit
      circuitBreakerTimeout: 60000, // 1 minute
      circuitBreakerResetTimeout: 300000, // 5 minutes
      
      // Graceful degradation
      degradationLevels: {
        'healthy': 0,
        'degraded': 1,
        'critical': 2,
        'emergency': 3
      },
      
      // Error classification
      retryableErrors: new Set([
        'ECONNRESET',
        'ECONNREFUSED', 
        'ETIMEDOUT',
        'ENOTFOUND',
        'NETWORK_ERROR',
        'TEMPORARY_FAILURE',
        'RATE_LIMITED'
      ]),
      
      fatalErrors: new Set([
        'AUTHENTICATION_FAILED',
        'AUTHORIZATION_DENIED',
        'INVALID_CONFIGURATION',
        'RESOURCE_NOT_FOUND',
        'VALIDATION_ERROR'
      ]),
      
      // Failure budget
      failureBudgetWindow: 3600000, // 1 hour
      failureBudgetThreshold: 0.05, // 5% error rate
      
      // Logging and artifacts
      errorLogRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
      artifactsPath: 'artifacts/chaos',
      
      ...options
    };

    // Initialize services
    this.observability = new ObservabilityService();
    this.eventBus = new EventBusService();

    // Error tracking
    this.errorHistory = new Map();
    this.circuitBreakers = new Map();
    this.retryAttempts = new Map();
    this.failureBudgets = new Map();
    this.recoveryProcedures = new Map();
    
    // Module health tracking
    this.moduleHealth = new Map();
    this.degradationStates = new Map();
    
    // PII scanner patterns
    this.piiPatterns = [
      { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { name: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { name: 'ssn', pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g },
      { name: 'credit_card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
      { name: 'ip_address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g }
    ];

    this.initializeArtifactsDirectory();
    console.log(`[ComprehensiveErrorHandling] Service initialized`);
  }

  /**
   * Initialize artifacts directory
   */
  async initializeArtifactsDirectory() {
    try {
      await fs.mkdir(this.config.artifactsPath, { recursive: true });
    } catch (error) {
      console.error(`[ComprehensiveErrorHandling] Failed to create artifacts directory:`, error);
    }
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling(operationId, operation, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    try {
      console.log(`[ComprehensiveErrorHandling] Executing operation: ${operationId} (${executionId})`);

      const execution = {
        executionId,
        operationId,
        startTime: new Date().toISOString(),
        options,
        attempts: [],
        circuitBreakerState: null,
        degradationApplied: false,
        result: null,
        status: 'running'
      };

      // Store execution for tracking
      this.activeExecutions = this.activeExecutions || new Map();
      this.activeExecutions.set(executionId, execution);

      // Check circuit breaker
      const circuitBreakerCheck = await this.checkCircuitBreaker(operationId);
      execution.circuitBreakerState = circuitBreakerCheck;

      if (circuitBreakerCheck.state === 'open') {
        throw new Error(`Circuit breaker open for operation: ${operationId}`);
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(executionId, operationId, operation, options);
      execution.result = result;
      execution.status = 'completed';
      
      // Copy attempts from retry tracking
      const retryAttempts = this.retryAttempts.get(executionId) || [];
      execution.attempts = retryAttempts;

      // Update circuit breaker on success
      await this.recordCircuitBreakerSuccess(operationId);

      // Update failure budget
      await this.updateFailureBudget(operationId, false);

      execution.endTime = new Date().toISOString();
      execution.duration = performance.now() - startTime;

      // Emit success event
      await this.eventBus.publish({
        topic: 'q.error.handling.operation.completed.v1',
        payload: {
          executionId,
          operationId,
          duration: execution.duration,
          attempts: execution.attempts.length
        },
        actor: { squidId: 'comprehensive-error-handling', type: 'system' }
      });

      console.log(`[ComprehensiveErrorHandling] ✅ Operation completed: ${operationId} (${execution.attempts.length} attempts)`);
      
      // Clean up
      this.activeExecutions.delete(executionId);
      return execution;

    } catch (error) {
      console.error(`[ComprehensiveErrorHandling] ❌ Operation failed: ${operationId}`, error);

      // Record failure
      await this.recordOperationFailure(operationId, error);
      
      // Update circuit breaker on failure
      await this.recordCircuitBreakerFailure(operationId);
      
      // Update failure budget
      await this.updateFailureBudget(operationId, true);

      // Apply graceful degradation if needed
      await this.applyGracefulDegradation(operationId, error);

      // Emit failure event
      await this.eventBus.publish({
        topic: 'q.error.handling.operation.failed.v1',
        payload: {
          executionId,
          operationId,
          error: error.message,
          duration: performance.now() - startTime
        },
        actor: { squidId: 'comprehensive-error-handling', type: 'system' }
      });

      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(executionId, operationId, operation, options) {
    let lastError;
    const maxRetries = options.maxRetries || this.config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptId = this.generateAttemptId();
      const attemptStart = performance.now();

      try {
        console.log(`[ComprehensiveErrorHandling] Attempt ${attempt + 1}/${maxRetries + 1}: ${operationId}`);

        // Execute the operation
        const result = await operation();

        // Record successful attempt
        const attemptRecord = {
          attemptId,
          attempt: attempt + 1,
          status: 'success',
          duration: performance.now() - attemptStart,
          timestamp: new Date().toISOString()
        };

        this.recordAttempt(executionId, attemptRecord);
        return result;

      } catch (error) {
        lastError = error;
        
        const attemptRecord = {
          attemptId,
          attempt: attempt + 1,
          status: 'failed',
          error: error.message,
          errorCode: error.code,
          duration: performance.now() - attemptStart,
          timestamp: new Date().toISOString()
        };

        this.recordAttempt(executionId, attemptRecord);

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        // Calculate retry delay with exponential backoff and jitter
        const retryDelay = this.calculateRetryDelay(attempt);
        console.log(`[ComprehensiveErrorHandling] Retrying in ${retryDelay}ms after error: ${error.message}`);

        // Wait before retry
        await this.sleep(retryDelay);
      }
    }

    throw lastError;
  }

  /**
   * Apply graceful degradation for module failures
   */
  async applyGracefulDegradation(operationId, error) {
    const moduleId = this.extractModuleFromOperationId(operationId);
    const currentHealth = this.moduleHealth.get(moduleId) || { status: 'healthy', failures: 0 };
    
    // Increment failure count
    currentHealth.failures++;
    currentHealth.lastFailure = new Date().toISOString();
    currentHealth.lastError = error.message;

    // Determine degradation level
    const degradationLevel = this.determineDegradationLevel(currentHealth.failures);
    const previousLevel = this.degradationStates.get(moduleId) || 'healthy';

    if (degradationLevel !== previousLevel) {
      console.log(`[ComprehensiveErrorHandling] Applying degradation: ${moduleId} ${previousLevel} → ${degradationLevel}`);

      // Apply degradation measures
      const degradationActions = await this.applyDegradationMeasures(moduleId, degradationLevel);
      
      // Update state
      this.degradationStates.set(moduleId, degradationLevel);
      currentHealth.status = degradationLevel;
      currentHealth.degradationActions = degradationActions;

      // Emit degradation event
      await this.eventBus.publish({
        topic: 'q.error.handling.degradation.applied.v1',
        payload: {
          moduleId,
          previousLevel,
          newLevel: degradationLevel,
          failures: currentHealth.failures,
          actions: degradationActions
        },
        actor: { squidId: 'comprehensive-error-handling', type: 'system' }
      });
    }

    this.moduleHealth.set(moduleId, currentHealth);
  }

  /**
   * Apply degradation measures based on level
   */
  async applyDegradationMeasures(moduleId, degradationLevel) {
    const actions = [];

    switch (degradationLevel) {
      case 'degraded':
        actions.push({ action: 'increase_timeout', factor: 2 });
        actions.push({ action: 'reduce_concurrency', factor: 0.5 });
        break;
        
      case 'critical':
        actions.push({ action: 'increase_timeout', factor: 5 });
        actions.push({ action: 'reduce_concurrency', factor: 0.2 });
        actions.push({ action: 'enable_fallback_mode' });
        break;
        
      case 'emergency':
        actions.push({ action: 'disable_non_critical_features' });
        actions.push({ action: 'enable_emergency_mode' });
        actions.push({ action: 'activate_recovery_procedures' });
        
        // Trigger recovery procedures
        await this.triggerRecoveryProcedures(moduleId);
        break;
    }

    return actions;
  }

  /**
   * Trigger recovery procedures
   */
  async triggerRecoveryProcedures(moduleId) {
    const recoveryProcedure = this.recoveryProcedures.get(moduleId);
    
    if (recoveryProcedure) {
      try {
        console.log(`[ComprehensiveErrorHandling] Triggering recovery procedure for: ${moduleId}`);
        await recoveryProcedure.execute();
        
        await this.eventBus.publish({
          topic: 'q.error.handling.recovery.triggered.v1',
          payload: {
            moduleId,
            procedureId: recoveryProcedure.id
          },
          actor: { squidId: 'comprehensive-error-handling', type: 'system' }
        });
        
      } catch (error) {
        console.error(`[ComprehensiveErrorHandling] Recovery procedure failed for ${moduleId}:`, error);
      }
    }
  }

  /**
   * Register recovery procedure for a module
   */
  registerRecoveryProcedure(moduleId, procedure) {
    this.recoveryProcedures.set(moduleId, {
      id: this.generateProcedureId(),
      moduleId,
      execute: procedure,
      registeredAt: new Date().toISOString()
    });

    console.log(`[ComprehensiveErrorHandling] Recovery procedure registered for: ${moduleId}`);
  }

  /**
   * Check circuit breaker state
   */
  async checkCircuitBreaker(operationId) {
    const circuitBreaker = this.circuitBreakers.get(operationId) || {
      state: 'closed',
      failures: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null
    };

    const now = Date.now();

    // Check if circuit should be reset
    if (circuitBreaker.state === 'open' && 
        circuitBreaker.openedAt && 
        (now - new Date(circuitBreaker.openedAt).getTime()) > this.config.circuitBreakerResetTimeout) {
      
      circuitBreaker.state = 'half-open';
      console.log(`[ComprehensiveErrorHandling] Circuit breaker half-open: ${operationId}`);
    }

    return circuitBreaker;
  }

  /**
   * Record circuit breaker success
   */
  async recordCircuitBreakerSuccess(operationId) {
    const circuitBreaker = this.circuitBreakers.get(operationId) || {
      state: 'closed',
      failures: 0
    };

    circuitBreaker.failures = 0;
    circuitBreaker.lastSuccess = new Date().toISOString();
    
    if (circuitBreaker.state === 'half-open') {
      circuitBreaker.state = 'closed';
      console.log(`[ComprehensiveErrorHandling] Circuit breaker closed: ${operationId}`);
    }

    this.circuitBreakers.set(operationId, circuitBreaker);
  }

  /**
   * Record circuit breaker failure
   */
  async recordCircuitBreakerFailure(operationId) {
    const circuitBreaker = this.circuitBreakers.get(operationId) || {
      state: 'closed',
      failures: 0
    };

    circuitBreaker.failures++;
    circuitBreaker.lastFailure = new Date().toISOString();

    if (circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      circuitBreaker.state = 'open';
      circuitBreaker.openedAt = new Date().toISOString();
      console.log(`[ComprehensiveErrorHandling] Circuit breaker opened: ${operationId} (${circuitBreaker.failures} failures)`);
    }

    this.circuitBreakers.set(operationId, circuitBreaker);
  }

  /**
   * Update failure budget
   */
  async updateFailureBudget(operationId, isFailure) {
    const now = Date.now();
    const windowStart = now - this.config.failureBudgetWindow;
    
    let budget = this.failureBudgets.get(operationId) || {
      requests: [],
      failures: []
    };

    // Clean old entries
    budget.requests = budget.requests.filter(timestamp => timestamp > windowStart);
    budget.failures = budget.failures.filter(timestamp => timestamp > windowStart);

    // Add current request
    budget.requests.push(now);
    if (isFailure) {
      budget.failures.push(now);
    }

    // Calculate error rate
    const errorRate = budget.requests.length > 0 ? budget.failures.length / budget.requests.length : 0;
    budget.errorRate = errorRate;
    budget.budgetExceeded = errorRate > this.config.failureBudgetThreshold;

    this.failureBudgets.set(operationId, budget);

    if (budget.budgetExceeded) {
      console.warn(`[ComprehensiveErrorHandling] Failure budget exceeded: ${operationId} (${(errorRate * 100).toFixed(2)}%)`);
      
      await this.eventBus.publish({
        topic: 'q.error.handling.failure.budget.exceeded.v1',
        payload: {
          operationId,
          errorRate,
          threshold: this.config.failureBudgetThreshold
        },
        actor: { squidId: 'comprehensive-error-handling', type: 'system' }
      });
    }

    return budget;
  }

  /**
   * Scan for PII leaks in data
   */
  async scanForPIILeaks(data, context = 'unknown') {
    const scanId = this.generateScanId();
    const violations = [];

    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      for (const piiPattern of this.piiPatterns) {
        const matches = dataString.match(piiPattern.pattern);
        if (matches) {
          violations.push({
            type: 'pii_leak',
            piiType: piiPattern.name,
            matches: matches.length,
            context,
            severity: this.getPIISeverity(piiPattern.name)
          });
        }
      }

      // Log scan results
      const scanResult = {
        scanId,
        context,
        violations,
        dataSize: dataString.length,
        timestamp: new Date().toISOString(),
        passed: violations.length === 0
      };

      if (violations.length > 0) {
        console.warn(`[ComprehensiveErrorHandling] PII leak detected: ${context} (${violations.length} violations)`);
        
        await this.eventBus.publish({
          topic: 'q.error.handling.pii.leak.detected.v1',
          payload: {
            scanId,
            context,
            violations: violations.length,
            types: violations.map(v => v.piiType)
          },
          actor: { squidId: 'comprehensive-error-handling', type: 'system' }
        });
      }

      return scanResult;

    } catch (error) {
      console.error(`[ComprehensiveErrorHandling] PII scan failed:`, error);
      return {
        scanId,
        context,
        error: error.message,
        passed: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate chaos testing artifacts
   */
  async generateChaosArtifacts(testResults) {
    const artifactId = this.generateArtifactId();
    
    try {
      const chaosArtifact = {
        artifactId,
        timestamp: new Date().toISOString(),
        testResults,
        errorSummary: this.generateErrorSummary(),
        retryAnalysis: this.generateRetryAnalysis(),
        failureBudgetAccounting: this.generateFailureBudgetAccounting(),
        circuitBreakerStates: this.getCircuitBreakerStates(),
        degradationStates: Object.fromEntries(this.degradationStates),
        moduleHealth: Object.fromEntries(this.moduleHealth)
      };

      // Write to artifacts directory
      const artifactPath = path.join(this.config.artifactsPath, `chaos-${artifactId}.json`);
      await fs.writeFile(artifactPath, JSON.stringify(chaosArtifact, null, 2));

      console.log(`[ComprehensiveErrorHandling] Chaos artifacts generated: ${artifactPath}`);
      return chaosArtifact;

    } catch (error) {
      console.error(`[ComprehensiveErrorHandling] Failed to generate chaos artifacts:`, error);
      throw error;
    }
  }

  /**
   * Generate retry/backoff curves
   */
  generateRetryAnalysis() {
    const retryData = [];
    
    for (const [executionId, attempts] of this.retryAttempts) {
      if (attempts.length > 1) {
        const retryDelays = [];
        for (let i = 0; i < attempts.length - 1; i++) {
          const delay = new Date(attempts[i + 1].timestamp) - new Date(attempts[i].timestamp);
          retryDelays.push(delay);
        }
        
        retryData.push({
          executionId,
          totalAttempts: attempts.length,
          retryDelays,
          totalDuration: retryDelays.reduce((sum, delay) => sum + delay, 0),
          success: attempts[attempts.length - 1].status === 'success'
        });
      }
    }

    return {
      totalRetrySequences: retryData.length,
      averageAttempts: retryData.length > 0 ? 
        retryData.reduce((sum, r) => sum + r.totalAttempts, 0) / retryData.length : 0,
      successRate: retryData.length > 0 ? 
        retryData.filter(r => r.success).length / retryData.length : 0,
      retrySequences: retryData
    };
  }

  /**
   * Generate failure budget accounting
   */
  generateFailureBudgetAccounting() {
    const budgetAccounting = {};
    
    for (const [operationId, budget] of this.failureBudgets) {
      budgetAccounting[operationId] = {
        totalRequests: budget.requests.length,
        totalFailures: budget.failures.length,
        errorRate: budget.errorRate,
        budgetExceeded: budget.budgetExceeded,
        threshold: this.config.failureBudgetThreshold
      };
    }

    return budgetAccounting;
  }

  /**
   * Generate error summary
   */
  generateErrorSummary() {
    const errorCounts = {};
    const errorTypes = {};
    
    for (const [operationId, errors] of this.errorHistory) {
      errorCounts[operationId] = errors.length;
      
      for (const error of errors) {
        const errorType = error.errorCode || error.type || 'unknown';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    }

    return {
      totalOperations: this.errorHistory.size,
      totalErrors: Object.values(errorCounts).reduce((sum, count) => sum + count, 0),
      errorsByOperation: errorCounts,
      errorsByType: errorTypes,
      mostCommonError: Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0]
    };
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates() {
    const states = {};
    
    for (const [operationId, breaker] of this.circuitBreakers) {
      states[operationId] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure,
        lastSuccess: breaker.lastSuccess
      };
    }

    return states;
  }

  // Utility methods
  isRetryableError(error) {
    return this.config.retryableErrors.has(error.code) || 
           this.config.retryableErrors.has(error.type) ||
           (!this.config.fatalErrors.has(error.code) && !this.config.fatalErrors.has(error.type));
  }

  calculateRetryDelay(attempt) {
    const baseDelay = this.config.baseRetryDelay;
    const exponentialDelay = baseDelay * Math.pow(this.config.retryMultiplier, attempt);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);
    
    return Math.floor(totalDelay);
  }

  determineDegradationLevel(failures) {
    if (failures >= 10) return 'emergency';
    if (failures >= 5) return 'critical';
    if (failures >= 2) return 'degraded';
    return 'healthy';
  }

  extractModuleFromOperationId(operationId) {
    // Extract module name from operation ID (e.g., "qlock.encrypt" -> "qlock")
    return operationId.split('.')[0] || 'unknown';
  }

  getPIISeverity(piiType) {
    const severityMap = {
      'ssn': 'critical',
      'credit_card': 'critical',
      'email': 'medium',
      'phone': 'medium',
      'ip_address': 'low'
    };
    return severityMap[piiType] || 'medium';
  }

  recordAttempt(executionId, attemptRecord) {
    if (!this.retryAttempts.has(executionId)) {
      this.retryAttempts.set(executionId, []);
    }
    this.retryAttempts.get(executionId).push(attemptRecord);
  }

  recordOperationFailure(operationId, error) {
    if (!this.errorHistory.has(operationId)) {
      this.errorHistory.set(operationId, []);
    }
    
    this.errorHistory.get(operationId).push({
      error: error.message,
      errorCode: error.code,
      type: error.type,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ID generators
  generateExecutionId() {
    return `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateAttemptId() {
    return `attempt_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  }

  generateProcedureId() {
    return `proc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateScanId() {
    return `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateArtifactId() {
    return `artifact_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get error handling status
   */
  getErrorHandlingStatus() {
    return {
      activeOperations: this.retryAttempts.size,
      circuitBreakers: this.circuitBreakers.size,
      moduleHealth: Object.fromEntries(this.moduleHealth),
      degradationStates: Object.fromEntries(this.degradationStates),
      failureBudgets: this.failureBudgets.size,
      recoveryProcedures: this.recoveryProcedures.size
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      errorHandling: this.getErrorHandlingStatus(),
      config: {
        maxRetries: this.config.maxRetries,
        circuitBreakerThreshold: this.config.circuitBreakerThreshold,
        failureBudgetThreshold: this.config.failureBudgetThreshold
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.removeAllListeners();
    console.log(`[ComprehensiveErrorHandling] Service cleaned up`);
  }
}

export default ComprehensiveErrorHandlingService;