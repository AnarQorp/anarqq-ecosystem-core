/**
 * Qonsent Validation Layer for Universal Validation Pipeline
 * 
 * Integrates with Qonsent service for dynamic permissions validation,
 * real-time permission checking, and consent expiration handling.
 */

import { ValidationResult, ValidationContext } from './UniversalValidationPipeline.js';
import { qflowEventEmitter } from '../events/EventEmitter.js';

export interface QonsentValidationConfig {
  endpoint: string;
  timeout: number;
  retryAttempts: number;
  cachePermissions: boolean;
  permissionCacheTtl: number;
  strictMode: boolean;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string[];
  conditions?: Record<string, any>;
  expiresAt?: string;
  grantedBy: string;
  grantedAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  permissions: Permission[];
  consentType: 'explicit' | 'implicit' | 'delegated';
  status: 'active' | 'expired' | 'revoked' | 'pending';
  expiresAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionRequest {
  userId: string;
  resource: string;
  action: string;
  context: ValidationContext;
  scope?: string[];
  conditions?: Record<string, any>;
}

export interface PermissionCheckResult {
  granted: boolean;
  permission?: Permission;
  reason: string;
  expiresAt?: string;
  requiresRenewal: boolean;
  consentRecord?: ConsentRecord;
}

export interface QonsentValidationResult extends ValidationResult {
  details: {
    permissionsChecked: number;
    permissionsGranted: number;
    permissionsDenied: number;
    expiredPermissions: number;
    renewalRequired: boolean;
    consentStatus?: 'valid' | 'expired' | 'revoked' | 'missing';
    error?: string;
  };
}

/**
 * Mock Qonsent Service for development/testing
 * In production, this would integrate with the actual Qonsent service
 */
class MockQonsentService {
  private permissions: Map<string, Permission[]> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private config: QonsentValidationConfig;

