import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { schemas } from '../schemas/index.js';

// Import types
import type {
  IdentityRef,
  IdentityInfo,
  ConsentRef,
  ConsentGrant,
  LockSig,
  EncryptionEnvelope,
  DistributedLock,
  IndexRecord,
  MutablePointer,
  QueryFilter,
  AuditEvent,
  RiskAssessment,
  SecurityAlert,
  MaskProfile,
  PrivacyAssessment,
} from '../index.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: any;
}

/**
 * Schema validator class using AJV
 */
export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      removeAdditional: true,
      useDefaults: true,
      coerceTypes: false,
      strict: true,
    });

    // Add format support
    addFormats(this.ajv);

    // Add custom formats
    this.addCustomFormats();

    // Compile schemas
    this.compileSchemas();
  }

  private addCustomFormats(): void {
    // Add IPFS CID format validation
    this.ajv.addFormat('ipfs-cid', {
      type: 'string',
      validate: (cid: string) => {
        // Basic CID validation (v0 and v1)
        return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/.test(cid);
      },
    });

    // Add base64 format validation
    this.ajv.addFormat('base64', {
      type: 'string',
      validate: (data: string) => {
        return /^[A-Za-z0-9+/]+=*$/.test(data);
      },
    });
  }

  private compileSchemas(): void {
    // Add all schemas to AJV with their full schema structure
    Object.entries(schemas).forEach(([name, schema]) => {
      this.ajv.addSchema(schema, `${name}.schema.json`);
    });

    // Compile validators for common types using the full schema reference
    this.validators.set('IdentityRef', this.ajv.compile({
      $ref: 'identity.schema.json#/definitions/IdentityRef'
    }));
    this.validators.set('IdentityInfo', this.ajv.compile({
      $ref: 'identity.schema.json#/definitions/IdentityInfo'
    }));
    this.validators.set('ConsentRef', this.ajv.compile({
      $ref: 'consent.schema.json#/definitions/ConsentRef'
    }));
    this.validators.set('ConsentGrant', this.ajv.compile({
      $ref: 'consent.schema.json#/definitions/ConsentGrant'
    }));
    this.validators.set('LockSig', this.ajv.compile({
      $ref: 'lock.schema.json#/definitions/LockSig'
    }));
    this.validators.set('EncryptionEnvelope', this.ajv.compile({
      $ref: 'lock.schema.json#/definitions/EncryptionEnvelope'
    }));
    this.validators.set('DistributedLock', this.ajv.compile({
      $ref: 'lock.schema.json#/definitions/DistributedLock'
    }));
    this.validators.set('IndexRecord', this.ajv.compile({
      $ref: 'index.schema.json#/definitions/IndexRecord'
    }));
    this.validators.set('MutablePointer', this.ajv.compile({
      $ref: 'index.schema.json#/definitions/MutablePointer'
    }));
    this.validators.set('QueryFilter', this.ajv.compile({
      $ref: 'index.schema.json#/definitions/QueryFilter'
    }));
    this.validators.set('AuditEvent', this.ajv.compile({
      $ref: 'audit.schema.json#/definitions/AuditEvent'
    }));
    this.validators.set('RiskAssessment', this.ajv.compile({
      $ref: 'audit.schema.json#/definitions/RiskAssessment'
    }));
    this.validators.set('SecurityAlert', this.ajv.compile({
      $ref: 'audit.schema.json#/definitions/SecurityAlert'
    }));
    this.validators.set('MaskProfile', this.ajv.compile({
      $ref: 'mask.schema.json#/definitions/MaskProfile'
    }));
    this.validators.set('PrivacyAssessment', this.ajv.compile({
      $ref: 'mask.schema.json#/definitions/PrivacyAssessment'
    }));
  }

  /**
   * Validate data against a schema
   */
  validate(schemaName: string, data: any): ValidationResult {
    const validator = this.validators.get(schemaName);
    if (!validator) {
      return {
        valid: false,
        errors: [`Unknown schema: ${schemaName}`],
      };
    }

    const valid = validator(data);
    if (valid) {
      return {
        valid: true,
        data,
      };
    }

    const errors = validator.errors?.map(error => {
      const path = error.instancePath || 'root';
      return `${path}: ${error.message}`;
    }) || ['Unknown validation error'];

    return {
      valid: false,
      errors,
    };
  }

  /**
   * Type-safe validation methods
   */
  validateIdentityRef(data: any): ValidationResult & { data?: IdentityRef } {
    return this.validate('IdentityRef', data);
  }

  validateIdentityInfo(data: any): ValidationResult & { data?: IdentityInfo } {
    return this.validate('IdentityInfo', data);
  }

  validateConsentRef(data: any): ValidationResult & { data?: ConsentRef } {
    return this.validate('ConsentRef', data);
  }

  validateConsentGrant(data: any): ValidationResult & { data?: ConsentGrant } {
    return this.validate('ConsentGrant', data);
  }

  validateLockSig(data: any): ValidationResult & { data?: LockSig } {
    return this.validate('LockSig', data);
  }

  validateEncryptionEnvelope(data: any): ValidationResult & { data?: EncryptionEnvelope } {
    return this.validate('EncryptionEnvelope', data);
  }

  validateDistributedLock(data: any): ValidationResult & { data?: DistributedLock } {
    return this.validate('DistributedLock', data);
  }

  validateIndexRecord(data: any): ValidationResult & { data?: IndexRecord } {
    return this.validate('IndexRecord', data);
  }

  validateMutablePointer(data: any): ValidationResult & { data?: MutablePointer } {
    return this.validate('MutablePointer', data);
  }

  validateQueryFilter(data: any): ValidationResult & { data?: QueryFilter } {
    return this.validate('QueryFilter', data);
  }

  validateAuditEvent(data: any): ValidationResult & { data?: AuditEvent } {
    return this.validate('AuditEvent', data);
  }

  validateRiskAssessment(data: any): ValidationResult & { data?: RiskAssessment } {
    return this.validate('RiskAssessment', data);
  }

  validateSecurityAlert(data: any): ValidationResult & { data?: SecurityAlert } {
    return this.validate('SecurityAlert', data);
  }

  validateMaskProfile(data: any): ValidationResult & { data?: MaskProfile } {
    return this.validate('MaskProfile', data);
  }

  validatePrivacyAssessment(data: any): ValidationResult & { data?: PrivacyAssessment } {
    return this.validate('PrivacyAssessment', data);
  }
}

// Export singleton instance
export const validator = new SchemaValidator();