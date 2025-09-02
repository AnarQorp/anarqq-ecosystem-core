import { z } from 'zod';

const configSchema = z.object({
  // Server configuration
  port: z.number().default(3008),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database configuration
  mongoUri: z.string().default('mongodb://localhost:27017/qpic'),
  redisUrl: z.string().default('redis://localhost:6379'),
  
  // Storage configuration
  ipfsUrl: z.string().default('http://localhost:5001'),
  storagePath: z.string().default('/tmp/qpic-storage'),
  maxFileSize: z.number().default(100 * 1024 * 1024), // 100MB
  allowedFormats: z.string().default('jpg,jpeg,png,webp,avif,mp4,webm,mp3,aac,flac,pdf'),
  
  // External services
  squidUrl: z.string().default('http://localhost:3001'),
  qonsentUrl: z.string().default('http://localhost:3003'),
  qmaskUrl: z.string().default('http://localhost:3007'),
  qerberosUrl: z.string().default('http://localhost:3006'),
  qindexUrl: z.string().default('http://localhost:3004'),
  qmarketUrl: z.string().default('http://localhost:3009'),
  
  // Media processing configuration
  ffmpegPath: z.string().default('/usr/bin/ffmpeg'),
  imagemagickPath: z.string().default('/usr/bin/convert'),
  transcodingWorkers: z.number().default(4),
  transcodingTimeout: z.number().default(300),
  
  // CDN configuration
  cdnEnabled: z.boolean().default(false),
  cdnUrl: z.string().optional(),
  cacheTtl: z.number().default(3600),
  
  // Security configuration
  jwtSecret: z.string().default('qpic-dev-secret'),
  encryptionKey: z.string().default('qpic-dev-encryption-key'),
  
  // Rate limiting
  rateLimitMax: z.number().default(100),
  rateLimitWindow: z.number().default(60000), // 1 minute
});

const rawConfig = {
  port: parseInt(process.env.PORT || '3008'),
  nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/qpic',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  ipfsUrl: process.env.IPFS_URL || 'http://localhost:5001',
  storagePath: process.env.STORAGE_PATH || '/tmp/qpic-storage',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE?.replace(/[^\d]/g, '') || '104857600'), // 100MB
  allowedFormats: process.env.ALLOWED_FORMATS || 'jpg,jpeg,png,webp,avif,mp4,webm,mp3,aac,flac,pdf',
  
  squidUrl: process.env.SQUID_URL || 'http://localhost:3001',
  qonsentUrl: process.env.QONSENT_URL || 'http://localhost:3003',
  qmaskUrl: process.env.QMASK_URL || 'http://localhost:3007',
  qerberosUrl: process.env.QERBEROS_URL || 'http://localhost:3006',
  qindexUrl: process.env.QINDEX_URL || 'http://localhost:3004',
  qmarketUrl: process.env.QMARKET_URL || 'http://localhost:3009',
  
  ffmpegPath: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
  imagemagickPath: process.env.IMAGEMAGICK_PATH || '/usr/bin/convert',
  transcodingWorkers: parseInt(process.env.TRANSCODING_WORKERS || '4'),
  transcodingTimeout: parseInt(process.env.TRANSCODING_TIMEOUT || '300'),
  
  cdnEnabled: process.env.CDN_ENABLED === 'true',
  cdnUrl: process.env.CDN_URL,
  cacheTtl: parseInt(process.env.CACHE_TTL || '3600'),
  
  jwtSecret: process.env.JWT_SECRET || 'qpic-dev-secret',
  encryptionKey: process.env.ENCRYPTION_KEY || 'qpic-dev-encryption-key',
  
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
};

export const config = configSchema.parse(rawConfig);

// Derived configuration
export const allowedFormatsArray = config.allowedFormats.split(',').map(f => f.trim().toLowerCase());

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';