/**
 * Circuit Breaker State
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time to wait before attempting recovery (ms) */
  recoveryTimeout: number;
  /** Time window for failure counting (ms) */
  monitoringWindow: number;
  /** Maximum number of test calls in half-open state */
  halfOpenMaxCalls: number;
  /** Function to determine if an error should count as a failure */
  isFailure?: (error: any) => boolean;
}

/**
 * Circuit Breaker Statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

/**
 * Circuit Breaker - Prevents cascading failures by failing fast
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private halfOpenCalls: number = 0;
  private failures: Date[] = [];

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error('Circuit breaker is HALF_OPEN and max calls exceeded');
      }
      this.halfOpenCalls++;
    }

    this.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  /**
   * Resets the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.failures = [];
    this.lastFailureTime = undefined;
  }

  /**
   * Forces the circuit breaker to open state
   */
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.lastFailureTime = new Date();
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Successful call in half-open state - close the circuit
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.failures = [];
    }
  }

  private onFailure(error: any): void {
    // Check if this error should count as a failure
    if (this.config.isFailure && !this.config.isFailure(error)) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = new Date();
    this.failures.push(new Date());

    // Clean up old failures outside the monitoring window
    this.cleanupOldFailures();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Failure in half-open state - open the circuit
      this.state = CircuitBreakerState.OPEN;
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.failures.length >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  private cleanupOldFailures(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    this.failures = this.failures.filter(failure => failure.getTime() > cutoffTime);
  }
}

/**
 * Creates a circuit breaker with default configuration
 */
export function createCircuitBreaker(
  overrides?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    halfOpenMaxCalls: 3,
    isFailure: (error) => true // All errors count as failures by default
  };

  return new CircuitBreaker({ ...defaultConfig, ...overrides });
}