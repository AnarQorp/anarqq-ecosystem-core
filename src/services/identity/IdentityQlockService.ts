/**
 * Identity-specific Qlock Service
 * Manages per-identity encryption keys and automatic key switching
 */

import { 
  ExtendedSquidIdentity, 
  KeyPair, 
  IdentityType 
} from '@/types/identity';
import { 
  QModuleMetadata, 
  SignedModuleMetadata, 
  VerificationResult as ModuleVerificationResult,
  SupportedSignatureAlgorithm,
  SUPPORTED_SIGNATURE_ALGORITHMS
} from '@/types/qwallet-module-registration';
import * as QlockAPI from '@/api/qlock';

export interface IdentityQlockServiceInterface {
  // Key Management
  generateKeysForIdentity(identity: ExtendedSquidIdentity): Promise<KeyPair>;
  getKeysForIdentity(identityId: string): Promise<KeyPair | null>;
  updateKeysForIdentity(identityId: string, keyPair: KeyPair): Promise<boolean>;
  deleteKeysForIdentity(identityId: string): Promise<boolean>;
  
  // Encryption/Decryption
  encryptForIdentity(identityId: string, data: string, recipientPublicKey?: string): Promise<EncryptionResult | null>;
  decryptForIdentity(identityId: string, encryptedData: string): Promise<DecryptionResult>;
  
  // Identity Context Switching
  switchEncryptionContext(fromIdentityId: string, toIdentityId: string): Promise<boolean>;
  getActiveEncryptionContext(): Promise<string | null>;
  setActiveEncryptionContext(identityId: string): Promise<boolean>;
  
  // Key Derivation
  deriveKeyFromDID(did: string, algorithm?: string): Promise<string>;
  deriveKeyPairFromIdentity(identity: ExtendedSquidIdentity): Promise<KeyPair>;
  
  // Signing/Verification
  signForIdentity(identityId: string, data: string): Promise<SignatureResult>;
  verifyForIdentity(identityId: string, data: string, signature: string, publicKey: string): Promise<VerificationResult>;
  
  // Module Metadata Signing (NEW)
  signMetadata(metadata: QModuleMetadata, identityId: string): Promise<SignedModuleMetadata>;
  verifyMetadataSignature(signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult>;
  
  // Module-specific Key Management (NEW)
  generateModuleSigningKeys(identityId: string): Promise<ModuleKeyPair>;
  getModuleSigningKeys(identityId: string): Promise<ModuleKeyPair | null>;
  rotateModuleSigningKeys(identityId: string): Promise<boolean>;
  
  // Signature Validation (NEW)
  validateSignatureChain(moduleId: string): Promise<SignatureChainResult>;
  verifySignerAuthority(signerIdentity: string, moduleId: string): Promise<boolean>;
  
  // Key Isolation
  isolateKeys(identityId: string): Promise<boolean>;
  validateKeyIsolation(identityId: string): Promise<boolean>;
  
  // Bulk Operations
  generateKeysForAllIdentities(identities: ExtendedSquidIdentity[]): Promise<{ success: number; failed: number; errors: string[] }>;
  rotateKeysForIdentity(identityId: string): Promise<boolean>;
}

export interface EncryptionResult {
  encryptedData: string;
  metadata: {
    algorithm: string;
    keySize: number;
    quantumResistant: boolean;
    timestamp: number;
    identityId: string;
  };
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
  identityId?: string;
}

export interface SignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
  identityId?: string;
}

export interface VerificationResult {
  success: boolean;
  valid?: boolean;
  error?: string;
  identityId?: string;
}

// Module-specific interfaces
export interface ModuleKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
  algorithm: SupportedSignatureAlgorithm;
  createdAt: string;
  expiresAt?: string;
  identityId: string;
}

export interface SignatureChainResult {
  valid: boolean;
  chainLength: number;
  signatures: SignatureChainEntry[];
  rootVerified: boolean;
  error?: string;
}

export interface SignatureChainEntry {
  signature: string;
  publicKey: string;
  algorithm: SupportedSignatureAlgorithm;
  timestamp: string;
  signerIdentity: string;
  valid: boolean;
}

export class IdentityQlockService implements IdentityQlockServiceInterface {
  private identityKeys: Map<string, KeyPair> = new Map();
  private moduleSigningKeys: Map<string, ModuleKeyPair> = new Map();
  private activeEncryptionContext: string | null = null;
  private keyDerivationCache: Map<string, string> = new Map();
  private signatureChainCache: Map<string, SignatureChainResult> = new Map();

