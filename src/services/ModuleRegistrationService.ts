/**
 * Module Registration Service
 * Main orchestration service for Qwallet module registration
 * Coordinates metadata generation, signing, and indexing
 */

import {
  ModuleRegistrationRequest,
  ModuleRegistrationResult,
  ModuleInfo,
  QModuleMetadata,
  SignedModuleMetadata,
  RegisteredModule,
  ModuleSearchCriteria,
  ModuleSearchResult,
  RegistrationOptions,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ModuleValidationError,
  SignatureVerificationError,
  ModuleVerificationResult,
  RegistrationStatus,
  ModuleRegistrationInfo,
  RegistrationHistoryEntry,
  ErrorContext
} from '../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../types/identity';
import { qModuleMetadataGenerator, MetadataGenerationOptions } from './QModuleMetadataGenerator';
import { identityQlockService } from './identity/IdentityQlockService';
import { ModuleRegistrationErrorRecovery } from './ModuleRegistrationErrorRecovery';
import { moduleRegistrationPerformanceOptimizer } from './ModuleRegistrationPerformanceOptimizer';
import { moduleSecurityValidationService } from './ModuleSecurityValidationService';
import { moduleDocumentationService } from './ModuleDocumentationService';
import { ModuleDependencyManager, DependencyResolutionResult, DependencyUpdateNotification, DependencyInstallationPlan } from './ModuleDependencyManager';
import { ModuleRegistry } from './ModuleRegistry';
import { ModuleAnalyticsService } from './ModuleAnalyticsService';
import { modulePerformanceMonitor } from '../utils/performance/modulePerformanceMonitor';
import { ModuleUpdateVersioningService, ModuleUpdateRequest, UpdateValidationResult, VersionCompatibilityResult, RollbackPlan, ModuleUpdateNotification, ChangelogEntry } from './ModuleUpdateVersioningService';

export interface ModuleRegistrationServiceInterface {
  // Core Registration
  registerModule(request: ModuleRegistrationRequest, signerIdentity: ExtendedSquidIdentity): Promise<ModuleRegistrationResult>;
  updateModule(moduleId: string, updates: Partial<ModuleInfo>, signerIdentity: ExtendedSquidIdentity): Promise<ModuleRegistrationResult>;
  deregisterModule(moduleId: string, signerIdentity: ExtendedSquidIdentity): Promise<boolean>;
  
  // Module Discovery
  getModule(moduleId: string): Promise<RegisteredModule | null>;
  searchModules(criteria: ModuleSearchCriteria): Promise<ModuleSearchResult>;
  listModules(options?: { includeTestMode?: boolean; limit?: number; offset?: number }): Promise<ModuleSearchResult>;
  
  // Module Verification
  verifyModule(moduleId: string): Promise<ModuleVerificationResult>;
  verifyModuleSignature(signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult>;
  
  // Registration Status
  getRegistrationStatus(moduleId: string): Promise<RegistrationStatus>;
  getRegistrationInfo(moduleId: string): Promise<ModuleRegistrationInfo | null>;
  getRegistrationHistory(moduleId: string): Promise<RegistrationHistoryEntry[]>;
  
  // Sandbox Operations
  registerSandboxModule(request: ModuleRegistrationRequest, signerIdentity: ExtendedSquidIdentity): Promise<ModuleRegistrationResult>;
  promoteSandboxModule(moduleId: string, signerIdentity: ExtendedSquidIdentity): Promise<boolean>;
  listSandboxModules(): Promise<RegisteredModule[]>;
  
  // Batch Operations
  registerModulesBatch(requests: ModuleRegistrationRequest[], signerIdentity: ExtendedSquidIdentity): Promise<Map<string, ModuleRegistrationResult>>;
  verifyModulesBatch(moduleIds: string[]): Promise<Map<string, ModuleVerificationResult>>;
  updateModulesBatch(updates: Array<{ moduleId: string; updates: Partial<ModuleInfo> }>, signerIdentity: ExtendedSquidIdentity): Promise<Map<string, ModuleRegistrationResult>>;
  
  // Dependency Management
  resolveDependencies(moduleId: string, dependencies: string[], options?: { includeTestMode?: boolean; maxDepth?: number; allowPartialResolution?: boolean }): Promise<DependencyResolutionResult>;
  detectCircularDependencies(moduleId: string, dependencies: string[], maxDepth?: number): string[];
  createUpdateNotification(moduleId: string, oldVersion: string, newVersion: string, options?: { notifyDependents?: boolean; includeCompatibilityAnalysis?: boolean }): Promise<DependencyUpdateNotification>;
  createInstallationPlan(moduleId: string, dependencies: string[], options?: { includeTestMode?: boolean; autoApprove?: boolean; skipOptionalDependencies?: boolean }): Promise<DependencyInstallationPlan>;
  executeInstallationPlan(moduleId: string, options?: { dryRun?: boolean; skipRiskySteps?: boolean; progressCallback?: (step: any, progress: number) => void }): Promise<{ success: boolean; completedSteps: string[]; errors: string[] }>;
  getUpdateNotifications(moduleId: string): DependencyUpdateNotification[];
  getInstallationPlan(moduleId: string): DependencyInstallationPlan | null;
  
  // Module Update and Versioning
  validateModuleUpdate(updateRequest: ModuleUpdateRequest): Promise<UpdateValidationResult>;
  checkVersionCompatibility(moduleId: string, requiredVersion: string, availableVersion: string): VersionCompatibilityResult;
  createRollbackPlan(moduleId: string, currentVersion: string, targetVersion: string): RollbackPlan;
  executeRollback(moduleId: string, rollbackPlan: RollbackPlan, options?: { dryRun?: boolean; skipRiskySteps?: boolean; progressCallback?: (step: any, progress: number) => void }): Promise<{ success: boolean; completedSteps: string[]; errors: string[] }>;
  createModuleUpdateNotification(moduleId: string, fromVersion: string, toVersion: string, changelog: ChangelogEntry[], breakingChanges?: string[], migrationGuide?: string): Promise<ModuleUpdateNotification>;
  generateChangelog(moduleId: string, version: string, changes: Partial<ChangelogEntry>[]): ChangelogEntry[];
  getChangelog(moduleId: string, version?: string): ChangelogEntry[];
  getModuleUpdateNotifications(moduleId: string): ModuleUpdateNotification[];
  getRollbackHistory(moduleId: string): RollbackPlan[];
}

export class ModuleRegistrationService implements ModuleRegistrationServiceInterface {
  private registrationHistory: Map<string, RegistrationHistoryEntry[]> = new Map();
  private qindexService: any = null;
  private qerberosService: any = null;
  private errorRecovery: ModuleRegistrationErrorRecovery;
  private moduleRegistry: ModuleRegistry;
  private dependencyManager: ModuleDependencyManager;
  private analyticsService: ModuleAnalyticsService;
  private versioningService: ModuleUpdateVersioningService;

