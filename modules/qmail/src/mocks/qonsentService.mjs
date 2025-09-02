/**
 * Mock Qonsent Service
 * Simulates Qonsent permission checking functionality
 */

export class MockQonsentService {
  constructor(options = {}) {
    this.integrated = options.integrated || false;
    this.permissions = new Map();
    
    // Initialize with some test permissions
    this.initializeTestPermissions();
  }

  async initialize() {
    console.log(`[MockQonsent] Initializing ${this.integrated ? 'integrated' : 'standalone'} mode`);
    return true;
  }

  initializeTestPermissions() {
    const testPermissions = [
      {
        squidId: 'squid_alice_123',
        permissions: {
          'message.send': true,
          'message.read': true,
          'message.delete': true,
          'admin.access': false
        }
      },
      {
        squidId: 'squid_bob_456',
        permissions: {
          'message.send': true,
          'message.read': true,
          'message.delete': true,
          'admin.access': false
        }
      },
      {
        squidId: 'squid_charlie_789',
        permissions: {
          'message.send': false,
          'message.read': true,
          'message.delete': false,
          'admin.access': false
        }
      }
    ];

    testPermissions.forEach(perm => {
      this.permissions.set(perm.squidId, perm.permissions);
    });
  }

  /**
   * Check permission
   */
  async checkPermission(squidId, action, resource, context = {}) {
    try {
      console.log(`[MockQonsent] Checking permission ${squidId} -> ${action} on ${resource}`);

      const userPermissions = this.permissions.get(squidId);
      if (!userPermissions) {
        console.log(`[MockQonsent] No permissions found for ${squidId}`);
        return false;
      }

      // Check basic permission
      let hasPermission = userPermissions[action] !== false;

      // Apply context-specific rules
      if (action === 'message.delete' && context.messageOwner) {
        // Can only delete own messages
        hasPermission = hasPermission && (squidId === context.messageOwner);
      }

      if (action === 'message.read' && resource.startsWith('inbox:')) {
        // Can only read own inbox
        const inboxOwner = resource.split(':')[1];
        hasPermission = hasPermission && (squidId === inboxOwner);
      }

      console.log(`[MockQonsent] Permission ${action} for ${squidId}: ${hasPermission ? 'GRANTED' : 'DENIED'}`);
      return hasPermission;

    } catch (error) {
      console.error(`[MockQonsent] Error checking permission:`, error);
      return false;
    }
  }

  /**
   * Grant permission
   */
  async grantPermission(squidId, action, resource, context = {}) {
    try {
      console.log(`[MockQonsent] Granting permission ${action} to ${squidId} for ${resource}`);

      let userPermissions = this.permissions.get(squidId);
      if (!userPermissions) {
        userPermissions = {};
        this.permissions.set(squidId, userPermissions);
      }

      userPermissions[action] = true;

      console.log(`[MockQonsent] Permission ${action} granted to ${squidId}`);
      return true;

    } catch (error) {
      console.error(`[MockQonsent] Error granting permission:`, error);
      throw error;
    }
  }

  /**
   * Revoke permission
   */
  async revokePermission(squidId, action, resource, context = {}) {
    try {
      console.log(`[MockQonsent] Revoking permission ${action} from ${squidId} for ${resource}`);

      const userPermissions = this.permissions.get(squidId);
      if (userPermissions) {
        userPermissions[action] = false;
      }

      console.log(`[MockQonsent] Permission ${action} revoked from ${squidId}`);
      return true;

    } catch (error) {
      console.error(`[MockQonsent] Error revoking permission:`, error);
      throw error;
    }
  }

  /**
   * List permissions for user
   */
  async listPermissions(squidId) {
    try {
      console.log(`[MockQonsent] Listing permissions for ${squidId}`);

      const userPermissions = this.permissions.get(squidId) || {};
      
      return {
        squidId,
        permissions: userPermissions,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[MockQonsent] Error listing permissions:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: this.integrated ? 'integrated' : 'standalone',
      userCount: this.permissions.size
    };
  }

  async shutdown() {
    console.log('[MockQonsent] Shutting down');
    this.permissions.clear();
  }
}