  constructor() {
    this.loadKeysFromStorage();
    this.loadModuleKeysFromStorage();
  }

  /**
   * Generate encryption keys for a specific identity
   */
  async generateKeysForIdentity(identity: ExtendedSquidIdentity): Promise<KeyPair> {
    try {
      // Determine encryption level based on identity type
      const encryptionLevel = this.getEncryptionLevelForIdentity(identity.type);
      
      // Generate keys using Qlock API
      const keys = await QlockAPI.generateKeys(encryptionLevel);
      
      // Create KeyPair object with metadata
      const keyPair: KeyPair = {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        algorithm: this.getAlgorithmForLevel(encryptionLevel),
        keySize: this.getKeySizeForLevel(encryptionLevel),
        createdAt: new Date().toISOString(),
        expiresAt: this.calculateExpirationDate(identity.type)
      };

      // Store keys
      this.identityKeys.set(identity.did, keyPair);
      await this.saveKeysToStorage();

      console.log(`[IdentityQlockService] Generated ${encryptionLevel} keys for identity: ${identity.did}`);
      
      return keyPair;
    } catch (error) {
      console.error('[IdentityQlockService] Error generating keys for identity:', error);
      throw new Error(`Failed to generate keys for identity: ${identity.did}`);
    }
  }

  /**
   * Get encryption keys for a specific identity
   */
  async getKeysForIdentity(identityId: string): Promise<KeyPair | null> {
    return this.identityKeys.get(identityId) || null;
  }

