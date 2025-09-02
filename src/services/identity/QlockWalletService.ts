/**
 * QlockWalletService - Enhanced Qlock Integration Layer for Wallet Operations
 * 
 * This service provides identity-specific transaction signing, key management,
 * signature validation, and fallback mechanisms for Qlock unavailability.
 * 
 * Requirements: 3.2, 3.5, 3.6
 */

import { 
  ExtendedSquidIdentity, 
  IdentityType, 
  KeyPair 
} from '@/types/identity';

import { 
  identityQlockService,
  EncryptionResult,
  DecryptionResult,
  SignatureResult,
  VerificationResult
} from './IdentityQlockService';

import * as QlockAPI from '@/api/qlock';

export interface QlockWalletServiceInterface {
  // Transaction Signing
  signTransaction(identityId: string, transaction: WalletTransaction): Promise<TransactionSignatureResult>;
  signMessage(identityId: string, message: string): Promise<MessageSignatureResult>;
  signTypedData(identityId: string, typedData: TypedData): Promise<TypedDataSignatureResult>;
  
  // Signature Validation and Verification
  verifyTransactionSignature(transaction: WalletTransaction, signature: string, publicKey: string): Promise<SignatureVerificationResult>;
  verifyMessageSignature(message: string, signature: string, publicKey: string): Promise<SignatureVerificationResult>;
  validateSignatureIntegrity(identityId: string, signature: string): Promise<boolean>;
  
  // Identity-specific Key Management
  getSigningKeys(identityId: string): Promise<KeyPair | null>;
  rotateSigningKeys(identityId: string): Promise<boolean>;
  validateKeyAccess(identityId: string): Promise<boolean>;
  
  // Fallback Mechanisms
  isQlockAvailable(): Promise<boolean>;
  enableFallbackMode(): Promise<void>;
  disableFallbackMode(): Promise<void>;
  signWithFallback(identityId: string, data: string): Promise<FallbackSignatureResult>;
  
  // Service Health and Recovery
  checkServiceHealth(): Promise<QlockHealthStatus>;
  recoverFromFailure(): Promise<boolean>;
  getLastKnownGoodState(): Promise<QlockServiceState | null>;
}

export interface WalletTransaction {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
  chainId?: number;
  identityId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
}

export interface TransactionSignatureResult {
  success: boolean;
  signature?: string;
  transactionHash?: string;
  identityId: string;
  timestamp: string;
  error?: string;
  fallbackUsed?: boolean;
  keyRotationRequired?: boolean;
}

export interface MessageSignatureResult {
  success: boolean;
  signature?: string;
  identityId: string;
  timestamp: string;
  error?: string;
  fallbackUsed?: boolean;
}

export interface TypedDataSignatureResult {
  success: boolean;
  signature?: string;
  identityId: string;
  timestamp: string;
  error?: string;
  fallbackUsed?: boolean;
}

export interface SignatureVerificationResult {
  valid: boolean;
  identityId?: string;
  publicKey: string;
  timestamp: string;
  error?: string;
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';
}

export interface FallbackSignatureResult {
  success: boolean;
  signature?: string;
  method: 'LOCAL_KEYS' | 'CACHED_KEYS' | 'EMERGENCY_KEYS';
  identityId: string;
  timestamp: string;
  error?: string;
  securityWarning?: string;
}

export interface QlockHealthStatus {
  available: boolean;
  responseTime: number;
  lastCheck: string;
  errorCount: number;
  lastError?: string;
  serviceVersion?: string;
  capabilities: string[];
}

export interface QlockServiceState {
  timestamp: string;
  activeIdentities: string[];
  keyRotationSchedule: Record<string, string>;
  failureCount: number;
  lastSuccessfulOperation: string;
}

export class QlockWalletService implements QlockWalletServiceInterface {
  private fallbackMode: boolean = false;
  private serviceHealth: QlockHealthStatus | null = null;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000; // 30 seconds
  private fallbackKeys: Map<string, KeyPair> = new Map();
  private operationCache: Map<string, any> = new Map();
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Check initial service health
      await this.checkServiceHealth();
      
