
/**
 * Permissions System (QIndex)
 * 
 * This module handles access control and permissions management
 * across the AnarQ ecosystem. It checks if operations are allowed
 * based on identity verification level and privacy settings.
 */

import { 
  Identity, 
  IdentityVerificationLevel, 
  Permission,
  PrivacyLevel,
  User
} from '@/types';

// Define module permissions
export const MODULE_PERMISSIONS: Record<string, Permission[]> = {
  qmail: [
    {
      resource: 'messages',
      action: 'read',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED,
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'qmail'
    },
    {
      resource: 'messages',
      action: 'send',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED
      ],
      module: 'qmail'
    },
    {
      resource: 'messages',
      action: 'encrypt',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED,
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'qmail'
    },
    {
      resource: 'attachments',
      action: 'upload',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED
      ],
      module: 'qmail'
    }
  ],
  qlock: [
    {
      resource: 'encryption',
      action: 'use_standard',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED,
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'qlock'
    },
    {
      resource: 'encryption',
      action: 'use_quantum',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED
      ],
      module: 'qlock'
    },
    {
      resource: 'signatures',
      action: 'generate',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED
      ],
      module: 'qlock'
    }
  ],
  squid: [
    {
      resource: 'identity',
      action: 'create_root',
      identityTypes: [
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'squid'
    },
    {
      resource: 'identity',
      action: 'submit_verification',
      identityTypes: [
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'squid'
    },
    {
      resource: 'identity',
      action: 'create_sub_identity',
      identityTypes: [
        IdentityVerificationLevel.ROOT
      ],
      module: 'squid'
    },
    {
      resource: 'identity',
      action: 'manage',
      identityTypes: [
        IdentityVerificationLevel.ROOT
      ],
      module: 'squid'
    }
  ],
  qonsent: [
    {
      resource: 'privacy',
      action: 'change_level',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED
      ],
      module: 'qonsent'
    },
    {
      resource: 'privacy',
      action: 'manage_data_retention',
      identityTypes: [
        IdentityVerificationLevel.ROOT
      ],
      module: 'qonsent'
    }
  ],
  qindex: [
    {
      resource: 'modules',
      action: 'list',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED,
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'qindex'
    },
    {
      resource: 'modules',
      action: 'access',
      identityTypes: [
        IdentityVerificationLevel.ROOT,
        IdentityVerificationLevel.VERIFIED,
        IdentityVerificationLevel.UNVERIFIED
      ],
      module: 'qindex'
    }
  ]
};

/**
 * Check if an identity is authorized to perform an action
 */
export function isAuthorized(
  identity: Identity,
  resource: string,
  action: string,
  moduleName: string
): boolean {
  const modulePermissions = MODULE_PERMISSIONS[moduleName] || [];
  
  const permission = modulePermissions.find(
    p => p.resource === resource && p.action === action
  );
  
  if (!permission) {
    console.warn(`[QIndex] Permission not found: ${resource}:${action} in ${moduleName}`);
    return false;
  }
  
  const isAuthorized = permission.identityTypes.includes(identity.verificationLevel);
  
  console.log(
    `[QIndex] Authorization check for ${identity.id} to ${action} ${resource} in ${moduleName}: ${isAuthorized}`
  );
  
  return isAuthorized;
}

/**
 * Check if content is visible based on privacy settings
 */
export function isVisibleWithPrivacySettings(
  requiredPrivacyLevel: PrivacyLevel,
  userPrivacyLevel: PrivacyLevel
): boolean {
  const privacyLevels = {
    [PrivacyLevel.LOW]: 1,
    [PrivacyLevel.MEDIUM]: 2,
    [PrivacyLevel.HIGH]: 3
  };
  
  // Higher privacy level means more restricted, so the content's required
  // privacy level must be lower than or equal to the user's level
  return privacyLevels[requiredPrivacyLevel] <= privacyLevels[userPrivacyLevel];
}

/**
 * Get all available permissions for an identity
 */
export function getAvailablePermissions(identity: Identity): Permission[] {
  const allPermissions: Permission[] = [];
  
  Object.values(MODULE_PERMISSIONS).forEach(modulePerms => {
    modulePerms.forEach(permission => {
      if (permission.identityTypes.includes(identity.verificationLevel)) {
        allPermissions.push(permission);
      }
    });
  });
  
  return allPermissions;
}

/**
 * Get available modules for a user based on their identity
 */
export function getAvailableModules(user: User): string[] {
  const availableModules = new Set<string>();
  
  // Get all permissions for the user's active identity
  const permissions = getAvailablePermissions(user.primaryIdentity);
  
  // Extract unique module names
  permissions.forEach(permission => {
    availableModules.add(permission.module);
  });
  
  return Array.from(availableModules);
}
