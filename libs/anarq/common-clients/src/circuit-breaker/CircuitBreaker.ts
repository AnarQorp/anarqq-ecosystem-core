import { CircuitBreakerConfig, CircuitBreakerState, QError, ErrorCodes } from '../types/client.js';

/**
 * Circuit breaker implementation for fault tolerance
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCallCount = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...{
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringWindow: 60000, // 60 seconds
        halfOpenMaxCalls: 3,
        fallbackStrategy: 'REJECT' as const
      },
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCallCount = 0;
      } else {
        throw this.createCircuitBreakerError();
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
        throw this.createCircuitBreakerError();
      }
      this.halfOpenCallCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenCallCount = 0;
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
    this.failureCount = 0;
    this.halfOpenCallCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private createCircuitBreakerError(): QError {
    const error = new Error('Circuit breaker is open') as QError;
    error.code = ErrorCodes.CIRCUIT_BREAKER_OPEN;
    error.statusCode = 503;
    error.timestamp = new Date().toISOString();
    error.retryable = true;
    error.suggestedActions = [
      'Wait for circuit breaker to recover',
      'Check service health',
      'Use fallback mechanism if available'
    ];
    return error;
  }
}