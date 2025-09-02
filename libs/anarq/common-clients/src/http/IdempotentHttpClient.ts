import { RetryHandler } from '../retry/RetryHandler.js';
import { CircuitBreaker } from '../circuit-breaker/CircuitBreaker.js';
import { IdempotencyManager, IdempotencyRecord } from '../idempotency/IdempotencyManager.js';
import { 
  HttpClientConfig, 
  QHeaders, 
  QResponse, 
  RequestContext, 
  QError, 
  ErrorCodes 
} from '../types/client.js';

/**
 * HTTP request options with idempotency support
 */
export interface IdempotentRequestOptions {
  method: string;
  url: string;
  headers?: QHeaders;
  body?: any;
  timeout?: number;
  idempotencyKey?: string;
  idempotencyTtl?: number;
  skipIdempotency?: boolean;
  context?: RequestContext;
}

/**
 * HTTP client with integrated idempotency, retry, and circuit breaker support
 */
export class IdempotentHttpClient {
  private retryHandler?: RetryHandler;
  private circuitBreaker?: CircuitBreaker;
  private idempotencyManager: IdempotencyManager;
  private readonly config: HttpClientConfig;

  constructor(
    config: HttpClientConfig,
    idempotencyManager?: IdempotencyManager
  ) {
    this.config = config;
    
    if (config.retryPolicy) {
      this.retryHandler = new RetryHandler(config.retryPolicy);
    }
    
    if (config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    }

    this.idempotencyManager = idempotencyManager || new IdempotencyManager();
  }

