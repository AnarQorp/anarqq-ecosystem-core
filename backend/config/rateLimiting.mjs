/**
 * Rate Limiting Configuration
 * 
 * Centralized configuration for rate limiting and anti-abuse protection
 */

export const rateLimitingConfig = {
  // Base rate limits (requests per time window in milliseconds)
  baseLimits: {
    identity: { 
      requests: parseInt(process.env.RATE_LIMIT_IDENTITY_REQUESTS) || 1000, 
      window: parseInt(process.env.RATE_LIMIT_IDENTITY_WINDOW) || 3600000 // 1 hour
    },
    subidentity: { 
      requests: parseInt(process.env.RATE_LIMIT_SUBIDENTITY_REQUESTS) || 100, 
      window: parseInt(process.env.RATE_LIMIT_SUBIDENTITY_WINDOW) || 3600000 // 1 hour
    },
    dao: { 
      requests: parseInt(process.env.RATE_LIMIT_DAO_REQUESTS) || 5000, 
      window: parseInt(process.env.RATE_LIMIT_DAO_WINDOW) || 3600000 // 1 hour
    },
    anonymous: { 
      requests: parseInt(process.env.RATE_LIMIT_ANONYMOUS_REQUESTS) || 10, 
      window: parseInt(process.env.RATE_LIMIT_ANONYMOUS_WINDOW) || 3600000 // 1 hour
    }
  },
  
  // Reputation-based multipliers
  reputationMultipliers: {
    excellent: parseFloat(process.env.RATE_LIMIT_EXCELLENT_MULTIPLIER) || 2.0,   // 100+ reputation
    good: parseFloat(process.env.RATE_LIMIT_GOOD_MULTIPLIER) || 1.5,             // 50-99 reputation
    neutral: parseFloat(process.env.RATE_LIMIT_NEUTRAL_MULTIPLIER) || 1.0,       // 0-49 reputation
    poor: parseFloat(process.env.RATE_LIMIT_POOR_MULTIPLIER) || 0.5,             // -50 to -1 reputation
    blocked: parseFloat(process.env.RATE_LIMIT_BLOCKED_MULTIPLIER) || 0.0        // < -50 reputation
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) || 5,
    recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT) || 30000, // 30 seconds
    monitoringWindow: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_WINDOW) || 60000, // 1 minute
    halfOpenMaxCalls: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS) || 3
  },
  
  // Cost control settings for serverless deployments
  costControl: {
    maxInvocationsPerMinute: parseInt(process.env.COST_CONTROL_MAX_INVOCATIONS_PER_MINUTE) || 1000,
    maxInvocationsPerHour: parseInt(process.env.COST_CONTROL_MAX_INVOCATIONS_PER_HOUR) || 50000,
    budgetAlertThreshold: parseFloat(process.env.COST_CONTROL_BUDGET_ALERT_THRESHOLD) || 0.8,
    emergencyStopThreshold: parseFloat(process.env.COST_CONTROL_EMERGENCY_STOP_THRESHOLD) || 0.95
  },
  
  // Abuse detection patterns
  abusePatterns: {
    rapidFireThreshold: parseInt(process.env.ABUSE_RAPID_FIRE_THRESHOLD) || 100, // requests per minute
    patternSimilarityThreshold: parseFloat(process.env.ABUSE_PATTERN_SIMILARITY_THRESHOLD) || 0.8,
    suspiciousUserAgents: (process.env.ABUSE_SUSPICIOUS_USER_AGENTS || 'bot,crawler,scraper,spider').split(','),
    maxFailureRate: parseFloat(process.env.ABUSE_MAX_FAILURE_RATE) || 0.5
  },
  
  // Redis configuration for distributed rate limiting (if available)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'rl:'
  }
};

