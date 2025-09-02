import { randomBytes } from '@noble/hashes/utils';
import { sign, verify, getPublicKey } from '@noble/ed25519';
import { base64 } from 'multiformats/bases/base64';
import Qlock, { Qlock as QlockStatic } from '@/modules/qlock/Qlock';
import { Web3Storage } from 'web3.storage';
import { getActiveIdentity } from '@/state/identity';

/**
 * Represents a user profile in the AnarQ & Q ecosystem
 */
export interface UserProfile {
  did: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  reputation?: number;  // Future DAO reputation score
  context?: string;     // sQuid context or scope
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Represents a signed user profile with its signature
 */
export interface SignedUserProfile extends UserProfile {
  signature: string;
}

/**
 * Result of a profile verification operation
 */
export interface VerificationResult {
  isValid: boolean;
  error?: string;
  profile?: UserProfile;
}

/**
 * Manages user profiles with encryption and IPFS storage
 */
export class ProfileManager {
  private storage: Web3Storage | null = null;
  private privateKey: Uint8Array | null = null;
  private publicKey: Uint8Array | null = null;
  private activeSquidId: string | null = null;
  private encryptionKey: CryptoKey | null = null;

  /**
   * Creates a new ProfileManager instance
   * @param web3StorageToken - Optional Web3.Storage API token
   * @param privateKey - Optional Ed25519 private key (32 bytes)
   */
  constructor(web3StorageToken?: string, privateKey?: Uint8Array) {
    if (web3StorageToken) {
      this.storage = new Web3Storage({ token: web3StorageToken });
    }
    
    if (privateKey) {
      this.setPrivateKey(privateKey);
    }
  }

  /**
   * Sets the private key for signing profiles, optionally using the active sQuid identity
   * @param privateKey - Ed25519 private key (32 bytes) or null to use active sQuid identity
   */
  public async setPrivateKey(privateKey: Uint8Array | null = null): Promise<void> {
    if (privateKey) {
      if (privateKey.length !== 32) {
        throw new Error('Private key must be 32 bytes long');
      }
      this.privateKey = privateKey;
      this.publicKey = await this.derivePublicKey(privateKey);
      this.activeSquidId = null;
      // Generate an encryption key for this private key
      this.encryptionKey = await QlockStatic.generateKey();
    } else {
      // Try to use active sQuid identity
      const activeId = getActiveIdentity();
      if (!activeId) {
        throw new Error('No private key provided and no active sQuid identity found');
      }
      // Use the active identity's DID
      this.activeSquidId = activeId.did;
      // We'll use the active identity's Qlock encryption
      if (!activeId.qlock) {
        throw new Error('Active identity has no Qlock encryption available');
      }
      // Generate an encryption key for this session
      this.encryptionKey = await QlockStatic.generateKey();
    }
  }

  /**
   * Derives the public key from a private key
   */
  private async derivePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
    return getPublicKey(privateKey);
  }

  /**
   * Creates a new user profile with the current identity
   * @param profileData - Profile data to include
   * @returns A signed user profile
   */
  public async createProfile(
    profileData: Omit<UserProfile, 'did' | 'createdAt' | 'signature'>
  ): Promise<SignedUserProfile> {
    if (!this.privateKey || !this.publicKey) {
      throw new Error('Private key not set. Call setPrivateKey() first.');
    }

    // Get or generate DID
    const did = this.activeSquidId || 
      `did:key:${base64.baseEncode(this.publicKey)}`;
    
    // Add sQuid context if available
    const profileContext = this.activeSquidId 
      ? { ...profileData, context: 'squid' }
      : profileData;
    
    // Create the base profile with required fields
    const now = new Date().toISOString();
    const profile: UserProfile = {
      name: String(profileContext.name || 'Anonymous'),
      ...profileContext,
      did,
      createdAt: now,
      updatedAt: now
    };
    
    // Sign the profile
    const signature = await this.signProfile(profile);
    
    return {
      ...profile,
      signature
    } as SignedUserProfile;
  }

  /**
   * Signs the profile data
   */
  private async signProfile(profile: UserProfile): Promise<string> {
    // Create a deterministic string representation of the profile
    const message = this.serializeProfile(profile);
    const messageBytes = new TextEncoder().encode(message);
    
    // If we have an active sQuid identity with Qlock, use it for signing
    if (this.activeSquidId) {
      const activeId = getActiveIdentity();
      if (!activeId?.qlock) {
        throw new Error('No Qlock encryption available for active identity');
      }
      
      try {
        // Encrypt the message as a signature
        const encrypted = await activeId.qlock.encrypt(new Uint8Array(messageBytes).buffer);
        return base64.baseEncode(new Uint8Array(encrypted));
      } catch (error) {
        console.error('Error signing with Qlock:', error);
        throw new Error('Failed to sign with Qlock');
      }
    }
    
    // Fall back to direct Ed25519 signing if no active identity
    if (!this.privateKey) {
      throw new Error('No private key or active identity available for signing');
    }

    // Sign the message with Ed25519
    const signature = await sign(messageBytes, this.privateKey);
    return base64.baseEncode(signature);
  }

