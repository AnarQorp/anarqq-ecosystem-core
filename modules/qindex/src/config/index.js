/**
 * Configuration management for Qindex module
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load package.json for version info
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf8')
);

export const config = {
  // Basic settings
  version: packageJson.version,
  mode: process.env.QINDEX_MODE || 'standalone',
  port: parseInt(process.env.QINDEX_PORT || '3006'),
  logLevel: process.env.LOG_LEVEL || 'info',

  // Storage settings
  storagePath: process.env.QINDEX_STORAGE_PATH || './data',
  maxRecordSize: parseInt(process.env.MAX_RECORD_SIZE || '10485760'), // 10MB
  maxHistoryEntries: parseInt(process.env.MAX_HISTORY_ENTRIES || '1000'),

  // IPFS settings
  ipfs: {
    endpoint: process.env.IPFS_ENDPOINT || 'http://localhost:5001',
    timeout: parseInt(process.env.IPFS_TIMEOUT || '30000'),
    pinByDefault: process.env.IPFS_PIN_DEFAULT !== 'false'
  },

  // Redis settings (for caching and coordination)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'qindex:',
    ttl: parseInt(process.env.REDIS_TTL || '3600') // 1 hour
  },

  // Retention policy
  retention: {
    defaultTtl: parseInt(process.env.DEFAULT_TTL || '2592000'), // 30 days
    maxTtl: parseInt(process.env.MAX_TTL || '31536000'), // 1 year
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '3600000') // 1 hour
  },

  // Performance settings
  performance: {
    maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPS || '100'),
    queryTimeout: parseInt(process.env.QUERY_TIMEOUT || '5000'),
    batchSize: parseInt(process.env.BATCH_SIZE || '50')
  },

  // Security settings
  security: {
    enableEncryption: process.env.ENABLE_ENCRYPTION !== 'false',
    encryptionKey: process.env.ENCRYPTION_KEY,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '1000')
  },

  // Integration settings (for integrated mode)
  integrations: {
    squid: {
      endpoint: process.env.SQUID_ENDPOINT || 'http://localhost:3001',
      enabled: process.env.SQUID_ENABLED !== 'false'
    },
    qonsent: {
      endpoint: process.env.QONSENT_ENDPOINT || 'http://localhost:3002',
      enabled: process.env.QONSENT_ENABLED !== 'false'
    },
    qlock: {
      endpoint: process.env.QLOCK_ENDPOINT || 'http://localhost:3003',
      enabled: process.env.QLOCK_ENABLED !== 'false'
    },
    qerberos: {
      endpoint: process.env.QERBEROS_ENDPOINT || 'http://localhost:3004',
      enabled: process.env.QERBEROS_ENABLED !== 'false'
    }
  },

  // Development settings
  development: {
    enableMocks: process.env.ENABLE_MOCKS !== 'false',
    mockDelay: parseInt(process.env.MOCK_DELAY || '100'),
    enableDebugLogs: process.env.DEBUG === 'true'
  }
};

// Validate required configuration
export function validateConfig() {
  const errors = [];

  if (config.mode === 'integrated') {
    if (!config.integrations.squid.endpoint) {
      errors.push('SQUID_ENDPOINT is required in integrated mode');
    }
  }

  if (config.security.enableEncryption && !config.security.encryptionKey) {
    errors.push('ENCRYPTION_KEY is required when encryption is enabled');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}

// Initialize configuration
validateConfig();