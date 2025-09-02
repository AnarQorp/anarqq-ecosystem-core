/**
 * Module Verification Service
 * Provides comprehensive module validation including metadata, signatures, dependencies, compliance, and audit checks
 */

import {
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleVerificationResult,
  VerificationResult,
  VerificationIssue,
  ModuleCompliance,
  ModuleStatus,
  ModuleRegistrationErrorCode,
  ModuleRegistrationError,
  SEMANTIC_VERSION_PATTERN,
  SHA256_PATTERN,
  URL_PATTERN,
  IPFS_CID_PATTERN,
  DID_PATTERN,
  CHECKSUM_PATTERN,
  SUPPORTED_SIGNATURE_ALGORITHMS
} from '../types/qwallet-module-registration';
import { IdentityType } from '../types/identity';
import { identityQlockService } from './identity/IdentityQlockService';
import { moduleRegistrationPerformanceOptimizer } from './ModuleRegistrationPerformanceOptimizer';
import { 
  ModuleComplianceValidationService,
  ComplianceValidationResult,
  RegulatoryFramework
} from './ModuleComplianceValidationService';

export interface ModuleVerificationServiceInterface {
  // Core Verification
  verifyModule(moduleId: string, signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult>;
  
  // Individual Verification Components
  verifyMetadata(metadata: QModuleMetadata): Promise<VerificationResult>;
  verifySignature(signedMetadata: SignedModuleMetadata): Promise<VerificationResult>;
  verifyDependencies(dependencies: string[]): Promise<VerificationResult>;
  verifyCompliance(compliance: ModuleCompliance): Promise<VerificationResult>;
  verifyAuditHash(auditHash: string, moduleId: string): Promise<VerificationResult>;
  verifyDocumentationAvailability(documentationCid: string): Promise<VerificationResult>;
  
  // Validation Helpers
  validateMetadataStructure(metadata: QModuleMetadata): VerificationIssue[];
  validateComplianceRequirements(compliance: ModuleCompliance, moduleStatus: ModuleStatus): VerificationIssue[];
  validateDependencyCompatibility(dependencies: string[], moduleId: string): Promise<VerificationIssue[]>;
}

export class ModuleVerificationService implements ModuleVerificationServiceInterface {
  private verificationCache: Map<string, { result: ModuleVerificationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private complianceValidationService: ModuleComplianceValidationService;

  constructor() {
    this.complianceValidationService = new ModuleComplianceValidationService();
    console.log('[ModuleVerificationService] Initialized module verification service with compliance validation');
  }

  /**
   * Comprehensive module verification
   */
  async verifyModule(moduleId: string, signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult> {
    try {
      console.log(`[ModuleVerificationService] Starting comprehensive verification for module: ${moduleId}`);

      // Check cache first
      const cached = this.getCachedVerification(moduleId);
      if (cached) {
        console.log(`[ModuleVerificationService] Returning cached verification for ${moduleId}`);
        return cached;
      }

      const { metadata } = signedMetadata;
      const issues: VerificationIssue[] = [];
      
      // 1. Verify metadata structure and content
      const metadataResult = await this.verifyMetadata(metadata);
      const metadataValid = metadataResult.valid;
      if (!metadataValid && metadataResult.errors) {
        issues.push(...this.convertToVerificationIssues(metadataResult.errors, 'ERROR', 'METADATA'));
      }

      // 2. Verify cryptographic signature
      const signatureResult = await this.verifySignature(signedMetadata);
      const signatureValid = signatureResult.valid;
      if (!signatureValid) {
        issues.push({
          severity: 'ERROR',
          code: 'SIGNATURE_INVALID',
          message: signatureResult.error || 'Module signature verification failed',
          suggestion: 'Re-sign the module with a valid ROOT identity'
        });
      }

      // 3. Verify dependencies
      const dependenciesResult = await this.verifyDependencies(metadata.dependencies || []);
      const dependenciesResolved = dependenciesResult.valid;
      if (!dependenciesResolved) {
        issues.push(...this.convertToVerificationIssues(dependenciesResult.errors, 'ERROR', 'DEPENDENCIES'));
      }

      // 4. Verify compliance requirements
      const complianceResult = await this.verifyCompliance(metadata.compliance, metadata);
      const complianceVerified = complianceResult.valid;
      if (!complianceVerified) {
        issues.push(...this.convertToVerificationIssues(complianceResult.errors, 'WARNING', 'COMPLIANCE'));
      }
      
      // Add compliance warnings as info-level issues
      if (complianceResult.warnings && complianceResult.warnings.length > 0) {
        issues.push(...this.convertToVerificationIssues(complianceResult.warnings, 'INFO', 'COMPLIANCE'));
      }

      // 5. Verify audit hash
      const auditResult = await this.verifyAuditHash(metadata.audit_hash, moduleId);
      const auditPassed = auditResult.valid;
      if (!auditPassed) {
        issues.push({
          severity: 'ERROR',
          code: 'AUDIT_HASH_INVALID',
          message: auditResult.error || 'Audit hash verification failed',
          suggestion: 'Ensure the audit hash matches the actual audit results'
        });
      }

      // 6. Verify documentation availability
      const docResult = await this.verifyDocumentationAvailability(metadata.documentation);
      if (!docResult.valid) {
        issues.push({
          severity: 'WARNING',
          code: 'DOCUMENTATION_UNAVAILABLE',
          message: docResult.error || 'Module documentation is not accessible',
          suggestion: 'Ensure documentation is properly uploaded to IPFS'
        });
      }

      // Determine overall status
      const criticalIssues = issues.filter(issue => issue.severity === 'ERROR');
      const hasErrors = criticalIssues.length > 0;
      
      let status: ModuleVerificationResult['status'];
      if (hasErrors) {
        status = 'invalid';
      } else if (metadata.status === ModuleStatus.PRODUCTION_READY) {
        status = 'production_ready';
      } else if (metadata.status === ModuleStatus.TESTING) {
        status = 'testing';
      } else {
        status = 'development';
      }

      const result: ModuleVerificationResult = {
        moduleId,
        status,
        verificationChecks: {
          metadataValid,
          signatureValid,
          dependenciesResolved,
          complianceVerified,
          auditPassed
        },
        issues,
        lastVerified: new Date().toISOString(),
        verifiedBy: 'ModuleVerificationService'
      };

      // Cache the result
      this.cacheVerification(moduleId, result);

      console.log(`[ModuleVerificationService] Verification completed for ${moduleId}: ${status}`);
      return result;

    } catch (error) {
      console.error(`[ModuleVerificationService] Error verifying module ${moduleId}:`, error);
      
      return {
        moduleId,
        status: 'invalid',
        verificationChecks: {
          metadataValid: false,
          signatureValid: false,
          dependenciesResolved: false,
          complianceVerified: false,
          auditPassed: false
        },
        issues: [{
          severity: 'ERROR',
          code: 'VERIFICATION_ERROR',
          message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check module data integrity and try again'
        }],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'ModuleVerificationService'
      };
    }
  }

  /**
   * Verify module metadata structure and content
   */
  async verifyMetadata(metadata: QModuleMetadata): Promise<VerificationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate structure
      const structureIssues = this.validateMetadataStructure(metadata);
      structureIssues.forEach(issue => {
        if (issue.severity === 'ERROR') {
          errors.push(issue.message);
        } else if (issue.severity === 'WARNING') {
          warnings.push(issue.message);
        }
      });

      // Validate compliance requirements
      const complianceIssues = this.validateComplianceRequirements(metadata.compliance, metadata.status);
      complianceIssues.forEach(issue => {
        if (issue.severity === 'ERROR') {
          errors.push(issue.message);
        } else if (issue.severity === 'WARNING') {
          warnings.push(issue.message);
        }
      });

      return {
        valid: errors.length === 0,
        signatureValid: true, // Not applicable for metadata validation
        identityVerified: true, // Not applicable for metadata validation
        timestampValid: true, // Not applicable for metadata validation
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Metadata validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify module signature using IdentityQlockService with caching optimization
   */
  async verifySignature(signedMetadata: SignedModuleMetadata): Promise<VerificationResult> {
    try {
      const moduleId = signedMetadata.metadata.module;
      const moduleVersion = signedMetadata.metadata.version;
      
      console.log(`[ModuleVerificationService] Verifying signature for module: ${moduleId}`);
      
      // Check performance optimizer cache first
      const cachedResult = moduleRegistrationPerformanceOptimizer.getCachedSignatureVerification(
        moduleId,
        moduleVersion
      );
      
      if (cachedResult) {
        console.log(`[ModuleVerificationService] Using cached signature verification for ${moduleId}:${moduleVersion}`);
        return cachedResult;
      }
      
      // Use IdentityQlockService for signature verification
      const result = await identityQlockService.verifyMetadataSignature(signedMetadata);
      
      const verificationResult: VerificationResult = {
        valid: result.valid,
        signatureValid: result.signatureValid,
        identityVerified: result.identityVerified,
        timestampValid: result.timestampValid,
        error: result.error,
        details: result.details
      };
      
      // Cache the result in performance optimizer
      moduleRegistrationPerformanceOptimizer.cacheSignatureVerification(
        moduleId,
        moduleVersion,
        verificationResult
      );
      
      return verificationResult;

    } catch (error) {
      console.error('[ModuleVerificationService] Signature verification error:', error);
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify module dependencies are available and compatible
   */
  async verifyDependencies(dependencies: string[]): Promise<VerificationResult> {
    try {
      if (!dependencies || dependencies.length === 0) {
        return {
          valid: true,
          signatureValid: true,
          identityVerified: true,
          timestampValid: true
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check each dependency
      for (const dependency of dependencies) {
        try {
          // For now, we'll do basic validation
          // In a full implementation, this would check if the dependency module exists and is compatible
          if (!dependency || typeof dependency !== 'string') {
            errors.push(`Invalid dependency format: ${dependency}`);
            continue;
          }

          // Check if dependency follows proper naming convention
          if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(dependency)) {
            warnings.push(`Dependency name may not follow conventions: ${dependency}`);
          }

          // TODO: In a full implementation, check if dependency module exists in registry
          // const depModule = await this.getModule(dependency);
          // if (!depModule) {
          //   errors.push(`Dependency not found: ${dependency}`);
          // }

        } catch (error) {
          errors.push(`Error checking dependency ${dependency}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        valid: errors.length === 0,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Dependency verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify module compliance against requirements using comprehensive validation
   */
  async verifyCompliance(compliance: ModuleCompliance, metadata?: QModuleMetadata, identityType?: IdentityType): Promise<VerificationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!compliance || typeof compliance !== 'object') {
        errors.push('Compliance information is missing or invalid');
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          errors
        };
      }

      // Use comprehensive compliance validation if metadata is provided
      if (metadata) {
        try {
          const complianceResult = await this.complianceValidationService.validateCompliance(
            metadata,
            identityType,
            [RegulatoryFramework.GDPR] // Default to GDPR, can be extended
          );

          // Convert compliance issues to verification format
          const criticalIssues = complianceResult.issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
          const warningIssues = complianceResult.issues.filter(i => i.severity === 'MEDIUM' || i.severity === 'LOW');

          errors.push(...criticalIssues.map(issue => issue.message));
          warnings.push(...warningIssues.map(issue => issue.message));

          // Add recommendations as warnings
          warnings.push(...complianceResult.recommendations.map(rec => `Recommendation: ${rec.title} - ${rec.description}`));

          console.log(`[ModuleVerificationService] Comprehensive compliance validation completed. Score: ${complianceResult.score}/100`);

          return {
            valid: errors.length === 0,
            signatureValid: true,
            identityVerified: true,
            timestampValid: true,
            errors,
            warnings,
            details: {
              complianceScore: complianceResult.score,
              totalIssues: complianceResult.issues.length,
              recommendations: complianceResult.recommendations.length,
              auditTrailEntries: complianceResult.auditTrail.length
            }
          };

        } catch (complianceError) {
          console.warn('[ModuleVerificationService] Comprehensive compliance validation failed, falling back to basic validation:', complianceError);
          // Fall through to basic validation
        }
      }

      // Basic compliance validation (fallback)
      const requiredFields: (keyof ModuleCompliance)[] = [
        'audit', 'risk_scoring', 'privacy_enforced', 'kyc_support', 'gdpr_compliant', 'data_retention_policy'
      ];

      for (const field of requiredFields) {
        if (compliance[field] === undefined || compliance[field] === null) {
          errors.push(`Missing compliance field: ${field}`);
        }
      }

      // Validate data retention policy
      if (compliance.data_retention_policy && typeof compliance.data_retention_policy !== 'string') {
        errors.push('Data retention policy must be a string');
      }

      // Check for recommended compliance settings
      if (!compliance.privacy_enforced) {
        warnings.push('Privacy enforcement is not enabled - consider enabling for better security');
      }

      if (!compliance.audit) {
        warnings.push('Module has not passed security audit - recommended for production modules');
      }

      return {
        valid: errors.length === 0,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Compliance verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify audit hash validity
   */
  async verifyAuditHash(auditHash: string, moduleId: string): Promise<VerificationResult> {
    try {
      if (!auditHash) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Audit hash is missing'
        };
      }

      // Validate hash format (SHA256)
      if (!SHA256_PATTERN.test(auditHash)) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Audit hash format is invalid (must be SHA256)'
        };
      }

      // TODO: In a full implementation, this would:
      // 1. Retrieve audit results from audit system
      // 2. Calculate hash of audit results
      // 3. Compare with provided hash
      // For now, we'll do basic format validation

      console.log(`[ModuleVerificationService] Audit hash validated for ${moduleId}: ${auditHash}`);

      return {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Audit hash verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify documentation availability on IPFS
   */
  async verifyDocumentationAvailability(documentationCid: string): Promise<VerificationResult> {
    try {
      if (!documentationCid) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Documentation CID is missing'
        };
      }

      // Validate CID format
      if (!IPFS_CID_PATTERN.test(documentationCid)) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Documentation CID format is invalid'
        };
      }

      // TODO: In a full implementation, this would:
      // 1. Attempt to fetch documentation from IPFS
      // 2. Verify it's accessible and valid
      // For now, we'll do basic format validation

      console.log(`[ModuleVerificationService] Documentation CID validated: ${documentationCid}`);

      return {
        valid: true,
        signatureValid: true,
        identityVerified: true,
        timestampValid: true
      };

    } catch (error) {
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Documentation verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate metadata structure against schema
   */
  validateMetadataStructure(metadata: QModuleMetadata): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    try {
      // Required fields validation
      const requiredFields: (keyof QModuleMetadata)[] = [
        'module', 'version', 'description', 'identities_supported', 'integrations',
        'status', 'audit_hash', 'repository', 'documentation', 'activated_by',
        'timestamp', 'checksum', 'signature_algorithm', 'public_key_id'
      ];

      for (const field of requiredFields) {
        if (metadata[field] === undefined || metadata[field] === null) {
          issues.push({
            severity: 'ERROR',
            code: 'MISSING_FIELD',
            message: `Required field is missing: ${field}`,
            field,
            suggestion: `Provide a valid value for ${field}`
          });
        }
      }

      // Field format validation
      if (metadata.module && typeof metadata.module !== 'string') {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_FIELD_TYPE',
          message: 'Module name must be a string',
          field: 'module'
        });
      }

      if (metadata.version && !SEMANTIC_VERSION_PATTERN.test(metadata.version)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_VERSION_FORMAT',
          message: 'Version must follow semantic versioning (e.g., 1.0.0)',
          field: 'version',
          suggestion: 'Use semantic versioning format: MAJOR.MINOR.PATCH'
        });
      }

      if (metadata.description && (typeof metadata.description !== 'string' || metadata.description.length < 10)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_DESCRIPTION',
          message: 'Description must be a string with at least 10 characters',
          field: 'description'
        });
      }

      if (metadata.repository && !URL_PATTERN.test(metadata.repository)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_REPOSITORY_URL',
          message: 'Repository must be a valid URL',
          field: 'repository'
        });
      }

      if (metadata.documentation && !IPFS_CID_PATTERN.test(metadata.documentation)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_DOCUMENTATION_CID',
          message: 'Documentation must be a valid IPFS CID',
          field: 'documentation'
        });
      }

      if (metadata.activated_by && !DID_PATTERN.test(metadata.activated_by)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_ACTIVATOR_DID',
          message: 'Activated_by must be a valid DID',
          field: 'activated_by'
        });
      }

      if (metadata.audit_hash && !SHA256_PATTERN.test(metadata.audit_hash)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_AUDIT_HASH',
          message: 'Audit hash must be a valid SHA256 hash',
          field: 'audit_hash'
        });
      }

      if (metadata.checksum && !CHECKSUM_PATTERN.test(metadata.checksum)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_CHECKSUM',
          message: 'Checksum must be a valid hash',
          field: 'checksum'
        });
      }

      if (metadata.signature_algorithm && !SUPPORTED_SIGNATURE_ALGORITHMS.includes(metadata.signature_algorithm as any)) {
        issues.push({
          severity: 'ERROR',
          code: 'UNSUPPORTED_SIGNATURE_ALGORITHM',
          message: `Signature algorithm not supported: ${metadata.signature_algorithm}`,
          field: 'signature_algorithm',
          suggestion: `Use one of: ${SUPPORTED_SIGNATURE_ALGORITHMS.join(', ')}`
        });
      }

      // Array validations
      if (metadata.identities_supported && !Array.isArray(metadata.identities_supported)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_IDENTITIES_SUPPORTED',
          message: 'Identities supported must be an array',
          field: 'identities_supported'
        });
      } else if (metadata.identities_supported && metadata.identities_supported.length === 0) {
        issues.push({
          severity: 'ERROR',
          code: 'EMPTY_IDENTITIES_SUPPORTED',
          message: 'At least one identity type must be supported',
          field: 'identities_supported'
        });
      }

      if (metadata.integrations && !Array.isArray(metadata.integrations)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_INTEGRATIONS',
          message: 'Integrations must be an array',
          field: 'integrations'
        });
      }

      // Timestamp validation
      if (metadata.timestamp && (typeof metadata.timestamp !== 'number' || metadata.timestamp <= 0)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_TIMESTAMP',
          message: 'Timestamp must be a positive number',
          field: 'timestamp'
        });
      }

      // Status validation
      if (metadata.status && !Object.values(ModuleStatus).includes(metadata.status)) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_STATUS',
          message: `Invalid module status: ${metadata.status}`,
          field: 'status',
          suggestion: `Use one of: ${Object.values(ModuleStatus).join(', ')}`
        });
      }

    } catch (error) {
      issues.push({
        severity: 'ERROR',
        code: 'VALIDATION_ERROR',
        message: `Metadata validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return issues;
  }

  /**
   * Validate compliance requirements based on module status
   */
  validateComplianceRequirements(compliance: ModuleCompliance, moduleStatus: ModuleStatus): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    try {
      if (!compliance) {
        issues.push({
          severity: 'ERROR',
          code: 'MISSING_COMPLIANCE',
          message: 'Compliance information is required'
        });
        return issues;
      }

      // Production modules have stricter requirements
      if (moduleStatus === ModuleStatus.PRODUCTION_READY) {
        if (!compliance.audit) {
          issues.push({
            severity: 'ERROR',
            code: 'PRODUCTION_AUDIT_REQUIRED',
            message: 'Production modules must pass security audit',
            suggestion: 'Complete security audit before marking as production ready'
          });
        }

        if (!compliance.privacy_enforced) {
          issues.push({
            severity: 'WARNING',
            code: 'PRODUCTION_PRIVACY_RECOMMENDED',
            message: 'Privacy enforcement is recommended for production modules'
          });
        }

        if (!compliance.gdpr_compliant) {
          issues.push({
            severity: 'WARNING',
            code: 'GDPR_COMPLIANCE_RECOMMENDED',
            message: 'GDPR compliance is recommended for production modules'
          });
        }
      }

      // Data retention policy validation
      if (!compliance.data_retention_policy || compliance.data_retention_policy.trim() === '') {
        issues.push({
          severity: 'WARNING',
          code: 'MISSING_DATA_RETENTION_POLICY',
          message: 'Data retention policy should be specified'
        });
      }

    } catch (error) {
      issues.push({
        severity: 'ERROR',
        code: 'COMPLIANCE_VALIDATION_ERROR',
        message: `Compliance validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return issues;
  }

  /**
   * Validate dependency compatibility
   */
  async validateDependencyCompatibility(dependencies: string[], moduleId: string): Promise<VerificationIssue[]> {
    const issues: VerificationIssue[] = [];

    try {
      if (!dependencies || dependencies.length === 0) {
        return issues;
      }

      // Check for circular dependencies
      if (dependencies.includes(moduleId)) {
        issues.push({
          severity: 'ERROR',
          code: 'CIRCULAR_DEPENDENCY',
          message: 'Module cannot depend on itself',
          suggestion: 'Remove self-reference from dependencies'
        });
      }

      // Check for duplicate dependencies
      const uniqueDeps = new Set(dependencies);
      if (uniqueDeps.size !== dependencies.length) {
        issues.push({
          severity: 'WARNING',
          code: 'DUPLICATE_DEPENDENCIES',
          message: 'Duplicate dependencies found',
          suggestion: 'Remove duplicate entries from dependencies list'
        });
      }

      // TODO: In a full implementation, check actual dependency compatibility
      // This would involve checking version compatibility, availability, etc.

    } catch (error) {
      issues.push({
        severity: 'ERROR',
        code: 'DEPENDENCY_VALIDATION_ERROR',
        message: `Dependency validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return issues;
  }

  /**
   * Helper method to convert error arrays to verification issues
   */
  private convertToVerificationIssues(
    errors: string[] | undefined, 
    severity: VerificationIssue['severity'], 
    category: string
  ): VerificationIssue[] {
    if (!errors || !Array.isArray(errors)) {
      return [];
    }
    return errors.map(error => ({
      severity,
      code: `${category}_ERROR`,
      message: error
    }));
  }

  /**
   * Cache verification result
   */
  private cacheVerification(moduleId: string, result: ModuleVerificationResult): void {
    this.verificationCache.set(moduleId, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached verification result if still valid
   */
  private getCachedVerification(moduleId: string): ModuleVerificationResult | null {
    const cached = this.verificationCache.get(moduleId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.verificationCache.delete(moduleId);
    }
    
    return null;
  }

  /**
   * Clear verification cache
   */
  clearCache(): void {
    this.verificationCache.clear();
    console.log('[ModuleVerificationService] Verification cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.verificationCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

// Export singleton instance
export const moduleVerificationService = new ModuleVerificationService();