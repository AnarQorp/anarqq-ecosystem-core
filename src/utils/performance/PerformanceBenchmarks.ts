/**
 * Performance Benchmarks Configuration
 * Defines performance expectations and thresholds for different
 * wallet operations and identity management tasks
 */

import { PerformanceBenchmark } from './PerformanceMonitor';

export const WALLET_PERFORMANCE_BENCHMARKS: Record<string, PerformanceBenchmark> = {
  // Identity Operations
  identity_switch: {
    name: 'identity_switch',
    category: 'IDENTITY_SWITCH',
    expectedDuration: 300,
    warningThreshold: 800,
    criticalThreshold: 1500,
    description: 'Time to switch between sQuid identities with context loading'
  },
  
  identity_preload: {
    name: 'identity_preload',
    category: 'IDENTITY_SWITCH',
    expectedDuration: 200,
    warningThreshold: 500,
    criticalThreshold: 1000,
    description: 'Time to preload identity data for faster switching'
  },

  // Wallet Operations
  wallet_balance_load: {
    name: 'wallet_balance_load',
    category: 'WALLET_OPERATION',
    expectedDuration: 250,
    warningThreshold: 750,
    criticalThreshold: 2000,
    description: 'Time to load wallet balances for active identity'
  },

  wallet_permissions_load: {
    name: 'wallet_permissions_load',
    category: 'WALLET_OPERATION',
    expectedDuration: 150,
    warningThreshold: 400,
    criticalThreshold: 800,
    description: 'Time to load wallet permissions for identity'
  },

  token_transfer: {
    name: 'token_transfer',
    category: 'WALLET_OPERATION',
    expectedDuration: 1500,
    warningThreshold: 4000,
    criticalThreshold: 8000,
    description: 'Time to complete token transfer including validation and signing'
  },

  transfer_validation: {
    name: 'transfer_validation',
    category: 'WALLET_OPERATION',
    expectedDuration: 100,
    warningThreshold: 300,
    criticalThreshold: 600,
    description: 'Time to validate transfer parameters and permissions'
  },

  risk_assessment: {
    name: 'risk_assessment',
    category: 'WALLET_OPERATION',
    expectedDuration: 200,
    warningThreshold: 500,
    criticalThreshold: 1000,
    description: 'Time to assess risk for wallet operation'
  },

  // Pi Wallet Operations
  pi_wallet_connect: {
    name: 'pi_wallet_connect',
    category: 'WALLET_OPERATION',
    expectedDuration: 1000,
    warningThreshold: 2500,
    criticalThreshold: 5000,
    description: 'Time to establish connection with Pi Wallet'
  },

  pi_wallet_transfer: {
    name: 'pi_wallet_transfer',
    category: 'WALLET_OPERATION',
    expectedDuration: 2000,
    warningThreshold: 5000,
    criticalThreshold: 10000,
    description: 'Time to complete Pi Wallet transfer operation'
  },

  pi_wallet_status: {
    name: 'pi_wallet_status',
    category: 'WALLET_OPERATION',
    expectedDuration: 300,
    warningThreshold: 800,
    criticalThreshold: 1500,
    description: 'Time to check Pi Wallet connection status'
  },

  // Component Rendering
  wallet_dashboard_render: {
    name: 'wallet_dashboard_render',
    category: 'COMPONENT_RENDER',
    expectedDuration: 50,
    warningThreshold: 100,
    criticalThreshold: 200,
    description: 'Time to render wallet dashboard component'
  },

  transfer_form_render: {
    name: 'transfer_form_render',
    category: 'COMPONENT_RENDER',
    expectedDuration: 30,
    warningThreshold: 80,
    criticalThreshold: 150,
    description: 'Time to render token transfer form'
  },

  transaction_history_render: {
    name: 'transaction_history_render',
    category: 'COMPONENT_RENDER',
    expectedDuration: 40,
    warningThreshold: 100,
    criticalThreshold: 200,
    description: 'Time to render transaction history component'
  },

  // API Calls
  qwallet_api_call: {
    name: 'qwallet_api_call',
    category: 'API_CALL',
    expectedDuration: 400,
    warningThreshold: 1200,
    criticalThreshold: 3000,
    description: 'Time for Qwallet service API calls'
  },

  qonsent_permission_check: {
    name: 'qonsent_permission_check',
    category: 'API_CALL',
    expectedDuration: 200,
    warningThreshold: 600,
    criticalThreshold: 1200,
    description: 'Time to check permissions via Qonsent'
  },

  qlock_signing: {
    name: 'qlock_signing',
    category: 'API_CALL',
    expectedDuration: 500,
    warningThreshold: 1500,
    criticalThreshold: 3000,
    description: 'Time to sign transaction via Qlock'
  },

  qerberos_audit_log: {
    name: 'qerberos_audit_log',
    category: 'API_CALL',
    expectedDuration: 150,
    warningThreshold: 400,
    criticalThreshold: 800,
    description: 'Time to log audit event to Qerberos'
  },

  // Cache Operations
  cache_read: {
    name: 'cache_read',
    category: 'CACHE_OPERATION',
    expectedDuration: 5,
    warningThreshold: 20,
    criticalThreshold: 50,
    description: 'Time to read data from wallet cache'
  },

  cache_write: {
    name: 'cache_write',
    category: 'CACHE_OPERATION',
    expectedDuration: 10,
    warningThreshold: 30,
    criticalThreshold: 80,
    description: 'Time to write data to wallet cache'
  },

  cache_invalidation: {
    name: 'cache_invalidation',
    category: 'CACHE_OPERATION',
    expectedDuration: 15,
    warningThreshold: 50,
    criticalThreshold: 100,
    description: 'Time to invalidate cache entries'
  },

  cache_optimization: {
    name: 'cache_optimization',
    category: 'CACHE_OPERATION',
    expectedDuration: 100,
    warningThreshold: 300,
    criticalThreshold: 600,
    description: 'Time to optimize cache performance'
  }
};

