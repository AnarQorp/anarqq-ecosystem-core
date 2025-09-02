import crypto from 'crypto';
import { MaskProfile, MaskRule, MaskingResult, MaskingContext, AnonymizationConfig } from '../types/privacy';
import { logger } from '../utils/logger';
import { config } from '../config';

export class MaskingService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = config.encryptionKey;
  }

  /**
   * Apply privacy masking to data using a profile
   */
  async applyMasking(
    data: Record<string, any>,
    profile: MaskProfile,
    context?: MaskingContext
  ): Promise<MaskingResult> {
    const maskedData = { ...data };
    const appliedRules: Array<{
      field: string;
      strategy: string;
      applied: boolean;
      reason?: string;
    }> = [];
    const warnings: string[] = [];

    for (const rule of profile.rules) {
      try {
        const fieldValue = this.getNestedValue(maskedData, rule.field);
        
        if (fieldValue === undefined || fieldValue === null) {
          appliedRules.push({
            field: rule.field,
            strategy: rule.strategy,
            applied: false,
            reason: 'Field not found or null'
          });
          continue;
        }

        const maskedValue = await this.applyMaskingRule(fieldValue, rule, context);
        this.setNestedValue(maskedData, rule.field, maskedValue);

        appliedRules.push({
          field: rule.field,
          strategy: rule.strategy,
          applied: true
        });

        logger.debug(`Applied ${rule.strategy} masking to field: ${rule.field}`);
      } catch (error) {
        logger.error(`Failed to apply masking rule for field ${rule.field}:`, error);
        appliedRules.push({
          field: rule.field,
          strategy: rule.strategy,
          applied: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
        warnings.push(`Failed to mask field ${rule.field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate re-identification risk score
    const riskScore = this.calculateRiskScore(data, maskedData, profile);
    
    // Determine compliance flags
    const complianceFlags = this.determineComplianceFlags(profile, context);

    return {
      maskedData,
      appliedRules,
      riskScore,
      complianceFlags,
      warnings
    };
  }

  /**
   * Apply a single masking rule to a value
   */
  private async applyMaskingRule(
    value: any,
    rule: MaskRule,
    context?: MaskingContext
  ): Promise<any> {
    switch (rule.strategy) {
      case 'REDACT':
        return this.redactValue(value, rule.params);
      
      case 'HASH':
        return this.hashValue(value, rule.params);
      
      case 'ENCRYPT':
        return this.encryptValue(value, rule.params);
      
      case 'ANONYMIZE':
        return this.anonymizeValue(value, rule.params);
      
      case 'REMOVE':
        return undefined;
      
      default:
        throw new Error(`Unknown masking strategy: ${rule.strategy}`);
    }
  }

  /**
   * Redact a value with placeholder text
   */
  private redactValue(value: any, params?: Record<string, any>): string {
    const replacement = params?.replacement || '[REDACTED]';
    const preserveLength = params?.preserveLength || false;
    const preserveFormat = params?.preserveFormat || false;

    if (preserveLength && typeof value === 'string') {
      return '*'.repeat(value.length);
    }

    if (preserveFormat && typeof value === 'string') {
      // Preserve format for common patterns (email, phone, etc.)
      if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${'*'.repeat(local.length)}@${domain}`;
      }
      if (/^\d{3}-\d{3}-\d{4}$/.test(value)) {
        return 'XXX-XXX-XXXX';
      }
    }

    return replacement;
  }

  /**
   * Hash a value using cryptographic hash
   */
  private hashValue(value: any, params?: Record<string, any>): string {
    const algorithm = params?.algorithm || 'sha256';
    const salt = params?.salt || 'qmask-default-salt';
    const encoding = params?.encoding || 'hex';

    const hash = crypto.createHash(algorithm);
    hash.update(salt + String(value));
    return hash.digest(encoding as crypto.BinaryToTextEncoding);
  }

  /**
   * Encrypt a value (reversible)
   */
  private encryptValue(value: any, params?: Record<string, any>): string {
    const algorithm = params?.algorithm || 'aes-256-gcm';
    const key = params?.key || this.encryptionKey;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Anonymize a value using statistical techniques
   */
  private anonymizeValue(value: any, params?: Record<string, any>): any {
    const technique = params?.technique || 'generalization';
    
    switch (technique) {
      case 'generalization':
        return this.generalizeValue(value, params);
      
      case 'suppression':
        return null;
      
      case 'perturbation':
        return this.perturbValue(value, params);
      
      case 'synthetic':
        return this.generateSyntheticValue(value, params);
      
      default:
        return this.generalizeValue(value, params);
    }
  }

  /**
   * Generalize a value to reduce specificity
   */
  private generalizeValue(value: any, params?: Record<string, any>): any {
    if (typeof value === 'number') {
      const range = params?.range || 10;
      return Math.floor(value / range) * range;
    }

    if (typeof value === 'string') {
      // Age ranges
      if (/^\d{1,3}$/.test(value)) {
        const age = parseInt(value);
        if (age < 18) return '0-17';
        if (age < 30) return '18-29';
        if (age < 50) return '30-49';
        if (age < 65) return '50-64';
        return '65+';
      }

      // ZIP code generalization
      if (/^\d{5}$/.test(value)) {
        return value.substring(0, 3) + 'XX';
      }

      // Date generalization (year only)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value.substring(0, 4);
      }
    }

    return value;
  }

  /**
   * Add noise to numerical values
   */
  private perturbValue(value: any, params?: Record<string, any>): any {
    if (typeof value !== 'number') {
      return value;
    }

    const noiseLevel = params?.noiseLevel || 0.1;
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * value;
    return Math.round(value + noise);
  }

  /**
   * Generate synthetic replacement value
   */
  private generateSyntheticValue(value: any, params?: Record<string, any>): any {
    const type = params?.type || 'random';

    if (typeof value === 'string') {
      if (value.includes('@')) {
        // Generate synthetic email
        const domains = ['example.com', 'test.org', 'sample.net'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        return `user${Math.floor(Math.random() * 10000)}@${randomDomain}`;
      }

      if (/^\d+$/.test(value)) {
        // Generate synthetic number string
        return Math.floor(Math.random() * Math.pow(10, value.length)).toString().padStart(value.length, '0');
      }

      // Generate synthetic string
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      return Array.from({ length: value.length }, () => 
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    }

    if (typeof value === 'number') {
      const min = params?.min || 0;
      const max = params?.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return value;
  }

  /**
   * Calculate re-identification risk score
   */
  private calculateRiskScore(
    originalData: Record<string, any>,
    maskedData: Record<string, any>,
    profile: MaskProfile
  ): number {
    let riskScore = 0;
    let totalFields = 0;

    // Analyze each field for re-identification risk
    for (const [key, originalValue] of Object.entries(originalData)) {
      if (originalValue === null || originalValue === undefined) continue;
      
      totalFields++;
      const maskedValue = maskedData[key];
      
      // Calculate field-specific risk
      const fieldRisk = this.calculateFieldRisk(key, originalValue, maskedValue);
      riskScore += fieldRisk;
    }

    // Normalize risk score (0-1)
    const normalizedRisk = totalFields > 0 ? riskScore / totalFields : 0;
    
    // Apply profile-specific adjustments
    const profileRisk = this.calculateProfileRisk(profile);
    
    return Math.min(1, normalizedRisk + profileRisk);
  }

  /**
   * Calculate risk for a specific field
   */
  private calculateFieldRisk(field: string, originalValue: any, maskedValue: any): number {
    // Field completely removed
    if (maskedValue === undefined) return 0;
    
    // Field unchanged
    if (originalValue === maskedValue) return 1;
    
    // Field type-specific risk assessment
    const fieldType = this.identifyFieldType(field, originalValue);
    
    switch (fieldType) {
      case 'identifier':
        return maskedValue === originalValue ? 0.9 : 0.1;
      case 'quasi-identifier':
        return this.assessQuasiIdentifierRisk(originalValue, maskedValue);
      case 'sensitive':
        return maskedValue === originalValue ? 0.8 : 0.2;
      case 'non-sensitive':
        return maskedValue === originalValue ? 0.3 : 0.05;
      default:
        return 0.5;
    }
  }

  /**
   * Identify field type for risk assessment
   */
  private identifyFieldType(field: string, value: any): string {
    const fieldLower = field.toLowerCase();
    
    // Direct identifiers
    if (['id', 'ssn', 'passport', 'license'].some(id => fieldLower.includes(id))) {
      return 'identifier';
    }
    
    // Quasi-identifiers
    if (['name', 'email', 'phone', 'address', 'zip', 'birth', 'age'].some(qi => fieldLower.includes(qi))) {
      return 'quasi-identifier';
    }
    
    // Sensitive attributes
    if (['salary', 'medical', 'health', 'religion', 'political'].some(sa => fieldLower.includes(sa))) {
      return 'sensitive';
    }
    
    return 'non-sensitive';
  }

  /**
   * Assess quasi-identifier risk
   */
  private assessQuasiIdentifierRisk(originalValue: any, maskedValue: any): number {
    if (typeof originalValue === 'string' && typeof maskedValue === 'string') {
      // Calculate similarity ratio
      const similarity = this.calculateStringSimilarity(originalValue, maskedValue);
      return similarity * 0.7; // Quasi-identifiers have moderate risk
    }
    
    if (typeof originalValue === 'number' && typeof maskedValue === 'number') {
      const difference = Math.abs(originalValue - maskedValue) / Math.max(originalValue, 1);
      return Math.max(0, 0.7 - difference);
    }
    
    return 0.3; // Default moderate risk
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate profile-specific risk
   */
  private calculateProfileRisk(profile: MaskProfile): number {
    let profileRisk = 0;
    
    // More rules generally mean lower risk
    const ruleCountFactor = Math.max(0, 0.2 - (profile.rules.length * 0.02));
    profileRisk += ruleCountFactor;
    
    // Analyze rule strategies
    const strategies = profile.rules.map(rule => rule.strategy);
    const removeCount = strategies.filter(s => s === 'REMOVE').length;
    const encryptCount = strategies.filter(s => s === 'ENCRYPT').length;
    const hashCount = strategies.filter(s => s === 'HASH').length;
    
    // REMOVE strategy reduces risk most
    profileRisk -= (removeCount / profile.rules.length) * 0.3;
    
    // ENCRYPT and HASH reduce risk moderately
    profileRisk -= ((encryptCount + hashCount) / profile.rules.length) * 0.2;
    
    return Math.max(0, profileRisk);
  }

  /**
   * Determine compliance flags based on profile and context
   */
  private determineComplianceFlags(profile: MaskProfile, context?: MaskingContext): string[] {
    const flags: string[] = [];
    
    // GDPR compliance
    if (context?.jurisdiction === 'EU' || profile.name.toLowerCase().includes('gdpr')) {
      flags.push('GDPR');
    }
    
    // CCPA compliance
    if (context?.jurisdiction === 'CA' || profile.name.toLowerCase().includes('ccpa')) {
      flags.push('CCPA');
    }
    
    // HIPAA compliance (healthcare data)
    if (context?.purpose?.toLowerCase().includes('health') || 
        profile.name.toLowerCase().includes('hipaa')) {
      flags.push('HIPAA');
    }
    
    // PCI DSS compliance (payment data)
    if (context?.purpose?.toLowerCase().includes('payment') || 
        profile.name.toLowerCase().includes('pci')) {
      flags.push('PCI_DSS');
    }
    
    return flags;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    
    if (value === undefined) {
      delete target[lastKey];
    } else {
      target[lastKey] = value;
    }
  }
}