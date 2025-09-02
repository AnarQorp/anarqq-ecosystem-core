import { IdentityRef } from '@anarq/common-schemas';

/**
 * Standard Q ecosystem response format
 */
export interface QResponse<T = any> {
  status: 'ok' | 'error';
  code: string;
  message: string;
  data?: T;
  cid?: string;
}

/**
 * Standard Q ecosystem headers
 */
export interface QHeaders {
  'x-squid-id'?: string;
  'x-subid'?: string;
  'x-qonsent'?: string;
  'x-sig'?: string;
  'x-ts'?: string;
  'x-api-version'?: string;
  'x-correlation-id'?: string;
  'x-trace-id'?: string;
  'Content-Type'?: string;
  'Authorization'?: string;
  'Idempotency-Key'?: string;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
  defaultHeaders?: QHeaders;
  identity?: IdentityRef;
  retryPolicy?: RetryPolicy;
  circuitBreaker?: CircuitBreakerConfig;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
  fallbackStrategy: 'CACHE' | 'MOCK' | 'QUEUE' | 'REJECT';
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * MCP tool configuration
 */
export interface McpToolConfig {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
}

/**
 * MCP client configuration
 */
export interface McpClientConfig {
  tools: McpToolConfig[];
  identity?: IdentityRef;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Request context for tracing and correlation
 */
export interface RequestContext {
  requestId: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  identity?: IdentityRef;
  timestamp: string;
}

/**
 * Error types for standardized error handling
 */
export enum ErrorCodes {
  // Authentication & Authorization
  QLOCK_AUTH_FAIL = 'QLOCK_AUTH_FAIL',
  QONSENT_DENIED = 'QONSENT_DENIED',
  SQUID_IDENTITY_INVALID = 'SQUID_IDENTITY_INVALID',
  
  // Data & Storage
  QINDEX_NOT_FOUND = 'QINDEX_NOT_FOUND',
  QDRIVE_STORAGE_FULL = 'QDRIVE_STORAGE_FULL',
  IPFS_UNAVAILABLE = 'IPFS_UNAVAILABLE',
  
  // Security & Privacy
  QERB_SUSPECT = 'QERB_SUSPECT',
  QMASK_POLICY_VIOLATION = 'QMASK_POLICY_VIOLATION',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  
  // Network & Services
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  
  // Business Logic
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  VERSION_CONFLICT = 'VERSION_CONFLICT'
}

/**
 * Standardized error response
 */
export interface QError extends Error {
  code: ErrorCodes;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
  suggestedActions?: string[];
}