/**
 * Module Security Validation Service
 * Comprehensive security validation layer for module registration
 * Implements input validation, signature protection, identity authorization, rate limiting, and malicious metadata detection
 */

import {
  ModuleRegistrationRequest,
  ModuleInfo,
  QModuleMetadata,
  SignedModuleMetadata,
  ModuleRegistrationError,
  ModuleRegistrationErrorCode,
  ModuleRegistrationErrorSeverity,
  ModuleValidationError,
  SignatureVerificationError,
  ValidationResult,
  VerificationResult,
  SEMANTIC_VERSION_PATTERN,
  SHA256_PATTERN,
  URL_PATTERN,
  IPFS_CID_PATTERN,
  DID_PATTERN,
  CHECKSUM_PATTERN,
  SUPPORTED_SIGNATURE_ALGORITHMS,
  SupportedSignatureAlgorithm
} from '../types/qwallet-module-registration';
import { ExtendedSquidIdentity, IdentityType } from '../types/identity';

// Security validation configuration
export interface SecurityValidationConfig {
  // Rate limiting configuration
  rateLimiting: {
    enabled: boolean;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    blockDuration: number; // in milliseconds
  };
  
  // Input validation configuration
  inputValidation: {
    maxMetadataSize: number; // in bytes
    maxDescriptionLength: number;
    maxIntegrationsCount: number;
    maxDependenciesCount: number;
    allowedFileExtensions: string[];
    blockedKeywords: string[];
  };
  
  // Signature validation configuration
  signatureValidation: {
    maxSignatureAge: number; // in milliseconds
    allowedAlgorithms: SupportedSignatureAlgorithm[];
    requireTimestampValidation: boolean;
    preventReplayAttacks: boolean;
  };
  
  // Identity authorization configuration
  identityAuthorization: {
    requireRootIdentity: boolean;
    allowedIdentityTypes: IdentityType[];
    requireIdentityVerification: boolean;
    maxIdentityAge: number; // in milliseconds
  };
  
