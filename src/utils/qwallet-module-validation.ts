/**
 * Qwallet Module Registration Validation Utilities
 * Provides validation schemas and functions for module metadata
 */

import {
  QModuleMetadata,
  ModuleCompliance,
  ModuleInfo,
  ModuleRegistrationRequest,
  SignedModuleMetadata,
  ValidationResult,
  VerificationResult,
  ModuleStatus,
  ModuleValidationError,
  SignatureVerificationError,
  SEMANTIC_VERSION_PATTERN,
  SHA256_PATTERN,
  URL_PATTERN,
  IPFS_CID_PATTERN,
  DID_PATTERN,
  CHECKSUM_PATTERN,
  SUPPORTED_SIGNATURE_ALGORITHMS,
  SupportedSignatureAlgorithm
} from '../types/qwallet-module-registration';
import { IdentityType } from '../types/identity';

// Validation Schema Definitions
export const METADATA_VALIDATION_SCHEMA = {
  module: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/
  },
  version: {
    type: 'string' as const,
    required: true,
    pattern: SEMANTIC_VERSION_PATTERN
  },
  description: {
    type: 'string' as const,
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  identities_supported: {
    type: 'array' as const,
    required: true,
    items: {
      type: 'string' as const,
      enum: Object.values(IdentityType)
    },
    minItems: 1
  },
  integrations: {
    type: 'array' as const,
    required: true,
    items: {
      type: 'string' as const
    },
    minItems: 0
  },
  status: {
    type: 'string' as const,
    required: true,
    enum: Object.values(ModuleStatus)
  },
  audit_hash: {
    type: 'string' as const,
    required: true,
    pattern: SHA256_PATTERN
  },
  repository: {
    type: 'string' as const,
    required: true,
    pattern: URL_PATTERN
  },
  documentation: {
    type: 'string' as const,
    required: true,
    pattern: IPFS_CID_PATTERN
  },
  activated_by: {
    type: 'string' as const,
    required: true,
    pattern: DID_PATTERN
  },
  timestamp: {
    type: 'number' as const,
    required: true,
    minimum: 0
  },
  checksum: {
    type: 'string' as const,
    required: true,
    pattern: CHECKSUM_PATTERN
  },
  signature_algorithm: {
    type: 'string' as const,
    required: true,
    enum: SUPPORTED_SIGNATURE_ALGORITHMS
  },
  public_key_id: {
    type: 'string' as const,
    required: true,
    minLength: 1
  }
};

export const COMPLIANCE_VALIDATION_SCHEMA = {
  audit: {
    type: 'boolean' as const,
    required: true
  },
  risk_scoring: {
    type: 'boolean' as const,
    required: true
  },
  privacy_enforced: {
    type: 'boolean' as const,
    required: true
  },
  kyc_support: {
    type: 'boolean' as const,
    required: true
  },
  gdpr_compliant: {
    type: 'boolean' as const,
    required: true
  },
  data_retention_policy: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 500
  }
};

