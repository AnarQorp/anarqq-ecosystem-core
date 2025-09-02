/**
 * Extended Identity Types for sQuid Identity Expansion
 * Supports multiple identity types, hierarchical structures, and ecosystem integration
 */

// Core Identity Types
export enum IdentityType {
  ROOT = 'ROOT',
  DAO = 'DAO',
  ENTERPRISE = 'ENTERPRISE',
  CONSENTIDA = 'CONSENTIDA',
  AID = 'AID'
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

export enum IdentityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

// Identity Type Rules and Governance
export interface IdentityTypeRules {
  kycRequired: boolean;
  canCreateSubidentities: boolean;
  visibility: PrivacyLevel;
  governedBy: GovernanceType;
  maxSubidentities?: number;
  requiredPermissions?: string[];
}

export const IDENTITY_TYPE_RULES: Record<IdentityType, IdentityTypeRules> = {
  [IdentityType.ROOT]: {
    kycRequired: false, // Inherits from registration
    canCreateSubidentities: true,
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.SELF
  },
  [IdentityType.DAO]: {
    kycRequired: true,
    canCreateSubidentities: true, // Optional
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.DAO
  },
  [IdentityType.ENTERPRISE]: {
    kycRequired: true, // Via DAO
    canCreateSubidentities: false,
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.DAO
  },
  [IdentityType.CONSENTIDA]: {
    kycRequired: false, // Inherits from root
    canCreateSubidentities: false,
    visibility: PrivacyLevel.PRIVATE,
    governedBy: GovernanceType.PARENT
  },
  [IdentityType.AID]: {
    kycRequired: true, // Root must be verified
    canCreateSubidentities: false,
    visibility: PrivacyLevel.ANONYMOUS,
    governedBy: GovernanceType.SELF
  }
};

// Identity Creation Rules
export interface IdentityCreationRules {
  type: IdentityType;
  parentType?: IdentityType;
  requiresKYC: boolean;
  requiresDAOGovernance: boolean;
  requiresParentalConsent: boolean;
  maxDepth: number;
  allowedChildTypes: IdentityType[];
}

// Identity Permissions
export interface IdentityPermissions {
  canCreateSubidentities: boolean;
  canDeleteSubidentities: boolean;
  canModifyProfile: boolean;
  canAccessModule: (module: string) => boolean;
  canPerformAction: (action: string, resource: string) => boolean;
  governanceLevel: GovernanceType;
}

// Cryptographic Key Pair
export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: 'RSA' | 'ECDSA' | 'QUANTUM';
  keySize: number;
  createdAt: string;
  expiresAt?: string;
}

// Audit and Security
export interface AuditEntry {
  id: string;
  identityId: string;
  action: IdentityAction;
  timestamp: string;
  metadata: {
    previousState?: any;
    newState?: any;
    triggeredBy: string;
    ipAddress?: string;
    deviceFingerprint?: string;
    securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  qerberosLogId?: string;
}

export enum IdentityAction {
  CREATED = 'CREATED',
  SWITCHED = 'SWITCHED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  PRIVACY_CHANGED = 'PRIVACY_CHANGED',
  SECURITY_EVENT = 'SECURITY_EVENT',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  GOVERNANCE_CHANGED = 'GOVERNANCE_CHANGED'
}

export interface SecurityFlag {
  id: string;
  type: 'SUSPICIOUS_ACTIVITY' | 'MULTIPLE_LOGINS' | 'UNUSUAL_PATTERN' | 'SECURITY_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Qonsent Integration
export interface IdentityQonsentProfile {
  identityId: string;
  profileId: string;
  privacyLevel: PrivacyLevel;
  dataSharing: {
    [module: string]: {
      enabled: boolean;
      level: 'MINIMAL' | 'STANDARD' | 'FULL';
      restrictions: string[];
    };
  };
  visibilityRules: {
    profile: PrivacyLevel;
    activity: PrivacyLevel;
    connections: PrivacyLevel;
  };
  consentHistory: ConsentEvent[];
  lastUpdated: string;
}

export interface ConsentEvent {
  id: string;
  action: 'GRANTED' | 'REVOKED' | 'MODIFIED';
  module: string;
  permission: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Extended Identity Interface
export interface ExtendedSquidIdentity {
  // Core Identity Properties
  did: string;
  name: string;
  type: IdentityType;
  parentId?: string; // For subidentities
  rootId: string; // Always points to root identity
  
  // Hierarchy and Relationships
  children: string[]; // DIDs of child identities
  depth: number; // Depth in identity tree (0 for root)
  path: string[]; // Path from root to this identity
  
  // Governance and Permissions
  governanceLevel: GovernanceType;
  creationRules: IdentityCreationRules;
  permissions: IdentityPermissions;
  status: IdentityStatus;
  
  // Privacy and Security
  qonsentProfileId: string;
  qlockKeyPair: KeyPair;
  privacyLevel: PrivacyLevel;
  
  // Profile Metadata
  avatar?: string;
  description?: string;
  tags: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastUsed: string;
  
