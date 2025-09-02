import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isStandalone = process.env.QDRIVE_MODE === 'standalone';

export const config = {
  // Server configuration
  port: parseInt(process.env.QDRIVE_PORT || '3008'),
  host: process.env.QDRIVE_HOST || '0.0.0.0',
  env,
  isProduction,
  isStandalone,

  // CORS configuration
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173']
  },

  // File storage configuration
  storage: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/*',
      'video/*',
      'audio/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/*'
    ],
    storagePath: process.env.STORAGE_PATH || join(__dirname, '../../storage'),
    tempPath: process.env.TEMP_PATH || join(__dirname, '../../temp')
  },

  // IPFS configuration
  ipfs: {
    apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
    gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.IPFS_TIMEOUT || '30000'),
    pinOnAdd: process.env.IPFS_PIN_ON_ADD !== 'false'
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'qdrive:',
    ttl: parseInt(process.env.REDIS_TTL || '3600')
  },

  // Service URLs (for integrated mode)
  services: {
    squid: {
      url: process.env.SQUID_API_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.SQUID_TIMEOUT || '5000')
    },
    qonsent: {
      url: process.env.QONSENT_API_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.QONSENT_TIMEOUT || '3000')
    },
    qlock: {
      url: process.env.QLOCK_API_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.QLOCK_TIMEOUT || '10000')
    },
    qindex: {
      url: process.env.QINDEX_API_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.QINDEX_TIMEOUT || '5000')
    },
    qerberos: {
      url: process.env.QERBEROS_API_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.QERBEROS_TIMEOUT || '15000')
    }
  },

  // Retention policies
  retention: {
    defaultDays: parseInt(process.env.DEFAULT_RETENTION_DAYS || '365'),
    maxDays: parseInt(process.env.MAX_RETENTION_DAYS || '3650'),
    minDays: parseInt(process.env.MIN_RETENTION_DAYS || '1')
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json'
  }
};