/**
 * Configuration management for DAO module
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

export const config = {
  // Service Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.DAO_PORT || '3014', 10),
  HOST: process.env.DAO_HOST || '0.0.0.0',
  
  // Mock Mode
  USE_MOCKS: process.env.USE_MOCKS === 'true',
  
  // Database
  DB_PATH: process.env.DAO_DB_PATH || './storage/dao.db',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  SIGNATURE_VERIFICATION: process.env.SIGNATURE_VERIFICATION !== 'false',
  
  // Integration URLs (for integrated mode)
  SQUID_SERVICE_URL: process.env.SQUID_SERVICE_URL || 'http://localhost:3001',
  QONSENT_SERVICE_URL: process.env.QONSENT_SERVICE_URL || 'http://localhost:3002',
  QLOCK_SERVICE_URL: process.env.QLOCK_SERVICE_URL || 'http://localhost:3003',
  QINDEX_SERVICE_URL: process.env.QINDEX_SERVICE_URL || 'http://localhost:3004',
  QERBEROS_SERVICE_URL: process.env.QERBEROS_SERVICE_URL || 'http://localhost:3005',
  QWALLET_SERVICE_URL: process.env.QWALLET_SERVICE_URL || 'http://localhost:3006',
  
  // Event Bus
  EVENT_BUS_URL: process.env.EVENT_BUS_URL || 'http://localhost:3007',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // Governance Defaults
  DEFAULT_VOTING_DURATION: parseInt(process.env.DEFAULT_VOTING_DURATION || '604800000', 10), // 7 days
  DEFAULT_QUORUM: parseInt(process.env.DEFAULT_QUORUM || '10', 10),
  MIN_PROPOSAL_DURATION: parseInt(process.env.MIN_PROPOSAL_DURATION || '3600000', 10), // 1 hour
  MAX_PROPOSAL_DURATION: parseInt(process.env.MAX_PROPOSAL_DURATION || '2592000000', 10), // 30 days
  
  // Reputation System
  REPUTATION_ENABLED: process.env.REPUTATION_ENABLED !== 'false',
  REPUTATION_DECAY_RATE: parseFloat(process.env.REPUTATION_DECAY_RATE || '0.01'), // 1% per day
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'json'
};

// Validation
if (!config.JWT_SECRET || config.JWT_SECRET === 'dev-jwt-secret-change-in-production') {
  if (config.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

export default config;