  // KYC and Verification
  kyc: {
    required: boolean;
    submitted: boolean;
    approved: boolean;
    level?: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
    submittedAt?: string;
    approvedAt?: string;
    documents?: string[]; // IPFS hashes of KYC documents
  };
  
  // Audit Trail
  auditLog: AuditEntry[];
  securityFlags: SecurityFlag[];
  
  // Integration Data
  qindexRegistered: boolean;
  qindexMetadata?: {
    classification: string[];
    searchable: boolean;
    indexed: boolean;
    lastSync: string;
  };
  
  // Usage Statistics (optional for analytics)
  usageStats?: {
    switchCount: number;
    lastSwitch: string;
    modulesAccessed: string[];
    totalSessions: number;
  };
  
  // Legacy compatibility
  space?: string; // Namespace for Web3.Storage
  email?: string; // Email of the user
  cid_profile?: string; // CID of sQuid profile in IPFS
  reputation?: number; // Legacy reputation score
  isAuthenticated?: boolean;
  token?: string;
  provider?: string;
  
  // Function signatures for backward compatibility
  signMessage?: (message: string) => Promise<string>;
  encrypt?: (data: string) => Promise<string>;
  decrypt?: (encryptedData: string) => Promise<string>;
  getToken?: () => Promise<string>;
}

// Identity Tree Structure
export interface IdentityTreeNode {
  identity: ExtendedSquidIdentity;
  children: IdentityTreeNode[];
  parent?: IdentityTreeNode;
  expanded?: boolean; // For UI tree visualization
}

export interface IdentityTree {
  root: IdentityTreeNode;
  totalNodes: number;
  maxDepth: number;
  lastUpdated: string;
}

// Identity Creation Metadata
export interface SubidentityMetadata {
  name: string;
  description?: string;
  type: IdentityType;
  avatar?: string;
  tags?: string[];
  privacyLevel?: PrivacyLevel;
  kycLevel?: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  governanceConfig?: {
    daoId?: string;
    parentalConsent?: boolean;
    governanceRules?: Record<string, any>;
  };
  qonsentConfig?: Partial<IdentityQonsentProfile>;
}

// Operation Results
export interface SubidentityResult {
  success: boolean;
  identity?: ExtendedSquidIdentity;
  error?: string;
  validationErrors?: string[];
}

export interface SwitchResult {
  success: boolean;
  previousIdentity?: ExtendedSquidIdentity;
  newIdentity?: ExtendedSquidIdentity;
  error?: string;
  contextUpdates?: {
    qonsent: boolean;
    qlock: boolean;
    qwallet: boolean;
    qerberos: boolean;
    qindex: boolean;
  };
  contextSwitchResult?: ContextSwitchResult;
}

export interface DeleteResult {
  success: boolean;
  deletedIdentity?: ExtendedSquidIdentity;
  affectedChildren?: string[];
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requirements: {
    kyc: boolean;
    governance: boolean;
    parentalConsent: boolean;
    daoApproval: boolean;
  };
}

export interface SyncResult {
  success: boolean;
  services: {
    qonsent: boolean;
    qlock: boolean;
    qerberos: boolean;
    qindex: boolean;
    qwallet: boolean;
  };
  errors: string[];
}

export interface UpdateResult {
  success: boolean;
  updatedContexts: string[];
  errors: string[];
}

// Identity Manager Interface
export interface IdentityManagerInterface {
  // Core Identity Operations
  createSubidentity(type: IdentityType, metadata: SubidentityMetadata): Promise<SubidentityResult>;
  switchActiveIdentity(identityId: string): Promise<SwitchResult>;
  getIdentityTree(rootId: string): Promise<IdentityTree>;
  deleteSubidentity(identityId: string): Promise<DeleteResult>;
  
  // Identity Validation
  validateIdentityCreation(type: IdentityType, parentId: string): Promise<ValidationResult>;
  verifyIdentityOwnership(identityId: string, userId: string): Promise<boolean>;
  
  // Integration Coordination
  syncWithEcosystem(identity: ExtendedSquidIdentity): Promise<SyncResult>;
  updateModuleContexts(identity: ExtendedSquidIdentity): Promise<UpdateResult>;
  
  // Identity Queries
  getIdentityById(identityId: string): Promise<ExtendedSquidIdentity | null>;
  getIdentitiesByType(type: IdentityType): Promise<ExtendedSquidIdentity[]>;
  getChildIdentities(parentId: string): Promise<ExtendedSquidIdentity[]>;
  
  // Security and Audit
  logIdentityAction(identityId: string, action: IdentityAction, metadata?: any): Promise<void>;
  getAuditLog(identityId: string): Promise<AuditEntry[]>;
  flagSecurityEvent(identityId: string, flag: SecurityFlag): Promise<void>;
}

// Storage Interface
export interface IdentityStorageInterface {
  // IPFS Storage
  storeIdentityMetadata(identity: ExtendedSquidIdentity): Promise<string>; // Returns IPFS hash
  retrieveIdentityMetadata(ipfsHash: string): Promise<ExtendedSquidIdentity>;
  
