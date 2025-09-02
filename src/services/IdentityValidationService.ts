/**
 * Identity Validation Service
 * Handles type-specific validation logic for identity creation
 * Requirements: 2.11, 2.12, 2.13, 2.14
 */

import {
  IdentityType,
  ExtendedSquidIdentity,
  SubidentityMetadata,
  ValidationResult,
  IDENTITY_TYPE_RULES,
  GovernanceType,
  PrivacyLevel,
  ValidationError,
  GovernanceError
} from '@/types/identity';

export interface KYCValidationResult {
  required: boolean;
  level: 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL';
  approved: boolean;
  documents?: string[];
}

export interface GovernanceValidationResult {
  required: boolean;
  type: GovernanceType;
  daoId?: string;
  parentalConsent?: boolean;
  approved: boolean;
}

export interface IdentityCreationContext {
  parentIdentity: ExtendedSquidIdentity;
  requestedType: IdentityType;
  metadata: SubidentityMetadata;
  currentDepth: number;
  rootIdentity: ExtendedSquidIdentity;
}

/**
 * Identity Validation Service Class
 * Provides comprehensive validation for identity creation with type-specific rules
 */
export class IdentityValidationService {
  private static instance: IdentityValidationService;

  private constructor() {}

  public static getInstance(): IdentityValidationService {
    if (!IdentityValidationService.instance) {
      IdentityValidationService.instance = new IdentityValidationService();
    }
    return IdentityValidationService.instance;
  }

  /**
   * Comprehensive validation for identity creation
   * Validates all type-specific rules and requirements
   */
  async validateIdentityCreation(context: IdentityCreationContext): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements = {
      kyc: false,
      governance: false,
      parentalConsent: false,
      daoApproval: false
    };

    try {
      // Basic validation
      const basicValidation = this.validateBasicRequirements(context);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Type-specific validation
      const typeValidation = await this.validateTypeSpecificRules(context);
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);
      Object.assign(requirements, typeValidation.requirements);

      // KYC validation
      const kycValidation = await this.validateKYCRequirements(context);
      errors.push(...kycValidation.errors);
      warnings.push(...kycValidation.warnings);
      requirements.kyc = kycValidation.required;

      // Governance validation
      const governanceValidation = await this.validateGovernanceRequirements(context);
      errors.push(...governanceValidation.errors);
      warnings.push(...governanceValidation.warnings);
      requirements.governance = governanceValidation.required;
      requirements.daoApproval = governanceValidation.daoApproval;
      requirements.parentalConsent = governanceValidation.parentalConsent;