// Endpoint-specific configurations
export const endpointConfigs = {
  // Authentication endpoints - more restrictive
  'POST /auth/login': {
    strictMode: true,
    customLimits: {
      identity: { requests: 10, window: 900000 }, // 10 per 15 minutes
      anonymous: { requests: 3, window: 900000 }  // 3 per 15 minutes
    }
  },
  
  'POST /auth/register': {
    strictMode: true,
    customLimits: {
      anonymous: { requests: 1, window: 3600000 } // 1 per hour
    }
  },
  
  // Payment endpoints - very restrictive
  'POST /qwallet/pay': {
    strictMode: true,
    customLimits: {
      identity: { requests: 100, window: 3600000 }, // 100 per hour
      subidentity: { requests: 10, window: 3600000 } // 10 per hour
    }
  },
  
  'POST /qwallet/sign': {
    strictMode: true,
    customLimits: {
      identity: { requests: 200, window: 3600000 } // 200 per hour
    }
  },
  
  // File upload endpoints - moderate restrictions
  'POST /qdrive/upload': {
    customLimits: {
      identity: { requests: 500, window: 3600000 }, // 500 per hour
      anonymous: { requests: 5, window: 3600000 }   // 5 per hour
    }
  },
  
  // Messaging endpoints - moderate restrictions
  'POST /qmail/send': {
    customLimits: {
      identity: { requests: 200, window: 3600000 }, // 200 per hour
      subidentity: { requests: 50, window: 3600000 } // 50 per hour
    }
  },
  
  // Search and read endpoints - more permissive
  'GET /qindex/search': {
    customLimits: {
      identity: { requests: 2000, window: 3600000 }, // 2000 per hour
      anonymous: { requests: 50, window: 3600000 }   // 50 per hour
    }
  }
};

// Environment-specific overrides
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...rateLimitingConfig,
        // Production settings - more restrictive
        baseLimits: {
          ...rateLimitingConfig.baseLimits,
          anonymous: { requests: 5, window: 3600000 } // Very restrictive for anonymous users
        }
      };
      
    case 'staging':
      return {
        ...rateLimitingConfig,
        // Staging settings - moderate restrictions
        baseLimits: {
          ...rateLimitingConfig.baseLimits,
          identity: { requests: 500, window: 3600000 }
        }
      };
      
    case 'development':
      return {
        ...rateLimitingConfig,
        // Development settings - more permissive
        baseLimits: {
          identity: { requests: 10000, window: 3600000 },
          subidentity: { requests: 1000, window: 3600000 },
          dao: { requests: 50000, window: 3600000 },
          anonymous: { requests: 100, window: 3600000 }
        },
        abusePatterns: {
          ...rateLimitingConfig.abusePatterns,
          rapidFireThreshold: 1000 // More lenient in development
        }
      };
      
    case 'test':
      return {
        ...rateLimitingConfig,
        // Test settings - very permissive
        baseLimits: {
          identity: { requests: 100000, window: 3600000 },
          subidentity: { requests: 100000, window: 3600000 },
          dao: { requests: 100000, window: 3600000 },
          anonymous: { requests: 100000, window: 3600000 }
        },
        circuitBreaker: {
          ...rateLimitingConfig.circuitBreaker,
          failureThreshold: 100 // Higher threshold for tests
        }
      };
      
    default:
      return rateLimitingConfig;
  }
}

// Qerberos integration configuration
export const qerberosIntegration = {
  enabled: process.env.QERBEROS_INTEGRATION_ENABLED !== 'false',
  endpoint: process.env.QERBEROS_ENDPOINT || 'http://localhost:3001',
  apiKey: process.env.QERBEROS_API_KEY,
  timeout: parseInt(process.env.QERBEROS_TIMEOUT) || 5000,
  
  // Event types to send to Qerberos
  eventTypes: {
    SUSPICIOUS_ACTIVITY: true,
    RATE_LIMIT_EXCEEDED: true,
    CIRCUIT_BREAKER_OPEN: true,
    COST_LIMIT_EXCEEDED: true,
    ABUSE_DETECTED: true
  },
  
  // Risk score thresholds for Qerberos alerts
  riskThresholds: {
    LOW: 0.3,
    MEDIUM: 0.5,
    HIGH: 0.7,
    CRITICAL: 0.9
  }
};

export default {
  rateLimitingConfig,
  endpointConfigs,
  getEnvironmentConfig,
  qerberosIntegration
};