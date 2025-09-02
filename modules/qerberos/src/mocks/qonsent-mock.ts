/**
 * Qonsent Mock Service
 * Mock implementation of Qonsent permission checking for standalone mode
 */

import { logger } from '../utils/logger';

// Mock permission policies
const mockPolicies = new Map<string, {
  identity: string;
  permissions: string[];
  scopes: Record<string, string[]>;
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
}>();

// Initialize with some test permissions
mockPolicies.set('did:squid:user123', {
  identity: 'did:squid:user123',
  permissions: [
    'qerberos:audit:read',
    'qerberos:risk:read',
    'qerberos:anomaly:detect',
    'qerberos:alerts:read'
  ],
  scopes: {
    'qerberos:audit:read': ['own', 'subidentity'],
    'qerberos:risk:read': ['own'],
    'qerberos:anomaly:detect': ['own'],
    'qerberos:alerts:read': ['own']
  },
  grantedAt: '2024-01-01T00:00:00.000Z',
  grantedBy: 'system'
});

mockPolicies.set('did:squid:admin456', {
  identity: 'did:squid:admin456',
  permissions: [
    'qerberos:audit:read',
    'qerberos:audit:write',
    'qerberos:risk:read',
    'qerberos:risk:calculate',
    'qerberos:anomaly:detect',
    'qerberos:alerts:read',
    'qerberos:alerts:manage',
    'qerberos:compliance:read',
    'qerberos:compliance:generate',
    'qerberos:admin'
  ],
  scopes: {
    'qerberos:audit:read': ['all'],
    'qerberos:audit:write': ['all'],
    'qerberos:risk:read': ['all'],
    'qerberos:risk:calculate': ['all'],
    'qerberos:anomaly:detect': ['all'],
    'qerberos:alerts:read': ['all'],
    'qerberos:alerts:manage': ['all'],
    'qerberos:compliance:read': ['all'],
    'qerberos:compliance:generate': ['all'],
    'qerberos:admin': ['all']
  },
  grantedAt: '2024-01-01T00:00:00.000Z',
  grantedBy: 'system'
});

mockPolicies.set('did:squid:highrisk123', {
  identity: 'did:squid:highrisk123',
  permissions: [
    'qerberos:audit:read',
    'qerberos:risk:read'
  ],
  scopes: {
    'qerberos:audit:read': ['own'],
    'qerberos:risk:read': ['own']
  },
  grantedAt: '2024-01-01T00:00:00.000Z',
  grantedBy: 'system'
});

mockPolicies.set('did:squid:lowrisk456', {
  identity: 'did:squid:lowrisk456',
  permissions: [
    'qerberos:audit:read',
    'qerberos:risk:read',
    'qerberos:anomaly:detect',
    'qerberos:alerts:read',
    'qerberos:compliance:read'
  ],
  scopes: {
    'qerberos:audit:read': ['own', 'subidentity', 'dao'],
    'qerberos:risk:read': ['own', 'dao'],
    'qerberos:anomaly:detect': ['own', 'dao'],
    'qerberos:alerts:read': ['own', 'dao'],
    'qerberos:compliance:read': ['dao']
  },
  grantedAt: '2024-01-01T00:00:00.000Z',
  grantedBy: 'system'
});

/**
 * Check if identity has specific permission
 */
export async function checkPermission(
  squidId: string,
  permission: string,
  context?: {
    subId?: string;
    daoId?: string;
    resource?: string;
    action?: string;
  }
): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30));

    const policy = mockPolicies.get(squidId);
    
    if (!policy) {
      logger.debug('No policy found for identity in Qonsent mock', { squidId });
      return false;
    }

    // Check if permission exists
    if (!policy.permissions.includes(permission)) {
      logger.debug('Permission not granted in Qonsent mock', { squidId, permission });
      return false;
    }

    // Check if policy has expired
    if (policy.expiresAt && new Date(policy.expiresAt) < new Date()) {
      logger.debug('Policy expired in Qonsent mock', { squidId, permission, expiresAt: policy.expiresAt });
      return false;
    }

    // Check scope if provided
    const scopes = policy.scopes[permission];
    if (scopes && context) {
      const hasValidScope = scopes.some(scope => {
        switch (scope) {
          case 'all':
            return true;
          case 'own':
            return true; // In mock, assume identity can access own resources
          case 'subidentity':
            return context.subId !== undefined;
          case 'dao':
            return context.daoId !== undefined;
          default:
            return false;
        }
      });

      if (!hasValidScope) {
        logger.debug('Insufficient scope in Qonsent mock', { squidId, permission, scopes, context });
        return false;
      }
    }

    logger.debug('Permission granted in Qonsent mock', { squidId, permission, context });
    return true;

  } catch (error) {
    logger.error('Error checking permission in Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      permission,
      context
    });
    return false;
  }
}