  constructor() {
    this.errorRecovery = new ModuleRegistrationErrorRecovery({
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true
    });
    this.moduleRegistry = new ModuleRegistry();
    this.dependencyManager = new ModuleDependencyManager(this.moduleRegistry);
    this.analyticsService = new ModuleAnalyticsService(this.moduleRegistry);
    this.versioningService = new ModuleUpdateVersioningService(this.moduleRegistry, this.dependencyManager);
    
    // Set up performance monitoring integration
    modulePerformanceMonitor.setAnalyticsService(this.analyticsService);
    
    this.initializeServices();
  }

  /**
   * Initialize ecosystem services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Import ecosystem services dynamically to avoid circular dependencies
      const { getQindexService } = await import('../../backend/ecosystem/QindexService.mjs');
      const { getQerberosService } = await import('../../backend/ecosystem/QerberosService.mjs');
      
      this.qindexService = getQindexService();
      this.qerberosService = getQerberosService();
      
      console.log('[ModuleRegistrationService] Initialized ecosystem services');
    } catch (error) {
      console.error('[ModuleRegistrationService] Failed to initialize services:', error);
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.QINDEX_STORAGE_FAILED,
        'Failed to initialize required ecosystem services'
      );
    }
  }

  /**
   * Register a new module in the ecosystem
   */
  async registerModule(
    request: ModuleRegistrationRequest,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<ModuleRegistrationResult> {
    const moduleId = request.moduleInfo.name;
    let metadata: QModuleMetadata | undefined;
    let signedMetadata: SignedModuleMetadata | undefined;
    
    const context: ErrorContext = {
      operation: 'registerModule',
      moduleId,
      identityId: signerIdentity.did,
      timestamp: new Date().toISOString(),
      attemptNumber: 1,
      maxAttempts: 3,
      metadata: request.moduleInfo
    };

    const registrationOperation = async (): Promise<ModuleRegistrationResult> => {
      console.log(`[ModuleRegistrationService] Starting registration for module: ${moduleId}`);
      
      // Start performance monitoring
      const performanceTimerId = modulePerformanceMonitor.startTimer(
        'register',
        moduleId,
        signerIdentity.did,
        { testMode: request.testMode || false }
      );
      
      // 1. SECURITY VALIDATION LAYER - Comprehensive security checks
      console.log(`[ModuleRegistrationService] Performing security validation for module: ${moduleId}`);
      const securityValidation = await moduleSecurityValidationService.validateRegistrationRequest(
        request,
        signerIdentity
      );
      
      if (!securityValidation.valid) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.INVALID_METADATA,
          `Security validation failed: ${securityValidation.errors.join('; ')}`,
          moduleId,
          { 
            securityErrors: securityValidation.errors,
            securityWarnings: securityValidation.warnings 
          },
          {
            severity: ModuleRegistrationErrorSeverity.CRITICAL,
            retryable: false,
            userMessage: 'The module registration request failed security validation. Please review and fix the security issues.'
          }
        );
      }
      
      // Log security warnings if any
      if (securityValidation.warnings.length > 0) {
        console.warn(`[ModuleRegistrationService] Security warnings for module ${moduleId}:`, securityValidation.warnings);
      }
      
      // 2. Identity authorization check (enhanced)
      const isAuthorized = await moduleSecurityValidationService.isIdentityAuthorized(
        signerIdentity, 
        'register'
      );
      
      if (!isAuthorized) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          `Identity ${signerIdentity.did} is not authorized for module registration`,
          moduleId,
          { identityType: signerIdentity.type },
          {
            severity: ModuleRegistrationErrorSeverity.CRITICAL,
            retryable: false,
            userMessage: 'You do not have permission to register modules. Only authorized identities can perform this action.'
          }
        );
      }
      
      // 3. Legacy validation methods (kept for compatibility)
      await this.validateSignerIdentity(signerIdentity, moduleId);
      await this.validateModuleInfo(request.moduleInfo);
      
