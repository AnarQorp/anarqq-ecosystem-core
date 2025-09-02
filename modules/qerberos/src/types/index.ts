/**
 * Qerberos Type Definitions
 * Common types used throughout the Qerberos service
 */

// Common identity reference
export interface IdentityRef {
  squidId: string;
  subId?: string;
  daoId?: string;
}

// Base audit event structure
export interface AuditEvent {
  id: string;
  type: string;
  ref: string;
  actor: IdentityRef;
  layer: string;
  verdict: 'ALLOW' | 'DENY' | 'WARN';
  details: Record<string, any>;
  cid?: string;
  timestamp: string;
  signature: string;
  ipfsCid: string;
}

// Security alert structure
export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'dismissed' | 'investigating';
  title: string;
  description: string;
  source: AlertSource;
  affectedResources: AffectedResource[];
  indicators: Indicator[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  tags: string[];
  recommendations: string[];
  relatedAlerts: string[];
  metadata: Record<string, any>;
}

export interface AlertSource {
  module: string;
  component?: string;
  version?: string;
}

export interface AffectedResource {
  type: string;
  id: string;
  name?: string;
  impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface Indicator {
  type: string;
  value: string;
  confidence: number;
  description?: string;
}

// Compliance report structure
export interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'soc2' | 'custom';
  period: {
    startDate: string;
    endDate: string;
  };
  summary: Record<string, any>;
  violations: ComplianceViolation[];
  recommendations: string[];
  generatedAt: string;
  generatedBy: string;
  status: 'draft' | 'final' | 'approved';
  metadata: Record<string, any>;
}

export interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedData?: {
    type: string;
    subjects: string[];
  };
  regulation: string;
  recommendations: string[];
  status: 'open' | 'resolved' | 'accepted_risk';
  detectedAt: string;
  resolvedAt?: string;
}

// Standard API response structure
export interface ApiResponse<T = any> {
  status: 'ok' | 'error';
  code: string;
  message: string;
  data?: T;
  timestamp: string;
  requestId?: string;
  retryable?: boolean;
  suggestedActions?: string[];
}

// Health check response
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, DependencyHealth>;
  metrics: HealthMetrics;
}

export interface DependencyHealth {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastCheck: string;
  error?: string;
}

export interface HealthMetrics {
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// Event bus message structure
export interface EventMessage {
  id: string;
  topic: string;
  payload: any;
  timestamp: string;
  source: string;
  version: string;
  correlationId?: string;
  signature?: string;
}

// IPFS storage configuration
export interface IPFSConfig {
  apiUrl: string;
  gatewayUrl: string;
  timeout: number;
  retries: number;
}

// Service configuration
export interface ServiceConfig {
  port: number;
  environment: string;
  version: string;
  logLevel: string;
  ipfs: IPFSConfig;
  eventBus: EventBusConfig;
  services: ExternalServicesConfig;
  mocks: MockConfig;
  ml: MLConfig;
  security: SecurityConfig;
  rateLimit: RateLimitConfig;
  compliance: ComplianceConfig;
  storage: StorageConfig;
  cors: CorsConfig;
  health: HealthConfig;
}

export interface EventBusConfig {
  type: 'redis' | 'memory';
  url?: string;
  retries: number;
  timeout: number;
}

export interface ExternalServicesConfig {
  squid?: string;
  qonsent?: string;
  qlock?: string;
  qindex?: string;
}

export interface MockConfig {
  squid: boolean;
  qonsent: boolean;
  qlock: boolean;
  qindex: boolean;
}

export interface MLConfig {
  anomalyThreshold: number;
  riskScoreCacheTtl: number;
  modelUpdateInterval: number;
  batchSize: number;
}

export interface SecurityConfig {
  signatureAlgorithm: string;
  encryptionAlgorithm: string;
  keyRotationInterval: number;
  sessionTimeout: number;
  maxConcurrentSessions: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface ComplianceConfig {
  gdprEnabled: boolean;
  soc2Enabled: boolean;
  auditRetentionYears: number;
  alertRetentionDays: number;
  reportGenerationInterval: number;
}

export interface StorageConfig {
  retentionPolicies: Record<string, string>;
  replicationFactor: number;
  geoDistribution: string[];
}

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
}

export interface HealthConfig {
  checkInterval: number;
  timeout: number;
  retries: number;
}

// Error types
export class QerberosError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'QerberosError';
  }
}

export class ValidationError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, false, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, false, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, false, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, false, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, details);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends QerberosError {
  constructor(message: string, details?: any) {
    super(message, 'SERVICE_UNAVAILABLE', 503, true, details);
    this.name = 'ServiceUnavailableError';
  }
}