/**
 * Key Management Models - Unified cryptographic key management
 * 
 * Provides standardized interfaces for KMS/HSM integration,
 * key rotation, and post-quantum cryptographic readiness.
 */

/**
 * Supported key management providers
 */
export type KMSProvider = 
  | 'AWS_KMS' 
  | 'AZURE_KEY_VAULT' 
  | 'HASHICORP_VAULT' 
  | 'HSM' 
  | 'LOCAL_DEV';

/**
 * Supported cryptographic algorithms
 */
export type CryptographicAlgorithm = 
  // Classical algorithms
  | 'Ed25519'
  | 'ECDSA-secp256k1'
  | 'RSA-2048'
  | 'RSA-4096'
  | 'AES-256-GCM'
  | 'ChaCha20-Poly1305'
  // Post-quantum algorithms
  | 'Dilithium2'
  | 'Dilithium3'
  | 'Dilithium5'
  | 'Falcon-512'
  | 'Falcon-1024'
  | 'Kyber512'
  | 'Kyber768'
  | 'Kyber1024';

/**
 * Key usage types
 */
export type KeyUsage = 
  | 'SIGNING'
  | 'ENCRYPTION'
  | 'KEY_DERIVATION'
  | 'AUTHENTICATION'
  | 'TRANSPORT';

/**
 * Environment scoping for keys
 */
export type Environment = 'dev' | 'staging' | 'prod';

/**
 * Key metadata interface
 */