  // Local Storage
  cacheIdentity(identity: ExtendedSquidIdentity): Promise<void>;
  getCachedIdentity(identityId: string): Promise<ExtendedSquidIdentity | null>;
  clearCache(identityId?: string): Promise<void>;
  
  // Session Storage
  setActiveIdentity(identity: ExtendedSquidIdentity): Promise<void>;
  getActiveIdentity(): Promise<ExtendedSquidIdentity | null>;
  clearActiveIdentity(): Promise<void>;
}

// Hook Return Types
export interface UseIdentityManagerReturn {
  identities: ExtendedSquidIdentity[];
  activeIdentity: ExtendedSquidIdentity | null;
  createSubidentity: (type: IdentityType, metadata: SubidentityMetadata) => Promise<SubidentityResult>;
  switchIdentity: (id: string) => Promise<SwitchResult>;
  deleteIdentity: (id: string) => Promise<DeleteResult>;
  loading: boolean;
  error: string | null;
}

export interface UseIdentityTreeReturn {
  tree: IdentityTreeNode | null;
  expandedNodes: string[];
  toggleNode: (nodeId: string) => void;
  selectNode: (nodeId: string) => void;
  selectedNode: string | null;
  loading: boolean;
  error: string | null;
}

export interface UseActiveIdentityReturn {
  identity: ExtendedSquidIdentity | null;
  isRoot: boolean;
  canCreateSubidentities: boolean;
  governanceType: GovernanceType;
  privacyLevel: PrivacyLevel;
  permissions: IdentityPermissions;
  loading: boolean;
}

// Event Types for Identity System
export interface IdentityEvent {
  type: 'IDENTITY_CREATED' | 'IDENTITY_SWITCHED' | 'IDENTITY_UPDATED' | 'IDENTITY_DELETED';
  identityId: string;
  timestamp: string;
  metadata?: any;
}

export interface IdentityEventHandler {
  (event: IdentityEvent): void;
}

// Error Types
export class IdentityError extends Error {
  constructor(
    message: string,
    public code: string,
    public identityId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class ValidationError extends IdentityError {
  constructor(message: string, identityId?: string, public validationErrors?: string[]) {
    super(message, 'VALIDATION_ERROR', identityId);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends IdentityError {
  constructor(message: string, identityId?: string, public requiredPermission?: string) {
    super(message, 'PERMISSION_ERROR', identityId);
    this.name = 'PermissionError';
  }
}

export class GovernanceError extends IdentityError {
  constructor(message: string, identityId?: string, public governanceRequirement?: string) {
    super(message, 'GOVERNANCE_ERROR', identityId);
    this.name = 'GovernanceError';
  }
}

// Utility Types
export type IdentityFilter = {
  type?: IdentityType;
  status?: IdentityStatus;
  privacyLevel?: PrivacyLevel;
  hasKYC?: boolean;
  parentId?: string;
  createdAfter?: string;
  createdBefore?: string;
};

export type IdentitySort = {
  field: 'name' | 'createdAt' | 'lastUsed' | 'type';
  direction: 'asc' | 'desc';
};

export type IdentityQuery = {
  filter?: IdentityFilter;
  sort?: IdentitySort;
  limit?: number;
  offset?: number;
};

// Context Switching Types
export enum ContextUpdateStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  SKIPPED = 'SKIPPED'
}

export interface ModuleContext {
  module: string;
  status: ContextUpdateStatus;
  data?: any;
  error?: string;
}

export interface ContextSwitchResult {
  success: boolean;
  switchId: string;
  previousIdentity: ExtendedSquidIdentity | null;
  newIdentity: ExtendedSquidIdentity;
  contextUpdates: Record<string, ContextUpdateStatus>;
  successfulModules: string[];
  failedModules: string[];
  warnings: string[];
  timestamp: string;
  error?: string;
  errorCode?: string;
  rollbackResult?: ContextRollbackResult;
}

export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedModules: string[];
  timestamp: string;
}

export interface ContextRollbackResult {
  success: boolean;
  switchId: string;
  rollbackResults: Record<string, boolean>;
  errors: string[];
  timestamp: string;
}

export class ContextSwitchError extends Error {
  constructor(
    message: string,
    public code: string,
    public switchId: string,
    public details?: string[],
    public rollbackResult?: ContextRollbackResult
  ) {
    super(message);
    this.name = 'ContextSwitchError';
  }
}

// Visual Feedback Types for Identity Switching
export interface IdentitySwitchFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface IdentitySwitchLoadingState {
  isLoading: boolean;
  stage: 'validating' | 'switching' | 'updating_contexts' | 'complete' | 'error';
  progress: number; // 0-100
  currentModule?: string;
  message?: string;
}

// Enhanced Switch Result with UI feedback
export interface EnhancedSwitchResult extends ContextSwitchResult {
  feedback: IdentitySwitchFeedback;
  loadingState: IdentitySwitchLoadingState;
}