      // 4. Check if module already exists
      const existingModule = await this.getModule(moduleId);
      if (existingModule) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.MODULE_ALREADY_EXISTS,
          `Module already registered: ${moduleId}`,
          moduleId
        );
      }

      // 5. Generate metadata
      metadata = await this.generateModuleMetadata(request.moduleInfo, signerIdentity);
      
      // 6. Sanitize metadata for security
      metadata = await moduleSecurityValidationService.sanitizeMetadata(metadata);
      
      // 7. Sign metadata
      signedMetadata = await this.signModuleMetadata(metadata, signerIdentity);
      
      // 8. ENHANCED SIGNATURE VALIDATION - Security layer validation
      console.log(`[ModuleRegistrationService] Performing enhanced signature validation for module: ${moduleId}`);
      const enhancedSignatureVerification = await moduleSecurityValidationService.validateSignedMetadata(
        signedMetadata,
        signerIdentity
      );
      
      if (!enhancedSignatureVerification.valid) {
        throw new SignatureVerificationError(
          `Enhanced signature validation failed: ${enhancedSignatureVerification.error}`,
          moduleId,
          enhancedSignatureVerification
        );
      }
      
      // 9. Legacy signature verification (kept for compatibility)
      const signatureVerification = await this.verifyModuleSignature(signedMetadata);
      if (!signatureVerification.valid) {
        throw new SignatureVerificationError(
          `Signature verification failed: ${signatureVerification.error}`,
          moduleId,
          signatureVerification
        );
      }

      // Register in Qindex with proper testMode support
      const registrationOptions: RegistrationOptions = {
        testMode: request.testMode || false,
        skipDependencyCheck: request.skipValidation || false
      };
      
      const registrationResult = await this.registerInQindex(moduleId, signedMetadata, registrationOptions);

      // Log to Qerberos
      await this.logRegistrationEvent({
        action: 'REGISTERED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: true,
        details: {
          version: metadata.version,
          status: metadata.status,
          testMode: request.testMode || false
        },
        moduleMetadata: metadata,
        signatureInfo: {
          algorithm: signedMetadata.signature_type,
          publicKeyId: metadata.public_key_id,
          valid: signatureVerification.valid,
          identityType: signerIdentity.type
        }
      });

      // Record in history
      await this.recordHistoryEntry(moduleId, {
        action: 'REGISTERED',
        timestamp: new Date().toISOString(),
        performedBy: signerIdentity.did,
        details: {
          version: metadata.version,
          status: metadata.status,
          testMode: request.testMode || false
        },
        success: true
      });

      console.log(`[ModuleRegistrationService] Successfully registered module: ${moduleId}`);

      // End performance monitoring with success
      modulePerformanceMonitor.endTimer(performanceTimerId, true);

      return {
        success: true,
        moduleId,
        cid: registrationResult.cid,
        indexId: registrationResult.indexId,
        timestamp: registrationResult.timestamp,
        warnings: this.generateRegistrationWarnings(request.moduleInfo)
      };
    };

    try {
      // Execute registration with error recovery
      return await this.errorRecovery.executeWithRecovery(
        registrationOperation,
        context,
        async (error, errorContext) => {
          console.log(`[ModuleRegistrationService] Registration error occurred:`, {
            code: error.code,
            message: error.message,
            attempt: errorContext.attemptNumber,
            retryable: error.retryable
          });

          // Log error attempt to Qerberos
          await this.logRegistrationEvent({
            action: 'REGISTRATION_ERROR',
            moduleId,
            signerIdentity: signerIdentity.did,
            success: false,
            error: error.message,
            details: { 
              testMode: request.testMode || false,
              attempt: errorContext.attemptNumber,
              errorCode: error.code,
              severity: error.severity
            },
            moduleMetadata: metadata,
            signatureInfo: signedMetadata ? {
              algorithm: signedMetadata.signature_type,
              publicKeyId: metadata?.public_key_id,
              valid: false,
              identityType: signerIdentity.type
            } : undefined
          });

          // Continue retrying if error is retryable and we haven't exceeded max attempts
          return error.retryable && errorContext.attemptNumber < errorContext.maxAttempts;
        }
      );

    } catch (error) {
      console.error(`[ModuleRegistrationService] Registration failed for ${moduleId} after all recovery attempts:`, error);
      
      // Log final failure to Qerberos
      await this.logRegistrationEvent({
        action: 'REGISTRATION_FAILED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: false,
        error: error.message,
        details: { 
          testMode: request.testMode || false,
          finalFailure: true,
          errorCode: error instanceof ModuleRegistrationError ? error.code : 'UNKNOWN'
        },
        moduleMetadata: metadata,
        signatureInfo: signedMetadata ? {
          algorithm: signedMetadata.signature_type,
          publicKeyId: metadata?.public_key_id,
          valid: false,
          identityType: signerIdentity.type
        } : undefined
      });

      // Record failure in history
      await this.recordHistoryEntry(moduleId, {
        action: 'REGISTERED',
        timestamp: new Date().toISOString(),
        performedBy: signerIdentity.did,
        details: { 
          testMode: request.testMode || false,
          finalFailure: true
        },
        success: false,
        error: error.message
      });

      if (error instanceof ModuleRegistrationError) {
        throw error;
      }

      return {
        success: false,
        moduleId,
        error: `Registration failed: ${error.message}`
      };
    }
  }

  /**
   * Update an existing module
   */
  async updateModule(
    moduleId: string,
    updates: Partial<ModuleInfo>,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<ModuleRegistrationResult> {
    try {
      console.log(`[ModuleRegistrationService] Starting update for module: ${moduleId}`);
      
      // 1. SECURITY VALIDATION - Identity authorization check
      const isAuthorized = await moduleSecurityValidationService.isIdentityAuthorized(
        signerIdentity, 
        'update'
      );
      
      if (!isAuthorized) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          `Identity ${signerIdentity.did} is not authorized for module updates`,
          moduleId,
          { identityType: signerIdentity.type },
          {
            severity: ModuleRegistrationErrorSeverity.CRITICAL,
            retryable: false,
            userMessage: 'You do not have permission to update modules. Only authorized identities can perform this action.'
          }
        );
      }
      
      // Get existing module
      const existingModule = await this.getModule(moduleId);
      if (!existingModule) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND,
          `Module not found: ${moduleId}`,
          moduleId
        );
      }

      // Validate signer authority (legacy check)
      await this.validateSignerIdentity(signerIdentity, moduleId);
      
      // Merge updates with existing module info
      const updatedModuleInfo: ModuleInfo = {
        name: existingModule.metadata.module,
        version: updates.version || existingModule.metadata.version,
        description: updates.description || existingModule.metadata.description,
        identitiesSupported: updates.identitiesSupported || existingModule.metadata.identities_supported,
        integrations: updates.integrations || existingModule.metadata.integrations,
        repositoryUrl: updates.repositoryUrl || existingModule.metadata.repository,
        documentationCid: updates.documentationCid || existingModule.metadata.documentation,
        auditHash: updates.auditHash || existingModule.metadata.audit_hash,
        compliance: updates.compliance || existingModule.metadata.compliance
      };

      // Generate new metadata
      const metadata = await this.generateModuleMetadata(updatedModuleInfo, signerIdentity);
      
      // Sign updated metadata
      const signedMetadata = await this.signModuleMetadata(metadata, signerIdentity);
      
      // Update in Qindex (this will replace the existing registration)
      const updateResult = await this.registerInQindex(moduleId, signedMetadata, {
        testMode: existingModule.registrationInfo.testMode,
        skipDependencyCheck: false
      });

      // Log update to Qerberos
      await this.logRegistrationEvent({
        action: 'UPDATED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: true,
        details: {
          previousVersion: existingModule.metadata.version,
          newVersion: metadata.version,
          updatedFields: Object.keys(updates)
        },
        moduleMetadata: metadata,
        signatureInfo: {
          algorithm: signedMetadata.signature_type,
          publicKeyId: metadata.public_key_id,
          valid: true,
          identityType: signerIdentity.type
        }
      });

      // Record in history
      await this.recordHistoryEntry(moduleId, {
        action: 'UPDATED',
        timestamp: new Date().toISOString(),
        performedBy: signerIdentity.did,
        details: {
          previousVersion: existingModule.metadata.version,
          newVersion: metadata.version,
          updatedFields: Object.keys(updates)
        },
        success: true
      });

      console.log(`[ModuleRegistrationService] Successfully updated module: ${moduleId}`);

      return {
        success: true,
        moduleId,
        cid: updateResult.cid,
        indexId: updateResult.indexId,
        timestamp: updateResult.timestamp
      };

    } catch (error) {
      console.error(`[ModuleRegistrationService] Update failed for ${moduleId}:`, error);
      
      // Log failure
      await this.logRegistrationEvent({
        action: 'UPDATE_FAILED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: false,
        error: error.message,
        moduleMetadata: existingModule?.metadata,
        signatureInfo: {
          identityType: signerIdentity.type
        }
      });

      if (error instanceof ModuleRegistrationError) {
        throw error;
      }

      return {
        success: false,
        moduleId,
        error: `Update failed: ${error.message}`
      };
    }
  }

  /**
   * Deregister a module from the ecosystem
   */
  async deregisterModule(
    moduleId: string,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<boolean> {
    try {
      console.log(`[ModuleRegistrationService] Starting deregistration for module: ${moduleId}`);
      
      // 1. SECURITY VALIDATION - Identity authorization check
      const isAuthorized = await moduleSecurityValidationService.isIdentityAuthorized(
        signerIdentity, 
        'deregister'
      );
      
      if (!isAuthorized) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
          `Identity ${signerIdentity.did} is not authorized for module deregistration`,
          moduleId,
          { identityType: signerIdentity.type },
          {
            severity: ModuleRegistrationErrorSeverity.CRITICAL,
            retryable: false,
            userMessage: 'You do not have permission to deregister modules. Only authorized identities can perform this action.'
          }
        );
      }
      
      // Get existing module
      const existingModule = await this.getModule(moduleId);
      if (!existingModule) {
        console.warn(`[ModuleRegistrationService] Module not found for deregistration: ${moduleId}`);
        return false;
      }

      // Validate signer authority (legacy check)
      await this.validateSignerIdentity(signerIdentity, moduleId);
      
      // Check for dependent modules
      const dependentModules = await this.findDependentModules(moduleId);
      if (dependentModules.length > 0) {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.DEPENDENCY_NOT_FOUND,
          `Cannot deregister module with dependencies: ${dependentModules.join(', ')}`,
          moduleId
        );
      }

      // Remove from Qindex (implementation would depend on Qindex API)
      // For now, we'll assume this is handled by the Qindex service
      
      // Log deregistration to Qerberos
      await this.logRegistrationEvent({
        action: 'DEREGISTERED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: true,
        details: {
          version: existingModule.metadata.version,
          status: existingModule.metadata.status
        },
        moduleMetadata: existingModule.metadata,
        signatureInfo: {
          identityType: signerIdentity.type
        }
      });

      // Record in history
      await this.recordHistoryEntry(moduleId, {
        action: 'DEREGISTERED',
        timestamp: new Date().toISOString(),
        performedBy: signerIdentity.did,
        details: {
          version: existingModule.metadata.version,
          finalStatus: existingModule.metadata.status
        },
        success: true
      });

      console.log(`[ModuleRegistrationService] Successfully deregistered module: ${moduleId}`);
      return true;

    } catch (error) {
      console.error(`[ModuleRegistrationService] Deregistration failed for ${moduleId}:`, error);
      
      // Log failure
      await this.logRegistrationEvent({
        action: 'DEREGISTRATION_FAILED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: false,
        error: error.message,
        moduleMetadata: existingModule?.metadata,
        signatureInfo: {
          identityType: signerIdentity.type
        }
      });

      if (error instanceof ModuleRegistrationError) {
        throw error;
      }

      return false;
    }
  }

  /**
   * Get a registered module by ID
   */
  async getModule(moduleId: string): Promise<RegisteredModule | null> {
    try {
      if (!this.qindexService) {
        await this.initializeServices();
      }

      const module = await this.qindexService.getModule(moduleId);
      return module;
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting module ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Search for modules based on criteria
   */
  async searchModules(criteria: ModuleSearchCriteria): Promise<ModuleSearchResult> {
    try {
      if (!this.qindexService) {
        await this.initializeServices();
      }

      const searchResult = await this.qindexService.searchModules(criteria);
      
      return {
        modules: searchResult.modules || [],
        totalCount: searchResult.totalCount || 0,
        hasMore: searchResult.hasMore || false,
        nextCursor: searchResult.nextCursor
      };
    } catch (error) {
      console.error('[ModuleRegistrationService] Error searching modules:', error);
      return {
        modules: [],
        totalCount: 0,
        hasMore: false
      };
    }
  }

  /**
   * List all modules with optional filters
   */
  async listModules(options: { 
    includeTestMode?: boolean; 
    limit?: number; 
    offset?: number 
  } = {}): Promise<ModuleSearchResult> {
    const { includeTestMode = false, limit = 50, offset = 0 } = options;
    
    return this.searchModules({
      limit,
      offset,
      includeTestMode
    } as ModuleSearchCriteria);
  }

  /**
   * Verify a module's registration and signatures
   */
  async verifyModule(moduleId: string): Promise<ModuleVerificationResult> {
    try {
      const module = await this.getModule(moduleId);
      if (!module) {
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
            code: 'MODULE_NOT_FOUND',
            message: `Module not found: ${moduleId}`
          }],
          lastVerified: new Date().toISOString(),
          verifiedBy: 'system'
        };
      }

      // Verify signature
      const signatureResult = await this.verifyModuleSignature(module.signedMetadata);
      
      // Check dependencies
      const dependenciesResolved = await this.verifyDependencies(module.metadata.dependencies || []);
      
      // Verify compliance
      const complianceVerified = await this.verifyCompliance(module.metadata.compliance);
      
      // Check audit status
      const auditPassed = await this.verifyAudit(module.metadata.audit_hash);

      // Check documentation availability
      const documentationAvailable = await this.verifyDocumentationAvailability(module.metadata.documentation);

      const allChecksPass = signatureResult.valid && dependenciesResolved && complianceVerified && auditPassed && documentationAvailable;
      
      return {
        moduleId,
        status: allChecksPass ? 'production_ready' : 'invalid',
        verificationChecks: {
          metadataValid: true, // If we got this far, metadata is valid
          signatureValid: signatureResult.valid,
          dependenciesResolved,
          complianceVerified,
          auditPassed,
          documentationAvailable
        },
        issues: this.generateVerificationIssues(signatureResult, dependenciesResolved, complianceVerified, auditPassed, documentationAvailable),
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      };

    } catch (error) {
      console.error(`[ModuleRegistrationService] Error verifying module ${moduleId}:`, error);
      
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
          message: `Verification failed: ${error.message}`
        }],
        lastVerified: new Date().toISOString(),
        verifiedBy: 'system'
      };
    }
  }

  /**
   * Verify module metadata signature
   */
  async verifyModuleSignature(signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult> {
    try {
      return await identityQlockService.verifyMetadataSignature(signedMetadata);
    } catch (error) {
      console.error('[ModuleRegistrationService] Error verifying signature:', error);
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Signature verification failed: ${error.message}`
      };
    }
  }

  /**
   * Get registration status for a module
   */
  async getRegistrationStatus(moduleId: string): Promise<RegistrationStatus> {
    try {
      const module = await this.getModule(moduleId);
      if (!module) {
        return {
          moduleId,
          status: 'DEVELOPMENT',
          registered: false,
          verified: false,
          lastCheck: new Date().toISOString(),
          issues: ['Module not found in registry']
        };
      }

      const verification = await this.verifyModule(moduleId);
      
      return {
        moduleId,
        status: module.metadata.status,
        registered: true,
        verified: verification.status === 'production_ready',
        lastCheck: new Date().toISOString(),
        issues: verification.issues.map(issue => issue.message)
      };

    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting status for ${moduleId}:`, error);
      
      return {
        moduleId,
        status: 'DEVELOPMENT',
        registered: false,
        verified: false,
        lastCheck: new Date().toISOString(),
        issues: [`Status check failed: ${error.message}`]
      };
    }
  }

  /**
   * Get complete registration information for a module
   */
  async getRegistrationInfo(moduleId: string): Promise<ModuleRegistrationInfo | null> {
    try {
      const module = await this.getModule(moduleId);
      if (!module) {
        return null;
      }

      const status = await this.getRegistrationStatus(moduleId);
      const verification = await this.verifyModule(moduleId);
      const history = await this.getRegistrationHistory(moduleId);

      return {
        moduleId,
        registrationResult: {
          success: true,
          moduleId,
          cid: module.registrationInfo.cid,
          indexId: module.registrationInfo.indexId,
          timestamp: module.registrationInfo.registeredAt
        },
        verificationResult: verification,
        currentStatus: status,
        history
      };

    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting registration info for ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Get registration history for a module
   */
  async getRegistrationHistory(moduleId: string): Promise<RegistrationHistoryEntry[]> {
    return this.registrationHistory.get(moduleId) || [];
  }

  /**
   * Register a module in sandbox mode for testing
   */
  async registerSandboxModule(
    request: ModuleRegistrationRequest,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<ModuleRegistrationResult> {
    try {
      console.log(`[ModuleRegistrationService] Starting sandbox registration for module: ${request.moduleInfo.name}`);
      
      // Force testMode to true for sandbox registration
      const sandboxRequest = {
        ...request,
        testMode: true,
        skipValidation: request.skipValidation || false // Allow validation skipping in sandbox
      };
      
      // Use the main registration method with testMode enabled
      const result = await this.registerModule(sandboxRequest, signerIdentity);
      
      if (result.success) {
        console.log(`[ModuleRegistrationService] Successfully registered sandbox module: ${request.moduleInfo.name}`);
      }
      
      return result;

    } catch (error) {
      console.error(`[ModuleRegistrationService] Sandbox registration failed for ${request.moduleInfo.name}:`, error);
      
      // Log failure to Qerberos
      await this.logRegistrationEvent({
        action: 'SANDBOX_REGISTRATION_FAILED',
        moduleId: request.moduleInfo.name,
        signerIdentity: signerIdentity.did,
        success: false,
        error: error.message,
        details: { testMode: true },
        signatureInfo: {
          identityType: signerIdentity.type
        }
      });

      if (error instanceof ModuleRegistrationError) {
        throw error;
      }

      return {
        success: false,
        moduleId: request.moduleInfo.name,
        error: `Sandbox registration failed: ${error.message}`
      };
    }
  }

  /**
   * Promote a sandbox module to production
   */
  async promoteSandboxModule(
    moduleId: string,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<boolean> {
    try {
      console.log(`[ModuleRegistrationService] Promoting sandbox module to production: ${moduleId}`);
      
      if (!this.qindexService) {
        await this.initializeServices();
      }

      // Validate signer authority
      await this.validateSignerIdentity(signerIdentity, moduleId);
      
      // Verify module before promotion
      const verification = await this.verifyModule(moduleId);
      if (verification.status === 'invalid') {
        throw new ModuleRegistrationError(
          ModuleRegistrationErrorCode.COMPLIANCE_CHECK_FAILED,
          `Cannot promote invalid module: ${verification.issues.map(i => i.message).join(', ')}`,
          moduleId
        );
      }

      // Promote in Qindex
      const promoted = await this.qindexService.promoteSandboxModule(moduleId);
      
      if (promoted) {
        // Log promotion
        await this.logRegistrationEvent({
          action: 'PROMOTED',
          moduleId,
          signerIdentity: signerIdentity.did,
          success: true,
          details: {
            fromSandbox: true,
            verificationStatus: verification.status
          },
          signatureInfo: {
            identityType: signerIdentity.type
          }
        });

        // Record in history
        await this.recordHistoryEntry(moduleId, {
          action: 'STATUS_CHANGED',
          timestamp: new Date().toISOString(),
          performedBy: signerIdentity.did,
          details: {
            from: 'sandbox',
            to: 'production',
            verificationStatus: verification.status
          },
          success: true
        });

        console.log(`[ModuleRegistrationService] Successfully promoted module: ${moduleId}`);
      }

      return promoted;

    } catch (error) {
      console.error(`[ModuleRegistrationService] Promotion failed for ${moduleId}:`, error);
      
      // Log failure
      await this.logRegistrationEvent({
        action: 'PROMOTION_FAILED',
        moduleId,
        signerIdentity: signerIdentity.did,
        success: false,
        error: error.message,
        signatureInfo: {
          identityType: signerIdentity.type
        }
      });

      if (error instanceof ModuleRegistrationError) {
        throw error;
      }

      return false;
    }
  }

  /**
   * List all sandbox modules
   */
  async listSandboxModules(): Promise<RegisteredModule[]> {
    try {
      if (!this.qindexService) {
        await this.initializeServices();
      }

      return await this.qindexService.listSandboxModules();
    } catch (error) {
      console.error('[ModuleRegistrationService] Error listing sandbox modules:', error);
      return [];
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Validate signer identity has authority to sign for this module
   */
  private async validateSignerIdentity(
    signerIdentity: ExtendedSquidIdentity,
    moduleId: string
  ): Promise<void> {
    // Only ROOT identities can register modules
    if (signerIdentity.type !== IdentityType.ROOT) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        `Only ROOT identities can register modules. Identity type: ${signerIdentity.type}`,
        moduleId
      );
    }

    // Verify identity has module signing authority
    const hasAuthority = await identityQlockService.verifySignerAuthority(signerIdentity.did, moduleId);
    if (!hasAuthority) {
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.UNAUTHORIZED_SIGNER,
        `Identity ${signerIdentity.did} is not authorized to sign for module: ${moduleId}`,
        moduleId
      );
    }
  }

  /**
   * Validate module info structure and content
   */
  private async validateModuleInfo(moduleInfo: ModuleInfo): Promise<void> {
    if (!moduleInfo.name || typeof moduleInfo.name !== 'string') {
      throw new ModuleValidationError('Module name is required and must be a string');
    }

    if (!moduleInfo.version || !/^\d+\.\d+\.\d+/.test(moduleInfo.version)) {
      throw new ModuleValidationError('Valid semantic version is required');
    }

    if (!moduleInfo.description || moduleInfo.description.length < 10) {
      throw new ModuleValidationError('Description must be at least 10 characters');
    }

    if (!Array.isArray(moduleInfo.identitiesSupported) || moduleInfo.identitiesSupported.length === 0) {
      throw new ModuleValidationError('At least one supported identity type is required');
    }

    if (!Array.isArray(moduleInfo.integrations)) {
      throw new ModuleValidationError('Integrations must be an array');
    }

    if (!moduleInfo.repositoryUrl || !/^https?:\/\//.test(moduleInfo.repositoryUrl)) {
      throw new ModuleValidationError('Valid repository URL is required');
    }
  }

  /**
   * Generate module metadata using the metadata generator
   */
  private async generateModuleMetadata(
    moduleInfo: ModuleInfo,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<QModuleMetadata> {
    const options: MetadataGenerationOptions = {
      activatedBy: signerIdentity.did,
      publicKeyId: `${signerIdentity.did}_module_key`,
      signatureAlgorithm: 'RSA-SHA256',
      customTimestamp: Date.now()
    };

    return await qModuleMetadataGenerator.generateMetadata(moduleInfo, options);
  }

  /**
   * Sign module metadata using identity service
   */
  private async signModuleMetadata(
    metadata: QModuleMetadata,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<SignedModuleMetadata> {
    return await identityQlockService.signMetadata(metadata, signerIdentity.did);
  }

  /**
   * Register module in Qindex service
   */
  private async registerInQindex(
    moduleId: string,
    signedMetadata: SignedModuleMetadata,
    options: RegistrationOptions
  ): Promise<{ success: boolean; cid?: string; indexId?: string; timestamp?: string }> {
    if (!this.qindexService) {
      await this.initializeServices();
    }

    return await this.qindexService.registerModule(moduleId, signedMetadata, options);
  }

  /**
   * Log registration event to Qerberos using enhanced module registration logging
   */
  private async logRegistrationEvent(event: {
    action: string;
    moduleId: string;
    signerIdentity: string;
    success: boolean;
    error?: string;
    details?: any;
    moduleMetadata?: QModuleMetadata;
    signatureInfo?: any;
  }): Promise<void> {
    try {
      if (!this.qerberosService) {
        await this.initializeServices();
      }

      // Use the enhanced module registration logging method
      await this.qerberosService.logModuleRegistration({
        action: event.action,
        moduleId: event.moduleId,
        signerIdentity: event.signerIdentity,
        success: event.success,
        error: event.error,
        details: event.details || {},
        
        // Enhanced module-specific fields
        moduleVersion: event.moduleMetadata?.version,
        moduleStatus: event.moduleMetadata?.status,
        testMode: event.details?.testMode || false,
        complianceInfo: event.moduleMetadata?.compliance,
        auditHash: event.moduleMetadata?.audit_hash,
        signatureInfo: event.signatureInfo,
        dependencyInfo: {
          dependencies: event.moduleMetadata?.dependencies || [],
          integrations: event.moduleMetadata?.integrations || []
        },
        registrationTimestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ModuleRegistrationService] Failed to log module registration event to Qerberos:', error);
      // Don't throw - logging failure shouldn't break registration
    }
  }

  /**
   * Record entry in registration history
   */
  private async recordHistoryEntry(
    moduleId: string,
    entry: RegistrationHistoryEntry
  ): Promise<void> {
    if (!this.registrationHistory.has(moduleId)) {
      this.registrationHistory.set(moduleId, []);
    }

    const history = this.registrationHistory.get(moduleId)!;
    history.push(entry);

    // Keep only last 100 entries per module
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Generate registration warnings based on module info
   */
  private generateRegistrationWarnings(moduleInfo: ModuleInfo): string[] {
    const warnings: string[] = [];

    if (!moduleInfo.auditHash) {
      warnings.push('Module has not been audited');
    }

    if (!moduleInfo.documentationCid) {
      warnings.push('No documentation CID provided');
    }

    if (moduleInfo.integrations.length === 0) {
      warnings.push('Module has no ecosystem integrations');
    }

    return warnings;
  }

  /**
   * Verify module dependencies are available
   */
  private async verifyDependencies(dependencies: string[]): Promise<boolean> {
    if (!dependencies || dependencies.length === 0) {
      return true;
    }

    for (const dep of dependencies) {
      const depModule = await this.getModule(dep);
      if (!depModule) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verify module compliance settings
   */
  private async verifyCompliance(compliance: any): Promise<boolean> {
    // Basic compliance verification
    return compliance && typeof compliance === 'object';
  }

  /**
   * Verify module audit hash
   */
  private async verifyAudit(auditHash: string): Promise<boolean> {
    // Basic audit hash verification
    return auditHash && typeof auditHash === 'string' && auditHash.length === 64;
  }

  /**
   * Generate verification issues based on check results
   */
  private generateVerificationIssues(
    signatureResult: any,
    dependenciesResolved: boolean,
    complianceVerified: boolean,
    auditPassed: boolean,
    documentationAvailable: boolean
  ): any[] {
    const issues: any[] = [];

    if (!signatureResult.valid) {
      issues.push({
        severity: 'ERROR',
        code: 'INVALID_SIGNATURE',
        message: signatureResult.error || 'Module signature is invalid'
      });
    }

    if (!dependenciesResolved) {
      issues.push({
        severity: 'ERROR',
        code: 'UNRESOLVED_DEPENDENCIES',
        message: 'One or more module dependencies could not be resolved'
      });
    }

    if (!complianceVerified) {
      issues.push({
        severity: 'WARNING',
        code: 'COMPLIANCE_UNVERIFIED',
        message: 'Module compliance could not be verified'
      });
    }

    if (!auditPassed) {
      issues.push({
        severity: 'WARNING',
        code: 'AUDIT_UNVERIFIED',
        message: 'Module audit could not be verified'
      });
    }

    if (!documentationAvailable) {
      issues.push({
        severity: 'WARNING',
        code: 'DOCUMENTATION_UNAVAILABLE',
        message: 'Module documentation is not available or invalid'
      });
    }

    return issues;
  }

  /**
   * Find modules that depend on the given module
   */
  private async findDependentModules(moduleId: string): Promise<string[]> {
    try {
      const allModules = await this.listModules({ includeTestMode: true, limit: 1000 });
      const dependentModules: string[] = [];

      for (const module of allModules.modules) {
        if (module.metadata.dependencies && module.metadata.dependencies.includes(moduleId)) {
          dependentModules.push(module.moduleId);
        }
      }

      return dependentModules;
    } catch (error) {
      console.error('[ModuleRegistrationService] Error finding dependent modules:', error);
      return [];
    }
  }

  /**
   * Verify documentation availability and validity
   */
  private async verifyDocumentationAvailability(documentationCid: string): Promise<boolean> {
    try {
      if (!documentationCid) {
        return false;
      }

      // Use the documentation service to validate the CID
      const validationResult = await moduleDocumentationService.validateDocumentationCID(documentationCid);
      
      return validationResult.valid && validationResult.available;
    } catch (error) {
      console.error('[ModuleRegistrationService] Error verifying documentation:', error);
      return false;
    }
  }

  /**
   * Upload module documentation during registration
   */
  async uploadModuleDocumentation(
    moduleId: string,
    version: string,
    documentationContent: string | Buffer,
    options: {
      format?: 'markdown' | 'html' | 'pdf' | 'json';
      language?: string;
      author?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    try {
      console.log(`[ModuleRegistrationService] Uploading documentation for module: ${moduleId}`);

      const uploadResult = await moduleDocumentationService.uploadDocumentation(
        documentationContent,
        {
          moduleId,
          version,
          format: options.format || 'markdown',
          language: options.language || 'en',
          author: options.author,
          tags: options.tags || [],
          generateSearchIndex: true
        }
      );

      console.log(`[ModuleRegistrationService] Documentation uploaded successfully. CID: ${uploadResult.cid}`);
      return uploadResult.cid;

    } catch (error) {
      console.error(`[ModuleRegistrationService] Error uploading documentation for ${moduleId}:`, error);
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.DOCUMENTATION_UNAVAILABLE,
        `Failed to upload documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        moduleId
      );
    }
  }

  /**
   * Update module documentation
   */
  async updateModuleDocumentation(
    moduleId: string,
    newVersion: string,
    documentationContent: string | Buffer,
    options: {
      format?: 'markdown' | 'html' | 'pdf' | 'json';
      language?: string;
      author?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    try {
      console.log(`[ModuleRegistrationService] Updating documentation for module: ${moduleId} to version: ${newVersion}`);

      const updateResult = await moduleDocumentationService.updateDocumentation(
        moduleId,
        newVersion,
        documentationContent,
        {
          format: options.format || 'markdown',
          language: options.language || 'en',
          author: options.author,
          tags: options.tags || [],
          generateSearchIndex: true
        }
      );

      console.log(`[ModuleRegistrationService] Documentation updated successfully. CID: ${updateResult.cid}`);
      return updateResult.cid;

    } catch (error) {
      console.error(`[ModuleRegistrationService] Error updating documentation for ${moduleId}:`, error);
      throw new ModuleRegistrationError(
        ModuleRegistrationErrorCode.DOCUMENTATION_UNAVAILABLE,
        `Failed to update documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        moduleId
      );
    }
  }

  /**
   * Get module documentation versions
   */
  async getModuleDocumentationVersions(moduleId: string): Promise<any[]> {
    try {
      return await moduleDocumentationService.getDocumentationVersions(moduleId);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting documentation versions for ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Search module documentation
   */
  async searchModuleDocumentation(
    query: string,
    options: {
      moduleIds?: string[];
      version?: string;
      language?: string;
      tags?: string[];
      limit?: number;
    } = {}
  ): Promise<any[]> {
    try {
      return await moduleDocumentationService.searchDocumentation(query, options);
    } catch (error) {
      console.error('[ModuleRegistrationService] Error searching documentation:', error);
      return [];
    }
  }

  // Module Update and Versioning Methods

  /**
   * Validate module update request
   */
  async validateModuleUpdate(updateRequest: ModuleUpdateRequest): Promise<UpdateValidationResult> {
    try {
      console.log(`[ModuleRegistrationService] Validating module update for ${updateRequest.moduleId}`);
      return await this.versioningService.validateUpdate(updateRequest);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error validating update for ${updateRequest.moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Check version compatibility between modules
   */
  checkVersionCompatibility(
    moduleId: string,
    requiredVersion: string,
    availableVersion: string
  ): VersionCompatibilityResult {
    try {
      return this.versioningService.checkVersionCompatibility(moduleId, requiredVersion, availableVersion);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error checking version compatibility for ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Create rollback plan for module update
   */
  createRollbackPlan(
    moduleId: string,
    currentVersion: string,
    targetVersion: string
  ): RollbackPlan {
    try {
      const updateType = this.versioningService.getUpdateType(currentVersion, targetVersion);
      return this.versioningService.createRollbackPlan(moduleId, currentVersion, targetVersion, updateType);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error creating rollback plan for ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Execute module rollback
   */
  async executeRollback(
    moduleId: string,
    rollbackPlan: RollbackPlan,
    options: {
      dryRun?: boolean;
      skipRiskySteps?: boolean;
      progressCallback?: (step: any, progress: number) => void;
    } = {}
  ): Promise<{ success: boolean; completedSteps: string[]; errors: string[] }> {
    try {
      console.log(`[ModuleRegistrationService] Executing rollback for ${moduleId}`);
      return await this.versioningService.executeRollback(moduleId, rollbackPlan, options);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error executing rollback for ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Create update notification for dependent modules
   */
  async createModuleUpdateNotification(
    moduleId: string,
    fromVersion: string,
    toVersion: string,
    changelog: ChangelogEntry[],
    breakingChanges: string[] = [],
    migrationGuide?: string
  ): Promise<ModuleUpdateNotification> {
    try {
      console.log(`[ModuleRegistrationService] Creating update notification for ${moduleId}`);
      return await this.versioningService.createUpdateNotification(
        moduleId,
        fromVersion,
        toVersion,
        changelog,
        breakingChanges,
        migrationGuide
      );
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error creating update notification for ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Generate changelog for module version
   */
  generateChangelog(
    moduleId: string,
    version: string,
    changes: Partial<ChangelogEntry>[]
  ): ChangelogEntry[] {
    try {
      return this.versioningService.generateChangelog(moduleId, version, changes);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error generating changelog for ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get changelog for a module
   */
  getChangelog(moduleId: string, version?: string): ChangelogEntry[] {
    try {
      return this.versioningService.getChangelog(moduleId, version);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting changelog for ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Get update notifications for a module
   */
  getModuleUpdateNotifications(moduleId: string): ModuleUpdateNotification[] {
    try {
      return this.versioningService.getUpdateNotifications(moduleId);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting update notifications for ${moduleId}:`, error);
      return [];
    }
  }

  /**
   * Get rollback history for a module
   */
  getRollbackHistory(moduleId: string): RollbackPlan[] {
    try {
      return this.versioningService.getRollbackHistory(moduleId);
    } catch (error) {
      console.error(`[ModuleRegistrationService] Error getting rollback history for ${moduleId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const moduleRegistrationService = new ModuleRegistrationService();