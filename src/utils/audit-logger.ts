/**
 * Audit Logger
 * 
 * Provides comprehensive audit logging for security-sensitive operations,
 * permission checks, and wallet actions while maintaining privacy compliance.
 */

import type { DAORole } from './dao-permissions';

// Audit event types
export type AuditEventType = 
  | 'auth_attempt'
  | 'auth_success'
  | 'auth_failure'
  | 'permission_check'
  | 'permission_denied'
  | 'wallet_operation'
  | 'dao_action'
  | 'security_violation'
  | 'data_access'
  | 'error_occurred';

// Audit event severity levels
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

// Audit event categories
export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'wallet'
  | 'dao_governance'
  | 'data_access'
  | 'security'
  | 'system';

// Base audit event interface
export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  userId?: string; // sQuid ID (anonymized if needed)
  sessionId?: string;
  daoId?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'denied' | 'error';
  details: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string; // Hashed for privacy
    location?: string; // General location, not specific
    deviceFingerprint?: string; // Hashed
  };
  privacy: {
    containsPII: boolean;
    retentionPeriod: number; // Days
    anonymized: boolean;
  };
}

// Specific event interfaces
export interface AuthenticationEvent extends AuditEvent {
  category: 'authentication';
  details: {
    method: 'squid' | 'wallet' | 'session';
    provider?: string;
    reason?: string;
    attempts?: number;
  };
}

export interface PermissionEvent extends AuditEvent {
  category: 'authorization';
  details: {
    requiredRole?: DAORole;
    userRole?: DAORole;
    permission: string;
    reason?: string;
    resourceId?: string;
  };
}

export interface WalletEvent extends AuditEvent {
  category: 'wallet';
  details: {
    operation: 'transfer' | 'mint' | 'balance_check' | 'connect' | 'disconnect';
    tokenType?: string;
    amount?: number; // Anonymized for large amounts
    recipient?: string; // Hashed
    transactionId?: string;
    gasUsed?: number;
  };
}

export interface DAOEvent extends AuditEvent {
  category: 'dao_governance';
  details: {
    operation: 'create_proposal' | 'vote' | 'join' | 'leave' | 'role_change';
    proposalId?: string;
    voteOption?: string;
    roleChange?: {
      from: DAORole;
      to: DAORole;
    };
  };
}

export interface SecurityEvent extends AuditEvent {
  category: 'security';
  severity: 'high' | 'critical';
  details: {
    violationType: 'unauthorized_access' | 'suspicious_activity' | 'rate_limit' | 'invalid_signature';
    riskScore: number; // 0-100
    blocked: boolean;
    additionalInfo?: Record<string, any>;
  };
}

// Audit logger configuration
export interface AuditLoggerConfig {
  enabled: boolean;
  logLevel: AuditSeverity;
  retentionDays: number;
  anonymizeData: boolean;
  encryptLogs: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  endpoints: {
    local?: string;
    remote?: string;
    backup?: string;
  };
  privacy: {
    hashPII: boolean;
    excludeFields: string[];
    maxRetentionDays: number;
  };
}

// Default configuration
const DEFAULT_CONFIG: AuditLoggerConfig = {
  enabled: true,
  logLevel: 'medium',
  retentionDays: 90,
  anonymizeData: true,
  encryptLogs: false,
  batchSize: 100,
  flushInterval: 5000,
  endpoints: {
    local: '/api/audit/log'
  },
  privacy: {
    hashPII: true,
    excludeFields: ['password', 'privateKey', 'seed'],
    maxRetentionDays: 365
  }
};