// Validation Functions
export class ModuleMetadataValidator {
  /**
   * Validates complete QModuleMetadata object
   */
  static validateMetadata(metadata: QModuleMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    try {
      // Validate required fields
      const requiredFields = Object.keys(METADATA_VALIDATION_SCHEMA).filter(
        key => METADATA_VALIDATION_SCHEMA[key as keyof typeof METADATA_VALIDATION_SCHEMA].required
      );

      for (const field of requiredFields) {
        if (!(field in metadata) || metadata[field as keyof QModuleMetadata] === undefined || metadata[field as keyof QModuleMetadata] === null) {
          missingFields.push(field);
          errors.push(`Required field '${field}' is missing`);
        }
      }

      // Validate individual fields
      if (metadata.module !== undefined) {
        const moduleValidation = this.validateStringField(metadata.module, METADATA_VALIDATION_SCHEMA.module, 'module');
        if (!moduleValidation.valid) {
          invalidFields.push('module');
          errors.push(...moduleValidation.errors);
        }
      }

      if (metadata.version !== undefined) {
        const versionValidation = this.validateStringField(metadata.version, METADATA_VALIDATION_SCHEMA.version, 'version');
        if (!versionValidation.valid) {
          invalidFields.push('version');
          errors.push(...versionValidation.errors);
        }
      }

      if (metadata.description !== undefined) {
        const descriptionValidation = this.validateStringField(metadata.description, METADATA_VALIDATION_SCHEMA.description, 'description');
        if (!descriptionValidation.valid) {
          invalidFields.push('description');
          errors.push(...descriptionValidation.errors);
        }
      }

      if (metadata.identities_supported !== undefined) {
        const identitiesValidation = this.validateArrayField(metadata.identities_supported, METADATA_VALIDATION_SCHEMA.identities_supported, 'identities_supported');
        if (!identitiesValidation.valid) {
          invalidFields.push('identities_supported');
          errors.push(...identitiesValidation.errors);
        }
      }

      if (metadata.integrations !== undefined) {
        const integrationsValidation = this.validateArrayField(metadata.integrations, METADATA_VALIDATION_SCHEMA.integrations, 'integrations');
        if (!integrationsValidation.valid) {
          invalidFields.push('integrations');
          errors.push(...integrationsValidation.errors);
        }
      }

      if (metadata.status !== undefined) {
        if (!Object.values(ModuleStatus).includes(metadata.status)) {
          invalidFields.push('status');
          errors.push(`Invalid status '${metadata.status}'. Must be one of: ${Object.values(ModuleStatus).join(', ')}`);
        }
      }

      if (metadata.audit_hash !== undefined) {
        const auditHashValidation = this.validateStringField(metadata.audit_hash, METADATA_VALIDATION_SCHEMA.audit_hash, 'audit_hash');
        if (!auditHashValidation.valid) {
          invalidFields.push('audit_hash');
          errors.push(...auditHashValidation.errors);
        }
      }

      if (metadata.repository !== undefined) {
        const repositoryValidation = this.validateStringField(metadata.repository, METADATA_VALIDATION_SCHEMA.repository, 'repository');
        if (!repositoryValidation.valid) {
          invalidFields.push('repository');
          errors.push(...repositoryValidation.errors);
        }
      }

      if (metadata.documentation !== undefined) {
        const documentationValidation = this.validateStringField(metadata.documentation, METADATA_VALIDATION_SCHEMA.documentation, 'documentation');
        if (!documentationValidation.valid) {
          invalidFields.push('documentation');
          errors.push(...documentationValidation.errors);
        }
      }

      if (metadata.activated_by !== undefined) {
        const activatedByValidation = this.validateStringField(metadata.activated_by, METADATA_VALIDATION_SCHEMA.activated_by, 'activated_by');
        if (!activatedByValidation.valid) {
          invalidFields.push('activated_by');
          errors.push(...activatedByValidation.errors);
        }
      }

      if (metadata.timestamp !== undefined) {
        const timestampValidation = this.validateNumberField(metadata.timestamp, METADATA_VALIDATION_SCHEMA.timestamp, 'timestamp');
        if (!timestampValidation.valid) {
          invalidFields.push('timestamp');
          errors.push(...timestampValidation.errors);
        }
      }

      if (metadata.checksum !== undefined) {
        const checksumValidation = this.validateStringField(metadata.checksum, METADATA_VALIDATION_SCHEMA.checksum, 'checksum');
        if (!checksumValidation.valid) {
          invalidFields.push('checksum');
          errors.push(...checksumValidation.errors);
        }
      }

      if (metadata.signature_algorithm !== undefined) {
        if (!SUPPORTED_SIGNATURE_ALGORITHMS.includes(metadata.signature_algorithm as SupportedSignatureAlgorithm)) {
          invalidFields.push('signature_algorithm');
          errors.push(`Invalid signature algorithm '${metadata.signature_algorithm}'. Must be one of: ${SUPPORTED_SIGNATURE_ALGORITHMS.join(', ')}`);
        }
      }

      if (metadata.public_key_id !== undefined) {
        const publicKeyIdValidation = this.validateStringField(metadata.public_key_id, METADATA_VALIDATION_SCHEMA.public_key_id, 'public_key_id');
        if (!publicKeyIdValidation.valid) {
          invalidFields.push('public_key_id');
          errors.push(...publicKeyIdValidation.errors);
        }
      }

      // Validate compliance object
      if (metadata.compliance) {
        const complianceValidation = this.validateCompliance(metadata.compliance);
        if (!complianceValidation.valid) {
          invalidFields.push('compliance');
          errors.push(...complianceValidation.errors);
        }
      }

      // Optional field validations with warnings
      if (metadata.dependencies && metadata.dependencies.length === 0) {
        warnings.push('Module has no dependencies - ensure this is intentional');
      }

      if (metadata.expires_at && metadata.expires_at <= Date.now()) {
        warnings.push('Module expiration timestamp is in the past');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        missingFields,
        invalidFields
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        missingFields,
        invalidFields
      };
    }
  }

