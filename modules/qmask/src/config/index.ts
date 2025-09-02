import { z } from 'zod';

const configSchema = z.object({
  // Server Configuration
  port: z.number().default(3007),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database Configuration
  mongoUri: z.string().default('mongodb://localhost:27017/qmask'),
  redisUrl: z.string().default('redis://localhost:6379'),
  
  // External Services (for integrated mode)
  squidUrl: z.string().default('http://localhost:3001'),
  qonsentUrl: z.string().default('http://localhost:3003'),
  qerberosUrl: z.string().default('http://localhost:3006'),
  qindexUrl: z.string().default('http://localhost:3004'),
  
  // Privacy Configuration
  defaultRiskThreshold: z.number().min(0).max(1).default(0.7),
  anonymizationStrength: z.enum(['low', 'medium', 'high']).default('high'),
  gdprMode: z.boolean().default(true),
  
  // Security Configuration
  jwtSecret: z.string().default('qmask-dev-secret-change-in-production'),
  encryptionKey: z.string().default('qmask-encryption-key-32-chars-long'),
  
  // Rate Limiting
  rateLimitWindow: z.number().default(60000), // 1 minute
  rateLimitMax: z.number().default(100),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

const env = {
  port: parseInt(process.env.PORT || '3007'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/qmask',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  squidUrl: process.env.SQUID_URL || 'http://localhost:3001',
  qonsentUrl: process.env.QONSENT_URL || 'http://localhost:3003',
  qerberosUrl: process.env.QERBEROS_URL || 'http://localhost:3006',
  qindexUrl: process.env.QINDEX_URL || 'http://localhost:3004',
  
  defaultRiskThreshold: parseFloat(process.env.DEFAULT_RISK_THRESHOLD || '0.7'),
  anonymizationStrength: process.env.ANONYMIZATION_STRENGTH || 'high',
  gdprMode: process.env.GDPR_MODE === 'enabled',
  
  jwtSecret: process.env.JWT_SECRET || 'qmask-dev-secret-change-in-production',
  encryptionKey: process.env.ENCRYPTION_KEY || 'qmask-encryption-key-32-chars-long',
  
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  
  logLevel: process.env.LOG_LEVEL || 'info'
};

export const config = configSchema.parse(env);

// Derived configuration
export const isIntegrated = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';

// Add derived properties to config
Object.assign(config, {
  isIntegrated,
  isDevelopment,
  isTest
});