  /**
   * Encrypts and uploads a profile to IPFS
   * @param profile - Profile to encrypt and upload
   * @param encryptionKey - Optional encryption key (generated if not provided)
   * @returns Object containing the CID and the encryption key used
   */
  public async encryptAndUploadProfile(
    profile: SignedUserProfile,
    encryptionKey?: CryptoKey
  ): Promise<{ cid: string; encryptionKey: CryptoKey }> {
    if (!this.storage) {
      throw new Error('Web3.Storage not initialized');
    }

    // Verify the profile signature before encryption
    const verification = await this.verifyProfileSignature(profile);
    if (!verification.isValid) {
      throw new Error(`Invalid profile signature: ${verification.error}`);
    }

    // Convert profile to Uint8Array
    const profileBytes = new TextEncoder().encode(JSON.stringify(profile));
    
    // Use provided key or the instance key
    const key = encryptionKey || this.encryptionKey;
    if (!key) {
      throw new Error('No encryption key available');
    }
    
    // Encrypt the profile using Qlock
    const encryptedData = await QlockStatic.encrypt(profileBytes, key);
    
    // Create a file with metadata
    const file = new File(
      [encryptedData],
      `profile_${profile.did.replace(/[:/]/g, '_')}_${Date.now()}.enc`,
      { type: 'application/octet-stream' }
    );

    // Upload to IPFS using Web3.Storage
    const cid = await this.storage.put([file]);

    return { cid, encryptionKey: key };
  }

  /**
   * Downloads and decrypts a profile from IPFS
   * @param cid - Content identifier of the encrypted profile
   * @param encryptionKey - Key to decrypt the profile
   * @returns The decrypted and verified user profile
   */
  public async downloadAndDecryptProfile(
    cid: string,
    encryptionKey: CryptoKey
  ): Promise<SignedUserProfile> {
    if (!this.storage) {
      throw new Error('Web3.Storage not initialized');
    }

    // Download from IPFS using Web3.Storage
    const res = await this.storage.get(cid);
    if (!res) {
      throw new Error('Failed to fetch from IPFS');
    }

    const files = await res.files();
    if (files.length === 0) {
      throw new Error('No files found in IPFS response');
    }

    const file = files[0];
    const encryptedData = new Uint8Array(await file.arrayBuffer());
    
    // Use provided key or the instance key
    const key = encryptionKey || this.encryptionKey;
    if (!key) {
      throw new Error('No decryption key available');
    }
    
    // Decrypt the data using Qlock
    const decryptedData = await QlockStatic.decrypt(encryptedData, key);
    const profile = JSON.parse(new TextDecoder().decode(decryptedData)) as SignedUserProfile;
    
    // Verify the signature
    const verification = await this.verifyProfileSignature(profile);
    if (!verification.isValid) {
      throw new Error(`Invalid profile signature: ${verification.error}`);
    }

    return profile;
  }

  /**
   * Verifies the signature of a profile using the public key from the DID
   * @param profile - The signed profile to verify
   * @returns Verification result with profile data if valid
   */
  public async verifyProfileSignature(profile: SignedUserProfile): Promise<VerificationResult> {
    try {
      // Extract the public key from the DID
      if (!profile.did || !profile.did.startsWith('did:key:')) {
        return { isValid: false, error: 'Invalid or missing DID' };
      }

      const publicKeyBase64 = profile.did.replace('did:key:', '');
      let publicKey: Uint8Array;
      try {
        publicKey = base64.baseDecode(publicKeyBase64);
      } catch (error) {
        return { 
          isValid: false, 
          error: 'Failed to decode public key from DID' 
        };
      }

      // Get the message that was signed (exclude signature)
      const { signature: sig, ...profileWithoutSignature } = profile;
      const message = this.serializeProfile(profileWithoutSignature as UserProfile);
      const messageBytes = new TextEncoder().encode(message);
      
      // Decode the signature
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = base64.baseDecode(sig);
      } catch (error) {
        return {
          isValid: false,
          error: 'Invalid base64 signature format'
        };
      }

      const isValid = await verify(signatureBytes, messageBytes, publicKey);
      return { 
        isValid, 
        profile: isValid ? profileWithoutSignature as UserProfile : undefined,
        error: isValid ? undefined : 'Invalid signature'
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Creates a deterministic string representation of a profile for signing
   */
  private serializeProfile(profile: UserProfile): string {
    // Create a copy of the profile without the signature
    const { signature: _, ...profileWithoutSignature } = profile;
    
    // Sort keys alphabetically to ensure consistent ordering
    const sorted: Record<string, unknown> = {};
    Object.keys(profileWithoutSignature)
      .sort()
      .forEach(key => {
        sorted[key] = profileWithoutSignature[key as keyof typeof profileWithoutSignature];
      });
    
    return JSON.stringify(sorted);
  }
}

// Export a default instance for convenience
export default new ProfileManager();
