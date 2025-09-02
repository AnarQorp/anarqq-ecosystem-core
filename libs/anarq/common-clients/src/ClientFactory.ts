import { IdempotentHttpClient } from './http/IdempotentHttpClient.js';
import { MonitoredRetryHandler } from './retry/MonitoredRetryHandler.js';
import { CircuitBreaker } from './circuit-breaker/CircuitBreaker.js';
import { IdempotencyManager } from './idempotency/IdempotencyManager.js';
import { RetryMonitor } from './monitoring/RetryMonitor.js';
import { RetryPolicyManager } from './retry/RetryPolicyManager.js';
import { 
  HttpClientConfig, 
  RetryPolicy, 
  CircuitBreakerConfig,
  IdentityRef 
} from './types/client.js';

/**
 * Configuration for creating clients with idempotency and retry support
 */
export interface ClientFactoryConfig {
  /** Base URL for HTTP requests */
  baseUrl: string;
  /** Default timeout for requests */
  timeout?: number;
  /** Identity context for requests */
  identity?: IdentityRef;
  /** Module name for metrics and policy selection */
  module?: string;
  /** Operation criticality level */
  criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Whether operations are real-time */
  realTime?: boolean;
  /** Whether operations are user-facing */
  userFacing?: boolean;
  /** Custom retry policy (overrides automatic selection) */
  retryPolicy?: RetryPolicy;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  /** Idempotency configuration */
  idempotency?: {
    defaultTtl?: number;
    maxRecords?: number;
    cleanupInterval?: number;
    includeBodyInFingerprint?: boolean;
    fingerprintHeaders?: string[];
  };
  /** Monitoring configuration */
  monitoring?: {
    maxMetricsAge?: number;
    enabled?: boolean;
  };
}

/**
 * Factory for creating HTTP clients with integrated idempotency, retry, and monitoring
 */
export class ClientFactory {
  private static globalRetryMonitor?: RetryMonitor;
  private static globalIdempotencyManager?: IdempotencyManager;

  /**
   * Create an HTTP client with full idempotency and retry support
   */
  static createHttpClient(config: ClientFactoryConfig): IdempotentHttpClient {
    // Determine retry policy
    const retryPolicy = config.retryPolicy || this.selectRetryPolicy(config);
    
    // Create or reuse monitoring
    const monitor = this.getOrCreateMonitor(config.monitoring);
    
    // Create or reuse idempotency manager
    const idempotencyManager = this.getOrCreateIdempotencyManager(config.idempotency);
    
    // Create HTTP client configuration
    const httpConfig: HttpClientConfig = {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      defaultHeaders: this.createDefaultHeaders(config.identity),
      identity: config.identity,
      retryPolicy,
      circuitBreaker: config.circuitBreaker
    };

    return new IdempotentHttpClient(httpConfig, idempotencyManager);
  }

  /**
   * Create a standalone retry handler with monitoring
   */
  static createRetryHandler(config: {
    retryPolicy?: RetryPolicy;
    module?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    monitoring?: { maxMetricsAge?: number; enabled?: boolean };
  }): MonitoredRetryHandler {
    const retryPolicy = config.retryPolicy || this.selectRetryPolicy(config);
    const monitor = this.getOrCreateMonitor(config.monitoring);
    
    return new MonitoredRetryHandler(retryPolicy, monitor, config.module);
  }

  /**
   * Create a circuit breaker
   */
  static createCircuitBreaker(config?: CircuitBreakerConfig): CircuitBreaker {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringWindow: 60000,
      halfOpenMaxCalls: 3,
      fallbackStrategy: 'REJECT'
    };

