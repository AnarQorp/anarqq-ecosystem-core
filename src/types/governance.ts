/**
 * Governance Rules and Validation Types
 * Defines governance structures, rules, and validation logic for identity management
 */

import { IdentityType, GovernanceType, ExtendedSquidIdentity } from './identity';

// Governance Rule Definitions
export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  type: GovernanceRuleType;
  scope: GovernanceScope;
  conditions: GovernanceCondition[];
  actions: GovernanceAction[];
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export enum GovernanceRuleType {
  CREATION_RULE = 'CREATION_RULE',
  MODIFICATION_RULE = 'MODIFICATION_RULE',
  DELETION_RULE = 'DELETION_RULE',
  ACCESS_RULE = 'ACCESS_RULE',
  PERMISSION_RULE = 'PERMISSION_RULE',
  COMPLIANCE_RULE = 'COMPLIANCE_RULE'
}

export enum GovernanceScope {
  GLOBAL = 'GLOBAL',
  DAO = 'DAO',
  ENTERPRISE = 'ENTERPRISE',
  FAMILY = 'FAMILY',
  INDIVIDUAL = 'INDIVIDUAL'
}

export interface GovernanceCondition {
  type: 'IDENTITY_TYPE' | 'KYC_STATUS' | 'PARENT_TYPE' | 'DEPTH_LIMIT' | 'AGE_REQUIREMENT' | 'DAO_MEMBERSHIP';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN' | 'EXISTS' | 'NOT_EXISTS';
  value: any;
  metadata?: Record<string, any>;
}

export interface GovernanceAction {
  type: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'REQUIRE_KYC' | 'REQUIRE_SIGNATURE' | 'LOG_EVENT' | 'NOTIFY';
  parameters?: Record<string, any>;
  message?: string;
}

// DAO Governance
export interface DAOGovernance {
  daoId: string;
  name: string;
  type: 'STANDARD' | 'ENTERPRISE' | 'COMMUNITY';
  governanceModel: 'DEMOCRATIC' | 'DELEGATED' | 'HIERARCHICAL' | 'CONSENSUS';
  
  // Voting Configuration
  voting: {
    quorum: number; // Minimum percentage of members required
    threshold: number; // Percentage required to pass
    votingPeriod: number; // Hours
    proposalDelay: number; // Hours before voting starts
  };
  
  // Identity Management Rules
  identityRules: {
    allowedTypes: IdentityType[];
    requiresApproval: IdentityType[];
    maxIdentitiesPerMember: number;
    kycRequirements: Record<IdentityType, KYCRequirement>;
  };
  
  // Member Management
  members: DAOMember[];
  roles: DAORole[];
  
  // Governance History
  proposals: GovernanceProposal[];
  decisions: GovernanceDecision[];
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    constitution?: string; // IPFS hash of DAO constitution
    website?: string;
    description?: string;
  };
}

export interface DAOMember {
  identityId: string;
  joinedAt: string;
  roles: string[];
  votingPower: number;
  reputation: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPELLED';
  delegatedTo?: string; // Identity ID of delegate
}

export interface DAORole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  votingPower: number;
  canCreateProposals: boolean;
  canApproveIdentities: boolean;
  canModifyGovernance: boolean;
}

export interface GovernanceProposal {
  id: string;
  type: 'IDENTITY_CREATION' | 'IDENTITY_MODIFICATION' | 'RULE_CHANGE' | 'MEMBER_ACTION' | 'GENERAL';
  title: string;
  description: string;
  proposedBy: string;
  targetIdentityId?: string;
  
  // Voting Details
  votingStartsAt: string;
  votingEndsAt: string;
  votes: ProposalVote[];
  status: 'DRAFT' | 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED';
  
  // Execution
  executedAt?: string;
  executedBy?: string;
  executionResult?: any;
  
  metadata: {
    createdAt: string;
    ipfsHash?: string; // Full proposal details
    attachments?: string[];
  };
}

export interface ProposalVote {
  voterId: string;
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
  votingPower: number;
  timestamp: string;
  reason?: string;
  signature: string;
}

export interface GovernanceDecision {
  id: string;
  proposalId: string;
  decision: 'APPROVED' | 'REJECTED';
  finalVotes: {
    for: number;
    against: number;
    abstain: number;
    total: number;
  };
  executedAt: string;
  executedBy: string;
  impact: string[];
  metadata?: Record<string, any>;
}

// Parental Governance (for Consentida identities)
export interface ParentalGovernance {
  parentIdentityId: string;
  childIdentityId: string;
  
  // Consent and Permissions
  consentGiven: boolean;
  consentTimestamp: string;
  consentSignature: string;
  
  // Age and Legal Requirements
  childAge?: number;
  legalGuardian: boolean;
  jurisdictionRules: string; // Legal framework being followed
  
  // Control Settings
  controls: {
    canCreateSubidentities: boolean;
    canModifyProfile: boolean;
    canAccessModules: string[];
    canShareData: boolean;
    requiresApprovalFor: string[];
  };
  
  // Monitoring and Reporting
  monitoring: {
    activityReports: boolean;
    reportFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    alertOnSuspiciousActivity: boolean;
  };
  
  // Expiration and Transition
  expiresAt?: string; // When parental control ends
  transitionPlan?: {
    ageOfMajority: number;
    automaticTransition: boolean;
    requiresConfirmation: boolean;
  };
}

// KYC Requirements
export interface KYCRequirement {
  level: 'NONE' | 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  documents: KYCDocument[];
  verificationMethods: KYCVerificationMethod[];
  validityPeriod: number; // Days
  renewalRequired: boolean;
}