/**
 * Grant permission to identity
 */
export async function grantPermission(
  squidId: string,
  permission: string,
  scopes: string[] = ['own'],
  expiresAt?: string,
  grantedBy: string = 'system'
): Promise<boolean> {
  try {
    let policy = mockPolicies.get(squidId);
    
    if (!policy) {
      policy = {
        identity: squidId,
        permissions: [],
        scopes: {},
        grantedAt: new Date().toISOString(),
        grantedBy
      };
      mockPolicies.set(squidId, policy);
    }

    // Add permission if not already present
    if (!policy.permissions.includes(permission)) {
      policy.permissions.push(permission);
    }

    // Update scopes
    policy.scopes[permission] = scopes;

    // Update expiration if provided
    if (expiresAt) {
      policy.expiresAt = expiresAt;
    }

    logger.info('Permission granted in Qonsent mock', { squidId, permission, scopes, expiresAt });
    return true;

  } catch (error) {
    logger.error('Error granting permission in Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      permission
    });
    return false;
  }
}

/**
 * Revoke permission from identity
 */
export async function revokePermission(squidId: string, permission: string): Promise<boolean> {
  try {
    const policy = mockPolicies.get(squidId);
    
    if (!policy) {
      return false;
    }

    // Remove permission
    const index = policy.permissions.indexOf(permission);
    if (index > -1) {
      policy.permissions.splice(index, 1);
      delete policy.scopes[permission];
      
      logger.info('Permission revoked in Qonsent mock', { squidId, permission });
      return true;
    }

    return false;

  } catch (error) {
    logger.error('Error revoking permission in Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      permission
    });
    return false;
  }
}

/**
 * Get all permissions for identity
 */
export async function getPermissions(squidId: string): Promise<{
  permissions: string[];
  scopes: Record<string, string[]>;
  grantedAt: string;
  expiresAt?: string;
} | null> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 40));

    const policy = mockPolicies.get(squidId);
    
    if (!policy) {
      return null;
    }

    return {
      permissions: [...policy.permissions],
      scopes: { ...policy.scopes },
      grantedAt: policy.grantedAt,
      expiresAt: policy.expiresAt
    };

  } catch (error) {
    logger.error('Error getting permissions from Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId
    });
    return null;
  }
}

/**
 * Check multiple permissions at once
 */
export async function checkMultiplePermissions(
  squidId: string,
  permissions: string[],
  context?: {
    subId?: string;
    daoId?: string;
    resource?: string;
    action?: string;
  }
): Promise<Record<string, boolean>> {
  try {
    const results: Record<string, boolean> = {};
    
    for (const permission of permissions) {
      results[permission] = await checkPermission(squidId, permission, context);
    }

    return results;

  } catch (error) {
    logger.error('Error checking multiple permissions in Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      permissions
    });
    
    // Return all false on error
    const results: Record<string, boolean> = {};
    permissions.forEach(permission => {
      results[permission] = false;
    });
    return results;
  }
}

/**
 * Validate UCAN token (simplified mock)
 */
export async function validateUCANToken(token: string, requiredCapability: string): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simple mock validation - in reality this would parse and validate the UCAN
    if (!token || token.length < 10) {
      return false;
    }

    // Mock: tokens starting with 'valid_' are considered valid
    if (token.startsWith('valid_')) {
      logger.debug('UCAN token validated in Qonsent mock', { requiredCapability });
      return true;
    }

    logger.debug('UCAN token validation failed in Qonsent mock', { requiredCapability });
    return false;

  } catch (error) {
    logger.error('Error validating UCAN token in Qonsent mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requiredCapability
    });
    return false;
  }
}

/**
 * Get all mock policies (for testing)
 */
export function getAllMockPolicies(): Array<{
  identity: string;
  permissions: string[];
  scopes: Record<string, string[]>;
  grantedAt: string;
  expiresAt?: string;
  grantedBy: string;
}> {
  return Array.from(mockPolicies.values());
}