export interface KeyMetadata {
  /** Unique key identifier */
  keyId: string;
  /** Key usage purpose */
  usage: KeyUsage;
  /** Cryptographic algorithm */
  algorithm: CryptographicAlgorithm;
  /** Environment scope */
  environment: Environment;
  /** Key creation timestamp */
  createdAt: string;
  /** Key expiration timestamp */
  expiresAt?: string;
  /** Key rotation schedule */
  rotationSchedule: string; // ISO 8601 duration (e.g., 'P30D')
  /** Key status */
  status: 'ACTIVE' | 'ROTATING' | 'DEPRECATED' | 'REVOKED';
  /** Associated identity or service */
  owner: string;
  /** Key version for rotation tracking */
  version: number;
  /** Previous key ID for rotation chain */
  previousKeyId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Key management policy configuration
 */
export interface KeyManagementPolicy {
  /** Environment-specific configurations */
  environments: {
    [env in Environment]: {
      /** KMS provider for this environment */
      kmsProvider: KMSProvider;
      /** Key rotation schedules by usage type */
      keyRotationSchedule: {
        [usage in KeyUsage]: string; // ISO 8601 duration
      };
      /** Backup and recovery settings */
      backupPolicy: {
        enabled: boolean;
        retentionPeriod: string; // ISO 8601 duration
        encryptionRequired: boolean;
      };
      /** Audit logging configuration */
      auditPolicy: {
        enabled: boolean;
        immutableStorage: boolean;
        retentionPeriod: string; // ISO 8601 duration
      };
    };
  };
  /** Post-quantum cryptography settings */
  pqcPolicy: {
    enabled: boolean;
    migrationDeadline?: string; // ISO 8601 date
    hybridMode: boolean; // Use both classical and PQC algorithms
    preferredAlgorithms: {
      signing: CryptographicAlgorithm[];
      encryption: CryptographicAlgorithm[];
    };
  };
  /** Key validation rules */
  validationRules: {
    minimumKeyStrength: number;
    allowedAlgorithms: CryptographicAlgorithm[];
    maxKeyAge: string; // ISO 8601 duration
    requireHSM: boolean;
  };
}

/**
 * Key operation audit event
 */
export interface KeyAuditEvent {
  /** Event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: string;
  /** Key ID involved in operation */
  keyId: string;
  /** Operation type */
  operation: 'CREATE' | 'USE' | 'ROTATE' | 'REVOKE' | 'BACKUP' | 'RESTORE';
  /** Actor performing the operation */
  actor: {
    type: 'USER' | 'SERVICE' | 'SYSTEM';
    id: string;
    ip?: string;
  };
  /** Operation result */
  result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  /** Additional context */
  context: {
    environment: Environment;
    algorithm?: CryptographicAlgorithm;
    usage?: KeyUsage;
    errorCode?: string;
    errorMessage?: string;
  };
  /** Immutable storage reference */
  auditCid?: string;
}

/**
 * Key rotation request
 */
export interface KeyRotationRequest {
  /** Key to rotate */
  keyId: string;
  /** Reason for rotation */
  reason: 'SCHEDULED' | 'COMPROMISE' | 'POLICY' | 'MANUAL';
  /** New key algorithm (if changing) */
  newAlgorithm?: CryptographicAlgorithm;
  /** Grace period for old key */
  gracePeriod?: string; // ISO 8601 duration
  /** Immediate rotation flag */
  immediate: boolean;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  /** Original key ID */
  oldKeyId: string;
  /** New key ID */
  newKeyId: string;
  /** Rotation timestamp */
  rotatedAt: string;
  /** Grace period end */
  gracePeriodEnd?: string;
  /** Migration status */
  migrationStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** Affected services/components */
  affectedServices: string[];
}

/**
 * KMS provider configuration
 */
export interface KMSConfig {
  /** Provider type */
  provider: KMSProvider;
  /** Provider-specific configuration */
  config: {
    // AWS KMS
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    kmsKeyId?: string;
    
    // Azure Key Vault
    vaultUrl?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    
    // HashiCorp Vault
    vaultAddr?: string;
    vaultToken?: string;
    mountPath?: string;
    
    // HSM
    hsmSlot?: number;
    hsmPin?: string;
    hsmLibrary?: string;
    
    // Local development
    keyStorePath?: string;
  };
  /** Connection timeout */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  /** Base key ID */
  baseKeyId: string;
  /** Derivation path */
  derivationPath: string;
  /** Derived key usage */
  usage: KeyUsage;
  /** Additional context for derivation */
  context?: Record<string, any>;
}

/**
 * Post-quantum cryptography migration status
 */
export interface PQCMigrationStatus {
  /** Migration phase */
  phase: 'PLANNING' | 'HYBRID' | 'MIGRATION' | 'COMPLETE';
  /** Overall progress percentage */
  progress: number;
  /** Keys migrated by algorithm */
  keysMigrated: {
    [algorithm in CryptographicAlgorithm]?: number;
  };
  /** Services migrated */
  servicesMigrated: string[];
  /** Migration deadline */
  deadline?: string;
  /** Estimated completion */
  estimatedCompletion?: string;
}

/**
 * Validates key metadata
 */
export function isValidKeyMetadata(metadata: any): metadata is KeyMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    typeof metadata.keyId === 'string' &&
    metadata.keyId.length > 0 &&
    typeof metadata.usage === 'string' &&
    ['SIGNING', 'ENCRYPTION', 'KEY_DERIVATION', 'AUTHENTICATION', 'TRANSPORT'].includes(metadata.usage) &&
    typeof metadata.algorithm === 'string' &&
    typeof metadata.environment === 'string' &&
    ['dev', 'staging', 'prod'].includes(metadata.environment) &&
    typeof metadata.createdAt === 'string' &&
    typeof metadata.rotationSchedule === 'string' &&
    typeof metadata.status === 'string' &&
    ['ACTIVE', 'ROTATING', 'DEPRECATED', 'REVOKED'].includes(metadata.status) &&
    typeof metadata.owner === 'string' &&
    typeof metadata.version === 'number' &&
    metadata.version > 0
  );
}

/**
 * Validates key audit event
 */
export function isValidKeyAuditEvent(event: any): event is KeyAuditEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.eventId === 'string' &&
    event.eventId.length > 0 &&
    typeof event.timestamp === 'string' &&
    typeof event.keyId === 'string' &&
    event.keyId.length > 0 &&
    typeof event.operation === 'string' &&
    ['CREATE', 'USE', 'ROTATE', 'REVOKE', 'BACKUP', 'RESTORE'].includes(event.operation) &&
    typeof event.actor === 'object' &&
    event.actor !== null &&
    typeof event.result === 'string' &&
    ['SUCCESS', 'FAILURE', 'PARTIAL'].includes(event.result) &&
    typeof event.context === 'object' &&
    event.context !== null
  );
}