      // Depth and hierarchy validation
      const hierarchyValidation = this.validateHierarchyRules(context);
      errors.push(...hierarchyValidation.errors);
      warnings.push(...hierarchyValidation.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        requirements
      };

    } catch (error) {
      console.error('[IdentityValidationService] Validation error:', error);
      return {
        valid: false,
        errors: ['Validation process failed'],
        warnings: [],
        requirements
      };
    }
  }

  /**
   * Validate basic requirements for identity creation
   */
  private validateBasicRequirements(context: IdentityCreationContext): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if parent exists
    if (!context.parentIdentity) {
      errors.push('Parent identity is required');
      return { errors, warnings };
    }

    // Check if parent can create subidentities
    if (!context.parentIdentity.permissions.canCreateSubidentities) {
      errors.push('Parent identity cannot create subidentities');
    }

    // Check if requested type is valid
    if (!Object.values(IdentityType).includes(context.requestedType)) {
      errors.push(`Invalid identity type: ${context.requestedType}`);
    }

    // Check metadata requirements
    if (!context.metadata.name || context.metadata.name.trim().length === 0) {
      errors.push('Identity name is required');
    }

    if (context.metadata.name && context.metadata.name.length > 100) {
      errors.push('Identity name must be 100 characters or less');
    }

    if (context.metadata.description && context.metadata.description.length > 500) {
      warnings.push('Identity description is quite long');
    }

    return { errors, warnings };
  }

  /**
   * Validate type-specific creation rules
   * Requirements: 2.11, 2.12, 2.13, 2.14
   */
  private async validateTypeSpecificRules(context: IdentityCreationContext): Promise<{
    errors: string[],
    warnings: string[],
    requirements: { kyc: boolean, governance: boolean, parentalConsent: boolean, daoApproval: boolean }
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements = {
      kyc: false,
      governance: false,
      parentalConsent: false,
      daoApproval: false
    };

    switch (context.requestedType) {
      case IdentityType.CONSENTIDA:
        return this.validateConsentidaRules(context, errors, warnings, requirements);
      
      case IdentityType.ENTERPRISE:
        return this.validateEnterpriseRules(context, errors, warnings, requirements);
      
      case IdentityType.DAO:
        return this.validateDAORules(context, errors, warnings, requirements);
      
      case IdentityType.AID:
        return this.validateAIDRules(context, errors, warnings, requirements);
      
      default:
        errors.push(`Unsupported identity type: ${context.requestedType}`);
    }

    return { errors, warnings, requirements };
  }

  /**
   * Validate Consentida identity creation rules
   * Requirement 2.11: Consentida identities do not require KYC and cannot create sub-identities
   */
  private validateConsentidaRules(
    context: IdentityCreationContext,
    errors: string[],
    warnings: string[],
    requirements: any
  ): { errors: string[], warnings: string[], requirements: any } {
    // Consentida identities can only be created by root identities
    if (context.parentIdentity.type !== IdentityType.ROOT) {
      errors.push('Consentida identities can only be created by root identities');
    }

    // Consentida identities require parental consent
    requirements.parentalConsent = true;
    if (!context.metadata.governanceConfig?.parentalConsent) {
      errors.push('Parental consent is required for Consentida identities');
    }

    // Consentida identities do not require KYC
    requirements.kyc = false;

    // Consentida identities are private by default
    if (context.metadata.privacyLevel && context.metadata.privacyLevel !== PrivacyLevel.PRIVATE) {
      warnings.push('Consentida identities should be private for safety');
    }

    // Check age-appropriate naming
    if (context.metadata.name && this.containsInappropriateContent(context.metadata.name)) {
      errors.push('Identity name contains inappropriate content for Consentida identity');
    }

    return { errors, warnings, requirements };
  }

  /**
   * Validate Enterprise identity creation rules
   * Requirement 2.12: Enterprise identities require DAO governance and are publicly visible
   */
  private validateEnterpriseRules(
    context: IdentityCreationContext,
    errors: string[],
    warnings: string[],
    requirements: any
  ): { errors: string[], warnings: string[], requirements: any } {
    // Enterprise identities require DAO governance
    requirements.governance = true;
    requirements.daoApproval = true;

    if (!context.metadata.governanceConfig?.daoId) {
      errors.push('DAO governance is required for Enterprise identities');
    }

    // Parent must have approved KYC
    if (!context.parentIdentity.kyc.approved) {
      errors.push('Parent identity must have approved KYC for Enterprise identity creation');
    }

    // Enterprise identities must be publicly visible
    if (context.metadata.privacyLevel && context.metadata.privacyLevel !== PrivacyLevel.PUBLIC) {
      errors.push('Enterprise identities must be publicly visible');
    }

    // Enterprise identities cannot create subidentities
    if (context.metadata.governanceConfig?.governanceRules?.canCreateSubidentities) {
      warnings.push('Enterprise identities typically cannot create subidentities');
    }

    // Validate business-appropriate naming
    if (context.metadata.name && !this.isBusinessAppropriate(context.metadata.name)) {
      warnings.push('Identity name should be business-appropriate for Enterprise identity');
    }

    return { errors, warnings, requirements };
  }

  /**
   * Validate DAO identity creation rules
   * Requirement 2.13: DAO identities require KYC and optionally allow sub-identity creation
   */
  private validateDAORules(
    context: IdentityCreationContext,
    errors: string[],
    warnings: string[],
    requirements: any
  ): { errors: string[], warnings: string[], requirements: any } {
    // DAO identities require KYC
    requirements.kyc = true;

    if (!context.rootIdentity.kyc.approved) {
      errors.push('Root identity must have approved KYC for DAO identity creation');
    }

    // DAO identities require governance setup
    requirements.governance = true;

    // DAO identities are typically created from root
    if (context.parentIdentity.type !== IdentityType.ROOT) {
      warnings.push('DAO identities are typically created directly from root identities');
    }

    // DAO identities are public by default
    if (context.metadata.privacyLevel && context.metadata.privacyLevel === PrivacyLevel.PRIVATE) {
      warnings.push('DAO identities should typically be public for transparency');
    }

    // Validate DAO naming conventions
    if (context.metadata.name && !this.isDAOAppropriate(context.metadata.name)) {
      warnings.push('Identity name should follow DAO naming conventions');
    }

    // Check for governance configuration
    if (!context.metadata.governanceConfig?.governanceRules) {
      warnings.push('DAO identities should have governance rules defined');
    }

    return { errors, warnings, requirements };
  }

  /**
   * Validate AID (Anonymous Identity) creation rules
   * Requirement 2.14: AID identities require root KYC and are completely private
   */
  private validateAIDRules(
    context: IdentityCreationContext,
    errors: string[],
    warnings: string[],
    requirements: any
  ): { errors: string[], warnings: string[], requirements: any } {
    // AID identities require root KYC verification
    requirements.kyc = true;

    if (!context.rootIdentity.kyc.approved) {
      errors.push('Root identity must have approved KYC for AID identity creation');
    }

    // AID identities must be completely private/anonymous
    if (context.metadata.privacyLevel && context.metadata.privacyLevel !== PrivacyLevel.ANONYMOUS) {
      errors.push('AID identities must be completely anonymous');
    }

    // AID identities cannot create subidentities
    if (context.metadata.governanceConfig?.governanceRules?.canCreateSubidentities) {
      errors.push('AID identities cannot create subidentities');
    }

    // Validate anonymous naming (no personal information)
    if (context.metadata.name && this.containsPersonalInformation(context.metadata.name)) {
      errors.push('AID identity name cannot contain personal information');
    }

    // Check for avatar restrictions
    if (context.metadata.avatar) {
      warnings.push('Consider using generic avatars for AID identities to maintain anonymity');
    }

    // Limit description for anonymity
    if (context.metadata.description && context.metadata.description.length > 100) {
      warnings.push('Keep AID identity descriptions brief to maintain anonymity');
    }

    return { errors, warnings, requirements };
  }

  /**
   * Validate KYC requirements based on identity type
   */
  private async validateKYCRequirements(context: IdentityCreationContext): Promise<{
    errors: string[],
    warnings: string[],
    required: boolean
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const typeRules = IDENTITY_TYPE_RULES[context.requestedType];
    const required = typeRules.kycRequired;

    if (required) {
      // Check if root identity has KYC
      if (!context.rootIdentity.kyc.approved) {
        errors.push(`KYC approval required for ${context.requestedType} identity creation`);
      }

      // Check KYC level requirements
      const requiredLevel = this.getRequiredKYCLevel(context.requestedType);
      if (context.rootIdentity.kyc.level && context.rootIdentity.kyc.level !== requiredLevel) {
        warnings.push(`${requiredLevel} KYC level recommended for ${context.requestedType} identities`);
      }
    }

    return { errors, warnings, required };
  }

  /**
   * Validate governance requirements
   */
  private async validateGovernanceRequirements(context: IdentityCreationContext): Promise<{
    errors: string[],
    warnings: string[],
    required: boolean,
    daoApproval: boolean,
    parentalConsent: boolean
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let required = false;
    let daoApproval = false;
    let parentalConsent = false;

    switch (context.requestedType) {
      case IdentityType.ENTERPRISE:
        required = true;
        daoApproval = true;
        if (!context.metadata.governanceConfig?.daoId) {
          errors.push('DAO approval required for Enterprise identities');
        }
        break;

      case IdentityType.CONSENTIDA:
        required = true;
        parentalConsent = true;
        if (!context.metadata.governanceConfig?.parentalConsent) {
          errors.push('Parental consent required for Consentida identities');
        }
        break;

      case IdentityType.DAO:
        required = true;
        // DAO identities govern themselves
        break;

      case IdentityType.AID:
        // AID identities are self-governed but require root verification
        if (!context.rootIdentity.kyc.approved) {
          errors.push('Root identity verification required for AID creation');
        }
        break;
    }

    return { errors, warnings, required, daoApproval, parentalConsent };
  }

  /**
   * Validate hierarchy and depth rules
   */
  private validateHierarchyRules(context: IdentityCreationContext): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check maximum depth
    if (context.currentDepth >= 3) {
      errors.push('Maximum identity depth (3 levels) exceeded');
    }

    // Check allowed child types
    const allowedChildTypes = this.getAllowedChildTypes(context.parentIdentity.type);
    if (!allowedChildTypes.includes(context.requestedType)) {
      errors.push(`${context.parentIdentity.type} identities cannot create ${context.requestedType} subidentities`);
    }

    // Check for circular references
    if (context.parentIdentity.path.includes(context.requestedType)) {
      errors.push('Circular identity hierarchy detected');
    }

    return { errors, warnings };
  }

  /**
   * Get required KYC level for identity type
   */
  private getRequiredKYCLevel(type: IdentityType): 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL' {
    switch (type) {
      case IdentityType.ENTERPRISE:
        return 'INSTITUTIONAL';
      case IdentityType.DAO:
        return 'ENHANCED';
      case IdentityType.AID:
        return 'ENHANCED';
      default:
        return 'BASIC';
    }
  }

  /**
   * Get allowed child types for parent identity type
   */
  private getAllowedChildTypes(parentType: IdentityType): IdentityType[] {
    switch (parentType) {
      case IdentityType.ROOT:
        return [IdentityType.DAO, IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID];
      case IdentityType.DAO:
        return [IdentityType.ENTERPRISE, IdentityType.CONSENTIDA, IdentityType.AID];
      case IdentityType.ENTERPRISE:
        return []; // Enterprise identities cannot create subidentities
      case IdentityType.CONSENTIDA:
        return []; // Consentida identities cannot create subidentities
      case IdentityType.AID:
        return []; // AID identities cannot create subidentities
      default:
        return [];
    }
  }

  /**
   * Content validation helpers
   */
  private containsInappropriateContent(name: string): boolean {
    // Simple inappropriate content check for Consentida identities
    const inappropriateWords = ['adult', 'mature', 'explicit'];
    return inappropriateWords.some(word => name.toLowerCase().includes(word));
  }

  private isBusinessAppropriate(name: string): boolean {
    // Check if name is appropriate for business/enterprise use
    const businessPattern = /^[A-Za-z0-9\s\-_&.]+$/;
    return businessPattern.test(name) && name.length >= 3;
  }

  private isDAOAppropriate(name: string): boolean {
    // Check if name follows DAO naming conventions
    const daoPattern = /^[A-Za-z0-9\s\-_]+$/;
    return daoPattern.test(name) && name.length >= 3;
  }

  private containsPersonalInformation(name: string): boolean {
    // Simple check for personal information in AID names
    const personalPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
    ];
    
    return personalPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Validate specific governance configuration
   */
  async validateGovernanceConfiguration(
    type: IdentityType,
    config: any
  ): Promise<{ valid: boolean, errors: string[] }> {
    const errors: string[] = [];

    switch (type) {
      case IdentityType.ENTERPRISE:
        if (!config.daoId) {
          errors.push('DAO ID is required for Enterprise identities');
        }
        if (config.daoId && !this.isValidDAOId(config.daoId)) {
          errors.push('Invalid DAO ID format');
        }
        break;

      case IdentityType.CONSENTIDA:
        if (!config.parentalConsent) {
          errors.push('Parental consent is required for Consentida identities');
        }
        if (config.parentSignature && !this.isValidSignature(config.parentSignature)) {
          errors.push('Invalid parental signature');
        }
        break;

      case IdentityType.DAO:
        if (config.governanceRules && !this.isValidGovernanceRules(config.governanceRules)) {
          errors.push('Invalid governance rules configuration');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper validation methods
   */
  private isValidDAOId(daoId: string): boolean {
    // Validate DAO ID format
    return /^dao:[a-z0-9-]+:[a-z0-9-]+$/.test(daoId);
  }

  private isValidSignature(signature: string): boolean {
    // Validate signature format (mock implementation)
    return signature.length >= 64 && /^[a-fA-F0-9]+$/.test(signature);
  }

  private isValidGovernanceRules(rules: any): boolean {
    // Validate governance rules structure
    return typeof rules === 'object' && rules !== null;
  }
}

// Export singleton instance
export const identityValidationService = IdentityValidationService.getInstance();
export default identityValidationService;