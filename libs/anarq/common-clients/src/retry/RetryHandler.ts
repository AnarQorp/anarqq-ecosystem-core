import { RetryPolicy, QError, ErrorCodes } from '../types/client.js';

/**
 * Retry handler with exponential backoff and jitter
 */
export class RetryHandler {
  private readonly config: Required<RetryPolicy>;

  constructor(config: RetryPolicy) {
    this.config = {
      ...{
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: [
          ErrorCodes.SERVICE_UNAVAILABLE,
          ErrorCodes.TIMEOUT_ERROR,
          ErrorCodes.IPFS_UNAVAILABLE
        ],
        retryableStatusCodes: [408, 429, 500, 502, 503, 504]
      },
      ...config
    };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxAttempts || !this.shouldRetry(error as QError)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error should be retried
   */
  private shouldRetry(error: QError): boolean {
    // Check if error code is retryable
    if (error.code && this.config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check if status code is retryable
    if (error.statusCode && this.config.retryableStatusCodes.includes(error.statusCode)) {
      return true;
    }

    // Check if error is explicitly marked as retryable
    if (error.retryable === true) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    let delay = Math.min(exponentialDelay, this.config.maxDelay);

    if (this.config.jitter) {
      // Add jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  getConfig(): Required<RetryPolicy> {
    return { ...this.config };
  }
}