  /**
   * Make an HTTP request with idempotency, retry, and circuit breaker support
   */
  async request<T = any>(options: IdempotentRequestOptions): Promise<QResponse<T>> {
    const { method, url, headers = {}, body, skipIdempotency = false } = options;
    
    // Merge default headers
    const requestHeaders: QHeaders = {
      ...this.config.defaultHeaders,
      ...headers
    };

    // Add correlation and trace IDs if not present
    if (!requestHeaders['x-correlation-id'] && options.context?.correlationId) {
      requestHeaders['x-correlation-id'] = options.context.correlationId;
    }
    
    if (!requestHeaders['x-trace-id'] && options.context?.traceId) {
      requestHeaders['x-trace-id'] = options.context.traceId;
    }

    // Handle idempotency for write operations
    if (!skipIdempotency && this.isWriteOperation(method)) {
      return this.handleIdempotentRequest<T>(options, requestHeaders);
    }

    // For read operations or when idempotency is skipped, use regular request
    return this.executeRequest<T>(method, url, requestHeaders, body, options.timeout);
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string, 
    headers?: QHeaders, 
    options?: Partial<IdempotentRequestOptions>
  ): Promise<QResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      headers,
      skipIdempotency: true, // GET requests don't need idempotency
      ...options
    });
  }

  /**
   * POST request with idempotency support
   */
  async post<T = any>(
    url: string,
    body?: any,
    headers?: QHeaders,
    options?: Partial<IdempotentRequestOptions>
  ): Promise<QResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      body,
      headers,
      ...options
    });
  }

  /**
   * PUT request with idempotency support
   */
  async put<T = any>(
    url: string,
    body?: any,
    headers?: QHeaders,
    options?: Partial<IdempotentRequestOptions>
  ): Promise<QResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      body,
      headers,
      ...options
    });
  }

  /**
   * PATCH request with idempotency support
   */
  async patch<T = any>(
    url: string,
    body?: any,
    headers?: QHeaders,
    options?: Partial<IdempotentRequestOptions>
  ): Promise<QResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      body,
      headers,
      ...options
    });
  }

  /**
   * DELETE request with idempotency support
   */
  async delete<T = any>(
    url: string,
    headers?: QHeaders,
    options?: Partial<IdempotentRequestOptions>
  ): Promise<QResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      headers,
      ...options
    });
  }

  /**
   * Get idempotency manager statistics
   */
  getIdempotencyStats() {
    return this.idempotencyManager.getStats();
  }

  /**
   * Get retry handler configuration
   */
  getRetryConfig() {
    return this.retryHandler?.getConfig();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker?.getState() || null;
  }

  /**
   * Shutdown client and cleanup resources
   */
  shutdown(): void {
    this.idempotencyManager.shutdown();
  }

  private async handleIdempotentRequest<T>(
    options: IdempotentRequestOptions,
    requestHeaders: QHeaders
  ): Promise<QResponse<T>> {
    const { method, url, body } = options;
    
    // Get or generate idempotency key
    let idempotencyKey = options.idempotencyKey || requestHeaders['Idempotency-Key'];
    if (!idempotencyKey) {
      idempotencyKey = this.idempotencyManager.generateIdempotencyKey();
      requestHeaders['Idempotency-Key'] = idempotencyKey;
    }

    // Create request fingerprint
    const requestFingerprint = this.idempotencyManager.createRequestFingerprint(
      method,
      url,
      requestHeaders,
      body
    );

    // Check for duplicate request
    const { isDuplicate, record } = await this.idempotencyManager.checkDuplicate(
      idempotencyKey,
      requestFingerprint
    );

    if (isDuplicate && record) {
      return this.handleDuplicateRequest<T>(record);
    }

    // Store processing record
    await this.idempotencyManager.storeProcessingRecord(
      idempotencyKey,
      requestFingerprint,
      options.context,
      options.idempotencyTtl
    );

    try {
      // Execute request
      const response = await this.executeRequest<T>(
        method,
        url,
        requestHeaders,
        body,
        options.timeout
      );

      // Store successful response
      await this.idempotencyManager.storeResponse(idempotencyKey, response);
      
      return response;
    } catch (error) {
      // Store failed response
      const errorResponse: QResponse = {
        status: 'error',
        code: (error as QError).code || ErrorCodes.SERVICE_UNAVAILABLE,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      
      await this.idempotencyManager.storeResponse(idempotencyKey, errorResponse);
      throw error;
    }
  }

  private async handleDuplicateRequest<T>(record: IdempotencyRecord): Promise<QResponse<T>> {
    if (record.status === 'PROCESSING') {
      // Request is still being processed, wait and retry
      await this.sleep(100);
      
      const updatedRecord = await this.idempotencyManager.getRecord(record.key);
      if (updatedRecord && updatedRecord.status === 'PROCESSING') {
        // Still processing, return processing status
        const processingResponse: QResponse = {
          status: 'error',
          code: 'REQUEST_PROCESSING',
          message: 'Request is still being processed'
        };
        return processingResponse as QResponse<T>;
      }
      
      // Status changed, return the result
      if (updatedRecord?.response) {
        return updatedRecord.response as QResponse<T>;
      }
    }

    if (record.response) {
      // Return cached response
      return record.response as QResponse<T>;
    }

    // Fallback error
    throw new Error(`Invalid idempotency record state for key: ${record.key}`);
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    headers: QHeaders,
    body?: any,
    timeout?: number
  ): Promise<QResponse<T>> {
    const requestFn = async (): Promise<QResponse<T>> => {
      return this.performHttpRequest<T>(method, url, headers, body, timeout);
    };

    // Apply circuit breaker if configured
    const circuitBreakerFn = this.circuitBreaker 
      ? () => this.circuitBreaker!.execute(requestFn)
      : requestFn;

    // Apply retry policy if configured
    const retryFn = this.retryHandler
      ? () => this.retryHandler!.execute(circuitBreakerFn)
      : circuitBreakerFn;

    return retryFn();
  }

  private async performHttpRequest<T>(
    method: string,
    url: string,
    headers: QHeaders,
    body?: any,
    timeout?: number
  ): Promise<QResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    const requestTimeout = timeout || this.config.timeout || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: headers as Record<string, string>,
        signal: controller.signal
      };

      if (body && method !== 'GET' && method !== 'HEAD') {
        if (typeof body === 'object') {
          fetchOptions.body = JSON.stringify(body);
          if (!headers['Content-Type']) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
          }
        } else {
          fetchOptions.body = body;
        }
      }

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: QResponse<T>;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If response is not JSON, wrap it in standard format
        responseData = {
          status: response.ok ? 'ok' : 'error',
          code: response.ok ? 'SUCCESS' : 'HTTP_ERROR',
          message: response.statusText || 'HTTP request failed',
          data: responseText as T
        };
      }

      if (!response.ok) {
        const error = new Error(responseData.message || 'HTTP request failed') as QError;
        error.code = responseData.code as ErrorCodes || ErrorCodes.SERVICE_UNAVAILABLE;
        error.statusCode = response.status;
        error.timestamp = new Date().toISOString();
        error.retryable = this.isRetryableStatusCode(response.status);
        throw error;
      }

      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout') as QError;
        timeoutError.code = ErrorCodes.TIMEOUT_ERROR;
        timeoutError.statusCode = 408;
        timeoutError.timestamp = new Date().toISOString();
        timeoutError.retryable = true;
        throw timeoutError;
      }

      throw error;
    }
  }

  private isWriteOperation(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private isRetryableStatusCode(statusCode: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(statusCode);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}