  constructor(config: QonsentValidationConfig) {
    this.config = config;
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPermissions(): void {
    // Initialize with some default permissions for testing
    const defaultPermissions: Permission[] = [
      {
        id: 'perm-001',
        resource: 'flow',
        action: 'create',
        scope: ['*'],
        grantedBy: 'system',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      },
      {
        id: 'perm-002',
        resource: 'flow',
        action: 'execute',
        scope: ['*'],
        grantedBy: 'system',
        grantedAt: new Date().toISOString()
      },
      {
        id: 'perm-003',
        resource: 'data',
        action: 'read',
        scope: ['public'],
        grantedBy: 'system',
        grantedAt: new Date().toISOString()
      }
    ];

    this.permissions.set('default-user', defaultPermissions);

    // Create corresponding consent record
    const consentRecord: ConsentRecord = {
      id: 'consent-001',
      userId: 'default-user',
      permissions: defaultPermissions,
      consentType: 'explicit',
      status: 'active',
      metadata: { source: 'initialization' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.consentRecords.set('default-user', consentRecord);
  }

  async checkPermission(request: PermissionRequest): Promise<PermissionCheckResult> {
    const userPermissions = this.permissions.get(request.userId) || [];
    
    // Find matching permission
    const matchingPermission = userPermissions.find(permission => 
      permission.resource === request.resource &&
      permission.action === request.action &&
      this.checkScope(permission.scope, request.scope || ['*']) &&
      this.checkConditions(permission.conditions, request.conditions)
    );

    if (!matchingPermission) {
      return {
        granted: false,
        reason: `No permission found for ${request.action} on ${request.resource}`,
        requiresRenewal: false
      };
    }

    // Check if permission is expired
    if (matchingPermission.expiresAt) {
      const expirationTime = new Date(matchingPermission.expiresAt).getTime();
      const now = Date.now();
      
      if (now > expirationTime) {
        return {
          granted: false,
          permission: matchingPermission,
          reason: 'Permission has expired',
          requiresRenewal: true
        };
      }

      // Check if renewal is needed soon (within 1 hour)
      const renewalThreshold = 60 * 60 * 1000; // 1 hour
      const requiresRenewal = (expirationTime - now) < renewalThreshold;

      return {
        granted: true,
        permission: matchingPermission,
        reason: 'Permission granted',
        expiresAt: matchingPermission.expiresAt,
        requiresRenewal
      };
    }

    return {
      granted: true,
      permission: matchingPermission,
      reason: 'Permission granted',
      requiresRenewal: false
    };
  }

  async getConsentRecord(userId: string): Promise<ConsentRecord | null> {
    const record = this.consentRecords.get(userId);
    
    if (!record) {
      return null;
    }

    // Check if consent record is expired
    if (record.expiresAt) {
      const expirationTime = new Date(record.expiresAt).getTime();
      if (Date.now() > expirationTime) {
        record.status = 'expired';
        this.consentRecords.set(userId, record);
      }
    }

    return record;
  }

  async renewPermission(permissionId: string, userId: string): Promise<Permission> {
    const userPermissions = this.permissions.get(userId) || [];
    const permissionIndex = userPermissions.findIndex(p => p.id === permissionId);
    
    if (permissionIndex === -1) {
      throw new Error(`Permission not found: ${permissionId}`);
    }

    const permission = userPermissions[permissionIndex];
    const renewedPermission: Permission = {
      ...permission,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Extend by 24 hours
      grantedAt: new Date().toISOString()
    };

    userPermissions[permissionIndex] = renewedPermission;
    this.permissions.set(userId, userPermissions);

    return renewedPermission;
  }

  async revokePermission(permissionId: string, userId: string): Promise<void> {
    const userPermissions = this.permissions.get(userId) || [];
    const filteredPermissions = userPermissions.filter(p => p.id !== permissionId);
    this.permissions.set(userId, filteredPermissions);
  }

  private checkScope(permissionScope: string[], requestedScope: string[]): boolean {
    // If permission has wildcard scope, allow everything
    if (permissionScope.includes('*')) {
      return true;
    }

    // Check if all requested scopes are covered by permission scopes
    return requestedScope.every(scope => permissionScope.includes(scope));
  }

  private checkConditions(permissionConditions?: Record<string, any>, requestConditions?: Record<string, any>): boolean {
    if (!permissionConditions) {
      return true; // No conditions to check
    }

    if (!requestConditions) {
      return false; // Permission has conditions but request doesn't provide them
    }

    // Simple condition matching - in reality this would be more sophisticated
    for (const [key, value] of Object.entries(permissionConditions)) {
      if (requestConditions[key] !== value) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Qonsent Validation Layer
 * Provides permission validation for the Universal Validation Pipeline
 */
export class QonsentValidationLayer {
  private qonsentService: MockQonsentService;
  private config: QonsentValidationConfig;
  private permissionCache: Map<string, { result: PermissionCheckResult; timestamp: number }> = new Map();

  constructor(config?: Partial<QonsentValidationConfig>) {
    this.config = {
      endpoint: process.env.QONSENT_ENDPOINT || 'http://localhost:8081',
      timeout: 10000,
      retryAttempts: 3,
      cachePermissions: true,
      permissionCacheTtl: 300000, // 5 minutes
      strictMode: true,
      ...config
    };

    this.qonsentService = new MockQonsentService(this.config);
    this.startCacheCleanup();
  }

  /**
   * Validate permissions for data access/operations
   */
  async validatePermissions(data: any, context: ValidationContext): Promise<QonsentValidationResult> {
    const startTime = Date.now();
    
    try {
      // Extract permission requirements from data
      const permissionRequests = this.extractPermissionRequests(data, context);
      
      if (permissionRequests.length === 0) {
        return {
          layerId: 'qonsent-validation',
          status: 'passed',
          message: 'No permission requirements found - validation skipped',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          details: {
            permissionsChecked: 0,
            permissionsGranted: 0,
            permissionsDenied: 0,
            expiredPermissions: 0,
            renewalRequired: false,
            consentStatus: 'valid'
          }
        };
      }

      // Check each permission requirement
      const permissionResults = await Promise.all(
        permissionRequests.map(request => this.checkPermissionWithCache(request))
      );

      const permissionsGranted = permissionResults.filter(result => result.granted).length;
      const permissionsDenied = permissionResults.filter(result => !result.granted).length;
      const expiredPermissions = permissionResults.filter(result => result.reason.includes('expired')).length;
      const renewalRequired = permissionResults.some(result => result.requiresRenewal);

      // Determine overall status
      let status: 'passed' | 'failed' | 'warning' = 'passed';
      let message = 'All permissions validated successfully';

      if (permissionsDenied > 0) {
        status = 'failed';
        message = `${permissionsDenied} permission(s) denied`;
      } else if (renewalRequired || expiredPermissions > 0) {
        status = 'warning';
        message = 'Permissions valid but renewal recommended';
      }

      // Get consent status for the primary user
      const primaryUserId = this.extractPrimaryUserId(context);
      const consentRecord = primaryUserId ? await this.qonsentService.getConsentRecord(primaryUserId) : null;
      const consentStatus = this.determineConsentStatus(consentRecord);

      return {
        layerId: 'qonsent-validation',
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          permissionsChecked: permissionRequests.length,
          permissionsGranted,
          permissionsDenied,
          expiredPermissions,
          renewalRequired,
          consentStatus
        }
      };

    } catch (error) {
      return {
        layerId: 'qonsent-validation',
        status: 'failed',
        message: `Qonsent validation error: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: {
          permissionsChecked: 0,
          permissionsGranted: 0,
          permissionsDenied: 0,
          expiredPermissions: 0,
          renewalRequired: false,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Check permission with caching
   */
  private async checkPermissionWithCache(request: PermissionRequest): Promise<PermissionCheckResult> {
    if (this.config.cachePermissions) {
      const cacheKey = this.generatePermissionCacheKey(request);
      const cached = this.permissionCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.config.permissionCacheTtl) {
        return cached.result;
      }
    }

    const result = await this.qonsentService.checkPermission(request);

    if (this.config.cachePermissions && result.granted) {
      const cacheKey = this.generatePermissionCacheKey(request);
      this.permissionCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    // Emit permission check event
    qflowEventEmitter.emit('q.qflow.qonsent.permission.checked.v1', {
      userId: request.userId,
      resource: request.resource,
      action: request.action,
      granted: result.granted,
      reason: result.reason,
      context: request.context.requestId,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Renew expired permission
   */
  async renewPermission(permissionId: string, userId: string): Promise<Permission> {
    try {
      const renewedPermission = await this.qonsentService.renewPermission(permissionId, userId);

      // Clear cache for this user
      this.clearUserPermissionCache(userId);

      // Emit permission renewal event
      qflowEventEmitter.emit('q.qflow.qonsent.permission.renewed.v1', {
        permissionId,
        userId,
        expiresAt: renewedPermission.expiresAt,
        timestamp: new Date().toISOString()
      });

      console.log(`[QonsentValidation] 🔄 Permission renewed: ${permissionId} for user ${userId}`);
      return renewedPermission;

    } catch (error) {
      console.error('[QonsentValidation] ❌ Permission renewal failed:', error);
      throw error;
    }
  }

  /**
   * Revoke permission
   */
  async revokePermission(permissionId: string, userId: string): Promise<void> {
    try {
      await this.qonsentService.revokePermission(permissionId, userId);

      // Clear cache for this user
      this.clearUserPermissionCache(userId);

      // Emit permission revocation event
      qflowEventEmitter.emit('q.qflow.qonsent.permission.revoked.v1', {
        permissionId,
        userId,
        timestamp: new Date().toISOString()
      });

      console.log(`[QonsentValidation] ❌ Permission revoked: ${permissionId} for user ${userId}`);

    } catch (error) {
      console.error('[QonsentValidation] ❌ Permission revocation failed:', error);
      throw error;
    }
  }

  /**
   * Get consent record for user
   */
  async getConsentRecord(userId: string): Promise<ConsentRecord | null> {
    return await this.qonsentService.getConsentRecord(userId);
  }

  /**
   * Extract permission requests from data
   */
  private extractPermissionRequests(data: any, context: ValidationContext): PermissionRequest[] {
    const requests: PermissionRequest[] = [];
    
    // Extract user ID from context
    const userId = this.extractPrimaryUserId(context);
    if (!userId) {
      return requests; // No user context, skip permission checks
    }

    // Look for permission requirements in data
    if (data && typeof data === 'object') {
      // Check for explicit permission requirements
      if (data.permissions && Array.isArray(data.permissions)) {
        for (const perm of data.permissions) {
          if (perm.resource && perm.action) {
            requests.push({
              userId,
              resource: perm.resource,
              action: perm.action,
              context,
              scope: perm.scope,
              conditions: perm.conditions
            });
          }
        }
      }

      // Infer permissions from data structure
      if (data.flowDefinition) {
        requests.push({
          userId,
          resource: 'flow',
          action: 'create',
          context
        });
      }

      if (data.executionId) {
        requests.push({
          userId,
          resource: 'flow',
          action: 'execute',
          context
        });
      }

      if (data.dataAccess) {
        requests.push({
          userId,
          resource: 'data',
          action: 'read',
          context,
          scope: data.dataAccess.scope
        });
      }
    }

    return requests;
  }

  /**
   * Extract primary user ID from context
   */
  private extractPrimaryUserId(context: ValidationContext): string | null {
    // Look for user ID in context metadata
    if (context.metadata.userId) {
      return context.metadata.userId;
    }

    if (context.metadata.actor) {
      return context.metadata.actor;
    }

    // Default user for testing
    return 'default-user';
  }

  /**
   * Generate cache key for permission request
   */
  private generatePermissionCacheKey(request: PermissionRequest): string {
    return `${request.userId}:${request.resource}:${request.action}:${JSON.stringify(request.scope || [])}`;
  }

  /**
   * Clear permission cache for a user
   */
  private clearUserPermissionCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.permissionCache) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  /**
   * Determine consent status from consent record
   */
  private determineConsentStatus(consentRecord: ConsentRecord | null): 'valid' | 'expired' | 'revoked' | 'missing' {
    if (!consentRecord) {
      return 'missing';
    }

    switch (consentRecord.status) {
      case 'active':
        return 'valid';
      case 'expired':
        return 'expired';
      case 'revoked':
        return 'revoked';
      default:
        return 'missing';
    }
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, cached] of this.permissionCache) {
        if ((now - cached.timestamp) > this.config.permissionCacheTtl) {
          this.permissionCache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`[QonsentValidation] 🧹 Cleaned ${cleaned} expired permission cache entries`);
      }
    }, 60000); // Clean every minute
  }

  /**
   * Get validation layer configuration for Universal Validation Pipeline
   */
  getValidationLayer() {
    return {
      layerId: 'qonsent-validation',
      name: 'Qonsent Permission Validation',
      description: 'Validates dynamic permissions and consent management',
      priority: 2, // High priority for security, after encryption
      required: true,
      timeout: this.config.timeout
    };
  }

  /**
   * Get validator function for Universal Validation Pipeline
   */
  getValidator() {
    return async (data: any, context: ValidationContext): Promise<ValidationResult> => {
      return await this.validatePermissions(data, context);
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): QonsentValidationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QonsentValidationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[QonsentValidation] 📋 Configuration updated');
  }

  /**
   * Clear all permission cache
   */
  clearCache(): void {
    const size = this.permissionCache.size;
    this.permissionCache.clear();
    console.log(`[QonsentValidation] 🧹 Cleared ${size} permission cache entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): { size: number; hitRate: number } {
    // This would track hit rate in a real implementation
    return {
      size: this.permissionCache.size,
      hitRate: 0.85 // Mock hit rate
    };
  }
}

// Export singleton instance
export const qonsentValidationLayer = new QonsentValidationLayer();