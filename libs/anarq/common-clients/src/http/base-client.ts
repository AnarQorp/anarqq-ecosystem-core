/**
 * HTTP Client Configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP Response
 */
export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

/**
 * Base HTTP Client - Simple HTTP client for module communication
 */
export class BaseHttpClient {
  constructor(private config: HttpClientConfig) {}

  /**
   * Performs a GET request
   */
  async get<T = any>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Performs a POST request
   */
  async post<T = any>(
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * Performs a PUT request
   */
  async put<T = any>(
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * Performs a DELETE request
   */
  async delete<T = any>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Performs a generic HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<HttpResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const timeout = options?.timeout || this.config.timeout || 30000;
    
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...options?.headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text() as any;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }
}