  /**
   * Validates ModuleCompliance object
   */
  static validateCompliance(compliance: ModuleCompliance): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    try {
      const requiredFields = Object.keys(COMPLIANCE_VALIDATION_SCHEMA).filter(
        key => COMPLIANCE_VALIDATION_SCHEMA[key as keyof typeof COMPLIANCE_VALIDATION_SCHEMA].required
      );

      for (const field of requiredFields) {
        if (!(field in compliance) || compliance[field as keyof ModuleCompliance] === undefined || compliance[field as keyof ModuleCompliance] === null) {
          missingFields.push(field);
          errors.push(`Required compliance field '${field}' is missing`);
        }
      }

      // Validate boolean fields
      const booleanFields: (keyof ModuleCompliance)[] = ['audit', 'risk_scoring', 'privacy_enforced', 'kyc_support', 'gdpr_compliant'];
      for (const field of booleanFields) {
        if (compliance[field] !== undefined && typeof compliance[field] !== 'boolean') {
          invalidFields.push(field);
          errors.push(`Compliance field '${field}' must be a boolean`);
        }
      }

      // Validate data retention policy
      if (compliance.data_retention_policy) {
        const policyValidation = this.validateStringField(compliance.data_retention_policy, COMPLIANCE_VALIDATION_SCHEMA.data_retention_policy, 'data_retention_policy');
        if (!policyValidation.valid) {
          invalidFields.push('data_retention_policy');
          errors.push(...policyValidation.errors);
        }
      }

      // Compliance logic warnings
      if (compliance.gdpr_compliant && !compliance.privacy_enforced) {
        warnings.push('GDPR compliance is enabled but privacy enforcement is disabled');
      }

      if (compliance.kyc_support && !compliance.audit) {
        warnings.push('KYC support is enabled but audit is disabled - consider enabling audit for compliance');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        missingFields,
        invalidFields
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Compliance validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        missingFields,
        invalidFields
      };
    }
  }

  /**
   * Validates ModuleInfo object
   */
  static validateModuleInfo(moduleInfo: ModuleInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Required fields validation
      if (!moduleInfo.name || typeof moduleInfo.name !== 'string' || moduleInfo.name.trim().length === 0) {
        errors.push('Module name is required and must be a non-empty string');
      }

      if (!moduleInfo.version || !SEMANTIC_VERSION_PATTERN.test(moduleInfo.version)) {
        errors.push('Module version is required and must follow semantic versioning (e.g., 1.0.0)');
      }

      if (!moduleInfo.description || typeof moduleInfo.description !== 'string' || moduleInfo.description.length < 10) {
        errors.push('Module description is required and must be at least 10 characters long');
      }

      if (!Array.isArray(moduleInfo.identitiesSupported) || moduleInfo.identitiesSupported.length === 0) {
        errors.push('At least one supported identity type is required');
      } else {
        const invalidIdentityTypes = moduleInfo.identitiesSupported.filter(type => !Object.values(IdentityType).includes(type));
        if (invalidIdentityTypes.length > 0) {
          errors.push(`Invalid identity types: ${invalidIdentityTypes.join(', ')}`);
        }
      }

      if (!Array.isArray(moduleInfo.integrations)) {
        errors.push('Integrations must be an array');
      }

      if (!moduleInfo.repositoryUrl || !URL_PATTERN.test(moduleInfo.repositoryUrl)) {
        errors.push('Repository URL is required and must be a valid HTTP/HTTPS URL');
      }

      // Optional field validations
      if (moduleInfo.documentationCid && !IPFS_CID_PATTERN.test(moduleInfo.documentationCid)) {
        errors.push('Documentation CID must be a valid IPFS CID');
      }

      if (moduleInfo.auditHash && !SHA256_PATTERN.test(moduleInfo.auditHash)) {
        errors.push('Audit hash must be a valid SHA256 hash');
      }

      if (moduleInfo.compliance) {
        const complianceValidation = this.validateCompliance(moduleInfo.compliance as ModuleCompliance);
        if (!complianceValidation.valid) {
          errors.push(...complianceValidation.errors);
        }
        warnings.push(...complianceValidation.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`ModuleInfo validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Validates ModuleRegistrationRequest object
   */
  static validateRegistrationRequest(request: ModuleRegistrationRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!request.moduleInfo) {
        errors.push('ModuleInfo is required');
        return { valid: false, errors, warnings };
      }

      const moduleInfoValidation = this.validateModuleInfo(request.moduleInfo);
      errors.push(...moduleInfoValidation.errors);
      warnings.push(...moduleInfoValidation.warnings);

      // Validate optional fields
      if (request.testMode !== undefined && typeof request.testMode !== 'boolean') {
        errors.push('testMode must be a boolean');
      }

      if (request.skipValidation !== undefined && typeof request.skipValidation !== 'boolean') {
        errors.push('skipValidation must be a boolean');
      }

      if (request.customMetadata !== undefined && (typeof request.customMetadata !== 'object' || request.customMetadata === null)) {
        errors.push('customMetadata must be an object');
      }

      // Warnings for test mode
      if (request.testMode) {
        warnings.push('Registration is in test mode - module will not be available in production');
      }

      if (request.skipValidation) {
        warnings.push('Validation is being skipped - ensure metadata is correct');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Registration request validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Validates SignedModuleMetadata object
   */
  static validateSignedMetadata(signedMetadata: SignedModuleMetadata): VerificationResult {
    try {
      if (!signedMetadata.metadata) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Metadata is required'
        };
      }

      if (!signedMetadata.signature || typeof signedMetadata.signature !== 'string') {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Signature is required and must be a string'
        };
      }

      if (!signedMetadata.publicKey || typeof signedMetadata.publicKey !== 'string') {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Public key is required and must be a string'
        };
      }

      if (!signedMetadata.signature_type || !SUPPORTED_SIGNATURE_ALGORITHMS.includes(signedMetadata.signature_type as SupportedSignatureAlgorithm)) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: `Invalid signature type. Must be one of: ${SUPPORTED_SIGNATURE_ALGORITHMS.join(', ')}`
        };
      }

      if (!signedMetadata.signer_identity || !DID_PATTERN.test(signedMetadata.signer_identity)) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Signer identity must be a valid DID'
        };
      }

      const timestampValid = signedMetadata.signed_at > 0 && signedMetadata.signed_at <= Date.now();
      if (!timestampValid) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Invalid signature timestamp'
        };
      }

      // Validate the underlying metadata
      const metadataValidation = this.validateMetadata(signedMetadata.metadata);
      if (!metadataValidation.valid) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid,
          error: `Metadata validation failed: ${metadataValidation.errors.join(', ')}`
        };
      }

      return {
        valid: true,
        signatureValid: true, // Note: Actual signature verification would be done by cryptographic service
        identityVerified: true, // Note: Actual identity verification would be done by identity service
        timestampValid
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Signed metadata validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Helper validation methods
  private static validateStringField(value: string, schema: any, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return { valid: false, errors, warnings: [] };
    }

    if (schema.minLength && value.length < schema.minLength) {
      errors.push(`${fieldName} must be at least ${schema.minLength} characters long`);
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push(`${fieldName} must be no more than ${schema.maxLength} characters long`);
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${schema.enum.join(', ')}`);
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  private static validateNumberField(value: number, schema: any, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'number') {
      errors.push(`${fieldName} must be a number`);
      return { valid: false, errors, warnings: [] };
    }

    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${fieldName} must be at least ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${fieldName} must be no more than ${schema.maximum}`);
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  private static validateArrayField(value: any[], schema: any, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
      return { valid: false, errors, warnings: [] };
    }

    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${fieldName} must have at least ${schema.minItems} items`);
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${fieldName} must have no more than ${schema.maxItems} items`);
    }

    if (schema.items && schema.items.enum) {
      const invalidItems = value.filter(item => !schema.items.enum.includes(item));
      if (invalidItems.length > 0) {
        errors.push(`${fieldName} contains invalid items: ${invalidItems.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }
}