    return new CircuitBreaker({ ...defaultConfig, ...config });
  }

  /**
   * Create an idempotency manager
   */
  static createIdempotencyManager(config?: {
    defaultTtl?: number;
    maxRecords?: number;
    cleanupInterval?: number;
    includeBodyInFingerprint?: boolean;
    fingerprintHeaders?: string[];
  }): IdempotencyManager {
    return new IdempotencyManager(config);
  }

  /**
   * Create a retry monitor
   */
  static createRetryMonitor(maxMetricsAge?: number): RetryMonitor {
    return new RetryMonitor(maxMetricsAge);
  }

  /**
   * Get global retry statistics across all clients
   */
  static getGlobalRetryStats() {
    return this.globalRetryMonitor?.getRetryStats();
  }

  /**
   * Get global idempotency statistics across all clients
   */
  static getGlobalIdempotencyStats() {
    return this.globalIdempotencyManager?.getStats();
  }

  /**
   * Get retry policy recommendations for given context
   */
  static getRetryPolicyRecommendations(context: {
    module?: string;
    operation?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    realTime?: boolean;
    userFacing?: boolean;
  }) {
    return RetryPolicyManager.getRecommendations(context);
  }

  /**
   * Create a client optimized for a specific Q module
   */
  static createModuleClient(
    module: string,
    baseUrl: string,
    options?: Partial<ClientFactoryConfig>
  ): IdempotentHttpClient {
    const config: ClientFactoryConfig = {
      baseUrl,
      module,
      retryPolicy: RetryPolicyManager.forModule(module),
      circuitBreaker: this.getDefaultCircuitBreakerConfig(module),
      ...options
    };

    return this.createHttpClient(config);
  }

  /**
   * Shutdown all global resources
   */
  static shutdown(): void {
    this.globalRetryMonitor?.shutdown();
    this.globalIdempotencyManager?.shutdown();
    this.globalRetryMonitor = undefined;
    this.globalIdempotencyManager = undefined;
  }

  private static selectRetryPolicy(config: {
    retryPolicy?: RetryPolicy;
    module?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    realTime?: boolean;
  }): RetryPolicy {
    if (config.retryPolicy) {
      return config.retryPolicy;
    }

    if (config.criticality) {
      return RetryPolicyManager.forCriticality(config.criticality);
    }

    if (config.module) {
      return RetryPolicyManager.forModule(config.module);
    }

    if (config.realTime) {
      return RetryPolicyManager.FAST;
    }

    return RetryPolicyManager.STANDARD;
  }

  private static getOrCreateMonitor(config?: {
    maxMetricsAge?: number;
    enabled?: boolean;
  }): RetryMonitor {
    if (config?.enabled === false) {
      return new RetryMonitor(config.maxMetricsAge);
    }

    if (!this.globalRetryMonitor) {
      this.globalRetryMonitor = new RetryMonitor(config?.maxMetricsAge);
    }

    return this.globalRetryMonitor;
  }

  private static getOrCreateIdempotencyManager(config?: {
    defaultTtl?: number;
    maxRecords?: number;
    cleanupInterval?: number;
    includeBodyInFingerprint?: boolean;
    fingerprintHeaders?: string[];
  }): IdempotencyManager {
    if (!this.globalIdempotencyManager) {
      this.globalIdempotencyManager = new IdempotencyManager(config);
    }

    return this.globalIdempotencyManager;
  }

  private static createDefaultHeaders(identity?: IdentityRef): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-version': '1.0'
    };

    if (identity) {
      if (identity.squidId) {
        headers['x-squid-id'] = identity.squidId;
      }
      if (identity.subId) {
        headers['x-subid'] = identity.subId;
      }
      if (identity.daoId) {
        headers['x-dao-id'] = identity.daoId;
      }
    }

    return headers;
  }

  private static getDefaultCircuitBreakerConfig(module: string): CircuitBreakerConfig {
    // Different modules may need different circuit breaker settings
    switch (module.toLowerCase()) {
      case 'qlock':
      case 'qwallet':
      case 'qerberos':
        // Critical modules need more conservative circuit breaker
        return {
          failureThreshold: 3,
          recoveryTimeout: 60000, // 1 minute
          monitoringWindow: 120000, // 2 minutes
          halfOpenMaxCalls: 2,
          fallbackStrategy: 'REJECT'
        };
      
      case 'qdrive':
      case 'qpic':
      case 'qindex':
        // Storage modules can be more tolerant
        return {
          failureThreshold: 10,
          recoveryTimeout: 30000, // 30 seconds
          monitoringWindow: 60000, // 1 minute
          halfOpenMaxCalls: 5,
          fallbackStrategy: 'CACHE'
        };
      
      default:
        return {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          monitoringWindow: 60000,
          halfOpenMaxCalls: 3,
          fallbackStrategy: 'REJECT'
        };
    }
  }
}