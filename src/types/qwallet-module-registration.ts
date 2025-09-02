/**
 * Qwallet Module Registration Types and Interfaces
 * Provides types for module metadata, registration, and verification
 */

import { IdentityType } from './identity';

// Core Module Metadata Types
export enum ModuleStatus {
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING',
  PRODUCTION_READY = 'PRODUCTION_READY',
  DEPRECATED = 'DEPRECATED',
  SUSPENDED = 'SUSPENDED'
}

export interface ModuleCompliance {
  audit: boolean;                    // Has passed security audit
  risk_scoring: boolean;             // Supports risk assessment
  privacy_enforced: boolean;         // Enforces privacy controls
  kyc_support: boolean;              // Supports KYC requirements
  gdpr_compliant: boolean;           // GDPR compliance status
  data_retention_policy: string;     // Data retention policy reference
}

export interface QModuleMetadata {
  // Core Module Information
  module: string;                    // Module name (e.g., "Qwallet")
  version: string;                   // Semantic version (e.g., "1.0.0")
  description: string;               // Human-readable description
  
  // Ecosystem Integration
  identities_supported: IdentityType[];  // Supported identity types
  integrations: string[];            // Integrated ecosystem services
  dependencies?: string[];           // Required module dependencies
  
  // Status and Compliance
  status: ModuleStatus;              // Module status
  audit_hash: string;                // SHA256 hash of audit results
  compliance: ModuleCompliance;      // Compliance information
  
  // Documentation and Repository
  repository: string;                // Git repository URL
  documentation: string;             // IPFS CID for documentation
  changelog?: string;                // IPFS CID for changelog
  
  // Registration Metadata
  activated_by: string;              // Identity DID that registered the module
  timestamp: number;                 // Registration timestamp
  expires_at?: number;               // Optional expiration timestamp
  
  // Security and Verification
  checksum: string;                  // Module package checksum
  signature_algorithm: string;       // Signature algorithm used
  public_key_id: string;            // Public key identifier for verification
}

export interface SignedModuleMetadata {
  metadata: QModuleMetadata;
  signature: string;                 // Qlock cryptographic signature
  publicKey: string;                 // Verifying public key
  signature_type: string;            // Signature algorithm type
  signed_at: number;                 // Signature timestamp
  signer_identity: string;           // Identity DID of signer
}

// Module Registration Request Types
export interface ModuleInfo {
  name: string;
  version: string;
  description: string;
  identitiesSupported: IdentityType[];
  integrations: string[];
  repositoryUrl: string;
  documentationCid?: string;
  auditHash?: string;
  compliance?: Partial<ModuleCompliance>;
}

export interface ModuleRegistrationRequest {
  moduleInfo: ModuleInfo;
  testMode?: boolean;
  skipValidation?: boolean;
  customMetadata?: Record<string, any>;
}

// Registration Results and Status
export interface ModuleRegistrationResult {
  success: boolean;
  moduleId: string;
  cid?: string;                      // IPFS CID of stored metadata
  indexId?: string;                  // Qindex identifier
  timestamp?: string;                // Registration timestamp
  error?: string;                    // Error message if failed
  warnings?: string[];               // Non-fatal warnings
}

export interface RegistrationOptions {
  testMode?: boolean;
  skipDependencyCheck?: boolean;
  customIndexPath?: string;
  expirationTime?: number;
}

export interface RegisteredModule {
  moduleId: string;
  metadata: QModuleMetadata;
  signedMetadata: SignedModuleMetadata;
  registrationInfo: {
    cid: string;
    indexId: string;
    registeredAt: string;
    registeredBy: string;
    status: ModuleStatus;
    verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'INVALID';
    testMode?: boolean;                // Indicates if module is in sandbox/test mode
    promotedAt?: string;               // Timestamp when promoted from sandbox
    promotedFrom?: string;             // Source of promotion (e.g., 'sandbox')
  };
  accessStats: {
    queryCount: number;
    lastAccessed: string;
    dependentModules: string[];
  };
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingFields?: string[];
  invalidFields?: string[];
}