// Utility functions for validation
export function validateModuleMetadata(metadata: QModuleMetadata): ValidationResult {
  return ModuleMetadataValidator.validateMetadata(metadata);
}

export function validateModuleCompliance(compliance: ModuleCompliance): ValidationResult {
  return ModuleMetadataValidator.validateCompliance(compliance);
}

export function validateModuleInfo(moduleInfo: ModuleInfo): ValidationResult {
  return ModuleMetadataValidator.validateModuleInfo(moduleInfo);
}

export function validateRegistrationRequest(request: ModuleRegistrationRequest): ValidationResult {
  return ModuleMetadataValidator.validateRegistrationRequest(request);
}

export function validateSignedMetadata(signedMetadata: SignedModuleMetadata): VerificationResult {
  return ModuleMetadataValidator.validateSignedMetadata(signedMetadata);
}

// Error factory functions
export function createValidationError(message: string, moduleId?: string, validationErrors?: string[]): ModuleValidationError {
  return new ModuleValidationError(message, moduleId, validationErrors);
}

export function createSignatureVerificationError(message: string, moduleId?: string, signatureDetails?: any): SignatureVerificationError {
  return new SignatureVerificationError(message, moduleId, signatureDetails);
}

// Validation constants
export const VALIDATION_CONSTANTS = {
  MIN_MODULE_NAME_LENGTH: 1,
  MAX_MODULE_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_DATA_RETENTION_POLICY_LENGTH: 500,
  SUPPORTED_SIGNATURE_ALGORITHMS,
  PATTERNS: {
    SEMANTIC_VERSION: SEMANTIC_VERSION_PATTERN,
    SHA256: SHA256_PATTERN,
    URL: URL_PATTERN,
    IPFS_CID: IPFS_CID_PATTERN,
    DID: DID_PATTERN,
    CHECKSUM: CHECKSUM_PATTERN
  }
} as const;