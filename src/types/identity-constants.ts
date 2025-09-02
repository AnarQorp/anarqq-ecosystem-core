/**
 * Identity System Constants and Configuration
 * Defines constants, limits, and configuration values for the identity system
 */

import { IdentityType, IdentityTypeRules, PrivacyLevel, GovernanceType } from './identity';

// Identity Type Rules (as defined in requirements 2.11, 2.12, 2.13, 2.14)
export const IDENTITY_TYPE_RULES: Record<IdentityType, IdentityTypeRules> = {
  [IdentityType.ROOT]: {
    kycRequired: false, // Inherits from registration
    canCreateSubidentities: true,
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.SELF,
    maxSubidentities: 50, // Reasonable limit for root identities
    requiredPermissions: ['identity.root']
  },
  [IdentityType.DAO]: {
    kycRequired: true,
    canCreateSubidentities: true, // Optional based on DAO rules
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.DAO,
    maxSubidentities: 20,
    requiredPermissions: ['identity.dao', 'kyc.verified']
  },
  [IdentityType.ENTERPRISE]: {
    kycRequired: true, // Via DAO
    canCreateSubidentities: false,
    visibility: PrivacyLevel.PUBLIC,
    governedBy: GovernanceType.DAO,
    maxSubidentities: 0,
    requiredPermissions: ['identity.enterprise', 'dao.member']
  },
  [IdentityType.CONSENTIDA]: {
    kycRequired: false, // Inherits from root
    canCreateSubidentities: false,
    visibility: PrivacyLevel.PRIVATE,
    governedBy: GovernanceType.PARENT,
    maxSubidentities: 0,
    requiredPermissions: ['identity.consentida', 'parental.consent']
  },
  [IdentityType.AID]: {
    kycRequired: true, // Root must be verified
    canCreateSubidentities: false,
    visibility: PrivacyLevel.ANONYMOUS,
    governedBy: GovernanceType.SELF,
    maxSubidentities: 0,
    requiredPermissions: ['identity.aid', 'kyc.root_verified']
  }
};

// Identity Hierarchy Limits
export const IDENTITY_HIERARCHY_LIMITS = {
  MAX_DEPTH: 5, // Maximum depth of identity tree
  MAX_CHILDREN_PER_NODE: 10, // Maximum children per identity
  MAX_TOTAL_IDENTITIES: 100, // Maximum total identities per root
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 30
} as const;

// Identity Type Hierarchy Rules (what types can create what)
export const IDENTITY_CREATION_MATRIX: Record<IdentityType, IdentityType[]> = {
  [IdentityType.ROOT]: [
    IdentityType.DAO,
    IdentityType.ENTERPRISE,
    IdentityType.CONSENTIDA,
    IdentityType.AID
  ],
  [IdentityType.DAO]: [
    IdentityType.ENTERPRISE // DAOs can create enterprise identities
  ],
  [IdentityType.ENTERPRISE]: [], // Cannot create subidentities
  [IdentityType.CONSENTIDA]: [], // Cannot create subidentities
  [IdentityType.AID]: [] // Cannot create subidentities
};

// Privacy Level Hierarchy (higher levels include lower level permissions)
export const PRIVACY_LEVEL_HIERARCHY: Record<PrivacyLevel, number> = {
  [PrivacyLevel.ANONYMOUS]: 0, // Most restrictive
  [PrivacyLevel.PRIVATE]: 1,
  [PrivacyLevel.DAO_ONLY]: 2,
  [PrivacyLevel.PUBLIC]: 3 // Least restrictive
};

