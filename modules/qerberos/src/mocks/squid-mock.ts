/**
 * sQuid Mock Service
 * Mock implementation of sQuid identity verification for standalone mode
 */

import { logger } from '../utils/logger';

// Mock identity database
const mockIdentities = new Map<string, {
  squidId: string;
  subIds: string[];
  daoIds: string[];
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  lastActive: string;
}>();

// Initialize with some test identities
mockIdentities.set('did:squid:user123', {
  squidId: 'did:squid:user123',
  subIds: ['work', 'personal'],
  daoIds: ['dao:enterprise:acme'],
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActive: new Date().toISOString()
});

mockIdentities.set('did:squid:admin456', {
  squidId: 'did:squid:admin456',
  subIds: ['admin'],
  daoIds: ['dao:root:system'],
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActive: new Date().toISOString()
});

mockIdentities.set('did:squid:highrisk123', {
  squidId: 'did:squid:highrisk123',
  subIds: ['main'],
  daoIds: [],
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActive: new Date().toISOString()
});

mockIdentities.set('did:squid:lowrisk456', {
  squidId: 'did:squid:lowrisk456',
  subIds: ['work', 'personal'],
  daoIds: ['dao:enterprise:trusted'],
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActive: new Date().toISOString()
});

/**
 * Validate identity with sQuid
 */
export async function validateIdentity(squidId: string, subId?: string): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    const identity = mockIdentities.get(squidId);
    
    if (!identity) {
      logger.debug('Identity not found in sQuid mock', { squidId });
      return false;
    }

    if (identity.status !== 'active') {
      logger.debug('Identity not active in sQuid mock', { squidId, status: identity.status });
      return false;
    }

    if (subId && !identity.subIds.includes(subId)) {
      logger.debug('Subidentity not found in sQuid mock', { squidId, subId });
      return false;
    }

    // Update last active timestamp
    identity.lastActive = new Date().toISOString();

    logger.debug('Identity validated successfully in sQuid mock', { squidId, subId });
    return true;

  } catch (error) {
    logger.error('Error in sQuid mock validation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      subId
    });
    return false;
  }
}

/**
 * Get identity information
 */
export async function getIdentityInfo(squidId: string): Promise<any | null> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30));

    const identity = mockIdentities.get(squidId);
    
    if (!identity) {
      return null;
    }

    return {
      squidId: identity.squidId,
      subIds: identity.subIds,
      daoIds: identity.daoIds,
      status: identity.status,
      createdAt: identity.createdAt,
      lastActive: identity.lastActive
    };

  } catch (error) {
    logger.error('Error getting identity info from sQuid mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId
    });
    return null;
  }
}

/**
 * Check if identity has specific role
 */
export async function hasRole(squidId: string, role: string): Promise<boolean> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 40));

    const identity = mockIdentities.get(squidId);
    
    if (!identity || identity.status !== 'active') {
      return false;
    }

    // Simple role mapping for demo
    const roleMapping: Record<string, string[]> = {
      'admin': ['did:squid:admin456'],
      'user': ['did:squid:user123', 'did:squid:highrisk123', 'did:squid:lowrisk456'],
      'enterprise': ['did:squid:user123', 'did:squid:lowrisk456']
    };

    return roleMapping[role]?.includes(squidId) || false;

  } catch (error) {
    logger.error('Error checking role in sQuid mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      role
    });
    return false;
  }
}

/**
 * Get identity reputation score
 */
export async function getReputationScore(squidId: string): Promise<number> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 60));

    const identity = mockIdentities.get(squidId);
    
    if (!identity || identity.status !== 'active') {
      return 0;
    }

    // Mock reputation scores
    const reputationScores: Record<string, number> = {
      'did:squid:user123': 0.8,
      'did:squid:admin456': 0.95,
      'did:squid:highrisk123': 0.3,
      'did:squid:lowrisk456': 0.9
    };

    return reputationScores[squidId] || 0.5;

  } catch (error) {
    logger.error('Error getting reputation score from sQuid mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId
    });
    return 0;
  }
}

/**
 * Create new identity (for testing)
 */
export async function createIdentity(squidId: string, subIds: string[] = [], daoIds: string[] = []): Promise<boolean> {
  try {
    if (mockIdentities.has(squidId)) {
      return false; // Identity already exists
    }

    mockIdentities.set(squidId, {
      squidId,
      subIds,
      daoIds,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    logger.info('Mock identity created', { squidId, subIds, daoIds });
    return true;

  } catch (error) {
    logger.error('Error creating identity in sQuid mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId
    });
    return false;
  }
}

/**
 * Update identity status
 */
export async function updateIdentityStatus(squidId: string, status: 'active' | 'suspended' | 'inactive'): Promise<boolean> {
  try {
    const identity = mockIdentities.get(squidId);
    
    if (!identity) {
      return false;
    }

    identity.status = status;
    logger.info('Mock identity status updated', { squidId, status });
    return true;

  } catch (error) {
    logger.error('Error updating identity status in sQuid mock', {
      error: error instanceof Error ? error.message : 'Unknown error',
      squidId,
      status
    });
    return false;
  }
}

/**
 * Get all mock identities (for testing)
 */
export function getAllMockIdentities(): Array<{
  squidId: string;
  subIds: string[];
  daoIds: string[];
  status: string;
  createdAt: string;
  lastActive: string;
}> {
  return Array.from(mockIdentities.values());
}