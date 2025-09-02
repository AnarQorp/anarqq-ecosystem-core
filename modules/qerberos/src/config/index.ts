/**
 * Qerberos Configuration
 * Centralized configuration management for the Qerberos service
 */

import { z } from 'zod';

// Configuration schema
const configSchema = z.object({
  // Server configuration
  port: z.number().min(1).max(65535).default(3000),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  version: z.string().default('1.0.0'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // IPFS configuration
  ipfs: z.object({
    apiUrl: z.string().url().default('http://localhost:5001'),
    gatewayUrl: z.string().url().default('http://localhost:8080'),
    timeout: z.number().default(30000),
    retries: z.number().default(3)
  }),

  // Event bus configuration
  eventBus: z.object({
    type: z.enum(['redis', 'memory']).default('memory'),
    url: z.string().optional(),
    retries: z.number().default(3),
    timeout: z.number().default(5000)
  }),

  // External service URLs (for integrated mode)
  services: z.object({
    squid: z.string().url().optional(),
    qonsent: z.string().url().optional(),
    qlock: z.string().url().optional(),
    qindex: z.string().url().optional()
  }),

  // Mock configuration (for standalone/hybrid mode)
  mocks: z.object({
    squid: z.boolean().default(true),
    qonsent: z.boolean().default(true),
    qlock: z.boolean().default(true),
    qindex: z.boolean().default(true)
  }),

  // ML/Analytics configuration
  ml: z.object({
    anomalyThreshold: z.number().min(0).max(1).default(0.8),
    riskScoreCacheTtl: z.number().default(300), // 5 minutes
    modelUpdateInterval: z.number().default(86400), // 24 hours
    batchSize: z.number().default(100)
  }),

  // Security configuration
  security: z.object({
    signatureAlgorithm: z.enum(['Ed25519', 'RSA-PSS-SHA256']).default('Ed25519'),
    encryptionAlgorithm: z.enum(['AES-256-GCM', 'ChaCha20-Poly1305']).default('AES-256-GCM'),
    keyRotationInterval: z.number().default(2592000), // 30 days
    sessionTimeout: z.number().default(3600), // 1 hour
    maxConcurrentSessions: z.number().default(5)
  }),

  // Rate limiting configuration
  rateLimit: z.object({
    windowMs: z.number().default(3600000), // 1 hour
    maxRequests: z.number().default(1000),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false)
  }),

  // Compliance configuration
  compliance: z.object({
    gdprEnabled: z.boolean().default(true),
    soc2Enabled: z.boolean().default(true),
    auditRetentionYears: z.number().default(7),
    alertRetentionDays: z.number().default(90),
    reportGenerationInterval: z.number().default(86400) // 24 hours
  }),

  // Storage configuration
  storage: z.object({
    retentionPolicies: z.object({
      auditEvents: z.string().default('P7Y'), // 7 years
      securityAlerts: z.string().default('P5Y'), // 5 years
      riskAssessments: z.string().default('P2Y'), // 2 years
      complianceReports: z.string().default('P10Y'), // 10 years
      anomalyResults: z.string().default('P1Y') // 1 year
    }),
    replicationFactor: z.number().default(3),
    geoDistribution: z.array(z.string()).default(['us-east-1', 'eu-west-1', 'ap-southeast-1'])
  }),

  // CORS configuration
  cors: z.object({
    origins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:8080']),
    credentials: z.boolean().default(true)
  }),

  // Health check configuration
  health: z.object({
    checkInterval: z.number().default(30000), // 30 seconds
    timeout: z.number().default(5000), // 5 seconds
    retries: z.number().default(3)
  })
});

// Load configuration from environment variables
function loadConfig() {
  const rawConfig = {
    // Server
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.VERSION || '1.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',

    // IPFS
    ipfs: {
      apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
      gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
      timeout: parseInt(process.env.IPFS_TIMEOUT || '30000'),
      retries: parseInt(process.env.IPFS_RETRIES || '3')
    },

    // Event bus
    eventBus: {
      type: process.env.EVENT_BUS_TYPE || 'memory',
      url: process.env.EVENT_BUS_URL,
      retries: parseInt(process.env.EVENT_BUS_RETRIES || '3'),
      timeout: parseInt(process.env.EVENT_BUS_TIMEOUT || '5000')
    },

    // External services
    services: {
      squid: process.env.SQUID_API_URL,
      qonsent: process.env.QONSENT_API_URL,
      qlock: process.env.QLOCK_API_URL,
      qindex: process.env.QINDEX_API_URL
    },

    // Mocks
    mocks: {
      squid: process.env.MOCK_SQUID === 'true',
      qonsent: process.env.MOCK_QONSENT === 'true',
      qlock: process.env.MOCK_QLOCK === 'true',
      qindex: process.env.MOCK_QINDEX === 'true'
    },

    // ML/Analytics
    ml: {
      anomalyThreshold: parseFloat(process.env.ML_ANOMALY_THRESHOLD || '0.8'),
      riskScoreCacheTtl: parseInt(process.env.RISK_SCORE_CACHE_TTL || '300'),
      modelUpdateInterval: parseInt(process.env.MODEL_UPDATE_INTERVAL || '86400'),
      batchSize: parseInt(process.env.ML_BATCH_SIZE || '100')
    },

    // Security
    security: {
      signatureAlgorithm: process.env.SIGNATURE_ALGORITHM || 'Ed25519',
      encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || 'AES-256-GCM',
      keyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '2592000'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600'),
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5')
    },

    // Rate limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
    },

    // Compliance
    compliance: {
      gdprEnabled: process.env.GDPR_ENABLED !== 'false',
      soc2Enabled: process.env.SOC2_ENABLED !== 'false',
      auditRetentionYears: parseInt(process.env.AUDIT_RETENTION_YEARS || '7'),
      alertRetentionDays: parseInt(process.env.ALERT_RETENTION_DAYS || '90'),
      reportGenerationInterval: parseInt(process.env.REPORT_GENERATION_INTERVAL || '86400')
    },

    // Storage
    storage: {
      retentionPolicies: {
        auditEvents: process.env.AUDIT_EVENTS_RETENTION || 'P7Y',
        securityAlerts: process.env.SECURITY_ALERTS_RETENTION || 'P5Y',
        riskAssessments: process.env.RISK_ASSESSMENTS_RETENTION || 'P2Y',
        complianceReports: process.env.COMPLIANCE_REPORTS_RETENTION || 'P10Y',
        anomalyResults: process.env.ANOMALY_RESULTS_RETENTION || 'P1Y'
      },
      replicationFactor: parseInt(process.env.REPLICATION_FACTOR || '3'),
      geoDistribution: process.env.GEO_DISTRIBUTION?.split(',') || ['us-east-1', 'eu-west-1', 'ap-southeast-1']
    },

    // CORS
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
      credentials: process.env.CORS_CREDENTIALS !== 'false'
    },

    // Health
    health: {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
      retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3')
    }
  };

  // Validate configuration
  const result = configSchema.safeParse(rawConfig);
  
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Configuration utilities
export function isDevelopment(): boolean {
  return config.environment === 'development';
}

export function isProduction(): boolean {
  return config.environment === 'production';
}

export function isStaging(): boolean {
  return config.environment === 'staging';
}

// Service availability checks
export function isServiceMocked(service: keyof typeof config.mocks): boolean {
  return config.mocks[service];
}

export function getServiceUrl(service: keyof typeof config.services): string | undefined {
  return config.services[service];
}