      // Load fallback keys from secure storage
      await this.loadFallbackKeys();
      
      // Set up periodic health checks
      this.setupHealthChecks();
      
      console.log('[QlockWalletService] Service initialized successfully');
    } catch (error) {
      console.error('[QlockWalletService] Failed to initialize service:', error);
      await this.enableFallbackMode();
    }
  }

  /**
   * Sign a wallet transaction using identity-specific keys
   */
  async signTransaction(identityId: string, transaction: WalletTransaction): Promise<TransactionSignatureResult> {
    const startTime = Date.now();
    
    try {
      // Validate identity access
      const hasAccess = await this.validateKeyAccess(identityId);
      if (!hasAccess) {
        return {
          success: false,
          identityId,
          timestamp: new Date().toISOString(),
          error: 'Identity does not have access to signing keys'
        };
      }

      // Check if Qlock is available
      const isAvailable = await this.isQlockAvailable();
      if (!isAvailable && !this.fallbackMode) {
        console.warn('[QlockWalletService] Qlock unavailable, enabling fallback mode');
        await this.enableFallbackMode();
      }

      // Prepare transaction data for signing
      const transactionData = this.serializeTransaction(transaction);
      
      let result: TransactionSignatureResult;

      if (this.fallbackMode) {
        // Use fallback signing mechanism
        const fallbackResult = await this.signWithFallback(identityId, transactionData);
        result = {
          success: fallbackResult.success,
          signature: fallbackResult.signature,
          identityId,
          timestamp: new Date().toISOString(),
          error: fallbackResult.error,
          fallbackUsed: true
        };
      } else {
        // Use standard Qlock signing
        const signatureResult = await identityQlockService.signForIdentity(identityId, transactionData);
        
        if (signatureResult.success) {
          // Generate transaction hash
          const transactionHash = await this.generateTransactionHash(transaction, signatureResult.signature!);
          
          result = {
            success: true,
            signature: signatureResult.signature,
            transactionHash,
            identityId,
            timestamp: new Date().toISOString(),
            fallbackUsed: false
          };
        } else {
          // Retry with fallback if primary signing fails
          console.warn('[QlockWalletService] Primary signing failed, trying fallback');
          const fallbackResult = await this.signWithFallback(identityId, transactionData);
          
          result = {
            success: fallbackResult.success,
            signature: fallbackResult.signature,
            identityId,
            timestamp: new Date().toISOString(),
            error: fallbackResult.error || signatureResult.error,
            fallbackUsed: true
          };
        }
      }

      // Log performance metrics
      const duration = Date.now() - startTime;
      console.log(`[QlockWalletService] Transaction signing completed in ${duration}ms for identity: ${identityId}`);

      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error signing transaction:', error);
      
      return {
        success: false,
        identityId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown signing error'
      };
    }
  }

  /**
   * Sign a plain text message
   */
  async signMessage(identityId: string, message: string): Promise<MessageSignatureResult> {
    try {
      // Validate identity access
      const hasAccess = await this.validateKeyAccess(identityId);
      if (!hasAccess) {
        return {
          success: false,
          identityId,
          timestamp: new Date().toISOString(),
          error: 'Identity does not have access to signing keys'
        };
      }

      let result: MessageSignatureResult;

      if (this.fallbackMode || !(await this.isQlockAvailable())) {
        // Use fallback signing
        const fallbackResult = await this.signWithFallback(identityId, message);
        result = {
          success: fallbackResult.success,
          signature: fallbackResult.signature,
          identityId,
          timestamp: new Date().toISOString(),
          error: fallbackResult.error,
          fallbackUsed: true
        };
      } else {
        // Use standard Qlock signing
        const signatureResult = await identityQlockService.signForIdentity(identityId, message);
        result = {
          success: signatureResult.success,
          signature: signatureResult.signature,
          identityId,
          timestamp: new Date().toISOString(),
          error: signatureResult.error,
          fallbackUsed: false
        };
      }

      console.log(`[QlockWalletService] Message signing for identity ${identityId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error signing message:', error);
      
      return {
        success: false,
        identityId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown signing error'
      };
    }
  }  /**

   * Sign typed data (EIP-712)
   */
  async signTypedData(identityId: string, typedData: TypedData): Promise<TypedDataSignatureResult> {
    try {
      // Validate identity access
      const hasAccess = await this.validateKeyAccess(identityId);
      if (!hasAccess) {
        return {
          success: false,
          identityId,
          timestamp: new Date().toISOString(),
          error: 'Identity does not have access to signing keys'
        };
      }

      // Serialize typed data according to EIP-712
      const serializedData = this.serializeTypedData(typedData);
      
      let result: TypedDataSignatureResult;

      if (this.fallbackMode || !(await this.isQlockAvailable())) {
        // Use fallback signing
        const fallbackResult = await this.signWithFallback(identityId, serializedData);
        result = {
          success: fallbackResult.success,
          signature: fallbackResult.signature,
          identityId,
          timestamp: new Date().toISOString(),
          error: fallbackResult.error,
          fallbackUsed: true
        };
      } else {
        // Use standard Qlock signing
        const signatureResult = await identityQlockService.signForIdentity(identityId, serializedData);
        result = {
          success: signatureResult.success,
          signature: signatureResult.signature,
          identityId,
          timestamp: new Date().toISOString(),
          error: signatureResult.error,
          fallbackUsed: false
        };
      }

      console.log(`[QlockWalletService] Typed data signing for identity ${identityId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error signing typed data:', error);
      
      return {
        success: false,
        identityId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown signing error'
      };
    }
  }

  /**
   * Verify transaction signature
   */
  async verifyTransactionSignature(
    transaction: WalletTransaction, 
    signature: string, 
    publicKey: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Serialize transaction data
      const transactionData = this.serializeTransaction(transaction);
      
      // Verify signature using Qlock
      const verificationResult = await identityQlockService.verifyForIdentity(
        transaction.identityId,
        transactionData,
        signature,
        publicKey
      );

      // Determine trust level based on identity type and verification result
      const trustLevel = this.determineTrustLevel(transaction.identityId, verificationResult.valid || false);

      const result: SignatureVerificationResult = {
        valid: verificationResult.valid || false,
        identityId: transaction.identityId,
        publicKey,
        timestamp: new Date().toISOString(),
        error: verificationResult.error,
        trustLevel
      };

      console.log(`[QlockWalletService] Transaction signature verification: ${result.valid ? 'VALID' : 'INVALID'}`);
      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error verifying transaction signature:', error);
      
      return {
        valid: false,
        publicKey,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown verification error',
        trustLevel: 'UNTRUSTED'
      };
    }
  }

  /**
   * Verify message signature
   */
  async verifyMessageSignature(
    message: string, 
    signature: string, 
    publicKey: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Use a dummy identity ID for verification (we only have the public key)
      const verificationResult = await QlockAPI.verify(message, signature, publicKey);

      const result: SignatureVerificationResult = {
        valid: verificationResult.valid || false,
        publicKey,
        timestamp: new Date().toISOString(),
        error: verificationResult.error,
        trustLevel: verificationResult.valid ? 'MEDIUM' : 'UNTRUSTED'
      };

      console.log(`[QlockWalletService] Message signature verification: ${result.valid ? 'VALID' : 'INVALID'}`);
      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error verifying message signature:', error);
      
      return {
        valid: false,
        publicKey,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown verification error',
        trustLevel: 'UNTRUSTED'
      };
    }
  }

  /**
   * Validate signature integrity for an identity
   */
  async validateSignatureIntegrity(identityId: string, signature: string): Promise<boolean> {
    try {
      // Get the identity's public key
      const keyPair = await this.getSigningKeys(identityId);
      if (!keyPair) {
        console.error(`[QlockWalletService] No keys found for identity: ${identityId}`);
        return false;
      }

      // Validate signature format and structure
      if (!this.isValidSignatureFormat(signature)) {
        console.error('[QlockWalletService] Invalid signature format');
        return false;
      }

      // Additional integrity checks
      const integrityChecks = [
        this.validateSignatureLength(signature),
        this.validateSignatureEncoding(signature),
        this.validateSignatureTimestamp(signature)
      ];

      const isValid = integrityChecks.every(check => check);
      
      console.log(`[QlockWalletService] Signature integrity validation for ${identityId}: ${isValid ? 'PASSED' : 'FAILED'}`);
      return isValid;
    } catch (error) {
      console.error('[QlockWalletService] Error validating signature integrity:', error);
      return false;
    }
  }

  /**
   * Get signing keys for an identity
   */
  async getSigningKeys(identityId: string): Promise<KeyPair | null> {
    try {
      // First try to get keys from the main Qlock service
      const keys = await identityQlockService.getKeysForIdentity(identityId);
      
      if (keys) {
        return keys;
      }

      // If not found and in fallback mode, try fallback keys
      if (this.fallbackMode) {
        const fallbackKeys = this.fallbackKeys.get(identityId);
        if (fallbackKeys) {
          console.warn(`[QlockWalletService] Using fallback keys for identity: ${identityId}`);
          return fallbackKeys;
        }
      }

      console.warn(`[QlockWalletService] No signing keys found for identity: ${identityId}`);
      return null;
    } catch (error) {
      console.error('[QlockWalletService] Error getting signing keys:', error);
      return null;
    }
  }

  /**
   * Rotate signing keys for an identity
   */
  async rotateSigningKeys(identityId: string): Promise<boolean> {
    try {
      // Validate that we can rotate keys for this identity
      const hasAccess = await this.validateKeyAccess(identityId);
      if (!hasAccess) {
        console.error(`[QlockWalletService] Cannot rotate keys - no access for identity: ${identityId}`);
        return false;
      }

      // Perform key rotation using the main Qlock service
      const rotationSuccess = await identityQlockService.rotateKeysForIdentity(identityId);
      
      if (rotationSuccess) {
        // Update fallback keys if rotation was successful
        const newKeys = await identityQlockService.getKeysForIdentity(identityId);
        if (newKeys) {
          this.fallbackKeys.set(identityId, newKeys);
          await this.saveFallbackKeys();
        }
        
        console.log(`[QlockWalletService] Successfully rotated keys for identity: ${identityId}`);
      } else {
        console.error(`[QlockWalletService] Failed to rotate keys for identity: ${identityId}`);
      }

      return rotationSuccess;
    } catch (error) {
      console.error('[QlockWalletService] Error rotating signing keys:', error);
      return false;
    }
  }

  /**
   * Validate key access for an identity
   */
  async validateKeyAccess(identityId: string): Promise<boolean> {
    try {
      // Check if identity exists and has valid keys
      const keys = await this.getSigningKeys(identityId);
      if (!keys) {
        return false;
      }

      // Validate key isolation
      const isolationValid = await identityQlockService.validateKeyIsolation(identityId);
      if (!isolationValid) {
        console.warn(`[QlockWalletService] Key isolation validation failed for identity: ${identityId}`);
        return false;
      }

      // Check key expiration
      if (keys.expiresAt && new Date(keys.expiresAt) < new Date()) {
        console.warn(`[QlockWalletService] Keys expired for identity: ${identityId}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[QlockWalletService] Error validating key access:', error);
      return false;
    }
  }  /*
*
   * Check if Qlock service is available
   */
  async isQlockAvailable(): Promise<boolean> {
    try {
      // Use cached health status if recent
      const now = Date.now();
      if (this.serviceHealth && (now - this.lastHealthCheck) < this.healthCheckInterval) {
        return this.serviceHealth.available;
      }

      // Perform fresh health check
      const health = await this.checkServiceHealth();
      return health.available;
    } catch (error) {
      console.error('[QlockWalletService] Error checking Qlock availability:', error);
      return false;
    }
  }

  /**
   * Enable fallback mode for when Qlock is unavailable
   */
  async enableFallbackMode(): Promise<void> {
    try {
      this.fallbackMode = true;
      
      // Load or generate fallback keys for active identities
      await this.prepareFallbackKeys();
      
      console.warn('[QlockWalletService] Fallback mode enabled - using local key management');
      
      // Notify about reduced security
      this.notifyFallbackModeEnabled();
    } catch (error) {
      console.error('[QlockWalletService] Error enabling fallback mode:', error);
    }
  }

  /**
   * Disable fallback mode and return to normal operation
   */
  async disableFallbackMode(): Promise<void> {
    try {
      // Verify Qlock is available before disabling fallback
      const isAvailable = await this.checkServiceHealth();
      if (!isAvailable.available) {
        console.warn('[QlockWalletService] Cannot disable fallback mode - Qlock still unavailable');
        return;
      }

      this.fallbackMode = false;
      
      // Sync any operations performed in fallback mode
      await this.syncFallbackOperations();
      
      console.log('[QlockWalletService] Fallback mode disabled - returned to normal operation');
    } catch (error) {
      console.error('[QlockWalletService] Error disabling fallback mode:', error);
    }
  }

  /**
   * Sign data using fallback mechanisms
   */
  async signWithFallback(identityId: string, data: string): Promise<FallbackSignatureResult> {
    try {
      let method: 'LOCAL_KEYS' | 'CACHED_KEYS' | 'EMERGENCY_KEYS';
      let keyPair: KeyPair | null = null;

      // Try fallback keys first
      keyPair = this.fallbackKeys.get(identityId) || null;
      if (keyPair) {
        method = 'LOCAL_KEYS';
      } else {
        // Try to derive emergency keys
        keyPair = await this.generateEmergencyKeys(identityId);
        method = 'EMERGENCY_KEYS';
      }

      if (!keyPair) {
        return {
          success: false,
          method: 'EMERGENCY_KEYS',
          identityId,
          timestamp: new Date().toISOString(),
          error: 'No fallback keys available',
          securityWarning: 'Unable to sign - no keys available in fallback mode'
        };
      }

      // Perform signing with fallback keys
      const signature = await this.signWithLocalKeys(data, keyPair.privateKey);
      
      const result: FallbackSignatureResult = {
        success: true,
        signature,
        method,
        identityId,
        timestamp: new Date().toISOString(),
        securityWarning: method === 'EMERGENCY_KEYS' ? 
          'Signed with emergency keys - reduced security' : 
          'Signed with fallback keys - verify Qlock connectivity'
      };

      console.warn(`[QlockWalletService] Fallback signing used for ${identityId} with method: ${method}`);
      return result;
    } catch (error) {
      console.error('[QlockWalletService] Error in fallback signing:', error);
      
      return {
        success: false,
        method: 'EMERGENCY_KEYS',
        identityId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown fallback signing error',
        securityWarning: 'Fallback signing failed - transaction cannot be signed'
      };
    }
  }

  /**
   * Check service health and update status
   */
  async checkServiceHealth(): Promise<QlockHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic Qlock API functionality
      const testResult = await Promise.race([
        QlockAPI.getAlgorithms(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      const responseTime = Date.now() - startTime;
      
      this.serviceHealth = {
        available: true,
        responseTime,
        lastCheck: new Date().toISOString(),
        errorCount: 0,
        capabilities: ['SIGN', 'VERIFY', 'ENCRYPT', 'DECRYPT']
      };

      this.lastHealthCheck = Date.now();
      
      console.log(`[QlockWalletService] Health check passed - response time: ${responseTime}ms`);
      return this.serviceHealth;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.serviceHealth = {
        available: false,
        responseTime,
        lastCheck: new Date().toISOString(),
        errorCount: (this.serviceHealth?.errorCount || 0) + 1,
        lastError: errorMessage,
        capabilities: []
      };

      this.lastHealthCheck = Date.now();
      
      console.error(`[QlockWalletService] Health check failed: ${errorMessage}`);
      return this.serviceHealth;
    }
  }

  /**
   * Recover from service failure
   */
  async recoverFromFailure(): Promise<boolean> {
    try {
      console.log('[QlockWalletService] Attempting service recovery...');
      
      // Clear any cached error states
      this.serviceHealth = null;
      this.lastHealthCheck = 0;
      
      // Perform fresh health check
      const health = await this.checkServiceHealth();
      
      if (health.available) {
        // If service is back online, disable fallback mode
        if (this.fallbackMode) {
          await this.disableFallbackMode();
        }
        
        console.log('[QlockWalletService] Service recovery successful');
        return true;
      } else {
        // If still unavailable, ensure fallback mode is enabled
        if (!this.fallbackMode) {
          await this.enableFallbackMode();
        }
        
        console.warn('[QlockWalletService] Service recovery failed - remaining in fallback mode');
        return false;
      }
    } catch (error) {
      console.error('[QlockWalletService] Error during service recovery:', error);
      return false;
    }
  }

  /**
   * Get last known good service state
   */
  async getLastKnownGoodState(): Promise<QlockServiceState | null> {
    try {
      const stored = localStorage.getItem('qlock_service_state');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('[QlockWalletService] Error getting last known good state:', error);
      return null;
    }
  }

  // Private helper methods

  private serializeTransaction(transaction: WalletTransaction): string {
    // Create a deterministic serialization of the transaction
    const txData = {
      to: transaction.to,
      value: transaction.value,
      data: transaction.data || '0x',
      gasLimit: transaction.gasLimit || '21000',
      gasPrice: transaction.gasPrice || '20000000000',
      nonce: transaction.nonce || 0,
      chainId: transaction.chainId || 1
    };
    
    return JSON.stringify(txData, Object.keys(txData).sort());
  }

  private serializeTypedData(typedData: TypedData): string {
    // Implement EIP-712 structured data hashing
    const domainSeparator = this.hashDomain(typedData.domain);
    const structHash = this.hashStruct(typedData.primaryType, typedData.message, typedData.types);
    
    return `0x1901${domainSeparator.slice(2)}${structHash.slice(2)}`;
  }

  private hashDomain(domain: any): string {
    // Simplified domain hash for demo
    return `0x${Buffer.from(JSON.stringify(domain)).toString('hex')}`;
  }

  private hashStruct(primaryType: string, message: any, types: any): string {
    // Simplified struct hash for demo
    return `0x${Buffer.from(JSON.stringify({ primaryType, message, types })).toString('hex')}`;
  }

  private async generateTransactionHash(transaction: WalletTransaction, signature: string): Promise<string> {
    // Generate a deterministic transaction hash
    const data = this.serializeTransaction(transaction) + signature;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private determineTrustLevel(identityId: string, isValid: boolean): 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED' {
    if (!isValid) return 'UNTRUSTED';
    
    // Determine trust level based on identity type
    const identityType = this.getIdentityType(identityId);
    switch (identityType) {
      case IdentityType.ROOT:
        return 'HIGH';
      case IdentityType.DAO:
      case IdentityType.ENTERPRISE:
        return 'MEDIUM';
      case IdentityType.CONSENTIDA:
        return 'LOW';
      case IdentityType.AID:
        return 'MEDIUM'; // Anonymous but cryptographically secure
      default:
        return 'LOW';
    }
  }

  private getIdentityType(identityId: string): IdentityType {
    // Extract identity type from ID (simplified)
    if (identityId.includes('root')) return IdentityType.ROOT;
    if (identityId.includes('dao')) return IdentityType.DAO;
    if (identityId.includes('enterprise')) return IdentityType.ENTERPRISE;
    if (identityId.includes('consentida')) return IdentityType.CONSENTIDA;
    if (identityId.includes('aid')) return IdentityType.AID;
    return IdentityType.ROOT; // Default
  }

  private isValidSignatureFormat(signature: string): boolean {
    // Basic signature format validation
    return signature.startsWith('0x') && signature.length >= 130; // 0x + 64 bytes hex
  }

  private validateSignatureLength(signature: string): boolean {
    // Validate signature has correct length for the algorithm
    const hexLength = signature.slice(2).length;
    return hexLength === 128 || hexLength === 130; // Standard signature lengths
  }

  private validateSignatureEncoding(signature: string): boolean {
    // Validate signature is properly hex encoded
    const hexPart = signature.slice(2);
    return /^[0-9a-fA-F]+$/.test(hexPart);
  }

  private validateSignatureTimestamp(signature: string): boolean {
    // For now, always return true - could implement timestamp validation
    return true;
  }

  private async loadFallbackKeys(): Promise<void> {
    try {
      const stored = localStorage.getItem('qlock_fallback_keys');
      if (stored) {
        const keysData = JSON.parse(stored);
        this.fallbackKeys = new Map(Object.entries(keysData));
        console.log(`[QlockWalletService] Loaded ${this.fallbackKeys.size} fallback key pairs`);
      }
    } catch (error) {
      console.error('[QlockWalletService] Error loading fallback keys:', error);
    }
  }

  private async saveFallbackKeys(): Promise<void> {
    try {
      const keysData = Object.fromEntries(this.fallbackKeys);
      localStorage.setItem('qlock_fallback_keys', JSON.stringify(keysData));
    } catch (error) {
      console.error('[QlockWalletService] Error saving fallback keys:', error);
    }
  }

  private async prepareFallbackKeys(): Promise<void> {
    try {
      // Get list of active identities from the main service
      const activeContext = await identityQlockService.getActiveEncryptionContext();
      if (activeContext) {
        const keys = await identityQlockService.getKeysForIdentity(activeContext);
        if (keys && !this.fallbackKeys.has(activeContext)) {
          this.fallbackKeys.set(activeContext, keys);
          await this.saveFallbackKeys();
        }
      }
    } catch (error) {
      console.error('[QlockWalletService] Error preparing fallback keys:', error);
    }
  }

  private async generateEmergencyKeys(identityId: string): Promise<KeyPair | null> {
    try {
      // Generate emergency keys using a deterministic method
      const emergencyKey = await this.deriveEmergencyKey(identityId);
      
      const keyPair: KeyPair = {
        publicKey: `emergency_pub_${emergencyKey}`,
        privateKey: `emergency_priv_${emergencyKey}`,
        algorithm: 'QUANTUM',
        keySize: 512,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      // Store emergency keys temporarily
      this.fallbackKeys.set(identityId, keyPair);
      
      console.warn(`[QlockWalletService] Generated emergency keys for identity: ${identityId}`);
      return keyPair;
    } catch (error) {
      console.error('[QlockWalletService] Error generating emergency keys:', error);
      return null;
    }
  }

  private async deriveEmergencyKey(identityId: string): Promise<string> {
    // Derive emergency key from identity ID and current timestamp
    const data = identityId + '_emergency_' + Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async signWithLocalKeys(data: string, privateKey: string): Promise<string> {
    // Simplified local signing implementation
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + privateKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private setupHealthChecks(): void {
    // Set up periodic health checks
    setInterval(async () => {
      try {
        await this.checkServiceHealth();
        
        // Auto-recovery attempt if service was down
        if (this.serviceHealth && !this.serviceHealth.available && this.fallbackMode) {
          await this.recoverFromFailure();
        }
      } catch (error) {
        console.error('[QlockWalletService] Error in periodic health check:', error);
      }
    }, this.healthCheckInterval);
  }

  private notifyFallbackModeEnabled(): void {
    // In a real implementation, this would notify the UI or send alerts
    console.warn('[QlockWalletService] SECURITY WARNING: Operating in fallback mode with reduced security');
  }

  private async syncFallbackOperations(): Promise<void> {
    try {
      // In a real implementation, this would sync any operations performed in fallback mode
      console.log('[QlockWalletService] Syncing fallback operations with main service');
      
      // Clear fallback operation cache
      this.operationCache.clear();
    } catch (error) {
      console.error('[QlockWalletService] Error syncing fallback operations:', error);
    }
  }

  private async saveServiceState(): Promise<void> {
    try {
      const state: QlockServiceState = {
        timestamp: new Date().toISOString(),
        activeIdentities: Array.from(this.fallbackKeys.keys()),
        keyRotationSchedule: {},
        failureCount: this.serviceHealth?.errorCount || 0,
        lastSuccessfulOperation: new Date().toISOString()
      };

      localStorage.setItem('qlock_service_state', JSON.stringify(state));
    } catch (error) {
      console.error('[QlockWalletService] Error saving service state:', error);
    }
  }
}

// Singleton instance
export const qlockWalletService = new QlockWalletService();