export interface VerificationResult {
  valid: boolean;
  signatureValid: boolean;
  identityVerified: boolean;
  timestampValid: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface ModuleVerificationResult {
  moduleId: string;
  status: 'production_ready' | 'testing' | 'development' | 'invalid';
  verificationChecks: {
    metadataValid: boolean;
    signatureValid: boolean;
    dependenciesResolved: boolean;
    complianceVerified: boolean;
    auditPassed: boolean;
    documentationAvailable: boolean;
  };
  issues: VerificationIssue[];
  lastVerified: string;
  verifiedBy: string;
}

export interface VerificationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

// Search and Discovery Types
export interface ModuleSearchCriteria {
  name?: string;
  type?: string;
  status?: ModuleStatus;
  identityType?: IdentityType;
  integration?: string;
  hasCompliance?: boolean;
  minVersion?: string;
  maxVersion?: string;
  includeTestMode?: boolean;          // Include sandbox/test modules in search
  limit?: number;                     // Maximum number of results
  offset?: number;                    // Pagination offset
}

export interface ModuleFilter {
  status?: ModuleStatus[];
  identityTypes?: IdentityType[];
  integrations?: string[];
  compliance?: Partial<ModuleCompliance>;
  registeredAfter?: string;
  registeredBefore?: string;
}

export interface ModuleSearchResult {
  modules: RegisteredModule[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Dependency Management Types
export interface CompatibilityResult {
  compatible: boolean;
  conflicts: DependencyConflict[];
  missingDependencies: string[];
  versionMismatches: VersionMismatch[];
}

export interface DependencyConflict {
  moduleId: string;
  conflictType: 'VERSION' | 'INCOMPATIBLE' | 'CIRCULAR';
  description: string;
  suggestion?: string;
}

export interface VersionMismatch {
  moduleId: string;
  requiredVersion: string;
  availableVersion: string;
  compatible: boolean;
}

// Registration Status Types
export interface RegistrationStatus {
  moduleId: string;
  status: ModuleStatus;
  registered: boolean;
  verified: boolean;
  lastCheck: string;
  issues: string[];
}

export interface ModuleRegistrationInfo {
  moduleId: string;
  registrationResult: ModuleRegistrationResult;
  verificationResult: ModuleVerificationResult;
  currentStatus: RegistrationStatus;
  history: RegistrationHistoryEntry[];
}

export interface RegistrationHistoryEntry {
  action: 'REGISTERED' | 'UPDATED' | 'VERIFIED' | 'DEREGISTERED' | 'STATUS_CHANGED';
  timestamp: string;
  performedBy: string;
  details: Record<string, any>;
  success: boolean;
  error?: string;
}

// Error Types
export enum ModuleRegistrationErrorCode {
  INVALID_METADATA = 'INVALID_METADATA',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  UNAUTHORIZED_SIGNER = 'UNAUTHORIZED_SIGNER',
  MODULE_ALREADY_EXISTS = 'MODULE_ALREADY_EXISTS',
  DEPENDENCY_NOT_FOUND = 'DEPENDENCY_NOT_FOUND',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  AUDIT_HASH_INVALID = 'AUDIT_HASH_INVALID',
  DOCUMENTATION_UNAVAILABLE = 'DOCUMENTATION_UNAVAILABLE',
  QINDEX_STORAGE_FAILED = 'QINDEX_STORAGE_FAILED',
  QERBEROS_LOGGING_FAILED = 'QERBEROS_LOGGING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST'
}

export enum ModuleRegistrationErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorRecoveryAction {
  action: string;
  description: string;
  automated: boolean;
  priority: number;
}

export interface ErrorContext {
  operation: string;
  moduleId?: string;
  identityId?: string;
  timestamp: string;
  attemptNumber: number;
  maxAttempts: number;
  previousErrors?: ModuleRegistrationError[];
  metadata?: any;
}

export class ModuleRegistrationError extends Error {
  public readonly timestamp: string;
  public readonly severity: ModuleRegistrationErrorSeverity;
  public readonly retryable: boolean;
  public readonly recoverable: boolean;
  public readonly suggestedActions: ErrorRecoveryAction[];
  public readonly userMessage: string;

  constructor(
    public code: ModuleRegistrationErrorCode,
    message: string,
    public moduleId?: string,
    public details?: any,
    options?: {
      severity?: ModuleRegistrationErrorSeverity;
      retryable?: boolean;
      recoverable?: boolean;
      suggestedActions?: ErrorRecoveryAction[];
      userMessage?: string;
    }
  ) {
    super(message);
    this.name = 'ModuleRegistrationError';
    this.timestamp = new Date().toISOString();
    this.severity = options?.severity || this.getDefaultSeverity(code);
    this.retryable = options?.retryable ?? this.getDefaultRetryable(code);
    this.recoverable = options?.recoverable ?? this.getDefaultRecoverable(code);
    this.suggestedActions = options?.suggestedActions || this.getDefaultActions(code);
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(code);
  }

  private getDefaultSeverity(code: ModuleRegistrationErrorCode): ModuleRegistrationErrorSeverity {
    switch (code) {
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
      case ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER:
      case ModuleRegistrationErrorCode.COMPLIANCE_CHECK_FAILED:
        return ModuleRegistrationErrorSeverity.CRITICAL;
      
      case ModuleRegistrationErrorCode.MODULE_ALREADY_EXISTS:
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
      case ModuleRegistrationErrorCode.VERSION_CONFLICT:
      case ModuleRegistrationErrorCode.DEPENDENCY_CYCLE:
        return ModuleRegistrationErrorSeverity.HIGH;
      
      case ModuleRegistrationErrorCode.INVALID_METADATA:
      case ModuleRegistrationErrorCode.AUDIT_HASH_INVALID:
      case ModuleRegistrationErrorCode.CHECKSUM_MISMATCH:
      case ModuleRegistrationErrorCode.INSUFFICIENT_PERMISSIONS:
        return ModuleRegistrationErrorSeverity.MEDIUM;
      
      default:
        return ModuleRegistrationErrorSeverity.LOW;
    }
  }

  private getDefaultRetryable(code: ModuleRegistrationErrorCode): boolean {
    const nonRetryableCodes = [
      ModuleRegistrationErrorCode.INVALID_METADATA,
      ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
      ModuleRegistrationErrorCode.MODULE_ALREADY_EXISTS,
      ModuleRegistrationErrorCode.COMPLIANCE_CHECK_FAILED,
      ModuleRegistrationErrorCode.AUDIT_HASH_INVALID,
      ModuleRegistrationErrorCode.CHECKSUM_MISMATCH,
      ModuleRegistrationErrorCode.VERSION_CONFLICT,
      ModuleRegistrationErrorCode.DEPENDENCY_CYCLE,
      ModuleRegistrationErrorCode.INSUFFICIENT_PERMISSIONS,
      ModuleRegistrationErrorCode.MALFORMED_REQUEST
    ];
    return !nonRetryableCodes.includes(code);
  }

  private getDefaultRecoverable(code: ModuleRegistrationErrorCode): boolean {
    const nonRecoverableCodes = [
      ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
      ModuleRegistrationErrorCode.INSUFFICIENT_PERMISSIONS,
      ModuleRegistrationErrorCode.DEPENDENCY_CYCLE
    ];
    return !nonRecoverableCodes.includes(code);
  }

  private getDefaultActions(code: ModuleRegistrationErrorCode): ErrorRecoveryAction[] {
    switch (code) {
      case ModuleRegistrationErrorCode.INVALID_METADATA:
        return [
          { action: 'validate_metadata', description: 'Validate and fix metadata structure', automated: false, priority: 1 },
          { action: 'check_required_fields', description: 'Ensure all required fields are present', automated: true, priority: 2 }
        ];
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        return [
          { action: 'regenerate_signature', description: 'Generate new signature with correct key', automated: true, priority: 1 },
          { action: 'verify_identity', description: 'Verify signer identity credentials', automated: false, priority: 2 }
        ];
      
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        return [
          { action: 'retry_with_backoff', description: 'Retry operation with exponential backoff', automated: true, priority: 1 },
          { action: 'check_connectivity', description: 'Verify network connectivity', automated: false, priority: 2 }
        ];
      
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
        return [
          { action: 'use_fallback_service', description: 'Switch to backup service endpoint', automated: true, priority: 1 },
          { action: 'register_in_sandbox', description: 'Register in sandbox mode temporarily', automated: true, priority: 2 }
        ];
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        return [
          { action: 'install_dependencies', description: 'Install missing module dependencies', automated: true, priority: 1 },
          { action: 'update_dependency_list', description: 'Update module dependency requirements', automated: false, priority: 2 }
        ];
      
      default:
        return [
          { action: 'retry_operation', description: 'Retry the failed operation', automated: true, priority: 1 },
          { action: 'contact_support', description: 'Contact technical support', automated: false, priority: 3 }
        ];
    }
  }

  private getDefaultUserMessage(code: ModuleRegistrationErrorCode): string {
    switch (code) {
      case ModuleRegistrationErrorCode.INVALID_METADATA:
        return 'The module information provided is incomplete or invalid. Please check all required fields.';
      
      case ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED:
        return 'Unable to verify the module signature. Please ensure you have the correct signing credentials.';
      
      case ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER:
        return 'You do not have permission to register this module. Only authorized identities can perform this action.';
      
      case ModuleRegistrationErrorCode.MODULE_ALREADY_EXISTS:
        return 'A module with this name and version already exists. Please use a different version number.';
      
      case ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND:
        return 'One or more required dependencies could not be found. Please ensure all dependencies are available.';
      
      case ModuleRegistrationErrorCode.NETWORK_ERROR:
        return 'A network error occurred while registering the module. Please check your connection and try again.';
      
      case ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE:
        return 'The registration service is temporarily unavailable. Please try again later.';
      
      default:
        return 'An error occurred during module registration. Please try again or contact support.';
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      moduleId: this.moduleId,
      severity: this.severity,
      retryable: this.retryable,
      recoverable: this.recoverable,
      suggestedActions: this.suggestedActions,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

export class ModuleValidationError extends ModuleRegistrationError {
  constructor(
    message: string,
    moduleId?: string,
    public validationErrors?: string[]
  ) {
    super(
      ModuleRegistrationErrorCode.INVALID_METADATA, 
      message, 
      moduleId,
      { validationErrors },
      {
        severity: ModuleRegistrationErrorSeverity.MEDIUM,
        retryable: false,
        recoverable: true,
        suggestedActions: [
          { action: 'fix_validation_errors', description: 'Fix the validation errors listed', automated: false, priority: 1 },
          { action: 'validate_schema', description: 'Validate against module schema', automated: true, priority: 2 }
        ],
        userMessage: 'The module metadata contains validation errors. Please fix the issues and try again.'
      }
    );
    this.name = 'ModuleValidationError';
  }
}

export class SignatureVerificationError extends ModuleRegistrationError {
  constructor(
    message: string,
    moduleId?: string,
    public signatureDetails?: any
  ) {
    super(
      ModuleRegistrationErrorCode.SIGNATURE_VERIFICATION_FAILED, 
      message, 
      moduleId,
      { signatureDetails },
      {
        severity: ModuleRegistrationErrorSeverity.CRITICAL,
        retryable: true,
        recoverable: true,
        suggestedActions: [
          { action: 'regenerate_signature', description: 'Generate a new signature', automated: true, priority: 1 },
          { action: 'verify_signing_key', description: 'Verify the signing key is correct', automated: false, priority: 2 }
        ],
        userMessage: 'The module signature could not be verified. Please check your signing credentials.'
      }
    );
    this.name = 'SignatureVerificationError';
  }
}

export class NetworkError extends ModuleRegistrationError {
  constructor(
    message: string,
    moduleId?: string,
    public networkDetails?: any
  ) {
    super(
      ModuleRegistrationErrorCode.NETWORK_ERROR,
      message,
      moduleId,
      { networkDetails },
      {
        severity: ModuleRegistrationErrorSeverity.MEDIUM,
        retryable: true,
        recoverable: true,
        suggestedActions: [
          { action: 'retry_with_backoff', description: 'Retry with exponential backoff', automated: true, priority: 1 },
          { action: 'check_network', description: 'Check network connectivity', automated: false, priority: 2 }
        ],
        userMessage: 'A network error occurred. The operation will be retried automatically.'
      }
    );
    this.name = 'NetworkError';
  }
}

export class ServiceUnavailableError extends ModuleRegistrationError {
  constructor(
    message: string,
    moduleId?: string,
    public serviceDetails?: any
  ) {
    super(
      ModuleRegistrationErrorCode.SERVICE_UNAVAILABLE,
      message,
      moduleId,
      { serviceDetails },
      {
        severity: ModuleRegistrationErrorSeverity.HIGH,
        retryable: true,
        recoverable: true,
        suggestedActions: [
          { action: 'use_fallback_mode', description: 'Use fallback registration mode', automated: true, priority: 1 },
          { action: 'wait_for_service', description: 'Wait for service to become available', automated: false, priority: 2 }
        ],
        userMessage: 'The registration service is temporarily unavailable. Attempting fallback registration.'
      }
    );
    this.name = 'ServiceUnavailableError';
  }
}

export class DependencyError extends ModuleRegistrationError {
  constructor(
    message: string,
    moduleId?: string,
    public missingDependencies?: string[]
  ) {
    super(
      ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND,
      message,
      moduleId,
      { missingDependencies },
      {
        severity: ModuleRegistrationErrorSeverity.HIGH,
        retryable: true,
        recoverable: true,
        suggestedActions: [
          { action: 'install_dependencies', description: 'Install missing dependencies', automated: true, priority: 1 },
          { action: 'update_requirements', description: 'Update dependency requirements', automated: false, priority: 2 }
        ],
        userMessage: 'Required dependencies are missing. Attempting to resolve dependencies automatically.'
      }
    );
    this.name = 'DependencyError';
  }
}

// Validation Schema Types
export interface MetadataValidationSchema {
  module: {
    type: 'string';
    required: true;
    minLength: 1;
    maxLength: 100;
    pattern?: string;
  };
  version: {
    type: 'string';
    required: true;
    pattern: string; // Semantic version pattern
  };
  description: {
    type: 'string';
    required: true;
    minLength: 10;
    maxLength: 1000;
  };
  identities_supported: {
    type: 'array';
    required: true;
    items: {
      type: 'string';
      enum: IdentityType[];
    };
    minItems: 1;
  };
  integrations: {
    type: 'array';
    required: true;
    items: {
      type: 'string';
    };
    minItems: 0;
  };
  status: {
    type: 'string';
    required: true;
    enum: ModuleStatus[];
  };
  audit_hash: {
    type: 'string';
    required: true;
    pattern: string; // SHA256 pattern
  };
  repository: {
    type: 'string';
    required: true;
    pattern: string; // URL pattern
  };
  documentation: {
    type: 'string';
    required: true;
    pattern: string; // IPFS CID pattern
  };
  activated_by: {
    type: 'string';
    required: true;
    pattern: string; // DID pattern
  };
  timestamp: {
    type: 'number';
    required: true;
    minimum: 0;
  };
  checksum: {
    type: 'string';
    required: true;
    pattern: string; // Checksum pattern
  };
  signature_algorithm: {
    type: 'string';
    required: true;
    enum: string[];
  };
  public_key_id: {
    type: 'string';
    required: true;
  };
}

export interface ComplianceValidationSchema {
  audit: {
    type: 'boolean';
    required: true;
  };
  risk_scoring: {
    type: 'boolean';
    required: true;
  };
  privacy_enforced: {
    type: 'boolean';
    required: true;
  };
  kyc_support: {
    type: 'boolean';
    required: true;
  };
  gdpr_compliant: {
    type: 'boolean';
    required: true;
  };
  data_retention_policy: {
    type: 'string';
    required: true;
    minLength: 1;
  };
}

// Utility Types
export type ModuleMetadataField = keyof QModuleMetadata;
export type ComplianceField = keyof ModuleCompliance;
export type RegistrationField = keyof ModuleRegistrationRequest;

export interface ModuleMetadataUpdate {
  field: ModuleMetadataField;
  value: any;
  timestamp: string;
  updatedBy: string;
}

export interface ModuleAccessStats {
  moduleId: string;
  totalQueries: number;
  uniqueCallers: Set<string>;
  lastAccessed: string;
  averageResponseTime: number;
  errorCount: number;
}

export interface ModuleAuditEvent {
  eventId: string;
  moduleId: string;
  action: 'REGISTERED' | 'UPDATED' | 'DEREGISTERED' | 'VERIFIED' | 'ACCESSED';
  actorIdentity: string;
  timestamp: string;
  details: Record<string, any>;
  signature?: string;
}

// Constants for validation
export const SEMANTIC_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
export const URL_PATTERN = /^https?:\/\/[^\s]+$/;
export const IPFS_CID_PATTERN = /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/;
export const DID_PATTERN = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
export const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;

export const SUPPORTED_SIGNATURE_ALGORITHMS = [
  'RSA-SHA256',
  'ECDSA-SHA256',
  'Ed25519',
  'RSA-PSS-SHA256'
] as const;

export type SupportedSignatureAlgorithm = typeof SUPPORTED_SIGNATURE_ALGORITHMS[number];

// Default values
export const DEFAULT_MODULE_COMPLIANCE: ModuleCompliance = {
  audit: false,
  risk_scoring: false,
  privacy_enforced: false,
  kyc_support: false,
  gdpr_compliant: false,
  data_retention_policy: 'default'
};

export const DEFAULT_REGISTRATION_OPTIONS: RegistrationOptions = {
  testMode: false,
  skipDependencyCheck: false,
  expirationTime: undefined
};