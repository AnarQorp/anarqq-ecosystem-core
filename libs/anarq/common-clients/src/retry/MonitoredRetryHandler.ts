import { RetryHandler } from './RetryHandler.js';
import { RetryMonitor } from '../monitoring/RetryMonitor.js';
import { RetryPolicy, QError } from '../types/client.js';

/**
 * Enhanced retry handler with monitoring and metrics collection
 */
export class MonitoredRetryHandler extends RetryHandler {
  private monitor: RetryMonitor;
  private module?: string;

  constructor(
    config: RetryPolicy,
    monitor?: RetryMonitor,
    module?: string
  ) {
    super(config);
    this.monitor = monitor || new RetryMonitor();
    this.module = module;
  }

  /**
   * Execute a function with retry logic and monitoring
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const operation = operationName || 'unknown';
    
    this.monitor.startRetryOperation(
      operationId,
      operation,
      this.getConfig(),
      this.module
    );

    let lastError: Error;
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.getConfig().maxAttempts; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        const result = await fn();
        
        // Record successful attempt
        this.monitor.recordRetryAttempt(
          operationId,
          attempt,
          undefined,
          0,
          true
        );
        
        this.monitor.completeRetryOperation(operationId, true);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        const attemptDuration = Date.now() - attemptStartTime;
        
        // Check if we should retry
        const shouldRetry = attempt < this.getConfig().maxAttempts && 
                           this.shouldRetry(error as QError);
        
        let delay = 0;
        if (shouldRetry) {
          delay = this.calculateDelay(attempt);
        }
        
        // Record the attempt
        this.monitor.recordRetryAttempt(
          operationId,
          attempt,
          error as Error,
          delay,
          false
        );
        
        if (!shouldRetry) {
          break;
        }

        // Wait before next attempt
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    // Record final failure
    this.monitor.completeRetryOperation(operationId, false, lastError);
    throw lastError!;
  }

  /**
   * Execute with circuit breaker integration
   */
  async executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    circuitBreakerFn: (fn: () => Promise<T>) => Promise<T>,
    operationName?: string
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const operation = operationName || 'unknown';
    
    this.monitor.startRetryOperation(
      operationId,
      operation,
      this.getConfig(),
      this.module
    );

    try {
      const wrappedFn = async () => {
        return this.execute(fn, operation);
      };
      
      const result = await circuitBreakerFn(wrappedFn);
      return result;
      
    } catch (error) {
      // Check if circuit breaker was tripped
      if ((error as QError).code === 'CIRCUIT_BREAKER_OPEN') {
        this.monitor.recordCircuitBreakerTrip(operationId);
      }
      
      throw error;
    }
  }

  /**
   * Get retry statistics for this handler
   */
  getStats() {
    return this.monitor.getRetryStats(this.module);
  }

  /**
   * Get recent failures for analysis
   */
  getRecentFailures(limit?: number) {
    return this.monitor.getRecentFailures(limit, this.module);
  }

  /**
   * Get the monitoring instance
   */
  getMonitor(): RetryMonitor {
    return this.monitor;
  }

  /**
   * Shutdown handler and cleanup resources
   */
  shutdown(): void {
    this.monitor.shutdown();
  }

  private generateOperationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldRetry(error: QError): boolean {
    // Use parent class logic
    return super['shouldRetry'](error);
  }

  private calculateDelay(attempt: number): number {
    // Use parent class logic
    return super['calculateDelay'](attempt);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}