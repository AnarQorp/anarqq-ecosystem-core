/**
 * sQuid Module Types
 * Core types and interfaces for identity management
 */

export enum IdentityType {
  ROOT = 'ROOT',
  DAO = 'DAO',
  ENTERPRISE = 'ENTERPRISE',
  CONSENTIDA = 'CONSENTIDA',
  AID = 'AID'
}

export enum IdentityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export enum VerificationLevel {
  UNVERIFIED = 'UNVERIFIED',
  BASIC = 'BASIC',
  ENHANCED = 'ENHANCED',
  INSTITUTIONAL = 'INSTITUTIONAL'
}

export enum GovernanceType {
  SELF = 'SELF',
  DAO = 'DAO',
  PARENT = 'PARENT',
  AUTONOMOUS = 'AUTONOMOUS'
}

export enum PrivacyLevel {
  PUBLIC = 'PUBLIC',
  DAO_ONLY = 'DAO_ONLY',
  PRIVATE = 'PRIVATE',
  ANONYMOUS = 'ANONYMOUS'
}

export interface Identity {
  did: string;
  name: string;
  type: IdentityType;
  parentId?: string;
  rootId: string;
  children: string[];
  depth: number;
  path: string[];
  status: IdentityStatus;
  verificationLevel: VerificationLevel;
  reputation: number;
  governanceType: GovernanceType;
  privacyLevel: PrivacyLevel;
  publicKey: string;
  qonsentProfileId?: string;
  qindexRegistered: boolean;
  kyc: {
    required: boolean;
    submitted: boolean;
    approved: boolean;
    level?: VerificationLevel;
    submittedAt?: Date;
    approvedAt?: Date;
    documents?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastUsed: Date;
  metadata?: Record<string, any>;
}

export interface CreateIdentityRequest {
  name: string;
  description?: string;
  avatar?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  metadata?: Record<string, any>;
}

export interface CreateSubidentityRequest {
  name: string;
  type: IdentityType;
  description?: string;
  purpose?: string;
  avatar?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  kycLevel?: VerificationLevel;
  governanceConfig?: {
    daoId?: string;
    parentalConsent?: boolean;
    governanceRules?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

export interface VerificationRequest {
  fullName: string;
  dateOfBirth: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
}

export interface ReputationUpdate {
  identityId: string;
  delta: number;
  reason: string;
  module: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface IdentityEvent {
  eventId: string;
  timestamp: Date;
  version: string;
  source: string;
  type: string;
  correlationId?: string;
  data: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  dependencies: Record<string, {
    status: 'up' | 'down' | 'degraded';
    latency: number;
    lastCheck: Date;
  }>;
  metrics: {
    uptime: number;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export interface StandardResponse<T = any> {
  status: 'ok' | 'error';
  code: string;
  message: string;
  data?: T;
  cid?: string;
  timestamp: Date;
  requestId: string;
}

export interface ErrorResponse extends StandardResponse {
  status: 'error';
  details?: Record<string, any>;
  retryable: boolean;
  suggestedActions?: string[];
}

// MCP Tool interfaces
export interface VerifyIdentityInput {
  identityId: string;
  signature: string;
  message: string;
  timestamp?: string;
}

export interface VerifyIdentityOutput {
  verified: boolean;
  identity?: Identity;
  verificationLevel: VerificationLevel;
  reputation: number;
  timestamp: Date;
}

export interface ActiveContextInput {
  sessionId?: string;
  includeSubidentities?: boolean;
}

export interface ActiveContextOutput {
  activeIdentity?: Identity;
  subidentities?: Identity[];
  permissions?: string[];
  sessionInfo?: {
    sessionId: string;
    startedAt: Date;
    lastActivity: Date;
  };
}

// Service interfaces
export interface IdentityService {
  createIdentity(request: CreateIdentityRequest, context: RequestContext): Promise<Identity>;
  createSubidentity(parentId: string, request: CreateSubidentityRequest, context: RequestContext): Promise<Identity>;
  getIdentity(identityId: string): Promise<Identity | null>;
  updateIdentity(identityId: string, updates: Partial<Identity>, context: RequestContext): Promise<Identity>;
  deleteIdentity(identityId: string, context: RequestContext): Promise<void>;
  submitVerification(identityId: string, request: VerificationRequest, context: RequestContext): Promise<Identity>;
  updateReputation(update: ReputationUpdate): Promise<Identity>;
  getReputation(identityId: string): Promise<{ score: number; level: string; lastUpdated: Date }>;
}

export interface EventService {
  publishEvent(event: IdentityEvent): Promise<void>;
  subscribeToEvents(topics: string[], handler: (event: IdentityEvent) => void): Promise<void>;
}

export interface StorageService {
  storeIdentity(identity: Identity): Promise<string>;
  retrieveIdentity(identityId: string): Promise<Identity | null>;
  updateIdentity(identityId: string, updates: Partial<Identity>): Promise<Identity>;
  deleteIdentity(identityId: string): Promise<void>;
  findIdentitiesByParent(parentId: string): Promise<Identity[]>;
  findIdentitiesByRoot(rootId: string): Promise<Identity[]>;
}

export interface RequestContext {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  sessionId?: string;
  identityId?: string;
  deviceFingerprint?: string;
}

export interface MockService {
  isEnabled(): boolean;
  createMockIdentity(request: CreateIdentityRequest): Promise<Identity>;
  getMockReputation(identityId: string): Promise<number>;
}

// Configuration interfaces
export interface SquidConfig {
  port: number;
  host: string;
  mockMode: boolean;
  database: {
    url: string;
    name: string;
  };
  eventBus: {
    url: string;
    topics: {
      identityCreated: string;
      subidentityCreated: string;
      reputationUpdated: string;
      identityVerified: string;
    };
  };
  security: {
    maxSubidentities: number;
    sessionTimeout: number;
    rateLimits: {
      identityCreation: number;
      verificationSubmission: number;
      reputationQueries: number;
      generalApi: number;
    };
  };
  integrations: {
    qonsent: {
      enabled: boolean;
      url: string;
    };
    qlock: {
      enabled: boolean;
      url: string;
    };
    qindex: {
      enabled: boolean;
      url: string;
    };
    qerberos: {
      enabled: boolean;
      url: string;
    };
  };
}