/**
 * Encryption Service for Qsocial
 * Handles content encryption for private and community-level posts
 */

import { getActiveIdentity } from '../../state/identity';
import type { 
  QsocialPost, 
  QsocialComment, 
  PrivacyLevel,
  Identity 
} from '../../types/qsocial';

/**
 * Encryption key information
 */
export interface EncryptionKey {
  keyId: string;
  algorithm: string;
  keyData: string;
  createdAt: Date;
  expiresAt?: Date;
  purpose: 'content' | 'metadata' | 'storage';
}

/**
 * Encrypted content structure
 */
export interface EncryptedContent {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag?: string;
  metadata: {
    originalSize: number;
    contentType: string;
    encryptedAt: Date;
  };
}

/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
  purpose: 'content' | 'metadata' | 'storage';
  privacyLevel: PrivacyLevel;
  subcommunityId?: string;
  additionalContext?: string;
}

/**
 * Encryption Service for secure content handling
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate a cryptographically secure key
   */
  private static async generateKey(purpose: string): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from user identity and context
   */
  private static async deriveKey(
    identity: Identity,
    options: KeyDerivationOptions
  ): Promise<EncryptionKey> {
    // Create key derivation context
    const context = [
      identity.did,
      options.purpose,
      options.privacyLevel,
      options.subcommunityId || '',
      options.additionalContext || ''
    ].join(':');

    // Use PBKDF2 for key derivation
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(context),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key
    const salt = encoder.encode(`qsocial:${options.purpose}:${identity.did}`);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export key for storage
    const keyData = await crypto.subtle.exportKey('raw', derivedKey);
    const keyId = await this.generateKeyId(context);

    return {
      keyId,
      algorithm: this.ALGORITHM,
      keyData: this.arrayBufferToBase64(keyData),
      createdAt: new Date(),
      purpose: options.purpose
    };
  }

  /**
   * Generate a unique key ID
   */
  private static async generateKeyId(context: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(context + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer).substring(0, 16);
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Encrypt content based on privacy level
   */
  static async encryptContent(
    content: string,
    privacyLevel: PrivacyLevel,
    subcommunityId?: string
  ): Promise<EncryptedContent> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found for encryption');
    }

    // Only encrypt non-public content
    if (privacyLevel === PrivacyLevel.PUBLIC) {
      throw new Error('Public content should not be encrypted');
    }

    // Derive encryption key
    const encryptionKey = await this.deriveKey(identity, {
      purpose: 'content',
      privacyLevel,
      subcommunityId
    });

    // Import the key for use
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(encryptionKey.keyData),
      this.ALGORITHM,
      false,
      ['encrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Encrypt the content
    const encoder = new TextEncoder();
    const contentBuffer = encoder.encode(content);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      cryptoKey,
      contentBuffer
    );

    // Extract auth tag (last 16 bytes for AES-GCM)
    const encryptedData = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedData.slice(0, -this.TAG_LENGTH);
    const authTag = encryptedData.slice(-this.TAG_LENGTH);

    return {
      encryptedData: this.arrayBufferToBase64(ciphertext),
      keyId: encryptionKey.keyId,
      algorithm: this.ALGORITHM,
      iv: this.arrayBufferToBase64(iv),
      authTag: this.arrayBufferToBase64(authTag),
      metadata: {
        originalSize: content.length,
        contentType: 'text/plain',
        encryptedAt: new Date()
      }
    };
  }

  /**
   * Decrypt content
   */
  static async decryptContent(
    encryptedContent: EncryptedContent,
    privacyLevel: PrivacyLevel,
    subcommunityId?: string
  ): Promise<string> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found for decryption');
    }

    // Derive the same encryption key
    const encryptionKey = await this.deriveKey(identity, {
      purpose: 'content',
      privacyLevel,
      subcommunityId
    });

    // Verify key ID matches
    if (encryptionKey.keyId !== encryptedContent.keyId) {
      throw new Error('Key ID mismatch - cannot decrypt content');
    }

    // Import the key for use
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(encryptionKey.keyData),
      this.ALGORITHM,
      false,
      ['decrypt']
    );

    // Reconstruct the encrypted data with auth tag
    const ciphertext = this.base64ToArrayBuffer(encryptedContent.encryptedData);
    const authTag = this.base64ToArrayBuffer(encryptedContent.authTag || '');
    const iv = this.base64ToArrayBuffer(encryptedContent.iv);

    // Combine ciphertext and auth tag
    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    encryptedBuffer.set(new Uint8Array(ciphertext), 0);
    encryptedBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);

    try {
      // Decrypt the content
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv)
        },
        cryptoKey,
        encryptedBuffer
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error('Failed to decrypt content - invalid key or corrupted data');
    }
  }

  /**
   * Encrypt post content if needed
   */
  static async encryptPost(post: Partial<QsocialPost>): Promise<Partial<QsocialPost>> {
    if (!post.privacyLevel || post.privacyLevel === PrivacyLevel.PUBLIC) {
      return post;
    }

    if (!post.content) {
      return post;
    }

    try {
      const encryptedContent = await this.encryptContent(
        post.content,
        post.privacyLevel,
        post.subcommunityId
      );

      return {
        ...post,
        content: JSON.stringify(encryptedContent),
        // Store encryption metadata
        metadata: {
          ...((post as any).metadata || {}),
          encrypted: true,
          encryptionKeyId: encryptedContent.keyId,
          encryptionAlgorithm: encryptedContent.algorithm
        }
      };
    } catch (error) {
      console.error('Failed to encrypt post content:', error);
      throw new Error('Content encryption failed');
    }
  }

  /**
   * Decrypt post content if needed
   */
  static async decryptPost(post: QsocialPost): Promise<QsocialPost> {
    const metadata = (post as any).metadata;
    
    if (!metadata?.encrypted || post.privacyLevel === PrivacyLevel.PUBLIC) {
      return post;
    }

    try {
      const encryptedContent: EncryptedContent = JSON.parse(post.content);
      const decryptedContent = await this.decryptContent(
        encryptedContent,
        post.privacyLevel,
        post.subcommunityId
      );

      return {
        ...post,
        content: decryptedContent
      };
    } catch (error) {
      console.error('Failed to decrypt post content:', error);
      // Return post with placeholder content if decryption fails
      return {
        ...post,
        content: '[Encrypted content - decryption failed]'
      };
    }
  }

  /**
   * Encrypt comment content if needed
   */
  static async encryptComment(comment: Partial<QsocialComment>): Promise<Partial<QsocialComment>> {
    if (!comment.privacyLevel || comment.privacyLevel === PrivacyLevel.PUBLIC) {
      return comment;
    }

    if (!comment.content) {
      return comment;
    }

    try {
      const encryptedContent = await this.encryptContent(
        comment.content,
        comment.privacyLevel
      );

      return {
        ...comment,
        content: JSON.stringify(encryptedContent),
        // Store encryption metadata
        metadata: {
          ...((comment as any).metadata || {}),
          encrypted: true,
          encryptionKeyId: encryptedContent.keyId,
          encryptionAlgorithm: encryptedContent.algorithm
        }
      };
    } catch (error) {
      console.error('Failed to encrypt comment content:', error);
      throw new Error('Content encryption failed');
    }
  }

  /**
   * Decrypt comment content if needed
   */
  static async decryptComment(comment: QsocialComment): Promise<QsocialComment> {
    const metadata = (comment as any).metadata;
    
    if (!metadata?.encrypted || comment.privacyLevel === PrivacyLevel.PUBLIC) {
      return comment;
    }

    try {
      const encryptedContent: EncryptedContent = JSON.parse(comment.content);
      const decryptedContent = await this.decryptContent(
        encryptedContent,
        comment.privacyLevel
      );

      return {
        ...comment,
        content: decryptedContent
      };
    } catch (error) {
      console.error('Failed to decrypt comment content:', error);
      // Return comment with placeholder content if decryption fails
      return {
        ...comment,
        content: '[Encrypted content - decryption failed]'
      };
    }
  }

  /**
   * Generate secure storage key for IPFS/Storj
   */
  static async generateStorageKey(
    contentId: string,
    privacyLevel: PrivacyLevel
  ): Promise<EncryptionKey> {
    const identity = getActiveIdentity();
    if (!identity) {
      throw new Error('No active identity found');
    }

    return await this.deriveKey(identity, {
      purpose: 'storage',
      privacyLevel,
      additionalContext: contentId
    });
  }

  /**
   * Encrypt data for secure storage
   */
  static async encryptForStorage(
    data: string | ArrayBuffer,
    storageKey: EncryptionKey
  ): Promise<EncryptedContent> {
    // Import the key for use
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(storageKey.keyData),
      this.ALGORITHM,
      false,
      ['encrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    // Convert data to buffer if needed
    let dataBuffer: ArrayBuffer;
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      dataBuffer = encoder.encode(data);
    } else {
      dataBuffer = data;
    }

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      cryptoKey,
      dataBuffer
    );

    // Extract auth tag
    const encryptedData = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedData.slice(0, -this.TAG_LENGTH);
    const authTag = encryptedData.slice(-this.TAG_LENGTH);

    return {
      encryptedData: this.arrayBufferToBase64(ciphertext),
      keyId: storageKey.keyId,
      algorithm: this.ALGORITHM,
      iv: this.arrayBufferToBase64(iv),
      authTag: this.arrayBufferToBase64(authTag),
      metadata: {
        originalSize: dataBuffer.byteLength,
        contentType: typeof data === 'string' ? 'text/plain' : 'application/octet-stream',
        encryptedAt: new Date()
      }
    };
  }

  /**
   * Decrypt data from secure storage
   */
  static async decryptFromStorage(
    encryptedContent: EncryptedContent,
    storageKey: EncryptionKey
  ): Promise<ArrayBuffer> {
    // Verify key ID matches
    if (storageKey.keyId !== encryptedContent.keyId) {
      throw new Error('Storage key ID mismatch');
    }

    // Import the key for use
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.base64ToArrayBuffer(storageKey.keyData),
      this.ALGORITHM,
      false,
      ['decrypt']
    );

    // Reconstruct the encrypted data with auth tag
    const ciphertext = this.base64ToArrayBuffer(encryptedContent.encryptedData);
    const authTag = this.base64ToArrayBuffer(encryptedContent.authTag || '');
    const iv = this.base64ToArrayBuffer(encryptedContent.iv);

    // Combine ciphertext and auth tag
    const encryptedBuffer = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    encryptedBuffer.set(new Uint8Array(ciphertext), 0);
    encryptedBuffer.set(new Uint8Array(authTag), ciphertext.byteLength);

    try {
      // Decrypt the data
      return await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv)
        },
        cryptoKey,
        encryptedBuffer
      );
    } catch (error) {
      throw new Error('Failed to decrypt storage data');
    }
  }

  /**
   * Check if content is encrypted
   */
  static isContentEncrypted(content: string): boolean {
    try {
      const parsed = JSON.parse(content);
      return parsed.encryptedData && parsed.keyId && parsed.algorithm;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption status for content
   */
  static getEncryptionStatus(
    content: QsocialPost | QsocialComment
  ): {
    isEncrypted: boolean;
    algorithm?: string;
    keyId?: string;
    canDecrypt: boolean;
  } {
    const metadata = (content as any).metadata;
    const isEncrypted = metadata?.encrypted || this.isContentEncrypted(content.content);
    
    if (!isEncrypted) {
      return {
        isEncrypted: false,
        canDecrypt: true
      };
    }

    const identity = getActiveIdentity();
    const canDecrypt = !!identity && content.privacyLevel !== PrivacyLevel.PUBLIC;

    return {
      isEncrypted: true,
      algorithm: metadata?.encryptionAlgorithm,
      keyId: metadata?.encryptionKeyId,
      canDecrypt
    };
  }
}