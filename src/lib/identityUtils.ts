
/**
 * Identity Utilities (sQuid)
 * 
 * Utilities for creating and managing decentralized identities,
 * including verification levels and identity relationships.
 */

import { 
  Identity, 
  IdentityVerificationLevel,
  User
} from '@/types';
import { generateKeyPair } from './quantumSim';

/**
 * Create a new root identity
 */
export async function createRootIdentity(name: string): Promise<Identity> {
  // Generate cryptographic keys for the identity
  const { publicKey, privateKey } = await generateKeyPair('QUANTUM');
  
  // Store private key securely in localStorage (in production, better storage would be used)
  localStorage.setItem('anarq_private_key', privateKey);
  
  const identity: Identity = {
    id: crypto.randomUUID(),
    name,
    publicKey,
    verificationLevel: IdentityVerificationLevel.UNVERIFIED,
    created: new Date(),
    kycStatus: {
      submitted: false,
      approved: false
    },
    metadata: {
      deviceFingerprint: generateDeviceFingerprint(),
      creation: {
        timestamp: Date.now(),
        geohash: 'SIMULATED',
      }
    }
  };
  
  console.log(`[sQuid] Created new root identity: ${identity.id} (${name})`);
  
  return identity;
}

/**
 * Create a sub-identity linked to a parent identity
 */
export async function createSubIdentity(
  parentIdentity: Identity,
  name: string,
  purpose: string
): Promise<Identity | null> {
  // Check if parent is root and verified
  if (parentIdentity.verificationLevel !== IdentityVerificationLevel.ROOT) {
    console.error('[sQuid] Cannot create sub-identity: Parent must be a verified ROOT identity');
    return null;
  }
  
  // Create a sub-identity with different encryption keys
  const { publicKey } = await generateKeyPair('ENHANCED');
  
  const subIdentity: Identity = {
    id: crypto.randomUUID(),
    name,
    publicKey,
    verificationLevel: IdentityVerificationLevel.UNVERIFIED,
    created: new Date(),
    parentId: parentIdentity.id,
    kycStatus: {
      submitted: false,
      approved: false
    },
    metadata: {
      purpose,
      parentIdentity: parentIdentity.id,
      deviceFingerprint: generateDeviceFingerprint(),
      creation: {
        timestamp: Date.now()
      }
    }
  };
  
  console.log(`[sQuid] Created sub-identity: ${subIdentity.id} (${name}) for parent ${parentIdentity.id}`);
  
  return subIdentity;
}

/**
 * Simulate verification submission for KYC process
 */
export async function submitVerification(
  identity: Identity,
  verificationData: {
    fullName: string;
    dateOfBirth: string;
    documentType: string;
    documentNumber: string;
  }
): Promise<Identity> {
  // Make a copy of the identity to avoid mutation
  const updatedIdentity: Identity = {
    ...identity,
    kycStatus: {
      ...identity.kycStatus,
      submitted: true,
      timestamp: new Date()
    },
    metadata: {
      ...identity.metadata,
      verification: {
        submittedAt: Date.now(),
        type: verificationData.documentType,
        // In a real implementation, we'd securely store or hash this data
        documentIdentifier: verificationData.documentNumber.slice(-4)
      }
    }
  };
  
  console.log(`[sQuid] Verification submitted for identity: ${identity.id}`);
  
  return updatedIdentity;
}

/**
 * Simulate KYC verification approval (would be done by an admin in real system)
 */
export async function approveVerification(identity: Identity): Promise<Identity> {
  if (!identity.kycStatus.submitted) {
    throw new Error('Verification has not been submitted');
  }
  
  // Simulate approval process delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Make a copy of the identity to avoid mutation
  const updatedIdentity: Identity = {
    ...identity,
    verificationLevel: IdentityVerificationLevel.ROOT,
    kycStatus: {
      submitted: true,
      approved: true,
      timestamp: new Date()
    },
    metadata: {
      ...identity.metadata,
      verification: {
        ...(identity.metadata.verification as any || {}),
        approvedAt: Date.now(),
        level: 'full',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
      }
    }
  };
  
  console.log(`[sQuid] Verification approved for identity: ${identity.id}`);
  
  return updatedIdentity;
}

/**
 * Check if a user is permitted to create sub-identities based on their verification level
 */
export function canCreateSubIdentities(user: User): boolean {
  return user.primaryIdentity.verificationLevel === IdentityVerificationLevel.ROOT &&
         user.primaryIdentity.kycStatus.approved;
}

/**
 * Generate a device fingerprint for identity security
 */
function generateDeviceFingerprint(): string {
  // In a real implementation, this would collect browser/device characteristics
  // Here we just generate a random identifier
  return `DEV-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get all identities for a user (primary + sub-identities)
 */
export function getAllIdentities(user: User): Identity[] {
  return [user.primaryIdentity, ...user.subIdentities];
}

/**
 * Find identity by ID from user's identities
 */
export function findIdentityById(user: User, identityId: string): Identity | undefined {
  if (user.primaryIdentity.id === identityId) {
    return user.primaryIdentity;
  }
  return user.subIdentities.find(identity => identity.id === identityId);
}
