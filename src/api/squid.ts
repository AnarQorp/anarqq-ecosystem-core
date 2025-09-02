
/**
 * sQuid API
 * Simulated backend for identity management
 */

import { Identity, IdentityVerificationLevel, User, PrivacyLevel } from '@/types';
import { generateMockUser } from '@/utils/mockData';
import { 
  createRootIdentity, 
  createSubIdentity, 
  submitVerification, 
  approveVerification 
} from '@/lib/identityUtils';

// Simulate a database
let users: Record<string, User> = {};
let identities: Record<string, Identity> = {};

// Initialize with mock data
const initMockData = () => {
  const mockUser = generateMockUser();
  
  // Add the user to the users collection
  users[mockUser.primaryIdentity.id] = mockUser;
  
  // Add all identities to the identities collection
  identities[mockUser.primaryIdentity.id] = mockUser.primaryIdentity;
  mockUser.subIdentities.forEach(identity => {
    identities[identity.id] = identity;
  });
};

// Initialize mock data
initMockData();

/**
 * Create a new root identity
 */
export async function createIdentity(
  name: string
): Promise<{
  success: boolean;
  identity?: Identity;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  try {
    // Use the identity utils to create a new identity
    const identity = await createRootIdentity(name);
    
    // Store the identity
    identities[identity.id] = identity;
    
    // Create a new user with this identity
    users[identity.id] = {
      primaryIdentity: identity,
      subIdentities: [],
      privacySettings: {
        level: PrivacyLevel.MEDIUM,
        dataRetention: 90,
        encryptionStrength: 'quantum',
        thirdPartySharing: false,
        metadataCollection: true
      },
      lastLogin: new Date(),
      activeModules: ['qmail', 'qlock', 'qindex', 'squid', 'qonsent']
    };
    
    console.log(`[sQuid API] Created new identity: ${identity.id} (${name})`);
    
    return { 
      success: true, 
      identity 
    };
  } catch (error) {
    console.error('[sQuid API] Identity creation error:', error);
    
    return { 
      success: false, 
      error: 'Failed to create identity' 
    };
  }
}

/**
 * Create a sub-identity
 */
export async function createSubIdentityForUser(
  userId: string,
  name: string,
  purpose: string
): Promise<{
  success: boolean;
  identity?: Identity;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find the user
  const user = users[userId];
  
  if (!user) {
    return { 
      success: false, 
      error: 'User not found' 
    };
  }
  
  try {
    // Use the identity utils to create a sub-identity
    const subIdentity = await createSubIdentity(
      user.primaryIdentity,
      name,
      purpose
    );
    
    if (!subIdentity) {
      return { 
        success: false, 
        error: 'Failed to create sub-identity. Parent must be a verified ROOT identity.' 
      };
    }
    
    // Store the identity
    identities[subIdentity.id] = subIdentity;
    
    // Add the sub-identity to the user
    users[userId] = {
      ...user,
      subIdentities: [...user.subIdentities, subIdentity]
    };
    
    console.log(`[sQuid API] Created sub-identity: ${subIdentity.id} for user ${userId}`);
    
    return { 
      success: true, 
      identity: subIdentity 
    };
  } catch (error) {
    console.error('[sQuid API] Sub-identity creation error:', error);
    
    return { 
      success: false, 
      error: 'Failed to create sub-identity' 
    };
  }
}

/**
 * Submit identity verification
 */
export async function submitIdentityVerification(
  identityId: string,
  verificationData: {
    fullName: string;
    dateOfBirth: string;
    documentType: string;
    documentNumber: string;
  }
): Promise<{
  success: boolean;
  identity?: Identity;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // Find the identity
  const identity = identities[identityId];
  
  if (!identity) {
    return { 
      success: false, 
      error: 'Identity not found' 
    };
  }
  
  try {
    // Use the identity utils to submit verification
    const updatedIdentity = await submitVerification(
      identity,
      verificationData
    );
    
    // Update the identity
    identities[identityId] = updatedIdentity;
    
    // Update the user if this is their primary identity
    const user = users[identityId];
    if (user) {
      users[identityId] = {
        ...user,
        primaryIdentity: updatedIdentity
      };
    }
    
    // Update any user that has this as a sub-identity
    Object.keys(users).forEach(userId => {
      const u = users[userId];
      const subIndex = u.subIdentities.findIndex(si => si.id === identityId);
      
      if (subIndex >= 0) {
        const updatedSubIdentities = [...u.subIdentities];
        updatedSubIdentities[subIndex] = updatedIdentity;
        
        users[userId] = {
          ...u,
          subIdentities: updatedSubIdentities
        };
      }
    });
    
    console.log(`[sQuid API] Verification submitted for identity: ${identityId}`);
    
    return { 
      success: true, 
      identity: updatedIdentity 
    };
  } catch (error) {
    console.error('[sQuid API] Verification submission error:', error);
    
    return { 
      success: false, 
      error: 'Failed to submit verification' 
    };
  }
}

/**
 * Approve identity verification (admin only)
 */
export async function approveIdentityVerification(
  identityId: string
): Promise<{
  success: boolean;
  identity?: Identity;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Find the identity
  const identity = identities[identityId];
  
  if (!identity) {
    return { 
      success: false, 
      error: 'Identity not found' 
    };
  }
  
  try {
    // Use the identity utils to approve verification
    const updatedIdentity = await approveVerification(identity);
    
    // Update the identity
    identities[identityId] = updatedIdentity;
    
    // Update the user if this is their primary identity
    const user = users[identityId];
    if (user) {
      users[identityId] = {
        ...user,
        primaryIdentity: updatedIdentity
      };
    }
    
    // Update any user that has this as a sub-identity
    Object.keys(users).forEach(userId => {
      const u = users[userId];
      const subIndex = u.subIdentities.findIndex(si => si.id === identityId);
      
      if (subIndex >= 0) {
        const updatedSubIdentities = [...u.subIdentities];
        updatedSubIdentities[subIndex] = updatedIdentity;
        
        users[userId] = {
          ...u,
          subIdentities: updatedSubIdentities
        };
      }
    });
    
    console.log(`[sQuid API] Verification approved for identity: ${identityId}`);
    
    return { 
      success: true, 
      identity: updatedIdentity 
    };
  } catch (error) {
    console.error('[sQuid API] Verification approval error:', error);
    
    return { 
      success: false, 
      error: 'Failed to approve verification' 
    };
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const user = users[userId];
  
  if (!user) {
    return { 
      success: false, 
      error: 'User not found' 
    };
  }
  
  return { 
    success: true, 
    user 
  };
}

/**
 * Get identity by ID
 */
export async function getIdentity(identityId: string): Promise<{
  success: boolean;
  identity?: Identity;
  error?: string;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const identity = identities[identityId];
  
  if (!identity) {
    return { 
      success: false, 
      error: 'Identity not found' 
    };
  }
  
  return { 
    success: true, 
    identity 
  };
}
