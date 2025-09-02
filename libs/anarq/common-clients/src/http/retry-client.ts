import { BaseHttpClient, HttpClientConfig, HttpResponse } from './base-client';
import { CircuitBreaker, createCircuitBreaker } from '../utils/circuit-breaker';

/**
 * Retry Policy Configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

/**
 * Retry HTTP Client - HTTP client with retry logic and circuit breaker
 */
export class RetryHttpClient extends BaseHttpClient {
  private circuitBreaker: CircuitBreaker;
  private retryPolicy: RetryPolicy;

  constructor(
    config: HttpClientConfig,
    retryPolicy?: Partial<RetryPolicy>
  ) {
    super(config);
    
    this.retryPolicy = {
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
      ...retryPolicy
    };

    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringWindow: 60000,
      halfOpenMaxCalls: 3,
      isFailure: (error) => this.isRetryableError(error)
    });
  }

  /**
   * Performs a GET request with retry logic
   */
  async get<T = any>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>('GET', path, undefined, options);
  }

  /**
   * Performs a POST request with retry logic
   */
  async post<T = any>(
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>('POST', path, data, options);
  }

  /**
   * Performs a PUT request with retry logic
   */
  async put<T = any>(
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>('PUT', path, data, options);
  }

  /**
   * Performs a DELETE request with retry logic
   */
  async delete<T = any>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>('DELETE', path, undefined, options);
  }

  /**
   * Gets circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Resets the circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
    }
  ): Promise<HttpResponse<T>> {
    const maxRetries = options?.retries ?? this.retryPolicy.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.circuitBreaker.execute(async () => {
          if (method === 'GET') {
            return super.get<T>(path, options);
          } else if (method === 'POST') {
            return super.post<T>(path, data, options);
          } else if (method === 'PUT') {
            return super.put<T>(path, data, options);
          } else if (method === 'DELETE') {
            return super.delete<T>(path, options);
          } else {
            throw new Error(`Unsupported HTTP method: ${method}`);
          }
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if this is the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry if error is not retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Check for retryable error codes
    if (error.code && this.retryPolicy.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check for retryable HTTP status codes
    if (error.status && this.retryPolicy.retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // Check for specific error messages
    const message = error.message || '';
    if (message.includes('timeout') || message.includes('ECONNRESET')) {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.retryPolicy.baseDelay * Math.pow(this.retryPolicy.backoffMultiplier, attempt);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.retryPolicy.maxDelay);
    
    // Apply jitter if enabled
    if (this.retryPolicy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}