export interface KYCDocument {
  type: 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'BANK_STATEMENT' | 'BUSINESS_REGISTRATION';
  required: boolean;
  acceptedFormats: string[];
  maxAge: number; // Days
  verificationLevel: 'AUTOMATED' | 'MANUAL' | 'NOTARIZED';
}

export enum KYCVerificationMethod {
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  VIDEO_CALL = 'VIDEO_CALL',
  BIOMETRIC_SCAN = 'BIOMETRIC_SCAN',
  THIRD_PARTY_VERIFICATION = 'THIRD_PARTY_VERIFICATION',
  BLOCKCHAIN_VERIFICATION = 'BLOCKCHAIN_VERIFICATION'
}

// Governance Validation
export interface GovernanceValidationResult {
  valid: boolean;
  errors: GovernanceValidationError[];
  warnings: GovernanceValidationWarning[];
  requirements: GovernanceRequirement[];
  approvals: ApprovalRequirement[];
}

export interface GovernanceValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rule?: string;
}

export interface GovernanceValidationWarning {
  code: string;
  message: string;
  recommendation?: string;
  rule?: string;
}

export interface GovernanceRequirement {
  type: 'KYC' | 'APPROVAL' | 'SIGNATURE' | 'WAITING_PERIOD' | 'DOCUMENTATION';
  description: string;
  deadline?: string;
  responsible?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface ApprovalRequirement {
  type: 'DAO_VOTE' | 'PARENTAL_CONSENT' | 'ADMIN_APPROVAL' | 'PEER_REVIEW';
  approvers: string[];
  threshold: number;
  deadline: string;
  currentApprovals: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

// Governance Engine Interface
export interface GovernanceEngine {
  // Rule Management
  addRule(rule: GovernanceRule): Promise<void>;
  updateRule(ruleId: string, updates: Partial<GovernanceRule>): Promise<void>;
  removeRule(ruleId: string): Promise<void>;
  getRules(scope?: GovernanceScope): Promise<GovernanceRule[]>;
  
  // Validation
  validateIdentityOperation(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    identity: ExtendedSquidIdentity,
    context?: any
  ): Promise<GovernanceValidationResult>;
  
  // DAO Management
  createDAO(governance: Omit<DAOGovernance, 'daoId'>): Promise<string>;
  updateDAO(daoId: string, updates: Partial<DAOGovernance>): Promise<void>;
  getDAO(daoId: string): Promise<DAOGovernance | null>;
  
  // Proposal Management
  createProposal(daoId: string, proposal: Omit<GovernanceProposal, 'id'>): Promise<string>;
  vote(proposalId: string, vote: Omit<ProposalVote, 'timestamp'>): Promise<void>;
  executeProposal(proposalId: string): Promise<GovernanceDecision>;
  
  // Parental Controls
  establishParentalControl(control: ParentalGovernance): Promise<void>;
  updateParentalControl(childId: string, updates: Partial<ParentalGovernance>): Promise<void>;
  removeParentalControl(childId: string): Promise<void>;
  
  // KYC Management
  submitKYC(identityId: string, documents: KYCSubmission[]): Promise<string>;
  verifyKYC(submissionId: string, result: KYCVerificationResult): Promise<void>;
  getKYCStatus(identityId: string): Promise<KYCStatus>;
}

export interface KYCSubmission {
  documentType: string;
  documentData: string; // Base64 encoded or IPFS hash
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
}

export interface KYCVerificationResult {
  verified: boolean;
  level: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  verifiedBy: string;
  verificationMethod: KYCVerificationMethod;
  confidence: number; // 0-1
  issues?: string[];
  expiresAt: string;
}

export interface KYCStatus {
  identityId: string;
  level: 'NONE' | 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  status: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  submittedAt?: string;
  verifiedAt?: string;
  expiresAt?: string;
  documents: KYCDocumentStatus[];
  verificationHistory: KYCVerificationResult[];
}

export interface KYCDocumentStatus {
  type: string;
  status: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  submittedAt?: string;
  verifiedAt?: string;
  issues?: string[];
}

// Governance Events
export interface GovernanceEvent {
  type: 'RULE_ADDED' | 'RULE_UPDATED' | 'PROPOSAL_CREATED' | 'VOTE_CAST' | 'DECISION_MADE' | 'KYC_SUBMITTED' | 'KYC_VERIFIED';
  entityId: string; // Rule ID, Proposal ID, etc.
  actorId: string; // Who performed the action
  timestamp: string;
  metadata?: any;
}

export interface GovernanceEventHandler {
  (event: GovernanceEvent): void;
}

// Governance Configuration
export interface GovernanceConfiguration {
  // Global Settings
  globalRules: GovernanceRule[];
  defaultKYCRequirements: Record<IdentityType, KYCRequirement>;
  
  // DAO Settings
  daoCreationRules: GovernanceRule[];
  defaultDAOConfiguration: Partial<DAOGovernance>;
  
  // Parental Control Settings
  parentalControlRules: GovernanceRule[];
  ageOfMajority: number;
  
  // Validation Settings
  strictValidation: boolean;
  allowOverrides: boolean;
  auditAllActions: boolean;
  
  // Integration Settings
  qerberosLogging: boolean;
  qindexRegistration: boolean;
  qonsentIntegration: boolean;
}

// Utility Types
export type GovernanceContext = {
  actorId: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
};

export type GovernanceFilter = {
  scope?: GovernanceScope;
  type?: GovernanceRuleType;
  active?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  createdBy?: string;
};

export type GovernanceSort = {
  field: 'name' | 'createdAt' | 'updatedAt' | 'priority';
  direction: 'asc' | 'desc';
};

export type GovernanceQuery = {
  filter?: GovernanceFilter;
  sort?: GovernanceSort;
  limit?: number;
  offset?: number;
};