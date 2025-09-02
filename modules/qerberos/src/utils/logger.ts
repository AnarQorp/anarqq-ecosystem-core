/**
 * Qerberos Logger
 * Centralized logging utility with structured logging support
 */

import winston from 'winston';
import { config } from '../config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'qerberos',
      version: config.version,
      environment: config.environment,
      ...meta
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'qerberos',
    version: config.version,
    environment: config.environment
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Audit logger for security events
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'qerberos-audit',
    version: config.version,
    environment: config.environment
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 20
    })
  ]
});

// Performance logger for metrics
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'qerberos-performance',
    version: config.version,
    environment: config.environment
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/performance.log',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10
    })
  ]
});

// Security logger for security events
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'qerberos-security',
    version: config.version,
    environment: config.environment
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 20
    })
  ]
});

// Utility functions for structured logging
export function logAuditEvent(event: any) {
  auditLogger.info('Audit event', {
    type: 'audit_event',
    event
  });
}

export function logSecurityEvent(event: any) {
  securityLogger.warn('Security event', {
    type: 'security_event',
    event
  });
}

export function logPerformanceMetric(metric: any) {
  performanceLogger.info('Performance metric', {
    type: 'performance_metric',
    metric
  });
}

export function logError(error: Error, context?: any) {
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
}

export function logRequest(req: any, res: any, duration: number) {
  logger.info('HTTP request', {
    type: 'http_request',
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    identity: req.identity?.squidId
  });
}

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}