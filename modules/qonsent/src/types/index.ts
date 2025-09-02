export interface PermissionGrant {
  _id?: string;
  grantId: string;
  resource: string;
  identity: string;
  permissions: string[];
  expiresAt?: Date;
  conditions?: Record<string, any>;
  grantedBy: string;
  createdAt: Date;
  updatedAt: Date;
  revoked?: boolean;
}

export interface PermissionCheck {
  allowed: boolean;
  reason: string;
  policy?: {
    id: string;
    name: string;
    type: string;
  };
  expiresAt?: string;
  conditions?: Record<string, any>;
  auditTrail?: {
    checkId: string;
    timestamp: string;
    source: string;
  };
}

export interface Policy {
  _id?: string;
  name: string;
  description?: string;
  scope: 'global' | 'dao' | 'resource';
  rules: PolicyRule[];
  createdBy: string;
  updatedBy?: string;
  expiresAt?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  audience: string; // Identity pattern or DAO
  resource: string; // Resource pattern
  actions: string[]; // Allowed actions
  conditions?: Record<string, any>; // Additional conditions
}

export interface AuditEvent {
  eventId: string;
  timestamp: Date;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  actor: {
    identity: string;
    subidentity?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource?: {
    id: string;
    type: string;
    owner?: string;
  };
  action: {
    type: string;
    result: 'ALLOWED' | 'DENIED' | 'ERROR';
    reason: string;
    policy?: string;
  };
  context: Record<string, any>;
  metadata?: Record<string, any>;
  signature?: string;
  cid?: string;
}

export interface EventPayload {
  eventId: string;
  timestamp: string;
  source: string;
  type: string;
  data: Record<string, any>;
  signature?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, {
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastCheck: string;
    error?: string;
  }>;
  metrics: {
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
    cacheHitRate: number;
  };
}

export interface StandardResponse<T = any> {
  status: 'ok' | 'error';
  code?: string;
  message?: string;
  data?: T;
  timestamp: string;
  requestId?: string;
}

export interface StandardError {
  status: 'error';
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  retryable?: boolean;
  suggestedActions?: string[];
}