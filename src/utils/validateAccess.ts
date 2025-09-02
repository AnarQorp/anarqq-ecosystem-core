
/**
 * Access Validation Utilities
 * Used to check permissions and route access across the application
 */

import { 
  Identity, 
  IdentityVerificationLevel, 
  PrivacyLevel, 
  User 
} from '@/types';
import { isAuthorized, isVisibleWithPrivacySettings } from '@/lib/permissions';

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(
  user: User | null,
  requiredLevel: IdentityVerificationLevel,
  route: string
): boolean {
  if (!user) {
    // Only allow access to authentication routes if not logged in
    const publicRoutes = ['/', '/login', '/register', '/about'];
    return publicRoutes.includes(route);
  }
  
  if (user.primaryIdentity.verificationLevel >= requiredLevel) {
    return true;
  }
  
  // Check if any sub-identity has the required level
  return user.subIdentities.some(
    identity => identity.verificationLevel >= requiredLevel
  );
}

/**
 * Check if a user can perform a specific action
 */
export function canPerformAction(
  user: User | null,
  resource: string,
  action: string,
  module: string
): boolean {
  if (!user) return false;
  
  // Check primary identity first
  if (isAuthorized(user.primaryIdentity, resource, action, module)) {
    return true;
  }
  
  // Check sub-identities
  return user.subIdentities.some(
    identity => isAuthorized(identity, resource, action, module)
  );
}

/**
 * Filter messages by the user's privacy level
 */
export function filterMessagesByPrivacy<T extends { visibilityThreshold: PrivacyLevel }>(
  items: T[],
  privacyLevel: PrivacyLevel
): T[] {
  return items.filter(item => 
    isVisibleWithPrivacySettings(item.visibilityThreshold, privacyLevel)
  );
}

/**
 * Check if a specific module is active for the user
 */
export function isModuleActive(user: User | null, moduleId: string): boolean {
  if (!user) return false;
  return user.activeModules.includes(moduleId);
}

/**
 * Check if a user has a verified identity (either primary or sub)
 */
export function hasVerifiedIdentity(user: User | null): boolean {
  if (!user) return false;
  
  if (user.primaryIdentity.verificationLevel === IdentityVerificationLevel.ROOT ||
      user.primaryIdentity.verificationLevel === IdentityVerificationLevel.VERIFIED) {
    return true;
  }
  
  return user.subIdentities.some(identity => 
    identity.verificationLevel === IdentityVerificationLevel.ROOT ||
    identity.verificationLevel === IdentityVerificationLevel.VERIFIED
  );
}

/**
 * Get the highest verification level from all user identities
 */
export function getHighestVerificationLevel(user: User | null): IdentityVerificationLevel {
  if (!user) return IdentityVerificationLevel.UNVERIFIED;
  
  const levels = [
    user.primaryIdentity.verificationLevel,
    ...user.subIdentities.map(id => id.verificationLevel)
  ];
  
  if (levels.includes(IdentityVerificationLevel.ROOT)) {
    return IdentityVerificationLevel.ROOT;
  }
  
  if (levels.includes(IdentityVerificationLevel.VERIFIED)) {
    return IdentityVerificationLevel.VERIFIED;
  }
  
  return IdentityVerificationLevel.UNVERIFIED;
}