// Default Qonsent Profiles per Identity Type
export const DEFAULT_QONSENT_PROFILES = {
  [IdentityType.ROOT]: {
    privacyLevel: PrivacyLevel.PUBLIC,
    dataSharing: {
      qmail: { enabled: true, level: 'STANDARD' as const, restrictions: [] },
      qsocial: { enabled: true, level: 'STANDARD' as const, restrictions: [] },
      qwallet: { enabled: true, level: 'MINIMAL' as const, restrictions: [] },
      qdrive: { enabled: true, level: 'STANDARD' as const, restrictions: [] }
    },
    visibilityRules: {
      profile: PrivacyLevel.PUBLIC,
      activity: PrivacyLevel.PUBLIC,
      connections: PrivacyLevel.PUBLIC
    }
  },
  [IdentityType.DAO]: {
    privacyLevel: PrivacyLevel.PUBLIC,
    dataSharing: {
      qmail: { enabled: true, level: 'FULL' as const, restrictions: [] },
      qsocial: { enabled: true, level: 'FULL' as const, restrictions: [] },
      qwallet: { enabled: true, level: 'STANDARD' as const, restrictions: [] },
      qdrive: { enabled: true, level: 'STANDARD' as const, restrictions: [] }
    },
    visibilityRules: {
      profile: PrivacyLevel.PUBLIC,
      activity: PrivacyLevel.DAO_ONLY,
      connections: PrivacyLevel.DAO_ONLY
    }
  },
  [IdentityType.ENTERPRISE]: {
    privacyLevel: PrivacyLevel.PUBLIC,
    dataSharing: {
      qmail: { enabled: true, level: 'STANDARD' as const, restrictions: ['external_sharing'] },
      qsocial: { enabled: true, level: 'MINIMAL' as const, restrictions: ['public_posts'] },
      qwallet: { enabled: true, level: 'STANDARD' as const, restrictions: [] },
      qdrive: { enabled: true, level: 'MINIMAL' as const, restrictions: ['public_files'] }
    },
    visibilityRules: {
      profile: PrivacyLevel.PUBLIC,
      activity: PrivacyLevel.DAO_ONLY,
      connections: PrivacyLevel.PRIVATE
    }
  },
  [IdentityType.CONSENTIDA]: {
    privacyLevel: PrivacyLevel.PRIVATE,
    dataSharing: {
      qmail: { enabled: true, level: 'MINIMAL' as const, restrictions: ['external_contacts'] },
      qsocial: { enabled: false, level: 'MINIMAL' as const, restrictions: ['all'] },
      qwallet: { enabled: false, level: 'MINIMAL' as const, restrictions: ['all'] },
      qdrive: { enabled: true, level: 'MINIMAL' as const, restrictions: ['sharing'] }
    },
    visibilityRules: {
      profile: PrivacyLevel.PRIVATE,
      activity: PrivacyLevel.PRIVATE,
      connections: PrivacyLevel.PRIVATE
    }
  },
  [IdentityType.AID]: {
    privacyLevel: PrivacyLevel.ANONYMOUS,
    dataSharing: {
      qmail: { enabled: true, level: 'MINIMAL' as const, restrictions: ['metadata_collection'] },
      qsocial: { enabled: true, level: 'MINIMAL' as const, restrictions: ['profile_linking'] },
      qwallet: { enabled: true, level: 'MINIMAL' as const, restrictions: ['transaction_history'] },
      qdrive: { enabled: true, level: 'MINIMAL' as const, restrictions: ['file_metadata'] }
    },
    visibilityRules: {
      profile: PrivacyLevel.ANONYMOUS,
      activity: PrivacyLevel.ANONYMOUS,
      connections: PrivacyLevel.ANONYMOUS
    }
  }
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  // Password/Key Requirements
  MIN_KEY_SIZE: 2048,
  PREFERRED_KEY_SIZE: 4096,
  KEY_ALGORITHMS: ['RSA', 'ECDSA', 'QUANTUM'] as const,
  DEFAULT_KEY_ALGORITHM: 'RSA' as const,
  
  // Session Management
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  INACTIVE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  MAX_CONCURRENT_SESSIONS: 5,
  
  // Audit Configuration
  AUDIT_RETENTION_DAYS: 365,
  SECURITY_LOG_LEVEL: 'MEDIUM' as const,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 5, // Number of suspicious actions before flagging
  
  // Rate Limiting
  MAX_IDENTITY_SWITCHES_PER_HOUR: 20,
  MAX_IDENTITY_CREATIONS_PER_DAY: 5,
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Encryption
  DEFAULT_ENCRYPTION_ALGORITHM: 'AES-256-GCM' as const,
  KEY_DERIVATION_ITERATIONS: 100000,
  SALT_LENGTH: 32
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  DID: /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NAME: /^[a-zA-Z0-9\s\-_.]{2,50}$/,
  TAG: /^[a-zA-Z0-9\-_]{1,30}$/,
  IPFS_HASH: /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Validation Errors
  INVALID_IDENTITY_TYPE: 'Invalid identity type specified',
  INVALID_PARENT_TYPE: 'Parent identity type cannot create this child type',
  MAX_DEPTH_EXCEEDED: 'Maximum identity tree depth exceeded',
  MAX_CHILDREN_EXCEEDED: 'Maximum children per identity exceeded',
  INVALID_NAME: 'Identity name must be 2-50 characters and contain only letters, numbers, spaces, hyphens, underscores, and periods',
  INVALID_DID: 'Invalid DID format',
  DUPLICATE_NAME: 'Identity name already exists in this context',
  
  // Permission Errors
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
  KYC_REQUIRED: 'KYC verification required for this identity type',
  GOVERNANCE_APPROVAL_REQUIRED: 'DAO governance approval required',
  PARENTAL_CONSENT_REQUIRED: 'Parental consent required for this identity type',
  
  // Security Errors
  SUSPICIOUS_ACTIVITY: 'Suspicious activity detected',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, please try again later',
  SESSION_EXPIRED: 'Session has expired, please authenticate again',
  INVALID_SIGNATURE: 'Invalid digital signature',
  
  // System Errors
  IDENTITY_NOT_FOUND: 'Identity not found',
  PARENT_NOT_FOUND: 'Parent identity not found',
  CIRCULAR_REFERENCE: 'Circular reference detected in identity hierarchy',
  STORAGE_ERROR: 'Error storing identity data',
  NETWORK_ERROR: 'Network error occurred',
  INTEGRATION_ERROR: 'Error integrating with ecosystem service'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  IDENTITY_CREATED: 'Identity created successfully',
  IDENTITY_SWITCHED: 'Identity switched successfully',
  IDENTITY_UPDATED: 'Identity updated successfully',
  IDENTITY_DELETED: 'Identity deleted successfully',
  KYC_SUBMITTED: 'KYC documents submitted successfully',
  KYC_APPROVED: 'KYC verification approved',
  GOVERNANCE_APPROVED: 'Governance approval received'
} as const;

