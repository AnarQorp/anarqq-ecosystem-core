import fetch from 'node-fetch';
import { HttpClientConfig, QResponse, QHeaders, QError, ErrorCodes, RequestContext } from '../types/client.js';
import { RetryHandler } from '../retry/RetryHandler.js';
import { CircuitBreaker } from '../circuit-breaker/CircuitBreaker.js';
import { IdentityRef } from '@anarq/common-schemas';

/**
 * HTTP client with retry policies, circuit breakers, and Q ecosystem standards
 */
export class HttpClient {
  private readonly config: Required<HttpClientConfig>;
  private readonly retryHandler?: RetryHandler;
  private readonly circuitBreaker?: CircuitBreaker;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      defaultHeaders: {},
      retryPolicy: undefined,
      circuitBreaker: undefined,
      ...config
    } as Required<HttpClientConfig>;

    if (this.config.retryPolicy) {
      this.retryHandler = new RetryHandler(this.config.retryPolicy);
    }

    if (this.config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    }
  }

  /**
   * Perform GET request
   */
  async get<T>(path: string, options: RequestOptions = {}): Promise<QResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Perform POST request
   */
  async post<T>(path: string, data?: any, options: RequestOptions = {}): Promise<QResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * Perform PUT request
   */
  async put<T>(path: string, data?: any, options: RequestOptions = {}): Promise<QResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * Perform DELETE request
   */
  async delete<T>(path: string, options: RequestOptions = {}): Promise<QResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Perform PATCH request
   */
  async patch<T>(path: string, data?: any, options: RequestOptions = {}): Promise<QResponse<T>> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * Core request method with retry and circuit breaker support
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<QResponse<T>> {
    const context = this.createRequestContext(options);
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(options.headers, context);

    const requestFn = async (): Promise<QResponse<T>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: headers as any,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout);

        const responseData = await response.json() as QResponse<T>;

        if (!response.ok) {
          throw this.createHttpError(response.status, responseData, context);
        }

        return responseData;
      } catch (error) {
        clearTimeout(timeout);
        
        if ((error as any).name === 'AbortError') {
          throw this.createTimeoutError(context);
        }
        
        throw error;
      }
    };

    // Apply circuit breaker if configured
    const executeWithCircuitBreaker = this.circuitBreaker 
      ? () => this.circuitBreaker!.execute(requestFn)
      : requestFn;

    // Apply retry policy if configured
    const executeWithRetry = this.retryHandler
      ? () => this.retryHandler!.execute(executeWithCircuitBreaker)
      : executeWithCircuitBreaker;

    return executeWithRetry();
  }

  /**
   * Create request context for tracing
   */
  private createRequestContext(options: RequestOptions): RequestContext {
    return {
      requestId: options.requestId || this.generateRequestId(),
      correlationId: options.correlationId,
      traceId: options.traceId,
      spanId: options.spanId,
      identity: options.identity || this.config.identity,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build complete URL
   */
  private buildUrl(path: string): string {
    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl.slice(0, -1) 
      : this.config.baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build request headers with Q ecosystem standards
   */
  private buildHeaders(customHeaders: QHeaders = {}, context: RequestContext): QHeaders {
    const headers: QHeaders = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...customHeaders
    };

    // Add identity headers if available
    if (context.identity) {
      headers['x-squid-id'] = context.identity.squidId;
      if (context.identity.subId) {
        headers['x-subid'] = context.identity.subId;
      }
    }

    // Add tracing headers
    if (context.correlationId) {
      headers['x-correlation-id'] = context.correlationId;
    }
    if (context.traceId) {
      headers['x-trace-id'] = context.traceId;
    }

    // Add timestamp
    headers['x-ts'] = context.timestamp;

    // Add API version if not specified
    if (!headers['x-api-version']) {
      headers['x-api-version'] = 'v1';
    }

    return headers;
  }

  /**
   * Create HTTP error with Q ecosystem standards
   */
  private createHttpError(statusCode: number, response: QResponse, context: RequestContext): QError {
    const error = new Error(response.message || 'HTTP request failed') as QError;
    error.code = this.mapStatusCodeToErrorCode(statusCode);
    error.statusCode = statusCode;
    error.timestamp = context.timestamp;
    error.requestId = context.requestId;
    error.retryable = this.isRetryableStatusCode(statusCode);
    error.details = response.data;
    
    if (response.code) {
      error.code = response.code as ErrorCodes;
    }

    return error;
  }

  /**
   * Create timeout error
   */
  private createTimeoutError(context: RequestContext): QError {
    const error = new Error('Request timeout') as QError;
    error.code = ErrorCodes.TIMEOUT_ERROR;
    error.statusCode = 408;
    error.timestamp = context.timestamp;
    error.requestId = context.requestId;
    error.retryable = true;
    error.suggestedActions = ['Increase timeout', 'Check network connectivity', 'Retry request'];
    return error;
  }

  /**
   * Map HTTP status codes to Q ecosystem error codes
   */
  private mapStatusCodeToErrorCode(statusCode: number): ErrorCodes {
    switch (statusCode) {
      case 401:
        return ErrorCodes.QLOCK_AUTH_FAIL;
      case 403:
        return ErrorCodes.QONSENT_DENIED;
      case 404:
        return ErrorCodes.QINDEX_NOT_FOUND;
      case 408:
        return ErrorCodes.TIMEOUT_ERROR;
      case 429:
        return ErrorCodes.RATE_LIMIT_EXCEEDED;
      case 503:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return ErrorCodes.SERVICE_UNAVAILABLE;
    }
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatusCode(statusCode: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(statusCode);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client configuration
   */
  getConfig(): Required<HttpClientConfig> {
    return { ...this.config };
  }

  /**
   * Get circuit breaker state if configured
   */
  getCircuitBreakerState() {
    return this.circuitBreaker?.getState();
  }
}

/**
 * Request options interface
 */
export interface RequestOptions {
  headers?: QHeaders;
  timeout?: number;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  identity?: IdentityRef;
}