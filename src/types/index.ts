
// Core Types for AnarQ & Q Ecosystem

// User Identity & Verification
export enum IdentityVerificationLevel {
  ROOT = "root",            // Main identity with full KYC
  VERIFIED = "verified",    // Identity with partial verification 
  UNVERIFIED = "unverified" // No verification, limited functionality
}

export enum PrivacyLevel {
  LOW = "low",       // Minimal privacy - most data visible
  MEDIUM = "medium", // Balanced privacy - some data restricted
  HIGH = "high"      // Maximum privacy - strict data controls
}

export interface Identity {
  id: string;
  name: string;
  publicKey: string;        // Public key for encryption
  verificationLevel: IdentityVerificationLevel;
  created: Date;
  parentId?: string;        // For sub-identities, references parent ID
  cid_profile?: string;     // CID of the user's sQuid profile in IPFS
  kycStatus: {
    submitted: boolean;
    approved: boolean;
    timestamp?: Date;
  };
  metadata: Record<string, unknown>;
}

export interface User {
  primaryIdentity: Identity;
  subIdentities: Identity[];
  privacySettings: {
    level: PrivacyLevel;
    dataRetention: number;   // Days to keep data
    encryptionStrength: string; // e.g. "quantum", "standard"
    thirdPartySharing: boolean;
    metadataCollection: boolean;
  };
  lastLogin: Date;
  activeModules: string[];   // List of modules the user has enabled
}

// Message System (QMail)
export enum MessageStatus {
  DRAFT = "draft",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  UNREAD = "unread",
  EXPIRED = "expired"
}

export enum MessagePriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}

export interface Message {
  id: string;
  senderId: string;
  senderIdentityId: string;
  recipientId: string;
  recipientIdentityId: string;
  subject: string;
  content: string;          // Encrypted content
  encryptionLevel: string;  // Type of encryption used
  timestamp: Date;
  expires?: Date;           // Optional expiration (self-destruct)
  status: MessageStatus;
  priority: MessagePriority;
  attachments: Attachment[];
  metadata: {
    ipfsHash?: string;
    signature: string;      // Digital signature for verification
    size: number;
    routingPath: string[];  // Path message took through network
    // Enhanced metadata for Qlock/Qindex/Qerberos integration
    qindexRegistered?: boolean;
    qerberosValidated?: boolean;
    encryptedWith?: string;
    aesKeyHash?: string;
    senderSpace?: string;
  };
  visibilityThreshold: PrivacyLevel; // Minimum privacy level to see this message
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  hash: string;           // Content hash for integrity
  ipfsReference?: string; // IPFS content identifier
  encryptionKey?: string; // Key used to encrypt/decrypt
}

// Permission System
export interface Permission {
  resource: string;       // What is being accessed
  action: string;         // What action is being performed
  identityTypes: IdentityVerificationLevel[];
  minimumPrivacyLevel?: PrivacyLevel;
  module: string;         // Which module this permission is for
}

// Module Definition
export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  active: boolean;
  dependencies: string[]; // IDs of modules this depends on
  permissions: Permission[];
  endpoints: {
    path: string;
    method: string;
    requiredPermissions: Permission[];
  }[];
}

// Re-export Identity types
export * from './identity';
export * from './identity-hierarchy';
export * from './governance';
export * from './identity-constants';

// Re-export Qsocial types
export * from './qsocial';

// Re-export Qwallet Module Registration types
export * from './qwallet-module-registration';