// Module Integration Configuration
export const MODULE_INTEGRATION_CONFIG = {
  qonsent: {
    enabled: true,
    endpoint: '/api/qonsent',
    timeout: 5000,
    retries: 3
  },
  qlock: {
    enabled: true,
    endpoint: '/api/qlock',
    timeout: 10000,
    retries: 2
  },
  qerberos: {
    enabled: true,
    endpoint: '/api/qerberos',
    timeout: 3000,
    retries: 3
  },
  qindex: {
    enabled: true,
    endpoint: '/api/qindex',
    timeout: 5000,
    retries: 2
  },
  qwallet: {
    enabled: true,
    endpoint: '/api/qwallet',
    timeout: 8000,
    retries: 2
  }
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  IDENTITY_CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  TREE_CACHE_TTL: 15 * 60 * 1000, // 15 minutes
  QONSENT_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  MAX_CACHE_SIZE: 1000, // Maximum number of cached items
  CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000 // 5 minutes
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
  IDENTITY_SWITCH_MAX_TIME: 2000, // 2 seconds
  TREE_BUILD_MAX_TIME: 1000, // 1 second
  VALIDATION_MAX_TIME: 500, // 500ms
  STORAGE_OPERATION_MAX_TIME: 3000, // 3 seconds
  NETWORK_REQUEST_MAX_TIME: 10000 // 10 seconds
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_QUANTUM_ENCRYPTION: false,
  ENABLE_BIOMETRIC_AUTH: false,
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_EXPERIMENTAL_FEATURES: false,
  ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development'
} as const;

// Development/Testing Configuration
export const DEV_CONFIG = {
  MOCK_KYC_VERIFICATION: true,
  MOCK_DAO_GOVERNANCE: true,
  SKIP_RATE_LIMITING: true,
  ENABLE_TEST_IDENTITIES: true,
  LOG_LEVEL: 'DEBUG' as const
} as const;

// Export all constants as a single object for easy importing
export const IDENTITY_CONSTANTS = {
  IDENTITY_TYPE_RULES,
  IDENTITY_HIERARCHY_LIMITS,
  IDENTITY_CREATION_MATRIX,
  PRIVACY_LEVEL_HIERARCHY,
  DEFAULT_QONSENT_PROFILES,
  SECURITY_CONFIG,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  MODULE_INTEGRATION_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_THRESHOLDS,
  FEATURE_FLAGS,
  DEV_CONFIG
} as const;