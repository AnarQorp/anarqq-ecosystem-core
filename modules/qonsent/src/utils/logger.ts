import pino from 'pino';
import { config } from '../config';

const loggerConfig: pino.LoggerOptions = {
  level: config.logging.level,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'token',
      'secret',
      'key',
    ],
    censor: '[REDACTED]',
  },
};

// Add pretty printing for development
if (config.isDevelopment) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  };
}

export const logger = pino(loggerConfig);

// Add request context to logger
export function createRequestLogger(requestId: string, traceId?: string) {
  return logger.child({
    requestId,
    traceId,
  });
}

// Structured logging helpers
export const loggerHelpers = {
  logPermissionCheck: (params: {
    checkId: string;
    resource: string;
    identity: string;
    action: string;
    result: 'ALLOWED' | 'DENIED' | 'ERROR';
    reason: string;
    responseTime: number;
    cacheHit?: boolean;
  }) => {
    logger.info({
      event: 'permission_check',
      ...params,
    }, `Permission check: ${params.result}`);
  },

  logPermissionGrant: (params: {
    grantId: string;
    resource: string;
    identity: string;
    permissions: string[];
    grantedBy: string;
    expiresAt?: Date;
  }) => {
    logger.info({
      event: 'permission_grant',
      ...params,
    }, `Permission granted: ${params.permissions.join(', ')}`);
  },

  logPermissionRevocation: (params: {
    resource: string;
    identity: string;
    revokedPermissions: string[];
    revokedBy: string;
    reason?: string;
  }) => {
    logger.info({
      event: 'permission_revocation',
      ...params,
    }, `Permission revoked: ${params.revokedPermissions.join(', ')}`);
  },

  logPolicyOperation: (params: {
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    policyId: string;
    policyName: string;
    performedBy: string;
  }) => {
    logger.info({
      event: 'policy_operation',
      ...params,
    }, `Policy ${params.operation.toLowerCase()}: ${params.policyName}`);
  },

  logSecurityEvent: (params: {
    eventType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    identity?: string;
    resource?: string;
    details: Record<string, any>;
  }) => {
    logger.warn({
      event: 'security_event',
      ...params,
    }, `Security event: ${params.eventType}`);
  },

  logServiceHealth: (params: {
    service: string;
    status: 'UP' | 'DOWN' | 'DEGRADED';
    latency?: number;
    error?: string;
  }) => {
    const logLevel = params.status === 'UP' ? 'debug' : 'warn';
    logger[logLevel]({
      event: 'service_health',
      ...params,
    }, `Service ${params.service}: ${params.status}`);
  },

  logPerformanceMetric: (params: {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }) => {
    logger.debug({
      event: 'performance_metric',
      ...params,
    }, `Operation ${params.operation}: ${params.duration}ms`);
  },
};