/**
 * Audit Logger Class
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private eventQueue: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isFlushingQueue = false;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startFlushTimer();
  }

  /**
   * Logs an authentication event
   */
  logAuthentication(
    type: 'attempt' | 'success' | 'failure',
    userId: string | null,
    details: AuthenticationEvent['details'],
    metadata: Partial<AuditEvent['metadata']> = {}
  ): void {
    const event: AuthenticationEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: type === 'attempt' ? 'auth_attempt' : type === 'success' ? 'auth_success' : 'auth_failure',
      category: 'authentication',
      severity: type === 'failure' ? 'medium' : 'low',
      userId: userId ? this.anonymizeUserId(userId) : undefined,
      sessionId: this.generateSessionId(),
      action: `authentication_${type}`,
      outcome: type === 'success' ? 'success' : type === 'failure' ? 'failure' : 'success',
      details,
      metadata: this.sanitizeMetadata(metadata),
      privacy: {
        containsPII: !!userId,
        retentionPeriod: this.config.retentionDays,
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Logs a permission check event
   */
  logPermissionCheck(
    userId: string | null,
    permission: string,
    outcome: 'granted' | 'denied',
    details: PermissionEvent['details'],
    daoId?: string
  ): void {
    const event: PermissionEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'permission_check',
      category: 'authorization',
      severity: outcome === 'denied' ? 'medium' : 'low',
      userId: userId ? this.anonymizeUserId(userId) : undefined,
      daoId,
      action: `permission_${outcome}`,
      resource: permission,
      outcome: outcome === 'granted' ? 'success' : 'denied',
      details,
      metadata: this.sanitizeMetadata({}),
      privacy: {
        containsPII: !!userId,
        retentionPeriod: this.config.retentionDays,
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Logs a wallet operation event
   */
  logWalletOperation(
    userId: string,
    operation: WalletEvent['details']['operation'],
    outcome: 'success' | 'failure' | 'error',
    details: Omit<WalletEvent['details'], 'operation'>,
    daoId?: string
  ): void {
    const event: WalletEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'wallet_operation',
      category: 'wallet',
      severity: outcome === 'error' ? 'high' : 'medium',
      userId: this.anonymizeUserId(userId),
      daoId,
      action: `wallet_${operation}`,
      outcome,
      details: {
        operation,
        ...this.sanitizeWalletDetails(details)
      },
      metadata: this.sanitizeMetadata({}),
      privacy: {
        containsPII: true,
        retentionPeriod: this.config.retentionDays,
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Logs a DAO governance event
   */
  logDAOAction(
    userId: string,
    daoId: string,
    operation: DAOEvent['details']['operation'],
    outcome: 'success' | 'failure' | 'error',
    details: Omit<DAOEvent['details'], 'operation'>
  ): void {
    const event: DAOEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'dao_action',
      category: 'dao_governance',
      severity: 'medium',
      userId: this.anonymizeUserId(userId),
      daoId,
      action: `dao_${operation}`,
      outcome,
      details: {
        operation,
        ...details
      },
      metadata: this.sanitizeMetadata({}),
      privacy: {
        containsPII: true,
        retentionPeriod: this.config.retentionDays,
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Logs a security violation event
   */
  logSecurityViolation(
    userId: string | null,
    violationType: SecurityEvent['details']['violationType'],
    riskScore: number,
    blocked: boolean,
    additionalInfo: Record<string, any> = {},
    daoId?: string
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'security_violation',
      category: 'security',
      severity: riskScore > 80 ? 'critical' : riskScore > 60 ? 'high' : 'medium',
      userId: userId ? this.anonymizeUserId(userId) : undefined,
      daoId,
      action: `security_${violationType}`,
      outcome: blocked ? 'denied' : 'success',
      details: {
        violationType,
        riskScore,
        blocked,
        additionalInfo: this.sanitizeData(additionalInfo)
      },
      metadata: this.sanitizeMetadata({}),
      privacy: {
        containsPII: !!userId,
        retentionPeriod: Math.min(this.config.retentionDays * 2, this.config.privacy.maxRetentionDays),
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Logs an error event
   */
  logError(
    error: Error,
    context: {
      userId?: string;
      daoId?: string;
      action?: string;
      severity?: AuditSeverity;
    } = {}
  ): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'error_occurred',
      category: 'system',
      severity: context.severity || 'medium',
      userId: context.userId ? this.anonymizeUserId(context.userId) : undefined,
      daoId: context.daoId,
      action: context.action || 'system_error',
      outcome: 'error',
      details: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: this.config.logLevel === 'low' ? error.stack : undefined
      },
      metadata: this.sanitizeMetadata({}),
      privacy: {
        containsPII: !!context.userId,
        retentionPeriod: this.config.retentionDays,
        anonymized: this.config.anonymizeData
      }
    };

    this.queueEvent(event);
  }

  /**
   * Flushes the event queue to storage
   */
  async flush(): Promise<void> {
    if (this.isFlushingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushingQueue = true;
    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.persistEvents(eventsToFlush);
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToFlush);
    } finally {
      this.isFlushingQueue = false;
    }
  }

  /**
   * Destroys the logger and cleans up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  // Private methods

  private queueEvent(event: AuditEvent): void {
    if (!this.config.enabled) {
      return;
    }

    // Check severity filter
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    if (severityLevels[event.severity] < severityLevels[this.config.logLevel]) {
      return;
    }

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (event.severity === 'critical') {
      this.flush();
    } else if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private async persistEvents(events: AuditEvent[]): Promise<void> {
    const payload = {
      events: events.map(event => this.config.encryptLogs ? this.encryptEvent(event) : event),
      timestamp: new Date().toISOString(),
      source: 'dao-dashboard'
    };

    // Try local endpoint first
    if (this.config.endpoints.local) {
      try {
        const response = await fetch(this.config.endpoints.local, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return;
        }
      } catch (error) {
        console.warn('Local audit logging failed:', error);
      }
    }

    // Fallback to console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Audit Events');
      events.forEach(event => {
        console.log(`[${event.severity.toUpperCase()}] ${event.action}:`, event);
      });
      console.groupEnd();
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    // In a real implementation, this would be tied to the actual session
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private anonymizeUserId(userId: string): string {
    if (!this.config.anonymizeData) {
      return userId;
    }
    
    // Simple hash for anonymization (use proper crypto in production)
    return `user_${this.simpleHash(userId)}`;
  }

  private sanitizeMetadata(metadata: Partial<AuditEvent['metadata']>): AuditEvent['metadata'] {
    return {
      userAgent: metadata.userAgent ? this.truncateString(metadata.userAgent, 200) : undefined,
      ipAddress: metadata.ipAddress ? this.simpleHash(metadata.ipAddress) : undefined,
      location: metadata.location,
      deviceFingerprint: metadata.deviceFingerprint ? this.simpleHash(metadata.deviceFingerprint) : undefined
    };
  }

  private sanitizeWalletDetails(details: Partial<WalletEvent['details']>): Partial<WalletEvent['details']> {
    const sanitized = { ...details };
    
    // Anonymize large amounts
    if (sanitized.amount && sanitized.amount > 1000) {
      sanitized.amount = Math.floor(sanitized.amount / 100) * 100; // Round to nearest 100
    }
    
    // Hash recipient addresses
    if (sanitized.recipient) {
      sanitized.recipient = this.simpleHash(sanitized.recipient);
    }
    
    return sanitized;
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    
    // Remove excluded fields
    for (const field of this.config.privacy.excludeFields) {
      delete sanitized[field];
    }
    
    return sanitized;
  }

  private encryptEvent(event: AuditEvent): AuditEvent {
    // Placeholder for encryption - implement proper encryption in production
    return {
      ...event,
      details: { encrypted: true, data: btoa(JSON.stringify(event.details)) }
    };
  }

  private simpleHash(input: string): string {
    // Simple hash function for demonstration - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private truncateString(str: string, maxLength: number): string {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
}

// Global audit logger instance
let globalAuditLogger: AuditLogger | null = null;

/**
 * Gets or creates the global audit logger instance
 */
export function getAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new AuditLogger(config);
  }
  return globalAuditLogger;
}

/**
 * Convenience functions for common audit operations
 */
export const auditLog = {
  auth: (type: 'attempt' | 'success' | 'failure', userId: string | null, details: any) => 
    getAuditLogger().logAuthentication(type, userId, details),
    
  permission: (userId: string | null, permission: string, outcome: 'granted' | 'denied', details: any, daoId?: string) =>
    getAuditLogger().logPermissionCheck(userId, permission, outcome, details, daoId),
    
  wallet: (userId: string, operation: string, outcome: 'success' | 'failure' | 'error', details: any, daoId?: string) =>
    getAuditLogger().logWalletOperation(userId, operation as any, outcome, details, daoId),
    
  dao: (userId: string, daoId: string, operation: string, outcome: 'success' | 'failure' | 'error', details: any) =>
    getAuditLogger().logDAOAction(userId, daoId, operation as any, outcome, details),
    
  security: (userId: string | null, violationType: string, riskScore: number, blocked: boolean, info?: any, daoId?: string) =>
    getAuditLogger().logSecurityViolation(userId, violationType as any, riskScore, blocked, info, daoId),
    
  error: (error: Error, context?: any) =>
    getAuditLogger().logError(error, context)
};