  /**
   * Update encryption keys for a specific identity
   */
  async updateKeysForIdentity(identityId: string, keyPair: KeyPair): Promise<boolean> {
    // Store the old keys in case we need to rollback
    const oldKeys = this.identityKeys.get(identityId);
    
    try {
      // Update keys in memory
      this.identityKeys.set(identityId, keyPair);
      
      // Try to save to storage
      await this.saveKeysToStorage();
      
      console.log(`[IdentityQlockService] Updated keys for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error updating keys:', error);
      
      // Rollback the in-memory change if storage failed
      if (oldKeys) {
        // If there were old keys, restore them
        this.identityKeys.set(identityId, oldKeys);
      } else {
        // If there were no old keys, remove the entry
        this.identityKeys.delete(identityId);
      }
      
      return false;
    }
  }

  /**
   * Delete encryption keys for a specific identity
   */
  async deleteKeysForIdentity(identityId: string): Promise<boolean> {
    try {
      const deleted = this.identityKeys.delete(identityId);
      
      if (deleted) {
        await this.saveKeysToStorage();
        
        // Clear from cache if it was the active context
        if (this.activeEncryptionContext === identityId) {
          this.activeEncryptionContext = null;
        }
        
        // Clear from derivation cache
        this.keyDerivationCache.delete(identityId);
        
        console.log(`[IdentityQlockService] Deleted keys for identity: ${identityId}`);
      }
      
      return deleted;
    } catch (error) {
      console.error('[IdentityQlockService] Error deleting keys:', error);
      return false;
    }
  }

  /**
   * Encrypt data for a specific identity
   */
  async encryptForIdentity(identityId: string, data: string, recipientPublicKey?: string): Promise<EncryptionResult | null> {
    try {
      const keyPair = await this.getKeysForIdentity(identityId);
      if (!keyPair) {
        console.error(`[IdentityQlockService] No keys found for identity: ${identityId}`);
        return null;
      }

      // Use recipient's public key if provided, otherwise use identity's own public key
      const publicKey = recipientPublicKey || keyPair.publicKey;
      
      // Determine encryption level from algorithm
      const encryptionLevel = this.getEncryptionLevelFromAlgorithm(keyPair.algorithm);
      
      // Encrypt using Qlock API
      const result = await QlockAPI.encrypt(data, publicKey, encryptionLevel);
      
      // Add identity metadata
      const encryptionResult: EncryptionResult = {
        ...result,
        metadata: {
          ...result.metadata,
          identityId
        }
      };

      console.log(`[IdentityQlockService] Encrypted data for identity: ${identityId}`);
      
      return encryptionResult;
    } catch (error) {
      console.error('[IdentityQlockService] Error encrypting for identity:', error);
      return null;
    }
  }

  /**
   * Decrypt data for a specific identity
   */
  async decryptForIdentity(identityId: string, encryptedData: string): Promise<DecryptionResult> {
    try {
      const keyPair = await this.getKeysForIdentity(identityId);
      if (!keyPair) {
        return {
          success: false,
          error: `No keys found for identity: ${identityId}`,
          identityId
        };
      }

      // Decrypt using Qlock API
      const result = await QlockAPI.decrypt(encryptedData, keyPair.privateKey);
      
      console.log(`[IdentityQlockService] Decryption result for identity ${identityId}: ${result.success}`);
      
      return {
        ...result,
        identityId
      };
    } catch (error) {
      console.error('[IdentityQlockService] Error decrypting for identity:', error);
      return {
        success: false,
        error: `Decryption failed for identity: ${identityId}`,
        identityId
      };
    }
  }

  /**
   * Switch encryption context between identities
   */
  async switchEncryptionContext(fromIdentityId: string, toIdentityId: string): Promise<boolean> {
    try {
      // Validate that target identity has keys
      const targetKeys = await this.getKeysForIdentity(toIdentityId);
      if (!targetKeys) {
        console.error(`[IdentityQlockService] No keys found for target identity: ${toIdentityId}`);
        return false;
      }

      // Update active context
      this.activeEncryptionContext = toIdentityId;
      
      // Store active context in session storage
      sessionStorage.setItem('active_encryption_context', toIdentityId);

      console.log(`[IdentityQlockService] Switched encryption context from ${fromIdentityId} to ${toIdentityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error switching encryption context:', error);
      return false;
    }
  }

  /**
   * Get active encryption context
   */
  async getActiveEncryptionContext(): Promise<string | null> {
    if (!this.activeEncryptionContext) {
      // Try to load from session storage
      this.activeEncryptionContext = sessionStorage.getItem('active_encryption_context');
    }
    
    return this.activeEncryptionContext;
  }

  /**
   * Set active encryption context
   */
  async setActiveEncryptionContext(identityId: string): Promise<boolean> {
    try {
      // Validate that identity has keys
      const keys = await this.getKeysForIdentity(identityId);
      if (!keys) {
        console.error(`[IdentityQlockService] Cannot set context for identity without keys: ${identityId}`);
        return false;
      }

      this.activeEncryptionContext = identityId;
      sessionStorage.setItem('active_encryption_context', identityId);
      
      console.log(`[IdentityQlockService] Set active encryption context: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error setting encryption context:', error);
      return false;
    }
  }

  /**
   * Derive encryption key from DID
   */
  async deriveKeyFromDID(did: string, algorithm: string = 'QUANTUM'): Promise<string> {
    const cacheKey = `${did}_${algorithm}`;
    
    // Check cache first
    if (this.keyDerivationCache.has(cacheKey)) {
      return this.keyDerivationCache.get(cacheKey)!;
    }

    try {
      // Use a deterministic key derivation function
      const encoder = new TextEncoder();
      const data = encoder.encode(did + '_' + algorithm + '_salt');
      
      // Simulate cryptographic key derivation
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Generate key based on algorithm requirements
      const baseKey = Math.abs(hash).toString(16).padStart(16, '0');
      const derivedKey = this.formatKeyForAlgorithm(baseKey, algorithm);
      
      // Cache the result
      this.keyDerivationCache.set(cacheKey, derivedKey);
      
      console.log(`[IdentityQlockService] Derived ${algorithm} key from DID: ${did.slice(0, 16)}...`);
      
      return derivedKey;
    } catch (error) {
      console.error('[IdentityQlockService] Error deriving key from DID:', error);
      throw new Error(`Failed to derive key from DID: ${did}`);
    }
  }

  /**
   * Derive key pair from identity
   */
  async deriveKeyPairFromIdentity(identity: ExtendedSquidIdentity): Promise<KeyPair> {
    try {
      const algorithm = this.getAlgorithmForIdentityType(identity.type);
      const privateKey = await this.deriveKeyFromDID(identity.did, algorithm);
      
      // Generate corresponding public key (simplified for demo)
      const publicKey = await this.derivePublicKeyFromPrivate(privateKey, algorithm);
      
      const keyPair: KeyPair = {
        publicKey,
        privateKey,
        algorithm: algorithm as any,
        keySize: this.getKeySizeForAlgorithm(algorithm),
        createdAt: new Date().toISOString(),
        expiresAt: this.calculateExpirationDate(identity.type)
      };

      console.log(`[IdentityQlockService] Derived key pair for identity: ${identity.did}`);
      
      return keyPair;
    } catch (error) {
      console.error('[IdentityQlockService] Error deriving key pair from identity:', error);
      throw new Error(`Failed to derive key pair for identity: ${identity.did}`);
    }
  }

  /**
   * Sign data for a specific identity
   */
  async signForIdentity(identityId: string, data: string): Promise<SignatureResult> {
    try {
      const keyPair = await this.getKeysForIdentity(identityId);
      if (!keyPair) {
        return {
          success: false,
          error: `No keys found for identity: ${identityId}`,
          identityId
        };
      }

      const encryptionLevel = this.getEncryptionLevelFromAlgorithm(keyPair.algorithm);
      const result = await QlockAPI.sign(data, keyPair.privateKey, encryptionLevel);
      
      console.log(`[IdentityQlockService] Signing result for identity ${identityId}: ${result.success}`);
      
      return {
        ...result,
        identityId
      };
    } catch (error) {
      console.error('[IdentityQlockService] Error signing for identity:', error);
      return {
        success: false,
        error: `Signing failed for identity: ${identityId}`,
        identityId
      };
    }
  }

  /**
   * Verify signature for a specific identity
   */
  async verifyForIdentity(identityId: string, data: string, signature: string, publicKey: string): Promise<VerificationResult> {
    try {
      const result = await QlockAPI.verify(data, signature, publicKey);
      
      console.log(`[IdentityQlockService] Verification result for identity ${identityId}: ${result.valid}`);
      
      return {
        ...result,
        identityId
      };
    } catch (error) {
      console.error('[IdentityQlockService] Error verifying for identity:', error);
      return {
        success: false,
        error: `Verification failed for identity: ${identityId}`,
        identityId
      };
    }
  }

  /**
   * Isolate keys for an identity (ensure no cross-contamination)
   */
  async isolateKeys(identityId: string): Promise<boolean> {
    try {
      const keyPair = await this.getKeysForIdentity(identityId);
      if (!keyPair) {
        return false;
      }

      // Verify key isolation by checking uniqueness
      const isIsolated = await this.validateKeyIsolation(identityId);
      
      if (!isIsolated) {
        console.warn(`[IdentityQlockService] Key isolation validation failed for identity: ${identityId}`);
        return false;
      }

      console.log(`[IdentityQlockService] Keys isolated successfully for identity: ${identityId}`);
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error isolating keys:', error);
      return false;
    }
  }

  /**
   * Validate key isolation for an identity
   */
  async validateKeyIsolation(identityId: string): Promise<boolean> {
    try {
      const keyPair = await this.getKeysForIdentity(identityId);
      if (!keyPair) {
        return false;
      }

      // Check that this identity's keys are unique
      let duplicateFound = false;
      for (const [otherId, otherKeys] of this.identityKeys) {
        if (otherId !== identityId) {
          if (otherKeys.publicKey === keyPair.publicKey || otherKeys.privateKey === keyPair.privateKey) {
            duplicateFound = true;
            break;
          }
        }
      }

      const isIsolated = !duplicateFound;
      
      console.log(`[IdentityQlockService] Key isolation validation for ${identityId}: ${isIsolated ? 'PASSED' : 'FAILED'}`);
      
      return isIsolated;
    } catch (error) {
      console.error('[IdentityQlockService] Error validating key isolation:', error);
      return false;
    }
  }

  /**
   * Generate keys for all identities
   */
  async generateKeysForAllIdentities(identities: ExtendedSquidIdentity[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const identity of identities) {
      try {
        await this.generateKeysForIdentity(identity);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to generate keys for ${identity.did}: ${error}`);
      }
    }

    console.log(`[IdentityQlockService] Bulk key generation completed: ${results.success} success, ${results.failed} failed`);
    
    return results;
  }

  /**
   * Rotate keys for an identity
   */
  async rotateKeysForIdentity(identityId: string): Promise<boolean> {
    try {
      // Get current keys to preserve metadata
      const currentKeys = await this.getKeysForIdentity(identityId);
      if (!currentKeys) {
        console.error(`[IdentityQlockService] Cannot rotate keys for non-existent identity: ${identityId}`);
        return false;
      }

      // Generate new keys with same algorithm
      const encryptionLevel = this.getEncryptionLevelFromAlgorithm(currentKeys.algorithm);
      const newKeys = await QlockAPI.generateKeys(encryptionLevel);
      
      // Create new key pair with updated timestamp
      const newKeyPair: KeyPair = {
        ...currentKeys,
        publicKey: newKeys.publicKey,
        privateKey: newKeys.privateKey,
        createdAt: new Date().toISOString()
      };

      // Update stored keys
      await this.updateKeysForIdentity(identityId, newKeyPair);
      
      // Clear derivation cache for this identity
      for (const [cacheKey] of this.keyDerivationCache) {
        if (cacheKey.startsWith(identityId)) {
          this.keyDerivationCache.delete(cacheKey);
        }
      }

      console.log(`[IdentityQlockService] Rotated keys for identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error rotating keys:', error);
      return false;
    }
  }

  // ===== MODULE SIGNING FUNCTIONALITY =====

  /**
   * Sign module metadata with ROOT identity
   */
  async signMetadata(metadata: QModuleMetadata, identityId: string): Promise<SignedModuleMetadata> {
    try {
      // Validate that the identity is authorized for module signing
      if (!await this.verifySignerAuthority(identityId, metadata.module)) {
        throw new Error(`Identity ${identityId} is not authorized to sign module metadata`);
      }

      // Get or generate module signing keys for this identity
      let moduleKeys = await this.getModuleSigningKeys(identityId);
      if (!moduleKeys) {
        moduleKeys = await this.generateModuleSigningKeys(identityId);
      }

      // Serialize metadata for signing
      const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
      
      // Create signature using module signing keys
      const signatureResult = await this.signDataWithModuleKeys(metadataString, moduleKeys);
      
      if (!signatureResult.success || !signatureResult.signature) {
        throw new Error(`Failed to sign metadata: ${signatureResult.error}`);
      }

      // Create signed metadata object
      const signedMetadata: SignedModuleMetadata = {
        metadata,
        signature: signatureResult.signature,
        publicKey: moduleKeys.publicKey,
        signature_type: moduleKeys.algorithm,
        signed_at: Date.now(),
        signer_identity: identityId
      };

      console.log(`[IdentityQlockService] Successfully signed metadata for module: ${metadata.module}`);
      
      return signedMetadata;
    } catch (error) {
      console.error('[IdentityQlockService] Error signing module metadata:', error);
      throw new Error(`Failed to sign module metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify module metadata signature
   */
  async verifyMetadataSignature(signedMetadata: SignedModuleMetadata): Promise<ModuleVerificationResult> {
    try {
      const { metadata, signature, publicKey, signature_type, signed_at, signer_identity } = signedMetadata;

      // Basic validation
      if (!signature || !publicKey || !signature_type || !signer_identity) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Missing required signature fields'
        };
      }

      // Verify signer authority
      const signerAuthorized = await this.verifySignerAuthority(signer_identity, metadata.module);
      if (!signerAuthorized) {
        return {
          valid: false,
          signatureValid: false,
          identityVerified: false,
          timestampValid: false,
          error: 'Signer is not authorized for this module'
        };
      }

      // Verify timestamp is reasonable (not too old or in the future)
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const timestampValid = signed_at > 0 && signed_at <= now && (now - signed_at) <= maxAge;

      // Serialize metadata for verification (same as signing)
      const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());

      // Verify signature
      const verificationResult = await QlockAPI.verify(metadataString, signature, publicKey);
      
      const result: ModuleVerificationResult = {
        valid: verificationResult.success && verificationResult.valid === true && signerAuthorized && timestampValid,
        signatureValid: verificationResult.success && verificationResult.valid === true,
        identityVerified: signerAuthorized,
        timestampValid,
        details: {
          algorithm: signature_type,
          signedAt: new Date(signed_at).toISOString(),
          signerIdentity: signer_identity,
          moduleId: metadata.module
        }
      };

      if (!result.valid) {
        result.error = `Verification failed: signature=${result.signatureValid}, identity=${result.identityVerified}, timestamp=${result.timestampValid}`;
      }

      console.log(`[IdentityQlockService] Metadata signature verification for ${metadata.module}: ${result.valid ? 'VALID' : 'INVALID'}`);
      
      return result;
    } catch (error) {
      console.error('[IdentityQlockService] Error verifying metadata signature:', error);
      return {
        valid: false,
        signatureValid: false,
        identityVerified: false,
        timestampValid: false,
        error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate module-specific signing keys for an identity
   */
  async generateModuleSigningKeys(identityId: string): Promise<ModuleKeyPair> {
    try {
      // Determine the appropriate algorithm for module signing
      const algorithm = this.getModuleSigningAlgorithm(identityId);
      
      // Generate keys using Qlock API with enhanced security for module signing
      const keys = await QlockAPI.generateKeys('QUANTUM');
      
      // Create unique key ID
      const keyId = `module_${identityId}_${Date.now()}`;
      
      // Calculate expiration (module signing keys have longer lifetime)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 2); // 2 years for module signing keys
      
      const moduleKeyPair: ModuleKeyPair = {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        keyId,
        algorithm,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        identityId
      };

      // Store module signing keys
      this.moduleSigningKeys.set(identityId, moduleKeyPair);
      await this.saveModuleKeysToStorage();

      console.log(`[IdentityQlockService] Generated module signing keys for identity: ${identityId}`);
      
      return moduleKeyPair;
    } catch (error) {
      console.error('[IdentityQlockService] Error generating module signing keys:', error);
      throw new Error(`Failed to generate module signing keys for identity: ${identityId}`);
    }
  }

  /**
   * Get module signing keys for an identity
   */
  async getModuleSigningKeys(identityId: string): Promise<ModuleKeyPair | null> {
    const keys = this.moduleSigningKeys.get(identityId);
    
    // Check if keys exist and are not expired
    if (keys && keys.expiresAt) {
      const now = new Date();
      const expirationDate = new Date(keys.expiresAt);
      
      if (now >= expirationDate) {
        console.warn(`[IdentityQlockService] Module signing keys expired for identity: ${identityId}`);
        // Remove expired keys
        this.moduleSigningKeys.delete(identityId);
        await this.saveModuleKeysToStorage();
        return null;
      }
    }
    
    return keys || null;
  }

  /**
   * Rotate module signing keys for an identity
   */
  async rotateModuleSigningKeys(identityId: string): Promise<boolean> {
    try {
      // Get current keys to preserve metadata
      const currentKeys = await this.getModuleSigningKeys(identityId);
      if (!currentKeys) {
        console.warn(`[IdentityQlockService] No existing module signing keys found for identity: ${identityId}`);
      }

      // Generate new module signing keys
      const newKeys = await this.generateModuleSigningKeys(identityId);
      
      // Clear signature chain cache for this identity
      for (const [cacheKey] of this.signatureChainCache) {
        if (cacheKey.includes(identityId)) {
          this.signatureChainCache.delete(cacheKey);
        }
      }

      console.log(`[IdentityQlockService] Rotated module signing keys for identity: ${identityId}`);
      
      return true;
    } catch (error) {
      console.error('[IdentityQlockService] Error rotating module signing keys:', error);
      return false;
    }
  }

  /**
   * Validate signature chain for a module
   */
  async validateSignatureChain(moduleId: string): Promise<SignatureChainResult> {
    try {
      const cacheKey = `chain_${moduleId}`;
      
      // Check cache first
      if (this.signatureChainCache.has(cacheKey)) {
        const cached = this.signatureChainCache.get(cacheKey)!;
        console.log(`[IdentityQlockService] Using cached signature chain for module: ${moduleId}`);
        return cached;
      }

      // For this implementation, we'll simulate a signature chain validation
      // In a real implementation, this would query the blockchain or distributed ledger
      const signatures: SignatureChainEntry[] = [];
      
      // Simulate finding signatures in the chain
      // This would typically involve querying Qindex for all signatures related to this module
      const mockSignature: SignatureChainEntry = {
        signature: 'mock_signature_' + moduleId,
        publicKey: 'mock_public_key',
        algorithm: 'RSA-SHA256',
        timestamp: new Date().toISOString(),
        signerIdentity: 'did:example:root',
        valid: true
      };
      
      signatures.push(mockSignature);

      // Validate each signature in the chain
      let allValid = true;
      let rootVerified = false;
      
      for (const sig of signatures) {
        // Check if this is a ROOT identity signature
        if (sig.signerIdentity.includes('root')) {
          rootVerified = true;
        }
        
        if (!sig.valid) {
          allValid = false;
        }
      }

      const result: SignatureChainResult = {
        valid: allValid && rootVerified,
        chainLength: signatures.length,
        signatures,
        rootVerified,
        error: allValid ? undefined : 'One or more signatures in the chain are invalid'
      };

      // Cache the result
      this.signatureChainCache.set(cacheKey, result);

      console.log(`[IdentityQlockService] Signature chain validation for ${moduleId}: ${result.valid ? 'VALID' : 'INVALID'}`);
      
      return result;
    } catch (error) {
      console.error('[IdentityQlockService] Error validating signature chain:', error);
      return {
        valid: false,
        chainLength: 0,
        signatures: [],
        rootVerified: false,
        error: `Chain validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verify signer authority for module registration
   */
  async verifySignerAuthority(signerIdentity: string, moduleId: string): Promise<boolean> {
    try {
      // Check if the signer is a ROOT identity
      if (signerIdentity.includes('root') || signerIdentity.includes('ROOT')) {
        console.log(`[IdentityQlockService] ROOT identity authorized for module signing: ${signerIdentity}`);
        return true;
      }

      // Check if the signer is a DAO identity with module registration permissions
      if (signerIdentity.includes('dao') || signerIdentity.includes('DAO')) {
        // In a real implementation, this would check DAO permissions
        console.log(`[IdentityQlockService] DAO identity authorized for module signing: ${signerIdentity}`);
        return true;
      }

      // Check if the signer is an ENTERPRISE identity with specific module permissions
      if (signerIdentity.includes('enterprise') || signerIdentity.includes('ENTERPRISE')) {
        // In a real implementation, this would check enterprise-specific permissions
        console.log(`[IdentityQlockService] ENTERPRISE identity authorized for module signing: ${signerIdentity}`);
        return true;
      }

      console.warn(`[IdentityQlockService] Identity not authorized for module signing: ${signerIdentity}`);
      return false;
    } catch (error) {
      console.error('[IdentityQlockService] Error verifying signer authority:', error);
      return false;
    }
  }

  // ===== PRIVATE HELPER METHODS FOR MODULE SIGNING =====

  /**
   * Sign data using module signing keys
   */
  private async signDataWithModuleKeys(data: string, moduleKeys: ModuleKeyPair): Promise<SignatureResult> {
    try {
      // Use the module signing keys to sign the data
      const encryptionLevel = 'QUANTUM'; // Module signing always uses highest security
      const result = await QlockAPI.sign(data, moduleKeys.privateKey, encryptionLevel);
      
      return {
        success: result.success,
        signature: result.signature,
        error: result.error,
        identityId: moduleKeys.identityId
      };
    } catch (error) {
      console.error('[IdentityQlockService] Error signing with module keys:', error);
      return {
        success: false,
        error: `Module signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        identityId: moduleKeys.identityId
      };
    }
  }

  /**
   * Get appropriate signature algorithm for module signing based on identity
   */
  private getModuleSigningAlgorithm(identityId: string): SupportedSignatureAlgorithm {
    // ROOT identities use the strongest available algorithm
    if (identityId.includes('root') || identityId.includes('ROOT')) {
      return 'RSA-PSS-SHA256';
    }
    
    // DAO identities use RSA-SHA256
    if (identityId.includes('dao') || identityId.includes('DAO')) {
      return 'RSA-SHA256';
    }
    
    // ENTERPRISE identities use ECDSA-SHA256
    if (identityId.includes('enterprise') || identityId.includes('ENTERPRISE')) {
      return 'ECDSA-SHA256';
    }
    
    // Default to RSA-SHA256 for other identity types
    return 'RSA-SHA256';
  }

  /**
   * Load module signing keys from storage
   */
  private async loadModuleKeysFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('identity_module_signing_keys');
      if (stored) {
        const keysData = JSON.parse(stored);
        this.moduleSigningKeys = new Map(Object.entries(keysData));
        console.log(`[IdentityQlockService] Loaded ${this.moduleSigningKeys.size} module signing key pairs from storage`);
      }
    } catch (error) {
      console.error('[IdentityQlockService] Error loading module keys from storage:', error);
    }
  }

  /**
   * Save module signing keys to storage
   */
  private async saveModuleKeysToStorage(): Promise<void> {
    try {
      const keysData = Object.fromEntries(this.moduleSigningKeys);
      localStorage.setItem('identity_module_signing_keys', JSON.stringify(keysData));
    } catch (error) {
      console.error('[IdentityQlockService] Error saving module keys to storage:', error);
      throw error;
    }
  }

  // Private helper methods

  private getEncryptionLevelForIdentity(identityType: IdentityType): string {
    switch (identityType) {
      case IdentityType.ROOT:
      case IdentityType.DAO:
        return 'QUANTUM';
      case IdentityType.ENTERPRISE:
        return 'ENHANCED';
      case IdentityType.CONSENTIDA:
        return 'STANDARD';
      case IdentityType.AID:
        return 'ADVANCED_QUANTUM';
      default:
        return 'QUANTUM';
    }
  }

  private getAlgorithmForLevel(level: string): 'RSA' | 'ECDSA' | 'QUANTUM' {
    switch (level) {
      case 'STANDARD':
      case 'ENHANCED':
        return 'RSA';
      case 'QUANTUM':
      case 'ADVANCED_QUANTUM':
        return 'QUANTUM';
      default:
        return 'QUANTUM';
    }
  }

  private getKeySizeForLevel(level: string): number {
    switch (level) {
      case 'STANDARD':
        return 256;
      case 'ENHANCED':
        return 384;
      case 'QUANTUM':
        return 512;
      case 'ADVANCED_QUANTUM':
        return 1024;
      default:
        return 512;
    }
  }

  private getAlgorithmForIdentityType(identityType: IdentityType): string {
    switch (identityType) {
      case IdentityType.ROOT:
      case IdentityType.DAO:
        return 'QUANTUM';
      case IdentityType.ENTERPRISE:
        return 'ENHANCED';
      case IdentityType.CONSENTIDA:
        return 'STANDARD';
      case IdentityType.AID:
        return 'ADVANCED_QUANTUM';
      default:
        return 'QUANTUM';
    }
  }

  private getKeySizeForAlgorithm(algorithm: string): number {
    switch (algorithm) {
      case 'STANDARD':
        return 256;
      case 'ENHANCED':
        return 384;
      case 'QUANTUM':
        return 512;
      case 'ADVANCED_QUANTUM':
        return 1024;
      default:
        return 512;
    }
  }

  private getEncryptionLevelFromAlgorithm(algorithm: string): string {
    switch (algorithm) {
      case 'RSA':
        return 'ENHANCED';
      case 'ECDSA':
        return 'STANDARD';
      case 'QUANTUM':
        return 'QUANTUM';
      default:
        return 'QUANTUM';
    }
  }

  private calculateExpirationDate(identityType: IdentityType): string {
    const now = new Date();
    let expirationMonths: number;

    switch (identityType) {
      case IdentityType.ROOT:
        expirationMonths = 24; // 2 years
        break;
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        expirationMonths = 12; // 1 year
        break;
      case IdentityType.CONSENTIDA:
        expirationMonths = 6; // 6 months
        break;
      case IdentityType.AID:
        expirationMonths = 3; // 3 months for maximum security
        break;
      default:
        expirationMonths = 12;
    }

    now.setMonth(now.getMonth() + expirationMonths);
    return now.toISOString();
  }

  private formatKeyForAlgorithm(baseKey: string, algorithm: string): string {
    switch (algorithm) {
      case 'STANDARD':
        return baseKey.padEnd(32, '0').slice(0, 32); // 256 bits
      case 'ENHANCED':
        return baseKey.padEnd(48, '0').slice(0, 48); // 384 bits
      case 'QUANTUM':
        return baseKey.padEnd(64, '0').slice(0, 64); // 512 bits
      case 'ADVANCED_QUANTUM':
        return baseKey.padEnd(128, '0').slice(0, 128); // 1024 bits
      default:
        return baseKey.padEnd(64, '0').slice(0, 64);
    }
  }

  private async derivePublicKeyFromPrivate(privateKey: string, algorithm: string): Promise<string> {
    // Simplified public key derivation for demo
    // In production, this would use proper cryptographic functions
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey + '_public');
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const publicKey = 'pub_' + Math.abs(hash).toString(16).padStart(16, '0');
    return this.formatKeyForAlgorithm(publicKey, algorithm);
  }

  private async loadKeysFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('identity_qlock_keys');
      if (stored) {
        const keysData = JSON.parse(stored);
        this.identityKeys = new Map(Object.entries(keysData));
        console.log(`[IdentityQlockService] Loaded ${this.identityKeys.size} key pairs from storage`);
      }
    } catch (error) {
      console.error('[IdentityQlockService] Error loading keys from storage:', error);
    }
  }

  private async saveKeysToStorage(): Promise<void> {
    try {
      const keysData = Object.fromEntries(this.identityKeys);
      localStorage.setItem('identity_qlock_keys', JSON.stringify(keysData));
    } catch (error) {
      console.error('[IdentityQlockService] Error saving keys to storage:', error);
      throw error; // Re-throw the error so it can be caught by the calling method
    }
  }
}

// Singleton instance
export const identityQlockService = new IdentityQlockService();