/**
 * Performance thresholds for different identity types
 * Some identity types may have different performance expectations
 */
export const IDENTITY_TYPE_MODIFIERS: Record<string, number> = {
  ROOT: 1.0,      // No modification - full performance expected
  DAO: 1.2,       // 20% slower due to governance checks
  ENTERPRISE: 1.1, // 10% slower due to business rules
  CONSENTIDA: 1.3, // 30% slower due to parental controls
  AID: 0.9        // 10% faster due to simplified operations
};

/**
 * Critical performance patterns that require immediate attention
 */
export const CRITICAL_PATTERNS = {
  RAPID_DEGRADATION: {
    description: 'Performance degrading rapidly over time',
    threshold: 0.5, // 50% increase in average duration
    timeWindow: 5 * 60 * 1000 // 5 minutes
  },
  
  HIGH_ERROR_RATE: {
    description: 'Unusually high error rate',
    threshold: 0.2, // 20% error rate
    timeWindow: 2 * 60 * 1000 // 2 minutes
  },
  
  CACHE_THRASHING: {
    description: 'Cache hit rate dropping significantly',
    threshold: 0.3, // Below 30% hit rate
    timeWindow: 1 * 60 * 1000 // 1 minute
  },
  
  IDENTITY_SWITCH_STORM: {
    description: 'Too many identity switches in short time',
    threshold: 10, // More than 10 switches
    timeWindow: 1 * 60 * 1000 // 1 minute
  },
  
  MEMORY_PRESSURE: {
    description: 'Cache size growing too quickly',
    threshold: 100 * 1024 * 1024, // 100MB
    timeWindow: 5 * 60 * 1000 // 5 minutes
  }
};

/**
 * Performance optimization recommendations based on metrics
 */
export const OPTIMIZATION_RECOMMENDATIONS = {
  SLOW_IDENTITY_SWITCH: [
    'Enable identity data preloading',
    'Increase cache TTL for frequently accessed identities',
    'Implement background data synchronization',
    'Consider reducing the amount of data loaded on switch'
  ],
  
  HIGH_API_LATENCY: [
    'Implement request caching for repeated calls',
    'Add request batching for multiple operations',
    'Consider using WebSocket connections for real-time data',
    'Implement circuit breaker pattern for failing services'
  ],
  
  LOW_CACHE_HIT_RATE: [
    'Increase cache size limits',
    'Adjust cache TTL based on data access patterns',
    'Implement smarter cache eviction strategies',
    'Add cache warming for frequently accessed data'
  ],
  
  HIGH_ERROR_RATE: [
    'Implement better error handling and retry logic',
    'Add input validation to prevent invalid operations',
    'Monitor external service health and implement fallbacks',
    'Review and fix common error scenarios'
  ],
  
  SLOW_RENDERING: [
    'Implement component memoization',
    'Use virtual scrolling for large lists',
    'Lazy load non-critical components',
    'Optimize re-render triggers and dependencies'
  ],
  
  MEMORY_ISSUES: [
    'Implement more aggressive cache eviction',
    'Add memory usage monitoring and alerts',
    'Review for memory leaks in event listeners',
    'Consider using WeakMap for temporary references'
  ]
};

/**
 * Get benchmark for operation with identity type modifier
 */
export function getBenchmarkForIdentity(
  operationName: string, 
  identityType: string
): PerformanceBenchmark | null {
  const baseBenchmark = WALLET_PERFORMANCE_BENCHMARKS[operationName];
  if (!baseBenchmark) return null;

  const modifier = IDENTITY_TYPE_MODIFIERS[identityType] || 1.0;

  return {
    ...baseBenchmark,
    expectedDuration: baseBenchmark.expectedDuration * modifier,
    warningThreshold: baseBenchmark.warningThreshold * modifier,
    criticalThreshold: baseBenchmark.criticalThreshold * modifier
  };
}

/**
 * Check if performance pattern is critical
 */
export function checkCriticalPattern(
  patternName: keyof typeof CRITICAL_PATTERNS,
  currentValue: number,
  timeWindow: number
): boolean {
  const pattern = CRITICAL_PATTERNS[patternName];
  return currentValue > pattern.threshold && timeWindow <= pattern.timeWindow;
}

/**
 * Get recommendations for performance issue
 */
export function getRecommendations(issueType: keyof typeof OPTIMIZATION_RECOMMENDATIONS): string[] {
  return OPTIMIZATION_RECOMMENDATIONS[issueType] || [];
}