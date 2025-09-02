import { RetryPolicy, ErrorCodes } from '../types/client.js';

/**
 * Predefined retry policies for different scenarios
 */
export class RetryPolicyManager {
  /**
   * Conservative retry policy for critical operations
   */
  static readonly CONSERVATIVE: RetryPolicy = {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.TIMEOUT_ERROR,
      ErrorCodes.IPFS_UNAVAILABLE
    ],
    retryableStatusCodes: [503, 504]
  };

  /**
   * Standard retry policy for most operations
   */
  static readonly STANDARD: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.TIMEOUT_ERROR,
      ErrorCodes.IPFS_UNAVAILABLE,
      ErrorCodes.RATE_LIMIT_EXCEEDED
    ],
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  };

  /**
   * Aggressive retry policy for non-critical operations
   */
  static readonly AGGRESSIVE: RetryPolicy = {
    maxAttempts: 5,
    baseDelay: 50,
    maxDelay: 60000,
    backoffMultiplier: 2.5,
    jitter: true,
    retryableErrors: [
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.TIMEOUT_ERROR,
      ErrorCodes.IPFS_UNAVAILABLE,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      ErrorCodes.CIRCUIT_BREAKER_OPEN
    ],
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  };

  /**
   * Fast retry policy for real-time operations
   */
  static readonly FAST: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 25,
    maxDelay: 1000,
    backoffMultiplier: 1.5,
    jitter: true,
    retryableErrors: [
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.TIMEOUT_ERROR
    ],
    retryableStatusCodes: [503, 504]
  };

  /**
   * No retry policy - fail fast
   */
  static readonly NO_RETRY: RetryPolicy = {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false,
    retryableErrors: [],
    retryableStatusCodes: []
  };

  /**
   * Create a custom retry policy with validation
   */
  static createCustom(config: Partial<RetryPolicy>): RetryPolicy {
    const policy: RetryPolicy = {
      ...RetryPolicyManager.STANDARD,
      ...config
    };

    // Validate configuration
    if (policy.maxAttempts < 1) {
      throw new Error('maxAttempts must be at least 1');
    }

    if (policy.baseDelay < 0) {
      throw new Error('baseDelay must be non-negative');
    }

    if (policy.maxDelay < policy.baseDelay) {
      throw new Error('maxDelay must be greater than or equal to baseDelay');
    }

    if (policy.backoffMultiplier <= 0) {
      throw new Error('backoffMultiplier must be positive');
    }

    return policy;
  }

  /**
   * Get retry policy by name
   */
  static getPolicy(name: string): RetryPolicy {
    switch (name.toUpperCase()) {
      case 'CONSERVATIVE':
        return RetryPolicyManager.CONSERVATIVE;
      case 'STANDARD':
        return RetryPolicyManager.STANDARD;
      case 'AGGRESSIVE':
        return RetryPolicyManager.AGGRESSIVE;
      case 'FAST':
        return RetryPolicyManager.FAST;
      case 'NO_RETRY':
        return RetryPolicyManager.NO_RETRY;
      default:
        throw new Error(`Unknown retry policy: ${name}`);
    }
  }

  /**
   * Create retry policy for specific module
   */
  static forModule(moduleName: string): RetryPolicy {
    switch (moduleName.toLowerCase()) {
      case 'squid':
        // Identity operations need to be fast and reliable
        return RetryPolicyManager.FAST;
      
      case 'qlock':
        // Cryptographic operations should be conservative
        return RetryPolicyManager.CONSERVATIVE;
      
      case 'qonsent':
        // Permission checks need to be fast
        return RetryPolicyManager.FAST;
      
      case 'qindex':
        // Indexing can be more aggressive
        return RetryPolicyManager.AGGRESSIVE;
      
      case 'qerberos':
        // Security operations should be conservative
        return RetryPolicyManager.CONSERVATIVE;
      
      case 'qmask':
        // Privacy operations should be conservative
        return RetryPolicyManager.CONSERVATIVE;
      
      case 'qwallet':
        // Payment operations must be conservative
        return RetryPolicyManager.CONSERVATIVE;
      
      case 'qdrive':
      case 'qpic':
        // File operations can be more aggressive
        return RetryPolicyManager.AGGRESSIVE;
      
      case 'qmarket':
      case 'qmail':
      case 'qchat':
        // Business operations use standard policy
        return RetryPolicyManager.STANDARD;
      
      case 'qnet':
        // Network operations can be aggressive
        return RetryPolicyManager.AGGRESSIVE;
      
      case 'dao':
        // Governance operations should be conservative
        return RetryPolicyManager.CONSERVATIVE;
      
      default:
        return RetryPolicyManager.STANDARD;
    }
  }

  /**
   * Create retry policy based on operation criticality
   */
  static forCriticality(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): RetryPolicy {
    switch (level) {
      case 'LOW':
        return RetryPolicyManager.AGGRESSIVE;
      case 'MEDIUM':
        return RetryPolicyManager.STANDARD;
      case 'HIGH':
        return RetryPolicyManager.CONSERVATIVE;
      case 'CRITICAL':
        return RetryPolicyManager.NO_RETRY;
      default:
        return RetryPolicyManager.STANDARD;
    }
  }

  /**
   * Merge multiple retry policies (takes the most conservative values)
   */
  static merge(...policies: RetryPolicy[]): RetryPolicy {
    if (policies.length === 0) {
      return RetryPolicyManager.STANDARD;
    }

    if (policies.length === 1) {
      return policies[0];
    }

    const merged: RetryPolicy = {
      maxAttempts: Math.min(...policies.map(p => p.maxAttempts)),
      baseDelay: Math.max(...policies.map(p => p.baseDelay)),
      maxDelay: Math.min(...policies.map(p => p.maxDelay)),
      backoffMultiplier: Math.min(...policies.map(p => p.backoffMultiplier)),
      jitter: policies.some(p => p.jitter),
      retryableErrors: Array.from(new Set(policies.flatMap(p => p.retryableErrors))),
      retryableStatusCodes: Array.from(new Set(policies.flatMap(p => p.retryableStatusCodes)))
    };

    return merged;
  }

  /**
   * Calculate total maximum delay for a retry policy
   */
  static calculateMaxTotalDelay(policy: RetryPolicy): number {
    let totalDelay = 0;
    let currentDelay = policy.baseDelay;

    for (let attempt = 1; attempt < policy.maxAttempts; attempt++) {
      totalDelay += Math.min(currentDelay, policy.maxDelay);
      currentDelay *= policy.backoffMultiplier;
    }

    return totalDelay;
  }

  /**
   * Get retry policy recommendations based on context
   */
  static getRecommendations(context: {
    module?: string;
    operation?: string;
    criticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    realTime?: boolean;
    userFacing?: boolean;
  }): {
    recommended: RetryPolicy;
    alternatives: { name: string; policy: RetryPolicy; reason: string }[];
  } {
    let recommended: RetryPolicy;
    const alternatives: { name: string; policy: RetryPolicy; reason: string }[] = [];

    // Determine primary recommendation
    if (context.criticality) {
      recommended = RetryPolicyManager.forCriticality(context.criticality);
    } else if (context.module) {
      recommended = RetryPolicyManager.forModule(context.module);
    } else if (context.realTime) {
      recommended = RetryPolicyManager.FAST;
    } else {
      recommended = RetryPolicyManager.STANDARD;
    }

    // Add alternatives based on context
    if (context.realTime) {
      alternatives.push({
        name: 'FAST',
        policy: RetryPolicyManager.FAST,
        reason: 'Optimized for real-time operations'
      });
    }

    if (context.userFacing) {
      alternatives.push({
        name: 'CONSERVATIVE',
        policy: RetryPolicyManager.CONSERVATIVE,
        reason: 'Reduces user wait time'
      });
    }

    if (!context.criticality || context.criticality === 'LOW') {
      alternatives.push({
        name: 'AGGRESSIVE',
        policy: RetryPolicyManager.AGGRESSIVE,
        reason: 'Maximizes success rate for non-critical operations'
      });
    }

    // Always add some basic alternatives if none were added
    if (alternatives.length === 0) {
      if (recommended !== RetryPolicyManager.STANDARD) {
        alternatives.push({
          name: 'STANDARD',
          policy: RetryPolicyManager.STANDARD,
          reason: 'Balanced approach for most scenarios'
        });
      }
      
      if (recommended !== RetryPolicyManager.CONSERVATIVE) {
        alternatives.push({
          name: 'CONSERVATIVE',
          policy: RetryPolicyManager.CONSERVATIVE,
          reason: 'Minimal retries for critical operations'
        });
      }
    }

    return { recommended, alternatives };
  }
}