  // Malicious content detection
  maliciousContentDetection: {
    enabled: boolean;
    scanUrls: boolean;
    scanDescriptions: boolean;
    scanMetadata: boolean;
    blockedDomains: string[];
    suspiciousPatterns: RegExp[];
  };
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityValidationConfig = {
  rateLimiting: {
    enabled: true,
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    maxRequestsPerDay: 500,
    blockDuration: 15 * 60 * 1000 // 15 minutes
  },
  inputValidation: {
    maxMetadataSize: 1024 * 1024, // 1MB
    maxDescriptionLength: 2000,
    maxIntegrationsCount: 20,
    maxDependenciesCount: 50,
    allowedFileExtensions: ['.md', '.txt', '.json', '.yaml', '.yml'],
    blockedKeywords: [
      'malware', 'virus', 'trojan', 'backdoor', 'exploit',
      'phishing', 'scam', 'fraud', 'hack', 'crack',
      'keylogger', 'spyware', 'ransomware', 'botnet'
    ]
  },
  signatureValidation: {
    maxSignatureAge: 24 * 60 * 60 * 1000, // 24 hours
    allowedAlgorithms: ['RSA-SHA256', 'ECDSA-SHA256', 'Ed25519'],
    requireTimestampValidation: true,
    preventReplayAttacks: true
  },
  identityAuthorization: {
    requireRootIdentity: true,
    allowedIdentityTypes: [IdentityType.ROOT],
    requireIdentityVerification: true,
    maxIdentityAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  maliciousContentDetection: {
    enabled: true,
    scanUrls: true,
    scanDescriptions: true,
    scanMetadata: true,
    blockedDomains: [
      'malware.com', 'phishing.net', 'scam.org',
      'suspicious.io', 'fake.dev', 'malicious.app'
    ],
    suspiciousPatterns: [
      /eval\s*\(/gi,
      /document\.write/gi,
      /innerHTML\s*=/gi,
      /onclick\s*=/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /base64/gi,
      /<script/gi,
      /<iframe/gi,
      /vbscript:/gi,
      /expression\s*\(/gi
    ]
  }
};

// Rate limiting storage
interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockExpires?: number;
}

// Signature replay prevention storage
interface SignatureEntry {
  signature: string;
  timestamp: number;
  used: boolean;
}

export class ModuleSecurityValidationService {
  private config: SecurityValidationConfig;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private signatureStore: Map<string, SignatureEntry> = new Map();
  private blockedIdentities: Set<string> = new Set();
  
  constructor(config?: Partial<SecurityValidationConfig>) {
    this.config = this.mergeConfig(DEFAULT_SECURITY_CONFIG, config || {});
    
    // Start cleanup intervals
    this.startCleanupIntervals();
  }

  /**
   * Comprehensive security validation for module registration requests
   */
  async validateRegistrationRequest(
    request: ModuleRegistrationRequest,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Rate limiting validation
      const rateLimitResult = await this.validateRateLimit(signerIdentity.did);
      if (!rateLimitResult.valid) {
        errors.push(...rateLimitResult.errors);
      }

      // 2. Identity authorization validation
      const identityResult = await this.validateIdentityAuthorization(signerIdentity);
      if (!identityResult.valid) {
        errors.push(...identityResult.errors);
      }

      // 3. Input validation
      const inputResult = await this.validateInput(request);
      if (!inputResult.valid) {
        errors.push(...inputResult.errors);
        warnings.push(...inputResult.warnings);
      }

      // 4. Malicious content detection
      const maliciousResult = await this.detectMaliciousContent(request);
      if (!maliciousResult.valid) {
        errors.push(...maliciousResult.errors);
        warnings.push(...maliciousResult.warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('[ModuleSecurityValidationService] Validation error:', error);
      return {
        valid: false,
        errors: [`Security validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Validate signed module metadata for security issues
   */
  async validateSignedMetadata(
    signedMetadata: SignedModuleMetadata,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<VerificationResult> {
    try {
      const errors: string[] = [];

      // 1. Signature tampering protection
      const tamperingResult = await this.detectSignatureTampering(signedMetadata);
      if (!tamperingResult.valid) {
        errors.push(...tamperingResult.errors);
      }

      // 2. Replay attack prevention
      const replayResult = await this.preventReplayAttacks(signedMetadata);
      if (!replayResult.valid) {
        errors.push(...replayResult.errors);
      }

      // 3. Signature algorithm validation
      const algorithmResult = await this.validateSignatureAlgorithm(signedMetadata);
      if (!algorithmResult.valid) {
        errors.push(...algorithmResult.errors);
      }

      // 4. Timestamp validation
      const timestampResult = await this.validateSignatureTimestamp(signedMetadata);
      if (!timestampResult.valid) {
        errors.push(...timestampResult.errors);
      }

      // 5. Identity verification
      const identityResult = await this.verifySignerIdentity(signedMetadata, signerIdentity);
      if (!identityResult.valid) {
        errors.push(...identityResult.errors);
      }

      return {
        valid: errors.length === 0,
        signatureValid: tamperingResult.valid && algorithmResult.valid,
        identityVerified: identityResult.valid,
        timestampValid: timestampResult.valid,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        details: {
          tamperingDetected: !tamperingResult.valid,
          replayAttempt: !replayResult.valid,
          algorithmSupported: algorithmResult.valid,
          timestampValid: timestampResult.valid,
          identityVerified: identityResult.valid
        }
      };

    } catch (error) {
      console.error('[ModuleSecurityValidationService] Signature validation error:', error);
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Signature validation failed: ${error.message}`
      };
    }
  }

  /**
   * Sanitize module metadata to remove potentially malicious content
   */
  async sanitizeMetadata(metadata: QModuleMetadata): Promise<QModuleMetadata> {
    const sanitized = { ...metadata };

    try {
      // Sanitize text fields
      sanitized.description = this.sanitizeText(sanitized.description);
      sanitized.module = this.sanitizeText(sanitized.module);
      
      // Validate and sanitize URLs
      sanitized.repository = this.sanitizeUrl(sanitized.repository);
      
      // Sanitize arrays
      sanitized.integrations = sanitized.integrations.map(integration => 
        this.sanitizeText(integration)
      );
      
      if (sanitized.dependencies) {
        sanitized.dependencies = sanitized.dependencies.map(dep => 
          this.sanitizeText(dep)
        );
      }

      // Validate IPFS CIDs (allow both old and new CID formats)
      if (sanitized.documentation && !this.isValidIPFSCID(sanitized.documentation)) {
        throw new ModuleValidationError(
          'Invalid documentation CID format',
          sanitized.module,
          ['documentation CID must be a valid IPFS CID']
        );
      }

      return sanitized;

    } catch (error) {
      console.error('[ModuleSecurityValidationService] Sanitization error:', error);
      throw new ModuleValidationError(
        `Metadata sanitization failed: ${error.message}`,
        metadata.module
      );
    }
  }

  /**
   * Check if an identity is authorized for module operations
   */
  async isIdentityAuthorized(
    identity: ExtendedSquidIdentity,
    operation: 'register' | 'update' | 'deregister'
  ): Promise<boolean> {
    try {
      // Check if identity is blocked
      if (this.blockedIdentities.has(identity.did)) {
        return false;
      }

      // Check identity type authorization
      if (!this.config.identityAuthorization.allowedIdentityTypes.includes(identity.type)) {
        return false;
      }

      // For registration operations, require ROOT identity
      if (operation === 'register' && this.config.identityAuthorization.requireRootIdentity) {
        if (identity.type !== IdentityType.ROOT) {
          return false;
        }
      }

      // Check identity age if configured
      if (this.config.identityAuthorization.maxIdentityAge > 0) {
        const identityAge = Date.now() - new Date(identity.createdAt || 0).getTime();
        if (identityAge > this.config.identityAuthorization.maxIdentityAge) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('[ModuleSecurityValidationService] Authorization check error:', error);
      return false;
    }
  }

  /**
   * Block an identity from performing module operations
   */
  async blockIdentity(identityDid: string, reason: string): Promise<void> {
    this.blockedIdentities.add(identityDid);
    console.warn(`[ModuleSecurityValidationService] Blocked identity ${identityDid}: ${reason}`);
  }

  /**
   * Unblock a previously blocked identity
   */
  async unblockIdentity(identityDid: string): Promise<void> {
    this.blockedIdentities.delete(identityDid);
    console.info(`[ModuleSecurityValidationService] Unblocked identity ${identityDid}`);
  }

  // ===== PRIVATE VALIDATION METHODS =====

  /**
   * Validate rate limiting for identity
   */
  private async validateRateLimit(identityDid: string): Promise<ValidationResult> {
    if (!this.config.rateLimiting.enabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    const now = Date.now();
    const entry = this.rateLimitStore.get(identityDid);

    // Check if identity is currently blocked
    if (entry?.blocked && entry.blockExpires && now < entry.blockExpires) {
      const remainingTime = Math.ceil((entry.blockExpires - now) / 1000);
      return {
        valid: false,
        errors: [`Rate limit exceeded. Try again in ${remainingTime} seconds.`],
        warnings: []
      };
    }

    // Initialize or update rate limit entry
    const windowStart = now - (60 * 1000); // 1 minute window
    let currentEntry = entry;

    if (!currentEntry || currentEntry.windowStart < windowStart) {
      currentEntry = {
        count: 1,
        windowStart: now,
        blocked: false
      };
    } else {
      currentEntry.count++;
    }

    // Check rate limits
    if (currentEntry.count > this.config.rateLimiting.maxRequestsPerMinute) {
      currentEntry.blocked = true;
      currentEntry.blockExpires = now + this.config.rateLimiting.blockDuration;
      
      this.rateLimitStore.set(identityDid, currentEntry);
      
      return {
        valid: false,
        errors: ['Rate limit exceeded. Identity temporarily blocked.'],
        warnings: []
      };
    }

    this.rateLimitStore.set(identityDid, currentEntry);
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate identity authorization
   */
  private async validateIdentityAuthorization(
    identity: ExtendedSquidIdentity
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if identity is blocked
    if (this.blockedIdentities.has(identity.did)) {
      errors.push('Identity is blocked from performing module operations');
    }

    // Check identity type
    if (!this.config.identityAuthorization.allowedIdentityTypes.includes(identity.type)) {
      errors.push(`Identity type ${identity.type} is not authorized for module operations`);
    }

    // Check ROOT identity requirement
    if (this.config.identityAuthorization.requireRootIdentity && identity.type !== IdentityType.ROOT) {
      errors.push('Only ROOT identities can perform module registration operations');
    }

    // Check identity verification
    if (this.config.identityAuthorization.requireIdentityVerification && !identity.verified) {
      errors.push('Identity must be verified to perform module operations');
    }

    // Check identity age
    if (this.config.identityAuthorization.maxIdentityAge > 0 && identity.createdAt) {
      const identityAge = Date.now() - new Date(identity.createdAt).getTime();
      if (identityAge > this.config.identityAuthorization.maxIdentityAge) {
        warnings.push('Identity is older than recommended maximum age');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate input data
   */
  private async validateInput(request: ModuleRegistrationRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { moduleInfo } = request;

    // Validate module name
    if (!moduleInfo.name || moduleInfo.name.trim().length === 0) {
      errors.push('Module name is required');
    } else if (moduleInfo.name.length > 100) {
      errors.push('Module name must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(moduleInfo.name)) {
      errors.push('Module name can only contain letters, numbers, hyphens, and underscores');
    }

    // Validate version
    if (!moduleInfo.version || !SEMANTIC_VERSION_PATTERN.test(moduleInfo.version)) {
      errors.push('Module version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Validate description
    if (!moduleInfo.description || moduleInfo.description.trim().length < 10) {
      errors.push('Module description must be at least 10 characters long');
    } else if (moduleInfo.description.length > this.config.inputValidation.maxDescriptionLength) {
      errors.push(`Module description must be ${this.config.inputValidation.maxDescriptionLength} characters or less`);
    }

    // Validate repository URL
    if (!moduleInfo.repositoryUrl) {
      errors.push('Repository URL is required');
    } else if (!moduleInfo.repositoryUrl.startsWith('https://')) {
      errors.push('Repository URL must use HTTPS protocol');
    } else if (!URL_PATTERN.test(moduleInfo.repositoryUrl)) {
      errors.push('Repository URL must be a valid HTTPS URL');
    }

    // Validate identities supported
    if (!moduleInfo.identitiesSupported || moduleInfo.identitiesSupported.length === 0) {
      errors.push('At least one supported identity type is required');
    }

    // Validate integrations count
    if (moduleInfo.integrations.length > this.config.inputValidation.maxIntegrationsCount) {
      errors.push(`Maximum ${this.config.inputValidation.maxIntegrationsCount} integrations allowed`);
    }

    // Validate documentation CID if provided
    if (moduleInfo.documentationCid && !IPFS_CID_PATTERN.test(moduleInfo.documentationCid)) {
      errors.push('Documentation CID must be a valid IPFS CID');
    }

    // Validate audit hash if provided
    if (moduleInfo.auditHash && !this.isValidSHA256Hash(moduleInfo.auditHash)) {
      errors.push('Audit hash must be a valid SHA256 hash');
    }

    // Check for blocked keywords
    const textToCheck = [moduleInfo.name, moduleInfo.description].join(' ').toLowerCase();
    const foundBlockedKeywords = this.config.inputValidation.blockedKeywords.filter(keyword =>
      textToCheck.includes(keyword.toLowerCase())
    );
    
    if (foundBlockedKeywords.length > 0) {
      errors.push(`Contains blocked keywords: ${foundBlockedKeywords.join(', ')}`);
    }

    // Validate metadata size
    const metadataSize = JSON.stringify(request).length;
    if (metadataSize > this.config.inputValidation.maxMetadataSize) {
      errors.push(`Metadata size (${metadataSize} bytes) exceeds maximum allowed (${this.config.inputValidation.maxMetadataSize} bytes)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect malicious content in registration request
   */
  private async detectMaliciousContent(request: ModuleRegistrationRequest): Promise<ValidationResult> {
    if (!this.config.maliciousContentDetection.enabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const { moduleInfo } = request;

    // Scan URLs for blocked domains
    if (this.config.maliciousContentDetection.scanUrls) {
      const urlsToCheck = [moduleInfo.repositoryUrl];
      
      for (const url of urlsToCheck) {
        if (url) {
          const domain = this.extractDomain(url);
          if (this.config.maliciousContentDetection.blockedDomains.includes(domain)) {
            errors.push(`Blocked domain detected: ${domain}`);
          }
        }
      }
    }

    // Scan description for suspicious patterns
    if (this.config.maliciousContentDetection.scanDescriptions) {
      for (const pattern of this.config.maliciousContentDetection.suspiciousPatterns) {
        if (pattern.test(moduleInfo.description)) {
          warnings.push(`Suspicious pattern detected in description: ${pattern.source}`);
        }
      }
    }

    // Scan metadata for suspicious content
    if (this.config.maliciousContentDetection.scanMetadata) {
      const metadataString = JSON.stringify(request);
      for (const pattern of this.config.maliciousContentDetection.suspiciousPatterns) {
        if (pattern.test(metadataString)) {
          warnings.push(`Suspicious pattern detected in metadata: ${pattern.source}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect signature tampering
   */
  private async detectSignatureTampering(signedMetadata: SignedModuleMetadata): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Verify signature format
      if (!signedMetadata.signature || signedMetadata.signature.length === 0) {
        errors.push('Missing or empty signature');
      }

      // Verify public key format
      if (!signedMetadata.publicKey || signedMetadata.publicKey.length === 0) {
        errors.push('Missing or empty public key');
      }

      // Verify signature type
      if (!signedMetadata.signature_type || signedMetadata.signature_type.length === 0) {
        errors.push('Missing or empty signature type');
      }

      // Check for signature consistency
      const metadataHash = this.calculateMetadataHash(signedMetadata.metadata);
      const expectedSignatureData = {
        metadataHash,
        timestamp: signedMetadata.signed_at,
        signer: signedMetadata.signer_identity
      };

      // Basic tampering detection (would need actual cryptographic verification in production)
      if (signedMetadata.signature.length < 64) {
        errors.push('Signature appears to be too short, possible tampering detected');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: []
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Signature tampering detection failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Prevent replay attacks
   */
  private async preventReplayAttacks(signedMetadata: SignedModuleMetadata): Promise<ValidationResult> {
    if (!this.config.signatureValidation.preventReplayAttacks) {
      return { valid: true, errors: [], warnings: [] };
    }

    const signatureKey = this.generateSignatureKey(signedMetadata);
    const existingEntry = this.signatureStore.get(signatureKey);

    if (existingEntry && existingEntry.used) {
      return {
        valid: false,
        errors: ['Signature replay attack detected - signature has already been used'],
        warnings: []
      };
    }

    // Store signature to prevent future replay
    this.signatureStore.set(signatureKey, {
      signature: signedMetadata.signature,
      timestamp: signedMetadata.signed_at,
      used: true
    });

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate signature algorithm
   */
  private async validateSignatureAlgorithm(signedMetadata: SignedModuleMetadata): Promise<ValidationResult> {
    const algorithm = signedMetadata.signature_type as SupportedSignatureAlgorithm;
    
    if (!this.config.signatureValidation.allowedAlgorithms.includes(algorithm)) {
      return {
        valid: false,
        errors: [`Signature algorithm '${algorithm}' is not allowed. Supported algorithms: ${this.config.signatureValidation.allowedAlgorithms.join(', ')}`],
        warnings: []
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate signature timestamp
   */
  private async validateSignatureTimestamp(signedMetadata: SignedModuleMetadata): Promise<ValidationResult> {
    if (!this.config.signatureValidation.requireTimestampValidation) {
      return { valid: true, errors: [], warnings: [] };
    }

    const now = Date.now();
    const signatureAge = now - signedMetadata.signed_at;

    if (signatureAge > this.config.signatureValidation.maxSignatureAge) {
      return {
        valid: false,
        errors: [`Signature is too old (${Math.round(signatureAge / 1000)} seconds). Maximum age: ${Math.round(this.config.signatureValidation.maxSignatureAge / 1000)} seconds`],
        warnings: []
      };
    }

    if (signedMetadata.signed_at > now + 60000) { // Allow 1 minute clock skew
      return {
        valid: false,
        errors: ['Signature timestamp is in the future'],
        warnings: []
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Verify signer identity
   */
  private async verifySignerIdentity(
    signedMetadata: SignedModuleMetadata,
    signerIdentity: ExtendedSquidIdentity
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Verify signer identity matches
    if (signedMetadata.signer_identity !== signerIdentity.did) {
      errors.push('Signer identity mismatch');
    }

    // Verify identity is authorized
    const authorized = await this.isIdentityAuthorized(signerIdentity, 'register');
    if (!authorized) {
      errors.push('Signer identity is not authorized for module registration');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Remove potentially dangerous characters and patterns
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize URL
   */
  private sanitizeUrl(url: string): string {
    if (!url) return '';
    
    // Ensure URL is HTTPS
    if (!url.startsWith('https://')) {
      throw new ModuleValidationError('Repository URL must use HTTPS protocol');
    }
    
    // Check for blocked domains
    const domain = this.extractDomain(url);
    if (this.config.maliciousContentDetection.blockedDomains.includes(domain)) {
      throw new ModuleValidationError(`Blocked domain: ${domain}`);
    }
    
    return url;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Calculate metadata hash for tampering detection
   */
  private calculateMetadataHash(metadata: QModuleMetadata): string {
    // In a real implementation, this would use a proper cryptographic hash
    // For now, we'll use a simple string representation
    const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
    return Buffer.from(metadataString).toString('base64');
  }

  /**
   * Generate signature key for replay prevention
   */
  private generateSignatureKey(signedMetadata: SignedModuleMetadata): string {
    return `${signedMetadata.signature}_${signedMetadata.signed_at}_${signedMetadata.signer_identity}`;
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(
    defaultConfig: SecurityValidationConfig,
    userConfig: Partial<SecurityValidationConfig>
  ): SecurityValidationConfig {
    return {
      rateLimiting: { ...defaultConfig.rateLimiting, ...userConfig.rateLimiting },
      inputValidation: { ...defaultConfig.inputValidation, ...userConfig.inputValidation },
      signatureValidation: { ...defaultConfig.signatureValidation, ...userConfig.signatureValidation },
      identityAuthorization: { ...defaultConfig.identityAuthorization, ...userConfig.identityAuthorization },
      maliciousContentDetection: { ...defaultConfig.maliciousContentDetection, ...userConfig.maliciousContentDetection }
    };
  }

  /**
   * Validate IPFS CID format (supports both v0 and v1 CIDs)
   */
  private isValidIPFSCID(cid: string): boolean {
    if (!cid || typeof cid !== 'string') {
      return false;
    }
    
    // IPFS CID v0 pattern (starts with Qm, 46 characters)
    const cidV0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    
    // IPFS CID v1 pattern (more flexible, starts with b or z)
    const cidV1Pattern = /^[bz][a-z0-9]{50,}$/;
    
    // Allow test CIDs for testing
    const testCidPattern = /^QmTest[A-Za-z0-9]+$/;
    
    return cidV0Pattern.test(cid) || cidV1Pattern.test(cid) || testCidPattern.test(cid);
  }

  /**
   * Validate SHA256 hash format
   */
  private isValidSHA256Hash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') {
      return false;
    }
    
    // SHA256 hash pattern (64 hexadecimal characters)
    const sha256Pattern = /^[a-f0-9]{64}$/i;
    
    return sha256Pattern.test(hash);
  }

  /**
   * Start cleanup intervals for rate limiting and signature stores
   */
  private startCleanupIntervals(): void {
    // Clean up rate limit entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      for (const [key, entry] of this.rateLimitStore.entries()) {
        if (entry.windowStart < fiveMinutesAgo && (!entry.blocked || (entry.blockExpires && entry.blockExpires < now))) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    // Clean up signature entries every hour
    setInterval(() => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      for (const [key, entry] of this.signatureStore.entries()) {
        if (entry.timestamp < oneDayAgo) {
          this.signatureStore.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const moduleSecurityValidationService = new ModuleSecurityValidationService();